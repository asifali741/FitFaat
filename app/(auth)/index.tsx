import { useFonts } from "expo-font";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import "../../global.css";
import { useSocialAuth } from '../../hooks/useSocialAuth';
import { useTheme } from '@/contexts/ThemeContext';
import AnimatedButton from '@/components/common/AnimatedButton';
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from "react-native-responsive-screen";

const FULL_TEXT =
  "Your complete fitness companion with personalized diet plans, AI chatbot support, expert video consultations, and structured workouts - all in one app.";

export default function Index() {
  const { handleGoogleAuth } = useSocialAuth();
  const router = useRouter();
  const { colors, isDarkMode } = useTheme();
  const [visibleText, setVisibleText] = useState("");
  const [fontsLoaded] = useFonts({
    Pacifico: require("../../assets/fonts/Pacifico-Regular.ttf"),
    LoraItalic: require("../../assets/fonts/static/Lora-Italic.ttf"),
    LoraRegular: require("../../assets/fonts/static/Lora-Regular.ttf"),
    LoraBold: require("../../assets/fonts/static/Lora-Bold.ttf"),
    LoraSemiBold: require("../../assets/fonts/static/Lora-SemiBold.ttf"),
  });

  const iRef = useRef(0); // <-- useRef to persist value
  const styles = getStyles(colors, isDarkMode);

  // Auth navigation is handled in _layout.tsx AuthGate

  // ... existing code ...
  useEffect(() => {
    setVisibleText("");
    iRef.current = 0;
    const intervalId = setInterval(() => {
      setVisibleText((prev) => {
        if (iRef.current >= FULL_TEXT.length) {
          clearInterval(intervalId);
          return prev;
        }
        const updatedText = prev + FULL_TEXT.charAt(iRef.current);
        iRef.current++;
        return updatedText;
      });
    }, 80);

    return () => clearInterval(intervalId);
  }, []); // Keep empty dependency array
  // ... existing code ...

  if (!fontsLoaded) return null;

  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <Image
          source={require("../../assets/images/salad.jpg")}
          style={styles.bannerImage}
        />
        
        <View style={styles.contentContainer}>
          <View style={styles.mainHeading}>
            <Text style={styles.mainHeadingText}>Welcome To</Text>
            <Image
              source={require("../../assets/images/logo.png")}
              style={styles.logoStyle}
            />
          </View>
          
          <Text style={styles.paragraphText}>{visibleText}</Text>
        </View>
        
        <View style={styles.buttonContainer}>
          <AnimatedButton
            animationType="bounce"
            onPress={handleGoogleAuth} 
            style={styles.googleButton}
          >
            <Image
              source={require("../../assets/images/goog.png")}
              style={styles.googleLogo}
            />
            <Text style={styles.googleButtonText}>Continue with Google</Text>
          </AnimatedButton>

          <View style={styles.dividerContainer}>
            <View style={styles.divider} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.divider} />
          </View>

          <AnimatedButton
            animationType="scale"
            onPress={() => router.push('/email-login')}
            style={styles.emailButton}
          >
            <Text style={styles.emailButtonText}>Login with Email</Text>
          </AnimatedButton>

          <AnimatedButton
            animationType="pulse"
            onPress={() => router.push('/email-signup')}
            style={styles.signupButton}
          >
            <Text style={styles.signupButtonText}>Create New Account</Text>
          </AnimatedButton>
        </View>
      </ScrollView>
    </View>
  );
}

const getStyles = (colors: any, isDarkMode: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.screenColor,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  bannerImage: {
    width: wp(100),
    height: hp(33),
    minHeight: 250,
    maxHeight: 400,
    resizeMode: "cover",
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  contentContainer: {
    paddingHorizontal: wp(6),
    paddingTop: hp(3),
    paddingBottom: hp(2),
  },
  mainHeading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: hp(2),
  },
  mainHeadingText: {
    fontSize: Math.min(hp(3.2), 28),
    fontFamily: "Pacifico",
    color: colors.textPrimary,
  },
  logoStyle: {
    width: 50,
    height: 50,
    marginLeft: wp(2),
    resizeMode: "contain",
  },
  paragraphText: {
    textAlign: "center",
    fontFamily: "LoraRegular",
    fontSize: Math.min(hp(1.8), 16),
    color: colors.textSecondary,
    lineHeight: Math.min(hp(2.6), 24),
  },
  buttonContainer: {
    paddingHorizontal: wp(6),
    paddingBottom: hp(4),
    paddingTop: hp(2),
  },
  googleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: isDarkMode ? colors.white : "#FFFFFF",
    paddingVertical: Math.max(hp(1.8), 14),
    paddingHorizontal: wp(4),
    borderRadius: 12,
    borderWidth: 1,
    borderColor: isDarkMode ? colors.gray : "#E0E0E0",
    marginBottom: hp(2),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    minHeight: 50,
  },
  googleLogo: {
    width: 24,
    height: 24,
    marginRight: 12,
  },
  googleButtonText: {
    fontSize: Math.min(hp(2), 16),
    fontFamily: "LoraSemiBold",
    color: isDarkMode ? colors.textPrimary : "#1F2937",
    flexShrink: 1,
  },
  dividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: hp(2),
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: isDarkMode ? colors.gray : "#E5E7EB",
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: Math.min(hp(1.8), 14),
    fontFamily: "LoraRegular",
    color: colors.textSecondary,
  },
  emailButton: {
    backgroundColor: colors.primary,
    paddingVertical: Math.max(hp(1.8), 14),
    paddingHorizontal: wp(4),
    borderRadius: 12,
    alignItems: "center",
    marginBottom: hp(1.5),
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
    minHeight: 50,
  },
  emailButtonText: {
    fontSize: Math.min(hp(2), 16),
    fontFamily: "LoraBold",
    color: "#FFFFFF",
  },
  signupButton: {
    backgroundColor: "transparent",
    paddingVertical: Math.max(hp(1.8), 14),
    paddingHorizontal: wp(4),
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 2,
    borderColor: colors.primary,
    minHeight: 50,
  },
  signupButtonText: {
    fontSize: Math.min(hp(2), 16),
    fontFamily: "LoraBold",
    color: colors.primary,
  },
});
