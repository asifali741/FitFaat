import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import {
  HEALTH_METRICS_STORAGE_KEY,
  WEIGHT_TREND_LOGS_STORAGE_KEY,
  type WeightTrendLogEntry,
} from './adaptiveGoals';
import { fetchWithTimeout } from './apiHelper';
import { getBackendUrl } from './config';

const TOKEN_KEY = 'fitfaat_auth_token';
const LEGACY_TOKEN_KEY = 'authToken';
const USER_KEY = 'fitfaat_user';
const LEGACY_USER_KEY = 'fitfaat_user_data';

export const HEALTH_SYNC_SNAPSHOT_KEY = 'fitfaat_health_sync_snapshot';
export const HEALTH_SYNC_STORAGE_KEYS = [
  HEALTH_SYNC_SNAPSHOT_KEY,
  HEALTH_METRICS_STORAGE_KEY,
  WEIGHT_TREND_LOGS_STORAGE_KEY,
];

const HEALTH_SYNC_TIMEOUT_MS = 3600;
const MAX_WEIGHT_LOGS_TO_SYNC = 120;
let healthDataSyncInFlight: Promise<HealthDataSyncSnapshot | null> | null = null;

type StorageItem = {
  key: string;
  value: unknown;
  updatedAt?: string;
};

export type HealthDataSyncSnapshot = {
  schemaVersion: 1;
  userId?: string | null;
  updatedAt: string;
  metrics?: Record<string, any> | null;
  metricsUpdatedAt?: string | null;
  weightLogs?: WeightTrendLogEntry[];
  weightLogsUpdatedAt?: string | null;
};

type CloudSnapshotResult = {
  snapshot: HealthDataSyncSnapshot | null;
  items: StorageItem[];
};

export const isHealthDataSyncStorageKey = (key: string) =>
  HEALTH_SYNC_STORAGE_KEYS.includes(key);

