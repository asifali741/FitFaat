import AppHeader from "@/components/AppHeader";
import {
  QuickAddBottomSheet,
  type DashboardMoodValue,
  type QuickAddAction,
} from "@/components/dashboard/DashboardCommandCenter";
import { DashboardSevenDayJourney } from "@/components/dashboard/DashboardSevenDayJourney";
import { StepCounterCard } from "@/components/dashboard/StepCounterCard";
import NewsModalPopup from "@/components/NewsModalPopup";
import PatientDietPlanViewer from "@/components/PatientDietPlanViewer";
import { StreakDisplay } from "@/components/StreakDisplay";
import { useLiveWalkingProgress } from "@/hooks/useLiveWalkingProgress";
import { useNews } from "@/contexts/NewsContext";
import { useNotifications } from "@/contexts/NotificationContext";
import { useTheme } from "@/contexts/ThemeContext";
import {
  applyAdaptiveGoalsToJsonResponse,
  applyWeeklyWeightTrendCalibrationToCalories,
  calculateMifflinStJeorBaseGoals,
  loadAdaptiveGoalMetrics,
  loadWeeklyWeightTrendCalibration,
  runAdaptiveGoalFreshTargetQaCases,
} from "@/utils/adaptiveGoals";
import { dailyLogsApi } from "@/utils/dailyLogsApi";
import {
  getExerciseCaloriesBurned,
  mergeExerciseProgressIntoJsonResponse,
} from "@/utils/localExerciseProgress";
import {
  mergeWalkingProgressIntoJsonResponse,
} from "@/utils/localWalkingProgress";
import {
  getCalorieTargetProgress,
  getHydrationTargetProgress,
  loadGoalDisplayMode,
  runGoalTargetDisplayQaCases,
  type GoalDisplayMode,
} from "@/utils/goalTargetDisplay";
import {
  loadGoalSpineKey,
  runGoalSpineQaCases,
  type GoalSpineKey,
} from "@/utils/goalSpine";
import {
  getGoalPremiumFeatureCopy,
  runGoalExperienceQaCases,
} from "@/utils/goalExperience";
import { runGoalAdaptivePlanQaCases } from "@/utils/goalAdaptivePlan";
import { getIsPremiumUser } from "@/utils/premiumAccess";
import { tokenStorage } from "@/utils/auth/tokenStorage";
import { isRequestAbortError } from "@/utils/apiHelper";
import {
  evaluateDashboardCycleGuard,
  getActiveDayDuration,
  getDashboardLocalDateKey,
  runDashboardCycleGuardQaCases,
  shouldUseStaleDashboardCacheFallback,
} from "@/utils/dashboardCycleGuard";
import {
  mergeDailyProgressMap,
  runDailyProgressSyncQaCases,
} from "@/utils/dailyProgressSync";
import {
  getDashboardUserIdentity,
  getStoredDashboardCache,
  getStoredWeeklyTrackingId,
  setStoredDashboardCache,
} from "@/utils/dashboardStorage";
import { applyPendingDashboardMutations } from "@/utils/dashboardPendingMutations";
import { syncLatestHealthData } from "@/utils/healthDataSync";
import {
  buildNutritionProfile,
  scheduleAdaptiveNutritionNotifications,
  type NutritionGoalSummary,
} from "@/utils/nutritionProfile";
import {
  DASHBOARD_DEFAULT_MEAL_HOURS,
  DASHBOARD_DEFAULT_WATER_HOURS,
  getDashboardJourneyOrder,
  normalizeDashboardHours,
  parseDashboardOpenedStepSnapshot,
  serializeDashboardOpenedStepSnapshot,
  type DashboardJourneySection,
  type DashboardTimingHours,
} from "@/utils/dashboardJourneyOrder";
import { runPremiumClarityQaCases } from "@/utils/featureAccess";
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, AppState, InteractionManager, Modal, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from "react-native-responsive-screen";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  computeStreakFromDays,
  getDashboardTargetDay,
  getDashboardWeekHydrationValue as getHydrationValue,
  parseDashboardDate,
  sortByDayDate,
  startOfLocalDay,
} from "./dashboardWeek";
import { Day, jsonResponse } from "./types";

const getDashboardDateKey = getDashboardLocalDateKey;
const ONBOARDING_FIRST_LOG_NUDGE_KEY = 'fitfaat_onboarding_first_log_nudge';
const DASHBOARD_LAST_OPENED_STEPS_KEY = 'fitfaat_dashboard_last_opened_steps';
const DASHBOARD_PRIMARY_QUICK_ACTIONS: QuickAddAction[] = [
  'meal',
  'mealPlanner',
  'water',
  'steps',
  'mindfulness',
  'note',
  'settings',
];

