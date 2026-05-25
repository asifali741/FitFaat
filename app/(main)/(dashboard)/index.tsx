import AppHeader from "@/components/AppHeader";
import {
  DashboardCommandCenter,
  DashboardWeeklyHealthReport,
  QuickAddBottomSheet,
  ReadinessScoreCard,
  type DashboardMoodValue,
  type QuickAddAction,
} from "@/components/dashboard/DashboardCommandCenter";
import { PersonalCoachFeed } from "@/components/dashboard/PersonalCoachFeed";
import NewsModalPopup from "@/components/NewsModalPopup";
import PatientDietPlanViewer from "@/components/PatientDietPlanViewer";
import { StreakDisplay } from "@/components/StreakDisplay";
import { useAppointments } from "@/contexts/AppointmentContext";
import { useLiveWalkingProgress } from "@/hooks/useLiveWalkingProgress";
import { useNews } from "@/contexts/NewsContext";
import { useNotifications } from "@/contexts/NotificationContext";
import { useTheme } from "@/contexts/ThemeContext";
import {
  applyAdaptiveGoalsToJsonResponse,
  applyWeeklyWeightTrendCalibrationToCalories,
  calculateMifflinStJeorBaseGoals,
  loadAdaptiveGoalCarryForward,
  loadAdaptiveGoalMetrics,
  loadWeeklyWeightTrendCalibration,
  saveAdaptiveGoalCarryForward,
} from "@/utils/adaptiveGoals";
import { dailyLogsApi } from "@/utils/dailyLogsApi";
import {
  getExerciseCaloriesBurned,
  mergeExerciseProgressIntoJsonResponse,
} from "@/utils/localExerciseProgress";
import {
  getWalkingCaloriesBurned,
  mergeWalkingProgressIntoJsonResponse,
} from "@/utils/localWalkingProgress";
import {
  loadGoalDisplayMode,
  type GoalDisplayMode,
} from "@/utils/goalTargetDisplay";
import {
  loadHabitPreferences,
  markHabitMissionComplete,
  markMiniLessonSeen,
  saveHabitPreferences,
  refreshHabitMission,
  scheduleHabitMissionReminder,
  type HabitPreferences,
  type HabitMission,
} from "@/utils/habitMissions";
import {
  buildWeeklyNutritionReport,
  buildWeeklyNutritionReportFromStorage,
  saveNutritionReportSnapshot,
  type WeeklyNutritionReport,
} from "@/utils/nutritionInsights";
import { getIsPremiumUser } from "@/utils/premiumAccess";
import { authApi } from "@/utils/auth/authApi";
import { tokenStorage } from "@/utils/auth/tokenStorage";
import { cachedRequestJson, isRequestAbortError } from "@/utils/apiHelper";
import { getBackendBaseUrl } from "@/utils/config";
import {
  getDashboardUserIdentity,
  getStoredDashboardCache,
  getStoredWeeklyTrackingId,
  setStoredDashboardCache,
} from "@/utils/dashboardStorage";
import { applyPendingDashboardMutations } from "@/utils/dashboardPendingMutations";
import { syncLatestHealthData } from "@/utils/healthDataSync";
import { scheduleAdaptiveNutritionNotifications, type NutritionGoalSummary } from "@/utils/nutritionProfile";
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from "react-native-responsive-screen";
import { SafeAreaView } from "react-native-safe-area-context";
import { Days } from "./_Day";
import { Day, jsonResponse } from "./types";

const getSecondsUntilEndOfLocalDay = () => {
  const now = new Date();
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  return Math.max(0, Math.floor((endOfDay.getTime() - now.getTime()) / 1000));
};

