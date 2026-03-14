import api from './api';

export const predictionService = {
  getPredictions: async (status = null) => {
    try {
      const params = status ? { status } : {};
      const response = await api.get('/predictions/', { params });
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: '예측 목록 조회에 실패했습니다.' };
    }
  },

  getPrediction: async (id) => {
    try {
      const response = await api.get(`/predictions/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: '예측 조회에 실패했습니다.' };
    }
  },

  placeBet: async (predictionId, choice, amount) => {
    try {
      const response = await api.post(`/predictions/${predictionId}/bet`, { choice, amount });
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: '베팅에 실패했습니다.' };
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
      const response = await api.put(`/predictions/${id}/close`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: '예측 마감에 실패했습니다.' };
    }
  },

  settlePrediction: async (id, result) => {
    try {
      const response = await api.put(`/predictions/${id}/settle`, { result });
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: '정산에 실패했습니다.' };
    }
  },

  deletePrediction: async (id) => {
    try {
      const response = await api.delete(`/predictions/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: '예측 삭제에 실패했습니다.' };
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
