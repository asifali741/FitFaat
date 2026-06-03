import { Share } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  buildAdaptiveGoalMetrics,
  calculateMifflinStJeorBaseGoals,
  HEALTH_METRICS_STORAGE_KEY,
  loadWeightTrendLogs,
  type WeightTrendLogEntry,
} from "@/utils/adaptiveGoals";
import {
  getDashboardCalorieSummary,
  getDashboardGoalProgress,
  getProgressValue,
} from "@/utils/dashboardProgress";
import { dailyLogsApi } from "@/utils/dailyLogsApi";
import { applyPendingDashboardMutations } from "@/utils/dashboardPendingMutations";
import {
  getDashboardUserIdentity,
  getStoredDashboardCache,
  getStoredWeeklyTrackingId,
  setStoredDashboardCache,
} from "@/utils/dashboardStorage";
import { mergeDailyProgressMap } from "@/utils/dailyProgressSync";
import { mergeExerciseProgressIntoJsonResponse } from "@/utils/localExerciseProgress";
import { mergeWalkingProgressIntoJsonResponse } from "@/utils/localWalkingProgress";
import { tokenStorage } from "@/utils/auth/tokenStorage";
import { buildWeeklyInsights, type WeeklyInsight } from "@/utils/weeklyInsights";

export type DoctorReportRange = "weekly" | "monthly";

export type DoctorReportDay = {
  dateKey: string;
  label: string;
  dayNo?: number;
  calories: number;
  targetCalories: number;
  hydration: number;
  targetHydration: number;
  steps: number;
  goalProgress: number;
  missed: boolean;
};

export type DoctorReportMetricKey = "calories" | "water" | "goal" | "steps" | "weight";

export type DoctorReportMetricTrust = {
  sourceLabel: string;
  explanation: string;
  latestDataDate: string | null;
};

export type DoctorReportDataTrust = {
  lastUpdatedAt: string;
  latestDataDate: string | null;
  metrics: Record<DoctorReportMetricKey, DoctorReportMetricTrust>;
};

export type DoctorAppointmentSummary = {
  wins: string[];
  risks: string[];
  missedDays: string;
  weightTrend: string;
  suggestedQuestions: string[];
};

export type DoctorProgressReportSummary = {
  trackedDays: number;
  missedDays: number;
  averageCalories: number;
  averageHydration: number;
  averageGoalProgress: number;
  totalSteps: number;
  currentWeightKg: number | null;
  startingWeightKg: number | null;
  latestWeightKg: number | null;
  weightChangeKg: number | null;
  currentWeightSource: "measured" | "estimated" | null;
  estimatedWeightDeltaKg: number;
  bestDayLabel: string;
  goalTrendLabel: string;
};

export type DoctorProgressReport = {
  schemaVersion: 1;
  range: DoctorReportRange;
  generatedAt: string;
  title: string;
  days: DoctorReportDay[];
  weightLogs: WeightTrendLogEntry[];
  insights: WeeklyInsight[];
  dataTrust: DoctorReportDataTrust;
  doctorSummary: DoctorAppointmentSummary;
  summary: DoctorProgressReportSummary;
};

type DoctorProgressReportOptions = {
  isPremium?: boolean;
  preferFresh?: boolean;
};

type DashboardDay = {
  _id?: string;
  id?: string;
  dayNo?: number;
  dayNumber?: number;
  date?: string;
  dateKey?: string;
  updatedAt?: string;
  savedAt?: string;
  createdAt?: string;
  status?: string;
  achievedCalories?: number;
  calorieIntake?: number;
  caloriesIntake?: number;
  targetCalories?: number;
  baseTargetCalories?: number;
  idealTargetCalories?: number;
  calibratedTargetCalories?: number;
  achieviedHydration?: number;
  achievedHydration?: number;
  hydrationIntake?: number;
  targetHydration?: number;
  walkingSteps?: number;
  steps?: number;
  stepCount?: number;
  meals?: any[];
  waterIntake?: any[];
  weightTrendExpectedKgPerWeek?: number;
  [key: string]: any;
};

const CALORIES_PER_KG_WEIGHT_CHANGE = 7700;
const MAX_ESTIMATED_WEIGHT_SHIFT_KG_PER_DAY = 0.35;

const getDateKey = (value?: string | Date | null) => {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getStartDateKey = (range: DoctorReportRange) => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - (range === "monthly" ? 29 : 6));
  return getDateKey(date);
};

const formatShortDate = (dateKey: string) => {
  const date = new Date(`${dateKey}T12:00:00`);
  if (Number.isNaN(date.getTime())) return dateKey;
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
};

const average = (values: number[]) => {
  const cleanValues = values.filter((value) => Number.isFinite(value));
  if (!cleanValues.length) return 0;
  return Math.round(cleanValues.reduce((sum, value) => sum + value, 0) / cleanValues.length);
};

const averageDecimal = (values: number[], decimals = 1) => {
  const cleanValues = values.filter((value) => Number.isFinite(value));
  if (!cleanValues.length) return 0;
  const factor = 10 ** decimals;
  return Math.round((cleanValues.reduce((sum, value) => sum + value, 0) / cleanValues.length) * factor) / factor;
};

const roundCalories = (value: unknown) => Math.max(0, Math.round(getProgressValue(value)));

const getLatestDateKey = (dateKeys: Array<string | null | undefined>) => {
  const sortedKeys = dateKeys
    .filter((dateKey): dateKey is string => Boolean(dateKey))
    .sort((left, right) => getDateKeyTime(left) - getDateKeyTime(right));

  return sortedKeys[sortedKeys.length - 1] || null;
};

