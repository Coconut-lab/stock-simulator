import api from './api';

export const adminService = {
  getUsers: async (page = 1, search = '') => {
    try {
      const params = { page };
      if (search) params.search = search;
      const response = await api.get('/admin/users', { params });
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: '유저 목록 조회에 실패했습니다.' };
    }
  },

  updateBalance: async (userId, action, amount) => {
    try {
      const response = await api.put(`/admin/users/${userId}/balance`, { action, amount });
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: '잔액 수정에 실패했습니다.' };
    }
  },

  updateRole: async (userId, role) => {
    try {
      const response = await api.put(`/admin/users/${userId}/role`, { role });
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: '역할 변경에 실패했습니다.' };
    }
  },

  // 공지사항
  getAnnouncements: async (page = 1) => {
    try {
      const response = await api.get('/admin/announcements', { params: { page } });
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: '공지 목록 조회에 실패했습니다.' };
    }
  },

  createAnnouncement: async (message, durationHours = 2, priority = 'normal') => {
    try {
      const response = await api.post('/admin/announcements', {
        message,
        duration_hours: durationHours,
        priority,
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: '공지 등록에 실패했습니다.' };
    }
  },

  deleteAnnouncement: async (id) => {
    try {
      const response = await api.delete(`/admin/announcements/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: '공지 삭제에 실패했습니다.' };
    }
  },

  deactivateAnnouncement: async (id) => {
    try {
      const response = await api.put(`/admin/announcements/${id}/deactivate`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: '공지 비활성화에 실패했습니다.' };
    }
  },

  // 활성 공지 (공개 API)
  getActiveAnnouncements: async () => {
    try {
      const response = await api.get('/announcements/active');
      return response.data;
    } catch (error) {
      return { data: [] };
    }
  },
};
