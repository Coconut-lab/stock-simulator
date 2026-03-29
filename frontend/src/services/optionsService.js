import api from './api';

export const optionsService = {
  getOptionChain: async (underlying) => {
    try {
      const response = await api.get(`/options/chain/${underlying}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: '옵션 체인 조회에 실패했습니다.' };
    }
  },

  getContractDetail: async (contractId) => {
    try {
      const response = await api.get(`/options/contract/${contractId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: '옵션 계약 상세 조회에 실패했습니다.' };
    }
  },

  buyOption: async (contractId, quantity) => {
    try {
      const response = await api.post('/options/buy', {
        contract_id: contractId,
        quantity,
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: '옵션 매수에 실패했습니다.' };
    }
  },

  closePosition: async (positionId) => {
    try {
      const response = await api.post('/options/close', {
        position_id: positionId,
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: '옵션 청산에 실패했습니다.' };
    }
  },

  exerciseOption: async (positionId) => {
    try {
      const response = await api.post('/options/exercise', {
        position_id: positionId,
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: '옵션 행사에 실패했습니다.' };
    }
  },

  getPositions: async () => {
    try {
      const response = await api.get('/options/positions');
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: '옵션 포지션 조회에 실패했습니다.' };
    }
  },
};
