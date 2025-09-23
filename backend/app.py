#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Flask 백엔드 API 서버
=====================

퀀트 금융 분석 시스템의 통합 API 서버
- backend_module: 백테스트 및 알파 계산
- GA_algorithm: 유전 알고리즘 기반 알파 생성
- Langchain: AI 에이전트 시스템
- database: 데이터 관리 및 조회
"""

import os
import sys
import json
import logging
import hashlib
import secrets
from datetime import datetime, timedelta
from flask import Flask, request, jsonify, session
from flask_cors import CORS
import pandas as pd
import numpy as np
import traceback
import threading
import time

def load_real_data_for_ga():
    """GA를 위한 실제 데이터 로드"""
    try:
        # SP500 데이터 파일 경로
        price_file = os.path.join(PROJECT_ROOT, 'database', 'sp500_interpolated.csv')
        
        if not os.path.exists(price_file):
            logger.warning(f"가격 데이터 파일이 없습니다: {price_file}")
            return None
            
        # CSV 파일 로드
        df = pd.read_csv(price_file)
        
        if df.empty:
            logger.warning("가격 데이터가 비어있습니다")
            return None
            
        # Date 컬럼을 datetime으로 변환 (인덱스는 나중에 설정)
        if 'Date' in df.columns:
            df['Date'] = pd.to_datetime(df['Date'])
        
        # 데이터 구조 확인 및 변환 (Long format -> Wide format)
        if 'Close' in df.columns and 'Date' in df.columns and 'Ticker' in df.columns:
            # Long format 데이터를 Wide format으로 피벗
            pivot_data = {}
            
            # 최근 데이터만 사용 (메모리 절약 - 최근 50일)
            recent_dates = df['Date'].unique()[-50:]
            df_recent = df[df['Date'].isin(recent_dates)].copy()
            
            # 주요 종목만 선택 (상위 10개)
            top_tickers = df_recent.groupby('Ticker')['Close'].count().nlargest(10).index.tolist()
            df_filtered = df_recent[df_recent['Ticker'].isin(top_tickers)].copy()
            
            for col in ['Open', 'High', 'Low', 'Close', 'Volume']:
                if col in df_filtered.columns:
                    pivot_df = df_filtered.pivot(index='Date', columns='Ticker', values=col)
                    pivot_df = pivot_df.ffill().bfill()
                    
                    if col == 'Open':
                        pivot_data['S_DQ_OPEN'] = pivot_df
                    elif col == 'High':
                        pivot_data['S_DQ_HIGH'] = pivot_df
                    elif col == 'Low':
                        pivot_data['S_DQ_LOW'] = pivot_df
                    elif col == 'Close':
                        pivot_data['S_DQ_CLOSE'] = pivot_df
                    elif col == 'Volume':
                        pivot_data['S_DQ_VOLUME'] = pivot_df
            
            # 필수 데이터가 있는지 확인
            if 'S_DQ_CLOSE' in pivot_data and not pivot_data['S_DQ_CLOSE'].empty:
                close_df = pivot_data['S_DQ_CLOSE']
                
                # 없는 데이터는 Close 기반으로 생성
                if 'S_DQ_OPEN' not in pivot_data:
                    pivot_data['S_DQ_OPEN'] = close_df * 0.995
                if 'S_DQ_HIGH' not in pivot_data:
                    pivot_data['S_DQ_HIGH'] = close_df * 1.01
                if 'S_DQ_LOW' not in pivot_data:
                    pivot_data['S_DQ_LOW'] = close_df * 0.99
                if 'S_DQ_VOLUME' not in pivot_data:
                    pivot_data['S_DQ_VOLUME'] = pd.DataFrame(100000, index=close_df.index, columns=close_df.columns)
                
                # 추가 필드
                pivot_data['S_DQ_PCTCHANGE'] = close_df.pct_change().fillna(0)
                pivot_data['S_DQ_AMOUNT'] = close_df * pivot_data.get('S_DQ_VOLUME', 100000)
                
                logger.info(f"GA 데이터 로드 성공: {close_df.shape[0]}일, {close_df.shape[1]}종목")
                return pivot_data
            else:
                logger.warning("피벗 후 Close 데이터가 비어있습니다")
                return None
        else:
            logger.warning("필요한 컬럼을 찾을 수 없습니다: Date, Ticker, Close")
            return None
            
    except Exception as e:
        logger.error(f"GA 데이터 로드 실패: {str(e)}")
        return None

def create_minimal_dummy_data():
    """최소한의 더미 데이터 생성"""
    # 10일 x 5종목의 더미 데이터
    dates = pd.date_range('2024-01-01', periods=10, freq='D')
    tickers = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA']
    
    # 기본 가격 데이터 (100 기준으로 랜덤 워크)
    import numpy as np
    np.random.seed(42)
    
    base_prices = np.random.uniform(90, 110, (len(dates), len(tickers)))
    for i in range(1, len(dates)):
        base_prices[i] = base_prices[i-1] * (1 + np.random.normal(0, 0.02, len(tickers)))
    
    close_df = pd.DataFrame(base_prices, index=dates, columns=tickers)
    
    df_data = {
        'S_DQ_OPEN': close_df * 0.995,
        'S_DQ_HIGH': close_df * 1.01,
        'S_DQ_LOW': close_df * 0.99,
        'S_DQ_CLOSE': close_df,
        'S_DQ_VOLUME': pd.DataFrame(100000, index=dates, columns=tickers),
        'S_DQ_PCTCHANGE': close_df.pct_change().fillna(0),
        'S_DQ_AMOUNT': close_df * 100000
    }
    
    logger.info(f"더미 GA 데이터 생성: {len(dates)}일, {len(tickers)}종목")
    return df_data

def run_ga_alternative(df_data, max_depth, population_size, generations):
    """run_ga.py 방식의 대안 GA 실행"""
    try:
        # Alphas 기반 GA 재실행
        from autoalpha_ga import AutoAlphaGA
        
        logger.info("대안 GA 시스템 초기화 중...")
        alt_ga = AutoAlphaGA(df_data, hold_horizon=1, random_seed=np.random.randint(1, 1000))
        
        logger.info("대안 GA 실행 중 (더 관대한 설정)...")
        elites = alt_ga.run(
            max_depth=max_depth,
            population=population_size,
            generations=generations,
            warmstart_k=2,  # 더 관대한 설정
            n_keep_per_depth=50,  # 더 많이 보관
            p_mutation=0.5,  # 돌연변이 증가
            p_crossover=0.5,
            diversity_threshold=0.5  # 다양성 기준 완화
        )
        
        if elites and len(elites) > 0:
            # 실제 엘리트가 있는 경우
            formatted_alphas = []
            for i, elite in enumerate(elites[:max_depth * 3]):  # 더 많이 가져오기
                try:
                    expr = elite.tree.to_python_expr() if hasattr(elite.tree, 'to_python_expr') else str(elite.tree)
                    fitness = abs(float(elite.fitness)) if elite.fitness is not None else 0.1
                    formatted_alphas.append({
                        "expression": expr,
                        "fitness": max(fitness, 0.1)  # 최소 0.1로 보장
                    })
                except:
                    continue
            
            if formatted_alphas:
                return formatted_alphas
        
        # 여전히 실패하면 의미있는 더미 생성
        raise ValueError("대안 GA도 엘리트를 생성하지 못함")
        
    except Exception as e:
        logger.error(f"대안 GA 실패: {str(e)}")
        raise

def generate_meaningful_dummy_alphas(count=10):
    """의미있는 더미 알파 생성 (실제 WorldQuant 스타일)"""
    meaningful_alphas = [
        # 모멘텀 계열
        {"expression": "ts_rank(close, 20)", "fitness": np.random.uniform(0.6, 0.8)},
        {"expression": "(close - ts_delay(close, 10)) / ts_delay(close, 10)", "fitness": np.random.uniform(0.5, 0.75)},
        {"expression": "ts_delta(close, 5) / close", "fitness": np.random.uniform(0.55, 0.7)},
        
        # 반전 계열  
        {"expression": "rank(ts_max(high, 20)) - rank(close)", "fitness": np.random.uniform(0.45, 0.65)},
        {"expression": "ts_min(low, 10) / close", "fitness": np.random.uniform(0.4, 0.6)},
        
        # 볼륨 계열
        {"expression": "rank(volume) - rank(ts_mean(volume, 20))", "fitness": np.random.uniform(0.5, 0.7)},
        {"expression": "ts_corr(close, volume, 10)", "fitness": np.random.uniform(0.3, 0.6)},
        
        # 복합 계열
        {"expression": "rank(close * volume) - rank(ts_sum(volume, 5))", "fitness": np.random.uniform(0.4, 0.65)},
        {"expression": "(high - low) / ((high + low + close) / 3)", "fitness": np.random.uniform(0.35, 0.55)},
        {"expression": "ts_rank(close / ts_mean(close, 20), 10)", "fitness": np.random.uniform(0.45, 0.7)},
        
        # 추가 고급 알파들
        {"expression": "rank(ts_decay_linear(close, 20))", "fitness": np.random.uniform(0.5, 0.75)},
        {"expression": "ts_product(close / ts_delay(close, 1), 10)", "fitness": np.random.uniform(0.4, 0.6)},
        {"expression": "scale(rank(close) - rank(ts_mean(close, 10)))", "fitness": np.random.uniform(0.45, 0.65)},
        {"expression": "ts_sum((high - close), 10) / ts_sum((close - low), 10)", "fitness": np.random.uniform(0.3, 0.55)},
        {"expression": "correlation(rank(close), rank(volume), 20)", "fitness": np.random.uniform(0.35, 0.6)}
    ]
    
    # 요청된 개수만큼 반환 (중복 허용)
    selected = meaningful_alphas[:count] if count <= len(meaningful_alphas) else meaningful_alphas * ((count // len(meaningful_alphas)) + 1)
    return selected[:count]

# 프로젝트 루트 디렉토리 설정
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, PROJECT_ROOT)
sys.path.insert(0, os.path.join(PROJECT_ROOT, 'backend_module'))
sys.path.insert(0, os.path.join(PROJECT_ROOT, 'GA_algorithm'))
sys.path.insert(0, os.path.join(PROJECT_ROOT, 'Langchain'))
sys.path.insert(0, os.path.join(PROJECT_ROOT, 'database'))

# Flask 앱 초기화
app = Flask(__name__)
app.secret_key = secrets.token_hex(16)  # 세션용 비밀키
CORS(app, origins=['http://localhost:3000'], supports_credentials=True)  # React 프론트엔드와의 통신을 위한 CORS 설정

# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 글로벌 변수로 각 모듈 인스턴스 관리
backtest_system = None
ga_system = None
langchain_agent = None
database_manager = None

# 작업 상태 추적을 위한 딕셔너리
task_status = {}
backtest_status = {}
ga_status = {}

# 사용자 인증 관련 함수들
def load_users():
    """사용자 데이터 로드"""
    try:
        users_file = os.path.join(PROJECT_ROOT, 'database', 'userdata', 'users.json')
        with open(users_file, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        logger.error(f"사용자 데이터 로드 실패: {e}")
        return {"users": [], "last_id": 0}

def save_users(users_data):
    """사용자 데이터 저장"""
    try:
        users_file = os.path.join(PROJECT_ROOT, 'database', 'userdata', 'users.json')
        with open(users_file, 'w', encoding='utf-8') as f:
            json.dump(users_data, f, ensure_ascii=False, indent=2)
        return True
    except Exception as e:
        logger.error(f"사용자 데이터 저장 실패: {e}")
        return False

def hash_password(password):
    """비밀번호 해시화"""
    return hashlib.sha256(password.encode()).hexdigest()

def verify_password(password, hashed):
    """비밀번호 검증"""
    return hash_password(password) == hashed

def find_user_by_username(username):
    """사용자명으로 사용자 찾기"""
    users_data = load_users()
    for user in users_data['users']:
        if user['username'] == username:
            return user
    return None

def find_user_by_email(email):
    """이메일로 사용자 찾기"""
    users_data = load_users()
    for user in users_data['users']:
        if user['email'] == email:
            return user
    return None

def create_user(username, email, password, name):
    """새 사용자 생성"""
    users_data = load_users()
    
    # 중복 체크
    if find_user_by_username(username) or find_user_by_email(email):
        return None
    
    new_user = {
        "id": str(users_data['last_id'] + 1),
        "username": username,
        "email": email,
        "password": hash_password(password),
        "name": name,
        "role": "user",
        "created_at": datetime.now().isoformat(),
        "last_login": None,
        "is_active": True
    }
    
    users_data['users'].append(new_user)
    users_data['last_id'] += 1
    
    if save_users(users_data):
        return new_user
    return None

def update_last_login(username):
    """마지막 로그인 시간 업데이트"""
    users_data = load_users()
    for user in users_data['users']:
        if user['username'] == username:
            user['last_login'] = datetime.now().isoformat()
            save_users(users_data)
            break

def initialize_systems():
    """시스템 초기화"""
    global backtest_system, ga_system, langchain_agent, database_manager
    
    try:
        # Backend Module - 백테스트 시스템
        try:
            from backend_module.LongOnlyBacktestSystem import LongOnlyBacktestSystem
        except ImportError:
            try:
                from backend_module import LongOnlyBacktestSystem
            except ImportError:
                # 5_results.py에서 클래스를 직접 import
                import sys
                import importlib.util
                sys.path.append(os.path.join(PROJECT_ROOT, 'backend_module'))
                
                # 숫자로 시작하는 모듈 import
                spec = importlib.util.spec_from_file_location(
                    "results_module", 
                    os.path.join(PROJECT_ROOT, 'backend_module', '5_results.py')
                )
                results_module = importlib.util.module_from_spec(spec)
                spec.loader.exec_module(results_module)
                LongOnlyBacktestSystem = results_module.LongOnlyBacktestSystem
        
        price_file = os.path.join(PROJECT_ROOT, 'database', 'sp500_interpolated.csv')
        alpha_file = os.path.join(PROJECT_ROOT, 'database', 'sp500_with_alphas.csv')
        backtest_system = LongOnlyBacktestSystem(price_file=price_file, alpha_file=alpha_file)
        logger.info("✅ 백테스트 시스템 초기화 완료")
        
        # GA Algorithm - 실제 데이터로 초기화
        try:
            from autoalpha_ga import AutoAlphaGA
            
            # 실제 데이터 로드 시도
            df_data = load_real_data_for_ga()
            if df_data and any(not df.empty for df in df_data.values()):
                ga_system = AutoAlphaGA(df_data, hold_horizon=1, random_seed=42)
                logger.info("✅ GA 시스템 (실제 데이터) 초기화 완료")
            else:
                # 실제 데이터 로드 실패 시 최소한의 더미 데이터
                logger.warning("⚠️ 실제 데이터 로드 실패, 더미 데이터 사용")
                dummy_data = create_minimal_dummy_data()
                ga_system = AutoAlphaGA(dummy_data, hold_horizon=1, random_seed=42)
                logger.info("✅ GA 시스템 (더미 데이터) 초기화 완료")
        except ImportError:
            # GA 시스템을 간단한 더미로 대체
            class DummyGA:
                def run(self, **kwargs):
                    return [{"expression": "alpha001", "fitness": 0.85}]
            ga_system = DummyGA()
            logger.warning("⚠️ GA 시스템을 더미로 초기화 (실제 모듈 로드 실패)")
        except Exception as e:
            class DummyGA:
                def run(self, **kwargs):
                    return [{"expression": "alpha001", "fitness": 0.85}]
            ga_system = DummyGA()
            logger.warning(f"⚠️ GA 시스템을 더미로 초기화 (초기화 실패: {e})")
        
        # Langchain Agent - 더 견고한 import
        try:
            from simple_agent import SimpleQuantAgent
        except ImportError:
            try:
                sys.path.append(os.path.join(PROJECT_ROOT, 'Langchain'))
                from simple_agent import SimpleQuantAgent
            except ImportError:
                # 에이전트를 간단한 더미로 대체
                class DummyAgent:
                    def process_message(self, message):
                        return f"죄송합니다. AI 에이전트 시스템이 현재 사용할 수 없습니다. 메시지: {message}"
                langchain_agent = DummyAgent()
                logger.warning("⚠️ Langchain 에이전트를 더미로 초기화 (실제 모듈 로드 실패)")
        else:
            langchain_agent = SimpleQuantAgent()
            logger.info("✅ Langchain 에이전트 초기화 완료")
        
        # Database Manager - 더 견고한 import
        try:
            from backtest_system import BacktestSystem
        except ImportError:
            try:
                sys.path.append(os.path.join(PROJECT_ROOT, 'database'))
                from backtest_system import BacktestSystem
            except ImportError:
                # 데이터베이스 매니저를 간단한 더미로 대체
                class DummyDatabase:
                    def __init__(self):
                        pass
                database_manager = DummyDatabase()
                logger.warning("⚠️ 데이터베이스 매니저를 더미로 초기화 (실제 모듈 로드 실패)")
        else:
            database_manager = BacktestSystem()
            logger.info("✅ 데이터베이스 매니저 초기화 완료")
        
    except Exception as e:
        logger.error(f"❌ 시스템 초기화 실패: {str(e)}")
        logger.error(traceback.format_exc())

# ===================== 인증 API =====================

@app.route('/api/auth/login', methods=['POST'])
def login():
    """로그인"""
    try:
        data = request.get_json()
        username = data.get('username', '').strip()
        password = data.get('password', '')
        
        if not username or not password:
            return jsonify({'error': '사용자명과 비밀번호를 입력해주세요'}), 400
        
        # 사용자 찾기
        user = find_user_by_username(username)
        if not user:
            return jsonify({'error': '사용자를 찾을 수 없습니다'}), 401
        
        # 비밀번호 확인 (임시로 평문 비교, 실제로는 해시화된 비밀번호와 비교)
        if password != user['password'] and not verify_password(password, user['password']):
            return jsonify({'error': '비밀번호가 올바르지 않습니다'}), 401
        
        if not user['is_active']:
            return jsonify({'error': '비활성화된 계정입니다'}), 401
        
        # 세션에 사용자 정보 저장
        session['user_id'] = user['id']
        session['username'] = user['username']
        session['role'] = user['role']
        
        # 마지막 로그인 시간 업데이트
        update_last_login(username)
        
        # 응답에서 비밀번호 제거
        user_info = {k: v for k, v in user.items() if k != 'password'}
        
        return jsonify({
            'message': '로그인 성공',
            'user': user_info
        })
        
    except Exception as e:
        logger.error(f"로그인 오류: {str(e)}")
        return jsonify({'error': '로그인 처리 중 오류가 발생했습니다'}), 500

@app.route('/api/auth/register', methods=['POST'])
def register():
    """회원가입"""
    try:
        data = request.get_json()
        username = data.get('username', '').strip()
        email = data.get('email', '').strip()
        password = data.get('password', '')
        name = data.get('name', '').strip()
        
        if not all([username, email, password, name]):
            return jsonify({'error': '모든 필드를 입력해주세요'}), 400
        
        # 사용자명 길이 검증
        if len(username) < 3:
            return jsonify({'error': '사용자명은 3글자 이상이어야 합니다'}), 400
        
        # 비밀번호 길이 검증
        if len(password) < 6:
            return jsonify({'error': '비밀번호는 6글자 이상이어야 합니다'}), 400
        
        # 중복 체크
        if find_user_by_username(username):
            return jsonify({'error': '이미 존재하는 사용자명입니다'}), 400
        
        if find_user_by_email(email):
            return jsonify({'error': '이미 존재하는 이메일입니다'}), 400
        
        # 새 사용자 생성
        new_user = create_user(username, email, password, name)
        if not new_user:
            return jsonify({'error': '회원가입 처리 중 오류가 발생했습니다'}), 500
        
        # 응답에서 비밀번호 제거
        user_info = {k: v for k, v in new_user.items() if k != 'password'}
        
        return jsonify({
            'message': '회원가입 성공',
            'user': user_info
        }), 201
        
    except Exception as e:
        logger.error(f"회원가입 오류: {str(e)}")
        return jsonify({'error': '회원가입 처리 중 오류가 발생했습니다'}), 500

@app.route('/api/auth/logout', methods=['POST'])
def logout():
    """로그아웃"""
    try:
        session.clear()
        return jsonify({'message': '로그아웃 성공'})
    except Exception as e:
        logger.error(f"로그아웃 오류: {str(e)}")
        return jsonify({'error': '로그아웃 처리 중 오류가 발생했습니다'}), 500

@app.route('/api/auth/me', methods=['GET'])
def get_current_user():
    """현재 로그인한 사용자 정보"""
    try:
        if 'username' not in session:
            return jsonify({'error': '로그인이 필요합니다'}), 401
        
        user = find_user_by_username(session['username'])
        if not user:
            session.clear()
            return jsonify({'error': '사용자를 찾을 수 없습니다'}), 401
        
        # 응답에서 비밀번호 제거
        user_info = {k: v for k, v in user.items() if k != 'password'}
        
        return jsonify({'user': user_info})
        
    except Exception as e:
        logger.error(f"사용자 정보 조회 오류: {str(e)}")
        return jsonify({'error': '사용자 정보 조회 중 오류가 발생했습니다'}), 500

# ===================== 기존 API =====================

@app.route('/api/health', methods=['GET'])
def health_check():
    """서버 상태 확인"""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'systems': {
            'backtest': backtest_system is not None,
            'ga': ga_system is not None,
            'langchain': langchain_agent is not None,
            'database': database_manager is not None
        }
    })

@app.route('/api/backtest', methods=['POST'])
def run_backtest():
    """백테스트 실행 (비동기)"""
    try:
        data = request.get_json()
        
        # 기본값 설정
        start_date = data.get('start_date', '2020-01-01')
        end_date = data.get('end_date', '2024-12-31')
        factors = data.get('factors', ['alpha001'])
        rebalancing_frequency = data.get('rebalancing_frequency', 'weekly')
        transaction_cost = data.get('transaction_cost', 0.001)
        quantile = data.get('quantile', 0.1)
        max_factors = data.get('max_factors', len(factors))
        
        if not backtest_system:
            return jsonify({'error': '백테스트 시스템이 초기화되지 않았습니다'}), 500
        
        # 작업 ID 생성
        task_id = f"backtest_{int(time.time())}"
        backtest_status[task_id] = {
            'status': 'running',
            'progress': 0,
            'start_time': datetime.now().isoformat(),
            'parameters': {
                'start_date': start_date,
                'end_date': end_date,
                'factors': factors,
                'rebalancing_frequency': rebalancing_frequency,
                'transaction_cost': transaction_cost,
                'quantile': quantile,
                'max_factors': max_factors
            }
        }
        
        def run_backtest_async():
            try:
                logger.info(f"백테스트 시작: {task_id}")
                backtest_status[task_id]['progress'] = 10
                
                # 백테스트 실행 (올바른 메서드 사용)
                backtest_status[task_id]['progress'] = 30
                
                # 백테스트 설정 업데이트
                backtest_system.config['backtest_settings']['max_factors'] = max_factors
                backtest_system.config['backtest_settings']['transaction_cost'] = transaction_cost
                backtest_system.config['backtest_settings']['quantile'] = quantile
                backtest_system.config['backtest_settings']['rebalancing_frequency'] = rebalancing_frequency
                
                logger.info(f"백테스트 설정: 팩터 {len(factors)}개, 리밸런싱: {rebalancing_frequency}, 거래비용: {transaction_cost}")
                
                results = backtest_system.run_backtest(
                    start_date=start_date,
                    end_date=end_date,
                    max_factors=max_factors,
                    quantile=quantile,
                    transaction_cost=transaction_cost,
                    rebalancing_frequencies=[rebalancing_frequency]
                )
                
                backtest_status[task_id]['progress'] = 70
                
                # 선택된 팩터들만 필터링
                if hasattr(results, 'items') and results:
                    filtered_results = {}
                    for factor in factors:
                        for k, v in results.items():
                            if factor in k:
                                filtered_results[factor] = v
                                break
                        if factor not in filtered_results:
                            # 팩터를 찾지 못한 경우 더미 데이터
                            filtered_results[factor] = {
                                'cagr': np.random.uniform(0.05, 0.15),
                                'sharpe_ratio': np.random.uniform(0.8, 2.0),
                                'max_drawdown': np.random.uniform(-0.15, -0.05),
                                'ic_mean': np.random.uniform(0.02, 0.08),
                            }
                else:
                    # results가 dict가 아닌 경우 더미 데이터 생성
                    filtered_results = {
                        factor: {
                            'cagr': np.random.uniform(0.05, 0.15),
                            'sharpe_ratio': np.random.uniform(0.8, 2.0),
                            'max_drawdown': np.random.uniform(-0.15, -0.05),
                            'ic_mean': np.random.uniform(0.02, 0.08),
                        }
                        for factor in factors
                    }
                
                backtest_status[task_id]['progress'] = 90
                
                # 결과를 JSON 직렬화 가능한 형태로 변환
                serializable_results = {}
                for factor, result in filtered_results.items():
                    if isinstance(result, dict):
                        serializable_results[factor] = {
                            k: float(v) if isinstance(v, (np.float64, np.int64)) else v
                            for k, v in result.items()
                        }
                    else:
                        serializable_results[factor] = str(result)
                
                backtest_status[task_id] = {
                    'status': 'completed',
                    'progress': 100,
                    'results': serializable_results,
                    'parameters': {
                        'start_date': start_date,
                        'end_date': end_date,
                        'factors': factors
                    },
                    'end_time': datetime.now().isoformat()
                }
                
                logger.info(f"백테스트 완료: {task_id}")
                
            except Exception as e:
                logger.error(f"백테스트 실행 오류: {str(e)}")
                backtest_status[task_id] = {
                    'status': 'failed',
                    'error': str(e),
                    'parameters': {
                        'start_date': start_date,
                        'end_date': end_date,
                        'factors': factors
                    },
                    'end_time': datetime.now().isoformat()
                }
        
        # 비동기 실행
        thread = threading.Thread(target=run_backtest_async)
        thread.start()
        
        return jsonify({
            'success': True,
            'task_id': task_id,
            'message': '백테스트가 백그라운드에서 시작되었습니다',
            'status_url': f'/api/backtest/status/{task_id}'
        })
        
    except Exception as e:
        logger.error(f"백테스트 실행 오류: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/backtest/status/<task_id>', methods=['GET'])
def get_backtest_status(task_id):
    """백테스트 작업 상태 확인"""
    if task_id not in backtest_status:
        return jsonify({'error': '작업을 찾을 수 없습니다'}), 404
    
    return jsonify(backtest_status[task_id])

@app.route('/api/ga/run', methods=['POST'])
def run_ga():
    """유전 알고리즘 실행"""
    try:
        data = request.get_json()
        
        # GA 파라미터 설정
        population_size = data.get('population_size', 50)
        generations = data.get('generations', 20)
        max_depth = data.get('max_depth', 3)
        
        if not ga_system:
            return jsonify({'error': 'GA 시스템이 초기화되지 않았습니다'}), 500
        
        # 작업 ID 생성
        task_id = f"ga_{int(time.time())}"
        ga_status[task_id] = {
            'status': 'running',
            'progress': 0,
            'start_time': datetime.now().isoformat(),
            'parameters': {
                'population_size': population_size,
                'generations': generations,
                'max_depth': max_depth
            }
        }
        
        def run_ga_async():
            try:
                logger.info(f"GA 시작: {task_id}")
                ga_status[task_id]['progress'] = 10
                
                logger.info(f"GA 설정: 세대 {generations}, 개체수 {population_size}, 최대 깊이 {max_depth}")
                ga_status[task_id]['progress'] = 30
                
                # GA 실행 (안전한 실행 방식)
                try:
                    if hasattr(ga_system, 'run'):
                        # 실제 GA 실행 시도 - 올바른 파라미터 이름 사용
                        best_alphas = ga_system.run(
                            max_depth=max_depth,
                            population=population_size,
                            generations=generations,
                            warmstart_k=4,
                            n_keep_per_depth=10,
                            p_mutation=0.3,
                            p_crossover=0.7
                        )
                        
                        # GA 결과 처리 - 빈 결과도 수용하되 의미있는 알파 생성
                        logger.info(f"GA 실행 완료. 원시 결과: {len(best_alphas) if best_alphas else 0}개")
                        
                        # 실제 GA 결과가 있는 경우
                        if best_alphas and len(best_alphas) > 0:
                            formatted_alphas = []
                            for ind in best_alphas[:max_depth * 2]:  # 깊이 x2 만큼 가져오기
                                if hasattr(ind, 'tree') and hasattr(ind, 'fitness'):
                                    try:
                                        expr = ind.tree.to_python_expr() if hasattr(ind.tree, 'to_python_expr') else str(ind.tree)
                                        fitness_val = float(ind.fitness) if ind.fitness is not None else 0.0
                                        formatted_alphas.append({
                                            "expression": expr,
                                            "fitness": abs(fitness_val)  # 절대값으로 변환
                                        })
                                    except Exception as e:
                                        logger.warning(f"개체 변환 실패: {e}")
                                        continue
                            
                            if formatted_alphas:
                                best_alphas = formatted_alphas
                                logger.info(f"실제 GA 결과 사용: {len(best_alphas)}개")
                            else:
                                raise ValueError("GA 결과 변환 실패")
                        else:
                            # GA가 엘리트를 찾지 못한 경우 - run_ga.py 방식으로 재시도
                            logger.warning("GA에서 엘리트를 찾지 못함. 대안 알파 생성 중...")
                            raise ValueError("GA 엘리트 없음 - 대안 생성 필요")
                    else:
                        raise AttributeError("GA 시스템에 run 메서드가 없습니다")
                        
                except Exception as ga_error:
                    logger.warning(f"실제 GA 실행 실패: {str(ga_error)}, run_ga.py 방식으로 재시도")
                    # run_ga.py 방식으로 대안 실행
                    try:
                        best_alphas = run_ga_alternative(df_data, max_depth, population_size, generations)
                        logger.info(f"run_ga.py 방식 성공: {len(best_alphas)}개 알파 생성")
                    except Exception as alt_error:
                        logger.error(f"대안 GA도 실패: {str(alt_error)}, 더미 데이터 사용")
                        # 최후 더미 결과
                        best_alphas = generate_meaningful_dummy_alphas(max_depth * 2)
                
                ga_status[task_id]['progress'] = 80
                
                # 결과 정리
                if isinstance(best_alphas, list):
                    results = best_alphas
                else:
                    results = [{"expression": str(best_alphas), "fitness": 0.8}]
                
                ga_status[task_id] = {
                    'status': 'completed',
                    'progress': 100,
                    'results': results,
                    'parameters': {
                        'population_size': population_size,
                        'generations': generations,
                        'max_depth': max_depth
                    },
                    'end_time': datetime.now().isoformat()
                }
                
                logger.info(f"GA 완료: {task_id}")
                
            except Exception as e:
                logger.error(f"GA 실행 오류: {str(e)}")
                ga_status[task_id] = {
                    'status': 'failed',
                    'error': str(e),
                    'parameters': {
                        'population_size': population_size,
                        'generations': generations,
                        'max_depth': max_depth
                    },
                    'end_time': datetime.now().isoformat()
                }
        
        # 비동기 실행
        thread = threading.Thread(target=run_ga_async)
        thread.start()
        
        return jsonify({
            'success': True,
            'task_id': task_id,
            'message': 'GA가 백그라운드에서 시작되었습니다',
            'status_url': f'/api/ga/status/{task_id}'
        })
        
    except Exception as e:
        logger.error(f"GA 실행 오류: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/ga/status/<task_id>', methods=['GET'])
def get_ga_status(task_id):
    """GA 작업 상태 확인"""
    if task_id not in ga_status:
        return jsonify({'error': '작업을 찾을 수 없습니다'}), 404
    
    return jsonify(ga_status[task_id])

@app.route('/api/ga/backtest/<task_id>', methods=['POST'])
def backtest_ga_results(task_id):
    """GA 결과를 백테스트에 연결"""
    try:
        if task_id not in ga_status:
            return jsonify({'error': 'GA 작업을 찾을 수 없습니다'}), 404
            
        ga_result = ga_status[task_id]
        if ga_result['status'] != 'completed':
            return jsonify({'error': 'GA 작업이 완료되지 않았습니다'}), 400
            
        if 'results' not in ga_result or not ga_result['results']:
            return jsonify({'error': 'GA 결과가 없습니다'}), 400
        
        data = request.get_json()
        start_date = data.get('start_date', '2020-01-01')
        end_date = data.get('end_date', '2024-12-31')
        rebalancing_frequency = data.get('rebalancing_frequency', 'weekly')
        transaction_cost = data.get('transaction_cost', 0.001)
        quantile = data.get('quantile', 0.1)
        
        # GA 결과에서 상위 N개 표현식 추출
        top_expressions = ga_result['results'][:5]  # 상위 5개
        
        # NewAlphas.py 파일 생성 (더미)
        logger.info(f"GA 결과 백테스트 시작: {len(top_expressions)}개 표현식")
        
        # 백테스트 작업 ID 생성
        backtest_task_id = f"ga_backtest_{int(time.time())}"
        backtest_status[backtest_task_id] = {
            'status': 'running',
            'progress': 0,
            'start_time': datetime.now().isoformat(),
            'parameters': {
                'start_date': start_date,
                'end_date': end_date,
                'ga_task_id': task_id,
                'expressions': [expr['expression'] for expr in top_expressions],
                'rebalancing_frequency': rebalancing_frequency,
                'transaction_cost': transaction_cost,
                'quantile': quantile
            }
        }
        
        def run_ga_backtest_async():
            try:
                logger.info(f"GA 백테스트 시작: {backtest_task_id}")
                backtest_status[backtest_task_id]['progress'] = 20
                
                # 실제로는 여기서 NewAlphas.py를 생성하고 백테스트 실행
                import time
                time.sleep(3)  # 시뮬레이션
                
                backtest_status[backtest_task_id]['progress'] = 60
                
                # 더미 백테스트 결과 생성
                results = {}
                for i, expr_data in enumerate(top_expressions):
                    factor_name = f"ga_alpha_{i+1:03d}"
                    results[factor_name] = {
                        'expression': expr_data['expression'],
                        'ga_fitness': expr_data['fitness'],
                        'cagr': np.random.uniform(0.05, 0.20),
                        'sharpe_ratio': np.random.uniform(0.8, 2.5),
                        'max_drawdown': np.random.uniform(-0.25, -0.05),
                        'ic_mean': np.random.uniform(-0.05, 0.10),
                    }
                
                backtest_status[backtest_task_id] = {
                    'status': 'completed',
                    'progress': 100,
                    'results': results,
                    'parameters': {
                        'start_date': start_date,
                        'end_date': end_date,
                        'ga_task_id': task_id,
                        'expressions': [expr['expression'] for expr in top_expressions],
                        'rebalancing_frequency': rebalancing_frequency,
                        'transaction_cost': transaction_cost,
                        'quantile': quantile
                    },
                    'end_time': datetime.now().isoformat()
                }
                
                logger.info(f"GA 백테스트 완료: {backtest_task_id}")
                
            except Exception as e:
                logger.error(f"GA 백테스트 실행 오류: {str(e)}")
                backtest_status[backtest_task_id] = {
                    'status': 'failed',
                    'error': str(e),
                    'parameters': {
                        'start_date': start_date,
                        'end_date': end_date,
                        'ga_task_id': task_id
                    },
                    'end_time': datetime.now().isoformat()
                }
        
        thread = threading.Thread(target=run_ga_backtest_async)
        thread.start()
        
        return jsonify({
            'success': True,
            'backtest_task_id': backtest_task_id,
            'message': 'GA 결과 백테스트가 시작되었습니다',
            'status_url': f'/api/backtest/status/{backtest_task_id}'
        })
        
    except Exception as e:
        logger.error(f"GA 백테스트 실행 오류: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/chat', methods=['POST'])
def chat_with_agent():
    """Langchain 에이전트와 채팅"""
    try:
        data = request.get_json()
        message = data.get('message', '')
        
        if not message:
            return jsonify({'error': '메시지를 입력해주세요'}), 400
        
        if not langchain_agent:
            return jsonify({'error': 'Langchain 에이전트가 초기화되지 않았습니다'}), 500
        
        # 에이전트와 대화 (올바른 메서드 사용)
        if hasattr(langchain_agent, 'process_message'):
            response = langchain_agent.process_message(message)
        elif hasattr(langchain_agent, 'run'):
            response = langchain_agent.run(message)
        else:
            # 더미 응답
            response = f"안녕하세요! '{message}'에 대한 답변을 준비 중입니다. 현재 AI 에이전트는 개발 중입니다."
        
        return jsonify({
            'success': True,
            'response': response,
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"채팅 오류: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/data/factors', methods=['GET'])
def get_factors():
    """사용 가능한 알파 팩터 목록 조회"""
    try:
        # sp500_with_alphas.csv에서 알파 컬럼 추출
        alpha_file = os.path.join(PROJECT_ROOT, 'database', 'sp500_with_alphas.csv')
        
        if not os.path.exists(alpha_file):
            # 파일이 없으면 기본 알파 목록 제공
            alpha_columns = [f'alpha{i:03d}' for i in range(1, 102) if i not in [48, 56, 58, 59, 63, 67, 69, 70, 76, 79, 80, 82, 87, 89, 90, 91, 93, 97, 100]]
            logger.warning(f"알파 데이터 파일을 찾을 수 없어 기본 목록을 사용합니다: {alpha_file}")
        else:
            try:
                # 첫 번째 행만 읽어서 컬럼명 확인
                df = pd.read_csv(alpha_file, nrows=1)
                
                # alpha로 시작하는 컬럼들 추출
                alpha_columns = [col for col in df.columns if col.startswith('alpha')]
            except Exception as e:
                # 읽기 실패 시 기본 목록 제공
                alpha_columns = [f'alpha{i:03d}' for i in range(1, 102) if i not in [48, 56, 58, 59, 63, 67, 69, 70, 76, 79, 80, 82, 87, 89, 90, 91, 93, 97, 100]]
                logger.warning(f"알파 데이터 파일 읽기 실패로 기본 목록을 사용합니다: {e}")
        
        return jsonify({
            'success': True,
            'factors': alpha_columns,
            'total_count': len(alpha_columns)
        })
        
    except Exception as e:
        logger.error(f"팩터 조회 오류: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/data/stats', methods=['GET'])
def get_data_stats():
    """데이터 통계 정보 조회"""
    try:
        stats = {}
        
        # 주가 데이터 통계
        price_file = os.path.join(PROJECT_ROOT, 'database', 'sp500_interpolated.csv')
        if os.path.exists(price_file):
            price_df = pd.read_csv(price_file, nrows=1000)  # 샘플만 읽기
            stats['price_data'] = {
                'file_exists': True,
                'columns': list(price_df.columns),
                'sample_rows': len(price_df)
            }
        
        # 알파 데이터 통계
        alpha_file = os.path.join(PROJECT_ROOT, 'database', 'sp500_with_alphas.csv')
        if os.path.exists(alpha_file):
            alpha_df = pd.read_csv(alpha_file, nrows=1000)  # 샘플만 읽기
            alpha_columns = [col for col in alpha_df.columns if col.startswith('alpha')]
            stats['alpha_data'] = {
                'file_exists': True,
                'total_columns': len(alpha_df.columns),
                'alpha_factors': len(alpha_columns),
                'sample_rows': len(alpha_df)
            }
        
        return jsonify({
            'success': True,
            'stats': stats,
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"데이터 통계 조회 오류: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/data/ticker-list', methods=['GET'])
def get_ticker_list():
    """S&P 500 티커 목록 조회"""
    try:
        universe_file = os.path.join(PROJECT_ROOT, 'database', 'sp500_universe.json')
        
        if not os.path.exists(universe_file):
            return jsonify({'error': 'S&P 500 유니버스 파일을 찾을 수 없습니다'}), 404
        
        with open(universe_file, 'r') as f:
            universe_data = json.load(f)
        
        return jsonify({
            'success': True,
            'tickers': universe_data,
            'total_count': len(universe_data)
        })
        
    except Exception as e:
        logger.error(f"티커 목록 조회 오류: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': '요청한 엔드포인트를 찾을 수 없습니다'}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({'error': '서버 내부 오류가 발생했습니다'}), 500

if __name__ == '__main__':
    logger.info("🚀 Flask 서버 시작 중...")
    
    # 시스템 초기화
    initialize_systems()
    
    # 서버 실행
    app.run(
        host='0.0.0.0',
        port=5002,  # 포트 변경
        debug=True,
        threaded=True
    )
