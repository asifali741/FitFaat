import {
  cachedRequestJson,
  clearRequestJsonCachesWithPrefix,
  requestJson,
} from './apiHelper';
import { getBackendUrl } from './config';

const API_BASE_URL = getBackendUrl() + '/exercise';
const JSON_HEADERS = { 'Content-Type': 'application/json' };
const EXERCISE_CACHE_PREFIX = 'exercise:';

const READ_REQUEST_CONFIG = {
  timeoutMs: 9000,
  retries: 1,
  retryDelayMs: 600,
  cacheTtlMs: 2 * 60 * 1000,
  maxStaleMs: 24 * 60 * 60 * 1000,
  allowStaleOnError: true,
  maxWaitForFreshMs: 2800,
  refreshCacheInBackground: true,
};

export const exerciseApi = {
  /**
   * Save exercise completion to backend
   * @param {string} userId - User's ID
   * @param {string} exerciseName - Name of the exercise
   * @param {number} durationSeconds - Duration in seconds
   * @returns {Promise<Object>} API response
   */
  async finishExercise(userId: string, exerciseName: string, durationSeconds: number) {
    const url = `${API_BASE_URL}/finish`;
    const body = { userId, exerciseName, durationSeconds };

    console.log('\n[finishExercise]');
    console.log('   URL:', url);
    console.log('   Exercise:', exerciseName);
    console.log('   Duration:', durationSeconds, 'seconds');

    try {
      const data = await requestJson<any | undefined>(
        url,
        {
          method: 'POST',
          headers: JSON_HEADERS,
          body: JSON.stringify(body),
        },
        { timeoutMs: 30000, retries: 0 }
      );

      await clearRequestJsonCachesWithPrefix(EXERCISE_CACHE_PREFIX);

      if (!data) {
        return {
          success: true,
          message: 'Exercise saved successfully',
          data: { exerciseName, duration: durationSeconds },
        };
      }

      // Log calories data if available
      if (data.data?.calorieData) {
        console.log('   Calories Burned:', data.data.calorieData.calories, 'kcal');
        console.log('   Fat Burn:', data.data.calorieData.fatBurnGrams, 'grams');
        console.log('   Intensity:', data.data.calorieData.intensity);
        console.log('   Message:', data.data.motivationalMessage);
      }

      return data;
    } catch (error: any) {
      console.error('\n[finishExercise] Error:', error.message);

      if (error.name === 'AbortError') {
        throw new Error('Request timeout - Backend not responding');
      }
      throw error;
    }
  },

  /**
   * Get user's exercise completion history
   * @param {string} userId - User's ID
   * @param {Object} options - Optional query parameters
   * @param {number} options.limit - Maximum number of records to return
   * @param {string} options.date - Filter by specific date (YYYY-MM-DD)
   * @returns {Promise<Object>} API response with history and stats
   */
  async getExerciseHistory(userId: string, options: { limit?: number; date?: string } = {}) {
    try {
      const queryParams = new URLSearchParams();
      if (options.limit) queryParams.append('limit', options.limit.toString());
      if (options.date) queryParams.append('date', options.date);

      const endpoint = `${API_BASE_URL}/history/${userId}?${queryParams}`;
      return await cachedRequestJson<any>(
        `${EXERCISE_CACHE_PREFIX}history:${userId}:${queryParams.toString()}`,
        endpoint,
        {
          method: 'GET',
          headers: JSON_HEADERS,
        },
        READ_REQUEST_CONFIG
      );
    } catch (error) {
      console.error('Error fetching exercise history:', error);
      throw error;
    }
  },

  /**
   * Get user's exercise statistics
   * @param {string} userId - User's ID
   * @returns {Promise<Object>} API response with exercise statistics
   */
  async getExerciseStats(userId: string) {
    try {
      return await cachedRequestJson<any>(
        `${EXERCISE_CACHE_PREFIX}stats:${userId}`,
        `${API_BASE_URL}/stats/${userId}`,
        {
          method: 'GET',
          headers: JSON_HEADERS,
        },
        READ_REQUEST_CONFIG
      );
    } catch (error) {
      console.error('Error fetching exercise stats:', error);
      throw error;
    }
  },
};
