import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { portfolioService } from '../services/portfolioService';
import { stockService } from '../services/stockService';
import { useAuth } from '../context/AuthContext';
import {
  formatPercent,
  formatNumber,
  formatQuantity,
  getProfitColor,
  formatErrorMessage,
  validateQuantity,
  getMarketFromSymbol,
  formatStockPrice,
  formatStockChange,
  getCurrencyFromStock,
  getCurrencySymbol
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
  cursor: pointer;

  &:hover .symbol {
    color: #667eea;
  }

  .symbol {
    font-weight: 700;
    color: #333;
    margin-bottom: 4px;
    transition: color 0.15s;
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
  background: ${props => {
    if (props.variant === 'sell') return '#3498db';
    if (props.variant === 'cover') return '#e67e22';
    return '#e74c3c';
  }};
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

const ShortBadge = styled.span`
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 700;
  background: rgba(231, 76, 60, 0.1);
  color: #e74c3c;
  margin-left: 8px;
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

const CommissionCell = styled.div`
  font-size: 13px;
  color: #e67e22;
  font-weight: 600;
`;

const MarketLabel = styled.div`
  display: inline-block;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
  margin-right: 8px;
  background: ${props => {
    switch(props.market) {
      case 'KRW': return '#e8f5e9';
      case 'USD': return '#e3f2fd';
      case 'HKD': return '#fff3e0';
      case 'EUR': return '#f3e5f5';
      default: return '#f5f5f5';
    }
  }};
  color: ${props => {
    switch(props.market) {
      case 'KRW': return '#2e7d32';
      case 'USD': return '#1565c0';
      case 'HKD': return '#e65100';
      case 'EUR': return '#6a1b9a';
      default: return '#616161';
    }
  }};
`;

const MARKET_NAMES = {
  KRW: '한국 주식',
  USD: '미국 주식',
  HKD: '홍콩 주식',
  EUR: '유럽 주식',
};

const Portfolio = () => {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
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
      // 상단 잔고 동기화
      if (response.data?.cash !== undefined && user) {
        updateUser({ ...user, balance: response.data.cash });
      }

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
      if (response.data?.cash !== undefined && user) {
        updateUser({ ...user, balance: response.data.cash });
      }
    } catch (error) {
      console.error('Portfolio refresh error:', error);
      setError(formatErrorMessage(error));
    } finally {
      setRefreshing(false);
    }
  };

  const handleQuickSell = async (symbol, quantity) => {
    if (!window.confirm(`${symbol} ${formatQuantity(quantity)}주를 전량 매도하시겠습니까?`)) {
      return;
    }

    try {
      const response = await portfolioService.sellStock(symbol, quantity);
      if (response.data?.remaining_balance !== undefined && user) {
        updateUser({ ...user, balance: response.data.remaining_balance });
      }
      await loadPortfolio();
    } catch (error) {
      setError(formatErrorMessage(error));
    }
  };

  const handleShortCover = async (symbol, quantity) => {
    if (!window.confirm(`${symbol} ${formatQuantity(quantity)}주 숏커버 하시겠습니까?`)) {
      return;
    }

    try {
      const response = await portfolioService.shortCoverStock(symbol, quantity);
      if (response.data?.remaining_balance !== undefined && user) {
        updateUser({ ...user, balance: response.data.remaining_balance });
      }
      await loadPortfolio();
    } catch (error) {
      setError(formatErrorMessage(error));
    }
  };

  const calculateTotalValue = () => {
    if (!portfolio?.holdings) return 0;

    return portfolio.holdings.reduce((total, holding) => {
      const currentValue = holding.current_price * holding.quantity;
      return total + currentValue;
    }, 0);
  };

  const calculateTotalProfitLoss = () => {
    if (!portfolio?.holdings) return { amount: 0, percentage: 0 };

    let totalCurrent = 0;
    let totalPurchase = 0;

    portfolio.holdings.forEach(holding => {
      const currentValue = holding.current_price * holding.quantity;
      const purchaseValue = holding.purchase_price * holding.quantity;

      totalCurrent += currentValue;
      totalPurchase += purchaseValue;
    });

    const amount = totalCurrent - totalPurchase;
    const percentage = totalPurchase > 0 ? (amount / totalPurchase) * 100 : 0;

    return { amount, percentage };
  };

  const groupHoldingsByMarket = () => {
    if (!portfolio?.holdings) return {};
    const groups = {};
    portfolio.holdings.forEach(holding => {
      const market = holding.currency || 'KRW';
      if (!groups[market]) groups[market] = [];
      groups[market].push(holding);
    });
    return groups;
  };

  const getCurrSym = (currency) => {
    return getCurrencySymbol(currency);
  };

  const renderHoldingValue = (holding) => {
    const currentValue = holding.current_price * holding.quantity;

    return (
      <ValueCell>
        <div className="main-value">₩{formatNumber(Math.round(currentValue))}</div>
        {holding.original_price && (
          <div className="sub-value">{getCurrSym(holding.currency)}{formatNumber(Math.round(holding.original_price * holding.quantity * 100) / 100)}</div>
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
          {profitLoss >= 0 ? '+' : '-'}₩{formatNumber(Math.round(Math.abs(profitLoss)))}
          <span style={{ fontSize: '12px', marginLeft: '4px' }}>
            ({profitLoss >= 0 ? '+' : ''}{formatPercent(profitLossPercent)})
          </span>
        </div>
        {holding.original_profit_loss != null && (
          <div className="sub-value" style={{ color: getProfitColor(holding.original_profit_loss) }}>
            {holding.original_profit_loss >= 0 ? '+' : '-'}
            {getCurrSym(holding.currency)}
            {formatNumber(Math.round(Math.abs(holding.original_profit_loss) * 100) / 100)}
            {holding.original_profit_loss_percent != null && (
              <span> ({holding.original_profit_loss_percent >= 0 ? '+' : ''}{formatPercent(holding.original_profit_loss_percent)})</span>
            )}
          </div>
        )}
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
  const marketGroups = groupHoldingsByMarket();
  const marketOrder = ['KRW', 'USD', 'HKD', 'EUR'];

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

            {portfolio.holdings && portfolio.holdings.length > 0 && (
              <StatCard color={getProfitColor(totalProfitLoss.amount)}>
                <StatTitle>평가 손익</StatTitle>
                <StatValue color={getProfitColor(totalProfitLoss.amount)}>
                  {totalProfitLoss.amount >= 0 ? '+' : '-'}₩{formatNumber(Math.round(Math.abs(totalProfitLoss.amount)))}
                  <div className="original-amount">
                    {totalProfitLoss.amount >= 0 ? '+' : ''}{formatPercent(totalProfitLoss.percentage)}
                  </div>
                </StatValue>
              </StatCard>
            )}

          </StatsGrid>

          {portfolio.holdings && portfolio.holdings.length > 0 ? (
            <>
              {marketOrder
                .filter(market => marketGroups[market]?.length > 0)
                .map((market, idx) => (
                  <Card key={market}>
                    <CardHeader>
                      <h2>
                        <MarketLabel market={market}>{getCurrSym(market)}</MarketLabel>
                        {MARKET_NAMES[market] || market}
                        <span style={{ fontSize: '14px', color: '#999', fontWeight: 400, marginLeft: '8px' }}>
                          ({marketGroups[market].length}종목)
                        </span>
                      </h2>
                      {idx === 0 && (
                        <RefreshButton onClick={refreshPortfolio} disabled={refreshing}>
                          {refreshing ? '새로고침 중...' : '새로고침'}
                        </RefreshButton>
                      )}
                    </CardHeader>
                    <CardContent>
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
                              <th>매도 수수료</th>
                              <th>액션</th>
                            </tr>
                          </thead>
                          <tbody>
                            {marketGroups[market].map((holding) => (
                              <tr key={holding.symbol}>
                                <td>
                                  <StockCell onClick={() => navigate(`/stock/${holding.symbol}`)}>
                                    <div className="symbol">{holding.symbol}</div>
                                    <div className="name">{holding.name}</div>
                                  </StockCell>
                                </td>
                                <td>{formatQuantity(holding.quantity)}</td>
                                <td>
                                  <PriceCell>
                                    <div className="current-price">
                                      ₩{formatNumber(Math.round(holding.purchase_price))}
                                    </div>
                                    {holding.purchase_price_original != null && (
                                      <div className="original-price">
                                        {getCurrSym(holding.currency)}{formatNumber(Math.round(holding.purchase_price_original * 100) / 100)}
                                      </div>
                                    )}
                                  </PriceCell>
                                </td>
                                <td>
                                  <PriceCell>
                                    <div className="current-price">
                                      ₩{formatNumber(Math.round(holding.current_price))}
                                    </div>
                                    {holding.original_price && (
                                      <div className="original-price">
                                        {getCurrSym(holding.currency)}{formatNumber(holding.original_price)}
                                      </div>
                                    )}
                                  </PriceCell>
                                </td>
                                <td>{renderHoldingValue(holding)}</td>
                                <td>{renderHoldingProfit(holding)}</td>
                                <td>
                                  <CommissionCell>₩{formatNumber(holding.estimated_sell_commission || 0)}</CommissionCell>
                                </td>
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
                    </CardContent>
                  </Card>
                ))}
            </>
          ) : (
            <Card>
              <CardContent>
                <EmptyState>
                  <div className="icon">📈</div>
                  <h3>보유 주식이 없습니다</h3>
                  <p>시장에서 주식을 구매해보세요!</p>
                </EmptyState>
              </CardContent>
            </Card>
          )}

          {/* 옵션 포지션 */}
          {portfolio.options_positions && portfolio.options_positions.length > 0 && (
            <Card>
              <CardHeader>
                <h2>
                  옵션 포지션
                  <span style={{ fontSize: '14px', color: '#999', fontWeight: 400, marginLeft: '8px' }}>
                    ({portfolio.options_positions.length}건)
                  </span>
                </h2>
              </CardHeader>
              <CardContent>
                <HoldingsTable>
                  <Table>
                    <thead>
                      <tr>
                        <th>기초자산</th>
                        <th>유형</th>
                        <th>행사가</th>
                        <th>만기</th>
                        <th>수량</th>
                        <th>현재가치</th>
                        <th>미실현 손익</th>
                      </tr>
                    </thead>
                    <tbody>
                      {portfolio.options_positions.map((pos) => (
                        <tr key={pos._id}>
                          <td style={{ fontWeight: 600 }}>{pos.underlying}</td>
                          <td>
                            <span style={{
                              padding: '3px 10px', borderRadius: '4px', fontWeight: 700, fontSize: '12px',
                              background: pos.option_type === 'call' ? 'rgba(231,76,60,0.1)' : 'rgba(52,152,219,0.1)',
                              color: pos.option_type === 'call' ? '#e74c3c' : '#3498db',
                            }}>
                              {pos.option_type?.toUpperCase()}
                            </span>
                          </td>
                          <td>{formatNumber(pos.strike_price)}</td>
                          <td>{pos.expiry_date ? new Date(pos.expiry_date).toLocaleDateString('ko-KR') : '-'}</td>
                          <td>{pos.quantity}</td>
                          <td>₩{formatNumber(pos.current_value || 0)}</td>
                          <td style={{ color: getProfitColor(pos.unrealized_pnl), fontWeight: 600 }}>
                            {pos.unrealized_pnl >= 0 ? '+' : ''}₩{formatNumber(pos.unrealized_pnl || 0)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </HoldingsTable>
              </CardContent>
            </Card>
          )}

          {/* 선물 포지션 */}
          {portfolio.futures_positions && portfolio.futures_positions.length > 0 && (
            <Card>
              <CardHeader>
                <h2>
                  선물 포지션
                  <span style={{ fontSize: '14px', color: '#999', fontWeight: 400, marginLeft: '8px' }}>
                    ({portfolio.futures_positions.length}건)
                  </span>
                </h2>
              </CardHeader>
              <CardContent>
                <HoldingsTable>
                  <Table>
                    <thead>
                      <tr>
                        <th>계약</th>
                        <th>방향</th>
                        <th>수량</th>
                        <th>진입가</th>
                        <th>현재가</th>
                        <th>만기</th>
                        <th>미실현 손익</th>
                      </tr>
                    </thead>
                    <tbody>
                      {portfolio.futures_positions.map((pos) => (
                        <tr key={pos._id}>
                          <td style={{ fontWeight: 600 }}>{pos.contract_name || pos.contract_symbol}</td>
                          <td>
                            <span style={{
                              padding: '3px 10px', borderRadius: '4px', fontWeight: 700, fontSize: '12px',
                              background: pos.direction === 'long' ? 'rgba(231,76,60,0.1)' : 'rgba(52,152,219,0.1)',
                              color: pos.direction === 'long' ? '#e74c3c' : '#3498db',
                            }}>
                              {pos.direction === 'long' ? '롱' : '숏'}
                            </span>
                          </td>
                          <td>{pos.quantity}</td>
                          <td>{formatNumber(pos.entry_price)}</td>
                          <td>{formatNumber(pos.current_price)}</td>
                          <td>{pos.expiry_date ? new Date(pos.expiry_date).toLocaleDateString('ko-KR') : '-'}</td>
                          <td style={{ color: getProfitColor(pos.unrealized_pnl), fontWeight: 600 }}>
                            {pos.unrealized_pnl >= 0 ? '+' : ''}₩{formatNumber(pos.unrealized_pnl || 0)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </HoldingsTable>
              </CardContent>
            </Card>
          )}

          {/* 숏 포지션 */}
          {portfolio.short_positions && portfolio.short_positions.length > 0 && (
            <Card>
              <CardHeader>
                <h2>
                  숏 포지션 <ShortBadge>SHORT</ShortBadge>
                  <span style={{ fontSize: '14px', color: '#999', fontWeight: 400, marginLeft: '8px' }}>
                    ({portfolio.short_positions.length}종목)
                  </span>
                </h2>
              </CardHeader>
              <CardContent>
                <HoldingsTable>
                  <Table>
                    <thead>
                      <tr>
                        <th>종목</th>
                        <th>수량</th>
                        <th>공매도가</th>
                        <th>현재가</th>
                        <th>평가 손익</th>
                        <th>증거금</th>
                        <th>액션</th>
                      </tr>
                    </thead>
                    <tbody>
                      {portfolio.short_positions.map((pos) => {
                        const profitLoss = (pos.entry_price - pos.current_price) * pos.quantity;
                        const profitLossPercent = pos.entry_price > 0
                          ? ((pos.entry_price - pos.current_price) / pos.entry_price) * 100
                          : 0;

                        return (
                          <tr key={`short-${pos.symbol}`}>
                            <td>
                              <StockCell onClick={() => navigate(`/stock/${pos.symbol}`)}>
                                <div className="symbol">{pos.symbol}</div>
                                <div className="name">{pos.name}</div>
                              </StockCell>
                            </td>
                            <td>{formatQuantity(pos.quantity)}</td>
                            <td>
                              <PriceCell>
                                <div className="current-price">₩{formatNumber(Math.round(pos.entry_price))}</div>
                              </PriceCell>
                            </td>
                            <td>
                              <PriceCell>
                                <div className="current-price">₩{formatNumber(Math.round(pos.current_price))}</div>
                              </PriceCell>
                            </td>
                            <td>
                              <ValueCell style={{ color: getProfitColor(profitLoss) }}>
                                <div className="main-value">
                                  {profitLoss >= 0 ? '+' : '-'}₩{formatNumber(Math.round(Math.abs(profitLoss)))}
                                  <span style={{ fontSize: '12px', marginLeft: '4px' }}>
                                    ({profitLoss >= 0 ? '+' : ''}{formatPercent(profitLossPercent)})
                                  </span>
                                </div>
                              </ValueCell>
                            </td>
                            <td>
                              <CommissionCell>₩{formatNumber(Math.round(pos.margin || 0))}</CommissionCell>
                            </td>
                            <td>
                              <ActionButton
                                variant="cover"
                                onClick={() => handleShortCover(pos.symbol, pos.quantity)}
                              >
                                숏커버
                              </ActionButton>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </Table>
                </HoldingsTable>
              </CardContent>
            </Card>
          )}

          {/* 그룹에 포함되지 않은 기타 시장 */}
          {Object.keys(marketGroups)
            .filter(m => !marketOrder.includes(m))
            .map(market => (
              <Card key={market}>
                <CardHeader>
                  <h2>
                    <MarketLabel market={market}>{getCurrSym(market)}</MarketLabel>
                    {MARKET_NAMES[market] || `${market} 주식`}
                    <span style={{ fontSize: '14px', color: '#999', fontWeight: 400, marginLeft: '8px' }}>
                      ({marketGroups[market].length}종목)
                    </span>
                  </h2>
                </CardHeader>
                <CardContent>
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
                          <th>매도 수수료</th>
                          <th>액션</th>
                        </tr>
                      </thead>
                      <tbody>
                        {marketGroups[market].map((holding) => (
                          <tr key={holding.symbol}>
                            <td>
                              <StockCell onClick={() => navigate(`/stock/${holding.symbol}`)}>
                                <div className="symbol">{holding.symbol}</div>
                                <div className="name">{holding.name}</div>
                              </StockCell>
                            </td>
                            <td>{formatQuantity(holding.quantity)}</td>
                            <td>
                              <PriceCell>
                                <div className="current-price">
                                  ₩{formatNumber(Math.round(holding.purchase_price))}
                                </div>
                                {holding.purchase_price_original != null && (
                                  <div className="original-price">
                                    {getCurrSym(holding.currency)}{formatNumber(Math.round(holding.purchase_price_original * 100) / 100)}
                                  </div>
                                )}
                              </PriceCell>
                            </td>
                            <td>
                              <PriceCell>
                                <div className="current-price">
                                  ₩{formatNumber(Math.round(holding.current_price))}
                                </div>
                                {holding.original_price && (
                                  <div className="original-price">
                                    {getCurrSym(holding.currency)}{formatNumber(holding.original_price)}
                                  </div>
                                )}
                              </PriceCell>
                            </td>
                            <td>{renderHoldingValue(holding)}</td>
                            <td>{renderHoldingProfit(holding)}</td>
                            <td>
                              <CommissionCell>₩{formatNumber(holding.estimated_sell_commission || 0)}</CommissionCell>
                            </td>
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
                </CardContent>
              </Card>
            ))}
        </>
      )}
    </Container>
  );
};

export default Portfolio;
