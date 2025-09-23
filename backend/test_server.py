#!/usr/bin/env python3
"""
간단한 테스트 Flask 서버
네트워크 연결을 확인하기 위한 최소 구현
"""

from flask import Flask, jsonify
from flask_cors import CORS
import logging

# Flask 앱 초기화
app = Flask(__name__)
CORS(app)  # React 프론트엔드와의 통신을 위한 CORS 설정

# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@app.route('/api/health', methods=['GET'])
def health_check():
    """서버 상태 확인"""
    return jsonify({
        'status': 'healthy',
        'message': '테스트 서버가 정상적으로 실행 중입니다',
        'systems': {
            'backtest': False,
            'ga': False,
            'langchain': False,
            'database': False
        }
    })

@app.route('/api/test', methods=['GET'])
def test_endpoint():
    """테스트 엔드포인트"""
    return jsonify({
        'success': True,
        'message': '백엔드 서버 연결이 정상적으로 작동합니다!'
    })

if __name__ == '__main__':
    logger.info("🚀 테스트 Flask 서버 시작 중...")
    
    # 서버 실행
    app.run(
        host='0.0.0.0',
        port=5001,
        debug=True,
        threaded=True
    )
