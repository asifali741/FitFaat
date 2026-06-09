import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  buildCalorieTargetRange,
  buildHydrationTargetRange,
} from "@/utils/goalTargetDisplay";

type DayStatus = "locked" | "active" | "finished";
type GapDirection = "missed" | "exceeded" | "onTarget" | "unknown";
type GapSeverity = "none" | "low" | "medium" | "high" | "critical";
type NudgePriority = "silent" | "low" | "medium" | "high";
type WeightTrendStatus = "collecting" | "onTrack" | "adjusting";
type WeightTrendGoalDirection = "weightLoss" | "muscleGain" | "weightGain" | "maintenance";
type ActivityLevelKey = "sedentary" | "light" | "moderate" | "active" | "veryActive";
type GoalPace = "slow" | "standard" | "aggressive";
type WorkoutIntensity = "low" | "moderate" | "high";

export type AdaptiveGoalDay = {
  _id?: string;
  dayNo?: number;
  dayNumber?: number;
  date?: string;
  achievedCalories?: number;
  achievedHydration?: number;
  achieviedHydration?: number;
  exerciseCaloriesBurned?: number;
  exerciseCalories?: number;
  exerciseCaloriesBurnt?: number;
  caloriesBurnedFromExercise?: number;
  exerciseBurnedCalories?: number;
  walkingCaloriesBurned?: number;
  stepCaloriesBurned?: number;
  walkingCalories?: number;
  caloriesBurnedFromWalking?: number;
  baseTargetCalories?: number;
  baseTargetHydration?: number;
  defaultTargetCalories?: number;
  defaultTargetHydration?: number;
  targetCalories?: number;
  targetHydration?: number;
  targetCaloriesMin?: number;
  targetCaloriesMax?: number;
  targetHydrationMin?: number;
  targetHydrationMax?: number;
  calibratedTargetCalories?: number;
  idealTargetCalories?: number;
  idealTargetHydration?: number;
  weightTrendCaloriesAdjustment?: number;
  weightTrendExpectedKgPerWeek?: number;
  weightTrendObservedKgPerWeek?: number;
  weightTrendConfidence?: number;
  weightTrendStatus?: WeightTrendStatus;
  weightTrendMessage?: string;
  weightTrendGoalDirection?: WeightTrendGoalDirection;
  behaviorCaloriesAdjustment?: number;
  behaviorHydrationAdjustment?: number;
  adaptiveCaloriesAdjustment?: number;
  adaptiveHydrationAdjustment?: number;
  recentConsistencyScore?: number;
  missedDayCount?: number;
  activityLevelHydrationAdjustment?: number;
  calorieGap?: number;
  hydrationGap?: number;
  calorieGoalDirection?: GapDirection;
  nutritionGapSeverity?: GapSeverity;
  hydrationRiskScore?: number;
  recoveryNeedScore?: number;
  goalRiskScore?: number;
  nudgePriority?: NudgePriority;
  nudgeReason?: string;
  status?: DayStatus | string;
};

export type AdaptiveGoalMetrics = {
  height?: number;
  weight?: number;
  age?: number;
  gender?: "male" | "female" | "other" | string;
  activityLevel?: ActivityLevelKey | string;
  fitnessGoal?: 1 | 2 | 3 | number | string;
  goalPace?: GoalPace | string;
  weeklyWorkoutDays?: number;
  dailySteps?: number;
  stepGoal?: number;
  bodyFatPercentage?: number;
  targetWeight?: number;
  workoutIntensity?: WorkoutIntensity | string;
  sleepHours?: number;
};

export type AdaptiveGoalPlan = "free" | "premium";

export type WeightTrendLogEntry = {
  dateKey: string;
  loggedAt: string;
  weightKg: number;
  sourceUserId?: string;
  sourceWeeklyTrackingId?: string | null;
};

export type WeeklyWeightTrendCalibration = {
  status: WeightTrendStatus;
  goalDirection: WeightTrendGoalDirection;
  confidence: number;
  observedKgPerWeek: number;
  expectedKgPerWeek: number;
  calorieAdjustment: number;
  nutritionAdherenceScore: number;
  weightLogCount: number;
  spanDays: number;
  message: string;
};

export type AdaptiveGoalOptions = {
  plan?: AdaptiveGoalPlan;
  weightTrendCalibration?: WeeklyWeightTrendCalibration | null;
};

export const HEALTH_METRICS_STORAGE_KEY = "fitfaat_health_metrics";
export const WEIGHT_TREND_LOGS_STORAGE_KEY = "fitfaat_weight_logs";

type CalorieGoalKey = 1 | 2 | 3 | "default";

type GoalAdjustmentConfig = {
  ratio: number;
  min: number;
  max: number;
};

const DEFAULT_CALORIE_MIN = 1200;
const MALE_CALORIE_MIN = 1500;
const OTHER_CALORIE_MIN = 1300;
const CALORIE_MAX = 6000;
const HYDRATION_MIN = 1.2;
const HYDRATION_MAX = 5.5;
const CALORIE_GAP_NOISE_BAND = 75;
const MIN_MEANINGFUL_FOOD_LOG = 400;
const DAY_MS = 24 * 60 * 60 * 1000;
const WEIGHT_TREND_LOOKBACK_DAYS = 35;
const WEIGHT_TREND_MIN_SPAN_DAYS = 6;
const WEIGHT_TREND_MAX_LOGS = 120;

const ACTIVITY_LEVELS: ActivityLevelKey[] = [
  "sedentary",
  "light",
  "moderate",
  "active",
  "veryActive",
];

const ACTIVITY_LEVEL_RANK = ACTIVITY_LEVELS.reduce(
  (acc, level, index) => ({ ...acc, [level]: index }),
  {} as Record<ActivityLevelKey, number>
);

const ACTIVITY_MULTIPLIERS: Record<ActivityLevelKey, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  veryActive: 1.9,
};

const FREE_GOAL_PACE_ADJUSTMENTS: Record<
  1 | 2 | 3,
  Record<GoalPace, GoalAdjustmentConfig>
> = {
  1: {
    slow: { ratio: 0.12, min: 175, max: 400 },
    standard: { ratio: 0.16, min: 225, max: 550 },
    aggressive: { ratio: 0.18, min: 250, max: 650 },
  },
  2: {
    slow: { ratio: 0.06, min: 125, max: 225 },
    standard: { ratio: 0.08, min: 150, max: 300 },
    aggressive: { ratio: 0.1, min: 175, max: 350 },
  },
  3: {
    slow: { ratio: 0.08, min: 200, max: 300 },
    standard: { ratio: 0.11, min: 250, max: 425 },
    aggressive: { ratio: 0.14, min: 300, max: 500 },
  },
};

const PREMIUM_GOAL_PACE_ADJUSTMENTS: Record<
  1 | 2 | 3,
  Record<GoalPace, GoalAdjustmentConfig>
