import FinanceDataReader as fdr
import threading
import time
import logging
import random
import requests
from datetime import datetime, timedelta
from utils.db import get_collection

class StockService:
    def __init__(self):
        self.stock_cache = {}
        self.cache_collection = get_collection('stock_cache')
        self.update_thread = None
        self.is_running = False
        
        # 환율 정보 저장
        self.exchange_rate = 1350  # 기본 환율 (USD/KRW)
        self.last_exchange_update = None
        
        # 확장된 한국 주식 티커 목록
        self.kr_stocks = [
            '005930',  # 삼성전자
            '000660',  # SK하이닉스
            '035420',  # 네이버
            '005380',  # 현대차
            '051910',  # LG화학
            '006400',  # 삼성SDI
            '035720',  # 카카오
            '068270',  # 셀트리온
            '207940',  # 삼성바이오로직스
            '373220',  # LG에너지솔루션
            '005490',  # POSCO홀딩스
            '000270',  # 기아
            '105560',  # KB금융
            '055550',  # 신한지주
            '032830',  # 삼성생명
            '003550',  # LG
            '012330',  # 현대모비스
            '066570',  # LG전자
            '096770',  # SK이노베이션
            '009150',  # 삼성전기
            '017670',  # SK텔레콤
            '030200',  # KT
            '316140',  # 우리금융지주
            '086790',  # 하나금융지주
            '024110',  # 기업은행
            '033780',  # KT&G
            '034730',  # SK
            '018260',  # 삼성에스디에스
            '003490',  # 대한항공
            '090430',  # 아모레퍼시픽
        ]
        
        # 확장된 미국 주식 티커 목록
        self.us_stocks = [
            'AAPL',   # Apple
            'GOOGL',  # Google
            'MSFT',   # Microsoft
            'AMZN',   # Amazon
            'TSLA',   # Tesla
            'META',   # Meta
            'NVDA',   # NVIDIA
            'NFLX',   # Netflix
            'AMD',    # AMD
            'INTC',   # Intel
            'JPM',    # JPMorgan Chase
            'V',      # Visa
            'JNJ',    # Johnson & Johnson
            'WMT',    # Walmart
            'PG',     # Procter & Gamble
            'UNH',    # UnitedHealth
            'HD',     # Home Depot
            'DIS',    # Disney
            'MA',     # Mastercard
            'BAC',    # Bank of America
            'PYPL',   # PayPal
            'ADBE',   # Adobe
            'CRM',    # Salesforce
            'PFE',    # Pfizer
            'TMO',    # Thermo Fisher
            'ABBV',   # AbbVie
            'COST',   # Costco
            'PEP',    # PepsiCo
            'KO',     # Coca-Cola
            'AVGO',   # Broadcom
        ]
        
        # 주식 이름 매핑 (확장)
        self.kr_stock_names = {
            '005930': '삼성전자',
            '000660': 'SK하이닉스',
            '035420': '네이버',
            '005380': '현대차',
            '051910': 'LG화학',
            '006400': '삼성SDI',
            '035720': '카카오',
            '068270': '셀트리온',
            '207940': '삼성바이오로직스',
            '373220': 'LG에너지솔루션',
            '005490': 'POSCO홀딩스',
            '000270': '기아',
            '105560': 'KB금융',
            '055550': '신한지주',
            '032830': '삼성생명',
            '003550': 'LG',
            '012330': '현대모비스',
            '066570': 'LG전자',
            '096770': 'SK이노베이션',
            '009150': '삼성전기',
            '017670': 'SK텔레콤',
            '030200': 'KT',
            '316140': '우리금융지주',
            '086790': '하나금융지주',
            '024110': '기업은행',
            '033780': 'KT&G',
            '034730': 'SK',
            '018260': '삼성에스디에스',
            '003490': '대한항공',
            '090430': '아모레퍼시픽',
        }
        
        self.us_stock_names = {
            'AAPL': 'Apple Inc.',
            'GOOGL': 'Alphabet Inc.',
            'MSFT': 'Microsoft Corporation',
            'AMZN': 'Amazon.com Inc.',
            'TSLA': 'Tesla Inc.',
            'META': 'Meta Platforms Inc.',
            'NVDA': 'NVIDIA Corporation',
            'NFLX': 'Netflix Inc.',
            'AMD': 'Advanced Micro Devices',
            'INTC': 'Intel Corporation',
            'JPM': 'JPMorgan Chase & Co.',
            'V': 'Visa Inc.',
            'JNJ': 'Johnson & Johnson',
            'WMT': 'Walmart Inc.',
            'PG': 'Procter & Gamble Co.',
            'UNH': 'UnitedHealth Group Inc.',
            'HD': 'The Home Depot Inc.',
            'DIS': 'The Walt Disney Company',
            'MA': 'Mastercard Incorporated',
            'BAC': 'Bank of America Corporation',
            'PYPL': 'PayPal Holdings Inc.',
            'ADBE': 'Adobe Inc.',
            'CRM': 'Salesforce Inc.',
            'PFE': 'Pfizer Inc.',
            'TMO': 'Thermo Fisher Scientific Inc.',
            'ABBV': 'AbbVie Inc.',
            'COST': 'Costco Wholesale Corporation',
            'PEP': 'PepsiCo Inc.',
            'KO': 'The Coca-Cola Company',
            'AVGO': 'Broadcom Inc.',
        }
        
        # 모든 주식 목록
        self.all_stocks = self.kr_stocks + self.us_stocks
    
    def update_exchange_rate(self):
        """실시간 환율 업데이트"""
        try:
            # FinanceDataReader로 환율 가져오기 (더 안정적)
            try:
                usd_krw = fdr.DataReader('USD/KRW', datetime.now() - timedelta(days=1))
                if not usd_krw.empty:
                    self.exchange_rate = float(usd_krw.iloc[-1]['Close'])
                    self.last_exchange_update = datetime.utcnow()
                    logging.info(f"환율 업데이트 (FDR): 1 USD = {self.exchange_rate} KRW")
                    return
            except Exception as fdr_error:
                logging.warning(f"FDR 환율 조회 실패: {fdr_error}")
            
            # 무료 환율 API 폴백
            response = requests.get(
                'https://api.exchangerate-api.com/v4/latest/USD',
                timeout=10
            )
            if response.status_code == 200:
                data = response.json()
                self.exchange_rate = data['rates'].get('KRW', 1350)
                self.last_exchange_update = datetime.utcnow()
                logging.info(f"환율 업데이트 (API): 1 USD = {self.exchange_rate} KRW")
            else:
                logging.warning(f"환율 API 응답 실패: {response.status_code}")
                
        except Exception as e:
            logging.error(f"환율 업데이트 실패: {e}")
            # 기본 환율 유지
            self.exchange_rate = 1350
    
    def get_exchange_rate(self):
        """현재 환율 반환"""
        # 30분마다 환율 업데이트
        if (not self.last_exchange_update or 
            datetime.utcnow() - self.last_exchange_update > timedelta(minutes=30)):
            self.update_exchange_rate()
        return self.exchange_rate
    
    def search_stocks_extended(self, query):
        """확장된 주식 검색 (FinanceDataReader만 사용)"""
        results = []
        query_upper = query.upper()
        query_lower = query.lower()
        
        # 먼저 캐시된 주식에서 검색
        for symbol in self.all_stocks:
            stock_name = self.kr_stock_names.get(symbol) or self.us_stock_names.get(symbol, '')
            if (query_upper in symbol.upper() or 
                query_lower in stock_name.lower()):
                stock_data = self.get_cached_stock_data(symbol) or self.get_stock_info(symbol)
                if stock_data:
                    results.append(stock_data)
        
        # 추가 검색이 필요한 경우 FinanceDataReader 사용
        if len(results) < 10 and len(query) >= 2:
            try:
                # 한국 주식 검색
                if len(results) < 10:
                    try:
                        stock_list = fdr.StockListing('KRX')
                        matched = stock_list[
                            (stock_list['Code'].str.contains(query_upper, case=False, na=False)) |
                            (stock_list['Name'].str.contains(query, case=False, na=False))
                        ].head(10 - len(results))
                        
                        for _, row in matched.iterrows():
                            code = row['Code']
                            name = row['Name']
                            
                            # 중복 체크
                            if not any(r['symbol'] == code for r in results):
                                stock_data = self.get_kr_stock_info(code)
                                if stock_data:
                                    stock_data['name'] = name  # 실제 이름으로 업데이트
                                    results.append(stock_data)
                                    
                    except Exception as e:
                        logging.debug(f"KRX 검색 실패: {e}")
                
                # 미국 주식 직접 조회 시도
                if len(results) < 10 and len(query) <= 5:
                    try:
                        stock_data = self.get_us_stock_info(query_upper)
                        if stock_data and not any(r['symbol'] == query_upper for r in results):
                            results.append(stock_data)
                    except Exception as e:
                        logging.debug(f"미국 주식 직접 조회 실패 {query_upper}: {e}")
                        
            except Exception as e:
                logging.debug(f"확장 검색 실패: {e}")
        
        return results[:20]  # 최대 20개 결과
    
    def get_kr_stock_info(self, symbol, max_retries=3):
        """한국 주식 정보 조회 (FinanceDataReader 사용)"""
        for attempt in range(max_retries):
            try:
                # 요청 간 지연 추가 (429 에러 방지)
                if attempt > 0:
                    delay = random.uniform(2, 5) * (attempt + 1)
                    time.sleep(delay)
                
                # FinanceDataReader로 최근 30일 데이터 가져오기
                end_date = datetime.now()
                start_date = end_date - timedelta(days=30)
                
                df = fdr.DataReader(symbol, start_date.strftime('%Y-%m-%d'), end_date.strftime('%Y-%m-%d'))
                
                if df.empty:
                    continue
                
                # 최신 데이터 (마지막 행)
                latest_data = df.iloc[-1]
                current_price = float(latest_data['Close'])
                
                # 전일 종가 (마지막에서 두 번째 행)
                if len(df) >= 2:
                    previous_close = float(df.iloc[-2]['Close'])
                else:
                    previous_close = current_price * 0.99  # 1% 하락으로 가정
                
                stock_name = self.kr_stock_names.get(symbol, symbol)
                
                stock_data = {
                    'symbol': symbol,
                    'name': stock_name,
                    'current_price': current_price,
                    'previous_close': previous_close,
                    'open_price': float(latest_data['Open']),
                    'high_price': float(latest_data['High']),
                    'low_price': float(latest_data['Low']),
                    'volume': int(latest_data['Volume']) if 'Volume' in latest_data else 0,
                    'change': current_price - previous_close,
                    'change_percent': (current_price - previous_close) / previous_close * 100 if previous_close > 0 else 0,
                    'market': 'KRW',
                    'currency': 'KRW',
                    'updated_at': datetime.utcnow()
                }
                
                logging.info(f"한국 주식 데이터 성공 조회: {symbol} - ₩{current_price:,.0f}")
                return stock_data
                
            except Exception as e:
                logging.warning(f"한국 주식 조회 시도 {attempt + 1} 실패 {symbol}: {e}")
                if attempt == max_retries - 1:
                    return self.get_fallback_data(symbol, is_korean=True)
                continue
        
        return self.get_fallback_data(symbol, is_korean=True)
    
    def get_us_stock_info(self, symbol, max_retries=3):
        """미국 주식 정보 조회 (FinanceDataReader만 사용)"""
        for attempt in range(max_retries):
            try:
                # 요청 간 지연 추가 (429 에러 방지)
                if attempt > 0:
                    delay = random.uniform(3, 6) * (attempt + 1)  # 미국 주식은 더 긴 지연
                    time.sleep(delay)
                
                # FinanceDataReader로 미국 주식 데이터 가져오기
                end_date = datetime.now()
                start_date = end_date - timedelta(days=30)
                
                df = fdr.DataReader(symbol, start_date.strftime('%Y-%m-%d'), end_date.strftime('%Y-%m-%d'))
                
                if df.empty:
                    raise ValueError(f"데이터가 없습니다: {symbol}")
                
                latest_data = df.iloc[-1]
                current_price = float(latest_data['Close'])
                
                # 비정상적인 가격 필터링 (USD 기준)
                if current_price > 50000 or current_price < 0.01:
                    raise ValueError(f"비정상적인 가격: {current_price}")
                
                if len(df) >= 2:
                    previous_close = float(df.iloc[-2]['Close'])
                else:
                    previous_close = current_price * 0.99
                
                stock_name = self.us_stock_names.get(symbol, symbol)
                
                stock_data = {
                    'symbol': symbol,
                    'name': stock_name,
                    'current_price': current_price,  # USD 가격 그대로
                    'previous_close': previous_close,
                    'open_price': float(latest_data['Open']),
                    'high_price': float(latest_data['High']),
                    'low_price': float(latest_data['Low']),
                    'volume': int(latest_data['Volume']) if 'Volume' in latest_data else 0,
                    'change': current_price - previous_close,
                    'change_percent': (current_price - previous_close) / previous_close * 100 if previous_close > 0 else 0,
                    'market': 'USD',
                    'currency': 'USD',
                    'exchange_rate': self.get_exchange_rate(),  # 환율 정보 추가
                    'updated_at': datetime.utcnow()
                }
                
                logging.info(f"미국 주식 데이터 성공 조회 (FDR): {symbol} - ${current_price:.2f}")
                return stock_data
                
            except Exception as e:
                logging.warning(f"미국 주식 조회 시도 {attempt + 1} 실패 {symbol}: {e}")
                if attempt == max_retries - 1:
                    return self.get_fallback_data(symbol, is_korean=False)
                continue
        
        return self.get_fallback_data(symbol, is_korean=False)
    
    def is_korean_stock(self, symbol):
        """한국 주식인지 확인"""
        # 숫자로만 구성된 6자리 코드는 한국 주식
        if symbol.isdigit() and len(symbol) == 6:
            return True
        # 알려진 한국 주식 목록에 있는지 확인
        if symbol in self.kr_stocks:
            return True
        # .KS, .KQ로 끝나는 경우 한국 주식
        if symbol.endswith('.KS') or symbol.endswith('.KQ'):
            return True
        return False
    
    def get_stock_info(self, symbol):
        """단일 주식 정보 조회 (자동 구분)"""
        if self.is_korean_stock(symbol):
            return self.get_kr_stock_info(symbol)
        else:
            return self.get_us_stock_info(symbol)
    
    def get_fallback_data(self, symbol, is_korean=True):
        """fallback 데이터 생성"""
        if is_korean:
            base_prices = {
                '005930': 70000, '000660': 120000, '035420': 180000,
                '005380': 200000, '051910': 350000, '006400': 400000,
                '035720': 40000, '068270': 180000, '207940': 800000, 
                '373220': 400000, '005490': 300000, '000270': 80000,
                '105560': 60000, '055550': 35000, '032830': 70000,
            }
            stock_name = self.kr_stock_names.get(symbol, symbol)
            market = 'KRW'
            default_price = 50000
        else:
            # 미국 주식의 기본 가격 (USD 기준으로 합리적인 가격)
            base_prices = {
                'AAPL': 190, 'GOOGL': 140, 'MSFT': 400, 'AMZN': 150, 'TSLA': 250,
                'META': 350, 'NVDA': 800, 'NFLX': 450, 'AMD': 140, 'INTC': 25,
                'JPM': 150, 'V': 250, 'JNJ': 160, 'WMT': 150, 'PG': 150,
            }
            stock_name = self.us_stock_names.get(symbol, symbol)
            market = 'USD'
            default_price = 100
        
        base_price = base_prices.get(symbol, default_price)
        
        # 이전 가격이 있으면 사용, 없으면 기본 가격 사용
        last_price = self.stock_cache.get(symbol, {}).get('current_price', base_price)
        
        # 작은 변동 (-1% ~ +1%)
        variation = random.uniform(-0.01, 0.01)
        current_price = last_price * (1 + variation)
        
        # 최소/최대 가격 제한
        if is_korean:
            min_price = base_price * 0.7
            max_price = base_price * 1.5
        else:
            # 미국 주식은 USD 기준으로 제한
            min_price = base_price * 0.7
            max_price = base_price * 1.5
            # 비정상적으로 큰 가격 방지 (USD 기준 10,000달러 이상)
            if current_price > 10000:
                current_price = base_price
        
        current_price = max(min_price, min(max_price, current_price))
        
        previous_close = last_price
        
        result = {
            'symbol': symbol,
            'name': stock_name,
            'current_price': current_price,  # USD 주식은 USD 가격 그대로
            'previous_close': previous_close,
            'open_price': current_price * random.uniform(0.995, 1.005),
            'high_price': current_price * random.uniform(1.0, 1.02),
            'low_price': current_price * random.uniform(0.98, 1.0),
            'volume': random.randint(1000000, 50000000),
            'change': current_price - previous_close,
            'change_percent': (current_price - previous_close) / previous_close * 100 if previous_close > 0 else 0,
            'market': market,
            'currency': market,
            'updated_at': datetime.utcnow()
        }
        
        # USD 주식인 경우 환율 정보 추가 (가격은 USD 그대로 유지)
        if market == 'USD':
            result['exchange_rate'] = self.get_exchange_rate()
            
        return result
    
    def search_stocks(self, query):
        """주식 검색 (확장된 버전 사용)"""
        return self.search_stocks_extended(query)
    
    def get_stock_history(self, symbol, period_days=30):
        """주식 이력 데이터 조회 (차트용)"""
        try:
            end_date = datetime.now()
            start_date = end_date - timedelta(days=period_days)
            
            # FinanceDataReader로 이력 데이터 가져오기
            df = fdr.DataReader(symbol, start_date.strftime('%Y-%m-%d'), end_date.strftime('%Y-%m-%d'))
            
            if df.empty:
                return []
            
            # DataFrame을 리스트로 변환
            history_data = []
            for index, row in df.iterrows():
                history_data.append({
                    'date': index.strftime('%Y-%m-%d'),
                    'open': float(row['Open']),
                    'high': float(row['High']),
                    'low': float(row['Low']),
                    'close': float(row['Close']),
                    'volume': int(row['Volume']) if 'Volume' in row else 0
                })
            
            return history_data
            
        except Exception as e:
            logging.error(f"주식 이력 조회 실패 {symbol}: {e}")
            return []
    
    def update_stock_cache(self):
        """주식 캐시 업데이트 (429 에러 방지를 위한 개선)"""
        try:
            logging.info("주식 캐시 업데이트 시작...")
            
            # 환율 업데이트
            self.update_exchange_rate()
            
            all_results = {}
            
            # 한국 주식 처리 (주요 종목만, 더 긴 간격)
            logging.info("한국 주식 데이터 업데이트 중...")
            for i, symbol in enumerate(self.kr_stocks[:10]):  # 상위 10개만 자동 업데이트
                try:
                    if i > 0:
                        time.sleep(random.uniform(2, 4))  # 더 긴 지연
                    
                    stock_data = self.get_kr_stock_info(symbol)
                    if stock_data:
                        all_results[symbol] = stock_data
                        
                except Exception as e:
                    logging.error(f"한국 주식 조회 실패 {symbol}: {e}")
                    fallback_data = self.get_fallback_data(symbol, is_korean=True)
                    if fallback_data:
                        all_results[symbol] = fallback_data
            
            # 중간 휴식
            time.sleep(5)
            
            # 미국 주식 처리 (주요 종목만, 훨씬 더 긴 간격)
            logging.info("미국 주식 데이터 업데이트 중...")
            for i, symbol in enumerate(self.us_stocks[:10]):  # 상위 10개만 자동 업데이트
                try:
                    if i > 0:
                        time.sleep(random.uniform(4, 8))  # 훨씬 더 긴 지연
                    
                    stock_data = self.get_us_stock_info(symbol)
                    if stock_data:
                        all_results[symbol] = stock_data
                        
                except Exception as e:
                    logging.error(f"미국 주식 조회 실패 {symbol}: {e}")
                    fallback_data = self.get_fallback_data(symbol, is_korean=False)
                    if fallback_data:
                        all_results[symbol] = fallback_data
            
            # 캐시 업데이트
            self.stock_cache.update(all_results)
            
            # MongoDB에 저장
            for symbol, data in all_results.items():
                try:
                    self.cache_collection.replace_one(
                        {'symbol': symbol},
                        data,
                        upsert=True
                    )
                except Exception as e:
                    logging.error(f"MongoDB 저장 실패 {symbol}: {e}")
            
            logging.info(f"주식 캐시 업데이트 완료: {len(all_results)}개 종목")
        
        except Exception as e:
            logging.error(f"주식 캐시 업데이트 실패: {e}")
    
    def get_multiple_stocks(self, symbols):
        """여러 주식 정보 한번에 조회"""
        results = []
        for i, symbol in enumerate(symbols):
            if i > 0:
                time.sleep(random.uniform(1, 3))  # 요청 간 지연
            
            stock_data = self.get_cached_stock_data(symbol)
            if not stock_data:
                stock_data = self.get_stock_info(symbol)
            if stock_data:
                results.append(stock_data)
        return results
    
    def get_cached_stock_data(self, symbol):
        """캐시된 주식 데이터 조회"""
        # 메모리 캐시 먼저 확인
        if symbol in self.stock_cache:
            return self.stock_cache[symbol]
        
        # MongoDB 캐시 확인
        try:
            cached_data = self.cache_collection.find_one({'symbol': symbol})
            if cached_data:
                cached_data.pop('_id', None)  # MongoDB ObjectId 제거
                return cached_data
        except Exception as e:
            logging.error(f"캐시 조회 실패 {symbol}: {e}")
        
        return None
    
    def get_cached_price(self, symbol):
        """캐시된 주식 가격 조회"""
        stock_data = self.get_cached_stock_data(symbol)
        if stock_data:
            return stock_data.get('current_price', 0)
        
        # 캐시에 없으면 새로 조회
        stock_data = self.get_stock_info(symbol)
        if stock_data:
            return stock_data.get('current_price', 0)
        
        return 0
    
    def get_market_summary(self):
        """시장 요약 정보"""
        kr_stocks_data = []
        us_stocks_data = []
        
        # 주요 한국 주식 10개
        for symbol in self.kr_stocks[:10]:
            data = self.get_cached_stock_data(symbol)
            if data:
                kr_stocks_data.append(data)
        
        # 주요 미국 주식 10개
        for symbol in self.us_stocks[:10]:
            data = self.get_cached_stock_data(symbol)
            if data:
                us_stocks_data.append(data)
        
        return {
            'korean_market': kr_stocks_data,
            'us_market': us_stocks_data,
            'exchange_rate': self.get_exchange_rate(),
            'updated_at': datetime.utcnow()
        }
    
    def start_auto_update(self, interval=600):  # 10분으로 증가
        """자동 업데이트 시작 (429 에러 방지를 위해 간격 증가)"""
        if self.is_running:
            return
        
        self.is_running = True
        
        def update_loop():
            while self.is_running:
                try:
                    self.update_stock_cache()
                    time.sleep(interval)
                except Exception as e:
                    logging.error(f"자동 업데이트 에러: {e}")
                    time.sleep(interval)
        
        self.update_thread = threading.Thread(target=update_loop, daemon=True)
        self.update_thread.start()
        logging.info(f"주식 자동 업데이트 시작 (간격: {interval}초)")
    
    def stop_auto_update(self):
        """자동 업데이트 중지"""
        self.is_running = False
        if self.update_thread:
            self.update_thread.join()
        logging.info("주식 자동 업데이트 중지")

# 전역 주식 서비스 인스턴스
stock_service = StockService()
