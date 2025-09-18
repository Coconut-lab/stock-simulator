import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { stockService } from '../services/stockService';
import { portfolioService } from '../services/portfolioService';
import { formatCurrency, formatPercent, formatNumber, getProfitColor, formatErrorMessage } from '../utils/helpers';
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
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const WelcomeText = styled.div`
  h1 {
    margin: 0 0 8px 0;
    color: #333;
    font-size: 28px;
    font-weight: 700;
  }
  
  p {
    margin: 0;
    color: #666;
    font-size: 16px;
  }
`;

const LogoutButton = styled.button`
  background: #e74c3c;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  transition: background-color 0.3s ease;
  
  &:hover {
    background: #c0392b;
  }
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
`;

const StatCard = styled.div`
  background: white;
  padding: 24px;
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
  font-size: 24px;
  font-weight: 700;
  color: ${props => props.color || '#333'};
  margin-bottom: 4px;
`;

const StatChange = styled.div`
  font-size: 14px;
  color: ${props => props.color || '#666'};
  display: flex;
  align-items: center;
  gap: 4px;
`;

const ContentGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 30px;
  
  @media (max-width: 968px) {
    grid-template-columns: 1fr;
  }
`;

const Card = styled.div`
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);
  overflow: hidden;
`;

const CardHeader = styled.div`
  padding: 20px;
  border-bottom: 1px solid #eee;
  
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

const StockList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const StockItem = styled.div`
  display: flex;
  justify-content: between;
  align-items: center;
  padding: 12px;
  background: #f8f9fa;
  border-radius: 8px;
  transition: background-color 0.3s ease;
  
  &:hover {
    background: #e9ecef;
  }
`;

const StockInfo = styled.div`
  flex: 1;
  
  .symbol {
    font-weight: 700;
    color: #333;
    font-size: 16px;
  }
  
  .name {
    color: #666;
    font-size: 14px;
    margin-top: 2px;
  }
`;

