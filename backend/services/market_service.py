from models.stock import MarketHours
from datetime import datetime, time
import pytz
from utils.db import db

class MarketService:
    """시장 운영 시간 관리 서비스"""
    
    @staticmethod
    def get_all_market_hours():
        """모든 시장의 운영 시간 조회"""
        markets = MarketHours.query.all()
        return [{
            'market': m.market,
            'open_time': m.open_time.strftime('%H:%M:%S'),
            'close_time': m.close_time.strftime('%H:%M:%S'),
            'timezone': m.timezone,
            'trading_days': m.trading_days
        } for m in markets]
    
    @staticmethod
    def get_market_hours(market):
        """특정 시장의 운영 시간 조회"""
        market_hours = MarketHours.query.filter_by(market=market).first()
        if not market_hours:
            return None
        
        return {
            'market': market_hours.market,
            'open_time': market_hours.open_time.strftime('%H:%M:%S'),
            'close_time': market_hours.close_time.strftime('%H:%M:%S'),
            'timezone': market_hours.timezone,
            'trading_days': market_hours.trading_days
        }
    
    @staticmethod
    def is_market_open(market):
        """현재 시장이 열려있는지 확인"""
        market_hours = MarketHours.query.filter_by(market=market).first()
        if not market_hours:
            return {'is_open': False, 'message': '시장 정보를 찾을 수 없습니다'}
        
        # 해당 시장의 타임존으로 현재 시간 가져오기
        tz = pytz.timezone(market_hours.timezone)
        current_time = datetime.now(tz)
        current_weekday = current_time.weekday()  # 0=월, 6=일
        
        # 주말 체크
        if current_weekday >= 5:  # 토요일(5), 일요일(6)
            return {
                'is_open': False,
                'message': '주말에는 거래할 수 없습니다',
                'current_time': current_time.strftime('%Y-%m-%d %H:%M:%S %Z'),
                'open_time': market_hours.open_time.strftime('%H:%M:%S'),
                'close_time': market_hours.close_time.strftime('%H:%M:%S')
            }
        
        # 시간 체크
        current_time_only = current_time.time()
        is_open = market_hours.open_time <= current_time_only <= market_hours.close_time
        
        return {
            'is_open': is_open,
            'message': '거래 가능' if is_open else '장 마감',
            'current_time': current_time.strftime('%Y-%m-%d %H:%M:%S %Z'),
            'open_time': market_hours.open_time.strftime('%H:%M:%S'),
            'close_time': market_hours.close_time.strftime('%H:%M:%S'),
            'timezone': market_hours.timezone
        }
    
    @staticmethod
    def get_all_market_status():
        """모든 시장의 현재 상태 조회"""
        markets = MarketHours.query.all()
        result = []
        
        for market in markets:
            status = MarketService.is_market_open(market.market)
            result.append({
                'market': market.market,
                'is_open': status['is_open'],
                'message': status['message'],
                'current_time': status.get('current_time'),
                'open_time': status.get('open_time'),
                'close_time': status.get('close_time'),
                'timezone': market.timezone
            })
        
        return result
    
    @staticmethod
    def initialize_default_markets():
        """기본 시장 데이터 초기화"""
        # KRW 시장이 이미 있는지 확인
        if MarketHours.query.filter_by(market='KRW').first():
            return
        
        # 기본 시장 데이터
        default_markets = [
            {
                'market': 'KRW',
                'open_time': time(9, 0, 0),
                'close_time': time(15, 30, 0),
                'timezone': 'Asia/Seoul',
                'trading_days': 'MON-FRI'
            },
            {
                'market': 'USD',
                'open_time': time(9, 30, 0),
                'close_time': time(16, 0, 0),
                'timezone': 'America/New_York',
                'trading_days': 'MON-FRI'
            }
        ]
        
        for data in default_markets:
            market = MarketHours(**data)
            db.session.add(market)
        
        db.session.commit()
