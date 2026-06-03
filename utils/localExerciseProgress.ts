import AsyncStorage from "@react-native-async-storage/async-storage";
import { type AdaptiveGoalMetrics, loadAdaptiveGoalMetrics } from "@/utils/adaptiveGoals";
import { queueAccountScopedStorageCloudSync } from "@/utils/auth/accountScopedStorageSyncQueue";
import { tokenStorage } from "@/utils/auth/tokenStorage";
import {
  getDashboardUserIdentity,
  getStoredDashboardCache,
  getStoredWeeklyTrackingId,
  setStoredDashboardCache,
} from "@/utils/dashboardStorage";
import { getWalkingCaloriesBurned } from "@/utils/localWalkingProgress";

export const LOCAL_EXERCISE_PROGRESS_KEY = "fitfaat_local_exercise_progress";

type DayLike = {
  _id?: string;
  dayNo?: number;
  date?: string;
  status?: string;
  achievedCalories?: number;
  exerciseCaloriesBurned?: number;
  exerciseDurationSeconds?: number;
  exerciseEntries?: ExerciseProgressEntry[];
};

export type ExerciseProgressEntry = {
  exerciseName: string;
  caloriesBurned: number;
  durationSeconds: number;
  completedAt: string;
};

type ExerciseProgressRecord = {
  dayLogId?: string;
  dayNo?: number;
  dateKey?: string;
  userId?: string | null;
  weeklyTrackingId?: string | null;
  caloriesBurned: number;
  durationSeconds: number;
  entries: ExerciseProgressEntry[];
  updatedAt: string;
};

type ExerciseProgressStore = Record<string, ExerciseProgressRecord>;

type ExerciseProgressScope = {
  userId?: string | null;
  weeklyTrackingId?: string | null;
};

const toNumber = (value: unknown) => {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
};

const roundCalories = (value: unknown) => Math.max(0, Math.round(toNumber(value)));

const normalizeExerciseText = (...values: unknown[]) =>
  values
    .filter((value) => value !== undefined && value !== null)
    .map((value) => String(value).toLowerCase())
    .join(" ");

const resolveExerciseMet = (entry: {
  exerciseName?: string;
  bodyPart?: string;
  target?: string;
  equipment?: string;
}) => {
  const text = normalizeExerciseText(
    entry.exerciseName,
    entry.bodyPart,
    entry.target,
    entry.equipment
  );

  if (!text.trim()) return 5.5;
  if (/jump rope|skipping/.test(text)) return 11.8;
  if (/run|sprint|hiit|burpee|mountain climber/.test(text)) return 8.5;
  if (/cycling|bike|spin/.test(text)) return 7.5;
  if (/swim/.test(text)) return 7;
  if (/row/.test(text)) return 7;
  if (/squat|lunge|deadlift|bench|press|pull.?up|chin.?up|dip/.test(text)) return 6;
  if (/push.?up|plank|crunch|sit.?up|core|abs/.test(text)) return 4.8;
  if (/walk|mobility|stretch|yoga/.test(text)) return 3;
  if (/body weight|bodyweight|calisthenic/.test(text)) return 5.3;

  return 5.5;
};

export const estimateExerciseCalories = (
  entry: {
    exerciseName?: string;
    durationSeconds?: number;
    bodyPart?: string;
    target?: string;
    equipment?: string;
  },
  metrics?: Pick<AdaptiveGoalMetrics, "weight"> | null
) => {
  const durationMinutes = Math.max(0, toNumber(entry.durationSeconds)) / 60;
  if (durationMinutes <= 0) return 0;

  const weightKg = toNumber(metrics?.weight) > 0 ? toNumber(metrics?.weight) : 70;
  const met = resolveExerciseMet(entry);
  const calories = (met * 3.5 * weightKg * durationMinutes) / 200;

  return Math.max(1, roundCalories(calories));
};

