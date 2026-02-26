import BackButton from '@/components/BackButton';
import DietPlanModal from '@/components/DietPlanModal';
import IncomingCallModal from '@/components/IncomingCallModal';
import VideoCallButton from '@/components/VideoCallButton';
import { theme } from '@/constants/theme';
import { useVideoCall } from '@/hooks/useVideoCall';
import { tokenStorage } from '@/utils/auth/tokenStorage';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { io, Socket } from 'socket.io-client';

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
const BACKEND_URL = (ENV?.EXPO_PUBLIC_BACKEND_API_URL || (Platform.OS === 'android' ? 'http://10.0.2.2:5001' : 'http://localhost:5001')).replace(/\/api\/?$/, '');

interface AppointmentChatProps {
  appointmentId: string;
}

export default function AppointmentChat({ appointmentId }: AppointmentChatProps) {
  const router = useRouter();
  
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
  
  const socketRef = useRef<Socket | null>(null);
  const flatListRef = useRef<FlatList | null>(null);
  const typingTimeoutRef = useRef<number | null>(null);
  const timerIntervalRef = useRef<number | null>(null);
  const isInVideoCall = useRef<boolean>(false);

  // Video call functionality
  const {
    initiateCall,
    acceptCall,
    rejectCall,
    incomingCall,
    isCallInProgress,
    isInitiatingCall,
    isVideoCallAvailable,
  } = useVideoCall({
    socketRef,
    appointmentId,
    userRole,
    otherUserId,
    otherUserName,
    canSend,
    isInVideoCallRef: isInVideoCall,
  });

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
          console.log('🔌 Disconnecting socket');
          socketRef.current.disconnect();
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
          Alert.alert('Access Granted', 'Doctor has granted you chat access! You can now send messages.');
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

      // Listen for incoming video calls
      socket.on('video:incoming-call', (payload: any) => {
        console.log('📞 [CHAT SCREEN] Incoming video call received:', payload);
        const { roomName, callerId, callerName, receiverId } = payload;
        
        Alert.alert(
          '📹 Incoming Video Call',
          `${callerName || 'Doctor'} is calling you`,
          [
            {
              text: 'Decline',
              style: 'cancel',
              onPress: () => {
                console.log('📞 [CHAT SCREEN] User declined call');
                socket.emit('video:reject-call', {
                  roomName,
                  callerId,
                  reason: 'User declined'
                });
              }
            },
            {
              text: 'Accept',
              onPress: async () => {
                console.log('📞 [CHAT SCREEN] User accepted call');
                // Extract appointmentId from roomName (format: appointment_<id>)
                const callAppointmentId = roomName.replace('appointment_', '');
                
                // Get current user ID
                const currentUserId = receiverId || accessData.userId;
                
                // Notify caller that call was accepted
                socket.emit('video:accept-call', {
                  roomName,
                  callerId,
                  receiverId: currentUserId
                });
                
                console.log('📞 [CHAT SCREEN] Navigating to video call screen');
                // Navigate to video call screen
                router.push({
                  pathname: '/(main)/(conference)/video-call',
                  params: {
                    callId: roomName,
                    userName: accessData.userRole === 'user' ? 'Patient' : 'Doctor',
                    appointmentId: callAppointmentId
                  }
                });
              }
            }
          ],
          { cancelable: false }
        );
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
          }
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
      const iconColor = isRead ? theme.colors.info : theme.colors.textTertiary;
      
      if (status === 'sent') {
        // Single tick - sent but not delivered
        return <Ionicons name="checkmark" size={14} color={iconColor} style={styles.statusIcon} />;
      } else if (status === 'delivered') {
        // Double tick - delivered but not read
        return (
          <View style={styles.doubleTickContainer}>
            <Ionicons name="checkmark" size={14} color={iconColor} style={styles.doubleTick1} />
            <Ionicons name="checkmark" size={14} color={iconColor} style={styles.doubleTick2} />
          </View>
        );
      } else if (status === 'read') {
        // Double tick blue - read
        return (
          <View style={styles.doubleTickContainer}>
            <Ionicons name="checkmark" size={14} color={iconColor} style={styles.doubleTick1} />
            <Ionicons name="checkmark" size={14} color={iconColor} style={styles.doubleTick2} />
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
              size={24} 
              color={theme.colors.primary} 
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
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading chat...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (chatClosed) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.closedContainer}>
          <Ionicons name="chatbubbles-outline" size={64} color={theme.colors.textTertiary} />
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
    <SafeAreaView style={styles.container}>
      {/* Custom Header with Profile and Timer */}
      <View style={styles.header}>
        <BackButton style={styles.backButton} testID="appointment-back" />
        
        <View style={styles.headerCenter}>
          <View style={styles.profileImageContainer}>
            <Ionicons 
              name={userRole === 'doctor' ? 'person' : 'medical'} 
              size={38} 
              color={theme.colors.primary} 
              
            />
          </View>
          <View style={styles.headerInfo}>
            <Text style={styles.headerName}>
              {otherUserName || (userRole === 'doctor' ? 'Patient' : 'Doctor')}
            </Text>
            {/* <View style={styles.timerContainer}>
              <Ionicons name="time-outline" size={14} color={theme.colors.surface} />
              <Text style={styles.timerText}>{timeRemaining || 'Loading...'}</Text>
            </View> */}
          </View>
        </View>
        
        {/* Video Call Button */}
        <VideoCallButton
          onPress={initiateCall}
          disabled={!isVideoCallAvailable || chatClosed}
          loading={isInitiatingCall}
          size={24}
        />
        
        {/* Patient Stats Button - Doctor Only */}
        {userRole === 'doctor' && (
          <TouchableOpacity 
            style={styles.statsButton} 
            onPress={fetchPatientStats}
            activeOpacity={0.7}
          >
            {loadingStats ? (
              <ActivityIndicator size="small" color={theme.colors.surface} />
            ) : (
              <Ionicons name="bar-chart-outline" size={24} color={theme.colors.surface} />
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
              <ActivityIndicator size="small" color={theme.colors.surface} />
            ) : (
              <Ionicons name="nutrition-outline" size={24} color={theme.colors.surface} />
            )}
          </TouchableOpacity>
        )}
        
        <TouchableOpacity style={styles.infoButton}>
          <Ionicons name="information-circle-outline" size={26} color={theme.colors.surface} />
        </TouchableOpacity>
      </View>

      {/* Grant Access Banner - Doctor Only */}
      {userRole === 'doctor' && !chatAccessGranted && (
        <View style={styles.grantAccessBanner}>
          <View style={styles.grantAccessContent}>
            <View style={styles.grantAccessIcon}>
              <Ionicons name="lock-closed" size={20} color="#FF9500" />
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
              <ActivityIndicator size="small" color={theme.colors.surface} />
            ) : (
              <>
                <Ionicons name="key" size={18} color={theme.colors.surface} />
                <Text style={styles.grantAccessButtonText}>Grant Access</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
        keyboardVerticalOffset={90}
      >
        {/* Messages List */}
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.messagesList}
          onContentSizeChange={() => {
            flatListRef.current?.scrollToEnd({ animated: true });
          }}
        />

        {/* Typing Indicator */}
        {otherUserTyping && (
          <View style={styles.typingContainer}>
            <Text style={styles.typingText}>Typing...</Text>
          </View>
        )}

        {/* Input Area */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={handleTextChange}
            placeholder={canSend ? "Type a message..." : (accessMessage || "Waiting for chat access...")}
            placeholderTextColor={theme.colors.textTertiary}
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
              <ActivityIndicator size="small" color={theme.colors.surface} />
            ) : (
              <Ionicons name="send" size={24} color={theme.colors.surface} />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Incoming Call Modal */}
      {incomingCall && (
        <IncomingCallModal
          visible={!!incomingCall}
          callerName={incomingCall.callerName}
          callerRole={incomingCall.callerRole}
          onAccept={acceptCall}
          onReject={rejectCall}
        />
      )}

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
                <Ionicons name="close" size={24} color={theme.colors.textPrimary} />
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
                      <Ionicons name="flame" size={24} color="#FF9500" />
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
                                  backgroundColor: log.achievedCalories > log.targetCalories ? '#FF3B30' : theme.colors.primary 
                                }
                              ]} 
                            />
                          </View>
                        </View>
                      ))
                    ) : (
                      <View style={styles.emptyContainer}>
                        <Ionicons name="calendar-outline" size={48} color={theme.colors.textTertiary} />
                        <Text style={styles.emptyText}>No recent tracking logs found</Text>
                      </View>
                    )}
                  </View>
                </>
              ) : (
                <View style={[styles.loadingContainer, { height: 300 }]}>
                  <ActivityIndicator size="large" color={theme.colors.primary} />
                  <Text style={styles.loadingText}>Loading health data...</Text>
                </View>
              )}
              <View style={{ height: 30 }} />
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: 14,
    backgroundColor: theme.colors.primary,
    ...theme.shadows.large
  },
  backButton: {
    padding: theme.spacing.sm,
    marginRight: theme.spacing.sm
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center'
  },
  profileImageContainer: {
    marginRight: 14,
    marginTop: 13,
    backgroundColor: theme.colors.surface,
    borderRadius: 25,
    padding: 3,
    ...theme.shadows.small
  },
  headerInfo: {
    flex: 1
  },
  headerName: {
    fontSize: 19,
    fontWeight: theme.typography.fontWeight.bold as any,
    color: theme.colors.surface,
    marginBottom: 4
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: theme.borderRadius.large,
    alignSelf: 'flex-start'
  },
  timerText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.surface,
    fontWeight: theme.typography.fontWeight.bold as any,
    marginLeft: 5
  },
  infoButton: {
    padding: theme.spacing.sm
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
    marginRight: 10,
    marginTop: 4,
    backgroundColor: theme.colors.border,
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center'
  },
  senderName: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.primary,
    marginBottom: 6,
    marginLeft: theme.spacing.sm,
    fontWeight: theme.typography.fontWeight.bold as any
  },
  messageBubble: {
    borderRadius: theme.borderRadius.xl,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: 11,
    ...theme.shadows.small,
    minWidth: 80
  },
  ownBubble: {
    backgroundColor: theme.colors.primary,
    borderBottomRightRadius: 4
  },
  otherBubble: {
    backgroundColor: theme.colors.surface,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: theme.colors.border
  },
  messageText: {
    fontSize: theme.typography.fontSize.base,
    lineHeight: 22,
    marginBottom: 4
  },
  ownMessageText: {
    color: theme.colors.surface
  },
  otherMessageText: {
    color: theme.colors.textPrimary
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 3
  },
  messageTime: {
    fontSize: 11,
    marginRight: 4,
    fontWeight: theme.typography.fontWeight.medium as any
  },
  ownMessageTime: {
    color: 'rgba(255, 255, 255, 0.8)'
  },
  otherMessageTime: {
    color: theme.colors.textTertiary
  },
  statusIcon: {
    marginLeft: 2
  },
  doubleTickContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 2,
    height: 14,
    width: 18,
    position: 'relative'
  },
  doubleTick1: {
    position: 'absolute',
    left: 0,
    top: 0
  },
  doubleTick2: {
    position: 'absolute',
    left: 5,
    top: 0
  },
  typingContainer: {
    padding: theme.spacing.md,
    paddingLeft: theme.spacing.xl,
    backgroundColor: 'transparent'
  },
  typingText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.primary,
    fontStyle: 'italic',
    fontWeight: theme.typography.fontWeight.semiBold as any
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 14,
    paddingHorizontal: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    ...theme.shadows.medium
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 100,
    backgroundColor: theme.colors.background,
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 11,
    fontSize: theme.typography.fontSize.base,
    marginRight: theme.spacing.md,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    color: theme.colors.textPrimary
  },
  sendButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: theme.colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: theme.colors.accent,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5
  },
  sendButtonDisabled: {
    backgroundColor: theme.colors.disabled,
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
    width: 40,
    height: 40,
    borderRadius: 20,
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
    marginBottom: 2
  },
  grantAccessSubtitle: {
    fontSize: theme.typography.fontSize.sm,
    color: '#F57C00'
  },
  grantAccessButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.secondary,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
    borderRadius: 24,
    gap: theme.spacing.sm,
    shadowColor: theme.colors.secondary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3
  },
  grantAccessButtonText: {
    color: theme.colors.surface,
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semiBold as any,
    letterSpacing: 0.5
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingText: {
    marginTop: theme.spacing.md,
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textSecondary
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
    color: theme.colors.textPrimary,
    marginTop: theme.spacing.lg
  },
  closedReason: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: theme.spacing.sm
  },
  goBackButton: {
    marginTop: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.medium
  },
  backButtonText: {
    color: theme.colors.surface,
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semiBold as any
  },
  statsButton: {
    padding: theme.spacing.sm,
    marginRight: 4
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
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
    fontSize: 22,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
  },
  modalBody: {
    flex: 1,
  },
  statsCard: {
    flexDirection: 'row',
    backgroundColor: theme.colors.background,
    borderRadius: 16,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statDivider: {
    width: 1,
    height: '60%',
    backgroundColor: theme.colors.border,
  },
  statLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  sectionContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
    marginBottom: 12,
  },
  goalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF4E5',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFE0B2',
  },
  goalInfo: {
    marginLeft: 12,
  },
  goalValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#E65100',
  },
  goalLabel: {
    fontSize: 12,
    color: '#F57C00',
  },
  logItem: {
    marginBottom: 16,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  logDate: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.textSecondary,
  },
  logValues: {
    fontSize: 14,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
  },
  logBarContainer: {
    height: 8,
    backgroundColor: theme.colors.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  logBar: {
    height: '100%',
    borderRadius: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: theme.colors.background,
    borderRadius: 12,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  emptyText: {
    marginTop: 12,
    color: theme.colors.textSecondary,
    fontSize: 14,
  }
});
