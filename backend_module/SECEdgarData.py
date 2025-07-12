import pandas as pd
import numpy as np
import requests
import time
import os
import json
from datetime import datetime, timedelta
import xml.etree.ElementTree as ET
import re
import gc

# 데이터베이스 폴더 경로 설정
database_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'database')
filename = os.path.join(database_path, "sp500_data.csv")

# SEC EDGAR API 설정
SEC_BASE_URL = "https://data.sec.gov"
HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Accept': 'application/json',
    'Host': 'data.sec.gov'
}

def get_company_cik(ticker):
    """Get CIK (Central Index Key) for a company ticker"""
    try:
        # SEC CIK mapping (일부 주요 기업들)
        cik_mapping = {
            'AAPL': '0000320193',
            'MSFT': '0000789019',
            'GOOGL': '0001652044',
            'AMZN': '0001018724',
            'TSLA': '0001318605',
            'META': '0001326801',
            'NVDA': '0001045810',
            'AMD': '0000002488',
            'BRK.A': '0001067983',
            'BRK.B': '0001067983',
            'JNJ': '0000200402',
            'JPM': '0000019617',
            'V': '0001403161',
            'PG': '0000080424',
            'UNH': '0000731766',
            'HD': '0000354950',
            'MA': '0001141391',
            'DIS': '0001001039',
            'PYPL': '0001633917',
            'BAC': '0000070858',
            'ADBE': '0000794332',
            'CRM': '0001108524',
            'NFLX': '0001065280',
            'CMCSA': '0001166691',
            'PFE': '0000078003',
            'ABT': '0000001800',
            'KO': '0000021344',
            'PEP': '0000077476',
            'TMO': '0000097744',
            'AVGO': '0001730168',
            'COST': '0000909832',
            'ABBV': '0001150239',
            'WMT': '0000104169',
            'ACN': '0001467373',
            'LLY': '0000059478',
            'DHR': '0000313069',
            'NEE': '0000753308',
            'TXN': '0000097476',
            'BMY': '0000014272',
            'UNP': '0000100885',
            'RTX': '0000101810',
            'QCOM': '0000804328',
            'PM': '0001413329',
            'SPGI': '0000064406',
            'INTC': '0000050863',
            'VZ': '0000732712',
            'HON': '0000778400',
            'LOW': '0000606879',
            'INTU': '0000896878',
            'ISRG': '0001035267',
            'SBUX': '0000829224',
            'ADP': '0000008670',
            'GILD': '0000882092',
            'AMGN': '0000318154',
            'MDLZ': '0001103982',
            'GE': '0000040545',
            'CAT': '0000018230',
            'AXP': '0000004962',
            'GS': '0000886982',
            'MS': '0000895421',
            'IBM': '0000051143',
            'CVX': '0000093410',
            'XOM': '0000034088',
            'AES': '0000874761',
            'AFL': '0000004977',
            'A': '0001090872',
            'ABNB': '0001559720',
            'APD': '0000002969',
            'ADI': '0000006281',
            'ADM': '0000007084',
            'ADP': '0000008670',
            'ADSK': '0000769397',
            'AEE': '0001002910',
            'AEP': '0000049072',
            'AIG': '0000527088',
            'AMAT': '0000006951',
            'AMCR': '0001744757',
            'AMT': '0001053507',
            'AWK': '0001410636',
            'AXP': '0000004962',
            'BA': '0000012927',
            'BAX': '0000010456',
            'BBWI': '0000701985',
            'BDX': '0000010795',
            'BEN': '0000038762',
            'BK': '0001390777',
            'BKNG': '0001075531',
            'BLK': '0001364742',
            'BLL': '0001108350',
            'BMY': '0000014272',
            'BR': '0001384905',
            'BSX': '0000008857',
            'BWA': '0000909832',
            'BXP': '0001037540',
            'C': '0000831001',
            'CAH': '0000721374',
            'CCI': '0001477720',
            'CDAY': '0001660138',
            'CEG': '0001868275',
            'CF': '0000013243',
            'CHD': '0000031369',
            'CHRW': '0001043277',
            'CI': '0001739940',
            'CL': '0000021665',
            'CLX': '0000021015',
            'CMA': '0000028412',
            'CME': '0001156375',
            'CMG': '0001058090',
            'CNC': '0001071739',
            'CNP': '0001130310',
            'COF': '0000927628',
            'COP': '0001163165',
            'CPB': '0000016732',
            'CRL': '0001100682',
            'CSCO': '0000858877',
            'CTAS': '0000723125',
            'CTSH': '0001058290',
            'CTVA': '0001755672',
            'CVS': '0000064803',
            'D': '0001326160',
            'DAL': '0000027904',
            'DE': '0000315189',
            'DG': '0000029534',
            'DHI': '0000882184',
            'DHR': '0000313069',
            'DOV': '0000029905',
            'DTE': '0000936340',
            'DUK': '0001326160',
            'DVA': '0000927063',
            'EA': '0000712515',
            'EBAY': '0001065088',
            'ECL': '0000031463',
            'ED': '0001047862',
            'EFX': '0000033185',
            'EIX': '0001002240',
            'EMN': '0000091526',
            'EMR': '0000032604',
            'ENPH': '0001463101',
            'EOG': '0000821012',
            'EPAM': '0001352010',
            'EQR': '0000892561',
            'ES': '0000111151',
            'ESS': '0000920523',
            'ETN': '0001551182',
            'ETSY': '0001370637',
            'EVRG': '0001755672',
            'EW': '0001099800',
            'EXC': '0001109357',
            'EXPD': '0000746510',
            'EXPE': '0001324424',
            'EXR': '0001289490',
            'F': '0000037996',
            'FANG': '0001539838',
            'FAST': '0000815566',
            'FBIN': '0000007999',
            'FDX': '0001048911',
            'FRC': '0001132979',
            'FTNT': '0001262039',
            'FTV': '0001659166',
            'GD': '0000040584',
            'GEHC': '0001875718',
            'GILD': '0000882092',
            'GIS': '0000040767',
            'GLW': '0000024744',
            'GM': '0001467858',
            'GNRC': '0001474735',
            'GOOGL': '0001652044',
            'GRMN': '0001121788',
            'GS': '0000886982',
            'HAL': '0000045012',
            'HCA': '0000860731',
            'HD': '0000354950',
            'HES': '0000004447',
            'HIG': '0000874766',
            'HOLX': '0000853709',
            'HON': '0000778400',
            'HPE': '0001645590',
            'HPQ': '0000047217',
            'HRB': '00012659',
            'HRL': '0000048365',
            'HSIC': '0001000229',
            'HST': '0001070750',
            'HSY': '0000047115',
            'HUM': '0000049071',
            'IBM': '0000051143',
            'ICE': '0001571949',
            'IDXX': '0000874731',
            'IEX': '0000832103',
            'ILMN': '0001110803',
            'INCY': '0000879160',
            'INTC': '0000050863',
            'IP': '0000051434',
            'IPG': '0000516440',
            'IQV': '0001478242',
            'IR': '0000008070',
            'ISRG': '0001035267',
            'IT': '0000749566',
            'ITW': '0000049826',
            'IVZ': '0000914208',
            'J': '0000008054',
            'JBHT': '0000728855',
            'JKHY': '0000779153',
            'JNPR': '0001043604',
            'JNJ': '0000200402',
            'JNPR': '0001043604',
            'JPM': '0000019617',
            'K': '0000055067',
            'KEY': '0000092116',
            'KEYS': '0001601046',
            'KHC': '0001637459',
            'KIM': '0000879106',
            'KLAC': '0000319489',
            'KMB': '0000055785',
            'KMI': '0001506307',
            'KMX': '0001170010',
            'KO': '0000021344',
            'KR': '0000056863',
            'L': '0000060086',
            'LDOS': '0001336920',
            'LEN': '0000920760',
            'LH': '0000920760',
            'LHX': '0000202055',
            'LIN': '0001707925',
            'LKQ': '0001065696',
            'LLY': '0000059478',
            'LMT': '0000936468',
            'LNT': '0000352340',
            'LOW': '0000606879',
            'LRCX': '0000707525',
            'LUMN': '0000018926',
            'LUV': '0000092380',
            'LVS': '0001300514',
            'LW': '0001679273',
            'LYB': '0001489393',
            'LYV': '0001335258',
            'MA': '0001141391',
            'MAA': '0000912592',
            'MAR': '0001048286',
            'MAS': '0000062944',
            'MCD': '0000063908',
            'MCHP': '0000827054',
            'MCK': '0000927653',
            'MCO': '0000105089',
            'MDLZ': '0001103982',
            'MDT': '0001613103',
            'MET': '0001099219',
            'MGM': '0000789570',
            'MHK': '0000851956',
            'MKC': '0000063755',
            'MKTX': '0001278021',
            'MLM': '0000916054',
            'MMC': '0000062760',
            'MMM': '0000066740',
            'MNST': '0000865572',
            'MO': '0000764180',
            'MOS': '0001285785',
            'MPC': '0001510295',
            'MRK': '0000310158',
            'MS': '0000895421',
            'MSCI': '0001408198',
            'MSFT': '0000789019',
            'MTB': '0000036270',
            'MTCH': '0001568609',
            'MU': '0000723125',
            'NCLH': '0001513761',
            'NDAQ': '0000001085',
            'NDSN': '0000072333',
            'NEE': '0000753308',
            'NEM': '0001164727',
            'NFLX': '0001065280',
            'NI': '0001111711',
            'NOC': '0001133421',
            'NOW': '0001373715',
            'NRG': '000101387',
            'NSC': '0000702155',
            'NTAP': '0000007213',
            'NTRS': '0000073123',
            'NUE': '0000073319',
            'NVDA': '0001045810',
            'NVR': '0000906236',
            'NWL': '0000814156',
            'NWS': '0001564708',
            'NWSA': '0001564708',
            'NXPI': '0001413447',
            'O': '0000891821',
            'ODFL': '0000878495',
            'OGN': '0001821825',
            'OKE': '0001039684',
            'OMC': '0000029989',
            'ON': '0001097864',
            'ORCL': '0001341439',
            'ORLY': '0000898173',
            'OTIS': '0001781335',
            'OXY': '0000797460',
            'PAYC': '0001590715',
            'PAYX': '0000723125',
            'PCAR': '0000753656',
            'PCG': '0001004980',
            'PEAK': '0000764228',
            'PEG': '0000007884',
            'PEP': '0000077476',
            'PFE': '0000078003',
            'PG': '0000080424',
            'PGR': '0000080649',
            'PH': '0000007634',
            'PHM': '0000822458',
            'PKG': '0000007189',
            'PLD': '0001045609',
            'PM': '0001413329',
            'PNC': '0000007137',
            'PNR': '0000007736',
            'PNW': '0000007645',
            'POOL': '0000945760',
            'PPG': '00000079879',
            'PPL': '0000922242',
            'PRU': '0001137774',
            'PSA': '0001393311',
            'PSX': '0001534701',
            'PTC': '0000085745',
            'PVH': '0000078233',
            'PWR': '0001050915',
            'PXD': '0001038357',
            'PYPL': '0001633917',
            'QCOM': '0000804328',
            'QRVO': '0001604778',
            'RCL': '0000884887',
            'RE': '0000894563',
            'REG': '0000910125',
            'RF': '0000001282',
            'RHI': '000000315213',
            'RJF': '000000720005',
            'RL': '000000103703',
            'ROK': '000000102447',
            'ROL': '000000089848',
            'ROP': '000000088283',
            'ROST': '000000074573',
            'RSG': '000000106039',
            'RTX': '0000101810',
            'SBAC': '000000103405',
            'SBNY': '000000117198',
            'SBUX': '0000829224',
            'SCHW': '000000031669',
            'SEDG': '000000141961',
            'SHW': '000000089836',
            'SIVB': '000000071973',
            'SJM': '000000009404',
            'SLB': '000000008734',
            'SNA': '000000009144',
            'SNPS': '000000008837',
            'SO': '000000009212',
            'SPGI': '0000064406',
            'SPLK': '000000135328',
            'SQ': '000000151267',
            'SRE': '0000001032208',
            'STE': '000000009443',
            'STT': '000000009371',
            'STX': '0000001137789',
            'STZ': '000000001691',
            'SWK': '000000009355',
            'SWKS': '000000009127',
            'SYF': '0000001601712',
            'SYK': '000000031045',
            'SYY': '000000009611',
            'T': '0000000732717',
            'TAP': '000000002454',
            'TDG': '0000001260221',
            'TDY': '000000009444',
            'TECH': '0000001118392',
            'TEL': '0000001385157',
            'TER': '000000009721',
            'TFC': '000000009223',
            'TFX': '000000009694',
            'TGT': '000000002741',
            'TJX': '000000010919',
            'TMO': '0000097744',
            'TMUS': '0000001283699',
            'TPR': '000000009444',
            'TRMB': '000000086292',
            'TROW': '0000001113169',
            'TRV': '000000008631',
            'TSCO': '000000091636',
            'TSLA': '0001318605',
            'TSN': '000000010049',
            'TT': '000000009444',
            'TTWO': '000000094696',
            'TXN': '0000097476',
            'TXT': '000000021734',
            'TYL': '000000086292',
            'UAL': '000000010051',
            'UDR': '000000074180',
            'UHS': '000000035205',
            'ULTA': '0000001403568',
            'UNH': '0000731766',
            'UNP': '0000100885',
            'UPS': '000000010472',
            'URI': '000000106770',
            'USB': '000000003610',
            'V': '0001403161',
            'VFC': '000000010383',
            'VICI': '0000001705696',
            'VLO': '0000001035002',
            'VMC': '0000001393009',
            'VNO': '000000089969',
            'VRSK': '0000001442145',
            'VRSN': '0000001014473',
            'VRTX': '0000000875320',
            'VTR': '000000074080',
            'VTRS': '0000001705696',
            'VZ': '0000732712',
            'WAB': '000000094392',
            'WAT': '000000010084',
            'WBA': '000000161892',
            'WDC': '0000000106040',
            'WEC': '000000078330',
            'WELL': '000000076618',
            'WFC': '0000000072971',
            'WM': '000000082376',
            'WMB': '0000000107363',
            'WMT': '0000104169',
            'WRB': '000000011514',
            'WRK': '000000017345',
            'WST': '000000010936',
            'WTW': '000000010936',
            'WY': '0000000106535',
            'WYNN': '0000001174922',
            'XEL': '0000000072907',
            'XLNX': '000000074398',
            'XOM': '0000034088',
            'XRAY': '000000000887',
            'XYL': '0000001524472',
            'YUM': '0000104446',
            'ZBRA': '0000000877212',
            'ZION': '000000010938',
            'ZTS': '0000001555280'
        }
        
        # First check our mapping
        cik = cik_mapping.get(ticker, None)
        if cik:
            return cik
        
        # If not found, try to search SEC for the ticker
        try:
            # SEC ticker to CIK search
            search_url = f"{SEC_BASE_URL}/api/company-tickers.json"
            response = requests.get(search_url, headers=HEADERS)
            
            if response.status_code == 200:
                companies = response.json()
                for company in companies.values():
                    if company.get('ticker') == ticker:
                        return str(company.get('cik_str')).zfill(10)
        except Exception as e:
            print(f"Error searching CIK for {ticker}: {e}")
        
        return None
        
    except Exception as e:
        print(f"Error getting CIK for {ticker}: {e}")
        return None

