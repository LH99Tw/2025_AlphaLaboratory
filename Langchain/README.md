# 🧠 퀀트 금융 멀티 에이전트 AI 시스템 (LangGraph)

WorldQuant 101 Alpha를 기반으로 한 퀀트 금융 분석 프로젝트에 특화된 LangGraph 멀티 에이전트 시스템입니다.

## 🤖 에이전트 구성

| 에이전트 | 전문 분야 | 주요 기능 |
|---------|-----------|-----------|
| 📊 **DataAnalyst** | 데이터 분석 | 알파 팩터 분석, 통계 계산, 데이터 품질 검증 |
| 🧬 **AlphaResearcher** | 알파 연구 | 새로운 알파 팩터 제안, WorldQuant 스타일 수식 생성 |
| 💼 **PortfolioManager** | 포트폴리오 관리 | 백테스트 전략 분석, 리스크 관리, 성과 평가 |
| 🔧 **CodeGenerator** | 코드 생성 | 파이썬 코드 구현, 알파 팩터 코딩, 최적화 |
| 🎯 **Coordinator** | 조율 관리 | 에이전트 라우팅, 워크플로우 관리, 결과 통합 |

## 🔄 워크플로우

```
사용자 질문 → Coordinator → 적절한 전문 에이전트 → 결과 통합 → 최종 답변
```

## 🚀 빠른 시작

### 1. 의존성 설치

```bash
# 필수 패키지 설치
pip3 install langchain langgraph pandas

# 선택사항: Ollama 설치 (로컬 LLM)
# https://ollama.ai/ 에서 다운로드 후
ollama pull llama3.2
```

### 2. 시스템 실행

```bash
# 간편 실행
python start_system.py

# 또는 직접 실행
python Langchain.py
```

### 3. 사용 예시

```
💬 질문: alpha001을 분석해줘

🤖 답변:
📊 alpha001 알파 팩터 분석 결과:

기본 통계:
- 평균값: 0.0123
- 표준편차: 0.4567
- 최솟값: -2.1234
- 최댓값: 3.4567
- 유효 데이터 비율: 78.90%

💡 분석 인사이트:
- 표준편차가 낮아 변동성이 작은 팩터입니다
- 유효 데이터 비율이 78.9%로 양호합니다
- 안정적인 분포를 보이며 추가 검토가 불필요합니다

🔍 권장사항:
- IC 계산을 통한 예측력 검증
- 시계열 안정성 분석
- 다른 팩터와의 상관관계 확인
```

## 💬 지원 명령어

### DataAnalyst 관련
- `"alpha001 분석해줘"`
- `"데이터 품질을 확인해줘"`
- `"통계 정보를 알려줘"`

### AlphaResearcher 관련  
- `"새로운 알파 팩터를 제안해줘"`
- `"현재 시장에 맞는 알파를 제안해줘"`
- `"모멘텀 기반 알파를 만들어줘"`

### PortfolioManager 관련
- `"백테스트 전략을 분석해줘"`
- `"포트폴리오 리스크를 평가해줘"`
- `"성과 지표를 설명해줘"`

### CodeGenerator 관련
- `"알파 팩터 코드를 구현해줘"`
- `"rank(correlation(delta(close, 5), volume, 10)) 코드화해줘"`
- `"파이썬으로 알파를 구현해줘"`

### 일반 질문
- `"유전 알고리즘에 대해 설명해줘"`
- `"IC가 뭐야?"`
- `"프로젝트에 대해 설명해줘"`

## 🏗️ 시스템 아키텍처

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   사용자 입력    │───▶│   Coordinator    │───▶│  전문 에이전트   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                               │                         │
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   최종 답변     │◀───│  결과 통합/합성   │◀───│   도구 실행     │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## 🛠️ 주요 기능

### 1. 지능형 라우팅
- 자연어 질문을 분석하여 최적의 전문 에이전트로 자동 라우팅
- 키워드 기반 + 의미 기반 라우팅 알고리즘

### 2. 전문화된 도구
- **데이터 분석**: 알파 데이터 로드, 통계 계산
- **프로젝트 정보**: 백테스트 설정, 구성 정보 조회
- **코드 생성**: WorldQuant 스타일 알파 구현

### 3. 상태 관리
- LangGraph의 상태 관리를 통한 컨텍스트 유지
- 에이전트 간 정보 공유 및 협업

### 4. 확장 가능성
- 새로운 에이전트 쉽게 추가 가능
- 도구 및 기능 모듈화

## 🔧 설정 및 커스터마이징

### LLM 모델 변경
```python
# Langchain.py에서
system = create_multi_agent_system(model_name="llama3.2:latest")

# 다른 모델 사용 시
system = create_multi_agent_system(model_name="codellama:latest")
```

### 에이전트 추가
```python
class NewAgent(BaseAgent):
    def __init__(self, llm):
        super().__init__(
            name="NewAgent",
            description="새로운 전문 분야"
        )
        self.llm = llm
        
    def custom_method(self):
        # 전문 기능 구현
        pass
```

## 📊 프로젝트 통합

이 시스템은 다음 프로젝트 구성 요소와 연동됩니다:

- **backend_module/**: 알파 계산 및 백테스트 시스템
- **database/**: S&P 500 데이터 및 알파 팩터 결과
- **GA_algorithm/**: 유전 알고리즘 기반 알파 생성
- **frontend/**: React 기반 웹 인터페이스

## 🔍 문제 해결

### 자주 발생하는 오류

1. **ModuleNotFoundError**: 
   ```bash
   pip3 install langchain langgraph pandas
   ```

2. **Ollama 연결 실패**:
   ```bash
   ollama serve
   ollama pull llama3.2
   ```

3. **데이터 파일 없음**:
   - `database/sp500_with_alphas.csv` 파일 존재 확인
   - 데이터 생성: `python backend_module/4_ComputeAlphas.py`

### 로그 및 디버깅
- Mock LLM 모드: Ollama 연결 실패 시 자동으로 활성화
- 각 에이전트별 상세 로그 출력
- 에러 발생 시 구체적인 오류 메시지 제공

## 📈 향후 개선 계획

- [ ] 웹 인터페이스 통합
- [ ] 실시간 데이터 연동
- [ ] 더 정교한 라우팅 알고리즘
- [ ] 에이전트 간 더 복잡한 협업 워크플로우
- [ ] 성능 최적화 및 캐싱

## 📞 지원

문제가 발생하거나 개선 제안이 있으시면 프로젝트 이슈로 등록해주세요.

---

**Made with ❤️ for Quantitative Finance**
