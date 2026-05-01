import { useTheme } from '@/contexts/ThemeContext';
import { tokenStorage } from '@/utils/auth/tokenStorage';
import { getBackendBaseUrl } from '@/utils/config';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from 'react-native-responsive-screen';

const BACKEND_URL = getBackendBaseUrl().replace(/\/api\/?$/, '');

const getApiMessage = (data: any, fallback: string) => {
  if (typeof data?.message === 'string' && data.message.trim()) return data.message;
  return fallback;
};

const isUnauthorizedResponse = (status?: number, message?: string) => {
  return status === 401 || status === 403 || /not authorized|unauthorized|jwt expired|please login/i.test(message || '');
};

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
  const router = useRouter();
  const { colors } = useTheme();
  const styles = getStyles(colors);
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
      
      if (!token) {
        setDietPlans([]);
        setSelectedPlan(null);
        Alert.alert('Session expired', 'Please sign in again.', [
          { text: 'OK', onPress: () => {
            onClose();
            router.replace('/(auth)');
          }},
        ]);
        return;
      }

      if (!userId) {
        console.log('[PatientDietPlanViewer] No user ID available');
        Alert.alert('Error', 'Unable to identify user. Please try logging in again.');
        return;
      }

      const response = await fetch(`${BACKEND_URL}/api/diet-plans/patient/${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json().catch(() => ({}));
      console.log('Patient diet plans response:', data);
      const message = getApiMessage(data, 'Failed to load diet plans');

      if (isUnauthorizedResponse(response.status, message)) {
        console.log('[PatientDietPlanViewer] Unauthorized diet plan fetch:', message);
        setDietPlans([]);
        setSelectedPlan(null);
        await tokenStorage.clearAll();
        Alert.alert('Session expired', 'Please sign in again.', [
          { text: 'OK', onPress: () => {
            onClose();
            router.replace('/(auth)');
          }},
        ]);
        return;
      }
      
      if (response.ok && data.success) {
        setDietPlans(data.dietPlans || []);
        if (data.dietPlans && data.dietPlans.length > 0) {
          setSelectedPlan(data.dietPlans[0]); // Select first plan by default
        } else {
          setSelectedPlan(null);
        }
      } else {
        console.log('[PatientDietPlanViewer] API returned error:', message);
        setDietPlans([]);
        setSelectedPlan(null);
        if (message.includes('Access denied')) {
          Alert.alert('Info', 'No diet plans found. Your doctor will create one during your next appointment.');
        } else {
          Alert.alert('Error', message);
        }
      }
    } catch (error) {
      console.log('[PatientDietPlanViewer] Error fetching diet plans:', error);
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
            color={colors.primary} 
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
              <ActivityIndicator size="large" color={colors.primary} />
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
              <Ionicons name="close" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          {dietPlans.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="restaurant-outline" size={64} color={colors.textTertiary} />
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
                  colors={[colors.primary]}
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

const getStyles = (colors: any) => StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: wp(6),
    borderTopRightRadius: wp(6),
    height: '90%',
    padding: wp(5),
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: hp(2),
  },
  modalTitle: {
    fontSize: hp(2.5),
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: hp(2),
    fontSize: hp(2),
    color: colors.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: wp(10),
  },
  emptyTitle: {
    fontSize: hp(2.2),
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: hp(2),
    marginBottom: hp(1),
  },
  emptyText: {
    fontSize: hp(1.8),
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: hp(2.5),
  },
  contentContainer: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: hp(2),
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: hp(1.5),
  },
  planSelector: {
    marginBottom: hp(3),
  },
  planCard: {
    backgroundColor: colors.background,
    padding: wp(4),
    borderRadius: wp(3),
    marginRight: wp(3),
    minWidth: wp(50),
    borderWidth: 2,
    borderColor: 'transparent',
  },
  planCardActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  planTitle: {
    fontSize: hp(1.8),
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: hp(0.5),
  },
  planTitleActive: {
    color: colors.primary,
  },
  planDate: {
    fontSize: hp(1.5),
    color: colors.textSecondary,
    marginBottom: hp(0.5),
  },
  planDateActive: {
    color: colors.primary,
  },
  planCalories: {
    fontSize: hp(1.5),
    color: colors.textSecondary,
    marginBottom: hp(0.5),
  },
  planCaloriesActive: {
    color: colors.primary,
  },
  planDoctor: {
    fontSize: hp(1.3),
    color: colors.textTertiary,
  },
  planDoctorActive: {
    color: colors.primary,
  },
  notesSection: {
    backgroundColor: colors.background,
    padding: wp(4),
    borderRadius: wp(3),
    marginBottom: hp(3),
  },
  notesText: {
    fontSize: hp(1.8),
    color: colors.textSecondary,
    lineHeight: hp(2.5),
  },
  daySelector: {
    marginBottom: hp(3),
  },
  dayButton: {
    padding: wp(3),
    marginRight: wp(3),
    borderRadius: wp(3),
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    minWidth: wp(15),
    alignItems: 'center',
  },
  dayButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  dayButtonText: {
    fontSize: hp(1.8),
    fontWeight: '500',
    color: colors.textPrimary,
  },
  dayButtonTextActive: {
    color: colors.textOnPrimary,
  },
  dayCalories: {
    fontSize: hp(1.2),
    color: colors.textSecondary,
    marginTop: hp(0.2),
  },
  dayCaloriesActive: {
    color: colors.textOnPrimary,
  },
  dailySummary: {
    backgroundColor: colors.background,
    padding: wp(4),
    borderRadius: wp(3),
    marginBottom: hp(3),
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: hp(1.5),
    color: colors.textSecondary,
    marginBottom: hp(0.5),
  },
  summaryValue: {
    fontSize: hp(1.8),
    fontWeight: '600',
    color: colors.primary,
  },
  mealsContainer: {
    marginBottom: hp(4),
  },
  mealSection: {
    backgroundColor: colors.background,
    borderRadius: wp(3),
    padding: wp(4),
    marginBottom: hp(2),
  },
  mealHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: hp(1.5),
  },
  mealTitle: {
    fontSize: hp(2),
    fontWeight: '600',
    color: colors.textPrimary,
    marginLeft: wp(2),
  },
  foodItem: {
    backgroundColor: colors.surface,
    padding: wp(3),
    borderRadius: wp(2),
    marginBottom: hp(1),
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  foodInfo: {
    flex: 1,
  },
  foodName: {
    fontSize: hp(1.8),
    fontWeight: '500',
    color: colors.textPrimary,
    marginBottom: hp(0.5),
  },
  foodDetails: {
    fontSize: hp(1.5),
    color: colors.textSecondary,
  },
  emptyDay: {
    padding: hp(4),
    alignItems: 'center',
  },
  emptyDayText: {
    fontSize: hp(1.8),
    color: colors.textTertiary,
    fontStyle: 'italic',
  },
});

export default PatientDietPlanViewer;

