from flask import Blueprint, request, jsonify
from services.auth_service import auth_service
from services.stock_service import stock_service, StockService
from services.options_service import options_service
from services.futures_service import futures_service
from models.portfolio import Portfolio
from models.user import User
from config import Config
import logging
import math

portfolio_bp = Blueprint('portfolio', __name__, url_prefix='/api/portfolio')

def verify_auth():
    """인증 검증 헬퍼 함수"""
    auth_header = request.headers.get('Authorization')

    if not auth_header or not auth_header.startswith('Bearer '):
        return None, "인증 토큰이 필요합니다."

    token = auth_header.split(' ')[1]
    user_data, error = auth_service.get_current_user(token)

    if error:
        return None, error

    return user_data, None

def calculate_commission(amount, market):
    """거래 수수료 계산 (시간외 거래 시 수수료 인상)"""
    from services.stock_service import StockService

    commission_rate = Config.COMMISSION_RATE.get(market, 0.001)

    # 시간외 거래 시 수수료 배수 적용
    if not StockService.is_market_open(market):
        commission_rate *= Config.AFTER_HOURS_COMMISSION_MULTIPLIER

    commission = amount * commission_rate
    min_commission = Config.MIN_COMMISSION.get(market, 1000)

    return max(commission, min_commission)

@portfolio_bp.route('/', methods=['GET'])
def get_portfolio():
    """사용자 포트폴리오 조회"""
    try:
        # 인증 검증
        user_data, error = verify_auth()
        if error:
            return jsonify({'error': error}), 401

        user_id = user_data['user_id']
        portfolio_model = Portfolio()

        # 포트폴리오 조회
        holdings = portfolio_model.get_user_portfolio(user_id)

        # 현재 가격 정보 추가
        portfolio_with_prices = []
        short_positions = []
        current_prices = {}

        for holding in holdings:
            symbol = holding['symbol']
            position_type = holding.get('position_type', 'long')

            # 상세 주식 정보 조회 (환율 포함)
            stock_data = stock_service.get_cached_stock_data(symbol, max_age_minutes=3)
            if not stock_data:
                stock_data = stock_service.get_stock_info(symbol)

            if stock_data:
                current_price = stock_data['current_price']

                # 미국 주식인 경우 환율 적용하여 원화로 변환
                if stock_data.get('currency') != 'KRW' and stock_data.get('exchange_rate'):
                    current_price_krw = current_price * stock_data['exchange_rate']
                else:
                    current_price_krw = current_price

                current_prices[symbol] = current_price_krw

                if position_type == 'short':
                    # 숏 포지션: P&L = (매도가 - 현재가) × 수량
                    profit_loss = (holding['avg_price'] - current_price_krw) * holding['quantity']
                    profit_loss_percent = (profit_loss / (holding['avg_price'] * holding['quantity'])) * 100 if holding['avg_price'] > 0 else 0
                    margin = holding.get('margin', holding['avg_price'] * holding['quantity'] * Config.SHORT_MARGIN_RATE)

                    short_item = {
                        'symbol': symbol,
                        'name': stock_data.get('name', symbol),
                        'quantity': holding['quantity'],
                        'entry_price': holding['avg_price'],
                        'current_price': current_price_krw,
                        'holding_value': current_price_krw * holding['quantity'],
                        'profit_loss': profit_loss,
                        'profit_loss_percent': profit_loss_percent,
                        'margin': margin,
                        'market': holding['market'],
                        'currency': stock_data.get('currency', 'KRW'),
                        'position_type': 'short',
                    }
                    short_positions.append(short_item)
                else:
                    # 롱 포지션 (기존 로직)
                    holding_value = holding['quantity'] * current_price_krw
                    profit_loss = (current_price_krw - holding['avg_price']) * holding['quantity']
                    profit_loss_percent = (profit_loss / (holding['avg_price'] * holding['quantity'])) * 100 if holding['avg_price'] > 0 else 0

                    # 원래 통화 기준 손익 계산 (해외 주식)
                    original_profit_loss = None
                    original_profit_loss_percent = None
                    purchase_price_original = None
                    if stock_data.get('currency') != 'KRW' and stock_data.get('exchange_rate'):
                        purchase_price_original = holding.get('original_avg_price') or (holding['avg_price'] / stock_data['exchange_rate'])
                        original_profit_loss = (current_price - purchase_price_original) * holding['quantity']
                        if purchase_price_original > 0:
                            original_profit_loss_percent = ((current_price - purchase_price_original) / purchase_price_original) * 100

                    # 전량 매도 예상 수수료 계산
                    sell_amount = holding['quantity'] * current_price_krw
                    estimated_sell_commission = int(round(calculate_commission(sell_amount, holding['market'])))

                    portfolio_item = {
                        'symbol': symbol,
                        'name': stock_data.get('name', symbol),
                        'quantity': holding['quantity'],
                        'purchase_price': holding['avg_price'],
                        'current_price': current_price_krw,
                        'original_price': current_price if stock_data.get('currency') != 'KRW' else None,
                        'purchase_price_original': purchase_price_original,
                        'holding_value': holding_value,
                        'profit_loss': profit_loss,
                        'profit_loss_percent': profit_loss_percent,
                        'original_profit_loss': original_profit_loss,
                        'original_profit_loss_percent': original_profit_loss_percent,
                        'market': holding['market'],
                        'currency': stock_data.get('currency', 'KRW'),
                        'exchange_rate': stock_data.get('exchange_rate') if stock_data.get('currency') != 'KRW' else None,
                        'estimated_sell_commission': estimated_sell_commission,
                        'position_type': 'long',
                    }

                    portfolio_with_prices.append(portfolio_item)

        # 포트폴리오 총 가치 계산
        total_value = portfolio_model.calculate_portfolio_value(user_id, current_prices)
        total_profit_loss = portfolio_model.calculate_profit_loss(user_id, current_prices)

        # 실현 손익 및 수수료
        pnl_data = portfolio_model.get_realized_pnl_and_commissions(user_id)

        # 옵션/선물 포지션 조회
        options_positions_data = options_service.get_positions(user_id)
        futures_positions_data = futures_service.get_positions(user_id)

        return jsonify({
            'data': StockService._clean_nan({
                'holdings': portfolio_with_prices,
                'short_positions': short_positions,
                'options_positions': options_positions_data,
                'futures_positions': futures_positions_data,
                'total_value': total_value,
                'total_profit_loss': total_profit_loss,
                'realized_pnl': pnl_data['realized_pnl'],
                'total_commission': pnl_data['total_commission'],
                'cash': user_data['balance']
            })
        }), 200

    except Exception as e:
        logging.error(f"포트폴리오 조회 에러: {e}")
        return jsonify({'error': '서버 에러가 발생했습니다.'}), 500

