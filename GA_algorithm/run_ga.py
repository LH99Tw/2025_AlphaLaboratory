
# -*- coding: utf-8 -*-
"""
GA Runner: 진화알고리즘 실행 + NewAlphas.py 생성 + 알파 CSV 생성(+옵션 백테스트)
-------------------------------------------------------------------------------
사용법 예시:
    python run_ga.py \
        --price-file ./database/sp500_interpolated.csv \
        --alpha-out  ./database/sp500_with_alphas.csv \
        --max-depth 3 --population 60 --generations 20 \
        --topk 10 --run-backtest

필요 경로 가정(기본값):
- backend_module/Alphas.py (연산자/입력 클래스)
- backend_module/NewAlphas.py (GA가 자동 생성/덮어씀)
- 5_results.py 및 backtest_config.json (백테스트 설정)

메모:
- price CSV는 최소한 Date, Ticker, Open, High, Low, Close, Volume 컬럼을 포함해야 합니다.
- S_DQ_AMOUNT(거래대금)는 없을 경우 Close*Volume으로 근사 산출합니다.
"""

import os
import sys
import argparse
import pandas as pd
import numpy as np
from datetime import datetime

# ---------- 경로 설정 ----------
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(CURRENT_DIR)  # GA_algorithm의 상위 폴더 (2025_sang2company)
BACKEND_MODULE_DIR = os.path.join(PROJECT_ROOT, 'backend_module')
if BACKEND_MODULE_DIR not in sys.path:
    sys.path.insert(0, BACKEND_MODULE_DIR)

# autoalpha_ga.py 는 프로젝트 루트(또는 PYTHONPATH) 상에 위치한다고 가정
try:
    from autoalpha_ga import AutoAlphaGA, write_new_alphas_file
except ImportError as e:
    print("❌ autoalpha_ga 모듈을 찾을 수 없습니다. run_ga.py와 같은 폴더에 두거나 PYTHONPATH에 추가하세요.")
    raise

# Alphas/NewAlphas
try:
    from Alphas import Alphas
except ImportError:
    print("❌ backend_module/Alphas.py 를 찾을 수 없습니다. 폴더/경로를 확인하세요.")
    raise


def parse_args():
    ap = argparse.ArgumentParser()
    ap.add_argument("--price-file", type=str, default=os.path.join(PROJECT_ROOT, "database", "sp500_interpolated.csv"))
    ap.add_argument("--alpha-out",  type=str, default=os.path.join(PROJECT_ROOT, "database", "sp500_with_alphas.csv"))
    ap.add_argument("--start-date", type=str, default=None, help="YYYY-MM-DD (없으면 전체)")
    ap.add_argument("--end-date",   type=str, default=None, help="YYYY-MM-DD (없으면 전체)")
    ap.add_argument("--hold-h",     type=int, default=1, help="IC 계산용 미래수익 기간 h")
    ap.add_argument("--random-seed", type=int, default=42)

    # GA 하이퍼파라미터
    ap.add_argument("--max-depth", type=int, default=3)
    ap.add_argument("--population", type=int, default=60)
    ap.add_argument("--generations", type=int, default=20)
    ap.add_argument("--warmstart-k", type=int, default=4)
    ap.add_argument("--keep-per-depth", type=int, default=25)
    ap.add_argument("--p-mutation", type=float, default=0.3)
    ap.add_argument("--p-crossover", type=float, default=0.7)
    ap.add_argument("--diversity-th", type=float, default=0.9)

    # 결과 생성
    ap.add_argument("--topk", type=int, default=10, help="NewAlphas.py로 저장/CSV로 계산할 상위 알파 수")
    ap.add_argument("--run-backtest", action="store_true")

    return ap.parse_args()


