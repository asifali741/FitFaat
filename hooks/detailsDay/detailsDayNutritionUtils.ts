import type { DietPreference } from "@/constants/foodDatabase";

export type MealTemplate = {
  id: string;
  name: string;
  servingSize: string;
  quantity: number;
  caloriesPerServing: number;
  proteinPerServing: number;
  carbsPerServing: number;
  fatsPerServing: number;
  createdAt: string;
};

export type MealLogDraft = {
  foodName: string;
  quantity: number;
  servingSize: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  description?: string;
};

export const isDietPreference = (value: string | null): value is DietPreference =>
  value === "all" || value === "vegetarian" || value === "nonVegetarian";

export const toMealNumber = (value: unknown, fallback = 0) => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : fallback;
};

export const normalizeFoodSearchText = (value: unknown) =>
  String(value || "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const foodDetectionStopWords = new Set([
  "food",
  "dish",
  "plate",
  "meal",
  "cuisine",
  "lunch",
  "dinner",
  "breakfast",
  "cooked",
  "prepared",
]);

export const getFoodTitle = (food: any) =>
  String(food?.food_name || food?.name || food?.foodName || food?.recipeName || "");

export const getDetectionTokens = (value: unknown) =>
  normalizeFoodSearchText(value)
    .split(" ")
    .filter((token) => token.length > 2 && !foodDetectionStopWords.has(token));

const getServingLiters = (servingSize?: unknown) => {
  const text = String(servingSize || "").toLowerCase();
  const mlMatch = text.match(/(\d+(?:\.\d+)?)\s*ml/);
  if (mlMatch) return Math.max(0, Number(mlMatch[1]) / 1000);

  const literMatch = text.match(/(\d+(?:\.\d+)?)\s*(l|liter|litre)/);
  if (literMatch) return Math.max(0, Number(literMatch[1]));

  return 0.25;
};

export const getDrinkHydrationLiters = (drink: any, quantity: unknown) => {
  if (!drink) return 0;

  const hydrationRatio = Math.max(0, toMealNumber(drink.hydration_percent, 100)) / 100;
  const servingLiters = getServingLiters(drink.serving_size || drink.servingSize);
  const servings = Math.max(0, toMealNumber(quantity, 1));

  return Math.round(servingLiters * hydrationRatio * servings * 100) / 100;
};

export const getDrinkNutritionTotals = (drink: any, quantity: unknown) => {
  const servings = Math.max(0, toMealNumber(quantity, 1));

  return {
    calories: Math.max(0, Math.round(toMealNumber(drink?.calories_kcal ?? drink?.calories) * servings)),
    protein: Math.max(0, Math.round(toMealNumber(drink?.protein_g) * servings)),
    carbs: Math.max(0, Math.round(toMealNumber(drink?.carbs_g ?? drink?.carbohydrates_g) * servings)),
    fats: Math.max(0, Math.round(toMealNumber(drink?.fat_g ?? drink?.fats_g) * servings)),
  };
};

export const getMealDisplayName = (meal: any) =>
  String(
    meal?.foodName ||
      meal?.food_name ||
      meal?.name ||
      meal?.mealName ||
      meal?.recipeName ||
      "Saved Meal"
  );

export const getMealServingSize = (meal: any) =>
  String(meal?.servingSize || meal?.serving_size || meal?.portion || "portion");

export const buildMealDraftFromTemplate = (template: MealTemplate): MealLogDraft => {
  const quantity = Math.max(0.5, toMealNumber(template.quantity, 1));

  return {
    foodName: template.name,
    quantity,
    servingSize: template.servingSize || "portion",
    calories: Math.round(template.caloriesPerServing * quantity),
    protein: Math.round(template.proteinPerServing * quantity),
    carbs: Math.round(template.carbsPerServing * quantity),
    fats: Math.round(template.fatsPerServing * quantity),
    description: "Added from meal template",
  };
};

export const buildMealDraftFromStoredMeal = (meal: any): MealLogDraft | null => {
  const quantity = Math.max(0.5, toMealNumber(meal?.quantity ?? meal?.servings, 1));
  const calories = Math.round(
    toMealNumber(
      meal?.calories ??
        meal?.calories_kcal ??
        meal?.totalCalories ??
        meal?.nutrition?.calories
    )
  );

  if (calories <= 0) return null;

  return {
    foodName: getMealDisplayName(meal),
    quantity,
    servingSize: getMealServingSize(meal),
    calories,
    protein: Math.round(
      toMealNumber(meal?.protein ?? meal?.protein_g ?? meal?.proteinGrams ?? meal?.nutrition?.protein)
    ),
    carbs: Math.round(
      toMealNumber(
        meal?.carbs ??
          meal?.carbs_g ??
          meal?.carbohydrates_g ??
          meal?.carbohydrates ??
          meal?.nutrition?.carbs
      )
    ),
    fats: Math.round(toMealNumber(meal?.fats ?? meal?.fat_g ?? meal?.fat ?? meal?.nutrition?.fat)),
    description: meal?.description || meal?.notes || "Repeated from yesterday",
  };
};

