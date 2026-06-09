import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Image,
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
  getDashboardScoreBreakdown,
  getHydrationValue,
  getProgressValue,
  getSingleMetricProgress,
} from '@/utils/dashboardProgress';
import { getExerciseCaloriesBurned } from '@/utils/localExerciseProgress';
import {
  DEFAULT_STEP_GOAL,
} from '@/utils/localWalkingProgress';
import {
  formatCalorieTarget,
  formatHydrationTarget,
  getCalorieTargetProgress,
  getHydrationTargetProgress,
  isRangesGoalDisplayMode,
  type GoalDisplayMode,
} from '@/utils/goalTargetDisplay';
import {
  buildGoalSpineSummary,
  type GoalSpineAction,
  type GoalSpineKey,
} from '@/utils/goalSpine';
import {
  buildWeeklyNutritionReport,
  type WeeklyNutritionReport,
} from '@/utils/nutritionInsights';
import type {
  HabitPreferences,
  HabitMission,
} from '@/utils/habitMissions';
import {
  buildNutritionProfile,
  buildNutritionTimingNudge,
  type NutritionGoalSummary,
  type NutritionTimingNudge,
} from '@/utils/nutritionProfile';
import { useRouter } from 'expo-router';

type IconName = keyof typeof Ionicons.glyphMap;

export type QuickAddAction =
  | 'water'
  | 'meal'
  | 'mealPlanner'
  | 'mindfulness'
  | 'steps'
  | 'workout'
  | 'appointment'
  | 'note'
  | 'chat'
  | 'settings';

export type DashboardMoodValue = 'strong' | 'good' | 'tired' | 'sore' | 'stressed';

export type DashboardDay = {
  _id?: string;
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
  calorieGoalDirection?: 'missed' | 'exceeded' | 'onTarget' | 'unknown';
  nutritionGapSeverity?: 'none' | 'low' | 'medium' | 'high' | 'critical';
  hydrationRiskScore?: number;
  recoveryNeedScore?: number;
  goalRiskScore?: number;
  nudgePriority?: 'silent' | 'low' | 'medium' | 'high';
  nudgeReason?: string;
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
  showStepPermissionPrompt?: boolean;
  stepCounterReady?: boolean;
  onOpenStepPermissions?: () => void;
  afterCommandCenter?: React.ReactNode;
  showReadiness?: boolean;
  showWeeklyReport?: boolean;
  showNutritionScore?: boolean;
  showHabitMission?: boolean;
  goalDisplayMode?: GoalDisplayMode;
  onGoalDisplayModeChange?: (mode: GoalDisplayMode) => void;
  fitnessGoal?: GoalSpineKey | unknown;
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
  actions?: QuickAddAction[];
  showMoodAction?: boolean;
  onClose: () => void;
  onSelectMood: (mood: DashboardMoodValue) => void;
  onAction: (action: QuickAddAction) => void;
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
  premiumOnly?: boolean;
}[] = [
  { id: 'water', label: 'Water', subtitle: 'Hydration', icon: 'water-outline', color: WATER_COLOR },
  { id: 'meal', label: 'Meal', subtitle: 'Calories', icon: 'fast-food-outline', color: CALORIE_COLOR },
  { id: 'mealPlanner', label: 'Meal Plan', subtitle: 'Planner', icon: 'basket-outline', color: '#0EA5E9' },
  { id: 'mindfulness', label: 'Mindful', subtitle: 'Breathing', icon: 'leaf-outline', color: '#22C55E' },
  { id: 'steps', label: 'Steps', subtitle: 'Counter', icon: 'footsteps-outline', color: '#14B8A6' },
  { id: 'workout', label: 'Workout', subtitle: 'Exercise', icon: 'barbell-outline', color: WORKOUT_COLOR, premiumOnly: true },
  { id: 'appointment', label: 'Appointment', subtitle: 'Doctor', icon: 'calendar-outline', color: APPOINTMENT_COLOR },
  { id: 'chat', label: 'Chat', subtitle: 'Messages', icon: 'chatbubbles-outline', color: CHAT_COLOR },
  { id: 'note', label: 'Notes', subtitle: 'Personal', icon: 'document-text-outline', color: '#64748B' },
  { id: 'settings', label: 'Settings', subtitle: 'Preferences', icon: 'settings-outline', color: '#8B5CF6' },
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

const getDaySteps = (day?: DashboardDay | null) =>
  Math.round(getProgressValue(day?.walkingSteps ?? day?.steps ?? day?.stepCount));

const getDayStepGoal = (day?: DashboardDay | null) => {
  const stepGoal = getProgressValue(
    day?.walkingStepGoal ?? day?.stepGoal ?? day?.targetSteps ?? day?.dailyStepGoal
  );
  return stepGoal > 0 ? Math.round(stepGoal) : DEFAULT_STEP_GOAL;
};

const formatStepCount = (value: number) => value.toLocaleString();

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

const buildNutritionGoalSummaryFromDay = (
  day?: DashboardDay | null
): NutritionGoalSummary | null => {
  if (!day || Number(day.targetCalories || 0) <= 0) return null;

  return {
    dayLogId: day._id,
    dayNo: day.dayNo,
    date: day.date,
    achievedCalories: day.achievedCalories,
    targetCalories: day.targetCalories,
    targetCaloriesMin: day.targetCaloriesMin,
    targetCaloriesMax: day.targetCaloriesMax,
    achievedHydration: day.achieviedHydration ?? day.achievedHydration,
    targetHydration: day.targetHydration,
    calorieGoalDirection: day.calorieGoalDirection,
    nutritionGapSeverity: day.nutritionGapSeverity,
    hydrationRiskScore: day.hydrationRiskScore,
    recoveryNeedScore: day.recoveryNeedScore,
    goalRiskScore: day.goalRiskScore,
    nudgePriority: day.nudgePriority,
    nudgeReason: day.nudgeReason,
  };
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
  if (action === 'note') return 'Add note';
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
    return `This week is averaging ${report.weeklyScore}. ${bestDay}`;
  }

  return `This week is averaging ${report.weeklyScore}. ${bestDay} Next focus: ${report.nextWeekFocus.title.toLowerCase()}. ${appointmentCopy}`;
};

