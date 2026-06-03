import { useCallback, useEffect, useState } from "react";

import {
  applyAdaptiveGoalsToJsonResponse,
  loadAdaptiveGoalMetrics,
  loadWeeklyWeightTrendCalibration,
} from "@/utils/adaptiveGoals";
import { dailyLogsApi } from "@/utils/dailyLogsApi";
import {
  mergeDailyProgressDay,
  mergeDailyProgressMap,
} from "@/utils/dailyProgressSync";
import {
  getExerciseCaloriesBurned,
  mergeExerciseProgressIntoDay,
} from "@/utils/localExerciseProgress";
import {
  getWalkingCaloriesBurned,
  getWalkingCaloriesTarget,
  mergeWalkingProgressIntoDay,
} from "@/utils/localWalkingProgress";
import {
  getStoredDashboardCache,
  getStoredWeeklyTrackingId,
  removeStoredDashboardCache,
  setStoredDashboardCache,
} from "@/utils/dashboardStorage";
import {
  loadGoalDisplayMode,
  type GoalDisplayMode,
} from "@/utils/goalTargetDisplay";
import { getIsPremiumUser } from "@/utils/premiumAccess";
import { tokenStorage } from "@/utils/auth/tokenStorage";

type CompletionModalType = "confirm" | "success" | "weekComplete" | "error";

export const calculatePercentage = (achieved: number, target: number): number => {
  if (!target || target === 0) return 0;
  if (!achieved || achieved < 0) return 0;
  const percent = (achieved / target) * 100;
  return Math.min(Math.round(percent * 10) / 10, 100);
};

