
# -*- coding: utf-8 -*-
"""
AutoAlpha-style Evolutionary Search (GA) for Formulaic Alphas
================================================================
본 모듈은 다음 논문의 아이디어(계층적 탐색 + PCA-QD + Warm Start + Parent-Offspring Replacement)를
실무 코드로 옮긴 MVP 구현입니다.

    AutoAlpha: an Efficient Hierarchical Evolutionary Algorithm for Mining Alpha Factors
    (Zhang et al., IJCAI 2020, arXiv:2002.08245)

본 구현은 다음을 목표로 합니다.
- Alphas.py의 연산자/입력(OHLCV, VWAP, returns 등)을 재사용하여 "수식 트리" 형태의 알파를 진화시킵니다.
- AutoAlpha/AlphaMix 논문을 참고해 다중 기간 IC, 정보비율(IC_IR), 회전율, PCA 다양성을 결합한 합리적 스코어를 사용합니다.
- PCA-QD + Age-Layered 재시작 전략으로 탐색 다양성을 유지하고, 상위 후보만 별도 백테스트 시스템(예: 5_results.LongOnlyBacktestSystem)에 넘길 수 있도록 훅을 제공합니다.
- 최종 선별된 알파를 NewAlphas.py에 함수(alphaGA001, ...) 형태로 자동 기록합니다.

요구되는 데이터 형식 (중요):
- Alphas.Alphas 가 기대하는 동일한 df_data 구조를 사용해야 합니다.
  즉, 딕셔너리 또는 네임드 객체로 다음 키를 가진 pandas.DataFrame(인덱스: Date, 컬럼: Ticker)들을 제공합니다.
    'S_DQ_OPEN', 'S_DQ_HIGH', 'S_DQ_LOW', 'S_DQ_CLOSE', 'S_DQ_VOLUME', 'S_DQ_PCTCHANGE', 'S_DQ_AMOUNT'
- 각 DataFrame의 shape은 (시간 x 종목) 이어야 하며, 인덱스는 정렬되어 있어야 합니다.

빠른 시작:
---------
from autoalpha_ga import AutoAlphaGA, DefaultSearchSpace, write_new_alphas_file
from Alphas import Alphas

# df_data를 준비 (사용자 로더로 생성)
ga = AutoAlphaGA(df_data, hold_horizon=1, random_seed=42)

elites = ga.run(
    max_depth=3,
    population=60,
    generations=20,
    warmstart_k=4,          # K배 생성 후 상위 1/K만 초기 개체군에 편입
    n_keep_per_depth=25,    # 각 depth의 엘리트 보관 상한
    p_mutation=0.3,
    p_crossover=0.7,
)

# 상위 M개를 NewAlphas.py로 기록
write_new_alphas_file(elites[:10], out_path="NewAlphas.py")

통합 팁:
--------
- 5_results.LongOnlyBacktestSystem 과 연동하려면, write_new_alphas_file()로 NewAlphas.py 생성 후
  기존 파이프라인에서 alpha 파일 생성 단계에 NewAlphas.NewAlphas의 메서드들을 호출해 계산 결과를 CSV로 내리면 됩니다.
"""

from __future__ import annotations

import math
import random
import json
import dataclasses
from dataclasses import dataclass, field
from typing import Any, Callable, Dict, List, Optional, Tuple, Union

import os
import sys
import numpy as np
import pandas as pd

# ==========================================
# 경로 설정: 이 파일 기준 상대경로로 backend_module 추가
# - 어디서 실행하든 backend_module/Alphas.py 를 import 가능하게 함
# ==========================================
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(CURRENT_DIR)
BACKEND_MODULE_DIR = os.path.join(PROJECT_ROOT, 'backend_module')

# 경로 존재 확인 및 친절한 에러 메시지
if not os.path.exists(BACKEND_MODULE_DIR):
    raise ImportError(f"backend_module 디렉토리를 찾을 수 없습니다: {BACKEND_MODULE_DIR}\n"
                     f"프로젝트 구조를 확인하거나 PYTHONPATH를 설정해주세요.")

if BACKEND_MODULE_DIR not in sys.path:
    sys.path.insert(0, BACKEND_MODULE_DIR)

# Alphas.py의 연산자/입력과 동일 환경에서 계산하기 위해 import (backend_module 내 위치)
from Alphas import (
    Alphas,
    ts_sum, sma, stddev, correlation, covariance,
    ts_rank, product, ts_min, ts_max, delta, delay, rank, scale,
    ts_argmax, ts_argmin, decay_linear,
    safe_clean, adv, floor_window
)


# ===============================
# 표현: 수식 트리 (Expression Tree)
# ===============================

# 연산자 메타 정의
def _safe_divide(a: Union[pd.DataFrame, pd.Series, np.ndarray, float, int],
                 b: Union[pd.DataFrame, pd.Series, np.ndarray, float, int]) -> Union[pd.DataFrame, pd.Series, np.ndarray]:
    """
    Pandas Series/DataFrame 또는 numpy 배열을 안전하게 나눕니다.
    - 0 나눗셈 및 inf 값을 NaN으로 정리
    - 입력 타입을 유지해 반환
    """
    if hasattr(a, "align") and hasattr(b, "align"):
        a_aligned, b_aligned = a.align(b, join="outer")
    else:
        a_aligned, b_aligned = a, b

    a_vals = a_aligned.values if hasattr(a_aligned, "values") else np.asarray(a_aligned)
    b_vals = b_aligned.values if hasattr(b_aligned, "values") else np.asarray(b_aligned)

    with np.errstate(divide="ignore", invalid="ignore"):
        out = np.divide(a_vals, b_vals)
    out = np.where(np.isfinite(out), out, np.nan)

    if hasattr(a_aligned, "index"):
        if hasattr(a_aligned, "columns"):
            columns = a_aligned.columns if hasattr(a_aligned, "columns") else getattr(b_aligned, "columns", None)
            return pd.DataFrame(out, index=a_aligned.index, columns=columns)
        return pd.Series(out, index=a_aligned.index)
    return out


UNARY_OPS = {
    "rank": {"fn": rank, "params": []},
    "ts_rank": {"fn": ts_rank, "params": ["window"]},
    "delta": {"fn": delta, "params": ["period"]},
    "delay": {"fn": delay, "params": ["period"]},
    "sma": {"fn": sma, "params": ["window"]},
    "stddev": {"fn": stddev, "params": ["window"]},
    "ts_max": {"fn": ts_max, "params": ["window"]},
    "ts_min": {"fn": ts_min, "params": ["window"]},
    "ts_argmax": {"fn": ts_argmax, "params": ["window"]},
    "ts_argmin": {"fn": ts_argmin, "params": ["window"]},
    "decay_linear": {"fn": decay_linear, "params": ["period"], "frame_only": True},
}

