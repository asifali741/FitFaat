import AppHeader from "@/components/AppHeader";
import {
  DashboardCommandCenter,
  QuickAddBottomSheet,
  type DashboardMoodValue,
  type QuickAddAction,
} from "@/components/dashboard/DashboardCommandCenter";
import { useAppointments } from "@/contexts/AppointmentContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useLiveWalkingProgress } from "@/hooks/useLiveWalkingProgress";
import {
  applyAdaptiveGoalsToJsonResponse,
  buildAdaptiveGoalMetrics,
  loadWeeklyWeightTrendCalibration,
} from "@/utils/adaptiveGoals";
import { tokenStorage } from "@/utils/auth/tokenStorage";
import { getDashboardLocalDateKey } from "@/utils/dashboardCycleGuard";
import {
  getDashboardUserIdentity,
  getStoredDashboardCache,
  getStoredWeeklyTrackingId,
} from "@/utils/dashboardStorage";
import { applyPendingDashboardMutations } from "@/utils/dashboardPendingMutations";
import { getGoalPremiumFeatureCopy } from "@/utils/goalExperience";
import {
  loadGoalDisplayMode,
  type GoalDisplayMode,
} from "@/utils/goalTargetDisplay";
import {
  loadGoalSpineKey,
  type GoalSpineKey,
} from "@/utils/goalSpine";
import { syncLatestHealthData } from "@/utils/healthDataSync";
import {
  mergeExerciseProgressIntoJsonResponse,
} from "@/utils/localExerciseProgress";
import {
  mergeWalkingProgressIntoJsonResponse,
} from "@/utils/localWalkingProgress";
import {
  buildWeeklyNutritionReport,
  saveNutritionReportSnapshot,
} from "@/utils/nutritionInsights";
import { getIsPremiumUser } from "@/utils/premiumAccess";
import {
  buildWeeklyInsights,
  type WeeklyInsight,
} from "@/utils/weeklyInsights";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
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

import {
  getDashboardTargetDay,
  sortByDayDate,
} from "./dashboardWeek";
import type { Day, jsonResponse } from "./types";

const getDayHydration = (day: Day) =>
  Number(day.achieviedHydration ?? day.achievedHydration ?? 0);

const safeAverage = (values: number[]) => {
  const cleanValues = values.filter((value) => Number.isFinite(value));
  if (!cleanValues.length) return 0;
  return cleanValues.reduce((sum, value) => sum + value, 0) / cleanValues.length;
};

const getInsightToneColor = (tone: WeeklyInsight["tone"]) => {
  if (tone === "good") return "#10B981";
  if (tone === "warning") return "#F97316";
  return "#64748B";
};

const parseHealthMetrics = (rawValue: string | null) => {
  if (!rawValue) return null;

  try {
    return JSON.parse(rawValue);
  } catch {
    return null;
  }
};

