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

// 이동평균선 계산 함수 - 충분한 데이터가 있을 때만 계산
const calculateMovingAverages = (data, periods = [5, 20, 60, 120]) => {
  if (!data || data.length === 0) return data;

  return data.map((item, index) => {
    const newItem = { ...item };

    periods.forEach(period => {
      if (index >= period - 1) {
        // 충분한 데이터가 있을 때만 계산
        const slice = data.slice(index - period + 1, index + 1);
        const sum = slice.reduce((acc, curr) => acc + (curr.close || 0), 0);
        newItem[`ma${period}`] = sum / period;
      }
      // 데이터 부족 시 null (이동평균선을 표시하지 않음)
    });

    return newItem;
  });
};

const PureCandlestickChart = ({
  data, 
  width = 800, 
  height = 400,
  margin = { top: 20, right: 30, bottom: 50, left: 20 },
  showMovingAverages = {},
  movingAverageColors = {}
}) => {
  const [hoveredCandle, setHoveredCandle] = React.useState(null);
  
  if (!data || data.length === 0) {
    return (
      <div style={{ 
        width, 
        height, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        color: '#666',
        fontSize: '14px'
      }}>
        차트 데이터가 없습니다.
      </div>
    );
  }

  // 전체 가격 범위 계산 (OHLC + 이동평균선 포함)
  const allPrices = [];
  data.forEach(item => {
    if (item.high && item.low && item.open && item.close) {
      allPrices.push(item.high, item.low, item.open, item.close);
    }
    
    // 이동평균선 가격도 포함
    Object.entries(showMovingAverages).forEach(([ma, isShown]) => {
      if (isShown && typeof item[ma] === 'number' && item[ma] > 0) {
        allPrices.push(item[ma]);
      }
    });
  });

  if (allPrices.length === 0) return null;

  const minPrice = Math.min(...allPrices);
  const maxPrice = Math.max(...allPrices);
  const priceRange = maxPrice - minPrice;

  // 15% 여유공간 추가 (캔들차트 최적화)
  const padding = priceRange * 0.15;
  const chartMinPrice = minPrice - padding;
  const chartMaxPrice = maxPrice + padding;
  const chartPriceRange = chartMaxPrice - chartMinPrice;

  // 차트 영역 계산
  const chartWidth = width - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom;

  // 캔들 너비 계산
  const candleSpacing = chartWidth / data.length;
  const candleWidth = Math.max(3, Math.min(candleSpacing * 0.6, 12));

  // 가격을 Y좌표로 변환하는 함수
  const priceToY = (price) => {
    return margin.top + ((chartMaxPrice - price) / chartPriceRange) * chartHeight;
  };

  // 시장 구분 (한국/미국)
  const market = getMarketFromSymbol(data[0]?.symbol || '');
  const isKorean = market === 'KRW';
  
  // 가격 포맷팅 함수
  const formatPrice = (price) => {
    return isKorean 
      ? `₩${Math.round(price).toLocaleString()}` 
      : `${price.toFixed(2)}`;
  };

  // Y축 가격 라벨 생성
  const priceLabels = [];
  for (let i = 0; i <= 4; i++) {
    const ratio = i / 4;
    const price = chartMinPrice + (chartPriceRange * (1 - ratio));
    const y = margin.top + (chartHeight * ratio);
    priceLabels.push({ price, y });
  }

  // X축 날짜 라벨
  const dateLabels = [];
  const step = Math.max(1, Math.floor(data.length / 6));
  for (let i = 0; i < data.length; i += step) {
    const item = data[i];
    const x = margin.left + (i + 0.5) * candleSpacing;
    dateLabels.push({ x, date: item.displayDate || item.date });
  }

  return (
    <div style={{ position: 'relative' }}>
      <svg width={width} height={height} style={{ backgroundColor: 'white' }}>
        {/* 차트 영역 배경 */}
        <rect 
          x={margin.left} 
          y={margin.top} 
          width={chartWidth} 
          height={chartHeight} 
          fill="#fafafa" 
        />

        {/* Y축 격자선과 가격 라벨 */}
        {priceLabels.map((label, i) => (
          <g key={i}>
            <line
              x1={margin.left}
              y1={label.y}
              x2={margin.left + chartWidth}
              y2={label.y}
              stroke="#f0f0f0"
              strokeWidth="1"
            />
            <text
              x={margin.left - 5}
              y={label.y + 3}
              textAnchor="end"
              fontSize="12"
              fill="#666"
            >
              {isKorean ? `${(label.price / 1000).toFixed(0)}K` : `${label.price.toFixed(0)}`}
            </text>
          </g>
        ))}

        {/* Y축 선 */}
        <line
          x1={margin.left}
          y1={margin.top}
          x2={margin.left}
          y2={margin.top + chartHeight}
          stroke="#666"
          strokeWidth="1"
        />

        {/* X축 선 */}
        <line
          x1={margin.left}
          y1={margin.top + chartHeight}
          x2={margin.left + chartWidth}
          y2={margin.top + chartHeight}
          stroke="#666"
          strokeWidth="1"
        />
        
        {/* 이동평균선들 */}
        {Object.entries(showMovingAverages).map(([ma, isShown]) => {
          if (!isShown) return null;
          
          const color = movingAverageColors[ma] || '#999';
          const points = data
            .map((item, index) => {
              if (typeof item[ma] !== 'number' || item[ma] <= 0) return null;
              const x = margin.left + (index + 0.5) * candleSpacing;
              const y = priceToY(item[ma]);
              return `${x},${y}`;
            })
            .filter(Boolean)
            .join(' ');
          
          if (points) {
            return (
              <polyline
                key={ma}
                points={points}
                fill="none"
                stroke={color}
                strokeWidth="1"
                opacity="0.8"
              />
            );
          }
          return null;
        })}

        {/* 캔들스틱들 */}
        {data.map((item, index) => {
          if (!item.high || !item.low || !item.open || !item.close) return null;

          const x = margin.left + (index + 0.5) * candleSpacing;
          const isRising = item.close >= item.open;

          // 정확한 Y좌표 계산
          const highY = priceToY(item.high);
          const lowY = priceToY(item.low);
          const openY = priceToY(item.open);
          const closeY = priceToY(item.close);

          // 몸통 계산
          const bodyTop = Math.min(openY, closeY);
          const bodyBottom = Math.max(openY, closeY);
          const bodyHeight = Math.max(bodyBottom - bodyTop, 1);

          const color = isRising ? '#e74c3c' : '#2980b9';
          const isHovered = hoveredCandle === index;

          return (
            <g key={index}>
              {/* 상단 심지 (고가 → 몸통 상단) */}
              <line
                x1={x}
                y1={highY}
                x2={x}
                y2={bodyTop}
                stroke={color}
                strokeWidth={isHovered ? "2" : "1.5"}
                opacity="0.9"
              />

              {/* 하단 심지 (몸통 하단 → 저가) */}
              <line
                x1={x}
                y1={bodyBottom}
                x2={x}
                y2={lowY}
                stroke={color}
                strokeWidth={isHovered ? "2" : "1.5"}
                opacity="0.9"
              />

              {/* 캔들 몸통 */}
              {bodyHeight <= 1 ? (
                // 도지 (시가 ≈ 종가)
                <line
                  x1={x - candleWidth/2}
                  y1={closeY}
                  x2={x + candleWidth/2}
                  y2={closeY}
                  stroke={color}
                  strokeWidth={isHovered ? "3" : "2"}
                />
              ) : (
                // 일반 캔들
                <rect
                  x={x - candleWidth/2}
                  y={bodyTop}
                  width={candleWidth}
                  height={bodyHeight}
                  fill={isRising ? color : 'white'}
                  stroke={color}
                  strokeWidth={isHovered ? "2" : "1"}
                  opacity={isHovered ? 1 : (isRising ? 0.8 : 1)}
                />
              )}
              
              {/* 최고/최저 마커 */}
              {item.is_highest && (
                <text
                  x={x}
                  y={highY - 5}
                  textAnchor="middle"
                  fontSize="10"
                  fill="#e74c3c"
                >
                  📈
                </text>
              )}
              {item.is_lowest && (
                <text
                  x={x}
                  y={lowY + 15}
                  textAnchor="middle"
                  fontSize="10"
                  fill="#2980b9"
                >
                  📉
                </text>
              )}

              {/* 투명 호버 영역 */}
              <rect
                x={x - candleSpacing/2}
                y={Math.min(highY, lowY) - 5}
                width={candleSpacing}
                height={Math.abs(highY - lowY) + 10}
                fill="transparent"
                style={{ cursor: 'pointer' }}
                onMouseEnter={() => setHoveredCandle(index)}
                onMouseLeave={() => setHoveredCandle(null)}
              />
            </g>
          );
        })}

        {/* X축 날짜 라벨 */}
        {dateLabels.map((label, i) => (
          <text
            key={`date-${i}`}
            x={label.x}
            y={margin.top + chartHeight + 15}
            textAnchor="middle"
            fontSize="12"
            fill="#666"
          >
            {label.date}
          </text>
        ))}
      </svg>

      {/* 호버 툴팁 */}
      {hoveredCandle !== null && (
        <div
          style={{
            position: 'absolute',
            top: 30,
            left: 20,
            backgroundColor: 'white',
            padding: '12px',
            border: '1px solid #ddd',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
            fontSize: '12px',
            pointerEvents: 'none',
            zIndex: 10
          }}
        >
          <div style={{ fontWeight: '600', marginBottom: '6px' }}>
            {data[hoveredCandle].displayDate}
          </div>
          <div>시가: <span style={{ color: '#666' }}>{formatPrice(data[hoveredCandle].open)}</span></div>
          <div>고가: <span style={{ color: '#e74c3c' }}>{formatPrice(data[hoveredCandle].high)}</span></div>
          <div>저가: <span style={{ color: '#2980b9' }}>{formatPrice(data[hoveredCandle].low)}</span></div>
          <div>종가: <span style={{ 
            color: data[hoveredCandle].close >= data[hoveredCandle].open ? '#e74c3c' : '#2980b9' 
          }}>
            {formatPrice(data[hoveredCandle].close)}
          </span></div>
          {data[hoveredCandle].volume && (
            <div>거래량: <span style={{ color: '#666' }}>{data[hoveredCandle].volume.toLocaleString()}</span></div>
          )}
          {data[hoveredCandle].is_highest && (
            <div style={{ color: '#e74c3c', fontSize: '11px', marginTop: '4px' }}>
              📈 기간 중 최고가
            </div>
          )}
          {data[hoveredCandle].is_lowest && (
            <div style={{ color: '#2980b9', fontSize: '11px', marginTop: '4px' }}>
              📉 기간 중 최저가
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// 캔들스틱 커스텀 컴포넌트 - 간단한 Recharts 기준 계산 방식
const CandlestickShape = (props) => {
  const { payload, x, y, width, height, yAxisMap } = props;
  
  if (!payload || typeof payload.open !== 'number' || typeof payload.close !== 'number' || 
      typeof payload.high !== 'number' || typeof payload.low !== 'number') {
    return null;
  }
  
  const { open, close, high, low } = payload;
  
  // 데이터 유효성 검증
  if (high < low || low <= 0 || high <= 0 || open <= 0 || close <= 0) {
    console.warn('비정상적인 가격 데이터:', { open, close, high, low });
    return null;
  }
  
  // 상승/하락 여부 결정 (한국 기준: 빨강=상승, 파랑=하락)
  const isRising = close >= open;
  const bodyColor = isRising ? '#e74c3c' : '#2980b9';
  const fillColor = isRising ? '#e74c3c' : '#2980b9';
  
  // 캔들 스타일 설정
  const candleWidth = Math.min(width * 0.8, 12);
  const wickWidth = 1.5;
  const centerX = x + width / 2;
  
  // ⭐️ 개선: Recharts의 기본 스케일링을 활용
  // y와 height는 이미 적절한 값으로 계산되어 들어오므로
  // close를 기준으로 다른 가격들의 위치를 상대적으로 계산
  
  // 가격 범위에 따른 픽셀 비율 계산
  const priceRange = high - low;
  if (priceRange === 0) {
    // 가격 변동이 없는 경우 단순 선으로 표시
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
  
  // Bar 영역 전체를 가격 범위로 사용
  const scaleY = height / priceRange;
  
  // 각 가격의 Y좌표 계산 (high가 상단, low가 하단)
  const highY = y;
  const lowY = y + height;
  const openY = y + (high - open) * scaleY;
  const closeY = y + (high - close) * scaleY;
  
  // 몸통의 상단과 하단
  const bodyTop = Math.min(openY, closeY);
  const bodyBottom = Math.max(openY, closeY);
  const bodyHeight = Math.abs(bodyBottom - bodyTop);
  
  // 최소 몸통 높이 설정 (도지 처리)
  const minBodyHeight = 1;
  const isDoji = bodyHeight < minBodyHeight;
  
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
        opacity={0.8}
      />
      
      {/* 아래쪽 심지 (몸통 하단 → 저가) */}
      <line
        x1={centerX}
        y1={bodyBottom}
        x2={centerX}
        y2={lowY}
        stroke={bodyColor}
        strokeWidth={wickWidth}
        opacity={0.8}
      />
      
      {/* 캔들 몸통 또는 도지 선 */}
      {isDoji ? (
        // 도지(시가≈종가)인 경우 수평선
        <line
          x1={centerX - candleWidth / 2}
          y1={closeY}
          x2={centerX + candleWidth / 2}
          y2={closeY}
          stroke={bodyColor}
          strokeWidth={2}
        />
      ) : (
        // 일반 캔들 몸통
        <rect
          x={centerX - candleWidth / 2}
          y={bodyTop    }
          width={candleWidth}
          height={bodyHeight}
          fill={isRising ? fillColor : 'white'}
          stroke={bodyColor}
          strokeWidth={1}
          opacity={isRising ? 0.8 : 1}
        />
      )}
    </g>
  );
};

// 시장별 통화 심볼 반환
const getCurrSym = (market, symbol) => {
  if (market === 'KRW') return '';
  if (market === 'HKD') return 'HK$';
  if (market === 'EUR') {
    if (symbol && symbol.endsWith('.L')) return '£';
    return '€';
  }
  return '$';
};

// 시장별 가격 포맷팅
const formatMarketPrice = (price, market, symbol) => {
  if (market === 'KRW') return `${Math.round(price).toLocaleString()}원`;
  const sym = getCurrSym(market, symbol);
  return `${sym}${price.toFixed(2)}`;
};

// 캔들차트용 커스텀 툴팁
const CandlestickTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length && payload[0].payload) {
    const data = payload[0].payload;
    const market = getMarketFromSymbol(data.symbol || '');

    const formatPrice = (price) => formatMarketPrice(price, market, data.symbol);
    
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
              color: isRising ? '#e74c3c' : '#2980b9'
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

    const formatPrice = (price) => formatMarketPrice(price, market, data.symbol);
    
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
        {data._closeHighest && (
          <div style={{ color: '#e74c3c', fontSize: '11px', marginTop: '4px' }}>
            📈 기간 중 최고가
          </div>
        )}
        {data._closeLowest && (
          <div style={{ color: '#3498db', fontSize: '11px', marginTop: '4px' }}>
            📉 기간 중 최저가
          </div>
        )}
      </div>
    );
  }
  return null;
};

// 거래량 바 색상 결정 (한국 기준)
const VolumeBar = (props) => {
  const { payload, x, y, width, height } = props;
  
  if (!payload) return null;
  
  const isRising = payload.close >= payload.open;
  const color = isRising ? '#e74c3c' : '#2980b9';
  
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

  // Y축 도메인 계산 (캔들이 적절한 크기로 보이도록 최적화)
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
    
    // 🔥 캔들차트 최적화: 더 넉넉한 여유공간으로 캔들이 중앙에 위치하고 적절한 크기 유지
    const paddingPercent = chartType === 'candle' ? 0.15 : 0.08; // 캔들차트: 15%, 선차트: 8%
    const padding = priceRange * paddingPercent;
    
    const minDomain = Math.max(0, actualMin - padding);
    const maxDomain = actualMax + padding;
    
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

  // 라인 차트용: close 기준 최고/최저 인덱스 미리 계산 + 데이터에 플래그 세팅
  let lineHighIdx = 0, lineLowIdx = 0;
  if (chartData.length > 0) {
    chartData.forEach((d, i) => {
      d._closeHighest = false;
      d._closeLowest = false;
      if (d.close > chartData[lineHighIdx].close) lineHighIdx = i;
      if (d.close < chartData[lineLowIdx].close) lineLowIdx = i;
    });
    chartData[lineHighIdx]._closeHighest = true;
    chartData[lineLowIdx]._closeLowest = true;
  }
  const lineHighClose = chartData[lineHighIdx]?.close;
  const lineLowClose = chartData[lineLowIdx]?.close;

  const formatPrice = (price) => formatMarketPrice(price, market, symbol);

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
            <StatItem color={stats.change >= 0 ? '#e74c3c' : '#2980b9'}>
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
          <>
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* 메인 차트 (가격) */}
            <div style={{ height: '70%', marginBottom: '10px' }}>
              {chartType === 'candle' ? (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart 
                    data={chartData}
                    margin={{ top: 40, right: 30, left: 20, bottom: 50 }}
                  >
                    <defs>
                      <filter id="candleShadow" x="-50%" y="-50%" width="200%" height="200%">
                        <feDropShadow dx="0" dy="1" stdDeviation="1" floodColor="rgba(0,0,0,0.1)" />
                      </filter>
                    </defs>
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
                    {/* 🔥 개선된 캔들스틱 - 정확한 좌표 + 부드러운 UI */}
                    <Bar 
                      dataKey="close" 
                      fill="transparent"
                      shape={(props) => {
                        const { payload, x, y, width, height, yAxisMap } = props;
                        
                        if (!payload || typeof payload.open !== 'number' || typeof payload.close !== 'number' || 
                            typeof payload.high !== 'number' || typeof payload.low !== 'number') {
                          return null;
                        }
                        
                        const { open, close, high, low } = payload;
                        
                        if (high < low || low <= 0 || high <= 0 || open <= 0 || close <= 0) {
                          return null;
                        }
                        
                        const isRising = close >= open;
                        const bodyColor = isRising ? '#e74c3c' : '#2980b9';
                        const fillColor = isRising ? '#e74c3c' : '#2980b9';
                        
                        const candleWidth = Math.min(width * 0.6, 12); // 너비 조정
                        const wickWidth = 1.2;
                        const centerX = x + width / 2;
                        
                        // Recharts Bar props: y = close 가격의 픽셀 위치, height = close에서 baseline(도메인 최소)까지 거리
                        const yDomain = getYAxisDomain();
                        const minPrice = yDomain[0];

                        // close에서 도메인 최소까지의 가격 차이
                        const closeToDomainMin = close - minPrice;

                        if (closeToDomainMin === 0 || height === 0) {
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

                        // 가격 → 픽셀 변환: chartBottom(y+height)이 minPrice, y가 close
                        const chartBottom = y + height;
                        const pixelsPerPrice = height / closeToDomainMin;

                        const highY = chartBottom - (high - minPrice) * pixelsPerPrice;
                        const lowY = chartBottom - (low - minPrice) * pixelsPerPrice;
                        const openY = chartBottom - (open - minPrice) * pixelsPerPrice;
                        const closeY = y; // close는 이미 y 위치
                        
                        const bodyTop = Math.min(openY, closeY);
                        const bodyBottom = Math.max(openY, closeY);
                        const bodyHeight = Math.max(Math.abs(bodyBottom - bodyTop), 1);
                        
                        const isDoji = Math.abs(open - close) / Math.abs(high - low) < 0.02;
                        
                        return (
                          <g>
                            {/* 상단 심지 */}
                            <line
                              x1={centerX}
                              y1={highY}
                              x2={centerX}
                              y2={bodyTop}
                              stroke={bodyColor}
                              strokeWidth={wickWidth}
                              opacity={0.9}
                            />
                            
                            {/* 하단 심지 */}
                            <line
                              x1={centerX}
                              y1={bodyBottom}
                              x2={centerX}
                              y2={lowY}
                              stroke={bodyColor}
                              strokeWidth={wickWidth}
                              opacity={0.9}
                            />
                            
                            {/* 캔들 몸통 또는 도지 */}
                            {isDoji ? (
                              <line
                                x1={centerX - candleWidth / 2}
                                y1={closeY}
                                x2={centerX + candleWidth / 2}
                                y2={closeY}
                                stroke={bodyColor}
                                strokeWidth={2}
                              />
                            ) : (
                              <rect
                                x={centerX - candleWidth / 2}
                                y={bodyTop}
                                width={candleWidth}
                                height={bodyHeight}
                                fill={isRising ? fillColor : 'white'}
                                stroke={bodyColor}
                                strokeWidth={1}
                                rx={0.5}
                                ry={0.5}
                                opacity={isRising ? 0.8 : 1}
                              />
                            )}
                          </g>
                        );
                      }}
                      maxBarSize={18}
                    />
                    
                    {/* 이동평균선들 */}
                    {showMovingAverages.ma5 && (
                      <Line
                        type="monotone"
                        dataKey="ma5"
                        stroke={movingAverageColors.ma5}
                        strokeWidth={1.2}
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
                        strokeWidth={1.2}
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
                        strokeWidth={1.2}
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
                        strokeWidth={1.2}
                        dot={false}
                        connectNulls={true}
                        activeDot={false}
                      />
                    )}
                  </ComposedChart>
                </ResponsiveContainer>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
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
                      dot={(props) => {
                        const { cx, cy, index } = props;
                        if (index === lineHighIdx) {
                          return <circle cx={cx} cy={cy} r={5} fill="#e74c3c" stroke="white" strokeWidth={2} />;
                        }
                        if (index === lineLowIdx) {
                          return <circle cx={cx} cy={cy} r={5} fill="#3498db" stroke="white" strokeWidth={2} />;
                        }
                        return null;
                      }}
                      activeDot={{ r: 4 }}
                    />

                    {/* close 기준 최고/최저 수평선 */}
                    {typeof lineHighClose === 'number' && (
                      <ReferenceLine
                        y={lineHighClose}
                        stroke="#e74c3c"
                        strokeDasharray="4 3"
                        strokeWidth={1}
                        label={{
                          value: `최고 ${formatPrice(lineHighClose)}`,
                          position: 'right',
                          fontSize: 10,
                          fill: '#e74c3c',
                          fontWeight: 600
                        }}
                      />
                    )}
                    {typeof lineLowClose === 'number' && (
                      <ReferenceLine
                        y={lineLowClose}
                        stroke="#3498db"
                        strokeDasharray="4 3"
                        strokeWidth={1}
                        label={{
                          value: `최저 ${formatPrice(lineLowClose)}`,
                          position: 'right',
                          fontSize: 10,
                          fill: '#3498db',
                          fontWeight: 600
                        }}
                      />
                    )}

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
                    
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
            
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
          </>
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
