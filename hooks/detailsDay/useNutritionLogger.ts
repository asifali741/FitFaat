import { useCallback } from "react";
import { Alert } from "react-native";

import { recordEarlyLogLocally } from "@/utils/achievementStorage";
import {
  recordDashboardPendingMutation,
} from "@/utils/dashboardPendingMutations";
import { removeStoredDashboardCache } from "@/utils/dashboardStorage";
import {
  logMealDraftsToDailyLog,
  logNutritionEntryToDailyLog,
  type ConfirmedNutritionMutation,
} from "@/utils/nutritionLogger";
import {
  recordNutritionProfileEntry,
  scheduleAdaptiveNutritionNotifications,
} from "@/utils/nutritionProfile";

import {
  getDrinkNutritionTotals,
  type MealLogDraft,
  toMealNumber,
} from "./detailsDayNutritionUtils";

type ConfirmedMutationInput = {
  type: "meal" | "hydration";
  dayLogId: string;
  entry?: any;
  calories?: number;
  hydrationAmount?: number;
  loggedAt?: string;
  recordedAt?: string;
  mealName?: string;
  proteinGrams?: number;
  nextDayData: any;
};

type UseNutritionLoggerParams = {
  dayData: any;
  initialDayData: any;
  router: any;
  setDayData: (day: any) => void;
  setIsLoading: (loading: boolean) => void;
  syncUpdatedDayToLocalCache: (updatedDayData: any) => Promise<any>;
  closeMenu: () => void;
  resetMealForm: () => void;
  resetNutritionForm: () => void;
  sendFitFaatNotification: (type: any, title: string, body: string) => Promise<void>;
  scheduleFitFaatNotification: (...args: any[]) => any;
  cancelScheduledNotification: (...args: any[]) => any;
};

