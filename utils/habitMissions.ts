import AsyncStorage from '@react-native-async-storage/async-storage';
import type { FitFaatNotificationRequest } from '@/contexts/NotificationContext';
import type {
  DailyNutritionScore,
  NutritionInsightAction,
  WeeklyNutritionReport,
} from './nutritionInsights';

export const HABIT_MISSIONS_STORAGE_KEY = 'fitfaat_habit_missions_v1';
export const BEHAVIOR_CHECKINS_STORAGE_KEY = 'fitfaat_behavior_checkins_v1';
export const MINI_LESSONS_SEEN_STORAGE_KEY = 'fitfaat_mini_lessons_seen_v1';
export const CRAVING_LOGS_STORAGE_KEY = 'fitfaat_craving_logs_v1';
export const HABIT_PREFERENCES_STORAGE_KEY = 'fitfaat_habit_preferences_v1';

const HABIT_NOTIFICATION_STATE_KEY = 'fitfaat_habit_notification_state_v1';

export type HabitMissionType =
  | 'hydration'
  | 'protein'
  | 'mealTiming'
  | 'logging'
  | 'recovery'
  | 'reflection';

export type BehaviorCheckInType = 'craving' | 'moodFood' | 'mealReflection';
export type HabitStreakStatus = 'new' | 'active' | 'atRisk' | 'recovery';

export type HabitPlanStep = {
  id: string;
  label: string;
  done: boolean;
};

export type HabitMission = {
  id: string;
  dateKey: string;
  type: HabitMissionType;
  title: string;
  body: string;
  action: NutritionInsightAction;
  lessonId: string;
  lessonTitle: string;
  lessonBody: string;
  lessonSteps?: string[];
  personalPlan?: HabitPlanStep[];
  recoveryPlan?: string[];
  streakStatus?: HabitStreakStatus;
  streakMessage?: string;
  createdAt: string;
  completedAt?: string;
};

export type BehaviorCheckIn = {
  id: string;
  dateKey: string;
  type: BehaviorCheckInType;
  mood?: string | null;
  note?: string;
  cravingLevel?: number;
  createdAt: string;
};

export type HabitMissionState = {
  mission: HabitMission;
  streakCount: number;
  streakStatus: HabitStreakStatus;
  recoveryAvailable: boolean;
};

export type HabitPreferences = {
  remindersEnabled: boolean;
  reminderHour: number;
  reminderMinute: number;
};

export type HabitLessonProgress = {
  lessonId: string;
  seenAt: string;
  completedAt?: string;
};

type NotificationState = {
  missionId: string;
  dateKey: string;
  notificationId: string | null;
};

type ScheduleNotification = (request: FitFaatNotificationRequest) => Promise<string | null>;
type CancelNotification = (notificationId: string) => Promise<void>;

const defaultPreferences: HabitPreferences = {
  remindersEnabled: true,
  reminderHour: 16,
  reminderMinute: 30,
};

const createId = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

const getTodayKey = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const readJson = async <T,>(key: string, fallback: T): Promise<T> => {
  try {
    const rawValue = await AsyncStorage.getItem(key);
    return rawValue ? JSON.parse(rawValue) as T : fallback;
  } catch {
    return fallback;
  }
};

const writeJson = async (key: string, value: unknown) => {
  await AsyncStorage.setItem(key, JSON.stringify(value));
};

const getActionLabel = (action: NutritionInsightAction) => {
  if (action === 'water') return 'Log water';
  if (action === 'mealPlanner') return 'Plan meal';
  if (action === 'note') return 'Reflect';
  return 'Log meal';
};

