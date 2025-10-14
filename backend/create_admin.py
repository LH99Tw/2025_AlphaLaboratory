"""
Admin 계정 및 테스트 데이터 생성 (pandas 없이)
"""

import os
import csv
import hashlib
import uuid
from datetime import datetime, timedelta
import random

def hash_password(password):
    return hashlib.sha256(password.encode()).hexdigest()

def create_csv_files():
    """CSV 파일들 생성"""
    data_dir = "database/csv_data"
    os.makedirs(data_dir, exist_ok=True)
    
    # 1. users.csv
    users_file = os.path.join(data_dir, "users.csv")
    if not os.path.exists(users_file):
        with open(users_file, 'w', newline='', encoding='utf-8-sig') as f:
            writer = csv.writer(f)
            writer.writerow(['user_id', 'username', 'email', 'password_hash', 'name', 'created_at', 'last_login', 'is_active', 'user_type'])
    
    # 2. investments.csv
    investments_file = os.path.join(data_dir, "investments.csv")
    if not os.path.exists(investments_file):
        with open(investments_file, 'w', newline='', encoding='utf-8-sig') as f:
            writer = csv.writer(f)
            writer.writerow(['user_id', 'total_assets', 'cash', 'stock_value', 'updated_at'])
    
    # 3. portfolios.csv
    portfolios_file = os.path.join(data_dir, "portfolios.csv")
    if not os.path.exists(portfolios_file):
        with open(portfolios_file, 'w', newline='', encoding='utf-8-sig') as f:
            writer = csv.writer(f)
            writer.writerow(['portfolio_id', 'user_id', 'ticker', 'company_name', 'quantity', 'avg_price', 'current_price', 'sector', 'purchase_date', 'updated_at'])
    
    # 4. user_alphas.csv
    alphas_file = os.path.join(data_dir, "user_alphas.csv")
    if not os.path.exists(alphas_file):
        with open(alphas_file, 'w', newline='', encoding='utf-8-sig') as f:
            writer = csv.writer(f)
            writer.writerow(['alpha_id', 'user_id', 'alpha_name', 'alpha_expression', 'performance', 'created_at', 'is_active'])
    
    # 5. transactions.csv
    transactions_file = os.path.join(data_dir, "transactions.csv")
    if not os.path.exists(transactions_file):
        with open(transactions_file, 'w', newline='', encoding='utf-8-sig') as f:
            writer = csv.writer(f)
            writer.writerow(['transaction_id', 'user_id', 'transaction_type', 'ticker', 'quantity', 'price', 'amount', 'transaction_date', 'note'])
    
    # 6. asset_history.csv
    history_file = os.path.join(data_dir, "asset_history.csv")
    if not os.path.exists(history_file):
        with open(history_file, 'w', newline='', encoding='utf-8-sig') as f:
            writer = csv.writer(f)
            writer.writerow(['history_id', 'user_id', 'total_assets', 'cash', 'stock_value', 'recorded_at'])
    
    print("✅ CSV 파일 생성 완료")

def create_admin_account():
    """Admin 계정 생성"""
    data_dir = "database/csv_data"
    users_file = os.path.join(data_dir, "users.csv")
    
    # 기존 admin 계정 확인
    existing_users = []
    with open(users_file, 'r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        existing_users = list(reader)
    
    for user in existing_users:
        if user['username'] == 'admin':
            print("⚠️  Admin 계정이 이미 존재합니다")
            return user['user_id']
    
    # Admin 계정 생성
    admin_id = str(uuid.uuid4())
    with open(users_file, 'a', newline='', encoding='utf-8-sig') as f:
        writer = csv.writer(f)
        writer.writerow([
            admin_id,
            'admin',
            'admin@smartanalytics.com',
            hash_password('admin123'),
            '관리자',
            datetime.now().isoformat(),
            None,
            'True',
            'admin'
        ])
    
    print(f"✅ Admin 계정 생성 완료: {admin_id}")
    return admin_id

def create_investment_data(user_id):
    """투자 데이터 생성"""
    data_dir = "database/csv_data"
    investments_file = os.path.join(data_dir, "investments.csv")
    
    with open(investments_file, 'a', newline='', encoding='utf-8-sig') as f:
        writer = csv.writer(f)
        writer.writerow([
            user_id,
            50000000,  # 5천만원
            20000000,  # 2천만원 현금
            30000000,  # 3천만원 주식
            datetime.now().isoformat()
        ])
    
    print("✅ 투자 데이터 생성 완료")

def create_portfolio_data(user_id):
    """포트폴리오 데이터 생성"""
    data_dir = "database/csv_data"
    portfolios_file = os.path.join(data_dir, "portfolios.csv")
    
    stocks = [
        {'ticker': 'AAPL', 'name': 'Apple Inc.', 'sector': 'Technology', 'qty': 50, 'price': 180.5},
        {'ticker': 'MSFT', 'name': 'Microsoft Corp.', 'sector': 'Technology', 'qty': 30, 'price': 380.2},
        {'ticker': 'GOOGL', 'name': 'Alphabet Inc.', 'sector': 'Technology', 'qty': 20, 'price': 140.8},
        {'ticker': 'AMZN', 'name': 'Amazon.com Inc.', 'sector': 'Consumer', 'qty': 15, 'price': 175.3},
        {'ticker': 'TSLA', 'name': 'Tesla Inc.', 'sector': 'Automotive', 'qty': 25, 'price': 250.6},
    ]
    
    with open(portfolios_file, 'a', newline='', encoding='utf-8-sig') as f:
        writer = csv.writer(f)
        for stock in stocks:
            writer.writerow([
                str(uuid.uuid4()),
                user_id,
                stock['ticker'],
                stock['name'],
                stock['qty'],
                stock['price'],
                stock['price'] * random.uniform(0.95, 1.05),
                stock['sector'],
                (datetime.now() - timedelta(days=random.randint(30, 180))).isoformat(),
                datetime.now().isoformat()
            ])
    
    print(f"✅ 포트폴리오 데이터 생성 완료 ({len(stocks)}개 종목)")

if __name__ == "__main__":
    print("🚀 CSV 데이터 초기화 시작...")
    
    create_csv_files()
    admin_id = create_admin_account()
    create_investment_data(admin_id)
    create_portfolio_data(admin_id)
    
    print("\n🎉 초기화 완료!")
    print(f"📊 Admin 계정: admin / admin123")

