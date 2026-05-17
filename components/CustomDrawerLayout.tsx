import { useTheme } from "@/contexts/ThemeContext";
import { tokenStorage } from "@/utils/auth/tokenStorage";
import { Ionicons } from "@expo/vector-icons";
import {
    DrawerContentComponentProps,
    DrawerItem
} from "@react-navigation/drawer";
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { usePathname, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Image, Pressable, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring,
} from "react-native-reanimated";
import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from "react-native-responsive-screen";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { getBackendBaseUrl } from '@/utils/config';
import { getGmailProfileImageUrl, resolveBackendImageUrl } from "@/utils/profileImage";
import { profileImageEvents } from '@/utils/profileImageEvents';
type DrawerSceneWrapperProps = DrawerContentComponentProps & {
  onDrawerStatusChange?: (isOpen: boolean) => void;
};

const getAPIURL = () => {
  return getBackendBaseUrl();
};

const AnimatedLogoutLetter = ({
  letter,
  isActive,
  textStyle,
}: {
  letter: string;
  isActive: boolean;
  textStyle: any;
}) => {
  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = withSpring(isActive ? 1.5 : 1, {
      damping: 6,
      stiffness: 200,
    });
  }, [isActive, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.Text style={[textStyle, animatedStyle]}>{letter}</Animated.Text>
  );
};

