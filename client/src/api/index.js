import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 60000,
});

// Injecte le token JWT dans chaque requête
api.interceptors.request.use(config => {
  const token = localStorage.getItem('yc_token');
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

// Redirige vers /login si le token est expiré ou invalide
api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('yc_token');
      localStorage.removeItem('yc_username');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;
