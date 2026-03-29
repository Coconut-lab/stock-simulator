from flask import Blueprint, request, jsonify
from services.auth_service import auth_service
from services.options_service import options_service
import logging

options_bp = Blueprint('options', __name__, url_prefix='/api/options')


def verify_auth():
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        return None, "인증 토큰이 필요합니다."
    token = auth_header.split(' ')[1]
    user_data, error = auth_service.get_current_user(token)
    if error:
        return None, error
    return user_data, None


@options_bp.route('/chain/<underlying>', methods=['GET'])
def get_option_chain(underlying):
    """옵션 체인 조회"""
    try:
        user_data, error = verify_auth()
        if error:
            return jsonify({'error': error}), 401

        chain = options_service.get_option_chain(underlying)
        return jsonify({'data': chain}), 200

    except Exception as e:
        logging.error(f"옵션 체인 조회 에러: {e}")
        return jsonify({'error': '서버 에러가 발생했습니다.'}), 500


@options_bp.route('/contract/<contract_id>', methods=['GET'])
def get_contract_detail(contract_id):
    """옵션 계약 상세 + 그릭스"""
    try:
        user_data, error = verify_auth()
        if error:
            return jsonify({'error': error}), 401

        detail = options_service.get_contract_detail(contract_id)
        if not detail:
            return jsonify({'error': '계약을 찾을 수 없습니다.'}), 404

        return jsonify({'data': detail}), 200

    except Exception as e:
        logging.error(f"옵션 계약 상세 에러: {e}")
        return jsonify({'error': '서버 에러가 발생했습니다.'}), 500


@options_bp.route('/buy', methods=['POST'])
def buy_option():
    """옵션 매수"""
    try:
        user_data, error = verify_auth()
        if error:
            return jsonify({'error': error}), 401

        data = request.get_json()
        if not data:
            return jsonify({'error': '요청 데이터가 없습니다.'}), 400

        contract_id = data.get('contract_id')
        quantity = data.get('quantity', 1)

        if not contract_id:
            return jsonify({'error': '계약 ID를 입력해주세요.'}), 400

        if not isinstance(quantity, int) or quantity <= 0:
            return jsonify({'error': '수량은 양의 정수여야 합니다.'}), 400

        result, err = options_service.buy_option(
            user_data['user_id'], contract_id, quantity
        )

        if err:
            return jsonify({'error': err}), 400

        return jsonify({
            'message': '옵션이 매수되었습니다.',
            'data': result
        }), 200

    except Exception as e:
        logging.error(f"옵션 매수 에러: {e}")
        return jsonify({'error': '서버 에러가 발생했습니다.'}), 500


@options_bp.route('/close', methods=['POST'])
def close_position():
    """옵션 포지션 청산"""
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

        result, err = options_service.close_option_position(
            user_data['user_id'], position_id
        )

        if err:
            return jsonify({'error': err}), 400

        return jsonify({
            'message': '옵션 포지션이 청산되었습니다.',
            'data': result
        }), 200

    except Exception as e:
        logging.error(f"옵션 청산 에러: {e}")
        return jsonify({'error': '서버 에러가 발생했습니다.'}), 500


@options_bp.route('/exercise', methods=['POST'])
def exercise_option():
    """옵션 행사"""
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

        result, err = options_service.exercise_option(
            user_data['user_id'], position_id
        )

        if err:
            return jsonify({'error': err}), 400

        return jsonify({
            'message': '옵션이 행사되었습니다.',
            'data': result
        }), 200

    except Exception as e:
        logging.error(f"옵션 행사 에러: {e}")
        return jsonify({'error': '서버 에러가 발생했습니다.'}), 500


@options_bp.route('/positions', methods=['GET'])
def get_positions():
    """내 옵션 포지션"""
    try:
        user_data, error = verify_auth()
        if error:
            return jsonify({'error': error}), 401

        positions = options_service.get_positions(user_data['user_id'])
        return jsonify({'data': positions}), 200

    except Exception as e:
        logging.error(f"옵션 포지션 조회 에러: {e}")
        return jsonify({'error': '서버 에러가 발생했습니다.'}), 500
