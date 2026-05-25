import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  buildAdaptiveGoalMetrics,
  HEALTH_METRICS_STORAGE_KEY,
  type AdaptiveGoalMetrics,
} from "@/utils/adaptiveGoals";
import { tokenStorage } from "@/utils/auth/tokenStorage";
import {
  getDashboardUserIdentity,
  getStoredWeeklyTrackingId,
} from "@/utils/dashboardStorage";

export const WALKING_PROGRESS_STORAGE_KEY = "fitfaat_step_counter_history";
export const WALKING_STEP_GOAL_STORAGE_KEY = "fitfaat_step_counter_goal";
export const WALKING_PEDOMETER_PERMISSION_STORAGE_KEY = "fitfaat_step_counter_permission";
export const DEFAULT_STEP_GOAL = 10000;
export const MIN_STEP_GOAL = 1000;
export const MAX_STEP_GOAL = 50000;
export const STEP_GOAL_INCREMENT = 500;
export const STEP_CALORIE_FACTOR = 0.04;
const MAX_TRACKABLE_STEPS_PER_DAY = 150000;
const WALKING_KCAL_PER_KG_KM = 0.57;

type DayLike = {
  date?: string;
  walkingSteps?: number;
  steps?: number;
  stepCount?: number;
  walkingCaloriesBurned?: number;
  stepCaloriesBurned?: number;
  walkingCalories?: number;
  caloriesBurnedFromWalking?: number;
  targetWalkingCaloriesBurned?: number;
  targetWalkingCalories?: number;
  walkingCaloriesTarget?: number;
  stepCaloriesTarget?: number;
  targetStepCalories?: number;
  walkingStepGoal?: number;
  stepGoal?: number;
  targetSteps?: number;
  dailyStepGoal?: number;
  walkingHasStepSignal?: boolean;
  walkingHasExplicitStepGoal?: boolean;
  walkingHasPedometerPermission?: boolean;
  walkingPedometerPermissionStatus?: string | null;
  walkingCalorieMetrics?: AdaptiveGoalMetrics | null;
};

export type WalkingProgressEntry = {
  dateKey: string;
  steps: number;
  calories: number;
  goal: number;
  updatedAt: string;
  userId?: string | null;
  weeklyTrackingId?: string | null;
};

export type WalkingProgressScope = {
  userId?: string | null;
  weeklyTrackingId?: string | null;
};

const toNumber = (value: unknown) => {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
};

export const cleanWalkingSteps = (value: unknown) => {
  const numericValue = toNumber(value);
  if (numericValue <= 0) return 0;
  return Math.min(MAX_TRACKABLE_STEPS_PER_DAY, Math.round(numericValue));
};

export const clampStepGoal = (value: number) => {
  if (!Number.isFinite(value) || value <= 0) return DEFAULT_STEP_GOAL;
  return Math.min(MAX_STEP_GOAL, Math.max(MIN_STEP_GOAL, Math.round(value / 100) * 100));
};

const hasValue = (value: unknown) => value !== undefined && value !== null && value !== "";

const getDayStepGoalValue = (day?: DayLike | null) =>
  cleanWalkingSteps(day?.walkingStepGoal ?? day?.stepGoal ?? day?.targetSteps ?? day?.dailyStepGoal);

const getExplicitWalkingCaloriesTarget = (day?: DayLike | null) =>
  roundCalories(
    day?.targetWalkingCaloriesBurned ??
      day?.targetWalkingCalories ??
      day?.walkingCaloriesTarget ??
      day?.stepCaloriesTarget ??
      day?.targetStepCalories
  );

export const hasExplicitWalkingStepGoal = (day?: DayLike | null) => {
  if (!day) return false;
  if (day.walkingHasExplicitStepGoal) return true;
  if (day.walkingHasExplicitStepGoal === false) return false;

  return (
    hasValue(day.walkingStepGoal) ||
    hasValue(day.stepGoal) ||
    hasValue(day.targetSteps) ||
    hasValue(day.dailyStepGoal)
  ) && getDayStepGoalValue(day) > 0;
};

