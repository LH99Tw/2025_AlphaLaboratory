"""
🧠 퀀트 금융 멀티 에이전트 AI 시스템 (LangGraph)
==============================================

이 시스템은 WorldQuant 101 Alpha를 기반으로 한 퀀트 금융 분석 프로젝트에 특화된 
LangGraph 멀티 에이전트 시스템입니다. 로컬 Llama 모델을 사용하여 다음 기능을 제공합니다:

🤖 에이전트 구성:
1. 📊 DataAnalyst: 알파 팩터 분석 및 데이터 처리 전문가
2. 🧬 AlphaResearcher: 새로운 알파 팩터 연구 및 제안 전문가  
3. 💼 PortfolioManager: 백테스트 및 포트폴리오 최적화 전문가
4. 🔧 CodeGenerator: 파이썬 코드 생성 및 최적화 전문가
5. 🎯 Coordinator: 에이전트 간 조율 및 사용자 인터페이스 관리

🔄 워크플로우:
- 사용자 쿼리 분석 → 적절한 에이전트 선택 → 병렬/순차 처리 → 결과 통합
"""

import os
import sys
import json
import asyncio
from typing import List, Dict, Any, Optional, TypedDict, Annotated, Literal
from datetime import datetime, timedelta
from dataclasses import dataclass

# LangGraph imports  
from langgraph.graph import StateGraph, END
from langgraph.prebuilt import ToolNode
from langgraph.checkpoint.memory import MemorySaver

# LangChain imports
try:
    from langchain_ollama import ChatOllama
except ImportError:
    try:
        from langchain_community.llms import Ollama as ChatOllama
    except ImportError:
        from langchain.llms import Ollama as ChatOllama

from langchain.tools import Tool
from langchain.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain.schema import BaseMessage, HumanMessage, AIMessage, SystemMessage
from langchain.agents import AgentExecutor, create_tool_calling_agent

# 프로젝트 경로 설정
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATABASE_PATH = os.path.join(PROJECT_ROOT, 'database')
BACKEND_MODULE_PATH = os.path.join(PROJECT_ROOT, 'backend_module')

# 프로젝트 모듈 import 경로 추가
sys.path.append(PROJECT_ROOT)
sys.path.append(BACKEND_MODULE_PATH)

# ===========================
# 상태 정의 (State Schema)
# ===========================
class AgentState(TypedDict):
    """멀티 에이전트 시스템의 공유 상태"""
    messages: List[BaseMessage]
    current_agent: str
    task_type: str
    data_context: Dict[str, Any]
    results: Dict[str, Any]
    next_action: str
    user_query: str
    
@dataclass
class QuantTools:
    """퀀트 금융 분석 도구 모음"""
    
    @staticmethod
    def load_alpha_data(alpha_name: str = None) -> Dict[str, Any]:
        """알파 데이터 로드"""
        try:
            import pandas as pd
            alpha_file = os.path.join(DATABASE_PATH, "sp500_with_alphas.csv")
            if os.path.exists(alpha_file):
                df = pd.read_csv(alpha_file, nrows=1000)  # 샘플 데이터
                if alpha_name and alpha_name in df.columns:
                    stats = {
                        "mean": float(df[alpha_name].mean()),
                        "std": float(df[alpha_name].std()),
                        "min": float(df[alpha_name].min()),
                        "max": float(df[alpha_name].max()),
                        "non_zero_ratio": float((df[alpha_name] != 0).mean())
                    }
                    return {"status": "success", "data": stats, "alpha": alpha_name}
                else:
                    alpha_columns = [col for col in df.columns if col.startswith('alpha')]
                    return {"status": "success", "available_alphas": alpha_columns[:10]}
            return {"status": "error", "message": "데이터 파일을 찾을 수 없습니다"}
        except Exception as e:
            return {"status": "error", "message": str(e)}
    
    @staticmethod  
    def get_project_info() -> Dict[str, Any]:
        """프로젝트 정보 조회"""
        try:
            readme_path = os.path.join(PROJECT_ROOT, "README.md")
            config_path = os.path.join(BACKEND_MODULE_PATH, "backtest_config.json")
            
            info = {"project_type": "WorldQuant 101 Alpha 기반 퀀트 시스템"}
            
            if os.path.exists(config_path):
                with open(config_path, 'r', encoding='utf-8') as f:
                    config = json.load(f)
                    info["backtest_config"] = config
                    
            return {"status": "success", "data": info}
        except Exception as e:
            return {"status": "error", "message": str(e)}
    
    @staticmethod
    def calculate_basic_stats(data_type: str) -> Dict[str, Any]:
        """기본 통계 계산"""
        try:
            import pandas as pd
            import numpy as np
            
            if data_type == "price":
                price_file = os.path.join(DATABASE_PATH, "sp500_prices.csv") 
                if os.path.exists(price_file):
                    df = pd.read_csv(price_file, nrows=1000)
                    stats = {
                        "total_records": len(df),
                        "unique_tickers": df['Ticker'].nunique() if 'Ticker' in df.columns else 0,
                        "date_range": {
                            "start": str(df['Date'].min()) if 'Date' in df.columns else None,
                            "end": str(df['Date'].max()) if 'Date' in df.columns else None
                        }
                    }
                    return {"status": "success", "data": stats}
            
            return {"status": "error", "message": f"Unknown data type: {data_type}"}
        except Exception as e:
            return {"status": "error", "message": str(e)}

