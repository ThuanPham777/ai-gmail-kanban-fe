// src/lib/api/client.ts
import axios from 'axios';
import { API_BASE_URL } from '@/config/env';
import { clearAllAuth, getAccessToken, setAccessToken } from '../auth';
import type { RotateTokenResponse } from './types/auth.types';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Required for HttpOnly cookies
});

let isRefreshing = false;
let pendingRequests: Array<(token: string) => void> = [];

function onRefreshed(token: string) {
  pendingRequests.forEach((cb) => cb(token));
  pendingRequests = [];
}

/**
 * Refresh tokens - refresh token is sent automatically via HttpOnly cookie
 */
async function performTokenRefresh() {
  const response = await apiClient.post<RotateTokenResponse>(
    '/api/auth/refresh',
    {}, // No body needed - refresh token comes from cookie
  );
  return response.data;
}

apiClient.interceptors.request.use((config) => {
  const accessToken = getAccessToken();
  if (accessToken) {
    config.headers = config.headers ?? {};
    (config.headers as any).Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (res) => res,
  async (error) => {
    const originalRequest = error.config as any;
    const url: string = originalRequest?.url ?? '';

    // Don't attempt to refresh for auth endpoints to avoid infinite loops
    const isAuthEndpoint =
      url.includes('/api/auth/refresh') ||
      url.includes('/api/auth/logout') ||
      url.includes('/api/auth/google'); // includes /google/login

    if (
      error.response?.status === 401 &&
      !originalRequest?._retry &&
      !isAuthEndpoint
    ) {
      originalRequest._retry = true;

      // If already refreshing, queue the request
      if (isRefreshing) {
        return new Promise((resolve) => {
          pendingRequests.push((token: string) => {
            originalRequest.headers = originalRequest.headers ?? {};
            originalRequest.headers.Authorization = `Bearer ${token}`;
            resolve(apiClient(originalRequest));
          });
        });
      }

      isRefreshing = true;

      try {
        const response = await performTokenRefresh();

        setAccessToken(response.data.accessToken);
        // No need to store refresh token - it's in HttpOnly cookie

        onRefreshed(response.data.accessToken);

        originalRequest.headers = originalRequest.headers ?? {};
        originalRequest.headers.Authorization = `Bearer ${response.data.accessToken}`;

        return apiClient(originalRequest);
      } catch (e) {
        clearAllAuth();
        if (window.location.pathname !== '/login') {
          window.location.assign('/login');
        }
        return Promise.reject(e);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

export default apiClient;
