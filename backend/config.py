import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    # MongoDB 설정
    MONGODB_URI = os.getenv("DB_URL") or os.getenv("MONGODB_URI", "mongodb://localhost:27017/stock_trading")
    DATABASE_NAME = "stock_trading"

    # JWT 설정
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "default-secret-key-change-in-production")
    JWT_ACCESS_TOKEN_EXPIRES = 86400  # 24시간

    # 초기 자금 설정
    INITIAL_BALANCE = 1000000  # 100만원

    # 거래 수수료 설정
    COMMISSION_RATE = {
        'KRW': 0.00015,   # 한국 주식 0.015%
        'USD': 0.00005,   # 미국 주식 0.005%
        'HKD': 0.0001,    # 홍콩 주식 0.01%
        'EUR': 0.0001,    # 유럽 주식 0.01%
    }

    # 시간외 거래 수수료 배수 (정규장 수수료 x 3)
    AFTER_HOURS_COMMISSION_MULTIPLIER = 3

    # 최소 수수료 (원화 기준)
    MIN_COMMISSION = {
        'KRW': 1000,
        'USD': 1350,   # ~$1
        'HKD': 1000,   # ~HK$6
        'EUR': 1500,   # ~€1
    }

    # 시장 정보 (장시간은 현지 시간 기준, UTC 오프셋으로 계산)
    MARKET_INFO = {
        'KRW': {
            'name': '한국 (KRX)',
            'open_hour': 9, 'open_min': 0,
            'close_hour': 15, 'close_min': 30,
            'utc_offset': 9,           # KST = UTC+9
            'currency_symbol': '₩',
            'weekdays_only': True,
        },
        'USD': {
            'name': '미국 (NYSE/NASDAQ)',
            'open_hour': 9, 'open_min': 30,
            'close_hour': 16, 'close_min': 0,
            'utc_offset': -5,          # EST = UTC-5
            'currency_symbol': '$',
            'weekdays_only': True,
        },
        'HKD': {
            'name': '홍콩 (HKEX)',
            'open_hour': 9, 'open_min': 30,
            'close_hour': 16, 'close_min': 0,
            'utc_offset': 8,           # HKT = UTC+8
            'currency_symbol': 'HK$',
            'weekdays_only': True,
        },
        'EUR': {
            'name': '유럽 (LSE)',
            'open_hour': 8, 'open_min': 0,
            'close_hour': 16, 'close_min': 30,
            'utc_offset': 0,           # GMT = UTC+0
            'currency_symbol': '£',
            'weekdays_only': True,
        },
    }

    # 주식 데이터 업데이트 간격 (초)
    STOCK_UPDATE_INTERVAL = 300  # 5분마다 업데이트 (rate limiting 방지)

    # Flask 설정
    DEBUG = True
    TESTING = False
