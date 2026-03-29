import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { optionsService } from '../services/optionsService';
import { formatNumber, formatErrorMessage, getProfitColor } from '../utils/helpers';
import styled from 'styled-components';

const SUPPORTED = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'NVDA', 'META', 'SPY', 'QQQ', '005930', 'NFLX', 'AMD', 'INTC', 'JPM', 'V', 'BA', 'DIS', 'COIN', 'SOFI', '000660', '035420'];

const SYMBOL_NAMES = {
  AAPL: 'Apple', MSFT: 'Microsoft', GOOGL: 'Google', AMZN: 'Amazon',
  TSLA: 'Tesla', NVDA: 'NVIDIA', META: 'Meta', SPY: 'S&P 500 ETF',
  QQQ: 'Nasdaq ETF', NFLX: 'Netflix', AMD: 'AMD', INTC: 'Intel',
  JPM: 'JPMorgan', V: 'Visa', BA: 'Boeing', DIS: 'Disney',
  COIN: 'Coinbase', SOFI: 'SoFi',
  '005930': '삼성전자', '000660': 'SK하이닉스', '035420': '네이버',
};

const Container = styled.div`
  min-height: 100vh;
  background: #0f0e1a;
  color: #e0e0e0;
  padding: 20px;
`;

const Header = styled.div`
  background: rgba(255,255,255,0.04);
  padding: 24px;
  border-radius: 12px;
  border: 1px solid rgba(255,255,255,0.06);
  margin-bottom: 24px;
  h1 { margin: 0; color: #fff; font-size: 28px; }
  p { margin: 8px 0 0; color: #888; }
`;

const SymbolSelector = styled.div`
  display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 24px;
`;

const SymbolButton = styled.button`
  padding: 10px 18px;
  border: 1px solid ${p => p.$active ? '#667eea' : 'rgba(255,255,255,0.1)'};
  background: ${p => p.$active ? 'rgba(102,126,234,0.15)' : 'rgba(255,255,255,0.04)'};
  color: ${p => p.$active ? '#667eea' : '#ccc'};
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  &:hover { border-color: #667eea; }
`;

const Card = styled.div`
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 12px;
  overflow: hidden;
  margin-bottom: 24px;
`;

const CardHeader = styled.div`
  padding: 16px 20px;
  border-bottom: 1px solid rgba(255,255,255,0.06);
  display: flex; justify-content: space-between; align-items: center;
  h2 { margin: 0; font-size: 18px; color: #fff; }
`;

const ChainTable = styled.table`
  width: 100%; border-collapse: collapse;
  th { padding: 10px 12px; color: #888; font-size: 12px; font-weight: 600;
    border-bottom: 1px solid rgba(255,255,255,0.06); text-align: center; text-transform: uppercase; }
  td { padding: 10px 12px; border-bottom: 1px solid rgba(255,255,255,0.03);
    text-align: center; font-size: 13px; }
`;

const CallCell = styled.td`
  background: rgba(231,76,60,0.03);
  cursor: pointer;
  &:hover { background: rgba(231,76,60,0.08); }
`;

const PutCell = styled.td`
  background: rgba(52,152,219,0.03);
  cursor: pointer;
  &:hover { background: rgba(52,152,219,0.08); }
`;

const StrikeCell = styled.td`
  font-weight: 700;
  color: #fff;
  background: rgba(255,255,255,0.02);
`;

const ExpiryTabs = styled.div`
  display: flex; gap: 4px; margin-bottom: 16px;
`;

const ExpiryTab = styled.button`
  padding: 8px 16px;
  border: 1px solid ${p => p.$active ? '#667eea' : 'rgba(255,255,255,0.1)'};
  background: ${p => p.$active ? 'rgba(102,126,234,0.15)' : 'transparent'};
  color: ${p => p.$active ? '#667eea' : '#888'};
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
`;

const BuyModal = styled.div`
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 2000;
`;

const ModalContent = styled.div`
  background: #1a1a2e; border: 1px solid rgba(255,255,255,0.1);
  border-radius: 16px; padding: 30px; width: 400px; max-width: 90vw;
`;

const Input = styled.input`
  width: 100%; padding: 12px; background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.1); border-radius: 8px;
  color: #e0e0e0; font-size: 16px;
  &:focus { outline: none; border-color: #667eea; }
`;

