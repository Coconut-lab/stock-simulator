from utils.db import get_collection
from bson.objectid import ObjectId
import bcrypt
import string
import random
from datetime import datetime
from config import Config

class User:
    def __init__(self):
        self.collection = get_collection('users')

    def _generate_referral_code(self):
        """고유한 6자리 추천 코드 생성"""
        chars = string.ascii_uppercase + string.digits
        for _ in range(20):
            code = ''.join(random.choices(chars, k=6))
            if not self.collection.find_one({'referral_code': code}):
                return code
        return None

    def create_user(self, username, name, password):
        """새 사용자 생성"""
        salt = bcrypt.gensalt()
        try:
            hashed_password = bcrypt.hashpw(password.encode('utf-8'), salt)
        except TypeError:
            hashed_password = bcrypt.hashpw(password, salt if isinstance(salt, str) else salt.decode('utf-8'))

        user_data = {
            'username': username,
            'name': name,
            'password': hashed_password,
            'balance': Config.INITIAL_BALANCE,
            'referral_code': self._generate_referral_code(),
            'referred_by': None,
            'referral_count': 0,
            'created_at': datetime.utcnow(),
            'updated_at': datetime.utcnow()
        }

        result = self.collection.insert_one(user_data)
        return str(result.inserted_id)

    def find_by_referral_code(self, code):
        """추천 코드로 사용자 찾기"""
        return self.collection.find_one({'referral_code': code.upper()})

    def find_by_username(self, username):
        """아이디로 사용자 찾기"""
        return self.collection.find_one({'username': username})
    
    def find_by_id(self, user_id):
        """ID로 사용자 찾기"""
        return self.collection.find_one({'_id': ObjectId(user_id)})
    
    def verify_password(self, password, hashed_password):
        """비밀번호 검증 (bcrypt 버전 호환)"""
        import logging
        logging.info(f"[VERIFY] password type: {type(password)}, hash type: {type(hashed_password)}")
        logging.info(f"[VERIFY] hash repr: {repr(hashed_password)[:80]}")
        logging.info(f"[VERIFY] bcrypt version: {getattr(bcrypt, '__version__', 'unknown')}")

        # 가능한 모든 조합 시도
        pw_str = password if isinstance(password, str) else password.decode('utf-8')
        pw_bytes = password.encode('utf-8') if isinstance(password, str) else password
        hp_raw = bytes(hashed_password) if not isinstance(hashed_password, (str, bytes)) else hashed_password
        hp_str = hp_raw if isinstance(hp_raw, str) else hp_raw.decode('utf-8')
        hp_bytes = hp_raw.encode('utf-8') if isinstance(hp_raw, str) else hp_raw

        logging.info(f"[VERIFY] hp_str: {hp_str[:30]}...")

        for pw, hp in [(pw_str, hp_str), (pw_bytes, hp_bytes), (pw_bytes, hp_str), (pw_str, hp_bytes)]:
            try:
                result = bcrypt.hashpw(pw, hp)
                match = result == hp
                logging.info(f"[VERIFY] ({type(pw).__name__}, {type(hp).__name__}) result type={type(result).__name__}, match={match}")
                if not match:
                    logging.info(f"[VERIFY] result: {repr(result)[:60]}")
                    logging.info(f"[VERIFY] expected: {repr(hp)[:60]}")
                if match:
                    return True
            except Exception as e:
                logging.info(f"[VERIFY] ({type(pw).__name__}, {type(hp).__name__}) error: {e}")
                continue
        return False
    
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

        # 기존 유저에 추천 코드가 없으면 자동 생성
        if not user.get('referral_code'):
            code = self._generate_referral_code()
            if code:
                self.collection.update_one(
                    {'_id': user['_id']},
                    {'$set': {'referral_code': code, 'referral_count': 0}}
                )
                user['referral_code'] = code

        return {
            'user_id': str(user['_id']),
            'username': user['username'],
            'name': user.get('name', user['username']),
            'balance': user['balance'],
            'role': user.get('role', 'user'),
            'referral_code': user.get('referral_code'),
            'referral_count': user.get('referral_count', 0),
            'created_at': user['created_at'],
            'updated_at': user['updated_at']
        }
