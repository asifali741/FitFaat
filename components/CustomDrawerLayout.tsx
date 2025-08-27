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

type DrawerSceneWrapperProps = DrawerContentComponentProps;
const userName = 'NAME' //Fetch from Authentication Token
export function DrawerSceneWrapper(props: DrawerSceneWrapperProps) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "transparent" }}>
      {/* Top Part */}
      <TouchableOpacity style={styles.userContainer}>
       <Image source={require('../assets/images/Default_Profile.png')} style={styles.userImage} />
        <View>
          <Text style={styles.userName}>{userName}</Text>
          <Text style={styles.userEmail}>{userName}@example.com</Text>
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
    backgroundColor: '#EDCCC2',
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
    borderRadius: 40
  },
  userImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 12,
    borderWidth: 2,
    borderColor: "#ddd",
  },
  userName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  userEmail: {
    fontSize: 14,
    color: "#666",
    marginTop: 2,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 20,
    backgroundColor: "#e63946", // red tone
    borderRadius: 12,
    justifyContent: "center",
  },
  logoutText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
});
