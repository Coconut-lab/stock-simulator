from flask import Blueprint, request, jsonify
from services.auth_service import auth_service
from models.user import User
from models.announcement import Announcement
from models.portfolio import Portfolio
from bson.objectid import ObjectId
from datetime import datetime
import logging

admin_bp = Blueprint('admin', __name__, url_prefix='/api/admin')
user_model = User()
announcement_model = Announcement()
portfolio_model = Portfolio()


def verify_admin():
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        return None, '인증 토큰이 필요합니다.'
    token = auth_header.split(' ')[1]
    user_data, error = auth_service.get_current_user(token)
    if error:
        return None, error
    if user_data.get('role') != 'admin':
        return None, '관리자 권한이 필요합니다.'
    return user_data, None


# ── 유저 목록 ──

@admin_bp.route('/users', methods=['GET'])
def get_users():
    admin, error = verify_admin()
    if error:
        return jsonify({'error': error}), 403
    try:
        page = int(request.args.get('page', 1))
        per_page = int(request.args.get('per_page', 30))
        search = request.args.get('search', '').strip()

        query = {}
        if search:
            query['$or'] = [
                {'username': {'$regex': search, '$options': 'i'}},
                {'name': {'$regex': search, '$options': 'i'}},
            ]

        total = user_model.collection.count_documents(query)
        users = list(
            user_model.collection.find(query)
            .sort('created_at', -1)
            .skip((page - 1) * per_page)
            .limit(per_page)
        )

        result = []
        for u in users:
            result.append({
                'user_id': str(u['_id']),
                'username': u['username'],
                'name': u.get('name', u['username']),
                'balance': u['balance'],
                'role': u.get('role', 'user'),
                'created_at': u['created_at'].isoformat() if u.get('created_at') else None,
                'updated_at': u['updated_at'].isoformat() if u.get('updated_at') else None,
            })

        return jsonify({
            'data': result,
            'total': total,
            'page': page,
            'per_page': per_page,
            'total_pages': (total + per_page - 1) // per_page,
        }), 200
    except Exception as e:
        logging.error(f"유저 목록 조회 에러: {e}")
        return jsonify({'error': '서버 에러가 발생했습니다.'}), 500


# ── 유저 잔액 수정 ──

@admin_bp.route('/users/<user_id>/balance', methods=['PUT'])
def update_user_balance(user_id):
    admin, error = verify_admin()
    if error:
        return jsonify({'error': error}), 403
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': '요청 데이터가 필요합니다.'}), 400

        action = data.get('action')  # 'set', 'add', 'subtract'
        amount = data.get('amount')

        if amount is None:
            return jsonify({'error': '금액을 입력해주세요.'}), 400
        amount = int(amount)
        if amount < 0:
            return jsonify({'error': '금액은 0 이상이어야 합니다.'}), 400

        user = user_model.find_by_id(user_id)
        if not user:
            return jsonify({'error': '사용자를 찾을 수 없습니다.'}), 404

        if action == 'set':
            new_balance = amount
        elif action == 'add':
            new_balance = user['balance'] + amount
        elif action == 'subtract':
            new_balance = max(0, user['balance'] - amount)
        else:
            return jsonify({'error': "action은 'set', 'add', 'subtract' 중 하나여야 합니다."}), 400

        user_model.update_balance(user_id, new_balance)

        # 잔액 변경 거래 기록 저장
        diff = new_balance - user['balance']
        if diff != 0:
            tx_type = 'admin_deposit' if diff > 0 else 'admin_withdraw'
            portfolio_model.transactions_collection.insert_one({
                'user_id': ObjectId(user_id),
                'symbol': '-',
                'name': '관리자 조정',
                'type': tx_type,
                'quantity': 0,
                'price': abs(diff),
                'original_price': None,
                'exchange_rate': None,
                'commission': 0,
                'total_amount': abs(diff),
                'market': 'KRW',
                'memo': f"관리자가 잔액 {action} ({user['balance']:,}→{new_balance:,})",
                'timestamp': datetime.utcnow()
            })

        return jsonify({
            'message': '잔액이 수정되었습니다.',
            'data': {
                'user_id': user_id,
                'username': user['username'],
                'previous_balance': user['balance'],
                'new_balance': new_balance,
            }
        }), 200
    except Exception as e:
        logging.error(f"유저 잔액 수정 에러: {e}")
        return jsonify({'error': '서버 에러가 발생했습니다.'}), 500


# ── 유저 역할 변경 ──

