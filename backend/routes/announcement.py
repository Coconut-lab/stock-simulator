from flask import Blueprint, jsonify
from models.announcement import Announcement
import logging

announcement_bp = Blueprint('announcement', __name__, url_prefix='/api/announcements')
announcement_model = Announcement()


@announcement_bp.route('/active', methods=['GET'])
def get_active_announcements():
    """활성 공지 목록 (인증 불필요)"""
    try:
        items = announcement_model.get_active()
        result = []
        for a in items:
            result.append({
                'id': str(a['_id']),
                'message': a['message'],
                'priority': a.get('priority', 'normal'),
                'expires_at': a['expires_at'].isoformat(),
            })
        return jsonify({'data': result}), 200
    except Exception as e:
        logging.error(f"활성 공지 조회 에러: {e}")
        return jsonify({'data': []}), 200
