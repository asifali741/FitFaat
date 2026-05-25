import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "expo-router";

import { pakistaniDishes } from "@/app/Dataset/dataSet";
import {
  dietPreferenceOptions,
  DIET_PREFERENCE_STORAGE_KEY,
  filterFoodsByDietPreference,
  getDietTypeForFood,
  type DietPreference,
} from "@/constants/foodDatabase";
import { customRecipesApi, type CustomRecipeData } from "@/utils/customRecipesApi";
import { getStoredDashboardCache } from "@/utils/dashboardStorage";
import { localSyncEvents } from "@/utils/localSyncEvents";

import {
  buildMealDraftFromStoredMeal,
  getFoodTitle,
  getMealDisplayName,
  isDietPreference,
  type MealLogDraft,
  type MealTemplate,
  toMealNumber,
} from "./detailsDayNutritionUtils";

const MEAL_TEMPLATES_STORAGE_KEY = "fitfaat_meal_templates";

type UseMealTemplatesParams = {
  calorieInput: string;
  mealQuantity: string;
  selectedFoodItem: any;
  detectedDishName: string;
  foodSearch: string;
  descriptionInput: string;
  dayData: any;
  setTrackingMode: (mode: "meal" | "hydration") => void;
  setSelectedFoodItem: (food: any) => void;
  setMealQuantity: (quantity: string) => void;
  setCalorieInput: (calories: string) => void;
  setFoodSearch: (search: string) => void;
  logMealDrafts: (
    drafts: MealLogDraft[],
    options?: { title?: string; closeAfterSave?: boolean }
  ) => Promise<void>;
};

