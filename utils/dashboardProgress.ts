import { getExerciseCaloriesBurned } from "@/utils/localExerciseProgress";
import {
  DEFAULT_STEP_GOAL,
  estimateWalkingCalories,
  getWalkingCaloriesBurned,
  getWalkingCaloriesTarget,
  shouldIncludeWalkingProgress,
} from "@/utils/localWalkingProgress";
import {
  getCalorieTargetProgress,
  getHydrationTargetProgress,
  getRangeAwareCalorieScorePercent,
  normalizeGoalDisplayMode,
  type GoalDisplayMode,
} from "@/utils/goalTargetDisplay";

const DEFAULT_WORKOUT_CALORIE_TARGET = 250;
const WORKOUT_TARGET_FRACTION_OF_FOOD = 0.12;
const MIN_INFERRED_WORKOUT_TARGET = 150;
const MAX_INFERRED_WORKOUT_TARGET = 500;
const CALORIE_OVERAGE_GRACE_MULTIPLIER = 1.1;
const CALORIE_OVERAGE_PENALTY_PER_PERCENT = 1.5;
const PREMIUM_REQUIRED_MINIMUM_CAP = 85;
const PREMIUM_MINIMUM_CALORIE_SCORE = 70;
const PREMIUM_MINIMUM_HYDRATION_SCORE = 70;
const PREMIUM_MINIMUM_ACTIVITY_SCORE = 40;
const FREE_STEP_FALLBACK_CALORIES_PER_100_STEPS = 5;
const FREE_SCORE_WEIGHTS = {
  calories: 0.5,
  hydration: 0.4,
  stepsPreview: 0.1,
} as const;

const CORE_GOAL_SCORE_WEIGHTS = {
  calories: FREE_SCORE_WEIGHTS.calories,
  hydration: FREE_SCORE_WEIGHTS.hydration,
} as const;

const PREMIUM_SCORE_WEIGHTS = {
  calories: 0.34,
  hydration: 0.24,
  workout: 0.2,
  walking: 0.22,
} as const;

export const HEALTH_SCORE_WEIGHTS = {
  free: FREE_SCORE_WEIGHTS,
  premium: PREMIUM_SCORE_WEIGHTS,
} as const;

export type HealthScorePlan = keyof typeof HEALTH_SCORE_WEIGHTS;
export type HealthScoreConfidenceLevel = "good" | "partial" | "needsMoreLogs";
export type HealthScoreMetricKey =
  | "calories"
  | "hydration"
  | "stepsPreview"
  | "workout"
  | "walking";

export type HealthScoreMetric = {
  key: HealthScoreMetricKey;
  label: string;
  achieved: number;
  target: number;
  contribution: number;
  rawContribution: number;
  weight: number;
  weightPercent: number;
  hasTarget: boolean;
  hasSignal: boolean;
  sourceKey: DashboardDataSourceKey;
  sourceLabel: string;
  sourceDescription: string;
};

export type DashboardHealthScore = {
  score: number;
  healthScore: number;
  coreGoalScore: number;
  plan: HealthScorePlan;
  modelLabel: "Basic Score" | "Full Health Score";
  confidence: number;
  confidenceLevel: HealthScoreConfidenceLevel;
  confidenceLabel: "Good data" | "Partial data" | "Needs more logs";
  hasAnySignal: boolean;
  coreMetrics: HealthScoreMetric[];
  metrics: HealthScoreMetric[];
};

export type DashboardScoreBreakdown = DashboardHealthScore;

export type DashboardDataSourceLabel = {
  key: "manualLog" | "pedometer" | "localHistory";
  label: string;
  description: string;
};

export type DashboardDataSourceKey = DashboardDataSourceLabel["key"];

export type WeeklyHealthScoreTrend = {
  currentAverage: number;
  previousAverage: number;
  delta: number;
  direction: "up" | "down" | "steady" | "learning";
  label: string;
  confidence: number;
  confidenceLabel: DashboardHealthScore["confidenceLabel"];
};

export const getProgressValue = (value: unknown) => {
  const numberValue = Number(value || 0);
  return Number.isFinite(numberValue) ? Math.max(0, numberValue) : 0;
};

export const HEALTH_SCORE_DISCLAIMER =
  "FitFaat scores are guidance from your logs and device signals, not medical advice.";

export const DASHBOARD_DATA_SOURCE_LABELS: DashboardDataSourceLabel[] = [
  {
    key: "manualLog",
    label: "Manual log",
    description: "Meals, water, notes, and weight you enter in FitFaat.",
  },
  {
    key: "pedometer",
    label: "Pedometer",
    description: "Device step readings when motion access is available.",
  },
  {
    key: "localHistory",
    label: "Local history",
    description: "Saved on-device history for steps, workouts, goals, and reports.",
  },
];

const getDashboardDataSource = (sourceKey: DashboardDataSourceKey) =>
  DASHBOARD_DATA_SOURCE_LABELS.find((source) => source.key === sourceKey) ||
  DASHBOARD_DATA_SOURCE_LABELS[0];