export function NutritionScoreCard({
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
  ];

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
        {nutritionFactors.map((item) => {
          const isLockedPremiumFactor = Boolean(item.premiumOnly && !isPremium);

          return (
            <View
              key={item.label}
              style={[
                styles.nutritionFactor,
                isLockedPremiumFactor && styles.nutritionFactorLocked,
              ]}
            >
              {isLockedPremiumFactor ? (
                <Ionicons name="lock-closed-outline" size={Math.min(hp(1.45), wp(3.3))} color={colors.primary} />
              ) : null}
              <Text style={styles.nutritionFactorValue} numberOfLines={1} adjustsFontSizeToFit>
                {isLockedPremiumFactor ? 'Premium' : item.value}
              </Text>
              <Text style={styles.nutritionFactorLabel} numberOfLines={1}>
                {isLockedPremiumFactor ? item.label : item.label === 'Protein' ? proteinLabel : item.label}
              </Text>
            </View>
          );
        })}
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

function NutritionTimingNudgeCard({
  nudge,
  colors,
  onAction,
}: {
  nudge: NutritionTimingNudge;
  colors: any;
  onAction: (action: QuickAddAction) => void;
}) {
  const styles = useMemo(() => getStyles(colors), [colors]);
  const color =
    nudge.kind === 'overTargetRisk'
      ? '#F97316'
      : nudge.kind === 'underTargetSupport'
        ? '#16A34A'
        : WATER_COLOR;
  const icon: IconName =
    nudge.kind === 'overTargetRisk'
      ? 'walk-outline'
      : nudge.kind === 'underTargetSupport'
        ? 'restaurant-outline'
        : 'water-outline';

  return (
    <View style={styles.timingNudgeCard}>
      {nudge.showFoodImage ? (
        <Image
          source={require('../../assets/images/salad.jpg')}
          style={styles.timingNudgeImage}
        />
      ) : (
        <View style={[styles.timingNudgeIcon, { backgroundColor: `${color}18` }]}>
          <Ionicons name={icon} size={Math.min(hp(3.2), wp(7))} color={color} />
        </View>
      )}
      <View style={styles.timingNudgeCopy}>
        <Text style={[styles.timingNudgeMeta, { color }]}>{nudge.meta}</Text>
        <Text style={styles.timingNudgeTitle}>{nudge.title}</Text>
        <Text style={styles.timingNudgeBody}>{nudge.body}</Text>
      </View>
      <AnimatedPressable
        style={[styles.timingNudgeButton, { backgroundColor: `${color}14` }]}
        onPress={() => onAction(nudge.action)}
      >
        <Text style={[styles.timingNudgeButtonText, { color }]}>{nudge.actionLabel}</Text>
        <Ionicons name="arrow-forward" size={Math.min(hp(1.8), wp(4))} color={color} />
      </AnimatedPressable>
    </View>
  );
}

export function HabitMissionCard({
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
  isPremium,
  colors,
  selectedMood,
  onQuickAddAction,
  showStepPermissionPrompt = false,
  stepCounterReady,
  onOpenStepPermissions,
  afterCommandCenter,
  showReadiness = false,
  showWeeklyReport = true,
  showNutritionScore = true,
  showHabitMission = false,
  goalDisplayMode = "exact",
  fitnessGoal,
  nutritionReport: providedNutritionReport,
  habitMission,
  habitStreakCount = 0,
  habitPreferences,
  onCompleteHabitMission,
  onToggleHabitReminders,
}: DashboardCommandCenterProps) {
  const router = useRouter();
  const styles = useMemo(() => getStyles(colors), [colors]);
  const today = useMemo(() => getTodayDay(days), [days]);
  const [nutritionTimingNudge, setNutritionTimingNudge] =
    useState<NutritionTimingNudge | null>(null);
  const nutritionReport = useMemo(
    () => providedNutritionReport || buildWeeklyNutritionReport(days),
    [days, providedNutritionReport]
  );
  const openStepPermissions = onOpenStepPermissions || (() => onQuickAddAction('steps'));
  const canCoachSteps = stepCounterReady ?? !showStepPermissionPrompt;
  const goalPlan = isPremium ? "premium" : "free";
  const rangesEnabled = isRangesGoalDisplayMode(goalDisplayMode);
  const calorieTargetProgress = today ? getCalorieTargetProgress(today, goalDisplayMode, goalPlan) : null;
  const hydrationTargetProgress = today ? getHydrationTargetProgress(today, goalDisplayMode, goalPlan) : null;

  useEffect(() => {
    let active = true;
    const summary = buildNutritionGoalSummaryFromDay(today);

    if (!summary) {
      setNutritionTimingNudge(null);
      return () => {
        active = false;
      };
    }

    buildNutritionProfile()
      .then((profile) => {
        if (!active) return;
        setNutritionTimingNudge(buildNutritionTimingNudge(summary, profile));
      })
      .catch((error) => {
        console.log('[DashboardCommandCenter] Nutrition timing nudge unavailable:', error);
        if (active) setNutritionTimingNudge(null);
      });

    return () => {
      active = false;
    };
  }, [
    today,
    today?._id,
    today?.dayNo,
    today?.date,
    today?.achievedCalories,
    today?.targetCalories,
    today?.targetCaloriesMin,
    today?.targetCaloriesMax,
    today?.achieviedHydration,
    today?.achievedHydration,
    today?.targetHydration,
    today?.calorieGoalDirection,
    today?.hydrationRiskScore,
    today?.nudgePriority,
    today?.nudgeReason,
  ]);

  const calorieProgress = calorieTargetProgress?.percent ?? 0;
  const hydrationProgress = hydrationTargetProgress?.percent ?? 0;
  const workoutTarget = isPremium && today ? getBurnedCaloriesTarget(today) : 0;
  const workoutCalories = isPremium && today ? getExerciseCaloriesBurned(today) : 0;
  const workoutProgress = isPremium && workoutTarget > 0 ? getSingleMetricProgress(workoutCalories, workoutTarget) : 0;
  const rawSteps = today ? getDaySteps(today) : 0;
  const stepsTarget = getDayStepGoal(today);
  const displayedSteps = rawSteps;
  const stepsProgress = getSingleMetricProgress(displayedSteps, stepsTarget);
  const calorieTargetLabel = today
    ? formatCalorieTarget(today, goalDisplayMode, goalPlan)
    : "0";
  const hydrationTargetLabel = today
    ? formatHydrationTarget(today, goalDisplayMode, goalPlan)
    : "0";
  const calorieMetricSubtitle = rangesEnabled && calorieTargetProgress
    ? `${calorieTargetProgress.statusLabel} | ${calorieTargetLabel} cal`
    : `${calorieProgress}% food | ${calorieTargetLabel} goal`;
  const hydrationMetricSubtitle = rangesEnabled && hydrationTargetProgress
    ? `${hydrationTargetProgress.statusLabel} | ${hydrationTargetLabel}L`
    : `${hydrationProgress}% | ${hydrationTargetLabel}L goal`;
  const goalSpine = useMemo(
    () =>
      buildGoalSpineSummary({
        goal: fitnessGoal,
        days,
        today,
        goalDisplayMode,
        plan: goalPlan,
        nutritionReport,
    }),
    [days, fitnessGoal, goalDisplayMode, goalPlan, nutritionReport, today]
  );

  const openGoalReview = () => {
    router.push('/(main)/(goal-review)' as any);
  };

  const handleGoalSpineAction = (action: GoalSpineAction) => {
    if (action === 'goalReview') {
      openGoalReview();
      return;
    }

    onQuickAddAction(action as QuickAddAction);
  };

  const goalKey = goalSpine.goal.key;
  const todayNutritionScore = nutritionReport.todayScore;
  const mealCount = Math.max(
    Array.isArray(today?.meals) ? today?.meals.length || 0 : 0,
    Number(todayNutritionScore?.mealCount || 0),
    getProgressValue(today?.achievedCalories) > 0 ? 1 : 0
  );
  const proteinGrams = Number(todayNutritionScore?.proteinGrams || 0);
  const proteinTargetGrams = Number(todayNutritionScore?.proteinTargetGrams || 0);
  const proteinValue = proteinGrams > 0
    ? `${proteinGrams}/${proteinTargetGrams || '--'}g`
    : 'Log protein';
  const workoutValue = isPremium
    ? workoutTarget > 0
      ? `${workoutCalories}/${workoutTarget}`
      : workoutCalories > 0
        ? `${workoutCalories} kcal`
        : 'Open plan'
    : 'Premium';
  const stepSubtitle = showStepPermissionPrompt
    ? 'Enable Step Counter'
    : canCoachSteps
      ? `${stepsProgress}% of daily goal`
      : 'Step signal unavailable';
  const calorieMetric = {
    id: 'calories',
    icon: 'flame-outline' as IconName,
    label: 'Calories',
    value: `${Math.round(getProgressValue(today?.achievedCalories))} cal`,
    color: CALORIE_COLOR,
    subtitle: calorieMetricSubtitle,
    onPress: () => onQuickAddAction('meal'),
  };
  const hydrationMetric = {
    id: 'water',
    icon: 'water-outline' as IconName,
    label: 'Water',
    value: `${getHydrationValue(today || {}).toFixed(1)}L`,
    color: WATER_COLOR,
    subtitle: hydrationMetricSubtitle,
    onPress: () => onQuickAddAction('water'),
  };
  const stepMetric = {
    id: 'steps',
    icon: 'footsteps-outline' as IconName,
    label: 'Steps',
    value: `${formatStepCount(displayedSteps)}/${formatStepCount(stepsTarget)}`,
    color: STEP_COLOR,
    subtitle: stepSubtitle,
    onPress: showStepPermissionPrompt ? openStepPermissions : () => onQuickAddAction('steps'),
  };
  const workoutMetric = {
    id: 'workout',
    icon: 'barbell-outline' as IconName,
    label: 'Workout',
    value: workoutValue,
    color: WORKOUT_COLOR,
    subtitle: isPremium ? `${workoutProgress}% workout signal` : 'Guided workout plan',
    onPress: () => onQuickAddAction('workout'),
  };
  const proteinMetric = {
    id: 'protein',
    icon: 'nutrition-outline' as IconName,
    label: 'Protein',
    value: proteinValue,
    color: '#16A34A',
    subtitle: proteinGrams > 0 ? 'Fuel for muscle gain' : 'Add protein with a meal',
    onPress: () => onQuickAddAction('meal'),
  };
  const mealMetric = {
    id: 'meals',
    icon: 'restaurant-outline' as IconName,
    label: 'Meals',
    value: `${mealCount} logged`,
    color: '#0EA5E9',
    subtitle: `${goalSpine.stats.mealConsistencyDays}/5 steady days`,
    onPress: () => onQuickAddAction('meal'),
  };
  const coreMetrics =
    goalKey === 'muscle_gain'
      ? [proteinMetric, workoutMetric, calorieMetric]
      : goalKey === 'weight_gain'
        ? [calorieMetric, mealMetric, workoutMetric]
        : [calorieMetric, hydrationMetric, stepMetric];

  const renderMetric = (
    metric: {
      id: string;
      icon: IconName;
      label: string;
      value: string;
      color: string;
      subtitle?: string;
      onPress?: () => void;
    }
  ) => {
    const content = (
      <>
        <View style={[styles.metricIcon, { backgroundColor: `${metric.color}18` }]}>
          <Ionicons name={metric.icon} size={Math.min(hp(2.2), wp(4.9))} color={metric.color} />
        </View>
        <View style={styles.metricTextWrap}>
          <Text style={styles.metricLabel} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.72}>{metric.label}</Text>
          <Text style={styles.metricValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.65}>{metric.value}</Text>
          {metric.subtitle ? <Text style={styles.metricSubtitle}>{metric.subtitle}</Text> : null}
        </View>
      </>
    );

    return metric.onPress ? (
      <AnimatedPressable key={metric.id} style={styles.metricCell} onPress={metric.onPress}>
        {content}
      </AnimatedPressable>
    ) : (
      <View key={metric.id} style={styles.metricCell}>
        {content}
      </View>
    );
  };

  return (
    <View style={styles.wrapper}>
      <View style={styles.commandCard}>
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.eyebrow}>Today</Text>
            <Text style={styles.title}>Command Center</Text>
          </View>
        </View>

        <View style={styles.goalHeaderCard}>
          <View style={styles.goalHeaderTop}>
            <View style={[styles.goalHeaderIcon, { backgroundColor: `${goalSpine.goal.color}18` }]}>
              <Ionicons name={goalSpine.goal.icon as IconName} size={Math.min(hp(2.55), wp(5.7))} color={goalSpine.goal.color} />
            </View>
            <View style={styles.goalHeaderCopy}>
              <Text style={styles.goalHeaderEyebrow}>Goal Summary</Text>
              <Text style={styles.goalHeaderTitle} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.72}>
                {goalSpine.goal.label}
              </Text>
              <Text style={styles.goalHeaderBody}>
                {goalSpine.dashboardMessage}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.goalNextActionCard}>
          <View style={[styles.goalNextIcon, { backgroundColor: `${goalSpine.nextAction.color}18` }]}>
            <Ionicons name={goalSpine.nextAction.icon as IconName} size={Math.min(hp(2.15), wp(4.85))} color={goalSpine.nextAction.color} />
          </View>
          <View style={styles.goalNextCopy}>
            <Text style={styles.goalNextEyebrow}>Next action</Text>
            <Text style={styles.goalNextTitle} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.76}>
              {goalSpine.nextAction.title}
            </Text>
            <Text style={styles.goalNextBody}>
              {goalSpine.nextAction.body}
            </Text>
          </View>
          <AnimatedPressable
            style={styles.goalNextButton}
            onPress={() => handleGoalSpineAction(goalSpine.nextAction.action)}
            accessibilityRole="button"
            accessibilityLabel={goalSpine.nextAction.actionLabel}
          >
            <Text style={styles.goalNextButtonText}>{goalSpine.nextAction.actionLabel}</Text>
          </AnimatedPressable>
        </View>

        <View style={styles.coreMetricsCard}>
          <View style={styles.commandSectionHeader}>
            <Text style={styles.commandSectionEyebrow}>Today's Core Metrics</Text>
            <Text style={styles.commandSectionTitle}>{goalSpine.goal.shortLabel} signals</Text>
          </View>
          <View style={styles.metricGrid}>
            {coreMetrics.map(renderMetric)}
          </View>
        </View>
      </View>

      {showNutritionScore ? (
        <NutritionScoreCard
          report={nutritionReport}
          colors={colors}
          isPremium={isPremium}
          onAction={onQuickAddAction}
        />
      ) : null}

      {nutritionTimingNudge ? (
        <NutritionTimingNudgeCard
          nudge={nutritionTimingNudge}
          colors={colors}
          onAction={onQuickAddAction}
        />
      ) : null}

      {showHabitMission && habitMission ? (
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
  eyebrow = 'Nutrition',
  title = 'Weekly Diet Report',
  onOpenAnalytics,
  onOpenCharts,
}: {
  days: DashboardDay[];
  appointments: any[];
  isPremium: boolean;
  colors: any;
  nutritionReport?: WeeklyNutritionReport | null;
  embedded?: boolean;
  eyebrow?: string;
  title?: string;
  onOpenAnalytics?: () => void;
  onOpenCharts?: () => void;
}) {
  const styles = useMemo(() => getStyles(colors), [colors]);
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
  const reportItems = buildNutritionReportItems(nutritionReport);
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
            <Text style={styles.eyebrow}>{eyebrow}</Text>
            <Text style={styles.title}>{title}</Text>
          </View>
          <View style={styles.reportHeaderActions}>
            <AnimatedPressable style={styles.shareButton} onPress={shareWeeklyReport}>
              <Ionicons
                name={isPremium ? "share-social-outline" : "lock-closed-outline"}
                size={Math.min(hp(2.1), wp(4.8))}
                color={colors.primary}
              />
              <Text style={styles.shareText}>{isPremium ? 'Share' : 'Premium'}</Text>
            </AnimatedPressable>
          </View>
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
        <View style={[styles.reportFocusBox, !hasReportData && styles.reportFocusBoxMuted]}>
          <View style={[styles.reportFocusIcon, { backgroundColor: `${colors.primary}16` }]}>
            <Ionicons
              name="compass-outline"
              size={Math.min(hp(2.4), wp(5.4))}
              color={colors.primary}
            />
          </View>
          <View style={styles.reportFocusTextWrap}>
            <Text style={styles.reportFocusTitle}>Next week focus</Text>
            <Text style={styles.reportFocusBody}>
              {`${weeklyReportCopy} ${nutritionReport.nextWeekFocus.body}`}
            </Text>
          </View>
        </View>
        {onOpenAnalytics || onOpenCharts ? (
          <View style={styles.analyticsActionRow}>
            {onOpenAnalytics ? (
              <AnimatedPressable
                style={styles.analyticsActionButton}
                onPress={onOpenAnalytics}
                accessibilityRole="button"
                accessibilityLabel="Open dashboard analytics"
              >
                <Ionicons
                  name="analytics-outline"
                  size={Math.min(hp(2), wp(4.5))}
                  color={colors.primary}
                />
                <Text style={styles.analyticsActionText} numberOfLines={1}>Analytics</Text>
              </AnimatedPressable>
            ) : null}
            {onOpenCharts ? (
              <AnimatedPressable
                style={styles.analyticsActionButton}
                onPress={onOpenCharts}
                accessibilityRole="button"
                accessibilityLabel="Open dashboard charts"
              >
                <Ionicons
                  name="bar-chart-outline"
                  size={Math.min(hp(2), wp(4.5))}
                  color={colors.primary}
                />
                <Text style={styles.analyticsActionText} numberOfLines={1}>View Charts</Text>
              </AnimatedPressable>
            ) : null}
          </View>
        ) : null}
      </View>
    </View>
  );
}

