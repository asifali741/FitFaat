import AppHeader from "@/components/AppHeader";
import { useTheme } from "@/contexts/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
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
import Svg, { Circle, Line, Path, Text as SvgText } from "react-native-svg";
import { tokenStorage } from "@/utils/auth/tokenStorage";
import {
  applyAdaptiveGoalsToJsonResponse,
  loadAdaptiveGoalCarryForward,
} from "@/utils/adaptiveGoals";
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

const getDayProgressPercent = (day: Day) =>
  clampPercent(
    Number(day.achievedCalories || 0) + Number(day.achieviedHydration || 0),
    Number(day.targetCalories || 0) + Number(day.targetHydration || 0)
  );

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
}

const Gauge: React.FC<GaugeProps> = ({
  percent,
  size,
  strokeWidth,
  color,
  bgColor,
  label,
  textColor,
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (circumference * percent) / 100;
  const center = size / 2;

  return (
    <View style={{ alignItems: "center" }}>
      <Svg width={size} height={size}>
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
        <SvgText
          x={center}
          y={center - 6}
          textAnchor="middle"
          dy=".3em"
          fontSize={size * 0.22}
          fontWeight="bold"
          fill={color}
        >
          {percent}%
        </SvgText>
        <SvgText
          x={center}
          y={center + size * 0.16}
          textAnchor="middle"
          dy=".3em"
          fontSize={size * 0.1}
          fill={textColor}
        >
          {label}
        </SvgText>
      </Svg>
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
}

const RailwayProgressChart: React.FC<RailwayProgressChartProps> = ({
  days,
  goalLabel,
  width,
  colors,
  isDarkMode,
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
  const currentPercent = currentDay ? getDayProgressPercent(currentDay) : 0;
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
            day.achieviedHydration,
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
                {getDayProgressPercent(day)}%
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

  useEffect(() => {
    (async () => {
      try {
        const [raw, metricsRaw, savedUser] = await Promise.all([
          AsyncStorage.getItem("JsonResponse"),
          AsyncStorage.getItem("fitfaat_health_metrics"),
          tokenStorage.getUser(),
        ]);

        const metrics = metricsRaw ? JSON.parse(metricsRaw) : null;
        const savedGoal =
          savedUser?.userInfo?.fitnessGoal ??
          savedUser?.fitnessGoal ??
          metrics?.fitnessGoal ??
          metrics?.selectedGoal;

        setGoalLabel(getFitnessGoalText(savedGoal));

        if (raw) {
          const parsed = JSON.parse(raw);
          const weeklyTrackingId = await AsyncStorage.getItem("weeklyTrackingId");
          const carryForward = await loadAdaptiveGoalCarryForward({
            userId: savedUser?.id,
            currentWeeklyTrackingId: weeklyTrackingId,
          });
          setData(applyAdaptiveGoalsToJsonResponse(parsed.data ?? parsed, undefined, carryForward));
        }
      } catch (e) {
        console.log("Charts: Error loading data", e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

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
  const totalAchievedHyd = days.reduce((s, d) => s + Number(d.achieviedHydration || 0), 0);
  const totalTargetHyd = days.reduce((s, d) => s + Number(d.targetHydration || 0), 0);

  const overallCalPct = clampPercent(totalAchievedCal, totalTargetCal);
  const overallHydPct = clampPercent(totalAchievedHyd, totalTargetHyd);
  const overallPct = clampPercent(
    totalAchievedCal + totalAchievedHyd,
    totalTargetCal + totalTargetHyd
  );

  // Per-day percentages
  const dailyCalPct = days.map((d) =>
    clampPercent(Number(d.achievedCalories || 0), Number(d.targetCalories || 0))
  );
  const dailyHydPct = days.map((d) =>
    clampPercent(Number(d.achieviedHydration || 0), Number(d.targetHydration || 0))
  );
  const dailyOverallPct = days.map((d) =>
    clampPercent(
      Number(d.achievedCalories || 0) + Number(d.achieviedHydration || 0),
      Number(d.targetCalories || 0) + Number(d.targetHydration || 0)
    )
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
          {/* ========== 1. Railway Fitness Journey ========== */}
          <RailwayProgressChart
            days={days}
            goalLabel={goalLabel}
            width={journeyWidth}
            colors={colors}
            isDarkMode={isDarkMode}
          />

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
                label="Combined"
                textColor={colors.textSecondary}
              />
            </View>

            {/* Summary row */}
            <View style={[s.summaryRow, { borderTopColor: colors.border }]}>
              <View style={s.summaryItem}>
                <Text style={[s.summaryValue, { color: "#F97316" }]}>
                  {totalAchievedCal}
                </Text>
                <Text style={[s.summaryLabel, { color: colors.textSecondary }]}>
                  / {totalTargetCal} kcal
                </Text>
              </View>
              <View style={[s.summaryDivider, { backgroundColor: colors.border }]} />
              <View style={s.summaryItem}>
                <Text style={[s.summaryValue, { color: "#2E86AB" }]}>
                  {totalAchievedHyd}
                </Text>
                <Text style={[s.summaryLabel, { color: colors.textSecondary }]}>
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
                    data: days.map((d) => Number(d.achieviedHydration || 0)),
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
                legend: ["Calories %", "Hydration %", "Overall %"],
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
                labels: ["Calories", "Hydration"],
                data: [overallCalPct / 100, overallHydPct / 100],
              }}
              width={chartWidth}
              height={compactChartHeight}
              strokeWidth={responsiveIcon(1.7, 3.8)}
              radius={responsiveIcon(4.9, 10.7)}
              chartConfig={{
                ...chartConfig,
                color: (opacity = 1) => `rgba(8, 145, 178, ${opacity})`,
              }}
              hideLegend={false}
              style={s.chart}
            />
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
              <Text style={[s.tableCell, s.tableCellHeader, { color: colors.success }]}>%</Text>
              <Text style={[s.tableCell, s.tableCellHeader, { color: colors.textSecondary }]}>Status</Text>
            </View>

            {days.map((day, index) => {
              const pct = clampPercent(
                Number(day.achievedCalories || 0) + Number(day.achieviedHydration || 0),
                Number(day.targetCalories || 0) + Number(day.targetHydration || 0)
              );
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
                    {day.achieviedHydration || 0}
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

          <View style={{ height: hp(12) }} />
        </ScrollView>
      </View>
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
    justifyContent: "space-around",
    alignItems: "center",
    marginVertical: hp(1),
  },

  // Summary
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    borderTopWidth: 1,
    paddingTop: hp(1.5),
    marginTop: hp(1.5),
  },
  summaryItem: {
    alignItems: "center",
  },
  summaryValue: {
    fontSize: hp(2.5),
    fontWeight: "800",
  },
  summaryLabel: {
    fontSize: hp(1.4),
    marginTop: hp(0.3),
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
