#!/usr/bin/env python3
"""
간단한 퀀트 금융 AI 어시스턴트
==========================

복잡한 LangGraph 없이 바로 사용할 수 있는 단순하고 빠른 버전입니다.
"""

import os
import sys
import json
import re
from typing import Dict, Any, Optional

# 프로젝트 경로 설정
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATABASE_PATH = os.path.join(PROJECT_ROOT, 'database')
BACKEND_MODULE_PATH = os.path.join(PROJECT_ROOT, 'backend_module')

sys.path.append(PROJECT_ROOT)
sys.path.append(BACKEND_MODULE_PATH)

class QuickQuantAssistant:
    """빠르고 간단한 퀀트 금융 어시스턴트"""
    
    def __init__(self, use_llama: bool = True):
        self.use_llama = use_llama
        self.llm = None
        
        if use_llama:
            self._init_llama()
        
        print("✅ QuickQuant 어시스턴트 준비 완료!")
    
    def _get_ic_recommendation(self, ic_info: str) -> str:
        """IC 정보를 바탕으로 권장사항 생성"""
        try:
            if ic_info and 'IC' in ic_info:
                ic_pattern = r'IC.*?(-?\d+\.\d+)'
                match = re.search(ic_pattern, ic_info)
                if match:
                    ic_value = abs(float(match.group(1)))
                    if ic_value > 0.03:
                        return 'IC가 우수하므로 포트폴리오에 활용 검토'
                    else:
                        return 'IC 개선 방안 연구 필요'
            return 'IC 계산 후 평가 필요'
        except:
            return 'IC 개선 방안 연구 필요'
    
    def _init_llama(self):
        """Llama 초기화 시도"""
        try:
            # 최신 방식부터 시도
            try:
                from langchain_ollama import ChatOllama
                self.llm = ChatOllama(model="llama3.2:latest", temperature=0.3)
                print("✅ Llama 3.2 연결 성공 (langchain_ollama)")
                return
            except ImportError:
                pass
            
            try:
                from langchain_community.llms import Ollama
                self.llm = Ollama(model="llama3.2:latest", temperature=0.3)
                print("✅ Llama 3.2 연결 성공 (langchain_community)")
                return
            except ImportError:
                pass
                
            # 기본 방식
            from langchain.llms import Ollama
            self.llm = Ollama(model="llama3.2:latest", temperature=0.3)
            print("✅ Llama 3.2 연결 성공 (langchain)")
            
        except Exception as e:
            print(f"⚠️ Llama 연결 실패: {e}")
            print("📝 텍스트 기반 분석 모드로 전환합니다.")
            self.use_llama = False
    
    def analyze_alpha(self, alpha_name: str) -> str:
        """알파 팩터 분석"""
        try:
            import pandas as pd
            import numpy as np
            
            alpha_file = os.path.join(DATABASE_PATH, "sp500_with_alphas.csv")
            
            if not os.path.exists(alpha_file):
                return "❌ 알파 데이터 파일을 찾을 수 없습니다. 데이터를 먼저 생성해주세요."
            
            df = pd.read_csv(alpha_file, nrows=2000)  # 샘플 데이터
            
            if alpha_name not in df.columns:
                alphas = [col for col in df.columns if col.startswith('alpha')]
                return f"""❌ '{alpha_name}'을 찾을 수 없습니다.

📋 사용 가능한 알파 팩터:
{', '.join(alphas[:20])}"""
            
            # 기본 통계 계산
            alpha_data = df[alpha_name].dropna()
            
            if len(alpha_data) == 0:
                return f"❌ {alpha_name}에 유효한 데이터가 없습니다."
            
            mean_val = alpha_data.mean()
            std_val = alpha_data.std()
            min_val = alpha_data.min()
            max_val = alpha_data.max()
            non_zero_ratio = (alpha_data != 0).mean()
            
            # IC 계산 시도
            ic_info = ""
            if 'NextDayReturn' in df.columns:
                try:
                    ic = df[alpha_name].corr(df['NextDayReturn'])
                    if not pd.isna(ic):
                        ic_info = f"\n📈 IC (Information Coefficient): {ic:.4f}"
                        if abs(ic) > 0.03:
                            ic_info += " ✅ 우수한 예측력!"
                        elif abs(ic) > 0.01:
                            ic_info += " 🟡 보통 예측력"
                        else:
                            ic_info += " 🔴 낮은 예측력"
                except:
                    ic_info = "\n⚠️ IC 계산 실패"
            
            # 분석 결과 생성
            result = f"""
📊 {alpha_name} 알파 팩터 분석

📈 기본 통계:
• 평균값: {mean_val:.6f}
• 표준편차: {std_val:.6f}
• 최솟값: {min_val:.6f}
• 최댓값: {max_val:.6f}
• 유효 데이터 비율: {non_zero_ratio:.1%}{ic_info}

💡 분석 인사이트:
• 변동성: {'높음 🔴' if std_val > 1 else '보통 🟡' if std_val > 0.5 else '낮음 ✅'}
• 데이터 품질: {'양호 ✅' if non_zero_ratio > 0.7 else '보통 🟡' if non_zero_ratio > 0.3 else '부족 🔴'}
• 극값 존재: {'있음 ⚠️' if abs(max_val) > 3*std_val or abs(min_val) > 3*std_val else '없음 ✅'}

🔍 권장 사항:
1. {self._get_ic_recommendation(ic_info)}
2. 다른 알파 팩터와의 상관관계 분석
3. 시계열 안정성 검증
4. 섹터별/시가총액별 성과 분석
"""
            
            # LLM이 있으면 추가 분석
            if self.use_llama and self.llm:
                try:
                    llm_prompt = f"""
{alpha_name} 알파 팩터 분석 결과:
- 평균: {mean_val:.4f}, 표준편차: {std_val:.4f}
- 유효 데이터 비율: {non_zero_ratio:.1%}
{ic_info}

퀀트 금융 전문가로서 이 알파 팩터에 대한 실무적 조언을 3줄로 요약해주세요.
"""
                    
                    llm_response = self.llm.invoke(llm_prompt)
                    if hasattr(llm_response, 'content'):
                        llm_advice = llm_response.content
                    else:
                        llm_advice = str(llm_response)
                    
                    result += f"\n🤖 AI 조언:\n{llm_advice}"
                    
                except Exception as e:
                    result += f"\n⚠️ AI 분석 실패: {e}"
            
            return result
            
        except ImportError:
            return "❌ pandas가 설치되지 않았습니다. pip3 install pandas로 설치해주세요."
        except Exception as e:
            return f"❌ 분석 중 오류 발생: {e}"
    
    def suggest_alpha(self, market_condition: str = "현재") -> str:
        """새로운 알파 팩터 제안"""
        
        base_suggestions = [
            {
                "name": "Alpha_MomentumReverse",
                "formula": "rank(correlation(delta(close, 5), -delta(volume, 5), 10))",
                "description": "5일 가격 변화와 거래량 역변화의 상관관계",
                "intuition": "가격 상승 시 거래량 감소는 반전 신호일 수 있음"
            },
            {
                "name": "Alpha_VolatilityMean",
                "formula": "rank(ts_sum(abs(returns), 20) / ts_sum(volume, 20))",
                "description": "20일 변동성과 거래량의 비율",
                "intuition": "단위 거래량당 변동성이 높으면 정보 비대칭 존재"
            },
            {
                "name": "Alpha_PricePattern", 
                "formula": "rank(correlation(rank(high - close), rank(volume), 7))",
                "description": "고가-종가 갭과 거래량의 7일 상관관계",
                "intuition": "상한가 근처 마감과 거래량 관계로 매수압 측정"
            }
        ]
        
        result = f"""
💡 {market_condition} 시장을 위한 새로운 알파 팩터 제안

"""
        
        for i, alpha in enumerate(base_suggestions, 1):
            result += f"""
🔬 Alpha 제안 {i}: {alpha['name']}

📐 수식:
{alpha['formula']}

💭 설명: {alpha['description']}
🧠 직관: {alpha['intuition']}

💼 구현 고려사항:
• 데이터 지연: T+1 구현 가능
• 계산 복잡도: 중간
• 예상 IC: 0.01~0.03

🔍 검증 방법:
• 롤링 IC 안정성 확인
• 섹터 중립성 테스트
• 거래비용 고려 백테스트

"""
        
        # LLM 추가 제안
        if self.use_llama and self.llm:
            try:
                llm_prompt = f"""
{market_condition} 시장 환경에서 WorldQuant 101 Alpha 스타일의 새로운 알파 팩터를 1개 더 제안해주세요.

형식:
- 수식: rank(...)
- 설명: 한 줄 설명
- 직관: 경제적 논리

간단하고 실용적인 제안을 해주세요.
"""
                
                llm_response = self.llm.invoke(llm_prompt)
                if hasattr(llm_response, 'content'):
                    llm_suggestion = llm_response.content
                else:
                    llm_suggestion = str(llm_response)
                
                result += f"🤖 AI 추가 제안:\n{llm_suggestion}"
                
            except Exception as e:
                result += f"⚠️ AI 제안 생성 실패: {e}"
        
        return result
    
    def explain_ga(self) -> str:
        """유전 알고리즘 설명"""
        return """
🧬 유전 알고리즘을 이용한 알파 팩터 생성

🎯 기본 개념:
• 자연 진화를 모방한 최적화 알고리즘
• 다양한 알파 수식을 '유전자'로 취급
• IC(Information Coefficient)를 '적합도'로 사용

🔄 진화 과정:
1. 초기 개체군: 랜덤한 알파 수식들 생성
2. 평가: 각 알파의 IC 계산
3. 선택: 높은 IC를 가진 알파들 선별
4. 교배: 우수한 알파들을 조합하여 새로운 수식 생성
5. 돌연변이: 일부 수식에 임의 변화 추가
6. 반복: 여러 세대에 걸쳐 개선

💡 실제 구현 예시:
부모1: rank(correlation(close, volume, 10))
부모2: rank(delta(high, 5))
자식: rank(correlation(delta(close, 5), volume, 10))

⚡ 장점:
• 인간이 생각하지 못한 패턴 발견
• 복잡한 수식 자동 생성
• 시장 변화에 적응적

⚠️ 주의사항:
• 과최적화(Overfitting) 위험
• 계산 비용 높음
• 다양성 유지 필요

🔧 프로젝트 적용:
GA_algorithm/ 폴더의 코드를 사용하여 새로운 알파 생성 가능
"""
    
    def get_project_info(self) -> str:
        """프로젝트 정보 제공"""
        try:
            info = """
📋 프로젝트 개요: WorldQuant 101 Alpha 기반 퀀트 시스템

🏗️ 주요 구성:
• backend/: FastAPI 웹 서버
• frontend/: React 웹 인터페이스  
• backend_module/: 핵심 알파 계산 엔진
• database/: S&P 500 데이터 저장소
• GA_algorithm/: 유전 알고리즘 알파 생성
• Langchain/: AI 어시스턴트 시스템

📊 데이터 파이프라인:
1. S&P 500 주가 데이터 수집 (Yahoo Finance)
2. SEC 재무 데이터 보강
3. 보간 및 전처리
4. 101개 알파 팩터 계산
5. 백테스트 및 성과 평가

🧮 주요 알파 팩터:
• 모멘텀 기반: delta, ts_rank 활용
• 리버설 기반: correlation 역관계
• 볼륨 기반: volume, vwap 조합
• 변동성 기반: stddev, 가격 범위

📈 성과 지표:
• IC (Information Coefficient): 예측력 측정
• Sharpe Ratio: 위험 대비 수익
• Maximum Drawdown: 최대 손실
• Turnover: 회전율
"""
            
            # 설정 파일 읽기
            config_file = os.path.join(BACKEND_MODULE_PATH, "backtest_config.json")
            if os.path.exists(config_file):
                with open(config_file, 'r', encoding='utf-8') as f:
                    config = json.load(f)
                    info += f"\n⚙️ 백테스트 설정:\n{json.dumps(config, indent=2, ensure_ascii=False)}"
            
            return info
            
        except Exception as e:
            return f"❌ 프로젝트 정보 로드 실패: {e}"
    
    def generate_code(self, formula: str) -> str:
        """알파 팩터 코드 생성"""
        
        if not formula:
            formula = "rank(correlation(delta(close, 5), volume, 10))"
        
        # 간단한 템플릿 기반 코드 생성
        template = f'''
def alpha_new(self):
    """
    생성된 알파 팩터: {formula}
    """
    try:
        # 수식 구현
        result = {formula}
        
        # 무한값 및 NaN 처리
        result = result.replace([np.inf, -np.inf], 0).fillna(0)
        
        return result
        
    except Exception as e:
        print(f"Alpha 계산 오류: {{e}}")
        return pd.Series(0, index=self.close.index)
'''
        
        base_code = f"""
📝 {formula} 알파 팩터 구현 코드:

```python
import numpy as np
import pandas as pd
from Alphas import *  # ts_rank, correlation, delta 등 함수 import
{template}
```

🔧 사용법:
1. 위 코드를 Alphas.py 또는 NewAlphas.py에 추가
2. 데이터 준비: self.close, self.volume 등이 설정된 상태에서 호출
3. 백테스트: 5_results.py의 LongOnlyBacktestSystem으로 성과 검증

💡 팁:
• rank() 함수는 cross-sectional ranking (종목간 순위)
• delta(x, n)은 n일 차분 (x - shift(x, n))
• correlation(x, y, n)은 n일 rolling correlation
• 모든 연산은 pandas DataFrame/Series 기반

⚠️ 주의사항:
• 데이터 지연 고려 (T+1 구현)
• inf, nan 값 처리 필수
• 백테스트 전 데이터 품질 확인
"""
        
        # LLM 코드 개선
        if self.use_llama and self.llm:
            try:
                llm_prompt = f"""
다음 알파 팩터 수식을 WorldQuant 스타일 파이썬 코드로 더 정교하게 구현해주세요:

{formula}

요구사항:
- Alphas 클래스의 메서드 형태
- 에러 처리 포함
- 주석으로 로직 설명
- inf/nan 값 처리

간단하고 실용적인 코드를 작성해주세요.
"""
                
                llm_response = self.llm.invoke(llm_prompt)
                if hasattr(llm_response, 'content'):
                    llm_code = llm_response.content
                else:
                    llm_code = str(llm_response)
                
                base_code += f"\n🤖 AI 개선 코드:\n{llm_code}"
                
            except Exception as e:
                base_code += f"\n⚠️ AI 코드 생성 실패: {e}"
        
        return base_code
    
    def chat(self, user_input: str) -> str:
        """사용자 입력 처리"""
        
        user_lower = user_input.lower()
        
        # 알파 분석 요청
        alpha_match = re.search(r'(alpha\d+)', user_lower)
        if alpha_match or '분석' in user_lower:
            alpha_name = alpha_match.group(1) if alpha_match else 'alpha001'
            return self.analyze_alpha(alpha_name)
        
        # 새로운 알파 제안
        elif any(word in user_lower for word in ['제안', '새로운', '알파', '아이디어']):
            return self.suggest_alpha()
        
        # 코드 생성
        elif any(word in user_lower for word in ['코드', '구현', '파이썬', 'python']):
            # 수식 추출 시도
            formula_match = re.search(r'rank\([^)]+\)', user_input)
            formula = formula_match.group(0) if formula_match else ""
            return self.generate_code(formula)
        
        # 유전 알고리즘 설명
        elif any(word in user_lower for word in ['유전', 'ga', '알고리즘']):
            return self.explain_ga()
        
        # 프로젝트 정보
        elif any(word in user_lower for word in ['프로젝트', '정보', '설명', '개요']):
            return self.get_project_info()
        
        # 백테스트 관련
        elif any(word in user_lower for word in ['백테스트', '포트폴리오', '성과', '전략']):
            return """
📈 백테스트 및 포트폴리오 관리 가이드

🔧 사용 도구:
• 5_results.py: LongOnlyBacktestSystem 클래스
• backtest_config.json: 설정 파일

📊 주요 성과 지표:
• IC (Information Coefficient): 팩터 예측력
  - IC > 0.03: 우수
  - IC > 0.01: 보통
  - IC < 0.01: 부족

• Sharpe Ratio: 위험 대비 수익
  - > 1.0: 우수
  - 0.5~1.0: 보통
  - < 0.5: 부족

• Maximum Drawdown: 최대 손실폭
• Turnover: 포트폴리오 회전율

💼 포트폴리오 구성:
1. 팩터 선별: IC > 0.02 이상
2. 가중치: 동일가중 또는 IC 기반
3. 리밸런싱: 주간/월간
4. 리스크 관리: 개별 종목 5% 제한

🔍 분석 방법:
python backend_module/5_results.py
"""
        
        # 일반 질문
        else:
            if self.use_llama and self.llm:
                try:
                    prompt = f"""
당신은 WorldQuant 101 Alpha 기반 퀀트 금융 전문가입니다.
다음 질문에 실무적이고 구체적으로 답변해주세요:

질문: {user_input}

답변 시 고려사항:
- 금융 전문 용어 정확히 사용
- 구체적인 예시나 수치 포함
- 실무 적용 가능한 조언
- 3-5줄로 간결하게
"""
                    
                    response = self.llm.invoke(prompt)
                    return response.content if hasattr(response, 'content') else str(response)
                    
                except Exception as e:
                    return f"⚠️ AI 응답 생성 실패: {e}\n\n기본 도움말을 확인하세요."
            
            # LLM 없이 기본 응답
            return """
🤖 QuickQuant 어시스턴트 도움말

💬 지원 명령어:
• "alpha001 분석해줘" - 알파 팩터 분석
• "새로운 알파 제안해줘" - 알파 아이디어 제안  
• "코드 구현해줘" - 파이썬 코드 생성
• "유전 알고리즘 설명해줘" - GA 개념 설명
• "프로젝트 정보 알려줘" - 시스템 개요
• "백테스트 방법 알려줘" - 성과 분석 가이드

🔧 고급 기능을 위해서는 Llama 설치를 권장합니다:
1. https://ollama.ai/ 에서 Ollama 설치
2. ollama pull llama3.2 실행
3. 시스템 재시작
"""

def main():
    """메인 실행 함수"""
    print("🚀 QuickQuant 어시스턴트 시작!")
    print("=" * 50)
    
    assistant = QuickQuantAssistant(use_llama=True)
    
    print("\n💬 사용법:")
    print("• alpha001 분석해줘")
    print("• 새로운 알파 제안해줘") 
    print("• 코드 구현해줘")
    print("• 유전 알고리즘 설명해줘")
    print("• exit 또는 종료")
    print("=" * 50)
    
    while True:
        try:
            user_input = input("\n🤔 질문: ").strip()
            
            if user_input.lower() in ['exit', 'quit', '종료', 'q']:
                print("👋 어시스턴트를 종료합니다!")
                break
                
            if not user_input:
                continue
            
            print("⚡ 처리 중...")
            response = assistant.chat(user_input)
            print(f"\n🤖 답변:\n{response}")
            
        except KeyboardInterrupt:
            print("\n\n👋 어시스턴트를 종료합니다!")
            break
        except Exception as e:
            print(f"❌ 오류: {e}")

if __name__ == "__main__":
    main()
