import React, { useState, useEffect } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Area, AreaChart, ComposedChart, Bar, Cell, ReferenceLine
} from 'recharts';
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
  flex-wrap: wrap;
  gap: 16px;
  
  h3 {
    margin: 0;
    color: #333;
    font-size: 18px;
    font-weight: 700;
  }
`;

const ChartControls = styled.div`
  display: flex;
  gap: 16px;
  align-items: center;
  flex-wrap: wrap;
`;

const ControlGroup = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;
`;

const ControlLabel = styled.span`
  font-size: 12px;
  color: #666;
  font-weight: 600;
`;

const PeriodButtons = styled.div`
  display: flex;
  gap: 4px;
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

const ChartTypeButtons = styled.div`
  display: flex;
  gap: 4px;
`;

const ChartTypeButton = styled.button`
  padding: 6px 12px;
  border: 1px solid ${props => props.active ? '#e67e22' : '#ddd'};
  background: ${props => props.active ? '#e67e22' : 'white'};
  color: ${props => props.active ? 'white' : '#666'};
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    border-color: #e67e22;
    background: ${props => props.active ? '#d35400' : '#f8f9fa'};
  }
`;

const IntervalButtons = styled.div`
  display: flex;
  gap: 4px;
`;

const IntervalButton = styled.button`
  padding: 4px 8px;
  border: 1px solid ${props => props.active ? '#9b59b6' : '#ddd'};
  background: ${props => props.active ? '#9b59b6' : 'white'};
  color: ${props => props.active ? 'white' : '#666'};
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    border-color: #9b59b6;
    background: ${props => props.active ? '#8e44ad' : '#f8f9fa'};
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const MovingAverageButtons = styled.div`
  display: flex;
  gap: 4px;
`;

const MAButton = styled.button`
  padding: 4px 8px;
  border: 1px solid ${props => props.active ? props.color : '#ddd'};
  background: ${props => props.active ? props.color : 'white'};
  color: ${props => props.active ? 'white' : props.color};
  border-radius: 4px;
  font-size: 10px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  min-width: 35px;
  
  &:hover {
    border-color: ${props => props.color};
    background: ${props => props.active ? props.color : '#f8f9fa'};
  }
`;

const ChartContent = styled.div`
  padding: 20px;
  height: 600px;
`;

const LoadingState = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 500px;
  
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

const ChartStats = styled.div`
  display: flex;
  gap: 20px;
  margin-bottom: 16px;
  padding: 12px;
  background: #f8f9fa;
  border-radius: 8px;
  font-size: 12px;
`;

const StatItem = styled.div`
  display: flex;
  flex-direction: column;
  
  .label {
    color: #666;
    margin-bottom: 2px;
  }
  
  .value {
    font-weight: 600;
    color: ${props => props.color || '#333'};
  }
`;

// 이동평균선 계산 함수 - 개선버전
const calculateMovingAverages = (data, periods = [5, 20, 60, 120]) => {
  if (!data || data.length === 0) return data;
  
  return data.map((item, index) => {
    const newItem = { ...item };
    
    periods.forEach(period => {
      if (index >= period - 1) {
        // 충분한 데이터가 있을 때 정상 계산
        const slice = data.slice(index - period + 1, index + 1);
        const sum = slice.reduce((acc, curr) => acc + (curr.close || 0), 0);
        newItem[`ma${period}`] = sum / period;
      } else if (index > 0) {
        // 데이터가 부족할 때 사용 가능한 데이터만 사용
        const availableSlice = data.slice(0, index + 1);
        const sum = availableSlice.reduce((acc, curr) => acc + (curr.close || 0), 0);
        newItem[`ma${period}`] = sum / availableSlice.length;
      } else {
        // 첫 번째 데이터에는 현재가를 사용
        newItem[`ma${period}`] = item.close;
      }
    });
    
    return newItem;
  });
};

