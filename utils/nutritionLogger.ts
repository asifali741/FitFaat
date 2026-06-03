import { dailyLogsApi } from "@/utils/dailyLogsApi";

export type NutritionMealDraft = {
  foodName: string;
  quantity: number;
  servingSize: string;
  calories: number;
  protein?: number;
  carbs?: number;
  fats?: number;
  description?: string;
  eatenAt?: string;
};

export type ConfirmedNutritionMutation = {
  type: "meal" | "hydration";
  entry?: any;
  calories?: number;
  hydrationAmount?: number;
  loggedAt?: string;
  recordedAt?: string;
  mealName?: string;
  proteinGrams?: number;
};

export type NutritionLogResult = {
  updatedDayData: any;
  mealResponses: any[];
  hasMeal: boolean;
  hasWater: boolean;
  successMessages: string[];
  loggedCalories: number;
  loggedProteinGrams: number;
  loggedMealCount: number;
  loggedWaterLiters: number;
  confirmedMutations: ConfirmedNutritionMutation[];
};

const toNumber = (value: unknown, fallback = 0) => {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
};

const getHydrationValue = (day: any) =>
  toNumber(day?.achieviedHydration ?? day?.achievedHydration);

const getHydrationFromWaterResponse = (waterResponse: any) => {
  const responseHydration = Number(
    waterResponse?.achieviedHydration ??
      waterResponse?.achievedHydration ??
      waterResponse?.dailyLog?.achievedHydration ??
      waterResponse?.data?.achievedHydration
  );

  return Number.isFinite(responseHydration) ? responseHydration : null;
};

const normalizeMealResponse = (
  mealResponse: any,
  draft: NutritionMealDraft,
  loggedAt: string,
  recordedAt: string
) => ({
  ...(mealResponse || {}),
  foodName:
    mealResponse?.foodName ||
    mealResponse?.food_name ||
    mealResponse?.name ||
    draft.foodName,
  calories: toNumber(mealResponse?.calories, draft.calories),
  protein:
    toNumber(
      mealResponse?.protein ??
        mealResponse?.protein_g ??
        mealResponse?.proteinGrams,
      draft.protein || 0
    ) || undefined,
  carbs:
    toNumber(
      mealResponse?.carbs ??
        mealResponse?.carbs_g ??
        mealResponse?.carbohydrates_g,
      draft.carbs || 0
    ) || undefined,
  fats:
    toNumber(mealResponse?.fats ?? mealResponse?.fat_g, draft.fats || 0) ||
    undefined,
  loggedAt: mealResponse?.loggedAt || mealResponse?.timestamp || loggedAt,
  timestamp: mealResponse?.timestamp || mealResponse?.loggedAt || loggedAt,
  createdAt: mealResponse?.createdAt || mealResponse?.loggedAt || loggedAt,
  recordedAt: mealResponse?.recordedAt || mealResponse?.savedAt || recordedAt,
});

