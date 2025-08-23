# 2.x_fill_sec_financials.py
import os
import gc
import io
import json
import time
import math
import gzip
import shutil
import typing as t
from datetime import datetime
from collections import defaultdict

import numpy as np
import pandas as pd
import requests

# =========================
# Paths / Config
# =========================
ROOT = os.path.dirname(os.path.abspath(__file__))
DB_DIR = os.path.join(os.path.dirname(ROOT), 'database')
os.makedirs(DB_DIR, exist_ok=True)

PRICES_CSV = os.path.join(DB_DIR, 'sp500_data.csv')  # 네가 이미 만들어둔 가격+기본열 CSV
SUCCESSOR_JSON = os.path.join(DB_DIR, 'sp500_successor_map.json')  # 네가 만든 승계티커 맵(선택)
COMPANY_TICKERS_JSON = os.path.join(DB_DIR, 'company_tickers.json')  # SEC 매핑 캐시
SEC_CACHE_DIR = os.path.join(DB_DIR, 'sec_cache_companyfacts')       # SEC API 로컬 캐시
os.makedirs(SEC_CACHE_DIR, exist_ok=True)

# SEC API
SEC_BASE = "https://data.sec.gov"
UA = os.environ.get(
    "SEC_USER_AGENT",
    "YourOrg YourApp (contact@example.com)"  # 실제 메일/조직으로 바꿔두면 좋아요
)
HEADERS = {
    "User-Agent": UA,
    "Accept": "application/json",
    "Host": "data.sec.gov",
}
# 요청 속도: 보수적으로 3~5 req/s 권장
MIN_SLEEP_SEC = float(os.environ.get("SEC_MIN_SLEEP", "0.25"))

# =========================
# Utils
# =========================
def load_successor_map() -> dict:
    if os.path.exists(SUCCESSOR_JSON):
        with open(SUCCESSOR_JSON, "r") as f:
            data = json.load(f)
        # JSON이 {"mappings":{...}} 구조면 꺼내기
        if isinstance(data, dict) and "mappings" in data:
            return data["mappings"]
        return data
    return {}

SUCCESSOR_MAP = load_successor_map()

def map_ticker_to_successor(t: str) -> str:
    """
    승계맵이 {TICKER: {"to": "NEW", ...}} 또는 {TICKER: "NEW"} 등 다양한 형태일 수 있어 유연 처리.
    """
    if not isinstance(t, str):
        return t
    key = t.upper()
    v = SUCCESSOR_MAP.get(key)
    if not v:
        return t
    if isinstance(v, dict):
        to = v.get("to")
        return to or t
    if isinstance(v, str):
        return v
    return t

def norm_yahoo_symbol(sym: str) -> str:
    if not isinstance(sym, str):
        return sym
    # BRK.B → BRK-B 등
    if '.' in sym:
        return sym.replace('.', '-')
    return sym

def uniq_keep_order(seq):
    seen, out = set(), []
    for x in seq:
        if x not in seen:
            seen.add(x); out.append(x)
    return out

# =========================
# SEC company_tickers.json 보장
# =========================
def ensure_company_tickers_json():
    """
    company_tickers.json이 없으면 SEC에서 내려받아 저장.
    https://www.sec.gov/files/company_tickers.json
    포맷: { "0":{"cik_str":..., "ticker":"A", "title":"..."}, "1":{...}, ... }
    """
    if os.path.exists(COMPANY_TICKERS_JSON):
        return
    url = "https://www.sec.gov/files/company_tickers.json"
    print("Downloading SEC company_tickers.json ...")
    r = requests.get(url, headers=HEADERS, timeout=30)
    r.raise_for_status()
    with open(COMPANY_TICKERS_JSON, "wb") as f:
        f.write(r.content)
    time.sleep(MIN_SLEEP_SEC)

def load_company_tickers() -> pd.DataFrame:
    ensure_company_tickers_json()
    with open(COMPANY_TICKERS_JSON, "r") as f:
        data = json.load(f)
    # dict index → rows
    rows = []
    for _, v in data.items():
        rows.append({
            "cik": str(v.get("cik_str", "")).zfill(10),
            "ticker": str(v.get("ticker", "")).upper(),
            "title": v.get("title", ""),
        })
    df = pd.DataFrame(rows).drop_duplicates(subset=["ticker"])
    return df

COMPANY_TICKERS_DF = load_company_tickers()

def find_cik_for_ticker(ticker: str) -> t.Optional[str]:
    """
    1) 원티커
    2) 승계맵 to
    3) 야후표기(점→대시)
    세 순서로 탐색.
    """
    if not isinstance(ticker, str):
        return None
    cand = uniq_keep_order([
        ticker.upper(),
        map_ticker_to_successor(ticker).upper(),
        norm_yahoo_symbol(ticker).upper()
    ])
    for tk in cand:
        row = COMPANY_TICKERS_DF[COMPANY_TICKERS_DF["ticker"] == tk]
        if not row.empty:
            return row.iloc[0]["cik"]
    return None

