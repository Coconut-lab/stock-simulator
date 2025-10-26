"""
Pydantic schemas for request/response validation
"""
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime


# Auth Schemas
class UserRegister(BaseModel):
    username: str = Field(..., min_length=2, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=6)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    user_id: str
    username: str
    email: str
    balance: float
    created_at: datetime
    updated_at: datetime


class TokenResponse(BaseModel):
    token: str
    user: UserResponse


class AuthResponse(BaseModel):
    message: str
    data: TokenResponse


# Stock Schemas
class StockInfo(BaseModel):
    symbol: str
    name: str
    current_price: float
    previous_close: float
    open_price: float
    high_price: float
    low_price: float
    volume: int
    change: float
    change_percent: float
    market: str
    currency: str
    exchange_rate: Optional[float] = None
    updated_at: datetime


class StockSearchResult(BaseModel):
    data: List[StockInfo]


class MultipleStocksRequest(BaseModel):
    symbols: List[str] = Field(..., min_length=1, max_length=50)


# Portfolio Schemas
class BuyStockRequest(BaseModel):
    symbol: str
    quantity: int = Field(..., gt=0)


class SellStockRequest(BaseModel):
    symbol: str
    quantity: int = Field(..., gt=0)


class HoldingInfo(BaseModel):
    symbol: str
    name: str
    quantity: int
    purchase_price: float
    current_price: float
    original_price: Optional[float] = None
    holding_value: float
    profit_loss: float
    profit_loss_percent: float
    market: str
    currency: str
    exchange_rate: Optional[float] = None


class PortfolioData(BaseModel):
    holdings: List[HoldingInfo]
    total_value: float
    total_profit_loss: float
    cash: float


class TransactionInfo(BaseModel):
    symbol: str
    type: str
    quantity: int
    price: float
    commission: float
    total_amount: float
    market: str
    timestamp: datetime


class BuyResponse(BaseModel):
    message: str
    data: dict


class SellResponse(BaseModel):
    message: str
    data: dict


class MaxBuyInfo(BaseModel):
    max_quantity: int
    estimated_amount: float
    estimated_commission: float
    total_cost: float
    current_price: float
    original_price: Optional[float] = None
    available_cash: float
    remaining_cash: Optional[float] = None
    message: Optional[str] = None


class PortfolioSummary(BaseModel):
    total_value: float
    total_investment: float
    total_profit_loss: float
    return_rate: float
    cash_balance: float
    total_assets: float
    holdings_count: int


# Market Schemas
class MarketIndex(BaseModel):
    name: str
    symbol: str
    value: float
    change: float
    change_percent: float


class MarketSummary(BaseModel):
    korean_market: List[StockInfo]
    us_market: List[StockInfo]
    market_indices: List[MarketIndex]
    exchange_rate: float
    updated_at: datetime


# History Schemas
class StockHistoryPoint(BaseModel):
    date: str
    open: float
    high: float
    low: float
    close: float
    volume: int


# Generic Response Schemas
class MessageResponse(BaseModel):
    message: str


class ErrorResponse(BaseModel):
    error: str


class HealthResponse(BaseModel):
    status: str
    services: Optional[dict] = None
    timestamp: datetime
