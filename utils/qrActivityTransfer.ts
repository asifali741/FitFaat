import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getCurrentAccountStorageIdentity,
  queueAccountScopedStorageCloudSync,
} from './auth/accountScopedStorage';
import {
  LEGACY_DASHBOARD_CACHE_KEY,
  getScopedDashboardCacheKey,
  getStoredDashboardCache,
  setStoredDashboardCache,
} from './dashboardStorage';
import { LOCAL_EXERCISE_PROGRESS_KEY } from './localExerciseProgress';
import { localSyncEvents } from './localSyncEvents';
import {
  WALKING_PROGRESS_STORAGE_KEY,
  clampStepGoal,
  cleanWalkingSteps,
  estimateWalkingCalories,
  getWalkingProgressScope,
  type WalkingProgressEntry,
  type WalkingProgressScope,
} from './localWalkingProgress';
import {
  HEALTH_METRICS_STORAGE_KEY,
  WEIGHT_TREND_LOGS_STORAGE_KEY,
  type WeightTrendLogEntry,
} from './adaptiveGoals';
import {
  loadEmergencyWhatsAppRecord,
  saveEmergencyWhatsAppNumber,
  type EmergencyWhatsAppRecord,
} from './emergencyWhatsApp';
import {
  FITFAAT_NOTES_STORAGE_KEY,
  loadFitFaatNotes,
  saveFitFaatNotes,
  type FitFaatNote,
} from './localNotes';
import {
  FITFAAT_GROCERY_LISTS_STORAGE_KEY,
  FITFAAT_MEAL_PLANS_STORAGE_KEY,
  addDaysToDateKey,
  getGroceryItemKey,
  getLocalDateKey,
  loadFitFaatGroceryState,
  loadFitFaatMealPlans,
  normalizeGroceryLabel,
  saveFitFaatGroceryState,
  saveFitFaatMealPlans,
  type FitFaatGroceryState,
  type FitFaatManualGroceryItem,
  type FitFaatPlannedMeal,
  type MealPlanType,
} from './localMealPlanner';
import {
  mergeDailyProgressMap,
  normalizeDailyProgressDay,
} from './dailyProgressSync';
import {
  bytesToHex,
  createSaltHex,
  decodeUtf8,
  encodeUtf8,
  hexToBytes,
  sha256,
  xorWithPasscodeStream,
} from './localSyncFile';

const QR_ACTIVITY_KIND = 'fitfaat-qr-activity-sync';
const QR_ACTIVITY_SCHEMA_VERSION = 5;
const QR_ACTIVITY_SCHEMA_VERSION_V4 = 4;
const QR_ACTIVITY_SCHEMA_VERSION_V3 = 3;
const QR_ACTIVITY_SCHEMA_VERSION_V2 = 2;
const QR_ACTIVITY_SCHEMA_VERSION_V1 = 1;
const QR_ACTIVITY_ENCRYPTION = 'fitfaat-account-qr-sha256-stream-v1';
const QR_ACTIVITY_ACCOUNT_HASH_PREFIX = 'fitfaat-qr-account-v1:';
const QR_ACTIVITY_KEY_PREFIX = 'fitfaat-qr-activity-key-v1:';
const QR_ACTIVITY_DAY_LIMIT = 7;
const QR_WEIGHT_LOG_LIMIT = 7;
const QR_NOTE_LIMIT = 6;
const QR_NOTE_TITLE_MAX_CHARS = 60;
const QR_NOTE_BODY_MAX_CHARS = 180;
const QR_NOTE_TOTAL_BODY_MAX_CHARS = 720;
const QR_MEAL_PLAN_WINDOW_DAYS = 10;
const QR_MEAL_PLAN_LIMIT = 18;
const QR_MEAL_PLAN_NAME_MAX_CHARS = 70;
const QR_MEAL_PLAN_NOTES_MAX_CHARS = 90;
const QR_MEAL_PLAN_INGREDIENT_LIMIT = 4;
const QR_MEAL_PLAN_INGREDIENT_MAX_CHARS = 34;
const QR_GROCERY_MANUAL_LIMIT = 12;
const QR_GROCERY_CHECKED_LIMIT = 32;

export const QR_ACTIVITY_ACCOUNT_MISMATCH_MESSAGE = 'This QR Code belongs to another account';
export const QR_ACTIVITY_DIRECT_MAX_CHARS = 2600;

type QrActivitySchemaVersion =
  | typeof QR_ACTIVITY_SCHEMA_VERSION
  | typeof QR_ACTIVITY_SCHEMA_VERSION_V4
  | typeof QR_ACTIVITY_SCHEMA_VERSION_V3
  | typeof QR_ACTIVITY_SCHEMA_VERSION_V2
  | typeof QR_ACTIVITY_SCHEMA_VERSION_V1;

type ExerciseProgressRecord = {
  dayLogId?: string;
  dayNo?: number;
  dateKey?: string;
  userId?: string | null;
  weeklyTrackingId?: string | null;
  caloriesBurned?: number;
  durationSeconds?: number;
  entries?: unknown[];
  updatedAt?: string;
};

type ExerciseProgressStore = Record<string, ExerciseProgressRecord>;

export type QrActivityTransferDay = {
  dateKey: string;
  dayNo?: number;
  calorieIntake?: number;
  hydrationIntake?: number;
  targetCalories?: number;
  targetHydration?: number;
  steps: number;
  walkingCalories: number;
  workoutCalories: number;
  goal: number;
  updatedAt: string;
};

export type QrActivityTransferOptions = {
  dateKey?: string | Date | null;
  dayNo?: number | string | null;
};

type QrActivitySpecificDay = {
  dateKey: string;
  dayNo?: number;
  calorieIntake: number;
  hydrationIntake: number;
  targetCalories?: number;
  targetHydration?: number;
  updatedAt: string;
};

type QrNoteTransfer = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  pinned?: boolean;
};