@portfolio_bp.route('/buy', methods=['POST'])
def buy_stock():
    """주식 매수 (소수점 거래 지원)"""
    try:
        # 인증 검증
        user_data, error = verify_auth()
        if error:
            return jsonify({'error': error}), 401

        user_id = user_data['user_id']
        data = request.get_json()

        if not data:
            return jsonify({'error': '요청 데이터가 없습니다.'}), 400

        symbol = data.get('symbol')
        quantity = data.get('quantity')

        # 필수 필드 검증
        if not symbol or not quantity:
            return jsonify({'error': '주식 심볼과 수량을 입력해주세요.'}), 400

        # float 변환 (소수점 거래 지원)
        quantity = float(quantity)
        quantity = round(quantity, Config.FRACTIONAL_DECIMALS)

        if quantity <= 0:
            return jsonify({'error': '수량은 0보다 커야 합니다.'}), 400

        # 현재 주식 가격 조회 - 상세 정보 포함
        stock_data = stock_service.get_cached_stock_data(symbol, max_age_minutes=3)
        if not stock_data:
            stock_data = stock_service.get_stock_info(symbol)

        if not stock_data:
            return jsonify({'error': '주식 정보를 찾을 수 없습니다.'}), 404

        current_price = stock_data['current_price']

        # 시장 구분 및 환율 적용
        market = stock_data.get('market', stock_data.get('currency', 'KRW'))

        # 외화 주식인 경우 환율 적용하여 원화로 변환
        if market != 'KRW' and stock_data.get('exchange_rate'):
            current_price_krw = current_price * stock_data['exchange_rate']
        else:
            current_price_krw = current_price

        # 총 거래 금액 계산 (환율 적용된 원화 가격 사용)
        total_amount = round(quantity * current_price_krw, 2)
        commission = calculate_commission(total_amount, market)

        # 정수로 변환
        total_amount = int(round(total_amount))
        commission = int(round(commission))

        total_cost = total_amount + commission

        # 보유 현금을 깔끔하게 떨어뜨리기 위해 필요시 수수료 조정
        remaining_balance = user_data['balance'] - total_cost
        if abs(remaining_balance - round(remaining_balance)) > 0.01:
            decimal_adjustment = round(remaining_balance) - remaining_balance
            commission += int(round(decimal_adjustment))
            total_cost = total_amount + commission

        # 잔액 확인
        if user_data['balance'] < total_cost:
            return jsonify({'error': '잔액이 부족합니다.'}), 400

        # 거래 실행
        portfolio_model = Portfolio()
        user_model = User()

        # 기존 보유 종목 확인 (롱 포지션)
        existing_holding = portfolio_model.get_holding(user_id, symbol, 'long')

        # 원래 통화 평균 단가 계산
        is_foreign = market != 'KRW' and stock_data.get('exchange_rate')
        if existing_holding:
            total_quantity = existing_holding['quantity'] + quantity
            total_value = (existing_holding['quantity'] * existing_holding['avg_price']) + total_amount
            new_avg_price = total_value / total_quantity

            new_original_avg = None
            if is_foreign:
                old_orig = existing_holding.get('original_avg_price') or (existing_holding['avg_price'] / stock_data['exchange_rate'])
                total_orig_value = (existing_holding['quantity'] * old_orig) + (quantity * current_price)
                new_original_avg = total_orig_value / total_quantity

            portfolio_model.update_holding(user_id, symbol, total_quantity, new_avg_price, new_original_avg, 'long')
        else:
            original_avg = current_price if is_foreign else None
            portfolio_model.add_holding(user_id, symbol, quantity, current_price_krw, market, original_avg, 'long')

        # 거래 기록 저장
        stock_name = stock_data.get('name', symbol)
        original_price = current_price if market != 'KRW' else None
        ex_rate = stock_data.get('exchange_rate') if market != 'KRW' else None
        portfolio_model.record_transaction(
            user_id, symbol, 'buy', quantity, current_price_krw, commission, market,
            name=stock_name, original_price=original_price, exchange_rate=ex_rate
        )

        # 사용자 잔액 업데이트 (원자적 차감)
        if not user_model.adjust_balance(user_id, -total_cost):
            return jsonify({'error': '잔액이 부족합니다.'}), 400

        updated_user = user_model.find_by_id(user_id)
        new_balance = updated_user['balance']

        return jsonify({
            'message': '매수가 완료되었습니다.',
            'data': {
                'symbol': symbol,
                'quantity': quantity,
                'price': current_price_krw,
                'total_amount': total_amount,
                'commission': commission,
                'total_cost': total_cost,
                'remaining_balance': new_balance
            }
        }), 200

    except Exception as e:
        logging.error(f"매수 에러: {e}")
        return jsonify({'error': '서버 에러가 발생했습니다.'}), 500

