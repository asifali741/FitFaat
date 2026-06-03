import AppHeader from "@/components/AppHeader";
import { FeatureLimitBanner } from "@/components/common/FeatureLimitBanner";
import { useTheme } from "@/contexts/ThemeContext";
import { tokenStorage } from "@/utils/auth/tokenStorage";
import { getStoredDashboardCache } from "@/utils/dashboardStorage";
import { getFeatureAccessStatus, type FeatureAccessStatus } from "@/utils/featureAccess";
import {
  buildGoalMealPlannerStatus,
  getGoalExperience,
} from "@/utils/goalExperience";
import {
  buildGoalAdaptiveMealPlan,
  type GoalMealSuggestion,
} from "@/utils/goalAdaptivePlan";
import { loadGoalSpineKey, type GoalSpineKey } from "@/utils/goalSpine";
import {
  formatCalorieTarget,
  loadGoalDisplayMode,
  type GoalDisplayMode,
} from "@/utils/goalTargetDisplay";
import { localSyncEvents } from "@/utils/localSyncEvents";
import {
  addDaysToDateKey,
  buildGeneratedGroceryList,
  clearCheckedGroceryItems,
  deleteFitFaatMealPlan,
  deleteManualGroceryItem,
  FITFAAT_GROCERY_LISTS_STORAGE_KEY,
  FITFAAT_MEAL_PLANS_STORAGE_KEY,
  type FitFaatGroceryItem,
  type FitFaatGroceryState,
  type FitFaatPlannedMeal,
  formatPlannerDate,
  getLocalDateKey,
  loadFitFaatGroceryState,
  loadFitFaatMealPlans,
  type MealPlanType,
  setGroceryItemChecked,
  upsertFitFaatMealPlan,
  upsertManualGroceryItem,
} from "@/utils/localMealPlanner";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from "react-native-responsive-screen";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

type PlannerTab = "plan" | "grocery";

type MealTypeOption = {
  id: MealPlanType;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
};

const mealTypes: MealTypeOption[] = [
  { id: "breakfast", label: "Breakfast", icon: "sunny-outline", color: "#F59E0B" },
  { id: "lunch", label: "Lunch", icon: "restaurant-outline", color: "#10B981" },
  { id: "dinner", label: "Dinner", icon: "moon-outline", color: "#6366F1" },
  { id: "snack", label: "Snack", icon: "nutrition-outline", color: "#F97316" },
];

const emptyGroceryState: FitFaatGroceryState = {
  checkedItemKeys: {},
  manualItems: [],
  updatedAt: new Date(0).toISOString(),
};

const toInputNumber = (value?: number) =>
  value ? String(Number.isInteger(value) ? value : Math.round(value * 10) / 10) : "";

const parseNumberInput = (value: string) => {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) && numberValue > 0 ? numberValue : undefined;
};

const parseIngredients = (value: string) =>
  value
    .split(/\r?\n|;/)
    .map((item) => item.trim().replace(/\s+/g, " "))
    .filter(Boolean);

const getMealTypeOption = (type: MealPlanType) =>
  mealTypes.find((mealType) => mealType.id === type) || mealTypes[0];

const buildManualGroceryList = (groceryState: FitFaatGroceryState): FitFaatGroceryItem[] =>
  groceryState.manualItems
    .map((item) => {
      const key = `manual:${item.id}`;
      return {
        key,
        label: item.name,
        count: 1,
        checked: Boolean(groceryState.checkedItemKeys[key]),
        source: "manual" as const,
      };
    })
    .sort((left, right) => {
      if (left.checked !== right.checked) return left.checked ? 1 : -1;
      return left.label.localeCompare(right.label);
    });

const extractPlannerDashboardDays = (value: any): any[] => {
  const data = value?.data && typeof value.data === "object" && !Array.isArray(value.data)
    ? value.data
    : value;

  if (!data || typeof data !== "object") return [];
  return Array.isArray(data) ? data : Object.values(data);
};

const getDashboardDateKey = (day: any) => {
  const value = day?.dateKey || day?.date;
  if (!value) return "";
  const parsed = new Date(String(value));
  if (Number.isNaN(parsed.getTime())) {
    return String(value).slice(0, 10);
  }
  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const date = String(parsed.getDate()).padStart(2, "0");
  return `${year}-${month}-${date}`;
};

