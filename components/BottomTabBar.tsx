import { theme } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';
import { authApi } from '@/utils/auth/authApi';
import { tokenStorage } from '@/utils/auth/tokenStorage';
import { Ionicons } from '@expo/vector-icons';
import Constants from "expo-constants";
import { usePathname, useRouter, useSegments } from "expo-router";
import { useEffect, useRef, useState } from 'react';
import { Image, Keyboard, Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';
import { io, Socket } from 'socket.io-client';

type TabType = 'dashboard' | 'chatbot' | 'conference' | 'doctor-portal' | 'profile';

export function BottomTabBar() {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const router = useRouter();
  const pathname = usePathname();
  const segments = useSegments();
  const insets = useSafeAreaInsets();
  const [isDoctor, setIsDoctor] = useState(false);
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  const API_URL = (() => {
    const ENV = Constants.expoConfig?.extra;
    if (ENV?.EXPO_PUBLIC_BACKEND_API_URL) {
      return ENV.EXPO_PUBLIC_BACKEND_API_URL.replace(/\/api\/?$/, '');
    }
    const defaultHost = Constants.expoConfig?.hostUri?.split(':')[0] || 'localhost';
    return `http://${defaultHost}:5001`;
  })();

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
        const token = await tokenStorage.getToken();
        if (token) {
          const response = await fetch(`${API_URL}/api/user/profile-picture`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });

          if (response.ok) {
            const data = await response.json();
            if (data.success && data.data.imageUrl) {
              setProfileImageUrl(`${API_URL}${data.data.imageUrl}`);
            }
          }
        }
      } catch (error) {
        console.log('Error fetching profile picture:', error);
      }
    };

    const fetchUnreadCount = async () => {
      try {
        const token = await tokenStorage.getToken();
        if (token) {
          const response = await fetch(`${API_URL}/api/chat/unread-count`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });

          if (response.ok) {
            const data = await response.json();
            if (data.success && typeof data.unreadCount === 'number') {
              setUnreadCount(data.unreadCount);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching unread count:', error);
      }
    };

    checkDoctorStatus();
    fetchProfilePicture();
    fetchUnreadCount();

    // Refresh unread count every 30 seconds
    const interval = setInterval(fetchUnreadCount, 30000);

    // Setup socket to get real-time updates for incoming messages
    (async () => {
      try {
        const token = await tokenStorage.getToken();
        if (!token) return;

        const socket = io(API_URL, {
          transports: ['websocket'],
          auth: { token },
          reconnection: true,
          reconnectionDelay: 1000,
          reconnectionDelayMax: 5000,
          reconnectionAttempts: Infinity,
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
          fetchUnreadCount();
        });

        // When the server notifies this specific user about a new message
        socket.on('user-new-message', (payload) => {
          // Use totalUnreadCount for bottom tab badge (total across all appointments)
          if (payload && typeof payload.totalUnreadCount === 'number') {
            setUnreadCount(payload.totalUnreadCount);
          } else if (payload && typeof payload.unreadCount === 'number') {
            // Fallback to per-appointment count - better to refetch for accuracy
            fetchUnreadCount();
          } else {
            fetchUnreadCount();
          }
        });

        // Other events that may affect unread counts
        socket.on('message-status-update', () => {
          fetchUnreadCount();
        });

        socket.on('messages-read', () => {
          fetchUnreadCount();
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
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []);

  // Determine which tab is active based on segments and pathname
  const getActiveTab = (): TabType => {
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
  };

  const isOnChatTab = (): boolean => {
    return pathname.includes('all-chats');
  };

  const activeTab: TabType = getActiveTab();

  // Function to check if we should show the tab bar
  const shouldShowTabBar = () => {
    if (isKeyboardVisible) return false;
    if (pathname.includes('/profile')) return false;

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
  };

  if (!shouldShowTabBar()) {
    return null;
  }

  return (
    <View style={[
      styles.tabBar,
      {
        bottom: insets.bottom > 0 ? insets.bottom + hp(1) : hp(2),
      }
    ]}>
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

      {/* Chatbot Tab */}
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

      {/* Appointments Tab */}
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
          {(activeTab === 'conference' || (activeTab === 'doctor-portal' && !isOnChatTab())) && <Text style={styles.pillText} numberOfLines={1}>Booking</Text>}
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
              source={{ uri: profileImageUrl }}
              style={[styles.profileImage, activeTab === 'profile' && styles.activeProfileImage]}
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
    width: hp(3.5),
    height: hp(3.5),
    borderRadius: hp(1.75),
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
