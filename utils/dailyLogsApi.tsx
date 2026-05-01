import AsyncStorage from '@react-native-async-storage/async-storage';
import { tokenStorage } from '@/utils/auth/tokenStorage';
import { getBackendUrl } from './config';

const API_BASE_URL = getBackendUrl();

export const dailyLogsApi = {
  // Check and create new cycle if needed (handles expired/completed cycles)
  checkAndCreateCycle: async (userId: string, weeklyTrackingId?: string | null, baseTargetCalories?: number, baseTargetHydration?: number) => {
    try {
      console.log('[checkAndCreateCycle] Checking cycle for user:', userId);
      const response = await fetch(`${API_BASE_URL}/daily-logs/check-cycle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          weeklyTrackingId,
          baseTargetCalories,
          baseTargetHydration,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to check/create cycle');
      }
      
      // If a new cycle was created, update AsyncStorage and tokenStorage
      if (data.newCycleCreated && data.newWeeklyTrackingId) {
        await AsyncStorage.setItem('weeklyTrackingId', data.newWeeklyTrackingId);
        // Clear old cached data
        await AsyncStorage.removeItem('JsonResponse');
        
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
        message: data.message
      };
    } catch (error: any) {
      console.error('Error checking/creating cycle:', error);
      throw error;
    }
  },

  // Create a new weekly plan
  createWeeklyPlan: async (userId: string, baseTargetCalories: number, baseTargetHydration: number) => {
    try {
      const response = await fetch(`${API_BASE_URL}/daily-logs/weekly-plan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          baseTargetCalories,
          baseTargetHydration,
          startDate: new Date().toISOString(),
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to create weekly plan');
      }
      return data.data;
    } catch (error: any) {
      console.error('Error creating weekly plan:', error);
      throw error;
    }
  },

  // Get weekly progress with all 7 days
  getWeeklyProgress: async (weeklyTrackingId: string) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/daily-logs/progress/${weeklyTrackingId}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch weekly progress');
      }
      return data.data;
    } catch (error) {
      console.error('Error fetching weekly progress:', error);
      throw error;
    }
  },

  // Get single day log
  getDailyLog: async (dayId: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/daily-logs/${dayId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch daily log');
      }
      return data.data;
    } catch (error) {
      console.error('Error fetching daily log:', error);
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
    notes?: string
  ) => {
    try {
      console.log('🍽️ [addMeal] Adding meal to dayId:', dayId);
      console.log('🍽️ [addMeal] API URL:', `${API_BASE_URL}/daily-logs/${dayId}/meal`);
      
      const response = await fetch(`${API_BASE_URL}/daily-logs/${dayId}/meal`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          foodName,
          quantity,
          unit,
          calories,
          protein,
          carbs,
          fats,
          notes,
        }),
      });

      console.log('🍽️ [addMeal] Response status:', response.status);
      const data = await response.json();
      console.log('🍽️ [addMeal] Response data:', JSON.stringify(data));
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to add meal');
      }
      return data.data;
    } catch (error) {
      console.error('❌ [addMeal] Error adding meal:', error);
      throw error;
    }
  },

  // Remove meal from a day
  removeMeal: async (dayId: string, mealId: string) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/daily-logs/${dayId}/meal/${mealId}`,
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to remove meal');
      }
      return data.data;
    } catch (error) {
      console.error('Error removing meal:', error);
      throw error;
    }
  },

  // Update calorie level for a day
  updateCalorieLevel: async (dayId: string, calorieLevel: number) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/daily-logs/${dayId}/calorie-level`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ calorieLevel }),
        }
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to update calorie level');
      }
      return data.data;
    } catch (error) {
      console.error('Error updating calorie level:', error);
      throw error;
    }
  },

  // Update hydration for a day
  updateHydration: async (dayId: string, hydrationAmount: number) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/daily-logs/${dayId}/hydration`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ hydrationAmount }),
        }
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to update hydration');
      }
      return data.data;
    } catch (error) {
      console.error('Error updating hydration:', error);
      throw error;
    }
  },

  // Complete a day and unlock the next
  completeDay: async (weeklyTrackingId: string, dayNumber: number) => {
    try {
      console.log('🔧 API Request Details:');
      console.log('- URL:', `${API_BASE_URL}/daily-logs/complete-day`);
      console.log('- weeklyTrackingId:', weeklyTrackingId);
      console.log('- dayNumber:', dayNumber);
      
      const response = await fetch(`${API_BASE_URL}/daily-logs/complete-day`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          weeklyTrackingId,
          dayNumber,
        }),
      });

      console.log('📡 Response Status:', response.status, response.statusText);
      
      const data = await response.json();
      console.log('📦 Response Data:', JSON.stringify(data, null, 2));
      
      if (!response.ok) {
        console.error('❌ API Error:', data);
        throw new Error(data.message || `HTTP ${response.status}: Failed to complete day`);
      }
      
      // Check if a new weekly cycle was created (Day 7 completion)
      if (data.data && data.data.weekCompleted && data.data.newWeeklyTrackingId) {
        // Update AsyncStorage with new weekly tracking ID
        try {
          await AsyncStorage.setItem('weeklyTrackingId', data.data.newWeeklyTrackingId);
          console.log('🔄 New weekly cycle started! Updated weeklyTrackingId:', data.data.newWeeklyTrackingId);
          
          // Clear old cached data to force fresh data fetch
          await AsyncStorage.removeItem('JsonResponse');
          
          return {
            ...data.data,
            cycleRestarted: true,
            newWeeklyTrackingId: data.data.newWeeklyTrackingId
          };
        } catch (storageError) {
          console.error('Error updating weekly tracking ID:', storageError);
        }
      }
      
      return data.data;
    } catch (error: any) {
      console.error('💥 Complete Day Error:', error);
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      throw error;
    }
  },

  // Complete and save week to user profile
  completeWeek: async (weeklyTrackingId: string, userId: string) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/daily-logs/complete-week/${weeklyTrackingId}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ userId }),
        }
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to complete week');
      }
      return data.data;
    } catch (error) {
      console.error('Error completing week:', error);
      throw error;
    }
  },

  // Add water intake to a day
  addWater: async (dayId: string, amount: number) => {
    try {
      const response = await fetch(`${API_BASE_URL}/daily-logs/${dayId}/water`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ amount }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to add water intake');
      }
      return data.data;
    } catch (error) {
      console.error('Error adding water:', error);
      throw error;
    }
  },
};