export const FITFAAT_CALCULATION_INFO_LINES = [
  "Daily Ring = calories + hydration only.",
  "Free tracks calories, hydration, and full step goals.",
  "Premium adds workout history, exports, and unlimited support on top of the free tracking tools.",
  "Next-day targets use food and water logs only; activity does not add or subtract those targets.",
] as const;

export const getHealthScorePlanExplanation = (includeExercise = false) =>
  includeExercise
    ? "Full Health Score includes calories, hydration, workout when available, and walking."
    : "Free tracks calories, hydration, and full step goals.";

export const getPremiumScoreChangeExplanation = () =>
  "Full Health Score can change when workout or walking signals are included. Next-day targets still use food and water logs only.";

export type DashboardScoreTrustCopy = {
  shortFraming: string;
  planFraming: string;
  reasonLine: string;
  positiveDriver: string;
  weakestDriver: string;
  missingSignals: string;
  nextAction: string;
  trustLine: string;
};

export type DashboardScoreExplanation = Pick<
  DashboardScoreTrustCopy,
  "reasonLine" | "positiveDriver" | "weakestDriver" | "missingSignals" | "nextAction" | "trustLine"
>;

const getScoreMetricReasonLabel = (metric: HealthScoreMetric) => {
  if (metric.key === "calories") return "calories";
  if (metric.key === "hydration") return "hydration";
  if (metric.key === "stepsPreview") return "steps";
  if (metric.key === "workout") return "workout";
  return "walking";
};

const getWeightedScoreMetrics = (score?: DashboardHealthScore | null) =>
  score?.metrics.filter((metric) => metric.weight > 0 && metric.hasTarget) || [];

const getScoreMetricPercent = (metric?: HealthScoreMetric | null) =>
  Math.max(0, Math.min(100, Math.round(metric?.rawContribution || 0)));

const getMissingSignalMetrics = (score?: DashboardHealthScore | null) => {
  if (!score) return [];

  return score.metrics.filter((metric) => {
    const isActiveMetric = metric.weight > 0 && metric.hasTarget;
    const isPremiumActivity =
      score.plan === "premium" && (metric.key === "workout" || metric.key === "walking");
    return (isActiveMetric || isPremiumActivity) && !metric.hasSignal;
  });
};

const hasMissingPremiumActivitySignal = (score?: DashboardHealthScore | null) => {
  if (!score || score.plan !== "premium") return false;

  return score.metrics.some(
    (metric) =>
      (metric.key === "workout" || metric.key === "walking") &&
      metric.weight <= 0 &&
      !metric.hasSignal
  );
};

const getScoreNextAction = (
  score?: DashboardHealthScore | null,
  weakestMetric?: HealthScoreMetric
) => {
  if (!score || !score.hasAnySignal) {
    return "Next action: log water or your first meal so the score can start from real data.";
  }

  if (!weakestMetric) {
    if (hasMissingPremiumActivitySignal(score)) {
      return "Next action: log a workout or allow steps so Premium can learn the full routine.";
    }

    return "Next action: keep logging the basics so this becomes a weekly pattern, not one good reading.";
  }

  if (weakestMetric.key === "hydration") {
    return "Next action: add water first; hydration usually moves the score fastest.";
  }

  if (weakestMetric.key === "calories") {
    return "Next action: log the next meal and stay close to your calorie target.";
  }

  if (weakestMetric.key === "workout") {
    return "Next action: log a short workout so Premium can count training load.";
  }

  return "Next action: open Steps or enable motion access so walking can count today.";
};

