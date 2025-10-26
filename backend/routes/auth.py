from fastapi import APIRouter, HTTPException, status, Depends
from services.auth_service import auth_service
from dependencies.auth import get_current_user
from schemas import (
    UserRegister,
    UserLogin,
    AuthResponse,
    UserResponse,
    MessageResponse,
    TokenResponse
)
import logging

router = APIRouter()


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def register(user_data: UserRegister):
    """사용자 등록"""
    try:
        # 필수 필드는 Pydantic이 자동으로 검증
        
        result, error = auth_service.register(
            user_data.username,
            user_data.email,
            user_data.password
        )
        
        if error:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=error
            )
        
        return {
            "message": "회원가입이 완료되었습니다.",
            "data": result
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"회원가입 에러: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="서버 에러가 발생했습니다."
        )


@router.post("/login", response_model=AuthResponse)
async def login(credentials: UserLogin):
    """사용자 로그인"""
    try:
        result, error = auth_service.login(
            credentials.email,
            credentials.password
        )
        
        if error:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=error
            )
        
        return {
            "message": "로그인이 완료되었습니다.",
            "data": result
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"로그인 에러: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="서버 에러가 발생했습니다."
        )


@router.get("/me", response_model=dict)
async def get_current_user_info(current_user: dict = Depends(get_current_user)):
    """현재 사용자 정보 조회"""
    try:
        return {"data": current_user}
        
    except Exception as e:
        logging.error(f"사용자 정보 조회 에러: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="서버 에러가 발생했습니다."
        )


@router.post("/logout", response_model=MessageResponse)
async def logout():
    """사용자 로그아웃 (클라이언트에서 토큰 삭제)"""
    return {"message": "로그아웃이 완료되었습니다."}
