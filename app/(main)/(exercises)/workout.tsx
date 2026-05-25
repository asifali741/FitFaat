import { ScreenSceneWrapper } from "@/components/common/ScreenTiltAnimation";
import { useTheme } from "@/contexts/ThemeContext";
import { getIsPremiumUser } from "@/utils/premiumAccess";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DrawerActions, useNavigation } from '@react-navigation/native';
import { useFocusEffect, useRouter } from "expo-router";
import React, { useState, useMemo } from "react";
import { Modal, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from "react-native-responsive-screen";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { MainImages } from "../../../constants/list";
import { LOCAL_WORKOUT_HISTORY_KEY } from '@/constants/achievementBadges';

type WorkoutHistoryEntry = {
  exerciseName?: string;
  bodyPart?: string;
  target?: string;
  equipment?: string;
  completedAt?: string;
  durationSeconds?: number;
};

const recoveryGroups = [
  { id: 'shoulders', label: 'Shoulders', match: ['shoulder', 'deltoid'] },
  { id: 'chest', label: 'Chest', match: ['chest', 'pectoral'] },
  { id: 'back', label: 'Back', match: ['back', 'lat', 'trap'] },
  { id: 'arms', label: 'Arms', match: ['arm', 'bicep', 'tricep', 'forearm'] },
  { id: 'core', label: 'Core', match: ['waist', 'abs', 'core'] },
  { id: 'legs', label: 'Legs', match: ['leg', 'quad', 'hamstring', 'calf', 'glute'] },
  { id: 'cardio', label: 'Cardio', match: ['cardio'] },
];

const programFocusCycle = ['Chest', 'Back', 'Upper Arms', 'Waist', 'Upper Legs', 'Shoulder', 'Cardio'];
const dayLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

const getDateKey = (date: Date) => date.toISOString().slice(0, 10);

const getStartOfWeek = (date: Date) => {
  const start = new Date(date);
  const day = start.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + diff);
  start.setHours(0, 0, 0, 0);
  return start;
};

const getDaysSince = (dateString?: string) => {
  if (!dateString) return null;
  const completed = new Date(dateString);
  if (Number.isNaN(completed.getTime())) return null;
  const today = new Date();
  const startToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const startCompleted = new Date(completed.getFullYear(), completed.getMonth(), completed.getDate()).getTime();
  return Math.max(0, Math.floor((startToday - startCompleted) / 86400000));
};

const getHistorySearchText = (entry: WorkoutHistoryEntry) => [
  entry.bodyPart,
  entry.target,
  entry.equipment,
  entry.exerciseName,
].filter(Boolean).join(' ').toLowerCase();

