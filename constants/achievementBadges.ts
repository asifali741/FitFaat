export const ACHIEVEMENT_UNLOCKED_STORAGE_KEY = 'fitfaat_unlocked_badges';
export const LOCAL_WORKOUT_HISTORY_KEY = 'fitfaat_completed_workouts';
export const LOCAL_WEIGHT_LOGS_KEY = 'fitfaat_weight_logs';
export const LOCAL_EARLY_LOGS_KEY = 'fitfaat_early_logs';

export type AchievementBadgeId =
  | 'first-log'
  | 'three-day-streak'
  | 'seven-day-streak'
  | 'hydration-hero'
  | 'calorie-champion'
  | 'consistency-starter'
  | 'perfect-day'
  | 'weekly-finisher'
  | 'early-bird'
  | 'goal-crusher';

export type AchievementDay = {
  dayNo?: number;
  date?: string;
  achievedCalories?: number;
  achievedHydration?: number;
  achieviedHydration?: number;
  targetCalories?: number;
  targetHydration?: number;
  status?: 'locked' | 'active' | 'finished';
};

export type AchievementLocalStats = {
  completedWorkouts?: number;
  weightLogs?: number;
  earlyLogs?: number;
};

export type AchievementSummary = {
  loggedDays: number;
  finishedDays: number;
  longestStreak: number;
  hydrationGoalDays: number;
  calorieGoalDays: number;
  perfectDays: number;
  completedWorkouts: number;
  weightLogs: number;
  earlyLogs: number;
};

export type AchievementBadge = {
  id: AchievementBadgeId;
  title: string;
  description: string;
  icon: string;
  color: string;
  lockedColor: string;
  current: number;
  target: number;
  unlocked: boolean;
  progress: number;
  progressLabel: string;
};

type BadgeDefinition = Omit<
  AchievementBadge,
  'current' | 'target' | 'unlocked' | 'progress' | 'progressLabel'
> & {
  getCurrent: (summary: AchievementSummary) => number;
  target: number;
  progressLabel: (current: number, target: number) => string;
};

const formatCount = (current: number, target: number, label: string) =>
  `${Math.min(current, target)}/${target} ${label}`;

const achievementDefinitions: BadgeDefinition[] = [
  {
    id: 'first-log',
    title: 'First Log',
    description: 'Log your first meal, hydration, or day progress.',
    icon: 'flag-outline',
    color: '#0891B2',
    lockedColor: '#94A3B8',
    target: 1,
    getCurrent: (summary) => summary.loggedDays,
    progressLabel: (current, target) => formatCount(current, target, 'log'),
  },
  {
    id: 'three-day-streak',
    title: '3-Day Streak',
    description: 'Build a three day streak from completed or active progress days.',
    icon: 'flame-outline',
    color: '#F97316',
    lockedColor: '#94A3B8',
    target: 3,
    getCurrent: (summary) => summary.longestStreak,
    progressLabel: (current, target) => formatCount(current, target, 'days'),
  },
  {
    id: 'seven-day-streak',
    title: '7-Day Streak',
    description: 'Keep your weekly rhythm alive for seven days.',
    icon: 'bonfire-outline',
    color: '#EF4444',
    lockedColor: '#94A3B8',
    target: 7,
    getCurrent: (summary) => summary.longestStreak,
    progressLabel: (current, target) => formatCount(current, target, 'days'),
  },
  {
    id: 'hydration-hero',
    title: 'Hydration Hero',
    description: 'Reach your hydration target on three days.',
    icon: 'water-outline',
    color: '#0284C7',
    lockedColor: '#94A3B8',
    target: 3,
    getCurrent: (summary) => summary.hydrationGoalDays,
    progressLabel: (current, target) => formatCount(current, target, 'days'),
  },
  {
    id: 'calorie-champion',
    title: 'Calorie Champion',
    description: 'Complete your calorie target on three days.',
    icon: 'restaurant-outline',
    color: '#F59E0B',
    lockedColor: '#94A3B8',
    target: 3,
    getCurrent: (summary) => summary.calorieGoalDays,
    progressLabel: (current, target) => formatCount(current, target, 'days'),
  },
  {
    id: 'consistency-starter',
    title: 'Consistency Starter',
    description: 'Record any three useful progress actions.',
    icon: 'repeat-outline',
    color: '#10B981',
    lockedColor: '#94A3B8',
    target: 3,
    getCurrent: (summary) =>
      summary.loggedDays + summary.completedWorkouts + summary.weightLogs,
    progressLabel: (current, target) => formatCount(current, target, 'actions'),
  },
  {
    id: 'perfect-day',
    title: 'Perfect Day',
    description: 'Hit both calories and hydration targets in one day.',
    icon: 'checkmark-done-circle-outline',
    color: '#14B8A6',
    lockedColor: '#94A3B8',
    target: 1,
    getCurrent: (summary) => summary.perfectDays,
    progressLabel: (current, target) => formatCount(current, target, 'day'),
  },
  {
    id: 'weekly-finisher',
    title: 'Weekly Finisher',
    description: 'Finish all seven days in your weekly plan.',
    icon: 'calendar-outline',
    color: '#8B5CF6',
    lockedColor: '#94A3B8',
    target: 7,
    getCurrent: (summary) => summary.finishedDays,
    progressLabel: (current, target) => formatCount(current, target, 'days'),
  },
  {
    id: 'early-bird',
    title: 'Early Bird',
    description: 'Earned when an early local log is recorded.',
    icon: 'sunny-outline',
    color: '#FACC15',
    lockedColor: '#94A3B8',
    target: 1,
    getCurrent: (summary) => summary.earlyLogs,
    progressLabel: (current, target) => formatCount(current, target, 'early log'),
  },
  {
    id: 'goal-crusher',
    title: 'Goal Crusher',
    description: 'Stack three perfect days or five completed workouts.',
    icon: 'trophy-outline',
    color: '#D97706',
    lockedColor: '#94A3B8',
    target: 3,
    getCurrent: (summary) =>
      Math.max(summary.perfectDays, Math.floor(summary.completedWorkouts / 5) * 3),
    progressLabel: (current, target) => formatCount(current, target, 'steps'),
  },
];

