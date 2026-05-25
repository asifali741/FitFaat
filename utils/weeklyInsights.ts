import {
  getDashboardGoalProgress,
  getHydrationValue,
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
  icon:
    | "water-outline"
    | "flame-outline"
    | "trophy-outline"
    | "calendar-clear-outline"
    | "trending-up-outline"
    | "document-text-outline";
};

type InsightDay = {
  dayNo?: number;
  date?: string;
  status?: string;
  achievedCalories?: number;
  targetCalories?: number;
  achieviedHydration?: number;
  achievedHydration?: number;
  targetHydration?: number;
  walkingSteps?: number;
  steps?: number;
  stepCount?: number;
};

const average = (values: number[]) => {
  const cleanValues = values.filter((value) => Number.isFinite(value));
  if (!cleanValues.length) return 0;
  return cleanValues.reduce((sum, value) => sum + value, 0) / cleanValues.length;
};

const dayLabel = (day?: InsightDay | null) =>
  day?.dayNo ? `Day ${day.dayNo}` : "This day";

const hasSignal = (day: InsightDay) =>
  getProgressValue(day.achievedCalories) > 0 ||
  getHydrationValue(day) > 0 ||
  getProgressValue(day.walkingSteps ?? day.steps ?? day.stepCount) > 0;

const isUnlockedDay = (day: InsightDay) =>
  day && String(day.status || "").toLowerCase() !== "locked";

export const buildWeeklyInsights = (days: InsightDay[]): WeeklyInsight[] => {
  const unlockedDays = days.filter(isUnlockedDay);

  if (!unlockedDays.length) {
    return [
      {
        id: "no-data",
        title: "Start with one useful log",
        body: "One meal and one water entry are enough for FitFaat to explain the week.",
        value: "0 days",
        tone: "neutral",
        icon: "document-text-outline",
      },
    ];
  }

  const trackedDays = unlockedDays.filter(hasSignal);
  const firstHalf = unlockedDays.slice(0, Math.max(1, Math.ceil(unlockedDays.length / 2)));
  const secondHalf = unlockedDays.slice(firstHalf.length);
  const firstHydration = average(firstHalf.map(getHydrationValue));
  const secondHydration = average((secondHalf.length ? secondHalf : firstHalf).map(getHydrationValue));
  const hydrationChange =
    firstHydration > 0 ? Math.round(((secondHydration - firstHydration) / firstHydration) * 100) : 0;

  const lowCalorieDays = unlockedDays.filter((day) => {
    const calories = getProgressValue(day.achievedCalories);
    const target = getProgressValue(day.targetCalories);
    if (target <= 0) return calories <= 0;
    return getSingleMetricProgress(calories, target) < 85;
  });
  const missedDays = unlockedDays.filter((day) => !hasSignal(day));
  const bestDay = [...unlockedDays].sort(
    (left, right) => getDashboardGoalProgress(right) - getDashboardGoalProgress(left)
  )[0];
  const trend = getWeeklyHealthScoreTrend(unlockedDays, true);
  const averageGoal = Math.round(average(unlockedDays.map(getDashboardGoalProgress)));
  const insights: WeeklyInsight[] = [];

  insights.push({
    id: "hydration-change",
    title: hydrationChange >= 0 ? "Hydration improved" : "Hydration dipped",
    body:
      hydrationChange >= 0
        ? `Your later-week hydration average is ${Math.abs(hydrationChange)}% higher than the start.`
        : `Your later-week hydration average is ${Math.abs(hydrationChange)}% lower than the start.`,
    value: `${hydrationChange >= 0 ? "+" : "-"}${Math.abs(hydrationChange)}%`,
    tone: hydrationChange >= 0 ? "good" : "warning",
    icon: "water-outline",
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
  });

  insights.push({
    id: "best-day",
    title: "Best day",
    body: `${dayLabel(bestDay)} had the strongest goal progress this week.`,
    value: bestDay ? `${Math.round(getDashboardGoalProgress(bestDay))}%` : "--",
    tone: "good",
    icon: "trophy-outline",
  });

  insights.push({
    id: "missed-days",
    title: missedDays.length ? "Missed tracking days" : "Tracking stayed consistent",
    body: missedDays.length
      ? `${missedDays.length} unlocked day${missedDays.length === 1 ? "" : "s"} had no meal, water, or step signal.`
      : `${trackedDays.length} tracked day${trackedDays.length === 1 ? "" : "s"} kept the week readable.`,
    value: `${missedDays.length}`,
    tone: missedDays.length > 1 ? "warning" : "good",
    icon: "calendar-clear-outline",
  });

  insights.push({
    id: "goal-trend",
    title: "Goal trend",
    body: `The week averages ${averageGoal}% goal progress. ${trend.label}.`,
    value: `${averageGoal}%`,
    tone: averageGoal >= 75 ? "good" : averageGoal >= 45 ? "neutral" : "warning",
    icon: "trending-up-outline",
  });

  return insights;
};

