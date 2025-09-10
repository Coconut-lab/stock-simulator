import api from './api';

export const portfolioService = {
  // 포트폴리오 조회
  getPortfolio: async () => {
    try {
      const response = await api.get('/portfolio/');
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: '포트폴리오 조회에 실패했습니다.' };
    }
  },

  // 주식 매수
  buyStock: async (symbol, quantity) => {
    try {
      const response = await api.post('/portfolio/buy', {
        symbol,
        quantity
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: '주식 매수에 실패했습니다.' };
    }
  },

  // 주식 매도
  sellStock: async (symbol, quantity) => {
    try {
      const response = await api.post('/portfolio/sell', {
        symbol,
        quantity
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: '주식 매도에 실패했습니다.' };
    }
  },

  // 거래 이력 조회
  getTransactions: async (limit = 50) => {
    try {
      const response = await api.get(`/portfolio/transactions?limit=${limit}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: '거래 이력 조회에 실패했습니다.' };
    }
  },

  // 포트폴리오 요약 정보
  getPortfolioSummary: async () => {
    try {
      const response = await api.get('/portfolio/summary');
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: '포트폴리오 요약 조회에 실패했습니다.' };
    }
  }
};
