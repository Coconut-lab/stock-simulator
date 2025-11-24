import api from './api';

export const marketService = {
  /**
   * 모든 시장의 운영 시간 조회
   */
  getMarketHours: async () => {
    return await api.get('/market/hours');
  },

  /**
   * 특정 시장의 운영 시간 조회
   */
  getMarketHoursByMarket: async (market) => {
    return await api.get(`/market/hours/${market}`);
  },

  /**
   * 모든 시장의 현재 상태 조회 (열림/닫힘)
   */
  getMarketStatus: async () => {
    return await api.get('/market/status');
  },

  /**
   * 특정 시장의 현재 상태 조회
   */
  getMarketStatusByMarket: async (market) => {
    return await api.get(`/market/status/${market}`);
  }
};
