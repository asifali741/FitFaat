import axios from 'axios';
import type { ChatAccessGrantedNotificationPayload } from '../chatAccessNotifications';
import { tokenStorage } from './tokenStorage';
import { getBackendUrl } from '../config';
import {
  cachedRequestJson,
  clearRequestJsonCachesWithPrefix,
} from '../apiHelper';
import { syncLatestHealthData } from '../healthDataSync';
import {
  removeStoredWeeklyTrackingId,
  setStoredWeeklyTrackingId,
} from '../dashboardStorage';
import {
  backupAccountScopedStorageLocally,
  backupAccountScopedStorageToCloud,
  clearBackendDerivedAccountStorage,
  clearAccountScopedStorage,
  restoreAccountScopedStorageLocally,
  restoreAccountScopedStorageFromCloud,
  shouldClearAccountStorageForLogin,
} from './accountScopedStorage';
import { normalizeApiError } from './authErrors';

const AXIOS_TIMEOUT_MS = 12000;
const RETRYABLE_GET_STATUSES = new Set([408, 429, 500, 502, 503, 504]);
const SESSION_REFRESH_TIMEOUT_MS = 6500;
const AUTH_GET_CACHE_PREFIX = 'auth-api:get:';
const AUTH_FAST_READ_CONFIG = {
  timeoutMs: 6500,
  retries: 1,
  retryDelayMs: 500,
  cacheTtlMs: 60 * 1000,
  maxStaleMs: 24 * 60 * 60 * 1000,
  allowStaleOnError: true,
  maxWaitForFreshMs: 1800,
  refreshCacheInBackground: true,
};
const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-cache',
  Pragma: 'no-cache',
};

const api = axios.create({
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: AXIOS_TIMEOUT_MS,
});

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const getAuthCacheUserKey = async () => {
  const user = await tokenStorage.getUser().catch(() => null);
  return user?._id || user?.id || user?.userId || user?.email || 'current';
};

const cachedGet = async <T = any>(
  path: string,
  cacheScope = path,
  config: Partial<typeof AUTH_FAST_READ_CONFIG> = {}
) => {
  const [token, userKey] = await Promise.all([
    tokenStorage.getToken(),
    getAuthCacheUserKey(),
  ]);

  return cachedRequestJson<T>(
    `${AUTH_GET_CACHE_PREFIX}${userKey}:${cacheScope}`,
    `${getBackendUrl()}${path}`,
    {
      method: 'GET',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        'Content-Type': 'application/json',
      },
    },
    {
      ...AUTH_FAST_READ_CONFIG,
      ...config,
    }
  );
};

const clearAuthGetCaches = () => {
  clearRequestJsonCachesWithPrefix(AUTH_GET_CACHE_PREFIX).catch(() => {
    // Cache invalidation is best-effort after writes.
  });
};

const mergeUserSnapshots = (existingUser: any, incomingUser: any) => {
  if (!incomingUser) return existingUser || null;

  return {
    ...(existingUser || {}),
    ...incomingUser,
    userInfo: {
      ...(existingUser?.userInfo || {}),
      ...(incomingUser?.userInfo || {}),
    },
  };
};

const getWeeklyTrackingIdFromUser = (user: any) => (
  user?.weeklyTrackingId
  || user?.currentWeeklyTrackingId
  || user?.weeklyTracking?._id
  || user?.weeklyTracking?.id
);

const persistUserSnapshot = async (
  user: any,
  options: { removeWeeklyTrackingWhenMissing?: boolean } = {}
) => {
  if (!user) return null;

  await tokenStorage.saveUser(user);

  const weeklyTrackingId = getWeeklyTrackingIdFromUser(user);
  if (weeklyTrackingId) {
    await setStoredWeeklyTrackingId(String(weeklyTrackingId), user);
  } else if (options.removeWeeklyTrackingWhenMissing) {
    await removeStoredWeeklyTrackingId(user);
  }

  return user;
};

const getUserFromProfileResponse = (payload: any) => {
  const data = payload?.data;
  return data?.user || payload?.user || (data && !Array.isArray(data) ? data : null);
};

