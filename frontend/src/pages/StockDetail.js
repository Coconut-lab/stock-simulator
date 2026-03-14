import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { stockService } from '../services/stockService';
import { portfolioService } from '../services/portfolioService';
import StockChart from '../components/StockChart';
import { 
  formatNumber, 
  formatPercent, 
  getProfitColor, 
  formatErrorMessage,
  validateQuantity,
  formatStockPrice,
  formatStockChange,
  getCurrencyFromStock
} from '../utils/helpers';
import styled from 'styled-components';

const Container = styled.div`
  min-height: 100vh;
  background: #f8f9fa;
  padding: 20px;
`;

const BackButton = styled.button`
  background: #6c757d;
  color: white;
  border: none;
  padding: 10px 16px;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  margin-bottom: 20px;
  transition: background-color 0.3s ease;
  
  &:hover {
    background: #5a6268;
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

const StockHeader = styled.div`
  background: white;
  padding: 30px;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);
  margin-bottom: 30px;
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 30px;
  align-items: center;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 20px;
  }
`;

const StockInfo = styled.div`
  .symbol {
    font-size: 18px;
    font-weight: 600;
    color: #666;
    margin-bottom: 4px;
  }
  
  .name {
    font-size: 32px;
    color: #333;
    font-weight: 700;
    margin-bottom: 16px;
  }
  
  .price-container {
    margin-bottom: 8px;
  }
  
  .price {
    font-size: 48px;
    font-weight: 700;
    color: #333;
  }
  
  .original-price {
    font-size: 16px;
    color: #999;
    margin-left: 12px;
  }
  
  .change {
    font-size: 18px;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 8px;
  }
`;

const StockStats = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const StatItem = styled.div`
  text-align: right;
  
  .label {
    font-size: 14px;
    color: #666;
    margin-bottom: 4px;
  }
  
  .value {
    font-size: 18px;
    font-weight: 600;
    color: #333;
  }
  
  .original-value {
    font-size: 12px;
    color: #999;
    margin-top: 2px;
  }
`;

const ContentGrid = styled.div`
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 30px;
  
  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
  }
`;

const TradingCard = styled.div`
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);
  overflow: hidden;
`;

const TradingHeader = styled.div`
  padding: 20px;
  border-bottom: 1px solid #eee;
  
  h3 {
    margin: 0;
    color: #333;
    font-size: 20px;
    font-weight: 700;
  }
`;

const TradingContent = styled.div`
  padding: 20px;
`;

const TradingTabs = styled.div`
  display: flex;
  gap: 4px;
  margin-bottom: 20px;
`;

const TradingTab = styled.button`
  flex: 1;
  padding: 12px;
  border: none;
  background: ${props => props.active ? '#667eea' : '#f8f9fa'};
  color: ${props => props.active ? 'white' : '#666'};
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    background: ${props => props.active ? '#5a6fd8' : '#e9ecef'};
  }
`;

const TradeForm = styled.form`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const InputGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const Label = styled.label`
  font-weight: 600;
  color: #555;
  font-size: 14px;
`;

const Input = styled.input`
  padding: 12px;
  border: 2px solid #e1e5e9;
  border-radius: 8px;
  font-size: 16px;
  
  &:focus {
    outline: none;
    border-color: #667eea;
  }
  
  &.error {
    border-color: #e74c3c;
  }
`;

const TradeButton = styled.button`
  padding: 14px;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.3s ease;
  
  &.buy {
    background: #e74c3c;
    color: white;
    
    &:hover:not(:disabled) {
      background: #c0392b;
    }
  }
  
  &.sell {
    background: #3498db;
    color: white;
    
    &:hover:not(:disabled) {
      background: #2980b9;
    }
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const ErrorMessage = styled.div`
  background: #ffeaea;
  color: #e74c3c;
  padding: 12px;
  border-radius: 8px;
  border-left: 4px solid #e74c3c;
  font-size: 14px;
  margin: 16px 0;
`;

const SuccessMessage = styled.div`
  background: #f0f9f0;
  color: #27ae60;
  padding: 12px;
  border-radius: 8px;
  border-left: 4px solid #27ae60;
  font-size: 14px;
  margin: 16px 0;
`;

const TradeInfo = styled.div`
  background: #f8f9fa;
  padding: 16px;
  border-radius: 8px;
  font-size: 14px;
  
  .row {
    display: flex;
    justify-content: space-between;
    margin-bottom: 8px;
    
    &:last-child {
      margin-bottom: 0;
      font-weight: 600;
      padding-top: 8px;
      border-top: 1px solid #dee2e6;
    }
  }
  
  .original-amount {
    font-size: 12px;
    color: #999;
    margin-left: 8px;
  }
