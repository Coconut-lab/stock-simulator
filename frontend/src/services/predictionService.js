import api from './api';

export const predictionService = {
  getPredictions: async (status = null) => {
    try {
      const params = status ? { status } : {};
      const response = await api.get('/predictions/list', { params });
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: '예측 목록 조회에 실패했습니다.' };
    }
  },

  getPrediction: async (id) => {
    try {
      const response = await api.get(`/predictions/get/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: '예측 조회에 실패했습니다.' };
    }
  },

  placeBet: async (predictionId, choice, amount) => {
    try {
      const response = await api.post(`/predictions/bet/${predictionId}`, { choice, amount });
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: '베팅에 실패했습니다.' };
    }
  },

  getMyBetOn: async (predictionId) => {
    try {
      const response = await api.get(`/predictions/my-bet/${predictionId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: '내 베팅 조회에 실패했습니다.' };
    }
  },

  getMyBets: async () => {
    try {
      const response = await api.get('/predictions/my-bets');
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: '베팅 내역 조회에 실패했습니다.' };
    }
  },

  // 관리자
  createPrediction: async (data) => {
    try {
      const response = await api.post('/predictions/create', data);
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: '예측 생성에 실패했습니다.' };
    }
  },

  closePrediction: async (id) => {
    try {
      const response = await api.put(`/predictions/close/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: '예측 마감에 실패했습니다.' };
    }
  },

  settlePrediction: async (id, result) => {
    try {
      const response = await api.put(`/predictions/settle/${id}`, { result });
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: '정산에 실패했습니다.' };
    }
  },

  updateDeadline: async (id, deadline) => {
    try {
      const response = await api.put(`/predictions/update-deadline/${id}`, { deadline });
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: '마감일시 변경에 실패했습니다.' };
    }
  },

  deletePrediction: async (id) => {
    try {
      const response = await api.delete(`/predictions/remove/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: '예측 삭제에 실패했습니다.' };
    }
  },

  getAdminBets: async (predictionId) => {
    try {
      const response = await api.get(`/predictions/admin/bets/${predictionId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: '베팅 상세 조회에 실패했습니다.' };
    }
  },

  getAdminPredictions: async () => {
    try {
      const response = await api.get('/predictions/admin/all');
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: '관리자 예측 조회에 실패했습니다.' };
    }
  },
};
