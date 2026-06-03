import AsyncStorage from "@react-native-async-storage/async-storage";
import { pakistaniDishes } from "@/app/Dataset/dataSet";
import type { PremiumFeature } from "@/utils/featureAccess";
import {
  getGoalSpineOption,
  normalizeGoalSpineKey,
  type GoalSpineAction,
  type GoalSpineDay,
  type GoalSpineKey,
  type GoalSpineSummary,
} from "@/utils/goalSpine";
import type { FitFaatPlannedMeal, MealPlanType } from "@/utils/localMealPlanner";

export type GoalMealSuggestion = {
  id: string;
  type: MealPlanType;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  ingredients: string[];
  reason: string;
  timing: string;
  notes: string;
  premiumOnly?: boolean;
  ctaLabel: string;
};

export type GoalMealSwap = {
  id: string;
  from: string;
  to: string;
  benefit: string;
  caloriesDelta: number;
  proteinDelta: number;
  premiumOnly: boolean;
};

export type GoalAdaptiveMealPlan = {
  goal: GoalSpineKey;
  title: string;
  body: string;
  targetCalories: number;
  targetRangeLabel: string;
  plannedCalories: number;
  remainingCalories: number;
  proteinTarget: number;
  snackTiming: string;
  suggestions: GoalMealSuggestion[];
  swaps: GoalMealSwap[];
  groceryPreview: string[];
};

export type GoalWorkoutSession = {
  id: string;
  week: number;
  dateKey: string;
  dayLabel: string;
  title: string;
  focus: string;
  bodyPart: string;
  intensity: "easy" | "moderate" | "hard" | "recovery";
  durationMinutes: number;
  progressionCue: string;
  recoveryCue: string;
  isRestDay: boolean;
  isToday: boolean;
  isCompleted: boolean;
};

export type GoalWorkoutProgram = {
  goal: GoalSpineKey;
  title: string;
  body: string;
  progressionLabel: string;
  weeklyTarget: string;
  sessions: GoalWorkoutSession[];
};

export type GoalWeeklyAdjustment = {
  id: string;
  title: string;
  body: string;
  amountLabel: string;
  actionLabel: string;
  action: GoalSpineAction;
  icon: string;
  color: string;
  premiumOnly?: boolean;
};

export type GoalWeeklyAdjustmentPlan = {
  goal: GoalSpineKey;
  statusLabel: string;
  summary: string;
  confidenceLabel: string;
  adjustments: GoalWeeklyAdjustment[];
};

export type GoalTimelineSummary = {
  goal: GoalSpineKey;
  startedAt: string;
  weeksIntoGoal: number;
  headline: string;
  expectedDirection: string;
  projection: string;
  confidenceLabel: string;
};

export type GoalProgressInterpretation = {
  goal: GoalSpineKey;
  statusLabel: string;
  answer: string;
  helping: string[];
  blocking: string[];
  nextBestStep: string;
  confidenceLabel: string;
};

type GoalAdaptivePlanInput = {
  goal: unknown;
  days?: GoalSpineDay[];
  today?: GoalSpineDay | null;
  summary?: GoalSpineSummary | null;
  isPremium?: boolean;
  weightTrendCaloriesAdjustment?: number | null;
};

type WorkoutHistoryLike = {
  bodyPart?: string;
  target?: string;
  exerciseName?: string;
  completedAt?: string;
};

type TimelineStorage = {
  activeGoal?: GoalSpineKey;
  startedAtByGoal?: Partial<Record<GoalSpineKey, string>>;
};

const GOAL_TIMELINE_STORAGE_KEY = "fitfaat_goal_timeline_v1";
const DAY_MS = 86400000;

const toNumber = (value: unknown) => {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
};

const round = (value: number, step = 1) =>
  Math.round(value / step) * step;

