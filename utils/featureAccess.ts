import { getIsPremiumUser } from "@/utils/premiumAccess";

export type PremiumFeature =
  | "stepsTracking"
  | "mindfulness"
  | "advancedCharts"
  | "mealPlanner"
  | "mealPlannerPro"
  | "groceryAutomation"
  | "nutritionInsights"
  | "coachMissions"
  | "adaptiveGoalsPro"
  | "readinessRecoveryPro"
  | "mindfulnessPro"
  | "heatmapFiltersPro"
  | "reportsExport"
  | "workoutModule"
  | "aiCoach"
  | "appointments"
  | "chatExport"
  | "stepsPro";

export type FeatureAccessSource = "premium" | "free" | "locked";
export type FeatureAccessBadgeTone = "free" | "premium" | "locked" | "unlimited" | "checking";

export type FeatureAccessStatus = {
  feature: PremiumFeature;
  label: string;
  hasAccess: boolean;
  isPremium: boolean;
  accessSource: FeatureAccessSource;
  isLocked: boolean;
  statusLabel: string;
  lockedReason: string;
  upgradeMessage: string;
};

export const FREE_PLAN_LIMITS = {
  aiCoachDailyMessages: 5,
  dailyStepCounterPreview: 500,
  activeDoctorAppointments: 1,
} as const;

export const FREE_FEATURES: PremiumFeature[] = [
  "stepsTracking",
  "mindfulness",
  "advancedCharts",
  "mealPlanner",
];

export const PREMIUM_FEATURES: PremiumFeature[] = [
  "mealPlannerPro",
  "groceryAutomation",
  "nutritionInsights",
  "coachMissions",
  "adaptiveGoalsPro",
  "readinessRecoveryPro",
  "mindfulnessPro",
  "heatmapFiltersPro",
  "reportsExport",
  "aiCoach",
  "stepsPro",
  "workoutModule",
  "appointments",
  "chatExport",
];

export const ALL_FEATURE_ACCESS_KEYS: PremiumFeature[] = [
  "stepsTracking",
  "mindfulness",
  "advancedCharts",
  "mealPlanner",
  ...PREMIUM_FEATURES,
];

export const UNLIMITED_PREMIUM_FEATURES: PremiumFeature[] = [
  "aiCoach",
  "appointments",
];

export const FEATURE_LABELS: Record<PremiumFeature, string> = {
  stepsTracking: "Basic Counter",
  mindfulness: "Core Mindfulness",
  advancedCharts: "Basic Charts",
  mealPlanner: "Basic Meal Planner",
  mealPlannerPro: "Meal Planner Pro",
  groceryAutomation: "Grocery Automation",
  nutritionInsights: "Nutrition Insights",
  coachMissions: "Personal Coach Feed Pro",
  adaptiveGoalsPro: "Adaptive Goals Pro",
  readinessRecoveryPro: "Readiness Recovery Pro",
  mindfulnessPro: "Mindfulness Library Pro",
  heatmapFiltersPro: "Heatmap Filters Pro",
  reportsExport: "Reports Export",
  workoutModule: "Workout Module",
  aiCoach: "Unlimited AI Coach",
  stepsPro: "Steps Pro",
  appointments: "Doctor Bookings",
  chatExport: "Chat History Export",
};

