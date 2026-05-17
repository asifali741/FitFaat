import { useTheme } from '@/contexts/ThemeContext';
import {
  dietPreferenceOptions,
  DIET_PREFERENCE_STORAGE_KEY,
  filterFoodsByDietPreference,
  getDietPreferenceLabel,
  type DietPreference,
} from '@/constants/foodDatabase';
import { tokenStorage } from '@/utils/auth/tokenStorage';
import { getBackendBaseUrl } from '@/utils/config';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as NavigationBar from 'expo-navigation-bar';
import { useRouter } from 'expo-router';
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
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from 'react-native-responsive-screen';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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

const isDietPreference = (value: string | null): value is DietPreference =>
  value === 'all' || value === 'vegetarian' || value === 'nonVegetarian';

const PatientDietPlanViewer: React.FC<PatientDietPlanViewerProps> = ({
  visible,
  onClose,
  patientId
}) => {
  const router = useRouter();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = getStyles(colors, insets.bottom);
  const [dietPlans, setDietPlans] = useState<DietPlan[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<DietPlan | null>(null);
  const [selectedDay, setSelectedDay] = useState('monday');
  const [refreshing, setRefreshing] = useState(false);
  const [dietPreference, setDietPreference] = useState<DietPreference>('all');

  useEffect(() => {
    if (visible) {
      console.log('=== Diet Plan Viewer Opened ===');
      console.log('PatientId prop:', patientId);
      loadDietPreference();
      fetchDietPlans();
    }
  }, [visible]);

  useEffect(() => {
    if (Platform.OS !== 'android') return;

    if (visible) {
      NavigationBar.setBackgroundColorAsync('#FFFFFF').catch(() => {});
      NavigationBar.setButtonStyleAsync('dark').catch(() => {});
      NavigationBar.setStyle('light');
    } else {
      NavigationBar.setBackgroundColorAsync(colors.screenColor || '#FFFFFF').catch(() => {});
      NavigationBar.setButtonStyleAsync('dark').catch(() => {});
    }
  }, [colors.screenColor, visible]);

  const loadDietPreference = async () => {
    try {
      const savedPreference = await AsyncStorage.getItem(DIET_PREFERENCE_STORAGE_KEY);
      if (isDietPreference(savedPreference)) {
        setDietPreference(savedPreference);
      }
    } catch (error) {
      console.error('Error loading diet preference:', error);
    }
  };

  const handleDietPreferenceChange = async (preference: DietPreference) => {
    setDietPreference(preference);

    try {
      await AsyncStorage.setItem(DIET_PREFERENCE_STORAGE_KEY, preference);
    } catch (error) {
      console.error('Error saving diet preference:', error);
    }
  };

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

  const getFilteredFoods = (foods?: MealFood[]) =>
    filterFoodsByDietPreference(foods || [], dietPreference);

  const getTotalCaloriesForDay = (plan: DietPlan, day: string) => {
    let total = 0;
    if (plan.weeklyMeals && plan.weeklyMeals[day]) {
      MEAL_TYPES.forEach(meal => {
        if (Array.isArray(plan.weeklyMeals[day][meal])) {
          getFilteredFoods(plan.weeklyMeals[day][meal]).forEach((food: MealFood) => {
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
          getFilteredFoods(plan.weeklyMeals[day][meal]).forEach((food: MealFood) => {
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
    const visibleFoods = getFilteredFoods(foods);
    if (!visibleFoods.length) return null;

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
        
        {visibleFoods.map((food, index) => (
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
              contentContainerStyle={styles.contentScrollContent}
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

                  {/* Food Preference Filter */}
                  <View style={styles.dietFilterSection}>
                    <View style={styles.sectionHeaderRow}>
                      <Text style={styles.sectionTitle}>Food Preference</Text>
                      <Text style={styles.dietFilterSummary}>{getDietPreferenceLabel(dietPreference)}</Text>
                    </View>
                    <View style={styles.dietFilterContainer}>
                      {dietPreferenceOptions.map((option) => {
                        const isActive = dietPreference === option.value;

                        return (
                          <TouchableOpacity
                            key={option.value}
                            style={[
                              styles.dietFilterButton,
                              isActive && {
                                backgroundColor: colors.primary,
                                borderColor: colors.primary,
                              },
                            ]}
                            onPress={() => handleDietPreferenceChange(option.value)}
                            activeOpacity={0.8}
                          >
                            <Ionicons
                              name={option.icon}
                              size={Math.min(hp(2), wp(4.5))}
                              color={isActive ? colors.textOnPrimary : colors.textSecondary}
                            />
                            <Text
                              style={[
                                styles.dietFilterText,
                                { color: isActive ? colors.textOnPrimary : colors.textSecondary },
                              ]}
                              numberOfLines={1}
                              adjustsFontSizeToFit
                            >
                              {option.label}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
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
                      MEAL_TYPES.some(mealType => getFilteredFoods(selectedPlan.weeklyMeals[selectedDay][mealType]).length > 0) ? (
                        MEAL_TYPES.map(mealType =>
                          renderMealSection(mealType, selectedPlan.weeklyMeals[selectedDay][mealType])
                        )
                      ) : (
                        <View style={styles.emptyDay}>
                          <Text style={styles.emptyDayText}>
                            {dietPreference === 'all'
                              ? 'No meals planned for this day'
                              : `No ${getDietPreferenceLabel(dietPreference).toLowerCase()} meals planned for this day`}
                          </Text>
                        </View>
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

const getStyles = (colors: any, bottomInset: number) => StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: wp(6),
    borderTopRightRadius: wp(6),
    height: '95%',
    paddingTop: wp(5),
    paddingHorizontal: wp(5),
    paddingBottom: Math.max(wp(5), bottomInset + hp(1.5)),
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
    paddingBottom: Math.max(hp(5), bottomInset + hp(3)),
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
  contentScrollContent: {
    paddingBottom: Math.max(hp(4), bottomInset + hp(3)),
  },
  sectionTitle: {
    fontSize: hp(2),
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: hp(1.5),
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: wp(2),
  },
  dietFilterSummary: {
    fontSize: Math.min(hp(1.35), wp(3.2)),
    fontWeight: '700',
    color: colors.primary,
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
  dietFilterSection: {
    marginBottom: hp(3),
  },
  dietFilterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2),
  },
  dietFilterButton: {
    flex: 1,
    minHeight: hp(4.8),
    borderRadius: wp(3),
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: wp(1.2),
    paddingHorizontal: wp(2),
    paddingVertical: hp(0.9),
  },
  dietFilterText: {
    fontSize: Math.min(hp(1.45), wp(3.3)),
    fontWeight: '800',
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

