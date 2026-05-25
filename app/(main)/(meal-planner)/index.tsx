import AppHeader from "@/components/AppHeader";
import { FeatureLimitBanner } from "@/components/common/FeatureLimitBanner";
import { useTheme } from "@/contexts/ThemeContext";
import { getFeatureAccessStatus, type FeatureAccessStatus } from "@/utils/featureAccess";
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
import { router, useFocusEffect } from "expo-router";
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

export default function MealPlannerScreen() {
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
  const [isPremium, setIsPremium] = useState(false);
  const [mealPlannerAccess, setMealPlannerAccess] = useState<FeatureAccessStatus | null>(null);
  const [isPremiumLoading, setIsPremiumLoading] = useState(true);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

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

  const requireMealPlannerPro = useCallback(() => {
    if (isPremium) return true;

    Alert.alert("Premium Feature", mealPlannerAccess?.lockedReason || "Smart meal plans, macros, notes, and automated grocery lists are Premium features.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Upgrade",
        onPress: () => router.push("/(main)/(settings)/premium" as any),
      },
    ]);
    return false;
  }, [isPremium, mealPlannerAccess?.lockedReason]);

  const loadPremiumPlannerData = useCallback(async () => {
    setIsPremiumLoading(true);

    try {
      const featureAccess = await getFeatureAccessStatus("mealPlannerPro");
      setMealPlannerAccess(featureAccess);
      setIsPremium(featureAccess.hasAccess);
      await loadPlannerData();
    } catch (error) {
      console.log("[MealPlanner] Failed to check premium state:", error);
      setMealPlannerAccess(null);
      setIsPremium(false);
      await loadPlannerData();
    } finally {
      setIsPremiumLoading(false);
    }
  }, [loadPlannerData]);

  useFocusEffect(
    useCallback(() => {
      loadPremiumPlannerData();
    }, [loadPremiumPlannerData])
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
    if (isPremium || isPremiumLoading) return;
    setCaloriesInput("");
    setProteinInput("");
    setCarbsInput("");
    setFatsInput("");
    setIngredientsInput("");
    setNotesInput("");
  }, [isPremium, isPremiumLoading]);

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

  const groceryItems = useMemo(
    () => (isPremium ? buildGeneratedGroceryList(meals, groceryState) : buildManualGroceryList(groceryState)),
    [groceryState, isPremium, meals]
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
        calories: isPremium ? parseNumberInput(caloriesInput) : editingMeal?.calories,
        protein: isPremium ? parseNumberInput(proteinInput) : editingMeal?.protein,
        carbs: isPremium ? parseNumberInput(carbsInput) : editingMeal?.carbs,
        fats: isPremium ? parseNumberInput(fatsInput) : editingMeal?.fats,
        ingredients: isPremium ? parseIngredients(ingredientsInput) : editingMeal?.ingredients || [],
        notes: isPremium ? notesInput.trim() || undefined : editingMeal?.notes,
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
    if (item.source === "planned" && !requireMealPlannerPro()) return;

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
              {isPremium && meal.calories ? ` - ${Math.round(meal.calories)} kcal` : ""}
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
        {isPremium && meal.ingredients.length > 0 && (
          <Text style={styles.ingredientsPreview} numberOfLines={2}>
            {meal.ingredients.join(", ")}
          </Text>
        )}
        {isPremium && (meal.protein || meal.carbs || meal.fats) && (
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
          <Text style={styles.summaryValue}>{isPremium ? Math.round(selectedDateCalories) : "Basic"}</Text>
          <Text style={styles.summaryLabel}>{isPremium ? "kcal" : "plan"}</Text>
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
                <Text style={styles.emptyMealText}>Add {typeOption.label.toLowerCase()}</Text>
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
          <Text style={styles.summaryEyebrow}>{isPremium ? "Generated From Plans" : "Manual Grocery List"}</Text>
          <Text style={styles.summaryTitle}>{isPremium ? "Next 14 Days" : "Included Free"}</Text>
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
            {isPremium
              ? "Add ingredients to planned meals and FitFaat will build this list automatically."
              : "Add grocery items manually. Premium can generate this list from planned meal ingredients."}
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
        {isPremiumLoading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Checking Premium access</Text>
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
                  {isPremium ? "Saved locally with macros and grocery automation" : "Basic meal details saved locally"}
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

              {isPremium ? (
                <>
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
                </>
              ) : (
                <View style={styles.basicEditorNotice}>
                  <Ionicons name="lock-closed-outline" size={Math.min(hp(2), wp(4.5))} color={colors.primary} />
                  <Text style={styles.basicEditorNoticeText}>
                    Premium unlocks macros, ingredients, notes, and automated grocery generation.
                  </Text>
                </View>
              )}

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
    gap: wp(1.8),
  },
  emptyMealText: {
    color: colors.primary,
    fontSize: Math.min(hp(1.75), wp(3.8)),
    fontWeight: "900",
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
