import type { PremiumFeature } from "@/utils/featureAccess";
import {
  getGoalSpineOption,
  normalizeGoalSpineKey,
  type GoalSpineAction,
  type GoalSpineKey,
  type GoalSpineReviewStatus,
  type GoalSpineSummary,
} from "@/utils/goalSpine";

type GoalIconName = string;

export type GoalRecommendationAction = GoalSpineAction;

export type GoalAdjustmentRecommendation = {
  id: string;
  title: string;
  body: string;
  actionLabel: string;
  action: GoalRecommendationAction;
  icon: GoalIconName;
  color: string;
};

export type GoalMealPlannerStatusInput = {
  goal: unknown;
  plannedCalories?: number;
  targetCalories?: number;
  targetCaloriesMin?: number;
  targetCaloriesMax?: number;
  targetLabel?: string | null;
};

export type GoalProgressStatusInput = {
  goal: unknown;
  reviewStatus?: GoalSpineReviewStatus;
  progressPercent?: number;
  rangeStatus?: "below" | "within" | "above" | string | null;
  trackedDays?: number;
};

export type GoalNotificationKind =
  | "meal"
  | "workout"
  | "missedActivity"
  | "goal"
  | "motivation";

export type GoalExperience = {
  key: GoalSpineKey;
  label: string;
  shortLabel: string;
  icon: GoalIconName;
  color: string;
  meal: {
    title: string;
    body: string;
    chips: string[];
    emptyPlan: string;
    emptyGrocery: string;
    editorPremium: string;
    editorFree: string;
    premiumNotice: string;
    groceryTitle: string;
    groceryBody: string;
  };
  workout: {
    title: string;
    body: string;
    recommendationTitle: string;
    recommendationBody: string;
    focusCycle: string[];
    recoverySubtitle: string;
    programSubtitle: string;
    premiumBullets: string[];
  };
  notifications: Record<GoalNotificationKind, string | string[]>;
  premium: {
    headline: string;
    body: string;
    features: Partial<Record<PremiumFeature, string>>;
  };
  progress: {
    onTrack: string;
    needsWork: string;
    tooAggressive: string;
    learning: string;
    withinRange: string;
    belowRange: string;
    aboveRange: string;
  };
};

const BASE_FOCUS_CYCLE = ["Chest", "Back", "Upper Arms", "Waist", "Upper Legs", "Shoulder", "Cardio"];

