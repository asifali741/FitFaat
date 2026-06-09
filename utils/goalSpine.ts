import AsyncStorage from "@react-native-async-storage/async-storage";
import { HEALTH_METRICS_STORAGE_KEY } from "@/utils/adaptiveGoals";
import { queueAccountScopedStorageCloudSync } from "@/utils/auth/accountScopedStorageSyncQueue";
import { tokenStorage } from "@/utils/auth/tokenStorage";
import {
  formatCalorieTarget,
  getCalorieTargetProgress,
  type GoalDisplayMode,
  type GoalTargetPlan,
} from "@/utils/goalTargetDisplay";
import { getExerciseCaloriesBurned } from "@/utils/localExerciseProgress";
import { DEFAULT_STEP_GOAL, cleanWalkingSteps } from "@/utils/localWalkingProgress";
import type { WeeklyNutritionReport } from "@/utils/nutritionInsights";

export type GoalSpineKey = "weight_loss" | "muscle_gain" | "weight_gain" | "unset";
export type GoalSpineReviewStatus = "onTrack" | "needsAdjustment" | "tooAggressive" | "learning";
export type GoalSpineAction =
  | "water"
  | "meal"
  | "mealPlanner"
  | "mindfulness"
  | "steps"
  | "workout"
  | "note"
  | "goalReview";

export type GoalSpineDay = {
  dayNo?: number;
  date?: string;
  status?: "locked" | "active" | "finished" | string;
  achievedCalories?: number;
  achieviedHydration?: number;
  achievedHydration?: number;
  targetCalories?: number;
  targetCaloriesMin?: number;
  targetCaloriesMax?: number;
  targetHydration?: number;
  targetHydrationMin?: number;
  targetHydrationMax?: number;
  meals?: any[];
  waterIntake?: any[];
  walkingSteps?: number;
  steps?: number;
  stepCount?: number;
  walkingStepGoal?: number;
  stepGoal?: number;
  targetSteps?: number;
  dailyStepGoal?: number;
  exerciseCaloriesBurned?: number;
  exerciseDurationSeconds?: number;
  exerciseEntries?: any[];
};

export type GoalSpineOption = {
  key: GoalSpineKey;
  storageValue: 1 | 2 | 3 | null;
  label: string;
  shortLabel: string;
  icon: string;
  color: string;
  pillars: string[];
  promise: string;
};

export type GoalSpineMilestone = {
  id: string;
  title: string;
  body: string;
  icon: string;
  color: string;
  current: number;
  target: number;
  progress: number;
  progressLabel: string;
  unlocked: boolean;
};

export type GoalSpineSummary = {
  goal: GoalSpineOption;
  stats: GoalSpineStats;
  todayTargetLabel: string;
  todayTargetCaption: string;
  dashboardMessage: string;
  weeklyDirectionLabel: string;
  weeklyDirectionBody: string;
  weeklyProgress: {
    title: string;
    value: string;
    body: string;
    icon: string;
    color: string;
    progress: number;
  };
  nextAction: {
    title: string;
    body: string;
    why: string;
    actionLabel: string;
    action: GoalSpineAction;
    icon: string;
    color: string;
  };
  review: {
    status: GoalSpineReviewStatus;
    label: string;
    body: string;
    nextStep: string;
    icon: string;
    color: string;
    reasons: string[];
  };
  milestones: GoalSpineMilestone[];
};

type GoalSpineStats = {
  totalDays: number;
  trackedDays: number;
  consistentDays: number;
  rangeDays: number;
  calorieFloorDays: number;
  aboveRangeDays: number;
  lowEnergyDays: number;
  walkingDays: number;
  workoutDays: number;
  workoutStreak: number;
  proteinDays: number;
  mealConsistencyDays: number;
};

