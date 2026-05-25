import AsyncStorage from '@react-native-async-storage/async-storage';

export const FITFAAT_MEAL_PLANS_STORAGE_KEY = 'fitfaat_meal_plans';
export const FITFAAT_GROCERY_LISTS_STORAGE_KEY = 'fitfaat_grocery_lists';

export type MealPlanType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export type FitFaatPlannedMeal = {
  id: string;
  dateKey: string;
  type: MealPlanType;
  name: string;
  calories?: number;
  protein?: number;
  carbs?: number;
  fats?: number;
  ingredients: string[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

export type FitFaatPlannedMealInput = {
  id?: string;
  dateKey: string;
  type: MealPlanType;
  name: string;
  calories?: number;
  protein?: number;
  carbs?: number;
  fats?: number;
  ingredients: string[];
  notes?: string;
};

export type FitFaatManualGroceryItem = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

export type FitFaatGroceryState = {
  checkedItemKeys: Record<string, boolean>;
  manualItems: FitFaatManualGroceryItem[];
  updatedAt: string;
};

export type FitFaatGroceryItem = {
  key: string;
  label: string;
  count: number;
  checked: boolean;
  source: 'planned' | 'manual';
};

const createId = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

const isValidMealType = (value: unknown): value is MealPlanType =>
  value === 'breakfast' || value === 'lunch' || value === 'dinner' || value === 'snack';

const toOptionalNumber = (value: unknown) => {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) && numberValue > 0
    ? Math.round(numberValue * 10) / 10
    : undefined;
};

export const getLocalDateKey = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const addDaysToDateKey = (dateKey: string, dayOffset: number) => {
  const date = new Date(`${dateKey}T12:00:00`);
  if (Number.isNaN(date.getTime())) return getLocalDateKey();
  date.setDate(date.getDate() + dayOffset);
  return getLocalDateKey(date);
};

export const formatPlannerDate = (dateKey: string) => {
  const date = new Date(`${dateKey}T12:00:00`);
  if (Number.isNaN(date.getTime())) return dateKey;

  return date.toLocaleDateString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
};

export const normalizeGroceryLabel = (value: string) =>
  value.trim().replace(/\s+/g, ' ');

export const getGroceryItemKey = (value: string) =>
  normalizeGroceryLabel(value).toLowerCase();

const normalizeMeal = (value: any): FitFaatPlannedMeal | null => {
  if (!value || typeof value !== 'object') return null;

  const dateKey = typeof value.dateKey === 'string' && value.dateKey
    ? value.dateKey
    : getLocalDateKey();
  const name = normalizeGroceryLabel(String(value.name || ''));
  if (!name) return null;
  const now = new Date().toISOString();

  return {
    id: typeof value.id === 'string' && value.id ? value.id : createId('meal-plan'),
    dateKey,
    type: isValidMealType(value.type) ? value.type : 'breakfast',
    name,
    calories: toOptionalNumber(value.calories),
    protein: toOptionalNumber(value.protein),
    carbs: toOptionalNumber(value.carbs),
    fats: toOptionalNumber(value.fats),
    ingredients: Array.isArray(value.ingredients)
      ? value.ingredients
          .map((ingredient: unknown) => normalizeGroceryLabel(String(ingredient || '')))
          .filter(Boolean)
      : [],
    notes: typeof value.notes === 'string' ? value.notes.trim() : undefined,
    createdAt: typeof value.createdAt === 'string' ? value.createdAt : now,
    updatedAt: typeof value.updatedAt === 'string' ? value.updatedAt : now,
  };
};

const normalizeGroceryState = (value: any): FitFaatGroceryState => {
  const now = new Date().toISOString();
  const checkedItemKeys =
    value?.checkedItemKeys && typeof value.checkedItemKeys === 'object'
      ? Object.fromEntries(
          Object.entries(value.checkedItemKeys).map(([key, checked]) => [key, Boolean(checked)])
        )
      : {};
  const manualItems = Array.isArray(value?.manualItems)
    ? value.manualItems
        .map((item: any) => {
          const name = normalizeGroceryLabel(String(item?.name || ''));
          if (!name) return null;

          return {
            id: typeof item?.id === 'string' && item.id ? item.id : createId('grocery'),
            name,
            createdAt: typeof item?.createdAt === 'string' ? item.createdAt : now,
            updatedAt: typeof item?.updatedAt === 'string' ? item.updatedAt : now,
          };
        })
        .filter(Boolean) as FitFaatManualGroceryItem[]
    : [];

  return {
    checkedItemKeys,
    manualItems,
    updatedAt: typeof value?.updatedAt === 'string' ? value.updatedAt : now,
  };
};

export const sortPlannedMeals = (meals: FitFaatPlannedMeal[]) => {
  const typeRank: Record<MealPlanType, number> = {
    breakfast: 0,
    lunch: 1,
    dinner: 2,
    snack: 3,
  };

  return [...meals].sort((left, right) => {
    if (left.dateKey !== right.dateKey) return left.dateKey.localeCompare(right.dateKey);
    if (left.type !== right.type) return typeRank[left.type] - typeRank[right.type];
    return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
  });
};

export const loadFitFaatMealPlans = async (): Promise<FitFaatPlannedMeal[]> => {
  const rawMeals = await AsyncStorage.getItem(FITFAAT_MEAL_PLANS_STORAGE_KEY);
  if (!rawMeals) return [];

  try {
    const parsed = JSON.parse(rawMeals);
    if (!Array.isArray(parsed)) return [];

    return sortPlannedMeals(parsed.map(normalizeMeal).filter(Boolean) as FitFaatPlannedMeal[]);
  } catch (error) {
    console.log('[MealPlanner] Unable to parse meal plans:', error);
    return [];
  }
};

export const saveFitFaatMealPlans = async (meals: FitFaatPlannedMeal[]) => {
  const normalizedMeals = meals.map(normalizeMeal).filter(Boolean) as FitFaatPlannedMeal[];
  await AsyncStorage.setItem(
    FITFAAT_MEAL_PLANS_STORAGE_KEY,
    JSON.stringify(sortPlannedMeals(normalizedMeals))
  );
};

export const upsertFitFaatMealPlan = async (input: FitFaatPlannedMealInput) => {
  const meals = await loadFitFaatMealPlans();
  const now = new Date().toISOString();
  const existingMeal = input.id ? meals.find((meal) => meal.id === input.id) : null;
  const nextMeal = normalizeMeal({
    ...input,
    id: existingMeal?.id || input.id || createId('meal-plan'),
    createdAt: existingMeal?.createdAt || now,
    updatedAt: now,
  });

  if (!nextMeal) {
    throw new Error('Meal name is required.');
  }

  const nextMeals = existingMeal
    ? meals.map((meal) => (meal.id === nextMeal.id ? nextMeal : meal))
    : [...meals, nextMeal];

  await saveFitFaatMealPlans(nextMeals);
  return nextMeal;
};

export const deleteFitFaatMealPlan = async (mealId: string) => {
  const meals = await loadFitFaatMealPlans();
  await saveFitFaatMealPlans(meals.filter((meal) => meal.id !== mealId));
};

export const loadFitFaatGroceryState = async (): Promise<FitFaatGroceryState> => {
  const rawState = await AsyncStorage.getItem(FITFAAT_GROCERY_LISTS_STORAGE_KEY);
  if (!rawState) {
    return normalizeGroceryState(null);
  }

  try {
    return normalizeGroceryState(JSON.parse(rawState));
  } catch (error) {
    console.log('[MealPlanner] Unable to parse grocery state:', error);
    return normalizeGroceryState(null);
  }
};

export const saveFitFaatGroceryState = async (state: FitFaatGroceryState) => {
  await AsyncStorage.setItem(
    FITFAAT_GROCERY_LISTS_STORAGE_KEY,
    JSON.stringify(normalizeGroceryState(state))
  );
};

export const upsertManualGroceryItem = async (name: string) => {
  const state = await loadFitFaatGroceryState();
  const normalizedName = normalizeGroceryLabel(name);
  if (!normalizedName) throw new Error('Grocery item is required.');
  const now = new Date().toISOString();
  const manualItem: FitFaatManualGroceryItem = {
    id: createId('grocery'),
    name: normalizedName,
    createdAt: now,
    updatedAt: now,
  };

  await saveFitFaatGroceryState({
    ...state,
    manualItems: [...state.manualItems, manualItem],
    updatedAt: now,
  });

  return manualItem;
};

export const deleteManualGroceryItem = async (itemId: string) => {
  const state = await loadFitFaatGroceryState();
  const now = new Date().toISOString();
  await saveFitFaatGroceryState({
    ...state,
    manualItems: state.manualItems.filter((item) => item.id !== itemId),
    updatedAt: now,
  });
};

export const setGroceryItemChecked = async (itemKey: string, checked: boolean) => {
  const state = await loadFitFaatGroceryState();
  const now = new Date().toISOString();
  await saveFitFaatGroceryState({
    ...state,
    checkedItemKeys: {
      ...state.checkedItemKeys,
      [itemKey]: checked,
    },
    updatedAt: now,
  });
};

export const clearCheckedGroceryItems = async () => {
  const state = await loadFitFaatGroceryState();
  await saveFitFaatGroceryState({
    ...state,
    checkedItemKeys: {},
    updatedAt: new Date().toISOString(),
  });
};

export const buildGeneratedGroceryList = (
  meals: FitFaatPlannedMeal[],
  groceryState: FitFaatGroceryState,
  startDateKey = getLocalDateKey(),
  endDateKey = addDaysToDateKey(startDateKey, 13)
): FitFaatGroceryItem[] => {
  const ingredientMap = new Map<string, { label: string; count: number }>();

  meals
    .filter((meal) => meal.dateKey >= startDateKey && meal.dateKey <= endDateKey)
    .forEach((meal) => {
      meal.ingredients.forEach((ingredient) => {
        const label = normalizeGroceryLabel(ingredient);
        if (!label) return;
        const key = getGroceryItemKey(label);
        const existing = ingredientMap.get(key);
        ingredientMap.set(key, {
          label: existing?.label || label,
          count: (existing?.count || 0) + 1,
        });
      });
    });

  const plannedItems: FitFaatGroceryItem[] = Array.from(ingredientMap.entries())
    .map(([key, item]) => ({
      key,
      label: item.label,
      count: item.count,
      checked: Boolean(groceryState.checkedItemKeys[key]),
      source: 'planned' as const,
    }));

  const manualItems: FitFaatGroceryItem[] = groceryState.manualItems.map((item) => {
    const key = `manual:${item.id}`;
    return {
      key,
      label: item.name,
      count: 1,
      checked: Boolean(groceryState.checkedItemKeys[key]),
      source: 'manual' as const,
    };
  });

  return [...plannedItems, ...manualItems].sort((left, right) => {
    if (left.checked !== right.checked) return left.checked ? 1 : -1;
    return left.label.localeCompare(right.label);
  });
};