# ===========================
# 에이전트 클래스들
# ===========================

class BaseAgent:
    """기본 에이전트 클래스"""
    
    def __init__(self, name: str, description: str, llm=None):
        self.name = name
        self.description = description
        self.llm = llm
        self.tools = []
    
    def create_system_prompt(self) -> str:
        """에이전트별 시스템 프롬프트 생성"""
        return f"""당신은 {self.name}입니다. {self.description}

당신의 역할:
- 전문 분야에서 정확하고 실용적인 답변 제공
- 필요시 적절한 도구 사용
- 다른 에이전트와 협력하여 최적의 결과 도출

답변 시 다음을 준수:
1. 전문성을 바탕으로 한 정확한 정보 제공
2. 구체적인 예시와 수치 포함
3. 실무에 적용 가능한 조언
4. 한글로 명확하게 설명"""

class DataAnalyst(BaseAgent):
    """데이터 분석 전문 에이전트"""
    
    def __init__(self, llm):
        super().__init__(
            name="DataAnalyst",
            description="알파 팩터 분석, 데이터 처리, 통계 분석 전문가",
            llm=llm
        )
        self.tools = [
            Tool(
                name="load_alpha_data",
                description="알파 팩터 데이터를 로드하고 기본 통계를 계산합니다. alpha_name을 지정하면 해당 알파의 상세 정보를 제공합니다.",
                func=lambda alpha_name="": QuantTools.load_alpha_data(alpha_name if alpha_name else None)
            ),
            Tool(
                name="calculate_stats", 
                description="price, alpha 등의 데이터 타입에 대한 기본 통계를 계산합니다.",
                func=QuantTools.calculate_basic_stats
            )
        ]
    
    def analyze_alpha_factor(self, alpha_name: str, state: AgentState) -> str:
        """알파 팩터 분석"""
        data_result = QuantTools.load_alpha_data(alpha_name)
        
        if data_result["status"] == "success" and "data" in data_result:
            stats = data_result["data"]
            analysis = f"""
📊 {alpha_name} 알파 팩터 분석 결과:

기본 통계:
- 평균값: {stats['mean']:.4f}
- 표준편차: {stats['std']:.4f}  
- 최솟값: {stats['min']:.4f}
- 최댓값: {stats['max']:.4f}
- 유효 데이터 비율: {stats['non_zero_ratio']:.2%}

💡 분석 인사이트:
- 표준편차가 {'높아' if stats['std'] > 1 else '낮아'} 변동성이 {'큰' if stats['std'] > 1 else '작은'} 팩터입니다
- 유효 데이터 비율이 {stats['non_zero_ratio']:.1%}로 {'양호' if stats['non_zero_ratio'] > 0.5 else '부족'}합니다
- {'극값이 존재하여' if abs(stats['max']) > 3*stats['std'] or abs(stats['min']) > 3*stats['std'] else '안정적인 분포를 보이며'} 추가 검토가 {'필요' if abs(stats['max']) > 3*stats['std'] else '불필요'}합니다

🔍 권장사항:
- IC 계산을 통한 예측력 검증
- 시계열 안정성 분석
- 다른 팩터와의 상관관계 확인
"""
            return analysis
        else:
            return f"❌ {alpha_name} 분석 실패: {data_result.get('message', '알 수 없는 오류')}"

