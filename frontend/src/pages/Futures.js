import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { futuresService } from '../services/futuresService';
import { formatNumber, formatErrorMessage } from '../utils/helpers';
import styled from 'styled-components';

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
  margin-bottom: 30px;
  h1 { margin: 0; color: #fff; font-size: 28px; }
  p { margin: 8px 0 0; color: #888; }
`;

const ContractGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 20px;
`;

const ContractCard = styled.div`
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 12px;
  padding: 24px;
  cursor: pointer;
  transition: all 0.3s;
  &:hover {
    border-color: #667eea;
    transform: translateY(-2px);
    box-shadow: 0 4px 20px rgba(102,126,234,0.15);
  }
`;

const ContractName = styled.div`
  font-size: 18px;
  font-weight: 700;
  color: #fff;
  margin-bottom: 4px;
`;

const ContractSymbol = styled.div`
  font-size: 13px;
  color: #888;
  margin-bottom: 16px;
`;

const ContractInfo = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
`;

const InfoItem = styled.div`
  .label { font-size: 12px; color: #666; margin-bottom: 2px; }
  .value { font-size: 16px; font-weight: 600; color: #e0e0e0; }
`;

const Badge = styled.span`
  display: inline-block;
  padding: 3px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 700;
  background: ${p => p.$color || 'rgba(102,126,234,0.15)'};
  color: ${p => p.$textColor || '#667eea'};
  margin-left: 8px;
`;

const LoadingState = styled.div`
  text-align: center; padding: 60px; color: #888;
  .spinner {
    width: 40px; height: 40px;
    border: 3px solid rgba(255,255,255,0.1);
    border-top: 3px solid #667eea;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin: 0 auto 16px;
  }
  @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
`;

const ErrorMessage = styled.div`
  background: rgba(231,76,60,0.1);
  border: 1px solid rgba(231,76,60,0.3);
  color: #e74c3c;
  padding: 16px;
  border-radius: 8px;
  margin: 20px 0;
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

const CONTRACT_DESCRIPTIONS = {
  KOSPI200: '한국 대표 200개 종목의 흐름을 추종',
  ES: '미국 S&P500 지수를 추종하는 대표 선물',
  NQ: '미국 나스닥100 기술주 지수를 추종',
  CL: '국제 원유(WTI) 가격 변동에 투자',
  GC: '금 가격 변동에 투자하는 안전자산 선물',
  '6E': '유로화와 달러화의 환율 변동에 투자',
  ZN: '미국 10년 국채 금리 변동에 투자',
  NK: '일본 닛케이225 지수를 추종',
  FDAX: '독일 DAX 지수를 추종하는 유럽 대표 선물',
};

const Futures = () => {
  const navigate = useNavigate();
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadContracts();
  }, []);

  const loadContracts = async () => {
    try {
      setLoading(true);
      const response = await futuresService.getContracts();
      setContracts(response.data || []);
    } catch (err) {
      setError(formatErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const formatExpiry = (dateStr) => {
    const d = new Date(dateStr);
    return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
  };

  const getDaysToExpiry = (dateStr) => {
    const now = new Date();
    const expiry = new Date(dateStr);
    return Math.max(0, Math.ceil((expiry - now) / (1000 * 60 * 60 * 24)));
  };

  if (loading) {
    return (
      <Container>
        <Header><h1>선물 거래</h1></Header>
        <LoadingState>
          <div className="spinner" />
          <div>선물 계약을 불러오고 있습니다...</div>
        </LoadingState>
      </Container>
    );
  }

  return (
    <Container>
      <Header>
        <h1>선물 거래</h1>
        <p>레버리지와 만기일이 있는 선물 계약을 거래하세요.</p>
      </Header>

      <GuideBanner>
        <div className="title">선물이란?</div>
        <div className="desc">
          미래의 특정 날짜(만기일)에 정해진 가격으로 자산을 사고팔기로 약속하는 계약입니다.<br/>
          <strong>롱(매수)</strong> = 가격이 오를 것 같을 때 &nbsp;|&nbsp; <strong>숏(매도)</strong> = 가격이 내릴 것 같을 때<br/>
          전체 금액이 아닌 <strong>증거금</strong>(계약 가치의 일부)만 있으면 거래할 수 있어 적은 돈으로 큰 거래가 가능합니다.
        </div>
      </GuideBanner>

      {error && <ErrorMessage>{error}</ErrorMessage>}

      <ContractGrid>
        {contracts.map((contract) => {
          const days = getDaysToExpiry(contract.expiry_date);
          return (
            <ContractCard key={contract._id} onClick={() => navigate(`/futures/${contract._id}`)}>
              <ContractName>
                {contract.name}
                <Badge $color={contract.currency === 'KRW' ? 'rgba(46,125,50,0.15)' : 'rgba(21,101,192,0.15)'}
                       $textColor={contract.currency === 'KRW' ? '#2e7d32' : '#1565c0'}>
                  {contract.currency}
                </Badge>
              </ContractName>
              <ContractSymbol>
                {contract.symbol}
                {CONTRACT_DESCRIPTIONS[contract.underlying || contract.symbol?.split('_')[0]] && (
                  <span style={{ marginLeft: 8, color: '#667eea', fontSize: 12 }}>
                    — {CONTRACT_DESCRIPTIONS[contract.underlying || contract.symbol?.split('_')[0]]}
                  </span>
                )}
              </ContractSymbol>
              <ContractInfo>
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
                  <div className="value">{formatExpiry(contract.expiry_date)}</div>
                </InfoItem>
                <InfoItem>
                  <div className="label">잔여일</div>
                  <div className="value" style={{ color: days <= 7 ? '#e74c3c' : days <= 30 ? '#f39c12' : '#2ecc71' }}>
                    {days}일
                  </div>
                </InfoItem>
                <InfoItem>
                  <div className="label">개시증거금률</div>
                  <div className="value">{(contract.initial_margin_rate * 100).toFixed(0)}%</div>
                </InfoItem>
                <InfoItem>
                  <div className="label">틱 사이즈</div>
                  <div className="value">{contract.tick_size}</div>
                </InfoItem>
              </ContractInfo>
            </ContractCard>
          );
        })}
      </ContractGrid>

      {contracts.length === 0 && !error && (
        <div style={{ textAlign: 'center', padding: '60px', color: '#666' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.3 }}>📈</div>
          <h3 style={{ color: '#999' }}>선물 계약이 없습니다</h3>
        </div>
      )}
    </Container>
  );
};

export default Futures;
