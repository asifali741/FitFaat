import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { router } from 'expo-router';
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { tokenStorage } from '@/utils/auth/tokenStorage';
import { getBackendBaseUrl } from '@/utils/config';

const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
let Notifications: typeof import('expo-notifications') | null = null;

async function getNotificationsModule() {
  if (isExpoGo) return null;
  if (!Notifications) {
    Notifications = await import('expo-notifications');
  }
  return Notifications;
}

if (!isExpoGo) {
  getNotificationsModule().then((mod) => {
    mod?.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        priority: mod.AndroidNotificationPriority.MAX,
      }),
    });
  });
}

const NOTIFICATION_SETTINGS_KEY = 'notification_settings';
const BADGE_COUNT_KEY = 'badge_count';
const HOURLY_MOTIVATION_NOTIFICATION_KEY = 'hourly_motivation_notification_id';
const NOTIFICATION_COLOR = '#023C69';
const MOTIVATIONAL_QUOTES = [
  'Progress is built one choice at a time.',
  'Stay consistent. Your future self is already cheering.',
  'Small effort, repeated often, becomes real strength.',
  'You do not need perfect. You need one more good step.',
  'Fuel your body, move with purpose, and keep going.',
  'Every logged meal and every workout counts.',
];

export interface NotificationSettings {
  appointmentReminders: boolean;
  workoutReminders: boolean;
  mealReminders: boolean;
  goalProgress: boolean;
  missedActivity: boolean;
  videoCallReminders: boolean;
  bookingUpdates: boolean;
  chatMessages: boolean;
  trainerMessages: boolean;
  dietPlanUpdates: boolean;
  workoutPlanUpdates: boolean;
  subscriptionAlerts: boolean;
  communityActivity: boolean;
  challengeUpdates: boolean;
  healthTracking: boolean;
  securityAlerts: boolean;
  adminAnnouncements: boolean;
  newsUpdates: boolean;
  motivationalQuotes: boolean;
  reminderMinutes: number;
}

export type NotificationToggleKey = {
  [Key in keyof NotificationSettings]: NotificationSettings[Key] extends boolean ? Key : never;
}[keyof NotificationSettings];

const defaultSettings: NotificationSettings = {
  appointmentReminders: true,
  workoutReminders: true,
  mealReminders: true,
  goalProgress: true,
  missedActivity: true,
  videoCallReminders: true,
  bookingUpdates: true,
  chatMessages: true,
  trainerMessages: true,
  dietPlanUpdates: true,
  workoutPlanUpdates: true,
  subscriptionAlerts: true,
  communityActivity: true,
  challengeUpdates: true,
  healthTracking: true,
  securityAlerts: true,
  adminAnnouncements: true,
  newsUpdates: true,
  motivationalQuotes: true,
  reminderMinutes: 15,
};

export type NotificationType =
  | 'appointment'
  | 'workout'
  | 'meal'
  | 'goal'
  | 'missedActivity'
  | 'videoCall'
  | 'booking'
  | 'chat'
  | 'trainerMessage'
  | 'dietPlan'
  | 'workoutPlan'
  | 'subscription'
  | 'community'
  | 'challenge'
  | 'health'
  | 'security'
  | 'admin'
  | 'news'
  | 'motivation'
  | 'general';

export interface NotificationData {
  type: NotificationType;
  appointmentId?: string;
  newsId?: string;
  chatId?: string;
  doctorId?: string;
  patientId?: string;
  planId?: string;
  workoutId?: string;
  challengeId?: string;
  subscriptionId?: string;
  route?: string;
}

type NotificationTypeConfig = {
  settingKey?: NotificationToggleKey;
  channelId: string;
  channelName: string;
  channelDescription: string;
  importance: 'default' | 'high' | 'max';
};

