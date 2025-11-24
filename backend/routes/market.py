from flask import Blueprint, jsonify, request
from services.market_service import MarketService
import logging

market_bp = Blueprint('market', __name__, url_prefix='/api/market')
logger = logging.getLogger(__name__)

@market_bp.route('/hours', methods=['GET'])
def get_market_hours():
    """모든 시장의 운영 시간 조회
    GET /api/market/hours
    """
    try:
        market_hours = MarketService.get_all_market_hours()
        return jsonify({
            'success': True,
            'data': market_hours
        }), 200
        
    except Exception as e:
        logger.error(f"시장 운영 시간 조회 에러: {str(e)}")
        return jsonify({
            'success': False,
            'message': '시장 운영 시간 조회에 실패했습니다'
        }), 500


@market_bp.route('/hours/<market>', methods=['GET'])
def get_market_hours_by_market(market):
    """특정 시장의 운영 시간 조회
    GET /api/market/hours/KRW
    GET /api/market/hours/USD
    """
    try:
        market_hours = MarketService.get_market_hours(market.upper())
        
        if not market_hours:
            return jsonify({
                'success': False,
                'message': f'{market} 시장 정보를 찾을 수 없습니다'
            }), 404
        
        return jsonify({
            'success': True,
            'data': market_hours
        }), 200
        
    except Exception as e:
        logger.error(f"시장 운영 시간 조회 에러 ({market}): {str(e)}")
        return jsonify({
            'success': False,
            'message': '시장 운영 시간 조회에 실패했습니다'
        }), 500


@market_bp.route('/status', methods=['GET'])
def get_market_status():
    """모든 시장의 현재 상태 조회 (열림/닫힘)
    GET /api/market/status
    """
    try:
        status = MarketService.get_all_market_status()
        return jsonify({
            'success': True,
            'data': status
        }), 200
        
    except Exception as e:
        logger.error(f"시장 상태 조회 에러: {str(e)}")
        return jsonify({
            'success': False,
            'message': '시장 상태 조회에 실패했습니다'
        }), 500


@market_bp.route('/status/<market>', methods=['GET'])
def get_market_status_by_market(market):
    """특정 시장의 현재 상태 조회
    GET /api/market/status/KRW
    GET /api/market/status/USD
    """
    try:
        status = MarketService.is_market_open(market.upper())
        return jsonify({
            'success': True,
            'data': status
        }), 200
        
    except Exception as e:
        logger.error(f"시장 상태 조회 에러 ({market}): {str(e)}")
        return jsonify({
            'success': False,
            'message': '시장 상태 조회에 실패했습니다'
        }), 500
