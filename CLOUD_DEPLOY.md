# 🚀 클라우드 통합 배포 가이드

## 📦 설정 정보

이 설정은 **프론트엔드(React)와 백엔드(Flask)를 하나의 컨테이너**로 실행합니다.

### 클라우드 서버 설정값

```
Port: 5000

Dockerfile path: Dockerfile

Health Check: /api/health

Start commands: (비워두기 - Dockerfile에 정의됨)
```

## 🔧 환경변수 설정 (필수!)

클라우드 플랫폼의 환경변수 설정에 다음을 추가하세요:

```env
# MongoDB 연결 (MongoDB Atlas 사용 권장)
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/stock_simulator

# JWT 시크릿 키 (32자 이상 랜덤 값)
JWT_SECRET_KEY=f4e9a2b7c8d3e1f5a6b8c9d4e2f7a3b9c5d6e8f1a4b7c2d9e3f6a8b1c4d7e9f2

# Flask 환경
FLASK_ENV=production

# 포트 (클라우드가 자동 할당하는 경우도 있음)
PORT=5000
```

## 📋 작동 방식

1. **빌드 단계**: React 앱을 빌드해서 정적 파일 생성
2. **실행 단계**: Flask 서버가 시작되고:
   - `/api/*` 경로 → Flask API 처리
   - 그 외 경로 → React 앱 서빙
3. **결과**: 단일 포트(5000)로 모든 요청 처리

## 🌐 접속

배포 후:
- `https://your-domain.com/` → React 프론트엔드
- `https://your-domain.com/api/health` → 백엔드 헬스체크

## 🎯 MongoDB 설정

### MongoDB Atlas (무료 티어 사용 가능)

1. https://www.mongodb.com/cloud/atlas 가입
2. 무료 클러스터 생성
3. Database Access → 사용자 추가
4. Network Access → IP 화이트리스트 (`0.0.0.0/0` 또는 클라우드 서버 IP)
5. 연결 문자열 복사:
   ```
   mongodb+srv://username:password@cluster.mongodb.net/stock_simulator
   ```

## 🔍 배포 전 로컬 테스트

```bash
# 이미지 빌드
docker build -t stock-simulator .

# 실행 (환경변수 포함)
docker run -p 5000:5000 \
  -e MONGODB_URI="your-mongodb-uri" \
  -e JWT_SECRET_KEY="your-secret-key" \
  stock-simulator

# 접속 테스트
curl http://localhost:5000/api/health
```

## ⚠️ 주의사항

1. **MongoDB URI는 반드시 설정**: 로컬 MongoDB는 클라우드에서 접근 불가
2. **JWT_SECRET_KEY는 랜덤 값**: 보안을 위해 절대 기본값 사용 금지
3. **CORS 설정**: 통합 배포에서는 CORS 이슈 없음 (같은 도메인)
4. **빌드 시간**: React 빌드 포함으로 첫 배포는 5-10분 소요 가능

## 🐛 문제 해결

### 500 에러 발생
- MongoDB URI 확인
- 환경변수가 제대로 설정되었는지 확인
- 로그 확인

### 프론트엔드만 보임
- `/api/health` 접속 테스트
- 백엔드 라우트가 제대로 등록되었는지 확인

### 빌드 실패
- Node.js 버전 확인
- Python 버전 확인
- 메모리 부족 가능성 (최소 1GB RAM 권장)

## 📚 지원 플랫폼

이 설정이 작동하는 클라우드 플랫폼:
- ✅ Railway
- ✅ Render
- ✅ Fly.io
- ✅ Google Cloud Run
- ✅ AWS ECS/Fargate
- ✅ Azure Container Apps
- ✅ DigitalOcean App Platform
