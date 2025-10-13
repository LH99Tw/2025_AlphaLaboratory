# 🧬 상상기업 퀀트 트레이딩 플랫폼

AI 기반 알파 팩터 생성 및 백테스트 시스템을 갖춘 통합 퀀트 투자 플랫폼입니다.

## 🎯 프로젝트 개요

**타겟 사용자**: 퀀트 투자 및 알고리즘 계량 투자에 관심이 있는 초심자 ~ 고급자  
**핵심 목표**: 알파 수식 기반의 알고리즘 투자를 할 수 있는 통합 플랫폼 개발

## 🏗️ 기술 스택

### 🖥️ Backend
- **Flask**: RESTful API 서버
- **Python 3.10+**: 데이터 분석 및 백테스트 엔진
- **Pandas/NumPy**: 데이터 처리 및 수치 계산
- **LangChain**: AI 에이전트 프레임워크
- **Yahoo Finance API**: S&P 500 데이터 수집

### 🎨 Frontend  
- **React 18 + TypeScript**: 현대적인 웹 인터페이스
- **Ant Design**: 엔터프라이즈급 UI 컴포넌트
- **Chart.js**: 데이터 시각화
- **Glass Morphism Design**: 고급스러운 UI/UX

### 🤖 AI/ML
- **LangGraph**: 멀티 에이전트 시스템
- **Ollama**: 로컬 LLM 실행
- **진화 알고리즘 (GA)**: 유전 알고리즘 기반 알파 최적화

## 🚀 설치 및 실행

### 1. 사전 요구사항
- Python 3.10+
- Node.js 16+
- Ollama (AI 에이전트 기능 사용 시)

### 2. 프로젝트 설정

```bash
# 1. Python 가상환경 생성 및 활성화
python -m venv venv
source venv/bin/activate  # macOS/Linux
# 또는
venv\Scripts\activate  # Windows

# 2. 백엔드 의존성 설치
pip install -r requirements.txt

# 3. 프론트엔드 의존성 설치
cd frontend
npm install
cd ..
```

### 3. 애플리케이션 실행

```bash
# 통합 실행 (백엔드 + 프론트엔드)
./start_system.sh

# 또는 개별 실행

# 백엔드 실행 (포트 5002)
cd backend
python app.py

# 프론트엔드 실행 (포트 3000)
cd frontend
npm start
```

### 4. 접속
- **프론트엔드**: http://localhost:3000
- **백엔드 API**: http://localhost:5002

## 📊 주요 기능

### 🤖 AI 기반 기능
- **LLM 대화형 인터페이스**: 자연어로 퀀트 분석 요청
- **멀티 에이전트 시스템**: 전문가별 AI 에이전트 (DataAnalyst, AlphaResearcher, PortfolioManager)
- **진화 알고리즘 (GA)**: 자동 알파 팩터 생성 및 최적화
- **LLM+MCTS**: AI 기반 알파 수식 생성

### 📈 분석 및 백테스트
- **알파 팩터 관리**: WorldQuant 101 Alpha 기반 팩터 계산
- **백테스트 시스템**: 다중 리밸런싱 주기 (daily/weekly/monthly/quarterly)
- **거래비용 고려**: 실제 거래 환경을 반영한 정확한 백테스트
- **성과 지표**: CAGR, Sharpe Ratio, Sortino Ratio, IC, MDD 등

### 💼 포트폴리오 관리
- **종목 선별**: 알파 팩터 기반 자동 종목 선정
- **성과 분석**: 수익률, 리스크 지표 분석
- **리밸런싱**: 다양한 주기별 포트폴리오 재조정

### 📊 데이터 파이프라인
- **S&P 500 데이터 수집**: Yahoo Finance API 기반 실시간 데이터
- **SEC 데이터 처리**: 10-K, 10-Q 보고서 자동 분석
- **데이터 보간**: 결측값 처리 및 데이터 품질 향상
- **알파 계산**: 101개의 알파 팩터 자동 계산

## 🔧 주요 API 엔드포인트

### 시스템
- `GET /api/health` - 시스템 상태 확인

### 백테스트
- `POST /api/backtest` - 백테스트 실행 (비동기)
- `GET /api/backtest/status/{task_id}` - 백테스트 진행 상태 확인

### 포트폴리오
- `POST /api/portfolio/stocks` - 종목 선별
- `POST /api/portfolio/performance` - 성과 분석

### AI 에이전트
- `POST /api/chat` - AI 에이전트와 대화

### 진화 알고리즘
- `POST /api/ga/run` - GA 기반 알파 최적화 실행

### 데이터
- `GET /api/data/factors` - 알파 팩터 목록
- `GET /api/data/stats` - 데이터 통계

## 📁 프로젝트 구조

```
📦 2025_sang2company/
├── 🖥️ backend/              # Flask API 서버
│   ├── app.py               # 메인 API 서버
│   └── requirements.txt     # Python 의존성
├── 🎨 frontend/             # React 웹 애플리케이션
│   
├── 🤖 Langchain/            # AI 멀티 에이전트 시스템
│   ├── Langchain.py        # 멀티 에이전트 시스템
│   └── simple_agent.py     # 간단한 에이전트
├── 🧬 GA_algorithm/         # 유전 알고리즘
│   ├── autoalpha_ga.py     # 자동 알파 GA
│   └── run_ga.py           # GA 실행
├── 📊 database/             # 데이터 및 백테스트
│   ├── backtest_system.py  # 백테스트 시스템
│   ├── sp500_data.csv      # S&P 500 주가 데이터
│   └── sp500_with_alphas.csv # 알파 팩터 데이터
├── 📁 backend_module/       # 데이터 처리 모듈
│   ├── 1_SP500DataLoad.py  # 데이터 로드
│   ├── 3_Interpolation.py  # 데이터 보간
│   └── 4_ComputeAlphas.py  # 알파 계산
└── 📋 Document/             # 프로젝트 문서
    ├── LAW.md              # 개발 규칙
    ├── Structure.md        # 프로젝트 구조
    ├── Design.md           # 디자인 시스템
    ├── API.md              # API 문서
    ├── DataStructure.md    # 데이터 구조
    └── Log.md              # 변경 로그
```

## 🎯 사용 방법

## 📚 추가 문서

- [개발 규칙 (LAW.md)](Document/LAW.md)
- [프로젝트 구조 (Structure.md)](Document/Structure.md)
- [디자인 시스템 (Design.md)](Document/Design.md)
- [API 문서 (API.md)](Document/API.md)
- [데이터 구조 (DataStructure.md)](Document/DataStructure.md)
- [변경 로그 (Log.md)](Document/Log.md)

## 🔍 핵심 알파 팩터

본 프로젝트는 WorldQuant 101 Alphas를 기반으로 하며, 다음과 같은 팩터들을 계산합니다:

- **모멘텀 팩터**: 가격 추세 기반
- **반전 팩터**: 단기 반전 효과
- **밸류 팩터**: 재무지표 기반
- **볼륨 팩터**: 거래량 기반
- **복합 팩터**: 여러 신호의 조합

## 🚧 향후 계획

- [ ] 모의 투자 기능 구현
- [ ] 실시간 알림 시스템
- [ ] 고급 리스크 관리 (VaR, CVaR)
- [ ] 다중 자산군 지원
- [ ] 소셜 기능 (알파 공유)

## 📄 라이선스

이 프로젝트는 상상기업 프로젝트의 일환으로 개발되었습니다.

## 👥 기여자

개발 문서와 규칙은 `Document/LAW.md`를 참조하세요.
