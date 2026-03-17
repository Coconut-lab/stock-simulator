import FinanceDataReader as fdr
import threading
import time
import logging
import random
import math
import requests
from datetime import datetime, timedelta, timezone
from utils.db import get_collection
from config import Config

def safe_float(value, default=0.0):
    """NaN/Inf를 안전하게 처리하여 JSON 직렬화 가능한 값 반환"""
    try:
        f = float(value)
        if math.isnan(f) or math.isinf(f):
            return default
        return f
    except (TypeError, ValueError):
        return default

class StockService:
    def __init__(self):
        self.cache_collection = get_collection('stock_cache')
        self.listing_collection = get_collection('stock_listings')
        self.update_thread = None
        self.is_running = False

        self.listing_loaded = False

        # 환율 정보 저장
        self.exchange_rates = {
            'USD': 1350,
            'HKD': 170,
            'EUR': 1450,
            'GBP': 1700,
        }
        self.prev_exchange_rates = dict(self.exchange_rates)
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
        
        # 홍콩 주식 티커 목록
        self.hk_stocks = [
            '0700',  # Tencent
            '9988',  # Alibaba
            '0005',  # HSBC
            '1299',  # AIA Group
            '0388',  # HKEX
            '0941',  # China Mobile
            '2318',  # Ping An
            '0883',  # CNOOC
            '1810',  # Xiaomi
            '3690',  # Meituan
        ]

        self.hk_stock_names = {
            '0700': 'Tencent Holdings',
            '9988': 'Alibaba Group',
            '0005': 'HSBC Holdings',
            '1299': 'AIA Group',
            '0388': 'HKEX',
            '0941': 'China Mobile',
            '2318': 'Ping An Insurance',
            '0883': 'CNOOC',
            '1810': 'Xiaomi Corp',
            '3690': 'Meituan',
        }

        # 유럽 주식 티커 목록 (yfinance 심볼 형식)
        self.eu_stocks = [
            'AZN.L',   # AstraZeneca (LSE)
            'SHEL.L',  # Shell (LSE)
            'HSBA.L',  # HSBC (LSE)
            'ULVR.L',  # Unilever (LSE)
            'BP.L',    # BP (LSE)
            'SAP.DE',  # SAP (Frankfurt)
            'SIE.DE',  # Siemens (Frankfurt)
            'ALV.DE',  # Allianz (Frankfurt)
            'BMW.DE',  # BMW (Frankfurt)
            'BAS.DE',  # BASF (Frankfurt)
        ]

        self.eu_stock_names = {
            'AZN.L': 'AstraZeneca',
            'SHEL.L': 'Shell plc',
            'HSBA.L': 'HSBC Holdings',
            'ULVR.L': 'Unilever plc',
            'BP.L': 'BP plc',
            'SAP.DE': 'SAP SE',
            'SIE.DE': 'Siemens AG',
            'ALV.DE': 'Allianz SE',
            'BMW.DE': 'BMW AG',
            'BAS.DE': 'BASF SE',
        }

        # 모든 주식 목록
        self.all_stocks = self.kr_stocks + self.us_stocks + self.hk_stocks + self.eu_stocks

        # 서버 시작 시 종목 리스트 백그라운드 로드
        threading.Thread(target=self._load_stock_listings, daemon=True).start()

    def _save_listings(self, market, listings_dict):
        """종목 리스트를 MongoDB에 벌크 저장"""
        if not listings_dict:
            return
        ops = []
        from pymongo import UpdateOne
        for symbol, name in listings_dict.items():
            ops.append(UpdateOne(
                {'symbol': symbol, 'market': market},
                {'$set': {'symbol': symbol, 'name': name, 'market': market}},
                upsert=True
            ))
        if ops:
            try:
                self.listing_collection.bulk_write(ops, ordered=False)
            except Exception as e:
                logging.error(f"{market} 종목 벌크 저장 실패: {e}")

    def _load_stock_listings(self):
        """KRX + US + HKEX 전체 종목 리스트를 MongoDB에 저장"""
        # 인덱스 생성 (최초 1회)
        try:
            self.listing_collection.create_index([('market', 1)])
            self.listing_collection.create_index([('symbol', 1), ('market', 1)], unique=True)
            self.listing_collection.create_index([('name', 1)])
        except Exception:
            pass

        # KRX (코스피 + 코스닥)
        try:
            df = fdr.StockListing('KRX')
            krx = {}
            for _, row in df.iterrows():
                code = str(row['Code']).strip()
                name = str(row['Name']).strip()
                if code and name:
                    krx[code] = name
            self._save_listings('KRW', krx)
            logging.info(f"KRX 종목 리스트 로드 완료: {len(krx)}개")
        except Exception as e:
            logging.error(f"KRX 종목 리스트 로드 실패: {e}")

        # US (NASDAQ + NYSE + S&P500)
        try:
            us = {}
            for market in ['NASDAQ', 'NYSE', 'S&P500']:
                try:
                    df = fdr.StockListing(market)
                    for _, row in df.iterrows():
                        symbol = str(row.get('Symbol', row.get('Code', ''))).strip()
                        name = str(row.get('Name', '')).strip()
                        if symbol and name and symbol not in us:
                            us[symbol] = name
                except Exception as e:
                    logging.warning(f"{market} 종목 리스트 로드 실패: {e}")
            self._save_listings('USD', us)
            logging.info(f"US 종목 리스트 로드 완료: {len(us)}개")
        except Exception as e:
            logging.error(f"US 종목 리스트 로드 실패: {e}")

        # HKEX (홍콩)
        try:
            df = fdr.StockListing('HKEX')
            hk = {}
            for _, row in df.iterrows():
                code = str(row.get('Code', row.get('Symbol', ''))).strip()
                name = str(row.get('Name', '')).strip()
                if code and name:
                    if code.isdigit() and not code.startswith('8'):
                        code = code.lstrip('0') or '0'
                        code = code.zfill(4)
                    if code not in hk:
                        hk[code] = name
            self._save_listings('HKD', hk)
            logging.info(f"HKEX 종목 리스트 로드 완료: {len(hk)}개")
        except Exception as e:
            logging.error(f"HKEX 종목 리스트 로드 실패: {e}")

        # 유럽 종목
        self._load_eu_listings()

        self.listing_loaded = True

    def _load_eu_listings(self):
        """유럽 주요 지수 구성 종목을 Wikipedia에서 자동 로드 → MongoDB 저장"""
        import pandas as pd
        from io import StringIO

        wiki_indices = {
            'FTSE100': ('https://en.wikipedia.org/wiki/FTSE_100_Index', '.L'),
            'FTSE250': ('https://en.wikipedia.org/wiki/FTSE_250_Index', '.L'),
            'DAX': ('https://en.wikipedia.org/wiki/DAX', ''),
            'MDAX': ('https://en.wikipedia.org/wiki/MDAX', '.DE'),
            'CAC40': ('https://en.wikipedia.org/wiki/CAC_40', ''),
            'AEX': ('https://en.wikipedia.org/wiki/AEX_index', ''),
            'SMI': ('https://en.wikipedia.org/wiki/Swiss_Market_Index', ''),
            'FTSE_MIB': ('https://en.wikipedia.org/wiki/FTSE_MIB', ''),
            'IBEX35': ('https://en.wikipedia.org/wiki/IBEX_35', ''),
            'OMX30': ('https://en.wikipedia.org/wiki/OMX_Stockholm_30', ''),
            'BEL20': ('https://en.wikipedia.org/wiki/BEL_20', '.BR'),
            'PSI20': ('https://en.wikipedia.org/wiki/PSI-20', '.LS'),
            'OBX': ('https://en.wikipedia.org/wiki/OBX_Index', '.OL'),
            'OMXC25': ('https://en.wikipedia.org/wiki/OMX_Copenhagen_25', '.CO'),
            'OMXH25': ('https://en.wikipedia.org/wiki/OMX_Helsinki_25', ''),
        }

        headers = {'User-Agent': 'Mozilla/5.0 (compatible; StockSimulator/1.0)'}
        eu_suffixes = ('.L', '.DE', '.PA', '.AS', '.MI', '.MC', '.SW', '.ST', '.CO',
                       '.BR', '.LS', '.OL', '.HE', '.VI')

        eu = {}
        for index_name, (url, suffix) in wiki_indices.items():
            try:
                html = requests.get(url, headers=headers, timeout=10).text
                tables = pd.read_html(StringIO(html))

                for table in tables:
                    cols_lower = {str(c).lower(): c for c in table.columns}
                    tk_col = None
                    nm_col = None
                    for key, orig in cols_lower.items():
                        if 'ticker' in key or 'symbol' in key:
                            tk_col = orig
                        if 'company' in key or 'name' in key:
                            nm_col = orig

                    if tk_col is None:
                        continue

                    count = 0
                    for _, row in table.iterrows():
                        ticker = str(row.get(tk_col, '')).strip()
                        company = str(row.get(nm_col, '')).strip() if nm_col else ''

                        if not ticker or ticker == 'nan':
                            continue
                        if ':' in ticker:
                            ticker = ticker.split(':')[-1].strip()
                        if ' ' in ticker:
                            ticker = ticker.replace(' ', '-')
                        if suffix and not any(ticker.endswith(s) for s in eu_suffixes):
                            ticker = ticker + suffix

                        if ticker not in eu:
                            eu[ticker] = company if company and company != 'nan' else ticker
                            count += 1

                    logging.info(f"{index_name} 종목 {count}개 로드 완료")
                    break

            except Exception as e:
                logging.warning(f"{index_name} 종목 로드 실패: {e}")

        # fallback
        fallback = {
            'AZN.L': 'AstraZeneca', 'SHEL.L': 'Shell plc', 'HSBA.L': 'HSBC Holdings',
            'ULVR.L': 'Unilever plc', 'BP.L': 'BP plc', 'GSK.L': 'GSK plc',
            'RIO.L': 'Rio Tinto', 'BA.L': 'BAE Systems', 'RR.L': 'Rolls-Royce',
            'GLEN.L': 'Glencore', 'BARC.L': 'Barclays', 'LLOY.L': 'Lloyds Banking',
            'VOD.L': 'Vodafone Group', 'DGE.L': 'Diageo', 'LSEG.L': 'London Stock Exchange',
            'SAP.DE': 'SAP SE', 'SIE.DE': 'Siemens AG', 'ALV.DE': 'Allianz SE',
            'BMW.DE': 'BMW AG', 'BAS.DE': 'BASF SE', 'MBG.DE': 'Mercedes-Benz',
            'RHM.DE': 'Rheinmetall AG', 'DTE.DE': 'Deutsche Telekom', 'ADS.DE': 'Adidas AG',
            'VOW3.DE': 'Volkswagen AG', 'IFX.DE': 'Infineon Technologies',
            'DBK.DE': 'Deutsche Bank', 'ENR.DE': 'Siemens Energy', 'MTX.DE': 'MTU Aero Engines',
            'MC.PA': 'LVMH', 'OR.PA': "L'Oreal", 'TTE.PA': 'TotalEnergies',
            'SAN.PA': 'Sanofi', 'AI.PA': 'Air Liquide', 'BNP.PA': 'BNP Paribas',
            'SAF.PA': 'Safran', 'HO.PA': 'Thales', 'AIR.PA': 'Airbus SE',
            'ASML.AS': 'ASML Holding', 'PHIA.AS': 'Philips', 'INGA.AS': 'ING Group',
            'NESN.SW': 'Nestle', 'ROG.SW': 'Roche', 'NOVN.SW': 'Novartis',
            'UBSG.SW': 'UBS Group', 'ABBN.SW': 'ABB Ltd',
            'RACE.MI': 'Ferrari', 'ENI.MI': 'Eni SpA', 'ENEL.MI': 'Enel SpA',
            'UCG.MI': 'UniCredit', 'ISP.MI': 'Intesa Sanpaolo',
            'SAN.MC': 'Banco Santander', 'ITX.MC': 'Inditex', 'IBE.MC': 'Iberdrola',
            'NOVO-B.CO': 'Novo Nordisk', 'MAERSK-B.CO': 'Maersk',
            'VOLV-B.ST': 'Volvo', 'ERIC-B.ST': 'Ericsson',
        }
        for ticker, name in fallback.items():
            if ticker not in eu:
                eu[ticker] = name

        self._save_listings('EUR', eu)
        logging.info(f"EU 종목 리스트 로드 완료: {len(eu)}개")

    def update_exchange_rate(self):
        """실시간 환율 업데이트 (USD, HKD, EUR, GBP → KRW)"""
        try:
            self.prev_exchange_rates = dict(self.exchange_rates)
            # USD/KRW
            try:
                usd_krw = fdr.DataReader('USD/KRW', datetime.now() - timedelta(days=1))
                if not usd_krw.empty:
                    self.exchange_rates['USD'] = float(usd_krw.iloc[-1]['Close'])
            except Exception:
                pass

            # 무료 API로 나머지 환율
            try:
                response = requests.get(
                    'https://api.exchangerate-api.com/v4/latest/USD',
                    timeout=10
                )
                if response.status_code == 200:
                    rates = response.json().get('rates', {})
                    usd_krw = self.exchange_rates['USD']
                    # HKD → KRW = USD/KRW ÷ USD/HKD
                    if 'HKD' in rates and rates['HKD'] > 0:
                        self.exchange_rates['HKD'] = usd_krw / rates['HKD']
                    # EUR → KRW = USD/KRW ÷ USD/EUR
                    if 'EUR' in rates and rates['EUR'] > 0:
                        self.exchange_rates['EUR'] = usd_krw / rates['EUR']
                    # GBP → KRW
                    if 'GBP' in rates and rates['GBP'] > 0:
                        self.exchange_rates['GBP'] = usd_krw / rates['GBP']
            except Exception as e:
                logging.warning(f"환율 API 조회 실패: {e}")

            self.last_exchange_update = datetime.utcnow()
            logging.info(f"환율 업데이트: USD={self.exchange_rates['USD']:.0f}, HKD={self.exchange_rates['HKD']:.0f}, EUR={self.exchange_rates['EUR']:.0f}")

        except Exception as e:
            logging.error(f"환율 업데이트 실패: {e}")

    def get_exchange_rate(self, currency='USD'):
        """현재 환율 반환"""
        if (not self.last_exchange_update or
            datetime.utcnow() - self.last_exchange_update > timedelta(minutes=30)):
            self.update_exchange_rate()
        return self.exchange_rates.get(currency, 1350)

    @staticmethod
    def is_market_open(market):
        """해당 시장이 현재 개장 중인지 확인"""
        info = Config.MARKET_INFO.get(market)
        if not info:
            return True  # 알 수 없는 시장은 항상 열림 처리

        utc_now = datetime.now(timezone.utc)
        offset = timedelta(hours=info['utc_offset'])
        local_now = utc_now + offset

        # 주말 체크
        if info.get('weekdays_only') and local_now.weekday() >= 5:
            return False

        open_time = local_now.replace(hour=info['open_hour'], minute=info['open_min'], second=0)
        close_time = local_now.replace(hour=info['close_hour'], minute=info['close_min'], second=0)
        return open_time <= local_now <= close_time

    @staticmethod
    def get_all_market_status():
        """모든 시장의 현재 상태 반환"""
        utc_now = datetime.now(timezone.utc)
        kst_offset = timedelta(hours=9)  # KST = UTC+9
        result = {}
        for market, info in Config.MARKET_INFO.items():
            offset = timedelta(hours=info['utc_offset'])
            local_now = utc_now + offset

            is_weekend = local_now.weekday() >= 5
            open_time = local_now.replace(hour=info['open_hour'], minute=info['open_min'], second=0)
            close_time = local_now.replace(hour=info['close_hour'], minute=info['close_min'], second=0)
            is_open = (not is_weekend) and (open_time <= local_now <= close_time)

            # 현지 개장/폐장 시간을 KST로 변환
            hour_diff = 9 - info['utc_offset']  # KST와의 시차
            open_total_min = (info['open_hour'] + hour_diff) * 60 + info['open_min']
            close_total_min = (info['close_hour'] + hour_diff) * 60 + info['close_min']
            open_hour_kst = (open_total_min // 60) % 24
            open_min_kst = open_total_min % 60
            close_hour_kst = (close_total_min // 60) % 24
            close_min_kst = close_total_min % 60

            commission_rate = Config.COMMISSION_RATE.get(market, 0.001)
            multiplier = Config.AFTER_HOURS_COMMISSION_MULTIPLIER if not is_open else 1

            kst_now = utc_now + kst_offset

            result[market] = {
                'name': info['name'],
                'is_open': is_open,
                'is_weekend': is_weekend,
                'local_time': local_now.strftime('%H:%M'),
                'kst_time': kst_now.strftime('%H:%M'),
                'open_time': f"{info['open_hour']:02d}:{info['open_min']:02d}",
                'close_time': f"{info['close_hour']:02d}:{info['close_min']:02d}",
                'open_time_kst': f"{open_hour_kst:02d}:{open_min_kst:02d}",
                'close_time_kst': f"{close_hour_kst:02d}:{close_min_kst:02d}",
                'currency_symbol': info['currency_symbol'],
                'commission_rate': commission_rate,
                'commission_percent': f"{commission_rate * 100:.3f}%",
                'current_commission_rate': commission_rate * multiplier,
                'current_commission_percent': f"{commission_rate * multiplier * 100:.3f}%",
                'is_after_hours': not is_open,
                'after_hours_multiplier': Config.AFTER_HOURS_COMMISSION_MULTIPLIER,
            }
        return result
    
    def search_stocks(self, query):
        """주식 검색 메인 메서드"""
        return self.search_stocks_extended(query)
    
    def search_stocks_extended(self, query):
        """확장된 주식 검색 - 캐시 우선으로 빠르게 응답"""
        results = []
        found_symbols = set()
        query_upper = query.upper()
        query_lower = query.lower()

        # 모든 이름 매핑 통합
        all_names = {**self.kr_stock_names, **self.us_stock_names, **self.hk_stock_names, **self.eu_stock_names}

        # 1) 등록된 주식 목록에서 이름/심볼 매칭
        for symbol in self.all_stocks:
            stock_name = all_names.get(symbol, '')
            if (query_upper in symbol.upper() or
                query_lower in stock_name.lower()):
                stock_data = self.get_cached_stock_data(symbol)
                if not stock_data:
                    market = self.get_stock_market(symbol)
                    if market in ('HKD', 'EUR'):
                        stock_data = self.get_fallback_data(symbol, market=market)
                    else:
                        stock_data = self.get_fallback_data(symbol, is_korean=(market == 'KRW'))
                if stock_data:
                    if not stock_data.get('name') or stock_data['name'] == symbol:
                        stock_data['name'] = stock_name or symbol
                    results.append(stock_data)
                    found_symbols.add(symbol)

        # 2) MongoDB 종목 리스트에서 추가 검색
        if len(results) < 20:
            import re
            regex = re.compile(re.escape(query), re.IGNORECASE)
            remaining = 20 - len(results)
            try:
                cursor = self.listing_collection.find(
                    {'$or': [{'symbol': regex}, {'name': regex}],
                     'symbol': {'$nin': list(found_symbols)}},
                ).limit(remaining)

                for doc in cursor:
                    sym = doc['symbol']
                    name = doc.get('name', sym)
                    market = doc.get('market', 'KRW')
                    stock_data = self.get_cached_stock_data(sym)
                    if not stock_data:
                        if market == 'KRW':
                            stock_data = self.get_fallback_data(sym, is_korean=True)
                        elif market == 'USD':
                            stock_data = self.get_fallback_data(sym, is_korean=False)
                        else:
                            stock_data = self.get_fallback_data(sym, market=market)
                    if stock_data:
                        stock_data['name'] = name
                        results.append(stock_data)
                        found_symbols.add(sym)
            except Exception as e:
                logging.error(f"종목 검색 DB 조회 실패: {e}")

        return results[:20]
    
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
                
                stock_name = self.kr_stock_names.get(symbol) or self._get_listing_name(symbol) or symbol

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
                
                stock_name = self.us_stock_names.get(symbol) or self._get_listing_name(symbol)
                if not stock_name or stock_name == symbol:
                    try:
                        import yfinance as yf
                        t = yf.Ticker(symbol)
                        t_info = t.info
                        stock_name = t_info.get('shortName') or t_info.get('longName') or symbol
                    except Exception:
                        stock_name = symbol

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
        if symbol.isdigit() and len(symbol) == 6:
            return True
        if symbol in self.kr_stocks:
            return True
        if symbol.endswith('.KS') or symbol.endswith('.KQ'):
            return True
        return False

    def _get_listing_name(self, symbol):
        """MongoDB에서 종목 이름 조회"""
        try:
            doc = self.listing_collection.find_one({'symbol': symbol}, {'name': 1})
            return doc['name'] if doc else None
        except Exception:
            return None

    def is_hk_stock(self, symbol):
        """홍콩 주식인지 확인"""
        if symbol in self.hk_stocks:
            return True
        try:
            if self.listing_collection.find_one({'symbol': symbol, 'market': 'HKD'}, {'_id': 1}):
                return True
        except Exception:
            pass
        # 4자리 이하 숫자이고 한국 주식이 아닌 경우
        if symbol.isdigit() and len(symbol) <= 4:
            return True
        # 5자리 숫자 (GEM 보드 등)
        if symbol.isdigit() and len(symbol) == 5:
            return True
        if symbol.endswith('.HK'):
            return True
        return False

    def is_eu_stock(self, symbol):
        """유럽 주식인지 확인"""
        if symbol in self.eu_stocks:
            return True
        try:
            if self.listing_collection.find_one({'symbol': symbol, 'market': 'EUR'}, {'_id': 1}):
                return True
        except Exception:
            pass
        eu_suffixes = ('.L', '.DE', '.PA', '.AS', '.MI', '.MC', '.SW', '.ST', '.CO',
                       '.BR', '.LS', '.OL', '.HE', '.VI')
        if any(symbol.endswith(s) for s in eu_suffixes):
            return True
        return False

    def get_stock_market(self, symbol):
        """심볼에서 시장 타입 반환"""
        if self.is_korean_stock(symbol):
            return 'KRW'
        elif self.is_hk_stock(symbol):
            return 'HKD'
        elif self.is_eu_stock(symbol):
            return 'EUR'
        else:
            return 'USD'

    def _save_to_cache(self, symbol, data):
        """캐시에 주식 데이터 저장 (MongoDB)"""
        try:
            save_data = {k: v for k, v in data.items() if k != '_id'}
            save_data = self._clean_nan(save_data)
            self.cache_collection.replace_one(
                {'symbol': symbol}, save_data, upsert=True
            )
        except Exception as e:
            logging.error(f"캐시 저장 실패 {symbol}: {e}")

    def get_stock_info(self, symbol):
        """단일 주식 정보 조회 (자동 구분) + 캐시 저장"""
        if self.is_korean_stock(symbol):
            data = self.get_kr_stock_info(symbol)
        elif self.is_hk_stock(symbol):
            data = self.get_hk_stock_info(symbol)
        elif self.is_eu_stock(symbol):
            data = self.get_eu_stock_info(symbol)
        else:
            data = self.get_us_stock_info(symbol)

        if data:
            data = self._clean_nan(data)

        # 실시간 조회 결과를 캐시에 저장
        if data and data.get('current_price', 0) > 0:
            self._save_to_cache(symbol, data)

        return data

    def _hk_yf_symbol(self, symbol):
        """홍콩 주식 심볼을 yfinance 형식으로 변환 (0700 → 0700.HK)"""
        if symbol.endswith('.HK'):
            return symbol
        if symbol.isdigit():
            return f"{symbol}.HK"
        return symbol

    def get_hk_stock_info(self, symbol, max_retries=3):
        """홍콩 주식 정보 조회 (yfinance 사용)"""
        yf_symbol = self._hk_yf_symbol(symbol)
        for attempt in range(max_retries):
            try:
                if attempt > 0:
                    time.sleep(random.uniform(2, 5) * (attempt + 1))

                import yfinance as yf
                ticker = yf.Ticker(yf_symbol)
                df = ticker.history(period='30d')

                if df.empty:
                    continue

                latest_data = df.iloc[-1]
                current_price = float(latest_data['Close'])
                previous_close = float(df.iloc[-2]['Close']) if len(df) >= 2 else current_price * 0.99

                stock_name = self.hk_stock_names.get(symbol) or self._get_listing_name(symbol)
                if not stock_name or stock_name == symbol:
                    try:
                        info = ticker.info
                        stock_name = info.get('shortName') or info.get('longName') or symbol
                    except Exception:
                        stock_name = symbol

                return {
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
                    'market': 'HKD',
                    'currency': 'HKD',
                    'exchange_rate': self.get_exchange_rate('HKD'),
                    'updated_at': datetime.utcnow()
                }

            except Exception as e:
                logging.warning(f"홍콩 주식 조회 시도 {attempt + 1} 실패 {symbol}: {e}")
                if attempt == max_retries - 1:
                    return self.get_fallback_data(symbol, market='HKD')
        return self.get_fallback_data(symbol, market='HKD')

    def get_eu_stock_info(self, symbol, max_retries=3):
        """유럽 주식 정보 조회 (yfinance 사용)"""
        for attempt in range(max_retries):
            try:
                if attempt > 0:
                    time.sleep(random.uniform(2, 5) * (attempt + 1))

                import yfinance as yf
                ticker = yf.Ticker(symbol)
                df = ticker.history(period='30d')

                if df.empty:
                    continue

                latest_data = df.iloc[-1]
                current_price = float(latest_data['Close'])
                previous_close = float(df.iloc[-2]['Close']) if len(df) >= 2 else current_price * 0.99

                stock_name = self.eu_stock_names.get(symbol)
                if not stock_name or stock_name == symbol:
                    try:
                        info = ticker.info
                        stock_name = info.get('shortName') or info.get('longName') or symbol
                    except Exception:
                        stock_name = symbol
                # GBP(.L) vs EUR(.DE, .PA) 구분
                if symbol.endswith('.L'):
                    price_currency = 'GBP'
                else:
                    price_currency = 'EUR'

                return {
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
                    'market': 'EUR',
                    'currency': 'EUR',
                    'price_currency': price_currency,
                    'exchange_rate': self.get_exchange_rate(price_currency),
                    'updated_at': datetime.utcnow()
                }

            except Exception as e:
                logging.warning(f"유럽 주식 조회 시도 {attempt + 1} 실패 {symbol}: {e}")
                if attempt == max_retries - 1:
                    return self.get_fallback_data(symbol, market='EUR')
        return self.get_fallback_data(symbol, market='EUR')
    
    def get_fallback_data(self, symbol, is_korean=True, market=None):
        """fallback 데이터 생성"""
        # market이 명시되면 그걸 사용
        if market == 'HKD':
            stock_name = self.hk_stock_names.get(symbol) or self._get_listing_name(symbol) or symbol
            base_prices = {
                '0700': 350, '9988': 80, '0005': 60, '1299': 70, '0388': 250,
                '0941': 60, '2318': 40, '0883': 10, '1810': 15, '3690': 120,
            }
            base_price = base_prices.get(symbol, 50)
            last_price = (self.get_cached_stock_data(symbol) or {}).get('current_price', base_price)
            variation = random.uniform(-0.01, 0.01)
            current_price = max(base_price * 0.7, min(base_price * 1.5, last_price * (1 + variation)))
            previous_close = last_price
            return {
                'symbol': symbol, 'name': stock_name,
                'current_price': current_price, 'previous_close': previous_close,
                'open_price': current_price * random.uniform(0.995, 1.005),
                'high_price': current_price * random.uniform(1.0, 1.02),
                'low_price': current_price * random.uniform(0.98, 1.0),
                'volume': random.randint(1000000, 50000000),
                'change': current_price - previous_close,
                'change_percent': (current_price - previous_close) / previous_close * 100 if previous_close > 0 else 0,
                'market': 'HKD', 'currency': 'HKD',
                'exchange_rate': self.get_exchange_rate('HKD'),
                'is_estimated': True,
                'updated_at': datetime.utcnow()
            }
        elif market == 'EUR':
            stock_name = self.eu_stock_names.get(symbol) or symbol
            base_prices = {
                'AZN.L': 11000, 'SHEL.L': 2500, 'HSBA.L': 650, 'ULVR.L': 4000, 'BP.L': 450,
                'SAP.DE': 200, 'SIE.DE': 170, 'ALV.DE': 260, 'BMW.DE': 80, 'BAS.DE': 45,
            }
            base_price = base_prices.get(symbol, 100)
            last_price = (self.get_cached_stock_data(symbol) or {}).get('current_price', base_price)
            variation = random.uniform(-0.01, 0.01)
            current_price = max(base_price * 0.7, min(base_price * 1.5, last_price * (1 + variation)))
            previous_close = last_price
            price_currency = 'GBP' if symbol.endswith('.L') else 'EUR'
            return {
                'symbol': symbol, 'name': stock_name,
                'current_price': current_price, 'previous_close': previous_close,
                'open_price': current_price * random.uniform(0.995, 1.005),
                'high_price': current_price * random.uniform(1.0, 1.02),
                'low_price': current_price * random.uniform(0.98, 1.0),
                'volume': random.randint(500000, 20000000),
                'change': current_price - previous_close,
                'change_percent': (current_price - previous_close) / previous_close * 100 if previous_close > 0 else 0,
                'market': 'EUR', 'currency': 'EUR', 'price_currency': price_currency,
                'exchange_rate': self.get_exchange_rate(price_currency),
                'is_estimated': True,
                'updated_at': datetime.utcnow()
            }
        if is_korean:
            base_prices = {
                '005930': 70000, '000660': 120000, '035420': 180000,
                '005380': 200000, '051910': 350000, '006400': 400000,
                '035720': 40000, '068270': 180000, '207940': 800000, 
                '373220': 400000, '005490': 300000, '000270': 80000,
                '105560': 60000, '055550': 35000, '032830': 70000,
            }
            stock_name = self.kr_stock_names.get(symbol) or self._get_listing_name(symbol) or symbol
            market = 'KRW'
            default_price = 50000
        else:
            # 미국 주식의 기본 가격 (USD 기준으로 합리적인 가격)
            base_prices = {
                'AAPL': 190, 'GOOGL': 140, 'MSFT': 400, 'AMZN': 150, 'TSLA': 250,
                'META': 350, 'NVDA': 800, 'NFLX': 450, 'AMD': 140, 'INTC': 25,
                'JPM': 150, 'V': 250, 'JNJ': 160, 'WMT': 150, 'PG': 150,
            }
            stock_name = self.us_stock_names.get(symbol) or self._get_listing_name(symbol) or symbol
            market = 'USD'
            default_price = 100
        
        base_price = base_prices.get(symbol, default_price)
        
        # 이전 가격이 있으면 사용, 없으면 기본 가격 사용
        last_price = (self.get_cached_stock_data(symbol) or {}).get('current_price', base_price)
        
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
            'current_price': current_price,
            'previous_close': previous_close,
            'open_price': current_price * random.uniform(0.995, 1.005),
            'high_price': current_price * random.uniform(1.0, 1.02),
            'low_price': current_price * random.uniform(0.98, 1.0),
            'volume': random.randint(1000000, 50000000),
            'change': current_price - previous_close,
            'change_percent': (current_price - previous_close) / previous_close * 100 if previous_close > 0 else 0,
            'market': market,
            'currency': market,
            'is_estimated': True,
            'updated_at': datetime.utcnow()
        }
        
        # USD 주식인 경우 환율 정보 추가 (가격은 USD 그대로 유지)
        if market == 'USD':
            result['exchange_rate'] = self.get_exchange_rate()
            
        return result

    def get_stock_history(self, symbol, period_days=30, interval='daily'):
        """주식 이력 데이터 조회 (차트용) - 개선된 버전"""
        try:
            # 주간, 월간 데이터는 장기 기간 가져오기
            if interval == 'weekly':
                period_days = max(period_days * 7, 365)  # 최소 1년
            elif interval == 'monthly':
                period_days = max(period_days * 30, 1095)  # 최소 3년
            
            end_date = datetime.now()
            
            # 1일 차트인 경우 시간별 데이터 시도 (외국 주식)
            if period_days == 1 and not self.is_korean_stock(symbol):
                try:
                    import yfinance as yf
                    yf_sym = self._hk_yf_symbol(symbol) if self.is_hk_stock(symbol) else symbol
                    ticker = yf.Ticker(yf_sym)
                    df = ticker.history(period='1d', interval='1h')
                    
                    if not df.empty:
                        history_data = []
                        for index, row in df.iterrows():
                            o = safe_float(row['Open'])
                            h = safe_float(row['High'])
                            l = safe_float(row['Low'])
                            c = safe_float(row['Close'])
                            if o <= 0 or h <= 0 or l <= 0 or c <= 0:
                                continue
                            history_data.append({
                                'date': index.strftime('%Y-%m-%d %H:%M'),
                                'open': o,
                                'high': h,
                                'low': l,
                                'close': c,
                                'volume': int(row['Volume']) if 'Volume' in row else 0
                            })
                        return history_data
                except Exception as e:
                    logging.debug(f"1일 시간별 데이터 조회 실패 {symbol}: {e}")
            
            start_date = end_date - timedelta(days=period_days)

            # 홍콩/유럽 주식은 yfinance 사용
            if self.is_hk_stock(symbol) or self.is_eu_stock(symbol):
                try:
                    import yfinance as yf
                    yf_sym = self._hk_yf_symbol(symbol) if self.is_hk_stock(symbol) else symbol
                    ticker = yf.Ticker(yf_sym)
                    period_map = {30: '1mo', 90: '3mo', 180: '6mo', 365: '1y', 730: '2y', 1095: '3y'}
                    yf_period = '1mo'
                    for days, p in sorted(period_map.items()):
                        if period_days <= days:
                            yf_period = p
                            break
                    else:
                        yf_period = '3y'
                    df = ticker.history(period=yf_period)
                except Exception as e:
                    logging.warning(f"yfinance 이력 조회 실패 {symbol}: {e}")
                    df = fdr.DataReader(symbol, start_date.strftime('%Y-%m-%d'), end_date.strftime('%Y-%m-%d'))
            else:
                # FinanceDataReader로 이력 데이터 가져오기
                df = fdr.DataReader(symbol, start_date.strftime('%Y-%m-%d'), end_date.strftime('%Y-%m-%d'))

            if df.empty:
                return []
            
            # 주간/월간 데이터 처리
            if interval == 'weekly':
                df = df.resample('W').agg({
                    'Open': 'first',
                    'High': 'max',
                    'Low': 'min',
                    'Close': 'last',
                    'Volume': 'sum'
                }).dropna()
            elif interval == 'monthly':
                df = df.resample('M').agg({
                    'Open': 'first',
                    'High': 'max',
                    'Low': 'min',
                    'Close': 'last',
                    'Volume': 'sum'
                }).dropna()
            
            # DataFrame을 리스트로 변환
            history_data = []
            min_price = float('inf')
            max_price = float('-inf')

            for index, row in df.iterrows():
                open_price = safe_float(row['Open'])
                close_price = safe_float(row['Close'])
                high_price = safe_float(row['High'])
                low_price = safe_float(row['Low'])

                # NaN이었던 값(0.0)은 스킵
                if open_price <= 0 or close_price <= 0 or high_price <= 0 or low_price <= 0:
                    continue

                # 최고/최저가 업데이트
                max_price = max(max_price, high_price)
                min_price = min(min_price, low_price)

                history_data.append({
                    'date': index.strftime('%Y-%m-%d'),
                    'open': open_price,
                    'high': high_price,
                    'low': low_price,
                    'close': close_price,
                    'volume': int(row['Volume']) if 'Volume' in row else 0
                })
            
            # 최고/최저 정보 추가
            if history_data:
                # 인덱스 기반으로 최고가/최저가 찾기 (부동소수점 비교 문제 방지)
                highest_idx = 0
                lowest_idx = 0
                for i, data in enumerate(history_data):
                    if data['high'] > history_data[highest_idx]['high']:
                        highest_idx = i
                    if data['low'] < history_data[lowest_idx]['low']:
                        lowest_idx = i

                history_data[highest_idx]['is_highest'] = True
                history_data[highest_idx]['highest_date'] = history_data[highest_idx]['date']
                history_data[lowest_idx]['is_lowest'] = True
                history_data[lowest_idx]['lowest_date'] = history_data[lowest_idx]['date']

                max_price = history_data[highest_idx]['high']
                min_price = history_data[lowest_idx]['low']

                # 첫 번째 요소에 전체 최고/최저 정보 추가
                history_data[0]['chart_info'] = {
                    'min_price': min_price,
                    'max_price': max_price,
                    'price_range': max_price - min_price
                }
            
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

            # 중간 휴식
            time.sleep(5)

            # 홍콩 주식 처리
            logging.info("홍콩 주식 데이터 업데이트 중...")
            for i, symbol in enumerate(self.hk_stocks[:10]):
                try:
                    if i > 0:
                        time.sleep(random.uniform(3, 6))
                    stock_data = self.get_hk_stock_info(symbol)
                    if stock_data:
                        all_results[symbol] = stock_data
                except Exception as e:
                    logging.error(f"홍콩 주식 조회 실패 {symbol}: {e}")
                    fallback_data = self.get_fallback_data(symbol, market='HKD')
                    if fallback_data:
                        all_results[symbol] = fallback_data

            # 중간 휴식
            time.sleep(5)

            # 유럽 주식 처리
            logging.info("유럽 주식 데이터 업데이트 중...")
            for i, symbol in enumerate(self.eu_stocks[:10]):
                try:
                    if i > 0:
                        time.sleep(random.uniform(3, 6))
                    stock_data = self.get_eu_stock_info(symbol)
                    if stock_data:
                        all_results[symbol] = stock_data
                except Exception as e:
                    logging.error(f"유럽 주식 조회 실패 {symbol}: {e}")
                    fallback_data = self.get_fallback_data(symbol, market='EUR')
                    if fallback_data:
                        all_results[symbol] = fallback_data

            # 캐시 업데이트 (_save_to_cache로 메모리+MongoDB 동시 저장)
            for symbol, data in all_results.items():
                self._save_to_cache(symbol, data)

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
        """캐시된 주식 데이터 조회 (MongoDB, 시장 정보 검증 포함)"""
        expected_market = self.get_stock_market(symbol)

        try:
            cached_data = self.cache_collection.find_one({'symbol': symbol})
            if cached_data:
                cached_data.pop('_id', None)
                # datetime → ISO 문자열 변환 (JSON 직렬화 호환)
                for key, val in cached_data.items():
                    if isinstance(val, datetime):
                        cached_data[key] = val.isoformat()
                if cached_data.get('market') == expected_market:
                    return cached_data
                self.cache_collection.delete_one({'symbol': symbol})
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
    
    @staticmethod
    def _parse_index_data(data):
        """지수 데이터에서 최신값과 전일값 추출 (NaN/중복 제거)"""
        if data is None or data.empty:
            return None, None
        clean = data.dropna(subset=['Close'])
        if clean.empty:
            return None, None
        # 중복 종가 제거 (주말에 같은 값이 반복되는 경우)
        closes = clean['Close'].tolist()
        unique_closes = []
        for i in range(len(closes) - 1, -1, -1):
            if not unique_closes or closes[i] != unique_closes[-1]:
                unique_closes.append(closes[i])
            if len(unique_closes) >= 2:
                break
        latest_val = unique_closes[0] if unique_closes else None
        prev_val = unique_closes[1] if len(unique_closes) >= 2 else latest_val
        return latest_val, prev_val

    def get_market_indices(self):
        """주요 시장 지수 정보 조회"""
        indices = []

        index_list = [
            ('KS11',  '코스피',   'KOSPI'),
            ('KQ11',  '코스닥',   'KOSDAQ'),
            ('^GSPC', 'S&P 500', 'SP500'),
            ('^IXIC', '나스닥',   'NASDAQ'),
            ('^HSI',  '항셍',    'HSI'),
            ('^GDAXI','DAX',     'DAX'),
            ('^FTSE', 'FTSE',    'FTSE'),
        ]

        for ticker, name, symbol in index_list:
            try:
                data = fdr.DataReader(ticker, datetime.now() - timedelta(days=14), datetime.now())
                latest_val, prev_val = self._parse_index_data(data)
                if latest_val is not None and prev_val is not None and prev_val != 0:
                    change = latest_val - prev_val
                    change_pct = change / prev_val * 100
                    indices.append({
                        'name': name,
                        'symbol': symbol,
                        'value': safe_float(latest_val),
                        'change': safe_float(change),
                        'change_percent': safe_float(change_pct),
                    })
                else:
                    indices.append({'name': name, 'symbol': symbol, 'value': safe_float(latest_val or 0), 'change': 0.0, 'change_percent': 0.0})
            except Exception as e:
                logging.debug(f"{name} 지수 조회 실패: {e}")
                indices.append({'name': name, 'symbol': symbol, 'value': 0.0, 'change': 0.0, 'change_percent': 0.0})

        return indices
    
    @staticmethod
    def _clean_nan(obj):
        """재귀적으로 NaN/Inf/datetime 값을 JSON 직렬화 가능 값으로 변환"""
        if isinstance(obj, float) and (math.isnan(obj) or math.isinf(obj)):
            return 0.0
        elif isinstance(obj, datetime):
            return obj.isoformat()
        elif isinstance(obj, dict):
            return {k: StockService._clean_nan(v) for k, v in obj.items()}
        elif isinstance(obj, list):
            return [StockService._clean_nan(item) for item in obj]
        return obj

    def get_market_summary(self):
        """시장 요약 정보"""
        kr_stocks_data = []
        us_stocks_data = []
        hk_stocks_data = []
        eu_stocks_data = []

        # 주요 한국 주식 10개
        for symbol in self.kr_stocks[:10]:
            data = self.get_cached_stock_data(symbol)
            if not data:
                data = self.get_fallback_data(symbol, is_korean=True)
            if data:
                kr_stocks_data.append(data)

        # 주요 미국 주식 10개
        for symbol in self.us_stocks[:10]:
            data = self.get_cached_stock_data(symbol)
            if not data:
                data = self.get_fallback_data(symbol, is_korean=False)
            if data:
                us_stocks_data.append(data)

        # 주요 홍콩 주식 10개
        for symbol in self.hk_stocks[:10]:
            data = self.get_cached_stock_data(symbol)
            if not data:
                data = self.get_fallback_data(symbol, market='HKD')
            if data:
                hk_stocks_data.append(data)

        # 주요 유럽 주식 10개
        for symbol in self.eu_stocks[:10]:
            data = self.get_cached_stock_data(symbol)
            if not data:
                data = self.get_fallback_data(symbol, market='EUR')
            if data:
                eu_stocks_data.append(data)

        result = {
            'korean_market': kr_stocks_data,
            'us_market': us_stocks_data,
            'hk_market': hk_stocks_data,
            'eu_market': eu_stocks_data,
            'market_indices': self.get_market_indices(),
            'exchange_rate': self.get_exchange_rate(),
            'exchange_rates': {
                k: {
                    'rate': v,
                    'change': v - self.prev_exchange_rates.get(k, v),
                    'change_percent': ((v - self.prev_exchange_rates.get(k, v)) / self.prev_exchange_rates.get(k, v) * 100) if self.prev_exchange_rates.get(k, v) else 0
                }
                for k, v in self.exchange_rates.items()
            },
            'market_status': self.get_all_market_status(),
            'updated_at': datetime.utcnow()
        }
        return self._clean_nan(result)
    
    def get_market_list(self, market, page=1, per_page=30):
        """시장별 전체 종목 리스트 (페이지네이션, MongoDB)"""
        market_map = {'KRW': 'KRW', 'USD': 'USD', 'HKD': 'HKD', 'EUR': 'EUR'}
        db_market = market_map.get(market)
        if not db_market:
            return {'stocks': [], 'total': 0, 'page': page, 'total_pages': 0}

        try:
            total = self.listing_collection.count_documents({'market': db_market})
        except Exception:
            total = 0
        total_pages = max(1, (total + per_page - 1) // per_page)
        page = max(1, min(page, total_pages))
        skip = (page - 1) * per_page

        stocks = []
        try:
            cursor = self.listing_collection.find({'market': db_market}).skip(skip).limit(per_page)
            for doc in cursor:
                sym = doc['symbol']
                name = doc.get('name', sym)
                data = self.get_cached_stock_data(sym)
                if not data:
                    if market == 'KRW':
                        data = self.get_fallback_data(sym, is_korean=True)
                    elif market == 'USD':
                        data = self.get_fallback_data(sym, is_korean=False)
                    else:
                        data = self.get_fallback_data(sym, market=market)
                if data:
                    if not data.get('name') or data['name'] == sym:
                        data['name'] = name
                    stocks.append(data)
        except Exception as e:
            logging.error(f"시장 목록 DB 조회 실패: {e}")

        return self._clean_nan({
            'stocks': stocks,
            'total': total,
            'page': page,
            'per_page': per_page,
            'total_pages': total_pages,
        })

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