class AlphaResearcher(BaseAgent):
    """알파 연구 전문 에이전트"""
    
    def __init__(self, llm):
        super().__init__(
            name="AlphaResearcher", 
            description="새로운 알파 팩터 연구, WorldQuant 101 Alpha 전문가",
            llm=llm
        )
        
    def suggest_new_alpha(self, market_condition: str = "현재") -> str:
        """새로운 알파 팩터 제안"""
        prompt = f"""
{market_condition} 시장 환경에 적합한 새로운 알파 팩터를 제안해주세요.

WorldQuant 101 Alpha 스타일의 수식을 기반으로:

기본 데이터: open, high, low, close, volume, vwap, returns
기본 연산자: rank(), ts_rank(), delta(), correlation(), ts_sum(), stddev() 등

제안 형식:
1. 알파 수식: rank(correlation(delta(close, 5), volume, 10))
2. 경제적 직관: 5일 가격 변화와 거래량의 상관관계
3. 예상 특성: 모멘텀/리버설/볼륨 기반
4. 구현 고려사항: 데이터 지연, 계산 복잡도
5. 검증 방법: IC 측정, 백테스트 기간

새로운 알파 팩터 3개를 제안해주세요.
"""
        
        try:
            response = self.llm.invoke(prompt)
            return response.content if hasattr(response, 'content') else str(response)
        except Exception as e:
            return f"알파 제안 생성 중 오류: {e}"

class PortfolioManager(BaseAgent):
    """포트폴리오 관리 전문 에이전트"""
    
    def __init__(self, llm):
        super().__init__(
            name="PortfolioManager",
            description="백테스트, 포트폴리오 최적화, 리스크 관리 전문가",
            llm=llm
        )
        self.tools = [
            Tool(
                name="get_project_info",
                description="프로젝트의 백테스트 설정 및 구성 정보를 조회합니다.",
                func=QuantTools.get_project_info
            )
        ]
    
    def analyze_backtest_strategy(self, strategy_info: Dict[str, Any]) -> str:
        """백테스트 전략 분석"""
        project_info = QuantTools.get_project_info()
        
        analysis = f"""
📈 백테스트 전략 분석:

현재 프로젝트 설정:
{json.dumps(project_info.get('data', {}), indent=2, ensure_ascii=False)}

💼 포트폴리오 관리 권장사항:
1. 리밸런싱 주기: 주간 (거래비용 vs 성능 균형)
2. 포지션 크기: 동일가중 또는 변동성 조정
3. 리스크 관리: 
   - 개별 종목 최대 5% 제한
   - 섹터 집중도 모니터링
   - VaR 기반 손실 한계 설정

🔍 성과 측정 지표:
- IC (Information Coefficient): 팩터 예측력
- Sharpe Ratio: 위험 대비 수익
- Maximum Drawdown: 최대 손실폭
- Turnover: 회전율 및 거래비용

⚡ 최적화 제안:
- 팩터 조합을 통한 다각화
- 시장 체제별 적응형 가중치
- 거래비용 최소화 알고리즘
"""
        return analysis

