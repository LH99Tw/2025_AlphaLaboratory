import pandas as pd
import numpy as np
import warnings
warnings.filterwarnings('ignore')

def quick_data_check():
    """데이터 구조 빠른 확인"""
    print("=== 데이터 구조 확인 ===")
    
    # 알파 데이터 헤더 확인
    with open('sp500_with_alphas.csv', 'r') as f:
        header = f.readline().strip().split(',')
        alpha_cols = [col for col in header if col.startswith('alpha')]
        print(f"알파 팩터 수: {len(alpha_cols)}")
        print(f"알파 팩터 예시: {alpha_cols[:5]}")
    
    # 주가 데이터 샘플 확인
    price_sample = pd.read_csv('sp500_interpolated.csv', nrows=5)
    print(f"\n주가 데이터 컬럼: {list(price_sample.columns)}")
    print(f"주가 데이터 샘플:\n{price_sample[['Date', 'Ticker', 'Close']].head()}")

def simple_backtest(factor_name, start_date='2013-01-01', end_date='2015-12-31'):
    """
    단일 팩터 간단 백테스트
    
    Args:
        factor_name: 팩터명 (예: 'alpha001')
        start_date: 시작 날짜
        end_date: 종료 날짜
    """
    print(f"\n=== {factor_name} 백테스트 시작 ===")
    
    # 필요한 컬럼만 로드
    price_cols = ['Date', 'Ticker', 'Close']
    alpha_cols = ['Date', 'Ticker', factor_name]
    
    # 데이터 로드 (청크 단위)
    chunk_size = 50000
    
    all_factor_returns = []
    all_merged_data = []
    
    # 주가 데이터 청크 로드
    price_chunks = pd.read_csv('sp500_interpolated.csv', usecols=price_cols, 
                             chunksize=chunk_size, parse_dates=['Date'])
    
    # 알파 데이터 청크 로드
    alpha_chunks = pd.read_csv('sp500_with_alphas.csv', usecols=alpha_cols, 
                             chunksize=chunk_size, parse_dates=['Date'])
    
    # 날짜 필터링
    start_date = pd.to_datetime(start_date)
    end_date = pd.to_datetime(end_date)
    
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
        daily_returns = calculate_daily_returns(merged_data, factor_name)
        all_factor_returns.extend(daily_returns)
        
        # IC 계산을 위한 데이터 저장
        all_merged_data.append(merged_data)
    
    if not all_factor_returns:
        print(f"{factor_name}: 유효한 데이터가 없습니다.")
        return None
    
    # 결과 데이터프레임 생성
    factor_returns_df = pd.DataFrame(all_factor_returns)
    factor_returns_df = factor_returns_df.sort_values('Date').reset_index(drop=True)
    
    # 누적 수익률 계산
    cumulative_returns = calculate_cumulative_returns(factor_returns_df)
    
    # 성능 지표 계산
    performance_metrics = calculate_performance_metrics(factor_returns_df, cumulative_returns)
    
    # IC 계산
    if all_merged_data:
        all_data = pd.concat(all_merged_data, ignore_index=True)
        ic = calculate_ic(all_data, factor_name)
        performance_metrics['IC'] = ic
    
    performance_metrics['Factor'] = factor_name
    
    print(f"결과: CAGR={performance_metrics['CAGR']:.4f}, "
          f"Sharpe={performance_metrics['SharpeRatio']:.4f}, "
          f"IC={performance_metrics.get('IC', np.nan):.4f}")
    
    return performance_metrics, factor_returns_df

def calculate_daily_returns(df, factor_col, quantile=0.1):
    """일별 팩터 수익률 계산"""
    daily_returns = []
    
    for date, group in df.groupby('Date'):
        if len(group) < 10:  # 최소 종목 수 확인
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
            'FactorReturn': factor_return,
            'LongReturn': long_return,
            'ShortReturn': short_return
        })
    
    return daily_returns

def calculate_cumulative_returns(factor_returns, transaction_cost=0.001):
    """누적 수익률 계산"""
    factor_returns = factor_returns.copy()
    
    # 거래비용 적용
    factor_returns['FactorReturn_Net'] = factor_returns['FactorReturn'] - transaction_cost
    
    # 누적 수익률 계산
    factor_returns['CumulativeReturn'] = (1 + factor_returns['FactorReturn_Net']).cumprod() - 1
    
    return factor_returns

def calculate_performance_metrics(factor_returns, cumulative_returns):
    """성능 지표 계산"""
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
        'TotalDays': days
    }

def calculate_ic(df, factor_col):
    """Information Coefficient 계산"""
    valid_data = df[['Date', factor_col, 'NextDayReturn']].dropna()
    
    if len(valid_data) == 0:
        return np.nan
    
    # 전체 기간에 대한 상관관계 계산
    ic = valid_data[factor_col].corr(valid_data['NextDayReturn'])
    
    return ic

def run_multiple_factors(factor_list, start_date='2013-01-01', end_date='2015-12-31'):
    """여러 팩터 백테스트 실행"""
    print(f"=== 다중 팩터 백테스트 시작 ===")
    print(f"기간: {start_date} ~ {end_date}")
    print(f"팩터 수: {len(factor_list)}")
    
    all_results = []
    
    for i, factor in enumerate(factor_list):
        print(f"\n팩터 {i+1}/{len(factor_list)}: {factor}")
        
        try:
            result = simple_backtest(factor, start_date, end_date)
            if result is not None:
                all_results.append(result[0])  # 성능 지표만 저장
        except Exception as e:
            print(f"오류 발생: {e}")
            continue
    
    if all_results:
        # 결과를 데이터프레임으로 변환
        results_df = pd.DataFrame(all_results)
        
        # 결과 저장
        results_df.to_csv('backtest_results.csv', index=False)
        
        # 요약 출력
        print(f"\n=== 백테스트 결과 요약 ===")
        print(f"성공한 팩터 수: {len(results_df)}")
        print(f"평균 CAGR: {results_df['CAGR'].mean():.4f}")
        print(f"평균 Sharpe Ratio: {results_df['SharpeRatio'].mean():.4f}")
        print(f"평균 IC: {results_df['IC'].mean():.4f}")
        
        print(f"\n=== 상위 5개 팩터 (Sharpe Ratio 기준) ===")
        top_5 = results_df.nlargest(5, 'SharpeRatio')[['Factor', 'CAGR', 'SharpeRatio', 'IC', 'WinRate']]
        print(top_5.to_string(index=False))
        
        return results_df
    
    return None

if __name__ == "__main__":
    # 데이터 구조 확인
    quick_data_check()
    
    # 테스트용 팩터 리스트 (처음 5개)
    test_factors = ['alpha001', 'alpha002', 'alpha003', 'alpha004', 'alpha005']
    
    # 백테스트 실행
    results = run_multiple_factors(test_factors, '2013-01-01', '2015-12-31') 