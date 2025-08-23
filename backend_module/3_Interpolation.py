import pandas as pd
import numpy as np
import os
from datetime import datetime, timedelta
import matplotlib.pyplot as plt
import seaborn as sns
from typing import Dict, List, Optional

# 데이터베이스 폴더 경로 설정
database_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'database')
filename = os.path.join(database_path, "sp500_data.csv")

class QuarterlyInterpolation:
    """분기별 재무 데이터 보간 클래스"""
    
    def __init__(self, csv_path: str):
        self.csv_path = csv_path
        self.df = None
        self.financial_columns = ['EPS', 'Revenue', 'Net_Income', 'Total_Assets', 'Total_Debt', 'Cash', 'ROA']
        
    def load_data(self) -> bool:
        """CSV 파일 로드"""
        try:
            print("데이터 로드 중...")
            self.df = pd.read_csv(self.csv_path, parse_dates=['Date'])
            print(f"로드 완료: {len(self.df)} 행, {self.df['Ticker'].nunique()} 개 종목")
            return True
        except Exception as e:
            print(f"데이터 로드 오류: {e}")
            return False
    
    def analyze_financial_data_coverage(self) -> Dict:
        """재무 데이터 커버리지 분석"""
        print("\n=== 재무 데이터 커버리지 분석 ===")
        
        coverage_stats = {}
        for col in self.financial_columns:
            if col in self.df.columns:
                non_null_count = self.df[col].notna().sum()
                total_count = len(self.df)
                coverage_pct = (non_null_count / total_count) * 100
                
                coverage_stats[col] = {
                    'non_null_count': non_null_count,
                    'total_count': total_count,
                    'coverage_pct': coverage_pct
                }
                
                print(f"{col}: {non_null_count:,}/{total_count:,} ({coverage_pct:.1f}%)")
        
        return coverage_stats
    
    def interpolate_quarterly_data_by_ticker(self, ticker: str) -> pd.DataFrame:
        """특정 종목의 분기별 데이터 보간 (발표 시점 기준 forward fill)"""
        print(f"\n=== {ticker} 분기별 데이터 보간 ===")
        
        ticker_data = self.df[self.df['Ticker'] == ticker].copy()
        
        if ticker_data.empty:
            print(f"종목 {ticker} 데이터가 없습니다.")
            return pd.DataFrame()
        
        # 날짜순으로 정렬
        ticker_data = ticker_data.sort_values('Date')
        
        # 재무 컬럼들에 대해 보간 적용
        for col in self.financial_columns:
            if col in ticker_data.columns:
                print(f"  {col} 보간 중...")
                
                # 비어있지 않은 데이터의 위치 찾기
                non_null_mask = ticker_data[col].notna()
                non_null_indices = ticker_data[non_null_mask].index
                
                if len(non_null_indices) > 0:
                    # 각 발표 시점부터 다음 발표 시점까지 forward fill
                    for i in range(len(non_null_indices)):
                        current_idx = non_null_indices[i]
                        current_value = ticker_data.loc[current_idx, col]
                        
                        # 다음 발표 시점까지의 범위 결정
                        if i < len(non_null_indices) - 1:
                            next_idx = non_null_indices[i + 1]
                            # 현재 발표 시점부터 다음 발표 시점 직전까지 채우기
                            ticker_data.loc[current_idx:next_idx-1, col] = current_value
                        else:
                            # 마지막 발표 시점부터 끝까지 채우기
                            ticker_data.loc[current_idx:, col] = current_value
                
                # 보간 후 통계
                filled_count = ticker_data[col].notna().sum()
                total_count = len(ticker_data)
                print(f"    완료: {filled_count}/{total_count} ({filled_count/total_count*100:.1f}%)")
        
        return ticker_data
    
    def process_all_tickers_with_progress(self) -> Dict:
        """모든 종목에 대해 보간 처리 (진행 상황 표시)"""
        print(f"\n=== 전체 종목 분기별 데이터 보간 처리 ===")
        
        unique_tickers = self.df['Ticker'].unique()
        total_tickers = len(unique_tickers)
        print(f"총 {total_tickers}개 종목 처리 시작")
        
        results = {}
        successful_count = 0
        failed_count = 0
        
        for i, ticker in enumerate(unique_tickers, 1):
            print(f"\n[{i}/{total_tickers}] 처리 중: {ticker}")
            
            try:
                # 원본 데이터
                original_data = self.df[self.df['Ticker'] == ticker].copy()
                
                # 보간 처리
                interpolated_data = self.interpolate_quarterly_data_by_ticker(ticker)
                
                if not interpolated_data.empty:
                    # 결과 저장
                    results[ticker] = {
                        'original_coverage': {},
                        'interpolated_coverage': {},
                        'improvement': {}
                    }
                    
                    # 커버리지 비교
                    for col in self.financial_columns:
                        if col in original_data.columns:
                            original_coverage = original_data[col].notna().sum() / len(original_data) * 100
                            interpolated_coverage = interpolated_data[col].notna().sum() / len(interpolated_data) * 100
                            
                            results[ticker]['original_coverage'][col] = original_coverage
                            results[ticker]['interpolated_coverage'][col] = interpolated_coverage
                            results[ticker]['improvement'][col] = interpolated_coverage - original_coverage
                    
                    # 메인 데이터프레임 업데이트
                    self.df.loc[self.df['Ticker'] == ticker] = interpolated_data
                    successful_count += 1
                    print(f"  ✓ {ticker} 완료")
                else:
                    failed_count += 1
                    print(f"  ✗ {ticker} 실패")
                    
            except Exception as e:
                failed_count += 1
                print(f"  ✗ {ticker} 오류: {e}")
                continue
        
        print(f"\n=== 처리 완료 ===")
        print(f"성공: {successful_count}개 종목")
        print(f"실패: {failed_count}개 종목")
        print(f"총 처리: {successful_count + failed_count}개 종목")
        
        return results
    
    def save_interpolated_data(self, output_path: str = None):
        """보간된 데이터 저장"""
        if output_path is None:
            output_path = os.path.join(database_path, "sp500_interpolated.csv")
        
        print(f"\n보간된 데이터 저장 중: {output_path}")
        self.df.to_csv(output_path, index=False)
        print("저장 완료!")
    
    def generate_summary_report(self, results: Dict):
        """보간 결과 요약 리포트"""
        print("\n=== 보간 결과 요약 리포트 ===")
        
        if not results:
            print("처리된 결과가 없습니다.")
            return
        
        # 전체 통계
        total_tickers = len(results)
        avg_improvements = {}
        
        for col in self.financial_columns:
            improvements = [results[ticker]['improvement'].get(col, 0) for ticker in results.keys()]
            avg_improvements[col] = np.mean(improvements)
        
        print(f"처리된 종목 수: {total_tickers}")
        print("\n평균 개선률:")
        for col, avg_improvement in avg_improvements.items():
            print(f"  {col}: {avg_improvement:.1f}%")
        
        # 최고 개선 종목들
        print("\n최고 개선 종목 (EPS 기준):")
        eps_improvements = [(ticker, results[ticker]['improvement'].get('EPS', 0)) 
                           for ticker in results.keys()]
        eps_improvements.sort(key=lambda x: x[1], reverse=True)
        
        for ticker, improvement in eps_improvements[:10]:
            print(f"  {ticker}: {improvement:.1f}%")

def main():
    """메인 실행 함수"""
    print("=== S&P 500 분기별 데이터 보간 도구 ===")
    print("분기별 발표 시점 기준 Forward Fill 방식")
    
    # 클래스 초기화
    interpolator = QuarterlyInterpolation(filename)
    
    # 데이터 로드
    if not interpolator.load_data():
        print("데이터 로드 실패!")
        return
    
    # 재무 데이터 커버리지 분석
    coverage_stats = interpolator.analyze_financial_data_coverage()
    
    # 전체 종목 보간 처리
    results = interpolator.process_all_tickers_with_progress()
    
    # 결과 요약
    interpolator.generate_summary_report(results)
    
    # 보간된 데이터 저장
    interpolator.save_interpolated_data()
    
    print("\n=== 모든 작업 완료! ===")

if __name__ == "__main__":
    main() 