const formatTrustDate = (dateKey: string | null) => {
  if (!dateKey) return "No dated data";
  const date = new Date(`${dateKey}T12:00:00`);
  if (Number.isNaN(date.getTime())) return dateKey;
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
};

const formatWeightTrend = (summary: DoctorProgressReportSummary) => {
  if (summary.currentWeightKg === null) return "No current weight is available yet.";
  const currentLabel = summary.currentWeightSource === "estimated" ? "Estimated current weight" : "Current weight";
  if (summary.startingWeightKg === null) {
    return `${currentLabel} is ${summary.currentWeightKg} kg; starting weight is not available yet.`;
  }
  if (summary.weightChangeKg === null) {
    return `${currentLabel} is ${summary.currentWeightKg} kg and starting weight is ${summary.startingWeightKg} kg.`;
  }
  if (summary.weightChangeKg === 0) {
    return `${currentLabel} matches starting weight at ${summary.currentWeightKg} kg.`;
  }
  const direction = summary.weightChangeKg > 0 ? "up" : "down";
  return `Weight moved ${direction} ${Math.abs(summary.weightChangeKg)} kg from starting weight (${summary.startingWeightKg} kg to ${summary.currentWeightKg} kg).`;
};

const buildDataTrust = ({
  generatedAt,
  reportDays,
  filteredWeightLogs,
  weightLatestDateKey,
  weightSourceLabel,
  weightExplanation,
}: {
  generatedAt: string;
  reportDays: DoctorReportDay[];
  filteredWeightLogs: WeightTrendLogEntry[];
  weightLatestDateKey?: string | null;
  weightSourceLabel?: string;
  weightExplanation?: string;
}): DoctorReportDataTrust => {
  const calorieLatest = getLatestDateKey(reportDays.filter((day) => day.calories > 0).map((day) => day.dateKey));
  const waterLatest = getLatestDateKey(reportDays.filter((day) => day.hydration > 0).map((day) => day.dateKey));
  const goalLatest = getLatestDateKey(
    reportDays.filter((day) => hasSignal(day) || day.missed).map((day) => day.dateKey)
  );
  const stepsLatest = getLatestDateKey(reportDays.filter((day) => day.steps > 0).map((day) => day.dateKey));
  const weightLatest = weightLatestDateKey || getLatestDateKey(filteredWeightLogs.map(getWeightLogDateKey));
  const latestDataDate = getLatestDateKey([calorieLatest, waterLatest, goalLatest, stepsLatest, weightLatest]);

  return {
    lastUpdatedAt: generatedAt,
    latestDataDate,
    metrics: {
      calories: {
        sourceLabel: "Manual meal logs",
        latestDataDate: calorieLatest,
        explanation:
          "Calories are the average of days in this range that have meal or calorie logs. Days with no calorie log are not averaged as zero.",
      },
      water: {
        sourceLabel: "Manual water logs",
        latestDataDate: waterLatest,
        explanation:
          "Water is the average hydration from days in this range that have water logs. Empty hydration days are excluded from this average.",
      },
      goal: {
        sourceLabel: "FitFaat score",
        latestDataDate: goalLatest,
        explanation:
          "Goal is the average FitFaat progress score across days with calories, water, steps, or a missed-day signal.",
      },
      steps: {
        sourceLabel: "Pedometer / local steps",
        latestDataDate: stepsLatest,
        explanation:
          "Steps are the total step count FitFaat has for this range from the pedometer or local step history.",
      },
      weight: {
        sourceLabel: weightSourceLabel || "Health metrics + weight logs",
        latestDataDate: weightLatest,
        explanation: weightExplanation ||
          "Current weight uses the latest stored FitFaat weight from health metrics or weight logs. Starting weight uses onboarding start-weight data when available, then the earliest valid weight history.",
      },
    },
  };
};

const buildDoctorAppointmentSummary = (
  summary: DoctorProgressReportSummary,
  reportDays: DoctorReportDay[]
): DoctorAppointmentSummary => {
  const wins: string[] = [];
  const risks: string[] = [];
  const calorieDays = reportDays.filter((day) => day.calories > 0).length;
  const waterDays = reportDays.filter((day) => day.hydration > 0).length;

  if (summary.trackedDays > 0) {
    wins.push(`${summary.trackedDays}/${reportDays.length} days had calories, water, or step data.`);
  }
  if (summary.averageGoalProgress >= 75) {
    wins.push(`Average goal progress was strong at ${summary.averageGoalProgress}%.`);
  } else if (summary.averageGoalProgress >= 45) {
    wins.push(`Average goal progress was readable at ${summary.averageGoalProgress}%.`);
  }
  if (summary.bestDayLabel !== "Not enough data") {
    wins.push(`${summary.bestDayLabel} was the strongest tracked day.`);
  }

  if (summary.missedDays > 0) {
    risks.push(`${summary.missedDays} day${summary.missedDays === 1 ? "" : "s"} had no useful tracking signal.`);
  }
  if (calorieDays < Math.max(2, Math.ceil(reportDays.length / 2))) {
    risks.push(`Calories were logged on ${calorieDays}/${reportDays.length} days, so the average may be incomplete.`);
  }
  if (waterDays < Math.max(2, Math.ceil(reportDays.length / 2))) {
    risks.push(`Water was logged on ${waterDays}/${reportDays.length} days, so hydration may be under-described.`);
  }
  if (summary.currentWeightKg === null) {
    risks.push("No current weight was available for this report.");
  } else if (summary.startingWeightKg === null) {
    risks.push("Starting weight was not available, so total weight change could not be compared.");
  } else if (summary.weightChangeKg !== null && Math.abs(summary.weightChangeKg) >= 1.5) {
    risks.push(`Weight changed by ${Math.abs(summary.weightChangeKg)} kg from starting weight; ask whether that pace fits the plan.`);
  }

  return {
    wins: wins.length ? wins.slice(0, 3) : ["Not enough tracked data yet to identify a clear win."],
    risks: risks.length ? risks.slice(0, 3) : ["No major tracking gaps stood out in this range."],
    missedDays:
      summary.missedDays > 0
        ? `${summary.missedDays} missed day${summary.missedDays === 1 ? "" : "s"}`
        : "No missed tracked days",
    weightTrend: formatWeightTrend(summary),
    suggestedQuestions: [
      `Is my ${summary.averageGoalProgress}% average goal progress appropriate for my current goal?`,
      "Should my calorie or hydration targets change based on these logs?",
      summary.currentWeightKg === null
        ? "How often should I log weight before the next appointment?"
        : "Does this weight trend need any adjustment to my plan?",
    ],
  };
};

