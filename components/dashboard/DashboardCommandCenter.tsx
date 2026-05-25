import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from 'react-native-responsive-screen';
import { AnimatedPressable } from '@/components/common/AnimatedPressable';
import { ProgressRing } from '@/components/common/ProgressRing';
import {
  getBurnedCaloriesTarget,
  getCalorieScorePercent,
  DASHBOARD_DATA_SOURCE_LABELS,
  getDashboardHealthScore,
  getDashboardScoreBreakdown,
  getFreeStepBurnedCalories,
  getHealthScoreMetricStatus,
  getHealthScorePlanExplanation,
  getHealthScoreReliabilityCopy,
  getHydrationValue,
  getPremiumScoreChangeExplanation,
  getProgressValue,
  getSingleMetricProgress,
  getWeeklyHealthScoreTrend,
  HEALTH_SCORE_DISCLAIMER,
  HEALTH_SCORE_WEIGHTS,
  type HealthScoreMetric,
} from '@/utils/dashboardProgress';
import { FREE_PLAN_LIMITS } from '@/utils/featureAccess';
import { getExerciseCaloriesBurned } from '@/utils/localExerciseProgress';
import {
  DEFAULT_STEP_GOAL,
  getWalkingCaloriesBurned,
  getWalkingCaloriesTarget,
} from '@/utils/localWalkingProgress';
import {
  formatCalorieTarget,
  formatHydrationTarget,
  type GoalDisplayMode,
} from '@/utils/goalTargetDisplay';
import {
  buildWeeklyNutritionReport,
  type WeeklyNutritionReport,
} from '@/utils/nutritionInsights';
import type {
  HabitPreferences,
  HabitMission,
} from '@/utils/habitMissions';
import { useRouter } from 'expo-router';

type IconName = keyof typeof Ionicons.glyphMap;

export type QuickAddAction =
  | 'water'
  | 'meal'
  | 'mealPlanner'
  | 'mindfulness'
  | 'steps'
  | 'weight'
  | 'workout'
  | 'appointment'
  | 'note'
  | 'chat';

export type DashboardMoodValue = 'strong' | 'good' | 'tired' | 'sore' | 'stressed';

export type DashboardDay = {
  dayNo: number;
  date?: string;
  status?: 'locked' | 'active' | 'finished';
  achievedCalories?: number;
  achieviedHydration?: number;
  achievedHydration?: number;
  targetCalories?: number;
  targetHydration?: number;
  targetCaloriesMin?: number;
  targetCaloriesMax?: number;
  targetHydrationMin?: number;
  targetHydrationMax?: number;
  calibratedTargetCalories?: number;
  weightTrendCaloriesAdjustment?: number;
  weightTrendExpectedKgPerWeek?: number;
  weightTrendObservedKgPerWeek?: number;
  weightTrendConfidence?: number;
  weightTrendStatus?: 'collecting' | 'onTrack' | 'adjusting';
  weightTrendMessage?: string;
  weightTrendGoalDirection?: 'weightLoss' | 'muscleGain' | 'weightGain' | 'maintenance';
  exerciseCaloriesBurned?: number;
  exerciseDurationSeconds?: number;
  exerciseEntries?: any[];
  walkingSteps?: number;
  walkingStepGoal?: number;
  steps?: number;
  stepCount?: number;
  stepGoal?: number;
  targetSteps?: number;
  dailyStepGoal?: number;
  walkingCaloriesBurned?: number;
  targetWalkingCaloriesBurned?: number;
  meals?: any[];
  waterIntake?: any[];
};

type StreakSummary = {
  streakCount?: number;
  longestStreak?: number;
  streakPercentage?: number;
};

type DashboardCommandCenterProps = {
  days: DashboardDay[];
  appointments: any[];
  chatAlertCount: number;
  streak: StreakSummary | null;
  isPremium: boolean;
  colors: any;
  selectedMood: DashboardMoodValue | null;
  onOpenQuickAdd: () => void;
  onQuickAddAction: (action: QuickAddAction) => void;
  afterCommandCenter?: React.ReactNode;
  showReadiness?: boolean;
  showWeeklyReport?: boolean;
  goalDisplayMode?: GoalDisplayMode;
  nutritionReport?: WeeklyNutritionReport | null;
  habitMission?: HabitMission | null;
  habitStreakCount?: number;
  habitPreferences?: HabitPreferences | null;
  onCompleteHabitMission?: () => void;
  onToggleHabitReminders?: () => void;
};

type ReadinessScoreCardProps = {
  days: DashboardDay[];
  isPremium: boolean;
  colors: any;
  selectedMood: DashboardMoodValue | null;
};

type QuickAddBottomSheetProps = {
  visible: boolean;
  colors: any;
  selectedMood: DashboardMoodValue | null;
  isPremium?: boolean;
  onClose: () => void;
  onSelectMood: (mood: DashboardMoodValue) => void;
  onAction: (action: QuickAddAction) => void;
};

type TodayPlanItem = {
  id: string;
  label: string;
  title: string;
  body: string;
  icon: IconName;
  color: string;
  action: QuickAddAction;
  actionLabel: string;
  progressLabel: string;
};

const WATER_COLOR = '#2E86AB';
const CALORIE_COLOR = '#F97316';
const WORKOUT_COLOR = '#10B981';
const STEP_COLOR = '#22C55E';
const APPOINTMENT_COLOR = '#14B8A6';
const CHAT_COLOR = '#6366F1';

const moodOptions: {
  id: DashboardMoodValue;
  label: string;
  icon: IconName;
  color: string;
  score: number;
}[] = [
  { id: 'strong', label: 'Strong', icon: 'flash-outline', color: '#10B981', score: 12 },
  { id: 'good', label: 'Good', icon: 'happy-outline', color: '#14B8A6', score: 7 },
  { id: 'tired', label: 'Tired', icon: 'moon-outline', color: '#F59E0B', score: -8 },
  { id: 'sore', label: 'Sore', icon: 'body-outline', color: '#F97316', score: -10 },
  { id: 'stressed', label: 'Stressed', icon: 'pulse-outline', color: '#EF4444', score: -12 },
];

const quickActions: {
  id: QuickAddAction;
  label: string;
  subtitle: string;
  icon: IconName;
  color: string;
}[] = [
  { id: 'water', label: 'Water', subtitle: 'Hydration', icon: 'water-outline', color: WATER_COLOR },
  { id: 'meal', label: 'Meal', subtitle: 'Calories', icon: 'fast-food-outline', color: CALORIE_COLOR },
  { id: 'mealPlanner', label: 'Meal Plan', subtitle: 'Planner', icon: 'basket-outline', color: '#0EA5E9' },
  { id: 'mindfulness', label: 'Mindful', subtitle: 'Breathing', icon: 'leaf-outline', color: '#22C55E' },
  { id: 'steps', label: 'Steps', subtitle: 'Counter', icon: 'footsteps-outline', color: '#14B8A6' },
  { id: 'weight', label: 'Weight', subtitle: 'Profile', icon: 'scale-outline', color: '#8B5CF6' },
  { id: 'workout', label: 'Workout', subtitle: 'Exercise', icon: 'barbell-outline', color: WORKOUT_COLOR },
  { id: 'appointment', label: 'Appointment', subtitle: 'Doctor', icon: 'calendar-outline', color: APPOINTMENT_COLOR },
  { id: 'chat', label: 'Chat', subtitle: 'Messages', icon: 'chatbubbles-outline', color: CHAT_COLOR },
  { id: 'note', label: 'Note', subtitle: 'Daily log', icon: 'document-text-outline', color: '#64748B' },
];

const safeAverage = (values: number[]) => {
  const cleanValues = values.filter((value) => Number.isFinite(value));
  if (!cleanValues.length) return 0;
  return cleanValues.reduce((sum, value) => sum + value, 0) / cleanValues.length;
};

const getLocalDateKey = (value?: string | Date | null) => {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseAppointmentTime = (time?: string) => {
  const match = String(time || '').match(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?/i);
  if (!match) return null;

  let hours = Number(match[1]);
  const minutes = Number(match[2] || 0);
  const period = match[3]?.toUpperCase();

  if (period === 'PM' && hours < 12) hours += 12;
  if (period === 'AM' && hours === 12) hours = 0;

  return { hours, minutes };
};

const getAppointmentDate = (appointment: any) => {
  const directDate = appointment?.appointmentDateTime || appointment?.scheduledAt || appointment?.startTime;
  if (directDate) {
    const parsed = new Date(directDate);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }

  if (!appointment?.date) return null;
  const parsed = new Date(appointment.date);
  if (Number.isNaN(parsed.getTime())) return null;

  const time = parseAppointmentTime(appointment.time);
  if (time) {
    parsed.setHours(time.hours, time.minutes, 0, 0);
  }

  return parsed;
};

const getNextAppointment = (appointments: any[]) => {
  const now = Date.now();
  return appointments
    .map((appointment) => ({ appointment, startsAt: getAppointmentDate(appointment) }))
    .filter(({ appointment, startsAt }) => {
      const status = String(appointment?.status || '').toLowerCase();
      const isClosed = ['cancelled', 'canceled', 'completed', 'rejected'].includes(status);
      return startsAt && !isClosed && startsAt.getTime() > now - 30 * 60 * 1000;
    })
    .sort((a, b) => a.startsAt!.getTime() - b.startsAt!.getTime())[0] || null;
};

const getDaySteps = (day?: DashboardDay | null) =>
  Math.round(getProgressValue(day?.walkingSteps ?? day?.steps ?? day?.stepCount));

const getDayStepGoal = (day?: DashboardDay | null) => {
  const stepGoal = getProgressValue(
    day?.walkingStepGoal ?? day?.stepGoal ?? day?.targetSteps ?? day?.dailyStepGoal
  );
  return stepGoal > 0 ? Math.round(stepGoal) : DEFAULT_STEP_GOAL;
};

const formatStepCount = (value: number) => value.toLocaleString();

const formatAppointmentLabel = (appointment: any) => {
  const startsAt = getAppointmentDate(appointment);
  const doctorName =
    appointment?.doctorName ||
    appointment?.doctor?.name ||
    appointment?.doctorId?.name ||
    appointment?.doctorId?.fullName ||
    'Doctor';

  if (!startsAt) {
    return { title: doctorName, subtitle: 'No time set' };
  }

  return {
    title: doctorName,
    subtitle: startsAt.toLocaleString([], {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }),
  };
};

const getTodayDay = (days: DashboardDay[]) => {
  const todayKey = getLocalDateKey();
  return (
    days.find((day) => day.status === 'active') ||
    days.find((day) => getLocalDateKey(day.date) === todayKey) ||
    days.find((day) => day.status !== 'locked') ||
    days[0] ||
    null
  );
};

const formatScoreMetricAmount = (metric: HealthScoreMetric) => {
  const achieved = Number(metric.achieved || 0);
  const target = Number(metric.target || 0);
  const roundedAchieved = metric.key === 'hydration' ? achieved.toFixed(1) : Math.round(achieved).toLocaleString();
  const roundedTarget = metric.key === 'hydration' ? target.toFixed(1) : Math.round(target).toLocaleString();
  const unit =
    metric.key === 'hydration'
      ? 'L'
      : metric.key === 'stepsPreview'
        ? 'steps'
        : 'kcal';

  if (target <= 0) return `${roundedAchieved} ${unit}`;
  return `${roundedAchieved}/${roundedTarget} ${unit}`;
};

const getScoreMetricIcon = (metric: HealthScoreMetric): IconName => {
  if (metric.key === 'hydration') return 'water-outline';
  if (metric.key === 'stepsPreview' || metric.key === 'walking') return 'footsteps-outline';
  if (metric.key === 'workout') return 'barbell-outline';
  return 'flame-outline';
};

const getReadiness = (
  today: DashboardDay | null,
  days: DashboardDay[],
  selectedMood: DashboardMoodValue | null,
  isPremium: boolean
) => {
  const todayScore = today ? getDashboardScoreBreakdown(today, isPremium) : null;
  if (!todayScore?.hasAnySignal) {
    return {
      score: 0,
      label: 'Check in first',
      message: 'Add water, a meal, or steps before reading readiness.',
      icon: 'add-circle-outline' as IconName,
      color: WATER_COLOR,
    };
  }

  const hydrationProgress = today ? getSingleMetricProgress(getHydrationValue(today), today.targetHydration) : 0;
  const calorieProgress = today
    ? Math.round(getCalorieScorePercent(today.achievedCalories, today.targetCalories))
    : 0;
  const workoutTarget = isPremium && today ? getBurnedCaloriesTarget(today) : 0;
  const workoutCalories = isPremium && today ? getExerciseCaloriesBurned(today) : 0;
  const workoutProgress = isPremium && workoutTarget > 0 ? getSingleMetricProgress(workoutCalories, workoutTarget) : 0;
  const moodScore = moodOptions.find((mood) => mood.id === selectedMood)?.score || 0;
  const unlockedDays = days.filter((day) => day.status !== 'locked');
  const consistencyScores = unlockedDays
    .map((day) => ({ day, score: getDashboardScoreBreakdown(day, isPremium) }))
    .filter(({ day, score }) => day.status !== 'active' || score.hasAnySignal)
    .map(({ score }) => score.healthScore);
  const consistency = safeAverage(
    consistencyScores.length ? consistencyScores : [todayScore.healthScore]
  );
  const loadPenalty = isPremium && workoutTarget > 0 && workoutCalories > workoutTarget * 1.2 ? 8 : 0;
  const score = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        35 +
          hydrationProgress * (isPremium ? 0.18 : 0.22) +
          calorieProgress * (isPremium ? 0.14 : 0.18) +
          (isPremium ? workoutProgress * 0.14 : 0) +
          consistency * (isPremium ? 0.22 : 0.3) +
          moodScore -
          loadPenalty
      )
    )
  );

  if (score >= 75) {
    return {
      score,
      label: 'Ready',
      message: 'Good day to push your plan.',
      icon: 'flash-outline' as IconName,
      color: WORKOUT_COLOR,
    };
  }

  if (score >= 55) {
    return {
      score,
      label: 'Take it easy',
      message: 'Stay steady and avoid overdoing it.',
      icon: 'leaf-outline' as IconName,
      color: '#F59E0B',
    };
  }

  return {
    score,
    label: 'Recovery day',
    message: 'Light movement, water, and rest look smarter today.',
    icon: 'battery-half-outline' as IconName,
    color: '#EF4444',
  };
};

