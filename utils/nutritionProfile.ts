import AsyncStorage from '@react-native-async-storage/async-storage';
import type { FitFaatNotificationRequest } from '@/contexts/NotificationContext';
import { tokenStorage } from '@/utils/auth/tokenStorage';

const PROFILE_ENTRIES_KEY_PREFIX = 'fitfaat_nutrition_profile_entries';
const PROFILE_NOTIFICATIONS_KEY_PREFIX = 'fitfaat_nutrition_profile_notifications';
const PROFILE_NUDGE_RESPONSES_KEY_PREFIX = 'fitfaat_nutrition_nudge_responses';
const MAX_PROFILE_ENTRIES = 180;
const MAX_NUDGE_RESPONSES = 120;
const UNDER_TARGET_RATIO = 0.95;
const OVER_TARGET_RATIO = 1.05;
const DEFAULT_MEAL_HOURS = [8, 13, 19];
const DEFAULT_WATER_HOURS = [10, 15, 20];
const DAILY_LOG_MINUTE = 0;
const ADAPTIVE_NOTICE_MINUTE = 15;
const LATE_NIGHT_START_HOUR = 21;
const EARLY_MORNING_END_HOUR = 4;

export type NutritionGoalOutcome = 'under' | 'over' | 'onTarget' | 'unknown';
export type NutritionProfileEventType = 'meal' | 'hydration' | 'mixed';
export type NutritionNudgeKind = 'overTargetRisk' | 'underTargetSupport' | 'hydration' | 'routine';

export type NutritionProfileEntry = {
  id?: string;
  dayLogId?: string;
  dayNo?: number;
  dayDate?: string;
  timestamp: string;
  loggedAt?: string;
  recordedAt?: string;
  eventType?: NutritionProfileEventType;
  source?: string;
  mealName?: string;
  nudgeContext?: {
    id?: string;
    kind?: NutritionNudgeKind;
    scheduledForHour?: number;
  };
  calories?: number;
  proteinGrams?: number;
  mealCount?: number;
  waterLiters?: number;
  targetCalories?: number;
  targetCaloriesMin?: number;
  targetCaloriesMax?: number;
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
  calorieGoalDirection?: 'missed' | 'exceeded' | 'onTarget' | 'unknown';
  nutritionGapSeverity?: 'none' | 'low' | 'medium' | 'high' | 'critical';
  hydrationRiskScore?: number;
  recoveryNeedScore?: number;
  goalRiskScore?: number;
  nudgePriority?: 'silent' | 'low' | 'medium' | 'high';
  nudgeReason?: string;
  targetCaloriesMin?: number;
  targetCaloriesMax?: number;
};

export type NutritionNudgeResponse = {
  id: string;
  kind?: NutritionNudgeKind;
  scheduledForHour?: number;
  openedAt: string;
};

export type NutritionBehaviorProfile = {
  peakEatingHours: number[];
  mealHourHistogram: Record<string, number>;
  caloriesByHour: Record<string, number>;
  mealsPerTrackedDay: number;
  weekdayMealAverage: number;
  weekendMealAverage: number;
  mealsByWeekday: Record<string, number>;
  lateNightEatingRate: number;
  skippedMealWindowRate: number;
  mealTimingConsistency: number;
  goalAdherenceTrend: NutritionGoalOutcome | 'mixed' | 'notEnoughData';
  notificationResponseCount: number;
  notificationResponseRate: number;
  averageMealCalories: number;
  proteinVisibilityRate: number;
  hydrationPairingRate: number;
  nextLikelyMealHour: number | null;
  predictedOutcome: NutritionGoalOutcome;
  confidence: number;
};

export type NutritionTimingNudge = {
  kind: NutritionNudgeKind;
  title: string;
  body: string;
  action: 'meal' | 'water' | 'steps' | 'mealPlanner';
  actionLabel: string;
  meta: string;
  remainingCalories?: number;
  showFoodImage?: boolean;
  confidence: number;
};