const parseJsonValue = (value: unknown) => {
  if (typeof value !== 'string') return value;

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

const toTime = (value: unknown) => {
  if (!value) return 0;
  if (typeof value === 'number' && Number.isFinite(value)) return value;

  const parsed = new Date(String(value)).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
};

const toIso = (time: number) =>
  new Date(time > 0 ? time : Date.now()).toISOString();

const getLatestIso = (...values: unknown[]) => {
  const latest = Math.max(...values.map(toTime), 0);
  return toIso(latest);
};

const toFiniteNumber = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeWeightKg = (value: unknown) => {
  const weight = toFiniteNumber(value);
  return weight >= 20 && weight <= 350 ? Math.round(weight * 10) / 10 : 0;
};

const normalizePercentage = (value: unknown) => {
  const percentage = toFiniteNumber(value);
  if (percentage <= 0) return 0;
  if (percentage <= 1) return Math.round(percentage * 1000) / 10;
  return percentage <= 75 ? Math.round(percentage * 10) / 10 : 0;
};

const getLocalDateKey = (value?: string | Date | null) => {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return '';

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getStorageValue = (items: StorageItem[], key: string) =>
  items.find((item) => item.key === key)?.value;

const getStorageUpdatedAt = (items: StorageItem[], key: string) =>
  items.find((item) => item.key === key)?.updatedAt;

const getStoredToken = async () => {
  try {
    return (
      (await SecureStore.getItemAsync(TOKEN_KEY)) ||
      (await SecureStore.getItemAsync(LEGACY_TOKEN_KEY))
    );
  } catch {
    return null;
  }
};

const getStoredUser = async () => {
  try {
    const rawUser =
      (await SecureStore.getItemAsync(USER_KEY)) ||
      (await SecureStore.getItemAsync(LEGACY_USER_KEY));

    return rawUser ? JSON.parse(rawUser) : null;
  } catch {
    return null;
  }
};

const saveStoredUser = async (user: any) => {
  if (!user) return;

  try {
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
  } catch (error) {
    console.error('[HealthDataSync] Error saving merged user metrics:', error);
  }
};

const getUserIdentity = (user: any) => {
  const id = user?._id || user?.id || user?.userId || user?.email || user?.username;
  return id ? String(id) : null;
};

const normalizeMetrics = (value: unknown) => {
  const metrics = parseJsonValue(value);
  if (!metrics || typeof metrics !== 'object' || Array.isArray(metrics)) return null;

  const nextMetrics = { ...(metrics as Record<string, any>) };
  const weight = normalizeWeightKg(
    nextMetrics.weight ?? nextMetrics.weightKg ?? nextMetrics.currentWeight
  );
  const startingWeight = normalizeWeightKg(
    nextMetrics.startingWeightKg ??
      nextMetrics.startingWeight ??
      nextMetrics.startWeightKg ??
      nextMetrics.startWeight ??
      nextMetrics.initialWeightKg ??
      nextMetrics.initialWeight ??
      nextMetrics.originalWeightKg ??
      nextMetrics.originalWeight ??
      nextMetrics.onboardingWeightKg ??
      nextMetrics.onboardingWeight ??
      nextMetrics.baselineWeightKg ??
      nextMetrics.baselineWeight
  );
  const targetWeight = normalizeWeightKg(
    nextMetrics.targetWeight ??
      nextMetrics.targetWeightKg ??
      nextMetrics.goalWeight ??
      nextMetrics.desiredWeight
  );
  const bodyFatPercentage = normalizePercentage(
    nextMetrics.bodyFatPercentage ??
      nextMetrics.bodyFatPercent ??
      nextMetrics.bodyFat ??
      nextMetrics.fatPercentage
  );

  if (weight) {
    nextMetrics.weight = weight;
    nextMetrics.weightKg = weight;
    nextMetrics.currentWeight = weight;
  }

  if (startingWeight) {
    nextMetrics.startingWeightKg = startingWeight;
    nextMetrics.startingWeight = startingWeight;
  }

  if (targetWeight) {
    nextMetrics.targetWeight = targetWeight;
    nextMetrics.targetWeightKg = targetWeight;
    nextMetrics.goalWeight = targetWeight;
  }

  if (bodyFatPercentage) {
    nextMetrics.bodyFatPercentage = bodyFatPercentage;
    nextMetrics.bodyFatPercent = bodyFatPercentage;
    nextMetrics.bodyFat = bodyFatPercentage;
  }

  return nextMetrics;
};

const getMetricsUpdatedAt = (metrics: Record<string, any> | null | undefined, fallback?: unknown) =>
  metrics?.updatedAt ||
  metrics?.lastUpdatedAt ||
  metrics?.syncedAt ||
  fallback ||
  null;

const normalizeWeightLog = (value: any): WeightTrendLogEntry | null => {
  const weightKg = normalizeWeightKg(value?.weightKg ?? value?.weight);
  const dateKey = getLocalDateKey(value?.dateKey || value?.date || value?.loggedAt);
  if (!weightKg || !dateKey) return null;

  const loggedAt = value?.loggedAt && toTime(value.loggedAt) > 0
    ? String(value.loggedAt)
    : `${dateKey}T12:00:00.000Z`;

  return {
    dateKey,
    loggedAt,
    weightKg,
    sourceUserId: value?.sourceUserId ? String(value.sourceUserId) : undefined,
    sourceWeeklyTrackingId: value?.sourceWeeklyTrackingId ?? null,
  };
};

const normalizeWeightLogs = (value: unknown) => {
  const parsed = parseJsonValue(value);
  if (!Array.isArray(parsed)) return [];

  const uniqueByScopeDate = new Map<string, WeightTrendLogEntry>();

  parsed
    .map(normalizeWeightLog)
    .filter(Boolean)
    .sort((a, b) => toTime(b?.loggedAt) - toTime(a?.loggedAt))
    .forEach((log) => {
      if (!log) return;
      const scope = log.sourceUserId || 'local';
      const key = `${scope}:${log.dateKey}`;
      const existing = uniqueByScopeDate.get(key);
      if (!existing || toTime(log.loggedAt) > toTime(existing.loggedAt)) {
        uniqueByScopeDate.set(key, log);
      }
    });

  return Array.from(uniqueByScopeDate.values())
    .sort((a, b) => toTime(b.loggedAt) - toTime(a.loggedAt))
    .slice(0, MAX_WEIGHT_LOGS_TO_SYNC);
};

const getWeightLogsUpdatedAt = (logs: WeightTrendLogEntry[], fallback?: unknown) => {
  const latestLogTime = Math.max(...logs.map((log) => toTime(log.loggedAt)), 0);
  return latestLogTime > 0 ? toIso(latestLogTime) : fallback ? String(fallback) : null;
};

const normalizeSnapshot = (value: unknown): HealthDataSyncSnapshot | null => {
  const parsed = parseJsonValue(value);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;

  const rawSnapshot = parsed as Partial<HealthDataSyncSnapshot>;
  const metrics = normalizeMetrics(rawSnapshot.metrics);
  const weightLogs = normalizeWeightLogs(rawSnapshot.weightLogs);

  if (!metrics && !weightLogs.length) return null;

  const metricsUpdatedAt = metrics
    ? String(rawSnapshot.metricsUpdatedAt || getMetricsUpdatedAt(metrics) || rawSnapshot.updatedAt || '')
    : null;
  const weightLogsUpdatedAt = weightLogs.length
    ? String(rawSnapshot.weightLogsUpdatedAt || getWeightLogsUpdatedAt(weightLogs) || rawSnapshot.updatedAt || '')
    : null;
  const updatedAt = getLatestIso(
    rawSnapshot.updatedAt,
    metricsUpdatedAt,
    weightLogsUpdatedAt
  );

  return {
    schemaVersion: 1,
    userId: rawSnapshot.userId ?? null,
    updatedAt,
    metrics,
    metricsUpdatedAt,
    weightLogs,
    weightLogsUpdatedAt,
  };
};

const buildSnapshotFromValues = async (
  values: {
    metrics?: unknown;
    metricsUpdatedAt?: unknown;
    weightLogs?: unknown;
    weightLogsUpdatedAt?: unknown;
  },
  user?: any
): Promise<HealthDataSyncSnapshot | null> => {
  const metrics = normalizeMetrics(values.metrics);
  const weightLogs = normalizeWeightLogs(values.weightLogs);

  if (!metrics && !weightLogs.length) return null;

  const metricsUpdatedAt = metrics
    ? String(getMetricsUpdatedAt(metrics, values.metricsUpdatedAt) || new Date(0).toISOString())
    : null;
  const weightLogsUpdatedAt = weightLogs.length
    ? String(getWeightLogsUpdatedAt(weightLogs, values.weightLogsUpdatedAt) || new Date(0).toISOString())
    : null;

  return {
    schemaVersion: 1,
    userId: getUserIdentity(user),
    updatedAt: getLatestIso(metricsUpdatedAt, weightLogsUpdatedAt),
    metrics,
    metricsUpdatedAt,
    weightLogs,
    weightLogsUpdatedAt,
  };
};

const mergeMetrics = (
  current?: HealthDataSyncSnapshot | null,
  incoming?: HealthDataSyncSnapshot | null
) => {
  if (!current?.metrics) return incoming?.metrics || null;
  if (!incoming?.metrics) return current.metrics;

  const currentTime = toTime(current.metricsUpdatedAt || current.updatedAt);
  const incomingTime = toTime(incoming.metricsUpdatedAt || incoming.updatedAt);
  const newer = incomingTime >= currentTime ? incoming : current;
  const older = newer === incoming ? current : incoming;

  return {
    ...(older.metrics || {}),
    ...(newer.metrics || {}),
  };
};

const mergeWeightLogs = (...sources: Array<HealthDataSyncSnapshot | null | undefined>) =>
  normalizeWeightLogs(
    sources.flatMap((source) => source?.weightLogs || [])
  );

const mergeSnapshots = (
  current?: HealthDataSyncSnapshot | null,
  incoming?: HealthDataSyncSnapshot | null
): HealthDataSyncSnapshot | null => {
  if (!current) return incoming || null;
  if (!incoming) return current;

  const metrics = mergeMetrics(current, incoming);
  const metricsUpdatedAt = metrics
    ? toTime(incoming.metricsUpdatedAt || incoming.updatedAt) >= toTime(current.metricsUpdatedAt || current.updatedAt)
      ? incoming.metricsUpdatedAt || incoming.updatedAt
      : current.metricsUpdatedAt || current.updatedAt
    : null;
  const weightLogs = mergeWeightLogs(current, incoming);
  const weightLogsUpdatedAt = weightLogs.length
    ? getWeightLogsUpdatedAt(weightLogs, getLatestIso(
        current.weightLogsUpdatedAt,
        incoming.weightLogsUpdatedAt
      ))
    : null;

  if (!metrics && !weightLogs.length) return null;

  return {
    schemaVersion: 1,
    userId: incoming.userId || current.userId || null,
    updatedAt: getLatestIso(
      current.updatedAt,
      incoming.updatedAt,
      metricsUpdatedAt,
      weightLogsUpdatedAt
    ),
    metrics,
    metricsUpdatedAt: metricsUpdatedAt ? String(metricsUpdatedAt) : null,
    weightLogs,
    weightLogsUpdatedAt,
  };
};

export const readLocalHealthDataSnapshot = async () => {
  const [snapshotRaw, metricsRaw, logsRaw, user] = await Promise.all([
    AsyncStorage.getItem(HEALTH_SYNC_SNAPSHOT_KEY),
    AsyncStorage.getItem(HEALTH_METRICS_STORAGE_KEY),
    AsyncStorage.getItem(WEIGHT_TREND_LOGS_STORAGE_KEY),
    getStoredUser(),
  ]);

  const snapshot = normalizeSnapshot(snapshotRaw);
  const rawSnapshot = await buildSnapshotFromValues(
    {
      metrics: metricsRaw,
      weightLogs: logsRaw,
    },
    user
  );

  return mergeSnapshots(snapshot, rawSnapshot);
};

const applyMetricsToStoredUser = async (metrics?: Record<string, any> | null) => {
  if (!metrics) return;

  const storedUser = await getStoredUser();
  if (!storedUser) return;

  const metricPatch: Record<string, any> = {};
  [
    'height',
    'heightCm',
    'heightInCm',
    'weight',
    'weightKg',
    'currentWeight',
    'startingWeight',
    'startingWeightKg',
    'startWeight',
    'startWeightKg',
    'initialWeight',
    'initialWeightKg',
    'originalWeight',
    'originalWeightKg',
    'onboardingWeight',
    'onboardingWeightKg',
    'baselineWeight',
    'baselineWeightKg',
    'startingWeightRecordedAt',
    'startWeightRecordedAt',
    'initialWeightRecordedAt',
    'onboardingWeightRecordedAt',
    'age',
    'gender',
    'activityLevel',
    'fitnessGoal',
    'selectedGoal',
    'goal',
    'goalPace',
    'calorieGoalPace',
    'weightGoalPace',
    'pace',
    'weeklyWorkoutDays',
    'workoutDays',
    'workoutsPerWeek',
    'trainingDaysPerWeek',
    'exerciseDaysPerWeek',
    'exerciseDays',
    'dailySteps',
    'averageDailySteps',
    'avgDailySteps',
    'stepsPerDay',
    'steps',
    'stepGoal',
    'dailyStepGoal',
    'targetSteps',
    'bodyFatPercentage',
    'bodyFatPercent',
    'bodyFat',
    'fatPercentage',
    'targetWeight',
    'targetWeightKg',
    'goalWeight',
    'desiredWeight',
    'workoutIntensity',
    'trainingIntensity',
    'exerciseIntensity',
    'sleepHours',
    'averageSleepHours',
    'avgSleepHours',
    'goalCalories',
    'targetCalories',
    'hydrationGoal',
    'targetHydration',
  ].forEach((key) => {
    if (metrics[key] !== undefined && metrics[key] !== null && metrics[key] !== '') {
      metricPatch[key] = metrics[key];
    }
  });

  if (!Object.keys(metricPatch).length) return;

  const mergedUser = {
    ...storedUser,
    ...metricPatch,
    healthMetrics: {
      ...(storedUser.healthMetrics || {}),
      ...metrics,
    },
    userInfo: {
      ...(storedUser.userInfo || {}),
      ...metricPatch,
    },
  };

  await saveStoredUser(mergedUser);
};

export const writeLocalHealthDataSnapshot = async (
  snapshot: HealthDataSyncSnapshot | null | undefined
) => {
  if (!snapshot) return null;

  const writes: Array<[string, string]> = [
    [HEALTH_SYNC_SNAPSHOT_KEY, JSON.stringify(snapshot)],
  ];

  if (snapshot.metrics) {
    writes.push([
      HEALTH_METRICS_STORAGE_KEY,
      JSON.stringify({
        ...snapshot.metrics,
        updatedAt: snapshot.metricsUpdatedAt || snapshot.updatedAt,
      }),
    ]);
  }

  if (snapshot.weightLogs?.length) {
    writes.push([
      WEIGHT_TREND_LOGS_STORAGE_KEY,
      JSON.stringify(snapshot.weightLogs),
    ]);
  }

  await AsyncStorage.multiSet(writes);
  await applyMetricsToStoredUser(snapshot.metrics);
  return snapshot;
};

const getSyncStorageUrl = () => {
  const backendUrl = getBackendUrl();
  return backendUrl ? `${backendUrl.replace(/\/$/, '')}/user/sync-storage` : null;
};

const fetchCloudItems = async (timeoutMs = HEALTH_SYNC_TIMEOUT_MS): Promise<StorageItem[] | null> => {
  const syncUrl = getSyncStorageUrl();
  const token = await getStoredToken();
  if (!syncUrl || !token) return null;

  const response = await fetchWithTimeout(
    syncUrl,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    },
    timeoutMs
  );

  if (!response.ok) return null;

  const data = await response.json();
  return Array.isArray(data?.items) ? data.items : [];
};

const buildSnapshotFromStorageItems = async (items: StorageItem[]) => {
  const user = await getStoredUser();
  const snapshot = normalizeSnapshot(getStorageValue(items, HEALTH_SYNC_SNAPSHOT_KEY));
  const rawSnapshot = await buildSnapshotFromValues(
    {
      metrics: getStorageValue(items, HEALTH_METRICS_STORAGE_KEY),
      metricsUpdatedAt: getStorageUpdatedAt(items, HEALTH_METRICS_STORAGE_KEY),
      weightLogs: getStorageValue(items, WEIGHT_TREND_LOGS_STORAGE_KEY),
      weightLogsUpdatedAt: getStorageUpdatedAt(items, WEIGHT_TREND_LOGS_STORAGE_KEY),
    },
    user
  );

  return mergeSnapshots(snapshot, rawSnapshot);
};

const fetchCloudSnapshot = async (
  timeoutMs = HEALTH_SYNC_TIMEOUT_MS
): Promise<CloudSnapshotResult | null> => {
  const items = await fetchCloudItems(timeoutMs);
  if (!items) return null;

  return {
    items,
    snapshot: await buildSnapshotFromStorageItems(items),
  };
};

export const buildHealthDataCloudItems = (snapshot: HealthDataSyncSnapshot | null | undefined) => {
  if (!snapshot) return [];

  const items: StorageItem[] = [
    {
      key: HEALTH_SYNC_SNAPSHOT_KEY,
      value: JSON.stringify(snapshot),
      updatedAt: snapshot.updatedAt,
    },
  ];

  if (snapshot.metrics) {
    items.push({
      key: HEALTH_METRICS_STORAGE_KEY,
      value: JSON.stringify({
        ...snapshot.metrics,
        updatedAt: snapshot.metricsUpdatedAt || snapshot.updatedAt,
      }),
      updatedAt: snapshot.metricsUpdatedAt || snapshot.updatedAt,
    });
  }

  if (snapshot.weightLogs?.length) {
    items.push({
      key: WEIGHT_TREND_LOGS_STORAGE_KEY,
      value: JSON.stringify(snapshot.weightLogs),
      updatedAt: snapshot.weightLogsUpdatedAt || snapshot.updatedAt,
    });
  }

  return items;
};

const postCloudItems = async (items: StorageItem[], timeoutMs = HEALTH_SYNC_TIMEOUT_MS) => {
  const syncUrl = getSyncStorageUrl();
  const token = await getStoredToken();
  if (!syncUrl || !token || !items.length) return false;

  const response = await fetchWithTimeout(
    syncUrl,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ items }),
    },
    timeoutMs
  );

  return response.ok;
};

