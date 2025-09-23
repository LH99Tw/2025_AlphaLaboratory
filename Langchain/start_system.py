앒#!/usr/bin/env python3
"""
퀀트 금융 멀티 에이전트 시스템 시작 스크립트
=======================================

이 스크립트는 LangGraph 기반 멀티 에이전트 시스템을 쉽게 시작할 수 있도록 도와줍니다.

사용법:
    python start_system.py

또는 직접 실행:
    ./start_system.py
"""

import sys
import os

# 현재 디렉토리를 Python 경로에 추가
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

def check_dependencies():
    """필수 의존성 확인"""
    print("🔍 의존성 확인 중...")
    
    missing_packages = []
    
    try:
        import langchain
        print("✅ LangChain 설치됨")
    except ImportError:
        missing_packages.append("langchain")
    
    try:
        import langgraph
        print("✅ LangGraph 설치됨")
    except ImportError:
        missing_packages.append("langgraph")
    
    try:
        import pandas
        print("✅ Pandas 설치됨")
    except ImportError:
        missing_packages.append("pandas")
    
    if missing_packages:
        print(f"\n❌ 다음 패키지들이 설치되지 않았습니다: {', '.join(missing_packages)}")
        print("\n설치 명령어:")
        for package in missing_packages:
            print(f"  pip3 install {package}")
        return False
    
    print("✅ 모든 의존성이 설치되어 있습니다!")
    return True

def check_ollama():
    """Ollama 설치 및 모델 확인"""
    print("\n🦙 Ollama 확인 중...")
    
    import subprocess
    
    try:
        result = subprocess.run(['ollama', 'list'], 
                              capture_output=True, text=True, check=True)
        
        if 'llama3.2' in result.stdout:
            print("✅ Llama 3.2 모델 사용 가능")
            return True
        else:
            print("⚠️ Llama 3.2 모델을 찾을 수 없습니다.")
            print("설치 명령어: ollama pull llama3.2")
            return False
            
    except (subprocess.CalledProcessError, FileNotFoundError):
        print("❌ Ollama가 설치되지 않았거나 실행되지 않습니다.")
        print("설치: https://ollama.ai/")
        return False

def show_welcome():
    """환영 메시지 및 사용법 표시"""
    print("\n" + "="*60)
    print("🧠 퀀트 금융 멀티 에이전트 AI 시스템 (LangGraph)")
    print("="*60)
    
    print("\n🤖 사용 가능한 에이전트:")
    print("📊 DataAnalyst     : 알파 팩터 분석 및 데이터 처리")
    print("🧬 AlphaResearcher : 새로운 알파 팩터 연구 및 제안")
    print("💼 PortfolioManager: 백테스트 및 포트폴리오 최적화")
    print("🔧 CodeGenerator   : 파이썬 코드 생성 및 최적화")
    print("🎯 Coordinator     : 에이전트 간 조율 및 워크플로우 관리")
    
    print("\n💬 예시 질문:")
    print("• 'alpha001을 분석해줘'")
    print("• '새로운 알파 팩터를 제안해줘'")
    print("• '백테스트 전략을 분석해줘'")
    print("• '알파 팩터 코드를 구현해줘'")
    print("• '유전 알고리즘에 대해 설명해줘'")
    
    print("\n🔄 워크플로우:")
    print("사용자 질문 → 에이전트 라우팅 → 전문 분석 → 결과 통합 → 답변")
    
    print("\n" + "="*60)

def main():
    """메인 실행 함수"""
    show_welcome()
    
    # 의존성 확인
    if not check_dependencies():
        print("\n❌ 필요한 패키지를 먼저 설치해주세요.")
        return
    
    # Ollama 확인 (선택사항)
    ollama_available = check_ollama()
    if not ollama_available:
        print("\n⚠️ Ollama를 사용할 수 없지만 Mock 모드로 계속 진행합니다.")
    
    print("\n🚀 시스템을 시작합니다...")
    
    try:
        # LangGraph 시스템 import 및 실행
        from Langchain import create_multi_agent_system
        
        print("✅ 멀티 에이전트 시스템 로딩 중...")
        system = create_multi_agent_system()
        
        print("\n💬 대화를 시작하세요! ('exit' 또는 '종료'로 프로그램 종료)")
        print("-" * 60)
        
        while True:
            try:
                user_input = input("\n🤔 질문: ").strip()
                
                if user_input.lower() in ['exit', 'quit', '종료', 'q']:
                    print("\n👋 시스템을 종료합니다. 감사합니다!")
                    break
                    
                if not user_input:
                    continue
                
                print(f"\n⚡ 처리 중...")
                response = system.chat(user_input)
                print(f"\n🤖 답변:\n{response}")
                
            except KeyboardInterrupt:
                print("\n\n👋 시스템을 종료합니다.")
                break
                
    except ImportError as e:
        print(f"\n❌ 시스템 로딩 실패: {e}")
        print("Langchain.py 파일이 같은 디렉토리에 있는지 확인해주세요.")
    except Exception as e:
        print(f"\n❌ 예상치 못한 오류: {e}")

if __name__ == "__main__":
    main()