export function useNutritionLogger({
  dayData,
  initialDayData,
  router,
  setDayData,
  setIsLoading,
  syncUpdatedDayToLocalCache,
  closeMenu,
  resetMealForm,
  resetNutritionForm,
  sendFitFaatNotification,
  scheduleFitFaatNotification,
  cancelScheduledNotification,
}: UseNutritionLoggerParams) {
  const recordConfirmedDashboardMutation = useCallback(
    async ({
      type,
      dayLogId,
      entry,
      calories,
      hydrationAmount,
      loggedAt,
      recordedAt,
      nextDayData,
    }: ConfirmedMutationInput) => {
      try {
        const mutationLoggedAt =
          loggedAt ||
          entry?.loggedAt ||
          entry?.timestamp ||
          entry?.createdAt ||
          new Date().toISOString();
        const mutationRecordedAt =
          recordedAt ||
          entry?.recordedAt ||
          entry?.savedAt ||
          new Date().toISOString();
        await recordDashboardPendingMutation({
          type,
          dayLogId,
          dayNo: nextDayData?.dayNo,
          entry,
          calories,
          hydrationAmount,
          loggedAt: mutationLoggedAt,
          occurredAt: mutationRecordedAt,
          confirmedAt: mutationRecordedAt,
          achievedCaloriesAfter: nextDayData?.achievedCalories,
          achievedHydrationAfter:
            nextDayData?.achieviedHydration ?? nextDayData?.achievedHydration,
        });
      } catch (mutationError) {
        console.log("[DetailsDay] Unable to record pending dashboard mutation:", mutationError);
      }
    },
    []
  );

  const updateNutritionProfile = useCallback(
    async ({
      dayLogId,
      updatedDayData,
      loggedCalories,
      loggedProteinGrams,
      loggedMealCount,
      loggedWaterLiters,
      confirmedMutations,
    }: {
      dayLogId: string;
      updatedDayData: any;
      loggedCalories: number;
      loggedProteinGrams: number;
      loggedMealCount: number;
      loggedWaterLiters: number;
      confirmedMutations: ConfirmedNutritionMutation[];
    }) => {
      try {
        const profileWrites = confirmedMutations
          .filter((mutation) => mutation.type === "meal" && Number(mutation.calories || 0) > 0)
          .map((mutation) => {
            const loggedAt =
              mutation.loggedAt ||
              mutation.entry?.loggedAt ||
              mutation.entry?.timestamp ||
              mutation.entry?.createdAt ||
              new Date().toISOString();
            const proteinGrams = Math.max(
              0,
              Math.round(
                Number(
                  mutation.proteinGrams ??
                    mutation.entry?.proteinGrams ??
                    mutation.entry?.protein ??
                    mutation.entry?.protein_g ??
                    0
                )
              )
            );

            return recordNutritionProfileEntry({
              dayLogId,
              dayNo: updatedDayData.dayNo,
              dayDate: updatedDayData.date,
              timestamp: loggedAt,
              loggedAt,
              recordedAt: mutation.recordedAt || mutation.entry?.recordedAt,
              eventType: "meal",
              source: "meal-log",
              mealName:
                mutation.mealName ||
                mutation.entry?.foodName ||
                mutation.entry?.food_name ||
                mutation.entry?.name ||
                "Meal",
              calories: Number(mutation.calories || mutation.entry?.calories || 0),
              proteinGrams,
              mealCount: 1,
              waterLiters: 0,
              targetCalories: updatedDayData.targetCalories,
              targetCaloriesMin: updatedDayData.targetCaloriesMin,
              targetCaloriesMax: updatedDayData.targetCaloriesMax,
              achievedCaloriesAfter: updatedDayData.achievedCalories,
              targetHydration: updatedDayData.targetHydration,
              achievedHydrationAfter: updatedDayData.achieviedHydration,
            });
          });

        const hydrationMutation = [...confirmedMutations]
          .reverse()
          .find((mutation) => mutation.type === "hydration");
        if (loggedWaterLiters > 0) {
          const loggedAt =
            hydrationMutation?.loggedAt ||
            hydrationMutation?.entry?.loggedAt ||
            hydrationMutation?.entry?.timestamp ||
            hydrationMutation?.entry?.createdAt ||
            new Date().toISOString();
          profileWrites.push(
            recordNutritionProfileEntry({
              dayLogId,
              dayNo: updatedDayData.dayNo,
              dayDate: updatedDayData.date,
              timestamp: loggedAt,
              loggedAt,
              eventType: "hydration",
              source: "hydration-log",
              calories: 0,
              proteinGrams: 0,
              mealCount: 0,
              waterLiters: loggedWaterLiters,
              targetCalories: updatedDayData.targetCalories,
              targetCaloriesMin: updatedDayData.targetCaloriesMin,
              targetCaloriesMax: updatedDayData.targetCaloriesMax,
              achievedCaloriesAfter: updatedDayData.achievedCalories,
              targetHydration: updatedDayData.targetHydration,
              achievedHydrationAfter: updatedDayData.achieviedHydration,
            })
          );
        }

        if (!profileWrites.length && (loggedCalories > 0 || loggedWaterLiters > 0 || loggedProteinGrams > 0)) {
          const loggedAt = new Date().toISOString();
          profileWrites.push(
            recordNutritionProfileEntry({
              dayLogId,
              dayNo: updatedDayData.dayNo,
              dayDate: updatedDayData.date,
              timestamp: loggedAt,
              loggedAt,
              eventType: loggedCalories > 0 ? "meal" : "hydration",
              source: "legacy-aggregate",
              calories: loggedCalories,
              proteinGrams: loggedProteinGrams,
              mealCount: loggedMealCount,
              waterLiters: loggedWaterLiters,
              targetCalories: updatedDayData.targetCalories,
              targetCaloriesMin: updatedDayData.targetCaloriesMin,
              targetCaloriesMax: updatedDayData.targetCaloriesMax,
              achievedCaloriesAfter: updatedDayData.achievedCalories,
              targetHydration: updatedDayData.targetHydration,
              achievedHydrationAfter: updatedDayData.achieviedHydration,
            })
          );
        }

        await Promise.all(profileWrites);

        await scheduleAdaptiveNutritionNotifications({
          summary: {
            dayLogId,
            dayNo: updatedDayData.dayNo,
            date: updatedDayData.date,
            achievedCalories: updatedDayData.achievedCalories,
            targetCalories: updatedDayData.targetCalories,
            targetCaloriesMin: updatedDayData.targetCaloriesMin,
            targetCaloriesMax: updatedDayData.targetCaloriesMax,
            achievedHydration: updatedDayData.achieviedHydration,
            targetHydration: updatedDayData.targetHydration,
            calorieGoalDirection: updatedDayData.calorieGoalDirection,
            nutritionGapSeverity: updatedDayData.nutritionGapSeverity,
            hydrationRiskScore: updatedDayData.hydrationRiskScore,
            recoveryNeedScore: updatedDayData.recoveryNeedScore,
            goalRiskScore: updatedDayData.goalRiskScore,
            nudgePriority: updatedDayData.nudgePriority,
            nudgeReason: updatedDayData.nudgeReason,
          },
          schedule: scheduleFitFaatNotification,
          cancel: cancelScheduledNotification,
        });
      } catch (profileError) {
        console.error("Error updating adaptive nutrition notifications:", profileError);
      }
    },
    [cancelScheduledNotification, scheduleFitFaatNotification]
  );

  const logMealDrafts = useCallback(
    async (
      drafts: MealLogDraft[],
      options: { title?: string; closeAfterSave?: boolean } = {}
    ) => {
      const validDrafts = drafts.filter((draft) => draft.calories > 0);
      if (!validDrafts.length) {
        Alert.alert("No meals found", "There are no meal calories to log.");
        return;
      }

      setIsLoading(true);
      try {
        const dayLogId = dayData?._id || initialDayData?._id;
        if (!dayLogId) {
          Alert.alert("Error", "Unable to find day log. Please refresh and try again.");
          return;
        }

        const logResult = await logMealDraftsToDailyLog(dayLogId, dayData, validDrafts);
        const loggedCalories = logResult.loggedCalories;
        const loggedProteinGrams = logResult.loggedProteinGrams;
        let updatedDayData: any = logResult.updatedDayData;

        updatedDayData = await syncUpdatedDayToLocalCache(updatedDayData);
        setDayData(updatedDayData);
        await Promise.all(
          logResult.confirmedMutations.map((mutation) =>
            recordConfirmedDashboardMutation({
              ...mutation,
              dayLogId,
              nextDayData: updatedDayData,
            })
          )
        );

        await recordEarlyLogLocally({ dayLogId, type: "meal" });
        await updateNutritionProfile({
          dayLogId,
          updatedDayData,
          loggedCalories,
          loggedProteinGrams,
          loggedMealCount: logResult.loggedMealCount,
          loggedWaterLiters: 0,
          confirmedMutations: logResult.confirmedMutations,
        });

        resetMealForm();

        await sendFitFaatNotification(
          "meal",
          options.title || "Meal Saved",
          `${loggedCalories} calories logged`
        );

        if (options.closeAfterSave !== false) {
          closeMenu();
        }

        Alert.alert(
          options.title || "Meal Saved",
          logResult.successMessages.length
            ? logResult.successMessages.join("\n")
            : logResult.loggedMealCount === 1
            ? `${validDrafts[0].foodName} added (${loggedCalories} calories).`
            : `${logResult.loggedMealCount} meals added (${loggedCalories} calories).`
        );
      } catch (error) {
        console.error("Error logging meal drafts:", error);
        Alert.alert("Error", "Failed to log meal. Please check your connection.");
      } finally {
        setIsLoading(false);
      }
    },
    [
      closeMenu,
      dayData,
      initialDayData,
      recordConfirmedDashboardMutation,
      resetMealForm,
      sendFitFaatNotification,
      setDayData,
      setIsLoading,
      syncUpdatedDayToLocalCache,
      updateNutritionProfile,
    ]
  );

  const handleSubmitNutritionEntry = useCallback(
    async ({
      calorieInput,
      waterInput,
      selectedFoodItem,
      selectedDrink,
      drinkQuantity,
      mealQuantity,
      descriptionInput,
      eatenAt,
    }: {
      calorieInput: string;
      waterInput: string;
      selectedFoodItem: any;
      selectedDrink: any;
      drinkQuantity: string;
      mealQuantity: string;
      descriptionInput: string;
      eatenAt?: string;
    }) => {
      setIsLoading(true);
      try {
        const dayLogId = dayData?._id || initialDayData?._id;

        if (!dayLogId) {
          Alert.alert("Error", "Unable to find day log. Please refresh and try again.");
          return;
        }

        const enteredMealCalories = Math.max(0, Math.round(toMealNumber(calorieInput)));
        const waterAmount = Math.max(0, toMealNumber(waterInput, 0));
        const mealDraft = enteredMealCalories > 0
          ? {
              foodName: selectedFoodItem?.food_name || selectedFoodItem?.name || "Custom Meal",
              quantity: Math.max(0.25, toMealNumber(mealQuantity, 1)),
              servingSize: selectedFoodItem?.serving_size || "portion",
              calories: enteredMealCalories,
              protein: Math.round((selectedFoodItem?.protein_g || 0) * Math.max(0.25, toMealNumber(mealQuantity, 1))),
              carbs: Math.round((selectedFoodItem?.carbs_g || selectedFoodItem?.carbohydrates_g || 0) * Math.max(0.25, toMealNumber(mealQuantity, 1))),
              fats: Math.round((selectedFoodItem?.fat_g || 0) * Math.max(0.25, toMealNumber(mealQuantity, 1))),
              description: descriptionInput,
              eatenAt,
            }
          : null;
        const drinkTotals = selectedDrink ? getDrinkNutritionTotals(selectedDrink, drinkQuantity) : null;
        const drinkMeal = selectedDrink && drinkTotals && drinkTotals.calories > 0
          ? {
              foodName: selectedDrink.drink_name || selectedDrink.food_name || "Hydration drink",
              quantity: Math.max(0.25, toMealNumber(drinkQuantity, 1)),
              servingSize: selectedDrink.serving_size || selectedDrink.servingSize || "serving",
              calories: drinkTotals.calories,
              protein: drinkTotals.protein,
              carbs: drinkTotals.carbs,
              fats: drinkTotals.fats,
              description: "Logged from hydration",
            }
          : null;
        const nutritionResult = await logNutritionEntryToDailyLog({
          dayLogId,
          dayData,
          meal: mealDraft,
          waterAmount,
          drinkMeal,
        });
        const {
          hasMeal,
          hasWater,
          successMessages,
          loggedCalories,
          loggedProteinGrams,
          loggedMealCount,
          loggedWaterLiters,
        } = nutritionResult;
        let updatedDayData: any = nutritionResult.updatedDayData;

        if (hasMeal || hasWater) {
          const hasPartialFailure = successMessages.some((message) =>
            message.toLowerCase().includes("could not")
          );

          updatedDayData = await syncUpdatedDayToLocalCache(updatedDayData);
          setDayData(updatedDayData);
          await Promise.all(
            nutritionResult.confirmedMutations.map((mutation) =>
              recordConfirmedDashboardMutation({
                ...mutation,
                dayLogId,
                nextDayData: updatedDayData,
              })
            )
          );
          await recordEarlyLogLocally({
            dayLogId,
            type: hasMeal && hasWater ? "mixed" : hasMeal ? "meal" : "hydration",
          });

          resetNutritionForm();

          await updateNutritionProfile({
            dayLogId,
            updatedDayData,
            loggedCalories,
            loggedProteinGrams,
            loggedMealCount,
            loggedWaterLiters,
            confirmedMutations: nutritionResult.confirmedMutations,
          });

          await sendFitFaatNotification(
            hasMeal ? "meal" : "health",
            hasMeal && hasWater ? "Food and Water Saved" : hasMeal ? "Food Saved" : "Water Saved",
            successMessages.join("\n")
          );

          setTimeout(() => {
            closeMenu();
            Alert.alert(hasPartialFailure ? "Partially Saved" : "Success!", successMessages.join("\n"));
          }, 100);
        } else {
          Alert.alert("Error", "Please enter at least meal calories or water amount");
        }
      } catch (error: any) {
        console.error("Error logging:", error);

        if (error.message?.includes("old/completed cycle") || error.message?.includes("CYCLE_EXPIRED")) {
          Alert.alert(
            "Cycle Expired",
            "Your data is outdated. A new weekly cycle has been created. Please go back to refresh.",
            [
              {
                text: "Go Back",
                onPress: () => {
                  removeStoredDashboardCache().then(() => {
                    router.back();
                  });
                },
              },
            ]
          );
        } else {
          Alert.alert("Error", "Failed to log entry. Please check your connection.");
        }
      } finally {
        setIsLoading(false);
      }
    },
    [
      closeMenu,
      dayData,
      initialDayData,
      recordConfirmedDashboardMutation,
      resetNutritionForm,
      router,
      sendFitFaatNotification,
      setDayData,
      setIsLoading,
      syncUpdatedDayToLocalCache,
      updateNutritionProfile,
    ]
  );

  return {
    logMealDrafts,
    handleSubmitNutritionEntry,
  };
}
