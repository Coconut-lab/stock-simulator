# Stage 1: React 프론트엔드 빌드
FROM node:18-alpine AS frontend-builder

WORKDIR /frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Stage 2: Flask 백엔드 + 빌드된 React 서빙
FROM python:3.11-slim

WORKDIR /app

# 시스템 패키지 설치
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# 백엔드 의존성 설치
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 백엔드 코드 복사
COPY backend/ .

# 프론트엔드 빌드 파일 복사
COPY --from=frontend-builder /frontend/build ./static

# 포트 노출 (단일 포트)
EXPOSE 5000

# 환경변수 설정
ENV FLASK_APP=app.py
ENV PYTHONUNBUFFERED=1

# Flask에서 React 정적 파일 서빙하도록 설정
CMD ["python", "app_unified.py"]
