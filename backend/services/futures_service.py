from models.futures import Futures
from models.portfolio import Portfolio
from models.user import User
from services.stock_service import stock_service
from config import Config
from datetime import datetime, timedelta
import logging
import math


class FuturesService:
    def __init__(self):
        self.futures_model = Futures()

    def seed_contracts(self):
        """초기 선물 계약 생성 (향후 3개월 만기)"""
        existing = self.futures_model.get_active_contracts()
        if len(existing) >= 3:
            return  # 이미 충분한 계약이 있음

        now = datetime.utcnow()
        for spec_key, spec in Config.FUTURES_CONTRACTS.items():
            for month_offset in [1, 2, 3]:
                # 매월 두번째 목요일을 만기일로 설정
                target_month = now.month + month_offset
                target_year = now.year
                while target_month > 12:
                    target_month -= 12
                    target_year += 1

                # 해당 월의 두번째 목요일 계산
                first_day = datetime(target_year, target_month, 1)
                first_thursday = first_day + timedelta(days=(3 - first_day.weekday()) % 7)
                second_thursday = first_thursday + timedelta(days=7)

                expiry = second_thursday

                # 기준 가격 설정
                base_prices = {
                    'KOSPI200': 350.0,
                    'MES': 5500.0,
                    'MNQ': 19500.0,
                    'MCL': 70.0,
                    'MGC': 2400.0,
                    'M6E': 1.08,
                }
                base_price = base_prices.get(spec_key, 100.0)

                contract_data = {
                    'symbol': f"{spec_key}_{expiry.strftime('%Y%m')}",
                    'name': f"{spec['name']} {expiry.strftime('%Y년 %m월')}",
                    'underlying': spec['underlying'],
                    'contract_size': spec['contract_size'],
                    'tick_size': spec['tick_size'],
                    'initial_margin_rate': spec['initial_margin_rate'],
                    'maintenance_margin_rate': spec['maintenance_margin_rate'],
                    'currency': spec['currency'],
                    'expiry_date': expiry,
                    'base_price': base_price,
                    'current_price': base_price,
                }

                self.futures_model.create_contract(contract_data)

        logging.info("선물 계약 초기화 완료")

    def get_contracts(self):
        """활성 계약 목록"""
        contracts = self.futures_model.get_active_contracts()
        if not contracts:
            self.seed_contracts()
            contracts = self.futures_model.get_active_contracts()
        for c in contracts:
            if c.get('currency') == 'USD':
                c['exchange_rate'] = stock_service.get_exchange_rate('USD')
        return contracts

    def get_contract(self, contract_id):
        """계약 상세"""
        contract = self.futures_model.get_contract(contract_id)
        if contract and contract.get('currency') == 'USD':
            contract['exchange_rate'] = stock_service.get_exchange_rate('USD')
        return contract

    def open_position(self, user_id, contract_id, direction, quantity):
        """포지션 오픈"""
        contract = self.futures_model.get_contract(contract_id)
        if not contract:
            return None, "계약을 찾을 수 없습니다."

        if contract['status'] != 'active':
            return None, "만료된 계약입니다."

        entry_price = contract['current_price']
        contract_value = entry_price * contract['contract_size'] * quantity

        # 통화 변환
        if contract['currency'] == 'USD':
            exchange_rate = stock_service.get_exchange_rate('USD')
            contract_value_krw = contract_value * exchange_rate
        else:
            contract_value_krw = contract_value

        # 증거금 계산
        margin = int(round(contract_value_krw * contract['initial_margin_rate']))

        # 잔액 확인
        user_model = User()
        user = user_model.find_by_id(user_id)
        if not user:
            return None, "사용자를 찾을 수 없습니다."

        if user['balance'] < margin:
            return None, f"증거금이 부족합니다. 필요: ₩{margin:,}"

        # 포지션 생성
        position_id = self.futures_model.open_position(
            user_id, contract_id, direction, quantity, entry_price, margin
        )

        # 잔액 차감
        new_balance = int(round(user['balance'] - margin))
        user_model.update_balance(user_id, new_balance)

        # 거래 기록 저장
        portfolio_model = Portfolio()
        tx_type = 'futures_long' if direction == 'long' else 'futures_short'
        portfolio_model.record_transaction(
            user_id, contract['symbol'], tx_type, quantity,
            margin, 0, 'FUTURES',
            name=f"{contract['name']} ({direction.upper()})"
        )

        return {
            'position_id': position_id,
            'contract': contract['name'],
            'direction': direction,
            'quantity': quantity,
            'entry_price': entry_price,
            'margin': margin,
            'remaining_balance': new_balance,
        }, None

    def close_position(self, user_id, position_id):
        """포지션 청산"""
        position = self.futures_model.get_position(position_id)
        if not position:
            return None, "포지션을 찾을 수 없습니다."

        if str(position['user_id']) != user_id:
            return None, "권한이 없습니다."

        if position['status'] != 'open':
            return None, "이미 청산된 포지션입니다."

        contract = self.futures_model.get_contract(position['contract_id'])
        if not contract:
            return None, "계약을 찾을 수 없습니다."

        exit_price = contract['current_price']
        entry_price = position['entry_price']

        # P&L 계산
        if position['direction'] == 'long':
            price_diff = exit_price - entry_price
        else:
            price_diff = entry_price - exit_price

        pnl = price_diff * contract['contract_size'] * position['quantity']

        # 통화 변환
        if contract['currency'] == 'USD':
            exchange_rate = stock_service.get_exchange_rate('USD')
            pnl_krw = pnl * exchange_rate
        else:
            pnl_krw = pnl

        pnl_krw = int(round(pnl_krw))

        # 포지션 청산
        self.futures_model.close_position(position_id, exit_price, pnl_krw)

        # 증거금 + P&L 반환
        margin_return = position['margin'] + pnl_krw
        user_model = User()
        user = user_model.find_by_id(user_id)
        new_balance = int(round(user['balance'] + margin_return))
        user_model.update_balance(user_id, new_balance)

        # 거래 기록 저장
        portfolio_model = Portfolio()
        portfolio_model.record_transaction(
            user_id, contract['symbol'], 'futures_close', position['quantity'],
            margin_return, 0, 'FUTURES',
            name=f"{contract['name']} 청산 (P&L: {'+'if pnl_krw>=0 else ''}{pnl_krw:,})"
        )

        return {
            'position_id': position_id,
            'entry_price': entry_price,
            'exit_price': exit_price,
            'direction': position['direction'],
            'quantity': position['quantity'],
            'pnl': pnl_krw,
            'margin_return': margin_return,
            'remaining_balance': new_balance,
        }, None

    def get_positions(self, user_id):
        """사용자 포지션 조회 (계약 정보 포함)"""
        positions = self.futures_model.get_user_positions(user_id, 'open')
        result = []
        for pos in positions:
            contract = self.futures_model.get_contract(pos['contract_id'])
            if contract:
                current_price = contract['current_price']
                entry_price = pos['entry_price']

                if pos['direction'] == 'long':
                    unrealized_pnl = (current_price - entry_price) * contract['contract_size'] * pos['quantity']
                else:
                    unrealized_pnl = (entry_price - current_price) * contract['contract_size'] * pos['quantity']

                if contract['currency'] == 'USD':
                    exchange_rate = stock_service.get_exchange_rate('USD')
                    unrealized_pnl = unrealized_pnl * exchange_rate

                pos['contract_name'] = contract['name']
                pos['contract_symbol'] = contract['symbol']
                pos['current_price'] = current_price
                pos['contract_size'] = contract['contract_size']
                pos['currency'] = contract['currency']
                pos['expiry_date'] = contract['expiry_date'].isoformat() if isinstance(contract['expiry_date'], datetime) else contract['expiry_date']
                pos['unrealized_pnl'] = int(round(unrealized_pnl))
                if pos.get('opened_at') and isinstance(pos['opened_at'], datetime):
                    pos['opened_at'] = pos['opened_at'].isoformat()
            result.append(pos)
        return result

    def get_position_history(self, user_id, limit=50):
        """청산 내역"""
        positions = self.futures_model.get_closed_positions(user_id, limit)
        for pos in positions:
            contract = self.futures_model.get_contract(pos['contract_id'])
            if contract:
                pos['contract_name'] = contract['name']
                pos['contract_symbol'] = contract['symbol']
            if pos.get('opened_at') and isinstance(pos['opened_at'], datetime):
                pos['opened_at'] = pos['opened_at'].isoformat()
            if pos.get('closed_at') and isinstance(pos['closed_at'], datetime):
                pos['closed_at'] = pos['closed_at'].isoformat()
        return positions


futures_service = FuturesService()
