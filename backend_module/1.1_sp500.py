# 1.1_sp500_full.py
# -*- coding: utf-8 -*-

import os
import re
import gc
import json
import time
import random
import threading
from collections import deque
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed

import numpy as np
import pandas as pd
import yfinance as yf

# =========================
# Paths & Globals
# =========================
ROOT = os.path.dirname(os.path.abspath(__file__))
DB_DIR = os.path.join(os.path.dirname(ROOT), "database")
os.makedirs(DB_DIR, exist_ok=True)

PRICES_CSV = os.path.join(DB_DIR, "sp500_prices.csv")
UNIVERSE_JSON = os.path.join(DB_DIR, "sp500_universe.json")
TIMELINE_JSON = os.path.join(DB_DIR, "sp500_constituent_timeline.json")
LAST_UPDATE_JSON = os.path.join(DB_DIR, "last_update.json")
SUCCESSOR_MAP_PATH = os.path.join(DB_DIR, "sp500_successor_map.json")  # 승계 티커 맵(별도 json)

# ===== Download pacing & adaptive tuning (느리게/안정적) =====
MAX_WORKERS = 3         # 초기 동시 스레드 수 (2~4 권장)
RPS = 0.9               # 초당 요청 수 상한 (0.8~1.5 권장)
BURST = 1               # 버스트 허용량
JITTER = (0.35, 1.0)    # 각 요청 사이 무작위 대기 (초)

BATCH_SIZE = 30         # 배치당 티커 수
BATCH_PAUSE = 20        # 배치 간 기본 휴식(초), 실제로는 지터 추가

# 적응형 동시성: 최근 N개 결과에서 fail 비율이 높으면 속도↓
ADAPT_WINDOW = 80
FAIL_THRESHOLD = 0.20   # 20% 이상 실패 시 감속
SUCCESS_THRESHOLD = 0.92  # 실패 <8%면 가속 (성공비율 기준)
MAX_WORKERS_LIMIT = 6
MIN_WORKERS_LIMIT = 2
RPS_MIN = 0.6
RPS_MAX = 2.0

# =========================
# Rate Limiter (토큰버킷)
# =========================
class RateLimiter:
    """
    토큰버킷 기반 속도 제한기.
    - rate: 초당 토큰 생성량 (RPS 상한)
    - burst: 한 번에 허용할 최대 버스트
    - jitter: (min_s, max_s) 범위에서 랜덤 지터 추가
    """
    def __init__(self, rate: float = 1.0, burst: int = 1, jitter=(0.2, 0.7)):
        self.rate = float(rate)
        self.capacity = int(burst)
        self.tokens = self.capacity
        self.updated = time.monotonic()
        self.lock = threading.Lock()
        self.jitter = jitter

    def _refill(self):
        now = time.monotonic()
        elapsed = now - self.updated
        self.updated = now
        self.tokens = min(self.capacity, self.tokens + elapsed * self.rate)

    def wait(self):
        with self.lock:
            self._refill()
            if self.tokens >= 1:
                self.tokens -= 1
                if self.jitter:
                    time.sleep(random.uniform(*self.jitter))
                return
            need = 1 - self.tokens
            delay = need / self.rate
        time.sleep(delay)
        with self.lock:
            self._refill()
            self.tokens = max(0, self.tokens - 1)
        if self.jitter:
            time.sleep(random.uniform(*self.jitter))

RATE = RateLimiter(rate=RPS, burst=BURST, jitter=JITTER)
RECENT_OUTCOMES = deque(maxlen=ADAPT_WINDOW)  # True=success, False=fail

# =========================
# Helpers
# =========================
def map_ticker_to_yahoo(ticker: str) -> str:
    """Map problematic tickers to Yahoo format (e.g., BRK.B -> BRK-B)."""
    if not isinstance(ticker, str):
        return ticker
    known = {
        'BRK.B': 'BRK-B', 'BF.B': 'BF-B',
        'BRK.A': 'BRK-A', 'BF.A': 'BF-A',
    }
    if ticker in known:
        return known[ticker]
    if '.' in ticker:
        return ticker.replace('.', '-')
    return ticker

