import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from "react-native-responsive-screen";
import Svg, { Circle, Defs, LinearGradient, Stop } from "react-native-svg";
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useLiveWalkingProgress } from "@/hooks/useLiveWalkingProgress";
import {
  DEFAULT_STEP_GOAL,
  STEP_GOAL_INCREMENT,
  cleanWalkingSteps,
  estimateWalkingCalories,
  walkingProgressEntryMatchesScope,
  type WalkingProgressScope,
} from "@/utils/localWalkingProgress";
import { saveLiveWalkingGoal } from "@/utils/liveWalkingProgress";
const STEP_COLOR = "#22C55E";
const STEP_COLOR_DARK = "#15803D";
const STEP_ACCENT = "#14B8A6";
const RING_SIZE = Math.min(hp(17.5), wp(39));
const RING_STROKE = Math.min(hp(1.45), wp(3.2));
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

type StepHistoryEntry = {
  dateKey: string;
  steps: number;
  calories: number;
  goal: number;
  updatedAt: string;
  userId?: string | null;
  weeklyTrackingId?: string | null;
};

type StepCounterCardProps = {
  colors: any;
};

const getDateKey = (value?: string | Date | null) => {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const addDays = (date: Date, amount: number) => {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + amount);
  return nextDate;
};

const cleanSteps = (value: unknown) => cleanWalkingSteps(value);

const estimateStepCalories = (
  steps: number,
  metrics?: Parameters<typeof estimateWalkingCalories>[1]
) => estimateWalkingCalories(steps, metrics);

const formatCompactNumber = (value: number) => {
  const numericValue = cleanSteps(value);
  if (numericValue >= 1000) {
    const compactValue = numericValue / 1000;
    return `${compactValue % 1 === 0 ? compactValue.toFixed(0) : compactValue.toFixed(1)}k`;
  }
  return String(numericValue);
};

const buildWeeklyEntries = (
  history: StepHistoryEntry[],
  todaySteps: number,
  goal: number,
  scope?: WalkingProgressScope | null
) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayKey = getDateKey(today);
  const historyMap = new Map(
    history
      .filter((item) => walkingProgressEntryMatchesScope(item, scope))
      .map((item) => [item.dateKey, item])
  );

  return Array.from({ length: 7 }, (_, index) => {
    const date = addDays(today, index - 6);
    const dateKey = getDateKey(date);
    const entry = historyMap.get(dateKey);
    const steps = dateKey === todayKey ? cleanSteps(todaySteps) : cleanSteps(entry?.steps);
    return {
      dateKey,
      label: date.toLocaleDateString([], { weekday: "short" }).slice(0, 1),
      steps,
      progress: Math.min(1, goal > 0 ? steps / goal : 0),
    };
  });
};

function StepRing({
  colors,
  progress,
  steps,
  goal,
}: {
  colors: any;
  progress: number;
  steps: number;
  goal: number;
}) {
  const animatedProgress = useSharedValue(0);

  useEffect(() => {
    animatedProgress.value = withTiming(Math.min(1, Math.max(0, progress)), {
      duration: 850,
      easing: Easing.out(Easing.cubic),
    });
  }, [animatedProgress, progress]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: RING_CIRCUMFERENCE * (1 - animatedProgress.value),
  }));

  const innerStyle = useAnimatedStyle(() => ({
    opacity: 0.9 + animatedProgress.value * 0.1,
    transform: [{ scale: 0.96 + animatedProgress.value * 0.04 }],
  }));

  return (
    <View style={ringStyles.wrap}>
      <Svg width={RING_SIZE} height={RING_SIZE}>
        <Defs>
          <LinearGradient id="stepRingGradient" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={STEP_ACCENT} />
            <Stop offset="0.55" stopColor={STEP_COLOR} />
            <Stop offset="1" stopColor={STEP_COLOR_DARK} />
          </LinearGradient>
        </Defs>
        <Circle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={RING_RADIUS}
          stroke={colors.cardBorder || colors.border || "#E2E8F0"}
          strokeWidth={RING_STROKE}
          fill="none"
        />
        <AnimatedCircle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={RING_RADIUS}
          stroke="url(#stepRingGradient)"
          strokeWidth={RING_STROKE}
          strokeLinecap="round"
          strokeDasharray={`${RING_CIRCUMFERENCE} ${RING_CIRCUMFERENCE}`}
          animatedProps={animatedProps}
          fill="none"
          originX={RING_SIZE / 2}
          originY={RING_SIZE / 2}
          rotation="-90"
        />
      </Svg>

      <Animated.View
        style={[
          ringStyles.center,
          {
            backgroundColor: colors.surface || colors.screenColor,
            borderColor: colors.cardBorder || colors.border,
          },
          innerStyle,
        ]}
      >
        <Text style={[ringStyles.steps, { color: colors.textPrimary }]} numberOfLines={1} adjustsFontSizeToFit>
          {steps.toLocaleString()}
        </Text>
        <Text style={[ringStyles.label, { color: colors.textSecondary }]}>
          / {goal.toLocaleString()}
        </Text>
      </Animated.View>
    </View>
  );
}