export const hasWalkingStepSignal = (day?: DayLike | null) =>
  Boolean(day?.walkingHasStepSignal) ||
  cleanWalkingSteps(day?.walkingSteps ?? day?.steps ?? day?.stepCount) > 0;

export const hasWalkingPedometerPermission = (day?: DayLike | null) =>
  Boolean(day?.walkingHasPedometerPermission) ||
  String(day?.walkingPedometerPermissionStatus || "").toLowerCase() === "granted";

export const shouldIncludeWalkingProgress = (day?: DayLike | null) =>
  hasWalkingStepSignal(day) ||
  hasExplicitWalkingStepGoal(day) ||
  hasWalkingPedometerPermission(day) ||
  getExplicitWalkingCaloriesTarget(day) > 0;

const normalizeHeightCm = (value: unknown) => {
  const height = toNumber(value);
  if (height <= 0) return 0;
  if (height < 10) return height * 30.48;
  if (height < 100) return height * 2.54;
  return height;
};

const getWalkingStrideMeters = (heightCm: number, gender?: string) => {
  const heightMeters = heightCm / 100;
  const normalizedGender = String(gender || "").toLowerCase();
  const strideRatio = normalizedGender === "male" ? 0.415 : normalizedGender === "female" ? 0.413 : 0.414;

  return heightMeters * strideRatio;
};

const getEffectiveWalkingWeightKg = (weightKg: number, heightCm: number) => {
  if (weightKg <= 0) return 0;
  if (heightCm <= 0) return weightKg;

  const heightMeters = heightCm / 100;
  const bmi = weightKg / (heightMeters * heightMeters);
  if (bmi <= 32) return weightKg;

  const idealWeight = 22.5 * heightMeters * heightMeters;
  if (idealWeight <= 0 || idealWeight >= weightKg) return weightKg;

  return idealWeight + (weightKg - idealWeight) * 0.45;
};

export const estimateWalkingCalories = (
  steps: unknown,
  metrics?: Pick<AdaptiveGoalMetrics, "height" | "weight" | "gender"> | null
) => {
  const stepCount = cleanWalkingSteps(steps);
  if (stepCount <= 0) return 0;

  const weightKg = toNumber(metrics?.weight);
  const heightCm = normalizeHeightCm(metrics?.height);

  if (weightKg > 0 && heightCm > 0) {
    const distanceKm = (stepCount * getWalkingStrideMeters(heightCm, metrics?.gender)) / 1000;
    const effectiveWeightKg = getEffectiveWalkingWeightKg(weightKg, heightCm);
    return Math.max(0, Math.round(effectiveWeightKg * distanceKm * WALKING_KCAL_PER_KG_KM));
  }

  return Math.round(stepCount * STEP_CALORIE_FACTOR);
};

const roundCalories = (value: unknown) => Math.max(0, Math.round(toNumber(value)));

