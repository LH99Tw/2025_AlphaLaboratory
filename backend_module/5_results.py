import pandas as pd
import numpy as np
import warnings
warnings.filterwarnings('ignore')
from datetime import datetime
import os
import gc
import json
from scipy.stats import skew, kurtosis
from math import sqrt

try:
    import pyarrow  # I/O 가속용 (있으면 pandas가 자동 사용)
    _HAS_ARROW = True
except Exception:
    _HAS_ARROW = False

from concurrent.futures import ProcessPoolExecutor, as_completed


class LongOnlyBacktestSystem:
    def __init__(self, price_file=None, alpha_file=None, config_file=None):
        if config_file is None:
            current_dir = os.path.dirname(os.path.abspath(__file__))
            config_file = os.path.join(current_dir, 'backtest_config.json')
        if price_file is None:
            current_dir = os.path.dirname(os.path.abspath(__file__))
            price_file = os.path.join(current_dir, '..', 'database', 'sp500_interpolated.csv')
        if alpha_file is None:
            current_dir = os.path.dirname(os.path.abspath(__file__))
            alpha_file = os.path.join(current_dir, '..', 'database', 'sp500_with_alphas.csv')

        self.price_file = price_file
        self.alpha_file = alpha_file
        self.config_file = config_file
        self.results = {}
        self.config = self.load_config()

        if not os.path.exists(self.price_file):
            raise FileNotFoundError(f"주가 데이터 파일을 찾을 수 없습니다: {self.price_file}")
        if not os.path.exists(self.alpha_file):
            raise FileNotFoundError(f"알파 데이터 파일을 찾을 수 없습니다: {self.alpha_file}")

        # 내부 캐시
        self._base_df = None     # Date, Ticker, Close, NextDayReturn (+ 선택된 factor들)
        self._selected_factors = None

    def load_config(self):
        try:
            with open(self.config_file, 'r', encoding='utf-8') as f:
                config = json.load(f)
            print(f"✅ 설정 파일 로드 완료: {self.config_file}")
            # 성능 옵션 기본값 보강
            config.setdefault("performance_toggles", {
                "load_in_memory": True,
                "use_parquet_cache": False,
                "parquet_dir": "parquet_cache",
                "compute_rolling_mdd": True,
                "parallel_factor_eval": False,
                "max_workers": max(1, os.cpu_count() - 1 if os.cpu_count() else 1)
            })
            return config
        except FileNotFoundError:
            print(f"⚠️ 설정 파일을 찾을 수 없습니다: {self.config_file}")
            print("기본 설정을 사용합니다.")
            cfg = self.get_default_config()
            return cfg
        except json.JSONDecodeError as e:
            print(f"❌ 설정 파일 JSON 오류: {e}")
            print("기본 설정을 사용합니다.")
            return self.get_default_config()

    def get_default_config(self):
        return {
            "backtest_settings": {
                "start_date": "2013-01-01",
                "end_date": "2015-12-31",
                "max_factors": 101,
                "quantile": 0.1,
                "transaction_cost": 0.001,
                "chunk_size": 100000,
                "rebalancing_frequency": "daily"
            },
            "output_settings": {
                "output_directory": "calculated_alphas",
                "metrics_filename": "enhanced_backtest_metrics.csv",
                "factor_returns_prefix": "factor_returns_"
            },
            "performance_metrics": {
                "include_cagr": True,
                "include_sharpe": True,
                "include_sortino": True,
                "include_ic": True,
                "include_mdd": True,
                "include_winrate": True,
                "include_skewness": True,
                "include_kurtosis": True,
                "include_turnover": True
            },
            "performance_toggles": {
                "load_in_memory": True,
                "use_parquet_cache": False,
                "parquet_dir": "parquet_cache",
                "compute_rolling_mdd": True,
                "parallel_factor_eval": False,
                "max_workers": max(1, os.cpu_count() - 1 if os.cpu_count() else 1)
            }
        }

    def update_config(self, new_settings):
        self.config.update(new_settings)
        try:
            with open(self.config_file, 'w', encoding='utf-8') as f:
                json.dump(self.config, f, indent=4, ensure_ascii=False)
            print(f"✅ 설정 파일 업데이트 완료: {self.config_file}")
        except Exception as e:
            print(f"❌ 설정 파일 저장 실패: {e}")

    def print_current_config(self):
        print("\n📋 현재 백테스트 설정:")
        print(json.dumps(self.config, indent=2, ensure_ascii=False))

    def get_alpha_columns(self):
        with open(self.alpha_file, 'r') as f:
            header = f.readline().strip().split(',')
            alpha_columns = [col for col in header if col.startswith('alpha')]
        return alpha_columns

    # =========================
    #   핵심: 한 번만 로드/병합
    # =========================
    def _prepare_base_frame(self, start_date, end_date, selected_factors):
        """Date/Ticker 기준 한 번만 병합 + NextDayReturn 1회 계산 (속도 핵심)"""
        if self._base_df is not None and self._selected_factors == tuple(selected_factors):
            return self._base_df

        toggles = self.config.get("performance_toggles", {})
        use_cache = toggles.get("use_parquet_cache", False)
        parquet_dir = toggles.get("parquet_dir", "parquet_cache")
        os.makedirs(parquet_dir, exist_ok=True)

        read_kwargs = dict(engine="pyarrow") if _HAS_ARROW else {}
        dtypes = {"Ticker": "category"}

        # (선택) Parquet 캐시
        price_parquet = os.path.join(parquet_dir, "price.parquet")
        alpha_parquet = os.path.join(parquet_dir, "alphas.parquet")

        # 가격 로드
        if use_cache and os.path.exists(price_parquet):
            price = pd.read_parquet(price_parquet, columns=["Date", "Ticker", "Close"])
        else:
            price = pd.read_csv(self.price_file, usecols=["Date", "Ticker", "Close"],
                                parse_dates=["Date"], dtype=dtypes, **read_kwargs)
            if use_cache:
                price.to_parquet(price_parquet, index=False)

        # 알파 로드 (선택된 팩터만)
        alpha_cols = ["Date", "Ticker"] + list(selected_factors)
        if use_cache and os.path.exists(alpha_parquet):
            alpha = pd.read_parquet(alpha_parquet, columns=alpha_cols)
        else:
            alpha = pd.read_csv(self.alpha_file, usecols=alpha_cols,
                                parse_dates=["Date"], dtype=dtypes, **read_kwargs)
            if use_cache:
                # 전체를 캐싱하면 파일이 커질 수 있으니, 최초 1회 전체 캐시를 권장
                # 여기서는 선택된 컬럼만 캐시
                alpha.to_parquet(alpha_parquet, index=False)

        # 기간 필터
        mask_price = (price["Date"] >= start_date) & (price["Date"] <= end_date)
        mask_alpha = (alpha["Date"] >= start_date) & (alpha["Date"] <= end_date)
        price = price.loc[mask_price]
        alpha = alpha.loc[mask_alpha]

        # 병합 (한 번)
        base = pd.merge(price.sort_values(["Ticker", "Date"]),
                        alpha.sort_values(["Ticker", "Date"]),
                        on=["Date", "Ticker"], how="inner")

        # NextDayReturn (한 번)
        base["NextDayReturn"] = base.groupby("Ticker", observed=True)["Close"].shift(-1) / base["Close"] - 1
        base = base.dropna(subset=["NextDayReturn"])

        self._base_df = base
        self._selected_factors = tuple(selected_factors)
        return base

    # =========================
    #   벡터화된 팩터 수익률 계산
    # =========================
    def calculate_factor_returns(self, df, factor_col, quantile=0.1, rebalancing_frequency='daily'):
        if not pd.api.types.is_datetime64_any_dtype(df['Date']):
            df = df.copy()
            df['Date'] = pd.to_datetime(df['Date'])

        if rebalancing_frequency == 'daily':
            # 상위 q 마스크 벡터 생성
            ranks = df.groupby('Date', observed=True)[factor_col].rank(pct=True, ascending=False)
            mask = ranks <= quantile
            sel = df.loc[mask, ["Date", "NextDayReturn", "Ticker"]]
            agg = sel.groupby("Date", observed=True).agg(
                LongReturn=("NextDayReturn", "mean"),
                LongCount=("Ticker", "count")
            ).reset_index()
            agg["FactorReturn"] = agg["LongReturn"]
            return agg.to_dict("records")

        # 기간 리밸런싱(주/월/분기)
        df_sorted = df.sort_values("Date").copy()
        if rebalancing_frequency == 'weekly':
            df_sorted['Period'] = df_sorted['Date'].dt.to_period('W')
        elif rebalancing_frequency == 'monthly':
            df_sorted['Period'] = df_sorted['Date'].dt.to_period('M')
        elif rebalancing_frequency == 'quarterly':
            df_sorted['Period'] = df_sorted['Date'].dt.to_period('Q')
        else:
            print(f"⚠️ 알 수 없는 리밸런싱 주기: {rebalancing_frequency}. 일별로 설정합니다.")
            return self.calculate_factor_returns(df, factor_col, quantile, 'daily')

        # 기간 첫날 데이터
        first_day = df_sorted.groupby(["Period", "Ticker"], observed=True, as_index=False).first()
        # 해당 첫날의 팩터 순위로 종목 선택
        ranks = first_day.groupby("Period", observed=True)[factor_col].rank(pct=True, ascending=False)
        first_day["Chosen"] = ranks <= quantile
        chosen = first_day[first_day["Chosen"]][["Period", "Ticker"]]

        # 각 (Period, Ticker)의 시작/끝 가격으로 기간 수익률 벡터 계산
        per_first = df_sorted.groupby(["Period", "Ticker"], observed=True)["Close"].first()
        per_last = df_sorted.groupby(["Period", "Ticker"], observed=True)["Close"].last()
        period_ret = (per_last / per_first - 1).rename("PeriodReturn").reset_index()

        merged = pd.merge(chosen, period_ret, on=["Period", "Ticker"], how="inner")

        # 기간별 평균 수익률/편입 수
        by_p = merged.groupby("Period", observed=True).agg(
            LongReturn=("PeriodReturn", "mean"),
            LongCount=("Ticker", "count")
        ).reset_index()

        # 각 기간의 마지막 날짜를 Date로 채택
        period_last_date = df_sorted.groupby("Period", observed=True)["Date"].max().rename("Date").reset_index()
        out = pd.merge(by_p, period_last_date, on="Period", how="left")[["Date", "LongReturn", "LongCount"]]
        out["FactorReturn"] = out["LongReturn"]
        return out.to_dict("records")

    # =========================
    #   누적/롤링 지표 (가속)
    # =========================
    def calculate_cumulative_returns(self, factor_returns, transaction_cost=0.001):
        fr = factor_returns.copy()
        return_col = 'LongReturn' if 'LongReturn' in fr.columns else 'FactorReturn'
        net_col = f"{return_col}_Net"
        fr[net_col] = fr[return_col] - transaction_cost

        # 누적 수익률
        fr['CumulativeReturn'] = (1.0 + fr[net_col]).cumprod() - 1.0

        # 롤링 지표 (가능한 곳은 벡터화)
        fr = self.calculate_rolling_metrics(fr, net_col)
        return fr

    def calculate_rolling_metrics(self, factor_returns, return_col, window_days=252):
        fr = factor_returns.copy()
        x = fr[return_col]

        # Sharpe(연환산)
        rolling_mean = x.rolling(window_days, min_periods=window_days).mean()
        rolling_std = x.rolling(window_days, min_periods=window_days).std(ddof=0)
        fr['RollingSharpe'] = (rolling_mean / rolling_std) * sqrt(252)

        # Volatility(연환산)
        fr['RollingVolatility'] = rolling_std * sqrt(252)

        # CAGR(연환산) - log 합으로 안정화
        log1p = np.log1p(x)
        roll_logsum = log1p.rolling(window_days, min_periods=window_days).sum()
        fr['RollingCAGR'] = np.exp(roll_logsum * (252 / window_days)) - 1.0

        # Win Rate
        fr['RollingWinRate'] = x.rolling(window_days, min_periods=window_days).apply(lambda s: (s > 0).mean())

        # Rolling MDD (옵션)
        toggles = self.config.get("performance_toggles", {})
        if toggles.get("compute_rolling_mdd", True):
            fr['RollingMDD'] = fr['CumulativeReturn'].rolling(window_days, min_periods=window_days).apply(
                lambda s: self.calculate_mdd(s)
            )
        else:
            fr['RollingMDD'] = np.nan

        return fr

    def calculate_mdd(self, cumulative_returns):
        if len(cumulative_returns) == 0:
            return np.nan
        curve = 1.0 + cumulative_returns
        peak = np.maximum.accumulate(curve)
        dd = (curve - peak) / peak
        return dd.min()

    def calculate_performance_metrics(self, factor_returns, cumulative_returns):
        total_return = cumulative_returns['CumulativeReturn'].iloc[-1]
        daily_returns = factor_returns['LongReturn_Net'] if 'LongReturn_Net' in factor_returns.columns else factor_returns['LongReturn']
        negative_returns = daily_returns[daily_returns < 0]

        days = len(factor_returns)
        years = days / 252 if days else 0
        cagr = (1 + total_return) ** (1 / years) - 1 if years > 0 else 0

        sharpe = daily_returns.mean() / daily_returns.std() * np.sqrt(252) if daily_returns.std() > 0 else 0
        sortino = daily_returns.mean() / (negative_returns.std() * np.sqrt(252)) if negative_returns.std() > 0 else 0
        hit_ratio = (daily_returns > 0).mean()
        skewness = skew(daily_returns) if len(daily_returns) > 2 else 0
        kurt = kurtosis(daily_returns) if len(daily_returns) > 3 else 0

        turnover = self.calculate_turnover(factor_returns)

        cumulative_curve = 1 + cumulative_returns['CumulativeReturn']
        running_max = cumulative_curve.expanding().max()
        drawdown = (cumulative_curve - running_max) / running_max
        mdd = drawdown.min()

        return {
            'CAGR': cagr,
            'MDD': mdd,
            'SharpeRatio': sharpe,
            'SortinoRatio': sortino,
            'WinRate': hit_ratio,
            'TotalReturn': total_return,
            'Volatility': daily_returns.std() * np.sqrt(252),
            'MaxDrawdown': mdd,
            'Skewness': skewness,
            'Kurtosis': kurt,
            'Turnover': turnover,
            'TotalDays': days
        }

    def calculate_ic(self, df, factor_col):
        valid = df[['Date', factor_col, 'NextDayReturn']].dropna()
        if valid.empty:
            return np.nan
        # 일자별 단순 순위 IC도 가능하지만, 기존 정의 유지
        return valid.groupby('Date', observed=True).apply(
            lambda x: x[factor_col].corr(x['NextDayReturn'])
        ).mean()

    def calculate_turnover(self, factor_returns):
        # 기존 동작(보수적 추정)을 유지해달라 했으므로 그대로 둔다.
        if 'LongCount' in factor_returns.columns:
            avg_count = factor_returns['LongCount'].mean()
            return 2 * avg_count / avg_count if avg_count else np.nan
        return np.nan

    # =========================
    #   팩터 처리 (I/O 1회 + 벡터)
    # =========================
    def process_single_factor(self, factor_name, start_date, end_date, quantile=0.1, transaction_cost=0.001, rebalancing_frequency='daily'):
        print(f"팩터 {factor_name} 처리 중... (리밸런싱: {rebalancing_frequency})")

        # 준비된 base frame 재사용
        base = self._base_df
        if base is None or factor_name not in base.columns:
            raise RuntimeError("내부 베이스 프레임 준비가 되지 않았거나, 선택된 팩터 컬럼이 없습니다.")

        df = base[["Date", "Ticker", "Close", "NextDayReturn", factor_name]].dropna(subset=[factor_name]).copy()

        factor_returns_list = self.calculate_factor_returns(df, factor_name, quantile, rebalancing_frequency)
        if not factor_returns_list:
            return None, None

        factor_returns_df = pd.DataFrame(factor_returns_list).sort_values('Date').reset_index(drop=True)
        cumulative_returns = self.calculate_cumulative_returns(factor_returns_df, transaction_cost)
        performance_metrics = self.calculate_performance_metrics(factor_returns_df, cumulative_returns)

        # IC
        ic = self.calculate_ic(df, factor_name)
        performance_metrics['IC'] = ic

        performance_metrics['Factor'] = factor_name
        performance_metrics['RebalancingFrequency'] = rebalancing_frequency

        return performance_metrics, cumulative_returns

    # =========================
    #   실행 진입점
    # =========================
    def run_backtest(self, start_date=None, end_date=None, quantile=None, transaction_cost=None, max_factors=None, rebalancing_frequencies=None):
        settings = self.config['backtest_settings']

        start_date = pd.to_datetime(start_date or settings['start_date'])
        end_date = pd.to_datetime(end_date or settings['end_date'])
        quantile = quantile or settings['quantile']
        transaction_cost = transaction_cost or settings['transaction_cost']
        max_factors = max_factors or settings['max_factors']

        if rebalancing_frequencies is None:
            rebalancing_frequencies = [settings.get('rebalancing_frequency', 'daily')]

        print(f"📊 백테스트 설정:")
        print(f"   - 기간: {start_date.date()} ~ {end_date.date()}")
        print(f"   - 분위수: {quantile}")
        print(f"   - 거래비용: {transaction_cost}")
        print(f"   - 최대 팩터 수: {max_factors}")
        print(f"   - 리밸런싱 주기: {rebalancing_frequencies}")

        alpha_columns = self.get_alpha_columns()
        if max_factors:
            alpha_columns = alpha_columns[:max_factors]

        # 핵심: 한 번만 읽고 한 번만 병합 (선택된 팩터만)
        self._prepare_base_frame(start_date, end_date, alpha_columns)

        all_results = {}
        toggles = self.config.get("performance_toggles", {})
        parallel = toggles.get("parallel_factor_eval", False)
        max_workers = toggles.get("max_workers", 1)

        for rebalancing_frequency in rebalancing_frequencies:
            print(f"\n🔄 {rebalancing_frequency.upper()} 리밸런싱 백테스트 시작...")

            all_performance_metrics = []
            top_factor_returns = {}

            if parallel and len(alpha_columns) > 1 and max_workers > 1:
                # 병렬: 팩터별 계산
                with ProcessPoolExecutor(max_workers=max_workers) as ex:
                    futures = {
                        ex.submit(_run_single_factor_job,
                                  self.price_file, self.alpha_file, self.config,
                                  self._base_df, factor, start_date, end_date,
                                  quantile, transaction_cost, rebalancing_frequency): factor
                        for factor in alpha_columns
                    }
                    idx = 0
                    for fut in as_completed(futures):
                        factor = futures[fut]
                        try:
                            pm, fr = fut.result()
                            if pm is not None:
                                all_performance_metrics.append(pm)
                                top_factor_returns[factor] = fr
                                idx += 1
                                print(f"[{idx}/{len(alpha_columns)}] {factor}: "
                                      f"CAGR={pm['CAGR']:.4f}, "
                                      f"Sharpe={pm['SharpeRatio']:.4f}, "
                                      f"Sortino={pm.get('SortinoRatio', 0):.4f}, "
                                      f"IC={pm.get('IC', 0):.4f}, "
                                      f"WinRate={pm.get('WinRate', 0):.4f}, "
                                      f"MDD={pm.get('MDD', 0):.4f}")
                        except Exception as e:
                            print(f"{factor} 처리 중 오류 발생: {e}")
            else:
                # 직렬: 기존 출력 순서 유지
                for i, factor in enumerate(alpha_columns):
                    try:
                        pm, fr = self.process_single_factor(
                            factor, start_date, end_date, quantile, transaction_cost, rebalancing_frequency
                        )
                        if pm is not None:
                            all_performance_metrics.append(pm)
                            top_factor_returns[factor] = fr
                            print(f"[{i+1}/{len(alpha_columns)}] {factor}: "
                                  f"CAGR={pm['CAGR']:.4f}, "
                                  f"Sharpe={pm['SharpeRatio']:.4f}, "
                                  f"Sortino={pm.get('SortinoRatio', 0):.4f}, "
                                  f"IC={pm.get('IC', 0):.4f}, "
                                  f"WinRate={pm.get('WinRate', 0):.4f}, "
                                  f"MDD={pm.get('MDD', 0):.4f}")
                    except Exception as e:
                        print(f"{factor} 처리 중 오류 발생: {e}")
                        continue

            all_results[rebalancing_frequency] = {
                'performance_metrics': all_performance_metrics,
                'factor_returns': top_factor_returns
            }

            self.save_results(all_performance_metrics, top_factor_returns, rebalancing_frequency)

        return all_results

    # (save_results / generate_summary_report 는 기존 코드 그대로 복사)
    # ---- 아래 두 메서드는 네 원본을 그대로 둬도 됨. 필요 시 동일하게 붙여넣기 ----

    def save_results(self, performance_metrics, top_factor_returns, rebalancing_frequency='daily'):
        if not performance_metrics:
            return
        output_settings = self.config['output_settings']
        base_output_dir = output_settings['output_directory']
        metrics_filename = output_settings['metrics_filename']
        factor_prefix = output_settings['factor_returns_prefix']
        output_dir = os.path.join(base_output_dir, f"{rebalancing_frequency}_rebalancing")
        if not os.path.exists(output_dir):
            os.makedirs(output_dir)
            print(f"📁 {output_dir} 폴더 생성 완료")

        metrics_df = pd.DataFrame(performance_metrics)
        metrics_path = os.path.join(output_dir, metrics_filename)
        metrics_df.to_csv(metrics_path, index=False)
        print(f"✅ 성능 지표 저장 완료: {metrics_path}")

        saved_count = 0
        for factor_name, factor_returns in top_factor_returns.items():
            factor_metrics = next((m for m in performance_metrics if m['Factor'] == factor_name), None)
            if factor_metrics is not None:
                factor_returns_with_metrics = factor_returns.copy()
                factor_returns_with_metrics.attrs['performance_metrics'] = {
                    'CAGR': factor_metrics['CAGR'],
                    'SharpeRatio': factor_metrics['SharpeRatio'],
                    'SortinoRatio': factor_metrics.get('SortinoRatio', 0),
                    'IC': factor_metrics.get('IC', 0),
                    'WinRate': factor_metrics.get('WinRate', 0),
                    'MDD': factor_metrics.get('MDD', 0),
                    'Skewness': factor_metrics.get('Skewness', 0),
                    'Kurtosis': factor_metrics.get('Kurtosis', 0),
                    'Turnover': factor_metrics.get('Turnover', 0),
                    'TotalReturn': factor_metrics.get('TotalReturn', 0),
                    'Volatility': factor_metrics.get('Volatility', 0)
                }
                factor_path = os.path.join(output_dir, f'{factor_prefix}{factor_name}.csv')
                with open(factor_path, 'w', newline='') as f:
                    f.write(f"# Performance Metrics for {factor_name}\n")
                    f.write(f"# CAGR: {factor_metrics['CAGR']:.6f}\n")
                    f.write(f"# SharpeRatio: {factor_metrics['SharpeRatio']:.6f}\n")
                    f.write(f"# SortinoRatio: {factor_metrics.get('SortinoRatio', 0):.6f}\n")
                    f.write(f"# IC: {factor_metrics.get('IC', 0):.6f}\n")
                    f.write(f"# WinRate: {factor_metrics.get('WinRate', 0):.6f}\n")
                    f.write(f"# MDD: {factor_metrics.get('MDD', 0):.6f}\n")
                    f.write(f"# Skewness: {factor_metrics.get('Skewness', 0):.6f}\n")
                    f.write(f"# Kurtosis: {factor_metrics.get('Kurtosis', 0):.6f}\n")
                    f.write(f"# Turnover: {factor_metrics.get('Turnover', 0):.6f}\n")
                    f.write(f"# TotalReturn: {factor_metrics.get('TotalReturn', 0):.6f}\n")
                    f.write(f"# Volatility: {factor_metrics.get('Volatility', 0):.6f}\n")
                    f.write(f"# TotalDays: {factor_metrics.get('TotalDays', 0)}\n")
                    f.write("#\n")
                factor_returns.to_csv(factor_path, mode='a', index=False)
                saved_count += 1
        print(f"✅ {saved_count}개 팩터 수익률 저장 완료 (성능 지표 포함): {output_dir}/")

    def generate_summary_report(self, performance_metrics):
        if not performance_metrics:
            return
        metrics_df = pd.DataFrame(performance_metrics)
        rebalancing_frequency = (
            metrics_df['RebalancingFrequency'].iloc[0]
            if 'RebalancingFrequency' in metrics_df.columns else 'unknown'
        )

        print("\n" + "="*80)
        print(f"📊 백테스트 결과 요약 리포트 ({rebalancing_frequency.upper()} 리밸런싱)")
        print("="*80)

        # 전체 통계
        print(f"\n📈 전체 팩터 통계 ({len(metrics_df)}개 팩터):")
        print(f"   • 평균 CAGR: {metrics_df['CAGR'].mean():.4f}")
        print(f"   • 평균 Sharpe Ratio: {metrics_df['SharpeRatio'].mean():.4f}")
        print(f"   • 평균 Sortino Ratio: {metrics_df.get('SortinoRatio', pd.Series([0])).mean():.4f}")
        print(f"   • 평균 IC: {metrics_df['IC'].mean():.4f}")
        print(f"   • 평균 Win Rate: {metrics_df['WinRate'].mean():.4f}")
        print(f"   • 평균 MDD: {metrics_df['MDD'].mean():.4f}")
        print(f"   • 평균 Skewness: {metrics_df.get('Skewness', pd.Series([0])).mean():.4f}")
        print(f"   • 평균 Kurtosis: {metrics_df.get('Kurtosis', pd.Series([0])).mean():.4f}")
        print(f"   • 평균 Turnover: {metrics_df.get('Turnover', pd.Series([0])).mean():.4f}")

        # 상위 10개 (Sharpe 기준)
        print(f"\n🏆 상위 10개 팩터 (Sharpe Ratio 기준):")
        top_10_sharpe = metrics_df.nlargest(10, 'SharpeRatio')
        display_columns = ['Factor', 'CAGR', 'SharpeRatio', 'SortinoRatio', 'IC', 'WinRate', 'MDD', 'Skewness', 'Kurtosis']
        available_columns = [col for col in display_columns if col in top_10_sharpe.columns]
        print(top_10_sharpe[available_columns].to_string(index=False, float_format='%.4f'))

        # 상위 10개 (CAGR 기준)
        print(f"\n📈 상위 10개 팩터 (CAGR 기준):")
        top_10_cagr = metrics_df.nlargest(10, 'CAGR')
        print(top_10_cagr[available_columns].to_string(index=False, float_format='%.4f'))

        # 상위 10개 (IC 기준)
        print(f"\n🎯 상위 10개 팩터 (IC 기준):")
        top_10_ic = metrics_df.nlargest(10, 'IC')
        print(top_10_ic[available_columns].to_string(index=False, float_format='%.4f'))

        print("\n" + "="*80)


