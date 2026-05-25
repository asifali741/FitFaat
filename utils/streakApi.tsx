import {
  cachedRequestJson,
  clearRequestJsonCachesWithPrefix,
  requestJson,
} from './apiHelper';
import { getBackendUrl } from './config';

const API_BASE_URL = getBackendUrl();
const JSON_HEADERS = { 'Content-Type': 'application/json' };
const STREAK_CACHE_PREFIX = 'streak:';

const READ_REQUEST_CONFIG = {
  timeoutMs: 8000,
  retries: 1,
  retryDelayMs: 600,
  cacheTtlMs: 2 * 60 * 1000,
  maxStaleMs: 24 * 60 * 60 * 1000,
  allowStaleOnError: true,
  maxWaitForFreshMs: 2500,
  refreshCacheInBackground: true,
};

export const streakApi = {
  /**
   * Get user's current streak information
   * GET /api/streak/:userId
   */
  getUserStreak: async (userId: string) => {
    try {
      const data = await cachedRequestJson<any>(
        `${STREAK_CACHE_PREFIX}current:${userId}`,
        `${API_BASE_URL}/streak/${userId}`,
        {
          method: 'GET',
          headers: JSON_HEADERS,
        },
        READ_REQUEST_CONFIG
      );

      return data.data;
    } catch (error) {
      console.error('[streakApi] Error fetching user streak:', error);
      throw error;
    }
  },

  /**
   * Get user's streak history
   * GET /api/streak/:userId/history?days=30
   */
  getStreakHistory: async (userId: string, days: number = 30) => {
    try {
      const data = await cachedRequestJson<any>(
        `${STREAK_CACHE_PREFIX}history:${userId}:${days}`,
        `${API_BASE_URL}/streak/${userId}/history?days=${days}`,
        {
          method: 'GET',
          headers: JSON_HEADERS,
        },
        READ_REQUEST_CONFIG
      );

      return data.data;
    } catch (error) {
      console.error('[streakApi] Error fetching streak history:', error);
      throw error;
    }
  },

  /**
   * Reset/acknowledge reminder
   * POST /api/streak/:userId/reset-reminder
   */
  resetReminderStatus: async (userId: string) => {
    try {
      const data = await requestJson<any>(
        `${API_BASE_URL}/streak/${userId}/reset-reminder`,
        {
          method: 'POST',
          headers: JSON_HEADERS,
        },
        { timeoutMs: 12000, retries: 0 }
      );

      await clearRequestJsonCachesWithPrefix(STREAK_CACHE_PREFIX);
      return data.data;
    } catch (error) {
      console.error('[streakApi] Error resetting reminder:', error);
      throw error;
    }
  },

  /**
   * Send streak reminder notification
   * POST /api/streak/:userId/send-reminder
   */
  sendStreakReminder: async (userId: string) => {
    try {
      const data = await requestJson<any>(
        `${API_BASE_URL}/streak/${userId}/send-reminder`,
        {
          method: 'POST',
          headers: JSON_HEADERS,
        },
        { timeoutMs: 12000, retries: 0 }
      );

      await clearRequestJsonCachesWithPrefix(STREAK_CACHE_PREFIX);
      return data.data;
    } catch (error) {
      console.error('[streakApi] Error sending streak reminder:', error);
      throw error;
    }
  },
};

export default streakApi;
