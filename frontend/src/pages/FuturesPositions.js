import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { futuresService } from '../services/futuresService';
import { formatNumber, formatErrorMessage, getProfitColor, formatDate } from '../utils/helpers';
import styled from 'styled-components';

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
  width: 100%;
  border-collapse: collapse;
  th { text-align: left; padding: 12px 16px; color: #888; font-size: 13px; font-weight: 600;
    border-bottom: 1px solid rgba(255,255,255,0.06); text-transform: uppercase; }
  td { padding: 12px 16px; border-bottom: 1px solid rgba(255,255,255,0.04); font-size: 14px; }
  tr:hover td { background: rgba(255,255,255,0.02); }
`;

const DirectionBadge = styled.span`
  padding: 3px 10px;
  border-radius: 4px;
  font-weight: 700;
  font-size: 12px;
  background: ${p => p.$long ? 'rgba(231,76,60,0.15)' : 'rgba(52,152,219,0.15)'};
  color: ${p => p.$long ? '#e74c3c' : '#3498db'};
`;

const CloseButton = styled.button`
  background: rgba(231,76,60,0.15);
  color: #e74c3c;
  border: 1px solid rgba(231,76,60,0.3);
  padding: 6px 14px;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  font-size: 13px;
  &:hover { background: rgba(231,76,60,0.25); }
`;

const EmptyState = styled.div`
  text-align: center; padding: 60px; color: #666;
  h3 { color: #999; }
`;

const FuturesPositions = () => {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  const [positions, setPositions] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [posRes, histRes] = await Promise.all([
        futuresService.getPositions(),
        futuresService.getPositionHistory(),
      ]);
      setPositions(posRes.data || []);
      setHistory(histRes.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = async (positionId) => {
    if (!window.confirm('포지션을 청산하시겠습니까?')) return;
    try {
      const response = await futuresService.closePosition(positionId);
      if (response.data?.remaining_balance !== undefined && user) {
        updateUser({ ...user, balance: response.data.remaining_balance });
      }
      await loadData();
    } catch (err) {
      alert(formatErrorMessage(err));
    }
  };

  if (loading) {
    return (
      <Container>
        <Header><h1>선물 포지션 관리</h1></Header>
        <div style={{ textAlign: 'center', padding: 60, color: '#888' }}>로딩 중...</div>
      </Container>
    );
  }

  return (
    <Container>
      <Header><h1>선물 포지션 관리</h1></Header>

      <Card>
        <CardHeader><h2>보유 포지션 ({positions.length})</h2></CardHeader>
        {positions.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <Table>
              <thead>
                <tr>
                  <th>계약</th>
                  <th>방향</th>
                  <th>수량</th>
                  <th>진입가</th>
                  <th>현재가</th>
                  <th>미실현 손익</th>
                  <th>증거금</th>
                  <th>만기일</th>
                  <th>액션</th>
                </tr>
              </thead>
              <tbody>
                {positions.map(pos => (
                  <tr key={pos._id}>
                    <td style={{ fontWeight: 600 }}>{pos.contract_name || pos.contract_symbol}</td>
                    <td><DirectionBadge $long={pos.direction === 'long'}>{pos.direction === 'long' ? '롱' : '숏'}</DirectionBadge></td>
                    <td>{pos.quantity}</td>
                    <td>{formatNumber(pos.entry_price)}</td>
                    <td>{formatNumber(pos.current_price)}</td>
                    <td style={{ color: getProfitColor(pos.unrealized_pnl), fontWeight: 700 }}>
                      {pos.unrealized_pnl >= 0 ? '+' : ''}₩{formatNumber(pos.unrealized_pnl)}
                    </td>
                    <td>₩{formatNumber(pos.margin)}</td>
                    <td>{pos.expiry_date ? new Date(pos.expiry_date).toLocaleDateString('ko-KR') : '-'}</td>
                    <td><CloseButton onClick={() => handleClose(pos._id)}>청산</CloseButton></td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        ) : (
          <EmptyState><h3>보유 중인 선물 포지션이 없습니다</h3></EmptyState>
        )}
      </Card>

      <Card>
        <CardHeader><h2>청산 내역 ({history.length})</h2></CardHeader>
        {history.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <Table>
              <thead>
                <tr>
                  <th>계약</th>
                  <th>방향</th>
                  <th>수량</th>
                  <th>진입가</th>
                  <th>청산가</th>
                  <th>실현 손익</th>
                  <th>청산일</th>
                </tr>
              </thead>
              <tbody>
                {history.map(pos => (
                  <tr key={pos._id}>
                    <td style={{ fontWeight: 600 }}>{pos.contract_name || pos.contract_symbol || '-'}</td>
                    <td><DirectionBadge $long={pos.direction === 'long'}>{pos.direction === 'long' ? '롱' : '숏'}</DirectionBadge></td>
                    <td>{pos.quantity}</td>
                    <td>{formatNumber(pos.entry_price)}</td>
                    <td>{formatNumber(pos.exit_price)}</td>
                    <td style={{ color: getProfitColor(pos.realized_pnl), fontWeight: 700 }}>
                      {pos.realized_pnl >= 0 ? '+' : ''}₩{formatNumber(pos.realized_pnl)}
                    </td>
                    <td>{pos.closed_at ? formatDate(pos.closed_at) : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        ) : (
          <EmptyState><h3>청산 내역이 없습니다</h3></EmptyState>
        )}
      </Card>
    </Container>
  );
};

export default FuturesPositions;
