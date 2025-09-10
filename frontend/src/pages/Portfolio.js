import React, { useState, useEffect } from 'react';
import { portfolioService } from '../services/portfolioService';
import { stockService } from '../services/stockService';
import { 
  formatPercent, 
  formatNumber, 
  getProfitColor, 
  formatErrorMessage,
  validateQuantity,
  getMarketFromSymbol,
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
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
`;

const StatCard = styled.div`
  background: white;
  padding: 20px;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);
  border-left: 4px solid ${props => props.color || '#667eea'};
`;

const StatTitle = styled.h3`
  margin: 0 0 8px 0;
  color: #666;
  font-size: 14px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const StatValue = styled.div`
  font-size: 20px;
  font-weight: 700;
  color: ${props => props.color || '#333'};
  
  .original-amount {
    font-size: 14px;
    font-weight: 500;
    color: #999;
    margin-top: 4px;
  }
`;

const Card = styled.div`
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);
  overflow: hidden;
  margin-bottom: 30px;
`;

const CardHeader = styled.div`
  padding: 20px;
  border-bottom: 1px solid #eee;
  display: flex;
  justify-content: space-between;
  align-items: center;
  
  h2 {
    margin: 0;
    color: #333;
    font-size: 20px;
    font-weight: 700;
  }
`;

const CardContent = styled.div`
  padding: 20px;
`;

const HoldingsTable = styled.div`
  overflow-x: auto;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  
  th {
    text-align: left;
    padding: 12px;
    background: #f8f9fa;
    color: #666;
    font-weight: 600;
    font-size: 14px;
    border-bottom: 1px solid #dee2e6;
  }
  
  td {
    padding: 12px;
    border-bottom: 1px solid #f1f3f4;
    vertical-align: middle;
  }
  
  tr:hover {
    background: #f8f9fa;
  }
`;

const StockCell = styled.div`
  .symbol {
    font-weight: 700;
    color: #333;
    margin-bottom: 4px;
  }
  
  .name {
    font-size: 12px;
    color: #666;
  }
`;

const PriceCell = styled.div`
  .current-price {
    font-weight: 600;
    color: #333;
  }
  
  .original-price {
    font-size: 12px;
    color: #999;
    margin-top: 2px;
  }
`;

const ValueCell = styled.div`
  .main-value {
    font-weight: 600;
    color: #333;
  }
  
  .sub-value {
    font-size: 12px;
    color: #999;
    margin-top: 2px;
  }
`;

const ActionButton = styled.button`
  background: ${props => props.variant === 'sell' ? '#3498db' : '#e74c3c'};
  color: white;
  border: none;
  padding: 6px 12px;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  margin-right: 4px;
  
  &:hover {
    opacity: 0.8;
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 60px 20px;
  color: #666;
  
  .icon {
    font-size: 48px;
    margin-bottom: 16px;
    opacity: 0.5;
  }
  
  h3 {
    margin: 0 0 8px 0;
    color: #333;
  }
  
  p {
    margin: 0;
    font-size: 14px;
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

const RefreshButton = styled.button`
  background: #667eea;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  
  &:hover {
    background: #5a6fd8;
  }
