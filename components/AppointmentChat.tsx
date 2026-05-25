import BackButton from '@/components/BackButton';
import DietPlanModal from '@/components/DietPlanModal';
import DoctorActionPlanModal from '@/components/DoctorActionPlanModal';
import { AnimatedPressable } from '@/components/common/AnimatedPressable';
import VideoCallButton from '@/components/VideoCallButton';
import { theme } from '@/constants/theme';
import { useNotifications } from '@/contexts/NotificationContext';
import { useTheme } from '@/contexts/ThemeContext';
import {
  cachedRequestJson,
  clearRequestJsonCache,
  requestJson,
} from '@/utils/apiHelper';
import { tokenStorage } from '@/utils/auth/tokenStorage';
import {
  buildChatAccessGrantedNotificationPayload,
  CHAT_ACCESS_GRANTED_BODY,
  CHAT_ACCESS_GRANTED_TITLE,
} from '@/utils/chatAccessNotifications';
import {
  getDashboardGoalProgress,
  getHydrationValue,
  getProgressValue,
} from '@/utils/dashboardProgress';
import {
  getStoredDashboardCache,
  getStoredWeeklyTrackingId,
} from '@/utils/dashboardStorage';
import {
  buildDoctorActionPlanMessage,
  parseDoctorActionPlanMessage,
  type DoctorActionPlan,
} from '@/utils/doctorActionPlan';
import {
  formatCalorieTarget,
  formatHydrationTarget,
  loadGoalDisplayMode,
} from '@/utils/goalTargetDisplay';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as SystemUI from 'expo-system-ui';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import type { KeyboardEvent } from 'react-native';
import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from 'react-native-responsive-screen';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { io, Socket } from 'socket.io-client';
import { getBackendBaseUrl, isRealtimeSocketEnabled } from '@/utils/config';

interface ChatMessage {
  _id: string;
  appointmentId: string;
  senderRole: 'user' | 'doctor';
  senderId: string;
  senderName: string;
  message: string;
  status?: 'sent' | 'delivered' | 'read';
  isRead: boolean;
  createdAt: string;
}

type ChatUserRole = ChatMessage['senderRole'];

interface TypingPayload {
  appointmentId?: string;
  isTyping?: boolean;
  senderId?: string;
  userId?: string;
  senderName?: string;
  userName?: string;
  name?: string;
  senderRole?: string;
  userRole?: string;
  role?: string;
}

// Remove /api from BACKEND_URL since routes already include it.
const BACKEND_URL = getBackendBaseUrl();
const MAX_ANDROID_NAV_BAR_SPACER = hp(3);
const ANDROID_KEYBOARD_EXTRA_LIFT = hp(12);

const QUICK_REPLIES = {
  user: ['I am here', 'Can we start?', 'Thank you', 'Please check my diet plan'],
  doctor: ['I will review it', 'Please share details', 'Chat access granted', 'Book a follow-up'],
};
const DASHBOARD_DAY_KEYS = [
  'day01',
  'day02',
  'day03',
  'day04',
  'day05',
  'day06',
  'day07',
] as const;
const CHAT_READ_CONFIG = {
  timeoutMs: 7000,
  retries: 1,
  retryDelayMs: 500,
  cacheTtlMs: 30 * 1000,
  maxStaleMs: 60 * 60 * 1000,
  allowStaleOnError: true,
  maxWaitForFreshMs: 1600,
  refreshCacheInBackground: true,
};

const trimTrailingZeros = (value: string) => value.replace(/\.?0+$/, '');

const formatProgressInteger = (value: unknown) =>
  Math.round(getProgressValue(value)).toLocaleString();

const formatHydrationLiters = (value: unknown) =>
  trimTrailingZeros(getProgressValue(value).toFixed(2));

const getDashboardCachePayload = (cache: any) => {
  if (!cache || typeof cache !== 'object') return null;
  return cache.data && typeof cache.data === 'object' ? cache.data : cache;
};

const getDashboardDaysFromCache = (cache: any) => {
  const payload = getDashboardCachePayload(cache);
  if (!payload || typeof payload !== 'object') return [];

  if (Array.isArray(payload)) return payload.filter(Boolean);
  if (Array.isArray(payload.days)) return payload.days.filter(Boolean);
  if (Array.isArray(payload.dailyLogs)) return payload.dailyLogs.filter(Boolean);
  if (Array.isArray(payload.weekDays)) return payload.weekDays.filter(Boolean);

  const keyedDays = DASHBOARD_DAY_KEYS.map((key) => payload[key]).filter(Boolean);
  if (keyedDays.length) return keyedDays;

  return Object.values(payload).filter(
    (entry: any) => entry && typeof entry === 'object' && ('dayNo' in entry || 'dayNumber' in entry)
  );
};

const getDashboardDaySortValue = (day: any, index: number) => {
  const dateValue = day?.date ? new Date(day.date).getTime() : Number.NaN;
  if (Number.isFinite(dateValue)) return dateValue;

  const dayNumber = Number(day?.dayNo ?? day?.dayNumber ?? index + 1);
  return Number.isFinite(dayNumber) ? dayNumber : index + 1;
};

const getSortedDashboardDays = (days: any[]) =>
  days
    .map((day, index) => ({ day, sortValue: getDashboardDaySortValue(day, index) }))
    .sort((a, b) => a.sortValue - b.sortValue)
    .map(({ day }) => day);

const isUnlockedDashboardDay = (day: any) =>
  String(day?.status || '').toLowerCase() !== 'locked';

const getCurrentDashboardDay = (days: any[]) => {
  const sortedDays = getSortedDashboardDays(days);
  const todayKey = new Date().toDateString();
  const activeDay = sortedDays.find(
    (day) => String(day?.status || '').toLowerCase() === 'active' || day?.isActive
  );
  if (activeDay) return activeDay;

  const todayDay = sortedDays.find((day) => {
    if (!day?.date) return false;
    const date = new Date(day.date);
    return !Number.isNaN(date.getTime()) && date.toDateString() === todayKey;
  });
  if (todayDay) return todayDay;

  const unlockedDays = sortedDays.filter(isUnlockedDashboardDay);
  return unlockedDays.length
    ? unlockedDays[unlockedDays.length - 1]
    : sortedDays[sortedDays.length - 1];
};

const getDashboardDayLabel = (day: any) => {
  const dayNumber = day?.dayNo ?? day?.dayNumber;
  const dayLabel = dayNumber ? `Day ${String(dayNumber).padStart(2, '0')}` : 'Current day';
  if (!day?.date) return dayLabel;

  const date = new Date(day.date);
  if (Number.isNaN(date.getTime())) return dayLabel;

  const dateLabel = date.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
  });
  return `${dayLabel} - ${dateLabel}`;
};

const hasDashboardLogSignal = (day: any) =>
  getProgressValue(day?.achievedCalories) > 0 ||
  getHydrationValue(day) > 0 ||
  getProgressValue(day?.walkingSteps ?? day?.steps ?? day?.stepCount) > 0;

const averageProgressValues = (values: number[]) => {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
};

