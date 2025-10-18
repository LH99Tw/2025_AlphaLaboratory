# 🔍 시스템 전체 검토 및 개선 방향

## [요구사항 분석]

### 📋 AlphaFactory 노드 시스템 요구사항

1. **노드 더블클릭 기능**
   - 작은 상자가 팝업/토글되는 방식
   - 내부 항목 값을 수정하거나 내용 확인 가능

2. **노드별 기능**
   - **노드 1 (데이터 로드)**: S&P 500 데이터 불러오기
   - **노드 2 (백테스트 조건)**: 알파 선택, 기간 설정 등
   - **노드 3 (GA 엔진)**: 개체수, 세대, 최종 생존 수 조절 + 백엔드 API 호출
   - **노드 4 (진화 과정)**: 진행률 % 표시 + 로딩바
   - **노드 5 (최종 결과)**: 결과 요약

3. **진행 상태 표시**
   - 각 단계 완료 시 노드 간 링크가 회색 → 흰색으로 변경

4. **최종 알파 관리**
   - 노드 그래프 하단에 "최종 생존 알파" 리스트
   - 체크박스, 이름(수정 가능), 알파 수식
   - 저장 버튼으로 선택한 알파를 UserAlpha.json에 저장
   - 유저별로 알파 관리

---

## [현재 시스템 상태]

### ✅ 구현된 기능

#### 백엔드 (backend/app.py)
- ✅ GA 알고리즘 실행 API (`/api/ga/run`)
  - 개체수, 세대, 최대 깊이 파라미터 지원
  - 비동기 실행 + 상태 추적 (`/api/ga/status/<task_id>`)
  - 실제 데이터 기반 GA 실행
  
- ✅ 백테스트 API (`/api/backtest`)
  - 팩터 선택, 리밸런싱 주기, 거래비용 등 설정
  - 실제 데이터 기반 성과 지표 계산 (CAGR, Sharpe, MDD, IC)
  
- ✅ 사용자 인증 시스템
  - 로그인/회원가입/로그아웃
  - 세션 기반 인증
  
- ✅ 포트폴리오 API
  - 종목 선별 (`/api/portfolio/stocks`)
  - 성과 분석 (`/api/portfolio/performance`)

#### 프론트엔드 (frontend/src/pages/AlphaIncubator.tsx)
- ✅ ReactFlow 기반 노드 시스템
  - 5개 노드 구조 (Data → Backtest → GA → Evolution → Results)
  - 노드 간 엣지 연결
  - 기본 노드 스타일링
  
- ✅ 채팅 인터페이스
  - AI 에이전트와의 대화 UI
  - 메시지 입력/전송

#### 데이터베이스 (database/)
- ✅ S&P 500 데이터
  - sp500_interpolated.csv (가격 데이터)
  - sp500_with_alphas.csv (알파 팩터)
  - sp500_universe.json (티커 목록)
  
- ✅ 사용자 데이터
  - userdata/users.json (사용자 정보)

#### GA 알고리즘 (GA_algorithm/)
- ✅ AutoAlphaGA 클래스
  - 트리 기반 수식 유전 표현과 다중 기간 IC·IC_IR·회전율·커버리지를 결합한 `FitnessMetrics` 도입
  - PCA 주성분을 활용한 신규성 아카이브 및 토너먼트 선택/연령층 재시작으로 탐색 다양성 확보
  - 가중치 사전(`DEFAULT_METRIC_WEIGHTS`)과 사용자 입력 병합으로 평가 척도 커스터마이즈 지원

---

## [❌ 미구현 기능 및 문제점]

### 1. 노드 더블클릭 및 상세 팝업
**현황**: 노드가 단순 표시만 되고 있음  
**필요**:
- 각 노드별 더블클릭 이벤트 핸들러
- 노드별 커스텀 모달/패널 컴포넌트
- 노드 내부 데이터 편집 UI

### 2. 노드별 상세 기능 구현

#### 노드 1 (데이터 소스)
**필요**:
- S&P 500 데이터 선택 UI
- 날짜 범위 선택
- 데이터 미리보기

#### 노드 2 (백테스트 조건)
**필요**:
- 알파 팩터 선택 (드롭다운 또는 검색)
- 백테스트 기간 설정 (DatePicker)
- 리밸런싱 주기, 거래비용, quantile 설정

#### 노드 3 (GA 엔진)
**필요**:
- 개체수 (population_size) 입력
- 세대 수 (generations) 입력
- 최종 생존 수 (max_depth) 입력
- "GA 실행" 버튼 → `/api/ga/run` 호출

#### 노드 4 (진화 과정)
**필요**:
- 진행률 % 표시
- 로딩 바 (Progress Bar)
- GA 상태 폴링 (`/api/ga/status/<task_id>`)

