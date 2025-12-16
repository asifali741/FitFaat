import { authApi } from '@/utils/auth/authApi';
import { Ionicons } from '@expo/vector-icons';
import Constants from "expo-constants";
import { usePathname, useRouter } from "expo-router";
import * as SecureStore from 'expo-secure-store';
import { useEffect, useState } from 'react';
import { Image, Platform, StyleSheet, TouchableOpacity, View } from "react-native";
import { colorsSheet } from '../app/(main)/(settings)/_ui_elements';

type TabType = 'dashboard' | 'chatbot' | 'conference' | 'doctor-portal' | 'profile';

export function BottomTabBar() {
  const router = useRouter();
  const pathname = usePathname();
  const [isDoctor, setIsDoctor] = useState(false);
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);

  const API_URL = (() => {
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
        const token = await SecureStore.getItemAsync('authToken');
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

    checkDoctorStatus();
    fetchProfilePicture();
  }, []);

  // Determine which tab is active based on pathname
  const getActiveTab = (): TabType => {
    // Profile check
    if (pathname.includes('/profile')) {
      return 'profile' as const;
    }
    
    // Doctor portal / all-chats check (must come before chatbot to avoid conflict)
    if (pathname.includes('doctor-portal') || pathname.includes('all-chats')) {
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
      
      {/* Appointments/Chats Tab */}
      <TouchableOpacity 
        style={styles.tabItem}
        onPress={() => {
          if (isDoctor) {
            router.push('/(main)/(doctor-portal)/all-chats');
          } else {
            router.push('/(main)/(conference)');
          }
        }}
        activeOpacity={0.6}
      >
        <View style={styles.iconContainer}>
          <Ionicons 
            name={isDoctor 
              ? (activeTab === 'doctor-portal' ? "chatbubbles" : "chatbubbles-outline")
              : (activeTab === 'conference' ? "calendar" : "calendar-outline")
            }
            size={24} 
            color={(activeTab === 'conference' || activeTab === 'doctor-portal') ? colorsSheet.primary : colorsSheet.darkGray}
          />
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
});