@portfolio_bp.route('/sell', methods=['POST'])
def sell_stock():
    """주식 매도 (소수점 거래 지원)"""
    try:
        # 인증 검증
        user_data, error = verify_auth()
        if error:
            return jsonify({'error': error}), 401

        user_id = user_data['user_id']
        data = request.get_json()

        if not data:
            return jsonify({'error': '요청 데이터가 없습니다.'}), 400

        symbol = data.get('symbol')
        quantity = data.get('quantity')

        # 필수 필드 검증
        if not symbol or not quantity:
            return jsonify({'error': '주식 심볼과 수량을 입력해주세요.'}), 400

        # float 변환 (소수점 거래 지원)
        quantity = float(quantity)
        quantity = round(quantity, Config.FRACTIONAL_DECIMALS)

        if quantity <= 0:
            return jsonify({'error': '수량은 0보다 커야 합니다.'}), 400

        # 보유 종목 확인 (롱 포지션)
        portfolio_model = Portfolio()
        holding = portfolio_model.get_holding(user_id, symbol, 'long')

        if not holding:
            return jsonify({'error': '보유하지 않은 종목입니다.'}), 400

        if holding['quantity'] < quantity - 0.0001:
            return jsonify({'error': '보유 수량이 부족합니다.'}), 400

        # 보유 수량보다 약간 많게 입력된 경우 보유 수량으로 조정 (부동소수점 오차)
        if quantity > holding['quantity']:
            quantity = holding['quantity']

        # 현재 주식 가격 조회 - 상세 정보 포함
        stock_data = stock_service.get_cached_stock_data(symbol, max_age_minutes=3)
        if not stock_data:
            stock_data = stock_service.get_stock_info(symbol)

        if not stock_data:
            return jsonify({'error': '주식 정보를 찾을 수 없습니다.'}), 404

        current_price = stock_data['current_price']
        market = holding['market']

        # 외화 주식인 경우 환율 적용하여 원화로 변환
        if market != 'KRW' and stock_data.get('exchange_rate'):
            current_price_krw = current_price * stock_data['exchange_rate']
        else:
            current_price_krw = current_price

        # 총 거래 금액 계산
        total_amount = round(quantity * current_price_krw, 2)
        commission = calculate_commission(total_amount, market)

        total_amount = int(round(total_amount))
        commission = int(round(commission))
        net_amount = total_amount - commission

        # 거래 실행
        user_model = User()

        # 보유 수량 업데이트
        new_quantity = holding['quantity'] - quantity
        portfolio_model.update_holding(user_id, symbol, new_quantity, holding['avg_price'], holding.get('original_avg_price'), 'long')

        # 거래 기록 저장 (매수 단가 포함)
        stock_name = stock_data.get('name', symbol)
        original_price_val = current_price if market != 'KRW' else None
        ex_rate = stock_data.get('exchange_rate') if market != 'KRW' else None
        portfolio_model.record_transaction(
            user_id, symbol, 'sell', quantity, current_price_krw, commission, market,
            name=stock_name, original_price=original_price_val, exchange_rate=ex_rate,
            cost_price=holding['avg_price']
        )

        # 사용자 잔액 업데이트 (원자적 증가)
        user_model.adjust_balance(user_id, net_amount)

        updated_user = user_model.find_by_id(user_id)
        new_balance = updated_user['balance']

        profit_loss = (current_price_krw - holding['avg_price']) * quantity

        return jsonify({
            'message': '매도가 완료되었습니다.',
            'data': {
                'symbol': symbol,
                'quantity': quantity,
                'price': current_price_krw,
                'total_amount': total_amount,
                'commission': commission,
                'net_amount': net_amount,
                'profit_loss': profit_loss,
                'remaining_balance': new_balance
            }
        }), 200

    except Exception as e:
        logging.error(f"매도 에러: {e}")
        return jsonify({'error': '서버 에러가 발생했습니다.'}), 500