const getCurrentDashboardDateKey = () => {
  const dateKey = getDashboardDateKey();
  if (dateKey) return dateKey;

  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
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
      dateKey: getDashboardDateKey(dailyLog.date),
      updatedAt: dailyLog.updatedAt || dailyLog.savedAt || dailyLog.createdAt,
      savedAt: dailyLog.savedAt,
      createdAt: dailyLog.createdAt,
      achievedCalories: dailyLog.achievedCalories,
      achieviedHydration: dailyLog.achievedHydration,
      achievedHydration: dailyLog.achievedHydration ?? dailyLog.achieviedHydration,
      calorieIntake: dailyLog.calorieIntake ?? dailyLog.caloriesIntake ?? dailyLog.achievedCalories,
      caloriesIntake: dailyLog.caloriesIntake ?? dailyLog.calorieIntake ?? dailyLog.achievedCalories,
      hydrationIntake: dailyLog.hydrationIntake ?? dailyLog.achievedHydration ?? dailyLog.achieviedHydration,
      meals: Array.isArray(dailyLog.meals) ? dailyLog.meals : [],
      waterIntake: Array.isArray(dailyLog.waterIntake) ? dailyLog.waterIntake : [],
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
      remarks: dailyLog.remarks || dailyLog.notes || null,
      notes: dailyLog.notes,
      duration: dailyLog.status === 'active' ? getActiveDayDuration(dailyLog) : 0,
      status: dailyLog.status as "locked" | "active" | "finished",
    };
  });
  
  return data as jsonResponse;
};

type StoredDashboardData = {
  data: jsonResponse;
  timestamp: Date;
  weeklyTrackingId?: string | null;
};