const GOAL_EXPERIENCE: Record<GoalSpineKey, GoalExperience> = {
  weight_loss: {
    key: "weight_loss",
    label: "Weight Loss",
    shortLabel: "Loss",
    icon: "trending-down-outline",
    color: "#F97316",
    meal: {
      title: "Plan meals that keep the range realistic",
      body: "Use filling meals, lighter snacks, and visible calories so weight loss feels repeatable instead of strict.",
      chips: ["Filling meals", "Calorie range", "Lighter snacks"],
      emptyPlan: "Plan a filling meal that helps you stay within your calorie range.",
      emptyGrocery: "Add groceries that make range-friendly meals easier to repeat.",
      editorPremium: "Macros and ingredients help FitFaat judge your calorie range without guessing.",
      editorFree: "Meal planning, macros, ingredients, notes, and groceries are included.",
      premiumNotice: "Meal planning, macros, ingredients, notes, and grocery automation are included for everyone.",
      groceryTitle: "Range-friendly groceries",
      groceryBody: "Prioritize simple ingredients that make filling meals easy to repeat.",
    },
    workout: {
      title: "Recommended for Weight Loss",
      body: "Pair steady walking or cardio with simple strength so progress is not only about eating less.",
      recommendationTitle: "Walking plus strength",
      recommendationBody: "Cardio helps the day move; strength protects consistency and confidence.",
      focusCycle: ["Cardio", "Upper Legs", "Waist", "Rest", "Cardio", "Back", "Shoulder"],
      recoverySubtitle: "Use recovery to keep walking and strength consistent.",
      programSubtitle: "A weight-loss week balances cardio, legs, core, and light strength.",
      premiumBullets: ["Walking and cardio rhythm", "Strength to support consistency", "History that feeds goal progress"],
    },
    notifications: {
      meal: "A quick meal log keeps your calorie range realistic.",
      workout: "A steady walk or short workout supports today's weight-loss rhythm.",
      missedActivity: "You still have time to protect the basics: one meal log, water, or a short walk.",
      goal: "Stay within your healthy range. Consistency matters more than perfection.",
      motivation: [
        "A range day counts. Keep weight loss repeatable.",
        "One useful log beats end-of-day guessing.",
        "A short walk can steady the day without pressure.",
      ],
    },
    premium: {
      headline: "Premium adds deeper Weight Loss support.",
      body: "Premium adds guided workouts, adaptive goal support, deeper paid insights, exports, and unlimited coaching to your calorie range.",
      features: {
        mealPlannerPro: "Meal planning, macros, and grocery lists are included for everyone.",
        workoutModule: "Use walking, cardio, and strength history as weight-loss progress signals.",
        advancedCharts: "Charts and weekly interpretation are included for everyone.",
        nutritionInsights: "See deeper blockers, helpers, and adjustment guidance for the week.",
        adaptiveGoalsPro: "Adjust calorie, hydration, and activity targets with richer weekly guidance.",
        aiCoach: "Ask for lower-pressure swaps when a day starts drifting above range.",
        reportsExport: "Share calorie range consistency, hydration, walking, and workouts in one report.",
      },
    },
    progress: {
      onTrack: "On track for Weight Loss",
      needsWork: "Needs more range consistency",
      tooAggressive: "Weight-loss pressure may be too high",
      learning: "Learning your weight-loss rhythm",
      withinRange: "Within healthy range",
      belowRange: "Still building toward range",
      aboveRange: "Above range, adjust gently",
    },
  },
  muscle_gain: {
    key: "muscle_gain",
    label: "Muscle Gain",
    shortLabel: "Muscle",
    icon: "barbell-outline",
    color: "#10B981",
    meal: {
      title: "Build meals around protein and recovery",
      body: "Protein-first meals, workout fuel, and steady calories give muscle gain a clearer growth signal.",
      chips: ["Protein first", "Workout fuel", "Recovery"],
      emptyPlan: "Plan a protein-first meal that supports your next strength session.",
      emptyGrocery: "Add protein staples and recovery-friendly ingredients.",
      editorPremium: "Macros help FitFaat connect protein, calories, workouts, and recovery.",
      editorFree: "Meal planning, macros, ingredients, notes, and groceries are included.",
      premiumNotice: "Meal planning, macros, ingredients, notes, and grocery automation are included for everyone.",
      groceryTitle: "Protein and recovery groceries",
      groceryBody: "Stock easy protein options and carbs that help workouts feel repeatable.",
    },
    workout: {
      title: "Recommended for Muscle Gain",
      body: "Strength sessions matter most. Pair them with protein and recovery so calories turn into training support.",
      recommendationTitle: "Strength plus recovery",
      recommendationBody: "Choose a focused lift today, then protect recovery before the next session.",
      focusCycle: ["Chest", "Back", "Upper Arms", "Rest", "Upper Legs", "Shoulder", "Waist"],
      recoverySubtitle: "Plan around tired muscles so strength work stays productive.",
      programSubtitle: "A muscle-gain week rotates strength focus with planned recovery.",
      premiumBullets: ["Strength split calendar", "Recovery map from workout history", "Training signals for goal review"],
    },
    notifications: {
      meal: "Protein plus training gives FitFaat a clearer growth signal.",
      workout: "A logged strength session keeps muscle gain tied to training, not only calories.",
      missedActivity: "One protein log or short lift can still support today's muscle-gain signal.",
      goal: "Muscle gain needs protein, workouts, and recovery working together.",
      motivation: [
        "Protein, training, recovery. Keep the signal clear.",
        "A short logged lift still counts toward the muscle-gain week.",
        "Recovery is part of the plan, not a break from it.",
      ],
    },
    premium: {
      headline: "Premium turns Muscle Gain into a connected training plan.",
      body: "Premium links guided workouts, recovery, adaptive support, deeper paid insights, exports, and unlimited coaching so growth signals are easier to act on.",
      features: {
        mealPlannerPro: "Meal planning, macros, and grocery lists are included for everyone.",
        workoutModule: "Use guided training, favorites, history, and recovery maps to build rhythm.",
        advancedCharts: "Charts and weekly interpretation are included for everyone.",
        nutritionInsights: "See deeper blockers, helpers, and adjustment guidance for the week.",
        adaptiveGoalsPro: "Adjust calorie, protein, hydration, and training targets with richer weekly guidance.",
        aiCoach: "Ask for protein ideas, workout focus, and recovery support when progress stalls.",
        reportsExport: "Share protein, workout, calories, hydration, and recovery progress together.",
      },
    },
    progress: {
      onTrack: "On track for Muscle Gain",
      needsWork: "Needs more protein/workout signal",
      tooAggressive: "Muscle-gain load may be too aggressive",
      learning: "Learning your muscle-gain rhythm",
      withinRange: "Fuel is in a useful range",
      belowRange: "Fuel still looks low",
      aboveRange: "Fuel is high, pair it with training",
    },
  },
  weight_gain: {
    key: "weight_gain",
    label: "Weight Gain",
    shortLabel: "Gain",
    icon: "trending-up-outline",
    color: "#0EA5E9",
    meal: {
      title: "Make surplus meals easy to repeat",
      body: "Consistent meals, surplus-friendly snacks, and easy calories make weight gain feel planned.",
      chips: ["Meal rhythm", "Surplus snacks", "Strength"],
      emptyPlan: "Plan a simple meal or snack that protects today's surplus.",
      emptyGrocery: "Add easy calorie and protein staples for repeatable meals.",
      editorPremium: "Macros and notes help FitFaat see whether your surplus is realistic.",
      editorFree: "Meal planning, macros, ingredients, notes, and groceries are included.",
      premiumNotice: "Meal planning, macros, ingredients, notes, and grocery automation are included for everyone.",
      groceryTitle: "Surplus-friendly groceries",
      groceryBody: "Keep easy meals and snacks ready so weight gain does not depend on one huge meal.",
    },
    workout: {
      title: "Recommended for Weight Gain",
      body: "Strength gives weight gain a better destination than scale movement alone.",
      recommendationTitle: "Strength-first surplus",
      recommendationBody: "Pick a strength focus and keep recovery steady so extra calories have a job.",
      focusCycle: ["Upper Legs", "Chest", "Back", "Rest", "Shoulder", "Upper Arms", "Waist"],
      recoverySubtitle: "Use recovery to keep strength work productive while eating more consistently.",
      programSubtitle: "A weight-gain week favors strength with enough rest to repeat the surplus.",
      premiumBullets: ["Strength-first plan", "Recovery cues from history", "Workout signals for surplus review"],
    },
    notifications: {
      meal: "A planned snack helps protect today's surplus.",
      workout: "Strength work gives your weight-gain surplus a better destination.",
      missedActivity: "A meal, snack, or strength log can still protect today's weight-gain rhythm.",
      goal: "Meal consistency and strength make weight gain feel planned.",
      motivation: [
        "A small planned snack can protect the surplus.",
        "Strength gives weight gain a direction.",
        "Repeatable meals beat forcing one oversized plate.",
      ],
    },
    premium: {
      headline: "Premium adds deeper Weight Gain support.",
      body: "Premium adds guided strength work, adaptive support, deeper paid insights, exports, and unlimited coaching.",
      features: {
        mealPlannerPro: "Meal planning, macros, and grocery lists are included for everyone.",
        workoutModule: "Use strength workouts and recovery history to guide healthy weight gain.",
        advancedCharts: "Charts and weekly interpretation are included for everyone.",
        nutritionInsights: "See deeper blockers, helpers, and adjustment guidance for the week.",
        adaptiveGoalsPro: "Adjust calorie, hydration, and strength targets with richer weekly guidance.",
        aiCoach: "Ask for easy calorie ideas and appetite-friendly meal options.",
        reportsExport: "Share surplus consistency, strength work, hydration, and weekly progress.",
      },
    },
    progress: {
      onTrack: "On track for Weight Gain",
      needsWork: "Needs more meal consistency",
      tooAggressive: "Weight-gain pace may be too aggressive",
      learning: "Learning your weight-gain rhythm",
      withinRange: "Surplus rhythm is steady",
      belowRange: "Still below your calorie floor",
      aboveRange: "Above planned surplus",
    },
  },
  unset: {
    key: "unset",
    label: "Choose your goal",
    shortLabel: "Goal",
    icon: "flag-outline",
    color: "#64748B",
    meal: {
      title: "Choose a goal to personalize planning",
      body: "FitFaat can make meal planning more specific once you choose Weight Loss, Muscle Gain, or Weight Gain.",
      chips: ["Direction", "Targets", "Next action"],
      emptyPlan: "Plan one useful meal, then choose a goal for clearer guidance.",
      emptyGrocery: "Add staples you can use for simple meals.",
      editorPremium: "Macros and notes become more useful once a goal is selected.",
      editorFree: "Meal planning, macros, ingredients, notes, and groceries are included.",
      premiumNotice: "Meal planning, macros, ingredients, notes, and grocery automation are included for everyone.",
      groceryTitle: "Flexible groceries",
      groceryBody: "Start with simple staples while FitFaat waits for your goal.",
    },
    workout: {
      title: "Choose a goal for better workouts",
      body: "FitFaat can recommend cardio, strength, or recovery emphasis after you pick a goal.",
      recommendationTitle: "Start with consistency",
      recommendationBody: "A short session is enough to give FitFaat a useful training signal.",
      focusCycle: BASE_FOCUS_CYCLE,
      recoverySubtitle: "Plan around muscles you trained recently.",
      programSubtitle: "A balanced 4-week training view with rest and completion badges.",
      premiumBullets: ["Guided workouts", "Recovery map", "Workout history"],
    },
    notifications: {
      meal: "Log one meal so FitFaat can make your goal plan clearer.",
      workout: "A short workout gives FitFaat a useful activity signal.",
      missedActivity: "One meal, water, or activity log is enough to keep the week readable.",
      goal: "Choose a goal so FitFaat can turn numbers into a plan.",
      motivation: [
        "One useful log gives FitFaat a clearer starting point.",
        "Choose a goal when you are ready for more specific guidance.",
        "Small repeatable actions make the app smarter.",
      ],
    },
    premium: {
      headline: "Premium gets stronger once your goal is selected.",
      body: "Choose a goal to connect guided workouts, deeper paid insights, exports, adaptive support, and unlimited coaching.",
      features: {
        mealPlannerPro: "Meal planning, macros, and grocery lists are included for everyone.",
        workoutModule: "Use guided workouts, body-part plans, favorites, and history.",
        advancedCharts: "Charts and weekly interpretation are included for everyone.",
        nutritionInsights: "Turn progress numbers into deeper weekly guidance.",
        adaptiveGoalsPro: "Adjust calorie, hydration, and activity targets with richer weekly guidance.",
        aiCoach: "Ask for more specific help once your goal is selected.",
        reportsExport: "Share progress reports across food, water, workouts, and walking.",
      },
    },
    progress: {
      onTrack: "Choose a goal to define on track",
      needsWork: "Choose a goal for clearer progress",
      tooAggressive: "Goal pressure is unclear",
      learning: "Learning from your first logs",
      withinRange: "Useful progress logged",
      belowRange: "Still building progress",
      aboveRange: "Progress needs context",
    },
  },
};