# =========================
# SEC companyfacts fetch (캐시+백오프)
# =========================
SESSION = requests.Session()
SESSION.headers.update(HEADERS)

def sec_get(url: str) -> dict:
    """
    SEC GET with 간단 재시도/429 백오프 + 캐시.
    """
    # 파일 캐시 키
    key = url.replace("/", "_")
    cache_path = os.path.join(SEC_CACHE_DIR, key + ".json")

    if os.path.exists(cache_path):
        with open(cache_path, "r") as f:
            return json.load(f)

    attempts = 0
    last_err = None
    while attempts < 5:
        attempts += 1
        try:
            resp = SESSION.get(url, timeout=30)
            if resp.status_code == 200:
                data = resp.json()
                with open(cache_path, "w") as f:
                    json.dump(data, f)
                time.sleep(MIN_SLEEP_SEC)
                return data
            elif resp.status_code in (429, 503):
                # Rate limit / service unavailable
                retry_after = resp.headers.get("Retry-After")
                wait = float(retry_after) if retry_after and retry_after.isdigit() else MIN_SLEEP_SEC * (2 ** attempts)
                wait = min(wait, 10.0)
                print(f"[SEC {resp.status_code}] Backing off {wait:.2f}s for {url}")
                time.sleep(wait)
            else:
                print(f"[SEC {resp.status_code}] {url}")
                last_err = Exception(f"HTTP {resp.status_code}")
                time.sleep(MIN_SLEEP_SEC)
        except Exception as e:
            last_err = e
            time.sleep(MIN_SLEEP_SEC * (2 ** attempts))
    if last_err:
        raise last_err
    return {}

def get_company_facts(cik: str) -> t.Optional[dict]:
    if not cik:
        return None
    cik_padded = str(cik).zfill(10)
    url = f"{SEC_BASE}/api/xbrl/companyfacts/CIK{cik_padded}.json"
    try:
        return sec_get(url)
    except Exception as e:
        print(f"companyfacts fetch failed for CIK {cik_padded}: {e}")
        return None

# =========================
# Facts → time series 추출
# =========================
def _pick_unit(block: dict, preferred: t.Sequence[str]) -> t.Optional[str]:
    """block['units']에서 선호 단위를 고름"""
    units = block.get("units", {})
    for u in preferred:
        if u in units:
            return u
    # 아무거나 하나
    return next(iter(units.keys()), None)

def _series_from_fact(block: dict, unit: str) -> pd.DataFrame:
    """
    해당 unit 리스트를 pandas 시리즈로 변환 (end 날짜 기준).
    여러 보고서가 같은 end일을 가질 수 있어 마지막값 우선.
    """
    items = block.get("units", {}).get(unit, [])
    rows = []
    for it in items:
        end = it.get("end") or it.get("fy")  # end가 표준
        val = it.get("val")
        if end is None or val is None:
            continue
        try:
            d = pd.to_datetime(end)
        except Exception:
            continue
        rows.append((d, float(val)))
    if not rows:
        return pd.DataFrame(columns=["date", "value"]).astype({"date":"datetime64[ns]", "value":"float64"})
    df = pd.DataFrame(rows, columns=["date", "value"]).sort_values("date")
    # 같은 date 중 마지막 값 사용
    df = df.groupby("date", as_index=False).last()
    return df

TAG_SETS = {
    "EPS": [
        ("us-gaap", "EarningsPerShareBasic", ["USD/shares"]),
        ("us-gaap", "EarningsPerShareDiluted", ["USD/shares"]),
    ],
    "Revenue": [
        ("us-gaap", "Revenues", ["USD"]),
        ("us-gaap", "SalesRevenueNet", ["USD"]),
        ("us-gaap", "RevenueFromContractWithCustomerExcludingAssessedTax", ["USD"]),
        ("us-gaap", "RevenueFromContractWithCustomerIncludingAssessedTax", ["USD"]),
    ],
    "Net_Income": [
        ("us-gaap", "NetIncomeLoss", ["USD"]),
        ("us-gaap", "ProfitLoss", ["USD"]),
        ("us-gaap", "NetIncomeLossAvailableToCommonStockholdersBasic", ["USD"]),
    ],
    "Total_Assets": [
        ("us-gaap", "Assets", ["USD"]),
    ],
    "Total_Debt": [
        # 부채 계정은 회사별 표기가 다양 → 가급적 총부채 근사
        ("us-gaap", "Debt", ["USD"]),
        ("us-gaap", "LongTermDebtNoncurrent", ["USD"]),
        ("us-gaap", "LongTermDebt", ["USD"]),
        ("us-gaap", "ShortTermBorrowings", ["USD"]),
        ("us-gaap", "CurrentPortionOfLongTermDebt", ["USD"]),
        ("us-gaap", "DebtCurrent", ["USD"]),
        ("us-gaap", "Liabilities", ["USD"]),  # 최후수단(총부채)
    ],
    "Cash": [
        ("us-gaap", "CashAndCashEquivalentsAtCarryingValue", ["USD"]),
        ("us-gaap", "CashCashEquivalentsAndShortTermInvestments", ["USD"]),
    ],
}