const getScoreExplanation = (score?: DashboardHealthScore | null): DashboardScoreExplanation => {
  if (!score || !score.hasAnySignal) {
    return {
      reasonLine: "Why this changed: FitFaat needs a meal, water, or step signal before the score can move.",
      positiveDriver: "Strongest signal: none yet.",
      weakestDriver: "Watch: missing logs are holding the score back.",
      missingSignals: "Missing signals: calories, hydration, and steps are still empty.",
      nextAction: getScoreNextAction(score),
      trustLine: HEALTH_SCORE_DISCLAIMER,
    };
  }

  const weightedMetrics = getWeightedScoreMetrics(score);
  const missingMetrics = getMissingSignalMetrics(score);
  const positiveMetric = [...weightedMetrics]
    .filter((metric) => metric.hasSignal)
    .sort((a, b) => b.rawContribution - a.rawContribution)[0];
  const weakestMetric = [...weightedMetrics]
    .filter((metric) => !metric.hasSignal || metric.rawContribution < 75)
    .sort((a, b) => a.rawContribution - b.rawContribution)[0];
  const strongestCopy = positiveMetric
    ? `Strongest signal: ${positiveMetric.label} is closest at ${getScoreMetricPercent(positiveMetric)}%.`
    : "Strongest signal: no active score signal has been logged yet.";
  const weakestCopy = weakestMetric
    ? `Watch: ${weakestMetric.label} is at ${getScoreMetricPercent(weakestMetric)}% of its target signal.`
    : "Watch: no active score metric is behind target.";
  const missingSignalsCopy = missingMetrics.length
    ? `Missing signals: ${missingMetrics
        .map((metric) => getScoreMetricReasonLabel(metric))
        .filter((label, index, labels) => labels.indexOf(label) === index)
        .join(", ")}.`
    : "Missing signals: none from the active score model.";
  const nextAction = getScoreNextAction(score, weakestMetric);

  if (weakestMetric) {
    return {
      reasonLine: `Why this changed: lower because ${getScoreMetricReasonLabel(weakestMetric)} is behind.`,
      positiveDriver: strongestCopy,
      weakestDriver: weakestCopy,
      missingSignals: missingSignalsCopy,
      nextAction,
      trustLine: HEALTH_SCORE_DISCLAIMER,
    };
  }

  if (hasMissingPremiumActivitySignal(score)) {
    return {
      reasonLine: "Why this changed: Premium activity signals affect Full Health Score when workout or walking data is available.",
      positiveDriver: strongestCopy,
      weakestDriver: "Watch: workout or walking patterns are not available yet.",
      missingSignals: missingSignalsCopy,
      nextAction,
      trustLine: HEALTH_SCORE_DISCLAIMER,
    };
  }

  const allKeyMetricsStrong =
    weightedMetrics.length > 0 &&
    weightedMetrics.every((metric) => metric.hasSignal && metric.rawContribution >= 85);

  if (allKeyMetricsStrong) {
    return {
      reasonLine:
        score.plan === "premium"
          ? "Why this changed: higher because your logged basics and activity are on track."
          : "Why this changed: higher because your logged basics are on track.",
      positiveDriver: strongestCopy,
      weakestDriver: weakestCopy,
      missingSignals: missingSignalsCopy,
      nextAction,
      trustLine: HEALTH_SCORE_DISCLAIMER,
    };
  }

  return {
    reasonLine: "Why this changed: FitFaat is combining the signals you have logged so far.",
    positiveDriver: strongestCopy,
    weakestDriver: weakestCopy,
    missingSignals: missingSignalsCopy,
    nextAction,
    trustLine: HEALTH_SCORE_DISCLAIMER,
  };
};

export const getDashboardScoreTrustCopy = (
  score?: DashboardHealthScore | null
): DashboardScoreTrustCopy => {
  const isPremium = score?.plan === "premium";
  const explanation = getScoreExplanation(score);

  return {
    shortFraming: isPremium ? "Premium understands the full lifestyle" : "Free tracks the basics",
    planFraming: getHealthScorePlanExplanation(isPremium),
    reasonLine: explanation.reasonLine,
    positiveDriver: explanation.positiveDriver,
    weakestDriver: explanation.weakestDriver,
    missingSignals: explanation.missingSignals,
    nextAction: explanation.nextAction,
    trustLine: explanation.trustLine,
  };
};

export const getHealthScoreReliabilityCopy = (score?: DashboardHealthScore | null) => {
  if (!score) return "No score yet. Add a meal, water, or step signal to start.";

  if (!score.hasAnySignal) {
    return "No score yet. Add a meal, water, or step signal to start.";
  }

  if (score.confidenceLevel === "good") {
    return "High confidence: the score has enough logged signals to be useful today.";
  }

  if (score.confidenceLevel === "partial") {
    return "Medium confidence: useful for nudges, but one or two signals are still missing.";
  }

  return "Low confidence: add more logs before treating this as a strong trend.";
};

export const getHealthScoreMetricStatus = (metric: HealthScoreMetric) => {
  if (metric.key === "walking" && metric.weight <= 0 && !metric.hasSignal) {
    return "Connect steps";
  }
  if (!metric.hasTarget) return "No target set";
  if (!metric.hasSignal) return "No signal yet";
  if (metric.rawContribution >= 100) return "Target reached";
  if (metric.rawContribution >= 75) return "Close";
  if (metric.rawContribution >= 40) return "In progress";
  return "Needs attention";
};

export const getHydrationValue = (day: any) =>
  getProgressValue(day?.achieviedHydration ?? day?.achievedHydration);

export const getSingleMetricProgress = (achieved: unknown, target: unknown) => {
  const targetValue = getProgressValue(target);
  if (targetValue <= 0) return 0;

  return Math.min(100, Math.max(0, Math.round((getProgressValue(achieved) / targetValue) * 100)));
};

const clampNumber = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const getCompletionPercent = (achieved: unknown, target: unknown) => {
  const achievedValue = getProgressValue(achieved);
  const targetValue = getProgressValue(target);
  if (targetValue <= 0) return 0;

  const rawPercent = (achievedValue / targetValue) * 100;
  const roundedPercent = Math.round(rawPercent);

  if (achievedValue > 0 && achievedValue < targetValue) {
    return Math.min(99, Math.max(1, roundedPercent));
  }

  return Math.min(100, Math.max(0, roundedPercent));
};

export const getCalorieCompletionPercent = getCompletionPercent;

export const getCalorieScorePercent = (achieved: unknown, target: unknown) => {
  const achievedValue = getProgressValue(achieved);
  const targetValue = getProgressValue(target);
  if (targetValue <= 0) return 0;

  const targetRatio = achievedValue / targetValue;
  if (targetRatio <= 1) {
    return Math.min(100, Math.max(0, (achievedValue / targetValue) * 100));
  }

  if (targetRatio <= CALORIE_OVERAGE_GRACE_MULTIPLIER) {
    return 100;
  }

  const overagePercent = (targetRatio - CALORIE_OVERAGE_GRACE_MULTIPLIER) * 100;
  return Math.max(0, 100 - overagePercent * CALORIE_OVERAGE_PENALTY_PER_PERCENT);
};

