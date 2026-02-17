import { theme } from '@/constants/theme';
import { tokenStorage } from '@/utils/auth/tokenStorage';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

const ENV = Constants.expoConfig?.extra;
const BACKEND_URL = (ENV?.EXPO_PUBLIC_BACKEND_API_URL || (Platform.OS === 'android' ? 'http://10.0.2.2:5001' : 'http://localhost:5001')).replace(/\/api\/?$/, '');

interface MealFood {
  foodName: string;
  quantity: number;
  unit: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
}

interface DietPlan {
  _id: string;
  planTitle: string;
  customDailyCalories: number;
  notes: string;
  createdAt: string;
  updatedAt: string;
  weeklyMeals: {
    [day: string]: {
      [mealType: string]: MealFood[];
    };
  };
  doctorId: {
    firstName: string;
    lastName: string;
  };
}

interface PatientDietPlanViewerProps {
  visible: boolean;
  onClose: () => void;
  patientId?: string;
}

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snacks'];

const PatientDietPlanViewer: React.FC<PatientDietPlanViewerProps> = ({
  visible,
  onClose,
  patientId
}) => {
  const [dietPlans, setDietPlans] = useState<DietPlan[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<DietPlan | null>(null);
  const [selectedDay, setSelectedDay] = useState('monday');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (visible) {
      console.log('=== Diet Plan Viewer Opened ===');
      console.log('PatientId prop:', patientId);
      fetchDietPlans();
    }
  }, [visible]);

  const fetchDietPlans = async () => {
    try {
      setLoading(true);
      const token = await tokenStorage.getToken();
      const userInfo = await tokenStorage.getUser();
      
      const userId = patientId || userInfo?.id || userInfo?._id;
      
      console.log('Fetching diet plans for userId:', userId);
      console.log('User info:', userInfo);
      
      if (!userId) {
        console.error('No user ID available');
        Alert.alert('Error', 'Unable to identify user. Please try logging in again.');
        return;
      }

      const response = await fetch(`${BACKEND_URL}/api/diet-plans/patient/${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      console.log('Patient diet plans response:', data);
      
      if (data.success) {
        setDietPlans(data.dietPlans || []);
        if (data.dietPlans && data.dietPlans.length > 0) {
          setSelectedPlan(data.dietPlans[0]); // Select first plan by default
        }
      } else {
        console.error('API returned error:', data.message);
        if (data.message?.includes('Access denied')) {
          Alert.alert('Info', 'No diet plans found. Your doctor will create one during your next appointment.');
        }
      }
    } catch (error) {
      console.error('Error fetching diet plans:', error);
      Alert.alert('Error', 'Failed to load diet plans. Please check your connection and try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchDietPlans();
  };

  const getTotalCaloriesForDay = (plan: DietPlan, day: string) => {
    let total = 0;
    if (plan.weeklyMeals && plan.weeklyMeals[day]) {
      MEAL_TYPES.forEach(meal => {
        if (Array.isArray(plan.weeklyMeals[day][meal])) {
          plan.weeklyMeals[day][meal].forEach((food: MealFood) => {
            total += food.calories || 0;
          });
        }
      });
    }
    return total;
  };

  const getTotalNutrientsForDay = (plan: DietPlan, day: string) => {
    let protein = 0, carbs = 0, fats = 0;
    if (plan.weeklyMeals && plan.weeklyMeals[day]) {
      MEAL_TYPES.forEach(meal => {
        if (Array.isArray(plan.weeklyMeals[day][meal])) {
          plan.weeklyMeals[day][meal].forEach((food: MealFood) => {
            protein += food.protein || 0;
            carbs += food.carbs || 0;
            fats += food.fats || 0;
          });
        }
      });
    }
    return { protein: Math.round(protein), carbs: Math.round(carbs), fats: Math.round(fats) };
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const renderMealSection = (mealType: string, foods: MealFood[]) => {
    if (!foods || foods.length === 0) return null;

    return (
      <View key={mealType} style={styles.mealSection}>
        <View style={styles.mealHeader}>
          <Ionicons 
            name={
              mealType === 'breakfast' ? 'sunny' :
              mealType === 'lunch' ? 'restaurant' :
              mealType === 'dinner' ? 'moon' : 'cafe'
            } 
            size={20} 
            color={theme.colors.primary} 
          />
          <Text style={styles.mealTitle}>
            {mealType.charAt(0).toUpperCase() + mealType.slice(1)}
          </Text>
        </View>
        
        {foods.map((food, index) => (
          <View key={index} style={styles.foodItem}>
            <View style={styles.foodInfo}>
              <Text style={styles.foodName}>{food.foodName}</Text>
              <Text style={styles.foodDetails}>
                {food.quantity}g • {food.calories} cal • {food.protein}g protein • {food.carbs}g carbs • {food.fats}g fat
              </Text>
            </View>
          </View>
        ))}
      </View>
    );
  };

  if (loading && dietPlans.length === 0) {
    return (
      <Modal visible={visible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
              <Text style={styles.loadingText}>Loading your diet plans...</Text>
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>My Diet Plans</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={theme.colors.textPrimary} />
            </TouchableOpacity>
          </View>

          {dietPlans.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="restaurant-outline" size={64} color={theme.colors.textTertiary} />
              <Text style={styles.emptyTitle}>No Diet Plans Yet</Text>
              <Text style={styles.emptyText}>
                Your doctor hasn't created any diet plans for you yet. 
                Contact your doctor during your next appointment to get a personalized nutrition plan.
              </Text>
            </View>
          ) : (
            <ScrollView 
              style={styles.contentContainer}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  colors={[theme.colors.primary]}
                />
              }
            >
              {/* Plan Selector */}
              <View style={styles.planSelector}>
                <Text style={styles.sectionTitle}>Select Diet Plan</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {dietPlans.map((plan) => (
                    <TouchableOpacity
                      key={plan._id}
                      style={[
                        styles.planCard,
                        selectedPlan?._id === plan._id && styles.planCardActive
                      ]}
                      onPress={() => setSelectedPlan(plan)}
                    >
                      <Text style={[
                        styles.planTitle,
                        selectedPlan?._id === plan._id && styles.planTitleActive
                      ]}>
                        {plan.planTitle}
                      </Text>
                      <Text style={[
                        styles.planDate,
                        selectedPlan?._id === plan._id && styles.planDateActive
                      ]}>
                        {formatDate(plan.createdAt)}
                      </Text>
                      <Text style={[
                        styles.planCalories,
                        selectedPlan?._id === plan._id && styles.planCaloriesActive
                      ]}>
                        {plan.customDailyCalories} kcal/day
                      </Text>
                      {plan.doctorId && (
                        <Text style={[
                          styles.planDoctor,
                          selectedPlan?._id === plan._id && styles.planDoctorActive
                        ]}>
                          Dr. {plan.doctorId.firstName} {plan.doctorId.lastName}
                        </Text>
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {selectedPlan && (
                <>
                  {/* Plan Info */}
                  {selectedPlan.notes && (
                    <View style={styles.notesSection}>
                      <Text style={styles.sectionTitle}>Doctor's Notes</Text>
                      <Text style={styles.notesText}>{selectedPlan.notes}</Text>
                    </View>
                  )}

                  {/* Day Selector */}
                  <View style={styles.daySelector}>
                    <Text style={styles.sectionTitle}>Select Day</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      {DAYS.map((day) => {
                        const dayCalories = getTotalCaloriesForDay(selectedPlan, day);
                        const nutrients = getTotalNutrientsForDay(selectedPlan, day);
                        
                        return (
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
                              {dayCalories} cal
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>

                  {/* Daily Summary */}
                  <View style={styles.dailySummary}>
                    <Text style={styles.sectionTitle}>
                      {selectedDay.charAt(0).toUpperCase() + selectedDay.slice(1)} Summary
                    </Text>
                    <View style={styles.summaryRow}>
                      <View style={styles.summaryItem}>
                        <Text style={styles.summaryLabel}>Calories</Text>
                        <Text style={styles.summaryValue}>
                          {getTotalCaloriesForDay(selectedPlan, selectedDay)} / {selectedPlan.customDailyCalories}
                        </Text>
                      </View>
                      <View style={styles.summaryItem}>
                        <Text style={styles.summaryLabel}>Protein</Text>
                        <Text style={styles.summaryValue}>
                          {getTotalNutrientsForDay(selectedPlan, selectedDay).protein}g
                        </Text>
                      </View>
                      <View style={styles.summaryItem}>
                        <Text style={styles.summaryLabel}>Carbs</Text>
                        <Text style={styles.summaryValue}>
                          {getTotalNutrientsForDay(selectedPlan, selectedDay).carbs}g
                        </Text>
                      </View>
                      <View style={styles.summaryItem}>
                        <Text style={styles.summaryLabel}>Fats</Text>
                        <Text style={styles.summaryValue}>
                          {getTotalNutrientsForDay(selectedPlan, selectedDay).fats}g
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Meals for Selected Day */}
                  <View style={styles.mealsContainer}>
                    <Text style={styles.sectionTitle}>Today's Meals</Text>
                    {selectedPlan.weeklyMeals && selectedPlan.weeklyMeals[selectedDay] ? (
                      MEAL_TYPES.map(mealType => 
                        renderMealSection(mealType, selectedPlan.weeklyMeals[selectedDay][mealType])
                      )
                    ) : (
                      <View style={styles.emptyDay}>
                        <Text style={styles.emptyDayText}>No meals planned for this day</Text>
                      </View>
                    )}
                  </View>
                </>
              )}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
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
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  contentContainer: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
    marginBottom: 12,
  },
  planSelector: {
    marginBottom: 24,
  },
  planCard: {
    backgroundColor: theme.colors.background,
    padding: 16,
    borderRadius: 12,
    marginRight: 12,
    minWidth: 200,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  planCardActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary + '10',
  },
  planTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  planTitleActive: {
    color: theme.colors.primary,
  },
  planDate: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  planDateActive: {
    color: theme.colors.primary,
  },
  planCalories: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  planCaloriesActive: {
    color: theme.colors.primary,
  },
  planDoctor: {
    fontSize: 11,
    color: theme.colors.textTertiary,
  },
  planDoctorActive: {
    color: theme.colors.primary,
  },
  notesSection: {
    backgroundColor: theme.colors.background,
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  notesText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  daySelector: {
    marginBottom: 24,
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
  dailySummary: {
    backgroundColor: theme.colors.background,
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  mealsContainer: {
    marginBottom: 32,
  },
  mealSection: {
    backgroundColor: theme.colors.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  mealHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  mealTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginLeft: 8,
  },
  foodItem: {
    backgroundColor: theme.colors.surface,
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.primary,
  },
  foodInfo: {
    flex: 1,
  },
  foodName: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  foodDetails: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  emptyDay: {
    padding: 32,
    alignItems: 'center',
  },
  emptyDayText: {
    fontSize: 14,
    color: theme.colors.textTertiary,
    fontStyle: 'italic',
  },
});

export default PatientDietPlanViewer;