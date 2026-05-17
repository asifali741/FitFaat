import AppHeader from '@/components/AppHeader';
import { theme } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';
import { authApi } from '@/utils/auth/authApi';
import { tokenStorage } from '@/utils/auth/tokenStorage';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList, RefreshControl, StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from 'react-native-responsive-screen';
import { SafeAreaView } from 'react-native-safe-area-context';
import { io } from 'socket.io-client';
import { getBackendBaseUrl } from '@/utils/config';

// ── Helpers ────────────────────────────────────────────────────────────────────

const formatChatTime = (dateStr: string | null | undefined): string => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays === 0 && date.getDate() === now.getDate()) {
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  }
  if (diffDays === 1 || (diffDays === 0 && date.getDate() !== now.getDate())) return 'Yesterday';
  if (diffDays < 7) return date.toLocaleDateString('en-US', { weekday: 'short' });
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const truncateMessage = (text: string | null | undefined, maxLen = 40): string => {
  if (!text) return '';
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen).trimEnd() + '…';
};

// ── Component ──────────────────────────────────────────────────────────────────

const getErrorMessage = (error: any): string => {
  if (typeof error === 'string') return error;
  return error?.message || 'Failed to load appointments';
};

const isUnauthorizedError = (error: any): boolean => {
  const status = error?.status || error?.response?.status;
  return status === 401 || /not authorized|unauthorized|jwt expired|please login/i.test(getErrorMessage(error));
};