export const logMealDraftsToDailyLog = async (
  dayLogId: string,
  dayData: any,
  drafts: NutritionMealDraft[]
): Promise<NutritionLogResult> => {
  let updatedDayData = { ...dayData };
  const mealResponses: any[] = [];
  const confirmedMutations: ConfirmedNutritionMutation[] = [];
  let loggedCalories = 0;
  let loggedProteinGrams = 0;
  let failedMealCount = 0;
  let firstMealError: unknown = null;

  for (const draft of drafts) {
    let mealResponse: any = null;
    const recordedAt = new Date().toISOString();
    const loggedAt = draft.eatenAt || recordedAt;
    try {
      mealResponse = await dailyLogsApi.addMeal(
        dayLogId,
        draft.foodName,
        draft.quantity,
        draft.servingSize,
        draft.calories,
        draft.protein,
        draft.carbs,
        draft.fats,
        draft.description || "",
        loggedAt
      );
    } catch (error) {
      firstMealError = firstMealError || error;
      failedMealCount += 1;
      continue;
    }

    if (!mealResponse) {
      failedMealCount += 1;
      continue;
    }

    loggedCalories += draft.calories;
    loggedProteinGrams += Math.max(0, Math.round(draft.protein || 0));
    const normalizedMealResponse = normalizeMealResponse(mealResponse, draft, loggedAt, recordedAt);
    mealResponses.push(normalizedMealResponse);
    confirmedMutations.push({
      type: "meal",
      entry: normalizedMealResponse,
      calories: draft.calories,
      loggedAt,
      recordedAt,
      mealName: draft.foodName,
      proteinGrams: Math.max(0, Math.round(draft.protein || 0)),
    });
  }

  if (!mealResponses.length && (firstMealError || failedMealCount)) {
    throw firstMealError || new Error("Meals could not be logged");
  }

  updatedDayData = {
    ...updatedDayData,
    achievedCalories: Number(updatedDayData.achievedCalories || 0) + loggedCalories,
    meals: [...(updatedDayData.meals || []), ...mealResponses],
  };

  return {
    updatedDayData,
    mealResponses,
    hasMeal: mealResponses.length > 0,
    hasWater: false,
    successMessages: [
      ...(mealResponses.length ? [`${loggedCalories} calories logged`] : []),
      ...(failedMealCount ? [`${failedMealCount} meal${failedMealCount === 1 ? "" : "s"} could not be logged`] : []),
    ],
    loggedCalories,
    loggedProteinGrams,
    loggedMealCount: mealResponses.length,
    loggedWaterLiters: 0,
    confirmedMutations,
  };
};

