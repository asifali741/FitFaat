import AppHeader from "@/components/AppHeader";
import { useTheme } from "@/contexts/ThemeContext";
import { FREE_PLAN_LIMITS } from "@/utils/featureAccess";
import * as SystemUI from "expo-system-ui";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Image, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from "react-native-responsive-screen";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

const FullText =
  "Hi, I am HeaLora, your AI-powered health companion. I use your FitFaat goal, score, recent logs, hydration, and steps to suggest the next useful action.";
export default function Index() {
  const { colors } = useTheme();
  const [visibleText, setVisibleText] = useState("");
  const router = useRouter();
  const insets = useSafeAreaInsets();
  // Increase bottom spacing to account for tab bar height + safe area.
  const bottomSpace = insets.bottom > 0 ? insets.bottom + hp(8) : hp(16);

  const iRef = useRef(0);
  useEffect(() => {
    setVisibleText("");
    iRef.current = 0;
    const interValId = setInterval(() => {
      setVisibleText((prev) => {
        if (iRef.current >= FullText.length) {
          clearInterval(interValId);
          return prev;
        }
        const updatedText = prev + FullText.charAt(iRef.current);
        iRef.current++;
        return updatedText;
      });
    }, 100);
    return () => clearInterval(interValId);
  }, []);

  useFocusEffect(
    useCallback(() => {
      SystemUI.setBackgroundColorAsync("#FFFFFF").catch(() => {});

      return () => {
        SystemUI.setBackgroundColorAsync(colors.screenColor).catch(() => {});
      };
    }, [colors.screenColor])
  );

  const handleStartConversation = () => {
    router.push("/(main)/(chatbot)/baat" as any);
  };

  const styles = getStyles(colors);
  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" translucent={false} />
      <View style={styles.container}>
      <AppHeader
        title="HeaLora"
        showStepIndicator={false}
        showBackButton={false}
        showMenuButton={true}
      />

      {/* Main Content */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomSpace }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.titleSection}>
          <Text style={styles.mainTitle}>
            Conversations Redefined: {"\n"}
            The Future of Health Monitoring
          </Text>
        </View>

        <View style={styles.aiSection}>
          <Image
            source={require("../../../assets/images/jarvis.png")}
            style={styles.aiImage}
          />
          <View style={styles.textContainer}>
            <Text style={styles.aiText}>{visibleText}</Text>
          </View>
        </View>

        <Text style={styles.freeLimitText}>
          Free includes {FREE_PLAN_LIMITS.aiCoachDailyMessages} HeaLora messages per day. Premium unlocks unlimited coach conversations.
        </Text>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.gradientButtonContainer}
            onPress={handleStartConversation}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={[colors.primary, colors.primaryLight, colors.accent]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.gradientButton}
            >
              <Text style={styles.gradientButtonText}>Start Conversation</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScrollView>
      </View>
    </SafeAreaView>
  )
}

const getStyles = (colors: any) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.screenColor,
  },
  container: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  content: {
    flex: 1,
    backgroundColor: colors.screenColor,
  },
  scrollContent: {
    paddingTop: hp(3),
    paddingHorizontal: wp(6),
  },
  titleSection: {
    alignItems: "center",
    marginBottom: hp(2),
  },
  mainTitle: {
    fontSize: Math.min(hp(3.2), wp(8)),
    fontWeight: "bold",
    color: colors.textPrimary,
    textAlign: "center",
    lineHeight: Math.min(hp(4), wp(10)),
    paddingHorizontal: wp(4),
  },
  aiSection: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: hp(2),
  },
  aiImage: {
    width: Math.min(hp(18), wp(36)),
    height: Math.min(hp(18), wp(36)),
    marginBottom: hp(2),
    borderRadius: Math.min(hp(9), wp(18)),
  },
  textContainer: {
    backgroundColor: colors.primarySoft,
    borderRadius: 20,
    padding: hp(2.5),
    marginHorizontal: wp(4),
    marginBottom: hp(3),
  },
  aiText: {
    fontSize: Math.min(hp(2), wp(5)),
    color: colors.textOnCard,
    textAlign: "center",
    lineHeight: Math.min(hp(2.8), wp(7)),
  },
  buttonContainer: {
    paddingBottom: hp(3),
  },
  freeLimitText: {
    marginHorizontal: wp(4),
    marginBottom: hp(2),
    color: colors.textSecondary,
    fontSize: Math.min(hp(1.55), wp(3.65)),
    fontWeight: "700",
    lineHeight: hp(2.2),
    textAlign: "center",
  },
  gradientButtonContainer: {
    borderRadius: 30,
    overflow: "hidden",
    shadowColor: colors.primary,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  gradientButton: {
    paddingVertical: Math.min(hp(2.2), wp(5.5)),
    paddingHorizontal: Math.min(wp(8), 35),
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    minHeight: hp(6),
  },
  gradientButtonText: {
    color: colors.white,
    fontSize: Math.min(hp(2.2), wp(5.5)),
    fontWeight: "700",
    letterSpacing: 0.5,
  },
});