def get_company_facts(cik):
    """Get company facts from SEC EDGAR"""
    try:
        # CIK를 10자리로 패딩
        cik_padded = str(cik).zfill(10)
        
        url = f"{SEC_BASE_URL}/api/xbrl/companyfacts/CIK{cik_padded}.json"
        
        response = requests.get(url, headers=HEADERS)
        
        if response.status_code == 200:
            return response.json()
        else:
            print(f"Error getting facts for CIK {cik}: {response.status_code}")
            return None
            
    except Exception as e:
        print(f"Error getting company facts: {e}")
        return None

def extract_financial_data(facts_data, ticker):
    """Extract financial data from SEC facts"""
    try:
        if not facts_data or 'facts' not in facts_data:
            return None
        
        financial_data = {
            'EPS': {},
            'Revenue': {},
            'Net_Income': {},
            'Total_Assets': {},
            'Total_Debt': {},
            'Cash': {}
        }
        
        facts = facts_data['facts']
        
        # US GAAP 데이터 사용
        if 'us-gaap' in facts:
            us_gaap = facts['us-gaap']
            
            # EPS (Earnings Per Share)
            if 'EarningsPerShareBasic' in us_gaap:
                eps_data = us_gaap['EarningsPerShareBasic']['units']['USD/shares']
                for period in eps_data:
                    if 'end' in period and 'val' in period:
                        date = period['end']
                        value = period['val']
                        financial_data['EPS'][date] = value
            
            # Revenue
            if 'Revenues' in us_gaap:
                revenue_data = us_gaap['Revenues']['units']['USD']
                for period in revenue_data:
                    if 'end' in period and 'val' in period:
                        date = period['end']
                        value = period['val']
                        financial_data['Revenue'][date] = value
            
            # Net Income
            if 'NetIncomeLoss' in us_gaap:
                net_income_data = us_gaap['NetIncomeLoss']['units']['USD']
                for period in net_income_data:
                    if 'end' in period and 'val' in period:
                        date = period['end']
                        value = period['val']
                        financial_data['Net_Income'][date] = value
            
            # Total Assets
            if 'Assets' in us_gaap:
                assets_data = us_gaap['Assets']['units']['USD']
                for period in assets_data:
                    if 'end' in period and 'val' in period:
                        date = period['end']
                        value = period['val']
                        financial_data['Total_Assets'][date] = value
            
            # Total Debt
            if 'LongTermDebt' in us_gaap:
                debt_data = us_gaap['LongTermDebt']['units']['USD']
                for period in debt_data:
                    if 'end' in period and 'val' in period:
                        date = period['end']
                        value = period['val']
                        financial_data['Total_Debt'][date] = value
            
            # Cash
            if 'CashAndCashEquivalentsAtCarryingValue' in us_gaap:
                cash_data = us_gaap['CashAndCashEquivalentsAtCarryingValue']['units']['USD']
                for period in cash_data:
                    if 'end' in period and 'val' in period:
                        date = period['end']
                        value = period['val']
                        financial_data['Cash'][date] = value
        
        return financial_data
        
    except Exception as e:
        print(f"Error extracting financial data for {ticker}: {e}")
        return None

