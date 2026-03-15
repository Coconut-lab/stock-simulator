import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { predictionService } from '../services/predictionService';
import { formatNumber } from '../utils/helpers';
import styled, { keyframes } from 'styled-components';

const fadeIn = keyframes`from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); }`;

const Container = styled.div`
  min-height: 100vh;
  background: linear-gradient(135deg, #0f0c29, #302b63, #24243e);
  padding: 24px;
  color: #e0e0e0;
`;

const Inner = styled.div`
  max-width: 900px;
  margin: 0 auto;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 28px;
  flex-wrap: wrap;
  gap: 12px;
  h1 {
    margin: 0;
    font-size: 28px;
    background: linear-gradient(135deg, #667eea, #764ba2);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }
`;

const BackBtn = styled.button`
  background: rgba(102, 126, 234, 0.2);
  color: #667eea;
  border: 1px solid rgba(102, 126, 234, 0.3);
  padding: 10px 20px;
  border-radius: 10px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  &:hover { background: rgba(102, 126, 234, 0.35); }
`;

/* ── 요약 카드 ── */

const SummaryGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 16px;
  margin-bottom: 28px;
  animation: ${fadeIn} 0.4s ease;
`;

const SummaryCard = styled.div`
  background: rgba(255,255,255,0.06);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 14px;
  padding: 20px;
  text-align: center;
  .label { font-size: 13px; color: #aaa; margin-bottom: 8px; }
  .value { font-size: 24px; font-weight: 700; color: ${p => p.$color || '#fff'}; }
  .sub { font-size: 12px; color: #888; margin-top: 6px; }
`;

/* ── 필터 탭 ── */

const Tabs = styled.div`
  display: flex;
  gap: 6px;
  margin-bottom: 20px;
  flex-wrap: wrap;
`;

const Tab = styled.button`
  padding: 8px 18px;
  border: 1px solid ${p => p.$active ? 'rgba(102,126,234,0.5)' : 'rgba(255,255,255,0.1)'};
  background: ${p => p.$active ? 'rgba(102,126,234,0.25)' : 'rgba(255,255,255,0.04)'};
  color: ${p => p.$active ? '#a5b4fc' : '#999'};
  border-radius: 8px;
  font-weight: 600;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
  &:hover { background: rgba(102,126,234,0.15); color: #a5b4fc; }
`;

/* ── 수익 차트 (간단 바) ── */

const ProfitBar = styled.div`
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 14px;
  padding: 20px;
  margin-bottom: 28px;
  animation: ${fadeIn} 0.5s ease;
`;

const ProfitBarTitle = styled.div`
  font-size: 14px;
  color: #aaa;
  margin-bottom: 14px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  span:last-child { font-weight: 700; color: ${p => p.$color}; font-size: 16px; }
`;

const BarTrack = styled.div`
  height: 12px;
  background: rgba(255,255,255,0.08);
  border-radius: 6px;
  overflow: hidden;
  display: flex;
`;

const BarFillWin = styled.div`
  height: 100%;
  background: linear-gradient(90deg, #27ae60, #2ecc71);
  width: ${p => p.$w}%;
  transition: width 0.5s ease;
`;

const BarFillLoss = styled.div`
  height: 100%;
  background: linear-gradient(90deg, #e74c3c, #c0392b);
  width: ${p => p.$w}%;
  transition: width 0.5s ease;
`;

const BarLabels = styled.div`
  display: flex;
  justify-content: space-between;
  margin-top: 8px;
  font-size: 12px;
  .win { color: #2ecc71; }
  .loss { color: #e74c3c; }
  .pending { color: #f39c12; }
`;

/* ── 베팅 카드 ── */

const BetList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const BetCard = styled.div`
  background: rgba(255,255,255,0.06);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 14px;
  padding: 20px;
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 16px;
  align-items: center;
  cursor: pointer;
  transition: all 0.25s;
  animation: ${fadeIn} 0.4s ease;
  animation-delay: ${p => p.$delay || '0s'};
  animation-fill-mode: backwards;
  border-left: 4px solid ${p =>
    p.$status === 'won' ? '#2ecc71' :
    p.$status === 'lost' ? '#e74c3c' : '#f39c12'};
  &:hover {
    background: rgba(255,255,255,0.1);
    transform: translateX(4px);
  }
`;

const BetInfo = styled.div`
  .title {
    font-size: 16px;
    font-weight: 600;
    color: #e8e8e8;
    margin-bottom: 8px;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .meta {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
    align-items: center;
    font-size: 13px;
    color: #888;
  }
`;

const Badge = styled.span`
  display: inline-block;
  padding: 3px 10px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.5px;
  color: white;
  background: ${p => p.$bg || '#555'};
`;

const BetRight = styled.div`
  text-align: right;
  min-width: 120px;
  .amount {
    font-size: 14px;
    color: #aaa;
    margin-bottom: 4px;
    span { color: #ccc; font-weight: 600; }
  }
  .result {
    font-size: 18px;
    font-weight: 700;
    color: ${p => p.$color || '#ccc'};
  }
  .date {
    font-size: 11px;
    color: #666;
    margin-top: 4px;
  }
`;

const Empty = styled.div`
  text-align: center;
  padding: 80px 20px;
  color: #888;
  h3 { color: #bbb; margin-bottom: 8px; font-size: 18px; }
`;

const MyBets = () => {
  const navigate = useNavigate();
  const [bets, setBets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

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

  // 통계 계산
  const totalBets = bets.length;
  const wonBets = bets.filter(b => b.status === 'won');
  const lostBets = bets.filter(b => b.status === 'lost');
  const pendingBets = bets.filter(b => b.status === 'pending');

  const totalWagered = bets.reduce((s, b) => s + b.amount, 0);
  const totalPayout = wonBets.reduce((s, b) => s + b.payout, 0);
  const totalLostAmount = lostBets.reduce((s, b) => s + b.amount, 0);
  const pendingAmount = pendingBets.reduce((s, b) => s + b.amount, 0);

  // 순수익 = 받은 금액 - 투자 금액 (정산된 것만)
  const settledWagered = wonBets.reduce((s, b) => s + b.amount, 0) + totalLostAmount;
  const netProfit = totalPayout - settledWagered;

  const winRate = wonBets.length + lostBets.length > 0
    ? Math.round((wonBets.length / (wonBets.length + lostBets.length)) * 100)
    : 0;

  // 승/패/대기 비율 (금액 기준)
  const totalSettled = totalPayout + totalLostAmount || 1;
  const winPercent = Math.round((totalPayout / totalSettled) * 100);
  const lossPercent = 100 - winPercent;

  // 필터
  const filtered = filter === 'all' ? bets : bets.filter(b => b.status === filter);

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <Container>
      <Inner>
        <Header>
          <h1>내 베팅 내역</h1>
          <BackBtn onClick={() => navigate('/predictions')}>예측 마켓으로</BackBtn>
        </Header>

        {/* 요약 */}
        <SummaryGrid>
          <SummaryCard>
            <div className="label">총 베팅</div>
            <div className="value">{totalBets}건</div>
            <div className="sub">승 {wonBets.length} / 패 {lostBets.length} / 대기 {pendingBets.length}</div>
          </SummaryCard>
          <SummaryCard>
            <div className="label">총 베팅금</div>
            <div className="value">{formatNumber(totalWagered)}</div>
            <div className="sub">대기중 {formatNumber(pendingAmount)}원</div>
          </SummaryCard>
          <SummaryCard $color="#2ecc71">
            <div className="label">총 당첨금</div>
            <div className="value">{formatNumber(totalPayout)}</div>
            <div className="sub">승률 {winRate}%</div>
          </SummaryCard>
          <SummaryCard $color={netProfit >= 0 ? '#2ecc71' : '#e74c3c'}>
            <div className="label">순수익</div>
            <div className="value">{netProfit >= 0 ? '+' : ''}{formatNumber(netProfit)}</div>
            <div className="sub">정산 완료 기준</div>
          </SummaryCard>
        </SummaryGrid>

        {/* 승/패 바 */}
        {(wonBets.length > 0 || lostBets.length > 0) && (
          <ProfitBar>
            <ProfitBarTitle $color={netProfit >= 0 ? '#2ecc71' : '#e74c3c'}>
              <span>수익 현황</span>
              <span>{netProfit >= 0 ? '+' : ''}{formatNumber(netProfit)}원</span>
            </ProfitBarTitle>
            <BarTrack>
              <BarFillWin $w={winPercent} />
              <BarFillLoss $w={lossPercent} />
            </BarTrack>
            <BarLabels>
              <span className="win">당첨 {formatNumber(totalPayout)}원</span>
              <span className="loss">손실 {formatNumber(totalLostAmount)}원</span>
            </BarLabels>
          </ProfitBar>
        )}

        {/* 필터 */}
        <Tabs>
          {[
            ['all', `전체 (${bets.length})`],
            ['won', `당첨 (${wonBets.length})`],
            ['lost', `미당첨 (${lostBets.length})`],
            ['pending', `대기중 (${pendingBets.length})`],
          ].map(([key, label]) => (
            <Tab key={key} $active={filter === key} onClick={() => setFilter(key)}>
              {label}
            </Tab>
          ))}
        </Tabs>

        {/* 베팅 목록 */}
        {loading ? (
          <Empty><p>로딩 중...</p></Empty>
        ) : filtered.length === 0 ? (
          <Empty>
            <h3>{filter === 'all' ? '베팅 내역이 없습니다' : '해당 내역이 없습니다'}</h3>
            <p>예측 마켓에서 첫 베팅을 해보세요!</p>
          </Empty>
        ) : (
          <BetList>
            {filtered.map((bet, i) => {
              const profit = bet.status === 'won'
                ? bet.payout - bet.amount
                : bet.status === 'lost'
                ? -bet.amount
                : 0;

              return (
                <BetCard
                  key={bet.bet_id}
                  $status={bet.status}
                  $delay={`${Math.min(i * 0.05, 0.3)}s`}
                  onClick={() => navigate(`/predictions/${bet.prediction_id}`)}
                >
                  <BetInfo>
                    <div className="title">
                      {bet.prediction_title}
                    </div>
                    <div className="meta">
                      <Badge $bg={bet.choice === 'yes' ? '#3498db' : '#e74c3c'}>
                        {bet.choice === 'yes' ? 'YES' : 'NO'}
                      </Badge>
                      <Badge $bg={
                        bet.status === 'won' ? '#27ae60' :
                        bet.status === 'lost' ? '#c0392b' : '#e67e22'
                      }>
                        {bet.status === 'won' ? '당첨' : bet.status === 'lost' ? '미당첨' : '대기중'}
                      </Badge>
                      {bet.prediction_result && (
                        <Badge $bg={bet.prediction_result === bet.choice ? '#27ae60' : '#7f8c8d'}>
                          결과: {bet.prediction_result === 'yes' ? 'YES' : 'NO'}
                        </Badge>
                      )}
                      <span>{formatDate(bet.created_at)}</span>
                    </div>
                  </BetInfo>
                  <BetRight $color={
                    bet.status === 'won' ? '#2ecc71' :
                    bet.status === 'lost' ? '#e74c3c' : '#f39c12'
                  }>
                    <div className="amount">베팅: <span>{formatNumber(bet.amount)}원</span></div>
                    <div className="result">
                      {bet.status === 'won'
                        ? `+${formatNumber(profit)}원`
                        : bet.status === 'lost'
                        ? `-${formatNumber(bet.amount)}원`
                        : `~${formatNumber(bet.potential_payout)}원`}
                    </div>
                    {bet.status === 'won' && bet.settled_at && (
                      <div className="date">{formatDate(bet.settled_at)} 정산</div>
                    )}
                  </BetRight>
                </BetCard>
              );
            })}
          </BetList>
        )}
      </Inner>
    </Container>
  );
};

export default MyBets;
