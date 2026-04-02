from utils.db import get_collection
from bson.objectid import ObjectId
from datetime import datetime


class Prediction:
    def __init__(self):
        self.collection = get_collection('predictions')
        self.bets_collection = get_collection('prediction_bets')

    # ── 예측 CRUD ──

    def create_prediction(self, title, description, deadline, created_by):
        doc = {
            'title': title,
            'description': description,
            'deadline': deadline,
            'status': 'open',
            'result': None,
            'total_yes_amount': 0,
            'total_no_amount': 0,
            'total_yes_bettors': 0,
            'total_no_bettors': 0,
            'created_by': ObjectId(created_by),
            'created_at': datetime.utcnow(),
            'settled_at': None,
        }
        result = self.collection.insert_one(doc)
        return str(result.inserted_id)

    def get_prediction(self, prediction_id):
        return self.collection.find_one({'_id': ObjectId(prediction_id)})

    def get_predictions(self, status=None):
        query = {}
        if status:
            query['status'] = status
        return list(self.collection.find(query).sort('created_at', -1))

    def update_status(self, prediction_id, status):
        self.collection.update_one(
            {'_id': ObjectId(prediction_id)},
            {'$set': {'status': status}}
        )

    def atomic_claim_for_settlement(self, prediction_id):
        """status='closed'인 예측을 'settling'으로 원자적 전환. 성공 시 원본 문서 반환.
        settling 상태에서 5분 이상 멈춘 경우에도 재시도 허용."""
        from pymongo import ReturnDocument
        from datetime import timedelta
        # 정상 전환: closed → settling
        result = self.collection.find_one_and_update(
            {'_id': ObjectId(prediction_id), 'status': 'closed'},
            {'$set': {'status': 'settling', 'settling_started_at': datetime.utcnow()}},
            return_document=ReturnDocument.BEFORE
        )
        if result:
            return result
        # 교착 복구: settling 상태에서 5분 초과 시 재시도 허용
        stale_cutoff = datetime.utcnow() - timedelta(minutes=5)
        return self.collection.find_one_and_update(
            {'_id': ObjectId(prediction_id), 'status': 'settling',
             '$or': [
                 {'settling_started_at': {'$lt': stale_cutoff}},
                 {'settling_started_at': {'$exists': False}}
             ]},
            {'$set': {'settling_started_at': datetime.utcnow()}},
            return_document=ReturnDocument.BEFORE
        )

    def settle_prediction(self, prediction_id, result):
        self.collection.update_one(
            {'_id': ObjectId(prediction_id)},
            {'$set': {
                'status': 'settled',
                'result': result,
                'settled_at': datetime.utcnow()
            }}
        )

    def update_deadline(self, prediction_id, new_deadline):
        self.collection.update_one(
            {'_id': ObjectId(prediction_id)},
            {'$set': {'deadline': new_deadline}}
        )

    def delete_prediction(self, prediction_id):
        self.collection.delete_one({'_id': ObjectId(prediction_id)})

    # ── 베팅 ──

    def place_bet(self, prediction_id, user_id, choice, amount, estimated_payout, is_first_bet_on_side=True):
        bet = {
            'prediction_id': ObjectId(prediction_id),
            'user_id': ObjectId(user_id),
            'choice': choice,
            'amount': amount,
            'potential_payout': estimated_payout,
            'status': 'pending',
            'payout': 0,
            'created_at': datetime.utcnow(),
            'settled_at': None,
        }
        self.bets_collection.insert_one(bet)

        inc_field = 'total_yes_amount' if choice == 'yes' else 'total_no_amount'
        inc_update = {inc_field: amount}
        if is_first_bet_on_side:
            cnt_field = 'total_yes_bettors' if choice == 'yes' else 'total_no_bettors'
            inc_update[cnt_field] = 1
        self.collection.update_one(
            {'_id': ObjectId(prediction_id)},
            {'$inc': inc_update}
        )

    def get_bets_for_prediction(self, prediction_id):
        return list(self.bets_collection.find(
            {'prediction_id': ObjectId(prediction_id)}
        ).sort('created_at', -1))

    def get_user_bets(self, user_id):
        return list(self.bets_collection.find(
            {'user_id': ObjectId(user_id)}
        ).sort('created_at', -1))

    def get_user_bet_on_prediction(self, prediction_id, user_id):
        return list(self.bets_collection.find({
            'prediction_id': ObjectId(prediction_id),
            'user_id': ObjectId(user_id)
        }))

    def get_bets_by_choice(self, prediction_id, choice):
        return list(self.bets_collection.find({
            'prediction_id': ObjectId(prediction_id),
            'choice': choice
        }))

    def update_bet_result(self, bet_id, status, payout):
        self.bets_collection.update_one(
            {'_id': ObjectId(bet_id)},
            {'$set': {
                'status': status,
                'payout': payout,
                'settled_at': datetime.utcnow()
            }}
        )

    def count_bets(self, prediction_id):
        return self.bets_collection.count_documents(
            {'prediction_id': ObjectId(prediction_id)}
        )

    def mark_bet_refunded(self, bet_id):
        """베팅을 'refunded'로 원자적 표시. 이미 환불된 베팅은 무시."""
        result = self.bets_collection.update_one(
            {'_id': ObjectId(bet_id), 'status': {'$ne': 'refunded'}},
            {'$set': {'status': 'refunded', 'settled_at': datetime.utcnow()}}
        )
        return result.modified_count > 0

    def delete_bets_for_prediction(self, prediction_id):
        """예측에 대한 모든 베팅 삭제"""
        self.bets_collection.delete_many(
            {'prediction_id': ObjectId(prediction_id)}
        )