export function StepCounterCard({ colors }: StepCounterCardProps) {
  const styles = useMemo(() => getStyles(colors), [colors]);
  const walkingProgress = useLiveWalkingProgress();
  const [goalDraft, setGoalDraft] = useState(String(DEFAULT_STEP_GOAL));
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const {
    steps,
    goal,
    history,
    scope: stepScope,
    status: sensorStatus,
    message: sensorMessage,
    calorieMetrics,
  } = walkingProgress;

  const displayedGoal = goal;
  const displayedSteps = cleanSteps(steps);

  useEffect(() => {
    if (!isEditingGoal) {
      setGoalDraft(String(goal));
    }
  }, [goal, isEditingGoal]);

  const saveGoal = useCallback(
    async (nextGoalValue: number) => {
      const nextGoal = await saveLiveWalkingGoal(nextGoalValue);
      setGoalDraft(String(nextGoal));
    },
    []
  );

  const handleGoalStep = (amount: number) => {
    saveGoal(goal + amount);
  };

  const handleGoalSave = () => {
    const parsedGoal = Number(goalDraft.replace(/[^0-9]/g, ""));
    saveGoal(parsedGoal || DEFAULT_STEP_GOAL);
    setIsEditingGoal(false);
  };

  const progress = displayedGoal > 0 ? Math.min(1, displayedSteps / displayedGoal) : 0;
  const progressPercent = Math.round(progress * 100);
  const remainingSteps = Math.max(0, displayedGoal - displayedSteps);
  const stepCalories = estimateStepCalories(displayedSteps, calorieMetrics);
  const weeklyEntries = useMemo(
    () => buildWeeklyEntries(history, displayedSteps, displayedGoal, stepScope),
    [displayedGoal, displayedSteps, history, stepScope]
  );
  const weeklyTotal = weeklyEntries.reduce((sum, entry) => sum + entry.steps, 0);
  const bestDay = weeklyEntries.reduce(
    (best, entry) => (entry.steps > best.steps ? entry : best),
    weeklyEntries[0] || { label: "-", steps: 0 }
  );

  return (
    <View style={styles.section}>
      <View style={styles.card}>
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <View style={styles.iconWrap}>
              <Ionicons name="footsteps-outline" size={Math.min(hp(2.5), wp(5.6))} color={STEP_COLOR} />
            </View>
            <View style={styles.titleCopy}>
              <Text style={styles.eyebrow}>Steps</Text>
              <Text style={styles.title}>Daily Step Ring</Text>
            </View>
          </View>
          <View style={[styles.statusPill, sensorStatus === "ready" && styles.statusPillReady]}>
            {sensorStatus === "loading" ? (
              <ActivityIndicator size="small" color={STEP_COLOR} />
            ) : (
              <Ionicons
                name={sensorStatus === "ready" ? "radio-button-on" : "alert-circle-outline"}
                size={Math.min(hp(1.7), wp(3.8))}
                color={sensorStatus === "ready" ? STEP_COLOR : colors.warning || "#F59E0B"}
              />
            )}
            <Text
              style={[
                styles.statusText,
                sensorStatus === "ready" && styles.statusTextReady,
              ]}
              numberOfLines={1}
            >
              {sensorStatus === "ready" ? "Live" : sensorStatus === "loading" ? "Syncing" : "Needs access"}
            </Text>
          </View>
        </View>

        <View style={styles.mainRow}>
          <StepRing colors={colors} progress={progress} steps={displayedSteps} goal={displayedGoal} />

          <View style={styles.statsColumn}>
            <View style={styles.progressBlock}>
              <Text style={styles.progressValue}>{progressPercent}%</Text>
              <Text style={styles.progressLabel}>of daily goal</Text>
            </View>

            <View style={styles.metricGrid}>
              <View style={styles.metricTile}>
                <Ionicons name="walk-outline" size={Math.min(hp(1.95), wp(4.4))} color={STEP_ACCENT} />
                <Text style={styles.metricValue}>{remainingSteps.toLocaleString()}</Text>
                <Text style={styles.metricLabel}>left</Text>
              </View>
              <View style={styles.metricTile}>
                <Ionicons name="flame-outline" size={Math.min(hp(1.95), wp(4.4))} color="#F97316" />
                <Text style={styles.metricValue}>{stepCalories}</Text>
                <Text style={styles.metricLabel}>step kcal</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.goalPanel}>
          <View style={styles.goalCopy}>
            <Text style={styles.goalLabel}>Daily goal</Text>
            {isEditingGoal ? (
              <TextInput
                style={styles.goalInput}
                keyboardType="number-pad"
                value={goalDraft}
                onChangeText={setGoalDraft}
                onSubmitEditing={handleGoalSave}
                returnKeyType="done"
                selectTextOnFocus
              />
            ) : (
              <Text style={styles.goalValue}>
                {displayedGoal.toLocaleString()} steps
              </Text>
            )}
          </View>

          <View style={styles.goalControls}>
            <TouchableOpacity
              style={styles.goalIconButton}
              onPress={() => handleGoalStep(-STEP_GOAL_INCREMENT)}
              activeOpacity={0.78}
              accessibilityLabel="Decrease step goal"
            >
              <Ionicons name="remove" size={Math.min(hp(1.9), wp(4.3))} color={colors.textPrimary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.goalIconButton, styles.goalEditButton]}
              onPress={isEditingGoal ? handleGoalSave : () => setIsEditingGoal(true)}
              activeOpacity={0.78}
              accessibilityLabel={isEditingGoal ? "Save step goal" : "Edit step goal"}
            >
              <Ionicons
                name={isEditingGoal ? "checkmark" : "create-outline"}
                size={Math.min(hp(1.9), wp(4.3))}
                color={colors.textOnPrimary}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.goalIconButton}
              onPress={() => handleGoalStep(STEP_GOAL_INCREMENT)}
              activeOpacity={0.78}
              accessibilityLabel="Increase step goal"
            >
              <Ionicons name="add" size={Math.min(hp(1.9), wp(4.3))} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.weekHeader}>
          <View>
            <Text style={styles.weekTitle}>Weekly steps</Text>
            <Text style={styles.weekSubtitle}>
              {weeklyTotal.toLocaleString()} total · Best {bestDay.label} {formatCompactNumber(bestDay.steps)}
            </Text>
          </View>
          <View style={styles.sourcePill}>
            <Ionicons name="phone-portrait-outline" size={Math.min(hp(1.55), wp(3.5))} color={colors.textSecondary} />
            <Text style={styles.sourceText}>Pedometer</Text>
          </View>
        </View>

        <View style={styles.weekChart}>
          {weeklyEntries.map((entry) => (
            <View key={entry.dateKey} style={styles.weekBarWrap}>
              <View style={styles.weekBarTrack}>
                <View
                  style={[
                    styles.weekBarFill,
                    { height: `${entry.steps > 0 ? Math.max(5, entry.progress * 100) : 0}%` },
                  ]}
                />
              </View>
              <Text style={styles.weekBarLabel}>{entry.label}</Text>
            </View>
          ))}
        </View>

        {sensorStatus !== "ready" ? (
          <View style={styles.noticeRow}>
            <Ionicons name="information-circle-outline" size={Math.min(hp(1.75), wp(4))} color={colors.warning || "#F59E0B"} />
            <Text style={styles.noticeText}>{sensorMessage}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const ringStyles = StyleSheet.create({
  wrap: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  center: {
    position: "absolute",
    width: RING_SIZE - RING_STROKE * 3.2,
    height: RING_SIZE - RING_STROKE * 3.2,
    borderRadius: (RING_SIZE - RING_STROKE * 3.2) / 2,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: wp(2),
  },
  steps: {
    maxWidth: "100%",
    fontSize: Math.min(hp(2.25), wp(5.1)),
    fontWeight: "900",
    textAlign: "center",
  },
  label: {
    fontSize: Math.min(hp(1.02), wp(2.45)),
    fontWeight: "800",
    marginTop: hp(0.1),
    textAlign: "center",
  },
});

const getStyles = (colors: any) =>
  StyleSheet.create({
    section: {
      paddingHorizontal: wp(4),
      marginTop: hp(0.4),
      marginBottom: hp(1.5),
    },
    card: {
      backgroundColor: colors.cardBackground,
      borderRadius: hp(2),
      borderWidth: 1,
      borderColor: colors.cardBorder || colors.border,
      padding: wp(4),
      shadowColor: colors.black,
      shadowOffset: { width: 0, height: hp(0.35) },
      shadowOpacity: 0.08,
      shadowRadius: wp(2),
      elevation: 3,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: wp(3),
    },
    titleRow: {
      flex: 1,
      minWidth: 0,
      flexDirection: "row",
      alignItems: "center",
      gap: wp(2.5),
    },
    iconWrap: {
      width: Math.min(hp(4.8), wp(10.6)),
      height: Math.min(hp(4.8), wp(10.6)),
      borderRadius: hp(1.4),
      backgroundColor: `${STEP_COLOR}16`,
      alignItems: "center",
      justifyContent: "center",
    },
    titleCopy: {
      flex: 1,
      minWidth: 0,
    },
    eyebrow: {
      color: colors.textSecondary,
      fontSize: Math.min(hp(1.12), wp(2.65)),
      fontWeight: "900",
      textTransform: "uppercase",
    },
    title: {
      color: colors.textPrimary,
      fontSize: Math.min(hp(2), wp(4.6)),
      fontWeight: "900",
      marginTop: hp(0.12),
    },
    statusPill: {
      minHeight: hp(3.4),
      maxWidth: wp(28),
      borderRadius: hp(1.7),
      paddingHorizontal: wp(2.2),
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: wp(1),
      backgroundColor: colors.surface || colors.screenColor,
      borderWidth: 1,
      borderColor: colors.cardBorder || colors.border,
    },
    statusPillReady: {
      backgroundColor: `${STEP_COLOR}14`,
      borderColor: `${STEP_COLOR}40`,
    },
    statusText: {
      color: colors.textSecondary,
      fontSize: Math.min(hp(1.08), wp(2.55)),
      fontWeight: "900",
    },
    statusTextReady: {
      color: STEP_COLOR_DARK,
    },
    mainRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: wp(4),
      marginTop: hp(2.2),
    },
    statsColumn: {
      flex: 1,
      minWidth: 0,
    },
    progressBlock: {
      marginBottom: hp(1.2),
    },
    progressValue: {
      color: colors.textPrimary,
      fontSize: Math.min(hp(3), wp(6.8)),
      fontWeight: "900",
    },
    progressLabel: {
      color: colors.textSecondary,
      fontSize: Math.min(hp(1.18), wp(2.8)),
      fontWeight: "800",
      marginTop: hp(0.2),
    },
    metricGrid: {
      flexDirection: "row",
      gap: wp(2),
    },
    metricTile: {
      flex: 1,
      minHeight: hp(8.5),
      borderRadius: hp(1.4),
      backgroundColor: colors.surface || colors.screenColor,
      borderWidth: 1,
      borderColor: colors.cardBorder || colors.border,
      paddingHorizontal: wp(2),
      paddingVertical: hp(1),
      justifyContent: "center",
    },
    metricValue: {
      color: colors.textPrimary,
      fontSize: Math.min(hp(1.72), wp(3.9)),
      fontWeight: "900",
      marginTop: hp(0.45),
    },
    metricLabel: {
      color: colors.textSecondary,
      fontSize: Math.min(hp(1.02), wp(2.42)),
      fontWeight: "800",
      marginTop: hp(0.1),
    },
    goalPanel: {
      minHeight: hp(6.8),
      borderRadius: hp(1.6),
      backgroundColor: colors.surface || colors.screenColor,
      borderWidth: 1,
      borderColor: colors.cardBorder || colors.border,
      paddingHorizontal: wp(3),
      paddingVertical: hp(1),
      marginTop: hp(1.8),
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: wp(2),
    },
    goalCopy: {
      flex: 1,
      minWidth: 0,
    },
    goalLabel: {
      color: colors.textSecondary,
      fontSize: Math.min(hp(1.08), wp(2.55)),
      fontWeight: "900",
      textTransform: "uppercase",
    },
    goalValue: {
      color: colors.textPrimary,
      fontSize: Math.min(hp(1.72), wp(3.95)),
      fontWeight: "900",
      marginTop: hp(0.15),
    },
    goalInput: {
      minHeight: hp(3.6),
      color: colors.textPrimary,
      fontSize: Math.min(hp(1.72), wp(3.95)),
      fontWeight: "900",
      paddingVertical: 0,
      marginTop: hp(0.1),
    },
    goalControls: {
      flexDirection: "row",
      alignItems: "center",
      gap: wp(1.5),
    },
    goalIconButton: {
      width: Math.min(hp(3.8), wp(8.5)),
      height: Math.min(hp(3.8), wp(8.5)),
      borderRadius: hp(1.25),
      backgroundColor: colors.cardBackground,
      borderWidth: 1,
      borderColor: colors.cardBorder || colors.border,
      alignItems: "center",
      justifyContent: "center",
    },
    goalEditButton: {
      backgroundColor: STEP_COLOR,
      borderColor: STEP_COLOR,
    },
    weekHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: wp(2.5),
      marginTop: hp(1.8),
    },
    weekTitle: {
      color: colors.textPrimary,
      fontSize: Math.min(hp(1.62), wp(3.75)),
      fontWeight: "900",
    },
    weekSubtitle: {
      color: colors.textSecondary,
      fontSize: Math.min(hp(1.08), wp(2.55)),
      fontWeight: "800",
      marginTop: hp(0.2),
    },
    sourcePill: {
      minHeight: hp(3),
      maxWidth: wp(31),
      borderRadius: hp(1.5),
      paddingHorizontal: wp(2),
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: wp(0.8),
      backgroundColor: colors.surface || colors.screenColor,
    },
    sourceText: {
      color: colors.textSecondary,
      fontSize: Math.min(hp(1), wp(2.38)),
      fontWeight: "900",
    },
    weekChart: {
      height: hp(10.8),
      flexDirection: "row",
      alignItems: "flex-end",
      gap: wp(2.1),
      marginTop: hp(1.2),
    },
    weekBarWrap: {
      flex: 1,
      alignItems: "center",
      gap: hp(0.55),
    },
    weekBarTrack: {
      width: "100%",
      height: hp(8.1),
      maxWidth: wp(7.2),
      borderRadius: hp(1.1),
      backgroundColor: colors.surface || colors.screenColor,
      borderWidth: 1,
      borderColor: colors.cardBorder || colors.border,
      justifyContent: "flex-end",
      overflow: "hidden",
    },
    weekBarFill: {
      width: "100%",
      borderTopLeftRadius: hp(1),
      borderTopRightRadius: hp(1),
      backgroundColor: STEP_COLOR,
    },
    weekBarLabel: {
      color: colors.textSecondary,
      fontSize: Math.min(hp(0.98), wp(2.32)),
      fontWeight: "900",
    },
    noticeRow: {
      minHeight: hp(3.7),
      borderRadius: hp(1.4),
      paddingHorizontal: wp(2.5),
      marginTop: hp(1.5),
      flexDirection: "row",
      alignItems: "center",
      gap: wp(1.5),
      backgroundColor: `${colors.warning || "#F59E0B"}14`,
    },
    noticeText: {
      flex: 1,
      color: colors.textSecondary,
      fontSize: Math.min(hp(1.08), wp(2.55)),
      fontWeight: "800",
    },
  });

export default StepCounterCard;