> = {
  1: {
    slow: { ratio: 0.16, min: 225, max: 600 },
    standard: { ratio: 0.2, min: 250, max: 750 },
    aggressive: { ratio: 0.23, min: 300, max: 900 },
  },
  2: {
    slow: { ratio: 0.07, min: 125, max: 275 },
    standard: { ratio: 0.1, min: 150, max: 350 },
    aggressive: { ratio: 0.12, min: 200, max: 450 },
  },
  3: {
    slow: { ratio: 0.11, min: 225, max: 400 },
    standard: { ratio: 0.15, min: 250, max: 500 },
    aggressive: { ratio: 0.18, min: 325, max: 650 },
  },
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

const firstValue = (...values: unknown[]) => {
  for (const value of values) {
    if (value !== undefined && value !== null && value !== "") return value;
  }

  return undefined;
};

const firstText = (...values: unknown[]) => {
  const value = firstValue(...values);
  return value === undefined ? undefined : String(value);
};

const normalizePercentage = (value: unknown) => {
  const percentage = toNumber(value);
  if (percentage <= 0) return 0;
  if (percentage > 0 && percentage <= 1) return percentage * 100;
  return percentage <= 75 ? percentage : 0;
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const roundCalories = (value: unknown) => Math.round(toNumber(value));

const roundHydration = (value: number) => Math.round(value * 10) / 10;

const roundWeightTrend = (value: number) => Math.round(value * 100) / 100;

const roundToNearest = (value: number, nearest: number) =>
  Math.round(value / nearest) * nearest;

const getLocalDateKey = (value?: string | Date | null) => {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return "";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getDateKeyTime = (dateKey?: string) => {
  if (!dateKey) return 0;
  const parsed = new Date(`${dateKey}T12:00:00`);
  return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
};

const normalizeGoal = (goal?: AdaptiveGoalMetrics["fitnessGoal"]) => {
  if (typeof goal === "number") return goal;
  if (typeof goal === "string") {
    const normalized = goal.trim().toLowerCase();
    if (normalized === "1" || normalized.includes("loss")) return 1;
    if (normalized === "2" || normalized.includes("muscle")) return 2;
    if (normalized === "3" || normalized.includes("gain")) return 3;
  }

  return 0;
};

const getCalorieGoalKey = (goal?: AdaptiveGoalMetrics["fitnessGoal"]): CalorieGoalKey => {
  const normalizedGoal = normalizeGoal(goal);
  return normalizedGoal === 1 || normalizedGoal === 2 || normalizedGoal === 3
    ? normalizedGoal
    : "default";
};

const getCalorieGapTier = (gap: number) => {
  const absoluteGap = Math.abs(gap);
  if (absoluteGap < CALORIE_GAP_NOISE_BAND) return -1;
  if (absoluteGap < 200) return 0;
  if (absoluteGap < 450) return 1;
  if (absoluteGap < 750) return 2;
  return 3;
};

const getGapSeverity = (gap: number): GapSeverity => {
  const tier = getCalorieGapTier(gap);
  if (tier < 0) return "none";
  if (tier === 0) return "low";
  if (tier === 1) return "medium";
  if (tier === 2) return "high";
  return "critical";
};

const getNudgePriority = (
  riskScore: number,
  calorieAdjustment: number,
  hydrationAdjustment: number
): NudgePriority => {
  const pressure = Math.max(
    riskScore,
    Math.min(100, Math.round(Math.abs(calorieAdjustment) / 4)),
    Math.min(100, Math.round(Math.abs(hydrationAdjustment) * 45))
  );

  if (pressure >= 72) return "high";
  if (pressure >= 45) return "medium";
  if (pressure >= 18) return "low";
  return "silent";
};

const normalizeGender = (gender?: AdaptiveGoalMetrics["gender"]) => {
  const normalized = String(gender || "").trim().toLowerCase();
  if (normalized === "female") return "female";
  if (normalized === "male") return "male";
  return "other";
};

const normalizeActivityLevel = (
  activityLevel?: AdaptiveGoalMetrics["activityLevel"]
): ActivityLevelKey => {
  const normalized = String(activityLevel || "sedentary")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]/g, "");

  if (normalized === "veryactive") return "veryActive";
  if (normalized === "active") return "active";
  if (normalized === "moderate" || normalized === "moderatelyactive") return "moderate";
  if (normalized === "light" || normalized === "lightlyactive") return "light";
  return "sedentary";
};

const normalizeGoalPace = (value?: unknown): GoalPace | null => {
  const normalized = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]/g, "");

  if (!normalized) return null;
  if (
    normalized === "slow" ||
    normalized === "easy" ||
    normalized === "gentle" ||
    normalized === "conservative"
  ) {
    return "slow";
  }
  if (
    normalized === "aggressive" ||
    normalized === "fast" ||
    normalized === "hard" ||
    normalized === "rapid"
  ) {
    return "aggressive";
  }
  if (
    normalized === "standard" ||
    normalized === "moderate" ||
    normalized === "normal" ||
    normalized === "balanced"
  ) {
    return "standard";
  }

  return null;
};

const normalizeWorkoutIntensity = (value?: unknown): WorkoutIntensity => {
  const normalized = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]/g, "");

  if (
    normalized === "high" ||
    normalized === "hard" ||
    normalized === "intense" ||
    normalized === "heavy"
  ) {
    return "high";
  }

  if (
    normalized === "moderate" ||
    normalized === "medium" ||
    normalized === "normal"
  ) {
    return "moderate";
  }

  return "low";
};

const normalizeHeightCm = (value: unknown) => {
  const height = toNumber(value);
  if (height <= 0) return 0;

  if (height < 10) {
    return height * 30.48;
  }

  if (height < 100) {
    return height * 2.54;
  }

  return height;
};

const getBmiFromMetrics = (metrics?: Pick<AdaptiveGoalMetrics, "height" | "weight"> | null) => {
  const heightCm = normalizeHeightCm(metrics?.height);
  const weightKg = toNumber(metrics?.weight);
  if (heightCm <= 0 || weightKg <= 0) return 0;

  const heightMeters = heightCm / 100;
  return weightKg / (heightMeters * heightMeters);
};

const inferActivityLevelFromMovement = (
  metrics?: Pick<
    AdaptiveGoalMetrics,
    "dailySteps" | "weeklyWorkoutDays" | "workoutIntensity"
  > | null
): ActivityLevelKey => {
  const dailySteps = toNumber(metrics?.dailySteps);
  const workoutDays = toNumber(metrics?.weeklyWorkoutDays);
  const workoutIntensity = normalizeWorkoutIntensity(metrics?.workoutIntensity);

  if (dailySteps >= 15000 && workoutDays >= 5 && workoutIntensity === "high") {
    return "veryActive";
  }
  if (dailySteps >= 15000 && workoutDays >= 5) return "veryActive";
  if (
    dailySteps >= 11000 ||
    workoutDays >= 5 ||
    (workoutDays >= 4 && workoutIntensity === "high")
  ) {
    return "active";
  }
  if (
    dailySteps >= 7500 ||
    workoutDays >= 3 ||
    (workoutDays >= 2 && workoutIntensity !== "low")
  ) {
    return "moderate";
  }
  if (dailySteps >= 4500 || workoutDays >= 1) return "light";
  return "sedentary";
};

const resolveActivityLevel = (
  metrics?: Pick<
    AdaptiveGoalMetrics,
    "activityLevel" | "dailySteps" | "weeklyWorkoutDays" | "workoutIntensity"
  > | null
) => {
  const declared = normalizeActivityLevel(metrics?.activityLevel);
  const inferred = inferActivityLevelFromMovement(metrics);

  return ACTIVITY_LEVEL_RANK[inferred] > ACTIVITY_LEVEL_RANK[declared]
    ? inferred
    : declared;
};

const inferFreeGoalPace = (
  metrics?: Pick<AdaptiveGoalMetrics, "height" | "weight"> | null,
  goal = 0
): GoalPace => {
  const bmi = getBmiFromMetrics(metrics);
  if (!bmi) return "standard";

  if (goal === 1) {
    if (bmi >= 32) return "aggressive";
    if (bmi < 24) return "slow";
    return "standard";
  }

  if (goal === 2) {
    if (bmi < 21) return "aggressive";
    if (bmi >= 28) return "slow";
    return "standard";
  }

  if (goal === 3) {
    if (bmi < 18.5) return "aggressive";
    if (bmi <= 21) return "standard";
    return "slow";
  }

  return "standard";
};

