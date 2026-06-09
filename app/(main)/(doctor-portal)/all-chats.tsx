import AppHeader from '@/components/AppHeader';
import AnimatedPressable from '@/components/common/AnimatedPressable';
import FilterChips from '@/components/common/FilterChips';
import SmartEmptyState from '@/components/common/SmartEmptyState';
import StatusNoticeBanner from '@/components/common/StatusNoticeBanner';
import { theme } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';
import { cachedRequestJson } from '@/utils/apiHelper';
import { authApi } from '@/utils/auth/authApi';
import { getApiErrorMessage, isForbiddenRouteError, isSessionExpiredError } from '@/utils/auth/authErrors';
import { tokenStorage } from '@/utils/auth/tokenStorage';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList, RefreshControl, StyleSheet,
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

const DOCTOR_CHATS_CACHE_KEY = 'doctorPortalChatsAppointments';
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
  return getApiErrorMessage(error, 'Failed to load appointments');
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
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [usingCachedChats, setUsingCachedChats] = useState(false);
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
        appointment.userName,
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

  // ── Data fetching ──────────────────────────────────────────────────────

  const fetchUnreadMap = useCallback(async (): Promise<{ [key: string]: number }> => {
    try {
      const token = await tokenStorage.getToken();
      if (!token) return {};
      const API_URL = getBackendBaseUrl();
      const user = await tokenStorage.getUser();
      const cacheUserKey = user?._id || user?.id || user?.userId || 'doctor';
      const cachedData = await cachedRequestJson<any>(
        `doctor-chats:unread-by-appointment:${cacheUserKey}`,
        `${API_URL}/api/chat/unread-by-appointment`,
        { method: 'GET', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } },
        CHAT_LIST_READ_CONFIG
      );
      console.log('[DoctorChats] unread-by-appointment response:', JSON.stringify(cachedData.unreadByAppointment || {}));
      return cachedData.unreadByAppointment || {};
      /* const resp = await fetch(`${API_URL}/api/chat/unread-by-appointment`, { method: 'GET', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } });
      if (!resp.ok) { console.log('⚠️ [DoctorChats] unread-by-appointment API failed:', resp.status); return {}; }
      const data = await resp.json();
      console.log('📊 [DoctorChats] unread-by-appointment API response:', JSON.stringify(data.unreadByAppointment || {}));
      return data.unreadByAppointment || {}; */
    } catch (e) { console.log('⚠️ [DoctorChats] fetchUnreadMap error:', e); return {}; }
  }, []);

  const fetchAppointments = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    setUsingCachedChats(false);
    try {
      const doctorStatusResponse = await authApi.getDoctorStatus();
      if (!doctorStatusResponse.success || !doctorStatusResponse.doctor) {
        Alert.alert('Error', 'You need to register as a doctor first');
        try { if (navigation && (navigation as any).canGoBack && (navigation as any).canGoBack()) { (navigation as any).goBack(); return; } } catch (_e) {}
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
        await AsyncStorage.setItem(DOCTOR_CHATS_CACHE_KEY, JSON.stringify(confirmedAppointments));
      }
    } catch (error) {
      const message = getErrorMessage(error);
      if (isSessionExpiredError(error)) {
        console.log('[DoctorChats] Unauthorized appointment fetch:', message);
        setAppointments([]);
        await tokenStorage.clearAll();
        Alert.alert('Session expired', 'Please sign in again.', [
          { text: 'OK', onPress: () => router.replace('/(auth)') },
        ]);
      } else if (isForbiddenRouteError(error)) {
        console.log('[DoctorChats] Forbidden appointment fetch:', message);
        setAppointments([]);
        Alert.alert('Access denied', 'You need to register as a doctor first.', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      } else {
        console.log('Failed to fetch appointments:', error);
        setLoadError('Failed to refresh patient chats. Please check your connection and retry.');
        try {
          const cached = await AsyncStorage.getItem(DOCTOR_CHATS_CACHE_KEY);
          const parsed = cached ? JSON.parse(cached) : [];
          if (Array.isArray(parsed) && parsed.length > 0) {
            setAppointments(parsed);
            setUsingCachedChats(true);
          } else {
            setAppointments([]);
          }
        } catch {
          setAppointments([]);
        }
      }
    } finally {
      setIsLoading(false);
    }
  }, [fetchUnreadMap, navigation, router]);

  const fetchUnreadMessages = useCallback(async () => {
    try {
      const map = await fetchUnreadMap();
      setUnreadMessages(map);
    } catch (error) {
      console.log('Error fetching unread messages:', error);
    }
  }, [fetchUnreadMap]);

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
      <AnimatedPressable
        style={styles.chatRow}
        onPress={() => openChat(item._id)}
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
      </AnimatedPressable>
    );
  };

  useEffect(() => {
    fetchAppointments();
    fetchUnreadMessages();
  }, [fetchAppointments, fetchUnreadMessages]);

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
        {loadError ? (
          <StatusNoticeBanner
            tone={usingCachedChats ? 'cached' : 'offline'}
            title={usingCachedChats ? 'Showing Cached Chats' : 'Could Not Refresh Chats'}
            message={usingCachedChats
              ? 'Latest refresh failed, so this list is using saved chat data.'
              : loadError}
            actionLabel="Retry"
            onAction={fetchAppointments}
            colors={colors}
            style={styles.noticeBanner}
          />
        ) : null}

        <View style={styles.searchWrap}>
          <Ionicons name="search" size={20} color={colors.textSecondary} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search patient chats"
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
            ? 'Confirmed patient appointments will appear here with chat access.'
            : 'Try another status, clear search, or check a different patient name.'}
          colors={colors}
          style={styles.emptySmartState}
        />
      ) : (
        <FlatList
          data={visibleAppointments}
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
  noticeBanner: {
    marginHorizontal: wp(4),
    marginTop: hp(1.2),
    marginBottom: hp(0.2),
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
