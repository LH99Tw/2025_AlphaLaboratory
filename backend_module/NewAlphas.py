# -*- coding: utf-8 -*-
"""
자동 생성된 알파 모음 (GA 결과)
- 파일 생성시각: 2025-08-22 09:35:20 UTC
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

class NewAlphas(Alphas):
    """
    GA로 발굴된 알파 팩터 모음.
    각 메서드는 pandas Series(또는 DataFrame의 열 시리즈)를 반환해야 합니다.
    """

    def alphaGA001(self):
        out = (self.open)
        return out.replace([np.inf, -np.inf], 0).fillna(0)


    def alphaGA002(self):
        out = (self.volume)
        return out.replace([np.inf, -np.inf], 0).fillna(0)


    def alphaGA003(self):
        out = (self.open)
        return out.replace([np.inf, -np.inf], 0).fillna(0)

