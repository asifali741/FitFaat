import { Ionicons } from '@expo/vector-icons';
import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from 'react-native-responsive-screen';
import { AnimatedPressable } from '@/components/common/AnimatedPressable';
import type { DashboardMoodValue, QuickAddAction } from '@/components/dashboard/DashboardCommandCenter';
import type { HabitMission } from '@/utils/habitMissions';
import {
  getBurnedCaloriesTarget,
  getDashboardHealthScore,
  getHydrationValue,
  getProgressValue,
  getSingleMetricProgress,
} from '@/utils/dashboardProgress';
import { getExerciseCaloriesBurned } from '@/utils/localExerciseProgress';
import { FREE_PLAN_LIMITS } from '@/utils/featureAccess';
import type { WeeklyNutritionReport } from '@/utils/nutritionInsights';

type IconName = keyof typeof Ionicons.glyphMap;

type CoachDay = {
  dayNo: number;
  date?: string;
  status?: 'locked' | 'active' | 'finished';
  achievedCalories?: number;
  achieviedHydration?: number;
  achievedHydration?: number;
  targetCalories?: number;
  targetHydration?: number;
  weightTrendCaloriesAdjustment?: number;
  weightTrendExpectedKgPerWeek?: number;
  weightTrendObservedKgPerWeek?: number;
  weightTrendConfidence?: number;
  weightTrendStatus?: 'collecting' | 'onTrack' | 'adjusting';
  weightTrendMessage?: string;
  weightTrendGoalDirection?: 'weightLoss' | 'muscleGain' | 'weightGain' | 'maintenance';
  behaviorCaloriesAdjustment?: number;
  behaviorHydrationAdjustment?: number;
  calorieGoalDirection?: 'missed' | 'exceeded' | 'onTarget' | 'unknown';
  nutritionGapSeverity?: 'none' | 'low' | 'medium' | 'high' | 'critical';
  hydrationRiskScore?: number;
  recoveryNeedScore?: number;
  goalRiskScore?: number;
  nudgePriority?: 'silent' | 'low' | 'medium' | 'high';
  nudgeReason?: string;
  exerciseCaloriesBurned?: number;
  exerciseDurationSeconds?: number;
  exerciseEntries?: {
    exerciseName?: string;
    completedAt?: string;
  }[];
  walkingSteps?: number;
  walkingStepGoal?: number;
  steps?: number;
  stepCount?: number;
  stepGoal?: number;
  targetSteps?: number;
  dailyStepGoal?: number;
  meals?: any[];
};

type CoachCard = {
  id: string;
  title: string;
  body: string;
  icon: IconName;
  color: string;
  actionLabel: string;
  action: QuickAddAction;
  meta: string;
  disabled?: boolean;
};

type PersonalCoachFeedProps = {
  days: CoachDay[];
  appointments: any[];
  streak: { streakCount?: number } | null;
  selectedMood: DashboardMoodValue | null;
  isPremium: boolean;
  colors: any;
  onAction: (action: QuickAddAction) => void;
  embedded?: boolean;
  nutritionReport?: WeeklyNutritionReport | null;
  habitMission?: HabitMission | null;
  habitStreakCount?: number;
};

const muscleKeywords: { label: string; terms: string[] }[] = [
  { label: 'Chest', terms: ['chest', 'bench', 'push up', 'pullover', 'pectoral', 'fly'] },
  { label: 'Back', terms: ['back', 'row', 'lat', 'pull up', 'deadlift'] },
  { label: 'Legs', terms: ['leg', 'squat', 'lunge', 'calf', 'hamstring', 'quad'] },
  { label: 'Shoulders', terms: ['shoulder', 'delt', 'raise', 'press'] },
  { label: 'Arms', terms: ['bicep', 'tricep', 'curl', 'extension'] },
  { label: 'Core', terms: ['abs', 'core', 'plank', 'crunch'] },
];

