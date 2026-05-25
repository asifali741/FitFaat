import { View, Text, TouchableOpacity, FlatList, ActivityIndicator, StyleSheet, TextInput, StatusBar, Modal, ScrollView } from "react-native";
import React, { useEffect, useState, useMemo } from "react";
import { useRouter, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from "react-native-responsive-screen";
import { useTheme } from "@/contexts/ThemeContext";
import { useRequirePremiumWorkoutAccess } from "@/hooks/useRequirePremiumWorkoutAccess";
import { fetchExercisesByBodyPart } from "../../../api/exerciseDB";
import { dummyData } from "../../../constants/list";
import { Image } from "expo-image";
import FilterChips from "@/components/common/FilterChips";

const bodyPartMap = {
  "Biceps": "upper arms",
  "Tricep": "upper arms",
  "Chest": "chest",
  "Back": "back",
  "Waist": "waist",
  "Upper Arms": "upper arms",
  "Upper Legs": "upper legs",
  "Shoulder": "shoulders",
  "Neck": "neck",
  "Lower Legs": "lower legs",
  "Lower Arms": "lower arms",
  "Cardio": "cardio",
  "Legs": "upper legs",
  "Shoulders": "shoulders",
  "Core": "waist",
  "Full Body": "cardio", // fallback
};

const getExerciseKey = (exercise: any) =>
  String(exercise?.id || exercise?.name || `${exercise?.target || ''}-${exercise?.equipment || ''}`);

const inferExerciseDifficulty = (exercise: any) => {
  const equipment = String(exercise?.equipment || '').toLowerCase();
  const secondaryCount = Array.isArray(exercise?.secondaryMuscles) ? exercise.secondaryMuscles.length : 0;
  const instructionCount = Array.isArray(exercise?.instructions) ? exercise.instructions.length : 0;

  if (equipment.includes('barbell') || equipment.includes('sled') || secondaryCount >= 3 || instructionCount >= 8) {
    return 'Advanced';
  }

  if (equipment.includes('dumbbell') || equipment.includes('cable') || equipment.includes('kettlebell') || secondaryCount >= 2) {
    return 'Intermediate';
  }

  return 'Beginner';
};

const getSecondaryMuscleLabel = (exercise: any) => {
  const muscles = Array.isArray(exercise?.secondaryMuscles) ? exercise.secondaryMuscles : [];
  return muscles.length ? muscles.slice(0, 3).join(', ') : 'Not listed';
};

export default function ExercisesScreen() {
  const { colors, isDarkMode } = useTheme();
  const [exercises, setExercises] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [equipmentFilter, setEquipmentFilter] = useState('all');
  const [compareMode, setCompareMode] = useState(false);
  const [compareSelection, setCompareSelection] = useState<any[]>([]);
  const [showCompareModal, setShowCompareModal] = useState(false);
  const router = useRouter();
  const { bodypart, name } = useLocalSearchParams();
  const checkingPremiumAccess = useRequirePremiumWorkoutAccess();

  // Filter exercises based on search query
  const filteredExercises = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    return exercises.filter(exercise => {
      const matchesSearch =
        !query ||
        exercise.name.toLowerCase().includes(query) ||
        exercise.target.toLowerCase().includes(query) ||
        (exercise.equipment && exercise.equipment.toLowerCase().includes(query));
      const matchesEquipment =
        equipmentFilter === 'all' ||
        String(exercise.equipment || '').toLowerCase() === equipmentFilter;

      return matchesSearch && matchesEquipment;
    });
  }, [equipmentFilter, exercises, searchQuery]);

  const equipmentOptions = useMemo(() => {
    const counts = new Map<string, number>();
    exercises.forEach((exercise) => {
      const key = String(exercise.equipment || 'other').toLowerCase();
      counts.set(key, (counts.get(key) || 0) + 1);
    });

    return [
      { label: 'All', value: 'all', icon: 'grid-outline' as const, badge: exercises.length },
      ...Array.from(counts.entries()).slice(0, 8).map(([value, count]) => ({
        label: value.charAt(0).toUpperCase() + value.slice(1),
        value,
        icon: 'options-outline' as const,
        badge: count,
      })),
    ];
  }, [exercises]);

  const compareSelectionIds = useMemo(
    () => new Set(compareSelection.map(getExerciseKey)),
    [compareSelection]
  );

  const handleBackPress = () => {
    try {
      router.replace('/(main)/(exercises)/workout');
    } catch {
      router.push('/(main)/(exercises)/workout');
    }
  };

  useEffect(() => {
    if (bodypart || name) {
      getExercises(bodypart as string || name as string);
    }
  }, [bodypart, name]);

  const getExercises = async (bodyPartName: string) => {
    setLoading(true);
    console.log("Fetching exercises for:", bodyPartName);
    
    const apiBodyPart = (bodyPartMap as any)[bodyPartName];
    if (!apiBodyPart) {
      console.log("Invalid body part:", bodyPartName);
      setExercises(dummyData); // Use dummy data as fallback
      setLoading(false);
      return;
    }

    try {
      let data = await fetchExercisesByBodyPart(apiBodyPart);
      if (data && data.length > 0) {
        setExercises(data);
      } else {
        // Use dummy data if API fails
        console.log("Using dummy data as fallback");
        setExercises(dummyData);
      }
    } catch (error) {
      console.log("Error fetching exercises:", error);
      setExercises(dummyData); // Use dummy data as fallback
    }
    setLoading(false);
  };

  const handleExercisePress = (exercise: any) => {
    if (compareMode) {
      toggleCompareExercise(exercise);
      return;
    }

    console.log("Navigating to exercise details:", exercise.name);
    router.push({
      pathname: "/(main)/(exercises)/exercise-details",
      params: {
        exercise: JSON.stringify(exercise),
        originBodyPart: ((bodypart || name) as string) || '',
      }
    });
  };

  const toggleCompareMode = () => {
    setCompareMode((current) => {
      const next = !current;
      if (!next) {
        setCompareSelection([]);
        setShowCompareModal(false);
      }
      return next;
    });
  };

  function toggleCompareExercise(exercise: any) {
    setCompareSelection((current) => {
      const exerciseKey = getExerciseKey(exercise);
      const alreadySelected = current.some((item) => getExerciseKey(item) === exerciseKey);
      const nextSelection = alreadySelected
        ? current.filter((item) => getExerciseKey(item) !== exerciseKey)
        : [...current, exercise].slice(-2);

      if (nextSelection.length === 2) {
        setTimeout(() => setShowCompareModal(true), 0);
      }

      return nextSelection;
    });
  }

  const clearCompareSelection = () => {
    setCompareSelection([]);
    setShowCompareModal(false);
  };

  const ExerciseCard = ({ item, index }: { item: any, index: number }) => {
    const isLeftColumn = index % 2 === 0;
    const isSelectedForCompare = compareSelectionIds.has(getExerciseKey(item));
    
    return (
      <View
        style={{
          marginLeft: isLeftColumn ? wp(4) : wp(2),
          marginRight: isLeftColumn ? wp(2) : wp(4),
          marginBottom: hp(2),
        }}
      >
        <TouchableOpacity
          onPress={() => handleExercisePress(item)}
          style={{
            backgroundColor: colors.cardBackground,
            borderRadius: hp(2),
            borderWidth: isSelectedForCompare ? 2 : 1,
            borderColor: isSelectedForCompare ? colors.primary : colors.cardBorder,
            shadowColor: colors.shadowLight,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 3,
            overflow: 'hidden',
          }}
        >
          <Image
            source={{ uri: item.gifUrl }}
            contentFit="cover"
            style={{
              width: wp(44),
              height: wp(44),
            }}
          />
          {compareMode && (
            <View
              style={[
                styles.compareSelectBadge,
                {
                  backgroundColor: isSelectedForCompare ? colors.primary : colors.cardBackground,
                  borderColor: isSelectedForCompare ? colors.primary : colors.cardBorder,
                },
              ]}
            >
              <Ionicons
                name={isSelectedForCompare ? 'checkmark' : 'add'}
                size={Math.min(hp(2), wp(4.4))}
                color={isSelectedForCompare ? colors.textOnPrimary : colors.primary}
              />
            </View>
          )}
          <View style={{ padding: hp(1) }}>
            <Text
              style={{
                textAlign: 'center',
                fontWeight: '600',
                fontSize: hp(1.8),
                color: colors.textPrimary,
              }}
            >
              {item?.name?.length > 20 ? item.name.slice(0,20) + '...' : item.name}
            </Text>
            <Text
              style={{
                textAlign: 'center',
                fontSize: hp(1.4),
                color: colors.textSecondary,
                marginTop: hp(0.5),
              }}
            >
              {item?.target}
            </Text>
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  const statusBarBackground = isDarkMode ? colors.screenColor : "#FFFFFF";
  const statusBarStyle = isDarkMode ? "light-content" : "dark-content";
  const styles = getStyles(colors);

  if (loading || checkingPremiumAccess) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
        <StatusBar barStyle={statusBarStyle} backgroundColor={statusBarBackground} translucent={false} />
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={handleBackPress}
          >
            <Ionicons name="arrow-back" size={24} color={colors.textOnPrimary} />
          </TouchableOpacity>
          {/* Dynamic title based on selected body part */}
          <Text style={styles.headerTitle}>{(bodypart || name) as string} Exercises</Text>
          <View style={styles.spacer} />
        </View>

        {/* Loading Content */}
        <View style={styles.content}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>
              {checkingPremiumAccess ? 'Checking access...' : 'Loading exercises...'}
            </Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
        <StatusBar barStyle={statusBarStyle} backgroundColor={statusBarBackground} translucent={false} />
        {/* Header */}
        <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={handleBackPress}
        >
          <Ionicons name="arrow-back" size={24} color={colors.textOnPrimary} />
        </TouchableOpacity>
        {/* Dynamic title based on selected body part */}
        <Text style={styles.headerTitle}>{(bodypart || name) as string} Exercises</Text>
        <TouchableOpacity
          style={[styles.headerCompareButton, compareMode && styles.headerCompareButtonActive]}
          onPress={toggleCompareMode}
          accessibilityRole="button"
          accessibilityLabel={compareMode ? 'Exit compare mode' : 'Compare exercises'}
        >
          <Ionicons
            name="git-compare-outline"
            size={Math.min(hp(2.7), wp(6))}
            color={compareMode ? colors.primary : colors.textOnPrimary}
          />
        </TouchableOpacity>
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        {/* Search Bar */}
        <View style={{ paddingHorizontal: wp(4), marginTop: hp(2), marginBottom: hp(2) }}>
          <View style={[styles.searchContainer, { backgroundColor: colors.cardBackground }]}>
            <Ionicons name="search" size={20} color={colors.textSecondary} style={{ marginRight: wp(2) }} />
            <TextInput
              style={[styles.searchInput, { color: colors.textPrimary }]}
              placeholder="Search exercises..."
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

        <FilterChips
          options={equipmentOptions}
          selectedValue={equipmentFilter}
          onChange={setEquipmentFilter}
          colors={colors}
          style={{ paddingBottom: hp(1.2) }}
        />

        {compareMode && (
          <View style={styles.compareToolbar}>
            <View style={styles.compareToolbarCopy}>
              <Text style={styles.compareToolbarTitle}>Compare Exercises</Text>
              <Text style={styles.compareToolbarSubtitle}>
                Select 2 exercises ({compareSelection.length}/2)
              </Text>
            </View>
            <TouchableOpacity
              style={styles.compareClearButton}
              onPress={clearCompareSelection}
              disabled={compareSelection.length === 0}
            >
              <Text style={styles.compareClearText}>Clear</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.compareOpenButton,
                compareSelection.length < 2 && { opacity: 0.45 },
              ]}
              onPress={() => setShowCompareModal(true)}
              disabled={compareSelection.length < 2}
            >
              <Text style={styles.compareOpenText}>View</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Exercise Count */}
        <Text style={styles.exerciseCount}>
          {filteredExercises.length} {filteredExercises.length === 1 ? 'exercise' : 'exercises'} found
        </Text>

        {/* Exercises List */}
        {filteredExercises.length === 0 ? (
          <View style={styles.noResultsContainer}>
            <Ionicons name="search" size={48} color={colors.textSecondary} style={{ marginBottom: hp(2) }} />
            <Text style={styles.noResultsText}>
              No exercises found
            </Text>
            <Text style={styles.noResultsSubtext}>
              Try searching with different keywords
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredExercises}
            numColumns={2}
            keyExtractor={(item) => item.id || item.name}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              paddingBottom: hp(3),
            }}
            renderItem={({ item, index }) => (
              <ExerciseCard item={item} index={index} />
            )}
          />
        )}
      </View>

      <Modal
        visible={showCompareModal && compareSelection.length === 2}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCompareModal(false)}
      >
        <View style={styles.compareModalOverlay}>
          <View style={styles.compareModalSheet}>
            <View style={styles.compareModalHeader}>
              <View>
                <Text style={styles.compareModalTitle}>Exercise Compare</Text>
                <Text style={styles.compareModalSubtitle}>Target, equipment, and difficulty side by side</Text>
              </View>
              <TouchableOpacity style={styles.compareModalClose} onPress={() => setShowCompareModal(false)}>
                <Ionicons name="close" size={Math.min(hp(2.8), wp(6))} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.compareModalContent}>
              <View style={styles.compareColumns}>
                {compareSelection.map((exercise) => (
                  <View key={getExerciseKey(exercise)} style={styles.compareColumn}>
                    <Image source={{ uri: exercise.gifUrl }} contentFit="cover" style={styles.compareImage} />
                    <Text style={styles.compareName} numberOfLines={3}>{exercise.name}</Text>

                    {[
                      { label: 'Target muscle', value: exercise.target || 'Not listed', icon: 'body-outline' },
                      { label: 'Equipment', value: exercise.equipment || 'Body weight', icon: 'barbell-outline' },
                      { label: 'Difficulty', value: inferExerciseDifficulty(exercise), icon: 'speedometer-outline' },
                      { label: 'Body part', value: exercise.bodyPart || ((bodypart || name) as string) || 'Workout', icon: 'fitness-outline' },
                      { label: 'Secondary', value: getSecondaryMuscleLabel(exercise), icon: 'git-branch-outline' },
                    ].map((item) => (
                      <View key={item.label} style={styles.compareMetric}>
                        <Ionicons name={item.icon as any} size={Math.min(hp(1.8), wp(4))} color={colors.primary} />
                        <View style={styles.compareMetricCopy}>
                          <Text style={styles.compareMetricLabel}>{item.label}</Text>
                          <Text style={styles.compareMetricValue} numberOfLines={2}>{item.value}</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                ))}
              </View>

              <View style={styles.compareTipBox}>
                <Ionicons name="bulb-outline" size={Math.min(hp(2.2), wp(5))} color={colors.warning || '#F59E0B'} />
                <Text style={styles.compareTipText}>
                  Pick the exercise with the right equipment first, then use target muscle and difficulty to match today's energy.
                </Text>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.screenColor,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Math.min(wp(5), 20),
    paddingVertical: Math.min(hp(2), 16),
    backgroundColor: colors.primary,
    minHeight: hp(8),
    shadowColor: colors.shadowLight,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  backButton: {
    padding: Math.min(wp(2), 10),
    minWidth: wp(10),
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: Math.min(hp(3.1), wp(7.2)),
    fontWeight: "800",
    color: colors.textOnPrimary,
    textAlign: "center",
    flex: 1,
    includeFontPadding: false,
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  content: {
    flex: 1,
    backgroundColor: colors.screenColor,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    paddingTop: hp(2),
  },
  spacer: {
    width: wp(10),
  },
  headerCompareButton: {
    width: wp(10),
    height: wp(10),
    maxWidth: 44,
    maxHeight: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCompareButtonActive: {
    backgroundColor: colors.cardBackground,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: hp(2),
    fontSize: Math.min(hp(2), wp(5)),
    color: colors.textSecondary,
  },
  exerciseCount: {
    fontSize: Math.min(hp(2), wp(5)),
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: hp(2),
    marginTop: hp(1),
  },
  compareToolbar: {
    marginHorizontal: wp(4),
    marginBottom: hp(1.5),
    borderRadius: hp(1.7),
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.cardBackground,
    padding: wp(3),
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2),
  },
  compareToolbarCopy: {
    flex: 1,
    minWidth: 0,
  },
  compareToolbarTitle: {
    color: colors.textPrimary,
    fontSize: Math.min(hp(1.65), wp(3.8)),
    fontWeight: '900',
  },
  compareToolbarSubtitle: {
    marginTop: hp(0.2),
    color: colors.textSecondary,
    fontSize: Math.min(hp(1.18), wp(2.75)),
    fontWeight: '700',
  },
  compareClearButton: {
    minHeight: hp(3.8),
    borderRadius: hp(1.4),
    paddingHorizontal: wp(2.8),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.screenColor,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  compareClearText: {
    color: colors.textSecondary,
    fontSize: Math.min(hp(1.22), wp(2.9)),
    fontWeight: '900',
  },
  compareOpenButton: {
    minHeight: hp(3.8),
    borderRadius: hp(1.4),
    paddingHorizontal: wp(3),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  compareOpenText: {
    color: colors.textOnPrimary,
    fontSize: Math.min(hp(1.22), wp(2.9)),
    fontWeight: '900',
  },
  compareSelectBadge: {
    position: 'absolute',
    top: hp(1),
    right: wp(2),
    width: Math.min(hp(3.5), wp(7.6)),
    height: Math.min(hp(3.5), wp(7.6)),
    borderRadius: Math.min(hp(1.75), wp(3.8)),
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  compareModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'flex-end',
  },
  compareModalSheet: {
    maxHeight: '88%',
    backgroundColor: colors.screenColor,
    borderTopLeftRadius: hp(2.4),
    borderTopRightRadius: hp(2.4),
    paddingHorizontal: wp(4),
    paddingTop: hp(2),
    paddingBottom: hp(2.5),
  },
  compareModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: wp(3),
    marginBottom: hp(1.5),
  },
  compareModalTitle: {
    color: colors.textPrimary,
    fontSize: Math.min(hp(2.35), wp(5.2)),
    fontWeight: '900',
  },
  compareModalSubtitle: {
    marginTop: hp(0.25),
    color: colors.textSecondary,
    fontSize: Math.min(hp(1.3), wp(3)),
    fontWeight: '700',
  },
  compareModalClose: {
    width: hp(4.8),
    height: hp(4.8),
    borderRadius: hp(2.4),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  compareModalContent: {
    paddingBottom: hp(3),
  },
  compareColumns: {
    flexDirection: 'row',
    gap: wp(2.5),
  },
  compareColumn: {
    flex: 1,
    minWidth: 0,
    borderRadius: hp(1.8),
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.cardBackground,
    padding: wp(2.5),
  },
  compareImage: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: hp(1.3),
    backgroundColor: colors.screenColor,
  },
  compareName: {
    color: colors.textPrimary,
    fontSize: Math.min(hp(1.55), wp(3.55)),
    fontWeight: '900',
    lineHeight: hp(2.05),
    marginTop: hp(1),
    minHeight: hp(6),
  },
  compareMetric: {
    minHeight: hp(5.6),
    borderRadius: hp(1.2),
    backgroundColor: colors.screenColor,
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(1.5),
    paddingHorizontal: wp(2),
    paddingVertical: hp(0.7),
    marginTop: hp(0.8),
  },
  compareMetricCopy: {
    flex: 1,
    minWidth: 0,
  },
  compareMetricLabel: {
    color: colors.textSecondary,
    fontSize: Math.min(hp(1.05), wp(2.45)),
    fontWeight: '800',
  },
  compareMetricValue: {
    marginTop: hp(0.15),
    color: colors.textPrimary,
    fontSize: Math.min(hp(1.2), wp(2.8)),
    fontWeight: '900',
    lineHeight: hp(1.65),
  },
  compareTipBox: {
    marginTop: hp(1.6),
    borderRadius: hp(1.5),
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: wp(3),
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2),
  },
  compareTipText: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: Math.min(hp(1.25), wp(2.9)),
    fontWeight: '700',
    lineHeight: hp(1.85),
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: hp(2.5),
    paddingHorizontal: wp(4),
    paddingVertical: hp(1),
    borderWidth: 1,
    borderColor: colors.cardBorder,
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
