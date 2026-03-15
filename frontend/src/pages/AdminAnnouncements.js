import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminService } from '../services/adminService';
import styled, { keyframes } from 'styled-components';

const fadeIn = keyframes`from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}`;

const Container = styled.div`
  min-height: 100vh;
  background: linear-gradient(135deg, #1a1a2e, #16213e, #0f3460);
  padding: 24px;
  color: #e0e0e0;
`;

const Inner = styled.div`max-width: 800px; margin: 0 auto;`;

const Header = styled.div`
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 28px; flex-wrap: wrap; gap: 12px;
  h1 {
    margin: 0; font-size: 28px;
    background: linear-gradient(135deg, #ffc107, #ff9800);
    -webkit-background-clip: text; -webkit-text-fill-color: transparent;
  }
`;

const BackBtn = styled.button`
  background: rgba(102,126,234,0.2); color: #667eea;
  border: 1px solid rgba(102,126,234,0.3);
  padding: 10px 20px; border-radius: 10px; font-weight: 600;
  cursor: pointer; transition: all 0.2s;
  &:hover { background: rgba(102,126,234,0.35); }
`;

/* ── 작성 폼 ── */

const CreateCard = styled.div`
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,200,50,0.15);
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 28px;
  animation: ${fadeIn} 0.3s ease;
`;

const FormRow = styled.div`
  display: flex; gap: 12px; margin-bottom: 14px; align-items: flex-end;
  flex-wrap: wrap;
`;

const FormGroup = styled.div`
  flex: ${p => p.$flex || 1};
  min-width: ${p => p.$minW || '0'};
`;

const Label = styled.label`
  display: block; font-size: 12px; color: #999;
  margin-bottom: 6px; font-weight: 600;
`;

const TextArea = styled.textarea`
  width: 100%; padding: 12px 14px;
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 10px; font-size: 14px;
  background: rgba(255,255,255,0.06); color: #e8e8e8;
  box-sizing: border-box; resize: vertical; min-height: 60px;
  font-family: inherit;
  &::placeholder { color: #555; }
  &:focus { outline: none; border-color: #ffc107; background: rgba(255,200,50,0.05); }
`;

const Input = styled.input`
  width: 100%; padding: 12px 14px;
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 10px; font-size: 14px;
  background: rgba(255,255,255,0.06); color: #e8e8e8;
  box-sizing: border-box;
  &:focus { outline: none; border-color: #ffc107; }
`;

const Select = styled.select`
  width: 100%; padding: 12px 14px;
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 10px; font-size: 14px;
  background: rgba(255,255,255,0.06); color: #e8e8e8;
  box-sizing: border-box;
  &:focus { outline: none; border-color: #ffc107; }
  option { background: #1e1e36; color: #e8e8e8; }
`;

const SubmitBtn = styled.button`
  padding: 0 24px; height: 42px;
  border: none; border-radius: 10px;
  font-size: 14px; font-weight: 700; cursor: pointer;
  background: linear-gradient(135deg, #ffc107, #ff9800);
  color: #1a1a2e; transition: opacity 0.2s;
  white-space: nowrap;
  flex-shrink: 0;
  &:hover { opacity: 0.85; }
  &:disabled { opacity: 0.4; cursor: not-allowed; }
`;

const CharCount = styled.span`
  font-size: 11px;
  color: ${p => p.$over ? '#e74c3c' : '#666'};
  float: right;
  margin-top: 4px;
`;

/* ── 공지 목록 ── */

const SectionTitle = styled.h2`
  font-size: 18px; color: #ccc; margin: 0 0 16px;
  font-weight: 600;
`;

const ListCard = styled.div`
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 14px;
  overflow: hidden;
  animation: ${fadeIn} 0.4s ease;
`;

const ListItem = styled.div`
  display: flex; justify-content: space-between; align-items: center;
  padding: 16px 20px; gap: 12px;
  border-top: 1px solid rgba(255,255,255,0.04);
  &:first-child { border-top: none; }
  transition: background 0.2s;
  &:hover { background: rgba(255,255,255,0.03); }
`;

