from models.prediction import Prediction
from models.portfolio import Portfolio
from models.user import User
from config import Config
from utils.discord import send_discord
from datetime import datetime
import logging


class PredictionService:
    def __init__(self):
        self.prediction_model = Prediction()
        self.user_model = User()

    # ── 배당률 계산 ──

    def _calc_odds(self, total_yes, total_no):
        """파리뮤추얼 배당률 계산"""
        total = total_yes + total_no
        if total == 0:
            return {'yes_odds': 2.0, 'no_odds': 2.0}
        yes_odds = round(total / total_yes, 2) if total_yes > 0 else 0
        no_odds = round(total / total_no, 2) if total_no > 0 else 0
        return {'yes_odds': yes_odds, 'no_odds': no_odds}

    # ── 예측 관리 (관리자) ──

    def create_prediction(self, title, description, deadline_str, admin_user_id, **kwargs):
        if not title or not title.strip():
            return None, '제목을 입력해주세요.'

        try:
            deadline = datetime.fromisoformat(deadline_str)
        except (ValueError, TypeError):
            return None, '마감 시간 형식이 올바르지 않습니다.'

        pred_id = self.prediction_model.create_prediction(
            title=title.strip(),
            description=(description or '').strip(),
            deadline=deadline,
            created_by=admin_user_id
        )
        send_discord(
            "새 예측 등록",
            f"**{title.strip()}**\n{(description or '').strip()}",
            color=0x667eea,
            fields=[
                {"name": "마감", "value": deadline_str, "inline": True},
            ]
        )
        return pred_id, None

    def close_prediction(self, prediction_id):
        pred = self.prediction_model.get_prediction(prediction_id)
        if not pred:
            return '예측을 찾을 수 없습니다.'
        if pred['status'] == 'settled':
            return '이미 정산된 예측입니다.'
        self.prediction_model.update_status(prediction_id, 'closed')
        send_discord(
            "예측 마감",
            f"**{pred['title']}**\n베팅이 마감되었습니다.",
            color=0xf39c12,
            fields=[
                {"name": "YES", "value": f"₩{pred.get('total_yes_amount',0):,} ({pred.get('total_yes_bettors',0)}명)", "inline": True},
                {"name": "NO", "value": f"₩{pred.get('total_no_amount',0):,} ({pred.get('total_no_bettors',0)}명)", "inline": True},
            ]
        )
        return None

    def settle_prediction(self, prediction_id, result):
        if result not in ('yes', 'no'):
            return None, "결과는 'yes' 또는 'no'여야 합니다."

        pred = self.prediction_model.get_prediction(prediction_id)
        if not pred:
            return None, '예측을 찾을 수 없습니다.'
        if pred['status'] == 'settled':
            return None, '이미 정산된 예측입니다.'

        total_yes = pred.get('total_yes_amount', 0)
        total_no = pred.get('total_no_amount', 0)
        total_pool = total_yes + total_no

        winning_pool = total_yes if result == 'yes' else total_no
        losing_choice = 'no' if result == 'yes' else 'yes'

        # 승자 처리: 파리뮤추얼 배당
        winning_bets = self.prediction_model.get_bets_by_choice(prediction_id, result)
        losing_bets = self.prediction_model.get_bets_by_choice(prediction_id, losing_choice)

        total_payout = 0
        winners = 0
        portfolio_model = Portfolio()
        title_short = pred['title'][:30]

        for bet in winning_bets:
            if winning_pool > 0 and total_pool > 0:
                payout = int(bet['amount'] * total_pool / winning_pool)
            else:
                payout = bet['amount']  # 반대편 베팅이 없으면 원금 반환

            # atomic $inc로 잔액 증가 (동시성 안전)
            self.user_model.collection.update_one(
                {'_id': bet['user_id']},
                {'$inc': {'balance': payout}}
            )
            self.prediction_model.update_bet_result(str(bet['_id']), 'won', payout)

            profit = payout - bet['amount']
            portfolio_model.record_transaction(
                str(bet['user_id']), 'PREDICTION', 'bet_win', 1,
                payout, 0, 'PREDICTION',
                name=f"예측 적중 (+{profit:,}원) - {title_short}"
            )
            total_payout += payout
            winners += 1

        for bet in losing_bets:
            self.prediction_model.update_bet_result(str(bet['_id']), 'lost', 0)
            portfolio_model.record_transaction(
                str(bet['user_id']), 'PREDICTION', 'bet_loss', 1,
                bet['amount'], 0, 'PREDICTION',
                name=f"예측 실패 (-{bet['amount']:,}원) - {title_short}"
            )

        self.prediction_model.settle_prediction(prediction_id, result)

        result_kr = "YES" if result == "yes" else "NO"
        send_discord(
            "예측 정산 완료",
            f"**{pred['title']}**",
            color=0x2ecc71 if winners > 0 else 0xe74c3c,
            fields=[
                {"name": "결과", "value": result_kr, "inline": True},
                {"name": "승자", "value": f"{winners}명", "inline": True},
                {"name": "총 배당", "value": f"₩{total_payout:,}", "inline": True},
            ]
        )

        summary = {
            'result': result,
            'winners': winners,
            'losers': len(losing_bets),
            'total_pool': total_pool,
            'total_payout': total_payout,
        }
        return summary, None

    def delete_prediction(self, prediction_id):
        pred = self.prediction_model.get_prediction(prediction_id)
        if not pred:
            return None, '예측을 찾을 수 없습니다.'
        if pred.get('status') == 'settled':
            return None, '이미 정산된 예측은 삭제할 수 없습니다.'

        # 베팅한 유저에게 환불
        bets = self.prediction_model.get_bets_for_prediction(prediction_id)
        refund_count = 0
        refund_total = 0
        for bet in bets:
            if bet.get('status') != 'refunded':
                self.user_model.collection.update_one(
                    {'_id': bet['user_id']},
                    {'$inc': {'balance': bet['amount']}}
                )
                refund_count += 1
                refund_total += bet['amount']

        # 베팅 기록 삭제 후 예측 삭제
        self.prediction_model.delete_bets_for_prediction(prediction_id)
        self.prediction_model.delete_prediction(prediction_id)

        summary = {
            'refund_count': refund_count,
            'refund_total': refund_total,
        }
        return summary, None

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

        # 베팅 후 예상 배당률 계산
        total_yes = pred.get('total_yes_amount', 0)
        total_no = pred.get('total_no_amount', 0)
        if choice == 'yes':
            new_yes = total_yes + amount
            new_total = new_yes + total_no
            estimated_payout = int(amount * new_total / new_yes) if new_yes > 0 else amount
        else:
            new_no = total_no + amount
            new_total = total_yes + new_no
            estimated_payout = int(amount * new_total / new_no) if new_no > 0 else amount

        self.prediction_model.place_bet(prediction_id, user_id, choice, amount, estimated_payout)

        # 거래 기록
        portfolio_model = Portfolio()
        portfolio_model.record_transaction(
            user_id, 'PREDICTION', 'bet_place', 1,
            amount, 0, 'PREDICTION',
            name=f"예측 베팅 ({choice.upper()}) - {pred['title'][:30]}"
        )

        updated_user = self.user_model.find_by_id(user_id)
        bet_data = {
            'choice': choice,
            'amount': amount,
            'potential_payout': estimated_payout,
            'remaining_balance': updated_user['balance'],
        }
        return bet_data, None

    def get_user_bets(self, user_id):
        bets = self.prediction_model.get_user_bets(user_id)
        results = []
        for bet in bets:
            pred = self.prediction_model.get_prediction(str(bet['prediction_id']))

            # 현재 예상 배당금 재계산 (정산 전)
            if pred and bet['status'] == 'pending':
                total_yes = pred.get('total_yes_amount', 0)
                total_no = pred.get('total_no_amount', 0)
                total = total_yes + total_no
                my_pool = total_yes if bet['choice'] == 'yes' else total_no
                current_payout = int(bet['amount'] * total / my_pool) if my_pool > 0 else bet['amount']
            else:
                current_payout = bet.get('potential_payout', 0)

            results.append({
                'bet_id': str(bet['_id']),
                'prediction_id': str(bet['prediction_id']),
                'prediction_title': pred['title'] if pred else '삭제된 예측',
                'prediction_status': pred['status'] if pred else 'unknown',
                'prediction_result': pred.get('result') if pred else None,
                'choice': bet['choice'],
                'amount': bet['amount'],
                'potential_payout': current_payout,
                'status': bet['status'],
                'payout': bet['payout'],
                'profit': (bet['payout'] - bet['amount']) if bet['status'] == 'won' else (-bet['amount'] if bet['status'] == 'lost' else 0),
                'created_at': bet['created_at'].isoformat() if bet.get('created_at') else None,
                'settled_at': bet['settled_at'].isoformat() if bet.get('settled_at') else None,
            })
        return results

    def get_user_bets_on_prediction(self, prediction_id, user_id):
        bets = self.prediction_model.get_user_bet_on_prediction(prediction_id, user_id)
        pred = self.prediction_model.get_prediction(prediction_id)
        results = []
        for bet in bets:
            if pred and bet['status'] == 'pending':
                total_yes = pred.get('total_yes_amount', 0)
                total_no = pred.get('total_no_amount', 0)
                total = total_yes + total_no
                my_pool = total_yes if bet['choice'] == 'yes' else total_no
                current_payout = int(bet['amount'] * total / my_pool) if my_pool > 0 else bet['amount']
            else:
                current_payout = bet.get('potential_payout', 0)

            results.append({
                'bet_id': str(bet['_id']),
                'choice': bet['choice'],
                'amount': bet['amount'],
                'potential_payout': current_payout,
                'status': bet['status'],
                'payout': bet['payout'],
                'profit': (bet['payout'] - bet['amount']) if bet['status'] == 'won' else (-bet['amount'] if bet['status'] == 'lost' else 0),
                'created_at': bet['created_at'].isoformat() if bet.get('created_at') else None,
                'settled_at': bet['settled_at'].isoformat() if bet.get('settled_at') else None,
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
        total_yes = pred.get('total_yes_amount', 0)
        total_no = pred.get('total_no_amount', 0)
        odds = self._calc_odds(total_yes, total_no)

        return {
            'id': str(pred['_id']),
            'title': pred['title'],
            'description': pred.get('description', ''),
            'deadline': pred['deadline'].isoformat() if pred.get('deadline') else None,
            'status': pred['status'],
            'result': pred.get('result'),
            'yes_odds': odds['yes_odds'],
            'no_odds': odds['no_odds'],
            'total_yes_amount': total_yes,
            'total_no_amount': total_no,
            'total_yes_bettors': pred.get('total_yes_bettors', 0),
            'total_no_bettors': pred.get('total_no_bettors', 0),
            'created_at': pred['created_at'].isoformat() if pred.get('created_at') else None,
            'settled_at': pred['settled_at'].isoformat() if pred.get('settled_at') else None,
        }


prediction_service = PredictionService()