def _standardize_price_frame(df: pd.DataFrame, ticker: str) -> pd.DataFrame:
    """Normalize yfinance output to single-ticker flat frame with Adj_Close, Date, Volume, ..."""
    if df is None or df.empty:
        return pd.DataFrame()

    # MultiIndex 컬럼 보정
    if isinstance(df.columns, pd.MultiIndex):
        try:
            df = df.droplevel(0, axis=1)
        except Exception:
            df.columns = [c[-1] if isinstance(c, tuple) else c for c in df.columns]

    df = df.reset_index()

    # Adj Close 보정
    if 'Adj Close' not in df.columns:
        df['Adj Close'] = df.get('Close', np.nan)

    df = df.rename(columns={'Adj Close': 'Adj_Close'})

    # 필수 컬럼 보장
    req = ['Date', 'Open', 'High', 'Low', 'Close', 'Adj_Close', 'Volume']
    for c in req:
        if c not in df.columns:
            df[c] = np.nan

    df['Date'] = pd.to_datetime(df['Date']).dt.normalize()

    # Volume 정수화
    try:
        df['Volume'] = df['Volume'].fillna(0).astype('int64')
    except Exception:
        df['Volume'] = df['Volume'].fillna(0)

    df['Ticker'] = ticker
    out = df[['Date', 'Ticker', 'Open', 'High', 'Low', 'Close', 'Adj_Close', 'Volume']].dropna(subset=['Date'])
    out = out.sort_values('Date').reset_index(drop=True)
    return out

def save_last_update_date(date_obj: pd.Timestamp):
    payload = {'last_date': pd.to_datetime(date_obj).strftime('%Y-%m-%d'),
               'updated_at': datetime.now().isoformat()}
    with open(LAST_UPDATE_JSON, 'w') as f:
        json.dump(payload, f, indent=2)

# =========================
# Wikipedia scraping (best-effort)
# =========================
def get_current_sp500_from_wikipedia() -> pd.DataFrame:
    """Return current S&P 500 constituents (Ticker, Company)."""
    url = 'https://en.wikipedia.org/wiki/List_of_S%26P_500_companies'
    tables = pd.read_html(url, header=0)
    df = tables[0]
    cols = {c: c.strip() for c in df.columns}
    df.rename(columns=cols, inplace=True)
    if 'Symbol' not in df.columns:
        for c in df.columns:
            if c.lower() == 'symbol':
                df.rename(columns={c: 'Symbol'}, inplace=True)
                break
    return df[['Symbol', 'Security']].rename(columns={'Symbol': 'Ticker', 'Security': 'Company'})

