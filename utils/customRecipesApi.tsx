import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { tokenStorage } from '@/utils/auth/tokenStorage';

const ENV = Constants.expoConfig?.extra;

// Get base URL from environment variables
const getBaseURL = () => {
  const envUrl = ENV?.EXPO_PUBLIC_BACKEND_API_URL;
  if (envUrl) {
    return envUrl;
  }
  const defaultHost = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
  return `http://${defaultHost}:5001/api`;
};

const API_BASE_URL = getBaseURL();

export interface CustomRecipeIngredient {
  name: string;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

export interface CustomRecipeData {
  _id?: string;
  userId?: string;
  recipeName: string;
  servingSize: string;
  calories_kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  ingredients: CustomRecipeIngredient[];
  useCollectiveValues: boolean;
  isCustomRecipe?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export const customRecipesApi = {
  // Create a new custom recipe
  createRecipe: async (recipeData: Omit<CustomRecipeData, '_id' | 'createdAt' | 'updatedAt'>): Promise<CustomRecipeData> => {
    try {
      const user = await tokenStorage.getUser();
      console.log('[createRecipe] User object:', user);
      
      // Try different possible user ID field names
      const userId = user?._id || user?.id || user?.userId;

      console.log('[createRecipe] Creating recipe:', recipeData.recipeName);
      console.log('[createRecipe] User ID:', userId);

      if (!userId) {
        throw new Error('User not authenticated. Please log in again.');
      }

      const response = await fetch(`${API_BASE_URL}/custom-recipes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...recipeData,
          userId,
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to create custom recipe');
      }

      console.log('[createRecipe] Recipe created successfully:', data.data._id);
      return data.data;
    } catch (error) {
      console.error('[createRecipe] Error:', error);
      throw error;
    }
  },

  // Get all custom recipes for the current user
  getUserRecipes: async (): Promise<CustomRecipeData[]> => {
    try {
      const user = await tokenStorage.getUser();
      const userId = user?._id || user?.id || user?.userId;

      if (!userId) {
        console.warn('[getUserRecipes] No user ID found');
        return [];
      }

      console.log('[getUserRecipes] Fetching recipes for user:', userId);

      const response = await fetch(`${API_BASE_URL}/custom-recipes/user/${userId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch custom recipes');
      }

      console.log('[getUserRecipes] Recipes fetched:', data.count);
      return data.data || [];
    } catch (error) {
      console.error('[getUserRecipes] Error:', error);
      return [];
    }
  },

  // Search custom recipes
  searchRecipes: async (query: string): Promise<CustomRecipeData[]> => {
    try {
      const user = await tokenStorage.getUser();
      const userId = user?._id || user?.id || user?.userId;

      if (!userId) {
        return [];
      }

      console.log('[searchRecipes] Searching recipes:', query);

      const response = await fetch(
        `${API_BASE_URL}/custom-recipes/search?userId=${userId}&query=${encodeURIComponent(query)}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to search custom recipes');
      }

      return data.data || [];
    } catch (error) {
      console.error('[searchRecipes] Error:', error);
      return [];
    }
  },

  // Get a single recipe by ID
  getRecipeById: async (recipeId: string): Promise<CustomRecipeData | null> => {
    try {
      const user = await tokenStorage.getUser();
      const userId = user?._id || user?.id || user?.userId;
      
      console.log('[getRecipeById] Fetching recipe:', recipeId);

      const response = await fetch(`${API_BASE_URL}/custom-recipes/${recipeId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch recipe');
      }

      return data.data;
    } catch (error) {
      console.error('[getRecipeById] Error:', error);
      return null;
    }
  },

  // Update a custom recipe
  updateRecipe: async (recipeId: string, updates: Partial<CustomRecipeData>): Promise<CustomRecipeData> => {
    try {
      const user = await tokenStorage.getUser();
      const userId = user?._id || user?.id || user?.userId;
      
      console.log('[updateRecipe] Updating recipe:', recipeId);

      const response = await fetch(`${API_BASE_URL}/custom-recipes/${recipeId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to update recipe');
      }

      console.log('[updateRecipe] Recipe updated successfully');
      return data.data;
    } catch (error) {
      console.error('[updateRecipe] Error:', error);
      throw error;
    }
  },

  // Delete a custom recipe
  deleteRecipe: async (recipeId: string): Promise<boolean> => {
    try {
      const user = await tokenStorage.getUser();
      const userId = user?._id || user?.id || user?.userId;
      
      console.log('[deleteRecipe] Deleting recipe:', recipeId);

      const response = await fetch(`${API_BASE_URL}/custom-recipes/${recipeId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to delete recipe');
      }

      console.log('[deleteRecipe] Recipe deleted successfully');
      return true;
    } catch (error) {
      console.error('[deleteRecipe] Error:', error);
      return false;
    }
  },
};
