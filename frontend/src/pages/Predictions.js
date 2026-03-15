import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { predictionService } from '../services/predictionService';
import { formatNumber } from '../utils/helpers';
import styled, { keyframes } from 'styled-components';

const fadeIn = keyframes`from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); }`;
const tickerScroll = keyframes`
  0% { transform: translateX(0); }
  100% { transform: translateX(-50%); }
`;
const hotPulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
`;

/* ── Ticker ── */

const TickerWrap = styled.div`
  background: #12101f;
  border-bottom: 1px solid rgba(255,255,255,0.06);
  overflow: hidden;
  position: relative;
  height: 42px;
  margin-bottom: 24px;
  border-radius: 10px;
  &::before, &::after {
    content: '';
    position: absolute;
    top: 0; bottom: 0;
    width: 50px;
    z-index: 2;
    pointer-events: none;
  }
  &::before { left: 0; background: linear-gradient(90deg, #12101f, transparent); }
  &::after { right: 0; background: linear-gradient(90deg, transparent, #12101f); }
`;

const TickerTrack = styled.div`
  display: flex;
  align-items: center;
  height: 100%;
  width: max-content;
  animation: ${tickerScroll} ${p => p.$duration || '40s'} linear infinite;
  will-change: transform;
`;

const TickerItem = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 24px;
  white-space: nowrap;
  font-size: 13px;
  font-weight: 600;
  border-right: 1px solid rgba(255,255,255,0.06);
  height: 100%;
  cursor: pointer;
  transition: background 0.2s;
  &:hover { background: rgba(255,255,255,0.04); }
`;

const TickerTitle = styled.span`
  color: #ccc;
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const TickerPool = styled.span`
  color: #a5b4fc;
  font-size: 12px;
`;

const TickerOdds = styled.span`
  font-size: 11px;
  color: #888;
`;

const HotBadge = styled.span`
  background: linear-gradient(135deg, #ff6b6b, #ee5a24);
  color: white;
  font-size: 9px;
  font-weight: 800;
  padding: 2px 6px;
  border-radius: 4px;
  letter-spacing: 0.5px;
  animation: ${hotPulse} 1.5s ease infinite;
`;

const MyBetDot = styled.span`
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: ${p => p.$won ? '#2ecc71' : p.$lost ? '#e74c3c' : '#f39c12'};
  flex-shrink: 0;
  box-shadow: 0 0 6px ${p => p.$won ? '#2ecc71' : p.$lost ? '#e74c3c' : '#f39c12'};
`;

/* ── Main Layout ── */

const Container = styled.div`
  min-height: 100vh;
  background: linear-gradient(135deg, #0f0c29, #302b63, #24243e);
  padding: 24px;
`;

const Inner = styled.div`
  max-width: 1100px;
  margin: 0 auto;
`;

const Header = styled.div`
  background: rgba(255,255,255,0.05);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255,255,255,0.08);
  padding: 28px;
  border-radius: 16px;
  margin-bottom: 24px;
  animation: ${fadeIn} 0.4s ease;
  h1 {
    margin: 0;
    font-size: 28px;
    background: linear-gradient(135deg, #667eea, #764ba2);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }
  p { margin: 8px 0 0; color: #888; font-size: 14px; }
`;

const Tabs = styled.div`
  display: flex;
  gap: 6px;
  margin-bottom: 24px;
  flex-wrap: wrap;
  align-items: center;
`;

const Tab = styled.button`
  padding: 9px 20px;
  border: 1px solid ${p => p.$active ? 'rgba(102,126,234,0.5)' : 'rgba(255,255,255,0.1)'};
  background: ${p => p.$active ? 'rgba(102,126,234,0.25)' : 'rgba(255,255,255,0.04)'};
  color: ${p => p.$active ? '#a5b4fc' : '#888'};
  border-radius: 10px;
  font-weight: 600;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
  &:hover { background: rgba(102,126,234,0.15); color: #a5b4fc; }
`;

const MyBetsBtn = styled.button`
  margin-left: auto;
  padding: 9px 20px;
  border: 1px solid rgba(102,126,234,0.3);
  background: rgba(102,126,234,0.12);
  color: #a5b4fc;
  border-radius: 10px;
  font-weight: 600;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
  &:hover { background: rgba(102,126,234,0.25); }
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 18px;
`;

const Card = styled.div`
  background: rgba(255,255,255,0.06);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 14px;
  padding: 22px;
  cursor: pointer;
  transition: all 0.25s;
  animation: ${fadeIn} 0.4s ease;
  animation-delay: ${p => p.$delay || '0s'};
  animation-fill-mode: backwards;
  border-left: 4px solid ${p =>
    p.$status === 'open' ? '#2ecc71' :
    p.$status === 'closed' ? '#f39c12' : '#7f8c8d'};
  &:hover {
    transform: translateY(-4px);
    background: rgba(255,255,255,0.1);
    box-shadow: 0 12px 40px rgba(0,0,0,0.3);
  }
`;

const CardTop = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  gap: 6px;
  flex-wrap: wrap;
`;

const StatusBadge = styled.span`
  display: inline-block;
  padding: 4px 12px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.5px;
  color: white;
  background: ${p =>
    p.$s === 'open' ? '#27ae60' :
    p.$s === 'closed' ? '#e67e22' : '#7f8c8d'};
`;

const ResultBadge = styled.span`
  display: inline-block;
  padding: 4px 12px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 700;
  color: white;
  background: ${p => p.$r === 'yes' ? '#3498db' : '#e74c3c'};
`;

const OddsBadge = styled.span`
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  color: #a5b4fc;
  background: rgba(102,126,234,0.15);
  border: 1px solid rgba(102,126,234,0.2);
`;

const CardTitle = styled.h3`
  margin: 0 0 6px;
  font-size: 17px;
  color: #e8e8e8;
  font-weight: 600;
`;

const CardDesc = styled.p`
  margin: 0 0 14px;
  color: #888;
  font-size: 13px;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

const BetBar = styled.div`
  display: flex;
  height: 8px;
  border-radius: 4px;
  overflow: hidden;
  background: rgba(255,255,255,0.08);
  margin: 12px 0 8px;
`;

const BetBarYes = styled.div`
  background: linear-gradient(90deg, #2980b9, #3498db);
  width: ${p => p.$w}%;
  transition: width 0.4s;
`;

const BetBarNo = styled.div`
  background: linear-gradient(90deg, #e74c3c, #c0392b);
  width: ${p => p.$w}%;
  transition: width 0.4s;
`;

const BetStats = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  .yes { color: #5dade2; font-weight: 600; }
  .no { color: #ec7063; font-weight: 600; }
`;

const Deadline = styled.div`
  font-size: 12px;
  color: #666;
  margin-top: 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 10px;
  border-top: 1px solid rgba(255,255,255,0.06);
`;

const DeadlineTag = styled.span`
  color: ${p => p.$urgent ? '#f39c12' : p.$early ? '#a5b4fc' : '#888'};
  font-weight: 600;
  font-size: 11px;
`;

const MyResultBadge = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 10px;
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 700;
  background: ${p =>
    p.$result === 'won' ? 'rgba(46,204,113,0.12)' :
    p.$result === 'lost' ? 'rgba(231,76,60,0.12)' :
    'rgba(243,156,18,0.12)'};
  border: 1px solid ${p =>
    p.$result === 'won' ? 'rgba(46,204,113,0.25)' :
    p.$result === 'lost' ? 'rgba(231,76,60,0.25)' :
    'rgba(243,156,18,0.25)'};
  color: ${p =>
    p.$result === 'won' ? '#2ecc71' :
    p.$result === 'lost' ? '#ec7063' :
    '#f39c12'};
`;

const MyResultProfit = styled.span`
  margin-left: auto;
  font-size: 13px;
  font-weight: 800;
`;

const Empty = styled.div`
  text-align: center;
  padding: 80px 20px;
  color: #888;
  h3 { color: #bbb; margin-bottom: 8px; font-size: 18px; }
`;

/* ── Ticker Component ── */

const AD_MESSAGES = [
  '예측 마켓에서 당신의 판단력을 시험해보세요!',
  '베팅은 최소 1,000원부터! 지금 바로 참여하세요',
  '참여자가 많을수록 배당금이 커집니다',
  '새로운 예측이 곧 등록됩니다.',
  'YES or NO? 당신의 선택이 수익이 됩니다',
];

const PredictionTicker = ({ predictions, myBetsMap, onClickPrediction }) => {
  const openPreds = predictions.filter(p => p.status === 'open');

  // 진행중인 예측이 없으면 광고 메시지
  if (openPreds.length === 0) {
    const adItems = [...AD_MESSAGES, ...AD_MESSAGES];
    return (
      <TickerWrap>
        <TickerTrack $duration="35s">
          {adItems.map((msg, i) => (
            <TickerItem key={i} style={{ cursor: 'default' }}>
              <TickerTitle style={{ color: '#a5b4fc', maxWidth: 'none' }}>{msg}</TickerTitle>
            </TickerItem>
          ))}
        </TickerTrack>
      </TickerWrap>
    );
  }

  const HOT_POOL = 1500000;
  const HOT_BETTORS = 7;
  const sorted = [...openPreds].sort((a, b) =>
    (b.total_yes_amount + b.total_no_amount) - (a.total_yes_amount + a.total_no_amount)
  );

  const items = sorted.map(p => {
    const pool = p.total_yes_amount + p.total_no_amount;
    const bettors = p.total_yes_bettors + p.total_no_bettors;
    const isHot = pool >= HOT_POOL || bettors >= HOT_BETTORS;
    const myBets = myBetsMap[p.id];
    const myStatus = myBets
      ? (myBets.some(b => b.status === 'won') ? 'won'
        : myBets.some(b => b.status === 'lost') ? 'lost' : 'pending')
      : null;
    return { ...p, pool, bettors, isHot, myStatus };
  });

  const doubled = [...items, ...items];
  const duration = `${Math.max(items.length * 6, 20)}s`;

  return (
    <TickerWrap>
      <TickerTrack $duration={duration}>
        {doubled.map((item, i) => (
          <TickerItem key={i} onClick={() => onClickPrediction(item.id)}>
            {item.isHot && <HotBadge>HOT</HotBadge>}
            {item.myStatus && (
              <MyBetDot
                $won={item.myStatus === 'won'}
                $lost={item.myStatus === 'lost'}
              />
            )}
            <TickerTitle>{item.title}</TickerTitle>
            <TickerPool>{formatNumber(item.pool)}원</TickerPool>
            <TickerOdds>
              Y x{item.yes_odds} / N x{item.no_odds}
            </TickerOdds>
            {item.bettors > 0 && (
              <TickerOdds>{item.bettors}명 참여</TickerOdds>
            )}
          </TickerItem>
        ))}
      </TickerTrack>
    </TickerWrap>
  );
};

/* ── Main ── */

const Predictions = () => {
  const navigate = useNavigate();
  const [allPredictions, setAllPredictions] = useState([]);
  const [predictions, setPredictions] = useState([]);
  const [myBetsMap, setMyBetsMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('all');

  useEffect(() => {
    loadData();
    const timer = setInterval(loadData, 30 * 1000); // 30초마다 갱신
    return () => clearInterval(timer);
  }, [tab]); // eslint-disable-line

  const loadData = async () => {
    try {
      setLoading(true);
      const status = tab === 'all' ? null : tab;
      const [predRes, allRes, betsRes] = await Promise.all([
        predictionService.getPredictions(status),
        // 티커용: 항상 전체 가져옴 (open만 필요하지만 전체에서 필터)
        tab !== 'all'
          ? predictionService.getPredictions(null)
          : Promise.resolve(null),
        predictionService.getMyBets().catch(() => ({ data: [] })),
      ]);
      const predData = predRes.data || [];
      setPredictions(predData);
      setAllPredictions(allRes ? (allRes.data || []) : predData);

      const map = {};
      for (const bet of (betsRes.data || [])) {
        if (!map[bet.prediction_id]) map[bet.prediction_id] = [];
        map[bet.prediction_id].push(bet);
      }
      setMyBetsMap(map);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getDeadlineText = (p) => {
    if (p.status === 'settled') {
      if (p.settled_at && p.deadline) {
        const settled = new Date(p.settled_at);
        const deadline = new Date(p.deadline);
        if (settled < deadline) return { text: '조기 마감', early: true };
      }
      return { text: '', early: false };
    }
    if (!p.deadline) return { text: '', early: false };
    const d = new Date(p.deadline);
    const now = new Date();
    const diff = d - now;
    if (diff <= 0) return { text: '마감됨', urgent: false };
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(hours / 24);
    if (days > 0) return { text: `D-${days}`, urgent: false };
    if (hours > 0) return { text: `${hours}시간 남음`, urgent: true };
    return { text: `${Math.floor(diff / 60000)}분 남음`, urgent: true };
  };

  const getYesPercent = (p) => {
    const total = p.total_yes_amount + p.total_no_amount;
    if (total === 0) return 50;
    return Math.round((p.total_yes_amount / total) * 100);
  };

  const getMyBetSummary = (predictionId) => {
    const bets = myBetsMap[predictionId];
    if (!bets || bets.length === 0) return null;

    const hasWon = bets.some(b => b.status === 'won');
    const hasLost = bets.some(b => b.status === 'lost');
    const allPending = bets.every(b => b.status === 'pending');

    const totalAmount = bets.reduce((s, b) => s + b.amount, 0);
    const totalPayout = bets.reduce((s, b) => s + (b.payout || 0), 0);
    const profit = hasWon || hasLost ? totalPayout - (
      bets.filter(b => b.status === 'won' || b.status === 'lost').reduce((s, b) => s + b.amount, 0)
    ) : 0;
    const choices = [...new Set(bets.map(b => b.choice))];

    return {
      result: allPending ? 'pending' : hasWon ? 'won' : 'lost',
      totalAmount,
      profit,
      choices,
    };
  };

  return (
    <Container>
      <Inner>
        {/* 예측 티커 전광판 */}
        {!loading && (
          <PredictionTicker
            predictions={allPredictions}
            myBetsMap={myBetsMap}
            onClickPrediction={(id) => navigate(`/predictions/${id}`)}
          />
        )}

        <Header>
          <h1>예측 마켓</h1>
          <p>다양한 주제에 베팅하고 예측 수익을 얻으세요. 참여자 비율에 따라 배당률이 변동됩니다.</p>
        </Header>

        <Tabs>
          {[
            ['all', '전체'],
            ['open', '진행중'],
            ['closed', '마감'],
            ['settled', '정산완료'],
          ].map(([key, label]) => (
            <Tab key={key} $active={tab === key} onClick={() => setTab(key)}>
              {label}
            </Tab>
          ))}
          <MyBetsBtn onClick={() => navigate('/my-bets')}>
            내 베팅 내역
          </MyBetsBtn>
        </Tabs>

        {loading ? (
          <Empty><p style={{ color: '#888' }}>로딩 중...</p></Empty>
        ) : predictions.length === 0 ? (
          <Empty>
            <h3>예측이 없습니다</h3>
            <p>{tab === 'open' ? '아직 진행중인 예측이 없습니다.' : '해당 상태의 예측이 없습니다.'}</p>
          </Empty>
        ) : (
          <Grid>
            {predictions.map((p, i) => {
              const yp = getYesPercent(p);
              const dl = getDeadlineText(p);
              const myBet = getMyBetSummary(p.id);
              return (
                <Card key={p.id} $status={p.status}
                  $delay={`${Math.min(i * 0.04, 0.3)}s`}
                  onClick={() => navigate(`/predictions/${p.id}`)}>
                  <CardTop>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <StatusBadge $s={p.status}>
                        {p.status === 'open' ? '진행중' : p.status === 'closed' ? '마감' : '정산완료'}
                      </StatusBadge>
                      {p.result && <ResultBadge $r={p.result}>{p.result === 'yes' ? 'YES' : 'NO'}</ResultBadge>}
                    </div>
                    <OddsBadge>YES x{p.yes_odds} / NO x{p.no_odds}</OddsBadge>
                  </CardTop>
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

                  {myBet && (
                    <MyResultBadge $result={myBet.result}>
                      <span>
                        {myBet.choices.map(c => c === 'yes' ? 'YES' : 'NO').join('+')}
                        {' '}
                        {formatNumber(myBet.totalAmount)}원 베팅
                      </span>
                      {myBet.result === 'won' && (
                        <MyResultProfit>+{formatNumber(myBet.profit)}원</MyResultProfit>
                      )}
                      {myBet.result === 'lost' && (
                        <MyResultProfit>-{formatNumber(myBet.totalAmount)}원</MyResultProfit>
                      )}
                      {myBet.result === 'pending' && (
                        <MyResultProfit>대기중</MyResultProfit>
                      )}
                    </MyResultBadge>
                  )}

                  <Deadline>
                    <span>{p.deadline ? new Date(p.deadline).toLocaleString('ko-KR') : ''}</span>
                    {dl.text && (
                      <DeadlineTag $urgent={dl.urgent} $early={dl.early}>
                        {dl.text}
                      </DeadlineTag>
                    )}
                  </Deadline>
                </Card>
              );
            })}
          </Grid>
        )}
      </Inner>
    </Container>
  );
};

export default Predictions;
