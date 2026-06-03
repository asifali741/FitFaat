import AsyncStorage from "@react-native-async-storage/async-storage";
import { queueAccountScopedStorageCloudSync } from "@/utils/auth/accountScopedStorageSyncQueue";

export type GoalDisplayMode = "exact" | "ranges";
export type GoalTargetPlan = "free" | "premium";
export type GoalRangeStatus = "unset" | "below" | "within" | "above";

export type GoalTargetRange = {
  target: number;
  min: number;
  max: number;
};

export type GoalTargetProgress = {
  range: GoalTargetRange;
  status: GoalRangeStatus;
  percent: number;
  isComplete: boolean;
  statusLabel: string;
  helperText: string;
};

export const GOAL_DISPLAY_MODE_STORAGE_KEY = "fitfaat_goal_display_mode";

const toNumber = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const roundHydration = (value: number) => Math.round(value * 10) / 10;

const formatRangeNumber = (value: number, unit: "calories" | "hydration") =>
  unit === "hydration" ? value.toFixed(1) : value.toLocaleString();

export const normalizeGoalDisplayMode = (value: unknown): GoalDisplayMode =>
  value === "ranges" || value === "advanced" ? "ranges" : "exact";

export const isRangesGoalDisplayMode = (mode: unknown) =>
  normalizeGoalDisplayMode(mode) === "ranges";

export const loadGoalDisplayMode = async (): Promise<GoalDisplayMode> => {
  try {
    return normalizeGoalDisplayMode(await AsyncStorage.getItem(GOAL_DISPLAY_MODE_STORAGE_KEY));
  } catch {
    return "exact";
  }
};

export const saveGoalDisplayMode = async (mode: GoalDisplayMode) => {
  await AsyncStorage.setItem(GOAL_DISPLAY_MODE_STORAGE_KEY, normalizeGoalDisplayMode(mode));
  queueAccountScopedStorageCloudSync("goal-display-mode");
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
  if (isRangesGoalDisplayMode(mode)) {
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
  if (isRangesGoalDisplayMode(mode)) {
    return `${range.min.toFixed(1)}-${range.max.toFixed(1)}`;
  }
  return range.target.toFixed(1);
};

export const formatCalorieTargetComparison = (
  day: any,
  plan: GoalTargetPlan = "free"
) => {
  const range = getCalorieTargetRangeFromDay(day, plan);
  if (range.target <= 0) {
    return { exact: "Exact: -- cal", ranges: "Range: -- cal" };
  }

  return {
    exact: `Exact: ${range.target.toLocaleString()} cal`,
    ranges: `Range: ${range.min.toLocaleString()}-${range.max.toLocaleString()} cal`,
  };
};

export const formatHydrationTargetComparison = (
  day: any,
  plan: GoalTargetPlan = "free"
) => {
  const range = getHydrationTargetRangeFromDay(day, plan);
  if (range.target <= 0) {
    return { exact: "Exact: -- L", ranges: "Range: -- L" };
  }

  return {
    exact: `Exact: ${range.target.toFixed(1)} L`,
    ranges: `Range: ${range.min.toFixed(1)}-${range.max.toFixed(1)} L`,
  };
};

export const getGoalRangeStatus = (
  achieved: unknown,
  range: GoalTargetRange
): GoalRangeStatus => {
  const achievedValue = toNumber(achieved);
  if (range.target <= 0 || range.min <= 0 || range.max < range.min) return "unset";
  if (achievedValue < range.min) return "below";
  if (achievedValue > range.max) return "above";
  return "within";
};

const getExactProgress = (achieved: unknown, target: unknown) => {
  const achievedValue = Math.max(0, toNumber(achieved));
  const targetValue = Math.max(0, toNumber(target));
  if (targetValue <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((achievedValue / targetValue) * 100)));
};

