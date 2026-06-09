import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useMemo, useState } from "react";
import {
  Modal,
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
import {
  getBurnedCaloriesTarget,
  getDashboardGoalProgress,
  getHydrationValue,
} from "@/utils/dashboardProgress";
import { getExerciseCaloriesBurned } from "@/utils/localExerciseProgress";
import {
  getWalkingCaloriesBurned,
  getWalkingCaloriesTarget,
} from "@/utils/localWalkingProgress";
import {
  getGoalExperience,
  getGoalProgressStatusLabel,
} from "@/utils/goalExperience";
import { buildGoalProgressInterpretation } from "@/utils/goalAdaptivePlan";
import {
  loadGoalSpineKey,
  normalizeGoalSpineKey,
  type GoalSpineDay,
  type GoalSpineKey,
} from "@/utils/goalSpine";

const ACTIVITY_HEATMAP_STORAGE_KEY = "fitfaat_activity_heatmap_snapshots";
const MAX_HISTORY_DAYS = 190;

type HeatmapDay = {
  _id?: string;
  dayNo?: number;
  date?: string;
  status?: "locked" | "active" | "finished";
  achievedCalories?: number;
  targetCalories?: number;
  achieviedHydration?: number;
  achievedHydration?: number;
  targetHydration?: number;
  exerciseCaloriesBurned?: number;
  exerciseDurationSeconds?: number;
  walkingCaloriesBurned?: number;
  targetWalkingCaloriesBurned?: number;
};

type ActivitySnapshot = {
  dateKey: string;
  dayNo?: number;
  status?: string;
  progress: number;
  achievedCalories: number;
  targetCalories: number;
  achievedHydration: number;
  targetHydration: number;
  exerciseCalories: number;
  exerciseTarget: number;
  walkingCalories: number;
  walkingTarget: number;
  updatedAt: string;
};

type ActivityHeatmapProps = {
  days: HeatmapDay[];
  goal?: GoalSpineKey | string | number | null;
  includeExercise?: boolean;
  enableAdvancedFilters?: boolean;
  colors: any;
  embedded?: boolean;
};

const snapshotToGoalDay = (snapshot: ActivitySnapshot): GoalSpineDay => ({
  dayNo: snapshot.dayNo,
  date: snapshot.dateKey,
  status: "finished",
  achievedCalories: snapshot.achievedCalories,
  targetCalories: snapshot.targetCalories,
  achievedHydration: snapshot.achievedHydration,
  targetHydration: snapshot.targetHydration,
  exerciseCaloriesBurned: snapshot.exerciseCalories,
  walkingSteps: snapshot.walkingCalories > 0 ? 5000 : 0,
  targetSteps: snapshot.walkingTarget > 0 ? 5000 : 0,
  meals: snapshot.achievedCalories > 0 ? [{}] : [],
});

const getDateKey = (value?: string | Date | null) => {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getStartOfWeek = (date: Date) => {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - start.getDay());
  return start;
};

const addDays = (date: Date, amount: number) => {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + amount);
  return nextDate;
};