export const syncLatestHealthData = async (
  options: {
    push?: boolean;
    allowPushWithoutRemote?: boolean;
    timeoutMs?: number;
    force?: boolean;
  } = {}
) => {
  if (healthDataSyncInFlight && !options.force) {
    return healthDataSyncInFlight;
  }

  healthDataSyncInFlight = syncLatestHealthDataNow(options).finally(() => {
    healthDataSyncInFlight = null;
  });

  return healthDataSyncInFlight;
};

const syncLatestHealthDataNow = async (
  options: {
    push?: boolean;
    allowPushWithoutRemote?: boolean;
    timeoutMs?: number;
  } = {}
) => {
  const localSnapshot = await readLocalHealthDataSnapshot();
  let cloudResult: CloudSnapshotResult | null = null;

  try {
    cloudResult = await fetchCloudSnapshot(options.timeoutMs);
  } catch (error) {
    console.log('[HealthDataSync] Cloud health restore unavailable:', error);
  }

  const mergedSnapshot = mergeSnapshots(localSnapshot, cloudResult?.snapshot || null);
  if (mergedSnapshot) {
    await writeLocalHealthDataSnapshot(mergedSnapshot);
  }

  if (options.push && mergedSnapshot && (cloudResult || options.allowPushWithoutRemote)) {
    try {
      await postCloudItems(buildHealthDataCloudItems(mergedSnapshot), options.timeoutMs);
    } catch (error) {
      console.log('[HealthDataSync] Cloud health backup unavailable:', error);
    }
  }

  return mergedSnapshot;
};

