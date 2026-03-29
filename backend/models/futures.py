from utils.db import get_collection
from bson.objectid import ObjectId
from datetime import datetime


class Futures:
    def __init__(self):
        self.contracts_collection = get_collection('futures_contracts')
        self.positions_collection = get_collection('futures_positions')

    def get_active_contracts(self):
        """활성 계약 목록 조회"""
        contracts = list(self.contracts_collection.find({'status': 'active'}).sort('expiry_date', 1))
        for c in contracts:
            c['_id'] = str(c['_id'])
        return contracts

    def get_contract(self, contract_id):
        """계약 상세 조회"""
        contract = self.contracts_collection.find_one({'_id': ObjectId(contract_id)})
        if contract:
            contract['_id'] = str(contract['_id'])
        return contract

    def create_contract(self, contract_data):
        """새 계약 생성"""
        contract_data['created_at'] = datetime.utcnow()
        contract_data['status'] = 'active'
        result = self.contracts_collection.insert_one(contract_data)
        return str(result.inserted_id)

    def get_user_positions(self, user_id, status='open'):
        """사용자 포지션 조회"""
        query = {'user_id': ObjectId(user_id)}
        if status:
            query['status'] = status
        positions = list(self.positions_collection.find(query).sort('opened_at', -1))
        for p in positions:
            p['_id'] = str(p['_id'])
            p['user_id'] = str(p['user_id'])
            p['contract_id'] = str(p['contract_id'])
        return positions

    def open_position(self, user_id, contract_id, direction, quantity, entry_price, margin):
        """포지션 오픈"""
        position_data = {
            'user_id': ObjectId(user_id),
            'contract_id': ObjectId(contract_id),
            'direction': direction,  # 'long' or 'short'
            'quantity': quantity,
            'entry_price': entry_price,
            'margin': margin,
            'unrealized_pnl': 0,
            'status': 'open',
            'opened_at': datetime.utcnow(),
        }
        result = self.positions_collection.insert_one(position_data)
        return str(result.inserted_id)

    def close_position(self, position_id, exit_price, realized_pnl):
        """포지션 청산"""
        result = self.positions_collection.update_one(
            {'_id': ObjectId(position_id)},
            {'$set': {
                'status': 'closed',
                'exit_price': exit_price,
                'realized_pnl': realized_pnl,
                'closed_at': datetime.utcnow(),
            }}
        )
        return result.modified_count > 0

    def get_position(self, position_id):
        """포지션 상세 조회"""
        position = self.positions_collection.find_one({'_id': ObjectId(position_id)})
        if position:
            position['_id'] = str(position['_id'])
            position['user_id'] = str(position['user_id'])
            position['contract_id'] = str(position['contract_id'])
        return position

    def get_closed_positions(self, user_id, limit=50):
        """청산된 포지션 내역"""
        positions = list(
            self.positions_collection.find({
                'user_id': ObjectId(user_id),
                'status': 'closed'
            }).sort('closed_at', -1).limit(limit)
        )
        for p in positions:
            p['_id'] = str(p['_id'])
            p['user_id'] = str(p['user_id'])
            p['contract_id'] = str(p['contract_id'])
        return positions
