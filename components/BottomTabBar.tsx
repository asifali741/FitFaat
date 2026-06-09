import { theme } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';
import { cachedRequestJson } from '@/utils/apiHelper';
import { authApi } from '@/utils/auth/authApi';
import { tokenStorage } from '@/utils/auth/tokenStorage';
import {
  clearCachedProfileImage,
  buildStableBackendProfileImageUrl,
  getBackendProfileImageUrl,
  getGmailProfileImageUrl,
  getProfileImageUserKey,
  readCachedProfileImage,
  resolveBackendImageUrl,
  writeCachedProfileImage,
} from '@/utils/profileImage';
import { profileImageEvents, type ProfileImageUpdateEvent } from '@/utils/profileImageEvents';
import { Ionicons } from '@expo/vector-icons';
import Constants from "expo-constants";
import { usePathname, useRouter, useSegments } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Image, Keyboard, Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';
import { io, Socket } from 'socket.io-client';
import { isRealtimeSocketEnabled } from '@/utils/config';

type TabType = 'dashboard' | 'chatbot' | 'conference' | 'doctor-portal' | 'profile';

const FAST_READ_CONFIG = {
  timeoutMs: 6000,
  retries: 1,
  retryDelayMs: 500,
  allowStaleOnError: true,
  maxWaitForFreshMs: 1800,
  refreshCacheInBackground: true,
};

