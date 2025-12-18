import { tokenStorage } from '@/utils/auth/tokenStorage';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
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
const BACKEND_URL = (process.env.EXPO_PUBLIC_BACKEND_API_URL || 'http://localhost:5001').replace('/api', '');

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
  const [patientName, setPatientName] = useState(''); // For doctor's view
  const [timeRemaining, setTimeRemaining] = useState('');
  const [chatEndTime, setChatEndTime] = useState<Date | null>(null);
  
  const socketRef = useRef<Socket | null>(null);
  const flatListRef = useRef<FlatList | null>(null);
  const typingTimeoutRef = useRef<number | null>(null);
  const timerIntervalRef = useRef<number | null>(null);

  // Initialize socket and load chat
  useEffect(() => {
    initializeChat();
    
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
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

  const initializeChat = async () => {
    try {
      const token = await tokenStorage.getToken();
      if (!token) {
        Alert.alert('Error', 'Please login first');
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
        socket.emit('join-appointment', { appointmentId });
      });

      socket.on('joined', (data) => {
        console.log('✅ Joined chat room:', data);
        console.log('✅ Room details - appointmentId:', data.appointmentId, 'userRole:', data.userRole, 'canSend:', data.canSend);
        const otherName = data.otherUserName || (accessData.userRole === 'doctor' ? 'Patient' : 'Doctor');
        setOtherUserName(otherName);
        
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
      const iconColor = isRead ? '#4FC3F7' : '#B0BEC5'; // Blue when read, gray otherwise
      
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
              color="#6C63FF" 
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
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading chat...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (chatClosed) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.closedContainer}>
          <Ionicons name="chatbubbles-outline" size={64} color="#999" />
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
    <SafeAreaView style={styles.container}>
      {/* Custom Header with Profile and Timer */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        
        <View style={styles.headerCenter}>
          <View style={styles.profileImageContainer}>
            <Ionicons 
              name={userRole === 'doctor' ? 'person' : 'medical'} 
              size={38} 
              color="#6C63FF" 
            />
          </View>
          <View style={styles.headerInfo}>
            <Text style={styles.headerName}>
              {otherUserName || (userRole === 'doctor' ? 'Patient' : 'Doctor')}
            </Text>
            <View style={styles.timerContainer}>
              <Ionicons name="time-outline" size={14} color="#FFF" />
              <Text style={styles.timerText}>{timeRemaining || 'Loading...'}</Text>
            </View>
          </View>
        </View>
        
        <TouchableOpacity style={styles.infoButton}>
          <Ionicons name="information-circle-outline" size={26} color="#FFF" />
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
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <>
                <Ionicons name="key" size={18} color="#FFF" />
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
            placeholderTextColor="#999"
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
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Ionicons name="send" size={24} color="#FFF" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA' // Clean professional background
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#6C63FF', // Modern purple gradient
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 8
  },
  backButton: {
    padding: 8,
    marginRight: 8
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center'
  },
  profileImageContainer: {
    marginRight: 14,
    backgroundColor: '#FFF',
    borderRadius: 25,
    padding: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 4
  },
  headerInfo: {
    flex: 1
  },
  headerName: {
    fontSize: 19,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 4
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    alignSelf: 'flex-start'
  },
  timerText: {
    fontSize: 12,
    color: '#FFF',
    fontWeight: '700',
    marginLeft: 5
  },
  infoButton: {
    padding: 8
  },
  messagesList: {
    padding: 16,
    paddingBottom: 8
  },
  messageContainer: {
    marginBottom: 16,
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
    backgroundColor: '#E8EAED',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center'
  },
  senderName: {
    fontSize: 13,
    color: '#6C63FF',
    marginBottom: 6,
    marginLeft: 8,
    fontWeight: '700'
  },
  messageBubble: {
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 11,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
    minWidth: 80
  },
  ownBubble: {
    backgroundColor: '#6C63FF', // Modern purple
    borderBottomRightRadius: 4
  },
  otherBubble: {
    backgroundColor: '#FFF',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#E8EAED'
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 4
  },
  ownMessageText: {
    color: '#FFF'
  },
  otherMessageText: {
    color: '#1F2937'
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
    fontWeight: '500'
  },
  ownMessageTime: {
    color: 'rgba(255, 255, 255, 0.8)'
  },
  otherMessageTime: {
    color: '#9CA3AF'
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
    padding: 12,
    paddingLeft: 20,
    backgroundColor: 'transparent'
  },
  typingText: {
    fontSize: 13,
    color: '#6C63FF',
    fontStyle: 'italic',
    fontWeight: '600'
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 14,
    paddingHorizontal: 16,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#E8EAED',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 8
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 100,
    backgroundColor: '#F5F7FA',
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 11,
    fontSize: 15,
    marginRight: 12,
    borderWidth: 1.5,
    borderColor: '#E8EAED',
    color: '#1F2937'
  },
  sendButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#6C63FF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#6C63FF',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5
  },
  sendButtonDisabled: {
    backgroundColor: '#D1D5DB',
    shadowOpacity: 0.1
  },
  grantAccessBanner: {
    backgroundColor: '#FFF9E6',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#FFE0B2',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2
  },
  grantAccessContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12
  },
  grantAccessIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFE0B2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  grantAccessTextContainer: {
    flex: 1
  },
  grantAccessTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#E65100',
    marginBottom: 2
  },
  grantAccessSubtitle: {
    fontSize: 13,
    color: '#F57C00'
  },
  grantAccessButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 24,
    gap: 8,
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3
  },
  grantAccessButtonText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.5
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666'
  },
  closedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32
  },
  closedTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginTop: 16
  },
  closedReason: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 8
  },
  goBackButton: {
    marginTop: 24,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: '#007AFF',
    borderRadius: 8
  },
  backButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600'
  }
});