const getShortDate = (dateKey: string) => {
  const parsed = new Date(`${dateKey}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return "Unknown";
  return parsed.toLocaleDateString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
};

const clampProgress = (value: number) =>
  Math.min(100, Math.max(0, Math.round(Number.isFinite(value) ? value : 0)));

const getCellColor = (progress: number, colors: any, isFuture = false) => {
  if (isFuture) return colors.cardBorder || colors.border || "#E2E8F0";
  if (progress <= 0) return colors.cardBorder || "#E2E8F0";
  if (progress < 35) return "#BBF7D0";
  if (progress < 70) return "#4ADE80";
  if (progress < 100) return "#22C55E";
  return "#15803D";
};

const snapshotFromDay = (day: HeatmapDay, includeExercise: boolean): ActivitySnapshot | null => {
  const dateKey = getDateKey(day.date);
  if (!dateKey) return null;

  const todayKey = getDateKey();
  if (dateKey > todayKey) return null;

  const progress = clampProgress(getDashboardGoalProgress(day));
  const exerciseTarget = includeExercise ? getBurnedCaloriesTarget(day) : 0;

  return {
    dateKey,
    dayNo: day.dayNo,
    status: day.status,
    progress,
    achievedCalories: Number(day.achievedCalories || 0),
    targetCalories: Number(day.targetCalories || 0),
    achievedHydration: getHydrationValue(day),
    targetHydration: Number(day.targetHydration || 0),
    exerciseCalories: includeExercise ? getExerciseCaloriesBurned(day) : 0,
    exerciseTarget,
    walkingCalories: includeExercise ? getWalkingCaloriesBurned(day) : 0,
    walkingTarget: includeExercise ? getWalkingCaloriesTarget(day) : 0,
    updatedAt: new Date().toISOString(),
  };
};

const normalizeStoredHistory = (value: unknown): ActivitySnapshot[] => {
  if (!Array.isArray(value)) return [];

  return value
    .map((item: any) => ({
      dateKey: String(item?.dateKey || ""),
      dayNo: item?.dayNo,
      status: item?.status,
      progress: clampProgress(Number(item?.progress || 0)),
      achievedCalories: Number(item?.achievedCalories || 0),
      targetCalories: Number(item?.targetCalories || 0),
      achievedHydration: Number(item?.achievedHydration || 0),
      targetHydration: Number(item?.targetHydration || 0),
      exerciseCalories: Number(item?.exerciseCalories || 0),
      exerciseTarget: Number(item?.exerciseTarget || 0),
      walkingCalories: Number(item?.walkingCalories || 0),
      walkingTarget: Number(item?.walkingTarget || 0),
      updatedAt: String(item?.updatedAt || new Date().toISOString()),
    }))
    .filter((item) => item.dateKey);
};

const mergeSnapshots = (
  storedHistory: ActivitySnapshot[],
  days: HeatmapDay[],
  includeExercise: boolean
) => {
  const historyMap = new Map<string, ActivitySnapshot>();
  storedHistory.forEach((item) => historyMap.set(item.dateKey, item));

  days
    .map((day) => snapshotFromDay(day, includeExercise))
    .filter((item): item is ActivitySnapshot => Boolean(item))
    .forEach((snapshot) => {
      const previous = historyMap.get(snapshot.dateKey);
      historyMap.set(snapshot.dateKey, {
        ...previous,
        ...snapshot,
        progress: snapshot.progress,
        updatedAt: snapshot.updatedAt,
      });
    });

  return Array.from(historyMap.values())
    .sort((a, b) => a.dateKey.localeCompare(b.dateKey))
    .slice(-MAX_HISTORY_DAYS);
};

const buildWeekGrid = (weeks: number) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const currentWeekStart = getStartOfWeek(today);
  const firstWeekStart = addDays(currentWeekStart, -(weeks - 1) * 7);

  return Array.from({ length: weeks }, (_, weekIndex) =>
    Array.from({ length: 7 }, (_, dayIndex) => {
      const date = addDays(firstWeekStart, weekIndex * 7 + dayIndex);
      return {
        date,
        dateKey: getDateKey(date),
        isFuture: date.getTime() > today.getTime(),
      };
    })
  );
};

const getMonthLabels = (weekGrid: ReturnType<typeof buildWeekGrid>) => {
  const labels: { key: string; label: string; width: number }[] = [];
  let currentMonth = "";
  let currentWidth = 0;

  weekGrid.forEach((week) => {
    const labelDate = week[0]?.date;
    const month = labelDate
      ? labelDate.toLocaleDateString([], { month: "short" })
      : "";

    if (!currentMonth) {
      currentMonth = month;
      currentWidth = 1;
      return;
    }

    if (month === currentMonth) {
      currentWidth += 1;
      return;
    }

    labels.push({ key: `${currentMonth}-${labels.length}`, label: currentMonth, width: currentWidth });
    currentMonth = month;
    currentWidth = 1;
  });

  if (currentMonth) {
    labels.push({ key: `${currentMonth}-${labels.length}`, label: currentMonth, width: currentWidth });
  }

  return labels;
};

export function ActivityHeatmap({
  days,
  goal,
  includeExercise = false,
  enableAdvancedFilters = false,
  colors,
  embedded = false,
}: ActivityHeatmapProps) {
  const [activityHistory, setActivityHistory] = useState<ActivitySnapshot[]>([]);
  const [rangeWeeks, setRangeWeeks] = useState<12 | 26>(12);
  const [selectedSnapshot, setSelectedSnapshot] = useState<ActivitySnapshot | null>(null);
  const [localGoal, setLocalGoal] = useState<GoalSpineKey>("unset");

  const styles = useMemo(() => getStyles(colors, embedded), [colors, embedded]);
  const resolvedGoal = normalizeGoalSpineKey(goal ?? localGoal);
  const goalExperience = getGoalExperience(resolvedGoal);
  const daysSignature = useMemo(
    () =>
      days
        .map((day) =>
          [
            day.date,
            day.status,
            day.achievedCalories,
            day.achieviedHydration,
            day.achievedHydration,
            day.exerciseCaloriesBurned,
            day.walkingCaloriesBurned,
            day.targetWalkingCaloriesBurned,
          ].join(":")
        )
        .join("|"),
    [days]
  );

  useEffect(() => {
    if (!enableAdvancedFilters && rangeWeeks !== 12) {
      setRangeWeeks(12);
    }
  }, [enableAdvancedFilters, rangeWeeks]);

  useEffect(() => {
    if (goal !== undefined && goal !== null) return;

    loadGoalSpineKey()
      .then(setLocalGoal)
      .catch((error) => {
        console.log("[ActivityHeatmap] Unable to load goal context:", error);
        setLocalGoal("unset");
      });
  }, [goal]);

  useEffect(() => {
    let isActive = true;

    const syncActivityHistory = async () => {
      try {
        const storedHistory = await AsyncStorage.getItem(ACTIVITY_HEATMAP_STORAGE_KEY);
        const parsedHistory = storedHistory ? JSON.parse(storedHistory) : [];
        const normalizedHistory = normalizeStoredHistory(parsedHistory);
        const mergedHistory = mergeSnapshots(normalizedHistory, days, includeExercise);

        if (isActive) {
          setActivityHistory(mergedHistory);
        }

        if (JSON.stringify(mergedHistory) !== JSON.stringify(normalizedHistory)) {
          await AsyncStorage.setItem(ACTIVITY_HEATMAP_STORAGE_KEY, JSON.stringify(mergedHistory));
        }
      } catch (error) {
        console.log("[ActivityHeatmap] Unable to sync local activity history:", error);
      }
    };

    syncActivityHistory();
    return () => {
      isActive = false;
    };
  }, [days, daysSignature, includeExercise]);

  const historyByDate = useMemo(() => {
    const map = new Map<string, ActivitySnapshot>();
    activityHistory.forEach((snapshot) => map.set(snapshot.dateKey, snapshot));
    return map;
  }, [activityHistory]);

  const weekGrid = useMemo(() => buildWeekGrid(rangeWeeks), [rangeWeeks]);
  const monthLabels = useMemo(() => getMonthLabels(weekGrid), [weekGrid]);

  const currentRangeSnapshots = useMemo(() => {
    const rangeKeys = new Set(weekGrid.flat().map((item) => item.dateKey));
    return activityHistory.filter((snapshot) => rangeKeys.has(snapshot.dateKey));
  }, [activityHistory, weekGrid]);

  const activeDays = currentRangeSnapshots.filter((snapshot) => snapshot.progress > 0).length;
  const perfectDays = currentRangeSnapshots.filter((snapshot) => snapshot.progress >= 100).length;
  const averageProgress = currentRangeSnapshots.length
    ? Math.round(
        currentRangeSnapshots.reduce((sum, snapshot) => sum + snapshot.progress, 0) /
          currentRangeSnapshots.length
      )
    : 0;
  const heatmapGoalStatus = getGoalProgressStatusLabel({
    goal: resolvedGoal,
    progressPercent: averageProgress,
    trackedDays: activeDays,
  });
  const selectedGoalStatus = getGoalProgressStatusLabel({
    goal: resolvedGoal,
    progressPercent: selectedSnapshot?.progress || 0,
    trackedDays: selectedSnapshot?.progress ? 1 : 0,
  });
  const interpretationDays = useMemo(
    () => currentRangeSnapshots.map(snapshotToGoalDay),
    [currentRangeSnapshots]
  );
  const heatmapInterpretation = useMemo(
    () =>
      buildGoalProgressInterpretation({
        goal: resolvedGoal,
        days: interpretationDays,
        isPremium: includeExercise,
      }),
    [includeExercise, interpretationDays, resolvedGoal]
  );
  const selectedGoalDay = useMemo(
    () => (selectedSnapshot ? snapshotToGoalDay(selectedSnapshot) : null),
    [selectedSnapshot]
  );
  const selectedInterpretation = useMemo(
    () =>
      selectedGoalDay
        ? buildGoalProgressInterpretation({
            goal: resolvedGoal,
            days: [selectedGoalDay],
            today: selectedGoalDay,
            isPremium: includeExercise,
          })
        : null,
    [includeExercise, resolvedGoal, selectedGoalDay]
  );

  const renderSummaryStat = (label: string, value: string, icon: keyof typeof Ionicons.glyphMap, color: string) => (
    <View style={styles.statItem}>
      <Ionicons name={icon} size={Math.min(hp(2), wp(4.5))} color={color} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );

  return (
    <View style={styles.section}>
      <View style={styles.card}>
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>Consistency</Text>
            <Text style={styles.title}>Activity Heatmap</Text>
            <Text style={[styles.goalStatusText, { color: goalExperience.color }]}>
              {heatmapGoalStatus}
            </Text>
            <Text style={styles.goalInterpretationText} numberOfLines={2}>
              Helping: {heatmapInterpretation.helping.join(", ")}. Blocking: {heatmapInterpretation.blocking.join(", ")}.
            </Text>
          </View>
          {enableAdvancedFilters ? (
            <View style={styles.rangeSwitch}>
              {[
                { label: "12W", value: 12 as const },
                { label: "6M", value: 26 as const },
              ].map((option) => {
                const active = rangeWeeks === option.value;
                return (
                  <TouchableOpacity
                    key={option.label}
                    style={[styles.rangeButton, active && { backgroundColor: colors.primary }]}
                    onPress={() => setRangeWeeks(option.value)}
                    activeOpacity={0.82}
                  >
                    <Text style={[styles.rangeText, active && { color: colors.textOnPrimary }]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : null}
        </View>

        <View style={styles.statsRow}>
          {renderSummaryStat("Active", String(activeDays), "checkmark-done-outline", colors.primary)}
          {renderSummaryStat("Perfect", String(perfectDays), "trophy-outline", "#15803D")}
          {renderSummaryStat("Average", `${averageProgress}%`, "pulse-outline", "#22C55E")}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.heatmapScrollContent}
        >
          <View>
            <View style={styles.monthRow}>
              {monthLabels.map((item) => (
                <Text
                  key={item.key}
                  style={[
                    styles.monthLabel,
                    { width: item.width * (Math.min(hp(2.05), wp(4.55)) + wp(0.75)) },
                  ]}
                  numberOfLines={1}
                >
                  {item.label}
                </Text>
              ))}
            </View>
            <View style={styles.gridWrap}>
              <View style={styles.dayLabels}>
                {["S", "M", "T", "W", "T", "F", "S"].map((label, index) => (
                  <Text key={`${label}-${index}`} style={styles.dayLabel}>
                    {label}
                  </Text>
                ))}
              </View>
              <View style={styles.weeksRow}>
                {weekGrid.map((week, weekIndex) => (
                  <View key={`week-${weekIndex}`} style={styles.weekColumn}>
                    {week.map((cell) => {
                      const snapshot = historyByDate.get(cell.dateKey);
                      const progress = snapshot?.progress || 0;

                      return (
                        <TouchableOpacity
                          key={cell.dateKey}
                          style={[
                            styles.heatCell,
                            {
                              backgroundColor: getCellColor(progress, colors, cell.isFuture),
                              opacity: cell.isFuture ? 0.38 : 1,
                            },
                          ]}
                          onPress={() => {
                            if (!cell.isFuture) {
                              setSelectedSnapshot(
                                snapshot || {
                                  dateKey: cell.dateKey,
                                  progress: 0,
                                  achievedCalories: 0,
                                  targetCalories: 0,
                                  achievedHydration: 0,
                                  targetHydration: 0,
                                  exerciseCalories: 0,
                                  exerciseTarget: 0,
                                  walkingCalories: 0,
                                  walkingTarget: 0,
                                  updatedAt: new Date().toISOString(),
                                }
                              );
                            }
                          }}
                          activeOpacity={0.78}
                        />
                      );
                    })}
                  </View>
                ))}
              </View>
            </View>
          </View>
        </ScrollView>

        <View style={styles.legendRow}>
          <Text style={styles.legendText}>Less</Text>
          {[0, 25, 55, 85, 100].map((progress) => (
            <View
              key={progress}
              style={[
                styles.legendCell,
                { backgroundColor: getCellColor(progress, colors) },
              ]}
            />
          ))}
          <Text style={styles.legendText}>More</Text>
        </View>
      </View>

      <Modal
        visible={!!selectedSnapshot}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedSnapshot(null)}
      >
        <View style={styles.sheetOverlay}>
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.sheetEyebrow}>Daily Summary</Text>
                <Text style={styles.sheetTitle}>
                  {selectedSnapshot ? getShortDate(selectedSnapshot.dateKey) : ""}
                </Text>
              </View>
              <TouchableOpacity style={styles.closeButton} onPress={() => setSelectedSnapshot(null)}>
                <Ionicons name="close" size={Math.min(hp(2.7), wp(6))} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <View style={styles.sheetProgressRow}>
              <View
                style={[
                  styles.sheetProgressIcon,
                  { backgroundColor: getCellColor(selectedSnapshot?.progress || 0, colors) },
                ]}
              />
              <View style={styles.sheetProgressCopy}>
                <Text style={styles.sheetProgressValue}>{selectedGoalStatus}</Text>
                <Text style={styles.sheetProgressHint}>
                  {selectedSnapshot?.progress
                    ? includeExercise
                      ? `This cell connects ${goalExperience.label} progress with workout and walking signals shown separately.`
                      : `This cell reflects calorie and hydration consistency for ${goalExperience.label}.`
                    : "No logged activity was found for this day."}
                </Text>
                {selectedInterpretation ? (
                  <Text style={[styles.sheetProgressNext, { color: goalExperience.color }]} numberOfLines={2}>
                    Next: {selectedInterpretation.nextBestStep}
                  </Text>
                ) : null}
              </View>
            </View>

            <View style={styles.sheetMetricGrid}>
              {[
                {
                  label: "Calories",
                  value: `${selectedSnapshot?.achievedCalories || 0}`,
                  target: `/ ${selectedSnapshot?.targetCalories || 0}`,
                  icon: "flame-outline" as const,
                  color: "#F97316",
                },
                {
                  label: "Hydration",
                  value: `${(selectedSnapshot?.achievedHydration || 0).toFixed(1)}L`,
                  target: `/ ${selectedSnapshot?.targetHydration || 0}L`,
                  icon: "water-outline" as const,
                  color: "#2E86AB",
                },
                {
                  label: "Workout",
                  value: `${selectedSnapshot?.exerciseCalories || 0}`,
                  target: selectedSnapshot?.exerciseTarget ? `/ ${selectedSnapshot.exerciseTarget}` : "burned",
                  icon: "barbell-outline" as const,
                  color: "#10B981",
                },
                {
                  label: "Walking",
                  value: `${selectedSnapshot?.walkingCalories || 0}`,
                  target: selectedSnapshot?.walkingTarget ? `/ ${selectedSnapshot.walkingTarget}` : "burned",
                  icon: "footsteps-outline" as const,
                  color: "#22C55E",
                },
              ].filter((metric) => includeExercise || (metric.label !== "Workout" && metric.label !== "Walking")).map((metric) => (
                <View key={metric.label} style={styles.sheetMetric}>
                  <Ionicons name={metric.icon} size={Math.min(hp(2.3), wp(5.1))} color={metric.color} />
                  <Text style={styles.sheetMetricValue}>{metric.value}</Text>
                  <Text style={styles.sheetMetricTarget}>{metric.target}</Text>
                  <Text style={styles.sheetMetricLabel}>{metric.label}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const getStyles = (colors: any, embedded: boolean) => StyleSheet.create({
  section: {
    paddingHorizontal: embedded ? 0 : wp(4),
    marginTop: embedded ? 0 : hp(0.5),
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
  headerCopy: {
    flex: 1,
    minWidth: 0,
  },
  eyebrow: {
    color: colors.textSecondary,
    fontSize: Math.min(hp(1.18), wp(2.8)),
    fontWeight: "900",
    textTransform: "uppercase",
  },
  title: {
    color: colors.textPrimary,
    fontSize: Math.min(hp(2.15), wp(4.9)),
    fontWeight: "900",
    marginTop: hp(0.2),
  },
  goalStatusText: {
    fontSize: Math.min(hp(1.12), wp(2.65)),
    lineHeight: hp(1.55),
    fontWeight: "900",
    marginTop: hp(0.25),
  },
  goalInterpretationText: {
    color: colors.textSecondary,
    fontSize: Math.min(hp(1.02), wp(2.42)),
    lineHeight: hp(1.45),
    fontWeight: "700",
    marginTop: hp(0.25),
  },
  rangeSwitch: {
    flexDirection: "row",
    borderRadius: hp(1.5),
    backgroundColor: colors.surface || colors.screenColor,
    borderWidth: 1,
    borderColor: colors.cardBorder || colors.border,
    padding: 3,
  },
  rangeButton: {
    minHeight: hp(3.4),
    borderRadius: hp(1.25),
    paddingHorizontal: wp(2.4),
    alignItems: "center",
    justifyContent: "center",
  },
  rangeText: {
    color: colors.textSecondary,
    fontSize: Math.min(hp(1.15), wp(2.7)),
    fontWeight: "900",
  },
  statsRow: {
    flexDirection: "row",
    gap: wp(2.3),
    marginTop: hp(1.5),
  },
  statItem: {
    flex: 1,
    minHeight: hp(7.4),
    borderRadius: hp(1.35),
    backgroundColor: colors.surface || colors.screenColor,
    borderWidth: 1,
    borderColor: colors.cardBorder || colors.border,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: wp(1),
  },
  statValue: {
    color: colors.textPrimary,
    fontSize: Math.min(hp(1.65), wp(3.75)),
    fontWeight: "900",
    marginTop: hp(0.25),
  },
  statLabel: {
    color: colors.textSecondary,
    fontSize: Math.min(hp(1.02), wp(2.42)),
    fontWeight: "800",
    marginTop: hp(0.1),
  },
  heatmapScrollContent: {
    paddingTop: hp(1.8),
    paddingRight: wp(2),
  },
  monthRow: {
    flexDirection: "row",
    marginLeft: wp(5),
    marginBottom: hp(0.55),
  },
  monthLabel: {
    color: colors.textSecondary,
    fontSize: Math.min(hp(1), wp(2.35)),
    fontWeight: "800",
  },
  gridWrap: {
    flexDirection: "row",
  },
  dayLabels: {
    width: wp(4),
    marginRight: wp(1),
    gap: wp(0.75),
  },
  dayLabel: {
    height: Math.min(hp(2.05), wp(4.55)),
    color: colors.textTertiary || colors.textSecondary,
    fontSize: Math.min(hp(0.85), wp(2.1)),
    fontWeight: "900",
    textAlign: "center",
    lineHeight: Math.min(hp(2.05), wp(4.55)),
  },
  weeksRow: {
    flexDirection: "row",
    gap: wp(0.75),
  },
  weekColumn: {
    gap: wp(0.75),
  },
  heatCell: {
    width: Math.min(hp(2.05), wp(4.55)),
    height: Math.min(hp(2.05), wp(4.55)),
    borderRadius: Math.min(hp(0.45), wp(1)),
  },
  legendRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: wp(1.2),
    marginTop: hp(1.2),
  },
  legendText: {
    color: colors.textSecondary,
    fontSize: Math.min(hp(1), wp(2.35)),
    fontWeight: "800",
  },
  legendCell: {
    width: Math.min(hp(1.45), wp(3.2)),
    height: Math.min(hp(1.45), wp(3.2)),
    borderRadius: Math.min(hp(0.32), wp(0.7)),
  },
  sheetOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.52)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: colors.screenColor,
    borderTopLeftRadius: hp(2.4),
    borderTopRightRadius: hp(2.4),
    paddingHorizontal: wp(4),
    paddingTop: hp(2),
    paddingBottom: hp(3.2),
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: wp(3),
    marginBottom: hp(1.4),
  },
  sheetEyebrow: {
    color: colors.textSecondary,
    fontSize: Math.min(hp(1.18), wp(2.8)),
    fontWeight: "900",
    textTransform: "uppercase",
  },
  sheetTitle: {
    color: colors.textPrimary,
    fontSize: Math.min(hp(2.35), wp(5.25)),
    fontWeight: "900",
    marginTop: hp(0.2),
  },
  closeButton: {
    width: hp(4.6),
    height: hp(4.6),
    borderRadius: hp(2.3),
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.cardBorder || colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  sheetProgressRow: {
    borderRadius: hp(1.6),
    borderWidth: 1,
    borderColor: colors.cardBorder || colors.border,
    backgroundColor: colors.cardBackground,
    padding: wp(3),
    flexDirection: "row",
    alignItems: "center",
    gap: wp(3),
  },
  sheetProgressIcon: {
    width: Math.min(hp(5.2), wp(11.4)),
    height: Math.min(hp(5.2), wp(11.4)),
    borderRadius: hp(1.2),
  },
  sheetProgressCopy: {
    flex: 1,
    minWidth: 0,
  },
  sheetProgressValue: {
    color: colors.textPrimary,
    fontSize: Math.min(hp(1.85), wp(4.2)),
    fontWeight: "900",
  },
  sheetProgressHint: {
    color: colors.textSecondary,
    fontSize: Math.min(hp(1.25), wp(2.9)),
    fontWeight: "700",
    lineHeight: hp(1.8),
    marginTop: hp(0.3),
  },
  sheetProgressNext: {
    fontSize: Math.min(hp(1.12), wp(2.65)),
    fontWeight: "800",
    lineHeight: hp(1.55),
    marginTop: hp(0.45),
  },
  sheetMetricGrid: {
    flexDirection: "row",
    gap: wp(2.2),
    marginTop: hp(1.4),
  },
  sheetMetric: {
    flex: 1,
    minHeight: hp(9.2),
    borderRadius: hp(1.4),
    borderWidth: 1,
    borderColor: colors.cardBorder || colors.border,
    backgroundColor: colors.cardBackground,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: wp(1),
  },
  sheetMetricValue: {
    color: colors.textPrimary,
    fontSize: Math.min(hp(1.65), wp(3.75)),
    fontWeight: "900",
    marginTop: hp(0.3),
  },
  sheetMetricTarget: {
    color: colors.textSecondary,
    fontSize: Math.min(hp(1.02), wp(2.4)),
    fontWeight: "800",
    marginTop: hp(0.1),
  },
  sheetMetricLabel: {
    color: colors.textSecondary,
    fontSize: Math.min(hp(1.1), wp(2.55)),
    fontWeight: "900",
    marginTop: hp(0.35),
  },
});

export default ActivityHeatmap;