@portfolio_bp.route('/short-sell', methods=['POST'])
def short_sell_stock():
    """공매도 - 숏 포지션 오픈"""
    try:
        user_data, error = verify_auth()
        if error:
            return jsonify({'error': error}), 401

        user_id = user_data['user_id']
        data = request.get_json()

        if not data:
            return jsonify({'error': '요청 데이터가 없습니다.'}), 400

        symbol = data.get('symbol')
        quantity = data.get('quantity')

        if not symbol or not quantity:
            return jsonify({'error': '주식 심볼과 수량을 입력해주세요.'}), 400

        quantity = float(quantity)
        quantity = round(quantity, Config.FRACTIONAL_DECIMALS)

        if quantity <= 0:
            return jsonify({'error': '수량은 0보다 커야 합니다.'}), 400

        # 현재 주식 가격 조회
        stock_data = stock_service.get_cached_stock_data(symbol, max_age_minutes=3)
        if not stock_data:
            stock_data = stock_service.get_stock_info(symbol)

        if not stock_data:
            return jsonify({'error': '주식 정보를 찾을 수 없습니다.'}), 404

        current_price = stock_data['current_price']
        market = stock_data.get('market', stock_data.get('currency', 'KRW'))

        if market != 'KRW' and stock_data.get('exchange_rate'):
            current_price_krw = current_price * stock_data['exchange_rate']
        else:
            current_price_krw = current_price

        # 증거금 계산 (매도대금 × 150%)
        sell_amount = round(quantity * current_price_krw, 2)
        margin_required = int(round(sell_amount * Config.SHORT_MARGIN_RATE))

        if user_data['balance'] < margin_required:
            return jsonify({'error': f'증거금이 부족합니다. 필요 증거금: ₩{margin_required:,}'}), 400

        portfolio_model = Portfolio()
        user_model = User()

        # 기존 숏 포지션 확인
        existing_short = portfolio_model.get_holding(user_id, symbol, 'short')

        if existing_short:
            # 기존 숏에 추가
            total_quantity = existing_short['quantity'] + quantity
            total_value = (existing_short['quantity'] * existing_short['avg_price']) + sell_amount
            new_avg_price = total_value / total_quantity
            portfolio_model.update_holding(user_id, symbol, total_quantity, new_avg_price, None, 'short')
        else:
            portfolio_model.add_holding(user_id, symbol, quantity, current_price_krw, market, None, 'short')

        # 거래 기록 저장
        stock_name = stock_data.get('name', symbol)
        portfolio_model.record_transaction(
            user_id, symbol, 'short_sell', quantity, current_price_krw, 0, market,
            name=stock_name
        )

        # 증거금 차감 (원자적)
        if not user_model.adjust_balance(user_id, -margin_required):
            return jsonify({'error': '증거금이 부족합니다.'}), 400

        updated_user = user_model.find_by_id(user_id)
        new_balance = updated_user['balance']

        return jsonify({
            'message': '공매도가 완료되었습니다.',
            'data': {
                'symbol': symbol,
                'quantity': quantity,
                'price': current_price_krw,
                'margin_required': margin_required,
                'remaining_balance': new_balance
            }
        }), 200

    except Exception as e:
        logging.error(f"공매도 에러: {e}")
        return jsonify({'error': '서버 에러가 발생했습니다.'}), 500