const resolveGoalPace = (
  metrics: AdaptiveGoalMetrics | null | undefined,
  goal: number,
  plan: AdaptiveGoalPlan
) =>
  normalizeGoalPace(metrics?.goalPace) ||
  (plan === "free" ? inferFreeGoalPace(metrics, goal) : "standard");

const getGoalAdjustmentConfig = (
  goal: number,
  pace: GoalPace,
  plan: AdaptiveGoalPlan
) => {
  const configs = plan === "premium"
    ? PREMIUM_GOAL_PACE_ADJUSTMENTS
    : FREE_GOAL_PACE_ADJUSTMENTS;

  return configs[goal as 1 | 2 | 3]?.[pace];
};

const getCalorieMinimum = (gender?: AdaptiveGoalMetrics["gender"]) => {
  const normalizedGender = normalizeGender(gender);
  if (normalizedGender === "male") return MALE_CALORIE_MIN;
  if (normalizedGender === "female") return DEFAULT_CALORIE_MIN;
  return OTHER_CALORIE_MIN;
};

const clampCaloriesForMetrics = (
  value: number,
  metrics?: Pick<AdaptiveGoalMetrics, "gender"> | null
) => clamp(value, getCalorieMinimum(metrics?.gender), CALORIE_MAX);

const getPremiumBodyCompositionBmr = (
  mifflinBmr: number,
  weightKg: number,
  metrics?: Pick<AdaptiveGoalMetrics, "bodyFatPercentage"> | null
) => {
  const bodyFatPercentage = normalizePercentage(metrics?.bodyFatPercentage);
  if (bodyFatPercentage < 5 || bodyFatPercentage > 60 || weightKg <= 0) {
    return mifflinBmr;
  }

  const leanMassKg = weightKg * (1 - bodyFatPercentage / 100);
  const katchMcardleBmr = 370 + 21.6 * leanMassKg;
  const blendedBmr = mifflinBmr * 0.35 + katchMcardleBmr * 0.65;

  return clamp(blendedBmr, mifflinBmr * 0.82, mifflinBmr * 1.18);
};

const getTargetWeightAdjustmentFactor = (
  goal: number,
  plan: AdaptiveGoalPlan,
  metrics?: Pick<AdaptiveGoalMetrics, "weight" | "targetWeight"> | null
) => {
  if (plan !== "premium") return 1;

  const currentWeight = toNumber(metrics?.weight);
  const targetWeight = toNumber(metrics?.targetWeight);
  if (currentWeight <= 0 || targetWeight <= 0) return 1;

  const distanceKg =
    goal === 1
      ? currentWeight - targetWeight
      : goal === 2 || goal === 3
        ? targetWeight - currentWeight
        : 0;

  if (distanceKg <= 0) return 1;
  if (distanceKg <= 1) return 0.45;
  if (distanceKg <= 3) return 0.68;
  if (distanceKg <= 5) return 0.85;
  return 1;
};

const getGoalCalorieAdjustment = (
  tdee: number,
  goal: number,
  plan: AdaptiveGoalPlan,
  metrics?: AdaptiveGoalMetrics | null
) => {
  if (tdee <= 0) return 0;

  const pace = resolveGoalPace(metrics, goal, plan);
  const config = getGoalAdjustmentConfig(goal, pace, plan);
  if (!config) return 0;

  const targetWeightFactor = getTargetWeightAdjustmentFactor(goal, plan, metrics);
  const adjustment = clamp(tdee * config.ratio, config.min, config.max) * targetWeightFactor;
  return goal === 1 ? -adjustment : adjustment;
};

const getIdealBodyWeightKg = (
  heightCm: number,
  gender?: AdaptiveGoalMetrics["gender"]
) => {
  if (heightCm <= 0) return 0;

  const heightMeters = heightCm / 100;
  const bmiAnchor = normalizeGender(gender) === "female" ? 21.5 : 22.5;
  return bmiAnchor * heightMeters * heightMeters;
};

const getHydrationWeightKg = (
  weightKg: number,
  heightCm: number,
  gender?: AdaptiveGoalMetrics["gender"]
) => {
  if (weightKg <= 0) return 0;
  if (heightCm <= 0) return weightKg;

  const heightMeters = heightCm / 100;
  const bmi = weightKg / (heightMeters * heightMeters);
  if (bmi <= 30) return weightKg;

  const idealWeight = getIdealBodyWeightKg(heightCm, gender);
  if (idealWeight <= 0 || idealWeight >= weightKg) return weightKg;

  return idealWeight + (weightKg - idealWeight) * 0.4;
};

const getBaseHydrationLiters = (
  weightKg: number,
  heightCm: number,
  gender?: AdaptiveGoalMetrics["gender"],
  plan: AdaptiveGoalPlan = "free"
) => {
  const hydrationWeight = getHydrationWeightKg(weightKg, heightCm, gender);
  const mlPerKg = plan === "premium" ? 0.035 : 0.033;
  const genderFloor =
    normalizeGender(gender) === "male"
      ? 2.5
      : normalizeGender(gender) === "female"
        ? 2
        : 2.2;

  return clamp(Math.max(hydrationWeight * mlPerKg, genderFloor), HYDRATION_MIN, HYDRATION_MAX);
};

const getMetricSources = (user?: any, storedMetrics?: any) => (
  [
    storedMetrics,
    user?.userInfo,
    user?.data?.userInfo,
    user?.user?.userInfo,
    user?.bmiSummary,
    user?.healthMetrics,
    user?.data,
    user?.user,
    user,
  ].filter(Boolean)
);

const readMetricNumber = (sources: any[], keys: string[]) =>
  firstPositiveNumber(...sources.flatMap((source) => keys.map((key) => source?.[key])));

const readMetricValue = (sources: any[], keys: string[]) =>
  firstValue(...sources.flatMap((source) => keys.map((key) => source?.[key])));

const calculateAgeFromBirthDate = (birthDate: any) => {
  if (!birthDate) return 0;

  let year = 0;
  let month = 0;
  let day = 0;

  if (typeof birthDate === "string") {
    const parsed = new Date(birthDate);
    if (Number.isNaN(parsed.getTime())) return 0;
    year = parsed.getFullYear();
    month = parsed.getMonth() + 1;
    day = parsed.getDate();
  } else {
    year = toNumber(birthDate.year);
    month = toNumber(birthDate.month);
    day = toNumber(birthDate.day);
  }

  if (year <= 0 || month <= 0 || day <= 0) return 0;

  const today = new Date();
  let age = today.getFullYear() - year;
  const hasBirthdayPassed =
    today.getMonth() + 1 > month ||
    (today.getMonth() + 1 === month && today.getDate() >= day);

  if (!hasBirthdayPassed) age -= 1;

  return age > 0 ? age : 0;
};

