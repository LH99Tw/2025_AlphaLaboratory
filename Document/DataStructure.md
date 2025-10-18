# 데이터 구조 명세서

## CSV 기반 사용자 데이터 관리 시스템

모든 사용자 데이터를 CSV 파일로 관리하며, JOIN을 통해 관계형 데이터베이스처럼 연결됩니다.

---

## 1. users.csv - 사용자 기본 정보

사용자의 계정 정보와 기본 프로필을 저장합니다.

| 필드명 | 타입 | 설명 | 예시 |
|--------|------|------|------|
| user_id | STRING (UUID) | 사용자 고유 ID (Primary Key) | `a1b2c3d4-e5f6-7890-abcd-ef1234567890` |
| username | STRING | 사용자명 (로그인 ID, Unique) | `admin` |
| email | STRING | 이메일 (Unique) | `admin@smartanalytics.com` |
| password_hash | STRING | 비밀번호 해시 (SHA256) | `5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8` |
| name | STRING | 실명 | `관리자` |
| profile_emoji | STRING | 프로필 이모티콘 | `😀` |
| created_at | DATETIME | 계정 생성일시 | `2025-01-15T10:30:00` |
| last_login | DATETIME | 마지막 로그인 일시 | `2025-01-15T15:45:30` |
| is_active | BOOLEAN | 활성 상태 | `True` |
| user_type | STRING | 사용자 타입 | `admin` 또는 `user` |

**관계:**
- `user_id`는 다른 모든 테이블의 Foreign Key로 사용됩니다.

---

## 2. investments.csv - 투자 현황

사용자의 실시간 자산 현황을 저장합니다.

| 필드명 | 타입 | 설명 | 예시 |
|--------|------|------|------|
| user_id | STRING (UUID) | 사용자 ID (Foreign Key → users.user_id) | `a1b2c3d4-e5f6-7890-abcd-ef1234567890` |
| total_assets | FLOAT | 총 자산 (원) | `50000000.0` |
| cash | FLOAT | 현금 자산 (원) | `20000000.0` |
| stock_value | FLOAT | 주식 평가액 (원) | `30000000.0` |
| updated_at | DATETIME | 업데이트 일시 | `2025-01-15T16:00:00` |

**JOIN 예시:**
```python
# users와 investments를 조인하여 사용자 정보와 자산 정보를 함께 조회
merged = users_df.merge(investments_df, on='user_id', how='left')
```

---

## 3. portfolios.csv - 포트폴리오 (보유 주식)

사용자가 보유한 주식 목록을 저장합니다.

| 필드명 | 타입 | 설명 | 예시 |
|--------|------|------|------|
| portfolio_id | STRING (UUID) | 포트폴리오 고유 ID (Primary Key) | `b2c3d4e5-f6a7-8901-bcde-f12345678901` |
| user_id | STRING (UUID) | 사용자 ID (Foreign Key → users.user_id) | `a1b2c3d4-e5f6-7890-abcd-ef1234567890` |
| ticker | STRING | 종목 코드 | `AAPL` |
| company_name | STRING | 회사명 | `Apple Inc.` |
| quantity | INTEGER | 보유 수량 | `50` |
| avg_price | FLOAT | 평균 매수가 (달러) | `180.5` |
| current_price | FLOAT | 현재가 (달러) | `185.2` |
| sector | STRING | 섹터 | `Technology` |
| purchase_date | DATETIME | 최초 매수일 | `2024-06-15T10:00:00` |
| updated_at | DATETIME | 업데이트 일시 | `2025-01-15T16:00:00` |

**JOIN 예시:**
```python
# 사용자별 포트폴리오 조회
user_portfolio = portfolios_df[portfolios_df['user_id'] == user_id]

# 섹터별 집계
sector_summary = user_portfolio.groupby('sector').agg({
    'ticker': 'count',
    'quantity': 'sum'
})
```

---

## 4. user_alphas.csv - 사용자 보유 알파

사용자가 생성하거나 저장한 알파 팩터를 저장합니다.

| 필드명 | 타입 | 설명 | 예시 |
|--------|------|------|------|
| alpha_id | STRING (UUID) | 알파 고유 ID (Primary Key) | `c3d4e5f6-a7b8-9012-cdef-123456789012` |
| user_id | STRING (UUID) | 사용자 ID (Foreign Key → users.user_id) | `a1b2c3d4-e5f6-7890-abcd-ef1234567890` |
| alpha_name | STRING | 알파 이름 | `Momentum Alpha 001` |
| alpha_expression | STRING | 알파 수식 | `rank(close - ts_delay(close, 10))` |
| performance | JSON STRING | 성과 지표 (JSON 형식) | `{"sharpe_ratio": 1.85, "cagr": 15.2}` |
| created_at | DATETIME | 생성일시 | `2025-01-10T14:30:00` |
| is_active | BOOLEAN | 활성 상태 | `True` |

**Performance JSON 구조:**
```json
{
  "sharpe_ratio": 1.85,
  "cagr": 15.2,
  "mdd": -8.5,
  "win_rate": 0.62
}
```

---

## 5. transactions.csv - 거래 내역

모든 금융 거래 내역을 기록합니다.

