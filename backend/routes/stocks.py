"""
Stocks Routes for FastAPI
"""
from fastapi import APIRouter, HTTPException, status, Depends, Query
from services.stock_service import stock_service
from dependencies.auth import get_current_user
from schemas import (
    StockSearchResult,
    MultipleStocksRequest,
    MarketSummary,
    StockInfo
)
from typing import List, Dict
import logging

router = APIRouter()


@router.get("/market-summary", response_model=Dict)
async def get_market_summary(current_user: dict = Depends(get_current_user)):
    """시장 요약 정보 조회"""
    try:
        market_data = stock_service.get_market_summary()
        return {"data": market_data}
        
    except Exception as e:
        logging.error(f"시장 요약 조회 에러: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="서버 에러가 발생했습니다."
        )


@router.get("/search", response_model=Dict)
async def search_stocks(
    q: str = Query(..., min_length=1, description="검색어"),
    current_user: dict = Depends(get_current_user)
):
    """주식 검색"""
    try:
        results = stock_service.search_stocks(q)
        return {"data": results}
        
    except Exception as e:
        logging.error(f"주식 검색 에러: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="서버 에러가 발생했습니다."
        )


@router.get("/{symbol}", response_model=Dict)
async def get_stock_detail(
    symbol: str,
    current_user: dict = Depends(get_current_user)
):
    """특정 주식 상세 정보 조회"""
    try:
        # 캐시에서 먼저 조회
        stock_data = stock_service.get_cached_stock_data(symbol)
        if not stock_data:
            # 캐시에 없으면 실시간 조회
            stock_data = stock_service.get_stock_info(symbol)
        
        if not stock_data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="주식 정보를 찾을 수 없습니다."
            )
        
        return {"data": stock_data}
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"주식 상세 조회 에러: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="서버 에러가 발생했습니다."
        )


@router.get("/price/{symbol}", response_model=Dict)
async def get_stock_price(
    symbol: str,
    current_user: dict = Depends(get_current_user)
):
    """특정 주식 현재가 조회"""
    try:
        price = stock_service.get_cached_price(symbol)
        
        if price == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="주식 가격을 찾을 수 없습니다."
            )
        
        return {
            "data": {
                "symbol": symbol,
                "price": price
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"주식 가격 조회 에러: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="서버 에러가 발생했습니다."
        )


@router.post("/multiple", response_model=Dict)
async def get_multiple_stocks(
    request: MultipleStocksRequest,
    current_user: dict = Depends(get_current_user)
):
    """여러 주식 정보 한번에 조회"""
    try:
        stock_data = stock_service.get_multiple_stocks(request.symbols)
        return {"data": stock_data}
        
    except Exception as e:
        logging.error(f"다중 주식 조회 에러: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="서버 에러가 발생했습니다."
        )


@router.get("/korean", response_model=Dict)
async def get_korean_stocks(current_user: dict = Depends(get_current_user)):
    """한국 주식 목록 조회"""
    try:
        market_data = stock_service.get_market_summary()
        korean_stocks = market_data['korean_market']
        return {"data": korean_stocks}
        
    except Exception as e:
        logging.error(f"한국 주식 조회 에러: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="서버 에러가 발생했습니다."
        )


@router.get("/us", response_model=Dict)
async def get_us_stocks(current_user: dict = Depends(get_current_user)):
    """미국 주식 목록 조회"""
    try:
        market_data = stock_service.get_market_summary()
        us_stocks = market_data['us_market']
        return {"data": us_stocks}
        
    except Exception as e:
        logging.error(f"미국 주식 조회 에러: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="서버 에러가 발생했습니다."
        )


@router.get("/history/{symbol}", response_model=Dict)
async def get_stock_history(
    symbol: str,
    period: int = Query(30, ge=1, le=1095, description="기간(일)"),
    interval: str = Query("daily", regex="^(daily|weekly|monthly)$", description="간격"),
    current_user: dict = Depends(get_current_user)
):
    """주식 이력 데이터 조회 (차트용)"""
    try:
        history_data = stock_service.get_stock_history(symbol, period, interval)
        
        if not history_data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="주식 이력 데이터를 찾을 수 없습니다."
            )
        
        return {"data": history_data}
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"주식 이력 조회 에러: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="서버 에러가 발생했습니다."
        )


@router.get("/indices", response_model=Dict)
async def get_market_indices(current_user: dict = Depends(get_current_user)):
    """시장 지수 정보 조회"""
    try:
        indices = stock_service.get_market_indices()
        return {"data": indices}
        
    except Exception as e:
        logging.error(f"시장 지수 조회 에러: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="서버 에러가 발생했습니다."
        )
