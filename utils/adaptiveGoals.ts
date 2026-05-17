import AsyncStorage from "@react-native-async-storage/async-storage";

type DayStatus = "locked" | "active" | "finished";

export type AdaptiveGoalDay = {
  _id?: string;
  dayNo?: number;
  dayNumber?: number;
  date?: string;
  achievedCalories?: number;
  achievedHydration?: number;
  achieviedHydration?: number;
  baseTargetCalories?: number;
  baseTargetHydration?: number;
  defaultTargetCalories?: number;
  defaultTargetHydration?: number;
  targetCalories?: number;
  targetHydration?: number;
  status?: DayStatus | string;
};

export type AdaptiveGoalMetrics = {
  height?: number;
  weight?: number;
  age?: number;
  gender?: "male" | "female" | "other" | string;
  activityLevel?: "sedentary" | "light" | "moderate" | "active" | "veryActive" | string;
  fitnessGoal?: 1 | 2 | 3 | number | string;
};

export type AdaptiveGoalCarryForward = {
  sourceUserId?: string;
  sourceWeeklyTrackingId?: string | null;
  sourceDayNo?: number;
  sourceDate?: string;
  targetCalories: number;
  achievedCalories: number;
  targetHydration: number;
  achievedHydration: number;
  createdAt: string;
};

export const ADAPTIVE_GOAL_CARRY_FORWARD_STORAGE_KEY = "fitfaat_adaptive_goal_carry_forward";

const CALORIE_MIN = 800;
const CALORIE_MAX = 6000;
const HYDRATION_MIN = 0.5;
const HYDRATION_MAX = 8;

const ACTIVITY_MULTIPLIERS: Record<string, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  veryActive: 1.9,
};