const StockPrice = styled.div`
  text-align: right;
  
  .price {
    font-weight: 700;
    color: #333;
    font-size: 16px;
  }
  
  .change {
    font-size: 14px;
    color: ${props => props.changeColor};
    margin-top: 2px;
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

const LoadingSpinner = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 40px;
  
  &::after {
    content: '';
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

const Dashboard = () => {
  const { user, logout } = useAuth();
  const [portfolioSummary, setPortfolioSummary] = useState(null);
  const [marketData, setMarketData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError('');
      
      // 포트폴리오 요약과 시장 데이터를 동시에 가져오기
      const [portfolioResponse, marketResponse] = await Promise.all([
        portfolioService.getPortfolioSummary(),
        stockService.getMarketSummary()
      ]);
      
      setPortfolioSummary(portfolioResponse.data);
      setMarketData(marketResponse.data);
      
    } catch (error) {
      console.error('Dashboard data loading error:', error);
      setError(formatErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (loading) {
    return (
      <Container>
        <LoadingSpinner />
      </Container>
    );
  }

  return (
    <Container>
      <Header>
        <WelcomeText>
          <h1>안녕하세요, {user?.username}님!</h1>
          <p>가상 주식 투자 대시보드에 오신 것을 환영합니다.</p>
        </WelcomeText>
        <LogoutButton onClick={handleLogout}>
          로그아웃
        </LogoutButton>
      </Header>

      {error && (
        <ErrorMessage>{error}</ErrorMessage>
      )}

      {portfolioSummary && (
        <StatsGrid>
          <StatCard color="#27ae60">
            <StatTitle>총 자산</StatTitle>
            <StatValue>
              {formatCurrency(portfolioSummary.total_assets)}
            </StatValue>
            <StatChange>
              현금 + 주식 포트폴리오
            </StatChange>
          </StatCard>

          <StatCard color="#3498db">
            <StatTitle>현금 잔액</StatTitle>
            <StatValue>
              {formatCurrency(portfolioSummary.cash_balance)}
            </StatValue>
            <StatChange>
              투자 가능 자금
            </StatChange>
          </StatCard>

          <StatCard color="#9b59b6">
            <StatTitle>포트폴리오 가치</StatTitle>
            <StatValue>
              {formatCurrency(portfolioSummary.total_value)}
            </StatValue>
            <StatChange>
              보유 주식 {portfolioSummary.holdings_count}종목
            </StatChange>
          </StatCard>

          <StatCard color={getProfitColor(portfolioSummary.total_profit_loss)}>
            <StatTitle>손익</StatTitle>
            <StatValue color={getProfitColor(portfolioSummary.total_profit_loss)}>
              {formatCurrency(portfolioSummary.total_profit_loss)}
            </StatValue>
            <StatChange color={getProfitColor(portfolioSummary.total_profit_loss)}>
              {portfolioSummary.total_profit_loss >= 0 ? '+' : ''}{formatPercent(portfolioSummary.return_rate)}
            </StatChange>
          </StatCard>
        </StatsGrid>
      )}

      <ContentGrid>
        {/* 시장 지수 카드 추가 */}
        <Card>
          <CardHeader>
            <h2>주요 지수</h2>
          </CardHeader>
          <CardContent>
            {marketData?.market_indices ? (
              <StockList>
                {marketData.market_indices.map((index) => (
                  <StockItem key={index.symbol}>
                    <StockInfo>
                      <div className="symbol">{index.symbol}</div>
                      <div className="name">{index.name}</div>
                    </StockInfo>
                    <StockPrice changeColor={getProfitColor(index.change)}>
                      <div className="price">
                        {formatNumber(index.value)}
                      </div>
                      {index.change !== undefined && (
                        <div className="change">
                          {index.change >= 0 ? '+' : ''}{formatNumber(index.change)} 
                          ({index.change_percent >= 0 ? '+' : ''}{formatPercent(index.change_percent)})
                        </div>
                      )}
                    </StockPrice>
                  </StockItem>
                ))}
              </StockList>
            ) : (
              <div>시장 지수 데이터를 불러올 수 없습니다.</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2>한국 주식</h2>
          </CardHeader>
          <CardContent>
            {marketData?.korean_market ? (
              <StockList>
                {marketData.korean_market.slice(0, 5).map((stock) => (
                  <StockItem key={stock.symbol}>
                    <StockInfo>
                      <div className="symbol">{stock.symbol}</div>
                      <div className="name">{stock.name}</div>
                    </StockInfo>
                    <StockPrice changeColor={getProfitColor(stock.change)}>
                      <div className="price">
                        {formatNumber(stock.current_price)}원
                      </div>
                      {stock.change !== undefined && (
                        <div className="change">
                          {stock.change >= 0 ? '+' : ''}{formatNumber(stock.change)} 
                          ({stock.change_percent >= 0 ? '+' : ''}{formatPercent(stock.change_percent)})
                        </div>
                      )}
                    </StockPrice>
                  </StockItem>
                ))}
              </StockList>
            ) : (
              <div>한국 주식 데이터를 불러올 수 없습니다.</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2>미국 주식</h2>
          </CardHeader>
          <CardContent>
            {marketData?.us_market ? (
              <StockList>
                {marketData.us_market.slice(0, 5).map((stock) => (
                  <StockItem key={stock.symbol}>
                    <StockInfo>
                      <div className="symbol">{stock.symbol}</div>
                      <div className="name">{stock.name}</div>
                    </StockInfo>
                    <StockPrice changeColor={getProfitColor(stock.change)}>
                      <div className="price">
                        ${formatNumber(stock.current_price)}
                      </div>
                      {stock.change !== undefined && (
                        <div className="change">
                          {stock.change >= 0 ? '+' : ''}${formatNumber(stock.change)} 
                          ({stock.change_percent >= 0 ? '+' : ''}{formatPercent(stock.change_percent)})
                        </div>
                      )}
                    </StockPrice>
                  </StockItem>
                ))}
              </StockList>
            ) : (
              <div>미국 주식 데이터를 불러올 수 없습니다.</div>
            )}
          </CardContent>
        </Card>
      </ContentGrid>
    </Container>
  );
};

export default Dashboard;
