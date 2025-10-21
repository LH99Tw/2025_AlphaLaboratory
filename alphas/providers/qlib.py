from __future__ import annotations

from typing import Dict, List, Tuple

import warnings

import numpy as np
import pandas as pd
from scipy.stats import rankdata

from ..base import AlphaDefinition, AlphaDataset
from ..registry import AlphaRegistry


# ---------------------------------------------------------------------------
# Generic helpers
# ---------------------------------------------------------------------------

def _ensure_series(value, index: pd.Index) -> pd.Series:
    """Ensure the result is a pandas Series aligned to the dataset index."""
    if isinstance(value, pd.Series):
        return value.astype(float)
    if isinstance(value, pd.DataFrame):
        return value.iloc[:, 0].astype(float)
    if isinstance(value, np.ndarray):
        if value.ndim != 1:
            raise ValueError("Unsupported ndarray shape for alpha output")
        return pd.Series(value, index=index, dtype=float)
    if np.isscalar(value):
        return pd.Series(np.full(len(index), float(value)), index=index)
    raise TypeError(f"Unsupported alpha output type: {type(value)!r}")


def _binary_op(a, b, op):
    if isinstance(a, pd.Series) and isinstance(b, pd.Series):
        left, right = a.align(b, join="inner")
        return pd.Series(op(left.to_numpy(dtype=float), right.to_numpy(dtype=float)), index=left.index)
    if isinstance(a, pd.Series):
        return pd.Series(op(a.to_numpy(dtype=float), float(b)), index=a.index)
    if isinstance(b, pd.Series):
        return pd.Series(op(float(a), b.to_numpy(dtype=float)), index=b.index)
    return float(op(float(a), float(b)))


def _abs_like(x):
    if isinstance(x, pd.Series):
        return x.abs()
    if isinstance(x, np.ndarray):
        return np.abs(x)
    return abs(float(x))


def _rolling(series: pd.Series, window: int):
    window = int(window)
    if window < 1:
        raise ValueError("Window size must be >= 1")
    return series.astype(float).rolling(window, min_periods=window)


def _ref(series: pd.Series, period: int) -> pd.Series:
    return series.shift(int(period))


def _mean(series: pd.Series, window: int) -> pd.Series:
    return _rolling(series, window).mean()


def _sum(series: pd.Series, window: int) -> pd.Series:
    return _rolling(series, window).sum()


def _std(series: pd.Series, window: int) -> pd.Series:
    return _rolling(series, window).std(ddof=0)


def _max(series: pd.Series, window: int) -> pd.Series:
    return _rolling(series, window).max()


def _min(series: pd.Series, window: int) -> pd.Series:
    return _rolling(series, window).min()


def _quantile(series: pd.Series, window: int, quantile: float) -> pd.Series:
    return _rolling(series, window).quantile(float(quantile))


def _rank(series: pd.Series, window: int) -> pd.Series:
    window = int(window)

    def _calc(values: np.ndarray) -> float:
        ranked = rankdata(values, method="average")
        return ranked[-1] / len(values)

    return _rolling(series, window).apply(_calc, raw=True)


def _idxmax(series: pd.Series, window: int) -> pd.Series:
    def _calc(values: np.ndarray) -> float:
        return float(np.argmax(values) + 1)

    return _rolling(series, window).apply(_calc, raw=True)


def _idxmin(series: pd.Series, window: int) -> pd.Series:
    def _calc(values: np.ndarray) -> float:
        return float(np.argmin(values) + 1)

    return _rolling(series, window).apply(_calc, raw=True)


def _slope(series: pd.Series, window: int) -> pd.Series:
    window = int(window)
    if window <= 1:
        return pd.Series(0.0, index=series.index)

    def _calc(values: np.ndarray) -> float:
        x = np.arange(len(values), dtype=float)
        with warnings.catch_warnings():
            warnings.simplefilter("ignore", np.RankWarning)
            slope, _ = np.polyfit(x, values, deg=1)
        return float(slope)

    return _rolling(series, window).apply(_calc, raw=True)


