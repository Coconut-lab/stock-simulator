# 🐳 Docker 실행 가이드

## 필수 요구사항
- Docker Desktop 설치 (https://www.docker.com/products/docker-desktop)
- Docker Desktop 실행 중이어야 함

## 🚀 실행 방법

### 1. 전체 서비스 시작 (프론트엔드 + 백엔드 + MongoDB)
```bash
docker-compose up
```

### 2. 백그라운드에서 실행
```bash
docker-compose up -d
```

### 3. 특정 서비스만 시작
```bash
# 백엔드만
docker-compose up backend

# 프론트엔드만
docker-compose up frontend
```

## 🌐 접속 주소
- **프론트엔드**: http://localhost:3000
- **백엔드 API**: http://localhost:5000
- **MongoDB**: mongodb://localhost:27017

## 🛠️ 유용한 명령어

### 서비스 중지
```bash
docker-compose down
```

### 서비스 중지 + 볼륨 삭제 (DB 데이터 삭제)
```bash
docker-compose down -v
```

### 로그 확인
```bash
# 전체 로그
docker-compose logs

# 특정 서비스 로그
docker-compose logs backend
docker-compose logs frontend

# 실시간 로그 추적
docker-compose logs -f
```

### 컨테이너 재시작
```bash
docker-compose restart
```

### 이미지 재빌드 (코드 변경 후)
```bash
docker-compose up --build
```

### 컨테이너 접속
```bash
# 백엔드 컨테이너 접속
docker-compose exec backend bash

# 프론트엔드 컨테이너 접속
docker-compose exec frontend sh
```

## 📝 환경변수 설정

백엔드 환경변수는 `backend/.env` 파일에 설정하세요:
```
MONGODB_URI=mongodb://admin:admin123@mongodb:27017/stock_simulator?authSource=admin
JWT_SECRET=your-secret-key
```

## 🔧 문제 해결

### 포트가 이미 사용 중인 경우
```bash
# 포트 사용 중인 프로세스 확인 (Mac/Linux)
lsof -i :3000
lsof -i :5000
lsof -i :27017

# 해당 프로세스 종료
kill -9 <PID>
```

### 캐시 문제로 빌드 실패 시
```bash
docker-compose build --no-cache
docker-compose up
```

### 전체 초기화
```bash
docker-compose down -v
docker system prune -a
docker-compose up --build
```

## 🎯 개발 모드 특징
- 코드 변경 시 자동으로 반영됩니다 (Hot Reload)
- 로컬 파일과 컨테이너가 동기화됩니다
- node_modules와 __pycache__는 컨테이너 내부에만 유지됩니다
