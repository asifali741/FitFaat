import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppState, type AppStateStatus } from "react-native";
import { Pedometer } from "expo-sensors";
import {
  DEFAULT_STEP_GOAL,
  WALKING_PEDOMETER_PERMISSION_STORAGE_KEY,
  WALKING_PROGRESS_STORAGE_KEY,
  WALKING_STEP_GOAL_STORAGE_KEY,
  clampStepGoal,
  cleanWalkingSteps,
  estimateWalkingCalories,
  getWalkingProgressScope,
  loadWalkingCalorieMetrics,
  walkingProgressEntryMatchesScope,
  type WalkingProgressEntry,
  type WalkingProgressScope,
} from "@/utils/localWalkingProgress";

export type WalkingProgressStatus =
  | "loading"
  | "ready"
  | "unavailable"
  | "denied"
  | "error";

export type WalkingProgressSnapshot = {
  steps: number;
  goal: number;
  calories: number;
  targetCalories: number;
  history: WalkingProgressEntry[];
  scope: WalkingProgressScope;
  status: WalkingProgressStatus;
  message: string;
  hasLoaded: boolean;
  hasPedometerPermission: boolean;
  permissionStatus: string | null;
  calorieMetrics: Awaited<ReturnType<typeof loadWalkingCalorieMetrics>>;
  updatedAt: string;
};

type WalkingProgressListener = (snapshot: WalkingProgressSnapshot) => void;

const MAX_HISTORY_DAYS = 45;
const PEDOMETER_HISTORY_SYNC_DAYS = 7;
const LIVE_PERSIST_THROTTLE_MS = 5000;
const LIVE_PERSIST_STEP_DELTA = 25;

let snapshot: WalkingProgressSnapshot = {
  steps: 0,
  goal: DEFAULT_STEP_GOAL,
  calories: 0,
  targetCalories: estimateWalkingCalories(DEFAULT_STEP_GOAL),
  history: [],
  scope: {},
  status: "loading",
  message: "Preparing step sensor",
  hasLoaded: false,
  hasPedometerPermission: false,
  permissionStatus: null,
  calorieMetrics: null,
  updatedAt: new Date().toISOString(),
};

const listeners = new Set<WalkingProgressListener>();
let watchSubscription: Pedometer.Subscription | null = null;
let appStateSubscription: { remove: () => void } | null = null;
let appStateRef: AppStateStatus = AppState.currentState;
let startPromise: Promise<WalkingProgressSnapshot> | null = null;
let hasStarted = false;
let baseSteps = 0;
let lastPersistedSteps = 0;
let lastPersistedAt = 0;

const getDateKey = (value?: string | Date | null) => {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const addDays = (date: Date, amount: number) => {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + amount);
  return nextDate;
};

const getStartOfDay = (value: Date = new Date()) => {
  const start = new Date(value);
  start.setHours(0, 0, 0, 0);
  return start;
};

const getEndOfDay = (value: Date = new Date()) => {
  const end = new Date(value);
  end.setHours(23, 59, 59, 999);
  return end;
};

const getHistoryEntryKey = (
  entry: Pick<WalkingProgressEntry, "dateKey" | "userId" | "weeklyTrackingId">
) => `${entry.userId || "local"}:${entry.weeklyTrackingId || "unscoped"}:${entry.dateKey}`;

const mergeHistoryEntry = (
  history: WalkingProgressEntry[],
  entry: WalkingProgressEntry
) => {
  const historyMap = new Map(history.map((item) => [getHistoryEntryKey(item), item]));
  historyMap.set(getHistoryEntryKey(entry), entry);
  return Array.from(historyMap.values())
    .sort((a, b) => a.dateKey.localeCompare(b.dateKey))
    .slice(-MAX_HISTORY_DAYS);
};

const parseHistory = (
  rawValue: string | null,
  metrics?: Parameters<typeof estimateWalkingCalories>[1]
): WalkingProgressEntry[] => {
  if (!rawValue) return [];

  try {
    const parsed = JSON.parse(rawValue);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((item: any) => {
        const steps = cleanWalkingSteps(item?.steps);
        return {
          dateKey: String(item?.dateKey || ""),
          steps,
          calories: estimateWalkingCalories(steps, metrics),
          goal: clampStepGoal(Number(item?.goal || DEFAULT_STEP_GOAL)),
          updatedAt: String(item?.updatedAt || new Date().toISOString()),
          userId: item?.userId ? String(item.userId) : null,
          weeklyTrackingId: item?.weeklyTrackingId ? String(item.weeklyTrackingId) : null,
        };
      })
      .filter((item) => item.dateKey)
      .sort((a, b) => a.dateKey.localeCompare(b.dateKey))
      .slice(-MAX_HISTORY_DAYS);
  } catch (error) {
    console.log("[LiveWalkingProgress] Failed to parse step history:", error);
    return [];
  }
};

const emitSnapshot = () => {
  listeners.forEach((listener) => listener(snapshot));
};