export const getGoalExperience = (goal: unknown): GoalExperience =>
  GOAL_EXPERIENCE[normalizeGoalSpineKey(goal)];

export const getGoalNotificationCopy = (
  goal: unknown,
  kind: GoalNotificationKind
): string => {
  const copy = getGoalExperience(goal).notifications[kind];
  if (Array.isArray(copy)) {
    return copy[new Date().getHours() % copy.length] || copy[0] || "";
  }
  return copy;
};

export const getGoalMotivationQuotes = (goal: unknown): string[] => {
  const copy = getGoalExperience(goal).notifications.motivation;
  return Array.isArray(copy) ? copy : [copy];
};

export const getGoalPremiumFeatureCopy = (
  goal: unknown,
  feature: PremiumFeature
) => {
  const experience = getGoalExperience(goal);
  return experience.premium.features[feature] || experience.premium.body;
};

export const getGoalProgressStatusLabel = ({
  goal,
  reviewStatus,
  progressPercent,
  rangeStatus,
  trackedDays,
}: GoalProgressStatusInput) => {
  const experience = getGoalExperience(goal);
  if (rangeStatus === "within") return experience.progress.withinRange;
  if (rangeStatus === "below") return experience.progress.belowRange;
  if (rangeStatus === "above") return experience.progress.aboveRange;
  if (reviewStatus === "onTrack") return experience.progress.onTrack;
  if (reviewStatus === "tooAggressive") return experience.progress.tooAggressive;
  if (reviewStatus === "learning" || (trackedDays !== undefined && trackedDays < 2)) {
    return experience.progress.learning;
  }
  if (reviewStatus === "needsAdjustment") return experience.progress.needsWork;
  if (typeof progressPercent === "number" && progressPercent >= 80) return experience.progress.onTrack;
  if (typeof progressPercent === "number" && progressPercent > 0) return experience.progress.needsWork;
  return experience.progress.learning;
};

