import AsyncStorage from '@react-native-async-storage/async-storage';
import type { FitFaatNotificationRequest } from '@/contexts/NotificationContext';
import { tokenStorage } from '@/utils/auth/tokenStorage';

const PROFILE_ENTRIES_KEY_PREFIX = 'fitfaat_nutrition_profile_entries';
const PROFILE_NOTIFICATIONS_KEY_PREFIX = 'fitfaat_nutrition_profile_notifications';
const MAX_PROFILE_ENTRIES = 180;
const UNDER_TARGET_RATIO = 0.95;
const OVER_TARGET_RATIO = 1.05;
const DEFAULT_MEAL_HOURS = [8, 13, 19];
const DEFAULT_WATER_HOURS = [10, 15, 20];
const DAILY_LOG_MINUTE = 0;
const ADAPTIVE_NOTICE_MINUTE = 15;

export type NutritionGoalOutcome = 'under' | 'over' | 'onTarget' | 'unknown';

export type NutritionProfileEntry = {
  id?: string;
  dayLogId?: string;
  dayNo?: number;
  dayDate?: string;
  timestamp: string;
  calories?: number;
  waterLiters?: number;
  targetCalories?: number;
  achievedCaloriesAfter?: number;
  targetHydration?: number;
  achievedHydrationAfter?: number;
};

export type NutritionGoalSummary = {
  dayLogId?: string;
  dayNo?: number;
  date?: string;
  achievedCalories?: number;
  targetCalories?: number;
  achievedHydration?: number;
  targetHydration?: number;
};

export type NutritionProfile = {
  entryCount: number;
  mealEntryCount: number;
  waterEntryCount: number;
  regularMealHours: number[];
  highestCalorieHours: number[];
  lowestCalorieHours: number[];
  hydrationHours: number[];
};

type ScheduleNotification = (request: FitFaatNotificationRequest) => Promise<string | null>;
type CancelNotification = (notificationId: string) => Promise<void>;

type StoredNutritionPlan = {
  planKey: string;
  createdAt: string;
  outcome: NutritionGoalOutcome;
  notificationIds: string[];
};

type HourStats = {
  hour: number;
  count: number;
  totalCalories: number;
  totalWater: number;
};

const toFiniteNumber = (value: unknown, fallback = 0) => {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
};

const clampHour = (hour: number) => Math.max(0, Math.min(23, Math.round(hour)));

const getLocalDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const startOfLocalDay = (date: Date) => {
  const nextDate = new Date(date);
  nextDate.setHours(0, 0, 0, 0);
  return nextDate;
};

const parseProfileDate = (value?: string) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const isSummaryBeforeToday = (summary: NutritionGoalSummary) => {
  const summaryDate = parseProfileDate(summary.date);
  if (!summaryDate) return false;
  return startOfLocalDay(summaryDate).getTime() < startOfLocalDay(new Date()).getTime();
};

const getUserStorageSuffix = async () => {
  try {
    const user = await tokenStorage.getUser();
    return user?.id || user?._id || user?.email || 'anonymous';
  } catch (error) {
    console.error('Error reading nutrition profile user:', error);
    return 'anonymous';
  }
};

const getEntriesKey = async () => `${PROFILE_ENTRIES_KEY_PREFIX}:${await getUserStorageSuffix()}`;

const getNotificationsKey = async () => `${PROFILE_NOTIFICATIONS_KEY_PREFIX}:${await getUserStorageSuffix()}`;

const readJson = async <T,>(key: string, fallback: T): Promise<T> => {
  try {
    const value = await AsyncStorage.getItem(key);
    return value ? JSON.parse(value) as T : fallback;
  } catch (error) {
    console.error('Error reading nutrition profile storage:', error);
    return fallback;
  }
};

const writeJson = async (key: string, value: unknown) => {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error('Error writing nutrition profile storage:', error);
  }
};

const getEntryHour = (entry: NutritionProfileEntry) => {
  const date = new Date(entry.timestamp);
  return Number.isNaN(date.getTime()) ? null : date.getHours();
};

const getStoredEntries = async () => {
  const key = await getEntriesKey();
  return readJson<NutritionProfileEntry[]>(key, []);
};

const selectHours = (hours: number[], fallback: number[], limit: number) => {
  const selected: number[] = [];
  const candidates = [...hours, ...fallback].map(clampHour);

  candidates.forEach((hour) => {
    const alreadySelected = selected.includes(hour);
    const tooClose = selected.some((selectedHour) => Math.abs(selectedHour - hour) < 2);

    if (!alreadySelected && !tooClose && selected.length < limit) {
      selected.push(hour);
    }
  });

  fallback.map(clampHour).forEach((hour) => {
    if (!selected.includes(hour) && selected.length < limit) {
      selected.push(hour);
    }
  });

  return selected.slice(0, limit);
};