`;

const Portfolio = () => {
  const [portfolio, setPortfolio] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadPortfolio();
  }, []);

  const loadPortfolio = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await portfolioService.getPortfolio();
      setPortfolio(response.data);
      
    } catch (error) {
      console.error('Portfolio loading error:', error);
      setError(formatErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const refreshPortfolio = async () => {
    try {
      setRefreshing(true);
      const response = await portfolioService.getPortfolio();
      setPortfolio(response.data);
    } catch (error) {
      console.error('Portfolio refresh error:', error);
      setError(formatErrorMessage(error));
    } finally {
      setRefreshing(false);
    }
  };

  const handleQuickSell = async (symbol, quantity) => {
    if (!window.confirm(`${symbol} ${quantity}주를 전량 매도하시겠습니까?`)) {
      return;
    }
    
    try {
      await portfolioService.sellStock(symbol, quantity);
      await loadPortfolio();
    } catch (error) {
      setError(formatErrorMessage(error));
    }
  };

  const calculateTotalValue = () => {
    if (!portfolio?.holdings) return 0;
    
    return portfolio.holdings.reduce((total, holding) => {
      // 이미 환율이 적용된 가격을 사용
      const currentValue = holding.current_price * holding.quantity;
      return total + currentValue;
    }, 0);
  };

  const calculateTotalProfitLoss = () => {
    if (!portfolio?.holdings) return { amount: 0, percentage: 0 };
    
    let totalCurrent = 0;
    let totalPurchase = 0;
    
    portfolio.holdings.forEach(holding => {
      // 이미 환율이 적용된 가격을 사용
      const currentValue = holding.current_price * holding.quantity;
      const purchaseValue = holding.purchase_price * holding.quantity;
      
      totalCurrent += currentValue;
      totalPurchase += purchaseValue;
    });
    
    const amount = totalCurrent - totalPurchase;
    const percentage = totalPurchase > 0 ? (amount / totalPurchase) * 100 : 0;
    
    return { amount, percentage };
  };

  const renderHoldingValue = (holding) => {
    const currentValue = holding.current_price * holding.quantity;
    
    return (
      <ValueCell>
        <div className="main-value">₩{formatNumber(Math.round(currentValue))}</div>
        {holding.original_price && (
          <div className="sub-value">${formatNumber(Math.round(holding.original_price * holding.quantity))}</div>
        )}
      </ValueCell>
    );
  };

  const renderHoldingProfit = (holding) => {
    const profitLoss = (holding.current_price - holding.purchase_price) * holding.quantity;
    const profitLossPercent = ((holding.current_price - holding.purchase_price) / holding.purchase_price) * 100;
    
    return (
      <ValueCell style={{ color: getProfitColor(profitLoss) }}>
        <div className="main-value">
          {profitLoss >= 0 ? '+' : ''}₩{formatNumber(Math.round(Math.abs(profitLoss)))}
        </div>
        <div className="sub-value">
          {profitLoss >= 0 ? '+' : ''}{formatPercent(profitLossPercent)}
        </div>
      </ValueCell>
    );
  };

  if (loading) {
    return (
      <Container>
        <Header>
          <h1>포트폴리오</h1>
        </Header>
        <LoadingState>
          <div className="spinner"></div>
          <div>포트폴리오를 불러오고 있습니다...</div>
        </LoadingState>
      </Container>
    );
  }

  const totalValue = calculateTotalValue();
  const totalProfitLoss = calculateTotalProfitLoss();

  return (
    <Container>
      <Header>
        <h1>포트폴리오</h1>
      </Header>

      {error && <ErrorMessage>{error}</ErrorMessage>}

      {portfolio && (
        <>
          <StatsGrid>
            <StatCard>
              <StatTitle>보유 현금</StatTitle>
              <StatValue>₩{formatNumber(Math.round(portfolio.cash))}</StatValue>
            </StatCard>
            
            <StatCard>
              <StatTitle>주식 평가액</StatTitle>
              <StatValue>₩{formatNumber(Math.round(totalValue))}</StatValue>
            </StatCard>
            
            <StatCard>
              <StatTitle>총 자산</StatTitle>
              <StatValue>₩{formatNumber(Math.round(Math.round(portfolio.cash) + totalValue))}</StatValue>
            </StatCard>
            
            <StatCard color={getProfitColor(totalProfitLoss.amount)}>
              <StatTitle>총 손익</StatTitle>
              <StatValue color={getProfitColor(totalProfitLoss.amount)}>
                {totalProfitLoss.amount >= 0 ? '+' : ''}₩{formatNumber(Math.round(Math.abs(totalProfitLoss.amount)))}
                <div className="original-amount">
                  {totalProfitLoss.amount >= 0 ? '+' : ''}{formatPercent(totalProfitLoss.percentage)}
                </div>
              </StatValue>
            </StatCard>
          </StatsGrid>

          <Card>
            <CardHeader>
              <h2>보유 주식</h2>
              <RefreshButton onClick={refreshPortfolio} disabled={refreshing}>
                {refreshing ? '새로고침 중...' : '새로고침'}
              </RefreshButton>
            </CardHeader>
            <CardContent>
              {portfolio.holdings && portfolio.holdings.length > 0 ? (
                <HoldingsTable>
                  <Table>
                    <thead>
                      <tr>
                        <th>종목</th>
                        <th>수량</th>
                        <th>매수가</th>
                        <th>현재가</th>
                        <th>평가액</th>
                        <th>손익</th>
                        <th>액션</th>
                      </tr>
                    </thead>
                    <tbody>
                      {portfolio.holdings.map((holding) => (
                        <tr key={holding.symbol}>
                          <td>
                            <StockCell>
                              <div className="symbol">{holding.symbol}</div>
                              <div className="name">{holding.name}</div>
                            </StockCell>
                          </td>
                          <td>{formatNumber(holding.quantity)}</td>
                          <td>
                            <PriceCell>
                              <div className="current-price">
                                ₩{formatNumber(Math.round(holding.purchase_price))}
                              </div>
                              {holding.original_price && holding.exchange_rate && (
                                <div className="original-price">${formatNumber(Math.round(holding.purchase_price / holding.exchange_rate))}</div>
                              )}
                            </PriceCell>
                          </td>
                          <td>
                            <PriceCell>
                              <div className="current-price">
                                ₩{formatNumber(Math.round(holding.current_price))}
                              </div>
                              {holding.original_price && (
                                <div className="original-price">${formatNumber(holding.original_price)}</div>
                              )}
                            </PriceCell>
                          </td>
                          <td>{renderHoldingValue(holding)}</td>
                          <td>{renderHoldingProfit(holding)}</td>
                          <td>
                            <ActionButton
                              variant="sell"
                              onClick={() => handleQuickSell(holding.symbol, holding.quantity)}
                            >
                              전량매도
                            </ActionButton>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </HoldingsTable>
              ) : (
                <EmptyState>
                  <div className="icon">📈</div>
                  <h3>보유 주식이 없습니다</h3>
                  <p>시장에서 주식을 구매해보세요!</p>
                </EmptyState>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </Container>
  );
};

export default Portfolio;