BINARY_OPS = {
    "add": {"symbol": "+", "fn": lambda a, b: a + b},
    "sub": {"symbol": "-", "fn": lambda a, b: a - b},
    "mul": {"symbol": "*", "fn": lambda a, b: a * b},
    "div": {"symbol": "/", "fn": _safe_divide},
    "min": {"symbol": "min", "fn": lambda a, b: pd.DataFrame(np.minimum(a.values, b.values), index=a.index, columns=a.columns) if hasattr(a, 'index') and hasattr(b, 'index') else np.minimum(a, b)},
    "max": {"symbol": "max", "fn": lambda a, b: pd.DataFrame(np.maximum(a.values, b.values), index=a.index, columns=a.columns) if hasattr(a, 'index') and hasattr(b, 'index') else np.maximum(a, b)},
    "correlation": {"symbol": "correlation", "fn": correlation, "params": ["window"]},
}

TERMINALS = ["open", "high", "low", "close", "volume", "vwap", "returns"]

# 진화 품질 평가 시 기본 가중치 설정 (문헌 기반)
DEFAULT_METRIC_WEIGHTS: Dict[str, Any] = {
    # 다중 투자 기간 IC 중요도를 단계적으로 부여 (AutoAlpha + GEP 논문 조합)
    "horizons": {
        1: 0.4,
        5: 0.35,
        10: 0.25,
    },
    # 안정성과 다양성 반영 가중치 (PCA-QD, Risk-aware GA 참고)
    "ic_ir": 0.25,
    "novelty": 0.15,
    "turnover": 0.1,
    "ic_vol": 0.1,
    "penalty": 0.1,
    # 충분한 시계열 커버리지 확보를 위한 목표치
    "coverage_target": 0.6,
}


@dataclass
class Node:
    op: str
    left: Optional['Node'] = None
    right: Optional['Node'] = None
    params: Dict[str, Any] = field(default_factory=dict)
    terminal_name: Optional[str] = None

    def depth(self) -> int:
        if self.op == "terminal":
            return 1
        dl = self.left.depth() if self.left else 0
        dr = self.right.depth() if self.right else 0
        return 1 + max(dl, dr)

    def copy(self) -> 'Node':
        return Node(
            op=self.op,
            left=self.left.copy() if self.left else None,
            right=self.right.copy() if self.right else None,
            params=dict(self.params),
            terminal_name=self.terminal_name
        )

    def compile(self) -> Callable[[Alphas], pd.Series]:
        """
        수식 트리를 실행 가능한 함수로 컴파일합니다.
        - 반환 함수는 Alphas 컨텍스트(가격/거래량 등)를 받아 팩터 시계열(Series 또는 DataFrame)을 출력합니다.
        - 계산 결과의 inf/NaN은 0으로 정리하여 안정성 확보.
        """
        def _compile(node: 'Node') -> Callable[[Alphas], pd.Series]:
            if node.op == "terminal":
                name = node.terminal_name
                def f(ctx: Alphas):
                    return getattr(ctx, name)
                return f

            if node.op in UNARY_OPS:
                fn_meta = UNARY_OPS[node.op]
                child_f = _compile(node.left)
                def f(ctx: Alphas):
                    x = child_f(ctx)
                    if fn_meta.get("frame_only"):
                        return fn_meta["fn"](x.to_frame(), **node.params).iloc[:, 0]
                    return fn_meta["fn"](x, **node.params)
                return f

            if node.op in BINARY_OPS:
                fn_meta = BINARY_OPS[node.op]
                left_f = _compile(node.left)
                right_f = _compile(node.right)
                if node.op == "correlation":
                    w = int(node.params.get("window", 10))
                    def f(ctx: Alphas):
                        a = left_f(ctx); b = right_f(ctx)
                        base_index = getattr(ctx.close, "index", None)
                        base_columns = getattr(ctx.close, "columns", None)
                        try:
                            if hasattr(a, "align") and hasattr(b, "align"):
                                a, b = a.align(b, join="inner", axis=0)
                                if hasattr(a, "columns") and hasattr(b, "columns"):
                                    a, b = a.align(b, join="inner", axis=1)
                        except Exception:
                            pass

                        if hasattr(a, "empty") and a.empty:
                            return pd.DataFrame(0, index=base_index, columns=base_columns)
                        if hasattr(b, "empty") and b.empty:
                            return pd.DataFrame(0, index=base_index, columns=base_columns)
                        try:
                            result = fn_meta["fn"](a, b, w)
                            # correlation 결과 안전성 확보
                            if hasattr(result, 'replace'):
                                result = result.replace([np.inf, -np.inf], 0).fillna(0)
                            return result
                        except:
                            # correlation 계산 실패 시 0 행렬 반환
                            return pd.DataFrame(0, index=base_index, columns=base_columns)
                    return f

                def f(ctx: Alphas):
                    a = left_f(ctx); b = right_f(ctx)
                    return fn_meta["fn"](a, b)
                return f

            raise ValueError(f"Unknown op: {node.op}")

        f = _compile(self)

        def safe(ctx: Alphas) -> pd.Series:
            out = f(ctx)
            if isinstance(out, (pd.DataFrame, pd.Series)):
                out = out.replace([np.inf, -np.inf], 0).fillna(0)
            return out
        return safe

    def to_python_expr(self) -> str:
        """
        현재 수식 트리를 Python 표현식 문자열로 변환합니다.
        - 생성된 문자열은 NewAlphas.py 내 개별 메서드 본문에서 그대로 사용됩니다.
        - 일부 연산자(예: decay_linear, correlation)는 프레임/윈도우 인자를 맞춰 처리합니다.
        """
        if self.op == "terminal":
            return f"self.{self.terminal_name}"

        if self.op in UNARY_OPS:
            child = self.left.to_python_expr()
            if self.op in ("ts_rank", "sma", "stddev", "ts_max", "ts_min", "ts_argmax", "ts_argmin"):
                w = int(self.params.get("window") or self.params.get("period", 10))
                return f"{self.op}({child}, {w})"
            if self.op in ("delta", "delay"):
                p = int(self.params.get("period", 1))
                return f"{self.op}({child}, {p})"
            if self.op == "rank":
                return f"rank({child})"
            if self.op == "decay_linear":
                p = int(self.params.get('period', 10))
                return f"decay_linear({child}.to_frame(), {p}).iloc[:, 0]"
            return f"{self.op}({child})"

        if self.op in BINARY_OPS:
            left = self.left.to_python_expr()
            right = self.right.to_python_expr()
            if self.op == "correlation":
                w = int(self.params.get("window", 10))
                return f"correlation({left}, {right}, {w})"
            sym = BINARY_OPS[self.op]["symbol"]
            if sym in {"+", "-", "*", "/"}:
                return f"({left} {sym} {right})"
            if sym == "min":
                return f"pd.DataFrame(np.minimum(({left}).values, ({right}).values), index=({left}).index, columns=({left}).columns)"
            if sym == "max":
                return f"pd.DataFrame(np.maximum(({left}).values, ({right}).values), index=({left}).index, columns=({left}).columns)"
        raise ValueError(f"Unknown op {self.op}")

    def iter_nodes(self):
        yield self
        if self.left: 
            yield from self.left.iter_nodes()
        if self.right:
            yield from self.right.iter_nodes()