@portfolio_bp.route('/short-cover', methods=['POST'])
def short_cover_stock():
    """숏 커버 - 숏 포지션 청산"""
    try:
        user_data, error = verify_auth()
        if error:
            return jsonify({'error': error}), 401

        user_id = user_data['user_id']
        data = request.get_json()

        if not data:
            return jsonify({'error': '요청 데이터가 없습니다.'}), 400

        symbol = data.get('symbol')
        quantity = data.get('quantity')

        if not symbol or not quantity:
            return jsonify({'error': '주식 심볼과 수량을 입력해주세요.'}), 400

        quantity = float(quantity)
        quantity = round(quantity, Config.FRACTIONAL_DECIMALS)

        if quantity <= 0:
            return jsonify({'error': '수량은 0보다 커야 합니다.'}), 400

        portfolio_model = Portfolio()
        holding = portfolio_model.get_holding(user_id, symbol, 'short')

        if not holding:
            return jsonify({'error': '숏 포지션이 없습니다.'}), 400

        if holding['quantity'] < quantity - 0.0001:
            return jsonify({'error': '숏 포지션 수량이 부족합니다.'}), 400

        if quantity > holding['quantity']:
            quantity = holding['quantity']

        # 현재 주식 가격 조회
        stock_data = stock_service.get_cached_stock_data(symbol, max_age_minutes=3)
        if not stock_data:
            stock_data = stock_service.get_stock_info(symbol)

        if not stock_data:
            return jsonify({'error': '주식 정보를 찾을 수 없습니다.'}), 404

        current_price = stock_data['current_price']
        market = holding['market']

        if market != 'KRW' and stock_data.get('exchange_rate'):
            current_price_krw = current_price * stock_data['exchange_rate']
        else:
            current_price_krw = current_price

        # P&L 계산 (매도가 - 현재 매수가)
        entry_price = holding['avg_price']
        profit_loss = (entry_price - current_price_krw) * quantity

        # 증거금 반환 (청산 비율만큼)
        margin_per_unit = entry_price * Config.SHORT_MARGIN_RATE
        margin_return = int(round(margin_per_unit * quantity))

        # 수수료
        cover_amount = round(quantity * current_price_krw, 2)
        commission = int(round(calculate_commission(cover_amount, market)))

        # 반환금 = 증거금 + 손익 - 수수료
        net_return = margin_return + int(round(profit_loss)) - commission

        # 포지션 업데이트
        new_quantity = holding['quantity'] - quantity
        portfolio_model.update_holding(user_id, symbol, new_quantity, holding['avg_price'], None, 'short')

        # 거래 기록 저장
        stock_name = stock_data.get('name', symbol)
        portfolio_model.record_transaction(
            user_id, symbol, 'short_cover', quantity, current_price_krw, commission, market,
            name=stock_name, cost_price=entry_price
        )

        user_model = User()
        user_model.adjust_balance(user_id, net_return)

        updated_user = user_model.find_by_id(user_id)
        new_balance = updated_user['balance']

        return jsonify({
            'message': '숏 커버가 완료되었습니다.',
            'data': {
                'symbol': symbol,
                'quantity': quantity,
                'entry_price': entry_price,
                'cover_price': current_price_krw,
                'profit_loss': int(round(profit_loss)),
                'commission': commission,
                'margin_return': margin_return,
                'net_return': net_return,
                'remaining_balance': new_balance
            }
        }), 200

    except Exception as e:
        logging.error(f"숏 커버 에러: {e}")
        return jsonify({'error': '서버 에러가 발생했습니다.'}), 500