def parse_changes_tables_from_wikipedia() -> pd.DataFrame:
    """
    Parse 'Changes in the S&P 500' tables from Wikipedia (best-effort).
    Output columns: Date, AddedRaw, RemovedRaw
    """
    url = 'https://en.wikipedia.org/wiki/List_of_S%26P_500_companies'
    changes = []
    try:
        tables = pd.read_html(url, header=0)
    except Exception:
        tables = []

    for t in tables[1:]:  # constituents 뒤의 표들
        cols_lower = [str(c).lower() for c in t.columns]
        if any('date' in cl for cl in cols_lower):
            df = t.copy()
            date_col = None
            for c in df.columns:
                if 'date' in str(c).lower():
                    date_col = c
                    break
            if date_col is None:
                continue
            df[date_col] = pd.to_datetime(df[date_col], errors='coerce')
            df = df.dropna(subset=[date_col])

            add_col = next((c for c in df.columns if 'add' in str(c).lower()), None)
            rem_col = next((c for c in df.columns if 'remov' in str(c).lower()), None)
            if add_col is None and rem_col is None:
                continue

            out = pd.DataFrame({
                'Date': df[date_col],
                'AddedRaw': df[add_col] if add_col in df.columns else '',
                'RemovedRaw': df[rem_col] if rem_col in df.columns else ''
            })
            changes.append(out)

    if not changes:
        # Fallback: 별도 페이지 (형식이 수시 변경될 수 있음)
        try:
            url2 = 'https://en.wikipedia.org/wiki/Changes_in_the_S%26P_500'
            tbs = pd.read_html(url2, header=0)
            partial = []
            for tb in tbs:
                if any('date' in str(c).lower() for c in tb.columns):
                    dc = next((c for c in tb.columns if 'date' in str(c).lower()), None)
                    if not dc:
                        continue
                    tb[dc] = pd.to_datetime(tb[dc], errors='coerce')
                    tb = tb.dropna(subset=[dc])
                    add_col = next((c for c in tb.columns if 'add' in str(c).lower()), None)
                    rem_col = next((c for c in tb.columns if 'remov' in str(c).lower()), None)
                    if add_col or rem_col:
                        partial.append(pd.DataFrame({
                            'Date': tb[dc],
                            'AddedRaw': tb[add_col] if add_col else '',
                            'RemovedRaw': tb[rem_col] if rem_col else ''
                        }))
            if partial:
                print("Using Wikipedia 'Selected changes' as a fallback (partial).")
                return pd.concat(partial, ignore_index=True)
        except Exception:
            pass

    if not changes:
        print("WARNING: Could not parse changes tables; returning empty.")
        return pd.DataFrame(columns=['Date', 'AddedRaw', 'RemovedRaw'])

    all_changes = pd.concat(changes, ignore_index=True)
    return all_changes

_TICKER_RE = re.compile(r'\b[A-Z]{1,5}(?:[-\.][A-Z]{1,4})?\b')

def extract_tickers_from_text(cell) -> list:
    """Extract plausible tickers from a cell of text."""
    if isinstance(cell, (float, int)) or cell is None:
        return []
    text = ' '.join(cell) if isinstance(cell, (list, tuple)) else str(cell)
    text = re.sub(r'\[[^\]]*\]', '', text)  # 각주 제거
    cands = _TICKER_RE.findall(text)
    bad = {'ETF', 'ETFs', 'SPX', 'S&P', 'SNP'}
    cands = [c for c in cands if c not in bad]
    return list(dict.fromkeys(cands))  # unique & order

def build_constituent_timeline() -> pd.DataFrame:
    """Build constituent changes timeline from Wikipedia."""
    changes_raw = parse_changes_tables_from_wikipedia()
    if changes_raw.empty:
        return pd.DataFrame([{
            'Date': pd.Timestamp(datetime.today().date()),
            'Added': [], 'Removed': []
        }])

    changes_raw['Added'] = changes_raw['AddedRaw'].apply(extract_tickers_from_text)
    changes_raw['Removed'] = changes_raw['RemovedRaw'].apply(extract_tickers_from_text)
    changes = changes_raw[['Date', 'Added', 'Removed']].sort_values('Date').reset_index(drop=True)
    return changes

def build_universe_from_events(events: pd.DataFrame, current_constituents: set) -> set:
    """Union of all tickers appearing in timeline + current set."""
    universe = set(current_constituents)
    for _, row in events.iterrows():
        for t in row['Added']:
            universe.add(t)
        for t in row['Removed']:
            universe.add(t)
    return universe

# =========================
# Successor map (승계 티커)
# =========================
def load_successor_map() -> dict:
    if os.path.exists(SUCCESSOR_MAP_PATH):
        try:
            with open(SUCCESSOR_MAP_PATH, "r") as f:
                m = json.load(f)
                if isinstance(m, dict):
                    return m
        except Exception as e:
            print(f"WARN: failed to load successor map: {e}")
    return {}

SUCCESSOR_MAP = load_successor_map()