const notificationTypeConfig: Record<NotificationType, NotificationTypeConfig> = {
  appointment: {
    settingKey: 'appointmentReminders',
    channelId: 'appointments',
    channelName: 'Appointment Reminders',
    channelDescription: 'Reminders for upcoming appointments',
    importance: 'high',
  },
  workout: {
    settingKey: 'workoutReminders',
    channelId: 'workouts',
    channelName: 'Workout Reminders',
    channelDescription: 'Workout reminders and exercise nudges',
    importance: 'high',
  },
  meal: {
    settingKey: 'mealReminders',
    channelId: 'meals',
    channelName: 'Meal Reminders',
    channelDescription: 'Meal, water, and nutrition reminders',
    importance: 'high',
  },
  goal: {
    settingKey: 'goalProgress',
    channelId: 'goals',
    channelName: 'Goal Progress',
    channelDescription: 'Fitness, weight, calorie, and streak progress',
    importance: 'default',
  },
  missedActivity: {
    settingKey: 'missedActivity',
    channelId: 'activity',
    channelName: 'Missed Activity',
    channelDescription: 'Reminders for missed workouts, meals, or logs',
    importance: 'default',
  },
  videoCall: {
    settingKey: 'videoCallReminders',
    channelId: 'video_calls',
    channelName: 'Video Calls',
    channelDescription: 'Video call reminders and incoming call alerts',
    importance: 'max',
  },
  booking: {
    settingKey: 'bookingUpdates',
    channelId: 'bookings',
    channelName: 'Booking Updates',
    channelDescription: 'Appointment confirmations, reschedules, and cancellations',
    importance: 'high',
  },
  chat: {
    settingKey: 'chatMessages',
    channelId: 'chat',
    channelName: 'Chat Messages',
    channelDescription: 'New messages in appointment chats',
    importance: 'high',
  },
  trainerMessage: {
    settingKey: 'trainerMessages',
    channelId: 'trainer_messages',
    channelName: 'Trainer Messages',
    channelDescription: 'Trainer, doctor, and coach messages',
    importance: 'high',
  },
  dietPlan: {
    settingKey: 'dietPlanUpdates',
    channelId: 'diet_plans',
    channelName: 'Diet Plan Updates',
    channelDescription: 'New or updated diet plans',
    importance: 'high',
  },
  workoutPlan: {
    settingKey: 'workoutPlanUpdates',
    channelId: 'workout_plans',
    channelName: 'Workout Plan Updates',
    channelDescription: 'New or updated workout plans',
    importance: 'high',
  },
  subscription: {
    settingKey: 'subscriptionAlerts',
    channelId: 'payments',
    channelName: 'Subscriptions and Payments',
    channelDescription: 'Payment, renewal, and subscription alerts',
    importance: 'high',
  },
  community: {
    settingKey: 'communityActivity',
    channelId: 'community',
    channelName: 'Community Activity',
    channelDescription: 'Likes, comments, follows, and challenge invites',
    importance: 'default',
  },
  challenge: {
    settingKey: 'challengeUpdates',
    channelId: 'challenges',
    channelName: 'Challenges and Streaks',
    channelDescription: 'Challenge reminders, streaks, and leaderboard updates',
    importance: 'default',
  },
  health: {
    settingKey: 'healthTracking',
    channelId: 'health',
    channelName: 'Health Tracking',
    channelDescription: 'Water, steps, sleep, and calorie target reminders',
    importance: 'default',
  },
  security: {
    settingKey: 'securityAlerts',
    channelId: 'security',
    channelName: 'Security Alerts',
    channelDescription: 'Login, password, and account security alerts',
    importance: 'high',
  },
  admin: {
    settingKey: 'adminAnnouncements',
    channelId: 'announcements',
    channelName: 'Announcements',
    channelDescription: 'FitFaat announcements, maintenance, and offers',
    importance: 'default',
  },
  news: {
    settingKey: 'newsUpdates',
    channelId: 'news',
    channelName: 'News Updates',
    channelDescription: 'Health news and article updates',
    importance: 'default',
  },
  motivation: {
    settingKey: 'motivationalQuotes',
    channelId: 'motivation',
    channelName: 'Motivational Quotes',
    channelDescription: 'Hourly motivational quotes from FitFaat',
    importance: 'default',
  },
  general: {
    channelId: 'default',
    channelName: 'FitFaat Notifications',
    channelDescription: 'General FitFaat notifications',
    importance: 'default',
  },
};

export interface FitFaatNotificationRequest {
  type: NotificationType;
  title: string;
  body: string;
  data?: Partial<NotificationData>;
  sound?: boolean | string;
  sticky?: boolean;
  autoDismiss?: boolean;
  date?: Date;
  seconds?: number;
  daily?: {
    hour: number;
    minute: number;
  };
  weekly?: {
    weekday: number;
    hour: number;
    minute: number;
  };
  repeats?: boolean;
}