const sumMealCalories = (meals: unknown) =>
  Array.isArray(meals)
    ? meals.reduce(
        (sum, meal: any) =>
          sum + Math.round(getProgressValue(meal?.calories ?? meal?.kcal ?? meal?.totalCalories)),
        0
      )
    : 0;

const sumWaterIntake = (waterIntake: unknown) =>
  Array.isArray(waterIntake)
    ? waterIntake.reduce(
        (sum, entry: any) =>
          sum + getProgressValue(entry?.amount ?? entry?.liters ?? entry?.litres ?? entry?.hydrationAmount),
        0
      )
    : 0;

const getReportCalories = (day: DashboardDay) => {
  const directCalories = [
    day.achievedCalories,
    day.calorieIntake,
    day.caloriesIntake,
  ]
    .map(getProgressValue)
    .find((value) => value > 0);

  return Math.round(directCalories ?? sumMealCalories(day.meals));
};

const getReportHydration = (day: DashboardDay) => {
  const directHydration = [
    day.achieviedHydration,
    day.achievedHydration,
    day.hydrationIntake,
  ]
    .map(getProgressValue)
    .find((value) => value > 0);

  return averageDecimal([directHydration ?? sumWaterIntake(day.waterIntake)], 2);
};

const getDateKeyTime = (dateKey?: string) => {
  if (!dateKey) return 0;
  const parsed = new Date(`${dateKey}T12:00:00`);
  const time = parsed.getTime();
  return Number.isFinite(time) ? time : 0;
};

const getTodayDateKey = () => getDateKey(new Date());

const isUnlockedDay = (day: DashboardDay) =>
  day && String(day.status || "").toLowerCase() !== "locked";

const hasSignal = (day: DoctorReportDay) =>
  day.calories > 0 || day.hydration > 0 || day.steps > 0;

const isMissedDay = (sourceDay: DashboardDay, reportDay: DoctorReportDay) => {
  if (hasSignal(reportDay)) return false;

  const status = String(sourceDay.status || "").toLowerCase();
  if (status === "finished" || status === "completed") return true;
  if (status === "active") {
    return Boolean(reportDay.dateKey && reportDay.dateKey < getTodayDateKey());
  }

  return Boolean(reportDay.dateKey && reportDay.dateKey < getTodayDateKey());
};

const sortDashboardDays = (days: DashboardDay[]) =>
  [...days].sort((left, right) => {
    const leftTime = new Date(left.date || "").getTime();
    const rightTime = new Date(right.date || "").getTime();
    if (Number.isFinite(leftTime) && Number.isFinite(rightTime)) return leftTime - rightTime;
    return Number(left.dayNo || 0) - Number(right.dayNo || 0);
  });

const convertWeeklyProgressToDashboardData = (weeklyProgress: any): Record<string, DashboardDay> => {
  const dailyLogs = Array.isArray(weeklyProgress?.dailyLogs)
    ? weeklyProgress.dailyLogs
    : Array.isArray(weeklyProgress)
      ? weeklyProgress
      : [];

  return dailyLogs.reduce((data: Record<string, DashboardDay>, dailyLog: any, index: number) => {
    const dayNo = Number(dailyLog?.dayNumber ?? dailyLog?.dayNo ?? index + 1);
    const dayKey = Number.isFinite(dayNo) && dayNo > 0
      ? `day0${Math.round(dayNo)}`
      : dailyLog?._id
        ? `log:${dailyLog._id}`
        : `day:${index + 1}`;
    const achievedHydration = dailyLog?.achievedHydration ?? dailyLog?.achieviedHydration;
    const achievedCalories =
      dailyLog?.achievedCalories ??
      dailyLog?.calorieIntake ??
      dailyLog?.caloriesIntake ??
      0;

    data[dayKey] = {
      ...dailyLog,
      _id: dailyLog?._id,
      dayNo,
      date: dailyLog?.date,
      dateKey: dailyLog?.dateKey || getDateKey(dailyLog?.date),
      updatedAt: dailyLog?.updatedAt || dailyLog?.savedAt || dailyLog?.createdAt,
      savedAt: dailyLog?.savedAt,
      createdAt: dailyLog?.createdAt,
      achievedCalories,
      calorieIntake: dailyLog?.calorieIntake ?? achievedCalories,
      caloriesIntake: dailyLog?.caloriesIntake ?? dailyLog?.calorieIntake ?? achievedCalories,
      achieviedHydration: achievedHydration ?? 0,
      achievedHydration: achievedHydration ?? 0,
      hydrationIntake: dailyLog?.hydrationIntake ?? achievedHydration ?? 0,
      meals: Array.isArray(dailyLog?.meals) ? dailyLog.meals : [],
      waterIntake: Array.isArray(dailyLog?.waterIntake) ? dailyLog.waterIntake : [],
      targetCalories: dailyLog?.targetCalories,
      targetHydration: dailyLog?.targetHydration,
      exerciseCaloriesBurned: dailyLog?.exerciseCaloriesBurned || 0,
      exerciseDurationSeconds: dailyLog?.exerciseDurationSeconds || 0,
      walkingSteps: dailyLog?.walkingSteps || dailyLog?.steps || dailyLog?.stepCount || 0,
      steps: dailyLog?.steps,
      stepCount: dailyLog?.stepCount,
      status: dailyLog?.status,
    };

    return data;
  }, {});
};