const updateSnapshot = (partial: Partial<WalkingProgressSnapshot>) => {
  const nextSteps =
    partial.steps !== undefined ? cleanWalkingSteps(partial.steps) : snapshot.steps;
  const nextGoal =
    partial.goal !== undefined ? clampStepGoal(Number(partial.goal)) : snapshot.goal;
  const nextMetrics =
    partial.calorieMetrics !== undefined ? partial.calorieMetrics : snapshot.calorieMetrics;

  snapshot = {
    ...snapshot,
    ...partial,
    steps: nextSteps,
    goal: nextGoal,
    calories: estimateWalkingCalories(nextSteps, nextMetrics),
    targetCalories: estimateWalkingCalories(nextGoal, nextMetrics),
    updatedAt: new Date().toISOString(),
  };
  emitSnapshot();
};

const savePermissionStatus = (status: string) => {
  AsyncStorage.setItem(WALKING_PEDOMETER_PERMISSION_STORAGE_KEY, status).catch((error) => {
    console.log("[LiveWalkingProgress] Failed to save permission status:", error);
  });
};

const persistCurrentSteps = (force = false) => {
  if (!snapshot.hasLoaded) return;

  const now = Date.now();
  const shouldPersist =
    force ||
    Math.abs(snapshot.steps - lastPersistedSteps) >= LIVE_PERSIST_STEP_DELTA ||
    now - lastPersistedAt >= LIVE_PERSIST_THROTTLE_MS;

  if (!shouldPersist) return;

  lastPersistedSteps = snapshot.steps;
  lastPersistedAt = now;

  const todayEntry: WalkingProgressEntry = {
    dateKey: getDateKey(),
    steps: snapshot.steps,
    calories: snapshot.calories,
    goal: snapshot.goal,
    updatedAt: new Date().toISOString(),
    userId: snapshot.scope.userId,
    weeklyTrackingId: snapshot.scope.weeklyTrackingId,
  };

  const nextHistory = mergeHistoryEntry(snapshot.history, todayEntry);
  updateSnapshot({ history: nextHistory });
  AsyncStorage.setItem(WALKING_PROGRESS_STORAGE_KEY, JSON.stringify(nextHistory)).catch(
    (error) => {
      console.log("[LiveWalkingProgress] Failed to save step history:", error);
    }
  );
};

const getRecentPedometerDates = () => {
  const today = getStartOfDay();
  return Array.from({ length: PEDOMETER_HISTORY_SYNC_DAYS }, (_, index) =>
    addDays(today, index - (PEDOMETER_HISTORY_SYNC_DAYS - 1))
  );
};

const queryStepsForDate = async (date: Date) => {
  const start = getStartOfDay(date);
  const end = getDateKey(start) === getDateKey() ? new Date() : getEndOfDay(date);
  const result = await Pedometer.getStepCountAsync(start, end);
  return cleanWalkingSteps(result.steps);
};

const syncPedometerHistory = async (
  currentHistory: WalkingProgressEntry[],
  goal: number,
  metrics: Parameters<typeof estimateWalkingCalories>[1],
  scope: WalkingProgressScope
) => {
  let nextHistory = currentHistory;
  let todaySteps: number | null = null;
  let syncedCount = 0;

  for (const date of getRecentPedometerDates()) {
    const dateKey = getDateKey(date);
    if (!dateKey) continue;

    try {
      const queriedSteps = await queryStepsForDate(date);
      const storedEntry = nextHistory.find(
        (entry) => entry.dateKey === dateKey && walkingProgressEntryMatchesScope(entry, scope)
      );
      const steps = Math.max(cleanWalkingSteps(storedEntry?.steps), queriedSteps);
      const entry: WalkingProgressEntry = {
        dateKey,
        steps,
        calories: estimateWalkingCalories(steps, metrics),
        goal,
        updatedAt: new Date().toISOString(),
        userId: scope.userId,
        weeklyTrackingId: scope.weeklyTrackingId,
      };

      nextHistory = mergeHistoryEntry(nextHistory, entry);
      syncedCount += 1;

      if (dateKey === getDateKey()) {
        todaySteps = steps;
      }
    } catch (error) {
      console.log(`[LiveWalkingProgress] Step history query failed for ${dateKey}:`, error);
    }
  }

  return { history: nextHistory, todaySteps, syncedCount };
};

const loadLocalWalkingState = async () => {
  const [storedGoal, storedHistory, nextCalorieMetrics, nextScope, rawPermissionStatus] =
    await Promise.all([
      AsyncStorage.getItem(WALKING_STEP_GOAL_STORAGE_KEY),
      AsyncStorage.getItem(WALKING_PROGRESS_STORAGE_KEY),
      loadWalkingCalorieMetrics(),
      getWalkingProgressScope(),
      AsyncStorage.getItem(WALKING_PEDOMETER_PERMISSION_STORAGE_KEY),
    ]);

  const nextGoal = clampStepGoal(Number(storedGoal || DEFAULT_STEP_GOAL));
  const nextHistory = parseHistory(storedHistory, nextCalorieMetrics);
  const todayEntry = nextHistory.find(
    (entry) => entry.dateKey === getDateKey() && walkingProgressEntryMatchesScope(entry, nextScope)
  );
  const permissionStatus = rawPermissionStatus || null;

  updateSnapshot({
    goal: nextGoal,
    history: nextHistory,
    scope: nextScope,
    steps: cleanWalkingSteps(todayEntry?.steps),
    calorieMetrics: nextCalorieMetrics,
    hasLoaded: true,
    permissionStatus,
    hasPedometerPermission: String(permissionStatus || "").toLowerCase() === "granted",
  });
  baseSteps = cleanWalkingSteps(todayEntry?.steps);
  lastPersistedSteps = baseSteps;
};

