import AppHeader from '@/components/AppHeader';
import AnimatedPressable from '@/components/common/AnimatedPressable';
import FilterChips from '@/components/common/FilterChips';
import SmartEmptyState from '@/components/common/SmartEmptyState';
import { theme } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';
import { cachedRequestJson } from '@/utils/apiHelper';
import { authApi } from '@/utils/auth/authApi';
import { getApiErrorMessage, isForbiddenRouteError, isSessionExpiredError } from '@/utils/auth/authErrors';
import { tokenStorage } from '@/utils/auth/tokenStorage';
import { Ionicons } from '@expo/vector-icons';
import * as SystemUI from 'expo-system-ui';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from 'react-native-responsive-screen';
import { SafeAreaView } from 'react-native-safe-area-context';
import { io } from 'socket.io-client';
import { getBackendBaseUrl, isRealtimeSocketEnabled } from '@/utils/config';

const CHAT_LIST_READ_CONFIG = {
  timeoutMs: 6500,
  retries: 1,
  retryDelayMs: 500,
  cacheTtlMs: 30 * 1000,
  maxStaleMs: 10 * 60 * 1000,
  allowStaleOnError: true,
  maxWaitForFreshMs: 1500,
  refreshCacheInBackground: true,
};

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

const getErrorMessage = (error: any): string => {
  if (typeof error === 'string') return error;
  return getApiErrorMessage(error, 'Failed to load appointments');
};

