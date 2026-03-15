from flask import Blueprint, request, jsonify
from services.auth_service import auth_service
import logging

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')

@auth_bp.route('/register', methods=['POST'])
def register():
    """사용자 등록"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': '요청 데이터가 없습니다.'}), 400
        
        username = data.get('username')
        name = data.get('name', '')
        password = data.get('password')

        # 필수 필드 검증
        if not username or not password:
            return jsonify({'error': '아이디와 비밀번호를 입력해주세요.'}), 400

        if len(password) < 6:
            return jsonify({'error': '비밀번호는 최소 6자 이상이어야 합니다.'}), 400

        result, error = auth_service.register(username, name, password)
        
        if error:
            return jsonify({'error': error}), 400
        
        return jsonify({
            'message': '회원가입이 완료되었습니다.',
            'data': result
        }), 201
        
    except Exception as e:
        logging.error(f"회원가입 에러: {e}")
        return jsonify({'error': '서버 에러가 발생했습니다.'}), 500

@auth_bp.route('/login', methods=['POST'])
def login():
    """사용자 로그인"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': '요청 데이터가 없습니다.'}), 400
        
        username = data.get('username')
        password = data.get('password')

        # 필수 필드 검증
        if not username or not password:
            return jsonify({'error': '아이디와 비밀번호를 입력해주세요.'}), 400

        result, error = auth_service.login(username, password)
        
        if error:
            return jsonify({'error': error}), 401
        
        return jsonify({
            'message': '로그인이 완료되었습니다.',
            'data': result
        }), 200
        
    except Exception as e:
        logging.error(f"로그인 에러: {e}")
        return jsonify({'error': '서버 에러가 발생했습니다.'}), 500

@auth_bp.route('/me', methods=['GET'])
def get_current_user():
    """현재 사용자 정보 조회"""
    try:
        # Authorization 헤더에서 토큰 추출
        auth_header = request.headers.get('Authorization')

        logging.info(f"[AUTH /me] Authorization header present: {auth_header is not None}")
        if auth_header:
            logging.info(f"[AUTH /me] Authorization header starts with 'Bearer ': {auth_header.startswith('Bearer ')}")
            logging.info(f"[AUTH /me] Authorization header length: {len(auth_header)}")
            logging.info(f"[AUTH /me] Authorization header preview: {auth_header[:30]}...")
        else:
            logging.info(f"[AUTH /me] All request headers: {dict(request.headers)}")

        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({
                'error': '인증 토큰이 필요합니다.',
                'debug': {
                    'auth_header_present': auth_header is not None,
                    'auth_header_preview': auth_header[:30] + '...' if auth_header else None,
                    'content_type': request.headers.get('Content-Type'),
                    'origin': request.headers.get('Origin'),
                    'host': request.headers.get('Host'),
                }
            }), 401

        token = auth_header.split(' ')[1]

        user_data, error = auth_service.get_current_user(token)

        if error:
            logging.info(f"[AUTH /me] Token verification failed: {error}")
            return jsonify({
                'error': error,
                'debug': {
                    'token_length': len(token),
                    'token_preview': token[:20] + '...' if len(token) > 20 else token,
                    'verification_error': error
                }
            }), 401

        return jsonify({
            'data': user_data
        }), 200

    except Exception as e:
        logging.error(f"사용자 정보 조회 에러: {e}")
        return jsonify({'error': '서버 에러가 발생했습니다.'}), 500

@auth_bp.route('/logout', methods=['POST'])
def logout():
    """사용자 로그아웃 (클라이언트에서 토큰 삭제)"""
    return jsonify({
        'message': '로그아웃이 완료되었습니다.'
    }), 200

@auth_bp.route('/debug/headers', methods=['GET', 'OPTIONS'])
def debug_headers():
    """디버그: 서버가 수신한 모든 헤더 반환 (인증 불필요)"""
    headers_dict = dict(request.headers)
    auth_header = request.headers.get('Authorization')

    result = {
        'all_headers': headers_dict,
        'auth_header_present': auth_header is not None,
        'method': request.method,
        'url': request.url,
        'remote_addr': request.remote_addr,
    }

    if auth_header and auth_header.startswith('Bearer '):
        token = auth_header.split(' ')[1]
        result['token_length'] = len(token)
        result['token_preview'] = token[:20] + '...' if len(token) > 20 else token

        # 토큰 검증 시도
        user_data, error = auth_service.get_current_user(token)
        result['token_valid'] = error is None
        result['token_error'] = error
        if user_data:
            result['user'] = user_data

    return jsonify(result), 200