const GOAL_OPTIONS: Record<GoalSpineKey, GoalSpineOption> = {
  weight_loss: {
    key: "weight_loss",
    storageValue: 1,
    label: "Weight Loss",
    shortLabel: "Loss",
    icon: "trending-down-outline",
    color: "#F97316",
    pillars: ["Calorie range", "Walking", "Consistency"],
    promise: "A steady range and regular walks make progress easier to repeat.",
  },
  muscle_gain: {
    key: "muscle_gain",
    storageValue: 2,
    label: "Muscle Gain",
    shortLabel: "Muscle",
    icon: "barbell-outline",
    color: "#10B981",
    pillars: ["Protein", "Workouts", "Recovery"],
    promise: "Protein, training, and recovery give your body a clear growth signal.",
  },
  weight_gain: {
    key: "weight_gain",
    storageValue: 3,
    label: "Weight Gain",
    shortLabel: "Gain",
    icon: "trending-up-outline",
    color: "#0EA5E9",
    pillars: ["Meal consistency", "Calorie surplus", "Strength"],
    promise: "Consistent meals and strength work help weight gain feel planned.",
  },
  unset: {
    key: "unset",
    storageValue: null,
    label: "Choose your goal",
    shortLabel: "Goal",
    icon: "flag-outline",
    color: "#64748B",
    pillars: ["Direction", "Targets", "Next action"],
    promise: "Pick a goal so FitFaat can make the dashboard more specific.",
  },
};

export const GOAL_SPINE_CHOICES = [
  GOAL_OPTIONS.weight_loss,
  GOAL_OPTIONS.muscle_gain,
  GOAL_OPTIONS.weight_gain,
];

const toNumber = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const clamp = (value: number, min = 0, max = 100) =>
  Math.max(min, Math.min(max, Math.round(value)));

const firstValue = (...values: unknown[]) =>
  values.find((value) => value !== undefined && value !== null && value !== "");

const parseJsonObject = (value: string | null) => {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

export const normalizeGoalSpineKey = (value: unknown): GoalSpineKey => {
  if (value === 1 || value === "1") return "weight_loss";
  if (value === 2 || value === "2") return "muscle_gain";
  if (value === 3 || value === "3") return "weight_gain";

  const text = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "");

  if (!text) return "unset";
  if (["weightloss", "fatloss", "loss", "loseweight", "slimdown"].includes(text)) {
    return "weight_loss";
  }
  if (["musclegain", "gainmuscle", "buildmuscle", "muscle", "leanbulk"].includes(text)) {
    return "muscle_gain";
  }
  if (["weightgain", "gainweight", "bulk", "surplus"].includes(text)) {
    return "weight_gain";
  }

  return "unset";
};

export const getGoalSpineOption = (goal: unknown) =>
  GOAL_OPTIONS[normalizeGoalSpineKey(goal)];

export const loadGoalSpineKey = async (): Promise<GoalSpineKey> => {
  const [rawMetrics, user] = await Promise.all([
    AsyncStorage.getItem(HEALTH_METRICS_STORAGE_KEY).catch(() => null),
    tokenStorage.getUser().catch(() => null),
  ]);
  const metrics = parseJsonObject(rawMetrics);

  return normalizeGoalSpineKey(
    firstValue(
      metrics?.fitnessGoal,
      metrics?.selectedGoal,
      metrics?.goal,
      metrics?.goalType,
      user?.userInfo?.fitnessGoal,
      user?.userInfo?.selectedGoal,
      user?.fitnessGoal,
      user?.selectedGoal,
      user?.goal,
      user?.goalType
    )
  );
};

export const saveGoalSpineKey = async (goal: GoalSpineKey) => {
  const option = getGoalSpineOption(goal);
  if (!option.storageValue) return option.key;

  const [rawMetrics, user] = await Promise.all([
    AsyncStorage.getItem(HEALTH_METRICS_STORAGE_KEY).catch(() => null),
    tokenStorage.getUser().catch(() => null),
  ]);
  const metrics = parseJsonObject(rawMetrics) || {};
  const nextMetrics = {
    ...metrics,
    fitnessGoal: option.storageValue,
    selectedGoal: option.storageValue,
    goalLabel: option.label,
    goalKey: option.key,
  };

  await AsyncStorage.setItem(HEALTH_METRICS_STORAGE_KEY, JSON.stringify(nextMetrics));

  if (user) {
    const nextUser = {
      ...user,
      fitnessGoal: option.storageValue,
      selectedGoal: option.storageValue,
      goal: option.label,
      goalKey: option.key,
      userInfo:
        user.userInfo && typeof user.userInfo === "object"
          ? {
              ...user.userInfo,
              fitnessGoal: option.storageValue,
              selectedGoal: option.storageValue,
              goal: option.label,
              goalKey: option.key,
            }
          : user.userInfo,
    };

    await tokenStorage.saveUser(nextUser);
  }

  queueAccountScopedStorageCloudSync("goal-spine");
  return option.key;
};

