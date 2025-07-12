import pandas as pd
import numpy as np
import yfinance as yf
import os
import time
import gc
from datetime import datetime

# 데이터베이스 폴더 경로 설정
database_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'database')
filename = os.path.join(database_path, "sp500_data.csv")

def map_ticker_to_yahoo(ticker):
    """Map problematic tickers to their correct Yahoo Finance symbols"""
    # Known problematic tickers with their correct Yahoo Finance symbols
    known_mappings = {
        'BRK.B': 'BRK-B',  # Berkshire Hathaway Class B
        'BF.B': 'BF-B',    # Brown-Forman Class B
        'BRK.A': 'BRK-A',  # Berkshire Hathaway Class A
        'BF.A': 'BF-A',    # Brown-Forman Class A
    }
    
    # First check known mappings
    if ticker in known_mappings:
        return known_mappings[ticker]
    
    # For other tickers with dots, try both original and hyphenated versions
    if '.' in ticker:
        return ticker.replace('.', '-')
    
    return ticker

def get_quarterly_financials(ticker):
    """Get quarterly financial data for a ticker"""
    try:
        yahoo_ticker = map_ticker_to_yahoo(ticker)
        ticker_obj = yf.Ticker(yahoo_ticker)
        
        # Get quarterly financial statements
        income_stmt = ticker_obj.quarterly_income_stmt
        balance_sheet = ticker_obj.quarterly_balance_sheet
        
        # Check if data is empty
        if (income_stmt.empty if hasattr(income_stmt, 'empty') else len(income_stmt) == 0) and \
           (balance_sheet.empty if hasattr(balance_sheet, 'empty') else len(balance_sheet) == 0):
            return None
        
        # Extract key metrics
        financial_data = {}
        
        if not (income_stmt.empty if hasattr(income_stmt, 'empty') else len(income_stmt) == 0):
            if 'Basic EPS' in income_stmt.index:
                financial_data['EPS'] = income_stmt.loc['Basic EPS', :]
            if 'Total Revenue' in income_stmt.index:
                financial_data['Revenue'] = income_stmt.loc['Total Revenue', :]
            if 'Net Income' in income_stmt.index:
                financial_data['Net_Income'] = income_stmt.loc['Net Income', :]
        
        if not (balance_sheet.empty if hasattr(balance_sheet, 'empty') else len(balance_sheet) == 0):
            if 'Total Assets' in balance_sheet.index:
                financial_data['Total_Assets'] = balance_sheet.loc['Total Assets', :]
            if 'Total Debt' in balance_sheet.index:
                financial_data['Total_Debt'] = balance_sheet.loc['Total Debt', :]
            if 'Cash' in balance_sheet.index:
                financial_data['Cash'] = balance_sheet.loc['Cash', :]
        
        # Calculate ratios
        if 'Net_Income' in financial_data and 'Total_Assets' in financial_data:
            financial_data['ROA'] = financial_data['Net_Income'] / financial_data['Total_Assets']
        
        return financial_data
        
    except Exception as e:
        print(f"Error getting financials for {ticker}: {e}")
        return None

def expand_quarterly_to_daily(quarterly_data, start_date, end_date):
    """Expand quarterly financial data to daily data with forward fill"""
    if quarterly_data is None or len(quarterly_data) == 0:
        return pd.DataFrame()
    
    # Create date range
    date_range = pd.date_range(start=start_date, end=end_date, freq='D')
    
    # Initialize daily data
    daily_data = pd.DataFrame(index=date_range)
    
    # Handle different data structures
    for metric_name, metric_data in quarterly_data.items():
        if isinstance(metric_data, pd.Series):
            # For each quarter end date in the metric data
            for quarter_date, value in metric_data.items():
                if pd.notna(value):  # Only process non-null values
                    # Find the closest date in our date range
                    if quarter_date in date_range:
                        daily_data.loc[quarter_date, metric_name] = value
                    else:
                        # Find the closest date
                        closest_date = date_range[date_range.get_indexer([quarter_date], method='nearest')[0]]
                        daily_data.loc[closest_date, metric_name] = value
    
    # Apply forward fill (fill missing values with previous values)
    daily_data = daily_data.ffill()
    
    return daily_data

def fill_financial_data_for_ticker(ticker, df_ticker):
    """Fill financial data for a specific ticker"""
    try:
        print(f"Processing financial data for {ticker}...")
        
        # Get quarterly financial data
        quarterly_financials = get_quarterly_financials(ticker)
        
        if quarterly_financials and len(quarterly_financials) > 0:
            print(f"  Found {len(quarterly_financials)} financial metrics for {ticker}")
            for metric, data in quarterly_financials.items():
                if isinstance(data, pd.Series):
                    print(f"    {metric}: {len(data)} quarters, range: {data.index.min()} to {data.index.max()}")
            
            # Get date range for this ticker
            start_date = df_ticker['Date'].min()
            end_date = df_ticker['Date'].max()
            print(f"  Date range: {start_date} to {end_date}")
            
            # Expand quarterly data to daily data
            daily_financials = expand_quarterly_to_daily(quarterly_financials, start_date, end_date)
            
            if not daily_financials.empty:
                print(f"  Generated daily data with {len(daily_financials.columns)} columns")
                # Update the dataframe with financial data
                for col in daily_financials.columns:
                    if col in df_ticker.columns:
                        # Merge financial data with price data based on date
                        for date in daily_financials.index:
                            if date in df_ticker['Date'].values:
                                mask = df_ticker['Date'] == date
                                df_ticker.loc[mask, col] = daily_financials.loc[date, col]
                
                print(f"Successfully filled financial data for {ticker}")
                return True
            else:
                print(f"No daily financial data generated for {ticker}")
                return False
        else:
            print(f"No quarterly financial data available for {ticker}")
            return False
            
    except Exception as e:
        print(f"Error processing financial data for {ticker}: {e}")
        return False

def fill_all_financial_data():
    """Fill financial data for all tickers in the CSV file"""
    try:
        # Read the CSV file
        print("Reading CSV file...")
        df = pd.read_csv(filename, parse_dates=['Date'])
        
        if df.empty:
            print("CSV file is empty!")
            return
        
        print(f"Found {len(df)} rows with {df['Ticker'].nunique()} unique tickers")
        
        # Get unique tickers
        unique_tickers = df['Ticker'].unique()
        print(f"Processing {len(unique_tickers)} tickers...")
        
        successful_fills = 0
        failed_fills = 0
        
        for ticker in unique_tickers:
            try:
                # Get data for this ticker
                df_ticker = df[df['Ticker'] == ticker].copy()
                
                if fill_financial_data_for_ticker(ticker, df_ticker):
                    # Update the main dataframe
                    df.loc[df['Ticker'] == ticker] = df_ticker
                    successful_fills += 1
                else:
                    failed_fills += 1
                
                # Add small delay to avoid rate limiting
                time.sleep(0.1)
                gc.collect()
                
            except Exception as e:
                print(f"Error processing {ticker}: {e}")
                failed_fills += 1
                continue
        
        # Save the updated dataframe
        print("Saving updated data...")
        df.to_csv(filename, index=False)
        
        print(f"Financial data filling completed!")
        print(f"Successful fills: {successful_fills}")
        print(f"Failed fills: {failed_fills}")
        
    except Exception as e:
        print(f"Error in fill_all_financial_data: {e}")

if __name__ == "__main__":
    print("Starting financial data filling process...")
    fill_all_financial_data()
    print("Process completed!") 