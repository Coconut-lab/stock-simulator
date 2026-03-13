import axios from 'axios';

// API 기본 설정
const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';

// axios 인스턴스 생성
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 요청 인터셉터 - 토큰 자동 추가
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    console.log('[API] Request:', config.method?.toUpperCase(), config.baseURL + config.url);
    console.log('[API] Token in localStorage:', token ? `${token.substring(0, 20)}... (length: ${token.length})` : 'NONE');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 응답 인터셉터 - 에러 처리
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    console.log('[API] Error response:', error.response?.status, error.config?.url, error.response?.data);
    // 401 시 리다이렉트 하지 않음 (AuthContext에서 처리)
    return Promise.reject(error);
  }
);

export default api;
