$ cat /app/routes/prediction.py | head -70
from flask import Blueprint, request, jsonify
from services.prediction_service import prediction_service
from services.auth_service import auth_service
import logging

prediction_bp = Blueprint('prediction', __name__, url_prefix='/api/predictions')
prediction_bp.strict_slashes = False


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

@prediction_bp.route('/', methods=['GET'])
def get_predictions():
user_data, error = verify_auth()
if error:
return jsonify({'error': error}), 401
try:
status = request.args.get('status')
predictions = prediction_service.get_predictions(status)
return jsonify({'data': predictions}), 200
except Exception as e:
logging.error(f"예측 목록 조회 에러: {e}")
