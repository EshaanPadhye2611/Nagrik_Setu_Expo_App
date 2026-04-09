import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

export const BASE_URL = "https://de22-2409-40c0-102b-2a5e-d499-2868-ffec-ac92.ngrok-free.app/";

const api = axios.create({
  baseURL: BASE_URL,
  headers: { "ngrok-skip-browser-warning": "true" },
});

// ── Attach access token to every request automatically ──
api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Auto-refresh token on 401 ──
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const refresh = await SecureStore.getItemAsync('refresh_token');
        if (!refresh) throw new Error('No refresh token');
        const res = await axios.post(`${BASE_URL}/api/auth/token/refresh/`, { refresh }, {
          headers: { "ngrok-skip-browser-warning": "true" },
        });
        const newToken = res.data.access;
        await SecureStore.setItemAsync('access_token', newToken);
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      } catch {
        // Refresh failed — import lazily to avoid circular dependency
        const useUserStore = (await import('./store/userStore')).default;
        await useUserStore.getState().logout();
      }
    }
    return Promise.reject(error);
  }
);

export default api;