import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";

export const LEGACY_DASHBOARD_CACHE_KEY = "JsonResponse";
export const LEGACY_WEEKLY_TRACKING_ID_KEY = "weeklyTrackingId";
export const DASHBOARD_CACHE_KEY_PREFIX = "JsonResponse:";
export const WEEKLY_TRACKING_ID_KEY_PREFIX = "weeklyTrackingId:";
export const DASHBOARD_CACHE_SCHEMA_VERSION = 2;

const USER_KEY = "fitfaat_user";
const LEGACY_USER_KEY = "fitfaat_user_data";

type DashboardCacheEnvelope<T = any> = {
  data: T;
  timestamp: Date;
  savedAt?: string;
  userId?: string | null;
  weeklyTrackingId?: string | null;
  schemaVersion?: number;
};

type ParsedDashboardCacheEnvelope<T = any> = {
  data: T;
  timestamp: Date;
  savedAt?: string;
  userId?: string | null;
  weeklyTrackingId?: string | null;
  schemaVersion?: number;
};

export const getDashboardUserIdentity = (user: any) => {
  const id = user?._id || user?.id || user?.userId || user?.email || user?.username;
  return id ? String(id) : null;
};

const getStoredDashboardUser = async () => {
  try {
    const rawUser =
      (await SecureStore.getItemAsync(USER_KEY)) ||
      (await SecureStore.getItemAsync(LEGACY_USER_KEY));

    return rawUser ? JSON.parse(rawUser) : null;
  } catch (error) {
    console.error("Error reading user for dashboard storage:", error);
    return null;
  }
};

const encodeKeyPart = (value: string) => encodeURIComponent(value);

const getWeeklyTrackingIdFromUser = (user: any) => {
  const weeklyTrackingId =
    user?.weeklyTrackingId ||
    user?.currentWeeklyTrackingId ||
    user?.weeklyTracking?._id ||
    user?.weeklyTracking?.id;

  return weeklyTrackingId ? String(weeklyTrackingId) : null;
};

const parseValidDate = (value: unknown) => {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  return null;
};

const parseDashboardCacheValue = <T = any>(
  rawValue: string | null
): ParsedDashboardCacheEnvelope<T> | null => {
  if (!rawValue) return null;

  try {
    const parsed = JSON.parse(rawValue);
    if (!parsed || typeof parsed !== "object") return null;

    const parsedRecord = parsed as Record<string, any>;
    const timestamp =
      parseValidDate(parsedRecord.timestamp) ||
      parseValidDate(parsedRecord.savedAt) ||
      new Date();

    return {
      data: (parsedRecord.data !== undefined ? parsedRecord.data : parsed) as T,
      timestamp,
      savedAt: typeof parsedRecord.savedAt === "string" ? parsedRecord.savedAt : undefined,
      userId: parsedRecord.userId ? String(parsedRecord.userId) : null,
      weeklyTrackingId: parsedRecord.weeklyTrackingId
        ? String(parsedRecord.weeklyTrackingId)
        : null,
      schemaVersion:
        typeof parsedRecord.schemaVersion === "number"
          ? parsedRecord.schemaVersion
          : undefined,
    };
  } catch (error) {
    console.error("Error parsing dashboard cache:", error);
    return null;
  }
};

const isCacheEnvelopeForScope = (
  envelope: ParsedDashboardCacheEnvelope | null,
  userId?: string | null,
  weeklyTrackingId?: string | null
) => {
  if (!envelope) return false;
  if (!userId || !weeklyTrackingId) return true;

  return (
    envelope.schemaVersion === DASHBOARD_CACHE_SCHEMA_VERSION &&
    envelope.userId === userId &&
    envelope.weeklyTrackingId === weeklyTrackingId
  );
};

const buildDashboardCacheEnvelope = async (
  value: unknown,
  user?: any,
  weeklyTrackingId?: string | null
) => {
  const accountUser = user || (await getStoredDashboardUser());
  const userId = getDashboardUserIdentity(accountUser);
  const resolvedWeeklyTrackingId =
    weeklyTrackingId || (await getStoredWeeklyTrackingId(accountUser));
  const serializedValue = typeof value === "string" ? value : JSON.stringify(value);
  const parsedValue = parseDashboardCacheValue(serializedValue);
  const timestamp = parsedValue?.timestamp || new Date();

  return {
    data: parsedValue?.data ?? value,
    timestamp: timestamp.toISOString(),
    savedAt: new Date().toISOString(),
    userId,
    weeklyTrackingId: resolvedWeeklyTrackingId ? String(resolvedWeeklyTrackingId) : null,
    schemaVersion: DASHBOARD_CACHE_SCHEMA_VERSION,
  };
};

export const getScopedWeeklyTrackingIdKey = async (user?: any) => {
  const accountUser = user || (await getStoredDashboardUser());
  const identity = getDashboardUserIdentity(accountUser);
  return identity ? `${WEEKLY_TRACKING_ID_KEY_PREFIX}${encodeKeyPart(identity)}` : null;
};

