import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { predictionService } from '../services/predictionService';
import { formatNumber } from '../utils/helpers';
import styled from 'styled-components';

const Container = styled.div`
  min-height: 100vh;
  background: #f8f9fa;
  padding: 20px;
  max-width: 1000px;
  margin: 0 auto;
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
  background: #6c757d;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  &:hover { background: #5a6268; }
`;

const CreateBtn = styled.button`
  background: #667eea;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  &:hover { background: #5a6fd8; }
`;

const Card = styled.div`
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.05);
  padding: 24px;
  margin-bottom: 16px;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const FormGroup = styled.div`
  label {
    display: block;
    font-weight: 600;
    color: #333;
    margin-bottom: 6px;
    font-size: 14px;
  }
  input, textarea, select {
    width: 100%;
    padding: 12px;
    border: 2px solid #e1e5e9;
    border-radius: 8px;
    font-size: 15px;
    box-sizing: border-box;
    &:focus { outline: none; border-color: #667eea; }
  }
  textarea { resize: vertical; min-height: 80px; }
`;

const FormRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
`;

const SubmitBtn = styled.button`
  padding: 14px;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 700;
  color: white;
  background: #667eea;
  cursor: pointer;
  &:disabled { opacity: 0.5; cursor: not-allowed; }
  &:hover:not(:disabled) { background: #5a6fd8; }
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

const PredictionItem = styled.div`
  background: white;
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
  padding: 20px;
  margin-bottom: 12px;
  border-left: 4px solid ${p =>
    p.$status === 'open' ? '#27ae60' :
    p.$status === 'closed' ? '#f39c12' : '#95a5a6'};
`;

const ItemHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 12px;
  .title { font-size: 16px; font-weight: 600; color: #333; flex: 1; }
`;

const Badge = styled.span`
  display: inline-block;
  padding: 3px 10px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  color: white;
  background: ${p => p.$bg || '#999'};
`;

const ItemStats = styled.div`
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  font-size: 13px;
  color: #666;
  margin-bottom: 12px;
  span { white-space: nowrap; }
  .yes { color: #3498db; font-weight: 600; }
  .no { color: #e74c3c; font-weight: 600; }
`;

const ActionBtns = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
`;

const ActionBtn = styled.button`
  padding: 6px 14px;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  color: white;
  background: ${p => p.$bg || '#667eea'};
  &:hover { opacity: 0.85; }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

const SettleModal = styled.div`
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
`;

const ModalContent = styled.div`
  background: white;
  border-radius: 12px;
  padding: 30px;
  max-width: 400px;
  width: 90%;
  h3 { margin: 0 0 20px; color: #333; }
`;

const ModalBtns = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 16px;
`;

const ModalChoiceBtn = styled.button`
  padding: 16px;
  border: 3px solid ${p => p.$selected ? (p.$choice === 'yes' ? '#3498db' : '#e74c3c') : '#ddd'};
  background: ${p => p.$selected ? (p.$choice === 'yes' ? '#ebf5fb' : '#fdedec') : 'white'};
  border-radius: 10px;
  font-size: 18px;
  font-weight: 700;
  color: ${p => p.$choice === 'yes' ? '#3498db' : '#e74c3c'};
  cursor: pointer;
`;

const Empty = styled.div`
  text-align: center;
  padding: 60px;
  color: #666;
  h3 { color: #333; }
`;

const AdminPredictions = () => {
  const navigate = useNavigate();
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // 생성 폼
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState('');
  const [odds, setOdds] = useState('1.8');

  // 정산 모달
  const [settleTarget, setSettleTarget] = useState(null);
  const [settleResult, setSettleResult] = useState('');

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
        deadline,
        odds: parseFloat(odds) || 1.8,
      });
      setSuccess('예측이 생성되었습니다.');
      setTitle('');
      setDescription('');
      setDeadline('');
      setOdds('1.8');
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
    } catch (err) {
      setError(err.error || '마감에 실패했습니다.');
    }
  };

  const handleSettle = async () => {
    if (!settleTarget || !settleResult) return;
    try {
      await predictionService.settlePrediction(settleTarget.id, settleResult);
      setSuccess('정산이 완료되었습니다.');
      setSettleTarget(null);
      setSettleResult('');
      await loadPredictions();
    } catch (err) {
      setError(err.error || '정산에 실패했습니다.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('정말 삭제하시겠습니까? 베팅이 있는 경우 삭제할 수 없습니다.')) return;
    try {
      await predictionService.deletePrediction(id);
      setSuccess('예측이 삭제되었습니다.');
      await loadPredictions();
    } catch (err) {
      setError(err.error || '삭제에 실패했습니다.');
    }
  };

  const getStatusLabel = (s) => ({ open: '진행중', closed: '마감', settled: '정산완료' }[s] || s);
  const getStatusColor = (s) => ({ open: '#27ae60', closed: '#f39c12', settled: '#95a5a6' }[s] || '#999');

  return (
    <Container>
      <Header>
        <h1>예측 관리</h1>
        <div style={{ display: 'flex', gap: '8px' }}>
          <BackBtn onClick={() => navigate('/predictions')}>예측 마켓으로</BackBtn>
          <CreateBtn onClick={() => setShowForm(!showForm)}>
            {showForm ? '취소' : '+ 새 예측 생성'}
          </CreateBtn>
        </div>
      </Header>

      {error && <Msg $type="error">{error}</Msg>}
      {success && <Msg $type="success">{success}</Msg>}

      {showForm && (
        <Card>
          <h3 style={{ margin: '0 0 20px', color: '#333' }}>새 예측 생성</h3>
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
            <FormRow>
              <FormGroup>
                <label>마감일시 *</label>
                <input type="datetime-local" value={deadline}
                  onChange={e => setDeadline(e.target.value)} required />
              </FormGroup>
              <FormGroup>
                <label>배당률</label>
                <input type="number" value={odds} onChange={e => setOdds(e.target.value)}
                  min="1.1" max="10" step="0.1" />
              </FormGroup>
            </FormRow>
            <SubmitBtn type="submit" disabled={submitting}>
              {submitting ? '생성 중...' : '예측 생성'}
            </SubmitBtn>
          </Form>
        </Card>
      )}

      {loading ? (
        <Empty><p>로딩 중...</p></Empty>
      ) : predictions.length === 0 ? (
        <Empty>
          <h3>예측이 없습니다</h3>
          <p>새 예측을 생성해보세요.</p>
        </Empty>
      ) : (
        predictions.map(p => (
          <PredictionItem key={p.id} $status={p.status}>
            <ItemHeader>
              <div className="title">{p.title}</div>
              <Badge $bg={getStatusColor(p.status)}>{getStatusLabel(p.status)}</Badge>
              {p.result && (
                <Badge $bg={p.result === 'yes' ? '#3498db' : '#e74c3c'}>
                  결과: {p.result === 'yes' ? 'YES' : 'NO'}
                </Badge>
              )}
            </ItemHeader>
            <ItemStats>
              <span className="yes">YES: {formatNumber(p.total_yes_amount)}원 ({p.total_yes_bettors}명)</span>
              <span className="no">NO: {formatNumber(p.total_no_amount)}원 ({p.total_no_bettors}명)</span>
              <span>배당 x{p.odds}</span>
              <span>마감: {p.deadline ? new Date(p.deadline).toLocaleString('ko-KR') : '-'}</span>
            </ItemStats>
            <ActionBtns>
              {p.status === 'open' && (
                <ActionBtn $bg="#f39c12" onClick={() => handleClose(p.id)}>
                  베팅 마감
                </ActionBtn>
              )}
              {p.status === 'closed' && (
                <ActionBtn $bg="#27ae60" onClick={() => { setSettleTarget(p); setSettleResult(''); }}>
                  정산하기
                </ActionBtn>
              )}
              {p.status === 'open' && p.total_yes_bettors === 0 && p.total_no_bettors === 0 && (
                <ActionBtn $bg="#e74c3c" onClick={() => handleDelete(p.id)}>
                  삭제
                </ActionBtn>
              )}
            </ActionBtns>
          </PredictionItem>
        ))
      )}

      {settleTarget && (
        <SettleModal onClick={() => setSettleTarget(null)}>
          <ModalContent onClick={e => e.stopPropagation()}>
            <h3>정산: {settleTarget.title}</h3>
            <p style={{ color: '#666', marginBottom: 16 }}>결과를 선택하세요. 해당 결과에 베팅한 사용자에게 당첨금이 지급됩니다.</p>
            <ModalBtns>
              <ModalChoiceBtn $choice="yes" $selected={settleResult === 'yes'}
                onClick={() => setSettleResult('yes')}>YES</ModalChoiceBtn>
              <ModalChoiceBtn $choice="no" $selected={settleResult === 'no'}
                onClick={() => setSettleResult('no')}>NO</ModalChoiceBtn>
            </ModalBtns>
            <div style={{ display: 'flex', gap: 8 }}>
              <ActionBtn $bg="#95a5a6" onClick={() => setSettleTarget(null)}
                style={{ flex: 1, padding: '12px' }}>취소</ActionBtn>
              <ActionBtn $bg="#27ae60" onClick={handleSettle} disabled={!settleResult}
                style={{ flex: 1, padding: '12px' }}>정산 확정</ActionBtn>
            </div>
          </ModalContent>
        </SettleModal>
      )}
    </Container>
  );
};

export default AdminPredictions;
