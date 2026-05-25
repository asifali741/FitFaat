import AppHeader from "@/components/AppHeader";
import { FeatureLimitBanner } from "@/components/common/FeatureLimitBanner";
import { PremiumTeaserCard } from "@/components/common/PremiumTeaserCard";
import { ActivityHeatmap } from "@/components/dashboard/ActivityHeatmap";
import { useTheme } from "@/contexts/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { BarChart, LineChart, PieChart, ProgressChart } from "react-native-chart-kit";
import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from "react-native-responsive-screen";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Circle, Line, Path } from "react-native-svg";
import { tokenStorage } from "@/utils/auth/tokenStorage";
import {
  applyAdaptiveGoalsToJsonResponse,
  buildAdaptiveGoalMetrics,
  loadAdaptiveGoalCarryForward,
  loadWeeklyWeightTrendCalibration,
} from "@/utils/adaptiveGoals";
import {
  getDashboardCalorieSummary,
  getDashboardCombinedProgress,
  getDashboardGoalProgress,
  getDashboardHealthScore,
  getHealthScorePlanExplanation,
  getHydrationValue,
  getPremiumScoreChangeExplanation,
  getSingleMetricProgress,
  getWeeklyHealthScoreTrend,
  HEALTH_SCORE_DISCLAIMER,
  HEALTH_SCORE_WEIGHTS,
} from "@/utils/dashboardProgress";
import { mergeExerciseProgressIntoJsonResponse } from "@/utils/localExerciseProgress";
import {
  mergeWalkingProgressIntoJsonResponse,
} from "@/utils/localWalkingProgress";
import {
  getStoredDashboardCache,
  getStoredWeeklyTrackingId,
} from "@/utils/dashboardStorage";
import { FREE_PLAN_LIMITS, getFeatureAccessStatus, type FeatureAccessStatus } from "@/utils/featureAccess";
import { syncLatestHealthData } from "@/utils/healthDataSync";
import { Day, jsonResponse } from "./types";

// --------------- Helpers ---------------
const clampPercent = (achieved: number, target: number) =>
  target > 0 ? Math.min(Math.round((achieved / target) * 100), 100) : 0;

const labelForDay = (day: Day) => `D${day.dayNo}`;

const goalLabels: Record<number, string> = {
  1: "Weight Loss",
  2: "Muscle Gain",
  3: "Weight Gain",
};

const getFitnessGoalText = (goal?: number | string | null) => {
  if (typeof goal === "number") {
    return goalLabels[goal] ?? "Fitness Goal";
  }

  if (typeof goal === "string") {
    const normalized = goal.trim().toLowerCase();
    if (normalized === "1" || normalized.includes("loss")) return "Weight Loss";
    if (normalized === "2" || normalized.includes("muscle")) return "Muscle Gain";
    if (normalized === "3" || normalized.includes("gain")) return "Weight Gain";
  }

  return "Fitness Goal";
};

const getGoalIcon = (goalLabel: string) => {
  if (goalLabel === "Weight Loss") return "flame-outline";
  if (goalLabel === "Muscle Gain") return "barbell-outline";
  if (goalLabel === "Weight Gain") return "restaurant-outline";
  return "fitness-outline";
};

const getDayProgressPercent = (day: Day, includeExercise = false) =>
  getDashboardCombinedProgress(day, includeExercise);