const normalizeStoredDashboardData = (value: unknown): StoredDashboardData | null => {
  if (!value || typeof value !== 'object') return null;

  const record = value as {
    data?: unknown;
    timestamp?: unknown;
    weeklyTrackingId?: unknown;
  };
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
    weeklyTrackingId: record.weeklyTrackingId ? String(record.weeklyTrackingId) : null,
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

const toGoalSummary = (day: Day): NutritionGoalSummary => ({
  dayLogId: day._id,
  dayNo: day.dayNo,
  date: day.date,
  achievedCalories: day.achievedCalories,
  targetCalories: day.targetCalories,
  targetCaloriesMin: day.targetCaloriesMin,
  targetCaloriesMax: day.targetCaloriesMax,
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
  calorieTargetLabel: string;
  achievedHydration: number;
  targetHydration: number;
  hydrationTargetLabel: string;
  workoutCalories: number;
  bestAction: string;
};

const END_OF_DAY_RECAP_STORAGE_PREFIX = 'fitfaat_end_day_recap_seen';
const DASHBOARD_FOCUS_REFRESH_TTL_MS = 90 * 1000;
const DASHBOARD_BACKGROUND_REFRESH_TTL_MS = 2 * 60 * 1000;
const DASHBOARD_APP_FOREGROUND_REFRESH_TTL_MS = 30 * 1000;
const HEALTH_SYNC_BACKGROUND_TTL_MS = 5 * 60 * 1000;
const DASHBOARD_UNLOCK_TIMER_BUFFER_MS = 250;
const DASHBOARD_UNLOCK_RETRY_MS = 1500;
const DASHBOARD_UNLOCK_MAX_RETRIES = 2;

const getDashboardDurationSeconds = (day?: Pick<Day, "date" | "duration"> | null) => {
  const durationSeconds = Number(day?.duration);
  const explicitDurationSeconds = Number.isFinite(durationSeconds)
    ? Math.max(0, Math.floor(durationSeconds))
    : 0;
  const localDaySeconds = day
    ? getActiveDayDuration({ date: day.date, duration: 0 })
    : 0;

  if (explicitDurationSeconds > 0 && localDaySeconds > 0) {
    return Math.min(explicitDurationSeconds, localDaySeconds);
  }

  return explicitDurationSeconds || localDaySeconds;
};

const getActiveDayUnlockTarget = (data: jsonResponse | null) => {
  if (!data) return null;

  const activeEntry = (Object.entries(data) as [keyof jsonResponse, Day][])
    .find(([, day]) => String(day.status || "").toLowerCase() === "active");
  if (!activeEntry) return null;

  const [dayKey, activeDay] = activeEntry;
  const durationSeconds = getDashboardDurationSeconds(activeDay);
  const identity = activeDay._id || activeDay.date || activeDay.dayNo || dayKey;

  return {
    dayKey: String(dayKey),
    durationSeconds,
    signature: `${dayKey}:${identity}:${durationSeconds}`,
  };
};

const buildEndOfDayRecap = (day: Day, goalDisplayMode: GoalDisplayMode): EndOfDayRecap => {
  const achievedCalories = Number(day.achievedCalories || 0);
  const targetCalories = Number(day.targetCalories || 0);
  const achievedHydration = getHydrationValue(day);
  const targetHydration = Number(day.targetHydration || 0);
  const workoutCalories = getExerciseCaloriesBurned(day);
  const calorieProgress = getCalorieTargetProgress(day, goalDisplayMode);
  const hydrationProgress = getHydrationTargetProgress(day, goalDisplayMode);
  const caloriesHit = goalDisplayMode === 'ranges'
    ? calorieProgress.isComplete
    : targetCalories > 0 && achievedCalories >= targetCalories;
  const hydrationHit = goalDisplayMode === 'ranges'
    ? hydrationProgress.isComplete
    : targetHydration > 0 && achievedHydration >= targetHydration;
  const workoutDone = workoutCalories > 0 || Number((day as any).exerciseDurationSeconds || 0) > 0;

  let bestAction = 'You checked in and kept momentum';
  if (caloriesHit && hydrationHit && workoutDone) {
    bestAction = 'Perfect day with nutrition, water, and workout complete';
  } else if (caloriesHit && hydrationHit) {
    bestAction = goalDisplayMode === 'ranges'
      ? 'Stayed within a healthy food and water range'
      : 'Balanced calories and hydration';
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
    calorieTargetLabel: goalDisplayMode === 'ranges'
      ? `${calorieProgress.range.min.toLocaleString()}-${calorieProgress.range.max.toLocaleString()}`
      : targetCalories.toLocaleString(),
    achievedHydration,
    targetHydration,
    hydrationTargetLabel: goalDisplayMode === 'ranges'
      ? `${hydrationProgress.range.min.toFixed(1)}-${hydrationProgress.range.max.toFixed(1)}`
      : targetHydration.toFixed(1),
    workoutCalories,
    bestAction,
  };
};

type DashboardActionHandlers = {
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
  const { scheduleFitFaatNotification, cancelScheduledNotification } = useNotifications();
  const [JsonResponse, setJsonResponse] = useState<null|jsonResponse>(null);
  const [showNewsModal, setShowNewsModal] = useState(false);
  const [showDietPlanViewer, setShowDietPlanViewer] = useState(false);
  const [showQuickAddSheet, setShowQuickAddSheet] = useState(false);
  const [selectedMood, setSelectedMood] = useState<DashboardMoodValue | null>(null);
  const [isPremium, setIsPremium] = useState(false);
  const [goalDisplayMode, setGoalDisplayMode] = useState<GoalDisplayMode>("exact");
  const [fitnessGoal, setFitnessGoal] = useState<GoalSpineKey>("unset");
  const [endOfDayRecap, setEndOfDayRecap] = useState<EndOfDayRecap | null>(null);
  const [dashboardLoadError, setDashboardLoadError] = useState<string | null>(null);
  const [dashboardRetryKey, setDashboardRetryKey] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [dashboardTimingHours, setDashboardTimingHours] = useState<DashboardTimingHours>({
    mealHours: DASHBOARD_DEFAULT_MEAL_HOURS,
    waterHours: DASHBOARD_DEFAULT_WATER_HOURS,
  });
  const [dashboardTimeTick, setDashboardTimeTick] = useState(() => Date.now());
  const [dashboardOpenedStepSnapshot, setDashboardOpenedStepSnapshot] = useState<number | null>(null);
  const hasCheckedForNewCycle = useRef(false);
  const cycleCheckInFlight = useRef(false);
  const adaptiveNutritionSignature = useRef<string | null>(null);
  const hasCompletedInitialLoad = useRef(false);
  const healthSyncInFlight = useRef(false);
  const lastHealthSyncAt = useRef(0);
  const lastFocusRefreshAt = useRef(0);
  const lastBackgroundRefreshAt = useRef(0);
  const lastAppForegroundRefreshAt = useRef(0);
  const activeDayUnlockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeDayUnlockRetryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeDayUnlockInFlightRef = useRef(false);
  const activeDayUnlockExpiresAtRef = useRef<number | null>(null);
  const liveWalkingProgress = useLiveWalkingProgress();
  const latestDashboardStepsRef = useRef(0);
  const dashboardActions = useRef<DashboardActionHandlers>({
    refreshDashboardInBackground: () => undefined,
    checkAndCreateNewCycle: async () => false,
    loadJson: async () => undefined,
    callApi: async () => false,
  });
  const moodStorageKey = `dashboardMood:${getDashboardDateKey()}`;

  const loadDashboardPreferences = useCallback(async () => {
    const [displayMode, goalKey] = await Promise.all([
      loadGoalDisplayMode().catch(() => "exact" as GoalDisplayMode),
      loadGoalSpineKey().catch(() => "unset" as GoalSpineKey),
    ]);

    setGoalDisplayMode(displayMode);
    setFitnessGoal(goalKey);
  }, []);

  useEffect(() => {
    latestDashboardStepsRef.current = Math.max(0, Math.round(liveWalkingProgress.steps || 0));
  }, [liveWalkingProgress.steps]);

  useEffect(() => {
    let active = true;
    const task = InteractionManager.runAfterInteractions(() => {
      buildNutritionProfile()
        .then((profile) => {
          if (!active) return;

          setDashboardTimingHours({
            mealHours: normalizeDashboardHours(profile.regularMealHours, DASHBOARD_DEFAULT_MEAL_HOURS),
            waterHours: normalizeDashboardHours(profile.hydrationHours, DASHBOARD_DEFAULT_WATER_HOURS),
          });
        })
        .catch((error) => {
          console.log('[Dashboard] Nutrition timing profile unavailable:', error);
        });
    });

    return () => {
      active = false;
      task.cancel();
    };
  }, []);

  useEffect(() => {
    const intervalId = setInterval(() => {
      setDashboardTimeTick(Date.now());
    }, 60 * 1000);

    return () => clearInterval(intervalId);
  }, []);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      AsyncStorage.getItem(DASHBOARD_LAST_OPENED_STEPS_KEY)
        .then((storedValue) => {
          if (!active) return;
          const fallbackSteps = latestDashboardStepsRef.current;
          setDashboardOpenedStepSnapshot(
            parseDashboardOpenedStepSnapshot({
              storedValue,
              currentSteps: fallbackSteps,
              currentDateKey: getCurrentDashboardDateKey(),
            })
          );
        })
        .catch((error) => {
          console.log('[Dashboard] Last opened step snapshot unavailable:', error);
          if (active) {
            setDashboardOpenedStepSnapshot(latestDashboardStepsRef.current);
          }
        });

      return () => {
        active = false;
        AsyncStorage.setItem(
          DASHBOARD_LAST_OPENED_STEPS_KEY,
          serializeDashboardOpenedStepSnapshot({
            steps: latestDashboardStepsRef.current,
            dateKey: getCurrentDashboardDateKey(),
          })
        ).catch((error) => {
          console.log('[Dashboard] Unable to save last opened step snapshot:', error);
        });
      };
    }, [])
  );

  useEffect(() => {
    let active = true;

    AsyncStorage.getItem(ONBOARDING_FIRST_LOG_NUDGE_KEY)
      .then(async (value) => {
        if (!active || value !== '1') return;
        await AsyncStorage.removeItem(ONBOARDING_FIRST_LOG_NUDGE_KEY);
        if (!active) return;

        Alert.alert(
          'Setup complete',
          'Start with water or your first meal so FitFaat can explain today from real logs.',
          [
            { text: 'Later', style: 'cancel' },
            { text: 'Quick Add', onPress: () => setShowQuickAddSheet(true) },
          ]
        );
      })
      .catch((error) => {
        console.log('[Dashboard] Onboarding nudge unavailable:', error);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (typeof __DEV__ === "undefined" || !__DEV__) return;

    const task = InteractionManager.runAfterInteractions(() => {
      const failedCases = runDashboardCycleGuardQaCases().filter((result) => !result.passed);
      if (failedCases.length) {
        console.warn("[DashboardCycleGuard] QA cases failed", failedCases);
      }

      const failedPremiumCases = runPremiumClarityQaCases().filter((result) => !result.passed);
      if (failedPremiumCases.length) {
        console.warn("[PremiumClarity] QA cases failed", failedPremiumCases);
      }

      const failedDailySyncCases = runDailyProgressSyncQaCases().filter((result) => !result.passed);
      if (failedDailySyncCases.length) {
        console.warn("[DailyProgressSync] QA cases failed", failedDailySyncCases);
      }

      const failedFreshTargetCases = runAdaptiveGoalFreshTargetQaCases().filter((result) => !result.passed);
      if (failedFreshTargetCases.length) {
        console.warn("[AdaptiveGoals] Fresh target QA cases failed", failedFreshTargetCases);
      }

      const failedGoalTargetCases = runGoalTargetDisplayQaCases().filter((result) => !result.passed);
      if (failedGoalTargetCases.length) {
        console.warn("[GoalTargetDisplay] QA cases failed", failedGoalTargetCases);
      }

      const failedGoalSpineCases = runGoalSpineQaCases().filter((result) => !result.passed);
      if (failedGoalSpineCases.length) {
        console.warn("[GoalSpine] QA cases failed", failedGoalSpineCases);
      }

      const failedGoalExperienceCases = runGoalExperienceQaCases().filter((result) => !result.passed);
      if (failedGoalExperienceCases.length) {
        console.warn("[GoalExperience] QA cases failed", failedGoalExperienceCases);
      }

      const failedGoalAdaptivePlanCases = runGoalAdaptivePlanQaCases().filter((result) => !result.passed);
      if (failedGoalAdaptivePlanCases.length) {
        console.warn("[GoalAdaptivePlan] QA cases failed", failedGoalAdaptivePlanCases);
      }
    });

    return () => {
      task.cancel();
    };
  }, []);

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
  }, [moodStorageKey]);

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
  const activeDayUnlockTarget = useMemo(
    () => getActiveDayUnlockTarget(JsonResponse),
    [JsonResponse]
  );
  const activeDayUnlockDayKey = activeDayUnlockTarget?.dayKey;
  const activeDayUnlockDurationSeconds = activeDayUnlockTarget?.durationSeconds;
  const activeDayUnlockSignature = activeDayUnlockTarget?.signature;

  //Get Data from API or Local Storage
  useEffect( () => { 
    let isActive = true;

    const fetchData = async () => {
      try {
        setDashboardLoadError(null);
        runHealthSyncInBackground();
        loadDashboardPreferences();

        const [premiumActive, stored] = await Promise.all([
          getIsPremiumUser(),
          checkLocalStorage(),
        ]);
        if (!isActive) return;

        setIsPremium(premiumActive);

        if (stored?.data) {
          await dashboardActions.current.loadJson(stored, premiumActive);
          if (isActive) {
            dashboardActions.current.refreshDashboardInBackground(premiumActive);
          }
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
  },[dashboardRetryKey, loadDashboardPreferences, runHealthSyncInBackground]);

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
        const user = await tokenStorage.getUser();
        const weeklyTrackingId = await getStoredWeeklyTrackingId(user);
        const userWeeklyTrackingId =
          user?.weeklyTrackingId ||
          user?.currentWeeklyTrackingId ||
          user?.weeklyTracking?._id ||
          user?.weeklyTracking?.id ||
          weeklyTrackingId;
        const guardDecision = evaluateDashboardCycleGuard({
          data: JsonResponse,
          cacheTimestamp: new Date(),
          storedWeeklyTrackingId: weeklyTrackingId,
          userWeeklyTrackingId,
        });

        if (guardDecision.action === "check-cycle" && guardDecision.reason === "all-days-finished") {
          console.log("[DashboardCycleGuard] All days finished, checking for a fresh weekly cycle.");
          hasCheckedForNewCycle.current = true;
          setTimeout(async () => {
            await dashboardActions.current.checkAndCreateNewCycle();
          }, 1000);
        }
        const allDays = Object.values(JsonResponse || {});
        const allFinished = allDays.every(day => day.status === 'finished');
        
        if (allFinished && !hasCheckedForNewCycle.current && guardDecision.action !== "check-cycle") {
          console.log('🔄 All days finished, checking for new cycle...');
          hasCheckedForNewCycle.current = true; // Prevent infinite loop
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

      const recap = buildEndOfDayRecap(finishedDay, goalDisplayMode);
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
  }, [JsonResponse, endOfDayRecap, goalDisplayMode]);

  // Check and create new cycle if needed
  const checkAndCreateNewCycle = async (premiumOverride = isPremium) => {
    if (cycleCheckInFlight.current) {
      return false;
    }

    cycleCheckInFlight.current = true;

    try {
      console.log("Checking if new cycle needed...");
      // Get user info
      const user = await tokenStorage.getUser();
      if (!user || !user.id) {
        console.log('No user found');
        return false;
      }

      const weeklyTrackingId = await getStoredWeeklyTrackingId(user);
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
      const activeWeeklyTrackingId = result.newWeeklyTrackingId || weeklyTrackingId;
      const dashboardUserId = getDashboardUserIdentity(user) || user.id;
      const storedBeforeFreshMerge = await checkLocalStorage();
      let data = mergeDailyProgressMap(
        storedBeforeFreshMerge?.data,
        convertToJsonResponse(result.data),
        { preferIncomingWhenUnclear: true }
      ) as jsonResponse;
      data = await mergeExerciseProgressIntoJsonResponse(data);
      data = await mergeWalkingProgressIntoJsonResponse(data);
      data = await applyPendingDashboardMutations(data, {
        userId: dashboardUserId,
        weeklyTrackingId: activeWeeklyTrackingId,
        source: "server",
      });
      data = applyAdaptiveGoalsToJsonResponse(data, adaptiveMetrics, {
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
    } finally {
      cycleCheckInFlight.current = false;
    }
  };

  const loadJson = async (
    {data, timestamp, weeklyTrackingId: storedWeeklyTrackingId} : StoredDashboardData,
    premiumOverride = isPremium
  ) =>{
    const user = await tokenStorage.getUser();
    const weeklyTrackingId = await getStoredWeeklyTrackingId(user);
    const userWeeklyTrackingId =
      user?.weeklyTrackingId ||
      user?.currentWeeklyTrackingId ||
      user?.weeklyTracking?._id ||
      user?.weeklyTracking?.id ||
      weeklyTrackingId;
    const adaptiveMetrics = await loadAdaptiveGoalMetrics(user);
    data = await mergeExerciseProgressIntoJsonResponse(data);
    data = await mergeWalkingProgressIntoJsonResponse(data);
    data = await applyPendingDashboardMutations(data, {
      userId: getDashboardUserIdentity(user) || user?.id,
      weeklyTrackingId,
      source: "local",
    });
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
    data = applyAdaptiveGoalsToJsonResponse(data, adaptiveMetrics, {
      plan: adaptivePlan,
      weightTrendCalibration,
    });

    const guardDecision = evaluateDashboardCycleGuard({
      data,
      cacheTimestamp: timestamp,
      storedWeeklyTrackingId: storedWeeklyTrackingId || weeklyTrackingId,
      userWeeklyTrackingId,
    });

    if (guardDecision.action === "check-cycle") {
      console.log("[DashboardCycleGuard] check-cycle needed:", guardDecision.reason);
      const loadedFreshData = await checkAndCreateNewCycle(premiumOverride);
      if (loadedFreshData) return;

      if (!shouldUseStaleDashboardCacheFallback(guardDecision)) {
        return;
      }

      console.log("[DashboardCycleGuard] Using stale dashboard cache after failed cycle check.");
    } else if (guardDecision.activeDayKey && data[guardDecision.activeDayKey as keyof jsonResponse]) {
      const activeDayKey = guardDecision.activeDayKey as keyof jsonResponse;
      data = {
        ...data,
        [activeDayKey]: {
          ...data[activeDayKey],
          duration: guardDecision.activeDayDuration,
        },
      };
    }

    setJsonResponse(data);
  }
  const callApi = async (premiumOverride = isPremium) => {
    // Delegate to the new checkAndCreateNewCycle function
    return await checkAndCreateNewCycle(premiumOverride);
  };
  dashboardActions.current = {
    refreshDashboardInBackground,
    checkAndCreateNewCycle,
    loadJson,
    callApi,
  };

  const triggerActiveDayUnlockRefresh = useCallback(
    async (reason: string, retryCount = 0) => {
      if (activeDayUnlockInFlightRef.current) return;

      activeDayUnlockInFlightRef.current = true;

      try {
        console.log(`[DashboardCycleGuard] Active day unlock refresh triggered: ${reason}`);
        const premiumActive = await getIsPremiumUser().catch(() => isPremium);
        setIsPremium(premiumActive);

        const loadedFreshData = await dashboardActions.current.checkAndCreateNewCycle(premiumActive);
        if (!loadedFreshData && retryCount < DASHBOARD_UNLOCK_MAX_RETRIES) {
          if (activeDayUnlockRetryTimerRef.current) {
            clearTimeout(activeDayUnlockRetryTimerRef.current);
          }
          activeDayUnlockRetryTimerRef.current = setTimeout(() => {
            triggerActiveDayUnlockRefresh(reason, retryCount + 1);
          }, DASHBOARD_UNLOCK_RETRY_MS);
        }
      } finally {
        activeDayUnlockInFlightRef.current = false;
      }
    },
    [isPremium]
  );

  useEffect(() => {
    if (activeDayUnlockTimerRef.current) {
      clearTimeout(activeDayUnlockTimerRef.current);
      activeDayUnlockTimerRef.current = null;
    }
    if (activeDayUnlockRetryTimerRef.current) {
      clearTimeout(activeDayUnlockRetryTimerRef.current);
      activeDayUnlockRetryTimerRef.current = null;
    }

    if (!activeDayUnlockDayKey || activeDayUnlockDurationSeconds === undefined) {
      activeDayUnlockExpiresAtRef.current = null;
      return;
    }

    const timeoutMs =
      activeDayUnlockDurationSeconds > 0
        ? activeDayUnlockDurationSeconds * 1000 + DASHBOARD_UNLOCK_TIMER_BUFFER_MS
        : 0;
    activeDayUnlockExpiresAtRef.current = Date.now() + timeoutMs;

    activeDayUnlockTimerRef.current = setTimeout(() => {
      triggerActiveDayUnlockRefresh(
        `timer-expired:${activeDayUnlockDayKey}:${activeDayUnlockDurationSeconds}s`
      );
    }, timeoutMs);

    return () => {
      if (activeDayUnlockTimerRef.current) {
        clearTimeout(activeDayUnlockTimerRef.current);
        activeDayUnlockTimerRef.current = null;
      }
      if (activeDayUnlockRetryTimerRef.current) {
        clearTimeout(activeDayUnlockRetryTimerRef.current);
        activeDayUnlockRetryTimerRef.current = null;
      }
      activeDayUnlockExpiresAtRef.current = null;
    };
  }, [
    activeDayUnlockDayKey,
    activeDayUnlockDurationSeconds,
    activeDayUnlockSignature,
    triggerActiveDayUnlockRefresh,
  ]);

  useFocusEffect(
    useCallback(() => {
      loadDashboardPreferences();
      runHealthSyncInBackground();

      if (!hasCompletedInitialLoad.current) {
        hasCompletedInitialLoad.current = true;
        return;
      }

      const now = Date.now();
      const unlockExpired =
        activeDayUnlockExpiresAtRef.current !== null &&
        now >= activeDayUnlockExpiresAtRef.current;
      if (!unlockExpired && now - lastFocusRefreshAt.current < DASHBOARD_FOCUS_REFRESH_TTL_MS) {
        return;
      }
      lastFocusRefreshAt.current = now;

      let isActive = true;

      const refreshFromCacheOrApi = async () => {
        if (unlockExpired) {
          await triggerActiveDayUnlockRefresh("focus-after-active-day-expired");
          return;
        }

        const [premiumActive, stored] = await Promise.all([
          getIsPremiumUser(),
          checkLocalStorage(),
        ]);
        if (!isActive) return;

        setIsPremium(premiumActive);

        if (stored?.data) {
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
    }, [loadDashboardPreferences, runHealthSyncInBackground, triggerActiveDayUnlockRefresh])
  );

  useEffect(() => {
    let isMounted = true;

    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState !== "active") return;

      const now = Date.now();
      const unlockExpired =
        activeDayUnlockExpiresAtRef.current !== null &&
        now >= activeDayUnlockExpiresAtRef.current;
      if (!unlockExpired && now - lastAppForegroundRefreshAt.current < DASHBOARD_APP_FOREGROUND_REFRESH_TTL_MS) {
        return;
      }
      lastAppForegroundRefreshAt.current = now;

      const refreshAfterResume = async () => {
        try {
          if (unlockExpired) {
            await triggerActiveDayUnlockRefresh("app-resumed-after-active-day-expired");
            return;
          }

          runHealthSyncInBackground();

          const [premiumActive, stored] = await Promise.all([
            getIsPremiumUser(),
            checkLocalStorage(),
          ]);

          if (!isMounted) return;

          setIsPremium(premiumActive);

          await loadDashboardPreferences();

          if (!isMounted) return;

          if (stored?.data) {
            await dashboardActions.current.loadJson(stored, premiumActive);
            if (isMounted) {
              dashboardActions.current.refreshDashboardInBackground(premiumActive);
            }
            return;
          }

          await dashboardActions.current.callApi(premiumActive);
        } catch (error) {
          if (!isRequestAbortError(error)) {
            console.log("[Dashboard] App resume refresh unavailable:", error);
          }
        }
      };

      refreshAfterResume();
    });

    return () => {
      isMounted = false;
      subscription.remove();
    };
  }, [loadDashboardPreferences, runHealthSyncInBackground, triggerActiveDayUnlockRefresh]);

  const handleDashboardRefresh = useCallback(async () => {
    if (isRefreshing) return;

    setIsRefreshing(true);
    setDashboardLoadError(null);
    runHealthSyncInBackground(true);

    try {
      const premiumActive = await getIsPremiumUser();
      setIsPremium(premiumActive);

      await loadDashboardPreferences();

      const loadedFreshData = await dashboardActions.current.callApi(premiumActive);
      if (!loadedFreshData) {
        const stored = await checkLocalStorage();
        if (stored?.data) {
          await dashboardActions.current.loadJson(stored, premiumActive);
          return;
        }

        throw new Error("Dashboard data is unavailable right now.");
      }
    } catch (error: any) {
      const message = error?.message || "Unable to refresh dashboard data.";
      console.log("[Dashboard] Pull-to-refresh failed:", error);
      if (!JsonResponse) {
        setDashboardLoadError(message);
      } else {
        Alert.alert("Refresh Failed", message);
      }
    } finally {
      setIsRefreshing(false);
    }
  }, [JsonResponse, isRefreshing, loadDashboardPreferences, runHealthSyncInBackground]);

  const daysArray: Day[] = useMemo(
    () => (JsonResponse ? Object.values(JsonResponse) : []),
    [JsonResponse]
  );
  const currentDashboardSteps = Math.max(0, Math.round(liveWalkingProgress.steps || 0));
  const stepsSinceLastDashboardOpen = dashboardOpenedStepSnapshot === null
    ? 0
    : Math.max(0, currentDashboardSteps - dashboardOpenedStepSnapshot);
  const dashboardJourneyOrder = useMemo(
    () =>
      getDashboardJourneyOrder({
        currentTime: dashboardTimeTick,
        timingHours: dashboardTimingHours,
        stepsSinceLastOpen: stepsSinceLastDashboardOpen,
      }),
    [dashboardTimeTick, dashboardTimingHours, stepsSinceLastDashboardOpen]
  );

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
  const openJourneyDayDetails = (day: Day): void => {
    router.push({
      pathname: "/(main)/(dashboard)/DetailsDay",
      params: {
        selectedDay: JSON.stringify(day),
      },
    });
  };

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
                FitFaat is preparing today's meals, water, steps, and report data.
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

    if (action === 'settings') {
      router.push('/(main)/(settings)' as any);
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
        Alert.alert(
          'Workout supports your goal',
          getGoalPremiumFeatureCopy(fitnessGoal, 'workoutModule'),
          [
            { text: 'Not now', style: 'cancel' },
            {
              text: 'View Premium',
              onPress: () => router.push('/(main)/(settings)/premium'),
            },
          ]
        );
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

  const displayStreak = streak || {
    streakCount: 0,
    longestStreak: 0,
    message: "Log one meal, water, or step session to start this week's rhythm.",
    streakPercentage: 0,
    shouldSendReminder: false,
  };

  const floatingButtonIconSize = Math.min(hp(2.2), wp(4.8));

  const renderDashboardJourneySection = (section: DashboardJourneySection) => {
    if (section === 'days') {
      return (
        <DashboardSevenDayJourney
          key="days"
          days={daysArray}
          goalDisplayMode={goalDisplayMode}
          isPremium={isPremium}
          colors={colors}
          onOpenDay={(day) => openJourneyDayDetails(day as Day)}
        />
      );
    }

    if (section === 'streak') {
      return (
        <StreakDisplay
          key="streak"
          streakCount={displayStreak.streakCount}
          longestStreak={displayStreak.longestStreak}
          message={displayStreak.message}
          streakPercentage={displayStreak.streakPercentage}
          shouldSendReminder={displayStreak.shouldSendReminder}
          loading={false}
        />
      );
    }

    return <StepCounterCard key="steps" colors={colors} />;
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.screenColor }]} edges={['top']}>
      <AppHeader 
        title="FitFaat Dashboard"
        showStepIndicator={false}
        showBackButton={false}
        showNotificationBell={true}
        notificationCount={unreadCount}
        onNotificationPress={handleNotificationPress}
        compactTitleSpacing
        titleMinimumFontScale={0.72}
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
        actions={DASHBOARD_PRIMARY_QUICK_ACTIONS}
        showMoodAction={false}
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
                  / {endOfDayRecap?.calorieTargetLabel || endOfDayRecap?.targetCalories || 0} cal
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
                  / {endOfDayRecap?.hydrationTargetLabel || endOfDayRecap?.targetHydration || 0}L
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
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleDashboardRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
              progressBackgroundColor={colors.cardBackground}
            />
          }
        >
          {dashboardJourneyOrder.map(renderDashboardJourneySection)}
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


