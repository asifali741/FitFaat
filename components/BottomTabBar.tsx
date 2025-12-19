import { authApi } from '@/utils/auth/authApi';
import { tokenStorage } from '@/utils/auth/tokenStorage';
import { Ionicons } from '@expo/vector-icons';
import Constants from "expo-constants";
import { usePathname, useRouter } from "expo-router";
import { useEffect, useRef, useState } from 'react';
import { Image, Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { io, Socket } from 'socket.io-client';
import { colorsSheet } from '../app/(main)/(settings)/_ui_elements';

type TabType = 'dashboard' | 'chatbot' | 'conference' | 'doctor-portal' | 'profile';

export function BottomTabBar() {
  const router = useRouter();
  const pathname = usePathname();
  const [isDoctor, setIsDoctor] = useState(false);
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
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
          console.error('Socket connection error:', error.message);
        });

        // When a new message is broadcasted in an appointment room (server emits 'new-message')
        socket.on('new-message', (payload) => {
          fetchUnreadCount();
        });

        // When the server notifies this specific user about a new message
        socket.on('user-new-message', (payload) => {
          // If server provided unreadCount, update immediately; otherwise, fallback to fetching
          if (payload && typeof payload.unreadCount === 'number') {
            setUnreadCount(payload.unreadCount);
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

    return () => {
      clearInterval(interval);
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []);

  // Determine which tab is active based on pathname
  const getActiveTab = (): TabType => {
    // Profile check
    if (pathname.includes('/profile')) {
      return 'profile' as const;
    }
    
    // All-chats check (must come before doctor-portal/conference to avoid conflict)
    if (pathname.includes('all-chats')) {
      return 'doctor-portal' as const; // Use doctor-portal type for consistency
    }
    
    // Doctor portal check
    if (pathname.includes('doctor-portal')) {
      return 'doctor-portal' as const;
    }
    
    // Conference check
    if (pathname.includes('conference')) {
      return 'conference' as const;
    }
    
    // Chatbot check - be specific to avoid matching "all-chats"
    if (pathname.includes('chatbot') || pathname.includes('/baat')) {
      return 'chatbot' as const;
    }
    
    // Dashboard check
    if (pathname.includes('dashboard') || pathname === '/(main)' || pathname === '/') {
      return 'dashboard' as const;
    }
    
    return 'dashboard' as const;
  };

  const isOnChatTab = (): boolean => {
    return pathname.includes('all-chats');
  };

  const activeTab: TabType = getActiveTab();

  // Hide bottom navigation on chatbot screen
  if (activeTab === 'chatbot') {
    return null;
  }

  return (
    <View style={styles.tabBar}>
      {/* Home Tab */}
      <TouchableOpacity 
        style={styles.tabItem}
        onPress={() => router.push('/(main)/(dashboard)')}
        activeOpacity={0.6}
      >
        <View style={styles.iconContainer}>
          <Ionicons 
            name={activeTab === 'dashboard' ? "home" : "home-outline"} 
            size={24} 
            color={activeTab === 'dashboard' ? colorsSheet.primary : colorsSheet.darkGray}
          />
        </View>
      </TouchableOpacity>

      {/* Chatbot Tab */}
      <TouchableOpacity 
        style={styles.tabItem}
        onPress={() => router.push('/(main)/(chatbot)/baat')}
        activeOpacity={0.7}
      >
        <View style={styles.iconContainer}>
          <Ionicons 
            name="sparkles-outline"
            size={26} 
            color={colorsSheet.darkGray}
          />
        </View>
      </TouchableOpacity>
      
      {/* Appointments/Calendar Tab */}
      <TouchableOpacity 
        style={styles.tabItem}
        onPress={() => {
          if (isDoctor) {
            router.push('/(main)/(doctor-portal)');
          } else {
            router.push('/(main)/(conference)');
          }
        }}
        activeOpacity={0.6}
      >
        <View style={styles.iconContainer}>
          <Ionicons 
            name={activeTab === 'conference' || (activeTab === 'doctor-portal' && !isOnChatTab()) ? "calendar" : "calendar-outline"}
            size={24} 
            color={activeTab === 'conference' || (activeTab === 'doctor-portal' && !isOnChatTab()) ? colorsSheet.primary : colorsSheet.darkGray}
          />
        </View>
      </TouchableOpacity>
      
      {/* Chat Tab - Shows unread count badge */}
      <TouchableOpacity 
        style={styles.tabItem}
        onPress={() => {
          if (isDoctor) {
            router.push('/(main)/(doctor-portal)/all-chats');
          } else {
            router.push('/(main)/(conference)/all-chats');
          }
        }}
        activeOpacity={0.6}
      >
        <View style={styles.iconContainer}>
          <Ionicons 
            name={isOnChatTab() ? "chatbubbles" : "chatbubbles-outline"}
            size={24} 
            color={isOnChatTab() ? colorsSheet.primary : colorsSheet.darkGray}
          />
          {unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {unreadCount > 99 ? '99+' : unreadCount}
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
      
      {/* Profile Tab */}
      <TouchableOpacity 
        style={styles.tabItem}
        onPress={() => router.push('/(main)/profile')}
        activeOpacity={0.6}
      >
        <View style={styles.iconContainer}>
          {profileImageUrl ? (
            <Image 
              source={{ uri: profileImageUrl }}
              style={[styles.profileImage, activeTab === 'profile' && styles.activeProfileImage]}
            />
          ) : (
            <Ionicons 
              name={activeTab === 'profile' ? "person" : "person-outline"} 
              size={24} 
              color={activeTab === 'profile' ? colorsSheet.primary : colorsSheet.darkGray}
            />
          )}
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colorsSheet.white,
    borderTopWidth: 1,
    borderTopColor: colorsSheet.lightGray,
    height: Platform.OS === 'ios' ? 85 : 70,
    paddingBottom: Platform.OS === 'ios' ? 25 : 10,
    paddingTop: 10,
    elevation: 8,
    shadowColor: colorsSheet.black,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  tabItem: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  profileImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  activeProfileImage: {
    borderWidth: 3,
    borderColor: colorsSheet.primary,
  },
  badge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#FF4444',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colorsSheet.white,
  },
  badgeText: {
    color: colorsSheet.white,
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
    paddingHorizontal: 4,
  },
});