export const buildGoalMealPlannerStatus = ({
  goal,
  plannedCalories = 0,
  targetCalories,
  targetCaloriesMin,
  targetCaloriesMax,
  targetLabel,
}: GoalMealPlannerStatusInput) => {
  const key = normalizeGoalSpineKey(goal);
  const experience = getGoalExperience(key);
  const min = Number(targetCaloriesMin || targetCalories || 0);
  const max = Number(targetCaloriesMax || targetCalories || 0);
  const hasTarget = min > 0 || max > 0;
  const hasPlannedCalories = plannedCalories > 0;
  const targetText = targetLabel ? ` Target: ${targetLabel} cal.` : "";

  if (!hasTarget || !hasPlannedCalories) {
    return {
      label: experience.meal.title,
      body: `${experience.meal.body}${targetText}`,
      tone: "neutral" as const,
    };
  }

  if (min > 0 && plannedCalories < min) {
    const label = key === "weight_loss" ? "Room left in your range" : experience.progress.belowRange;
    const body =
      key === "weight_loss"
        ? "Your plan is still below the range floor. Add enough real food so the day stays realistic."
        : "Planned calories are below the target floor. Add a meal or snack to protect the goal.";
    return { label, body: `${body}${targetText}`, tone: "warning" as const };
  }

  if (max > 0 && plannedCalories > max) {
    const label = experience.progress.aboveRange;
    const body =
      key === "weight_loss"
        ? "This plan is above the range. Consider a filling swap instead of tightening the whole day."
        : "This plan is above the current target. Keep it intentional and pair it with the right training rhythm.";
    return { label, body: `${body}${targetText}`, tone: "warning" as const };
  }

  return {
    label: experience.progress.withinRange,
    body: `Planned calories are aligned with ${experience.label}. ${key === "muscle_gain" ? "Check protein next." : "Keep this repeatable."}${targetText}`,
    tone: "good" as const,
  };
};

