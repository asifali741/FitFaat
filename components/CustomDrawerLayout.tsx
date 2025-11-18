import { useTheme } from "@/contexts/ThemeContext";
import { useAuth, useUser } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import {
  DrawerContentComponentProps,
  DrawerItem
} from "@react-navigation/drawer";
import { useEffect, useRef, useState } from "react";
import { Image, Platform, Pressable, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { DrawerFonts } from "../app/(main)/(settings)/_ui_elements";
type DrawerSceneWrapperProps = DrawerContentComponentProps;

// Helper function to get API URL
const getAPIURL = () => {
  const apiUrl = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_API_URL || 'http://localhost:5001';
  return apiUrl.replace(/\/api\/?$/, '');
};

export function DrawerSceneWrapper(props: DrawerSceneWrapperProps) {
  const { colors } = useTheme();
  const { user } = useUser(); // Get Clerk user
  const [userName, setUserName] = useState('User');
  const [userEmail, setUserEmail] = useState('user@example.com');
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);
  
  useEffect(() => {
    fetchUserData();
  }, [user]);

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
      console.log('API_URL from config:', API_URL);
      const baseURL = Platform.OS === 'android' ? API_URL.replace('localhost', '10.0.2.2') : API_URL;
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

  const styles = getStyles(colors);

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
      <View style={{ flex: 1, paddingVertical: 10 }}>
        <DrawerItem
          label="Dashboard"
          onPress={() => props.navigation.navigate('(dashboard)')}
          labelStyle={{
            marginLeft: 8,
            fontSize: 18,
            fontFamily: "PoppinsMedium500",
            color: colors.textOnPrimary,
          }}
          style={{
            marginHorizontal: 12,
            marginVertical: 1,
            borderRadius: 25,
            paddingHorizontal: 20,
            paddingVertical: 8,
            minHeight: 45,
            backgroundColor: isRouteActive('(dashboard)') ? colors.drawerActiveTabColor : 'transparent',
          }}
        />
        <DrawerItem
          label="Chatbot"
          onPress={() => props.navigation.navigate('(chatbot)')}
          labelStyle={{
            marginLeft: 8,
            fontSize: 18,
            fontFamily: "PoppinsMedium500",
            color: colors.textOnPrimary,
          }}
          style={{
            marginHorizontal: 12,
            marginVertical: 1,
            borderRadius: 25,
            paddingHorizontal: 20,
            paddingVertical: 8,
            minHeight: 45,
            backgroundColor: isRouteActive('(chatbot)') ? colors.drawerActiveTabColor : 'transparent',
          }}
        />
        <DrawerItem
          label="Conference"
          onPress={() => props.navigation.navigate('(conference)')}
          labelStyle={{
            marginLeft: 8,
            fontSize: 18,
            fontFamily: "PoppinsMedium500",
            color: colors.textOnPrimary,
          }}
          style={{
            marginHorizontal: 12,
            marginVertical: 1,
            borderRadius: 25,
            paddingHorizontal: 20,
            paddingVertical: 8,
            minHeight: 45,
            backgroundColor: isRouteActive('(conference)') ? colors.drawerActiveTabColor : 'transparent',
          }}
        />
        <DrawerItem
          label="Workouts 👑"
          onPress={() => props.navigation.navigate('(exercises)/workout')}
          labelStyle={{
            marginLeft: 8,
            fontSize: 18,
            fontFamily: "PoppinsMedium500",
            color: colors.textOnPrimary,
          }}
          style={{
            marginHorizontal: 12,
            marginVertical: 1,
            borderRadius: 25,
            paddingHorizontal: 20,
            paddingVertical: 8,
            minHeight: 45,
            backgroundColor: isExercisesActive() ? colors.drawerActiveTabColor : 'transparent',
          }}
        />
        <DrawerItem
          label="Join as Doctor 👨‍⚕️"
          onPress={() => props.navigation.navigate('(doctor-portal)')}
          labelStyle={{
            marginLeft: 8,
            fontSize: 18,
            fontFamily: "PoppinsMedium500",
            color: colors.textOnPrimary,
          }}
          style={{
            marginHorizontal: 12,
            marginVertical: 1,
            borderRadius: 25,
            paddingHorizontal: 20,
            paddingVertical: 8,
            minHeight: 45,
            backgroundColor: isRouteActive('(doctor-portal)') ? colors.drawerActiveTabColor : 'transparent',
          }}
        />
        <DrawerItem
          label="Settings"
          onPress={() => props.navigation.navigate('(settings)')}
          labelStyle={{
            marginLeft: 8,
            fontSize: 18,
            fontFamily: "PoppinsMedium500",
            color: colors.textOnPrimary,
          }}
          style={{
            marginHorizontal: 12,
            marginVertical: 1,
            borderRadius: 25,
            paddingHorizontal: 20,
            paddingVertical: 8,
            minHeight: 45,
            backgroundColor: isRouteActive('(settings)') ? colors.drawerActiveTabColor : 'transparent',
          }}
        />
      </View>

      {/* Bottom Part */}
      <Logout_Button/>
      
    </SafeAreaView>
  );
}

const Logout_Button = () => {
  const { colors } = useTheme();
  const { signOut } = useAuth();
  const baseText = "Logout".split(""); // Array of letters
  const [activeIndex, setActiveIndex] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Shared values for each letter
  const scales = baseText.map(() => useSharedValue(1));

  const animateLetter = (index: number) => {
    scales.forEach((s, i) => {
      s.value = withSpring(i === index ? 1.5 : 1, { damping: 6, stiffness: 200 });
    });
  };

  const handleLongPress = () => {
    if (intervalRef.current) return;
    intervalRef.current = setInterval(() => {
      setActiveIndex((prev) => {
        const next = (prev + 1) % baseText.length;
        animateLetter(next);
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
    animateLetter(0);

    try {
      await signOut();
      console.log("Signed out successfully");
    } catch (err) {
      console.error("Error signing out:", err);
    }
  };

  const styles = getStyles(colors);

  return (
    <Pressable
      style={styles.logoutButton}
      onLongPress={handleLongPress}
      onPressOut={handlePressOut}
    >
      <Ionicons name="log-out" size={24} color={colors.textOnPrimary} />
      <View style={{ flexDirection: "row", marginLeft: 5 }}>
        {baseText.map((letter, i) => {
          const animatedStyle = useAnimatedStyle(() => ({
            transform: [{ scale: scales[i].value }],
          }));

          return (
            <Animated.Text key={i} style={[styles.logoutText, animatedStyle]}>
              {letter}
            </Animated.Text>
          );
        })}
      </View>
    </Pressable>
  );
};


const getStyles = (colors: any) => StyleSheet.create({
  userContainer: {
  flexDirection: "row",
  alignItems: "center",
  padding: 16,
  marginHorizontal: 12,
  backgroundColor: colors.cardBackground,
  borderBottomWidth: 1,
  borderBottomColor: colors.cardBorder,
  borderRadius: 25,
  marginBottom: 20,
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
  marginTop: 2,
},

  userImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 12,
    borderWidth: 2,
    borderColor: colors.cardBorder,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    marginHorizontal: 12,
    marginVertical: 20,
    backgroundColor: colors.error,
    borderRadius: 25,
    justifyContent: "center",
    alignSelf: 'stretch',
  },
  logoutText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
});