@dataclass
class FitnessMetrics:
    """
    다중 지표 기반 적합도 결과.
    - ic_by_horizon: 기간별 평균 IC
    - ic_counts: 기간별 유효 일자 수
    - ic_volatility: 기간 혼합 IC의 변동성
    - ic_ir: 정보비율
    - turnover: 순위 변동률 기반 회전율
    - coverage: 유효 일자 비율
    - novelty: PCA 기반 다양성 점수
    - penalty: 커버리지/안정성 페널티 합산
    - composite: 최종 스칼라 점수
    """
    ic_by_horizon: Dict[int, float] = field(default_factory=dict)
    ic_counts: Dict[int, int] = field(default_factory=dict)
    ic_aggregate: float = float("nan")
    ic_volatility: float = float("nan")
    ic_ir: float = float("nan")
    turnover: float = float("nan")
    coverage: float = float("nan")
    novelty: float = float("nan")
    penalty: float = 0.0
    composite: float = float("nan")


class DefaultSearchSpace:
    """
    탐색 공간 정의 클래스
    - 초기 루트 템플릿, 사용 가능한 단항/이항 연산자, 윈도우 후보 등을 보유합니다.
    - 검색 난이도/다양성을 조절하려면 풀 또는 윈도우 분포를 수정하세요.
    """
    WINDOW_CANDIDATES = [3,5,10,20,30,60,120]
    ROOT_TEMPLATES: List[Node] = [
        Node(op="terminal", terminal_name="vwap"),
        Node(op="terminal", terminal_name="close"),
        Node(op="terminal", terminal_name="open"),
        Node(op="terminal", terminal_name="high"),
        Node(op="terminal", terminal_name="low"),
        Node(op="terminal", terminal_name="volume"),
        Node(op="div", left=Node(op="terminal", terminal_name="vwap"), right=Node(op="terminal", terminal_name="close")),
        Node(op="sub", left=Node(op="terminal", terminal_name="close"), right=Node(op="terminal", terminal_name="open")),
        Node(op="sub", left=Node(op="terminal", terminal_name="high"),  right=Node(op="terminal", terminal_name="low")),
    ]

    UNARY_POOL = ["rank", "ts_rank", "delta", "delay", "sma", "stddev", "ts_max", "ts_min", "ts_argmax", "ts_argmin", "decay_linear"]
    BINARY_POOL = ["add", "sub", "mul", "div", "min", "max", "correlation"]

    @classmethod
    def random_window(cls, rng: random.Random) -> int:
        return int(rng.choice(cls.WINDOW_CANDIDATES))


def compute_future_returns(close_df: pd.DataFrame, h: int) -> pd.DataFrame:
    """h일 뒤 수익률을 계산합니다: Close[t+h]/Close[t]-1"""
    return close_df.shift(-h) / close_df - 1.0

def cross_sectional_ic(factor: pd.DataFrame, future_ret: pd.DataFrame, show_progress: bool = False) -> float:
    """
    단면 IC(Information Coefficient)를 계산합니다.
    - 각 일자별로 종목 단면 상관계수를 구한 뒤 평균합니다.
    - 데이터 정합성(공통 인덱스) 및 유효 표본 수(>=5)를 확인합니다.
    """
    try:
        ic_series = cross_sectional_ic_series(factor, future_ret)
        if ic_series.empty:
            return float("nan")
        return float(ic_series.mean())
    except Exception:
        return float("nan")


def cross_sectional_ic_series(factor: pd.DataFrame, future_ret: pd.DataFrame) -> pd.Series:
    """
    일자별 단면 IC 시계열을 계산합니다.
    - factor, future_ret: 동일한 인덱스(Date)와 컬럼(Ticker)을 가정
    """
    common = factor.index.intersection(future_ret.index)
    if len(common) == 0:
        return pd.Series(dtype=float)

    factor = factor.loc[common]
    future_ret = future_ret.loc[common]
    ic_values: List[float] = []
    ic_dates: List[pd.Timestamp] = []

    for dt, row in factor.iterrows():
        y = future_ret.loc[dt]
        x = row.values
        y_arr = y.values if hasattr(y, "values") else np.asarray(y)

        mask = np.isfinite(x) & np.isfinite(y_arr)
        if mask.sum() < 5:
            continue

        x_valid = x[mask]
        y_valid = y_arr[mask]

        if np.std(x_valid) < 1e-8 or np.std(y_valid) < 1e-8:
            continue

        try:
            corr_matrix = np.corrcoef(x_valid, y_valid)
            if corr_matrix.shape == (2, 2):
                ic_val = corr_matrix[0, 1]
                if np.isfinite(ic_val):
                    ic_values.append(float(ic_val))
                    ic_dates.append(dt)
        except Exception:
            continue

    if not ic_values:
        return pd.Series(dtype=float)
    return pd.Series(ic_values, index=pd.Index(ic_dates, name="date"))


def compute_factor_turnover(factor_df: pd.DataFrame) -> float:
    """
    팩터 순위 기반 회전율을 계산합니다.
    - 연속 일자의 순위 변화량 평균을 통해 안정성을 측정합니다.
    - 순위 변화 총합을 유효 종목 수로 정규화하여 0~2 범위를 기대합니다.
    """
    if factor_df.empty:
        return 0.0

    try:
        ranks = factor_df.rank(axis=1, method="average", pct=True)
        diffs = ranks.diff().abs()
        if diffs.shape[0] <= 1:
            return 0.0

        denom = ranks.notna().sum(axis=1).replace(0, np.nan)
        turnover_series = diffs.sum(axis=1) / denom
        turnover_series = turnover_series.replace([np.inf, -np.inf], np.nan).dropna()
        if turnover_series.empty:
            return 0.0
        return float(turnover_series.mean())
    except Exception:
        return 0.0

