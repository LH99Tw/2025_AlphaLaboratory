"""
CSV 데이터 초기화 및 admin 계정 생성 스크립트
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from csv_manager import CSVManager
import random
from datetime import datetime, timedelta

def create_admin_account():
    """admin 계정 생성 및 테스트 데이터 삽입"""
    
    csv_manager = CSVManager()
    
    print("🚀 CSV 데이터 초기화 시작...")
    
    # 1. admin 사용자 생성
    try:
        admin_id = csv_manager.create_user(
            username="admin",
            email="admin@smartanalytics.com",
            password="admin123",
            name="관리자",
            user_type="admin"
        )
        print(f"✅ Admin 계정 생성 완료: {admin_id}")
    except ValueError as e:
        print(f"⚠️  Admin 계정이 이미 존재합니다")
        # 기존 admin 계정 찾기
        import pandas as pd
        users_df = pd.read_csv(csv_manager.users_file, encoding='utf-8-sig')
        admin_user = users_df[users_df['username'] == 'admin']
        if not admin_user.empty:
            admin_id = admin_user.iloc[0]['user_id']
        else:
            raise e
    
    # 2. 투자 데이터 업데이트
    csv_manager.update_investment_data(
        admin_id,
        total_assets=50000000,  # 5천만원
        cash=20000000,          # 2천만원
        stock_value=30000000    # 3천만원
    )
    print("✅ 투자 데이터 생성 완료")
    
    # 3. 포트폴리오 데이터 생성
    sample_stocks = [
        {'ticker': 'AAPL', 'name': 'Apple Inc.', 'sector': 'Technology', 'qty': 50, 'price': 180.5},
        {'ticker': 'MSFT', 'name': 'Microsoft Corp.', 'sector': 'Technology', 'qty': 30, 'price': 380.2},
        {'ticker': 'GOOGL', 'name': 'Alphabet Inc.', 'sector': 'Technology', 'qty': 20, 'price': 140.8},
        {'ticker': 'AMZN', 'name': 'Amazon.com Inc.', 'sector': 'Consumer', 'qty': 15, 'price': 175.3},
        {'ticker': 'TSLA', 'name': 'Tesla Inc.', 'sector': 'Automotive', 'qty': 25, 'price': 250.6},
        {'ticker': 'NVDA', 'name': 'NVIDIA Corp.', 'sector': 'Technology', 'qty': 40, 'price': 495.2},
        {'ticker': 'META', 'name': 'Meta Platforms', 'sector': 'Technology', 'qty': 35, 'price': 350.1},
        {'ticker': 'JPM', 'name': 'JPMorgan Chase', 'sector': 'Finance', 'qty': 60, 'price': 155.8},
    ]
    
    for stock in sample_stocks:
        csv_manager.add_to_portfolio(
            admin_id,
            ticker=stock['ticker'],
            company_name=stock['name'],
            quantity=stock['qty'],
            price=stock['price'],
            sector=stock['sector']
        )
    print(f"✅ 포트폴리오 데이터 생성 완료 ({len(sample_stocks)}개 종목)")
    
    # 4. 거래 내역 생성
    transaction_types = ['buy', 'sell', 'deposit', 'withdraw']
    
    # 최근 30일간의 거래 내역 생성
    for i in range(20):
        trans_type = random.choice(transaction_types)
        
        if trans_type == 'buy':
            stock = random.choice(sample_stocks)
            csv_manager.add_transaction(
                admin_id,
                transaction_type='buy',
                ticker=stock['ticker'],
                quantity=random.randint(1, 10),
                price=stock['price'] * random.uniform(0.95, 1.05),
                amount=0,
                note=f"{stock['name']} 매수"
            )
        elif trans_type == 'sell':
            stock = random.choice(sample_stocks)
            csv_manager.add_transaction(
                admin_id,
                transaction_type='sell',
                ticker=stock['ticker'],
                quantity=random.randint(1, 5),
                price=stock['price'] * random.uniform(0.95, 1.05),
                amount=0,
                note=f"{stock['name']} 매도"
            )
        elif trans_type == 'deposit':
            csv_manager.add_transaction(
                admin_id,
                transaction_type='deposit',
                amount=random.choice([1000000, 2000000, 5000000]),
                note="입금"
            )
        else:  # withdraw
            csv_manager.add_transaction(
                admin_id,
                transaction_type='withdraw',
                amount=random.choice([500000, 1000000, 2000000]),
                note="출금"
            )
    
    print(f"✅ 거래 내역 생성 완료 (20건)")
    
    # 5. 자산 변화 이력 생성 (최근 6개월)
    base_assets = 30000000
    for i in range(180, 0, -1):
        date = datetime.now() - timedelta(days=i)
        # 자산이 점진적으로 증가하는 패턴
        assets = base_assets + (20000000 / 180) * (180 - i) + random.uniform(-1000000, 1000000)
        cash = assets * random.uniform(0.3, 0.5)
        stock = assets - cash
        
        # 직접 CSV에 기록
        import pandas as pd
        import uuid
        history_df = pd.read_csv(csv_manager.asset_history_file, encoding='utf-8-sig')
        new_history = {
            'history_id': str(uuid.uuid4()),
            'user_id': admin_id,
            'total_assets': assets,
            'cash': cash,
            'stock_value': stock,
            'recorded_at': date.isoformat()
        }
        history_df = pd.concat([history_df, pd.DataFrame([new_history])], ignore_index=True)
        history_df.to_csv(csv_manager.asset_history_file, index=False, encoding='utf-8-sig')
    
    print(f"✅ 자산 변화 이력 생성 완료 (180일)")
    
    # 6. 샘플 알파 생성
    sample_alphas = [
        {
            'name': 'Momentum Alpha 001',
            'expression': 'rank(close - ts_delay(close, 10))',
            'performance': {
                'sharpe_ratio': 1.85,
                'cagr': 15.2,
                'mdd': -8.5,
                'win_rate': 0.62
            }
        },
        {
            'name': 'Mean Reversion Alpha 002',
            'expression': 'rank(ts_mean(close, 20) / close - 1)',
            'performance': {
                'sharpe_ratio': 1.45,
                'cagr': 12.3,
                'mdd': -10.2,
                'win_rate': 0.58
            }
        },
        {
            'name': 'Volume Alpha 003',
            'expression': 'rank(correlation(close, volume, 10))',
            'performance': {
                'sharpe_ratio': 1.92,
                'cagr': 18.7,
                'mdd': -7.1,
                'win_rate': 0.65
            }
        }
    ]
    
    for alpha in sample_alphas:
        csv_manager.save_user_alpha(
            admin_id,
            alpha_name=alpha['name'],
            alpha_expression=alpha['expression'],
            performance=alpha['performance']
        )
    
    print(f"✅ 알파 데이터 생성 완료 ({len(sample_alphas)}개)")
    
    # 7. 일반 사용자 계정도 몇 개 생성
    test_users = [
        {'username': 'user1', 'email': 'user1@example.com', 'password': 'user123', 'name': '김철수'},
        {'username': 'user2', 'email': 'user2@example.com', 'password': 'user123', 'name': '이영희'},
    ]
    
    for user in test_users:
        try:
            user_id = csv_manager.create_user(**user)
            print(f"✅ 테스트 사용자 생성: {user['username']} ({user_id})")
        except ValueError:
            print(f"⚠️  사용자 {user['username']}는 이미 존재합니다")
    
    print("\n🎉 CSV 데이터 초기화 완료!")
    print("\n📊 생성된 데이터:")
    print(f"  - Admin 계정: admin / admin123")
    print(f"  - 총 자산: 5천만원 (현금 2천만원, 주식 3천만원)")
    print(f"  - 보유 종목: {len(sample_stocks)}개")
    print(f"  - 거래 내역: 20건")
    print(f"  - 자산 이력: 180일")
    print(f"  - 보유 알파: {len(sample_alphas)}개")

if __name__ == "__main__":
    create_admin_account()

