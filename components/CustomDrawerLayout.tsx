import { useTheme } from "@/contexts/ThemeContext";
import { useAuth, useUser } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import {
    DrawerContentComponentProps,
    DrawerItem
} from "@react-navigation/drawer";
import * as SecureStore from 'expo-secure-store';
import { useEffect, useRef, useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
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
import { DrawerFonts } from "../app/(main)/(settings)/_ui_elements";
import { getBackendBaseUrl } from '@/utils/config';
type DrawerSceneWrapperProps = DrawerContentComponentProps;

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
  const { user } = useUser(); // Get Clerk user
  const [userName, setUserName] = useState('User');
  const [userEmail, setUserEmail] = useState('user@example.com');
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);
  const [isDoctor, setIsDoctor] = useState(false);
  const [doctorName, setDoctorName] = useState('');
  
  useEffect(() => {
    fetchUserData();
    checkDoctorStatus();
  }, [user]);

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
          setDoctorName(result.doctor.name || 'Doctor');
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
      console.log('Clerk user object:', JSON.stringify(user, null, 2));
      console.log('Clerk user exists:', !!user);
      
      // Check if user is logged in with Clerk
      if (user) {
        console.log('Using Clerk user data');
        console.log('Clerk firstName:', user.firstName);
        console.log('Clerk username:', user.username);
        console.log('Clerk email:', user.primaryEmailAddress?.emailAddress);
        console.log('Clerk imageUrl:', user.imageUrl);
        
        const name = user.firstName || user.username || 'User';
        const email = user.primaryEmailAddress?.emailAddress || 'user@example.com';
        const imageUrl = user.imageUrl || null;
        
        console.log('Setting Clerk data - Name:', name, 'Email:', email);
        setUserName(name);
        setUserEmail(email);
        setProfileImageUrl(imageUrl);
        return;
      }

      console.log('No Clerk user, checking backend token');
      // Otherwise, fetch from backend for email/password users
      const token = await SecureStore.getItemAsync('fitfaat_auth_token');
      console.log('Backend token:', token ? `Found (${token.substring(0, 20)}...)` : 'Not found');
      
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
          setUserName(data.username || 'User');
          setUserEmail(data.email || 'user@example.com');
          
          // Fetch profile image if available
          if (data.profileImage) {
            const imageUrl = `${baseURL}/uploads/profiles/${data.profileImage}`;
            console.log('Setting profile image URL:', imageUrl);
            setProfileImageUrl(imageUrl);
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

  const styles = getStyles(colors, insets.bottom);
  const drawerLabelStyle = {
    marginLeft: wp(2),
    fontSize: Math.min(hp(2.2), wp(4.8)),
    fontFamily: "PoppinsMedium500",
    color: colors.textOnPrimary,
  };
  const drawerItemStyle = (isActive: boolean) => ({
    marginHorizontal: wp(3.2),
    marginVertical: hp(0.2),
    borderRadius: wp(6.5),
    paddingHorizontal: wp(5),
    paddingVertical: hp(1),
    minHeight: hp(5.6),
    backgroundColor: isActive ? colors.drawerActiveTabColor : 'transparent',
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.drawerBackground }}>
      {/* Top Part */}
      <TouchableOpacity style={styles.userContainer} onPress={handleProfilePress}>
        <Image 
          source={profileImageUrl ? { uri: profileImageUrl } : require("../assets/images/Default_Profile.png")} 
          style={styles.userImage} 
        />
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
      <ScrollView
        style={styles.drawerItems}
        contentContainerStyle={styles.drawerItemsContent}
        showsVerticalScrollIndicator={false}
      >
        <DrawerItem
          label="Dashboard"
          onPress={() => props.navigation.navigate('(dashboard)')}
          labelStyle={drawerLabelStyle}
          style={drawerItemStyle(isRouteActive('(dashboard)'))}
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
          label={isDoctor && doctorName ? `Dr. ${doctorName} 👨‍⚕️` : "Join as Doctor 👨‍⚕️"}
          onPress={() => props.navigation.navigate('(doctor-portal)')}
          labelStyle={drawerLabelStyle}
          style={drawerItemStyle(isRouteActive('(doctor-portal)'))}
        />
        <DrawerItem
          label="Settings"
          onPress={() => props.navigation.navigate('(settings)')}
          labelStyle={drawerLabelStyle}
          style={drawerItemStyle(isRouteActive('(settings)'))}
        />
      </ScrollView>

      {/* Bottom Part */}
      <Logout_Button/>
      
    </SafeAreaView>
  );
}

const Logout_Button = () => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { signOut } = useAuth();
  const { user } = useUser();
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
      // Check if user is logged in with Clerk
      if (user) {
        console.log("Logging out Clerk user");
        await signOut();
        console.log("Clerk user signed out successfully");
      } else {
        // Backend email/password user - clear token and navigate to auth
        console.log("Logging out backend user");
        await SecureStore.deleteItemAsync('fitfaat_auth_token');
        await SecureStore.deleteItemAsync('fitfaat_user_data');
        console.log("Backend user signed out successfully");
        
        // Navigate to auth screen (you'll need to import router)
        const { router } = require('expo-router');
        router.replace('/(auth)');
      }
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
  padding: wp(4),
  marginHorizontal: wp(3.2),
  backgroundColor: colors.cardBackground,
  borderBottomWidth: 1,
  borderBottomColor: colors.cardBorder,
  borderRadius: wp(6.5),
  marginBottom: hp(2.5),
},

userInfo: {
  flex: 1,              // take up remaining space
  minWidth: 0,          // 🔑 allows text to shrink
},

userName: {
  fontSize: DrawerFonts.body,
  fontWeight: "600",
  color: colors.textPrimary,
},

userEmail: {
  fontSize: DrawerFonts.drawerEmail,
  color: colors.textSecondary,
  marginTop: hp(0.25),
},

  userImage: {
    width: Math.min(wp(15), hp(7.4)),
    height: Math.min(wp(15), hp(7.4)),
    borderRadius: Math.min(wp(7.5), hp(3.7)),
    marginRight: wp(3.2),
    borderWidth: 2,
    borderColor: colors.cardBorder,
  },
  drawerItems: {
    flex: 1,
  },
  drawerItemsContent: {
    paddingVertical: hp(1.2),
    paddingBottom: hp(2),
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: hp(1.7),
    paddingHorizontal: wp(4),
    marginHorizontal: wp(3.2),
    marginTop: hp(1.2),
    marginBottom: bottomInset + hp(13),
    backgroundColor: colors.error,
    borderRadius: wp(6.5),
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