class CodeGenerator(BaseAgent):
    """코드 생성 전문 에이전트"""
    
    def __init__(self, llm):
        super().__init__(
            name="CodeGenerator",
            description="파이썬 코드 생성, 최적화, 알파 구현 전문가",
            llm=llm
        )
        
    def generate_alpha_code(self, alpha_formula: str) -> str:
        """알파 팩터 코드 생성"""
        prompt = f"""
다음 알파 팩터 수식을 WorldQuant 스타일의 파이썬 코드로 구현해주세요:

수식: {alpha_formula}

기준 코드 형식:
```python
def alpha_new(self):
    # 수식 구현
    result = rank(correlation(delta(self.close, 5), self.volume, 10))
    return result.replace([np.inf, -np.inf], 0).fillna(0)
```

요구사항:
1. Alphas 클래스의 메서드 형태
2. self.open, self.high, self.low, self.close, self.volume 사용
3. numpy/pandas 연산 활용
4. inf, nan 값 처리
5. 주석으로 로직 설명

완성된 코드를 제공해주세요.
"""
        
        try:
            response = self.llm.invoke(prompt)
            return response.content if hasattr(response, 'content') else str(response)
        except Exception as e:
            return f"코드 생성 중 오류: {e}"

class Coordinator(BaseAgent):
    """조율 및 인터페이스 관리 에이전트"""
    
    def __init__(self, llm):
        super().__init__(
            name="Coordinator",
            description="에이전트 간 조율, 사용자 인터페이스, 워크플로우 관리",
            llm=llm
        )
    
    def route_query(self, user_query: str) -> str:
        """사용자 쿼리를 적절한 에이전트로 라우팅"""
        query_lower = user_query.lower()
        
        # 키워드 기반 라우팅
        if any(keyword in query_lower for keyword in ['분석', 'alpha', '알파', '데이터', '통계']):
            return "data_analyst"
        elif any(keyword in query_lower for keyword in ['새로운', '제안', '아이디어', '연구', '팩터']):
            return "alpha_researcher"
        elif any(keyword in query_lower for keyword in ['백테스트', '포트폴리오', '전략', '성과', '리스크']):
            return "portfolio_manager"
        elif any(keyword in query_lower for keyword in ['코드', '구현', '파이썬', 'python', '프로그래밍']):
            return "code_generator"
        else:
            return "coordinator"  # 기본값

# ===========================
# LangGraph 워크플로우 시스템
# ===========================

