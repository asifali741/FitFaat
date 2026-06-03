import { getDashboardLocalDateKey } from "@/utils/dashboardCycleGuard";
import { getExerciseCaloriesBurned } from "@/utils/localExerciseProgress";
import { getWalkingCaloriesBurned } from "@/utils/localWalkingProgress";

import type { Day, jsonResponse } from "./types";

export type DashboardStreakSummary = {
  streakCount: number;
  longestStreak: number;
  message: string;
  streakPercentage: number;
  weeklyGoalDays: number;
  shouldSendReminder: boolean;
};

export const parseDashboardDate = (date?: string) => {
  if (!date) return null;
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const startOfLocalDay = (date: Date) => {
  const nextDate = new Date(date);
  nextDate.setHours(0, 0, 0, 0);
  return nextDate;
};

export const getDashboardWeekHydrationValue = (day: Day) =>
  Number(day.achieviedHydration ?? (day as any).achievedHydration ?? 0);

const hasDayProgress = (day: Day, includeExercise = false) =>
  Number(day.achievedCalories || 0) > 0 ||
  getDashboardWeekHydrationValue(day) > 0 ||
  (includeExercise &&
    (getExerciseCaloriesBurned(day) > 0 || getWalkingCaloriesBurned(day) > 0));

const isStreakProgressDay = (day: Day, includeExercise = false) =>
  day.status === "finished" ||
  (day.status === "active" && hasDayProgress(day, includeExercise));

export const sortByDayDate = (a: Day, b: Day) => {
  const aDate = parseDashboardDate(a.date);
  const bDate = parseDashboardDate(b.date);
  if (aDate && bDate) return aDate.getTime() - bDate.getTime();
  return a.dayNo - b.dayNo;
};

export const getDashboardTargetDay = (days: Day[]) => {
  const todayKey = getDashboardLocalDateKey();
  return (
    days.find((day) => day.status === "active") ||
    days.find((day) => getDashboardLocalDateKey(day.date) === todayKey) ||
    days.find((day) => day.status !== "locked") ||
    days[0] ||
    null
  );
};

/**
 * Counts from the latest unlocked day so future locked days do not reset progress.
 */
export const computeStreakFromDays = (
  data: jsonResponse,
  includeExercise = false
): DashboardStreakSummary => {
  const allDaysSorted = Object.values(data).sort(sortByDayDate);
  const unlockedDaysSorted = allDaysSorted.filter((day) => day.status !== "locked");

  let currentStreak = 0;
  for (let i = unlockedDaysSorted.length - 1; i >= 0; i -= 1) {
    const day = unlockedDaysSorted[i];
    if (isStreakProgressDay(day, includeExercise)) {
      currentStreak += 1;
    } else {
      break;
    }
  }

  let longestStreak = 0;
  let tempStreak = 0;
  for (const day of allDaysSorted) {
    if (isStreakProgressDay(day, includeExercise)) {
      tempStreak += 1;
      longestStreak = Math.max(longestStreak, tempStreak);
    } else {
      tempStreak = 0;
    }
  }

  longestStreak = Math.max(longestStreak, currentStreak);

  const weeklyGoal = 7;
  const streakPercentage = Math.round((currentStreak / weeklyGoal) * 100);

  let message = "";
  if (currentStreak === 0) {
    message = "Start with one meal or water log today. A streak begins with a real check-in.";
  } else if (currentStreak === 1) {
    message = "One day saved. Repeat the easiest useful log today.";
  } else if (currentStreak < weeklyGoal) {
    const daysLeft = weeklyGoal - currentStreak;
    message = `${currentStreak} days active. ${daysLeft} more to complete the weekly rhythm.`;
  } else {
    message = "Weekly rhythm complete. Keep the next log simple so it stays repeatable.";
  }

  return {
    streakCount: currentStreak,
    longestStreak,
    message,
    streakPercentage,
    weeklyGoalDays: weeklyGoal,
    shouldSendReminder: currentStreak === 0,
  };
};