const toNumber = (value?: number) => Number(value || 0);

export const getAchievementDays = (
  data?: Record<string, AchievementDay> | AchievementDay[] | null
) => {
  if (!data) return [];
  return (Array.isArray(data) ? data : Object.values(data))
    .filter(Boolean)
    .sort((a, b) => toNumber(a.dayNo) - toNumber(b.dayNo));
};

const hasAnyLog = (day: AchievementDay) =>
  toNumber(day.achievedCalories) > 0 ||
  toNumber(day.achievedHydration) > 0 ||
  toNumber(day.achieviedHydration) > 0 ||
  day.status === 'finished';

const hasHydrationGoal = (day: AchievementDay) =>
  toNumber(day.targetHydration) > 0 &&
  Math.max(toNumber(day.achieviedHydration), toNumber(day.achievedHydration)) >=
    toNumber(day.targetHydration);

const hasCalorieGoal = (day: AchievementDay) =>
  toNumber(day.targetCalories) > 0 &&
  toNumber(day.achievedCalories) >= toNumber(day.targetCalories);

const getLongestStreak = (days: AchievementDay[]) => {
  let longest = 0;
  let current = 0;

  for (const day of days) {
    if (day.status === 'finished' || (day.status === 'active' && hasAnyLog(day))) {
      current += 1;
      longest = Math.max(longest, current);
    } else if (day.status === 'locked') {
      current = 0;
    }
  }

  return longest;
};

export const buildAchievementSummary = (
  data?: Record<string, AchievementDay> | AchievementDay[] | null,
  localStats: AchievementLocalStats = {}
): AchievementSummary => {
  const days = getAchievementDays(data);
  const loggedDays = days.filter(hasAnyLog).length;
  const finishedDays = days.filter((day) => day.status === 'finished').length;
  const hydrationGoalDays = days.filter(hasHydrationGoal).length;
  const calorieGoalDays = days.filter(hasCalorieGoal).length;
  const perfectDays = days.filter((day) => hasHydrationGoal(day) && hasCalorieGoal(day)).length;

  return {
    loggedDays,
    finishedDays,
    longestStreak: getLongestStreak(days),
    hydrationGoalDays,
    calorieGoalDays,
    perfectDays,
    completedWorkouts: localStats.completedWorkouts || 0,
    weightLogs: localStats.weightLogs || 0,
    earlyLogs: localStats.earlyLogs || 0,
  };
};

export const calculateAchievementBadges = (
  data?: Record<string, AchievementDay> | AchievementDay[] | null,
  localStats: AchievementLocalStats = {}
): AchievementBadge[] => {
  const summary = buildAchievementSummary(data, localStats);

  return achievementDefinitions.map((definition) => {
    const current = definition.getCurrent(summary);
    const progress = definition.target > 0 ? Math.min(current / definition.target, 1) : 0;

    return {
      id: definition.id,
      title: definition.title,
      description: definition.description,
      icon: definition.icon,
      color: definition.color,
      lockedColor: definition.lockedColor,
      current,
      target: definition.target,
      unlocked: current >= definition.target,
      progress,
      progressLabel: definition.progressLabel(current, definition.target),
    };
  });
};
