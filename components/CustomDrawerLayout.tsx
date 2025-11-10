import { useTheme } from "@/contexts/ThemeContext";
import { useAuth, useUser } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import {
    DrawerContentComponentProps,
    DrawerItem
} from "@react-navigation/drawer";
import { useMemo, useRef, useState } from "react";
import { Image, Pressable, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    SharedValue,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { DrawerFonts } from "../app/(main)/(settings)/_ui_elements";
type DrawerSceneWrapperProps = DrawerContentComponentProps;

export function DrawerSceneWrapper(props: DrawerSceneWrapperProps) {
  const { colors } = useTheme();
  const { user } = useUser();
  
  // Get user details from Clerk
  const userName = user?.firstName || user?.username || 'User';
  const userEmail = user?.primaryEmailAddress?.emailAddress || 'user@example.com';
  
  const handleProfilePress = () => {
    console.log('Navigating to profile screen');
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
    return currentRoute === '(exercises)' || currentRoute.startsWith('(exercises)');
  };

  const styles = getStyles(colors);

  return (
    <View style={styles.container}>
    <SafeAreaView style={styles.safeArea} edges={[]}>
      {/* Profile Section */}
      <View style={styles.profileSection}>
        <TouchableOpacity 
          style={styles.userContainer} 
          onPress={handleProfilePress}
          activeOpacity={0.8}
        >
          <View style={styles.avatarWrapper}>
            <Image source={require("../assets/images/Default_Profile.png")} style={styles.userImage} />
          </View>
          
          <View style={styles.userInfo}>
            <Text style={styles.userName} numberOfLines={1}>
              {userName}
            </Text>
            <Text style={styles.userHandle} numberOfLines={1}>
              @{user?.username || 'username'}
            </Text>
          </View>
        </TouchableOpacity>
        
        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>12</Text>
            <Text style={styles.statLabel}>Workouts</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>5</Text>
            <Text style={styles.statLabel}>Favorites</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>24</Text>
            <Text style={styles.statLabel}>Days Active</Text>
          </View>
        </View>
        
        {/* Email Display */}
        <View style={styles.emailContainer}>
          <Ionicons name="mail-outline" size={14} color={colors.textSecondary} />
          <Text style={styles.emailText} numberOfLines={1}>
            {userEmail}
          </Text>
        </View>
      </View>

      {/* Drawer Items */}
      <View style={styles.menuSection}>
        <View style={styles.menuItems}>
        <DrawerItem
          label="Dashboard"
          icon={({ size }) => (
            <Ionicons name="home" size={22} color={isRouteActive('(dashboard)') ? colors.primary : colors.textPrimary} />
          )}
          onPress={() => props.navigation.navigate('(dashboard)')}
          labelStyle={{
            marginLeft: -4,
            fontSize: 16,
            fontWeight: isRouteActive('(dashboard)') ? '600' : '500',
            color: isRouteActive('(dashboard)') ? colors.primary : colors.textPrimary,
          }}
          style={{
            marginHorizontal: 8,
            marginVertical: 4,
            borderRadius: 16,
            paddingHorizontal: 16,
            paddingVertical: 4,
            minHeight: 50,
            backgroundColor: isRouteActive('(dashboard)') ? colors.primarySoft : 'transparent',
            borderLeftWidth: isRouteActive('(dashboard)') ? 4 : 0,
            borderLeftColor: colors.primary,
          }}
        />
        <DrawerItem
          label="Chatbot"
          icon={({ size }) => (
            <Ionicons name="chatbubbles" size={22} color={isRouteActive('(chatbot)') ? colors.primary : colors.textPrimary} />
          )}
          onPress={() => props.navigation.navigate('(chatbot)')}
          labelStyle={{
            marginLeft: -4,
            fontSize: 16,
            fontWeight: isRouteActive('(chatbot)') ? '600' : '500',
            color: isRouteActive('(chatbot)') ? colors.primary : colors.textPrimary,
          }}
          style={{
            marginHorizontal: 8,
            marginVertical: 4,
            borderRadius: 16,
            paddingHorizontal: 16,
            paddingVertical: 4,
            minHeight: 50,
            backgroundColor: isRouteActive('(chatbot)') ? colors.primarySoft : 'transparent',
            borderLeftWidth: isRouteActive('(chatbot)') ? 4 : 0,
            borderLeftColor: colors.primary,
          }}
        />
        <DrawerItem
          label="Conference"
          icon={({ size }) => (
            <Ionicons name="videocam" size={22} color={isRouteActive('(conference)') ? colors.primary : colors.textPrimary} />
          )}
          onPress={() => props.navigation.navigate('(conference)')}
          labelStyle={{
            marginLeft: -4,
            fontSize: 16,
            fontWeight: isRouteActive('(conference)') ? '600' : '500',
            color: isRouteActive('(conference)') ? colors.primary : colors.textPrimary,
          }}
          style={{
            marginHorizontal: 8,
            marginVertical: 4,
            borderRadius: 16,
            paddingHorizontal: 16,
            paddingVertical: 4,
            minHeight: 50,
            backgroundColor: isRouteActive('(conference)') ? colors.primarySoft : 'transparent',
            borderLeftWidth: isRouteActive('(conference)') ? 4 : 0,
            borderLeftColor: colors.primary,
          }}
        />
        <DrawerItem
          label="Workouts 👑"
          icon={({ size }) => (
            <Ionicons name="barbell" size={22} color={isExercisesActive() ? colors.primary : colors.textPrimary} />
          )}
          onPress={() => props.navigation.navigate('(exercises)')}
          labelStyle={{
            marginLeft: -4,
            fontSize: 16,
            fontWeight: isExercisesActive() ? '600' : '500',
            color: isExercisesActive() ? colors.primary : colors.textPrimary,
          }}
          style={{
            marginHorizontal: 8,
            marginVertical: 4,
            borderRadius: 16,
            paddingHorizontal: 16,
            paddingVertical: 4,
            minHeight: 50,
            backgroundColor: isExercisesActive() ? colors.primarySoft : 'transparent',
            borderLeftWidth: isExercisesActive() ? 4 : 0,
            borderLeftColor: colors.primary,
          }}
        />
        <DrawerItem
          label="Join as Doctor"
          icon={({ size }) => (
            <Ionicons name="medical" size={22} color={isRouteActive('(doctor-portal)') ? colors.primary : colors.textPrimary} />
          )}
          onPress={() => props.navigation.navigate('(doctor-portal)')}
          labelStyle={{
            marginLeft: -4,
            fontSize: 16,
            fontWeight: isRouteActive('(doctor-portal)') ? '600' : '500',
            color: isRouteActive('(doctor-portal)') ? colors.primary : colors.textPrimary,
          }}
          style={{
            marginHorizontal: 8,
            marginVertical: 4,
            borderRadius: 16,
            paddingHorizontal: 16,
            paddingVertical: 4,
            minHeight: 50,
            backgroundColor: isRouteActive('(doctor-portal)') ? colors.primarySoft : 'transparent',
            borderLeftWidth: isRouteActive('(doctor-portal)') ? 4 : 0,
            borderLeftColor: colors.primary,
          }}
        />
        <DrawerItem
          label="Settings"
          icon={({ size }) => (
            <Ionicons name="settings" size={22} color={isRouteActive('(settings)') ? colors.primary : colors.textPrimary} />
          )}
          onPress={() => props.navigation.navigate('(settings)')}
          labelStyle={{
            marginLeft: -4,
            fontSize: 16,
            fontWeight: isRouteActive('(settings)') ? '600' : '500',
            color: isRouteActive('(settings)') ? colors.primary : colors.textPrimary,
          }}
          style={{
            marginHorizontal: 8,
            marginVertical: 4,
            borderRadius: 16,
            paddingHorizontal: 16,
            paddingVertical: 4,
            minHeight: 50,
            backgroundColor: isRouteActive('(settings)') ? colors.primarySoft : 'transparent',
            borderLeftWidth: isRouteActive('(settings)') ? 4 : 0,
            borderLeftColor: colors.primary,
          }}
        />
        </View>
      </View>

      {/* Bottom Part */}
      <View style={styles.bottomSection}>
        <Logout_Button/>
      </View>
      
    </SafeAreaView>
    </View>
  );
}

// Separate component for animated letter to avoid hooks in map
const AnimatedLetter = ({ letter, scale, textStyle }: { letter: string; scale: SharedValue<number>; textStyle: any }) => {
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.Text style={[textStyle, animatedStyle]}>
      {letter}
    </Animated.Text>
  );
};

