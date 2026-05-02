import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { router } from 'expo-router';
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { tokenStorage } from '@/utils/auth/tokenStorage';
import { getBackendBaseUrl } from '@/utils/config';

// Detect if running in Expo Go (push notifications are not supported in Expo Go with SDK 53+)
const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

// Lazily loaded Notifications module - only imported when NOT in Expo Go
let Notifications: typeof import('expo-notifications') | null = null;

async function getNotificationsModule() {
  if (isExpoGo) return null;
  if (!Notifications) {
    Notifications = await import('expo-notifications');
  }
  return Notifications;
}

// Configure notification behavior (only when not in Expo Go)
if (!isExpoGo) {
  getNotificationsModule().then((mod) => {
    if (mod) {
      mod.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
          shouldShowBanner: true,
          shouldShowList: true,
        }),
      });
    }
  });
}

// Notification settings keys
const NOTIFICATION_SETTINGS_KEY = 'notification_settings';

// Default notification settings
export interface NotificationSettings {
  appointmentReminders: boolean;
  newsUpdates: boolean;
  chatMessages: boolean;
  reminderMinutes: number; // Minutes before appointment
}

const defaultSettings: NotificationSettings = {
  appointmentReminders: true,
  newsUpdates: true,
  chatMessages: true,
  reminderMinutes: 15,
};

// Notification types for routing
export type NotificationType = 'appointment' | 'news' | 'chat' | 'general';

interface NotificationData {
  type: NotificationType;
  appointmentId?: string;
  newsId?: string;
  chatId?: string;
  doctorId?: string;
  patientId?: string;
}

interface NotificationContextType {
  expoPushToken: string | null;
  notification: any | null;
  permissionStatus: 'granted' | 'denied' | 'undetermined';
  notificationSettings: NotificationSettings;
  badgeCount: number;
  // Permission
  requestPermissions: () => Promise<boolean>;
  // Settings
  updateNotificationSettings: (settings: Partial<NotificationSettings>) => Promise<void>;
  // Local notifications
  scheduleAppointmentReminder: (appointmentId: string, appointmentTime: Date, doctorName: string) => Promise<string | null>;
  cancelAppointmentReminder: (notificationId: string) => Promise<void>;
  sendLocalNotification: (title: string, body: string, data?: NotificationData) => Promise<void>;
  // Badge
  setBadgeCount: (count: number) => Promise<void>;
  incrementBadge: () => Promise<void>;
  clearBadge: () => Promise<void>;
  // Clear all
  clearAllNotifications: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [notification, setNotification] = useState<any | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<'granted' | 'denied' | 'undetermined'>('undetermined');
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>(defaultSettings);
  const [badgeCount, setBadgeCountState] = useState(0);
  
  const notificationListener = useRef<any>(null);
  const responseListener = useRef<any>(null);
  const appState = useRef(AppState.currentState);

  // Load settings on mount
  useEffect(() => {
    loadNotificationSettings();
    loadBadgeCount();
  }, []);

  // Request permissions on first launch
  useEffect(() => {
    checkAndRequestPermissions();
  }, []);