const addHourStats = (
  stats: Map<number, HourStats>,
  hour: number,
  calories: number,
  waterLiters: number
) => {
  const current = stats.get(hour) || {
    hour,
    count: 0,
    totalCalories: 0,
    totalWater: 0,
  };

  stats.set(hour, {
    hour,
    count: current.count + 1,
    totalCalories: current.totalCalories + calories,
    totalWater: current.totalWater + waterLiters,
  });
};

export const buildNutritionProfile = async (): Promise<NutritionProfile> => {
  const entries = await getStoredEntries();
  const mealStats = new Map<number, HourStats>();
  const waterStats = new Map<number, HourStats>();

  entries.forEach((entry) => {
    const hour = getEntryHour(entry);
    if (hour === null) return;

    const calories = Math.max(0, toFiniteNumber(entry.calories));
    const waterLiters = Math.max(0, toFiniteNumber(entry.waterLiters));

    if (calories > 0) {
      addHourStats(mealStats, hour, calories, 0);
    }

    if (waterLiters > 0) {
      addHourStats(waterStats, hour, 0, waterLiters);
    }
  });

  const mealStatsList = Array.from(mealStats.values());
  const waterStatsList = Array.from(waterStats.values());

  const regularMealHours = selectHours(
    mealStatsList
      .sort((a, b) => b.count - a.count || b.totalCalories - a.totalCalories)
      .map((stat) => stat.hour),
    DEFAULT_MEAL_HOURS,
    3
  );

  const highestCalorieHours = selectHours(
    mealStatsList
      .sort((a, b) => b.totalCalories - a.totalCalories || b.count - a.count)
      .map((stat) => stat.hour),
    regularMealHours,
    3
  );

  const lowestCalorieHours = selectHours(
    mealStatsList
      .filter((stat) => stat.totalCalories > 0)
      .sort((a, b) => (a.totalCalories / a.count) - (b.totalCalories / b.count) || a.count - b.count)
      .map((stat) => stat.hour),
    regularMealHours,
    3
  );

  const hydrationHours = selectHours(
    waterStatsList
      .sort((a, b) => b.count - a.count || b.totalWater - a.totalWater)
      .map((stat) => stat.hour),
    DEFAULT_WATER_HOURS,
    3
  );

  return {
    entryCount: entries.length,
    mealEntryCount: mealStatsList.reduce((total, stat) => total + stat.count, 0),
    waterEntryCount: waterStatsList.reduce((total, stat) => total + stat.count, 0),
    regularMealHours,
    highestCalorieHours,
    lowestCalorieHours,
    hydrationHours,
  };
};

export const recordNutritionProfileEntry = async (entry: NutritionProfileEntry) => {
  const calories = Math.max(0, toFiniteNumber(entry.calories));
  const waterLiters = Math.max(0, toFiniteNumber(entry.waterLiters));

  if (calories <= 0 && waterLiters <= 0) {
    return;
  }

  const key = await getEntriesKey();
  const entries = await readJson<NutritionProfileEntry[]>(key, []);
  const timestamp = entry.timestamp || new Date().toISOString();
  const normalizedEntry: NutritionProfileEntry = {
    ...entry,
    id: entry.id || `${timestamp}:${entry.dayLogId || 'day'}:${entries.length}`,
    timestamp,
    calories,
    waterLiters,
    targetCalories: toFiniteNumber(entry.targetCalories),
    achievedCaloriesAfter: toFiniteNumber(entry.achievedCaloriesAfter),
    targetHydration: toFiniteNumber(entry.targetHydration),
    achievedHydrationAfter: toFiniteNumber(entry.achievedHydrationAfter),
  };

  const nextEntries = [...entries, normalizedEntry]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, MAX_PROFILE_ENTRIES);

  await writeJson(key, nextEntries);
};

export const getNutritionGoalOutcome = (summary: NutritionGoalSummary): NutritionGoalOutcome => {
  const targetCalories = toFiniteNumber(summary.targetCalories);
  const achievedCalories = toFiniteNumber(summary.achievedCalories);

  if (targetCalories <= 0) {
    return 'unknown';
  }

  if (achievedCalories < targetCalories * UNDER_TARGET_RATIO) {
    return 'under';
  }

  if (achievedCalories > targetCalories * OVER_TARGET_RATIO) {
    return 'over';
  }

  return 'onTarget';
};

const createNextOccurrence = (hour: number, minute: number) => {
  const now = new Date();
  const date = new Date(now);
  date.setHours(clampHour(hour), minute, 0, 0);

  if (date.getTime() <= now.getTime() + 2 * 60 * 1000) {
    date.setDate(date.getDate() + 1);
  }

  return date;
};