const buildGoalTargetProgress = (
  achieved: unknown,
  range: GoalTargetRange,
  mode: GoalDisplayMode,
  unit: "calories" | "hydration"
): GoalTargetProgress => {
  const achievedValue = Math.max(0, toNumber(achieved));
  const normalizedMode = normalizeGoalDisplayMode(mode);
  const status = getGoalRangeStatus(achievedValue, range);

  if (range.target <= 0) {
    return {
      range,
      status: "unset",
      percent: 0,
      isComplete: false,
      statusLabel: "No target set",
      helperText: "Add setup details so FitFaat can build a target.",
    };
  }

  if (normalizedMode === "exact") {
    const percent = getExactProgress(achievedValue, range.target);
    return {
      range,
      status,
      percent,
      isComplete: percent >= 100,
      statusLabel: `${percent}% of exact target`,
      helperText: `Exact target: ${formatRangeNumber(range.target, unit)}`,
    };
  }

  if (status === "below") {
    const percent = range.min > 0
      ? Math.min(99, Math.max(0, Math.round((achievedValue / range.min) * 100)))
      : 0;
    return {
      range,
      status,
      percent,
      isComplete: false,
      statusLabel: "Building toward range",
      helperText: `Healthy range starts at ${formatRangeNumber(range.min, unit)}`,
    };
  }

  if (status === "above") {
    return {
      range,
      status,
      percent: 100,
      isComplete: false,
      statusLabel: "Above healthy range",
      helperText: "A little over is information, not failure.",
    };
  }

  return {
    range,
    status,
    percent: 100,
    isComplete: true,
    statusLabel: "Within healthy range",
    helperText: "Consistency matters more than perfection.",
  };
};

export const getCalorieTargetProgress = (
  day: any,
  mode: GoalDisplayMode,
  plan: GoalTargetPlan = "free"
) =>
  buildGoalTargetProgress(
    day?.achievedCalories,
    getCalorieTargetRangeFromDay(day, plan),
    mode,
    "calories"
  );

export const getHydrationTargetProgress = (
  day: any,
  mode: GoalDisplayMode,
  plan: GoalTargetPlan = "free"
) =>
  buildGoalTargetProgress(
    day?.achieviedHydration ?? day?.achievedHydration,
    getHydrationTargetRangeFromDay(day, plan),
    mode,
    "hydration"
  );

export const getRangeAwareCalorieScorePercent = (
  day: any,
  mode: GoalDisplayMode,
  plan: GoalTargetPlan = "free"
) => {
  const progress = getCalorieTargetProgress(day, mode, plan);
  if (!isRangesGoalDisplayMode(mode)) return progress.percent;
  if (progress.status !== "above") return progress.percent;

  const achieved = Math.max(0, toNumber(day?.achievedCalories));
  const max = progress.range.max;
  if (max <= 0) return 0;

  const overagePercent = ((achieved - max) / max) * 100;
  return Math.max(0, Math.round(100 - overagePercent * 1.5));
};

export const runGoalTargetDisplayQaCases = () => {
  const sampleDay = {
    achievedCalories: 2100,
    achieviedHydration: 2.3,
    targetCalories: 2000,
    targetCaloriesMin: 1900,
    targetCaloriesMax: 2200,
    targetHydration: 2.5,
    targetHydrationMin: 2.2,
    targetHydrationMax: 2.8,
  };

  const cases = [
    {
      name: "legacy advanced maps to ranges",
      passed: normalizeGoalDisplayMode("advanced") === "ranges",
    },
    {
      name: "legacy simple maps to exact",
      passed: normalizeGoalDisplayMode("simple") === "exact",
    },
    {
      name: "calorie range formats when enabled",
      passed: formatCalorieTarget(sampleDay, "ranges") === "1,900-2,200",
    },
    {
      name: "calorie exact formats one target",
      passed: formatCalorieTarget(sampleDay, "exact") === "2,000",
    },
    {
      name: "within range is complete",
      passed: getCalorieTargetProgress(sampleDay, "ranges").isComplete,
    },
    {
      name: "below range is not complete",
      passed: !getCalorieTargetProgress({ ...sampleDay, achievedCalories: 1600 }, "ranges").isComplete,
    },
    {
      name: "above range is detected",
      passed: getCalorieTargetProgress({ ...sampleDay, achievedCalories: 2400 }, "ranges").status === "above",
    },
  ];

  return cases;
};
