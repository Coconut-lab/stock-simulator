import jwt
from bson.objectid import ObjectId
from datetime import datetime, timedelta
from pymongo import ReturnDocument
from config import Config
from models.user import User

class AuthService:
    def __init__(self):
        self.user_model = User()
    
    def generate_token(self, user_id):
        """JWT 토큰 생성"""
        payload = {
            'user_id': str(user_id),
            'exp': datetime.utcnow() + timedelta(seconds=Config.JWT_ACCESS_TOKEN_EXPIRES),
            'iat': datetime.utcnow()
        }
        
        token = jwt.encode(payload, Config.JWT_SECRET_KEY, algorithm='HS256')
        return token
    
    def verify_token(self, token):
        """JWT 토큰 검증"""
        try:
            payload = jwt.decode(token, Config.JWT_SECRET_KEY, algorithms=['HS256'])
            return payload
        except jwt.ExpiredSignatureError:
            return None
        except jwt.InvalidTokenError:
            return None
    
    def register(self, username, name, password, referral_code=None):
        """사용자 등록"""
        from models.portfolio import Portfolio

        # 아이디 중복 확인
        if self.user_model.find_by_username(username):
            return None, "이미 존재하는 아이디입니다."

        # 추천 코드 검증
        referrer = None
        if referral_code:
            referral_code = referral_code.strip().upper()
            referrer = self.user_model.find_by_referral_code(referral_code)
            if not referrer:
                return None, "유효하지 않은 추천 코드입니다."

        # 사용자 생성
        try:
            user_id = self.user_model.create_user(username, name, password)

            # 추천인 보너스 처리
            if referrer:
                bonus = Config.REFERRAL_BONUS
                referrer_id = str(referrer['_id'])
                portfolio_model = Portfolio()

                # 추천인 한도 체크 + 카운트 증가 + 보너스 지급 (원자적)
                updated_referrer = self.user_model.collection.find_one_and_update(
                    {'_id': referrer['_id'], 'referral_count': {'$lt': Config.REFERRAL_MAX_COUNT}},
                    {'$inc': {'balance': bonus, 'referral_count': 1}},
                    return_document=ReturnDocument.AFTER
                )
                if not updated_referrer:
                    # 한도 초과 — 추천 보너스 없이 계속 진행
                    referrer = None
                else:
                    # 신규 유저에 추천인 정보 기록 + 보너스 지급
                    self.user_model.collection.update_one(
                        {'_id': ObjectId(user_id)},
                        {'$set': {
                            'referred_by': referrer_id,
                            'balance': Config.INITIAL_BALANCE + bonus
                        }}
                    )

                    # 거래 기록 - 신규 유저
                    portfolio_model.transactions_collection.insert_one({
                        'user_id': ObjectId(user_id),
                        'symbol': '-', 'name': '추천인 보너스',
                        'type': 'referral_bonus', 'quantity': 0,
                        'price': bonus, 'total_amount': bonus,
                        'commission': 0, 'market': 'KRW',
                        'memo': f"추천 코드 {referral_code} 사용 보너스",
                        'timestamp': datetime.utcnow()
                    })

                    # 거래 기록 - 추천인
                    portfolio_model.transactions_collection.insert_one({
                        'user_id': updated_referrer['_id'],
                        'symbol': '-', 'name': '추천 보너스',
                        'type': 'referral_bonus', 'quantity': 0,
                        'price': bonus, 'total_amount': bonus,
                        'commission': 0, 'market': 'KRW',
                        'memo': f"{username}님이 추천 코드로 가입 (보너스 {bonus:,}원)",
                        'timestamp': datetime.utcnow()
                    })

            token = self.generate_token(user_id)
            user_data = self.user_model.get_user_stats(user_id)

            return {
                'token': token,
                'user': user_data,
                'referral_applied': referrer is not None
            }, None

        except Exception as e:
            return None, f"사용자 생성 실패: {str(e)}"

    def login(self, username, password):
        """사용자 로그인"""
        user = self.user_model.find_by_username(username)

        if not user:
            return None, "존재하지 않는 아이디입니다."

        if not self.user_model.verify_password(password, user['password']):
            return None, "비밀번호가 올바르지 않습니다."

        token = self.generate_token(user['_id'])
        user_data = self.user_model.get_user_stats(str(user['_id']))

        return {
            'token': token,
            'user': user_data
        }, None
    
    def get_current_user(self, token):
        """현재 사용자 정보 조회"""
        payload = self.verify_token(token)
        
        if not payload:
            return None, "유효하지 않은 토큰입니다."
        
        user_id = payload['user_id']
        user_data = self.user_model.get_user_stats(user_id)
        
        if not user_data:
            return None, "사용자를 찾을 수 없습니다."
        
        return user_data, None

# 전역 인증 서비스 인스턴스
auth_service = AuthService()