def _rsquare(series: pd.Series, window: int) -> pd.Series:
    window = int(window)
    if window <= 1:
        return pd.Series(0.0, index=series.index)

    def _calc(values: np.ndarray) -> float:
        x = np.arange(len(values), dtype=float)
        with warnings.catch_warnings():
            warnings.simplefilter("ignore", np.RankWarning)
            slope, intercept = np.polyfit(x, values, deg=1)
        fitted = intercept + slope * x
        ss_res = np.sum((values - fitted) ** 2)
        ss_tot = np.sum((values - values.mean()) ** 2)
        if ss_tot == 0:
            return 0.0
        return 1.0 - ss_res / ss_tot

    return _rolling(series, window).apply(_calc, raw=True)


def _resi(series: pd.Series, window: int) -> pd.Series:
    window = int(window)
    if window <= 1:
        return pd.Series(0.0, index=series.index)

    def _calc(values: np.ndarray) -> float:
        x = np.arange(len(values), dtype=float)
        with warnings.catch_warnings():
            warnings.simplefilter("ignore", np.RankWarning)
            slope, intercept = np.polyfit(x, values, deg=1)
        fitted_last = intercept + slope * x[-1]
        return float(values[-1] - fitted_last)

    return _rolling(series, window).apply(_calc, raw=True)


def _corr(left: pd.Series, right: pd.Series, window: int) -> pd.Series:
    aligned_left, aligned_right = left.astype(float).align(right.astype(float), join="inner")
    return aligned_left.rolling(int(window), min_periods=int(window)).corr(aligned_right)


def _greater(a, b):
    return _binary_op(a, b, np.maximum)


def _less(a, b):
    return _binary_op(a, b, np.minimum)


def _log(series):
    if isinstance(series, pd.Series):
        return np.log(series)
    return float(np.log(series))


def _build_environment(dataset: AlphaDataset) -> Dict[str, object]:
    close = dataset.get_series("close")
    open_ = dataset.get_series("open")
    high = dataset.get_series("high")
    low = dataset.get_series("low")
    vwap = dataset.get_series("vwap")
    volume = dataset.get_series("volume")

    return {
        "close": close,
        "open": open_,
        "high": high,
        "low": low,
        "vwap": vwap,
        "volume": volume,
        # qlib style operators
        "Ref": _ref,
        "Mean": _mean,
        "Std": _std,
        "Sum": _sum,
        "Max": _max,
        "Min": _min,
        "Quantile": _quantile,
        "Rank": _rank,
        "IdxMax": _idxmax,
        "IdxMin": _idxmin,
        "Slope": _slope,
        "Rsquare": _rsquare,
        "Resi": _resi,
        "Corr": _corr,
        "Greater": _greater,
        "Less": _less,
        "Abs": _abs_like,
        "Log": _log,
        "np": np,
    }


def _translate_expression(expression: str) -> str:
    replacements = {
        "$close": "close",
        "$open": "open",
        "$high": "high",
        "$low": "low",
        "$vwap": "vwap",
        "$volume": "volume",
    }
    translated = expression
    for source, target in replacements.items():
        translated = translated.replace(source, target)
    return translated


def _build_definition(name: str, expression: str, family: str) -> AlphaDefinition:
    compiled_expression = _translate_expression(expression)
    code = compile(compiled_expression, f"<qlib:{family}:{name}>", "eval")

    def _compute(dataset: AlphaDataset):
        env = _build_environment(dataset)
        result = eval(code, {"__builtins__": {}}, env)  # noqa: S307 - controlled environment
        return _ensure_series(result, dataset.frame.index)

    return AlphaDefinition(
        name=name,
        compute=_compute,
        source="shared",
        provider="qlib",
        description=f"Qlib {family.upper()} feature",
        metadata={
            "family": family,
            "original_expression": expression,
            "compiled_expression": compiled_expression,
        },
    )


# ---------------------------------------------------------------------------
# Alpha builders
# ---------------------------------------------------------------------------

def _alpha360_specs() -> List[Tuple[str, str]]:
    specs: List[Tuple[str, str]] = []

    for field, alias in (
        ("close", "CLOSE"),
        ("open", "OPEN"),
        ("high", "HIGH"),
        ("low", "LOW"),
        ("vwap", "VWAP"),
    ):
        for i in range(59, 0, -1):
            specs.append((f"QLIB360_{alias}{i}", f"Ref(${field}, {i})/$close"))
        specs.append((f"QLIB360_{alias}0", f"${field}/$close"))

    for i in range(59, 0, -1):
        specs.append((f"QLIB360_VOLUME{i}", f"Ref($volume, {i})/($volume+1e-12)"))
    specs.append(("QLIB360_VOLUME0", "$volume/($volume+1e-12)"))

    return specs