const BuyButton = styled.button`
  width: 100%; padding: 14px; border: none; border-radius: 8px;
  font-size: 16px; font-weight: 700; cursor: pointer; margin-top: 12px;
  background: #667eea; color: white;
  &:hover { background: #5a6fd8; }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

const Message = styled.div`
  padding: 12px; border-radius: 8px; margin: 12px 0; font-size: 14px;
  &.error { background: rgba(231,76,60,0.1); color: #e74c3c; }
  &.success { background: rgba(46,204,113,0.1); color: #2ecc71; }
`;

const LoadingState = styled.div`
  text-align: center; padding: 60px; color: #888;
`;

const GuideBanner = styled.div`
  background: linear-gradient(135deg, rgba(102,126,234,0.12) 0%, rgba(118,75,162,0.12) 100%);
  border: 1px solid rgba(102,126,234,0.25);
  border-radius: 12px;
  padding: 20px 24px;
  margin-bottom: 24px;
  .title { font-size: 16px; font-weight: 700; color: #667eea; margin-bottom: 8px; }
  .desc { font-size: 14px; color: #aaa; line-height: 1.7; }
  .desc strong { color: #e0e0e0; }
`;

const ToggleButton = styled.button`
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.1);
  color: #888;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
  &:hover { background: rgba(255,255,255,0.1); }
`;

const Options = () => {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  const [selectedUnderlying, setSelectedUnderlying] = useState('AAPL');
  const [chain, setChain] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedExpiry, setSelectedExpiry] = useState(null);
  const [buyContract, setBuyContract] = useState(null);
  const [buyQuantity, setBuyQuantity] = useState('1');
  const [buying, setBuying] = useState(false);
  const [showGreeks, setShowGreeks] = useState(false);

  useEffect(() => {
    loadChain();
  }, [selectedUnderlying]); // eslint-disable-line

  const loadChain = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await optionsService.getOptionChain(selectedUnderlying);
      setChain(response.data || []);
      // 첫 만기일 선택
      const expiries = [...new Set((response.data || []).map(c => c.expiry_date?.split('T')[0]))].sort();
      if (expiries.length > 0 && !selectedExpiry) {
        setSelectedExpiry(expiries[0]);
      }
    } catch (err) {
      setError(formatErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const expiries = [...new Set(chain.map(c => c.expiry_date?.split('T')[0]))].sort();
  const filteredChain = chain.filter(c => c.expiry_date?.startsWith(selectedExpiry || ''));
  const strikes = [...new Set(filteredChain.map(c => c.strike_price))].sort((a, b) => a - b);

  const getContract = (strike, type) => {
    return filteredChain.find(c => c.strike_price === strike && c.option_type === type);
  };

  const handleBuy = async () => {
    if (!buyContract?._id) return;
    try {
      setBuying(true);
      setError('');
      const qty = parseInt(buyQuantity) || 1;
      const response = await optionsService.buyOption(buyContract._id, qty);
      setSuccess(response.message);
      if (response.data?.remaining_balance !== undefined && user) {
        updateUser({ ...user, balance: response.data.remaining_balance });
      }
      setBuyContract(null);
      setBuyQuantity('1');
    } catch (err) {
      setError(formatErrorMessage(err));
    } finally {
      setBuying(false);
    }
  };

  return (
    <Container>
      <Header>
        <h1>옵션 거래</h1>
        <p>콜/풋 옵션을 매매하고 그릭스를 확인하세요.</p>
      </Header>

      <GuideBanner>
        <div className="title">옵션이란?</div>
        <div className="desc">
          정해진 가격(행사가)에 주식을 살 수 있는 권리(콜) 또는 팔 수 있는 권리(풋)를 거래합니다.<br/>
          <strong style={{ color: '#e74c3c' }}>콜(CALL) = 상승 베팅</strong> — 주가가 오르면 수익 &nbsp;|&nbsp;
          <strong style={{ color: '#3498db' }}>풋(PUT) = 하락 베팅</strong> — 주가가 내리면 수익<br/>
          옵션을 사는 데 드는 비용을 <strong>프리미엄</strong>이라 하며, 최대 손실은 프리미엄으로 제한됩니다.
        </div>
      </GuideBanner>

      {error && <Message className="error">{error}</Message>}
      {success && <Message className="success">{success}</Message>}

      <SymbolSelector>
        {SUPPORTED.map(sym => (
          <SymbolButton key={sym} $active={selectedUnderlying === sym}
            onClick={() => { setSelectedUnderlying(sym); setSelectedExpiry(null); }}>
            {SYMBOL_NAMES[sym] || sym} <span style={{ fontSize: 11, opacity: 0.6 }}>({sym})</span>
          </SymbolButton>
        ))}
      </SymbolSelector>

      {loading ? (
        <LoadingState>옵션 체인을 불러오고 있습니다...</LoadingState>
      ) : (
        <>
          <ExpiryTabs>
            {expiries.map(exp => (
              <ExpiryTab key={exp} $active={selectedExpiry === exp}
                onClick={() => setSelectedExpiry(exp)}>
                {new Date(exp).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })} 만기
              </ExpiryTab>
            ))}
          </ExpiryTabs>

          <Card>
            <CardHeader>
              <h2>{selectedUnderlying} 옵션 체인</h2>
              <ToggleButton onClick={() => setShowGreeks(!showGreeks)}>
                {showGreeks ? '고급 정보 숨기기' : '고급 정보 보기 (델타/IV)'}
              </ToggleButton>
            </CardHeader>
            <div style={{ overflowX: 'auto' }}>
              <ChainTable>
                <thead>
                  <tr>
                    <th colSpan={showGreeks ? 3 : 1} style={{ background: 'rgba(231,76,60,0.06)', color: '#e74c3c' }}>
                      CALL (상승 베팅)
                    </th>
                    <th style={{ background: 'rgba(255,255,255,0.04)' }}>행사가</th>
                    <th colSpan={showGreeks ? 3 : 1} style={{ background: 'rgba(52,152,219,0.06)', color: '#3498db' }}>
                      PUT (하락 베팅)
                    </th>
                  </tr>
                  <tr>
                    <th>프리미엄</th>
                    {showGreeks && <><th>델타</th><th>IV</th></>}
                    <th></th>
                    <th>프리미엄</th>
                    {showGreeks && <><th>델타</th><th>IV</th></>}
                  </tr>
                </thead>
                <tbody>
                  {strikes.map(strike => {
                    const call = getContract(strike, 'call');
                    const put = getContract(strike, 'put');
                    return (
                      <tr key={strike}>
                        <CallCell onClick={() => call && setBuyContract({ ...call, option_type: 'call' })}>
                          {call ? formatNumber(call.premium) : '-'}
                        </CallCell>
                        {showGreeks && (
                          <>
                            <CallCell onClick={() => call && setBuyContract({ ...call, option_type: 'call' })}>
                              {call?.greeks?.delta?.toFixed(3) || '-'}
                            </CallCell>
                            <CallCell onClick={() => call && setBuyContract({ ...call, option_type: 'call' })}>
                              {call?.implied_volatility ? (call.implied_volatility * 100).toFixed(0) + '%' : '-'}
                            </CallCell>
                          </>
                        )}
                        <StrikeCell>{formatNumber(strike)}</StrikeCell>
                        <PutCell onClick={() => put && setBuyContract({ ...put, option_type: 'put' })}>
                          {put ? formatNumber(put.premium) : '-'}
                        </PutCell>
                        {showGreeks && (
                          <>
                            <PutCell onClick={() => put && setBuyContract({ ...put, option_type: 'put' })}>
                              {put?.greeks?.delta?.toFixed(3) || '-'}
                            </PutCell>
                            <PutCell onClick={() => put && setBuyContract({ ...put, option_type: 'put' })}>
                              {put?.implied_volatility ? (put.implied_volatility * 100).toFixed(0) + '%' : '-'}
                            </PutCell>
                          </>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </ChainTable>
            </div>
          </Card>
        </>
      )}

      {buyContract && (
        <BuyModal onClick={() => setBuyContract(null)}>
          <ModalContent onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 20px', color: '#fff' }}>
              {buyContract.option_type === 'call' ? 'CALL (상승 베팅)' : 'PUT (하락 베팅)'} 옵션 매수
            </h3>
            <div style={{ fontSize: 14, color: '#888', marginBottom: 16 }}>
              <div>기초자산: {buyContract.underlying}</div>
              <div>행사가: {formatNumber(buyContract.strike_price)}</div>
              <div>프리미엄: {formatNumber(buyContract.premium)}</div>
              <div>만기: {new Date(buyContract.expiry_date).toLocaleDateString('ko-KR')}</div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 13, color: '#888', marginBottom: 6 }}>수량 (계약)</label>
              <Input type="number" value={buyQuantity} onChange={e => setBuyQuantity(e.target.value)} min="1" />
            </div>
            <div style={{ background: 'rgba(255,255,255,0.04)', padding: 12, borderRadius: 8, fontSize: 13, marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>총 비용</span>
                <span style={{ fontWeight: 700 }}>
                  ₩{formatNumber(Math.round(buyContract.premium * (parseInt(buyQuantity) || 1) * 100))}
                </span>
              </div>
            </div>
            <BuyButton disabled={buying} onClick={handleBuy}>
              {buying ? '처리 중...' : '매수 확인'}
            </BuyButton>
            <button
              onClick={() => setBuyContract(null)}
              style={{ width: '100%', padding: 12, background: 'transparent', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 8, color: '#888', cursor: 'pointer', marginTop: 8 }}
            >
              취소
            </button>
          </ModalContent>
        </BuyModal>
      )}
    </Container>
  );
};

export default Options;
