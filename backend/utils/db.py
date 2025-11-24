from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, scoped_session
from config import Config
import logging

# SQLAlchemy 인스턴스 (Flask와 함께 사용)
db = SQLAlchemy()

# 독립적인 세션 (Flask 컨텍스트 외부에서 사용)
_engine = None
_session_factory = None

def get_engine():
    """SQLAlchemy 엔진 반환"""
    global _engine
    if _engine is None:
        _engine = create_engine(
            Config.SQLALCHEMY_DATABASE_URI,
            pool_pre_ping=True,
            pool_recycle=3600,
            echo=Config.SQLALCHEMY_ECHO
        )
    return _engine

def get_session():
    """독립적인 세션 반환 (Flask 컨텍스트 외부용)"""
    global _session_factory
    if _session_factory is None:
        engine = get_engine()
        _session_factory = scoped_session(sessionmaker(bind=engine))
    return _session_factory()

def init_db(app):
    """Flask 앱과 함께 DB 초기화"""
    app.config['SQLALCHEMY_DATABASE_URI'] = Config.SQLALCHEMY_DATABASE_URI
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = Config.SQLALCHEMY_TRACK_MODIFICATIONS
    app.config['SQLALCHEMY_ECHO'] = Config.SQLALCHEMY_ECHO
    
    db.init_app(app)
    
    with app.app_context():
        # 모든 테이블 생성
        db.create_all()
        logging.info("MySQL 데이터베이스 테이블 생성 완료")

def close_db():
    """DB 연결 종료"""
    global _engine, _session_factory
    if _session_factory:
        _session_factory.remove()
        _session_factory = None
    if _engine:
        _engine.dispose()
        _engine = None
    logging.info("MySQL 연결 종료")
