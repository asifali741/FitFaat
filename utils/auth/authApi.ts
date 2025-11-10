import axios from 'axios';
import { tokenStorage } from './tokenStorage';

// For Android Emulator, use 10.0.2.2 instead of localhost
const API_URL = 'http://10.0.2.2:5001/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests if it exists
api.interceptors.request.use(async (config) => {
  const token = await tokenStorage.getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authApi = {
  // Register new user
  register: async (userData: { email: string; username: string; password: string }) => {
    try {
      console.log('Sending registration request:', {
        url: API_URL + '/auth/register',
        data: { ...userData, password: '***' }
      });

      const response = await api.post('/auth/register', userData);
      console.log('Registration response:', response.data);

      if (response.data.token) {
        await tokenStorage.saveToken(response.data.token);
        await tokenStorage.saveUser(response.data.user);
      }
      return response.data;
    } catch (error: any) {
      console.error('Registration error:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      throw error;
    }
  },

  // Login user
  login: async (credentials: { identifier: string; password: string }) => {
    try {
      console.log('Sending login request:', {
        url: API_URL + '/auth/login',
        identifier: credentials.identifier
      });

      const response = await api.post('/auth/login', credentials);
      console.log('Login response:', response.data);

      if (response.data.token) {
        await tokenStorage.saveToken(response.data.token);
        await tokenStorage.saveUser(response.data.user);
      }
      return response.data;
    } catch (error: any) {
      console.error('Login error:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      
      // Throw a more user-friendly error message
      if (error.response?.data?.message) {
        throw error.response.data.message;
      } else if (error.message.includes('Network Error')) {
        throw 'Unable to connect to server. Please check your internet connection.';
      } else {
        throw error.message || 'Login failed. Please try again.';
      }
    }
  },

  // Logout user
  logout: async () => {
    await tokenStorage.clearAll();
  },

  // Check if user is authenticated
  isAuthenticated: async () => {
    const token = await tokenStorage.getToken();
    return !!token;
  },

  // Get user's onboarding status
  getOnboardingStatus: async () => {
    try {
      const response = await api.get('/user/onboarding-status');
      return response.data;
    } catch (error: any) {
      throw error.response?.data || error.message;
    }
  },

  // Update user information during onboarding
  completeOnboarding: async (userInfo: {
    name: string;
    height: number;
    weight: number;
    gender: 'male' | 'female' | 'other';
    birthDate: { day: number; month: number; year: number };
    fitnessGoal: number;
    age?: number;
  }) => {
    try {
      const response = await api.put('/user/onboarding', userInfo);
      return response.data;
    } catch (error: any) {
      throw error.response?.data || error.message;
    }
  },

  // Update user's BMI summary including fitness targets
  updateBmiSummary: async (data: {
    height: number;        // in cm
    weight: number;        // in kg
    gender: 'male' | 'female' | 'other';
    age: number;          // between 13-120
    activityLevel: 'sedentary' | 'light' | 'moderate' | 'active' | 'veryActive';
    fitnessGoal: 1 | 2 | 3;  // 1: Weight Loss, 2: Muscle Gain, 3: Weight Gain
  }) => {
    try {
      const response = await api.post('/user/update-bmi-summary', data);
      return response.data;
    } catch (error: any) {
      throw error.response?.data || error.message;
    }
  },

  // Doctor Registration API
  submitDoctorRegistration: async (doctorData: any) => {
    try {
      const response = await api.post('/doctors/register', doctorData);
      return response.data;
    } catch (error: any) {
      throw error.response?.data || error.message;
    }
  },

  getDoctorStatus: async () => {
    try {
      const response = await api.get('/doctors/status');
      return response.data;
    } catch (error: any) {
      throw error.response?.data || error.message;
    }
  },
};