export function BottomTabBar() {
  const { colors } = useTheme();
  const styles = useMemo(() => getStyles(colors), [colors]);
  const router = useRouter();
  const pathname = usePathname();
  const segments = useSegments();
  const insets = useSafeAreaInsets();
  const latestProfileImageEvent = profileImageEvents.getLatest();
  const initialProfileImageUrl =
    latestProfileImageEvent && !latestProfileImageEvent.removed
      ? latestProfileImageEvent.displayImageUrl ||
        latestProfileImageEvent.backendImageUrl ||
        latestProfileImageEvent.gmailImageUrl ||
        null
      : null;
  const [isDoctor, setIsDoctor] = useState(false);
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(initialProfileImageUrl);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const unreadRefreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastProfileImageEventAt = useRef(0);
  const profileImageUserKeyRef = useRef<string | null>(null);

  const API_URL = useMemo(() => {
    const ENV = Constants.expoConfig?.extra;
    if (ENV?.EXPO_PUBLIC_BACKEND_API_URL) {
      return ENV.EXPO_PUBLIC_BACKEND_API_URL.replace(/\/api\/?$/, '');
    }
    const defaultHost = Constants.expoConfig?.hostUri?.split(':')[0] || 'localhost';
    return `http://${defaultHost}:5001`;
  }, []);

  useEffect(() => {
    const checkDoctorStatus = async () => {
      try {
        const doctorStatus = await authApi.getDoctorStatus();
        if (doctorStatus.success && doctorStatus.doctor) {
          setIsDoctor(true);
        }
      } catch (error) {
        setIsDoctor(false);
      }
    };

    const fetchProfilePicture = async () => {
      try {
        const fetchStartedAt = Date.now();
        const user = await tokenStorage.getUser();
        profileImageUserKeyRef.current = getProfileImageUserKey(user);
        const cachedProfileImage = await readCachedProfileImage(user);
        const userBackendImageUrl = getBackendProfileImageUrl(API_URL, user);
        const userGmailImageUrl = getGmailProfileImageUrl(user);
        const immediateImageUrl =
          cachedProfileImage?.backendImageUrl ||
          userBackendImageUrl ||
          cachedProfileImage?.gmailImageUrl ||
          userGmailImageUrl;

        const fallbackGmailImageUrl = cachedProfileImage?.gmailImageUrl || userGmailImageUrl;

        if (immediateImageUrl) {
          setProfileImageUrl(immediateImageUrl);
        }

        const token = await tokenStorage.getToken();
        if (token) {
          const cacheUserKey = profileImageUserKeyRef.current || user?._id || user?.id || user?.email || 'current';
          const data = await cachedRequestJson<any>(
            `bottom-tab:profile-picture:${cacheUserKey}`,
            `${API_URL}/api/user/profile-picture`,
            {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${token}`,
              },
            },
            {
              ...FAST_READ_CONFIG,
              cacheTtlMs: 5 * 60 * 1000,
              maxStaleMs: 24 * 60 * 60 * 1000,
            }
          );
          if (fetchStartedAt < lastProfileImageEventAt.current) {
            return;
          }

          if (data.success && data.data?.imageUrl) {
            const versionSeed =
              data.data.updatedAt ||
              data.data.updated_at ||
              data.data.profileImageUpdatedAt ||
              data.data.profilePictureUpdatedAt ||
              null;
            const imageUrl = buildStableBackendProfileImageUrl(
              API_URL,
              resolveBackendImageUrl(API_URL, data.data.imageUrl),
              cachedProfileImage,
              versionSeed
            );
            setProfileImageUrl(imageUrl);
            await writeCachedProfileImage(user, {
              backendImageUrl: imageUrl,
              gmailImageUrl: fallbackGmailImageUrl || null,
            }, imageUrl === cachedProfileImage?.backendImageUrl
              ? cachedProfileImage.updatedAt
              : String(versionSeed || new Date().toISOString()));
          } else if (data.success) {
            setProfileImageUrl(fallbackGmailImageUrl || null);
            if (fallbackGmailImageUrl) {
              await writeCachedProfileImage(user, {
                backendImageUrl: null,
                gmailImageUrl: fallbackGmailImageUrl,
              });
            } else {
              await clearCachedProfileImage(user);
            }
          }
        }
      } catch (error) {
        console.log('Error fetching profile picture:', error);
      }
    };

    const handleProfileImageUpdate = (event?: ProfileImageUpdateEvent) => {
      if (!event) {
        fetchProfilePicture();
        return;
      }

      lastProfileImageEventAt.current = Date.now();
      if (
        event.userKey &&
        profileImageUserKeyRef.current &&
        event.userKey !== profileImageUserKeyRef.current
      ) {
        return;
      }

      setProfileImageUrl(
        event.displayImageUrl ||
        event.backendImageUrl ||
        event.gmailImageUrl ||
        null
      );
    };

    const fetchUnreadCount = async () => {
      try {
        const token = await tokenStorage.getToken();
        const user = await tokenStorage.getUser();
        const cacheUserKey = user?._id || user?.id || user?.userId || 'current';
        if (token) {
          const data = await cachedRequestJson<any>(
            `bottom-tab:unread-count:${cacheUserKey}`,
            `${API_URL}/api/chat/unread-count`,
            {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
            },
            {
              ...FAST_READ_CONFIG,
              cacheTtlMs: 30 * 1000,
              maxStaleMs: 10 * 60 * 1000,
            }
          );

          if (data.success && typeof data.unreadCount === 'number') {
            setUnreadCount(data.unreadCount);
          }
        }
      } catch (error) {
        console.error('Error fetching unread count:', error);
      }
    };

    const scheduleUnreadRefresh = () => {
      if (unreadRefreshTimerRef.current) return;
      unreadRefreshTimerRef.current = setTimeout(() => {
        unreadRefreshTimerRef.current = null;
        fetchUnreadCount();
      }, 900);
    };

    checkDoctorStatus();
    fetchProfilePicture();
    fetchUnreadCount();
    const unsubscribeProfileImage = profileImageEvents.subscribe(handleProfileImageUpdate);

    // Socket events handle most updates; this slower poll keeps badges accurate on poor networks.
    const interval = setInterval(fetchUnreadCount, 60000);

    // Setup socket to get real-time updates for incoming messages
    (async () => {
      try {
        if (!isRealtimeSocketEnabled()) return;

        const token = await tokenStorage.getToken();
        if (!token) return;

        const socket = io(API_URL, {
          transports: ['websocket'],
          auth: { token },
          reconnection: true,
          reconnectionDelay: 1000,
          reconnectionDelayMax: 10000,
          reconnectionAttempts: Infinity,
          randomizationFactor: 0.5,
          timeout: 8000,
        });

        socketRef.current = socket;

        socket.on('connect', () => {
          // Ensure we have the latest count on connect
          fetchUnreadCount();
        });

        socket.on('disconnect', (reason) => {
          // Socket disconnected, will reconnect automatically
        });

        socket.on('connect_error', (error) => {
          // Silently log connection errors, don't show red box
          console.log('[Socket] Connection error (will retry):', error.message);
        });

        // When a new message is broadcasted in an appointment room (server emits 'new-message')
        socket.on('new-message', (payload) => {
          scheduleUnreadRefresh();
        });

        // When the server notifies this specific user about a new message
        socket.on('user-new-message', (payload) => {
          // Use totalUnreadCount for bottom tab badge (total across all appointments)
          if (payload && typeof payload.totalUnreadCount === 'number') {
            setUnreadCount(payload.totalUnreadCount);
          } else if (payload && typeof payload.unreadCount === 'number') {
            // Fallback to per-appointment count - better to refetch for accuracy
            scheduleUnreadRefresh();
          } else {
            scheduleUnreadRefresh();
          }
        });

        // Other events that may affect unread counts
        socket.on('message-status-update', () => {
          scheduleUnreadRefresh();
        });

        socket.on('messages-read', () => {
          scheduleUnreadRefresh();
        });

      } catch (error) {
        console.log('Error setting up chat socket in BottomTabBar:', error);
      }
    })();

    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      () => setKeyboardVisible(true)
    );
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => setKeyboardVisible(false)
    );

    return () => {
      clearInterval(interval);
      if (unreadRefreshTimerRef.current) {
        clearTimeout(unreadRefreshTimerRef.current);
        unreadRefreshTimerRef.current = null;
      }
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
      unsubscribeProfileImage();
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [API_URL]);

  // Determine which tab is active based on segments and pathname
  const activeTab: TabType = useMemo(() => {
    const segmentsStr = segments.join('/');

    // Profile check
    if (segmentsStr.includes('profile') || pathname.includes('/profile')) {
      return 'profile' as const;
    }

    // All-chats check (must come before doctor-portal/conference to avoid conflict)
    if (segmentsStr.includes('all-chats') || pathname.includes('all-chats')) {
      return 'doctor-portal' as const;
    }

    // Doctor portal check
    if (segmentsStr.includes('(doctor-portal)') || pathname.includes('doctor-portal')) {
      return 'doctor-portal' as const;
    }

    // Conference check
    if (segmentsStr.includes('(conference)') || pathname.includes('conference')) {
      return 'conference' as const;
    }

    // Chatbot check
    if (segmentsStr.includes('(chatbot)') || pathname.includes('chatbot') || pathname.includes('/baat')) {
      return 'chatbot' as const;
    }

    // Dashboard check
    if (segmentsStr.includes('(dashboard)') || pathname.includes('dashboard') || pathname === '/(main)' || pathname === '/') {
      return 'dashboard' as const;
    }

    return 'dashboard' as const;
  }, [pathname, segments]);

  const isOnChatTab = useCallback((): boolean => pathname.includes('all-chats'), [pathname]);

  // Function to check if we should show the tab bar
  const shouldShowTabBar = useMemo(() => {
    if (isKeyboardVisible) return false;
    if (pathname.includes('/profile')) return false;

    const segmentsStr = segments.join('/');
    const hiddenTabRouteMarkers = [
      'doctor-report',
      '(doctor-report)',
      'weekly-insights',
      '(weekly-insights)',
      'meal-planner',
      '(meal-planner)',
    ];
    if (
      hiddenTabRouteMarkers.some(
        (marker) => pathname.includes(marker) || segmentsStr.includes(marker)
      )
    ) {
      return false;
    }

    // Define root screens where tab bar should be visible
    const rootPaths = [
      '/(main)/(dashboard)',
      '/(main)/(dashboard)/',
      '/dashboard',
      '/(main)/(conference)',
      '/(main)/(conference)/',
      '/conference',
      '/(main)/(doctor-portal)',
      '/doctor-portal',
      '/(main)/(doctor-portal)/all-chats',
      '/all-chats'
    ];

    // Check if current pathname is in rootPaths or it's just the root
    if (rootPaths.includes(pathname) || pathname === '/' || pathname === '/(main)') {
      return true;
    }

    // Also check segments for index routes
    const lastSegment = String(segments[segments.length - 1] ?? '');
    if (lastSegment === '(dashboard)' || lastSegment === '(conference)' || lastSegment === '(doctor-portal)' || lastSegment === 'index') {
       return true;
    }

    return false;
  }, [isKeyboardVisible, pathname, segments]);

  if (!shouldShowTabBar) {
    return null;
  }

  return (
    <View style={[
      styles.tabBar,
      {
        bottom: insets.bottom > 0 ? insets.bottom + hp(1) : hp(2),
      }
    ]}>
      {/* HeaLora Tab */}
      <TouchableOpacity
        style={[styles.tabItem, activeTab === 'chatbot' && styles.activeTabItem]}
        onPress={() => router.push('/(main)/(chatbot)/baat')}
        activeOpacity={0.7}
      >
        <View style={[styles.pill, activeTab === 'chatbot' && styles.activePill]}>
          <Ionicons
            name="sparkles-outline"
            size={24}
            color={activeTab === 'chatbot' ? colors.primary : colors.textSecondary}
          />
          {activeTab === 'chatbot' && <Text style={styles.pillText} numberOfLines={1}>HeaLora</Text>}
        </View>
      </TouchableOpacity>

      {/* Doctors Tab */}
      <TouchableOpacity
        style={[styles.tabItem, (activeTab === 'conference' || (activeTab === 'doctor-portal' && !isOnChatTab())) && styles.activeTabItem]}
        onPress={() => {
          if (isDoctor) {
            router.push('/(main)/(doctor-portal)');
          } else {
            router.push('/(main)/(conference)');
          }
        }}
        activeOpacity={0.6}
      >
        <View style={[styles.pill, (activeTab === 'conference' || (activeTab === 'doctor-portal' && !isOnChatTab())) && styles.activePill]}>
          <Ionicons
            name={activeTab === 'conference' || (activeTab === 'doctor-portal' && !isOnChatTab()) ? "calendar" : "calendar-outline"}
            size={22}
            color={activeTab === 'conference' || (activeTab === 'doctor-portal' && !isOnChatTab()) ? colors.primary : colors.textSecondary}
          />
          {(activeTab === 'conference' || (activeTab === 'doctor-portal' && !isOnChatTab())) && <Text style={styles.pillText} numberOfLines={1}>Doctors</Text>}
        </View>
      </TouchableOpacity>

      {/* Home Tab */}
      <TouchableOpacity
        style={[styles.tabItem, activeTab === 'dashboard' && styles.activeTabItem]}
        onPress={() => router.push('/(main)/(dashboard)')}
        activeOpacity={0.6}
      >
        <View style={[styles.pill, activeTab === 'dashboard' && styles.activePill]}>
          <Ionicons
            name={activeTab === 'dashboard' ? "home" : "home-outline"}
            size={22}
            color={activeTab === 'dashboard' ? colors.primary : colors.textSecondary}
          />
          {activeTab === 'dashboard' && <Text style={styles.pillText} numberOfLines={1}>Home</Text>}
        </View>
      </TouchableOpacity>

      {/* Chat Tab */}
      <TouchableOpacity
        style={[styles.tabItem, isOnChatTab() && styles.activeTabItem]}
        onPress={() => {
          if (isDoctor) {
            router.push('/(main)/(doctor-portal)/all-chats');
          } else {
            router.push('/(main)/(conference)/all-chats');
          }
        }}
        activeOpacity={0.6}
      >
        <View style={[styles.pill, isOnChatTab() && styles.activePill]}>
          <View style={styles.iconWithBadge}>
            <Ionicons
              name={isOnChatTab() ? "chatbubbles" : "chatbubbles-outline"}
              size={22}
              color={isOnChatTab() ? colors.primary : colors.textSecondary}
            />
            {unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Text>
              </View>
            )}
          </View>
          {isOnChatTab() && <Text style={styles.pillText} numberOfLines={1}>Chats</Text>}
        </View>
      </TouchableOpacity>

      {/* Profile Tab */}
      <TouchableOpacity
        style={[styles.tabItem, activeTab === 'profile' && styles.activeTabItem]}
        onPress={() => router.push('/(main)/profile')}
        activeOpacity={0.6}
      >
        <View style={[styles.pill, activeTab === 'profile' && styles.activePill]}>
          {profileImageUrl ? (
            <Image
              key={profileImageUrl}
              source={{ uri: profileImageUrl }}
              style={[styles.profileImage, activeTab === 'profile' && styles.activeProfileImage]}
              fadeDuration={0}
            />
          ) : (
            <Ionicons
              name={activeTab === 'profile' ? "person" : "person-outline"}
              size={22}
              color={activeTab === 'profile' ? colors.primary : colors.textSecondary}
            />
          )}
          {activeTab === 'profile' && <Text style={styles.pillText} numberOfLines={1}>Profile</Text>}
        </View>
      </TouchableOpacity>
    </View>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    height: hp(8),
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: hp(0.5) },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    position: 'absolute',
    left: wp(4),
    right: wp(4),
    borderRadius: hp(4),
    paddingHorizontal: wp(2),
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tabItem: {
    flex: 1,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeTabItem: {
    flex: 1.8, // Give more space to active tab for the label
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: hp(0.8),
    paddingHorizontal: wp(3),
    borderRadius: hp(3),
    backgroundColor: 'transparent',
  },
  activePill: {
    backgroundColor: colors.primary + '15', // Subtle primary background for pill
  },
  pillText: {
    marginLeft: wp(1.5),
    fontSize: hp(1.6),
    fontWeight: '700',
    color: colors.primary,
  },
  iconWithBadge: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileImage: {
    width: hp(4),
    height: hp(4),
    borderRadius: hp(2),
    backgroundColor: colors.primary + '15',
  },
  activeProfileImage: {
    borderWidth: 2,
    borderColor: colors.primary,
  },
  badge: {
    position: 'absolute',
    top: hp(0.25),
    right: wp(0.5),
    backgroundColor: '#EF4444',
    borderRadius: hp(1.35),
    minWidth: wp(5.9),
    height: hp(2.7),
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.surface,
    elevation: 4,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: hp(0.25) },
    shadowOpacity: 0.4,
    shadowRadius: 3,
  },
  badgeText: {
    color: '#FFF',
    fontSize: Math.min(hp(1.35), wp(3)),
    fontWeight: 'bold',
    textAlign: 'center',
    paddingHorizontal: wp(1.1),
    includeFontPadding: false,
  },
});