const getDayHydration = (day?: GoalSpineDay | null) =>
  toNumber(day?.achieviedHydration ?? day?.achievedHydration);

const getDaySteps = (day?: GoalSpineDay | null) =>
  cleanWalkingSteps(day?.walkingSteps ?? day?.steps ?? day?.stepCount);

const getDayStepGoal = (day?: GoalSpineDay | null) =>
  cleanWalkingSteps(day?.walkingStepGoal ?? day?.stepGoal ?? day?.targetSteps ?? day?.dailyStepGoal) || DEFAULT_STEP_GOAL;

const getMealCount = (day: GoalSpineDay, nutritionReport?: WeeklyNutritionReport | null) => {
  const nutritionScore = nutritionReport?.dailyScores.find((score) => {
    if (score.dayNo && day.dayNo && score.dayNo === day.dayNo) return true;
    return Boolean(score.dateKey && day.date && String(day.date).startsWith(score.dateKey));
  });

  return Math.max(
    Array.isArray(day.meals) ? day.meals.length : 0,
    nutritionScore?.mealCount || 0,
    toNumber(day.achievedCalories) > 0 ? 1 : 0
  );
};

const hasAnyProgress = (day: GoalSpineDay, nutritionReport?: WeeklyNutritionReport | null) =>
  toNumber(day.achievedCalories) > 0 ||
  getDayHydration(day) > 0 ||
  getMealCount(day, nutritionReport) > 0 ||
  getDaySteps(day) > 0 ||
  getExerciseCaloriesBurned(day) > 0 ||
  toNumber(day.exerciseDurationSeconds) > 0;

const hasWorkoutSignal = (day: GoalSpineDay) =>
  getExerciseCaloriesBurned(day) > 0 ||
  toNumber(day.exerciseDurationSeconds) > 0 ||
  (Array.isArray(day.exerciseEntries) && day.exerciseEntries.length > 0);

const getLongestWorkoutStreak = (days: GoalSpineDay[]) => {
  let longest = 0;
  let current = 0;

  days.forEach((day) => {
    if (hasWorkoutSignal(day)) {
      current += 1;
      longest = Math.max(longest, current);
      return;
    }

    current = 0;
  });

  return longest;
};

const buildStats = (
  days: GoalSpineDay[],
  plan: GoalTargetPlan,
  nutritionReport?: WeeklyNutritionReport | null
): GoalSpineStats => {
  const unlockedDays = days.filter((day) => day.status !== "locked");
  const nutritionByDay = new Map(
    (nutritionReport?.dailyScores || []).map((score) => [score.dayNo, score])
  );

  return unlockedDays.reduce<GoalSpineStats>(
    (stats, day) => {
      const calorieProgress = getCalorieTargetProgress(day, "ranges", plan);
      const achievedCalories = toNumber(day.achievedCalories);
      const mealCount = getMealCount(day, nutritionReport);
      const proteinScore = day.dayNo ? nutritionByDay.get(day.dayNo)?.proteinScore : null;
      const stepGoal = getDayStepGoal(day);
      const walkingThreshold = Math.min(5000, Math.max(1500, Math.round(stepGoal * 0.55)));

      stats.trackedDays += hasAnyProgress(day, nutritionReport) ? 1 : 0;
      stats.consistentDays += hasAnyProgress(day, nutritionReport) ? 1 : 0;
      stats.rangeDays += calorieProgress.status === "within" ? 1 : 0;
      stats.calorieFloorDays += calorieProgress.status === "within" || calorieProgress.status === "above" ? 1 : 0;
      stats.aboveRangeDays += calorieProgress.status === "above" ? 1 : 0;
      stats.lowEnergyDays += achievedCalories > 0 && calorieProgress.range.min > 0 && achievedCalories < calorieProgress.range.min * 0.8 ? 1 : 0;
      stats.walkingDays += getDaySteps(day) >= walkingThreshold ? 1 : 0;
      stats.workoutDays += hasWorkoutSignal(day) ? 1 : 0;
      stats.proteinDays += proteinScore !== null && Number(proteinScore) >= 80 ? 1 : 0;
      stats.mealConsistencyDays += mealCount >= 2 || (achievedCalories > 0 && achievedCalories >= calorieProgress.range.min * 0.75) ? 1 : 0;
      return stats;
    },
    {
      totalDays: Math.max(7, unlockedDays.length || days.length || 7),
      trackedDays: 0,
      consistentDays: 0,
      rangeDays: 0,
      calorieFloorDays: 0,
      aboveRangeDays: 0,
      lowEnergyDays: 0,
      walkingDays: 0,
      workoutDays: 0,
      workoutStreak: getLongestWorkoutStreak(unlockedDays),
      proteinDays: 0,
      mealConsistencyDays: 0,
    }
  );
};