# -------------------------------
# 병렬 실행용 헬퍼 (프로세스 풀)
# -------------------------------
def _run_single_factor_job(price_file, alpha_file, config, base_df, factor,
                           start_date, end_date, quantile, transaction_cost, rebalancing_frequency):
    """
    프로세스별로 동일 로직을 실행하기 위한 헬퍼.
    """
    sys = LongOnlyBacktestSystem(price_file=price_file, alpha_file=alpha_file, config_file=None)
    sys.config = config
    sys._base_df = base_df
    sys._selected_factors = tuple([factor])
    return sys.process_single_factor(
        factor, start_date, end_date, quantile, transaction_cost, rebalancing_frequency
    )


# -------------------------------
# 실행부
# -------------------------------
if __name__ == '__main__':
    backtest = LongOnlyBacktestSystem()

    # 현재 설정 출력
    backtest.print_current_config()

    # 설정 파일에서 리밸런싱 주기 가져오기
    target_frequency = backtest.config['backtest_settings'].get('rebalancing_frequency', 'daily')

    print(f"\n🚀 {target_frequency.upper()} 리밸런싱으로 백테스트 실행...")

    # 단일 리밸런싱 주기로 실행
    all_results = backtest.run_backtest(rebalancing_frequencies=[target_frequency])

    # 요약 리포트 생성
    for frequency, results in all_results.items():
        print("\n" + "="*80)
        print(f"📊 {frequency.upper()} 리밸런싱 결과 요약")
        print("="*80)
        backtest.generate_summary_report(results['performance_metrics'])