const getDateKey = (value?: string | Date | null) => {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const parseDateKey = (value?: string | null) => {
  const dateKey = value ? getDateKey(value) : "";
  const parsed = dateKey ? new Date(`${dateKey}T12:00:00`) : new Date();
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
};

const getDayCalories = (day?: GoalSpineDay | null) =>
  toNumber(day?.achievedCalories);

const getDayHydration = (day?: GoalSpineDay | null) =>
  toNumber(day?.achievedHydration ?? day?.achieviedHydration);

const getDaySteps = (day?: GoalSpineDay | null) =>
  toNumber(day?.walkingSteps ?? day?.steps ?? day?.stepCount);

const hasWorkoutSignal = (day?: GoalSpineDay | null) =>
  toNumber(day?.exerciseCaloriesBurned) > 0 ||
  toNumber(day?.exerciseDurationSeconds) > 0 ||
  (Array.isArray(day?.exerciseEntries) && day.exerciseEntries.length > 0);

const getMealCount = (day?: GoalSpineDay | null) =>
  Math.max(
    Array.isArray(day?.meals) ? day?.meals.length || 0 : 0,
    getDayCalories(day) > 0 ? 1 : 0
  );

const getTargetCalories = (day?: GoalSpineDay | null, goal?: GoalSpineKey) => {
  const direct = toNumber(day?.targetCalories);
  const min = toNumber(day?.targetCaloriesMin);
  const max = toNumber(day?.targetCaloriesMax);
  if (direct > 0) return direct;
  if (min > 0 && max > 0) return round((min + max) / 2, 25);
  if (min > 0) return min;
  if (max > 0) return max;
  if (goal === "muscle_gain") return 2500;
  if (goal === "weight_gain") return 2700;
  return 2100;
};

const getTargetRangeLabel = (day?: GoalSpineDay | null, goal?: GoalSpineKey) => {
  const target = getTargetCalories(day, goal);
  const min = toNumber(day?.targetCaloriesMin) || round(target * 0.94, 25);
  const max = toNumber(day?.targetCaloriesMax) || round(target * 1.06, 25);
  return `${Math.round(min).toLocaleString()}-${Math.round(max).toLocaleString()} cal`;
};

const getCalorieRangeStatus = (day?: GoalSpineDay | null, goal?: GoalSpineKey) => {
  const achieved = getDayCalories(day);
  const target = getTargetCalories(day, goal);
  const min = toNumber(day?.targetCaloriesMin) || round(target * 0.94, 25);
  const max = toNumber(day?.targetCaloriesMax) || round(target * 1.06, 25);
  if (achieved <= 0) return { status: "empty" as const, min, max };
  if (achieved < min) return { status: "below" as const, min, max };
  if (achieved > max) return { status: "above" as const, min, max };
  return { status: "within" as const, min, max };
};

const buildFallbackStats = (goal: GoalSpineKey, days: GoalSpineDay[] = []) => {
  const unlockedDays = days.filter((day) => day.status !== "locked");
  const workoutDays = unlockedDays.filter(hasWorkoutSignal).length;
  const getWalkingThreshold = (day: GoalSpineDay) => {
    const goalSteps = toNumber(day.walkingStepGoal ?? day.stepGoal ?? day.targetSteps ?? day.dailyStepGoal) || 6000;
    return Math.min(5000, Math.max(1500, Math.round(goalSteps * 0.55)));
  };

  return unlockedDays.reduce(
    (stats, day) => {
      const range = getCalorieRangeStatus(day, goal);
      const achievedCalories = getDayCalories(day);
      const hasProgress = achievedCalories > 0 || getDayHydration(day) > 0 || getDaySteps(day) > 0 || hasWorkoutSignal(day);
      const mealCount = getMealCount(day);

      stats.trackedDays += hasProgress ? 1 : 0;
      stats.consistentDays += hasProgress ? 1 : 0;
      stats.rangeDays += range.status === "within" ? 1 : 0;
      stats.calorieFloorDays += range.status === "within" || range.status === "above" ? 1 : 0;
      stats.aboveRangeDays += range.status === "above" ? 1 : 0;
      stats.lowEnergyDays += achievedCalories > 0 && range.min > 0 && achievedCalories < range.min * 0.8 ? 1 : 0;
      stats.walkingDays += getDaySteps(day) >= getWalkingThreshold(day) ? 1 : 0;
      stats.proteinDays += mealCount >= 3 || (goal === "muscle_gain" && achievedCalories >= range.min * 0.85) ? 1 : 0;
      stats.mealConsistencyDays += mealCount >= 2 || (achievedCalories > 0 && achievedCalories >= range.min * 0.75) ? 1 : 0;
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
      workoutDays,
      workoutStreak: workoutDays,
      proteinDays: 0,
      mealConsistencyDays: 0,
    }
  );
};

const getPlannedCalories = (meals: FitFaatPlannedMeal[] = []) =>
  meals.reduce((sum, meal) => sum + toNumber(meal.calories), 0);

type PakistaniCatalogFood = {
  name?: string;
  food_name?: string;
  serving_size?: string;
  calories?: number;
  calories_kcal?: number;
  protein_g?: number;
  carbs_g?: number;
  carbohydrates_g?: number;
  fat_g?: number;
};

type PakistaniMealTemplate = {
  name: string;
  catalogFoods: string[];
  reason: string;
  timing: string;
  notes: string;
};

const normalizeCatalogFoodName = (value: string) =>
  value.trim().replace(/\s+/g, " ").toLowerCase();

const getCatalogFoodTitle = (food: PakistaniCatalogFood) =>
  String(food.food_name || food.name || "").trim();

const findCatalogFood = (foodName: string) => {
  const normalizedName = normalizeCatalogFoodName(foodName);
  const matches = (pakistaniDishes as PakistaniCatalogFood[]).filter(
    (food) => normalizeCatalogFoodName(getCatalogFoodTitle(food)) === normalizedName
  );

  return matches.find((food) => Boolean(food.serving_size)) || matches[0] || null;
};

const buildCatalogMealNutrition = (foodNames: string[]) => {
  const foods = foodNames
    .map((foodName) => findCatalogFood(foodName))
    .filter((food): food is PakistaniCatalogFood => Boolean(food));

  return {
    calories: round(foods.reduce((sum, food) => sum + toNumber(food.calories_kcal ?? food.calories), 0)),
    protein: round(foods.reduce((sum, food) => sum + toNumber(food.protein_g), 0)),
    carbs: round(foods.reduce((sum, food) => sum + toNumber(food.carbs_g ?? food.carbohydrates_g), 0)),
    fats: round(foods.reduce((sum, food) => sum + toNumber(food.fat_g), 0)),
    ingredients: foods.map(getCatalogFoodTitle).filter(Boolean),
  };
};

const mealTemplates: Record<GoalSpineKey, Record<MealPlanType, PakistaniMealTemplate>> = {
  weight_loss: {
    breakfast: {
      name: "Masala Omelette with Roti",
      catalogFoods: ["Masala Omelette", "Plain Roti"],
      reason: "A familiar breakfast with visible portions and enough protein to stay full.",
      timing: "Use this early so hunger does not stack at night.",
      notes: "Catalog-based breakfast using Search Food items.",
    },
    lunch: {
      name: "Daal Chawal",
      catalogFoods: ["Daal Chana", "Boiled White Rice"],
      reason: "Daal and rice keep lunch simple, filling, and easy to log from the Pakistani food list.",
      timing: "Best as the main daytime meal.",
      notes: "Uses Daal Chana and Boiled White Rice from Search Food.",
    },
    dinner: {
      name: "Roti with Sabzi",
      catalogFoods: ["Plain Roti", "Mixed Vegetable Curry"],
      reason: "A lighter dinner built around everyday roti sabzi keeps the calorie range practical.",
      timing: "Use when dinner needs to stay satisfying but controlled.",
      notes: "Uses Plain Roti and Mixed Vegetable Curry from Search Food.",
    },
    snack: {
      name: "Fruit Chaat",
      catalogFoods: ["Fruit Chaat"],
      reason: "A lighter local snack protects the range without feeling restrictive.",
      timing: "Mid-afternoon works best before cravings build.",
      notes: "Uses Fruit Chaat from Search Food.",
    },
  },
  muscle_gain: {
    breakfast: {
      name: "Paratha & Omelette",
      catalogFoods: ["Paratha", "Masala Omelette"],
      reason: "Paratha plus eggs gives training a familiar carb-and-protein base.",
      timing: "Use before a strength day or after a morning lift.",
      notes: "Uses Paratha and Masala Omelette from Search Food.",
    },
    lunch: {
      name: "Chicken Karahi with Naan",
      catalogFoods: ["Chicken Karahi", "Naan"],
      reason: "A protein-forward desi lunch with enough carbs to support progressive strength sessions.",
      timing: "Best 2-4 hours before training.",
      notes: "Uses Chicken Karahi and Naan from Search Food.",
    },
    dinner: {
      name: "Chicken Tikka Roti Plate",
      catalogFoods: ["Chicken Tikka Boti (Grilled)", "Plain Roti"],
      reason: "Grilled tikka adds a stronger protein signal while roti keeps dinner familiar.",
      timing: "Useful after late strength sessions.",
      notes: "Uses Chicken Tikka Boti (Grilled) and Plain Roti from Search Food.",
    },
    snack: {
      name: "Bun Kabab",
      catalogFoods: ["Bun Kabab"],
      reason: "A practical street-food snack can close an energy gap without feeling like a diet food.",
      timing: "Use after a workout or between meals.",
      notes: "Uses Bun Kabab from Search Food.",
    },
  },
  weight_gain: {
    breakfast: {
      name: "Anda Paratha with Yogurt",
      catalogFoods: ["Anda Paratha", "Yogurt (Dahi / Plain)"],
      reason: "A familiar, calorie-dense breakfast helps protect the surplus early.",
      timing: "Use early so surplus does not depend on dinner.",
      notes: "Uses Anda Paratha and Yogurt (Dahi / Plain) from Search Food.",
    },
    lunch: {
      name: "Chicken Biryani with Raita",
      catalogFoods: ["Chicken Biryani", "Mint Raita"],
      reason: "Biryani is familiar, calorie-useful, and easier to repeat than a forced fitness bowl.",
      timing: "Best as the steady midday anchor.",
      notes: "Uses Chicken Biryani and Mint Raita from Search Food.",
    },
    dinner: {
      name: "Mutton Karahi with Naan",
      catalogFoods: ["Mutton Karahi", "Naan"],
      reason: "A dense dinner gives weight gain enough calories without leaving Pakistani eating patterns.",
      timing: "Use after strength work or a low-intake day.",
      notes: "Uses Mutton Karahi and Naan from Search Food.",
    },
    snack: {
      name: "Yogurt with Dates",
      catalogFoods: ["Yogurt (Dahi / Plain)", "Dates (Khajoor)"],
      reason: "A small dahi-and-khajoor snack protects the surplus before the day gets late.",
      timing: "Mid-afternoon or before bed if appetite allows.",
      notes: "Uses Yogurt (Dahi / Plain) and Dates (Khajoor) from Search Food.",
    },
  },
  unset: {
    breakfast: {
      name: "Anda Paratha",
      catalogFoods: ["Anda Paratha"],
      reason: "A recognizable breakfast while FitFaat waits for a goal.",
      timing: "Use early to make the day readable.",
      notes: "Uses Anda Paratha from Search Food.",
    },
    lunch: {
      name: "Daal Chawal",
      catalogFoods: ["Daal Masoor", "Boiled White Rice"],
      reason: "A visible, everyday lunch helps FitFaat learn your rhythm.",
      timing: "Use as the daytime anchor.",
      notes: "Uses Daal Masoor and Boiled White Rice from Search Food.",
    },
    dinner: {
      name: "Roti with Sabzi",
      catalogFoods: ["Plain Roti", "Kaddu Ki Sabzi"],
      reason: "Dinner completes the day with a common roti-and-sabzi pattern.",
      timing: "Use when the day still needs a complete meal.",
      notes: "Uses Plain Roti and Kaddu Ki Sabzi from Search Food.",
    },
    snack: {
      name: "Chana Chaat",
      catalogFoods: ["Chana Chaat"],
      reason: "A small local snack keeps logging easy.",
      timing: "Use between meals.",
      notes: "Uses Chana Chaat from Search Food.",
    },
  },
};

const proteinPerCalorie: Record<GoalSpineKey, number> = {
  weight_loss: 0.065,
  muscle_gain: 0.075,
  weight_gain: 0.055,
  unset: 0.055,
};

const mealTypes: MealPlanType[] = ["breakfast", "lunch", "dinner", "snack"];

const buildCatalogSuggestion = (
  goal: GoalSpineKey,
  type: MealPlanType,
  isPremium: boolean
): GoalMealSuggestion => {
  const template = mealTemplates[goal][type];
  const nutrition = buildCatalogMealNutrition(template.catalogFoods);
  const catalogNote = nutrition.ingredients.length
    ? ` Catalog foods: ${nutrition.ingredients.join(", ")}.`
    : "";

  return {
    id: `${goal}-${type}`,
    type,
    name: template.name,
    calories: nutrition.calories,
    protein: nutrition.protein,
    carbs: nutrition.carbs,
    fats: nutrition.fats,
    ingredients: nutrition.ingredients,
    reason: template.reason,
    timing: template.timing,
    notes: `${template.notes}${catalogNote}`,
    premiumOnly: !isPremium && type === "snack",
    ctaLabel: isPremium ? "Use full plan" : "Save basic",
  };
};

export const buildGoalAdaptiveMealPlan = ({
  goal,
  targetDay,
  plannedMeals = [],
  isPremium = false,
}: {
  goal: unknown;
  targetDay?: GoalSpineDay | null;
  plannedMeals?: FitFaatPlannedMeal[];
  isPremium?: boolean;
}): GoalAdaptiveMealPlan => {
  const key = normalizeGoalSpineKey(goal);
  const option = getGoalSpineOption(key);
  const targetCalories = getTargetCalories(targetDay, key);
  const plannedCalories = getPlannedCalories(plannedMeals);
  const remainingCalories = Math.max(0, targetCalories - plannedCalories);
  const proteinTarget = round(targetCalories * proteinPerCalorie[key]);
  const suggestions = mealTypes.map((type) =>
    buildCatalogSuggestion(key, type, isPremium)
  );
  const groceryPreview = Array.from(
    new Set(suggestions.flatMap((suggestion) => suggestion.ingredients))
  ).slice(0, isPremium ? 12 : 5);

  const swaps: GoalMealSwap[] =
    key === "muscle_gain"
      ? [
          {
            id: "protein-swap",
            from: "Low-protein snack",
            to: "Bun Kabab",
            benefit: "Adds a practical local snack when training leaves an energy gap.",
            caloriesDelta: 160,
            proteinDelta: 12,
            premiumOnly: true,
          },
          {
            id: "training-fuel-swap",
            from: "Light lunch",
            to: "Chicken Karahi with Naan",
            benefit: "Adds familiar carbs and protein before lifting.",
            caloriesDelta: 230,
            proteinDelta: 20,
            premiumOnly: true,
          },
        ]
      : key === "weight_gain"
        ? [
            {
              id: "surplus-snack-swap",
              from: "Coffee-only gap",
              to: "Yogurt with Dates",
              benefit: "Adds an easy dahi-and-khajoor snack before appetite drops.",
              caloriesDelta: 180,
              proteinDelta: 5,
              premiumOnly: true,
            },
            {
              id: "dense-breakfast-swap",
              from: "Tea-only breakfast",
              to: "Anda Paratha with Yogurt",
              benefit: "Protects the surplus early in the day.",
              caloriesDelta: 385,
              proteinDelta: 14,
              premiumOnly: true,
            },
          ]
        : [
            {
              id: "range-swap",
              from: "Heavy fried dinner",
              to: "Roti with Sabzi",
              benefit: "Keeps dinner familiar while reducing calorie pressure.",
              caloriesDelta: -220,
              proteinDelta: 7,
              premiumOnly: true,
            },
            {
              id: "snack-swap",
              from: "Chips or sweets",
              to: "Fruit Chaat",
              benefit: "Creates a lighter snack that still feels local and planned.",
              caloriesDelta: -140,
              proteinDelta: 2,
              premiumOnly: true,
            },
          ];

  const snackTiming =
    key === "weight_loss"
      ? "Place the snack before the usual craving window."
      : key === "muscle_gain"
        ? "Place the snack after training or between protein gaps."
        : key === "weight_gain"
          ? "Place the snack early enough to protect the surplus."
          : "Use the snack when the day needs one more readable log.";

  return {
    goal: key,
    title:
      key === "unset"
        ? "Adaptive meal suggestions start after a goal is chosen"
        : `${option.label} meal suggestions`,
    body: isPremium
      ? `FitFaat picked these from the same Search Food catalog and checks them against ${getTargetRangeLabel(targetDay, key)}, protein, snack timing, and groceries.`
      : `Free suggestions show simple Pakistani goal-fit meals. Premium adds macros, swaps, and grocery automation.`,
    targetCalories,
    targetRangeLabel: getTargetRangeLabel(targetDay, key),
    plannedCalories,
    remainingCalories,
    proteinTarget,
    snackTiming,
    suggestions,
    swaps,
    groceryPreview,
  };
};

const workoutCycles: Record<GoalSpineKey, string[]> = {
  weight_loss: ["Cardio", "Upper Legs", "Waist", "Rest", "Cardio", "Back", "Rest"],
  muscle_gain: ["Chest", "Back", "Upper Arms", "Rest", "Upper Legs", "Shoulder", "Rest"],
  weight_gain: ["Upper Legs", "Chest", "Back", "Rest", "Shoulder", "Upper Arms", "Rest"],
  unset: ["Chest", "Back", "Upper Legs", "Rest", "Cardio", "Waist", "Rest"],
};

const workoutTitles: Record<GoalSpineKey, string> = {
  weight_loss: "Walking/cardio plus strength consistency",
  muscle_gain: "Progressive strength and recovery",
  weight_gain: "Strength-first surplus support",
  unset: "Balanced starter program",
};

const bodyPartForFocus = (focus: string) => {
  if (focus === "Rest") return "Rest";
  if (focus === "Cardio") return "Cardio";
  return focus;
};

const workoutHistoryDateKeys = (history: WorkoutHistoryLike[] = []) =>
  new Set(
    history
      .map((entry) => entry.completedAt ? getDateKey(entry.completedAt) : "")
      .filter(Boolean)
  );

export const buildGoalWorkoutProgram = ({
  goal,
  workoutHistory = [],
  isPremium = false,
  startDate = new Date(),
}: {
  goal: unknown;
  workoutHistory?: WorkoutHistoryLike[];
  isPremium?: boolean;
  startDate?: Date;
}): GoalWorkoutProgram => {
  const key = normalizeGoalSpineKey(goal);
  const option = getGoalSpineOption(key);
  const completedKeys = workoutHistoryDateKeys(workoutHistory);
  const weekStart = new Date(startDate);
  const diff = weekStart.getDay() === 0 ? -6 : 1 - weekStart.getDay();
  weekStart.setDate(weekStart.getDate() + diff);
  weekStart.setHours(0, 0, 0, 0);
  const todayKey = getDateKey(startDate);
  const sessions: GoalWorkoutSession[] = [];

  for (let week = 1; week <= 4; week += 1) {
    workoutCycles[key].forEach((focus, dayIndex) => {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + (week - 1) * 7 + dayIndex);
      const dateKey = getDateKey(date);
      const isRestDay = focus === "Rest";
      const intensity: GoalWorkoutSession["intensity"] = isRestDay
        ? "recovery"
        : week === 1
          ? "moderate"
          : week === 4
            ? "easy"
            : week === 3
              ? "hard"
              : "moderate";
      const durationMinutes = isRestDay
        ? 12
        : key === "weight_loss"
          ? focus === "Cardio" ? 35 + week * 3 : 24 + week * 2
          : key === "muscle_gain"
            ? 38 + week * 4
            : 34 + week * 3;

      sessions.push({
        id: `${key}-w${week}-d${dayIndex}`,
        week,
        dateKey,
        dayLabel: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][dayIndex],
        title: isRestDay ? "Recovery check" : `${focus} session`,
        focus,
        bodyPart: bodyPartForFocus(focus),
        intensity,
        durationMinutes,
        progressionCue: isRestDay
          ? "Keep the streak alive with mobility, breathing, or a walk."
          : key === "weight_loss"
            ? week >= 3 ? "Add a few minutes or one extra round if energy is good." : "Finish the session without chasing intensity."
            : key === "muscle_gain"
              ? week >= 2 ? "Add one set, a little load, or cleaner reps." : "Log the baseline so progression has a starting point."
              : week >= 2 ? "Keep strength first and avoid skipping the meal after." : "Start with clean form and enough rest.",
        recoveryCue: isRestDay
          ? "Recovery is part of the goal."
          : key === "muscle_gain"
            ? "Pair this with protein and sleep."
            : key === "weight_gain"
              ? "Pair this with a surplus-friendly meal."
              : "Pair this with water and a calm walk later.",
        isRestDay,
        isToday: dateKey === todayKey,
        isCompleted: completedKeys.has(dateKey),
      });
    });
  }

  return {
    goal: key,
    title: workoutTitles[key],
    body: isPremium
      ? `${option.label} gets a 4-week program with progression cues and recovery built in.`
      : `Free preview shows the goal focus. Premium unlocks the full progression calendar.`,
    progressionLabel:
      key === "muscle_gain"
        ? "Progressive overload"
        : key === "weight_gain"
          ? "Strength-first consistency"
          : key === "weight_loss"
            ? "Cardio plus strength rhythm"
            : "Balanced consistency",
    weeklyTarget:
      key === "muscle_gain"
        ? "3-4 strength sessions"
        : key === "weight_gain"
          ? "3 strength sessions + recovery"
          : key === "weight_loss"
            ? "2 cardio days + 2 strength touches"
            : "3 useful movement days",
    sessions,
  };
};

