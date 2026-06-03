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
export type FeatureAccessPlanLabel =
  | "Free included"
  | "Free preview"
  | "Premium required"
  | "Premium active"
  | "Unlimited";

export type FeatureAccessStatus = {
  feature: PremiumFeature;
  label: string;
  hasAccess: boolean;
  isPremium: boolean;
  accessSource: FeatureAccessSource;
  isLocked: boolean;
  planLabel: FeatureAccessPlanLabel;
  planDescription: string;
  statusLabel: string;
  lockedReason: string;
  upgradeMessage: string;
};

export type PremiumClarityQaCase = {
  name: string;
  isPremium: boolean;
  feature: PremiumFeature;
  expectedPlanLabel: FeatureAccessPlanLabel;
  expectedHasAccess: boolean;
};

export type PremiumClarityQaResult = PremiumClarityQaCase & {
  actualPlanLabel: FeatureAccessPlanLabel;
  actualHasAccess: boolean;
  passed: boolean;
};

export const FREE_PLAN_LIMITS = {
  aiCoachDailyMessages: 5,
  activeDoctorAppointments: 1,
} as const;

export const FREE_FEATURES: PremiumFeature[] = [
  "stepsTracking",
  "mindfulness",
  "advancedCharts",
  "mealPlanner",
  "mealPlannerPro",
  "groceryAutomation",
  "mindfulnessPro",
  "stepsPro",
];

export const FREE_PREVIEW_FEATURES: PremiumFeature[] = [];

export const PREMIUM_FEATURES: PremiumFeature[] = [
  "nutritionInsights",
  "adaptiveGoalsPro",
  "reportsExport",
  "aiCoach",
  "workoutModule",
  "appointments",
  "chatExport",
];

export const ALL_FEATURE_ACCESS_KEYS: PremiumFeature[] = [
  ...FREE_FEATURES,
  ...PREMIUM_FEATURES,
];

export const UNLIMITED_PREMIUM_FEATURES: PremiumFeature[] = [
  "aiCoach",
  "appointments",
];

export const FEATURE_LABELS: Record<PremiumFeature, string> = {
  stepsTracking: "Step Counter",
  mindfulness: "Mindfulness",
  advancedCharts: "Charts",
  mealPlanner: "Meal Planner",
  mealPlannerPro: "Meal Planner",
  groceryAutomation: "Grocery Lists",
  nutritionInsights: "Nutrition Insights",
  coachMissions: "Personal Coach Feed Pro",
  adaptiveGoalsPro: "Adaptive Goals Pro",
  readinessRecoveryPro: "Readiness Recovery Pro",
  mindfulnessPro: "Mindfulness Library",
  heatmapFiltersPro: "Heatmap Filters Pro",
  reportsExport: "Reports Export",
  workoutModule: "Workout Module",
  aiCoach: "Unlimited AI Coach",
  stepsPro: "Steps",
  appointments: "Doctor Bookings",
  chatExport: "Chat History Export",
};

const FEATURE_LOCKED_REASONS: Record<PremiumFeature, string> = {
  stepsTracking:
    "The Step Counter is included free with real goals, step calories, and weekly trends.",
  mindfulness:
    "Mindfulness is included free with the full library, custom timing, and saved session history.",
  advancedCharts:
    "Charts are included free with modern analytics, trends, and extended insights.",
  mealPlanner:
    "Meal Planner is included free with smart plans, macros, notes, and grocery lists.",
  mealPlannerPro:
    "Meal Planner is included free with smart meal plans, macro targets, and richer planning controls.",
  groceryAutomation:
    "Grocery lists are included free and can be built automatically from planned meals.",
  nutritionInsights:
    "Nutrition Insights are a Premium feature. Upgrade for deeper score history and progress guidance.",
  coachMissions:
    "Personalized Coach Missions are a Premium feature. Upgrade for richer missions and tailored next actions.",
  adaptiveGoalsPro:
    "Adaptive Goals Pro is a Premium feature. Upgrade for advanced calorie, hydration, and weight adjustment.",
  readinessRecoveryPro:
    "Readiness Recovery Pro is a Premium feature. Upgrade for full recovery cues and workout readiness guidance.",
  mindfulnessPro:
    "Mindfulness Library is included free with custom sessions and saved history.",
  heatmapFiltersPro:
    "Advanced Heatmap Filters are a Premium feature. Upgrade for richer consistency and range filters.",
  reportsExport:
    "Reports Export is a Premium feature. Upgrade to export progress reports.",
  workoutModule:
    "Workout Module is a Premium feature. Upgrade for guided workouts, body-part plans, favorites, recovery maps, and workout history.",
  aiCoach:
    `Free includes ${FREE_PLAN_LIMITS.aiCoachDailyMessages} HeaLora messages each day. Upgrade to Premium for unlimited daily AI coach conversations.`,
  stepsPro:
    "Steps are included free with custom goals, step calories, and trends.",
  appointments:
    `Free includes ${FREE_PLAN_LIMITS.activeDoctorAppointments} active appointment at a time. Upgrade to Premium for unlimited active doctor bookings.`,
  chatExport:
    "Chat History Export is a Premium feature. Upgrade to export your HeaLora conversations when you need them.",
};

