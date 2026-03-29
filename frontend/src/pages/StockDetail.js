import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { stockService } from '../services/stockService';
import { portfolioService } from '../services/portfolioService';
import StockChart from '../components/StockChart';
import {
  formatNumber,
  formatPercent,
  getProfitColor,
  formatErrorMessage,
  validateQuantity,
  formatStockPrice,
  formatStockChange,
  getCurrencyFromStock,
  formatQuantity,
  formatRelativeTime
} from '../utils/helpers';
import styled from 'styled-components';

const Container = styled.div`
  min-height: 100vh;
  background: #f8f9fa;
  padding: 20px;
`;

const BackButton = styled.button`
  background: #6c757d;
  color: white;
  border: none;
  padding: 10px 16px;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  margin-bottom: 20px;
  transition: background-color 0.3s ease;
  &:hover { background: #5a6268; }
`;

const ExchangeRateInfo = styled.div`
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 16px 20px;
  border-radius: 8px;
  margin-bottom: 20px;
  .title { font-size: 14px; opacity: 0.9; margin-bottom: 4px; }
  .rate { font-size: 18px; font-weight: 700; }
`;

const StockHeader = styled.div`
  background: white;
  padding: 30px;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);
  margin-bottom: 30px;
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 30px;
  align-items: center;
  @media (max-width: 768px) { grid-template-columns: 1fr; gap: 20px; }
`;

const StockInfo = styled.div`
  .symbol { font-size: 18px; font-weight: 600; color: #666; margin-bottom: 4px; display: flex; align-items: center; gap: 8px; }
  .name { font-size: 32px; color: #333; font-weight: 700; margin-bottom: 16px; }
  .price-container { margin-bottom: 8px; }
  .price { font-size: 48px; font-weight: 700; color: #333; }
  .original-price { font-size: 16px; color: #999; margin-left: 12px; }
  .change { font-size: 18px; font-weight: 600; display: flex; align-items: center; gap: 8px; }
`;

const ETFBadge = styled.span`
  background: #667eea;
  color: white;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 700;
`;

const StockStats = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
  @media (max-width: 768px) { grid-template-columns: 1fr; }
