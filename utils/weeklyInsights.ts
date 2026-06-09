import {
  getDashboardHealthScore,
  getDashboardGoalProgress,
  getProgressValue,
  getSingleMetricProgress,
  getWeeklyHealthScoreTrend,
} from "@/utils/dashboardProgress";

export type WeeklyInsightTone = "good" | "warning" | "neutral";

export type WeeklyInsight = {
  id: string;
  title: string;
  body: string;
  value?: string;
  tone: WeeklyInsightTone;
  category?: "basic" | "premiumPattern" | "premiumTeaser";
  premiumOnly?: boolean;
  icon:
    | "water-outline"
    | "flame-outline"
    | "trophy-outline"
    | "calendar-clear-outline"
    | "trending-up-outline"
    | "document-text-outline"
    | "barbell-outline"
    | "footsteps-outline"
    | "compass-outline"
    | "diamond-outline";
};

type InsightDay = {
  dayNo?: number;
  dayNumber?: number;
  date?: string;
  dateKey?: string;
  updatedAt?: string;
  createdAt?: string;
  status?: string;
  achievedCalories?: number;
  calorieIntake?: number;
  caloriesIntake?: number;
  targetCalories?: number;
  achieviedHydration?: number;
  achievedHydration?: number;
  hydrationIntake?: number;
  targetHydration?: number;
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
  [key: string]: any;
};

type WeeklyInsightOptions = {
  isPremium?: boolean;
};

const average = (values: number[]) => {
  const cleanValues = values.filter((value) => Number.isFinite(value));
  if (!cleanValues.length) return 0;
  return cleanValues.reduce((sum, value) => sum + value, 0) / cleanValues.length;
};