export default function DashboardAnalyticsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { appointments: localAppointments } = useAppointments();
  const liveWalkingProgress = useLiveWalkingProgress();
  const styles = useMemo(() => getStyles(colors), [colors]);

  const [data, setData] = useState<jsonResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isPremium, setIsPremium] = useState(false);
  const [goalDisplayMode, setGoalDisplayMode] = useState<GoalDisplayMode>("exact");
  const [fitnessGoal, setFitnessGoal] = useState<GoalSpineKey>("unset");
  const [showQuickAddSheet, setShowQuickAddSheet] = useState(false);
  const [selectedMood, setSelectedMood] = useState<DashboardMoodValue | null>(null);
  const moodStorageKey = `dashboardMood:${getDashboardLocalDateKey()}`;

  const loadAnalyticsData = useCallback(async (silent = false) => {
    try {
      if (!silent) {
        setLoading(true);
      }
      setLoadError(null);

      await syncLatestHealthData().catch((error) => {
        console.log("[DashboardAnalytics] Health data sync unavailable:", error);
      });

      const [savedUser, metricsRaw, premiumActive, displayMode, goalKey] = await Promise.all([
        tokenStorage.getUser(),
        AsyncStorage.getItem("fitfaat_health_metrics"),
        getIsPremiumUser(),
        loadGoalDisplayMode().catch(() => "exact" as GoalDisplayMode),
        loadGoalSpineKey().catch(() => "unset" as GoalSpineKey),
      ]);

      const cachedDashboard = await getStoredDashboardCache<jsonResponse>(savedUser);
      const weeklyTrackingId = await getStoredWeeklyTrackingId(savedUser);

      setIsPremium(premiumActive);
      setGoalDisplayMode(displayMode);
      setFitnessGoal(goalKey);

      if (!cachedDashboard?.data) {
        setData(null);
        return;
      }

      const metrics = parseHealthMetrics(metricsRaw);
      const adaptiveMetrics = buildAdaptiveGoalMetrics(savedUser, metrics);
      const adaptivePlan = premiumActive ? "premium" : "free";
      let nextData = cachedDashboard.data;

      nextData = await mergeWalkingProgressIntoJsonResponse(nextData);
      nextData = await mergeExerciseProgressIntoJsonResponse(nextData);
      nextData = await applyPendingDashboardMutations(nextData, {
        userId: getDashboardUserIdentity(savedUser) || savedUser?.id,
        weeklyTrackingId,
        source: "local",
      });

      const weightTrendCalibration = await loadWeeklyWeightTrendCalibration(
        adaptiveMetrics,
        nextData,
        {
          userId: getDashboardUserIdentity(savedUser) || savedUser?.id,
          weeklyTrackingId,
          plan: adaptivePlan,
        }
      );

      nextData = applyAdaptiveGoalsToJsonResponse(nextData, adaptiveMetrics, {
        plan: adaptivePlan,
        weightTrendCalibration,
      });

      setData(nextData);
    } catch (error: any) {
      console.log("[DashboardAnalytics] Unable to load data:", error);
      setLoadError(error?.message || "Unable to load dashboard analytics.");
      setData(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadAnalyticsData(false);
    }, [loadAnalyticsData])
  );

  useEffect(() => {
    let active = true;

    AsyncStorage.getItem(moodStorageKey)
      .then((storedMood) => {
        if (!active) return;
        if (
          storedMood === "strong" ||
          storedMood === "good" ||
          storedMood === "tired" ||
          storedMood === "sore" ||
          storedMood === "stressed"
        ) {
          setSelectedMood(storedMood);
        }
      })
      .catch((error) => {
        console.log("[DashboardAnalytics] Mood load unavailable:", error);
      });

    return () => {
      active = false;
    };
  }, [moodStorageKey]);

  const daysArray: Day[] = useMemo(
    () => (data ? Object.values(data).sort(sortByDayDate) : []),
    [data]
  );
  const nutritionReport = useMemo(
    () => buildWeeklyNutritionReport(daysArray),
    [daysArray]
  );
  const trendMetrics = useMemo(() => {
    const unlockedDays = daysArray.filter((day) => day.status !== "locked");
    const calorieAverage = Math.round(
      safeAverage(unlockedDays.map((day) => Number(day.achievedCalories || 0)))
    );
    const hydrationAverage = safeAverage(unlockedDays.map(getDayHydration)).toFixed(1);
    const loggedDays = unlockedDays.filter(
      (day) => Number(day.achievedCalories || 0) > 0 || getDayHydration(day) > 0
    ).length;

    return [
      {
        label: "Weekly score",
        value: `${nutritionReport.weeklyScore}`,
        icon: "pulse-outline" as keyof typeof Ionicons.glyphMap,
        color: colors.primary,
      },
      {
        label: "Avg calories",
        value: calorieAverage ? calorieAverage.toLocaleString() : "0",
        icon: "flame-outline" as keyof typeof Ionicons.glyphMap,
        color: "#F97316",
      },
      {
        label: "Avg water",
        value: `${hydrationAverage}L`,
        icon: "water-outline" as keyof typeof Ionicons.glyphMap,
        color: "#2E86AB",
      },
      {
        label: "Logged days",
        value: `${loggedDays}/${Math.max(unlockedDays.length, 7)}`,
        icon: "calendar-clear-outline" as keyof typeof Ionicons.glyphMap,
        color: "#10B981",
      },
    ];
  }, [colors.primary, daysArray, nutritionReport.weeklyScore]);
  const weeklyInsights = useMemo(
    () =>
      buildWeeklyInsights(daysArray, { isPremium })
        .filter((insight) => insight.category !== "premiumTeaser")
        .slice(0, 4),
    [daysArray, isPremium]
  );
  const stepPermissionStatus = String(liveWalkingProgress.permissionStatus || "").toLowerCase();
  const showStepPermissionPrompt =
    liveWalkingProgress.hasLoaded &&
    liveWalkingProgress.status !== "loading" &&
    !liveWalkingProgress.hasPedometerPermission &&
    stepPermissionStatus !== "granted" &&
    stepPermissionStatus !== "unavailable" &&
    stepPermissionStatus !== "error";

  useEffect(() => {
    if (!daysArray.length) return;

    saveNutritionReportSnapshot(nutritionReport).catch((error) => {
      console.log("[DashboardAnalytics] Unable to save nutrition report snapshot:", error);
    });
  }, [daysArray.length, nutritionReport]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadAnalyticsData(true);
  }, [loadAnalyticsData]);

  const handleMoodSelect = async (mood: DashboardMoodValue) => {
    setSelectedMood(mood);
    try {
      await AsyncStorage.setItem(moodStorageKey, mood);
    } catch (error) {
      console.log("[DashboardAnalytics] Unable to save mood:", error);
    }
  };

  const getQuickAddTargetDay = useCallback(
    () => getDashboardTargetDay(daysArray),
    [daysArray]
  );

  const handleQuickAddAction = useCallback((action: QuickAddAction) => {
    if (action === "water" || action === "meal") {
      const targetDay = getQuickAddTargetDay();
      if (targetDay) {
        router.push({
          pathname: "/(main)/(dashboard)/DetailsDay",
          params: {
            selectedDay: JSON.stringify(targetDay),
            quickMode: action === "water" ? "hydration" : "meal",
          },
        } as any);
      } else {
        router.push("/(main)/(dashboard)" as any);
      }
      return;
    }

    if (action === "note") {
      router.push("/(main)/(notes)" as any);
      return;
    }

    if (action === "settings") {
      router.push("/(main)/(settings)" as any);
      return;
    }

    if (action === "mealPlanner") {
      router.push("/(main)/(meal-planner)" as any);
      return;
    }

    if (action === "mindfulness") {
      router.push("/(main)/(mindfulness)" as any);
      return;
    }

    if (action === "steps") {
      router.push("/(main)/(steps)" as any);
      return;
    }

    if (action === "workout") {
      if (!isPremium) {
        Alert.alert(
          "Workout supports your goal",
          getGoalPremiumFeatureCopy(fitnessGoal, "workoutModule"),
          [
            { text: "Not now", style: "cancel" },
            { text: "View Premium", onPress: () => router.push("/(main)/(settings)/premium" as any) },
          ]
        );
        return;
      }

      router.push("/(main)/(exercises)/workout" as any);
      return;
    }

    if (action === "appointment") {
      router.push("/(main)/(conference)" as any);
      return;
    }

    if (action === "chat") {
      router.push("/(main)/(conference)/all-user-chats" as any);
    }
  }, [fitnessGoal, getQuickAddTargetDay, isPremium, router]);

  if (loading && !data) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.screenColor }]} edges={["top"]}>
        <AppHeader title="Dashboard Analytics" showBackButton showMenuButton={false} />
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.centerTitle}>Loading analytics</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!data) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.screenColor }]} edges={["top"]}>
        <AppHeader title="Dashboard Analytics" showBackButton showMenuButton={false} />
        <View style={styles.centerState}>
          <View style={styles.emptyIcon}>
            <Ionicons name="analytics-outline" size={Math.min(hp(5), wp(11))} color={colors.primary} />
          </View>
          <Text style={styles.centerTitle}>Analytics are not ready</Text>
          <Text style={styles.centerText}>
            {loadError || "Open the dashboard once your weekly tracking data is available."}
          </Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => loadAnalyticsData(false)}
            activeOpacity={0.85}
          >
            <Ionicons name="refresh-outline" size={Math.min(hp(2), wp(4.5))} color={colors.textOnPrimary} />
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.screenColor }]} edges={["top"]}>
      <AppHeader title="Dashboard Analytics" showBackButton showMenuButton={false} />

      <QuickAddBottomSheet
        visible={showQuickAddSheet}
        colors={colors}
        selectedMood={selectedMood}
        isPremium={isPremium}
        onClose={() => setShowQuickAddSheet(false)}
        onSelectMood={handleMoodSelect}
        onAction={handleQuickAddAction}
      />

      <View style={styles.content}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
              progressBackgroundColor={colors.cardBackground}
            />
          }
        >
          <View style={styles.analyticsSection}>
            <View style={styles.analyticsSectionHeader}>
              <Text style={styles.analyticsEyebrow}>Trends</Text>
              <Text style={styles.analyticsTitle}>Weekly analytics</Text>
            </View>
            <View style={styles.trendGrid}>
              {trendMetrics.map((metric) => (
                <View key={metric.label} style={styles.trendCard}>
                  <View style={[styles.trendIcon, { backgroundColor: `${metric.color}18` }]}>
                    <Ionicons name={metric.icon} size={Math.min(hp(2.2), wp(4.9))} color={metric.color} />
                  </View>
                  <Text style={styles.trendValue} numberOfLines={1} adjustsFontSizeToFit>
                    {metric.value}
                  </Text>
                  <Text style={styles.trendLabel} numberOfLines={1}>
                    {metric.label}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          <DashboardCommandCenter
            days={daysArray}
            appointments={localAppointments}
            chatAlertCount={0}
            streak={null}
            isPremium={isPremium}
            colors={colors}
            selectedMood={selectedMood}
            onOpenQuickAdd={() => setShowQuickAddSheet(true)}
            onQuickAddAction={handleQuickAddAction}
            showStepPermissionPrompt={showStepPermissionPrompt}
            stepCounterReady={liveWalkingProgress.hasPedometerPermission || stepPermissionStatus === "granted"}
            onOpenStepPermissions={() => router.push("/(main)/(settings)/permissions" as any)}
            goalDisplayMode={goalDisplayMode}
            fitnessGoal={fitnessGoal}
            nutritionReport={nutritionReport}
          />

          <View style={styles.analyticsSection}>
            <View style={styles.analyticsSectionHeader}>
              <Text style={styles.analyticsEyebrow}>Insights</Text>
              <Text style={styles.analyticsTitle}>Weekly patterns</Text>
            </View>
            <View style={styles.insightList}>
              {weeklyInsights.map((insight) => {
                const toneColor = getInsightToneColor(insight.tone);
                return (
                  <View key={insight.id} style={styles.insightCard}>
                    <View style={[styles.insightIcon, { backgroundColor: `${toneColor}18` }]}>
                      <Ionicons name={insight.icon} size={Math.min(hp(2.2), wp(4.9))} color={toneColor} />
                    </View>
                    <View style={styles.insightCopy}>
                      <View style={styles.insightTitleRow}>
                        <Text style={styles.insightTitle} numberOfLines={1} adjustsFontSizeToFit>
                          {insight.title}
                        </Text>
                        {insight.value ? (
                          <Text style={[styles.insightValue, { color: toneColor }]}>{insight.value}</Text>
                        ) : null}
                      </View>
                      <Text style={styles.insightBody} numberOfLines={3}>
                        {insight.body}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>

          <View style={styles.analyticsSection}>
            <View style={styles.analyticsSectionHeader}>
              <Text style={styles.analyticsEyebrow}>Goal adjustments</Text>
              <Text style={styles.analyticsTitle}>Why targets changed</Text>
            </View>
            <TouchableOpacity
              style={styles.doctorReportCard}
              onPress={() => router.push("/(main)/(goal-review)" as any)}
              activeOpacity={0.84}
              accessibilityRole="button"
              accessibilityLabel="Open Goal Review"
            >
              <View style={styles.doctorReportIcon}>
                <Ionicons name="trending-up-outline" size={Math.min(hp(2.5), wp(5.6))} color={colors.primary} />
              </View>
              <View style={styles.doctorReportCopy}>
                <Text style={styles.doctorReportTitle}>Goal Review</Text>
                <Text style={styles.doctorReportBody}>
                  See the reasoning behind adjusted calorie, hydration, and weekly focus targets.
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={Math.min(hp(2.1), wp(4.8))} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.analyticsSection}>
            <View style={styles.analyticsSectionHeader}>
              <Text style={styles.analyticsEyebrow}>Care report</Text>
              <Text style={styles.analyticsTitle}>Shareable progress</Text>
            </View>
            <TouchableOpacity
              style={styles.doctorReportCard}
              onPress={() => router.push("/(main)/(doctor-report)" as any)}
              activeOpacity={0.84}
              accessibilityRole="button"
              accessibilityLabel="Open Doctor Report"
            >
              <View style={styles.doctorReportIcon}>
                <Ionicons name="document-text-outline" size={Math.min(hp(2.5), wp(5.6))} color={colors.primary} />
              </View>
              <View style={styles.doctorReportCopy}>
                <Text style={styles.doctorReportTitle}>Doctor Report</Text>
                <Text style={styles.doctorReportBody}>
                  Open the clinical progress view when you need to share your week with care providers.
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={Math.min(hp(2.1), wp(4.8))} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </ScrollView>

        <TouchableOpacity
          style={styles.quickAddFab}
          onPress={() => setShowQuickAddSheet(true)}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Open quick add"
        >
          <Ionicons name="add" size={Math.min(hp(3.2), wp(7))} color={colors.textOnPrimary} />
        </TouchableOpacity>
      </View>
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
    scroll: {
      flex: 1,
      width: "100%",
    },
    scrollContent: {
      paddingTop: hp(1.4),
      paddingBottom: hp(13),
    },
    centerState: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: wp(8),
    },
    centerTitle: {
      color: colors.textPrimary,
      marginTop: hp(1.4),
      fontSize: Math.min(hp(2.1), wp(4.8)),
      fontWeight: "900",
      textAlign: "center",
    },
    centerText: {
      color: colors.textSecondary,
      marginTop: hp(0.7),
      fontSize: Math.min(hp(1.38), wp(3.25)),
      lineHeight: hp(2.05),
      fontWeight: "700",
      textAlign: "center",
    },
    emptyIcon: {
      width: Math.min(hp(8.2), wp(18)),
      height: Math.min(hp(8.2), wp(18)),
      borderRadius: Math.min(hp(4.1), wp(9)),
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: `${colors.primary}14`,
    },
    retryButton: {
      marginTop: hp(2),
      minHeight: hp(4.8),
      borderRadius: hp(2.4),
      paddingHorizontal: wp(5),
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: wp(1.6),
      backgroundColor: colors.primary,
    },
    retryText: {
      color: colors.textOnPrimary,
      fontSize: Math.min(hp(1.55), wp(3.6)),
      fontWeight: "900",
    },
    analyticsSection: {
      paddingHorizontal: wp(4),
      marginBottom: hp(1.4),
    },
    analyticsSectionHeader: {
      marginBottom: hp(1),
    },
    analyticsEyebrow: {
      color: colors.primary,
      fontSize: Math.min(hp(1.05), wp(2.55)),
      fontWeight: "900",
      textTransform: "uppercase",
    },
    analyticsTitle: {
      color: colors.textPrimary,
      fontSize: Math.min(hp(1.85), wp(4.35)),
      fontWeight: "900",
      marginTop: hp(0.15),
    },
    trendGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: wp(2.2),
    },
    trendCard: {
      width: "48%",
      minHeight: hp(9.4),
      borderRadius: hp(1.5),
      borderWidth: 1,
      borderColor: colors.cardBorder || colors.border,
      backgroundColor: colors.cardBackground,
      paddingHorizontal: wp(2.5),
      paddingVertical: hp(1.1),
      justifyContent: "center",
    },
    trendIcon: {
      width: Math.min(hp(3.5), wp(7.8)),
      height: Math.min(hp(3.5), wp(7.8)),
      borderRadius: Math.min(hp(1.75), wp(3.9)),
      alignItems: "center",
      justifyContent: "center",
      marginBottom: hp(0.75),
    },
    trendValue: {
      color: colors.textPrimary,
      fontSize: Math.min(hp(1.75), wp(4.05)),
      fontWeight: "900",
    },
    trendLabel: {
      color: colors.textSecondary,
      fontSize: Math.min(hp(1.08), wp(2.55)),
      fontWeight: "800",
      marginTop: hp(0.15),
    },
    insightList: {
      gap: hp(0.9),
    },
    insightCard: {
      minHeight: hp(8.6),
      borderRadius: hp(1.4),
      borderWidth: 1,
      borderColor: colors.cardBorder || colors.border,
      backgroundColor: colors.cardBackground,
      paddingHorizontal: wp(3),
      paddingVertical: hp(1),
      flexDirection: "row",
      alignItems: "flex-start",
      gap: wp(2.4),
    },
    insightIcon: {
      width: Math.min(hp(3.8), wp(8.5)),
      height: Math.min(hp(3.8), wp(8.5)),
      borderRadius: Math.min(hp(1.9), wp(4.25)),
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    },
    insightCopy: {
      flex: 1,
      minWidth: 0,
    },
    insightTitleRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: wp(2),
    },
    insightTitle: {
      flex: 1,
      minWidth: 0,
      color: colors.textPrimary,
      fontSize: Math.min(hp(1.35), wp(3.15)),
      fontWeight: "900",
    },
    insightValue: {
      fontSize: Math.min(hp(1.12), wp(2.65)),
      fontWeight: "900",
      flexShrink: 0,
    },
    insightBody: {
      color: colors.textSecondary,
      fontSize: Math.min(hp(1.12), wp(2.65)),
      lineHeight: hp(1.65),
      fontWeight: "700",
      marginTop: hp(0.28),
    },
    doctorReportCard: {
      minHeight: hp(8.8),
      borderRadius: hp(1.5),
      borderWidth: 1,
      borderColor: `${colors.primary}32`,
      backgroundColor: colors.cardBackground,
      paddingHorizontal: wp(3),
      paddingVertical: hp(1.1),
      flexDirection: "row",
      alignItems: "center",
      gap: wp(2.4),
    },
    doctorReportIcon: {
      width: Math.min(hp(4.5), wp(10)),
      height: Math.min(hp(4.5), wp(10)),
      borderRadius: hp(1.3),
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: `${colors.primary}14`,
      flexShrink: 0,
    },
    doctorReportCopy: {
      flex: 1,
      minWidth: 0,
    },
    doctorReportTitle: {
      color: colors.textPrimary,
      fontSize: Math.min(hp(1.45), wp(3.4)),
      fontWeight: "900",
    },
    doctorReportBody: {
      color: colors.textSecondary,
      fontSize: Math.min(hp(1.08), wp(2.55)),
      lineHeight: hp(1.58),
      fontWeight: "700",
      marginTop: hp(0.22),
    },
    quickAddFab: {
      position: "absolute",
      bottom: hp(4),
      right: wp(4),
      width: Math.min(hp(6.2), wp(13.5)),
      height: Math.min(hp(6.2), wp(13.5)),
      borderRadius: Math.min(hp(3.1), wp(6.75)),
      justifyContent: "center",
      alignItems: "center",
      elevation: 14,
      shadowColor: colors.primary,
      shadowOffset: {
        width: 0,
        height: hp(0.75),
      },
      shadowOpacity: 0.38,
      shadowRadius: wp(2.2),
      borderWidth: wp(0.45),
      borderColor: "rgba(255, 255, 255, 0.55)",
      backgroundColor: colors.primary,
    },
  });