const refreshCurrentUserData = async (
  options: { clearBackendCache?: boolean } = {}
) => {
  const storedUser = await tokenStorage.getUser();
  let nextUser = storedUser;
  let onboardingStatus: any = null;
  let didRefreshFromBackend = false;

  const [profileResult, onboardingResult] = await Promise.allSettled([
    api.get('/user/profile', {
      headers: NO_CACHE_HEADERS,
      timeout: SESSION_REFRESH_TIMEOUT_MS,
    }),
    api.get('/user/onboarding-status', {
      headers: NO_CACHE_HEADERS,
      timeout: SESSION_REFRESH_TIMEOUT_MS,
    }),
  ]);

  if (profileResult.status === 'fulfilled') {
    didRefreshFromBackend = true;
    const profileUser = getUserFromProfileResponse(profileResult.value.data);
    if (profileUser) {
      nextUser = mergeUserSnapshots(nextUser, profileUser);
    }
  } else {
    const error = profileResult.reason as any;
    console.log('Fresh profile refresh unavailable:', error?.message || error);
  }

  if (onboardingResult.status === 'fulfilled') {
    didRefreshFromBackend = true;
    onboardingStatus = onboardingResult.value.data;
    const onboardingPatch: any = {
      isOnboardingComplete: Boolean(onboardingStatus?.isOnboardingComplete),
    };
    if (onboardingStatus?.userInfo) {
      onboardingPatch.userInfo = onboardingStatus.userInfo;
    }
    if (onboardingStatus?.weeklyTrackingId) {
      onboardingPatch.weeklyTrackingId = onboardingStatus.weeklyTrackingId;
    }
    nextUser = mergeUserSnapshots(nextUser, onboardingPatch);
  } else {
    const error = onboardingResult.reason as any;
    console.log('Fresh onboarding refresh unavailable:', error?.message || error);
  }

  if (options.clearBackendCache && didRefreshFromBackend) {
    await clearBackendDerivedAccountStorage();
  }

  if (nextUser) {
    await persistUserSnapshot(nextUser);
  }

  syncLatestHealthData().catch((error) => {
    console.log('Health data sync unavailable during session refresh:', error?.message || error);
  });

  return { user: nextUser, onboardingStatus };
};

// Add baseURL and token to every request
api.interceptors.request.use(async (config) => {
  // Always set baseURL dynamically from centralized config
  config.baseURL = getBackendUrl();
  
  const token = await tokenStorage.getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config as any;
    const method = String(config?.method || 'get').toLowerCase();
    const retryCount = config?.__retryCount || 0;
    const status = error.response?.status;
    const isNetworkOrTimeout = (
      !error.response
      || error.code === 'ECONNABORTED'
      || /network error|timeout/i.test(error.message || '')
    );
    const isRetryableRead = method === 'get' || method === 'head';

    if (
      config
      && isRetryableRead
      && retryCount < 1
      && (isNetworkOrTimeout || RETRYABLE_GET_STATUSES.has(status))
    ) {
      config.__retryCount = retryCount + 1;
      await wait(700);
      return api(config);
    }

    return Promise.reject(error);
  }
);

