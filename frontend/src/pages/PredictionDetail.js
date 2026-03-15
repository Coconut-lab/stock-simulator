import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { predictionService } from '../services/predictionService';
import { formatNumber } from '../utils/helpers';
import styled from 'styled-components';

const Container = styled.div`
  min-height: 100vh;
  background: #f8f9fa;
  padding: 20px;
  max-width: 800px;
  margin: 0 auto;
`;

const BackBtn = styled.button`
  background: #6c757d;
  color: white;
  border: none;
  padding: 10px 16px;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  margin-bottom: 20px;
  &:hover { background: #5a6268; }
`;

const Card = styled.div`
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.05);
  padding: 30px;
  margin-bottom: 20px;
`;

const Title = styled.h1`
  font-size: 26px;
  color: #333;
  margin: 0 0 12px;
`;

const Desc = styled.p`
  color: #666;
  line-height: 1.6;
  margin: 0 0 20px;
`;

const InfoRow = styled.div`
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  margin-bottom: 20px;
`;

const InfoChip = styled.div`
  padding: 6px 14px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  background: ${p => p.$bg || '#f0f2ff'};
  color: ${p => p.$color || '#667eea'};
`;

const BetBar = styled.div`
  display: flex;
  height: 14px;
  border-radius: 7px;
  overflow: hidden;
  background: #eee;
  margin: 16px 0;
`;

const BetBarYes = styled.div`background: #3498db; width: ${p => p.$w}%; transition: width 0.3s;`;
const BetBarNo = styled.div`background: #e74c3c; width: ${p => p.$w}%; transition: width 0.3s;`;

const Stats = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 24px;
`;

const StatBox = styled.div`
  padding: 16px;
  border-radius: 8px;
  text-align: center;
  background: ${p => p.$bg || '#f8f9fa'};
  .label { font-size: 13px; color: #666; margin-bottom: 4px; }
  .value { font-size: 22px; font-weight: 700; color: ${p => p.$color || '#333'}; }
  .sub { font-size: 12px; color: #999; margin-top: 4px; }
`;

const BetSection = styled.div`
  border-top: 1px solid #eee;
  padding-top: 24px;
`;

const BetBtns = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 16px;
`;

const ChoiceBtn = styled.button`
  padding: 16px;
  border: 3px solid ${p => p.$selected ? (p.$choice === 'yes' ? '#3498db' : '#e74c3c') : '#ddd'};
  background: ${p => p.$selected ? (p.$choice === 'yes' ? '#ebf5fb' : '#fdedec') : 'white'};
  border-radius: 10px;
  font-size: 18px;
  font-weight: 700;
  color: ${p => p.$choice === 'yes' ? '#3498db' : '#e74c3c'};
  cursor: pointer;
  transition: all 0.2s;
  &:hover { border-color: ${p => p.$choice === 'yes' ? '#3498db' : '#e74c3c'}; }
`;

const AmountInput = styled.input`
  width: 100%;
  padding: 14px;
  border: 2px solid #e1e5e9;
  border-radius: 8px;
  font-size: 16px;
  &:focus { outline: none; border-color: #667eea; }
`;

const SubmitBtn = styled.button`
  width: 100%;
  padding: 16px;
  border: none;
  border-radius: 10px;
  font-size: 16px;
  font-weight: 700;
  color: white;
  cursor: pointer;
  margin-top: 12px;
  background: ${p => p.$choice === 'yes' ? '#3498db' : p.$choice === 'no' ? '#e74c3c' : '#aaa'};
  &:disabled { opacity: 0.5; cursor: not-allowed; }
  &:hover:not(:disabled) { opacity: 0.9; }
`;

const PayoutInfo = styled.div`
  background: #f8f9fa;
  padding: 14px;
  border-radius: 8px;
  margin-top: 12px;
  display: flex;
  justify-content: space-between;
  font-size: 14px;
  .payout { font-weight: 700; color: #27ae60; font-size: 16px; }
`;

const Msg = styled.div`
  padding: 12px;
  border-radius: 8px;
  font-size: 14px;
  margin-bottom: 16px;
  border-left: 4px solid;
  background: ${p => p.$type === 'error' ? '#ffeaea' : '#f0f9f0'};
  color: ${p => p.$type === 'error' ? '#e74c3c' : '#27ae60'};
  border-color: ${p => p.$type === 'error' ? '#e74c3c' : '#27ae60'};
`;

const ResultBanner = styled.div`
  padding: 20px;
  border-radius: 10px;
  text-align: center;
  font-size: 20px;
  font-weight: 700;
  color: white;
  background: ${p => p.$r === 'yes' ? '#3498db' : '#e74c3c'};
  margin-bottom: 20px;
`;

const PredictionDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();

  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [choice, setChoice] = useState('');
  const [amount, setAmount] = useState('');
  const [betting, setBetting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => { loadPrediction(); }, [id]); // eslint-disable-line

  const loadPrediction = async () => {
    try {
      setLoading(true);
      const res = await predictionService.getPrediction(id);
      setPrediction(res.data);
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
      }
      await loadPrediction();
    } catch (err) {
      setError(err.error || '베팅에 실패했습니다.');
    } finally {
      setBetting(false);
    }
  };

  if (loading) return <Container><p>로딩 중...</p></Container>;
  if (!prediction) return <Container><BackBtn onClick={() => navigate('/predictions')}>← 돌아가기</BackBtn><Msg $type="error">{error || '예측을 찾을 수 없습니다.'}</Msg></Container>;

  const p = prediction;
  const total = p.total_yes_amount + p.total_no_amount;
  const yp = total === 0 ? 50 : Math.round((p.total_yes_amount / total) * 100);
  const isOpen = p.status === 'open';
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

  return (
    <Container>
      <BackBtn onClick={() => navigate('/predictions')}>← 예측 마켓으로</BackBtn>

      {p.status === 'settled' && p.result && (
        <ResultBanner $r={p.result}>
          결과: {p.result === 'yes' ? 'YES' : 'NO'}
        </ResultBanner>
      )}

      <Card>
        <InfoRow>
          <InfoChip $bg={isOpen ? '#eafaf1' : '#fef9e7'} $color={isOpen ? '#27ae60' : '#f39c12'}>
            {isOpen ? '진행중' : p.status === 'closed' ? '베팅 마감' : '정산완료'}
          </InfoChip>
          <InfoChip>YES x{p.yes_odds}</InfoChip>
          <InfoChip $bg="#fdedec" $color="#e74c3c">NO x{p.no_odds}</InfoChip>
          <InfoChip $bg="#f5f5f5" $color="#666">
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
          <StatBox $bg="#ebf5fb" $color="#3498db">
            <div className="label">YES</div>
            <div className="value">{yp}%</div>
            <div className="sub">{formatNumber(p.total_yes_amount)}원 ({p.total_yes_bettors}명)</div>
          </StatBox>
          <StatBox $bg="#fdedec" $color="#e74c3c">
            <div className="label">NO</div>
            <div className="value">{100 - yp}%</div>
            <div className="sub">{formatNumber(p.total_no_amount)}원 ({p.total_no_bettors}명)</div>
          </StatBox>
        </Stats>

        {isOpen && (
          <BetSection>
            <h3 style={{ margin: '0 0 16px', color: '#333' }}>베팅하기</h3>

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
                max="500000"
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
    </Container>
  );
};

export default PredictionDetail;