const getMetricContribution = (achieved: unknown, target: unknown) => {
  const targetValue = getProgressValue(target);
  if (targetValue <= 0) return 0;

  const rawPercent = (getProgressValue(achieved) / targetValue) * 100;
  return Math.min(100, Math.max(0, rawPercent));
};

const getDataAwareContribution = (
  achieved: unknown,
  target: unknown,
  rawContribution: number
) => {
  const targetValue = getProgressValue(target);
  if (targetValue <= 0) return 0;
  if (getProgressValue(achieved) > 0) return rawContribution;
  return 0;
};

const isMetricComplete = (achieved: unknown, target: unknown) => {
  const targetValue = getProgressValue(target);
  if (targetValue <= 0) return true;

  return getProgressValue(achieved) >= targetValue;
};

const clampCombinedProgress = (
  progress: number,
  requiredMetrics: { achieved: unknown; target: unknown }[]
) => {
  const roundedProgress = Math.min(100, Math.max(0, Math.round(progress)));
  const hasIncompleteMetric = requiredMetrics.some(
    ({ achieved, target }) => !isMetricComplete(achieved, target)
  );

  return hasIncompleteMetric ? Math.min(99, roundedProgress) : roundedProgress;
};

const getFreePlanSteps = (day: any) =>
  getProgressValue(day?.walkingSteps ?? day?.steps ?? day?.stepCount);

const getFreeStepGoal = (day: any) => {
  const stepGoal = getProgressValue(
    day?.walkingStepGoal ?? day?.stepGoal ?? day?.targetSteps ?? day?.dailyStepGoal
  );
  return stepGoal > 0 ? Math.round(stepGoal) : DEFAULT_STEP_GOAL;
};

const hasWalkingCalorieMetrics = (day: any) =>
  getProgressValue(day?.walkingCalorieMetrics?.height) > 0 &&
  getProgressValue(day?.walkingCalorieMetrics?.weight) > 0;

export const getFreeStepBurnedCalories = (day: any) => {
  const steps = getFreePlanSteps(day);
  if (steps <= 0) return 0;

  if (hasWalkingCalorieMetrics(day)) {
    return estimateWalkingCalories(steps, day?.walkingCalorieMetrics);
  }

  return Math.round((steps / 100) * FREE_STEP_FALLBACK_CALORIES_PER_100_STEPS);
};

const getSeparatedActivityMetrics = (day: any) => {
  const workoutCalories = getExerciseCaloriesBurned(day);
  const workoutTarget = getBurnedCaloriesTarget(day);
  const walkingCalories = getWalkingCaloriesBurned(day);
  const walkingTarget = getWalkingCaloriesTarget(day);

  return {
    workoutCalories,
    workoutTarget,
    walkingCalories,
    walkingTarget,
  };
};

const getExplicitBurnedCaloriesTarget = (day: any) =>
  getProgressValue(
    day?.targetExerciseCaloriesBurned ??
      day?.targetExerciseCalories ??
      day?.targetBurnedCalories ??
      day?.exerciseCaloriesTarget ??
      day?.burnedCaloriesTarget ??
      day?.workoutCaloriesTarget ??
      day?.dailyBurnedCaloriesTarget
  );

const hasWorkoutSignal = (day: any) =>
  getExerciseCaloriesBurned(day) > 0 ||
  getProgressValue(day?.exerciseDurationSeconds ?? day?.exerciseSeconds ?? day?.exerciseDuration) > 0 ||
  (Array.isArray(day?.exerciseEntries) && day.exerciseEntries.length > 0);

const hasPlannedWorkoutSignal = (day: any) =>
  Boolean(
    day?.scheduledWorkout ||
      day?.workoutScheduled ||
      day?.plannedWorkout ||
      day?.workoutPlan ||
      day?.hasWorkoutPlan
  );

const shouldIncludeWorkoutMetric = (day: any) =>
  getExplicitBurnedCaloriesTarget(day) > 0 ||
  hasWorkoutSignal(day) ||
  hasPlannedWorkoutSignal(day);

const getWeightedProgress = (
  metrics: { contribution: number; weight: number }[],
  fallbackProgress = 0
) => {
  const totalWeight = metrics.reduce((sum, metric) => sum + metric.weight, 0);
  if (totalWeight <= 0) return fallbackProgress;

  return metrics.reduce((sum, metric) => sum + metric.contribution * metric.weight, 0) / totalWeight;
};

const getConfidenceLevel = (confidence: number): HealthScoreConfidenceLevel => {
  if (confidence >= 75) return "good";
  if (confidence >= 38) return "partial";
  return "needsMoreLogs";
};

const getConfidenceLabel = (
  confidence: number
): DashboardHealthScore["confidenceLabel"] => {
  const level = getConfidenceLevel(confidence);
  if (level === "good") return "Good data";
  if (level === "partial") return "Partial data";
  return "Needs more logs";
};

