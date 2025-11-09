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
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      {/* Top Part with Gradient Background */}
      <LinearGradient
        colors={[colors.primary, colors.primaryDark]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <TouchableOpacity 
          style={styles.userContainer} 
          onPress={handleProfilePress}
          activeOpacity={0.8}
        >
          <View style={styles.avatarWrapper}>
            <View style={styles.avatarContainer}>
              <Image source={require("../assets/images/Default_Profile.png")} style={styles.userImage} />
              <View style={styles.onlineIndicator} />
            </View>
          </View>
          
          <View style={styles.userInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.userName} numberOfLines={1}>
                {userName}
              </Text>
              <View style={styles.verifiedBadge}>
                <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
              </View>
            </View>
            
            <View style={styles.emailRow}>
              <Ionicons name="mail-outline" size={11} color="rgba(255, 255, 255, 0.7)" />
              <Text style={styles.userEmail} numberOfLines={1}>
                {userEmail}
              </Text>
            </View>
          </View>
          
          <View style={styles.actionButton}>
            <Ionicons name="create-outline" size={18} color="#fff" />
          </View>
        </TouchableOpacity>
        
        {/* Decorative Elements */}
        <View style={styles.decorCircle1} />
        <View style={styles.decorCircle2} />
      </LinearGradient>

      {/* Drawer Items */}
      <View style={styles.menuSection}>
        <View style={styles.menuItems}>
        <DrawerItem
          label="Dashboard"
          icon={({ size }) => (
            <Ionicons name="home" size={22} color={isRouteActive('(dashboard)') ? colors.primary : colors.textOnPrimary} />
          )}
          onPress={() => props.navigation.navigate('(dashboard)')}
          labelStyle={{
            marginLeft: -4,
            fontSize: 16,
            fontWeight: isRouteActive('(dashboard)') ? '600' : '500',
            color: isRouteActive('(dashboard)') ? colors.primary : colors.textOnPrimary,
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
            <Ionicons name="chatbubbles" size={22} color={isRouteActive('(chatbot)') ? colors.primary : colors.textOnPrimary} />
          )}
          onPress={() => props.navigation.navigate('(chatbot)')}
          labelStyle={{
            marginLeft: -4,
            fontSize: 16,
            fontWeight: isRouteActive('(chatbot)') ? '600' : '500',
            color: isRouteActive('(chatbot)') ? colors.primary : colors.textOnPrimary,
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
            <Ionicons name="videocam" size={22} color={isRouteActive('(conference)') ? colors.primary : colors.textOnPrimary} />
          )}
          onPress={() => props.navigation.navigate('(conference)')}
          labelStyle={{
            marginLeft: -4,
            fontSize: 16,
            fontWeight: isRouteActive('(conference)') ? '600' : '500',
            color: isRouteActive('(conference)') ? colors.primary : colors.textOnPrimary,
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
            <Ionicons name="barbell" size={22} color={isExercisesActive() ? colors.primary : colors.textOnPrimary} />
          )}
          onPress={() => props.navigation.navigate('(exercises)')}
          labelStyle={{
            marginLeft: -4,
            fontSize: 16,
            fontWeight: isExercisesActive() ? '600' : '500',
            color: isExercisesActive() ? colors.primary : colors.textOnPrimary,
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
            <Ionicons name="medical" size={22} color={isRouteActive('(doctor-portal)') ? colors.primary : colors.textOnPrimary} />
          )}
          onPress={() => props.navigation.navigate('(doctor-portal)')}
          labelStyle={{
            marginLeft: -4,
            fontSize: 16,
            fontWeight: isRouteActive('(doctor-portal)') ? '600' : '500',
            color: isRouteActive('(doctor-portal)') ? colors.primary : colors.textOnPrimary,
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
            <Ionicons name="settings" size={22} color={isRouteActive('(settings)') ? colors.primary : colors.textOnPrimary} />
          )}
          onPress={() => props.navigation.navigate('(settings)')}
          labelStyle={{
            marginLeft: -4,
            fontSize: 16,
            fontWeight: isRouteActive('(settings)') ? '600' : '500',
            color: isRouteActive('(settings)') ? colors.primary : colors.textOnPrimary,
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
  },
  safeArea: {
    flex: 1,
    backgroundColor: colors.drawerBackground,
    borderTopRightRadius: 24,
    borderBottomRightRadius: 24,
    overflow: 'hidden',
  },
  headerGradient: {
    paddingTop: 12,
    paddingBottom: 20,
    position: 'relative',
    overflow: 'hidden',
  },
  decorCircle1: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  decorCircle2: {
    position: 'absolute',
    bottom: -30,
    left: -30,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  userContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginVertical: 12,
    padding: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  avatarWrapper: {
    marginRight: 12,
  },
  avatarContainer: {
    position: 'relative',
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    padding: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: '#fff',
    backgroundColor: colors.cardBackground,
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 3,
    right: 3,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#4CAF50',
    borderWidth: 2.5,
    borderColor: '#fff',
  },
  userInfo: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  userName: {
    fontSize: 16,
    fontWeight: "700",
    color: '#FFFFFF',
    letterSpacing: 0.3,
    marginRight: 4,
  },
  verifiedBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 10,
    padding: 2,
  },
  emailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  userEmail: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.75)',
    flex: 1,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
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
