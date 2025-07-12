# 📈 주식 분석 애플리케이션

FastAPI + React + PostgreSQL을 사용한 주식 데이터 분석 웹 애플리케이션입니다.

## 🏗️ 기술 스택

- **Backend**: FastAPI (Python)
- **Frontend**: React (TypeScript)
- **Database**: PostgreSQL
- **Data Source**: Yahoo Finance (yfinance)

## 🚀 설치 및 실행

### 1. 사전 요구사항
- Python 3.8+
- Node.js 16+
- PostgreSQL 14+

### 2. 프로젝트 설정

```bash
# 1. 백엔드 의존성 설치
npm run install-backend

# 2. PostgreSQL 시작 (macOS)
brew services start postgresql@14

# 3. 데이터베이스 생성
createdb stock_analysis
```

### 3. 애플리케이션 실행

```bash
# 개발 모드 (백엔드 + 프론트엔드 동시 실행)
npm run dev

# 또는 개별 실행
npm run start-backend  # 백엔드 (포트 8000)
npm run start-frontend # 프론트엔드 (포트 3000)
```

## 📊 주요 기능

- **S&P 500 종목 데이터 수집**: Yahoo Finance API를 통한 실시간 데이터 수집
- **기술적 지표 계산**: MA20, MA60, RSI, 변동성 등
- **시계열 데이터 저장**: PostgreSQL에 일별 주가 데이터 저장
- **웹 대시보드**: React 기반 실시간 데이터 시각화

## 🔧 API 엔드포인트

- `GET /` - API 상태 확인
- `GET /tickers` - S&P 500 종목 목록 조회
- `POST /collect-data` - 주식 데이터 수집
- `GET /stock/{symbol}` - 특정 종목 데이터 조회

## 📁 프로젝트 구조

```
├── backend/           # FastAPI 백엔드
│   ├── main.py       # 메인 애플리케이션
│   ├── models.py     # 데이터베이스 모델
│   ├── stock_service.py # 주식 데이터 서비스
│   └── requirements.txt # Python 의존성
├── frontend/         # React 프론트엔드
│   ├── src/
│   │   ├── App.tsx   # 메인 컴포넌트
│   │   └── App.css   # 스타일
│   └── package.json  # Node.js 의존성
└── database/         # 데이터베이스 관련 파일
```

## 🎯 사용 방법

1. 애플리케이션 실행 후 `http://localhost:3000` 접속
2. "데이터 수집" 버튼으로 S&P 500 종목 데이터 수집
3. 종목 버튼 클릭으로 특정 종목의 상세 데이터 확인
4. 기술적 지표 (MA20, MA60, RSI, 변동성) 확인

## 🔍 기술적 지표

- **MA20**: 20일 이동평균선
- **MA60**: 60일 이동평균선  
- **RSI**: 14일 상대강도지수
- **Volatility**: 20일 변동성