export type NutritionProfile = {
  entryCount: number;
  mealEntryCount: number;
  waterEntryCount: number;
  regularMealHours: number[];
  highestCalorieHours: number[];
  lowestCalorieHours: number[];
  hydrationHours: number[];
  behavior: NutritionBehaviorProfile;
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

const getNudgeResponsesKey = async () => `${PROFILE_NUDGE_RESPONSES_KEY_PREFIX}:${await getUserStorageSuffix()}`;

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

const getEntryLoggedAt = (entry: NutritionProfileEntry) =>
  entry.loggedAt || entry.timestamp;

const getEntryDate = (entry: NutritionProfileEntry) => {
  const date = new Date(getEntryLoggedAt(entry));
  return Number.isNaN(date.getTime()) ? null : date;
};

const getEntryHour = (entry: NutritionProfileEntry) => {
  const date = getEntryDate(entry);
  if (!date) return null;
  return date.getHours();
};

const getEntryDateKey = (entry: NutritionProfileEntry) => {
  const date = parseProfileDate(entry.dayDate) || getEntryDate(entry);
  return date ? getLocalDateKey(date) : '';
};

const isMealEntry = (entry: NutritionProfileEntry) =>
  entry.eventType === 'meal' ||
  entry.eventType === 'mixed' ||
  toFiniteNumber(entry.calories) > 0 ||
  toFiniteNumber(entry.proteinGrams) > 0 ||
  toFiniteNumber(entry.mealCount) > 0;

const isHydrationEntry = (entry: NutritionProfileEntry) =>
  entry.eventType === 'hydration' ||
  entry.eventType === 'mixed' ||
  toFiniteNumber(entry.waterLiters) > 0;

const getMealEventWeight = (entry: NutritionProfileEntry) =>
  Math.max(1, Math.round(toFiniteNumber(entry.mealCount, 1)));

const getPercent = (value: number) =>
  Math.max(0, Math.min(100, Math.round(value)));

const average = (values: number[]) => {
  const validValues = values.filter((value) => Number.isFinite(value));
  if (!validValues.length) return 0;
  return validValues.reduce((sum, value) => sum + value, 0) / validValues.length;
};

const getMealWindow = (hour: number) => {
  if (hour >= 5 && hour < 11) return 'breakfast';
  if (hour >= 11 && hour < 16) return 'lunch';
  if (hour >= 16 && hour < 22) return 'dinner';
  return 'late';
};

const getClosestHourDistance = (hour: number, targetHours: number[]) => {
  if (!targetHours.length) return 0;
  return Math.min(
    ...targetHours.map((targetHour) => {
      const distance = Math.abs(hour - targetHour);
      return Math.min(distance, 24 - distance);
    })
  );
};

const getStoredNudgeResponses = async () => {
  const key = await getNudgeResponsesKey();
  return readJson<NutritionNudgeResponse[]>(key, []);
};

export const loadNutritionNudgeResponses = async () => getStoredNudgeResponses();

export const recordNutritionNudgeOpen = async (data: {
  nutritionNudgeId?: unknown;
  nutritionNudgeKind?: unknown;
  scheduledForHour?: unknown;
}) => {
  const id = typeof data.nutritionNudgeId === 'string' ? data.nutritionNudgeId : '';
  if (!id) return;

  const key = await getNudgeResponsesKey();
  const responses = await readJson<NutritionNudgeResponse[]>(key, []);
  const kind =
    data.nutritionNudgeKind === 'overTargetRisk' ||
    data.nutritionNudgeKind === 'underTargetSupport' ||
    data.nutritionNudgeKind === 'hydration' ||
    data.nutritionNudgeKind === 'routine'
      ? data.nutritionNudgeKind
      : undefined;
  const rawScheduledForHour = Number(data.scheduledForHour);
  const nextResponse: NutritionNudgeResponse = {
    id,
    kind,
    scheduledForHour: Number.isFinite(rawScheduledForHour) && rawScheduledForHour >= 0
      ? clampHour(rawScheduledForHour)
      : undefined,
    openedAt: new Date().toISOString(),
  };
  const nextResponses = [
    nextResponse,
    ...responses.filter((response) => response.id !== id),
  ].slice(0, MAX_NUDGE_RESPONSES);

  await writeJson(key, nextResponses);
};

const getStoredEntries = async () => {
  const key = await getEntriesKey();
  return readJson<NutritionProfileEntry[]>(key, []);
};

export const loadNutritionProfileEntries = async () => getStoredEntries();

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

export const buildNutritionBehaviorProfileFromEntries = (
  entries: NutritionProfileEntry[],
  nudgeResponses: NutritionNudgeResponse[] = [],
  now: Date = new Date()
): NutritionBehaviorProfile => {
  const mealEntries = entries.filter(isMealEntry);
  const hydrationEntries = entries.filter(isHydrationEntry);
  const mealHourWeights = new Map<number, number>();
  const mealHourHistogram: Record<string, number> = {};
  const caloriesByHour: Record<string, number> = {};
  const mealCalories: number[] = [];
  let proteinVisibleMealEvents = 0;
  const daySummaries = new Map<
    string,
    {
      date: Date;
      mealCount: number;
      caloriesAfter: number;
      targetCalories: number;
      windows: Set<string>;
      hours: number[];
    }
  >();

  for (let hour = 0; hour < 24; hour += 1) {
    mealHourHistogram[String(hour)] = 0;
    caloriesByHour[String(hour)] = 0;
  }

  const hydrationTimes = hydrationEntries
    .map((entry) => getEntryDate(entry))
    .filter((date): date is Date => !!date)
    .map((date) => date.getTime());
  let hydrationPairedMealEvents = 0;

  mealEntries.forEach((entry) => {
    const date = getEntryDate(entry);
    const hour = getEntryHour(entry);
    const dateKey = getEntryDateKey(entry);
    const weight = getMealEventWeight(entry);
    const calories = Math.max(0, toFiniteNumber(entry.calories));

    if (hour !== null) {
      mealHourWeights.set(hour, (mealHourWeights.get(hour) || 0) + weight);
      mealHourHistogram[String(hour)] += weight;
      caloriesByHour[String(hour)] += calories;
      for (let index = 0; index < weight; index += 1) {
        mealCalories.push(calories > 0 ? calories / weight : 0);
      }
    }

    if (toFiniteNumber(entry.proteinGrams) > 0) {
      proteinVisibleMealEvents += weight;
    }

    if (
      date &&
      hydrationTimes.some((hydrationTime) => Math.abs(hydrationTime - date.getTime()) <= 2 * 60 * 60 * 1000)
    ) {
      hydrationPairedMealEvents += weight;
    }

    if (dateKey && date) {
      const current = daySummaries.get(dateKey) || {
        date,
        mealCount: 0,
        caloriesAfter: 0,
        targetCalories: 0,
        windows: new Set<string>(),
        hours: [],
      };
      current.mealCount += weight;
      current.caloriesAfter = Math.max(
        current.caloriesAfter,
        toFiniteNumber(entry.achievedCaloriesAfter)
      );
      current.targetCalories = Math.max(
        current.targetCalories,
        toFiniteNumber(entry.targetCalories)
      );
      if (hour !== null) {
        current.windows.add(getMealWindow(hour));
        current.hours.push(hour);
      }
      daySummaries.set(dateKey, current);
    }
  });

  const weightedHours = Array.from(mealHourWeights.entries())
    .sort((left, right) => right[1] - left[1] || left[0] - right[0])
    .map(([hour]) => hour);
  const peakEatingHours = selectHours(weightedHours, DEFAULT_MEAL_HOURS, 3);
  const dayValues = Array.from(daySummaries.values());
  const mealEventCount = mealEntries.reduce((total, entry) => total + getMealEventWeight(entry), 0);
  const mealsPerTrackedDay = dayValues.length ? mealEventCount / dayValues.length : 0;
  const weekdayTotals: Record<string, { meals: number; days: number }> = {};
  const weekdayLabels = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

  weekdayLabels.forEach((label) => {
    weekdayTotals[label] = { meals: 0, days: 0 };
  });

  dayValues.forEach((day) => {
    const label = weekdayLabels[day.date.getDay()];
    weekdayTotals[label].meals += day.mealCount;
    weekdayTotals[label].days += 1;
  });

  const mealsByWeekday = weekdayLabels.reduce<Record<string, number>>((result, label) => {
    const stats = weekdayTotals[label];
    result[label] = stats.days ? Math.round((stats.meals / stats.days) * 10) / 10 : 0;
    return result;
  }, {});
  const weekdayMealAverage = average(
    ['mon', 'tue', 'wed', 'thu', 'fri'].map((label) => mealsByWeekday[label])
  );
  const weekendMealAverage = average(['sun', 'sat'].map((label) => mealsByWeekday[label]));
  const lateNightMeals = mealEntries.reduce((total, entry) => {
    const hour = getEntryHour(entry);
    if (hour === null) return total;
    return hour >= LATE_NIGHT_START_HOUR || hour < EARLY_MORNING_END_HOUR
      ? total + getMealEventWeight(entry)
      : total;
  }, 0);
  const expectedWindows = Math.max(dayValues.length * 3, 1);
  const loggedWindows = dayValues.reduce(
    (total, day) =>
      total +
      ['breakfast', 'lunch', 'dinner'].filter((window) => day.windows.has(window)).length,
    0
  );
  const hourDistances = mealEntries
    .map((entry) => getEntryHour(entry))
    .filter((hour): hour is number => hour !== null)
    .map((hour) => getClosestHourDistance(hour, peakEatingHours));
  const adherenceRatios = dayValues
    .filter((day) => day.targetCalories > 0 && day.caloriesAfter > 0)
    .map((day) => day.caloriesAfter / day.targetCalories);
  const adherenceCounts = adherenceRatios.reduce(
    (counts, ratio) => {
      if (ratio < UNDER_TARGET_RATIO) counts.under += 1;
      else if (ratio > OVER_TARGET_RATIO) counts.over += 1;
      else counts.onTarget += 1;
      return counts;
    },
    { under: 0, over: 0, onTarget: 0 }
  );
  const goalAdherenceTrend =
    adherenceRatios.length < 2
      ? 'notEnoughData'
      : adherenceCounts.under > adherenceCounts.over &&
          adherenceCounts.under > adherenceCounts.onTarget
        ? 'under'
        : adherenceCounts.over > adherenceCounts.under &&
            adherenceCounts.over > adherenceCounts.onTarget
          ? 'over'
          : adherenceCounts.onTarget >= adherenceCounts.under &&
              adherenceCounts.onTarget >= adherenceCounts.over
            ? 'onTarget'
            : 'mixed';
  const recentResponses = nudgeResponses.filter((response) => {
    const openedAt = new Date(response.openedAt).getTime();
    return Number.isFinite(openedAt) && now.getTime() - openedAt <= 30 * 24 * 60 * 60 * 1000;
  });
  const sortedDayValues = [...dayValues].sort((left, right) => left.date.getTime() - right.date.getTime());
  const latestDay = sortedDayValues[sortedDayValues.length - 1];
  const predictedOutcome: NutritionGoalOutcome =
    latestDay && latestDay.targetCalories > 0
      ? latestDay.caloriesAfter > latestDay.targetCalories * OVER_TARGET_RATIO
        ? 'over'
        : latestDay.caloriesAfter < latestDay.targetCalories * UNDER_TARGET_RATIO
          ? 'under'
          : 'onTarget'
      : 'unknown';
  const currentHour = now.getHours();
  const nextLikelyMealHour =
    peakEatingHours.find((hour) => hour >= currentHour - 1) || peakEatingHours[0] || null;

  return {
    peakEatingHours,
    mealHourHistogram,
    caloriesByHour,
    mealsPerTrackedDay: Math.round(mealsPerTrackedDay * 10) / 10,
    weekdayMealAverage: Math.round(weekdayMealAverage * 10) / 10,
    weekendMealAverage: Math.round(weekendMealAverage * 10) / 10,
    mealsByWeekday,
    lateNightEatingRate: getPercent(mealEventCount ? (lateNightMeals / mealEventCount) * 100 : 0),
    skippedMealWindowRate: getPercent(((expectedWindows - loggedWindows) / expectedWindows) * 100),
    mealTimingConsistency: getPercent(100 - average(hourDistances) * 16),
    goalAdherenceTrend,
    notificationResponseCount: recentResponses.length,
    notificationResponseRate: getPercent(recentResponses.length * 25),
    averageMealCalories: Math.round(average(mealCalories.filter((value) => value > 0))),
    proteinVisibilityRate: getPercent(mealEventCount ? (proteinVisibleMealEvents / mealEventCount) * 100 : 0),
    hydrationPairingRate: getPercent(mealEventCount ? (hydrationPairedMealEvents / mealEventCount) * 100 : 0),
    nextLikelyMealHour,
    predictedOutcome,
    confidence: getPercent(
      Math.min(1, mealEventCount / 14) * 55 +
        Math.min(1, dayValues.length / 7) * 30 +
        (recentResponses.length ? 15 : 0)
    ),
  };
};

export const buildNutritionProfile = async (): Promise<NutritionProfile> => {
  const entries = await getStoredEntries();
  const nudgeResponses = await getStoredNudgeResponses();
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
    mealEntryCount: entries
      .filter(isMealEntry)
      .reduce((total, entry) => total + getMealEventWeight(entry), 0),
    waterEntryCount: entries.filter(isHydrationEntry).length,
    regularMealHours,
    highestCalorieHours,
    lowestCalorieHours,
    hydrationHours,
    behavior: buildNutritionBehaviorProfileFromEntries(entries, nudgeResponses),
  };
};