export default function WorkoutScreen() {
  const { colors, isDarkMode } = useTheme();
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [favoritesCount, setFavoritesCount] = useState(0);
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [workoutHistory, setWorkoutHistory] = useState<WorkoutHistoryEntry[]>([]);

  console.log('🎬 WorkoutScreen rendered. Loading:', loading, 'isPremium:', isPremium);

  // Update favorites count when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      getFavoritesCount();
      loadWorkoutHistory();
    }, [])
  );

  const refreshPremiumAccess = React.useCallback(async () => {
    setLoading(true);
    try {
      const premiumActive = await getIsPremiumUser();
      setIsPremium(premiumActive);
    } catch (error) {
      console.error('Premium access refresh failed:', (error as any)?.message || String(error));
      setIsPremium(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      refreshPremiumAccess();
    }, [refreshPremiumAccess])
  );

  const getFavoritesCount = async () => {
    try {
      const favorites = await AsyncStorage.getItem('favoriteExercises');
      if (favorites) {
        const favoritesList = JSON.parse(favorites);
        setFavoritesCount(favoritesList.length);
      } else {
        setFavoritesCount(0);
      }
    } catch (error) {
      console.error('Error getting favorites count:', error);
      setFavoritesCount(0);
    }
  };

  const loadWorkoutHistory = async () => {
    try {
      const storedHistory = await AsyncStorage.getItem(LOCAL_WORKOUT_HISTORY_KEY);
      const parsedHistory = storedHistory ? JSON.parse(storedHistory) : [];
      setWorkoutHistory(Array.isArray(parsedHistory) ? parsedHistory : []);
    } catch (error) {
      console.error('Error loading workout history:', error);
      setWorkoutHistory([]);
    }
  };

  // Filter body parts based on search query
  const filteredBodyParts = useMemo(() => {
    if (!searchQuery.trim()) {
      return MainImages;
    }
    
    const query = searchQuery.toLowerCase().trim();
    return MainImages.filter(item => 
      item.name.toLowerCase().includes(query) ||
      (item.description && item.description.toLowerCase().includes(query))
    );
  }, [searchQuery]);

  const recoveryItems = useMemo(() => {
    const sortedHistory = [...workoutHistory].sort((a, b) => (
      new Date(b.completedAt || 0).getTime() - new Date(a.completedAt || 0).getTime()
    ));

    return recoveryGroups.map((group) => {
      const latest = sortedHistory.find((entry) => {
        const searchText = getHistorySearchText(entry);
        return group.match.some((keyword) => searchText.includes(keyword));
      });
      const daysSince = getDaysSince(latest?.completedAt);
      const status = daysSince === null || daysSince >= 3
        ? 'fresh'
        : daysSince === 0
          ? 'tired'
          : 'recovering';
      const detail = daysSince === null
        ? 'Ready'
        : daysSince === 0
          ? 'Trained today'
          : `${daysSince} day${daysSince > 1 ? 's' : ''} ago`;

      return {
        ...group,
        latest,
        status,
        detail,
      };
    });
  }, [workoutHistory]);

  const programWeeks = useMemo(() => {
    const today = new Date();
    const todayKey = getDateKey(today);
    const startDate = getStartOfWeek(today);
    const completedDateKeys = new Set(
      workoutHistory
        .map((entry) => entry.completedAt ? getDateKey(new Date(entry.completedAt)) : '')
        .filter(Boolean)
    );

    return Array.from({ length: 4 }, (_, weekIndex) => {
      const days = Array.from({ length: 7 }, (_, dayIndex) => {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + weekIndex * 7 + dayIndex);
        const dateKey = getDateKey(date);
        const isRestDay = dayIndex === 2 || dayIndex === 6;
        const focus = isRestDay
          ? 'Rest'
          : programFocusCycle[(weekIndex * 5 + dayIndex) % programFocusCycle.length];

        return {
          date,
          dateKey,
          focus,
          isToday: dateKey === todayKey,
          isRestDay,
          isCompleted: completedDateKeys.has(dateKey),
          isPast: date < today && dateKey !== todayKey,
        };
      });

      return {
        label: `Week ${weekIndex + 1}`,
        days,
      };
    });
  }, [workoutHistory]);

  const handleFavoritesPress = () => {
    console.log('Opening favorites list');
    router.push('/(main)/(exercises)/favorites');
  };

  const openDrawer = () => {
    navigation.dispatch(DrawerActions.openDrawer());
  };

  const handleBodyPartPress = (item: any) => {
    console.log("Navigating to exercises for:", item.name);
    router.push({
      pathname: "/(main)/(exercises)/[bodypart]",
      params: { bodypart: item.name, name: item.name }
    });
  };

  const getRecoveryColor = (status: string) => {
    if (status === 'tired') return colors.error;
    if (status === 'recovering') return colors.warning;
    return colors.success;
  };

  const getRecoveryLabel = (status: string) => {
    if (status === 'tired') return 'Tired';
    if (status === 'recovering') return 'Recovering';
    return 'Fresh';
  };

  const statusBarBackground = isDarkMode ? colors.screenColor : "#FFFFFF";
  const statusBarStyle = isDarkMode ? "light-content" : "dark-content";
  const styles = getStyles(colors, insets.top, statusBarBackground);

  // Show loading or block non-premium access
  console.log('🔄 Render check - loading:', loading, 'isPremium:', isPremium);
  
  if (loading) {
    console.log('⏳ Still loading, returning null');
    return null;
  }

  // Show premium modal only for non-premium users
  console.log('🎯 Checking premium modal condition');

  if (!isPremium) {
    console.log('🚫 Showing premium modal (User is not premium)');
    return (
      <View style={{ flex: 1 }}>
        <Modal
          visible={true}
          transparent={true}
          animationType="fade"
          onRequestClose={() => {
            console.log('Modal close button pressed');
            try { if ((navigation as any).canGoBack && (navigation as any).canGoBack()) { (navigation as any).goBack(); return; } } catch(e) {}
            router.back();
          }}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => {
                  try { if ((navigation as any).canGoBack && (navigation as any).canGoBack()) { (navigation as any).goBack(); return; } } catch(e) {}
                  router.back();
                }}
              >
                <Ionicons name="close-circle" size={30} color={colors.textSecondary} />
              </TouchableOpacity>

              <View style={styles.iconContainer}>
                <Ionicons name="star" size={60} color="#FFD700" />
              </View>

              <Text style={styles.modalTitle}>Premium Feature</Text>
              <Text style={styles.modalSubtitle}>Unlock Advanced Workouts</Text>

              <Text style={styles.modalDescription}>
                Get access to personalized workout plans, advanced tracking, and exclusive training programs designed by fitness experts.
              </Text>

              <View style={styles.featuresList}>
                <View style={styles.featureItem}>
                  <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                  <Text style={styles.featureText}>Personalized workout plans</Text>
                </View>
                <View style={styles.featureItem}>
                  <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                  <Text style={styles.featureText}>Advanced progress tracking</Text>
                </View>
                <View style={styles.featureItem}>
                  <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                  <Text style={styles.featureText}>Exclusive training programs</Text>
                </View>
              </View>

              <View style={styles.priceTag}>
                <Text style={styles.priceAmount}>$10</Text>
                <Text style={styles.priceFrequency}>/month</Text>
              </View>

              <TouchableOpacity
                style={styles.upgradButton}
                onPress={() => {
                  router.push("/(main)/(settings)/premium");
                }}
              >
                <Ionicons name="star" size={20} color={colors.buttonText} />
                <Text style={styles.upgradButtonText}>Upgrade to Premium</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.laterButton}
                onPress={() => {
                  try { if ((navigation as any).canGoBack && (navigation as any).canGoBack()) { (navigation as any).goBack(); return; } } catch(e) {}
                  router.back();
                }}
              >
                <Text style={styles.laterButtonText}>Maybe Later</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    );
  }
  
  return (
    <ScreenSceneWrapper>
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <StatusBar barStyle={statusBarStyle} backgroundColor={statusBarBackground} translucent={false} />
      <View style={styles.statusBarSpacer} />
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.menuButton}
          onPress={openDrawer}
          accessibilityRole="button"
          accessibilityLabel="Open menu"
        >
          <Ionicons name="menu" size={Math.min(hp(3.8), wp(8))} color={colors.textOnPrimary} />
        </TouchableOpacity>

        <Text
          style={styles.headerTitle}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.7}
        >
          Workout Plans
        </Text>

        <View style={styles.headerActions}>
        <TouchableOpacity 
          onPress={handleFavoritesPress}
          style={styles.favoritesButton}
        >
          <View style={styles.favoritesContainer}>
            <Text style={styles.heartIcon}>❤️</Text>
            {favoritesCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {favoritesCount > 99 ? '99+' : favoritesCount}
                </Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.premiumButton}>
          <Ionicons name="barbell-outline" size={Math.min(hp(2.4), wp(5.3))} color={colors.primary} />
        </TouchableOpacity>
        </View>
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          <View style={styles.recoverySection}>
            <View style={styles.sectionHeaderRow}>
              <View>
                <Text style={styles.sectionTitleSmall}>Muscle Recovery Map</Text>
                <Text style={styles.sectionSubtitle}>Plan around muscles you trained recently.</Text>
              </View>
              <View style={styles.recoveryBadge}>
                <Ionicons name="body-outline" size={Math.min(hp(2.2), wp(4.8))} color={colors.primary} />
                <Text style={styles.recoveryBadgeText}>{workoutHistory.length}</Text>
              </View>
            </View>

            <View style={styles.recoveryBodyCard}>
              <View style={styles.bodyFigure}>
                <View style={[styles.bodyHead, { backgroundColor: colors.primarySoft }]} />
                <View style={styles.bodyRow}>
                  {recoveryItems.slice(0, 3).map((item) => (
                    <View key={item.id} style={[styles.recoveryMusclePill, { backgroundColor: `${getRecoveryColor(item.status)}18`, borderColor: getRecoveryColor(item.status) }]}>
                      <Text style={[styles.recoveryMuscleName, { color: getRecoveryColor(item.status) }]}>{item.label}</Text>
                      <Text style={styles.recoveryMuscleStatus}>{getRecoveryLabel(item.status)}</Text>
                    </View>
                  ))}
                </View>
                <View style={styles.bodyRow}>
                  {recoveryItems.slice(3).map((item) => (
                    <View key={item.id} style={[styles.recoveryMusclePill, { backgroundColor: `${getRecoveryColor(item.status)}18`, borderColor: getRecoveryColor(item.status) }]}>
                      <Text style={[styles.recoveryMuscleName, { color: getRecoveryColor(item.status) }]}>{item.label}</Text>
                      <Text style={styles.recoveryMuscleStatus}>{item.detail}</Text>
                    </View>
                  ))}
                </View>
              </View>

              <View style={styles.recoveryLegend}>
                {[
                  { label: 'Fresh', color: colors.success },
                  { label: 'Recovering', color: colors.warning },
                  { label: 'Tired', color: colors.error },
                ].map((legend) => (
                  <View key={legend.label} style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: legend.color }]} />
                    <Text style={styles.legendText}>{legend.label}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>

          <View style={styles.programSection}>
            <View style={styles.sectionHeaderRow}>
              <View>
                <Text style={styles.sectionTitleSmall}>Workout Program Calendar</Text>
                <Text style={styles.sectionSubtitle}>A 4-week training view with rest and completion badges.</Text>
              </View>
              <Ionicons name="calendar-outline" size={Math.min(hp(2.8), wp(6.2))} color={colors.primary} />
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.programWeeksRow}>
              {programWeeks.map((week) => (
                <View key={week.label} style={styles.weekCard}>
                  <Text style={styles.weekTitle}>{week.label}</Text>
                  <View style={styles.weekDaysGrid}>
                    {week.days.map((day, index) => {
                      const dayColor = day.isRestDay
                        ? colors.textTertiary
                        : day.isCompleted
                          ? colors.success
                          : day.isToday
                            ? colors.primary
                            : colors.textSecondary;

                      return (
                        <TouchableOpacity
                          key={day.dateKey}
                          style={[
                            styles.programDayCell,
                            {
                              borderColor: day.isToday ? colors.primary : colors.cardBorder,
                              backgroundColor: day.isCompleted ? `${colors.success}18` : colors.cardBackground,
                            },
                          ]}
                          onPress={() => !day.isRestDay && handleBodyPartPress({ name: day.focus })}
                          disabled={day.isRestDay}
                        >
                          <Text style={styles.programDayLabel}>{dayLabels[index]}</Text>
                          <Text style={[styles.programDayNumber, { color: dayColor }]}>{day.date.getDate()}</Text>
                          <Ionicons
                            name={day.isCompleted ? 'checkmark-circle' : day.isRestDay ? 'moon-outline' : 'ellipse-outline'}
                            size={Math.min(hp(1.8), wp(4))}
                            color={dayColor}
                          />
                          <Text style={styles.programFocusText} numberOfLines={1}>
                            {day.focus}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>


          {/* Body Parts Grid */}
          <View style={styles.bodyPartsSection}>
            <Text style={styles.sectionTitle}>
              Choose Your Focus
            </Text>

            {/* Search Bar */}
            <View style={{ paddingHorizontal: wp(4), marginVertical: hp(2) }}>
              <View style={[styles.searchContainer, { backgroundColor: colors.cardBackground }]}>
                <Ionicons name="search" size={20} color={colors.textSecondary} style={{ marginRight: wp(2) }} />
                <TextInput
                  style={[styles.searchInput, { color: colors.textPrimary }]}
                  placeholder="Search body parts..."
                  placeholderTextColor={colors.textSecondary}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery('')}>
                    <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Body Parts Grid */}
            {filteredBodyParts.length === 0 ? (
              <View style={styles.noResultsContainer}>
                <Ionicons name="body" size={48} color={colors.textSecondary} style={{ marginBottom: hp(2) }} />
                <Text style={styles.noResultsText}>No body parts found</Text>
                <Text style={styles.noResultsSubtext}>Try different keywords</Text>
              </View>
            ) : (
              <View style={styles.bodyPartsGrid}>
                {filteredBodyParts.map((item, index) => (
                  <TouchableOpacity
                    key={index}
                    onPress={() => handleBodyPartPress(item)}
                    style={styles.bodyPartCard}
                  >
                    <Text style={styles.bodyPartEmoji}>
                      {item.emoji}
                    </Text>
                    <Text style={styles.bodyPartName}>
                      {item?.name}
                    </Text>
                    <Text style={styles.bodyPartDescription}>
                      {item?.description}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          <View style={styles.disclaimerSection}>
            <Text
              style={styles.disclaimerText}
              adjustsFontSizeToFit
              minimumFontScale={0.82}
            >
              Copyright disclaimer: Exercise names, images, and reference materials are used for educational fitness guidance only. All copyrights, trademarks, and media rights remain with their respective owners.
            </Text>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
    </ScreenSceneWrapper>
  );
}

const getStyles = (colors: any, topInset: number, statusBarBackground: string) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.screenColor,
  },
  statusBarSpacer: {
    height: topInset,
    backgroundColor: statusBarBackground,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: wp(3.5),
    paddingVertical: hp(1),
    backgroundColor: colors.primary,
    minHeight: hp(7.6),
    shadowColor: colors.shadowLight,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  menuButton: {
    width: Math.min(hp(5.4), wp(11.8)),
    height: Math.min(hp(5.4), wp(11.8)),
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  headerTitle: {
    fontSize: Math.min(hp(3.1), wp(7.2)),
    fontWeight: "800",
    color: colors.textOnPrimary,
    textAlign: "left",
    flex: 1,
    minWidth: 0,
    marginLeft: wp(2.4),
    marginRight: wp(2),
    letterSpacing: 0,
    includeFontPadding: false,
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: wp(1.6),
    flexShrink: 0,
  },
  favoritesButton: {
    position: 'relative',
    marginRight: 0,
  },
  favoritesContainer: {
    width: Math.min(hp(5.1), wp(11)),
    height: Math.min(hp(5.1), wp(11)),
    backgroundColor: colors.cardBackground,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: Math.min(hp(1.2), wp(2.6)),
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  heartIcon: {
    fontSize: Math.min(hp(2.3), wp(5)),
  },
  badge: {
    position: 'absolute',
    top: -hp(0.5),
    right: -wp(1),
    backgroundColor: colors.error,
    borderRadius: hp(1.2),
    minWidth: hp(2.4),
    height: hp(2.4),
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.cardBackground,
  },
  badgeText: {
    color: colors.buttonText,
    fontSize: hp(1.4),
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    backgroundColor: colors.screenColor,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
  },
  bodyPartsSection: {
    paddingHorizontal: wp(4),
    paddingTop: hp(1.2),
  },
  scrollContent: {
    paddingBottom: hp(2),
  },
  recoverySection: {
    paddingHorizontal: wp(4),
    paddingTop: hp(2),
  },
  programSection: {
    paddingHorizontal: wp(4),
    marginTop: hp(2.4),
    marginBottom: hp(1.6),
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: wp(3),
    marginBottom: hp(1.4),
  },
  sectionTitleSmall: {
    fontSize: Math.min(hp(2.15), wp(5)),
    fontWeight: '900',
    color: colors.textPrimary,
    marginBottom: hp(0.35),
  },
  sectionSubtitle: {
    fontSize: Math.min(hp(1.35), wp(3.2)),
    fontWeight: '600',
    color: colors.textSecondary,
    lineHeight: hp(1.95),
  },
  recoveryBadge: {
    minWidth: hp(5.2),
    height: hp(4),
    borderRadius: hp(2),
    backgroundColor: colors.primarySoft,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: wp(1),
    paddingHorizontal: wp(2),
  },
  recoveryBadgeText: {
    color: colors.primary,
    fontSize: Math.min(hp(1.45), wp(3.4)),
    fontWeight: '900',
  },
  recoveryBodyCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: hp(1.8),
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: hp(1.6),
    shadowColor: colors.shadowLight,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  bodyFigure: {
    alignItems: 'center',
    gap: hp(1.1),
  },
  bodyHead: {
    width: hp(4.4),
    height: hp(4.4),
    borderRadius: hp(2.2),
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  bodyRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: wp(2),
  },
  recoveryMusclePill: {
    width: '30%',
    minHeight: hp(6.2),
    borderRadius: hp(1.4),
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: wp(1.5),
  },
  recoveryMuscleName: {
    fontSize: Math.min(hp(1.35), wp(3.1)),
    fontWeight: '900',
    textAlign: 'center',
  },
  recoveryMuscleStatus: {
    marginTop: hp(0.25),
    fontSize: Math.min(hp(1.08), wp(2.55)),
    fontWeight: '700',
    color: colors.textSecondary,
    textAlign: 'center',
  },
  recoveryLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: wp(3),
    marginTop: hp(1.5),
    paddingTop: hp(1.2),
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(1),
  },
  legendDot: {
    width: hp(1),
    height: hp(1),
    borderRadius: hp(0.5),
  },
  legendText: {
    fontSize: Math.min(hp(1.2), wp(2.8)),
    fontWeight: '700',
    color: colors.textSecondary,
  },
  programWeeksRow: {
    gap: wp(3),
    paddingRight: wp(4),
  },
  weekCard: {
    width: wp(76),
    backgroundColor: colors.cardBackground,
    borderRadius: hp(1.8),
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: hp(1.4),
    shadowColor: colors.shadowLight,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  weekTitle: {
    color: colors.textPrimary,
    fontSize: Math.min(hp(1.7), wp(3.9)),
    fontWeight: '900',
    marginBottom: hp(1),
  },
  weekDaysGrid: {
    flexDirection: 'row',
    gap: wp(1.2),
  },
  programDayCell: {
    flex: 1,
    minHeight: hp(9),
    borderRadius: hp(1.2),
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: hp(0.75),
    paddingHorizontal: wp(0.6),
  },
  programDayLabel: {
    fontSize: Math.min(hp(1.05), wp(2.5)),
    fontWeight: '800',
    color: colors.textTertiary,
  },
  programDayNumber: {
    fontSize: Math.min(hp(1.55), wp(3.5)),
    fontWeight: '900',
    marginVertical: hp(0.3),
  },
  programFocusText: {
    marginTop: hp(0.35),
    fontSize: Math.min(hp(0.95), wp(2.35)),
    fontWeight: '800',
    color: colors.textSecondary,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: Math.min(hp(3.2), wp(8)),
    fontWeight: 'bold',
    marginBottom: hp(2),
    textAlign: 'center',
    color: colors.textPrimary,
    paddingHorizontal: wp(4),
  },
  bodyPartsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
  },
  bodyPartCard: {
    width: Math.min(wp(42), 160),
    height: Math.min(hp(18), 140),
    marginBottom: hp(2),
    borderRadius: hp(2.5),
    backgroundColor: colors.cardBackground,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Math.min(hp(2), 15),
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  bodyPartEmoji: {
    fontSize: Math.min(hp(6), wp(15)),
    marginBottom: hp(1),
  },
  bodyPartName: {
    color: colors.textPrimary,
    textAlign: 'center',
    fontSize: Math.min(hp(2.2), wp(5.5)),
    fontWeight: 'bold',
    marginBottom: hp(0.5),
  },
  bodyPartDescription: {
    color: colors.textSecondary,
    textAlign: 'center',
    fontSize: Math.min(hp(1.4), wp(3.5)),
  },
  disclaimerSection: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 620,
    paddingHorizontal: wp(6),
    marginTop: hp(3),
    marginBottom: hp(5),
  },
  disclaimerText: {
    fontSize: Math.min(hp(1.55), wp(3.45)),
    lineHeight: Math.min(hp(2.35), wp(5.25)),
    color: colors.textSecondary,
    textAlign: 'center',
    fontWeight: '500',
    letterSpacing: 0,
  },
  premiumButton: {
    backgroundColor: colors.cardBackground,
    width: Math.min(hp(5.1), wp(11)),
    height: Math.min(hp(5.1), wp(11)),
    borderRadius: Math.min(hp(1.2), wp(2.6)),
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  premiumText: {
    fontSize: Math.min(hp(2.3), wp(5)),
  },
  // Premium Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: wp(5),
  },
  modalContent: {
    backgroundColor: colors.cardBackground,
    borderRadius: hp(3),
    paddingHorizontal: wp(6),
    paddingVertical: hp(3),
    width: '100%',
    maxWidth: wp(90),
    alignItems: 'center',
    shadowColor: colors.shadowLight,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  closeButton: {
    position: 'absolute',
    top: hp(1.5),
    right: wp(3),
    zIndex: 10,
  },
  iconContainer: {
    marginTop: hp(1),
    marginBottom: hp(2),
  },
  modalTitle: {
    fontSize: hp(2.8),
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: hp(0.8),
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: hp(2),
    fontWeight: '600',
    color: colors.error,
    marginBottom: hp(1.5),
    textAlign: 'center',
  },
  modalDescription: {
    fontSize: hp(1.8),
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: hp(2.5),
    lineHeight: hp(2.8),
  },
  featuresList: {
    width: '100%',
    marginBottom: hp(2.5),
    paddingHorizontal: wp(2),
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: hp(1.2),
  },
  featureText: {
    fontSize: hp(1.7),
    color: colors.textPrimary,
    marginLeft: wp(2.5),
    fontWeight: '500',
  },
  priceTag: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'baseline',
    marginBottom: hp(2.5),
    paddingVertical: hp(1.5),
    paddingHorizontal: wp(5),
    backgroundColor: colors.primarySoft,
    borderRadius: hp(1.5),
    borderWidth: 1.5,
    borderColor: colors.success,
  },
  priceAmount: {
    fontSize: hp(3.5),
    fontWeight: '800',
    color: colors.success,
  },
  priceFrequency: {
    fontSize: hp(1.9),
    color: colors.textSecondary,
    marginLeft: wp(1),
    fontWeight: '600',
  },
  upgradButton: {
    width: '100%',
    flexDirection: 'row',
    backgroundColor: colors.success,
    paddingVertical: hp(2),
    borderRadius: hp(1.2),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: hp(1),
    shadowColor: colors.success,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  upgradButtonText: {
    fontSize: hp(2),
    fontWeight: '700',
    color: colors.buttonText,
    marginLeft: wp(2),
    letterSpacing: 0.5,
  },
  laterButton: {
    width: '100%',
    paddingVertical: hp(1.5),
    borderRadius: hp(1),
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.cardBorder,
    backgroundColor: colors.cardBackground,
  },
  laterButtonText: {
    fontSize: hp(1.9),
    fontWeight: '600',
    color: colors.textSecondary,
  },
  // Search Bar Styles
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: hp(2.5),
    paddingHorizontal: wp(4),
    paddingVertical: hp(1),
    shadowColor: colors.shadowLight,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchInput: {
    flex: 1,
    fontSize: Math.min(hp(1.8), wp(4.5)),
    marginLeft: wp(2),
    paddingVertical: hp(0.8),
  },
  noResultsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: hp(8),
    paddingHorizontal: wp(5),
  },
  noResultsText: {
    fontSize: Math.min(hp(2.2), wp(5.5)),
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: hp(1),
  },
  noResultsSubtext: {
    fontSize: Math.min(hp(1.6), wp(4)),
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