const buildAdjustment = (
  adjustment: GoalWeeklyAdjustment
): GoalWeeklyAdjustment => adjustment;

export const buildWeeklyGoalAdjustmentPlan = ({
  goal,
  days = [],
  today,
  summary,
  isPremium = false,
  weightTrendCaloriesAdjustment,
}: GoalAdaptivePlanInput): GoalWeeklyAdjustmentPlan => {
  const key = normalizeGoalSpineKey(goal);
  const option = getGoalSpineOption(key);
  const stats = summary?.stats || buildFallbackStats(key, days);
  const adjustments: GoalWeeklyAdjustment[] = [];
  const trackedDays = stats?.trackedDays || 0;
  const confidenceLabel = trackedDays < 2
    ? "Learning from early logs"
    : trackedDays < 5
      ? "Moderate confidence"
      : "High confidence";
  const calorieAdjustment =
    toNumber(weightTrendCaloriesAdjustment) ||
    toNumber((today as any)?.weightTrendCaloriesAdjustment) ||
    toNumber((summary as any)?.today?.weightTrendCaloriesAdjustment);

  if (key === "unset") {
    adjustments.push(buildAdjustment({
      id: "choose-goal",
      title: "Choose a goal first",
      body: "FitFaat can recommend meal, workout, and target changes after the goal is selected.",
      amountLabel: "Goal needed",
      actionLabel: "Choose goal",
      action: "goalReview",
      icon: "flag-outline",
      color: option.color,
    }));
  }

  if (isPremium && calorieAdjustment) {
    adjustments.push(buildAdjustment({
      id: "weight-trend-calorie-adjustment",
      title: calorieAdjustment > 0 ? `Add ${Math.abs(calorieAdjustment)} kcal` : `Trim ${Math.abs(calorieAdjustment)} kcal`,
      body: "Weight trend calibration suggests this change, but FitFaat will not apply it without you.",
      amountLabel: `${calorieAdjustment > 0 ? "+" : "-"}${Math.abs(calorieAdjustment)} kcal`,
      actionLabel: "Review",
      action: "goalReview",
      icon: "analytics-outline",
      color: option.color,
      premiumOnly: true,
    }));
  }

  if (summary?.review.status === "tooAggressive" || (stats?.lowEnergyDays || 0) >= 2) {
    adjustments.push(buildAdjustment({
      id: "reduce-pressure",
      title: "Reduce pressure",
      body: "The current rhythm may be too aggressive. Keep the goal, but make this week easier to repeat.",
      amountLabel: "Gentler week",
      actionLabel: "Review goal",
      action: "goalReview",
      icon: "warning-outline",
      color: "#EF4444",
    }));
  }

  if (key === "muscle_gain") {
    if ((stats?.proteinDays || 0) < 3) {
      adjustments.push(buildAdjustment({
        id: "increase-protein",
        title: "Increase protein target",
        body: "Add a protein anchor to two more days before changing calories.",
        amountLabel: "+20g protein",
        actionLabel: "Plan meal",
        action: "mealPlanner",
        icon: "nutrition-outline",
        color: option.color,
      }));
    }
    if ((stats?.workoutDays || 0) < 3) {
      adjustments.push(buildAdjustment({
        id: "add-strength-session",
        title: "Add 1 strength session",
        body: "Muscle gain needs training signal before the calorie plan can be judged fairly.",
        amountLabel: "+1 workout",
        actionLabel: "Workout",
        action: "workout",
        icon: "barbell-outline",
        color: option.color,
      }));
    }
  } else if (key === "weight_gain") {
    if ((stats?.calorieFloorDays || 0) < 4) {
      adjustments.push(buildAdjustment({
        id: "add-calories",
        title: "Add 150 kcal",
        body: "A small planned snack protects the surplus better than a late-day scramble.",
        amountLabel: "+150 kcal",
        actionLabel: "Plan snack",
        action: "mealPlanner",
        icon: "restaurant-outline",
        color: option.color,
      }));
    }
    if ((stats?.workoutDays || 0) < 2) {
      adjustments.push(buildAdjustment({
        id: "add-strength-for-gain",
        title: "Add 1 strength session",
        body: "Strength gives the surplus a better destination than scale gain alone.",
        amountLabel: "+1 workout",
        actionLabel: "Workout",
        action: "workout",
        icon: "barbell-outline",
        color: option.color,
      }));
    }
  } else if (key === "weight_loss") {
    if ((stats?.aboveRangeDays || 0) >= 2) {
      adjustments.push(buildAdjustment({
        id: "protect-range",
        title: "Tighten meal planning",
        body: "Plan one filling swap before trimming calories. The goal is fewer above-range days, not more pressure.",
        amountLabel: "Swap first",
        actionLabel: "Meal swaps",
        action: "mealPlanner",
        icon: "swap-horizontal-outline",
        color: option.color,
      }));
    }
    if ((stats?.walkingDays || 0) < 3) {
      adjustments.push(buildAdjustment({
        id: "add-walk",
        title: "Add 1 walking day",
        body: "A steady walk supports weight loss without making food targets harsher.",
        amountLabel: "+1 walk",
        actionLabel: "Steps",
        action: "steps",
        icon: "footsteps-outline",
        color: "#22C55E",
      }));
    }
  }

  if (!adjustments.length) {
    adjustments.push(buildAdjustment({
      id: "keep-plan",
      title: "Keep the plan",
      body: "Your current rhythm is useful. Hold targets steady before making them harder.",
      amountLabel: "No change",
      actionLabel: "Review",
      action: "goalReview",
      icon: "checkmark-circle-outline",
      color: "#10B981",
    }));
  }

  return {
    goal: key,
    statusLabel: summary?.review.label || "Learning",
    summary: isPremium
      ? "Premium adjustment plan uses goal progress, weekly logs, and trend signals."
      : "Free adjustment plan uses basic logs. Premium adds exact calorie/protein/workout recommendations.",
    confidenceLabel,
    adjustments: adjustments.slice(0, isPremium ? 4 : 3),
  };
};