const buildHealthScoreMetric = ({
  day,
  key,
  label,
  achieved,
  target,
  rawContribution,
  weight,
  sourceKey,
}: {
  day: any;
  key: HealthScoreMetricKey;
  label: string;
  achieved: unknown;
  target: unknown;
  rawContribution: number;
  weight: number;
  sourceKey: DashboardDataSourceKey;
}): HealthScoreMetric => {
  const achievedValue = getProgressValue(achieved);
  const targetValue = getProgressValue(target);
  const source = getDashboardDataSource(sourceKey);

  return {
    key,
    label,
    achieved: achievedValue,
    target: targetValue,
    contribution: getDataAwareContribution(achievedValue, targetValue, rawContribution),
    rawContribution,
    weight,
    weightPercent: Math.round(weight * 100),
    hasTarget: targetValue > 0,
    hasSignal: achievedValue > 0,
    sourceKey,
    sourceLabel: source.label,
    sourceDescription: source.description,
  };
};

const SCORE_CACHE_LIMIT = 120;
const healthScoreCache = new Map<string, DashboardHealthScore>();

const getHealthScoreCacheKey = (day: any, includeExercise: boolean, goalDisplayMode: GoalDisplayMode) =>
  [
    includeExercise ? "premium" : "free",
    normalizeGoalDisplayMode(goalDisplayMode),
    day?._id,
    day?.dayNo,
    day?.date,
    day?.status,
    day?.achievedCalories,
    day?.achieviedHydration ?? day?.achievedHydration,
    day?.targetCalories,
    day?.targetHydration,
    day?.targetCaloriesMin,
    day?.targetCaloriesMax,
    day?.targetHydrationMin,
    day?.targetHydrationMax,
    day?.walkingSteps ?? day?.steps ?? day?.stepCount,
    day?.walkingStepGoal ?? day?.stepGoal ?? day?.targetSteps ?? day?.dailyStepGoal,
    day?.walkingHasStepSignal ? "walkingSignal" : "",
    day?.walkingHasExplicitStepGoal ? "walkingExplicitGoal" : "",
    day?.walkingHasPedometerPermission ? "walkingPermission" : "",
    day?.walkingPedometerPermissionStatus || "",
    day?.walkingCaloriesBurned ?? day?.stepCaloriesBurned,
    day?.targetWalkingCaloriesBurned ??
      day?.targetWalkingCalories ??
      day?.walkingCaloriesTarget ??
      day?.stepCaloriesTarget,
    day?.targetExerciseCaloriesBurned,
    day?.targetExerciseCalories,
    day?.targetBurnedCalories,
    day?.exerciseCaloriesTarget,
    day?.burnedCaloriesTarget,
    day?.workoutCaloriesTarget,
    day?.dailyBurnedCaloriesTarget,
    day?.exerciseCaloriesBurned,
    day?.exerciseDurationSeconds,
    Array.isArray(day?.exerciseEntries) ? day.exerciseEntries.length : 0,
    day?.scheduledWorkout ? "scheduledWorkout" : "",
    day?.workoutScheduled ? "workoutScheduled" : "",
    day?.plannedWorkout ? "plannedWorkout" : "",
    day?.workoutPlan ? "workoutPlan" : "",
    day?.hasWorkoutPlan ? "hasWorkoutPlan" : "",
  ].join("|");

const rememberHealthScore = (key: string, score: DashboardHealthScore) => {
  if (healthScoreCache.size >= SCORE_CACHE_LIMIT) {
    const oldestKey = healthScoreCache.keys().next().value;
    if (oldestKey) healthScoreCache.delete(oldestKey);
  }

  healthScoreCache.set(key, score);
  return score;
};

export const getBurnedCaloriesTarget = (day: any) => {
  const explicitTarget = getExplicitBurnedCaloriesTarget(day);

  if (explicitTarget > 0) return explicitTarget;
  if (!hasWorkoutSignal(day) && !hasPlannedWorkoutSignal(day)) return 0;

  const workoutCalories = getExerciseCaloriesBurned(day);
  const foodTarget = getProgressValue(day?.targetCalories);
  if (foodTarget <= 0 && workoutCalories <= 0) return 0;

  const inferredTarget = foodTarget > 0
    ? clampNumber(
        Math.round(foodTarget * WORKOUT_TARGET_FRACTION_OF_FOOD),
        MIN_INFERRED_WORKOUT_TARGET,
        MAX_INFERRED_WORKOUT_TARGET
      )
    : DEFAULT_WORKOUT_CALORIE_TARGET;

  return Math.max(inferredTarget, workoutCalories);
};

export type DashboardCalorieSourceKey = "food" | "workout" | "walking";

export type DashboardCalorieSource = {
  key: DashboardCalorieSourceKey;
  label: string;
  achieved: number;
  target: number;
  progress: number;
  color: string;
};

export type DashboardCalorieSummary = {
  sources: DashboardCalorieSource[];
  foodCalories: number;
  foodTarget: number;
  workoutCalories: number;
  workoutTarget: number;
  walkingCalories: number;
  walkingTarget: number;
  activityCalories: number;
  activityTarget: number;
  foodProgress: number;
  activityProgress: number;
  netCaloriesProgress: number;
  totalBurnedCalories: number;
  netCalories: number;
  remainingCalories: number;
  calorieBalance: number;
};

