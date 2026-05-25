import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { clearAllRequestJsonCaches, fetchWithTimeout } from '../apiHelper';
import { getBackendUrl } from '../config';
import {
  buildHealthDataCloudItems,
  HEALTH_SYNC_SNAPSHOT_KEY,
  isHealthDataSyncStorageKey,
  mergeHealthDataFromStorageItems,
  prepareHealthDataCloudBackupItems,
  readLocalHealthDataSnapshot,
} from '../healthDataSync';
import {
  FITFAAT_GROCERY_LISTS_STORAGE_KEY,
  FITFAAT_MEAL_PLANS_STORAGE_KEY,
} from '../localMealPlanner';
import { FITFAAT_NOTES_STORAGE_KEY } from '../localNotes';
import {
  DASHBOARD_CACHE_KEY_PREFIX,
  LEGACY_DASHBOARD_CACHE_KEY,
  LEGACY_WEEKLY_TRACKING_ID_KEY,
  WEEKLY_TRACKING_ID_KEY_PREFIX,
} from '../dashboardStorage';

const TOKEN_KEY = 'fitfaat_auth_token';
const LEGACY_TOKEN_KEY = 'authToken';
const USER_KEY = 'fitfaat_user';
const LEGACY_USER_KEY = 'fitfaat_user_data';
const LOCAL_ACCOUNT_STORAGE_PREFIX = 'fitfaat_account_local_snapshot:';
let isCloudAccountStorageUnavailable = false;

const ACCOUNT_BACKEND_CACHE_KEYS = [
  LEGACY_WEEKLY_TRACKING_ID_KEY,
  LEGACY_DASHBOARD_CACHE_KEY,
  'profileAppointments',
  'appointments',
  'doctorPortalAnalyticsAppointments',
  'doctorPortalChatsAppointments',
  'doctorPatientManagementAppointments',
  'hourly_motivation_notification_id',
  'badge_count',
];

const BACKEND_REFRESH_CACHE_KEYS = [
  LEGACY_WEEKLY_TRACKING_ID_KEY,
  LEGACY_DASHBOARD_CACHE_KEY,
  'profileAppointments',
  'appointments',
  'doctorPortalAnalyticsAppointments',
  'doctorPortalChatsAppointments',
  'doctorPatientManagementAppointments',
];

const BACKEND_REFRESH_CACHE_PREFIXES = [
  WEEKLY_TRACKING_ID_KEY_PREFIX,
  DASHBOARD_CACHE_KEY_PREFIX,
];

const ACCOUNT_LOCAL_BACKUP_EXTRA_KEYS = [
  LEGACY_WEEKLY_TRACKING_ID_KEY,
  LEGACY_DASHBOARD_CACHE_KEY,
];

const ACCOUNT_SYNC_KEYS = [
  HEALTH_SYNC_SNAPSHOT_KEY,
  'fitfaat_health_metrics',
  'chatbot_sessions',
  'favoriteExercises',
  'completedWorkouts',
  'fitfaat_completed_workouts',
  'fitfaat_weight_logs',
  'fitfaat_early_logs',
  'fitfaat_unlocked_badges',
  'fitfaat_local_exercise_progress',
  'fitfaat_adaptive_goal_carry_forward',
  'fitfaat_diet_preference',
  'fitfaat_step_counter_history',
  'fitfaat_step_counter_goal',
  'fitfaat_step_counter_permission',
  'fitfaat_goal_display_mode',
  'fitfaat_activity_heatmap_snapshots',
  'fitfaat_breathing_sessions',
  'fitfaat_meal_templates',
  FITFAAT_MEAL_PLANS_STORAGE_KEY,
  FITFAAT_GROCERY_LISTS_STORAGE_KEY,
  FITFAAT_NOTES_STORAGE_KEY,
  'fitfaat_read_news',
  'notification_settings',
  'privacySettings',
  'fitfaat_nutrition_reports_v1',
  'fitfaat_weekly_scores_v1',
  'fitfaat_habit_missions_v1',
  'fitfaat_behavior_checkins_v1',
  'fitfaat_mini_lessons_seen_v1',
  'fitfaat_craving_logs_v1',
  'fitfaat_habit_preferences_v1',
];

const ACCOUNT_SYNC_PREFIXES = [
  WEEKLY_TRACKING_ID_KEY_PREFIX,
  DASHBOARD_CACHE_KEY_PREFIX,
  'fitfaat_nutrition_profile_entries:',
  'fitfaat_nutrition_profile_notifications:',
  'dashboardMood:',
  'fitfaat_end_day_recap_seen:',
];

const ACCOUNT_LOCAL_ONLY_PREFIXES = [
  'fitfaat_progress_photos:',
];