const getPrimaryProgress = (goal: GoalSpineKey, stats: GoalSpineStats) => {
  if (goal === "unset") {
    return {
      current: 0,
      target: 1,
      label: "Choose a goal",
      title: "Goal setup",
      body: "Pick Weight Loss, Muscle Gain, or Weight Gain to make weekly progress specific.",
      icon: "flag-outline",
      color: GOAL_OPTIONS.unset.color,
    };
  }

  if (goal === "muscle_gain") {
    return {
      current: stats.workoutDays,
      target: 3,
      label: `${stats.workoutDays}/3 workouts`,
      title: "Weekly goal progress",
      body: `${stats.proteinDays} protein day${stats.proteinDays === 1 ? "" : "s"} logged toward muscle gain.`,
      icon: "barbell-outline",
      color: GOAL_OPTIONS.muscle_gain.color,
    };
  }

  if (goal === "weight_gain") {
    return {
      current: stats.calorieFloorDays,
      target: 5,
      label: `${stats.calorieFloorDays}/5 steady surplus days`,
      title: "Weekly goal progress",
      body: `${stats.mealConsistencyDays} day${stats.mealConsistencyDays === 1 ? "" : "s"} had enough meal rhythm to support gain.`,
      icon: "restaurant-outline",
      color: GOAL_OPTIONS.weight_gain.color,
    };
  }

  return {
    current: stats.rangeDays,
    target: 5,
    label: `${stats.rangeDays}/5 days within range`,
    title: "Weekly goal progress",
    body: `${stats.walkingDays} walking day${stats.walkingDays === 1 ? "" : "s"} are supporting consistency.`,
    icon: "analytics-outline",
    color: GOAL_OPTIONS.weight_loss.color,
  };
};

const buildWeeklyDirection = (goal: GoalSpineKey, stats: GoalSpineStats) => {
  if (goal === "unset" || stats.trackedDays < 2) {
    return {
      label: "Learning from your first logs",
      body: "Add a meal or water log so FitFaat can show a clearer weekly direction.",
    };
  }

  if (goal === "muscle_gain") {
    if (stats.workoutDays >= 3) {
      return { label: "Training rhythm is on track", body: "Workouts are showing up often enough to make protein and recovery useful." };
    }
    if (stats.proteinDays >= 3) {
      return { label: "Protein base is building", body: "Now pair that fuel with a few logged strength sessions." };
    }
    return { label: "Build the strength rhythm", body: "Two or three logged workouts will make this week feel more goal-led." };
  }

  if (goal === "weight_gain") {
    if (stats.calorieFloorDays >= 4) {
      return { label: "Surplus rhythm is building", body: "Meal consistency is giving FitFaat a stable weight-gain signal." };
    }
    if (stats.lowEnergyDays >= 2) {
      return { label: "Fuel is still too low", body: "A planned snack or meal can protect the surplus without pressure." };
    }
    return { label: "Make meals easier to repeat", body: "Consistent eating windows matter more than one oversized meal." };
  }

  if (stats.rangeDays >= 4) {
    return { label: "Range consistency is on track", body: "You are making weight loss easier by repeating healthy-range days." };
  }
  if (stats.aboveRangeDays >= 3) {
    return { label: "Tighten toward range", body: "The useful next step is reducing overage gently, not chasing perfection." };
  }
  return { label: "Build the weekly rhythm", body: "Stay close to range and add a walk when the day starts drifting." };
};