def extract_financial_series(facts: dict) -> dict:
    """
    facts(json) → {metric: DataFrame(date,value)} 사전.
    가장 먼저 성공하는 태그/유닛을 채택.
    """
    if not facts or "facts" not in facts:
        return {}
    out = {}
    for metric, candidates in TAG_SETS.items():
        series_list = []
        for ns, tag, unit_pref in candidates:
            block = facts["facts"].get(ns, {}).get(tag)
            if not block:
                continue
            unit = _pick_unit(block, unit_pref)
            if not unit:
                continue
            df = _series_from_fact(block, unit)
            if not df.empty:
                series_list.append(df)
        if series_list:
            # 여러 태그가 있으면 가장 최근 날짜 커버리지가 넓은 걸 우선
            series_list.sort(key=lambda d: (len(d), d["date"].max()), reverse=True)
            out[metric] = series_list[0].rename(columns={"date":"Date", "value":metric})
    return out

# =========================
# 날짜 확장/머지
# =========================
def expand_and_merge_one(ticker_df: pd.DataFrame, metric_frames: dict) -> pd.DataFrame:
    """
    ticker 한 종목의 가격일자에 맞춰 SEC 분기 데이터를 asof forward-fill로 정렬 후 컬럼 삽입.
    """
    if not metric_frames:
        return ticker_df

    # 가격 데이터 일자
    px = ticker_df.copy()
    px = px.sort_values("Date")
    px_dates = px[["Date"]].drop_duplicates().reset_index(drop=True)

    # 각 metric을 px_dates에 asof 병합
    for metric, dfm in metric_frames.items():
        # 리포트 날짜가 가격 시작보다 이르면 그냥 유지; asof는 key가 정렬 필수
        dfm = dfm.sort_values("Date").drop_duplicates("Date")
        merged = pd.merge_asof(px_dates, dfm, on="Date", direction="backward")
        # forward fill은 asof 자체가 backward이므로 충분. 일부 NaN은 초기구간 미보고 → 남겨둠
        px[metric] = pd.merge(px[["Date"]], merged, on="Date", how="left")[metric]

    # ROA 추가: Net_Income / Total_Assets
    if "Net_Income" in px and "Total_Assets" in px:
        with np.errstate(divide='ignore', invalid='ignore'):
            roa = px["Net_Income"] / px["Total_Assets"]
        px["ROA"] = roa.replace([np.inf, -np.inf], np.nan)
    return px

# =========================
# 메인 루틴
# =========================
def fill_financials_for_all():
    if not os.path.exists(PRICES_CSV):
        print(f"File not found: {PRICES_CSV}")
        return
    df = pd.read_csv(PRICES_CSV, parse_dates=["Date"])
    if df.empty:
        print("CSV is empty.")
        return

    # 가격 파일에 필요한 컬럼이 없으면 생성
    needed_cols = ["EPS","Revenue","Net_Income","Total_Assets","Total_Debt","Cash","ROA"]
    for c in needed_cols:
        if c not in df.columns:
            df[c] = np.nan

    tickers = df["Ticker"].dropna().astype(str).unique()
    print(f"Tickers to process: {len(tickers)}")

    ok, fail = 0, 0
    for i, tk in enumerate(sorted(tickers), 1):
        try:
            # 승계 고려한 CIK 찾기
            cik = find_cik_for_ticker(tk)
            if not cik:
                print(f"[{i}/{len(tickers)}] {tk}: CIK not found (skipping)")
                fail += 1
                continue

            facts = get_company_facts(cik)
            if not facts:
                print(f"[{i}/{len(tickers)}] {tk}: companyfacts empty (skipping)")
                fail += 1
                continue

            series_map = extract_financial_series(facts)
            if not series_map:
                print(f[{i}/{len(tickers)}], f"{tk}: no usable facts")
                fail += 1
                continue

            # 이 종목 부분 DF
            part = df[df["Ticker"] == tk].copy()
            part = expand_and_merge_one(part, series_map)

            # 메인 DF에 반영 (인덱스 기반 대입이 가장 안전)
            df.loc[part.index, needed_cols + ["Ticker","Date"]] = part[needed_cols + ["Ticker","Date"]].values

            ok += 1
            print(f"[{i}/{len(tickers)}] {tk}: OK")
        except Exception as e:
            print(f"[{i}/{len(tickers)}] {tk}: ERROR {e}")
            fail += 1
        finally:
            gc.collect()

    # 저장
    df.to_csv(PRICES_CSV, index=False)
    print(f"Done. Success={ok}, Fail={fail}. Saved to {PRICES_CSV}")

if __name__ == "__main__":
    print("Start SEC filling...")
    fill_financials_for_all()
    print("Finished.")