`;

const StatItem = styled.div`
  text-align: right;
  .label { font-size: 14px; color: #666; margin-bottom: 4px; }
  .value { font-size: 18px; font-weight: 600; color: #333; }
  .original-value { font-size: 12px; color: #999; margin-top: 2px; }
`;

const ContentGrid = styled.div`
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 30px;
  @media (max-width: 1024px) { grid-template-columns: 1fr; }
`;

const TradingCard = styled.div`
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);
  overflow: hidden;
`;

const TradingHeader = styled.div`
  padding: 20px;
  border-bottom: 1px solid #eee;
  h3 { margin: 0; color: #333; font-size: 20px; font-weight: 700; }
`;

const TradingContent = styled.div`
  padding: 20px;
`;

const TradingTabs = styled.div`
  display: flex;
  gap: 4px;
  margin-bottom: 20px;
`;

const TradingTab = styled.button`
  flex: 1;
  padding: 12px;
  border: none;
  background: ${props => props.active ? props.$color || '#667eea' : '#f8f9fa'};
  color: ${props => props.active ? 'white' : '#666'};
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 14px;
  &:hover { background: ${props => props.active ? (props.$color || '#5a6fd8') : '#e9ecef'}; }
`;

const TradeForm = styled.form`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const InputGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const Label = styled.label`
  font-weight: 600;
  color: #555;
  font-size: 14px;
`;

const Input = styled.input`
  padding: 12px;
  border: 2px solid #e1e5e9;
  border-radius: 8px;
  font-size: 16px;
  &:focus { outline: none; border-color: #667eea; }
  &.error { border-color: #e74c3c; }
`;

const TradeButton = styled.button`
  padding: 14px;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.3s ease;
  &.buy { background: #e74c3c; color: white; &:hover:not(:disabled) { background: #c0392b; } }
  &.sell { background: #3498db; color: white; &:hover:not(:disabled) { background: #2980b9; } }
  &.short { background: #8e44ad; color: white; &:hover:not(:disabled) { background: #7d3c98; } }
  &:disabled { opacity: 0.6; cursor: not-allowed; }
`;

const ErrorMessage = styled.div`
  background: #ffeaea; color: #e74c3c; padding: 12px; border-radius: 8px;
  border-left: 4px solid #e74c3c; font-size: 14px; margin: 16px 0;
`;

const SuccessMessage = styled.div`
  background: #f0f9f0; color: #27ae60; padding: 12px; border-radius: 8px;
  border-left: 4px solid #27ae60; font-size: 14px; margin: 16px 0;
`;

const TradeInfo = styled.div`
  background: #f8f9fa; padding: 16px; border-radius: 8px; font-size: 14px;
  .row {
    display: flex; justify-content: space-between; margin-bottom: 8px;
    &:last-child { margin-bottom: 0; font-weight: 600; padding-top: 8px; border-top: 1px solid #dee2e6; }
  }
  .original-amount { font-size: 12px; color: #999; margin-left: 8px; }
`;

const MaxBuyButton = styled.button`
  width: 100%; padding: 8px; background: #f8f9fa; border: 1px solid #dee2e6;
  border-radius: 6px; color: #495057; font-size: 12px; font-weight: 600;
  cursor: pointer; transition: all 0.3s ease; margin-top: 8px;
  &:hover:not(:disabled) { background: #e9ecef; border-color: #adb5bd; }
  &:disabled { opacity: 0.6; cursor: not-allowed; }
`;

const LoadingState = styled.div`
  display: flex; justify-content: center; align-items: center; height: 200px;
  .spinner { width: 40px; height: 40px; border: 4px solid #f3f3f3; border-top: 4px solid #667eea;
    border-radius: 50%; animation: spin 1s linear infinite; }
  @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
`;

/* ── 재무제표/뉴스 섹션 ── */

const SectionCard = styled.div`
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.05);
  overflow: hidden;
  margin-top: 30px;
`;

const SectionHeader = styled.div`
  padding: 20px 24px;
  border-bottom: 1px solid #eee;
  display: flex;
  align-items: center;
  justify-content: space-between;
  h3 { margin: 0; font-size: 20px; font-weight: 700; color: #333; }
`;

const SectionTabs = styled.div`
  display: flex;
  gap: 2px;
  padding: 8px 20px;
  border-bottom: 1px solid #eee;
  background: #fafbfc;
`;

const SectionTab = styled.button`
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  background: ${p => p.$active ? '#667eea' : 'transparent'};
  color: ${p => p.$active ? 'white' : '#777'};
  &:hover {
    background: ${p => p.$active ? '#5a6fd8' : '#e8eaef'};
    color: ${p => p.$active ? 'white' : '#333'};
  }
`;

const FinancialTable = styled.table`
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  font-size: 12px;
  table-layout: fixed;

  th {
    text-align: right;
    padding: 8px 10px;
    background: #f0f2f5;
    color: #555;
    font-weight: 700;
    font-size: 12px;
    border-bottom: 2px solid #ddd;
    white-space: nowrap;
    position: sticky;
    top: 0;
    z-index: 1;
  }
  th:first-child {
    text-align: left;
    width: 140px;
    background: #e8eaf0;
  }

  td {
    padding: 6px 10px;
    text-align: right;
    font-variant-numeric: tabular-nums;
    font-size: 12px;
    letter-spacing: -0.2px;
    border-bottom: 1px solid #f2f2f2;
  }
  td:first-child {
    text-align: left;
    font-weight: 600;
    color: #333;
    background: #fafbfc;
    border-right: 1px solid #eee;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  tr {
    transition: background 0.15s;
  }
  tr:hover td {
    background: #f5f7ff;
  }
  tr:hover td:first-child {
    background: #eef1fa;
  }

  tr.highlight td {
    background: #f5f6fa;
    font-weight: 600;
  }
  tr.highlight:hover td {
    background: #f0f2ff;
  }

  tr.section-top td {
    border-top: 2px solid #e0e3ea;
  }

  tbody tr:nth-child(even) td {
    background: #fdfdfe;
  }
  tbody tr:nth-child(even) td:first-child {
    background: #f6f7f9;
  }
  tbody tr:nth-child(even):hover td {
    background: #f5f7ff;
  }
  tbody tr:nth-child(even):hover td:first-child {
    background: #eef1fa;
  }
`;

const NewsCard = styled.a`
  display: block; padding: 16px 20px; border-bottom: 1px solid #f0f0f0;
  text-decoration: none; transition: background 0.2s;
  &:hover { background: #f8f9fa; }
  &:last-child { border: none; }
  .title { font-size: 15px; font-weight: 600; color: #333; margin-bottom: 4px; }
  .meta { font-size: 12px; color: #999; }
`;

const FINANCIAL_TERMS_KR = {
  // 손익계산서
  'Total Revenue': '매출액',
  'Operating Revenue': '영업수익',
  'Cost Of Revenue': '매출원가',
  'Reconciled Cost Of Revenue': '매출원가(조정)',
  'Gross Profit': '매출총이익',
  'Operating Expense': '영업비용',
  'Total Expenses': '총 비용',
  'Operating Income': '영업이익',
  'Total Operating Income As Reported': '영업이익(보고)',
  'Net Income': '순이익',
  'Net Income Common Stockholders': '보통주주 순이익',
  'Net Income Continuous Operations': '계속사업 순이익',
  'Net Income From Continuing Operations': '계속사업 순이익',
  'Net Income From Continuing Operation Net Minority Interest': '계속사업 순이익(소수주주 제외)',
  'Net Income From Continuing And Discontinued Operation': '계속/중단사업 순이익',
  'Net Income Including Noncontrolling Interests': '순이익(비지배지분 포함)',
  'Diluted NI Availto Com Stockholders': '희석 보통주 순이익',
  'Normalized Income': '정상화 순이익',
  'EBIT': '세전영업이익(EBIT)',
  'EBITDA': 'EBITDA',
  'Normalized EBITDA': '정상화 EBITDA',
  'Pretax Income': '세전이익',
  'Tax Provision': '법인세비용',
  'Tax Effect Of Unusual Items': '비경상항목 세금효과',
  'Tax Rate For Calcs': '계산용 세율',
  'Interest Expense': '이자비용',
  'Interest Expense Non Operating': '영업외 이자비용',
  'Interest Income': '이자수익',
  'Interest Income Non Operating': '영업외 이자수익',
  'Net Interest Income': '순이자수익',
  'Net Non Operating Interest Income Expense': '영업외 순이자손익',
  'Other Income Expense': '기타수익/비용',
  'Other Non Operating Income Expenses': '영업외 기타손익',
  'Research And Development': '연구개발비',
  'Selling General And Administration': '판매관리비',
  'Stock Based Compensation': '주식보상비',
  'Depreciation And Amortization': '감가상각비',
  'Depreciation Amortization Depletion': '유무형 감가상각비',
  'Reconciled Depreciation': '감가상각비(조정)',
  'Basic EPS': '기본 주당순이익(EPS)',
  'Diluted EPS': '희석 주당순이익(EPS)',
  'Basic Average Shares': '기본 평균주식수',
  'Diluted Average Shares': '희석 평균주식수',
  'Total Unusual Items': '비경상항목 합계',
  'Total Unusual Items Excluding Goodwill': '비경상항목(영업권 제외)',
  // 대차대조표
  'Total Assets': '자산 총계',
  'Current Assets': '유동자산',
  'Total Non Current Assets': '비유동자산',
  'Cash And Cash Equivalents': '현금 및 현금성자산',
  'Cash Cash Equivalents And Short Term Investments': '현금 및 단기투자',
  'Cash Equivalents': '현금성자산',
  'Cash Financial': '금융현금',
  'Other Short Term Investments': '기타 단기투자',
  'Accounts Receivable': '매출채권',
  'Receivables': '수취채권',
  'Other Receivables': '기타 수취채권',
  'Inventory': '재고자산',
  'Other Current Assets': '기타 유동자산',
  'Available For Sale Securities': '매도가능증권',
  'Investments And Advances': '투자 및 선급금',
  'Other Investments': '기타 투자',
  'Investmentin Financial Assets': '금융자산 투자',
  'Net PPE': '유형자산(순)',
  'Gross PPE': '유형자산(총)',
  'Accumulated Depreciation': '감가상각누계액',
  'Land And Improvements': '토지 및 개량',
  'Machinery Furniture Equipment': '기계/가구/장비',
  'Other Properties': '기타 유형자산',
  'Properties': '부동산',
  'Leases': '리스자산',
  'Non Current Deferred Assets': '비유동 이연자산',
  'Non Current Deferred Taxes Assets': '비유동 이연법인세자산',
  'Other Non Current Assets': '기타 비유동자산',
  'Total Liabilities Net Minority Interest': '부채 총계(소수주주 제외)',
  'Current Liabilities': '유동부채',
  'Total Non Current Liabilities Net Minority Interest': '비유동부채(소수주주 제외)',
  'Accounts Payable': '매입채무',
  'Payables': '지급채무',
  'Payables And Accrued Expenses': '미지급금 및 미지급비용',
  'Tradeand Other Payables Non Current': '비유동 매입채무',
  'Current Accrued Expenses': '유동 미지급비용',
  'Current Debt': '유동 차입금',
  'Current Debt And Capital Lease Obligation': '유동 차입금 및 리스부채',
  'Current Capital Lease Obligation': '유동 리스부채',
  'Current Deferred Liabilities': '유동 이연부채',
  'Current Deferred Revenue': '유동 선수수익',
  'Other Current Liabilities': '기타 유동부채',
  'Other Current Borrowings': '기타 유동 차입금',
  'Commercial Paper': '기업어음',
  'Long Term Debt': '장기 차입금',
  'Long Term Debt And Capital Lease Obligation': '장기 차입금 및 리스부채',
  'Long Term Capital Lease Obligation': '장기 리스부채',
  'Capital Lease Obligations': '리스부채 합계',
  'Other Non Current Liabilities': '기타 비유동부채',
  'Income Tax Payable': '미지급법인세',
  'Total Tax Payable': '미지급세금 합계',
  'Deferred Tax': '이연법인세',
  'Deferred Income Tax': '이연법인세',
  'Total Debt': '차입금 합계',
  'Net Debt': '순차입금',
  'Total Equity Gross Minority Interest': '자본 총계(소수주주 포함)',
  'Stockholders Equity': '자본 총계',
  'Common Stock Equity': '보통주 자본',
  'Common Stock': '보통주',
  'Capital Stock': '자본금',
  'Retained Earnings': '이익잉여금',
  'Other Equity Adjustments': '기타 자본조정',
  'Gains Losses Not Affecting Retained Earnings': '기타 포괄손익',
  'Treasury Shares Number': '자기주식 수',
  'Share Issued': '발행주식수',
  'Ordinary Shares Number': '보통주식수',
  'Total Capitalization': '총 자본화',
  'Invested Capital': '투하자본',
  'Tangible Book Value': '유형 순자산',
  'Net Tangible Assets': '순유형자산',
  'Working Capital': '운전자본',
  // 현금흐름표
  'Operating Cash Flow': '영업활동 현금흐름',
  'Cash Flow From Continuing Operating Activities': '계속사업 영업 현금흐름',
  'Investing Cash Flow': '투자활동 현금흐름',
  'Cash Flow From Continuing Investing Activities': '계속사업 투자 현금흐름',
  'Financing Cash Flow': '재무활동 현금흐름',
  'Cash Flow From Continuing Financing Activities': '계속사업 재무 현금흐름',
  'Free Cash Flow': '잉여현금흐름(FCF)',
  'Changes In Cash': '현금 증감',
  'Beginning Cash Position': '기초 현금',
  'End Cash Position': '기말 현금',
  'Change In Working Capital': '운전자본 변동',
  'Change In Receivables': '매출채권 변동',
  'Changes In Account Receivables': '매출채권 변동',
  'Change In Inventory': '재고자산 변동',
  'Change In Payable': '매입채무 변동',
  'Change In Account Payable': '매입채무 변동',
  'Change In Payables And Accrued Expense': '미지급금 변동',
  'Change In Other Working Capital': '기타 운전자본 변동',
  'Change In Other Current Assets': '기타 유동자산 변동',
  'Change In Other Current Liabilities': '기타 유동부채 변동',
  'Capital Expenditure': '자본적 지출(CAPEX)',
  'Purchase Of PPE': '유형자산 취득',
  'Net PPE Purchase And Sale': '유형자산 순취득',
  'Purchase Of Business': '사업 인수',
  'Net Business Purchase And Sale': '순사업 인수/매각',
  'Purchase Of Investment': '투자자산 취득',
  'Sale Of Investment': '투자자산 매각',
  'Net Investment Purchase And Sale': '순투자자산 취득/매각',
  'Net Other Investing Changes': '기타 투자활동',
  'Issuance Of Capital Stock': '자본금 납입',
  'Common Stock Issuance': '보통주 발행',
  'Net Common Stock Issuance': '순 보통주 발행',
  'Common Stock Payments': '자사주 매입',
  'Repurchase Of Capital Stock': '자사주 매입',
  'Common Stock Dividend Paid': '배당금 지급',
  'Cash Dividends Paid': '현금배당 지급',
  'Issuance Of Debt': '차입금 조달',
  'Long Term Debt Issuance': '장기차입금 조달',
  'Net Long Term Debt Issuance': '순 장기차입금 조달',
  'Repayment Of Debt': '차입금 상환',
  'Long Term Debt Payments': '장기차입금 상환',
  'Net Short Term Debt Issuance': '순 단기차입금 조달',
  'Net Issuance Payments Of Debt': '순 차입금 변동',
  'Net Other Financing Charges': '기타 재무활동',
  'Other Non Cash Items': '기타 비현금 항목',
  'Income Tax Paid Supplemental Data': '법인세 납부액',
  'Interest Paid Supplemental Data': '이자 지급액',
};

const StockDetail = () => {
  const { symbol } = useParams();
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();

  const [stockData, setStockData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const [tradeType, setTradeType] = useState('buy');
  const [quantity, setQuantity] = useState('');
  const [trading, setTrading] = useState(false);

  const [maxBuyData, setMaxBuyData] = useState(null);
  const [loadingMaxBuy, setLoadingMaxBuy] = useState(false);
  const [marketStatus, setMarketStatus] = useState(null);
  const [holdingQuantity, setHoldingQuantity] = useState(0);
  const [shortQuantity, setShortQuantity] = useState(0);
  const [fractionalMode, setFractionalMode] = useState(false);

  // 재무제표/뉴스
  const [financials, setFinancials] = useState(null);
  const [news, setNews] = useState([]);
  const [finTab, setFinTab] = useState('income_statement');
  const [infoTab, setInfoTab] = useState('financials'); // 'financials' or 'news'
  const [loadingFin, setLoadingFin] = useState(false);
  const [loadingNews, setLoadingNews] = useState(false);

  useEffect(() => {
    loadStockData();
    loadMarketStatus();
    loadHolding();
    const statusTimer = setInterval(loadMarketStatus, 60 * 1000);
    return () => clearInterval(statusTimer);
  }, [symbol]); // eslint-disable-line

  useEffect(() => {
    if (stockData && tradeType === 'buy') {
      loadMaxBuyData();
    }
  }, [stockData, tradeType]); // eslint-disable-line

  useEffect(() => {
    if (stockData && infoTab === 'financials' && !financials) {
      loadFinancials();
    }
    if (stockData && infoTab === 'news' && news.length === 0) {
      loadNews();
    }
  }, [stockData, infoTab]); // eslint-disable-line

  const loadHolding = async () => {
    try {
      const response = await portfolioService.getPortfolio();
      const holdings = response.data?.holdings || [];
      const shortPositions = response.data?.short_positions || [];
      const holding = holdings.find(h => h.symbol === symbol);
      const shortHolding = shortPositions.find(h => h.symbol === symbol);
      setHoldingQuantity(holding ? holding.quantity : 0);
      setShortQuantity(shortHolding ? shortHolding.quantity : 0);
    } catch (err) {
      setHoldingQuantity(0);
      setShortQuantity(0);
    }
  };

  const loadMaxBuyData = async () => {
    try {
      setLoadingMaxBuy(true);
      const response = await portfolioService.getMaxBuyQuantity(symbol);
      setMaxBuyData(response.data);
    } catch (error) {
      console.error('Max buy data loading error:', error);
    } finally {
      setLoadingMaxBuy(false);
    }
  };

  const loadMarketStatus = async () => {
    try {
      const response = await stockService.getMarketHours();
      setMarketStatus(response.data);
    } catch (err) {}
  };

  const loadStockData = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await stockService.getStockDetail(symbol);
      setStockData(response.data);
    } catch (error) {
      setError(formatErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const loadFinancials = async () => {
    try {
      setLoadingFin(true);
      const response = await stockService.getStockFinancials(symbol);
      setFinancials(response.data);
    } catch (err) {
      console.error('Financials loading error:', err);
    } finally {
      setLoadingFin(false);
    }
  };

  const loadNews = async () => {
    try {
      setLoadingNews(true);
      const response = await stockService.getStockNews(symbol);
      setNews(response.data || []);
    } catch (err) {
      console.error('News loading error:', err);
    } finally {
      setLoadingNews(false);
    }
  };

  const handleMaxBuy = () => {
    if (!maxBuyData) return;
    if (fractionalMode) {
      if (maxBuyData.max_quantity_frac > 0) {
        setQuantity(maxBuyData.max_quantity_frac.toString());
      }
    } else {
      if (maxBuyData.max_quantity_int > 0) {
        setQuantity(maxBuyData.max_quantity_int.toString());
      }
    }
  };

  const handleTrade = async (e) => {
    e.preventDefault();

    if (!validateQuantity(parseFloat(quantity))) {
      setError('올바른 수량을 입력해주세요.');
      return;
    }

    setTrading(true);
    setError('');
    setSuccessMessage('');

    try {
      const quantityNum = parseFloat(quantity);
      let response;

      if (tradeType === 'buy') {
        response = await portfolioService.buyStock(symbol, quantityNum);
      } else if (tradeType === 'sell') {
        response = await portfolioService.sellStock(symbol, quantityNum);
      } else if (tradeType === 'short') {
        response = await portfolioService.shortSellStock(symbol, quantityNum);
      } else if (tradeType === 'cover') {
        response = await portfolioService.shortCoverStock(symbol, quantityNum);
      }

      setSuccessMessage(response.message);
      setQuantity('');

      if (response.data?.remaining_balance !== undefined && user) {
        updateUser({ ...user, balance: response.data.remaining_balance });
      } else {
        try {
          const { authService } = await import('../services/authService');
          const me = await authService.getCurrentUser();
          if (me.data) updateUser({ ...user, ...me.data });
        } catch {}
      }

      await Promise.all([loadStockData(), loadHolding()]);

    } catch (error) {
      setError(formatErrorMessage(error));
    } finally {
      setTrading(false);
    }
  };

  const calculateTradeAmount = () => {
    if (!stockData || !quantity) return 0;
    const currency = getCurrencyFromStock(stockData);
    const price = stockData.current_price;
    const qty = parseFloat(quantity || 0);
    if (currency !== 'KRW' && stockData.exchange_rate) {
      return price * stockData.exchange_rate * qty;
    }
    return price * qty;
  };

  const getCommissionInfo = () => {
    const market = stockData?.market || getCurrencyFromStock(stockData);
    const rates = { KRW: 0.00015, USD: 0.00005, HKD: 0.0001, EUR: 0.0001 };
    const mins = { KRW: 1000, USD: 1350, HKD: 1000, EUR: 1500 };
    const baseRate = rates[market] || 0.001;
    const status = marketStatus?.[market];
    const isAfterHours = status ? status.is_after_hours : false;
    const multiplier = isAfterHours ? 3 : 1;
    const effectiveRate = baseRate * multiplier;
    return { baseRate, effectiveRate, isAfterHours, multiplier, minCommission: mins[market] || 1000, market };
  };

  const calculateCommission = () => {
    const amount = calculateTradeAmount();
    const { effectiveRate, minCommission } = getCommissionInfo();
    return Math.max(amount * effectiveRate, minCommission);
  };

  const calculateMarginRequired = () => {
    const amount = calculateTradeAmount();
    return Math.round(amount * 1.5); // 150% margin
  };

  const renderPrice = (price, field = 'current_price') => {
    if (!stockData) return '';
    const currency = getCurrencyFromStock(stockData);
    const value = stockData[field] || price;
    const currencySymbols = { USD: '$', HKD: 'HK$', EUR: '€', GBP: '£' };
    const priceSym = currencySymbols[stockData.price_currency] || currencySymbols[currency] || '';
    if (currency !== 'KRW' && stockData.exchange_rate) {
      const convertedPrice = value * stockData.exchange_rate;
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
          <span>₩{formatNumber(Math.round(convertedPrice))}</span>
          <span className="original-price" style={{ marginLeft: 0 }}>{priceSym}{formatNumber(value)}</span>
        </div>
      );
    }
    return `₩${formatNumber(value)}`;
  };

  const renderFinancialSection = () => {
    if (loadingFin) return <div style={{ padding: 20, textAlign: 'center', color: '#999' }}>재무제표 로딩 중...</div>;
    if (!financials) return <div style={{ padding: 20, textAlign: 'center', color: '#999' }}>재무제표를 불러올 수 없습니다.</div>;

    const data = financials[finTab];
    if (!data || Object.keys(data).length === 0) {
      return <div style={{ padding: 20, textAlign: 'center', color: '#999' }}>데이터가 없습니다.</div>;
    }

    const dates = Object.keys(data).sort((a, b) => b.localeCompare(a)).slice(0, 4);
    const allRows = new Set();
    dates.forEach(d => Object.keys(data[d]).forEach(k => allRows.add(k)));

    // 핵심 항목 우선 정렬
    const priorityOrder = {
      income_statement: [
        'Total Revenue', 'Cost Of Revenue', 'Gross Profit',
        'Operating Expense', 'Selling General And Administration', 'Research And Development',
        'Operating Income', 'EBITDA', 'EBIT',
        'Interest Expense', 'Pretax Income', 'Tax Provision',
        'Net Income', 'Net Income Common Stockholders',
        'Basic EPS', 'Diluted EPS',
        'Basic Average Shares', 'Diluted Average Shares',
      ],
      balance_sheet: [
        'Total Assets', 'Current Assets',
        'Cash And Cash Equivalents', 'Accounts Receivable', 'Inventory',
        'Total Non Current Assets', 'Net PPE', 'Investments And Advances',
        'Total Liabilities Net Minority Interest', 'Current Liabilities',
        'Accounts Payable', 'Current Debt',
        'Long Term Debt', 'Total Debt', 'Net Debt',
        'Stockholders Equity', 'Common Stock', 'Retained Earnings',
        'Working Capital', 'Invested Capital',
      ],
      cashflow: [
        'Operating Cash Flow', 'Capital Expenditure', 'Free Cash Flow',
        'Investing Cash Flow', 'Financing Cash Flow',
        'Change In Working Capital', 'Depreciation And Amortization',
        'Stock Based Compensation',
        'Common Stock Dividend Paid', 'Repurchase Of Capital Stock',
        'Net Issuance Payments Of Debt',
        'Changes In Cash', 'Beginning Cash Position', 'End Cash Position',
      ],
    };

    const priority = priorityOrder[finTab] || [];
    const sortedRows = [
      ...priority.filter(r => allRows.has(r)),
      ...[...allRows].filter(r => !priority.includes(r)),
    ].slice(0, 25);

    // 핵심 항목 (볼드 강조)
    const highlightRows = new Set([
      'Total Revenue', 'Gross Profit', 'Operating Income', 'Net Income', 'EBITDA',
      'Basic EPS', 'Diluted EPS',
      'Total Assets', 'Total Liabilities Net Minority Interest', 'Stockholders Equity',
      'Total Debt', 'Cash And Cash Equivalents', 'Working Capital',
      'Operating Cash Flow', 'Free Cash Flow', 'Financing Cash Flow', 'Investing Cash Flow',
    ]);

    // 섹션 구분 (위에 굵은 선 추가)
    const sectionTopRows = new Set({
      income_statement: ['Operating Income', 'Pretax Income', 'Net Income', 'Basic EPS'],
      balance_sheet: ['Total Liabilities Net Minority Interest', 'Stockholders Equity', 'Working Capital'],
      cashflow: ['Investing Cash Flow', 'Financing Cash Flow', 'Changes In Cash'],
    }[finTab] || []);

    const formatFinValue = (val) => {
      if (val === null || val === undefined || val === 0) return <span style={{ color: '#ccc' }}>-</span>;
      const abs = Math.abs(val);
      let formatted;
      if (abs >= 1e12) formatted = `${(val / 1e12).toFixed(2)}조`;
      else if (abs >= 1e8) formatted = `${(val / 1e8).toFixed(1)}억`;
      else if (abs >= 1e6) formatted = `${(val / 1e6).toFixed(1)}M`;
      else if (abs >= 1e3) formatted = `${(val / 1e3).toFixed(1)}K`;
      else formatted = formatNumber(Math.round(val));
      return formatted;
    };

    const formatDateLabel = (d) => {
      const parts = d.split('-');
      if (parts.length >= 2) return `'${parts[0].slice(2)}.${parts[1]}`;
      return d;
    };

    // YoY 변동률 계산
    const calcYoY = (row, dateIdx) => {
      if (dateIdx >= dates.length - 1) return null;
      const curr = data[dates[dateIdx]]?.[row];
      const prev = data[dates[dateIdx + 1]]?.[row];
      if (!curr || !prev || prev === 0) return null;
      return ((curr - prev) / Math.abs(prev)) * 100;
    };

    return (
      <div style={{ overflowX: 'auto' }}>
        <FinancialTable>
          <thead>
            <tr>
              <th>항목</th>
              {dates.map((d, i) => (
                <th key={d}>
                  {formatDateLabel(d)}
                  {i === 0 && <span style={{ fontSize: 10, fontWeight: 400, display: 'block', color: '#999' }}>최신</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((row) => {
              const krName = FINANCIAL_TERMS_KR[row];
              const isHighlight = highlightRows.has(row);
              const isSectionTop = sectionTopRows.has(row);
              const classes = [
                isHighlight ? 'highlight' : '',
                isSectionTop ? 'section-top' : '',
              ].filter(Boolean).join(' ');

              return (
                <tr key={row} className={classes}>
                  <td title={row}>
                    <span style={{ fontSize: 12, lineHeight: 1.2 }}>{krName || row}</span>
                  </td>
                  {dates.map((d, i) => {
                    const val = data[d]?.[row];
                    const yoy = calcYoY(row, i);
                    const isNeg = val < 0;
                    return (
                      <td key={d} style={{
                        color: isNeg ? '#e74c3c' : isHighlight ? '#222' : '#444',
                        fontWeight: isHighlight ? 700 : 400,
                      }}>
                        <span>{formatFinValue(val)}</span>
                        {yoy !== null && (
                          <span style={{
                            fontSize: 10,
                            marginLeft: 4,
                            color: yoy > 0 ? '#27ae60' : yoy < 0 ? '#e74c3c' : '#999',
                            fontWeight: 600,
                          }}>
                            {yoy > 0 ? '+' : ''}{yoy.toFixed(1)}%
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </FinancialTable>
      </div>
    );
  };

  const renderNewsSection = () => {
    if (loadingNews) return <div style={{ padding: 20, textAlign: 'center', color: '#999' }}>뉴스 로딩 중...</div>;
    if (news.length === 0) return <div style={{ padding: 20, textAlign: 'center', color: '#999' }}>뉴스가 없습니다.</div>;

    return news.map((item, i) => (
      <NewsCard key={i} href={item.link} target="_blank" rel="noopener noreferrer">
        <div className="title">{item.title}</div>
        <div className="meta">
          {item.publisher && <span>{item.publisher}</span>}
          {item.published && <span> · {formatRelativeTime(item.published)}</span>}
        </div>
      </NewsCard>
    ));
  };

  if (loading) {
    return <Container><LoadingState><div className="spinner"></div></LoadingState></Container>;
  }

  if (error && !stockData) {
    return (
      <Container>
        <BackButton onClick={() => navigate('/markets')}>← 시장으로 돌아가기</BackButton>
        <ErrorMessage>{error}</ErrorMessage>
      </Container>
    );
  }

  const currency = getCurrencyFromStock(stockData);
  const isForeign = currency !== 'KRW';
  const priceCurrSym = { USD: '$', HKD: 'HK$', EUR: '€', GBP: '£' }[stockData?.price_currency || currency] || '';
  const tradeAmount = calculateTradeAmount();
  const commission = (tradeType === 'short') ? 0 : calculateCommission();
  const totalAmount = tradeType === 'buy' ? tradeAmount + commission
    : tradeType === 'sell' ? tradeAmount - commission
    : tradeType === 'short' ? calculateMarginRequired()
    : tradeAmount - commission;
  const commissionInfo = getCommissionInfo();
  const currentMarketStatus = marketStatus?.[commissionInfo.market];
  const isETF = stockData?.type === 'etf';

  return (
    <Container>
      <BackButton onClick={() => navigate('/markets')}>← 시장으로 돌아가기</BackButton>

      {currentMarketStatus && (
        <div style={{
          background: currentMarketStatus.is_open ? '#eafaf1' : '#fdf2f2',
          border: `1px solid ${currentMarketStatus.is_open ? '#27ae60' : '#e74c3c'}`,
          borderRadius: '8px', padding: '12px 16px', marginBottom: '16px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px'
        }}>
          <div>
            <span style={{ fontWeight: 600, color: '#333' }}>{currentMarketStatus.name}</span>
            <span style={{
              marginLeft: '8px', padding: '2px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 600,
              background: currentMarketStatus.is_open ? '#27ae60' : '#e74c3c', color: 'white'
            }}>
              {currentMarketStatus.is_open ? '개장' : currentMarketStatus.is_weekend ? '주말 휴장' : '폐장'}
            </span>
          </div>
          <div style={{ fontSize: '13px', color: '#666' }}>
            장시간: {currentMarketStatus.open_time_kst || currentMarketStatus.open_time} ~ {currentMarketStatus.close_time_kst || currentMarketStatus.close_time} (KST)
            {!currentMarketStatus.is_open && !currentMarketStatus.is_weekend && (
              <span style={{ color: '#e74c3c', marginLeft: '8px', fontWeight: 600 }}>
                시간외 수수료 적용 (x{currentMarketStatus.after_hours_multiplier})
              </span>
            )}
          </div>
        </div>
      )}

      {currency !== 'KRW' && stockData?.exchange_rate && (
        <ExchangeRateInfo>
          <div className="title">현재 환율</div>
          <div className="rate">1 {stockData.price_currency || currency} = ₩{formatNumber(Math.round(stockData.exchange_rate))}</div>
        </ExchangeRateInfo>
      )}

      {stockData && (
        <>
          <StockHeader>
            <StockInfo>
              <div className="name">{stockData.name}</div>
              <div className="symbol">
                {stockData.symbol}
                {isETF && <ETFBadge>ETF</ETFBadge>}
              </div>
              <div className="price-container">
                <span className="price">{formatStockPrice(stockData)}</span>
                {isForeign && stockData.exchange_rate && (
                  <span className="original-price">{priceCurrSym}{formatNumber(stockData.current_price)}</span>
                )}
              </div>
              <div className="change" style={{ color: getProfitColor(stockData.change) }}>
                <span>{formatStockChange(stockData)}</span>
                <span>
                  ({stockData.change_percent >= 0 ? '+' : ''}{formatPercent(stockData.change_percent)})
                </span>
              </div>
            </StockInfo>

            <StockStats>
              <StatItem>
                <div className="label">시가</div>
                <div className="value">{renderPrice(stockData.open_price, 'open_price')}</div>
              </StatItem>
              <StatItem>
                <div className="label">고가</div>
                <div className="value">{renderPrice(stockData.high_price, 'high_price')}</div>
              </StatItem>
              <StatItem>
                <div className="label">저가</div>
                <div className="value">{renderPrice(stockData.low_price, 'low_price')}</div>
              </StatItem>
              <StatItem>
                <div className="label">거래량</div>
                <div className="value">{formatNumber(stockData.volume)}</div>
              </StatItem>
            </StockStats>
          </StockHeader>

          <ContentGrid>
            <StockChart symbol={symbol} stockInfo={stockData} />

            <TradingCard>
              <TradingHeader>
                <h3>주식 거래</h3>
              </TradingHeader>
              <TradingContent>
                {error && <ErrorMessage>{error}</ErrorMessage>}
                {successMessage && <SuccessMessage>{successMessage}</SuccessMessage>}

                <TradingTabs>
                  <TradingTab active={tradeType === 'buy'} onClick={() => setTradeType('buy')}>매수</TradingTab>
                  <TradingTab active={tradeType === 'sell'} onClick={() => setTradeType('sell')}>매도</TradingTab>
                  <TradingTab active={tradeType === 'short'} $color="#8e44ad" onClick={() => setTradeType('short')}>공매도</TradingTab>
                  {shortQuantity > 0 && (
                    <TradingTab active={tradeType === 'cover'} $color="#27ae60" onClick={() => setTradeType('cover')}>숏커버</TradingTab>
                  )}
                </TradingTabs>

                {tradeType === 'short' && (
                  <div style={{
                    background: 'rgba(142,68,173,0.08)', border: '1px solid rgba(142,68,173,0.2)',
                    borderRadius: 8, padding: '12px 16px', marginBottom: 16, fontSize: 13, color: '#8e44ad',
                  }}>
                    <div style={{ fontWeight: 700, marginBottom: 4 }}>공매도란?</div>
                    <div style={{ color: '#666', lineHeight: 1.6 }}>
                      주가 하락이 예상될 때 수익을 얻는 투자 방법입니다.<br/>
                      주식을 빌려서 먼저 팔고, 나중에 더 싼 가격에 사서 돌려줍니다.<br/>
                      <span style={{ color: '#e74c3c' }}>증거금(매도금액의 150%)이 필요하며, 주가가 오르면 손실이 발생합니다.</span>
                    </div>
                  </div>
                )}

                <TradeForm onSubmit={handleTrade}>
                  <InputGroup>
                    <Label>수량</Label>
                    <Input
                      type="number"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      placeholder="거래할 수량을 입력하세요"
                      min={fractionalMode ? "0.0001" : "1"}
                      step={fractionalMode ? "0.0001" : "1"}
                      required
                    />
                    {(tradeType === 'buy' || tradeType === 'sell') && (
                      <label style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        fontSize: 13, color: '#666', marginTop: 4, cursor: 'pointer',
                      }}>
                        <input
                          type="checkbox"
                          checked={fractionalMode}
                          onChange={(e) => { setFractionalMode(e.target.checked); setQuantity(''); }}
                          style={{ accentColor: '#667eea' }}
                        />
                        소수점 거래 (0.0001주 단위)
                      </label>
                    )}
                    {tradeType === 'buy' && maxBuyData && (
                      <>
                        <MaxBuyButton type="button" onClick={handleMaxBuy}
                          disabled={loadingMaxBuy || (fractionalMode ? maxBuyData.max_quantity_frac === 0 : maxBuyData.max_quantity_int === 0)}>
                          {loadingMaxBuy ? '계산중...'
                            : fractionalMode
                              ? (maxBuyData.max_quantity_frac === 0 ? '전량매수 불가 (잔액 부족)'
                                : `소수점 전량매수 (${formatQuantity(maxBuyData.max_quantity_frac)}주 - ₩${formatNumber(Math.round(maxBuyData.total_cost))})`)
                              : (maxBuyData.max_quantity_int === 0 ? '전량매수 불가 (잔액 부족)'
                                : `전량매수 (${maxBuyData.max_quantity_int}주 - ₩${formatNumber(Math.round(maxBuyData.total_cost_int))})`)
                          }
                        </MaxBuyButton>
                      </>
                    )}
                    {tradeType === 'sell' && (
                      <MaxBuyButton type="button"
                        onClick={() => holdingQuantity > 0 && setQuantity(
                          fractionalMode ? holdingQuantity.toString() : Math.floor(holdingQuantity).toString()
                        )}
                        disabled={holdingQuantity === 0}>
                        {holdingQuantity === 0 ? '보유 수량 없음'
                          : fractionalMode
                            ? `전량매도 (보유: ${formatQuantity(holdingQuantity)}주)`
                            : `전량매도 (보유: ${Math.floor(holdingQuantity)}주)`
                        }
                      </MaxBuyButton>
                    )}
                    {tradeType === 'cover' && shortQuantity > 0 && (
                      <MaxBuyButton type="button"
                        onClick={() => setQuantity(shortQuantity.toString())}>
                        전량 숏커버 (숏: {formatQuantity(shortQuantity)}주)
                      </MaxBuyButton>
                    )}
                  </InputGroup>

                  {quantity && (
                    <TradeInfo>
                      <div className="row">
                        <span>주문가격:</span>
                        <span>{formatStockPrice(stockData)}</span>
                      </div>
                      {tradeType === 'short' ? (
                        <>
                          <div className="row">
                            <span>매도대금:</span>
                            <span>₩{formatNumber(Math.round(tradeAmount))}</span>
                          </div>
                          <div className="row">
                            <span>필요 증거금 (150%):</span>
                            <span style={{ color: '#8e44ad', fontWeight: 700 }}>₩{formatNumber(calculateMarginRequired())}</span>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="row">
                            <span>거래금액:</span>
                            <span>
                              ₩{formatNumber(Math.round(tradeAmount))}
                              {isForeign && stockData.exchange_rate && (
                                <span className="original-amount">
                                  ({priceCurrSym}{formatNumber(stockData.current_price * parseFloat(quantity || 0))})
                                </span>
                              )}
                            </span>
                          </div>
                          <div className="row">
                            <span>
                              수수료 ({(commissionInfo.effectiveRate * 100).toFixed(3)}%)
                              {commissionInfo.isAfterHours && (
                                <span style={{ color: '#e74c3c', fontSize: '11px', marginLeft: '4px' }}>
                                  (시간외 x{commissionInfo.multiplier})
                                </span>
                              )}:
                            </span>
                            <span>₩{formatNumber(Math.round(commission))}</span>
                          </div>
                          <div className="row">
                            <span>총 {tradeType === 'buy' ? '결제' : tradeType === 'cover' ? '청산' : '수령'}금액:</span>
                            <span>₩{formatNumber(Math.round(totalAmount))}</span>
                          </div>
                        </>
                      )}
                    </TradeInfo>
                  )}

                  <TradeButton type="submit"
                    className={tradeType === 'short' ? 'short' : tradeType === 'cover' ? 'sell' : tradeType}
                    disabled={trading || !quantity}>
                    {trading ? '처리 중...' : (
                      tradeType === 'buy' ? '매수하기'
                      : tradeType === 'sell' ? '매도하기'
                      : tradeType === 'short' ? '공매도하기'
                      : '숏커버하기'
                    )}
                  </TradeButton>
                </TradeForm>
              </TradingContent>
            </TradingCard>
          </ContentGrid>

          {/* 재무제표 / 뉴스 섹션 */}
          <SectionCard>
            <SectionHeader>
              <h3>기업 정보</h3>
            </SectionHeader>
            <SectionTabs>
              <SectionTab $active={infoTab === 'financials'} onClick={() => setInfoTab('financials')}>재무제표</SectionTab>
              <SectionTab $active={infoTab === 'news'} onClick={() => setInfoTab('news')}>뉴스</SectionTab>
            </SectionTabs>

            {infoTab === 'financials' && (
              <>
                <SectionTabs>
                  <SectionTab $active={finTab === 'income_statement'} onClick={() => setFinTab('income_statement')}>손익계산서</SectionTab>
                  <SectionTab $active={finTab === 'balance_sheet'} onClick={() => setFinTab('balance_sheet')}>대차대조표</SectionTab>
                  <SectionTab $active={finTab === 'cashflow'} onClick={() => setFinTab('cashflow')}>현금흐름표</SectionTab>
                </SectionTabs>
                {renderFinancialSection()}
              </>
            )}

            {infoTab === 'news' && (
              <div>
                {renderNewsSection()}
              </div>
            )}
          </SectionCard>
        </>
      )}
    </Container>
  );
};

export default StockDetail;
