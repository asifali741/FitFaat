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
      nextDayData,
    }: ConfirmedMutationInput) => {
      try {
        await recordDashboardPendingMutation({
          type,
          dayLogId,
          dayNo: nextDayData?.dayNo,
          entry,
          calories,
          hydrationAmount,
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
    }: {
      dayLogId: string;
      updatedDayData: any;
      loggedCalories: number;
      loggedProteinGrams: number;
      loggedMealCount: number;
      loggedWaterLiters: number;
    }) => {
      try {
        await recordNutritionProfileEntry({
          dayLogId,
          dayNo: updatedDayData.dayNo,
          dayDate: updatedDayData.date,
          timestamp: new Date().toISOString(),
          calories: loggedCalories,
          proteinGrams: loggedProteinGrams,
          mealCount: loggedMealCount,
          waterLiters: loggedWaterLiters,
          targetCalories: updatedDayData.targetCalories,
          achievedCaloriesAfter: updatedDayData.achievedCalories,
          targetHydration: updatedDayData.targetHydration,
          achievedHydrationAfter: updatedDayData.achieviedHydration,
        });

        await scheduleAdaptiveNutritionNotifications({
          summary: {
            dayLogId,
            dayNo: updatedDayData.dayNo,
            date: updatedDayData.date,
            achievedCalories: updatedDayData.achievedCalories,
            targetCalories: updatedDayData.targetCalories,
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
        Alert.alert("Error", "Failed to log meal template. Please check your connection.");
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
    }: {
      calorieInput: string;
      waterInput: string;
      selectedFoodItem: any;
      selectedDrink: any;
      drinkQuantity: string;
      mealQuantity: string;
      descriptionInput: string;
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
