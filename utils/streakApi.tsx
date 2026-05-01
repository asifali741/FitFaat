import { getBackendUrl } from './config';

const API_BASE_URL = getBackendUrl();

export const streakApi = {
  /**
   * Get user's current streak information
   * GET /api/streak/:userId
   */
  getUserStreak: async (userId: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/streak/${userId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch streak');
      }

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
      const response = await fetch(`${API_BASE_URL}/streak/${userId}/history?days=${days}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch streak history');
      }

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
      const response = await fetch(`${API_BASE_URL}/streak/${userId}/reset-reminder`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to reset reminder');
      }

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
      const response = await fetch(`${API_BASE_URL}/streak/${userId}/send-reminder`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to send reminder');
      }

      return data.data;
    } catch (error) {
      console.error('[streakApi] Error sending streak reminder:', error);
      throw error;
    }
  },
};

export default streakApi;