#### 노드 5 (최종 결과)
**필요**:
- GA 결과 요약 (생성된 알파 수, 평균 fitness 등)
- 더블클릭 시 상세 결과 표시

### 3. 링크 상태 변화
**현황**: 링크가 정적  
**필요**:
- 각 노드 완료 상태 추적 (`nodeCompletionStatus`)
- 완료된 노드 간 엣지 스타일 변경 (회색 → 흰색)

### 4. 최종 알파 리스트 및 저장
**현황**: 구현 완료 (2025-01-17)  
**결과**:
- 노드 그래프 하단 `AlphaListPanel` 컴포넌트 배치
- 체크박스/인라인 이름 편집/수식 툴팁/적합도 표시 적용
- 선택한 알파는 금색 하이라이트 + 저장 버튼 활성화

### 5. UserAlpha 관리 시스템
**현황**: `AlphaStore` 기반으로 구현 완료 (2025-01-17)  
**구성**:
- 저장소: `database/alpha_store/`
  - `shared.json` (공용 알파) + `private/<username>.json` (개인 알파)
  - 최초 실행 시 `database/userdata/user_alphas.json` → private 파일로 자동 마이그레이션
- 백엔드 API:
  - `POST /api/user-alpha/save` : 수식 검증 후 개인 저장소에 추가, 최신 정의 목록 반환
  - `GET /api/user-alpha/list` : 개인/공용 알파 메타데이터 동시 제공
  - `DELETE /api/user-alpha/delete/<alpha_id>` : 개인 알파 삭제 후 최신 목록 반환
- 실행 시 `alphas.registry.AlphaRegistry` 가 공유 WorldQuant 101 + 사용자 정의를 하나의 네임스페이스로 제공

---

## [🔧 개선 작업 계획]

### Phase 1: 노드 시스템 강화 (우선순위: 높음)

#### 1.1 노드별 커스텀 컴포넌트 생성
```typescript
// NodeDetailModal.tsx
interface NodeDetailModalProps {
  nodeId: string;
  nodeType: 'data' | 'backtest' | 'ga' | 'evolution' | 'results';
  data: any;
  onSave: (data: any) => void;
  onClose: () => void;
}

// 노드별 특화 패널
- DataSourcePanel.tsx (노드 1)
- BacktestConfigPanel.tsx (노드 2)
- GAConfigPanel.tsx (노드 3)
- EvolutionProgressPanel.tsx (노드 4)
- ResultsSummaryPanel.tsx (노드 5)
```

#### 1.2 노드 상태 관리 강화
```typescript
interface NodeState {
  id: string;
  completed: boolean;
  data: any;
  error?: string;
}

const [nodeStates, setNodeStates] = useState<Record<string, NodeState>>({
  'data-node': { completed: true, data: { source: 'sp500' } },
  'backtest-node': { completed: false, data: {} },
  'ga-node': { completed: false, data: {} },
  'evolution-node': { completed: false, data: {} },
  'results-node': { completed: false, data: {} },
});
```

#### 1.3 링크 동적 스타일링
```typescript
const getEdgeStyle = (sourceId: string, targetId: string) => {
  const sourceCompleted = nodeStates[sourceId]?.completed;
  const targetCompleted = nodeStates[targetId]?.completed;
  
  return {
    stroke: sourceCompleted ? '#FFFFFF' : '#5F6368',
    strokeWidth: sourceCompleted ? 2 : 1,
  };
};
```

### Phase 2: GA 워크플로우 완성 (우선순위: 높음)

#### 2.1 GA 실행 플로우
```
사용자 → 노드 3 설정 → GA 실행 버튼
  ↓
백엔드 /api/ga/run 호출
  ↓
task_id 받아서 상태 폴링 시작
  ↓
노드 4에서 진행률 표시
  ↓
완료 시 노드 5에 결과 표시
  ↓
하단 리스트에 생성된 알파들 표시
```

#### 2.2 진행률 폴링 시스템
```typescript
const pollGAStatus = useCallback(async (taskId: string) => {
  const interval = setInterval(async () => {
    const response = await fetch(`/api/ga/status/${taskId}`);
    const data = await response.json();
    
    if (data.status === 'completed') {
      clearInterval(interval);
      setNodeStates(prev => ({
        ...prev,
        'evolution-node': { completed: true, data: { results: data.results } }
      }));
    } else if (data.status === 'failed') {
      clearInterval(interval);
      // 에러 처리
    } else {
      // 진행률 업데이트
      setEvolutionProgress(data.progress || 0);
    }
  }, 1000); // 1초마다 폴링
}, []);
```

### Phase 3: 최종 알파 리스트 및 저장 (우선순위: 중간)

