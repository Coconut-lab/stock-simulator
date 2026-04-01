import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { predictionService } from '../services/predictionService';
import { formatNumber } from '../utils/helpers';
import styled, { keyframes } from 'styled-components';

/* ── Animations ── */

const fadeIn = keyframes`from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); }`;
const popIn = keyframes`
  0% { opacity: 0; transform: scale(0.7); }
  60% { transform: scale(1.05); }
  100% { opacity: 1; transform: scale(1); }
`;
const shimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;

/* ── Confetti Canvas ── */

const ConfettiCanvas = styled.canvas`
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  pointer-events: none;
  z-index: 9999;
`;

/* ── Layout ── */

const Container = styled.div`
  min-height: 100vh;
  background: linear-gradient(135deg, #0f0c29, #302b63, #24243e);
  padding: 24px;
`;

const Inner = styled.div`
  max-width: 800px;
  margin: 0 auto;
`;

const BackBtn = styled.button`
  background: rgba(255,255,255,0.08);
  color: #a5b4fc;
  border: 1px solid rgba(255,255,255,0.1);
  padding: 10px 18px;
  border-radius: 10px;
  font-weight: 600;
  cursor: pointer;
  margin-bottom: 20px;
  transition: all 0.2s;
  &:hover { background: rgba(255,255,255,0.14); }
`;

const Card = styled.div`
  background: rgba(255,255,255,0.06);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 16px;
  padding: 30px;
  margin-bottom: 20px;
  animation: ${fadeIn} 0.4s ease;
`;

const Title = styled.h1`
  font-size: 26px;
  color: #e8e8e8;
  margin: 0 0 12px;
`;

const Desc = styled.p`
  color: #999;
  line-height: 1.6;
  margin: 0 0 20px;
`;

const InfoRow = styled.div`
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 20px;
`;

const InfoChip = styled.div`
  padding: 6px 14px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  background: ${p => p.$bg || 'rgba(102,126,234,0.15)'};
  color: ${p => p.$color || '#a5b4fc'};
  border: 1px solid ${p => p.$border || 'rgba(102,126,234,0.2)'};
`;

const BetBar = styled.div`
  display: flex;
  height: 14px;
  border-radius: 7px;
  overflow: hidden;
  background: rgba(255,255,255,0.08);
  margin: 16px 0;
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

const Stats = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
  margin-bottom: 24px;
`;

const StatBox = styled.div`
  padding: 18px;
  border-radius: 12px;
  text-align: center;
  background: ${p => p.$bg || 'rgba(255,255,255,0.04)'};
  border: 1px solid ${p => p.$border || 'rgba(255,255,255,0.06)'};
  .label { font-size: 13px; color: #888; margin-bottom: 6px; }
  .value { font-size: 24px; font-weight: 700; color: ${p => p.$color || '#e8e8e8'}; }
  .sub { font-size: 12px; color: #666; margin-top: 6px; }
`;

/* ── 내 베팅 결과 섹션 ── */

const MyBetCard = styled.div`
  background: ${p => p.$won
    ? 'linear-gradient(135deg, rgba(39,174,96,0.15), rgba(46,204,113,0.08))'
    : p.$lost
    ? 'linear-gradient(135deg, rgba(231,76,60,0.15), rgba(192,57,43,0.08))'
    : 'rgba(243,156,18,0.1)'};
  border: 1px solid ${p => p.$won
    ? 'rgba(39,174,96,0.3)'
    : p.$lost
    ? 'rgba(231,76,60,0.3)'
    : 'rgba(243,156,18,0.3)'};
  border-radius: 14px;
  padding: 22px;
  margin-bottom: 20px;
  animation: ${popIn} 0.5s ease;
`;

const MyBetTitle = styled.div`
  font-size: 16px;
  font-weight: 700;
  margin-bottom: 14px;
  color: ${p => p.$color || '#e8e8e8'};
  display: flex;
  align-items: center;
  gap: 8px;
`;

const MyBetSummary = styled.div`
  display: flex;
  gap: 16px;
  margin-bottom: 14px;
  flex-wrap: wrap;
`;

const MyBetSummaryItem = styled.div`
  background: rgba(0,0,0,0.2);
  border-radius: 10px;
  padding: 10px 16px;
  font-size: 13px;
  color: #aaa;
  span { font-weight: 700; color: ${p => p.$color || '#e8e8e8'}; margin-left: 6px; }
`;

