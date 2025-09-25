# 🏦 퀀트 금융 분석 시스템 - 웹 플랫폼

WorldQuant 101 Alpha를 기반으로 한 통합 퀀트 금융 분석 플랫폼입니다. Flask 백엔드와 React 프론트엔드로 구성된 풀스택 웹 애플리케이션입니다.

## 🎯 주요 기능

### 1. 📊 대시보드
- 시스템 전체 상태 모니터링
- 모듈별 건강도 체크
- 데이터 통계 및 요약 정보

### 2. 📈 백테스트 시스템
- 다중 알파 팩터 백테스트
- 성과 지표 분석 (CAGR, Sharpe Ratio, MDD, IC)
- 시각화된 결과 비교
- 사용자 정의 기간 설정

### 3. 🧬 GA 진화 알고리즘
- 유전 알고리즘 기반 알파 팩터 자동 생성
- 실시간 진행률 모니터링
- 매개변수 커스터마이징
- 생성된 알파 성과 평가

### 4. 🤖 AI 에이전트
- LangChain 기반 멀티 에이전트 시스템
- 자연어로 퀀트 분석 질의응답
- 전문 에이전트별 역할 분담
- 실시간 채팅 인터페이스

### 5. 🗃️ 데이터 탐색
- S&P 500 종목 및 알파 팩터 데이터 탐색
- 인터랙티브 차트 및 테이블
- 데이터 필터링 및 검색
- 통계 정보 시각화

## 🏗️ 시스템 아키텍처

```
┌─────────────────────────────────────────────────────────────┐
│                    React Frontend (Port 3000)               │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────┐ │
│  │  Dashboard  │ │  Backtest   │ │ GA Evolution│ │AI Agent │ │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────┘ │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────┐ │
│  │Data Explorer│ │   Layout    │ │ API Service │ │ Utils   │ │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────┘ │
└─────────────────────────────────────────────────────────────┘
                                │
                                │ HTTP API
                                ▼
┌─────────────────────────────────────────────────────────────┐
│                    Flask Backend (Port 5000)                │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────┐ │
│  │Backend Module│ │GA Algorithm │ │  Langchain  │ │Database │ │
│  │             │ │             │ │             │ │         │ │
│  │ • Backtest  │ │ • AutoGA    │ │ • Multi     │ │ • Data  │ │
│  │ • Alphas    │ │ • Evolution │ │   Agent     │ │   Query │ │
│  │ • Metrics   │ │ • Fitness   │ │ • Chat      │ │ • Stats │ │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────┘ │
└─────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────┐
│                        Data Layer                           │
│  • sp500_interpolated.csv (주가 데이터)                      │
│  • sp500_with_alphas.csv (알파 팩터 데이터)                  │
│  • sp500_universe.json (종목 유니버스)                       │
│  • company_tickers.json (종목 정보)                          │
└─────────────────────────────────────────────────────────────┘
```

## 🚀 빠른 시작

### 1. 자동 실행 (권장)
```bash
# 프로젝트 루트에서
chmod +x start_system.sh
./start_system.sh
```

### 2. 수동 실행

#### 백엔드 (Flask)
```bash
# Python 가상환경 생성 및 활성화
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 의존성 설치
pip install -r backend/requirements.txt
pip install -r requirements.txt

# Flask 서버 실행
cd backend
python app.py
```

#### 프론트엔드 (React)
```bash
# 새 터미널에서
cd frontend

# 의존성 설치
npm install

# React 서버 실행
npm start
```

### 3. 접속
- **프론트엔드**: http://localhost:3000
- **백엔드 API**: http://localhost:5000

## 📋 시스템 요구사항

### 필수 소프트웨어
- **Python 3.8+**
- **Node.js 16+**
- **npm** 또는 **yarn**

### Python 패키지
```
Flask==2.3.3
Flask-CORS==4.0.0
pandas==2.1.1
numpy==1.24.3
yfinance==0.2.18
scipy==1.11.3
scikit-learn==1.3.0
langchain==0.0.284
langgraph==0.0.40
```

### Node.js 패키지
```
react==18.2.0
antd==5.9.0
recharts==2.8.0
axios==1.5.0
react-router-dom==6.15.0
typescript==4.9.5
```

## 🔗 API 엔드포인트

### 시스템 관리
- `GET /api/health` - 서버 상태 확인
- `GET /api/data/stats` - 데이터 통계 조회