export const buildGoalAdjustmentRecommendations = (
  summary: GoalSpineSummary
): GoalAdjustmentRecommendation[] => {
  const goal = normalizeGoalSpineKey(summary.goal.key);
  const experience = getGoalExperience(goal);
  const status = summary.review.status;
  const recommendations: GoalAdjustmentRecommendation[] = [];

  if (status === "onTrack") {
    recommendations.push({
      id: "keep-plan",
      title: "Keep the plan",
      body: "Your current rhythm is working. Hold the target steady before making it harder.",
      actionLabel: "Review goal",
      action: "goalReview",
      icon: "checkmark-circle-outline",
      color: "#10B981",
    });
  }

  if (status === "tooAggressive") {
    recommendations.push({
      id: "reduce-pressure",
      title: "Reduce pressure",
      body: "The goal may need a gentler rhythm. Review the goal before adding stricter targets.",
      actionLabel: "Change goal",
      action: "goalReview",
      icon: "warning-outline",
      color: "#EF4444",
    });
  }

  if (goal === "muscle_gain") {
    recommendations.push({
      id: "prioritize-protein",
      title: "Prioritize protein",
      body: "Protein logs make muscle-gain feedback fairer and connect food with training.",
      actionLabel: "Log meal",
      action: "meal",
      icon: "nutrition-outline",
      color: experience.color,
    });
    recommendations.push({
      id: "add-strength",
      title: "Add strength sessions",
      body: "Two or three logged workouts give the week a real muscle-building signal.",
      actionLabel: "Workout",
      action: "workout",
      icon: "barbell-outline",
      color: experience.color,
    });
  } else if (goal === "weight_gain") {
    recommendations.push({
      id: "add-meal-consistency",
      title: "Add meal consistency",
      body: "Plan the next eating window so your surplus does not depend on a late-day scramble.",
      actionLabel: "Plan meal",
      action: "mealPlanner",
      icon: "basket-outline",
      color: experience.color,
    });
    recommendations.push({
      id: "add-strength",
      title: "Add strength sessions",
      body: "Strength gives the surplus a better destination than scale movement alone.",
      actionLabel: "Workout",
      action: "workout",
      icon: "barbell-outline",
      color: experience.color,
    });
  } else if (goal === "weight_loss") {
    recommendations.push({
      id: "stay-in-range",
      title: "Stay within your healthy range",
      body: "Range days count without chasing exact numbers. Log the next meal before guessing.",
      actionLabel: "Log meal",
      action: "meal",
      icon: "fast-food-outline",
      color: experience.color,
    });
    recommendations.push({
      id: "add-walk",
      title: "Add a steady walk",
      body: "Walking supports weight loss without turning food into punishment.",
      actionLabel: "Steps",
      action: "steps",
      icon: "footsteps-outline",
      color: "#22C55E",
    });
  } else {
    recommendations.push({
      id: "choose-goal",
      title: "Choose your goal",
      body: "Pick Weight Loss, Muscle Gain, or Weight Gain so FitFaat can judge progress clearly.",
      actionLabel: "Choose goal",
      action: "goalReview",
      icon: "flag-outline",
      color: experience.color,
    });
  }

  return recommendations.slice(0, 3);
};

