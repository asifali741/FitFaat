import { useTheme } from "@/contexts/ThemeContext";
import { cachedRequestJson, isRequestAbortError } from "@/utils/apiHelper";
import { authApi } from "@/utils/auth/authApi";
import { tokenStorage } from "@/utils/auth/tokenStorage";
import { Ionicons } from "@expo/vector-icons";
import {
    DrawerContentComponentProps,
    DrawerItem
} from "@react-navigation/drawer";
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
import {
  clearCachedProfileImage,
  buildStableBackendProfileImageUrl,
  getBackendProfileImageUrl,
  getGmailProfileImageUrl,
  getProfileImageUserKey,
  readCachedProfileImage,
  writeCachedProfileImage,
} from "@/utils/profileImage";
import { profileImageEvents, type ProfileImageUpdateEvent } from '@/utils/profileImageEvents';
type DrawerSceneWrapperProps = DrawerContentComponentProps & {
  onDrawerStatusChange?: (isOpen: boolean) => void;
};

const DRAWER_READ_CONFIG = {
  timeoutMs: 7000,
  retries: 1,
  retryDelayMs: 500,
  cacheTtlMs: 5 * 60 * 1000,
  maxStaleMs: 24 * 60 * 60 * 1000,
  allowStaleOnError: true,
  maxWaitForFreshMs: 2200,
  refreshCacheInBackground: true,
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
  const { navigation, onDrawerStatusChange, state } = props;
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const [userName, setUserName] = useState('User');
  const [userEmail, setUserEmail] = useState('user@example.com');
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);
  const [gmailImageUrl, setGmailImageUrl] = useState<string | null>(null);
  const [isDoctor, setIsDoctor] = useState(false);
  const lastProfileImageEventAt = useRef(0);
  const profileImageUserKeyRef = useRef<string | null>(null);
  const displayImageUrl = profileImageUrl || gmailImageUrl;
  
  useEffect(() => {
    fetchUserData();
    checkDoctorStatus();
  }, []);

  useEffect(() => {
    const drawerNavigation = navigation as any;
    const unsubscribeOpen = drawerNavigation.addListener?.('drawerOpen', () => {
      onDrawerStatusChange?.(true);
    });
    const unsubscribeClose = drawerNavigation.addListener?.('drawerClose', () => {
      onDrawerStatusChange?.(false);
    });

    return () => {
      unsubscribeOpen?.();
      unsubscribeClose?.();
    };
  }, [navigation, onDrawerStatusChange]);

  // Re-fetch user data (including profile image) when it changes
  useEffect(() => {
    const handleProfileImageUpdate = (event?: ProfileImageUpdateEvent) => {
      if (!event) {
        fetchUserData();
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

      if (event.removed) {
        setProfileImageUrl(null);
        setGmailImageUrl(event.gmailImageUrl || null);
        return;
      }

      setProfileImageUrl(event.displayImageUrl || event.backendImageUrl || null);
      setGmailImageUrl(event.gmailImageUrl || null);
    };

    const unsubscribe = profileImageEvents.subscribe(handleProfileImageUpdate);
    return unsubscribe;
  }, []);

  useEffect(() => {
    const unsubscribe = (navigation as any).addListener?.('drawerOpen', () => {
      fetchUserData();
    });
    return unsubscribe;
  }, [navigation]);

  const checkDoctorStatus = async () => {
    try {
      const token = await SecureStore.getItemAsync('fitfaat_auth_token');
      if (!token) return;

      const API_URL = getAPIURL();
      const baseURL = API_URL;

      const storedUser = await tokenStorage.getUser();
      const cacheUserKey = storedUser?._id || storedUser?.id || storedUser?.userId || 'current';
      const result = await cachedRequestJson<any>(
        `drawer:doctor-status:${cacheUserKey}`,
        `${baseURL}/api/doctors/status`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        },
        DRAWER_READ_CONFIG
      );

      console.log('Drawer - Doctor Status:', result);
      if (result.success && result.doctor) {
        setIsDoctor(true);
        console.log('Drawer - User is doctor:', result.doctor.name);
      }
    } catch (error) {
      console.log('Drawer - Not a doctor or error:', error);
    }
  };

  const fetchUserData = async () => {
    try {
      const fetchStartedAt = Date.now();
      const storedUser = await tokenStorage.getUser();
      let cachedProfileImage = null as Awaited<ReturnType<typeof readCachedProfileImage>>;
      if (storedUser) {
        profileImageUserKeyRef.current = getProfileImageUserKey(storedUser);
        setUserName(storedUser.userInfo?.name || storedUser.name || storedUser.username || 'User');
        setUserEmail(storedUser.email || 'user@example.com');
        cachedProfileImage = await readCachedProfileImage(storedUser);
        setProfileImageUrl(
          cachedProfileImage
            ? cachedProfileImage.backendImageUrl
            : getBackendProfileImageUrl(getAPIURL(), storedUser)
        );
        setGmailImageUrl(cachedProfileImage?.gmailImageUrl || getGmailProfileImageUrl(storedUser));
      }

      const token = await SecureStore.getItemAsync('fitfaat_auth_token');
      
      if (!token) {
        return;
      }

      const API_URL = getAPIURL();
      const baseURL = API_URL;

      const cacheUserKey = storedUser?._id || storedUser?.id || storedUser?.userId || 'current';
      const result = await cachedRequestJson<any>(
        `drawer:user-profile:${cacheUserKey}`,
        `${baseURL}/api/user/profile`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        },
        DRAWER_READ_CONFIG
      );

      // Handle the response structure with success flag
      if (result.success && result.data && result.data.user) {
        const data = result.data.user;
        setUserName(data.userInfo?.name || data.name || data.username || 'User');
        setUserEmail(data.email || 'user@example.com');
        if (fetchStartedAt < lastProfileImageEventAt.current) {
          return;
        }

        const backendImageUrl = getBackendProfileImageUrl(baseURL, data);
        const gmailImageUrl = getGmailProfileImageUrl(data) || getGmailProfileImageUrl(storedUser);
        const latestCachedProfileImage = await readCachedProfileImage(data || storedUser);
        const hasProfileImageDecision = !!latestCachedProfileImage;

        setGmailImageUrl(latestCachedProfileImage?.gmailImageUrl || gmailImageUrl);

        // Fetch profile image if available
        if (hasProfileImageDecision) {
          setProfileImageUrl(latestCachedProfileImage.backendImageUrl);
          return;
        }

        if (backendImageUrl) {
          const versionSeed =
            data.profileImageUpdatedAt ||
            data.profilePictureUpdatedAt ||
            data.updatedAt ||
            data.updated_at ||
            result?.data?.updatedAt ||
            result?.data?.updated_at ||
            null;
          const imageUrl = buildStableBackendProfileImageUrl(
            baseURL,
            backendImageUrl,
            latestCachedProfileImage,
            versionSeed
          );
          setProfileImageUrl(imageUrl);
          await writeCachedProfileImage(data || storedUser, {
            backendImageUrl: imageUrl,
            gmailImageUrl,
          }, String(versionSeed || new Date().toISOString()));
        } else {
          setProfileImageUrl(null);
          if (gmailImageUrl) {
            await writeCachedProfileImage(data || storedUser, {
              backendImageUrl: null,
              gmailImageUrl,
            });
          } else {
            await clearCachedProfileImage(data || storedUser);
          }
        }
      }
    } catch (error) {
      if (!isRequestAbortError(error)) {
        console.log('[Drawer] Using saved profile data:', error);
      }
    }
  };
  
  const handleProfilePress = () => {
    navigation.navigate('profile');
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
    const currentRoute = state.routeNames[state.index];
    return currentRoute === routeName;
  };

  // Helper function to check if we're in exercises section
  const isExercisesActive = () => {
    const currentRoute = state.routeNames[state.index];
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
          onPress={() => navigation.navigate('(dashboard)')}
          labelStyle={drawerLabelStyle}
          style={drawerItemStyle(isRouteActive('(dashboard)') && !isChartsActive())}
        />
        <DrawerItem
          label="HeaLora"
          onPress={() => navigation.navigate('(chatbot)')}
          labelStyle={drawerLabelStyle}
          style={drawerItemStyle(isRouteActive('(chatbot)'))}
        />
        {!isDoctor && (
          <DrawerItem
            label="Doctors"
            onPress={() => navigation.navigate('(conference)')}
            labelStyle={drawerLabelStyle}
            style={drawerItemStyle(isRouteActive('(conference)'))}
          />
        )}
        <DrawerItem
          label="Workouts 👑"
          onPress={() => navigation.navigate('(exercises)/workout')}
          labelStyle={drawerLabelStyle}
          style={drawerItemStyle(isExercisesActive())}
        />
        <DrawerItem
          label="Settings"
          onPress={() => navigation.navigate('(settings)')}
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
      await authApi.logout();
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
