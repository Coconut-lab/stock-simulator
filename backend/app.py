from flask import Flask, jsonify
from flask_cors import CORS
import logging
import time
import threading
from datetime import datetime

# 설정 및 DB 임포트
from config import Config
from utils.db import db, init_db
from services.stock_service import stock_service

# 라우트 임포트
from routes.auth import auth_bp
from routes.stocks import stocks_bp
from routes.portfolio import portfolio_bp
from routes.market import market_bp

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
    
    # MySQL 데이터베이스 초기화
    init_db(app)
    logging.info("MySQL 데이터베이스 연결 완료")
    
    # Stock Service에 앱 참조 전달
    stock_service.init_app(app)
    
    # 라우트 등록
    app.register_blueprint(auth_bp)
    app.register_blueprint(stocks_bp)
    app.register_blueprint(portfolio_bp)
    app.register_blueprint(market_bp)
    
    # 기본 라우트
    @app.route('/')
    def health_check():
        return jsonify({
            'message': '가상 주식 투자 API 서버가 실행 중입니다.',
            'status': 'healthy',
            'database': 'MySQL',
            'timestamp': datetime.utcnow().isoformat()
        })
    
    @app.route('/api/health')
    def api_health():
        # DB 연결 확인
        try:
            db.session.execute(db.text('SELECT 1'))
            db_status = 'connected'
        except Exception as e:
            db_status = f'error: {str(e)}'
        
        return jsonify({
            'status': 'healthy',
            'services': {
                'database': db_status,
                'stock_service': 'running' if stock_service.is_running else 'stopped'
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
        db.session.rollback()  # 에러 시 롤백
        return jsonify({
            'error': '서버 내부 에러가 발생했습니다.'
        }), 500
    
    # 서비스 초기화 함수 (별도로 호출)
    def initialize_services():
        """서비스 초기화"""
        try:
            logging.info("서비스 초기화 시작...")
            
            # 기본 시장 데이터 초기화
            from services.market_service import MarketService
            MarketService.initialize_default_markets()
            logging.info("시장 운영 시간 데이터 초기화 완료")
            
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