const getNutritionScoreColor = (score: number) => {
  if (score >= 80) return '#10B981';
  if (score >= 60) return '#F59E0B';
  return '#EF4444';
};

const getNutritionActionLabel = (action?: string) => {
  if (action === 'water') return 'Add water';
  if (action === 'mealPlanner') return 'Plan meals';
  if (action === 'mindfulness') return 'Breathe';
  if (action === 'steps') return 'Track steps';
  if (action === 'note') return 'Reflect';
  return 'Add meal';
};

const getNutritionDayLabel = (score?: WeeklyNutritionReport['bestDay']) =>
  score ? `Day ${score.dayNo}` : '--';

const getProteinConsistencyLabel = (report: WeeklyNutritionReport) =>
  report.proteinConsistencyScore === null
    ? 'Needed'
    : `${report.proteinConsistencyScore}%`;

const getCalorieProgressLabel = (score: WeeklyNutritionReport['todayScore']) => {
  if (!score) return '--';

  const storedProgress = Number(score.calorieProgress);
  if (Number.isFinite(storedProgress)) return `${storedProgress}%`;
  if (!score.targetCalories) return '0%';

  const fallbackProgress = Math.round((score.calories / score.targetCalories) * 100);
  return `${Math.min(100, Math.max(0, fallbackProgress))}%`;
};

const formatHabitReminderTime = (preferences?: HabitPreferences | null) => {
  if (!preferences) return '4:30 PM';
  const date = new Date();
  date.setHours(preferences.reminderHour, preferences.reminderMinute, 0, 0);
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
};

const buildNutritionReportItems = (report: WeeklyNutritionReport) => [
  {
    label: 'Weekly score',
    value: `${report.weeklyScore}`,
    icon: 'analytics-outline' as IconName,
    color: getNutritionScoreColor(report.weeklyScore),
  },
  {
    label: 'Hydration',
    value: `${report.hydrationScore}%`,
    icon: 'water-outline' as IconName,
    color: WATER_COLOR,
  },
  {
    label: 'Protein',
    value: getProteinConsistencyLabel(report),
    icon: 'nutrition-outline' as IconName,
    color: CALORIE_COLOR,
  },
  {
    label: 'Meal timing',
    value: `${report.mealTimingScore}%`,
    icon: 'time-outline' as IconName,
    color: '#8B5CF6',
  },
  {
    label: 'Calories',
    value: report.calorieTrendLabel,
    icon: 'trending-up-outline' as IconName,
    color: '#14B8A6',
  },
  {
    label: 'Best day',
    value: getNutritionDayLabel(report.bestDay),
    icon: 'trophy-outline' as IconName,
    color: '#10B981',
  },
  {
    label: 'Weakest',
    value: getNutritionDayLabel(report.weakestDay),
    icon: 'alert-circle-outline' as IconName,
    color: '#EF4444',
  },
];

const buildNutritionShareMessage = (
  report: WeeklyNutritionReport,
  isPremium: boolean,
  activeAppointments: number
) =>
  [
    'FitFaat Weekly Diet Report',
    `Plan: ${isPremium ? 'Premium' : 'Free'}`,
    `Weekly score: ${report.weeklyScore}`,
    `Hydration score: ${report.hydrationScore}%`,
    `Protein consistency: ${getProteinConsistencyLabel(report)}`,
    `Meal timing score: ${report.mealTimingScore}%`,
    `Calorie trend: ${report.calorieTrendLabel}`,
    `Best day: ${getNutritionDayLabel(report.bestDay)}`,
    `Weakest day: ${getNutritionDayLabel(report.weakestDay)}`,
    `Next week focus: ${report.nextWeekFocus.title}`,
    `Upcoming appointments: ${activeAppointments}`,
  ].join('\n');

const getCloseNudge = ({
  hydrationProgress,
  calorieProgress,
  stepsProgress,
  isPremium,
}: {
  hydrationProgress: number;
  calorieProgress: number;
  stepsProgress: number;
  isPremium: boolean;
}): { label: string; icon: IconName; action: QuickAddAction; message: string } | null => {
  if (hydrationProgress >= 75 && hydrationProgress < 100) {
    return {
      label: 'Finish Water',
      icon: 'water-outline',
      action: 'water',
      message: `You are close on water at ${hydrationProgress}%. One small log can finish that part of the score.`,
    };
  }

  if (calorieProgress >= 75 && calorieProgress < 100) {
    return {
      label: 'Log Meal',
      icon: 'fast-food-outline',
      action: 'meal',
      message: `Calories are ${calorieProgress}% complete. A simple meal log is today's cleanest next step.`,
    };
  }

  if (stepsProgress >= 75 && stepsProgress < 100) {
    return {
      label: 'Track Steps',
      icon: 'footsteps-outline',
      action: 'steps',
      message: isPremium
        ? `Steps are ${stepsProgress}% of goal. A short walk can lift the Full Health Score.`
        : `The step preview is ${stepsProgress}% complete. A few more steps can lift the Basic Score preview.`,
    };
  }

  return null;
};

const getDailyEncouragement = ({
  today,
  overallProgress,
  hydrationProgress,
  calorieProgress,
  closeNudge,
}: {
  today: DashboardDay | null;
  overallProgress: number;
  hydrationProgress: number;
  calorieProgress: number;
  closeNudge: ReturnType<typeof getCloseNudge>;
}) => {
  if (closeNudge) return closeNudge.message;
  if (!today) return 'Start with one meal or water log so FitFaat has a real signal for today.';

  const hasAnyLog =
    getProgressValue(today.achievedCalories) > 0 ||
    getHydrationValue(today) > 0 ||
    getDaySteps(today) > 0 ||
    getExerciseCaloriesBurned(today) > 0;

  if (!hasAnyLog) {
    return 'Give today an easy start: log water or your first meal, then let the score update from real data.';
  }

  if (overallProgress >= 85) {
    return 'Strong day. Keep it boring and repeatable: one more honest log is better than chasing perfection.';
  }

  if (hydrationProgress < 50) {
    return 'Water is the fastest win right now. Add one water log before changing the rest of the plan.';
  }

  if (calorieProgress < 50) {
    return 'Food signal is still light. Log the next meal so your targets and coach advice stay useful.';
  }

  return 'You have enough signal to steer the day. Keep the next action small and specific.';
};

const buildTodayPlan = ({
  today,
  isPremium,
  selectedMood,
  hydrationProgress,
  calorieProgress,
  stepsProgress,
  workoutTarget,
  workoutProgress,
  overallProgress,
}: {
  today: DashboardDay | null;
  isPremium: boolean;
  selectedMood: DashboardMoodValue | null;
  hydrationProgress: number;
  calorieProgress: number;
  stepsProgress: number;
  workoutTarget: number;
  workoutProgress: number;
  overallProgress: number;
}): TodayPlanItem[] => {
  const planItems: TodayPlanItem[] = [];
  const addItem = (item: TodayPlanItem) => {
    if (!planItems.some((existing) => existing.action === item.action || existing.id === item.id)) {
      planItems.push(item);
    }
  };
  const hasAnyLog =
    !!today &&
    (getProgressValue(today.achievedCalories) > 0 ||
      getHydrationValue(today) > 0 ||
      getDaySteps(today) > 0 ||
      getExerciseCaloriesBurned(today) > 0);

  if (!hasAnyLog) {
    addItem({
      id: 'prime-day',
      label: 'Now',
      title: 'Prime the day',
      body: 'Add water or the first meal so FitFaat has a real signal.',
      icon: 'sparkles-outline',
      color: WATER_COLOR,
      action: 'water',
      actionLabel: 'Add water',
      progressLabel: 'No signal yet',
    });
  }

  if (hydrationProgress < 85) {
    addItem({
      id: 'hydration-checkpoint',
      label: planItems.length ? 'Next' : 'Now',
      title: hydrationProgress >= 70 ? 'Finish hydration' : 'Hydration checkpoint',
      body: hydrationProgress >= 70
        ? 'One small water log can finish this part of the day.'
        : 'Water is the fastest useful improvement right now.',
      icon: 'water-outline',
      color: WATER_COLOR,
      action: 'water',
      actionLabel: 'Log water',
      progressLabel: `${hydrationProgress}% water`,
    });
  }

  if (calorieProgress < 85) {
    addItem({
      id: 'food-signal',
      label: planItems.length ? 'Next' : 'Now',
      title: calorieProgress >= 70 ? 'Close the food gap' : 'Log the next meal',
      body: 'Meal data keeps targets, coach advice, and weekly reports useful.',
      icon: 'fast-food-outline',
      color: CALORIE_COLOR,
      action: 'meal',
      actionLabel: 'Add meal',
      progressLabel: `${calorieProgress}% food`,
    });
  }

  if (stepsProgress < 100) {
    addItem({
      id: 'movement-dose',
      label: planItems.length ? 'Later' : 'Now',
      title: stepsProgress >= 70 ? 'Finish steps' : isPremium ? 'Add a short walk' : 'Use the step preview',
      body: isPremium
        ? 'A short walk improves movement signal without changing your food target.'
        : 'The free preview keeps movement visible without changing Goal Achieved.',
      icon: 'footsteps-outline',
      color: STEP_COLOR,
      action: 'steps',
      actionLabel: 'Track steps',
      progressLabel: `${stepsProgress}% steps`,
    });
  }

  if (isPremium && workoutTarget > 0 && workoutProgress < 70 && selectedMood !== 'sore' && selectedMood !== 'tired') {
    addItem({
      id: 'workout-window',
      label: planItems.length ? 'Later' : 'Now',
      title: 'Workout window',
      body: 'Keep the session short and logged so the Full Health Score has activity context.',
      icon: 'barbell-outline',
      color: WORKOUT_COLOR,
      action: 'workout',
      actionLabel: 'Start',
      progressLabel: `${workoutProgress}% workout`,
    });
  }

  if (selectedMood === 'stressed' || selectedMood === 'tired' || selectedMood === 'sore') {
    addItem({
      id: 'recovery-guardrail',
      label: planItems.length ? 'Later' : 'Now',
      title: 'Recovery guardrail',
      body: 'Use a lighter action today so consistency stays realistic.',
      icon: 'leaf-outline',
      color: '#10B981',
      action: 'mindfulness',
      actionLabel: 'Breathe',
      progressLabel: selectedMood,
    });
  }

  if (overallProgress >= 85) {
    addItem({
      id: 'protect-good-day',
      label: planItems.length ? 'Later' : 'Now',
      title: 'Protect the good day',
      body: 'Do one honest final log instead of chasing extra activity.',
      icon: 'checkmark-done-outline',
      color: '#10B981',
      action: 'note',
      actionLabel: 'Reflect',
      progressLabel: `${overallProgress}% score`,
    });
  }

  while (planItems.length < 3) {
    const fallback = [
      {
        id: 'fallback-water',
        label: 'Now',
        title: 'Keep water visible',
        body: 'A water check-in is quick and keeps the coach grounded.',
        icon: 'water-outline' as IconName,
        color: WATER_COLOR,
        action: 'water' as QuickAddAction,
        actionLabel: 'Add water',
        progressLabel: `${hydrationProgress}% water`,
      },
      {
        id: 'fallback-note',
        label: 'Next',
        title: 'Add context',
        body: 'A short note helps explain cravings, energy, or schedule changes.',
        icon: 'document-text-outline' as IconName,
        color: '#64748B',
        action: 'note' as QuickAddAction,
        actionLabel: 'Note',
        progressLabel: 'Local history',
      },
      {
        id: 'fallback-plan',
        label: 'Later',
        title: 'Plan the next meal',
        body: 'A simple meal plan makes the next log easier to complete.',
        icon: 'basket-outline' as IconName,
        color: '#0EA5E9',
        action: 'mealPlanner' as QuickAddAction,
        actionLabel: 'Plan',
        progressLabel: 'Next meal',
      },
    ].find((item) => !planItems.some((existing) => existing.id === item.id || existing.action === item.action));

    if (!fallback) break;
    planItems.push(fallback);
  }

  return planItems.slice(0, 3).map((item, index) => ({
    ...item,
    label: index === 0 ? 'Now' : index === 1 ? 'Next' : 'Later',
  }));
};