export const getStoredWeeklyTrackingId = async (user?: any) => {
  const accountUser = user || (await getStoredDashboardUser());
  const scopedKey = await getScopedWeeklyTrackingIdKey(accountUser);
  const userWeeklyTrackingId = getWeeklyTrackingIdFromUser(accountUser);

  try {
    if (userWeeklyTrackingId) {
      if (scopedKey) {
        await AsyncStorage.setItem(scopedKey, userWeeklyTrackingId);
      }
      await AsyncStorage.setItem(LEGACY_WEEKLY_TRACKING_ID_KEY, userWeeklyTrackingId);
      return userWeeklyTrackingId;
    }

    const scopedValue = scopedKey ? await AsyncStorage.getItem(scopedKey) : null;
    if (scopedValue) return scopedValue;

    const legacyValue = await AsyncStorage.getItem(LEGACY_WEEKLY_TRACKING_ID_KEY);
    const nextValue = legacyValue || null;

    if (nextValue && scopedKey) {
      await AsyncStorage.setItem(scopedKey, nextValue);
    }

    return nextValue;
  } catch (error) {
    console.error("Error reading weekly tracking id:", error);
    return userWeeklyTrackingId ? String(userWeeklyTrackingId) : null;
  }
};

export const setStoredWeeklyTrackingId = async (weeklyTrackingId: string, user?: any) => {
  const value = String(weeklyTrackingId);
  const scopedKey = await getScopedWeeklyTrackingIdKey(user);
  const writes: [string, string][] = [[LEGACY_WEEKLY_TRACKING_ID_KEY, value]];

  if (scopedKey) {
    writes.push([scopedKey, value]);
  }

  await AsyncStorage.multiSet(writes);
};

export const removeStoredWeeklyTrackingId = async (user?: any) => {
  const scopedKey = await getScopedWeeklyTrackingIdKey(user);
  const keys = [LEGACY_WEEKLY_TRACKING_ID_KEY, ...(scopedKey ? [scopedKey] : [])];
  await AsyncStorage.multiRemove(keys);
};

export const getScopedDashboardCacheKey = async (
  user?: any,
  weeklyTrackingId?: string | null
) => {
  const accountUser = user || (await getStoredDashboardUser());
  const identity = getDashboardUserIdentity(accountUser);
  const weeklyId = weeklyTrackingId || (await getStoredWeeklyTrackingId(accountUser));

  return identity && weeklyId
    ? `${DASHBOARD_CACHE_KEY_PREFIX}${encodeKeyPart(identity)}:${encodeKeyPart(String(weeklyId))}`
    : LEGACY_DASHBOARD_CACHE_KEY;
};

export const getStoredDashboardCache = async <T = any>(
  user?: any,
  weeklyTrackingId?: string | null
): Promise<DashboardCacheEnvelope<T> | null> => {
  const accountUser = user || (await getStoredDashboardUser());
  const identity = getDashboardUserIdentity(accountUser);
  const resolvedWeeklyTrackingId = weeklyTrackingId || (await getStoredWeeklyTrackingId(accountUser));
  const cacheKey = await getScopedDashboardCacheKey(user, weeklyTrackingId);
  const scopedValue = await AsyncStorage.getItem(cacheKey);
  const scopedEnvelope = parseDashboardCacheValue<T>(scopedValue);

  if (isCacheEnvelopeForScope(scopedEnvelope, identity, resolvedWeeklyTrackingId)) {
    return scopedEnvelope;
  }

  if (scopedValue || cacheKey === LEGACY_DASHBOARD_CACHE_KEY) {
    return null;
  }

  const legacyValue = await AsyncStorage.getItem(LEGACY_DASHBOARD_CACHE_KEY);
  const legacyEnvelope = parseDashboardCacheValue<T>(legacyValue);
  if (!isCacheEnvelopeForScope(legacyEnvelope, identity, resolvedWeeklyTrackingId)) {
    return null;
  }

  await AsyncStorage.setItem(cacheKey, legacyValue as string);
  return legacyEnvelope;
};

export const setStoredDashboardCache = async (
  value: unknown,
  user?: any,
  weeklyTrackingId?: string | null
) => {
  const cacheKey = await getScopedDashboardCacheKey(user, weeklyTrackingId);
  const envelope = await buildDashboardCacheEnvelope(value, user, weeklyTrackingId);

  await AsyncStorage.setItem(cacheKey, JSON.stringify(envelope));
};

export const removeStoredDashboardCache = async (
  user?: any,
  weeklyTrackingId?: string | null
) => {
  const cacheKey = await getScopedDashboardCacheKey(user, weeklyTrackingId);
  const keys = [LEGACY_DASHBOARD_CACHE_KEY, ...(cacheKey !== LEGACY_DASHBOARD_CACHE_KEY ? [cacheKey] : [])];
  await AsyncStorage.multiRemove(keys);
};