export function QuickAddBottomSheet({
  visible,
  colors,
  selectedMood,
  isPremium = false,
  actions,
  showMoodAction = true,
  onClose,
  onSelectMood,
  onAction,
}: QuickAddBottomSheetProps) {
  const styles = useMemo(() => getStyles(colors), [colors]);
  const [showMoodPicker, setShowMoodPicker] = useState(false);
  const visibleQuickActions = useMemo(() => {
    if (!actions?.length) return quickActions;

    return actions
      .map((actionId) => quickActions.find((action) => action.id === actionId))
      .filter((action): action is (typeof quickActions)[number] => Boolean(action));
  }, [actions]);

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

    onClose();
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
            {visibleQuickActions.map((action) => {
              const isLockedPremiumAction = Boolean(action.premiumOnly && !isPremium);

              return (
                <AnimatedPressable
                  key={action.id}
                  style={[
                    styles.quickAction,
                    isLockedPremiumAction && styles.quickActionLocked,
                  ]}
                  onPress={() => handleAction(action.id)}
                >
                  <View style={[styles.quickActionIcon, { backgroundColor: `${action.color}18` }]}>
                    <Ionicons name={action.icon} size={Math.min(hp(2.8), wp(6))} color={action.color} />
                  </View>
                  <Text style={styles.quickActionLabel} numberOfLines={1}>{action.label}</Text>
                  <Text style={styles.quickActionSubtitle} numberOfLines={1}>{action.subtitle}</Text>
                </AnimatedPressable>
              );
            })}

            {showMoodAction ? (
              <AnimatedPressable style={styles.quickAction} onPress={() => handleAction('mood')}>
                <View style={[styles.quickActionIcon, { backgroundColor: `${colors.warning || '#F59E0B'}18` }]}>
                  <Ionicons name="happy-outline" size={Math.min(hp(2.8), wp(6))} color={colors.warning || '#F59E0B'} />
                </View>
                <Text style={styles.quickActionLabel} numberOfLines={1}>Mood</Text>
                <Text style={styles.quickActionSubtitle} numberOfLines={1}>
                  {selectedMood ? moodOptions.find((mood) => mood.id === selectedMood)?.label : 'Readiness'}
                </Text>
              </AnimatedPressable>
            ) : null}
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
  goalHeaderCard: {
    marginTop: hp(1.35),
    borderRadius: hp(1.45),
    borderWidth: Math.min(wp(0.24), hp(0.14)),
    borderColor: `${colors.primary}28`,
    backgroundColor: `${colors.primary}07`,
    paddingHorizontal: wp(3),
    paddingVertical: hp(1.15),
    gap: hp(1),
  },
  goalHeaderTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2.2),
  },
  goalHeaderIcon: {
    width: Math.min(hp(4.8), wp(10.5)),
    height: Math.min(hp(4.8), wp(10.5)),
    borderRadius: Math.min(hp(2.4), wp(5.25)),
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  goalHeaderCopy: {
    flex: 1,
    minWidth: 0,
  },
  goalHeaderEyebrow: {
    color: colors.primary,
    fontSize: Math.min(hp(1.02), wp(2.45)),
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  goalHeaderTitle: {
    color: colors.textPrimary,
    fontSize: Math.min(hp(1.8), wp(4.15)),
    fontWeight: '900',
    marginTop: hp(0.1),
  },
  goalHeaderBody: {
    color: colors.textSecondary,
    fontSize: Math.min(hp(1.08), wp(2.6)),
    lineHeight: hp(1.55),
    fontWeight: '700',
    marginTop: hp(0.25),
  },
  goalNextActionCard: {
    marginTop: hp(1.35),
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: wp(2),
    borderRadius: hp(1.45),
    borderWidth: Math.min(wp(0.24), hp(0.14)),
    borderColor: `${colors.primary}25`,
    backgroundColor: colors.surface || colors.cardBackground,
    paddingHorizontal: wp(3),
    paddingVertical: hp(1.05),
  },
  goalNextIcon: {
    width: Math.min(hp(4.1), wp(9)),
    height: Math.min(hp(4.1), wp(9)),
    borderRadius: Math.min(hp(2.05), wp(4.5)),
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  goalNextCopy: {
    flex: 1,
    minWidth: 0,
  },
  goalNextTitle: {
    color: colors.textPrimary,
    fontSize: Math.min(hp(1.35), wp(3.2)),
    fontWeight: '900',
  },
  goalNextEyebrow: {
    color: colors.primary,
    fontSize: Math.min(hp(0.96), wp(2.3)),
    fontWeight: '900',
    textTransform: 'uppercase',
    marginBottom: hp(0.12),
  },
  goalNextBody: {
    color: colors.textSecondary,
    fontSize: Math.min(hp(1.05), wp(2.5)),
    lineHeight: hp(1.5),
    fontWeight: '700',
    marginTop: hp(0.18),
  },
  goalNextButton: {
    minHeight: hp(3.3),
    borderRadius: hp(1.15),
    paddingHorizontal: wp(2.4),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    flexShrink: 0,
  },
  goalNextButtonText: {
    color: colors.textOnPrimary,
    fontSize: Math.min(hp(1.05), wp(2.55)),
    fontWeight: '900',
  },
  commandSectionHeader: {
    gap: hp(0.12),
  },
  commandSectionEyebrow: {
    color: colors.textSecondary,
    fontSize: Math.min(hp(1), wp(2.4)),
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  commandSectionTitle: {
    color: colors.textPrimary,
    fontSize: Math.min(hp(1.45), wp(3.45)),
    fontWeight: '900',
  },
  coreMetricsCard: {
    marginTop: hp(1.35),
    borderRadius: hp(1.45),
    borderWidth: Math.min(wp(0.24), hp(0.14)),
    borderColor: colors.cardBorder || colors.border,
    backgroundColor: colors.cardBackground,
    paddingHorizontal: wp(3),
    paddingVertical: hp(1.1),
  },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: wp(2.5),
    marginTop: hp(1),
  },
  metricCell: {
    width: '48%',
    minHeight: hp(8.8),
    borderRadius: hp(1.4),
    borderWidth: Math.min(wp(0.28), hp(0.16)),
    borderColor: colors.cardBorder || colors.border,
    backgroundColor: colors.surface || colors.cardBackground,
    paddingHorizontal: wp(2.7),
    paddingVertical: hp(1),
    flexDirection: 'row',
    alignItems: 'flex-start',
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
    lineHeight: hp(1.48),
    fontWeight: '700',
    marginTop: hp(0.15),
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
  nutritionFactorLocked: {
    borderColor: `${colors.primary}45`,
    backgroundColor: `${colors.primary}08`,
    gap: hp(0.2),
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
  timingNudgeCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: hp(2),
    borderWidth: Math.min(wp(0.28), hp(0.16)),
    borderColor: colors.cardBorder || colors.border,
    padding: wp(3.5),
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(3),
  },
  timingNudgeImage: {
    width: Math.min(hp(7.2), wp(16)),
    height: Math.min(hp(7.2), wp(16)),
    borderRadius: hp(1.2),
    backgroundColor: colors.surface || colors.screenColor,
  },
  timingNudgeIcon: {
    width: Math.min(hp(6.2), wp(13.5)),
    height: Math.min(hp(6.2), wp(13.5)),
    borderRadius: Math.min(hp(3.1), wp(6.75)),
    alignItems: 'center',
    justifyContent: 'center',
  },
  timingNudgeCopy: {
    flex: 1,
    minWidth: 0,
  },
  timingNudgeMeta: {
    fontSize: Math.min(hp(1.02), wp(2.45)),
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  timingNudgeTitle: {
    color: colors.textPrimary,
    fontSize: Math.min(hp(1.72), wp(4)),
    fontWeight: '900',
    marginTop: hp(0.15),
  },
  timingNudgeBody: {
    color: colors.textSecondary,
    fontSize: Math.min(hp(1.18), wp(2.85)),
    lineHeight: hp(1.72),
    fontWeight: '700',
    marginTop: hp(0.35),
  },
  timingNudgeButton: {
    minHeight: hp(3.7),
    borderRadius: hp(1.35),
    paddingHorizontal: wp(2.5),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: wp(1),
    flexShrink: 0,
  },
  timingNudgeButtonText: {
    fontSize: Math.min(hp(1.12), wp(2.7)),
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
  reportHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: wp(1.7),
    flexShrink: 0,
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
  analyticsActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: wp(2.2),
    marginTop: hp(1.15),
  },
  analyticsActionButton: {
    flex: 1,
    minHeight: hp(4.5),
    maxWidth: wp(42),
    borderRadius: hp(1.35),
    paddingHorizontal: wp(2.4),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: wp(1.2),
    backgroundColor: colors.primarySoft || `${colors.primary}14`,
  },
  analyticsActionText: {
    color: colors.primary,
    fontSize: Math.min(hp(1.35), wp(3.15)),
    fontWeight: '900',
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
    position: 'relative',
    paddingHorizontal: wp(1.2),
    paddingVertical: hp(1),
  },
  quickActionLocked: {
    borderColor: `${colors.primary}55`,
    backgroundColor: `${colors.primary}08`,
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
