import { tokenStorage } from '@/utils/auth/tokenStorage';
import {
  removeStoredDashboardCache,
  setStoredWeeklyTrackingId,
} from '@/utils/dashboardStorage';
import {
  cachedRequestJson,
  clearRequestJsonCachesWithPrefix,
  isRequestAbortError,
  requestJson,
} from './apiHelper';
import { getBackendUrl } from './config';

const API_BASE_URL = getBackendUrl();
const JSON_HEADERS = { 'Content-Type': 'application/json' };

const READ_REQUEST_CONFIG = {
  timeoutMs: 9000,
  retries: 1,
  retryDelayMs: 600,
  cacheTtlMs: 2 * 60 * 1000,
  maxStaleMs: 24 * 60 * 60 * 1000,
  allowStaleOnError: true,
  maxWaitForFreshMs: 3200,
  refreshCacheInBackground: true,
};

const WRITE_REQUEST_CONFIG = {
  timeoutMs: 12000,
  retries: 0,
};

const FRESH_READ_REQUEST_CONFIG = {
  timeoutMs: 10000,
  retries: 1,
  retryDelayMs: 600,
};

const dailyLogsCachePrefix = 'daily-logs:';
const weeklyProgressCacheKey = (weeklyTrackingId: string) => `${dailyLogsCachePrefix}weekly:${weeklyTrackingId}`;
const dailyLogCacheKey = (dayId: string) => `${dailyLogsCachePrefix}day:${dayId}`;

const clearDailyLogRequestCache = async () => {
  await clearRequestJsonCachesWithPrefix(dailyLogsCachePrefix);
};