const FEATURE_FREE_DESCRIPTIONS: Partial<Record<PremiumFeature, string>> = {
  stepsTracking: "Free included: live steps, real goals, step calories, and weekly trends.",
  mindfulness: "Free included: the full mindfulness library, custom timing, and saved session history.",
  advancedCharts: "Free included: modern analytics, trends, and progress interpretation.",
  mealPlanner: "Free included: meal planning, macros, notes, ingredients, and grocery lists.",
  mealPlannerPro: "Free included: smart meal plans, macro targets, and richer planning controls.",
  groceryAutomation: "Free included: grocery lists can be generated from planned meal ingredients.",
  mindfulnessPro: "Free included: the full library, custom sessions, and saved history.",
  stepsPro: "Free included: custom step goals, step calories, and weekly trends.",
};

const getFeaturePlanLabel = (
  feature: PremiumFeature,
  isPremium: boolean,
  isFreeFeature: boolean
): FeatureAccessPlanLabel => {
  if (isPremium && UNLIMITED_PREMIUM_FEATURES.includes(feature)) return "Unlimited";
  if (isPremium) return "Premium active";
  if (isFreeFeature && FREE_PREVIEW_FEATURES.includes(feature)) return "Free preview";
  if (isFreeFeature) return "Free included";
  return "Premium required";
};

export const buildFeatureAccessStatusesForPlan = (
  features: PremiumFeature[] = ALL_FEATURE_ACCESS_KEYS,
  isPremium = false
) =>
  features.reduce<Record<PremiumFeature, FeatureAccessStatus>>((acc, feature) => {
    const isFreeFeature = FREE_FEATURES.includes(feature);
    const hasAccess = isPremium || isFreeFeature;
    const planLabel = getFeaturePlanLabel(feature, isPremium, isFreeFeature);

    acc[feature] = {
      feature,
      label: FEATURE_LABELS[feature],
      hasAccess,
      isPremium,
      accessSource: isPremium ? "premium" : isFreeFeature ? "free" : "locked",
      isLocked: !hasAccess,
      planLabel,
      planDescription: hasAccess
        ? isPremium
          ? `${FEATURE_LABELS[feature]} is active with your Premium Membership.`
          : FEATURE_FREE_DESCRIPTIONS[feature] || `${FEATURE_LABELS[feature]} is included in the Free plan.`
        : FEATURE_LOCKED_REASONS[feature],
      statusLabel: planLabel,
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
  if (access.accessSource === "free") {
    return {
      label: access.planLabel === "Free preview" ? "Preview" : "Free",
      tone: "free",
    };
  }
  return { label: "Locked", tone: "locked" };
};

export const PREMIUM_CLARITY_QA_CASES: PremiumClarityQaCase[] = [
  {
    name: "free user sees step counter as included",
    isPremium: false,
    feature: "stepsTracking",
    expectedPlanLabel: "Free included",
    expectedHasAccess: true,
  },
  {
    name: "free user sees mindfulness as included",
    isPremium: false,
    feature: "mindfulness",
    expectedPlanLabel: "Free included",
    expectedHasAccess: true,
  },
  {
    name: "free user sees full steps as included",
    isPremium: false,
    feature: "stepsPro",
    expectedPlanLabel: "Free included",
    expectedHasAccess: true,
  },
  {
    name: "free user sees advanced charts as included",
    isPremium: false,
    feature: "advancedCharts",
    expectedPlanLabel: "Free included",
    expectedHasAccess: true,
  },
  {
    name: "free user sees full meal planner as included",
    isPremium: false,
    feature: "mealPlannerPro",
    expectedPlanLabel: "Free included",
    expectedHasAccess: true,
  },
  {
    name: "free user sees grocery automation as included",
    isPremium: false,
    feature: "groceryAutomation",
    expectedPlanLabel: "Free included",
    expectedHasAccess: true,
  },
  {
    name: "free user sees Mindfulness Library as included",
    isPremium: false,
    feature: "mindfulnessPro",
    expectedPlanLabel: "Free included",
    expectedHasAccess: true,
  },
  {
    name: "free user sees workout locked with premium reason",
    isPremium: false,
    feature: "workoutModule",
    expectedPlanLabel: "Premium required",
    expectedHasAccess: false,
  },
  {
    name: "free user sees reports export locked",
    isPremium: false,
    feature: "reportsExport",
    expectedPlanLabel: "Premium required",
    expectedHasAccess: false,
  },
  {
    name: "premium user sees workout active without lock copy",
    isPremium: true,
    feature: "workoutModule",
    expectedPlanLabel: "Premium active",
    expectedHasAccess: true,
  },
  {
    name: "premium user sees AI coach as unlimited",
    isPremium: true,
    feature: "aiCoach",
    expectedPlanLabel: "Unlimited",
    expectedHasAccess: true,
  },
  {
    name: "expired premium behaves as free for premium-only export",
    isPremium: false,
    feature: "chatExport",
    expectedPlanLabel: "Premium required",
    expectedHasAccess: false,
  },
];

export const runPremiumClarityQaCases = () =>
  PREMIUM_CLARITY_QA_CASES.map((qaCase) => {
    const access = buildFeatureAccessStatusesForPlan([qaCase.feature], qaCase.isPremium)[qaCase.feature];
    const passed =
      access.planLabel === qaCase.expectedPlanLabel &&
      access.hasAccess === qaCase.expectedHasAccess;

    return {
      ...qaCase,
      actualPlanLabel: access.planLabel,
      actualHasAccess: access.hasAccess,
      passed,
    };
  });

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