const buildCalorieSource = (
  key: DashboardCalorieSourceKey,
  label: string,
  achieved: unknown,
  target: unknown,
  color: string
): DashboardCalorieSource => {
  const achievedValue = getProgressValue(achieved);
  const targetValue = getProgressValue(target);

  return {
    key,
    label,
    achieved: achievedValue,
    target: targetValue,
    progress: getCompletionPercent(achievedValue, targetValue),
    color,
  };
};

export const getDashboardCalorieSummary = (
  day: any,
  includePremiumCalories = false
): DashboardCalorieSummary => {
  const foodSource = buildCalorieSource(
    "food",
    "Food",
    day?.achievedCalories,
    day?.targetCalories,
    "#F97316"
  );
  const activitySummary = includePremiumCalories ? getSeparatedActivityMetrics(day) : null;
  const workoutCalories = activitySummary?.workoutCalories || 0;
  const workoutTarget = activitySummary?.workoutTarget || 0;
  const walkingCalories = activitySummary?.walkingCalories || 0;
  const walkingTarget = activitySummary?.walkingTarget || 0;
  const candidateSources = [
    foodSource,
    ...(includePremiumCalories && (workoutCalories > 0 || workoutTarget > 0)
      ? [buildCalorieSource("workout", "Workout", workoutCalories, workoutTarget, "#10B981")]
      : []),
    ...(includePremiumCalories && (walkingCalories > 0 || walkingTarget > 0)
      ? [buildCalorieSource("walking", "Walking", walkingCalories, walkingTarget, "#22C55E")]
      : []),
  ];
  const sources = candidateSources.filter((source) => source.target > 0);
  const totalBurnedCalories = workoutCalories + walkingCalories;
  const activityTarget = workoutTarget + walkingTarget;
  const netCalories = Math.max(0, foodSource.achieved - totalBurnedCalories);
  const foodTarget = foodSource.target;
  const remainingCalories = Math.max(0, foodTarget - netCalories);

  return {
    sources,
    foodCalories: foodSource.achieved,
    foodTarget: foodSource.target,
    workoutCalories,
    workoutTarget,
    walkingCalories,
    walkingTarget,
    activityCalories: totalBurnedCalories,
    activityTarget,
    foodProgress: foodSource.progress,
    activityProgress: getCompletionPercent(totalBurnedCalories, activityTarget),
    netCaloriesProgress: getCompletionPercent(netCalories, foodTarget),
    totalBurnedCalories,
    netCalories,
    remainingCalories,
    calorieBalance: netCalories - foodTarget,
  };
};

export const getDashboardHealthScore = (
  day: any,
  includeExercise = false,
  goalDisplayMode: GoalDisplayMode = "exact"
): DashboardHealthScore => getDashboardScoreBreakdown(day, includeExercise, goalDisplayMode);

