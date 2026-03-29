from utils.db import get_collection
from bson.objectid import ObjectId
from datetime import datetime


class Options:
    def __init__(self):
        self.contracts_collection = get_collection('options_contracts')
        self.positions_collection = get_collection('options_positions')

    def get_option_chain(self, underlying):
        """옵션 체인 조회"""
        contracts = list(
            self.contracts_collection.find({
                'underlying': underlying,
                'status': 'active'
            }).sort([('expiry_date', 1), ('strike_price', 1)])
        )
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
        """새 옵션 계약 생성"""
        contract_data['created_at'] = datetime.utcnow()
        contract_data['status'] = 'active'
        result = self.contracts_collection.insert_one(contract_data)
        return str(result.inserted_id)

    def upsert_contract(self, underlying, option_type, strike_price, expiry_date, data):
        """옵션 계약 생성 또는 업데이트"""
        query = {
            'underlying': underlying,
            'option_type': option_type,
            'strike_price': strike_price,
            'expiry_date': expiry_date,
        }
        data['updated_at'] = datetime.utcnow()
        result = self.contracts_collection.update_one(
            query,
            {'$set': data, '$setOnInsert': {'created_at': datetime.utcnow(), 'status': 'active'}},
            upsert=True
        )
        return result.upserted_id or self.contracts_collection.find_one(query)['_id']

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

    def open_position(self, user_id, contract_id, quantity, entry_premium, total_cost):
        """옵션 포지션 오픈 (매수)"""
        position_data = {
            'user_id': ObjectId(user_id),
            'contract_id': ObjectId(contract_id),
            'position_type': 'buy',
            'quantity': quantity,
            'entry_premium': entry_premium,
            'total_cost': total_cost,
            'status': 'open',
            'opened_at': datetime.utcnow(),
        }
        result = self.positions_collection.insert_one(position_data)
        return str(result.inserted_id)

    def close_position(self, position_id, exit_premium, realized_pnl):
        """포지션 청산"""
        result = self.positions_collection.update_one(
            {'_id': ObjectId(position_id)},
            {'$set': {
                'status': 'closed',
                'exit_premium': exit_premium,
                'realized_pnl': realized_pnl,
                'closed_at': datetime.utcnow(),
            }}
        )
        return result.modified_count > 0

    def exercise_position(self, position_id, settlement_amount):
        """옵션 행사"""
        result = self.positions_collection.update_one(
            {'_id': ObjectId(position_id)},
            {'$set': {
                'status': 'exercised',
                'settlement_amount': settlement_amount,
                'exercised_at': datetime.utcnow(),
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
