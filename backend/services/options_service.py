import math
import logging
from datetime import datetime, timedelta
from models.options import Options
from models.portfolio import Portfolio
from models.user import User
from services.stock_service import stock_service
from config import Config

try:
    from scipy.stats import norm
except ImportError:
    # Fallback if scipy not installed
    norm = None
    logging.warning("scipy not installed, using approximation for Black-Scholes")


def _norm_cdf(x):
    """Standard normal CDF approximation (fallback)"""
    if norm:
        return norm.cdf(x)
    # Abramowitz and Stegun approximation
    a1, a2, a3, a4, a5 = 0.254829592, -0.284496736, 1.421413741, -1.453152027, 1.061405429
    p = 0.3275911
    sign = 1 if x >= 0 else -1
    x = abs(x) / math.sqrt(2)
    t = 1.0 / (1.0 + p * x)
    y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * math.exp(-x * x)
    return 0.5 * (1.0 + sign * y)


def _norm_pdf(x):
    """Standard normal PDF"""
    if norm:
        return norm.pdf(x)
    return math.exp(-0.5 * x * x) / math.sqrt(2 * math.pi)


class OptionsService:
    def __init__(self):
        self.options_model = Options()

    @staticmethod
    def black_scholes(S, K, T, r, sigma, option_type='call'):
        """블랙-숄즈 옵션 가격 계산
        S: 기초자산 가격, K: 행사가, T: 만기(연), r: 무위험이자율, sigma: 변동성
        """
        if T <= 0 or sigma <= 0 or S <= 0:
            if option_type == 'call':
                return max(S - K, 0)
            else:
                return max(K - S, 0)

        d1 = (math.log(S / K) + (r + 0.5 * sigma ** 2) * T) / (sigma * math.sqrt(T))
        d2 = d1 - sigma * math.sqrt(T)

        if option_type == 'call':
            price = S * _norm_cdf(d1) - K * math.exp(-r * T) * _norm_cdf(d2)
        else:
            price = K * math.exp(-r * T) * _norm_cdf(-d2) - S * _norm_cdf(-d1)

        return max(price, 0)

    @staticmethod
    def calculate_greeks(S, K, T, r, sigma, option_type='call'):
        """그릭스 계산"""
        if T <= 0 or sigma <= 0 or S <= 0:
            return {'delta': 0, 'gamma': 0, 'theta': 0, 'vega': 0}

        d1 = (math.log(S / K) + (r + 0.5 * sigma ** 2) * T) / (sigma * math.sqrt(T))
        d2 = d1 - sigma * math.sqrt(T)

        if option_type == 'call':
            delta = _norm_cdf(d1)
            theta = (-(S * _norm_pdf(d1) * sigma) / (2 * math.sqrt(T))
                     - r * K * math.exp(-r * T) * _norm_cdf(d2)) / 365
        else:
            delta = _norm_cdf(d1) - 1
            theta = (-(S * _norm_pdf(d1) * sigma) / (2 * math.sqrt(T))
                     + r * K * math.exp(-r * T) * _norm_cdf(-d2)) / 365

        gamma = _norm_pdf(d1) / (S * sigma * math.sqrt(T))
        vega = S * _norm_pdf(d1) * math.sqrt(T) / 100  # per 1% change

        return {
            'delta': round(delta, 4),
            'gamma': round(gamma, 6),
            'theta': round(theta, 4),
            'vega': round(vega, 4),
        }

    def generate_option_chain(self, underlying):
        """옵션 체인 자동 생성"""
        # 기초자산 현재가 조회
        stock_data = stock_service.get_cached_stock_data(underlying, max_age_minutes=3)
        if not stock_data:
            stock_data = stock_service.get_stock_info(underlying)

        if not stock_data or stock_data.get('current_price', 0) <= 0:
            return []

        S = stock_data['current_price']
        r = Config.OPTIONS_RISK_FREE_RATE
        sigma = 0.3  # 기본 변동성 30%

        # 행사가 범위: 현재가 ±30%, 5% 간격
        interval = Config.OPTIONS_STRIKE_INTERVAL['default']
        strikes = []
        for i in range(-6, 7):  # -30% ~ +30%
            strike = round(S * (1 + i * interval), 2)
            if strike > 0:
                strikes.append(strike)

        # 만기: 1주, 2주, 1/2/3개월
        now = datetime.utcnow()
        expiries = []

        # 단기 만기: 1주, 2주
        for week_offset in [1, 2]:
            expiry = now + timedelta(weeks=week_offset)
            # 금요일로 맞춤
            days_until_friday = (4 - expiry.weekday()) % 7
            expiry = expiry + timedelta(days=days_until_friday)
            expiries.append(datetime(expiry.year, expiry.month, expiry.day))

        # 월간 만기: 1/2/3개월
        for month_offset in [1, 2, 3]:
            target_month = now.month + month_offset
            target_year = now.year
            while target_month > 12:
                target_month -= 12
                target_year += 1
            # 매월 세번째 금요일
            first_day = datetime(target_year, target_month, 1)
            first_friday = first_day + timedelta(days=(4 - first_day.weekday()) % 7)
            third_friday = first_friday + timedelta(days=14)
            expiries.append(third_friday)

        # 옵션 계약 생성/업데이트
        contracts = []
        for expiry in expiries:
            T = max((expiry - now).days / 365.0, 0.001)
            for strike in strikes:
                for opt_type in ['call', 'put']:
                    premium = self.black_scholes(S, strike, T, r, sigma, opt_type)
                    greeks = self.calculate_greeks(S, strike, T, r, sigma, opt_type)

                    contract_data = {
                        'underlying': underlying,
                        'option_type': opt_type,
                        'strike_price': strike,
                        'expiry_date': expiry,
                        'premium': round(premium, 2),
                        'greeks': greeks,
                        'underlying_price': S,
                        'implied_volatility': sigma,
                    }

                    self.options_model.upsert_contract(
                        underlying, opt_type, strike, expiry, contract_data
                    )

                    contract_data['expiry_date'] = expiry.isoformat()
                    contracts.append(contract_data)

        return contracts

    def get_option_chain(self, underlying):
        """옵션 체인 조회 (없으면 생성)"""
        contracts = self.options_model.get_option_chain(underlying)
        if not contracts:
            contracts = self.generate_option_chain(underlying)

        # datetime 직렬화
        for c in contracts:
            if isinstance(c.get('expiry_date'), datetime):
                c['expiry_date'] = c['expiry_date'].isoformat()
            if isinstance(c.get('created_at'), datetime):
                c['created_at'] = c['created_at'].isoformat()
            if isinstance(c.get('updated_at'), datetime):
                c['updated_at'] = c['updated_at'].isoformat()

        return contracts

    def get_contract_detail(self, contract_id):
        """계약 상세 + 실시간 그릭스"""
        contract = self.options_model.get_contract(contract_id)
        if not contract:
            return None

        # 실시간 가격으로 그릭스 재계산
        stock_data = stock_service.get_cached_stock_data(contract['underlying'], max_age_minutes=3)
        if stock_data and stock_data.get('current_price', 0) > 0:
            S = stock_data['current_price']
            K = contract['strike_price']
            expiry = contract['expiry_date']
            if isinstance(expiry, str):
                expiry = datetime.fromisoformat(expiry)
            T = max((expiry - datetime.utcnow()).days / 365.0, 0.001)
            r = Config.OPTIONS_RISK_FREE_RATE
            sigma = contract.get('implied_volatility', 0.3)

            contract['premium'] = round(self.black_scholes(S, K, T, r, sigma, contract['option_type']), 2)
            contract['greeks'] = self.calculate_greeks(S, K, T, r, sigma, contract['option_type'])
            contract['underlying_price'] = S

        if isinstance(contract.get('expiry_date'), datetime):
            contract['expiry_date'] = contract['expiry_date'].isoformat()
        if isinstance(contract.get('created_at'), datetime):
            contract['created_at'] = contract['created_at'].isoformat()
        if isinstance(contract.get('updated_at'), datetime):
            contract['updated_at'] = contract['updated_at'].isoformat()

        return contract

    def buy_option(self, user_id, contract_id, quantity):
        """옵션 매수"""
        contract = self.options_model.get_contract(contract_id)
        if not contract:
            return None, "계약을 찾을 수 없습니다."

        if contract['status'] != 'active':
            return None, "만료된 계약입니다."

        premium = contract.get('premium', 0)
        if premium <= 0:
            return None, "프리미엄이 유효하지 않습니다."

        contract_size = Config.OPTIONS_CONTRACT_SIZE
        total_cost = int(round(premium * quantity * contract_size))

        # 잔액 확인
        user_model = User()
        user = user_model.find_by_id(user_id)
        if not user:
            return None, "사용자를 찾을 수 없습니다."

        if user['balance'] < total_cost:
            return None, f"잔액이 부족합니다. 필요: ₩{total_cost:,}"

        # 포지션 생성
        position_id = self.options_model.open_position(
            user_id, contract_id, quantity, premium, total_cost
        )

        # 잔액 차감
        new_balance = int(round(user['balance'] - total_cost))
        user_model.update_balance(user_id, new_balance)

        # 거래 기록 저장
        portfolio_model = Portfolio()
        underlying = contract['underlying']
        strike = contract['strike_price']
        opt_type = contract['option_type']
        portfolio_model.record_transaction(
            user_id, underlying, 'option_buy', quantity,
            premium * contract_size, 0, 'OPTIONS',
            name=f"{underlying} {opt_type.upper()} K={strike}"
        )

        return {
            'position_id': position_id,
            'underlying': contract['underlying'],
            'option_type': contract['option_type'],
            'strike_price': contract['strike_price'],
            'quantity': quantity,
            'premium': premium,
            'total_cost': total_cost,
            'remaining_balance': new_balance,
        }, None

    def close_option_position(self, user_id, position_id):
        """옵션 포지션 청산 (현재 프리미엄으로 매도)"""
        position = self.options_model.get_position(position_id)
        if not position:
            return None, "포지션을 찾을 수 없습니다."

        if str(position['user_id']) != user_id:
            return None, "권한이 없습니다."

        if position['status'] != 'open':
            return None, "이미 청산된 포지션입니다."

        contract = self.options_model.get_contract(position['contract_id'])
        if not contract:
            return None, "계약을 찾을 수 없습니다."

        # 현재 프리미엄 계산
        detail = self.get_contract_detail(position['contract_id'])
        current_premium = detail['premium'] if detail else contract.get('premium', 0)

        contract_size = Config.OPTIONS_CONTRACT_SIZE
        sale_amount = int(round(current_premium * position['quantity'] * contract_size))
        entry_cost = position['total_cost']
        pnl = sale_amount - entry_cost

        # 청산
        self.options_model.close_position(position_id, current_premium, pnl)

        # 잔액 반환
        user_model = User()
        user = user_model.find_by_id(user_id)
        new_balance = int(round(user['balance'] + sale_amount))
        user_model.update_balance(user_id, new_balance)

        # 거래 기록 저장
        portfolio_model = Portfolio()
        underlying = contract['underlying']
        strike = contract['strike_price']
        opt_type = contract['option_type']
        portfolio_model.record_transaction(
            user_id, underlying, 'option_sell', position['quantity'],
            current_premium * contract_size, 0, 'OPTIONS',
            name=f"{underlying} {opt_type.upper()} K={strike}"
        )

        return {
            'position_id': position_id,
            'entry_premium': position['entry_premium'],
            'exit_premium': current_premium,
            'quantity': position['quantity'],
            'pnl': pnl,
            'sale_amount': sale_amount,
            'remaining_balance': new_balance,
        }, None

    def exercise_option(self, user_id, position_id):
        """옵션 행사 (현금 결제)"""
        position = self.options_model.get_position(position_id)
        if not position:
            return None, "포지션을 찾을 수 없습니다."

        if str(position['user_id']) != user_id:
            return None, "권한이 없습니다."

        if position['status'] != 'open':
            return None, "이미 청산된 포지션입니다."

        contract = self.options_model.get_contract(position['contract_id'])
        if not contract:
            return None, "계약을 찾을 수 없습니다."

        # 기초자산 현재가
        stock_data = stock_service.get_cached_stock_data(contract['underlying'], max_age_minutes=3)
        if not stock_data:
            stock_data = stock_service.get_stock_info(contract['underlying'])

        if not stock_data:
            return None, "기초자산 정보를 조회할 수 없습니다."

        S = stock_data['current_price']
        K = contract['strike_price']

        # 내재가치 계산
        if contract['option_type'] == 'call':
            intrinsic = max(S - K, 0)
        else:
            intrinsic = max(K - S, 0)

        if intrinsic <= 0:
            return None, "OTM 옵션은 행사할 수 없습니다."

        contract_size = Config.OPTIONS_CONTRACT_SIZE
        settlement = int(round(intrinsic * position['quantity'] * contract_size))
        pnl = settlement - position['total_cost']

        # 행사 처리
        self.options_model.exercise_position(position_id, settlement)

        # 정산금 지급
        user_model = User()
        user = user_model.find_by_id(user_id)
        new_balance = int(round(user['balance'] + settlement))
        user_model.update_balance(user_id, new_balance)

        # 거래 기록 저장
        portfolio_model = Portfolio()
        underlying = contract['underlying']
        strike = contract['strike_price']
        opt_type = contract['option_type']
        portfolio_model.record_transaction(
            user_id, underlying, 'option_exercise', position['quantity'],
            intrinsic * contract_size, 0, 'OPTIONS',
            name=f"{underlying} {opt_type.upper()} K={strike}"
        )

        return {
            'position_id': position_id,
            'underlying_price': S,
            'strike_price': K,
            'intrinsic_value': intrinsic,
            'settlement': settlement,
            'pnl': pnl,
            'remaining_balance': new_balance,
        }, None

    def get_positions(self, user_id):
        """사용자 포지션 조회"""
        positions = self.options_model.get_user_positions(user_id, 'open')
        for pos in positions:
            contract = self.options_model.get_contract(pos['contract_id'])
            if contract:
                pos['underlying'] = contract['underlying']
                pos['option_type'] = contract['option_type']
                pos['strike_price'] = contract['strike_price']
                pos['expiry_date'] = contract['expiry_date'].isoformat() if isinstance(contract['expiry_date'], datetime) else contract['expiry_date']
                pos['current_premium'] = contract.get('premium', 0)

                contract_size = Config.OPTIONS_CONTRACT_SIZE
                current_value = pos['current_premium'] * pos['quantity'] * contract_size
                pos['current_value'] = int(round(current_value))
                pos['unrealized_pnl'] = int(round(current_value - pos['total_cost']))

            if isinstance(pos.get('opened_at'), datetime):
                pos['opened_at'] = pos['opened_at'].isoformat()
        return positions


options_service = OptionsService()
