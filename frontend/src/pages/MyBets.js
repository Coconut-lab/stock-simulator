import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { predictionService } from '../services/predictionService';
import { formatNumber } from '../utils/helpers';
import styled from 'styled-components';

const Container = styled.div`
  min-height: 100vh;
  background: #f8f9fa;
  padding: 20px;
`;

const Header = styled.div`
  background: white;
  padding: 24px;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.05);
  margin-bottom: 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  h1 { margin: 0; color: #333; font-size: 28px; }
`;

const BackBtn = styled.button`
  background: #667eea;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  &:hover { background: #5a6fd8; }
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
`;

const StatCard = styled.div`
  background: white;
  padding: 20px;
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
  text-align: center;
  .label { font-size: 13px; color: #666; margin-bottom: 6px; }
  .value { font-size: 22px; font-weight: 700; color: ${p => p.$color || '#333'}; }
`;

const BetList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const BetCard = styled.div`
  background: white;
  padding: 20px;
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 16px;
  align-items: center;
  cursor: pointer;
  border-left: 4px solid ${p =>
    p.$status === 'won' ? '#27ae60' :
    p.$status === 'lost' ? '#e74c3c' : '#f39c12'};
  &:hover { box-shadow: 0 4px 15px rgba(0,0,0,0.08); }
`;

const BetInfo = styled.div`
  .title { font-size: 16px; font-weight: 600; color: #333; margin-bottom: 6px; }
  .meta { font-size: 13px; color: #666; display: flex; gap: 12px; flex-wrap: wrap; }
`;

const Badge = styled.span`
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  color: white;
  background: ${p => p.$bg || '#999'};
`;

const BetAmount = styled.div`
  text-align: right;
  .amount { font-size: 16px; font-weight: 600; color: #333; }
  .payout { font-size: 14px; margin-top: 4px; color: ${p => p.$color || '#666'}; font-weight: 600; }
`;

const Empty = styled.div`
  text-align: center;
  padding: 60px;
  color: #666;
  h3 { color: #333; }
`;

const MyBets = () => {
  const navigate = useNavigate();
  const [bets, setBets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadBets(); }, []);

  const loadBets = async () => {
    try {
      const res = await predictionService.getMyBets();
      setBets(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const totalBets = bets.length;
  const totalWagered = bets.reduce((s, b) => s + b.amount, 0);
  const totalWon = bets.filter(b => b.status === 'won').reduce((s, b) => s + b.payout, 0);
  const totalLost = bets.filter(b => b.status === 'lost').reduce((s, b) => s + b.amount, 0);
  const netProfit = totalWon - totalLost;

  const getStatusLabel = (s) => ({ pending: '대기중', won: '당첨', lost: '미당첨' }[s] || s);
  const getStatusColor = (s) => ({ pending: '#f39c12', won: '#27ae60', lost: '#e74c3c' }[s] || '#999');

  return (
    <Container>
      <Header>
        <h1>내 베팅 내역</h1>
        <BackBtn onClick={() => navigate('/predictions')}>예측 마켓으로</BackBtn>
      </Header>

      <StatsGrid>
        <StatCard>
          <div className="label">총 베팅</div>
          <div className="value">{totalBets}건</div>
        </StatCard>
        <StatCard>
          <div className="label">총 베팅금</div>
          <div className="value">{formatNumber(totalWagered)}원</div>
        </StatCard>
        <StatCard $color="#27ae60">
          <div className="label">총 당첨금</div>
          <div className="value">{formatNumber(totalWon)}원</div>
        </StatCard>
        <StatCard $color={netProfit >= 0 ? '#27ae60' : '#e74c3c'}>
          <div className="label">순수익</div>
          <div className="value">{netProfit >= 0 ? '+' : ''}{formatNumber(netProfit)}원</div>
        </StatCard>
      </StatsGrid>

      {loading ? (
        <Empty><p>로딩 중...</p></Empty>
      ) : bets.length === 0 ? (
        <Empty>
          <h3>베팅 내역이 없습니다</h3>
          <p>예측 마켓에서 첫 베팅을 해보세요!</p>
        </Empty>
      ) : (
        <BetList>
          {bets.map(bet => (
            <BetCard key={bet.bet_id} $status={bet.status}
              onClick={() => navigate(`/predictions/${bet.prediction_id}`)}>
              <BetInfo>
                <div className="title">{bet.prediction_title}</div>
                <div className="meta">
                  <Badge $bg={bet.choice === 'yes' ? '#3498db' : '#e74c3c'}>
                    {bet.choice === 'yes' ? 'YES' : 'NO'}
                  </Badge>
                  <Badge $bg={getStatusColor(bet.status)}>
                    {getStatusLabel(bet.status)}
                  </Badge>
                  <span>{bet.created_at ? new Date(bet.created_at).toLocaleDateString('ko-KR') : ''}</span>
                </div>
              </BetInfo>
              <BetAmount $color={bet.status === 'won' ? '#27ae60' : bet.status === 'lost' ? '#e74c3c' : '#666'}>
                <div className="amount">{formatNumber(bet.amount)}원</div>
                <div className="payout">
                  {bet.status === 'won' ? `+${formatNumber(bet.payout)}원` :
                   bet.status === 'lost' ? `-${formatNumber(bet.amount)}원` :
                   `예상 ${formatNumber(bet.potential_payout)}원`}
                </div>
              </BetAmount>
            </BetCard>
          ))}
        </BetList>
      )}
    </Container>
  );
};

export default MyBets;