def first_pc_vector(A: pd.DataFrame) -> np.ndarray:
    """
    PCA의 첫 번째 주성분 벡터를 반환합니다.
    - 결측/무한값은 0으로 정리 후 평균 제거
    - 자산 축(컬럼) 로딩 벡터를 비교 대상으로 사용
    - SVD 실패 시 단위 벡터로 대체
    """
    X = A.values
    X = np.nan_to_num(X, nan=0.0, posinf=0.0, neginf=0.0)
    X = X - X.mean(axis=0, keepdims=True)
    try:
        _, _, Vt = np.linalg.svd(X, full_matrices=False)
        v = Vt[0] if Vt.size > 0 else np.ones(X.shape[1], dtype=float)
        v = v / (np.linalg.norm(v) + 1e-12)
        return v
    except np.linalg.LinAlgError:
        if X.shape[1] == 0:
            return np.array([1.0])
        v = np.ones(X.shape[1], dtype=float)
        v /= np.linalg.norm(v) + 1e-12
        return v

def pca_similarity(A: pd.DataFrame, B: pd.DataFrame) -> float:
    """두 행렬의 1주성분 벡터 간 상관계수(유사도)를 반환"""
    v1 = first_pc_vector(A)
    v2 = first_pc_vector(B)
    return float(np.corrcoef(v1, v2)[0,1])


def random_terminal(rng: random.Random) -> Node:
    """무작위 입력 단말 노드 생성(OHLCV, vwap, returns)"""
    t = rng.choice(TERMINALS)
    return Node(op="terminal", terminal_name=t)

def random_unary(rng: random.Random, child: Node) -> Node:
    """무작위 단항 연산자 노드 생성(윈도우/기간 파라미터 포함)"""
    op = rng.choice(DefaultSearchSpace.UNARY_POOL)
    params = {}
    if op in ("ts_rank", "sma", "stddev", "ts_max", "ts_min", "ts_argmax", "ts_argmin"):
        params["window"] = DefaultSearchSpace.random_window(rng)
    if op in ("delta", "delay"):
        params["period"] = DefaultSearchSpace.random_window(rng)
    if op == "decay_linear":
        params["period"] = DefaultSearchSpace.random_window(rng)
    return Node(op=op, left=child.copy(), params=params)

def random_binary(rng: random.Random, left: Node, right: Node) -> Node:
    """무작위 이항 연산자 노드 생성(correlation의 경우 윈도우 포함)"""
    op = rng.choice(DefaultSearchSpace.BINARY_POOL)
    params = {}
    if op == "correlation":
        params["window"] = DefaultSearchSpace.random_window(rng)
    return Node(op=op, left=left.copy(), right=right.copy(), params=params)

def random_tree(rng: random.Random, target_depth:int) -> Node:
    """목표 깊이에 맞춰 무작위 수식 트리 생성(단항/이항 혼합)"""
    if target_depth <= 1:
        return random_terminal(rng)
    if rng.random() < 0.5:
        child = random_tree(rng, target_depth-1)
        return random_unary(rng, child)
    else:
        left_depth = rng.randint(1, target_depth-1)
        right_depth = target_depth-1
        left = random_tree(rng, left_depth)
        right = random_tree(rng, right_depth)
        return random_binary(rng, left, right)

def mutate(rng: random.Random, node: Node, p_param: float=0.5) -> Node:
    """
    변이 연산
    - 연산자 교체, 파라미터 섭동, 서브트리 치환 중 하나를 무작위 선택
    - p_param은 파라미터 변이 확률
    """
    node = node.copy()
    choice = rng.random()
    if choice < 0.33 and node.op != "terminal":
        if node.op in UNARY_OPS:
            newop = rng.choice(DefaultSearchSpace.UNARY_POOL)
            node.op = newop
            node.params = {}
            if newop in ("ts_rank", "sma", "stddev"):
                node.params["window"] = DefaultSearchSpace.random_window(rng)
            if newop in ("delta", "delay"):
                node.params["period"] = DefaultSearchSpace.random_window(rng)
        elif node.op in BINARY_OPS:
            newop = rng.choice(DefaultSearchSpace.BINARY_POOL)
            node.op = newop
            node.params = {}
            if newop == "correlation":
                node.params["window"] = DefaultSearchSpace.random_window(rng)
    elif choice < 0.66:
        if node.op in UNARY_OPS:
            if "window" in node.params and rng.random() < p_param:
                node.params["window"] = DefaultSearchSpace.random_window(rng)
            if "period" in node.params and rng.random() < p_param:
                node.params["period"] = DefaultSearchSpace.random_window(rng)
        if node.op in BINARY_OPS and node.op == "correlation" and rng.random() < p_param:
            node.params["window"] = DefaultSearchSpace.random_window(rng)
    else:
        all_nodes = [n for n in node.iter_nodes() if n.op != "terminal"]
        if all_nodes:
            tgt = rng.choice(all_nodes)
            new_sub = random_tree(rng, max(1, tgt.depth()))
            tgt.op, tgt.left, tgt.right, tgt.params, tgt.terminal_name =                 new_sub.op, new_sub.left, new_sub.right, new_sub.params, new_sub.terminal_name
    return node

def crossover(rng: random.Random, a: Node, b: Node) -> Tuple[Node, Node]:
    """교차 연산: 임의 노드 선택 후 구조/파라미터 서로 교환"""
    a = a.copy(); b = b.copy()
    a_nodes = list(a.iter_nodes())
    b_nodes = list(b.iter_nodes())
    a_pick = rng.choice(a_nodes)
    b_pick = rng.choice(b_nodes)
    a_pick.op, b_pick.op = b_pick.op, a_pick.op
    a_pick.left, b_pick.left = b_pick.left, a_pick.left
    a_pick.right, b_pick.right = b_pick.right, a_pick.right
    a_pick.params, b_pick.params = b_pick.params, a_pick.params
    a_pick.terminal_name, b_pick.terminal_name = b_pick.terminal_name, a_pick.terminal_name
    return a, b


@dataclass(eq=False)
class Individual:
    """개체 표현: 수식 트리 + 적합도(단면 IC) + PCA 벡터/팩터행렬 캐시"""
    tree: Node
    fitness: float = float("nan")
    pca_vec: Optional[np.ndarray] = None
    factor_matrix: Optional[pd.DataFrame] = None
    metrics: Optional[FitnessMetrics] = None
    age: int = 0
    last_improved_gen: Optional[int] = None

