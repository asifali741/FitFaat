import { useFonts } from "expo-font";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import "../../global.css";
import { useTheme } from '@/contexts/ThemeContext';
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from "react-native-responsive-screen";

const FULL_TEXT =
  "Your complete fitness companion with personalized diet plans, AI chatbot support, expert video consultations, and structured workouts - all in one app.";

export default function Index() {
  const router = useRouter();
  const { colors, isDarkMode } = useTheme();
  const [visibleText, setVisibleText] = useState("");
  const [fontsLoaded] = useFonts({
    Pacifico: require("../../assets/fonts/Pacifico-Regular.ttf"),
    LoraItalic: require("../../assets/fonts/static/Lora-Italic.ttf"),
    LoraRegular: require("../../assets/fonts/static/Lora-Regular.ttf"),
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

  const headingLogoSource = isDarkMode
    ? require("../../assets/images/new_black_logo.jpeg")
    : require("../../assets/images/logo.png");

  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* Hero Section with Gradient Background */}
        <LinearGradient
          colors={isDarkMode ? ['#0F172A', '#1E293B'] : ['#E0F2FE', '#F0F9FF']}
          style={styles.heroSection}
        >
          <Image
            source={require("../../assets/images/salad.jpg")}
            style={styles.bannerImage}
          />
          <View style={styles.overlay} />
        </LinearGradient>
        
        <View style={styles.contentContainer}>
          <View style={styles.mainHeading}>
            <Text style={styles.mainHeadingText}>Welcome To</Text>
            <Image
              source={headingLogoSource}
              style={styles.logoStyle}
              resizeMode={isDarkMode ? "cover" : "contain"}
            />
          </View>
          
          <Text style={styles.paragraphText}>{visibleText}</Text>
        </View>
        
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            onPress={() => router.push('/email-login')}
            style={styles.emailButton}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={[colors.primary, colors.secondary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.emailButtonGradient}
            >
              <Text style={styles.emailButtonText}>Login with Email</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push('/email-signup')}
            style={styles.signupButton}
            activeOpacity={0.8}
          >
            <Text style={styles.signupButtonText}>Create New Account</Text>
          </TouchableOpacity>
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
  heroSection: {
    width: wp(100),
    height: hp(35),
    minHeight: 250,
    maxHeight: 400,
    position: 'relative',
    overflow: 'hidden',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
    resizeMode: "cover",
    opacity: 0.9,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: isDarkMode ? 'rgba(15, 23, 42, 0.7)' : 'rgba(240, 249, 255, 0.6)',
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
    width: Math.min(wp(24), 112),
    height: Math.min(hp(8), 82),
    marginLeft: wp(2),
  },
  paragraphText: {
    textAlign: "center",
    fontFamily: "LoraItalic",
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
    backgroundColor: isDarkMode ? colors.cardBackground : "#FFFFFF",
    paddingVertical: Math.max(hp(1.8), 14),
    paddingHorizontal: wp(4),
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: isDarkMode ? colors.border : "#E2E8F0",
    marginBottom: hp(2),
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    minHeight: 56,
  },
  googleLogo: {
    width: 24,
    height: 24,
    marginRight: 12,
  },
  googleButtonText: {
    fontSize: Math.min(hp(2), 16),
    fontWeight: "600",
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
    color: colors.textSecondary,
    fontWeight: "500",
  },
  emailButton: {
    borderRadius: 16,
    marginBottom: hp(1.5),
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
    overflow: 'hidden',
    minHeight: 56,
  },
  emailButtonGradient: {
    paddingVertical: Math.max(hp(1.8), 16),
    paddingHorizontal: wp(4),
    alignItems: "center",
    justifyContent: "center",
  },
  emailButtonText: {
    fontSize: Math.min(hp(2.1), 17),
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  signupButton: {
    backgroundColor: "transparent",
    paddingVertical: Math.max(hp(1.8), 16),
    paddingHorizontal: wp(4),
    borderRadius: 16,
    alignItems: "center",
    borderWidth: 2,
    borderColor: colors.primary,
    minHeight: 56,
  },
  signupButtonText: {
    fontSize: Math.min(hp(2), 16),
    fontWeight: "700",
    color: colors.primary,
  },
});
