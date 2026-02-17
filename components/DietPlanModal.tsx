import { theme } from '@/constants/theme';
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

const ENV = Constants.expoConfig?.extra;
const BACKEND_URL = (ENV?.EXPO_PUBLIC_BACKEND_API_URL || (Platform.OS === 'android' ? 'http://10.0.2.2:5001' : 'http://localhost:5001')).replace(/\/api\/?$/, '');

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
  const [weeklyMeals, setWeeklyMeals] = useState(() => getInitialWeeklyMeals());

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
    const foodWithQuantity = {
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

    setWeeklyMeals(prev => {
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
    setWeeklyMeals(prev => {
      // Validate state structure
      if (!prev || !prev[dayKey] || !Array.isArray(prev[dayKey][mealKey])) {
        console.warn('Invalid state structure in removeFoodFromMeal');
        return prev || getInitialWeeklyMeals();
      }

      return {
        ...prev,
        [dayKey]: {
          ...prev[dayKey],
          [mealKey]: prev[dayKey][mealKey].filter((_: any, i: number) => i !== index)
        }
      };
    });
  };

  const updateFoodQuantity = (dayKey: string, mealKey: string, index: number, quantity: number) => {
    if (quantity <= 0) return;

    setWeeklyMeals(prev => {
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
            weeklyMeals[day][meal].forEach((food: any) => {
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
      <Ionicons name="add-circle" size={24} color={theme.colors.primary} />
    </TouchableOpacity>
  );

  if (showFoodSelector) {
    return (
      <Modal visible={visible} animationType="slide" transparent={false}>
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => setShowFoodSelector(false)}>
              <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Select Food for {selectedMealType}</Text>
            <View style={{ width: 24 }} />
          </View>

          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color={theme.colors.textSecondary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search foods..."
              value={searchTerm}
              onChangeText={setSearchTerm}
              placeholderTextColor={theme.colors.textTertiary}
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
              <Ionicons name="close" size={24} color={theme.colors.textPrimary} />
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
                placeholderTextColor={theme.colors.textTertiary}
              />
              <TextInput
                style={styles.input}
                placeholder="Daily Calorie Target"
                value={customCalories}
                onChangeText={setCustomCalories}
                keyboardType="numeric"
                placeholderTextColor={theme.colors.textTertiary}
              />
              <TextInput
                style={[styles.input, styles.notesInput]}
                placeholder="Additional notes for the patient..."
                value={notes}
                onChangeText={setNotes}
                multiline
                placeholderTextColor={theme.colors.textTertiary}
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
                  <Ionicons name="add" size={20} color={theme.colors.surface} />
                  <Text style={styles.addFoodText}>Add Food</Text>
                </TouchableOpacity>
              </View>

              {weeklyMeals[selectedDay] && weeklyMeals[selectedDay][selectedMealType] && weeklyMeals[selectedDay][selectedMealType].length === 0 ? (
                <View style={styles.emptyMeal}>
                  <Ionicons name="restaurant-outline" size={48} color={theme.colors.textTertiary} />
                  <Text style={styles.emptyMealText}>No foods added yet</Text>
                  <TouchableOpacity
                    style={styles.emptyMealButton}
                    onPress={() => setShowFoodSelector(true)}
                  >
                    <Text style={styles.emptyMealButtonText}>Add First Food</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                weeklyMeals[selectedDay] && weeklyMeals[selectedDay][selectedMealType] && weeklyMeals[selectedDay][selectedMealType].map((food: any, index: number) => (
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
                        <Ionicons name="trash" size={20} color={theme.colors.error} />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
            </View>

            <View style={{ height: 100 }} />
          </ScrollView>
          )}

          <View style={styles.saveButtonContainer}>
            <TouchableOpacity
              style={[styles.saveButton, loading && styles.saveButtonDisabled]}
              onPress={saveDietPlan}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color={theme.colors.surface} />
              ) : (
                <View style={styles.saveButtonContent}>
                  <Ionicons name="checkmark" size={20} color={theme.colors.surface} />
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


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '90%',
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
    flex: 1,
  },
  modalBody: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    fontSize: 16,
    color: theme.colors.textPrimary,
  },
  notesInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  daySelector: {
    marginBottom: 12,
  },
  dayButton: {
    padding: 12,
    marginRight: 12,
    borderRadius: 12,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    minWidth: 60,
    alignItems: 'center',
  },
  dayButtonActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  dayButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.textPrimary,
  },
  dayButtonTextActive: {
    color: theme.colors.surface,
  },
  dayCalories: {
    fontSize: 10,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  dayCaloriesActive: {
    color: theme.colors.surface,
  },
  mealSelector: {
    marginBottom: 12,
  },
  mealButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 12,
    borderRadius: 20,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  mealButtonActive: {
    backgroundColor: theme.colors.secondary,
    borderColor: theme.colors.secondary,
  },
  mealButtonText: {
    fontSize: 14,
    color: theme.colors.textPrimary,
  },
  mealButtonTextActive: {
    color: theme.colors.surface,
  },
  mealHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  mealTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  addFoodButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  addFoodText: {
    color: theme.colors.surface,
    fontSize: 12,
    marginLeft: 4,
  },
  emptyMeal: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: theme.colors.background,
    borderRadius: 12,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  emptyMealText: {
    marginTop: 12,
    color: theme.colors.textSecondary,
    fontSize: 14,
  },
  emptyMealButton: {
    marginTop: 12,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  emptyMealButtonText: {
    color: theme.colors.surface,
    fontSize: 12,
  },
  selectedFood: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: theme.colors.background,
    borderRadius: 12,
    marginBottom: 8,
  },
  selectedFoodInfo: {
    flex: 1,
  },
  selectedFoodName: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.textPrimary,
  },
  selectedFoodNutrition: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  selectedFoodControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quantityInput: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 6,
    width: 50,
    height: 32,
    textAlign: 'center',
    fontSize: 12,
    color: theme.colors.textPrimary,
    marginRight: 4,
  },
  unitText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginRight: 12,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    margin: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: theme.colors.textPrimary,
  },
  foodList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  foodItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  foodItemContent: {
    flex: 1,
  },
  foodName: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.textPrimary,
  },
  foodDetails: {
    marginTop: 4,
  },
  foodCategory: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  foodNutrition: {
    fontSize: 12,
    color: theme.colors.textTertiary,
    marginTop: 2,
  },
  saveButtonContainer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
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
    color: theme.colors.surface,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  // Existing Plans Styles
  existingPlansContainer: {
    padding: 20,
    maxHeight: 600,
  },
  existingPlansList: {
    maxHeight: 400,
    marginVertical: 10,
  },
  existingPlanCard: {
    backgroundColor: theme.colors.background,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  planTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    flex: 1,
    marginRight: 10,
  },
  planDate: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  planCalories: {
    fontSize: 14,
    color: theme.colors.primary,
    fontWeight: '500',
    marginBottom: 6,
  },
  planNotes: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginBottom: 12,
    lineHeight: 18,
  },
  planActions: {
    flexDirection: 'row',
    gap: 10,
  },
  planActionBtn: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  editBtn: {
    backgroundColor: theme.colors.primary,
  },
  deleteBtn: {
    backgroundColor: theme.colors.error,
  },
  planActionText: {
    color: theme.colors.surface,
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
  },
  newPlanBtn: {
    backgroundColor: theme.colors.success,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  newPlanBtnText: {
    color: theme.colors.surface,
    fontSize: 15,
    fontWeight: '600',
  },
});

export default DietPlanModal;