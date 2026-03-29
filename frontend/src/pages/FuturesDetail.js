import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { futuresService } from '../services/futuresService';
import { formatNumber, formatErrorMessage, getProfitColor } from '../utils/helpers';
import styled from 'styled-components';

const Container = styled.div`
  min-height: 100vh;
  background: #0f0e1a;
  color: #e0e0e0;
  padding: 20px;
`;

const BackButton = styled.button`
  background: rgba(255,255,255,0.08);
  color: #ccc;
  border: 1px solid rgba(255,255,255,0.1);
  padding: 10px 16px;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  margin-bottom: 20px;
  &:hover { background: rgba(255,255,255,0.12); }
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 24px;
  @media (max-width: 1024px) { grid-template-columns: 1fr; }
`;

const Card = styled.div`
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 12px;
  overflow: hidden;
`;

const CardHeader = styled.div`
  padding: 20px;
  border-bottom: 1px solid rgba(255,255,255,0.06);
  h2 { margin: 0; font-size: 18px; color: #fff; }
`;

const CardBody = styled.div`
  padding: 20px;
`;

const InfoGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
`;

const InfoItem = styled.div`
  .label { font-size: 12px; color: #666; margin-bottom: 4px; text-transform: uppercase; }
  .value { font-size: 18px; font-weight: 600; color: #e0e0e0; }
`;

const TradeButton = styled.button`
  width: 100%;
  padding: 14px;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s;
  margin-top: 8px;
  &.long { background: #e74c3c; color: white; &:hover { background: #c0392b; } }
  &.short { background: #3498db; color: white; &:hover { background: #2980b9; } }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

const Input = styled.input`
  width: 100%;
  padding: 12px;
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 8px;
  color: #e0e0e0;
  font-size: 16px;
  &:focus { outline: none; border-color: #667eea; }
`;

const Label = styled.label`
  display: block;
  font-size: 13px;
  color: #888;
  margin-bottom: 6px;
  font-weight: 600;
`;

const Message = styled.div`
  padding: 12px;
  border-radius: 8px;
  margin: 12px 0;
  font-size: 14px;
  &.error { background: rgba(231,76,60,0.1); border: 1px solid rgba(231,76,60,0.3); color: #e74c3c; }
  &.success { background: rgba(46,204,113,0.1); border: 1px solid rgba(46,204,113,0.3); color: #2ecc71; }
`;

const PositionRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid rgba(255,255,255,0.06);
  &:last-child { border: none; }
`;

const FuturesDetail = () => {
  const { contractId } = useParams();
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  const [contract, setContract] = useState(null);
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState('1');
  const [trading, setTrading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadData();
  }, [contractId]); // eslint-disable-line

  const loadData = async () => {
    try {
      setLoading(true);
      const [contractRes, posRes] = await Promise.all([
        futuresService.getContractDetail(contractId),
        futuresService.getPositions(),
      ]);
      setContract(contractRes.data);
      setPositions(posRes.data || []);
    } catch (err) {
      setError(formatErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = async (direction) => {
    try {
      setTrading(true);
      setError('');
      setSuccess('');
      const qty = parseInt(quantity) || 1;
      const response = await futuresService.openPosition(contractId, direction, qty);
      setSuccess(response.message);
      if (response.data?.remaining_balance !== undefined && user) {
        updateUser({ ...user, balance: response.data.remaining_balance });
      }
      await loadData();
      setQuantity('1');
    } catch (err) {
      setError(formatErrorMessage(err));
    } finally {
      setTrading(false);
    }
  };

  const handleClose = async (positionId) => {
    if (!window.confirm('포지션을 청산하시겠습니까?')) return;
    try {
      setError('');
      const response = await futuresService.closePosition(positionId);
      setSuccess(response.message);
      if (response.data?.remaining_balance !== undefined && user) {
        updateUser({ ...user, balance: response.data.remaining_balance });
      }
      await loadData();
    } catch (err) {
      setError(formatErrorMessage(err));
    }
  };

  const calcMargin = () => {
    if (!contract) return 0;
    const qty = parseInt(quantity) || 1;
    let value = contract.current_price * contract.contract_size * qty;
    if (contract.currency === 'USD' && contract.exchange_rate) {
      value *= contract.exchange_rate;
    }
    return Math.round(value * contract.initial_margin_rate);
  };

  if (loading) {
    return (
      <Container>
        <BackButton onClick={() => navigate('/futures')}>← 선물 목록</BackButton>
        <div style={{ textAlign: 'center', padding: '60px', color: '#888' }}>로딩 중...</div>
      </Container>
    );
  }

  if (!contract) {
    return (
      <Container>
        <BackButton onClick={() => navigate('/futures')}>← 선물 목록</BackButton>
        <Message className="error">계약을 찾을 수 없습니다.</Message>
      </Container>
    );
  }

  const myPositions = positions.filter(p => p.contract_id === contractId);

  return (
    <Container>
      <BackButton onClick={() => navigate('/futures')}>← 선물 목록</BackButton>

      <Grid>
        <div>
          <Card>
            <CardHeader><h2>{contract.name}</h2></CardHeader>
            <CardBody>
              <InfoGrid>
                <InfoItem>
                  <div className="label">현재가</div>
                  <div className="value">{formatNumber(contract.current_price)}</div>
                </InfoItem>
                <InfoItem>
                  <div className="label">계약크기</div>
                  <div className="value">{formatNumber(contract.contract_size)}</div>
                </InfoItem>
                <InfoItem>
                  <div className="label">만기일</div>
                  <div className="value">{new Date(contract.expiry_date).toLocaleDateString('ko-KR')}</div>
                </InfoItem>
                <InfoItem>
                  <div className="label">통화</div>
                  <div className="value">{contract.currency}</div>
                </InfoItem>
                <InfoItem>
                  <div className="label">개시증거금률</div>
                  <div className="value">{(contract.initial_margin_rate * 100).toFixed(0)}%</div>
                </InfoItem>
                <InfoItem>
                  <div className="label">유지증거금률</div>
                  <div className="value">{(contract.maintenance_margin_rate * 100).toFixed(0)}%</div>
                </InfoItem>
              </InfoGrid>
            </CardBody>
          </Card>

          {myPositions.length > 0 && (
            <Card style={{ marginTop: 20 }}>
              <CardHeader><h2>내 포지션</h2></CardHeader>
              <CardBody>
                {myPositions.map(pos => (
                  <PositionRow key={pos._id}>
                    <div>
                      <span style={{ color: pos.direction === 'long' ? '#e74c3c' : '#3498db', fontWeight: 700 }}>
                        {pos.direction === 'long' ? '롱' : '숏'}
                      </span>
                      <span style={{ marginLeft: 8 }}>{pos.quantity}계약</span>
                      <span style={{ marginLeft: 8, color: '#888', fontSize: 13 }}>
                        진입가: {formatNumber(pos.entry_price)}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ color: getProfitColor(pos.unrealized_pnl), fontWeight: 700 }}>
                        {pos.unrealized_pnl >= 0 ? '+' : ''}₩{formatNumber(pos.unrealized_pnl)}
                      </span>
                      <button
                        onClick={() => handleClose(pos._id)}
                        style={{
                          background: 'rgba(231,76,60,0.15)', color: '#e74c3c',
                          border: '1px solid rgba(231,76,60,0.3)', padding: '6px 12px',
                          borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 13,
                        }}
                      >
                        청산
                      </button>
                    </div>
                  </PositionRow>
                ))}
              </CardBody>
            </Card>
          )}
        </div>

        <Card>
          <CardHeader><h2>주문</h2></CardHeader>
          <CardBody>
            {error && <Message className="error">{error}</Message>}
            {success && <Message className="success">{success}</Message>}

            <div style={{
              background: 'rgba(102,126,234,0.08)', border: '1px solid rgba(102,126,234,0.2)',
              borderRadius: 8, padding: '12px 14px', marginBottom: 16, fontSize: 12, color: '#aaa', lineHeight: 1.6,
            }}>
              <div style={{ color: '#667eea', fontWeight: 700, marginBottom: 4, fontSize: 13 }}>주문 안내</div>
              <strong style={{ color: '#e74c3c' }}>롱</strong> = 가격이 오를 것 같으면 선택<br/>
              <strong style={{ color: '#3498db' }}>숏</strong> = 가격이 내릴 것 같으면 선택<br/>
              증거금: 계약 가치의 일부만 맡기면 거래 가능
            </div>

            <div style={{ marginBottom: 16 }}>
              <Label>계약 수량</Label>
              <Input
                type="number"
                value={quantity}
                onChange={e => setQuantity(e.target.value)}
                min="1"
              />
            </div>

            <div style={{
              background: 'rgba(255,255,255,0.04)', padding: 14, borderRadius: 8,
              fontSize: 13, marginBottom: 16,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span>예상 증거금</span>
                <span style={{ fontWeight: 600 }}>₩{formatNumber(calcMargin())}</span>
              </div>
              <div style={{ fontSize: 11, color: '#666', marginBottom: 8 }}>
                = 현재가 × 계약크기 × 수량{contract.currency === 'USD' && contract.exchange_rate ? ` × 환율(₩${formatNumber(Math.round(contract.exchange_rate))})` : ''} × 증거금률({(contract.initial_margin_rate * 100).toFixed(0)}%)
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>보유 현금</span>
                <span style={{ color: '#2ecc71', fontWeight: 600 }}>₩{formatNumber(Math.round(user?.balance || 0))}</span>
              </div>
            </div>

            <TradeButton
              className="long"
              disabled={trading}
              onClick={() => handleOpen('long')}
            >
              {trading ? '처리 중...' : '롱 — 가격 상승에 베팅'}
            </TradeButton>
            <TradeButton
              className="short"
              disabled={trading}
              onClick={() => handleOpen('short')}
            >
              {trading ? '처리 중...' : '숏 — 가격 하락에 베팅'}
            </TradeButton>
          </CardBody>
        </Card>
      </Grid>
    </Container>
  );
};

export default FuturesDetail;
