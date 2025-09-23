import pandas as pd
import numpy as np
import warnings
warnings.filterwarnings('ignore')
import os

def quick_backtest_test():
    """빠른 백테스트 테스트"""
    print("=== 백테스트 시스템 테스트 시작 ===")
    
    # 파일 존재 확인
    price_file = 'sp500_interpolated.csv'
    alpha_file = 'sp500_with_alphas.csv'
    
    if not os.path.exists(price_file):
        print(f"오류: {price_file} 파일이 없습니다.")
        return
    
    if not os.path.exists(alpha_file):
        print(f"오류: {alpha_file} 파일이 없습니다.")
        return
    
    print(f"✅ 주가 데이터 파일: {price_file}")
    print(f"✅ 알파 데이터 파일: {alpha_file}")
    
    # 알파 팩터 컬럼명 추출
    with open(alpha_file, 'r') as f:
        header = f.readline().strip().split(',')
        alpha_cols = [col for col in header if col.startswith('alpha')]
    
    print(f"📊 총 {len(alpha_cols)}개의 알파 팩터 발견")
    print(f"📋 알파 팩터 예시: {alpha_cols[:5]}")
    
    # 테스트용으로 첫 번째 팩터만 실행
    test_factor = alpha_cols[0]
    print(f"\n🧪 테스트 팩터: {test_factor}")
    
    # 필요한 컬럼만 로드 (샘플)
    print("📥 데이터 로딩 중...")
    
    try:
        # 주가 데이터 샘플 로드
        price_sample = pd.read_csv(price_file, usecols=['Date', 'Ticker', 'Close'], 
                                 nrows=10000, parse_dates=['Date'])
        
        # 알파 데이터 샘플 로드
        alpha_sample = pd.read_csv(alpha_file, usecols=['Date', 'Ticker', test_factor], 
                                 nrows=10000, parse_dates=['Date'])
        
        print(f"✅ 주가 데이터 샘플: {len(price_sample)}행")
        print(f"✅ 알파 데이터 샘플: {len(alpha_sample)}행")
        
        # 데이터 병합
        merged_data = pd.merge(price_sample, alpha_sample, on=['Date', 'Ticker'], how='inner')
        print(f"✅ 병합된 데이터: {len(merged_data)}행")
        
        if len(merged_data) > 0:
            # NextDayReturn 계산
            merged_data = merged_data.sort_values(['Ticker', 'Date'])
            merged_data['NextDayReturn'] = merged_data.groupby('Ticker')['Close'].shift(-1) / merged_data['Close'] - 1
            
            # 결측값 제거
            merged_data = merged_data.dropna(subset=[test_factor, 'NextDayReturn'])
            print(f"✅ 유효한 데이터: {len(merged_data)}행")
            
            if len(merged_data) > 0:
                # 간단한 백테스트 실행
                result = simple_factor_backtest(merged_data, test_factor)
                print(f"\n📈 백테스트 결과:")
                print(f"   - CAGR: {result['CAGR']:.4f}")
                print(f"   - Sharpe Ratio: {result['SharpeRatio']:.4f}")
                print(f"   - IC: {result['IC']:.4f}")
                print(f"   - Win Rate: {result['WinRate']:.4f}")
                print(f"   - MDD: {result['MDD']:.4f}")
                
                print("\n✅ 백테스트 시스템이 정상적으로 작동합니다!")
                return True
            else:
                print("❌ 유효한 데이터가 없습니다.")
                return False
        else:
            print("❌ 데이터 병합에 실패했습니다.")
            return False
            
    except Exception as e:
        print(f"❌ 오류 발생: {e}")
        return False

def simple_factor_backtest(df, factor_col, quantile=0.1):
    """간단한 팩터 백테스트"""
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
        
        factor_returns.append(factor_return)
    
    if not factor_returns:
        return {
            'CAGR': 0, 'SharpeRatio': 0, 'IC': 0, 'WinRate': 0, 'MDD': 0
        }
    
    # 성능 지표 계산
    factor_returns = np.array(factor_returns)
    
    # CAGR 계산
    total_return = (1 + factor_returns).prod() - 1
    days = len(factor_returns)
    years = days / 252
    cagr = (1 + total_return) ** (1 / years) - 1 if years > 0 else 0
    
    # Sharpe Ratio 계산
    sharpe = factor_returns.mean() / factor_returns.std() * np.sqrt(252) if factor_returns.std() > 0 else 0
    
    # Win Rate 계산
    win_rate = (factor_returns > 0).mean()
    
    # MDD 계산
    cumulative_curve = (1 + factor_returns).cumprod()
    running_max = np.maximum.accumulate(cumulative_curve)
    drawdown = (cumulative_curve - running_max) / running_max
    mdd = drawdown.min()
    
    # IC 계산
    ic = df[factor_col].corr(df['NextDayReturn'])
    
    return {
        'CAGR': cagr,
        'SharpeRatio': sharpe,
        'IC': ic,
        'WinRate': win_rate,
        'MDD': mdd
    }

if __name__ == "__main__":
    success = quick_backtest_test()
    
    if success:
        print("\n🎉 백테스트 시스템 준비 완료!")
        print("이제 전체 백테스트를 실행할 수 있습니다.")
    else:
        print("\n❌ 백테스트 시스템 테스트 실패")
        print("데이터 파일이나 경로를 확인해주세요.") 