const getDashboardDays = async (options: { preferFresh?: boolean } = {}) => {
  const user = await tokenStorage.getUser();
  const weeklyTrackingId = await getStoredWeeklyTrackingId(user);
  const cache = await getStoredDashboardCache(user, weeklyTrackingId);
  const dashboardUserId = getDashboardUserIdentity(user) || user?.id || user?._id || null;
  let dashboardData = cache?.data ? (cache.data as Record<string, DashboardDay>) : {};

  if (options.preferFresh !== false && weeklyTrackingId) {
    try {
      const freshWeeklyProgress = await dailyLogsApi.getWeeklyProgressFresh(weeklyTrackingId);
      const freshDashboardData = convertWeeklyProgressToDashboardData(freshWeeklyProgress);

      if (Object.keys(freshDashboardData).length) {
        dashboardData = mergeDailyProgressMap(dashboardData, freshDashboardData, {
          preferIncomingWhenUnclear: true,
        }) as Record<string, DashboardDay>;
      }
    } catch (error) {
      console.log("[DoctorProgressReport] Fresh weekly progress unavailable, using cached report data:", error);
    }
  }

  dashboardData = await mergeExerciseProgressIntoJsonResponse(dashboardData);
  dashboardData = await mergeWalkingProgressIntoJsonResponse(dashboardData);
  dashboardData = await applyPendingDashboardMutations(dashboardData, {
    userId: dashboardUserId,
    weeklyTrackingId,
    source: options.preferFresh === false ? "local" : "server",
  });

  if (Object.keys(dashboardData).length) {
    await setStoredDashboardCache({ data: dashboardData, timestamp: new Date() }, user, weeklyTrackingId);
  }

  return Object.values(dashboardData);
};

const getWeightLogDateKey = (log: WeightTrendLogEntry) =>
  String(log.dateKey || getDateKey(log.loggedAt));

const parseJsonObject = (rawValue: string | null): Record<string, any> | null => {
  if (!rawValue) return null;
  try {
    const parsed = JSON.parse(rawValue);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed as Record<string, any>
      : null;
  } catch {
    return null;
  }
};