export default function MealPlannerScreen() {
  const router = useRouter();
  const { colors, isDarkMode } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(
    () => getStyles(colors, isDarkMode, insets.bottom),
    [colors, insets.bottom, isDarkMode]
  );
  const [activeTab, setActiveTab] = useState<PlannerTab>("plan");
  const [selectedDateKey, setSelectedDateKey] = useState(getLocalDateKey());
  const [meals, setMeals] = useState<FitFaatPlannedMeal[]>([]);
  const [groceryState, setGroceryState] = useState<FitFaatGroceryState>(emptyGroceryState);
  const [isLoading, setIsLoading] = useState(true);
  const [editorVisible, setEditorVisible] = useState(false);
  const [editingMeal, setEditingMeal] = useState<FitFaatPlannedMeal | null>(null);
  const [mealType, setMealType] = useState<MealPlanType>("breakfast");
  const [mealName, setMealName] = useState("");
  const [caloriesInput, setCaloriesInput] = useState("");
  const [proteinInput, setProteinInput] = useState("");
  const [carbsInput, setCarbsInput] = useState("");
  const [fatsInput, setFatsInput] = useState("");
  const [ingredientsInput, setIngredientsInput] = useState("");
  const [notesInput, setNotesInput] = useState("");
  const [manualGroceryInput, setManualGroceryInput] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [hasFullPlannerAccess, setHasFullPlannerAccess] = useState(true);
  const [mealPlannerAccess, setMealPlannerAccess] = useState<FeatureAccessStatus | null>(null);
  const [isAccessLoading, setIsAccessLoading] = useState(true);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [goalKey, setGoalKey] = useState<GoalSpineKey>("unset");
  const [goalDisplayMode, setGoalDisplayMode] = useState<GoalDisplayMode>("ranges");
  const [selectedTargetDay, setSelectedTargetDay] = useState<any | null>(null);

  const loadPlannerData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [storedMeals, storedGroceryState] = await Promise.all([
        loadFitFaatMealPlans(),
        loadFitFaatGroceryState(),
      ]);
      setMeals(storedMeals);
      setGroceryState(storedGroceryState);
    } catch (error) {
      console.log("[MealPlanner] Unable to load planner data:", error);
      Alert.alert("Meal Planner Error", "Could not load your meal planner right now.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadGoalPlannerContext = useCallback(async () => {
    try {
      const [nextGoal, nextDisplayMode, user] = await Promise.all([
        loadGoalSpineKey(),
        loadGoalDisplayMode().catch(() => "ranges" as GoalDisplayMode),
        tokenStorage.getUser().catch(() => null),
      ]);
      const cache = await getStoredDashboardCache(user).catch(() => null);
      const days = extractPlannerDashboardDays(cache?.data);
      const targetDay =
        days.find((day) => getDashboardDateKey(day) === selectedDateKey) ||
        days.find((day) => String(day?.status || "").toLowerCase() === "active") ||
        null;

      setGoalKey(nextGoal);
      setGoalDisplayMode(nextDisplayMode);
      setSelectedTargetDay(targetDay);
    } catch (error) {
      console.log("[MealPlanner] Unable to load goal context:", error);
      setGoalKey("unset");
      setSelectedTargetDay(null);
    }
  }, [selectedDateKey]);

  const loadPlannerAccessData = useCallback(async () => {
    setIsAccessLoading(true);

    try {
      const featureAccess = await getFeatureAccessStatus("mealPlannerPro");
      setMealPlannerAccess(featureAccess);
      setHasFullPlannerAccess(featureAccess.hasAccess);
      await loadPlannerData();
    } catch (error) {
      console.log("[MealPlanner] Failed to check planner access:", error);
      setMealPlannerAccess(null);
      setHasFullPlannerAccess(true);
      await loadPlannerData();
    } finally {
      setIsAccessLoading(false);
    }
  }, [loadPlannerData]);

  useFocusEffect(
    useCallback(() => {
      loadPlannerAccessData();
      loadGoalPlannerContext();
    }, [loadGoalPlannerContext, loadPlannerAccessData])
  );

  useEffect(() => {
    const unsubscribe = localSyncEvents.subscribe((event) => {
      if (
        event.restoredKeys.includes(FITFAAT_MEAL_PLANS_STORAGE_KEY) ||
        event.restoredKeys.includes(FITFAAT_GROCERY_LISTS_STORAGE_KEY)
      ) {
        loadPlannerData();
      }
    });

    return unsubscribe;
  }, [loadPlannerData]);

  useEffect(() => {
    loadGoalPlannerContext();
  }, [loadGoalPlannerContext]);

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const showSubscription = Keyboard.addListener(showEvent, () => setKeyboardVisible(true));
    const hideSubscription = Keyboard.addListener(hideEvent, () => setKeyboardVisible(false));

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  useEffect(() => {
    if (!editorVisible) {
      setKeyboardVisible(false);
    }
  }, [editorVisible]);

  const dateOptions = useMemo(() => {
    const todayKey = getLocalDateKey();
    return Array.from({ length: 10 }, (_, index) => {
      const dateKey = addDaysToDateKey(todayKey, index);
      return {
        dateKey,
        label: index === 0 ? "Today" : index === 1 ? "Tomorrow" : formatPlannerDate(dateKey),
      };
    });
  }, []);

  const selectedDateMeals = useMemo(
    () => meals.filter((meal) => meal.dateKey === selectedDateKey),
    [meals, selectedDateKey]
  );

  const selectedDateCalories = useMemo(
    () => selectedDateMeals.reduce((sum, meal) => sum + Number(meal.calories || 0), 0),
    [selectedDateMeals]
  );

  const goalExperience = useMemo(() => getGoalExperience(goalKey), [goalKey]);
  const selectedTargetLabel = useMemo(
    () => selectedTargetDay ? formatCalorieTarget(selectedTargetDay, goalDisplayMode, hasFullPlannerAccess ? "premium" : "free") : null,
    [goalDisplayMode, hasFullPlannerAccess, selectedTargetDay]
  );
  const plannerGoalStatus = useMemo(
    () =>
      buildGoalMealPlannerStatus({
        goal: goalKey,
        plannedCalories: hasFullPlannerAccess ? selectedDateCalories : 0,
        targetCalories: selectedTargetDay?.targetCalories,
        targetCaloriesMin: selectedTargetDay?.targetCaloriesMin,
        targetCaloriesMax: selectedTargetDay?.targetCaloriesMax,
        targetLabel: selectedTargetLabel,
      }),
    [goalKey, hasFullPlannerAccess, selectedDateCalories, selectedTargetDay, selectedTargetLabel]
  );
  const adaptiveMealPlan = useMemo(
    () =>
      buildGoalAdaptiveMealPlan({
        goal: goalKey,
        targetDay: selectedTargetDay,
        plannedMeals: selectedDateMeals,
        isPremium: hasFullPlannerAccess,
      }),
    [goalKey, hasFullPlannerAccess, selectedDateMeals, selectedTargetDay]
  );

  const groceryItems = useMemo(
    () => (hasFullPlannerAccess ? buildGeneratedGroceryList(meals, groceryState) : buildManualGroceryList(groceryState)),
    [groceryState, hasFullPlannerAccess, meals]
  );

  const grocerySummary = useMemo(() => {
    const checkedCount = groceryItems.filter((item) => item.checked).length;
    return {
      total: groceryItems.length,
      checked: checkedCount,
      remaining: Math.max(0, groceryItems.length - checkedCount),
    };
  }, [groceryItems]);

  const openNewMeal = (type: MealPlanType = "breakfast") => {
    setEditingMeal(null);
    setMealType(type);
    setMealName("");
    setCaloriesInput("");
    setProteinInput("");
    setCarbsInput("");
    setFatsInput("");
    setIngredientsInput("");
    setNotesInput("");
    setEditorVisible(true);
  };

  const openEditMeal = (meal: FitFaatPlannedMeal) => {
    setEditingMeal(meal);
    setMealType(meal.type);
    setMealName(meal.name);
    setCaloriesInput(toInputNumber(meal.calories));
    setProteinInput(toInputNumber(meal.protein));
    setCarbsInput(toInputNumber(meal.carbs));
    setFatsInput(toInputNumber(meal.fats));
    setIngredientsInput(meal.ingredients.join("\n"));
    setNotesInput(meal.notes || "");
    setEditorVisible(true);
  };

  const closeEditor = () => {
    if (isSaving) return;
    setEditorVisible(false);
    setEditingMeal(null);
  };

  const saveMeal = async () => {
    if (!mealName.trim()) {
      Alert.alert("Meal Name Required", "Add a meal name before saving.");
      return;
    }

    try {
      setIsSaving(true);
      await upsertFitFaatMealPlan({
        id: editingMeal?.id,
        dateKey: editingMeal?.dateKey || selectedDateKey,
        type: mealType,
        name: mealName,
        calories: hasFullPlannerAccess ? parseNumberInput(caloriesInput) : editingMeal?.calories,
        protein: hasFullPlannerAccess ? parseNumberInput(proteinInput) : editingMeal?.protein,
        carbs: hasFullPlannerAccess ? parseNumberInput(carbsInput) : editingMeal?.carbs,
        fats: hasFullPlannerAccess ? parseNumberInput(fatsInput) : editingMeal?.fats,
        ingredients: hasFullPlannerAccess ? parseIngredients(ingredientsInput) : editingMeal?.ingredients || [],
        notes: hasFullPlannerAccess ? notesInput.trim() || undefined : editingMeal?.notes,
      });
      await loadPlannerData();
      setEditorVisible(false);
      setEditingMeal(null);
    } catch (error: any) {
      Alert.alert("Save Failed", error?.message || "Could not save this meal.");
    } finally {
      setIsSaving(false);
    }
  };

  const saveSuggestedMeal = async (suggestion: GoalMealSuggestion) => {
    try {
      await upsertFitFaatMealPlan({
        dateKey: selectedDateKey,
        type: suggestion.type,
        name: suggestion.name,
        calories: hasFullPlannerAccess ? suggestion.calories : undefined,
        protein: hasFullPlannerAccess ? suggestion.protein : undefined,
        carbs: hasFullPlannerAccess ? suggestion.carbs : undefined,
        fats: hasFullPlannerAccess ? suggestion.fats : undefined,
        ingredients: hasFullPlannerAccess ? suggestion.ingredients : [],
        notes: hasFullPlannerAccess ? `${suggestion.notes} ${suggestion.timing}` : undefined,
      });
      await loadPlannerData();
      Alert.alert(
        "Suggestion saved",
        hasFullPlannerAccess
          ? `${suggestion.name} was added with macros and ingredients.`
          : `${suggestion.name} was added to your meal plan.`
      );
    } catch (error: any) {
      Alert.alert("Could Not Save", error?.message || "Please try again.");
    }
  };

  const confirmDeleteMeal = (meal: FitFaatPlannedMeal) => {
    Alert.alert("Delete Meal?", `${meal.name} will be removed from your plan.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await deleteFitFaatMealPlan(meal.id);
          await loadPlannerData();
          if (editingMeal?.id === meal.id) closeEditor();
        },
      },
    ]);
  };

  const toggleGroceryItem = async (item: FitFaatGroceryItem) => {
    const nextChecked = !item.checked;
    setGroceryState((current) => ({
      ...current,
      checkedItemKeys: {
        ...current.checkedItemKeys,
        [item.key]: nextChecked,
      },
      updatedAt: new Date().toISOString(),
    }));
    await setGroceryItemChecked(item.key, nextChecked);
    setGroceryState(await loadFitFaatGroceryState());
  };

  const addManualGrocery = async () => {
    if (!manualGroceryInput.trim()) {
      Alert.alert("Item Required", "Write an item name first.");
      return;
    }

    try {
      await upsertManualGroceryItem(manualGroceryInput);
      setManualGroceryInput("");
      await loadPlannerData();
    } catch (error: any) {
      Alert.alert("Could Not Add Item", error?.message || "Please try again.");
    }
  };

  const removeManualGrocery = async (itemKey: string) => {
    const itemId = itemKey.replace(/^manual:/, "");
    await deleteManualGroceryItem(itemId);
    await loadPlannerData();
  };

  const clearChecked = () => {
    Alert.alert("Clear Checked Items?", "This will uncheck the grocery list, not delete planned meals.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Clear",
        onPress: async () => {
          await clearCheckedGroceryItems();
          await loadPlannerData();
        },
      },
    ]);
  };

  const renderMealCard = (meal: FitFaatPlannedMeal) => {
    const typeOption = getMealTypeOption(meal.type);

    return (
      <View key={meal.id} style={styles.mealCard}>
        <View style={styles.mealCardHeader}>
          <View style={[styles.mealIcon, { backgroundColor: `${typeOption.color}18` }]}>
            <Ionicons
              name={typeOption.icon}
              size={Math.min(hp(2.6), wp(5.8))}
              color={typeOption.color}
            />
          </View>
          <View style={styles.mealTitleWrap}>
            <Text style={styles.mealName} numberOfLines={1}>
              {meal.name}
            </Text>
            <Text style={styles.mealMeta} numberOfLines={1}>
              {typeOption.label}
              {hasFullPlannerAccess && meal.calories ? ` - ${Math.round(meal.calories)} kcal` : ""}
            </Text>
          </View>
          <View style={styles.mealActions}>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => openEditMeal(meal)}
              accessibilityRole="button"
              accessibilityLabel="Edit planned meal"
            >
              <Ionicons name="create-outline" size={Math.min(hp(2.3), wp(5))} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => confirmDeleteMeal(meal)}
              accessibilityRole="button"
              accessibilityLabel="Delete planned meal"
            >
              <Ionicons name="trash-outline" size={Math.min(hp(2.3), wp(5))} color={colors.error} />
            </TouchableOpacity>
          </View>
        </View>
        {hasFullPlannerAccess && meal.ingredients.length > 0 && (
          <Text style={styles.ingredientsPreview} numberOfLines={2}>
            {meal.ingredients.join(", ")}
          </Text>
        )}
        {hasFullPlannerAccess && (meal.protein || meal.carbs || meal.fats) && (
          <View style={styles.macroRow}>
            <Text style={styles.macroText}>P {meal.protein || 0}g</Text>
            <Text style={styles.macroText}>C {meal.carbs || 0}g</Text>
            <Text style={styles.macroText}>F {meal.fats || 0}g</Text>
          </View>
        )}
      </View>
    );
  };

  const renderPlanTab = () => (
    <>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.dateList}
      >
        {dateOptions.map((dateOption) => {
          const active = dateOption.dateKey === selectedDateKey;
          const mealsForDate = meals.filter((meal) => meal.dateKey === dateOption.dateKey).length;

          return (
            <TouchableOpacity
              key={dateOption.dateKey}
              style={[styles.dateChip, active && styles.dateChipActive]}
              onPress={() => setSelectedDateKey(dateOption.dateKey)}
            >
              <Text style={[styles.dateChipLabel, active && styles.dateChipLabelActive]}>
                {dateOption.label}
              </Text>
              <Text style={[styles.dateChipMeta, active && styles.dateChipMetaActive]}>
                {mealsForDate} meals
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={[styles.goalGuidanceCard, { borderColor: `${goalExperience.color}42` }]}>
        <View style={styles.goalGuidanceHeader}>
          <View style={[styles.goalGuidanceIcon, { backgroundColor: `${goalExperience.color}18` }]}>
            <Ionicons
              name={goalExperience.icon as keyof typeof Ionicons.glyphMap}
              size={Math.min(hp(2.35), wp(5.2))}
              color={goalExperience.color}
            />
          </View>
          <View style={styles.goalGuidanceCopy}>
            <Text style={styles.goalGuidanceEyebrow}>Meal plan for {goalExperience.label}</Text>
            <Text style={styles.goalGuidanceTitle}>{plannerGoalStatus.label}</Text>
            <Text style={styles.goalGuidanceBody}>{plannerGoalStatus.body}</Text>
          </View>
        </View>
        <View style={styles.goalChipRow}>
          {goalExperience.meal.chips.map((chip) => (
            <View key={chip} style={[styles.goalChip, { backgroundColor: `${goalExperience.color}12` }]}>
              <Text style={[styles.goalChipText, { color: goalExperience.color }]}>{chip}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.adaptivePlanCard}>
        <View style={styles.adaptivePlanHeader}>
          <View>
            <Text style={styles.adaptivePlanEyebrow}>Goal targets</Text>
            <Text style={styles.adaptivePlanTitle}>{adaptiveMealPlan.title}</Text>
          </View>
          <View style={[styles.adaptivePlanBadge, { backgroundColor: `${goalExperience.color}16` }]}>
            <Text style={[styles.adaptivePlanBadgeText, { color: goalExperience.color }]}>
              Full planner
            </Text>
          </View>
        </View>
        <View style={styles.adaptivePlanStats}>
          <View style={styles.adaptivePlanStat}>
            <Text style={styles.adaptivePlanStatLabel}>Target</Text>
            <Text style={styles.adaptivePlanStatValue}>{adaptiveMealPlan.targetRangeLabel}</Text>
          </View>
          <View style={styles.adaptivePlanStat}>
            <Text style={styles.adaptivePlanStatLabel}>Protein</Text>
            <Text style={styles.adaptivePlanStatValue}>
              {adaptiveMealPlan.proteinTarget}g
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.adaptiveLearnMoreButton}
          onPress={() => router.push("/(main)/(goal-review)" as any)}
          activeOpacity={0.82}
          accessibilityRole="button"
          accessibilityLabel="Open goal review to learn why targets changed"
        >
          <Ionicons name="information-circle-outline" size={Math.min(hp(1.9), wp(4.2))} color={goalExperience.color} />
          <Text style={[styles.adaptiveLearnMoreText, { color: goalExperience.color }]}>Why changed?</Text>
        </TouchableOpacity>
        {adaptiveMealPlan.suggestions.slice(0, 4).map((suggestion) => (
          <View key={suggestion.id} style={styles.suggestionCard}>
            <View style={styles.suggestionHeader}>
              <View style={styles.suggestionCopy}>
                <Text style={styles.suggestionType}>{getMealTypeOption(suggestion.type).label}</Text>
                <Text style={styles.suggestionName}>{suggestion.name}</Text>
                <Text style={styles.suggestionReason}>{suggestion.reason}</Text>
              </View>
              <View style={styles.suggestionMetric}>
                <Text style={styles.suggestionMetricValue}>
                  {suggestion.calories}
                </Text>
                <Text style={styles.suggestionMetricLabel}>kcal</Text>
              </View>
            </View>
            <View style={styles.suggestionMacroRow}>
              <Text style={styles.suggestionMacro}>P {suggestion.protein}g</Text>
              <Text style={styles.suggestionMacro}>C {suggestion.carbs}g</Text>
              <Text style={styles.suggestionMacro}>F {suggestion.fats}g</Text>
            </View>
            <View style={styles.suggestionFooter}>
              <Text style={styles.suggestionTiming} numberOfLines={2}>{suggestion.timing}</Text>
              <TouchableOpacity
                style={[styles.suggestionButton, { backgroundColor: goalExperience.color }]}
                onPress={() => saveSuggestedMeal(suggestion)}
              >
                <Text style={styles.suggestionButtonText}>{suggestion.ctaLabel}</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.summaryCard}>
        <View>
          <Text style={styles.summaryEyebrow}>Selected Day</Text>
          <Text style={styles.summaryTitle}>{formatPlannerDate(selectedDateKey)}</Text>
        </View>
        <View style={styles.summaryStats}>
          <Text style={styles.summaryValue}>{selectedDateMeals.length}</Text>
          <Text style={styles.summaryLabel}>meals</Text>
        </View>
        <View style={styles.summaryStats}>
          <Text style={styles.summaryValue}>{Math.round(selectedDateCalories)}</Text>
          <Text style={styles.summaryLabel}>kcal</Text>
        </View>
      </View>

      {mealTypes.map((typeOption) => {
        const mealsForType = selectedDateMeals.filter((meal) => meal.type === typeOption.id);

        return (
          <View key={typeOption.id} style={styles.mealSection}>
            <View style={styles.mealSectionHeader}>
              <View style={styles.mealSectionTitleWrap}>
                <View style={[styles.smallMealIcon, { backgroundColor: `${typeOption.color}18` }]}>
                  <Ionicons name={typeOption.icon} size={Math.min(hp(2.2), wp(4.8))} color={typeOption.color} />
                </View>
                <Text style={styles.mealSectionTitle}>{typeOption.label}</Text>
              </View>
              <TouchableOpacity
                style={styles.addMealMiniButton}
                onPress={() => openNewMeal(typeOption.id)}
              >
                <Ionicons name="add" size={Math.min(hp(2.4), wp(5.2))} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            {mealsForType.length > 0 ? (
              mealsForType.map(renderMealCard)
            ) : (
              <TouchableOpacity
                style={styles.emptyMealSlot}
                onPress={() => openNewMeal(typeOption.id)}
              >
                <Ionicons name="add-circle-outline" size={Math.min(hp(2.5), wp(5.5))} color={colors.primary} />
                <Text style={styles.emptyMealText} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.76}>
                  {typeOption.id === "snack" ? goalExperience.meal.emptyPlan : `Add ${typeOption.label.toLowerCase()}`}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        );
      })}
    </>
  );

  const renderGroceryTab = () => (
    <>
      <View style={styles.grocerySummaryCard}>
        <View>
          <Text style={styles.summaryEyebrow}>Generated From Plans</Text>
          <Text style={styles.summaryTitle}>{goalExperience.meal.groceryTitle}</Text>
          <Text style={styles.groceryGoalBody} numberOfLines={2}>{goalExperience.meal.groceryBody}</Text>
        </View>
        <View style={styles.summaryStats}>
          <Text style={styles.summaryValue}>{grocerySummary.remaining}</Text>
          <Text style={styles.summaryLabel}>left</Text>
        </View>
        <View style={styles.summaryStats}>
          <Text style={styles.summaryValue}>{grocerySummary.checked}</Text>
          <Text style={styles.summaryLabel}>done</Text>
        </View>
      </View>

      <View style={styles.manualInputRow}>
        <TextInput
          style={styles.manualInput}
          value={manualGroceryInput}
          onChangeText={setManualGroceryInput}
          placeholder="Add extra grocery item"
          placeholderTextColor={colors.textSecondary}
          selectionColor={colors.primary}
        />
        <TouchableOpacity style={styles.manualAddButton} onPress={addManualGrocery}>
          <Ionicons name="add" size={Math.min(hp(2.6), wp(5.7))} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {groceryItems.length > 0 && (
        <TouchableOpacity style={styles.clearCheckedButton} onPress={clearChecked}>
          <Ionicons name="refresh-outline" size={Math.min(hp(2), wp(4.5))} color={colors.primary} />
          <Text style={styles.clearCheckedText}>Uncheck all grocery items</Text>
        </TouchableOpacity>
      )}

      {groceryItems.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}>
            <Ionicons name="basket-outline" size={Math.min(hp(5.5), wp(12))} color={colors.primary} />
          </View>
          <Text style={styles.emptyTitle}>No grocery items yet</Text>
          <Text style={styles.emptySubtitle}>
            {`${goalExperience.meal.emptyGrocery} Add ingredients to planned meals and FitFaat will build this list automatically.`}
          </Text>
        </View>
      ) : (
        groceryItems.map((item) => (
          <View key={item.key} style={styles.groceryItem}>
            <TouchableOpacity
              style={[styles.checkbox, item.checked && styles.checkboxActive]}
              onPress={() => toggleGroceryItem(item)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: item.checked }}
            >
              {item.checked && (
                <Ionicons name="checkmark" size={Math.min(hp(2), wp(4.4))} color="#FFFFFF" />
              )}
            </TouchableOpacity>
            <View style={styles.groceryTextWrap}>
              <Text style={[styles.groceryLabel, item.checked && styles.groceryLabelChecked]}>
                {item.label}
              </Text>
              <Text style={styles.groceryMeta}>
                {item.source === "manual" ? "Manual item" : item.count > 1 ? `${item.count} planned meals` : "Planned meal"}
              </Text>
            </View>
            {item.source === "manual" && (
              <TouchableOpacity
                style={styles.iconButton}
                onPress={() => removeManualGrocery(item.key)}
              >
                <Ionicons name="trash-outline" size={Math.min(hp(2.2), wp(4.8))} color={colors.error} />
              </TouchableOpacity>
            )}
          </View>
        ))
      )}
    </>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <StatusBar
        barStyle={isDarkMode ? "light-content" : "dark-content"}
        backgroundColor={colors.screenColor}
      />
      <AppHeader
        title="Meal Planner"
        showStepIndicator={false}
        showMenuButton={false}
        showBackButton
      />

      <View style={styles.content}>
        {isAccessLoading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Loading meal planner</Text>
          </View>
        ) : (
          <>
            <View style={styles.trialBannerWrap}>
              <FeatureLimitBanner access={mealPlannerAccess} />
            </View>
            <View style={styles.tabControl}>
              <TouchableOpacity
                style={[styles.tabButton, activeTab === "plan" && styles.tabButtonActive]}
                onPress={() => setActiveTab("plan")}
              >
                <Ionicons
                  name="calendar-outline"
                  size={Math.min(hp(2.2), wp(4.8))}
                  color={activeTab === "plan" ? "#FFFFFF" : colors.primary}
                />
                <Text style={[styles.tabButtonText, activeTab === "plan" && styles.tabButtonTextActive]}>
                  Plan
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tabButton, activeTab === "grocery" && styles.tabButtonActive]}
                onPress={() => setActiveTab("grocery")}
              >
                <Ionicons
                  name="basket-outline"
                  size={Math.min(hp(2.2), wp(4.8))}
                  color={activeTab === "grocery" ? "#FFFFFF" : colors.primary}
                />
                <Text style={[styles.tabButtonText, activeTab === "grocery" && styles.tabButtonTextActive]}>
                  Grocery
                </Text>
              </TouchableOpacity>
            </View>

            {isLoading ? (
              <View style={styles.loadingWrap}>
                <ActivityIndicator size="large" color={colors.primary} />
              </View>
            ) : (
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
              >
                {activeTab === "plan" ? renderPlanTab() : renderGroceryTab()}
              </ScrollView>
            )}

            {activeTab === "plan" && (
              <TouchableOpacity
                style={styles.fab}
                onPress={() => openNewMeal()}
                accessibilityRole="button"
                accessibilityLabel="Add planned meal"
              >
                <Ionicons name="add" size={Math.min(hp(3.2), wp(7))} color="#FFFFFF" />
              </TouchableOpacity>
            )}
          </>
        )}
      </View>

      <Modal
        visible={editorVisible}
        transparent
        animationType="slide"
        onRequestClose={closeEditor}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={0}
        >
          <View style={[styles.editorPanel, keyboardVisible && styles.editorPanelKeyboard]}>
            <View style={styles.editorHeader}>
              <View>
                <Text style={styles.editorTitle}>
                  {editingMeal ? "Edit Meal" : "Plan Meal"}
                </Text>
                <Text style={styles.editorSubtitle}>
                  {goalExperience.meal.editorPremium}
                </Text>
              </View>
              <TouchableOpacity style={styles.closeButton} onPress={closeEditor}>
                <Ionicons name="close" size={Math.min(hp(3), wp(6.4))} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.editorScroll}
              contentContainerStyle={[
                styles.editorScrollContent,
                keyboardVisible && styles.editorScrollContentKeyboard,
              ]}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="interactive"
            >
              <View style={styles.typeGrid}>
                {mealTypes.map((typeOption) => {
                  const active = mealType === typeOption.id;

                  return (
                    <TouchableOpacity
                      key={typeOption.id}
                      style={[styles.typeButton, active && { backgroundColor: typeOption.color }]}
                      onPress={() => setMealType(typeOption.id)}
                    >
                      <Ionicons
                        name={typeOption.icon}
                        size={Math.min(hp(2.3), wp(5))}
                        color={active ? "#FFFFFF" : typeOption.color}
                      />
                      <Text style={[styles.typeButtonText, active && styles.typeButtonTextActive]}>
                        {typeOption.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <TextInput
                style={styles.editorInput}
                value={mealName}
                onChangeText={setMealName}
                placeholder="Meal name"
                placeholderTextColor={colors.textSecondary}
                selectionColor={colors.primary}
              />

              <View style={styles.nutritionGrid}>
                <TextInput
                  style={styles.nutritionInput}
                  value={caloriesInput}
                  onChangeText={setCaloriesInput}
                  placeholder="Calories"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="numeric"
                  selectionColor={colors.primary}
                />
                <TextInput
                  style={styles.nutritionInput}
                  value={proteinInput}
                  onChangeText={setProteinInput}
                  placeholder="Protein g"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="numeric"
                  selectionColor={colors.primary}
                />
                <TextInput
                  style={styles.nutritionInput}
                  value={carbsInput}
                  onChangeText={setCarbsInput}
                  placeholder="Carbs g"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="numeric"
                  selectionColor={colors.primary}
                />
                <TextInput
                  style={styles.nutritionInput}
                  value={fatsInput}
                  onChangeText={setFatsInput}
                  placeholder="Fats g"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="numeric"
                  selectionColor={colors.primary}
                />
              </View>

              <TextInput
                style={[styles.editorInput, styles.ingredientsInput]}
                value={ingredientsInput}
                onChangeText={setIngredientsInput}
                placeholder="Ingredients, one per line"
                placeholderTextColor={colors.textSecondary}
                multiline
                textAlignVertical="top"
                selectionColor={colors.primary}
              />

              <TextInput
                style={[styles.editorInput, styles.notesInput]}
                value={notesInput}
                onChangeText={setNotesInput}
                placeholder="Notes"
                placeholderTextColor={colors.textSecondary}
                multiline
                textAlignVertical="top"
                selectionColor={colors.primary}
              />

              <View style={styles.editorActions}>
                {editingMeal && (
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => confirmDeleteMeal(editingMeal)}
                    disabled={isSaving}
                  >
                    <Ionicons name="trash-outline" size={Math.min(hp(2.4), wp(5.2))} color={colors.error} />
                    <Text style={styles.deleteButtonText}>Delete</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
                  onPress={saveMeal}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons name="checkmark" size={Math.min(hp(2.5), wp(5.4))} color="#FFFFFF" />
                      <Text style={styles.saveButtonText}>Save Meal</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const getStyles = (colors: any, isDarkMode: boolean, bottomInset: number) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.screenColor,
  },
  content: {
    flex: 1,
    backgroundColor: colors.screenColor,
    paddingHorizontal: wp(5),
    paddingTop: hp(1.6),
  },
  trialBannerWrap: {
    marginBottom: hp(0.2),
  },
  tabControl: {
    minHeight: hp(6.2),
    borderRadius: wp(3.2),
    backgroundColor: colors.primarySoft,
    flexDirection: "row",
    padding: wp(1),
    gap: wp(1),
  },
  tabButton: {
    flex: 1,
    borderRadius: wp(2.6),
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: wp(1.6),
  },
  tabButtonActive: {
    backgroundColor: colors.primary,
  },
  tabButtonText: {
    color: colors.primary,
    fontSize: Math.min(hp(1.75), wp(3.8)),
    fontWeight: "900",
  },
  tabButtonTextActive: {
    color: "#FFFFFF",
  },
  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: Math.min(hp(1.45), wp(3.3)),
    fontWeight: "800",
    marginTop: hp(1),
  },
  lockedContent: {
    flexGrow: 1,
    paddingTop: hp(1.4),
    paddingBottom: Math.max(bottomInset, hp(2)) + hp(4),
  },
  scrollContent: {
    paddingTop: hp(1.4),
    paddingBottom: Math.max(bottomInset, hp(2)) + hp(11),
  },
  dateList: {
    gap: wp(2),
    paddingRight: wp(3),
    paddingBottom: hp(1.2),
  },
  dateChip: {
    minWidth: wp(29),
    minHeight: hp(6.8),
    borderRadius: wp(3),
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.cardBackground,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: wp(3),
  },
  dateChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  dateChipLabel: {
    color: colors.textPrimary,
    fontSize: Math.min(hp(1.7), wp(3.7)),
    fontWeight: "900",
  },
  dateChipLabelActive: {
    color: "#FFFFFF",
  },
  dateChipMeta: {
    color: colors.textSecondary,
    fontSize: Math.min(hp(1.3), wp(3)),
    fontWeight: "700",
    marginTop: hp(0.25),
  },
  dateChipMetaActive: {
    color: "rgba(255,255,255,0.78)",
  },
  goalGuidanceCard: {
    borderRadius: wp(3.4),
    borderWidth: 1,
    backgroundColor: colors.cardBackground,
    padding: wp(3.4),
    marginBottom: hp(1.2),
    gap: hp(1),
  },
  goalGuidanceHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: wp(2.5),
  },
  goalGuidanceIcon: {
    width: hp(4.4),
    height: hp(4.4),
    borderRadius: hp(2.2),
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  goalGuidanceCopy: {
    flex: 1,
    minWidth: 0,
  },
  goalGuidanceEyebrow: {
    color: colors.textSecondary,
    fontSize: Math.min(hp(1.08), wp(2.6)),
    fontWeight: "900",
    textTransform: "uppercase",
  },
  goalGuidanceTitle: {
    color: colors.textPrimary,
    fontSize: Math.min(hp(1.75), wp(3.9)),
    fontWeight: "900",
    marginTop: hp(0.2),
  },
  goalGuidanceBody: {
    color: colors.textSecondary,
    fontSize: Math.min(hp(1.28), wp(3.05)),
    lineHeight: hp(1.85),
    fontWeight: "700",
    marginTop: hp(0.25),
  },
  goalChipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: wp(1.5),
  },
  goalChip: {
    minHeight: hp(2.7),
    borderRadius: hp(1.35),
    paddingHorizontal: wp(2),
    alignItems: "center",
    justifyContent: "center",
  },
  goalChipText: {
    fontSize: Math.min(hp(1), wp(2.4)),
    fontWeight: "900",
  },
  adaptivePlanCard: {
    borderRadius: wp(3.4),
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.cardBackground,
    padding: wp(3.4),
    marginBottom: hp(1.2),
    gap: hp(1),
  },
  adaptivePlanHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: wp(2),
  },
  adaptivePlanEyebrow: {
    color: colors.textSecondary,
    fontSize: Math.min(hp(1.02), wp(2.45)),
    fontWeight: "900",
    textTransform: "uppercase",
  },
  adaptivePlanTitle: {
    color: colors.textPrimary,
    fontSize: Math.min(hp(1.82), wp(4.05)),
    fontWeight: "900",
    marginTop: hp(0.18),
  },
  adaptivePlanBadge: {
    minHeight: hp(2.8),
    borderRadius: hp(1.4),
    paddingHorizontal: wp(2.2),
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  adaptivePlanBadgeText: {
    fontSize: Math.min(hp(1), wp(2.4)),
    fontWeight: "900",
  },
  adaptivePlanBody: {
    color: colors.textSecondary,
    fontSize: Math.min(hp(1.22), wp(2.9)),
    lineHeight: hp(1.78),
    fontWeight: "800",
  },
  adaptivePlanStats: {
    flexDirection: "row",
    gap: wp(2),
  },
  adaptivePlanStat: {
    flex: 1,
    minHeight: hp(5.4),
    borderRadius: wp(2.5),
    backgroundColor: colors.screenColor,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingHorizontal: wp(2.5),
    paddingVertical: hp(0.7),
    justifyContent: "center",
  },
  adaptivePlanStatLabel: {
    color: colors.textSecondary,
    fontSize: Math.min(hp(0.95), wp(2.3)),
    fontWeight: "900",
    textTransform: "uppercase",
  },
  adaptivePlanStatValue: {
    color: colors.textPrimary,
    fontSize: Math.min(hp(1.28), wp(3.05)),
    fontWeight: "900",
    marginTop: hp(0.12),
  },
  adaptiveLearnMoreButton: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: wp(1.1),
    minHeight: hp(3.4),
    paddingHorizontal: wp(2.4),
    borderRadius: wp(2),
    backgroundColor: colors.screenColor,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  adaptiveLearnMoreText: {
    fontSize: Math.min(hp(1.08), wp(2.6)),
    fontWeight: "900",
  },
  adaptiveSnackTiming: {
    color: colors.primary,
    fontSize: Math.min(hp(1.08), wp(2.6)),
    lineHeight: hp(1.55),
    fontWeight: "900",
  },
  suggestionCard: {
    borderRadius: wp(3),
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.screenColor,
    padding: wp(3),
    gap: hp(0.75),
  },
  suggestionHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: wp(2),
  },
  suggestionCopy: {
    flex: 1,
    minWidth: 0,
  },
  suggestionType: {
    color: colors.textSecondary,
    fontSize: Math.min(hp(0.98), wp(2.35)),
    fontWeight: "900",
    textTransform: "uppercase",
  },
  suggestionName: {
    color: colors.textPrimary,
    fontSize: Math.min(hp(1.55), wp(3.55)),
    fontWeight: "900",
    marginTop: hp(0.14),
  },
  suggestionReason: {
    color: colors.textSecondary,
    fontSize: Math.min(hp(1.08), wp(2.6)),
    lineHeight: hp(1.55),
    fontWeight: "700",
    marginTop: hp(0.22),
  },
  suggestionMetric: {
    minWidth: wp(15),
    alignItems: "center",
  },
  suggestionMetricValue: {
    color: colors.primary,
    fontSize: Math.min(hp(1.65), wp(3.8)),
    fontWeight: "900",
  },
  suggestionMetricLabel: {
    color: colors.textSecondary,
    fontSize: Math.min(hp(0.95), wp(2.3)),
    fontWeight: "800",
  },
  suggestionMacroRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: wp(1.5),
  },
  suggestionMacro: {
    color: colors.primary,
    backgroundColor: colors.primarySoft,
    borderRadius: hp(1.2),
    paddingHorizontal: wp(2),
    paddingVertical: hp(0.35),
    fontSize: Math.min(hp(1), wp(2.4)),
    fontWeight: "900",
  },
  suggestionFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: wp(2),
  },
  suggestionTiming: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: Math.min(hp(1.02), wp(2.45)),
    lineHeight: hp(1.45),
    fontWeight: "700",
  },
  suggestionButton: {
    minHeight: hp(3.6),
    borderRadius: hp(1.2),
    paddingHorizontal: wp(2.6),
    alignItems: "center",
    justifyContent: "center",
  },
  suggestionButtonText: {
    color: "#FFFFFF",
    fontSize: Math.min(hp(1.05), wp(2.55)),
    fontWeight: "900",
  },
  swapPreviewBox: {
    borderRadius: wp(2.6),
    backgroundColor: colors.primarySoft,
    paddingHorizontal: wp(2.6),
    paddingVertical: hp(0.9),
    gap: hp(0.35),
  },
  swapPreviewTitle: {
    color: colors.primary,
    fontSize: Math.min(hp(1.08), wp(2.6)),
    fontWeight: "900",
  },
  swapPreviewText: {
    color: colors.textSecondary,
    fontSize: Math.min(hp(1), wp(2.4)),
    lineHeight: hp(1.42),
    fontWeight: "800",
  },
  summaryCard: {
    minHeight: hp(10),
    borderRadius: wp(4),
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: wp(4),
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: hp(1.2),
  },
  grocerySummaryCard: {
    minHeight: hp(10),
    borderRadius: wp(4),
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: wp(4),
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: hp(1.2),
  },
  summaryEyebrow: {
    color: colors.textSecondary,
    fontSize: Math.min(hp(1.25), wp(2.9)),
    fontWeight: "900",
    textTransform: "uppercase",
  },
  summaryTitle: {
    color: colors.textPrimary,
    fontSize: Math.min(hp(2.25), wp(5)),
    fontWeight: "900",
    marginTop: hp(0.3),
  },
  summaryStats: {
    alignItems: "center",
    minWidth: wp(14),
  },
  summaryValue: {
    color: colors.primary,
    fontSize: Math.min(hp(2.45), wp(5.4)),
    fontWeight: "900",
  },
  summaryLabel: {
    color: colors.textSecondary,
    fontSize: Math.min(hp(1.25), wp(2.9)),
    fontWeight: "800",
  },
  mealSection: {
    marginTop: hp(1.6),
  },
  mealSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: hp(1),
  },
  mealSectionTitleWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: wp(2),
  },
  smallMealIcon: {
    width: hp(3.8),
    height: hp(3.8),
    borderRadius: hp(1.9),
    alignItems: "center",
    justifyContent: "center",
  },
  mealSectionTitle: {
    color: colors.textPrimary,
    fontSize: Math.min(hp(2.05), wp(4.5)),
    fontWeight: "900",
  },
  addMealMiniButton: {
    width: hp(4),
    height: hp(4),
    borderRadius: hp(2),
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyMealSlot: {
    minHeight: hp(7),
    borderRadius: wp(3),
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderStyle: "dashed",
    backgroundColor: colors.cardBackground,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: wp(0.4),
    paddingHorizontal: wp(3),
    paddingVertical: hp(0.9),
    gap: wp(1.8),
  },
  emptyMealText: {
    flexShrink: 1,
    minWidth: 0,
    color: colors.primary,
    fontSize: Math.min(hp(1.75), wp(3.8)),
    lineHeight: Math.min(hp(2.25), wp(4.8)),
    fontWeight: "900",
    textAlign: "center",
  },
  mealCard: {
    borderRadius: wp(3.2),
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.cardBackground,
    padding: wp(3.4),
    marginBottom: hp(1),
    shadowColor: "#000",
    shadowOpacity: isDarkMode ? 0.15 : 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  mealCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: wp(2.5),
  },
  mealIcon: {
    width: hp(4.8),
    height: hp(4.8),
    borderRadius: hp(2.4),
    alignItems: "center",
    justifyContent: "center",
  },
  mealTitleWrap: {
    flex: 1,
  },
  mealName: {
    color: colors.textPrimary,
    fontSize: Math.min(hp(1.95), wp(4.3)),
    fontWeight: "900",
  },
  mealMeta: {
    color: colors.textSecondary,
    fontSize: Math.min(hp(1.45), wp(3.3)),
    fontWeight: "700",
    marginTop: hp(0.25),
  },
  mealActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: wp(1),
  },
  iconButton: {
    width: hp(3.8),
    height: hp(3.8),
    borderRadius: hp(1.9),
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primarySoft,
  },
  ingredientsPreview: {
    color: colors.textSecondary,
    fontSize: Math.min(hp(1.55), wp(3.5)),
    lineHeight: Math.min(hp(2.25), wp(4.8)),
    fontWeight: "600",
    marginTop: hp(1),
  },
  macroRow: {
    flexDirection: "row",
    gap: wp(2),
    marginTop: hp(1),
  },
  macroText: {
    color: colors.primary,
    backgroundColor: colors.primarySoft,
    borderRadius: wp(8),
    paddingHorizontal: wp(2.5),
    paddingVertical: hp(0.45),
    fontSize: Math.min(hp(1.35), wp(3.1)),
    fontWeight: "900",
  },
  manualInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: wp(2.5),
    marginBottom: hp(1.2),
  },
  manualInput: {
    flex: 1,
    minHeight: hp(5.8),
    borderRadius: wp(3),
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.cardBackground,
    paddingHorizontal: wp(4),
    color: colors.textPrimary,
    fontSize: Math.min(hp(1.75), wp(3.8)),
    fontWeight: "700",
  },
  manualAddButton: {
    width: hp(5.8),
    height: hp(5.8),
    borderRadius: wp(3),
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  clearCheckedButton: {
    minHeight: hp(4.8),
    borderRadius: wp(3),
    backgroundColor: colors.primarySoft,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: wp(1.6),
    marginBottom: hp(1.2),
  },
  clearCheckedText: {
    color: colors.primary,
    fontSize: Math.min(hp(1.6), wp(3.6)),
    fontWeight: "900",
  },
  groceryItem: {
    minHeight: hp(7),
    borderRadius: wp(3),
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.cardBackground,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: wp(3.5),
    marginBottom: hp(1),
    gap: wp(2.5),
  },
  checkbox: {
    width: hp(3.2),
    height: hp(3.2),
    borderRadius: hp(1.6),
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxActive: {
    backgroundColor: colors.primary,
  },
  groceryTextWrap: {
    flex: 1,
  },
  groceryLabel: {
    color: colors.textPrimary,
    fontSize: Math.min(hp(1.85), wp(4.1)),
    fontWeight: "900",
  },
  groceryLabelChecked: {
    color: colors.textSecondary,
    textDecorationLine: "line-through",
  },
  groceryMeta: {
    color: colors.textSecondary,
    fontSize: Math.min(hp(1.35), wp(3.1)),
    fontWeight: "700",
    marginTop: hp(0.2),
  },
  groceryGoalBody: {
    color: colors.textSecondary,
    maxWidth: wp(48),
    fontSize: Math.min(hp(1.1), wp(2.65)),
    lineHeight: hp(1.55),
    fontWeight: "700",
    marginTop: hp(0.25),
  },
  emptyState: {
    alignItems: "center",
    paddingHorizontal: wp(4),
    paddingTop: hp(10),
  },
  emptyIcon: {
    width: hp(10),
    height: hp(10),
    borderRadius: hp(5),
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primarySoft,
    marginBottom: hp(2),
  },
  emptyTitle: {
    color: colors.textPrimary,
    fontSize: Math.min(hp(2.45), wp(5.5)),
    fontWeight: "900",
    textAlign: "center",
  },
  emptySubtitle: {
    color: colors.textSecondary,
    fontSize: Math.min(hp(1.75), wp(3.8)),
    lineHeight: Math.min(hp(2.5), wp(5.4)),
    textAlign: "center",
    fontWeight: "600",
    marginTop: hp(0.8),
  },
  fab: {
    position: "absolute",
    right: wp(5),
    bottom: Math.max(bottomInset, hp(2)) + hp(1),
    width: hp(6.2),
    height: hp(6.2),
    borderRadius: hp(3.1),
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    elevation: 8,
    shadowColor: colors.primary,
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(15, 23, 42, 0.58)",
  },
  editorPanel: {
    maxHeight: hp(88),
    borderTopLeftRadius: wp(7),
    borderTopRightRadius: wp(7),
    backgroundColor: colors.cardBackground,
    paddingHorizontal: wp(5),
    paddingTop: hp(2.4),
    paddingBottom: Math.max(bottomInset, hp(2)) + hp(1.5),
  },
  editorPanelKeyboard: {
    maxHeight: Platform.OS === "android" ? hp(82) : hp(88),
    paddingBottom: Math.max(bottomInset, hp(1.2)) + hp(1),
  },
  editorHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: hp(1.6),
    gap: wp(3),
  },
  editorTitle: {
    color: colors.textPrimary,
    fontSize: Math.min(hp(2.75), wp(6)),
    fontWeight: "900",
  },
  editorSubtitle: {
    color: colors.textSecondary,
    fontSize: Math.min(hp(1.45), wp(3.3)),
    fontWeight: "700",
    marginTop: hp(0.35),
  },
  closeButton: {
    width: hp(4.4),
    height: hp(4.4),
    alignItems: "center",
    justifyContent: "center",
  },
  editorScroll: {
    flexGrow: 0,
  },
  editorScrollContent: {
    paddingBottom: 0,
  },
  editorScrollContentKeyboard: {
    paddingBottom: Math.max(bottomInset, hp(2)) + hp(1),
  },
  typeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: wp(2),
    marginBottom: hp(1.2),
  },
  typeButton: {
    width: "48%",
    minHeight: hp(5.5),
    borderRadius: wp(3),
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.screenColor,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: wp(1.5),
  },
  typeButtonText: {
    color: colors.textPrimary,
    fontSize: Math.min(hp(1.6), wp(3.6)),
    fontWeight: "900",
  },
  typeButtonTextActive: {
    color: "#FFFFFF",
  },
  editorInput: {
    minHeight: hp(5.8),
    borderRadius: wp(3),
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.screenColor,
    color: colors.textPrimary,
    paddingHorizontal: wp(4),
    paddingVertical: hp(1.2),
    fontSize: Math.min(hp(1.75), wp(3.8)),
    fontWeight: "700",
    marginBottom: hp(1.1),
  },
  nutritionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: wp(2),
  },
  nutritionInput: {
    width: "48%",
    minHeight: hp(5.6),
    borderRadius: wp(3),
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.screenColor,
    color: colors.textPrimary,
    paddingHorizontal: wp(3.2),
    fontSize: Math.min(hp(1.65), wp(3.7)),
    fontWeight: "700",
    marginBottom: hp(1.1),
  },
  ingredientsInput: {
    minHeight: hp(15),
  },
  notesInput: {
    minHeight: hp(10),
  },
  basicEditorNotice: {
    minHeight: hp(6.4),
    borderRadius: wp(3),
    borderWidth: 1,
    borderColor: `${colors.primary}35`,
    backgroundColor: `${colors.primary}10`,
    flexDirection: "row",
    alignItems: "center",
    gap: wp(2.2),
    paddingHorizontal: wp(3.2),
    paddingVertical: hp(1.1),
    marginBottom: hp(1.2),
  },
  basicEditorNoticeText: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: Math.min(hp(1.28), wp(3.05)),
    lineHeight: hp(1.85),
    fontWeight: "800",
  },
  editorActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: wp(3),
    marginTop: hp(0.6),
    marginBottom: hp(1.2),
  },
  deleteButton: {
    minHeight: hp(5.6),
    minWidth: wp(28),
    borderRadius: wp(3),
    borderWidth: 1,
    borderColor: colors.error + "50",
    backgroundColor: colors.screenColor,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: wp(1.4),
  },
  deleteButtonText: {
    color: colors.error,
    fontSize: Math.min(hp(1.7), wp(3.8)),
    fontWeight: "900",
  },
  saveButton: {
    flex: 1,
    minHeight: hp(5.6),
    borderRadius: wp(3),
    backgroundColor: colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: wp(1.6),
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: Math.min(hp(1.85), wp(4)),
    fontWeight: "900",
  },
});