const ACCOUNT_CLEAR_KEYS = [
  ...ACCOUNT_BACKEND_CACHE_KEYS,
  ...ACCOUNT_SYNC_KEYS,
];

const ACCOUNT_CLEAR_PREFIXES = [
  ...ACCOUNT_SYNC_PREFIXES,
  ...ACCOUNT_LOCAL_ONLY_PREFIXES,
];

export type AccountScopedStorageExportItem = {
  key: string;
  value: string;
  updatedAt?: string;
};

const getSyncStorageUrl = () => {
  const backendUrl = getBackendUrl();
  return backendUrl ? `${backendUrl.replace(/\/$/, '')}/user/sync-storage` : null;
};

const getSyncToken = async () => {
  try {
    return (
      (await SecureStore.getItemAsync(TOKEN_KEY))
      || (await SecureStore.getItemAsync(LEGACY_TOKEN_KEY))
    );
  } catch (error) {
    console.error('Error reading token for account sync:', error);
    return null;
  }
};

const getStoredKeysByPrefixes = async (prefixes: string[]) => {
  const storedKeys = await AsyncStorage.getAllKeys();
  return storedKeys.filter((key) => prefixes.some((prefix) => key.startsWith(prefix)));
};

const getAccountScopedStorageKeys = async (mode: 'clear' | 'sync') => {
  const fixedKeys = mode === 'sync' ? ACCOUNT_SYNC_KEYS : ACCOUNT_CLEAR_KEYS;
  const prefixes = mode === 'sync' ? ACCOUNT_SYNC_PREFIXES : ACCOUNT_CLEAR_PREFIXES;
  const prefixedKeys = await getStoredKeysByPrefixes(prefixes);

  return Array.from(new Set([...fixedKeys, ...prefixedKeys]));
};

const getLocalSnapshotStorageKeys = async () => {
  const prefixedKeys = await getStoredKeysByPrefixes([
    ...ACCOUNT_SYNC_PREFIXES,
    ...ACCOUNT_LOCAL_ONLY_PREFIXES,
  ]);

  return Array.from(new Set([...ACCOUNT_SYNC_KEYS, ...ACCOUNT_LOCAL_BACKUP_EXTRA_KEYS, ...prefixedKeys]));
};

export const getUserStorageIdentity = (user: any) => {
  const id = user?._id || user?.id || user?.userId || user?.email || user?.username;
  return id ? String(id) : null;
};

const getStoredUser = async () => {
  try {
    const rawUser =
      (await SecureStore.getItemAsync(USER_KEY))
      || (await SecureStore.getItemAsync(LEGACY_USER_KEY));

    return rawUser ? JSON.parse(rawUser) : null;
  } catch (error) {
    console.error('Error reading user for account storage:', error);
    return null;
  }
};

export const getCurrentAccountStorageIdentity = async () =>
  getUserStorageIdentity(await getStoredUser());

const getLocalSnapshotKey = (user: any) => {
  const identity = getUserStorageIdentity(user);
  return identity ? `${LOCAL_ACCOUNT_STORAGE_PREFIX}${encodeURIComponent(identity)}` : null;
};

const normalizeExportItemValue = (value: unknown) =>
  typeof value === 'string' ? value : JSON.stringify(value);

const toTime = (value?: string | null) => {
  if (!value) return 0;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
};

const isBackendDerivedStorageKey = (key: string) =>
  BACKEND_REFRESH_CACHE_KEYS.includes(key) ||
  BACKEND_REFRESH_CACHE_PREFIXES.some((prefix) => key.startsWith(prefix));

const getStoredValueUpdatedAt = (value?: string | null) => {
  if (!value) return null;

  try {
    const parsed = JSON.parse(value);
    const rawUpdatedAt =
      parsed?.updatedAt ||
      parsed?.savedAt ||
      parsed?.timestamp ||
      parsed?.data?.updatedAt ||
      parsed?.data?.timestamp ||
      parsed?.metricsUpdatedAt ||
      parsed?.weightLogsUpdatedAt ||
      parsed?.carryForwardUpdatedAt;

    return typeof rawUpdatedAt === 'string' || typeof rawUpdatedAt === 'number'
      ? new Date(rawUpdatedAt).toISOString()
      : null;
  } catch {
    return null;
  }
};

const getIncomingItemUpdatedAt = (item: AccountScopedStorageExportItem) =>
  item.updatedAt || getStoredValueUpdatedAt(item.value) || null;