const ensureAppStateListener = () => {
  if (appStateSubscription) return;

  appStateSubscription = AppState.addEventListener("change", (nextAppState) => {
    const wasBackgrounded = appStateRef.match(/inactive|background/);
    appStateRef = nextAppState;

    if (wasBackgrounded && nextAppState === "active") {
      startLiveWalkingProgress({ force: true }).catch((error) => {
        console.log("[LiveWalkingProgress] Active refresh failed:", error);
      });
    }
  });
};

const startLiveWalkingProgressNow = async () => {
  ensureAppStateListener();
  updateSnapshot({ status: "loading", message: "Checking device motion access" });

  try {
    await loadLocalWalkingState();

    const isAvailable = await Pedometer.isAvailableAsync();
    if (!isAvailable) {
      savePermissionStatus("unavailable");
      updateSnapshot({
        status: "unavailable",
        message: "Step sensor unavailable on this device",
        permissionStatus: "unavailable",
        hasPedometerPermission: false,
      });
      hasStarted = true;
      return snapshot;
    }

    const currentPermission = await Pedometer.getPermissionsAsync();
    let hasPermission = currentPermission.granted;

    if (!hasPermission && currentPermission.canAskAgain !== false) {
      const requestedPermission = await Pedometer.requestPermissionsAsync();
      hasPermission = requestedPermission.granted;
    }

    if (!hasPermission) {
      savePermissionStatus("denied");
      updateSnapshot({
        status: "denied",
        message: "Motion permission is needed for live steps",
        permissionStatus: "denied",
        hasPedometerPermission: false,
      });
      hasStarted = true;
      return snapshot;
    }

    savePermissionStatus("granted");
    updateSnapshot({
      permissionStatus: "granted",
      hasPedometerPermission: true,
    });

    const syncResult = await syncPedometerHistory(
      snapshot.history,
      snapshot.goal,
      snapshot.calorieMetrics,
      snapshot.scope
    );
    const storedToday = syncResult.history.find(
      (entry) => entry.dateKey === getDateKey() && walkingProgressEntryMatchesScope(entry, snapshot.scope)
    );
    baseSteps = cleanWalkingSteps(syncResult.todaySteps ?? storedToday?.steps);

    updateSnapshot({
      history: syncResult.history,
      steps: baseSteps,
      status: "ready",
      message: "Steps synced from device pedometer",
    });

    if (syncResult.syncedCount > 0) {
      AsyncStorage.setItem(WALKING_PROGRESS_STORAGE_KEY, JSON.stringify(syncResult.history)).catch(
        (error) => {
          console.log("[LiveWalkingProgress] Failed to save synced history:", error);
        }
      );
    }

    watchSubscription?.remove();
    watchSubscription = Pedometer.watchStepCount((result) => {
      const liveSteps = cleanWalkingSteps(result.steps);
      updateSnapshot({ steps: Math.max(baseSteps + liveSteps, baseSteps) });
      persistCurrentSteps(false);
    });
    persistCurrentSteps(true);
    hasStarted = true;
    return snapshot;
  } catch (error) {
    console.log("[LiveWalkingProgress] Failed to start pedometer:", error);
    savePermissionStatus("error");
    updateSnapshot({
      status: "error",
      message: "Step tracking could not start",
      permissionStatus: "error",
      hasPedometerPermission: false,
      hasLoaded: true,
    });
    hasStarted = true;
    return snapshot;
  }
};

export const getLiveWalkingProgressSnapshot = () => snapshot;

export const subscribeLiveWalkingProgress = (listener: WalkingProgressListener) => {
  listeners.add(listener);
  listener(snapshot);
  return () => {
    listeners.delete(listener);
  };
};

export const startLiveWalkingProgress = async (
  options: { force?: boolean } = {}
): Promise<WalkingProgressSnapshot> => {
  if (startPromise) return startPromise;

  if (hasStarted && !options.force) {
    return snapshot;
  }

  if (options.force) {
    watchSubscription?.remove();
    watchSubscription = null;
    hasStarted = false;
  }

  startPromise = startLiveWalkingProgressNow().finally(() => {
    startPromise = null;
  });
  return startPromise;
};

export const refreshLiveWalkingProgress = () => startLiveWalkingProgress({ force: true });

export const saveLiveWalkingGoal = async (nextGoalValue: number) => {
  const nextGoal = clampStepGoal(nextGoalValue);
  await AsyncStorage.setItem(WALKING_STEP_GOAL_STORAGE_KEY, String(nextGoal));
  updateSnapshot({ goal: nextGoal });
  persistCurrentSteps(true);
  return nextGoal;
};