export const dailyLogsApi = {
  // Check and create new cycle if needed (handles expired/completed cycles)
  checkAndCreateCycle: async (
    userId: string,
    weeklyTrackingId?: string | null,
    baseTargetCalories?: number,
    baseTargetHydration?: number
  ) => {
    try {
      console.log('[checkAndCreateCycle] Checking cycle for user:', userId);
      const data = await requestJson<any>(
        `${API_BASE_URL}/daily-logs/check-cycle`,
        {
          method: 'POST',
          headers: JSON_HEADERS,
          body: JSON.stringify({
            userId,
            weeklyTrackingId,
            baseTargetCalories,
            baseTargetHydration,
          }),
        },
        WRITE_REQUEST_CONFIG
      );

      // If a new cycle was created, update AsyncStorage and tokenStorage
      if (data.newCycleCreated && data.newWeeklyTrackingId) {
        await setStoredWeeklyTrackingId(data.newWeeklyTrackingId);
        // Clear old cached data
        await removeStoredDashboardCache(undefined, weeklyTrackingId);
        await clearDailyLogRequestCache();

        // Also update user's weeklyTrackingId in tokenStorage
        const user = await tokenStorage.getUser();
        if (user) {
          user.weeklyTrackingId = data.newWeeklyTrackingId;
          await tokenStorage.saveUser(user);
          console.log('[checkAndCreateCycle] Updated user weeklyTrackingId in tokenStorage');
        }

        console.log('[checkAndCreateCycle] New cycle created! Updated weeklyTrackingId:', data.newWeeklyTrackingId);
      }

      return {
        data: data.data,
        newCycleCreated: data.newCycleCreated,
        newWeeklyTrackingId: data.newWeeklyTrackingId,
        message: data.message,
      };
    } catch (error: any) {
      if (!isRequestAbortError(error)) {
        console.error('Error checking/creating cycle:', error);
      }
      throw error;
    }
  },

  // Create a new weekly plan
  createWeeklyPlan: async (userId: string, baseTargetCalories: number, baseTargetHydration: number) => {
    try {
      const data = await requestJson<any>(
        `${API_BASE_URL}/daily-logs/weekly-plan`,
        {
          method: 'POST',
          headers: JSON_HEADERS,
          body: JSON.stringify({
            userId,
            baseTargetCalories,
            baseTargetHydration,
            startDate: new Date().toISOString(),
          }),
        },
        WRITE_REQUEST_CONFIG
      );

      await clearDailyLogRequestCache();
      return data.data;
    } catch (error: any) {
      console.error('Error creating weekly plan:', error);
      throw error;
    }
  },

  // Get weekly progress with all 7 days
  getWeeklyProgress: async (weeklyTrackingId: string) => {
    try {
      const data = await cachedRequestJson<any>(
        weeklyProgressCacheKey(weeklyTrackingId),
        `${API_BASE_URL}/daily-logs/progress/${weeklyTrackingId}`,
        {
          method: 'GET',
          headers: JSON_HEADERS,
        },
        READ_REQUEST_CONFIG
      );

      return data.data;
    } catch (error) {
      console.error('Error fetching weekly progress:', error);
      throw error;
    }
  },

  // Get weekly progress without using request cache. Use for login, dashboard refresh,
  // and any path where backend daily logs must be authoritative.
  getWeeklyProgressFresh: async (weeklyTrackingId: string) => {
    try {
      const data = await requestJson<any>(
        `${API_BASE_URL}/daily-logs/progress/${weeklyTrackingId}`,
        {
          method: 'GET',
          headers: {
            ...JSON_HEADERS,
            'Cache-Control': 'no-cache',
            Pragma: 'no-cache',
          },
        },
        FRESH_READ_REQUEST_CONFIG
      );

      await clearDailyLogRequestCache();
      return data.data;
    } catch (error) {
      console.error('Error fetching fresh weekly progress:', error);
      throw error;
    }
  },

  // Get single day log
  getDailyLog: async (dayId: string) => {
    try {
      const data = await cachedRequestJson<any>(
        dailyLogCacheKey(dayId),
        `${API_BASE_URL}/daily-logs/${dayId}`,
        {
          method: 'GET',
          headers: JSON_HEADERS,
        },
        READ_REQUEST_CONFIG
      );

      return data.data;
    } catch (error) {
      console.error('Error fetching daily log:', error);
      throw error;
    }
  },

  // Get a single day without using request cache.
  getDailyLogFresh: async (dayId: string) => {
    try {
      const data = await requestJson<any>(
        `${API_BASE_URL}/daily-logs/${dayId}`,
        {
          method: 'GET',
          headers: {
            ...JSON_HEADERS,
            'Cache-Control': 'no-cache',
            Pragma: 'no-cache',
          },
        },
        FRESH_READ_REQUEST_CONFIG
      );

      await clearDailyLogRequestCache();
      return data.data;
    } catch (error) {
      console.error('Error fetching fresh daily log:', error);
      throw error;
    }
  },

  // Add meal to a day
  addMeal: async (
    dayId: string,
    foodName: string,
    quantity: number,
    unit: string,
    calories: number,
    protein?: number,
    carbs?: number,
    fats?: number,
    notes?: string,
    loggedAt?: string
  ) => {
    try {
      console.log('[addMeal] Adding meal to dayId:', dayId);
      console.log('[addMeal] API URL:', `${API_BASE_URL}/daily-logs/${dayId}/meal`);

      const data = await requestJson<any>(
        `${API_BASE_URL}/daily-logs/${dayId}/meal`,
        {
          method: 'POST',
          headers: JSON_HEADERS,
          body: JSON.stringify({
            foodName,
            quantity,
            unit,
            calories,
            protein,
            carbs,
            fats,
            notes,
            loggedAt,
          }),
        },
        WRITE_REQUEST_CONFIG
      );

      await clearDailyLogRequestCache();
      return data.data;
    } catch (error) {
      console.error('[addMeal] Error adding meal:', error);
      throw error;
    }
  },

  // Remove meal from a day
  removeMeal: async (dayId: string, mealId: string) => {
    try {
      const data = await requestJson<any>(
        `${API_BASE_URL}/daily-logs/${dayId}/meal/${mealId}`,
        {
          method: 'DELETE',
          headers: JSON_HEADERS,
        },
        WRITE_REQUEST_CONFIG
      );

      await clearDailyLogRequestCache();
      return data.data;
    } catch (error) {
      console.error('Error removing meal:', error);
      throw error;
    }
  },

  // Update calorie level for a day
  updateCalorieLevel: async (dayId: string, calorieLevel: number) => {
    try {
      const data = await requestJson<any>(
        `${API_BASE_URL}/daily-logs/${dayId}/calorie-level`,
        {
          method: 'PUT',
          headers: JSON_HEADERS,
          body: JSON.stringify({ calorieLevel }),
        },
        WRITE_REQUEST_CONFIG
      );

      await clearDailyLogRequestCache();
      return data.data;
    } catch (error) {
      console.error('Error updating calorie level:', error);
      throw error;
    }
  },

  // Update hydration for a day
  updateHydration: async (dayId: string, hydrationAmount: number) => {
    try {
      const data = await requestJson<any>(
        `${API_BASE_URL}/daily-logs/${dayId}/hydration`,
        {
          method: 'PUT',
          headers: JSON_HEADERS,
          body: JSON.stringify({ hydrationAmount }),
        },
        WRITE_REQUEST_CONFIG
      );

      await clearDailyLogRequestCache();
      return data.data;
    } catch (error) {
      console.error('Error updating hydration:', error);
      throw error;
    }
  },

  // Complete a day and unlock the next
  completeDay: async (weeklyTrackingId: string, dayNumber: number) => {
    try {
      console.log('API Request Details:');
      console.log('- URL:', `${API_BASE_URL}/daily-logs/complete-day`);
      console.log('- weeklyTrackingId:', weeklyTrackingId);
      console.log('- dayNumber:', dayNumber);

      const data = await requestJson<any>(
        `${API_BASE_URL}/daily-logs/complete-day`,
        {
          method: 'POST',
          headers: JSON_HEADERS,
          body: JSON.stringify({
            weeklyTrackingId,
            dayNumber,
          }),
        },
        WRITE_REQUEST_CONFIG
      );

      await clearDailyLogRequestCache();

      // Check if a new weekly cycle was created (Day 7 completion)
      if (data.data && data.data.weekCompleted && data.data.newWeeklyTrackingId) {
        // Update AsyncStorage with new weekly tracking ID
        try {
          const user = await tokenStorage.getUser();
          await setStoredWeeklyTrackingId(data.data.newWeeklyTrackingId, user);
          console.log('New weekly cycle started! Updated weeklyTrackingId:', data.data.newWeeklyTrackingId);

          // Clear old cached data to force fresh data fetch
          await removeStoredDashboardCache(user, weeklyTrackingId);
          await clearDailyLogRequestCache();

          return {
            ...data.data,
            cycleRestarted: true,
            newWeeklyTrackingId: data.data.newWeeklyTrackingId,
          };
        } catch (storageError) {
          console.error('Error updating weekly tracking ID:', storageError);
        }
      }

      return data.data;
    } catch (error: any) {
      console.error('Complete Day Error:', error);
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack,
      });
      throw error;
    }
  },

  // Complete and save week to user profile
  completeWeek: async (weeklyTrackingId: string, userId: string) => {
    try {
      const data = await requestJson<any>(
        `${API_BASE_URL}/daily-logs/complete-week/${weeklyTrackingId}`,
        {
          method: 'POST',
          headers: JSON_HEADERS,
          body: JSON.stringify({ userId }),
        },
        WRITE_REQUEST_CONFIG
      );

      await clearDailyLogRequestCache();
      return data.data;
    } catch (error) {
      console.error('Error completing week:', error);
      throw error;
    }
  },

  // Add water intake to a day
  addWater: async (dayId: string, amount: number) => {
    try {
      const data = await requestJson<any>(
        `${API_BASE_URL}/daily-logs/${dayId}/water`,
        {
          method: 'POST',
          headers: JSON_HEADERS,
          body: JSON.stringify({ amount }),
        },
        WRITE_REQUEST_CONFIG
      );

      await clearDailyLogRequestCache();
      return data.data;
    } catch (error) {
      console.error('Error adding water:', error);
      throw error;
    }
  },
};
