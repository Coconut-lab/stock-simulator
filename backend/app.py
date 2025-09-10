from flask import Flask, jsonify
from flask_cors import CORS
import logging
import time
import threading
from datetime import datetime

# 설정 및 서비스 임포트
from config import Config
from services.stock_service import stock_service

# 라우트 임포트
from routes.auth import auth_bp
from routes.stocks import stocks_bp
from routes.portfolio import portfolio_bp

def create_app():
    """Flask 애플리케이션 팩토리"""
    app = Flask(__name__)
    
    # 설정 로드
    app.config.from_object(Config)
    
    # CORS 설정 (React 프론트엔드와 통신)
    CORS(app, origins=["http://localhost:3000"])
    
    # 로깅 설정
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    # 라우트 등록
    app.register_blueprint(auth_bp)
    app.register_blueprint(stocks_bp)
    app.register_blueprint(portfolio_bp)
    
    # 기본 라우트
    @app.route('/')
    def health_check():
        return jsonify({
            'message': '가상 주식 투자 API 서버가 실행 중입니다.',
            'status': 'healthy',
            'timestamp': datetime.utcnow().isoformat()
        })
    
    @app.route('/api/health')
    def api_health():
        return jsonify({
            'status': 'healthy',
            'services': {
                'database': 'connected',
                'stock_service': 'running'
            },
            'timestamp': datetime.utcnow().isoformat()
        })
    
    # 에러 핸들러
    @app.errorhandler(404)
    def not_found(error):
        return jsonify({
            'error': '요청한 리소스를 찾을 수 없습니다.'
        }), 404
    
    @app.errorhandler(500)
    def internal_error(error):
        return jsonify({
            'error': '서버 내부 에러가 발생했습니다.'
        }), 500
    
    # 서비스 초기화 함수 (별도로 호출)
    def initialize_services():
        """서비스 초기화"""
        try:
            logging.info("서비스 초기화 시작...")
            
            # 자동 업데이트 시작 (5분 간격)
            stock_service.start_auto_update(Config.STOCK_UPDATE_INTERVAL)
            
            # 백그라운드에서 초기 데이터 로드 (비동기)
            def load_initial_data():
                time.sleep(10)  # 10초 후에 시작
                stock_service.update_stock_cache()
            
            init_thread = threading.Thread(target=load_initial_data, daemon=True)
            init_thread.start()
            
            logging.info("서비스 초기화 완료")
            
        except Exception as e:
            logging.error(f"서비스 초기화 실패: {e}")
    
    # 서비스 초기화 실행
    with app.app_context():
        initialize_services()
    
    return app

if __name__ == '__main__':
    app = create_app()
    
    try:
        # 개발 서버 실행
        app.run(
            host='0.0.0.0',
            port=5000,
            debug=Config.DEBUG
        )
    except KeyboardInterrupt:
        # Ctrl+C로 종료 시 정리 작업
        logging.info("서버 종료 중...")
        stock_service.stop_auto_update()
        logging.info("서버 종료 완료")