# =========================
# Downloads (with pacing & retries)
# =========================
def try_yf_download(sym: str, tries: int = 3) -> pd.DataFrame:
    """yfinance download with rate-limit, backoff, jitter."""
    last_err = None
    for k in range(tries):
        try:
            RATE.wait()  # 속도 제한 + 지터
            df = yf.download(sym, period="max", interval="1d",
                             progress=False, auto_adjust=False, threads=False)
            if df is not None and not df.empty:
                return df
        except Exception as e:
            last_err = e
        time.sleep((1.5 ** k) + random.uniform(0.2, 0.7))  # 지수 백오프 + 지터
    if last_err:
        raise last_err
    return pd.DataFrame()

def dl_one_ticker(t: str) -> pd.DataFrame:
    """
    한 종목 다운로드:
    1) Yahoo 매핑 심볼
    2) 원 심볼
    3) 승계 심볼 (있으면)
    4) history() fallback
    """
    yt = map_ticker_to_yahoo(t)
    # 1) 매핑 심볼
    try:
        raw = try_yf_download(yt, tries=3)
        if raw is not None and not raw.empty:
            return _standardize_price_frame(raw, t)
    except Exception:
        pass
    # 2) 원심볼
    try:
        raw = try_yf_download(t, tries=2)
        if raw is not None and not raw.empty:
            return _standardize_price_frame(raw, t)
    except Exception:
        pass
    # 3) 승계 심볼
    succ = SUCCESSOR_MAP.get(t)
    if succ:
        try:
            raw = try_yf_download(succ, tries=3)
            if raw is not None and not raw.empty:
                return _standardize_price_frame(raw, t)
        except Exception:
            pass
    # 4) history fallback
    try:
        RATE.wait()
        th = yf.Ticker(yt).history(period="max", interval="1d", auto_adjust=False)
        if isinstance(th, pd.DataFrame) and not th.empty:
            return _standardize_price_frame(th, t)
    except Exception:
        pass
    return pd.DataFrame()

def download_prices_for_universe(tickers,
                                 max_workers=MAX_WORKERS,
                                 sleep_sec=0.12,
                                 batch_size=BATCH_SIZE,
                                 batch_pause=BATCH_PAUSE) -> pd.DataFrame:
    """Download daily prices (period=max) for a list of tickers. Saves PRICES_CSV."""
    out, empties = [], []
    tickers = sorted(set(tickers))
    print(f"Downloading prices for {len(tickers)} tickers (period=max)...")

    for bstart in range(0, len(tickers), batch_size):
        bend = min(bstart + batch_size, len(tickers))
        batch = tickers[bstart:bend]
        print(f"\n-- Batch {bstart//batch_size + 1}: {len(batch)} tickers ({bstart}~{bend-1}) --")

        # 병렬 다운로드
        with ThreadPoolExecutor(max_workers=max_workers) as ex:
            futs = {ex.submit(dl_one_ticker, t): t for t in batch}
            for fu in as_completed(futs):
                t = futs[fu]
                try:
                    df = fu.result()
                    if not df.empty:
                        out.append(df)
                        RECENT_OUTCOMES.append(True)
                        print(f"ok: {t} ({len(df)} rows)")
                    else:
                        empties.append(t)
                        RECENT_OUTCOMES.append(False)
                        print(f"empty: {t}")
                except Exception as e:
                    empties.append(t)
                    RECENT_OUTCOMES.append(False)
                    print(f"fail {t}: {repr(e)}")
                time.sleep(sleep_sec + random.uniform(0.05, 0.25))
                gc.collect()

        # 적응형 동시성 조정
        if len(RECENT_OUTCOMES) >= ADAPT_WINDOW:
            fail_rate = 1 - (sum(RECENT_OUTCOMES) / len(RECENT_OUTCOMES))
            if fail_rate >= FAIL_THRESHOLD and max_workers > MIN_WORKERS_LIMIT:
                max_workers = max(MIN_WORKERS_LIMIT, max_workers - 1)
                RATE.rate = max(RPS_MIN, RATE.rate * 0.8)
                print(f"[ADAPT] high failure rate={fail_rate:.1%} → "
                      f"reduce max_workers={max_workers}, RPS={RATE.rate:.2f}")
                RECENT_OUTCOMES.clear()
            elif fail_rate <= (1 - SUCCESS_THRESHOLD) and max_workers < MAX_WORKERS_LIMIT:
                max_workers = min(MAX_WORKERS_LIMIT, max_workers + 1)
                RATE.rate = min(RPS_MAX, RATE.rate * 1.1)
                print(f"[ADAPT] stable (fail {fail_rate:.1%}) → "
                      f"increase max_workers={max_workers}, RPS={RATE.rate:.2f}")
                RECENT_OUTCOMES.clear()

        # 배치 간 휴식
        if bend < len(tickers):
            pause = batch_pause + random.uniform(3, 8)
            print(f"Pausing {pause:.1f}s before next batch to respect rate limits...")
            time.sleep(pause)

    if not out:
        raise RuntimeError("No prices downloaded. Check connectivity or sources.")

    prices = pd.concat(out, ignore_index=True)
    prices['Date'] = pd.to_datetime(prices['Date']).dt.normalize()
    prices = prices.drop_duplicates(['Date', 'Ticker']).sort_values(['Ticker', 'Date'])

    prices.to_csv(PRICES_CSV, index=False)
    with open(LAST_UPDATE_JSON, 'w') as f:
        json.dump({'updated_at': datetime.now().isoformat(),
                   'tickers': tickers,
                   'empty_tickers': empties}, f, indent=2)
    print(f"Saved prices to {PRICES_CSV} (rows={len(prices)}, empty={len(empties)})")
    return prices

