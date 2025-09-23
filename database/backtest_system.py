import pandas as pd
import numpy as np
import warnings
warnings.filterwarnings('ignore')
from datetime import datetime
import os

class BacktestSystem:
    def __init__(self, price_file='sp500_interpolated.csv', alpha_file='sp500_with_alphas.csv'):
        """
        백테스트 시스템 초기화
        
        Args:
            price_file: 주가 데이터 파일 경로
            alpha_file: 알파 팩터 데이터 파일 경로
        """
        self.price_file = price_file
        self.alpha_file = alpha_file
        self.results = {}
        
    def load_data_chunk(self, start_date=None, end_date=None, chunk_size=10000):
        """
        청크 단위로 데이터 로드
        
        Args:
            start_date: 시작 날짜 (YYYY-MM-DD)
            end_date: 종료 날짜 (YYYY-MM-DD)
            chunk_size: 청크 크기
        """
        # 날짜 필터 조건 생성
        date_filter = ""
        if start_date:
            date_filter += f" and Date >= '{start_date}'"
        if end_date:
            date_filter += f" and Date <= '{end_date}'"
        
        # 주가 데이터 로드
        price_query = f"SELECT * FROM sp500_interpolated.csv WHERE 1=1{date_filter}"
        price_chunks = pd.read_csv(self.price_file, chunksize=chunk_size, parse_dates=['Date'])
        
        # 알파 데이터 로드
        alpha_query = f"SELECT * FROM sp500_with_alphas.csv WHERE 1=1{date_filter}"
        alpha_chunks = pd.read_csv(self.alpha_file, chunksize=chunk_size, parse_dates=['Date'])
        
        return price_chunks, alpha_chunks
    
    def merge_data(self, price_df, alpha_df):
        """
        주가 데이터와 알파 데이터 병합
        
        Args:
            price_df: 주가 데이터프레임
            alpha_df: 알파 데이터프레임
            
        Returns:
            병합된 데이터프레임
        """
        # Date와 Ticker 기준으로 병합
        merged_df = pd.merge(price_df, alpha_df, on=['Date', 'Ticker'], how='inner')
        
        # NextDayReturn 계산
        merged_df = merged_df.sort_values(['Ticker', 'Date'])
        merged_df['NextDayReturn'] = merged_df.groupby('Ticker')['Close'].shift(-1) / merged_df['Close'] - 1
        
        return merged_df
    
    def calculate_factor_returns(self, df, factor_col, quantile=0.1):
        """
        팩터 기반 수익률 계산
        
        Args:
            df: 병합된 데이터프레임
            factor_col: 팩터 컬럼명
            quantile: 분위수 (상위/하위 n%)
            
        Returns:
            팩터 수익률 시계열
        """
        factor_returns = []
        
        # 날짜별로 그룹화하여 처리
        for date, group in df.groupby('Date'):
            if len(group) < 10:  # 최소 종목 수 확인
                continue
                
            # 결측값 제거
            valid_data = group[group[factor_col].notna()].copy()
            if len(valid_data) < 10:
                continue
            
            # 팩터 값으로 정렬
            valid_data = valid_data.sort_values(factor_col, ascending=False)
            
            # 상위/하위 분위수 계산
            n_stocks = len(valid_data)
            top_n = max(1, int(n_stocks * quantile))
            bottom_n = max(1, int(n_stocks * quantile))
            
            # 롱/숏 포트폴리오 구성
            long_portfolio = valid_data.head(top_n)
            short_portfolio = valid_data.tail(bottom_n)
            
            # 수익률 계산
            long_return = long_portfolio['NextDayReturn'].mean()
            short_return = short_portfolio['NextDayReturn'].mean()
            
            # 롱-숏 수익률
            factor_return = long_return - short_return
            
            factor_returns.append({
                'Date': date,
                'Factor': factor_col,
                'LongReturn': long_return,
                'ShortReturn': short_return,
                'FactorReturn': factor_return,
                'LongCount': len(long_portfolio),
                'ShortCount': len(short_portfolio)
            })
        
        return pd.DataFrame(factor_returns)
    
    def calculate_cumulative_returns(self, factor_returns, transaction_cost=0.001):
        """
        누적 수익률 계산
        
        Args:
            factor_returns: 팩터 수익률 데이터프레임
            transaction_cost: 거래비용 (기본값: 0.1%)
            
        Returns:
            누적 수익률 데이터프레임
        """
        # 거래비용 적용
        factor_returns['FactorReturn_Net'] = factor_returns['FactorReturn'] - transaction_cost
        
        # 누적 수익률 계산
        factor_returns['CumulativeReturn'] = (1 + factor_returns['FactorReturn_Net']).cumprod() - 1
        
        return factor_returns
    
    def calculate_performance_metrics(self, factor_returns, cumulative_returns):
        """
        성능 지표 계산
        
        Args:
            factor_returns: 팩터 수익률 데이터프레임
            cumulative_returns: 누적 수익률 데이터프레임
            
        Returns:
            성능 지표 딕셔너리
        """
        # 기본 통계
        total_return = cumulative_returns['CumulativeReturn'].iloc[-1]
        daily_returns = factor_returns['FactorReturn_Net']
        
        # CAGR 계산
        days = len(factor_returns)
        years = days / 252
        cagr = (1 + total_return) ** (1 / years) - 1 if years > 0 else 0
        
        # MDD 계산
        cumulative_curve = 1 + cumulative_returns['CumulativeReturn']
        running_max = cumulative_curve.expanding().max()
        drawdown = (cumulative_curve - running_max) / running_max
        mdd = drawdown.min()
        
        # Sharpe Ratio 계산 (무위험 수익률 0% 가정)
        sharpe = daily_returns.mean() / daily_returns.std() * np.sqrt(252) if daily_returns.std() > 0 else 0
        
        # Win Rate 계산
        win_rate = (daily_returns > 0).mean()
        
        # IC 계산 (팩터 값과 다음날 수익률 간 상관관계)
        # 이는 별도로 계산해야 함
        
        return {
            'CAGR': cagr,
            'MDD': mdd,
            'SharpeRatio': sharpe,
            'WinRate': win_rate,
            'TotalReturn': total_return,
            'Volatility': daily_returns.std() * np.sqrt(252),
            'MaxDrawdown': mdd,
            'TotalDays': days
        }
    
    def calculate_ic(self, df, factor_col):
        """
        Information Coefficient 계산
        
        Args:
            df: 병합된 데이터프레임
            factor_col: 팩터 컬럼명
            
        Returns:
            IC 값
        """
        # 결측값 제거
        valid_data = df[['Date', factor_col, 'NextDayReturn']].dropna()
        
        if len(valid_data) == 0:
            return np.nan
        
        # 전체 기간에 대한 상관관계 계산
        ic = valid_data[factor_col].corr(valid_data['NextDayReturn'])
        
        return ic
    
    def run_backtest(self, start_date='2013-01-01', end_date='2023-12-31', 
                    quantile=0.1, transaction_cost=0.001, chunk_size=50000):
        """
        전체 백테스트 실행
        
        Args:
            start_date: 시작 날짜
            end_date: 종료 날짜
            quantile: 분위수
            transaction_cost: 거래비용
            chunk_size: 청크 크기
        """
        print(f"백테스트 시작: {start_date} ~ {end_date}")
        
        # 알파 팩터 컬럼명 추출
        alpha_columns = []
        with open(self.alpha_file, 'r') as f:
            header = f.readline().strip().split(',')
            alpha_columns = [col for col in header if col.startswith('alpha')]
        
        print(f"총 {len(alpha_columns)}개의 알파 팩터 발견")
        
        # 결과 저장용 딕셔너리
        all_factor_returns = []
        performance_metrics = []
        
        # 청크 단위로 처리
        price_chunks = pd.read_csv(self.price_file, chunksize=chunk_size, parse_dates=['Date'])
        alpha_chunks = pd.read_csv(self.alpha_file, chunksize=chunk_size, parse_dates=['Date'])
        
        # 날짜 필터링
        start_date = pd.to_datetime(start_date)
        end_date = pd.to_datetime(end_date)
        
        # 각 팩터별로 백테스트 실행
        for i, factor in enumerate(alpha_columns):
            print(f"팩터 {i+1}/{len(alpha_columns)}: {factor} 처리 중...")
            
            factor_returns_list = []
            
            # 청크별로 데이터 처리
            price_chunks = pd.read_csv(self.price_file, chunksize=chunk_size, parse_dates=['Date'])
            alpha_chunks = pd.read_csv(self.alpha_file, chunksize=chunk_size, parse_dates=['Date'])
            
            for price_chunk, alpha_chunk in zip(price_chunks, alpha_chunks):
                # 날짜 필터링
                price_chunk = price_chunk[
                    (price_chunk['Date'] >= start_date) & 
                    (price_chunk['Date'] <= end_date)
                ]
                alpha_chunk = alpha_chunk[
                    (alpha_chunk['Date'] >= start_date) & 
                    (alpha_chunk['Date'] <= end_date)
                ]
                
                if len(price_chunk) == 0 or len(alpha_chunk) == 0:
                    continue
                
                # 데이터 병합
                merged_data = self.merge_data(price_chunk, alpha_chunk)
                
                if len(merged_data) == 0:
                    continue
                
                # 팩터 수익률 계산
                factor_returns = self.calculate_factor_returns(merged_data, factor, quantile)
                factor_returns_list.append(factor_returns)
            
            # 모든 청크 결과 합치기
            if factor_returns_list:
                all_factor_returns_df = pd.concat(factor_returns_list, ignore_index=True)
                all_factor_returns_df = all_factor_returns_df.sort_values('Date').reset_index(drop=True)
                
                # 누적 수익률 계산
                cumulative_returns = self.calculate_cumulative_returns(all_factor_returns_df, transaction_cost)
                
                # 성능 지표 계산
                metrics = self.calculate_performance_metrics(all_factor_returns_df, cumulative_returns)
                
                # IC 계산 (전체 데이터에서)
                ic = self.calculate_ic(merged_data, factor) if 'merged_data' in locals() else np.nan
                metrics['IC'] = ic
                metrics['Factor'] = factor
                
                performance_metrics.append(metrics)
                all_factor_returns.append(cumulative_returns)
                
                print(f"  - CAGR: {metrics['CAGR']:.4f}, Sharpe: {metrics['SharpeRatio']:.4f}, IC: {metrics['IC']:.4f}")
        
        # 결과 저장
        self.save_results(performance_metrics, all_factor_returns)
        
        return performance_metrics, all_factor_returns
    
    def save_results(self, performance_metrics, all_factor_returns):
        """
        결과 저장
        
        Args:
            performance_metrics: 성능 지표 리스트
            all_factor_returns: 모든 팩터 수익률 리스트
        """
        # 성능 지표를 데이터프레임으로 변환
        metrics_df = pd.DataFrame(performance_metrics)
        
        # 결과 저장
        metrics_df.to_csv('backtest_metrics.csv', index=False)
        print(f"성능 지표 저장 완료: backtest_metrics.csv")
        
        # 상위 10개 팩터의 수익률 곡선 저장
        if all_factor_returns:
            top_factors = metrics_df.nlargest(10, 'SharpeRatio')['Factor'].tolist()
            
            for i, factor_returns in enumerate(all_factor_returns):
                if i < len(top_factors):
                    factor_name = top_factors[i]
                    factor_returns.to_csv(f'factor_returns_{factor_name}.csv', index=False)
            
            print(f"상위 10개 팩터 수익률 곡선 저장 완료")
    
    def generate_summary_report(self, performance_metrics):
        """
        요약 리포트 생성
        
        Args:
            performance_metrics: 성능 지표 리스트
        """
        metrics_df = pd.DataFrame(performance_metrics)
        
        print("\n=== 백테스트 결과 요약 ===")
        print(f"총 팩터 수: {len(metrics_df)}")
        print(f"평균 CAGR: {metrics_df['CAGR'].mean():.4f}")
        print(f"평균 Sharpe Ratio: {metrics_df['SharpeRatio'].mean():.4f}")
        print(f"평균 IC: {metrics_df['IC'].mean():.4f}")
        
        print("\n=== 상위 10개 팩터 (Sharpe Ratio 기준) ===")
        top_10 = metrics_df.nlargest(10, 'SharpeRatio')[['Factor', 'CAGR', 'SharpeRatio', 'IC', 'WinRate']]
        print(top_10.to_string(index=False))

if __name__ == "__main__":
    # 백테스트 시스템 초기화
    backtest = BacktestSystem()
    
    # 백테스트 실행
    performance_metrics, factor_returns = backtest.run_backtest(
        start_date='2013-01-01',
        end_date='2023-12-31',
        quantile=0.1,
        transaction_cost=0.001
    )
    
    # 요약 리포트 생성
    backtest.generate_summary_report(performance_metrics) 