const getTime = (value?: unknown) => {
  if (!value) return 0;
  const parsed = new Date(String(value)).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeWeightKg = (value: unknown) => {
  const weight = Number(value);
  return Number.isFinite(weight) && weight >= 20 && weight <= 350
    ? Math.round(weight * 10) / 10
    : null;
};

const readWeightFromSource = (source: any, keys: string[]) => {
  for (const key of keys) {
    const weight = normalizeWeightKg(source?.[key]);
    if (weight !== null) return weight;
  }
  return null;
};

const getWeightMetricSources = (user: any, healthMetrics: Record<string, any> | null) => [
  healthMetrics,
  user?.healthMetrics,
  user?.bmiSummary,
  user?.userInfo,
  user?.data?.userInfo,
  user?.user?.userInfo,
  user?.data?.user,
  user?.user,
  user,
].filter(Boolean);

const getMetricSourceTime = (source: any) =>
  Math.max(
    getTime(source?.weightUpdatedAt),
    getTime(source?.currentWeightUpdatedAt),
    getTime(source?.metricsUpdatedAt),
    getTime(source?.updatedAt),
    getTime(source?.updated_at),
    getTime(source?.lastUpdatedAt),
    getTime(source?.syncedAt)
  );

const getMetricSourceDateKey = (source: any) => {
  const time = getMetricSourceTime(source);
  return time > 0 ? getDateKey(new Date(time)) : null;
};

const getLogTime = (log: WeightTrendLogEntry) =>
  Math.max(getTime(log.loggedAt), getDateKeyTime(getWeightLogDateKey(log)));

const getLogDateKey = (log: WeightTrendLogEntry | null | undefined) =>
  log ? getWeightLogDateKey(log) : null;

const firstPositiveNumber = (...values: unknown[]) => {
  for (const value of values) {
    const numberValue = getProgressValue(value);
    if (numberValue > 0) return numberValue;
  }
  return 0;
};

const getDashboardDayDateKey = (day: DashboardDay) => {
  const dateKey = typeof day.dateKey === "string" ? day.dateKey.match(/^(\d{4}-\d{2}-\d{2})/)?.[1] : null;
  if (dateKey) return dateKey;
  return day.date ? getDateKey(day.date) : "";
};

const clampEstimatedDailyWeightDelta = (value: number) => {
  if (!Number.isFinite(value)) return 0;
  return Math.max(
    -MAX_ESTIMATED_WEIGHT_SHIFT_KG_PER_DAY,
    Math.min(MAX_ESTIMATED_WEIGHT_SHIFT_KG_PER_DAY, value)
  );
};

const getProgressWeightEstimateBasis = (user: any, healthMetrics: Record<string, any> | null) => {
  try {
    const metrics = buildAdaptiveGoalMetrics(user, healthMetrics || undefined);
    return calculateMifflinStJeorBaseGoals(metrics, { plan: "premium" });
  } catch {
    return null;
  }
};

const getEstimatedDayWeightDeltaKg = (
  day: DashboardDay,
  fallbackGoalAdjustmentCalories: number
) => {
  const calorieSummary = getDashboardCalorieSummary(day, true);
  const foodCalories = roundCalories(
    calorieSummary.foodCalories || getReportCalories(day)
  );
  const activityCalories = roundCalories(calorieSummary.totalBurnedCalories);
  const hasFoodSignal = foodCalories > 0;
  const hasActivitySignal = activityCalories > 0;

  if (!hasFoodSignal && !hasActivitySignal) return null;

  const targetCalories = firstPositiveNumber(
    day.calibratedTargetCalories,
    day.targetCalories,
    day.baseTargetCalories,
    day.idealTargetCalories
  );

  let energyBalanceCalories: number | null = null;
  if (hasFoodSignal && targetCalories > 0) {
    const maintenanceCalories = Math.max(0, targetCalories - fallbackGoalAdjustmentCalories);
    energyBalanceCalories = foodCalories - activityCalories - (maintenanceCalories || targetCalories);
  } else if (hasActivitySignal) {
    energyBalanceCalories = -activityCalories;
  }

  if (energyBalanceCalories === null) return null;

  return clampEstimatedDailyWeightDelta(energyBalanceCalories / CALORIES_PER_KG_WEIGHT_CHANGE);
};

const getEstimatedProgressWeightDelta = (
  dashboardDays: DashboardDay[],
  baselineDateKey: string | null,
  user: any,
  healthMetrics: Record<string, any> | null
) => {
  const estimateBasis = getProgressWeightEstimateBasis(user, healthMetrics);
  const fallbackGoalAdjustmentCalories = Number(estimateBasis?.goalAdjustment || 0);
  let estimatedWeightDeltaKg = 0;
  let estimatedDayCount = 0;
  let latestProgressDateKey: string | null = null;

  sortDashboardDays(dashboardDays)
    .filter(isUnlockedDay)
    .forEach((day) => {
      const dateKey = getDashboardDayDateKey(day);
      if (!dateKey) return;
      if (baselineDateKey && getDateKeyTime(dateKey) <= getDateKeyTime(baselineDateKey)) return;

      const dailyDeltaKg = getEstimatedDayWeightDeltaKg(day, fallbackGoalAdjustmentCalories);
      if (dailyDeltaKg === null) return;

      estimatedWeightDeltaKg += dailyDeltaKg;
      estimatedDayCount += 1;
      latestProgressDateKey = getLatestDateKey([latestProgressDateKey, dateKey]);
    });

  return {
    estimatedWeightDeltaKg: Math.round(estimatedWeightDeltaKg * 10) / 10,
    estimatedDayCount,
    latestProgressDateKey,
  };
};

const resolveDoctorReportWeights = (
  user: any,
  healthMetrics: Record<string, any> | null,
  weightLogs: WeightTrendLogEntry[],
  dashboardDays: DashboardDay[]
) => {
  const sortedLogs = [...weightLogs].sort((left, right) => getLogTime(left) - getLogTime(right));
  const earliestLog = sortedLogs[0] || null;
  const latestLog = sortedLogs[sortedLogs.length - 1] || null;
  const metricSources = getWeightMetricSources(user, healthMetrics);
  const currentWeightKeys = ["currentWeight", "weightKg", "weight"];
  const startingWeightKeys = [
    "startingWeightKg",
    "startingWeight",
    "startWeightKg",
    "startWeight",
    "initialWeightKg",
    "initialWeight",
    "originalWeightKg",
    "originalWeight",
    "onboardingWeightKg",
    "onboardingWeight",
    "baselineWeightKg",
    "baselineWeight",
  ];
  const currentMetricCandidates = metricSources
    .map((source, index) => ({
      weightKg: readWeightFromSource(source, currentWeightKeys),
      time: getMetricSourceTime(source),
      dateKey: getMetricSourceDateKey(source),
      index,
    }))
    .filter((candidate): candidate is {
      weightKg: number;
      time: number;
      dateKey: string | null;
      index: number;
    } => candidate.weightKg !== null);
  const latestMetricCandidate = currentMetricCandidates
    .sort((left, right) => {
      if (right.time !== left.time) return right.time - left.time;
      return left.index - right.index;
    })[0] || null;
  const latestLogCandidate = latestLog
    ? {
        weightKg: normalizeWeightKg(latestLog.weightKg),
        time: getLogTime(latestLog),
        dateKey: getLogDateKey(latestLog),
      }
    : null;
  const currentWeightCandidate =
    latestLogCandidate?.weightKg !== null &&
    latestLogCandidate?.weightKg !== undefined &&
    latestLogCandidate.time > (latestMetricCandidate?.time || 0)
      ? latestLogCandidate
      : latestMetricCandidate || latestLogCandidate;
  const explicitStartingWeight = metricSources
    .map((source, index) => ({
      weightKg: readWeightFromSource(source, startingWeightKeys),
      time: getMetricSourceTime(source),
      dateKey: getMetricSourceDateKey(source),
      index,
    }))
    .filter((candidate): candidate is {
      weightKg: number;
      time: number;
      dateKey: string | null;
      index: number;
    } => candidate.weightKg !== null)
    .sort((left, right) => left.index - right.index)[0] || null;
  const fallbackProfileWeight = currentMetricCandidates
    .sort((left, right) => left.index - right.index)[0] || null;
  const startingWeightCandidate =
    explicitStartingWeight ||
    (earliestLog
      ? {
          weightKg: normalizeWeightKg(earliestLog.weightKg),
          time: getLogTime(earliestLog),
          dateKey: getLogDateKey(earliestLog),
        }
      : null) ||
    fallbackProfileWeight;
  const startingWeightKg = startingWeightCandidate?.weightKg ?? null;
  const baselineWeightKg = currentWeightCandidate?.weightKg ?? startingWeightKg;
  const baselineDateKey = currentWeightCandidate?.dateKey || startingWeightCandidate?.dateKey || null;
  const progressEstimate = baselineWeightKg !== null && baselineWeightKg !== undefined
    ? getEstimatedProgressWeightDelta(dashboardDays, baselineDateKey, user, healthMetrics)
    : {
        estimatedWeightDeltaKg: 0,
        estimatedDayCount: 0,
        latestProgressDateKey: null,
      };
  const estimatedCurrentWeightKg = baselineWeightKg !== null && baselineWeightKg !== undefined
    ? normalizeWeightKg(baselineWeightKg + progressEstimate.estimatedWeightDeltaKg) ?? baselineWeightKg
    : null;
  const currentWeightKg = estimatedCurrentWeightKg;
  const currentWeightSource: DoctorProgressReportSummary["currentWeightSource"] =
    currentWeightKg === null
      ? null
      : progressEstimate.estimatedDayCount > 0
        ? "estimated"
        : "measured";
  const weightChangeKg =
    currentWeightKg !== null && startingWeightKg !== null
      ? Math.round((currentWeightKg - startingWeightKg) * 10) / 10
      : null;
  const latestDataDateKey = getLatestDateKey([
    currentWeightCandidate?.dateKey,
    latestLog ? getWeightLogDateKey(latestLog) : null,
    progressEstimate.latestProgressDateKey,
  ]);

  return {
    currentWeightKg,
    startingWeightKg,
    latestWeightKg: currentWeightKg,
    weightChangeKg,
    currentWeightSource,
    estimatedWeightDeltaKg: progressEstimate.estimatedWeightDeltaKg,
    latestDataDateKey,
  };
};

const escapeHtml = (value: unknown) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

export const buildDoctorProgressReport = async (
  range: DoctorReportRange = "weekly",
  options: DoctorProgressReportOptions = {}
): Promise<DoctorProgressReport> => {
  const startDateKey = getStartDateKey(range);
  const [dashboardDays, user] = await Promise.all([
    getDashboardDays({ preferFresh: options.preferFresh ?? true }),
    tokenStorage.getUser(),
  ]);
  const [weightLogs, healthMetrics] = await Promise.all([
    loadWeightTrendLogs({ userId: user?.id || user?._id }),
    AsyncStorage.getItem(HEALTH_METRICS_STORAGE_KEY).then(parseJsonObject),
  ]);
  const reportDays = sortDashboardDays(dashboardDays)
    .filter(isUnlockedDay)
    .filter((day) => !day.date || getDateKey(day.date) >= startDateKey)
    .map((day): DoctorReportDay => {
      const dateKey = getDateKey(day.date);
      const calories = getReportCalories(day);
      const hydration = getReportHydration(day);
      const steps = Math.round(
        getProgressValue(day.walkingSteps ?? day.steps ?? day.stepCount)
      );
      const normalizedDayForScore = {
        ...day,
        achievedCalories: calories,
        calorieIntake: calories,
        caloriesIntake: calories,
        achieviedHydration: hydration,
        achievedHydration: hydration,
        hydrationIntake: hydration,
      };
      const reportDay = {
        dateKey,
        label: day.dayNo ? `Day ${day.dayNo}` : formatShortDate(dateKey),
        dayNo: day.dayNo,
        calories,
        targetCalories: Math.round(getProgressValue(day.targetCalories)),
        hydration,
        targetHydration: Number(day.targetHydration || 0),
        steps,
        goalProgress: Math.round(getDashboardGoalProgress(normalizedDayForScore)),
        missed: false,
      };

      return {
        ...reportDay,
        missed: isMissedDay(day, reportDay),
      };
    });
  const filteredWeightLogs = weightLogs
    .filter((log) => getWeightLogDateKey(log) >= startDateKey)
    .sort((left, right) => getDateKeyTime(getWeightLogDateKey(left)) - getDateKeyTime(getWeightLogDateKey(right)));
  const trackedDays = reportDays.filter(hasSignal);
  const calorieDays = reportDays.filter((day) => day.calories > 0);
  const hydrationDays = reportDays.filter((day) => day.hydration > 0);
  const missedDays = reportDays.filter((day) => day.missed);
  const scorableDays = reportDays.filter((day) => hasSignal(day) || day.missed);
  const resolvedWeights = resolveDoctorReportWeights(user, healthMetrics, weightLogs, dashboardDays);
  const bestDay = [...reportDays].sort((left, right) => right.goalProgress - left.goalProgress)[0];
  const averageGoalProgress = average(scorableDays.map((day) => day.goalProgress));
  const generatedAt = new Date().toISOString();
  const summary: DoctorProgressReportSummary = {
    trackedDays: trackedDays.length,
    missedDays: missedDays.length,
    averageCalories: average(calorieDays.map((day) => day.calories)),
    averageHydration: averageDecimal(hydrationDays.map((day) => day.hydration), 1),
    averageGoalProgress,
    totalSteps: reportDays.reduce((sum, day) => sum + day.steps, 0),
    currentWeightKg: resolvedWeights.currentWeightKg,
    startingWeightKg: resolvedWeights.startingWeightKg,
    latestWeightKg: resolvedWeights.latestWeightKg,
    weightChangeKg: resolvedWeights.weightChangeKg,
    currentWeightSource: resolvedWeights.currentWeightSource,
    estimatedWeightDeltaKg: resolvedWeights.estimatedWeightDeltaKg,
    bestDayLabel: bestDay?.label || "Not enough data",
    goalTrendLabel:
      averageGoalProgress >= 75
        ? "On track"
        : averageGoalProgress >= 45
          ? "Needs steadier logs"
          : "Needs attention",
  };

  return {
    schemaVersion: 1,
    range,
    generatedAt,
    title: `Doctor Progress Report - ${range === "monthly" ? "Monthly" : "Weekly"}`,
    days: reportDays,
    weightLogs: filteredWeightLogs,
    insights: buildWeeklyInsights(dashboardDays, { isPremium: options.isPremium ?? false }),
    dataTrust: buildDataTrust({
      generatedAt,
      reportDays,
      filteredWeightLogs,
      weightLatestDateKey: resolvedWeights.latestDataDateKey,
      weightSourceLabel: resolvedWeights.currentWeightSource === "estimated"
        ? "Measured weight + progress estimate"
        : "Health metrics + weight logs",
      weightExplanation: resolvedWeights.currentWeightSource === "estimated"
        ? "Current weight starts from the latest measured FitFaat weight or onboarding baseline, then estimates movement from logged calories, workout burn, and walking/activity burn. Hydration is used as tracking coverage context, not as body-mass math."
        : "Current weight uses the latest stored FitFaat weight from health metrics or weight logs. Starting weight uses onboarding start-weight data when available, then the earliest valid weight history.",
    }),
    doctorSummary: buildDoctorAppointmentSummary(summary, reportDays),
    summary,
  };
};

const formatWeightKg = (value: number | null) =>
  value === null ? "--" : `${value} kg`;

const formatWeightChange = (value: number | null) => {
  if (value === null) return "--";
  if (value > 0) return `+${value} kg`;
  return `${value} kg`;
};

export const buildDoctorReportText = (report: DoctorProgressReport) => {
  const summary = report.summary;
  const doctorSummary = report.doctorSummary;
  return [
    "FitFaat Doctor Progress Report",
    report.range === "monthly" ? "Range: Monthly" : "Range: Weekly",
    `Generated: ${new Date(report.generatedAt).toLocaleString()}`,
    `Last updated: ${new Date(report.dataTrust.lastUpdatedAt).toLocaleString()}`,
    `Latest data included: ${formatTrustDate(report.dataTrust.latestDataDate)}`,
    "",
    "Doctor Summary:",
    "Key wins:",
    ...doctorSummary.wins.map((item) => `- ${item}`),
    "Risks / gaps to discuss:",
    ...doctorSummary.risks.map((item) => `- ${item}`),
    `Missed days: ${doctorSummary.missedDays}`,
    `Weight trend: ${doctorSummary.weightTrend}`,
    "Suggested doctor questions:",
    ...doctorSummary.suggestedQuestions.map((item) => `- ${item}`),
    "",
    `Tracked days: ${summary.trackedDays}/${report.days.length}`,
    `Missed days: ${summary.missedDays}`,
    `Average calories: ${summary.averageCalories} kcal (${report.dataTrust.metrics.calories.explanation})`,
    `Average hydration: ${summary.averageHydration} L (${report.dataTrust.metrics.water.explanation})`,
    `Goal trend: ${summary.goalTrendLabel} (${summary.averageGoalProgress}%)`,
    `Steps: ${summary.totalSteps.toLocaleString()}`,
    `Current weight: ${formatWeightKg(summary.currentWeightKg)}`,
    `Starting weight: ${formatWeightKg(summary.startingWeightKg)}`,
    `Total change: ${formatWeightChange(summary.weightChangeKg)}`,
    "",
    "Data sources:",
    ...Object.entries(report.dataTrust.metrics).map(
      ([key, trust]) => `- ${key}: ${trust.sourceLabel}; latest ${formatTrustDate(trust.latestDataDate)}; ${trust.explanation}`
    ),
    "",
    "Insights:",
    ...report.insights.map((insight) => `- ${insight.title}: ${insight.body}`),
    "",
    "Daily chart:",
    ...report.days.map(
      (day) =>
        `- ${day.label}: ${day.calories}/${day.targetCalories} kcal, ${day.hydration}/${day.targetHydration} L, ${day.steps} steps, ${day.goalProgress}% goal`
    ),
    "",
    "Shared from FitFaat.",
  ].join("\n");
};

export const buildDoctorReportHtml = (report: DoctorProgressReport) => {
  const maxCalories = Math.max(1, ...report.days.map((day) => day.targetCalories || day.calories));
  const maxHydration = Math.max(1, ...report.days.map((day) => day.targetHydration || day.hydration));
  const maxSteps = Math.max(1, ...report.days.map((day) => day.steps));
  const stat = (label: string, value: string) =>
    `<div class="stat"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`;

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #111827; padding: 28px; }
    h1 { font-size: 24px; margin: 0 0 4px; }
    h2 { font-size: 16px; margin: 22px 0 10px; }
    .muted { color: #64748B; font-size: 12px; }
    .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-top: 18px; }
    .stat { border: 1px solid #E2E8F0; border-radius: 8px; padding: 10px; }
    .stat span { display: block; color: #64748B; font-size: 11px; margin-bottom: 5px; }
    .stat strong { font-size: 17px; }
    .summaryBox { border: 1px solid #BAE6FD; background: #F0F9FF; border-radius: 8px; padding: 12px; margin-top: 16px; }
    .summaryGrid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 8px; }
    .summaryBox ul { margin: 6px 0 0 18px; padding: 0; font-size: 12px; }
    .pill { display: inline-block; border-radius: 999px; background: #E0F2FE; color: #0369A1; font-size: 11px; font-weight: 700; padding: 4px 8px; margin-right: 6px; }
    .trustgrid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; margin-top: 8px; }
    .trust { border: 1px solid #E2E8F0; border-radius: 8px; padding: 8px; font-size: 11px; }
    .trust strong { display: block; font-size: 12px; margin-bottom: 3px; }
    .day { margin: 8px 0; display: grid; grid-template-columns: 62px 1fr 1fr 1fr 44px; gap: 8px; align-items: center; font-size: 11px; }
    .track { height: 8px; background: #E2E8F0; border-radius: 999px; overflow: hidden; }
    .fill { height: 100%; background: #10B981; }
    .water { background: #0EA5E9; }
    .steps { background: #14B8A6; }
    .insight { border-left: 3px solid #10B981; padding: 8px 10px; margin: 8px 0; background: #F8FAFC; }
  </style>
</head>
<body>
  <h1>FitFaat Doctor Progress Report</h1>
  <div class="muted">${escapeHtml(report.range === "monthly" ? "Monthly" : "Weekly")} - Generated ${escapeHtml(new Date(report.generatedAt).toLocaleString())} - Latest data ${escapeHtml(formatTrustDate(report.dataTrust.latestDataDate))}</div>
  <div class="summaryBox">
    <span class="pill">Doctor Summary</span>
    <span class="pill">${escapeHtml(report.doctorSummary.missedDays)}</span>
    <span class="pill">${escapeHtml(report.doctorSummary.weightTrend)}</span>
    <div class="summaryGrid">
      <div><strong>Key wins</strong><ul>${report.doctorSummary.wins.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></div>
      <div><strong>Risks / gaps</strong><ul>${report.doctorSummary.risks.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></div>
    </div>
    <strong style="display:block;margin-top:10px;">Suggested doctor questions</strong>
    <ul>${report.doctorSummary.suggestedQuestions.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
  </div>
  <div class="grid">
    ${stat("Tracked days", `${report.summary.trackedDays}/${report.days.length}`)}
    ${stat("Missed days", String(report.summary.missedDays))}
    ${stat("Goal trend", `${report.summary.averageGoalProgress}%`)}
    ${stat("Calories avg", `${report.summary.averageCalories} kcal`)}
    ${stat("Hydration avg", `${report.summary.averageHydration} L`)}
    ${stat("Steps", report.summary.totalSteps.toLocaleString())}
    ${stat("Current weight", formatWeightKg(report.summary.currentWeightKg))}
    ${stat("Starting weight", formatWeightKg(report.summary.startingWeightKg))}
    ${stat("Total change", formatWeightChange(report.summary.weightChangeKg))}
  </div>
  <h2>Data Trust</h2>
  <div class="muted">Last updated ${escapeHtml(new Date(report.dataTrust.lastUpdatedAt).toLocaleString())}. Calories and hydration are averages of logged days only.</div>
  <div class="trustgrid">
    ${Object.entries(report.dataTrust.metrics).map(([key, trust]) => `<div class="trust"><strong>${escapeHtml(key)}</strong>${escapeHtml(trust.sourceLabel)}<br />Latest: ${escapeHtml(formatTrustDate(trust.latestDataDate))}<br />${escapeHtml(trust.explanation)}</div>`).join("")}
  </div>
  <h2>Daily Charts</h2>
  ${report.days
    .map(
      (day) => `<div class="day">
        <strong>${escapeHtml(day.label)}</strong>
        <div class="track"><div class="fill" style="width:${Math.min(100, (day.calories / maxCalories) * 100)}%"></div></div>
        <div class="track"><div class="fill water" style="width:${Math.min(100, (day.hydration / maxHydration) * 100)}%"></div></div>
        <div class="track"><div class="fill steps" style="width:${Math.min(100, (day.steps / maxSteps) * 100)}%"></div></div>
        <span>${day.goalProgress}%</span>
      </div>`
    )
    .join("")}
  <h2>Insights</h2>
  ${report.insights.map((insight) => `<div class="insight"><strong>${escapeHtml(insight.title)}</strong><br />${escapeHtml(insight.body)}</div>`).join("")}
</body>
</html>`;
};

export const shareDoctorProgressReport = async (report: DoctorProgressReport) => {
  const message = buildDoctorReportText(report);

  try {
    const [Print, Sharing] = await Promise.all([
      import("expo-print"),
      import("expo-sharing"),
    ]);
    const pdf = await Print.printToFileAsync({
      html: buildDoctorReportHtml(report),
      base64: false,
    });
    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(pdf.uri, {
        mimeType: "application/pdf",
        dialogTitle: "Share FitFaat Doctor Report",
        UTI: "com.adobe.pdf",
      });
      return;
    }
  } catch (error) {
    console.log("[DoctorProgressReport] PDF share unavailable, using text share:", error);
  }

  await Share.share({ message });
};
