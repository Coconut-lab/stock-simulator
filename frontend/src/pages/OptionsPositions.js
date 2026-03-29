import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { optionsService } from '../services/optionsService';
import { formatNumber, formatErrorMessage, getProfitColor, formatDate } from '../utils/helpers';
import styled from 'styled-components';

const SYMBOL_NAMES = {
  AAPL: 'Apple', MSFT: 'Microsoft', GOOGL: 'Google', AMZN: 'Amazon',
  TSLA: 'Tesla', NVDA: 'NVIDIA', META: 'Meta', SPY: 'S&P 500 ETF',
  QQQ: 'Nasdaq ETF', NFLX: 'Netflix', AMD: 'AMD', INTC: 'Intel',
  JPM: 'JPMorgan', V: 'Visa', BA: 'Boeing', DIS: 'Disney',
  COIN: 'Coinbase', SOFI: 'SoFi',
  '005930': '삼성전자', '000660': 'SK하이닉스', '035420': '네이버',
};

const Container = styled.div`
  min-height: 100vh;
  background: #0f0e1a;
  color: #e0e0e0;
  padding: 20px;
`;

const Header = styled.div`
  background: rgba(255,255,255,0.04);
  padding: 24px;
  border-radius: 12px;
  border: 1px solid rgba(255,255,255,0.06);
  margin-bottom: 30px;
  h1 { margin: 0; color: #fff; font-size: 28px; }
`;

const Card = styled.div`
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 12px;
  overflow: hidden;
  margin-bottom: 24px;
`;

const CardHeader = styled.div`
  padding: 16px 20px;
  border-bottom: 1px solid rgba(255,255,255,0.06);
  h2 { margin: 0; font-size: 18px; color: #fff; }
`;

const Table = styled.table`
  width: 100%; border-collapse: collapse;
  th { text-align: left; padding: 12px 16px; color: #888; font-size: 13px; font-weight: 600;
    border-bottom: 1px solid rgba(255,255,255,0.06); text-transform: uppercase; }
  td { padding: 12px 16px; border-bottom: 1px solid rgba(255,255,255,0.04); font-size: 14px; }
  tr:hover td { background: rgba(255,255,255,0.02); }
`;

const TypeBadge = styled.span`
  padding: 3px 10px; border-radius: 4px; font-weight: 700; font-size: 12px;
  background: ${p => p.$call ? 'rgba(231,76,60,0.15)' : 'rgba(52,152,219,0.15)'};
  color: ${p => p.$call ? '#e74c3c' : '#3498db'};
`;

const ActionButton = styled.button`
  padding: 6px 12px; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 12px;
  margin-right: 6px; border: 1px solid;
  &.close {
    background: rgba(231,76,60,0.15); color: #e74c3c; border-color: rgba(231,76,60,0.3);
    &:hover { background: rgba(231,76,60,0.25); }
  }
  &.exercise {
    background: rgba(46,204,113,0.15); color: #2ecc71; border-color: rgba(46,204,113,0.3);
    &:hover { background: rgba(46,204,113,0.25); }
  }
`;

const EmptyState = styled.div`
  text-align: center; padding: 60px; color: #666;
  h3 { color: #999; }
`;

const Message = styled.div`
  padding: 12px; border-radius: 8px; margin: 12px 0; font-size: 14px;
  &.error { background: rgba(231,76,60,0.1); color: #e74c3c; }
  &.success { background: rgba(46,204,113,0.1); color: #2ecc71; }
`;

const OptionsPositions = () => {
  const { user, updateUser } = useAuth();
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadPositions();
  }, []);

  const loadPositions = async () => {
    try {
      setLoading(true);
      const response = await optionsService.getPositions();
      setPositions(response.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = async (positionId) => {
    if (!window.confirm('포지션을 청산하시겠습니까?')) return;
    try {
      setError('');
      const response = await optionsService.closePosition(positionId);
      setSuccess(response.message);
      if (response.data?.remaining_balance !== undefined && user) {
        updateUser({ ...user, balance: response.data.remaining_balance });
      }
      await loadPositions();
    } catch (err) {
      setError(formatErrorMessage(err));
    }
  };

  const handleExercise = async (positionId) => {
    if (!window.confirm('옵션을 행사하시겠습니까?')) return;
    try {
      setError('');
      const response = await optionsService.exerciseOption(positionId);
      setSuccess(response.message);
      if (response.data?.remaining_balance !== undefined && user) {
        updateUser({ ...user, balance: response.data.remaining_balance });
      }
      await loadPositions();
    } catch (err) {
      setError(formatErrorMessage(err));
    }
  };

  if (loading) {
    return (
      <Container>
        <Header><h1>옵션 포지션</h1></Header>
        <div style={{ textAlign: 'center', padding: 60, color: '#888' }}>로딩 중...</div>
      </Container>
    );
  }

  return (
    <Container>
      <Header><h1>옵션 포지션</h1></Header>

      {error && <Message className="error">{error}</Message>}
      {success && <Message className="success">{success}</Message>}

      <Card>
        <CardHeader><h2>보유 옵션 ({positions.length})</h2></CardHeader>
        {positions.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <Table>
              <thead>
                <tr>
                  <th>기초자산</th>
                  <th>유형</th>
                  <th>행사가</th>
                  <th>만기</th>
                  <th>수량</th>
                  <th>매수 프리미엄</th>
                  <th>현재 프리미엄</th>
                  <th>미실현 손익</th>
                  <th>액션</th>
                </tr>
              </thead>
              <tbody>
                {positions.map(pos => (
                  <tr key={pos._id}>
                    <td style={{ fontWeight: 600 }}>
                      {SYMBOL_NAMES[pos.underlying] || pos.underlying}
                      <div style={{ fontSize: 11, color: '#888', fontWeight: 400 }}>{pos.underlying}</div>
                    </td>
                    <td><TypeBadge $call={pos.option_type === 'call'}>{pos.option_type?.toUpperCase()}</TypeBadge></td>
                    <td>{formatNumber(pos.strike_price)}</td>
                    <td>{pos.expiry_date ? new Date(pos.expiry_date).toLocaleDateString('ko-KR') : '-'}</td>
                    <td>{pos.quantity}</td>
                    <td>{formatNumber(pos.entry_premium)}</td>
                    <td>{formatNumber(pos.current_premium)}</td>
                    <td style={{ color: getProfitColor(pos.unrealized_pnl), fontWeight: 700 }}>
                      {pos.unrealized_pnl >= 0 ? '+' : ''}₩{formatNumber(pos.unrealized_pnl)}
                    </td>
                    <td>
                      <ActionButton className="close" onClick={() => handleClose(pos._id)}>청산</ActionButton>
                      <ActionButton className="exercise" onClick={() => handleExercise(pos._id)}>행사</ActionButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        ) : (
          <EmptyState><h3>보유 중인 옵션 포지션이 없습니다</h3></EmptyState>
        )}
      </Card>
    </Container>
  );
};

export default OptionsPositions;
