import React, { useState, useEffect } from 'react';
import { portfolioService } from '../services/portfolioService';
import {
  formatCurrency,
  formatDate,
  formatNumber,
  formatErrorMessage,
  getMarketFromSymbol,
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

  p {
    margin: 8px 0 0 0;
    color: #666;
    font-size: 16px;
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

const FilterSection = styled.div`
  display: flex;
  gap: 16px;
  margin-bottom: 20px;
  flex-wrap: wrap;
  align-items: center;
`;

const Select = styled.select`
  padding: 8px 12px;
  border: 2px solid #e1e5e9;
  border-radius: 6px;
  font-size: 14px;
  background: white;

  &:focus {
    outline: none;
    border-color: #667eea;
  }
`;

const TransactionsTable = styled.div`
  overflow-x: auto;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;

  th, td {
    padding: 12px;
    text-align: left;
    border-bottom: 1px solid #eee;
  }

  th {
    background: #f8f9fa;
    font-weight: 600;
    color: #555;
    font-size: 14px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  td {
    font-size: 14px;
  }

  .buy {
    color: #e74c3c;
    font-weight: 600;
  }

  .sell {
    color: #3498db;
    font-weight: 600;
  }
`;

const StockCell = styled.div`
  .symbol {
    font-weight: 700;
    color: #333;
    margin-bottom: 2px;
  }

  .name {
    font-size: 12px;
    color: #666;
  }
`;

const PriceCell = styled.div`
  .main-price {
    font-weight: 600;
    color: #333;
  }

  .sub-price {
    font-size: 12px;
    color: #999;
    margin-top: 2px;
  }
`;

const Badge = styled.span`
  display: inline-block;
  padding: 4px 8px;
  font-size: 12px;
  font-weight: 600;
  border-radius: 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;

  &.buy {
    background: #ffeaea;
    color: #e74c3c;
  }

  &.sell {
    background: #e3f2fd;
    color: #3498db;
  }

  &.admin_deposit {
    background: #e8f5e9;
    color: #2e7d32;
  }

  &.admin_withdraw {
    background: #fff3e0;
    color: #e65100;
  }

  &.referral_bonus {
    background: #f3e5f5;
    color: #7b1fa2;
  }

  &.short_sell {
    background: #fce4ec;
    color: #c62828;
  }

  &.short_cover {
    background: #fff3e0;
    color: #e65100;
  }

  &.option_buy {
    background: #ede7f6;
    color: #4527a0;
  }

  &.option_sell {
    background: #e8eaf6;
    color: #283593;
  }

  &.option_exercise {
    background: #e0f2f1;
    color: #00695c;
  }

  &.futures_long {
    background: #ffeaea;
    color: #e74c3c;
  }

  &.futures_short {
    background: #e3f2fd;
    color: #1565c0;
  }

  &.futures_close {
    background: #fff8e1;
    color: #f57f17;
  }

  &.bet_place {
    background: #fff3e0;
    color: #e65100;
  }

  &.bet_win {
    background: #e8f5e9;
    color: #2e7d32;
  }

  &.bet_loss {
    background: #ffeaea;
    color: #c62828;
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

const LoadingState = styled.div`
  text-align: center;
  padding: 40px;

  .spinner {
    width: 40px;
    height: 40px;
    border: 4px solid #f3f3f3;
    border-top: 4px solid #667eea;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin: 0 auto 16px;
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

const Transactions = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all'); // all, buy, sell
  const [limit, setLimit] = useState(50);

  useEffect(() => {
    loadTransactions();
  }, [limit]);

  const loadTransactions = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await portfolioService.getTransactions(limit);
      setTransactions(response.data);

    } catch (error) {
      console.error('Transactions loading error:', error);
      setError(formatErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const filteredTransactions = transactions.filter(transaction => {
    if (filter === 'all') return true;
    if (filter === 'admin') return transaction.type === 'admin_deposit' || transaction.type === 'admin_withdraw';
    if (filter === 'referral') return transaction.type === 'referral_bonus';
    if (filter === 'short') return transaction.type === 'short_sell' || transaction.type === 'short_cover';
    if (filter === 'option') return ['option_buy', 'option_sell', 'option_exercise'].includes(transaction.type);
    if (filter === 'futures') return ['futures_long', 'futures_short', 'futures_close'].includes(transaction.type);
    if (filter === 'prediction') return ['bet_place', 'bet_win', 'bet_loss'].includes(transaction.type);
    return transaction.type === filter;
  });

  const calculateTotalAmount = (transactions) => {
    return transactions.reduce((total, transaction) => {
      return total + transaction.total_amount;
    }, 0);
  };

  const getTransactionStats = () => {
    const buyTransactions = transactions.filter(t => t.type === 'buy');
    const sellTransactions = transactions.filter(t => t.type === 'sell');

    return {
      totalTransactions: transactions.length,
      buyCount: buyTransactions.length,
      sellCount: sellTransactions.length,
      totalBuyAmount: calculateTotalAmount(buyTransactions),
      totalSellAmount: calculateTotalAmount(sellTransactions),
    };
  };

  const getDisplayName = (t) => {
    return t.name && t.name !== t.symbol ? t.name : '';
  };

  const renderPrice = (t) => {
    // price는 항상 원화로 저장됨
    const market = t.market || getMarketFromSymbol(t.symbol);
    const isKRW = market === 'KRW';

    return (
      <PriceCell>
        <div className="main-price">₩{formatNumber(Math.round(t.price))}</div>
        {!isKRW && t.original_price && (
          <div className="sub-price">
            {getCurrencySymbol(market)}{formatNumber(Math.round(t.original_price * 100) / 100)}
          </div>
        )}
      </PriceCell>
    );
  };

  const renderAmount = (amount) => {
    return `₩${formatNumber(Math.round(amount))}`;
  };

  if (loading) {
    return (
      <Container>
        <Header>
          <h1>거래 내역</h1>
          <p>모든 매수/매도 거래 내역을 확인할 수 있습니다.</p>
        </Header>
        <Card>
          <CardContent>
            <LoadingState>
              <div className="spinner"></div>
              <div>거래 내역을 불러오고 있습니다...</div>
            </LoadingState>
          </CardContent>
        </Card>
      </Container>
    );
  }

  const stats = getTransactionStats();

  return (
    <Container>
      <Header>
        <h1>거래 내역</h1>
        <p>모든 매수/매도 거래 내역을 확인할 수 있습니다.</p>
      </Header>

      {error && <ErrorMessage>{error}</ErrorMessage>}

      <Card>
        <CardHeader>
          <h2>거래 통계</h2>
        </CardHeader>
        <CardContent>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '20px'
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: '700', color: '#333' }}>
                {stats.totalTransactions}
              </div>
              <div style={{ fontSize: '14px', color: '#666', marginTop: '4px' }}>
                총 거래 수
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: '700', color: '#e74c3c' }}>
                {stats.buyCount}
              </div>
              <div style={{ fontSize: '14px', color: '#666', marginTop: '4px' }}>
                매수 거래
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: '700', color: '#3498db' }}>
                {stats.sellCount}
              </div>
              <div style={{ fontSize: '14px', color: '#666', marginTop: '4px' }}>
                매도 거래
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '18px', fontWeight: '700', color: '#333' }}>
                ₩{formatNumber(Math.round(stats.totalBuyAmount))}
              </div>
              <div style={{ fontSize: '14px', color: '#666', marginTop: '4px' }}>
                총 매수 금액
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card style={{ marginTop: '30px' }}>
        <CardHeader>
          <h2>거래 내역</h2>
          <FilterSection>
            <Select value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option value="all">전체</option>
              <option value="buy">매수만</option>
              <option value="sell">매도만</option>
              <option value="short">공매도</option>
              <option value="option">옵션</option>
              <option value="futures">선물</option>
              <option value="prediction">예측마켓</option>
              <option value="admin">관리자 조정</option>
              <option value="referral">추천 보너스</option>
            </Select>
            <Select value={limit} onChange={(e) => setLimit(parseInt(e.target.value))}>
              <option value={20}>최근 20건</option>
              <option value={50}>최근 50건</option>
              <option value={100}>최근 100건</option>
            </Select>
          </FilterSection>
        </CardHeader>
        <CardContent>
          {filteredTransactions.length > 0 ? (
            <TransactionsTable>
              <Table>
                <thead>
                  <tr>
                    <th>날짜/시간</th>
                    <th>종목</th>
                    <th>거래유형</th>
                    <th>수량</th>
                    <th>단가</th>
                    <th>거래금액</th>
                    <th>수수료</th>
                    <th>총 금액</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.map((transaction) => {
                    const isAdmin = transaction.type === 'admin_deposit' || transaction.type === 'admin_withdraw';
                    const isReferral = transaction.type === 'referral_bonus';
                    const isPrediction = ['bet_place', 'bet_win', 'bet_loss'].includes(transaction.type);
                    const isSpecial = isAdmin || isReferral || isPrediction;
                    const typeLabel = {
                      buy: '매수', sell: '매도',
                      short_sell: '공매도', short_cover: '숏커버',
                      option_buy: '옵션 매수', option_sell: '옵션 매도', option_exercise: '옵션 행사',
                      futures_long: '선물 롱', futures_short: '선물 숏', futures_close: '선물 청산',
                      bet_place: '베팅', bet_win: '적중', bet_loss: '실패',
                      admin_deposit: '입금', admin_withdraw: '출금',
                      referral_bonus: '추천 보너스'
                    }[transaction.type] || transaction.type;

                    return (
                      <tr key={transaction._id}>
                        <td>{formatDate(transaction.timestamp)}</td>
                        <td>
                          {isSpecial ? (
                            <StockCell>
                              <div className="symbol" style={{ color: isPrediction ? '#e65100' : isReferral ? '#7b1fa2' : '#888' }}>
                                {isPrediction ? '예측마켓' : isReferral ? '추천 보너스' : '관리자 조정'}
                              </div>
                              {(transaction.memo || transaction.name) && <div className="name">{transaction.memo || transaction.name}</div>}
                            </StockCell>
                          ) : (
                            <StockCell>
                              <div className="symbol">{transaction.symbol}</div>
                              {getDisplayName(transaction) && (
                                <div className="name">{getDisplayName(transaction)}</div>
                              )}
                            </StockCell>
                          )}
                        </td>
                        <td>
                          <Badge className={transaction.type}>{typeLabel}</Badge>
                        </td>
                        <td>{isSpecial ? '-' : formatNumber(transaction.quantity)}</td>
                        <td>{isSpecial ? '-' : renderPrice(transaction)}</td>
                        <td>
                          {isSpecial ? (
                            <span style={{ fontWeight: 600, color: transaction.type === 'bet_win' ? '#2e7d32' : transaction.type === 'bet_loss' ? '#c62828' : isPrediction ? '#e65100' : isReferral ? '#7b1fa2' : transaction.type === 'admin_deposit' ? '#2e7d32' : '#e65100' }}>
                              {(isReferral || transaction.type === 'admin_deposit' || transaction.type === 'bet_win') ? '+' : '-'}₩{formatNumber(Math.round(transaction.total_amount))}
                            </span>
                          ) : renderAmount(transaction.quantity * transaction.price)}
                        </td>
                        <td>{isSpecial ? '-' : renderAmount(transaction.commission)}</td>
                        <td className={isSpecial ? '' : transaction.type}>
                          {isSpecial ? (
                            <span style={{ fontWeight: 700, color: transaction.type === 'bet_win' ? '#2e7d32' : transaction.type === 'bet_loss' ? '#c62828' : isPrediction ? '#e65100' : isReferral ? '#7b1fa2' : transaction.type === 'admin_deposit' ? '#2e7d32' : '#e65100' }}>
                              {(isReferral || transaction.type === 'admin_deposit' || transaction.type === 'bet_win') ? '+' : '-'}₩{formatNumber(Math.round(transaction.total_amount))}
                            </span>
                          ) : renderAmount(transaction.total_amount)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            </TransactionsTable>
          ) : (
            <EmptyState>
              <div className="icon">📊</div>
              <h3>거래 내역이 없습니다</h3>
              <p>첫 번째 주식 거래를 시작해보세요!</p>
            </EmptyState>
          )}
        </CardContent>
      </Card>
    </Container>
  );
};

export default Transactions;
