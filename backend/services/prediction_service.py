from models.prediction import Prediction
from models.user import User
from config import Config
from datetime import datetime
import logging


class PredictionService:
    def __init__(self):
        self.prediction_model = Prediction()
        self.user_model = User()

    # ── 예측 관리 (관리자) ──

    def create_prediction(self, title, description, deadline_str, admin_user_id, odds=None):
        if not title or not title.strip():
            return None, '제목을 입력해주세요.'

        try:
            deadline = datetime.fromisoformat(deadline_str)
        except (ValueError, TypeError):
            return None, '마감 시간 형식이 올바르지 않습니다.'

        final_odds = float(odds) if odds else Config.PREDICTION_ODDS
        pred_id = self.prediction_model.create_prediction(
            title=title.strip(),
            description=(description or '').strip(),
            deadline=deadline,
            created_by=admin_user_id,
            odds=final_odds
        )
        return pred_id, None

    def close_prediction(self, prediction_id):
        pred = self.prediction_model.get_prediction(prediction_id)
        if not pred:
            return '예측을 찾을 수 없습니다.'
        if pred['status'] == 'settled':
            return '이미 정산된 예측입니다.'
        self.prediction_model.update_status(prediction_id, 'closed')
        return None

    def settle_prediction(self, prediction_id, result):
        if result not in ('yes', 'no'):
            return None, "결과는 'yes' 또는 'no'여야 합니다."

        pred = self.prediction_model.get_prediction(prediction_id)
        if not pred:
            return None, '예측을 찾을 수 없습니다.'
        if pred['status'] == 'settled':
            return None, '이미 정산된 예측입니다.'

        odds = pred.get('odds', Config.PREDICTION_ODDS)

        # 승자 처리
        winning_bets = self.prediction_model.get_bets_by_choice(prediction_id, result)
        losing_choice = 'no' if result == 'yes' else 'yes'
        losing_bets = self.prediction_model.get_bets_by_choice(prediction_id, losing_choice)

        total_payout = 0
        winners = 0
        for bet in winning_bets:
            payout = int(bet['amount'] * odds)
            # 잔고에 당첨금 지급
            user = self.user_model.find_by_id(str(bet['user_id']))
            if user:
                new_balance = user['balance'] + payout
                self.user_model.update_balance(str(bet['user_id']), new_balance)
            self.prediction_model.update_bet_result(str(bet['_id']), 'won', payout)
            total_payout += payout
            winners += 1

        for bet in losing_bets:
            self.prediction_model.update_bet_result(str(bet['_id']), 'lost', 0)

        self.prediction_model.settle_prediction(prediction_id, result)

        summary = {
            'result': result,
            'winners': winners,
            'losers': len(losing_bets),
            'total_payout': total_payout,
        }
        return summary, None

    def delete_prediction(self, prediction_id):
        pred = self.prediction_model.get_prediction(prediction_id)
        if not pred:
            return '예측을 찾을 수 없습니다.'
        bet_count = self.prediction_model.count_bets(prediction_id)
        if bet_count > 0:
            return '베팅이 있는 예측은 삭제할 수 없습니다.'
        self.prediction_model.delete_prediction(prediction_id)
        return None

    # ── 예측 조회 ──

    def get_predictions(self, status=None):
        self._auto_close_expired()
        preds = self.prediction_model.get_predictions(status)
        return [self._serialize_prediction(p) for p in preds]

    def get_prediction_detail(self, prediction_id):
        pred = self.prediction_model.get_prediction(prediction_id)
        if not pred:
            return None
        return self._serialize_prediction(pred)

    # ── 베팅 ──

    def place_bet(self, prediction_id, user_id, choice, amount):
        if choice not in ('yes', 'no'):
            return None, "선택은 'yes' 또는 'no'여야 합니다."

        amount = int(amount)
        if amount < Config.PREDICTION_MIN_BET:
            return None, f'최소 베팅 금액은 {Config.PREDICTION_MIN_BET:,}원입니다.'
        if amount > Config.PREDICTION_MAX_BET:
            return None, f'최대 베팅 금액은 {Config.PREDICTION_MAX_BET:,}원입니다.'

        pred = self.prediction_model.get_prediction(prediction_id)
        if not pred:
            return None, '예측을 찾을 수 없습니다.'
        if pred['status'] != 'open':
            return None, '베팅이 마감된 예측입니다.'
        if datetime.utcnow() >= pred['deadline']:
            self.prediction_model.update_status(prediction_id, 'closed')
            return None, '베팅 마감 시간이 지났습니다.'

        user = self.user_model.find_by_id(user_id)
        if not user:
            return None, '사용자를 찾을 수 없습니다.'
        if user['balance'] < amount:
            return None, '잔액이 부족합니다.'

        # 잔고 차감 (atomic)
        result = self.user_model.collection.update_one(
            {'_id': user['_id'], 'balance': {'$gte': amount}},
            {'$inc': {'balance': -amount}}
        )
        if result.modified_count == 0:
            return None, '잔액이 부족합니다.'

        odds = pred.get('odds', Config.PREDICTION_ODDS)
        self.prediction_model.place_bet(prediction_id, user_id, choice, amount, odds)

        updated_user = self.user_model.find_by_id(user_id)
        bet_data = {
            'choice': choice,
            'amount': amount,
            'potential_payout': int(amount * odds),
            'remaining_balance': updated_user['balance'],
        }
        return bet_data, None

    def get_user_bets(self, user_id):
        bets = self.prediction_model.get_user_bets(user_id)
        results = []
        for bet in bets:
            pred = self.prediction_model.get_prediction(str(bet['prediction_id']))
            results.append({
                'bet_id': str(bet['_id']),
                'prediction_id': str(bet['prediction_id']),
                'prediction_title': pred['title'] if pred else '삭제된 예측',
                'prediction_status': pred['status'] if pred else 'unknown',
                'prediction_result': pred.get('result') if pred else None,
                'choice': bet['choice'],
                'amount': bet['amount'],
                'potential_payout': bet['potential_payout'],
                'status': bet['status'],
                'payout': bet['payout'],
                'created_at': bet['created_at'].isoformat() if bet.get('created_at') else None,
            })
        return results

    # ── 내부 유틸 ──

    def _auto_close_expired(self):
        now = datetime.utcnow()
        self.prediction_model.collection.update_many(
            {'status': 'open', 'deadline': {'$lte': now}},
            {'$set': {'status': 'closed'}}
        )

    def _serialize_prediction(self, pred):
        return {
            'id': str(pred['_id']),
            'title': pred['title'],
            'description': pred.get('description', ''),
            'deadline': pred['deadline'].isoformat() if pred.get('deadline') else None,
            'status': pred['status'],
            'result': pred.get('result'),
            'odds': pred.get('odds', Config.PREDICTION_ODDS),
            'total_yes_amount': pred.get('total_yes_amount', 0),
            'total_no_amount': pred.get('total_no_amount', 0),
            'total_yes_bettors': pred.get('total_yes_bettors', 0),
            'total_no_bettors': pred.get('total_no_bettors', 0),
            'created_at': pred['created_at'].isoformat() if pred.get('created_at') else None,
            'settled_at': pred['settled_at'].isoformat() if pred.get('settled_at') else None,
        }


prediction_service = PredictionService()