class QuantFinanceMultiAgentSystem:
    """LangGraph 기반 멀티 에이전트 시스템"""
    
    def __init__(self, model_name: str = "llama3.2:latest"):
        """
        초기화
        
        Args:
            model_name: 사용할 Ollama 모델 이름
        """
        self.model_name = model_name
        self.llm = None
        self.agents = {}
        self.graph = None
        self.memory = MemorySaver()
        
        # 초기화
        self._initialize_llm()
        self._create_agents()
        self._build_graph()
    
    def _initialize_llm(self):
        """Ollama LLM 초기화"""
        try:
            self.llm = ChatOllama(
                model=self.model_name,
                temperature=0.3,
                # num_ctx=4096,
            )
            print(f"✅ Llama 모델 '{self.model_name}' 연결 성공")
        except Exception as e:
            print(f"❌ Llama 모델 연결 실패: {e}")
            # Fallback - 간단한 Mock LLM 생성
            self.llm = self._create_mock_llm()
    
    def _create_mock_llm(self):
        """Mock LLM 생성 (테스트용)"""
        class MockLLM:
            def invoke(self, prompt):
                class MockResponse:
                    def __init__(self, content):
                        self.content = content
                return MockResponse("Mock LLM 응답: 실제 Ollama 연결이 필요합니다.")
        return MockLLM()
    
    def _create_agents(self):
        """에이전트들 생성"""
        self.agents = {
            "coordinator": Coordinator(self.llm),
            "data_analyst": DataAnalyst(self.llm),
            "alpha_researcher": AlphaResearcher(self.llm),
            "portfolio_manager": PortfolioManager(self.llm),
            "code_generator": CodeGenerator(self.llm)
        }
        print(f"✅ {len(self.agents)}개 에이전트 생성 완료")
    
    def _build_graph(self):
        """LangGraph 워크플로우 구축"""
        workflow = StateGraph(AgentState)
        
        # 노드 추가
        workflow.add_node("coordinator", self._coordinator_node)
        workflow.add_node("data_analyst", self._data_analyst_node)
        workflow.add_node("alpha_researcher", self._alpha_researcher_node)
        workflow.add_node("portfolio_manager", self._portfolio_manager_node)
        workflow.add_node("code_generator", self._code_generator_node)
        workflow.add_node("synthesize", self._synthesize_node)
        
        # 엣지 추가 (라우팅 로직)
        workflow.set_entry_point("coordinator")
        
        workflow.add_conditional_edges(
            "coordinator",
            self._route_to_agent,
            {
                "data_analyst": "data_analyst",
                "alpha_researcher": "alpha_researcher", 
                "portfolio_manager": "portfolio_manager",
                "code_generator": "code_generator",
                "end": END
            }
        )
        
        # 각 전문 에이전트에서 결과 합성으로
        for agent in ["data_analyst", "alpha_researcher", "portfolio_manager", "code_generator"]:
            workflow.add_edge(agent, "synthesize")
        
        workflow.add_edge("synthesize", END)
        
        # 그래프 컴파일
        self.graph = workflow.compile(checkpointer=self.memory)
        print("✅ LangGraph 워크플로우 구축 완료")
    
    def _coordinator_node(self, state: AgentState) -> AgentState:
        """코디네이터 노드"""
        coordinator = self.agents["coordinator"]
        user_query = state["user_query"]
        
        # 라우팅 결정
        target_agent = coordinator.route_query(user_query)
        
        state["current_agent"] = target_agent
        state["task_type"] = target_agent
        state["messages"].append(
            AIMessage(content=f"🎯 사용자 요청을 {target_agent} 에이전트로 라우팅했습니다.")
        )
        
        return state
    
    def _data_analyst_node(self, state: AgentState) -> AgentState:
        """데이터 분석가 노드"""
        analyst = self.agents["data_analyst"]
        user_query = state["user_query"]
        
        # 알파 이름 추출 (간단한 방식)
        alpha_name = "alpha001"  # 기본값
        if "alpha" in user_query.lower():
            import re
            match = re.search(r'alpha\d+', user_query.lower())
            if match:
                alpha_name = match.group()
        
        # 분석 수행
        result = analyst.analyze_alpha_factor(alpha_name, state)
        
        state["results"]["data_analysis"] = result
        state["messages"].append(AIMessage(content=result))
        
        return state
    
    def _alpha_researcher_node(self, state: AgentState) -> AgentState:
        """알파 연구가 노드"""
        researcher = self.agents["alpha_researcher"]
        
        # 새로운 알파 제안
        result = researcher.suggest_new_alpha()
        
        state["results"]["alpha_research"] = result
        state["messages"].append(AIMessage(content=result))
        
        return state
    
    def _portfolio_manager_node(self, state: AgentState) -> AgentState:
        """포트폴리오 매니저 노드"""
        manager = self.agents["portfolio_manager"]
        
        # 백테스트 전략 분석
        result = manager.analyze_backtest_strategy({})
        
        state["results"]["portfolio_analysis"] = result
        state["messages"].append(AIMessage(content=result))
        
        return state
    
    def _code_generator_node(self, state: AgentState) -> AgentState:
        """코드 생성기 노드"""
        generator = self.agents["code_generator"]
        user_query = state["user_query"]
        
        # 수식 추출 (간단한 방식)
        alpha_formula = "rank(correlation(delta(close, 5), volume, 10))"  # 기본값
        
        # 코드 생성
        result = generator.generate_alpha_code(alpha_formula)
        
        state["results"]["code_generation"] = result
        state["messages"].append(AIMessage(content=result))
        
        return state
    
    def _synthesize_node(self, state: AgentState) -> AgentState:
        """결과 합성 노드"""
        results = state["results"]
        
        synthesis = "🔗 **종합 분석 결과**\n\n"
        
        for key, value in results.items():
            synthesis += f"**{key.replace('_', ' ').title()}:**\n{value}\n\n"
        
        synthesis += "\n💡 **추천 다음 단계:**\n"
        synthesis += "1. 제안된 알파 팩터의 IC 계산\n"
        synthesis += "2. 백테스트를 통한 성과 검증\n" 
        synthesis += "3. 포트폴리오 통합 및 리스크 분석\n"
        synthesis += "4. 실제 거래 환경에서의 구현\n"
        
        state["messages"].append(AIMessage(content=synthesis))
        
        return state
    
    def _route_to_agent(self, state: AgentState) -> str:
        """에이전트 라우팅 결정"""
        current_agent = state.get("current_agent", "coordinator")
        
        if current_agent in ["data_analyst", "alpha_researcher", "portfolio_manager", "code_generator"]:
            return current_agent
        else:
            return "end"
    
    async def process_query(self, user_query: str, config: Dict[str, Any] = None) -> str:
        """사용자 쿼리 처리"""
        if config is None:
            config = {"configurable": {"thread_id": "default"}}
        
        # 초기 상태 설정
        initial_state = {
            "messages": [HumanMessage(content=user_query)],
            "current_agent": "",
            "task_type": "",
            "data_context": {},
            "results": {},
            "next_action": "",
            "user_query": user_query
        }
        
        try:
            # 그래프 실행
            result = await self.graph.ainvoke(initial_state, config=config)
            
            # 마지막 AI 메시지 반환
            ai_messages = [msg for msg in result["messages"] if isinstance(msg, AIMessage)]
            if ai_messages:
                return ai_messages[-1].content
            else:
                return "처리 중 오류가 발생했습니다."
                
        except Exception as e:
            return f"쿼리 처리 중 오류: {e}"
    
    def process_query_sync(self, user_query: str) -> str:
        """동기 방식 쿼리 처리"""
        try:
            return asyncio.run(self.process_query(user_query))
        except Exception as e:
            return f"처리 중 오류: {e}"
    
    def chat(self, user_input: str) -> str:
        """간단한 대화 인터페이스"""
        return self.process_query_sync(user_input)