const getMissionTemplate = (
  type: HabitMissionType,
  todayScore: DailyNutritionScore | null,
  report: WeeklyNutritionReport
) => {
  switch (type) {
    case 'hydration':
      return {
        title: 'Drink water before lunch',
        body: `Hydration is ${todayScore?.hydrationScore || report.hydrationScore}%. Move one water log earlier so the day has less catching up to do.`,
        action: 'water' as NutritionInsightAction,
        lessonId: 'water-before-lunch',
        lessonTitle: 'Earlier water is easier water',
        lessonBody: 'Hydration goals are easier when the first log happens before the day gets busy.',
        lessonSteps: [
          'Log the first drink before lunch.',
          'Pair one drink with the next meal.',
          'Check hydration again before evening.',
        ],
      };
    case 'protein':
      return {
        title: 'Add visible protein today',
        body: todayScore?.proteinStatus === 'needed'
          ? 'Calories are logged, but protein is not visible. Add protein grams with your next meal.'
          : 'Try to make the next meal protein-focused so the weekly score has a stronger base.',
        action: 'meal' as NutritionInsightAction,
        lessonId: 'protein-visibility',
        lessonTitle: 'Protein needs a visible log',
        lessonBody: 'The coach only scores protein when meal logs include protein grams.',
        lessonSteps: [
          'Choose a protein source for the next meal.',
          'Enter protein grams when logging custom foods.',
          'Keep the meal simple enough to repeat.',
        ],
      };
    case 'mealTiming':
      return {
        title: 'Spread meals across the day',
        body: 'Use Meal Planner to place food earlier instead of stacking most calories into one window.',
        action: 'mealPlanner' as NutritionInsightAction,
        lessonId: 'meal-timing-spread',
        lessonTitle: 'Timing lowers friction',
        lessonBody: 'Balanced meal windows make calorie goals feel less like a late-day scramble.',
        lessonSteps: [
          'Plan the next two meal windows.',
          'Avoid leaving most calories for late evening.',
          'Use a planned snack if the day runs long.',
        ],
      };
    case 'recovery':
      return {
        title: 'Run a recovery day',
        body: 'After a weak nutrition day, log one meal and one water entry before chasing perfection.',
        action: 'meal' as NutritionInsightAction,
        lessonId: 'recovery-reset',
        lessonTitle: 'Recovery starts small',
        lessonBody: 'A missed day is best repaired by one simple food log and one water log.',
        lessonSteps: [
          'Log one easy meal first.',
          'Add one water entry before the next meal.',
          'Mark the mission done after the reset is started.',
        ],
      };
    case 'reflection':
      return {
        title: 'Reflect after dinner',
        body: 'Use a meal reflection to connect mood, cravings, and food choices.',
        action: 'note' as NutritionInsightAction,
        lessonId: 'mood-food-reflection',
        lessonTitle: 'Reflection makes patterns visible',
        lessonBody: 'Mood-food notes help the coach spot patterns that calories alone cannot explain.',
        lessonSteps: [
          'Notice the strongest craving or mood shift.',
          'Write one sentence about what helped.',
          'Pick one easier choice for tomorrow.',
        ],
      };
    default:
      return {
        title: 'Log two small wins',
        body: 'Log one meal and one water entry so FitFaat can score the day accurately.',
        action: 'meal' as NutritionInsightAction,
        lessonId: 'two-small-wins',
        lessonTitle: 'Small logs compound',
        lessonBody: 'One meal and one water log give the coach enough signal to guide the day.',
        lessonSteps: [
          'Log one meal.',
          'Log one water entry.',
          'Check the score again after both are saved.',
        ],
      };
  }
};

const getPreviousScore = (report: WeeklyNutritionReport) => {
  const todayKey = report.todayScore?.dateKey;
  const scoredDays = report.dailyScores
    .filter((score) => score.dateKey !== todayKey)
    .sort((a, b) => a.dateKey.localeCompare(b.dateKey));

  return scoredDays[scoredDays.length - 1] || null;
};

const shouldRunRecoveryMission = (report: WeeklyNutritionReport) => {
  const previousScore = getPreviousScore(report);
  if (!previousScore) return false;

  const today = report.todayScore;
  return (
    previousScore.score < 45 ||
    previousScore.loggingScore < 35 ||
    (!!today && today.score < 45 && previousScore.score < 55)
  );
};