def load_price_csv(price_file: str) -> pd.DataFrame:
    print(f"📥 주가 데이터 로딩 중: {price_file}")
    if not os.path.exists(price_file):
        raise FileNotFoundError(f"주가 CSV를 찾을 수 없습니다: {price_file}")
    
    print("   CSV 파일 읽는 중...")
    df = pd.read_csv(price_file)
    print(f"   ✅ 로드 완료: {len(df):,}행 × {len(df.columns)}컬럼")
    
    # 최소 컬럼 유효성 체크
    required = {"Date", "Ticker", "Open", "High", "Low", "Close", "Volume"}
    missing = required - set(df.columns)
    if missing:
        raise ValueError(f"price_file에 필요한 컬럼 누락: {missing}")
    print(f"   ✅ 필수 컬럼 확인 완료: {required}")
    
    # 날짜 정규화
    print("   📅 날짜 파싱 중...")
    df["Date"] = pd.to_datetime(df["Date"])
    print(f"   ✅ 기간: {df['Date'].min().date()} ~ {df['Date'].max().date()}")
    print(f"   ✅ 종목 수: {df['Ticker'].nunique()}")
    
    return df


def make_df_data_from_prices(price_df: pd.DataFrame, start_date=None, end_date=None):
    print("🔄 Alphas 형식으로 데이터 변환 중...")
    
    # 기간 슬라이스
    original_len = len(price_df)
    if start_date:
        price_df = price_df[price_df["Date"] >= pd.to_datetime(start_date)]
        print(f"   📅 시작일 필터: {start_date} → {len(price_df):,}행")
    if end_date:
        price_df = price_df[price_df["Date"] <= pd.to_datetime(end_date)]
        print(f"   📅 종료일 필터: {end_date} → {len(price_df):,}행")
    
    if len(price_df) == 0:
        raise ValueError("기간 필터링 후 데이터가 없습니다!")
    
    print(f"   ✅ 필터링 완료: {original_len:,} → {len(price_df):,}행")

    # 피벗: (T x N)
    print("   🔄 피벗 테이블 생성 중...")
    def pivot(col):
        return price_df.pivot(index="Date", columns="Ticker", values=col).sort_index()

    print("      - Open...")
    open_df   = pivot("Open")
    print("      - High...")
    high_df   = pivot("High")
    print("      - Low...")
    low_df    = pivot("Low")
    print("      - Close...")
    close_df  = pivot("Close")
    print("      - Volume...")
    vol_df    = pivot("Volume")
    
    print(f"   ✅ 피벗 완료: {open_df.shape} (일수 × 종목수)")

    # 거래대금(없으면 Close*Volume 근사)
    print("   💰 거래대금 계산 중...")
    if "Amount" in price_df.columns:
        amt_df = pivot("Amount")
        print("      - Amount 컬럼 사용")
    else:
        amt_df = (close_df * vol_df).astype(float)
        print("      - Close × Volume으로 근사 계산")

    # 수익률(PCTCHANGE) - 종목별 일간 수익률
    print("   📈 수익률 계산 중...")
    pct_df = close_df.pct_change(fill_method=None).fillna(0.0)

    print("   🔧 최종 데이터 구조 생성 중...")
    df_data = {
        'S_DQ_OPEN':   open_df.astype(float),
        'S_DQ_HIGH':   high_df.astype(float),
        'S_DQ_LOW':    low_df.astype(float),
        'S_DQ_CLOSE':  close_df.astype(float),
        'S_DQ_VOLUME': vol_df.astype(float),
        'S_DQ_PCTCHANGE': pct_df.astype(float),
        'S_DQ_AMOUNT': amt_df.astype(float),
    }
    
    print(f"   ✅ 데이터 변환 완료!")
    for key, df in df_data.items():
        print(f"      - {key}: {df.shape}")
    
    return df_data