const MyBetList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const MyBetRow = styled.div`
  display: grid;
  grid-template-columns: 60px 1fr 80px 1fr;
  gap: 12px;
  align-items: center;
  background: rgba(0,0,0,0.2);
  border-radius: 10px;
  padding: 12px 16px;
  font-size: 14px;
`;

const MyBetChoice = styled.span`
  font-weight: 700;
  font-size: 15px;
  color: ${p => p.$yes ? '#5dade2' : '#ec7063'};
`;

const MyBetAmount = styled.span`
  color: #e8e8e8;
  font-weight: 600;
`;

const MyBetStatus = styled.span`
  font-weight: 600;
  font-size: 12px;
  text-align: center;
  padding: 4px 10px;
  border-radius: 6px;
  background: ${p =>
    p.$s === 'won' ? 'rgba(46,204,113,0.15)' :
    p.$s === 'lost' ? 'rgba(231,76,60,0.15)' :
    'rgba(243,156,18,0.15)'};
  color: ${p =>
    p.$s === 'won' ? '#2ecc71' :
    p.$s === 'lost' ? '#ec7063' : '#f39c12'};
`;

const MyBetPayout = styled.span`
  text-align: right;
  font-weight: 700;
  color: ${p => p.$color || '#aaa'};
`;

const ProfitValue = styled.div`
  font-size: 22px;
  font-weight: 800;
  text-align: center;
  margin-top: 14px;
  padding: 14px;
  border-radius: 10px;
  background: ${p => p.$positive
    ? 'linear-gradient(135deg, rgba(46,204,113,0.2), rgba(39,174,96,0.1))'
    : 'linear-gradient(135deg, rgba(231,76,60,0.2), rgba(192,57,43,0.1))'};
  color: ${p => p.$positive ? '#2ecc71' : '#e74c3c'};
  background-size: 400% 100%;
  animation: ${p => p.$positive ? shimmer : 'none'} 3s ease infinite;
`;

/* ── 베팅 폼 ── */

const BetSection = styled.div`
  border-top: 1px solid rgba(255,255,255,0.08);
  padding-top: 24px;
`;

const BetBtns = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 16px;
`;

const ChoiceBtn = styled.button`
  padding: 18px;
  border: 2px solid ${p => p.$selected
    ? (p.$choice === 'yes' ? '#3498db' : '#e74c3c')
    : 'rgba(255,255,255,0.12)'};
  background: ${p => p.$selected
    ? (p.$choice === 'yes' ? 'rgba(52,152,219,0.15)' : 'rgba(231,76,60,0.15)')
    : 'rgba(255,255,255,0.04)'};
  border-radius: 12px;
  font-size: 18px;
  font-weight: 700;
  color: ${p => p.$choice === 'yes' ? '#5dade2' : '#ec7063'};
  cursor: pointer;
  transition: all 0.2s;
  &:hover {
    border-color: ${p => p.$choice === 'yes' ? '#3498db' : '#e74c3c'};
    background: ${p => p.$choice === 'yes' ? 'rgba(52,152,219,0.1)' : 'rgba(231,76,60,0.1)'};
  }