export const buildAdaptiveGoalMetrics = (
  user?: any,
  storedMetrics?: any
): AdaptiveGoalMetrics | null => {
  const sources = getMetricSources(user, storedMetrics);
  if (!sources.length) return null;

  const birthDate = readMetricValue(sources, ["birthDate", "dateOfBirth", "dob"]);
  const metrics: AdaptiveGoalMetrics = {
    height: normalizeHeightCm(
      readMetricValue(sources, ["height", "heightCm", "heightInCm", "heightCentimeters"])
    ),
    weight: readMetricNumber(sources, ["weight", "weightKg", "currentWeight"]),
    age: readMetricNumber(sources, ["age"]) || calculateAgeFromBirthDate(birthDate),
    gender: firstText(...sources.flatMap((source) => [source.gender, source.selectedGender, source.sex])),
    activityLevel: normalizeActivityLevel(
      firstText(...sources.flatMap((source) => [source.activityLevel, source.activity, source.exerciseLevel]))
    ),
    fitnessGoal: firstValue(...sources.flatMap((source) => [
      source.fitnessGoal,
      source.selectedGoal,
      source.goal,
      source.goalType,
    ])) as AdaptiveGoalMetrics["fitnessGoal"],
    goalPace: firstText(...sources.flatMap((source) => [
      source.goalPace,
      source.calorieGoalPace,
      source.weightGoalPace,
      source.pace,
    ])),
    weeklyWorkoutDays: readMetricNumber(sources, [
      "weeklyWorkoutDays",
      "workoutDays",
      "workoutsPerWeek",
      "trainingDaysPerWeek",
      "exerciseDaysPerWeek",
      "exerciseDays",
    ]),
    dailySteps: readMetricNumber(sources, [
      "dailySteps",
      "averageDailySteps",
      "avgDailySteps",
      "stepsPerDay",
      "steps",
    ]),
    stepGoal: readMetricNumber(sources, ["stepGoal", "dailyStepGoal", "targetSteps"]),
    bodyFatPercentage: normalizePercentage(readMetricValue(sources, [
      "bodyFatPercentage",
      "bodyFatPercent",
      "bodyFat",
      "fatPercentage",
    ])),
    targetWeight: readMetricNumber(sources, [
      "targetWeight",
      "targetWeightKg",
      "goalWeight",
      "desiredWeight",
    ]),
    workoutIntensity: firstText(...sources.flatMap((source) => [
      source.workoutIntensity,
      source.trainingIntensity,
      source.exerciseIntensity,
    ])),
    sleepHours: readMetricNumber(sources, [
      "sleepHours",
      "averageSleepHours",
      "avgSleepHours",
    ]),
  };

  if (!metrics.height || !metrics.weight || !metrics.age) {
    return null;
  }

  return metrics;
};

export const loadAdaptiveGoalMetrics = async (user?: any): Promise<AdaptiveGoalMetrics | null> => {
  let storedMetrics: any = null;

  try {
    const rawMetrics = await AsyncStorage.getItem(HEALTH_METRICS_STORAGE_KEY);
    storedMetrics = rawMetrics ? JSON.parse(rawMetrics) : null;
  } catch (error) {
    console.error("Error loading adaptive health metrics:", error);
  }

  return buildAdaptiveGoalMetrics(user, storedMetrics);
};