const buildProgressSummaryMessage = async () => {
  const accountUser = await tokenStorage.getUser();
  const weeklyTrackingId = await getStoredWeeklyTrackingId(accountUser);
  const dashboardCache = await getStoredDashboardCache(accountUser, weeklyTrackingId);
  const dashboardDays = getDashboardDaysFromCache(dashboardCache);

  if (!dashboardDays.length) {
    throw new Error('Open the Dashboard once so FitFaat can prepare your latest progress summary.');
  }

  const currentDay = getCurrentDashboardDay(dashboardDays);
  if (!currentDay) {
    throw new Error('No dashboard day is ready to share yet.');
  }

  const displayMode = await loadGoalDisplayMode();
  const unlockedDays = getSortedDashboardDays(dashboardDays).filter(isUnlockedDashboardDay);
  const trackedDays = unlockedDays.filter(hasDashboardLogSignal);
  const averageCalories = averageProgressValues(
    trackedDays.map((day) => getProgressValue(day?.achievedCalories))
  );
  const averageHydration = averageProgressValues(trackedDays.map(getHydrationValue));
  const averageGoalProgress = averageProgressValues(
    trackedDays.map((day) => getDashboardGoalProgress(day))
  );
  const currentGoalProgress = getDashboardGoalProgress(currentDay);

  return [
    'FitFaat Progress Summary',
    '',
    `Current: ${getDashboardDayLabel(currentDay)}`,
    `Goal achieved: ${Math.round(currentGoalProgress)}%`,
    `Calories: ${formatProgressInteger(currentDay?.achievedCalories)} / ${formatCalorieTarget(currentDay, displayMode)} cals`,
    `Hydration: ${formatHydrationLiters(getHydrationValue(currentDay))} / ${formatHydrationTarget(currentDay, displayMode)} L`,
    '',
    'Last 7 days:',
    `Tracked days: ${trackedDays.length}/${unlockedDays.length || dashboardDays.length}`,
    `Average calories: ${Math.round(averageCalories).toLocaleString()} cals`,
    `Average hydration: ${trimTrailingZeros(averageHydration.toFixed(2))} L`,
    `Average goal achieved: ${Math.round(averageGoalProgress)}%`,
    '',
    'Shared from my FitFaat progress.',
  ].join('\n');
};
const getChatDateKey = (value?: string) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toDateString();
};

const formatChatDateDivider = (value?: string) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';

  return date.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: date.getFullYear() === today.getFullYear() ? undefined : 'numeric',
  });
};

const normalizeChatUserRole = (role?: string | null): ChatUserRole | null => {
  return role === 'user' || role === 'doctor' ? role : null;
};

const getParticipantId = (appointment: any, role: ChatUserRole | null) => {
  if (!appointment || !role) return '';

  const participant = role === 'doctor' ? appointment.doctorId : appointment.patientId;
  if (!participant) return '';
  if (typeof participant === 'string') return participant;
  if (typeof participant === 'object' && participant._id) return String(participant._id);

  return String(participant);
};

interface AppointmentChatProps {
  appointmentId: string;
}

