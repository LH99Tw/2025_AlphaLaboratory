# 📁 프로젝트 구조 문서

## 1. 계층별 구조 (Layered Structure)
프로젝트의 파일 역할을 기준으로 한 계층 구조입니다.

```
📦 2025_sang2company/
├── 🖥️ Backend Layer
│   ├── backend/
│   │   ├── app.py              # Flask 메인 서버 (통합 API)
│   │   ├── simple_app.py       # 간소화된 Flask 서버
│   │   └── requirements.txt     # Python 의존성
│   ├── backend_module/         # 백엔드 모듈들
│   │   ├── 1_SP500DataLoad.py  # S&P 500 데이터 로드
│   │   ├── 2_SECEdgarData.py   # SEC 데이터 처리
│   │   ├── 3_Interpolation.py  # 데이터 보간
│   │   ├── 4_ComputeAlphas.py  # 알파 팩터 계산
│   │   └── 5_results.py        # 결과 분석
│   └── database/               # 데이터베이스 관련
│       ├── backtest_system.py  # 백테스트 시스템
│       ├── optimized_backtest.py # 최적화된 백테스트
│       └── simple_backtest.py  # 간단한 백테스트
│
├── 🎨 Frontend Layer
│   └── frontend/
│       ├── src/
│       │   ├── App.tsx         # 메인 앱 컴포넌트
│       │   ├── components/     # 재사용 컴포넌트
│       │   │   ├── Layout.tsx  # 레이아웃 컴포넌트
│       │   │   └── Auth.tsx    # 인증 컴포넌트
│       │   ├── pages/         # 페이지 컴포넌트
│       │   │   ├── Dashboard.tsx    # 대시보드
│       │   │   ├── Backtest.tsx     # 백테스트 페이지
│       │   │   ├── Portfolio.tsx    # 포트폴리오 관리
│       │   │   ├── GAEvolution.tsx  # 유전 알고리즘
│       │   │   ├── DataExplorer.tsx # 데이터 탐색
│       │   │   └── AIAgent.tsx      # AI 에이전트
│       │   ├── services/       # API 서비스
│       │   │   └── api.ts      # API 클라이언트
│       │   └── contexts/       # React 컨텍스트
│       │       └── AuthContext.tsx # 인증 컨텍스트
│       └── package.json        # Node.js 의존성
│
├── 🤖 AI Layer
│   └── Langchain/
│       ├── Langchain.py        # 멀티 에이전트 시스템
│       ├── simple_agent.py     # 간단한 에이전트
│       └── start_system.py     # 시스템 시작
│
├── 🧬 Algorithm Layer
│   └── GA_algorithm/
│       ├── autoalpha_ga.py    # 자동 알파 GA
│       ├── run_ga.py          # GA 실행
│       └── test_ga_with_real_data.py # 실제 데이터 테스트
│
└── 📊 Data Layer
    ├── database/              # 데이터베이스 파일들
    ├── parquet_cache/         # Parquet 캐시
    └── calculated_alphas/     # 계산된 알파들
```

## 2. 기능별 구조 (Feature-Sliced Design)
기능, 페이지, 레이어 단위로 구성된 구조입니다.

### 🎯 핵심 기능별 구조

#### 📊 데이터 관리 (Data Management)
- **데이터 수집**: `backend_module/1_SP500DataLoad.py`, `2_SECEdgarData.py`
- **데이터 처리**: `backend_module/3_Interpolation.py`
- **데이터 저장**: `database/` 폴더의 CSV 파일들

#### 🧬 알파 팩터 생성 (Alpha Generation)
- **수동 알파**: `backend_module/4_ComputeAlphas.py`
- **AI 알파**: `Langchain/Langchain.py` (멀티 에이전트)
- **진화 알고리즘**: `GA_algorithm/autoalpha_ga.py`

#### 📈 백테스트 (Backtesting)
- **백테스트 시스템**: `database/backtest_system.py`
- **최적화 백테스트**: `database/optimized_backtest.py`
- **간단 백테스트**: `database/simple_backtest.py`

#### 💼 포트폴리오 관리 (Portfolio Management)
- **포트폴리오 구성**: `frontend/src/pages/Portfolio.tsx`
- **성과 분석**: 백엔드 API 통합

#### 🤖 AI 에이전트 (AI Agents)
- **멀티 에이전트**: `Langchain/Langchain.py`
- **대화형 인터페이스**: `frontend/src/pages/AIAgent.tsx`

### 🔄 워크플로우별 구조

#### 데이터 파이프라인
```
데이터 수집 → 보간 → 알파 계산 → 백테스트 → 결과 저장
```

#### AI 워크플로우
```
사용자 질문 → Coordinator → 전문 에이전트 → 결과 통합 → 답변
```

#### 백테스트 워크플로우
```
알파 선택 → 파라미터 설정 → 백테스트 실행 → 결과 분석 → 시각화
```