export const recordNutritionProfileEntry = async (entry: NutritionProfileEntry) => {
  const calories = Math.max(0, toFiniteNumber(entry.calories));
  const waterLiters = Math.max(0, toFiniteNumber(entry.waterLiters));
  const proteinGrams = Math.max(0, toFiniteNumber(entry.proteinGrams));
  const mealCount = Math.max(0, Math.round(toFiniteNumber(entry.mealCount)));

  if (calories <= 0 && waterLiters <= 0 && proteinGrams <= 0) {
    return;
  }

  const key = await getEntriesKey();
  const entries = await readJson<NutritionProfileEntry[]>(key, []);
  const loggedAt = entry.loggedAt || entry.timestamp || new Date().toISOString();
  const timestamp = entry.timestamp || loggedAt;
  const eventType =
    entry.eventType ||
    (calories > 0 && waterLiters > 0
      ? 'mixed'
      : calories > 0 || mealCount > 0 || proteinGrams > 0
        ? 'meal'
        : 'hydration');
  const normalizedEntry: NutritionProfileEntry = {
    ...entry,
    id: entry.id || `${timestamp}:${entry.dayLogId || 'day'}:${entries.length}`,
    timestamp,
    loggedAt,
    recordedAt: entry.recordedAt,
    eventType,
    source: entry.source || 'nutrition-log',
    calories,
    proteinGrams,
    mealCount,
    waterLiters,
    targetCalories: toFiniteNumber(entry.targetCalories),
    targetCaloriesMin: toFiniteNumber(entry.targetCaloriesMin),
    targetCaloriesMax: toFiniteNumber(entry.targetCaloriesMax),
    achievedCaloriesAfter: toFiniteNumber(entry.achievedCaloriesAfter),
    targetHydration: toFiniteNumber(entry.targetHydration),
    achievedHydrationAfter: toFiniteNumber(entry.achievedHydrationAfter),
  };

  const nextEntries = [...entries, normalizedEntry]
    .sort((a, b) => new Date(getEntryLoggedAt(b)).getTime() - new Date(getEntryLoggedAt(a)).getTime())
    .slice(0, MAX_PROFILE_ENTRIES);

  await writeJson(key, nextEntries);
};