const getWeeklyReportCopy = (
  report: WeeklyNutritionReport,
  isPremium: boolean,
  activeAppointments: number
) => {
  if (!report.dailyScores.length) {
    return 'One meal and one water log will turn this into a useful weekly summary.';
  }

  const bestDay = report.bestDay ? `Best day: Day ${report.bestDay.dayNo}.` : '';
  const appointmentCopy = activeAppointments > 0
    ? `${activeAppointments} active appointment${activeAppointments === 1 ? '' : 's'} also stay visible.`
    : 'No active appointment is linked to this week.';

  if (!isPremium) {
    return `This week is averaging ${report.weeklyScore}. Free shows calories, hydration, and basic history. ${bestDay}`;
  }

  return `This week is averaging ${report.weeklyScore}. ${bestDay} Next focus: ${report.nextWeekFocus.title.toLowerCase()}. ${appointmentCopy}`;
};

function NutritionScoreCard({
  report,
  colors,
  isPremium,
  onAction,
}: {
  report: WeeklyNutritionReport;
  colors: any;
  isPremium: boolean;
  onAction: (action: QuickAddAction) => void;
}) {
  const styles = useMemo(() => getStyles(colors), [colors]);
  const todayScore = report.todayScore;
  const score = todayScore?.score || 0;
  const scoreColor = getNutritionScoreColor(score);
  const proteinLabel =
    !todayScore || todayScore.proteinScore === null
      ? 'Protein data needed'
      : `${todayScore?.proteinGrams || 0}g protein`;
  const scoreLabel = todayScore ? `${score}` : '--';
  const focusAction = report.nextWeekFocus.action;
  const nutritionFactors = [
    {
      label: 'Calories',
      value: getCalorieProgressLabel(todayScore),
      premiumOnly: false,
    },
    {
      label: 'Hydration',
      value: todayScore ? `${todayScore.hydrationScore}%` : '--',
      premiumOnly: false,
    },
    {
      label: 'Protein',
      value: !todayScore || todayScore.proteinScore === null ? '--' : `${todayScore.proteinScore}%`,
      premiumOnly: true,
    },
    {
      label: 'Meal timing',
      value: todayScore ? `${todayScore.mealTimingScore}%` : '--',
      premiumOnly: true,
    },
    {
      label: 'Logging',
      value: todayScore ? `${todayScore.loggingScore}%` : '--',
      premiumOnly: false,
    },
  ].filter((item) => isPremium || !item.premiumOnly);

  return (
    <View style={styles.nutritionScoreCard}>
      <View style={styles.nutritionScoreMain}>
        <ProgressRing
          progress={score / 100}
          size={Math.min(hp(10.6), wp(23.5))}
          strokeWidth={Math.min(hp(1), wp(2.2))}
          color={scoreColor}
          trackColor={colors.cardBorder || colors.border}
          icon="nutrition-outline"
          value={scoreLabel}
          label="Score"
          textColor={colors.textPrimary}
          mutedTextColor={colors.textSecondary}
        />
        <View style={styles.nutritionScoreCopy}>
          <Text style={styles.eyebrow}>Nutrition</Text>
          <Text style={styles.nutritionScoreTitle}>
            {isPremium ? 'Nutrition Score Insights' : 'Basic Nutrition Score'}
          </Text>
          <Text style={styles.nutritionScoreText}>
            {todayScore
              ? isPremium
                ? `${report.nextWeekFocus.title}. ${report.nextWeekFocus.body}`
                : 'Free history tracks calories, hydration, and logging. Premium adds protein, timing, and deeper insight history.'
              : 'Start with one meal and one water log to build your first score.'}
          </Text>
        </View>
      </View>

      <View style={styles.nutritionFactorGrid}>
        {nutritionFactors.map((item) => (
          <View key={item.label} style={styles.nutritionFactor}>
            <Text style={styles.nutritionFactorValue} numberOfLines={1} adjustsFontSizeToFit>
              {item.value}
            </Text>
            <Text style={styles.nutritionFactorLabel} numberOfLines={1}>
              {item.label === 'Protein' ? proteinLabel : item.label}
            </Text>
          </View>
        ))}
      </View>

      <AnimatedPressable
        style={styles.nutritionFocusButton}
        onPress={() => onAction(focusAction as QuickAddAction)}
      >
        <Text style={styles.nutritionFocusText}>{getNutritionActionLabel(focusAction)}</Text>
        <Ionicons name="arrow-forward" size={Math.min(hp(1.9), wp(4.2))} color={colors.primary} />
      </AnimatedPressable>
    </View>
  );
}

