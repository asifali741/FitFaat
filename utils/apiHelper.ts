import { getBackendBaseUrl } from './config';

/**
 * Get the correct API base URL for the current platform.
 * Uses the centralized config helper for reliable access across all environments.
 */
export const getApiBaseUrl = (): string => {
  return getBackendBaseUrl();
};

/**
 * Test the API connection
 */
export const testApiConnection = async (): Promise<{
  connected: boolean;
  message: string;
  data?: any;
  error?: any;
}> => {
  try {
    const url = `${getApiBaseUrl()}/api/admin/news/published`;
    console.log('🧪 Testing connection to:', url);
    
    const response = await fetch(url, {
      method: 'GET',
      timeout: 5000,
    } as any);
    
    if (response.ok) {
      const data = await response.json();
      return {
        connected: true,
        message: 'API connection successful!',
        data: data,
      };
    } else {
      return {
        connected: false,
        message: `API responded with status ${response.status}`,
      };
    }
  } catch (error) {
    return {
      connected: false,
      message: `Connection failed: ${error}`,
      error: error,
    };
  }
};