def compute_topk_alphas_to_csv(df_data, top_methods, alpha_out_path):
    """
    NewAlphas.py를 import하여 top_methods에 대한 알파 값 계산 후 CSV 저장
    - 출력 형식: Date, Ticker, alphaGA001, alphaGA002, ...
    """
    print(f"🧮 GA 알파들을 CSV로 계산 중... ({len(top_methods)}개)")
    
    # NewAlphas import (생성된 파일을 다시 로드하도록)
    if BACKEND_MODULE_DIR not in sys.path:
        sys.path.insert(0, BACKEND_MODULE_DIR)
    try:
        print("   📥 NewAlphas.py 임포트 중...")
        from NewAlphas import NewAlphas  # 생성 직후 재임포트
        print("   ✅ NewAlphas 임포트 성공")
    except Exception as e:
        print("❌ backend_module/NewAlphas.py import 실패:", e)
        raise

    print("   🔧 NewAlphas 컨텍스트 생성 중...")
    ctx = NewAlphas(df_data)
    print("   ✅ 컨텍스트 생성 완료")

    panel_list = []
    for i, meth in enumerate(top_methods, 1):
        if not hasattr(ctx, meth):
            print(f"⚠️ {meth} 가 NewAlphas에 없습니다. 건너뜀.")
            continue
        print(f"   🧮 [{i}/{len(top_methods)}] 계산 중: {meth}")
        s = getattr(ctx, meth)()
        # Series/DataFrame 모두 수용 -> DataFrame(T x N)로 정규화
        if isinstance(s, pd.Series):
            if isinstance(s.index, pd.MultiIndex):
                fac_df = s.unstack()
            else:
                # 단일 인덱스면 모든 Ticker에 복제(보수적 대안)
                fac_df = pd.DataFrame(
                    np.tile(s.values.reshape(-1,1), (1, df_data['S_DQ_CLOSE'].shape[1])),
                    index=df_data['S_DQ_CLOSE'].index, columns=df_data['S_DQ_CLOSE'].columns
                )
        else:
            fac_df = s
        fac_df = fac_df.replace([np.inf, -np.inf], 0).fillna(0)
        # 넓은 포맷 -> 길게
        long = fac_df.stack().reset_index()
        long.columns = ["Date","Ticker", meth]
        panel_list.append(long)

    if not panel_list:
        raise RuntimeError("계산된 알파가 없습니다. top_methods를 확인하세요.")

    print(f"   🔗 {len(panel_list)}개 알파 데이터 병합 중...")
    # 병합
    merged = panel_list[0]
    for i, df in enumerate(panel_list[1:], 2):
        print(f"      - [{i}/{len(panel_list)}] 병합 중...")
        merged = merged.merge(df, on=["Date","Ticker"], how="outer")
    
    print("   📊 정렬 및 정리 중...")
    merged = merged.sort_values(["Date","Ticker"]).reset_index(drop=True)

    # 저장
    print(f"   💾 CSV 저장 중: {alpha_out_path}")
    out_dir = os.path.dirname(alpha_out_path)
    if out_dir and not os.path.exists(out_dir):
        os.makedirs(out_dir, exist_ok=True)
    merged.to_csv(alpha_out_path, index=False, encoding="utf-8")
    print(f"   ✅ 알파 CSV 저장 완료!")
    print(f"      - 파일: {alpha_out_path}")
    print(f"      - 크기: {len(merged):,}행 × {len(merged.columns)}컬럼")
    print(f"      - 컬럼: {list(merged.columns)}")
    return merged


