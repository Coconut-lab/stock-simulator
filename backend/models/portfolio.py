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
    
    def get_holding(self, user_id, symbol, position_type='long'):
        """특정 종목 보유량 조회"""
        query = {
            'user_id': ObjectId(user_id),
            'symbol': symbol,
        }
        if position_type == 'long':
            # position_type 필드가 없는 기존 보유 종목도 매칭 (하위 호환)
            query['$or'] = [{'position_type': 'long'}, {'position_type': {'$exists': False}}]
        else:
            query['position_type'] = position_type
        return self.collection.find_one(query)

    def add_holding(self, user_id, symbol, quantity, avg_price, market, original_avg_price=None, position_type='long'):
        """새 보유 종목 추가"""
        holding_data = {
            'user_id': ObjectId(user_id),
            'symbol': symbol,
            'quantity': quantity,
            'avg_price': avg_price,
            'original_avg_price': original_avg_price,
            'market': market,
            'position_type': position_type,
            'created_at': datetime.utcnow(),
            'updated_at': datetime.utcnow()
        }

        result = self.collection.insert_one(holding_data)
        return str(result.inserted_id)

    def update_holding(self, user_id, symbol, new_quantity, new_avg_price, original_avg_price=None, position_type='long'):
        """보유 종목 업데이트"""
        query = {
            'user_id': ObjectId(user_id),
            'symbol': symbol,
        }
        if position_type == 'long':
            query['$or'] = [{'position_type': 'long'}, {'position_type': {'$exists': False}}]
        else:
            query['position_type'] = position_type

        if new_quantity < 0.0001:
            # 수량이 거의 0이면 삭제
            result = self.collection.delete_one(query)
            return result.deleted_count > 0
        else:
            update_fields = {
                'quantity': new_quantity,
                'avg_price': new_avg_price,
                'position_type': position_type,
                'updated_at': datetime.utcnow()
            }
            if original_avg_price is not None:
                update_fields['original_avg_price'] = original_avg_price
            result = self.collection.update_one(
                query,
                {'$set': update_fields}
            )
            return result.modified_count > 0
    
    def record_transaction(self, user_id, symbol, transaction_type, quantity, price, commission, market, name=None, original_price=None, exchange_rate=None, cost_price=None):
        """거래 기록 저장"""
        transaction_data = {
            'user_id': ObjectId(user_id),
            'symbol': symbol,
            'name': name or symbol,
            'type': transaction_type,  # 'buy' 또는 'sell'
            'quantity': quantity,
            'price': price,
            'original_price': original_price,
            'exchange_rate': exchange_rate,
            'commission': commission,
            'total_amount': quantity * price + commission,
            'market': market,
            'timestamp': datetime.utcnow()
        }
        if cost_price is not None:
            transaction_data['cost_price'] = cost_price
        
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
        """포트폴리오 총 가치 계산 (롱 포지션만)"""
        portfolio = self.get_user_portfolio(user_id)
        total_value = 0

        for holding in portfolio:
            if holding.get('position_type', 'long') != 'long':
                continue
            symbol = holding['symbol']
            quantity = holding['quantity']

            if symbol in current_prices:
                current_price = current_prices[symbol]
                holding_value = quantity * current_price
                total_value += holding_value

        return total_value

    def calculate_profit_loss(self, user_id, current_prices):
        """손익 계산 (롱 포지션만, 숏은 별도 계산)"""
        portfolio = self.get_user_portfolio(user_id)
        total_profit_loss = 0

        for holding in portfolio:
            if holding.get('position_type', 'long') != 'long':
                continue
            symbol = holding['symbol']
            quantity = holding['quantity']
            avg_price = holding['avg_price']

            if symbol in current_prices:
                current_price = current_prices[symbol]
                profit_loss = (current_price - avg_price) * quantity
                total_profit_loss += profit_loss

        return total_profit_loss

    def get_realized_pnl_and_commissions(self, user_id):
        """실현 손익 및 총 수수료 계산"""
        all_transactions = list(
            self.transactions_collection.find({'user_id': ObjectId(user_id)})
        )

        total_commission = 0
        realized_pnl = 0

        for t in all_transactions:
            total_commission += t.get('commission', 0)

            if t['type'] == 'sell' and t.get('cost_price') is not None:
                # 실현 손익 = (매도가 - 매수 평균가) * 수량 - 매도 수수료
                realized_pnl += (t['price'] - t['cost_price']) * t['quantity'] - t['commission']

        return {
            'realized_pnl': realized_pnl,
            'total_commission': total_commission,
        }