const chooseMissionType = (
  report: WeeklyNutritionReport,
  selectedMood?: string | null
): HabitMissionType => {
  const today = report.todayScore;

  if (selectedMood === 'stressed' || selectedMood === 'tired') return 'reflection';
  if (shouldRunRecoveryMission(report)) return 'recovery';
  if (!today || today.loggingScore < 45) return 'logging';
  if (today.hydrationScore < 70) return 'hydration';
  if (today.calories > 350 && today.proteinStatus === 'needed') return 'protein';
  if (today.proteinScore !== null && today.proteinScore < 70) return 'protein';
  if (today.mealTimingScore < 70) return 'mealTiming';
  if (report.weakestDay && report.weakestDay.score < 45) return 'recovery';

  const focus = report.nextWeekFocus.factor;
  if (focus === 'hydration') return 'hydration';
  if (focus === 'protein') return 'protein';
  if (focus === 'mealTiming') return 'mealTiming';
  if (focus === 'calories') return 'recovery';
  return 'logging';
};

const buildPersonalPlan = (
  type: HabitMissionType,
  todayScore: DailyNutritionScore | null,
  report: WeeklyNutritionReport
): HabitPlanStep[] => {
  const steps: HabitPlanStep[] = [];

  if (!todayScore || todayScore.loggingScore < 70 || type === 'logging') {
    steps.push({ id: 'log-meal-water', label: 'Log one meal and one water entry', done: !!todayScore && todayScore.loggingScore >= 70 });
  }

  if (todayScore && todayScore.hydrationScore < 80) {
    steps.push({ id: 'water-before-evening', label: 'Add water before evening', done: todayScore.hydrationScore >= 80 });
  }

  if (todayScore && todayScore.proteinStatus === 'needed' && todayScore.calories > 350) {
    steps.push({ id: 'make-protein-visible', label: 'Make protein visible in the next meal', done: false });
  } else if (todayScore?.proteinScore !== null && Number(todayScore?.proteinScore || 0) < 75) {
    steps.push({ id: 'protein-focused-meal', label: 'Choose a protein-focused meal', done: false });
  }

  if (todayScore && todayScore.mealTimingScore < 75) {
    steps.push({ id: 'plan-meal-window', label: 'Plan the next meal window', done: false });
  }

  if (type === 'recovery' || report.weakestDay?.score && report.weakestDay.score < 45) {
    steps.push({ id: 'reset-not-perfect', label: 'Start recovery with one small reset', done: false });
  }

  return steps.slice(0, 3);
};

const buildRecoveryPlan = (report: WeeklyNutritionReport) => {
  const previousScore = getPreviousScore(report);
  if (!previousScore || previousScore.score >= 55) return undefined;

  return [
    `Previous score was ${previousScore.score}. Restart with one meal log.`,
    'Add one water entry before the next meal.',
    'Avoid changing the whole plan because of one weak day.',
  ];
};

const createMission = (
  report: WeeklyNutritionReport,
  selectedMood?: string | null
): HabitMission => {
  const dateKey = report.todayScore?.dateKey || getTodayKey();
  const type = chooseMissionType(report, selectedMood);
  const template = getMissionTemplate(type, report.todayScore, report);

  return {
    id: createId('mission'),
    dateKey,
    type,
    createdAt: new Date().toISOString(),
    personalPlan: buildPersonalPlan(type, report.todayScore, report),
    recoveryPlan: buildRecoveryPlan(report),
    ...template,
  };
};

const getCheckInsForDate = async (dateKey: string) => {
  const checkIns = await readJson<BehaviorCheckIn[]>(BEHAVIOR_CHECKINS_STORAGE_KEY, []);
  return checkIns.filter((checkIn) => checkIn.dateKey === dateKey);
};

