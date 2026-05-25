import AppHeader from "@/components/AppHeader";
import { FeatureLimitBanner } from "@/components/common/FeatureLimitBanner";
import { PremiumTeaserCard } from "@/components/common/PremiumTeaserCard";
import { StepCounterCard } from "@/components/dashboard/StepCounterCard";
import { useTheme } from "@/contexts/ThemeContext";
import { FREE_PLAN_LIMITS, getFeatureAccessStatus, type FeatureAccessStatus } from "@/utils/featureAccess";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  BackHandler,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { heightPercentageToDP as hp } from "react-native-responsive-screen";
import { SafeAreaView } from "react-native-safe-area-context";

export default function StepsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const styles = getStyles(colors);
  const [isPremium, setIsPremium] = useState(false);
  const [stepsAccess, setStepsAccess] = useState<FeatureAccessStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadPremiumState = useCallback(async () => {
    setIsLoading(true);

    try {
      const featureAccess = await getFeatureAccessStatus("stepsTracking");
      setStepsAccess(featureAccess);
      setIsPremium(featureAccess.isPremium);
    } catch (error) {
      console.log("[StepsScreen] Failed to check premium state:", error);
      setStepsAccess(null);
      setIsPremium(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadPremiumState();
    }, [loadPremiumState])
  );

  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
        router.replace("/(main)/(settings)" as any);
        return true;
      });

      return () => subscription.remove();
    }, [router])
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.screenColor }]} edges={["top"]}>
      <AppHeader title="Daily Step Ring" showStepIndicator={false} />

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <>
            <View style={styles.trialBannerWrap}>
              <FeatureLimitBanner access={stepsAccess} />
            </View>
            {stepsAccess?.hasAccess ? (
              <StepCounterCard isPremium={stepsAccess?.isPremium ?? isPremium} colors={colors} />
            ) : (
              <View style={styles.lockedWrap}>
                <PremiumTeaserCard
                  title="Basic Counter Preview"
                  subtitle={stepsAccess?.lockedReason || `Your Basic counter includes the ${FREE_PLAN_LIMITS.dailyStepCounterPreview}-step preview. Premium adds custom goals, step calories, and weekly trends.`}
                  previewTitle="Premium step ring"
                  icon="footsteps-outline"
                  compact
                  metrics={[
                    { label: "Goal", value: "Custom", icon: "flag-outline", color: "#22C55E" },
                    { label: "Calories", value: "Burn", icon: "flame-outline", color: "#F97316" },
                    { label: "Week", value: "Trend", icon: "bar-chart-outline", color: "#0EA5E9" },
                  ]}
                  bullets={["Daily ring", "Step calories", "Weekly rhythm"]}
                />
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const getStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    content: {
      flex: 1,
    },
    scrollContent: {
      paddingTop: hp(1.4),
      paddingBottom: hp(16),
    },
    loadingCard: {
      minHeight: hp(24),
      alignItems: "center",
      justifyContent: "center",
    },
    trialBannerWrap: {
      paddingHorizontal: hp(1.8),
    },
    lockedWrap: {
      paddingHorizontal: hp(1.8),
    },
  });
