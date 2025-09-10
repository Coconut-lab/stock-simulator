from utils.db import get_collection
from bson.objectid import ObjectId
import bcrypt
from datetime import datetime
from config import Config

class User:
    def __init__(self):
        self.collection = get_collection('users')
    
    def create_user(self, username, email, password):
        """새 사용자 생성"""
        # 비밀번호 해싱
        hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
        
        user_data = {
            'username': username,
            'email': email,
            'password': hashed_password,
            'balance': Config.INITIAL_BALANCE,  # 초기 자금 100만원
            'created_at': datetime.utcnow(),
            'updated_at': datetime.utcnow()
        }
        
        result = self.collection.insert_one(user_data)
        return str(result.inserted_id)
    
    def find_by_email(self, email):
        """이메일로 사용자 찾기"""
        return self.collection.find_one({'email': email})
    
    def find_by_username(self, username):
        """사용자명으로 사용자 찾기"""
        return self.collection.find_one({'username': username})
    
    def find_by_id(self, user_id):
        """ID로 사용자 찾기"""
        return self.collection.find_one({'_id': ObjectId(user_id)})
    
    def verify_password(self, password, hashed_password):
        """비밀번호 검증"""
        return bcrypt.checkpw(password.encode('utf-8'), hashed_password)
    
    def update_balance(self, user_id, new_balance):
        """사용자 잔액 업데이트"""
        result = self.collection.update_one(
            {'_id': ObjectId(user_id)},
            {
                '$set': {
                    'balance': new_balance,
                    'updated_at': datetime.utcnow()
                }
            }
        )
        return result.modified_count > 0
    
    def get_user_stats(self, user_id):
        """사용자 통계 정보 조회"""
        user = self.find_by_id(user_id)
        if not user:
            return None
        
        return {
            'user_id': str(user['_id']),
            'username': user['username'],
            'email': user['email'],
            'balance': user['balance'],
            'created_at': user['created_at'],
            'updated_at': user['updated_at']
        }
