"""
Portfolio Routes for FastAPI
"""
from fastapi import APIRouter, HTTPException, status, Depends, Query
from services.stock_service import stock_service
from dependencies.auth import get_current_user
from models.portfolio import Portfolio
from models.user import User
from config import Config
from schemas import (
    BuyStockRequest,
    SellStockRequest,
    BuyResponse,
    SellResponse,
    PortfolioData,
    PortfolioSummary,
    MaxBuyInfo
)
from typing import Dict, List
import logging

router = APIRouter()


def calculate_commission(amount: float, market: str) -> float:
    """거래 수수료 계산"""
    commission_rate = Config.COMMISSION_RATE.get(market, 0.001)
    commission = amount * commission_rate
    
    # 최소 수수료 적용
    if market == 'USD':
        min_commission = 1350  # 대략 1달러의 원화 환산
    else:
        min_commission = 1000
    
    return max(commission, min_commission)


@router.get("/", response_model=Dict)
async def get_portfolio(current_user: dict = Depends(get_current_user)):
    """사용자 포트폴리오 조회"""
    try:
        user_id = current_user['user_id']
        portfolio_model = Portfolio()
        
        # 포트폴리오 조회
        holdings = portfolio_model.get_user_portfolio(user_id)
        
        # 현재 가격 정보 추가
        portfolio_with_prices = []
        current_prices = {}
        
        for holding in holdings:
            symbol = holding['symbol']
            
            # 상세 주식 정보 조회
            stock_data = stock_service.get_cached_stock_data(symbol)
            if not stock_data:
                stock_data = stock_service.get_stock_info(symbol)
            
            if stock_data:
                current_price = stock_data['current_price']
                
                # 미국 주식인 경우 환율 적용하여 원화로 변환
                if stock_data.get('currency') == 'USD' and stock_data.get('exchange_rate'):
                    current_price_krw = current_price * stock_data['exchange_rate']
                else:
                    current_price_krw = current_price
                
                current_prices[symbol] = current_price_krw
                
                holding_value = holding['quantity'] * current_price_krw
                profit_loss = (current_price_krw - holding['avg_price']) * holding['quantity']
                profit_loss_percent = (profit_loss / (holding['avg_price'] * holding['quantity'])) * 100 if holding['avg_price'] > 0 else 0
                
                portfolio_item = {
                    'symbol': symbol,
                    'name': stock_data.get('name', symbol),
                    'quantity': holding['quantity'],
                    'purchase_price': holding['avg_price'],
                    'current_price': current_price_krw,
                    'original_price': current_price if stock_data.get('currency') == 'USD' else None,
                    'holding_value': holding_value,
                    'profit_loss': profit_loss,
                    'profit_loss_percent': profit_loss_percent,
                    'market': holding['market'],
                    'currency': stock_data.get('currency', 'KRW'),
                    'exchange_rate': stock_data.get('exchange_rate') if stock_data.get('currency') == 'USD' else None
                }
                
                portfolio_with_prices.append(portfolio_item)
        
        # 포트폴리오 총 가치 계산
        total_value = portfolio_model.calculate_portfolio_value(user_id, current_prices)
        total_profit_loss = portfolio_model.calculate_profit_loss(user_id, current_prices)
        
        return {
            "data": {
                "holdings": portfolio_with_prices,
                "total_value": total_value,
                "total_profit_loss": total_profit_loss,
                "cash": current_user['balance']
            }
        }
        
    except Exception as e:
        logging.error(f"포트폴리오 조회 에러: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="서버 에러가 발생했습니다."
        )