function HabitMissionCard({
  mission,
  streakCount,
  colors,
  onAction,
  onComplete,
  habitPreferences,
  onToggleReminders,
}: {
  mission: HabitMission;
  streakCount: number;
  colors: any;
  onAction: (action: QuickAddAction) => void;
  onComplete?: () => void;
  habitPreferences?: HabitPreferences | null;
  onToggleReminders?: () => void;
}) {
  const styles = useMemo(() => getStyles(colors), [colors]);
  const complete = !!mission.completedAt;
  const remindersEnabled = habitPreferences?.remindersEnabled !== false;

  return (
    <View style={styles.habitMissionCard}>
      <View style={styles.habitMissionHeader}>
        <View style={[styles.habitMissionIcon, { backgroundColor: `${colors.primary}18` }]}>
          <Ionicons name={complete ? 'checkmark-done-outline' : 'sparkles-outline'} size={Math.min(hp(2.7), wp(6))} color={colors.primary} />
        </View>
        <View style={styles.habitMissionTextWrap}>
          <Text style={styles.eyebrow}>Behavior Coach</Text>
          <Text style={styles.habitMissionTitle}>{mission.title}</Text>
        </View>
        <View style={styles.habitStreakPill}>
          <Ionicons name="flame-outline" size={Math.min(hp(1.7), wp(3.8))} color={colors.warning || '#F59E0B'} />
          <Text style={styles.habitStreakText}>{streakCount}</Text>
        </View>
      </View>
      <Text style={styles.habitMissionBody}>{mission.body}</Text>
      {mission.streakMessage ? (
        <View style={styles.streakStatusBox}>
          <Ionicons
            name={mission.streakStatus === 'recovery' ? 'refresh-outline' : 'flame-outline'}
            size={Math.min(hp(1.8), wp(4))}
            color={mission.streakStatus === 'recovery' ? '#F97316' : colors.primary}
          />
          <Text style={styles.streakStatusText}>{mission.streakMessage}</Text>
        </View>
      ) : null}

      <View style={styles.lessonBox}>
        <Text style={styles.lessonTitle}>{mission.lessonTitle}</Text>
        <Text style={styles.lessonBody}>{mission.lessonBody}</Text>
        {(mission.lessonSteps || []).map((step, index) => (
          <View key={`${mission.lessonId}-step-${index}`} style={styles.lessonStepRow}>
            <View style={styles.lessonStepDot} />
            <Text style={styles.lessonStepText}>{step}</Text>
          </View>
        ))}
      </View>

      {mission.personalPlan?.length ? (
        <View style={styles.personalPlanBox}>
          <Text style={styles.personalPlanTitle}>Personal habit plan</Text>
          {mission.personalPlan.map((step) => (
            <View key={step.id} style={styles.personalPlanRow}>
              <Ionicons
                name={step.done ? 'checkmark-circle' : 'ellipse-outline'}
                size={Math.min(hp(1.8), wp(4))}
                color={step.done ? '#10B981' : colors.textSecondary}
              />
              <Text style={styles.personalPlanText}>{step.label}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {mission.recoveryPlan?.length ? (
        <View style={styles.recoveryPlanBox}>
          <Text style={styles.recoveryPlanTitle}>Recovery plan</Text>
          {mission.recoveryPlan.map((step) => (
            <Text key={step} style={styles.recoveryPlanText}>{step}</Text>
          ))}
        </View>
      ) : null}

      <View style={styles.checkInRow}>
        <View style={styles.checkInChip}>
          <Ionicons name="flash-outline" size={Math.min(hp(1.7), wp(3.8))} color={colors.primary} />
          <Text style={styles.checkInText}>Craving</Text>
        </View>
        <View style={styles.checkInChip}>
          <Ionicons name="happy-outline" size={Math.min(hp(1.7), wp(3.8))} color={colors.primary} />
          <Text style={styles.checkInText}>Mood-food</Text>
        </View>
        <View style={styles.checkInChip}>
          <Ionicons name="create-outline" size={Math.min(hp(1.7), wp(3.8))} color={colors.primary} />
          <Text style={styles.checkInText}>Reflect</Text>
        </View>
      </View>

      <View style={styles.habitActionRow}>
        <AnimatedPressable
          style={styles.habitPrimaryButton}
          onPress={() => onAction(mission.action as QuickAddAction)}
        >
          <Text style={styles.habitPrimaryText}>{getNutritionActionLabel(mission.action)}</Text>
        </AnimatedPressable>
        <AnimatedPressable
          style={[styles.habitSecondaryButton, complete && styles.habitSecondaryButtonDone]}
          onPress={() => onComplete?.()}
        >
          <Text style={styles.habitSecondaryText}>{complete ? 'Done' : 'Complete'}</Text>
        </AnimatedPressable>
      </View>

      <View style={styles.reminderPreferenceRow}>
        <View style={styles.reminderPreferenceTextWrap}>
          <Text style={styles.reminderPreferenceTitle}>Mission reminder</Text>
          <Text style={styles.reminderPreferenceBody}>
            {remindersEnabled ? `On at ${formatHabitReminderTime(habitPreferences)}` : 'Off'}
          </Text>
        </View>
        <AnimatedPressable style={styles.reminderToggleButton} onPress={() => onToggleReminders?.()}>
          <Text style={styles.reminderToggleText}>{remindersEnabled ? 'Pause' : 'Enable'}</Text>
        </AnimatedPressable>
      </View>
    </View>
  );
}

export function DashboardCommandCenter({
  days,
  appointments,
  chatAlertCount,
  streak,
  isPremium,
  colors,
  selectedMood,
  onOpenQuickAdd,
  onQuickAddAction,
  afterCommandCenter,
  showReadiness = true,
  showWeeklyReport = true,
  goalDisplayMode = "simple",
  nutritionReport: providedNutritionReport,
  habitMission,
  habitStreakCount = 0,
  habitPreferences,
  onCompleteHabitMission,
  onToggleHabitReminders,
}: DashboardCommandCenterProps) {
  const styles = useMemo(() => getStyles(colors), [colors]);
  const [scoreInfoVisible, setScoreInfoVisible] = useState(false);
  const today = useMemo(() => getTodayDay(days), [days]);
  const nutritionReport = useMemo(
    () => providedNutritionReport || buildWeeklyNutritionReport(days),
    [days, providedNutritionReport]
  );
  const nextAppointment = useMemo(() => getNextAppointment(appointments), [appointments]);
  const appointmentLabel = nextAppointment ? formatAppointmentLabel(nextAppointment.appointment) : null;
  const workoutInsightsUnlocked = isPremium;
  const coachFeedUnlocked = true;

  const freeStepBurnedCalories = today && !isPremium ? getFreeStepBurnedCalories(today) : 0;
  const calorieProgress = today
    ? Math.round(getCalorieScorePercent(today.achievedCalories, today.targetCalories))
    : 0;
  const hydrationProgress = today ? getSingleMetricProgress(getHydrationValue(today), today.targetHydration) : 0;
  const workoutTarget = workoutInsightsUnlocked && today ? getBurnedCaloriesTarget(today) : 0;
  const workoutCalories = workoutInsightsUnlocked && today ? getExerciseCaloriesBurned(today) : 0;
  const workoutProgress = workoutInsightsUnlocked && workoutTarget > 0 ? getSingleMetricProgress(workoutCalories, workoutTarget) : 0;
  const walkingTarget = isPremium && today ? getWalkingCaloriesTarget(today) : 0;
  const walkingCalories = isPremium && today ? getWalkingCaloriesBurned(today) : 0;
  const walkingProgress = isPremium && walkingTarget > 0 ? getSingleMetricProgress(walkingCalories, walkingTarget) : 0;
  const rawSteps = today ? getDaySteps(today) : 0;
  const stepsTarget = isPremium ? getDayStepGoal(today) : FREE_PLAN_LIMITS.dailyStepCounterPreview;
  const displayedSteps = isPremium ? rawSteps : Math.min(rawSteps, FREE_PLAN_LIMITS.dailyStepCounterPreview);
  const stepsProgress = getSingleMetricProgress(displayedSteps, stepsTarget);
  const healthScore = today ? getDashboardHealthScore(today, isPremium) : null;
  const overallProgress = healthScore?.score || 0;
  const weeklyScoreTrend = useMemo(
    () => getWeeklyHealthScoreTrend(days, isPremium),
    [days, isPremium]
  );
  const streakCount = Number(streak?.streakCount || 0);
  const calorieTargetLabel = today
    ? formatCalorieTarget(today, goalDisplayMode, isPremium ? "premium" : "free")
    : "0";
  const hydrationTargetLabel = today
    ? formatHydrationTarget(today, goalDisplayMode, isPremium ? "premium" : "free")
    : "0";
  const calorieMetricSubtitle = `${calorieProgress}% food | ${calorieTargetLabel} goal`;
  const closeNudge = getCloseNudge({
    hydrationProgress,
    calorieProgress,
    stepsProgress,
    isPremium,
  });
  const dailyEncouragement = getDailyEncouragement({
    today,
    overallProgress,
    hydrationProgress,
    calorieProgress,
    closeNudge,
  });
  const todayPlan = useMemo(
    () =>
      buildTodayPlan({
        today,
        isPremium,
        selectedMood,
        hydrationProgress,
        calorieProgress,
        stepsProgress,
        workoutTarget,
        workoutProgress,
        overallProgress,
      }),
    [
      calorieProgress,
      hydrationProgress,
      isPremium,
      overallProgress,
      selectedMood,
      stepsProgress,
      today,
      workoutTarget,
      workoutProgress,
    ]
  );

  const scoreInfoTitle = isPremium ? 'Full Health Score' : 'Basic Score';
  const freeScoreWeights = HEALTH_SCORE_WEIGHTS.free;
  const premiumScoreWeights = HEALTH_SCORE_WEIGHTS.premium;
  const scoreInfoRows = [
    {
      icon: 'pulse-outline' as IconName,
      label: 'Current model',
      text: getHealthScorePlanExplanation(isPremium),
    },
    {
      icon: 'checkmark-circle-outline' as IconName,
      label: 'Free weights',
      text: `calories ${Math.round(freeScoreWeights.calories * 100)}%, hydration ${Math.round(freeScoreWeights.hydration * 100)}%, ${FREE_PLAN_LIMITS.dailyStepCounterPreview}-step preview ${Math.round(freeScoreWeights.stepsPreview * 100)}%`,
    },
    {
      icon: 'diamond-outline' as IconName,
      label: 'Premium weights',
      text: `calories ${Math.round(premiumScoreWeights.calories * 100)}%, hydration ${Math.round(premiumScoreWeights.hydration * 100)}%, workouts ${Math.round(premiumScoreWeights.workout * 100)}%, walking/steps ${Math.round(premiumScoreWeights.walking * 100)}%`,
    },
    {
      icon: 'swap-horizontal-outline' as IconName,
      label: 'Why it changes',
      text: getPremiumScoreChangeExplanation(),
    },
  ];
  const scoreMetricRows = healthScore?.metrics.filter(
    (metric) => metric.weight > 0 || metric.hasSignal || metric.hasTarget
  ) || [];
  const reliabilityCopy = getHealthScoreReliabilityCopy(healthScore);
  const scoreInfoNote = isPremium
    ? `${reliabilityCopy} Weekly trend: ${weeklyScoreTrend.label}. ${HEALTH_SCORE_DISCLAIMER}`
    : `${reliabilityCopy} The Free model stays useful with a ${FREE_PLAN_LIMITS.dailyStepCounterPreview}-step preview. ${HEALTH_SCORE_DISCLAIMER}`;

  const mainAction =
    closeNudge
      ? { label: closeNudge.label, icon: closeNudge.icon, action: closeNudge.action }
      : hydrationProgress < 65
      ? { label: 'Add Water', icon: 'water-outline' as IconName, action: 'water' as QuickAddAction }
      : calorieProgress < 75
        ? { label: 'Log Meal', icon: 'fast-food-outline' as IconName, action: 'meal' as QuickAddAction }
        : workoutInsightsUnlocked && workoutTarget > 0
          ? { label: 'Start Workout', icon: 'barbell-outline' as IconName, action: 'workout' as QuickAddAction }
          : stepsProgress < 100
            ? { label: 'Track Steps', icon: 'footsteps-outline' as IconName, action: 'steps' as QuickAddAction }
            : { label: 'Reflect', icon: 'document-text-outline' as IconName, action: 'note' as QuickAddAction };

  const renderMetric = (
    icon: IconName,
    label: string,
    value: string,
    color: string,
    subtitle?: string
  ) => (
    <View style={styles.metricCell}>
      <View style={[styles.metricIcon, { backgroundColor: `${color}18` }]}>
        <Ionicons name={icon} size={Math.min(hp(2.2), wp(4.9))} color={color} />
      </View>
      <View style={styles.metricTextWrap}>
        <Text style={styles.metricLabel} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.72}>{label}</Text>
        <Text style={styles.metricValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.65}>{value}</Text>
        {subtitle ? <Text style={styles.metricSubtitle} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.68}>{subtitle}</Text> : null}
      </View>
    </View>
  );

  return (
    <View style={styles.wrapper}>
      <View style={styles.commandCard}>
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.eyebrow}>Today</Text>
            <Text style={styles.title}>Command Center</Text>
          </View>
          <AnimatedPressable style={styles.quickAddSmallButton} onPress={onOpenQuickAdd}>
            <Ionicons name="add" size={Math.min(hp(2.4), wp(5.4))} color={colors.textOnPrimary} />
            <Text style={styles.quickAddSmallText}>Quick Add</Text>
          </AnimatedPressable>
        </View>

        <View style={styles.heroRow}>
          <View style={styles.scoreRingWrap}>
            <ProgressRing
              progress={overallProgress / 100}
              size={Math.min(hp(13), wp(28))}
              strokeWidth={Math.min(hp(1.2), wp(2.7))}
              color={colors.primary}
              trackColor={colors.cardBorder || colors.border}
              icon="pulse-outline"
              value={`${overallProgress}%`}
              label={scoreInfoTitle}
              textColor={colors.textPrimary}
              mutedTextColor={colors.textSecondary}
            />
            <AnimatedPressable
              style={styles.scoreInfoButton}
              onPress={() => setScoreInfoVisible(true)}
              accessibilityRole="button"
              accessibilityLabel={`Score explained for ${scoreInfoTitle}`}
            >
              <Ionicons
                name="information-circle-outline"
                size={Math.min(hp(2.35), wp(5.2))}
                color={colors.primary}
              />
            </AnimatedPressable>
          </View>
          <View style={styles.heroCopy}>
            <Text style={styles.heroTitle} numberOfLines={2}>
              {today ? `Day ${today.dayNo} is active` : 'Start today strong'}
            </Text>
            <Text style={styles.heroMessage}>
              {dailyEncouragement}
            </Text>
            <Text style={styles.scoreSignalText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.72}>
              {healthScore?.confidenceLabel || 'Needs more logs'} | {weeklyScoreTrend.label}
            </Text>
            <AnimatedPressable
              style={styles.mainActionButton}
              onPress={() => onQuickAddAction(mainAction.action)}
            >
              <Ionicons name={mainAction.icon} size={Math.min(hp(2.25), wp(5))} color={colors.textOnPrimary} />
              <Text style={styles.mainActionText}>{mainAction.label}</Text>
            </AnimatedPressable>
          </View>
        </View>

        <View style={styles.todayPlanCard}>
          <View style={styles.todayPlanHeader}>
            <View>
              <Text style={styles.todayPlanEyebrow}>Smart Plan</Text>
              <Text style={styles.todayPlanTitle}>Next 3 moves</Text>
            </View>
            <View style={styles.todayPlanBadge}>
              <Ionicons name="bulb-outline" size={Math.min(hp(1.7), wp(3.8))} color={colors.primary} />
              <Text style={styles.todayPlanBadgeText}>{isPremium ? 'Full context' : 'Core context'}</Text>
            </View>
          </View>

          <View style={styles.todayPlanList}>
            {todayPlan.map((item) => (
              <AnimatedPressable
                key={item.id}
                style={styles.todayPlanItem}
                onPress={() => onQuickAddAction(item.action)}
              >
                <View style={styles.todayPlanLeft}>
                  <View style={[styles.todayPlanIcon, { backgroundColor: `${item.color}18` }]}>
                    <Ionicons name={item.icon} size={Math.min(hp(2.05), wp(4.6))} color={item.color} />
                  </View>
                  <View style={styles.todayPlanCopy}>
                    <View style={styles.todayPlanTitleRow}>
                      <Text style={styles.todayPlanStep}>{item.label}</Text>
                      <Text style={styles.todayPlanItemTitle} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.78}>
                        {item.title}
                      </Text>
                    </View>
                    <Text style={styles.todayPlanBody} numberOfLines={2}>
                      {item.body}
                    </Text>
                  </View>
                </View>
                <View style={styles.todayPlanRight}>
                  <Text style={styles.todayPlanProgress} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.72}>
                    {item.progressLabel}
                  </Text>
                  <View style={styles.todayPlanActionPill}>
                    <Text style={styles.todayPlanActionText}>{item.actionLabel}</Text>
                  </View>
                </View>
              </AnimatedPressable>
            ))}
          </View>
        </View>

        <View style={styles.metricGrid}>
          {workoutInsightsUnlocked ? renderMetric(
            'barbell-outline',
            'Workout',
            workoutTarget > 0 ? `${workoutCalories}/${workoutTarget}` : 'Open plan',
            WORKOUT_COLOR,
            workoutTarget > 0 ? `${workoutProgress}% burned` : 'Today'
          ) : null}
          {isPremium ? renderMetric(
            'footsteps-outline',
            'Walking',
            walkingTarget > 0 ? `${walkingCalories}/${walkingTarget}` : String(walkingCalories),
            STEP_COLOR,
            walkingTarget > 0 ? `${walkingProgress}% burned` : 'Today'
          ) : null}
          {renderMetric(
            'footsteps-outline',
            isPremium ? 'Steps' : 'Steps Preview',
            `${formatStepCount(displayedSteps)}/${formatStepCount(stepsTarget)}`,
            STEP_COLOR,
            isPremium ? `${stepsProgress}% of daily goal` : `${freeStepBurnedCalories} kcal burned`
          )}
          {renderMetric('flame-outline', 'Calories', `${Math.round(getProgressValue(today?.achievedCalories))}`, CALORIE_COLOR, `Manual log | ${calorieMetricSubtitle}`)}
          {renderMetric('water-outline', 'Water', `${getHydrationValue(today || {}).toFixed(1)}L`, WATER_COLOR, `Manual log | ${hydrationProgress}% | ${hydrationTargetLabel}L goal`)}
          {renderMetric('calendar-outline', 'Next appointment', appointmentLabel?.title || 'None', APPOINTMENT_COLOR, appointmentLabel?.subtitle || 'Book when ready')}
          {renderMetric('chatbubbles-outline', 'Chat alerts', chatAlertCount > 0 ? String(chatAlertCount) : '0', CHAT_COLOR, chatAlertCount > 0 ? 'Unread messages' : 'All caught up')}
          {renderMetric('flame', 'Streak', `${streakCount} day${streakCount === 1 ? '' : 's'}`, colors.warning || '#F59E0B', `${Number(streak?.longestStreak || 0)} best`)}
        </View>

        <View style={styles.sourceRow}>
          {DASHBOARD_DATA_SOURCE_LABELS.map((source) => (
            <View key={source.key} style={styles.sourceChip}>
              <Ionicons
                name={
                  source.key === 'manualLog'
                    ? 'create-outline'
                    : source.key === 'pedometer'
                      ? 'phone-portrait-outline'
                      : 'time-outline'
                }
                size={Math.min(hp(1.45), wp(3.3))}
                color={colors.primary}
              />
              <Text style={styles.sourceText}>{source.label}</Text>
            </View>
          ))}
        </View>
        <Text style={styles.disclaimerText}>{HEALTH_SCORE_DISCLAIMER}</Text>
      </View>

      <Modal
        visible={scoreInfoVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setScoreInfoVisible(false)}
      >
        <Pressable style={styles.scoreInfoBackdrop} onPress={() => setScoreInfoVisible(false)}>
          <Pressable style={styles.scoreInfoCard} onPress={(event) => event.stopPropagation()}>
            <View style={styles.scoreInfoHeader}>
              <View style={styles.scoreInfoIcon}>
                <Ionicons name="pulse-outline" size={Math.min(hp(2.5), wp(5.5))} color={colors.primary} />
              </View>
              <View style={styles.scoreInfoTitleWrap}>
                <Text style={styles.scoreInfoEyebrow}>{scoreInfoTitle}</Text>
                <Text style={styles.scoreInfoTitle}>Score explained</Text>
              </View>
              <AnimatedPressable
                style={styles.scoreInfoClose}
                onPress={() => setScoreInfoVisible(false)}
                accessibilityRole="button"
                accessibilityLabel="Close score explanation"
              >
                <Ionicons name="close" size={Math.min(hp(2.35), wp(5.2))} color={colors.textPrimary} />
              </AnimatedPressable>
            </View>

            <View style={styles.scoreInfoRows}>
              {scoreInfoRows.map((row) => (
                <View key={row.label} style={styles.scoreInfoRow}>
                  <View style={styles.scoreInfoRowIcon}>
                    <Ionicons name={row.icon} size={Math.min(hp(2.1), wp(4.7))} color={colors.primary} />
                  </View>
                  <View style={styles.scoreInfoRowTextWrap}>
                    <Text style={styles.scoreInfoRowLabel}>{row.label}</Text>
                    <Text style={styles.scoreInfoRowText}>{row.text}</Text>
                  </View>
                </View>
              ))}
            </View>

            {scoreMetricRows.length ? (
              <View style={styles.scoreMetricSection}>
                <Text style={styles.scoreMetricHeader}>Today's inputs</Text>
                {scoreMetricRows.map((metric) => (
                  <View key={metric.key} style={styles.scoreMetricRow}>
                    <View style={styles.scoreMetricTop}>
                      <View style={styles.scoreMetricTitleWrap}>
                        <Ionicons name={getScoreMetricIcon(metric)} size={Math.min(hp(1.9), wp(4.2))} color={colors.primary} />
                        <Text style={styles.scoreMetricLabel}>{metric.label}</Text>
                      </View>
                      <View style={styles.scoreMetricPill}>
                        <Text style={styles.scoreMetricPillText}>{metric.sourceLabel}</Text>
                      </View>
                    </View>
                    <Text style={styles.scoreMetricBody}>
                      {formatScoreMetricAmount(metric)} | {getHealthScoreMetricStatus(metric)} | weight {metric.weightPercent}% | contribution {Math.round(metric.contribution)}%
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}

            <Text style={styles.scoreInfoNote}>{scoreInfoNote}</Text>
          </Pressable>
        </Pressable>
      </Modal>

      <NutritionScoreCard
        report={nutritionReport}
        colors={colors}
        isPremium={isPremium}
        onAction={onQuickAddAction}
      />

      {coachFeedUnlocked && habitMission ? (
        <HabitMissionCard
          mission={habitMission}
          streakCount={habitStreakCount}
          colors={colors}
          onAction={onQuickAddAction}
          onComplete={onCompleteHabitMission}
          habitPreferences={habitPreferences}
          onToggleReminders={onToggleHabitReminders}
        />
      ) : null}

      {afterCommandCenter}

      {showReadiness ? (
        <ReadinessScoreCard
          days={days}
          isPremium={isPremium}
          colors={colors}
          selectedMood={selectedMood}
        />
      ) : null}

      {showWeeklyReport ? (
        <DashboardWeeklyHealthReport
          days={days}
          appointments={appointments}
          isPremium={isPremium}
          colors={colors}
          nutritionReport={nutritionReport}
          embedded
        />
      ) : null}
    </View>
  );
}

export function ReadinessScoreCard({
  days,
  isPremium,
  colors,
  selectedMood,
}: ReadinessScoreCardProps) {
  const styles = useMemo(() => getStyles(colors), [colors]);
  const today = useMemo(() => getTodayDay(days), [days]);
  const readiness = useMemo(
    () => getReadiness(today, days, selectedMood, isPremium),
    [days, isPremium, selectedMood, today]
  );
  const calorieProgress = today ? getSingleMetricProgress(today.achievedCalories, today.targetCalories) : 0;
  const workoutTarget = isPremium && today ? getBurnedCaloriesTarget(today) : 0;
  const workoutCalories = isPremium && today ? getExerciseCaloriesBurned(today) : 0;
  const workoutProgress = isPremium && workoutTarget > 0 ? getSingleMetricProgress(workoutCalories, workoutTarget) : 0;
  const workoutsDone = useMemo(() => {
    if (!isPremium) return 0;
    return days.filter((day) => {
      if (day.status === 'locked') return false;
      return getExerciseCaloriesBurned(day) > 0 || Number(day.exerciseDurationSeconds || 0) > 0;
    }).length;
  }, [days, isPremium]);
  const mood = moodOptions.find((item) => item.id === selectedMood);

  return (
    <View style={styles.readinessCard}>
      <View style={styles.readinessHeader}>
        <View style={[styles.readinessIcon, { backgroundColor: `${readiness.color}18` }]}>
          <Ionicons name={readiness.icon} size={Math.min(hp(3), wp(6.5))} color={readiness.color} />
        </View>
        <View style={styles.readinessTextWrap}>
          <Text style={styles.eyebrow}>Readiness + Recovery</Text>
          <Text style={styles.readinessTitle}>{readiness.label}</Text>
          <Text style={styles.readinessMessage}>{readiness.message}</Text>
        </View>
        <Text style={[styles.readinessScore, { color: readiness.color }]}>{readiness.score}</Text>
      </View>
      <View style={styles.factorRow}>
        <View style={styles.factorPill}>
          <Ionicons name="moon-outline" size={Math.min(hp(1.8), wp(4))} color={colors.textSecondary} />
          <Text style={styles.factorText}>Sleep not logged</Text>
        </View>
        <View style={styles.factorPill}>
          <Ionicons name={mood?.icon || 'happy-outline'} size={Math.min(hp(1.8), wp(4))} color={mood?.color || colors.textSecondary} />
          <Text style={styles.factorText}>{mood ? mood.label : 'Mood empty'}</Text>
        </View>
        {isPremium ? (
          <View style={styles.factorPill}>
            <Ionicons name="barbell-outline" size={Math.min(hp(1.8), wp(4))} color={WORKOUT_COLOR} />
            <Text style={styles.factorText}>{workoutProgress || workoutsDone ? 'Load tracked' : 'No load yet'}</Text>
          </View>
        ) : (
          <View style={styles.factorPill}>
            <Ionicons name="nutrition-outline" size={Math.min(hp(1.8), wp(4))} color={CALORIE_COLOR} />
            <Text style={styles.factorText}>{calorieProgress > 0 ? 'Meals tracked' : 'Meals empty'}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

export function DashboardWeeklyHealthReport({
  days,
  appointments,
  isPremium,
  colors,
  nutritionReport: providedNutritionReport,
  embedded = false,
}: {
  days: DashboardDay[];
  appointments: any[];
  isPremium: boolean;
  colors: any;
  nutritionReport?: WeeklyNutritionReport | null;
  embedded?: boolean;
}) {
  const styles = useMemo(() => getStyles(colors), [colors]);
  const router = useRouter();
  const nutritionReport = useMemo(
    () => providedNutritionReport || buildWeeklyNutritionReport(days),
    [days, providedNutritionReport]
  );
  const activeAppointments = useMemo(
    () =>
      appointments.filter((appointment) => {
        const status = String(appointment?.status || '').toLowerCase();
        return !['cancelled', 'canceled', 'rejected'].includes(status);
      }).length,
    [appointments]
  );
  const reportItems = buildNutritionReportItems(nutritionReport).filter((item) =>
    isPremium || ['Weekly score', 'Hydration', 'Calories'].includes(item.label)
  );
  const hasReportData = nutritionReport.dailyScores.length > 0;
  const weeklyReportCopy = getWeeklyReportCopy(nutritionReport, isPremium, activeAppointments);

  const shareWeeklyReport = async () => {
    if (!isPremium) {
      Alert.alert(
        'Reports Export is Premium',
        'Free includes basic nutrition history. Premium adds weekly progress report export.'
      );
      return;
    }

    const message = buildNutritionShareMessage(nutritionReport, isPremium, activeAppointments);

    try {
      await Share.share({ message });
    } catch {
      // Share can be unavailable on some emulator builds.
    }
  };

  return (
    <View style={embedded ? styles.reportEmbeddedSection : styles.reportSection}>
      <View style={styles.reportCard}>
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.eyebrow}>Nutrition</Text>
            <Text style={styles.title}>Weekly Diet Report</Text>
          </View>
          <AnimatedPressable style={styles.shareButton} onPress={shareWeeklyReport}>
            <Ionicons
              name={isPremium ? "share-social-outline" : "lock-closed-outline"}
              size={Math.min(hp(2.1), wp(4.8))}
              color={colors.primary}
            />
            <Text style={styles.shareText}>{isPremium ? 'Share' : 'Premium'}</Text>
          </AnimatedPressable>
        </View>
        <View style={styles.reportGrid}>
          {hasReportData ? (
            reportItems.map((item) => (
              <View key={item.label} style={styles.reportItem}>
                <Ionicons name={item.icon} size={Math.min(hp(2.2), wp(4.9))} color={item.color} />
                <Text style={styles.reportValue} numberOfLines={1} adjustsFontSizeToFit>{item.value}</Text>
                <Text style={styles.reportLabel} numberOfLines={1}>{item.label}</Text>
              </View>
            ))
          ) : (
            <View style={styles.reportEmptyState}>
              <Ionicons name="analytics-outline" size={Math.min(hp(3), wp(6.5))} color={colors.primary} />
              <Text style={styles.reportEmptyTitle}>No unlocked report data yet</Text>
              <Text style={styles.reportEmptyText}>Log one meal and one water entry to build the first weekly diet report.</Text>
            </View>
          )}
        </View>
        <View style={[styles.reportFocusBox, (!hasReportData || !isPremium) && styles.reportFocusBoxMuted]}>
          <View style={[styles.reportFocusIcon, { backgroundColor: `${colors.primary}16` }]}>
            <Ionicons
              name={isPremium ? "compass-outline" : "lock-closed-outline"}
              size={Math.min(hp(2.4), wp(5.4))}
              color={colors.primary}
            />
          </View>
          <View style={styles.reportFocusTextWrap}>
            <Text style={styles.reportFocusTitle}>{isPremium ? 'Next week focus' : 'Premium report insights'}</Text>
            <Text style={styles.reportFocusBody}>
              {isPremium
                ? `${weeklyReportCopy} ${nutritionReport.nextWeekFocus.body}`
                : `${weeklyReportCopy} Premium adds deeper nutrition insights and report export.`}
            </Text>
          </View>
        </View>
        <View style={styles.reportActionRow}>
          <AnimatedPressable
            style={styles.reportSecondaryButton}
            onPress={() => router.push('/(main)/(weekly-insights)' as any)}
          >
            <Ionicons name="analytics-outline" size={Math.min(hp(2), wp(4.5))} color={colors.primary} />
            <Text style={styles.reportSecondaryText}>Insights</Text>
          </AnimatedPressable>
          <AnimatedPressable
            style={styles.reportPrimaryButton}
            onPress={() => router.push('/(main)/(doctor-report)' as any)}
          >
            <Ionicons name="document-text-outline" size={Math.min(hp(2), wp(4.5))} color={colors.textOnPrimary} />
            <Text style={styles.reportPrimaryText}>Doctor Report</Text>
          </AnimatedPressable>
        </View>
      </View>
    </View>
  );
}

export function QuickAddBottomSheet({
  visible,
  colors,
  selectedMood,
  isPremium = false,
  onClose,
  onSelectMood,
  onAction,
}: QuickAddBottomSheetProps) {
  const styles = useMemo(() => getStyles(colors), [colors]);
  const [showMoodPicker, setShowMoodPicker] = useState(false);
  const visibleQuickActions = useMemo(
    () => quickActions.filter((action) => isPremium || action.id !== 'workout'),
    [isPremium]
  );

  useEffect(() => {
    if (!visible) {
      setShowMoodPicker(false);
    }
  }, [visible]);

  const handleAction = (action: QuickAddAction | 'mood') => {
    if (action === 'mood') {
      setShowMoodPicker(true);
      return;
    }

    onAction(action);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.sheetBackdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(event) => event.stopPropagation()}>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeader}>
            <View>
              <Text style={styles.sheetTitle}>Quick Add</Text>
              <Text style={styles.sheetSubtitle}>Jump into the action you need now.</Text>
            </View>
            <AnimatedPressable style={styles.sheetCloseButton} onPress={onClose}>
              <Ionicons name="close" size={Math.min(hp(2.4), wp(5.4))} color={colors.textPrimary} />
            </AnimatedPressable>
          </View>

          <View style={styles.quickGrid}>
            {visibleQuickActions.map((action) => (
              <AnimatedPressable
                key={action.id}
                style={styles.quickAction}
                onPress={() => handleAction(action.id)}
              >
                <View style={[styles.quickActionIcon, { backgroundColor: `${action.color}18` }]}>
                  <Ionicons name={action.icon} size={Math.min(hp(2.8), wp(6))} color={action.color} />
                </View>
                <Text style={styles.quickActionLabel} numberOfLines={1}>{action.label}</Text>
                <Text style={styles.quickActionSubtitle} numberOfLines={1}>{action.subtitle}</Text>
              </AnimatedPressable>
            ))}

            <AnimatedPressable style={styles.quickAction} onPress={() => handleAction('mood')}>
              <View style={[styles.quickActionIcon, { backgroundColor: `${colors.warning || '#F59E0B'}18` }]}>
                <Ionicons name="happy-outline" size={Math.min(hp(2.8), wp(6))} color={colors.warning || '#F59E0B'} />
              </View>
              <Text style={styles.quickActionLabel} numberOfLines={1}>Mood</Text>
              <Text style={styles.quickActionSubtitle} numberOfLines={1}>
                {selectedMood ? moodOptions.find((mood) => mood.id === selectedMood)?.label : 'Readiness'}
              </Text>
            </AnimatedPressable>
          </View>

          {showMoodPicker ? (
            <View style={styles.moodPanel}>
              <Text style={styles.moodTitle}>How are you feeling today?</Text>
              <View style={styles.moodGrid}>
                {moodOptions.map((mood) => {
                  const active = selectedMood === mood.id;
                  return (
                    <AnimatedPressable
                      key={mood.id}
                      style={[
                        styles.moodChip,
                        {
                          borderColor: active ? mood.color : colors.cardBorder || colors.border,
                          backgroundColor: active ? `${mood.color}18` : colors.surface || colors.cardBackground,
                        },
                      ]}
                      onPress={() => {
                        onSelectMood(mood.id);
                        setShowMoodPicker(false);
                      }}
                    >
                      <Ionicons name={mood.icon} size={Math.min(hp(2.2), wp(4.9))} color={mood.color} />
                      <Text style={[styles.moodText, active && { color: mood.color }]}>{mood.label}</Text>
                    </AnimatedPressable>
                  );
                })}
              </View>
            </View>
          ) : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  wrapper: {
    paddingHorizontal: wp(4),
    gap: hp(1.4),
    marginBottom: hp(1.2),
  },
  commandCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: hp(2),
    borderWidth: Math.min(wp(0.28), hp(0.16)),
    borderColor: colors.cardBorder || colors.border,
    padding: wp(4),
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: wp(3),
  },
  eyebrow: {
    color: colors.textSecondary,
    fontSize: Math.min(hp(1.25), wp(3)),
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  title: {
    color: colors.textPrimary,
    fontSize: Math.min(hp(2.25), wp(5)),
    fontWeight: '900',
    marginTop: hp(0.2),
  },
  quickAddSmallButton: {
    minHeight: hp(4.3),
    borderRadius: hp(1.4),
    paddingHorizontal: wp(3.2),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: wp(1.3),
    backgroundColor: colors.primary,
  },
  quickAddSmallText: {
    color: colors.textOnPrimary,
    fontSize: Math.min(hp(1.35), wp(3.2)),
    fontWeight: '900',
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(4),
    marginTop: hp(2),
  },
  scoreRingWrap: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreInfoButton: {
    position: 'absolute',
    right: -wp(0.8),
    top: -hp(0.5),
    width: Math.min(hp(3.6), wp(8)),
    height: Math.min(hp(3.6), wp(8)),
    borderRadius: Math.min(hp(1.8), wp(4)),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.cardBackground,
    borderWidth: Math.min(wp(0.24), hp(0.14)),
    borderColor: `${colors.primary}35`,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: hp(0.25) },
    shadowOpacity: 0.1,
    shadowRadius: wp(1.6),
    elevation: 3,
  },
  heroCopy: {
    flex: 1,
  },
  heroTitle: {
    color: colors.textPrimary,
    fontSize: Math.min(hp(2.1), wp(4.8)),
    fontWeight: '900',
  },
  heroMessage: {
    color: colors.textSecondary,
    fontSize: Math.min(hp(1.42), wp(3.35)),
    lineHeight: hp(2.05),
    fontWeight: '700',
    marginTop: hp(0.7),
  },
  scoreSignalText: {
    color: colors.primary,
    fontSize: Math.min(hp(1.16), wp(2.75)),
    lineHeight: hp(1.55),
    fontWeight: '900',
    marginTop: hp(0.55),
  },
  mainActionButton: {
    alignSelf: 'flex-start',
    minHeight: hp(4.7),
    borderRadius: hp(1.5),
    paddingHorizontal: wp(4),
    marginTop: hp(1.3),
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: wp(1.6),
  },
  mainActionText: {
    color: colors.textOnPrimary,
    fontSize: Math.min(hp(1.45), wp(3.45)),
    fontWeight: '900',
  },
  todayPlanCard: {
    marginTop: hp(1.8),
    borderRadius: hp(1.6),
    borderWidth: Math.min(wp(0.28), hp(0.16)),
    borderColor: colors.cardBorder || colors.border,
    backgroundColor: colors.surface || colors.cardBackground,
    paddingHorizontal: wp(3),
    paddingVertical: hp(1.2),
  },
  todayPlanHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: wp(2),
    marginBottom: hp(0.8),
  },
  todayPlanEyebrow: {
    color: colors.textSecondary,
    fontSize: Math.min(hp(1.05), wp(2.55)),
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  todayPlanTitle: {
    color: colors.textPrimary,
    fontSize: Math.min(hp(1.65), wp(3.85)),
    fontWeight: '900',
    marginTop: hp(0.12),
  },
  todayPlanBadge: {
    minHeight: hp(2.8),
    borderRadius: hp(1.4),
    paddingHorizontal: wp(2),
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(0.8),
    backgroundColor: `${colors.primary}0D`,
  },
  todayPlanBadgeText: {
    color: colors.primary,
    fontSize: Math.min(hp(1.05), wp(2.55)),
    fontWeight: '900',
  },
  todayPlanList: {
    gap: hp(0.75),
  },
  todayPlanItem: {
    minHeight: hp(7.2),
    borderRadius: hp(1.35),
    borderWidth: Math.min(wp(0.2), hp(0.12)),
    borderColor: colors.cardBorder || colors.border,
    backgroundColor: colors.cardBackground,
    paddingHorizontal: wp(2.3),
    paddingVertical: hp(0.75),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: wp(2),
  },
  todayPlanLeft: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2),
  },
  todayPlanIcon: {
    width: Math.min(hp(4), wp(8.8)),
    height: Math.min(hp(4), wp(8.8)),
    borderRadius: Math.min(hp(2), wp(4.4)),
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayPlanCopy: {
    flex: 1,
    minWidth: 0,
  },
  todayPlanTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(1.2),
  },
  todayPlanStep: {
    color: colors.primary,
    fontSize: Math.min(hp(1.03), wp(2.45)),
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  todayPlanItemTitle: {
    flex: 1,
    minWidth: 0,
    color: colors.textPrimary,
    fontSize: Math.min(hp(1.32), wp(3.15)),
    fontWeight: '900',
  },
  todayPlanBody: {
    color: colors.textSecondary,
    fontSize: Math.min(hp(1.1), wp(2.65)),
    lineHeight: hp(1.55),
    fontWeight: '700',
    marginTop: hp(0.2),
  },
  todayPlanRight: {
    width: wp(21),
    alignItems: 'flex-end',
    gap: hp(0.45),
  },
  todayPlanProgress: {
    width: '100%',
    color: colors.textTertiary || colors.textSecondary,
    fontSize: Math.min(hp(1), wp(2.4)),
    fontWeight: '900',
    textAlign: 'right',
  },
  todayPlanActionPill: {
    minHeight: hp(2.6),
    borderRadius: hp(1.3),
    paddingHorizontal: wp(2),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${colors.primary}12`,
  },
  todayPlanActionText: {
    color: colors.primary,
    fontSize: Math.min(hp(1.02), wp(2.45)),
    fontWeight: '900',
  },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: wp(2.5),
    marginTop: hp(2),
  },
  metricCell: {
    width: '48%',
    minHeight: hp(8),
    borderRadius: hp(1.4),
    borderWidth: Math.min(wp(0.28), hp(0.16)),
    borderColor: colors.cardBorder || colors.border,
    backgroundColor: colors.surface || colors.cardBackground,
    paddingHorizontal: wp(2.7),
    paddingVertical: hp(1),
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2),
  },
  metricIcon: {
    width: Math.min(hp(4.2), wp(9.2)),
    height: Math.min(hp(4.2), wp(9.2)),
    borderRadius: Math.min(hp(2.1), wp(4.6)),
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  metricLabel: {
    color: colors.textSecondary,
    fontSize: Math.min(hp(1.15), wp(2.75)),
    fontWeight: '800',
  },
  metricValue: {
    color: colors.textPrimary,
    fontSize: Math.min(hp(1.6), wp(3.75)),
    fontWeight: '900',
    marginTop: hp(0.2),
  },
  metricSubtitle: {
    color: colors.textTertiary || colors.textSecondary,
    fontSize: Math.min(hp(1.08), wp(2.55)),
    fontWeight: '700',
    marginTop: hp(0.15),
  },
  sourceRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: wp(1.5),
    marginTop: hp(1.45),
  },
  sourceChip: {
    minHeight: hp(3),
    borderRadius: hp(1.5),
    paddingHorizontal: wp(2.2),
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(0.9),
    backgroundColor: `${colors.primary}0D`,
    borderWidth: Math.min(wp(0.2), hp(0.1)),
    borderColor: `${colors.primary}20`,
  },
  sourceText: {
    color: colors.textSecondary,
    fontSize: Math.min(hp(1.08), wp(2.55)),
    fontWeight: '900',
  },
  disclaimerText: {
    color: colors.textTertiary || colors.textSecondary,
    fontSize: Math.min(hp(1.05), wp(2.5)),
    lineHeight: hp(1.55),
    fontWeight: '700',
    marginTop: hp(1),
  },
  scoreInfoBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: wp(5),
  },
  scoreInfoCard: {
    width: '100%',
    maxWidth: wp(92),
    borderRadius: hp(2),
    backgroundColor: colors.cardBackground,
    borderWidth: Math.min(wp(0.28), hp(0.16)),
    borderColor: colors.cardBorder || colors.border,
    padding: wp(4),
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: hp(0.8) },
    shadowOpacity: 0.18,
    shadowRadius: wp(4),
    elevation: 8,
  },
  scoreInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2.6),
    marginBottom: hp(1.6),
  },
  scoreInfoIcon: {
    width: Math.min(hp(4.8), wp(10.6)),
    height: Math.min(hp(4.8), wp(10.6)),
    borderRadius: Math.min(hp(2.4), wp(5.3)),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${colors.primary}14`,
  },
  scoreInfoTitleWrap: {
    flex: 1,
    minWidth: 0,
  },
  scoreInfoEyebrow: {
    color: colors.textSecondary,
    fontSize: Math.min(hp(1.12), wp(2.7)),
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  scoreInfoTitle: {
    color: colors.textPrimary,
    fontSize: Math.min(hp(2.15), wp(4.9)),
    fontWeight: '900',
    marginTop: hp(0.15),
  },
  scoreInfoClose: {
    width: Math.min(hp(4), wp(9)),
    height: Math.min(hp(4), wp(9)),
    borderRadius: Math.min(hp(2), wp(4.5)),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface || colors.background,
  },
  scoreInfoRows: {
    gap: hp(1),
  },
  scoreInfoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: wp(2.5),
    paddingVertical: hp(0.9),
    borderTopWidth: Math.min(wp(0.2), hp(0.12)),
    borderTopColor: colors.cardBorder || colors.border,
  },
  scoreInfoRowIcon: {
    width: Math.min(hp(3.8), wp(8.5)),
    height: Math.min(hp(3.8), wp(8.5)),
    borderRadius: Math.min(hp(1.9), wp(4.25)),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${colors.primary}10`,
  },
  scoreInfoRowTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  scoreInfoRowLabel: {
    color: colors.textPrimary,
    fontSize: Math.min(hp(1.42), wp(3.35)),
    fontWeight: '900',
  },
  scoreInfoRowText: {
    color: colors.textSecondary,
    fontSize: Math.min(hp(1.18), wp(2.8)),
    lineHeight: hp(1.75),
    fontWeight: '700',
    marginTop: hp(0.25),
  },
  scoreMetricSection: {
    marginTop: hp(1.1),
    paddingTop: hp(1.1),
    borderTopWidth: Math.min(wp(0.2), hp(0.12)),
    borderTopColor: colors.cardBorder || colors.border,
    gap: hp(0.8),
  },
  scoreMetricHeader: {
    color: colors.textPrimary,
    fontSize: Math.min(hp(1.28), wp(3.05)),
    fontWeight: '900',
  },
  scoreMetricRow: {
    borderRadius: hp(1.2),
    backgroundColor: `${colors.primary}08`,
    borderWidth: Math.min(wp(0.2), hp(0.12)),
    borderColor: colors.cardBorder || colors.border,
    paddingHorizontal: wp(2.4),
    paddingVertical: hp(0.85),
  },
  scoreMetricTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: wp(2),
  },
  scoreMetricTitleWrap: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(1.5),
  },
  scoreMetricLabel: {
    color: colors.textPrimary,
    fontSize: Math.min(hp(1.25), wp(3)),
    fontWeight: '900',
  },
  scoreMetricPill: {
    borderRadius: hp(1),
    backgroundColor: `${colors.primary}12`,
    paddingHorizontal: wp(2),
    paddingVertical: hp(0.35),
  },
  scoreMetricPillText: {
    color: colors.primary,
    fontSize: Math.min(hp(1.05), wp(2.55)),
    fontWeight: '900',
  },
  scoreMetricBody: {
    color: colors.textSecondary,
    fontSize: Math.min(hp(1.08), wp(2.65)),
    lineHeight: hp(1.62),
    fontWeight: '700',
    marginTop: hp(0.45),
  },
  scoreInfoNote: {
    color: colors.primary,
    backgroundColor: `${colors.primary}10`,
    borderRadius: hp(1.2),
    paddingHorizontal: wp(3),
    paddingVertical: hp(1.1),
    fontSize: Math.min(hp(1.22), wp(2.9)),
    lineHeight: hp(1.8),
    fontWeight: '800',
    marginTop: hp(1.3),
  },
  nutritionScoreCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: hp(2),
    borderWidth: Math.min(wp(0.28), hp(0.16)),
    borderColor: colors.cardBorder || colors.border,
    padding: wp(4),
  },
  nutritionScoreMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(3.4),
  },
  nutritionScoreCopy: {
    flex: 1,
    minWidth: 0,
  },
  nutritionScoreTitle: {
    color: colors.textPrimary,
    fontSize: Math.min(hp(2), wp(4.6)),
    fontWeight: '900',
    marginTop: hp(0.15),
  },
  nutritionScoreText: {
    color: colors.textSecondary,
    fontSize: Math.min(hp(1.28), wp(3.05)),
    lineHeight: hp(1.9),
    fontWeight: '700',
    marginTop: hp(0.45),
  },
  nutritionFactorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: wp(2),
    marginTop: hp(1.7),
  },
  nutritionFactor: {
    width: '31%',
    minHeight: hp(6.4),
    borderRadius: hp(1.3),
    backgroundColor: colors.surface || colors.cardBackground,
    borderWidth: Math.min(wp(0.24), hp(0.14)),
    borderColor: colors.cardBorder || colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: wp(1.2),
  },
  nutritionFactorValue: {
    color: colors.textPrimary,
    fontSize: Math.min(hp(1.55), wp(3.6)),
    fontWeight: '900',
  },
  nutritionFactorLabel: {
    color: colors.textSecondary,
    fontSize: Math.min(hp(1.02), wp(2.45)),
    fontWeight: '800',
    marginTop: hp(0.2),
    textAlign: 'center',
  },
  nutritionFocusButton: {
    minHeight: hp(4.2),
    borderRadius: hp(1.4),
    backgroundColor: `${colors.primary}10`,
    marginTop: hp(1.45),
    paddingHorizontal: wp(3),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  nutritionFocusText: {
    color: colors.primary,
    fontSize: Math.min(hp(1.3), wp(3.05)),
    fontWeight: '900',
  },
  habitMissionCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: hp(2),
    borderWidth: Math.min(wp(0.28), hp(0.16)),
    borderColor: colors.cardBorder || colors.border,
    padding: wp(4),
  },
  habitMissionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2.5),
  },
  habitMissionIcon: {
    width: Math.min(hp(5.2), wp(11.5)),
    height: Math.min(hp(5.2), wp(11.5)),
    borderRadius: Math.min(hp(2.6), wp(5.75)),
    alignItems: 'center',
    justifyContent: 'center',
  },
  habitMissionTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  habitMissionTitle: {
    color: colors.textPrimary,
    fontSize: Math.min(hp(1.85), wp(4.25)),
    fontWeight: '900',
    marginTop: hp(0.1),
  },
  habitStreakPill: {
    minHeight: hp(3),
    minWidth: wp(12),
    borderRadius: hp(1.5),
    paddingHorizontal: wp(2),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: wp(0.8),
    backgroundColor: colors.surface || `${colors.primary}08`,
  },
  habitStreakText: {
    color: colors.textPrimary,
    fontSize: Math.min(hp(1.2), wp(2.85)),
    fontWeight: '900',
  },
  habitMissionBody: {
    color: colors.textSecondary,
    fontSize: Math.min(hp(1.32), wp(3.1)),
    lineHeight: hp(2),
    fontWeight: '700',
    marginTop: hp(1.2),
  },
  streakStatusBox: {
    minHeight: hp(3.8),
    borderRadius: hp(1.3),
    backgroundColor: `${colors.primary}0D`,
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(1.3),
    paddingHorizontal: wp(2.6),
    marginTop: hp(1.1),
  },
  streakStatusText: {
    color: colors.textPrimary,
    fontSize: Math.min(hp(1.18), wp(2.8)),
    fontWeight: '900',
    flex: 1,
  },
  lessonBox: {
    borderRadius: hp(1.4),
    backgroundColor: colors.surface || colors.cardBackground,
    borderWidth: Math.min(wp(0.24), hp(0.14)),
    borderColor: colors.cardBorder || colors.border,
    paddingHorizontal: wp(3),
    paddingVertical: hp(1.1),
    marginTop: hp(1.2),
  },
  lessonTitle: {
    color: colors.textPrimary,
    fontSize: Math.min(hp(1.32), wp(3.1)),
    fontWeight: '900',
  },
  lessonBody: {
    color: colors.textSecondary,
    fontSize: Math.min(hp(1.12), wp(2.65)),
    lineHeight: hp(1.7),
    fontWeight: '700',
    marginTop: hp(0.3),
  },
  lessonStepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: wp(1.5),
    marginTop: hp(0.65),
  },
  lessonStepDot: {
    width: hp(0.65),
    height: hp(0.65),
    borderRadius: hp(0.325),
    backgroundColor: colors.primary,
    marginTop: hp(0.55),
  },
  lessonStepText: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: Math.min(hp(1.08), wp(2.55)),
    lineHeight: hp(1.6),
    fontWeight: '700',
  },
  personalPlanBox: {
    borderRadius: hp(1.4),
    backgroundColor: `${colors.primary}0A`,
    paddingHorizontal: wp(3),
    paddingVertical: hp(1.1),
    marginTop: hp(1.2),
  },
  personalPlanTitle: {
    color: colors.textPrimary,
    fontSize: Math.min(hp(1.25), wp(3)),
    fontWeight: '900',
    marginBottom: hp(0.55),
  },
  personalPlanRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(1.5),
    minHeight: hp(2.7),
  },
  personalPlanText: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: Math.min(hp(1.1), wp(2.65)),
    fontWeight: '800',
  },
  recoveryPlanBox: {
    borderRadius: hp(1.4),
    backgroundColor: '#F9731612',
    borderWidth: Math.min(wp(0.22), hp(0.12)),
    borderColor: '#F9731630',
    paddingHorizontal: wp(3),
    paddingVertical: hp(1),
    marginTop: hp(1.2),
  },
  recoveryPlanTitle: {
    color: '#F97316',
    fontSize: Math.min(hp(1.22), wp(2.9)),
    fontWeight: '900',
    marginBottom: hp(0.45),
  },
  recoveryPlanText: {
    color: colors.textSecondary,
    fontSize: Math.min(hp(1.06), wp(2.55)),
    lineHeight: hp(1.58),
    fontWeight: '800',
    marginTop: hp(0.25),
  },
  checkInRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: wp(1.7),
    marginTop: hp(1.25),
  },
  checkInChip: {
    minHeight: hp(3.7),
    borderRadius: hp(1.85),
    paddingHorizontal: wp(2.5),
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(1),
    backgroundColor: `${colors.primary}0F`,
  },
  checkInText: {
    color: colors.primary,
    fontSize: Math.min(hp(1.12), wp(2.65)),
    fontWeight: '900',
  },
  habitActionRow: {
    flexDirection: 'row',
    gap: wp(2.2),
    marginTop: hp(1.35),
  },
  habitPrimaryButton: {
    flex: 1,
    minHeight: hp(4.4),
    borderRadius: hp(1.4),
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: wp(3),
  },
  habitPrimaryText: {
    color: colors.textOnPrimary,
    fontSize: Math.min(hp(1.3), wp(3.05)),
    fontWeight: '900',
  },
  habitSecondaryButton: {
    minWidth: wp(27),
    minHeight: hp(4.4),
    borderRadius: hp(1.4),
    borderWidth: Math.min(wp(0.28), hp(0.16)),
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: wp(3),
  },
  habitSecondaryButtonDone: {
    borderColor: '#10B981',
    backgroundColor: '#10B98114',
  },
  habitSecondaryText: {
    color: colors.primary,
    fontSize: Math.min(hp(1.3), wp(3.05)),
    fontWeight: '900',
  },
  reminderPreferenceRow: {
    minHeight: hp(5),
    borderRadius: hp(1.4),
    backgroundColor: colors.surface || colors.cardBackground,
    borderWidth: Math.min(wp(0.24), hp(0.14)),
    borderColor: colors.cardBorder || colors.border,
    paddingHorizontal: wp(3),
    paddingVertical: hp(0.8),
    marginTop: hp(1.2),
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2),
  },
  reminderPreferenceTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  reminderPreferenceTitle: {
    color: colors.textPrimary,
    fontSize: Math.min(hp(1.2), wp(2.85)),
    fontWeight: '900',
  },
  reminderPreferenceBody: {
    color: colors.textSecondary,
    fontSize: Math.min(hp(1.05), wp(2.55)),
    fontWeight: '800',
    marginTop: hp(0.15),
  },
  reminderToggleButton: {
    minHeight: hp(3.5),
    borderRadius: hp(1.2),
    paddingHorizontal: wp(2.8),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${colors.primary}12`,
  },
  reminderToggleText: {
    color: colors.primary,
    fontSize: Math.min(hp(1.12), wp(2.7)),
    fontWeight: '900',
  },
  readinessCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: hp(2),
    borderWidth: Math.min(wp(0.28), hp(0.16)),
    borderColor: colors.cardBorder || colors.border,
    padding: wp(4),
  },
  readinessHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(3),
  },
  readinessIcon: {
    width: Math.min(hp(5.6), wp(12)),
    height: Math.min(hp(5.6), wp(12)),
    borderRadius: Math.min(hp(2.8), wp(6)),
    alignItems: 'center',
    justifyContent: 'center',
  },
  readinessTextWrap: {
    flex: 1,
  },
  readinessTitle: {
    color: colors.textPrimary,
    fontSize: Math.min(hp(2), wp(4.6)),
    fontWeight: '900',
    marginTop: hp(0.15),
  },
  readinessMessage: {
    color: colors.textSecondary,
    fontSize: Math.min(hp(1.32), wp(3.1)),
    fontWeight: '700',
    marginTop: hp(0.25),
  },
  readinessScore: {
    fontSize: Math.min(hp(3), wp(7)),
    fontWeight: '900',
  },
  factorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: wp(2),
    marginTop: hp(1.5),
  },
  factorPill: {
    minHeight: hp(3.6),
    borderRadius: hp(1.8),
    paddingHorizontal: wp(2.6),
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(1.2),
    backgroundColor: colors.surface || `${colors.primary}08`,
  },
  factorText: {
    color: colors.textSecondary,
    fontSize: Math.min(hp(1.2), wp(2.85)),
    fontWeight: '800',
  },
  reportCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: hp(2),
    borderWidth: Math.min(wp(0.28), hp(0.16)),
    borderColor: colors.cardBorder || colors.border,
    padding: wp(4),
  },
  reportSection: {
    paddingHorizontal: wp(4),
    marginTop: hp(1.2),
    marginBottom: hp(3.5),
  },
  reportEmbeddedSection: {
    marginTop: hp(0.2),
  },
  shareButton: {
    minHeight: hp(4),
    borderRadius: hp(1.3),
    borderWidth: Math.min(wp(0.28), hp(0.16)),
    borderColor: colors.cardBorder || colors.border,
    paddingHorizontal: wp(3),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: wp(1.2),
  },
  shareText: {
    color: colors.primary,
    fontSize: Math.min(hp(1.35), wp(3.2)),
    fontWeight: '900',
  },
  reportGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: wp(2.5),
    marginTop: hp(1.7),
  },
  reportItem: {
    width: '31%',
    minHeight: hp(8.6),
    borderRadius: hp(1.4),
    backgroundColor: colors.surface || colors.cardBackground,
    borderWidth: Math.min(wp(0.28), hp(0.16)),
    borderColor: colors.cardBorder || colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: wp(1.5),
    paddingVertical: hp(0.9),
  },
  reportValue: {
    color: colors.textPrimary,
    fontSize: Math.min(hp(1.55), wp(3.6)),
    fontWeight: '900',
    marginTop: hp(0.45),
  },
  reportLabel: {
    color: colors.textSecondary,
    fontSize: Math.min(hp(1.08), wp(2.55)),
    fontWeight: '800',
    marginTop: hp(0.2),
  },
  reportEmptyState: {
    width: '100%',
    minHeight: hp(12),
    borderRadius: hp(1.5),
    backgroundColor: colors.surface || colors.cardBackground,
    borderWidth: Math.min(wp(0.28), hp(0.16)),
    borderColor: colors.cardBorder || colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: wp(4),
    paddingVertical: hp(1.5),
  },
  reportEmptyTitle: {
    color: colors.textPrimary,
    fontSize: Math.min(hp(1.45), wp(3.4)),
    fontWeight: '900',
    marginTop: hp(0.7),
    textAlign: 'center',
  },
  reportEmptyText: {
    color: colors.textSecondary,
    fontSize: Math.min(hp(1.12), wp(2.65)),
    lineHeight: hp(1.7),
    fontWeight: '700',
    marginTop: hp(0.35),
    textAlign: 'center',
  },
  reportFocusBox: {
    marginTop: hp(1.7),
    borderRadius: hp(1.5),
    backgroundColor: colors.surface || colors.cardBackground,
    borderWidth: Math.min(wp(0.28), hp(0.16)),
    borderColor: colors.cardBorder || colors.border,
    paddingHorizontal: wp(3),
    paddingVertical: hp(1.2),
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2.3),
  },
  reportFocusBoxMuted: {
    opacity: 0.75,
  },
  reportFocusIcon: {
    width: Math.min(hp(4.4), wp(9.8)),
    height: Math.min(hp(4.4), wp(9.8)),
    borderRadius: Math.min(hp(2.2), wp(4.9)),
    alignItems: 'center',
    justifyContent: 'center',
  },
  reportFocusTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  reportFocusTitle: {
    color: colors.textPrimary,
    fontSize: Math.min(hp(1.35), wp(3.15)),
    fontWeight: '900',
  },
  reportFocusBody: {
    color: colors.textSecondary,
    fontSize: Math.min(hp(1.12), wp(2.65)),
    lineHeight: hp(1.7),
    fontWeight: '700',
    marginTop: hp(0.25),
  },
  reportActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2.4),
    marginTop: hp(1.3),
  },
  reportSecondaryButton: {
    flex: 1,
    minHeight: hp(4.5),
    borderRadius: hp(1.35),
    borderWidth: Math.min(wp(0.28), hp(0.16)),
    borderColor: colors.cardBorder || colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: wp(1.2),
    backgroundColor: colors.surface || colors.cardBackground,
  },
  reportSecondaryText: {
    color: colors.primary,
    fontSize: Math.min(hp(1.35), wp(3.15)),
    fontWeight: '900',
  },
  reportPrimaryButton: {
    flex: 1,
    minHeight: hp(4.5),
    borderRadius: hp(1.35),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: wp(1.2),
    backgroundColor: colors.primary,
  },
  reportPrimaryText: {
    color: colors.textOnPrimary,
    fontSize: Math.min(hp(1.35), wp(3.15)),
    fontWeight: '900',
  },
  sheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.cardBackground,
    borderTopLeftRadius: hp(2.4),
    borderTopRightRadius: hp(2.4),
    minHeight: hp(52),
    paddingHorizontal: wp(4),
    paddingTop: hp(1.2),
    paddingBottom: hp(4.2),
  },
  sheetHandle: {
    alignSelf: 'center',
    width: wp(12),
    height: hp(0.45),
    borderRadius: hp(0.3),
    backgroundColor: colors.cardBorder || colors.border,
    marginBottom: hp(1.5),
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: wp(3),
  },
  sheetTitle: {
    color: colors.textPrimary,
    fontSize: Math.min(hp(2.25), wp(5.1)),
    fontWeight: '900',
  },
  sheetSubtitle: {
    color: colors.textSecondary,
    fontSize: Math.min(hp(1.3), wp(3.1)),
    fontWeight: '700',
    marginTop: hp(0.2),
  },
  sheetCloseButton: {
    width: Math.min(hp(4.2), wp(9.4)),
    height: Math.min(hp(4.2), wp(9.4)),
    borderRadius: Math.min(hp(2.1), wp(4.7)),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface || colors.background,
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: wp(2.5),
    marginTop: hp(2),
    paddingBottom: hp(2.5),
  },
  quickAction: {
    width: '31%',
    minHeight: hp(10.4),
    borderRadius: hp(1.6),
    borderWidth: Math.min(wp(0.28), hp(0.16)),
    borderColor: colors.cardBorder || colors.border,
    backgroundColor: colors.surface || colors.cardBackground,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: wp(1.2),
    paddingVertical: hp(1),
  },
  quickActionIcon: {
    width: Math.min(hp(4.7), wp(10.5)),
    height: Math.min(hp(4.7), wp(10.5)),
    borderRadius: Math.min(hp(2.35), wp(5.25)),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: hp(0.7),
  },
  quickActionLabel: {
    color: colors.textPrimary,
    fontSize: Math.min(hp(1.35), wp(3.2)),
    fontWeight: '900',
  },
  quickActionSubtitle: {
    color: colors.textSecondary,
    fontSize: Math.min(hp(1.05), wp(2.55)),
    fontWeight: '700',
    marginTop: hp(0.15),
  },
  moodPanel: {
    marginTop: hp(1.8),
    paddingTop: hp(1.5),
    borderTopWidth: Math.min(wp(0.28), hp(0.16)),
    borderTopColor: colors.cardBorder || colors.border,
  },
  moodTitle: {
    color: colors.textPrimary,
    fontSize: Math.min(hp(1.6), wp(3.75)),
    fontWeight: '900',
    marginBottom: hp(1),
  },
  moodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: wp(2),
  },
  moodChip: {
    minHeight: hp(4.2),
    borderRadius: hp(2.1),
    borderWidth: Math.min(wp(0.28), hp(0.16)),
    paddingHorizontal: wp(3),
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(1.3),
  },
  moodText: {
    color: colors.textPrimary,
    fontSize: Math.min(hp(1.25), wp(3)),
    fontWeight: '900',
  },
});

export default DashboardCommandCenter;