const Logout_Button = () => {
  const { colors } = useTheme();
  const { signOut } = useAuth();
  const baseText = "Logout".split(""); // Array of letters
  const [activeIndex, setActiveIndex] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Create shared values - one for each letter
  const scale0 = useSharedValue(1);
  const scale1 = useSharedValue(1);
  const scale2 = useSharedValue(1);
  const scale3 = useSharedValue(1);
  const scale4 = useSharedValue(1);
  const scale5 = useSharedValue(1);
  const scales = [scale0, scale1, scale2, scale3, scale4, scale5];

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
        {baseText.map((letter, i) => (
          <AnimatedLetter 
            key={i} 
            letter={letter} 
            scale={scales[i]} 
            textStyle={styles.logoutText}
          />
        ))}
      </View>
    </Pressable>
  );
};


const getStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
    paddingTop: 20,
    paddingBottom: 20,
  },
  safeArea: {
    flex: 1,
    backgroundColor: colors.drawerBackground,
    borderTopRightRadius: 24,
    borderBottomRightRadius: 24,
    overflow: 'hidden',
  },
  profileSection: {
    paddingTop: 20,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  userContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  avatarWrapper: {
    marginRight: 12,
  },
  userImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 2,
  },
  userHandle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingRight: 10,
  },
  statItem: {
    flexDirection: 'row',
    gap: 3,
    alignItems: 'baseline',
    flex: 1,
  },
  statValue: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  statLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    flexShrink: 1,
  },
  emailContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  emailText: {
    fontSize: 13,
    color: colors.textSecondary,
    flex: 1,
  },
  menuSection: {
    flex: 1,
    paddingTop: 8,
    justifyContent: 'space-between',
  },
  menuItems: {
    flex: 1,
  },
  bottomSection: {
    paddingTop: 16,
    paddingBottom: 20,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    backgroundColor: colors.error,
    borderRadius: 20,
    justifyContent: "center",
    alignSelf: 'stretch',
    shadowColor: colors.error,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  logoutText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: "800",
    marginLeft: 10,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
});