export function DrawerSceneWrapper(props: DrawerSceneWrapperProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();
  const [userName, setUserName] = useState('User');
  const [userEmail, setUserEmail] = useState('user@example.com');
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);
  const [gmailImageUrl, setGmailImageUrl] = useState<string | null>(null);
  const [isDoctor, setIsDoctor] = useState(false);
  const displayImageUrl = gmailImageUrl || profileImageUrl;
  
  useEffect(() => {
    fetchUserData();
    checkDoctorStatus();
  }, []);

  useEffect(() => {
    const navigation = props.navigation as any;
    const unsubscribeOpen = navigation.addListener?.('drawerOpen', () => {
      props.onDrawerStatusChange?.(true);
    });
    const unsubscribeClose = navigation.addListener?.('drawerClose', () => {
      props.onDrawerStatusChange?.(false);
    });

    return () => {
      unsubscribeOpen?.();
      unsubscribeClose?.();
    };
  }, [props.navigation, props.onDrawerStatusChange]);

  // Re-fetch user data (including profile image) when it changes
  useEffect(() => {
    const unsubscribe = profileImageEvents.subscribe(() => {
      fetchUserData();
    });
    return unsubscribe;
  }, []);

  const checkDoctorStatus = async () => {
    try {
      const token = await SecureStore.getItemAsync('fitfaat_auth_token');
      if (!token) return;

      const API_URL = getAPIURL();
      const baseURL = API_URL;

      const response = await fetch(`${baseURL}/api/doctors/status`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Drawer - Doctor Status:', result);
        if (result.success && result.doctor) {
          setIsDoctor(true);
          console.log('Drawer - User is doctor:', result.doctor.name);
        }
      }
    } catch (error) {
      console.log('Drawer - Not a doctor or error:', error);
    }
  };

  const fetchUserData = async () => {
    try {
      console.log('=== Drawer: Fetching user data ===');

      const token = await SecureStore.getItemAsync('fitfaat_auth_token');
      console.log('Backend token:', token ? `Found (${token.substring(0, 20)}...)` : 'Not found');

      const storedUser = await tokenStorage.getUser();
      if (storedUser) {
        setUserName(storedUser.userInfo?.name || storedUser.name || storedUser.username || 'User');
        setUserEmail(storedUser.email || 'user@example.com');
        setGmailImageUrl(getGmailProfileImageUrl(storedUser));
      }
      
      if (!token) {
        console.log('No token found, using defaults');
        return;
      }

      const API_URL = getAPIURL();
      const baseURL = API_URL;
      console.log('Base URL:', baseURL);
      console.log('Fetching from:', `${baseURL}/api/user/profile`);

      // Fetch user profile data
      const response = await fetch(`${baseURL}/api/user/profile`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('Backend response status:', response.status);
      const responseText = await response.text();
      console.log('Backend response text:', responseText);

      if (response.ok) {
        const result = JSON.parse(responseText);
        console.log('Backend user result:', JSON.stringify(result, null, 2));
        
        // Handle the response structure with success flag
        if (result.success && result.data && result.data.user) {
          const data = result.data.user;
          console.log('Setting user data from backend:', data.username, data.email);
          setUserName(data.userInfo?.name || data.name || data.username || 'User');
          setUserEmail(data.email || 'user@example.com');
          setGmailImageUrl(getGmailProfileImageUrl(data) || getGmailProfileImageUrl(storedUser));
          
          // Fetch profile image if available
          if (data.profileImage) {
            const imageUrl = resolveBackendImageUrl(baseURL, data.profileImage);
            console.log('Setting profile image URL:', imageUrl);
            setProfileImageUrl(imageUrl);
          } else {
            setProfileImageUrl(null);
          }
        } else {
          console.log('Response does not have success=true or no data.user');
        }
      } else {
        console.log('Response not OK, status:', response.status);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack');
    }
  };
  
  const handleProfilePress = () => {
    props.navigation.navigate('profile');
  };

  const handleProfileImageError = () => {
    if (displayImageUrl === gmailImageUrl) {
      setGmailImageUrl(null);
    } else {
      setProfileImageUrl(null);
    }
  };

  // Helper function to check if route is active
  const isRouteActive = (routeName: string) => {
    const currentRoute = props.state.routeNames[props.state.index];
    return currentRoute === routeName;
  };

  // Helper function to check if we're in exercises section
  const isExercisesActive = () => {
    const currentRoute = props.state.routeNames[props.state.index];
    return currentRoute === '(exercises)/workout' || currentRoute.startsWith('(exercises)');
  };

  const isChartsActive = () => pathname.includes('/charts');

  const styles = getStyles(colors, insets.bottom);
  const drawerLabelStyle = {
    marginLeft: wp(1.8),
    fontSize: Math.min(hp(1.95), wp(4.35)),
    fontFamily: "PoppinsMedium500",
    color: colors.textOnPrimary,
    lineHeight: Math.min(hp(2.55), wp(5.7)),
  };
  const drawerItemStyle = (isActive: boolean) => ({
    marginHorizontal: wp(3),
    marginVertical: hp(0.12),
    borderRadius: Math.min(wp(6), hp(3)),
    paddingHorizontal: wp(4.2),
    paddingVertical: hp(0.28),
    minHeight: Math.min(hp(5.2), wp(12)),
    backgroundColor: isActive ? colors.drawerActiveTabColor : 'transparent',
    justifyContent: 'center' as const,
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.drawerBackground }}>
      {/* Top Part */}
      <TouchableOpacity style={styles.userContainer} onPress={handleProfilePress}>
        {displayImageUrl ? (
          <Image
            source={{ uri: displayImageUrl }}
            style={styles.userImage}
            onError={handleProfileImageError}
          />
        ) : (
          <View style={[styles.userImage, styles.userImagePlaceholder]}>
            <Ionicons name="person" size={Math.min(wp(7.5), hp(3.8))} color={colors.textSecondary} />
          </View>
        )}
        <View style={styles.userInfo}>
          <Text
            style={styles.userName}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {userName}
          </Text>
          <Text
            style={styles.userEmail}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {userEmail}
          </Text>
        </View>
      </TouchableOpacity>

      {/* Drawer Items */}
      <View style={styles.drawerItems}>
        <DrawerItem
          label="Dashboard"
          onPress={() => props.navigation.navigate('(dashboard)')}
          labelStyle={drawerLabelStyle}
          style={drawerItemStyle(isRouteActive('(dashboard)') && !isChartsActive())}
        />
        <DrawerItem
          label="Progress Charts"
          onPress={() => router.push('/(main)/(dashboard)/charts')}
          labelStyle={drawerLabelStyle}
          style={drawerItemStyle(isChartsActive())}
        />
        <DrawerItem
          label="Chatbot"
          onPress={() => props.navigation.navigate('(chatbot)')}
          labelStyle={drawerLabelStyle}
          style={drawerItemStyle(isRouteActive('(chatbot)'))}
        />
        {!isDoctor && (
          <DrawerItem
            label="Conference"
            onPress={() => props.navigation.navigate('(conference)')}
            labelStyle={drawerLabelStyle}
            style={drawerItemStyle(isRouteActive('(conference)'))}
          />
        )}
        <DrawerItem
          label="Workouts 👑"
          onPress={() => props.navigation.navigate('(exercises)/workout')}
          labelStyle={drawerLabelStyle}
          style={drawerItemStyle(isExercisesActive())}
        />
        <DrawerItem
          label="Settings"
          onPress={() => props.navigation.navigate('(settings)')}
          labelStyle={drawerLabelStyle}
          style={drawerItemStyle(isRouteActive('(settings)'))}
        />
      </View>

      {/* Bottom Part */}
      <Logout_Button/>
      
    </SafeAreaView>
  );
}

