from utils.db import db
import bcrypt
from datetime import datetime
from config import Config

class User(db.Model):
    """사용자 모델"""
    __tablename__ = 'users'
    
    user_id = db.Column(db.BigInteger, primary_key=True, autoincrement=True)
    username = db.Column(db.String(50), unique=True, nullable=False)
    email = db.Column(db.String(100), unique=True, nullable=False)
    password = db.Column(db.String(255), nullable=False)
    balance = db.Column(db.Numeric(15, 2), default=Config.INITIAL_BALANCE)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        """딕셔너리 변환"""
        return {
            'user_id': str(self.user_id),
            'username': self.username,
            'email': self.email,
            'balance': float(self.balance) if self.balance else 0,
            'created_at': self.created_at,
            'updated_at': self.updated_at
        }


class UserModel:
    """User 모델 작업 클래스 (기존 인터페이스 유지)"""
    
    def create_user(self, username, email, password):
        """새 사용자 생성"""
        hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
        
        user = User(
            username=username,
            email=email,
            password=hashed_password.decode('utf-8'),
            balance=Config.INITIAL_BALANCE
        )
        
        db.session.add(user)
        db.session.commit()
        
        return str(user.user_id)
    
    def find_by_email(self, email):
        """이메일로 사용자 찾기"""
        user = User.query.filter_by(email=email).first()
        if user:
            return {
                '_id': user.user_id,
                'user_id': user.user_id,
                'username': user.username,
                'email': user.email,
                'password': user.password.encode('utf-8') if isinstance(user.password, str) else user.password,
                'balance': float(user.balance) if user.balance else 0,
                'created_at': user.created_at,
                'updated_at': user.updated_at
            }
        return None
    
    def find_by_username(self, username):
        """사용자명으로 사용자 찾기"""
        user = User.query.filter_by(username=username).first()
        if user:
            return user.to_dict()
        return None
    
    def find_by_id(self, user_id):
        """ID로 사용자 찾기"""
        user = User.query.get(int(user_id))
        if user:
            return {
                '_id': user.user_id,
                'user_id': user.user_id,
                'username': user.username,
                'email': user.email,
                'password': user.password.encode('utf-8') if isinstance(user.password, str) else user.password,
                'balance': float(user.balance) if user.balance else 0,
                'created_at': user.created_at,
                'updated_at': user.updated_at
            }
        return None
    
    def verify_password(self, password, hashed_password):
        """비밀번호 검증"""
        if isinstance(hashed_password, str):
            hashed_password = hashed_password.encode('utf-8')
        return bcrypt.checkpw(password.encode('utf-8'), hashed_password)
    
    def update_balance(self, user_id, new_balance):
        """사용자 잔액 업데이트"""
        user = User.query.get(int(user_id))
        if user:
            user.balance = new_balance
            user.updated_at = datetime.utcnow()
            db.session.commit()
            return True
        return False
    
    def get_user_stats(self, user_id):
        """사용자 통계 정보 조회"""
        user = User.query.get(int(user_id))
        if not user:
            return None
        
        return {
            'user_id': str(user.user_id),
            'username': user.username,
            'email': user.email,
            'balance': float(user.balance) if user.balance else 0,
            'created_at': user.created_at,
            'updated_at': user.updated_at
        }
