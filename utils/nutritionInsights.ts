import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  loadNutritionProfileEntries,
  type NutritionProfileEntry,
} from './nutritionProfile';

export const NUTRITION_REPORTS_STORAGE_KEY = 'fitfaat_nutrition_reports_v1';
export const WEEKLY_SCORES_STORAGE_KEY = 'fitfaat_weekly_scores_v1';

export type NutritionFocusFactor =
  | 'calories'
  | 'hydration'
  | 'protein'
  | 'mealTiming'
  | 'logging';

export type NutritionInsightAction = 'water' | 'meal' | 'mealPlanner' | 'note';

export type NutritionDayLike = {
  dayNo: number;
  date?: string;
  status?: 'locked' | 'active' | 'finished';
  achievedCalories?: number;
  achieviedHydration?: number;
  achievedHydration?: number;
  targetCalories?: number;
  targetHydration?: number;
  meals?: any[];
  waterIntake?: any[];
  nutritionProfileEntries?: NutritionProfileEntry[];
};

export type DailyNutritionScore = {
  dateKey: string;
  dayNo: number;
  score: number;
  calorieScore: number;
  calorieProgress: number;
  hydrationScore: number;
  proteinScore: number | null;
  proteinStatus: 'tracked' | 'needed';
  mealTimingScore: number;
  loggingScore: number;
  calories: number;
  targetCalories: number;
  hydration: number;
  targetHydration: number;
  proteinGrams: number;
  proteinTargetGrams: number;
  mealCount: number;
  waterCount: number;
  weakestFactor: NutritionFocusFactor;
};

export type WeeklyNutritionReport = {
  schemaVersion: 1;
  updatedAt: string;
  weekKey: string;
  dailyScores: DailyNutritionScore[];
  todayScore: DailyNutritionScore | null;
  weeklyScore: number;
  hydrationScore: number;
  mealTimingScore: number;
  proteinConsistencyScore: number | null;
  proteinDataStatus: 'tracked' | 'needed';
  calorieTrend: 'under' | 'over' | 'steady' | 'improving' | 'notEnoughData';
  calorieTrendLabel: string;
  bestDay: DailyNutritionScore | null;
  weakestDay: DailyNutritionScore | null;
  nextWeekFocus: {
    factor: NutritionFocusFactor;
    title: string;
    body: string;
    action: NutritionInsightAction;
  };
};

type StoredWeeklyScore = {
  weekKey: string;
  updatedAt: string;
  weeklyScore: number;
  hydrationScore: number;
  proteinConsistencyScore: number | null;
};

const clamp = (value: number, min = 0, max = 100) =>
  Math.max(min, Math.min(max, Math.round(value)));