export const getDashboardScoreBreakdown = (
  day: any,
  includeExercise = false,
  goalDisplayMode: GoalDisplayMode = "exact"
): DashboardScoreBreakdown => {
  const normalizedGoalDisplayMode = normalizeGoalDisplayMode(goalDisplayMode);
  const plan: HealthScorePlan = includeExercise ? "premium" : "free";
  const calorieTargetProgress = getCalorieTargetProgress(day, normalizedGoalDisplayMode, plan);
  const hydrationTargetProgress = getHydrationTargetProgress(day, normalizedGoalDisplayMode, plan);
  const calorieScoreTarget = normalizedGoalDisplayMode === "ranges" && calorieTargetProgress.status === "within"
    ? calorieTargetProgress.range.min
    : normalizedGoalDisplayMode === "ranges" && calorieTargetProgress.status === "above"
      ? calorieTargetProgress.range.max
      : normalizedGoalDisplayMode === "ranges"
        ? calorieTargetProgress.range.min
        : day?.targetCalories;
  const hydrationScoreTarget = normalizedGoalDisplayMode === "ranges" && hydrationTargetProgress.status === "within"
    ? getHydrationValue(day)
    : normalizedGoalDisplayMode === "ranges" && hydrationTargetProgress.status === "above"
      ? hydrationTargetProgress.range.max
      : normalizedGoalDisplayMode === "ranges"
        ? hydrationTargetProgress.range.min
        : day?.targetHydration;
  const cacheKey = getHealthScoreCacheKey(day, includeExercise, normalizedGoalDisplayMode);
  const cachedScore = healthScoreCache.get(cacheKey);
  if (cachedScore) return cachedScore;

  const calorieContribution = normalizedGoalDisplayMode === "ranges"
    ? getRangeAwareCalorieScorePercent(day, normalizedGoalDisplayMode, plan)
    : getCalorieScorePercent(day?.achievedCalories, day?.targetCalories);
  const hydrationContribution = normalizedGoalDisplayMode === "ranges"
    ? hydrationTargetProgress.percent
    : getMetricContribution(getHydrationValue(day), day?.targetHydration);
  const coreMetrics = [
    buildHealthScoreMetric({
      day,
      key: "calories",
      label: "Calories",
      achieved: day?.achievedCalories,
      target: calorieScoreTarget,
      rawContribution: calorieContribution,
      weight: CORE_GOAL_SCORE_WEIGHTS.calories,
      sourceKey: "manualLog",
    }),
    buildHealthScoreMetric({
      day,
      key: "hydration",
      label: "Hydration",
      achieved: getHydrationValue(day),
      target: hydrationScoreTarget,
      rawContribution: hydrationContribution,
      weight: CORE_GOAL_SCORE_WEIGHTS.hydration,
      sourceKey: "manualLog",
    }),
  ];
  const coreGoalScore = clampCombinedProgress(getWeightedProgress(coreMetrics), [
    { achieved: day?.achievedCalories, target: calorieScoreTarget },
    { achieved: getHydrationValue(day), target: hydrationScoreTarget },
  ]);
  const freePlanSteps = getFreePlanSteps(day);
  const freeStepGoal = getFreeStepGoal(day);
  const freeStepContribution = getMetricContribution(
    freePlanSteps,
    freeStepGoal
  );
  const freeMetrics = [
    buildHealthScoreMetric({
      day,
      key: "calories",
      label: "Calories",
      achieved: day?.achievedCalories,
      target: calorieScoreTarget,
      rawContribution: calorieContribution,
      weight: FREE_SCORE_WEIGHTS.calories,
      sourceKey: "manualLog",
    }),
    buildHealthScoreMetric({
      day,
      key: "hydration",
      label: "Hydration",
      achieved: getHydrationValue(day),
      target: hydrationScoreTarget,
      rawContribution: hydrationContribution,
      weight: FREE_SCORE_WEIGHTS.hydration,
      sourceKey: "manualLog",
    }),
    buildHealthScoreMetric({
      day,
      key: "stepsPreview",
      label: "Steps",
      achieved: freePlanSteps,
      target: freeStepGoal,
      rawContribution: freeStepContribution,
      weight: FREE_SCORE_WEIGHTS.stepsPreview,
      sourceKey: "pedometer",
    }),
  ];
  const freeProgress = getWeightedProgress(freeMetrics);

  if (!includeExercise) {
    const score = clampCombinedProgress(freeProgress, [
      { achieved: day?.achievedCalories, target: calorieScoreTarget },
      { achieved: getHydrationValue(day), target: hydrationScoreTarget },
      { achieved: freePlanSteps, target: freeStepGoal },
    ]);
    const activeWeight = freeMetrics
      .filter((metric) => metric.hasTarget && metric.weight > 0)
      .reduce((sum, metric) => sum + metric.weight, 0);
    const signalWeight = freeMetrics
      .filter((metric) => metric.hasTarget && metric.hasSignal && metric.weight > 0)
      .reduce((sum, metric) => sum + metric.weight, 0);
    const confidence = activeWeight > 0 ? Math.round((signalWeight / activeWeight) * 100) : 0;

    return rememberHealthScore(cacheKey, {
      score,
      healthScore: score,
      coreGoalScore,
      plan,
      modelLabel: "Basic Score",
      confidence,
      confidenceLevel: getConfidenceLevel(confidence),
      confidenceLabel: getConfidenceLabel(confidence),
      hasAnySignal: freeMetrics.some((metric) => metric.hasSignal),
      coreMetrics,
      metrics: freeMetrics,
    });
  }

  const activitySummary = getSeparatedActivityMetrics(day);
  const includeWorkoutMetric = shouldIncludeWorkoutMetric(day);
  const includeWalkingMetric = shouldIncludeWalkingProgress(day);
  const workoutContribution = getMetricContribution(
    activitySummary.workoutCalories,
    activitySummary.workoutTarget
  );
  const walkingContribution = getMetricContribution(
    activitySummary.walkingCalories,
    activitySummary.walkingTarget
  );
  const activityMetrics = [
    buildHealthScoreMetric({
      day,
      key: "calories",
      label: "Calories",
      achieved: day?.achievedCalories,
      target: calorieScoreTarget,
      rawContribution: calorieContribution,
      weight: PREMIUM_SCORE_WEIGHTS.calories,
      sourceKey: "manualLog",
    }),
    buildHealthScoreMetric({
      day,
      key: "hydration",
      label: "Hydration",
      achieved: getHydrationValue(day),
      target: hydrationScoreTarget,
      rawContribution: hydrationContribution,
      weight: PREMIUM_SCORE_WEIGHTS.hydration,
      sourceKey: "manualLog",
    }),
    buildHealthScoreMetric({
      day,
      key: "workout",
      label: "Workouts",
      achieved: activitySummary.workoutCalories,
      target: activitySummary.workoutTarget,
      rawContribution: workoutContribution,
      weight: includeWorkoutMetric && activitySummary.workoutTarget > 0
        ? PREMIUM_SCORE_WEIGHTS.workout
        : 0,
      sourceKey: "localHistory",
    }),
    buildHealthScoreMetric({
      day,
      key: "walking",
      label: "Walking/steps",
      achieved: activitySummary.walkingCalories,
      target: activitySummary.walkingTarget,
      rawContribution: walkingContribution,
      weight: includeWalkingMetric && activitySummary.walkingTarget > 0
        ? PREMIUM_SCORE_WEIGHTS.walking
        : 0,
      sourceKey: "pedometer",
    }),
  ];
  const activityProgress = getWeightedProgress(
    activityMetrics.filter(
      (metric) =>
        metric.weight === PREMIUM_SCORE_WEIGHTS.workout ||
        metric.weight === PREMIUM_SCORE_WEIGHTS.walking
    )
  );
  const missesPremiumMinimum =
    calorieContribution < PREMIUM_MINIMUM_CALORIE_SCORE ||
    hydrationContribution < PREMIUM_MINIMUM_HYDRATION_SCORE ||
    activityProgress < PREMIUM_MINIMUM_ACTIVITY_SCORE;
  const combinedProgress = getWeightedProgress(activityMetrics, freeProgress);
  const cappedProgress = missesPremiumMinimum
    ? Math.min(combinedProgress, PREMIUM_REQUIRED_MINIMUM_CAP)
    : combinedProgress;
  const score = clampCombinedProgress(
    cappedProgress,
    activityMetrics
      .filter((metric) => metric.weight > 0)
      .map((metric) => ({ achieved: metric.achieved, target: metric.target }))
  );
  const activeWeight = activityMetrics
    .filter((metric) => metric.hasTarget && metric.weight > 0)
    .reduce((sum, metric) => sum + metric.weight, 0);
  const signalWeight = activityMetrics
    .filter((metric) => metric.hasTarget && metric.hasSignal && metric.weight > 0)
    .reduce((sum, metric) => sum + metric.weight, 0);
  const confidence = activeWeight > 0 ? Math.round((signalWeight / activeWeight) * 100) : 0;

  return rememberHealthScore(cacheKey, {
    score,
    healthScore: score,
    coreGoalScore,
    plan,
    modelLabel: "Full Health Score",
    confidence,
    confidenceLevel: getConfidenceLevel(confidence),
    confidenceLabel: getConfidenceLabel(confidence),
    hasAnySignal: activityMetrics.some((metric) => metric.hasSignal),
    coreMetrics,
    metrics: activityMetrics,
  });
};