const isMissionComplete = async (
  mission: HabitMission,
  todayScore: DailyNutritionScore | null
) => {
  if (!todayScore) return false;

  if (mission.type === 'hydration') return todayScore.hydrationScore >= 75;
  if (mission.type === 'protein') {
    return todayScore.proteinScore !== null && todayScore.proteinScore >= 70;
  }
  if (mission.type === 'mealTiming') return todayScore.mealTimingScore >= 70;
  if (mission.type === 'logging') return todayScore.loggingScore >= 70;
  if (mission.type === 'recovery') return todayScore.score >= 55 && todayScore.loggingScore >= 55;
  if (mission.type === 'reflection') {
    const checkIns = await getCheckInsForDate(mission.dateKey);
    return checkIns.some((checkIn) => checkIn.type === 'mealReflection' || checkIn.type === 'moodFood');
  }

  return false;
};

const calculateHabitStreakInfo = (missions: HabitMission[]) => {
  const completedByDate = new Set(
    missions
      .filter((mission) => mission.completedAt)
      .map((mission) => mission.dateKey)
  );
  let streak = 0;
  const cursor = new Date();
  const todayKey = getTodayKeyForDate(cursor);
  const yesterday = new Date(cursor);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = getTodayKeyForDate(yesterday);
  const dayBeforeYesterday = new Date(cursor);
  dayBeforeYesterday.setDate(dayBeforeYesterday.getDate() - 2);
  const dayBeforeYesterdayKey = getTodayKeyForDate(dayBeforeYesterday);

  for (let index = 0; index < 45; index += 1) {
    const dateKey = getTodayKeyForDate(cursor);
    if (!completedByDate.has(dateKey)) {
      if (index === 0) {
        cursor.setDate(cursor.getDate() - 1);
        continue;
      }
      break;
    }

    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  const todayComplete = completedByDate.has(todayKey);
  const yesterdayComplete = completedByDate.has(yesterdayKey);
  const recoveryAvailable = !todayComplete && !yesterdayComplete && completedByDate.has(dayBeforeYesterdayKey);
  const status: HabitStreakStatus = todayComplete
    ? 'active'
    : recoveryAvailable
      ? 'recovery'
      : yesterdayComplete && streak > 0
        ? 'atRisk'
        : streak > 0
          ? 'atRisk'
          : 'new';

  return {
    streakCount: streak,
    status,
    recoveryAvailable,
  };
};

const calculateHabitStreak = (missions: HabitMission[]) =>
  calculateHabitStreakInfo(missions).streakCount;

const getTodayKeyForDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const refreshHabitMission = async (
  report: WeeklyNutritionReport,
  selectedMood?: string | null
): Promise<HabitMissionState> => {
  const missions = await readJson<HabitMission[]>(HABIT_MISSIONS_STORAGE_KEY, []);
  const dateKey = report.todayScore?.dateKey || getTodayKey();
  let mission = missions.find((item) => item.dateKey === dateKey);

  if (!mission) {
    mission = createMission(report, selectedMood);
  }
  const baseMission: HabitMission = mission;

  const complete = await isMissionComplete(baseMission, report.todayScore);
  if (complete && !baseMission.completedAt) {
    mission = { ...baseMission, completedAt: new Date().toISOString() };
  } else {
    mission = baseMission;
  }
  const currentMission: HabitMission = mission;

  let nextMissions = [
    currentMission,
    ...missions.filter((item) => item.id !== currentMission.id && item.dateKey !== currentMission.dateKey),
  ]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 60);
  const streakInfo = calculateHabitStreakInfo(nextMissions);
  const streakMessage =
    streakInfo.status === 'active'
      ? `${streakInfo.streakCount} day mission streak protected`
      : streakInfo.status === 'recovery'
        ? 'Recovery is available: save the streak with one small reset'
        : streakInfo.status === 'atRisk'
          ? 'Protect the streak with the easiest mission step'
          : 'Start a new streak with one logged win';
  mission = {
    ...currentMission,
    personalPlan: currentMission.personalPlan?.length ? currentMission.personalPlan : buildPersonalPlan(currentMission.type, report.todayScore, report),
    recoveryPlan: currentMission.recoveryPlan || buildRecoveryPlan(report),
    streakStatus: streakInfo.status,
    streakMessage,
  };
  nextMissions = [
    mission,
    ...nextMissions.filter((item) => item.id !== mission.id && item.dateKey !== mission.dateKey),
  ];

  await writeJson(HABIT_MISSIONS_STORAGE_KEY, nextMissions);

  return {
    mission,
    streakCount: streakInfo.streakCount,
    streakStatus: streakInfo.status,
    recoveryAvailable: streakInfo.recoveryAvailable,
  };
};

