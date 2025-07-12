import pandas as pd # data processing, CSV file I/O (e.g. pd.read_csv)
import os
import numpy as np
import pandas as pd
import yfinance as yf
from datetime import datetime
import pandas_datareader.data as web
import gc
import os

# Function to get the current list of S&P 500 components
def get_sp500_tickers():
    sp500_url = 'https://en.wikipedia.org/wiki/List_of_S%26P_500_companies'
    table = pd.read_html(sp500_url, header=0)
    df = table[0]
    gc.collect()
    return df['Symbol'].tolist()

# 데이터베이스 폴더 경로 설정
database_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'database')
os.makedirs(database_path, exist_ok=True)
filename = os.path.join(database_path, "sp500_data.csv")

# Function to download data and save to CSV incrementally
def download_data(start_date="2000-01-01"):
    # Get the list of S&P 500 tickers
    sp500_tickers = get_sp500_tickers()
    
    # Initialize the CSV file with headers
    with open(filename, 'w') as f:
        f.write('Date,Ticker,Open,High,Low,Close,Adj Close,Volume\n')
    
    # Download data individually to handle failures better
    successful_downloads = 0
    failed_downloads = 0
    
    for ticker in sp500_tickers:
        try:
            print(f"Downloading data for {ticker}...")
            # Download individual ticker data with explicit auto_adjust
            ticker_data = yf.download(ticker, start=start_date, progress=False, auto_adjust=True)
            
            if ticker_data.empty:
                print(f"No data available for {ticker}")
                failed_downloads += 1
                continue
                
            ticker_data.dropna(inplace=True)  # Remove rows with NaN values
            ticker_data.reset_index(inplace=True)
            ticker_data['Ticker'] = ticker
            
            # Handle auto_adjust=True case where Adj Close column might not exist
            if 'Adj Close' not in ticker_data.columns:
                ticker_data['Adj Close'] = ticker_data['Close']  # Use Close as Adj Close when auto_adjust=True
                
            # Reorder columns
            ticker_data = ticker_data[['Date', 'Ticker', 'Open', 'High', 'Low', 'Close', 'Adj Close', 'Volume']]
            # Optimize data types
            ticker_data = ticker_data.astype({
                'Open': 'float32',
                'High': 'float32',
                'Low': 'float32',
                'Close': 'float32',
                'Adj Close': 'float32',
                'Volume': 'int32'
            })
            # Append to CSV
            ticker_data.to_csv(filename, mode='a', index=False, header=False)
            print(f"Successfully appended data for {ticker} ({len(ticker_data)} rows)")
            successful_downloads += 1
            gc.collect()
            
            # Add small delay to avoid rate limiting
            import time
            time.sleep(0.1)
            
        except Exception as e:
            print(f"Error processing data for {ticker}: {e}")
            failed_downloads += 1
            continue

    print(f"Data download completed and saved to {filename}")
    print(f"Successful downloads: {successful_downloads}")
    print(f"Failed downloads: {failed_downloads}")

# Function to update data
def update_data():
    if not os.path.exists(filename):
        print(f"{filename} does not exist. Starting full download.")
        download_data()
        return
    
    # Read existing data
    try:
        existing_data = pd.read_csv(filename, parse_dates=['Date'])
        if existing_data.empty:
            print("Existing data is empty. Starting full download.")
            download_data()
            return
            
        last_date = existing_data['Date'].max() + pd.Timedelta(days=1)
        print(f"Last date in existing data: {last_date.date()}")
        gc.collect()
    except Exception as e:
        print(f"Error reading existing data: {e}. Starting full download.")
        download_data()
        return
    
    # Get the list of S&P 500 tickers
    sp500_tickers = get_sp500_tickers()
    
    # Initialize a temporary CSV for new data
    temp_filename = os.path.join(database_path, "sp500_data_new.csv")
    with open(temp_filename, 'w') as f:
        f.write('Date,Ticker,Open,High,Low,Close,Adj Close,Volume\n')
    
    # Download new data individually
    successful_updates = 0
    failed_updates = 0
    
    for ticker in sp500_tickers:
        try:
            print(f"Updating data for {ticker}...")
            # Download individual ticker data from last_date onwards with explicit auto_adjust
            ticker_data = yf.download(ticker, start=last_date, progress=False, auto_adjust=True)
            
            if ticker_data.empty:
                print(f"No new data available for {ticker}")
                failed_updates += 1
                continue
                
            ticker_data.dropna(inplace=True)
            ticker_data.reset_index(inplace=True)
            ticker_data['Ticker'] = ticker
            
            # Handle auto_adjust=True case where Adj Close column might not exist
            if 'Adj Close' not in ticker_data.columns:
                ticker_data['Adj Close'] = ticker_data['Close']  # Use Close as Adj Close when auto_adjust=True
                
            ticker_data = ticker_data[['Date', 'Ticker', 'Open', 'High', 'Low', 'Close', 'Adj Close', 'Volume']]
            ticker_data = ticker_data.astype({
                'Open': 'float32',
                'High': 'float32',
                'Low': 'float32',
                'Close': 'float32',
                'Adj Close': 'float32',
                'Volume': 'int32'
            })
            # Append to temporary CSV
            ticker_data.to_csv(temp_filename, mode='a', index=False, header=False)
            print(f"Successfully updated data for {ticker} ({len(ticker_data)} rows)")
            successful_updates += 1
            gc.collect()
            
            # Add small delay to avoid rate limiting
            import time
            time.sleep(0.1)
            
        except Exception as e:
            print(f"Error processing updated data for {ticker}: {e}")
            failed_updates += 1
            continue
    
    print(f"Successful updates: {successful_updates}")
    print(f"Failed updates: {failed_updates}")
    
    # Append new data to existing data
    try:
        new_data = pd.read_csv(temp_filename, parse_dates=['Date'])
        if not new_data.empty:
            all_data = pd.concat([existing_data, new_data], ignore_index=True)
            all_data.drop_duplicates(subset=['Date', 'Ticker'], keep='last', inplace=True)
            # Optimize data types before saving
            all_data = all_data.astype({
                'Open': 'float32',
                'High': 'float32',
                'Low': 'float32',
                'Close': 'float32',
                'Adj Close': 'float32',
                'Volume': 'int32'
            })
            all_data.to_csv(filename, index=False)
            print(f"Data updated successfully in {filename}")
        else:
            print("No new data to update")
        # Remove temporary file
        os.remove(temp_filename)
        gc.collect()
    except Exception as e:
        print(f"Error updating the main CSV: {e}")

# 데이터 로드 함수
def load_data():
    """저장된 데이터를 로드하는 함수"""
    if os.path.exists(filename):
        df = pd.read_csv(filename, parse_dates=['Date'])
        print(f"데이터 로드 완료: {len(df)} 행, {df['Ticker'].nunique()} 개 종목")
        return df
    else:
        print(f"데이터 파일이 존재하지 않습니다: {filename}")
        return None

# Run the update function
if __name__ == "__main__":
    print("S&P 500 데이터 업데이트 시작...")
    update_data()
    
    # 데이터 로드 및 확인
    df = load_data()
    if df is not None:
        print("\n데이터 미리보기:")
        print(df.head())
        print(f"\n데이터 정보:")
        print(f"- 총 행 수: {len(df)}")
        print(f"- 종목 수: {df['Ticker'].nunique()}")
        print(f"- 날짜 범위: {df['Date'].min()} ~ {df['Date'].max()}")