export const getDashboardCombinedProgress = (
  day: any,
  includeExercise = false,
  goalDisplayMode: GoalDisplayMode = "exact"
) =>
  getDashboardScoreBreakdown(day, includeExercise, goalDisplayMode).healthScore;

export const getDashboardGoalProgress = (
  day: any,
  goalDisplayMode: GoalDisplayMode = "exact"
) =>
  getDashboardScoreBreakdown(day, false, goalDisplayMode).coreGoalScore;

const averageNumbers = (values: number[]) =>
  values.length
    ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)
    : 0;

const getScoreTrendDayTime = (day: any) => {
  const parsedDate = day?.date ? new Date(day.date).getTime() : 0;
  if (Number.isFinite(parsedDate) && parsedDate > 0) return parsedDate;
  return getProgressValue(day?.dayNo ?? day?.dayNumber);
};

export const getWeeklyHealthScoreTrend = (
  days: any[] = [],
  includeExercise = false
): WeeklyHealthScoreTrend => {
  const scoredDays = days
    .filter((day) => day && day.status !== "locked")
    .sort((a, b) => getScoreTrendDayTime(a) - getScoreTrendDayTime(b))
    .map((day) => ({ day, score: getDashboardScoreBreakdown(day, includeExercise) }))
    .filter(({ day, score }) => {
      const isActive = String(day?.status || "").toLowerCase() === "active";
      return !isActive || score.hasAnySignal || score.metrics.every((metric) => !metric.hasTarget);
    })
    .map(({ score }) => score);

  if (scoredDays.length < 2) {
    const confidence = averageNumbers(scoredDays.map((score) => score.confidence));
    return {
      currentAverage: averageNumbers(scoredDays.map((score) => score.score)),
      previousAverage: 0,
      delta: 0,
      direction: "learning",
      label: "Learning trend",
      confidence,
      confidenceLabel: getConfidenceLabel(confidence),
    };
  }

  const windowSize = Math.min(3, Math.max(1, Math.floor(scoredDays.length / 2)));
  const currentWindow = scoredDays.slice(-windowSize);
  const previousWindow = scoredDays.slice(-windowSize * 2, -windowSize);
  const currentAverage = averageNumbers(currentWindow.map((score) => score.score));
  const previousAverage = averageNumbers(
    (previousWindow.length ? previousWindow : scoredDays.slice(0, -windowSize)).map(
      (score) => score.score
    )
  );
  const delta = currentAverage - previousAverage;
  const direction =
    Math.abs(delta) < 4 ? "steady" : delta > 0 ? "up" : "down";
  const confidence = averageNumbers(currentWindow.map((score) => score.confidence));
  const label =
    direction === "up"
      ? `Improving +${delta}`
      : direction === "down"
        ? `Cooling ${delta}`
        : "Steady trend";

  return {
    currentAverage,
    previousAverage,
    delta,
    direction,
    label,
    confidence,
    confidenceLabel: getConfidenceLabel(confidence),
  };
};
