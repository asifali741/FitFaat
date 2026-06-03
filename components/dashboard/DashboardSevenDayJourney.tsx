import { Ionicons } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from "react-native-responsive-screen";
import type {
  DashboardDay,
} from "@/components/dashboard/DashboardCommandCenter";
import {
  getHydrationValue,
} from "@/utils/dashboardProgress";
import {
  formatCalorieTarget,
  formatHydrationTarget,
  getCalorieTargetProgress,
  getHydrationTargetProgress,
  type GoalDisplayMode,
} from "@/utils/goalTargetDisplay";
import {
  cleanWalkingSteps,
  DEFAULT_STEP_GOAL,
  getWalkingCaloriesBurned,
} from "@/utils/localWalkingProgress";

type DashboardSevenDayJourneyProps = {
  days: DashboardDay[];
  goalDisplayMode: GoalDisplayMode;
  isPremium: boolean;
  colors: any;
  onOpenDay: (day: DashboardDay) => void;
};

const getDaySortTime = (day: DashboardDay) => {
  const time = day.date ? new Date(`${day.date}T12:00:00`).getTime() : NaN;
  if (Number.isFinite(time)) return time;
  return Number(day.dayNo || 0);
};

const getStatusCopy = (status?: DashboardDay["status"]) => {
  if (status === "finished") return "Done";
  if (status === "active") return "Active";
  return "Queued";
};

const getDateLabel = (value?: string) => {
  if (!value) return "";
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
};

const getDayKey = (day: DashboardDay) => `${day.dayNo}-${day.date || "day"}`;

const getPlanningNote = (day: DashboardDay) => {
  const note = (day as any).remarks || (day as any).notes;
  if (note) return note;
  if (day.status === "finished") return "Completed summary is ready for review.";
  if (day.status === "active") return "Today's targets are ready for meals, water, and movement.";
  return "Targets are queued for this day.";
};

const getCalorieTargetRangeLabel = (
  day: DashboardDay,
  goalDisplayMode: GoalDisplayMode,
  plan: "free" | "premium"
) => {
  const min = Math.round(Number(day.targetCaloriesMin || 0));
  const max = Math.round(Number(day.targetCaloriesMax || 0));

  if (Number.isFinite(min) && Number.isFinite(max) && min > 0 && max >= min) {
    return `${min.toLocaleString()}-${max.toLocaleString()}`;
  }

  return formatCalorieTarget(day, goalDisplayMode, plan);
};

const getFoodWaterProgress = (
  day: DashboardDay,
  goalDisplayMode: GoalDisplayMode,
  plan: "free" | "premium"
) => {
  const calorieProgress = getCalorieTargetProgress(day, goalDisplayMode, plan);
  const hydrationProgress = getHydrationTargetProgress(day, goalDisplayMode, plan);
  const metricPercents: number[] = [];

  if (calorieProgress.range.target > 0) {
    metricPercents.push(calorieProgress.percent);
  }

  if (hydrationProgress.range.target > 0) {
    metricPercents.push(hydrationProgress.percent);
  }

  if (!metricPercents.length) return 0;

  const average =
    metricPercents.reduce((sum, value) => sum + value, 0) / metricPercents.length;
  return Math.min(100, Math.max(0, Math.round(average)));
};

const getDaySteps = (day: DashboardDay) =>
  cleanWalkingSteps((day as any).walkingSteps ?? (day as any).steps ?? (day as any).stepCount);

const getDayStepGoal = (day: DashboardDay) => {
  const goal = cleanWalkingSteps(
    (day as any).walkingStepGoal ??
      (day as any).stepGoal ??
      (day as any).targetSteps ??
      (day as any).dailyStepGoal
  );

  return goal > 0 ? goal : DEFAULT_STEP_GOAL;
};

const getStepProgressPercent = (steps: number, goal: number) => {
  if (goal <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((steps / goal) * 100)));
};

