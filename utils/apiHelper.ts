import { Platform } from 'react-native';

/**
 * Get the correct API base URL for the current platform
 * - Android Emulator: 10.0.2.2 (special IP to reach host)
 * - iOS Simulator: localhost
 * - Physical device: Use environment variable or localhost
 */
export const getApiBaseUrl = (): string => {
  // For Android Emulator, use 10.0.2.2 to reach the host machine
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:5001';
  }
  
  // For iOS or other platforms
  return 'http://localhost:5001';
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
