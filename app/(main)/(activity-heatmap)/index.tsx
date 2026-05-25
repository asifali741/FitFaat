import AppHeader from "@/components/AppHeader";
import { FeatureLimitBanner } from "@/components/common/FeatureLimitBanner";
import { PremiumTeaserCard } from "@/components/common/PremiumTeaserCard";
import { ActivityHeatmap } from "@/components/dashboard/ActivityHeatmap";
import { useTheme } from "@/contexts/ThemeContext";
import { getStoredDashboardCache } from "@/utils/dashboardStorage";
import { getFeatureAccessStatus, type FeatureAccessStatus } from "@/utils/featureAccess";
import { mergeExerciseProgressIntoJsonResponse } from "@/utils/localExerciseProgress";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from "react-native-responsive-screen";
import { SafeAreaView } from "react-native-safe-area-context";
import type { Day, jsonResponse } from "../(dashboard)/types";

export default function ActivityHeatmapScreen() {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const [days, setDays] = useState<Day[]>([]);
  const [isPremium, setIsPremium] = useState(false);
  const [advancedChartAccess, setAdvancedChartAccess] = useState<FeatureAccessStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdatedLabel, setLastUpdatedLabel] = useState("Local snapshots");

  const loadHeatmapData = useCallback(async () => {
    setIsLoading(true);

    try {
      const featureAccess = await getFeatureAccessStatus("heatmapFiltersPro");
      const premiumActive = featureAccess.hasAccess;
      const cachedData = await getStoredDashboardCache<jsonResponse>();
      let nextData = cachedData?.data || null;

      if (nextData && premiumActive) {
        nextData = await mergeExerciseProgressIntoJsonResponse(nextData);
      }

      setAdvancedChartAccess(featureAccess);
      setIsPremium(premiumActive);
      setDays(nextData ? Object.values(nextData) : []);

      if (cachedData?.timestamp) {
        const timestamp = new Date(cachedData.timestamp);
        if (!Number.isNaN(timestamp.getTime())) {
          setLastUpdatedLabel(
            timestamp.toLocaleString([], {
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })
          );
        }
      }
    } catch (error) {
      console.log("[ActivityHeatmapScreen] Failed to load heatmap data:", error);
      setDays([]);
      setIsPremium(false);
      setAdvancedChartAccess(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadHeatmapData();
    }, [loadHeatmapData])
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.screenColor }]} edges={["top"]}>
      <AppHeader title="Activity Heatmap" showStepIndicator={false} />

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerCard}>
          <View style={styles.headerIcon}>
            <Ionicons name="grid-outline" size={Math.min(hp(2.8), wp(6.2))} color="#22C55E" />
          </View>
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>Consistency</Text>
            <Text style={styles.title}>Goal activity map</Text>
            <Text style={styles.subtitle}>Updated {lastUpdatedLabel}</Text>
          </View>
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={loadHeatmapData}
            activeOpacity={0.8}
            accessibilityLabel="Refresh activity heatmap"
          >
            <Ionicons name="refresh" size={Math.min(hp(2.05), wp(4.6))} color={colors.textOnPrimary} />
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <>
            <View style={styles.trialBannerWrap}>
              <FeatureLimitBanner access={advancedChartAccess} />
            </View>
            <ActivityHeatmap
              days={days}
              includeExercise={isPremium}
              enableAdvancedFilters={isPremium}
              colors={colors}
            />
            {!isPremium ? (
              <View style={styles.lockedWrap}>
                <PremiumTeaserCard
                  title="Unlock Advanced Heatmap Filters"
                  subtitle={advancedChartAccess?.lockedReason || "Free includes the basic activity map. Premium adds advanced filters, longer ranges, and exercise-linked consistency."}
                  previewTitle="Advanced consistency map"
                  icon="grid-outline"
                  compact
                  metrics={[
                    { label: "Filters", value: "Advanced", icon: "options-outline", color: "#22C55E" },
                    { label: "Trends", value: "Deep", icon: "trending-up-outline", color: colors.primary },
                    { label: "Range", value: "Long", icon: "calendar-outline", color: "#F97316" },
                  ]}
                  bullets={["Advanced filters", "Walking links", "Workout trends"]}
                />
              </View>
            ) : null}
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
    headerCard: {
      marginHorizontal: wp(4),
      marginBottom: hp(1.1),
      borderRadius: hp(2),
      borderWidth: 1,
      borderColor: colors.cardBorder || colors.border,
      backgroundColor: colors.cardBackground,
      padding: wp(4),
      flexDirection: "row",
      alignItems: "center",
      gap: wp(3),
      shadowColor: colors.black,
      shadowOffset: { width: 0, height: hp(0.35) },
      shadowOpacity: 0.08,
      shadowRadius: wp(2),
      elevation: 3,
    },
    headerIcon: {
      width: Math.min(hp(5.2), wp(11.6)),
      height: Math.min(hp(5.2), wp(11.6)),
      borderRadius: hp(1.4),
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#22C55E18",
    },
    headerCopy: {
      flex: 1,
      minWidth: 0,
    },
    eyebrow: {
      color: colors.textSecondary,
      fontSize: Math.min(hp(1.1), wp(2.6)),
      fontWeight: "900",
      textTransform: "uppercase",
    },
    title: {
      color: colors.textPrimary,
      fontSize: Math.min(hp(2.1), wp(4.8)),
      fontWeight: "900",
      marginTop: hp(0.15),
    },
    subtitle: {
      color: colors.textSecondary,
      fontSize: Math.min(hp(1.18), wp(2.8)),
      fontWeight: "800",
      marginTop: hp(0.25),
    },
    refreshButton: {
      width: Math.min(hp(4.2), wp(9.4)),
      height: Math.min(hp(4.2), wp(9.4)),
      borderRadius: hp(1.35),
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
    },
    loadingCard: {
      minHeight: hp(20),
      marginHorizontal: wp(4),
      borderRadius: hp(2),
      borderWidth: 1,
      borderColor: colors.cardBorder || colors.border,
      backgroundColor: colors.cardBackground,
      alignItems: "center",
      justifyContent: "center",
    },
    trialBannerWrap: {
      marginHorizontal: wp(4),
    },
    lockedWrap: {
      marginHorizontal: wp(4),
    },
  });
