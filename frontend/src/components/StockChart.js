import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { stockService } from '../services/stockService';
import { formatCurrency, formatErrorMessage, getMarketFromSymbol } from '../utils/helpers';
import styled from 'styled-components';

const ChartContainer = styled.div`
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);
  overflow: hidden;
`;

const ChartHeader = styled.div`
  padding: 20px;
  border-bottom: 1px solid #eee;
  display: flex;
  justify-content: space-between;
  align-items: center;
  
  h3 {
    margin: 0;
    color: #333;
    font-size: 18px;
    font-weight: 700;
  }
`;

const PeriodButtons = styled.div`
  display: flex;
  gap: 8px;
`;

const PeriodButton = styled.button`
  padding: 6px 12px;
  border: 1px solid ${props => props.active ? '#667eea' : '#ddd'};
  background: ${props => props.active ? '#667eea' : 'white'};
  color: ${props => props.active ? 'white' : '#666'};
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    border-color: #667eea;
    background: ${props => props.active ? '#5a6fd8' : '#f8f9fa'};
  }
`;

const ChartContent = styled.div`
  padding: 20px;
  height: 400px;
`;

const LoadingState = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 300px;
  
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

const ErrorMessage = styled.div`
  background: #ffeaea;
  color: #e74c3c;
  padding: 16px;
  border-radius: 8px;
  border-left: 4px solid #e74c3c;
  margin: 20px;
`;

const StockInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  
  .symbol {
    font-size: 16px;
    font-weight: 700;
    color: #333;
  }
  
  .name {
    font-size: 14px;
    color: #666;
  }
`;

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const market = getMarketFromSymbol(data.symbol || '');
    
    return (
      <div style={{
        backgroundColor: 'white',
        padding: '12px',
        border: '1px solid #ddd',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
      }}>
        <p style={{ margin: '0 0 8px 0', fontWeight: '600' }}>{label}</p>
        <p style={{ margin: '4px 0', color: '#666' }}>
          시가: {market === 'KRW' ? `${data.open?.toLocaleString()}원` : `$${data.open?.toFixed(2)}`}
        </p>
        <p style={{ margin: '4px 0', color: '#e74c3c' }}>
          고가: {market === 'KRW' ? `${data.high?.toLocaleString()}원` : `$${data.high?.toFixed(2)}`}
        </p>
        <p style={{ margin: '4px 0', color: '#3498db' }}>
          저가: {market === 'KRW' ? `${data.low?.toLocaleString()}원` : `$${data.low?.toFixed(2)}`}
        </p>
        <p style={{ margin: '4px 0', fontWeight: '600' }}>
          종가: {market === 'KRW' ? `${data.close?.toLocaleString()}원` : `$${data.close?.toFixed(2)}`}
        </p>
        <p style={{ margin: '4px 0', color: '#999' }}>
          거래량: {data.volume?.toLocaleString()}
        </p>
      </div>
    );
  }
  return null;
};

const StockChart = ({ symbol, stockInfo }) => {
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState(30);
  const [chartType, setChartType] = useState('line'); // 'line' or 'area'

  const periods = [
    { label: '1주', value: 7 },
    { label: '1개월', value: 30 },
    { label: '3개월', value: 90 },
    { label: '6개월', value: 180 },
    { label: '1년', value: 365 }
  ];

  useEffect(() => {
    loadChartData();
  }, [symbol, selectedPeriod]);

  const loadChartData = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await stockService.getStockHistory(symbol, selectedPeriod);
      
      // 차트 데이터 포맷 변환
      const formattedData = response.data.map(item => ({
        ...item,
        symbol: symbol, // 툴팁에서 사용하기 위해 추가
        displayDate: new Date(item.date).toLocaleDateString('ko-KR', {
          month: 'short',
          day: 'numeric'
        })
      }));
      
      setChartData(formattedData);
      
    } catch (error) {
      console.error('Chart data loading error:', error);
      setError(formatErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const market = getMarketFromSymbol(symbol);
  const isKorean = market === 'KRW';

  return (
    <ChartContainer>
      <ChartHeader>
        <StockInfo>
          <div className="symbol">{symbol}</div>
          {stockInfo && <div className="name">{stockInfo.name}</div>}
        </StockInfo>
        <PeriodButtons>
          {periods.map((period) => (
            <PeriodButton
              key={period.value}
              active={selectedPeriod === period.value}
              onClick={() => setSelectedPeriod(period.value)}
            >
              {period.label}
            </PeriodButton>
          ))}
        </PeriodButtons>
      </ChartHeader>

      {error && <ErrorMessage>{error}</ErrorMessage>}

      <ChartContent>
        {loading ? (
          <LoadingState>
            <div className="spinner"></div>
          </LoadingState>
        ) : chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            {chartType === 'area' ? (
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#667eea" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#667eea" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="displayDate" 
                  stroke="#666"
                  fontSize={12}
                  tickLine={false}
                />
                <YAxis 
                  stroke="#666"
                  fontSize={12}
                  tickLine={false}
                  tickFormatter={(value) => 
                    isKorean ? `${(value / 1000).toFixed(0)}K` : `$${value.toFixed(0)}`
                  }
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="close"
                  stroke="#667eea"
                  strokeWidth={2}
                  fill="url(#colorPrice)"
                />
              </AreaChart>
            ) : (
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="displayDate" 
                  stroke="#666"
                  fontSize={12}
                  tickLine={false}
                />
                <YAxis 
                  stroke="#666"
                  fontSize={12}
                  tickLine={false}
                  tickFormatter={(value) => 
                    isKorean ? `${(value / 1000).toFixed(0)}K` : `$${value.toFixed(0)}`
                  }
                />
                <Tooltip content={<CustomTooltip />} />
                <Line
                  type="monotone"
                  dataKey="close"
                  stroke="#667eea"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            )}
          </ResponsiveContainer>
        ) : (
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '300px',
            color: '#666'
          }}>
            차트 데이터가 없습니다.
          </div>
        )}
      </ChartContent>
    </ChartContainer>
  );
};

export default StockChart;
