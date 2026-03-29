import api from './api';

export const futuresService = {
  getContracts: async () => {
    try {
      const response = await api.get('/futures/contracts');
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: '선물 계약 조회에 실패했습니다.' };
    }
  },

  getContractDetail: async (contractId) => {
    try {
      const response = await api.get(`/futures/contracts/${contractId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: '선물 계약 상세 조회에 실패했습니다.' };
    }
  },

  openPosition: async (contractId, direction, quantity) => {
    try {
      const response = await api.post('/futures/open', {
        contract_id: contractId,
        direction,
        quantity,
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: '선물 포지션 오픈에 실패했습니다.' };
    }
  },

  closePosition: async (positionId) => {
    try {
      const response = await api.post('/futures/close', {
        position_id: positionId,
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: '선물 포지션 청산에 실패했습니다.' };
    }
  },

  getPositions: async () => {
    try {
      const response = await api.get('/futures/positions');
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: '선물 포지션 조회에 실패했습니다.' };
    }
  },

  getPositionHistory: async (limit = 50) => {
    try {
      const response = await api.get(`/futures/positions/history?limit=${limit}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: '선물 청산 내역 조회에 실패했습니다.' };
    }
  },
};