export const queueHealthDataCloudSync = () => {
  syncLatestHealthData({
    push: true,
    allowPushWithoutRemote: true,
  }).catch((error) => {
    console.log('[HealthDataSync] Background health sync unavailable:', error);
  });
};

export const prepareHealthDataCloudBackupItems = async () => {
  const localSnapshot = await readLocalHealthDataSnapshot();
  if (!localSnapshot) return [];

  let cloudResult: CloudSnapshotResult | null = null;
  try {
    cloudResult = await fetchCloudSnapshot();
  } catch (error) {
    console.log('[HealthDataSync] Skipping health backup until cloud snapshot is readable:', error);
  }

  if (!cloudResult) {
    return [];
  }

  const mergedSnapshot = mergeSnapshots(localSnapshot, cloudResult.snapshot);
  await writeLocalHealthDataSnapshot(mergedSnapshot);
  return buildHealthDataCloudItems(mergedSnapshot);
};

export const mergeHealthDataFromStorageItems = async (items: StorageItem[]) => {
  const incomingSnapshot = await buildSnapshotFromStorageItems(items);
  const localSnapshot = await readLocalHealthDataSnapshot();
  const mergedSnapshot = mergeSnapshots(localSnapshot, incomingSnapshot);

  if (mergedSnapshot) {
    await writeLocalHealthDataSnapshot(mergedSnapshot);
  }

  return mergedSnapshot;
};