const getAverageProgress = (
  days: DashboardDay[],
  goalDisplayMode: GoalDisplayMode,
  plan: "free" | "premium"
) => {
  if (!days.length) return 0;
  const total = days.reduce(
    (sum, day) => sum + getFoodWaterProgress(day, goalDisplayMode, plan),
    0
  );
  return Math.round(total / days.length);
};

export function DashboardSevenDayJourney({
  days,
  goalDisplayMode,
  isPremium,
  colors,
  onOpenDay,
}: DashboardSevenDayJourneyProps) {
  const styles = useMemo(() => getStyles(colors), [colors]);
  const [completedExpanded, setCompletedExpanded] = useState(false);
  const plan = isPremium ? "premium" : "free";
  const sortedDays = useMemo(
    () => [...days].sort((left, right) => getDaySortTime(left) - getDaySortTime(right)),
    [days]
  );
  const activeDay = useMemo(
    () => sortedDays.find((day) => day.status === "active") || null,
    [sortedDays]
  );
  const featuredDay = useMemo(
    () =>
      activeDay ||
      sortedDays.find((day) => day.status !== "finished") ||
      sortedDays[0] ||
      null,
    [activeDay, sortedDays]
  );
  const featuredDayKey = featuredDay ? getDayKey(featuredDay) : null;
  const completedDays = useMemo(
    () => sortedDays.filter((day) => day.status === "finished"),
    [sortedDays]
  );
  const queuedDays = useMemo(
    () =>
      sortedDays.filter(
        (day) => day.status !== "finished" && getDayKey(day) !== featuredDayKey
      ),
    [featuredDayKey, sortedDays]
  );
  const completedAverage = useMemo(
    () => getAverageProgress(completedDays, goalDisplayMode, plan),
    [completedDays, goalDisplayMode, plan]
  );
  const completedCount = completedDays.length;

  const getStatusColor = (day: DashboardDay) => {
    if (day.status === "finished") return colors.success || "#10B981";
    if (day.status === "active") return colors.primary;
    return colors.textSecondary;
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 80) return colors.success || "#10B981";
    if (progress >= 45) return colors.warning || "#F59E0B";
    return colors.error || "#EF4444";
  };

  const renderCompactDay = (day: DashboardDay, variant: "completed" | "queued") => {
    const progress = getFoodWaterProgress(day, goalDisplayMode, plan);
    const statusColor = getStatusColor(day);
    const progressColor = getProgressColor(progress);
    const calorieTarget = getCalorieTargetRangeLabel(day, goalDisplayMode, plan);
    const achievedCalories = Math.round(Number(day.achievedCalories || 0)).toLocaleString();

    return (
      <TouchableOpacity
        key={getDayKey(day)}
        style={[
          styles.compactDayCard,
          variant === "completed" && styles.compactDayCardDone,
        ]}
        onPress={() => onOpenDay(day)}
        activeOpacity={0.84}
        accessibilityRole="button"
        accessibilityLabel={`Open day ${day.dayNo} progress`}
      >
        <View style={[styles.compactDayBadge, { backgroundColor: `${statusColor}18` }]}>
          <Text style={[styles.compactDayBadgeText, { color: statusColor }]}>
            {String(day.dayNo).padStart(2, "0")}
          </Text>
        </View>
        <View style={styles.compactDayCopy}>
          <View style={styles.compactDayTopRow}>
            <Text style={styles.compactDayTitle} numberOfLines={1}>
              Day {day.dayNo}
            </Text>
            <Text style={[styles.compactStatusText, { color: statusColor }]}>
              {getStatusCopy(day.status)}
            </Text>
          </View>
          <Text style={styles.compactMeta} numberOfLines={1} adjustsFontSizeToFit>
            {getDateLabel(day.date)} - {achievedCalories} / {calorieTarget} cal
          </Text>
          <View style={styles.compactProgressRow}>
            <View style={styles.compactProgressTrack}>
              <View
                style={[
                  styles.compactProgressFill,
                  {
                    backgroundColor: progressColor,
                    width: `${Math.min(Math.max(progress, 0), 100)}%`,
                  },
                ]}
              />
            </View>
            <Text style={[styles.compactProgressText, { color: progressColor }]}>{progress}%</Text>
          </View>
        </View>
        <Ionicons
          name="chevron-forward"
          size={Math.min(hp(1.8), wp(4))}
          color={colors.textSecondary}
        />
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>7-Day Journey</Text>
          <Text style={styles.title}>Plan and progress</Text>
          <Text style={styles.subtitle}>
            {completedCount}/7 days completed. Tap any day to update meals, water, or progress.
          </Text>
        </View>
      </View>

      {featuredDay ? (
        <View
          style={[
            styles.dayCard,
            styles.dayCardActive,
            {
              borderColor: featuredDay.status === "active" ? colors.primary : colors.cardBorder || colors.border,
            },
          ]}
        >
          {(() => {
            const progress = getFoodWaterProgress(featuredDay, goalDisplayMode, plan);
            const statusColor = getStatusColor(featuredDay);
            const progressColor = getProgressColor(progress);
            const calorieTarget = getCalorieTargetRangeLabel(featuredDay, goalDisplayMode, plan);
            const achievedCalories = Math.round(Number(featuredDay.achievedCalories || 0)).toLocaleString();
            const hydrationValue = getHydrationValue(featuredDay).toFixed(1);
            const hydrationTarget = formatHydrationTarget(featuredDay, goalDisplayMode, plan);
            const walkingSteps = getDaySteps(featuredDay);
            const walkingStepGoal = getDayStepGoal(featuredDay);
            const walkingProgress = getStepProgressPercent(walkingSteps, walkingStepGoal);
            const walkingCalories = getWalkingCaloriesBurned(featuredDay);
            const walkingMeta =
              walkingProgress >= 100
                ? "Step goal met"
                : `${Math.max(0, walkingStepGoal - walkingSteps).toLocaleString()} steps left`;

            return (
              <>
                <View style={styles.dayHeader}>
                  <View style={styles.dayIdentity}>
                    <View style={[styles.dayNumberBadge, { backgroundColor: `${statusColor}18` }]}>
                      <Text style={[styles.dayNumber, { color: statusColor }]}>
                        {String(featuredDay.dayNo).padStart(2, "0")}
                      </Text>
                    </View>
                    <View style={styles.dayTitleWrap}>
                      <Text style={[styles.dayTitle, { color: colors.textPrimary }]}>
                        Day {featuredDay.dayNo}
                      </Text>
                      <Text
                        style={[styles.dayDate, { color: colors.textSecondary }]}
                        numberOfLines={1}
                        adjustsFontSizeToFit
                      >
                        {featuredDay.date || getDateLabel(featuredDay.date)}
                      </Text>
                    </View>
                  </View>

                  <View style={[styles.statusBadge, { backgroundColor: `${statusColor}18` }]}>
                    <Text style={[styles.statusText, { color: statusColor }]}>
                      {getStatusCopy(featuredDay.status)}
                    </Text>
                  </View>
                </View>

                <View style={styles.progressBlock}>
                  <View style={styles.progressTopRow}>
                    <Text style={[styles.progressLabel, { color: colors.textSecondary }]}>Food + Water</Text>
                    <Text style={[styles.progressValue, { color: progressColor }]}>{progress}%</Text>
                  </View>
                  <View style={[styles.progressTrack, { backgroundColor: colors.border || "#E5E7EB" }]}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          backgroundColor: progressColor,
                          width: `${Math.min(Math.max(progress, 0), 100)}%`,
                        },
                      ]}
                    />
                  </View>
                </View>

                <View style={styles.metricGrid}>
                  <MetricPill
                    icon="flame"
                    label="Calories"
                    value={`${achievedCalories}/${calorieTarget}`}
                    color="#F97316"
                    colors={colors}
                  />
                  <MetricPill
                    icon="water"
                    label="Hydration"
                    value={`${hydrationValue}/${hydrationTarget} L`}
                    color="#2E86AB"
                    colors={colors}
                  />
                  <MetricPill
                    icon="footsteps"
                    label="Walking"
                    value={`${walkingSteps.toLocaleString()}/${walkingStepGoal.toLocaleString()}`}
                    color="#22C55E"
                    colors={colors}
                  />
                </View>

                <View style={styles.walkingProgressBlock}>
                  <View style={styles.progressTopRow}>
                    <Text style={[styles.progressLabel, { color: colors.textSecondary }]}>Steps Progress</Text>
                    <Text style={[styles.progressValue, { color: "#22C55E" }]}>{walkingProgress}%</Text>
                  </View>
                  <View style={[styles.progressTrack, { backgroundColor: colors.border || "#E5E7EB" }]}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          backgroundColor: "#22C55E",
                          width: `${walkingProgress}%`,
                        },
                      ]}
                    />
                  </View>
                  <Text style={[styles.walkingProgressMeta, { color: colors.textSecondary }]}>
                    {walkingMeta}
                    {walkingCalories > 0 ? ` - ${walkingCalories.toLocaleString()} walking kcal` : ""}
                  </Text>
                </View>

                <View style={[styles.noteBox, { backgroundColor: colors.surface || colors.primarySoft }]}>
                  <Ionicons
                    name="calendar-outline"
                    size={Math.min(hp(1.9), wp(4.2))}
                    color={statusColor}
                  />
                  <Text
                    style={[styles.noteText, { color: colors.textSecondary }]}
                    numberOfLines={2}
                    adjustsFontSizeToFit
                    minimumFontScale={0.82}
                  >
                    {getPlanningNote(featuredDay)}
                  </Text>
                </View>

                <TouchableOpacity
                  style={[styles.detailsButton, { backgroundColor: colors.primary }]}
                  onPress={() => onOpenDay(featuredDay)}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityLabel={`View details for day ${featuredDay.dayNo}`}
                >
                  <Text style={[styles.detailsButtonText, { color: colors.textOnPrimary }]}>View Details</Text>
                  <Ionicons
                    name="arrow-forward"
                    size={Math.min(hp(1.9), wp(4.2))}
                    color={colors.textOnPrimary}
                  />
                </TouchableOpacity>
              </>
            );
          })()}
        </View>
      ) : null}

      {completedDays.length ? (
        <View style={styles.completedGroup}>
          <TouchableOpacity
            style={styles.completedToggle}
            onPress={() => setCompletedExpanded((value) => !value)}
            activeOpacity={0.84}
            accessibilityRole="button"
            accessibilityLabel="Toggle completed days"
          >
            <View style={styles.completedToggleIcon}>
              <Ionicons
                name="checkmark-done-outline"
                size={Math.min(hp(2.2), wp(4.9))}
                color={colors.success || "#10B981"}
              />
            </View>
            <View style={styles.completedToggleCopy}>
              <Text style={styles.completedToggleTitle}>Completed days</Text>
              <Text style={styles.completedToggleText}>
                {completedDays.length} done - {completedAverage}% food and water avg
              </Text>
            </View>
            <Ionicons
              name={completedExpanded ? "chevron-up" : "chevron-down"}
              size={Math.min(hp(2), wp(4.5))}
              color={colors.textSecondary}
            />
          </TouchableOpacity>
          {completedExpanded ? completedDays.map((day) => renderCompactDay(day, "completed")) : null}
        </View>
      ) : null}

      {queuedDays.length ? (
        <View style={styles.queueGroup}>
          {queuedDays.map((day) => renderCompactDay(day, "queued"))}
        </View>
      ) : null}
    </View>
  );
}