def _alpha158_specs() -> List[Tuple[str, str]]:
    fields: List[str] = []
    names: List[str] = []

    # kbar features
    fields += [
        "($close-$open)/$open",
        "($high-$low)/$open",
        "($close-$open)/($high-$low+1e-12)",
        "($high-Greater($open, $close))/$open",
        "($high-Greater($open, $close))/($high-$low+1e-12)",
        "(Less($open, $close)-$low)/$open",
        "(Less($open, $close)-$low)/($high-$low+1e-12)",
        "(2*$close-$high-$low)/$open",
        "(2*$close-$high-$low)/($high-$low+1e-12)",
    ]
    names += [
        "KMID",
        "KLEN",
        "KMID2",
        "KUP",
        "KUP2",
        "KLOW",
        "KLOW2",
        "KSFT",
        "KSFT2",
    ]

    # price windows
    price_windows = [0, 1, 2, 3, 4]
    for feature in ["open", "high", "low", "close", "vwap"]:
        fields += [
            f"Ref(${feature}, {d})/$close" if d != 0 else f"${feature}/$close"
            for d in price_windows
        ]
        names += [feature.upper() + str(d) for d in price_windows]

    # volume windows
    volume_windows = [0, 1, 2, 3, 4]
    fields += [
        f"Ref($volume, {d})/($volume+1e-12)" if d != 0 else "$volume/($volume+1e-12)"
        for d in volume_windows
    ]
    names += ["VOLUME" + str(d) for d in volume_windows]

    # rolling operators
    rolling_windows = [5, 10, 20, 30, 60]
    rolling_features = [
        "ROC",
        "MA",
        "STD",
        "BETA",
        "RSQR",
        "RESI",
        "MAX",
        "LOW",
        "QTLU",
        "QTLD",
        "RANK",
        "RSV",
        "IMAX",
        "IMIN",
        "IMXD",
        "CORR",
        "CORD",
        "CNTP",
        "CNTN",
        "CNTD",
        "SUMP",
        "SUMN",
        "SUMD",
        "VMA",
        "VSTD",
        "WVMA",
        "VSUMP",
        "VSUMN",
        "VSUMD",
    ]

    def use(feature: str) -> bool:
        return feature in rolling_features

    for window in rolling_windows:
        if use("ROC"):
            fields.append(f"Ref($close, {window})/$close")
            names.append(f"ROC{window}")
        if use("MA"):
            fields.append(f"Mean($close, {window})/$close")
            names.append(f"MA{window}")
        if use("STD"):
            fields.append(f"Std($close, {window})/$close")
            names.append(f"STD{window}")
        if use("BETA"):
            fields.append(f"Slope($close, {window})/$close")
            names.append(f"BETA{window}")
        if use("RSQR"):
            fields.append(f"Rsquare($close, {window})")
            names.append(f"RSQR{window}")
        if use("RESI"):
            fields.append(f"Resi($close, {window})/$close")
            names.append(f"RESI{window}")
        if use("MAX"):
            fields.append(f"Max($high, {window})/$close")
            names.append(f"MAX{window}")
        if use("LOW"):
            fields.append(f"Min($low, {window})/$close")
            names.append(f"MIN{window}")
        if use("QTLU"):
            fields.append(f"Quantile($close, {window}, 0.8)/$close")
            names.append(f"QTLU{window}")
        if use("QTLD"):
            fields.append(f"Quantile($close, {window}, 0.2)/$close")
            names.append(f"QTLD{window}")
        if use("RANK"):
            fields.append(f"Rank($close, {window})")
            names.append(f"RANK{window}")
        if use("RSV"):
            fields.append(
                f"($close-Min($low, {window}))/(Max($high, {window})-Min($low, {window})+1e-12)"
            )
            names.append(f"RSV{window}")
        if use("IMAX"):
            fields.append(f"IdxMax($high, {window})/{window}")
            names.append(f"IMAX{window}")
        if use("IMIN"):
            fields.append(f"IdxMin($low, {window})/{window}")
            names.append(f"IMIN{window}")
        if use("IMXD"):
            fields.append(f"(IdxMax($high, {window})-IdxMin($low, {window}))/{window}")
            names.append(f"IMXD{window}")
        if use("CORR"):
            fields.append(f"Corr($close, Log($volume+1), {window})")
            names.append(f"CORR{window}")
        if use("CORD"):
            fields.append(f"Corr($close/Ref($close, 1), Log($volume/Ref($volume, 1)+1), {window})")
            names.append(f"CORD{window}")
        if use("CNTP"):
            fields.append(f"Mean($close>Ref($close, 1), {window})")
            names.append(f"CNTP{window}")
        if use("CNTN"):
            fields.append(f"Mean($close<Ref($close, 1), {window})")
            names.append(f"CNTN{window}")
        if use("CNTD"):
            fields.append(
                f"Mean($close>Ref($close, 1), {window})-Mean($close<Ref($close, 1), {window})"
            )
            names.append(f"CNTD{window}")
        if use("SUMP"):
            fields.append(
                f"Sum(Greater($close-Ref($close, 1), 0), {window})/"
                f"(Sum(Abs($close-Ref($close, 1)), {window})+1e-12)"
            )
            names.append(f"SUMP{window}")
        if use("SUMN"):
            fields.append(
                f"Sum(Greater(Ref($close, 1)-$close, 0), {window})/"
                f"(Sum(Abs($close-Ref($close, 1)), {window})+1e-12)"
            )
            names.append(f"SUMN{window}")
        if use("SUMD"):
            fields.append(
                "("
                f"Sum(Greater($close-Ref($close, 1), 0), {window})"
                f"-Sum(Greater(Ref($close, 1)-$close, 0), {window})"
                f")/(Sum(Abs($close-Ref($close, 1)), {window})+1e-12)"
            )
            names.append(f"SUMD{window}")
        if use("VMA"):
            fields.append(f"Mean($volume, {window})/($volume+1e-12)")
            names.append(f"VMA{window}")
        if use("VSTD"):
            fields.append(f"Std($volume, {window})/($volume+1e-12)")
            names.append(f"VSTD{window}")
        if use("WVMA"):
            fields.append(
                "Std(Abs($close/Ref($close, 1)-1)*$volume, {w})/"
                "(Mean(Abs($close/Ref($close, 1)-1)*$volume, {w})+1e-12)".format(w=window)
            )
            names.append(f"WVMA{window}")
        if use("VSUMP"):
            fields.append(
                f"Sum(Greater($volume-Ref($volume, 1), 0), {window})/"
                f"(Sum(Abs($volume-Ref($volume, 1)), {window})+1e-12)"
            )
            names.append(f"VSUMP{window}")
        if use("VSUMN"):
            fields.append(
                f"Sum(Greater(Ref($volume, 1)-$volume, 0), {window})/"
                f"(Sum(Abs($volume-Ref($volume, 1)), {window})+1e-12)"
            )
            names.append(f"VSUMN{window}")
        if use("VSUMD"):
            fields.append(
                "("
                f"Sum(Greater($volume-Ref($volume, 1), 0), {window})"
                f"-Sum(Greater(Ref($volume, 1)-$volume, 0), {window})"
                f")/(Sum(Abs($volume-Ref($volume, 1)), {window})+1e-12)"
            )
            names.append(f"VSUMD{window}")

    return [(f"QLIB158_{name}", expr) for name, expr in zip(names, fields)]


# ---------------------------------------------------------------------------
# Public registration API
# ---------------------------------------------------------------------------

def register_qlib_alphas(
    registry: AlphaRegistry,
    *,
    include_alpha360: bool = True,
    include_alpha158: bool = True,
) -> None:
    definitions: List[AlphaDefinition] = []

    if include_alpha360:
        definitions.extend(
            _build_definition(name, expr, family="alpha360") for name, expr in _alpha360_specs()
        )
    if include_alpha158:
        definitions.extend(
            _build_definition(name, expr, family="alpha158") for name, expr in _alpha158_specs()
        )

    registry.extend(definitions, overwrite=True)


__all__ = ["register_qlib_alphas"]