const ItemContent = styled.div`
  flex: 1; min-width: 0;
  .message {
    font-size: 14px; color: #e0e0e0; margin-bottom: 4px;
    word-break: break-word;
  }
  .meta {
    font-size: 11px; color: #666;
    display: flex; gap: 12px; flex-wrap: wrap;
  }
`;

const StatusBadge = styled.span`
  display: inline-block;
  padding: 3px 10px; border-radius: 6px;
  font-size: 11px; font-weight: 700;
  background: ${p => p.$active ? 'rgba(46,204,113,0.2)' : 'rgba(255,255,255,0.08)'};
  color: ${p => p.$active ? '#2ecc71' : '#666'};
  border: 1px solid ${p => p.$active ? 'rgba(46,204,113,0.3)' : 'rgba(255,255,255,0.06)'};
`;

const PriorityBadge = styled.span`
  display: inline-block;
  padding: 3px 8px; border-radius: 4px;
  font-size: 10px; font-weight: 700;
  background: ${p => p.$urgent ? 'rgba(231,76,60,0.2)' : 'rgba(102,126,234,0.15)'};
  color: ${p => p.$urgent ? '#e74c3c' : '#667eea'};
  margin-left: 6px;
`;

const ItemActions = styled.div`
  display: flex; gap: 6px; flex-shrink: 0;
`;

const SmallBtn = styled.button`
  padding: 6px 12px; border-radius: 8px;
  font-size: 12px; font-weight: 600;
  cursor: pointer; transition: all 0.2s;
  border: 1px solid ${p => p.$danger ? 'rgba(231,76,60,0.3)' : 'rgba(255,200,50,0.3)'};
  background: ${p => p.$danger ? 'rgba(231,76,60,0.15)' : 'rgba(255,200,50,0.1)'};
  color: ${p => p.$danger ? '#ec7063' : '#ffc107'};
  &:hover {
    background: ${p => p.$danger ? 'rgba(231,76,60,0.3)' : 'rgba(255,200,50,0.25)'};
  }
`;

const Empty = styled.div`
  text-align: center; padding: 50px; color: #666; font-size: 14px;
`;

const Msg = styled.div`
  padding: 10px 14px; border-radius: 8px; font-size: 13px;
  margin-bottom: 16px;
  background: ${p => p.$error ? 'rgba(231,76,60,0.12)' : 'rgba(46,204,113,0.12)'};
  color: ${p => p.$error ? '#ec7063' : '#2ecc71'};
  border: 1px solid ${p => p.$error ? 'rgba(231,76,60,0.25)' : 'rgba(46,204,113,0.25)'};
`;

/* ── Component ── */