export const markHabitMissionComplete = async (missionId: string) => {
  const missions = await readJson<HabitMission[]>(HABIT_MISSIONS_STORAGE_KEY, []);
  const nextMissions = missions.map((mission) =>
    mission.id === missionId
      ? { ...mission, completedAt: mission.completedAt || new Date().toISOString() }
      : mission
  );
  await writeJson(HABIT_MISSIONS_STORAGE_KEY, nextMissions);
  const mission = nextMissions.find((item) => item.id === missionId);
  const streakInfo = calculateHabitStreakInfo(nextMissions);
  if (mission?.lessonId) {
    await markMiniLessonComplete(mission.lessonId);
  }
  return {
    mission: mission || null,
    streakCount: streakInfo.streakCount,
    streakStatus: streakInfo.status,
    recoveryAvailable: streakInfo.recoveryAvailable,
  };
};

export const recordBehaviorCheckIn = async (input: {
  type: BehaviorCheckInType;
  mood?: string | null;
  note?: string;
  cravingLevel?: number;
  dateKey?: string;
}) => {
  const checkIn: BehaviorCheckIn = {
    id: createId('checkin'),
    dateKey: input.dateKey || getTodayKey(),
    type: input.type,
    mood: input.mood || null,
    note: input.note,
    cravingLevel: input.cravingLevel,
    createdAt: new Date().toISOString(),
  };
  const checkIns = await readJson<BehaviorCheckIn[]>(BEHAVIOR_CHECKINS_STORAGE_KEY, []);
  await writeJson(BEHAVIOR_CHECKINS_STORAGE_KEY, [checkIn, ...checkIns].slice(0, 180));

  if (input.type === 'craving') {
    const cravings = await readJson<BehaviorCheckIn[]>(CRAVING_LOGS_STORAGE_KEY, []);
    await writeJson(CRAVING_LOGS_STORAGE_KEY, [checkIn, ...cravings].slice(0, 120));
  }

  return checkIn;
};

const normalizeLessonProgress = (value: unknown): HabitLessonProgress[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (typeof item === 'string') {
        return { lessonId: item, seenAt: new Date().toISOString() };
      }

      if (item && typeof item.lessonId === 'string') {
        return {
          lessonId: item.lessonId,
          seenAt: typeof item.seenAt === 'string' ? item.seenAt : new Date().toISOString(),
          completedAt: typeof item.completedAt === 'string' ? item.completedAt : undefined,
        };
      }

      return null;
    })
    .filter((item): item is HabitLessonProgress => !!item);
};

export const loadMiniLessonProgress = async () =>
  normalizeLessonProgress(await readJson<unknown[]>(MINI_LESSONS_SEEN_STORAGE_KEY, []));

export const markMiniLessonSeen = async (lessonId: string) => {
  const progress = await loadMiniLessonProgress();
  const existing = progress.find((item) => item.lessonId === lessonId);
  if (existing) return progress;
  const nextProgress = [
    { lessonId, seenAt: new Date().toISOString() },
    ...progress,
  ].slice(0, 80);
  await writeJson(MINI_LESSONS_SEEN_STORAGE_KEY, nextProgress);
  return nextProgress;
};

export const markMiniLessonComplete = async (lessonId: string) => {
  const progress = await loadMiniLessonProgress();
  const now = new Date().toISOString();
  const existing = progress.find((item) => item.lessonId === lessonId);
  const nextProgress = existing
    ? progress.map((item) =>
        item.lessonId === lessonId
          ? { ...item, completedAt: item.completedAt || now }
          : item
      )
    : [{ lessonId, seenAt: now, completedAt: now }, ...progress];
  await writeJson(MINI_LESSONS_SEEN_STORAGE_KEY, nextProgress.slice(0, 80));
  return nextProgress;
};