const createPlanKey = (
  summary: NutritionGoalSummary,
  outcome: NutritionGoalOutcome,
  profile: NutritionProfile
) => {
  const todayKey = getLocalDateKey(new Date());
  const summaryKey = summary.dayLogId || `${summary.dayNo || 'day'}:${summary.date || todayKey}`;
  const achievedCalories = Math.round(toFiniteNumber(summary.achievedCalories));
  const targetCalories = Math.round(toFiniteNumber(summary.targetCalories));
  const achievedHydration = Math.round(toFiniteNumber(summary.achievedHydration) * 10) / 10;
  const targetHydration = Math.round(toFiniteNumber(summary.targetHydration) * 10) / 10;

  return [
    todayKey,
    summaryKey,
    outcome,
    achievedCalories,
    targetCalories,
    achievedHydration,
    targetHydration,
    profile.regularMealHours.join('-'),
    profile.highestCalorieHours.join('-'),
    profile.lowestCalorieHours.join('-'),
    profile.hydrationHours.join('-'),
  ].join('|');
};

const cancelStoredPlan = async (plan: StoredNutritionPlan | null, cancel: CancelNotification) => {
  if (!plan?.notificationIds?.length) return;

  await Promise.all(
    plan.notificationIds.map(async (notificationId) => {
      try {
        await cancel(notificationId);
      } catch (error) {
        console.error('Error cancelling adaptive nutrition notification:', error);
      }
    })
  );
};

const addNotification = async (
  notificationIds: string[],
  schedule: ScheduleNotification,
  request: FitFaatNotificationRequest
) => {
  const id = await schedule(request);
  if (id) {
    notificationIds.push(id);
  }
};

export const scheduleAdaptiveNutritionNotifications = async ({
  summary,
  schedule,
  cancel,
}: {
  summary: NutritionGoalSummary;
  schedule: ScheduleNotification;
  cancel: CancelNotification;
}) => {
  const profile = await buildNutritionProfile();
  const rawOutcome = getNutritionGoalOutcome(summary);
  const outcome = rawOutcome === 'under' && !isSummaryBeforeToday(summary) ? 'onTarget' : rawOutcome;
  const notificationsKey = await getNotificationsKey();
  const previousPlan = await readJson<StoredNutritionPlan | null>(notificationsKey, null);
  const planKey = createPlanKey(summary, outcome, profile);

  if (previousPlan?.planKey === planKey) {
    return previousPlan.notificationIds;
  }

  await cancelStoredPlan(previousPlan, cancel);

  const notificationIds: string[] = [];
  const dashboardData = { route: '/(main)/(dashboard)' };

  for (const hour of profile.regularMealHours) {
    await addNotification(notificationIds, schedule, {
      type: 'meal',
      title: 'Meal log ready',
      body: 'Open FitFaat to log food or water in a few taps.',
      daily: { hour, minute: DAILY_LOG_MINUTE },
      data: dashboardData,
      sound: false,
      sticky: true,
      autoDismiss: false,
    });
  }

  if (outcome === 'under') {
    const targetHours = selectHours(
      [...profile.lowestCalorieHours, ...profile.regularMealHours],
      DEFAULT_MEAL_HOURS,
      3
    );

    for (const hour of targetHours) {
      await addNotification(notificationIds, schedule, {
        type: 'meal',
        title: 'Calories were low yesterday',
        body: 'This is usually a good eating window for you. Add a balanced meal and water to stay on track.',
        date: createNextOccurrence(hour, ADAPTIVE_NOTICE_MINUTE),
        data: dashboardData,
      });
    }

    if (
      toFiniteNumber(summary.targetHydration) > 0 &&
      toFiniteNumber(summary.achievedHydration) < toFiniteNumber(summary.targetHydration)
    ) {
      for (const hour of profile.hydrationHours.slice(0, 2)) {
        await addNotification(notificationIds, schedule, {
          type: 'health',
          title: 'Water check-in',
          body: 'Your hydration was low recently. Drink some water and log it when you can.',
          date: createNextOccurrence(hour, ADAPTIVE_NOTICE_MINUTE),
          data: dashboardData,
        });
      }
    }
  }

  if (outcome === 'over') {
    for (const hour of profile.highestCalorieHours) {
      await addNotification(notificationIds, schedule, {
        type: 'meal',
        title: 'Pause before eating',
        body: 'This is usually a high-calorie window for you. Try waiting 15 minutes or choose water and protein first.',
        date: createNextOccurrence(hour, ADAPTIVE_NOTICE_MINUTE),
        data: dashboardData,
      });
    }
  }

  const nextPlan: StoredNutritionPlan = {
    planKey,
    createdAt: new Date().toISOString(),
    outcome,
    notificationIds,
  };

  await writeJson(notificationsKey, nextPlan);
  return notificationIds;
};
