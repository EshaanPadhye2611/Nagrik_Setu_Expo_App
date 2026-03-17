import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

const useUserStore = create((set) => ({
  user: null,
  isAuthenticated: false,

  // ── Save everything after login/register ──
  login: async ({ access_token, refresh_token, user }) => {
    await SecureStore.setItemAsync('access_token', access_token);
    await SecureStore.setItemAsync('refresh_token', refresh_token);
    await AsyncStorage.setItem('user', JSON.stringify(user));
    set({ user, isAuthenticated: true });
  },

  // ── Restore session when app opens ──
  hydrate: async () => {
    try {
      const raw = await AsyncStorage.getItem('user');
      const token = await SecureStore.getItemAsync('access_token');
      if (raw && token) {
        set({ user: JSON.parse(raw), isAuthenticated: true });
        return true; // has session
      }
      return false;
    } catch {
      return false;
    }
  },

  // ── Clear everything on logout ──
  logout: async () => {
    await SecureStore.deleteItemAsync('access_token');
    await SecureStore.deleteItemAsync('refresh_token');
    await AsyncStorage.removeItem('user');
    set({ user: null, isAuthenticated: false });
  },
}));

export default useUserStore;