// 캔들스틱 커스텀 컴포넌트 - 직접 도메인 계산 방식
const CandlestickShape = (props) => {
  const { payload, x, y, width, height } = props;
  
  if (!payload || typeof payload.open !== 'number' || typeof payload.close !== 'number' || 
      typeof payload.high !== 'number' || typeof payload.low !== 'number') {
    return null;
  }
  
  const { open, close, high, low } = payload;
  
  // 데이터 유효성 검증
  if (high <= low || low <= 0 || high <= 0 || open <= 0 || close <= 0) {
    console.warn('비정상적인 가격 데이터:', { open, close, high, low });
    return null;
  }
  
  // 상승/하락 여부 결정
  const isRising = close >= open;
  const bodyColor = isRising ? '#ff4444' : '#0066ff';
  const fillColor = isRising ? '#ff4444' : '#0066ff';
  
  // 캔들 스타일 설정
  const candleWidth = Math.min(width * 0.6, 10);
  const wickWidth = 1;
  const centerX = x + width / 2;
  
  // ⭐️ 핵심: 차트의 전체 높이를 기준으로 직접 계산
  // Recharts에서 Bar의 y, height는 dataKey 값에 대한 상대적 위치이므로
  // 우리가 직접 도메인 범위를 계산하여 사용
  
  // 가격 범위 계산
  const priceRange = high - low;
  if (priceRange === 0) {
    return (
      <g>
        <line
          x1={centerX - candleWidth / 2}
          y1={y + height / 2}
          x2={centerX + candleWidth / 2}
          y2={y + height / 2}
          stroke={bodyColor}
          strokeWidth={2}
        />
      </g>
    );
  }
  
  // 현재 Bar의 기준가(close)를 이용해 다른 가격들의 상대적 위치 계산
  const getRelativeY = (price) => {
    // close 가격이 y + height/2 위치에 있다고 가정하고
    // 다른 가격들의 상대적 위치를 계산
    const priceFromClose = price - close;
    const pixelsPerPrice = height / priceRange; // 1원당 픽셀 비율
    
    // close 위치에서 상대적 오프셋 계산 (위쪽이 음수, 아래쪽이 양수)
    return y + height / 2 - (priceFromClose * pixelsPerPrice);
  };
  
  const highY = getRelativeY(high);
  const openY = getRelativeY(open);
  const closeY = getRelativeY(close); // y + height / 2
  const lowY = getRelativeY(low);
  
  // 몸통의 상단과 하단
  const bodyTop = Math.min(openY, closeY);
  const bodyBottom = Math.max(openY, closeY);
  
  // 몸통 높이 계산
  const actualBodyHeight = Math.abs(bodyBottom - bodyTop);
  const bodyHeight = actualBodyHeight > 0.3 ? actualBodyHeight : 1.5;
  
  // 도지 판단
  const isDoji = Math.abs(open - close) / priceRange < 0.005;
  
  // 디버깅용 로그
  if (Math.random() < 0.1) { // 10% 확률로만 로그 출력
    console.log('캔들 좌표 계산 (직접계산):', {
      prices: { high, open, close, low },
      rechartProps: { y: y.toFixed(1), height: height.toFixed(1) },
      calculated: { 
        highY: highY.toFixed(1), 
        openY: openY.toFixed(1), 
        closeY: closeY.toFixed(1), 
        lowY: lowY.toFixed(1) 
      },
      bodyTop: bodyTop.toFixed(1),
      bodyBottom: bodyBottom.toFixed(1),
      priceRange,
      pixelsPerPrice: (height / priceRange).toFixed(2)
    });
  }
  
  return (
    <g>
      {/* 위쪽 심지 (고가 → 몸통 상단) */}
      <line
        x1={centerX}
        y1={highY}
        x2={centerX}
        y2={bodyTop}
        stroke={bodyColor}
        strokeWidth={wickWidth}
      />
      
      {/* 아래쪽 심지 (몸통 하단 → 저가) */}
      <line
        x1={centerX}
        y1={bodyBottom}
        x2={centerX}
        y2={lowY}
        stroke={bodyColor}
        strokeWidth={wickWidth}
      />
      
      {/* 캔들 몸통 또는 도지 선 */}
      {isDoji ? (
        // 도지(시가=종가)인 경우 수평선
        <line
          x1={centerX - candleWidth / 2}
          y1={(bodyTop + bodyBottom) / 2}
          x2={centerX + candleWidth / 2}
          y2={(bodyTop + bodyBottom) / 2}
          stroke={bodyColor}
          strokeWidth={2}
        />
      ) : (
        // 일반 캔들 몸통
        <rect
          x={centerX - candleWidth / 2}
          y={bodyTop}
          width={candleWidth}
          height={bodyHeight}
          fill={isRising ? fillColor : 'white'}
          stroke={bodyColor}
          strokeWidth={1}
        />
      )}
    </g>
  );
};