export default function AppointmentChat({ appointmentId }: AppointmentChatProps) {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const router = useRouter();
  const { sendFitFaatNotification } = useNotifications();
  const insets = useSafeAreaInsets();
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [sharingProgress, setSharingProgress] = useState(false);
  const [chatClosed, setChatClosed] = useState(false);
  const [closedReason, setClosedReason] = useState('');
  const [userRole, setUserRole] = useState<'user' | 'doctor' | null>(null);
  const [canSend, setCanSend] = useState(false);
  const [accessMessage, setAccessMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const [typingUserName, setTypingUserName] = useState('');
  const [chatAccessGranted, setChatAccessGranted] = useState(false);
  const [isGrantingAccess, setIsGrantingAccess] = useState(false);
  const [otherUserName, setOtherUserName] = useState('');
  const [, setTimeRemaining] = useState('');
  const [chatEndTime, setChatEndTime] = useState<Date | null>(null);
  const [showDietPlanModal, setShowDietPlanModal] = useState(false);
  const [showActionPlanModal, setShowActionPlanModal] = useState(false);
  const [loadingDietPlan, setLoadingDietPlan] = useState(false);
  const [sendingActionPlan, setSendingActionPlan] = useState(false);
  const [appointmentData, setAppointmentData] = useState<any>(null);
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);
  const [keyboardLift, setKeyboardLift] = useState(0);
  
  const socketRef = useRef<Socket | null>(null);
  const flatListRef = useRef<FlatList | null>(null);
  const typingTimeoutRef = useRef<number | null>(null);
  const localTypingRef = useRef(false);
  const lastLocalTypingEventRef = useRef<{ isTyping: boolean; sentAt: number } | null>(null);
  const currentUserRoleRef = useRef<ChatUserRole | null>(null);
  const currentUserIdRef = useRef('');
  const otherUserNameRef = useRef('');
  const timerIntervalRef = useRef<number | null>(null);
  const isInVideoCall = useRef<boolean>(false);
  const accessGrantNotifiedRef = useRef(false);
  const isVideoCallActive = useCallback(() => isInVideoCall.current, []);
  const androidNavigationBarHeight =
    Platform.OS === 'android' && !isKeyboardVisible
      ? Math.min(insets.bottom, MAX_ANDROID_NAV_BAR_SPACER)
      : 0;
  const inputBottomPadding = isKeyboardVisible
    ? hp(0.6)
    : Platform.OS === 'android'
      ? hp(1.4)
      : Math.max(insets.bottom, hp(1.5));
  const quickReplies = useMemo(
    () => (userRole === 'doctor' ? QUICK_REPLIES.doctor : QUICK_REPLIES.user),
    [userRole]
  );

  const scrollToBottom = useCallback((animated = true) => {
    requestAnimationFrame(() => {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated });
      }, Platform.OS === 'ios' ? 80 : 120);
    });
  }, []);

  const emitTypingStatus = useCallback((typing: boolean) => {
    const senderRole = currentUserRoleRef.current ?? userRole;
    const senderId = currentUserIdRef.current;

    socketRef.current?.emit('typing', {
      appointmentId,
      isTyping: typing,
      ...(senderRole ? { senderRole } : {}),
      ...(senderId ? { senderId } : {}),
    });

    localTypingRef.current = typing;
    lastLocalTypingEventRef.current = { isTyping: typing, sentAt: Date.now() };
    setIsTyping(typing);
  }, [appointmentId, userRole]);

  useEffect(() => {
    const handleKeyboardShow = (event: KeyboardEvent) => {
      Keyboard.scheduleLayoutAnimation(event);
      setKeyboardVisible(true);
      setKeyboardLift(
        Platform.OS === 'android'
          ? Math.max(0, (event.endCoordinates?.height ?? 0) - insets.bottom + ANDROID_KEYBOARD_EXTRA_LIFT)
          : 0
      );
      scrollToBottom();
    };

    const handleKeyboardHide = (event: KeyboardEvent) => {
      Keyboard.scheduleLayoutAnimation(event);
      setKeyboardVisible(false);
      setKeyboardLift(0);
    };

    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSubscription = Keyboard.addListener(showEvent, handleKeyboardShow);
    const hideSubscription = Keyboard.addListener(hideEvent, handleKeyboardHide);

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, [insets.bottom, scrollToBottom]);

  useFocusEffect(
    useCallback(() => {
      if (Platform.OS !== 'android') return;

      SystemUI.setBackgroundColorAsync('#FFFFFF').catch(() => {});

      return () => {
        SystemUI.setBackgroundColorAsync(colors.screenColor).catch(() => {});
      };
    }, [colors.screenColor])
  );

  // Timer countdown
  useEffect(() => {
    if (!chatEndTime) return;

    const updateTimer = () => {
      const now = new Date();
      const diff = chatEndTime.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeRemaining('Expired');
        if (timerIntervalRef.current) {
          clearInterval(timerIntervalRef.current);
        }
        return;
      }

      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setTimeRemaining(`${minutes}:${seconds.toString().padStart(2, '0')}`);
    };

    updateTimer();
    timerIntervalRef.current = setInterval(updateTimer, 1000) as unknown as number;

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [chatEndTime]);

  const initializeChat = useCallback(async () => {
    // Prevent multiple socket connections
    if (socketRef.current?.connected) {
      console.log('⚠️ [AppointmentChat] Socket already connected, skipping init');
      return;
    }
    
    try {
      const token = await tokenStorage.getToken();
      if (!token) {
        Alert.alert('Error', 'Please login first');
        router.back();
        return;
      }

      // Check chat access
      const accessData = await requestJson<any>(
        `${BACKEND_URL}/api/chat/appointment/${appointmentId}/access`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        },
        { timeoutMs: 8000, retries: 1, retryDelayMs: 500 }
      );

      console.log('Chat access response:', accessData);

      if (!accessData.success || !accessData.allowed) {
        setChatClosed(true);
        setClosedReason(accessData.message || 'Chat is not available');
        setLoading(false);
        return;
      }

      setUserRole(accessData.userRole);
      currentUserRoleRef.current = accessData.userRole;
      const currentUserId =
        accessData.userId ||
        accessData.currentUserId ||
        getParticipantId(accessData.appointment, accessData.userRole);
      currentUserIdRef.current = currentUserId ? String(currentUserId) : '';
      setCanSend(accessData.canSend);
      setAccessMessage(accessData.message || '');
      setChatAccessGranted(!!accessData.appointment?.chatAccessGrantedAt);
      setAppointmentData(accessData.appointment);

      // Calculate chat end time
      const appointment = accessData.appointment;
      if (appointment) {
        const appointmentDate = new Date(appointment.date);
        const timeParts = appointment.time.match(/(\d+):(\d+)\s*(AM|PM)/i);
        
        if (timeParts) {
          let hours = parseInt(timeParts[1]);
          const minutes = parseInt(timeParts[2]);
          const period = timeParts[3].toUpperCase();
          
          if (period === 'PM' && hours !== 12) hours += 12;
          if (period === 'AM' && hours === 12) hours = 0;
          
          appointmentDate.setHours(hours, minutes, 0, 0);
          
          const endTime = new Date(appointmentDate);
          endTime.setHours(endTime.getHours() + 1);
          setChatEndTime(endTime);
        }
      }

      // Load existing messages
      const messagesData = await cachedRequestJson<any>(
        `chat:messages:${appointmentId}`,
        `${BACKEND_URL}/api/chat/appointment/${appointmentId}/messages`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        },
        CHAT_READ_CONFIG
      );

      console.log('Loaded messages:', messagesData.messages?.length || 0);
      if (messagesData.success) {
        setMessages(messagesData.messages || []);
      }

      if (!isRealtimeSocketEnabled()) {
        setLoading(false);
        return;
      }

      // Initialize Socket.io
      const socket = io(BACKEND_URL, {
        auth: { token },
        transports: ['websocket']
      });

      socketRef.current = socket;

      // Socket event listeners
      socket.on('connect', () => {
        console.log('✅ Socket connected successfully, joining appointment:', appointmentId);
        console.log('✅ [CHAT SCREEN] Now listening for video:incoming-call events');
        socket.emit('join-appointment', { appointmentId });
      });

      socket.on('joined', (data) => {
        console.log('✅ Joined chat room:', data);
        console.log('✅ Room details - appointmentId:', data.appointmentId, 'userRole:', data.userRole, 'canSend:', data.canSend);
        const otherName = data.otherUserName || (accessData.userRole === 'doctor' ? 'Patient' : 'Doctor');
        setOtherUserName(otherName);
        otherUserNameRef.current = otherName;
        
        // Update canSend from socket data (this reflects real-time access status)
        if (data.canSend !== undefined) {
          console.log('📝 Updating canSend from socket:', data.canSend);
          setCanSend(data.canSend);
        }
        
        if (data.message) {
          setAccessMessage(data.message);
        }
        
        // Mark all messages as read after joining the chat
        socket.emit('mark-all-read', { appointmentId });
        
        setLoading(false);
      });

      socket.on('new-message', (message) => {
        console.log('📨 New message received:', {
          from: message.senderName,
          role: message.senderRole,
          text: message.message.substring(0, 50),
          messageId: message._id
        });
        
        setMessages(prev => {
          console.log('📋 Current messages count:', prev.length);
          
          // Avoid duplicate messages
          const exists = prev.some(m => m._id === message._id);
          if (exists) {
            console.log('⚠️ Duplicate message detected, skipping');
            return prev;
          }

          if (message.senderRole !== (currentUserRoleRef.current || accessData.userRole)) {
            sendFitFaatNotification(
              'chat',
              `Message from ${message.senderName || otherUserNameRef.current || 'FitFaat'}`,
              message.message,
              {
                appointmentId,
                chatId: appointmentId,
                doctorId: accessData.appointment?.doctorId,
                patientId: accessData.appointment?.patientId,
              }
            ).catch((error) => {
              console.error('Failed to show chat notification:', error);
            });
          }
          
          const newMessages = [...prev, message];
          console.log('✅ Adding message to state. New count:', newMessages.length);
          
          // Mark message as delivered if it's from the other user
          if (message.senderRole !== (currentUserRoleRef.current || accessData.userRole) && socketRef.current) {
            socketRef.current.emit('message-delivered', { messageId: message._id });
            // Also mark as read immediately since user is viewing the chat
            socketRef.current.emit('mark-all-read', { appointmentId });
          }
          
          return newMessages;
        });
        
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      });

      socket.on('message-status-update', (data) => {
        console.log('✅ Message status update:', data);
        setMessages(prev => 
          prev.map(msg => 
            msg._id === data.messageId 
              ? { ...msg, status: data.status }
              : msg
          )
        );
      });

      socket.on('messages-read', (data) => {
        console.log('👁️ All messages marked as read');
        setMessages(prev => 
          prev.map(msg => 
            msg.senderRole === (currentUserRoleRef.current || accessData.userRole)
              ? { ...msg, status: 'read' }
              : msg
          )
        );
      });

      socket.on('user-typing', (data: TypingPayload = {}) => {
        const typingRole = normalizeChatUserRole(data.senderRole || data.userRole || data.role);
        const typingUserIdValue = data.senderId || data.userId;
        const typingUserId = typingUserIdValue ? String(typingUserIdValue) : '';
        const currentRole = currentUserRoleRef.current || accessData.userRole;
        const currentUserId = currentUserIdRef.current;
        const nextTyping = Boolean(data.isTyping);
        const lastLocalTypingEvent = lastLocalTypingEventRef.current;
        const looksLikeLocalTypingEcho =
          nextTyping &&
          !typingRole &&
          !typingUserId &&
          lastLocalTypingEvent?.isTyping === nextTyping &&
          Date.now() - lastLocalTypingEvent.sentAt < 2500;
        const typingCameFromCurrentUser =
          (typingRole && typingRole === currentRole) ||
          (typingUserId && currentUserId && typingUserId === currentUserId) ||
          (nextTyping && !typingRole && !typingUserId && localTypingRef.current) ||
          looksLikeLocalTypingEcho;

        if (typingCameFromCurrentUser) {
          return;
        }

        setOtherUserTyping(nextTyping);
        setTypingUserName(
          nextTyping
            ? data.senderName || data.userName || data.name || otherUserNameRef.current || 'They'
            : ''
        );
      });

      socket.on('access-granted', (data) => {
        console.log('🔓 Access granted event received:', data);
        
        // Update canSend from the data received (this is role-specific)
        setCanSend(data.canSend);
        setChatAccessGranted(true);
        setAccessMessage('');
        
        // Use accessData.userRole instead of state userRole (avoid closure issue)
        if (accessData.userRole === 'user' && data.canSend) {
          if (!accessGrantNotifiedRef.current) {
            accessGrantNotifiedRef.current = true;
            const notificationPayload = buildChatAccessGrantedNotificationPayload(
              appointmentId,
              accessData.appointment
            );
            sendFitFaatNotification(
              'chat',
              notificationPayload.title,
              notificationPayload.body,
              notificationPayload.data
            ).catch((error) => {
              console.error('Failed to show chat access notification:', error);
            });
            Alert.alert(
              CHAT_ACCESS_GRANTED_TITLE,
              CHAT_ACCESS_GRANTED_BODY
            );
          }
        }
        
        console.log('🔓 Updated canSend to:', data.canSend);
      });

      socket.on('access-status', (data) => {
        console.log('📊 Access status update:', data);
        setCanSend(data.canSend);
        if (data.message) {
          setAccessMessage(data.message);
        }
        if (data.chatAccessGrantedAt) {
          setChatAccessGranted(true);
        }
      });

      socket.on('chat-closed', (data) => {
        console.log('🚫 Chat closed:', data);
        setChatClosed(true);
        setClosedReason(data.reason || 'Chat has been closed');
        Alert.alert('Chat Closed', data.reason || 'Chat has been closed');
      });

      socket.on('error', (data) => {
        console.error('❌ Socket error:', data);
        if (data.canSend === false) {
          setCanSend(false);
          setAccessMessage(data.message || 'You cannot send messages yet');
        } else {
          Alert.alert('Error', data.message || 'An error occurred');
        }
      });

      socket.on('disconnect', () => {
        console.log('⚠️ Socket disconnected');
      });

      socket.on('connect_error', (error) => {
        console.error('❌ Socket connection error:', error.message);
      });

      socket.on('reconnect', (attemptNumber) => {
        console.log('🔄 Socket reconnected after', attemptNumber, 'attempts');
        socket.emit('join-appointment', { appointmentId });
      });


    } catch (error) {
      console.error('Error initializing chat:', error);
      Alert.alert('Error', 'Failed to load chat');
      setLoading(false);
    }
  }, [appointmentId, router, sendFitFaatNotification]);

  // Initialize socket and load chat
  useEffect(() => {
    initializeChat();

    return () => {
      const wasInVideoCall = isVideoCallActive();
      if (socketRef.current) {
        if (wasInVideoCall) {
          console.log('📞 In video call - leaving room but keeping socket connected');
          socketRef.current.emit('leave-appointment', { appointmentId });
        } else {
          console.log('🔌 Disconnecting socket (component unmount)');
          socketRef.current.disconnect();
          socketRef.current = null;
        }
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      localTypingRef.current = false;
      lastLocalTypingEventRef.current = null;
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [appointmentId, initializeChat, isVideoCallActive]);

  // Disconnect socket when the screen loses focus so messages are not marked read from the list.
  useFocusEffect(
    useCallback(() => {
      console.log('👁️ [AppointmentChat] Screen focused');
      if (!socketRef.current?.connected && !isVideoCallActive()) {
        console.log('🔄 [AppointmentChat] Reconnecting socket...');
        initializeChat();
      }

      return () => {
        console.log('👁️ [AppointmentChat] Screen UNFOCUSED - disconnecting socket');
        if (socketRef.current && !isVideoCallActive()) {
          socketRef.current.disconnect();
          socketRef.current = null;
        }
      };
    }, [initializeChat, isVideoCallActive])
  );

  const grantAccessToUser = async () => {
    if (isGrantingAccess) return;
    
    setIsGrantingAccess(true);
    try {
      const token = await tokenStorage.getToken();
      const data = await requestJson<any>(
        `${BACKEND_URL}/api/chat/appointment/${appointmentId}/grant-access`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            notification: buildChatAccessGrantedNotificationPayload(
              appointmentId,
              appointmentData
            ),
          }),
        },
        { timeoutMs: 12000, retries: 0 }
      );
      
      if (data.success) {
        console.log('Access granted successfully:', data);
        setChatAccessGranted(true);
        setCanSend(true); // Doctor can now send
        
        // Emit socket event to notify user immediately
        if (socketRef.current && socketRef.current.connected) {
          console.log('Emitting access-granted event via socket');
          socketRef.current.emit('access-granted', { appointmentId });
        } else {
          console.warn('Socket not connected, cannot emit access-granted event');
        }
        
        Alert.alert('Success', 'Chat access granted! Both you and the patient can now send messages.');
      } else {
        Alert.alert('Error', data.message || 'Failed to grant access');
      }
    } catch (error) {
      console.error('Error granting access:', error);
      Alert.alert('Error', 'Failed to grant access');
    } finally {
      setIsGrantingAccess(false);
    }
  };

  const sendChatText = useCallback(async (textToSend: string, restoreInputOnError = false) => {
    const messageText = textToSend.trim();
    if (!messageText || sending || chatClosed || !canSend) {
      console.log('Cannot send message:', { 
        hasText: !!messageText, 
        sending, 
        chatClosed, 
        canSend 
      });
      return false;
    }

    setSending(true);
    setInputText('');
    
    if (socketRef.current && socketRef.current.connected) {
      console.log('Sending message via socket:', messageText);
      socketRef.current.emit('send-message', {
        appointmentId,
        message: messageText
      });
      clearRequestJsonCache(`chat:messages:${appointmentId}`).catch(() => {});

      sendFitFaatNotification(
        'chat',
        'Message Sent',
        `Your message to ${otherUserName || 'the chat'} was sent.`,
        {
          appointmentId,
          chatId: appointmentId,
          doctorId: appointmentData?.doctorId,
          patientId: appointmentData?.patientId,
        }
      ).catch((error) => {
        console.error('Failed to show sent-message notification:', error);
      });
      
      setSending(false);
      
      // Stop typing indicator
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      emitTypingStatus(false);
      return true;
    } else {
      try {
        const token = await tokenStorage.getToken();
        const data = await requestJson<any>(
          `${BACKEND_URL}/api/chat/appointment/${appointmentId}/messages`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ message: messageText }),
          },
          { timeoutMs: 12000, retries: 0 }
        );

        if (!data.success) {
          throw new Error(data.message || 'Failed to send message');
        }

        clearRequestJsonCache(`chat:messages:${appointmentId}`).catch(() => {});
        setMessages((prev) => [...prev, data.message]);
        sendFitFaatNotification(
          'chat',
          'Message Sent',
          `Your message to ${otherUserName || 'the chat'} was sent.`,
          {
            appointmentId,
            chatId: appointmentId,
            doctorId: appointmentData?.doctorId,
            patientId: appointmentData?.patientId,
          }
        ).catch((error) => {
          console.error('Failed to show sent-message notification:', error);
        });

        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      } catch (error: any) {
        console.error('REST message send failed:', error);
        if (restoreInputOnError) {
          setInputText(messageText);
        }
        Alert.alert('Error', error?.message || 'Failed to send message');
        return false;
      } finally {
        setSending(false);
      }
    }
    return true;
  }, [
    appointmentData?.doctorId,
    appointmentData?.patientId,
    appointmentId,
    canSend,
    chatClosed,
    emitTypingStatus,
    otherUserName,
    sendFitFaatNotification,
    sending,
  ]);

  const sendMessage = useCallback(async () => {
    await sendChatText(inputText, true);
  }, [inputText, sendChatText]);

  const handleSendActionPlan = useCallback(
    async (plan: DoctorActionPlan) => {
      if (sendingActionPlan) return;

      setSendingActionPlan(true);
      try {
        const sent = await sendChatText(buildDoctorActionPlanMessage(plan));
        if (sent) {
          setShowActionPlanModal(false);
        }
      } finally {
        setSendingActionPlan(false);
      }
    },
    [sendChatText, sendingActionPlan]
  );

  const handleTextChange = (text: string) => {
    setInputText(text);

    if (!chatClosed && canSend && socketRef.current) {
      // Send typing indicator
      if (!isTyping) {
        emitTypingStatus(true);
      }

      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Set new timeout to stop typing indicator
      typingTimeoutRef.current = setTimeout(() => {
        emitTypingStatus(false);
      }, 1000);
    }
  };

  const handleShareProgress = useCallback(async () => {
    if (sharingProgress || sending || chatClosed || !canSend) return;

    setSharingProgress(true);
    try {
      const progressSummary = await buildProgressSummaryMessage();
      await sendChatText(progressSummary);
    } catch (error: any) {
      console.error('Failed to build progress summary:', error);
      Alert.alert(
        'Progress Not Ready',
        error?.message || 'FitFaat could not prepare your progress summary yet.'
      );
    } finally {
      setSharingProgress(false);
    }
  }, [canSend, chatClosed, sendChatText, sending, sharingProgress]);

  const handleQuickReplyPress = (reply: string) => {
    handleTextChange(reply);
  };

  const renderActionPlanCard = (plan: DoctorActionPlan, isOwnMessage: boolean) => {
    const textColor = isOwnMessage ? colors.textOnPrimary : colors.textPrimary;
    const mutedColor = isOwnMessage ? 'rgba(255,255,255,0.78)' : colors.textSecondary;

    const rows = [
      { icon: 'nutrition-outline' as const, label: 'Diet', value: plan.dietTargets || 'Follow doctor guidance' },
      { icon: 'water-outline' as const, label: 'Water', value: plan.waterGoal || 'Keep hydration consistent' },
      { icon: 'ban-outline' as const, label: 'Avoid', value: plan.foodsToAvoid || 'Not specified' },
      { icon: 'document-text-outline' as const, label: 'Notes', value: plan.notes || 'No extra notes' },
      { icon: 'calendar-outline' as const, label: 'Next', value: plan.nextAppointment || 'Not scheduled' },
    ];

    return (
      <View style={styles.actionPlanCard}>
        <View style={styles.actionPlanHeader}>
          <View style={styles.actionPlanIcon}>
            <Ionicons name="clipboard-outline" size={Math.min(hp(2.4), wp(5.4))} color={colors.primary} />
          </View>
          <View style={styles.actionPlanTitleWrap}>
            <Text style={[styles.actionPlanTitle, { color: textColor }]}>Doctor Action Plan</Text>
            <Text style={[styles.actionPlanSubtitle, { color: mutedColor }]}>
              Follow this for {plan.durationDays} days
            </Text>
          </View>
        </View>
        {rows.map((row) => (
          <View key={row.label} style={styles.actionPlanRow}>
            <Ionicons name={row.icon} size={Math.min(hp(1.8), wp(4))} color={mutedColor} />
            <View style={styles.actionPlanRowCopy}>
              <Text style={[styles.actionPlanRowLabel, { color: mutedColor }]}>{row.label}</Text>
              <Text style={[styles.actionPlanRowValue, { color: textColor }]}>{row.value}</Text>
            </View>
          </View>
        ))}
      </View>
    );
  };

  const renderMessage = ({ item, index }: { item: ChatMessage; index: number }) => {
    const isOwnMessage = item.senderRole === userRole;
    const actionPlan = parseDoctorActionPlanMessage(item.message);
    const previousMessage = index > 0 ? messages[index - 1] : null;
    const showDateDivider =
      !previousMessage || getChatDateKey(previousMessage.createdAt) !== getChatDateKey(item.createdAt);
    
    // Determine message status icon
    const getMessageStatusIcon = () => {
      if (!isOwnMessage) return null; // Only show status for sent messages
      
      const status = item.status || 'sent';
      const isRead = status === 'read';
      const iconColor = isRead ? colors.info : colors.textTertiary;
      
      if (status === 'sent') {
        // Single tick - sent but not delivered
        return <Ionicons name="checkmark" size={Math.min(hp(1.7), wp(3.7))} color={iconColor} style={styles.statusIcon} />;
      } else if (status === 'delivered') {
        // Double tick - delivered but not read
        return (
          <View style={styles.doubleTickContainer}>
            <Ionicons name="checkmark" size={Math.min(hp(1.7), wp(3.7))} color={iconColor} style={styles.doubleTick1} />
            <Ionicons name="checkmark" size={Math.min(hp(1.7), wp(3.7))} color={iconColor} style={styles.doubleTick2} />
          </View>
        );
      } else if (status === 'read') {
        // Double tick blue - read
        return (
          <View style={styles.doubleTickContainer}>
            <Ionicons name="checkmark" size={Math.min(hp(1.7), wp(3.7))} color={iconColor} style={styles.doubleTick1} />
            <Ionicons name="checkmark" size={Math.min(hp(1.7), wp(3.7))} color={iconColor} style={styles.doubleTick2} />
          </View>
        );
      }
    };
    
    return (
      <View>
        {showDateDivider && (
          <View style={styles.dateDividerRow}>
            <Text style={styles.dateDividerText}>{formatChatDateDivider(item.createdAt)}</Text>
          </View>
        )}
        <View style={[
          styles.messageContainer,
          isOwnMessage ? styles.ownMessage : styles.otherMessage,
          actionPlan ? styles.actionPlanMessageContainer : null,
          actionPlan && isOwnMessage ? styles.ownActionPlanMessage : null,
          actionPlan && !isOwnMessage ? styles.otherActionPlanMessage : null,
        ]}>
          {!isOwnMessage && (
            <View style={styles.otherUserAvatar}>
              <Ionicons
                name={userRole === 'doctor' ? 'person' : 'medical'}
                size={Math.min(hp(3), wp(6.4))}
                color={colors.primary}
              />
            </View>
          )}
          <View style={{ flex: 1 }}>
            {!isOwnMessage && (
              <Text style={styles.senderName}>{item.senderName}</Text>
            )}
            <View style={[
              styles.messageBubble,
              isOwnMessage ? styles.ownBubble : styles.otherBubble,
              actionPlan ? styles.actionPlanBubble : null,
            ]}>
              {actionPlan ? (
                renderActionPlanCard(actionPlan, isOwnMessage)
              ) : (
                <Text style={[
                  styles.messageText,
                  isOwnMessage ? styles.ownMessageText : styles.otherMessageText
                ]}>
                  {item.message}
                </Text>
              )}
              <View style={styles.messageFooter}>
                <Text style={[
                  styles.messageTime,
                  isOwnMessage ? styles.ownMessageTime : styles.otherMessageTime
                ]}>
                  {new Date(item.createdAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </Text>
                {getMessageStatusIcon()}
              </View>
            </View>
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading chat...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (chatClosed) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <View style={styles.closedContainer}>
          <Ionicons name="chatbubbles-outline" size={Math.min(hp(7.8), wp(17))} color={colors.textTertiary} />
          <Text style={styles.closedTitle}>Chat Unavailable</Text>
          <Text style={styles.closedReason}>{closedReason}</Text>
          <TouchableOpacity 
            style={styles.goBackButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      {/* Custom Header with Profile and Timer */}
      <View style={styles.header}>
        <BackButton style={styles.backButton} testID="appointment-back" />
        
        <View style={styles.headerCenter}>
          <View style={styles.profileImageContainer}>
            <Ionicons 
              name={userRole === 'doctor' ? 'person' : 'medical'} 
              size={Math.min(hp(4.7), wp(10.1))} 
              color={colors.primary} 
              
            />
          </View>
          <View style={styles.headerInfo}>
            <Text style={styles.headerName}>
              {otherUserName || (userRole === 'doctor' ? 'Patient' : 'Doctor')}
            </Text>
            {/* <View style={styles.timerContainer}>
              <Ionicons name="time-outline" size={Math.min(hp(1.7), wp(3.7))} color={colors.surface} />
              <Text style={styles.timerText}>{timeRemaining || 'Loading...'}</Text>
            </View> */}
          </View>
        </View>
        
        {/* Video Call Button - ZegoCloud Room */}
        <VideoCallButton
          onPress={() => {
            router.push({
              pathname: '/(main)/(conference)/video-call' as any,
              params: {
                callId: appointmentId,
                appointmentId: appointmentId,
                userName: otherUserName || 'User',
              }
            });
          }}
          disabled={!canSend || chatClosed}
          loading={false}
          size={Math.min(hp(3), wp(6.4))}
        />
        
        {/* Action Plan Button - Doctor Only */}
        {userRole === 'doctor' && (
          <TouchableOpacity
            style={styles.statsButton}
            onPress={() => setShowActionPlanModal(true)}
            activeOpacity={0.7}
            disabled={!canSend || chatClosed}
          >
            {sendingActionPlan ? (
              <ActivityIndicator size="small" color={colors.textOnPrimary} />
            ) : (
              <Ionicons name="clipboard-outline" size={Math.min(hp(3), wp(6.4))} color={colors.textOnPrimary} />
            )}
          </TouchableOpacity>
        )}

        {/* Diet Plan Button - Doctor Only */}
        {userRole === 'doctor' && (
          <TouchableOpacity 
            style={styles.statsButton} 
            onPress={() => {
              console.log('Diet plan button pressed');
              console.log('Appointment data:', appointmentData);
              console.log('Patient ID:', appointmentData?.patientId);
              
              if (!appointmentData?.patientId) {
                Alert.alert('Error', 'Patient information not available. Please refresh the chat.');
                return;
              }
              
              setShowDietPlanModal(true);
            }}
            activeOpacity={0.7}
          >
            {loadingDietPlan ? (
              <ActivityIndicator size="small" color={colors.textOnPrimary} />
            ) : (
              <Ionicons name="nutrition-outline" size={Math.min(hp(3), wp(6.4))} color={colors.textOnPrimary} />
            )}
          </TouchableOpacity>
        )}
        
        <TouchableOpacity style={styles.infoButton}>
          <Ionicons name="information-circle-outline" size={Math.min(hp(3.2), wp(6.9))} color={colors.textOnPrimary} />
        </TouchableOpacity>
      </View>

      {/* Grant Access Banner - Doctor Only */}
      {userRole === 'doctor' && !chatAccessGranted && (
        <View style={styles.grantAccessBanner}>
          <View style={styles.grantAccessContent}>
            <View style={styles.grantAccessIcon}>
              <Ionicons name="lock-closed" size={Math.min(hp(2.5), wp(5.4))} color="#FF9500" />
            </View>
            <View style={styles.grantAccessTextContainer}>
              <Text style={styles.grantAccessTitle}>Chat Access Required</Text>
              <Text style={styles.grantAccessSubtitle}>Patient is waiting for your approval</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.grantAccessButton}
            onPress={grantAccessToUser}
            disabled={isGrantingAccess}
            activeOpacity={0.8}
          >
            {isGrantingAccess ? (
              <ActivityIndicator size="small" color={colors.textOnPrimary} />
            ) : (
              <>
                <Ionicons name="key" size={Math.min(hp(2.2), wp(4.8))} color={colors.textOnPrimary} />
                <Text style={styles.grantAccessButtonText}>Grant Access</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}
        keyboardVerticalOffset={0}
      >
        {/* Messages List */}
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.messagesList}
          onContentSizeChange={() => scrollToBottom()}
        />

        {/* Typing Indicator */}
        {otherUserTyping && (
          <View style={styles.typingContainer}>
            <View style={styles.typingBubble}>
              <Text style={styles.typingText}>{typingUserName || otherUserName || 'They'} typing</Text>
              <View style={styles.typingDots}>
                <View style={styles.typingDot} />
                <View style={styles.typingDot} />
                <View style={styles.typingDot} />
              </View>
            </View>
          </View>
        )}

        {/* Input Area */}
        <View
          style={[
            styles.composerContainer,
            isKeyboardVisible && keyboardLift > 0 ? { marginBottom: keyboardLift } : null,
          ]}
        >
          {canSend && !chatClosed && inputText.trim().length === 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.quickReplyRow}
              keyboardShouldPersistTaps="handled"
            >
              {userRole === 'user' && (
                <AnimatedPressable
                  style={styles.quickReplyChip}
                  onPress={() => router.push('/(main)/(doctor-report)' as any)}
                  activeScale={0.96}
                >
                  <Ionicons
                    name="document-text-outline"
                    size={Math.min(hp(1.9), wp(4.2))}
                    color={colors.primary}
                  />
                  <Text style={styles.quickReplyText}>Doctor Report</Text>
                </AnimatedPressable>
              )}
              {userRole === 'user' && (
                <AnimatedPressable
                  style={[
                    styles.quickReplyChip,
                    styles.progressShareChip,
                    (sharingProgress || sending) && styles.quickReplyChipDisabled,
                  ]}
                  onPress={handleShareProgress}
                  disabled={sharingProgress || sending}
                  activeScale={0.96}
                >
                  {sharingProgress ? (
                    <ActivityIndicator size="small" color={colors.textOnPrimary} />
                  ) : (
                    <Ionicons
                      name="stats-chart-outline"
                      size={Math.min(hp(1.9), wp(4.2))}
                      color={colors.textOnPrimary}
                    />
                  )}
                  <Text style={[styles.quickReplyText, styles.progressShareText]}>
                    Share Progress
                  </Text>
                </AnimatedPressable>
              )}
              {quickReplies.map((reply) => (
                <AnimatedPressable
                  key={reply}
                  style={styles.quickReplyChip}
                  onPress={() => handleQuickReplyPress(reply)}
                  activeScale={0.96}
                >
                  <Text style={styles.quickReplyText}>{reply}</Text>
                </AnimatedPressable>
              ))}
            </ScrollView>
          )}
          <View style={[styles.inputContainer, { paddingBottom: inputBottomPadding }]}>
            <TextInput
              style={styles.input}
              value={inputText}
              onChangeText={handleTextChange}
              placeholder={canSend ? "Type a message..." : (accessMessage || "Waiting for chat access...")}
              placeholderTextColor={colors.textTertiary}
              multiline
              maxLength={1000}
              editable={!chatClosed && canSend}
            />
            <AnimatedPressable 
              style={[
                styles.sendButton,
                (!inputText.trim() || sending || chatClosed || !canSend) && styles.sendButtonDisabled
              ]}
              onPress={sendMessage}
              disabled={!inputText.trim() || sending || chatClosed || !canSend}
              activeScale={0.94}
            >
              {sending ? (
                <ActivityIndicator size="small" color={colors.textOnPrimary} />
              ) : (
                <Ionicons name="send" size={Math.min(hp(3), wp(6.4))} color={colors.textOnPrimary} />
              )}
            </AnimatedPressable>
          </View>
          {androidNavigationBarHeight > 0 && (
            <View style={[styles.androidNavigationBarBackground, { height: androidNavigationBarHeight }]} />
          )}
        </View>
      </KeyboardAvoidingView>

      {/* Diet Plan Modal */}
      <DietPlanModal 
        visible={showDietPlanModal}
        onClose={() => setShowDietPlanModal(false)}
        appointmentId={appointmentId}
        patientId={appointmentData?.patientId || ''}
        patientName={otherUserName}
        loading={loadingDietPlan}
        setLoading={setLoadingDietPlan}
      />
      <DoctorActionPlanModal
        visible={showActionPlanModal}
        loading={sendingActionPlan}
        onClose={() => setShowActionPlanModal(false)}
        onSend={handleSendActionPlan}
      />
    </SafeAreaView>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.screenColor
  },
  container: {
    flex: 1,
    backgroundColor: colors.screenColor
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: hp(1.7),
    backgroundColor: colors.primary,
    ...theme.shadows.large
  },
  backButton: {
    width: Math.min(hp(5.4), wp(11.7)),
    height: Math.min(hp(5.4), wp(11.7)),
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.sm
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center'
  },
  profileImageContainer: {
    marginRight: wp(3.7),
    backgroundColor: colors.cardBackground,
    width: Math.min(hp(6.7), wp(14.5)),
    height: Math.min(hp(6.7), wp(14.5)),
    borderRadius: Math.min(hp(3.35), wp(7.25)),
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadows.small
  },
  headerInfo: {
    flex: 1,
    justifyContent: 'center'
  },
  headerName: {
    fontSize: Math.min(hp(2.3), wp(5.1)),
    fontWeight: theme.typography.fontWeight.bold as any,
    color: colors.textOnPrimary,
    includeFontPadding: false
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    paddingHorizontal: wp(2.7),
    paddingVertical: hp(0.6),
    borderRadius: theme.borderRadius.large,
    alignSelf: 'flex-start'
  },
  timerText: {
    fontSize: theme.typography.fontSize.xs,
    color: colors.textOnPrimary,
    fontWeight: theme.typography.fontWeight.bold as any,
    marginLeft: wp(1.3)
  },
  infoButton: {
    width: Math.min(hp(5.4), wp(11.7)),
    height: Math.min(hp(5.4), wp(11.7)),
    justifyContent: 'center',
    alignItems: 'center'
  },
  messagesList: {
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.sm
  },
  dateDividerRow: {
    alignItems: 'center',
    marginBottom: hp(1.5),
  },
  dateDividerText: {
    overflow: 'hidden',
    backgroundColor: colors.backgroundHeader,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: wp(4),
    paddingHorizontal: wp(3.2),
    paddingVertical: hp(0.65),
    color: colors.textSecondary,
    fontSize: Math.min(hp(1.35), wp(3)),
    fontWeight: '800',
  },
  messageContainer: {
    marginBottom: theme.spacing.lg,
    maxWidth: '78%',
    flexDirection: 'row'
  },
  ownMessage: {
    alignSelf: 'flex-end',
    marginLeft: '22%'
  },
  otherMessage: {
    alignSelf: 'flex-start',
    marginRight: '22%'
  },
  actionPlanMessageContainer: {
    width: wp(88),
    maxWidth: wp(88),
    marginBottom: hp(1.2),
  },
  ownActionPlanMessage: {
    marginLeft: wp(4),
  },
  otherActionPlanMessage: {
    marginRight: wp(2),
  },
  otherUserAvatar: {
    marginRight: wp(2.7),
    marginTop: hp(0.5),
    backgroundColor: colors.border,
    borderRadius: Math.min(hp(2.5), wp(5.4)),
    width: Math.min(hp(4.9), wp(10.7)),
    height: Math.min(hp(4.9), wp(10.7)),
    justifyContent: 'center',
    alignItems: 'center'
  },
  senderName: {
    fontSize: theme.typography.fontSize.sm,
    color: colors.primary,
    marginBottom: hp(0.7),
    marginLeft: theme.spacing.sm,
    fontWeight: theme.typography.fontWeight.bold as any
  },
  messageBubble: {
    borderRadius: theme.borderRadius.xl,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: hp(1.35),
    ...theme.shadows.small,
    minWidth: wp(21.3)
  },
  actionPlanBubble: {
    width: '100%',
    paddingHorizontal: wp(3.4),
    paddingVertical: hp(1.35),
  },
  ownBubble: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: wp(1.1)
  },
  otherBubble: {
    backgroundColor: colors.cardBackground,
    borderBottomLeftRadius: wp(1.1),
    borderWidth: 1,
    borderColor: colors.border
  },
  messageText: {
    fontSize: theme.typography.fontSize.base,
    lineHeight: hp(2.7),
    marginBottom: hp(0.5)
  },
  ownMessageText: {
    color: colors.textOnPrimary
  },
  otherMessageText: {
    color: colors.textPrimary
  },
  actionPlanCard: {
    width: '100%',
    gap: hp(0.68),
  },
  actionPlanHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2.4),
    marginBottom: hp(0.35),
  },
  actionPlanIcon: {
    width: Math.min(hp(3.8), wp(8.2)),
    height: Math.min(hp(3.8), wp(8.2)),
    borderRadius: Math.min(hp(1.9), wp(4.1)),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.textOnPrimary,
  },
  actionPlanTitleWrap: {
    flex: 1,
    minWidth: 0,
  },
  actionPlanTitle: {
    fontSize: Math.min(hp(1.75), wp(4.15)),
    fontWeight: '900',
  },
  actionPlanSubtitle: {
    fontSize: Math.min(hp(1.24), wp(2.95)),
    fontWeight: '800',
    marginTop: hp(0.15),
  },
  actionPlanRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: wp(2.2),
  },
  actionPlanRowCopy: {
    flex: 1,
    minWidth: 0,
  },
  actionPlanRowLabel: {
    fontSize: Math.min(hp(1.08), wp(2.6)),
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  actionPlanRowValue: {
    fontSize: Math.min(hp(1.38), wp(3.3)),
    lineHeight: Math.min(hp(2.05), wp(4.85)),
    fontWeight: '700',
    marginTop: hp(0.12),
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: hp(0.35)
  },
  messageTime: {
    fontSize: Math.min(hp(1.35), wp(3)),
    marginRight: wp(1.1),
    fontWeight: theme.typography.fontWeight.medium as any
  },
  ownMessageTime: {
    color: 'rgba(255, 255, 255, 0.8)'
  },
  otherMessageTime: {
    color: colors.textTertiary
  },
  statusIcon: {
    marginLeft: wp(0.5)
  },
  doubleTickContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: wp(0.5),
    height: hp(1.7),
    width: wp(4.8),
    position: 'relative'
  },
  doubleTick1: {
    position: 'absolute',
    left: 0,
    top: 0
  },
  doubleTick2: {
    position: 'absolute',
    left: wp(1.3),
    top: 0
  },
  typingContainer: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: hp(0.8),
    paddingLeft: theme.spacing.xl,
    backgroundColor: 'transparent'
  },
  typingBubble: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    borderRadius: wp(5),
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: wp(3.4),
    paddingVertical: hp(0.9),
    gap: wp(2),
  },
  typingText: {
    fontSize: theme.typography.fontSize.sm,
    color: colors.primary,
    fontWeight: theme.typography.fontWeight.semiBold as any
  },
  typingDots: {
    flexDirection: 'row',
    gap: wp(0.8),
  },
  typingDot: {
    width: hp(0.65),
    height: hp(0.65),
    borderRadius: hp(0.33),
    backgroundColor: colors.primary,
    opacity: 0.7,
  },
  composerContainer: {
    backgroundColor: colors.primary,
  },
  quickReplyRow: {
    gap: wp(2),
    paddingHorizontal: theme.spacing.lg,
    paddingTop: hp(1),
    paddingBottom: hp(0.8),
    backgroundColor: colors.cardBackground,
  },
  quickReplyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(1.2),
    borderRadius: wp(5),
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft || `${colors.primary}18`,
    paddingHorizontal: wp(3.5),
    paddingVertical: hp(0.9),
  },
  progressShareChip: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  quickReplyChipDisabled: {
    opacity: 0.7,
  },
  quickReplyText: {
    color: colors.primary,
    fontSize: Math.min(hp(1.45), wp(3.2)),
    fontWeight: '800',
  },
  progressShareText: {
    color: colors.textOnPrimary,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: wp(3.7),
    paddingHorizontal: theme.spacing.lg,
    backgroundColor: colors.cardBackground,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    ...theme.shadows.medium
  },
  androidNavigationBarBackground: {
    backgroundColor: colors.screenColor,
  },
  input: {
    flex: 1,
    minHeight: Math.min(hp(5.7), wp(12.3)),
    maxHeight: hp(12.3),
    backgroundColor: colors.backgroundHeader,
    borderRadius: wp(6.4),
    paddingHorizontal: wp(4.8),
    paddingVertical: hp(1.35),
    fontSize: theme.typography.fontSize.base,
    marginRight: theme.spacing.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    color: colors.textPrimary
  },
  sendButton: {
    width: Math.min(hp(5.7), wp(12.3)),
    height: Math.min(hp(5.7), wp(12.3)),
    borderRadius: Math.min(hp(2.8), wp(6.1)),
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: hp(0.35) },
    shadowOpacity: 0.3,
    shadowRadius: wp(1.3),
    elevation: 5
  },
  sendButtonDisabled: {
    backgroundColor: colors.disabled,
    shadowOpacity: 0.1
  },
  grantAccessBanner: {
    backgroundColor: '#FFF9E6',
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: '#FFE0B2',
    ...theme.shadows.small
  },
  grantAccessContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md
  },
  grantAccessIcon: {
    width: Math.min(hp(4.9), wp(10.7)),
    height: Math.min(hp(4.9), wp(10.7)),
    borderRadius: Math.min(hp(2.5), wp(5.4)),
    backgroundColor: '#FFE0B2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md
  },
  grantAccessTextContainer: {
    flex: 1
  },
  grantAccessTitle: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semiBold as any,
    color: '#E65100',
    marginBottom: hp(0.25)
  },
  grantAccessSubtitle: {
    fontSize: theme.typography.fontSize.sm,
    color: '#F57C00'
  },
  grantAccessButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.secondary,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
    borderRadius: wp(6.4),
    gap: theme.spacing.sm,
    shadowColor: colors.secondary,
    shadowOffset: { width: 0, height: hp(0.25) },
    shadowOpacity: 0.3,
    shadowRadius: wp(1.1),
    elevation: 3
  },
  grantAccessButtonText: {
    color: colors.textOnPrimary,
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semiBold as any,
    letterSpacing: 0
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingText: {
    marginTop: theme.spacing.md,
    fontSize: theme.typography.fontSize.base,
    color: colors.textSecondary
  },
  closedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xxxl
  },
  closedTitle: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.semiBold as any,
    color: colors.textPrimary,
    marginTop: theme.spacing.lg
  },
  closedReason: {
    fontSize: theme.typography.fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: theme.spacing.sm
  },
  goBackButton: {
    marginTop: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
    backgroundColor: colors.primary,
    borderRadius: theme.borderRadius.medium
  },
  backButtonText: {
    color: colors.textOnPrimary,
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semiBold as any
  },
  statsButton: {
    padding: theme.spacing.sm,
    marginRight: wp(1.1)
  }
});
