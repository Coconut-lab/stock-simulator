from flask import Blueprint, request, jsonify
from services.auth_service import auth_service
from services.stock_service import stock_service
from models.portfolio import Portfolio
from models.user import User
from config import Config
import logging

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
        current_prices = {}
        
        for holding in holdings:
            symbol = holding['symbol']
            
            # 상세 주식 정보 조회 (환율 포함)
            stock_data = stock_service.get_cached_stock_data(symbol)
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
                
                holding_value = holding['quantity'] * current_price_krw
                profit_loss = (current_price_krw - holding['avg_price']) * holding['quantity']
                profit_loss_percent = (profit_loss / (holding['avg_price'] * holding['quantity'])) * 100 if holding['avg_price'] > 0 else 0
                
                # 원래 통화 기준 손익 계산 (해외 주식)
                original_profit_loss = None
                original_profit_loss_percent = None
                purchase_price_original = None
                if stock_data.get('currency') != 'KRW' and stock_data.get('exchange_rate'):
                    # 저장된 원래 통화 평균가 사용, 없으면 현재 환율로 역산 (근사값)
                    purchase_price_original = holding.get('original_avg_price') or (holding['avg_price'] / stock_data['exchange_rate'])
                    original_profit_loss = (current_price - purchase_price_original) * holding['quantity']
                    if purchase_price_original > 0:
                        original_profit_loss_percent = ((current_price - purchase_price_original) / purchase_price_original) * 100

                portfolio_item = {
                    'symbol': symbol,
                    'name': stock_data.get('name', symbol),
                    'quantity': holding['quantity'],
                    'purchase_price': holding['avg_price'],  # 이미 환율 적용된 원화 가격
                    'current_price': current_price_krw,  # 환율 적용된 원화 가격
                    'original_price': current_price if stock_data.get('currency') != 'KRW' else None,
                    'purchase_price_original': purchase_price_original,
                    'holding_value': holding_value,
                    'profit_loss': profit_loss,
                    'profit_loss_percent': profit_loss_percent,
                    'original_profit_loss': original_profit_loss,
                    'original_profit_loss_percent': original_profit_loss_percent,
                    'market': holding['market'],
                    'currency': stock_data.get('currency', 'KRW'),
                    'exchange_rate': stock_data.get('exchange_rate') if stock_data.get('currency') != 'KRW' else None
                }
                
                portfolio_with_prices.append(portfolio_item)
        
        # 포트폴리오 총 가치 계산
        total_value = portfolio_model.calculate_portfolio_value(user_id, current_prices)
        total_profit_loss = portfolio_model.calculate_profit_loss(user_id, current_prices)
        
        return jsonify({
            'data': {
                'holdings': portfolio_with_prices,
                'total_value': total_value,
                'total_profit_loss': total_profit_loss,
                'cash': user_data['balance']
            }
        }), 200
        
    except Exception as e:
        logging.error(f"포트폴리오 조회 에러: {e}")
        return jsonify({'error': '서버 에러가 발생했습니다.'}), 500

