"""
FastAPI Main Application
가상 주식 투자 API 서버
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import logging
import time
import threading
from datetime import datetime

# 설정 및 서비스 임포트
from config import Config
from services.stock_service import stock_service

# 라우트 임포트
from routes.auth import router as auth_router
from routes.stocks import router as stocks_router
from routes.portfolio import router as portfolio_router


# 로깅 설정
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)


def initialize_services():
    """서비스 초기화"""
    try:
        logging.info("서비스 초기화 시작...")
        
        # 자동 업데이트 시작 (5분 간격)
        stock_service.start_auto_update(Config.STOCK_UPDATE_INTERVAL)
        
        # 백그라운드에서 초기 데이터 로드 (비동기)
        def load_initial_data():
            time.sleep(10)  # 10초 후에 시작
            stock_service.update_stock_cache()
        
        init_thread = threading.Thread(target=load_initial_data, daemon=True)
        init_thread.start()
        
        logging.info("서비스 초기화 완료")
        
    except Exception as e:
        logging.error(f"서비스 초기화 실패: {e}")


def shutdown_services():
    """서비스 종료"""
    try:
        logging.info("서비스 종료 중...")
        stock_service.stop_auto_update()
        logging.info("서비스 종료 완료")
    except Exception as e:
        logging.error(f"서비스 종료 실패: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """애플리케이션 생명주기 관리"""
    # 시작 시
    initialize_services()
    yield
    # 종료 시
    shutdown_services()


# FastAPI 앱 생성
app = FastAPI(
    title="가상 주식 투자 API",
    description="가상 주식 투자 시뮬레이션 API 서버",
    version="2.0.0",
    lifespan=lifespan
)

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # React 프론트엔드
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# 라우터 등록
app.include_router(auth_router, prefix="/api/auth", tags=["인증"])
app.include_router(stocks_router, prefix="/api/stocks", tags=["주식"])
app.include_router(portfolio_router, prefix="/api/portfolio", tags=["포트폴리오"])


# 기본 라우트
@app.get("/", tags=["기본"])
async def health_check():
    """서버 상태 확인"""
    return {
        "message": "가상 주식 투자 API 서버가 실행 중입니다.",
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat()
    }


@app.get("/api/health", tags=["기본"])
async def api_health():
    """API 상태 확인"""
    return {
        "status": "healthy",
        "services": {
            "database": "connected",
            "stock_service": "running"
        },
        "timestamp": datetime.utcnow().isoformat()
    }


# 에러 핸들러
@app.exception_handler(404)
async def not_found_handler(request, exc):
    """404 에러 핸들러"""
    return JSONResponse(
        status_code=404,
        content={"error": "요청한 리소스를 찾을 수 없습니다."}
    )


@app.exception_handler(500)
async def internal_error_handler(request, exc):
    """500 에러 핸들러"""
    return JSONResponse(
        status_code=500,
        content={"error": "서버 내부 에러가 발생했습니다."}
    )


if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=5000,
        reload=Config.DEBUG,
        log_level="info"
    )