// 캔들차트용 커스텀 툴팁
const CandlestickTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length && payload[0].payload) {
    const data = payload[0].payload;
    const market = getMarketFromSymbol(data.symbol || '');
    const isKorean = market === 'KRW';
    
    const formatPrice = (price) => {
      return isKorean 
        ? `${Math.round(price).toLocaleString()}원` 
        : `$${price.toFixed(2)}`;
    };
    
    const isRising = data.close >= data.open;
    
    return (
      <div style={{
        backgroundColor: 'white',
        padding: '12px',
        border: '1px solid #ddd',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
        fontSize: '12px'
      }}>
        <p style={{ margin: '0 0 8px 0', fontWeight: '600', fontSize: '13px' }}>{label}</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <div>
            <div style={{ color: '#666' }}>시가</div>
            <div style={{ fontWeight: '600' }}>{formatPrice(data.open)}</div>
          </div>
          <div>
            <div style={{ color: '#e74c3c' }}>고가</div>
            <div style={{ fontWeight: '600', color: '#e74c3c' }}>{formatPrice(data.high)}</div>
          </div>
          <div>
            <div style={{ color: '#3498db' }}>저가</div>
            <div style={{ fontWeight: '600', color: '#3498db' }}>{formatPrice(data.low)}</div>
          </div>
          <div>
            <div style={{ color: '#333' }}>종가</div>
            <div style={{ 
              fontWeight: '600', 
              color: isRising ? '#ff4444' : '#0066ff'
            }}>{formatPrice(data.close)}</div>
          </div>
        </div>
        <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #eee' }}>
          <div style={{ color: '#666' }}>거래량</div>
          <div style={{ fontWeight: '600' }}>{data.volume?.toLocaleString()}</div>
        </div>
        {data.is_highest && (
          <div style={{ color: '#e74c3c', fontSize: '11px', marginTop: '4px' }}>
            📈 기간 중 최고가
          </div>
        )}
        {data.is_lowest && (
          <div style={{ color: '#3498db', fontSize: '11px', marginTop: '4px' }}>
            📉 기간 중 최저가
          </div>
        )}
      </div>
    );
  }
  return null;
};

// 선차트용 커스텀 툴팁
const LineTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const market = getMarketFromSymbol(data.symbol || '');
    const isKorean = market === 'KRW';
    
    const formatPrice = (price) => {
      return isKorean 
        ? `${Math.round(price).toLocaleString()}원` 
        : `$${price.toFixed(2)}`;
    };
    
    return (
      <div style={{
        backgroundColor: 'white',
        padding: '12px',
        border: '1px solid #ddd',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
        fontSize: '12px'
      }}>
        <p style={{ margin: '0 0 8px 0', fontWeight: '600' }}>{label}</p>
        <p style={{ margin: '4px 0', fontWeight: '600' }}>
          가격: {formatPrice(data.close)}
        </p>
        <p style={{ margin: '4px 0', color: '#666' }}>
          거래량: {data.volume?.toLocaleString()}
        </p>
        {data.is_highest && (
          <div style={{ color: '#e74c3c', fontSize: '11px', marginTop: '4px' }}>
            📈 기간 중 최고가
          </div>
        )}
        {data.is_lowest && (
          <div style={{ color: '#3498db', fontSize: '11px', marginTop: '4px' }}>
            📉 기간 중 최저가
          </div>
        )}
      </div>
    );
  }
  return null;
};

// 거래량 바 색상 결정
const VolumeBar = (props) => {
  const { payload, x, y, width, height } = props;
  
  if (!payload) return null;
  
  const isRising = payload.close >= payload.open;
  const color = isRising ? '#ff4444' : '#0066ff';
  
  return (
    <rect
      x={x}
      y={y}
      width={width}
      height={height}
      fill={color}
      opacity={0.7}
    />
  );
};