const buildNextAction = (
  goal: GoalSpineKey,
  today: GoalSpineDay | null,
  stats: GoalSpineStats,
  plan: GoalTargetPlan,
  nutritionReport?: WeeklyNutritionReport | null
): GoalSpineSummary["nextAction"] => {
  if (goal === "unset") {
    return {
      title: "Choose your goal",
      body: "Pick Weight Loss, Muscle Gain, or Weight Gain so today has a clear direction.",
      why: "A clear goal lets FitFaat explain targets instead of showing raw numbers.",
      actionLabel: "Review",
      action: "goalReview",
      icon: "flag-outline",
      color: GOAL_OPTIONS.unset.color,
    };
  }

  const calorieProgress = today ? getCalorieTargetProgress(today, "ranges", plan) : null;
  const mealCount = today ? getMealCount(today, nutritionReport) : 0;
  const todayProteinScore = nutritionReport?.todayScore?.proteinScore ?? null;
  const steps = getDaySteps(today);
  const stepGoal = getDayStepGoal(today);
  const hasWorkout = today ? hasWorkoutSignal(today) : false;

  if (goal === "muscle_gain") {
    if (todayProteinScore === null || todayProteinScore < 80) {
      return {
        title: "Log protein with your next meal",
        body: "Make protein visible so FitFaat can judge muscle-gain fuel more fairly.",
        why: "Protein logs help FitFaat connect workouts with recovery instead of guessing.",
        actionLabel: "Log meal",
        action: "meal",
        icon: "nutrition-outline",
        color: GOAL_OPTIONS.muscle_gain.color,
      };
    }

    if (!hasWorkout) {
      return {
        title: "Add one strength session",
        body: "A short logged workout keeps muscle gain tied to training, not just calories.",
        why: "Training logs show FitFaat whether your calorie range is supporting strength.",
        actionLabel: "Workout",
        action: "workout",
        icon: "barbell-outline",
        color: GOAL_OPTIONS.muscle_gain.color,
      };
    }

    return {
      title: "Protect recovery",
      body: "Use a calm reset so tomorrow's workout does not start from stress.",
      why: "Recovery makes protein and workouts easier to repeat across the week.",
      actionLabel: "Breathe",
      action: "mindfulness",
      icon: "leaf-outline",
      color: GOAL_OPTIONS.muscle_gain.color,
    };
  }

  if (goal === "weight_gain") {
    if (!calorieProgress || calorieProgress.status === "below" || mealCount < 2) {
      return {
        title: "Plan the next eating window",
        body: "A simple meal or snack keeps your surplus steady without a late-day scramble.",
        why: "Meal consistency helps FitFaat protect your surplus without guesswork.",
        actionLabel: "Plan meal",
        action: "mealPlanner",
        icon: "basket-outline",
        color: GOAL_OPTIONS.weight_gain.color,
      };
    }

    if (!hasWorkout) {
      return {
        title: "Add strength work",
        body: "Strength gives weight gain a better destination than scale movement alone.",
        why: "Workout logs help FitFaat balance surplus with muscle-building signals.",
        actionLabel: "Workout",
        action: "workout",
        icon: "barbell-outline",
        color: GOAL_OPTIONS.weight_gain.color,
      };
    }

    return {
      title: "Keep the meal rhythm",
      body: `${stats.mealConsistencyDays} steady day${stats.mealConsistencyDays === 1 ? "" : "s"} are already helping.`,
      why: "Repeated meal timing makes realistic weight gain easier to manage.",
      actionLabel: "Log meal",
      action: "meal",
      icon: "restaurant-outline",
      color: GOAL_OPTIONS.weight_gain.color,
    };
  }

  if (!calorieProgress || calorieProgress.status === "below" || mealCount === 0) {
    return {
      title: "Log your next meal",
      body: "A real meal log is more useful than guessing at the end of the day.",
      why: "Logging dinner helps FitFaat adjust tomorrow's calorie range.",
      actionLabel: "Log meal",
      action: "meal",
      icon: "fast-food-outline",
      color: GOAL_OPTIONS.weight_loss.color,
    };
  }

  if (calorieProgress.status === "above" && steps < stepGoal * 0.7) {
    return {
      title: "Take a steady walk",
      body: "Walking helps the day recover without turning food into punishment.",
      why: "Movement gives FitFaat a healthier weight-loss signal than stricter targets.",
      actionLabel: "Steps",
      action: "steps",
      icon: "footsteps-outline",
      color: GOAL_OPTIONS.weight_loss.color,
    };
  }

  return {
    title: "Stay within your healthy range",
    body: "You are close enough for today to count. Consistency matters more than perfection.",
    why: "Healthy-range days help FitFaat manage progress without adding pressure.",
    actionLabel: "Add note",
    action: "note",
    icon: "checkmark-circle-outline",
    color: GOAL_OPTIONS.weight_loss.color,
  };
};