const Logout_Button = () => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const baseText = "Logout".split(""); // Array of letters
  const [activeIndex, setActiveIndex] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const handleLongPress = () => {
    if (intervalRef.current) return;
    intervalRef.current = setInterval(() => {
      setActiveIndex((prev) => {
        const next = (prev + 1) % baseText.length;
        return next;
      });
    }, 200);
  };

  const handlePressOut = async () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setActiveIndex(0);

    try {
      console.log("Logging out user");
      await tokenStorage.clearAll();
      await SecureStore.deleteItemAsync('fitfaat_user_data');
      await AsyncStorage.removeItem('weeklyTrackingId');
      router.replace('/(auth)');
    } catch (err) {
      console.error("Error signing out:", err);
    }
  };

  const styles = getStyles(colors, insets.bottom);

  return (
    <Pressable
      style={styles.logoutButton}
      onLongPress={handleLongPress}
      onPressOut={handlePressOut}
    >
      <Ionicons name="log-out" size={Math.min(hp(3), wp(6.4))} color={colors.textOnPrimary} />
      <View style={styles.logoutTextRow}>
        {baseText.map((letter, i) => (
          <AnimatedLogoutLetter
            key={`${letter}-${i}`}
            letter={letter}
            isActive={activeIndex === i}
            textStyle={styles.logoutText}
          />
        ))}
      </View>
    </Pressable>
  );
};


const getStyles = (colors: any, bottomInset = 0) => StyleSheet.create({
  userContainer: {
  flexDirection: "row",
  alignItems: "center",
  paddingVertical: hp(1.25),
  paddingHorizontal: wp(3.4),
  marginHorizontal: wp(3),
  marginTop: hp(0.35),
  backgroundColor: colors.cardBackground,
  borderBottomWidth: 1,
  borderBottomColor: colors.cardBorder,
  borderRadius: Math.min(wp(6), hp(3)),
  marginBottom: Math.min(hp(2.4), wp(5.4)),
  minHeight: Math.min(hp(10.8), wp(23)),
},

userInfo: {
  flex: 1,
  minWidth: 0,
},

userName: {
  fontSize: Math.min(hp(1.95), wp(4.25)),
  lineHeight: Math.min(hp(2.55), wp(5.5)),
  fontWeight: "600",
  color: colors.textPrimary,
},

userEmail: {
  fontSize: Math.min(hp(1.55), wp(3.5)),
  lineHeight: Math.min(hp(2.1), wp(4.6)),
  color: colors.textSecondary,
  marginTop: hp(0.15),
},

  userImage: {
    width: Math.min(wp(13.5), hp(6.8)),
    height: Math.min(wp(13.5), hp(6.8)),
    borderRadius: Math.min(wp(6.75), hp(3.4)),
    marginRight: wp(2.8),
    borderWidth: 2,
    borderColor: colors.cardBorder,
  },
  userImagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
  },
  drawerItems: {
    flex: 1,
    paddingTop: hp(0.35),
    paddingBottom: hp(0.4),
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: Math.min(hp(5.5), wp(12.5)),
    paddingVertical: hp(0.9),
    paddingHorizontal: wp(3.6),
    marginHorizontal: wp(3),
    marginTop: hp(0.45),
    marginBottom: bottomInset + hp(1.6),
    backgroundColor: colors.error,
    borderRadius: Math.min(wp(6), hp(3)),
    justifyContent: "center",
    alignSelf: 'stretch',
  },
  logoutTextRow: {
    flexDirection: "row",
    marginLeft: wp(1.5),
  },
  logoutText: {
    color: colors.white,
    fontSize: Math.min(hp(2), wp(4.3)),
    fontWeight: "600",
    marginLeft: wp(0.4),
  },
});