export const calculateMifflinStJeorBaseGoals = (
  metrics?: AdaptiveGoalMetrics | null,
  options: AdaptiveGoalOptions = {}
) => {
  if (!metrics) return null;

  const height = toNumber(metrics.height);
  const weight = toNumber(metrics.weight);
  const age = toNumber(metrics.age);

  if (height <= 0 || weight <= 0 || age <= 0) return null;

  const gender = normalizeGender(metrics.gender);
  const genderOffset = gender === "male" ? 5 : gender === "female" ? -161 : -78;
  const mifflinBmr = 10 * weight + 6.25 * height - 5 * age + genderOffset;
  const goal = normalizeGoal(metrics.fitnessGoal);
  const plan = options.plan === "premium" ? "premium" : "free";
  const bmr = plan === "premium"
    ? getPremiumBodyCompositionBmr(mifflinBmr, weight, metrics)
    : mifflinBmr;
  const activityLevel = resolveActivityLevel(metrics);
  const activityMultiplier = ACTIVITY_MULTIPLIERS[activityLevel] || 1.2;
  const tdee = bmr * activityMultiplier;
  const goalAdjustment = getGoalCalorieAdjustment(tdee, goal, plan, metrics);
  const calories = clampCaloriesForMetrics(tdee + goalAdjustment, metrics);
  const hydration = getBaseHydrationLiters(weight, height, metrics.gender, plan);

  return {
    calories: roundCalories(calories),
    hydration: roundHydration(hydration),
    bmr: roundCalories(bmr),
    tdee: roundCalories(tdee),
    goalAdjustment: roundCalories(goalAdjustment),
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

const getFoodCaloriesFromDay = (day?: AdaptiveGoalDay | null) =>
  roundCalories(day?.achievedCalories);

const getNetCaloriesForPlan = (
  day: AdaptiveGoalDay,
  _plan: AdaptiveGoalPlan
) => {
  return getFoodCaloriesFromDay(day);
};

const getLifestyleHydrationAdjustment = (
  metrics?: AdaptiveGoalMetrics | null,
  plan: AdaptiveGoalPlan = "free"
) => {
  const activityLevel = resolveActivityLevel(metrics);
  const adjustments: Record<ActivityLevelKey, number> = plan === "premium"
    ? {
        sedentary: 0,
        light: 0.05,
        moderate: 0.12,
        active: 0.22,
        veryActive: 0.35,
      }
    : {
        sedentary: 0,
        light: 0,
        moderate: 0.05,
        active: 0.1,
        veryActive: 0.15,
      };

  return roundHydration(adjustments[activityLevel] || 0);
};

const normalizeWeightKg = (value: unknown) => {
  const weight = toNumber(value);
  return weight >= 20 && weight <= 350 ? Math.round(weight * 10) / 10 : 0;
};

const normalizeWeightTrendLogs = (value: unknown): WeightTrendLogEntry[] => {
  if (!Array.isArray(value)) return [];

  return value
    .map((entry: any) => {
      const weightKg = normalizeWeightKg(entry?.weightKg ?? entry?.weight);
      const dateKey = getLocalDateKey(entry?.dateKey || entry?.date || entry?.loggedAt);
      if (!weightKg || !dateKey) return null;

      return {
        dateKey,
        loggedAt: entry?.loggedAt || `${dateKey}T12:00:00.000Z`,
        weightKg,
        sourceUserId: entry?.sourceUserId ? String(entry.sourceUserId) : undefined,
        sourceWeeklyTrackingId: entry?.sourceWeeklyTrackingId ?? null,
      } as WeightTrendLogEntry;
    })
    .filter(Boolean) as WeightTrendLogEntry[];
};

export const loadWeightTrendLogs = async (options: { userId?: string } = {}) => {
  try {
    const raw = await AsyncStorage.getItem(WEIGHT_TREND_LOGS_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    const logs = normalizeWeightTrendLogs(parsed);

    if (!options.userId) return logs;

    return logs.filter(
      (log) => !log.sourceUserId || log.sourceUserId === String(options.userId)
    );
  } catch {
    return [];
  }
};

const saveWeightTrendLogs = async (logs: WeightTrendLogEntry[]) => {
  const uniqueByDate = new Map<string, WeightTrendLogEntry>();

  logs
    .filter((log) => normalizeWeightKg(log.weightKg) > 0 && getDateKeyTime(log.dateKey) > 0)
    .sort((a, b) => getDateKeyTime(b.dateKey) - getDateKeyTime(a.dateKey))
    .forEach((log) => {
      const scope = log.sourceUserId || "local";
      const key = `${scope}:${log.dateKey}`;
      if (!uniqueByDate.has(key)) {
        uniqueByDate.set(key, log);
      }
    });

  const nextLogs = Array.from(uniqueByDate.values())
    .sort((a, b) => getDateKeyTime(b.dateKey) - getDateKeyTime(a.dateKey))
    .slice(0, WEIGHT_TREND_MAX_LOGS);

  await AsyncStorage.setItem(WEIGHT_TREND_LOGS_STORAGE_KEY, JSON.stringify(nextLogs));
};

export const recordWeightTrendSnapshot = async (
  metrics?: AdaptiveGoalMetrics | null,
  options: { userId?: string; weeklyTrackingId?: string | null } = {}
) => {
  const weightKg = normalizeWeightKg(metrics?.weight);
  if (!weightKg) return null;

  const todayKey = getLocalDateKey();
  const logs = await loadWeightTrendLogs({ userId: options.userId });
  const sourceUserId = options.userId ? String(options.userId) : undefined;
  const sameDayIndex = logs.findIndex(
    (log) => log.dateKey === todayKey && (!sourceUserId || !log.sourceUserId || log.sourceUserId === sourceUserId)
  );
  const nextEntry: WeightTrendLogEntry = {
    dateKey: todayKey,
    loggedAt: new Date().toISOString(),
    weightKg,
    sourceUserId,
    sourceWeeklyTrackingId: options.weeklyTrackingId ?? null,
  };
  const nextLogs = sameDayIndex >= 0
    ? logs.map((log, index) => (index === sameDayIndex ? nextEntry : log))
    : [nextEntry, ...logs];

  await saveWeightTrendLogs(nextLogs);
  return nextEntry;
};

const getDaysForWeightCalibration = (
  data?: AdaptiveGoalDay[] | Record<string, AdaptiveGoalDay> | null
) => {
  if (!data) return [];
  const source: any = (data as any)?.data || data;
  if (Array.isArray(source)) return source.filter(Boolean) as AdaptiveGoalDay[];
  return Object.values(source).filter(Boolean) as AdaptiveGoalDay[];
};

const getNutritionAdherenceScore = (
  days: AdaptiveGoalDay[],
  plan: AdaptiveGoalPlan
) => {
  const unlockedDays = days.filter((day) => day.status !== "locked" && toNumber(day.targetCalories) > 0);
  if (!unlockedDays.length) return 35;

  const meaningfulDays = unlockedDays.filter((day) => getFoodCaloriesFromDay(day) >= MIN_MEANINGFUL_FOOD_LOG);
  if (!meaningfulDays.length) return 10;

  const coverageScore = clamp((meaningfulDays.length / Math.min(unlockedDays.length, 7)) * 70, 0, 70);
  const averageGapRatio =
    meaningfulDays.reduce((sum, day) => {
      const target = toNumber(day.targetCalories);
      const actual = getNetCaloriesForPlan(day, plan);
      return sum + (target > 0 ? Math.abs(target - actual) / target : 0.5);
    }, 0) / meaningfulDays.length;
  const gapScore = (1 - clamp(averageGapRatio, 0, 0.5) / 0.5) * 30;

  return Math.round(clamp(coverageScore + gapScore, 0, 100));
};

const getExpectedWeeklyWeightChangeKg = (
  metrics?: AdaptiveGoalMetrics | null,
  plan: AdaptiveGoalPlan = "free"
) => {
  const baseGoals = calculateMifflinStJeorBaseGoals(metrics, { plan });
  if (!baseGoals) return 0;

  return roundWeightTrend((baseGoals.goalAdjustment * 7) / 7700);
};

const getWeightTrendGoalDirection = (
  goal?: AdaptiveGoalMetrics["fitnessGoal"]
): WeightTrendGoalDirection => {
  const goalKey = getCalorieGoalKey(goal);
  if (goalKey === 1) return "weightLoss";
  if (goalKey === 2) return "muscleGain";
  if (goalKey === 3) return "weightGain";
  return "maintenance";
};

const getTrendPoints = (logs: WeightTrendLogEntry[]) => {
  const byDate = new Map<string, WeightTrendLogEntry>();

  logs.forEach((log) => {
    const time = getDateKeyTime(log.dateKey);
    if (!time || normalizeWeightKg(log.weightKg) <= 0) return;
    const existing = byDate.get(log.dateKey);
    if (!existing || new Date(log.loggedAt).getTime() > new Date(existing.loggedAt).getTime()) {
      byDate.set(log.dateKey, log);
    }
  });

  return Array.from(byDate.values())
    .sort((a, b) => getDateKeyTime(a.dateKey) - getDateKeyTime(b.dateKey));
};

const filterWeightTrendOutliers = (points: WeightTrendLogEntry[]) => {
  if (points.length <= 2) return points;

  const filtered: WeightTrendLogEntry[] = [points[0]];

  points.slice(1).forEach((point) => {
    const previous = filtered[filtered.length - 1];
    const dayGap = Math.max(
      1,
      Math.round((getDateKeyTime(point.dateKey) - getDateKeyTime(previous.dateKey)) / DAY_MS)
    );
    const maxExpectedShift = Math.max(1.8, previous.weightKg * 0.025) * Math.sqrt(dayGap);

    if (Math.abs(point.weightKg - previous.weightKg) <= maxExpectedShift) {
      filtered.push(point);
    }
  });

  return filtered.length >= 2 ? filtered : points;
};

const calculateWeightSlopeKgPerDay = (logs: WeightTrendLogEntry[]) => {
  const points = filterWeightTrendOutliers(getTrendPoints(logs));
  if (points.length < 2) return { slope: 0, spanDays: 0, volatilityKg: 0, logCount: points.length };

  const firstTime = getDateKeyTime(points[0].dateKey);
  const lastTime = getDateKeyTime(points[points.length - 1].dateKey);
  const spanDays = Math.max(0, Math.round((lastTime - firstTime) / DAY_MS));
  if (spanDays <= 0) return { slope: 0, spanDays: 0, volatilityKg: 0, logCount: points.length };

  const xs = points.map((point) => (getDateKeyTime(point.dateKey) - firstTime) / DAY_MS);
  const ys = points.map((point) => point.weightKg);
  const meanX = xs.reduce((sum, value) => sum + value, 0) / xs.length;
  const meanY = ys.reduce((sum, value) => sum + value, 0) / ys.length;
  const denominator = xs.reduce((sum, value) => sum + Math.pow(value - meanX, 2), 0);
  const slope = denominator > 0
    ? xs.reduce((sum, value, index) => sum + (value - meanX) * (ys[index] - meanY), 0) / denominator
    : (ys[ys.length - 1] - ys[0]) / spanDays;
  const volatilityKg =
    points.length > 2
      ? ys.reduce((sum, weight, index) => {
          const predicted = meanY + slope * (xs[index] - meanX);
          return sum + Math.abs(weight - predicted);
        }, 0) / ys.length
      : 0;

  return { slope, spanDays, volatilityKg, logCount: points.length };
};

const getPaceCalibrationMultiplier = (pace?: GoalPace | null) => {
  if (pace === "aggressive") return 1.18;
  if (pace === "slow") return 0.82;
  return 1;
};

const getCalibrationCapCalories = (
  plan: AdaptiveGoalPlan,
  goalDirection: WeightTrendGoalDirection,
  pace?: GoalPace | null
) => {
  if (plan === "premium") {
    const baseCap = goalDirection === "muscleGain" ? 140 : 180;
    return roundToNearest(baseCap * getPaceCalibrationMultiplier(pace), 25);
  }

  return goalDirection === "muscleGain" ? 80 : 110;
};

const getCalibrationAggression = (
  plan: AdaptiveGoalPlan,
  goalDirection: WeightTrendGoalDirection,
  pace?: GoalPace | null
) => {
  if (plan === "premium") {
    const baseAggression = goalDirection === "muscleGain" ? 0.35 : 0.45;
    return baseAggression * getPaceCalibrationMultiplier(pace);
  }

  return goalDirection === "muscleGain" ? 0.18 : 0.25;
};

const getMinimumTrendLogCount = (plan: AdaptiveGoalPlan) =>
  plan === "premium" ? 2 : 3;

const getTrendConfidenceThreshold = (plan: AdaptiveGoalPlan) =>
  plan === "premium" ? 45 : 55;

const getTrendDeadbandKgPerWeek = (
  plan: AdaptiveGoalPlan,
  confidence: number,
  nutritionAdherenceScore: number
) => {
  if (plan === "premium") {
    if (confidence >= 82 && nutritionAdherenceScore >= 70) return 0.08;
    if (confidence < 55 || nutritionAdherenceScore < 35) return 0.14;
    return 0.11;
  }
  if (confidence >= 80 && nutritionAdherenceScore >= 70) return 0.14;
  if (confidence < 65 || nutritionAdherenceScore < 50) return 0.22;
  return 0.18;
};

const getCalibrationAdherenceFactor = (
  plan: AdaptiveGoalPlan,
  nutritionAdherenceScore: number
) => {
  if (plan === "premium") {
    if (nutritionAdherenceScore < 25) return 0.55;
    if (nutritionAdherenceScore < 45) return 0.75;
    return 1;
  }
  return clamp((nutritionAdherenceScore - 25) / 55, 0.35, 1);
};

const getWeightTrendMessage = (
  status: WeightTrendStatus,
  goalDirection: WeightTrendGoalDirection,
  calorieAdjustment: number
) => {
  if (status === "collecting") {
    return "FitFaat is collecting weekly weigh-ins and food consistency before changing calories.";
  }

  if (status === "onTrack" || calorieAdjustment === 0) {
    return "Your weekly weight trend matches the target closely, so calories stay steady.";
  }

  const amount = Math.abs(calorieAdjustment);
  const verb = calorieAdjustment > 0 ? "adds" : "trims";

  if (goalDirection === "weightLoss") {
    return calorieAdjustment < 0
      ? `Your weight loss trend is slower than expected, so FitFaat trims ${amount} kcal from the daily target.`
      : `Your weight loss trend is faster than expected, so FitFaat adds ${amount} kcal for safer pacing.`;
  }

  if (goalDirection === "muscleGain") {
    return calorieAdjustment > 0
      ? `Your muscle gain trend is under target, so FitFaat adds ${amount} kcal to support training.`
      : `Your muscle gain trend is moving too fast, so FitFaat trims ${amount} kcal to reduce fat gain risk.`;
  }

  if (goalDirection === "weightGain") {
    return calorieAdjustment > 0
      ? `Your weight gain trend is slower than expected, so FitFaat adds ${amount} kcal to the daily target.`
      : `Your weight gain trend is faster than expected, so FitFaat trims ${amount} kcal for steadier pacing.`;
  }

  return `Your trend changed enough that FitFaat ${verb} ${amount} kcal from the daily target.`;
};

export const buildWeeklyWeightTrendCalibration = (
  metrics?: AdaptiveGoalMetrics | null,
  logs: WeightTrendLogEntry[] = [],
  days?: AdaptiveGoalDay[] | Record<string, AdaptiveGoalDay> | null,
  options: AdaptiveGoalOptions = {}
): WeeklyWeightTrendCalibration | null => {
  const currentWeight = normalizeWeightKg(metrics?.weight);
  if (!currentWeight) return null;

  const plan = options.plan === "premium" ? "premium" : "free";
  const goal = normalizeGoal(metrics?.fitnessGoal);
  const goalPace = resolveGoalPace(metrics, goal, plan);
  const goalDirection = getWeightTrendGoalDirection(metrics?.fitnessGoal);
  const lookbackStart = Date.now() - WEIGHT_TREND_LOOKBACK_DAYS * DAY_MS;
  const recentLogs = logs.filter((log) => getDateKeyTime(log.dateKey) >= lookbackStart);
  const { slope, spanDays, volatilityKg, logCount } = calculateWeightSlopeKgPerDay(recentLogs);
  const nutritionAdherenceScore = getNutritionAdherenceScore(getDaysForWeightCalibration(days), plan);
  const expectedKgPerWeek = getExpectedWeeklyWeightChangeKg(metrics, plan);
  const observedKgPerWeek = roundWeightTrend(slope * 7);
  const baseCalibration = {
    goalDirection,
    observedKgPerWeek,
    expectedKgPerWeek,
    calorieAdjustment: 0,
    nutritionAdherenceScore,
    weightLogCount: logCount,
    spanDays,
  };

  const minimumTrendLogCount = getMinimumTrendLogCount(plan);

  if (logCount < minimumTrendLogCount || spanDays < WEIGHT_TREND_MIN_SPAN_DAYS) {
    return {
      ...baseCalibration,
      status: "collecting",
      confidence: Math.round(clamp(logCount * 12 + spanDays * 2, 0, plan === "premium" ? 35 : 42)),
      message: getWeightTrendMessage("collecting", goalDirection, 0),
    };
  }

  const spanScore = clamp((spanDays / 21) * 35, 0, 35);
  const logScore = clamp((logCount / 6) * 25, 0, 25);
  const adherenceScore = nutritionAdherenceScore * 0.4;
  const volatilityPenalty = clamp((volatilityKg / 0.35) * 12, 0, 12);
  const confidence = Math.round(clamp(spanScore + logScore + adherenceScore - volatilityPenalty, 0, 100));
  const requiredConfidence = getTrendConfidenceThreshold(plan);
  const hasEnoughNutritionSignal = nutritionAdherenceScore >= (plan === "premium" ? 15 : 30);

  if (confidence < requiredConfidence || !hasEnoughNutritionSignal) {
    return {
      ...baseCalibration,
      status: "collecting",
      confidence,
      message: getWeightTrendMessage("collecting", goalDirection, 0),
    };
  }

  const trendErrorKgPerWeek = expectedKgPerWeek - observedKgPerWeek;
  const deadbandKgPerWeek = getTrendDeadbandKgPerWeek(plan, confidence, nutritionAdherenceScore);

  if (Math.abs(trendErrorKgPerWeek) <= deadbandKgPerWeek || goalDirection === "maintenance") {
    return {
      ...baseCalibration,
      status: "onTrack",
      confidence,
      message: getWeightTrendMessage("onTrack", goalDirection, 0),
    };
  }

  const rawDailyCorrection = (trendErrorKgPerWeek * 7700) / 7;
  const confidenceFactor = clamp((confidence - 40) / 60, 0, 1);
  const adherenceFactor = getCalibrationAdherenceFactor(plan, nutritionAdherenceScore);
  const cap = getCalibrationCapCalories(plan, goalDirection, goalPace);
  const calorieAdjustment = roundToNearest(
    clamp(
      rawDailyCorrection *
        getCalibrationAggression(plan, goalDirection, goalPace) *
        confidenceFactor *
        adherenceFactor,
      -cap,
      cap
    ),
    25
  );
  const meaningfulAdjustment = Math.abs(calorieAdjustment) >= 25 ? calorieAdjustment : 0;
  const status: WeightTrendStatus = meaningfulAdjustment === 0 ? "onTrack" : "adjusting";

  return {
    ...baseCalibration,
    status,
    confidence,
    calorieAdjustment: meaningfulAdjustment,
    message: getWeightTrendMessage(status, goalDirection, meaningfulAdjustment),
  };
};

export const loadWeeklyWeightTrendCalibration = async (
  metrics?: AdaptiveGoalMetrics | null,
  days?: AdaptiveGoalDay[] | Record<string, AdaptiveGoalDay> | null,
  options: AdaptiveGoalOptions & { userId?: string; weeklyTrackingId?: string | null } = {}
) => {
  const userId = options.userId ? String(options.userId) : undefined;
  await recordWeightTrendSnapshot(metrics, {
    userId,
    weeklyTrackingId: options.weeklyTrackingId,
  });

  const logs = await loadWeightTrendLogs({ userId });
  return buildWeeklyWeightTrendCalibration(metrics, logs, days, options);
};

export const applyWeeklyWeightTrendCalibrationToCalories = (
  targetCalories: unknown,
  calibration?: WeeklyWeightTrendCalibration | null,
  metrics?: Pick<AdaptiveGoalMetrics, "gender"> | null
) => {
  const target = roundCalories(targetCalories);
  if (target <= 0) return 0;

  const adjustment = roundCalories(calibration?.calorieAdjustment);
  if (!adjustment || calibration?.status !== "adjusting") return target;

  return roundCalories(clampCaloriesForMetrics(target + adjustment, metrics));
};

const resolveBaseGoals = (day: AdaptiveGoalDay, metricsBase: ReturnType<typeof calculateMifflinStJeorBaseGoals>) => ({
  calories: roundCalories(
    firstPositiveNumber(
      metricsBase?.calories,
      day.baseTargetCalories,
      day.defaultTargetCalories,
      day.targetCalories
    )
  ),
  hydration: roundHydration(
    firstPositiveNumber(
      metricsBase?.hydration,
      day.baseTargetHydration,
      day.defaultTargetHydration,
      day.targetHydration
    )
  ),
});

const resolveFixedHydrationBase = (
  days: AdaptiveGoalDay[],
  metricsBase: ReturnType<typeof calculateMifflinStJeorBaseGoals>
) => {
  if (metricsBase?.hydration) {
    return roundHydration(metricsBase.hydration);
  }

  const firstHydrationGoal = [...days]
    .sort((a, b) => getDayTime(a) - getDayTime(b))
    .map((day) =>
      roundHydration(
        firstPositiveNumber(
          day.baseTargetHydration,
          day.defaultTargetHydration,
          day.targetHydration
        )
      )
    )
    .find((hydration) => hydration > 0);

  return firstHydrationGoal || 0;
};

const getGapDirection = (gap: number): GapDirection => {
  if (Math.abs(gap) < CALORIE_GAP_NOISE_BAND) return "onTarget";
  return gap > 0 ? "missed" : "exceeded";
};

const getSeverityScore = (severity: GapSeverity) => {
  if (severity === "critical") return 88;
  if (severity === "high") return 70;
  if (severity === "medium") return 48;
  if (severity === "low") return 24;
  return 0;
};

const getNudgeReason = (
  direction: GapDirection,
  goalKey: CalorieGoalKey,
  hydrationGap: number
) => {
  if (hydrationGap >= 0.25) return "hydration routine support";
  if (direction === "missed") {
    if (goalKey === 3) return "weight gain surplus support";
    if (goalKey === 2) return "muscle gain fuel timing";
    if (goalKey === 1) return "gentle under-eating check";
    return "nutrition gap support";
  }
  if (direction === "exceeded") {
    if (goalKey === 1) return "overeating risk window";
    if (goalKey === 2) return "balanced muscle gain pacing";
    if (goalKey === 3) return "surplus pacing";
    return "calorie pacing";
  }
  return "steady routine support";
};

const buildBehaviorGuidance = ({
  day,
  plan,
  metrics,
  targetCalories,
  targetHydration,
  behaviorCaloriesAdjustment,
  behaviorHydrationAdjustment,
}: {
  day: AdaptiveGoalDay;
  plan: AdaptiveGoalPlan;
  metrics?: AdaptiveGoalMetrics | null;
  targetCalories: number;
  targetHydration: number;
  behaviorCaloriesAdjustment: number;
  behaviorHydrationAdjustment: number;
}): Pick<
  AdaptiveGoalDay,
  | "behaviorCaloriesAdjustment"
  | "behaviorHydrationAdjustment"
  | "calorieGap"
  | "hydrationGap"
  | "calorieGoalDirection"
  | "nutritionGapSeverity"
  | "hydrationRiskScore"
  | "recoveryNeedScore"
  | "goalRiskScore"
  | "nudgePriority"
  | "nudgeReason"
> => {
  const goalKey = getCalorieGoalKey(metrics?.fitnessGoal);
  const sameDayCalorieActual = getNetCaloriesForPlan(day, plan);
  const calorieGap = targetCalories > 0 ? targetCalories - sameDayCalorieActual : 0;
  const direction = targetCalories > 0 ? getGapDirection(calorieGap) : "unknown";
  const severity = targetCalories > 0 ? getGapSeverity(calorieGap) : "none";
  const sameDayHydrationActual = getAchievedHydration(day);
  const hydrationGap =
    targetHydration > 0 ? roundHydration(targetHydration - sameDayHydrationActual) : 0;
  const hydrationRiskScore =
    targetHydration > 0 && hydrationGap > 0
      ? clamp(Math.round((hydrationGap / targetHydration) * 100), 0, 100)
      : 0;
  const recoveryNeedScore = 0;
  const goalRiskScore = clamp(
    getSeverityScore(severity) +
      Math.round(Math.abs(behaviorCaloriesAdjustment) / 12) +
      Math.round(hydrationRiskScore * 0.22),
    0,
    100
  );
  const nudgePriority = getNudgePriority(
    goalRiskScore,
    behaviorCaloriesAdjustment,
    behaviorHydrationAdjustment
  );

  return {
    behaviorCaloriesAdjustment,
    behaviorHydrationAdjustment: roundHydration(behaviorHydrationAdjustment),
    calorieGap: roundCalories(calorieGap),
    hydrationGap,
    calorieGoalDirection: direction,
    nutritionGapSeverity: severity,
    hydrationRiskScore,
    recoveryNeedScore,
    goalRiskScore,
    nudgePriority,
    nudgeReason: getNudgeReason(direction, goalKey, hydrationGap),
  };
};

export const applyAdaptiveGoalsToDays = <T extends AdaptiveGoalDay>(
  days: T[],
  metrics?: AdaptiveGoalMetrics | null,
  options: AdaptiveGoalOptions = {}
): T[] => {
  const plan = options.plan === "premium" ? "premium" : "free";
  const weightTrendCalibration = options.weightTrendCalibration ?? null;
  const metricsBase = calculateMifflinStJeorBaseGoals(metrics, { plan });
  const fixedHydrationBase = resolveFixedHydrationBase(days, metricsBase);

  return [...days]
    .sort((a, b) => getDayTime(a) - getDayTime(b))
    .map((day) => {
      const baseGoals = resolveBaseGoals(day, metricsBase);
      const calibratedCalories = applyWeeklyWeightTrendCalibrationToCalories(
        baseGoals.calories,
        weightTrendCalibration,
        metrics
      );
      const lifestyleHydration = getLifestyleHydrationAdjustment(metrics, plan);
      const idealHydration = roundHydration(
        clamp(
          (fixedHydrationBase || baseGoals.hydration) + lifestyleHydration,
          HYDRATION_MIN,
          HYDRATION_MAX
        )
      );
      const behaviorCaloriesAdjustment = 0;
      const behaviorHydrationAdjustment = 0;
      const personalizedCalories = roundCalories(
        clampCaloriesForMetrics(calibratedCalories, metrics)
      );
      const personalizedHydration = roundHydration(
        clamp(idealHydration, HYDRATION_MIN, HYDRATION_MAX)
      );
      const calorieRange = buildCalorieTargetRange(personalizedCalories, plan);
      const hydrationRange = buildHydrationTargetRange(personalizedHydration, plan);
      const behaviorGuidance = buildBehaviorGuidance({
        day,
        plan,
        metrics,
        targetCalories: personalizedCalories,
        targetHydration: personalizedHydration,
        behaviorCaloriesAdjustment,
        behaviorHydrationAdjustment,
      });

      const adjustedDay = {
        ...day,
        baseTargetCalories: baseGoals.calories,
        baseTargetHydration: idealHydration,
        idealTargetCalories: baseGoals.calories,
        idealTargetHydration: idealHydration,
        targetCalories: personalizedCalories,
        targetHydration: personalizedHydration,
        calibratedTargetCalories: calibratedCalories,
        targetCaloriesMin: calorieRange.min,
        targetCaloriesMax: calorieRange.max,
        targetHydrationMin: hydrationRange.min,
        targetHydrationMax: hydrationRange.max,
        weightTrendCaloriesAdjustment: weightTrendCalibration?.calorieAdjustment ?? 0,
        weightTrendExpectedKgPerWeek: weightTrendCalibration?.expectedKgPerWeek ?? 0,
        weightTrendObservedKgPerWeek: weightTrendCalibration?.observedKgPerWeek ?? 0,
        weightTrendConfidence: weightTrendCalibration?.confidence ?? 0,
        weightTrendStatus: weightTrendCalibration?.status,
        weightTrendMessage: weightTrendCalibration?.message,
        weightTrendGoalDirection: weightTrendCalibration?.goalDirection,
        adaptiveCaloriesAdjustment: behaviorCaloriesAdjustment,
        adaptiveHydrationAdjustment: behaviorHydrationAdjustment,
        recentConsistencyScore: 50,
        missedDayCount: 0,
        activityLevelHydrationAdjustment: lifestyleHydration,
        ...behaviorGuidance,
      } as T & Required<Pick<AdaptiveGoalDay, "targetCalories" | "targetHydration">>;

      return adjustedDay;
    });
};

export const applyAdaptiveGoalsToJsonResponse = <T extends Record<string, AdaptiveGoalDay>>(
  data: T,
  metrics?: AdaptiveGoalMetrics | null,
  options: AdaptiveGoalOptions = {}
): T => {
  const adjustedDays = applyAdaptiveGoalsToDays(
    Object.values(data) as AdaptiveGoalDay[],
    metrics,
    options
  );
  const byDayNo = new Map(adjustedDays.map((day) => [getDayNo(day), day]));

  return Object.keys(data).reduce((acc, key) => {
    const current = data[key];
    const adjusted = byDayNo.get(getDayNo(current));
    acc[key as keyof T] = (adjusted || current) as T[keyof T];
    return acc;
  }, {} as T);
};

const qaMetrics: AdaptiveGoalMetrics = {
  height: 175,
  weight: 82,
  age: 34,
  gender: "male",
  activityLevel: "moderate",
  fitnessGoal: 1,
  goalPace: "standard",
};

const buildQaDays = (day3: Partial<AdaptiveGoalDay> = {}): AdaptiveGoalDay[] =>
  [1, 2, 3, 4].map((dayNo) => ({
    dayNo,
    date: `2026-05-${String(20 + dayNo).padStart(2, "0")}`,
    status: dayNo < 4 ? "finished" : "active",
    achievedCalories: dayNo === 3 ? 0 : 1200,
    achievedHydration: dayNo === 3 ? 0 : 1.5,
    ...(dayNo === 3 ? day3 : {}),
  }));

const buildQaNewWeekDays = (): AdaptiveGoalDay[] => [
  {
    dayNo: 1,
    date: "2026-05-28",
    status: "active",
    achievedCalories: 0,
    achievedHydration: 0,
  },
];

const hasFreshTargets = (
  days: AdaptiveGoalDay[],
  calories: number,
  hydration: number
) => days.every((day) =>
  day.targetCalories === calories &&
  day.targetHydration === hydration &&
  day.adaptiveCaloriesAdjustment === 0 &&
  day.adaptiveHydrationAdjustment === 0
);

export const runAdaptiveGoalFreshTargetQaCases = () => {
  const freeBase = calculateMifflinStJeorBaseGoals(qaMetrics, { plan: "free" });
  const premiumBase = calculateMifflinStJeorBaseGoals(qaMetrics, { plan: "premium" });
  const freeTargets = {
    calories: freeBase?.calories || 0,
    hydration: roundHydration(
      clamp(
        (freeBase?.hydration || 0) + getLifestyleHydrationAdjustment(qaMetrics, "free"),
        HYDRATION_MIN,
        HYDRATION_MAX
      )
    ),
  };
  const premiumTargets = {
    calories: premiumBase?.calories || 0,
    hydration: roundHydration(
      clamp(
        (premiumBase?.hydration || 0) + getLifestyleHydrationAdjustment(qaMetrics, "premium"),
        HYDRATION_MIN,
        HYDRATION_MAX
      )
    ),
  };
  const calibration: WeeklyWeightTrendCalibration = {
    status: "adjusting",
    goalDirection: "weightLoss",
    confidence: 85,
    observedKgPerWeek: 0,
    expectedKgPerWeek: -0.3,
    calorieAdjustment: 100,
    nutritionAdherenceScore: 80,
    weightLogCount: 4,
    spanDays: 14,
    message: "QA calibration",
  };
  const calibratedCalories = applyWeeklyWeightTrendCalibrationToCalories(
    freeTargets.calories,
    calibration,
    qaMetrics
  );

  const cases = [
    {
      name: "free-missed-day-does-not-change-next-target",
      actual: applyAdaptiveGoalsToDays(
        buildQaDays({ achievedCalories: 500, achievedHydration: 0.4 }),
        qaMetrics,
        { plan: "free" }
      ),
      expectedCalories: freeTargets.calories,
      expectedHydration: freeTargets.hydration,
    },
    {
      name: "free-exceeded-day-does-not-change-next-target",
      actual: applyAdaptiveGoalsToDays(
        buildQaDays({ achievedCalories: 4200, achievedHydration: 5.4 }),
        qaMetrics,
        { plan: "free" }
      ),
      expectedCalories: freeTargets.calories,
      expectedHydration: freeTargets.hydration,
    },
    {
      name: "premium-hydration-miss-does-not-change-next-target",
      actual: applyAdaptiveGoalsToDays(
        buildQaDays({ achievedCalories: 1200, achievedHydration: 0.2 }),
        qaMetrics,
        { plan: "premium" }
      ),
      expectedCalories: premiumTargets.calories,
      expectedHydration: premiumTargets.hydration,
    },
    {
      name: "premium-hydration-excess-does-not-change-next-target",
      actual: applyAdaptiveGoalsToDays(
        buildQaDays({ achievedCalories: 1200, achievedHydration: 5.4 }),
        qaMetrics,
        { plan: "premium" }
      ),
      expectedCalories: premiumTargets.calories,
      expectedHydration: premiumTargets.hydration,
    },
    {
      name: "new-week-starts-with-fresh-target",
      actual: applyAdaptiveGoalsToDays(
        buildQaNewWeekDays(),
        qaMetrics,
        { plan: "free" }
      ),
      expectedCalories: freeTargets.calories,
      expectedHydration: freeTargets.hydration,
    },
    {
      name: "weight-trend-calibration-stays-independent-of-daily-gaps",
      actual: applyAdaptiveGoalsToDays(
        buildQaDays({ achievedCalories: 4200, achievedHydration: 0.2 }),
        qaMetrics,
        { plan: "free", weightTrendCalibration: calibration }
      ),
      expectedCalories: calibratedCalories,
      expectedHydration: freeTargets.hydration,
    },
  ];

  return cases.map((qaCase) => ({
    name: qaCase.name,
    passed: hasFreshTargets(
      qaCase.actual,
      qaCase.expectedCalories,
      qaCase.expectedHydration
    ),
    expectedCalories: qaCase.expectedCalories,
    expectedHydration: qaCase.expectedHydration,
    actual: qaCase.actual.map((day) => ({
      dayNo: day.dayNo,
      targetCalories: day.targetCalories,
      targetHydration: day.targetHydration,
      adaptiveCaloriesAdjustment: day.adaptiveCaloriesAdjustment,
      adaptiveHydrationAdjustment: day.adaptiveHydrationAdjustment,
    })),
  }));
};
