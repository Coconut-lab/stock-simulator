from flask import Blueprint, request, jsonify
from services.stock_service import stock_service
from services.auth_service import auth_service
import logging

stocks_bp = Blueprint('stocks', __name__, url_prefix='/api/stocks')

def verify_auth():
    """인증 검증 헬퍼 함수"""
    auth_header = request.headers.get('Authorization')
    
    if not auth_header or not auth_header.startswith('Bearer '):
        return None, "인증 토큰이 필요합니다."
    
    token = auth_header.split(' ')[1]
    user_data, error = auth_service.get_current_user(token)
    
    if error:
        return None, error
    
    return user_data, None

@stocks_bp.route('/market-summary', methods=['GET'])
def get_market_summary():
    """시장 요약 정보 조회"""
    try:
        # 인증 검증
        user_data, error = verify_auth()
        if error:
            return jsonify({'error': error}), 401
        
        market_data = stock_service.get_market_summary()
        
        return jsonify({
            'data': market_data
        }), 200
        
    except Exception as e:
        logging.error(f"시장 요약 조회 에러: {e}")
        return jsonify({'error': '서버 에러가 발생했습니다.'}), 500

@stocks_bp.route('/search', methods=['GET'])
def search_stocks():
    """주식 검색"""
    try:
        # 인증 검증
        user_data, error = verify_auth()
        if error:
            return jsonify({'error': error}), 401
        
        query = request.args.get('q', '')
        
        if not query:
            return jsonify({'error': '검색어를 입력해주세요.'}), 400
        
        if len(query) < 1:
            return jsonify({'error': '검색어는 최소 1자 이상이어야 합니다.'}), 400
        
        results = stock_service.search_stocks(query)
        
        return jsonify({
            'data': results
        }), 200
        
    except Exception as e:
        logging.error(f"주식 검색 에러: {e}")
        return jsonify({'error': '서버 에러가 발생했습니다.'}), 500

@stocks_bp.route('/<symbol>', methods=['GET'])
def get_stock_detail(symbol):
    """특정 주식 상세 정보 조회"""
    try:
        # 인증 검증
        user_data, error = verify_auth()
        if error:
            return jsonify({'error': error}), 401
        
        # 캐시에서 먼저 조회
        stock_data = stock_service.get_cached_stock_data(symbol)
        if not stock_data:
            # 캐시에 없으면 실시간 조회
            stock_data = stock_service.get_stock_info(symbol)
        
        if not stock_data:
            return jsonify({'error': '주식 정보를 찾을 수 없습니다.'}), 404
        
        return jsonify({
            'data': stock_data
        }), 200
        
    except Exception as e:
        logging.error(f"주식 상세 조회 에러: {e}")
        return jsonify({'error': '서버 에러가 발생했습니다.'}), 500

@stocks_bp.route('/price/<symbol>', methods=['GET'])
def get_stock_price(symbol):
    """특정 주식 현재가 조회"""
    try:
        # 인증 검증
        user_data, error = verify_auth()
        if error:
            return jsonify({'error': error}), 401
        
        price = stock_service.get_cached_price(symbol)
        
        if price == 0:
            return jsonify({'error': '주식 가격을 찾을 수 없습니다.'}), 404
        
        return jsonify({
            'data': {
                'symbol': symbol,
                'price': price
            }
        }), 200
        
    except Exception as e:
        logging.error(f"주식 가격 조회 에러: {e}")
        return jsonify({'error': '서버 에러가 발생했습니다.'}), 500

@stocks_bp.route('/multiple', methods=['POST'])
def get_multiple_stocks():
    """여러 주식 정보 한번에 조회"""
    try:
        # 인증 검증
        user_data, error = verify_auth()
        if error:
            return jsonify({'error': error}), 401
        
        data = request.get_json()
        
        if not data or 'symbols' not in data:
            return jsonify({'error': '주식 심볼 목록이 필요합니다.'}), 400
        
        symbols = data['symbols']
        
        if not isinstance(symbols, list) or len(symbols) == 0:
            return jsonify({'error': '유효한 주식 심볼 목록을 입력해주세요.'}), 400
        
        if len(symbols) > 50:
            return jsonify({'error': '한번에 최대 50개까지만 조회 가능합니다.'}), 400
        
        stock_data = stock_service.get_multiple_stocks(symbols)
        
        return jsonify({
            'data': stock_data
        }), 200
        
    except Exception as e:
        logging.error(f"다중 주식 조회 에러: {e}")
        return jsonify({'error': '서버 에러가 발생했습니다.'}), 500

@stocks_bp.route('/korean', methods=['GET'])
def get_korean_stocks():
    """한국 주식 목록 조회"""
    try:
        # 인증 검증
        user_data, error = verify_auth()
        if error:
            return jsonify({'error': error}), 401
        
        market_data = stock_service.get_market_summary()
        korean_stocks = market_data['korean_market']
        
        return jsonify({
            'data': korean_stocks
        }), 200
        
    except Exception as e:
        logging.error(f"한국 주식 조회 에러: {e}")
        return jsonify({'error': '서버 에러가 발생했습니다.'}), 500

@stocks_bp.route('/us', methods=['GET'])
def get_us_stocks():
    """미국 주식 목록 조회"""
    try:
        # 인증 검증
        user_data, error = verify_auth()
        if error:
            return jsonify({'error': error}), 401
        
        market_data = stock_service.get_market_summary()
        us_stocks = market_data['us_market']
        
        return jsonify({
            'data': us_stocks
        }), 200
        
    except Exception as e:
        logging.error(f"미국 주식 조회 에러: {e}")
        return jsonify({'error': '서버 에러가 발생했습니다.'}), 500

@stocks_bp.route('/history/<symbol>', methods=['GET'])
def get_stock_history(symbol):
    """주식 이력 데이터 조회 (차트용) - 개선된 버전"""
    try:
        # 인증 검증
        user_data, error = verify_auth()
        if error:
            return jsonify({'error': error}), 401
        
        # 파라미터 받기
        period_days = request.args.get('period', 30, type=int)
        interval = request.args.get('interval', 'daily')  # daily, weekly, monthly
        
        # 최대 1095일(3년)로 제한
        if period_days > 1095:
            period_days = 1095
        
        # 간격 유효성 검사
        if interval not in ['daily', 'weekly', 'monthly']:
            interval = 'daily'
        
        history_data = stock_service.get_stock_history(symbol, period_days, interval)
        
        if not history_data:
            return jsonify({'error': '주식 이력 데이터를 찾을 수 없습니다.'}), 404
        
        return jsonify({
            'data': history_data
        }), 200
        
    except Exception as e:
        logging.error(f"주식 이력 조회 에러: {e}")
        return jsonify({'error': '서버 에러가 발생했습니다.'}), 500

@stocks_bp.route('/indices', methods=['GET'])
def get_market_indices():
    """시장 지수 정보 조회"""
    try:
        # 인증 검증
        user_data, error = verify_auth()
        if error:
            return jsonify({'error': error}), 401
        
        indices = stock_service.get_market_indices()
        
        return jsonify({
            'data': indices
        }), 200
        
    except Exception as e:
        logging.error(f"시장 지수 조회 에러: {e}")
        return jsonify({'error': '서버 에러가 발생했습니다.'}), 500
