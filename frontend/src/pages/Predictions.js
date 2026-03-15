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
  h1 { margin: 0; color: #333; font-size: 28px; }
  p { margin: 8px 0 0; color: #666; }
`;

const Tabs = styled.div`
  display: flex;
  gap: 4px;
  margin-bottom: 24px;
  flex-wrap: wrap;
`;

const Tab = styled.button`
  padding: 10px 20px;
  border: none;
  background: ${p => p.$active ? '#667eea' : 'white'};
  color: ${p => p.$active ? 'white' : '#666'};
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
  &:hover { opacity: 0.9; }
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 20px;
`;

const Card = styled.div`
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.05);
  padding: 24px;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
  border-left: 4px solid ${p =>
    p.$status === 'open' ? '#27ae60' :
    p.$status === 'closed' ? '#f39c12' : '#95a5a6'};
  &:hover { transform: translateY(-3px); box-shadow: 0 8px 25px rgba(0,0,0,0.1); }
`;

const CardTitle = styled.h3`
  margin: 0 0 8px;
  font-size: 18px;
  color: #333;
`;

const CardDesc = styled.p`
  margin: 0 0 16px;
  color: #666;
  font-size: 14px;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

const StatusBadge = styled.span`
  display: inline-block;
  padding: 3px 10px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  color: white;
  background: ${p =>
    p.$s === 'open' ? '#27ae60' :
    p.$s === 'closed' ? '#f39c12' : '#95a5a6'};
`;

const ResultBadge = styled.span`
  display: inline-block;
  padding: 3px 10px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  margin-left: 6px;
  color: white;
  background: ${p => p.$r === 'yes' ? '#3498db' : '#e74c3c'};
`;

const BetBar = styled.div`
  display: flex;
  height: 8px;
  border-radius: 4px;
  overflow: hidden;
  background: #eee;
  margin: 12px 0 8px;
`;

const BetBarYes = styled.div`
  background: #3498db;
  width: ${p => p.$w}%;
  transition: width 0.3s;
`;

const BetBarNo = styled.div`
  background: #e74c3c;
  width: ${p => p.$w}%;
  transition: width 0.3s;
`;

const BetStats = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  color: #666;
  .yes { color: #3498db; font-weight: 600; }
  .no { color: #e74c3c; font-weight: 600; }
`;

const Deadline = styled.div`
  font-size: 13px;
  color: #999;
  margin-top: 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const OddsBadge = styled.span`
  background: #f0f2ff;
  color: #667eea;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
`;

const Empty = styled.div`
  text-align: center;
  padding: 60px;
  color: #666;
  h3 { color: #333; margin-bottom: 8px; }
`;

const Predictions = () => {
  const navigate = useNavigate();
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('open');

  useEffect(() => {
    loadPredictions();
  }, [tab]);

  const loadPredictions = async () => {
    try {
      setLoading(true);
      const status = tab === 'all' ? null : tab;
      const res = await predictionService.getPredictions(status);
      setPredictions(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getDeadlineText = (deadline) => {
    if (!deadline) return '';
    const d = new Date(deadline);
    const now = new Date();
    const diff = d - now;
    if (diff <= 0) return '마감됨';
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(hours / 24);
    if (days > 0) return `D-${days}`;
    if (hours > 0) return `${hours}시간 남음`;
    return `${Math.floor(diff / 60000)}분 남음`;
  };

  const getYesPercent = (p) => {
    const total = p.total_yes_amount + p.total_no_amount;
    if (total === 0) return 50;
    return Math.round((p.total_yes_amount / total) * 100);
  };

  return (
    <Container>
      <Header>
        <h1>예측 마켓</h1>
        <p>다양한 주제에 베팅하고 예측 수익을 얻으세요. 배당률 1.8배!</p>
      </Header>

      <Tabs>
        {[
          ['open', '진행중'],
          ['closed', '마감'],
          ['settled', '정산완료'],
          ['all', '전체'],
        ].map(([key, label]) => (
          <Tab key={key} $active={tab === key} onClick={() => setTab(key)}>
            {label}
          </Tab>
        ))}
        <Tab $active={false} onClick={() => navigate('/my-bets')}
          style={{ marginLeft: 'auto', background: '#f0f2ff', color: '#667eea' }}>
          내 베팅 내역
        </Tab>
      </Tabs>

      {loading ? (
        <Empty><p>로딩 중...</p></Empty>
      ) : predictions.length === 0 ? (
        <Empty>
          <h3>예측이 없습니다</h3>
          <p>{tab === 'open' ? '아직 진행중인 예측이 없습니다.' : '해당 상태의 예측이 없습니다.'}</p>
        </Empty>
      ) : (
        <Grid>
          {predictions.map(p => {
            const yp = getYesPercent(p);
            return (
              <Card key={p.id} $status={p.status}
                onClick={() => navigate(`/predictions/${p.id}`)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <StatusBadge $s={p.status}>
                    {p.status === 'open' ? '진행중' : p.status === 'closed' ? '마감' : '정산완료'}
                  </StatusBadge>
                  {p.result && <ResultBadge $r={p.result}>{p.result === 'yes' ? 'YES' : 'NO'}</ResultBadge>}
                  <OddsBadge>YES x{p.yes_odds} / NO x{p.no_odds}</OddsBadge>
                </div>
                <CardTitle>{p.title}</CardTitle>
                {p.description && <CardDesc>{p.description}</CardDesc>}
                <BetBar>
                  <BetBarYes $w={yp} />
                  <BetBarNo $w={100 - yp} />
                </BetBar>
                <BetStats>
                  <span className="yes">YES {yp}% ({formatNumber(p.total_yes_amount)}원)</span>
                  <span className="no">NO {100 - yp}% ({formatNumber(p.total_no_amount)}원)</span>
                </BetStats>
                <Deadline>
                  <span>{p.deadline ? new Date(p.deadline).toLocaleString('ko-KR') : ''}</span>
                  <span style={{ fontWeight: 600 }}>{getDeadlineText(p.deadline)}</span>
                </Deadline>
              </Card>
            );
          })}
        </Grid>
      )}
    </Container>
  );
};

export default Predictions;
