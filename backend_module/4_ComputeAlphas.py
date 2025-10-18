import pandas as pd
import numpy as np
import os
from datetime import datetime
import warnings
warnings.filterwarnings('ignore')

# 데이터베이스 폴더 경로 설정
database_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'database')
input_filename = os.path.join(database_path, "sp500_interpolated.csv")
output_filename = os.path.join(database_path, "sp500_with_alphas.csv")

class AlphaCalculator:
    """101개 알파 팩터 계산 클래스"""
    
    def __init__(self, csv_path: str):
        self.csv_path = csv_path
        self.df = None
        
    def load_data(self) -> bool:
        """CSV 파일 로드"""
        try:
            print("보간된 데이터 로드 중...")
            self.df = pd.read_csv(self.csv_path, parse_dates=['Date'])
            print(f"데이터 로드 완료: {len(self.df)} 행, {len(self.df.columns)} 컬럼")
            return True
        except Exception as e:
            print(f"데이터 로드 실패: {e}")
            return False
    
    def prepare_data_for_alpha(self, ticker_data):
        """알파 계산을 위한 데이터 준비"""
        # 컬럼명 매핑
        data = pd.DataFrame()
        data['S_DQ_OPEN'] = ticker_data['Open']
        data['S_DQ_HIGH'] = ticker_data['High']
        data['S_DQ_LOW'] = ticker_data['Low']
        data['S_DQ_CLOSE'] = ticker_data['Close']
        data['S_DQ_VOLUME'] = ticker_data['Volume']
        data['S_DQ_AMOUNT'] = ticker_data['Volume'] * ticker_data['Close']  # 거래대금
        data['S_DQ_PCTCHANGE'] = ticker_data['Close'].pct_change()  # 수익률
        
        return data
    
    def calculate_alphas_for_ticker(self, ticker):
        """개별 종목에 대한 101개 알파 계산"""
        try:
            # 해당 종목 데이터 추출
            ticker_data = self.df[self.df['Ticker'] == ticker].copy()
            if len(ticker_data) == 0:
                print(f"  {ticker}: 데이터 없음")
                return None
            
            # 알파 계산을 위한 데이터 준비
            alpha_data = self.prepare_data_for_alpha(ticker_data)
            
            # 알파 계산
            from Alphas import Alphas
            alpha_calculator = Alphas(alpha_data)
            
            # 101개 알파 계산
            alphas = {}
            
            # Alpha 1-101 계산
            alpha_methods = [
                'alpha001', 'alpha002', 'alpha003', 'alpha004', 'alpha005',
                'alpha006', 'alpha007', 'alpha008', 'alpha009', 'alpha010',
                'alpha011', 'alpha012', 'alpha013', 'alpha014', 'alpha015',
                'alpha016', 'alpha017', 'alpha018', 'alpha019', 'alpha020',
                'alpha021', 'alpha022', 'alpha023', 'alpha024', 'alpha025',
                'alpha026', 'alpha027', 'alpha028', 'alpha029', 'alpha030',
                'alpha031', 'alpha032', 'alpha033', 'alpha034', 'alpha035',
                'alpha036', 'alpha037', 'alpha038', 'alpha039', 'alpha040',
                'alpha041', 'alpha042', 'alpha043', 'alpha044', 'alpha045',
                'alpha046', 'alpha047', 'alpha049', 'alpha050', 'alpha051',
                'alpha052', 'alpha053', 'alpha054', 'alpha055', 'alpha057',
                'alpha060', 'alpha061', 'alpha062', 'alpha064', 'alpha065',
                'alpha066', 'alpha068', 'alpha071', 'alpha072', 'alpha073',
                'alpha074', 'alpha075', 'alpha077', 'alpha078', 'alpha081',
                'alpha083', 'alpha084', 'alpha085', 'alpha086', 'alpha088',
                'alpha092', 'alpha094', 'alpha095', 'alpha096', 'alpha098',
                'alpha099', 'alpha101'
            ]
            
            for method_name in alpha_methods:
                try:
                    method = getattr(alpha_calculator, method_name)
                    alpha_values = method()
                    
                    # Series가 아닌 경우 처리
                    if not isinstance(alpha_values, pd.Series):
                        if isinstance(alpha_values, pd.DataFrame):
                            alpha_values = alpha_values.iloc[:, 0]
                        else:
                            alpha_values = pd.Series(alpha_values, index=ticker_data.index)
                    
                    alphas[method_name] = alpha_values
                    
                except Exception as e:
                    print(f"    {method_name} 계산 실패: {e}")
                    alphas[method_name] = pd.Series(np.nan, index=ticker_data.index)
            
            # 결과를 DataFrame으로 변환
            result_df = ticker_data[['Date', 'Ticker']].copy()
            
            # 알파 값들을 컬럼으로 추가
            for alpha_name, alpha_values in alphas.items():
                result_df[alpha_name] = alpha_values.values
            
            return result_df
            
        except Exception as e:
            print(f"  {ticker} 알파 계산 실패: {e}")
            return None
    
    def process_all_tickers(self):
        """모든 종목에 대해 알파 계산"""
        if self.df is None:
            print("데이터가 로드되지 않았습니다.")
            return False
        
        print("알파 팩터 계산 시작...")
        
        # 고유 종목 목록
        unique_tickers = self.df['Ticker'].unique()
        total_tickers = len(unique_tickers)
        
        print(f"총 {total_tickers}개 종목 처리 예정")
        
        all_results = []
        successful_count = 0
        failed_count = 0
        
        for i, ticker in enumerate(unique_tickers, 1):
            print(f"[{i}/{total_tickers}] {ticker} 처리 중...")
            
            result = self.calculate_alphas_for_ticker(ticker)
            
            if result is not None:
                all_results.append(result)
                successful_count += 1
                print(f"  ✓ {ticker} 완료 ({len(result)} 행)")
            else:
                failed_count += 1
                print(f"  ✗ {ticker} 실패")
        
        # 모든 결과를 하나의 DataFrame으로 합치기
        if all_results:
            final_df = pd.concat(all_results, ignore_index=True)
            
            # 결과 저장
            final_df.to_csv(output_filename, index=False)
            
            print(f"\n=== 계산 완료 ===")
            print(f"성공: {successful_count}개 종목")
            print(f"실패: {failed_count}개 종목")
            print(f"총 행 수: {len(final_df)}")
            print(f"총 컬럼 수: {len(final_df.columns)}")
            print(f"결과 파일: {output_filename}")
            
            return True
        else:
            print("계산된 알파가 없습니다.")
            return False

def main():
    """메인 실행 함수"""
    print("=== S&P 500 알파 팩터 계산 ===")
    
    # 알파 계산기 초기화
    calculator = AlphaCalculator(input_filename)
    
    # 데이터 로드
    if not calculator.load_data():
        return
    
    # 알파 계산 실행
    calculator.process_all_tickers()

if __name__ == "__main__":
    main()