`;

const MaxBuyButton = styled.button`
  width: 100%;
  padding: 8px;
  background: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 6px;
  color: #495057;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  margin-top: 8px;
  
  &:hover:not(:disabled) {
    background: #e9ecef;
    border-color: #adb5bd;
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const LoadingState = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
  
  .spinner {
    width: 40px;
    height: 40px;
    border: 4px solid #f3f3f3;
    border-top: 4px solid #667eea;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const StockDetail = () => {
  const { symbol } = useParams();
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  
  const [stockData, setStockData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  
  const [tradeType, setTradeType] = useState('buy');
  const [quantity, setQuantity] = useState('');
  const [trading, setTrading] = useState(false);

  const [maxBuyData, setMaxBuyData] = useState(null);
  const [loadingMaxBuy, setLoadingMaxBuy] = useState(false);
  const [marketStatus, setMarketStatus] = useState(null);
  const [holdingQuantity, setHoldingQuantity] = useState(0);

  useEffect(() => {
    loadStockData();
    loadMarketStatus();
    loadHolding();
  }, [symbol]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (stockData && tradeType === 'buy') {
      loadMaxBuyData();
    }
  }, [stockData, tradeType]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadHolding = async () => {
    try {
      const response = await portfolioService.getPortfolio();
      const holdings = response.data?.holdings || [];
      const holding = holdings.find(h => h.symbol === symbol);
      setHoldingQuantity(holding ? holding.quantity : 0);
    } catch (err) {
      console.error('Holding data loading error:', err);
      setHoldingQuantity(0);
    }
  };

  const loadMaxBuyData = async () => {
    try {
      setLoadingMaxBuy(true);
      const response = await portfolioService.getMaxBuyQuantity(symbol);
      setMaxBuyData(response.data);
    } catch (error) {
      console.error('Max buy data loading error:', error);
    } finally {
      setLoadingMaxBuy(false);
    }
  };

  const loadMarketStatus = async () => {
    try {
      const response = await stockService.getMarketHours();
      setMarketStatus(response.data);
    } catch (err) {
      console.error('Market hours loading error:', err);
    }
  };

  const loadStockData = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await stockService.getStockDetail(symbol);
      setStockData(response.data);
      
    } catch (error) {
      console.error('Stock detail loading error:', error);
      setError(formatErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const handleMaxBuy = () => {
    if (maxBuyData && maxBuyData.max_quantity > 0) {
      setQuantity(maxBuyData.max_quantity.toString());
    }
  };

  const handleTrade = async (e) => {
    e.preventDefault();
    
    if (!validateQuantity(parseFloat(quantity))) {
      setError('올바른 수량을 입력해주세요.');
      return;
    }
    
    setTrading(true);
    setError('');
    setSuccessMessage('');
    
    try {
      const quantityNum = parseInt(quantity);
      let response;
      
      if (tradeType === 'buy') {
        response = await portfolioService.buyStock(symbol, quantityNum);
      } else {
        response = await portfolioService.sellStock(symbol, quantityNum);
      }
      
      setSuccessMessage(response.message);
      setQuantity('');

      // 상단 잔고 업데이트
      if (response.data?.remaining_balance !== undefined && user) {
        updateUser({ ...user, balance: response.data.remaining_balance });
      }

      // 주식 데이터 및 보유 수량 새로고침
      await Promise.all([loadStockData(), loadHolding()]);
      
    } catch (error) {
      setError(formatErrorMessage(error));
    } finally {
      setTrading(false);
    }
  };

  const calculateTradeAmount = () => {
    if (!stockData || !quantity) return 0;
    const currency = getCurrencyFromStock(stockData);
    const price = stockData.current_price;

    // 외화 주식이고 환율 정보가 있으면 원화로 계산
    if (currency !== 'KRW' && stockData.exchange_rate) {
      return price * stockData.exchange_rate * parseInt(quantity || 0);
    }
    return price * parseInt(quantity || 0);
  };

  const getCommissionInfo = () => {
    const market = stockData?.market || getCurrencyFromStock(stockData);
    const rates = { KRW: 0.00015, USD: 0.00005, HKD: 0.0001, EUR: 0.0001 };
    const mins = { KRW: 1000, USD: 1350, HKD: 1000, EUR: 1500 };
    const baseRate = rates[market] || 0.001;
    const status = marketStatus?.[market];
    const isAfterHours = status ? status.is_after_hours : false;
    const multiplier = isAfterHours ? 3 : 1;
    const effectiveRate = baseRate * multiplier;
    return { baseRate, effectiveRate, isAfterHours, multiplier, minCommission: mins[market] || 1000, market };
  };

  const calculateCommission = () => {
    const amount = calculateTradeAmount();
    const { effectiveRate, minCommission } = getCommissionInfo();
    return Math.max(amount * effectiveRate, minCommission);
  };

  const renderPrice = (price, field = 'current_price') => {
    if (!stockData) return '';

    const currency = getCurrencyFromStock(stockData);
    const value = stockData[field] || price;
    const currencySymbols = { USD: '$', HKD: 'HK$', EUR: '€', GBP: '£' };
    const priceSym = currencySymbols[stockData.price_currency] || currencySymbols[currency] || '';

    if (currency !== 'KRW' && stockData.exchange_rate) {
      const convertedPrice = value * stockData.exchange_rate;
      return (
        <>
          <span>₩{formatNumber(Math.round(convertedPrice))}</span>
          <span className="original-price">{priceSym}{formatNumber(value)}</span>
        </>
      );
    }
    return `₩${formatNumber(value)}`;
  };

  if (loading) {
    return (
      <Container>
        <LoadingState>
          <div className="spinner"></div>
        </LoadingState>
      </Container>
    );
  }

  if (error && !stockData) {
    return (
      <Container>
        <BackButton onClick={() => navigate('/markets')}>← 시장으로 돌아가기</BackButton>
        <ErrorMessage>{error}</ErrorMessage>
      </Container>
    );
  }

  const currency = getCurrencyFromStock(stockData);
  const isForeign = currency !== 'KRW';
  const priceCurrSym = { USD: '$', HKD: 'HK$', EUR: '€', GBP: '£' }[stockData?.price_currency || currency] || '';
  const tradeAmount = calculateTradeAmount();
  const commission = calculateCommission();
  const totalAmount = tradeType === 'buy' ? tradeAmount + commission : tradeAmount - commission;
  const commissionInfo = getCommissionInfo();
  const currentMarketStatus = marketStatus?.[commissionInfo.market];

  return (
    <Container>
      <BackButton onClick={() => navigate('/markets')}>← 시장으로 돌아가기</BackButton>

      {currentMarketStatus && (
        <div style={{
          background: currentMarketStatus.is_open ? '#eafaf1' : '#fdf2f2',
          border: `1px solid ${currentMarketStatus.is_open ? '#27ae60' : '#e74c3c'}`,
          borderRadius: '8px', padding: '12px 16px', marginBottom: '16px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px'
        }}>
          <div>
            <span style={{ fontWeight: 600, color: '#333' }}>{currentMarketStatus.name}</span>
            <span style={{
              marginLeft: '8px', padding: '2px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 600,
              background: currentMarketStatus.is_open ? '#27ae60' : '#e74c3c', color: 'white'
            }}>
              {currentMarketStatus.is_open ? '개장' : currentMarketStatus.is_weekend ? '주말 휴장' : '폐장'}
            </span>
          </div>
          <div style={{ fontSize: '13px', color: '#666' }}>
            장시간: {currentMarketStatus.open_time_kst || currentMarketStatus.open_time} ~ {currentMarketStatus.close_time_kst || currentMarketStatus.close_time} (KST)
            {!currentMarketStatus.is_open && !currentMarketStatus.is_weekend && (
              <span style={{ color: '#e74c3c', marginLeft: '8px', fontWeight: 600 }}>
                시간외 수수료 적용 (x{currentMarketStatus.after_hours_multiplier})
              </span>
            )}
          </div>
        </div>
      )}

      {currency !== 'KRW' && stockData?.exchange_rate && (
        <ExchangeRateInfo>
          <div className="title">현재 환율</div>
          <div className="rate">1 {stockData.price_currency || currency} = ₩{formatNumber(Math.round(stockData.exchange_rate))}</div>
        </ExchangeRateInfo>
      )}

      {stockData && (
        <>
          <StockHeader>
            <StockInfo>
              <div className="name">{stockData.name}</div>
              <div className="symbol">{stockData.symbol}</div>
              <div className="price-container">
                <span className="price">{formatStockPrice(stockData)}</span>
                {isForeign && stockData.exchange_rate && (
                  <span className="original-price">{priceCurrSym}{formatNumber(stockData.current_price)}</span>
                )}
              </div>
              <div className="change" style={{ color: getProfitColor(stockData.change) }}>
                <span>{formatStockChange(stockData)}</span>
                <span>
                  ({stockData.change_percent >= 0 ? '+' : ''}{formatPercent(stockData.change_percent)})
                </span>
              </div>
            </StockInfo>
            
            <StockStats>
              <StatItem>
                <div className="label">시가</div>
                <div className="value">{renderPrice(stockData.open_price, 'open_price')}</div>
              </StatItem>
              <StatItem>
                <div className="label">고가</div>
                <div className="value">{renderPrice(stockData.high_price, 'high_price')}</div>
              </StatItem>
              <StatItem>
                <div className="label">저가</div>
                <div className="value">{renderPrice(stockData.low_price, 'low_price')}</div>
              </StatItem>
              <StatItem>
                <div className="label">거래량</div>
                <div className="value">{formatNumber(stockData.volume)}</div>
              </StatItem>
            </StockStats>
          </StockHeader>

          <ContentGrid>
            <StockChart symbol={symbol} stockInfo={stockData} />
            
            <TradingCard>
              <TradingHeader>
                <h3>주식 거래</h3>
              </TradingHeader>
              <TradingContent>
                {error && <ErrorMessage>{error}</ErrorMessage>}
                {successMessage && <SuccessMessage>{successMessage}</SuccessMessage>}
                
                <TradingTabs>
                  <TradingTab 
                    type="button"
                    active={tradeType === 'buy'}
                    onClick={() => setTradeType('buy')}
                  >
                    매수
                  </TradingTab>
                  <TradingTab 
                    type="button"
                    active={tradeType === 'sell'}
                    onClick={() => setTradeType('sell')}
                  >
                    매도
                  </TradingTab>
                </TradingTabs>

                <TradeForm onSubmit={handleTrade}>
                  <InputGroup>
                    <Label>수량</Label>
                    <Input
                      type="number"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      placeholder="거래할 수량을 입력하세요"
                      min="1"
                      required
                    />
                    {tradeType === 'buy' && maxBuyData && (
                      <MaxBuyButton
                        type="button"
                        onClick={handleMaxBuy}
                        disabled={loadingMaxBuy || maxBuyData.max_quantity === 0}
                      >
                        {loadingMaxBuy
                          ? '계산중...'
                          : maxBuyData.max_quantity === 0
                            ? '전량매수 불가 (잔액 부족)'
                            : `전량매수 (${maxBuyData.max_quantity}주 - ₩${formatNumber(Math.round(maxBuyData.total_cost))})`
                        }
                      </MaxBuyButton>
                    )}
                    {tradeType === 'sell' && (
                      <MaxBuyButton
                        type="button"
                        onClick={() => holdingQuantity > 0 && setQuantity(holdingQuantity.toString())}
                        disabled={holdingQuantity === 0}
                      >
                        {holdingQuantity === 0
                          ? '보유 수량 없음'
                          : `전량매도 (보유: ${formatNumber(holdingQuantity)}주)`
                        }
                      </MaxBuyButton>
                    )}
                  </InputGroup>

                  {quantity && (
                    <TradeInfo>
                      <div className="row">
                        <span>주문가격:</span>
                        <span>{formatStockPrice(stockData)}</span>
                      </div>
                      <div className="row">
                        <span>거래금액:</span>
                        <span>
                          ₩{formatNumber(Math.round(tradeAmount))}
                          {isForeign && stockData.exchange_rate && (
                            <span className="original-amount">
                              ({priceCurrSym}{formatNumber(stockData.current_price * parseInt(quantity || 0))})
                            </span>
                          )}
                        </span>
                      </div>
                      <div className="row">
                        <span>
                          수수료 ({(commissionInfo.effectiveRate * 100).toFixed(3)}%)
                          {commissionInfo.isAfterHours && (
                            <span style={{ color: '#e74c3c', fontSize: '11px', marginLeft: '4px' }}>
                              (시간외 x{commissionInfo.multiplier})
                            </span>
                          )}:
                        </span>
                        <span>₩{formatNumber(Math.round(commission))}</span>
                      </div>
                      <div className="row">
                        <span>총 {tradeType === 'buy' ? '결제' : '수령'}금액:</span>
                        <span>₩{formatNumber(Math.round(totalAmount))}</span>
                      </div>
                    </TradeInfo>
                  )}

                  <TradeButton 
                    type="submit"
                    className={tradeType}
                    disabled={trading || !quantity}
                  >
                    {trading ? '처리 중...' : (tradeType === 'buy' ? '매수하기' : '매도하기')}
                  </TradeButton>
                </TradeForm>
              </TradingContent>
            </TradingCard>
          </ContentGrid>
        </>
      )}
    </Container>
  );
};

export default StockDetail;