  // Setup notification listeners
  useEffect(() => {
    if (isExpoGo) {
      console.log('📱 Running in Expo Go - notification listeners are not available.');
      // Still listen for app state changes
      const subscription = AppState.addEventListener('change', nextAppState => {
        if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
          loadBadgeCount();
        }
        appState.current = nextAppState;
      });
      return () => {
        subscription.remove();
      };
    }

    // Load the notifications module and set up listeners
    let cleanedUp = false;
    getNotificationsModule().then((mod) => {
      if (!mod || cleanedUp) return;

      // Listen for notifications when app is in foreground
      notificationListener.current = mod.addNotificationReceivedListener((notif: any) => {
        console.log('📬 Notification received (foreground):', notif.request.content.title);
        setNotification(notif);
        incrementBadge();
      });

      // Listen for notification interactions (when user taps notification)
      responseListener.current = mod.addNotificationResponseReceivedListener((response: any) => {
        console.log('👆 Notification tapped:', response.notification.request.content.title);
        const data = response.notification.request.content.data;
        if (data && typeof data === 'object' && 'type' in data) {
          handleNotificationTap(data as unknown as NotificationData);
        }
      });
    });

    // Listen for app state changes to update badge
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        // App came to foreground - refresh badge count
        loadBadgeCount();
      }
      appState.current = nextAppState;
    });

    return () => {
      cleanedUp = true;
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
      subscription.remove();
    };
  }, []);

  // Check and request permissions on first launch
  const checkAndRequestPermissions = async () => {
    if (isExpoGo) {
      console.log('📱 Running in Expo Go - push notifications are not available. Use a development build for full notification support.');
      setPermissionStatus('undetermined');
      return;
    }

    try {
      const mod = await getNotificationsModule();
      if (!mod) return;

      const { status: existingStatus } = await mod.getPermissionsAsync();
      setPermissionStatus(existingStatus as 'granted' | 'denied' | 'undetermined');
      
      if (existingStatus === 'undetermined') {
        // First launch - request permissions
        console.log('🔔 First launch - requesting notification permissions...');
        await requestPermissions();
      } else if (existingStatus === 'granted') {
        // Already granted - register token
        await registerForPushNotifications();
      } else {
        console.log('❌ Notification permission denied - app will function without notifications');
      }
    } catch (error) {
      console.error('Error checking permissions:', error);
    }
  };

  // Request notification permissions
  const requestPermissions = async (): Promise<boolean> => {
    if (isExpoGo) {
      console.log('📱 Running in Expo Go - skipping push notification permission request.');
      return false;
    }

    try {
      const mod = await getNotificationsModule();
      if (!mod) return false;

      console.log('🔔 Requesting notification permissions...');
      const { status } = await mod.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
        },
      });
      
      setPermissionStatus(status as 'granted' | 'denied' | 'undetermined');
      
      if (status === 'granted') {
        console.log('✅ Notification permission granted');
        await registerForPushNotifications();
        return true;
      } else {
        console.log('❌ Notification permission denied');
        return false;
      }
    } catch (error) {
      console.error('Error requesting permissions:', error);
      return false;
    }
  };

  // Register for push notifications
  const registerForPushNotifications = async () => {
    if (isExpoGo) {
      console.log('📱 Running in Expo Go - skipping push token registration.');
      return;
    }

    try {
      const mod = await getNotificationsModule();
      if (!mod) return;

      // Get Expo Push Token
      const projectId = Constants.expoConfig?.extra?.eas?.projectId;
      const token = await mod.getExpoPushTokenAsync({
        projectId: projectId,
      });
      console.log('✅ Expo Push Token:', token.data);
      setExpoPushToken(token.data);

      // Register token with backend
      await registerTokenWithBackend(token.data);

      // For Android, set up notification channels
      if (Platform.OS === 'android') {
        await setupAndroidChannels();
      }
    } catch (error) {
      console.error('❌ Error registering for notifications:', error);
    }
  };

  // Setup Android notification channels
  const setupAndroidChannels = async () => {
    const mod = await getNotificationsModule();
    if (!mod) return;

    // Default channel
    await mod.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: mod.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#4A90D9',
      sound: 'default',
    });

    // Appointment reminders channel
    await mod.setNotificationChannelAsync('appointments', {
      name: 'Appointment Reminders',
      description: 'Reminders for upcoming appointments',
      importance: mod.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#4A90D9',
      sound: 'default',
    });

    // Chat messages channel
    await mod.setNotificationChannelAsync('chat', {
      name: 'Chat Messages',
      description: 'New chat messages',
      importance: mod.AndroidImportance.HIGH,
      sound: 'default',
    });

    // News updates channel
    await mod.setNotificationChannelAsync('news', {
      name: 'News Updates',
      description: 'Health news and updates',
      importance: mod.AndroidImportance.DEFAULT,
      sound: 'default',
    });
  };

  // Register token with backend
  const registerTokenWithBackend = async (pushToken: string) => {
    try {
      const ENV = Constants.expoConfig?.extra;
      const API_URL = getBackendBaseUrl();

      // Get user ID from storage
      const user = await tokenStorage.getUser();
      const userId = user?.id || `device_${Platform.OS}_${Date.now()}`;

      console.log(`📱 Registering push token for userId: ${userId}`);

      const response = await axios.post(`${API_URL}/api/push-token/register`, {
        userId: userId,
        expoPushToken: pushToken,
        platform: Platform.OS,
      });

      console.log('✅ Push token registered with backend:', response.data);
    } catch (error) {
      console.error('⚠️ Failed to register token with backend:', error);
    }
  };

  // Handle notification tap - navigate to relevant screen
  const handleNotificationTap = (data: NotificationData) => {
    if (!data || !data.type) {
      console.log('No notification data to handle');
      return;
    }

    console.log('🔗 Handling notification tap:', data.type);

    switch (data.type) {
      case 'appointment':
        if (data.appointmentId) {
          router.push({
            pathname: '/(main)/(conference)/appointment-details',
            params: { appointmentId: data.appointmentId }
          });
        } else {
          router.push('/(main)/(conference)/my-appointments');
        }
        break;
      
      case 'news':
        router.push('/(main)/(news)');
        break;
      
      case 'chat':
        if (data.chatId || data.appointmentId) {
          router.push({
            pathname: '/(main)/(conference)/appointment-chat',
            params: { 
              appointmentId: data.appointmentId || data.chatId,
              doctorId: data.doctorId,
              patientId: data.patientId
            }
          });
        } else {
          router.push('/(main)/(conference)/all-chats');
        }
        break;
      
      default:
        console.log('Unknown notification type:', data.type);
    }

    // Clear badge when user interacts with notification
    clearBadge();
  };

  // Load notification settings from storage
  const loadNotificationSettings = async () => {
    try {
      const settings = await AsyncStorage.getItem(NOTIFICATION_SETTINGS_KEY);
      if (settings) {
        setNotificationSettings(JSON.parse(settings));
      }
    } catch (error) {
      console.error('Error loading notification settings:', error);
    }
  };

  // Update notification settings
  const updateNotificationSettings = async (newSettings: Partial<NotificationSettings>) => {
    try {
      const updated = { ...notificationSettings, ...newSettings };
      setNotificationSettings(updated);
      await AsyncStorage.setItem(NOTIFICATION_SETTINGS_KEY, JSON.stringify(updated));
      console.log('📝 Notification settings updated:', updated);
    } catch (error) {
      console.error('Error saving notification settings:', error);
    }
  };

  // Schedule appointment reminder (15 mins before by default)
  const scheduleAppointmentReminder = async (
    appointmentId: string,
    appointmentTime: Date,
    doctorName: string
  ): Promise<string | null> => {
    if (!notificationSettings.appointmentReminders) {
      console.log('Appointment reminders disabled');
      return null;
    }

    if (isExpoGo) {
      console.log('📱 Running in Expo Go - cannot schedule notifications.');
      return null;
    }

    try {
      const mod = await getNotificationsModule();
      if (!mod) return null;

      const reminderTime = new Date(appointmentTime.getTime() - notificationSettings.reminderMinutes * 60 * 1000);
      
      // Don't schedule if reminder time is in the past
      if (reminderTime <= new Date()) {
        console.log('Reminder time is in the past, skipping');
        return null;
      }

      const notificationId = await mod.scheduleNotificationAsync({
        content: {
          title: '📅 Upcoming Appointment',
          body: `Your appointment with ${doctorName} is in ${notificationSettings.reminderMinutes} minutes`,
          data: { 
            type: 'appointment' as NotificationType, 
            appointmentId 
          },
          sound: 'default',
          badge: badgeCount + 1,
        },
        trigger: {
          date: reminderTime,
          channelId: 'appointments',
        } as any,
      });

      console.log(`⏰ Appointment reminder scheduled for ${reminderTime.toLocaleString()}`);
      return notificationId;
    } catch (error) {
      console.error('Error scheduling appointment reminder:', error);
      return null;
    }
  };

  // Cancel appointment reminder
  const cancelAppointmentReminder = async (notificationId: string) => {
    try {
      const mod = await getNotificationsModule();
      if (!mod) return;

      await mod.cancelScheduledNotificationAsync(notificationId);
      console.log('❌ Appointment reminder cancelled:', notificationId);
    } catch (error) {
      console.error('Error cancelling reminder:', error);
    }
  };

  // Send local notification immediately
  const sendLocalNotification = async (title: string, body: string, data?: NotificationData) => {
    // Check settings based on notification type
    if (data?.type === 'news' && !notificationSettings.newsUpdates) {
      console.log('News notifications disabled');
      return;
    }
    if (data?.type === 'chat' && !notificationSettings.chatMessages) {
      console.log('Chat notifications disabled');
      return;
    }
    if (data?.type === 'appointment' && !notificationSettings.appointmentReminders) {
      console.log('Appointment notifications disabled');
      return;
    }

    if (isExpoGo) {
      console.log('📱 Running in Expo Go - cannot send notifications.');
      return;
    }

    try {
      const mod = await getNotificationsModule();
      if (!mod) return;

      await mod.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: (data || { type: 'general' }) as Record<string, unknown>,
          sound: 'default',
          badge: badgeCount + 1,
        },
        trigger: null, // Show immediately
      });
      console.log('📤 Local notification sent:', title);
    } catch (error) {
      console.error('Error sending local notification:', error);
    }
  };

  // Badge count management
  const loadBadgeCount = async () => {
    try {
      const count = await AsyncStorage.getItem('badge_count');
      const parsedCount = count ? parseInt(count, 10) : 0;
      setBadgeCountState(parsedCount);

      if (!isExpoGo) {
        const mod = await getNotificationsModule();
        if (mod) await mod.setBadgeCountAsync(parsedCount);
      }
    } catch (error) {
      console.error('Error loading badge count:', error);
    }
  };

  const setBadgeCount = async (count: number) => {
    try {
      setBadgeCountState(count);
      if (!isExpoGo) {
        const mod = await getNotificationsModule();
        if (mod) await mod.setBadgeCountAsync(count);
      }
      await AsyncStorage.setItem('badge_count', count.toString());
      console.log('🔢 Badge count set to:', count);
    } catch (error) {
      console.error('Error setting badge count:', error);
    }
  };

  const incrementBadge = useCallback(async () => {
    try {
      const newCount = badgeCount + 1;
      setBadgeCountState(newCount);
      if (!isExpoGo) {
        const mod = await getNotificationsModule();
        if (mod) await mod.setBadgeCountAsync(newCount);
      }
      await AsyncStorage.setItem('badge_count', newCount.toString());
    } catch (error) {
      console.error('Error incrementing badge:', error);
    }
  }, [badgeCount]);

  const clearBadge = async () => {
    try {
      setBadgeCountState(0);
      if (!isExpoGo) {
        const mod = await getNotificationsModule();
        if (mod) await mod.setBadgeCountAsync(0);
      }
      await AsyncStorage.setItem('badge_count', '0');
      console.log('🔢 Badge cleared');
    } catch (error) {
      console.error('Error clearing badge:', error);
    }
  };

  // Clear all notifications
  const clearAllNotifications = async () => {
    try {
      if (!isExpoGo) {
        const mod = await getNotificationsModule();
        if (mod) await mod.dismissAllNotificationsAsync();
      }
      await clearBadge();
      console.log('🧹 All notifications cleared');
    } catch (error) {
      console.error('Error clearing notifications:', error);
    }
  };

  const value: NotificationContextType = {
    expoPushToken,
    notification,
    permissionStatus,
    notificationSettings,
    badgeCount,
    requestPermissions,
    updateNotificationSettings,
    scheduleAppointmentReminder,
    cancelAppointmentReminder,
    sendLocalNotification,
    setBadgeCount,
    incrementBadge,
    clearBadge,
    clearAllNotifications,
  };

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
};
