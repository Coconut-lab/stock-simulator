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
        email = data.get('email')
        password = data.get('password')
        
        # 필수 필드 검증
        if not username or not email or not password:
            return jsonify({'error': '모든 필드를 입력해주세요.'}), 400
        
        # 비밀번호 길이 검증
        if len(password) < 6:
            return jsonify({'error': '비밀번호는 최소 6자 이상이어야 합니다.'}), 400
        
        result, error = auth_service.register(username, email, password)
        
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
        
        email = data.get('email')
        password = data.get('password')
        
        # 필수 필드 검증
        if not email or not password:
            return jsonify({'error': '이메일과 비밀번호를 입력해주세요.'}), 400
        
        result, error = auth_service.login(email, password)
        
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
        
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({'error': '인증 토큰이 필요합니다.'}), 401
        
        token = auth_header.split(' ')[1]
        
        user_data, error = auth_service.get_current_user(token)
        
        if error:
            return jsonify({'error': error}), 401
        
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