class AutoAlphaGA:
    """
    AutoAlpha 스타일 GA 구현 (간이 IC 기반 1차 평가 + PCA 다양성)
    - df_data: Alphas가 기대하는 입력 딕셔너리
    - hold_horizon: 미래 수익률 계산 시점(h)
    - random_seed: 재현성
    """
    def __init__(self,
                 df_data: Dict[str, pd.DataFrame],
                 hold_horizon:int=1,
                 random_seed:int=42,
                 metric_weights: Optional[Dict[str, Any]] = None,
                 age_layer_span:int = 6,
                 stale_age:int = 12):
        self.df_data = df_data
        self.h = int(hold_horizon)
        self.rng = random.Random(random_seed)

        self.ctx = Alphas(df_data)
        self.close_df = self.ctx.close
        self.metric_weights = self._prepare_metric_weights(metric_weights)

        self.eval_horizons = sorted(set([self.h] + list(self.metric_weights["horizons"].keys())))
        self.future_returns_cache: Dict[int, pd.DataFrame] = {
            h: compute_future_returns(self.close_df, h) for h in self.eval_horizons
        }
        self.future_ret = self.future_returns_cache[self.h]
        self.coverage_target = float(self.metric_weights.get("coverage_target", 0.6))
        self.age_layer_span = max(3, int(age_layer_span))
        self.stale_age = max(self.age_layer_span, int(stale_age))

        self.archive: List[Individual] = []
        self.record: List[Individual] = []
        self._generation_counter = 0

    def _prepare_metric_weights(self, metric_weights: Optional[Dict[str, Any]]) -> Dict[str, Any]:
        """
        사용자 설정을 기본 가중치와 병합하고, 기간 가중치를 정규화합니다.
        """
        merged: Dict[str, Any] = {
            "horizons": dict(DEFAULT_METRIC_WEIGHTS["horizons"]),
            "ic_ir": DEFAULT_METRIC_WEIGHTS["ic_ir"],
            "novelty": DEFAULT_METRIC_WEIGHTS["novelty"],
            "turnover": DEFAULT_METRIC_WEIGHTS["turnover"],
            "ic_vol": DEFAULT_METRIC_WEIGHTS["ic_vol"],
            "penalty": DEFAULT_METRIC_WEIGHTS["penalty"],
            "coverage_target": DEFAULT_METRIC_WEIGHTS["coverage_target"],
        }

        if metric_weights:
            for key, value in metric_weights.items():
                if key == "horizons" and isinstance(value, dict):
                    for hz, wt in value.items():
                        try:
                            hz_int = int(hz)
                            merged["horizons"][hz_int] = float(wt)
                        except (TypeError, ValueError):
                            continue
                else:
                    merged[key] = value

        # 음수 또는 0 합계 방지를 위해 가중치 정규화
        horizon_total = sum(abs(w) for w in merged["horizons"].values())
        if horizon_total <= 0:
            merged["horizons"] = dict(DEFAULT_METRIC_WEIGHTS["horizons"])
            horizon_total = sum(abs(w) for w in merged["horizons"].values())
        merged["horizons"] = {
            int(h): float(w) / horizon_total for h, w in merged["horizons"].items()
        }
        return merged

    def _compose_score(self, metrics: FitnessMetrics) -> float:
        """
        개별 지표를 단일 스칼라 점수로 합성합니다.
        """
        horizon_score = 0.0
        for horizon, weight in self.metric_weights["horizons"].items():
            horizon_score += weight * metrics.ic_by_horizon.get(horizon, 0.0)
        metrics.ic_aggregate = horizon_score

        ic_ir_term = self.metric_weights.get("ic_ir", 0.0) * (metrics.ic_ir if np.isfinite(metrics.ic_ir) else 0.0)
        novelty_term = self.metric_weights.get("novelty", 0.0) * (metrics.novelty if np.isfinite(metrics.novelty) else 0.0)
        turnover_term = self.metric_weights.get("turnover", 0.0) * (metrics.turnover if np.isfinite(metrics.turnover) else 0.0)
        ic_vol_term = self.metric_weights.get("ic_vol", 0.0) * (metrics.ic_volatility if np.isfinite(metrics.ic_volatility) else 0.0)
        penalty_term = self.metric_weights.get("penalty", 0.0) * metrics.penalty

        return horizon_score + ic_ir_term + novelty_term - turnover_term - ic_vol_term - penalty_term

    def novelty_score(self, ind: Individual) -> float:
        """
        PCA 기반 다양성 점수 계산 (AutoAlpha + MAP-Elites 아이디어).
        - archive 내 최고 유사도를 활용하여 0~1 범위의 신규성 추정
        """
        if ind.factor_matrix is None or ind.factor_matrix.empty:
            return 0.0

        if ind.pca_vec is None:
            try:
                ind.pca_vec = first_pc_vector(ind.factor_matrix)
            except Exception:
                return 0.0

        if not self.archive:
            return 1.0

        similarities: List[float] = []
        for elite in self.archive:
            if elite is ind:
                continue
            if elite.factor_matrix is None:
                continue
            if elite.pca_vec is None and elite.factor_matrix is not None:
                try:
                    elite.pca_vec = first_pc_vector(elite.factor_matrix)
                except Exception:
                    continue
            if elite.pca_vec is None:
                continue
            try:
                sim = float(np.clip(np.dot(ind.pca_vec, elite.pca_vec), -1.0, 1.0))
                similarities.append(sim)
            except Exception:
                continue

        if not similarities:
            return 1.0
        best_sim = max(similarities)
        best_sim = max(-1.0, min(1.0, best_sim))
        if best_sim <= 0:
            return 1.0
        return max(0.0, 1.0 - best_sim)

    def _evaluate_factor_metrics(self, factor_df: pd.DataFrame, ind: Optional[Individual]) -> FitnessMetrics:
        """
        멀티 지표 기반 적합도 계산 (다중 기간 IC + 안정성 + 다양성).
        """
        ic_by_horizon: Dict[int, float] = {}
        ic_counts: Dict[int, int] = {}
        ic_series_collection: List[pd.Series] = []

        for horizon, _ in self.metric_weights["horizons"].items():
            future_ret = self.future_returns_cache.get(horizon)
            if future_ret is None:
                continue
            ic_series = cross_sectional_ic_series(factor_df, future_ret)
            ic_by_horizon[horizon] = float(ic_series.mean()) if not ic_series.empty else 0.0
            ic_counts[horizon] = int(ic_series.count())
            if not ic_series.empty:
                ic_series_collection.append(ic_series.rename(f"h{horizon}"))

        if ic_series_collection:
            combined_df = pd.concat(ic_series_collection, axis=1)
            combined_series = combined_df.mean(axis=1)
        else:
            combined_series = pd.Series(dtype=float)

        ic_volatility = float(combined_series.std(ddof=0)) if not combined_series.empty else 0.0
        ic_volatility = abs(ic_volatility)

        agg_ic = 0.0
        for horizon, weight in self.metric_weights["horizons"].items():
            agg_ic += weight * ic_by_horizon.get(horizon, 0.0)

        vol_floor = max(float(ic_volatility), 0.02)
        ic_ir = agg_ic / vol_floor
        if not np.isfinite(ic_ir):
            ic_ir = 0.0
        ic_ir = float(np.clip(ic_ir, -10.0, 10.0))

        turnover = compute_factor_turnover(factor_df)
        coverage = 0.0
        if len(factor_df) > 0:
            valid_points = int(combined_series.dropna().shape[0]) if not combined_series.empty else 0
            coverage = valid_points / float(len(factor_df))

        coverage_penalty = max(0.0, self.coverage_target - coverage)
        if not np.isfinite(coverage_penalty):
            coverage_penalty = 0.0

        metrics = FitnessMetrics(
            ic_by_horizon=ic_by_horizon,
            ic_counts=ic_counts,
            ic_aggregate=agg_ic,
            ic_volatility=ic_volatility,
            ic_ir=ic_ir,
            turnover=turnover if np.isfinite(turnover) else 0.0,
            coverage=coverage,
            penalty=coverage_penalty,
        )

        metrics.novelty = self.novelty_score(ind) if ind is not None else 0.0
        metrics.composite = self._compose_score(metrics)
        return metrics

    def _update_archive(self, ind: Individual, diversity_threshold: float) -> None:
        """
        다양성이 충분한 개체를 아카이브에 추가합니다.
        """
        if ind.factor_matrix is None or ind.factor_matrix.empty:
            return

        novelty = ind.metrics.novelty if ind.metrics else self.novelty_score(ind)
        if ind.metrics:
            ind.metrics.novelty = novelty
            ind.metrics.composite = self._compose_score(ind.metrics)
            ind.fitness = ind.metrics.composite

        diversity_gate = max(0.0, 1.0 - diversity_threshold)
        if novelty < diversity_gate:
            return

        if ind not in self.archive:
            self.archive.append(ind)
        if ind.pca_vec is None:
            try:
                ind.pca_vec = first_pc_vector(ind.factor_matrix)
            except Exception:
                ind.pca_vec = None

    def _tournament_select(self, population: List[Individual], k:int = 3) -> Individual:
        """
        토너먼트 선택으로 부모 선택 (IC 기반 적합도 우선).
        """
        if not population:
            raise ValueError("Population is empty")
        size = min(max(1, k), len(population))
        contenders = self.rng.sample(population, size)
        best = max(contenders, key=lambda ind: ind.fitness if np.isfinite(ind.fitness) else -np.inf)
        return best

    def _refresh_stale_population(self,
                                  population: List[Individual],
                                  depth:int,
                                  diversity_threshold:float) -> None:
        """
        일정 세대 동안 개선이 없는 개체(고령층)를 재시작하여 탐색 다양성 보강.
        """
        if not population:
            return

        worst_count = max(1, int(len(population) * 0.25))
        start_idx = len(population) - worst_count
        for idx in range(start_idx, len(population)):
            ind = population[idx]
            if ind.age < self.stale_age:
                continue
            new_tree = random_tree(self.rng, depth)
            new_ind = Individual(tree=new_tree)
            self.evaluate(new_ind)
            new_ind.age = 0
            new_ind.last_improved_gen = self._generation_counter
            population[idx] = new_ind
            self._update_archive(new_ind, diversity_threshold)

    def evaluate(self, ind: Individual) -> float:
        """
        개체 적합도 평가
        - 수식 트리를 실행하여 팩터 행렬 계산
        - 미래 수익률과 일자별 단면 상관(IC) 평균을 적합도로 사용
        - 계산 안전성 위해 inf/NaN → 0 처리
        """
        # 평가 횟수 추적 (너무 많이 출력하지 않도록 간헐적으로만)
        if not hasattr(self, '_eval_counter'):
            self._eval_counter = 0
        self._eval_counter += 1
        
        # 개체가 너무 복잡하면 스킵 (무한루프 방지)
        if ind.tree.depth() > 10:
            ind.fitness = 0.0
            return 0.0
            
        try:
            f = ind.tree.compile()
            val = f(self.ctx)

            # 결과 형태 정규화
            if isinstance(val, pd.Series):
                try:
                    if isinstance(val.index, pd.MultiIndex):
                        factor_df = val.unstack()
                    else:
                        if len(val) == len(self.close_df):
                            factor_df = pd.DataFrame(
                                np.tile(val.values.reshape(-1, 1), (1, self.close_df.shape[1])),
                                index=self.close_df.index,
                                columns=self.close_df.columns
                            )
                        else:
                            factor_df = self.close_df * 0.0
                except Exception:
                    factor_df = self.close_df * 0.0
            elif isinstance(val, pd.DataFrame):
                factor_df = val
            else:
                factor_df = self.close_df * 0.0

            factor_df = factor_df.replace([np.inf, -np.inf], 0).fillna(0)

            if factor_df.shape != self.close_df.shape:
                factor_df = factor_df.reindex(
                    index=self.close_df.index,
                    columns=self.close_df.columns,
                    fill_value=0
                )

            ind.factor_matrix = factor_df
            metrics = self._evaluate_factor_metrics(factor_df, ind)
            ind.metrics = metrics
            ind.fitness = float(metrics.composite) if np.isfinite(metrics.composite) else 0.0
            return ind.fitness

        except Exception as e:
            if self._eval_counter % 100 == 1:
                print(f"               ⚠️ 평가 에러 (#{self._eval_counter}): {str(e)[:50]}...")
            ind.fitness = 0.0
            ind.factor_matrix = self.close_df * 0.0
            ind.metrics = FitnessMetrics()
            ind.metrics.composite = 0.0
            ind.metrics.ic_aggregate = 0.0
            return 0.0

    def pca_sim_to_archive(self, ind: Individual, threshold: float = 0.9) -> float:
        """
        아카이브 내 개체들과 1주성분 벡터 유사도 최대값을 반환
        - threshold 미만이면 충분히 다양하다고 판단
        """
        if ind.factor_matrix is None:
            return 0.0
        if ind.pca_vec is None:
            ind.pca_vec = first_pc_vector(ind.factor_matrix)
        sims = []
        for e in self.archive:
            if e.pca_vec is None and e.factor_matrix is not None:
                e.pca_vec = first_pc_vector(e.factor_matrix)
            if e.pca_vec is not None:
                sims.append(float(np.corrcoef(ind.pca_vec, e.pca_vec)[0,1]))
        return max(sims) if sims else 0.0

    def init_population(self,
                        size:int,
                        depth:int,
                        warmstart_k:int=4,
                        diversity_threshold:float=0.9) -> List[Individual]:
        """
        초기 개체군 생성(워밍스타트): 루트 템플릿 기반 후보 K배 생성 후 상위 1/K 선택
        """
        cand: List[Individual] = []
        roots = DefaultSearchSpace.ROOT_TEMPLATES
        while len(cand) < size*warmstart_k:
            root = random.choice(roots).copy()
            while root.depth() < depth:
                if self.rng.random() < 0.5:
                    root = random_unary(self.rng, root)
                else:
                    root = random_binary(self.rng, root, random_terminal(self.rng))
            cand.append(Individual(tree=root))

        while len(cand) < size*warmstart_k:
            cand.append(Individual(tree=random_tree(self.rng, depth)))

        print(f"            🧮 개체 평가 중: {len(cand)}개 후보...")
        import time
        start_time = time.time()
        diversity_gate = max(0.0, 1.0 - diversity_threshold)

        for i, ind in enumerate(cand, 1):
            ind_start = time.time()
            self.evaluate(ind)
            ind.age = 0
            ind.last_improved_gen = 0
            if ind.metrics is None:
                ind.metrics = FitnessMetrics()
                ind.metrics.composite = ind.fitness
            novelty = ind.metrics.novelty if ind.metrics and np.isfinite(ind.metrics.novelty) else self.novelty_score(ind)
            if ind.metrics:
                ind.metrics.novelty = novelty
                ind.metrics.composite = self._compose_score(ind.metrics)
                ind.fitness = ind.metrics.composite
            ind_time = time.time() - ind_start

            if i % 10 == 0 or i == len(cand):
                elapsed = time.time() - start_time
                avg_time = elapsed / i
                remaining = (len(cand) - i) * avg_time
                print(f"               [{i:3d}/{len(cand)}] 평가 완료 (개체당 {ind_time:.2f}초, 예상 잔여 {remaining:.1f}초)...")
            if novelty >= diversity_gate:
                self.archive.append(ind)
                if ind.pca_vec is None and ind.factor_matrix is not None:
                    try:
                        ind.pca_vec = first_pc_vector(ind.factor_matrix)
                    except Exception:
                        ind.pca_vec = None

        print(f"            📊 평가 완료, 상위 선별 중...")
        cand.sort(key=lambda x: (-(x.fitness if np.isfinite(x.fitness) else -np.inf)))
        selected = cand[:max(1, len(cand)//warmstart_k)]
        return selected

    def evolve_one_depth(self,
                         depth:int,
                         population:int,
                         generations:int,
                         warmstart_k:int=4,
                         n_keep:int=25,
                         p_mutation:float=0.3,
                         p_crossover:float=0.7,
                         diversity_threshold:float=0.9) -> List[Individual]:
        """
        고정 깊이에서의 진화 루프
        - 부모-자식 치환, 다양성(1주성분 유사도) 필터, 엘리트 보관
        """
        print(f"         🌱 개체군 초기화 중 (크기={population})...")
        pop = self.init_population(population, depth, warmstart_k=warmstart_k, diversity_threshold=diversity_threshold)
        pop.sort(key=lambda x: (-(x.fitness if np.isfinite(x.fitness) else -np.inf)))

        valid_pop = [ind for ind in pop if np.isfinite(ind.fitness)]
        if valid_pop:
            leader = valid_pop[0]
            avg_init = np.mean([ind.fitness for ind in valid_pop])
            leader_metrics = leader.metrics.ic_by_horizon if leader.metrics else {}
            horizon_snapshot = ", ".join(
                [f"h{hz}:{leader_metrics.get(hz, 0.0):.3f}" for hz in sorted(self.metric_weights["horizons"].keys())]
            )
            print(f"         📊 초기 개체군: {len(valid_pop)}/{population}개 유효, 최고={leader.fitness:.4f}, 평균={avg_init:.4f}")
            if horizon_snapshot:
                print(f"            ↳ 기간별 IC: {horizon_snapshot}")
        else:
            print(f"         ⚠️ 초기 개체군: 유효한 개체 없음")

        for ind in pop:
            self._update_archive(ind, diversity_threshold)

        print(f"         🔄 진화 시작 ({generations}세대)...")
        for gen in range(generations):
            self._generation_counter += 1
            for ind in pop:
                ind.age += 1

            if gen % 5 == 0 or gen == generations - 1:
                valid_current = [ind for ind in pop if np.isfinite(ind.fitness)]
                if valid_current:
                    leader = valid_current[0]
                    avg_current = np.mean([ind.fitness for ind in valid_current])
                    metrics = leader.metrics
                    turnover_val = metrics.turnover if metrics else 0.0
                    coverage_val = metrics.coverage if metrics else 0.0
                    print(f"            🧬 세대 {gen+1:3d}/{generations}: 최고={leader.fitness:.4f}, 평균={avg_current:.4f}, 회전={turnover_val:.3f}, 커버리지={coverage_val:.2f}")
                else:
                    print(f"            🧬 세대 {gen+1:3d}/{generations}: 유효한 개체 없음")

            if len(pop) < 2:
                sole = pop[0]
                child_tree = mutate(self.rng, sole.tree)
                child_ind = Individual(tree=child_tree)
                self.evaluate(child_ind)
                child_ind.age = 0
                child_ind.last_improved_gen = self._generation_counter
                self._update_archive(child_ind, diversity_threshold)
                if child_ind.fitness > sole.fitness:
                    pop[0] = child_ind
                continue

            p1 = self._tournament_select(pop, k=3)
            p2 = self._tournament_select(pop, k=3)
            if p1 is p2 and len(pop) > 2:
                for _ in range(3):
                    candidate = self._tournament_select(pop, k=4)
                    if candidate is not p1:
                        p2 = candidate
                        break

            children: List[Individual] = []
            if self.rng.random() < p_crossover:
                c1_tree, c2_tree = crossover(self.rng, p1.tree, p2.tree)
                children.extend([Individual(tree=c1_tree), Individual(tree=c2_tree)])
            if self.rng.random() < p_mutation:
                children.append(Individual(tree=mutate(self.rng, p1.tree)))
                if len(pop) > 1:
                    children.append(Individual(tree=mutate(self.rng, p2.tree)))
            if not children:
                children.append(Individual(tree=mutate(self.rng, p1.tree)))

            prev_best = pop[0].fitness if pop else -np.inf

            for child in children:
                self.evaluate(child)
                child.age = 0
                child.last_improved_gen = self._generation_counter
                self._update_archive(child, diversity_threshold)

            pop.extend(children)
            pop.sort(key=lambda x: (-(x.fitness if np.isfinite(x.fitness) else -np.inf)))
            pop = pop[:population]

            if pop and pop[0].fitness > prev_best + 1e-6:
                pop[0].last_improved_gen = self._generation_counter

            if (gen + 1) % self.age_layer_span == 0:
                self._refresh_stale_population(pop, depth, diversity_threshold)
                pop.sort(key=lambda x: (-(x.fitness if np.isfinite(x.fitness) else -np.inf)))

        pop.sort(key=lambda x: (-(x.fitness if np.isfinite(x.fitness) else -np.inf)))
        elites: List[Individual] = []
        diversity_gate = max(0.0, 1.0 - diversity_threshold)
        for ind in pop:
            if len(elites) >= n_keep:
                break
            novelty = ind.metrics.novelty if ind.metrics else self.novelty_score(ind)
            if novelty >= diversity_gate or not elites:
                elites.append(ind)
        return elites

    def run(self,
            max_depth:int=3,
            population:int=60,
            generations:int=20,
            warmstart_k:int=4,
            n_keep_per_depth:int=25,
            p_mutation:float=0.3,
            p_crossover:float=0.7,
            diversity_threshold:float=0.9) -> List[Individual]:
        """
        깊이를 1→max_depth까지 확장하며 순차 탐색 후, 전체 엘리트 정렬 반환
        """
        print(f"      🏗️ 계층적 탐색 시작 (깊이 1→{max_depth})")
        all_elites: List[Individual] = []
        
        for depth in range(1, max_depth+1):
            print(f"      📐 [깊이 {depth}/{max_depth}] 진화 시작...")
            elites = self.evolve_one_depth(
                depth=depth,
                population=population,
                generations=generations,
                warmstart_k=warmstart_k,
                n_keep=n_keep_per_depth,
                p_mutation=p_mutation,
                p_crossover=p_crossover,
                diversity_threshold=diversity_threshold,
            )
            all_elites.extend(elites)
            
            # 해당 깊이 결과 요약
            valid_elites = [e for e in elites if np.isfinite(e.fitness)]
            if valid_elites:
                valid_elites.sort(key=lambda x: (-(x.fitness if np.isfinite(x.fitness) else -np.inf)))
                leader = valid_elites[0]
                best_score = leader.fitness
                avg_score = np.mean([e.fitness for e in valid_elites])
                leader_metrics = leader.metrics
                turnover_val = leader_metrics.turnover if leader_metrics else 0.0
                horizon_snapshot = ""
                if leader_metrics:
                    horizon_snapshot = ", ".join(
                        [f"h{hz}:{leader_metrics.ic_by_horizon.get(hz, 0.0):.3f}" for hz in sorted(self.metric_weights["horizons"].keys())]
                    )
                print(f"         ✅ 완료: {len(valid_elites)}개 엘리트, 최고점={best_score:.4f}, 평균점수={avg_score:.4f}, 회전={turnover_val:.3f}")
                if horizon_snapshot:
                    print(f"            ↳ 기간별 IC: {horizon_snapshot}")
            else:
                print(f"         ⚠️ 완료: 유효한 엘리트 없음")
        
        all_elites.sort(key=lambda x: (-(x.fitness if np.isfinite(x.fitness) else -np.inf)))
        valid_total = len([e for e in all_elites if np.isfinite(e.fitness)])
        print(f"      🎯 계층적 탐색 완료: 총 {valid_total}개 유효 엘리트")
        
        return all_elites


HEADER = '''# -*- coding: utf-8 -*-
"""
자동 생성된 알파 모음 (GA 결과)
- 파일 생성시각: {ts}
- 참고: autoalpha_ga.write_new_alphas_file()가 생성
주의: 수동 수정 시 재생성 시 덮어씌워집니다.
"""

import pandas as pd
import numpy as np
from Alphas import (
    Alphas,
    ts_sum, sma, stddev, correlation, covariance,
    ts_rank, product, ts_min, ts_max, delta, delay, rank, scale,
    ts_argmax, ts_argmin, decay_linear,
    safe_clean, adv, floor_window
)

# min/max 연산을 위한 numpy import 확실히 하기
import numpy as np

class NewAlphas(Alphas):
    """
    GA로 발굴된 알파 팩터 모음.
    각 메서드는 pandas Series(또는 DataFrame의 열 시리즈)를 반환해야 합니다.
    """
'''

def write_new_alphas_file(elites: List[Individual], out_path: Optional[str] = None):
    """
    상위 개체들을 `backend_module/NewAlphas.py`로 직렬화하여 저장합니다.
    - out_path를 지정하지 않으면 이 파일 기준 상대경로로 backend_module/NewAlphas.py에 기록합니다.
    - 기존 파일은 덮어씌워집니다.
    """
    if out_path is None:
        # 폴더 존재 확인 및 생성
        os.makedirs(BACKEND_MODULE_DIR, exist_ok=True)
        out_path = os.path.join(BACKEND_MODULE_DIR, "NewAlphas.py")

    lines = [HEADER.format(ts=pd.Timestamp.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC"))]
    for i, ind in enumerate(elites, start=1):
        name = f"alphaGA{i:03d}"
        expr = ind.tree.to_python_expr()
        body = f"        out = ({expr})\n        return out.replace([np.inf, -np.inf], 0).fillna(0)\n"
        func = f"    def {name}(self):\n{body}\n"
        lines.append(func)

    with open(out_path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))
    return out_path


if __name__ == "__main__":
    msg = (
        "[AutoAlpha GA]\n"
        "- 이 스크립트는 라이브러리 형태입니다.\n"
        "- 실제 실행 시에는 사용자 데이터(df_data)를 구성하여 AutoAlphaGA(df_data)로 생성하세요.\n"
        "- run() 호출 후 write_new_alphas_file()로 NewAlphas.py를 생성하세요.\n"
    )
    print(msg)
