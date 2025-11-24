from utils.db import db
from datetime import datetime

class MarketHours(db.Model):
    """시장 운영 시간 모델"""
    __tablename__ = 'market_hours'
    
    market = db.Column(db.String(20), primary_key=True)
    open_time = db.Column(db.Time, nullable=False)
    close_time = db.Column(db.Time, nullable=False)
    timezone = db.Column(db.String(50), nullable=False)
    trading_days = db.Column(db.String(20), default='MON-FRI')


class Stock(db.Model):
    """주식 정보 모델 (기준 테이블)"""
    __tablename__ = 'stocks'
    
    stock_id = db.Column(db.BigInteger, primary_key=True, autoincrement=True)
    symbol = db.Column(db.String(20), unique=True, nullable=False)
    name = db.Column(db.String(100))
    current_price = db.Column(db.Numeric(15, 4), nullable=False)
    previous_close = db.Column(db.Numeric(15, 4))
    open_price = db.Column(db.Numeric(15, 4))
    high_price = db.Column(db.Numeric(15, 4))
    low_price = db.Column(db.Numeric(15, 4))
    volume = db.Column(db.BigInteger, default=0)
    change_amount = db.Column(db.Numeric(15, 4))
    change_percent = db.Column(db.Numeric(8, 4))
    market = db.Column(db.String(10), default='KRW')
    currency = db.Column(db.String(10), default='KRW')
    exchange_rate = db.Column(db.Numeric(10, 4), default=1.0)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    __table_args__ = (
        db.Index('idx_stocks_symbol', 'symbol'),
        db.Index('idx_stocks_updated_at', 'updated_at'),
    )
    
    def to_dict(self):
        return {
            'stock_id': self.stock_id,
            'symbol': self.symbol,
            'name': self.name,
            'current_price': float(self.current_price) if self.current_price else 0,
            'previous_close': float(self.previous_close) if self.previous_close else 0,
            'open_price': float(self.open_price) if self.open_price else 0,
            'high_price': float(self.high_price) if self.high_price else 0,
            'low_price': float(self.low_price) if self.low_price else 0,
            'volume': self.volume or 0,
            'change': float(self.change_amount) if self.change_amount else 0,
            'change_percent': float(self.change_percent) if self.change_percent else 0,
            'market': self.market,
            'currency': self.currency,
            'exchange_rate': float(self.exchange_rate) if self.exchange_rate else 1.0,
            'updated_at': self.updated_at
        }
    
    @classmethod
    def get_or_create(cls, symbol, data=None):
        """종목 조회 또는 생성"""
        stock = cls.query.filter_by(symbol=symbol).first()
        
        if not stock:
            # 새로운 종목 생성
            stock = cls(
                symbol=symbol,
                name=data.get('name', symbol) if data else symbol,
                current_price=data.get('current_price', 0) if data else 0,
                previous_close=data.get('previous_close') if data else None,
                open_price=data.get('open_price') if data else None,
                high_price=data.get('high_price') if data else None,
                low_price=data.get('low_price') if data else None,
                volume=data.get('volume', 0) if data else 0,
                change_amount=data.get('change') if data else None,
                change_percent=data.get('change_percent') if data else None,
                market=data.get('market', 'KRW') if data else 'KRW',
                currency=data.get('currency', 'KRW') if data else 'KRW',
                exchange_rate=data.get('exchange_rate', 1.0) if data else 1.0
            )
            db.session.add(stock)
            db.session.commit()
        
        return stock
    
    @classmethod
    def upsert(cls, symbol, data):
        """종목 정보 업데이트 또는 생성"""
        stock = cls.query.filter_by(symbol=symbol).first()
        
        if stock:
            # 업데이트
            stock.name = data.get('name', stock.name)
            stock.current_price = data.get('current_price', stock.current_price)
            stock.previous_close = data.get('previous_close', stock.previous_close)
            stock.open_price = data.get('open_price', stock.open_price)
            stock.high_price = data.get('high_price', stock.high_price)
            stock.low_price = data.get('low_price', stock.low_price)
            stock.volume = data.get('volume', stock.volume)
            stock.change_amount = data.get('change', stock.change_amount)
            stock.change_percent = data.get('change_percent', stock.change_percent)
            stock.market = data.get('market', stock.market)
            stock.currency = data.get('currency', stock.currency)
            stock.exchange_rate = data.get('exchange_rate', stock.exchange_rate)
            stock.updated_at = datetime.utcnow()
        else:
            # 생성
            stock = cls(
                symbol=symbol,
                name=data.get('name', symbol),
                current_price=data.get('current_price', 0),
                previous_close=data.get('previous_close'),
                open_price=data.get('open_price'),
                high_price=data.get('high_price'),
                low_price=data.get('low_price'),
                volume=data.get('volume', 0),
                change_amount=data.get('change'),
                change_percent=data.get('change_percent'),
                market=data.get('market', 'KRW'),
                currency=data.get('currency', 'KRW'),
                exchange_rate=data.get('exchange_rate', 1.0)
            )
            db.session.add(stock)
        
        db.session.commit()
        return stock


# 하위 호환성을 위한 별칭
StockCache = Stock
