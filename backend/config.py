import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    # MySQL 설정
    MYSQL_HOST = os.getenv("MYSQL_HOST", "localhost")
    MYSQL_PORT = int(os.getenv("MYSQL_PORT", 3306))
    MYSQL_USER = os.getenv("MYSQL_USER", "root")
    MYSQL_PASSWORD = os.getenv("MYSQL_PASSWORD", "")
    MYSQL_DATABASE = os.getenv("MYSQL_DATABASE", "stock_trading")
    
    # SQLAlchemy 연결 문자열
    SQLALCHEMY_DATABASE_URI = (
        f"mysql+pymysql://{MYSQL_USER}:{MYSQL_PASSWORD}"
        f"@{MYSQL_HOST}:{MYSQL_PORT}/{MYSQL_DATABASE}?charset=utf8mb4"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ECHO = False  # SQL 쿼리 로깅 (개발 시 True)
    
    # JWT 설정
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'your-secret-key-change-in-production')
    JWT_ACCESS_TOKEN_EXPIRES = 86400  # 24시간
    
    # 초기 자금 설정
    INITIAL_BALANCE = 1000000  # 100만원
    
    # 거래 수수료 설정 (실제와 동일)
    COMMISSION_RATE = {
        'KRW': 0.00015,  # 한국 주식 0.015%
        'USD': 0.00005   # 미국 주식 0.005%
    }
    
    # 주식 데이터 업데이트 간격 (초)
    STOCK_UPDATE_INTERVAL = 300  # 5분마다 업데이트 (rate limiting 방지)
    
    # Flask 설정
    DEBUG = os.getenv("FLASK_DEBUG", "True").lower() == "true"
    TESTING = False