export function useDetailsDayData({
  initialDayData,
  router,
}: {
  initialDayData: any;
  router: any;
}) {
  const [dayData, setDayData] = useState<any>(initialDayData);
  const [isLoading, setIsLoading] = useState(false);
  const [isCompletingDay, setIsCompletingDay] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [goalDisplayMode, setGoalDisplayMode] = useState<GoalDisplayMode>("exact");
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [completionModalType, setCompletionModalType] = useState<CompletionModalType>("confirm");
  const [completionModalData, setCompletionModalData] = useState<any>({});

  useEffect(() => {
    let isActive = true;

    const fetchDayData = async () => {
      try {
        setIsLoading(false);
        const premiumActive = await getIsPremiumUser();
        if (!isActive) return;

        setIsPremium(premiumActive);
        loadGoalDisplayMode().then(setGoalDisplayMode).catch(() => setGoalDisplayMode("exact"));

        const freshDayData = initialDayData?._id
          ? await dailyLogsApi.getDailyLogFresh(String(initialDayData._id)).catch((error) => {
              console.log("[DetailsDay] Fresh daily log unavailable:", error);
              return null;
            })
          : null;
        const authoritativeDayData = freshDayData
          ? mergeDailyProgressDay(initialDayData, freshDayData, { preferIncomingWhenUnclear: true })
          : initialDayData;

        let dayWithExerciseProgress: any = await mergeExerciseProgressIntoDay(authoritativeDayData);
        if (premiumActive) {
          dayWithExerciseProgress = await mergeWalkingProgressIntoDay(dayWithExerciseProgress);
        }
        if (!isActive) return;

        setDayData({
          ...dayWithExerciseProgress,
          achievedCalories: dayWithExerciseProgress.achievedCalories || 0,
          achieviedHydration: dayWithExerciseProgress.achieviedHydration || 0,
          achievedHydration:
            dayWithExerciseProgress.achievedHydration ??
            dayWithExerciseProgress.achieviedHydration ??
            0,
          dateKey: dayWithExerciseProgress.dateKey,
          updatedAt: dayWithExerciseProgress.updatedAt,
          savedAt: dayWithExerciseProgress.savedAt,
          targetCalories: dayWithExerciseProgress.targetCalories,
          targetHydration: dayWithExerciseProgress.targetHydration,
          targetCaloriesMin: dayWithExerciseProgress.targetCaloriesMin,
          targetCaloriesMax: dayWithExerciseProgress.targetCaloriesMax,
          targetHydrationMin: dayWithExerciseProgress.targetHydrationMin,
          targetHydrationMax: dayWithExerciseProgress.targetHydrationMax,
          calibratedTargetCalories: dayWithExerciseProgress.calibratedTargetCalories,
          weightTrendCaloriesAdjustment: dayWithExerciseProgress.weightTrendCaloriesAdjustment,
          weightTrendExpectedKgPerWeek: dayWithExerciseProgress.weightTrendExpectedKgPerWeek,
          weightTrendObservedKgPerWeek: dayWithExerciseProgress.weightTrendObservedKgPerWeek,
          weightTrendConfidence: dayWithExerciseProgress.weightTrendConfidence,
          weightTrendStatus: dayWithExerciseProgress.weightTrendStatus,
          weightTrendMessage: dayWithExerciseProgress.weightTrendMessage,
          weightTrendGoalDirection: dayWithExerciseProgress.weightTrendGoalDirection,
          exerciseCaloriesBurned: getExerciseCaloriesBurned(dayWithExerciseProgress),
          exerciseDurationSeconds: dayWithExerciseProgress.exerciseDurationSeconds || 0,
          walkingCaloriesBurned: premiumActive ? getWalkingCaloriesBurned(dayWithExerciseProgress) : 0,
          targetWalkingCaloriesBurned: premiumActive ? getWalkingCaloriesTarget(dayWithExerciseProgress) : 0,
          walkingSteps: premiumActive ? dayWithExerciseProgress.walkingSteps || 0 : 0,
          meals: dayWithExerciseProgress.meals || [],
          waterIntake: dayWithExerciseProgress.waterIntake || [],
          remarks: dayWithExerciseProgress.remarks,
          notes: dayWithExerciseProgress.notes,
          status: dayWithExerciseProgress.status,
          isCompleted: dayWithExerciseProgress.isCompleted || false,
          completionPercentage: dayWithExerciseProgress.completionPercentage || 0,
        });
      } catch (error) {
        console.error("Error loading day data:", error);
        if (isActive) setDayData(initialDayData);
      } finally {
        if (isActive) setIsLoading(false);
      }
    };

    fetchDayData();

    return () => {
      isActive = false;
    };
  }, [initialDayData]);

  const syncUpdatedDayToLocalCache = useCallback(
    async (updatedDayData: any) => {
      try {
        const user = await tokenStorage.getUser();
        const weeklyTrackingId = await getStoredWeeklyTrackingId(user);
        const cached = await getStoredDashboardCache<any>(user, weeklyTrackingId);
        if (!cached) return updatedDayData;

        const cachedData = cached.data;
        const dayNo = Number(updatedDayData?.dayNo ?? updatedDayData?.dayNumber);
        const dayKey =
          Number.isFinite(dayNo) && dayNo > 0
            ? `day0${Math.round(dayNo)}`
            : updatedDayData?._id
              ? `log:${updatedDayData._id}`
              : "updated-day";

        if (!cachedData || typeof cachedData !== "object") return updatedDayData;

        const adaptiveMetrics = await loadAdaptiveGoalMetrics(user);
        const adaptivePlan = isPremium ? "premium" : "free";
        const mergedCache = mergeDailyProgressMap(
          cachedData,
          { [dayKey]: updatedDayData },
          { preferIncomingWhenUnclear: true }
        );
        const weightTrendCalibration = await loadWeeklyWeightTrendCalibration(
          adaptiveMetrics,
          mergedCache,
          {
            userId: user?.id,
            weeklyTrackingId,
            plan: adaptivePlan,
          }
        );
        const nextData = applyAdaptiveGoalsToJsonResponse(
          mergedCache,
          adaptiveMetrics,
          { plan: adaptivePlan, weightTrendCalibration }
        );
        const nextDayEntry = Object.entries(nextData).find(([key, day]: [string, any]) => {
          if (key === dayKey) return true;
          if (updatedDayData?._id && day?._id && String(updatedDayData._id) === String(day._id)) {
            return true;
          }
          return Number(updatedDayData?.dayNo) > 0 && Number(day?.dayNo) === Number(updatedDayData.dayNo);
        });
        const nextDayData = nextDayEntry?.[1] || updatedDayData;
        const nextStore = { data: nextData, timestamp: new Date() };

        await setStoredDashboardCache(nextStore, user, weeklyTrackingId);

        return {
          ...updatedDayData,
          baseTargetCalories: nextDayData.baseTargetCalories,
          baseTargetHydration: nextDayData.baseTargetHydration,
          targetCalories: nextDayData.targetCalories,
          targetHydration: nextDayData.targetHydration,
          targetCaloriesMin: nextDayData.targetCaloriesMin,
          targetCaloriesMax: nextDayData.targetCaloriesMax,
          targetHydrationMin: nextDayData.targetHydrationMin,
          targetHydrationMax: nextDayData.targetHydrationMax,
          calibratedTargetCalories: nextDayData.calibratedTargetCalories,
          weightTrendCaloriesAdjustment: nextDayData.weightTrendCaloriesAdjustment,
          weightTrendExpectedKgPerWeek: nextDayData.weightTrendExpectedKgPerWeek,
          weightTrendObservedKgPerWeek: nextDayData.weightTrendObservedKgPerWeek,
          weightTrendConfidence: nextDayData.weightTrendConfidence,
          weightTrendStatus: nextDayData.weightTrendStatus,
          weightTrendMessage: nextDayData.weightTrendMessage,
          weightTrendGoalDirection: nextDayData.weightTrendGoalDirection,
          adaptiveCaloriesAdjustment: nextDayData.adaptiveCaloriesAdjustment,
          adaptiveHydrationAdjustment: nextDayData.adaptiveHydrationAdjustment,
          idealTargetCalories: nextDayData.idealTargetCalories,
          idealTargetHydration: nextDayData.idealTargetHydration,
          behaviorCaloriesAdjustment: nextDayData.behaviorCaloriesAdjustment,
          behaviorHydrationAdjustment: nextDayData.behaviorHydrationAdjustment,
          calorieGap: nextDayData.calorieGap,
          hydrationGap: nextDayData.hydrationGap,
          calorieGoalDirection: nextDayData.calorieGoalDirection,
          nutritionGapSeverity: nextDayData.nutritionGapSeverity,
          hydrationRiskScore: nextDayData.hydrationRiskScore,
          recoveryNeedScore: nextDayData.recoveryNeedScore,
          goalRiskScore: nextDayData.goalRiskScore,
          nudgePriority: nextDayData.nudgePriority,
          nudgeReason: nextDayData.nudgeReason,
        };
      } catch (cacheError) {
        console.error("Error syncing adaptive goals cache:", cacheError);
        return updatedDayData;
      }
    },
    [isPremium]
  );

  const handleCompleteDay = useCallback(async () => {
    setCompletionModalType("confirm");
    setCompletionModalData({
      dayNumber: dayData.dayNo,
      onConfirm: async () => {
        setShowCompletionModal(false);

        try {
          setIsCompletingDay(true);

          const user = await tokenStorage.getUser();
          const weeklyTrackingId = await getStoredWeeklyTrackingId(user);
          if (!weeklyTrackingId) {
            setCompletionModalType("error");
            setCompletionModalData({ message: "Weekly tracking ID not found. Please restart the app." });
            setShowCompletionModal(true);
            return;
          }

          const result = await dailyLogsApi.completeDay(weeklyTrackingId, dayData.dayNo);
          await removeStoredDashboardCache(user, weeklyTrackingId);

          setCompletionModalType(result.cycleRestarted ? "weekComplete" : "success");
          setCompletionModalData({
            dayNumber: dayData.dayNo,
            onContinue: () => {
              setShowCompletionModal(false);
              router.back();
            },
          });
          setShowCompletionModal(true);
        } catch (error) {
          console.error("Error completing day:", error);
          setCompletionModalType("error");
          setCompletionModalData({
            message: error instanceof Error ? error.message : "Failed to complete day. Please try again.",
          });
          setShowCompletionModal(true);
        } finally {
          setIsCompletingDay(false);
        }
      },
      onCancel: () => setShowCompletionModal(false),
    });
    setShowCompletionModal(true);
  }, [dayData, router]);

  return {
    dayData,
    setDayData,
    isLoading,
    setIsLoading,
    isCompletingDay,
    isPremium,
    goalDisplayMode,
    showCompletionModal,
    setShowCompletionModal,
    completionModalType,
    completionModalData,
    syncUpdatedDayToLocalCache,
    handleCompleteDay,
  };
}

