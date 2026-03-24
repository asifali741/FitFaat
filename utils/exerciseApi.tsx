import Constants from 'expo-constants';
import { Platform } from 'react-native';

const ENV = Constants.expoConfig?.extra;

// Get base URL from environment variables - same pattern as other APIs
const getBaseURL = () => {
  const envUrl = ENV?.EXPO_PUBLIC_BACKEND_API_URL;
  if (envUrl) {
    return envUrl;
  }
  const defaultHost = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
  return `http://${defaultHost}:5001/api`;
};

const API_BASE_URL = getBaseURL() + '/exercise';

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
    
    console.log('\n🚀 finishExercise()');
    console.log('   URL:', url);
    console.log('   Body:', JSON.stringify(body));
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      console.log('   ↩️  Status:', response.status, response.statusText);

      const responseText = await response.text();
      console.log('   📦 Body:', responseText || '[empty]');

      if (!responseText) {
        if (response.ok) {
          return {
            success: true,
            message: 'Exercise saved successfully',
            data: { exerciseName, duration: durationSeconds }
          };
        } else {
          throw new Error(`Server returned ${response.status}: ${response.statusText}`);
        }
      }

      const data = JSON.parse(responseText);
      if (!response.ok) {
        throw new Error(data.message || `Status ${response.status}`);
      }
      return data;
    } catch (error: any) {
      console.error('\n❌ finishExercise() Error');
      console.error('   Type:', error.name);
      console.error('   Message:', error.message);
      console.error('   URL attempted:', url);
      
      if (error.name === 'AbortError') {
        throw new Error(`Timeout - Backend not responding at ${url}`);
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

      const response = await fetch(
        `${API_BASE_URL}/history/${userId}?${queryParams}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch exercise history');
      }
      return data;
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
      const response = await fetch(`${API_BASE_URL}/stats/${userId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch exercise statistics');
      }
      return data;
    } catch (error) {
      console.error('Error fetching exercise stats:', error);
      throw error;
    }
  }
};