const AdminAnnouncements = () => {
  const navigate = useNavigate();
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);

  // 작성 폼
  const [message, setMessage] = useState('');
  const [durationHours, setDurationHours] = useState(2);
  const [priority, setPriority] = useState('normal');
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    loadAnnouncements();
  }, []);

  const loadAnnouncements = async () => {
    try {
      setLoading(true);
      const res = await adminService.getAnnouncements();
      setAnnouncements(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!message.trim()) {
      setMsg({ error: true, text: '공지 내용을 입력해주세요.' });
      return;
    }
    if (message.length > 200) {
      setMsg({ error: true, text: '200자 이하로 작성해주세요.' });
      return;
    }
    setSubmitting(true);
    setMsg(null);
    try {
      await adminService.createAnnouncement(message.trim(), durationHours, priority);
      setMsg({ error: false, text: '공지가 등록되었습니다!' });
      setMessage('');
      setPriority('normal');
      setDurationHours(2);
      loadAnnouncements();
    } catch (err) {
      setMsg({ error: true, text: err.error || '등록에 실패했습니다.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeactivate = async (id) => {
    if (!window.confirm('이 공지를 즉시 종료하시겠습니까?')) return;
    try {
      await adminService.deactivateAnnouncement(id);
      loadAnnouncements();
    } catch (err) {
      alert(err.error || '비활성화에 실패했습니다.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('이 공지를 삭제하시겠습니까?')) return;
    try {
      await adminService.deleteAnnouncement(id);
      loadAnnouncements();
    } catch (err) {
      alert(err.error || '삭제에 실패했습니다.');
    }
  };

  const isActive = (a) => a.is_active && new Date(a.expires_at) > new Date();

  const formatDate = (iso) => {
    const d = new Date(iso);
    return d.toLocaleString('ko-KR', {
      month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  const getRemaining = (expiresAt) => {
    const diff = new Date(expiresAt) - new Date();
    if (diff <= 0) return '만료됨';
    const hours = Math.floor(diff / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    if (hours > 0) return `${hours}시간 ${mins}분 남음`;
    return `${mins}분 남음`;
  };

  return (
    <Container>
      <Inner>
        <Header>
          <h1>공지 관리</h1>
          <BackBtn onClick={() => navigate('/admin/predictions')}>예측 관리로</BackBtn>
        </Header>

        {/* 작성 폼 */}
        <CreateCard>
          {msg && <Msg $error={msg.error}>{msg.text}</Msg>}
          <Label>공지 내용</Label>
          <TextArea
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="전광판에 표시할 공지를 입력하세요..."
            maxLength={200}
          />
          <CharCount $over={message.length > 200}>
            {message.length}/200
          </CharCount>

          <FormRow style={{ marginTop: 8 }}>
            <FormGroup $flex="1" $minW="140px">
              <Label>표시 시간</Label>
              <Select
                value={durationHours}
                onChange={e => setDurationHours(Number(e.target.value))}
              >
                <option value={0.5}>30분</option>
                <option value={1}>1시간</option>
                <option value={2}>2시간</option>
                <option value={4}>4시간</option>
                <option value={8}>8시간</option>
                <option value={12}>12시간</option>
                <option value={24}>24시간</option>
                <option value={48}>48시간</option>
                <option value={72}>3일</option>
                <option value={168}>7일</option>
              </Select>
            </FormGroup>
            <FormGroup $flex="1" $minW="120px">
              <Label>우선순위</Label>
              <Select
                value={priority}
                onChange={e => setPriority(e.target.value)}
              >
                <option value="normal">일반</option>
                <option value="urgent">긴급</option>
              </Select>
            </FormGroup>
            <FormGroup $flex="0">
              <SubmitBtn onClick={handleCreate} disabled={submitting || !message.trim()}>
                {submitting ? '등록중...' : '공지 등록'}
              </SubmitBtn>
            </FormGroup>
          </FormRow>
        </CreateCard>

        {/* 공지 목록 */}
        <SectionTitle>등록된 공지 ({announcements.length}건)</SectionTitle>

        {loading ? (
          <Empty>로딩 중...</Empty>
        ) : announcements.length === 0 ? (
          <Empty>등록된 공지가 없습니다.</Empty>
        ) : (
          <ListCard>
            {announcements.map(a => {
              const active = isActive(a);
              return (
                <ListItem key={a.id}>
                  <ItemContent>
                    <div className="message">
                      {a.message}
                      <PriorityBadge $urgent={a.priority === 'urgent'}>
                        {a.priority === 'urgent' ? '긴급' : '일반'}
                      </PriorityBadge>
                    </div>
                    <div className="meta">
                      <StatusBadge $active={active}>
                        {active ? '활성' : '종료'}
                      </StatusBadge>
                      <span>등록: {formatDate(a.created_at)}</span>
                      <span>만료: {formatDate(a.expires_at)}</span>
                      {active && (
                        <span style={{ color: '#ffc107' }}>
                          {getRemaining(a.expires_at)}
                        </span>
                      )}
                      <span>{a.duration_hours}시간</span>
                    </div>
                  </ItemContent>
                  <ItemActions>
                    {active && (
                      <SmallBtn onClick={() => handleDeactivate(a.id)}>
                        종료
                      </SmallBtn>
                    )}
                    <SmallBtn $danger onClick={() => handleDelete(a.id)}>
                      삭제
                    </SmallBtn>
                  </ItemActions>
                </ListItem>
              );
            })}
          </ListCard>
        )}
      </Inner>
    </Container>
  );
};

export default AdminAnnouncements;
