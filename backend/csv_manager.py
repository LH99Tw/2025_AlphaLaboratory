"""
CSV 기반 회원 관리 시스템
모든 사용자 데이터를 CSV로 관리하고 JOIN을 통해 연결
"""

import csv
import os
import hashlib
import uuid
from datetime import datetime
from typing import Dict, Any, Optional, List
import logging
import pandas as pd

logger = logging.getLogger(__name__)

class CSVManager:
    """CSV 기반 데이터 관리 클래스"""
    
    def __init__(self, data_dir: str = "database/csv_data"):
        self.data_dir = data_dir
        
        # CSV 파일 경로
        self.users_file = os.path.join(data_dir, "users.csv")
        self.investments_file = os.path.join(data_dir, "investments.csv")
        self.portfolios_file = os.path.join(data_dir, "portfolios.csv")
        self.user_alphas_file = os.path.join(data_dir, "user_alphas.csv")
        self.transactions_file = os.path.join(data_dir, "transactions.csv")
        self.asset_history_file = os.path.join(data_dir, "asset_history.csv")
        
        # 디렉토리 생성
        os.makedirs(data_dir, exist_ok=True)
        
        # 초기 CSV 파일 생성
        self._initialize_csv_files()
    
    def _initialize_csv_files(self):
        """초기 CSV 파일들을 생성합니다."""
        
        # users.csv - 사용자 기본 정보
        if not os.path.exists(self.users_file):
            users_df = pd.DataFrame(columns=[
                'user_id',           # 사용자 고유 ID (UUID)
                'username',          # 사용자명 (로그인 ID)
                'email',            # 이메일
                'password_hash',    # 비밀번호 해시
                'name',             # 실명
                'profile_emoji',    # 프로필 이모티콘
                'created_at',       # 생성일시
                'last_login',       # 마지막 로그인
                'is_active',        # 활성 상태
                'user_type'         # 사용자 타입 (admin, user)
            ])
            users_df.to_csv(self.users_file, index=False, encoding='utf-8-sig')
        else:
            # 기존 파일에 profile_emoji 컬럼이 없으면 추가
            users_df = pd.read_csv(self.users_file, encoding='utf-8-sig')
            if 'profile_emoji' not in users_df.columns:
                users_df['profile_emoji'] = '😀'  # 기본값
                users_df.to_csv(self.users_file, index=False, encoding='utf-8-sig')
        
        # investments.csv - 투자 현황
        if not os.path.exists(self.investments_file):
            investments_df = pd.DataFrame(columns=[
                'user_id',          # 사용자 ID (users.user_id와 조인)
                'total_assets',     # 총 자산
                'cash',            # 현금 자산
                'stock_value',     # 주식 평가액
                'updated_at'       # 업데이트 일시
            ])
            investments_df.to_csv(self.investments_file, index=False, encoding='utf-8-sig')
        
        # portfolios.csv - 포트폴리오 (보유 주식)
        if not os.path.exists(self.portfolios_file):
            portfolios_df = pd.DataFrame(columns=[
                'portfolio_id',     # 포트폴리오 고유 ID
                'user_id',         # 사용자 ID
                'ticker',          # 종목 코드
                'company_name',    # 회사명
                'quantity',        # 보유 수량
                'avg_price',       # 평균 매수가
                'current_price',   # 현재가
                'sector',          # 섹터
                'purchase_date',   # 최초 매수일
                'updated_at'       # 업데이트 일시
            ])
            portfolios_df.to_csv(self.portfolios_file, index=False, encoding='utf-8-sig')
        
        # user_alphas.csv - 사용자 보유 알파
        if not os.path.exists(self.user_alphas_file):
            user_alphas_df = pd.DataFrame(columns=[
                'alpha_id',        # 알파 고유 ID
                'user_id',         # 사용자 ID
                'alpha_name',      # 알파 이름
                'alpha_expression',# 알파 수식
                'performance',     # 성과 지표 (JSON)
                'created_at',      # 생성일시
                'is_active'        # 활성 상태
            ])
            user_alphas_df.to_csv(self.user_alphas_file, index=False, encoding='utf-8-sig')
        
        # transactions.csv - 거래 내역
        if not os.path.exists(self.transactions_file):
            transactions_df = pd.DataFrame(columns=[
                'transaction_id',  # 거래 고유 ID
                'user_id',        # 사용자 ID
                'transaction_type',# 거래 유형 (buy, sell, deposit, withdraw)
                'ticker',         # 종목 코드 (주식 거래인 경우)
                'quantity',       # 수량
                'price',          # 가격
                'amount',         # 총액
                'transaction_date',# 거래일시
                'note'            # 비고
            ])
            transactions_df.to_csv(self.transactions_file, index=False, encoding='utf-8-sig')
        
        # asset_history.csv - 자산 변화 이력
        if not os.path.exists(self.asset_history_file):
            asset_history_df = pd.DataFrame(columns=[
                'history_id',      # 이력 고유 ID
                'user_id',        # 사용자 ID
                'total_assets',   # 총 자산
                'cash',          # 현금
                'stock_value',   # 주식 평가액
                'recorded_at'    # 기록 일시
            ])
            asset_history_df.to_csv(self.asset_history_file, index=False, encoding='utf-8-sig')
    
    def _hash_password(self, password: str) -> str:
        """비밀번호를 해시화합니다."""
        return hashlib.sha256(password.encode()).hexdigest()
    
    # ==================== 사용자 관리 ====================
    
    def create_user(self, username: str, email: str, password: str, name: str = "", user_type: str = "user", profile_emoji: str = "😀") -> str:
        """새 사용자를 생성합니다."""
        try:
            users_df = pd.read_csv(self.users_file, encoding='utf-8-sig')
            
            # 중복 체크
            if not users_df.empty:
                if ((users_df['username'] == username) | (users_df['email'] == email)).any():
                    raise ValueError("이미 존재하는 사용자명 또는 이메일입니다.")
            
            # 새 사용자 ID 생성
            user_id = str(uuid.uuid4())
            
            # 사용자 데이터 생성
            new_user = {
                'user_id': user_id,
                'username': username,
                'email': email,
                'password_hash': self._hash_password(password),
                'name': name or username,
                'profile_emoji': profile_emoji,
                'created_at': datetime.now().isoformat(),
                'last_login': None,
                'is_active': True,
                'user_type': user_type
            }
            
            # DataFrame에 추가
            users_df = pd.concat([users_df, pd.DataFrame([new_user])], ignore_index=True)
            users_df.to_csv(self.users_file, index=False, encoding='utf-8-sig')
            
            # 초기 투자 데이터 생성
            self._create_initial_investment(user_id)
            
            logger.info(f"새 사용자 생성: {username} ({user_id})")
            return user_id
            
        except Exception as e:
            logger.error(f"사용자 생성 오류: {str(e)}")
            raise
    
    def authenticate_user(self, username: str, password: str) -> Optional[str]:
        """사용자 인증을 수행합니다."""
        try:
            users_df = pd.read_csv(self.users_file, encoding='utf-8-sig')
            password_hash = self._hash_password(password)
            
            # 사용자명 또는 이메일로 검색
            user = users_df[
                ((users_df['username'] == username) | (users_df['email'] == username)) &
                (users_df['password_hash'] == password_hash) &
                (users_df['is_active'] == True)
            ]
            
            if not user.empty:
                user_id = user.iloc[0]['user_id']
                
                # 마지막 로그인 시간 업데이트
                users_df.loc[users_df['user_id'] == user_id, 'last_login'] = datetime.now().isoformat()
                users_df.to_csv(self.users_file, index=False, encoding='utf-8-sig')
                
                logger.info(f"사용자 인증 성공: {username} ({user_id})")
                return user_id
            
            logger.warning(f"사용자 인증 실패: {username}")
            return None
            
        except Exception as e:
            logger.error(f"사용자 인증 오류: {str(e)}")
            return None
    
    def get_user_info(self, user_id: str) -> Optional[Dict[str, Any]]:
        """사용자 정보를 조회합니다."""
        try:
            users_df = pd.read_csv(self.users_file, encoding='utf-8-sig')
            user = users_df[users_df['user_id'] == user_id]
            
            if not user.empty:
                user_dict = user.iloc[0].to_dict()
                # 비밀번호 해시는 제외
                user_dict.pop('password_hash', None)
                return user_dict
            
            return None
            
        except Exception as e:
            logger.error(f"사용자 정보 조회 오류: {str(e)}")
            return None
    
    def update_user_info(self, user_id: str, **kwargs) -> bool:
        """사용자 정보를 업데이트합니다."""
        try:
            users_df = pd.read_csv(self.users_file, encoding='utf-8-sig')
            
            if user_id not in users_df['user_id'].values:
                return False
            
            # 업데이트 가능한 필드들
            allowed_fields = ['name', 'email']
            
            for field, value in kwargs.items():
                if field in allowed_fields:
                    users_df.loc[users_df['user_id'] == user_id, field] = value
            
            users_df.to_csv(self.users_file, index=False, encoding='utf-8-sig')
            logger.info(f"사용자 정보 업데이트: {user_id}")
            return True
            
        except Exception as e:
            logger.error(f"사용자 정보 업데이트 오류: {str(e)}")
            return False
    
    def change_password(self, user_id: str, current_password: str, new_password: str) -> bool:
        """비밀번호를 변경합니다."""
        try:
            users_df = pd.read_csv(self.users_file, encoding='utf-8-sig')
            current_hash = self._hash_password(current_password)
            
            user = users_df[
                (users_df['user_id'] == user_id) &
                (users_df['password_hash'] == current_hash)
            ]
            
            if user.empty:
                return False
            
            new_hash = self._hash_password(new_password)
            users_df.loc[users_df['user_id'] == user_id, 'password_hash'] = new_hash
            users_df.to_csv(self.users_file, index=False, encoding='utf-8-sig')
            
            logger.info(f"비밀번호 변경: {user_id}")
            return True
            
        except Exception as e:
            logger.error(f"비밀번호 변경 오류: {str(e)}")
            return False
    
    # ==================== 투자 관리 ====================
    
    def _create_initial_investment(self, user_id: str):
        """초기 투자 데이터를 생성합니다."""
        try:
            investments_df = pd.read_csv(self.investments_file, encoding='utf-8-sig')
            
            new_investment = {
                'user_id': user_id,
                'total_assets': 10000000,  # 1천만원
                'cash': 10000000,
                'stock_value': 0,
                'updated_at': datetime.now().isoformat()
            }
            
            investments_df = pd.concat([investments_df, pd.DataFrame([new_investment])], ignore_index=True)
            investments_df.to_csv(self.investments_file, index=False, encoding='utf-8-sig')
            
            # 초기 자산 이력 기록
            self._record_asset_history(user_id, 10000000, 10000000, 0)
            
        except Exception as e:
            logger.error(f"초기 투자 데이터 생성 오류: {str(e)}")
    
    def get_investment_data(self, user_id: str) -> Optional[Dict[str, Any]]:
        """사용자의 투자 데이터를 조회합니다."""
        try:
            investments_df = pd.read_csv(self.investments_file, encoding='utf-8-sig')
            investment = investments_df[investments_df['user_id'] == user_id]
            
            if not investment.empty:
                return investment.iloc[0].to_dict()
            
            return None
            
        except Exception as e:
            logger.error(f"투자 데이터 조회 오류: {str(e)}")
            return None
    
    def update_investment_data(self, user_id: str, **kwargs) -> bool:
        """사용자의 투자 데이터를 업데이트합니다."""
        try:
            investments_df = pd.read_csv(self.investments_file, encoding='utf-8-sig')
            
            if user_id not in investments_df['user_id'].values:
                return False
            
            allowed_fields = ['total_assets', 'cash', 'stock_value']
            
            for field, value in kwargs.items():
                if field in allowed_fields:
                    investments_df.loc[investments_df['user_id'] == user_id, field] = value
            
            investments_df.loc[investments_df['user_id'] == user_id, 'updated_at'] = datetime.now().isoformat()
            investments_df.to_csv(self.investments_file, index=False, encoding='utf-8-sig')
            
            # 자산 이력 기록
            current = investments_df[investments_df['user_id'] == user_id].iloc[0]
            self._record_asset_history(
                user_id,
                current['total_assets'],
                current['cash'],
                current['stock_value']
            )
            
            logger.info(f"투자 데이터 업데이트: {user_id}")
            return True
            
        except Exception as e:
            logger.error(f"투자 데이터 업데이트 오류: {str(e)}")
            return False
    
    def _record_asset_history(self, user_id: str, total_assets: float, cash: float, stock_value: float):
        """자산 변화 이력을 기록합니다."""
        try:
            history_df = pd.read_csv(self.asset_history_file, encoding='utf-8-sig')
            
            new_history = {
                'history_id': str(uuid.uuid4()),
                'user_id': user_id,
                'total_assets': total_assets,
                'cash': cash,
                'stock_value': stock_value,
                'recorded_at': datetime.now().isoformat()
            }
            
            history_df = pd.concat([history_df, pd.DataFrame([new_history])], ignore_index=True)
            
            # 최근 100개만 유지
            user_history = history_df[history_df['user_id'] == user_id]
            if len(user_history) > 100:
                keep_ids = user_history.sort_values('recorded_at', ascending=False).head(100)['history_id'].tolist()
                history_df = history_df[
                    (history_df['user_id'] != user_id) |
                    (history_df['history_id'].isin(keep_ids))
                ]
            
            history_df.to_csv(self.asset_history_file, index=False, encoding='utf-8-sig')
            
        except Exception as e:
            logger.error(f"자산 이력 기록 오류: {str(e)}")
    
    def get_asset_history(self, user_id: str, limit: int = 30) -> List[Dict[str, Any]]:
        """사용자의 자산 변화 이력을 조회합니다."""
        try:
            history_df = pd.read_csv(self.asset_history_file, encoding='utf-8-sig')
            user_history = history_df[history_df['user_id'] == user_id]
            user_history = user_history.sort_values('recorded_at', ascending=False).head(limit)
            
            return user_history.to_dict('records')
            
        except Exception as e:
            logger.error(f"자산 이력 조회 오류: {str(e)}")
            return []
    
    # ==================== 포트폴리오 관리 ====================
    
    def get_portfolio(self, user_id: str) -> List[Dict[str, Any]]:
        """사용자의 포트폴리오를 조회합니다."""
        try:
            portfolios_df = pd.read_csv(self.portfolios_file, encoding='utf-8-sig')
            user_portfolio = portfolios_df[portfolios_df['user_id'] == user_id]
            
            return user_portfolio.to_dict('records')
            
        except Exception as e:
            logger.error(f"포트폴리오 조회 오류: {str(e)}")
            return []
    
    def add_to_portfolio(self, user_id: str, ticker: str, company_name: str, 
                        quantity: int, price: float, sector: str = "") -> bool:
        """포트폴리오에 종목을 추가합니다."""
        try:
            portfolios_df = pd.read_csv(self.portfolios_file, encoding='utf-8-sig')
            
            # 기존 보유 종목 확인
            existing = portfolios_df[
                (portfolios_df['user_id'] == user_id) &
                (portfolios_df['ticker'] == ticker)
            ]
            
            if not existing.empty:
                # 기존 보유 종목 업데이트 (평균 매수가 계산)
                idx = existing.index[0]
                old_qty = portfolios_df.loc[idx, 'quantity']
                old_avg = portfolios_df.loc[idx, 'avg_price']
                
                new_qty = old_qty + quantity
                new_avg = (old_qty * old_avg + quantity * price) / new_qty
                
                portfolios_df.loc[idx, 'quantity'] = new_qty
                portfolios_df.loc[idx, 'avg_price'] = new_avg
                portfolios_df.loc[idx, 'updated_at'] = datetime.now().isoformat()
            else:
                # 새 종목 추가
                new_portfolio = {
                    'portfolio_id': str(uuid.uuid4()),
                    'user_id': user_id,
                    'ticker': ticker,
                    'company_name': company_name,
                    'quantity': quantity,
                    'avg_price': price,
                    'current_price': price,
                    'sector': sector,
                    'purchase_date': datetime.now().isoformat(),
                    'updated_at': datetime.now().isoformat()
                }
                portfolios_df = pd.concat([portfolios_df, pd.DataFrame([new_portfolio])], ignore_index=True)
            
            portfolios_df.to_csv(self.portfolios_file, index=False, encoding='utf-8-sig')
            logger.info(f"포트폴리오 업데이트: {user_id} - {ticker}")
            return True
            
        except Exception as e:
            logger.error(f"포트폴리오 추가 오류: {str(e)}")
            return False
    
    def remove_from_portfolio(self, user_id: str, ticker: str, quantity: int) -> bool:
        """포트폴리오에서 종목을 제거합니다."""
        try:
            portfolios_df = pd.read_csv(self.portfolios_file, encoding='utf-8-sig')
            
            existing = portfolios_df[
                (portfolios_df['user_id'] == user_id) &
                (portfolios_df['ticker'] == ticker)
            ]
            
            if existing.empty:
                return False
            
            idx = existing.index[0]
            current_qty = portfolios_df.loc[idx, 'quantity']
            
            if quantity >= current_qty:
                # 전량 매도 - 삭제
                portfolios_df = portfolios_df.drop(idx)
            else:
                # 일부 매도 - 수량 감소
                portfolios_df.loc[idx, 'quantity'] = current_qty - quantity
                portfolios_df.loc[idx, 'updated_at'] = datetime.now().isoformat()
            
            portfolios_df.to_csv(self.portfolios_file, index=False, encoding='utf-8-sig')
            logger.info(f"포트폴리오 업데이트: {user_id} - {ticker} 매도")
            return True
            
        except Exception as e:
            logger.error(f"포트폴리오 제거 오류: {str(e)}")
            return False
    
    # ==================== 거래 내역 ====================
    
    def add_transaction(self, user_id: str, transaction_type: str, 
                       ticker: str = "", quantity: int = 0, 
                       price: float = 0, amount: float = 0, note: str = "") -> bool:
        """거래 내역을 추가합니다."""
        try:
            transactions_df = pd.read_csv(self.transactions_file, encoding='utf-8-sig')
            
            new_transaction = {
                'transaction_id': str(uuid.uuid4()),
                'user_id': user_id,
                'transaction_type': transaction_type,
                'ticker': ticker,
                'quantity': quantity,
                'price': price,
                'amount': amount,
                'transaction_date': datetime.now().isoformat(),
                'note': note
            }
            
            transactions_df = pd.concat([transactions_df, pd.DataFrame([new_transaction])], ignore_index=True)
            transactions_df.to_csv(self.transactions_file, index=False, encoding='utf-8-sig')
            
            logger.info(f"거래 내역 추가: {user_id} - {transaction_type}")
            return True
            
        except Exception as e:
            logger.error(f"거래 내역 추가 오류: {str(e)}")
            return False
    
    def get_transactions(self, user_id: str, limit: int = 50) -> List[Dict[str, Any]]:
        """사용자의 거래 내역을 조회합니다."""
        try:
            transactions_df = pd.read_csv(self.transactions_file, encoding='utf-8-sig')
            user_transactions = transactions_df[transactions_df['user_id'] == user_id]
            user_transactions = user_transactions.sort_values('transaction_date', ascending=False).head(limit)
            
            return user_transactions.to_dict('records')
            
        except Exception as e:
            logger.error(f"거래 내역 조회 오류: {str(e)}")
            return []
    
    # ==================== 알파 관리 ====================
    
    def save_user_alpha(self, user_id: str, alpha_name: str, alpha_expression: str, 
                       performance: Dict[str, Any]) -> bool:
        """사용자 알파를 저장합니다."""
        try:
            alphas_df = pd.read_csv(self.user_alphas_file, encoding='utf-8-sig')
            
            import json
            new_alpha = {
                'alpha_id': str(uuid.uuid4()),
                'user_id': user_id,
                'alpha_name': alpha_name,
                'alpha_expression': alpha_expression,
                'performance': json.dumps(performance),
                'created_at': datetime.now().isoformat(),
                'is_active': True
            }
            
            alphas_df = pd.concat([alphas_df, pd.DataFrame([new_alpha])], ignore_index=True)
            alphas_df.to_csv(self.user_alphas_file, index=False, encoding='utf-8-sig')
            
            logger.info(f"알파 저장: {user_id} - {alpha_name}")
            return True
            
        except Exception as e:
            logger.error(f"알파 저장 오류: {str(e)}")
            return False
    
    def get_user_alphas(self, user_id: str) -> List[Dict[str, Any]]:
        """사용자의 알파 목록을 조회합니다."""
        try:
            alphas_df = pd.read_csv(self.user_alphas_file, encoding='utf-8-sig')
            user_alphas = alphas_df[
                (alphas_df['user_id'] == user_id) &
                (alphas_df['is_active'] == True)
            ]
            
            import json
            result = []
            for _, alpha in user_alphas.iterrows():
                alpha_dict = alpha.to_dict()
                alpha_dict['performance'] = json.loads(alpha_dict['performance'])
                result.append(alpha_dict)
            
            return result
            
        except Exception as e:
            logger.error(f"알파 목록 조회 오류: {str(e)}")
            return []
    
    def delete_user_alpha(self, user_id: str, alpha_id: str) -> bool:
        """사용자 알파를 삭제합니다."""
        try:
            alphas_df = pd.read_csv(self.user_alphas_file, encoding='utf-8-sig')
            
            alphas_df.loc[
                (alphas_df['user_id'] == user_id) &
                (alphas_df['alpha_id'] == alpha_id),
                'is_active'
            ] = False
            
            alphas_df.to_csv(self.user_alphas_file, index=False, encoding='utf-8-sig')
            logger.info(f"알파 삭제: {user_id} - {alpha_id}")
            return True
            
        except Exception as e:
            logger.error(f"알파 삭제 오류: {str(e)}")
            return False