#### 3.1 AlphaListPanel 컴포넌트
```typescript
interface AlphaItem {
  id: string;
  name: string;
  expression: string;
  fitness: number;
  selected: boolean;
}

const AlphaListPanel = ({ alphas, onSave }) => {
  return (
    <Panel>
      <Title>최종 생존 알파</Title>
      <AlphaList>
        {alphas.map(alpha => (
          <AlphaRow key={alpha.id}>
            <Checkbox checked={alpha.selected} onChange={...} />
            <EditableName value={alpha.name} onChange={...} />
            <Expression>{alpha.expression}</Expression>
            <Fitness>{alpha.fitness.toFixed(3)}</Fitness>
          </AlphaRow>
        ))}
      </AlphaList>
      <SaveButton onClick={() => onSave(alphas.filter(a => a.selected))}>
        저장
      </SaveButton>
    </Panel>
  );
};
```

#### 3.2 UserAlpha 저장 API (백엔드)
```python
@app.route('/api/user-alpha/save', methods=['POST'])
def save_user_alpha():
    """사용자 알파 저장"""
    alpha_store = AlphaStore(
        os.path.join(PROJECT_ROOT, 'database', 'alpha_store'),
        legacy_user_file=os.path.join(PROJECT_ROOT, 'database', 'userdata', 'user_alphas.json')
    )

    stored_items = alpha_store.add_private(username, [
        {
            "name": alpha_name,
            "expression": expression,
            "metadata": {
                "fitness": payload.get("fitness"),
                "transpiler_version": transpiled.version,
                "python_source": transpiled.python_source
            }
        }
        for payload in alphas
    ])

    registry = build_shared_registry(alpha_store).clone()
    registry.extend(alpha_store.load_private_definitions(username), overwrite=True)

    return jsonify({
        "success": True,
        "saved_alphas": [item.to_dict() for item in stored_items],
        "private_definitions": [
            serialize_alpha_definition(defn)
            for defn in registry.list(owner=username)
        ]
    })
```

### Phase 4: 백엔드 모듈 검증 (우선순위: 낮음)

#### 4.1 GA 알고리즘 검증
- `GA_algorithm/autoalpha_ga.py` 실제 동작 테스트
- 더미 데이터 제거, 실제 알파 생성 확인
- 적합도 함수 검증

#### 4.2 백테스트 시스템 검증
- `backend_module/5_results.py` 정확도 확인
- 성과 지표 계산 로직 검증
- 실제 데이터와 비교

---

## [🎯 우선순위별 작업 순서]

### 1순위: AlphaIncubator 노드 시스템
- [x] 노드 더블클릭 → 모달 열기
- [x] 노드별 설정 패널 구현
- [x] 노드 간 데이터 전달 로직

### 2순위: GA 실행 워크플로우
- [x] 노드 3에서 GA 실행
- [x] 노드 4에서 진행률 표시
- [x] 노드 5에서 결과 표시

### 3순위: 최종 알파 관리
- [x] 알파 리스트 UI
- [x] UserAlpha 저장 API
- [x] 내 알파 조회/삭제/수정 API

### 4순위: 전체 통합 테스트
- [ ] 데이터 로드 → GA 실행 → 결과 저장 전체 플로우 테스트
- [ ] 에러 핸들링 강화
- [ ] 사용자 피드백 개선

---

## [📊 데이터 흐름도]

```
[사용자] → [노드 1: S&P 500 선택]
           ↓
[노드 2: 백테스트 조건 설정]
           ↓
[노드 3: GA 엔진 설정 + 실행]
           ↓ (API Call: /api/ga/run)
[백엔드: GA 실행 시작]
           ↓
[노드 4: 진행률 폴링] ← (API: /api/ga/status/<task_id>)
           ↓
[노드 5: 결과 표시]
           ↓
[최종 알파 리스트] ← (GA 결과 파싱)
           ↓
[사용자: 알파 선택 + 이름 수정]
           ↓ (API Call: /api/user-alpha/save)
[UserAlpha.json 저장]
```

---

## [🔍 추가 개선 사항]

### UI/UX
- 노드 애니메이션 (완료 시 펄스 효과)
- 에러 상태 시각화 (빨간색 테두리 등)
- 로딩 스피너 통일
- 알파 이름 자동 생성 (랜덤 + 의미있는 이름)

### 성능
- GA 실행 시 웹 워커 활용 (UI 블로킹 방지)
- 대용량 결과 페이지네이션
- 캐싱 전략 (이미 실행한 GA는 재사용)

### 보안
- UserAlpha 접근 권한 검증
- SQL Injection 방지 (현재는 파일 기반이라 무관)
- XSS 방지 (알파 표현식 출력 시 이스케이프)

### 확장성
- 여러 데이터 소스 지원 (NASDAQ, KOSPI 등)
- 커스텀 알파 함수 등록
- 알파 공유 기능 (커뮤니티)
