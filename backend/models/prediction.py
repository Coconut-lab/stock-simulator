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

    def settle_prediction(self, prediction_id, result):
        self.collection.update_one(
            {'_id': ObjectId(prediction_id)},
            {'$set': {
                'status': 'settled',
                'result': result,
                'settled_at': datetime.utcnow()
            }}
        )

    def delete_prediction(self, prediction_id):
        self.collection.delete_one({'_id': ObjectId(prediction_id)})

    # ── 베팅 ──

    def place_bet(self, prediction_id, user_id, choice, amount, estimated_payout):
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
        cnt_field = 'total_yes_bettors' if choice == 'yes' else 'total_no_bettors'
        self.collection.update_one(
            {'_id': ObjectId(prediction_id)},
            {'$inc': {inc_field: amount, cnt_field: 1}}
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

    def delete_bets_for_prediction(self, prediction_id):
        """예측에 대한 모든 베팅 삭제"""
        self.bets_collection.delete_many(
            {'prediction_id': ObjectId(prediction_id)}
        )