export default function AllChatsScreen() {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const router = useRouter();
  const navigation = useNavigation();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [doctorId, setDoctorId] = useState<string | null>(null);
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
      const token = await tokenStorage.getToken();
      if (!token) return {};
      const API_URL = getBackendBaseUrl();
      const resp = await fetch(`${API_URL}/api/chat/unread-by-appointment`, { method: 'GET', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } });
      if (!resp.ok) { console.log('⚠️ [DoctorChats] unread-by-appointment API failed:', resp.status); return {}; }
      const data = await resp.json();
      console.log('📊 [DoctorChats] unread-by-appointment API response:', JSON.stringify(data.unreadByAppointment || {}));
      return data.unreadByAppointment || {};
    } catch (e) { console.log('⚠️ [DoctorChats] fetchUnreadMap error:', e); return {}; }
  };

  const fetchAppointments = async () => {
    setIsLoading(true);
    try {
      const doctorStatusResponse = await authApi.getDoctorStatus();
      if (!doctorStatusResponse.success || !doctorStatusResponse.doctor) {
        Alert.alert('Error', 'You need to register as a doctor first');
        try { if (navigation && (navigation as any).canGoBack && (navigation as any).canGoBack()) { (navigation as any).goBack(); return; } } catch (e) {}
        router.back();
        return;
      }

      const doctorIdValue = doctorStatusResponse.doctor.id;
      setDoctorId(doctorIdValue);

      const appointmentsResponse = await authApi.getDoctorAppointments(doctorIdValue);
      if (appointmentsResponse.success) {
        const unreadByAppointmentMap = await fetchUnreadMap();
        console.log('📋 [DoctorChats] Setting unreadMessages from API:', JSON.stringify(unreadByAppointmentMap));
        setUnreadMessages(unreadByAppointmentMap);

        // Build lastMessages map from API response
        const msgMap: typeof lastMessages = {};
        (appointmentsResponse.appointments || []).forEach((apt: any) => {
          if (apt.lastMessageText) {
            msgMap[apt._id] = {
              text: apt.lastMessageText,
              senderRole: apt.lastMessageSenderRole || 'doctor',
              createdAt: apt.lastMessageAt,
            };
          }
        });
        setLastMessages(prev => ({ ...prev, ...msgMap }));

        const confirmedAppointments = (appointmentsResponse.appointments || [])
          .filter((apt: any) => apt.status === 'confirmed')
          .sort((a: any, b: any) => {
            const aUnread = (unreadByAppointmentMap[a._id] || 0) > 0 ? 1 : 0;
            const bUnread = (unreadByAppointmentMap[b._id] || 0) > 0 ? 1 : 0;
            if (aUnread !== bUnread) return bUnread - aUnread;
            if (a.lastMessageAt && b.lastMessageAt) return new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime();
            if (a.lastMessageAt) return -1;
            if (b.lastMessageAt) return 1;
            return new Date(b.date).getTime() - new Date(a.date).getTime();
          });
        setAppointments(confirmedAppointments);
      }
    } catch (error) {
      const message = getErrorMessage(error);
      if (isUnauthorizedError(error)) {
        console.log('[DoctorChats] Unauthorized appointment fetch:', message);
        setAppointments([]);
        await tokenStorage.clearAll();
        Alert.alert('Session expired', 'Please sign in again.', [
          { text: 'OK', onPress: () => router.replace('/(auth)') },
        ]);
      } else {
        console.log('Failed to fetch appointments:', error);
        Alert.alert('Error', 'Failed to load appointments');
      }
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
        const token = await tokenStorage.getToken();
        if (!token) return;
        const API_URL = getBackendBaseUrl();
        socket = io(API_URL, { transports: ['websocket'], auth: { token } });
        socketRef.current = socket;

        socket.on('connect', () => {
          console.log('\n🔌 [DoctorChats] Socket CONNECTED! Socket ID:', socket.id);
          console.log('   This socket should receive user-new-message events\n');
        });

        socket.on('disconnect', () => {
          console.log('❌ [DoctorChats] Socket disconnected');
        });

        socket.on('connect_error', (err: any) => {
          console.log('⚠️ [DoctorChats] Socket connect error:', err.message);
        });

        // Log ALL events for debugging
        socket.onAny((eventName: string, ...args: any[]) => {
          console.log(`📡 [DoctorChats] Event received: ${eventName}`, JSON.stringify(args).substring(0, 100));
        });

        socket.on('user-new-message', (payload: any) => {
          if (!payload || !payload.appointmentId) return;
          console.log('📩 [DoctorChats] user-new-message received:', JSON.stringify({
            appointmentId: payload.appointmentId,
            senderRole: payload.senderRole,
            isSender: payload.isSender,
            unreadCount: payload.unreadCount,
            messageText: payload.messageText?.substring(0, 30),
          }));

          // Update last message preview
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
                console.log('🔴 [DoctorChats] Unread updated from payload:', payload.appointmentId, '->', payload.unreadCount);
                return updated;
              });
            } else {
              setUnreadMessages(prev => {
                const newCount = (prev[payload.appointmentId] || 0) + 1;
                console.log('🔴 [DoctorChats] Unread incremented:', payload.appointmentId, '->', newCount);
                return { ...prev, [payload.appointmentId]: newCount };
              });
            }
          }

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
          console.log('✅ [DoctorChats] messages-read received:', payload.appointmentId);
          setUnreadMessages(prev => ({ ...prev, [payload.appointmentId]: 0 }));
        });

        socket.on('message-status-update', () => { fetchUnreadMessages(); });

      } catch (error) {
        console.log('Error setting up chat socket in AllChats (doctor):', error);
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
    setUnreadMessages(prev => ({ ...prev, [appointmentId]: 0 }));
    router.push({ pathname: '/(main)/(conference)/appointment-chat', params: { appointmentId } });
  }, [router]);

  // ── Render ─────────────────────────────────────────────────────────────

  const renderAppointment = ({ item }: { item: any }) => {
    const unreadCount = unreadMessages[item._id] || 0;
    const hasUnread = unreadCount > 0;

    const lastMsg = lastMessages[item._id] || (item.lastMessageText
      ? { text: item.lastMessageText, senderRole: item.lastMessageSenderRole, createdAt: item.lastMessageAt }
      : null);

    const timeLabel = formatChatTime(lastMsg?.createdAt || item.lastMessageAt);

    let previewText = 'Tap to start chatting';
    if (lastMsg?.text) {
      const prefix = lastMsg.senderRole === 'user' ? `${item.userName || 'Patient'}: ` : 'You: ';
      previewText = prefix + truncateMessage(lastMsg.text, 35);
    }

    return (
      <TouchableOpacity
        style={styles.chatRow}
        onPress={() => openChat(item._id)}
        activeOpacity={0.65}
      >
        {/* Avatar */}
        <View style={styles.avatar}>
          <Ionicons name="person" size={Math.min(hp(3.2), wp(6.9))} color={colors.primary} />
          <View style={[styles.statusDot, { backgroundColor: colors.statusConfirmed }]} />
        </View>

        {/* Content */}
        <View style={styles.chatContent}>
          <View style={styles.topRow}>
            <Text style={[styles.chatName, hasUnread && styles.chatNameBold]} numberOfLines={1}>
              {item.userName || 'Patient'}
            </Text>
            <Text style={[styles.chatTime, hasUnread && styles.chatTimeUnread]}>
              {timeLabel}
            </Text>
          </View>

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
              lastMsg?.senderRole === 'doctor' && lastMsg?.text ? (
                <View style={styles.checkContainer}>
                  <Ionicons name="checkmark-done" size={Math.min(hp(2), wp(4.3))} color={colors.info} />
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
        <AppHeader title="Patient Chats" showBackButton />
        <View style={[styles.loadingContainer, styles.content]}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading chats...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader title="Patient Chats" showBackButton />

      <View style={styles.content}>
        {appointments.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="chatbubbles-outline" size={Math.min(hp(8.9), wp(19.2))} color={colors.border} />
          <Text style={styles.emptyTitle}>No Chats Yet</Text>
          <Text style={styles.emptySubtitle}>Confirmed patient appointments will appear here</Text>
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
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
        />
      )}
      </View>
    </SafeAreaView>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const AVATAR_SIZE = Math.min(hp(6.9), wp(14.9));

const getStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.screenColor,
  },
  content: {
    flex: 1,
    backgroundColor: colors.screenColor,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: theme.spacing.md,
    fontSize: theme.typography.fontSize.base,
    color: colors.textSecondary,
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
    color: colors.textPrimary,
    marginTop: theme.spacing.lg,
  },
  emptySubtitle: {
    fontSize: theme.typography.fontSize.base,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: theme.spacing.sm,
  },

  // ── List ────────────────
  listContainer: {
    paddingTop: hp(1.4),
    paddingHorizontal: wp(3.6),
    paddingBottom: hp(17),
  },
  separator: {
    height: hp(1.1),
  },

  // ── Chat Row (WhatsApp-style) ────────────────
  chatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: hp(9.4),
    paddingVertical: hp(1.35),
    paddingHorizontal: wp(3.5),
    backgroundColor: colors.cardBackground,
    borderRadius: wp(3.4),
    borderWidth: 1,
    borderColor: colors.cardBorder,
    shadowColor: colors.shadowLight || '#000',
    shadowOpacity: 0.08,
    shadowRadius: wp(2),
    shadowOffset: { width: 0, height: hp(0.25) },
    elevation: 2,
  },

  // Avatar
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: colors.chatUser,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.secondary,
    position: 'relative',
  },
  statusDot: {
    position: 'absolute',
    bottom: 1,
    right: 1,
    width: Math.min(hp(1.7), wp(3.7)),
    height: Math.min(hp(1.7), wp(3.7)),
    borderRadius: Math.min(hp(0.85), wp(1.85)),
    borderWidth: 2,
    borderColor: colors.cardBackground,
  },

  // Content
  chatContent: {
    flex: 1,
    marginLeft: wp(3.2),
    justifyContent: 'center',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: hp(0.5),
  },
  chatName: {
    flex: 1,
    fontSize: Math.min(hp(2), wp(4.35)),
    fontWeight: theme.typography.fontWeight.medium as any,
    color: colors.textPrimary,
    marginRight: wp(2.1),
  },
  chatNameBold: {
    fontWeight: theme.typography.fontWeight.bold as any,
  },
  chatTime: {
    fontSize: Math.min(hp(1.45), wp(3.15)),
    color: colors.textTertiary,
  },
  chatTimeUnread: {
    color: colors.primary,
    fontWeight: theme.typography.fontWeight.semiBold as any,
  },

  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chatPreview: {
    flex: 1,
    fontSize: Math.min(hp(1.65), wp(3.6)),
    color: colors.textSecondary,
    marginRight: wp(2.1),
  },
  chatPreviewUnread: {
    color: colors.textSecondary,
    fontWeight: theme.typography.fontWeight.semiBold as any,
  },

  // Badge
  unreadBadge: {
    backgroundColor: colors.primary,
    borderRadius: wp(3.2),
    minWidth: 24,
    height: hp(3),
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: wp(1.6),
  },
  unreadBadgeText: {
    color: '#FFF',
    fontSize: Math.min(hp(1.5), wp(3.2)),
    fontWeight: theme.typography.fontWeight.bold as any,
  },
  checkContainer: {
    width: wp(6.4),
    alignItems: 'center',
  },
});
