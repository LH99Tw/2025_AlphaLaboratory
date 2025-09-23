import pandas as pd
import numpy as np
import warnings
warnings.filterwarnings('ignore')
from datetime import datetime
import os
import gc

class OptimizedBacktestSystem:
    def __init__(self, price_file='sp500_interpolated.csv', alpha_file='sp500_with_alphas.csv'):
        """
        최적화된 백테스트 시스템 초기화
        """
        self.price_file = price_file
        self.alpha_file = alpha_file
        self.results = {}
        
    def get_alpha_columns(self):
        """
        알파 팩터 컬럼명 추출
        """
        with open(self.alpha_file, 'r') as f:
            header = f.readline().strip().split(',')
            alpha_columns = [col for col in header if col.startswith('alpha')]
        return alpha_columns
    
    def process_single_factor(self, factor_name, start_date, end_date, quantile=0.1, transaction_cost=0.001):
        """
        단일 팩터에 대한 백테스트 실행
        
        Args:
            factor_name: 팩터명
            start_date: 시작 날짜
            end_date: 종료 날짜
            quantile: 분위수
            transaction_cost: 거래비용
            
        Returns:
            성능 지표와 수익률 데이터
        """
        print(f"팩터 {factor_name} 처리 중...")
        
        # 필요한 컬럼만 로드
        price_cols = ['Date', 'Ticker', 'Close']
        alpha_cols = ['Date', 'Ticker', factor_name]
        
        # 청크 단위로 데이터 로드 및 처리
        factor_returns_list = []
        all_merged_data = []
        
        chunk_size = 100000
        
        # 주가 데이터 청크 로드
        price_chunks = pd.read_csv(self.price_file, usecols=price_cols, 
                                 chunksize=chunk_size, parse_dates=['Date'])
        
        # 알파 데이터 청크 로드
        alpha_chunks = pd.read_csv(self.alpha_file, usecols=alpha_cols, 
                                 chunksize=chunk_size, parse_dates=['Date'])
        
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
            merged_data = pd.merge(price_chunk, alpha_chunk, on=['Date', 'Ticker'], how='inner')
            
            if len(merged_data) == 0:
                continue
            
            # NextDayReturn 계산
            merged_data = merged_data.sort_values(['Ticker', 'Date'])
            merged_data['NextDayReturn'] = merged_data.groupby('Ticker')['Close'].shift(-1) / merged_data['Close'] - 1
            
            # 결측값 제거
            merged_data = merged_data.dropna(subset=[factor_name, 'NextDayReturn'])
            
            if len(merged_data) == 0:
                continue
            
            # 날짜별 팩터 수익률 계산
            daily_returns = self.calculate_daily_factor_returns(merged_data, factor_name, quantile)
            factor_returns_list.extend(daily_returns)
            
            # IC 계산을 위한 데이터 저장
            all_merged_data.append(merged_data)
            
            # 메모리 정리
            del merged_data
            gc.collect()
        
        if not factor_returns_list:
            return None, None
        
        # 결과 데이터프레임 생성
        factor_returns_df = pd.DataFrame(factor_returns_list)
        factor_returns_df = factor_returns_df.sort_values('Date').reset_index(drop=True)
        
        # 누적 수익률 계산
        cumulative_returns = self.calculate_cumulative_returns(factor_returns_df, transaction_cost)
        
        # 성능 지표 계산
        performance_metrics = self.calculate_performance_metrics(factor_returns_df, cumulative_returns)
        
        # IC 계산
        if all_merged_data:
            all_data = pd.concat(all_merged_data, ignore_index=True)
            ic = self.calculate_ic(all_data, factor_name)
            performance_metrics['IC'] = ic
            del all_data
        
        performance_metrics['Factor'] = factor_name
        
        # 메모리 정리
        del all_merged_data
        gc.collect()
        
        return performance_metrics, cumulative_returns
    
    def calculate_daily_factor_returns(self, df, factor_col, quantile=0.1):
        """
        일별 팩터 수익률 계산
        """
        daily_returns = []
        
        for date, group in df.groupby('Date'):
            if len(group) < 20:  # 최소 종목 수 확인
                continue
            
            # 팩터 값으로 정렬
            group = group.sort_values(factor_col, ascending=False)
            
            # 상위/하위 분위수 계산
            n_stocks = len(group)
            top_n = max(1, int(n_stocks * quantile))
            bottom_n = max(1, int(n_stocks * quantile))
            
            # 롱/숏 포트폴리오 구성
            long_portfolio = group.head(top_n)
            short_portfolio = group.tail(bottom_n)
            
            # 수익률 계산
            long_return = long_portfolio['NextDayReturn'].mean()
            short_return = short_portfolio['NextDayReturn'].mean()
            
            # 롱-숏 수익률
            factor_return = long_return - short_return
            
            daily_returns.append({
                'Date': date,
                'LongReturn': long_return,
                'ShortReturn': short_return,
                'FactorReturn': factor_return,
                'LongCount': len(long_portfolio),
                'ShortCount': len(short_portfolio)
            })
        
        return daily_returns
    
    def calculate_cumulative_returns(self, factor_returns, transaction_cost=0.001):
        """
        누적 수익률 계산
        """
        factor_returns = factor_returns.copy()
        
        # 거래비용 적용
        factor_returns['FactorReturn_Net'] = factor_returns['FactorReturn'] - transaction_cost
        
        # 누적 수익률 계산
        factor_returns['CumulativeReturn'] = (1 + factor_returns['FactorReturn_Net']).cumprod() - 1
        
        return factor_returns
    
    def calculate_performance_metrics(self, factor_returns, cumulative_returns):
        """
        성능 지표 계산
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
        """
        valid_data = df[['Date', factor_col, 'NextDayReturn']].dropna()
        
        if len(valid_data) == 0:
            return np.nan
        
        # 전체 기간에 대한 상관관계 계산
        ic = valid_data[factor_col].corr(valid_data['NextDayReturn'])
        
        return ic
    
    def run_backtest(self, start_date='2013-01-01', end_date='2023-12-31', 
                    quantile=0.1, transaction_cost=0.001, max_factors=None):
        """
        전체 백테스트 실행
        """
        print(f"백테스트 시작: {start_date} ~ {end_date}")
        
        # 날짜 변환
        start_date = pd.to_datetime(start_date)
        end_date = pd.to_datetime(end_date)
        
        # 알파 팩터 컬럼명 추출
        alpha_columns = self.get_alpha_columns()
        
        if max_factors:
            alpha_columns = alpha_columns[:max_factors]
        
        print(f"총 {len(alpha_columns)}개의 알파 팩터 처리 예정")
        
        # 결과 저장용 리스트
        all_performance_metrics = []
        top_factor_returns = {}
        
        # 각 팩터별로 백테스트 실행
        for i, factor in enumerate(alpha_columns):
            try:
                performance_metrics, factor_returns = self.process_single_factor(
                    factor, start_date, end_date, quantile, transaction_cost
                )
                
                if performance_metrics is not None:
                    all_performance_metrics.append(performance_metrics)
                    
                    # 상위 10개 팩터의 수익률 데이터 저장
                    if len(all_performance_metrics) <= 10:
                        top_factor_returns[factor] = factor_returns
                    
                    print(f"  - CAGR: {performance_metrics['CAGR']:.4f}, "
                          f"Sharpe: {performance_metrics['SharpeRatio']:.4f}, "
                          f"IC: {performance_metrics.get('IC', np.nan):.4f}")
                
                # 진행률 표시
                if (i + 1) % 10 == 0:
                    print(f"진행률: {i+1}/{len(alpha_columns)} ({((i+1)/len(alpha_columns)*100):.1f}%)")
                    
            except Exception as e:
                print(f"팩터 {factor} 처리 중 오류 발생: {e}")
                continue
        
        # 결과 저장
        self.save_results(all_performance_metrics, top_factor_returns)
        
        return all_performance_metrics, top_factor_returns
    
    def save_results(self, performance_metrics, top_factor_returns):
        """
        결과 저장
        """
        if not performance_metrics:
            print("저장할 결과가 없습니다.")
            return
        
        # 성능 지표를 데이터프레임으로 변환
        metrics_df = pd.DataFrame(performance_metrics)
        
        # 결과 저장
        metrics_df.to_csv('backtest_metrics.csv', index=False)
        print(f"성능 지표 저장 완료: backtest_metrics.csv")
        
        # 상위 10개 팩터의 수익률 곡선 저장
        for factor_name, factor_returns in top_factor_returns.items():
            factor_returns.to_csv(f'factor_returns_{factor_name}.csv', index=False)
        
        print(f"상위 {len(top_factor_returns)}개 팩터 수익률 곡선 저장 완료")
    
    def generate_summary_report(self, performance_metrics):
        """
        요약 리포트 생성
        """
        if not performance_metrics:
            print("분석할 결과가 없습니다.")
            return
        
        metrics_df = pd.DataFrame(performance_metrics)
        
        print("\n=== 백테스트 결과 요약 ===")
        print(f"총 팩터 수: {len(metrics_df)}")
        print(f"평균 CAGR: {metrics_df['CAGR'].mean():.4f}")
        print(f"평균 Sharpe Ratio: {metrics_df['SharpeRatio'].mean():.4f}")
        print(f"평균 IC: {metrics_df['IC'].mean():.4f}")
        print(f"평균 Win Rate: {metrics_df['WinRate'].mean():.4f}")
        
        print("\n=== 상위 10개 팩터 (Sharpe Ratio 기준) ===")
        top_10 = metrics_df.nlargest(10, 'SharpeRatio')[['Factor', 'CAGR', 'SharpeRatio', 'IC', 'WinRate', 'MDD']]
        print(top_10.to_string(index=False))
        
        print("\n=== 상위 10개 팩터 (CAGR 기준) ===")
        top_10_cagr = metrics_df.nlargest(10, 'CAGR')[['Factor', 'CAGR', 'SharpeRatio', 'IC', 'WinRate', 'MDD']]
        print(top_10_cagr.to_string(index=False))
        
        print("\n=== 상위 10개 팩터 (IC 기준) ===")
        top_10_ic = metrics_df.nlargest(10, 'IC')[['Factor', 'CAGR', 'SharpeRatio', 'IC', 'WinRate', 'MDD']]
        print(top_10_ic.to_string(index=False))

if __name__ == "__main__":
    # 백테스트 시스템 초기화
    backtest = OptimizedBacktestSystem()
    
    # 백테스트 실행 (처음 20개 팩터로 테스트)
    performance_metrics, factor_returns = backtest.run_backtest(
        start_date='2013-01-01',
        end_date='2023-12-31',
        quantile=0.1,
        transaction_cost=0.001,
        max_factors=20  # 테스트용으로 20개만 실행
    )
    
    # 요약 리포트 생성
    backtest.generate_summary_report(performance_metrics) 