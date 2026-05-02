import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'fitfaat_auth_token';
const LEGACY_TOKEN_KEY = 'authToken';
const USER_KEY = 'fitfaat_user';

export const tokenStorage = {
  // Save auth token securely
  saveToken: async (token: string) => {
    try {
      await SecureStore.setItemAsync(TOKEN_KEY, token);
    } catch (error) {
      console.error('Error saving token:', error);
    }
  },

  // Get auth token
  getToken: async () => {
    try {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      if (token) return token;

      const legacyToken = await SecureStore.getItemAsync(LEGACY_TOKEN_KEY);
      if (legacyToken) {
        await SecureStore.setItemAsync(TOKEN_KEY, legacyToken);
        await SecureStore.deleteItemAsync(LEGACY_TOKEN_KEY);
      }

      return legacyToken;
    } catch (error) {
      console.error('Error getting token:', error);
      return null;
    }
  },

  // Remove auth token
  removeToken: async () => {
    try {
      await Promise.all([
        SecureStore.deleteItemAsync(TOKEN_KEY),
        SecureStore.deleteItemAsync(LEGACY_TOKEN_KEY),
      ]);
    } catch (error) {
      console.error('Error removing token:', error);
    }
  },

  // Save user data
  saveUser: async (user: any) => {
    try {
      await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
    } catch (error) {
      console.error('Error saving user:', error);
    }
  },

  // Get user data
  getUser: async () => {
    try {
      const userStr = await SecureStore.getItemAsync(USER_KEY);
      return userStr ? JSON.parse(userStr) : null;
    } catch (error) {
      console.error('Error getting user:', error);
      return null;
    }
  },

  // Remove user data
  removeUser: async () => {
    try {
      await SecureStore.deleteItemAsync(USER_KEY);
    } catch (error) {
      console.error('Error removing user:', error);
    }
  },

  // Clear all auth data
  clearAll: async () => {
    try {
      await Promise.all([
        SecureStore.deleteItemAsync(TOKEN_KEY),
        SecureStore.deleteItemAsync(LEGACY_TOKEN_KEY),
        SecureStore.deleteItemAsync(USER_KEY),
      ]);
    } catch (error) {
      console.error('Error clearing auth data:', error);
    }
  },
};
