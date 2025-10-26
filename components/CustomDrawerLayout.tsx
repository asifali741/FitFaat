import { colorsSheet as color } from "@/app/(main)/(settings)/ui_elements";
import { useAuth } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import {
    DrawerContentComponentProps,
    DrawerItem
} from "@react-navigation/drawer";
import { useRef, useState } from "react";
import { Image, Pressable, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { DrawerFonts } from "../app/(main)/(settings)/ui_elements";
type DrawerSceneWrapperProps = DrawerContentComponentProps;
const userName = 'NAME' // fetch from Authentication Token
export function DrawerSceneWrapper(props: DrawerSceneWrapperProps) {
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
    return currentRoute === '(exercises)/workout' || currentRoute.startsWith('(exercises)');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "transparent" }}>
      {/* Top Part */}
      <TouchableOpacity style={styles.userContainer} onPress={handleProfilePress}>
        <Image source={require("../assets/images/Default_Profile.png")} style={styles.userImage} />
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
            {userName}@exasdasdample.com
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
            color: "#FFFFFF",
          }}
          style={{
            marginHorizontal: 12,
            marginVertical: 1,
            borderRadius: 25,
            paddingHorizontal: 20,
            paddingVertical: 8,
            minHeight: 45,
            backgroundColor: isRouteActive('(dashboard)') ? color.drawerActiveTabColor : 'transparent',
          }}
        />
        <DrawerItem
          label="Chatbot"
          onPress={() => props.navigation.navigate('(chatbot)')}
          labelStyle={{
            marginLeft: 8,
            fontSize: 18,
            fontFamily: "PoppinsMedium500",
            color: "#FFFFFF",
          }}
          style={{
            marginHorizontal: 12,
            marginVertical: 1,
            borderRadius: 25,
            paddingHorizontal: 20,
            paddingVertical: 8,
            minHeight: 45,
            backgroundColor: isRouteActive('(chatbot)') ? color.drawerActiveTabColor : 'transparent',
          }}
        />
        <DrawerItem
          label="Conference"
          onPress={() => props.navigation.navigate('(conference)')}
          labelStyle={{
            marginLeft: 8,
            fontSize: 18,
            fontFamily: "PoppinsMedium500",
            color: "#FFFFFF",
          }}
          style={{
            marginHorizontal: 12,
            marginVertical: 1,
            borderRadius: 25,
            paddingHorizontal: 20,
            paddingVertical: 8,
            minHeight: 45,
            backgroundColor: isRouteActive('(conference)') ? color.drawerActiveTabColor : 'transparent',
          }}
        />
        <DrawerItem
          label="Workouts 👑"
          onPress={() => props.navigation.navigate('(exercises)/workout')}
          labelStyle={{
            marginLeft: 8,
            fontSize: 18,
            fontFamily: "PoppinsMedium500",
            color: "#FFFFFF",
          }}
          style={{
            marginHorizontal: 12,
            marginVertical: 1,
            borderRadius: 25,
            paddingHorizontal: 20,
            paddingVertical: 8,
            minHeight: 45,
            backgroundColor: isExercisesActive() ? color.drawerActiveTabColor : 'transparent',
          }}
        />
        <DrawerItem
          label="Join as Doctor 👨‍⚕️"
          onPress={() => props.navigation.navigate('(doctor-portal)')}
          labelStyle={{
            marginLeft: 8,
            fontSize: 18,
            fontFamily: "PoppinsMedium500",
            color: "#FFFFFF",
          }}
          style={{
            marginHorizontal: 12,
            marginVertical: 1,
            borderRadius: 25,
            paddingHorizontal: 20,
            paddingVertical: 8,
            minHeight: 45,
            backgroundColor: isRouteActive('(doctor-portal)') ? color.drawerActiveTabColor : 'transparent',
          }}
        />
        <DrawerItem
          label="Settings"
          onPress={() => props.navigation.navigate('(settings)')}
          labelStyle={{
            marginLeft: 8,
            fontSize: 18,
            fontFamily: "PoppinsMedium500",
            color: "#FFFFFF",
          }}
          style={{
            marginHorizontal: 12,
            marginVertical: 1,
            borderRadius: 25,
            paddingHorizontal: 20,
            paddingVertical: 8,
            minHeight: 45,
            backgroundColor: isRouteActive('(settings)') ? color.drawerActiveTabColor : 'transparent',
          }}
        />
      </View>

      {/* Bottom Part */}
      <Logout_Button/>
      
    </SafeAreaView>
  );
}

const Logout_Button = () => {
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

  return (
    <Pressable
      style={styles.logoutButton}
      onLongPress={handleLongPress}
      onPressOut={handlePressOut}
    >
      <Ionicons name="log-out" size={24} color="#FFFFFF" />
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


const styles = StyleSheet.create({
  userContainer: {
  flexDirection: "row",
  alignItems: "center",
  padding: 16,
  marginHorizontal: 12,
  backgroundColor: color.screenColor,
  borderBottomWidth: 1,
  borderBottomColor: "#ddd",
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
  color: "#333",
},

userEmail: {
  fontSize: DrawerFonts.drawerEmail,
  color: "#666",
  marginTop: 2,
},

  userImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 12,
    borderWidth: 2,
    borderColor: "#ddd",
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    marginHorizontal: 12,
    marginVertical: 20,
    backgroundColor: color.logoutBtnColor, //ui_elements.tsx logoutBtnColor
    borderRadius: 25,
    justifyContent: "center",
    alignSelf: 'stretch',
  },
  logoutText: {
    color: color.logoutBtnTextColor, //ui_elements.tsx logoutBtnTextColor
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
});