const getDashboardDateKey = (value?: string | Date | null) => {
  if (!value) {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  const isoMatch = String(value).match(/^(\d{4}-\d{2}-\d{2})/);
  if (isoMatch) return isoMatch[1];

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const day = String(parsed.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const isCurrentDashboardDate = (date?: string | Date | null) => {
  const dayKey = getDashboardDateKey(date);
  return !dayKey || dayKey === getDashboardDateKey();
};

const getActiveDayDuration = (dailyLog: any) => {
  const duration = Number(
    dailyLog?.duration ?? dailyLog?.timeLeftSeconds ?? dailyLog?.secondsRemaining
  );

  if (Number.isFinite(duration) && duration > 0) {
    return Math.floor(duration);
  }

  return isCurrentDashboardDate(dailyLog?.date) ? getSecondsUntilEndOfLocalDay() : 0;
};

// Convert WeeklyTracking data to jsonResponse format
const convertToJsonResponse = (weeklyTracking: any): jsonResponse => {
  const data: any = {};

  weeklyTracking.dailyLogs.forEach((dailyLog: any) => {
    const dayKey = `day0${dailyLog.dayNumber}` as keyof jsonResponse;
    data[dayKey] = {
      _id: dailyLog._id, // Include MongoDB daily log ID
      dayNo: dailyLog.dayNumber,
      date: dailyLog.date,
      achievedCalories: dailyLog.achievedCalories,
      achieviedHydration: dailyLog.achievedHydration,
      baseTargetCalories: dailyLog.baseTargetCalories || dailyLog.defaultTargetCalories || dailyLog.targetCalories,
      baseTargetHydration: dailyLog.baseTargetHydration || dailyLog.defaultTargetHydration || dailyLog.targetHydration,
      targetCalories: dailyLog.targetCalories,
      targetHydration: dailyLog.targetHydration,
      targetCaloriesMin: dailyLog.targetCaloriesMin,
      targetCaloriesMax: dailyLog.targetCaloriesMax,
      targetHydrationMin: dailyLog.targetHydrationMin,
      targetHydrationMax: dailyLog.targetHydrationMax,
      calibratedTargetCalories: dailyLog.calibratedTargetCalories,
      weightTrendCaloriesAdjustment: dailyLog.weightTrendCaloriesAdjustment,
      weightTrendExpectedKgPerWeek: dailyLog.weightTrendExpectedKgPerWeek,
      weightTrendObservedKgPerWeek: dailyLog.weightTrendObservedKgPerWeek,
      weightTrendConfidence: dailyLog.weightTrendConfidence,
      weightTrendStatus: dailyLog.weightTrendStatus,
      weightTrendMessage: dailyLog.weightTrendMessage,
      weightTrendGoalDirection: dailyLog.weightTrendGoalDirection,
      exerciseCaloriesBurned: dailyLog.exerciseCaloriesBurned || 0,
      exerciseDurationSeconds: dailyLog.exerciseDurationSeconds || 0,
      walkingSteps: dailyLog.walkingSteps || dailyLog.steps || 0,
      walkingStepGoal: dailyLog.walkingStepGoal || dailyLog.stepGoal,
      walkingHasStepSignal: Number(dailyLog.walkingSteps || dailyLog.steps || dailyLog.stepCount || 0) > 0,
      walkingHasExplicitStepGoal: Boolean(
        dailyLog.walkingStepGoal ||
          dailyLog.stepGoal ||
          dailyLog.targetSteps ||
          dailyLog.dailyStepGoal ||
          dailyLog.targetWalkingCaloriesBurned ||
          dailyLog.targetWalkingCalories ||
          dailyLog.walkingCaloriesTarget ||
          dailyLog.stepCaloriesTarget
      ),
      walkingCaloriesBurned:
        dailyLog.walkingCaloriesBurned || dailyLog.stepCaloriesBurned || 0,
      targetWalkingCaloriesBurned:
        dailyLog.targetWalkingCaloriesBurned ||
        dailyLog.targetWalkingCalories ||
        dailyLog.walkingCaloriesTarget ||
        dailyLog.stepCaloriesTarget,
      targetExerciseCaloriesBurned: dailyLog.targetExerciseCaloriesBurned,
      targetExerciseCalories: dailyLog.targetExerciseCalories,
      targetBurnedCalories: dailyLog.targetBurnedCalories,
      exerciseCaloriesTarget: dailyLog.exerciseCaloriesTarget,
      burnedCaloriesTarget: dailyLog.burnedCaloriesTarget,
      workoutCaloriesTarget: dailyLog.workoutCaloriesTarget,
      dailyBurnedCaloriesTarget: dailyLog.dailyBurnedCaloriesTarget,
      remarks: dailyLog.remarks || null,
      duration: dailyLog.status === 'active' ? getActiveDayDuration(dailyLog) : 0,
      status: dailyLog.status as "locked" | "active" | "finished",
    };
  });
  
  return data as jsonResponse;
};

type StoredDashboardData = { data: jsonResponse; timestamp: Date };

const normalizeStoredDashboardData = (value: unknown): StoredDashboardData | null => {
  if (!value || typeof value !== 'object') return null;

  const record = value as { data?: unknown; timestamp?: unknown };
  if (!record.data || typeof record.data !== 'object' || Array.isArray(record.data)) {
    return null;
  }

  const rawTimestamp = record.timestamp;
  const timestamp = rawTimestamp instanceof Date
    ? rawTimestamp
    : typeof rawTimestamp === 'string' || typeof rawTimestamp === 'number'
      ? new Date(rawTimestamp)
      : new Date();

  return {
    data: record.data as jsonResponse,
    timestamp: Number.isNaN(timestamp.getTime()) ? new Date() : timestamp,
  };
};

// Check local storage
const checkLocalStorage = async () => {
  try {
    const stored = await getStoredDashboardCache<jsonResponse>();
    return normalizeStoredDashboardData(stored);
  } catch (e) {
    console.log("Error reading local storage", e);
    return null;
  }
};

const parseDashboardDate = (date?: string) => {
  if (!date) return null;
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const startOfLocalDay = (date: Date) => {
  const nextDate = new Date(date);
  nextDate.setHours(0, 0, 0, 0);
  return nextDate;
};

const getHydrationValue = (day: Day) =>
  Number(day.achieviedHydration ?? (day as any).achievedHydration ?? 0);

const hasDayProgress = (day: Day, includeExercise = false) =>
  Number(day.achievedCalories || 0) > 0 ||
  getHydrationValue(day) > 0 ||
  (includeExercise &&
    (getExerciseCaloriesBurned(day) > 0 || getWalkingCaloriesBurned(day) > 0));

const isStreakProgressDay = (day: Day, includeExercise = false) =>
  day.status === 'finished' || (day.status === 'active' && hasDayProgress(day, includeExercise));

const sortByDayDate = (a: Day, b: Day) => {
  const aDate = parseDashboardDate(a.date);
  const bDate = parseDashboardDate(b.date);
  if (aDate && bDate) return aDate.getTime() - bDate.getTime();
  return a.dayNo - b.dayNo;
};

const getDashboardTargetDay = (days: Day[]) => {
  const todayKey = getDashboardDateKey();
  return (
    days.find((day) => day.status === 'active') ||
    days.find((day) => getDashboardDateKey(day.date) === todayKey) ||
    days.find((day) => day.status !== 'locked') ||
    days[0] ||
    null
  );
};

/**
 * Compute streak data dynamically from the local day data.
 * Counts from the latest unlocked day so future locked days do not reset progress.
 */
const computeStreakFromDays = (data: jsonResponse, includeExercise = false) => {
  const allDaysSorted = Object.values(data).sort(sortByDayDate);
  const unlockedDaysSorted = allDaysSorted.filter((day) => day.status !== 'locked');
  
  let currentStreak = 0;
  for (let i = unlockedDaysSorted.length - 1; i >= 0; i--) {
    const day = unlockedDaysSorted[i];
    if (isStreakProgressDay(day, includeExercise)) {
      currentStreak++;
    } else {
      break;
    }
  }

  let longestStreak = 0;
  let tempStreak = 0;
  for (const day of allDaysSorted) {
    if (isStreakProgressDay(day, includeExercise)) {
      tempStreak++;
      longestStreak = Math.max(longestStreak, tempStreak);
    } else {
      tempStreak = 0;
    }
  }

  longestStreak = Math.max(longestStreak, currentStreak);

  const weeklyGoal = 7;
  const streakPercentage = Math.round((currentStreak / weeklyGoal) * 100);

  // Generate message
  let message = '';
  if (currentStreak === 0) {
    message = 'Start with one meal or water log today. A streak begins with a real check-in.';
  } else if (currentStreak === 1) {
    message = "One day saved. Repeat the easiest useful log today.";
  } else if (currentStreak < weeklyGoal) {
    const daysLeft = weeklyGoal - currentStreak;
    message = `${currentStreak} days active. ${daysLeft} more to complete the weekly rhythm.`;
  } else {
    message = 'Weekly rhythm complete. Keep the next log simple so it stays repeatable.';
  }

  return {
    streakCount: currentStreak,
    longestStreak,
    message,
    streakPercentage,
    weeklyGoalDays: weeklyGoal,
    shouldSendReminder: currentStreak === 0,
  };
};

const toGoalSummary = (day: Day): NutritionGoalSummary => ({
  dayLogId: day._id,
  dayNo: day.dayNo,
  date: day.date,
  achievedCalories: day.achievedCalories,
  targetCalories: day.targetCalories,
  achievedHydration: day.achieviedHydration,
  targetHydration: day.targetHydration,
  calorieGoalDirection: day.calorieGoalDirection,
  nutritionGapSeverity: day.nutritionGapSeverity,
  hydrationRiskScore: day.hydrationRiskScore,
  recoveryNeedScore: day.recoveryNeedScore,
  goalRiskScore: day.goalRiskScore,
  nudgePriority: day.nudgePriority,
  nudgeReason: day.nudgeReason,
});

const getAdaptiveNutritionSummary = (data: jsonResponse): NutritionGoalSummary | null => {
  const today = startOfLocalDay(new Date());
  const days = Object.values(data)
    .filter((day) => day.status !== 'locked' && Number(day.targetCalories) > 0)
    .sort((a, b) => {
      const aDate = parseDashboardDate(a.date);
      const bDate = parseDashboardDate(b.date);
      const aTime = aDate ? startOfLocalDay(aDate).getTime() : a.dayNo;
      const bTime = bDate ? startOfLocalDay(bDate).getTime() : b.dayNo;
      return bTime - aTime;
    });

  const currentOverTargetDay = days.find((day) => {
    const dayDate = parseDashboardDate(day.date);
    const isToday = dayDate
      ? startOfLocalDay(dayDate).getTime() === today.getTime()
      : day.status === 'active';

    return isToday && Number(day.achievedCalories) > Number(day.targetCalories) * 1.05;
  });

  if (currentOverTargetDay) {
    return toGoalSummary(currentOverTargetDay);
  }

  const latestPastDay = days.find((day) => {
    const dayDate = parseDashboardDate(day.date);
    return dayDate ? startOfLocalDay(dayDate).getTime() < today.getTime() : false;
  });

  return latestPastDay ? toGoalSummary(latestPastDay) : null;
};

type EndOfDayRecap = {
  key: string;
  dayNo: number;
  caloriesHit: boolean;
  hydrationHit: boolean;
  workoutDone: boolean;
  achievedCalories: number;
  targetCalories: number;
  achievedHydration: number;
  targetHydration: number;
  workoutCalories: number;
  bestAction: string;
};

const END_OF_DAY_RECAP_STORAGE_PREFIX = 'fitfaat_end_day_recap_seen';
const DASHBOARD_FOCUS_REFRESH_TTL_MS = 90 * 1000;
const DASHBOARD_BACKGROUND_REFRESH_TTL_MS = 2 * 60 * 1000;
const HEALTH_SYNC_BACKGROUND_TTL_MS = 5 * 60 * 1000;

const buildEndOfDayRecap = (day: Day): EndOfDayRecap => {
  const achievedCalories = Number(day.achievedCalories || 0);
  const targetCalories = Number(day.targetCalories || 0);
  const achievedHydration = getHydrationValue(day);
  const targetHydration = Number(day.targetHydration || 0);
  const workoutCalories = getExerciseCaloriesBurned(day);
  const caloriesHit = targetCalories > 0 && achievedCalories >= targetCalories;
  const hydrationHit = targetHydration > 0 && achievedHydration >= targetHydration;
  const workoutDone = workoutCalories > 0 || Number((day as any).exerciseDurationSeconds || 0) > 0;

  let bestAction = 'You checked in and kept momentum';
  if (caloriesHit && hydrationHit && workoutDone) {
    bestAction = 'Perfect day with nutrition, water, and workout complete';
  } else if (caloriesHit && hydrationHit) {
    bestAction = 'Balanced calories and hydration';
  } else if (workoutDone) {
    bestAction = 'Workout completed';
  } else if (hydrationHit) {
    bestAction = 'Hydration goal hit';
  } else if (caloriesHit) {
    bestAction = 'Calorie goal hit';
  } else if (achievedCalories > 0) {
    bestAction = 'Meal logging kept the day alive';
  } else if (achievedHydration > 0) {
    bestAction = 'Water logging kept the day alive';
  }

  return {
    key: `${END_OF_DAY_RECAP_STORAGE_PREFIX}:${day._id || day.date || day.dayNo}`,
    dayNo: day.dayNo,
    caloriesHit,
    hydrationHit,
    workoutDone,
    achievedCalories,
    targetCalories,
    achievedHydration,
    targetHydration,
    workoutCalories,
    bestAction,
  };
};

type DashboardActionHandlers = {
  saveAdaptiveGoalCarryForwardFromCurrentData: (
    ownerUserId?: string | null,
    weeklyTrackingId?: string | null
  ) => Promise<void>;
  refreshDashboardInBackground: (premiumActive: boolean) => void;
  checkAndCreateNewCycle: (premiumOverride?: boolean) => Promise<boolean>;
  loadJson: (storedData: StoredDashboardData, premiumOverride?: boolean) => Promise<void>;
  callApi: (premiumOverride?: boolean) => Promise<boolean>;
};


//Main Component
export default function DayPlan () {
  const router = useRouter();
  const { colors } = useTheme();
  const { news, unreadCount, markNewsAsRead } = useNews();
  const { appointments: localAppointments } = useAppointments();
  const { scheduleFitFaatNotification, cancelScheduledNotification } = useNotifications();
  const [JsonResponse, setJsonResponse] = useState<null|jsonResponse>(null);
  const [showNewsModal, setShowNewsModal] = useState(false);
  const [showDietPlanViewer, setShowDietPlanViewer] = useState(false);
  const [showQuickAddSheet, setShowQuickAddSheet] = useState(false);
  const [commandCenterAppointments, setCommandCenterAppointments] = useState<any[]>([]);
  const [chatAlertCount, setChatAlertCount] = useState(0);
  const [selectedMood, setSelectedMood] = useState<DashboardMoodValue | null>(null);
  const [isPremium, setIsPremium] = useState(false);
  const [goalDisplayMode, setGoalDisplayMode] = useState<GoalDisplayMode>("simple");
  const [endOfDayRecap, setEndOfDayRecap] = useState<EndOfDayRecap | null>(null);
  const [nutritionReport, setNutritionReport] = useState<WeeklyNutritionReport | null>(null);
  const [habitMission, setHabitMission] = useState<HabitMission | null>(null);
  const [habitStreakCount, setHabitStreakCount] = useState(0);
  const [habitPreferences, setHabitPreferences] = useState<HabitPreferences | null>(null);
  const [dashboardLoadError, setDashboardLoadError] = useState<string | null>(null);
  const [dashboardRetryKey, setDashboardRetryKey] = useState(0);
  const hasCheckedForNewCycle = useRef(false);
  const adaptiveNutritionSignature = useRef<string | null>(null);
  const hasCompletedInitialLoad = useRef(false);
  const healthSyncInFlight = useRef(false);
  const lastHealthSyncAt = useRef(0);
  const lastFocusRefreshAt = useRef(0);
  const lastBackgroundRefreshAt = useRef(0);
  const liveWalkingProgress = useLiveWalkingProgress();
  const dashboardActions = useRef<DashboardActionHandlers>({
    saveAdaptiveGoalCarryForwardFromCurrentData: async () => undefined,
    refreshDashboardInBackground: () => undefined,
    checkAndCreateNewCycle: async () => false,
    loadJson: async () => undefined,
    callApi: async () => false,
  });
  const moodStorageKey = `dashboardMood:${getDashboardDateKey()}`;

  const runHealthSyncInBackground = useCallback((force = false) => {
    if (healthSyncInFlight.current) return;
    const now = Date.now();
    if (!force && now - lastHealthSyncAt.current < HEALTH_SYNC_BACKGROUND_TTL_MS) return;

    healthSyncInFlight.current = true;
    lastHealthSyncAt.current = now;
    syncLatestHealthData({ force })
      .catch((error) => {
        console.log('[Dashboard] Health data sync unavailable:', error);
      })
      .finally(() => {
        healthSyncInFlight.current = false;
      });
  }, []);

  const saveAdaptiveGoalCarryForwardFromCurrentData = async (
    ownerUserId?: string | null,
    weeklyTrackingId?: string | null
  ) => {
    const latestUser = ownerUserId ? null : await tokenStorage.getUser();
    const latestWeeklyTrackingId = weeklyTrackingId ?? await getStoredWeeklyTrackingId(latestUser);
    const currentData = JsonResponse || (await checkLocalStorage())?.data;

    await saveAdaptiveGoalCarryForward(currentData, {
      userId: ownerUserId || latestUser?.id,
      weeklyTrackingId: latestWeeklyTrackingId,
    });
  };

  const refreshDashboardInBackground = (premiumActive: boolean) => {
    const now = Date.now();
    if (now - lastBackgroundRefreshAt.current < DASHBOARD_BACKGROUND_REFRESH_TTL_MS) {
      return;
    }

    lastBackgroundRefreshAt.current = now;
    callApi(premiumActive).catch((error) => {
      if (!isRequestAbortError(error)) {
        console.log('[Dashboard] Background refresh unavailable:', error);
      }
    });
  };

  const loadCommandCenterSignals = useCallback(async () => {
    try {
      const response = await authApi.getUserAppointments();
      setCommandCenterAppointments(response.appointments || []);
    } catch (error) {
      console.log('[DashboardCommandCenter] Appointment preview unavailable:', error);
    }

    try {
      const token = await tokenStorage.getToken();
      if (!token) {
        setChatAlertCount(0);
        return;
      }

      const user = await tokenStorage.getUser();
      const cacheUserKey = user?._id || user?.id || user?.userId || 'current';
      const data = await cachedRequestJson<any>(
        `dashboard:unread-by-appointment:${cacheUserKey}`,
        `${getBackendBaseUrl()}/api/chat/unread-by-appointment`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        },
        {
          timeoutMs: 6500,
          retries: 1,
          retryDelayMs: 500,
          cacheTtlMs: 30 * 1000,
          maxStaleMs: 10 * 60 * 1000,
          allowStaleOnError: true,
          maxWaitForFreshMs: 1500,
          refreshCacheInBackground: true,
        }
      );
      const unreadMap = data?.unreadByAppointment || {};
      const totalUnread = Object.values(unreadMap).reduce(
        (sum: number, value: any) => sum + Math.max(0, Number(value || 0)),
        0
      );
      setChatAlertCount(totalUnread);
    } catch (error) {
      console.log('[DashboardCommandCenter] Chat alert preview unavailable:', error);
      setChatAlertCount(0);
    }
  }, []);

  useEffect(() => {
    const loadMood = async () => {
      try {
        const storedMood = await AsyncStorage.getItem(moodStorageKey);
        if (
          storedMood === 'strong' ||
          storedMood === 'good' ||
          storedMood === 'tired' ||
          storedMood === 'sore' ||
          storedMood === 'stressed'
        ) {
          setSelectedMood(storedMood);
        }
      } catch (error) {
        console.log('[DashboardCommandCenter] Mood preview unavailable:', error);
      }
    };

    loadMood();
    loadCommandCenterSignals();
  }, [loadCommandCenterSignals, moodStorageKey]);

  const handleMoodSelect = async (mood: DashboardMoodValue) => {
    setSelectedMood(mood);
    try {
      await AsyncStorage.setItem(moodStorageKey, mood);
    } catch (error) {
      console.log('[DashboardCommandCenter] Failed to save mood:', error);
    }
  };

  // Compute streak dynamically from local day data
  const computedStreak = JsonResponse ? computeStreakFromDays(JsonResponse, true) : null;

  // Local day data already contains the streak source of truth for this screen.
  const streak = computedStreak;
  const streakLoading = false;

  //Get Data from API or Local Storage
  useEffect( () => { 
    let isActive = true;

    const fetchData = async () => {
      try {
        setDashboardLoadError(null);
        runHealthSyncInBackground();

        const [user, premiumActive, stored] = await Promise.all([
          tokenStorage.getUser(),
          getIsPremiumUser(),
          checkLocalStorage(),
        ]);
        const storedWeeklyId = await getStoredWeeklyTrackingId(user);

        if (!isActive) return;

        setIsPremium(premiumActive);

        const userWeeklyId = user?.weeklyTrackingId;

        // If weeklyTrackingIds don't match or user doesn't have one, fetch fresh from backend
        if (!storedWeeklyId || !userWeeklyId || storedWeeklyId !== userWeeklyId) {
          await dashboardActions.current.saveAdaptiveGoalCarryForwardFromCurrentData(user?.id, storedWeeklyId);
          const loadedFreshData = await dashboardActions.current.callApi(premiumActive);
          if (!loadedFreshData) {
            const refreshedStored = await checkLocalStorage();
            if (refreshedStored && refreshedStored.data) {
              await dashboardActions.current.loadJson(refreshedStored, premiumActive);
              return;
            }
            throw new Error('Dashboard data is unavailable right now.');
          }
          return;
        }

        if(stored && stored.data)
        {
          await dashboardActions.current.loadJson(stored, premiumActive);
          dashboardActions.current.refreshDashboardInBackground(premiumActive);
          return;
        }

        const loadedFreshData = await dashboardActions.current.callApi(premiumActive);
        if (!loadedFreshData) {
          throw new Error('Dashboard data is unavailable right now.');
        }
      } catch (error: any) {
        if (!isActive) return;
        console.log('[Dashboard] Initial load failed:', error);
        setDashboardLoadError(error?.message || 'Unable to load dashboard data.');
      }
    };
    fetchData();
    return () => {
      isActive = false;
    };
  },[dashboardRetryKey, runHealthSyncInBackground]);

  useEffect(() => {
    if (!liveWalkingProgress.hasLoaded) return;

    const todayKey = getDashboardDateKey();

    setJsonResponse((currentData) => {
      if (!currentData) return currentData;

      const entries = Object.entries(currentData) as [keyof jsonResponse, Day][];
      const targetEntry =
        entries.find(([, day]) => getDashboardDateKey(day.date) === todayKey) ||
        entries.find(([, day]) => String(day.status || "").toLowerCase() === "active");

      if (!targetEntry) return currentData;

      const [targetKey, targetDay] = targetEntry;
      const nextSteps = Math.max(0, Math.round(liveWalkingProgress.steps || 0));
      const nextGoal = Math.max(0, Math.round(liveWalkingProgress.goal || 0));
      const nextWalkingCalories = Math.max(0, Math.round(liveWalkingProgress.calories || 0));
      const nextWalkingTarget = Math.max(0, Math.round(liveWalkingProgress.targetCalories || 0));
      const nextPermissionStatus = liveWalkingProgress.permissionStatus;

      if (
        Number(targetDay.walkingSteps || 0) === nextSteps &&
        Number(targetDay.walkingStepGoal || 0) === nextGoal &&
        Number(targetDay.walkingCaloriesBurned || 0) === nextWalkingCalories &&
        Number(targetDay.targetWalkingCaloriesBurned || 0) === nextWalkingTarget &&
        targetDay.walkingPedometerPermissionStatus === nextPermissionStatus &&
        Boolean(targetDay.walkingHasPedometerPermission) === liveWalkingProgress.hasPedometerPermission
      ) {
        return currentData;
      }

      const nextData = { ...currentData };
      nextData[targetKey] = {
        ...targetDay,
        walkingSteps: nextSteps,
        stepCount: nextSteps,
        walkingStepGoal: nextGoal,
        walkingHasStepSignal: nextSteps > 0 || liveWalkingProgress.hasPedometerPermission,
        walkingHasExplicitStepGoal: nextGoal > 0,
        walkingHasPedometerPermission: liveWalkingProgress.hasPedometerPermission,
        walkingPedometerPermissionStatus: nextPermissionStatus,
        walkingCaloriesBurned: nextWalkingCalories,
        targetWalkingCaloriesBurned: nextWalkingTarget,
        walkingCalorieMetrics: liveWalkingProgress.calorieMetrics,
      } as Day;

      return nextData;
    });
  }, [
    liveWalkingProgress.calorieMetrics,
    liveWalkingProgress.calories,
    liveWalkingProgress.goal,
    liveWalkingProgress.hasLoaded,
    liveWalkingProgress.hasPedometerPermission,
    liveWalkingProgress.permissionStatus,
    liveWalkingProgress.steps,
    liveWalkingProgress.targetCalories,
  ]);

  // Listen for weekly cycle changes
  useEffect(() => {
    const checkForCycleChange = async () => {
      // This effect runs when JsonResponse changes
      // Check if all days are finished, indicating a need to refresh
      if (JsonResponse && !hasCheckedForNewCycle.current) {
        const allDays = Object.values(JsonResponse);
        const allFinished = allDays.every(day => day.status === 'finished');
        
        if (allFinished) {
          console.log('🔄 All days finished, checking for new cycle...');
          hasCheckedForNewCycle.current = true; // Prevent infinite loop
          await dashboardActions.current.saveAdaptiveGoalCarryForwardFromCurrentData();
          // Wait a moment then check/create new cycle
          setTimeout(async () => {
            await dashboardActions.current.checkAndCreateNewCycle();
          }, 1000);
        }
      }
    };
    
    checkForCycleChange();
  }, [JsonResponse]);

  useEffect(() => {
    if (!JsonResponse) return;

    const summary = getAdaptiveNutritionSummary(JsonResponse);
    if (!summary) return;

    const signature = JSON.stringify(summary);
    if (adaptiveNutritionSignature.current === signature) return;

    adaptiveNutritionSignature.current = signature;

    scheduleAdaptiveNutritionNotifications({
      summary,
      schedule: scheduleFitFaatNotification,
      cancel: cancelScheduledNotification,
    }).catch((error) => {
      console.error('Error scheduling adaptive nutrition notifications:', error);
      adaptiveNutritionSignature.current = null;
    });
  }, [JsonResponse, scheduleFitFaatNotification, cancelScheduledNotification]);

  useEffect(() => {
    if (!JsonResponse || endOfDayRecap) return;

    const loadLatestRecap = async () => {
      const finishedDay = Object.values(JsonResponse)
        .filter((day) => day.status === 'finished')
        .sort((a, b) => sortByDayDate(b, a))[0];

      if (!finishedDay) return;

      const recap = buildEndOfDayRecap(finishedDay);
      try {
        const alreadySeen = await AsyncStorage.getItem(recap.key);
        if (!alreadySeen) {
          setEndOfDayRecap(recap);
        }
      } catch (error) {
        console.log('[EndOfDayRecap] Unable to load local recap state:', error);
      }
    };

    loadLatestRecap();
  }, [JsonResponse, endOfDayRecap]);

  // Check and create new cycle if needed
  const checkAndCreateNewCycle = async (premiumOverride = isPremium) => {
    try {
      console.log("Checking if new cycle needed...");
      // Get user info
      const user = await tokenStorage.getUser();
      if (!user || !user.id) {
        console.log('No user found');
        return false;
      }

      const weeklyTrackingId = await getStoredWeeklyTrackingId(user);
      await saveAdaptiveGoalCarryForwardFromCurrentData(user.id, weeklyTrackingId);
      const adaptiveMetrics = await loadAdaptiveGoalMetrics(user);
      const adaptivePlan = premiumOverride ? "premium" : "free";
      const baseGoals = calculateMifflinStJeorBaseGoals(adaptiveMetrics, {
        plan: adaptivePlan,
      });
      const weightTrendCalibration = await loadWeeklyWeightTrendCalibration(
        adaptiveMetrics,
        JsonResponse,
        {
          userId: user.id,
          weeklyTrackingId,
          plan: adaptivePlan,
        }
      );
      const calibratedGoalCalories = applyWeeklyWeightTrendCalibrationToCalories(
        baseGoals?.calories,
        weightTrendCalibration,
        adaptiveMetrics
      );
      
      // Call the check-cycle endpoint
      const result = await dailyLogsApi.checkAndCreateCycle(
        user.id,
        weeklyTrackingId,
        calibratedGoalCalories || baseGoals?.calories || user.userInfo?.goalCalories,
        baseGoals?.hydration ?? user.userInfo?.hydrationGoal
      );

      if (!result?.data) {
        return false;
      }

      console.log('Cycle check result:', result.message, 'New cycle created:', result.newCycleCreated);

      // Convert to jsonResponse format
      const carryForward = await loadAdaptiveGoalCarryForward({
        userId: user.id,
        currentWeeklyTrackingId: result.newWeeklyTrackingId || weeklyTrackingId,
      });
      const activeWeeklyTrackingId = result.newWeeklyTrackingId || weeklyTrackingId;
      const dashboardUserId = getDashboardUserIdentity(user) || user.id;
      let data = convertToJsonResponse(result.data);
      data = await mergeExerciseProgressIntoJsonResponse(data);
      data = await mergeWalkingProgressIntoJsonResponse(data);
      data = await applyPendingDashboardMutations(data, {
        userId: dashboardUserId,
        weeklyTrackingId: activeWeeklyTrackingId,
        source: "server",
      });
      data = applyAdaptiveGoalsToJsonResponse(data, adaptiveMetrics, carryForward, {
        plan: adaptivePlan,
        weightTrendCalibration,
      });
      
      // Reset the cycle check flag if a new cycle was created
      if (result.newCycleCreated) {
        hasCheckedForNewCycle.current = false;
      }
      
      setJsonResponse(data);

      // Save to local storage
      const store: { data: jsonResponse; timestamp: Date } = {
        data: data,
        timestamp: new Date()
      };

      try {
        await setStoredDashboardCache(store, user, activeWeeklyTrackingId);
        console.log("Data saved to Local Storage");
      } catch (e) {
        console.log('Error saving to local storage:', e);
      }
      return true;
    } catch (error) {
      if (!isRequestAbortError(error)) {
        console.log('[Dashboard] Unable to refresh cycle:', error);
      }
      return false;
    }
  };

  const loadJson = async (
    {data, timestamp} : StoredDashboardData,
    premiumOverride = isPremium
  ) =>{
    const user = await tokenStorage.getUser();
    const weeklyTrackingId = await getStoredWeeklyTrackingId(user);
    const carryForward = await loadAdaptiveGoalCarryForward({
      userId: user?.id,
      currentWeeklyTrackingId: weeklyTrackingId,
    });
    const adaptiveMetrics = await loadAdaptiveGoalMetrics(user);
    data = await mergeExerciseProgressIntoJsonResponse(data);
    data = await mergeWalkingProgressIntoJsonResponse(data);
    const adaptivePlan = premiumOverride ? "premium" : "free";
    const weightTrendCalibration = await loadWeeklyWeightTrendCalibration(
      adaptiveMetrics,
      data,
      {
        userId: user?.id,
        weeklyTrackingId,
        plan: adaptivePlan,
      }
    );
    data = applyAdaptiveGoalsToJsonResponse(data, adaptiveMetrics, carryForward, {
      plan: adaptivePlan,
      weightTrendCalibration,
    });
    let entry : keyof jsonResponse
    let foundActive = false;
    for (const key in data)
    {
      entry = key as keyof jsonResponse
      if(data[entry].status === 'active')
      {
        foundActive = true;
        const cachedDuration = Number(data[entry].duration);
        //                   current time - timestamp of localStorage    in seconds
        const timeElapsed = (Date.now() - timestamp.getTime()) / 1000;
        //                activeDay.duration - timepassed since creation
        const timeLeft = Number.isFinite(cachedDuration) && cachedDuration > 0
          ? cachedDuration - timeElapsed
          : isCurrentDashboardDate(data[entry].date)
            ? getSecondsUntilEndOfLocalDay()
            : 0;
        if(timeLeft>0)
        {
          //yes local stored is valid and i am updating data variable with its remaining time and break
          data[entry].duration = timeLeft;
          setJsonResponse(data);
          await setStoredDashboardCache({ data, timestamp: new Date() }, user, weeklyTrackingId);
          break;
        }
        else{
          //no local stored data expired, check/create cycle
          await checkAndCreateNewCycle(premiumOverride)
          break;
        }
      }
    }
    // If no active day found (all finished), check and create new cycle
    if (!foundActive) {
      console.log('No active day found in local storage, checking for new cycle...');
      await saveAdaptiveGoalCarryForwardFromCurrentData();
      await checkAndCreateNewCycle(premiumOverride);
    }
  }
  const callApi = async (premiumOverride = isPremium) => {
    // Delegate to the new checkAndCreateNewCycle function
    return await checkAndCreateNewCycle(premiumOverride);
  };
  dashboardActions.current = {
    saveAdaptiveGoalCarryForwardFromCurrentData,
    refreshDashboardInBackground,
    checkAndCreateNewCycle,
    loadJson,
    callApi,
  };

  useFocusEffect(
    useCallback(() => {
      loadCommandCenterSignals();
      loadGoalDisplayMode().then(setGoalDisplayMode).catch(() => setGoalDisplayMode("simple"));
      runHealthSyncInBackground();

      if (!hasCompletedInitialLoad.current) {
        hasCompletedInitialLoad.current = true;
        return;
      }

      const now = Date.now();
      if (now - lastFocusRefreshAt.current < DASHBOARD_FOCUS_REFRESH_TTL_MS) {
        return;
      }
      lastFocusRefreshAt.current = now;

      let isActive = true;

      const refreshFromCacheOrApi = async () => {
        const [premiumActive, stored] = await Promise.all([
          getIsPremiumUser(),
          checkLocalStorage(),
        ]);
        if (!isActive) return;

        setIsPremium(premiumActive);

        if (stored && stored.data) {
          await dashboardActions.current.loadJson(stored, premiumActive);
          if (isActive) {
            dashboardActions.current.refreshDashboardInBackground(premiumActive);
          }
          return;
        }

        await dashboardActions.current.callApi(premiumActive);
      };

      refreshFromCacheOrApi();

      return () => {
        isActive = false;
      };
    }, [loadCommandCenterSignals, runHealthSyncInBackground])
  );

  const daysArray: Day[] = useMemo(
    () => (JsonResponse ? Object.values(JsonResponse) : []),
    [JsonResponse]
  );

  const dashboardAppointments = useMemo(() => {
    const appointmentMap = new Map<string, any>();
    [...commandCenterAppointments, ...localAppointments].forEach((appointment: any) => {
      const key = appointment?._id || appointment?.id || `${appointment?.date || ''}-${appointment?.time || ''}`;
      if (key) {
        appointmentMap.set(String(key), appointment);
      }
    });
    return Array.from(appointmentMap.values());
  }, [commandCenterAppointments, localAppointments]);

  useEffect(() => {
    loadHabitPreferences()
      .then(setHabitPreferences)
      .catch((error) => {
        console.log('[BehaviorCoach] Unable to load habit preferences:', error);
      });
  }, []);

  useEffect(() => {
    let isActive = true;

    if (!JsonResponse || !daysArray.length) {
      setNutritionReport(null);
      setHabitMission(null);
      setHabitStreakCount(0);
      return () => {
        isActive = false;
      };
    }

    const fallbackReport = buildWeeklyNutritionReport(daysArray);
    setNutritionReport(fallbackReport);

    const refreshLocalInsights = async () => {
      let report = fallbackReport;

      try {
        report = await buildWeeklyNutritionReportFromStorage(daysArray);
      } catch (error) {
        console.log('[NutritionReport] Unable to load nutrition profile entries:', error);
      }

      if (!isActive) return;

      setNutritionReport(report);

      saveNutritionReportSnapshot(report).catch((error) => {
        console.log('[NutritionReport] Unable to save local report snapshot:', error);
      });

      if (!isPremium) {
        setHabitMission(null);
        setHabitStreakCount(0);
        return;
      }

      refreshHabitMission(report, selectedMood)
        .then(({ mission, streakCount }) => {
          if (!isActive) return;
          setHabitMission(mission);
          setHabitStreakCount(streakCount);
          markMiniLessonSeen(mission.lessonId).catch((error) => {
            console.log('[BehaviorCoach] Unable to save lesson state:', error);
          });
        })
        .catch((error) => {
          console.log('[BehaviorCoach] Unable to refresh local mission:', error);
        });
    };

    refreshLocalInsights();

    return () => {
      isActive = false;
    };
  }, [JsonResponse, daysArray, isPremium, selectedMood]);

  useEffect(() => {
    if (!habitMission) return;

    scheduleHabitMissionReminder({
      mission: habitMission,
      schedule: scheduleFitFaatNotification,
      cancel: cancelScheduledNotification,
    }).catch((error) => {
      console.log('[BehaviorCoach] Unable to schedule local mission reminder:', error);
    });
  }, [habitMission, scheduleFitFaatNotification, cancelScheduledNotification]);

  const handleCompleteHabitMission = useCallback(async () => {
    if (!habitMission) return;

    try {
      const result = await markHabitMissionComplete(habitMission.id);
      if (result.mission) {
        setHabitMission(result.mission);
      }
      setHabitStreakCount(result.streakCount);
      Alert.alert('Mission complete', 'Your habit streak has been updated.');
    } catch (error) {
      console.log('[BehaviorCoach] Unable to complete mission:', error);
      Alert.alert('Could not save mission', 'Please try again.');
    }
  }, [habitMission]);

  const handleToggleHabitReminders = useCallback(async () => {
    try {
      const currentPreferences = habitPreferences || await loadHabitPreferences();
      const nextPreferences = await saveHabitPreferences({
        remindersEnabled: !currentPreferences.remindersEnabled,
      });
      setHabitPreferences(nextPreferences);

      if (habitMission) {
        await scheduleHabitMissionReminder({
          mission: habitMission,
          schedule: scheduleFitFaatNotification,
          cancel: cancelScheduledNotification,
        });
      }
    } catch (error) {
      console.log('[BehaviorCoach] Unable to update reminder preference:', error);
      Alert.alert('Could not update reminder', 'Please try again.');
    }
  }, [
    cancelScheduledNotification,
    habitMission,
    habitPreferences,
    scheduleFitFaatNotification,
  ]);

  //function called by child component to navigate to detailed day view
  const navigateToDayDetails = (dayNo: number, quickMode?: 'meal' | 'hydration') : void => {
    const key = `day0${dayNo.toString()}` as keyof jsonResponse
    if(JsonResponse=== null)
    {
      return;
    }
    const selectedDay: Day  = JsonResponse[key]
    if (!selectedDay) {
      console.warn(`Day ${dayNo} is locked or missing.`);
      return;
    }
    router.push({
                pathname: "/(main)/(dashboard)/DetailsDay", // pass as string
                params: {
                  selectedDay: JSON.stringify(selectedDay),
                  ...(quickMode ? { quickMode } : {}),
                } // pass as object
              })
  }
  //Mapping JsonResponse to Day Components
  if(!JsonResponse)
  {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.screenColor }]} edges={['top']}>
        <AppHeader 
          title="FitFaat Dashboard"
          showStepIndicator={false}
          showBackButton={false}
          showMenuButton={true}
        />

        <View style={[styles.content, { backgroundColor: colors.screenColor }]}>
          {dashboardLoadError ? (
            <View style={styles.loadingState}>
              <View style={[styles.loadStateIcon, { backgroundColor: `${colors.error || '#EF4444'}14` }]}>
                <Ionicons name="cloud-offline-outline" size={Math.min(hp(4), wp(9))} color={colors.error || '#EF4444'} />
              </View>
              <Text style={[styles.loadingTitle, { color: colors.textPrimary }]}>Dashboard needs a retry</Text>
              <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                {dashboardLoadError} Your existing local logs stay on this device and will be used when available.
              </Text>
              <TouchableOpacity
                style={[styles.retryButton, { backgroundColor: colors.primary }]}
                onPress={() => setDashboardRetryKey((key) => key + 1)}
                accessibilityRole="button"
                accessibilityLabel="Retry loading dashboard"
              >
                <Ionicons name="refresh-outline" size={Math.min(hp(2.1), wp(4.7))} color={colors.textOnPrimary} />
                <Text style={[styles.retryButtonText, { color: colors.textOnPrimary }]}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.loadingState}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.loadingTitle, { color: colors.textPrimary }]}>Loading your dashboard</Text>
              <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                FitFaat is preparing today's meals, water, coach, and report data.
              </Text>
            </View>
          )}
        </View>
      </SafeAreaView>
    )
  }
  
  const handleNotificationPress = () => {
    setShowNewsModal(true);
  };

  const handleCloseNewsModal = () => {
    setShowNewsModal(false);
  };

  const handleNewsRead = async (newsId: string) => {
    await markNewsAsRead(newsId);
  };

  const getQuickAddTargetDay = () => getDashboardTargetDay(daysArray);

  const handleQuickAddAction = (action: QuickAddAction) => {
    setShowQuickAddSheet(false);

    if (action === 'water' || action === 'meal') {
      const targetDay = getQuickAddTargetDay();
      if (targetDay) {
        navigateToDayDetails(targetDay.dayNo, action === 'water' ? 'hydration' : 'meal');
      }
      return;
    }

    if (action === 'note') {
      router.push('/(main)/(notes)' as any);
      return;
    }

    if (action === 'mealPlanner') {
      router.push('/(main)/(meal-planner)' as any);
      return;
    }

    if (action === 'mindfulness') {
      router.push('/(main)/(mindfulness)' as any);
      return;
    }

    if (action === 'steps') {
      router.push('/(main)/(steps)' as any);
      return;
    }

    if (action === 'workout') {
      if (!isPremium) {
        router.push('/(main)/(settings)/premium');
        return;
      }

      router.push('/(main)/(exercises)/workout');
      return;
    }

    if (action === 'appointment') {
      router.push('/(main)/(conference)');
      return;
    }

    if (action === 'chat') {
      router.push('/(main)/(conference)/all-user-chats');
      return;
    }

    if (action === 'weight') {
      router.push('/(main)/profile');
    }
  };

  const closeEndOfDayRecap = async () => {
    if (endOfDayRecap) {
      try {
        await AsyncStorage.setItem(endOfDayRecap.key, new Date().toISOString());
      } catch (error) {
        console.log('[EndOfDayRecap] Unable to save local recap state:', error);
      }
    }
    setEndOfDayRecap(null);
  };

  const floatingButtonIconSize = Math.min(hp(2.2), wp(4.8));

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.screenColor }]} edges={['top']}>
      <AppHeader 
        title="FitFaat Dashboard"
        showStepIndicator={false}
        showBackButton={false}
        showNotificationBell={true}
        notificationCount={unreadCount}
        onNotificationPress={handleNotificationPress}
      />

      {/* News Modal Popup */}
      <NewsModalPopup
        visible={showNewsModal}
        onClose={handleCloseNewsModal}
        newsList={news}
        onNewsRead={handleNewsRead}
      />

      {/* Diet Plan Viewer */}
      <PatientDietPlanViewer
        visible={showDietPlanViewer}
        onClose={() => setShowDietPlanViewer(false)}
      />

      <QuickAddBottomSheet
        visible={showQuickAddSheet}
        colors={colors}
        selectedMood={selectedMood}
        isPremium={isPremium}
        onClose={() => setShowQuickAddSheet(false)}
        onSelectMood={handleMoodSelect}
        onAction={handleQuickAddAction}
      />

      <Modal
        visible={!!endOfDayRecap}
        transparent
        animationType="fade"
        onRequestClose={closeEndOfDayRecap}
      >
        <View style={styles.recapOverlay}>
          <View style={[styles.recapCard, { backgroundColor: colors.cardBackground, borderColor: colors.cardBorder || colors.border }]}>
            <View style={[styles.recapIconWrap, { backgroundColor: `${colors.primary}18` }]}>
              <Ionicons name="checkmark-done" size={Math.min(hp(4), wp(9))} color={colors.primary} />
            </View>
            <Text style={[styles.recapTitle, { color: colors.textPrimary }]}>Day {endOfDayRecap?.dayNo} Recap</Text>
            <Text style={[styles.recapSubtitle, { color: colors.textSecondary }]}>
              {endOfDayRecap?.bestAction}
            </Text>

            <View style={styles.recapStatsGrid}>
              <View style={[styles.recapStat, { backgroundColor: colors.surface || colors.screenColor }]}>
                <Ionicons
                  name={endOfDayRecap?.caloriesHit ? 'checkmark-circle' : 'flame-outline'}
                  size={Math.min(hp(2.4), wp(5.4))}
                  color="#F97316"
                />
                <Text style={[styles.recapStatValue, { color: colors.textPrimary }]}>
                  {endOfDayRecap?.achievedCalories || 0}
                </Text>
                <Text style={[styles.recapStatLabel, { color: colors.textSecondary }]}>
                  / {endOfDayRecap?.targetCalories || 0} cal
                </Text>
              </View>

              <View style={[styles.recapStat, { backgroundColor: colors.surface || colors.screenColor }]}>
                <Ionicons
                  name={endOfDayRecap?.hydrationHit ? 'checkmark-circle' : 'water-outline'}
                  size={Math.min(hp(2.4), wp(5.4))}
                  color="#2E86AB"
                />
                <Text style={[styles.recapStatValue, { color: colors.textPrimary }]}>
                  {(endOfDayRecap?.achievedHydration || 0).toFixed(1)}L
                </Text>
                <Text style={[styles.recapStatLabel, { color: colors.textSecondary }]}>
                  / {endOfDayRecap?.targetHydration || 0}L
                </Text>
              </View>

              <View style={[styles.recapStat, { backgroundColor: colors.surface || colors.screenColor }]}>
                <Ionicons
                  name={endOfDayRecap?.workoutDone ? 'checkmark-circle' : 'barbell-outline'}
                  size={Math.min(hp(2.4), wp(5.4))}
                  color="#10B981"
                />
                <Text style={[styles.recapStatValue, { color: colors.textPrimary }]}>
                  {endOfDayRecap?.workoutCalories || 0}
                </Text>
                <Text style={[styles.recapStatLabel, { color: colors.textSecondary }]}>burned</Text>
              </View>
            </View>

            <View style={[styles.recapStreakRow, { backgroundColor: `${colors.primary}10` }]}>
              <Ionicons name="flame-outline" size={Math.min(hp(2.2), wp(5))} color={colors.warning || '#F59E0B'} />
              <Text style={[styles.recapStreakText, { color: colors.textPrimary }]}>
                Streak saved: {Number(streak?.streakCount || 0)} day{Number(streak?.streakCount || 0) === 1 ? '' : 's'}
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.recapButton, { backgroundColor: colors.primary }]}
              onPress={closeEndOfDayRecap}
              activeOpacity={0.85}
            >
              <Text style={[styles.recapButtonText, { color: colors.textOnPrimary }]}>Nice, Continue</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Main Content */}
      <View style={[styles.content, { backgroundColor: colors.screenColor }]}>
        <ScrollView 
          style={styles.list}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false} 
          showsHorizontalScrollIndicator={false}
          scrollEventThrottle={16}
        >
          <DashboardCommandCenter
            days={daysArray}
            appointments={dashboardAppointments}
            chatAlertCount={chatAlertCount}
            streak={streak}
            isPremium={isPremium}
            colors={colors}
            selectedMood={selectedMood}
            onOpenQuickAdd={() => setShowQuickAddSheet(true)}
            onQuickAddAction={handleQuickAddAction}
            goalDisplayMode={goalDisplayMode}
            showReadiness={false}
            showWeeklyReport={false}
            nutritionReport={nutritionReport}
            habitMission={habitMission}
            habitStreakCount={habitStreakCount}
            habitPreferences={habitPreferences}
            onCompleteHabitMission={handleCompleteHabitMission}
            onToggleHabitReminders={handleToggleHabitReminders}
          />

          {/* Streak Display Component */}
          {streak && (
            <StreakDisplay
              streakCount={streak.streakCount}
              longestStreak={streak.longestStreak}
              message={streak.message}
              streakPercentage={streak.streakPercentage}
              shouldSendReminder={streak.shouldSendReminder}
              loading={streakLoading}
            />
          )}

          {
            //calling 7 <Day> components with jsonResponse useState data
            daysArray.map((dayData, index) => (
              <Days
                key={index}
                props={dayData}
                onDayPress={navigateToDayDetails}
                showExerciseProgress={isPremium}
                goalDisplayMode={goalDisplayMode}
              />
            ))
          }

          <PersonalCoachFeed
            days={daysArray}
            appointments={dashboardAppointments}
            streak={streak}
            selectedMood={selectedMood}
            isPremium={isPremium}
            colors={colors}
            onAction={handleQuickAddAction}
            nutritionReport={nutritionReport}
            habitMission={habitMission}
            habitStreakCount={habitStreakCount}
          />

          <View style={styles.readinessSection}>
            <ReadinessScoreCard
              days={daysArray}
              isPremium={isPremium}
              colors={colors}
              selectedMood={selectedMood}
            />
          </View>

          <DashboardWeeklyHealthReport
            days={daysArray}
            appointments={dashboardAppointments}
            isPremium={isPremium}
            colors={colors}
            nutritionReport={nutritionReport}
          />
          <View style={styles.dietButtonClearance} />
        </ScrollView>

        <TouchableOpacity
          style={[styles.quickAddFab, { backgroundColor: colors.primary, shadowColor: colors.primary }]}
          onPress={() => setShowQuickAddSheet(true)}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={Math.min(hp(3.2), wp(7))} color={colors.textOnPrimary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.floatingButtonLeft, { backgroundColor: colors.secondary, shadowColor: colors.secondary }]}
          onPress={() => router.push('/(main)/(dashboard)/charts')}
          activeOpacity={0.8}
        >
          <Ionicons name="bar-chart" size={floatingButtonIconSize} color={colors.textOnPrimary} />
          <Text
            style={[styles.floatingButtonText, { color: colors.textOnPrimary }]}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            VIEW CHARTS
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.floatingButton, { backgroundColor: colors.primary, shadowColor: colors.primary }]}
          onPress={() => setShowDietPlanViewer(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="fast-food" size={floatingButtonIconSize} color={colors.textOnPrimary} />
          <Text
            style={[styles.floatingButtonText, { color: colors.textOnPrimary }]}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            VIEW DIET
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );

};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  list: {
    flex: 1,
    width: "100%",
  },
  listContent: {
    paddingBottom: hp(15),
    paddingTop: hp(1.5),
  },
  loadingState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: wp(8),
  },
  loadingTitle: {
    fontSize: Math.min(hp(2.05), wp(4.8)),
    fontWeight: "900",
    marginTop: hp(1.5),
    textAlign: "center",
  },
  loadingText: {
    fontSize: Math.min(hp(1.35), wp(3.2)),
    lineHeight: hp(2),
    fontWeight: "700",
    marginTop: hp(0.55),
    textAlign: "center",
  },
  loadStateIcon: {
    width: Math.min(hp(7.2), wp(16)),
    height: Math.min(hp(7.2), wp(16)),
    borderRadius: Math.min(hp(3.6), wp(8)),
    alignItems: "center",
    justifyContent: "center",
  },
  retryButton: {
    marginTop: hp(2),
    minHeight: hp(4.8),
    borderRadius: hp(2.4),
    paddingHorizontal: wp(5),
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: wp(1.8),
  },
  retryButtonText: {
    fontSize: Math.min(hp(1.55), wp(3.6)),
    fontWeight: "900",
  },
  readinessSection: {
    paddingHorizontal: wp(4),
    marginBottom: hp(1.5),
  },
  dietButtonClearance: {
    height: hp(12),
  },
  quickAddFab: {
    position: 'absolute',
    bottom: hp(21.2),
    right: wp(4),
    width: Math.min(hp(6.2), wp(13.5)),
    height: Math.min(hp(6.2), wp(13.5)),
    borderRadius: Math.min(hp(3.1), wp(6.75)),
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 14,
    shadowOffset: {
      width: 0,
      height: hp(0.75),
    },
    shadowOpacity: 0.38,
    shadowRadius: wp(2.2),
    borderWidth: wp(0.45),
    borderColor: 'rgba(255, 255, 255, 0.55)',
  },
  floatingButton: {
    position: 'absolute',
    bottom: hp(15),
    right: wp(4),
    maxWidth: wp(42),
    minHeight: hp(4.8),
    paddingHorizontal: wp(3.5),
    paddingVertical: hp(1.2),
    borderRadius: hp(4),
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 12,
    shadowOffset: {
      width: 0,
      height: hp(0.75),
    },
    shadowOpacity: 0.4,
    shadowRadius: wp(2.1),
    borderWidth: wp(0.4),
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  floatingButtonText: {
    fontSize: hp(1.5),
    fontWeight: '900',
    marginLeft: wp(1.6),
    letterSpacing: wp(0.15),
    flexShrink: 1,
  },
  floatingButtonLeft: {
    position: 'absolute',
    bottom: hp(15),
    left: wp(4),
    maxWidth: wp(44),
    minHeight: hp(4.8),
    paddingHorizontal: wp(3.5),
    paddingVertical: hp(1.2),
    borderRadius: hp(4),
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 12,
    shadowOffset: {
      width: 0,
      height: hp(0.75),
    },
    shadowOpacity: 0.4,
    shadowRadius: wp(2.1),
    borderWidth: wp(0.4),
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  recapOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.58)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: wp(5),
  },
  recapCard: {
    width: '100%',
    maxWidth: 520,
    borderRadius: hp(2.4),
    borderWidth: 1,
    padding: wp(5),
    alignItems: 'center',
  },
  recapIconWrap: {
    width: Math.min(hp(8), wp(17.5)),
    height: Math.min(hp(8), wp(17.5)),
    borderRadius: Math.min(hp(4), wp(8.75)),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: hp(1.2),
  },
  recapTitle: {
    fontSize: Math.min(hp(2.55), wp(5.8)),
    fontWeight: '900',
    textAlign: 'center',
  },
  recapSubtitle: {
    marginTop: hp(0.65),
    fontSize: Math.min(hp(1.45), wp(3.35)),
    fontWeight: '700',
    lineHeight: hp(2.1),
    textAlign: 'center',
  },
  recapStatsGrid: {
    width: '100%',
    flexDirection: 'row',
    gap: wp(2.3),
    marginTop: hp(2),
  },
  recapStat: {
    flex: 1,
    minHeight: hp(9.4),
    borderRadius: hp(1.5),
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: wp(1.2),
  },
  recapStatValue: {
    marginTop: hp(0.45),
    fontSize: Math.min(hp(1.85), wp(4.1)),
    fontWeight: '900',
  },
  recapStatLabel: {
    marginTop: hp(0.15),
    fontSize: Math.min(hp(1.08), wp(2.5)),
    fontWeight: '800',
    textAlign: 'center',
  },
  recapStreakRow: {
    width: '100%',
    minHeight: hp(4.8),
    borderRadius: hp(1.6),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: wp(1.6),
    marginTop: hp(1.6),
    paddingHorizontal: wp(3),
  },
  recapStreakText: {
    fontSize: Math.min(hp(1.35), wp(3.1)),
    fontWeight: '900',
  },
  recapButton: {
    width: '100%',
    minHeight: hp(5.6),
    borderRadius: hp(1.7),
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: hp(2),
  },
  recapButtonText: {
    fontSize: Math.min(hp(1.65), wp(3.75)),
    fontWeight: '900',
  },
});