const getEarliestDayDate = (days: GoalSpineDay[] = []) =>
  days
    .map((day) => getDateKey(day.date))
    .filter(Boolean)
    .sort()[0] || getDateKey();

const readTimelineStorage = async (): Promise<TimelineStorage> => {
  try {
    const raw = await AsyncStorage.getItem(GOAL_TIMELINE_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
};

const writeTimelineStorage = async (value: TimelineStorage) => {
  await AsyncStorage.setItem(GOAL_TIMELINE_STORAGE_KEY, JSON.stringify(value));
};

export const loadGoalTimelineStart = async (
  goal: unknown,
  days: GoalSpineDay[] = []
) => {
  const key = normalizeGoalSpineKey(goal);
  const today = getDateKey();
  if (key === "unset") return today;

  const storage = await readTimelineStorage();
  const startedAtByGoal = storage.startedAtByGoal || {};
  const shouldReset = storage.activeGoal && storage.activeGoal !== key;
  const startedAt = shouldReset
    ? today
    : startedAtByGoal[key] || getEarliestDayDate(days);

  await writeTimelineStorage({
    activeGoal: key,
    startedAtByGoal: {
      ...startedAtByGoal,
      [key]: startedAt,
    },
  });

  return startedAt;
};

export const buildGoalTimelineSummary = ({
  goal,
  startedAt,
  days = [],
  summary,
}: {
  goal: unknown;
  startedAt?: string | null;
  days?: GoalSpineDay[];
  summary?: GoalSpineSummary | null;
}): GoalTimelineSummary => {
  const key = normalizeGoalSpineKey(goal);
  const option = getGoalSpineOption(key);
  const start = getDateKey(startedAt || getEarliestDayDate(days));
  const diffDays = Math.max(
    0,
    Math.floor((parseDateKey(getDateKey()).getTime() - parseDateKey(start).getTime()) / DAY_MS)
  );
  const weeksIntoGoal = key === "unset" ? 0 : Math.max(1, Math.floor(diffDays / 7) + 1);
  const progress = summary?.weeklyProgress.progress || 0;
  const projectedDays = Math.round((progress / 100) * 30);
  const expectedDirection =
    key === "weight_loss"
      ? "Expected direction this month: more healthy-range days and a gentle downward trend."
      : key === "muscle_gain"
        ? "Expected direction this month: stronger protein and workout signals before scale judgment."
        : key === "weight_gain"
          ? "Expected direction this month: steadier surplus days with strength support."
          : "Expected direction appears after you choose a goal.";

  return {
    goal: key,
    startedAt: start,
    weeksIntoGoal,
    headline:
      key === "unset"
        ? "Choose a goal to start your timeline"
        : `You are ${weeksIntoGoal} week${weeksIntoGoal === 1 ? "" : "s"} into ${option.label}`,
    expectedDirection,
    projection:
      key === "unset"
        ? "Projected progress appears after your first goal week."
        : `If this rhythm continues, FitFaat projects about ${projectedDays}/30 goal-supporting days this month.`,
    confidenceLabel:
      (summary?.stats.trackedDays || 0) < 2
        ? "Low-data projection"
        : (summary?.stats.trackedDays || 0) < 5
          ? "Building confidence"
          : "Useful projection",
  };
};

export const loadGoalTimelineSummary = async ({
  goal,
  days = [],
  summary,
}: {
  goal: unknown;
  days?: GoalSpineDay[];
  summary?: GoalSpineSummary | null;
}) => {
  const startedAt = await loadGoalTimelineStart(goal, days);
  return buildGoalTimelineSummary({ goal, days, summary, startedAt });
};

export const buildGoalProgressInterpretation = ({
  goal,
  days = [],
  today,
  summary,
  isPremium = false,
}: GoalAdaptivePlanInput): GoalProgressInterpretation => {
  const key = normalizeGoalSpineKey(goal);
  const option = getGoalSpineOption(key);
  const stats = summary?.stats || buildFallbackStats(key, days);
  const trackedDays = stats.trackedDays;
  const statusLabel = summary?.review.label || (trackedDays < 2 ? "Learning" : "Needs adjustment");
  const helping: string[] = [];
  const blocking: string[] = [];

  if (key === "weight_loss") {
    if (stats.rangeDays > 0) helping.push(`${stats.rangeDays} healthy-range day${stats.rangeDays === 1 ? "" : "s"}`);
    if (stats.walkingDays > 0) helping.push(`${stats.walkingDays} walking day${stats.walkingDays === 1 ? "" : "s"}`);
    if (stats.aboveRangeDays > 0) blocking.push(`${stats.aboveRangeDays} above-range day${stats.aboveRangeDays === 1 ? "" : "s"}`);
    if (!getMealCount(today)) blocking.push("meal logging is still thin today");
  } else if (key === "muscle_gain") {
    if (stats.workoutDays > 0) helping.push(`${stats.workoutDays} workout signal${stats.workoutDays === 1 ? "" : "s"}`);
    if (stats.proteinDays > 0) helping.push(`${stats.proteinDays} protein day${stats.proteinDays === 1 ? "" : "s"}`);
    if (stats.workoutDays < 3) blocking.push("not enough strength sessions yet");
    if (stats.proteinDays < 3) blocking.push("protein signal needs more logs");
  } else if (key === "weight_gain") {
    if (stats.calorieFloorDays > 0) helping.push(`${stats.calorieFloorDays} surplus-supporting day${stats.calorieFloorDays === 1 ? "" : "s"}`);
    if (stats.mealConsistencyDays > 0) helping.push(`${stats.mealConsistencyDays} meal consistency day${stats.mealConsistencyDays === 1 ? "" : "s"}`);
    if (stats.calorieFloorDays < 4) blocking.push("calorie floor is not protected often enough");
    if (stats.workoutDays < 2) blocking.push("strength signal is still light");
  } else {
    blocking.push("goal is not selected yet");
  }

  if (!helping.length && trackedDays > 0) helping.push("your logs are making the week readable");
  if (!blocking.length) blocking.push("no major blocker stands out yet");

  return {
    goal: key,
    statusLabel,
    answer:
      trackedDays < 2
        ? `FitFaat is still learning your ${option.label.toLowerCase()} rhythm.`
        : summary?.review.status === "onTrack"
          ? `Yes. You are on track for ${option.label}.`
          : `Not fully yet. ${option.label} needs one clearer signal this week.`,
    helping: helping.slice(0, isPremium ? 4 : 2),
    blocking: blocking.slice(0, isPremium ? 4 : 2),
    nextBestStep: summary?.nextAction.title || "Log one meal and water entry",
    confidenceLabel:
      trackedDays < 2
        ? "Learning from your first logs"
        : isPremium
          ? "Premium interpretation uses food, water, workouts, and walking"
          : "Basic interpretation uses core food, water, and progress logs",
  };
};

export const getGoalOutcomePremiumCopy = (
  goal: unknown,
  feature: PremiumFeature
) => {
  const key = normalizeGoalSpineKey(goal);
  if (feature === "mealPlannerPro") {
    if (key === "muscle_gain") return "Goal-based meal swaps, protein targets, and workout-fuel planning are included for everyone.";
    if (key === "weight_gain") return "Surplus meal swaps, planned snacks, and grocery automation are included for everyone.";
    return "Range-friendly meal swaps, macro targets, and grocery automation are included for everyone.";
  }
  if (feature === "workoutModule") {
    if (key === "muscle_gain") return "Unlock muscle gain workout progression with recovery cues.";
    if (key === "weight_gain") return "Unlock strength-first progression that supports your surplus.";
    return "Unlock cardio-plus-strength programming that supports healthy range days.";
  }
  if (feature === "advancedCharts") {
    return "Advanced charts and weekly interpretation are included for everyone.";
  }
  if (feature === "nutritionInsights") {
    return "Upgrade to see what is helping, what is blocking progress, and what to adjust next week.";
  }
  if (feature === "adaptiveGoalsPro") {
    return "Upgrade to get a weekly goal adjustment plan with calorie, protein, and workout recommendations.";
  }
  return "Premium connects this feature directly to your selected goal outcome.";
};

export const runGoalAdaptivePlanQaCases = () => {
  const sampleDays: GoalSpineDay[] = [
    {
      dayNo: 1,
      date: "2026-05-20",
      status: "finished",
      achievedCalories: 2100,
      targetCalories: 2200,
      targetCaloriesMin: 2050,
      targetCaloriesMax: 2350,
      walkingSteps: 6200,
      exerciseCaloriesBurned: 0,
      meals: [{}, {}],
    },
    {
      dayNo: 2,
      date: "2026-05-21",
      status: "finished",
      achievedCalories: 1700,
      targetCalories: 2200,
      targetCaloriesMin: 2050,
      targetCaloriesMax: 2350,
      exerciseCaloriesBurned: 220,
      meals: [{}],
    },
  ];
  const weightLossMeal = buildGoalAdaptiveMealPlan({ goal: "weight_loss", targetDay: sampleDays[0], isPremium: false });
  const muscleMeal = buildGoalAdaptiveMealPlan({ goal: "muscle_gain", targetDay: sampleDays[0], isPremium: true });
  const workout = buildGoalWorkoutProgram({ goal: "muscle_gain", workoutHistory: [{ completedAt: "2026-05-20" }], isPremium: true });
  const timeline = buildGoalTimelineSummary({ goal: "weight_loss", startedAt: "2026-05-01", days: sampleDays });
  const fakeSummary = {
    goal: getGoalSpineOption("muscle_gain"),
    stats: {
      trackedDays: 4,
      proteinDays: 1,
      workoutDays: 1,
      rangeDays: 0,
      walkingDays: 0,
      aboveRangeDays: 0,
      lowEnergyDays: 0,
      calorieFloorDays: 1,
      mealConsistencyDays: 1,
      consistentDays: 3,
      totalDays: 7,
      workoutStreak: 1,
    },
    review: { label: "Needs adjustment", status: "needsAdjustment" },
    weeklyProgress: { progress: 35 },
    nextAction: { title: "Add one strength session" },
  } as unknown as GoalSpineSummary;
  const adjustment = buildWeeklyGoalAdjustmentPlan({ goal: "muscle_gain", summary: fakeSummary, isPremium: true });
  const interpretation = buildGoalProgressInterpretation({ goal: "muscle_gain", summary: fakeSummary, days: sampleDays, isPremium: true });

  return [
    {
      name: "meal recommendations change by goal",
      passed: weightLossMeal.suggestions[0].name !== muscleMeal.suggestions[0].name,
    },
    {
      name: "premium meal plan includes grocery depth",
      passed: muscleMeal.groceryPreview.length > weightLossMeal.groceryPreview.length,
    },
    {
      name: "workout program prioritizes muscle strength",
      passed: workout.sessions.some((session) => session.focus === "Chest") && workout.weeklyTarget.includes("strength"),
    },
    {
      name: "weekly adjustment recommends strength",
      passed: adjustment.adjustments.some((item) => item.amountLabel.includes("workout")),
    },
    {
      name: "goal timeline reports weeks into goal",
      passed: timeline.headline.includes("weeks into Weight Loss") || timeline.headline.includes("week into Weight Loss"),
    },
    {
      name: "progress interpretation names blockers",
      passed: interpretation.blocking.some((item) => item.includes("strength") || item.includes("protein")),
    },
  ];
};
