import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { stockService } from '../services/stockService';
import {
  formatNumber,
  formatPercent,
  getProfitColor,
  formatErrorMessage,
  getMarketFromSymbol,
  formatStockPrice,
  formatStockChange
} from '../utils/helpers';
import styled from 'styled-components';

const Container = styled.div`
  min-height: 100vh;
  background: #f8f9fa;
  padding: 20px;
`;

const Header = styled.div`
  background: white;
  padding: 20px;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);
  margin-bottom: 30px;

  h1 {
    margin: 0;
    color: #333;
    font-size: 28px;
    font-weight: 700;
  }

  p {
    margin: 8px 0 0 0;
    color: #666;
    font-size: 16px;
  }
`;

const ExchangeRateInfo = styled.div`
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 16px 20px;
  border-radius: 8px;
  margin-bottom: 20px;

  .title {
    font-size: 14px;
    opacity: 0.9;
    margin-bottom: 4px;
  }

  .rate {
    font-size: 18px;
    font-weight: 700;
  }
`;

const SearchSection = styled.div`
  background: white;
  padding: 20px;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);
  margin-bottom: 30px;
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 12px 16px;
  border: 2px solid #e1e5e9;
  border-radius: 8px;
  font-size: 16px;
  transition: border-color 0.3s ease;

  &:focus {
    outline: none;
    border-color: #667eea;
  }
`;

const MarketTabs = styled.div`
  display: flex;
  gap: 4px;
  margin-bottom: 30px;
  flex-wrap: wrap;
`;

const TabButton = styled.button`
  padding: 12px 24px;
  border: none;
  background: ${props => props.$active ? '#667eea' : 'white'};
  color: ${props => props.$active ? 'white' : '#666'};
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);

  &:hover {
    background: ${props => props.$active ? '#5a6fd8' : '#f8f9fa'};
  }

  .count {
    font-size: 11px;
    opacity: 0.8;
    margin-left: 4px;
  }
`;

const StockGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
`;

const StockCard = styled.div`
  background: white;
  padding: 20px;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  cursor: pointer;

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
  }
`;

const StockHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
`;

const StockInfo = styled.div`
  .symbol {
      font-size: 14px;
      color: #666;
      margin-bottom: 8px;
  }

  .name {
      font-size: 18px;
      font-weight: 700;
      color: #333;
      margin-bottom: 4px;
  }

  .market {
    font-size: 12px;
    color: #999;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
`;

const StockPrice = styled.div`
  text-align: right;

  .current-price {
    font-size: 20px;
    font-weight: 700;
    color: #333;
    margin-bottom: 4px;
  }

  .original-price {
    font-size: 12px;
    color: #999;
    margin-bottom: 2px;
  }

  .change {
    font-size: 14px;
    font-weight: 600;
    color: ${props => props.$changeColor};
  }
`;

