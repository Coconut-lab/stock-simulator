// 숫자 포맷팅 함수들

// 통화 포맷팅 (한국원, 미국달러)
export const formatCurrency = (amount, currency = 'KRW', exchangeRate = null) => {
  if (typeof amount !== 'number') return '0';
  
  // 미국 주식인 경우 환율 적용
  if (currency === 'USD' && exchangeRate) {
    const convertedAmount = amount * exchangeRate;
    return `₩${formatNumber(Math.round(convertedAmount))}`;
  }
  
  const options = {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: currency === 'KRW' ? 0 : 2,
  };
  
  try {
    return new Intl.NumberFormat(currency === 'KRW' ? 'ko-KR' : 'en-US', options).format(amount);
  } catch (error) {
    return `${currency === 'KRW' ? '₩' : '$'}${formatNumber(amount)}`;
  }
};

// 숫자 포맷팅 (천 단위 콤마)
export const formatNumber = (number) => {
  if (typeof number !== 'number') return '0';
  return number.toLocaleString();
};

// 퍼센트 포맷팅
export const formatPercent = (number, decimals = 2) => {
  if (typeof number !== 'number') return '0.00%';
  return `${number.toFixed(decimals)}%`;
};

// 손익에 따른 색상 반환 (한국 기준: 빨강=수익, 파랑=손실)
export const getProfitColor = (value) => {
  if (value > 0) return '#e74c3c'; // 빨간색 (수익)
  if (value < 0) return '#2980b9'; // 파란색 (손실) 
  return '#95a5a6'; // 회색 (변동없음)
};

// 손익 표시 문자열 (+/- 포함)
export const formatProfitLoss = (value, currency = 'KRW', exchangeRate = null) => {
  if (typeof value !== 'number') return '0';
  
  const sign = value >= 0 ? '+' : '';
  const formattedValue = formatCurrency(Math.abs(value), currency, exchangeRate);
  
  return `${sign}${value >= 0 ? formattedValue : `-${formattedValue}`}`;
};

// 날짜 포맷팅
export const formatDate = (date) => {
  if (!date) return '';
  
  const d = new Date(date);
  return d.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// 상대 시간 포맷팅 (예: "5분 전")
export const formatRelativeTime = (date) => {
  if (!date) return '';
  
  const now = new Date();
  const target = new Date(date);
  const diffMs = now - target;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffMins < 1) return '방금 전';
  if (diffMins < 60) return `${diffMins}분 전`;
  if (diffHours < 24) return `${diffHours}시간 전`;
  if (diffDays < 7) return `${diffDays}일 전`;
  
  return formatDate(date);
};

// 주식 심볼에서 시장 구분
export const getMarketFromSymbol = (symbol) => {
  // 숫자 6자리는 한국 주식
  if (symbol.match(/^\d{6}$/)) return 'KRW';
  // .KS, .KQ로 끝나는 경우도 한국 주식
  if (symbol.endsWith('.KS') || symbol.endsWith('.KQ')) return 'KRW';
  return 'USD';
};

// 주식 데이터에서 통화 정보 추출
export const getCurrencyFromStock = (stock) => {
  if (stock.currency) return stock.currency;
  if (stock.market === 'KRW' || stock.market === 'USD') return stock.market;
  return getMarketFromSymbol(stock.symbol);
};

// 시장에 따른 통화 단위 반환
export const getCurrencyFromMarket = (market) => {
  return market === 'KRW' ? 'KRW' : 'USD';
};

// 주식 가격 포맷팅 (환율 적용)
export const formatStockPrice = (stock, showSymbol = true) => {
  const currency = getCurrencyFromStock(stock);
  const price = stock.current_price || 0;
  
  if (currency === 'USD' && stock.exchange_rate) {
    // 미국 주식은 환율 적용하여 원화로 표시
    const convertedPrice = price * stock.exchange_rate;
    return showSymbol ? 
      `₩${formatNumber(Math.round(convertedPrice))}` : 
      formatNumber(Math.round(convertedPrice));
  } else if (currency === 'KRW') {
    // 한국 주식은 원화로 표시
    return showSymbol ? 
      `₩${formatNumber(price)}` : 
      formatNumber(price);
  } else {
    // 기본값은 달러
    return showSymbol ? 
      `$${formatNumber(price)}` : 
      formatNumber(price);
  }
};

// 주식 변동 금액 포맷팅
export const formatStockChange = (stock) => {
  const currency = getCurrencyFromStock(stock);
  const change = stock.change || 0;
  
  if (currency === 'USD' && stock.exchange_rate) {
    const convertedChange = change * stock.exchange_rate;
    const sign = convertedChange >= 0 ? '+' : '';
    return `${sign}₩${formatNumber(Math.round(Math.abs(convertedChange)))}`;
  } else if (currency === 'KRW') {
    const sign = change >= 0 ? '+' : '';
    return `${sign}₩${formatNumber(Math.abs(change))}`;
  } else {
    const sign = change >= 0 ? '+' : '';
    return `${sign}$${formatNumber(Math.abs(change))}`;
  }
};

// 유효성 검사 함수들
export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePassword = (password) => {
  return password.length >= 6;
};

export const validateQuantity = (quantity) => {
  return !isNaN(quantity) && quantity > 0;
};

// 에러 메시지 포맷팅
export const formatErrorMessage = (error) => {
  if (typeof error === 'string') return error;
  if (error?.error) return error.error;
  if (error?.message) return error.message;
  return '알 수 없는 오류가 발생했습니다.';
};

// 로컬 스토리지 헬퍼
export const storage = {
  get: (key) => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.error('Storage get error:', error);
      return null;
    }
  },
  
  set: (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error('Storage set error:', error);
    }
  },
  
  remove: (key) => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error('Storage remove error:', error);
    }
  }
};