export const authApi = {
  // Send OTP to email
  sendOTP: async (email: string) => {
    try {
      const response = await api.post('/auth/send-otp', { email });

      return response.data;
    } catch (error: any) {
      console.error('Send OTP error:', {
        message: error.message,
        status: error.response?.status
      });
      throw error;
    }
  },

  // Verify OTP
  verifyOTP: async (email: string, otp: string) => {
    try {
      const response = await api.post('/auth/verify-otp', { email, otp });

      return response.data;
    } catch (error: any) {
      console.error('Verify OTP error:', {
        message: error.message,
        status: error.response?.status
      });
      throw error;
    }
  },

  // Register new user
  register: async (userData: { email: string; username: string; password: string }) => {
    try {
      const response = await api.post('/auth/register', userData);

      if (response.data.token) {
        const previousUser = await tokenStorage.getUser();
        if (shouldClearAccountStorageForLogin(previousUser, response.data.user)) {
          await clearAccountScopedStorage();
        } else {
          await clearBackendDerivedAccountStorage();
        }

        await tokenStorage.saveToken(response.data.token);
        await persistUserSnapshot(response.data.user, { removeWeeklyTrackingWhenMissing: true });

        await restoreAccountScopedStorageFromCloud();
        await restoreAccountScopedStorageLocally(response.data.user);
        await refreshCurrentUserData();
      }
      return response.data;
    } catch (error: any) {
      console.error('Registration error:', {
        message: error.message,
        status: error.response?.status
      });
      throw error;
    }
  },

  // Login user
  login: async (credentials: { identifier: string; password: string }) => {
    try {
      const response = await api.post('/auth/login', credentials);

      if (response.data.token) {
        const previousUser = await tokenStorage.getUser();
        if (shouldClearAccountStorageForLogin(previousUser, response.data.user)) {
          await clearAccountScopedStorage();
        } else {
          await clearBackendDerivedAccountStorage();
        }

        await tokenStorage.saveToken(response.data.token);
        await persistUserSnapshot(response.data.user, { removeWeeklyTrackingWhenMissing: true });

        await restoreAccountScopedStorageFromCloud();
        await restoreAccountScopedStorageLocally(response.data.user);
        await refreshCurrentUserData();
      }
      return response.data;
    } catch (error: any) {
      console.error('Login error:', {
        message: error.message,
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

  // Send forgot-password OTP to email
  requestPasswordResetOTP: async (email: string) => {
    try {
      const response = await api.post('/auth/forgot-password/send-otp', { email });
      return response.data;
    } catch (error: any) {
      throw error.response?.data || error.message;
    }
  },

  // Reset password with OTP
  resetPassword: async (data: { email: string; otp: string; newPassword: string }) => {
    try {
      const response = await api.post('/auth/forgot-password/reset', data);
      return response.data;
    } catch (error: any) {
      throw error.response?.data || error.message;
    }
  },

  // Logout user
  logout: async () => {
    await backupAccountScopedStorageLocally();
    await backupAccountScopedStorageToCloud();
    await tokenStorage.clearAll();
  },

  // Permanently delete current user account
  deleteAccount: async () => {
    try {
      const response = await api.delete('/user/account');
      return response.data;
    } catch (error: any) {
      throw error.response?.data || error.message;
    }
  },

  // Check if user is authenticated
  isAuthenticated: async () => {
    const token = await tokenStorage.getToken();
    return !!token;
  },

  refreshCurrentUserData,

  // Get user's onboarding status
  getOnboardingStatus: async () => {
    try {
      const data = await cachedGet<any>('/user/onboarding-status', 'user:onboarding-status');
      const storedUser = await tokenStorage.getUser();
      if (storedUser && typeof data?.isOnboardingComplete === 'boolean') {
        const onboardingPatch: any = {
          isOnboardingComplete: Boolean(data.isOnboardingComplete),
        };
        if (data?.userInfo) {
          onboardingPatch.userInfo = data.userInfo;
        }
        if (data?.weeklyTrackingId) {
          onboardingPatch.weeklyTrackingId = data.weeklyTrackingId;
        }
        await persistUserSnapshot(
          mergeUserSnapshots(storedUser, onboardingPatch)
        );
      }
      return data;
    } catch (error: any) {
      throw normalizeApiError(error, 'Failed to get onboarding status');
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
      clearAuthGetCaches();
      return response.data;
    } catch (error: any) {
      throw normalizeApiError(error, 'Failed to complete onboarding');
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
      clearAuthGetCaches();
      return response.data;
    } catch (error: any) {
      throw normalizeApiError(error, 'Failed to update BMI summary');
    }
  },

  // Doctor Registration API
  submitDoctorRegistration: async (doctorData: any) => {
    try {
      const response = await api.post('/doctors/register', doctorData);
      clearAuthGetCaches();
      return response.data;
    } catch (error: any) {
      throw normalizeApiError(error, 'Failed to submit doctor registration');
    }
  },

  getDoctorStatus: async () => {
    try {
      return await cachedGet<any>('/doctors/status', 'doctors:status', {
        cacheTtlMs: 5 * 60 * 1000,
      });
    } catch (error: any) {
      throw normalizeApiError(error, 'Failed to get doctor status');
    }
  },

  // Get approved doctors for booking
  getApprovedDoctors: async () => {
    try {
      return await cachedGet<any>('/doctors/approved', 'doctors:approved', {
        cacheTtlMs: 5 * 60 * 1000,
      });
    } catch (error: any) {
      throw normalizeApiError(error, 'Failed to get doctors');
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
      clearAuthGetCaches();
      return response.data;
    } catch (error: any) {
      throw normalizeApiError(error, 'Failed to book appointment');
    }
  },

  // Get user's appointments
  getUserAppointments: async () => {
    try {
      return await cachedGet<any>('/appointments/my-appointments', 'appointments:mine', {
        cacheTtlMs: 30 * 1000,
        maxWaitForFreshMs: 1500,
      });
    } catch (error: any) {
      throw normalizeApiError(error, 'Failed to load appointments');
    }
  },

  // Get doctor's booked appointments
  getDoctorAppointments: async (doctorId: string) => {
    try {
      return await cachedGet<any>(`/appointments/doctor/${doctorId}`, `appointments:doctor:${doctorId}`, {
        cacheTtlMs: 30 * 1000,
        maxWaitForFreshMs: 1500,
      });
    } catch (error: any) {
      throw normalizeApiError(error, 'Failed to load doctor appointments');
    }
  },

  // Cancel an appointment
  cancelAppointment: async (appointmentId: string, reason?: string, doctorId?: string) => {
    try {
      const response = await api.put(`/appointments/${appointmentId}/cancel`, { reason, doctorId });
      clearAuthGetCaches();
      return response.data;
    } catch (error: any) {
      throw normalizeApiError(error, 'Failed to cancel appointment');
    }
  },

  // Approve an appointment (Doctor action)
  approveAppointment: async (doctorId: string, appointmentId: string) => {
    try {
      const response = await api.put(`/appointments/doctor/${doctorId}/${appointmentId}/approve`);
      clearAuthGetCaches();
      return response.data;
    } catch (error: any) {
      throw normalizeApiError(error, 'Failed to approve appointment');
    }
  },

  // Grant chat access to user (Doctor only)
  grantChatAccess: async (
    appointmentId: string,
    notification?: ChatAccessGrantedNotificationPayload
  ) => {
    try {
      const response = await api.post(
        `/chat/appointment/${appointmentId}/grant-access`,
        notification ? { notification } : {}
      );
      clearAuthGetCaches();
      return response.data;
    } catch (error: any) {
      throw normalizeApiError(error, 'Failed to grant chat access');
    }
  },

  // Get premium status
  getPremiumStatus: async () => {
    try {
      return await cachedGet<any>('/payment/premium-status', 'payment:premium-status', {
        cacheTtlMs: 2 * 60 * 1000,
      });
    } catch (error: any) {
      throw normalizeApiError(error, 'Failed to get premium status');
    }
  },
};