interface NotificationContextType {
  expoPushToken: string | null;
  notification: any | null;
  permissionStatus: 'granted' | 'denied' | 'undetermined';
  notificationSettings: NotificationSettings;
  badgeCount: number;
  requestPermissions: () => Promise<boolean>;
  updateNotificationSettings: (settings: Partial<NotificationSettings>) => Promise<void>;
  scheduleFitFaatNotification: (request: FitFaatNotificationRequest) => Promise<string | null>;
  sendFitFaatNotification: (
    type: NotificationType,
    title: string,
    body: string,
    data?: Partial<NotificationData>
  ) => Promise<void>;
  scheduleAppointmentReminder: (appointmentId: string, appointmentTime: Date, doctorName: string) => Promise<string | null>;
  scheduleVideoCallReminder: (appointmentId: string, callTime: Date, participantName?: string) => Promise<string | null>;
  scheduleWorkoutReminder: (hour?: number, minute?: number, workoutName?: string) => Promise<string | null>;
  scheduleMealReminder: (mealName: string, hour: number, minute: number) => Promise<string | null>;
  scheduleMissedActivityReminder: (hour?: number, minute?: number) => Promise<string | null>;
  scheduleHealthTrackingReminder: (title: string, body: string, hour: number, minute: number) => Promise<string | null>;
  sendGoalProgressNotification: (title: string, body: string) => Promise<void>;
  sendBookingUpdateNotification: (title: string, body: string, appointmentId?: string) => Promise<void>;
  sendTrainerMessageNotification: (senderName: string, message: string, data?: Partial<NotificationData>) => Promise<void>;
  sendDietPlanUpdateNotification: (title: string, body: string, planId?: string) => Promise<void>;
  sendWorkoutPlanUpdateNotification: (title: string, body: string, workoutId?: string) => Promise<void>;
  sendSubscriptionAlert: (title: string, body: string, subscriptionId?: string) => Promise<void>;
  sendCommunityNotification: (title: string, body: string) => Promise<void>;
  sendChallengeNotification: (title: string, body: string, challengeId?: string) => Promise<void>;
  sendSecurityAlert: (title: string, body: string) => Promise<void>;
  sendAdminAnnouncement: (title: string, body: string) => Promise<void>;
  scheduleHourlyMotivation: () => Promise<string | null>;
  cancelHourlyMotivation: () => Promise<void>;
  cancelScheduledNotification: (notificationId: string) => Promise<void>;
  cancelAppointmentReminder: (notificationId: string) => Promise<void>;
  sendLocalNotification: (title: string, body: string, data?: NotificationData) => Promise<void>;
  setBadgeCount: (count: number) => Promise<void>;
  incrementBadge: () => Promise<void>;
  clearBadge: () => Promise<void>;
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
  const badgeCountRef = useRef(0);

  useEffect(() => {
    badgeCountRef.current = badgeCount;
  }, [badgeCount]);

  useEffect(() => {
    loadNotificationSettings();
    loadBadgeCount();
    checkAndRequestPermissions();
  }, []);