def main():
    print("🚀 AutoAlpha GA Runner 시작")
    print("=" * 60)
    
    args = parse_args()
    
    print(f"📋 실행 파라미터:")
    print(f"   - 주가파일: {args.price_file}")
    print(f"   - 알파출력: {args.alpha_out}")
    print(f"   - 기간: {args.start_date} ~ {args.end_date}")
    print(f"   - GA 파라미터: depth={args.max_depth}, pop={args.population}, gen={args.generations}")
    print(f"   - 상위 알파: {args.topk}개")
    print()

    # 1) 데이터 로드
    print("🔸 1단계: 데이터 로드")
    price_df = load_price_csv(args.price_file)
    df_data_train = make_df_data_from_prices(price_df, args.start_date, args.end_date)
    print("✅ 1단계 완료\n")

    # 2) GA 실행
    print("🔸 2단계: 진화 알고리즘 실행")
    print(f"   🧬 AutoAlpha GA 초기화 중...")
    ga = AutoAlphaGA(df_data_train, hold_horizon=args.hold_h, random_seed=args.random_seed)
    print(f"   ✅ GA 초기화 완료")
    
    print(f"   🔄 진화 시작...")
    print(f"      - 최대 깊이: {args.max_depth}")
    print(f"      - 개체군 크기: {args.population}")
    print(f"      - 세대 수: {args.generations}")
    
    elites = ga.run(
        max_depth=args.max_depth,
        population=args.population,
        generations=args.generations,
        warmstart_k=args.warmstart_k,
        n_keep_per_depth=args.keep_per_depth,
        p_mutation=args.p_mutation,
        p_crossover=args.p_crossover,
        diversity_threshold=args.diversity_th,
    )
    
    if not elites:
        print("❌ GA에서 유효한 엘리트가 생성되지 않았습니다. 파라미터/데이터를 확인하세요.")
        return
    
    print(f"   🏆 진화 완료! {len(elites)}개 엘리트 발견")
    print("✅ 2단계 완료\n")

    # 3) NewAlphas.py 생성
    print("🔸 3단계: NewAlphas.py 생성")
    top_elites = elites[:args.topk]
    out_path = os.path.join(BACKEND_MODULE_DIR, "NewAlphas.py")
    
    print(f"   📝 상위 {len(top_elites)}개 알파를 NewAlphas.py로 저장 중...")
    for i, elite in enumerate(top_elites, 1):
        print(f"      - alphaGA{i:03d}: IC={elite.fitness:.6f}, 수식={elite.tree.to_python_expr()[:50]}...")
    
    write_new_alphas_file(top_elites, out_path=out_path)
    print(f"   ✅ NewAlphas.py 생성 완료: {out_path}")
    print("✅ 3단계 완료\n")

    # 4) 알파 CSV 생성 (백테스트용)
    print("🔸 4단계: 백테스트용 알파 CSV 생성")
    print("   🔄 전체 기간 데이터로 알파 계산 중...")
    #    백테스트는 전체 기간을 쓰는 경우가 많으므로, 날짜 제한없이 전체 price_df로 다시 df_data 구성
    df_data_full = make_df_data_from_prices(price_df, None, None)
    top_methods = [f"alphaGA{i:03d}" for i in range(1, len(top_elites)+1)]
    compute_topk_alphas_to_csv(df_data_full, top_methods, args.alpha_out)
    print("✅ 4단계 완료\n")

    # 5) (옵션) 백테스트 실행
    if args.run_backtest:
        print("🔸 5단계: 백테스트 실행")
        try:
            # 5_results.py는 backend_module에 있다고 가정
            results_path = os.path.join(BACKEND_MODULE_DIR, "5_results.py")
            print(f"   📁 백테스트 모듈 확인: {results_path}")
            
            if not os.path.exists(results_path):
                print(f"⚠️ 백테스트 파일을 찾을 수 없습니다: {results_path}")
                return
            
            print("   📥 백테스트 모듈 로딩 중...")
            import importlib.util, types
            spec = importlib.util.spec_from_file_location("results_mod", results_path)
            results_mod = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(results_mod)

            print("   🔧 백테스트 시스템 초기화 중...")
            Lo = getattr(results_mod, "LongOnlyBacktestSystem")
            lob = Lo(price_file=args.price_file, alpha_file=args.alpha_out, config_file=None)
            
            print("   🚀 백테스트 실행 중...")
            # 설정 파일(backtest_config.json) 기본값을 쓰며, run_backtest 파라미터는 내부 설정 사용
            lob.run_backtest()
            print("   ✅ 백테스트 완료")
            print("✅ 5단계 완료\n")
        except Exception as e:
            print("⚠️ 백테스트 실행 실패:", e)
    
    print("🎉 모든 단계 완료!")
    print("=" * 60)


if __name__ == "__main__":
    main()
