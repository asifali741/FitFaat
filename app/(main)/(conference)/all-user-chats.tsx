import AppHeader from '@/components/AppHeader';
import { theme } from '@/constants/theme';
import { authApi } from '@/utils/auth/authApi';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList, Platform, RefreshControl, StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { widthPercentageToDP as wp } from 'react-native-responsive-screen';
import { SafeAreaView } from 'react-native-safe-area-context';
import { io } from 'socket.io-client';

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Format a date into a WhatsApp-style timestamp label */
const formatChatTime = (dateStr: string | null | undefined): string => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / 86400000);

  // Today – show time
  if (diffDays === 0 && date.getDate() === now.getDate()) {
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  }
  // Yesterday
  if (diffDays === 1 || (diffDays === 0 && date.getDate() !== now.getDate())) {
    return 'Yesterday';
  }
  // Within last week – show day name
  if (diffDays < 7) {
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  }
  // Older – show date
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

/** Truncate a message preview */
const truncateMessage = (text: string | null | undefined, maxLen = 40): string => {
  if (!text) return '';
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen).trimEnd() + '…';
};

// ── Component ──────────────────────────────────────────────────────────────────

export default function AllUserChatsScreen() {
  const router = useRouter();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState<{ [key: string]: number }>({});
  const [lastMessages, setLastMessages] = useState<{ [key: string]: { text: string; senderRole: string; createdAt: string } }>({});
  const socketRef = useRef<any>(null);

  useEffect(() => {
    fetchAppointments();
    fetchUnreadMessages();
  }, []);

  // ── Data fetching ──────────────────────────────────────────────────────

  const fetchUnreadMap = async (): Promise<{ [key: string]: number }> => {
    try {
      const token = await SecureStore.getItemAsync('authToken');
      if (!token) return {};
      const ENV = Constants.expoConfig?.extra;
      const API_URL = (ENV?.EXPO_PUBLIC_BACKEND_API_URL || (Platform.OS === 'android' ? 'http://10.0.2.2:5001' : 'http://localhost:5001')).replace(/\/api\/?$/, '');
      const resp = await fetch(`${API_URL}/api/chat/unread-by-appointment`, { method: 'GET', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } });
      if (!resp.ok) { console.log('⚠️ [AllUserChats] unread-by-appointment API failed:', resp.status); return {}; }
      const data = await resp.json();
      console.log('📊 [AllUserChats] unread-by-appointment API response:', JSON.stringify(data.unreadByAppointment || {}));
      return data.unreadByAppointment || {};
    } catch (e) { console.log('⚠️ [AllUserChats] fetchUnreadMap error:', e); return {}; }
  };

  const fetchAppointments = async () => {
    setIsLoading(true);
    try {
      const response = await authApi.getUserAppointments();
      if (response.success) {
        const unreadByAppointmentMap = await fetchUnreadMap();
        console.log('📋 [AllUserChats] Setting unreadMessages from API:', JSON.stringify(unreadByAppointmentMap));
        setUnreadMessages(unreadByAppointmentMap);

        // Build lastMessages map from API response
        const msgMap: typeof lastMessages = {};
        (response.appointments || []).forEach((apt: any) => {
          if (apt.lastMessageText) {
            msgMap[apt._id] = {
              text: apt.lastMessageText,
              senderRole: apt.lastMessageSenderRole || 'user',
              createdAt: apt.lastMessageAt,
            };
          }
        });
        setLastMessages(prev => ({ ...prev, ...msgMap }));

        const allAppointments = (response.appointments || []).sort((a: any, b: any) => {
          const aUnread = (unreadByAppointmentMap[a._id] || 0) > 0 ? 1 : 0;
          const bUnread = (unreadByAppointmentMap[b._id] || 0) > 0 ? 1 : 0;
          if (aUnread !== bUnread) return bUnread - aUnread;
          if (a.lastMessageAt && b.lastMessageAt) return new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime();
          if (a.lastMessageAt) return -1;
          if (b.lastMessageAt) return 1;
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        });

        setAppointments(allAppointments);
      } else {
        Alert.alert('Error', 'Failed to load appointments');
      }
    } catch (error) {
      console.error('Failed to fetch appointments:', error);
      Alert.alert('Error', 'Failed to load appointments');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUnreadMessages = async () => {
    try {
      const map = await fetchUnreadMap();
      setUnreadMessages(map);
    } catch (error) {
      console.log('Error fetching unread messages:', error);
    }
  };

  // ── Socket ─────────────────────────────────────────────────────────────

  useEffect(() => {
    let socket: any = null;

    const initSocket = async () => {
      try {
        const token = await SecureStore.getItemAsync('authToken');
        if (!token) return;
        const ENV = Constants.expoConfig?.extra;
        const API_URL = (ENV?.EXPO_PUBLIC_BACKEND_API_URL || (Platform.OS === 'android' ? 'http://10.0.2.2:5001' : 'http://localhost:5001')).replace(/\/api\/?$/, '');
        socket = io(API_URL, { transports: ['websocket'], auth: { token } });
        socketRef.current = socket;

        socket.on('connect', () => {
          console.log('✅ Socket connected in AllUserChats. Socket ID:', socket.id);
        });

        socket.on('disconnect', () => {
          console.log('❌ Socket disconnected in AllUserChats');
        });

        socket.on('user-new-message', (payload: any) => {
          if (!payload || !payload.appointmentId) return;
          console.log('📩 [AllUserChats] user-new-message received:', JSON.stringify({
            appointmentId: payload.appointmentId,
            senderRole: payload.senderRole,
            isSender: payload.isSender,
            unreadCount: payload.unreadCount,
            messageText: payload.messageText?.substring(0, 30),
          }));

          // Update last message preview from socket payload
          if (payload.messageText) {
            setLastMessages(prev => ({
              ...prev,
              [payload.appointmentId]: {
                text: payload.messageText,
                senderRole: payload.senderRole || 'user',
                createdAt: payload.createdAt,
              },
            }));
          }

          // Only increment unread count for messages we RECEIVED (not ones we sent)
          if (!payload.isSender) {
            if (typeof payload.unreadCount === 'number' && payload.unreadCount > 0) {
              setUnreadMessages(prev => {
                const updated = { ...prev, [payload.appointmentId]: payload.unreadCount };
                console.log('🔴 [AllUserChats] Unread updated from payload:', payload.appointmentId, '->', payload.unreadCount);
                return updated;
              });
            } else {
              setUnreadMessages(prev => {
                const newCount = (prev[payload.appointmentId] || 0) + 1;
                console.log('🔴 [AllUserChats] Unread incremented:', payload.appointmentId, '->', newCount);
                return { ...prev, [payload.appointmentId]: newCount };
              });
            }
          }

          // Move appointment to top
          setAppointments(prev => {
            const idx = prev.findIndex(a => a._id === payload.appointmentId);
            if (idx === -1) { fetchAppointments(); return prev; }
            const updated = [...prev];
            const item = { ...updated.splice(idx, 1)[0] };
            if (payload.createdAt) item.lastMessageAt = payload.createdAt;
            if (payload.messageText) {
              item.lastMessageText = payload.messageText;
              item.lastMessageSenderRole = payload.senderRole || 'user';
            }
            return [item, ...updated];
          });
        });

        socket.on('messages-read', (payload: any) => {
          if (!payload || !payload.appointmentId) return;
          console.log('✅ [AllUserChats] messages-read received:', payload.appointmentId);
          setUnreadMessages(prev => ({ ...prev, [payload.appointmentId]: 0 }));
        });

        socket.on('message-status-update', () => { fetchUnreadMessages(); });

        // Listen for incoming video calls
        socket.on('video:incoming-call', (payload: any) => {
          console.log('📞 [MOBILE] Incoming video call received:', payload);
          const { roomName, callerId, callerName, receiverId } = payload;
          Alert.alert(
            '📹 Incoming Video Call',
            `${callerName || 'Doctor'} is calling you`,
            [
              {
                text: 'Decline', style: 'cancel',
                onPress: () => { socket.emit('video:reject-call', { roomName, callerId, reason: 'User declined' }); }
              },
              {
                text: 'Accept',
                onPress: async () => {
                  const appointmentId = roomName.replace('appointment_', '');
                  const currentUserId = receiverId || socket.userId;
                  socket.emit('video:accept-call', { roomName, callerId, receiverId: currentUserId });
                  router.push({ pathname: '/(main)/(conference)/video-call', params: { callId: roomName, userName: 'Patient', appointmentId } });
                }
              }
            ],
            { cancelable: false }
          );
        });

      } catch (error) {
        console.log('Error setting up chat socket in AllUserChats:', error);
      }
    };

    initSocket();
    return () => { try { socketRef.current?.disconnect(); } catch (e) { } };
  }, []);

  // ── Actions ────────────────────────────────────────────────────────────

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAppointments();
    await fetchUnreadMessages();
    setRefreshing(false);
  };

  const openChat = useCallback((appointmentId: string) => {
    // Immediately clear local unread when user opens the chat
    setUnreadMessages(prev => ({ ...prev, [appointmentId]: 0 }));
    router.push({ pathname: '/(main)/(conference)/appointment-chat', params: { appointmentId } });
  }, [router]);

  // ── Render ─────────────────────────────────────────────────────────────

  const renderAppointment = ({ item }: { item: any }) => {
    const unreadCount = unreadMessages[item._id] || 0;
    const hasUnread = unreadCount > 0;

    // Last message info – prefer real-time cache, fallback to API data
    const lastMsg = lastMessages[item._id] || (item.lastMessageText
      ? { text: item.lastMessageText, senderRole: item.lastMessageSenderRole, createdAt: item.lastMessageAt }
      : null);

    const timeLabel = formatChatTime(lastMsg?.createdAt || item.lastMessageAt);

    // Build preview text
    let previewText = 'Tap to start chatting';
    if (lastMsg?.text) {
      const prefix = lastMsg.senderRole === 'doctor' ? 'Dr: ' : 'You: ';
      previewText = prefix + truncateMessage(lastMsg.text, 35);
    }

    // Status info
    const statusColorMap: { [key: string]: string } = {
      confirmed: '#4CAF50', completed: theme.colors.textSecondary,
      cancelled: theme.colors.error, pending: '#F59E0B'
    };
    const statusColor = statusColorMap[item.status] || theme.colors.textSecondary;

    return (
      <TouchableOpacity
        style={styles.chatRow}
        onPress={() => openChat(item._id)}
        activeOpacity={0.65}
      >
        {/* Avatar */}
        <View style={[styles.avatar, { borderColor: statusColor }]}>
          <Ionicons name="medical" size={26} color={theme.colors.primary} />
          {/* Status dot */}
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
        </View>

        {/* Content */}
        <View style={styles.chatContent}>
          {/* Row 1: Name + Time */}
          <View style={styles.topRow}>
            <Text style={[styles.chatName, hasUnread && styles.chatNameBold]} numberOfLines={1}>
              {item.doctorName || 'Doctor'}
            </Text>
            <Text style={[styles.chatTime, hasUnread && styles.chatTimeUnread]}>
              {timeLabel}
            </Text>
          </View>

          {/* Row 2: Preview + Badge */}
          <View style={styles.bottomRow}>
            <Text
              style={[styles.chatPreview, hasUnread && styles.chatPreviewUnread]}
              numberOfLines={1}
            >
              {previewText}
            </Text>

            {hasUnread ? (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadBadgeText}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Text>
              </View>
            ) : (
              lastMsg?.senderRole === 'user' && lastMsg?.text ? (
                <View style={styles.checkContainer}>
                  <Ionicons name="checkmark-done" size={16} color={theme.colors.info} />
                </View>
              ) : null
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <AppHeader title="Chats" showBackButton />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading chats...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader title="Chats" showBackButton />

      {appointments.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="chatbubbles-outline" size={72} color={theme.colors.border} />
          <Text style={styles.emptyTitle}>No Chats Yet</Text>
          <Text style={styles.emptySubtitle}>Your conversations with doctors will appear here</Text>
        </View>
      ) : (
        <FlatList
          data={appointments}
          renderItem={renderAppointment}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.colors.primary}
              colors={[theme.colors.primary]}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const AVATAR_SIZE = 56;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: theme.spacing.md,
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  emptyTitle: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold as any,
    color: theme.colors.textPrimary,
    marginTop: theme.spacing.lg,
  },
  emptySubtitle: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: theme.spacing.sm,
  },

  // ── List ────────────────
  listContainer: {
    paddingTop: 4,
    paddingBottom: 100,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: theme.colors.border,
    marginLeft: AVATAR_SIZE + 28,
  },

  // ── Chat Row (WhatsApp-style) ────────────────
  chatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },

  // Avatar
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: theme.colors.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: theme.colors.primary,
    position: 'relative',
  },
  statusDot: {
    position: 'absolute',
    bottom: 1,
    right: 1,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: theme.colors.background,
  },

  // Content
  chatContent: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  chatName: {
    flex: 1,
    fontSize: wp(4.2),
    fontWeight: theme.typography.fontWeight.medium as any,
    color: theme.colors.textPrimary,
    marginRight: 8,
  },
  chatNameBold: {
    fontWeight: theme.typography.fontWeight.bold as any,
  },
  chatTime: {
    fontSize: wp(3),
    color: theme.colors.textTertiary,
  },
  chatTimeUnread: {
    color: theme.colors.primary,
    fontWeight: theme.typography.fontWeight.semiBold as any,
  },

  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chatPreview: {
    flex: 1,
    fontSize: wp(3.4),
    color: theme.colors.textTertiary,
    marginRight: 8,
  },
  chatPreviewUnread: {
    color: theme.colors.textSecondary,
    fontWeight: theme.typography.fontWeight.semiBold as any,
  },

  // Badge
  unreadBadge: {
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  unreadBadgeText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: theme.typography.fontWeight.bold as any,
  },
  checkContainer: {
    width: 24,
    alignItems: 'center',
  },
});