const getDateKey = (value?: string | Date | null) => {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const sortDays = (days: CoachDay[]) =>
  [...days].sort((a, b) => {
    const aTime = a.date ? new Date(a.date).getTime() : a.dayNo;
    const bTime = b.date ? new Date(b.date).getTime() : b.dayNo;
    if (Number.isFinite(aTime) && Number.isFinite(bTime)) return aTime - bTime;
    return a.dayNo - b.dayNo;
  });

const getTodayDay = (days: CoachDay[]) => {
  const todayKey = getDateKey();
  return (
    days.find((day) => day.status === 'active') ||
    days.find((day) => getDateKey(day.date) === todayKey) ||
    days.find((day) => day.status !== 'locked') ||
    days[0] ||
    null
  );
};

const getUpcomingAppointmentCount = (appointments: any[]) => {
  const now = Date.now();
  return appointments.filter((appointment) => {
    const status = String(appointment?.status || '').toLowerCase();
    if (['cancelled', 'canceled', 'completed', 'rejected'].includes(status)) return false;
    const rawDate = appointment?.appointmentDateTime || appointment?.date || appointment?.createdAt;
    const date = rawDate ? new Date(rawDate) : null;
    return date && !Number.isNaN(date.getTime()) && date.getTime() > now - 60 * 60 * 1000;
  }).length;
};

const getProteinForDay = (day?: CoachDay | null) => {
  const meals = Array.isArray(day?.meals) ? day?.meals || [] : [];
  return meals.reduce((sum, meal) => {
    const protein = Number(
      meal?.protein ??
        meal?.protein_g ??
        meal?.proteinGrams ??
        meal?.macros?.protein ??
        meal?.nutrition?.protein
    );
    return sum + (Number.isFinite(protein) ? protein : 0);
  }, 0);
};

const getDaySteps = (day?: CoachDay | null) =>
  Math.round(getProgressValue(day?.walkingSteps ?? day?.steps ?? day?.stepCount));

const getDayStepGoal = (day?: CoachDay | null) => {
  const goal = getProgressValue(
    day?.walkingStepGoal ?? day?.stepGoal ?? day?.targetSteps ?? day?.dailyStepGoal
  );
  return goal > 0 ? Math.round(goal) : 10000;
};

const getLatestExercise = (days: CoachDay[]) => {
  const entries = days.flatMap((day) =>
    (day.exerciseEntries || []).map((entry) => ({
      ...entry,
      dayDate: day.date,
    }))
  );

  return entries
    .filter((entry) => entry.exerciseName)
    .sort((a, b) => {
      const aTime = new Date(a.completedAt || a.dayDate || 0).getTime();
      const bTime = new Date(b.completedAt || b.dayDate || 0).getTime();
      return bTime - aTime;
    })[0];
};

const getMuscleLabel = (exerciseName?: string) => {
  const normalized = String(exerciseName || '').toLowerCase();
  const match = muscleKeywords.find((item) => item.terms.some((term) => normalized.includes(term)));
  return match?.label || 'Workout';
};

const getHydrationAfterMealMisses = (days: CoachDay[]) =>
  days.filter((day) => {
    if (day.status === 'locked') return false;
    const calorieProgress = getSingleMetricProgress(day.achievedCalories, day.targetCalories);
    const hydrationProgress = getSingleMetricProgress(getHydrationValue(day), day.targetHydration);
    return calorieProgress >= 55 && hydrationProgress > 0 && hydrationProgress < 75;
  }).length;

const getWeekdayWorkoutInsight = (days: CoachDay[]) => {
  const entries = days.flatMap((day) =>
    (day.exerciseEntries || []).map((entry) => ({
      ...entry,
      dayDate: entry.completedAt || day.date,
    }))
  );

  if (entries.length < 2) return null;

  const weekdayCount = entries.filter((entry) => {
    const date = entry.dayDate ? new Date(entry.dayDate) : null;
    if (!date || Number.isNaN(date.getTime())) return false;
    const day = date.getDay();
    return day >= 1 && day <= 5;
  }).length;
  const weekendCount = entries.length - weekdayCount;

  if (weekdayCount >= 2 && weekdayCount >= weekendCount) {
    return { weekdayCount, weekendCount };
  }

  return null;
};

const getDaysAgoLabel = (dateValue?: string) => {
  if (!dateValue) return 'recently';
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return 'recently';
  const today = new Date(getDateKey());
  const compare = new Date(getDateKey(date));
  const daysAgo = Math.max(0, Math.round((today.getTime() - compare.getTime()) / 86400000));
  if (daysAgo === 0) return 'today';
  if (daysAgo === 1) return 'yesterday';
  return `${daysAgo} days ago`;
};

const getMissionActionLabel = (action?: string) => {
  if (action === 'water') return 'Add water';
  if (action === 'mealPlanner') return 'Plan meals';
  if (action === 'mindfulness') return 'Breathe';
  if (action === 'steps') return 'Track steps';
  if (action === 'note') return 'Reflect';
  return 'Add meal';
};

const buildBehaviorGuidanceCard = (
  today: CoachDay | null,
  colors: any
): CoachCard | null => {
  if (!today || !today.nudgePriority || today.nudgePriority === 'silent') return null;

  const calorieTarget = Math.round(Number(today.targetCalories || 0));
  const behaviorCalories = Math.round(Number(today.behaviorCaloriesAdjustment || 0));
  const hydrationAdjustment = Number(today.behaviorHydrationAdjustment || 0);
  const direction = today.calorieGoalDirection;
  const reason = today.nudgeReason || 'routine support';
  const priorityMeta = today.nudgePriority === 'high' ? 'High priority' : today.nudgePriority === 'medium' ? 'Smart nudge' : 'Gentle nudge';

  if (hydrationAdjustment >= 0.25 || Number(today.hydrationRiskScore || 0) >= 45) {
    return {
      id: 'behavior-hydration-guidance',
      title: 'Keep hydration on schedule',
      body: `Your water goal stays ${(today.targetHydration || 0).toFixed(1)}L. FitFaat will help you hit it earlier instead of changing tomorrow's target.`,
      icon: 'water-outline',
      color: '#2E86AB',
      actionLabel: 'Add water',
      action: 'water',
      meta: priorityMeta,
    };
  }

  if (direction === 'missed') {
    return {
      id: 'behavior-missed-calorie-guidance',
      title: 'Your calorie goal stays steady',
      body: calorieTarget > 0
        ? behaviorCalories > 0
          ? `Still aim for ${calorieTarget} cal. The coach will nudge your best eating windows instead of adding ${Math.abs(behaviorCalories)} cal to tomorrow.`
          : `Still aim for ${calorieTarget} cal. The coach will nudge your best eating windows instead of changing tomorrow's target.`
        : `The coach will use your routine windows to close the gap instead of changing tomorrow's target.`,
      icon: 'restaurant-outline',
      color: '#F97316',
      actionLabel: 'Add meal',
      action: 'meal',
      meta: reason,
    };
  }

  if (direction === 'exceeded') {
    return {
      id: 'behavior-over-calorie-guidance',
      title: 'Protect your ideal target',
      body: calorieTarget > 0
        ? `Your target remains ${calorieTarget} cal. FitFaat will focus on your high-risk eating windows today.`
        : 'FitFaat will focus on your high-risk eating windows today without changing the plan.',
      icon: 'shield-checkmark-outline',
      color: colors.warning || '#F59E0B',
      actionLabel: 'Log water',
      action: 'water',
      meta: reason,
    };
  }

  if (Number(today.recoveryNeedScore || 0) >= 45) {
    return {
      id: 'behavior-recovery-guidance',
      title: 'Recovery needs timing, not a new goal',
      body: 'Your goal stays fixed. Use your next meal window for protein, water, and recovery after activity.',
      icon: 'leaf-outline',
      color: '#10B981',
      actionLabel: 'Add meal',
      action: 'meal',
      meta: 'Recovery',
    };
  }

  return null;
};

const buildWeightTrendCalibrationCard = (
  today: CoachDay | null,
  colors: any
): CoachCard | null => {
  if (!today?.weightTrendStatus) return null;

  const adjustment = Math.round(Number(today.weightTrendCaloriesAdjustment || 0));
  const confidence = Math.round(Number(today.weightTrendConfidence || 0));
  const observed = Number(today.weightTrendObservedKgPerWeek || 0);
  const expected = Number(today.weightTrendExpectedKgPerWeek || 0);

  if (today.weightTrendStatus === 'adjusting' && adjustment !== 0) {
    return {
      id: 'weekly-weight-trend-calibration',
      title: 'Weekly weight trend calibrated',
      body:
        today.weightTrendMessage ||
        `Your daily calorie target has been tuned by ${adjustment > 0 ? '+' : ''}${adjustment} kcal from the weekly trend.`,
      icon: 'scale-outline',
      color: '#8B5CF6',
      actionLabel: 'Open profile',
      action: 'weight',
      meta: `${confidence}% confidence`,
    };
  }

  if (today.weightTrendStatus === 'collecting' && confidence < 45) {
    return {
      id: 'weekly-weight-trend-learning',
      title: 'Weight trend is learning',
      body: 'Log weight consistently and FitFaat will only tune calories when the weekly signal is reliable.',
      icon: 'analytics-outline',
      color: '#8B5CF6',
      actionLabel: 'Add weight',
      action: 'weight',
      meta: `${Math.max(0, today.weightTrendConfidence || 0)}% signal`,
    };
  }

  if (today.weightTrendStatus === 'onTrack' && confidence >= 55 && Math.abs(observed - expected) <= 0.15) {
    return {
      id: 'weekly-weight-trend-on-track',
      title: 'Weight trend is on track',
      body: 'Your weekly weight movement matches your goal closely, so FitFaat is keeping calories steady.',
      icon: 'trending-up-outline',
      color: colors.primary,
      actionLabel: 'Quick add',
      action: 'meal',
      meta: 'Calibrated',
    };
  }

  return null;
};

const buildNextBestActionCard = ({
  today,
  isPremium,
  hydrationProgress,
  calorieProgress,
  stepsProgress,
  workoutTarget,
  workoutCalories,
  colors,
}: {
  today: CoachDay | null;
  isPremium: boolean;
  hydrationProgress: number;
  calorieProgress: number;
  stepsProgress: number;
  workoutTarget: number;
  workoutCalories: number;
  colors: any;
}): CoachCard | null => {
  if (!today) {
    return {
      id: 'next-best-action-start',
      title: "Today's next best action",
      body: 'Log one meal or one water entry so HeaLora can coach from your real day.',
      icon: 'sparkles-outline',
      color: colors.primary,
      actionLabel: 'Quick log',
      action: 'meal',
      meta: 'Start',
    };
  }

  const healthScore = getDashboardHealthScore(today, isPremium);

  if (hydrationProgress < 70) {
    return {
      id: 'next-best-action-water',
      title: "Today's next best action",
      body: `Hydration is ${hydrationProgress}%. Add water before changing food or workout plans.`,
      icon: 'water-outline',
      color: '#2E86AB',
      actionLabel: 'Add water',
      action: 'water',
      meta: `${healthScore.score} score`,
    };
  }

  if (calorieProgress < 70) {
    return {
      id: 'next-best-action-meal',
      title: "Today's next best action",
      body: `Calories are ${calorieProgress}%. Log the next meal so your score and targets stay accurate.`,
      icon: 'fast-food-outline',
      color: '#F97316',
      actionLabel: 'Add meal',
      action: 'meal',
      meta: `${healthScore.score} score`,
    };
  }

  if (stepsProgress >= 75 && stepsProgress < 100) {
    return {
      id: 'next-best-action-steps-close',
      title: "Today's next best action",
      body: `Steps are ${stepsProgress}% done. A short walk is the cleanest score lift now.`,
      icon: 'footsteps-outline',
      color: '#22C55E',
      actionLabel: 'Track steps',
      action: 'steps',
      meta: 'Close',
    };
  }

  if (isPremium && workoutTarget > 0 && workoutCalories < workoutTarget * 0.5) {
    return {
      id: 'next-best-action-workout',
      title: "Today's next best action",
      body: `Workout burn is ${workoutCalories}/${workoutTarget}. Keep it short and log the session.`,
      icon: 'barbell-outline',
      color: '#10B981',
      actionLabel: 'Start workout',
      action: 'workout',
      meta: 'Premium',
    };
  }

  return {
    id: 'next-best-action-steady',
    title: "Today's next best action",
    body: 'Keep the streak honest: add the next real log when it happens.',
    icon: 'checkmark-done-outline',
    color: colors.primary,
    actionLabel: 'Quick add',
    action: 'water',
    meta: `${healthScore.score} score`,
  };
};

export function PersonalCoachFeed({
  days,
  appointments,
  streak,
  selectedMood,
  isPremium,
  colors,
  onAction,
  embedded = false,
  nutritionReport,
  habitMission,
  habitStreakCount = 0,
}: PersonalCoachFeedProps) {
  const styles = useMemo(() => getStyles(colors), [colors]);

  const cards = useMemo(() => {
    const sortedDays = sortDays(days);
    const today = getTodayDay(sortedDays);
    const todayIndex = today ? sortedDays.findIndex((day) => day.dayNo === today.dayNo) : -1;
    const previousDay = todayIndex > 0 ? sortedDays[todayIndex - 1] : sortedDays[sortedDays.length - 2];
    const hydrationProgress = today
      ? getSingleMetricProgress(getHydrationValue(today), today.targetHydration)
      : 0;
    const calorieProgress = today
      ? getSingleMetricProgress(today.achievedCalories, today.targetCalories)
      : 0;
    const proteinToday = getProteinForDay(today);
    const workoutTarget = isPremium && today ? getBurnedCaloriesTarget(today) : 0;
    const workoutCalories = isPremium && today ? getExerciseCaloriesBurned(today) : 0;
    const rawSteps = today ? getDaySteps(today) : 0;
    const displayedSteps = isPremium ? rawSteps : Math.min(rawSteps, FREE_PLAN_LIMITS.dailyStepCounterPreview);
    const stepGoal = isPremium && today ? getDayStepGoal(today) : FREE_PLAN_LIMITS.dailyStepCounterPreview;
    const stepsProgress = today ? getSingleMetricProgress(displayedSteps, stepGoal) : 0;
    const upcomingAppointments = getUpcomingAppointmentCount(appointments);
    const latestExercise = isPremium ? getLatestExercise(sortedDays) : undefined;
    const hydrationAfterMealMisses = getHydrationAfterMealMisses(sortedDays);
    const weekdayWorkoutInsight = isPremium ? getWeekdayWorkoutInsight(sortedDays) : null;
    const nextCards: CoachCard[] = [];
    const nextBestActionCard = buildNextBestActionCard({
      today,
      isPremium,
      hydrationProgress,
      calorieProgress,
      stepsProgress,
      workoutTarget,
      workoutCalories,
      colors,
    });
    const behaviorGuidanceCard = buildBehaviorGuidanceCard(today, colors);
    const weightTrendCard = buildWeightTrendCalibrationCard(today, colors);

    if (nextBestActionCard) {
      nextCards.push(nextBestActionCard);
    }

    if (habitMission) {
      const completed = !!habitMission.completedAt;
      nextCards.push({
        id: `habit-mission-${habitMission.id}`,
        title: completed ? 'Daily mission complete' : habitMission.title,
        body: completed
          ? 'Your behavior mission is saved for today. Keep the next choice simple and steady.'
          : habitMission.streakMessage
            ? `${habitMission.body} ${habitMission.streakMessage}.`
            : habitMission.body,
        icon: completed ? 'checkmark-done-outline' : 'sparkles-outline',
        color: completed ? '#10B981' : colors.primary,
        actionLabel: completed ? 'Completed' : getMissionActionLabel(habitMission.action),
        action: habitMission.action as QuickAddAction,
        meta: completed ? 'Done' : habitMission.streakStatus === 'recovery' ? 'Recovery' : `${habitStreakCount} streak`,
        disabled: completed,
      });

      if (habitMission.recoveryPlan?.length) {
        nextCards.push({
          id: `habit-recovery-${habitMission.id}`,
          title: 'Recovery plan is ready',
          body: habitMission.recoveryPlan.join(' '),
          icon: 'refresh-outline',
          color: '#F97316',
          actionLabel: getMissionActionLabel(habitMission.action),
          action: habitMission.action as QuickAddAction,
          meta: 'Reset',
        });
      }
    }

    if (isPremium && nutritionReport?.nextWeekFocus) {
      nextCards.push({
        id: `nutrition-focus-${nutritionReport.weekKey}`,
        title: nutritionReport.nextWeekFocus.title,
        body: nutritionReport.nextWeekFocus.body,
        icon: 'analytics-outline',
        color: '#14B8A6',
        actionLabel: getMissionActionLabel(nutritionReport.nextWeekFocus.action),
        action: nutritionReport.nextWeekFocus.action as QuickAddAction,
        meta: `${nutritionReport.weeklyScore} weekly`,
      });
    }

    if (behaviorGuidanceCard) {
      nextCards.push(behaviorGuidanceCard);
    }

    if (isPremium && weightTrendCard) {
      nextCards.push(weightTrendCard);
    }

    if (previousDay) {
      const previousHydration = getSingleMetricProgress(
        getHydrationValue(previousDay),
        previousDay.targetHydration
      );
      if (previousHydration > 0 && previousHydration < 80) {
        nextCards.push({
          id: 'missed-water-yesterday',
          title: 'You missed water yesterday',
          body: `You reached ${previousHydration}% of hydration. Start today with a quick water log.`,
          icon: 'water-outline',
          color: '#2E86AB',
          actionLabel: 'Add water',
          action: 'water',
          meta: `Day ${previousDay.dayNo}`,
        });
      }
    }

    if (hydrationAfterMealMisses >= 2) {
      nextCards.push({
        id: 'hydration-after-lunch-pattern',
        title: 'You usually miss hydration after lunch',
        body: `${hydrationAfterMealMisses} logged days show meals moving faster than water. Pair lunch with a quick water check-in.`,
        icon: 'partly-sunny-outline',
        color: '#2E86AB',
        actionLabel: 'Add water',
        action: 'water',
        meta: 'Pattern',
      });
    }

    if (hydrationProgress < 65) {
      nextCards.push({
        id: 'water-behind-today',
        title: 'Water is behind today',
        body: `Hydration is at ${hydrationProgress}%. A small log now keeps the day from slipping.`,
        icon: 'water',
        color: '#2E86AB',
        actionLabel: 'Log water',
        action: 'water',
        meta: 'Today',
      });
    }

    if (getProgressValue(today?.achievedCalories) > 450 && proteinToday < 30) {
      nextCards.push({
        id: 'protein-low',
        title: 'Protein looks low today',
        body: proteinToday > 0
          ? `Only ${Math.round(proteinToday)}g protein is logged. Add a protein-focused meal next.`
          : "Calories are moving, but protein is not visible in today's meal logs.",
        icon: 'nutrition-outline',
        color: '#F97316',
        actionLabel: 'Add meal',
        action: 'meal',
        meta: `${calorieProgress}% calories`,
      });
    }

    if (isPremium && latestExercise) {
      const muscle = getMuscleLabel(latestExercise.exerciseName);
      nextCards.push({
        id: 'latest-muscle',
        title: `${muscle} trained ${getDaysAgoLabel(latestExercise.completedAt || latestExercise.dayDate)}`,
        body: latestExercise.exerciseName || 'Your last workout is saved in the weekly log.',
        icon: 'barbell-outline',
        color: '#10B981',
        actionLabel: 'Open workouts',
        action: 'workout',
        meta: 'Recovery signal',
      });
    }

    if (weekdayWorkoutInsight) {
      nextCards.push({
        id: 'weekday-workout-streak',
        title: 'Your best workout streak is on weekdays',
        body: `${weekdayWorkoutInsight.weekdayCount} recent workouts landed Monday to Friday. Keep that routine protected.`,
        icon: 'calendar-number-outline',
        color: '#10B981',
        actionLabel: 'Open workouts',
        action: 'workout',
        meta: 'Workout rhythm',
      });
    }

    if (isPremium && workoutTarget > 0 && workoutCalories < workoutTarget * 0.35) {
      nextCards.push({
        id: 'workout-low',
        title: 'Workout goal is still open',
        body: `You have burned ${workoutCalories}/${workoutTarget} workout calories today.`,
        icon: 'fitness-outline',
        color: '#10B981',
        actionLabel: 'Start workout',
        action: 'workout',
        meta: 'Today',
      });
    }

    if (upcomingAppointments === 0) {
      nextCards.push({
        id: 'book-follow-up',
        title: 'Book a follow-up',
        body: 'No upcoming doctor visit is visible. A quick check-in keeps your plan accountable.',
        icon: 'calendar-outline',
        color: '#14B8A6',
        actionLabel: 'Find doctor',
        action: 'appointment',
        meta: 'Appointments',
      });
    }

    if ((streak?.streakCount || 0) > 0 && hydrationProgress === 0 && calorieProgress === 0) {
      nextCards.push({
        id: 'protect-streak',
        title: 'Protect your streak',
        body: `${streak?.streakCount || 0} days built. Log one meal or water entry to keep momentum.`,
        icon: 'flame-outline',
        color: colors.warning || '#F59E0B',
        actionLabel: 'Quick log',
        action: 'meal',
        meta: 'Streak',
      });
    }

    if (selectedMood === 'tired' || selectedMood === 'sore' || selectedMood === 'stressed') {
      nextCards.push({
        id: 'mood-recovery',
        title: 'Plan around your mood',
        body: isPremium
          ? 'Your readiness mood suggests a lighter session, hydration, and easier food choices.'
          : 'Your readiness mood suggests hydration and easier food choices today.',
        icon: 'leaf-outline',
        color: colors.warning || '#F59E0B',
        actionLabel: isPremium ? 'Open plan' : 'Add water',
        action: isPremium ? 'workout' : 'water',
        meta: 'Readiness',
      });
    }

    if (!nextCards.length) {
      nextCards.push({
        id: 'steady-day',
        title: 'You are on track',
        body: 'Your daily signals look steady. Keep logging small wins as they happen.',
        icon: 'checkmark-done-outline',
        color: colors.primary,
        actionLabel: 'Quick add',
        action: 'water',
        meta: 'Coach',
      });
    }

    return nextCards.slice(0, 7);
  }, [
    appointments,
    colors,
    days,
    habitMission,
    habitStreakCount,
    isPremium,
    nutritionReport,
    selectedMood,
    streak?.streakCount,
  ]);

  return (
    <View style={[styles.section, embedded && styles.sectionEmbedded]}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.eyebrow}>Dynamic</Text>
          <Text style={styles.title}>Personal Coach Feed</Text>
        </View>
        <View style={styles.badge}>
          <Ionicons name="sparkles-outline" size={Math.min(hp(1.9), wp(4.2))} color={colors.primary} />
          <Text style={styles.badgeText}>{cards.length}</Text>
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.feedContent}
      >
        {cards.map((card) => (
          <View key={card.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={[styles.cardIcon, { backgroundColor: `${card.color}18` }]}>
                <Ionicons name={card.icon} size={Math.min(hp(2.8), wp(6))} color={card.color} />
              </View>
              <Text style={[styles.cardMeta, { color: card.color }]} numberOfLines={1}>
                {card.meta}
              </Text>
            </View>
            <Text style={styles.cardTitle} numberOfLines={2}>{card.title}</Text>
            <Text style={styles.cardBody} numberOfLines={3}>{card.body}</Text>
            <AnimatedPressable
              style={[styles.cardAction, card.disabled && styles.cardActionDisabled]}
              onPress={() => {
                if (!card.disabled) onAction(card.action);
              }}
            >
              <Text style={[styles.cardActionText, { color: card.color }]}>{card.actionLabel}</Text>
              {card.disabled ? null : (
                <Ionicons name="arrow-forward" size={Math.min(hp(1.8), wp(4))} color={card.color} />
              )}
            </AnimatedPressable>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  section: {
    marginHorizontal: wp(4),
    marginBottom: hp(1.5),
  },
  sectionEmbedded: {
    marginHorizontal: 0,
    marginBottom: 0,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: wp(3),
    marginBottom: hp(1.3),
  },
  eyebrow: {
    color: colors.textSecondary,
    fontSize: Math.min(hp(1.2), wp(2.9)),
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  title: {
    color: colors.textPrimary,
    fontSize: Math.min(hp(2.1), wp(4.8)),
    fontWeight: '900',
    marginTop: hp(0.2),
  },
  badge: {
    minHeight: hp(3.5),
    borderRadius: hp(1.75),
    paddingHorizontal: wp(2.6),
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(1),
    backgroundColor: `${colors.primary}14`,
  },
  badgeText: {
    color: colors.primary,
    fontSize: Math.min(hp(1.3), wp(3.1)),
    fontWeight: '900',
  },
  feedContent: {
    paddingRight: wp(4),
    gap: wp(3),
  },
  card: {
    width: wp(72),
    minHeight: hp(18),
    backgroundColor: colors.cardBackground,
    borderRadius: hp(1.8),
    borderWidth: Math.min(wp(0.28), hp(0.16)),
    borderColor: colors.cardBorder || colors.border,
    padding: wp(4),
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: hp(0.38) },
    shadowOpacity: 0.08,
    shadowRadius: wp(1.9),
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: wp(2),
    marginBottom: hp(1.1),
  },
  cardIcon: {
    width: Math.min(hp(4.7), wp(10.5)),
    height: Math.min(hp(4.7), wp(10.5)),
    borderRadius: Math.min(hp(2.35), wp(5.25)),
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardMeta: {
    flex: 1,
    textAlign: 'right',
    fontSize: Math.min(hp(1.15), wp(2.8)),
    fontWeight: '900',
  },
  cardTitle: {
    color: colors.textPrimary,
    fontSize: Math.min(hp(1.85), wp(4.2)),
    fontWeight: '900',
    lineHeight: hp(2.35),
  },
  cardBody: {
    color: colors.textSecondary,
    fontSize: Math.min(hp(1.35), wp(3.2)),
    fontWeight: '700',
    lineHeight: hp(1.95),
    marginTop: hp(0.7),
  },
  cardAction: {
    alignSelf: 'flex-start',
    minHeight: hp(3.7),
    borderRadius: hp(1.85),
    paddingHorizontal: wp(2.8),
    marginTop: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(1),
    backgroundColor: colors.surface || `${colors.primary}08`,
  },
  cardActionDisabled: {
    opacity: 0.7,
  },
  cardActionText: {
    fontSize: Math.min(hp(1.22), wp(2.9)),
    fontWeight: '900',
  },
});

export default PersonalCoachFeed;