export const runGoalExperienceQaCases = () => {
  const muscle = getGoalExperience("Muscle Gain");
  const weightGainStatus = buildGoalMealPlannerStatus({
    goal: "weight_gain",
    plannedCalories: 1200,
    targetCaloriesMin: 2200,
    targetCaloriesMax: 2500,
  });
  const premiumCopy = getGoalPremiumFeatureCopy("weight_loss", "workoutModule");

  return [
    {
      name: "all goal keys have experience copy",
      passed: (["weight_loss", "muscle_gain", "weight_gain", "unset"] as GoalSpineKey[])
        .every((key) => getGoalExperience(key).label.length > 0),
    },
    {
      name: "muscle gain workout cycle prioritizes strength",
      passed: muscle.workout.focusCycle.includes("Chest") && muscle.workout.focusCycle.includes("Upper Legs"),
    },
    {
      name: "meal planner status detects below range",
      passed: weightGainStatus.label.toLowerCase().includes("below"),
    },
    {
      name: "notification copy changes by goal",
      passed: getGoalNotificationCopy("weight_gain", "meal").includes("surplus"),
    },
    {
      name: "premium workout copy is goal-specific",
      passed: premiumCopy.toLowerCase().includes("weight-loss progress"),
    },
    {
      name: "progress status labels use goal language",
      passed: getGoalProgressStatusLabel({ goal: 2, progressPercent: 90 }).includes("Muscle Gain"),
    },
    {
      name: "goal option compatibility remains intact",
      passed: getGoalSpineOption("Weight Loss").key === "weight_loss",
    },
  ];
};