type QrMealPlanTransfer = {
  id: string;
  dateKey: string;
  type: MealPlanType;
  name: string;
  calories?: number;
  protein?: number;
  carbs?: number;
  fats?: number;
  ingredients: string[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

type QrManualGroceryTransfer = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

type QrGroceryStateTransfer = {
  manualItems: QrManualGroceryTransfer[];
  checkedItemKeys: string[];
  updatedAt: string;
};

type QrMealPlannerTransfer = {
  mealPlans: QrMealPlanTransfer[];
  groceryState: QrGroceryStateTransfer;
};

type QrWeightTransfer = {
  metrics?: Record<string, any> | null;
  logs: WeightTrendLogEntry[];
  latestWeightKg?: number;
  updatedAt: string;
};

type QrActivityEncryptedPayload = {
  schemaVersion: QrActivitySchemaVersion;
  exportedAt: string;
  accountHash: string;
  days: QrActivityTransferDay[];
  specificDay?: QrActivitySpecificDay | null;
  emergencyWhatsApp?: EmergencyWhatsAppRecord | null;
  weight?: QrWeightTransfer | null;
  mealPlanner?: QrMealPlannerTransfer | null;
  notes?: QrNoteTransfer[];
};

type QrActivityEnvelope = {
  kind: typeof QR_ACTIVITY_KIND;
  schemaVersion: QrActivitySchemaVersion;
  app: 'FitFaat';
  exportedAt: string;
  accountHash: string;
  encrypted: true;
  encryption: typeof QR_ACTIVITY_ENCRYPTION;
  salt: string;
  checksum: string;
  data: string;
};

type CompactQrActivityDay = [
  string,
  number,
  number,
  number,
  number,
  string,
  number?,
  number?,
  number?,
  number?,
  number?,
];

type CompactQrNote = [
  string,
  string,
  string,
  string,
  string,
  number?,
];

type CompactQrMealPlan = [
  string,
  string,
  number,
  string,
  number,
  number,
  number,
  number,
  string[],
  string,
  string,
  string,
];

type CompactQrManualGrocery = [
  string,
  string,
  string,
  string,
];

type CompactQrActivityPayload = {
  v: QrActivitySchemaVersion;
  t: string;
  a: string;
  d?: CompactQrActivityDay[];
  s?: [string, number?, number?, number?, number?, number?, string?] | null;
  e?: [string, string] | null;
  w?: [number, string, [string, string, number][]] | null;
  mp?: CompactQrMealPlan[];
  g?: [CompactQrManualGrocery[], string[], string] | null;
  n?: CompactQrNote[];
};

export type QrActivityTransferPreview = {
  exportedAt: string;
  dayCount: number;
  nutritionDayCount: number;
  totalSteps: number;
  totalCalorieIntake: number;
  totalHydrationIntake: number;
  latestCalorieIntake: number;
  latestHydrationIntake: number;
  specificDayDateKey?: string;
  specificDayNo?: number;
  specificDayCalorieIntake: number;
  specificDayHydrationIntake: number;
  hasSpecificDayNutritionData: boolean;
  totalWalkingCalories: number;
  totalWorkoutCalories: number;
  latestDateKey?: string;
  latestNutritionDateKey?: string;
  hasNutritionData: boolean;
  hasEmergencyWhatsApp: boolean;
  hasWeightData: boolean;
  latestWeightKg?: number;
  mealPlanCount: number;
  groceryItemCount: number;
  noteCount: number;
  qrSize: number;
  isQrDense: boolean;
};

export type QrActivityTransferExport = {
  qrValue: string;
  payload: QrActivityEncryptedPayload;
  preview: QrActivityTransferPreview;
};

export type PreparedQrActivityImport = {
  rawValue: string;
  payload: QrActivityEncryptedPayload;
  preview: QrActivityTransferPreview;
};

const toNumber = (value: unknown) => {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
};

const roundCalories = (value: unknown) => Math.max(0, Math.round(toNumber(value)));

const roundHydration = (value: unknown) => {
  const numberValue = toNumber(value);
  return numberValue > 0 ? Math.round(numberValue * 100) / 100 : 0;
};

const sumMealCalories = (meals: unknown) =>
  Array.isArray(meals)
    ? meals.reduce(
        (sum, meal: any) =>
          sum + roundCalories(meal?.calories ?? meal?.kcal ?? meal?.calorie ?? meal?.totalCalories),
        0
      )
    : 0;

const sumWaterIntakeLiters = (waterIntake: unknown) =>
  Array.isArray(waterIntake)
    ? roundHydration(
        waterIntake.reduce(
          (sum, item: any) =>
            sum + toNumber(item?.amount ?? item?.liters ?? item?.litres ?? item?.value ?? item?.hydrationAmount),
          0
        )
      )
    : 0;

const getCalorieIntake = (day: any) =>
  roundCalories(
    day?.calorieIntake ??
      day?.caloriesIntake ??
      day?.achievedCalories ??
      day?.totalCalories
  ) || sumMealCalories(day?.meals);

const getHydrationIntake = (day: any) =>
  roundHydration(
    day?.hydrationIntake ??
      day?.achieviedHydration ??
      day?.achievedHydration ??
      day?.totalHydration
  ) || sumWaterIntakeLiters(day?.waterIntake);

const normalizeDayNo = (value: unknown) => {
  const dayNo = Number(value);
  if (!Number.isFinite(dayNo)) return undefined;

  const roundedDayNo = Math.round(dayNo);
  return roundedDayNo >= 1 && roundedDayNo <= 7 ? roundedDayNo : undefined;
};

const toTime = (value?: string | null) => {
  if (!value) return 0;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeDateKey = (value?: string | Date | null) => {
  if (!value) return '';
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return '';
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  const raw = String(value);
  const isoMatch = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  if (isoMatch) return isoMatch[1];

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return '';
  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const day = String(parsed.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getLatestIso = (...values: (string | undefined | null)[]) => {
  const latest = Math.max(...values.map(toTime), 0);
  return new Date(latest > 0 ? latest : Date.now()).toISOString();
};

const isSupportedQrSchemaVersion = (version: unknown): version is QrActivitySchemaVersion =>
  version === QR_ACTIVITY_SCHEMA_VERSION ||
  version === QR_ACTIVITY_SCHEMA_VERSION_V4 ||
  version === QR_ACTIVITY_SCHEMA_VERSION_V3 ||
  version === QR_ACTIVITY_SCHEMA_VERSION_V2 ||
  version === QR_ACTIVITY_SCHEMA_VERSION_V1;

const getRequiredCurrentAccountIdentity = async () => {
  const identity = await getCurrentAccountStorageIdentity();
  if (!identity) {
    throw new Error('Sign in to your FitFaat account before moving data to a new phone.');
  }
  return identity;
};

const getAccountHash = (identity: string) =>
  bytesToHex(sha256(encodeUtf8(`${QR_ACTIVITY_ACCOUNT_HASH_PREFIX}${identity}`))).slice(0, 32);

const getAccountEncryptionKey = (identity: string) =>
  `${QR_ACTIVITY_KEY_PREFIX}${identity}`;

const parseJsonArray = (rawValue: string | null) => {
  if (!rawValue) return [];
  try {
    const parsed = JSON.parse(rawValue);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const parseExerciseStore = (rawValue: string | null): ExerciseProgressStore => {
  if (!rawValue) return {};
  try {
    const parsed = JSON.parse(rawValue);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
};

const parseJsonObject = (rawValue: string | null) => {
  if (!rawValue) return null;
  try {
    const parsed = JSON.parse(rawValue);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed as Record<string, any>
      : null;
  } catch {
    return null;
  }
};

const normalizeWeightKg = (value: unknown) => {
  const weight = toNumber(value);
  return weight >= 20 && weight <= 350 ? Math.round(weight * 10) / 10 : 0;
};

const parseWeightTrendLogs = (rawValue: string | null): WeightTrendLogEntry[] =>
  parseJsonArray(rawValue)
    .map((entry: any) => {
      const weightKg = normalizeWeightKg(entry?.weightKg ?? entry?.weight);
      const dateKey = normalizeDateKey(entry?.dateKey || entry?.date || entry?.loggedAt);
      if (!weightKg || !dateKey) return null;

      return {
        dateKey,
        loggedAt: String(entry?.loggedAt || entry?.updatedAt || new Date(0).toISOString()),
        weightKg,
        sourceUserId: entry?.sourceUserId ? String(entry.sourceUserId) : undefined,
        sourceWeeklyTrackingId: entry?.sourceWeeklyTrackingId ?? null,
      } as WeightTrendLogEntry;
    })
    .filter(Boolean) as WeightTrendLogEntry[];

const getHealthMetricsUpdatedAt = (metrics?: Record<string, any> | null) =>
  metrics
    ? toTime(
        metrics.updatedAt ||
          metrics.metricsUpdatedAt ||
          metrics.weightUpdatedAt ||
          metrics.currentWeightUpdatedAt
      )
    : 0;

const getWeightTransferUpdatedAt = (
  metrics?: Record<string, any> | null,
  logs: WeightTrendLogEntry[] = []
) => {
  const latestLogTime = Math.max(...logs.map((log) => toTime(log.loggedAt)), 0);
  const latest = Math.max(getHealthMetricsUpdatedAt(metrics), latestLogTime, 0);
  return new Date(latest > 0 ? latest : Date.now()).toISOString();
};

const buildWeightTransfer = (
  rawHealthMetrics: string | null,
  rawWeightLogs: string | null,
  scope?: WalkingProgressScope | null
): QrWeightTransfer | null => {
  const metrics = parseJsonObject(rawHealthMetrics);
  const metricsWeightKg = normalizeWeightKg(metrics?.weight ?? metrics?.currentWeight ?? metrics?.weightKg);
  const metricsUpdatedAt = getHealthMetricsUpdatedAt(metrics);
  const logs = parseWeightTrendLogs(rawWeightLogs)
    .filter((log) => !scope?.userId || !log.sourceUserId || log.sourceUserId === scope.userId)
    .sort((a, b) => b.dateKey.localeCompare(a.dateKey))
    .slice(0, QR_WEIGHT_LOG_LIMIT);
  const latestLog = logs.reduce<WeightTrendLogEntry | null>((latest, log) => {
    if (!latest) return log;
    return toTime(log.loggedAt) > toTime(latest.loggedAt) ? log : latest;
  }, null);
  const latestWeightKg =
    latestLog && toTime(latestLog.loggedAt) > metricsUpdatedAt
      ? latestLog.weightKg
      : metricsWeightKg || latestLog?.weightKg;

  if (!latestWeightKg && !logs.length) return null;
  const updatedAt = getWeightTransferUpdatedAt(metrics, logs);

  return {
    metrics: latestWeightKg
      ? {
          weight: latestWeightKg,
          currentWeight: latestWeightKg,
          updatedAt,
        }
      : null,
    logs,
    latestWeightKg: latestWeightKg || logs[0]?.weightKg,
    updatedAt,
  };
};

const roundTemplateNumber = (value: unknown) =>
  Math.max(0, Math.round(toNumber(value) * 10) / 10);

const normalizeIsoString = (value: unknown, fallback?: string) => {
  const valueTime = toTime(typeof value === 'string' || typeof value === 'number' ? String(value) : null);
  const fallbackTime = toTime(fallback);
  return new Date(valueTime > 0 ? valueTime : fallbackTime > 0 ? fallbackTime : Date.now()).toISOString();
};

const clampInlineText = (value: unknown, maxLength: number) =>
  String(value || '').trim().replace(/\s+/g, ' ').slice(0, maxLength);

const clampNoteBodyText = (value: unknown, maxLength: number) =>
  String(value || '').trim().slice(0, maxLength);

const QR_MEAL_PLAN_TYPES: MealPlanType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

const normalizeMealPlanType = (value: unknown): MealPlanType => {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'lunch') return 'lunch';
  if (normalized === 'dinner') return 'dinner';
  if (normalized === 'snack' || normalized === 'snacks') return 'snack';
  return 'breakfast';
};

const mealPlanTypeToIndex = (type: MealPlanType) =>
  Math.max(0, QR_MEAL_PLAN_TYPES.indexOf(type));

const mealPlanTypeFromIndex = (value: unknown) =>
  QR_MEAL_PLAN_TYPES[Math.max(0, Math.min(QR_MEAL_PLAN_TYPES.length - 1, Math.round(toNumber(value))))] || 'breakfast';

const getMealPlanMergeKey = (meal: Pick<QrMealPlanTransfer, 'dateKey' | 'type' | 'name'>) =>
  `${meal.dateKey}:${meal.type}:${meal.name.trim().toLowerCase()}`;

const getMealPlanId = (meal: any, dateKey: string, type: MealPlanType, name: string, createdAt: string) =>
  String(
    meal?.id ||
      `meal-plan-${dateKey}-${type}-${bytesToHex(sha256(encodeUtf8(`${createdAt}:${name}`))).slice(0, 10)}`
  ).slice(0, 96);

const normalizeMealPlanNumber = (value: unknown) => {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) && numberValue > 0
    ? Math.round(numberValue * 10) / 10
    : undefined;
};

const normalizeMealPlanIngredients = (value: unknown) =>
  (Array.isArray(value) ? value : [])
    .map((ingredient) => clampInlineText(normalizeGroceryLabel(String(ingredient || '')), QR_MEAL_PLAN_INGREDIENT_MAX_CHARS))
    .filter(Boolean)
    .slice(0, QR_MEAL_PLAN_INGREDIENT_LIMIT);

const normalizeQrMealPlan = (
  meal: any,
  fallbackCreatedAt?: string
): QrMealPlanTransfer | null => {
  const dateKey = normalizeDateKey(meal?.dateKey || meal?.date);
  const type = normalizeMealPlanType(meal?.type);
  const name = clampInlineText(normalizeGroceryLabel(String(meal?.name || '')), QR_MEAL_PLAN_NAME_MAX_CHARS);
  if (!dateKey || !name) return null;

  const createdAt = normalizeIsoString(meal?.createdAt, fallbackCreatedAt);
  const updatedAt = normalizeIsoString(meal?.updatedAt, createdAt);
  const notes = clampNoteBodyText(meal?.notes, QR_MEAL_PLAN_NOTES_MAX_CHARS);

  return {
    id: getMealPlanId(meal, dateKey, type, name, createdAt),
    dateKey,
    type,
    name,
    calories: normalizeMealPlanNumber(meal?.calories),
    protein: normalizeMealPlanNumber(meal?.protein),
    carbs: normalizeMealPlanNumber(meal?.carbs),
    fats: normalizeMealPlanNumber(meal?.fats),
    ingredients: normalizeMealPlanIngredients(meal?.ingredients),
    notes: notes || undefined,
    createdAt,
    updatedAt,
  };
};

const normalizeQrManualGroceryItem = (
  item: any,
  fallbackCreatedAt?: string
): QrManualGroceryTransfer | null => {
  const name = clampInlineText(normalizeGroceryLabel(String(item?.name || '')), QR_MEAL_PLAN_INGREDIENT_MAX_CHARS);
  if (!name) return null;

  const createdAt = normalizeIsoString(item?.createdAt, fallbackCreatedAt);
  const updatedAt = normalizeIsoString(item?.updatedAt, createdAt);

  return {
    id: String(item?.id || `grocery-${bytesToHex(sha256(encodeUtf8(`${createdAt}:${name}`))).slice(0, 10)}`).slice(0, 96),
    name,
    createdAt,
    updatedAt,
  };
};

const getGeneratedGroceryKeys = (mealPlans: QrMealPlanTransfer[]) =>
  new Set(
    mealPlans.flatMap((meal) =>
      meal.ingredients.map((ingredient) => getGroceryItemKey(ingredient))
    ).filter(Boolean)
  );

const getMealPlannerGroceryItemCount = (mealPlanner?: QrMealPlannerTransfer | null) => {
  if (!mealPlanner) return 0;
  const generatedKeys = getGeneratedGroceryKeys(mealPlanner.mealPlans || []);
  const manualKeys = new Set((mealPlanner.groceryState?.manualItems || []).map((item) => `manual:${item.id}`));
  return generatedKeys.size + manualKeys.size;
};

const readMealPlannerTransfer = async (fallbackCreatedAt: string): Promise<QrMealPlannerTransfer | null> => {
  const [storedMeals, groceryState] = await Promise.all([
    loadFitFaatMealPlans(),
    loadFitFaatGroceryState(),
  ]);
  const startDateKey = getLocalDateKey();
  const endDateKey = addDaysToDateKey(startDateKey, QR_MEAL_PLAN_WINDOW_DAYS - 1);
  const mealPlans = storedMeals
    .map((meal) => normalizeQrMealPlan(meal, fallbackCreatedAt))
    .filter((meal): meal is QrMealPlanTransfer => Boolean(meal))
    .filter((meal) => meal.dateKey >= startDateKey && meal.dateKey <= endDateKey)
    .sort((left, right) => {
      if (left.dateKey !== right.dateKey) return left.dateKey.localeCompare(right.dateKey);
      if (left.type !== right.type) return mealPlanTypeToIndex(left.type) - mealPlanTypeToIndex(right.type);
      return toTime(right.updatedAt) - toTime(left.updatedAt);
    })
    .slice(0, QR_MEAL_PLAN_LIMIT);
  const manualItems = (groceryState.manualItems || [])
    .map((item) => normalizeQrManualGroceryItem(item, fallbackCreatedAt))
    .filter((item): item is QrManualGroceryTransfer => Boolean(item))
    .sort((left, right) => toTime(right.updatedAt) - toTime(left.updatedAt))
    .slice(0, QR_GROCERY_MANUAL_LIMIT);
  const transferableKeys = getGeneratedGroceryKeys(mealPlans);
  manualItems.forEach((item) => transferableKeys.add(`manual:${item.id}`));
  const checkedItemKeys = Object.entries(groceryState.checkedItemKeys || {})
    .filter(([key, checked]) => Boolean(checked) && transferableKeys.has(key))
    .map(([key]) => key)
    .slice(0, QR_GROCERY_CHECKED_LIMIT);

  if (!mealPlans.length && !manualItems.length && !checkedItemKeys.length) {
    return null;
  }

  return {
    mealPlans,
    groceryState: {
      manualItems,
      checkedItemKeys,
      updatedAt: normalizeIsoString(groceryState.updatedAt, fallbackCreatedAt),
    },
  };
};

const normalizeQrMealPlanner = (
  mealPlanner: any,
  fallbackCreatedAt?: string
): QrMealPlannerTransfer | null => {
  if (!mealPlanner || typeof mealPlanner !== 'object' || Array.isArray(mealPlanner)) return null;

  const mealPlans: QrMealPlanTransfer[] = Array.isArray(mealPlanner.mealPlans)
    ? mealPlanner.mealPlans
        .map((meal: any) => normalizeQrMealPlan(meal, fallbackCreatedAt))
        .filter((meal: QrMealPlanTransfer | null): meal is QrMealPlanTransfer => Boolean(meal))
        .slice(0, QR_MEAL_PLAN_LIMIT)
    : [];
  const groceryState = mealPlanner.groceryState && typeof mealPlanner.groceryState === 'object'
    ? mealPlanner.groceryState
    : {};
  const manualItems: QrManualGroceryTransfer[] = Array.isArray(groceryState.manualItems)
    ? groceryState.manualItems
        .map((item: any) => normalizeQrManualGroceryItem(item, fallbackCreatedAt))
        .filter((item: QrManualGroceryTransfer | null): item is QrManualGroceryTransfer => Boolean(item))
        .slice(0, QR_GROCERY_MANUAL_LIMIT)
    : [];
  const transferableKeys = getGeneratedGroceryKeys(mealPlans);
  manualItems.forEach((item) => transferableKeys.add(`manual:${item.id}`));
  const checkedItemKeys = Array.isArray(groceryState.checkedItemKeys)
    ? groceryState.checkedItemKeys
        .map((key: unknown) => String(key || '').trim())
        .filter((key: string) => key && transferableKeys.has(key))
        .slice(0, QR_GROCERY_CHECKED_LIMIT)
    : [];

  if (!mealPlans.length && !manualItems.length && !checkedItemKeys.length) {
    return null;
  }

  return {
    mealPlans,
    groceryState: {
      manualItems,
      checkedItemKeys,
      updatedAt: normalizeIsoString(groceryState.updatedAt, fallbackCreatedAt),
    },
  };
};

const mergeMealPlansIntoStorage = async (
  incomingMealPlans: QrMealPlanTransfer[],
  fallbackCreatedAt: string
) => {
  if (!incomingMealPlans.length) {
    return { changedMealPlanCount: 0, storageKey: FITFAAT_MEAL_PLANS_STORAGE_KEY };
  }

  const nextMealPlans = await loadFitFaatMealPlans();
  let changedMealPlanCount = 0;

  incomingMealPlans
    .map((meal) => normalizeQrMealPlan(meal, fallbackCreatedAt))
    .filter((meal): meal is QrMealPlanTransfer => Boolean(meal))
    .forEach((incoming) => {
      const incomingKey = getMealPlanMergeKey(incoming);
      const existingIndex = nextMealPlans.findIndex((meal) => {
        const normalizedMeal = normalizeQrMealPlan(meal, fallbackCreatedAt);
        return Boolean(
          normalizedMeal &&
          (normalizedMeal.id === incoming.id || getMealPlanMergeKey(normalizedMeal) === incomingKey)
        );
      });

      if (existingIndex < 0) {
        nextMealPlans.push(incoming as FitFaatPlannedMeal);
        changedMealPlanCount += 1;
        return;
      }

      const existing = normalizeQrMealPlan(nextMealPlans[existingIndex], fallbackCreatedAt);
      if (existing && toTime(incoming.updatedAt) > toTime(existing.updatedAt)) {
        nextMealPlans[existingIndex] = incoming as FitFaatPlannedMeal;
        changedMealPlanCount += 1;
      }
    });

  if (changedMealPlanCount > 0) {
    await saveFitFaatMealPlans(nextMealPlans);
  }

  return { changedMealPlanCount, storageKey: FITFAAT_MEAL_PLANS_STORAGE_KEY };
};

const mergeGroceryStateIntoStorage = async (
  incomingGroceryState: QrGroceryStateTransfer | null | undefined,
  fallbackCreatedAt: string
) => {
  const normalizedIncoming = incomingGroceryState
    ? {
        manualItems: Array.isArray(incomingGroceryState.manualItems)
          ? incomingGroceryState.manualItems
              .map((item) => normalizeQrManualGroceryItem(item, fallbackCreatedAt))
              .filter((item): item is QrManualGroceryTransfer => Boolean(item))
              .slice(0, QR_GROCERY_MANUAL_LIMIT)
          : [],
        checkedItemKeys: Array.isArray(incomingGroceryState.checkedItemKeys)
          ? incomingGroceryState.checkedItemKeys
              .map((key) => String(key || '').trim())
              .filter(Boolean)
              .slice(0, QR_GROCERY_CHECKED_LIMIT)
          : [],
        updatedAt: normalizeIsoString(incomingGroceryState.updatedAt, fallbackCreatedAt),
      }
    : null;

  if (
    !normalizedIncoming ||
    (!normalizedIncoming.manualItems.length && !normalizedIncoming.checkedItemKeys.length)
  ) {
    return { changedGroceryItemCount: 0, storageKey: FITFAAT_GROCERY_LISTS_STORAGE_KEY };
  }

  const currentState = await loadFitFaatGroceryState();
  const nextManualItems = [...currentState.manualItems];
  const checkedItemKeys: FitFaatGroceryState['checkedItemKeys'] = {
    ...(currentState.checkedItemKeys || {}),
  };
  let changedGroceryItemCount = 0;

  normalizedIncoming.manualItems.forEach((incoming) => {
    const normalizedName = incoming.name.trim().toLowerCase();
    const existingIndex = nextManualItems.findIndex((item) =>
      item.id === incoming.id || item.name.trim().toLowerCase() === normalizedName
    );

    if (existingIndex < 0) {
      nextManualItems.push(incoming as FitFaatManualGroceryItem);
      changedGroceryItemCount += 1;
      return;
    }

    const existing = nextManualItems[existingIndex];
    if (toTime(incoming.updatedAt) > toTime(existing.updatedAt)) {
      nextManualItems[existingIndex] = incoming as FitFaatManualGroceryItem;
      changedGroceryItemCount += 1;
    }
  });

  normalizedIncoming.checkedItemKeys.forEach((key) => {
    if (!checkedItemKeys[key]) {
      checkedItemKeys[key] = true;
      changedGroceryItemCount += 1;
    }
  });

  if (changedGroceryItemCount > 0) {
    await saveFitFaatGroceryState({
      checkedItemKeys,
      manualItems: nextManualItems,
      updatedAt: getLatestIso(currentState.updatedAt, normalizedIncoming.updatedAt, fallbackCreatedAt),
    });
  }

  return { changedGroceryItemCount, storageKey: FITFAAT_GROCERY_LISTS_STORAGE_KEY };
};

const getQrNoteId = (note: any, title: string, body: string, createdAt: string) =>
  String(
    note?.id ||
      `note-${createdAt}-${bytesToHex(sha256(encodeUtf8(`${title}:${body}`))).slice(0, 10)}`
  ).slice(0, 96);

const normalizeQrNote = (
  note: any,
  fallbackCreatedAt?: string
): QrNoteTransfer | null => {
  const rawBody = typeof note?.body === 'string' ? note.body : '';
  const rawTitle = typeof note?.title === 'string' ? note.title : '';
  const body = clampNoteBodyText(rawBody, QR_NOTE_BODY_MAX_CHARS);
  const title = clampInlineText(rawTitle || body || 'Untitled Note', QR_NOTE_TITLE_MAX_CHARS);
  if (!title && !body) return null;

  const createdAt = normalizeIsoString(note?.createdAt, fallbackCreatedAt);
  const updatedAt = normalizeIsoString(note?.updatedAt, createdAt);

  return {
    id: getQrNoteId(note, title, body, createdAt),
    title,
    body,
    createdAt,
    updatedAt,
    pinned: Boolean(note?.pinned),
  };
};

const readNotesTransfer = async (fallbackCreatedAt: string) => {
  const notes = await loadFitFaatNotes();
  const compactNotes: QrNoteTransfer[] = [];
  let remainingBodyChars = QR_NOTE_TOTAL_BODY_MAX_CHARS;

  for (const note of notes) {
    const normalizedNote = normalizeQrNote(note, fallbackCreatedAt);
    if (!normalizedNote) continue;

    const body = normalizedNote.body.slice(0, Math.max(0, remainingBodyChars));
    compactNotes.push({ ...normalizedNote, body });
    remainingBodyChars -= body.length;

    if (compactNotes.length >= QR_NOTE_LIMIT || remainingBodyChars <= 0) {
      break;
    }
  }

  return compactNotes;
};

const getNoteContentKey = (note: Pick<QrNoteTransfer, 'title' | 'body'>) =>
  `${note.title.trim().toLowerCase()}:${note.body.trim().toLowerCase()}`;

const mergeNotesIntoStorage = async (
  incomingNotes: QrNoteTransfer[],
  fallbackCreatedAt: string
) => {
  if (!incomingNotes.length) {
    return { changedNoteCount: 0, storageKey: FITFAAT_NOTES_STORAGE_KEY };
  }

  const currentNotes = await loadFitFaatNotes();
  const nextNotes: FitFaatNote[] = [...currentNotes];
  let changedNoteCount = 0;

  incomingNotes
    .map((note) => normalizeQrNote(note, fallbackCreatedAt))
    .filter((note): note is QrNoteTransfer => Boolean(note))
    .forEach((incoming) => {
      const existingIndex = nextNotes.findIndex((note) =>
        note.id === incoming.id || getNoteContentKey(note) === getNoteContentKey(incoming)
      );

      if (existingIndex < 0) {
        nextNotes.push(incoming);
        changedNoteCount += 1;
        return;
      }

      const existing = nextNotes[existingIndex];
      if (toTime(incoming.updatedAt) > toTime(existing.updatedAt)) {
        nextNotes[existingIndex] = incoming;
        changedNoteCount += 1;
      }
    });

  if (changedNoteCount > 0) {
    await saveFitFaatNotes(nextNotes);
  }

  return { changedNoteCount, storageKey: FITFAAT_NOTES_STORAGE_KEY };
};

const matchesCurrentScope = (
  item?: { userId?: string | null; weeklyTrackingId?: string | null } | null,
  scope?: WalkingProgressScope | null
) => {
  if (!item || (!scope?.userId && !scope?.weeklyTrackingId)) return true;
  if (scope.userId && item.userId && item.userId !== scope.userId) return false;
  if (scope.weeklyTrackingId && item.weeklyTrackingId && item.weeklyTrackingId !== scope.weeklyTrackingId) {
    return false;
  }
  return true;
};

const parseWalkingEntry = (item: any): WalkingProgressEntry | null => {
  const dateKey = normalizeDateKey(item?.dateKey || item?.date);
  if (!dateKey) return null;

  const steps = cleanWalkingSteps(item?.steps);
  const calories = roundCalories(item?.calories || estimateWalkingCalories(steps));
  return {
    dateKey,
    steps,
    calories,
    goal: clampStepGoal(Number(item?.goal || item?.stepGoal || 10000)),
    updatedAt: String(item?.updatedAt || new Date(0).toISOString()),
    userId: item?.userId ? String(item.userId) : null,
    weeklyTrackingId: item?.weeklyTrackingId ? String(item.weeklyTrackingId) : null,
  };
};

const getRecordDateKey = (key: string, record?: ExerciseProgressRecord | null) =>
  normalizeDateKey(record?.dateKey) || normalizeDateKey(key.startsWith('date:') ? key.slice(5) : '');

const hasTransferDayData = (day: QrActivityTransferDay) =>
  cleanWalkingSteps(day.steps) > 0 ||
  roundCalories(day.walkingCalories) > 0 ||
  roundCalories(day.workoutCalories) > 0 ||
  roundCalories(day.calorieIntake) > 0 ||
  roundHydration(day.hydrationIntake) > 0;

const matchesQrTransferSelection = (
  day: QrActivityTransferDay,
  options: QrActivityTransferOptions = {}
) => {
  const selectedDateKey = normalizeDateKey(options.dateKey);
  const selectedDayNo = normalizeDayNo(options.dayNo);

  if (selectedDateKey && day.dateKey === selectedDateKey) return true;
  if (selectedDayNo && normalizeDayNo(day.dayNo) === selectedDayNo) return true;
  return false;
};

const hasQrTransferSelection = (options: QrActivityTransferOptions = {}) =>
  Boolean(normalizeDateKey(options.dateKey) || normalizeDayNo(options.dayNo));

const buildSpecificDayMeta = (
  day?: QrActivityTransferDay | null,
  fallbackUpdatedAt = new Date(0).toISOString()
): QrActivitySpecificDay | null => {
  if (!day?.dateKey) return null;

  return {
    dateKey: day.dateKey,
    dayNo: normalizeDayNo(day.dayNo),
    calorieIntake: roundCalories(day.calorieIntake),
    hydrationIntake: roundHydration(day.hydrationIntake),
    targetCalories: roundCalories(day.targetCalories),
    targetHydration: roundHydration(day.targetHydration),
    updatedAt: String(day.updatedAt || fallbackUpdatedAt),
  };
};

const findSpecificPayloadDay = (
  days: QrActivityTransferDay[],
  specificDay?: Partial<QrActivitySpecificDay> | null
) => {
  const specificDateKey = normalizeDateKey(specificDay?.dateKey);
  const specificDayNo = normalizeDayNo(specificDay?.dayNo);

  return (
    days.find((day) => specificDateKey && day.dateKey === specificDateKey) ||
    days.find((day) => specificDayNo && normalizeDayNo(day.dayNo) === specificDayNo) ||
    null
  );
};

const chooseTargetCalories = (
  current: QrActivityTransferDay,
  incoming: QrActivityTransferDay,
  useIncoming: boolean
) => {
  const currentTarget = roundCalories(current.targetCalories);
  const incomingTarget = roundCalories(incoming.targetCalories);
  if (useIncoming && incomingTarget > 0) return incomingTarget;
  return currentTarget || incomingTarget;
};

const chooseTargetHydration = (
  current: QrActivityTransferDay,
  incoming: QrActivityTransferDay,
  useIncoming: boolean
) => {
  const currentTarget = roundHydration(current.targetHydration);
  const incomingTarget = roundHydration(incoming.targetHydration);
  if (useIncoming && incomingTarget > 0) return incomingTarget;
  return currentTarget || incomingTarget;
};

const chooseActivityDay = (
  current: QrActivityTransferDay | undefined,
  incoming: QrActivityTransferDay
) => {
  if (!current) return incoming;

  const incomingTime = toTime(incoming.updatedAt);
  const currentTime = toTime(current.updatedAt);
  const useIncoming =
    incomingTime > currentTime ||
    incoming.steps > current.steps ||
    incoming.walkingCalories > current.walkingCalories ||
    incoming.workoutCalories > current.workoutCalories ||
    roundCalories(incoming.calorieIntake) > roundCalories(current.calorieIntake) ||
    roundHydration(incoming.hydrationIntake) > roundHydration(current.hydrationIntake);

  if (!useIncoming) return current;

  return {
    dateKey: incoming.dateKey,
    dayNo: incoming.dayNo || current.dayNo,
    calorieIntake: Math.max(roundCalories(current.calorieIntake), roundCalories(incoming.calorieIntake)),
    hydrationIntake: Math.max(roundHydration(current.hydrationIntake), roundHydration(incoming.hydrationIntake)),
    targetCalories: chooseTargetCalories(current, incoming, useIncoming),
    targetHydration: chooseTargetHydration(current, incoming, useIncoming),
    steps: Math.max(current.steps, incoming.steps),
    walkingCalories: Math.max(current.walkingCalories, incoming.walkingCalories),
    workoutCalories: Math.max(current.workoutCalories, incoming.workoutCalories),
    goal: incoming.goal || current.goal,
    updatedAt: getLatestIso(current.updatedAt, incoming.updatedAt),
  };
};

const chooseLatestWeightLog = (
  incoming: WeightTrendLogEntry,
  existing?: WeightTrendLogEntry | null
) => {
  if (!existing) return incoming;
  if (toTime(incoming.loggedAt) > toTime(existing.loggedAt)) return incoming;
  if (toTime(incoming.loggedAt) < toTime(existing.loggedAt)) return existing;
  return normalizeWeightKg(incoming.weightKg) > normalizeWeightKg(existing.weightKg)
    ? incoming
    : existing;
};

const mergeWeightTrendLogs = (
  currentLogs: WeightTrendLogEntry[],
  incomingLogs: WeightTrendLogEntry[],
  scope?: WalkingProgressScope | null
) => {
  const byScopeAndDate = new Map<string, WeightTrendLogEntry>();
  const putLog = (log: WeightTrendLogEntry) => {
    const sourceUserId = log.sourceUserId || scope?.userId || undefined;
    const sourceWeeklyTrackingId = log.sourceWeeklyTrackingId ?? scope?.weeklyTrackingId ?? null;
    const normalizedLog: WeightTrendLogEntry = {
      ...log,
      weightKg: normalizeWeightKg(log.weightKg),
      sourceUserId,
      sourceWeeklyTrackingId,
    };
    if (!normalizedLog.weightKg || !normalizedLog.dateKey) return;

    const key = `${sourceUserId || 'local'}:${normalizedLog.dateKey}`;
    byScopeAndDate.set(key, chooseLatestWeightLog(normalizedLog, byScopeAndDate.get(key)));
  };

  currentLogs.forEach(putLog);
  incomingLogs.forEach(putLog);

  return Array.from(byScopeAndDate.values())
    .sort((a, b) => b.dateKey.localeCompare(a.dateKey))
    .slice(0, 120);
};

const getDashboardCacheEntries = (dashboardCache: any): [string, any][] => {
  const data = dashboardCache?.data;
  if (!data || typeof data !== 'object') return [];

  if (Array.isArray(data)) {
    return data
      .map((day, index) => [`day0${index + 1}`, day] as [string, any])
      .filter(([, day]) => Boolean(day));
  }

  return Object.entries(data).filter(([, day]) => Boolean(day));
};

const getDayNoFromDashboardEntry = (key: string, day: any) => {
  const keyMatch = key.match(/^day0?(\d+)$/i);
  return normalizeDayNo(day?.dayNo ?? day?.dayNumber ?? keyMatch?.[1]);
};

const getDayWalkingSteps = (day: any) =>
  cleanWalkingSteps(day?.walkingSteps ?? day?.steps ?? day?.stepCount);

const getDayWalkingCalories = (day: any) =>
  roundCalories(day?.walkingCaloriesBurned ?? day?.stepCaloriesBurned ?? day?.walkingCalories);

const getDayWorkoutCalories = (day: any) =>
  roundCalories(day?.exerciseCaloriesBurned ?? day?.workoutCalories ?? day?.caloriesBurned);

const getDayWalkingGoal = (day: any) =>
  clampStepGoal(Number(day?.walkingStepGoal ?? day?.stepGoal ?? day?.targetSteps ?? day?.dailyStepGoal ?? 10000));

const mergeDashboardCacheIntoTransferDays = (
  daysByDate: Map<string, QrActivityTransferDay>,
  dashboardCache: any,
  fallbackUpdatedAt: string
) => {
  getDashboardCacheEntries(dashboardCache).forEach(([key, day]) => {
    const dateKey = normalizeDateKey(day?.dateKey || day?.date);
    if (!dateKey) return;

    const calorieIntake = getCalorieIntake(day);
    const hydrationIntake = getHydrationIntake(day);
    const steps = getDayWalkingSteps(day);
    const walkingCalories = getDayWalkingCalories(day);
    const workoutCalories = getDayWorkoutCalories(day);
    if (
      calorieIntake <= 0 &&
      hydrationIntake <= 0 &&
      steps <= 0 &&
      walkingCalories <= 0 &&
      workoutCalories <= 0
    ) {
      return;
    }

    const current = daysByDate.get(dateKey);
    const incoming: QrActivityTransferDay = {
      dateKey,
      dayNo: getDayNoFromDashboardEntry(key, day),
      calorieIntake,
      hydrationIntake,
      targetCalories: roundCalories(day?.targetCalories),
      targetHydration: roundHydration(day?.targetHydration),
      steps,
      walkingCalories,
      workoutCalories,
      goal: getDayWalkingGoal(day),
      updatedAt: getLatestIso(day?.updatedAt, day?.savedAt, day?.date, current?.updatedAt, fallbackUpdatedAt),
    };

    daysByDate.set(dateKey, chooseActivityDay(current, incoming));
  });
};

const buildPreview = (
  payload: QrActivityEncryptedPayload,
  qrSize: number
): QrActivityTransferPreview => {
  const days = Array.isArray(payload.days) ? payload.days : [];
  const nutritionDays = days.filter(
    (day) => roundCalories(day.calorieIntake) > 0 || roundHydration(day.hydrationIntake) > 0
  );
  const latestNutritionDay = nutritionDays[0];
  const specificPayloadDay = findSpecificPayloadDay(days, payload.specificDay);
  const specificDay = payload.specificDay || buildSpecificDayMeta(specificPayloadDay);
  const specificCalorieIntake = roundCalories(
    specificDay?.calorieIntake ?? specificPayloadDay?.calorieIntake
  );
  const specificHydrationIntake = roundHydration(
    specificDay?.hydrationIntake ?? specificPayloadDay?.hydrationIntake
  );

  return {
    exportedAt: payload.exportedAt,
    dayCount: days.length,
    nutritionDayCount: nutritionDays.length,
    totalSteps: days.reduce((sum, day) => sum + cleanWalkingSteps(day.steps), 0),
    totalCalorieIntake: days.reduce((sum, day) => sum + roundCalories(day.calorieIntake), 0),
    totalHydrationIntake: roundHydration(
      days.reduce((sum, day) => sum + roundHydration(day.hydrationIntake), 0)
    ),
    latestCalorieIntake: roundCalories(latestNutritionDay?.calorieIntake),
    latestHydrationIntake: roundHydration(latestNutritionDay?.hydrationIntake),
    specificDayDateKey: specificDay?.dateKey,
    specificDayNo: normalizeDayNo(specificDay?.dayNo),
    specificDayCalorieIntake: specificCalorieIntake,
    specificDayHydrationIntake: specificHydrationIntake,
    hasSpecificDayNutritionData: specificCalorieIntake > 0 || specificHydrationIntake > 0,
    totalWalkingCalories: days.reduce((sum, day) => sum + roundCalories(day.walkingCalories), 0),
    totalWorkoutCalories: days.reduce((sum, day) => sum + roundCalories(day.workoutCalories), 0),
    latestDateKey: days[0]?.dateKey,
    latestNutritionDateKey: latestNutritionDay?.dateKey,
    hasNutritionData: nutritionDays.length > 0,
    hasEmergencyWhatsApp: Boolean(payload.emergencyWhatsApp?.number),
    hasWeightData: Boolean(payload.weight?.latestWeightKg || payload.weight?.logs?.length),
    latestWeightKg: payload.weight?.latestWeightKg,
    mealPlanCount: Array.isArray(payload.mealPlanner?.mealPlans) ? payload.mealPlanner.mealPlans.length : 0,
    groceryItemCount: getMealPlannerGroceryItemCount(payload.mealPlanner),
    noteCount: Array.isArray(payload.notes) ? payload.notes.length : 0,
    qrSize,
    isQrDense: qrSize > QR_ACTIVITY_DIRECT_MAX_CHARS,
  };
};

const buildCompactPayload = (payload: QrActivityEncryptedPayload): CompactQrActivityPayload => {
  const compactPayload: CompactQrActivityPayload = {
    v: QR_ACTIVITY_SCHEMA_VERSION,
    t: payload.exportedAt,
    a: payload.accountHash,
    d: payload.days
      .slice(0, QR_ACTIVITY_DAY_LIMIT)
      .map((day) => [
        day.dateKey,
        cleanWalkingSteps(day.steps),
        roundCalories(day.walkingCalories),
        roundCalories(day.workoutCalories),
        clampStepGoal(day.goal),
        day.updatedAt,
        roundCalories(day.calorieIntake),
        roundHydration(day.hydrationIntake),
        roundCalories(day.targetCalories),
        roundHydration(day.targetHydration),
        normalizeDayNo(day.dayNo) || 0,
      ]),
  };

  if (payload.specificDay?.dateKey) {
    compactPayload.s = [
      payload.specificDay.dateKey,
      normalizeDayNo(payload.specificDay.dayNo) || 0,
      roundCalories(payload.specificDay.calorieIntake),
      roundHydration(payload.specificDay.hydrationIntake),
      roundCalories(payload.specificDay.targetCalories),
      roundHydration(payload.specificDay.targetHydration),
      String(payload.specificDay.updatedAt || payload.exportedAt),
    ];
  }

  if (payload.emergencyWhatsApp?.number) {
    compactPayload.e = [
      String(payload.emergencyWhatsApp.number),
      String(payload.emergencyWhatsApp.updatedAt || payload.exportedAt),
    ];
  }

  if (payload.weight && (payload.weight.latestWeightKg || payload.weight.logs?.length)) {
    const compactLogs = (payload.weight.logs || [])
      .slice(0, QR_WEIGHT_LOG_LIMIT)
      .map((log) => [
        log.dateKey,
        log.loggedAt,
        normalizeWeightKg(log.weightKg),
      ] as [string, string, number])
      .filter((log) => log[0] && log[2] > 0);
    const latestWeightKg = normalizeWeightKg(payload.weight.latestWeightKg) || compactLogs[0]?.[2] || 0;

    if (latestWeightKg || compactLogs.length) {
      compactPayload.w = [
        latestWeightKg,
        String(payload.weight.updatedAt || payload.exportedAt),
        compactLogs,
      ];
    }
  }

  if (payload.mealPlanner?.mealPlans?.length) {
    compactPayload.mp = payload.mealPlanner.mealPlans
      .slice(0, QR_MEAL_PLAN_LIMIT)
      .map((meal) => [
        meal.id,
        meal.dateKey,
        mealPlanTypeToIndex(meal.type),
        meal.name,
        roundTemplateNumber(meal.calories),
        roundTemplateNumber(meal.protein),
        roundTemplateNumber(meal.carbs),
        roundTemplateNumber(meal.fats),
        meal.ingredients.slice(0, QR_MEAL_PLAN_INGREDIENT_LIMIT),
        meal.notes || '',
        String(meal.createdAt || payload.exportedAt),
        String(meal.updatedAt || meal.createdAt || payload.exportedAt),
      ]);
  }

  if (
    payload.mealPlanner?.groceryState &&
    (
      payload.mealPlanner.groceryState.manualItems.length ||
      payload.mealPlanner.groceryState.checkedItemKeys.length
    )
  ) {
    compactPayload.g = [
      payload.mealPlanner.groceryState.manualItems
        .slice(0, QR_GROCERY_MANUAL_LIMIT)
        .map((item) => [
          item.id,
          item.name,
          String(item.createdAt || payload.exportedAt),
          String(item.updatedAt || item.createdAt || payload.exportedAt),
        ]),
      payload.mealPlanner.groceryState.checkedItemKeys.slice(0, QR_GROCERY_CHECKED_LIMIT),
      String(payload.mealPlanner.groceryState.updatedAt || payload.exportedAt),
    ];
  }

  if (payload.notes?.length) {
    compactPayload.n = payload.notes
      .slice(0, QR_NOTE_LIMIT)
      .map((note) => [
        note.id,
        clampInlineText(note.title, QR_NOTE_TITLE_MAX_CHARS),
        clampNoteBodyText(note.body, QR_NOTE_BODY_MAX_CHARS),
        String(note.createdAt || payload.exportedAt),
        String(note.updatedAt || note.createdAt || payload.exportedAt),
        note.pinned ? 1 : 0,
      ]);
  }

  return compactPayload;
};

const expandCompactPayload = (rawPayload: any): QrActivityEncryptedPayload | null => {
  if (!rawPayload || !isSupportedQrSchemaVersion(rawPayload.v) || typeof rawPayload.a !== 'string') {
    return null;
  }

  const exportedAt = String(rawPayload.t || new Date(0).toISOString());
  const compactWeightLogs = Array.isArray(rawPayload.w?.[2]) ? rawPayload.w[2] : [];
  const weightLogs = compactWeightLogs
    .map((log: any) => {
      const dateKey = normalizeDateKey(Array.isArray(log) ? log[0] : log?.dateKey);
      const weightKg = normalizeWeightKg(Array.isArray(log) ? log[2] : log?.weightKg);
      if (!dateKey || !weightKg) return null;

      return {
        dateKey,
        loggedAt: String((Array.isArray(log) ? log[1] : log?.loggedAt) || exportedAt),
        weightKg,
      } as WeightTrendLogEntry;
    })
    .filter(Boolean) as WeightTrendLogEntry[];
  const latestWeightKg = normalizeWeightKg(rawPayload.w?.[0]) || weightLogs[0]?.weightKg || 0;

  return {
    schemaVersion: rawPayload.v,
    exportedAt,
    accountHash: String(rawPayload.a),
    days: Array.isArray(rawPayload.d)
      ? rawPayload.d.map((day: any) => ({
          dateKey: normalizeDateKey(Array.isArray(day) ? day[0] : day?.dateKey),
          dayNo: normalizeDayNo(Array.isArray(day) ? day[10] : day?.dayNo),
          steps: cleanWalkingSteps(Array.isArray(day) ? day[1] : day?.steps),
          walkingCalories: roundCalories(Array.isArray(day) ? day[2] : day?.walkingCalories),
          workoutCalories: roundCalories(Array.isArray(day) ? day[3] : day?.workoutCalories),
          goal: clampStepGoal(Number((Array.isArray(day) ? day[4] : day?.goal) || 10000)),
          updatedAt: String((Array.isArray(day) ? day[5] : day?.updatedAt) || exportedAt),
          calorieIntake: roundCalories(Array.isArray(day) ? day[6] : day?.calorieIntake ?? day?.achievedCalories),
          hydrationIntake: roundHydration(
            Array.isArray(day)
              ? day[7]
              : day?.hydrationIntake ?? day?.achieviedHydration ?? day?.achievedHydration
          ),
          targetCalories: roundCalories(Array.isArray(day) ? day[8] : day?.targetCalories),
          targetHydration: roundHydration(Array.isArray(day) ? day[9] : day?.targetHydration),
        }))
      : [],
    specificDay: Array.isArray(rawPayload.s) && normalizeDateKey(rawPayload.s[0])
      ? {
          dateKey: normalizeDateKey(rawPayload.s[0]),
          dayNo: normalizeDayNo(rawPayload.s[1]),
          calorieIntake: roundCalories(rawPayload.s[2]),
          hydrationIntake: roundHydration(rawPayload.s[3]),
          targetCalories: roundCalories(rawPayload.s[4]),
          targetHydration: roundHydration(rawPayload.s[5]),
          updatedAt: String(rawPayload.s[6] || exportedAt),
        }
      : null,
    emergencyWhatsApp: Array.isArray(rawPayload.e) && rawPayload.e[0]
      ? {
          number: String(rawPayload.e[0]),
          updatedAt: String(rawPayload.e[1] || exportedAt),
        }
      : null,
    weight: Array.isArray(rawPayload.w) && (latestWeightKg || weightLogs.length)
      ? {
          metrics: null,
          logs: weightLogs,
          latestWeightKg,
          updatedAt: String(rawPayload.w[1] || exportedAt),
        }
      : null,
    mealPlanner: normalizeQrMealPlanner(
      {
        mealPlans: Array.isArray(rawPayload.mp)
          ? rawPayload.mp.map((meal: any) => (
              Array.isArray(meal)
                ? {
                    id: meal[0],
                    dateKey: meal[1],
                    type: mealPlanTypeFromIndex(meal[2]),
                    name: meal[3],
                    calories: meal[4],
                    protein: meal[5],
                    carbs: meal[6],
                    fats: meal[7],
                    ingredients: Array.isArray(meal[8]) ? meal[8] : [],
                    notes: meal[9],
                    createdAt: meal[10],
                    updatedAt: meal[11],
                  }
                : meal
            ))
          : [],
        groceryState: Array.isArray(rawPayload.g)
          ? {
              manualItems: Array.isArray(rawPayload.g[0])
                ? rawPayload.g[0].map((item: any) => (
                    Array.isArray(item)
                      ? {
                          id: item[0],
                          name: item[1],
                          createdAt: item[2],
                          updatedAt: item[3],
                        }
                      : item
                  ))
                : [],
              checkedItemKeys: Array.isArray(rawPayload.g[1]) ? rawPayload.g[1] : [],
              updatedAt: rawPayload.g[2],
            }
          : null,
      },
      exportedAt
    ),
    notes: Array.isArray(rawPayload.n)
      ? rawPayload.n
          .map((note: any) => normalizeQrNote(
            Array.isArray(note)
              ? {
                  id: note[0],
                  title: note[1],
                  body: note[2],
                  createdAt: note[3],
                  updatedAt: note[4],
                  pinned: note[5] === 1 || note[5] === true,
                }
              : note,
            exportedAt
          ))
          .filter((note: QrNoteTransfer | null): note is QrNoteTransfer => Boolean(note))
          .slice(0, QR_NOTE_LIMIT)
      : [],
  };
};

const encryptPayload = (
  payload: QrActivityEncryptedPayload,
  identity: string
): QrActivityEnvelope => {
  const compactPayload = buildCompactPayload(payload);
  const plainBytes = encodeUtf8(JSON.stringify(compactPayload));
  const salt = createSaltHex();

  return {
    kind: QR_ACTIVITY_KIND,
    schemaVersion: QR_ACTIVITY_SCHEMA_VERSION,
    app: 'FitFaat',
    exportedAt: payload.exportedAt,
    accountHash: payload.accountHash,
    encrypted: true,
    encryption: QR_ACTIVITY_ENCRYPTION,
    salt,
    checksum: bytesToHex(sha256(plainBytes)),
    data: bytesToHex(xorWithPasscodeStream(plainBytes, getAccountEncryptionKey(identity), salt)),
  };
};

const decryptEnvelope = (
  rawValue: string,
  identity: string
): QrActivityEncryptedPayload => {
  let envelope: QrActivityEnvelope;
  try {
    envelope = JSON.parse(rawValue.trim()) as QrActivityEnvelope;
  } catch {
    throw new Error('This is not a valid FitFaat QR Code.');
  }

  if (
    envelope?.kind !== QR_ACTIVITY_KIND ||
    !isSupportedQrSchemaVersion(envelope.schemaVersion) ||
    envelope.encryption !== QR_ACTIVITY_ENCRYPTION ||
    typeof envelope.data !== 'string' ||
    typeof envelope.salt !== 'string'
  ) {
    throw new Error('This is not a valid FitFaat QR Code.');
  }

  const accountHash = getAccountHash(identity);
  if (envelope.accountHash !== accountHash) {
    throw new Error(QR_ACTIVITY_ACCOUNT_MISMATCH_MESSAGE);
  }

  const plainBytes = xorWithPasscodeStream(
    hexToBytes(envelope.data),
    getAccountEncryptionKey(identity),
    envelope.salt
  );
  if (bytesToHex(sha256(plainBytes)) !== envelope.checksum) {
    throw new Error('This FitFaat QR Code could not be verified.');
  }

  const decodedPayload = JSON.parse(decodeUtf8(plainBytes));
  const payload = expandCompactPayload(decodedPayload) || decodedPayload as QrActivityEncryptedPayload;
  if (
    !payload ||
    !isSupportedQrSchemaVersion(payload.schemaVersion) ||
    payload.accountHash !== accountHash ||
    !Array.isArray(payload.days)
  ) {
    throw new Error('This FitFaat QR Code does not contain transfer data.');
  }

  const days = payload.days
    .map((day) => ({
      dateKey: normalizeDateKey(day?.dateKey),
      dayNo: normalizeDayNo(day?.dayNo),
      calorieIntake: getCalorieIntake(day),
      hydrationIntake: getHydrationIntake(day),
      targetCalories: roundCalories(day?.targetCalories),
      targetHydration: roundHydration(day?.targetHydration),
      steps: cleanWalkingSteps(day?.steps),
      walkingCalories: roundCalories(day?.walkingCalories),
      workoutCalories: roundCalories(day?.workoutCalories),
      goal: clampStepGoal(Number(day?.goal || 10000)),
      updatedAt: String(day?.updatedAt || payload.exportedAt || new Date(0).toISOString()),
    }))
    .filter((day) => day.dateKey && hasTransferDayData(day))
    .sort((a, b) => b.dateKey.localeCompare(a.dateKey));
  const rawSpecificDay = payload.specificDay;
  const specificPayloadDay = findSpecificPayloadDay(days, rawSpecificDay);
  const specificDay = rawSpecificDay?.dateKey
    ? {
        dateKey: normalizeDateKey(rawSpecificDay.dateKey),
        dayNo: normalizeDayNo(rawSpecificDay.dayNo) || normalizeDayNo(specificPayloadDay?.dayNo),
        calorieIntake: roundCalories(rawSpecificDay.calorieIntake ?? specificPayloadDay?.calorieIntake),
        hydrationIntake: roundHydration(rawSpecificDay.hydrationIntake ?? specificPayloadDay?.hydrationIntake),
        targetCalories: roundCalories(rawSpecificDay.targetCalories ?? specificPayloadDay?.targetCalories),
        targetHydration: roundHydration(rawSpecificDay.targetHydration ?? specificPayloadDay?.targetHydration),
        updatedAt: String(rawSpecificDay.updatedAt || specificPayloadDay?.updatedAt || payload.exportedAt),
    }
    : buildSpecificDayMeta(specificPayloadDay, payload.exportedAt);
  const payloadWithoutMealTemplates = {
    ...(payload as QrActivityEncryptedPayload & { mealTemplates?: unknown }),
  };
  delete payloadWithoutMealTemplates.mealTemplates;

  return {
    ...payloadWithoutMealTemplates,
    schemaVersion: payload.schemaVersion,
    days,
    specificDay,
    emergencyWhatsApp: payload.emergencyWhatsApp?.number
      ? {
          number: String(payload.emergencyWhatsApp.number),
          updatedAt: String(payload.emergencyWhatsApp.updatedAt || payload.exportedAt || new Date(0).toISOString()),
        }
      : null,
    weight: payload.weight && (payload.weight.latestWeightKg || payload.weight.logs?.length)
      ? {
          metrics: payload.weight.metrics && typeof payload.weight.metrics === 'object' && !Array.isArray(payload.weight.metrics)
            ? payload.weight.metrics
            : null,
          logs: Array.isArray(payload.weight.logs)
            ? payload.weight.logs
                .map((log: any) => {
                  const dateKey = normalizeDateKey(log?.dateKey || log?.date || log?.loggedAt);
                  const weightKg = normalizeWeightKg(log?.weightKg ?? log?.weight);
                  if (!dateKey || !weightKg) return null;

                  return {
                    dateKey,
                    loggedAt: String(log?.loggedAt || payload.weight?.updatedAt || payload.exportedAt),
                    weightKg,
                    sourceUserId: log?.sourceUserId ? String(log.sourceUserId) : undefined,
                    sourceWeeklyTrackingId: log?.sourceWeeklyTrackingId ?? null,
                  } as WeightTrendLogEntry;
                })
                .filter(Boolean) as WeightTrendLogEntry[]
            : [],
          latestWeightKg: normalizeWeightKg(payload.weight.latestWeightKg),
          updatedAt: String(payload.weight.updatedAt || payload.exportedAt || new Date(0).toISOString()),
        }
      : null,
    mealPlanner: normalizeQrMealPlanner(payload.mealPlanner, payload.exportedAt),
    notes: Array.isArray(payload.notes)
      ? payload.notes
          .map((note) => normalizeQrNote(note, payload.exportedAt))
          .filter((note): note is QrNoteTransfer => Boolean(note))
          .slice(0, QR_NOTE_LIMIT)
      : [],
  };
};

export const buildQrActivityTransfer = async (
  options: QrActivityTransferOptions = {}
): Promise<QrActivityTransferExport> => {
  const [
    identity,
    scope,
    rawWalkingHistory,
    rawExerciseStore,
    emergencyWhatsApp,
    rawHealthMetrics,
    rawWeightLogs,
    dashboardCache,
  ] = await Promise.all([
    getRequiredCurrentAccountIdentity(),
    getWalkingProgressScope(),
    AsyncStorage.getItem(WALKING_PROGRESS_STORAGE_KEY),
    AsyncStorage.getItem(LOCAL_EXERCISE_PROGRESS_KEY),
    loadEmergencyWhatsAppRecord(),
    AsyncStorage.getItem(HEALTH_METRICS_STORAGE_KEY),
    AsyncStorage.getItem(WEIGHT_TREND_LOGS_STORAGE_KEY),
    getStoredDashboardCache<Record<string, any>>(),
  ]);
  const exportedAt = new Date().toISOString();
  const daysByDate = new Map<string, QrActivityTransferDay>();

  parseJsonArray(rawWalkingHistory)
    .map(parseWalkingEntry)
    .filter((entry): entry is WalkingProgressEntry => Boolean(entry && matchesCurrentScope(entry, scope)))
    .forEach((entry) => {
      if (entry.steps <= 0 && entry.calories <= 0) return;
      const incoming: QrActivityTransferDay = {
        dateKey: entry.dateKey,
        steps: cleanWalkingSteps(entry.steps),
        walkingCalories: roundCalories(entry.calories),
        workoutCalories: 0,
        goal: clampStepGoal(entry.goal),
        updatedAt: entry.updatedAt,
      };
      daysByDate.set(entry.dateKey, chooseActivityDay(daysByDate.get(entry.dateKey), incoming));
    });

  const exerciseStore = parseExerciseStore(rawExerciseStore);
  Object.entries(exerciseStore).forEach(([key, record]) => {
    if (!matchesCurrentScope(record, scope)) return;

    const dateKey = getRecordDateKey(key, record);
    const workoutCalories = roundCalories(record?.caloriesBurned);
    if (!dateKey || workoutCalories <= 0) return;

    const current = daysByDate.get(dateKey);
    const incoming: QrActivityTransferDay = {
      dateKey,
      steps: current?.steps || 0,
      walkingCalories: current?.walkingCalories || 0,
      workoutCalories,
      goal: current?.goal || 10000,
      updatedAt: String(record?.updatedAt || current?.updatedAt || new Date(0).toISOString()),
    };
    daysByDate.set(dateKey, chooseActivityDay(current, incoming));
  });

  mergeDashboardCacheIntoTransferDays(daysByDate, dashboardCache, exportedAt);

  const allDays = Array.from(daysByDate.values())
    .filter(hasTransferDayData)
    .sort((a, b) => b.dateKey.localeCompare(a.dateKey));
  const [mealPlanner, notes] = await Promise.all([
    readMealPlannerTransfer(exportedAt),
    readNotesTransfer(exportedAt),
  ]);
  const hasSpecificSelection = hasQrTransferSelection(options);
  const selectedDay = hasSpecificSelection
    ? allDays.find((day) => matchesQrTransferSelection(day, options)) || null
    : null;
  const transferDays = hasSpecificSelection
    ? selectedDay
      ? [selectedDay]
      : []
    : allDays.slice(0, QR_ACTIVITY_DAY_LIMIT);
  const weight = buildWeightTransfer(rawHealthMetrics, rawWeightLogs, scope);
  const payload: QrActivityEncryptedPayload = {
    schemaVersion: QR_ACTIVITY_SCHEMA_VERSION,
    exportedAt,
    accountHash: getAccountHash(identity),
    emergencyWhatsApp,
    weight,
    specificDay: buildSpecificDayMeta(selectedDay, exportedAt),
    days: transferDays,
    mealPlanner,
    notes,
  };

  if (hasSpecificSelection && !selectedDay) {
    throw new Error('No calorie, hydration, step, or workout data is available for that selected day yet.');
  }

  if (
    !payload.days.length &&
    !payload.emergencyWhatsApp?.number &&
    !payload.weight &&
    !payload.mealPlanner?.mealPlans.length &&
    !payload.mealPlanner?.groceryState.manualItems.length &&
    !payload.mealPlanner?.groceryState.checkedItemKeys.length &&
    !payload.notes?.length
  ) {
    throw new Error('No daily intake, activity, weight, Emergency WhatsApp, Meal Planner, or note data is available to move yet.');
  }

  const qrValue = JSON.stringify(encryptPayload(payload, identity));
  return {
    qrValue,
    payload,
    preview: buildPreview(payload, qrValue.length),
  };
};

export const prepareQrActivityImport = async (
  rawValue: string
): Promise<PreparedQrActivityImport> => {
  const identity = await getRequiredCurrentAccountIdentity();
  const payload = decryptEnvelope(rawValue, identity);
  return {
    rawValue,
    payload,
    preview: buildPreview(payload, rawValue.length),
  };
};

const shouldUseIncomingWalking = (
  incoming: WalkingProgressEntry,
  existing?: WalkingProgressEntry | null
) => {
  if (!existing) return true;
  return toTime(incoming.updatedAt) > toTime(existing.updatedAt) || incoming.steps > existing.steps;
};

const shouldUseIncomingWorkout = (
  incoming: ExerciseProgressRecord,
  existing?: ExerciseProgressRecord | null
) => {
  if (!existing) return true;
  const incomingTime = toTime(incoming.updatedAt);
  const existingTime = toTime(existing.updatedAt);
  if (incomingTime > existingTime) return true;
  if (incomingTime < existingTime) return false;

  return (
    roundCalories(incoming.caloriesBurned) > roundCalories(existing.caloriesBurned)
  );
};

const findDashboardDayEntry = (
  data: Record<string, any>,
  incomingDay: QrActivityTransferDay
) => {
  const incomingDateKey = normalizeDateKey(incomingDay.dateKey);
  const incomingDayNo = normalizeDayNo(incomingDay.dayNo);

  return Object.entries(data).find(([key, day]) => {
    const dayDateKey = normalizeDateKey(day?.dateKey || day?.date);
    if (incomingDateKey && dayDateKey === incomingDateKey) return true;

    const keyMatch = key.match(/^day0?(\d+)$/i);
    const dayNo = normalizeDayNo(day?.dayNo ?? day?.dayNumber ?? keyMatch?.[1]);
    return Boolean(incomingDayNo && dayNo === incomingDayNo);
  });
};

const getDashboardDayKeyForIncoming = (
  existingKey: string | undefined,
  incomingDay: QrActivityTransferDay,
  fallbackIndex: number
) => {
  if (existingKey) return existingKey;
  const dayNo = normalizeDayNo(incomingDay.dayNo) || normalizeDayNo(fallbackIndex + 1);
  return dayNo ? `day0${dayNo}` : null;
};

const mergeNutritionIntakeIntoDashboardCache = async (
  incomingDays: QrActivityTransferDay[],
  scope?: WalkingProgressScope | null
) => {
  const nutritionDays = incomingDays.filter(
    (day) => roundCalories(day.calorieIntake) > 0 || roundHydration(day.hydrationIntake) > 0
  );
  if (!nutritionDays.length) {
    return { changedDayCount: 0, cacheKeys: [] as string[] };
  }

  const currentCache = await getStoredDashboardCache<Record<string, any>>(undefined, scope?.weeklyTrackingId);
  const currentData =
    currentCache?.data && typeof currentCache.data === 'object' && !Array.isArray(currentCache.data)
      ? currentCache.data
      : {};
  const nextData: Record<string, any> = { ...currentData };
  let changedDayCount = 0;

  nutritionDays.forEach((incomingDay, index) => {
    const existingEntry = findDashboardDayEntry(nextData, incomingDay);
    const key = getDashboardDayKeyForIncoming(existingEntry?.[0], incomingDay, index);
    if (!key) return;

    const existingDay = existingEntry?.[1] || nextData[key] || {};
    const cacheUpdatedAt =
      typeof currentCache?.savedAt === 'string'
        ? currentCache.savedAt
        : currentCache?.timestamp instanceof Date
          ? currentCache.timestamp.toISOString()
          : currentCache?.timestamp
            ? new Date(currentCache.timestamp).toISOString()
            : undefined;
    const incomingCalories = roundCalories(incomingDay.calorieIntake);
    const incomingHydration = roundHydration(incomingDay.hydrationIntake);
    const dayNo = normalizeDayNo(existingDay?.dayNo ?? existingDay?.dayNumber ?? incomingDay.dayNo);
    const dateKey = normalizeDateKey(existingDay?.dateKey || existingDay?.date || incomingDay.dateKey);
    const existingComparableDay = {
      ...existingDay,
      ...(existingDay?.updatedAt || !cacheUpdatedAt ? {} : { updatedAt: cacheUpdatedAt }),
    };
    const normalizedExistingDay = normalizeDailyProgressDay(existingComparableDay);
    const incomingDashboardDay = {
      _id: existingDay?._id,
      dayNo,
      date: dateKey || incomingDay.dateKey,
      dateKey: dateKey || incomingDay.dateKey,
      calorieIntake: incomingCalories,
      caloriesIntake: incomingCalories,
      achievedCalories: incomingCalories,
      hydrationIntake: incomingHydration,
      achieviedHydration: incomingHydration,
      achievedHydration: incomingHydration,
      targetCalories: roundCalories(incomingDay.targetCalories),
      targetHydration: roundHydration(incomingDay.targetHydration),
      remarks: existingDay?.remarks ?? null,
      duration: Math.max(0, Math.round(toNumber(existingDay?.duration))),
      status: existingDay?.status || 'active',
      updatedAt: incomingDay.updatedAt,
      savedAt: incomingDay.updatedAt,
    };
    const mergedForKey = mergeDailyProgressMap(
      { [key]: existingComparableDay },
      { [key]: incomingDashboardDay }
    );
    const mergedDay = mergedForKey[key] || Object.values(mergedForKey)[0];

    if (JSON.stringify(mergedDay) === JSON.stringify(normalizedExistingDay)) {
      return;
    }

    nextData[key] = mergedDay;
    changedDayCount += 1;
  });

  if (changedDayCount <= 0) {
    return { changedDayCount: 0, cacheKeys: [] as string[] };
  }

  await setStoredDashboardCache(
    { data: nextData, timestamp: new Date() },
    undefined,
    scope?.weeklyTrackingId
  );

  let cacheKey = LEGACY_DASHBOARD_CACHE_KEY;
  try {
    cacheKey = await getScopedDashboardCacheKey(undefined, scope?.weeklyTrackingId);
  } catch {
    cacheKey = LEGACY_DASHBOARD_CACHE_KEY;
  }

  return {
    changedDayCount,
    cacheKeys: [cacheKey],
  };
};

export const applyPreparedQrActivityImport = async (
  prepared: PreparedQrActivityImport
) => {
  const scope = await getWalkingProgressScope();
  const [
    rawWalkingHistory,
    rawExerciseStore,
    currentEmergencyWhatsApp,
    rawHealthMetrics,
    rawWeightLogs,
  ] = await Promise.all([
    AsyncStorage.getItem(WALKING_PROGRESS_STORAGE_KEY),
    AsyncStorage.getItem(LOCAL_EXERCISE_PROGRESS_KEY),
    loadEmergencyWhatsAppRecord(),
    AsyncStorage.getItem(HEALTH_METRICS_STORAGE_KEY),
    AsyncStorage.getItem(WEIGHT_TREND_LOGS_STORAGE_KEY),
  ]);

  const existingWalking = parseJsonArray(rawWalkingHistory)
    .map(parseWalkingEntry)
    .filter((entry): entry is WalkingProgressEntry => Boolean(entry));
  const walkingOtherScopes: WalkingProgressEntry[] = [];
  const walkingByDate = new Map<string, WalkingProgressEntry>();

  existingWalking.forEach((entry) => {
    if (!matchesCurrentScope(entry, scope)) {
      walkingOtherScopes.push(entry);
      return;
    }

    const current = walkingByDate.get(entry.dateKey);
    if (shouldUseIncomingWalking(entry, current)) {
      walkingByDate.set(entry.dateKey, entry);
    }
  });

  let changedWalkingDays = 0;
  prepared.payload.days.forEach((day) => {
    if (day.steps <= 0 && day.walkingCalories <= 0) return;

    const incoming: WalkingProgressEntry = {
      dateKey: day.dateKey,
      steps: cleanWalkingSteps(day.steps),
      calories: roundCalories(day.walkingCalories || estimateWalkingCalories(day.steps)),
      goal: clampStepGoal(day.goal),
      updatedAt: day.updatedAt || prepared.payload.exportedAt,
      userId: scope.userId,
      weeklyTrackingId: scope.weeklyTrackingId,
    };
    const existing = walkingByDate.get(day.dateKey);
    if (shouldUseIncomingWalking(incoming, existing)) {
      walkingByDate.set(day.dateKey, incoming);
      changedWalkingDays += 1;
    }
  });

  const nextWalkingHistory = [
    ...walkingOtherScopes,
    ...Array.from(walkingByDate.values()),
  ].sort((a, b) => b.dateKey.localeCompare(a.dateKey));

  const exerciseStore = parseExerciseStore(rawExerciseStore);
  const nextExerciseStore: ExerciseProgressStore = { ...exerciseStore };
  let changedWorkoutDays = 0;

  prepared.payload.days.forEach((day) => {
    const workoutCalories = roundCalories(day.workoutCalories);
    if (workoutCalories <= 0) return;

    const matchingKeys = Object.keys(nextExerciseStore).filter((key) => {
      const record = nextExerciseStore[key];
      return getRecordDateKey(key, record) === day.dateKey && matchesCurrentScope(record, scope);
    });
    const existingRecord = matchingKeys
      .map((key) => nextExerciseStore[key])
      .reduce<ExerciseProgressRecord | null>((best, record) => {
        if (!best) return record;
        return shouldUseIncomingWorkout(record, best) ? record : best;
      }, null);
    const incomingRecord: ExerciseProgressRecord = {
      ...(existingRecord || {}),
      dateKey: day.dateKey,
      userId: scope.userId,
      weeklyTrackingId: scope.weeklyTrackingId,
      caloriesBurned: workoutCalories,
      durationSeconds: Math.max(0, Math.round(toNumber(existingRecord?.durationSeconds))),
      entries: Array.isArray(existingRecord?.entries) ? existingRecord?.entries : [],
      updatedAt: day.updatedAt || prepared.payload.exportedAt,
    };

    if (!shouldUseIncomingWorkout(incomingRecord, existingRecord)) return;

    const keysToWrite = matchingKeys.length ? matchingKeys : [`date:${day.dateKey}`];
    keysToWrite.forEach((key) => {
      nextExerciseStore[key] = incomingRecord;
    });
    changedWorkoutDays += 1;
  });

  await Promise.all([
    AsyncStorage.setItem(WALKING_PROGRESS_STORAGE_KEY, JSON.stringify(nextWalkingHistory)),
    AsyncStorage.setItem(LOCAL_EXERCISE_PROGRESS_KEY, JSON.stringify(nextExerciseStore)),
  ]);

  const incomingEmergency = prepared.payload.emergencyWhatsApp;
  const shouldRestoreEmergency =
    Boolean(incomingEmergency?.number) &&
    (
      !currentEmergencyWhatsApp ||
      toTime(incomingEmergency?.updatedAt) > toTime(currentEmergencyWhatsApp.updatedAt) ||
      (!currentEmergencyWhatsApp.number && Boolean(incomingEmergency?.number))
    );
  const emergencyRestore = shouldRestoreEmergency && incomingEmergency?.number
    ? await saveEmergencyWhatsAppNumber(
        incomingEmergency.number,
        undefined,
        incomingEmergency.updatedAt || prepared.payload.exportedAt
      )
    : null;

  const incomingWeight = prepared.payload.weight;
  const currentHealthMetrics = parseJsonObject(rawHealthMetrics);
  const currentWeightLogs = parseWeightTrendLogs(rawWeightLogs);
  const currentWeightKg = normalizeWeightKg(
    currentHealthMetrics?.weight ?? currentHealthMetrics?.currentWeight ?? currentHealthMetrics?.weightKg
  );
  const incomingLatestWeightKg = normalizeWeightKg(incomingWeight?.latestWeightKg);
  const incomingWeightUpdatedAt = incomingWeight?.updatedAt || prepared.payload.exportedAt;
  const shouldRestoreHealthMetrics =
    Boolean(incomingWeight && (incomingWeight.metrics || incomingLatestWeightKg)) &&
    (
      !currentHealthMetrics ||
      toTime(incomingWeightUpdatedAt) > getHealthMetricsUpdatedAt(currentHealthMetrics) ||
      (!currentWeightKg && incomingLatestWeightKg > 0)
    );
  const mergedHealthMetrics = shouldRestoreHealthMetrics && incomingWeight
    ? {
        ...(currentHealthMetrics || {}),
        ...(incomingWeight.metrics || {}),
        ...(incomingLatestWeightKg
          ? {
              weight: incomingLatestWeightKg,
              currentWeight: incomingLatestWeightKg,
            }
          : {}),
        updatedAt: incomingWeightUpdatedAt,
      }
    : null;
  const currentMergedWeightLogs = mergeWeightTrendLogs(currentWeightLogs, [], scope);
  const mergedWeightLogs = incomingWeight?.logs?.length
    ? mergeWeightTrendLogs(currentWeightLogs, incomingWeight.logs, scope)
    : null;
  const shouldWriteWeightLogs =
    Boolean(mergedWeightLogs) &&
    JSON.stringify(mergedWeightLogs) !== JSON.stringify(currentMergedWeightLogs);
  const weightWrites: Promise<void>[] = [];

  if (mergedHealthMetrics) {
    weightWrites.push(AsyncStorage.setItem(HEALTH_METRICS_STORAGE_KEY, JSON.stringify(mergedHealthMetrics)));
  }
  if (shouldWriteWeightLogs && mergedWeightLogs) {
    weightWrites.push(AsyncStorage.setItem(WEIGHT_TREND_LOGS_STORAGE_KEY, JSON.stringify(mergedWeightLogs)));
  }
  if (weightWrites.length) {
    await Promise.all(weightWrites);
  }

  const nutritionRestore = await mergeNutritionIntakeIntoDashboardCache(prepared.payload.days, scope);
  const mealPlanRestore = await mergeMealPlansIntoStorage(
    prepared.payload.mealPlanner?.mealPlans || [],
    prepared.payload.exportedAt
  );
  const groceryRestore = await mergeGroceryStateIntoStorage(
    prepared.payload.mealPlanner?.groceryState,
    prepared.payload.exportedAt
  );
  const noteRestore = await mergeNotesIntoStorage(
    prepared.payload.notes || [],
    prepared.payload.exportedAt
  );
  const restoredWeightData = Boolean(mergedHealthMetrics || shouldWriteWeightLogs);
  const restoredActivityData = changedWalkingDays > 0 || changedWorkoutDays > 0;
  const restoredNutritionData = nutritionRestore.changedDayCount > 0;
  const restoredMealPlans = mealPlanRestore.changedMealPlanCount > 0;
  const restoredGroceryState = groceryRestore.changedGroceryItemCount > 0;
  const restoredNotes = noteRestore.changedNoteCount > 0;
  const restoredKeys = [
    ...(changedWalkingDays > 0 ? [WALKING_PROGRESS_STORAGE_KEY] : []),
    ...(changedWorkoutDays > 0 ? [LOCAL_EXERCISE_PROGRESS_KEY] : []),
    ...nutritionRestore.cacheKeys,
    ...(emergencyRestore ? [emergencyRestore.storageKey] : []),
    ...(mergedHealthMetrics ? [HEALTH_METRICS_STORAGE_KEY] : []),
    ...(shouldWriteWeightLogs ? [WEIGHT_TREND_LOGS_STORAGE_KEY] : []),
    ...(restoredMealPlans ? [mealPlanRestore.storageKey] : []),
    ...(restoredGroceryState ? [groceryRestore.storageKey] : []),
    ...(restoredNotes ? [noteRestore.storageKey] : []),
  ];
  const restoredItemCount =
    changedWalkingDays +
    changedWorkoutDays +
    nutritionRestore.changedDayCount +
    mealPlanRestore.changedMealPlanCount +
    groceryRestore.changedGroceryItemCount +
    noteRestore.changedNoteCount +
    (emergencyRestore ? 1 : 0) +
    (restoredWeightData ? 1 : 0);

  localSyncEvents.emitRestore({
    restoredAt: new Date().toISOString(),
    restoredItemCount,
    restoredKeys,
  });

  if (restoredItemCount > 0) {
    queueAccountScopedStorageCloudSync('qr-activity-import');
  }

  return {
    restoredItemCount,
    restoredKeys,
    restoredActivityData,
    restoredNutritionData,
    restoredEmergencyWhatsApp: Boolean(emergencyRestore),
    restoredWeightData,
    restoredMealPlans,
    restoredGroceryState,
    restoredNotes,
    preview: prepared.preview,
  };
};
