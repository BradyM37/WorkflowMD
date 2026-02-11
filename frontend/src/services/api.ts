import axios from 'axios';

// Use environment variable in production, fallback to production URL if not set
// Development should set REACT_APP_API_URL=http://localhost:3000
const getBaseURL = () => {
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }
  // In production (no env var), use the production backend
  if (window.location.hostname !== 'localhost') {
    return 'https://ghlworkflowdebugger.onrender.com';
  }
  // Local development fallback
  return 'http://localhost:3000';
};

const api = axios.create({
  baseURL: getBaseURL(),
  withCredentials: true,
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Redirect to login if unauthorized
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;