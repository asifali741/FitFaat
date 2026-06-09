import AppHeader from "@/components/AppHeader";
import { useTheme } from "@/contexts/ThemeContext";
import {
  applyAdaptiveGoalsToJsonResponse,
  buildAdaptiveGoalMetrics,
  loadWeeklyWeightTrendCalibration,
} from "@/utils/adaptiveGoals";
import { tokenStorage } from "@/utils/auth/tokenStorage";
import {
  getBurnedCaloriesTarget,
  getProgressValue,
  getSingleMetricProgress,
} from "@/utils/dashboardProgress";
import {
  getDashboardUserIdentity,
  getStoredDashboardCache,
  getStoredWeeklyTrackingId,
} from "@/utils/dashboardStorage";
import { applyPendingDashboardMutations } from "@/utils/dashboardPendingMutations";
import {
  formatCalorieTarget,
  formatHydrationTarget,
  getCalorieTargetProgress,
  getHydrationTargetProgress,
  loadGoalDisplayMode,
  type GoalDisplayMode,
} from "@/utils/goalTargetDisplay";
import { loadGoalSpineKey, type GoalSpineKey } from "@/utils/goalSpine";
import { syncLatestHealthData } from "@/utils/healthDataSync";
import {
  getExerciseCaloriesBurned,
  mergeExerciseProgressIntoJsonResponse,
} from "@/utils/localExerciseProgress";
import {
  DEFAULT_STEP_GOAL,
  mergeWalkingProgressIntoJsonResponse,
} from "@/utils/localWalkingProgress";
import { localSyncEvents } from "@/utils/localSyncEvents";
import { buildWeeklyNutritionReport } from "@/utils/nutritionInsights";
import { getIsPremiumUser } from "@/utils/premiumAccess";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  AppState,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { BarChart, LineChart, ProgressChart } from "react-native-chart-kit";
import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from "react-native-responsive-screen";
import { SafeAreaView } from "react-native-safe-area-context";

import { sortByDayDate } from "./dashboardWeek";
import type { Day, jsonResponse } from "./types";

type ChartMetric = {
  key: string;
  title: string;
  subtitle: string;
  color: string;
  icon: keyof typeof Ionicons.glyphMap;
  labels: string[];
  values: number[];
  suffix?: string;
};

const toNumber = (value: unknown, fallback = 0) => {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
};

const clampProgress = (value: number) => Math.max(0, Math.min(1, value));

const withOpacity = (hexColor: string, opacity: number) => {
  const match = hexColor.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
  if (!match) return hexColor;
  const red = parseInt(match[1], 16);
  const green = parseInt(match[2], 16);
  const blue = parseInt(match[3], 16);
  return `rgba(${red}, ${green}, ${blue}, ${opacity})`;
};

const parseHealthMetrics = (rawValue: string | null) => {
  if (!rawValue) return null;

  try {
    return JSON.parse(rawValue);
  } catch {
    return null;
  }
};

const getDayHydration = (day: Day) =>
  toNumber(day.achieviedHydration ?? (day as any).achievedHydration ?? (day as any).hydrationIntake);

const getDaySteps = (day: Day) =>
  Math.round(toNumber(day.walkingSteps ?? (day as any).steps ?? (day as any).stepCount));

const getDayStepGoal = (day: Day) => {
  const goal = toNumber(
    day.walkingStepGoal ??
      (day as any).stepGoal ??
      (day as any).targetSteps ??
      (day as any).dailyStepGoal
  );
  return goal > 0 ? Math.round(goal) : DEFAULT_STEP_GOAL;
};

const getDateLabel = (day: Day) => {
  const parsed = day.date ? new Date(day.date) : null;
  if (parsed && !Number.isNaN(parsed.getTime())) {
    return parsed.toLocaleDateString(undefined, { weekday: "short" });
  }
  return `D${day.dayNo}`;
};

const buildMetric = ({
  key,
  title,
  subtitle,
  color,
  icon,
  labels,
  values,
  suffix,
}: ChartMetric): ChartMetric => ({
  key,
  title,
  subtitle,
  color,
  icon,
  labels,
  values: values.map((value) => Math.max(0, Math.round(value))),
  suffix,
});