const shouldRestoreStorageItem = (
  incoming: AccountScopedStorageExportItem,
  currentValue?: string | null
) => {
  if (currentValue === undefined || currentValue === null) return true;

  const incomingTime = toTime(getIncomingItemUpdatedAt(incoming));
  const currentTime = toTime(getStoredValueUpdatedAt(currentValue));

  if (incomingTime <= 0 && currentTime <= 0) return false;
  if (incomingTime <= 0) return false;

  return incomingTime > currentTime;
};

export const buildAccountScopedStorageExport = async () => {
  const accountUser = await getStoredUser();
  const keysToSync = await getLocalSnapshotStorageKeys();
  const healthSnapshot = await readLocalHealthDataSnapshot();
  const healthItems = buildHealthDataCloudItems(healthSnapshot).map((item) => ({
    key: item.key,
    value: normalizeExportItemValue(item.value),
    updatedAt: item.updatedAt,
  }));
  const healthKeys = new Set(healthItems.map((item) => item.key));
  const storedPairs = await AsyncStorage.multiGet(
    keysToSync.filter((key) => !healthKeys.has(key))
  );
  const updatedAt = new Date().toISOString();
  const items: AccountScopedStorageExportItem[] = [
    ...healthItems,
    ...storedPairs
      .filter((pair): pair is [string, string] => typeof pair[1] === 'string')
      .map(([key, value]) => ({
        key,
        value,
        updatedAt: getStoredValueUpdatedAt(value) || updatedAt,
      })),
  ];

  return {
    userIdentity: getUserStorageIdentity(accountUser),
    items,
  };
};

export const restoreAccountScopedStorageItems = async (
  items: AccountScopedStorageExportItem[],
  options: { backupAfterRestore?: boolean } = {}
) => {
  const normalizedItems = items
    .filter((item) => item && typeof item.key === 'string' && typeof item.value === 'string')
    .map((item) => ({
      key: item.key,
      value: item.value,
      updatedAt: getIncomingItemUpdatedAt(item) || undefined,
    }));

  const pairs = normalizedItems.map((item) => [item.key, item.value] as [string, string]);
  const healthItems = normalizedItems
    .filter((item) => item && typeof item.key === 'string')
    .map((item) => ({
      key: item.key,
      value: item.value,
      updatedAt: item.updatedAt,
    }));
  const genericPairs = pairs.filter(([key]) => !isHealthDataSyncStorageKey(key));

  if (genericPairs.length) {
    const genericItems = normalizedItems.filter((item) => !isHealthDataSyncStorageKey(item.key));
    const currentPairs = await AsyncStorage.multiGet(genericItems.map((item) => item.key));
    const currentByKey = new Map(currentPairs);
    const pairsToRestore = genericItems
      .filter((item) => shouldRestoreStorageItem(item, currentByKey.get(item.key)))
      .map((item) => [item.key, item.value] as [string, string]);

    if (pairsToRestore.length) {
      await AsyncStorage.multiSet(pairsToRestore);
    }
  }

  if (healthItems.length) {
    await mergeHealthDataFromStorageItems(healthItems);
  }

  if (options.backupAfterRestore !== false) {
    await backupAccountScopedStorageLocally();
  }

  return {
    restoredItemCount: pairs.length,
  };
};

export const backupAccountScopedStorageLocally = async (user?: any) => {
  try {
    const accountUser = user || await getStoredUser();
    const snapshotKey = getLocalSnapshotKey(accountUser);
    if (!snapshotKey) return;

    const keysToSync = await getLocalSnapshotStorageKeys();
    if (!keysToSync.length) return;

    const storedPairs = await AsyncStorage.multiGet(keysToSync);
    const updatedAt = new Date().toISOString();
    const items = storedPairs
      .filter((pair): pair is [string, string] => typeof pair[1] === 'string')
      .map(([key, value]) => ({
        key,
        value,
        updatedAt: getStoredValueUpdatedAt(value) || updatedAt,
      }));

    await AsyncStorage.setItem(
      snapshotKey,
      JSON.stringify({
        updatedAt,
        items,
      })
    );
  } catch (error) {
    console.error('Error backing up account scoped storage locally:', error);
  }
};

