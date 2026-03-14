from flask import Blueprint, request, jsonify
from services.prediction_service import prediction_service
from services.auth_service import auth_service
import logging

prediction_bp = Blueprint('prediction', __name__, url_prefix='/api/predictions')


def verify_auth():
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        return None, "인증 토큰이 필요합니다."
    token = auth_header.split(' ')[1]
    user_data, error = auth_service.get_current_user(token)
    if error:
        return None, error
    return user_data, None


def verify_admin():
    user_data, error = verify_auth()
    if error:
        return None, error
    if user_data.get('role') != 'admin':
        return None, '관리자 권한이 필요합니다.'
    return user_data, None


# ── 고정 경로 (동적 경로보다 먼저 등록) ──

@prediction_bp.route('/my-bets', methods=['GET'])
def get_my_bets():
    user_data, error = verify_auth()
    if error:
        return jsonify({'error': error}), 401
    try:
        bets = prediction_service.get_user_bets(user_data['user_id'])
        return jsonify({'data': bets}), 200
    except Exception as e:
        logging.error(f"내 베팅 조회 에러: {e}")
        return jsonify({'error': '서버 에러가 발생했습니다.'}), 500


@prediction_bp.route('/admin/all', methods=['GET'])
def admin_get_all():
    user_data, error = verify_admin()
    if error:
        return jsonify({'error': error}), 403
    try:
        predictions = prediction_service.get_predictions()
        return jsonify({'data': predictions}), 200
    except Exception as e:
        logging.error(f"관리자 예측 조회 에러: {e}")
        return jsonify({'error': '서버 에러가 발생했습니다.'}), 500


# ── 유저 엔드포인트 ──

@prediction_bp.route('/', methods=['GET', 'POST'])
def predictions_root():
    if request.method == 'GET':
        user_data, error = verify_auth()
        if error:
            return jsonify({'error': error}), 401
        try:
            status = request.args.get('status')
            predictions = prediction_service.get_predictions(status)
            return jsonify({'data': predictions}), 200
        except Exception as e:
            logging.error(f"예측 목록 조회 에러: {e}")
            return jsonify({'error': '서버 에러가 발생했습니다.'}), 500
    else:
        user_data, error = verify_admin()
        if error:
            return jsonify({'error': error}), 403
        try:
            data = request.get_json()
            if not data:
                return jsonify({'error': '요청 데이터가 필요합니다.'}), 400

            pred_id, err = prediction_service.create_prediction(
                title=data.get('title'),
                description=data.get('description', ''),
                deadline_str=data.get('deadline'),
                admin_user_id=user_data['user_id'],
                odds=data.get('odds')
            )
            if err:
                return jsonify({'error': err}), 400

            return jsonify({'message': '예측이 생성되었습니다.', 'data': {'id': pred_id}}), 201
        except Exception as e:
            logging.error(f"예측 생성 에러: {e}")
            return jsonify({'error': '서버 에러가 발생했습니다.'}), 500


# ── 동적 경로 ──

@prediction_bp.route('/<prediction_id>', methods=['GET', 'DELETE'])
def prediction_detail(prediction_id):
    if request.method == 'GET':
        user_data, error = verify_auth()
        if error:
            return jsonify({'error': error}), 401
        try:
            prediction = prediction_service.get_prediction_detail(prediction_id)
            if not prediction:
                return jsonify({'error': '예측을 찾을 수 없습니다.'}), 404
            return jsonify({'data': prediction}), 200
        except Exception as e:
            logging.error(f"예측 상세 조회 에러: {e}")
            return jsonify({'error': '서버 에러가 발생했습니다.'}), 500
    else:
        user_data, error = verify_admin()
        if error:
            return jsonify({'error': error}), 403
        try:
            err = prediction_service.delete_prediction(prediction_id)
            if err:
                return jsonify({'error': err}), 400
            return jsonify({'message': '예측이 삭제되었습니다.'}), 200
        except Exception as e:
            logging.error(f"예측 삭제 에러: {e}")
            return jsonify({'error': '서버 에러가 발생했습니다.'}), 500


@prediction_bp.route('/<prediction_id>/bet', methods=['POST'])
def place_bet(prediction_id):
    user_data, error = verify_auth()
    if error:
        return jsonify({'error': error}), 401
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': '요청 데이터가 필요합니다.'}), 400

        choice = data.get('choice')
        amount = data.get('amount')
        if not choice or not amount:
            return jsonify({'error': '선택(choice)과 금액(amount)을 입력해주세요.'}), 400

        bet_data, err = prediction_service.place_bet(
            prediction_id, user_data['user_id'], choice, amount
        )
        if err:
            return jsonify({'error': err}), 400

        return jsonify({'message': '베팅이 완료되었습니다.', 'data': bet_data}), 200
    except Exception as e:
        logging.error(f"베팅 에러: {e}")
        return jsonify({'error': '서버 에러가 발생했습니다.'}), 500


@prediction_bp.route('/<prediction_id>/close', methods=['PUT'])
def close_prediction(prediction_id):
    user_data, error = verify_admin()
    if error:
        return jsonify({'error': error}), 403
    try:
        err = prediction_service.close_prediction(prediction_id)
        if err:
            return jsonify({'error': err}), 400
        return jsonify({'message': '베팅이 마감되었습니다.'}), 200
    except Exception as e:
        logging.error(f"예측 마감 에러: {e}")
        return jsonify({'error': '서버 에러가 발생했습니다.'}), 500


@prediction_bp.route('/<prediction_id>/settle', methods=['PUT'])
def settle_prediction(prediction_id):
    user_data, error = verify_admin()
    if error:
        return jsonify({'error': error}), 403
    try:
        data = request.get_json()
        if not data or 'result' not in data:
            return jsonify({'error': '결과(result)를 입력해주세요.'}), 400

        summary, err = prediction_service.settle_prediction(
            prediction_id, data['result']
        )
        if err:
            return jsonify({'error': err}), 400

        return jsonify({'message': '정산이 완료되었습니다.', 'data': summary}), 200
    except Exception as e:
        logging.error(f"정산 에러: {e}")
        return jsonify({'error': '서버 에러가 발생했습니다.'}), 500