@portfolio_bp.route('/transactions', methods=['GET'])
def get_transactions():
    """거래 이력 조회"""
    try:
        # 인증 검증
        user_data, error = verify_auth()
        if error:
            return jsonify({'error': error}), 401

        user_id = user_data['user_id']
        limit = request.args.get('limit', 50, type=int)

        portfolio_model = Portfolio()
        transactions = portfolio_model.get_user_transactions(user_id, limit)

        # ObjectId를 문자열로 변환, datetime 직렬화
        for transaction in transactions:
            transaction['_id'] = str(transaction['_id'])
            transaction['user_id'] = str(transaction['user_id'])
            if transaction.get('timestamp'):
                transaction['timestamp'] = transaction['timestamp'].isoformat()
            # 이전 거래 데이터 호환 (name 필드 없는 경우)
            if 'name' not in transaction:
                transaction['name'] = transaction.get('symbol', '')

        return jsonify({
            'data': transactions
        }), 200

    except Exception as e:
        logging.error(f"거래 이력 조회 에러: {e}")
        return jsonify({'error': '서버 에러가 발생했습니다.'}), 500

@portfolio_bp.route('/max-buy/<symbol>', methods=['GET'])
def calculate_max_buy(symbol):
    """전량매수 가능 수량 및 금액 계산 (소수점 지원)"""
    try:
        # 인증 검증
        user_data, error = verify_auth()
        if error:
            return jsonify({'error': error}), 401

        # 현재 주식 가격 조회 - 상세 정보 포함
        stock_data = stock_service.get_cached_stock_data(symbol, max_age_minutes=3)
        if not stock_data:
            stock_data = stock_service.get_stock_info(symbol)

        if not stock_data:
            return jsonify({'error': '주식 정보를 찾을 수 없습니다.'}), 404

        current_price = stock_data['current_price']
        market = stock_data.get('market', stock_data.get('currency', 'KRW'))

        # 외화 주식인 경우 환율 적용하여 원화로 변환
        if market != 'KRW' and stock_data.get('exchange_rate'):
            current_price_krw = current_price * stock_data['exchange_rate']
        else:
            current_price_krw = current_price

        # 사용자 보유 자금
        available_cash = user_data['balance']

        # 예상 수수료 율 계산 (시간외 거래 시 인상)
        from services.stock_service import StockService
        commission_rate = Config.COMMISSION_RATE.get(market, 0.001)
        if not StockService.is_market_open(market):
            commission_rate *= Config.AFTER_HOURS_COMMISSION_MULTIPLIER

        min_commission = Config.MIN_COMMISSION.get(market, 1000)

        # 소수점 전량매수 수량 계산 (소수 4자리)
        raw_max = (available_cash - min_commission) / (current_price_krw * (1 + commission_rate))
        max_quantity_frac = math.floor(raw_max * 10000) / 10000
        max_quantity_int = math.floor(raw_max)

        if max_quantity_frac <= 0:
            return jsonify({
                'data': {
                    'max_quantity': 0,
                    'max_quantity_int': 0,
                    'max_quantity_frac': 0,
                    'estimated_amount': 0,
                    'estimated_commission': 0,
                    'total_cost': 0,
                    'estimated_amount_int': 0,
                    'estimated_commission_int': 0,
                    'total_cost_int': 0,
                    'current_price': current_price_krw,
                    'available_cash': available_cash,
                    'message': '전량매수 가능한 자금이 부족합니다.'
                }
            }), 200

        # 소수점 전량매수 금액 계산
        estimated_amount = max_quantity_frac * current_price_krw
        estimated_commission = calculate_commission(estimated_amount, market)
        total_cost = estimated_amount + estimated_commission

        estimated_amount = int(round(estimated_amount))
        estimated_commission = int(round(estimated_commission))
        total_cost = int(round(total_cost))

        # 잔액 부족 시 소수점 수량 감소 (0.0001 단위)
        while total_cost > available_cash and max_quantity_frac > 0:
            max_quantity_frac = round(max_quantity_frac - 0.0001, 4)
            estimated_amount = max_quantity_frac * current_price_krw
            estimated_commission = calculate_commission(estimated_amount, market)
            total_cost = estimated_amount + estimated_commission

            estimated_amount = int(round(estimated_amount))
            estimated_commission = int(round(estimated_commission))
            total_cost = int(round(total_cost))

        # 정수 전량매수 금액 계산
        estimated_amount_int = int(round(max_quantity_int * current_price_krw))
        estimated_commission_int = int(round(calculate_commission(max_quantity_int * current_price_krw, market)))
        total_cost_int = estimated_amount_int + estimated_commission_int

        # 잔액 부족 시 정수 수량 감소
        while total_cost_int > available_cash and max_quantity_int > 0:
            max_quantity_int -= 1
            estimated_amount_int = int(round(max_quantity_int * current_price_krw))
            estimated_commission_int = int(round(calculate_commission(max_quantity_int * current_price_krw, market)))
            total_cost_int = estimated_amount_int + estimated_commission_int

        return jsonify({
            'data': {
                'max_quantity': max_quantity_frac,
                'max_quantity_int': max_quantity_int,
                'max_quantity_frac': max_quantity_frac,
                'estimated_amount': estimated_amount,
                'estimated_commission': estimated_commission,
                'total_cost': total_cost,
                'estimated_amount_int': estimated_amount_int,
                'estimated_commission_int': estimated_commission_int,
                'total_cost_int': total_cost_int,
                'current_price': current_price_krw,
                'original_price': current_price if market != 'KRW' else None,
                'available_cash': available_cash,
                'remaining_cash': available_cash - total_cost
            }
        }), 200

    except Exception as e:
        logging.error(f"전량매수 계산 에러: {e}")
        return jsonify({'error': '서버 에러가 발생했습니다.'}), 500