const normalizeDateKey = (value?: string | Date | null) => {
  if (!value) return "";

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const parseWalkingHistory = (rawValue: string | null): WalkingProgressEntry[] => {
  if (!rawValue) return [];

  try {
    const parsed = JSON.parse(rawValue);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((item: any) => {
        const steps = cleanWalkingSteps(item?.steps);
        const goal = clampStepGoal(Number(item?.goal || DEFAULT_STEP_GOAL));

        return {
          dateKey: String(item?.dateKey || ""),
          steps,
          calories: estimateWalkingCalories(steps),
          goal,
          updatedAt: String(item?.updatedAt || new Date().toISOString()),
          userId: item?.userId ? String(item.userId) : null,
          weeklyTrackingId: item?.weeklyTrackingId ? String(item.weeklyTrackingId) : null,
        };
      })
      .filter((item) => item.dateKey);
  } catch (error) {
    console.log("[WalkingProgress] Failed to parse step history:", error);
    return [];
  }
};

export const loadWalkingCalorieMetrics = async (): Promise<AdaptiveGoalMetrics | null> => {
  let storedMetrics: any = null;

  try {
    const rawMetrics = await AsyncStorage.getItem(HEALTH_METRICS_STORAGE_KEY);
    storedMetrics = rawMetrics ? JSON.parse(rawMetrics) : null;
  } catch (error) {
    console.log("[WalkingProgress] Failed to load local health metrics:", error);
  }

  try {
    const user = await tokenStorage.getUser();
    return buildAdaptiveGoalMetrics(user, storedMetrics);
  } catch (error) {
    console.log("[WalkingProgress] Failed to load user metrics:", error);
    return buildAdaptiveGoalMetrics(undefined, storedMetrics);
  }
};

export const getWalkingProgressScope = async (): Promise<WalkingProgressScope> => {
  try {
    const user = await tokenStorage.getUser();
    return {
      userId: getDashboardUserIdentity(user),
      weeklyTrackingId: await getStoredWeeklyTrackingId(user),
    };
  } catch (error) {
    console.log("[WalkingProgress] Failed to resolve progress scope:", error);
    return {};
  }
};

export const walkingProgressEntryMatchesScope = (
  entry?: Pick<WalkingProgressEntry, "userId" | "weeklyTrackingId"> | null,
  scope?: WalkingProgressScope | null
) => {
  if (!scope?.userId && !scope?.weeklyTrackingId) return true;
  if (!entry) return false;
  if (scope.userId && entry.userId !== scope.userId) return false;
  if (scope.weeklyTrackingId && entry.weeklyTrackingId !== scope.weeklyTrackingId) return false;
  return true;
};

export const readWalkingHistory = async () => {
  try {
    return parseWalkingHistory(await AsyncStorage.getItem(WALKING_PROGRESS_STORAGE_KEY));
  } catch (error) {
    console.log("[WalkingProgress] Failed to read step history:", error);
    return [];
  }
};

const readWalkingSettings = async () => {
  try {
    const [rawGoal, rawPermissionStatus] = await Promise.all([
      AsyncStorage.getItem(WALKING_STEP_GOAL_STORAGE_KEY),
      AsyncStorage.getItem(WALKING_PEDOMETER_PERMISSION_STORAGE_KEY),
    ]);
    const explicitStepGoal = rawGoal ? clampStepGoal(Number(rawGoal)) : 0;
    const permissionStatus = rawPermissionStatus || null;

    return {
      explicitStepGoal,
      hasExplicitStepGoal: explicitStepGoal > 0,
      permissionStatus,
      hasPedometerPermission: String(permissionStatus || "").toLowerCase() === "granted",
    };
  } catch (error) {
    console.log("[WalkingProgress] Failed to read step settings:", error);
    return {
      explicitStepGoal: 0,
      hasExplicitStepGoal: false,
      permissionStatus: null,
      hasPedometerPermission: false,
    };
  }
};

const findWalkingEntryForDay = (
  history: WalkingProgressEntry[],
  day?: DayLike | null,
  scope?: WalkingProgressScope | null
) => {
  const dateKey = normalizeDateKey(day?.date);
  if (!dateKey) return null;

  return history.find(
    (entry) => entry.dateKey === dateKey && walkingProgressEntryMatchesScope(entry, scope)
  ) || null;
};

export const getWalkingCaloriesBurned = (day?: DayLike | null) => {
  const explicitCalories =
    day?.walkingCaloriesBurned ??
    day?.stepCaloriesBurned ??
    day?.walkingCalories ??
    day?.caloriesBurnedFromWalking;

  if (explicitCalories !== undefined && explicitCalories !== null) {
    return roundCalories(explicitCalories);
  }

  const steps = day?.walkingSteps ?? day?.steps ?? day?.stepCount;
  return steps !== undefined && steps !== null
    ? estimateWalkingCalories(steps, day?.walkingCalorieMetrics)
    : 0;
};

export const getWalkingCaloriesTarget = (day?: DayLike | null) => {
  const targetCalories = getExplicitWalkingCaloriesTarget(day);

  if (targetCalories > 0) return targetCalories;

  const stepGoal = hasExplicitWalkingStepGoal(day) ? getDayStepGoalValue(day) : 0;

  if (stepGoal > 0) {
    return estimateWalkingCalories(stepGoal, day?.walkingCalorieMetrics);
  }

  const burnedCalories = getWalkingCaloriesBurned(day);
  if (burnedCalories > 0) {
    return Math.max(
      estimateWalkingCalories(DEFAULT_STEP_GOAL, day?.walkingCalorieMetrics),
      burnedCalories
    );
  }

  if (hasWalkingPedometerPermission(day)) {
    return estimateWalkingCalories(DEFAULT_STEP_GOAL, day?.walkingCalorieMetrics);
  }

  return 0;
};

const applyWalkingEntryToDay = <T extends DayLike>(
  day: T,
  entry?: WalkingProgressEntry | null,
  metrics?: AdaptiveGoalMetrics | null,
  settings?: Awaited<ReturnType<typeof readWalkingSettings>>
): T => {
  const walkingCalorieMetrics = metrics || day.walkingCalorieMetrics;
  const hasExplicitGoal = hasExplicitWalkingStepGoal(day) || Boolean(settings?.hasExplicitStepGoal);
  const explicitStepGoal = hasExplicitGoal
    ? settings?.explicitStepGoal || getDayStepGoalValue(day)
    : 0;
  const permissionStatus = settings?.permissionStatus || day.walkingPedometerPermissionStatus || null;
  const hasPermission = Boolean(settings?.hasPedometerPermission) || hasWalkingPedometerPermission(day);

  if (!entry) {
    const walkingSteps = cleanWalkingSteps(day.walkingSteps ?? day.steps ?? day.stepCount);
    const dayWithMetrics = {
      ...day,
      walkingCalorieMetrics,
      walkingSteps,
      walkingStepGoal: hasExplicitGoal ? explicitStepGoal : day.walkingStepGoal,
      walkingHasStepSignal: hasWalkingStepSignal(day) || walkingSteps > 0,
      walkingHasExplicitStepGoal: hasExplicitGoal,
      walkingHasPedometerPermission: hasPermission,
      walkingPedometerPermissionStatus: permissionStatus,
    };

    return {
      ...dayWithMetrics,
      walkingCaloriesBurned: getWalkingCaloriesBurned(dayWithMetrics),
      targetWalkingCaloriesBurned: getWalkingCaloriesTarget(dayWithMetrics),
    };
  }

  const nextDay = {
    ...day,
    walkingCalorieMetrics,
    walkingSteps: entry.steps,
    walkingStepGoal: hasExplicitGoal ? explicitStepGoal || entry.goal : day.walkingStepGoal,
    walkingHasStepSignal: entry.steps > 0 || hasPermission,
    walkingHasExplicitStepGoal: hasExplicitGoal,
    walkingHasPedometerPermission: hasPermission,
    walkingPedometerPermissionStatus: permissionStatus,
  };

  return {
    ...nextDay,
    walkingCaloriesBurned: estimateWalkingCalories(entry.steps, walkingCalorieMetrics),
    targetWalkingCaloriesBurned: getWalkingCaloriesTarget(nextDay),
  };
};

export const mergeWalkingProgressIntoDay = async <T extends DayLike>(day: T): Promise<T> => {
  const [history, metrics, settings, scope] = await Promise.all([
    readWalkingHistory(),
    loadWalkingCalorieMetrics(),
    readWalkingSettings(),
    getWalkingProgressScope(),
  ]);
  return applyWalkingEntryToDay(day, findWalkingEntryForDay(history, day, scope), metrics, settings);
};

export const mergeWalkingProgressIntoJsonResponse = async <T extends Record<string, DayLike>>(
  data: T
): Promise<T> => {
  const [history, metrics, settings, scope] = await Promise.all([
    readWalkingHistory(),
    loadWalkingCalorieMetrics(),
    readWalkingSettings(),
    getWalkingProgressScope(),
  ]);
  const nextData = Object.keys(data).reduce((acc, key) => {
    const day = data[key];
    acc[key as keyof T] = applyWalkingEntryToDay(
      day,
      findWalkingEntryForDay(history, day, scope),
      metrics,
      settings
    ) as T[keyof T];
    return acc;
  }, {} as T);

  return nextData;
};