export default function AllUserChatsScreen() {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const router = useRouter();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState<{ [key: string]: number }>({});
  const [lastMessages, setLastMessages] = useState<{ [key: string]: { text: string; senderRole: string; createdAt: string } }>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const socketRef = useRef<any>(null);

  const statusOptions = useMemo(() => {
    const statuses = ['confirmed', 'pending', 'completed', 'cancelled'];
    return [
      { label: 'All', value: 'all', icon: 'chatbubbles-outline' as const, badge: appointments.length },
      ...statuses.map((status) => ({
        label: status.charAt(0).toUpperCase() + status.slice(1),
        value: status,
        icon: 'ellipse-outline' as const,
        badge: appointments.filter((appointment) => appointment.status === status).length,
      })),
    ];
  }, [appointments]);

  const visibleAppointments = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return appointments.filter((appointment) => {
      const lastMsg = lastMessages[appointment._id];
      const searchable = [
        appointment.doctorName,
        appointment.status,
        appointment.lastMessageText,
        lastMsg?.text,
        appointment.time,
      ].join(' ').toLowerCase();
      const matchesSearch = !query || searchable.includes(query);
      const matchesStatus = statusFilter === 'all' || appointment.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [appointments, lastMessages, searchQuery, statusFilter]);

  useFocusEffect(
    useCallback(() => {
      SystemUI.setBackgroundColorAsync('#FFFFFF').catch(() => {});

      return () => {
        SystemUI.setBackgroundColorAsync(colors.screenColor).catch(() => {});
      };
    }, [colors.screenColor])
  );

  // ── Data fetching ──────────────────────────────────────────────────────

  const fetchUnreadMap = useCallback(async (): Promise<{ [key: string]: number }> => {
    try {
      const token = await tokenStorage.getToken();
      if (!token) return {};
      const API_URL = getBackendBaseUrl();
      const user = await tokenStorage.getUser();
      const cacheUserKey = user?._id || user?.id || user?.userId || 'user';
      const cachedData = await cachedRequestJson<any>(
        `user-chats:unread-by-appointment:${cacheUserKey}`,
        `${API_URL}/api/chat/unread-by-appointment`,
        { method: 'GET', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } },
        CHAT_LIST_READ_CONFIG
      );
      console.log('[AllUserChats] unread-by-appointment response:', JSON.stringify(cachedData.unreadByAppointment || {}));
      return cachedData.unreadByAppointment || {};
      /* const resp = await fetch(`${API_URL}/api/chat/unread-by-appointment`, { method: 'GET', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } });
      if (!resp.ok) { console.log('⚠️ [AllUserChats] unread-by-appointment API failed:', resp.status); return {}; }
      const data = await resp.json();
      console.log('📊 [AllUserChats] unread-by-appointment API response:', JSON.stringify(data.unreadByAppointment || {}));
      return data.unreadByAppointment || {}; */
    } catch (e) { console.log('⚠️ [AllUserChats] fetchUnreadMap error:', e); return {}; }
  }, []);

  const fetchAppointments = useCallback(async () => {
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
      const message = getErrorMessage(error);
      if (isSessionExpiredError(error)) {
        console.log('[AllUserChats] Unauthorized appointment fetch:', message);
        setAppointments([]);
        await tokenStorage.clearAll();
        Alert.alert('Session expired', 'Please sign in again.', [
          { text: 'OK', onPress: () => router.replace('/(auth)') },
        ]);
      } else if (isForbiddenRouteError(error)) {
        console.log('[AllUserChats] Forbidden appointment fetch:', message);
        setAppointments([]);
        Alert.alert('Access denied', message);
      } else {
        console.log('Failed to fetch appointments:', error);
        Alert.alert('Error', 'Failed to load appointments');
      }
    } finally {
      setIsLoading(false);
    }
  }, [fetchUnreadMap, router]);

  const fetchUnreadMessages = useCallback(async () => {
    try {
      const map = await fetchUnreadMap();
      setUnreadMessages(map);
    } catch (error) {
      console.log('Error fetching unread messages:', error);
    }
  }, [fetchUnreadMap]);

  useEffect(() => {
    fetchAppointments();
    fetchUnreadMessages();
  }, [fetchAppointments, fetchUnreadMessages]);

  // ── Socket ─────────────────────────────────────────────────────────────

  useEffect(() => {
    let socket: any = null;

    const initSocket = async () => {
      try {
        if (!isRealtimeSocketEnabled()) return;

        const token = await tokenStorage.getToken();
        if (!token) return;
        const API_URL = getBackendBaseUrl();
        socket = io(API_URL, { transports: ['websocket'], auth: { token } });
        socketRef.current = socket;

        socket.on('connect', () => {
          console.log('\n🔌 [AllUserChats] Socket CONNECTED! Socket ID:', socket.id);
          console.log('   This socket should receive user-new-message events\n');
        });

        socket.on('disconnect', () => {
          console.log('❌ [AllUserChats] Socket disconnected');
        });

        socket.on('connect_error', (err: any) => {
          console.log('⚠️ [AllUserChats] Socket connect error:', err.message);
        });

        // Log ALL events for debugging
        socket.onAny((eventName: string, ...args: any[]) => {
          console.log(`📡 [AllUserChats] Event received: ${eventName}`, JSON.stringify(args).substring(0, 100));
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




      } catch (error) {
        console.log('Error setting up chat socket in AllUserChats:', error);
      }
    };

    initSocket();
    return () => { try { socketRef.current?.disconnect(); } catch (_e) { } };
  }, [fetchAppointments, fetchUnreadMessages]);

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
      confirmed: colors.success,
      completed: colors.textSecondary,
      cancelled: colors.error,
      pending: colors.warning,
    };
    const statusColor = statusColorMap[item.status] || colors.textSecondary;

    return (
      <AnimatedPressable
        style={styles.chatRow}
        onPress={() => openChat(item._id)}
      >
        {/* Avatar */}
        <View style={[styles.avatar, { borderColor: statusColor }]}>
          <Ionicons name="medical" size={Math.min(hp(3.2), wp(6.9))} color={colors.primary} />
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
                  <Ionicons name="checkmark-done" size={Math.min(hp(2), wp(4.3))} color={colors.info} />
                </View>
              ) : null
            )}
          </View>
        </View>
      </AnimatedPressable>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" translucent={false} />
        <AppHeader title="Chats" showBackButton />
        <View style={styles.contentSurface}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Loading chats...</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" translucent={false} />
      <AppHeader title="Chats" showBackButton />

      <View style={styles.contentSurface}>
        <ScrollView
          style={styles.screenScroll}
          contentContainerStyle={styles.screenScrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
        >
          <View style={styles.searchWrap}>
            <Ionicons name="search" size={20} color={colors.textSecondary} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search chats"
              placeholderTextColor={colors.textSecondary}
              style={styles.searchInput}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
          <FilterChips
            options={statusOptions}
            selectedValue={statusFilter}
            onChange={setStatusFilter}
            colors={colors}
            style={styles.filterChips}
          />
          {visibleAppointments.length === 0 ? (
            <SmartEmptyState
              icon="chatbubbles-outline"
              title={appointments.length === 0 ? 'No Chats Yet' : 'No Chats Found'}
              message={appointments.length === 0
                ? 'Your doctor conversations will appear here after an appointment is confirmed.'
                : 'Try another status, clear search, or check a different doctor name.'}
              colors={colors}
              style={styles.emptySmartState}
            />
          ) : (
            <View style={styles.chatList}>
              {visibleAppointments.map((item, index) => (
                <React.Fragment key={item._id}>
                  {renderAppointment({ item })}
                  {index < visibleAppointments.length - 1 ? <View style={styles.separator} /> : null}
                </React.Fragment>
              ))}
            </View>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const AVATAR_SIZE = Math.min(hp(6.9), wp(14.9));

const getStyles = (colors: any) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.screenColor,
  },
  contentSurface: {
    flex: 1,
    backgroundColor: colors.screenColor,
  },
  screenScroll: {
    flex: 1,
    backgroundColor: colors.screenColor,
  },
  screenScrollContent: {
    flexGrow: 1,
    paddingBottom: hp(14) + hp(2),
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: hp(5.4),
    marginHorizontal: wp(4),
    marginTop: hp(1.2),
    marginBottom: hp(0.4),
    paddingHorizontal: wp(3.5),
    borderRadius: hp(1.6),
    borderWidth: 1,
    borderColor: colors.cardBorder || colors.border,
    backgroundColor: colors.cardBackground,
    gap: wp(2),
  },
  searchInput: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: Math.min(hp(1.75), wp(3.9)),
    fontWeight: '600',
    paddingVertical: hp(1),
  },
  filterChips: {
    paddingBottom: hp(0.8),
  },
  chatList: {
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
  emptySmartState: {
    marginHorizontal: wp(4),
    marginTop: hp(4),
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
    paddingTop: 4,
    paddingBottom: hp(14),
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginLeft: AVATAR_SIZE + wp(7.5),
  },

  // ── Chat Row (WhatsApp-style) ────────────────
  chatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: hp(1.5),
    paddingHorizontal: wp(4.3),
  },

  // Avatar
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: colors.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.primary,
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
    borderColor: colors.screenColor,
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
    fontSize: wp(4.2),
    fontWeight: theme.typography.fontWeight.medium as any,
    color: colors.textPrimary,
    marginRight: wp(2.1),
  },
  chatNameBold: {
    fontWeight: theme.typography.fontWeight.bold as any,
  },
  chatTime: {
    fontSize: wp(3),
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
    fontSize: wp(3.4),
    color: colors.textTertiary,
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
    color: colors.textOnPrimary,
    fontSize: Math.min(hp(1.5), wp(3.2)),
    fontWeight: theme.typography.fontWeight.bold as any,
  },
  checkContainer: {
    width: wp(6.4),
    alignItems: 'center',
  },
});
