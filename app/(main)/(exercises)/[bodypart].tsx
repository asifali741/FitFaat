import { View, Text, TouchableOpacity, FlatList, ActivityIndicator, StyleSheet, TextInput } from "react-native";
import React, { useEffect, useState, useMemo } from "react";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from "react-native-responsive-screen";
import { useNavigation } from "@react-navigation/native";
import { DrawerActions } from "@react-navigation/native";
import { useTheme } from "@/contexts/ThemeContext";
import { fetchExercisesByBodyPart } from "../../../api/exerciseDB";
import { dummyData } from "../../../constants/list";
import { Image } from "expo-image";

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

export default function ExercisesScreen() {
  const { colors } = useTheme();
  const [exercises, setExercises] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const router = useRouter();
  const navigation = useNavigation();
  const { bodypart, name } = useLocalSearchParams();

  // Filter exercises based on search query
  const filteredExercises = useMemo(() => {
    if (!searchQuery.trim()) {
      return exercises;
    }
    
    const query = searchQuery.toLowerCase().trim();
    return exercises.filter(exercise => 
      exercise.name.toLowerCase().includes(query) ||
      exercise.target.toLowerCase().includes(query) ||
      (exercise.equipment && exercise.equipment.toLowerCase().includes(query))
    );
  }, [exercises, searchQuery]);

  const handleBackPress = () => {
    // Navigate back to workout screen explicitly
    router.push('/(main)/(exercises)/workout');
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
    console.log("Navigating to exercise details:", exercise.name);
    router.push({
      pathname: "/(main)/(exercises)/exercise-details",
      params: { exercise: JSON.stringify(exercise) }
    });
  };

  const ExerciseCard = ({ item, index }: { item: any, index: number }) => {
    const isLeftColumn = index % 2 === 0;
    
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
            shadowColor: '#000',
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

  const openDrawer = () => {
    navigation.dispatch(DrawerActions.openDrawer());
  };

  const styles = getStyles(colors);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={handleBackPress}
          >
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
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
              Loading exercises...
            </Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={handleBackPress}
        >
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        {/* Dynamic title based on selected body part */}
        <Text style={styles.headerTitle}>{(bodypart || name) as string} Exercises</Text>
        <View style={styles.spacer} />
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
    </SafeAreaView>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.cardBackground,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Math.min(wp(5), 20),
    paddingVertical: Math.min(hp(2), 16),
    backgroundColor: colors.cardBackground, // Green header background
    minHeight: hp(8),
    shadowColor: '#000',
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
    fontSize: Math.min(hp(2.8), wp(6.5)),
    fontWeight: "bold",
    color: colors.textPrimary,
    textAlign: "center",
    flex: 1,
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  content: {
    flex: 1,
    backgroundColor: colors.screenColor,
    borderTopLeftRadius: wp(8),
    borderTopRightRadius: wp(8),
    paddingTop: hp(2),
  },
  spacer: {
    width: wp(10),
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: hp(2.5),
    paddingHorizontal: wp(4),
    paddingVertical: hp(1),
    shadowColor: '#000',
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