export const restoreAccountScopedStorageLocally = async (user?: any) => {
  try {
    const accountUser = user || await getStoredUser();
    const snapshotKey = getLocalSnapshotKey(accountUser);
    if (!snapshotKey) return;

    const rawSnapshot = await AsyncStorage.getItem(snapshotKey);
    if (!rawSnapshot) return;

    const snapshot = JSON.parse(rawSnapshot);
    const items: AccountScopedStorageExportItem[] = Array.isArray(snapshot?.items)
      ? snapshot.items
          .map((item: any) => {
            if (
              Array.isArray(item) &&
              typeof item[0] === 'string' &&
              typeof item[1] === 'string'
            ) {
              const valueUpdatedAt = getStoredValueUpdatedAt(item[1]);
              return {
                key: item[0],
                value: item[1],
                updatedAt:
                  valueUpdatedAt ||
                  (isBackendDerivedStorageKey(item[0])
                    ? undefined
                    : typeof snapshot?.updatedAt === 'string'
                      ? snapshot.updatedAt
                      : undefined),
              };
            }

            if (item && typeof item.key === 'string' && typeof item.value === 'string') {
              const valueUpdatedAt = getStoredValueUpdatedAt(item.value);
              return {
                key: item.key,
                value: item.value,
                updatedAt:
                  item.updatedAt ||
                  valueUpdatedAt ||
                  (isBackendDerivedStorageKey(item.key) ? undefined : snapshot?.updatedAt),
              };
            }

            return null;
          })
          .filter((item: AccountScopedStorageExportItem | null): item is AccountScopedStorageExportItem => Boolean(item))
      : [];

    await restoreAccountScopedStorageItems(items);
  } catch (error) {
    console.error('Error restoring account scoped storage locally:', error);
  }
};

export const backupAccountScopedStorageToCloud = async () => {
  try {
    const syncUrl = getSyncStorageUrl();
    const token = await getSyncToken();
    if (!syncUrl || !token || isCloudAccountStorageUnavailable) return;

    const healthItems = await prepareHealthDataCloudBackupItems();
    const keysToSync = (await getAccountScopedStorageKeys('sync'))
      .filter((key) => !isHealthDataSyncStorageKey(key));

    const storedPairs = await AsyncStorage.multiGet(keysToSync);
    const updatedAt = new Date().toISOString();
    const items = [
      ...healthItems,
      ...storedPairs
        .filter((pair): pair is [string, string] => typeof pair[1] === 'string')
        .map(([key, value]) => ({
          key,
          value,
          updatedAt: getStoredValueUpdatedAt(value) || updatedAt,
        })),
    ];

    if (!items.length) return;

    const response = await fetchWithTimeout(syncUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ items }),
    }, 8000);

    if (response.status === 404 || response.status === 405) {
      isCloudAccountStorageUnavailable = true;
      return;
    }

    if (!response.ok) {
      console.warn('Account storage backup failed:', response.status);
    }
  } catch (error) {
    console.error('Error backing up account scoped storage:', error);
  }
};

export const restoreAccountScopedStorageFromCloud = async () => {
  try {
    const syncUrl = getSyncStorageUrl();
    const token = await getSyncToken();
    if (!syncUrl || !token || isCloudAccountStorageUnavailable) return;

    const response = await fetchWithTimeout(syncUrl, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }, 7000);

    if (response.status === 404 || response.status === 405) {
      isCloudAccountStorageUnavailable = true;
      return;
    }

    if (!response.ok) {
      console.warn('Account storage restore failed:', response.status);
      return;
    }

    const data = await response.json();
    const items = Array.isArray(data?.items) ? data.items : [];

    await restoreAccountScopedStorageItems(
      items
        .filter((item: any) => item && typeof item.key === 'string' && item.value != null)
        .map((item: any) => ({
          key: item.key,
          value: typeof item.value === 'string' ? item.value : JSON.stringify(item.value),
          updatedAt: item.updatedAt,
        })),
      { backupAfterRestore: false }
    );
  } catch (error) {
    console.error('Error restoring account scoped storage:', error);
  }
};

export const clearAccountScopedStorage = async () => {
  try {
    await backupAccountScopedStorageLocally();

    const keysToRemove = await getAccountScopedStorageKeys('clear');

    if (keysToRemove.length) {
      await AsyncStorage.multiRemove(keysToRemove);
    }

    await clearAllRequestJsonCaches();
  } catch (error) {
    console.error('Error clearing account scoped storage:', error);
  }
};

export const clearBackendDerivedAccountStorage = async () => {
  try {
    const prefixedKeys = await getStoredKeysByPrefixes(BACKEND_REFRESH_CACHE_PREFIXES);
    const keysToRemove = Array.from(new Set([...BACKEND_REFRESH_CACHE_KEYS, ...prefixedKeys]));

    if (keysToRemove.length) {
      await AsyncStorage.multiRemove(keysToRemove);
    }

    await clearAllRequestJsonCaches();
  } catch (error) {
    console.error('Error clearing backend derived account storage:', error);
  }
};

export const shouldClearAccountStorageForLogin = (previousUser: any, nextUser: any) => {
  const previousIdentity = getUserStorageIdentity(previousUser);
  const nextIdentity = getUserStorageIdentity(nextUser);

  if (!previousIdentity || !nextIdentity) {
    return true;
  }

  return previousIdentity !== nextIdentity;
};
