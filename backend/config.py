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

    # 예측 마켓 설정
    PREDICTION_ODDS = 1.8
    PREDICTION_MIN_BET = 1000
    PREDICTION_MAX_BET = 500000

    # 추천인 설정
    REFERRAL_BONUS = 300000        # 추천 보너스 30만원 (추천인 + 가입자 둘 다)
    REFERRAL_MAX_COUNT = 10        # 최대 추천 가능 횟수

    # 소수점 거래 설정
    FRACTIONAL_DECIMALS = 4

    # 공매도 설정
    SHORT_MARGIN_RATE = 1.5       # 증거금률 150%
    SHORT_BORROW_RATE = 0.0001    # 일일 대여료율 0.01%

    # 선물 거래 설정 (마이크로/미니 계약 — 100만원 기본금 기준)
    FUTURES_CONTRACTS = {
        'KOSPI200': {
            'name': 'KOSPI200 미니선물',
            'underlying': 'KOSPI200',
            'contract_size': 5000,       # 1포인트 = 5,000원 (실제 미니선물 수준)
            'tick_size': 0.05,
            'initial_margin_rate': 0.10,
            'maintenance_margin_rate': 0.07,
            'currency': 'KRW',
        },
        'MES': {
            'name': 'S&P500 마이크로 선물',
            'underlying': 'MES',
            'contract_size': 1,          # 1포인트 = $1
            'tick_size': 0.25,
            'initial_margin_rate': 0.05,
            'maintenance_margin_rate': 0.03,
            'currency': 'USD',
        },
        'MNQ': {
            'name': 'NASDAQ 마이크로 선물',
            'underlying': 'MNQ',
            'contract_size': 0.5,        # 1포인트 = $0.5
            'tick_size': 0.25,
            'initial_margin_rate': 0.05,
            'maintenance_margin_rate': 0.03,
            'currency': 'USD',
        },
        'MCL': {
            'name': 'WTI 원유 마이크로 선물',
            'underlying': 'MCL',
            'contract_size': 20,         # 20배럴
            'tick_size': 0.01,
            'initial_margin_rate': 0.08,
            'maintenance_margin_rate': 0.05,
            'currency': 'USD',
        },
        'MGC': {
            'name': '금 마이크로 선물',
            'underlying': 'MGC',
            'contract_size': 1,          # 1온스
            'tick_size': 0.10,
            'initial_margin_rate': 0.05,
            'maintenance_margin_rate': 0.03,
            'currency': 'USD',
        },
        'M6E': {
            'name': '유로/달러 마이크로 선물',
            'underlying': 'M6E',
            'contract_size': 12500,      # €12,500
            'tick_size': 0.0001,
            'initial_margin_rate': 0.02,
            'maintenance_margin_rate': 0.01,
            'currency': 'USD',
        },
    }

    # 옵션 거래 설정
    OPTIONS_RISK_FREE_RATE = 0.04   # 무위험이자율 4%
    OPTIONS_CONTRACT_SIZE = 100      # 1계약 = 100주
    OPTIONS_SUPPORTED_UNDERLYINGS = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'NVDA', 'META', 'SPY', 'QQQ', '005930', 'NFLX', 'AMD', 'INTC', 'JPM', 'V', 'BA', 'DIS', 'COIN', 'SOFI', '000660', '035420']
    OPTIONS_STRIKE_INTERVAL = {
        'default': 0.05,  # 현재가 대비 5% 간격
        'narrow': 0.025,  # 현재가 대비 2.5% 간격
    }

    # Flask 설정
    DEBUG = True
    TESTING = False
