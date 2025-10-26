import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    # MongoDB 설정
    MONGODB_URI = os.getenv("DB_URL")
    DATABASE_NAME = "stock_trading"
    
    # JWT 설정
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'your-secret-key-here')
    JWT_ACCESS_TOKEN_EXPIRES = 86400  # 24시간
    
    # 초기 자금 설정
    INITIAL_BALANCE = 1000000  # 100만원
    
    # 거래 수수료 설정 (실제와 동일)
    COMMISSION_RATE = {
        'KRW': 0.00015,  # 한국 주식 0.015%
        'USD': 0.00005   # 미국 주식 0.005%
    }
    
    # 주식 데이터 업데이트 간격 (초)
    STOCK_UPDATE_INTERVAL = 300
    

    DEBUG = True
    TESTING = False
