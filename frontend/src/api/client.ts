import axios from 'axios';

const BACKEND_URL =
  process.env.REACT_APP_API_URL ||
  'http://localhost:8000';

export const API_BASE = BACKEND_URL;

export const client = axios.create({
  baseURL: `${API_BASE}/api/v1`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Attach Auth token
client.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('sf_token') || sessionStorage.getItem('sf_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Error handling
client.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    if (status === 401) {
      localStorage.removeItem('sf_token');
      sessionStorage.removeItem('sf_token');
      window.dispatchEvent(new Event('auth_session_expired'));
    } else if (status >= 500) {
      window.dispatchEvent(
        new CustomEvent('sf_toast', {
          detail: {
            type: 'error',
            title: 'Server Error',
            message: error.response?.data?.detail || 'Internal server error occurred.',
          },
        })
      );
    }
    return Promise.reject(error);
  }
);