const StockStats = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #eee;
`;

const StatItem = styled.div`
  .label {
    font-size: 12px;
    color: #666;
    margin-bottom: 4px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .value {
    font-size: 14px;
    font-weight: 600;
    color: #333;
  }

  .original-value {
    font-size: 11px;
    color: #999;
    margin-top: 2px;
  }
`;

const LoadingState = styled.div`
  text-align: center;
  padding: 60px;

  .spinner {
    width: 50px;
    height: 50px;
    border: 4px solid #f3f3f3;
    border-top: 4px solid #667eea;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin: 0 auto 20px;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const ErrorMessage = styled.div`
  background: #ffeaea;
  color: #e74c3c;
  padding: 16px;
  border-radius: 8px;
  border-left: 4px solid #e74c3c;
  margin: 20px 0;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 60px 20px;
  color: #666;

  h3 {
    margin: 0 0 8px 0;
    color: #333;
  }

  p {
    margin: 0;
    font-size: 14px;
  }
`;

const Pagination = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  margin-top: 30px;
  flex-wrap: wrap;
`;

const PageButton = styled.button`
  padding: 8px 14px;
  border: 1px solid ${props => props.$active ? '#667eea' : '#ddd'};
  background: ${props => props.$active ? '#667eea' : 'white'};
  color: ${props => props.$active ? 'white' : '#666'};
  border-radius: 6px;
  font-size: 14px;
  font-weight: ${props => props.$active ? '600' : '400'};
  cursor: pointer;
  transition: all 0.2s;

  &:hover:not(:disabled) {
    background: ${props => props.$active ? '#5a6fd8' : '#f0f0f0'};
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`;

const PageInfo = styled.span`
  font-size: 14px;
  color: #666;
  padding: 0 8px;
`;

const Markets = () => {
  const navigate = useNavigate();
  const [marketData, setMarketData] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [activeTab, setActiveTab] = useState('all');
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [error, setError] = useState('');

  // 시장별 전체 리스트 상태
  const [marketList, setMarketList] = useState(null);
  const [marketListLoading, setMarketListLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const PER_PAGE = 30;

  useEffect(() => {
    loadMarketData();
  }, []);

  useEffect(() => {
    if (searchQuery.length > 1) {
      const timer = setTimeout(() => {
        searchStocks();
      }, 300);
      return () => clearTimeout(timer);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]); // eslint-disable-line react-hooks/exhaustive-deps

  const marketKeyMap = { korean: 'KRW', us: 'USD', hk: 'HKD', eu: 'EUR' };

  const loadMarketList = useCallback(async (tab, page) => {
    const market = marketKeyMap[tab];
    if (!market) return;
    try {
      setMarketListLoading(true);
      const response = await stockService.getMarketList(market, page, PER_PAGE);
      setMarketList(response.data);
    } catch (err) {
      console.error('Market list loading error:', err);
      setMarketList(null);
    } finally {
      setMarketListLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (activeTab !== 'all' && !searchQuery) {
      loadMarketList(activeTab, currentPage);
    } else {
      setMarketList(null);
    }
  }, [activeTab, currentPage, searchQuery, loadMarketList]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setCurrentPage(1);
    setMarketList(null);
  };

  const loadMarketData = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await stockService.getMarketSummary();
      setMarketData(response.data);
    } catch (error) {
      console.error('Market data loading error:', error);
      setError(formatErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const searchStocks = async () => {
    try {
      setSearchLoading(true);
      const response = await stockService.searchStocks(searchQuery);
      setSearchResults(response.data);
    } catch (error) {
      console.error('Stock search error:', error);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const getDisplayStocks = () => {
    if (searchResults.length > 0) return searchResults;

    // 시장별 탭에서는 marketList 사용
    if (activeTab !== 'all' && marketList) {
      return marketList.stocks || [];
    }

    if (!marketData) return [];

    // 전체 탭
    return [
      ...(marketData.korean_market || []),
      ...(marketData.us_market || []),
      ...(marketData.hk_market || []),
      ...(marketData.eu_market || []),
    ];
  };

  const handleStockClick = (stock) => {
    navigate(`/stock/${stock.symbol}`);
  };

  const renderStockPrice = (stock) => {
    const market = stock.market || getMarketFromSymbol(stock.symbol);
    const currencySymbols = { USD: '$', HKD: 'HK$', EUR: '€', GBP: '£' };
    const priceSym = currencySymbols[stock.price_currency] || currencySymbols[market] || '';

    return (
      <StockPrice $changeColor={getProfitColor(stock.change || 0)}>
        <div className="current-price">
          {formatStockPrice(stock)}
        </div>
        {market !== 'KRW' && stock.exchange_rate && (
          <div className="original-price">
            {priceSym}{formatNumber(stock.current_price)}
          </div>
        )}
        {stock.change !== undefined && (
          <div className="change">
            {formatStockChange(stock)}
            ({stock.change_percent >= 0 ? '+' : ''}{formatPercent(stock.change_percent)})
          </div>
        )}
      </StockPrice>
    );
  };

  const renderStatValue = (stock, field) => {
    const market = stock.market || getMarketFromSymbol(stock.symbol);
    const value = stock[field] || stock.current_price;
    const currencySymbols = { USD: '$', HKD: 'HK$', EUR: '€', GBP: '£' };
    const priceSym = currencySymbols[stock.price_currency] || currencySymbols[market] || '';

    if (market !== 'KRW' && stock.exchange_rate) {
      const converted = value * stock.exchange_rate;
      return (
        <>
          <div className="value">{formatNumber(Math.round(converted))}</div>
          <div className="original-value">{priceSym}{formatNumber(value)}</div>
        </>
      );
    } else {
      return <div className="value">{formatNumber(value)}</div>;
    }
  };

  const renderPagination = () => {
    if (!marketList || marketList.total_pages <= 1) return null;

    const { page, total_pages, total } = marketList;
    const pages = [];
    const maxVisible = 5;
    let start = Math.max(1, page - Math.floor(maxVisible / 2));
    let end = Math.min(total_pages, start + maxVisible - 1);
    if (end - start < maxVisible - 1) {
      start = Math.max(1, end - maxVisible + 1);
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    return (
      <Pagination>
        <PageButton
          disabled={page <= 1}
          onClick={() => setCurrentPage(1)}
        >
          {'<<'}
        </PageButton>
        <PageButton
          disabled={page <= 1}
          onClick={() => setCurrentPage(p => p - 1)}
        >
          {'<'}
        </PageButton>
        {start > 1 && <PageInfo>...</PageInfo>}
        {pages.map(p => (
          <PageButton
            key={p}
            $active={p === page}
            onClick={() => setCurrentPage(p)}
          >
            {p}
          </PageButton>
        ))}
        {end < total_pages && <PageInfo>...</PageInfo>}
        <PageButton
          disabled={page >= total_pages}
          onClick={() => setCurrentPage(p => p + 1)}
        >
          {'>'}
        </PageButton>
        <PageButton
          disabled={page >= total_pages}
          onClick={() => setCurrentPage(total_pages)}
        >
          {'>>'}
        </PageButton>
        <PageInfo>{total.toLocaleString()}개 종목</PageInfo>
      </Pagination>
    );
  };

  if (loading) {
    return (
      <Container>
        <Header>
          <h1>시장</h1>
          <p>실시간 주식 시장 정보를 확인하세요.</p>
        </Header>
        <LoadingState>
          <div className="spinner"></div>
          <div>시장 데이터를 불러오고 있습니다...</div>
        </LoadingState>
      </Container>
    );
  }

  const displayStocks = getDisplayStocks();

  const tabLabels = {
    all: '전체',
    korean: '한국',
    us: '미국',
    hk: '홍콩',
    eu: '유럽',
  };

  return (
    <Container>
      <Header>
        <h1>시장</h1>
        <p>실시간 주식 시장 정보를 확인하세요.</p>
      </Header>

      {marketData?.exchange_rates && (
        <ExchangeRateInfo>
          <div className="title">현재 환율</div>
          <div className="rate" style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
            <span>1 USD = {formatNumber(Math.round(marketData.exchange_rates.USD))}</span>
            <span>1 HKD = {formatNumber(Math.round(marketData.exchange_rates.HKD))}</span>
            <span>1 EUR = {formatNumber(Math.round(marketData.exchange_rates.EUR))}</span>
            <span>1 GBP = {formatNumber(Math.round(marketData.exchange_rates.GBP))}</span>
          </div>
        </ExchangeRateInfo>
      )}

      {error && <ErrorMessage>{error}</ErrorMessage>}

      <SearchSection>
        <SearchInput
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="종목명 또는 심볼을 검색하세요 (예: 삼성전자, AAPL, Rheinmetall)"
        />
        {searchLoading && (
          <div style={{ textAlign: 'center', marginTop: '16px', color: '#666' }}>
            검색 중...
          </div>
        )}
      </SearchSection>

      {!searchQuery && (<>
        <MarketTabs>
          {Object.entries(tabLabels).map(([key, label]) => (
            <TabButton
              key={key}
              $active={activeTab === key}
              onClick={() => handleTabChange(key)}
            >
              {label}
              {key === 'all' && <span className="count">(대표)</span>}
              {key !== 'all' && marketList && activeTab === key && (
                <span className="count">({marketList.total.toLocaleString()})</span>
              )}
            </TabButton>
          ))}
        </MarketTabs>

        {/* 장시간 정보 */}
        {marketData?.market_status && (
          <div style={{
            display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px'
          }}>
            {Object.entries(marketData.market_status).map(([key, status]) => (
              <div key={key} style={{
                flex: '1 1 200px', padding: '10px 14px', borderRadius: '8px',
                background: status.is_open ? '#eafaf1' : '#f9f9f9',
                border: `1px solid ${status.is_open ? '#27ae60' : '#ddd'}`,
                fontSize: '13px'
              }}>
                <div style={{ fontWeight: 600, marginBottom: '4px', color: '#333' }}>
                  {status.name}
                  <span style={{
                    marginLeft: '6px', padding: '1px 6px', borderRadius: '3px', fontSize: '11px',
                    background: status.is_open ? '#27ae60' : '#999', color: 'white', fontWeight: 600
                  }}>
                    {status.is_open ? '개장' : status.is_weekend ? '주말 휴장' : '폐장'}
                  </span>
                </div>
                <div style={{ color: '#666' }}>
                  {status.open_time_kst || status.open_time}~{status.close_time_kst || status.close_time} (KST) | 수수료 {status.current_commission_percent}
                  {!status.is_open && !status.is_weekend && ` (x${status.after_hours_multiplier})`}
                </div>
              </div>
            ))}
          </div>
        )}
      </>)}

      {marketListLoading ? (
        <LoadingState>
          <div className="spinner"></div>
          <div>종목 목록을 불러오고 있습니다...</div>
        </LoadingState>
      ) : displayStocks.length > 0 ? (
        <>
          <StockGrid>
            {displayStocks.map((stock) => (
              <StockCard
                key={stock.symbol}
                onClick={() => handleStockClick(stock)}
              >
                <StockHeader>
                  <StockInfo>
                    <div className="name">{stock.name}</div>
                    <div className="symbol">{stock.symbol}</div>
                    <div className="market">
                      {{ KRW: '한국', USD: '미국', HKD: '홍콩', EUR: '유럽' }[stock.market || getMarketFromSymbol(stock.symbol)] || '기타'} 주식
                    </div>
                  </StockInfo>
                  {renderStockPrice(stock)}
                </StockHeader>

                <StockStats>
                  <StatItem>
                    <div className="label">시가</div>
                    {renderStatValue(stock, 'open_price')}
                  </StatItem>
                  <StatItem>
                    <div className="label">전일종가</div>
                    {renderStatValue(stock, 'previous_close')}
                  </StatItem>
                  <StatItem>
                    <div className="label">고가</div>
                    {renderStatValue(stock, 'high_price')}
                  </StatItem>
                  <StatItem>
                    <div className="label">저가</div>
                    {renderStatValue(stock, 'low_price')}
                  </StatItem>
                </StockStats>
              </StockCard>
            ))}
          </StockGrid>

          {/* 페이지네이션 (시장별 탭에서만) */}
          {activeTab !== 'all' && !searchQuery && renderPagination()}
        </>
      ) : (
        <EmptyState>
          <h3>
            {searchQuery ? '검색 결과가 없습니다' : '시장 데이터가 없습니다'}
          </h3>
          <p>
            {searchQuery
              ? '다른 검색어를 시도해보세요'
              : '시장 데이터를 불러올 수 없습니다'
            }
          </p>
        </EmptyState>
      )}
    </Container>
  );
};

export default Markets;
