import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { tokenStorage } from './tokenStorage';

const ENV = Constants.expoConfig?.extra;

// Get base URL from environment variables or use platform-specific defaults
const getAPIURL = () => {
  const envUrl = ENV?.EXPO_PUBLIC_BACKEND_API_URL;
  if (envUrl) {
    return envUrl;
  }
  // Default: use 10.0.2.2 for Android emulator, localhost for iOS
  const defaultHost = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
  return `http://${defaultHost}:5001/api`;
};

const API_URL = getAPIURL();

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
        
        // Save weeklyTrackingId to AsyncStorage if it exists
        if (response.data.user?.weeklyTrackingId) {
          await AsyncStorage.setItem('weeklyTrackingId', response.data.user.weeklyTrackingId);
          console.log('Saved weeklyTrackingId:', response.data.user.weeklyTrackingId);
        }
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
        
        // Save weeklyTrackingId to AsyncStorage if it exists
        if (response.data.user?.weeklyTrackingId) {
          await AsyncStorage.setItem('weeklyTrackingId', response.data.user.weeklyTrackingId);
          console.log('Saved weeklyTrackingId:', response.data.user.weeklyTrackingId);
        }
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

  // Get approved doctors for booking
  getApprovedDoctors: async () => {
    try {
      const response = await api.get('/doctors/approved');
      return response.data;
    } catch (error: any) {
      throw error.response?.data || error.message;
    }
  },

  // Book an appointment with a doctor
  bookAppointment: async (appointmentData: {
    doctorId: string;
    date: string;
    time: string;
    price: number;
    description?: string;
  }) => {
    try {
      const response = await api.post('/appointments/book', appointmentData);
      return response.data;
    } catch (error: any) {
      throw error.response?.data || error.message;
    }
  },

  // Get user's appointments
  getUserAppointments: async () => {
    try {
      const response = await api.get('/appointments/my-appointments');
      return response.data;
    } catch (error: any) {
      throw error.response?.data || error.message;
    }
  },

  // Get doctor's booked appointments
  getDoctorAppointments: async (doctorId: string) => {
    try {
      const response = await api.get(`/appointments/doctor/${doctorId}`);
      return response.data;
    } catch (error: any) {
      throw error.response?.data || error.message;
    }
  },

  // Cancel an appointment
  cancelAppointment: async (appointmentId: string, reason?: string, doctorId?: string) => {
    try {
      const response = await api.put(`/appointments/${appointmentId}/cancel`, { reason, doctorId });
      return response.data;
    } catch (error: any) {
      throw error.response?.data || error.message;
    }
  },

  // Approve an appointment (Doctor action)
  approveAppointment: async (doctorId: string, appointmentId: string) => {
    try {
      const response = await api.put(`/appointments/doctor/${doctorId}/${appointmentId}/approve`);
      return response.data;
    } catch (error: any) {
      throw error.response?.data || error.message;
    }
  },
};