  useEffect(() => {
    if (isExpoGo) {
      const subscription = AppState.addEventListener('change', (nextAppState) => {
        if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
          loadBadgeCount();
        }
        appState.current = nextAppState;
      });
      return () => subscription.remove();
    }

    let cleanedUp = false;
    getNotificationsModule().then((mod) => {
      if (!mod || cleanedUp) return;

      notificationListener.current = mod.addNotificationReceivedListener((notif: any) => {
        setNotification(notif);
        incrementBadge();
      });

      responseListener.current = mod.addNotificationResponseReceivedListener((response: any) => {
        const data = response.notification.request.content.data;
        if (data && typeof data === 'object' && 'type' in data) {
          handleNotificationTap(data as unknown as NotificationData);
        }
      });
    });

    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        loadBadgeCount();
      }
      appState.current = nextAppState;
    });

    return () => {
      cleanedUp = true;
      notificationListener.current?.remove();
      responseListener.current?.remove();
      subscription.remove();
    };
  }, []);

  const checkAndRequestPermissions = async () => {
    if (isExpoGo) {
      setPermissionStatus('undetermined');
      return;
    }

    try {
      const mod = await getNotificationsModule();
      if (!mod) return;

      if (Platform.OS === 'android') {
        await setupAndroidChannels();
      }

      const { status } = await mod.getPermissionsAsync();
      setPermissionStatus(status as 'granted' | 'denied' | 'undetermined');

      if (status === 'undetermined') {
        await requestPermissions();
      } else if (status === 'granted') {
        await registerForPushNotifications();
      }
    } catch (error) {
      console.error('Error checking notification permissions:', error);
    }
  };

  const requestPermissions = async (): Promise<boolean> => {
    if (isExpoGo) return false;

    try {
      const mod = await getNotificationsModule();
      if (!mod) return false;

      const { status } = await mod.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
        },
      });

      setPermissionStatus(status as 'granted' | 'denied' | 'undetermined');

      if (status === 'granted') {
        await registerForPushNotifications();
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error requesting notification permissions:', error);
      return false;
    }
  };

  const registerForPushNotifications = async () => {
    if (isExpoGo) return;

    try {
      if (Platform.OS === 'android') {
        await setupAndroidChannels();
      }

      const mod = await getNotificationsModule();
      if (!mod) return;

      const projectId = Constants.expoConfig?.extra?.eas?.projectId;
      const token = await mod.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
      setExpoPushToken(token.data);
      await registerTokenWithBackend(token.data);
    } catch (error) {
      console.error('Error registering for push notifications:', error);
    }
  };

  const setupAndroidChannels = async () => {
    if (Platform.OS !== 'android') return;

    const mod = await getNotificationsModule();
    if (!mod) return;

    const importanceMap = {
      default: mod.AndroidImportance.DEFAULT,
      high: mod.AndroidImportance.HIGH,
      max: mod.AndroidImportance.MAX,
    };

    const configs = Object.values(notificationTypeConfig);
    const uniqueChannels = configs.filter(
      (config, index, all) => all.findIndex((item) => item.channelId === config.channelId) === index
    );

    await Promise.all(
      uniqueChannels.map((config) =>
        mod.setNotificationChannelAsync(config.channelId, {
          name: config.channelName,
          description: config.channelDescription,
          importance: importanceMap[config.importance],
          vibrationPattern: [0, 250, 250, 250],
          lightColor: NOTIFICATION_COLOR,
          sound: 'default',
          enableVibrate: true,
          showBadge: true,
        })
      )
    );
  };

  const registerTokenWithBackend = async (pushToken: string) => {
    try {
      const user = await tokenStorage.getUser();
      const userId = user?.id || `device_${Platform.OS}_${Date.now()}`;

      await axios.post(`${getBackendBaseUrl()}/api/push-token/register`, {
        userId,
        expoPushToken: pushToken,
        platform: Platform.OS,
      }, { timeout: 6000 });
    } catch (error) {
      console.error('Failed to register push token with backend:', error);
    }
  };

  const ensureNotificationsReady = async () => {
    if (isExpoGo) return false;

    const mod = await getNotificationsModule();
    if (!mod) return false;

    const { status } = await mod.getPermissionsAsync();
    if (status !== 'granted') {
      const granted = await requestPermissions();
      if (!granted) return false;
    }

    if (Platform.OS === 'android') {
      await setupAndroidChannels();
    }

    return true;
  };

  const getTypeConfig = (type: NotificationType) => notificationTypeConfig[type] || notificationTypeConfig.general;

  const isNotificationEnabled = (type: NotificationType) => {
    const settingKey = getTypeConfig(type).settingKey;
    return settingKey ? notificationSettings[settingKey] : true;
  };

  const createTrigger = async (request: FitFaatNotificationRequest) => {
    const mod = await getNotificationsModule();
    if (!mod) return null;

    const channelId = getTypeConfig(request.type).channelId;

    if (request.date) {
      return {
        type: mod.SchedulableTriggerInputTypes.DATE,
        date: request.date,
        channelId,
      };
    }

    if (request.seconds) {
      return {
        type: mod.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: request.seconds,
        repeats: !!request.repeats,
        channelId,
      };
    }

    if (request.daily) {
      return {
        type: mod.SchedulableTriggerInputTypes.DAILY,
        hour: request.daily.hour,
        minute: request.daily.minute,
        channelId,
      };
    }

    if (request.weekly) {
      return {
        type: mod.SchedulableTriggerInputTypes.WEEKLY,
        weekday: request.weekly.weekday,
        hour: request.weekly.hour,
        minute: request.weekly.minute,
        channelId,
      };
    }

    return Platform.OS === 'android' ? { channelId } : null;
  };

  const scheduleFitFaatNotification = async (request: FitFaatNotificationRequest): Promise<string | null> => {
    if (!isNotificationEnabled(request.type)) return null;
    if (!(await ensureNotificationsReady())) return null;

    if (request.date && request.date <= new Date()) {
      return null;
    }

    if (request.seconds !== undefined && request.seconds <= 0) {
      return null;
    }

    try {
      const mod = await getNotificationsModule();
      if (!mod) return null;

      const trigger = await createTrigger(request);
      const notificationId = await mod.scheduleNotificationAsync({
        content: {
          title: request.title,
          subtitle: 'FitFaat',
          body: request.body,
          data: {
            ...request.data,
            type: request.type,
          },
          sound: request.sound ?? 'default',
          badge: badgeCountRef.current + 1,
          color: NOTIFICATION_COLOR,
          priority: mod.AndroidNotificationPriority.MAX,
          sticky: request.sticky,
          autoDismiss: request.autoDismiss,
        },
        trigger: trigger as any,
      });

      return notificationId;
    } catch (error) {
      console.error('Error scheduling FitFaat notification:', error);
      return null;
    }
  };

  const sendFitFaatNotification = async (
    type: NotificationType,
    title: string,
    body: string,
    data?: Partial<NotificationData>
  ) => {
    await scheduleFitFaatNotification({ type, title, body, data });
  };

  const scheduleAppointmentReminder = async (
    appointmentId: string,
    appointmentTime: Date,
    doctorName: string
  ): Promise<string | null> => {
    const reminderTime = new Date(appointmentTime.getTime() - notificationSettings.reminderMinutes * 60 * 1000);

    return scheduleFitFaatNotification({
      type: 'appointment',
      title: 'Upcoming Appointment',
      body: `Your appointment with ${doctorName} is in ${notificationSettings.reminderMinutes} minutes.`,
      date: reminderTime,
      data: { appointmentId },
    });
  };

  const scheduleVideoCallReminder = async (
    appointmentId: string,
    callTime: Date,
    participantName = 'your consultant'
  ): Promise<string | null> => {
    const reminderTime = new Date(callTime.getTime() - notificationSettings.reminderMinutes * 60 * 1000);

    return scheduleFitFaatNotification({
      type: 'videoCall',
      title: 'Video Call Starting Soon',
      body: `Your video call with ${participantName} starts in ${notificationSettings.reminderMinutes} minutes.`,
      date: reminderTime,
      data: { appointmentId },
    });
  };

  const scheduleWorkoutReminder = async (
    hour = 7,
    minute = 0,
    workoutName = 'today workout'
  ): Promise<string | null> =>
    scheduleFitFaatNotification({
      type: 'workout',
      title: 'Workout Reminder',
      body: `It is time for your ${workoutName}.`,
      daily: { hour, minute },
    });

  const scheduleMealReminder = async (mealName: string, hour: number, minute: number): Promise<string | null> =>
    scheduleFitFaatNotification({
      type: 'meal',
      title: `${mealName} Reminder`,
      body: `Remember to log your ${mealName.toLowerCase()} in FitFaat.`,
      daily: { hour, minute },
    });

  const scheduleMissedActivityReminder = async (hour = 21, minute = 0): Promise<string | null> =>
    scheduleFitFaatNotification({
      type: 'missedActivity',
      title: 'Activity Check-In',
      body: 'You still have time to complete or log your activity today.',
      daily: { hour, minute },
    });

  const scheduleHealthTrackingReminder = async (
    title: string,
    body: string,
    hour: number,
    minute: number
  ): Promise<string | null> =>
    scheduleFitFaatNotification({
      type: 'health',
      title,
      body,
      daily: { hour, minute },
    });

  const sendGoalProgressNotification = async (title: string, body: string) => {
    await sendFitFaatNotification('goal', title, body);
  };

  const sendBookingUpdateNotification = async (title: string, body: string, appointmentId?: string) => {
    await sendFitFaatNotification('booking', title, body, { appointmentId });
  };

  const sendTrainerMessageNotification = async (
    senderName: string,
    message: string,
    data?: Partial<NotificationData>
  ) => {
    await sendFitFaatNotification('trainerMessage', `Message from ${senderName}`, message, data);
  };

  const sendDietPlanUpdateNotification = async (title: string, body: string, planId?: string) => {
    await sendFitFaatNotification('dietPlan', title, body, { planId });
  };

  const sendWorkoutPlanUpdateNotification = async (title: string, body: string, workoutId?: string) => {
    await sendFitFaatNotification('workoutPlan', title, body, { workoutId });
  };

  const sendSubscriptionAlert = async (title: string, body: string, subscriptionId?: string) => {
    await sendFitFaatNotification('subscription', title, body, { subscriptionId });
  };

  const sendCommunityNotification = async (title: string, body: string) => {
    await sendFitFaatNotification('community', title, body);
  };

  const sendChallengeNotification = async (title: string, body: string, challengeId?: string) => {
    await sendFitFaatNotification('challenge', title, body, { challengeId });
  };

  const sendSecurityAlert = async (title: string, body: string) => {
    await sendFitFaatNotification('security', title, body);
  };

  const sendAdminAnnouncement = async (title: string, body: string) => {
    await sendFitFaatNotification('admin', title, body);
  };

  const scheduleHourlyMotivation = async (): Promise<string | null> => {
    if (!notificationSettings.motivationalQuotes) return null;

    try {
      const existingId = await AsyncStorage.getItem(HOURLY_MOTIVATION_NOTIFICATION_KEY);
      if (existingId) return existingId;

      const quote = MOTIVATIONAL_QUOTES[new Date().getHours() % MOTIVATIONAL_QUOTES.length];
      const notificationId = await scheduleFitFaatNotification({
        type: 'motivation',
        title: 'FitFaat Motivation',
        body: quote,
        seconds: 60 * 60,
        repeats: true,
      });

      if (notificationId) {
        await AsyncStorage.setItem(HOURLY_MOTIVATION_NOTIFICATION_KEY, notificationId);
      }

      return notificationId;
    } catch (error) {
      console.error('Error scheduling hourly motivation:', error);
      return null;
    }
  };

  const cancelHourlyMotivation = async () => {
    try {
      const notificationId = await AsyncStorage.getItem(HOURLY_MOTIVATION_NOTIFICATION_KEY);
      if (notificationId) {
        const mod = await getNotificationsModule();
        await mod?.cancelScheduledNotificationAsync(notificationId);
      }
      await AsyncStorage.removeItem(HOURLY_MOTIVATION_NOTIFICATION_KEY);
    } catch (error) {
      console.error('Error cancelling hourly motivation:', error);
    }
  };

  useEffect(() => {
    if (isExpoGo) return;

    if (notificationSettings.motivationalQuotes && permissionStatus === 'granted') {
      scheduleHourlyMotivation();
    } else if (!notificationSettings.motivationalQuotes) {
      cancelHourlyMotivation();
    }
  }, [notificationSettings.motivationalQuotes, permissionStatus]);

  const cancelScheduledNotification = async (notificationId: string) => {
    try {
      const mod = await getNotificationsModule();
      await mod?.cancelScheduledNotificationAsync(notificationId);
    } catch (error) {
      console.error('Error cancelling reminder:', error);
    }
  };

  const cancelAppointmentReminder = cancelScheduledNotification;

  const sendLocalNotification = async (title: string, body: string, data?: NotificationData) => {
    await sendFitFaatNotification(data?.type || 'general', title, body, data);
  };

  const loadNotificationSettings = async () => {
    try {
      const settings = await AsyncStorage.getItem(NOTIFICATION_SETTINGS_KEY);
      if (settings) {
        setNotificationSettings({ ...defaultSettings, ...JSON.parse(settings) });
      }
    } catch (error) {
      console.error('Error loading notification settings:', error);
    }
  };

  const updateNotificationSettings = async (newSettings: Partial<NotificationSettings>) => {
    try {
      const updated = { ...notificationSettings, ...newSettings };
      setNotificationSettings(updated);
      await AsyncStorage.setItem(NOTIFICATION_SETTINGS_KEY, JSON.stringify(updated));
    } catch (error) {
      console.error('Error saving notification settings:', error);
    }
  };

  const handleNotificationTap = (data: NotificationData) => {
    if (!data?.type) return;

    switch (data.type) {
      case 'appointment':
      case 'booking':
      case 'videoCall':
        if (data.appointmentId) {
          router.push({
            pathname: '/(main)/(conference)/appointment-details',
            params: { appointmentId: data.appointmentId },
          } as any);
        } else {
          router.push('/(main)/(conference)/my-appointments' as any);
        }
        break;
      case 'chat':
      case 'trainerMessage':
      case 'dietPlan':
        if (data.chatId || data.appointmentId) {
          router.push({
            pathname: '/(main)/(conference)/appointment-chat',
            params: {
              appointmentId: data.appointmentId || data.chatId,
              doctorId: data.doctorId,
              patientId: data.patientId,
            },
          } as any);
        } else {
          router.push('/(main)/(conference)/all-chats' as any);
        }
        break;
      case 'workout':
      case 'workoutPlan':
        router.push('/(main)/(exercises)/workout' as any);
        break;
      case 'subscription':
        router.push('/(main)/(settings)/premium' as any);
        break;
      case 'security':
        router.push('/(main)/(settings)/privacy-security' as any);
        break;
      case 'news':
      case 'admin':
        router.push('/(main)/(news)' as any);
        break;
      case 'motivation':
      case 'meal':
      case 'goal':
      case 'missedActivity':
      case 'health':
      case 'community':
      case 'challenge':
      default:
        router.push('/(main)/(dashboard)' as any);
        break;
    }

    clearBadge();
  };

  const getStoredBadgeCount = async () => {
    const count = await AsyncStorage.getItem(BADGE_COUNT_KEY);
    return count ? parseInt(count, 10) || 0 : 0;
  };

  const loadBadgeCount = async () => {
    try {
      const parsedCount = await getStoredBadgeCount();
      setBadgeCountState(parsedCount);

      if (!isExpoGo) {
        const mod = await getNotificationsModule();
        await mod?.setBadgeCountAsync(parsedCount);
      }
    } catch (error) {
      console.error('Error loading badge count:', error);
    }
  };

  const setBadgeCount = async (count: number) => {
    try {
      const nextCount = Math.max(0, count);
      setBadgeCountState(nextCount);
      badgeCountRef.current = nextCount;
      await AsyncStorage.setItem(BADGE_COUNT_KEY, nextCount.toString());

      if (!isExpoGo) {
        const mod = await getNotificationsModule();
        await mod?.setBadgeCountAsync(nextCount);
      }
    } catch (error) {
      console.error('Error setting badge count:', error);
    }
  };

  const incrementBadge = useCallback(async () => {
    try {
      const currentCount = await getStoredBadgeCount();
      await setBadgeCount(currentCount + 1);
    } catch (error) {
      console.error('Error incrementing badge:', error);
    }
  }, []);

  const clearBadge = async () => {
    await setBadgeCount(0);
  };

  const clearAllNotifications = async () => {
    try {
      if (!isExpoGo) {
        const mod = await getNotificationsModule();
        await mod?.dismissAllNotificationsAsync();
      }
      await clearBadge();
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
    scheduleFitFaatNotification,
    sendFitFaatNotification,
    scheduleAppointmentReminder,
    scheduleVideoCallReminder,
    scheduleWorkoutReminder,
    scheduleMealReminder,
    scheduleMissedActivityReminder,
    scheduleHealthTrackingReminder,
    sendGoalProgressNotification,
    sendBookingUpdateNotification,
    sendTrainerMessageNotification,
    sendDietPlanUpdateNotification,
    sendWorkoutPlanUpdateNotification,
    sendSubscriptionAlert,
    sendCommunityNotification,
    sendChallengeNotification,
    sendSecurityAlert,
    sendAdminAnnouncement,
    scheduleHourlyMotivation,
    cancelHourlyMotivation,
    cancelScheduledNotification,
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