const normalizeDateKey = (value?: string | Date | null) => {
  if (!value) return null;

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  const isoMatch = String(value).match(/^(\d{4}-\d{2}-\d{2})/);
  if (isoMatch) return isoMatch[1];

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getTodayDateKey = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getDayKeys = (day?: DayLike | null, fallbackDateKey?: string | null) => {
  const keys: string[] = [];

  if (day?._id) keys.push(`log:${day._id}`);

  const dateKey = normalizeDateKey(day?.date) || fallbackDateKey;
  if (dateKey) keys.push(`date:${dateKey}`);

  if (!keys.length && day?.dayNo) keys.push(`day:${day.dayNo}`);

  return keys;
};

const readProgressStore = async (): Promise<ExerciseProgressStore> => {
  try {
    const raw = await AsyncStorage.getItem(LOCAL_EXERCISE_PROGRESS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (error) {
    console.error("Error reading local exercise progress:", error);
    return {};
  }
};

const saveProgressStore = async (store: ExerciseProgressStore) => {
  await AsyncStorage.setItem(LOCAL_EXERCISE_PROGRESS_KEY, JSON.stringify(store));
  queueAccountScopedStorageCloudSync("exercise-progress");
};

const getExerciseProgressScope = async (): Promise<ExerciseProgressScope> => {
  try {
    const user = await tokenStorage.getUser();
    return {
      userId: getDashboardUserIdentity(user),
      weeklyTrackingId: await getStoredWeeklyTrackingId(user),
    };
  } catch (error) {
    console.log("[ExerciseProgress] Failed to resolve progress scope:", error);
    return {};
  }
};

const recordMatchesScope = (
  record?: Pick<ExerciseProgressRecord, "userId" | "weeklyTrackingId"> | null,
  scope?: ExerciseProgressScope | null
) => {
  if (!scope?.userId && !scope?.weeklyTrackingId) return true;
  if (!record) return false;
  if (scope.userId && record.userId !== scope.userId) return false;
  if (scope.weeklyTrackingId && record.weeklyTrackingId !== scope.weeklyTrackingId) return false;
  return true;
};

const getScopedRecord = (
  store: ExerciseProgressStore,
  key: string,
  scope?: ExerciseProgressScope | null
) => {
  const record = store[key];
  return recordMatchesScope(record, scope) ? record : null;
};

const findRecordForDay = (
  store: ExerciseProgressStore,
  day?: DayLike | null,
  scope?: ExerciseProgressScope | null
) => {
  for (const key of getDayKeys(day)) {
    const record = getScopedRecord(store, key, scope);
    if (record) return record;
  }

  return null;
};

const applyRecordToDay = <T extends DayLike>(day: T, record?: ExerciseProgressRecord | null): T => {
  if (!record) {
    return {
      ...day,
      exerciseCaloriesBurned: getExerciseCaloriesBurned(day),
      exerciseDurationSeconds: getExerciseDurationSeconds(day),
      exerciseEntries: day.exerciseEntries || [],
    };
  }

  return {
    ...day,
    exerciseCaloriesBurned: roundCalories(record.caloriesBurned),
    exerciseDurationSeconds: Math.max(0, Math.round(toNumber(record.durationSeconds))),
    exerciseEntries: record.entries || [],
  };
};

const findActiveDashboardDay = <T extends Record<string, DayLike>>(data?: T | null) => {
  if (!data) return null;

  const entries = Object.entries(data);
  const todayKey = getTodayDateKey();

  return (
    entries.find(([, day]) => day?.status === "active") ||
    entries.find(([, day]) => normalizeDateKey(day?.date) === todayKey) ||
    entries.find(([, day]) => day?.status !== "locked") ||
    null
  );
};

export const getExerciseCaloriesBurned = (day?: any) => {
  const explicitCalories = roundCalories(
    day?.exerciseCaloriesBurned ??
      day?.exerciseCalories ??
      day?.exerciseCaloriesBurnt ??
      day?.caloriesBurnedFromExercise ??
      day?.exerciseBurnedCalories
  );

  if (explicitCalories > 0) return explicitCalories;

  const entryCalories = Array.isArray(day?.exerciseEntries)
    ? day.exerciseEntries.reduce(
        (sum: number, entry: ExerciseProgressEntry) => sum + roundCalories(entry?.caloriesBurned),
        0
      )
    : 0;

  return roundCalories(entryCalories);
};

export const getExerciseDurationSeconds = (day?: any) =>
  Math.max(
    0,
    Math.round(
      toNumber(day?.exerciseDurationSeconds ?? day?.exerciseSeconds ?? day?.exerciseDuration)
    )
  );

export const getNetCalories = (day?: any) =>
  Math.max(
    0,
    roundCalories(day?.achievedCalories) -
      getExerciseCaloriesBurned(day) -
      getWalkingCaloriesBurned(day)
  );

export const mergeExerciseProgressIntoDay = async <T extends DayLike>(day: T): Promise<T> => {
  const [store, scope] = await Promise.all([
    readProgressStore(),
    getExerciseProgressScope(),
  ]);
  return applyRecordToDay(day, findRecordForDay(store, day, scope));
};

export const mergeExerciseProgressIntoJsonResponse = async <T extends Record<string, DayLike>>(
  data: T
): Promise<T> => {
  const [store, scope] = await Promise.all([
    readProgressStore(),
    getExerciseProgressScope(),
  ]);
  const nextData = Object.keys(data).reduce((acc, key) => {
    const day = data[key];
    acc[key as keyof T] = applyRecordToDay(day, findRecordForDay(store, day, scope)) as T[keyof T];
    return acc;
  }, {} as T);

  return nextData;
};

export const recordExerciseProgressForActiveDashboardDay = async (entry: {
  exerciseName: string;
  caloriesBurned?: number;
  durationSeconds: number;
  completedAt?: string;
  bodyPart?: string;
  target?: string;
  equipment?: string;
}) => {
  const completedAt = entry.completedAt || new Date().toISOString();
  let calorieMetrics: AdaptiveGoalMetrics | null = null;
  try {
    calorieMetrics = await loadAdaptiveGoalMetrics();
  } catch (error) {
    console.log("[ExerciseProgress] Failed to load calorie metrics:", error);
  }
  const caloriesBurned =
    roundCalories(entry.caloriesBurned) ||
    estimateExerciseCalories(
      {
        exerciseName: entry.exerciseName,
        durationSeconds: entry.durationSeconds,
        bodyPart: entry.bodyPart,
        target: entry.target,
        equipment: entry.equipment,
      },
      calorieMetrics
    );
  const normalizedEntry: ExerciseProgressEntry = {
    exerciseName: entry.exerciseName,
    caloriesBurned,
    durationSeconds: Math.max(0, Math.round(toNumber(entry.durationSeconds))),
    completedAt,
  };

  let parsedCache: any = null;
  let cachedData: Record<string, DayLike> | null = null;
  try {
    parsedCache = await getStoredDashboardCache<Record<string, DayLike>>();
    cachedData = parsedCache?.data || null;
  } catch (error) {
    console.error("Error reading dashboard cache for exercise progress:", error);
  }
  const activeEntry = findActiveDashboardDay(cachedData);
  const activeKey = activeEntry?.[0];
  const activeDay = activeEntry?.[1] || null;
  const fallbackDateKey = getTodayDateKey();
  const [store, scope] = await Promise.all([
    readProgressStore(),
    getExerciseProgressScope(),
  ]);
  const existingRecord =
    findRecordForDay(store, activeDay, scope) ||
    getScopedRecord(store, `date:${fallbackDateKey}`, scope);
  const nextRecord: ExerciseProgressRecord = {
    dayLogId: activeDay?._id || existingRecord?.dayLogId,
    dayNo: activeDay?.dayNo || existingRecord?.dayNo,
    dateKey: normalizeDateKey(activeDay?.date) || existingRecord?.dateKey || fallbackDateKey,
    userId: scope.userId,
    weeklyTrackingId: scope.weeklyTrackingId,
    caloriesBurned: roundCalories(existingRecord?.caloriesBurned) + normalizedEntry.caloriesBurned,
    durationSeconds:
      Math.max(0, Math.round(toNumber(existingRecord?.durationSeconds))) +
      normalizedEntry.durationSeconds,
    entries: [...(existingRecord?.entries || []), normalizedEntry].slice(-100),
    updatedAt: new Date().toISOString(),
  };

  const nextStore = { ...store };
  const recordKeys = getDayKeys(activeDay, fallbackDateKey);
  const keysToWrite = recordKeys.length ? recordKeys : [`date:${fallbackDateKey}`];
  keysToWrite.forEach((key) => {
    nextStore[key] = nextRecord;
  });

  await saveProgressStore(nextStore);

  if (cachedData && activeKey && activeDay) {
    const nextData = {
      ...cachedData,
      [activeKey]: applyRecordToDay(activeDay, nextRecord),
    };

    await setStoredDashboardCache({ data: nextData, timestamp: new Date() });
  }

  return {
    caloriesBurned: normalizedEntry.caloriesBurned,
    totalCaloriesBurned: nextRecord.caloriesBurned,
    durationSeconds: normalizedEntry.durationSeconds,
    totalDurationSeconds: nextRecord.durationSeconds,
  };
};
