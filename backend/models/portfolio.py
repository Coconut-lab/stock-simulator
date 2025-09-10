from utils.db import get_collection
from bson.objectid import ObjectId
from datetime import datetime
from config import Config

class Portfolio:
    def __init__(self):
        self.collection = get_collection('portfolios')
        self.transactions_collection = get_collection('transactions')
    
    def get_user_portfolio(self, user_id):
        """사용자 포트폴리오 조회"""
        portfolio = list(self.collection.find({'user_id': ObjectId(user_id)}))
        return portfolio
    
    def get_holding(self, user_id, symbol):
        """특정 종목 보유량 조회"""
        holding = self.collection.find_one({
            'user_id': ObjectId(user_id),
            'symbol': symbol
        })
        return holding
    
    def add_holding(self, user_id, symbol, quantity, avg_price, market):
        """새 보유 종목 추가"""
        holding_data = {
            'user_id': ObjectId(user_id),
            'symbol': symbol,
            'quantity': quantity,
            'avg_price': avg_price,
            'market': market,  # 'KRW' 또는 'USD'
            'created_at': datetime.utcnow(),
            'updated_at': datetime.utcnow()
        }
        
        result = self.collection.insert_one(holding_data)
        return str(result.inserted_id)
    
    def update_holding(self, user_id, symbol, new_quantity, new_avg_price):
        """보유 종목 업데이트"""
        if new_quantity <= 0:
            # 수량이 0 이하면 삭제
            result = self.collection.delete_one({
                'user_id': ObjectId(user_id),
                'symbol': symbol
            })
            return result.deleted_count > 0
        else:
            # 수량과 평균 단가 업데이트
            result = self.collection.update_one(
                {
                    'user_id': ObjectId(user_id),
                    'symbol': symbol
                },
                {
                    '$set': {
                        'quantity': new_quantity,
                        'avg_price': new_avg_price,
                        'updated_at': datetime.utcnow()
                    }
                }
            )
            return result.modified_count > 0
    
    def record_transaction(self, user_id, symbol, transaction_type, quantity, price, commission, market):
        """거래 기록 저장"""
        transaction_data = {
            'user_id': ObjectId(user_id),
            'symbol': symbol,
            'type': transaction_type,  # 'buy' 또는 'sell'
            'quantity': quantity,
            'price': price,
            'commission': commission,
            'total_amount': quantity * price + commission,
            'market': market,
            'timestamp': datetime.utcnow()
        }
        
        result = self.transactions_collection.insert_one(transaction_data)
        return str(result.inserted_id)
    
    def get_user_transactions(self, user_id, limit=50):
        """사용자 거래 이력 조회"""
        transactions = list(
            self.transactions_collection.find({'user_id': ObjectId(user_id)})
            .sort('timestamp', -1)
            .limit(limit)
        )
        return transactions
    
    def calculate_portfolio_value(self, user_id, current_prices):
        """포트폴리오 총 가치 계산"""
        portfolio = self.get_user_portfolio(user_id)
        total_value = 0
        
        for holding in portfolio:
            symbol = holding['symbol']
            quantity = holding['quantity']
            
            if symbol in current_prices:
                current_price = current_prices[symbol]
                holding_value = quantity * current_price
                total_value += holding_value
        
        return total_value
    
    def calculate_profit_loss(self, user_id, current_prices):
        """손익 계산"""
        portfolio = self.get_user_portfolio(user_id)
        total_profit_loss = 0
        
        for holding in portfolio:
            symbol = holding['symbol']
            quantity = holding['quantity']
            avg_price = holding['avg_price']
            
            if symbol in current_prices:
                current_price = current_prices[symbol]
                profit_loss = (current_price - avg_price) * quantity
                total_profit_loss += profit_loss
        
        return total_profit_loss