### 백테스트
- `POST /api/backtest` - 백테스트 실행
- `GET /api/data/factors` - 알파 팩터 목록 조회

### GA 진화 알고리즘
- `POST /api/ga/run` - GA 작업 시작
- `GET /api/ga/status/<task_id>` - GA 작업 상태 확인

### AI 에이전트
- `POST /api/chat` - AI 에이전트와 채팅

### 데이터 조회
- `GET /api/data/ticker-list` - S&P 500 종목 목록

## 💡 사용법

### 백테스트 실행
1. **백테스트** 페이지 이동
2. 분석 기간 설정
3. 알파 팩터 선택 (다중 선택 가능)
4. **백테스트 실행** 버튼 클릭
5. 결과를 차트와 테이블로 확인

### GA 진화 알고리즘
1. **GA 진화 알고리즘** 페이지 이동
2. 매개변수 설정:
   - 인구 크기 (10-200)
   - 세대 수 (5-100)
   - 최대 깊이 (2-8)
3. **GA 진화 시작** 버튼 클릭
4. 실시간 진행률 모니터링
5. 완료 후 생성된 알파 확인

### AI 에이전트 활용
1. **AI 에이전트** 페이지 이동
2. 추천 질문 선택 또는 자유 질문 입력
3. 자연어로 퀀트 분석 관련 질의
4. 전문가 수준의 답변 확인

### 데이터 탐색
1. **데이터 탐색** 페이지 이동
2. 탭별로 데이터 확인:
   - 알파 팩터: 검색, 필터링, 분포 차트
   - S&P 500 종목: 섹터별 분포
   - 데이터 정보: 메타데이터 확인

## 🛠️ 개발 및 커스터마이징

### 새로운 알파 팩터 추가
1. `backend_module/Alphas.py`에 새 알파 함수 구현
2. `backend_module/NewAlphas.py`에 등록
3. 데이터 재생성 후 시스템 재시작

### 새로운 API 엔드포인트 추가
1. `backend/app.py`에 라우트 함수 추가
2. `frontend/src/services/api.ts`에 API 함수 추가
3. 프론트엔드 컴포넌트에서 활용

### UI 컴포넌트 커스터마이징
- Ant Design 컴포넌트 기반
- `frontend/src/App.css`에서 스타일 조정
- 반응형 디자인 지원

## 🚨 문제 해결

### 백엔드 서버 시작 실패
```bash
# 포트 충돌 확인
lsof -i :5000

# 가상환경 재생성
rm -rf venv
python3 -m venv venv
source venv/bin/activate
pip install -r backend/requirements.txt
```

### 프론트엔드 빌드 오류
```bash
# 노드 모듈 재설치
rm -rf frontend/node_modules
rm frontend/package-lock.json
cd frontend
npm install
```

### 데이터 파일 누락
- `database/` 폴더에 필수 CSV 파일들이 있는지 확인
- 필요 시 데이터 생성 스크립트 실행

## 📊 성능 최적화

- **백테스트**: 큰 데이터셋의 경우 청크 단위 처리
- **GA**: 인구 크기와 세대 수 조절로 실행 시간 최적화
- **프론트엔드**: 가상화된 테이블로 대용량 데이터 처리
- **API**: 응답 캐싱 및 압축 지원

## 🔐 보안 고려사항

- CORS 설정으로 허용된 도메인만 접근
- API 요청 크기 제한
- 입력 데이터 검증 및 sanitization
- 프로덕션 환경에서는 HTTPS 사용 권장

## 📈 확장 계획

1. **실시간 데이터 연동** - WebSocket 기반 실시간 업데이트
2. **사용자 인증** - JWT 기반 멀티 사용자 지원
3. **알파 마켓플레이스** - 생성된 알파 공유 플랫폼
4. **클라우드 배포** - Docker 컨테이너화 및 AWS 배포
5. **모바일 앱** - React Native 기반 모바일 버전

## 🤝 기여하기

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📄 라이센스

이 프로젝트는 MIT 라이센스 하에 배포됩니다.

---

**개발팀**: 2025 상투컴퍼니  
**문의**: 프로젝트 Issues 탭 활용  
**업데이트**: 정기적인 기능 개선 및 버그 수정


# 권한 부여 및 실행방법
chmod +x /Users/lee/Desktop/Project/2025_sang2company/start_system.sh

#종료방법
$ pkill -f "python app.py"
$ pkill -f "react-scripts"
$ lsof -ti:3000,5002 | xargs kill -9