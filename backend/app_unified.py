from flask import Flask, jsonify, send_from_directory
from flask_cors import CORS
import logging
import time
import threading
from datetime import datetime
import os

# 설정 및 서비스 임포트
from config import Config
from services.stock_service import stock_service

# 라우트 임포트
from routes.auth import auth_bp
from routes.stocks import stocks_bp
from routes.portfolio import portfolio_bp

def create_app():
    """Flask 애플리케이션 팩토리 (프론트엔드 통합 버전)"""
    
    # static 폴더 설정 (React 빌드 파일 위치)
    app = Flask(__name__, 
                static_folder='static',
                static_url_path='')
    
    # 설정 로드
    app.config.from_object(Config)
    
    # CORS 설정
    CORS(app)
    
    # 로깅 설정
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    # API 라우트 등록
    app.register_blueprint(auth_bp, url_prefix='/api')
    app.register_blueprint(stocks_bp, url_prefix='/api')
    app.register_blueprint(portfolio_bp, url_prefix='/api')
    
    # API 헬스체크
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
    
    # React 앱 서빙 (모든 API가 아닌 경로)
    @app.route('/', defaults={'path': ''})
    @app.route('/<path:path>')
    def serve_react(path):
        if path != "" and os.path.exists(os.path.join(app.static_folder, path)):
            return send_from_directory(app.static_folder, path)
        else:
            return send_from_directory(app.static_folder, 'index.html')
    
    # 에러 핸들러
    @app.errorhandler(404)
    def not_found(error):
        # API 요청인 경우 JSON 반환
        if '/api/' in str(error):
            return jsonify({
                'error': '요청한 리소스를 찾을 수 없습니다.'
            }), 404
        # 그 외에는 React 앱으로
        return send_from_directory(app.static_folder, 'index.html')
    
    @app.errorhandler(500)
    def internal_error(error):
        return jsonify({
            'error': '서버 내부 에러가 발생했습니다.'
        }), 500
    
    # 서비스 초기화 함수
    def initialize_services():
        """서비스 초기화"""
        try:
            logging.info("서비스 초기화 시작...")
            
            # 자동 업데이트 시작 (5분 간격)
            stock_service.start_auto_update(Config.STOCK_UPDATE_INTERVAL)
            
            # 백그라운드에서 초기 데이터 로드
            def load_initial_data():
                time.sleep(10)
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
        port = int(os.environ.get('PORT', 5000))
        app.run(
            host='0.0.0.0',
            port=port,
            debug=Config.DEBUG
        )
    except KeyboardInterrupt:
        logging.info("서버 종료 중...")
        stock_service.stop_auto_update()
        logging.info("서버 종료 완료")