export function useMealTemplates({
  calorieInput,
  mealQuantity,
  selectedFoodItem,
  detectedDishName,
  foodSearch,
  descriptionInput,
  dayData,
  setTrackingMode,
  setSelectedFoodItem,
  setMealQuantity,
  setCalorieInput,
  setFoodSearch,
  logMealDrafts,
}: UseMealTemplatesParams) {
  const [dietPreference, setDietPreference] = useState<DietPreference>("all");
  const [userCustomRecipes, setUserCustomRecipes] = useState<CustomRecipeData[]>([]);
  const [mealTemplates, setMealTemplates] = useState<MealTemplate[]>([]);
  const [isRepeatingYesterday, setIsRepeatingYesterday] = useState(false);
  const [filteredFoods, setFilteredFoods] = useState<any[]>([]);
  const [showFoodSearch, setShowFoodSearch] = useState(false);

  const loadMealTemplates = useCallback(async () => {
    try {
      const storedTemplates = await AsyncStorage.getItem(MEAL_TEMPLATES_STORAGE_KEY);
      const parsedTemplates = storedTemplates ? JSON.parse(storedTemplates) : [];
      setMealTemplates(Array.isArray(parsedTemplates) ? parsedTemplates.slice(0, 12) : []);
    } catch (error) {
      console.error("Error loading meal templates:", error);
      setMealTemplates([]);
    }
  }, []);

  useEffect(() => {
    loadMealTemplates();
  }, [loadMealTemplates]);

  useFocusEffect(
    useCallback(() => {
      loadMealTemplates();
    }, [loadMealTemplates])
  );

  useEffect(() => {
    const unsubscribe = localSyncEvents.subscribe((event) => {
      if (event.restoredKeys.includes(MEAL_TEMPLATES_STORAGE_KEY)) {
        loadMealTemplates();
      }
    });

    return unsubscribe;
  }, [loadMealTemplates]);

  const persistMealTemplates = useCallback(async (templates: MealTemplate[]) => {
    const nextTemplates = templates.slice(0, 12);
    setMealTemplates(nextTemplates);
    await AsyncStorage.setItem(MEAL_TEMPLATES_STORAGE_KEY, JSON.stringify(nextTemplates));
  }, []);

  const buildCurrentMealTemplate = useCallback((): MealTemplate | null => {
    const totalCalories = Math.round(toMealNumber(calorieInput));
    if (totalCalories <= 0) return null;

    const quantity = Math.max(0.5, toMealNumber(mealQuantity, 1));
    const baseCalories = toMealNumber(
      selectedFoodItem?.calories_kcal ?? selectedFoodItem?.calories,
      totalCalories / quantity
    );
    const templateName =
      (selectedFoodItem ? getMealDisplayName(selectedFoodItem) : "") ||
      detectedDishName ||
      foodSearch.trim() ||
      descriptionInput.trim() ||
      "Custom Meal";

    return {
      id: `${Date.now()}-${templateName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
      name: templateName,
      servingSize: selectedFoodItem?.serving_size || selectedFoodItem?.servingSize || "portion",
      quantity,
      caloriesPerServing: Math.max(1, Math.round(baseCalories)),
      proteinPerServing: toMealNumber(selectedFoodItem?.protein_g),
      carbsPerServing: toMealNumber(selectedFoodItem?.carbs_g ?? selectedFoodItem?.carbohydrates_g),
      fatsPerServing: toMealNumber(selectedFoodItem?.fat_g),
      createdAt: new Date().toISOString(),
    };
  }, [calorieInput, descriptionInput, detectedDishName, foodSearch, mealQuantity, selectedFoodItem]);

  const applyTemplateToForm = useCallback(
    (template: MealTemplate) => {
      setTrackingMode("meal");
      setSelectedFoodItem({
        food_name: template.name,
        serving_size: template.servingSize,
        calories_kcal: template.caloriesPerServing,
        calories: template.caloriesPerServing,
        protein_g: template.proteinPerServing,
        carbs_g: template.carbsPerServing,
        fat_g: template.fatsPerServing,
        isMealTemplate: true,
      });
      setMealQuantity(String(template.quantity || 1));
      setCalorieInput(String(Math.round(template.caloriesPerServing * (template.quantity || 1))));
      setFoodSearch("");
      setShowFoodSearch(false);
    },
    [setCalorieInput, setFoodSearch, setMealQuantity, setSelectedFoodItem, setTrackingMode]
  );

  const saveCurrentMealAsTemplate = useCallback(async () => {
    const template = buildCurrentMealTemplate();
    if (!template) {
      Alert.alert("Select a meal first", "Choose a food or enter calories before saving a meal template.");
      return;
    }

    const withoutDuplicate = mealTemplates.filter(
      (item) => item.name.trim().toLowerCase() !== template.name.trim().toLowerCase()
    );
    await persistMealTemplates([template, ...withoutDuplicate]);
    Alert.alert("Template Saved", `${template.name} is now available for one-tap meal logging.`);
  }, [buildCurrentMealTemplate, mealTemplates, persistMealTemplates]);

  const removeMealTemplate = useCallback(
    async (templateId: string) => {
      await persistMealTemplates(mealTemplates.filter((template) => template.id !== templateId));
    },
    [mealTemplates, persistMealTemplates]
  );

  useEffect(() => {
    const loadDietPreference = async () => {
      try {
        const savedPreference = await AsyncStorage.getItem(DIET_PREFERENCE_STORAGE_KEY);
        if (isDietPreference(savedPreference)) {
          setDietPreference(savedPreference);
        }
      } catch (error) {
        console.error("Error loading diet preference:", error);
      }
    };

    loadDietPreference();
  }, []);

  useEffect(() => {
    const fetchCustomRecipes = async () => {
      try {
        const recipes = await customRecipesApi.getUserRecipes();
        setUserCustomRecipes(recipes);
      } catch (error) {
        console.error("Error loading custom recipes:", error);
      }
    };
    fetchCustomRecipes();
  }, []);

  const handleDietPreferenceChange = useCallback(
    async (preference: DietPreference) => {
      setDietPreference(preference);
      setSelectedFoodItem(null);
      setFoodSearch("");
      setFilteredFoods([]);
      setShowFoodSearch(false);

      try {
        await AsyncStorage.setItem(DIET_PREFERENCE_STORAGE_KEY, preference);
      } catch (error) {
        console.error("Error saving diet preference:", error);
      }
    },
    [setFoodSearch, setSelectedFoodItem]
  );

  const quickPickFoods = useMemo<any[]>(() => {
    const getNormalizedFoodTitle = (food: any) => getFoodTitle(food).toLowerCase();
    const uniquePakistaniDishes = pakistaniDishes.filter((food: any, index: number, foods: any[]) => {
      const title = getNormalizedFoodTitle(food);
      return title.length > 0 && foods.findIndex((item: any) => getNormalizedFoodTitle(item) === title) === index;
    });
    const preferredByPreference: Record<DietPreference, string[]> = {
      all: ["Chicken Biryani", "Daal Chana", "Chicken Tikka Boti (Grilled)"],
      vegetarian: ["Chana Chaat", "Daal Chana", "Palak Paneer (Spinach with Cheese)"],
      nonVegetarian: ["Chicken Biryani", "Chicken Tikka Boti (Grilled)", "Mutton Karahi"],
    };
    const preferredNames = preferredByPreference[dietPreference].map((name) => name.toLowerCase());
    const preferredFoods = preferredNames
      .map((name) => uniquePakistaniDishes.find((food: any) => getNormalizedFoodTitle(food) === name))
      .filter((food): food is any => Boolean(food))
      .filter((food) => dietPreference === "all" || getDietTypeForFood(food) === dietPreference);
    const fallbackFoods = filterFoodsByDietPreference(uniquePakistaniDishes, dietPreference)
      .filter((food: any) => !preferredNames.includes(getNormalizedFoodTitle(food))) as any[];

    return [...preferredFoods, ...fallbackFoods].slice(0, 3);
  }, [dietPreference]);

  useEffect(() => {
    if (foodSearch.trim().length > 1) {
      const query = foodSearch.toLowerCase();

      const customRecipeMatches = userCustomRecipes
        .filter((recipe) => recipe.recipeName.toLowerCase().includes(query))
        .map((recipe) => ({
          food_name: recipe.recipeName,
          serving_size: recipe.servingSize,
          calories_kcal: recipe.calories_kcal,
          calories: recipe.calories_kcal,
          protein_g: recipe.protein_g,
          carbs_g: recipe.carbs_g,
          fat_g: recipe.fat_g,
          ingredients: recipe.ingredients,
          category: "My Recipe",
          isCustomRecipe: true,
          _id: recipe._id,
        }))
        .filter((recipe) => dietPreference === "all" || getDietTypeForFood(recipe) === dietPreference);

      const dishMatches = filterFoodsByDietPreference(
        pakistaniDishes.filter((dish: any) => {
          const name = dish.food_name || dish.name || "";
          const category = dish.category || "";
          return name.toLowerCase().includes(query) || category.toLowerCase().includes(query);
        }),
        dietPreference
      ).slice(0, 10);

      setFilteredFoods([...customRecipeMatches, ...dishMatches].slice(0, 15));
      setShowFoodSearch(true);
    } else {
      setShowFoodSearch(false);
      setFilteredFoods([]);
    }
  }, [dietPreference, foodSearch, userCustomRecipes]);

  const getPreviousDayMeals = useCallback(async () => {
    const cached = await getStoredDashboardCache<any>();
    if (!cached) return [];

    const cachedData = cached.data;
    const days = Object.values(cachedData || {}) as any[];
    const currentDate = dayData?.date ? new Date(dayData.date) : null;
    const sortedDays = days
      .filter(Boolean)
      .sort((a, b) => {
        const aDate = a?.date ? new Date(a.date).getTime() : Number(a?.dayNo || 0);
        const bDate = b?.date ? new Date(b.date).getTime() : Number(b?.dayNo || 0);
        return aDate - bDate;
      });

    const currentIndex = sortedDays.findIndex((day) => {
      if (day?._id && dayData?._id) return day._id === dayData._id;
      if (currentDate && day?.date) {
        const dayDate = new Date(day.date);
        return !Number.isNaN(dayDate.getTime()) && dayDate.toDateString() === currentDate.toDateString();
      }
      return Number(day?.dayNo) === Number(dayData?.dayNo);
    });
    const previousDay = currentIndex > 0
      ? sortedDays[currentIndex - 1]
      : sortedDays.find((day) => Number(day?.dayNo) === Number(dayData?.dayNo) - 1);

    return Array.isArray(previousDay?.meals) ? previousDay.meals : [];
  }, [dayData]);

  const handleRepeatYesterday = useCallback(async () => {
    setIsRepeatingYesterday(true);
    try {
      const previousMeals = await getPreviousDayMeals();
      const drafts = previousMeals
        .map(buildMealDraftFromStoredMeal)
        .filter((draft: MealLogDraft | null): draft is MealLogDraft => Boolean(draft));

      if (!drafts.length) {
        Alert.alert("No Previous Meals", "Yesterday does not have saved meals to repeat yet.");
        return;
      }

      await logMealDrafts(drafts, {
        title: "Yesterday Repeated",
      });
    } catch (error) {
      console.error("Error repeating yesterday meals:", error);
      Alert.alert("Error", "Could not repeat yesterday meals right now.");
    } finally {
      setIsRepeatingYesterday(false);
    }
  }, [getPreviousDayMeals, logMealDrafts]);

  return {
    dietPreference,
    dietPreferenceOptions,
    userCustomRecipes,
    setUserCustomRecipes,
    mealTemplates,
    filteredFoods,
    showFoodSearch,
    setShowFoodSearch,
    isRepeatingYesterday,
    quickPickFoods,
    applyTemplateToForm,
    saveCurrentMealAsTemplate,
    removeMealTemplate,
    handleDietPreferenceChange,
    handleRepeatYesterday,
  };
}