`;

const AmountInput = styled.input`
  width: 100%;
  padding: 14px 16px;
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 10px;
  font-size: 16px;
  background: rgba(255,255,255,0.06);
  color: #e8e8e8;
  box-sizing: border-box;
  &::placeholder { color: #666; }
  &:focus { outline: none; border-color: #667eea; background: rgba(102,126,234,0.08); }
`;

const SubmitBtn = styled.button`
  width: 100%;
  padding: 16px;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 700;
  color: white;
  cursor: pointer;
  margin-top: 12px;
  background: ${p => p.$choice === 'yes'
    ? 'linear-gradient(135deg, #2980b9, #3498db)'
    : p.$choice === 'no'
    ? 'linear-gradient(135deg, #c0392b, #e74c3c)'
    : 'rgba(255,255,255,0.1)'};
  &:disabled { opacity: 0.4; cursor: not-allowed; }
  &:hover:not(:disabled) { opacity: 0.9; }
`;

const PayoutInfo = styled.div`
  background: rgba(39,174,96,0.1);
  border: 1px solid rgba(39,174,96,0.2);
  padding: 14px 16px;
  border-radius: 10px;
  margin-top: 12px;
  display: flex;
  justify-content: space-between;
  font-size: 14px;
  color: #aaa;
  .payout { font-weight: 700; color: #2ecc71; font-size: 16px; }
`;

const Msg = styled.div`
  padding: 12px 16px;
  border-radius: 10px;
  font-size: 14px;
  margin-bottom: 16px;
  border-left: 4px solid;
  background: ${p => p.$type === 'error' ? 'rgba(231,76,60,0.1)' : 'rgba(39,174,96,0.1)'};
  color: ${p => p.$type === 'error' ? '#ec7063' : '#2ecc71'};
  border-color: ${p => p.$type === 'error' ? '#e74c3c' : '#27ae60'};
`;

const ResultBanner = styled.div`
  padding: 22px;
  border-radius: 14px;
  text-align: center;
  font-size: 22px;
  font-weight: 700;
  color: white;
  background: ${p => p.$r === 'yes'
    ? 'linear-gradient(135deg, #2980b9, #3498db)'
    : 'linear-gradient(135deg, #c0392b, #e74c3c)'};
  margin-bottom: 20px;
  animation: ${fadeIn} 0.4s ease;
`;

/* ── Confetti Logic ── */

function useConfetti(shouldFire) {
  const canvasRef = useRef(null);
  const firedRef = useRef(false);

  const fire = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const colors = ['#2ecc71','#3498db','#f1c40f','#e74c3c','#9b59b6','#1abc9c','#ff6b6b','#feca57','#a5b4fc'];
    const particles = [];

    for (let i = 0; i < 150; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height * -1,
        w: Math.random() * 10 + 4,
        h: Math.random() * 6 + 3,
        color: colors[Math.floor(Math.random() * colors.length)],
        vx: (Math.random() - 0.5) * 6,
        vy: Math.random() * 4 + 2,
        rot: Math.random() * 360,
        rv: (Math.random() - 0.5) * 12,
        opacity: 1,
      });
    }

    let frame = 0;
    const maxFrames = 180;

    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      frame++;

      for (const p of particles) {
        p.x += p.vx;
        p.vy += 0.08;
        p.y += p.vy;
        p.rot += p.rv;
        if (frame > maxFrames - 40) {
          p.opacity = Math.max(0, p.opacity - 0.025);
        }

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rot * Math.PI) / 180);
        ctx.globalAlpha = p.opacity;
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }

      if (frame < maxFrames) {
        requestAnimationFrame(draw);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }

    draw();
  }, []);

  useEffect(() => {
    if (shouldFire && !firedRef.current) {
      firedRef.current = true;
      // small delay for page to render first
      setTimeout(fire, 300);
    }
  }, [shouldFire, fire]);

  return canvasRef;
}

/* ── Component ── */

const PredictionDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();

  const [prediction, setPrediction] = useState(null);
  const [myBets, setMyBets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [choice, setChoice] = useState('');
  const [amount, setAmount] = useState('');
  const [betting, setBetting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const hasWon = myBets.some(b => b.status === 'won');
  const confettiRef = useConfetti(hasWon);

  useEffect(() => { loadData(); }, [id]); // eslint-disable-line

  // 마감 시간 도달 시 자동 새로고침
  useEffect(() => {
    if (!prediction || prediction.status !== 'open' || !prediction.deadline) return;
    const msLeft = new Date(prediction.deadline) - Date.now();
    if (msLeft <= 0) { loadData(); return; }
    const timer = setTimeout(() => loadData(), msLeft + 500);
    return () => clearTimeout(timer);
  }, [prediction]); // eslint-disable-line

  const loadData = async () => {
    try {
      setLoading(true);
      const [predRes, betRes] = await Promise.all([
        predictionService.getPrediction(id),
        predictionService.getMyBetOn(id).catch(() => ({ data: [] })),
      ]);
      setPrediction(predRes.data);
      setMyBets(betRes.data || []);
    } catch (err) {
      setError('예측을 불러올 수 없습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleBet = async (e) => {
    e.preventDefault();
    if (!choice || !amount) return;
    setBetting(true);
    setError('');
    setSuccess('');
    try {
      const res = await predictionService.placeBet(id, choice, parseInt(amount));
      setSuccess(`베팅 완료! 예상 당첨금: ${formatNumber(res.data.potential_payout)}원`);
      setAmount('');
      setChoice('');
      if (res.data.remaining_balance !== undefined && user) {
        updateUser({ ...user, balance: res.data.remaining_balance });
      } else {
        try {
          const { authService } = await import('../services/authService');
          const me = await authService.getCurrentUser();
          if (me.data) updateUser({ ...user, ...me.data });
        } catch {}
      }
      await loadData();
    } catch (err) {
      setError(err.error || '베팅에 실패했습니다.');
    } finally {
      setBetting(false);
    }
  };

  if (loading) return (
    <Container><Inner><p style={{ color: '#888' }}>로딩 중...</p></Inner></Container>
  );

  if (!prediction) return (
    <Container>
      <Inner>
        <BackBtn onClick={() => navigate('/predictions')}>← 돌아가기</BackBtn>
        <Msg $type="error">{error || '예측을 찾을 수 없습니다.'}</Msg>
      </Inner>
    </Container>
  );

  const p = prediction;
  const total = p.total_yes_amount + p.total_no_amount;
  const yp = total === 0 ? 50 : Math.round((p.total_yes_amount / total) * 100);
  const isOpen = p.status === 'open' && (!p.deadline || new Date(p.deadline) > new Date());

  const calcPayout = () => {
    if (!amount || !choice) return 0;
    const bet = parseInt(amount);
    const totalYes = p.total_yes_amount;
    const totalNo = p.total_no_amount;
    if (choice === 'yes') {
      const newYes = totalYes + bet;
      const newTotal = newYes + totalNo;
      return newYes > 0 ? Math.round(bet * newTotal / newYes) : bet;
    } else {
      const newNo = totalNo + bet;
      const newTotal = totalYes + newNo;
      return newNo > 0 ? Math.round(bet * newTotal / newNo) : bet;
    }
  };
  const potentialPayout = calcPayout();

  // 내 베팅 합산
  const myTotalAmount = myBets.reduce((s, b) => s + b.amount, 0);
  const myTotalPayout = myBets.reduce((s, b) => s + (b.payout || 0), 0);
  const myTotalProfit = myBets.reduce((s, b) => s + (b.profit || 0), 0);
  const hasSettled = myBets.some(b => b.status === 'won' || b.status === 'lost');
  const hasLost = myBets.some(b => b.status === 'lost');

  return (
    <Container>
      {hasWon && <ConfettiCanvas ref={confettiRef} />}
      <Inner>
        <BackBtn onClick={() => navigate('/predictions')}>← 예측 마켓으로</BackBtn>

        {p.status === 'settled' && p.result && (
          <ResultBanner $r={p.result}>
            결과: {p.result === 'yes' ? 'YES' : 'NO'}
          </ResultBanner>
        )}

        {/* 내 베팅 결과 */}
        {myBets.length > 0 && (
          <MyBetCard $won={hasWon} $lost={hasLost && !hasWon}>
            <MyBetTitle $color={hasWon ? '#2ecc71' : hasLost ? '#ec7063' : '#f39c12'}>
              {hasWon ? '축하합니다! 당첨되었습니다!' : hasLost ? '아쉽지만 미당첨입니다' : '베팅 진행중'}
            </MyBetTitle>
            {myBets.length > 1 && (
              <MyBetSummary>
                <MyBetSummaryItem>
                  총 베팅<span>{myBets.length}회</span>
                </MyBetSummaryItem>
                <MyBetSummaryItem $color="#e8e8e8">
                  총 금액<span>{formatNumber(myTotalAmount)}원</span>
                </MyBetSummaryItem>
                {hasSettled && (
                  <MyBetSummaryItem $color={myTotalPayout > 0 ? '#2ecc71' : '#ec7063'}>
                    총 당첨금<span>{formatNumber(myTotalPayout)}원</span>
                  </MyBetSummaryItem>
                )}
              </MyBetSummary>
            )}
            <MyBetList>
              {myBets.map((bet) => (
                <MyBetRow key={bet.bet_id}>
                  <MyBetChoice $yes={bet.choice === 'yes'}>
                    {bet.choice === 'yes' ? 'YES' : 'NO'}
                  </MyBetChoice>
                  <MyBetAmount>{formatNumber(bet.amount)}원</MyBetAmount>
                  <MyBetStatus $s={bet.status}>
                    {bet.status === 'won' ? '당첨' : bet.status === 'lost' ? '미당첨' : '대기중'}
                  </MyBetStatus>
                  <MyBetPayout $color={
                    bet.status === 'won' ? '#2ecc71' :
                    bet.status === 'lost' ? '#ec7063' : '#888'
                  }>
                    {bet.status === 'won'
                      ? `+${formatNumber(bet.payout)}원`
                      : bet.status === 'lost'
                      ? '0원'
                      : `~${formatNumber(bet.potential_payout)}원`}
                  </MyBetPayout>
                </MyBetRow>
              ))}
            </MyBetList>
            {hasSettled && (
              <ProfitValue $positive={myTotalProfit >= 0}>
                {myTotalProfit >= 0 ? '+' : ''}{formatNumber(myTotalProfit)}원
              </ProfitValue>
            )}
          </MyBetCard>
        )}

        <Card>
          <InfoRow>
            <InfoChip
              $bg={isOpen ? 'rgba(39,174,96,0.12)' : 'rgba(243,156,18,0.12)'}
              $color={isOpen ? '#2ecc71' : '#f39c12'}
              $border={isOpen ? 'rgba(39,174,96,0.25)' : 'rgba(243,156,18,0.25)'}>
              {isOpen ? '진행중' : p.status === 'closed' ? '베팅 마감' : '정산완료'}
            </InfoChip>
            <InfoChip>YES x{p.yes_odds}</InfoChip>
            <InfoChip
              $bg="rgba(231,76,60,0.12)"
              $color="#ec7063"
              $border="rgba(231,76,60,0.25)">
              NO x{p.no_odds}
            </InfoChip>
            <InfoChip
              $bg="rgba(255,255,255,0.04)"
              $color="#888"
              $border="rgba(255,255,255,0.08)">
              마감: {p.deadline ? new Date(p.deadline).toLocaleString('ko-KR') : '-'}
            </InfoChip>
          </InfoRow>

          <Title>{p.title}</Title>
          {p.description && <Desc>{p.description}</Desc>}

          <BetBar>
            <BetBarYes $w={yp} />
            <BetBarNo $w={100 - yp} />
          </BetBar>

          <Stats>
            <StatBox
              $bg="rgba(52,152,219,0.08)"
              $border="rgba(52,152,219,0.15)"
              $color="#5dade2">
              <div className="label">YES</div>
              <div className="value">{yp}%</div>
              <div className="sub">{formatNumber(p.total_yes_amount)}원 ({p.total_yes_bettors}명)</div>
            </StatBox>
            <StatBox
              $bg="rgba(231,76,60,0.08)"
              $border="rgba(231,76,60,0.15)"
              $color="#ec7063">
              <div className="label">NO</div>
              <div className="value">{100 - yp}%</div>
              <div className="sub">{formatNumber(p.total_no_amount)}원 ({p.total_no_bettors}명)</div>
            </StatBox>
          </Stats>

          {isOpen && (
            <BetSection>
              <h3 style={{ margin: '0 0 16px', color: '#ddd' }}>베팅하기</h3>

              {error && <Msg $type="error">{error}</Msg>}
              {success && <Msg $type="success">{success}</Msg>}

              <form onSubmit={handleBet}>
                <BetBtns>
                  <ChoiceBtn type="button" $choice="yes" $selected={choice === 'yes'}
                    onClick={() => setChoice('yes')}>
                    YES
                  </ChoiceBtn>
                  <ChoiceBtn type="button" $choice="no" $selected={choice === 'no'}
                    onClick={() => setChoice('no')}>
                    NO
                  </ChoiceBtn>
                </BetBtns>

                <AmountInput
                  type="number"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder="베팅 금액 (최소 1,000원)"
                  min="1000"
                  step="1000"
                />

                {amount && parseInt(amount) > 0 && (
                  <PayoutInfo>
                    <span>예상 당첨금:</span>
                    <span className="payout">{formatNumber(Math.round(potentialPayout))}원</span>
                  </PayoutInfo>
                )}

                <SubmitBtn type="submit" $choice={choice}
                  disabled={!choice || !amount || betting}>
                  {betting ? '처리 중...' : choice ? `${choice === 'yes' ? 'YES' : 'NO'}에 베팅하기` : '선택해주세요'}
                </SubmitBtn>
              </form>
            </BetSection>
          )}
        </Card>
      </Inner>
    </Container>
  );
};

export default PredictionDetail;
