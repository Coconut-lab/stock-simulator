from flask import Blueprint, request, jsonify
from services.auth_service import auth_service
from services.futures_service import futures_service
import logging

futures_bp = Blueprint('futures', __name__, url_prefix='/api/futures')


def verify_auth():
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        return None, "인증 토큰이 필요합니다."
    token = auth_header.split(' ')[1]
    user_data, error = auth_service.get_current_user(token)
    if error:
        return None, error
    return user_data, None


@futures_bp.route('/contracts', methods=['GET'])
def get_contracts():
    """활성 선물 계약 목록"""
    try:
        user_data, error = verify_auth()
        if error:
            return jsonify({'error': error}), 401

        contracts = futures_service.get_contracts()
        # datetime 직렬화
        for c in contracts:
            for key in ['expiry_date', 'created_at']:
                if hasattr(c.get(key), 'isoformat'):
                    c[key] = c[key].isoformat()

        return jsonify({'data': contracts}), 200
    except Exception as e:
        logging.error(f"선물 계약 조회 에러: {e}")
        return jsonify({'error': '서버 에러가 발생했습니다.'}), 500


@futures_bp.route('/contracts/<contract_id>', methods=['GET'])
def get_contract_detail(contract_id):
    """계약 상세"""
    try:
        user_data, error = verify_auth()
        if error:
            return jsonify({'error': error}), 401

        contract = futures_service.get_contract(contract_id)
        if not contract:
            return jsonify({'error': '계약을 찾을 수 없습니다.'}), 404

        for key in ['expiry_date', 'created_at']:
            if hasattr(contract.get(key), 'isoformat'):
                contract[key] = contract[key].isoformat()

        return jsonify({'data': contract}), 200
    except Exception as e:
        logging.error(f"선물 계약 상세 에러: {e}")
        return jsonify({'error': '서버 에러가 발생했습니다.'}), 500


@futures_bp.route('/open', methods=['POST'])
def open_position():
    """포지션 오픈"""
    try:
        user_data, error = verify_auth()
        if error:
            return jsonify({'error': error}), 401

        data = request.get_json()
        if not data:
            return jsonify({'error': '요청 데이터가 없습니다.'}), 400

        contract_id = data.get('contract_id')
        direction = data.get('direction')  # 'long' or 'short'
        quantity = data.get('quantity', 1)

        if not contract_id or direction not in ('long', 'short'):
            return jsonify({'error': '계약 ID와 방향(long/short)을 입력해주세요.'}), 400

        if not isinstance(quantity, (int, float)) or quantity <= 0:
            return jsonify({'error': '수량은 양의 정수여야 합니다.'}), 400
        quantity = int(quantity)

        result, err = futures_service.open_position(
            user_data['user_id'], contract_id, direction, quantity
        )

        if err:
            return jsonify({'error': err}), 400

        return jsonify({
            'message': '선물 포지션이 오픈되었습니다.',
            'data': result
        }), 200

    except Exception as e:
        logging.error(f"선물 포지션 오픈 에러: {e}")
        return jsonify({'error': '서버 에러가 발생했습니다.'}), 500


@futures_bp.route('/close', methods=['POST'])
def close_position():
    """포지션 청산"""
    try:
        user_data, error = verify_auth()
        if error:
            return jsonify({'error': error}), 401

        data = request.get_json()
        if not data:
            return jsonify({'error': '요청 데이터가 없습니다.'}), 400

        position_id = data.get('position_id')
        if not position_id:
            return jsonify({'error': '포지션 ID를 입력해주세요.'}), 400

        result, err = futures_service.close_position(user_data['user_id'], position_id)

        if err:
            return jsonify({'error': err}), 400

        return jsonify({
            'message': '선물 포지션이 청산되었습니다.',
            'data': result
        }), 200

    except Exception as e:
        logging.error(f"선물 포지션 청산 에러: {e}")
        return jsonify({'error': '서버 에러가 발생했습니다.'}), 500


@futures_bp.route('/positions', methods=['GET'])
def get_positions():
    """내 포지션"""
    try:
        user_data, error = verify_auth()
        if error:
            return jsonify({'error': error}), 401

        positions = futures_service.get_positions(user_data['user_id'])
        return jsonify({'data': positions}), 200

    except Exception as e:
        logging.error(f"선물 포지션 조회 에러: {e}")
        return jsonify({'error': '서버 에러가 발생했습니다.'}), 500


@futures_bp.route('/positions/history', methods=['GET'])
def get_position_history():
    """청산 내역"""
    try:
        user_data, error = verify_auth()
        if error:
            return jsonify({'error': error}), 401

        limit = request.args.get('limit', 50, type=int)
        positions = futures_service.get_position_history(user_data['user_id'], limit)
        return jsonify({'data': positions}), 200

    except Exception as e:
        logging.error(f"선물 청산 내역 에러: {e}")
        return jsonify({'error': '서버 에러가 발생했습니다.'}), 500
