import BackButton from '@/components/BackButton';
import DietPlanModal from '@/components/DietPlanModal';
import VideoCallButton from '@/components/VideoCallButton';
import { theme } from '@/constants/theme';
import { useNotifications } from '@/contexts/NotificationContext';
import { useTheme } from '@/contexts/ThemeContext';
import { tokenStorage } from '@/utils/auth/tokenStorage';
import {
  buildChatAccessGrantedNotificationPayload,
  CHAT_ACCESS_GRANTED_BODY,
  CHAT_ACCESS_GRANTED_TITLE,
} from '@/utils/chatAccessNotifications';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import Constants from 'expo-constants';
import * as SystemUI from 'expo-system-ui';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
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
import { getBackendBaseUrl } from '@/utils/config';

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

// Remove /api from BACKEND_URL since routes already include it
const ENV = Constants.expoConfig?.extra;
const BACKEND_URL = getBackendBaseUrl();
const ANDROID_KEYBOARD_EXTRA_LIFT = hp(11);

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
  const [chatClosed, setChatClosed] = useState(false);
  const [closedReason, setClosedReason] = useState('');
  const [userRole, setUserRole] = useState<'user' | 'doctor' | null>(null);
  const [canSend, setCanSend] = useState(false);
  const [accessMessage, setAccessMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const [chatAccessGranted, setChatAccessGranted] = useState(false);
  const [isGrantingAccess, setIsGrantingAccess] = useState(false);
  const [otherUserName, setOtherUserName] = useState('');
  const [otherUserId, setOtherUserId] = useState<string>(''); // For video calls
  const [patientName, setPatientName] = useState(''); // For doctor's view
  const [timeRemaining, setTimeRemaining] = useState('');
  const [chatEndTime, setChatEndTime] = useState<Date | null>(null);
  const [patientStats, setPatientStats] = useState<any>(null);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [loadingStats, setLoadingStats] = useState(false);
  const [showDietPlanModal, setShowDietPlanModal] = useState(false);
  const [loadingDietPlan, setLoadingDietPlan] = useState(false);
  const [appointmentData, setAppointmentData] = useState<any>(null);
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);
  const [keyboardLift, setKeyboardLift] = useState(0);
  
  const socketRef = useRef<Socket | null>(null);
  const flatListRef = useRef<FlatList | null>(null);
  const typingTimeoutRef = useRef<number | null>(null);
  const timerIntervalRef = useRef<number | null>(null);
  const isInVideoCall = useRef<boolean>(false);
  const accessGrantNotifiedRef = useRef(false);
  const androidNavigationBarHeight = Platform.OS === 'android' && !isKeyboardVisible ? insets.bottom : 0;
  const inputBottomPadding = isKeyboardVisible
    ? hp(0.6)
    : Platform.OS === 'android'
      ? hp(1.4)
      : Math.max(insets.bottom, hp(1.5));

  const scrollToBottom = useCallback((animated = true) => {
    requestAnimationFrame(() => {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated });
      }, Platform.OS === 'ios' ? 80 : 120);
    });
  }, []);

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

  // Initialize socket and load chat
  useEffect(() => {
    initializeChat();
    
    return () => {
      // Only disconnect socket if not in video call
      // During video call, just leave the room but keep socket connected
      if (socketRef.current) {
        if (isInVideoCall.current) {
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
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [appointmentId]);

  useFocusEffect(
    useCallback(() => {
      if (Platform.OS !== 'android') return;

      SystemUI.setBackgroundColorAsync('#FFFFFF').catch(() => {});

      return () => {
        SystemUI.setBackgroundColorAsync(colors.screenColor).catch(() => {});
      };
    }, [])
  );

  // CRITICAL: Disconnect socket when screen loses focus (user navigates away)
  // This prevents the chat socket from receiving messages and marking them as read
  // when the user is on a different screen (like the chat list)
  useFocusEffect(
    useCallback(() => {
      // Screen is focused - reconnect if needed
      console.log('👁️ [AppointmentChat] Screen focused');
      if (!socketRef.current?.connected && !isInVideoCall.current) {
        console.log('🔄 [AppointmentChat] Reconnecting socket...');
        initializeChat();
      }
      
      return () => {
        // Screen lost focus - disconnect socket to prevent marking messages as read
        console.log('👁️ [AppointmentChat] Screen UNFOCUSED - disconnecting socket');
        if (socketRef.current && !isInVideoCall.current) {
          socketRef.current.disconnect();
          socketRef.current = null;
        }
      };
    }, [appointmentId])
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

  const fetchPatientStats = async () => {
    setLoadingStats(true);
    try {
      const token = await tokenStorage.getToken();
      const response = await fetch(
        `${BACKEND_URL}/api/chat/appointment/${appointmentId}/patient-stats`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const data = await response.json();
      if (data.success) {
        setPatientStats(data.stats);
        setShowStatsModal(true);
      } else {
        Alert.alert('Error', data.message || 'Failed to fetch patient stats');
      }
    } catch (error) {
      console.error('Error fetching patient stats:', error);
      Alert.alert('Error', 'Failed to load patient statistics');
    } finally {
      setLoadingStats(false);
    }
  };

  const initializeChat = async () => {
    // Prevent multiple socket connections
    if (socketRef.current?.connected) {
      console.log('⚠️ [AppointmentChat] Socket already connected, skipping init');
      return;
    }
    
    try {
      const token = await tokenStorage.getToken();
      if (!token) {
        Alert.alert('Error', 'Please login first');
        try { const navigation = (require('@react-navigation/native').useNavigation)(); if (navigation && (navigation as any).canGoBack && (navigation as any).canGoBack()) { (navigation as any).goBack(); return; } } catch(e) {}
        router.back();
        return;
      }

      // Check chat access
      const accessResponse = await fetch(
        `${BACKEND_URL}/api/chat/appointment/${appointmentId}/access`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('Access response status:', accessResponse.status);
      
      if (!accessResponse.ok) {
        const errorText = await accessResponse.text();
        console.error('Access check failed:', errorText);
        throw new Error(`Failed to check access: ${accessResponse.status}`);
      }

      const accessData = await accessResponse.json();
      console.log('Chat access response:', accessData);

      if (!accessData.success || !accessData.allowed) {
        setChatClosed(true);
        setClosedReason(accessData.message || 'Chat is not available');
        setLoading(false);
        return;
      }

      setUserRole(accessData.userRole);
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
      const messagesResponse = await fetch(
        `${BACKEND_URL}/api/chat/appointment/${appointmentId}/messages`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('Messages response status:', messagesResponse.status);
      
      if (messagesResponse.ok) {
        const messagesData = await messagesResponse.json();
        console.log('Loaded messages:', messagesData.messages?.length || 0);
        if (messagesData.success) {
          setMessages(messagesData.messages || []);
        }
      } else {
        console.error('Failed to load messages:', messagesResponse.status);
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
        
        // Set other user ID for video calls
        if (data.otherUserId) {
          setOtherUserId(data.otherUserId);
        }
        
        // Set patient name if user is doctor
        if (accessData.userRole === 'doctor') {
          setPatientName(otherName);
        }
        
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

          if (message.senderRole !== accessData.userRole) {
            sendFitFaatNotification(
              'chat',
              `Message from ${message.senderName || otherUserName || 'FitFaat'}`,
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
          if (message.senderRole !== userRole && socketRef.current) {
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
            msg.senderRole === userRole 
              ? { ...msg, status: 'read' }
              : msg
          )
        );
      });

      socket.on('user-typing', (data) => {
        setOtherUserTyping(data.isTyping);
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
  };

  const grantAccessToUser = async () => {
    if (isGrantingAccess) return;
    
    setIsGrantingAccess(true);
    try {
      const token = await tokenStorage.getToken();
      const response = await fetch(
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
        }
      );

      const data = await response.json();
      
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

  const sendMessage = () => {
    if (!inputText.trim() || sending || chatClosed || !canSend) {
      console.log('Cannot send message:', { 
        hasText: !!inputText.trim(), 
        sending, 
        chatClosed, 
        canSend 
      });
      return;
    }

    setSending(true);
    const messageText = inputText.trim();
    setInputText('');
    
    if (socketRef.current && socketRef.current.connected) {
      console.log('Sending message via socket:', messageText);
      socketRef.current.emit('send-message', {
        appointmentId,
        message: messageText
      });

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
      socketRef.current.emit('typing', { appointmentId, isTyping: false });
      setIsTyping(false);
    } else {
      console.error('Socket not connected, cannot send message');
      setInputText(messageText); // Restore message
      setSending(false);
      Alert.alert('Connection Error', 'Not connected to chat server. Please try again.');
    }
  };

  const handleTextChange = (text: string) => {
    setInputText(text);

    if (!chatClosed && canSend && socketRef.current) {
      // Send typing indicator
      if (!isTyping) {
        socketRef.current.emit('typing', { appointmentId, isTyping: true });
        setIsTyping(true);
      }

      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Set new timeout to stop typing indicator
      typingTimeoutRef.current = setTimeout(() => {
        if (socketRef.current) {
          socketRef.current.emit('typing', { appointmentId, isTyping: false });
        }
        setIsTyping(false);
      }, 1000);
    }
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isOwnMessage = item.senderRole === userRole;
    
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
      <View style={[
        styles.messageContainer,
        isOwnMessage ? styles.ownMessage : styles.otherMessage
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
            isOwnMessage ? styles.ownBubble : styles.otherBubble
          ]}>
            <Text style={[
              styles.messageText,
              isOwnMessage ? styles.ownMessageText : styles.otherMessageText
            ]}>
              {item.message}
            </Text>
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
            onPress={() => {
              // Prefer navigation goBack when possible
              try {
                // @ts-ignore
                const navigation = require('@react-navigation/native').useNavigation();
                if (navigation && typeof (navigation as any).canGoBack === 'function' && (navigation as any).canGoBack()) {
                  (navigation as any).goBack();
                  return;
                }
              } catch (e) {}
              router.back();
            }}
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
        
        {/* Patient Stats Button - Doctor Only */}
        {userRole === 'doctor' && (
          <TouchableOpacity 
            style={styles.statsButton} 
            onPress={fetchPatientStats}
            activeOpacity={0.7}
          >
            {loadingStats ? (
              <ActivityIndicator size="small" color={colors.textOnPrimary} />
            ) : (
              <Ionicons name="bar-chart-outline" size={Math.min(hp(3), wp(6.4))} color={colors.textOnPrimary} />
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
            <Text style={styles.typingText}>Typing...</Text>
          </View>
        )}

        {/* Input Area */}
        <View style={[styles.composerContainer, { marginBottom: keyboardLift }]}>
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
            <TouchableOpacity 
              style={[
                styles.sendButton,
                (!inputText.trim() || sending || chatClosed || !canSend) && styles.sendButtonDisabled
              ]}
              onPress={sendMessage}
              disabled={!inputText.trim() || sending || chatClosed || !canSend}
              activeOpacity={0.8}
            >
              {sending ? (
                <ActivityIndicator size="small" color={colors.textOnPrimary} />
              ) : (
                <Ionicons name="send" size={Math.min(hp(3), wp(6.4))} color={colors.textOnPrimary} />
              )}
            </TouchableOpacity>
          </View>
          {androidNavigationBarHeight > 0 && (
            <View style={[styles.androidNavigationBarBackground, { height: androidNavigationBarHeight }]} />
          )}
        </View>
      </KeyboardAvoidingView>



      {/* Patient Stats Modal */}
      <Modal
        visible={showStatsModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowStatsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Patient Health Overview</Text>
              <TouchableOpacity onPress={() => setShowStatsModal(false)}>
                <Ionicons name="close" size={Math.min(hp(3), wp(6.4))} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {patientStats ? (
                <>
                  <View style={styles.statsCard}>
                    <View style={styles.statItem}>
                      <Text style={styles.statLabel}>Weight</Text>
                      <Text style={styles.statValue}>{patientStats.weight || '--'} kg</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                      <Text style={styles.statLabel}>Height</Text>
                      <Text style={styles.statValue}>{patientStats.height || '--'} cm</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                      <Text style={styles.statLabel}>BMI</Text>
                      <Text style={styles.statValue}>{patientStats.bmi || '--'}</Text>
                    </View>
                  </View>

                  <View style={styles.sectionContainer}>
                    <Text style={styles.sectionTitle}>Daily Calorie Goal</Text>
                    <View style={styles.goalCard}>
                      <Ionicons name="flame" size={Math.min(hp(3), wp(6.4))} color="#FF9500" />
                      <View style={styles.goalInfo}>
                        <Text style={styles.goalValue}>{patientStats.goalCalories || 'Not set'} kcal</Text>
                        <Text style={styles.goalLabel}>Daily Target</Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.sectionContainer}>
                    <Text style={styles.sectionTitle}>Recent Intake (Last 7 Days)</Text>
                    {patientStats.recentLogs && patientStats.recentLogs.length > 0 ? (
                      patientStats.recentLogs.map((log: any, index: number) => (
                        <View key={index} style={styles.logItem}>
                          <View style={styles.logHeader}>
                            <Text style={styles.logDate}>
                              {new Date(log.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                            </Text>
                            <Text style={styles.logValues}>
                              {log.achievedCalories} / {log.targetCalories} kcal
                            </Text>
                          </View>
                          <View style={styles.logBarContainer}>
                            <View 
                              style={[
                                styles.logBar, 
                                { 
                                  width: `${Math.min((log.achievedCalories / (log.targetCalories || 2000)) * 100, 100)}%`,
                                  backgroundColor: log.achievedCalories > log.targetCalories ? '#FF3B30' : colors.primary 
                                }
                              ]} 
                            />
                          </View>
                        </View>
                      ))
                    ) : (
                      <View style={styles.emptyContainer}>
                        <Ionicons name="calendar-outline" size={Math.min(hp(5.9), wp(12.8))} color={colors.textTertiary} />
                        <Text style={styles.emptyText}>No recent tracking logs found</Text>
                      </View>
                    )}
                  </View>
                </>
              ) : (
                <View style={[styles.loadingContainer, { height: hp(37) }]}>
                  <ActivityIndicator size="large" color={colors.primary} />
                  <Text style={styles.loadingText}>Loading health data...</Text>
                </View>
              )}
              <View style={{ height: hp(3.7) }} />
            </ScrollView>
          </View>
        </View>
      </Modal>

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
    padding: theme.spacing.md,
    paddingLeft: theme.spacing.xl,
    backgroundColor: 'transparent'
  },
  typingText: {
    fontSize: theme.typography.fontSize.sm,
    color: colors.primary,
    fontStyle: 'italic',
    fontWeight: theme.typography.fontWeight.semiBold as any
  },
  composerContainer: {
    backgroundColor: colors.primary,
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
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.cardBackground,
    borderTopLeftRadius: wp(6.4),
    borderTopRightRadius: wp(6.4),
    height: '85%',
    padding: theme.spacing.xl,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  modalTitle: {
    fontSize: Math.min(hp(2.7), wp(5.9)),
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  modalBody: {
    flex: 1,
  },
  statsCard: {
    flexDirection: 'row',
    backgroundColor: colors.backgroundHeader,
    borderRadius: wp(4.3),
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statDivider: {
    width: wp(0.25),
    height: '60%',
    backgroundColor: colors.border,
  },
  statLabel: {
    fontSize: Math.min(hp(1.5), wp(3.2)),
    color: colors.textSecondary,
    marginBottom: hp(0.5),
    textTransform: 'uppercase',
    letterSpacing: 0,
  },
  statValue: {
    fontSize: Math.min(hp(2.2), wp(4.8)),
    fontWeight: 'bold',
    color: colors.primary,
  },
  sectionContainer: {
    marginBottom: hp(3),
  },
  sectionTitle: {
    fontSize: Math.min(hp(2), wp(4.3)),
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: hp(1.5),
  },
  goalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF4E5',
    padding: wp(4.3),
    borderRadius: wp(3.2),
    borderWidth: 1,
    borderColor: '#FFE0B2',
  },
  goalInfo: {
    marginLeft: wp(3.2),
  },
  goalValue: {
    fontSize: Math.min(hp(2.5), wp(5.4)),
    fontWeight: 'bold',
    color: '#E65100',
  },
  goalLabel: {
    fontSize: Math.min(hp(1.5), wp(3.2)),
    color: '#F57C00',
  },
  logItem: {
    marginBottom: hp(2),
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: hp(0.7),
  },
  logDate: {
    fontSize: Math.min(hp(1.8), wp(3.8)),
    fontWeight: '500',
    color: colors.textSecondary,
  },
  logValues: {
    fontSize: Math.min(hp(1.8), wp(3.8)),
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  logBarContainer: {
    height: hp(1),
    backgroundColor: colors.border,
    borderRadius: hp(0.5),
    overflow: 'hidden',
  },
  logBar: {
    height: '100%',
    borderRadius: hp(0.5),
  },
  emptyContainer: {
    alignItems: 'center',
    padding: wp(8.5),
    backgroundColor: colors.backgroundHeader,
    borderRadius: wp(3.2),
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyText: {
    marginTop: hp(1.5),
    color: colors.textSecondary,
    fontSize: Math.min(hp(1.8), wp(3.8)),
  }
});