const toNumber = (value: unknown, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeHydrationLiters = (value: unknown) => {
  const hydration = Math.max(0, toNumber(value));
  return hydration > 20 ? hydration / 1000 : hydration;
};

const safeAverage = (values: number[]) => {
  const cleanValues = values.filter((value) => Number.isFinite(value));
  if (!cleanValues.length) return 0;
  return cleanValues.reduce((sum, value) => sum + value, 0) / cleanValues.length;
};

export const getNutritionDateKey = (value?: string | Date | null) => {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return '';

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getWeekKey = (dateKey: string) => {
  const date = dateKey ? new Date(`${dateKey}T12:00:00`) : new Date();
  if (Number.isNaN(date.getTime())) return getNutritionDateKey();

  const start = new Date(date);
  const day = start.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + diffToMonday);
  return getNutritionDateKey(start);
};

const getHydration = (day: NutritionDayLike) =>
  normalizeHydrationLiters(day.achieviedHydration ?? day.achievedHydration);

const getMeals = (day: NutritionDayLike) =>
  Array.isArray(day.meals) ? day.meals : [];

const getWaterEntries = (day: NutritionDayLike) =>
  Array.isArray(day.waterIntake) ? day.waterIntake : [];

const getProfileEntries = (day: NutritionDayLike) =>
  Array.isArray(day.nutritionProfileEntries) ? day.nutritionProfileEntries : [];

const getMealNumber = (meal: any, keys: string[]) => {
  for (const key of keys) {
    const value = key.split('.').reduce((current, part) => current?.[part], meal);
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }

  return 0;
};

const getMealTime = (meal: any, fallbackDate?: string) => {
  const raw =
    meal?.loggedAt ||
    meal?.timestamp ||
    meal?.mealTime ||
    meal?.time ||
    meal?.createdAt ||
    meal?.date ||
    fallbackDate;
  const date = raw ? new Date(raw) : null;
  return date && !Number.isNaN(date.getTime()) ? date : null;
};

const getProteinTarget = (targetCalories: number) => {
  if (targetCalories <= 0) return 80;
  return Math.max(55, Math.min(130, Math.round(targetCalories * 0.05)));
};

const getCalorieScore = (calories: number, targetCalories: number) => {
  if (targetCalories <= 0) return calories > 0 ? 65 : 0;
  const ratio = calories / targetCalories;
  if (ratio <= 0) return 0;
  if (ratio >= 0.85 && ratio <= 1.1) return 100;
  if (ratio < 0.85) return clamp((ratio / 0.85) * 100);
  return clamp(100 - (ratio - 1.1) * 170, 35, 100);
};

const getCalorieProgress = (calories: number, targetCalories: number) => {
  if (targetCalories <= 0) return 0;
  return clamp((calories / targetCalories) * 100);
};

const getHydrationScore = (hydration: number, targetHydration: number) => {
  if (targetHydration <= 0) return hydration > 0 ? 70 : 0;
  return clamp((hydration / targetHydration) * 100);
};

const getProteinScore = (proteinGrams: number, targetProtein: number) => {
  if (proteinGrams <= 0) return null;
  return clamp((proteinGrams / targetProtein) * 100);
};

const getMealTimingScore = (meals: any[], fallbackDate?: string) => {
  if (!meals.length) return 0;

  const mealHours = meals
    .map((meal) => getMealTime(meal, fallbackDate)?.getHours())
    .filter((hour): hour is number => typeof hour === 'number');

  if (!mealHours.length) {
    return clamp(meals.length * 30, 35, 90);
  }

  const buckets = new Set(
    mealHours.map((hour) => {
      if (hour < 11) return 'breakfast';
      if (hour < 16) return 'lunch';
      return 'dinner';
    })
  );

  if (buckets.size >= 3) return 100;
  if (buckets.size === 2) return 78;
  return meals.length >= 2 ? 58 : 42;
};

const getLoggingScore = (mealCount: number, waterCount: number, calories: number, hydration: number) => {
  let score = 0;
  if (mealCount > 0 || calories > 0) score += 45;
  if (waterCount > 0 || hydration > 0) score += 35;
  if (mealCount >= 2) score += 10;
  if (waterCount >= 2 || hydration >= 1) score += 10;
  return clamp(score);
};

const getWeakestFactor = (score: DailyNutritionScore): NutritionFocusFactor => {
  const candidates: Array<[NutritionFocusFactor, number]> = [
    ['calories', score.calorieScore],
    ['hydration', score.hydrationScore],
    ['mealTiming', score.mealTimingScore],
    ['logging', score.loggingScore],
  ];

  if (score.proteinScore !== null) {
    candidates.push(['protein', score.proteinScore]);
  } else if (score.calories > 350 && score.mealCount > 0) {
    candidates.push(['protein', 45]);
  }

  return candidates.sort((a, b) => a[1] - b[1])[0][0];
};

export const buildDailyNutritionScore = (day: NutritionDayLike): DailyNutritionScore => {
  const meals = getMeals(day);
  const waterEntries = getWaterEntries(day);
  const profileEntries = getProfileEntries(day);
  const profileCalories = profileEntries.reduce(
    (sum, entry) => sum + Math.max(0, toNumber(entry.calories)),
    0
  );
  const profileHydration = profileEntries.reduce(
    (sum, entry) => sum + normalizeHydrationLiters(entry.waterLiters),
    0
  );
  const profileAchievedHydration = Math.max(
    0,
    ...profileEntries.map((entry) => normalizeHydrationLiters(entry.achievedHydrationAfter))
  );
  const profileTargetCalories = Math.max(
    0,
    ...profileEntries.map((entry) => toNumber(entry.targetCalories))
  );
  const profileTargetHydration = Math.max(
    0,
    ...profileEntries.map((entry) => normalizeHydrationLiters(entry.targetHydration))
  );
  const profileProteinGrams = profileEntries.reduce(
    (sum, entry) => sum + Math.max(0, toNumber(entry.proteinGrams)),
    0
  );
  const profileMealCount = profileEntries.reduce(
    (sum, entry) => sum + Math.max(0, Math.round(toNumber(entry.mealCount))),
    0
  );
  const profileWaterCount = profileEntries.filter((entry) => toNumber(entry.waterLiters) > 0).length;
  const timingMeals = meals.length
    ? meals
    : profileEntries
        .filter((entry) => toNumber(entry.calories) > 0)
        .map((entry) => ({
          createdAt: entry.timestamp,
          calories: entry.calories,
          proteinGrams: entry.proteinGrams,
        }));
  const calories = Math.max(0, Math.round(Math.max(toNumber(day.achievedCalories), profileCalories)));
  const targetCalories = Math.max(0, Math.round(Math.max(toNumber(day.targetCalories), profileTargetCalories)));
  const hydration = Math.max(0, Math.max(getHydration(day), profileHydration, profileAchievedHydration));
  const targetHydration = Math.max(0, Math.max(normalizeHydrationLiters(day.targetHydration), profileTargetHydration));
  const mealCount = Math.max(meals.length, profileMealCount, profileEntries.filter((entry) => toNumber(entry.calories) > 0).length);
  const waterCount = Math.max(waterEntries.length, profileWaterCount);
  const mealProteinGrams = Math.round(
    meals.reduce((sum, meal) => {
      return sum + getMealNumber(meal, [
        'protein',
        'protein_g',
        'proteinGrams',
        'macros.protein',
        'nutrition.protein',
      ]);
    }, 0)
  );
  const proteinGrams = Math.round(Math.max(mealProteinGrams, profileProteinGrams));
  const proteinTargetGrams = getProteinTarget(targetCalories);
  const proteinScore = getProteinScore(proteinGrams, proteinTargetGrams);
  const calorieScore = getCalorieScore(calories, targetCalories);
  const calorieProgress = getCalorieProgress(calories, targetCalories);
  const hydrationScore = getHydrationScore(hydration, targetHydration);
  const mealTimingScore = getMealTimingScore(timingMeals, day.date);
  const loggingScore = getLoggingScore(mealCount, waterCount, calories, hydration);
  const hasProteinData = proteinScore !== null;
  const weightedParts = hasProteinData
    ? [
        [calorieScore, 0.3],
        [hydrationScore, 0.22],
        [mealTimingScore, 0.18],
        [loggingScore, 0.1],
        [proteinScore, 0.2],
      ]
    : [
        [calorieScore, 0.38],
        [hydrationScore, 0.28],
        [mealTimingScore, 0.2],
        [loggingScore, 0.14],
      ];
  const score = clamp(
    weightedParts.reduce((sum, [value, weight]) => sum + Number(value || 0) * Number(weight), 0)
  );
  const dateKey = getNutritionDateKey(day.date);
  const dailyScore: DailyNutritionScore = {
    dateKey,
    dayNo: day.dayNo,
    score,
    calorieScore,
    calorieProgress,
    hydrationScore,
    proteinScore,
    proteinStatus: hasProteinData ? 'tracked' : 'needed',
    mealTimingScore,
    loggingScore,
    calories,
    targetCalories,
    hydration,
    targetHydration,
    proteinGrams,
    proteinTargetGrams,
    mealCount,
    waterCount,
    weakestFactor: 'logging',
  };

  dailyScore.weakestFactor = getWeakestFactor(dailyScore);
  return dailyScore;
};

const getCalorieTrend = (scores: DailyNutritionScore[]) => {
  const ratios = scores
    .filter((score) => score.targetCalories > 0 && score.calories > 0)
    .map((score) => score.calories / score.targetCalories);

  if (ratios.length < 2) {
    return { trend: 'notEnoughData' as const, label: 'Need more logs' };
  }

  const firstHalf = ratios.slice(0, Math.ceil(ratios.length / 2));
  const secondHalf = ratios.slice(Math.floor(ratios.length / 2));
  const firstAverage = safeAverage(firstHalf);
  const secondAverage = safeAverage(secondHalf);
  const latest = ratios[ratios.length - 1];

  if (latest < 0.85) return { trend: 'under' as const, label: 'Under target' };
  if (latest > 1.1) return { trend: 'over' as const, label: 'Over target' };
  if (Math.abs(secondAverage - firstAverage) > 0.08) {
    return { trend: 'improving' as const, label: secondAverage > firstAverage ? 'Rising' : 'Tightening' };
  }
  return { trend: 'steady' as const, label: 'Steady' };
};

const getFocusCopy = (factor: NutritionFocusFactor) => {
  switch (factor) {
    case 'hydration':
      return {
        title: 'Move water earlier',
        body: 'Your week improves fastest when water starts before lunch. Pair the next meal with one water log.',
        action: 'water' as NutritionInsightAction,
      };
    case 'protein':
      return {
        title: 'Make protein visible',
        body: 'Protein only helps the report when it is visible. Add grams or choose a protein-focused meal next.',
        action: 'meal' as NutritionInsightAction,
      };
    case 'mealTiming':
      return {
        title: 'Spread meals better',
        body: 'Your smoother days come from earlier meal windows. Plan the next two eating times before the day fills up.',
        action: 'mealPlanner' as NutritionInsightAction,
      };
    case 'calories':
      return {
        title: 'Tighten calorie range',
        body: 'Stay closer to target on ordinary days. One honest meal log now is better than a late-day estimate.',
        action: 'meal' as NutritionInsightAction,
      };
    default:
      return {
        title: 'Log small wins daily',
        body: 'A meal log and a water log are enough for a useful score. Start with whichever is easier today.',
        action: 'meal' as NutritionInsightAction,
      };
  }
};

export const buildWeeklyNutritionReport = (days: NutritionDayLike[]): WeeklyNutritionReport => {
  const unlockedDays = days
    .filter((day) => day && day.status !== 'locked')
    .sort((a, b) => {
      const aTime = new Date(a.date || '').getTime();
      const bTime = new Date(b.date || '').getTime();
      if (Number.isFinite(aTime) && Number.isFinite(bTime)) return aTime - bTime;
      return a.dayNo - b.dayNo;
    });
  const dailyScores = unlockedDays.map(buildDailyNutritionScore);
  const todayKey = getNutritionDateKey();
  const todayScore =
    dailyScores.find((score) => {
      const sourceDay = unlockedDays.find((day) => day.dayNo === score.dayNo);
      return sourceDay?.status === 'active' || score.dateKey === todayKey;
    }) ||
    dailyScores[dailyScores.length - 1] ||
    null;
  const bestDay = dailyScores.length
    ? [...dailyScores].sort((a, b) => b.score - a.score)[0]
    : null;
  const weakestDay = dailyScores.length
    ? [...dailyScores].sort((a, b) => a.score - b.score)[0]
    : null;
  const proteinTrackedScores = dailyScores.filter((score) => score.proteinScore !== null);
  const proteinConsistencyScore = proteinTrackedScores.length
    ? clamp(
        (proteinTrackedScores.filter((score) => Number(score.proteinScore || 0) >= 70).length /
          proteinTrackedScores.length) *
          100
      )
    : null;
  const factorCounts = dailyScores.reduce((counts, score) => {
    counts[score.weakestFactor] = (counts[score.weakestFactor] || 0) + 1;
    return counts;
  }, {} as Record<NutritionFocusFactor, number>);
  const focusFactor = (Object.entries(factorCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ||
    weakestDay?.weakestFactor ||
    'logging') as NutritionFocusFactor;
  const focusCopy = getFocusCopy(focusFactor);
  const calorieTrend = getCalorieTrend(dailyScores);

  return {
    schemaVersion: 1,
    updatedAt: new Date().toISOString(),
    weekKey: getWeekKey(dailyScores[0]?.dateKey || todayKey),
    dailyScores,
    todayScore,
    weeklyScore: clamp(safeAverage(dailyScores.map((score) => score.score))),
    hydrationScore: clamp(safeAverage(dailyScores.map((score) => score.hydrationScore))),
    mealTimingScore: clamp(safeAverage(dailyScores.map((score) => score.mealTimingScore))),
    proteinConsistencyScore,
    proteinDataStatus: proteinConsistencyScore === null ? 'needed' : 'tracked',
    calorieTrend: calorieTrend.trend,
    calorieTrendLabel: calorieTrend.label,
    bestDay,
    weakestDay,
    nextWeekFocus: {
      factor: focusFactor,
      ...focusCopy,
    },
  };
};

const getProfileEntryDateKey = (entry: NutritionProfileEntry) =>
  entry.dayDate || entry.timestamp
    ? getNutritionDateKey(entry.dayDate || entry.timestamp)
    : '';

const attachProfileEntriesToDays = (
  days: NutritionDayLike[],
  entries: NutritionProfileEntry[]
): NutritionDayLike[] =>
  days.map((day) => {
    const dayDateKey = getNutritionDateKey(day.date);
    const matchingEntries = entries.filter((entry) => {
      const entryDateKey = getProfileEntryDateKey(entry);
      if (dayDateKey && entryDateKey) return entryDateKey === dayDateKey;
      return !!entry.dayNo && entry.dayNo === day.dayNo;
    });

    if (!matchingEntries.length) return day;

    return {
      ...day,
      nutritionProfileEntries: matchingEntries,
    };
  });

export const buildWeeklyNutritionReportFromStorage = async (
  days: NutritionDayLike[]
): Promise<WeeklyNutritionReport> => {
  const entries = await loadNutritionProfileEntries();
  return buildWeeklyNutritionReport(attachProfileEntriesToDays(days, entries));
};

const readStoredArray = async <T,>(key: string): Promise<T[]> => {
  try {
    const rawValue = await AsyncStorage.getItem(key);
    const parsed = rawValue ? JSON.parse(rawValue) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const saveNutritionReportSnapshot = async (report: WeeklyNutritionReport) => {
  const reports = await readStoredArray<WeeklyNutritionReport>(NUTRITION_REPORTS_STORAGE_KEY);
  const nextReports = [
    report,
    ...reports.filter((item) => item.weekKey !== report.weekKey),
  ].slice(0, 12);

  const weeklyScores = await readStoredArray<StoredWeeklyScore>(WEEKLY_SCORES_STORAGE_KEY);
  const nextWeeklyScores = [
    {
      weekKey: report.weekKey,
      updatedAt: report.updatedAt,
      weeklyScore: report.weeklyScore,
      hydrationScore: report.hydrationScore,
      proteinConsistencyScore: report.proteinConsistencyScore,
    },
    ...weeklyScores.filter((item) => item.weekKey !== report.weekKey),
  ].slice(0, 24);

  await AsyncStorage.multiSet([
    [NUTRITION_REPORTS_STORAGE_KEY, JSON.stringify(nextReports)],
    [WEEKLY_SCORES_STORAGE_KEY, JSON.stringify(nextWeeklyScores)],
  ]);
};
