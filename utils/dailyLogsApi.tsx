import Constants from 'expo-constants';
import { Platform } from 'react-native';

const ENV = Constants.expoConfig?.extra;

// Get base URL from environment variables
const getBaseURL = () => {
  const envUrl = ENV?.EXPO_PUBLIC_BACKEND_API_URL;
  if (envUrl) {
    // envUrl already includes /api, so return it directly
    return envUrl;
  }
  // Default: use 10.0.2.2 for Android emulator, localhost for iOS
  const defaultHost = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
  return `http://${defaultHost}:5001/api`;
};

const API_BASE_URL = getBaseURL();

export const dailyLogsApi = {
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
    } catch (error) {
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

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to add meal');
      }
      return data.data;
    } catch (error) {
      console.error('Error adding meal:', error);
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

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to complete day');
      }
      return data.data;
    } catch (error) {
      console.error('Error completing day:', error);
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
