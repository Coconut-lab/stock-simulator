import api from './api';

export const authService = {
  // 회원가입
  register: async (userData) => {
    try {
      const response = await api.post('/auth/register', userData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: '회원가입에 실패했습니다.' };
    }
  },

  // 로그인
  login: async (credentials) => {
    try {
      const response = await api.post('/auth/login', credentials);
      const { data } = response.data;
      
      // 토큰과 사용자 정보를 로컬 스토리지에 저장
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: '로그인에 실패했습니다.' };
    }
  },

  // 로그아웃
  logout: async () => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.error('로그아웃 요청 실패:', error);
    } finally {
      // 로컬 스토리지에서 토큰과 사용자 정보 제거
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
  },

  // 현재 사용자 정보 조회
  getCurrentUser: async () => {
    try {
      const response = await api.get('/auth/me');
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: '사용자 정보 조회에 실패했습니다.' };
    }
  },

  // 토큰 존재 여부 확인
  isAuthenticated: () => {
    return !!localStorage.getItem('token');
  },

  // 저장된 사용자 정보 조회
  getStoredUser: () => {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  }
};