@portfolio_bp.route('/buy', methods=['POST'])
def buy_stock():
    """주식 매수"""
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
        
        if quantity <= 0:
            return jsonify({'error': '수량은 0보다 커야 합니다.'}), 400
        
        # 현재 주식 가격 조회 - 상세 정보 포함
        stock_data = stock_service.get_cached_stock_data(symbol)
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
        total_amount = quantity * current_price_krw
        commission = calculate_commission(total_amount, market)
        
        # 소수점 완전 제거를 위해 정수로 변환
        total_amount = int(round(total_amount))
        commission = int(round(commission))
        
        # 보유 현금이 정수가 되도록 추가 조정
        total_cost = total_amount + commission
        
        # 보유 현금을 깔끔하게 떨어뜨리기 위해 필요시 수수료 조정
        remaining_balance = user_data['balance'] - total_cost
        
        # 소수점이 있으면 수수료에 소수점만큼 추가하여 정수로 맞춤
        if abs(remaining_balance - round(remaining_balance)) > 0.01:  # 소수점 오차 허용
            decimal_adjustment = round(remaining_balance) - remaining_balance
            commission += int(round(decimal_adjustment))
            total_cost = total_amount + commission
        
        # 잔액 확인
        if user_data['balance'] < total_cost:
            return jsonify({'error': '잔액이 부족합니다.'}), 400
        
        # 거래 실행
        portfolio_model = Portfolio()
        user_model = User()
        
        # 기존 보유 종목 확인
        existing_holding = portfolio_model.get_holding(user_id, symbol)
        
        # 원래 통화 평균 단가 계산
        is_foreign = market != 'KRW' and stock_data.get('exchange_rate')
        if existing_holding:
            # 기존 보유 종목이 있으면 평균 단가 재계산
            total_quantity = existing_holding['quantity'] + quantity
            total_value = (existing_holding['quantity'] * existing_holding['avg_price']) + total_amount
            new_avg_price = total_value / total_quantity

            new_original_avg = None
            if is_foreign:
                old_orig = existing_holding.get('original_avg_price') or (existing_holding['avg_price'] / stock_data['exchange_rate'])
                total_orig_value = (existing_holding['quantity'] * old_orig) + (quantity * current_price)
                new_original_avg = total_orig_value / total_quantity

            portfolio_model.update_holding(user_id, symbol, total_quantity, new_avg_price, new_original_avg)
        else:
            # 새로운 종목 추가 (환율 적용된 원화 가격으로 저장)
            original_avg = current_price if is_foreign else None
            portfolio_model.add_holding(user_id, symbol, quantity, current_price_krw, market, original_avg)
        
        # 거래 기록 저장
        stock_name = stock_data.get('name', symbol)
        original_price = current_price if market != 'KRW' else None
        ex_rate = stock_data.get('exchange_rate') if market != 'KRW' else None
        portfolio_model.record_transaction(
            user_id, symbol, 'buy', quantity, current_price_krw, commission, market,
            name=stock_name, original_price=original_price, exchange_rate=ex_rate
        )

        # 사용자 잔액 업데이트 (정수로 보장)
        new_balance = int(round(user_data['balance'] - total_cost))
        user_model.update_balance(user_id, new_balance)

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
    """주식 매도"""
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
        
        if quantity <= 0:
            return jsonify({'error': '수량은 0보다 커야 합니다.'}), 400
        
        # 보유 종목 확인
        portfolio_model = Portfolio()
        holding = portfolio_model.get_holding(user_id, symbol)
        
        if not holding:
            return jsonify({'error': '보유하지 않은 종목입니다.'}), 400
        
        if holding['quantity'] < quantity:
            return jsonify({'error': '보유 수량이 부족합니다.'}), 400
        
        # 현재 주식 가격 조회 - 상세 정보 포함
        stock_data = stock_service.get_cached_stock_data(symbol)
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

        # 총 거래 금액 계산 (환율 적용된 원화 가격 사용)
        total_amount = quantity * current_price_krw
        commission = calculate_commission(total_amount, market)

        # 소수점 완전 제거를 위해 정수로 변환
        total_amount = int(round(total_amount))
        commission = int(round(commission))
        net_amount = total_amount - commission
        
        # 거래 실행
        user_model = User()
        
        # 보유 수량 업데이트
        new_quantity = holding['quantity'] - quantity
        portfolio_model.update_holding(user_id, symbol, new_quantity, holding['avg_price'], holding.get('original_avg_price'))
        
        # 거래 기록 저장
        stock_name = stock_data.get('name', symbol)
        original_price_val = current_price if market != 'KRW' else None
        ex_rate = stock_data.get('exchange_rate') if market != 'KRW' else None
        portfolio_model.record_transaction(
            user_id, symbol, 'sell', quantity, current_price_krw, commission, market,
            name=stock_name, original_price=original_price_val, exchange_rate=ex_rate
        )

        # 사용자 잔액 업데이트 (정수로 보장)
        new_balance = int(round(user_data['balance'] + net_amount))
        user_model.update_balance(user_id, new_balance)
        
        # 손익 계산
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
    """전량매수 가능 수량 및 금액 계산"""
    try:
        # 인증 검증
        user_data, error = verify_auth()
        if error:
            return jsonify({'error': error}), 401
        
        # 현재 주식 가격 조회 - 상세 정보 포함
        stock_data = stock_service.get_cached_stock_data(symbol)
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
        
        # 전량매수 가능 수량 계산
        # (available_cash - min_commission) / (current_price_krw * (1 + commission_rate))
        max_quantity = int((available_cash - min_commission) / (current_price_krw * (1 + commission_rate)))
        
        if max_quantity <= 0:
            return jsonify({
                'data': {
                    'max_quantity': 0,
                    'estimated_amount': 0,
                    'estimated_commission': 0,
                    'total_cost': 0,
                    'current_price': current_price_krw,
                    'available_cash': available_cash,
                    'message': '전량매수 가능한 자금이 부족합니다.'
                }
            }), 200
        
        # 실제 거래 금액 및 수수료 계산
        estimated_amount = max_quantity * current_price_krw
        estimated_commission = calculate_commission(estimated_amount, market)
        total_cost = estimated_amount + estimated_commission
        
        # 소수점 제거
        estimated_amount = int(round(estimated_amount))
        estimated_commission = int(round(estimated_commission))
        total_cost = int(round(total_cost))
        
        # 잔액 부족 시 수량 1개 감소
        while total_cost > available_cash and max_quantity > 0:
            max_quantity -= 1
            estimated_amount = max_quantity * current_price_krw
            estimated_commission = calculate_commission(estimated_amount, market)
            total_cost = estimated_amount + estimated_commission
            
            estimated_amount = int(round(estimated_amount))
            estimated_commission = int(round(estimated_commission))
            total_cost = int(round(total_cost))
        
        return jsonify({
            'data': {
                'max_quantity': max_quantity,
                'estimated_amount': estimated_amount,
                'estimated_commission': estimated_commission,
                'total_cost': total_cost,
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
            stock_data = stock_service.get_cached_stock_data(symbol)
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