const buildReview = (
  goal: GoalSpineKey,
  stats: GoalSpineStats,
  progress: ReturnType<typeof getPrimaryProgress>
): GoalSpineSummary["review"] => {
  if (goal === "unset" || stats.trackedDays < 2) {
    return {
      status: "learning",
      label: "Learning",
      body: "FitFaat needs a couple of real days before judging the goal.",
      nextStep: goal === "unset" ? "Choose a goal, then log one meal and water entry." : "Log today normally and review again after two tracked days.",
      icon: "sparkles-outline",
      color: "#64748B",
      reasons: [
        `${stats.trackedDays}/2 tracked days available`,
        "Early feedback stays gentle until the pattern is clearer.",
      ],
    };
  }

  if (stats.lowEnergyDays >= 3 || (goal === "muscle_gain" && stats.workoutDays >= 5 && stats.proteinDays <= 1)) {
    return {
      status: "tooAggressive",
      label: "Too aggressive",
      body: "The goal may be asking for more than your current logs can support.",
      nextStep: "Ease the target rhythm, add fuel, or switch goals if this no longer fits.",
      icon: "warning-outline",
      color: "#EF4444",
      reasons: [
        `${stats.lowEnergyDays} low-fuel day${stats.lowEnergyDays === 1 ? "" : "s"} this week`,
        "FitFaat works best when targets feel repeatable.",
      ],
    };
  }

  if (progress.current >= progress.target) {
    return {
      status: "onTrack",
      label: "You are on track",
      body: "Your weekly pattern matches the goal direction.",
      nextStep: "Keep the same rhythm and avoid making the target harder too soon.",
      icon: "checkmark-circle-outline",
      color: "#10B981",
      reasons: [
        `${progress.label} completed`,
        `${stats.consistentDays} consistent day${stats.consistentDays === 1 ? "" : "s"} logged`,
      ],
    };
  }

  return {
    status: "needsAdjustment",
    label: "Needs adjustment",
    body: "The direction is useful, but one key habit needs more support.",
    nextStep: "Use today's next action before changing the target.",
    icon: "construct-outline",
    color: "#F59E0B",
    reasons: [
      `${progress.label} toward this week's focus`,
      `${stats.trackedDays} tracked day${stats.trackedDays === 1 ? "" : "s"} available`,
    ],
  };
};

const buildMilestone = (
  id: string,
  title: string,
  body: string,
  current: number,
  target: number,
  icon: string,
  color: string
): GoalSpineMilestone => {
  const capped = Math.min(current, target);
  return {
    id,
    title,
    body,
    icon,
    color,
    current,
    target,
    progress: clamp((current / target) * 100),
    progressLabel: `${capped}/${target}`,
    unlocked: current >= target,
  };
};

const buildMilestones = (goal: GoalSpineKey, stats: GoalSpineStats) => {
  const option = getGoalSpineOption(goal);
  const milestones = [
    buildMilestone(
      "first-3-consistent-days",
      "First 3 consistent days",
      "Small repeatable days build the goal spine.",
      stats.consistentDays,
      3,
      "repeat-outline",
      "#10B981"
    ),
  ];

  if (goal === "muscle_gain") {
    milestones.push(
      buildMilestone(
        "three-workouts",
        "3 workouts toward muscle gain",
        "Strength sessions make the calorie target meaningful.",
        stats.workoutDays,
        3,
        "barbell-outline",
        option.color
      )
    );
  } else if (goal === "weight_gain") {
    milestones.push(
      buildMilestone(
        "five-surplus-days",
        "Stayed above your floor 5 times",
        "Surplus works best when it is ordinary, not forced.",
        stats.calorieFloorDays,
        5,
        "trending-up-outline",
        option.color
      )
    );
  } else if (goal === "weight_loss") {
    milestones.push(
      buildMilestone(
        "five-range-days",
        "Stayed in range 5 times",
        "Healthy range days count without chasing exact numbers.",
        stats.rangeDays,
        5,
        "analytics-outline",
        option.color
      )
    );
  } else {
    milestones.push(
      buildMilestone(
        "choose-goal",
        "Choose your goal",
        "This unlocks clearer targets, weekly direction, and better next actions.",
        0,
        1,
        "flag-outline",
        option.color
      )
    );
  }

  milestones.push(
    buildMilestone(
      "workout-streak",
      "Workout streak",
      "Training consistency supports every goal.",
      stats.workoutStreak,
      2,
      "flame-outline",
      "#F97316"
    )
  );

  return milestones;
};

