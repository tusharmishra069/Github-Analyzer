/**
 * API Client utilities for making authenticated requests to the backend
 * Automatically includes JWT token in Authorization header
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface ApiRequestOptions extends RequestInit {
  json?: boolean;
}

/**
 * Make an authenticated API request with JWT token
 */
export async function apiRequest<T = any>(
  endpoint: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  const token = localStorage.getItem('access_token');
  const url = `${API_BASE_URL}${endpoint}`;

  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    // Handle 401 - token expired or invalid
    if (response.status === 401) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
      window.location.href = '/auth/login';
    }

    const error = await response.json().catch(() => ({ message: 'Unknown error' }));
    throw new Error(error.message || `API error: ${response.status}`);
  }

  if (options.json === false) {
    return response as T;
  }

  return response.json();
}

/**
 * GET request
 */
export async function apiGet<T = any>(endpoint: string): Promise<T> {
  return apiRequest<T>(endpoint, { method: 'GET' });
}

/**
 * POST request
 */
export async function apiPost<T = any>(
  endpoint: string,
  body: any = null
): Promise<T> {
  return apiRequest<T>(endpoint, {
    method: 'POST',
    body: body ? JSON.stringify(body) : undefined,
  });
}

/**
 * PUT request
 */
export async function apiPut<T = any>(
  endpoint: string,
  body: any = null
): Promise<T> {
  return apiRequest<T>(endpoint, {
    method: 'PUT',
    body: body ? JSON.stringify(body) : undefined,
  });
}

/**
 * DELETE request
 */
export async function apiDelete<T = any>(endpoint: string): Promise<T> {
  return apiRequest<T>(endpoint, { method: 'DELETE' });
}

/**
 * Auth API endpoints
 */
export const authApi = {
  getGoogleOAuthUrl: () => apiGet('/api/auth/oauth/google'),
  getGithubOAuthUrl: () => apiGet('/api/auth/oauth/github'),
  handleGoogleCallback: (code: string) =>
    apiPost('/api/auth/oauth/google/callback', { code }),
  handleGithubCallback: (code: string) =>
    apiPost('/api/auth/oauth/github/callback', { code }),
  sendOtp: (email: string) =>
    apiPost('/api/auth/email/send-otp', { email }),
  verifyOtp: (email: string, otp: string) =>
    apiPost('/api/auth/email/verify-otp', { email, otp }),
  refreshToken: (refreshToken: string) =>
    apiPost('/api/auth/refresh', { refresh_token: refreshToken }),
  logout: () => apiPost('/api/auth/logout'),
  getCurrentUser: () => apiGet('/api/auth/me'),
};

/**
 * Admin API endpoints
 */
export const adminApi = {
  getStats: () => apiGet('/api/admin/stats'),
  getUsers: (skip = 0, limit = 10) =>
    apiGet(`/api/admin/users?skip=${skip}&limit=${limit}`),
  getUser: (userId: string) =>
    apiGet(`/api/admin/users/${userId}`),
  updateUser: (userId: string, data: { role?: string; is_active?: boolean }) =>
    apiPut(`/api/admin/users/${userId}`, data),
  deleteUser: (userId: string) =>
    apiDelete(`/api/admin/users/${userId}`),
  getAnalyses: (skip = 0, limit = 10, status?: string) => {
    const query = new URLSearchParams({ skip: String(skip), limit: String(limit) });
    if (status) query.append('status', status);
    return apiGet(`/api/admin/analyses?${query.toString()}`);
  },
  getUserAnalyses: (userId: string, skip = 0, limit = 10) =>
    apiGet(`/api/admin/analyses/user/${userId}?skip=${skip}&limit=${limit}`),
  getDashboardSummary: () =>
    apiGet('/api/admin/dashboard-summary'),
  toggleUserRole: (userId: string) =>
    apiPost(`/api/admin/users/${userId}/toggle-role`),
  retryAnalysis: (analysisId: string) =>
    apiPost(`/api/admin/analyses/${analysisId}/retry`),
  getSystemLogs: (limit = 100) =>
    apiGet(`/api/admin/system-logs?limit=${limit}`),
};

/**
 * User API endpoints
 */
export const userApi = {
  getProfile: () => apiGet('/api/user/profile'),
  updateProfile: (data: { name?: string; avatar_url?: string }) =>
    apiPut('/api/user/profile', data),
  getAnalyses: (skip = 0, limit = 10) =>
    apiGet(`/api/user/analyses?skip=${skip}&limit=${limit}`),
  submitAnalysis: (repositoryUrl: string) =>
    apiPost('/api/user/analyses', { repository_url: repositoryUrl }),
  getAnalysisStatus: (analysisId: string) =>
    apiGet(`/api/user/analyses/${analysisId}`),
  getAnalysisResults: (analysisId: string) =>
    apiGet(`/api/user/analyses/${analysisId}/results`),
};