export const logNutritionEntryToDailyLog = async ({
  dayLogId,
  dayData,
  meal,
  waterAmount,
  drinkMeal,
}: {
  dayLogId: string;
  dayData: any;
  meal?: NutritionMealDraft | null;
  waterAmount?: number;
  drinkMeal?: NutritionMealDraft | null;
}): Promise<NutritionLogResult> => {
  let updatedDayData = { ...dayData };
  const mealResponses: any[] = [];
  const successMessages: string[] = [];
  const confirmedMutations: ConfirmedNutritionMutation[] = [];
  let hasMeal = false;
  let hasWater = false;
  let loggedCalories = 0;
  let loggedProteinGrams = 0;
  let loggedMealCount = 0;
  let loggedWaterLiters = 0;
  let firstError: unknown = null;

  if (meal && meal.calories > 0) {
    let mealResponse: any = null;
    const recordedAt = new Date().toISOString();
    const loggedAt = meal.eatenAt || recordedAt;
    try {
      mealResponse = await dailyLogsApi.addMeal(
        dayLogId,
        meal.foodName,
        meal.quantity,
        meal.servingSize,
        meal.calories,
        meal.protein,
        meal.carbs,
        meal.fats,
        meal.description || "",
        loggedAt
      );
    } catch (error) {
      firstError = firstError || error;
    }

    if (mealResponse) {
      const normalizedMealResponse = normalizeMealResponse(mealResponse, meal, loggedAt, recordedAt);
      hasMeal = true;
      loggedCalories += meal.calories;
      loggedProteinGrams += Math.max(0, Math.round(meal.protein || 0));
      loggedMealCount += 1;
      mealResponses.push(normalizedMealResponse);
      successMessages.push(`${meal.calories} calories logged`);
      updatedDayData = {
        ...updatedDayData,
        achievedCalories: Number(updatedDayData.achievedCalories || 0) + meal.calories,
        meals: updatedDayData.meals
          ? [...updatedDayData.meals, normalizedMealResponse]
          : [normalizedMealResponse],
      };
      confirmedMutations.push({
        type: "meal",
        entry: normalizedMealResponse,
        calories: meal.calories,
        loggedAt,
        recordedAt,
        mealName: meal.foodName,
        proteinGrams: Math.max(0, Math.round(meal.protein || 0)),
      });
    } else {
      successMessages.push("Meal could not be logged");
    }
  }

  const hydrationAmount = Math.max(0, toNumber(waterAmount));
  if (hydrationAmount > 0) {
    let waterResponse: any = null;
    const waterLoggedAt = new Date().toISOString();
    try {
      waterResponse = await dailyLogsApi.addWater(dayLogId, hydrationAmount);
    } catch (error) {
      firstError = firstError || error;
    }

    if (waterResponse) {
      hasWater = true;
      loggedWaterLiters = hydrationAmount;
      successMessages.push(`${hydrationAmount}L of water logged`);

      const responseHydration = getHydrationFromWaterResponse(waterResponse);
      const nextHydration = responseHydration ?? getHydrationValue(updatedDayData) + hydrationAmount;
      const latestWaterEntry = Array.isArray(waterResponse.waterIntake)
        ? waterResponse.waterIntake[waterResponse.waterIntake.length - 1]
        : waterResponse;
      const normalizedWaterEntry = {
        ...(latestWaterEntry || {}),
        amount: toNumber(latestWaterEntry?.amount, hydrationAmount),
        loggedAt: latestWaterEntry?.loggedAt || latestWaterEntry?.timestamp || waterLoggedAt,
        timestamp: latestWaterEntry?.timestamp || latestWaterEntry?.loggedAt || waterLoggedAt,
        createdAt: latestWaterEntry?.createdAt || waterLoggedAt,
      };
      const nextWaterIntake = Array.isArray(waterResponse.waterIntake)
        ? [
            ...waterResponse.waterIntake.slice(0, -1),
            normalizedWaterEntry,
          ]
        : [
            ...(Array.isArray(updatedDayData.waterIntake) ? updatedDayData.waterIntake : []),
            normalizedWaterEntry,
          ];
      updatedDayData = {
        ...updatedDayData,
        achieviedHydration: nextHydration,
        achievedHydration: nextHydration,
        waterIntake: nextWaterIntake,
      };
      confirmedMutations.push({
        type: "hydration",
        entry: normalizedWaterEntry,
        hydrationAmount,
        loggedAt: waterLoggedAt,
      });

      if (drinkMeal && drinkMeal.calories > 0) {
        let drinkMealResponse: any = null;
        const drinkRecordedAt = new Date().toISOString();
        const drinkLoggedAt = drinkMeal.eatenAt || drinkRecordedAt;
        try {
          drinkMealResponse = await dailyLogsApi.addMeal(
            dayLogId,
            drinkMeal.foodName,
            drinkMeal.quantity,
            drinkMeal.servingSize,
            drinkMeal.calories,
            drinkMeal.protein,
            drinkMeal.carbs,
            drinkMeal.fats,
            drinkMeal.description || "Logged from hydration",
            drinkLoggedAt
          );
        } catch (error) {
          console.log("[NutritionLogger] Drink calories were not logged:", error);
        }

        if (drinkMealResponse) {
          const normalizedDrinkMealResponse = normalizeMealResponse(
            drinkMealResponse,
            drinkMeal,
            drinkLoggedAt,
            drinkRecordedAt
          );
          hasMeal = true;
          loggedCalories += drinkMeal.calories;
          loggedProteinGrams += Math.max(0, Math.round(drinkMeal.protein || 0));
          loggedMealCount += 1;
          successMessages.push(`${drinkMeal.calories} drink calories logged`);
          mealResponses.push(normalizedDrinkMealResponse);
          updatedDayData = {
            ...updatedDayData,
            achievedCalories: Number(updatedDayData.achievedCalories || 0) + drinkMeal.calories,
            meals: [...(updatedDayData.meals || []), normalizedDrinkMealResponse],
          };
          confirmedMutations.push({
            type: "meal",
            entry: normalizedDrinkMealResponse,
            calories: drinkMeal.calories,
            loggedAt: drinkLoggedAt,
            recordedAt: drinkRecordedAt,
            mealName: drinkMeal.foodName,
            proteinGrams: Math.max(0, Math.round(drinkMeal.protein || 0)),
          });
        } else {
          successMessages.push("Drink calories could not be logged");
        }
      }
    } else {
      successMessages.push("Water could not be logged");
    }
  }

  if (!hasMeal && !hasWater && (firstError || successMessages.length)) {
    throw firstError || new Error(successMessages.join("\n"));
  }

  return {
    updatedDayData,
    mealResponses,
    hasMeal,
    hasWater,
    successMessages,
    loggedCalories,
    loggedProteinGrams,
    loggedMealCount,
    loggedWaterLiters,
    confirmedMutations,
  };
};