const FEATURE_LOCKED_REASONS: Record<PremiumFeature, string> = {
  stepsTracking:
    `The Basic counter is included free with the ${FREE_PLAN_LIMITS.dailyStepCounterPreview}-step preview. Upgrade to Steps Pro for custom goals, step calories, and weekly trends.`,
  mindfulness:
    "Core mindfulness is included free. Upgrade for the full library, custom timing, and saved session history.",
  advancedCharts:
    "Basic charts are included free. Upgrade for modern analytics, trends, heatmaps, and extended insights.",
  mealPlanner:
    "Basic meal planning is included free. Upgrade for smart plans, macros, notes, and automated grocery lists.",
  mealPlannerPro:
    "Meal Planner Pro is a Premium feature. Upgrade for smart meal plans, macro targets, and richer planning controls.",
  groceryAutomation:
    "Grocery Automation is a Premium feature. Upgrade to build grocery lists automatically from planned meals.",
  nutritionInsights:
    "Nutrition Insights are a Premium feature. Upgrade for deeper score history and progress guidance.",
  coachMissions:
    "Personalized Coach Missions are a Premium feature. Upgrade for richer missions and tailored next actions.",
  adaptiveGoalsPro:
    "Adaptive Goals Pro is a Premium feature. Upgrade for advanced calorie, hydration, and weight adjustment.",
  readinessRecoveryPro:
    "Readiness Recovery Pro is a Premium feature. Upgrade for full recovery cues and workout readiness guidance.",
  mindfulnessPro:
    "Mindfulness Library Pro is a Premium feature. Upgrade for the full library, custom sessions, and saved history.",
  heatmapFiltersPro:
    "Advanced Heatmap Filters are a Premium feature. Upgrade for richer consistency and range filters.",
  reportsExport:
    "Reports Export is a Premium feature. Upgrade to export progress reports.",
  workoutModule:
    "Workout Module is a Premium feature. Upgrade for guided workouts, body-part plans, favorites, recovery maps, and workout history.",
  aiCoach:
    `Free includes ${FREE_PLAN_LIMITS.aiCoachDailyMessages} HeaLora messages each day. Upgrade to Premium for unlimited daily AI coach conversations.`,
  stepsPro:
    `Your Basic counter includes a ${FREE_PLAN_LIMITS.dailyStepCounterPreview}-step daily preview. Upgrade to Steps Pro for custom goals, step calories, and trends.`,
  appointments:
    `Free includes ${FREE_PLAN_LIMITS.activeDoctorAppointments} active appointment at a time. Upgrade to Premium for unlimited active doctor bookings.`,
  chatExport:
    "Chat History Export is a Premium feature. Upgrade to export your HeaLora conversations when you need them.",
};

export const buildFeatureAccessStatusesForPlan = (
  features: PremiumFeature[] = ALL_FEATURE_ACCESS_KEYS,
  isPremium = false
) =>
  features.reduce<Record<PremiumFeature, FeatureAccessStatus>>((acc, feature) => {
    const isFreeFeature = FREE_FEATURES.includes(feature);
    const hasAccess = isPremium || isFreeFeature;

    acc[feature] = {
      feature,
      label: FEATURE_LABELS[feature],
      hasAccess,
      isPremium,
      accessSource: isPremium ? "premium" : isFreeFeature ? "free" : "locked",
      isLocked: !hasAccess,
      statusLabel: isPremium ? "Premium active" : isFreeFeature ? "Free access" : "Premium required",
      lockedReason: FEATURE_LOCKED_REASONS[feature],
      upgradeMessage: "Upgrade to Premium",
    };

    return acc;
  }, {} as Record<PremiumFeature, FeatureAccessStatus>);

export const getFeatureAccessBadge = (
  access?: FeatureAccessStatus | null
): { label: string; tone: FeatureAccessBadgeTone } => {
  if (!access) return { label: "Checking", tone: "checking" };
  if (access.isPremium && UNLIMITED_PREMIUM_FEATURES.includes(access.feature)) {
    return { label: "Unlimited", tone: "unlimited" };
  }
  if (access.accessSource === "premium") return { label: "Premium", tone: "premium" };
  if (access.accessSource === "free") return { label: "Free", tone: "free" };
  return { label: "Locked", tone: "locked" };
};

export const getFeatureAccessStatuses = async (
  features: PremiumFeature[] = ALL_FEATURE_ACCESS_KEYS
) => {
  const isPremium = await getIsPremiumUser();
  return buildFeatureAccessStatusesForPlan(features, isPremium);
};

export const getFeatureAccessStatus = async (feature: PremiumFeature) => {
  const statuses = await getFeatureAccessStatuses([feature]);
  return statuses[feature];
};