const getDateKey = (value?: string | Date | null) => {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getTodayDateKey = () => getDateKey(new Date());

const dayLabel = (day?: InsightDay | null) =>
  day?.dayNo ? `Day ${day.dayNo}` : "This day";

const sumMealCalories = (meals: unknown) =>
  Array.isArray(meals)
    ? meals.reduce(
        (sum, meal: any) =>
          sum + Math.round(getProgressValue(meal?.calories ?? meal?.kcal ?? meal?.totalCalories)),
        0
      )
    : 0;

const sumWaterIntake = (waterIntake: unknown) =>
  Array.isArray(waterIntake)
    ? waterIntake.reduce(
        (sum, entry: any) =>
          sum + getProgressValue(entry?.amount ?? entry?.liters ?? entry?.litres ?? entry?.hydrationAmount),
        0
      )
    : 0;

const getDayCalories = (day: InsightDay) => {
  const directCalories = [
    day.achievedCalories,
    day.calorieIntake,
    day.caloriesIntake,
  ]
    .map(getProgressValue)
    .find((value) => value > 0);

  return Math.round(directCalories ?? sumMealCalories(day.meals));
};

const getDayHydration = (day: InsightDay) => {
  const directHydration = [
    day.achieviedHydration,
    day.achievedHydration,
    day.hydrationIntake,
  ]
    .map(getProgressValue)
    .find((value) => value > 0);

  return directHydration ?? sumWaterIntake(day.waterIntake);
};

const normalizeInsightDay = (day: InsightDay): InsightDay => {
  const calories = getDayCalories(day);
  const hydration = getDayHydration(day);

  return {
    ...day,
    dayNo: day.dayNo ?? day.dayNumber,
    dateKey: day.dateKey || getDateKey(day.date),
    achievedCalories: calories,
    calorieIntake: calories,
    caloriesIntake: calories,
    achieviedHydration: hydration,
    achievedHydration: hydration,
    hydrationIntake: hydration,
  };
};

const hasSignal = (day: InsightDay) =>
  getDayCalories(day) > 0 ||
  getDayHydration(day) > 0 ||
  getProgressValue(day.walkingSteps ?? day.steps ?? day.stepCount) > 0;

const isUnlockedDay = (day: InsightDay) =>
  day && String(day.status || "").toLowerCase() !== "locked";

const isMissedDay = (day: InsightDay) => {
  if (hasSignal(day)) return false;

  const status = String(day.status || "").toLowerCase();
  if (status === "finished" || status === "completed") return true;

  const dateKey = day.dateKey || getDateKey(day.date);
  return Boolean(dateKey && dateKey < getTodayDateKey());
};

const isScorableDay = (day: InsightDay) => hasSignal(day) || isMissedDay(day);

const getDaySortTime = (day: InsightDay) => {
  const dateKey = day.dateKey || getDateKey(day.date);
  const dateTime = dateKey ? new Date(`${dateKey}T12:00:00`).getTime() : 0;
  if (Number.isFinite(dateTime) && dateTime > 0) return dateTime;
  return getProgressValue(day.dayNo ?? day.dayNumber);
};

const sortInsightDays = (days: InsightDay[]) =>
  [...days].sort((left, right) => getDaySortTime(left) - getDaySortTime(right));

const getDaySteps = (day: InsightDay) =>
  getProgressValue(day.walkingSteps ?? day.steps ?? day.stepCount);

const getWorkoutSignal = (day: InsightDay) =>
  getProgressValue(day.exerciseCaloriesBurned) > 0 ||
  getProgressValue(day.exerciseDurationSeconds) > 0 ||
  (Array.isArray(day.exerciseEntries) && day.exerciseEntries.length > 0);

const getMetricLabel = (key: string) => {
  if (key === "calories") return "calories";
  if (key === "hydration") return "hydration";
  if (key === "workout") return "workout";
  if (key === "walking") return "walking";
  if (key === "steps" || key === "stepsPreview") return "steps";
  return "progress";
};

const getMetricFocusAction = (key?: string) => {
  if (key === "hydration") return "Start each day with a water log before the afternoon dip.";
  if (key === "calories") return "Log the first meal earlier so calorie progress is visible before night.";
  if (key === "workout") return "Schedule one short workout and log it, even if it is light.";
  if (key === "walking") return "Keep motion permission on and finish one steady walk window.";
  return "Protect the basics: one meal log and one water log each day.";
};

const formatLiters = (value: number) => {
  const rounded = Math.round(value * 10) / 10;
  return `${rounded % 1 === 0 ? Math.round(rounded) : rounded}L`;
};

const buildPremiumPatternInsights = (unlockedDays: InsightDay[]): WeeklyInsight[] => {
  const normalizedDays = sortInsightDays(unlockedDays.map(normalizeInsightDay));
  const scorableDays = normalizedDays.filter(isScorableDay);
  if (!scorableDays.length) return [];

  const firstHalf = scorableDays.slice(0, Math.max(1, Math.ceil(scorableDays.length / 2)));
  const secondHalf = scorableDays.slice(firstHalf.length);
  const comparisonDays = secondHalf.length ? secondHalf : firstHalf;
  const firstScore = Math.round(average(firstHalf.map((day) => getDashboardHealthScore(day, true).healthScore)));
  const secondScore = Math.round(average(comparisonDays.map((day) => getDashboardHealthScore(day, true).healthScore)));
  const scoreDelta = secondScore - firstScore;
  const workoutDays = normalizedDays.filter(getWorkoutSignal).length;
  const walkingDays = normalizedDays.filter((day) => getDaySteps(day) > 0).length;
  const weakMetric = scorableDays
    .flatMap((day) =>
      getDashboardHealthScore(day, true).metrics
        .filter((metric) => metric.weight > 0 && metric.hasTarget)
        .map((metric) => ({ metric }))
    )
    .sort((a, b) => a.metric.rawContribution - b.metric.rawContribution)[0];
  const weakLabel = weakMetric ? getMetricLabel(weakMetric.metric.key) : null;
  const missedDays = normalizedDays.filter(isMissedDay).length;

  return [
    {
      id: "premium-score-pattern",
      title: scoreDelta >= 0 ? "What improved" : "What slipped",
      body:
        scoreDelta >= 0
          ? `Later-week Full Health Score averaged ${Math.abs(scoreDelta)} points higher than the start.`
          : `Later-week Full Health Score averaged ${Math.abs(scoreDelta)} points lower than the start.`,
      value: `${scoreDelta >= 0 ? "+" : "-"}${Math.abs(scoreDelta)}`,
      tone: scoreDelta >= 0 ? "good" : "warning",
      icon: "trending-up-outline",
      category: "premiumPattern",
      premiumOnly: true,
    },
    {
      id: "premium-lower-driver",
      title: "What lowered the score",
      body: weakLabel
        ? `The weakest full-lifestyle signal was ${weakLabel}, so it had the clearest drag on the week.`
        : "No full-lifestyle signal was clearly behind this week.",
      value: weakMetric ? `${Math.round(weakMetric.metric.rawContribution)}%` : "Steady",
      tone: weakMetric && weakMetric.metric.rawContribution < 60 ? "warning" : "neutral",
      icon: "compass-outline",
      category: "premiumPattern",
      premiumOnly: true,
    },
    {
      id: "premium-lifestyle-pattern",
      title: "Lifestyle pattern",
      body: `Premium saw workout signals on ${workoutDays} day${workoutDays === 1 ? "" : "s"} and walking signals on ${walkingDays} day${walkingDays === 1 ? "" : "s"}.`,
      value: `${workoutDays}/${walkingDays}`,
      tone: workoutDays || walkingDays >= 3 ? "good" : "neutral",
      icon: workoutDays ? "barbell-outline" : "footsteps-outline",
      category: "premiumPattern",
      premiumOnly: true,
    },
    {
      id: "premium-next-week-focus",
      title: "Next week focus",
      body: missedDays > 1
        ? `Recover ${missedDays} missed tracking days first; Premium patterns get stronger when the basics are consistent.`
        : getMetricFocusAction(weakMetric?.metric.key),
      value: missedDays > 1 ? `${missedDays} missed` : "1 focus",
      tone: missedDays > 1 || (weakMetric && weakMetric.metric.rawContribution < 60) ? "warning" : "good",
      icon: "diamond-outline",
      category: "premiumPattern",
      premiumOnly: true,
    },
  ];
};

export const buildWeeklyInsights = (
  days: InsightDay[],
  options: WeeklyInsightOptions = {}
): WeeklyInsight[] => {
  const unlockedDays = sortInsightDays(days.filter(isUnlockedDay).map(normalizeInsightDay));
  const isPremium = Boolean(options.isPremium);

  if (!unlockedDays.length) {
    return [
      {
        id: "no-data",
        title: "Start with one useful log",
        body: "One meal and one water entry are enough for FitFaat to explain the week.",
        value: "0 days",
        tone: "neutral",
        icon: "document-text-outline",
        category: "basic",
      },
    ];
  }

  const trackedDays = unlockedDays.filter(hasSignal);
  const scorableDays = unlockedDays.filter(isScorableDay);
  const firstHalf = scorableDays.slice(0, Math.max(1, Math.ceil(scorableDays.length / 2)));
  const secondHalf = scorableDays.slice(firstHalf.length);
  const firstHydration = average(firstHalf.map(getDayHydration));
  const secondHydration = average((secondHalf.length ? secondHalf : firstHalf).map(getDayHydration));
  const hydrationHasComparison = firstHydration > 0;
  const hydrationChange = hydrationHasComparison
    ? Math.round(((secondHydration - firstHydration) / firstHydration) * 100)
    : secondHydration > 0
      ? 100
      : 0;

  const lowCalorieDays = scorableDays.filter((day) => {
    const calories = getDayCalories(day);
    const target = getProgressValue(day.targetCalories);
    if (target <= 0) return false;
    return getSingleMetricProgress(calories, target) < 85;
  });
  const missedDays = unlockedDays.filter(isMissedDay);
  const bestDay = [...scorableDays].sort(
    (left, right) => getDashboardGoalProgress(right) - getDashboardGoalProgress(left)
  )[0];
  const trend = getWeeklyHealthScoreTrend(scorableDays, true);
  const averageGoal = Math.round(average(scorableDays.map((day) => getDashboardGoalProgress(day))));
  const insights: WeeklyInsight[] = [];

  insights.push({
    id: "hydration-change",
    title:
      !scorableDays.length || (!firstHydration && !secondHydration)
        ? "Hydration needs a log"
        : hydrationHasComparison
          ? hydrationChange >= 0 ? "Hydration improved" : "Hydration dipped"
          : "Hydration started",
    body:
      !scorableDays.length || (!firstHydration && !secondHydration)
        ? "No water logs are available yet this week."
        : hydrationHasComparison
          ? hydrationChange >= 0
            ? `Your later-week hydration average is ${Math.abs(hydrationChange)}% higher than the start.`
            : `Your later-week hydration average is ${Math.abs(hydrationChange)}% lower than the start.`
          : `No early-week water average was available; later-week hydration averaged ${formatLiters(secondHydration)}.`,
    value: hydrationHasComparison
      ? `${hydrationChange >= 0 ? "+" : "-"}${Math.abs(hydrationChange)}%`
      : secondHydration > 0
        ? formatLiters(secondHydration)
        : "0L",
    tone: !firstHydration && !secondHydration ? "warning" : hydrationChange >= 0 ? "good" : "warning",
    icon: "water-outline",
    category: "basic",
  });

  insights.push({
    id: "calorie-low-days",
    title: lowCalorieDays.length ? "Calories ran low" : "Calories stayed visible",
    body: lowCalorieDays.length
      ? `Calories were below 85% of target on ${lowCalorieDays.length} day${lowCalorieDays.length === 1 ? "" : "s"}.`
      : "No unlocked day was far below the calorie target.",
    value: `${lowCalorieDays.length} day${lowCalorieDays.length === 1 ? "" : "s"}`,
    tone: lowCalorieDays.length >= 3 ? "warning" : "neutral",
    icon: "flame-outline",
    category: "basic",
  });

  insights.push({
    id: "best-day",
    title: "Best day",
    body: bestDay
      ? `${dayLabel(bestDay)} had the strongest goal progress this week.`
      : "Log calories or water once to identify the strongest day.",
    value: bestDay ? `${Math.round(getDashboardGoalProgress(bestDay))}%` : "--",
    tone: bestDay ? "good" : "neutral",
    icon: "trophy-outline",
    category: "basic",
  });

  insights.push({
    id: "missed-days",
    title: missedDays.length ? "Missed tracking days" : "Tracking stayed consistent",
    body: missedDays.length
      ? `${missedDays.length} unlocked day${missedDays.length === 1 ? "" : "s"} had no meal, water, or step signal.`
      : trackedDays.length
        ? `${trackedDays.length} tracked day${trackedDays.length === 1 ? "" : "s"} kept the week readable.`
        : "No missed completed days yet; add one meal or water log to start tracking.",
    value: `${missedDays.length}`,
    tone: missedDays.length > 1 ? "warning" : trackedDays.length ? "good" : "neutral",
    icon: "calendar-clear-outline",
    category: "basic",
  });

  insights.push({
    id: "goal-trend",
    title: "Goal trend",
    body: scorableDays.length
      ? `The week averages ${averageGoal}% goal progress. ${trend.label}.`
      : "No scored days yet. Add calories or water to start the weekly trend.",
    value: scorableDays.length ? `${averageGoal}%` : "--",
    tone: scorableDays.length
      ? averageGoal >= 75 ? "good" : averageGoal >= 45 ? "neutral" : "warning"
      : "neutral",
    icon: "trending-up-outline",
    category: "basic",
  });

  if (isPremium) {
    return [...buildPremiumPatternInsights(unlockedDays), ...insights];
  }

  return [
    ...insights,
    {
      id: "premium-pattern-preview",
      title: "Premium understands patterns",
      body: "Upgrade to connect calories, hydration, workouts, and walking into weekly lifestyle explanations.",
      value: "Premium",
      tone: "neutral",
      icon: "diamond-outline",
      category: "premiumTeaser",
      premiumOnly: true,
    },
  ];
};

