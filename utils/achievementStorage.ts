import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ACHIEVEMENT_UNLOCKED_STORAGE_KEY,
  LOCAL_EARLY_LOGS_KEY,
  LOCAL_WEIGHT_LOGS_KEY,
  LOCAL_WORKOUT_HISTORY_KEY,
  type AchievementBadgeId,
  type AchievementLocalStats,
} from '@/constants/achievementBadges';

type CompletedWorkoutEntry = {
  exerciseName: string;
  durationSeconds: number;
  completedAt: string;
};

type EarlyLogEntry = {
  dayLogId?: string;
  type: 'meal' | 'hydration' | 'mixed';
  dateKey: string;
  loggedAt: string;
};

const parseStoredValue = (value: string | null) => {
  if (!value) return null;

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

const getStoredCount = async (key: string) => {
  const parsed = parseStoredValue(await AsyncStorage.getItem(key));

  if (Array.isArray(parsed)) return parsed.length;
  if (typeof parsed === 'number') return parsed;
  if (parsed && typeof parsed === 'object' && typeof parsed.count === 'number') {
    return parsed.count;
  }

  return 0;
};

export const loadAchievementLocalStats = async (): Promise<AchievementLocalStats> => ({
  completedWorkouts: await getStoredCount(LOCAL_WORKOUT_HISTORY_KEY),
  weightLogs: await getStoredCount(LOCAL_WEIGHT_LOGS_KEY),
  earlyLogs: await getStoredCount(LOCAL_EARLY_LOGS_KEY),
});

export const loadStoredAchievementIds = async (): Promise<AchievementBadgeId[]> => {
  const parsed = parseStoredValue(await AsyncStorage.getItem(ACHIEVEMENT_UNLOCKED_STORAGE_KEY));
  return Array.isArray(parsed) ? parsed : [];
};

export const syncUnlockedAchievementIds = async (currentUnlockedIds: AchievementBadgeId[]) => {
  const storedIds = await loadStoredAchievementIds();
  const storedSet = new Set(storedIds);
  const newlyUnlockedIds = currentUnlockedIds.filter((id) => !storedSet.has(id));
  const mergedIds = Array.from(new Set([...storedIds, ...currentUnlockedIds]));

  await AsyncStorage.setItem(ACHIEVEMENT_UNLOCKED_STORAGE_KEY, JSON.stringify(mergedIds));

  return newlyUnlockedIds;
};

export const recordCompletedWorkoutLocally = async (entry: CompletedWorkoutEntry) => {
  const parsed = parseStoredValue(await AsyncStorage.getItem(LOCAL_WORKOUT_HISTORY_KEY));
  const workoutHistory: CompletedWorkoutEntry[] = Array.isArray(parsed) ? parsed : [];
  const nextHistory = [entry, ...workoutHistory].slice(0, 100);

  await AsyncStorage.setItem(LOCAL_WORKOUT_HISTORY_KEY, JSON.stringify(nextHistory));
};

export const recordEarlyLogLocally = async (entry: Omit<EarlyLogEntry, 'dateKey' | 'loggedAt'>) => {
  const now = new Date();
  if (now.getHours() >= 10) return;

  const dateKey = now.toISOString().slice(0, 10);
  const parsed = parseStoredValue(await AsyncStorage.getItem(LOCAL_EARLY_LOGS_KEY));
  const earlyLogs: EarlyLogEntry[] = Array.isArray(parsed) ? parsed : [];
  const alreadyRecordedToday = earlyLogs.some((log) => log.dateKey === dateKey);

  if (alreadyRecordedToday) return;

  const nextLogs = [
    {
      ...entry,
      dateKey,
      loggedAt: now.toISOString(),
    },
    ...earlyLogs,
  ].slice(0, 100);

  await AsyncStorage.setItem(LOCAL_EARLY_LOGS_KEY, JSON.stringify(nextLogs));
};