@portfolio_bp.route('/summary', methods=['GET'])
def get_portfolio_summary():
    """포트폴리오 요약 정보"""
    try:
        # 인증 검증
        user_data, error = verify_auth()
        if error:
            return jsonify({'error': error}), 401

        user_id = user_data['user_id']
        portfolio_model = Portfolio()

        # 포트폴리오 조회
        holdings = portfolio_model.get_user_portfolio(user_id)

        # 현재 가격 정보로 계산 (환율 적용)
        current_prices = {}
        for holding in holdings:
            symbol = holding['symbol']

            # 상세 주식 정보 조회 (환율 포함)
            stock_data = stock_service.get_cached_stock_data(symbol, max_age_minutes=3)
            if not stock_data:
                stock_data = stock_service.get_stock_info(symbol)

            if stock_data:
                current_price = stock_data['current_price']

                # 미국 주식인 경우 환율 적용
                if stock_data.get('currency') != 'KRW' and stock_data.get('exchange_rate'):
                    current_price_krw = current_price * stock_data['exchange_rate']
                else:
                    current_price_krw = current_price

                current_prices[symbol] = current_price_krw

        total_value = portfolio_model.calculate_portfolio_value(user_id, current_prices)
        total_profit_loss = portfolio_model.calculate_profit_loss(user_id, current_prices)

        # 투자 원금 계산 (평균 단가 * 수량의 합)
        total_investment = sum(holding['avg_price'] * holding['quantity'] for holding in holdings)

        # 수익률 계산
        return_rate = (total_profit_loss / total_investment * 100) if total_investment > 0 else 0

        return jsonify({
            'data': {
                'total_value': total_value,
                'total_investment': total_investment,
                'total_profit_loss': total_profit_loss,
                'return_rate': return_rate,
                'cash_balance': user_data['balance'],
                'total_assets': total_value + user_data['balance'],
                'holdings_count': len(holdings)
            }
        }), 200

    except Exception as e:
        logging.error(f"포트폴리오 요약 조회 에러: {e}")
        return jsonify({'error': '서버 에러가 발생했습니다.'}), 500