def expand_quarterly_to_daily_sec(quarterly_data, start_date, end_date):
    """Expand quarterly financial data to daily data with forward fill"""
    if quarterly_data is None:
        return pd.DataFrame()
    
    # Create date range
    date_range = pd.date_range(start=start_date, end=end_date, freq='D')
    
    # Initialize daily data
    daily_data = pd.DataFrame(index=date_range)
    
    # Handle different metrics
    for metric_name, metric_data in quarterly_data.items():
        if metric_data:  # Only process if data exists
            for date_str, value in metric_data.items():
                try:
                    # Convert date string to datetime
                    date = pd.to_datetime(date_str)
                    
                    if date in date_range:
                        daily_data.loc[date, metric_name] = value
                    else:
                        # Find the closest date
                        closest_date = date_range[date_range.get_indexer([date], method='nearest')[0]]
                        daily_data.loc[closest_date, metric_name] = value
                except Exception as e:
                    print(f"Error processing date {date_str}: {e}")
                    continue
    
    # Apply forward fill (fill missing values with previous values)
    daily_data = daily_data.ffill()
    
    return daily_data

def fill_financial_data_sec_for_ticker(ticker, df_ticker):
    """Fill financial data for a specific ticker using SEC EDGAR"""
    try:
        print(f"Processing SEC financial data for {ticker}...")
        
        # Get CIK for the ticker
        cik = get_company_cik(ticker)
        if not cik:
            print(f"No CIK found for {ticker}")
            return False
        
        print(f"  Found CIK: {cik} for {ticker}")
        
        # Get company facts from SEC
        facts_data = get_company_facts(cik)
        if not facts_data:
            print(f"No facts data available for {ticker}")
            return False
        
        # Extract financial data
        quarterly_financials = extract_financial_data(facts_data, ticker)
        
        if quarterly_financials:
            print(f"  Found financial data for {ticker}")
            for metric, data in quarterly_financials.items():
                if data:
                    print(f"    {metric}: {len(data)} periods")
            
            # Get date range for this ticker
            start_date = df_ticker['Date'].min()
            end_date = df_ticker['Date'].max()
            print(f"  Date range: {start_date} to {end_date}")
            
            # Expand quarterly data to daily data
            daily_financials = expand_quarterly_to_daily_sec(quarterly_financials, start_date, end_date)
            
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
                
                print(f"Successfully filled SEC financial data for {ticker}")
                return True
            else:
                print(f"No daily financial data generated for {ticker}")
                return False
        else:
            print(f"No quarterly financial data available for {ticker}")
            return False
            
    except Exception as e:
        print(f"Error processing SEC financial data for {ticker}: {e}")
        return False

def fill_all_financial_data_sec():
    """Fill financial data for all tickers in the CSV file using SEC EDGAR"""
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
                
                if fill_financial_data_sec_for_ticker(ticker, df_ticker):
                    # Update the main dataframe
                    df.loc[df['Ticker'] == ticker] = df_ticker
                    successful_fills += 1
                else:
                    failed_fills += 1
                
                # Add small delay to avoid rate limiting
                time.sleep(0.5)  # SEC API는 더 긴 대기시간 필요
                gc.collect()
                
            except Exception as e:
                print(f"Error processing {ticker}: {e}")
                failed_fills += 1
                continue
        
        # Save the updated dataframe
        print("Saving updated data...")
        df.to_csv(filename, index=False)
        
        print(f"SEC financial data filling completed!")
        print(f"Successful fills: {successful_fills}")
        print(f"Failed fills: {failed_fills}")
        
    except Exception as e:
        print(f"Error in fill_all_financial_data_sec: {e}")

if __name__ == "__main__":
    print("Starting SEC EDGAR financial data filling process...")
    fill_all_financial_data_sec()
    print("Process completed!") 