| 필드명 | 타입 | 설명 | 예시 |
|--------|------|------|------|
| transaction_id | STRING (UUID) | 거래 고유 ID (Primary Key) | `d4e5f6a7-b8c9-0123-def0-234567890123` |
| user_id | STRING (UUID) | 사용자 ID (Foreign Key → users.user_id) | `a1b2c3d4-e5f6-7890-abcd-ef1234567890` |
| transaction_type | STRING | 거래 유형 | `buy`, `sell`, `deposit`, `withdraw` |
| ticker | STRING | 종목 코드 (주식 거래 시) | `AAPL` |
| quantity | INTEGER | 수량 | `10` |
| price | FLOAT | 가격 (주당) | `180.5` |
| amount | FLOAT | 총액 (입출금 시) | `1000000.0` |
| transaction_date | DATETIME | 거래일시 | `2025-01-15T11:30:00` |
| note | STRING | 비고 | `Apple Inc. 매수` |

**거래 유형:**
- `buy`: 주식 매수
- `sell`: 주식 매도
- `deposit`: 입금
- `withdraw`: 출금

---

## 6. asset_history.csv - 자산 변화 이력

사용자의 자산 변화를 시계열로 기록합니다.

| 필드명 | 타입 | 설명 | 예시 |
|--------|------|------|------|
| history_id | STRING (UUID) | 이력 고유 ID (Primary Key) | `e5f6a7b8-c9d0-1234-ef01-345678901234` |
| user_id | STRING (UUID) | 사용자 ID (Foreign Key → users.user_id) | `a1b2c3d4-e5f6-7890-abcd-ef1234567890` |
| total_assets | FLOAT | 총 자산 (원) | `48500000.0` |
| cash | FLOAT | 현금 (원) | `18500000.0` |
| stock_value | FLOAT | 주식 평가액 (원) | `30000000.0` |
| recorded_at | DATETIME | 기록 일시 | `2025-01-14T16:00:00` |

**데이터 보존 정책:**
- 사용자당 최근 100개 레코드만 유지
- 자산 변경 시마다 자동 기록

---

## 데이터 관계도 (ERD)

```
┌──────────────┐
│    users     │
│  (user_id)   │◄─────┐
└──────────────┘      │
                      │
        ┌─────────────┼─────────────┬─────────────┬─────────────┐
        │             │             │             │             │
        ▼             ▼             ▼             ▼             ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ investments  │ │  portfolios  │ │ user_alphas  │ │ transactions │ │asset_history │
│  (user_id)   │ │  (user_id)   │ │  (user_id)   │ │  (user_id)   │ │  (user_id)   │
└──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘
```

---

## JOIN 활용 예시

### 1. 사용자 대시보드 데이터 조회
```python
# 사용자 기본 정보 + 투자 현황 + 포트폴리오
dashboard_data = (
    users_df[users_df['user_id'] == user_id]
    .merge(investments_df, on='user_id', how='left')
)
portfolio = portfolios_df[portfolios_df['user_id'] == user_id]
```

### 2. 자산 변화 추이 분석
```python
# 최근 30일 자산 이력
asset_trend = (
    asset_history_df[asset_history_df['user_id'] == user_id]
    .sort_values('recorded_at', ascending=False)
    .head(30)
)
```

### 3. 거래 내역 조회
```python
# 최근 거래 내역
recent_transactions = (
    transactions_df[transactions_df['user_id'] == user_id]
    .sort_values('transaction_date', ascending=False)
    .head(20)
)
```

### 4. 포트폴리오 분석
```python
# 섹터별 보유 비중
sector_distribution = (
    portfolios_df[portfolios_df['user_id'] == user_id]
    .groupby('sector')
    .agg({
        'quantity': 'sum',
        'avg_price': 'mean'
    })
)
```

---

## 데이터 저장 위치

모든 CSV 파일은 `database/csv_data/` 디렉토리에 저장됩니다:

```
database/
└── csv_data/
    ├── users.csv
    ├── investments.csv
    ├── portfolios.csv
    ├── user_alphas.csv
    ├── transactions.csv
    └── asset_history.csv
```

---

## 인코딩 및 포맷

- **인코딩**: UTF-8 with BOM (`utf-8-sig`)
- **구분자**: 쉼표 (`,`)
- **날짜 형식**: ISO 8601 (`YYYY-MM-DDTHH:MM:SS`)
- **숫자 형식**: 소수점은 `.` 사용, 천 단위 구분 없음
- **불린 값**: `True` / `False`

---

## 백업 및 복구

### 백업
```bash
cp -r database/csv_data/ database/csv_data_backup_$(date +%Y%m%d_%H%M%S)/
```

### 복구
```bash
cp -r database/csv_data_backup_YYYYMMDD_HHMMSS/ database/csv_data/
```

---

## 주의사항

1. **동시성 제어**: CSV 파일은 동시 쓰기에 취약하므로, 프로덕션 환경에서는 락(Lock) 메커니즘 구현 필요
2. **데이터 무결성**: Foreign Key 제약은 애플리케이션 레벨에서 관리
3. **성능**: 대량 데이터 처리 시 pandas DataFrame으로 일괄 처리 권장
4. **보안**: 비밀번호는 반드시 해시화하여 저장 (SHA256 사용)
