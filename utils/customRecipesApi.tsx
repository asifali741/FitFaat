import { tokenStorage } from '@/utils/auth/tokenStorage';
import {
  cachedRequestJson,
  clearRequestJsonCachesWithPrefix,
  requestJson,
} from './apiHelper';
import { getBackendUrl } from './config';

const API_BASE_URL = getBackendUrl();
const JSON_HEADERS = { 'Content-Type': 'application/json' };
const CUSTOM_RECIPE_CACHE_PREFIX = 'custom-recipes:';

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

const getUserId = async () => {
  const user = await tokenStorage.getUser();
  return user?._id || user?.id || user?.userId;
};

const clearCustomRecipeCache = async () => {
  await clearRequestJsonCachesWithPrefix(CUSTOM_RECIPE_CACHE_PREFIX);
};

export const customRecipesApi = {
  // Create a new custom recipe
  createRecipe: async (recipeData: Omit<CustomRecipeData, '_id' | 'createdAt' | 'updatedAt'>): Promise<CustomRecipeData> => {
    try {
      const userId = await getUserId();

      console.log('[createRecipe] Creating recipe:', recipeData.recipeName);
      console.log('[createRecipe] User ID:', userId);

      if (!userId) {
        throw new Error('User not authenticated. Please log in again.');
      }

      const data = await requestJson<any>(
        `${API_BASE_URL}/custom-recipes`,
        {
          method: 'POST',
          headers: JSON_HEADERS,
          body: JSON.stringify({
            ...recipeData,
            userId,
          }),
        },
        { timeoutMs: 12000, retries: 0 }
      );

      await clearCustomRecipeCache();
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
      const userId = await getUserId();

      if (!userId) {
        console.warn('[getUserRecipes] No user ID found');
        return [];
      }

      console.log('[getUserRecipes] Fetching recipes for user:', userId);

      const data = await cachedRequestJson<any>(
        `${CUSTOM_RECIPE_CACHE_PREFIX}user:${userId}`,
        `${API_BASE_URL}/custom-recipes/user/${userId}`,
        {
          method: 'GET',
          headers: JSON_HEADERS,
        },
        READ_REQUEST_CONFIG
      );

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
      const userId = await getUserId();

      if (!userId) {
        return [];
      }

      console.log('[searchRecipes] Searching recipes:', query);

      const data = await cachedRequestJson<any>(
        `${CUSTOM_RECIPE_CACHE_PREFIX}search:${userId}:${query.trim().toLowerCase()}`,
        `${API_BASE_URL}/custom-recipes/search?userId=${userId}&query=${encodeURIComponent(query)}`,
        {
          method: 'GET',
          headers: JSON_HEADERS,
        },
        READ_REQUEST_CONFIG
      );

      return data.data || [];
    } catch (error) {
      console.error('[searchRecipes] Error:', error);
      return [];
    }
  },

  // Get a single recipe by ID
  getRecipeById: async (recipeId: string): Promise<CustomRecipeData | null> => {
    try {
      console.log('[getRecipeById] Fetching recipe:', recipeId);

      const data = await cachedRequestJson<any>(
        `${CUSTOM_RECIPE_CACHE_PREFIX}item:${recipeId}`,
        `${API_BASE_URL}/custom-recipes/${recipeId}`,
        {
          method: 'GET',
          headers: JSON_HEADERS,
        },
        READ_REQUEST_CONFIG
      );

      return data.data;
    } catch (error) {
      console.error('[getRecipeById] Error:', error);
      return null;
    }
  },

  // Update a custom recipe
  updateRecipe: async (recipeId: string, updates: Partial<CustomRecipeData>): Promise<CustomRecipeData> => {
    try {
      console.log('[updateRecipe] Updating recipe:', recipeId);

      const data = await requestJson<any>(
        `${API_BASE_URL}/custom-recipes/${recipeId}`,
        {
          method: 'PUT',
          headers: JSON_HEADERS,
          body: JSON.stringify(updates),
        },
        { timeoutMs: 12000, retries: 0 }
      );

      await clearCustomRecipeCache();
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
      console.log('[deleteRecipe] Deleting recipe:', recipeId);

      await requestJson<any>(
        `${API_BASE_URL}/custom-recipes/${recipeId}`,
        {
          method: 'DELETE',
          headers: JSON_HEADERS,
        },
        { timeoutMs: 12000, retries: 0 }
      );

      await clearCustomRecipeCache();
      console.log('[deleteRecipe] Recipe deleted successfully');
      return true;
    } catch (error) {
      console.error('[deleteRecipe] Error:', error);
      return false;
    }
  },
};