const getTargetFloorCalories = (summary: NutritionGoalSummary) =>
  toFiniteNumber(summary.targetCaloriesMin) || toFiniteNumber(summary.targetCalories);

const getTargetCeilingCalories = (summary: NutritionGoalSummary) =>
  toFiniteNumber(summary.targetCaloriesMax) || toFiniteNumber(summary.targetCalories);

const getRemainingCaloriesBeforeTarget = (summary: NutritionGoalSummary) => {
  const ceiling = getTargetCeilingCalories(summary);
  if (ceiling <= 0) return 0;
  return Math.max(0, Math.round(ceiling - toFiniteNumber(summary.achievedCalories)));
};

export const getNutritionGoalOutcome = (summary: NutritionGoalSummary): NutritionGoalOutcome => {
  const targetCalories = toFiniteNumber(summary.targetCalories);
  const targetFloorCalories = getTargetFloorCalories(summary);
  const targetCeilingCalories = getTargetCeilingCalories(summary);
  const achievedCalories = toFiniteNumber(summary.achievedCalories);

  if (targetCalories <= 0) {
    return 'unknown';
  }

  if (achievedCalories < targetFloorCalories * UNDER_TARGET_RATIO) {
    return 'under';
  }

  if (achievedCalories > targetCeilingCalories * OVER_TARGET_RATIO) {
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
    Math.round(toFiniteNumber(summary.targetCaloriesMin)),
    Math.round(toFiniteNumber(summary.targetCaloriesMax)),
    summary.calorieGoalDirection || 'unknown',
    summary.nutritionGapSeverity || 'none',
    summary.nudgePriority || 'silent',
    Math.round(toFiniteNumber(summary.goalRiskScore)),
    summary.nudgeReason || '',
    profile.regularMealHours.join('-'),
    profile.highestCalorieHours.join('-'),
    profile.lowestCalorieHours.join('-'),
    profile.hydrationHours.join('-'),
    profile.behavior.goalAdherenceTrend,
    profile.behavior.lateNightEatingRate,
    profile.behavior.mealTimingConsistency,
    profile.behavior.proteinVisibilityRate,
    profile.behavior.hydrationPairingRate,
    profile.behavior.notificationResponseCount,
  ].join('|');
};

