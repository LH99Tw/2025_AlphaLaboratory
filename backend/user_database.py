"""
사용자 데이터베이스 관리 모듈
사용자 계정 정보, 투자 데이터, 설정 등을 관리하는 모듈
"""

import json
import os
import hashlib
import uuid
from datetime import datetime
from typing import Dict, Any, Optional, List
import logging

logger = logging.getLogger(__name__)

class UserDatabase:
    """사용자 데이터베이스 관리 클래스"""
    
    def __init__(self, data_dir: str = "database/userdata"):
        self.data_dir = data_dir
        self.users_file = os.path.join(data_dir, "users.json")
        self.user_investments_file = os.path.join(data_dir, "user_investments.json")
        self.user_settings_file = os.path.join(data_dir, "user_settings.json")
        
        # 디렉토리 생성
        os.makedirs(data_dir, exist_ok=True)
        
        # 초기 데이터 파일 생성
        self._initialize_files()
    
    def _initialize_files(self):
        """초기 데이터 파일들을 생성합니다."""
        if not os.path.exists(self.users_file):
            self._save_json(self.users_file, {})
        
        if not os.path.exists(self.user_investments_file):
            self._save_json(self.user_investments_file, {})
        
        if not os.path.exists(self.user_settings_file):
            self._save_json(self.user_settings_file, {})
    
    def _load_json(self, file_path: str) -> Dict[str, Any]:
        """JSON 파일을 로드합니다."""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except (FileNotFoundError, json.JSONDecodeError) as e:
            logger.warning(f"JSON 파일 로드 실패: {file_path}, {e}")
            return {}
    
    def _save_json(self, file_path: str, data: Dict[str, Any]):
        """JSON 파일을 저장합니다."""
        try:
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
        except Exception as e:
            logger.error(f"JSON 파일 저장 실패: {file_path}, {e}")
            raise
    
    def _hash_password(self, password: str) -> str:
        """비밀번호를 해시화합니다."""
        return hashlib.sha256(password.encode()).hexdigest()
    
    def create_user(self, username: str, email: str, password: str, name: str = "") -> str:
        """새 사용자를 생성합니다."""
        users = self._load_json(self.users_file)
        
        # 중복 체크
        for user_id, user_data in users.items():
            if user_data.get('username') == username or user_data.get('email') == email:
                raise ValueError("이미 존재하는 사용자명 또는 이메일입니다.")
        
        # 새 사용자 ID 생성
        user_id = str(uuid.uuid4())
        
        # 사용자 데이터 생성
        user_data = {
            "user_id": user_id,
            "username": username,
            "email": email,
            "name": name or username,
            "password_hash": self._hash_password(password),
            "created_at": datetime.now().isoformat(),
            "last_login": None,
            "is_active": True
        }
        
        users[user_id] = user_data
        self._save_json(self.users_file, users)
        
        # 초기 투자 데이터 생성
        self._create_initial_investment_data(user_id)
        
        # 초기 설정 데이터 생성
        self._create_initial_settings_data(user_id)
        
        logger.info(f"새 사용자 생성: {username} ({user_id})")
        return user_id
    
    def authenticate_user(self, username: str, password: str) -> Optional[str]:
        """사용자 인증을 수행합니다."""
        users = self._load_json(self.users_file)
        password_hash = self._hash_password(password)
        
        for user_id, user_data in users.items():
            if (user_data.get('username') == username or user_data.get('email') == username) and \
               user_data.get('password_hash') == password_hash and \
               user_data.get('is_active', True):
                
                # 마지막 로그인 시간 업데이트
                user_data['last_login'] = datetime.now().isoformat()
                self._save_json(self.users_file, users)
                
                logger.info(f"사용자 인증 성공: {username} ({user_id})")
                return user_id
        
        logger.warning(f"사용자 인증 실패: {username}")
        return None
    
    def get_user_info(self, user_id: str) -> Optional[Dict[str, Any]]:
        """사용자 정보를 조회합니다."""
        users = self._load_json(self.users_file)
        user_data = users.get(user_id)
        
        if user_data:
            # 비밀번호 해시는 제외하고 반환
            return {k: v for k, v in user_data.items() if k != 'password_hash'}
        
        return None
    
    def update_user_info(self, user_id: str, **kwargs) -> bool:
        """사용자 정보를 업데이트합니다."""
        users = self._load_json(self.users_file)
        
        if user_id not in users:
            return False
        
        # 업데이트 가능한 필드들
        allowed_fields = ['name', 'email']
        
        for field, value in kwargs.items():
            if field in allowed_fields:
                users[user_id][field] = value
        
        users[user_id]['updated_at'] = datetime.now().isoformat()
        self._save_json(self.users_file, users)
        
        logger.info(f"사용자 정보 업데이트: {user_id}")
        return True
    
    def change_password(self, user_id: str, current_password: str, new_password: str) -> bool:
        """비밀번호를 변경합니다."""
        users = self._load_json(self.users_file)
        
        if user_id not in users:
            return False
        
        # 현재 비밀번호 확인
        current_hash = self._hash_password(current_password)
        if users[user_id].get('password_hash') != current_hash:
            return False
        
        # 새 비밀번호로 업데이트
        users[user_id]['password_hash'] = self._hash_password(new_password)
        users[user_id]['updated_at'] = datetime.now().isoformat()
        self._save_json(self.users_file, users)
        
        logger.info(f"비밀번호 변경: {user_id}")
        return True
    
    def _create_initial_investment_data(self, user_id: str):
        """초기 투자 데이터를 생성합니다."""
        investments = self._load_json(self.user_investments_file)
        
        investments[user_id] = {
            "user_id": user_id,
            "total_assets": 10000000,  # 1천만원
            "cash": 3000000,          # 3백만원
            "investments": 7000000,    # 7백만원
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat(),
            "asset_history": [
                {
                    "date": datetime.now().isoformat(),
                    "total_assets": 10000000,
                    "cash": 3000000,
                    "investments": 7000000
                }
            ]
        }
        
        self._save_json(self.user_investments_file, investments)
    
    def get_user_investment_data(self, user_id: str) -> Optional[Dict[str, Any]]:
        """사용자의 투자 데이터를 조회합니다."""
        investments = self._load_json(self.user_investments_file)
        return investments.get(user_id)
    
    def update_user_investment_data(self, user_id: str, **kwargs) -> bool:
        """사용자의 투자 데이터를 업데이트합니다."""
        investments = self._load_json(self.user_investments_file)
        
        if user_id not in investments:
            return False
        
        # 업데이트 가능한 필드들
        allowed_fields = ['total_assets', 'cash', 'investments']
        
        for field, value in kwargs.items():
            if field in allowed_fields:
                investments[user_id][field] = value
        
        investments[user_id]['updated_at'] = datetime.now().isoformat()
        
        # 히스토리에 추가
        if 'asset_history' not in investments[user_id]:
            investments[user_id]['asset_history'] = []
        
        investments[user_id]['asset_history'].append({
            "date": datetime.now().isoformat(),
            "total_assets": investments[user_id]['total_assets'],
            "cash": investments[user_id]['cash'],
            "investments": investments[user_id]['investments']
        })
        
        # 히스토리 최대 100개로 제한
        if len(investments[user_id]['asset_history']) > 100:
            investments[user_id]['asset_history'] = investments[user_id]['asset_history'][-100:]
        
        self._save_json(self.user_investments_file, investments)
        
        logger.info(f"투자 데이터 업데이트: {user_id}")
        return True
    
    def _create_initial_settings_data(self, user_id: str):
        """초기 설정 데이터를 생성합니다."""
        settings = self._load_json(self.user_settings_file)
        
        settings[user_id] = {
            "user_id": user_id,
            "theme": "dark",
            "language": "ko",
            "notifications": {
                "email": True,
                "push": True,
                "sms": False
            },
            "investment_preferences": {
                "risk_tolerance": "medium",
                "investment_goal": "growth",
                "time_horizon": "long_term"
            },
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat()
        }
        
        self._save_json(self.user_settings_file, settings)
    
    def get_user_settings(self, user_id: str) -> Optional[Dict[str, Any]]:
        """사용자의 설정을 조회합니다."""
        settings = self._load_json(self.user_settings_file)
        return settings.get(user_id)
    
    def update_user_settings(self, user_id: str, **kwargs) -> bool:
        """사용자의 설정을 업데이트합니다."""
        settings = self._load_json(self.user_settings_file)
        
        if user_id not in settings:
            return False
        
        # 설정 업데이트
        for key, value in kwargs.items():
            if key in ['theme', 'language', 'notifications', 'investment_preferences']:
                settings[user_id][key] = value
        
        settings[user_id]['updated_at'] = datetime.now().isoformat()
        self._save_json(self.user_settings_file, settings)
        
        logger.info(f"사용자 설정 업데이트: {user_id}")
        return True
    
    def delete_user(self, user_id: str) -> bool:
        """사용자를 삭제합니다."""
        users = self._load_json(self.users_file)
        
        if user_id not in users:
            return False
        
        # 사용자 데이터 삭제
        del users[user_id]
        self._save_json(self.users_file, users)
        
        # 투자 데이터 삭제
        investments = self._load_json(self.user_investments_file)
        if user_id in investments:
            del investments[user_id]
            self._save_json(self.user_investments_file, investments)
        
        # 설정 데이터 삭제
        settings = self._load_json(self.user_settings_file)
        if user_id in settings:
            del settings[user_id]
            self._save_json(self.user_settings_file, settings)
        
        logger.info(f"사용자 삭제: {user_id}")
        return True
    
    def get_all_users(self) -> List[Dict[str, Any]]:
        """모든 사용자 목록을 조회합니다."""
        users = self._load_json(self.users_file)
        return [
            {k: v for k, v in user_data.items() if k != 'password_hash'}
            for user_data in users.values()
        ]
    
    def get_user_statistics(self) -> Dict[str, Any]:
        """사용자 통계를 조회합니다."""
        users = self._load_json(self.users_file)
        investments = self._load_json(self.user_investments_file)
        
        total_users = len(users)
        active_users = len([u for u in users.values() if u.get('is_active', True)])
        
        total_assets = sum(
            inv.get('total_assets', 0) 
            for inv in investments.values()
        )
        
        return {
            "total_users": total_users,
            "active_users": active_users,
            "total_assets": total_assets,
            "average_assets": total_assets / total_users if total_users > 0 else 0
        }
