#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
실제 데이터로 AutoAlpha GA 테스트
- database/sp500_interpolated.csv 데이터 사용
- 소규모 샘플로 빠른 테스트
"""

import os
import sys
import pandas as pd
import numpy as np
from datetime import datetime

# 프로젝트 경로 설정
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(CURRENT_DIR)
DATABASE_DIR = os.path.join(PROJECT_ROOT, 'database')
BACKEND_MODULE_DIR = os.path.join(PROJECT_ROOT, 'backend_module')

# 경로 추가
if BACKEND_MODULE_DIR not in sys.path:
    sys.path.insert(0, BACKEND_MODULE_DIR)
if CURRENT_DIR not in sys.path:
    sys.path.insert(0, CURRENT_DIR)

def load_sample_data(n_stocks=50, n_days=500):
    """
    실제 데이터에서 소규모 샘플 추출
    - Alphas 클래스가 기대하는 형식으로 변환
    """
    print("📥 실제 데이터 로딩 중...")
    
    # CSV 파일 경로
    data_file = os.path.join(DATABASE_DIR, 'sp500_interpolated.csv')
    
    if not os.path.exists(data_file):
        print(f"❌ 데이터 파일을 찾을 수 없습니다: {data_file}")
        return None
    
    # 데이터 샘플 로드 (메모리 효율성을 위해 청크 사용)
    print(f"   파일: {data_file}")
    
    try:
        # 더 많은 데이터 로드 (여러 청크 합치기)
        chunk_iter = pd.read_csv(data_file, chunksize=50000, parse_dates=['Date'])
        chunks = []
        for i, chunk in enumerate(chunk_iter):
            chunks.append(chunk)
            if i >= 4:  # 최대 5개 청크 (약 250K 행)
                break
        
        all_data = pd.concat(chunks, ignore_index=True)
        
        print(f"   로드된 데이터: {len(all_data):,} 행")
        print(f"   전체 컬럼: {list(all_data.columns)}")
        print(f"   전체 기간: {all_data['Date'].min()} ~ {all_data['Date'].max()}")
        print(f"   전체 종목 수: {all_data['Ticker'].nunique()}")
        
        # 상위 n_stocks 종목만 선택 (데이터가 많은 종목 우선)
        top_tickers = all_data['Ticker'].value_counts().head(n_stocks).index.tolist()
        print(f"   선택된 종목: {top_tickers[:10]}...")  # 처음 10개만 출력
        
        # 필터링: 각 종목별로 최신 n_days만 선택
        sample_data_list = []
        for ticker in top_tickers:
            ticker_data = all_data[all_data['Ticker'] == ticker].sort_values('Date').tail(n_days)
            if len(ticker_data) > 0:  # 데이터가 있는 종목만
                sample_data_list.append(ticker_data)
        
        if not sample_data_list:
            print("❌ 유효한 종목 데이터가 없습니다")
            return None
            
        sample_data = pd.concat(sample_data_list, ignore_index=True).sort_values(['Date', 'Ticker'])
        
        print(f"   최종 샘플 크기: {len(sample_data)} 행")
        
        # Alphas 클래스 형식으로 변환
        df_data = {}
        
        # 피벗: (Date x Ticker) 형태로 변환
        for col_name, target_name in [
            ('Open', 'S_DQ_OPEN'),
            ('High', 'S_DQ_HIGH'), 
            ('Low', 'S_DQ_LOW'),
            ('Close', 'S_DQ_CLOSE'),
            ('Volume', 'S_DQ_VOLUME')
        ]:
            if col_name in sample_data.columns:
                try:
                    pivot_df = sample_data.pivot(index='Date', columns='Ticker', values=col_name)
                    # 결측치를 전진 채움 후 0으로 채움
                    pivot_df = pivot_df.ffill().fillna(0)
                    df_data[target_name] = pivot_df
                    print(f"   ✅ {target_name}: {pivot_df.shape}")
                except Exception as e:
                    print(f"   ❌ {target_name} 변환 실패: {e}")
                    continue
        
        # 파생 컬럼 계산
        if 'S_DQ_CLOSE' in df_data and 'S_DQ_VOLUME' in df_data:
            try:
                # 거래대금 (Amount)
                df_data['S_DQ_AMOUNT'] = df_data['S_DQ_CLOSE'] * df_data['S_DQ_VOLUME']
                df_data['S_DQ_AMOUNT'] = df_data['S_DQ_AMOUNT'].replace([np.inf, -np.inf], 0).fillna(0)
                
                # 수익률 (PctChange) - 더 안전한 계산
                close_df = df_data['S_DQ_CLOSE']
                pct_change = close_df.pct_change(fill_method=None)
                df_data['S_DQ_PCTCHANGE'] = pct_change.replace([np.inf, -np.inf], 0).fillna(0)
                
                print(f"   ✅ S_DQ_AMOUNT: {df_data['S_DQ_AMOUNT'].shape}")
                print(f"   ✅ S_DQ_PCTCHANGE: {df_data['S_DQ_PCTCHANGE'].shape}")
            except Exception as e:
                print(f"   ❌ 파생 컬럼 계산 실패: {e}")
        
        # 최종 데이터 검증
        if len(df_data) < 5:
            print("❌ 필수 데이터가 부족합니다")
            return None
            
        # 모든 DataFrame 크기 통일
        base_shape = None
        for key, df in df_data.items():
            if base_shape is None:
                base_shape = df.shape
            elif df.shape != base_shape:
                print(f"   ⚠️ {key} 크기 불일치: {df.shape} vs {base_shape}")
        
        # 최종 결측치 처리
        for key, df in df_data.items():
            df_data[key] = df.ffill().fillna(0)
        
        print("✅ 데이터 로딩 완료!")
        return df_data
        
    except Exception as e:
        print(f"❌ 데이터 로딩 실패: {e}")
        return None

def test_autoalpha_ga():
    """AutoAlpha GA 테스트 실행"""
    print("🧬 AutoAlpha GA 테스트 시작")
    print("=" * 50)
    
    # 1. 데이터 로드 (더 많은 데이터로 테스트)
    df_data = load_sample_data(n_stocks=30, n_days=200)
    if df_data is None:
        print("❌ 데이터 로딩 실패로 테스트 중단")
        return
    
    # 2. AutoAlpha GA 실행
    try:
        from autoalpha_ga import AutoAlphaGA, write_new_alphas_file
        
        print("\n🚀 GA 초기화...")
        ga = AutoAlphaGA(df_data, hold_horizon=1, random_seed=42)
        
        print("🔄 진화 알고리즘 실행...")
        elites = ga.run(
            max_depth=3,        # 더 복잡한 수식까지 탐색
            population=20,      # 더 큰 개체군
            generations=10,     # 더 많은 세대
            warmstart_k=4,
            n_keep_per_depth=10,
            p_mutation=0.3,
            p_crossover=0.7,
        )
        
        print(f"\n🏆 발견된 엘리트: {len(elites)}개")
        
        # 상위 5개 결과 출력 (유효한 IC만)
        valid_elites = [e for e in elites if not np.isnan(e.fitness)]
        print(f"   유효한 엘리트: {len(valid_elites)}개")
        
        for i, elite in enumerate(valid_elites[:5], 1):
            print(f"  {i}. 적합도(IC): {elite.fitness:.6f}")
            print(f"     수식: {elite.tree.to_python_expr()}")
            print(f"     깊이: {elite.tree.depth()}")
            print()
        
        # 3. NewAlphas.py 생성
        if elites:
            print(f"\n📝 상위 {min(3, len(elites))}개를 NewAlphas.py로 저장...")
            out_path = write_new_alphas_file(elites[:3])
            print(f"✅ 저장 완료: {out_path}")
        
        print("\n🎉 테스트 완료!")
        
    except ImportError as e:
        print(f"❌ 임포트 오류: {e}")
        print("필요한 패키지를 설치하세요: pip install numpy pandas scipy")
    except Exception as e:
        print(f"❌ GA 실행 오류: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_autoalpha_ga()