const getProjectedNutritionOutcome = (
  summary: NutritionGoalSummary,
  rawOutcome: NutritionGoalOutcome,
  profile: NutritionProfile,
  now: Date = new Date()
): NutritionGoalOutcome => {
  const targetCalories = toFiniteNumber(summary.targetCalories);
  const targetFloorCalories = getTargetFloorCalories(summary);
  const targetCeilingCalories = getTargetCeilingCalories(summary);
  const achievedCalories = toFiniteNumber(summary.achievedCalories);
  if (targetCalories <= 0) return rawOutcome;
  if (isSummaryBeforeToday(summary)) return rawOutcome;

  const currentHour = now.getHours();
  const averageMealCalories =
    profile.behavior.averageMealCalories ||
    Math.round(targetCalories / Math.max(profile.behavior.mealsPerTrackedDay || 3, 1)) ||
    450;
  const remainingLikelyMeals = profile.regularMealHours.filter((hour) => hour >= currentHour - 1).length;
  const projectedCalories =
    achievedCalories + Math.min(2, remainingLikelyMeals) * Math.max(250, averageMealCalories);

  if (targetCeilingCalories > 0 && achievedCalories >= targetCeilingCalories * OVER_TARGET_RATIO) return 'over';
  if (
    targetCeilingCalories > 0 &&
    projectedCalories >= targetCeilingCalories * 1.08 &&
    achievedCalories >= targetCeilingCalories * 0.65
  ) {
    return 'over';
  }
  if (
    currentHour >= 16 &&
    projectedCalories < targetFloorCalories * 0.85
  ) {
    return 'under';
  }
  if (currentHour >= 20 && achievedCalories < targetFloorCalories * UNDER_TARGET_RATIO) {
    return 'under';
  }

  return rawOutcome === 'under' ? 'onTarget' : rawOutcome;
};

const isOverTargetOutcome = (
  outcome: NutritionGoalOutcome,
  direction?: NutritionGoalSummary['calorieGoalDirection']
) => outcome === 'over' || direction === 'exceeded';

