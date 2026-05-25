import AsyncStorage from "@react-native-async-storage/async-storage";

export type GoalDisplayMode = "simple" | "advanced";
export type GoalTargetPlan = "free" | "premium";

export type GoalTargetRange = {
  target: number;
  min: number;
  max: number;
};

export const GOAL_DISPLAY_MODE_STORAGE_KEY = "fitfaat_goal_display_mode";

const toNumber = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const roundHydration = (value: number) => Math.round(value * 10) / 10;

export const normalizeGoalDisplayMode = (value: unknown): GoalDisplayMode =>
  value === "advanced" ? "advanced" : "simple";

export const loadGoalDisplayMode = async (): Promise<GoalDisplayMode> => {
  try {
    return normalizeGoalDisplayMode(await AsyncStorage.getItem(GOAL_DISPLAY_MODE_STORAGE_KEY));
  } catch {
    return "simple";
  }
};

export const saveGoalDisplayMode = async (mode: GoalDisplayMode) => {
  await AsyncStorage.setItem(GOAL_DISPLAY_MODE_STORAGE_KEY, mode);
};

export const buildCalorieTargetRange = (
  target: unknown,
  plan: GoalTargetPlan = "free"
): GoalTargetRange => {
  const targetValue = Math.round(toNumber(target));
  if (targetValue <= 0) return { target: 0, min: 0, max: 0 };

  const margin = clamp(
    Math.round(targetValue * (plan === "premium" ? 0.06 : 0.08)),
    plan === "premium" ? 90 : 120,
    plan === "premium" ? 220 : 300
  );

  return {
    target: targetValue,
    min: Math.max(0, targetValue - margin),
    max: targetValue + margin,
  };
};

export const buildHydrationTargetRange = (
  target: unknown,
  plan: GoalTargetPlan = "free"
): GoalTargetRange => {
  const targetValue = roundHydration(toNumber(target));
  if (targetValue <= 0) return { target: 0, min: 0, max: 0 };

  const margin = roundHydration(
    clamp(
      targetValue * (plan === "premium" ? 0.08 : 0.1),
      plan === "premium" ? 0.2 : 0.25,
      plan === "premium" ? 0.45 : 0.55
    )
  );

  return {
    target: targetValue,
    min: roundHydration(Math.max(0, targetValue - margin)),
    max: roundHydration(targetValue + margin),
  };
};

export const getCalorieTargetRangeFromDay = (
  day: any,
  plan: GoalTargetPlan = "free"
): GoalTargetRange => {
  const target = Math.round(toNumber(day?.targetCalories));
  const min = Math.round(toNumber(day?.targetCaloriesMin));
  const max = Math.round(toNumber(day?.targetCaloriesMax));

  if (target > 0 && min > 0 && max >= min) {
    return { target, min, max };
  }

  return buildCalorieTargetRange(target, plan);
};

export const getHydrationTargetRangeFromDay = (
  day: any,
  plan: GoalTargetPlan = "free"
): GoalTargetRange => {
  const target = roundHydration(toNumber(day?.targetHydration));
  const min = roundHydration(toNumber(day?.targetHydrationMin));
  const max = roundHydration(toNumber(day?.targetHydrationMax));

  if (target > 0 && min > 0 && max >= min) {
    return { target, min, max };
  }

  return buildHydrationTargetRange(target, plan);
};

export const formatCalorieTarget = (
  day: any,
  mode: GoalDisplayMode,
  plan: GoalTargetPlan = "free"
) => {
  const range = getCalorieTargetRangeFromDay(day, plan);
  if (range.target <= 0) return "0";
  if (mode === "advanced") {
    return `${range.min.toLocaleString()}-${range.max.toLocaleString()}`;
  }
  return range.target.toLocaleString();
};

export const formatHydrationTarget = (
  day: any,
  mode: GoalDisplayMode,
  plan: GoalTargetPlan = "free"
) => {
  const range = getHydrationTargetRangeFromDay(day, plan);
  if (range.target <= 0) return "0";
  if (mode === "advanced") {
    return `${range.min.toFixed(1)}-${range.max.toFixed(1)}`;
  }
  return range.target.toFixed(1);
};