const StockChart = ({ symbol, stockInfo }) => {
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState(30);
  const [chartType, setChartType] = useState('line'); // 'line' or 'candle'
  const [interval, setInterval] = useState('daily'); // 'daily', 'weekly', 'monthly'
  const [chartInfo, setChartInfo] = useState(null);
  const [showMovingAverages, setShowMovingAverages] = useState({
    ma5: true,
    ma20: true,
    ma60: false,
    ma120: false
  });

  const periods = [
    { label: '1일', value: 1 },
    { label: '1주', value: 7 },
    { label: '1개월', value: 30 },
    { label: '3개월', value: 90 },
    { label: '6개월', value: 180 },
    { label: '1년', value: 365 }
  ];

  const intervals = [
    { label: '일봉', value: 'daily' },
    { label: '주봉', value: 'weekly' },
    { label: '월봉', value: 'monthly' }
  ];

  useEffect(() => {
    loadChartData();
  }, [symbol, selectedPeriod, interval]);
  
  // 이동평균선 변경시 차트 리렌더링 유도
  useEffect(() => {
    // 이동평균선 상태가 변경되면 차트가 자동으로 리렌더링됨
    console.log('이동평균선 상태 변경:', showMovingAverages);
  }, [showMovingAverages]);

  const loadChartData = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await stockService.getStockHistory(symbol, selectedPeriod, interval);
      
      console.log('원본 데이터 샘플:', response.data.slice(0, 3));
      
      // 오늘 날짜 계산
      const today = new Date();
      today.setHours(23, 59, 59, 999); // 오늘 하루 끝까지 포함
      
      // 차트 데이터 포맷 변환, 미래 날짜 필터링, 데이터 유효성 검증
      let formattedData = response.data
        .filter(item => {
          const itemDate = new Date(item.date);
          // 기본적인 데이터 유효성 검증
          return itemDate <= today && 
                 typeof item.open === 'number' && item.open > 0 &&
                 typeof item.close === 'number' && item.close > 0 &&
                 typeof item.high === 'number' && item.high > 0 &&
                 typeof item.low === 'number' && item.low > 0 &&
                 item.high >= item.low; // 고가 >= 저가
        })
        .map(item => ({
          ...item,
          symbol: symbol, // 툴팁에서 사용하기 위해 추가
          displayDate: new Date(item.date).toLocaleDateString('ko-KR', {
            month: 'short',
            day: 'numeric',
            ...(selectedPeriod >= 90 && { year: '2-digit' })
          })
        }));
      
      console.log('필터링된 데이터 샘플:', formattedData.slice(0, 3));
      
      // 이동평균선 계산 추가
      formattedData = calculateMovingAverages(formattedData, [5, 20, 60, 120]);
      
      console.log(`차트 데이터 필터링: 전체 ${response.data.length}개 -> 유효 데이터 ${formattedData.length}개`);
      
      setChartData(formattedData);
      
      // 차트 정보 설정 (첫 번째 데이터에서 chart_info 추출)
      if (formattedData.length > 0 && formattedData[0].chart_info) {
        setChartInfo(formattedData[0].chart_info);
      }
      
    } catch (error) {
      console.error('Chart data loading error:', error);
      setError(formatErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const market = getMarketFromSymbol(symbol);
  const isKorean = market === 'KRW';
  const isOneDayChart = selectedPeriod === 1;
  
  // 이동평균선 색상 정의 (네이버 스타일)
  const movingAverageColors = {
    ma5: '#FFA500',   // 주황색
    ma20: '#FF1493',  // 분홍색 
    ma60: '#32CD32',  // 라임 그린
    ma120: '#9932CC'  // 보라색
  };
  
  // 이동평균선 토글 함수
  const toggleMovingAverage = (ma) => {
    setShowMovingAverages(prev => ({
      ...prev,
      [ma]: !prev[ma]
    }));
  };
  
  // 1일 차트에서는 캔들차트만 허용 (미국 주식)
  const availableChartTypes = isOneDayChart && !isKorean 
    ? [{ label: '선차트', value: 'line' }] 
    : [
        { label: '선차트', value: 'line' },
        { label: '캔들', value: 'candle' }
      ];

  // Y축 도메인 계산 (캔들이 가운데 위치하도록 개선)
  const getYAxisDomain = () => {
    if (!chartData.length) return ['auto', 'auto'];
    
    // 모든 가격 데이터 수집
    const prices = [];
    
    chartData.forEach(item => {
      // OHLC 데이터 추가
      if (typeof item.high === 'number' && item.high > 0) prices.push(item.high);
      if (typeof item.low === 'number' && item.low > 0) prices.push(item.low);
      if (typeof item.open === 'number' && item.open > 0) prices.push(item.open);
      if (typeof item.close === 'number' && item.close > 0) prices.push(item.close);
      
      // 이동평균선 값들도 추가 (표시중인 것들만)
      Object.entries(showMovingAverages).forEach(([ma, isShown]) => {
        if (isShown && typeof item[ma] === 'number' && item[ma] > 0) {
          prices.push(item[ma]);
        }
      });
    });
    
    if (prices.length === 0) return ['auto', 'auto'];
    
    const actualMin = Math.min(...prices);
    const actualMax = Math.max(...prices);
    const priceRange = actualMax - actualMin;
    
    // 위아래 대칭적인 큰 여유공간 - 캔들이 가운데 위치하고 작게 보이도록
    const paddingPercent = 0.30; // 30% 여유공간
    const topPadding = priceRange * paddingPercent;
    const bottomPadding = priceRange * paddingPercent;
    
    const minDomain = Math.max(0, actualMin - bottomPadding);
    const maxDomain = actualMax + topPadding;
    
    console.log('Y축 도메인 계산 (가운데 위치):', { 
      actualMin, 
      actualMax, 
      minDomain, 
      maxDomain, 
      priceRange,
      topPadding,
      bottomPadding,
      paddingPercent,
      newRange: maxDomain - minDomain,
      compressionRatio: priceRange / (maxDomain - minDomain),
      dataCount: chartData.length
    });
    
    return [minDomain, maxDomain];
  };

  // 거래량 Y축 도메인 계산
  const getVolumeDomain = () => {
    if (!chartData.length) return [0, 'auto'];
    
    const volumes = chartData.map(d => d.volume || 0).filter(v => v > 0);
    if (volumes.length === 0) return [0, 'auto'];
    
    const maxVolume = Math.max(...volumes);
    // 거래량 차트도 상단에 20% 여유공간 추가
    return [0, maxVolume * 1.2];
  };

  // 차트 통계 계산
  const getChartStats = () => {
    if (!chartData.length) return null;
    
    const firstPrice = chartData[0].close;
    const lastPrice = chartData[chartData.length - 1].close;
    const change = lastPrice - firstPrice;
    const changePercent = (change / firstPrice) * 100;
    
    return {
      firstPrice,
      lastPrice,
      change,
      changePercent,
      highest: chartInfo?.max_price,
      lowest: chartInfo?.min_price
    };
  };

  const stats = getChartStats();
  
  const formatPrice = (price) => {
    return isKorean 
      ? `${Math.round(price).toLocaleString()}원` 
      : `$${price.toFixed(2)}`;
  };

  return (
    <ChartContainer>
      <ChartHeader>
        <StockInfo>
          <div className="symbol">{symbol}</div>
          {stockInfo && <div className="name">{stockInfo.name}</div>}
        </StockInfo>
        
        <ChartControls>
          <ControlGroup>
            <ControlLabel>기간</ControlLabel>
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
          </ControlGroup>
          
          <ControlGroup>
            <ControlLabel>타입</ControlLabel>
            <ChartTypeButtons>
              {availableChartTypes.map((type) => (
                <ChartTypeButton
                  key={type.value}
                  active={chartType === type.value}
                  onClick={() => setChartType(type.value)}
                >
                  {type.label}
                </ChartTypeButton>
              ))}
            </ChartTypeButtons>
          </ControlGroup>
          
          {chartType === 'candle' && (
            <ControlGroup>
              <ControlLabel>봉</ControlLabel>
              <IntervalButtons>
                {intervals.map((int) => (
                  <IntervalButton
                    key={int.value}
                    active={interval === int.value}
                    onClick={() => setInterval(int.value)}
                    disabled={selectedPeriod === 1} // 1일 차트에서는 간격 변경 불가
                  >
                    {int.label}
                  </IntervalButton>
                ))}
              </IntervalButtons>
            </ControlGroup>
          )}
          
          {/* 이동평균선 컨트롤 */}
          <ControlGroup>
            <ControlLabel>MA</ControlLabel>
            <MovingAverageButtons>
              {Object.entries(movingAverageColors).map(([ma, color]) => (
                <MAButton
                  key={ma}
                  active={showMovingAverages[ma]}
                  color={color}
                  onClick={() => toggleMovingAverage(ma)}
                >
                  {ma.replace('ma', '')}
                </MAButton>
              ))}
            </MovingAverageButtons>
          </ControlGroup>
        </ChartControls>
      </ChartHeader>

      {error && <ErrorMessage>{error}</ErrorMessage>}

      <ChartContent>
        {stats && (
          <ChartStats>
            <StatItem>
              <div className="label">시작가</div>
              <div className="value">{formatPrice(stats.firstPrice)}</div>
            </StatItem>
            <StatItem>
              <div className="label">종료가</div>
              <div className="value">{formatPrice(stats.lastPrice)}</div>
            </StatItem>
            <StatItem color={stats.change >= 0 ? '#ff4444' : '#0066ff'}>
              <div className="label">변동</div>
              <div className="value">
                {stats.change >= 0 ? '+' : ''}{formatPrice(Math.abs(stats.change))}
                ({stats.changePercent >= 0 ? '+' : ''}{stats.changePercent.toFixed(2)}%)
              </div>
            </StatItem>
            {stats.highest && (
              <StatItem color="#e74c3c">
                <div className="label">최고가</div>
                <div className="value">{formatPrice(stats.highest)}</div>
              </StatItem>
            )}
            {stats.lowest && (
              <StatItem color="#3498db">
                <div className="label">최저가</div>
                <div className="value">{formatPrice(stats.lowest)}</div>
              </StatItem>
            )}
          </ChartStats>
        )}
        
        {loading ? (
          <LoadingState>
            <div className="spinner"></div>
          </LoadingState>
        ) : chartData.length > 0 ? (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* 메인 차트 (가격) */}
            <div style={{ height: '70%', marginBottom: '10px' }}>
              <ResponsiveContainer width="100%" height="100%">
                {chartType === 'candle' ? (
                  <ComposedChart 
                    data={chartData}
                    margin={{ top: 40, right: 30, left: 20, bottom: 50 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis 
                      dataKey="displayDate" 
                      stroke="#666"
                      fontSize={12}
                      tickLine={false}
                      interval="preserveStartEnd"
                    />
                    <YAxis 
                      stroke="#666"
                      fontSize={12}
                      tickLine={false}
                      domain={getYAxisDomain()}
                      tickFormatter={(value) => 
                        isKorean ? `${(value / 1000).toFixed(0)}K` : `${value.toFixed(0)}`
                      }
                    />
                    <Tooltip content={<CandlestickTooltip />} />
                    {/* 캔들스틱을 위한 커스텀 Bar - close를 기준으로 설정 */}
                    <Bar 
                      dataKey="close" 
                      fill="transparent"
                      shape={(props) => <CandlestickShape {...props} />}
                      maxBarSize={30}
                    />
                    
                    {/* 이동평균선들 */}
                    {showMovingAverages.ma5 && (
                      <Line
                        type="monotone"
                        dataKey="ma5"
                        stroke={movingAverageColors.ma5}
                        strokeWidth={1}
                        dot={false}
                        connectNulls={true}
                        activeDot={false}
                      />
                    )}
                    {showMovingAverages.ma20 && (
                      <Line
                        type="monotone"
                        dataKey="ma20"
                        stroke={movingAverageColors.ma20}
                        strokeWidth={1}
                        dot={false}
                        connectNulls={true}
                        activeDot={false}
                      />
                    )}
                    {showMovingAverages.ma60 && (
                      <Line
                        type="monotone"
                        dataKey="ma60"
                        stroke={movingAverageColors.ma60}
                        strokeWidth={1}
                        dot={false}
                        connectNulls={true}
                        activeDot={false}
                      />
                    )}
                    {showMovingAverages.ma120 && (
                      <Line
                        type="monotone"
                        dataKey="ma120"
                        stroke={movingAverageColors.ma120}
                        strokeWidth={1}
                        dot={false}
                        connectNulls={true}
                        activeDot={false}
                      />
                    )}
                  </ComposedChart>
                ) : (
                  <LineChart 
                    data={chartData}
                    margin={{ top: 40, right: 30, left: 20, bottom: 50 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis 
                      dataKey="displayDate" 
                      stroke="#666"
                      fontSize={12}
                      tickLine={false}
                      interval="preserveStartEnd"
                    />
                    <YAxis 
                      stroke="#666"
                      fontSize={12}
                      tickLine={false}
                      domain={getYAxisDomain()}
                      tickFormatter={(value) => 
                        isKorean ? `${(value / 1000).toFixed(0)}K` : `${value.toFixed(0)}`
                      }
                    />
                    <Tooltip content={<LineTooltip />} />
                    <Line
                      type="monotone"
                      dataKey="close"
                      stroke="#667eea"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4 }}
                    />
                    
                    {/* 이동평균선들 */}
                    {showMovingAverages.ma5 && (
                      <Line
                        type="monotone"
                        dataKey="ma5"
                        stroke={movingAverageColors.ma5}
                        strokeWidth={1}
                        dot={false}
                        connectNulls={true}
                        activeDot={false}
                      />
                    )}
                    {showMovingAverages.ma20 && (
                      <Line
                        type="monotone"
                        dataKey="ma20"
                        stroke={movingAverageColors.ma20}
                        strokeWidth={1}
                        dot={false}
                        connectNulls={true}
                        activeDot={false}
                      />
                    )}
                    {showMovingAverages.ma60 && (
                      <Line
                        type="monotone"
                        dataKey="ma60"
                        stroke={movingAverageColors.ma60}
                        strokeWidth={1}
                        dot={false}
                        connectNulls={true}
                        activeDot={false}
                      />
                    )}
                    {showMovingAverages.ma120 && (
                      <Line
                        type="monotone"
                        dataKey="ma120"
                        stroke={movingAverageColors.ma120}
                        strokeWidth={1}
                        dot={false}
                        connectNulls={true}
                        activeDot={false}
                      />
                    )}
                    
                    {/* 최고점 표시 */}
                    <Line
                      dataKey={(data) => data.is_highest ? data.close : null}
                      stroke="#e74c3c"
                      strokeWidth={0}
                      dot={{ fill: '#e74c3c', r: 4 }}
                      activeDot={false}
                      connectNulls={false}
                    />
                    {/* 최저점 표시 */}
                    <Line
                      dataKey={(data) => data.is_lowest ? data.close : null}
                      stroke="#3498db"
                      strokeWidth={0}
                      dot={{ fill: '#3498db', r: 4 }}
                      activeDot={false}
                      connectNulls={false}
                    />
                  </LineChart>
                )}
              </ResponsiveContainer>
            </div>
            
            {/* 거래량 차트 */}
            <div style={{ height: '25%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={chartData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 40 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="displayDate" 
                    stroke="#666"
                    fontSize={10}
                    tickLine={false}
                    interval="preserveStartEnd"
                    height={30}
                  />
                  <YAxis 
                    stroke="#666"
                    fontSize={10}
                    tickLine={false}
                    domain={getVolumeDomain()}
                    tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`}
                    width={50}
                  />
                  <Tooltip 
                    formatter={(value) => [value?.toLocaleString(), '거래량']}
                    labelStyle={{ color: '#333' }}
                  />
                  <Bar 
                    dataKey="volume" 
                    shape={(props) => <VolumeBar {...props} />}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : (
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '400px',
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