function MetricPill({
  icon,
  label,
  value,
  color,
  colors,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  color: string;
  colors: any;
}) {
  const styles = useMemo(() => getStyles(colors), [colors]);

  return (
    <View style={[styles.metricPill, { backgroundColor: colors.surface || colors.primarySoft }]}>
      <View style={[styles.metricIcon, { backgroundColor: `${color}18` }]}>
        <Ionicons name={icon} size={Math.min(hp(1.85), wp(4.1))} color={color} />
      </View>
      <View style={styles.metricCopy}>
        <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>{label}</Text>
        <Text
          style={[styles.metricValue, { color: colors.textPrimary }]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.68}
        >
          {value}
        </Text>
      </View>
    </View>
  );
}

const getStyles = (colors: any) =>
  StyleSheet.create({
    section: {
      paddingHorizontal: wp(4),
      marginTop: hp(1),
      marginBottom: hp(1.7),
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: wp(3),
      marginBottom: hp(1.1),
    },
    headerCopy: {
      flex: 1,
      minWidth: 0,
    },
    eyebrow: {
      color: colors.primary,
      fontSize: Math.min(hp(1.05), wp(2.55)),
      fontWeight: "900",
      textTransform: "uppercase",
    },
    title: {
      color: colors.textPrimary,
      fontSize: Math.min(hp(2.05), wp(4.8)),
      fontWeight: "900",
      marginTop: hp(0.15),
    },
    subtitle: {
      color: colors.textSecondary,
      fontSize: Math.min(hp(1.18), wp(2.85)),
      lineHeight: hp(1.75),
      fontWeight: "700",
      marginTop: hp(0.25),
    },
    dayCard: {
      backgroundColor: colors.cardBackground,
      borderWidth: Math.min(wp(0.28), hp(0.16)),
      borderRadius: hp(1.45),
      padding: wp(3.4),
      marginBottom: hp(1.3),
      shadowColor: colors.black || "#000000",
      shadowOffset: { width: 0, height: hp(0.25) },
      shadowOpacity: 0.08,
      shadowRadius: wp(1.4),
      elevation: 3,
    },
    dayCardActive: {
      borderWidth: Math.min(wp(0.42), hp(0.24)),
      shadowOpacity: 0.13,
      elevation: 5,
    },
    dayHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: wp(2),
    },
    dayIdentity: {
      flex: 1,
      minWidth: 0,
      flexDirection: "row",
      alignItems: "center",
    },
    dayNumberBadge: {
      width: Math.min(hp(5.2), wp(11.5)),
      height: Math.min(hp(5.2), wp(11.5)),
      borderRadius: hp(1.3),
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    },
    dayNumber: {
      fontSize: Math.min(hp(2), wp(4.6)),
      fontWeight: "900",
    },
    dayTitleWrap: {
      flex: 1,
      minWidth: 0,
      marginLeft: wp(2.4),
    },
    dayTitle: {
      fontSize: Math.min(hp(1.8), wp(4.15)),
      fontWeight: "900",
    },
    dayDate: {
      marginTop: hp(0.25),
      fontSize: Math.min(hp(1.28), wp(3)),
      fontWeight: "700",
    },
    statusBadge: {
      minHeight: hp(3.2),
      borderRadius: hp(1.6),
      paddingHorizontal: wp(2.4),
      alignItems: "center",
      justifyContent: "center",
    },
    statusText: {
      fontSize: Math.min(hp(1.2), wp(2.8)),
      fontWeight: "900",
      textTransform: "uppercase",
    },
    progressBlock: {
      marginTop: hp(1.4),
    },
    progressTopRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: hp(0.65),
    },
    progressLabel: {
      fontSize: Math.min(hp(1.22), wp(2.85)),
      fontWeight: "900",
      textTransform: "uppercase",
    },
    progressValue: {
      fontSize: Math.min(hp(1.45), wp(3.35)),
      fontWeight: "900",
    },
    activeDayCard: {
      backgroundColor: colors.cardBackground,
      borderWidth: 2,
      borderRadius: hp(1.65),
      paddingHorizontal: wp(3.4),
      paddingVertical: hp(1.35),
      shadowColor: colors.black,
      shadowOffset: { width: 0, height: hp(0.35) },
      shadowOpacity: 0.14,
      shadowRadius: wp(1.7),
      elevation: 5,
    },
    activeTopRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: wp(2),
    },
    activeIdentity: {
      flex: 1,
      minWidth: 0,
      flexDirection: "row",
      alignItems: "center",
    },
    activeDayBadge: {
      width: Math.min(hp(5.2), wp(11.6)),
      height: Math.min(hp(5.2), wp(11.6)),
      borderRadius: hp(1.35),
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    },
    activeDayBadgeText: {
      fontSize: Math.min(hp(1.9), wp(4.4)),
      fontWeight: "900",
    },
    activeCopy: {
      flex: 1,
      minWidth: 0,
      marginLeft: wp(2.4),
    },
    activeEyebrow: {
      color: colors.primary,
      fontSize: Math.min(hp(1.08), wp(2.55)),
      fontWeight: "900",
      textTransform: "uppercase",
    },
    activeTitle: {
      color: colors.textPrimary,
      fontSize: Math.min(hp(1.9), wp(4.4)),
      fontWeight: "900",
    },
    activeDate: {
      color: colors.textSecondary,
      fontSize: Math.min(hp(1.18), wp(2.8)),
      fontWeight: "700",
      marginTop: hp(0.2),
    },
    activeStatsRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginTop: hp(1.35),
      paddingVertical: hp(0.95),
      paddingHorizontal: wp(2.2),
      borderRadius: hp(1.15),
      backgroundColor: colors.surface || colors.primarySoft || `${colors.primary}10`,
    },
    activeStat: {
      flex: 1,
      minWidth: 0,
    },
    activeStatDivider: {
      width: 1,
      height: hp(3),
      backgroundColor: colors.border || "#E5E7EB",
      marginHorizontal: wp(2.2),
    },
    activeStatLabel: {
      color: colors.textSecondary,
      fontSize: Math.min(hp(1.04), wp(2.45)),
      fontWeight: "900",
      textTransform: "uppercase",
    },
    activeStatValue: {
      color: colors.textPrimary,
      fontSize: Math.min(hp(1.65), wp(3.9)),
      fontWeight: "900",
      marginTop: hp(0.25),
    },
    progressTrack: {
      height: hp(0.85),
      borderRadius: hp(0.45),
      overflow: "hidden",
      backgroundColor: colors.border || "#E5E7EB",
    },
    progressFill: {
      height: "100%",
      borderRadius: hp(0.45),
    },
    metricGrid: {
      marginTop: hp(1.35),
      flexDirection: "row",
      flexWrap: "wrap",
      gap: wp(2),
    },
    metricPill: {
      width: "48%",
      minHeight: hp(5.8),
      borderRadius: hp(1.2),
      paddingHorizontal: wp(2.2),
      paddingVertical: hp(0.75),
      flexDirection: "row",
      alignItems: "center",
    },
    metricIcon: {
      width: Math.min(hp(3.4), wp(7.5)),
      height: Math.min(hp(3.4), wp(7.5)),
      borderRadius: Math.min(hp(1.7), wp(3.75)),
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    },
    metricCopy: {
      flex: 1,
      minWidth: 0,
      marginLeft: wp(1.7),
    },
    metricLabel: {
      fontSize: Math.min(hp(1.04), wp(2.45)),
      fontWeight: "900",
      textTransform: "uppercase",
    },
    metricValue: {
      marginTop: hp(0.18),
      fontSize: Math.min(hp(1.35), wp(3.15)),
      fontWeight: "900",
    },
    walkingProgressBlock: {
      marginTop: hp(1.15),
    },
    walkingProgressMeta: {
      marginTop: hp(0.55),
      fontSize: Math.min(hp(1.08), wp(2.55)),
      fontWeight: "700",
    },
    noteBox: {
      marginTop: hp(1.15),
      borderRadius: hp(1.2),
      paddingHorizontal: wp(2.6),
      paddingVertical: hp(0.9),
      flexDirection: "row",
      alignItems: "flex-start",
      gap: wp(1.6),
    },
    noteText: {
      flex: 1,
      minWidth: 0,
      fontSize: Math.min(hp(1.18), wp(2.8)),
      lineHeight: hp(1.7),
      fontWeight: "700",
    },
    detailsButton: {
      marginTop: hp(1.15),
      minHeight: hp(4.6),
      borderRadius: hp(1.35),
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: wp(1.4),
    },
    detailsButtonText: {
      fontSize: Math.min(hp(1.42), wp(3.3)),
      fontWeight: "900",
    },
    completedGroup: {
      marginTop: hp(1),
    },
    completedToggle: {
      minHeight: hp(6.2),
      borderRadius: hp(1.35),
      borderWidth: 1,
      borderColor: colors.cardBorder || colors.border,
      backgroundColor: colors.cardBackground,
      paddingHorizontal: wp(3),
      paddingVertical: hp(0.9),
      flexDirection: "row",
      alignItems: "center",
      gap: wp(2),
    },
    completedToggleIcon: {
      width: Math.min(hp(3.8), wp(8.4)),
      height: Math.min(hp(3.8), wp(8.4)),
      borderRadius: hp(1.1),
      backgroundColor: `${colors.success || "#10B981"}18`,
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    },
    completedToggleCopy: {
      flex: 1,
      minWidth: 0,
    },
    completedToggleTitle: {
      color: colors.textPrimary,
      fontSize: Math.min(hp(1.45), wp(3.4)),
      fontWeight: "900",
    },
    completedToggleText: {
      color: colors.textSecondary,
      fontSize: Math.min(hp(1.12), wp(2.65)),
      fontWeight: "700",
      marginTop: hp(0.18),
    },
    queueGroup: {
      marginTop: hp(1),
      gap: hp(0.8),
    },
    compactDayCard: {
      minHeight: hp(7.8),
      borderRadius: hp(1.3),
      borderWidth: 1,
      borderColor: colors.cardBorder || colors.border,
      backgroundColor: colors.cardBackground,
      paddingHorizontal: wp(2.7),
      paddingVertical: hp(0.85),
      flexDirection: "row",
      alignItems: "center",
      gap: wp(2.1),
    },
    compactDayCardDone: {
      marginTop: hp(0.75),
    },
    compactDayBadge: {
      width: Math.min(hp(4.2), wp(9.4)),
      height: Math.min(hp(4.2), wp(9.4)),
      borderRadius: hp(1.15),
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    },
    compactDayBadgeText: {
      fontSize: Math.min(hp(1.55), wp(3.6)),
      fontWeight: "900",
    },
    compactDayCopy: {
      flex: 1,
      minWidth: 0,
    },
    compactDayTopRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: wp(2),
    },
    compactDayTitle: {
      flex: 1,
      color: colors.textPrimary,
      fontSize: Math.min(hp(1.42), wp(3.35)),
      fontWeight: "900",
    },
    compactStatusText: {
      fontSize: Math.min(hp(1), wp(2.35)),
      fontWeight: "900",
      textTransform: "uppercase",
    },
    compactMeta: {
      color: colors.textSecondary,
      fontSize: Math.min(hp(1.08), wp(2.55)),
      fontWeight: "700",
      marginTop: hp(0.18),
    },
    compactProgressRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: wp(1.6),
      marginTop: hp(0.55),
    },
    compactProgressTrack: {
      flex: 1,
      height: hp(0.55),
      borderRadius: hp(0.28),
      overflow: "hidden",
      backgroundColor: colors.border || "#E5E7EB",
    },
    compactProgressFill: {
      height: "100%",
      borderRadius: hp(0.28),
    },
    compactProgressText: {
      width: wp(8.2),
      textAlign: "right",
      fontSize: Math.min(hp(1.05), wp(2.5)),
      fontWeight: "900",
    },
  });

export default DashboardSevenDayJourney;
