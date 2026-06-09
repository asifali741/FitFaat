import { useTheme } from '@/contexts/ThemeContext';
import AnimatedPressable from '@/components/common/AnimatedPressable';
import ProgressRing from '@/components/common/ProgressRing';
import SmartEmptyState from '@/components/common/SmartEmptyState';
import {
  dietPreferenceOptions,
  DIET_PREFERENCE_STORAGE_KEY,
  filterFoodsByDietPreference,
  getDietPreferenceLabel,
  type DietPreference,
} from '@/constants/foodDatabase';
import { ApiRequestError, cachedRequestJson } from '@/utils/apiHelper';
import { tokenStorage } from '@/utils/auth/tokenStorage';
import { isForbiddenRouteError, isSessionExpiredError } from '@/utils/auth/authErrors';
import { getBackendBaseUrl } from '@/utils/config';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import * as NavigationBar from 'expo-navigation-bar';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
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
const PATIENT_DIET_PLAN_READ_CONFIG = {
  timeoutMs: 7000,
  retries: 1,
  retryDelayMs: 500,
  cacheTtlMs: 2 * 60 * 1000,
  maxStaleMs: 24 * 60 * 60 * 1000,
  allowStaleOnError: true,
  maxWaitForFreshMs: 1800,
  refreshCacheInBackground: true,
};

const isDietPreference = (value: string | null): value is DietPreference =>
  value === 'all' || value === 'vegetarian' || value === 'nonVegetarian';

