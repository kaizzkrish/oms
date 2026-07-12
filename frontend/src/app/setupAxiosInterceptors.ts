import type { InternalAxiosRequestConfig } from 'axios';
import { authApi } from '../features/auth/authApi';
import { clearCredentials } from '../features/auth/authSlice';
import { axiosInstance } from '../shared/api/axiosInstance';
import { store } from './store';

interface RetryableRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

let isRefreshing = false;
let pendingResolvers: Array<(token: string | null) => void> = [];

function resolvePending(token: string | null): void {
  pendingResolvers.forEach((resolve) => resolve(token));
  pendingResolvers = [];
}

async function refreshAccessToken(): Promise<string | null> {
  // The `refresh` endpoint's own `onQueryStarted` dispatches `setCredentials`
  // on success; only the failure path needs handling here.
  const result = await store.dispatch(authApi.endpoints.refresh.initiate());
  if ('data' in result && result.data) {
    return result.data.accessToken;
  }
  store.dispatch(clearCredentials());
  return null;
}

/** Wires the shared axios instance to the Redux auth state. Call once at startup. */
export function setupAxiosInterceptors(): void {
  axiosInstance.interceptors.request.use((config) => {
    const token = store.getState().auth.accessToken;
    if (token) {
      config.headers.set('Authorization', `Bearer ${token}`);
    }
    return config;
  });

  axiosInstance.interceptors.response.use(
    (response) => response,
    async (error: unknown) => {
      if (!isAxiosErrorWithConfig(error) || error.response?.status !== 401) {
        return Promise.reject(error);
      }

      const originalRequest = error.config;
      if (originalRequest._retry || originalRequest.url?.includes('/auth/refresh')) {
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          pendingResolvers.push((token) => {
            if (token) {
              originalRequest.headers.set('Authorization', `Bearer ${token}`);
              resolve(axiosInstance(originalRequest));
            } else {
              reject(error);
            }
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;
      const newToken = await refreshAccessToken();
      isRefreshing = false;
      resolvePending(newToken);

      if (!newToken) {
        return Promise.reject(error);
      }
      originalRequest.headers.set('Authorization', `Bearer ${newToken}`);
      return axiosInstance(originalRequest);
    },
  );
}

function isAxiosErrorWithConfig(
  error: unknown,
): error is { config: RetryableRequestConfig; response?: { status: number } } {
  return typeof error === 'object' && error !== null && 'config' in error;
}
