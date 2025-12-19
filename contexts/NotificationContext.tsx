import axios from 'axios';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import React, { createContext, useContext, useRef } from 'react';
import { Platform } from 'react-native';

// NOTIFICATION FUNCTIONALITY DISABLED FOR NOW
// Configure notification behavior
/* 
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});
*/

interface NotificationContextType {
  expoPushToken: string | null;
  notification: Notifications.Notification | null;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [expoPushToken, setExpoPushToken] = React.useState<string | null>(null);
  const [notification, setNotification] = React.useState<Notifications.Notification | null>(null);
  const notificationListener = useRef<Notifications.Subscription | null>(null);
  const responseListener = useRef<Notifications.Subscription | null>(null);

  // DISABLED: useEffect for push notification registration
  /*
  useEffect(() => {
    // Register for push notifications
    registerForPushNotifications();
  }, []);
  */

  const registerForPushNotifications = async () => {
    try {
      // Request permission
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('❌ Failed to get notification permission');
        return;
      }

      // Get Expo Push Token
      const token = await Notifications.getExpoPushTokenAsync();
      console.log('✅ Expo Push Token:', token.data);
      setExpoPushToken(token.data);

      // Register token with backend
      await registerTokenWithBackend(token.data);

      // For Android, set up notification channel
      if (Platform.OS === 'android') {
        Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7F',
          enableVibrate: true,
          enableLights: true,
          sound: 'default',
        });
      }
    } catch (error) {
      console.error('❌ Error registering for notifications:', error);
    }
  };

  const registerTokenWithBackend = async (pushToken: string) => {
    try {
      const ENV = Constants.expoConfig?.extra;
      const API_URL = (ENV?.EXPO_PUBLIC_BACKEND_API_URL || (Platform.OS === 'android' ? 'http://10.0.2.2:5001' : 'http://localhost:5001')).replace(/\/api\/?$/, '');

      // Generate a consistent device ID using timestamp
      const userId = `device_${Platform.OS}_${Math.round(Date.now() / 1000)}`;

      console.log(`📱 Registering push token for userId: ${userId}`);
      console.log(`📍 API URL: ${API_URL}`);
      console.log(`🔑 Token: ${pushToken}`);

      const response = await axios.post(`${API_URL}/api/push-token/register`, {
        userId: userId,
        expoPushToken: pushToken,
        platform: Platform.OS,
      });

      console.log('✅ Push token registered with backend:', response.data);
      console.log(`📊 Response status: ${response.status}`);
    } catch (error) {
      console.error('⚠️ Failed to register token with backend:', error);
      if (error instanceof axios.AxiosError) {
        console.error(`❌ Error details:`, {
          status: error.response?.status,
          data: error.response?.data,
          message: error.message,
        });
      }
    }
  };

  // DISABLED: Notification listeners setup
  /*
  useEffect(() => {
    // Listen for notifications when app is in foreground
    notificationListener.current = Notifications.addNotificationReceivedListener((notification) => {
      console.log('📬 Notification received (foreground):', notification);
      setNotification(notification);
    });

    // Listen for notification interactions (when user taps notification)
    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      console.log('👆 Notification tapped:', response);
      // Handle notification press - navigate to news, etc
    });

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, []);
  */

  const value: NotificationContextType = {
    expoPushToken,
    notification,
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
