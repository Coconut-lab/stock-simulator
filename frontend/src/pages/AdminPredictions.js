import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { predictionService } from '../services/predictionService';
import { formatNumber } from '../utils/helpers';
import styled, { keyframes } from 'styled-components';

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(-8px); }
  to { opacity: 1; transform: translateY(0); }
`;

const Container = styled.div`
  min-height: 100vh;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
  padding: 24px;
`;

const Inner = styled.div`
  max-width: 960px;
  margin: 0 auto;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 28px;
  h1 {
    margin: 0;
    color: #fff;
    font-size: 26px;
    letter-spacing: -0.5px;
    span { color: #e94560; }
  }
`;

const HeaderBtns = styled.div`
  display: flex;
  gap: 10px;
`;

const Btn = styled.button`
  padding: 10px 20px;
  border: none;
  border-radius: 10px;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
  &:hover { transform: translateY(-1px); }
  &:active { transform: translateY(0); }
`;

const BackBtn = styled(Btn)`
  background: rgba(255,255,255,0.1);
  color: #ccc;
  border: 1px solid rgba(255,255,255,0.15);
  &:hover { background: rgba(255,255,255,0.18); color: #fff; }
`;

const CreateBtn = styled(Btn)`
  background: linear-gradient(135deg, #e94560, #c23152);
  color: white;
  box-shadow: 0 4px 15px rgba(233,69,96,0.3);
  &:hover { box-shadow: 0 6px 20px rgba(233,69,96,0.45); }
`;

const Msg = styled.div`
  padding: 14px 18px;
  border-radius: 10px;
  font-size: 14px;
  margin-bottom: 16px;
  animation: ${fadeIn} 0.3s ease;
  background: ${p => p.$type === 'error'
    ? 'rgba(231,76,60,0.15)' : 'rgba(39,174,96,0.15)'};
  color: ${p => p.$type === 'error' ? '#ff6b6b' : '#6bcb77'};
  border: 1px solid ${p => p.$type === 'error'
    ? 'rgba(231,76,60,0.3)' : 'rgba(39,174,96,0.3)'};
`;

const FormCard = styled.div`
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 16px;
  padding: 28px;
  margin-bottom: 24px;
  backdrop-filter: blur(10px);
  animation: ${fadeIn} 0.3s ease;
  h3 { margin: 0 0 24px; color: #fff; font-size: 18px; }
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 18px;
`;

const FormGroup = styled.div`
  label {
    display: block;
    font-weight: 600;
    color: #adb5c7;
    margin-bottom: 8px;
    font-size: 13px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  input, textarea {
    width: 100%;
    padding: 14px 16px;
    border: 1px solid rgba(255,255,255,0.12);
    border-radius: 10px;
    font-size: 15px;
    box-sizing: border-box;
    background: rgba(255,255,255,0.06);
    color: #fff;
    transition: border-color 0.2s;
    &::placeholder { color: rgba(255,255,255,0.3); }
    &:focus { outline: none; border-color: #e94560; background: rgba(255,255,255,0.09); }
  }
  textarea { resize: vertical; min-height: 80px; }
`;

const InfoBanner = styled.div`
  padding: 12px 16px;
  background: rgba(107,203,119,0.1);
  border: 1px solid rgba(107,203,119,0.2);
  border-radius: 10px;
  font-size: 13px;
  color: #6bcb77;
`;

const SubmitBtn = styled(Btn)`
  width: 100%;
  padding: 16px;
  font-size: 16px;
  background: linear-gradient(135deg, #e94560, #c23152);
  color: white;
  &:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }
`;

/* ── 예측 카드 ── */

const PredictionCard = styled.div`
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 14px;
  padding: 24px;
  margin-bottom: 14px;
  transition: all 0.2s;
  &:hover { background: rgba(255,255,255,0.08); border-color: rgba(255,255,255,0.15); }
`;

const CardTop = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 16px;
`;

const CardTitle = styled.div`
  font-size: 17px;
  font-weight: 600;
  color: #f0f0f0;
  flex: 1;
  line-height: 1.4;
`;

const StatusBadge = styled.span`
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
  background: ${p =>
    p.$s === 'open' ? 'rgba(39,174,96,0.2)' :
    p.$s === 'closed' ? 'rgba(243,156,18,0.2)' : 'rgba(149,165,166,0.2)'};
  color: ${p =>
    p.$s === 'open' ? '#6bcb77' :
    p.$s === 'closed' ? '#f7c948' : '#adb5c7'};
  border: 1px solid ${p =>
    p.$s === 'open' ? 'rgba(39,174,96,0.3)' :
    p.$s === 'closed' ? 'rgba(243,156,18,0.3)' : 'rgba(149,165,166,0.3)'};
`;

const ResultTag = styled.span`
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 700;
  margin-left: 8px;
  background: ${p => p.$r === 'yes' ? 'rgba(52,152,219,0.2)' : 'rgba(231,76,60,0.2)'};
  color: ${p => p.$r === 'yes' ? '#5dade2' : '#ff6b6b'};
  border: 1px solid ${p => p.$r === 'yes' ? 'rgba(52,152,219,0.3)' : 'rgba(231,76,60,0.3)'};
`;

const StatsRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 16px;
`;

const StatItem = styled.div`
  background: ${p => p.$side === 'yes' ? 'rgba(52,152,219,0.08)' : 'rgba(231,76,60,0.08)'};
  border: 1px solid ${p => p.$side === 'yes' ? 'rgba(52,152,219,0.15)' : 'rgba(231,76,60,0.15)'};
  border-radius: 10px;
  padding: 14px;
  text-align: center;
  .label { font-size: 12px; color: #999; margin-bottom: 4px; }
  .amount { font-size: 16px; font-weight: 700; color: ${p => p.$side === 'yes' ? '#5dade2' : '#ff6b6b'}; }
  .info { font-size: 12px; color: #777; margin-top: 4px; }
`;

const PoolBar = styled.div`
  display: flex;
  height: 6px;
  border-radius: 3px;
  overflow: hidden;
  background: rgba(255,255,255,0.06);
  margin-bottom: 16px;
`;

const PoolYes = styled.div`
  background: linear-gradient(90deg, #3498db, #5dade2);
  width: ${p => p.$w}%;
  transition: width 0.4s;
`;

const PoolNo = styled.div`
  background: linear-gradient(90deg, #e74c3c, #ff6b6b);
  width: ${p => p.$w}%;
  transition: width 0.4s;
`;

const MetaRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  color: #777;
  margin-bottom: 14px;
`;

const ActionBtns = styled.div`
  display: flex;
  gap: 8px;
  padding-top: 14px;
  border-top: 1px solid rgba(255,255,255,0.06);
`;

const ActionBtn = styled(Btn)`
  padding: 8px 18px;
  font-size: 13px;
  border-radius: 8px;
  background: ${p => {
    if (p.$variant === 'detail') return 'rgba(52,152,219,0.15)';
    if (p.$variant === 'deadline') return 'rgba(155,89,182,0.15)';
    if (p.$variant === 'close') return 'rgba(243,156,18,0.15)';
    if (p.$variant === 'settle') return 'rgba(39,174,96,0.15)';
    if (p.$variant === 'delete') return 'rgba(231,76,60,0.15)';
    return 'rgba(255,255,255,0.1)';
  }};
  color: ${p => {
    if (p.$variant === 'detail') return '#5dade2';
    if (p.$variant === 'deadline') return '#bb8fce';
    if (p.$variant === 'close') return '#f7c948';
    if (p.$variant === 'settle') return '#6bcb77';
    if (p.$variant === 'delete') return '#ff6b6b';
    return '#ccc';
  }};
  border: 1px solid ${p => {
    if (p.$variant === 'detail') return 'rgba(52,152,219,0.25)';
    if (p.$variant === 'deadline') return 'rgba(155,89,182,0.25)';
    if (p.$variant === 'close') return 'rgba(243,156,18,0.25)';
    if (p.$variant === 'settle') return 'rgba(39,174,96,0.25)';
    if (p.$variant === 'delete') return 'rgba(231,76,60,0.25)';
    return 'rgba(255,255,255,0.1)';
  }};
  &:hover { opacity: 0.85; }
`;

/* ── 정산 모달 ── */

const ModalOverlay = styled.div`
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.7);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  animation: ${fadeIn} 0.2s ease;
`;

const ModalBox = styled.div`
  background: #1e2a3a;
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 16px;
  padding: 32px;
  max-width: 420px;
  width: 90%;
  h3 { margin: 0 0 8px; color: #fff; font-size: 18px; }
  p { color: #999; font-size: 14px; margin: 0 0 24px; line-height: 1.5; }
`;

const ModalChoices = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 20px;
`;

const ModalChoice = styled.button`
  padding: 20px;
  border: 2px solid ${p => p.$selected
    ? (p.$c === 'yes' ? '#3498db' : '#e74c3c')
    : 'rgba(255,255,255,0.1)'};
  background: ${p => p.$selected
    ? (p.$c === 'yes' ? 'rgba(52,152,219,0.15)' : 'rgba(231,76,60,0.15)')
    : 'rgba(255,255,255,0.03)'};
  border-radius: 12px;
  font-size: 20px;
  font-weight: 700;
  color: ${p => p.$c === 'yes' ? '#5dade2' : '#ff6b6b'};
  cursor: pointer;
  transition: all 0.2s;
  &:hover { background: ${p => p.$c === 'yes' ? 'rgba(52,152,219,0.1)' : 'rgba(231,76,60,0.1)'}; }
`;

const ModalActions = styled.div`
  display: flex;
  gap: 10px;
`;

const ModalBtn = styled(Btn)`
  flex: 1;
  padding: 14px;
  border-radius: 10px;
`;

const CancelBtn = styled(ModalBtn)`
  background: rgba(255,255,255,0.08);
  color: #aaa;
  border: 1px solid rgba(255,255,255,0.1);
`;

const ConfirmBtn = styled(ModalBtn)`
  background: linear-gradient(135deg, #27ae60, #219a52);
  color: white;
  &:disabled { opacity: 0.3; cursor: not-allowed; transform: none; }
`;

const DetailModalBox = styled(ModalBox)`
  max-width: 640px;
`;

const BetTable = styled.div`
  max-height: 400px;
  overflow-y: auto;
  margin-bottom: 20px;
  &::-webkit-scrollbar { width: 6px; }
  &::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 3px; }
`;

const BetRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border-bottom: 1px solid rgba(255,255,255,0.06);
  &:last-child { border-bottom: none; }
  &:hover { background: rgba(255,255,255,0.03); }
`;

const BetUser = styled.div`
  flex: 1;
  min-width: 0;
  .name { font-size: 14px; font-weight: 600; color: #f0f0f0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .id { font-size: 11px; color: #777; }
`;

const BetChoice = styled.span`
  padding: 3px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 700;
  background: ${p => p.$c === 'yes' ? 'rgba(52,152,219,0.15)' : 'rgba(231,76,60,0.15)'};
  color: ${p => p.$c === 'yes' ? '#5dade2' : '#ff6b6b'};
  border: 1px solid ${p => p.$c === 'yes' ? 'rgba(52,152,219,0.3)' : 'rgba(231,76,60,0.3)'};
`;

const BetAmount = styled.div`
  text-align: right;
  min-width: 90px;
  .amount { font-size: 14px; font-weight: 600; color: #f0f0f0; }
  .time { font-size: 11px; color: #777; }
`;

const BetResultTag = styled.span`
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 600;
  background: ${p => p.$s === 'won' ? 'rgba(39,174,96,0.15)' : p.$s === 'lost' ? 'rgba(231,76,60,0.15)' : 'rgba(255,255,255,0.06)'};
  color: ${p => p.$s === 'won' ? '#6bcb77' : p.$s === 'lost' ? '#ff6b6b' : '#999'};
`;

const BetSummary = styled.div`
  display: flex;
  gap: 16px;
  padding: 14px;
  background: rgba(255,255,255,0.04);
  border-radius: 10px;
  margin-bottom: 16px;
  font-size: 13px;
  color: #adb5c7;
  span { font-weight: 700; color: #f0f0f0; }
`;

const Empty = styled.div`
  text-align: center;
  padding: 80px 20px;
  color: #777;
  h3 { color: #ccc; font-size: 18px; margin-bottom: 8px; }
`;

const AdminPredictions = () => {
  const navigate = useNavigate();
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState('');

  const [settleTarget, setSettleTarget] = useState(null);
  const [settleResult, setSettleResult] = useState('');

  const [deadlineTarget, setDeadlineTarget] = useState(null);
  const [newDeadline, setNewDeadline] = useState('');

  const [detailTarget, setDetailTarget] = useState(null);
  const [detailBets, setDetailBets] = useState([]);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => { loadPredictions(); }, []);

  const loadPredictions = async () => {
    try {
      setLoading(true);
      const res = await predictionService.getAdminPredictions();
      setPredictions(res.data || []);
    } catch (err) {
      setError('목록을 불러올 수 없습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!title.trim() || !deadline) return;
    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      await predictionService.createPrediction({
        title: title.trim(),
        description: description.trim(),
        deadline: new Date(deadline).toISOString(),
      });
      setSuccess('예측이 생성되었습니다.');
      setTitle(''); setDescription(''); setDeadline('');
      setShowForm(false);
      await loadPredictions();
    } catch (err) {
      setError(err.error || '생성에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = async (id) => {
    if (!window.confirm('이 예측의 베팅을 마감하시겠습니까?')) return;
    try {
      await predictionService.closePrediction(id);
      setSuccess('베팅이 마감되었습니다.');
      await loadPredictions();
    } catch (err) { setError(err.error || '마감에 실패했습니다.'); }
  };

  const handleSettle = async () => {
    if (!settleTarget || !settleResult) return;
    try {
      await predictionService.settlePrediction(settleTarget.id, settleResult);
      setSuccess('정산이 완료되었습니다.');
      setSettleTarget(null); setSettleResult('');
      await loadPredictions();
    } catch (err) { setError(err.error || '정산에 실패했습니다.'); }
  };

  const openDetail = async (p) => {
    setDetailTarget(p);
    setDetailLoading(true);
    try {
      const res = await predictionService.getAdminBets(p.id);
      setDetailBets(res.data || []);
    } catch (err) {
      setError(err.error || '베팅 내역 조회에 실패했습니다.');
      setDetailTarget(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const openDeadlineModal = (p) => {
    setDeadlineTarget(p);
    // 기존 deadline을 datetime-local 형식으로 변환
    if (p.deadline) {
      const d = new Date(p.deadline);
      const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
      setNewDeadline(local);
    } else {
      setNewDeadline('');
    }
  };

  const handleUpdateDeadline = async () => {
    if (!deadlineTarget || !newDeadline) return;
    try {
      await predictionService.updateDeadline(deadlineTarget.id, new Date(newDeadline).toISOString());
      setSuccess('마감일시가 변경되었습니다.');
      setDeadlineTarget(null);
      setNewDeadline('');
      await loadPredictions();
    } catch (err) {
      setError(err.error || '마감일시 변경에 실패했습니다.');
    }
  };

  const handleDelete = async (id, hasBets) => {
    const msg = hasBets
      ? '베팅한 유저에게 전액 환불 후 삭제됩니다. 정말 삭제하시겠습니까?'
      : '정말 삭제하시겠습니까?';
    if (!window.confirm(msg)) return;
    try {
      const res = await predictionService.deletePrediction(id);
      setSuccess(res.message || '예측이 삭제되었습니다.');
      await loadPredictions();
    } catch (err) { setError(err.error || '삭제에 실패했습니다.'); }
  };

  const getStatusLabel = (s) => ({ open: '진행중', closed: '마감', settled: '정산완료' }[s] || s);

  const getYesPercent = (p) => {
    const total = p.total_yes_amount + p.total_no_amount;
    return total === 0 ? 50 : Math.round((p.total_yes_amount / total) * 100);
  };

  return (
    <Container>
      <Inner>
        <Header>
          <h1><span>ADMIN</span> 예측 관리</h1>
          <HeaderBtns>
            <BackBtn onClick={() => navigate('/predictions')}>예측 마켓</BackBtn>
            <CreateBtn onClick={() => setShowForm(!showForm)}>
              {showForm ? '취소' : '+ 새 예측'}
            </CreateBtn>
          </HeaderBtns>
        </Header>

        {error && <Msg $type="error">{error}</Msg>}
        {success && <Msg $type="success">{success}</Msg>}

        {showForm && (
          <FormCard>
            <h3>새 예측 생성</h3>
            <Form onSubmit={handleCreate}>
              <FormGroup>
                <label>제목 *</label>
                <input value={title} onChange={e => setTitle(e.target.value)}
                  placeholder="예: 삼성전자 내일 종가 7만원 돌파?" required />
              </FormGroup>
              <FormGroup>
                <label>설명</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)}
                  placeholder="예측에 대한 상세 설명 (선택사항)" />
              </FormGroup>
              <FormGroup>
                <label>마감일시 *</label>
                <input type="datetime-local" value={deadline}
                  onChange={e => setDeadline(e.target.value)} required />
              </FormGroup>
              <InfoBanner>
                배당률은 YES/NO 참여 금액 비율에 따라 자동 계산됩니다.
              </InfoBanner>
              <SubmitBtn type="submit" disabled={submitting}>
                {submitting ? '생성 중...' : '예측 생성'}
              </SubmitBtn>
            </Form>
          </FormCard>
        )}

        {loading ? (
          <Empty><p style={{ color: '#999' }}>로딩 중...</p></Empty>
        ) : predictions.length === 0 ? (
          <Empty>
            <h3>예측이 없습니다</h3>
            <p>새 예측을 생성해보세요.</p>
          </Empty>
        ) : (
          predictions.map(p => {
            const yp = getYesPercent(p);
            const totalPool = p.total_yes_amount + p.total_no_amount;
            return (
              <PredictionCard key={p.id}>
                <CardTop>
                  <CardTitle>{p.title}</CardTitle>
                  <div>
                    <StatusBadge $s={p.status}>{getStatusLabel(p.status)}</StatusBadge>
                    {p.result && <ResultTag $r={p.result}>{p.result === 'yes' ? 'YES' : 'NO'}</ResultTag>}
                  </div>
                </CardTop>

                <PoolBar>
                  <PoolYes $w={yp} />
                  <PoolNo $w={100 - yp} />
                </PoolBar>

                <StatsRow>
                  <StatItem $side="yes">
                    <div className="label">YES (x{p.yes_odds})</div>
                    <div className="amount">{formatNumber(p.total_yes_amount)}원</div>
                    <div className="info">{p.total_yes_bettors}명 참여</div>
                  </StatItem>
                  <StatItem $side="no">
                    <div className="label">NO (x{p.no_odds})</div>
                    <div className="amount">{formatNumber(p.total_no_amount)}원</div>
                    <div className="info">{p.total_no_bettors}명 참여</div>
                  </StatItem>
                </StatsRow>

                <MetaRow>
                  <span>총 풀: {formatNumber(totalPool)}원</span>
                  <span>{p.deadline ? new Date(p.deadline).toLocaleString('ko-KR') : '-'}</span>
                </MetaRow>

                <ActionBtns>
                  <ActionBtn $variant="detail" onClick={() => openDetail(p)}>
                    자세히
                  </ActionBtn>
                  {p.status !== 'settled' && (
                    <ActionBtn $variant="deadline" onClick={() => openDeadlineModal(p)}>
                      기간 수정
                    </ActionBtn>
                  )}
                  {p.status === 'open' && (
                    <ActionBtn $variant="close" onClick={() => handleClose(p.id)}>
                      베팅 마감
                    </ActionBtn>
                  )}
                  {p.status === 'closed' && (
                    <ActionBtn $variant="settle" onClick={() => { setSettleTarget(p); setSettleResult(''); }}>
                      정산하기
                    </ActionBtn>
                  )}
                  {p.status !== 'settled' && (
                    <ActionBtn $variant="delete" onClick={() => handleDelete(p.id, totalPool > 0)}>
                      {totalPool > 0 ? '환불 삭제' : '삭제'}
                    </ActionBtn>
                  )}
                </ActionBtns>
              </PredictionCard>
            );
          })
        )}

        {settleTarget && (
          <ModalOverlay onClick={() => setSettleTarget(null)}>
            <ModalBox onClick={e => e.stopPropagation()}>
              <h3>{settleTarget.title}</h3>
              <p>결과를 선택하세요. 해당 결과에 베팅한 사용자에게 당첨금이 지급됩니다.</p>
              <ModalChoices>
                <ModalChoice $c="yes" $selected={settleResult === 'yes'}
                  onClick={() => setSettleResult('yes')}>YES</ModalChoice>
                <ModalChoice $c="no" $selected={settleResult === 'no'}
                  onClick={() => setSettleResult('no')}>NO</ModalChoice>
              </ModalChoices>
              <ModalActions>
                <CancelBtn onClick={() => setSettleTarget(null)}>취소</CancelBtn>
                <ConfirmBtn onClick={handleSettle} disabled={!settleResult}>정산 확정</ConfirmBtn>
              </ModalActions>
            </ModalBox>
          </ModalOverlay>
        )}

        {detailTarget && (
          <ModalOverlay onClick={() => setDetailTarget(null)}>
            <DetailModalBox onClick={e => e.stopPropagation()}>
              <h3>{detailTarget.title}</h3>
              <p>{detailTarget.description || '설명 없음'}</p>

              {detailLoading ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>로딩 중...</div>
              ) : detailBets.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#777' }}>베팅 내역이 없습니다.</div>
              ) : (
                <>
                  <BetSummary>
                    <div>총 <span>{detailBets.length}건</span></div>
                    <div>YES <span>{detailBets.filter(b => b.choice === 'yes').length}건</span> / <span>{formatNumber(detailBets.filter(b => b.choice === 'yes').reduce((s,b) => s + b.amount, 0))}원</span></div>
                    <div>NO <span>{detailBets.filter(b => b.choice === 'no').length}건</span> / <span>{formatNumber(detailBets.filter(b => b.choice === 'no').reduce((s,b) => s + b.amount, 0))}원</span></div>
                  </BetSummary>
                  <BetTable>
                    {detailBets.map(bet => (
                      <BetRow key={bet.bet_id}>
                        <BetUser>
                          <div className="name">{bet.name}</div>
                          <div className="id">@{bet.username}</div>
                        </BetUser>
                        <BetChoice $c={bet.choice}>{bet.choice === 'yes' ? 'YES' : 'NO'}</BetChoice>
                        <BetAmount>
                          <div className="amount">{formatNumber(bet.amount)}원</div>
                          <div className="time">{bet.created_at ? new Date(bet.created_at).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}</div>
                        </BetAmount>
                        {bet.status !== 'pending' && (
                          <BetResultTag $s={bet.status}>
                            {bet.status === 'won' ? `+${formatNumber(bet.payout - bet.amount)}` : bet.status === 'lost' ? '패배' : bet.status}
                          </BetResultTag>
                        )}
                      </BetRow>
                    ))}
                  </BetTable>
                </>
              )}

              <ModalActions>
                <CancelBtn onClick={() => setDetailTarget(null)} style={{ flex: 'none', padding: '12px 28px' }}>닫기</CancelBtn>
              </ModalActions>
            </DetailModalBox>
          </ModalOverlay>
        )}

        {deadlineTarget && (
          <ModalOverlay onClick={() => setDeadlineTarget(null)}>
            <ModalBox onClick={e => e.stopPropagation()}>
              <h3>기간 수정</h3>
              <p>{deadlineTarget.title}</p>
              <FormGroup>
                <label>새 마감일시</label>
                <input type="datetime-local" value={newDeadline}
                  onChange={e => setNewDeadline(e.target.value)} />
              </FormGroup>
              <ModalActions style={{ marginTop: '20px' }}>
                <CancelBtn onClick={() => setDeadlineTarget(null)}>취소</CancelBtn>
                <ConfirmBtn onClick={handleUpdateDeadline} disabled={!newDeadline}>변경 확정</ConfirmBtn>
              </ModalActions>
            </ModalBox>
          </ModalOverlay>
        )}
      </Inner>
    </Container>
  );
};

export default AdminPredictions;