@admin_bp.route('/users/<user_id>/role', methods=['PUT'])
def update_user_role(user_id):
    admin, error = verify_admin()
    if error:
        return jsonify({'error': error}), 403
    try:
        data = request.get_json()
        role = data.get('role')
        if role not in ('user', 'admin'):
            return jsonify({'error': "역할은 'user' 또는 'admin'이어야 합니다."}), 400

        user = user_model.find_by_id(user_id)
        if not user:
            return jsonify({'error': '사용자를 찾을 수 없습니다.'}), 404

        # 자기 자신의 권한은 변경 불가
        if str(user['_id']) == admin['user_id']:
            return jsonify({'error': '자신의 역할은 변경할 수 없습니다.'}), 400

        user_model.collection.update_one(
            {'_id': ObjectId(user_id)},
            {'$set': {'role': role}}
        )

        return jsonify({
            'message': '역할이 변경되었습니다.',
            'data': {'user_id': user_id, 'role': role}
        }), 200
    except Exception as e:
        logging.error(f"유저 역할 변경 에러: {e}")
        return jsonify({'error': '서버 에러가 발생했습니다.'}), 500


# ── 공지사항 ──

@admin_bp.route('/announcements', methods=['GET'])
def get_announcements():
    """관리자용 전체 공지 목록"""
    admin, error = verify_admin()
    if error:
        return jsonify({'error': error}), 403
    try:
        page = int(request.args.get('page', 1))
        items, total = announcement_model.get_all(page=page)
        result = []
        for a in items:
            result.append({
                'id': str(a['_id']),
                'message': a['message'],
                'priority': a.get('priority', 'normal'),
                'duration_hours': a['duration_hours'],
                'is_active': a['is_active'],
                'created_at': a['created_at'].isoformat(),
                'expires_at': a['expires_at'].isoformat(),
            })
        return jsonify({'data': result, 'total': total}), 200
    except Exception as e:
        logging.error(f"공지 목록 조회 에러: {e}")
        return jsonify({'error': '서버 에러가 발생했습니다.'}), 500


@admin_bp.route('/announcements', methods=['POST'])
def create_announcement():
    """공지 생성"""
    admin, error = verify_admin()
    if error:
        return jsonify({'error': error}), 403
    try:
        data = request.get_json()
        message = data.get('message', '').strip()
        if not message:
            return jsonify({'error': '공지 내용을 입력해주세요.'}), 400
        if len(message) > 200:
            return jsonify({'error': '공지는 200자 이하로 작성해주세요.'}), 400

        duration_hours = float(data.get('duration_hours', 2))
        if duration_hours <= 0 or duration_hours > 168:
            return jsonify({'error': '표시 시간은 1시간~168시간(7일) 사이로 설정해주세요.'}), 400

        priority = data.get('priority', 'normal')
        if priority not in ('normal', 'urgent'):
            priority = 'normal'

        doc = announcement_model.create(
            message=message,
            created_by=admin['user_id'],
            duration_hours=duration_hours,
            priority=priority,
        )

        return jsonify({
            'message': '공지가 등록되었습니다.',
            'data': {
                'id': str(doc['_id']),
                'message': doc['message'],
                'expires_at': doc['expires_at'].isoformat(),
            }
        }), 201
    except Exception as e:
        logging.error(f"공지 생성 에러: {e}")
        return jsonify({'error': '서버 에러가 발생했습니다.'}), 500


@admin_bp.route('/announcements/<announcement_id>', methods=['DELETE'])
def delete_announcement(announcement_id):
    """공지 삭제"""
    admin, error = verify_admin()
    if error:
        return jsonify({'error': error}), 403
    try:
        announcement_model.delete(announcement_id)
        return jsonify({'message': '공지가 삭제되었습니다.'}), 200
    except Exception as e:
        logging.error(f"공지 삭제 에러: {e}")
        return jsonify({'error': '서버 에러가 발생했습니다.'}), 500


@admin_bp.route('/announcements/<announcement_id>/deactivate', methods=['PUT'])
def deactivate_announcement(announcement_id):
    """공지 즉시 종료"""
    admin, error = verify_admin()
    if error:
        return jsonify({'error': error}), 403
    try:
        announcement_model.deactivate(announcement_id)
        return jsonify({'message': '공지가 비활성화되었습니다.'}), 200
    except Exception as e:
        logging.error(f"공지 비활성화 에러: {e}")
        return jsonify({'error': '서버 에러가 발생했습니다.'}), 500
