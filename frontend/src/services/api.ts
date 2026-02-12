import axios, { AxiosError } from 'axios';
import { message } from 'antd';

// Use environment variable in production, fallback to production URL if not set
// Development should set REACT_APP_API_URL=http://localhost:3000
const getBaseURL = () => {
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }
  // In production (no env var), use the production backend
  if (window.location.hostname !== 'localhost') {
    return 'https://workflowmd.onrender.com';
  }
  // Local development fallback
  return 'http://localhost:3000';
};

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

// Helper to check if error is retryable
const isRetryableError = (error: AxiosError): boolean => {
  // Retry on network errors or 5xx server errors (except 500)
  if (!error.response) {
    return true; // Network error
  }
  const status = error.response.status;
  return status === 502 || status === 503 || status === 504;
};

// Helper to delay execution
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const api = axios.create({
  baseURL: getBaseURL(),
  withCredentials: true,
});

// Add auth token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // Add retry count to config for tracking
    if (config.headers['x-retry-count'] === undefined) {
      config.headers['x-retry-count'] = '0';
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor with error handling
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config;
    
    if (!originalRequest) {
      return Promise.reject(error);
    }

    const retryCount = parseInt(originalRequest.headers['x-retry-count'] as string || '0', 10);

    // Handle 401 Unauthorized - redirect to login
    if (error.response?.status === 401) {
      // Clear auth state
      localStorage.removeItem('auth_token');
      
      // Only redirect if not already on login/register pages
      const currentPath = window.location.pathname;
      if (!currentPath.includes('/login') && !currentPath.includes('/register')) {
        message.error('Session expired. Please log in again.');
        window.location.href = '/login';
      }
      return Promise.reject(error);
    }

    // Handle 403 Forbidden
    if (error.response?.status === 403) {
      message.error('You do not have permission to perform this action.');
      return Promise.reject(error);
    }

    // Handle 500 Internal Server Error
    if (error.response?.status === 500) {
      message.error('Server error. Please try again later.');
      console.error('Server Error (500):', error.response?.data);
      return Promise.reject(error);
    }

    // Retry logic for network failures and specific server errors
    if (isRetryableError(error) && retryCount < MAX_RETRIES) {
      originalRequest.headers['x-retry-count'] = String(retryCount + 1);
      
      // Exponential backoff
      const backoffDelay = RETRY_DELAY * Math.pow(2, retryCount);
      console.log(`Retrying request (attempt ${retryCount + 1}/${MAX_RETRIES}) after ${backoffDelay}ms...`);
      
      await delay(backoffDelay);
      return api(originalRequest);
    }

    // If all retries exhausted for network errors
    if (!error.response && retryCount >= MAX_RETRIES) {
      message.error('Network error. Please check your connection and try again.');
    }

    // Handle 404 Not Found (don't show toast, let components handle it)
    if (error.response?.status === 404) {
      console.warn('Resource not found:', originalRequest.url);
    }

    // Handle rate limiting
    if (error.response?.status === 429) {
      message.warning('Too many requests. Please wait a moment and try again.');
    }

    return Promise.reject(error);
  }
);

export default api;