const getBehaviorNoticeCopy = (
  summary: NutritionGoalSummary,
  outcome: NutritionGoalOutcome,
  profile: NutritionProfile
) => {
  const reason = String(summary.nudgeReason || '').toLowerCase();

  if (reason.includes('recovery')) {
    return {
      title: 'Recovery window',
      body: 'Your goals stay fixed. Use this window for water and a recovery-focused meal.',
    };
  }

  if (reason.includes('hydration')) {
    return {
      title: 'Water check-in',
      body: 'Your hydration goal stays steady. A small water log now keeps the routine easier.',
    };
  }

  if (isOverTargetOutcome(outcome, summary.calorieGoalDirection)) {
    const remainingCalories = getRemainingCaloriesBeforeTarget(summary);
    return {
      title: 'Gentle calorie check',
      body: remainingCalories > 0
        ? `You may be close to today's target. Try water, a short walk, or keep the next food under ${remainingCalories} cal.`
        : "You are at today's target. Try water, a short walk, or a pause before adding more food.",
    };
  }

  if (outcome === 'over' || summary.calorieGoalDirection === 'exceeded') {
    return {
      title: 'Gentle calorie check',
      body: 'You may be close to today’s target. Try water, a short walk, or a pause before adding more food.',
    };
  }

  if (outcome === 'under' || summary.calorieGoalDirection === 'missed') {
    const suggestion =
      profile.behavior.mealsPerTrackedDay < 2
        ? 'A simple meal or protein snack can help.'
        : 'A warm balanced meal with protein can help you finish steady.';
    return {
      title: 'Fuel check-in',
      body: `You still have room to nourish your day. ${suggestion}`,
    };
  }

  return {
    title: 'Routine checkpoint',
    body: 'Your ideal goal stays steady. A quick log now helps FitFaat guide your routine.',
  };
};

export const buildNutritionTimingNudge = (
  summary: NutritionGoalSummary,
  profile: NutritionProfile,
  now: Date = new Date()
): NutritionTimingNudge | null => {
  const rawOutcome = getNutritionGoalOutcome(summary);
  const outcome = getProjectedNutritionOutcome(summary, rawOutcome, profile, now);
  const confidence = profile.behavior.confidence;

  if (outcome === 'unknown' || confidence < 20) return null;

  if (outcome === 'over' || summary.calorieGoalDirection === 'exceeded') {
    const remainingCalories = getRemainingCaloriesBeforeTarget(summary);

    return {
      kind: 'overTargetRisk',
      title: "Protect today's target",
      body: remainingCalories > 0
        ? `Your usual eating window is close. Water, a short walk, or keeping food under ${remainingCalories} cal can keep the day steady.`
        : 'Your usual eating window is close and calories are already at target. Try water, a short walk, or a pause before more food.',
      action: 'steps',
      actionLabel: 'Track steps',
      meta: `${confidence}% timing signal`,
      remainingCalories,
      confidence,
    };
  }

  if (outcome === 'under' || summary.calorieGoalDirection === 'missed') {
    return {
      kind: 'underTargetSupport',
      title: 'Food window is open',
      body: profile.behavior.averageMealCalories > 0
        ? `You are likely to finish low today. A meal around ${profile.behavior.averageMealCalories} cal could help.`
        : 'You are likely to finish low today. A warm meal or protein snack can help.',
      action: 'meal',
      actionLabel: 'Add meal',
      meta: `${confidence}% timing signal`,
      showFoodImage: true,
      confidence,
    };
  }

  if (summary.hydrationRiskScore && summary.hydrationRiskScore >= 45) {
    return {
      kind: 'hydration',
      title: 'Pair water with the next meal',
      body: `Your water pairing rate is ${profile.behavior.hydrationPairingRate}%. Add water near the next meal window.`,
      action: 'water',
      actionLabel: 'Add water',
      meta: `${profile.behavior.hydrationPairingRate}% paired`,
      confidence,
    };
  }

  return null;
};

const getNudgeKind = (outcome: NutritionGoalOutcome, reason?: string): NutritionNudgeKind => {
  if (reasonIncludesHydration(reason)) return 'hydration';
  if (outcome === 'over') return 'overTargetRisk';
  if (outcome === 'under') return 'underTargetSupport';
  return 'routine';
};

const createNutritionNudgeData = (
  kind: NutritionNudgeKind,
  scheduledForHour: number,
  route = '/(main)/(dashboard)'
) => ({
  route,
  nutritionNudgeId: `nutrition:${getLocalDateKey(new Date())}:${kind}:${scheduledForHour}:${Date.now()}`,
  nutritionNudgeKind: kind,
  scheduledForHour,
});

