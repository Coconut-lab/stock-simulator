import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminService } from '../services/adminService';
import { formatNumber } from '../utils/helpers';
import styled, { keyframes } from 'styled-components';

const fadeIn = keyframes`from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); }`;

const Container = styled.div`
  min-height: 100vh;
  background: linear-gradient(135deg, #1a1a2e, #16213e, #0f3460);
  padding: 24px;
  color: #e0e0e0;
`;

const Inner = styled.div`
  max-width: 1100px;
  margin: 0 auto;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
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

const BulkBtn = styled.button`
  background: linear-gradient(135deg, #2ecc71, #27ae60);
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 10px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  &:hover { opacity: 0.85; }
`;

/* ── 검색 ── */

const SearchBar = styled.div`
  margin-bottom: 24px;
  animation: ${fadeIn} 0.3s ease;
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 14px 18px;
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 12px;
  font-size: 15px;
  background: rgba(255,255,255,0.06);
  color: #e8e8e8;
  box-sizing: border-box;
  &::placeholder { color: #666; }
  &:focus { outline: none; border-color: #667eea; background: rgba(102,126,234,0.08); }
`;

/* ── 통계 ── */

const StatsRow = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 14px;
  margin-bottom: 24px;
  animation: ${fadeIn} 0.4s ease;
`;

const StatCard = styled.div`
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 12px;
  padding: 18px;
  text-align: center;
  .label { font-size: 12px; color: #888; margin-bottom: 6px; }
  .value { font-size: 22px; font-weight: 700; color: ${p => p.$color || '#e8e8e8'}; }
`;

/* ── 유저 테이블 ── */

const Table = styled.div`
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 14px;
  overflow: hidden;
  animation: ${fadeIn} 0.4s ease;
`;

const TableHeader = styled.div`
  display: grid;
  grid-template-columns: 2fr 2.5fr 1.5fr 1fr 1.2fr;
  gap: 8px;
  padding: 14px 20px;
  background: rgba(255,255,255,0.06);
  font-size: 12px;
  font-weight: 700;
  color: #888;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  @media (max-width: 768px) {
    grid-template-columns: 1fr 1fr 1fr;
    .hide-mobile { display: none; }
  }
`;

const TableRow = styled.div`
  display: grid;
  grid-template-columns: 2fr 2.5fr 1.5fr 1fr 1.2fr;
  gap: 8px;
  padding: 14px 20px;
  align-items: center;
  border-top: 1px solid rgba(255,255,255,0.04);
  font-size: 14px;
  transition: background 0.2s;
  cursor: pointer;
  &:hover { background: rgba(255,255,255,0.04); }
  @media (max-width: 768px) {
    grid-template-columns: 1fr 1fr 1fr;
    .hide-mobile { display: none; }
  }
`;

const Username = styled.div`
  font-weight: 600;
  color: #e8e8e8;
  .sub { font-size: 11px; color: #666; margin-top: 2px; }
`;

const Balance = styled.span`
  color: #2ecc71;
  font-weight: 700;
`;

const RoleBadge = styled.span`
  display: inline-block;
  padding: 3px 10px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 700;
  color: white;
  background: ${p => p.$admin ? '#e74c3c' : '#667eea'};
`;

const ActionBtn = styled.button`
  padding: 6px 14px;
  border: 1px solid rgba(102,126,234,0.3);
  background: rgba(102,126,234,0.15);
  color: #a5b4fc;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  &:hover { background: rgba(102,126,234,0.3); }
`;

/* ── 모달 ── */

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
`;

const Modal = styled.div`
  background: #1e1e36;
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 16px;
  padding: 30px;
  width: 90%;
  max-width: 460px;
  animation: ${fadeIn} 0.25s ease;
`;

const ModalTitle = styled.h2`
  margin: 0 0 6px;
  font-size: 20px;
  color: #e8e8e8;
`;

const ModalSub = styled.p`
  margin: 0 0 20px;
  font-size: 13px;
  color: #888;
`;

const ModalLabel = styled.label`
  display: block;
  font-size: 13px;
  color: #aaa;
  margin-bottom: 6px;
  font-weight: 600;
`;

const ModalInput = styled.input`
  width: 100%;
  padding: 12px 14px;
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 10px;
  font-size: 15px;
  background: rgba(255,255,255,0.06);
  color: #e8e8e8;
  box-sizing: border-box;
  margin-bottom: 16px;
  &:focus { outline: none; border-color: #667eea; }
`;

const ModalActions = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 8px;
  margin-bottom: 16px;
`;

const ModalActionBtn = styled.button`
  padding: 10px;
  border: 1px solid ${p => p.$active ? '#667eea' : 'rgba(255,255,255,0.1)'};
  background: ${p => p.$active ? 'rgba(102,126,234,0.25)' : 'rgba(255,255,255,0.04)'};
  color: ${p => p.$active ? '#a5b4fc' : '#888'};
  border-radius: 8px;
  font-weight: 600;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
  &:hover { background: rgba(102,126,234,0.15); }
`;

const ModalBtnRow = styled.div`
  display: flex;
  gap: 10px;
  margin-top: 20px;
`;

const ModalBtn = styled.button`
  flex: 1;
  padding: 12px;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: opacity 0.2s;
  &:hover { opacity: 0.85; }
  &:disabled { opacity: 0.4; cursor: not-allowed; }
`;

const ConfirmBtn = styled(ModalBtn)`
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
`;

const CancelBtn = styled(ModalBtn)`
  background: rgba(255,255,255,0.08);
  color: #aaa;
`;

const ModalMsg = styled.div`
  padding: 10px 14px;
  border-radius: 8px;
  font-size: 13px;
  margin-bottom: 12px;
  background: ${p => p.$error ? 'rgba(231,76,60,0.12)' : 'rgba(46,204,113,0.12)'};
  color: ${p => p.$error ? '#ec7063' : '#2ecc71'};
  border: 1px solid ${p => p.$error ? 'rgba(231,76,60,0.25)' : 'rgba(46,204,113,0.25)'};
`;

const CurrentBalance = styled.div`
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 10px;
  padding: 14px;
  margin-bottom: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 14px;
  color: #aaa;
  span:last-child { font-size: 18px; font-weight: 700; color: #2ecc71; }
`;

/* ── 페이지네이션 ── */

const Pagination = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 6px;
  margin-top: 20px;
  flex-wrap: wrap;
`;

const PageBtn = styled.button`
  padding: 8px 14px;
  border: 1px solid ${p => p.$active ? '#667eea' : 'rgba(255,255,255,0.1)'};
  background: ${p => p.$active ? 'rgba(102,126,234,0.3)' : 'rgba(255,255,255,0.04)'};
  color: ${p => p.$active ? '#a5b4fc' : '#888'};
  border-radius: 8px;
  font-size: 13px;
  cursor: pointer;
  &:disabled { opacity: 0.3; cursor: not-allowed; }
  &:hover:not(:disabled) { background: rgba(102,126,234,0.15); }
`;

const Empty = styled.div`
  text-align: center;
  padding: 60px;
  color: #888;
`;

/* ── Component ── */

const AdminUsers = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // 모달
  const [selected, setSelected] = useState(null);
  const [action, setAction] = useState('add');
  const [amount, setAmount] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  // 일괄 지급 모달
  const [showBulk, setShowBulk] = useState(false);
  const [bulkAmount, setBulkAmount] = useState('');
  const [bulkMemo, setBulkMemo] = useState('');
  const [bulkSaving, setBulkSaving] = useState(false);
  const [bulkMsg, setBulkMsg] = useState(null);

  useEffect(() => {
    loadUsers();
  }, [page]); // eslint-disable-line

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      loadUsers();
    }, 300);
    return () => clearTimeout(timer);
  }, [search]); // eslint-disable-line

  const loadUsers = async () => {
    try {
      setLoading(true);
      const res = await adminService.getUsers(page, search);
      setUsers(res.data || []);
      setTotalPages(res.total_pages || 1);
      setTotal(res.total || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const openModal = (user) => {
    setSelected(user);
    setAction('add');
    setAmount('');
    setMsg(null);
  };

  const closeModal = () => {
    setSelected(null);
    setMsg(null);
  };

  const handleSubmit = async () => {
    if (!amount || parseInt(amount) <= 0) {
      setMsg({ error: true, text: '금액을 입력해주세요.' });
      return;
    }
    setSaving(true);
    setMsg(null);
    try {
      const res = await adminService.updateBalance(selected.user_id, action, parseInt(amount));
      setMsg({ error: false, text: `${res.data.username}님 잔액: ${formatNumber(res.data.previous_balance)}원 → ${formatNumber(res.data.new_balance)}원` });
      setSelected({ ...selected, balance: res.data.new_balance });
      setAmount('');
      // 목록 갱신
      setUsers(prev => prev.map(u =>
        u.user_id === selected.user_id ? { ...u, balance: res.data.new_balance } : u
      ));
    } catch (err) {
      setMsg({ error: true, text: err.error || '수정에 실패했습니다.' });
    } finally {
      setSaving(false);
    }
  };

  const handleRoleToggle = async (user) => {
    const newRole = user.role === 'admin' ? 'user' : 'admin';
    if (!window.confirm(`${user.username}님을 ${newRole === 'admin' ? '관리자' : '일반 유저'}로 변경하시겠습니까?`)) return;
    try {
      await adminService.updateRole(user.user_id, newRole);
      setUsers(prev => prev.map(u =>
        u.user_id === user.user_id ? { ...u, role: newRole } : u
      ));
    } catch (err) {
      alert(err.error || '역할 변경에 실패했습니다.');
    }
  };

  const handleBulkPayment = async () => {
    if (!bulkAmount || parseInt(bulkAmount) <= 0) {
      setBulkMsg({ error: true, text: '금액을 입력해주세요.' });
      return;
    }
    if (!window.confirm(`전체 ${total}명에게 ${formatNumber(parseInt(bulkAmount))}원을 지급하시겠습니까?`)) return;
    setBulkSaving(true);
    setBulkMsg(null);
    try {
      const res = await adminService.bulkPayment(parseInt(bulkAmount), bulkMemo || undefined);
      setBulkMsg({ error: false, text: res.message });
      setBulkAmount('');
      setBulkMemo('');
      loadUsers();
    } catch (err) {
      setBulkMsg({ error: true, text: err.error || '일괄 지급에 실패했습니다.' });
    } finally {
      setBulkSaving(false);
    }
  };

  const totalBalance = users.reduce((s, u) => s + u.balance, 0);
  const adminCount = users.filter(u => u.role === 'admin').length;

  return (
    <Container>
      <Inner>
        <Header>
          <h1>유저 관리</h1>
          <div style={{ display: 'flex', gap: 8 }}>
            <BulkBtn onClick={() => { setShowBulk(true); setBulkMsg(null); setBulkAmount(''); setBulkMemo(''); }}>
              전체 지급
            </BulkBtn>
            <BackBtn onClick={() => navigate('/admin/predictions')}>예측 관리로</BackBtn>
          </div>
        </Header>

        <SearchBar>
          <SearchInput
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="아이디 또는 이름으로 검색..."
          />
        </SearchBar>

        <StatsRow>
          <StatCard>
            <div className="label">총 유저</div>
            <div className="value">{total}명</div>
          </StatCard>
          <StatCard $color="#e74c3c">
            <div className="label">관리자</div>
            <div className="value">{adminCount}명</div>
          </StatCard>
          <StatCard $color="#2ecc71">
            <div className="label">현재 페이지 총 잔액</div>
            <div className="value">{formatNumber(totalBalance)}</div>
          </StatCard>
        </StatsRow>

        {loading ? (
          <Empty>로딩 중...</Empty>
        ) : users.length === 0 ? (
          <Empty>{search ? '검색 결과가 없습니다.' : '유저가 없습니다.'}</Empty>
        ) : (
          <Table>
            <TableHeader>
              <span>유저</span>
              <span className="hide-mobile">이름</span>
              <span>잔액</span>
              <span className="hide-mobile">역할</span>
              <span>관리</span>
            </TableHeader>
            {users.map(user => (
              <TableRow key={user.user_id}>
                <Username>
                  {user.username}
                  <div className="sub">
                    {user.created_at ? new Date(user.created_at).toLocaleDateString('ko-KR') : ''} 가입
                  </div>
                </Username>
                <span className="hide-mobile" style={{ color: '#999', fontSize: 13 }}>
                  {user.name}
                </span>
                <Balance>{formatNumber(user.balance)}원</Balance>
                <span className="hide-mobile">
                  <RoleBadge $admin={user.role === 'admin'}>
                    {user.role === 'admin' ? '관리자' : '유저'}
                  </RoleBadge>
                </span>
                <div style={{ display: 'flex', gap: 6 }}>
                  <ActionBtn onClick={() => openModal(user)}>잔액</ActionBtn>
                  <ActionBtn
                    onClick={() => handleRoleToggle(user)}
                    style={user.role === 'admin' ? { borderColor: 'rgba(231,76,60,0.3)', color: '#ec7063' } : {}}
                  >
                    {user.role === 'admin' ? '강등' : '승급'}
                  </ActionBtn>
                </div>
              </TableRow>
            ))}
          </Table>
        )}

        {totalPages > 1 && (
          <Pagination>
            <PageBtn disabled={page <= 1} onClick={() => setPage(1)}>{'<<'}</PageBtn>
            <PageBtn disabled={page <= 1} onClick={() => setPage(p => p - 1)}>{'<'}</PageBtn>
            <span style={{ color: '#888', fontSize: 13, padding: '0 8px' }}>
              {page} / {totalPages}
            </span>
            <PageBtn disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>{'>'}</PageBtn>
            <PageBtn disabled={page >= totalPages} onClick={() => setPage(totalPages)}>{'>>'}</PageBtn>
          </Pagination>
        )}
      </Inner>

      {/* 일괄 지급 모달 */}
      {showBulk && (
        <Overlay onClick={() => setShowBulk(false)}>
          <Modal onClick={e => e.stopPropagation()}>
            <ModalTitle>전체 유저 일괄 지급</ModalTitle>
            <ModalSub>모든 유저({total}명)에게 동일 금액을 지급합니다.</ModalSub>

            {bulkMsg && <ModalMsg $error={bulkMsg.error}>{bulkMsg.text}</ModalMsg>}

            <ModalLabel>지급 금액 (원)</ModalLabel>
            <ModalInput
              type="number"
              value={bulkAmount}
              onChange={e => setBulkAmount(e.target.value)}
              placeholder="지급할 금액 입력"
              min="0"
              step="10000"
            />

            <ModalLabel>메모 (선택)</ModalLabel>
            <ModalInput
              type="text"
              value={bulkMemo}
              onChange={e => setBulkMemo(e.target.value)}
              placeholder="예: 이벤트 보상, 시스템 보상 등"
            />

            {bulkAmount && parseInt(bulkAmount) > 0 && (
              <CurrentBalance>
                <span>총 지급액</span>
                <span>{formatNumber(parseInt(bulkAmount) * total)}원</span>
              </CurrentBalance>
            )}

            <ModalBtnRow>
              <CancelBtn onClick={() => setShowBulk(false)}>취소</CancelBtn>
              <ConfirmBtn onClick={handleBulkPayment} disabled={bulkSaving || !bulkAmount}>
                {bulkSaving ? '지급 중...' : '전체 지급'}
              </ConfirmBtn>
            </ModalBtnRow>
          </Modal>
        </Overlay>
      )}

      {/* 잔액 수정 모달 */}
      {selected && (
        <Overlay onClick={closeModal}>
          <Modal onClick={e => e.stopPropagation()}>
            <ModalTitle>{selected.username}</ModalTitle>
            <ModalSub>{selected.name}</ModalSub>

            <CurrentBalance>
              <span>현재 잔액</span>
              <span>{formatNumber(selected.balance)}원</span>
            </CurrentBalance>

            {msg && <ModalMsg $error={msg.error}>{msg.text}</ModalMsg>}

            <ModalLabel>작업 선택</ModalLabel>
            <ModalActions>
              <ModalActionBtn $active={action === 'add'} onClick={() => setAction('add')}>
                추가 (+)
              </ModalActionBtn>
              <ModalActionBtn $active={action === 'subtract'} onClick={() => setAction('subtract')}>
                차감 (-)
              </ModalActionBtn>
              <ModalActionBtn $active={action === 'set'} onClick={() => setAction('set')}>
                직접 설정
              </ModalActionBtn>
            </ModalActions>

            <ModalLabel>
              {action === 'set' ? '설정할 금액' : action === 'add' ? '추가할 금액' : '차감할 금액'}
            </ModalLabel>
            <ModalInput
              type="number"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="금액 입력"
              min="0"
              step="10000"
            />

            {amount && parseInt(amount) > 0 && (
              <CurrentBalance>
                <span>변경 후 잔액</span>
                <span>
                  {formatNumber(
                    action === 'set'
                      ? parseInt(amount)
                      : action === 'add'
                      ? selected.balance + parseInt(amount)
                      : Math.max(0, selected.balance - parseInt(amount))
                  )}원
                </span>
              </CurrentBalance>
            )}

            <ModalBtnRow>
              <CancelBtn onClick={closeModal}>취소</CancelBtn>
              <ConfirmBtn onClick={handleSubmit} disabled={saving || !amount}>
                {saving ? '처리중...' : '적용'}
              </ConfirmBtn>
            </ModalBtnRow>
          </Modal>
        </Overlay>
      )}
    </Container>
  );
};

export default AdminUsers;
