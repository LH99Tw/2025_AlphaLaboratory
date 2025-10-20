from __future__ import annotations

import textwrap
from dataclasses import dataclass
from typing import Any, Callable, Dict, Optional, Tuple

import numpy as np
import pandas as pd

from .base import AlphaDataset, AlphaExecutionError

TRANSPILER_VERSION = "2025.01"


class AlphaTranspilerError(ValueError):
    """알파 표현식이 트랜스파일될 수 없을 때 발생합니다."""


def _build_allowed_globals() -> Dict[str, Any]:
    """알파 표현식에서 사용할 수 있는 헬퍼 함수들을 노출합니다."""
    from backend_module.Alphas import (
        adv,
        correlation,
        covariance,
        decay_linear,
        delta,
        delay,
        floor_window,
        product,
        rank,
        safe_clean,
        scale,
        sma,
        stddev,
        ts_argmax,
        ts_argmin,
        ts_max,
        ts_min,
        ts_rank,
        ts_sum,
    )

    safe_builtins = {
        "abs": abs,
        "min": min,
        "max": max,
        "pow": pow,
        "round": round,
    }

    globals_map: Dict[str, Any] = {
        "__builtins__": safe_builtins,
        "np": np,
        "pd": pd,
        "adv": adv,
        "correlation": correlation,
        "covariance": covariance,
        "decay_linear": decay_linear,
        "delta": delta,
        "delay": delay,
        "floor_window": floor_window,
        "product": product,
        "rank": rank,
        "safe_clean": safe_clean,
        "scale": scale,
        "sma": sma,
        "stddev": stddev,
        "ts_argmax": ts_argmax,
        "ts_argmin": ts_argmin,
        "ts_max": ts_max,
        "ts_min": ts_min,
        "ts_rank": ts_rank,
        "ts_sum": ts_sum,
        # 표현식에서 자주 사용되는 편리한 넘파이 약어들
        "sign": np.sign,
        "log": np.log,
        "exp": np.exp,
        "sqrt": np.sqrt,
    }
    return globals_map


ALPHA_GLOBALS = _build_allowed_globals()


@dataclass
class TranspiledAlpha:
    """컴파일된 호출 가능 객체와 메타데이터를 위한 컨테이너."""

    name: Optional[str]
    expression: str
    callable: Callable[[AlphaDataset], pd.Series]
    python_source: str
    globals_hash: int
    version: str = TRANSPILER_VERSION


def _coerce_to_series(result: Any, dataset: AlphaDataset) -> pd.Series:
    """트랜스파일된 표현식 출력이 판다스 시리즈인지 확인합니다."""
    if isinstance(result, pd.Series):
        return result

    if isinstance(result, pd.DataFrame):
        if result.shape[1] == 1:
            return result.iloc[:, 0]
        raise AlphaExecutionError("Expression returned DataFrame with multiple columns")

    if isinstance(result, (np.ndarray, list, tuple)):
        if len(result) == len(dataset.frame.index):
            return pd.Series(result, index=dataset.frame.index)
        raise AlphaExecutionError("Expression output length does not match dataset index")

    # Broadcast scalars across the index
    if np.isscalar(result):
        return pd.Series(result, index=dataset.frame.index)

    raise AlphaExecutionError(f"Unsupported expression output type: {type(result).__name__}")


def compile_expression(expression: str, *, name: Optional[str] = None) -> TranspiledAlpha:
    """
    알파 표현식 문자열을 실행 가능한 호출 가능 객체로 컴파일합니다.

    매개변수
    ----------
    expression:
        별칭 네임스페이스를 사용하는 문자열 공식 (`close`, `volume`, ...).
    name:
        디버깅이나 소스 렌더링을 위한 선택적 이름.
    """
    if not expression or not expression.strip():
        raise AlphaTranspilerError("Alpha expression cannot be empty")

    expression = expression.strip()
    if "self." in expression:
        expression = expression.replace("self.", "")
    filename = f"<alpha:{name or 'expression'}>"

    try:
        code_object = compile(expression, filename, "eval")
    except SyntaxError as exc:
        raise AlphaTranspilerError(f"Expression syntax error: {exc}") from exc

    globals_hash = hash(tuple(sorted(ALPHA_GLOBALS.keys())))

    def _call(dataset: AlphaDataset) -> pd.Series:
        locals_env = dataset.build_eval_locals()
        try:
            result = eval(code_object, ALPHA_GLOBALS, locals_env)  # noqa: S307 - controlled globals
        except Exception as exc:  # pragma: no cover - surface as runtime error
            raise AlphaExecutionError(f"Alpha evaluation failed: {exc}") from exc
        return _coerce_to_series(result, dataset)

    python_source = render_function_source(name or "alpha_formula", expression)

    return TranspiledAlpha(
        name=name,
        expression=expression,
        callable=_call,
        python_source=python_source,
        globals_hash=globals_hash,
    )


def render_function_source(function_name: str, expression: str) -> str:
    """
    표현식을 재사용 가능한 파이썬 함수 정의로 렌더링합니다.
    """
    safe_name = function_name or "alpha_formula"
    body = textwrap.dedent(
        f"""
        def {safe_name}(dataset):
            \"\"\"Auto-generated alpha formula (v{TRANSPILER_VERSION}).\"\"\"
            env = dataset.build_eval_locals()
            return eval({expression!r}, ALPHA_GLOBALS, env)
        """
    ).strip()
    return body
