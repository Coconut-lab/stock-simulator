from utils.db import db
from datetime import datetime

class PortfolioItem(db.Model):
    """포트폴리오 아이템 모델"""
    __tablename__ = 'portfolios'
    
    portfolio_id = db.Column(db.BigInteger, primary_key=True, autoincrement=True)
    user_id = db.Column(db.BigInteger, db.ForeignKey('users.user_id', ondelete='CASCADE'), nullable=False)
    stock_id = db.Column(db.BigInteger, db.ForeignKey('stocks.stock_id', ondelete='RESTRICT'), nullable=False)
    quantity = db.Column(db.Integer, nullable=False, default=0)
    avg_price = db.Column(db.Numeric(15, 4), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    stock = db.relationship('Stock', backref='portfolios', lazy=True)
    
    __table_args__ = (
        db.UniqueConstraint('user_id', 'stock_id', name='uk_user_stock'),
        db.Index('idx_portfolio_user_id', 'user_id'),
        db.Index('idx_portfolio_stock_id', 'stock_id'),
    )
    
    def to_dict(self):
        return {
            'portfolio_id': self.portfolio_id,
            'user_id': self.user_id,
            'stock_id': self.stock_id,
            'symbol': self.stock.symbol if self.stock else None,
            'name': self.stock.name if self.stock else None,
            'quantity': self.quantity,
            'avg_price': float(self.avg_price) if self.avg_price else 0,
            'market': self.stock.market if self.stock else 'KRW',
            'created_at': self.created_at,
            'updated_at': self.updated_at
        }


class Transaction(db.Model):
    """거래 내역 모델"""
    __tablename__ = 'transactions'
    
    transaction_id = db.Column(db.BigInteger, primary_key=True, autoincrement=True)
    user_id = db.Column(db.BigInteger, db.ForeignKey('users.user_id', ondelete='CASCADE'), nullable=False)
    stock_id = db.Column(db.BigInteger, db.ForeignKey('stocks.stock_id', ondelete='RESTRICT'), nullable=False)
    type = db.Column(db.Enum('BUY', 'SELL', name='transaction_type'), nullable=False)
    quantity = db.Column(db.Integer, nullable=False)
    price = db.Column(db.Numeric(15, 4), nullable=False)
    commission = db.Column(db.Numeric(10, 2), default=0.00)
    total_amount = db.Column(db.Numeric(15, 2), nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    stock = db.relationship('Stock', backref='transactions', lazy=True)
    
    __table_args__ = (
        db.Index('idx_transaction_user_id', 'user_id'),
        db.Index('idx_transaction_stock_id', 'stock_id'),
        db.Index('idx_transaction_timestamp', 'timestamp'),
    )
    
    def to_dict(self):
        return {
            'transaction_id': self.transaction_id,
            'user_id': self.user_id,
            'stock_id': self.stock_id,
            'symbol': self.stock.symbol if self.stock else None,
            'name': self.stock.name if self.stock else None,
            'type': self.type,
            'quantity': self.quantity,
            'price': float(self.price) if self.price else 0,
            'commission': float(self.commission) if self.commission else 0,
            'total_amount': float(self.total_amount) if self.total_amount else 0,
            'market': self.stock.market if self.stock else 'KRW',
            'timestamp': self.timestamp
        }


class Portfolio:
    """포트폴리오 관리 클래스 (기존 인터페이스 유지)"""
    
    @staticmethod
    def get_user_portfolio(user_id):
        """사용자 포트폴리오 조회"""
        items = PortfolioItem.query.filter_by(user_id=user_id).filter(PortfolioItem.quantity > 0).all()
        return [item.to_dict() for item in items]
    
    @staticmethod
    def get_portfolio_items(user_id):
        """사용자 포트폴리오 조회 (별칭)"""
        return Portfolio.get_user_portfolio(user_id)
    
    @staticmethod
    def get_holding(user_id, symbol):
        """특정 종목 보유 정보 조회"""
        from models.stock import Stock
        
        stock = Stock.query.filter_by(symbol=symbol).first()
        if not stock:
            return None
        
        item = PortfolioItem.query.filter_by(user_id=user_id, stock_id=stock.stock_id).first()
        return item.to_dict() if item else None
    
    @staticmethod
    def get_portfolio_item(user_id, symbol):
        """특정 종목 포트폴리오 조회 (별칭)"""
        return Portfolio.get_holding(user_id, symbol)
    
    @staticmethod
    def add_holding(user_id, symbol, quantity, avg_price, market='KRW'):
        """새 종목 추가"""
        from models.stock import Stock
        
        # 종목 조회 또는 생성
        stock = Stock.query.filter_by(symbol=symbol).first()
        if not stock:
            stock = Stock.get_or_create(symbol, {'market': market, 'currency': market, 'current_price': avg_price})
        
        item = PortfolioItem(
            user_id=user_id,
            stock_id=stock.stock_id,
            quantity=quantity,
            avg_price=avg_price
        )
        db.session.add(item)
        db.session.commit()
        
        return item.to_dict()
    
    @staticmethod
    def update_holding(user_id, symbol, quantity, avg_price):
        """보유 종목 업데이트"""
        from models.stock import Stock
        
        stock = Stock.query.filter_by(symbol=symbol).first()
        if not stock:
            return None
        
        item = PortfolioItem.query.filter_by(user_id=user_id, stock_id=stock.stock_id).first()
        
        if item:
            if quantity > 0:
                item.quantity = quantity
                item.avg_price = avg_price
                item.updated_at = datetime.utcnow()
            else:
                # 수량이 0이면 삭제
                db.session.delete(item)
            
            db.session.commit()
            return item.to_dict() if quantity > 0 else None
        
        return None
    
    @staticmethod
    def add_or_update_item(user_id, symbol, quantity, avg_price):
        """포트폴리오 아이템 추가 또는 업데이트"""
        from models.stock import Stock
        
        # 종목 조회 또는 생성
        stock = Stock.query.filter_by(symbol=symbol).first()
        if not stock:
            stock = Stock.get_or_create(symbol)
        
        item = PortfolioItem.query.filter_by(user_id=user_id, stock_id=stock.stock_id).first()
        
        if item:
            # 기존 아이템 업데이트
            total_quantity = item.quantity + quantity
            if total_quantity > 0:
                item.avg_price = (item.avg_price * item.quantity + avg_price * quantity) / total_quantity
                item.quantity = total_quantity
                item.updated_at = datetime.utcnow()
            else:
                # 수량이 0이 되면 삭제
                db.session.delete(item)
        else:
            # 새 아이템 생성
            item = PortfolioItem(
                user_id=user_id,
                stock_id=stock.stock_id,
                quantity=quantity,
                avg_price=avg_price
            )
            db.session.add(item)
        
        db.session.commit()
        return item.to_dict() if item in db.session else None
    
    @staticmethod
    def remove_item(user_id, symbol):
        """포트폴리오 아이템 제거"""
        from models.stock import Stock
        
        stock = Stock.query.filter_by(symbol=symbol).first()
        if not stock:
            return False
        
        item = PortfolioItem.query.filter_by(user_id=user_id, stock_id=stock.stock_id).first()
        if item:
            db.session.delete(item)
            db.session.commit()
            return True
        return False
    
    @staticmethod
    def record_transaction(user_id, symbol, transaction_type, quantity, price, commission, market='KRW'):
        """거래 내역 추가"""
        from models.stock import Stock
        
        # 종목 조회 또는 생성
        stock = Stock.query.filter_by(symbol=symbol).first()
        if not stock:
            stock = Stock.get_or_create(symbol, {'market': market, 'currency': market, 'current_price': price})
        
        # 총 거래금액 계산
        total_amount = (quantity * price) - commission if transaction_type.upper() == 'SELL' else (quantity * price) + commission
        
        transaction = Transaction(
            user_id=user_id,
            stock_id=stock.stock_id,
            type=transaction_type.upper(),
            quantity=quantity,
            price=price,
            commission=commission,
            total_amount=total_amount
        )
        
        db.session.add(transaction)
        db.session.commit()
        
        return transaction.to_dict()
    
    @staticmethod
    def add_transaction(user_id, symbol, transaction_type, quantity, price, commission, total_amount):
        """거래 내역 추가 (별칭)"""
        return Portfolio.record_transaction(user_id, symbol, transaction_type, quantity, price, commission)
    
    @staticmethod
    def get_user_transactions(user_id, limit=50):
        """거래 내역 조회"""
        transactions = Transaction.query.filter_by(user_id=user_id)\
            .order_by(Transaction.timestamp.desc())\
            .limit(limit)\
            .all()
        
        return [t.to_dict() for t in transactions]
    
    @staticmethod
    def get_transactions(user_id, limit=50):
        """거래 내역 조회 (별칭)"""
        return Portfolio.get_user_transactions(user_id, limit)
    
    @staticmethod
    def get_transaction_by_symbol(user_id, symbol):
        """특정 종목의 거래 내역 조회"""
        from models.stock import Stock
        
        stock = Stock.query.filter_by(symbol=symbol).first()
        if not stock:
            return []
        
        transactions = Transaction.query.filter_by(user_id=user_id, stock_id=stock.stock_id)\
            .order_by(Transaction.timestamp.desc())\
            .all()
        
        return [t.to_dict() for t in transactions]
    
    @staticmethod
    def calculate_portfolio_value(user_id, current_prices):
        """포트폴리오 총 가치 계산"""
        items = PortfolioItem.query.filter_by(user_id=user_id).filter(PortfolioItem.quantity > 0).all()
        
        total_value = 0
        for item in items:
            symbol = item.stock.symbol if item.stock else None
            if symbol and symbol in current_prices:
                total_value += item.quantity * current_prices[symbol]
        
        return total_value
    
    @staticmethod
    def calculate_profit_loss(user_id, current_prices):
        """포트폴리오 총 손익 계산"""
        items = PortfolioItem.query.filter_by(user_id=user_id).filter(PortfolioItem.quantity > 0).all()
        
        total_profit_loss = 0
        for item in items:
            symbol = item.stock.symbol if item.stock else None
            if symbol and symbol in current_prices:
                profit_loss = (current_prices[symbol] - float(item.avg_price)) * item.quantity
                total_profit_loss += profit_loss
        
        return total_profit_loss