export default function DashboardChartsScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => getStyles(colors), [colors]);

  const [data, setData] = useState<jsonResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isPremium, setIsPremium] = useState(false);
  const [goalDisplayMode, setGoalDisplayMode] = useState<GoalDisplayMode>("exact");
  const [fitnessGoal, setFitnessGoal] = useState<GoalSpineKey>("unset");

  const chartWidth = Math.min(wp(92), 430);
  const chartConfig = useMemo(
    () => ({
      backgroundGradientFrom: colors.cardBackground,
      backgroundGradientTo: colors.cardBackground,
      decimalPlaces: 0,
      color: (opacity = 1) => `rgba(20, 184, 166, ${opacity})`,
      labelColor: (opacity = 1) => colors.textSecondary || `rgba(100, 116, 139, ${opacity})`,
      propsForDots: {
        r: "4",
        strokeWidth: "2",
        stroke: colors.primary,
      },
      propsForBackgroundLines: {
        stroke: colors.cardBorder || colors.border || "#E2E8F0",
      },
      barPercentage: 0.58,
    }),
    [colors]
  );

  const loadChartsData = useCallback(async (silent = false) => {
    try {
      if (!silent) {
        setLoading(true);
      }
      setLoadError(null);

      await syncLatestHealthData().catch((error) => {
        console.log("[DashboardCharts] Health data sync unavailable:", error);
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
      console.log("[DashboardCharts] Unable to load data:", error);
      setLoadError(error?.message || "Unable to load dashboard charts.");
      setData(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadChartsData(false);
    }, [loadChartsData])
  );

  useEffect(() => {
    const unsubscribeRestore = localSyncEvents.subscribe(() => {
      loadChartsData(true);
    });
    const appStateSubscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        loadChartsData(true);
      }
    });

    return () => {
      unsubscribeRestore();
      appStateSubscription.remove();
    };
  }, [loadChartsData]);

  const daysArray = useMemo(
    () => (data ? Object.values(data).sort(sortByDayDate) : []),
    [data]
  );

  const chartDays = useMemo(
    () => daysArray.filter((day) => day.status !== "locked"),
    [daysArray]
  );

  const nutritionReport = useMemo(
    () => buildWeeklyNutritionReport(chartDays),
    [chartDays]
  );

  const labels = useMemo(
    () => chartDays.map(getDateLabel),
    [chartDays]
  );

  const adaptivePlan = isPremium ? "premium" : "free";
  const latestDay = chartDays.find((day) => day.status === "active") || chartDays[chartDays.length - 1] || null;
  const goalLabel = String(fitnessGoal || "current").replace(/_/g, " ");

  const progressSummary = useMemo(() => {
    const calorieProgress = chartDays.map(
      (day) => getCalorieTargetProgress(day, goalDisplayMode, adaptivePlan).percent / 100
    );
    const hydrationProgress = chartDays.map(
      (day) => getHydrationTargetProgress(day, goalDisplayMode, adaptivePlan).percent / 100
    );
    const stepProgress = chartDays.map((day) => getDaySteps(day) / Math.max(getDayStepGoal(day), 1));
    const goalCompletion = chartDays.map((day) => {
      const food = getCalorieTargetProgress(day, goalDisplayMode, adaptivePlan).percent / 100;
      const water = getHydrationTargetProgress(day, goalDisplayMode, adaptivePlan).percent / 100;
      return (food + water) / 2;
    });

    const average = (values: number[]) =>
      values.length
        ? clampProgress(values.reduce((sum, value) => sum + value, 0) / values.length)
        : 0;

    return {
      labels: ["Cal", "Water", "Steps", "Goals"],
      data: [
        average(calorieProgress),
        average(hydrationProgress),
        average(stepProgress),
        average(goalCompletion),
      ],
      colors: [
        "#F97316",
        "#2E86AB",
        "#14B8A6",
        colors.primary,
      ],
    };
  }, [adaptivePlan, chartDays, colors.primary, goalDisplayMode]);

  const chartMetrics = useMemo<ChartMetric[]>(() => {
    const calories = chartDays.map((day) => getProgressValue(day.achievedCalories));
    const hydration = chartDays.map((day) => getDayHydration(day));
    const steps = chartDays.map((day) => getDaySteps(day));
    const workouts = chartDays.map((day) => getExerciseCaloriesBurned(day));

    return [
      buildMetric({
        key: "calories",
        title: "Calories",
        subtitle: "Daily food calories across your active plan days",
        color: "#F97316",
        icon: "flame-outline",
        labels,
        values: calories,
        suffix: " cal",
      }),
      buildMetric({
        key: "hydration",
        title: "Hydration",
        subtitle: "Water intake in liters by day",
        color: "#2E86AB",
        icon: "water-outline",
        labels,
        values: hydration,
        suffix: "L",
      }),
      buildMetric({
        key: "steps",
        title: "Steps",
        subtitle: "Walking totals from local and synced step data",
        color: "#14B8A6",
        icon: "footsteps-outline",
        labels,
        values: steps,
      }),
      buildMetric({
        key: "workouts",
        title: "Workout Burn",
        subtitle: "Logged exercise calories by day",
        color: "#10B981",
        icon: "barbell-outline",
        labels,
        values: workouts,
        suffix: " cal",
      }),
    ];
  }, [chartDays, labels]);

  const targetRows = useMemo(
    () =>
      chartDays.map((day) => {
        const calorieProgress = getCalorieTargetProgress(day, goalDisplayMode, adaptivePlan);
        const hydrationProgress = getHydrationTargetProgress(day, goalDisplayMode, adaptivePlan);
        return {
          key: `${day.dayNo}-${day.date}`,
          label: getDateLabel(day),
          dayNo: day.dayNo,
          calories: Math.round(getProgressValue(day.achievedCalories)),
          calorieTarget: formatCalorieTarget(day, goalDisplayMode, adaptivePlan),
          calorieProgress: clampProgress(calorieProgress.percent / 100),
          hydration: getDayHydration(day).toFixed(1),
          hydrationTarget: formatHydrationTarget(day, goalDisplayMode, adaptivePlan),
          hydrationProgress: clampProgress(hydrationProgress.percent / 100),
        };
      }),
    [adaptivePlan, chartDays, goalDisplayMode]
  );

  const adaptiveCards = useMemo(() => {
    if (!latestDay) return [];
    const adjustment = Math.round(toNumber(latestDay.weightTrendCaloriesAdjustment));
    const confidence = Math.round(toNumber(latestDay.weightTrendConfidence));
    const workoutTarget = getBurnedCaloriesTarget(latestDay);
    const workoutProgress = getSingleMetricProgress(getExerciseCaloriesBurned(latestDay), workoutTarget);

    return [
      {
        label: "Calorie Target",
        value: formatCalorieTarget(latestDay, goalDisplayMode, adaptivePlan),
        body: "Current adjusted target used in journey and analytics views.",
        icon: "flame-outline" as keyof typeof Ionicons.glyphMap,
        color: "#F97316",
      },
      {
        label: "Hydration Target",
        value: `${formatHydrationTarget(latestDay, goalDisplayMode, adaptivePlan)}L`,
        body: "Current water goal after profile and plan adjustments.",
        icon: "water-outline" as keyof typeof Ionicons.glyphMap,
        color: "#2E86AB",
      },
      {
        label: "Weight Trend",
        value: latestDay.weightTrendStatus ? latestDay.weightTrendStatus : "Learning",
        body: confidence > 0 ? `${confidence}% signal confidence` : "Log more weight and daily progress for calibration.",
        icon: "scale-outline" as keyof typeof Ionicons.glyphMap,
        color: colors.primary,
      },
      {
        label: "Workout Target",
        value: workoutTarget > 0 ? `${workoutProgress}%` : "No target",
        body: adjustment !== 0 ? `Calories adjusted ${adjustment > 0 ? "+" : ""}${adjustment} kcal.` : "No weekly calorie adjustment applied.",
        icon: "barbell-outline" as keyof typeof Ionicons.glyphMap,
        color: "#10B981",
      },
    ];
  }, [adaptivePlan, colors.primary, goalDisplayMode, latestDay]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadChartsData(true);
  }, [loadChartsData]);

  const renderLineChart = (metric: ChartMetric) => (
    <View key={`${metric.key}-line`} style={styles.chartCard}>
      <View style={styles.chartHeader}>
        <View style={[styles.chartIcon, { backgroundColor: `${metric.color}18` }]}>
          <Ionicons name={metric.icon} size={Math.min(hp(2.2), wp(4.9))} color={metric.color} />
        </View>
        <View style={styles.chartCopy}>
          <Text style={styles.chartTitle}>{metric.title} Trend</Text>
          <Text style={styles.chartSubtitle}>{metric.subtitle}</Text>
        </View>
      </View>
      <LineChart
        data={{
          labels: metric.labels,
          datasets: [{ data: metric.values.length ? metric.values : [0], color: () => metric.color, strokeWidth: 3 }],
        }}
        width={chartWidth}
        height={hp(24)}
        chartConfig={{ ...chartConfig, color: (opacity = 1) => withOpacity(metric.color, opacity) }}
        bezier
        fromZero
        style={styles.chart}
      />
    </View>
  );

  const renderBarChart = (metric: ChartMetric) => (
    <View key={`${metric.key}-bar`} style={styles.chartCard}>
      <View style={styles.chartHeader}>
        <View style={[styles.chartIcon, { backgroundColor: `${metric.color}18` }]}>
          <Ionicons name={metric.icon} size={Math.min(hp(2.2), wp(4.9))} color={metric.color} />
        </View>
        <View style={styles.chartCopy}>
          <Text style={styles.chartTitle}>{metric.title} Bars</Text>
          <Text style={styles.chartSubtitle}>Daily totals for fast comparison.</Text>
        </View>
      </View>
      <BarChart
        data={{
          labels: metric.labels,
          datasets: [{ data: metric.values.length ? metric.values : [0] }],
        }}
        width={chartWidth}
        height={hp(24)}
        yAxisLabel=""
        yAxisSuffix={metric.suffix || ""}
        chartConfig={{
          ...chartConfig,
          color: (opacity = 1) => withOpacity(metric.color, opacity),
        }}
        fromZero
        showValuesOnTopOfBars
        style={styles.chart}
      />
    </View>
  );

  if (loading && !data) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.screenColor }]} edges={["top"]}>
        <AppHeader title="View Charts" showBackButton showMenuButton={false} />
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.centerTitle}>Loading charts</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!data || !chartDays.length) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.screenColor }]} edges={["top"]}>
        <AppHeader title="View Charts" showBackButton showMenuButton={false} />
        <View style={styles.centerState}>
          <View style={styles.emptyIcon}>
            <Ionicons name="bar-chart-outline" size={Math.min(hp(5), wp(11))} color={colors.primary} />
          </View>
          <Text style={styles.centerTitle}>Charts are not ready</Text>
          <Text style={styles.centerText}>
            {loadError || "Open the dashboard once weekly tracking data is available, then come back to view charts."}
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => loadChartsData(false)} activeOpacity={0.85}>
            <Ionicons name="refresh-outline" size={Math.min(hp(2), wp(4.5))} color={colors.textOnPrimary} />
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.screenColor }]} edges={["top"]}>
      <AppHeader title="View Charts" showBackButton showMenuButton={false} />
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
        <View style={styles.heroCard}>
          <View style={styles.heroIcon}>
            <Ionicons name="stats-chart-outline" size={Math.min(hp(3.6), wp(8))} color={colors.textOnPrimary} />
          </View>
          <View style={styles.heroCopy}>
            <Text style={styles.heroEyebrow}>Historical view</Text>
            <Text style={styles.heroTitle}>Charts and trends</Text>
            <Text style={styles.heroBody}>
              Explore calories, hydration, steps, workouts, targets, and adaptive changes for {goalLabel} without crowding the dashboard.
            </Text>
          </View>
        </View>

        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{nutritionReport.weeklyScore}</Text>
            <Text style={styles.summaryLabel}>Weekly score</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{chartDays.length}</Text>
            <Text style={styles.summaryLabel}>Tracked days</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionEyebrow}>Circular Summary</Text>
          <Text style={styles.sectionTitle}>Weekly completion</Text>
          <View style={styles.chartCard}>
            <ProgressChart
              data={progressSummary}
              width={chartWidth}
              height={hp(25)}
              strokeWidth={12}
              radius={30}
              chartConfig={chartConfig}
              hideLegend={false}
              withCustomBarColorFromData
              style={styles.chart}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionEyebrow}>Line Charts</Text>
          <Text style={styles.sectionTitle}>Trend exploration</Text>
          {chartMetrics.map(renderLineChart)}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionEyebrow}>Bar Charts</Text>
          <Text style={styles.sectionTitle}>Daily comparison</Text>
          {chartMetrics.map(renderBarChart)}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionEyebrow}>Targets</Text>
          <Text style={styles.sectionTitle}>Achieved vs target</Text>
          <View style={styles.targetCard}>
            {targetRows.map((row) => (
              <View key={row.key} style={styles.targetRow}>
                <View style={styles.targetHeader}>
                  <Text style={styles.targetDay}>Day {row.dayNo} · {row.label}</Text>
                  <Text style={styles.targetStatus}>{Math.round(((row.calorieProgress + row.hydrationProgress) / 2) * 100)}%</Text>
                </View>
                <View style={styles.targetMetric}>
                  <Text style={styles.targetLabel}>Calories</Text>
                  <Text style={styles.targetValue}>{row.calories.toLocaleString()} / {row.calorieTarget}</Text>
                </View>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${row.calorieProgress * 100}%`, backgroundColor: "#F97316" }]} />
                </View>
                <View style={styles.targetMetric}>
                  <Text style={styles.targetLabel}>Water</Text>
                  <Text style={styles.targetValue}>{row.hydration}L / {row.hydrationTarget}L</Text>
                </View>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${row.hydrationProgress * 100}%`, backgroundColor: "#2E86AB" }]} />
                </View>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionEyebrow}>Adaptive Goals</Text>
          <Text style={styles.sectionTitle}>Target performance</Text>
          <View style={styles.adaptiveGrid}>
            {adaptiveCards.map((card) => (
              <View key={card.label} style={styles.adaptiveCard}>
                <View style={[styles.adaptiveIcon, { backgroundColor: `${card.color}18` }]}>
                  <Ionicons name={card.icon} size={Math.min(hp(2.2), wp(4.9))} color={card.color} />
                </View>
                <Text style={styles.adaptiveLabel}>{card.label}</Text>
                <Text style={styles.adaptiveValue} numberOfLines={1} adjustsFontSizeToFit>{card.value}</Text>
                <Text style={styles.adaptiveBody}>{card.body}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const getStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    scroll: {
      flex: 1,
      width: "100%",
    },
    scrollContent: {
      paddingTop: hp(1.4),
      paddingBottom: hp(5),
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
    heroCard: {
      marginHorizontal: wp(4),
      marginBottom: hp(1.3),
      borderRadius: hp(1.8),
      padding: wp(4),
      flexDirection: "row",
      alignItems: "center",
      gap: wp(3),
      backgroundColor: colors.cardBackground,
      borderWidth: 1,
      borderColor: colors.cardBorder || colors.border,
    },
    heroIcon: {
      width: Math.min(hp(6.2), wp(13.5)),
      height: Math.min(hp(6.2), wp(13.5)),
      borderRadius: Math.min(hp(3.1), wp(6.75)),
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.primary,
      flexShrink: 0,
    },
    heroCopy: {
      flex: 1,
      minWidth: 0,
    },
    heroEyebrow: {
      color: colors.primary,
      fontSize: Math.min(hp(1.05), wp(2.55)),
      fontWeight: "900",
      textTransform: "uppercase",
    },
    heroTitle: {
      color: colors.textPrimary,
      fontSize: Math.min(hp(2.1), wp(4.9)),
      fontWeight: "900",
      marginTop: hp(0.15),
    },
    heroBody: {
      color: colors.textSecondary,
      fontSize: Math.min(hp(1.2), wp(2.85)),
      lineHeight: hp(1.78),
      fontWeight: "700",
      marginTop: hp(0.35),
    },
    summaryRow: {
      flexDirection: "row",
      gap: wp(2.4),
      paddingHorizontal: wp(4),
      marginBottom: hp(1.4),
    },
    summaryCard: {
      flex: 1,
      minHeight: hp(8.4),
      borderRadius: hp(1.4),
      paddingHorizontal: wp(3),
      paddingVertical: hp(1.1),
      backgroundColor: colors.cardBackground,
      borderWidth: 1,
      borderColor: colors.cardBorder || colors.border,
      justifyContent: "center",
    },
    summaryValue: {
      color: colors.textPrimary,
      fontSize: Math.min(hp(2.1), wp(4.9)),
      fontWeight: "900",
    },
    summaryLabel: {
      color: colors.textSecondary,
      fontSize: Math.min(hp(1.12), wp(2.7)),
      fontWeight: "800",
      marginTop: hp(0.2),
    },
    section: {
      paddingHorizontal: wp(4),
      marginBottom: hp(1.5),
    },
    sectionEyebrow: {
      color: colors.primary,
      fontSize: Math.min(hp(1.05), wp(2.55)),
      fontWeight: "900",
      textTransform: "uppercase",
    },
    sectionTitle: {
      color: colors.textPrimary,
      fontSize: Math.min(hp(1.85), wp(4.35)),
      fontWeight: "900",
      marginTop: hp(0.15),
      marginBottom: hp(1),
    },
    chartCard: {
      overflow: "hidden",
      borderRadius: hp(1.6),
      borderWidth: 1,
      borderColor: colors.cardBorder || colors.border,
      backgroundColor: colors.cardBackground,
      marginBottom: hp(1),
      paddingTop: hp(1.1),
      alignItems: "center",
    },
    chartHeader: {
      width: "100%",
      flexDirection: "row",
      alignItems: "center",
      gap: wp(2.4),
      paddingHorizontal: wp(3),
      marginBottom: hp(0.4),
    },
    chartIcon: {
      width: Math.min(hp(4), wp(8.8)),
      height: Math.min(hp(4), wp(8.8)),
      borderRadius: Math.min(hp(2), wp(4.4)),
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    },
    chartCopy: {
      flex: 1,
      minWidth: 0,
    },
    chartTitle: {
      color: colors.textPrimary,
      fontSize: Math.min(hp(1.55), wp(3.65)),
      fontWeight: "900",
    },
    chartSubtitle: {
      color: colors.textSecondary,
      fontSize: Math.min(hp(1.08), wp(2.55)),
      lineHeight: hp(1.55),
      fontWeight: "700",
      marginTop: hp(0.18),
    },
    chart: {
      borderRadius: hp(1.6),
    },
    targetCard: {
      borderRadius: hp(1.6),
      borderWidth: 1,
      borderColor: colors.cardBorder || colors.border,
      backgroundColor: colors.cardBackground,
      padding: wp(3),
      gap: hp(1),
    },
    targetRow: {
      borderRadius: hp(1.3),
      backgroundColor: colors.surface || colors.screenColor,
      borderWidth: 1,
      borderColor: colors.cardBorder || colors.border,
      padding: wp(3),
      gap: hp(0.65),
    },
    targetHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: wp(2),
    },
    targetDay: {
      color: colors.textPrimary,
      fontSize: Math.min(hp(1.32), wp(3.15)),
      fontWeight: "900",
    },
    targetStatus: {
      color: colors.primary,
      fontSize: Math.min(hp(1.2), wp(2.85)),
      fontWeight: "900",
    },
    targetMetric: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: wp(2),
    },
    targetLabel: {
      color: colors.textSecondary,
      fontSize: Math.min(hp(1.08), wp(2.55)),
      fontWeight: "800",
    },
    targetValue: {
      color: colors.textPrimary,
      fontSize: Math.min(hp(1.08), wp(2.55)),
      fontWeight: "900",
    },
    progressTrack: {
      height: hp(0.75),
      borderRadius: hp(0.38),
      overflow: "hidden",
      backgroundColor: colors.cardBorder || colors.border,
    },
    progressFill: {
      height: "100%",
      borderRadius: hp(0.38),
    },
    adaptiveGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: wp(2.4),
    },
    adaptiveCard: {
      width: "48%",
      minHeight: hp(15.5),
      borderRadius: hp(1.5),
      borderWidth: 1,
      borderColor: colors.cardBorder || colors.border,
      backgroundColor: colors.cardBackground,
      padding: wp(3),
    },
    adaptiveIcon: {
      width: Math.min(hp(3.8), wp(8.5)),
      height: Math.min(hp(3.8), wp(8.5)),
      borderRadius: Math.min(hp(1.9), wp(4.25)),
      alignItems: "center",
      justifyContent: "center",
      marginBottom: hp(0.8),
    },
    adaptiveLabel: {
      color: colors.textSecondary,
      fontSize: Math.min(hp(1.02), wp(2.45)),
      fontWeight: "900",
      textTransform: "uppercase",
    },
    adaptiveValue: {
      color: colors.textPrimary,
      fontSize: Math.min(hp(1.58), wp(3.7)),
      fontWeight: "900",
      marginTop: hp(0.18),
    },
    adaptiveBody: {
      color: colors.textSecondary,
      fontSize: Math.min(hp(1.05), wp(2.5)),
      lineHeight: hp(1.55),
      fontWeight: "700",
      marginTop: hp(0.45),
    },
  });
