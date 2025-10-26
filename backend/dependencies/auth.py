"""
Authentication dependencies for FastAPI
"""
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from services.auth_service import auth_service
from typing import Dict

# OAuth2 스키마 정의
security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> Dict:
    """
    현재 인증된 사용자 정보를 반환하는 의존성
    
    Args:
        credentials: Bearer 토큰
        
    Returns:
        Dict: 사용자 정보
        
    Raises:
        HTTPException: 인증 실패 시
    """
    token = credentials.credentials
    
    user_data, error = auth_service.get_current_user(token)
    
    if error:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=error,
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return user_data


async def get_optional_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> Dict | None:
    """
    선택적 인증 (인증 실패 시 None 반환)
    
    Args:
        credentials: Bearer 토큰
        
    Returns:
        Dict | None: 사용자 정보 또는 None
    """
    try:
        token = credentials.credentials
        user_data, error = auth_service.get_current_user(token)
        
        if error:
            return None
            
        return user_data
    except:
        return None
