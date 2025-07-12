import pandas as pd
import os
from datetime import datetime
import matplotlib.pyplot as plt
import seaborn as sns
import numpy as np

# Font settings
plt.rcParams['font.family'] = 'DejaVu Sans'
plt.rcParams['axes.unicode_minus'] = False

def analyze_sp500_data():
    """Analyze S&P 500 CSV data"""
    
    # CSV file path
    csv_path = "database/sp500_data.csv"
    
    # Check if file exists
    if not os.path.exists(csv_path):
        print(f"CSV file does not exist: {csv_path}")
        print("Current directory:", os.getcwd())
        print("Available files:")
        for file in os.listdir('.'):
            if file.endswith('.csv'):
                print(f"  - {file}")
        return None, None, None
    
    # Read CSV file
    print("Loading S&P 500 data...")
    df = pd.read_csv(csv_path, parse_dates=['Date'])
    
    print(f"Total data rows: {len(df):,}")
    print(f"Total stocks: {df['Ticker'].nunique()}")
    print(f"Date range: {df['Date'].min()} ~ {df['Date'].max()}")
    print()
    
    # Analyze start dates for each stock
    print("=== Stock Start Date Analysis ===")
    
    # Find first date for each stock
    start_dates = df.groupby('Ticker')['Date'].min().sort_values()
    
    # Reference date (2000-01-03)
    reference_date = pd.Timestamp('2000-01-03')
    
    print(f"Reference date: {reference_date.date()}")
    print()
    
    # Print start dates for all stocks
    print("Start dates for all stocks:")
    print("-" * 50)
    for ticker, start_date in start_dates.items():
        print(f"{ticker}: {start_date.date()}")
    
    print()
    print("=" * 60)
    
    # Find stocks with different start dates
    different_start_dates = start_dates[start_dates != reference_date]
    
    print(f"Stocks with different start dates ({len(different_start_dates)} stocks):")
    print("-" * 50)
    
    if len(different_start_dates) > 0:
        for ticker, start_date in different_start_dates.items():
            days_diff = (start_date - reference_date).days
            print(f"{ticker}: {start_date.date()} ({days_diff:+d} days from reference)")
    else:
        print("All stocks start on 2000-01-03.")
    
    print()
    print("=" * 60)
    
    # Statistics
    print("=== Statistics ===")
    print(f"Total stocks: {len(start_dates)}")
    print(f"Stocks starting on 2000-01-03: {len(start_dates[start_dates == reference_date])}")
    print(f"Stocks with different start dates: {len(different_start_dates)}")
    
    # Earliest and latest start dates
    earliest_start = start_dates.min()
    latest_start = start_dates.max()
    
    print(f"Earliest start date: {earliest_start.date()}")
    print(f"Latest start date: {latest_start.date()}")
    
    # Distribution by start date
    print()
    print("=== Start Date Distribution ===")
    date_counts = start_dates.value_counts().sort_index()
    for date, count in date_counts.head(10).items():
        print(f"{date.date()}: {count} stocks")
    
    if len(date_counts) > 10:
        print(f"... (Total {len(date_counts)} different start dates)")
    
    # Create visualizations
    create_visualizations(start_dates, reference_date, date_counts)
    
    return df, start_dates, different_start_dates

def create_visualizations(start_dates, reference_date, date_counts):
    """Create visualization charts"""
    
    # Set style
    plt.style.use('default')
    
    # Create comprehensive analysis with 2x2 subplots
    fig, axes = plt.subplots(2, 2, figsize=(16, 12))
    fig.suptitle('S&P 500 Stock Start Date Analysis', fontsize=16, fontweight='bold')
    
    # 1. Overall distribution histogram
    axes[0, 0].hist(start_dates.values, bins=50, alpha=0.7, color='skyblue', edgecolor='black')
    axes[0, 0].axvline(reference_date, color='red', linestyle='--', linewidth=2, label='Reference (2000-01-03)')
    axes[0, 0].set_title('Overall Start Date Distribution')
    axes[0, 0].set_xlabel('Start Date')
    axes[0, 0].set_ylabel('Number of Stocks')
    axes[0, 0].legend()
    axes[0, 0].grid(True, alpha=0.3)
    
    # 2. Days difference from reference date
    days_diff = (start_dates - reference_date).dt.days
    axes[0, 1].hist(days_diff, bins=30, alpha=0.7, color='orange', edgecolor='black')
    axes[0, 1].axvline(0, color='red', linestyle='--', linewidth=2, label='Reference (0 days)')
    axes[0, 1].set_title('Days Difference from Reference Date')
    axes[0, 1].set_xlabel('Days from Reference Date')
    axes[0, 1].set_ylabel('Number of Stocks')
    axes[0, 1].legend()
    axes[0, 1].grid(True, alpha=0.3)
    
    # 3. Yearly distribution
    year_counts = start_dates.dt.year.value_counts().sort_index()
    axes[1, 0].bar(year_counts.index, year_counts.values, alpha=0.7, color='purple', edgecolor='black')
    axes[1, 0].set_title('Stocks by Start Year')
    axes[1, 0].set_xlabel('Year')
    axes[1, 0].set_ylabel('Number of Stocks')
    axes[1, 0].grid(True, alpha=0.3)
    
    # 4. Monthly distribution
    month_counts = start_dates.dt.month.value_counts().sort_index()
    month_names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                   'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    axes[1, 1].bar(month_counts.index, month_counts.values, alpha=0.7, color='teal', edgecolor='black')
    axes[1, 1].set_title('Stocks by Start Month')
    axes[1, 1].set_xlabel('Month')
    axes[1, 1].set_ylabel('Number of Stocks')
    axes[1, 1].set_xticks(range(1, 13))
    axes[1, 1].set_xticklabels(month_names, rotation=45)
    axes[1, 1].grid(True, alpha=0.3)
    
    plt.tight_layout()
    plt.savefig('sp500_start_dates_analysis.png', dpi=300, bbox_inches='tight')
    plt.show()
    
    # Additional detailed analysis
    fig2, axes2 = plt.subplots(1, 2, figsize=(16, 6))
    
    # 1. Stocks with different start dates (scatter plot)
    different_dates = start_dates[start_dates != reference_date]
    if len(different_dates) > 0:
        axes2[0].scatter(range(len(different_dates)), different_dates.values, 
                         alpha=0.6, color='red', s=50)
        axes2[0].axhline(reference_date, color='blue', linestyle='--', linewidth=2, label='Reference Date')
        axes2[0].set_title('Stocks with Different Start Dates')
        axes2[0].set_xlabel('Stock Index')
        axes2[0].set_ylabel('Start Date')
        axes2[0].legend()
        axes2[0].grid(True, alpha=0.3)
    
    # 2. Top 10 start dates by frequency
    top_dates = date_counts.head(10)
    axes2[1].barh(range(len(top_dates)), top_dates.values, alpha=0.7, color='green', edgecolor='black')
    axes2[1].set_yticks(range(len(top_dates)))
    axes2[1].set_yticklabels([d.date() for d in top_dates.index])
    axes2[1].set_title('Top 10 Start Dates by Frequency')
    axes2[1].set_xlabel('Number of Stocks')
    axes2[1].grid(True, alpha=0.3)
    
    plt.tight_layout()
    plt.savefig('sp500_detailed_analysis.png', dpi=300, bbox_inches='tight')
    plt.show()
    
    print("\nVisualization completed!")
    print("- sp500_start_dates_analysis.png: Main analysis charts")
    print("- sp500_detailed_analysis.png: Detailed analysis charts")

if __name__ == "__main__":
    df, start_dates, different_start_dates = analyze_sp500_data()
