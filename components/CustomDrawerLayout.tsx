import { colorsSheet as color } from "@/app/(main)/(settings)/ui_elements";
import { useAuth } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import {
  DrawerContentComponentProps,
  DrawerContentScrollView,
  DrawerItemList,
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
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "transparent" }}>
      {/* Top Part */}
      <TouchableOpacity style={styles.userContainer}>
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
      <DrawerContentScrollView {...props}>
        <DrawerItemList {...props} />
      </DrawerContentScrollView>

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
  backgroundColor: color.screenColor,
  borderBottomWidth: 1,
  borderBottomColor: "#ddd",
  borderRadius: 40,
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
    marginHorizontal: 16,
    marginVertical: 20,
    backgroundColor: color.logoutBtnColor, //ui_elements.tsx logoutBtnColor
    borderRadius: 12,
    justifyContent: "center",
  },
  logoutText: {
    color: color.logoutBtnTextColor, //ui_elements.tsx logoutBtnTextColor
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
});
