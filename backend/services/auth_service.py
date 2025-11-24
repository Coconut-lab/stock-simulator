import jwt
from datetime import datetime, timedelta
from config import Config
from models.user import UserModel

class AuthService:
    def __init__(self):
        self.user_model = UserModel()
    
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
    
    def register(self, username, email, password):
        """사용자 등록"""
        # 이메일 중복 확인
        if self.user_model.find_by_email(email):
            return None, "이미 존재하는 이메일입니다."
        
        # 사용자명 중복 확인
        if self.user_model.find_by_username(username):
            return None, "이미 존재하는 사용자명입니다."
        
        # 사용자 생성
        try:
            user_id = self.user_model.create_user(username, email, password)
            token = self.generate_token(user_id)
            
            user_data = self.user_model.get_user_stats(user_id)
            
            return {
                'token': token,
                'user': user_data
            }, None
            
        except Exception as e:
            return None, f"사용자 생성 실패: {str(e)}"
    
    def login(self, email, password):
        """사용자 로그인"""
        user = self.user_model.find_by_email(email)
        
        if not user:
            return None, "존재하지 않는 이메일입니다."
        
        if not self.user_model.verify_password(password, user['password']):
            return None, "비밀번호가 올바르지 않습니다."
        
        # MySQL에서는 user_id 사용
        user_id = user.get('user_id') or user.get('_id')
        token = self.generate_token(user_id)
        user_data = self.user_model.get_user_stats(str(user_id))
        
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
