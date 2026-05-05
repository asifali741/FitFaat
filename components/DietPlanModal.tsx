import { useTheme } from '@/contexts/ThemeContext';
import { useNotifications } from '@/contexts/NotificationContext';
import { tokenStorage } from '@/utils/auth/tokenStorage';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Keyboard,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from 'react-native-responsive-screen';

import { getBackendBaseUrl } from '@/utils/config';

const BACKEND_URL = getBackendBaseUrl().replace(/\/api\/?$/, '');

interface FoodItem {
  name: string;
  baseCalories: number;
  protein: number;
  carbs: number;
  fats: number;
  category: string;
  cuisine: string;
  mealType: string;
  unit: string;
  quantity?: number;
}

interface MealFood {
  foodName: string;
  quantity: number;
  unit: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  baseCalories: number;
  baseProtein: number;
  baseCarbs: number;
  baseFats: number;
}

interface WeeklyMeals {
  [day: string]: {
    [mealType: string]: MealFood[];
  };
}

interface DietPlanModalProps {
  visible: boolean;
  onClose: () => void;
  appointmentId: string;
  patientId: string;
  patientName: string;
  loading: boolean;
  setLoading: (loading: boolean) => void;
}

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snacks'];

const DietPlanModal: React.FC<DietPlanModalProps> = ({
  visible,
  onClose,
  appointmentId,
  patientId,
  patientName,
  loading,
  setLoading
}) => {
  const { colors } = useTheme();
  const { sendDietPlanUpdateNotification } = useNotifications();
  const styles = getStyles(colors);
  const [selectedDay, setSelectedDay] = useState('monday');
  const [selectedMealType, setSelectedMealType] = useState('breakfast');
  const [foodItems, setFoodItems] = useState<FoodItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [customCalories, setCustomCalories] = useState('2000');
  const [planTitle, setPlanTitle] = useState('Custom Diet Plan');
  const [notes, setNotes] = useState('');
  const [existingPlans, setExistingPlans] = useState<any[]>([]);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [showExistingPlans, setShowExistingPlans] = useState(false);
  
  // Helper function to get initial weekly meals structure
  const getInitialWeeklyMeals = () => {
    const initialMeals: any = {};
    DAYS.forEach(day => {
      initialMeals[day] = {};
      MEAL_TYPES.forEach(meal => {
        initialMeals[day][meal] = [];
      });
    });
    return initialMeals;
  };
  
  // Weekly meals structure
  const [weeklyMeals, setWeeklyMeals] = useState<WeeklyMeals>(() => getInitialWeeklyMeals());

  const [showFoodSelector, setShowFoodSelector] = useState(false);

  // Debug useEffect to track state changes
  useEffect(() => {
    console.log('=== Diet Plan Modal State Debug ===');
    console.log('showExistingPlans:', showExistingPlans);
    console.log('existingPlans.length:', existingPlans.length);
    console.log('editingPlanId:', editingPlanId);
    console.log('Condition for showing existing plans:', showExistingPlans && existingPlans.length > 0);
  }, [showExistingPlans, existingPlans.length, editingPlanId]);

  // Additional debug for modal visibility
  useEffect(() => {
    if (visible) {
      console.log('=== Modal Opened ===');
      console.log('Initial states:');
      console.log('- showExistingPlans:', showExistingPlans);
      console.log('- existingPlans:', existingPlans.length, 'plans');
      console.log('- editingPlanId:', editingPlanId);
    }
  }, [visible]);

  // Fetch food items when modal opens
  useEffect(() => {
    if (visible) {
      console.log('Modal opened, fetching data...');
      fetchFoodItems();
      fetchExistingDietPlans();
    }
  }, [visible]);

  const fetchFoodItems = async () => {
    try {
      const token = await tokenStorage.getToken();
      const response = await fetch(`${BACKEND_URL}/api/diet-plans/foods`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      if (data.success) {
        setFoodItems(data.foods);
      }
    } catch (error) {
      console.error('Error fetching food items:', error);
      Alert.alert('Error', 'Failed to load food items');
    }
  };

  const fetchExistingDietPlans = async () => {
    try {
      const token = await tokenStorage.getToken();
      const response = await fetch(`${BACKEND_URL}/api/diet-plans/appointment/${appointmentId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      console.log('Existing diet plans:', data);
      if (data.success) {
        console.log('Setting existing plans:', data.dietPlans?.length || 0, 'plans');
        setExistingPlans(data.dietPlans || []);
        const shouldShow = data.dietPlans && data.dietPlans.length > 0;
        console.log('Should show existing plans:', shouldShow);
        setShowExistingPlans(shouldShow);
      }
    } catch (error) {
      console.error('Error fetching existing diet plans:', error);
    }
  };

  const addFoodToMeal = (food: FoodItem) => {
    const foodWithQuantity: MealFood = {
      foodName: food.name,
      quantity: 100, // default quantity
      unit: 'grams',
      calories: food.baseCalories,
      protein: food.protein,
      carbs: food.carbs,
      fats: food.fats,
      // Store original base values for accurate recalculation
      baseCalories: food.baseCalories,
      baseProtein: food.protein,
      baseCarbs: food.carbs,
      baseFats: food.fats
    };

    setWeeklyMeals((prev: WeeklyMeals) => {
      // Ensure prev is not null and has the expected structure
      if (!prev || typeof prev !== 'object') {
        console.warn('Invalid weeklyMeals state, resetting...');
        const newMeals = getInitialWeeklyMeals();
        newMeals[selectedDay][selectedMealType].push(foodWithQuantity);
        return newMeals;
      }

      // Ensure the day exists
      if (!prev[selectedDay]) {
        prev[selectedDay] = {
          breakfast: [],
          lunch: [],
          dinner: [],
          snacks: []
        };
      }

      // Ensure the meal type exists
      if (!Array.isArray(prev[selectedDay][selectedMealType])) {
        prev[selectedDay][selectedMealType] = [];
      }

      return {
        ...prev,
        [selectedDay]: {
          ...prev[selectedDay],
          [selectedMealType]: [
            ...prev[selectedDay][selectedMealType],
            foodWithQuantity
          ]
        }
      };
    });

    setShowFoodSelector(false);
  };

  const removeFoodFromMeal = (dayKey: string, mealKey: string, index: number) => {
    setWeeklyMeals((prev: WeeklyMeals) => {
      // Validate state structure
      if (!prev || !prev[dayKey] || !Array.isArray(prev[dayKey][mealKey])) {
        console.warn('Invalid state structure in removeFoodFromMeal');
        return prev || getInitialWeeklyMeals();
      }

      return {
        ...prev,
        [dayKey]: {
          ...prev[dayKey],
          [mealKey]: prev[dayKey][mealKey].filter((_: MealFood, i: number) => i !== index)
        }
      };
    });
  };

  const updateFoodQuantity = (dayKey: string, mealKey: string, index: number, quantity: number) => {
    if (quantity <= 0) return;

    setWeeklyMeals((prev: WeeklyMeals) => {
      // Validate state structure
      if (!prev || !prev[dayKey] || !Array.isArray(prev[dayKey][mealKey]) || !prev[dayKey][mealKey][index]) {
        console.warn('Invalid state structure in updateFoodQuantity:', {
          hasPrev: !!prev,
          hasDay: !!(prev && prev[dayKey]),
          hasMeal: !!(prev && prev[dayKey] && Array.isArray(prev[dayKey][mealKey])),
          hasFood: !!(prev && prev[dayKey] && prev[dayKey][mealKey] && prev[dayKey][mealKey][index]),
          dayKey,
          mealKey,
          index,
          quantity
        });
        return prev || getInitialWeeklyMeals();
      }

      const updatedMeals = { ...prev };
      const food = updatedMeals[dayKey][mealKey][index];
      
      if (!food) {
        console.warn('Food item not found at index:', index);
        return prev;
      }

      const multiplier = quantity / 100; // base values are per 100g

      updatedMeals[dayKey][mealKey][index] = {
        ...food,
        quantity,
        // Always calculate from base values to avoid compounding errors
        calories: Math.round((food.baseCalories || food.calories) * multiplier),
        protein: Math.round((food.baseProtein || food.protein) * multiplier * 10) / 10,
        carbs: Math.round((food.baseCarbs || food.carbs) * multiplier * 10) / 10,
        fats: Math.round((food.baseFats || food.fats) * multiplier * 10) / 10
      };

      return updatedMeals;
    });
  };

  const loadExistingPlan = (plan: any) => {
    console.log('Loading existing plan:', plan);
    console.log('Plan weekly meals structure:', plan.weeklyMeals);
    
    setPlanTitle(plan.planTitle || 'Custom Diet Plan');
    setCustomCalories(plan.customDailyCalories?.toString() || '2000');
    setNotes(plan.notes || '');
    
    // Validate and sanitize the weekly meals structure
    let validatedWeeklyMeals = getInitialWeeklyMeals();
    
    if (plan.weeklyMeals && typeof plan.weeklyMeals === 'object') {
      DAYS.forEach(day => {
        if (plan.weeklyMeals[day] && typeof plan.weeklyMeals[day] === 'object') {
          MEAL_TYPES.forEach(meal => {
            if (Array.isArray(plan.weeklyMeals[day][meal])) {
              validatedWeeklyMeals[day][meal] = plan.weeklyMeals[day][meal];
            }
          });
        }
      });
    }
    
    console.log('Validated weekly meals:', validatedWeeklyMeals);
    setWeeklyMeals(validatedWeeklyMeals);
    setEditingPlanId(plan._id);
    setShowExistingPlans(false);
  };

  const deleteDietPlan = async (planId: string) => {
    Alert.alert(
      'Delete Diet Plan',
      'Are you sure you want to delete this diet plan? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await tokenStorage.getToken();
              const response = await fetch(`${BACKEND_URL}/api/diet-plans/${planId}`, {
                method: 'DELETE',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json'
                }
              });

              const data = await response.json();
              if (data.success) {
                Alert.alert('Success', 'Diet plan deleted successfully!');
                fetchExistingDietPlans(); // Refresh the list
              } else {
                Alert.alert('Error', data.message || 'Failed to delete diet plan');
              }
            } catch (error) {
              console.error('Error deleting diet plan:', error);
              Alert.alert('Error', 'Failed to delete diet plan');
            }
          }
        }
      ]
    );
  };

  const resetForm = () => {
    setPlanTitle('Custom Diet Plan');
    setCustomCalories('2000');
    setNotes('');
    setWeeklyMeals(getInitialWeeklyMeals());
    setEditingPlanId(null);
  };

  const saveDietPlan = async () => {
    if (!customCalories || parseInt(customCalories) < 1000 || parseInt(customCalories) > 5000) {
      Alert.alert('Invalid Calories', 'Daily calories must be between 1000 and 5000');
      return;
    }

    setLoading(true);
    try {
      console.log('=== Saving Diet Plan ===');
      console.log('appointmentId:', appointmentId);
      console.log('patientId:', patientId);
      console.log('planTitle:', planTitle);
      console.log('customCalories:', customCalories);
      console.log('weeklyMeals keys:', Object.keys(weeklyMeals));
      console.log('Sample weeklyMeals data:', JSON.stringify(weeklyMeals.monday, null, 2));
      
      const token = await tokenStorage.getToken();
      const requestBody = {
        appointmentId,
        patientId,
        planTitle,
        customDailyCalories: parseInt(customCalories),
        weeklyMeals,
        notes
      };
      
      console.log('Request body:', JSON.stringify(requestBody, null, 2));
      const isEditing = !!editingPlanId;
      const apiUrl = isEditing 
        ? `${BACKEND_URL}/api/diet-plans/${editingPlanId}`
        : `${BACKEND_URL}/api/diet-plans/create`;
      const method = isEditing ? 'PUT' : 'POST';
      
      console.log('Making API call to:', apiUrl, 'Method:', method);
      
      const response = await fetch(apiUrl, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);
      
      const data = await response.json();
      console.log('Response data:', data);
      
      if (data.success) {
        const message = isEditing ? 'Diet plan updated successfully!' : 'Diet plan created successfully!';
        await sendDietPlanUpdateNotification(
          isEditing ? 'Diet Plan Updated' : 'New Diet Plan',
          `${planTitle || 'Diet plan'} is ready for ${patientName || 'your patient'}.`,
          data.dietPlan?._id || editingPlanId || undefined
        );
        Alert.alert('Success', message, [
          { text: 'OK', onPress: () => {
            resetForm();
            fetchExistingDietPlans(); // Refresh the list
            onClose();
          }}
        ]);
      } else {
        Alert.alert('Error', data.message || 'Failed to create diet plan');
      }
    } catch (error) {
      console.error('Error saving diet plan:', error);
      Alert.alert('Error', 'Failed to save diet plan');
    } finally {
      setLoading(false);
    }
  };

  const filteredFoodItems = foodItems.filter(food =>
    food.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    food.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
    food.cuisine.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getTotalCaloriesForDay = (day: string) => {
    let total = 0;
    try {
      if (weeklyMeals && weeklyMeals[day]) {
        MEAL_TYPES.forEach(meal => {
          if (Array.isArray(weeklyMeals[day][meal])) {
            weeklyMeals[day][meal].forEach((food: MealFood) => {
              total += food.calories || 0;
            });
          }
        });
      }
    } catch (error) {
      console.warn('Error calculating calories for day:', day, error);
    }
    return total;
  };

  const renderFoodItem = ({ item }: { item: FoodItem }) => (
    <TouchableOpacity
      style={styles.foodItem}
      onPress={() => addFoodToMeal(item)}
      activeOpacity={0.7}
    >
      <View style={styles.foodItemContent}>
        <Text style={styles.foodName}>{item.name}</Text>
        <View style={styles.foodDetails}>
          <Text style={styles.foodCategory}>{item.category} • {item.cuisine}</Text>
          <Text style={styles.foodNutrition}>
            {item.baseCalories} cal • {item.protein}g protein • {item.carbs}g carbs • {item.fats}g fat
          </Text>
        </View>
      </View>
      <Ionicons name="add-circle" size={Math.min(hp(3), wp(6.4))} color={colors.primary} />
    </TouchableOpacity>
  );

  if (showFoodSelector) {
    return (
      <Modal visible={visible} animationType="slide" transparent={false}>
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => setShowFoodSelector(false)}>
              <Ionicons name="arrow-back" size={Math.min(hp(3), wp(6.4))} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Select Food for {selectedMealType}</Text>
            <View style={{ width: wp(6.4) }} />
          </View>

          <View style={styles.searchContainer}>
            <Ionicons name="search" size={Math.min(hp(2.5), wp(5.4))} color={colors.textSecondary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search foods..."
              value={searchTerm}
              onChangeText={setSearchTerm}
              placeholderTextColor={colors.textTertiary}
            />
          </View>

          <FlatList
            data={filteredFoodItems}
            renderItem={renderFoodItem}
            keyExtractor={(item, index) => `${item.name}-${index}`}
            style={styles.foodList}
            showsVerticalScrollIndicator={false}
          />
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {editingPlanId ? 'Edit' : 'Create'} Diet Plan for {patientName}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={Math.min(hp(3), wp(6.4))} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* Show existing plans if any exist */}
          {showExistingPlans && existingPlans.length > 0 ? (
            <View style={styles.existingPlansContainer}>
              <Text style={styles.sectionTitle}>Existing Diet Plans ({existingPlans.length})</Text>
              
              <ScrollView style={styles.existingPlansList} nestedScrollEnabled>
                {existingPlans.map((plan, index) => (
                  <View key={plan._id} style={styles.existingPlanCard}>
                    <View style={styles.planHeader}>
                      <Text style={styles.planTitle}>
                        {plan.planTitle || `Diet Plan ${index + 1}`}
                      </Text>
                      <Text style={styles.planDate}>
                        {new Date(plan.createdAt).toLocaleDateString()}
                      </Text>
                    </View>
                    
                    <Text style={styles.planCalories}>
                      Target: {plan.customDailyCalories} kcal/day
                    </Text>
                    
                    {/* Show meal summary */}
                    {plan.weeklyMeals && (
                      <View style={styles.planMealsPreview}>
                        <Text style={styles.planMealsTitle}>Meal Plan Summary:</Text>
                        {DAYS.slice(0, 3).map((day) => {
                          const dayMeals = plan.weeklyMeals[day];
                          if (!dayMeals) return null;
                          
                          let totalFoods = 0;
                          MEAL_TYPES.forEach(meal => {
                            if (dayMeals[meal] && Array.isArray(dayMeals[meal])) {
                              totalFoods += dayMeals[meal].length;
                            }
                          });
                          
                          if (totalFoods === 0) return null;
                          
                          return (
                            <View key={day} style={styles.dayPreview}>
                              <Text style={styles.dayPreviewTitle}>
                                {day.charAt(0).toUpperCase() + day.slice(1)}:
                              </Text>
                              {MEAL_TYPES.map(meal => {
                                if (!dayMeals[meal] || !Array.isArray(dayMeals[meal]) || dayMeals[meal].length === 0) {
                                  return null;
                                }
                                return (
                                  <Text key={meal} style={styles.mealPreview}>
                                    • {meal.charAt(0).toUpperCase() + meal.slice(1)}: {dayMeals[meal].length} items
                                  </Text>
                                );
                              })}
                            </View>
                          );
                        })}
                        {/* Show how many total days have meals */}
                        <Text style={styles.totalDaysText}>
                          {DAYS.filter(day => {
                            const dayMeals = plan.weeklyMeals[day];
                            if (!dayMeals) return false;
                            return MEAL_TYPES.some(meal => 
                              dayMeals[meal] && Array.isArray(dayMeals[meal]) && dayMeals[meal].length > 0
                            );
                          }).length} days planned
                        </Text>
                      </View>
                    )}
                    
                    {plan.notes ? (
                      <Text style={styles.planNotes} numberOfLines={2}>
                        Notes: {plan.notes}
                      </Text>
                    ) : null}
                    
                    <View style={styles.planActions}>
                      <TouchableOpacity
                        style={[styles.planActionBtn, styles.editBtn]}
                        onPress={() => loadExistingPlan(plan)}
                      >
                        <Text style={styles.planActionText}>Edit</Text>
                      </TouchableOpacity>
                      
                      <TouchableOpacity
                        style={[styles.planActionBtn, styles.deleteBtn]}
                        onPress={() => deleteDietPlan(plan._id)}
                      >
                        <Text style={styles.planActionText}>Delete</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </ScrollView>
              
              <TouchableOpacity
                style={styles.newPlanBtn}
                onPress={() => {
                  resetForm();
                  setShowExistingPlans(false);
                }}
              >
                <Text style={styles.newPlanBtnText}>+ Create New Plan</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Plan Information</Text>
              <TextInput
                style={styles.input}
                placeholder="Diet Plan Title"
                value={planTitle}
                onChangeText={setPlanTitle}
                placeholderTextColor={colors.textTertiary}
              />
              <TextInput
                style={styles.input}
                placeholder="Daily Calorie Target"
                value={customCalories}
                onChangeText={setCustomCalories}
                keyboardType="numeric"
                placeholderTextColor={colors.textTertiary}
              />
              <TextInput
                style={[styles.input, styles.notesInput]}
                placeholder="Additional notes for the patient..."
                value={notes}
                onChangeText={setNotes}
                multiline
                placeholderTextColor={colors.textTertiary}
              />
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Weekly Plan</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.daySelector}>
                {DAYS.map((day) => (
                  <TouchableOpacity
                    key={day}
                    style={[
                      styles.dayButton,
                      selectedDay === day && styles.dayButtonActive
                    ]}
                    onPress={() => setSelectedDay(day)}
                  >
                    <Text style={[
                      styles.dayButtonText,
                      selectedDay === day && styles.dayButtonTextActive
                    ]}>
                      {day.charAt(0).toUpperCase() + day.slice(1, 3)}
                    </Text>
                    <Text style={[
                      styles.dayCalories,
                      selectedDay === day && styles.dayCaloriesActive
                    ]}>
                      {getTotalCaloriesForDay(day)} cal
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.section}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.mealSelector}>
                {MEAL_TYPES.map((meal) => (
                  <TouchableOpacity
                    key={meal}
                    style={[
                      styles.mealButton,
                      selectedMealType === meal && styles.mealButtonActive
                    ]}
                    onPress={() => setSelectedMealType(meal)}
                  >
                    <Text style={[
                      styles.mealButtonText,
                      selectedMealType === meal && styles.mealButtonTextActive
                    ]}>
                      {meal.charAt(0).toUpperCase() + meal.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.section}>
              <View style={styles.mealHeader}>
                <Text style={styles.mealTitle}>
                  {selectedMealType.charAt(0).toUpperCase() + selectedMealType.slice(1)} - {selectedDay.charAt(0).toUpperCase() + selectedDay.slice(1)}
                </Text>
                <TouchableOpacity
                  style={styles.addFoodButton}
                  onPress={() => setShowFoodSelector(true)}
                >
                  <Ionicons name="add" size={Math.min(hp(2.5), wp(5.4))} color={colors.textOnPrimary} />
                  <Text style={styles.addFoodText}>Add Food</Text>
                </TouchableOpacity>
              </View>

              {weeklyMeals[selectedDay] && weeklyMeals[selectedDay][selectedMealType] && weeklyMeals[selectedDay][selectedMealType].length === 0 ? (
                <View style={styles.emptyMeal}>
                  <Ionicons name="restaurant-outline" size={Math.min(hp(5.9), wp(12.8))} color={colors.textTertiary} />
                  <Text style={styles.emptyMealText}>No foods added yet</Text>
                  <TouchableOpacity
                    style={styles.emptyMealButton}
                    onPress={() => setShowFoodSelector(true)}
                  >
                    <Text style={styles.emptyMealButtonText}>Add First Food</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                weeklyMeals[selectedDay] && weeklyMeals[selectedDay][selectedMealType] && weeklyMeals[selectedDay][selectedMealType].map((food: MealFood, index: number) => (
                  <View key={index} style={styles.selectedFood}>
                    <View style={styles.selectedFoodInfo}>
                      <Text style={styles.selectedFoodName}>{food.foodName}</Text>
                      <Text style={styles.selectedFoodNutrition}>
                        {food.calories} cal • {food.protein}g protein • {food.carbs}g carbs • {food.fats}g fat
                      </Text>
                    </View>
                    <View style={styles.selectedFoodControls}>
                      <TextInput
                        style={styles.quantityInput}
                        value={food.quantity.toString()}
                        onChangeText={(text) => {
                          const qty = parseInt(text) || 0;
                          updateFoodQuantity(selectedDay, selectedMealType, index, qty);
                        }}
                        keyboardType="numeric"
                      />
                      <Text style={styles.unitText}>g</Text>
                      <TouchableOpacity
                        onPress={() => removeFoodFromMeal(selectedDay, selectedMealType, index)}
                      >
                        <Ionicons name="trash" size={Math.min(hp(2.5), wp(5.4))} color={colors.error} />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
            </View>

            <View style={{ height: hp(12.3) }} />
          </ScrollView>
          )}

          <View style={styles.saveButtonContainer}>
            <TouchableOpacity
              style={[styles.saveButton, loading && styles.saveButtonDisabled]}
              onPress={saveDietPlan}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color={colors.textOnPrimary} />
              ) : (
                <View style={styles.saveButtonContent}>
                  <Ionicons name="checkmark" size={Math.min(hp(2.5), wp(5.4))} color={colors.textOnPrimary} />
                  <Text style={styles.saveButtonText}>
                    {editingPlanId ? 'Update' : 'Create'} Diet Plan
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};


const getStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: wp(6.4),
    borderTopRightRadius: wp(6.4),
    height: '90%',
    padding: wp(5.3),
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: hp(2.5),
  },
  modalTitle: {
    fontSize: Math.min(hp(2.2), wp(4.8)),
    fontWeight: 'bold',
    color: colors.textPrimary,
    flex: 1,
  },
  modalBody: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: wp(5.3),
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: Math.min(hp(2.2), wp(4.8)),
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  section: {
    marginBottom: hp(3),
  },
  sectionTitle: {
    fontSize: Math.min(hp(2), wp(4.3)),
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: hp(1.5),
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: wp(3.2),
    padding: wp(3.2),
    marginBottom: hp(1.5),
    fontSize: Math.min(hp(2), wp(4.3)),
    color: colors.textPrimary,
  },
  notesInput: {
    height: hp(9.9),
    textAlignVertical: 'top',
  },
  daySelector: {
    marginBottom: hp(1.5),
  },
  dayButton: {
    padding: wp(3.2),
    marginRight: wp(3.2),
    borderRadius: wp(3.2),
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    minWidth: wp(16),
    alignItems: 'center',
  },
  dayButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  dayButtonText: {
    fontSize: Math.min(hp(1.8), wp(3.8)),
    fontWeight: '500',
    color: colors.textPrimary,
  },
  dayButtonTextActive: {
    color: colors.textOnPrimary,
  },
  dayCalories: {
    fontSize: Math.min(hp(1.25), wp(2.7)),
    color: colors.textSecondary,
    marginTop: hp(0.25),
  },
  dayCaloriesActive: {
    color: colors.textOnPrimary,
  },
  mealSelector: {
    marginBottom: hp(1.5),
  },
  mealButton: {
    paddingHorizontal: wp(4.3),
    paddingVertical: hp(1),
    marginRight: wp(3.2),
    borderRadius: wp(5.3),
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  mealButtonActive: {
    backgroundColor: colors.secondary,
    borderColor: colors.secondary,
  },
  mealButtonText: {
    fontSize: Math.min(hp(1.8), wp(3.8)),
    color: colors.textPrimary,
  },
  mealButtonTextActive: {
    color: colors.textOnPrimary,
  },
  mealHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: hp(2),
  },
  mealTitle: {
    fontSize: Math.min(hp(2), wp(4.3)),
    fontWeight: '600',
    color: colors.textPrimary,
  },
  addFoodButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: wp(3.2),
    paddingVertical: hp(0.7),
    borderRadius: wp(5.3),
  },
  addFoodText: {
    color: colors.textOnPrimary,
    fontSize: Math.min(hp(1.5), wp(3.2)),
    marginLeft: wp(1.1),
  },
  emptyMeal: {
    alignItems: 'center',
    padding: wp(8.5),
    backgroundColor: colors.background,
    borderRadius: wp(3.2),
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyMealText: {
    marginTop: hp(1.5),
    color: colors.textSecondary,
    fontSize: Math.min(hp(1.8), wp(3.8)),
  },
  emptyMealButton: {
    marginTop: hp(1.5),
    backgroundColor: colors.primary,
    paddingHorizontal: wp(4.3),
    paddingVertical: hp(1),
    borderRadius: wp(5.3),
  },
  emptyMealButtonText: {
    color: colors.textOnPrimary,
    fontSize: Math.min(hp(1.5), wp(3.2)),
  },
  selectedFood: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: wp(3.2),
    backgroundColor: colors.background,
    borderRadius: wp(3.2),
    marginBottom: hp(1),
  },
  selectedFoodInfo: {
    flex: 1,
  },
  selectedFoodName: {
    fontSize: Math.min(hp(1.8), wp(3.8)),
    fontWeight: '500',
    color: colors.textPrimary,
  },
  selectedFoodNutrition: {
    fontSize: Math.min(hp(1.5), wp(3.2)),
    color: colors.textSecondary,
    marginTop: hp(0.25),
  },
  selectedFoodControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quantityInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: wp(1.6),
    width: wp(13.3),
    height: hp(3.9),
    textAlign: 'center',
    fontSize: Math.min(hp(1.5), wp(3.2)),
    color: colors.textPrimary,
    marginRight: wp(1.1),
  },
  unitText: {
    fontSize: Math.min(hp(1.5), wp(3.2)),
    color: colors.textSecondary,
    marginRight: wp(3.2),
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    margin: wp(5.3),
    paddingHorizontal: wp(4.3),
    paddingVertical: hp(1.5),
    borderRadius: wp(3.2),
  },
  searchInput: {
    flex: 1,
    marginLeft: wp(3.2),
    fontSize: Math.min(hp(2), wp(4.3)),
    color: colors.textPrimary,
  },
  foodList: {
    flex: 1,
    paddingHorizontal: wp(5.3),
  },
  foodItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: wp(4.3),
    backgroundColor: colors.surface,
    borderRadius: wp(3.2),
    marginBottom: hp(1),
    borderWidth: 1,
    borderColor: colors.border,
  },
  foodItemContent: {
    flex: 1,
  },
  foodName: {
    fontSize: Math.min(hp(1.8), wp(3.8)),
    fontWeight: '500',
    color: colors.textPrimary,
  },
  foodDetails: {
    marginTop: hp(0.5),
  },
  foodCategory: {
    fontSize: Math.min(hp(1.5), wp(3.2)),
    color: colors.textSecondary,
  },
  foodNutrition: {
    fontSize: Math.min(hp(1.5), wp(3.2)),
    color: colors.textTertiary,
    marginTop: hp(0.25),
  },
  saveButtonContainer: {
    padding: wp(5.3),
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: hp(2),
    borderRadius: wp(3.2),
  },
  saveButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: colors.textOnPrimary,
    fontSize: Math.min(hp(2), wp(4.3)),
    fontWeight: '600',
    marginLeft: wp(2.1),
  },
  // Existing Plans Styles
  existingPlansContainer: {
    padding: wp(5.3),
    maxHeight: hp(74),
  },
  existingPlansList: {
    maxHeight: hp(49),
    marginVertical: hp(1.2),
  },
  existingPlanCard: {
    backgroundColor: colors.background,
    padding: wp(4.3),
    borderRadius: wp(3.2),
    marginBottom: hp(1.5),
    borderWidth: 1,
    borderColor: colors.border,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: hp(1),
  },
  planTitle: {
    fontSize: Math.min(hp(2), wp(4.3)),
    fontWeight: '600',
    color: colors.textPrimary,
    flex: 1,
    marginRight: wp(2.7),
  },
  planDate: {
    fontSize: Math.min(hp(1.5), wp(3.2)),
    color: colors.textSecondary,
  },
  planCalories: {
    fontSize: Math.min(hp(1.8), wp(3.8)),
    color: colors.primary,
    fontWeight: '500',
    marginBottom: hp(0.7),
  },
  planNotes: {
    fontSize: Math.min(hp(1.6), wp(3.5)),
    color: colors.textSecondary,
    marginBottom: hp(1.5),
    lineHeight: hp(2.2),
  },
  planActions: {
    flexDirection: 'row',
    gap: wp(2.7),
  },
  planActionBtn: {
    flex: 1,
    paddingVertical: hp(1),
    paddingHorizontal: wp(4.3),
    borderRadius: wp(2.1),
  },
  editBtn: {
    backgroundColor: colors.primary,
  },
  deleteBtn: {
    backgroundColor: colors.error,
  },
  planActionText: {
    color: colors.textOnPrimary,
    fontSize: Math.min(hp(1.6), wp(3.5)),
    fontWeight: '500',
    textAlign: 'center',
  },
  newPlanBtn: {
    backgroundColor: colors.success,
    paddingVertical: hp(1.5),
    paddingHorizontal: wp(5.3),
    borderRadius: wp(2.7),
    alignItems: 'center',
    marginTop: hp(1.2),
  },
  newPlanBtnText: {
    color: colors.textOnPrimary,
    fontSize: Math.min(hp(1.9), wp(4)),
    fontWeight: '600',
  },
  // Meal preview styles 
  planMealsPreview: {
    marginBottom: hp(1.5),
    padding: wp(3.2),
    backgroundColor: colors.surface,
    borderRadius: wp(2.1),
    borderWidth: 1,
    borderColor: colors.border,
  },
  planMealsTitle: {
    fontSize: Math.min(hp(1.5), wp(3.2)),
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: hp(0.7),
  },
  dayPreview: {
    marginBottom: hp(0.5),
  },
  dayPreviewTitle: {
    fontSize: Math.min(hp(1.35), wp(3)),
    fontWeight: '500',
    color: colors.primary,
    marginBottom: hp(0.25),
  },
  mealPreview: {
    fontSize: Math.min(hp(1.25), wp(2.7)),
    color: colors.textSecondary,
    marginLeft: wp(2.1),
    lineHeight: hp(1.7),
  },
  totalDaysText: {
    fontSize: Math.min(hp(1.25), wp(2.7)),
    color: colors.textTertiary,
    marginTop: hp(0.5),
    fontStyle: 'italic',
  },
});

export default DietPlanModal;