@router.post("/buy", response_model=BuyResponse)
async def buy_stock(
    request: BuyStockRequest,
    current_user: dict = Depends(get_current_user)
):
    """주식 매수"""
    try:
        user_id = current_user['user_id']
        
        # 현재 주식 가격 조회
        stock_data = stock_service.get_cached_stock_data(request.symbol)
        if not stock_data:
            stock_data = stock_service.get_stock_info(request.symbol)
        
        if not stock_data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="주식 정보를 찾을 수 없습니다."
            )
        
        current_price = stock_data['current_price']
        market = stock_data.get('currency', 'KRW')
        
        # 미국 주식인 경우 환율 적용
        if market == 'USD' and stock_data.get('exchange_rate'):
            current_price_krw = current_price * stock_data['exchange_rate']
        else:
            current_price_krw = current_price
        
        # 총 거래 금액 계산
        total_amount = request.quantity * current_price_krw
        commission = calculate_commission(total_amount, market)
        
        # 정수로 변환
        total_amount = int(round(total_amount))
        commission = int(round(commission))
        total_cost = total_amount + commission
        
        # 잔액 확인
        if current_user['balance'] < total_cost:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="잔액이 부족합니다."
            )
        
        # 거래 실행
        portfolio_model = Portfolio()
        user_model = User()
        
        # 기존 보유 종목 확인
        existing_holding = portfolio_model.get_holding(user_id, request.symbol)
        
        if existing_holding:
            # 평균 단가 재계산
            total_quantity = existing_holding['quantity'] + request.quantity
            total_value = (existing_holding['quantity'] * existing_holding['avg_price']) + total_amount
            new_avg_price = total_value / total_quantity
            
            portfolio_model.update_holding(user_id, request.symbol, total_quantity, new_avg_price)
        else:
            # 새로운 종목 추가
            portfolio_model.add_holding(user_id, request.symbol, request.quantity, current_price_krw, market)
        
        # 거래 기록 저장
        portfolio_model.record_transaction(
            user_id, request.symbol, 'buy', request.quantity, current_price_krw, commission, market
        )
        
        # 잔액 업데이트
        new_balance = int(round(current_user['balance'] - total_cost))
        user_model.update_balance(user_id, new_balance)
        
        return {
            "message": "매수가 완료되었습니다.",
            "data": {
                "symbol": request.symbol,
                "quantity": request.quantity,
                "price": current_price_krw,
                "total_amount": total_amount,
                "commission": commission,
                "total_cost": total_cost,
                "remaining_balance": new_balance
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"매수 에러: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="서버 에러가 발생했습니다."
        )


@router.post("/sell", response_model=SellResponse)
async def sell_stock(
    request: SellStockRequest,
    current_user: dict = Depends(get_current_user)
):
    """주식 매도"""
    try:
        user_id = current_user['user_id']
        
        # 보유 종목 확인
        portfolio_model = Portfolio()
        holding = portfolio_model.get_holding(user_id, request.symbol)
        
        if not holding:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="보유하지 않은 종목입니다."
            )
        
        if holding['quantity'] < request.quantity:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="보유 수량이 부족합니다."
            )
        
        # 현재 주식 가격 조회
        stock_data = stock_service.get_cached_stock_data(request.symbol)
        if not stock_data:
            stock_data = stock_service.get_stock_info(request.symbol)
        
        if not stock_data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="주식 정보를 찾을 수 없습니다."
            )
        
        current_price = stock_data['current_price']
        market = holding['market']
        
        # 미국 주식인 경우 환율 적용
        if market == 'USD' and stock_data.get('exchange_rate'):
            current_price_krw = current_price * stock_data['exchange_rate']
        else:
            current_price_krw = current_price
        
        # 총 거래 금액 계산
        total_amount = request.quantity * current_price_krw
        commission = calculate_commission(total_amount, market)
        
        # 정수로 변환
        total_amount = int(round(total_amount))
        commission = int(round(commission))
        net_amount = total_amount - commission
        
        # 거래 실행
        user_model = User()
        
        # 보유 수량 업데이트
        new_quantity = holding['quantity'] - request.quantity
        portfolio_model.update_holding(user_id, request.symbol, new_quantity, holding['avg_price'])
        
        # 거래 기록 저장
        portfolio_model.record_transaction(
            user_id, request.symbol, 'sell', request.quantity, current_price_krw, commission, market
        )
        
        # 잔액 업데이트
        new_balance = int(round(current_user['balance'] + net_amount))
        user_model.update_balance(user_id, new_balance)
        
        # 손익 계산
        profit_loss = (current_price_krw - holding['avg_price']) * request.quantity
        
        return {
            "message": "매도가 완료되었습니다.",
            "data": {
                "symbol": request.symbol,
                "quantity": request.quantity,
                "price": current_price_krw,
                "total_amount": total_amount,
                "commission": commission,
                "net_amount": net_amount,
                "profit_loss": profit_loss,
                "remaining_balance": new_balance
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"매도 에러: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="서버 에러가 발생했습니다."
        )


@router.get("/transactions", response_model=Dict)
async def get_transactions(
    limit: int = Query(50, ge=1, le=200),
    current_user: dict = Depends(get_current_user)
):
    """거래 이력 조회"""
    try:
        user_id = current_user['user_id']
        
        portfolio_model = Portfolio()
        transactions = portfolio_model.get_user_transactions(user_id, limit)
        
        # ObjectId를 문자열로 변환
        for transaction in transactions:
            transaction['_id'] = str(transaction['_id'])
            transaction['user_id'] = str(transaction['user_id'])
        
        return {"data": transactions}
        
    except Exception as e:
        logging.error(f"거래 이력 조회 에러: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="서버 에러가 발생했습니다."
        )


@router.get("/max-buy/{symbol}", response_model=Dict)
async def calculate_max_buy(
    symbol: str,
    current_user: dict = Depends(get_current_user)
):
    """전량매수 가능 수량 및 금액 계산"""
    try:
        # 현재 주식 가격 조회
        stock_data = stock_service.get_cached_stock_data(symbol)
        if not stock_data:
            stock_data = stock_service.get_stock_info(symbol)
        
        if not stock_data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="주식 정보를 찾을 수 없습니다."
            )
        
        current_price = stock_data['current_price']
        market = stock_data.get('currency', 'KRW')
        
        # 미국 주식인 경우 환율 적용
        if market == 'USD' and stock_data.get('exchange_rate'):
            current_price_krw = current_price * stock_data['exchange_rate']
        else:
            current_price_krw = current_price
        
        # 사용자 보유 자금
        available_cash = current_user['balance']
        
        # 예상 수수료 율 계산
        commission_rate = Config.COMMISSION_RATE.get(market, 0.001)
        
        # 최소 수수료
        if market == 'USD':
            min_commission = 1350
        else:
            min_commission = 1000
        
        # 전량매수 가능 수량 계산
        max_quantity = int((available_cash - min_commission) / (current_price_krw * (1 + commission_rate)))
        
        if max_quantity <= 0:
            return {
                "data": {
                    "max_quantity": 0,
                    "estimated_amount": 0,
                    "estimated_commission": 0,
                    "total_cost": 0,
                    "current_price": current_price_krw,
                    "available_cash": available_cash,
                    "message": "전량매수 가능한 자금이 부족합니다."
                }
            }
        
        # 실제 거래 금액 및 수수료 계산
        estimated_amount = max_quantity * current_price_krw
        estimated_commission = calculate_commission(estimated_amount, market)
        total_cost = estimated_amount + estimated_commission
        
        # 정수로 변환
        estimated_amount = int(round(estimated_amount))
        estimated_commission = int(round(estimated_commission))
        total_cost = int(round(total_cost))
        
        # 잔액 부족 시 수량 감소
        while total_cost > available_cash and max_quantity > 0:
            max_quantity -= 1
            estimated_amount = max_quantity * current_price_krw
            estimated_commission = calculate_commission(estimated_amount, market)
            total_cost = estimated_amount + estimated_commission
            
            estimated_amount = int(round(estimated_amount))
            estimated_commission = int(round(estimated_commission))
            total_cost = int(round(total_cost))
        
        return {
            "data": {
                "max_quantity": max_quantity,
                "estimated_amount": estimated_amount,
                "estimated_commission": estimated_commission,
                "total_cost": total_cost,
                "current_price": current_price_krw,
                "original_price": current_price if market == 'USD' else None,
                "available_cash": available_cash,
                "remaining_cash": available_cash - total_cost
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"전량매수 계산 에러: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="서버 에러가 발생했습니다."
        )


@router.get("/summary", response_model=Dict)
async def get_portfolio_summary(current_user: dict = Depends(get_current_user)):
    """포트폴리오 요약 정보"""
    try:
        user_id = current_user['user_id']
        portfolio_model = Portfolio()
        
        # 포트폴리오 조회
        holdings = portfolio_model.get_user_portfolio(user_id)
        
        # 현재 가격 정보로 계산
        current_prices = {}
        for holding in holdings:
            symbol = holding['symbol']
            
            stock_data = stock_service.get_cached_stock_data(symbol)
            if not stock_data:
                stock_data = stock_service.get_stock_info(symbol)
            
            if stock_data:
                current_price = stock_data['current_price']
                
                # 미국 주식인 경우 환율 적용
                if stock_data.get('currency') == 'USD' and stock_data.get('exchange_rate'):
                    current_price_krw = current_price * stock_data['exchange_rate']
                else:
                    current_price_krw = current_price
                
                current_prices[symbol] = current_price_krw
        
        total_value = portfolio_model.calculate_portfolio_value(user_id, current_prices)
        total_profit_loss = portfolio_model.calculate_profit_loss(user_id, current_prices)
        
        # 투자 원금 계산
        total_investment = sum(holding['avg_price'] * holding['quantity'] for holding in holdings)
        
        # 수익률 계산
        return_rate = (total_profit_loss / total_investment * 100) if total_investment > 0 else 0
        
        return {
            "data": {
                "total_value": total_value,
                "total_investment": total_investment,
                "total_profit_loss": total_profit_loss,
                "return_rate": return_rate,
                "cash_balance": current_user['balance'],
                "total_assets": total_value + current_user['balance'],
                "holdings_count": len(holdings)
            }
        }
        
    except Exception as e:
        logging.error(f"포트폴리오 요약 조회 에러: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="서버 에러가 발생했습니다."
        )
