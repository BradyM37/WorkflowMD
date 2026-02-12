/**
 * Demo Mode API Helper
 * Routes API calls to demo endpoints when in demo mode
 */

import api from './api';

export function isDemoMode(): boolean {
  return localStorage.getItem('demo_mode') === 'true';
}

export function clearDemoMode(): void {
  localStorage.removeItem('demo_mode');
  localStorage.removeItem('location_id');
  localStorage.removeItem('ghl_connected');
}

/**
 * Make an API call - routes to demo endpoints if in demo mode
 */
export async function demoAwareGet(endpoint: string, params?: Record<string, any>) {
  if (isDemoMode()) {
    // Convert /api/metrics/xxx to /api/demo/xxx
    const demoEndpoint = endpoint.replace('/api/metrics/', '/api/demo/');
    return api.get(demoEndpoint, { params });
  }
  return api.get(endpoint, { params });
}

/**
 * Fetch metrics with demo mode support
 */
export const metricsApi = {
  async getOverview(days: number = 7) {
    const endpoint = isDemoMode() ? '/api/demo/overview' : '/api/metrics/overview';
    return api.get(endpoint, { params: { days } });
  },
  
  async getTrend(days: number = 30) {
    const endpoint = isDemoMode() ? '/api/demo/trend' : '/api/metrics/trend';
    return api.get(endpoint, { params: { days } });
  },
  
  async getMissed(limit: number = 20, offset: number = 0) {
    const endpoint = isDemoMode() ? '/api/demo/missed' : '/api/metrics/missed';
    return api.get(endpoint, { params: { limit, offset } });
  },
  
  async getTeam(days: number = 7) {
    const endpoint = isDemoMode() ? '/api/demo/team' : '/api/metrics/team';
    return api.get(endpoint, { params: { days } });
  },
  
  async getChannels(days: number = 7) {
    const endpoint = isDemoMode() ? '/api/demo/channels' : '/api/metrics/channels';
    return api.get(endpoint, { params: { days } });
  },
  
  async getActivity(limit: number = 20) {
    const endpoint = isDemoMode() ? '/api/demo/activity' : '/api/metrics/activity';
    return api.get(endpoint, { params: { limit } });
  },
  
  async getGoals(days: number = 7) {
    const endpoint = isDemoMode() ? '/api/demo/goals' : '/api/metrics/goals';
    return api.get(endpoint, { params: { days } });
  },
  
  async getRevenue(days: number = 30) {
    const endpoint = isDemoMode() ? '/api/demo/revenue' : '/api/metrics/revenue';
    return api.get(endpoint, { params: { days } });
  },
  
  async getRevenueSummary(days: number = 30) {
    const endpoint = isDemoMode() ? '/api/demo/revenue/summary' : '/api/metrics/revenue/summary';
    return api.get(endpoint, { params: { days } });
  },
  
  async getSyncStatus() {
    const endpoint = isDemoMode() ? '/api/demo/sync/status' : '/api/metrics/sync/status';
    return api.get(endpoint);
  },
  
  async getInsights(days: number = 30) {
    const endpoint = isDemoMode() ? '/api/demo/insights' : '/api/metrics/insights';
    return api.get(endpoint, { params: { days } });
  },
  
  async getUser(userId: string, days: number = 30) {
    const endpoint = isDemoMode() ? `/api/demo/user/${userId}` : `/api/metrics/user/${userId}`;
    return api.get(endpoint, { params: { days } });
  },
};

export default metricsApi;