export const buildGoalSpineSummary = ({
  goal,
  days,
  today,
  goalDisplayMode,
  plan = "free",
  nutritionReport,
}: {
  goal: unknown;
  days: GoalSpineDay[];
  today?: GoalSpineDay | null;
  goalDisplayMode: GoalDisplayMode;
  plan?: GoalTargetPlan;
  nutritionReport?: WeeklyNutritionReport | null;
}): GoalSpineSummary => {
  const key = normalizeGoalSpineKey(goal);
  const option = getGoalSpineOption(key);
  const visibleDays = days.filter((day) => day.status !== "locked");
  const activeDay =
    today ||
    visibleDays.find((day) => day.status === "active") ||
    visibleDays[visibleDays.length - 1] ||
    null;
  const stats = buildStats(visibleDays, plan, nutritionReport);
  const primary = getPrimaryProgress(key, stats);
  const direction = buildWeeklyDirection(key, stats);
  const nextAction = buildNextAction(key, activeDay, stats, plan, nutritionReport);
  const review = buildReview(key, stats, primary);
  const targetLabel = activeDay ? formatCalorieTarget(activeDay, goalDisplayMode, plan) : "--";
  const targetCaption = goalDisplayMode === "ranges" ? "today's target range" : "today's exact target";

  return {
    goal: option,
    stats,
    todayTargetLabel: `${targetLabel} cal`,
    todayTargetCaption: targetCaption,
    dashboardMessage:
      key === "unset"
        ? "Choose a goal to turn the dashboard into a practical daily plan."
        : `${option.pillars.join(", ")} are the focus. ${option.promise}`,
    weeklyDirectionLabel: direction.label,
    weeklyDirectionBody: direction.body,
    weeklyProgress: {
      title: primary.title,
      value: primary.label,
      body: primary.body,
      icon: primary.icon,
      color: primary.color,
      progress: clamp((primary.current / primary.target) * 100),
    },
    nextAction,
    review,
    milestones: buildMilestones(key, stats),
  };
};

export const runGoalSpineQaCases = () => {
  const sampleDays: GoalSpineDay[] = [
    {
      dayNo: 1,
      status: "finished",
      achievedCalories: 2050,
      targetCalories: 2100,
      targetCaloriesMin: 1950,
      targetCaloriesMax: 2250,
      walkingSteps: 6200,
      meals: [{}, {}],
    },
    {
      dayNo: 2,
      status: "active",
      achievedCalories: 1700,
      targetCalories: 2100,
      targetCaloriesMin: 1950,
      targetCaloriesMax: 2250,
      exerciseCaloriesBurned: 180,
      meals: [{}],
    },
  ];
  const summary = buildGoalSpineSummary({
    goal: "Weight Loss",
    days: sampleDays,
    goalDisplayMode: "ranges",
  });

  return [
    {
      name: "number goal normalizes to weight loss",
      passed: normalizeGoalSpineKey(1) === "weight_loss",
    },
    {
      name: "text goal normalizes to muscle gain",
      passed: normalizeGoalSpineKey("Muscle Gain") === "muscle_gain",
    },
    {
      name: "missing goal uses unset fallback",
      passed: normalizeGoalSpineKey(undefined) === "unset",
    },
    {
      name: "range day counts in weekly progress",
      passed: summary.stats.rangeDays === 1,
    },
    {
      name: "dashboard target respects ranges label",
      passed: summary.todayTargetLabel.includes("-"),
    },
  ];
};