const readHabitPreferences = async () => {
  const preferences = await readJson<HabitPreferences>(
    HABIT_PREFERENCES_STORAGE_KEY,
    defaultPreferences
  );
  await writeJson(HABIT_PREFERENCES_STORAGE_KEY, preferences);
  return preferences;
};

export const loadHabitPreferences = async () => readHabitPreferences();

export const saveHabitPreferences = async (updates: Partial<HabitPreferences>) => {
  const current = await readHabitPreferences();
  const nextPreferences: HabitPreferences = {
    ...current,
    ...updates,
    reminderHour: Math.max(6, Math.min(21, Math.round(Number(updates.reminderHour ?? current.reminderHour)))),
    reminderMinute: Math.max(0, Math.min(59, Math.round(Number(updates.reminderMinute ?? current.reminderMinute)))),
  };
  await writeJson(HABIT_PREFERENCES_STORAGE_KEY, nextPreferences);
  return nextPreferences;
};

export const formatHabitReminderTime = (preferences: HabitPreferences) => {
  const date = new Date();
  date.setHours(preferences.reminderHour, preferences.reminderMinute, 0, 0);
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
};

export const scheduleHabitMissionReminder = async ({
  mission,
  schedule,
  cancel,
}: {
  mission: HabitMission;
  schedule: ScheduleNotification;
  cancel: CancelNotification;
}) => {
  const currentState = await readJson<NotificationState | null>(HABIT_NOTIFICATION_STATE_KEY, null);
  const preferences = await readHabitPreferences();
  if (!preferences.remindersEnabled) {
    if (currentState?.notificationId) {
      await cancel(currentState.notificationId).catch(() => {});
      await writeJson(HABIT_NOTIFICATION_STATE_KEY, {
        missionId: mission.id,
        dateKey: mission.dateKey,
        notificationId: null,
      });
    }
    return null;
  }
  if (mission.completedAt) {
    if (currentState?.notificationId) {
      await cancel(currentState.notificationId).catch(() => {});
    }
    await writeJson(HABIT_NOTIFICATION_STATE_KEY, {
      missionId: mission.id,
      dateKey: mission.dateKey,
      notificationId: null,
    });
    return null;
  }

  if (currentState?.missionId === mission.id && currentState.notificationId) {
    return currentState.notificationId;
  }

  if (currentState?.notificationId) {
    await cancel(currentState.notificationId).catch(() => {});
  }

  const reminderDate = new Date();
  reminderDate.setHours(preferences.reminderHour, preferences.reminderMinute, 0, 0);
  if (reminderDate <= new Date()) {
    reminderDate.setTime(Date.now() + 90 * 60 * 1000);
  }
  if (reminderDate.getHours() >= 22) return null;

  const notificationId = await schedule({
    type: 'meal',
    title: mission.title,
    body: `${mission.body} ${getActionLabel(mission.action)} when you are ready.`,
    date: reminderDate,
    data: {
      type: 'meal',
      route: '/(main)/(dashboard)',
    },
  });

  await writeJson(HABIT_NOTIFICATION_STATE_KEY, {
    missionId: mission.id,
    dateKey: mission.dateKey,
    notificationId,
  });

  return notificationId;
};

export const rebuildHabitMissionReminderFromStorage = async ({
  schedule,
  cancel,
}: {
  schedule: ScheduleNotification;
  cancel: CancelNotification;
}) => {
  const missions = await readJson<HabitMission[]>(HABIT_MISSIONS_STORAGE_KEY, []);
  const todayKey = getTodayKey();
  const mission =
    missions.find((item) => item.dateKey === todayKey) ||
    missions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

  if (!mission) return null;

  return scheduleHabitMissionReminder({
    mission,
    schedule,
    cancel,
  });
};