const PatientDietPlanViewer: React.FC<PatientDietPlanViewerProps> = ({
  visible,
  onClose,
  patientId
}) => {
  const router = useRouter();
  const { colors, isDarkMode } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = getStyles(colors, insets.bottom, isDarkMode);
  const [dietPlans, setDietPlans] = useState<DietPlan[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<DietPlan | null>(null);
  const [selectedDay, setSelectedDay] = useState('monday');
  const [refreshing, setRefreshing] = useState(false);
  const [dietPreference, setDietPreference] = useState<DietPreference>('all');

  useEffect(() => {
    if (Platform.OS !== 'android') return;

    if (visible) {
      NavigationBar.setButtonStyleAsync(isDarkMode ? 'light' : 'dark').catch(() => {});
      NavigationBar.setStyle(isDarkMode ? 'dark' : 'light');
    } else {
      NavigationBar.setButtonStyleAsync(isDarkMode ? 'light' : 'dark').catch(() => {});
      NavigationBar.setStyle(isDarkMode ? 'dark' : 'light');
    }
  }, [colors.screenColor, colors.surface, isDarkMode, visible]);

  const loadDietPreference = useCallback(async () => {
    try {
      const savedPreference = await AsyncStorage.getItem(DIET_PREFERENCE_STORAGE_KEY);
      if (isDietPreference(savedPreference)) {
        setDietPreference(savedPreference);
      }
    } catch (error) {
      console.error('Error loading diet preference:', error);
    }
  }, []);

  const handleDietPreferenceChange = async (preference: DietPreference) => {
    setDietPreference(preference);
    Haptics.selectionAsync().catch(() => {});

    try {
      await AsyncStorage.setItem(DIET_PREFERENCE_STORAGE_KEY, preference);
    } catch (error) {
      console.error('Error saving diet preference:', error);
    }
  };

  const fetchDietPlans = useCallback(async () => {
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

      const data = await cachedRequestJson<any>(
        `patient-diet-plans:${userId}`,
        `${BACKEND_URL}/api/diet-plans/patient/${userId}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        },
        PATIENT_DIET_PLAN_READ_CONFIG
      );
      console.log('Patient diet plans response:', data);
      const message = getApiMessage(data, 'Failed to load diet plans');

      const authError = { status: undefined, message };
      if (isSessionExpiredError(authError)) {
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

      if (isForbiddenRouteError(authError)) {
        console.log('[PatientDietPlanViewer] Forbidden diet plan fetch:', message);
        setDietPlans([]);
        setSelectedPlan(null);
        Alert.alert('Access denied', message);
        return;
      }
      
      if (data.success) {
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
      const message = error instanceof Error ? error.message : 'Failed to load diet plans';
      const status = error instanceof ApiRequestError ? error.status : undefined;
      const authError = { status, message };
      if (isSessionExpiredError(authError)) {
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
      if (isForbiddenRouteError(authError)) {
        setDietPlans([]);
        setSelectedPlan(null);
        Alert.alert('Access denied', message);
        return;
      }
      Alert.alert('Error', 'Failed to load diet plans. Please check your connection and try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [onClose, patientId, router]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchDietPlans();
  }, [fetchDietPlans]);

  useEffect(() => {
    if (visible) {
      console.log('=== Diet Plan Viewer Opened ===');
      console.log('PatientId prop:', patientId);
      loadDietPreference();
      fetchDietPlans();
    }
  }, [fetchDietPlans, loadDietPreference, patientId, visible]);

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

  const getMacroCaloriesForDay = (plan: DietPlan, day: string) => {
    const nutrients = getTotalNutrientsForDay(plan, day);
    const proteinCalories = nutrients.protein * 4;
    const carbCalories = nutrients.carbs * 4;
    const fatCalories = nutrients.fats * 9;
    const total = Math.max(1, proteinCalories + carbCalories + fatCalories);

    return {
      protein: { grams: nutrients.protein, calories: proteinCalories, percentage: proteinCalories / total },
      carbs: { grams: nutrients.carbs, calories: carbCalories, percentage: carbCalories / total },
      fats: { grams: nutrients.fats, calories: fatCalories, percentage: fatCalories / total },
    };
  };

  const renderMacroBar = (label: string, grams: number, percentage: number, color: string) => (
    <View style={styles.macroRow} key={label}>
      <View style={styles.macroLabelRow}>
        <Text style={styles.macroLabel}>{label}</Text>
        <Text style={styles.macroValue}>{grams}g</Text>
      </View>
      <View style={styles.macroTrack}>
        <View style={[styles.macroFill, { width: `${Math.min(Math.max(percentage, 0), 1) * 100}%`, backgroundColor: color }]} />
      </View>
    </View>
  );

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
            <SmartEmptyState
              icon="restaurant-outline"
              title="No Diet Plans Yet"
              message="Your doctor has not created a diet plan yet. Once a plan is ready, meals, macros, notes, and calories will appear here."
              actionLabel="Refresh Plans"
              onAction={fetchDietPlans}
              colors={colors}
              style={styles.emptySmartState}
            />
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
                    <AnimatedPressable
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
                    </AnimatedPressable>
                  ))}
                </ScrollView>
              </View>

              {selectedPlan && (
                <>
                  {/* Plan Info */}
                  {selectedPlan.notes && (
                    <View style={styles.notesSection}>
                      <View style={styles.notesHeader}>
                        <Ionicons name="document-text-outline" size={Math.min(hp(2.4), wp(5.2))} color={colors.primary} />
                        <Text style={styles.sectionTitle}>Doctor's Notes</Text>
                      </View>
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
                          <AnimatedPressable
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
                          </AnimatedPressable>
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
                          <AnimatedPressable
                            key={option.value}
                            style={[
                              styles.dietFilterButton,
                              isActive && {
                                backgroundColor: colors.primary,
                                borderColor: colors.primary,
                              },
                            ]}
                            onPress={() => handleDietPreferenceChange(option.value)}
                            activeScale={0.96}
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
                          </AnimatedPressable>
                        );
                      })}
                    </View>
                  </View>

                  {/* Daily Summary */}
                  <View style={styles.dailySummary}>
                    <Text style={styles.sectionTitle}>
                      {selectedDay.charAt(0).toUpperCase() + selectedDay.slice(1)} Summary
                    </Text>
                    <View style={styles.summaryVisualRow}>
                      <ProgressRing
                        progress={getTotalCaloriesForDay(selectedPlan, selectedDay) / Math.max(1, selectedPlan.customDailyCalories)}
                        size={Math.min(hp(12), wp(26))}
                        strokeWidth={Math.min(hp(1), wp(2.2))}
                        color={colors.primary}
                        trackColor={colors.border}
                        icon="flame-outline"
                        value={`${getTotalCaloriesForDay(selectedPlan, selectedDay)}`}
                        label="kcal"
                        textColor={colors.textPrimary}
                        mutedTextColor={colors.textSecondary}
                      />
                      <View style={styles.macroPanel}>
                        {(() => {
                          const macros = getMacroCaloriesForDay(selectedPlan, selectedDay);
                          return [
                            renderMacroBar('Protein', macros.protein.grams, macros.protein.percentage, '#10B981'),
                            renderMacroBar('Carbs', macros.carbs.grams, macros.carbs.percentage, '#3B82F6'),
                            renderMacroBar('Fats', macros.fats.grams, macros.fats.percentage, '#F59E0B'),
                          ];
                        })()}
                      </View>
                    </View>
                    <View style={styles.calorieGoalRow}>
                      <Text style={styles.summaryLabel}>Daily target</Text>
                      <Text style={styles.summaryValue}>{selectedPlan.customDailyCalories} kcal</Text>
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
                        <SmartEmptyState
                          icon="restaurant-outline"
                          title="No Meals Planned"
                          message={dietPreference === 'all'
                            ? 'No meals are planned for this day yet.'
                            : `No ${getDietPreferenceLabel(dietPreference).toLowerCase()} meals are planned for this day.`}
                          colors={colors}
                          compact
                          style={styles.emptyDaySmart}
                        />
                      )
                    ) : (
                      <SmartEmptyState
                        icon="restaurant-outline"
                        title="No Meals Planned"
                        message="No meals are planned for this day yet."
                        colors={colors}
                        compact
                        style={styles.emptyDaySmart}
                      />
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

const getStyles = (colors: any, bottomInset: number, isDarkMode: boolean) => StyleSheet.create({
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
  emptySmartState: {
    marginTop: hp(8),
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
    backgroundColor: colors.offWhite,
    padding: wp(4),
    borderRadius: wp(3),
    marginRight: wp(3),
    minWidth: wp(50),
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  planCardActive: {
    borderColor: colors.primary,
    borderWidth: 2,
    backgroundColor: isDarkMode ? colors.primarySoft : colors.primary + '10',
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
    backgroundColor: isDarkMode ? colors.primarySoft : colors.primary + '10',
    padding: wp(4),
    borderRadius: wp(3),
    marginBottom: hp(3),
    borderWidth: 1,
    borderColor: colors.primary + '30',
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  notesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2),
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
    backgroundColor: colors.offWhite,
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
    backgroundColor: colors.offWhite,
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
    backgroundColor: colors.offWhite,
    padding: wp(4),
    borderRadius: wp(3),
    marginBottom: hp(3),
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryVisualRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(4),
  },
  macroPanel: {
    flex: 1,
    gap: hp(1.15),
  },
  macroRow: {
    gap: hp(0.5),
  },
  macroLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  macroLabel: {
    fontSize: Math.min(hp(1.45), wp(3.3)),
    fontWeight: '800',
    color: colors.textPrimary,
  },
  macroValue: {
    fontSize: Math.min(hp(1.4), wp(3.1)),
    fontWeight: '700',
    color: colors.textSecondary,
  },
  macroTrack: {
    height: hp(0.8),
    borderRadius: hp(0.4),
    overflow: 'hidden',
    backgroundColor: colors.border,
  },
  macroFill: {
    height: '100%',
    borderRadius: hp(0.4),
  },
  calorieGoalRow: {
    marginTop: hp(1.6),
    paddingTop: hp(1.3),
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
    backgroundColor: colors.offWhite,
    borderRadius: wp(3),
    padding: wp(4),
    marginBottom: hp(2),
    borderWidth: 1,
    borderColor: colors.cardBorder,
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
  emptyDaySmart: {
    marginTop: hp(0.5),
  },
  emptyDayText: {
    fontSize: hp(1.8),
    color: colors.textTertiary,
    fontStyle: 'italic',
  },
});

export default PatientDietPlanViewer;