const getShortDate = (value?: string) => {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[parsed.getMonth()]} ${parsed.getDate()}`;
};

const getLatestProgressIndex = (days: Day[]) => {
  for (let index = days.length - 1; index >= 0; index -= 1) {
    const day = days[index];
    if (day.status === "active" || day.status === "finished") {
      return index;
    }
  }

  return 0;
};

const AnimatedPath = Animated.createAnimatedComponent(Path);
const DRIVER_INPUT_RANGE = [0, 0.2, 0.4, 0.6, 0.8, 1];
const CHART_FOCUS_RELOAD_TTL_MS = 90 * 1000;
const responsiveIcon = (heightPercent: number, widthPercent: number) =>
  Math.min(hp(heightPercent), wp(widthPercent));

const getTrackPoint = (t: number, width: number, height: number, padding: number) => {
  const clamped = Math.max(0, Math.min(1, t));
  const usableWidth = Math.max(width - padding * 2, 1);
  const x = padding + usableWidth * clamped;
  const y =
    height * 0.5 -
    Math.sin(clamped * Math.PI) * hp(4.2) +
    Math.sin(clamped * Math.PI * 2) * hp(1);

  return { x, y };
};

const buildTrackPath = (width: number, height: number, padding: number, yOffset = 0) => {
  const sampleCount = 34;
  return Array.from({ length: sampleCount }, (_, index) => {
    const point = getTrackPoint(index / (sampleCount - 1), width, height, padding);
    return `${index === 0 ? "M" : "L"} ${point.x.toFixed(1)} ${(point.y + yOffset).toFixed(1)}`;
  }).join(" ");
};

// --------------- Gauge component (replaces PieChart for overall) ---------------
interface GaugeProps {
  percent: number;
  size: number;
  strokeWidth: number;
  color: string;
  bgColor: string;
  label: string;
  textColor: string;
  infoColor?: string;
  infoBackgroundColor?: string;
  onInfoPress?: () => void;
}

const Gauge: React.FC<GaugeProps> = ({
  percent,
  size,
  strokeWidth,
  color,
  bgColor,
  label,
  textColor,
  infoColor,
  infoBackgroundColor,
  onInfoPress,
}) => {
  const safePercent = Number.isFinite(percent)
    ? Math.min(Math.max(Math.round(percent), 0), 100)
    : 0;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (circumference * safePercent) / 100;
  const center = size / 2;
  const percentFontSize = Math.min(size * 0.2, hp(2.5));
  const labelFontSize = Math.min(size * 0.1, hp(1.25));

  return (
    <View style={{ flex: 1, minWidth: 0, alignItems: "center", justifyContent: "center", paddingHorizontal: wp(0.8) }}>
      <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFillObject}>
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={bgColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${center} ${center})`}
        />
      </Svg>
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            left: strokeWidth,
            right: strokeWidth,
            top: strokeWidth,
            bottom: strokeWidth,
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: wp(0.8),
          }}
        >
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.72}
            style={{
              color,
              fontSize: percentFontSize,
              fontWeight: "900",
              includeFontPadding: false,
              lineHeight: percentFontSize * 1.05,
              textAlign: "center",
              width: "100%",
            }}
          >
            {safePercent}%
          </Text>
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.65}
            style={{
              color: textColor,
              fontSize: labelFontSize,
              fontWeight: "700",
              includeFontPadding: false,
              lineHeight: labelFontSize * 1.12,
              marginTop: hp(0.35),
              textAlign: "center",
              width: "100%",
            }}
          >
            {label}
          </Text>
        </View>
        {onInfoPress ? (
          <Pressable
            style={[
              s.gaugeInfoButton,
              {
                backgroundColor: infoBackgroundColor || "#FFFFFF",
                borderColor: `${infoColor || color}35`,
              },
            ]}
            onPress={onInfoPress}
            accessibilityRole="button"
            accessibilityLabel={`Score explained for ${label}`}
          >
            <Ionicons
              name="information-circle-outline"
              size={Math.min(hp(1.85), wp(4.1))}
              color={infoColor || color}
            />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
};

// --------------- Railway journey component ---------------
interface RailwayProgressChartProps {
  days: Day[];
  goalLabel: string;
  width: number;
  colors: ReturnType<typeof useTheme>["colors"];
  isDarkMode: boolean;
  includeExercise: boolean;
}

const RailwayProgressChart: React.FC<RailwayProgressChartProps> = ({
  days,
  goalLabel,
  width,
  colors,
  isDarkMode,
  includeExercise,
}) => {
  const drawAnim = useRef(new Animated.Value(0)).current;
  const driverAnim = useRef(new Animated.Value(0)).current;
  const latestIndex = useMemo(() => getLatestProgressIndex(days), [days]);
  const stageWidth = Math.max(width, 1);
  const journeyHeight = Math.min(hp(31), wp(64));
  const journeyPadding = wp(7);
  const railLength = Math.max(stageWidth * 1.35, wp(96));
  const railOffset = hp(1);
  const driverMarkerSize = responsiveIcon(4.4, 9.6);
  const milestoneWidth = Math.max(wp(13.2), hp(5.6));
  const latestT = days.length > 1 ? latestIndex / (days.length - 1) : 0;
  const currentDay = days[latestIndex] ?? days[0];
  const currentPercent = currentDay ? getDayProgressPercent(currentDay, includeExercise) : 0;
  const milestoneAnimations = useRef<Animated.Value[]>([]);

  if (milestoneAnimations.current.length !== days.length) {
    milestoneAnimations.current = days.map(
      (_, index) => milestoneAnimations.current[index] ?? new Animated.Value(0)
    );
  }

  const journeySignature = useMemo(
    () =>
      days
        .map((day) =>
          [
            day.dayNo,
            day.date,
            day.status,
            day.achievedCalories,
            getHydrationValue(day),
            day.targetCalories,
            day.targetHydration,
          ].join(":")
        )
        .join("|"),
    [days]
  );

  const topRailPath = useMemo(
    () => buildTrackPath(stageWidth, journeyHeight, journeyPadding, -railOffset),
    [journeyHeight, journeyPadding, railOffset, stageWidth]
  );
  const bottomRailPath = useMemo(
    () => buildTrackPath(stageWidth, journeyHeight, journeyPadding, railOffset),
    [journeyHeight, journeyPadding, railOffset, stageWidth]
  );
  const centerTrackPath = useMemo(
    () => buildTrackPath(stageWidth, journeyHeight, journeyPadding, 0),
    [journeyHeight, journeyPadding, stageWidth]
  );
  const railDashOffset = drawAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [railLength, 0],
  });
  const driverTranslateX = driverAnim.interpolate({
    inputRange: DRIVER_INPUT_RANGE,
    outputRange: DRIVER_INPUT_RANGE.map(
      (t) => getTrackPoint(t, stageWidth, journeyHeight, journeyPadding).x - driverMarkerSize / 2
    ),
  });
  const driverTranslateY = driverAnim.interpolate({
    inputRange: DRIVER_INPUT_RANGE,
    outputRange: DRIVER_INPUT_RANGE.map(
      (t) =>
        getTrackPoint(t, stageWidth, journeyHeight, journeyPadding).y -
        driverMarkerSize -
        hp(1.7)
    ),
  });
  const driverScale = driverAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.92, 1.06, 1],
    extrapolate: "clamp",
  });
  const railTies = useMemo(
    () =>
      Array.from({ length: 18 }, (_, index) => {
        const point = getTrackPoint(index / 17, stageWidth, journeyHeight, journeyPadding);
        return {
          x1: point.x - wp(1.85),
          y1: point.y - hp(1.95),
          x2: point.x + wp(1.85),
          y2: point.y + hp(1.95),
        };
      }),
    [journeyHeight, journeyPadding, stageWidth]
  );

  useEffect(() => {
    drawAnim.setValue(0);
    driverAnim.setValue(0);
    milestoneAnimations.current.forEach((anim) => anim.setValue(0));

    Animated.timing(drawAnim, {
      toValue: 1,
      duration: 900,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();

    Animated.stagger(
      90,
      milestoneAnimations.current.map((anim) =>
        Animated.spring(anim, {
          toValue: 1,
          friction: 7,
          tension: 90,
          useNativeDriver: true,
        })
      )
    ).start();

    Animated.timing(driverAnim, {
      toValue: latestT,
      duration: 950,
      delay: 250,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [drawAnim, driverAnim, journeySignature, latestT]);

  if (!days.length) {
    return null;
  }

  return (
    <View style={[s.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
      <View style={s.cardHeader}>
        <Ionicons name="map" size={responsiveIcon(2.5, 5.4)} color={colors.primary} />
        <Text style={[s.cardTitle, { color: colors.textPrimary }]}>
          Fitness Journey
        </Text>
      </View>

      <View style={[s.journeySummaryRow, { backgroundColor: colors.primarySoft }]}>
        <View style={s.journeySummaryItem}>
          <Text style={[s.journeySummaryLabel, { color: colors.textSecondary }]}>Current</Text>
          <Text style={[s.journeySummaryValue, { color: colors.textPrimary }]}>
            {labelForDay(currentDay)} | {currentPercent}%
          </Text>
        </View>
        <View style={[s.journeySummaryDivider, { backgroundColor: colors.border }]} />
        <View style={s.journeySummaryItem}>
          <Text style={[s.journeySummaryLabel, { color: colors.textSecondary }]}>Timeline</Text>
          <Text style={[s.journeySummaryValue, { color: colors.textPrimary }]}>
            {days.length} days
          </Text>
        </View>
      </View>

      <View style={[s.trackStage, { width: stageWidth, height: journeyHeight }]}>
        <Svg
          width={stageWidth}
          height={journeyHeight}
          viewBox={`0 0 ${stageWidth} ${journeyHeight}`}
        >
          <Path
            d={centerTrackPath}
            stroke={colors.primarySoft}
            strokeWidth={hp(3.7)}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={isDarkMode ? 0.28 : 0.72}
            fill="none"
          />

          {railTies.map((tie, index) => (
            <Line
              key={`tie-${index}`}
              x1={tie.x1}
              y1={tie.y1}
              x2={tie.x2}
              y2={tie.y2}
              stroke={isDarkMode ? "#64748B" : "#CBD5E1"}
              strokeWidth={responsiveIcon(0.4, 0.85)}
              strokeLinecap="round"
              opacity={0.7}
            />
          ))}

          <AnimatedPath
            d={topRailPath}
            stroke={colors.primary}
            strokeWidth={responsiveIcon(0.5, 1.1)}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={`${railLength}`}
            strokeDashoffset={railDashOffset as any}
            fill="none"
          />
          <AnimatedPath
            d={bottomRailPath}
            stroke={colors.secondary}
            strokeWidth={responsiveIcon(0.5, 1.1)}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={`${railLength}`}
            strokeDashoffset={railDashOffset as any}
            fill="none"
          />
          <Circle
            cx={getTrackPoint(0, stageWidth, journeyHeight, journeyPadding).x}
            cy={getTrackPoint(0, stageWidth, journeyHeight, journeyPadding).y}
            r={responsiveIcon(0.85, 1.9)}
            fill={colors.cardBackground}
            stroke={colors.primary}
            strokeWidth={responsiveIcon(0.4, 0.85)}
          />
          <Circle
            cx={getTrackPoint(1, stageWidth, journeyHeight, journeyPadding).x}
            cy={getTrackPoint(1, stageWidth, journeyHeight, journeyPadding).y}
            r={responsiveIcon(0.85, 1.9)}
            fill={colors.cardBackground}
            stroke={colors.secondary}
            strokeWidth={responsiveIcon(0.4, 0.85)}
          />
        </Svg>

        <View
          style={[
            s.startGoalTag,
            {
              backgroundColor: isDarkMode ? "#0F172A" : "#FFFFFF",
              borderColor: colors.primary,
              shadowColor: colors.primary,
            },
          ]}
        >
          <View style={[s.startGoalIcon, { backgroundColor: colors.primarySoft }]}>
            <Ionicons
              name={getGoalIcon(goalLabel) as keyof typeof Ionicons.glyphMap}
              size={responsiveIcon(2.1, 4.5)}
              color={colors.primary}
            />
          </View>
          <View style={s.startGoalCopy}>
            <Text style={[s.startGoalLabel, { color: colors.textSecondary }]}>Start Goal</Text>
            <Text
              style={[s.startGoalValue, { color: colors.textPrimary }]}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {goalLabel}
            </Text>
          </View>
        </View>

        {days.map((day, index) => {
          const t = days.length > 1 ? index / (days.length - 1) : 0;
          const point = getTrackPoint(t, stageWidth, journeyHeight, journeyPadding);
          const anim = milestoneAnimations.current[index] ?? new Animated.Value(1);
          const scale = anim.interpolate({
            inputRange: [0, 1],
            outputRange: [0.84, 1],
          });
          const isAbove = index > 1 && index % 2 === 1;
          const statusColor =
            day.status === "finished"
              ? colors.success
              : day.status === "active"
              ? colors.primary
              : colors.disabled;
          const milestoneLeft = Math.max(
            0,
            Math.min(stageWidth - milestoneWidth, point.x - milestoneWidth / 2)
          );
          const milestoneTop = isAbove ? point.y - hp(7.1) : point.y - hp(0.75);

          const dot = (
            <View
              style={[
                s.milestoneDot,
                {
                  backgroundColor: colors.cardBackground,
                  borderColor: statusColor,
                },
              ]}
            >
              {index === latestIndex && (
                <View style={[s.milestoneDotCore, { backgroundColor: statusColor }]} />
              )}
            </View>
          );

          const chip = (
            <View
              style={[
                s.milestoneChip,
                {
                  backgroundColor: isDarkMode ? "#0F172A" : "#FFFFFF",
                  borderColor: index === latestIndex ? colors.primary : colors.border,
                },
              ]}
            >
              <Text style={[s.milestoneDay, { color: colors.textPrimary }]}>
                {labelForDay(day)}
              </Text>
              <Text style={[s.milestonePercent, { color: statusColor }]}>
                {getDayProgressPercent(day, includeExercise)}%
              </Text>
              <Text
                style={[s.milestoneDate, { color: colors.textSecondary }]}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {getShortDate(day.date) || "Logged"}
              </Text>
            </View>
          );

          return (
            <Animated.View
              key={`${day.dayNo}-${day.date}`}
              style={[
                s.milestone,
                {
                  left: milestoneLeft,
                  top: milestoneTop,
                  width: milestoneWidth,
                  opacity: anim,
                  transform: [{ scale }],
                },
              ]}
            >
              {isAbove ? chip : dot}
              <View style={[s.milestoneConnector, { backgroundColor: statusColor }]} />
              {isAbove ? dot : chip}
            </Animated.View>
          );
        })}

        <Animated.View
          style={[
            s.userMarker,
            {
              backgroundColor: colors.primary,
              shadowColor: colors.primary,
              width: driverMarkerSize,
              height: driverMarkerSize,
              borderRadius: driverMarkerSize / 2,
              transform: [
                { translateX: driverTranslateX },
                { translateY: driverTranslateY },
                { scale: driverScale },
              ],
            },
          ]}
        >
          <Ionicons name="walk" size={responsiveIcon(2.7, 5.9)} color={colors.textOnPrimary} />
        </Animated.View>
      </View>
    </View>
  );
};

// --------------- Main screen ---------------
export default function ChartsScreen() {
  const { colors, isDarkMode } = useTheme();
  const [data, setData] = useState<jsonResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [goalLabel, setGoalLabel] = useState("Fitness Goal");
  const [isPremium, setIsPremium] = useState(false);
  const [advancedChartAccess, setAdvancedChartAccess] = useState<FeatureAccessStatus | null>(null);
  const [scoreInfoVisible, setScoreInfoVisible] = useState(false);
  const dataRef = useRef<jsonResponse | null>(null);
  const lastLoadAt = useRef(0);
  const lastDataSignature = useRef<string | null>(null);

  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      const now = Date.now();
      if (dataRef.current && now - lastLoadAt.current < CHART_FOCUS_RELOAD_TTL_MS) {
        return () => {
          isActive = false;
        };
      }

      const loadChartData = async () => {
        try {
          if (!dataRef.current) {
            setLoading(true);
          }
          await syncLatestHealthData().catch((error) => {
            console.log("Charts: Health data sync unavailable", error);
          });

          const [cachedDashboard, metricsRaw, savedUser] = await Promise.all([
            getStoredDashboardCache<jsonResponse>(),
            AsyncStorage.getItem("fitfaat_health_metrics"),
            tokenStorage.getUser(),
          ]);

          const metrics = metricsRaw ? JSON.parse(metricsRaw) : null;
          const savedGoal =
            savedUser?.userInfo?.fitnessGoal ??
            savedUser?.fitnessGoal ??
            metrics?.fitnessGoal ??
            metrics?.selectedGoal;

          if (!isActive) return;

          setGoalLabel(getFitnessGoalText(savedGoal));

          const featureAccess = await getFeatureAccessStatus("advancedCharts");
          if (!isActive) return;
          setAdvancedChartAccess((current) =>
            current &&
            current.hasAccess === featureAccess.hasAccess &&
            current.isPremium === featureAccess.isPremium &&
            current.statusLabel === featureAccess.statusLabel
              ? current
              : featureAccess
          );
          const premiumActive = featureAccess.isPremium;
          setIsPremium(premiumActive);

          if (cachedDashboard) {
            const weeklyTrackingId = await getStoredWeeklyTrackingId(savedUser);
            const carryForward = await loadAdaptiveGoalCarryForward({
              userId: savedUser?.id,
              currentWeeklyTrackingId: weeklyTrackingId,
            });
            const adaptiveMetrics = buildAdaptiveGoalMetrics(savedUser, metrics);
            let nextData = cachedDashboard.data;
            nextData = await mergeWalkingProgressIntoJsonResponse(nextData);
            if (premiumActive) {
              nextData = await mergeExerciseProgressIntoJsonResponse(nextData);
            }
            const adaptivePlan = premiumActive ? "premium" : "free";
            const weightTrendCalibration = await loadWeeklyWeightTrendCalibration(
              adaptiveMetrics,
              nextData,
              {
                userId: savedUser?.id,
                weeklyTrackingId,
                plan: adaptivePlan,
              }
            );
            nextData = applyAdaptiveGoalsToJsonResponse(nextData, adaptiveMetrics, carryForward, {
              plan: adaptivePlan,
              weightTrendCalibration,
            });
            if (isActive) {
              const nextSignature = JSON.stringify({
                premiumActive,
                savedGoal,
                days: Object.values(nextData).map((day: any) => ({
                  dayNo: day.dayNo,
                  date: day.date,
                  status: day.status,
                  calories: day.achievedCalories,
                  hydration: day.achieviedHydration ?? day.achievedHydration,
                  targetCalories: day.targetCalories,
                  targetHydration: day.targetHydration,
                  steps: day.walkingSteps ?? day.steps ?? day.stepCount,
                  workout: day.exerciseCaloriesBurned,
                })),
              });

              if (lastDataSignature.current !== nextSignature) {
                lastDataSignature.current = nextSignature;
                setData(nextData);
              }
              lastLoadAt.current = Date.now();
            }
          } else if (isActive) {
            lastDataSignature.current = null;
            lastLoadAt.current = Date.now();
            setData(null);
          }
        } catch (e) {
          console.log("Charts: Error loading data", e);
        } finally {
          if (isActive) {
            setLoading(false);
          }
        }
      };

      loadChartData();

      return () => {
        isActive = false;
      };
    }, [])
  );

  if (loading) {
    return (
      <SafeAreaView style={[s.container, { backgroundColor: colors.screenColor }]} edges={["top"]}>
        <AppHeader title="Weekly Charts" showStepIndicator={false} showBackButton showMenuButton={false} />
        <View style={s.center}>
          <ActivityIndicator size={responsiveIcon(4.2, 9)} color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!data) {
    return (
      <SafeAreaView style={[s.container, { backgroundColor: colors.screenColor }]} edges={["top"]}>
        <AppHeader title="Weekly Charts" showStepIndicator={false} showBackButton showMenuButton={false} />
        <View style={s.center}>
          <Ionicons
            name="analytics-outline"
            size={responsiveIcon(7.4, 16)}
            color={colors.textSecondary}
          />
          <Text style={[s.emptyText, { color: colors.textSecondary }]}>
            No data available yet.{"\n"}Start logging your meals to see charts!
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // ---- Derive chart-ready values ----
  const days: Day[] = Object.values(data).sort((a, b) => a.dayNo - b.dayNo);
  const labels = days.map(labelForDay);
  const calorieTargets = days.map((day) => Number(day.targetCalories || 0)).filter((value) => value > 0);
  const minCalorieTarget = calorieTargets.length ? Math.min(...calorieTargets) : 0;
  const maxCalorieTarget = calorieTargets.length ? Math.max(...calorieTargets) : 0;
  const calorieTargetLabel =
    minCalorieTarget === maxCalorieTarget
      ? `Target: ${minCalorieTarget} kcal/day`
      : `Adaptive targets: ${minCalorieTarget}-${maxCalorieTarget} kcal/day`;

  // Totals
  const totalAchievedCal = days.reduce((s, d) => s + Number(d.achievedCalories || 0), 0);
  const totalTargetCal = days.reduce((s, d) => s + Number(d.targetCalories || 0), 0);
  const totalAchievedHyd = days.reduce((s, d) => s + getHydrationValue(d), 0);
  const totalTargetHyd = days.reduce((s, d) => s + Number(d.targetHydration || 0), 0);
  const calorieSummaries = days.map((day) => getDashboardCalorieSummary(day, isPremium));

  const overallCalPct = clampPercent(totalAchievedCal, totalTargetCal);
  const overallHydPct = clampPercent(totalAchievedHyd, totalTargetHyd);
  const totalWalkingCal = calorieSummaries.reduce((s, summary) => s + summary.walkingCalories, 0);
  const totalTargetWalkingCal = calorieSummaries.reduce((s, summary) => s + summary.walkingTarget, 0);
  const overallWalkingPct = clampPercent(totalWalkingCal, totalTargetWalkingCal);
  const weeklyScoreTrend = getWeeklyHealthScoreTrend(days, isPremium);
  const latestHealthScore = days.length
    ? getDashboardHealthScore(days[getLatestProgressIndex(days)] || days[days.length - 1], isPremium)
    : null;
  const overallPct = weeklyScoreTrend.currentAverage || (days.length
    ? Math.round(days.reduce((sum, day) => sum + getDashboardCombinedProgress(day, isPremium), 0) / days.length)
    : 0);
  const scoreInfoTitle = isPremium ? "Full Health Score" : "Basic Score";
  const freeScoreWeights = HEALTH_SCORE_WEIGHTS.free;
  const premiumScoreWeights = HEALTH_SCORE_WEIGHTS.premium;
  const scoreInfoRows = [
    {
      icon: "pulse-outline" as keyof typeof Ionicons.glyphMap,
      label: "Current model",
      text: getHealthScorePlanExplanation(isPremium),
    },
    {
      icon: "checkmark-circle-outline" as keyof typeof Ionicons.glyphMap,
      label: "Free weights",
      text: `calories ${Math.round(freeScoreWeights.calories * 100)}%, hydration ${Math.round(freeScoreWeights.hydration * 100)}%, ${FREE_PLAN_LIMITS.dailyStepCounterPreview}-step preview ${Math.round(freeScoreWeights.stepsPreview * 100)}%`,
    },
    {
      icon: "diamond-outline" as keyof typeof Ionicons.glyphMap,
      label: "Premium weights",
      text: `calories ${Math.round(premiumScoreWeights.calories * 100)}%, hydration ${Math.round(premiumScoreWeights.hydration * 100)}%, workouts ${Math.round(premiumScoreWeights.workout * 100)}%, walking/steps ${Math.round(premiumScoreWeights.walking * 100)}%`,
    },
    {
      icon: "swap-horizontal-outline" as keyof typeof Ionicons.glyphMap,
      label: "Why it changes",
      text: getPremiumScoreChangeExplanation(),
    },
  ];
  const scoreInfoNote = isPremium
    ? `Score signal: ${latestHealthScore?.confidenceLabel || weeklyScoreTrend.confidenceLabel}. Weekly trend: ${weeklyScoreTrend.label}. ${HEALTH_SCORE_DISCLAIMER}`
    : `Score signal: ${latestHealthScore?.confidenceLabel || weeklyScoreTrend.confidenceLabel}. The Free model stays useful with a ${FREE_PLAN_LIMITS.dailyStepCounterPreview}-step preview. ${HEALTH_SCORE_DISCLAIMER}`;
  const goalCompletionItems = [
    { label: "Calories", percent: overallCalPct, color: "#F97316" },
    { label: "Hydration", percent: overallHydPct, color: "#2E86AB" },
    ...(isPremium
      ? [{ label: "Walking", percent: overallWalkingPct, color: "#22C55E" }]
      : []),
  ];

  // Per-day percentages
  const dailyCalPct = days.map((d) =>
    getSingleMetricProgress(d.achievedCalories, d.targetCalories)
  );
  const dailyHydPct = days.map((d) =>
    getSingleMetricProgress(getHydrationValue(d), d.targetHydration)
  );
  const dailyOverallPct = days.map((d) =>
    getDashboardCombinedProgress(d, isPremium)
  );

  // Active / finished / locked
  const finishedDays = days.filter((d) => d.status === "finished").length;
  const activeDays = days.filter((d) => d.status === "active").length;
  const lockedDays = days.filter((d) => d.status === "locked").length;

  // Chart config
  const chartConfig = {
    backgroundGradientFrom: colors.cardBackground,
    backgroundGradientTo: colors.cardBackground,
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(8, 145, 178, ${opacity})`, // primary teal
    labelColor: () => colors.textSecondary,
    barPercentage: 0.55,
    propsForBackgroundLines: {
      strokeDasharray: "4 6",
      stroke: colors.border,
      strokeWidth: 1,
    },
    propsForLabels: {
      fontSize: responsiveIcon(1.35, 2.9),
      fontWeight: "600" as const,
    },
    fillShadowGradientFrom: colors.primary,
    fillShadowGradientTo: colors.primary,
    fillShadowGradientOpacity: 0.35,
  };

  const hydrationChartConfig = {
    ...chartConfig,
    color: (opacity = 1) => `rgba(46, 134, 171, ${opacity})`, // hydration blue
    fillShadowGradientFrom: "#2E86AB",
    fillShadowGradientTo: "#2E86AB",
  };

  // Pie data for day status
  const pieData = [
    {
      name: "Finished",
      count: finishedDays,
      color: colors.success,
      legendFontColor: colors.textPrimary,
      legendFontSize: responsiveIcon(1.6, 3.5),
    },
    {
      name: "Active",
      count: activeDays,
      color: colors.primary,
      legendFontColor: colors.textPrimary,
      legendFontSize: responsiveIcon(1.6, 3.5),
    },
    {
      name: "Locked",
      count: lockedDays,
      color: colors.disabled,
      legendFontColor: colors.textPrimary,
      legendFontSize: responsiveIcon(1.6, 3.5),
    },
  ].filter((entry) => entry.count > 0);

  const headerIconSize = responsiveIcon(2.5, 5.4);
  const gaugeSize = Math.min(wp(26), hp(12.6));
  const gaugeStrokeWidth = responsiveIcon(1, 2.1);
  const chartWidth = wp(82);
  const journeyWidth = wp(78);
  const standardChartHeight = hp(27);
  const tallChartHeight = hp(29.5);
  const compactChartHeight = hp(24.5);

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.screenColor }]} edges={["top"]}>
      <AppHeader
        title="Weekly Charts"
        showStepIndicator={false}
        showBackButton
        showMenuButton={false}
      />

      <View style={[s.content, { backgroundColor: colors.screenColor }]}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.scroll}
        >
          <FeatureLimitBanner access={advancedChartAccess} />

          {isPremium ? (
            <>
              {/* ========== 1. Railway Fitness Journey ========== */}
              <RailwayProgressChart
                days={days}
                goalLabel={goalLabel}
                width={journeyWidth}
                colors={colors}
                isDarkMode={isDarkMode}
                includeExercise
              />

              {/* ========== Activity Heatmap ========== */}
              <ActivityHeatmap
                days={days}
                includeExercise
                enableAdvancedFilters
                colors={colors}
                embedded
              />
            </>
          ) : null}

          {/* ========== 2. Overall Progress Gauges ========== */}
          <View style={[s.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
            <View style={s.cardHeader}>
              <Ionicons name="pie-chart" size={headerIconSize} color={colors.primary} />
              <Text style={[s.cardTitle, { color: colors.textPrimary }]}>
                Overall Progress
              </Text>
            </View>

            <View style={s.gaugeRow}>
              <Gauge
                percent={overallCalPct}
                size={gaugeSize}
                strokeWidth={gaugeStrokeWidth}
                color="#F97316"
                bgColor={isDarkMode ? "#2C2C2C" : "#FFF3E0"}
                label="Calories"
                textColor={colors.textSecondary}
              />
              <Gauge
                percent={overallHydPct}
                size={gaugeSize}
                strokeWidth={gaugeStrokeWidth}
                color="#2E86AB"
                bgColor={isDarkMode ? "#1E293B" : "#E0F2FE"}
                label="Hydration"
                textColor={colors.textSecondary}
              />
              <Gauge
                percent={overallPct}
                size={gaugeSize}
                strokeWidth={gaugeStrokeWidth}
                color={colors.success}
                bgColor={isDarkMode ? "#1A2E1A" : "#DCFCE7"}
                label={scoreInfoTitle}
                textColor={colors.textSecondary}
                infoColor={colors.primary}
                infoBackgroundColor={colors.cardBackground}
                onInfoPress={() => setScoreInfoVisible(true)}
              />
            </View>

            {/* Summary row */}
            <View style={[s.summaryRow, { borderTopColor: colors.border }]}>
              <View style={s.summaryItem}>
                <Text
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.72}
                  style={[s.summaryValue, { color: "#F97316" }]}
                >
                  {totalAchievedCal}
                </Text>
                <Text
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.75}
                  style={[s.summaryLabel, { color: colors.textSecondary }]}
                >
                  / {totalTargetCal} kcal
                </Text>
              </View>
              <View style={[s.summaryDivider, { backgroundColor: colors.border }]} />
              <View style={s.summaryItem}>
                <Text
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.72}
                  style={[s.summaryValue, { color: "#2E86AB" }]}
                >
                  {totalAchievedHyd}
                </Text>
                <Text
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.75}
                  style={[s.summaryLabel, { color: colors.textSecondary }]}
                >
                  / {totalTargetHyd} L
                </Text>
              </View>
            </View>
          </View>

          {/* ========== 3. Calories Bar Chart ========== */}
          <View style={[s.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
            <View style={s.cardHeader}>
              <Ionicons name="flame" size={headerIconSize} color="#F97316" />
              <Text style={[s.cardTitle, { color: colors.textPrimary }]}>
                Daily Calories
              </Text>
            </View>

            <BarChart
              data={{
                labels,
                datasets: [
                  {
                    data: days.map((d) => Number(d.achievedCalories || 0)),
                  },
                ],
              }}
              width={chartWidth}
              height={standardChartHeight}
              yAxisLabel=""
              yAxisSuffix=""
              chartConfig={{
                ...chartConfig,
                color: (opacity = 1) => `rgba(249, 115, 22, ${opacity})`,
                fillShadowGradientFrom: "#F97316",
                fillShadowGradientTo: "#F97316",
              }}
              style={s.chart}
              fromZero
              showValuesOnTopOfBars
            />

            {/* Target line info */}
            <View style={s.targetRow}>
              <View style={[s.targetDot, { backgroundColor: "#F97316" }]} />
              <Text style={[s.targetText, { color: colors.textSecondary }]}>
                Achieved &nbsp;|&nbsp; {calorieTargetLabel}
              </Text>
            </View>
          </View>

          {/* ========== 4. Hydration Line Chart ========== */}
          <View style={[s.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
            <View style={s.cardHeader}>
              <Ionicons name="water" size={headerIconSize} color="#2E86AB" />
              <Text style={[s.cardTitle, { color: colors.textPrimary }]}>
                Daily Hydration
              </Text>
            </View>

            <LineChart
              data={{
                labels,
                datasets: [
                  {
                    data: days.map((d) => getHydrationValue(d)),
                    color: () => "#2E86AB",
                    strokeWidth: 3,
                  },
                  {
                    data: days.map((d) => Number(d.targetHydration || 0)),
                    color: () => colors.disabled,
                    strokeWidth: 2,
                    withDots: false,
                  },
                ],
                legend: ["Achieved", "Target"],
              }}
              width={chartWidth}
              height={standardChartHeight}
              yAxisSuffix=" L"
              chartConfig={hydrationChartConfig}
              style={s.chart}
              bezier
              fromZero
            />
          </View>

          {!isPremium ? (
            <PremiumTeaserCard
              title="Unlock Advanced Charts"
              subtitle="Free includes the basic calorie and hydration charts above. Premium adds modern charts, activity heatmaps, nutrition score history, and PDF-style progress reports."
              previewTitle="Premium chart studio"
              icon="analytics-outline"
              metrics={[
                { label: "Heatmap", value: "6M", icon: "grid-outline", color: "#22C55E" },
                { label: "Reports", value: "PDF", icon: "document-text-outline", color: colors.primary },
                { label: "Trends", value: "+", icon: "trending-up-outline", color: colors.warning },
              ]}
              bullets={["Modern charts", "Nutrition history", "PDF reports"]}
              style={s.premiumTeaser}
            />
          ) : (
            <>
          {/* ========== 5. Combined Progress Line Chart ========== */}
          <View style={[s.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
            <View style={s.cardHeader}>
              <Ionicons name="trending-up" size={headerIconSize} color={colors.success} />
              <Text style={[s.cardTitle, { color: colors.textPrimary }]}>
                Daily Progress %
              </Text>
            </View>

            <LineChart
              data={{
                labels,
                datasets: [
                  {
                    data: dailyCalPct,
                    color: () => "#F97316",
                    strokeWidth: 2,
                  },
                  {
                    data: dailyHydPct,
                    color: () => "#2E86AB",
                    strokeWidth: 2,
                  },
                  {
                    data: dailyOverallPct,
                    color: () => colors.success,
                    strokeWidth: 3,
                  },
                ],
                legend: ["Calories %", "Hydration %", `${scoreInfoTitle} %`],
              }}
              width={chartWidth}
              height={tallChartHeight}
              yAxisSuffix="%"
              chartConfig={{
                ...chartConfig,
                color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
              }}
              style={s.chart}
              bezier
              fromZero
            />
          </View>

          {/* ========== 6. Day Status Pie Chart ========== */}
          <View style={[s.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
            <View style={s.cardHeader}>
              <Ionicons name="calendar" size={headerIconSize} color={colors.primary} />
              <Text style={[s.cardTitle, { color: colors.textPrimary }]}>
                Weekly Status
              </Text>
            </View>

            <PieChart
              data={pieData}
              width={chartWidth}
              height={compactChartHeight}
              chartConfig={chartConfig}
              accessor="count"
              backgroundColor="transparent"
              paddingLeft="15"
              center={[0, 0]}
              absolute
            />
          </View>

          {/* ========== 7. Progress Ring Chart ========== */}
          <View style={[s.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
            <View style={s.cardHeader}>
              <Ionicons name="fitness" size={headerIconSize} color={colors.primary} />
              <Text style={[s.cardTitle, { color: colors.textPrimary }]}>
                Goal Completion
              </Text>
            </View>

            <ProgressChart
              data={{
                labels: goalCompletionItems.map((item) => item.label),
                data: goalCompletionItems.map((item) => item.percent / 100),
                colors: goalCompletionItems.map((item) => item.color),
              }}
              width={chartWidth}
              height={compactChartHeight}
              strokeWidth={responsiveIcon(1.7, 3.8)}
              radius={responsiveIcon(4.9, 10.7)}
              chartConfig={{
                ...chartConfig,
                color: (opacity = 1) => `rgba(8, 145, 178, ${opacity})`,
              }}
              hideLegend
              withCustomBarColorFromData
              style={s.chart}
            />

            <View style={[s.goalCompletionLegend, { borderTopColor: colors.border }]}>
              {goalCompletionItems.map((item) => (
                <View key={item.label} style={s.goalCompletionItem}>
                  <View style={[s.goalCompletionDot, { backgroundColor: item.color }]} />
                  <Text
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.72}
                    style={[s.goalCompletionLabel, { color: colors.textSecondary }]}
                  >
                    {item.label}
                  </Text>
                  <Text
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.68}
                    style={[s.goalCompletionValue, { color: item.color }]}
                  >
                    {item.percent}%
                  </Text>
                </View>
              ))}
            </View>
          </View>

          {/* ========== 8. Daily Breakdown Table ========== */}
          <View style={[s.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
            <View style={s.cardHeader}>
              <Ionicons name="list" size={headerIconSize} color={colors.primary} />
              <Text style={[s.cardTitle, { color: colors.textPrimary }]}>
                Daily Breakdown
              </Text>
            </View>

            {/* Table header */}
            <View style={[s.tableRow, s.tableHeader, { backgroundColor: colors.primarySoft }]}>
              <Text style={[s.tableCell, s.tableCellHeader, { color: colors.primary }]}>Day</Text>
              <Text style={[s.tableCell, s.tableCellHeader, { color: "#F97316" }]}>Cal</Text>
              <Text style={[s.tableCell, s.tableCellHeader, { color: "#2E86AB" }]}>Hyd</Text>
              <Text style={[s.tableCell, s.tableCellHeader, { color: colors.success }]}>Goals</Text>
              <Text style={[s.tableCell, s.tableCellHeader, { color: colors.textSecondary }]}>Status</Text>
            </View>

            {days.map((day, index) => {
              const pct = getDashboardGoalProgress(day);
              const statusColor =
                day.status === "finished"
                  ? colors.success
                  : day.status === "active"
                  ? colors.primary
                  : colors.disabled;

              return (
                <View
                  key={day.dayNo}
                  style={[
                    s.tableRow,
                    {
                      backgroundColor:
                        index % 2 === 0 ? "transparent" : colors.primarySoft + "40",
                      borderBottomColor: colors.border,
                    },
                  ]}
                >
                  <Text style={[s.tableCell, { color: colors.textPrimary, fontWeight: "700" }]}>
                    {day.dayNo}
                  </Text>
                  <Text style={[s.tableCell, { color: "#F97316" }]}>
                    {day.achievedCalories || 0}
                  </Text>
                  <Text style={[s.tableCell, { color: "#2E86AB" }]}>
                    {getHydrationValue(day)}
                  </Text>
                  <Text style={[s.tableCell, { color: colors.success, fontWeight: "700" }]}>
                    {pct}%
                  </Text>
                  <View style={[s.statusBadge, { backgroundColor: statusColor + "20" }]}>
                    <Text style={[s.statusBadgeText, { color: statusColor }]}>
                      {day.status === "finished"
                        ? "Done"
                        : day.status === "active"
                        ? "Active"
                        : "Locked"}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>

            </>
          )}

          <View style={{ height: hp(12) }} />
        </ScrollView>
      </View>

      <Modal
        visible={scoreInfoVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setScoreInfoVisible(false)}
      >
        <Pressable style={s.scoreInfoBackdrop} onPress={() => setScoreInfoVisible(false)}>
          <Pressable
            style={[
              s.scoreInfoCard,
              {
                backgroundColor: colors.cardBackground,
                borderColor: colors.cardBorder || colors.border,
                shadowColor: colors.black || "#000000",
              },
            ]}
            onPress={(event) => event.stopPropagation()}
          >
            <View style={s.scoreInfoHeader}>
              <View style={[s.scoreInfoIcon, { backgroundColor: `${colors.primary}14` }]}>
                <Ionicons name="pulse-outline" size={Math.min(hp(2.5), wp(5.5))} color={colors.primary} />
              </View>
              <View style={s.scoreInfoTitleWrap}>
                <Text style={[s.scoreInfoEyebrow, { color: colors.textSecondary }]}>
                  {scoreInfoTitle}
                </Text>
                <Text style={[s.scoreInfoTitle, { color: colors.textPrimary }]}>
                  Score explained
                </Text>
              </View>
              <Pressable
                style={[s.scoreInfoClose, { backgroundColor: colors.surface || colors.primarySoft }]}
                onPress={() => setScoreInfoVisible(false)}
                accessibilityRole="button"
                accessibilityLabel="Close score explanation"
              >
                <Ionicons name="close" size={Math.min(hp(2.35), wp(5.2))} color={colors.textPrimary} />
              </Pressable>
            </View>

            <View style={s.scoreInfoRows}>
              {scoreInfoRows.map((row) => {
                const active = row.label === (isPremium ? "Premium" : "Free");
                return (
                  <View
                    key={row.label}
                    style={[
                      s.scoreInfoRow,
                      {
                        borderTopColor: colors.cardBorder || colors.border,
                        backgroundColor: active ? `${colors.primary}0F` : "transparent",
                      },
                    ]}
                  >
                    <View style={[s.scoreInfoRowIcon, { backgroundColor: `${colors.primary}10` }]}>
                      <Ionicons name={row.icon} size={Math.min(hp(2.1), wp(4.7))} color={colors.primary} />
                    </View>
                    <View style={s.scoreInfoRowTextWrap}>
                      <Text style={[s.scoreInfoRowLabel, { color: colors.textPrimary }]}>{row.label}</Text>
                      <Text style={[s.scoreInfoRowText, { color: colors.textSecondary }]}>{row.text}</Text>
                    </View>
                  </View>
                );
              })}
            </View>

            <Text
              style={[
                s.scoreInfoNote,
                {
                  color: colors.primary,
                  backgroundColor: `${colors.primary}10`,
                },
              ]}
            >
              {scoreInfoNote}
            </Text>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

// --------------- Styles ---------------
const s = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: wp(10) },
  emptyText: { textAlign: "center", marginTop: hp(2), fontSize: hp(1.8), lineHeight: hp(2.8) },
  scroll: { paddingHorizontal: wp(4), paddingTop: hp(1.5), paddingBottom: hp(4) },
  premiumTeaser: { marginBottom: hp(2) },

  // Cards
  card: {
    borderRadius: wp(4),
    padding: wp(4),
    marginBottom: hp(2),
    borderWidth: wp(0.25),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: hp(0.35) },
    shadowOpacity: 0.08,
    shadowRadius: wp(1.6),
    elevation: 4,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: hp(1.5),
    gap: wp(2),
  },
  cardTitle: {
    fontSize: hp(2),
    fontWeight: "800",
    letterSpacing: 0.3,
  },

  // Railway journey
  journeySummaryRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: wp(3),
    paddingVertical: hp(1),
    paddingHorizontal: wp(3),
    marginBottom: hp(1),
  },
  journeySummaryItem: {
    flex: 1,
  },
  journeySummaryLabel: {
    fontSize: hp(1.2),
    fontWeight: "700",
    textTransform: "uppercase",
  },
  journeySummaryValue: {
    fontSize: hp(1.65),
    fontWeight: "800",
    marginTop: hp(0.2),
  },
  journeySummaryDivider: {
    width: wp(0.25),
    height: hp(3.8),
    marginHorizontal: wp(3),
  },
  trackStage: {
    alignSelf: "center",
    position: "relative",
    overflow: "visible",
    marginTop: hp(0.5),
  },
  startGoalTag: {
    position: "absolute",
    top: hp(0.3),
    left: 0,
    width: wp(34),
    maxWidth: wp(35.2),
    minWidth: wp(29.8),
    minHeight: hp(6.15),
    borderRadius: wp(2.5),
    borderWidth: wp(0.25),
    paddingVertical: hp(0.75),
    paddingHorizontal: wp(2),
    flexDirection: "row",
    alignItems: "center",
    elevation: 5,
    shadowOffset: { width: 0, height: hp(0.35) },
    shadowOpacity: 0.15,
    shadowRadius: wp(1.35),
  },
  startGoalIcon: {
    width: responsiveIcon(3.7, 8),
    height: responsiveIcon(3.7, 8),
    borderRadius: responsiveIcon(1.85, 4),
    alignItems: "center",
    justifyContent: "center",
    marginRight: wp(1.6),
  },
  startGoalCopy: {
    flex: 1,
    minWidth: 0,
  },
  startGoalLabel: {
    fontSize: hp(1.05),
    fontWeight: "800",
    textTransform: "uppercase",
  },
  startGoalValue: {
    fontSize: hp(1.45),
    fontWeight: "900",
    marginTop: hp(0.1),
  },
  milestone: {
    position: "absolute",
    width: wp(13.2),
    alignItems: "center",
  },
  milestoneDot: {
    width: responsiveIcon(1.6, 3.5),
    height: responsiveIcon(1.6, 3.5),
    borderRadius: responsiveIcon(0.8, 1.75),
    borderWidth: wp(0.5),
    alignItems: "center",
    justifyContent: "center",
  },
  milestoneDotCore: {
    width: responsiveIcon(0.62, 1.35),
    height: responsiveIcon(0.62, 1.35),
    borderRadius: responsiveIcon(0.31, 0.7),
  },
  milestoneConnector: {
    width: wp(0.5),
    height: hp(1.25),
    opacity: 0.72,
  },
  milestoneChip: {
    width: wp(13.2),
    minHeight: hp(4.7),
    borderRadius: wp(2),
    borderWidth: wp(0.25),
    paddingVertical: hp(0.35),
    paddingHorizontal: wp(1),
    alignItems: "center",
  },
  milestoneDay: {
    fontSize: hp(1.15),
    fontWeight: "900",
  },
  milestonePercent: {
    fontSize: hp(1.1),
    fontWeight: "900",
    marginTop: -1,
  },
  milestoneDate: {
    fontSize: hp(0.95),
    fontWeight: "700",
    marginTop: -1,
  },
  userMarker: {
    position: "absolute",
    left: 0,
    top: 0,
    width: responsiveIcon(4.4, 9.6),
    height: responsiveIcon(4.4, 9.6),
    borderRadius: responsiveIcon(2.2, 4.8),
    alignItems: "center",
    justifyContent: "center",
    elevation: 8,
    shadowOffset: { width: 0, height: hp(0.5) },
    shadowOpacity: 0.22,
    shadowRadius: wp(1.6),
    borderWidth: wp(0.5),
    borderColor: "rgba(255, 255, 255, 0.82)",
  },

  // Gauge row
  gaugeRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginVertical: hp(1),
    width: "100%",
  },
  gaugeInfoButton: {
    position: "absolute",
    right: -wp(0.7),
    top: -hp(0.45),
    width: Math.min(hp(3), wp(6.7)),
    height: Math.min(hp(3), wp(6.7)),
    borderRadius: Math.min(hp(1.5), wp(3.35)),
    alignItems: "center",
    justifyContent: "center",
    borderWidth: Math.min(wp(0.22), hp(0.12)),
    elevation: 3,
    shadowOffset: { width: 0, height: hp(0.22) },
    shadowOpacity: 0.11,
    shadowRadius: wp(1.2),
  },

  // Score explanation
  scoreInfoBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.5)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: wp(5),
  },
  scoreInfoCard: {
    width: "100%",
    maxWidth: wp(92),
    borderRadius: hp(2),
    borderWidth: Math.min(wp(0.28), hp(0.16)),
    padding: wp(4),
    shadowOffset: { width: 0, height: hp(0.8) },
    shadowOpacity: 0.18,
    shadowRadius: wp(4),
    elevation: 8,
  },
  scoreInfoHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: wp(2.6),
    marginBottom: hp(1.6),
  },
  scoreInfoIcon: {
    width: Math.min(hp(4.8), wp(10.6)),
    height: Math.min(hp(4.8), wp(10.6)),
    borderRadius: Math.min(hp(2.4), wp(5.3)),
    alignItems: "center",
    justifyContent: "center",
  },
  scoreInfoTitleWrap: {
    flex: 1,
    minWidth: 0,
  },
  scoreInfoEyebrow: {
    fontSize: Math.min(hp(1.12), wp(2.7)),
    fontWeight: "900",
    textTransform: "uppercase",
  },
  scoreInfoTitle: {
    fontSize: Math.min(hp(2.15), wp(4.9)),
    fontWeight: "900",
    marginTop: hp(0.15),
  },
  scoreInfoClose: {
    width: Math.min(hp(4), wp(9)),
    height: Math.min(hp(4), wp(9)),
    borderRadius: Math.min(hp(2), wp(4.5)),
    alignItems: "center",
    justifyContent: "center",
  },
  scoreInfoRows: {
    gap: hp(1),
  },
  scoreInfoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: wp(2.5),
    paddingVertical: hp(0.95),
    paddingHorizontal: wp(2),
    borderRadius: hp(1.2),
    borderTopWidth: Math.min(wp(0.2), hp(0.12)),
  },
  scoreInfoRowIcon: {
    width: Math.min(hp(3.8), wp(8.5)),
    height: Math.min(hp(3.8), wp(8.5)),
    borderRadius: Math.min(hp(1.9), wp(4.25)),
    alignItems: "center",
    justifyContent: "center",
  },
  scoreInfoRowTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  scoreInfoRowLabel: {
    fontSize: Math.min(hp(1.42), wp(3.35)),
    fontWeight: "900",
  },
  scoreInfoRowText: {
    fontSize: Math.min(hp(1.18), wp(2.8)),
    lineHeight: hp(1.75),
    fontWeight: "700",
    marginTop: hp(0.25),
  },
  scoreInfoNote: {
    borderRadius: hp(1.2),
    paddingHorizontal: wp(3),
    paddingVertical: hp(1.1),
    fontSize: Math.min(hp(1.22), wp(2.9)),
    lineHeight: hp(1.8),
    fontWeight: "800",
    marginTop: hp(1.3),
  },

  // Summary
  summaryRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    borderTopWidth: 1,
    paddingTop: hp(1.5),
    marginTop: hp(1.5),
  },
  summaryItem: {
    flex: 1,
    minWidth: 0,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: wp(1),
  },
  summaryValue: {
    fontSize: hp(2.5),
    fontWeight: "800",
    textAlign: "center",
    width: "100%",
  },
  summaryLabel: {
    fontSize: hp(1.4),
    marginTop: hp(0.3),
    textAlign: "center",
    width: "100%",
  },
  summaryDivider: {
    width: wp(0.25),
    height: hp(4),
  },

  // Charts
  chart: {
    borderRadius: wp(3),
    alignSelf: "center",
  },

  // Target row
  targetRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: hp(1),
    paddingHorizontal: wp(2),
  },
  targetDot: {
    width: responsiveIcon(1.25, 2.7),
    height: responsiveIcon(1.25, 2.7),
    borderRadius: responsiveIcon(0.62, 1.35),
    marginRight: wp(2),
  },
  targetText: {
    fontSize: hp(1.4),
    fontWeight: "500",
  },

  // Goal completion
  goalCompletionLegend: {
    flexDirection: "row",
    alignItems: "stretch",
    justifyContent: "center",
    borderTopWidth: 1,
    marginTop: hp(1),
    paddingTop: hp(1.4),
    gap: wp(2),
  },
  goalCompletionItem: {
    flex: 1,
    minWidth: 0,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: wp(1.2),
  },
  goalCompletionDot: {
    width: responsiveIcon(1.15, 2.5),
    height: responsiveIcon(1.15, 2.5),
    borderRadius: responsiveIcon(0.58, 1.25),
    marginBottom: hp(0.55),
  },
  goalCompletionLabel: {
    width: "100%",
    textAlign: "center",
    fontSize: hp(1.45),
    fontWeight: "700",
    includeFontPadding: false,
  },
  goalCompletionValue: {
    width: "100%",
    textAlign: "center",
    fontSize: hp(2.15),
    fontWeight: "900",
    includeFontPadding: false,
    marginTop: hp(0.35),
  },

  // Table
  tableRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: hp(1),
    paddingHorizontal: wp(2),
    borderBottomWidth: wp(0.13),
  },
  tableHeader: {
    borderRadius: wp(2),
    marginBottom: hp(0.5),
    borderBottomWidth: 0,
  },
  tableCell: {
    flex: 1,
    textAlign: "center",
    fontSize: hp(1.5),
    fontWeight: "600",
  },
  tableCellHeader: {
    fontWeight: "800",
    fontSize: hp(1.5),
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  statusBadge: {
    flex: 1,
    borderRadius: hp(1),
    paddingVertical: hp(0.3),
    alignItems: "center",
  },
  statusBadgeText: {
    fontSize: hp(1.3),
    fontWeight: "700",
  },
});
