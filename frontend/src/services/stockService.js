import api from './api';

export const stockService = {
  // 시장 요약 정보 조회
  getMarketSummary: async () => {
    try {
      const response = await api.get('/stocks/market-summary');
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: '시장 정보 조회에 실패했습니다.' };
    }
  },

  // 주식 검색
  searchStocks: async (query) => {
    try {
      const response = await api.get('/stocks/search', {params: {q: query}});
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: '주식 검색에 실패했습니다.' };
    }
  },

  // 특정 주식 상세 정보 조회
  getStockDetail: async (symbol) => {
    try {
      const response = await api.get(`/stocks/${symbol}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: '주식 정보 조회에 실패했습니다.' };
    }
  },

  // 특정 주식 현재가 조회
  getStockPrice: async (symbol) => {
    try {
      const response = await api.get(`/stocks/price/${symbol}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: '주식 가격 조회에 실패했습니다.' };
    }
  },

  // 여러 주식 정보 한번에 조회
  getMultipleStocks: async (symbols) => {
    try {
      const response = await api.post('/stocks/multiple', { symbols });
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: '주식 정보 조회에 실패했습니다.' };
    }
  },

  // 한국 주식 목록 조회
  getKoreanStocks: async () => {
    try {
      const response = await api.get('/stocks/korean');
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: '한국 주식 정보 조회에 실패했습니다.' };
    }
  },

  // 미국 주식 목록 조회
  getUSStocks: async () => {
    try {
      const response = await api.get('/stocks/us');
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: '미국 주식 정보 조회에 실패했습니다.' };
    }
  },

  // 주식 이력 데이터 조회 (차트용)
  getStockHistory: async (symbol, period = 30) => {
    try {
      const response = await api.get(`/stocks/history/${symbol}?period=${period}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: '주식 이력 조회에 실패했습니다.' };
    }
  }
};