const reasonIncludesHydration = (reason?: string) =>
  String(reason || '').toLowerCase().includes('hydration');

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
  return id;
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
  const outcome = getProjectedNutritionOutcome(summary, rawOutcome, profile);
  const notificationsKey = await getNotificationsKey();
  const previousPlan = await readJson<StoredNutritionPlan | null>(notificationsKey, null);
  const planKey = createPlanKey(summary, outcome, profile);

  if (previousPlan?.planKey === planKey) {
    return previousPlan.notificationIds;
  }

  await cancelStoredPlan(previousPlan, cancel);

  const notificationIds: string[] = [];
  const behaviorCopy = getBehaviorNoticeCopy(summary, outcome, profile);

  for (const hour of profile.regularMealHours) {
    await addNotification(notificationIds, schedule, {
      type: 'meal',
      title: 'Meal log ready',
      body: 'Open FitFaat to log food or water in a few taps.',
      daily: { hour, minute: DAILY_LOG_MINUTE },
      data: createNutritionNudgeData('routine', hour),
      sound: false,
      sticky: true,
      autoDismiss: false,
    });
  }

  if (outcome === 'under') {
    const targetHours = selectHours(
      [
        profile.behavior.nextLikelyMealHour ?? -1,
        ...profile.lowestCalorieHours,
        ...profile.regularMealHours,
      ].filter((hour) => hour >= 0),
      DEFAULT_MEAL_HOURS,
      3
    );
    const [hour] = targetHours;

    if (typeof hour === 'number') {
      await addNotification(notificationIds, schedule, {
        type: 'meal',
        title: behaviorCopy.title,
        body: behaviorCopy.body,
        date: createNextOccurrence(hour, ADAPTIVE_NOTICE_MINUTE),
        data: createNutritionNudgeData('underTargetSupport', hour),
      });
    }
  }

  if (outcome === 'over') {
    const [hour] = selectHours(
      [
        profile.behavior.nextLikelyMealHour ?? -1,
        ...profile.highestCalorieHours,
      ].filter((value) => value >= 0),
      DEFAULT_MEAL_HOURS,
      1
    );

    if (typeof hour === 'number') {
      await addNotification(notificationIds, schedule, {
        type: 'meal',
        title: behaviorCopy.title,
        body: behaviorCopy.body,
        date: createNextOccurrence(hour, ADAPTIVE_NOTICE_MINUTE),
        data: createNutritionNudgeData('overTargetRisk', hour),
      });
    }
  }

  if (
    outcome === 'onTarget' &&
    (summary.nudgePriority === 'medium' || summary.nudgePriority === 'high')
  ) {
    const [hour] = selectHours(
      reasonIncludesHydration(summary.nudgeReason) ? profile.hydrationHours : profile.regularMealHours,
      reasonIncludesHydration(summary.nudgeReason) ? DEFAULT_WATER_HOURS : DEFAULT_MEAL_HOURS,
      1
    );
    const kind = getNudgeKind(outcome, summary.nudgeReason);

    await addNotification(notificationIds, schedule, {
      type: reasonIncludesHydration(summary.nudgeReason) ? 'health' : 'meal',
      title: behaviorCopy.title,
      body: behaviorCopy.body,
      date: createNextOccurrence(hour, ADAPTIVE_NOTICE_MINUTE),
      data: createNutritionNudgeData(kind, hour),
    });
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

export const runNutritionBehaviorProfileQaCases = () => {
  const baseDate = '2026-05-25';
  const todayKey = getLocalDateKey(new Date());
  const sampleEntries: NutritionProfileEntry[] = [
    {
      timestamp: `${baseDate}T08:10:00.000Z`,
      calories: 420,
      proteinGrams: 22,
      mealCount: 1,
      targetCalories: 1800,
      achievedCaloriesAfter: 420,
      dayDate: baseDate,
    },
    {
      timestamp: `${baseDate}T13:05:00.000Z`,
      loggedAt: `${baseDate}T13:05:00.000Z`,
      eventType: 'meal',
      calories: 550,
      proteinGrams: 30,
      mealCount: 1,
      targetCalories: 1800,
      achievedCaloriesAfter: 970,
      dayDate: baseDate,
    },
    {
      timestamp: `${baseDate}T22:30:00.000Z`,
      eventType: 'meal',
      calories: 700,
      mealCount: 1,
      targetCalories: 1800,
      achievedCaloriesAfter: 1670,
      dayDate: baseDate,
    },
    {
      timestamp: `2026-05-26T13:10:00.000Z`,
      eventType: 'meal',
      calories: 900,
      mealCount: 2,
      targetCalories: 1800,
      achievedCaloriesAfter: 2050,
      dayDate: '2026-05-26',
    },
    {
      timestamp: `2026-05-26T15:00:00.000Z`,
      eventType: 'hydration',
      waterLiters: 0.5,
      targetHydration: 2.5,
      achievedHydrationAfter: 1.2,
      dayDate: '2026-05-26',
    },
  ];
  const profile = buildNutritionBehaviorProfileFromEntries(
    sampleEntries,
    [
      {
        id: 'nudge-1',
        kind: 'overTargetRisk',
        scheduledForHour: 13,
        openedAt: '2026-05-26T13:12:00.000Z',
      },
    ],
    new Date('2026-05-26T16:00:00.000Z')
  );
  const underProfile = buildNutritionBehaviorProfileFromEntries(
    [
      {
        timestamp: '2026-05-27T08:00:00.000Z',
        eventType: 'meal',
        calories: 250,
        mealCount: 1,
        targetCalories: 1900,
        achievedCaloriesAfter: 250,
        dayDate: '2026-05-27',
      },
      {
        timestamp: '2026-05-28T08:30:00.000Z',
        eventType: 'meal',
        calories: 300,
        mealCount: 1,
        targetCalories: 1900,
        achievedCaloriesAfter: 300,
        dayDate: '2026-05-28',
      },
    ],
    [],
    new Date('2026-05-28T18:00:00.000Z')
  );
  const eatenTimeProfile = buildNutritionBehaviorProfileFromEntries(
    [
      {
        timestamp: `${todayKey}T23:45:00`,
        loggedAt: `${todayKey}T06:15:00`,
        recordedAt: `${todayKey}T23:45:00`,
        eventType: 'meal',
        calories: 360,
        mealCount: 1,
        targetCalories: 1800,
        achievedCaloriesAfter: 360,
        dayDate: todayKey,
      },
    ],
    [],
    new Date(`${todayKey}T09:00:00`)
  );
  const profileForNudge: NutritionProfile = {
    entryCount: sampleEntries.length,
    mealEntryCount: 4,
    waterEntryCount: 1,
    regularMealHours: [18, 20],
    highestCalorieHours: [18, 20],
    lowestCalorieHours: [8],
    hydrationHours: [10, 15],
    behavior: {
      ...profile,
      averageMealCalories: 500,
      confidence: 82,
      nextLikelyMealHour: 18,
    },
  };
  const overTargetNudge = buildNutritionTimingNudge(
    {
      date: todayKey,
      achievedCalories: 1400,
      targetCalories: 1800,
      targetCaloriesMax: 1700,
    },
    profileForNudge,
    new Date(`${todayKey}T16:00:00`)
  );
  const underTargetNudge = buildNutritionTimingNudge(
    {
      date: todayKey,
      achievedCalories: 500,
      targetCalories: 1900,
      targetCaloriesMin: 1850,
    },
    {
      ...profileForNudge,
      regularMealHours: [8],
      behavior: {
        ...profileForNudge.behavior,
        averageMealCalories: 300,
        nextLikelyMealHour: 8,
      },
    },
    new Date(`${todayKey}T18:00:00`)
  );

  return [
    {
      name: 'legacy timestamp entries still count as meals',
      passed: profile.mealsPerTrackedDay >= 2,
      actual: profile.mealsPerTrackedDay,
      expected: '>= 2',
    },
    {
      name: 'peak eating hours include lunch pattern',
      passed: profile.peakEatingHours.includes(13),
      actual: profile.peakEatingHours,
      expected: 'includes 13',
    },
    {
      name: 'late-night eating is detected',
      passed: profile.lateNightEatingRate > 0,
      actual: profile.lateNightEatingRate,
      expected: '> 0',
    },
    {
      name: 'over-target trend is detected',
      passed: profile.predictedOutcome === 'over',
      actual: profile.predictedOutcome,
      expected: 'over',
    },
    {
      name: 'under-target trend is detected',
      passed: underProfile.predictedOutcome === 'under',
      actual: underProfile.predictedOutcome,
      expected: 'under',
    },
    {
      name: 'notification opens contribute response signal',
      passed: profile.notificationResponseCount === 1 && profile.notificationResponseRate > 0,
      actual: {
        count: profile.notificationResponseCount,
        rate: profile.notificationResponseRate,
      },
      expected: { count: 1, rate: '> 0' },
    },
    {
      name: 'selected eaten time affects peak eating hour',
      passed: eatenTimeProfile.peakEatingHours.includes(6),
      actual: eatenTimeProfile.peakEatingHours,
      expected: 'includes 6',
    },
    {
      name: 'save time does not overwrite eaten time',
      passed: !eatenTimeProfile.peakEatingHours.includes(23),
      actual: eatenTimeProfile.peakEatingHours,
      expected: 'does not include saved hour 23',
    },
    {
      name: 'over-target projection produces calorie guardrail',
      passed:
        overTargetNudge?.kind === 'overTargetRisk' &&
        typeof overTargetNudge.remainingCalories === 'number',
      actual: overTargetNudge,
      expected: 'overTargetRisk with remaining calories',
    },
    {
      name: 'under-target projection produces food motivation',
      passed:
        underTargetNudge?.kind === 'underTargetSupport' &&
        underTargetNudge.showFoodImage === true,
      actual: underTargetNudge,
      expected: 'underTargetSupport with food image flag',
    },
  ];
};