# =========================
# Main
# =========================
def main():
    # 1) Current constituents
    cur = get_current_sp500_from_wikipedia()
    cur['Ticker'] = cur['Ticker'].astype(str).str.strip()
    current_set = set(cur['Ticker'])

    # 2) Parse changes & make timeline
    events = build_constituent_timeline()
    # Save raw timeline
    events_for_json = events.copy()
    events_for_json['Date'] = events_for_json['Date'].astype(str)
    with open(TIMELINE_JSON, 'w') as f:
        json.dump(events_for_json.to_dict(orient='records'), f, indent=2)
    uniq_tickers_in_events = set()
    if not events.empty:
        uniq_tickers_in_events |= set(sum(events['Added'].tolist(), []))
        uniq_tickers_in_events |= set(sum(events['Removed'].tolist(), []))
    print(f"events: {len(events)} rows, tickers in events: {len(uniq_tickers_in_events)}")
    print(f"Saved constituent timeline to {TIMELINE_JSON}")

    # 3) Build universe (superset of all touched tickers + current)
    universe = build_universe_from_events(events, current_set) if not events.empty else current_set
    with open(UNIVERSE_JSON, 'w') as f:
        json.dump(sorted(universe), f, indent=2)

    # 4) Download prices (느리게/안정적으로)
    try:
        prices = download_prices_for_universe(universe,
                                              max_workers=MAX_WORKERS,
                                              sleep_sec=0.12,
                                              batch_size=BATCH_SIZE,
                                              batch_pause=BATCH_PAUSE)
    except Exception as e:
        print(repr(e))
        # Fallback: 현재 구성 종목만
        print("FALLBACK: trying current constituents only...")
        prices = download_prices_for_universe(current_set,
                                              max_workers=max(2, MAX_WORKERS-1),
                                              sleep_sec=0.15,
                                              batch_size=max(15, BATCH_SIZE//2),
                                              batch_pause=BATCH_PAUSE+10)

    # 5) Save last date
    if not prices.empty:
        last_date = prices['Date'].max()
        save_last_update_date(last_date)
        print(f"Last update date: {last_date.strftime('%Y-%m-%d')}")

if __name__ == "__main__":
    main()
