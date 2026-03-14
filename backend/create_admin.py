"""관리자 계정 생성/승격 스크립트

사용법:
  python create_admin.py                    # 기본 관리자 계정 생성
  python create_admin.py user@email.com     # 기존 계정을 관리자로 승격
"""
import sys
from utils.db import get_collection
from models.user import User
import bcrypt
from datetime import datetime

user_model = User()
users = get_collection('users')

if len(sys.argv) > 1:
    email = sys.argv[1]
    user = users.find_one({'email': email})
    if not user:
        print(f"사용자를 찾을 수 없습니다: {email}")
        sys.exit(1)
    users.update_one({'_id': user['_id']}, {'$set': {'role': 'admin'}})
    print(f"관리자로 승격되었습니다: {user['username']} ({email})")
else:
    existing = users.find_one({'email': 'admin@stock.com'})
    if existing:
        users.update_one({'_id': existing['_id']}, {'$set': {'role': 'admin'}})
        print(f"기존 계정을 관리자로 업데이트했습니다: {existing['username']}")
    else:
        hashed = bcrypt.hashpw('admin1234'.encode('utf-8'), bcrypt.gensalt())
        users.insert_one({
            'username': 'admin',
            'email': 'admin@stock.com',
            'password': hashed,
            'balance': 10000000,
            'role': 'admin',
            'created_at': datetime.utcnow(),
            'updated_at': datetime.utcnow(),
        })
        print("관리자 계정이 생성되었습니다.")
        print("  이메일: admin@stock.com")
        print("  비밀번호: admin1234")