# ===========================
# 편의 함수들
# ===========================

def create_multi_agent_system(model_name: str = "llama3.2:latest") -> QuantFinanceMultiAgentSystem:
    """멀티 에이전트 시스템 생성"""
    return QuantFinanceMultiAgentSystem(model_name)

def main():
    """메인 실행 함수 - 대화형 인터페이스"""
    print("🧠 퀀트 금융 멀티 에이전트 AI 시스템 (LangGraph)")
    print("=" * 60)
    
    try:
        system = create_multi_agent_system()
        print("\n🎯 사용 가능한 에이전트:")
        print("📊 DataAnalyst: 알파 팩터 분석 및 데이터 처리")
        print("🧬 AlphaResearcher: 새로운 알파 팩터 연구 및 제안")
        print("💼 PortfolioManager: 백테스트 및 포트폴리오 최적화")
        print("🔧 CodeGenerator: 파이썬 코드 생성 및 최적화")
        print("🎯 Coordinator: 에이전트 간 조율 및 워크플로우 관리")
        
        print("\n💬 예시 명령어:")
        print("- 'alpha001 분석해줘'")
        print("- '새로운 알파 팩터 제안해줘'")
        print("- '백테스트 전략 분석해줘'")
        print("- '알파 코드 구현해줘'")
        print("- 'exit' 또는 '종료'로 프로그램 종료")
        print("=" * 60)
        
        while True:
            user_input = input("\n💬 질문을 입력하세요: ").strip()
            
            if user_input.lower() in ['exit', 'quit', '종료']:
                print("멀티 에이전트 시스템을 종료합니다.")
                break
                
            if not user_input:
                continue
                
            print(f"\n🔄 처리 중: '{user_input}'")
            print("-" * 50)
            
            # 처리 및 응답
            response = system.chat(user_input)
            print(response)
            
    except KeyboardInterrupt:
        print("\n\n시스템을 종료합니다.")
    except Exception as e:
        print(f"\n❌ 오류 발생: {e}")

if __name__ == "__main__":
    main()
