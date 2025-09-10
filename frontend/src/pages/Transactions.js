import React, { useState, useEffect } from 'react';
import { portfolioService } from '../services/portfolioService';
import { 
  formatCurrency, 
  formatDate, 
  formatNumber, 
  formatErrorMessage,
  getMarketFromSymbol 
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
  
  .symbol {
    font-weight: 700;
    color: #333;
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

const Pagination = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16px;
  margin-top: 20px;
  padding: 20px;
`;

const PageButton = styled.button`
  padding: 8px 16px;
  border: 1px solid #ddd;
  background: white;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover:not(:disabled) {
    background: #f8f9fa;
    border-color: #667eea;
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  &.active {
    background: #667eea;
    color: white;
    border-color: #667eea;
  }
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
                {formatCurrency(stats.totalBuyAmount)}
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
                    <th>가격</th>
                    <th>거래금액</th>
                    <th>수수료</th>
                    <th>총 금액</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.map((transaction) => (
                    <tr key={transaction._id}>
                      <td>{formatDate(transaction.timestamp)}</td>
                      <td className="symbol">{transaction.symbol}</td>
                      <td>
                        <Badge className={transaction.type}>
                          {transaction.type === 'buy' ? '매수' : '매도'}
                        </Badge>
                      </td>
                      <td>{formatNumber(transaction.quantity)}</td>
                      <td>
                        {getMarketFromSymbol(transaction.symbol) === 'KRW' 
                          ? formatNumber(transaction.price) + '원'
                          : '$' + formatNumber(transaction.price)
                        }
                      </td>
                      <td>
                        {formatCurrency(
                          transaction.quantity * transaction.price,
                          getMarketFromSymbol(transaction.symbol)
                        )}
                      </td>
                      <td>
                        {formatCurrency(
                          transaction.commission,
                          getMarketFromSymbol(transaction.symbol)
                        )}
                      </td>
                      <td className={transaction.type}>
                        {formatCurrency(
                          transaction.total_amount,
                          getMarketFromSymbol(transaction.symbol)
                        )}
                      </td>
                    </tr>
                  ))}
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