const toNumber = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const firstPositiveNumber = (...values: unknown[]) => {
  for (const value of values) {
    const parsed = toNumber(value);
    if (parsed > 0) return parsed;
  }

  return 0;
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const roundCalories = (value: number) => Math.round(value);

const roundHydration = (value: number) => Math.round(value * 10) / 10;

const normalizeGoal = (goal?: AdaptiveGoalMetrics["fitnessGoal"]) => {
  if (typeof goal === "number") return goal;
  if (typeof goal === "string") {
    const normalized = goal.trim().toLowerCase();
    if (normalized === "1" || normalized.includes("loss")) return 1;
    if (normalized === "2" || normalized.includes("muscle")) return 2;
    if (normalized === "3" || normalized.includes("gain")) return 3;
  }

  return 1;
};

const normalizeGender = (gender?: AdaptiveGoalMetrics["gender"]) => {
  const normalized = String(gender || "").trim().toLowerCase();
  if (normalized === "female") return "female";
  if (normalized === "male") return "male";
  return "other";
};

export const calculateMifflinStJeorBaseGoals = (metrics?: AdaptiveGoalMetrics | null) => {
  if (!metrics) return null;

  const height = toNumber(metrics.height);
  const weight = toNumber(metrics.weight);
  const age = toNumber(metrics.age);

  if (height <= 0 || weight <= 0 || age <= 0) return null;

  const gender = normalizeGender(metrics.gender);
  const genderOffset = gender === "male" ? 5 : gender === "female" ? -161 : -78;
  const bmr = 10 * weight + 6.25 * height - 5 * age + genderOffset;
  const activityMultiplier = ACTIVITY_MULTIPLIERS[String(metrics.activityLevel || "sedentary")] || 1.2;
  const goal = normalizeGoal(metrics.fitnessGoal);
  const goalAdjustment = goal === 1 ? -500 : goal === 2 ? 300 : 500;
  const calories = clamp(bmr * activityMultiplier + goalAdjustment, CALORIE_MIN, CALORIE_MAX);
  const hydration = clamp(weight * 0.035, HYDRATION_MIN, HYDRATION_MAX);

  return {
    calories: roundCalories(calories),
    hydration: roundHydration(hydration),
  };
};

const getDayNo = (day: AdaptiveGoalDay) => toNumber(day.dayNo || day.dayNumber);

const getDayTime = (day: AdaptiveGoalDay) => {
  if (!day.date) return getDayNo(day);
  const parsed = new Date(day.date);
  return Number.isNaN(parsed.getTime()) ? getDayNo(day) : parsed.getTime();
};

const getAchievedHydration = (day: AdaptiveGoalDay) =>
  firstPositiveNumber(day.achieviedHydration, day.achievedHydration);

const isPastLocalDay = (date?: string) => {
  if (!date) return false;
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  parsed.setHours(0, 0, 0, 0);

  return parsed.getTime() < today.getTime();
};

const canCarryForwardFromDay = (day: AdaptiveGoalDay) => {
  if (day.status === "locked") return false;
  return day.status === "finished" || day.status === "completed" || isPastLocalDay(day.date);
};

const toCarryForwardDay = (carryForward?: AdaptiveGoalCarryForward | null): AdaptiveGoalDay | null => {
  if (!carryForward) return null;

  return {
    dayNo: carryForward.sourceDayNo,
    date: carryForward.sourceDate,
    achievedCalories: carryForward.achievedCalories,
    achieviedHydration: carryForward.achievedHydration,
    targetCalories: carryForward.targetCalories,
    targetHydration: carryForward.targetHydration,
    status: "finished",
  };
};

const resolveBaseGoals = (day: AdaptiveGoalDay, metricsBase: ReturnType<typeof calculateMifflinStJeorBaseGoals>) => ({
  calories: roundCalories(
    firstPositiveNumber(
      day.baseTargetCalories,
      day.defaultTargetCalories,
      day.targetCalories,
      metricsBase?.calories
    )
  ),
  hydration: roundHydration(
    firstPositiveNumber(
      day.baseTargetHydration,
      day.defaultTargetHydration,
      day.targetHydration,
      metricsBase?.hydration
    )
  ),
});

const adjustCalories = (base: number, previousTarget: number, previousActual: number) => {
  if (base <= 0 || previousTarget <= 0) return base;
  return roundCalories(clamp(base + (previousTarget - previousActual), CALORIE_MIN, CALORIE_MAX));
};

const adjustHydration = (base: number, previousTarget: number, previousActual: number) => {
  if (base <= 0 || previousTarget <= 0) return base;
  return roundHydration(clamp(base + (previousTarget - previousActual), HYDRATION_MIN, HYDRATION_MAX));
};

export const applyAdaptiveGoalsToDays = <T extends AdaptiveGoalDay>(
  days: T[],
  metrics?: AdaptiveGoalMetrics | null,
  carryForward?: AdaptiveGoalCarryForward | null
): T[] => {
  const metricsBase = calculateMifflinStJeorBaseGoals(metrics);
  let previousDay: (AdaptiveGoalDay & Required<Pick<AdaptiveGoalDay, "targetCalories" | "targetHydration">>) | null =
    toCarryForwardDay(carryForward) as
      | (AdaptiveGoalDay & Required<Pick<AdaptiveGoalDay, "targetCalories" | "targetHydration">>)
      | null;

  return [...days]
    .sort((a, b) => getDayTime(a) - getDayTime(b))
    .map((day) => {
      const baseGoals = resolveBaseGoals(day, metricsBase);
      let targetCalories = baseGoals.calories;
      let targetHydration = baseGoals.hydration;

      if (previousDay && canCarryForwardFromDay(previousDay)) {
        targetCalories = adjustCalories(
          baseGoals.calories,
          toNumber(previousDay.targetCalories),
          toNumber(previousDay.achievedCalories)
        );
        targetHydration = adjustHydration(
          baseGoals.hydration,
          toNumber(previousDay.targetHydration),
          getAchievedHydration(previousDay)
        );
      }

      const adjustedDay = {
        ...day,
        baseTargetCalories: baseGoals.calories,
        baseTargetHydration: baseGoals.hydration,
        targetCalories,
        targetHydration,
        adaptiveCaloriesAdjustment: targetCalories - baseGoals.calories,
        adaptiveHydrationAdjustment: roundHydration(targetHydration - baseGoals.hydration),
      } as T & Required<Pick<AdaptiveGoalDay, "targetCalories" | "targetHydration">>;

      previousDay = adjustedDay;

      return adjustedDay;
    });
};

export const applyAdaptiveGoalsToJsonResponse = <T extends Record<string, AdaptiveGoalDay>>(
  data: T,
  metrics?: AdaptiveGoalMetrics | null,
  carryForward?: AdaptiveGoalCarryForward | null
): T => {
  const adjustedDays = applyAdaptiveGoalsToDays(
    Object.values(data) as AdaptiveGoalDay[],
    metrics,
    carryForward
  );
  const byDayNo = new Map(adjustedDays.map((day) => [getDayNo(day), day]));

  return Object.keys(data).reduce((acc, key) => {
    const current = data[key];
    const adjusted = byDayNo.get(getDayNo(current));
    acc[key as keyof T] = (adjusted || current) as T[keyof T];
    return acc;
  }, {} as T);
};

const getCarryForwardCandidate = (data: AdaptiveGoalDay[] | Record<string, AdaptiveGoalDay>) => {
  const days = (Array.isArray(data) ? data : Object.values(data))
    .filter(Boolean)
    .sort((a, b) => getDayTime(a) - getDayTime(b));

  if (!days.length) return null;

  return [...days]
    .reverse()
    .find((day) => day.status !== "locked" && firstPositiveNumber(day.targetCalories, day.targetHydration) > 0);
};

export const buildAdaptiveGoalCarryForward = (
  data: AdaptiveGoalDay[] | Record<string, AdaptiveGoalDay>,
  options: { userId?: string; weeklyTrackingId?: string | null } = {}
): AdaptiveGoalCarryForward | null => {
  const latestDay = getCarryForwardCandidate(data);
  if (!latestDay) return null;

  const targetCalories = roundCalories(firstPositiveNumber(latestDay.targetCalories));
  const targetHydration = roundHydration(firstPositiveNumber(latestDay.targetHydration));

  if (targetCalories <= 0 && targetHydration <= 0) return null;

  return {
    sourceUserId: options.userId,
    sourceWeeklyTrackingId: options.weeklyTrackingId,
    sourceDayNo: getDayNo(latestDay),
    sourceDate: latestDay.date,
    targetCalories,
    achievedCalories: roundCalories(toNumber(latestDay.achievedCalories)),
    targetHydration,
    achievedHydration: roundHydration(getAchievedHydration(latestDay)),
    createdAt: new Date().toISOString(),
  };
};

export const saveAdaptiveGoalCarryForward = async (
  data: AdaptiveGoalDay[] | Record<string, AdaptiveGoalDay> | null | undefined,
  options: { userId?: string; weeklyTrackingId?: string | null } = {}
) => {
  if (!data) return null;

  const carryForward = buildAdaptiveGoalCarryForward(data, options);
  if (!carryForward) return null;

  await AsyncStorage.setItem(
    ADAPTIVE_GOAL_CARRY_FORWARD_STORAGE_KEY,
    JSON.stringify(carryForward)
  );

  return carryForward;
};

export const saveAdaptiveGoalCarryForwardFromStorage = async (
  options: { userId?: string; weeklyTrackingId?: string | null } = {}
) => {
  const cached = await AsyncStorage.getItem("JsonResponse");
  if (!cached) return null;

  try {
    const parsed = JSON.parse(cached);
    return saveAdaptiveGoalCarryForward(parsed?.data || parsed, options);
  } catch {
    return null;
  }
};

export const loadAdaptiveGoalCarryForward = async (
  options: { userId?: string; currentWeeklyTrackingId?: string | null } = {}
): Promise<AdaptiveGoalCarryForward | null> => {
  const cached = await AsyncStorage.getItem(ADAPTIVE_GOAL_CARRY_FORWARD_STORAGE_KEY);
  if (!cached) return null;

  try {
    const carryForward = JSON.parse(cached) as AdaptiveGoalCarryForward;

    if (
      options.userId &&
      carryForward.sourceUserId &&
      carryForward.sourceUserId !== options.userId
    ) {
      return null;
    }

    if (
      options.currentWeeklyTrackingId &&
      carryForward.sourceWeeklyTrackingId &&
      carryForward.sourceWeeklyTrackingId === options.currentWeeklyTrackingId
    ) {
      return null;
    }

    return carryForward;
  } catch {
    return null;
  }
};
