import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from "expo-image";
import * as Haptics from 'expo-haptics';
import * as NavigationBar from "expo-navigation-bar";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ScrollView, Text, TouchableOpacity, View, StyleSheet, Alert, StatusBar, Platform, ActivityIndicator, Modal, Share } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from "react-native-responsive-screen";
import { useTheme } from "@/contexts/ThemeContext";
import { useRequirePremiumWorkoutAccess } from "@/hooks/useRequirePremiumWorkoutAccess";
import { recordCompletedWorkoutLocally } from "@/utils/achievementStorage";
import { loadAdaptiveGoalMetrics } from "@/utils/adaptiveGoals";
import {
  estimateExerciseCalories,
  recordExerciseProgressForActiveDashboardDay,
} from "@/utils/localExerciseProgress";
import { exerciseApi } from "@/utils/exerciseApi";
import { tokenStorage } from "@/utils/auth/tokenStorage";
import { getIsPremiumUser } from "@/utils/premiumAccess";
import ProgressRing from "@/components/common/ProgressRing";
import { fetchExercisesByBodyPart } from "@/api/exerciseDB";
import { dummyData } from "@/constants/list";
import { LOCAL_WORKOUT_HISTORY_KEY } from "@/constants/achievementBadges";

const exerciseBodyPartRouteMap: Record<string, string> = {
  chest: "Chest",
  back: "Back",
  waist: "Waist",
  "upper arms": "Upper Arms",
  "upper legs": "Upper Legs",
  shoulders: "Shoulder",
  neck: "Neck",
  "lower legs": "Lower Legs",
  "lower arms": "Lower Arms",
  cardio: "Cardio",
};

const firstParamValue = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

type CompletionSummary = {
  exerciseName: string;
  durationLabel: string;
  calories: number;
  fatBurnGrams?: number;
  intensity?: string;
  streak: number;
  completedAtLabel: string;
  dashboardCalories?: number;
  motivationalMessage?: string;
};

const getWorkoutDateKey = (date: Date) => date.toISOString().slice(0, 10);

const computeWorkoutStreak = (history: any[]) => {
  const workoutDates = new Set(
    history
      .map((entry) => entry?.completedAt ? getWorkoutDateKey(new Date(entry.completedAt)) : '')
      .filter(Boolean)
  );

  let streak = 0;
  const cursor = new Date();
  while (workoutDates.has(getWorkoutDateKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
};

const getExerciseSearchText = (exerciseItem: any) => [
  exerciseItem?.name,
  exerciseItem?.bodyPart,
  exerciseItem?.target,
  exerciseItem?.equipment,
  ...(Array.isArray(exerciseItem?.secondaryMuscles) ? exerciseItem.secondaryMuscles : []),
].filter(Boolean).join(' ').toLowerCase();

export default function ExerciseDetails() {
  const { colors, isDarkMode } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { exercise, originBodyPart } = useLocalSearchParams();
  const [isFavorite, setIsFavorite] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [isFinishing, setIsFinishing] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [totalTime, setTotalTime] = useState(0);
  const [showPlayer, setShowPlayer] = useState(false);
  const [isResting, setIsResting] = useState(false);
  const [restSeconds, setRestSeconds] = useState(30);
  const [showSwapModal, setShowSwapModal] = useState(false);
  const [swapSuggestions, setSwapSuggestions] = useState<any[]>([]);
  const [swapLoading, setSwapLoading] = useState(false);
  const [completionSummary, setCompletionSummary] = useState<CompletionSummary | null>(null);
  const checkingPremiumAccess = useRequirePremiumWorkoutAccess();

  const handleBackPress = () => {
    const originName = firstParamValue(originBodyPart);
    const exerciseBodyPart = String(exerciseData?.bodyPart || '').toLowerCase().trim();
    const routeBodyPart = originName || exerciseBodyPartRouteMap[exerciseBodyPart];

    try {
      if (routeBodyPart) {
        router.replace({
          pathname: "/(main)/(exercises)/[bodypart]",
          params: { bodypart: routeBodyPart, name: routeBodyPart },
        });
        return;
      }

      router.replace('/(main)/(exercises)/workout');
    } catch {
      router.replace('/(main)/(exercises)/workout');
    }
  };
  
  const exerciseData = useMemo(() => {
    try {
      return JSON.parse(exercise as string);
    } catch (error) {
      console.error("Error parsing exercise data:", error);
      return null;
    }
  }, [exercise]);

  // Fetch userId from tokenStorage
  useEffect(() => {
    const fetchUserId = async () => {
      try {
        const user = await tokenStorage.getUser();
        if (user && user.id) {
          setUserId(user.id);
          console.log('UserId fetched:', user.id);
        }
      } catch (error) {
        console.error('Error fetching userId:', error);
      }
    };
    
    fetchUserId();
  }, []);

  // Timer interval effect
  useEffect(() => {
    let interval: any;
    
    if (isRunning && !isPaused) {
      interval = setInterval(() => {
        setTimerSeconds(prev => prev + 1);
        setTotalTime(prev => prev + 1);
      }, 1000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, isPaused]);

  useEffect(() => {
    if (!showPlayer || !isResting || restSeconds <= 0) return;

    const interval = setInterval(() => {
      setRestSeconds((current) => {
        if (current <= 1) {
          setIsResting(false);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
          return 30;
        }
        return current - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isResting, restSeconds, showPlayer]);

  useEffect(() => {
    if (Platform.OS !== "android") {
      return;
    }

    NavigationBar.setPositionAsync("absolute").catch(() => {});
    NavigationBar.setBackgroundColorAsync("#00000000").catch(() => {});
    NavigationBar.setBorderColorAsync("#00000000").catch(() => {});
    NavigationBar.setButtonStyleAsync(isDarkMode ? "light" : "dark").catch(() => {});
    NavigationBar.setStyle(isDarkMode ? "dark" : "light");
    NavigationBar.setVisibilityAsync("visible").catch(() => {});

    return () => {
      NavigationBar.setPositionAsync("relative").catch(() => {});
      NavigationBar.setBackgroundColorAsync(isDarkMode ? colors.screenColor : "#FFFFFF").catch(() => {});
      NavigationBar.setBorderColorAsync(isDarkMode ? colors.screenColor : "#FFFFFF").catch(() => {});
      NavigationBar.setButtonStyleAsync(isDarkMode ? "light" : "dark").catch(() => {});
      NavigationBar.setStyle(isDarkMode ? "dark" : "light");
    };
  }, [colors.screenColor, isDarkMode]);

  const checkFavoriteStatus = useCallback(async () => {
    try {
      const favorites = await AsyncStorage.getItem('favoriteExercises');
      if (favorites && exerciseData) {
        const favoritesList = JSON.parse(favorites);
        console.log('Checking favorite status for:', exerciseData.name, 'ID:', exerciseData.id);
        console.log('Current favorites:', favoritesList.map((f: any) => ({ name: f.name, id: f.id })));
        const isAlreadyFavorite = favoritesList.some((fav: any) => fav.id === exerciseData.id);
        console.log('Is favorite?', isAlreadyFavorite);
        setIsFavorite(isAlreadyFavorite);
      } else {
        console.log('No favorites found or no exercise data');
        setIsFavorite(false);
      }
    } catch (error) {
      console.error('Error checking favorite status:', error);
      setIsFavorite(false);
    }
  }, [exerciseData]);

  // Reset state when component mounts or exercise changes
  useEffect(() => {
    setIsFavorite(false);
    setTimerSeconds(0);
    setTotalTime(0);
    setIsRunning(false);
    setIsPaused(false);
    setIsFinishing(false);

    if (exerciseData) {
      console.log('Exercise changed, checking favorite status for:', exerciseData.name);
      checkFavoriteStatus();
    }
  }, [checkFavoriteStatus, exercise, exerciseData]);

  const toggleFavorite = async () => {
    try {
      console.log('Toggling favorite for:', exerciseData.name, 'Current status:', isFavorite);
      const favorites = await AsyncStorage.getItem('favoriteExercises');
      let favoritesList = favorites ? JSON.parse(favorites) : [];
      console.log('Current favorites before toggle:', favoritesList.length);
      
      if (isFavorite) {
        // Remove from favorites
        const beforeCount = favoritesList.length;
        favoritesList = favoritesList.filter((fav: any) => fav.id !== exerciseData.id);
        console.log('Removed from favorites:', exerciseData.name, 'Count:', beforeCount, '->', favoritesList.length);
      } else {
        // Add to favorites - check if already exists first
        const alreadyExists = favoritesList.some((fav: any) => fav.id === exerciseData.id);
        if (!alreadyExists) {
          favoritesList.push(exerciseData);
          console.log('Added to favorites:', exerciseData.name, 'New count:', favoritesList.length);
        } else {
          console.log('Exercise already in favorites, skipping add');
        }
      }
      
      await AsyncStorage.setItem('favoriteExercises', JSON.stringify(favoritesList));
      console.log('Saved to AsyncStorage, new favorite status:', !isFavorite);
      setIsFavorite(!isFavorite);
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  // Timer functions
  const handleStartTimer = () => {
    setIsRunning(true);
    setIsPaused(false);
    Haptics.selectionAsync().catch(() => {});
  };

  const handlePauseTimer = () => {
    setIsPaused(!isPaused);
    Haptics.selectionAsync().catch(() => {});
  };

  const handleStopTimer = () => {
    setIsRunning(false);
    setIsPaused(false);
    setTimerSeconds(0);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  };

  const openWorkoutPlayer = () => {
    setShowPlayer(true);
    if (!isRunning) {
      setIsRunning(true);
      setIsPaused(false);
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
  };

  const startRestMode = () => {
    setIsResting(true);
    setRestSeconds(30);
    setIsPaused(true);
    Haptics.selectionAsync().catch(() => {});
  };

  const loadSwapSuggestions = async () => {
    if (!exerciseData) return;

    setSwapLoading(true);
    setShowSwapModal(true);
    try {
      const bodyPart = String(exerciseData.bodyPart || '').toLowerCase();
      const fetchedExercises = bodyPart ? await fetchExercisesByBodyPart(bodyPart) : [];
      const sourceExercises = Array.isArray(fetchedExercises) && fetchedExercises.length > 0
        ? fetchedExercises
        : dummyData;
      const currentId = String(exerciseData.id || exerciseData.name || '').toLowerCase();

      const suggestions = sourceExercises
        .filter((item: any) => String(item?.id || item?.name || '').toLowerCase() !== currentId)
        .sort((a: any, b: any) => {
          const aScore =
            (String(a.equipment || '').toLowerCase() === String(exerciseData.equipment || '').toLowerCase() ? 2 : 0) +
            (String(a.target || '').toLowerCase() === String(exerciseData.target || '').toLowerCase() ? 3 : 0);
          const bScore =
            (String(b.equipment || '').toLowerCase() === String(exerciseData.equipment || '').toLowerCase() ? 2 : 0) +
            (String(b.target || '').toLowerCase() === String(exerciseData.target || '').toLowerCase() ? 3 : 0);
          return bScore - aScore;
        })
        .slice(0, 10);

      setSwapSuggestions(suggestions);
    } catch (error) {
      console.log('Error loading swap suggestions:', error);
      setSwapSuggestions(dummyData.filter((item: any) => item.id !== exerciseData.id).slice(0, 8));
    } finally {
      setSwapLoading(false);
    }
  };

  const handleSwapExercise = (nextExercise: any) => {
    setShowSwapModal(false);
    setSwapSuggestions([]);
    const originName = firstParamValue(originBodyPart)
      || exerciseBodyPartRouteMap[String(nextExercise?.bodyPart || '').toLowerCase()]
      || nextExercise?.bodyPart
      || '';

    router.replace({
      pathname: "/(main)/(exercises)/exercise-details",
      params: {
        exercise: JSON.stringify(nextExercise),
        originBodyPart: originName,
      },
    });
  };

  const closeCompletionSummary = () => {
    setCompletionSummary(null);
  };

  const shareCompletionSummary = async () => {
    if (!completionSummary) return;

    const message = [
      `I completed ${completionSummary.exerciseName} on FitFaat.`,
      `Duration: ${completionSummary.durationLabel}`,
      `Calories: ${completionSummary.calories} kcal`,
      `Workout streak: ${completionSummary.streak} day${completionSummary.streak === 1 ? '' : 's'}`,
      `Date: ${completionSummary.completedAtLabel}`,
    ].join('\n');

    try {
      await Share.share({ message });
    } catch (error) {
      console.log('Error sharing workout completion:', error);
    }
  };

  // Format seconds to MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle finish exercise - save to backend
  const handleFinishExercise = async () => {
    if (!userId) {
      Alert.alert('Error', 'User ID not found. Please log in again.');
      return;
    }

    if (totalTime === 0) {
      Alert.alert('No Time', 'Please exercise for at least a few seconds before finishing.');
      return;
    }

    setIsFinishing(true);
    try {
      const response = await exerciseApi.finishExercise(
        userId,
        exerciseData.name,
        totalTime
      );

      if (response.success) {
        const completedAt = new Date().toISOString();
        const calorieData = response.data?.calorieData;
        const calorieMetrics = await loadAdaptiveGoalMetrics().catch(() => null);
        const completedCalories =
          Number(calorieData?.calories || 0) > 0
            ? Math.round(Number(calorieData?.calories))
            : estimateExerciseCalories(
                {
                  exerciseName: exerciseData.name,
                  durationSeconds: totalTime,
                  bodyPart: exerciseData.bodyPart,
                  target: exerciseData.target,
                  equipment: exerciseData.equipment,
                },
                calorieMetrics
              );
        await recordCompletedWorkoutLocally({
          exerciseName: exerciseData.name,
          durationSeconds: totalTime,
          completedAt,
          bodyPart: exerciseData.bodyPart,
          target: exerciseData.target,
          equipment: exerciseData.equipment,
          caloriesBurned: completedCalories,
        });
        let dashboardProgress: { totalCaloriesBurned: number } | null = null;
        try {
          const isPremium = await getIsPremiumUser();
          if (isPremium) {
            dashboardProgress = await recordExerciseProgressForActiveDashboardDay({
              exerciseName: exerciseData.name,
              caloriesBurned: completedCalories,
              durationSeconds: totalTime,
              completedAt,
              bodyPart: exerciseData.bodyPart,
              target: exerciseData.target,
              equipment: exerciseData.equipment,
            });
          }
        } catch (progressError) {
          console.error('Error updating local dashboard exercise progress:', progressError);
        }

        let workoutHistory: any[] = [];
        try {
          const storedHistory = await AsyncStorage.getItem(LOCAL_WORKOUT_HISTORY_KEY);
          const parsedHistory = storedHistory ? JSON.parse(storedHistory) : [];
          workoutHistory = Array.isArray(parsedHistory) ? parsedHistory : [];
        } catch {
          workoutHistory = [];
        }

        setCompletionSummary({
          exerciseName: exerciseData.name,
          durationLabel: formatTime(totalTime),
          calories: completedCalories,
          fatBurnGrams: calorieData?.fatBurnGrams,
          intensity: calorieData?.intensity,
          streak: computeWorkoutStreak(workoutHistory),
          completedAtLabel: new Date(completedAt).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          }),
          dashboardCalories: dashboardProgress?.totalCaloriesBurned,
          motivationalMessage: response.data?.motivationalMessage,
        });

        setTimerSeconds(0);
        setTotalTime(0);
        setIsRunning(false);
        setIsPaused(false);
        return;

        // Build success message with calorie info
        let successMessage = `Exercise "${exerciseData.name}" saved!\n`;
        successMessage += `⏱️  Duration: ${formatTime(totalTime)}\n`;

        if (calorieData) {
          successMessage += `\n🔥 Calories Burned: ${calorieData.calories} kcal\n`;
          successMessage += `💪 Fat Burned: ~${calorieData.fatBurnGrams}g\n`;
          successMessage += `📊 Intensity: ${calorieData.intensity}\n`;
          if (dashboardProgress) {
            successMessage += `Dashboard Burned Today: ${dashboardProgress?.totalCaloriesBurned || 0} kcal\n`;
          }
        }

        if (response.data?.motivationalMessage) {
          successMessage += `\n${response.data.motivationalMessage}`;
        }

        Alert.alert('Success! 🎉', successMessage, [
          {
            text: 'OK',
            onPress: () => {
              // Reset timer after success
              setTimerSeconds(0);
              setTotalTime(0);
              setIsRunning(false);
              setIsPaused(false);
            }
          }
        ]);
      }
    } catch (error) {
      console.error('Error finishing exercise:', error);
      Alert.alert(
        'Error',
        'Failed to save exercise. Please try again.'
      );
    } finally {
      setIsFinishing(false);
    }
  };

  const statusBarBackground = isDarkMode ? colors.screenColor : "#FFFFFF";
  const statusBarStyle = isDarkMode ? "light-content" : "dark-content";
  const styles = getStyles(colors, insets.top, statusBarBackground);
  const playerProgress = Math.min((timerSeconds % 60) / 60, 1);
  const nextInstruction = useMemo(() => {
    if (!exerciseData?.instructions?.length) {
      return "Keep your form controlled and breathe steadily.";
    }
    const index = Math.min(Math.floor(totalTime / 20), exerciseData.instructions.length - 1);
    return exerciseData.instructions[index];
  }, [exerciseData?.instructions, totalTime]);

  if (checkingPremiumAccess) {
    return (
      <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
        <StatusBar barStyle={statusBarStyle} backgroundColor={statusBarBackground} translucent={false} />
        <View style={styles.statusBarSpacer} />
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={handleBackPress}
          >
            <Ionicons name="arrow-back" size={24} color={colors.textOnPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Exercise Details</Text>
          <View style={styles.spacer} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Checking access...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!exerciseData) {
    return (
      <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
        <StatusBar barStyle={statusBarStyle} backgroundColor={statusBarBackground} translucent={false} />
        <View style={styles.statusBarSpacer} />
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={handleBackPress}
          >
            <Ionicons name="arrow-back" size={24} color={colors.textOnPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Exercise Details</Text>
          <View style={styles.spacer} />
        </View>
        
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.cardBackground }}>
          <Text>Error loading exercise details</Text>
          <TouchableOpacity onPress={handleBackPress}>
            <Text style={{ color: colors.error, marginTop: 20 }}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <StatusBar barStyle={statusBarStyle} backgroundColor={statusBarBackground} translucent={false} />
      <View style={styles.statusBarSpacer} />
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={handleBackPress}
        >
          <Ionicons name="arrow-back" size={24} color={colors.textOnPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Exercise Details</Text>
        <View style={styles.spacer} />
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        <Image
          source={{ uri: exerciseData.gifUrl }}
          contentFit="cover"
          style={{
            height: hp(45),
            width: "100%",
            borderBottomLeftRadius: wp(8),
            borderBottomRightRadius: wp(8),
          }}
        />
      
      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={{ 
          paddingBottom: hp(5),
          paddingTop: hp(3),
        }}
      >
        <View style={styles.scrollHint}>
          <Ionicons name="chevron-down-circle-outline" size={Math.min(hp(2.6), wp(5.8))} color={colors.primary} />
          <Text style={styles.scrollHintText}>
            Scroll down to view instructions, timer, workout player, and other features
          </Text>
        </View>

        <Text 
          style={{
            fontSize: hp(3),
            fontWeight: 'bold',
            marginLeft: hp(2),
            marginRight: hp(2),
            color: colors.textPrimary,
            textAlign: 'center',
          }}
        >
          {exerciseData?.name}
        </Text>
        
        <View style={{
          backgroundColor: colors.cardBackground,
          margin: hp(2),
          borderRadius: hp(2),
          padding: hp(2),
          shadowColor: colors.shadowLight,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 3,
        }}>
          <Text 
            style={{
              fontSize: hp(2.2),
              fontWeight: '600',
              marginBottom: hp(1),
              color: colors.textSecondary,
            }}
          >
            Equipment: {exerciseData?.equipment}
          </Text>
          
          <Text 
            style={{
              fontSize: hp(2.2),
              fontWeight: '600',
              marginBottom: hp(1),
              color: colors.textSecondary,
            }}
          >
            Target Muscle: {exerciseData?.target}
          </Text>
          
          {exerciseData.secondaryMuscles && exerciseData.secondaryMuscles.length > 0 && (
            <Text 
              style={{
                fontSize: hp(2.2),
                fontWeight: '600',
                marginBottom: hp(1),
                color: colors.textSecondary,
              }}
            >
              Secondary Muscles: {exerciseData.secondaryMuscles.join(", ")}
            </Text>
          )}
          
          <Text 
            style={{
              fontSize: hp(2.2),
              fontWeight: '600',
              marginBottom: hp(1),
              color: colors.textSecondary,
            }}
          >
            Body Part: {exerciseData?.bodyPart}
          </Text>

          <TouchableOpacity style={styles.swapExerciseButton} onPress={loadSwapSuggestions}>
            <Ionicons name="swap-horizontal" size={Math.min(hp(2.4), wp(5.2))} color={colors.textOnPrimary} />
            <View style={styles.swapExerciseCopy}>
              <Text style={styles.swapExerciseTitle}>Replace Exercise</Text>
              <Text style={styles.swapExerciseSubtitle}>Find similar moves by muscle and equipment</Text>
            </View>
            <Ionicons name="chevron-forward" size={Math.min(hp(2.2), wp(4.8))} color={colors.textOnPrimary} />
          </TouchableOpacity>
        </View>
        
        <View style={{
          backgroundColor: colors.cardBackground,
          margin: hp(2),
          borderRadius: hp(2),
          padding: hp(2),
          shadowColor: colors.shadowLight,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 3,
        }}>
          <Text 
            style={{
              fontSize: hp(2.5),
              fontWeight: 'bold',
              marginBottom: hp(2),
              color: colors.textPrimary,
            }}
          >
            Instructions:
          </Text>
          
          {exerciseData.instructions?.map((instruction: string, index: number) => (
            <Text
              key={`instruction-${index}`}
              style={{
                fontSize: hp(1.9),
                marginBottom: hp(1.5),
                lineHeight: hp(2.5),
                color: colors.textSecondary,
                paddingLeft: hp(1),
              }}
            >
              {index + 1}. {instruction}
            </Text>
          ))}
        </View>

        {/* Timer Section */}
        <View style={{
          backgroundColor: colors.cardBackground,
          margin: hp(2),
          borderRadius: hp(2),
          padding: hp(2),
          shadowColor: colors.shadowLight,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 3,
        }}>
          {/* Timer Display */}
          <View style={{
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: hp(3),
          }}>
            <Text style={{
              fontSize: hp(2),
              color: colors.textSecondary,
              marginBottom: hp(1),
              fontWeight: '600',
            }}>
              {isRunning ? (isPaused ? 'Paused' : 'Running') : 'Exercise Timer'}
            </Text>
            <View style={{
              backgroundColor: colors.screenColor,
              borderRadius: hp(2),
              paddingVertical: hp(2),
              paddingHorizontal: hp(3),
              marginBottom: hp(2),
            }}>
              <Text style={{
                fontSize: hp(5),
                fontWeight: 'bold',
                color: colors.primary,
                textAlign: 'center',
              }}>
                {formatTime(timerSeconds)}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.playerLaunchButton}
              onPress={openWorkoutPlayer}
              activeOpacity={0.85}
            >
              <Ionicons name="play-circle" size={Math.min(hp(2.6), wp(5.6))} color={colors.textOnPrimary} />
              <Text style={styles.playerLaunchText}>Open Workout Player</Text>
            </TouchableOpacity>

            {/* Total Time Display */}
            {totalTime > 0 && (
              <View style={{ marginBottom: hp(2) }}>
                <Text style={{
                  fontSize: hp(1.8),
                  color: colors.textSecondary,
                  fontWeight: '500',
                  marginBottom: hp(1),
                }}>
                  Total: {formatTime(totalTime)}
                </Text>
                {/* Estimated Calories Display */}
                {exerciseData && (
                  <Text style={{
                    fontSize: hp(1.6),
                    color: colors.primary,
                    fontWeight: '600',
                    marginTop: hp(1),
                  }}>
                    💪 Exercise tracked - Calories will be calculated
                  </Text>
                )}
              </View>
            )}
          </View>

          {/* Timer Control Buttons */}
          <View style={{
            flexDirection: 'row',
            justifyContent: 'space-around',
            alignItems: 'center',
            gap: wp(3),
          }}>
            {/* Start Button */}
            <TouchableOpacity
              style={{
                flex: 1,
                backgroundColor: !isRunning ? colors.primary : colors.textSecondary,
                paddingVertical: hp(1.5),
                borderRadius: hp(1.5),
                justifyContent: 'center',
                alignItems: 'center',
                opacity: isRunning ? 0.5 : 1,
              }}
              onPress={handleStartTimer}
              disabled={isRunning}
            >
              <Text style={{
                color: colors.buttonText,
                fontSize: hp(2),
                fontWeight: 'bold',
              }}>
                ▶ Start
              </Text>
            </TouchableOpacity>

            {/* Pause Button */}
            <TouchableOpacity
              style={{
                flex: 1,
                backgroundColor: isRunning ? colors.warning : colors.textSecondary,
                paddingVertical: hp(1.5),
                borderRadius: hp(1.5),
                justifyContent: 'center',
                alignItems: 'center',
                opacity: !isRunning ? 0.5 : 1,
              }}
              onPress={handlePauseTimer}
              disabled={!isRunning}
            >
              <Text style={{
                color: colors.buttonText,
                fontSize: hp(2),
                fontWeight: 'bold',
              }}>
                {isPaused ? '▶ Resume' : '⏸ Pause'}
              </Text>
            </TouchableOpacity>

            {/* Stop Button */}
            <TouchableOpacity
              style={{
                flex: 1,
                backgroundColor: isRunning || timerSeconds > 0 ? colors.error : colors.textSecondary,
                paddingVertical: hp(1.5),
                borderRadius: hp(1.5),
                justifyContent: 'center',
                alignItems: 'center',
                opacity: (isRunning || timerSeconds > 0) ? 1 : 0.5,
              }}
              onPress={handleStopTimer}
              disabled={!isRunning && timerSeconds === 0}
            >
              <Text style={{
                color: colors.buttonText,
                fontSize: hp(2),
                fontWeight: 'bold',
              }}>
                ⏹ Stop
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Finish Exercise Button */}
        {totalTime > 0 && (
          <View style={{
            alignItems: 'center',
            marginHorizontal: hp(2),
            marginVertical: hp(1),
          }}>
            <TouchableOpacity
              style={{
                backgroundColor: colors.success,
                paddingHorizontal: wp(8),
                paddingVertical: hp(2),
                borderRadius: hp(2.5),
                shadowColor: colors.shadowLight,
                shadowOffset: { width: 0, height: 3 },
                shadowOpacity: 0.3,
                shadowRadius: 5,
                elevation: 6,
                flexDirection: 'row',
                alignItems: 'center',
                opacity: isFinishing ? 0.7 : 1,
              }}
              onPress={handleFinishExercise}
              disabled={isFinishing}
            >
              <Text style={{
                fontSize: hp(2.5),
                marginRight: wp(2),
              }}>
                ✓
              </Text>
              <Text style={{
                color: colors.buttonText,
                fontSize: hp(2.2),
                fontWeight: 'bold',
              }}>
                {isFinishing ? 'Saving...' : 'Finish Exercise'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <Modal visible={showPlayer} animationType="slide" onRequestClose={() => setShowPlayer(false)}>
          <SafeAreaView style={styles.playerSafeArea} edges={['top', 'left', 'right', 'bottom']}>
            <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} backgroundColor={colors.screenColor} translucent={false} />
            <View style={styles.playerHeader}>
              <TouchableOpacity style={styles.playerIconButton} onPress={() => setShowPlayer(false)}>
                <Ionicons name="chevron-down" size={Math.min(hp(3.2), wp(7))} color={colors.textPrimary} />
              </TouchableOpacity>
              <Text style={styles.playerTitle} numberOfLines={1}>{exerciseData?.name}</Text>
              <TouchableOpacity style={styles.playerIconButton} onPress={toggleFavorite}>
                <Ionicons name={isFavorite ? "heart" : "heart-outline"} size={Math.min(hp(3), wp(6.4))} color={isFavorite ? colors.error : colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.playerScroll}
              contentContainerStyle={styles.playerScrollContent}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.playerMediaWrap}>
                <Image source={{ uri: exerciseData.gifUrl }} contentFit="cover" style={styles.playerImage} />
              </View>

              <View style={styles.playerPanel}>
                <ProgressRing
                  progress={isResting ? restSeconds / 30 : playerProgress}
                  size={Math.min(hp(19), wp(42))}
                  strokeWidth={Math.min(hp(1.3), wp(2.8))}
                  color={isResting ? colors.warning : colors.primary}
                  trackColor={colors.border}
                  icon={isResting ? "hourglass-outline" : "timer-outline"}
                  value={isResting ? formatTime(restSeconds) : formatTime(timerSeconds)}
                  label={isResting ? "Rest" : isPaused ? "Paused" : "Active"}
                  textColor={colors.textPrimary}
                  mutedTextColor={colors.textSecondary}
                />

                <View style={styles.playerCueCard}>
                  <Text style={styles.playerCueLabel}>Next cue</Text>
                  <Text style={styles.playerCueText}>{nextInstruction}</Text>
                </View>

                <View style={styles.playerControls}>
                  <TouchableOpacity style={styles.playerControlButton} onPress={handlePauseTimer}>
                    <Ionicons name={isPaused ? "play" : "pause"} size={Math.min(hp(2.8), wp(6))} color={colors.textOnPrimary} />
                    <Text style={styles.playerControlText}>{isPaused ? "Resume" : "Pause"}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.playerControlButton, styles.restButton]} onPress={startRestMode}>
                    <Ionicons name="cafe-outline" size={Math.min(hp(2.8), wp(6))} color={colors.textOnPrimary} />
                    <Text style={styles.playerControlText}>Rest 30s</Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={[styles.playerFinishButton, (isFinishing || totalTime === 0) && { opacity: 0.65 }]}
                  onPress={async () => {
                    setShowPlayer(false);
                    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
                    handleFinishExercise();
                  }}
                  disabled={isFinishing || totalTime === 0}
                >
                  <Ionicons name="checkmark-done" size={Math.min(hp(2.8), wp(6))} color={colors.textOnPrimary} />
                  <Text style={styles.playerFinishText}>{isFinishing ? "Saving..." : "Complete Workout"}</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </SafeAreaView>
        </Modal>

        <Modal visible={showSwapModal} transparent animationType="slide" onRequestClose={() => setShowSwapModal(false)}>
          <View style={styles.swapOverlay}>
            <View style={styles.swapSheet}>
              <View style={styles.swapHeader}>
                <View>
                  <Text style={styles.swapTitle}>Replace Exercise</Text>
                  <Text style={styles.swapSubtitle}>Similar choices for this workout</Text>
                </View>
                <TouchableOpacity style={styles.swapCloseButton} onPress={() => setShowSwapModal(false)}>
                  <Ionicons name="close" size={Math.min(hp(2.8), wp(6))} color={colors.textPrimary} />
                </TouchableOpacity>
              </View>

              {swapLoading ? (
                <View style={styles.swapLoading}>
                  <ActivityIndicator size="large" color={colors.primary} />
                  <Text style={styles.swapLoadingText}>Finding similar exercises...</Text>
                </View>
              ) : (
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.swapListContent}>
                  {swapSuggestions.map((item) => (
                    <TouchableOpacity key={item.id || item.name} style={styles.swapCard} onPress={() => handleSwapExercise(item)}>
                      <Image source={{ uri: item.gifUrl }} contentFit="cover" style={styles.swapImage} />
                      <View style={styles.swapCardCopy}>
                        <Text style={styles.swapCardTitle} numberOfLines={2}>{item.name}</Text>
                        <Text style={styles.swapCardMeta} numberOfLines={1}>{item.target || 'Target'} - {item.equipment || 'Equipment'}</Text>
                        <View style={styles.swapMatchRow}>
                          {String(item.equipment || '').toLowerCase() === String(exerciseData.equipment || '').toLowerCase() && (
                            <Text style={styles.swapMatchPill}>Same equipment</Text>
                          )}
                          {String(item.target || '').toLowerCase() === String(exerciseData.target || '').toLowerCase() && (
                            <Text style={styles.swapMatchPill}>Same target</Text>
                          )}
                        </View>
                      </View>
                      <Ionicons name="swap-horizontal" size={Math.min(hp(2.4), wp(5.2))} color={colors.primary} />
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </View>
          </View>
        </Modal>

        <Modal visible={!!completionSummary} transparent animationType="fade" onRequestClose={closeCompletionSummary}>
          <View style={styles.completionOverlay}>
            <View style={styles.completionCard}>
              <View style={styles.completionIconWrap}>
                <Ionicons name="checkmark-done" size={Math.min(hp(4.2), wp(9.2))} color={colors.textOnPrimary} />
              </View>
              <Text style={styles.completionTitle}>Workout Complete</Text>
              <Text style={styles.completionSubtitle} numberOfLines={2}>
                {completionSummary?.exerciseName}
              </Text>

              <View style={styles.completionStatsGrid}>
                <View style={styles.completionStatCard}>
                  <Text style={styles.completionStatValue}>{completionSummary?.durationLabel || '00:00'}</Text>
                  <Text style={styles.completionStatLabel}>Duration</Text>
                </View>
                <View style={styles.completionStatCard}>
                  <Text style={styles.completionStatValue}>{completionSummary?.calories || 0}</Text>
                  <Text style={styles.completionStatLabel}>Calories</Text>
                </View>
                <View style={styles.completionStatCard}>
                  <Text style={styles.completionStatValue}>{completionSummary?.streak || 0}</Text>
                  <Text style={styles.completionStatLabel}>Streak</Text>
                </View>
              </View>

              {completionSummary?.intensity || completionSummary?.fatBurnGrams ? (
                <View style={styles.completionDetailRow}>
                  <Text style={styles.completionDetailText}>
                    {completionSummary?.intensity ? `Intensity: ${completionSummary.intensity}` : ''}
                  </Text>
                  <Text style={styles.completionDetailText}>
                    {completionSummary?.fatBurnGrams ? `Fat: ${completionSummary.fatBurnGrams}g` : ''}
                  </Text>
                </View>
              ) : null}

              {completionSummary?.dashboardCalories ? (
                <Text style={styles.completionDashboardText}>
                  Dashboard burned today: {completionSummary.dashboardCalories} kcal
                </Text>
              ) : null}

              {completionSummary?.motivationalMessage ? (
                <Text style={styles.completionMotivation}>{completionSummary.motivationalMessage}</Text>
              ) : null}

              <TouchableOpacity style={styles.shareButton} onPress={shareCompletionSummary}>
                <Ionicons name="share-social-outline" size={Math.min(hp(2.4), wp(5.2))} color={colors.textOnPrimary} />
                <Text style={styles.shareButtonText}>Share Result</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.doneButton} onPress={closeCompletionSummary}>
                <Text style={styles.doneButtonText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Favorite Button */}
        <View style={{
          alignItems: 'center',
          margin: hp(2),
        }}>
          <TouchableOpacity
            style={{
              backgroundColor: isFavorite ? colors.error : colors.cardBackground,
              paddingHorizontal: wp(12),
              paddingVertical: hp(1.8),
              borderRadius: hp(2.5),
              shadowColor: colors.shadowLight,
              shadowOffset: { width: 0, height: 3 },
              shadowOpacity: 0.3,
              shadowRadius: 5,
              elevation: 6,
              flexDirection: 'row',
              alignItems: 'center',
            }}
            onPress={toggleFavorite}
          >
            <Text style={{
              fontSize: hp(2.5),
              marginRight: wp(2),
            }}>
              {isFavorite ? '❤️' : '🤍'}
            </Text>
            <Text style={{
              color: isFavorite ? colors.buttonText : colors.textPrimary,
              fontSize: hp(2.2),
              fontWeight: 'bold',
            }}>
              {isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      </View>
    </SafeAreaView>
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
    borderTopLeftRadius: wp(8),
    borderTopRightRadius: wp(8),
  },
  scrollHint: {
    marginHorizontal: wp(6),
    marginBottom: hp(2),
    paddingHorizontal: wp(4),
    paddingVertical: hp(1.25),
    borderRadius: hp(2),
    backgroundColor: colors.primarySoft || `${colors.primary}14`,
    borderWidth: 1,
    borderColor: `${colors.primary}24`,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: wp(2),
  },
  scrollHintText: {
    flex: 1,
    color: colors.primary,
    fontSize: Math.min(hp(1.45), wp(3.4)),
    fontWeight: '800',
    lineHeight: hp(2),
    textAlign: 'center',
  },
  swapExerciseButton: {
    marginTop: hp(1.2),
    minHeight: hp(6.2),
    borderRadius: hp(1.6),
    paddingHorizontal: wp(3.4),
    paddingVertical: hp(1.2),
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2.2),
  },
  swapExerciseCopy: {
    flex: 1,
    minWidth: 0,
  },
  swapExerciseTitle: {
    color: colors.textOnPrimary,
    fontSize: Math.min(hp(1.75), wp(3.9)),
    fontWeight: '900',
  },
  swapExerciseSubtitle: {
    marginTop: hp(0.2),
    color: colors.textOnPrimary,
    opacity: 0.88,
    fontSize: Math.min(hp(1.2), wp(2.8)),
    fontWeight: '700',
  },
  playerLaunchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: wp(2),
    backgroundColor: colors.primary,
    paddingHorizontal: wp(4),
    paddingVertical: hp(1.35),
    borderRadius: hp(2.2),
    marginBottom: hp(1.5),
  },
  playerLaunchText: {
    color: colors.textOnPrimary,
    fontSize: Math.min(hp(1.75), wp(3.9)),
    fontWeight: '900',
  },
  playerSafeArea: {
    flex: 1,
    backgroundColor: colors.screenColor,
  },
  playerHeader: {
    minHeight: hp(7),
    paddingHorizontal: wp(4),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  playerIconButton: {
    width: hp(5),
    height: hp(5),
    borderRadius: hp(2.5),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  playerTitle: {
    flex: 1,
    marginHorizontal: wp(3),
    color: colors.textPrimary,
    fontSize: Math.min(hp(2.2), wp(4.8)),
    fontWeight: '900',
    textAlign: 'center',
  },
  playerScroll: {
    flex: 1,
  },
  playerScrollContent: {
    paddingBottom: hp(3.5),
  },
  playerMediaWrap: {
    height: hp(36),
    marginHorizontal: wp(4),
    borderRadius: hp(2.2),
    overflow: 'hidden',
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  playerImage: {
    width: '100%',
    height: '100%',
  },
  playerPanel: {
    alignItems: 'center',
    paddingHorizontal: wp(5),
    paddingTop: hp(2.2),
  },
  playerCueCard: {
    width: '100%',
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: hp(1.8),
    padding: wp(4),
    marginTop: hp(2),
  },
  playerCueLabel: {
    color: colors.primary,
    fontSize: Math.min(hp(1.45), wp(3.2)),
    fontWeight: '900',
    marginBottom: hp(0.6),
    textTransform: 'uppercase',
    letterSpacing: 0,
  },
  playerCueText: {
    color: colors.textPrimary,
    fontSize: Math.min(hp(1.75), wp(3.9)),
    lineHeight: hp(2.45),
    fontWeight: '600',
  },
  playerControls: {
    width: '100%',
    flexDirection: 'row',
    gap: wp(3),
    marginTop: hp(2),
  },
  playerControlButton: {
    flex: 1,
    minHeight: hp(5.8),
    borderRadius: hp(1.7),
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: wp(2),
  },
  restButton: {
    backgroundColor: colors.warning,
  },
  playerControlText: {
    color: colors.textOnPrimary,
    fontSize: Math.min(hp(1.7), wp(3.8)),
    fontWeight: '900',
  },
  playerFinishButton: {
    width: '100%',
    minHeight: hp(6.2),
    borderRadius: hp(1.8),
    backgroundColor: colors.success,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: wp(2),
    marginTop: hp(2),
  },
  playerFinishText: {
    color: colors.textOnPrimary,
    fontSize: Math.min(hp(1.9), wp(4.2)),
    fontWeight: '900',
  },
  swapOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  swapSheet: {
    maxHeight: '82%',
    backgroundColor: colors.screenColor,
    borderTopLeftRadius: hp(2.4),
    borderTopRightRadius: hp(2.4),
    paddingHorizontal: wp(4),
    paddingTop: hp(2),
    paddingBottom: hp(2.5),
  },
  swapHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: hp(1.6),
  },
  swapTitle: {
    color: colors.textPrimary,
    fontSize: Math.min(hp(2.35), wp(5.2)),
    fontWeight: '900',
  },
  swapSubtitle: {
    marginTop: hp(0.25),
    color: colors.textSecondary,
    fontSize: Math.min(hp(1.35), wp(3.1)),
    fontWeight: '700',
  },
  swapCloseButton: {
    width: hp(4.8),
    height: hp(4.8),
    borderRadius: hp(2.4),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  swapLoading: {
    minHeight: hp(24),
    alignItems: 'center',
    justifyContent: 'center',
  },
  swapLoadingText: {
    marginTop: hp(1.4),
    color: colors.textSecondary,
    fontSize: Math.min(hp(1.55), wp(3.5)),
    fontWeight: '700',
  },
  swapListContent: {
    paddingBottom: hp(2),
    gap: hp(1.2),
  },
  swapCard: {
    minHeight: hp(10),
    borderRadius: hp(1.6),
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.cardBackground,
    padding: hp(1),
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2.5),
  },
  swapImage: {
    width: Math.min(hp(8.6), wp(18.8)),
    height: Math.min(hp(8.6), wp(18.8)),
    borderRadius: hp(1.2),
    backgroundColor: colors.screenColor,
  },
  swapCardCopy: {
    flex: 1,
    minWidth: 0,
  },
  swapCardTitle: {
    color: colors.textPrimary,
    fontSize: Math.min(hp(1.65), wp(3.7)),
    fontWeight: '900',
    lineHeight: hp(2.15),
  },
  swapCardMeta: {
    marginTop: hp(0.35),
    color: colors.textSecondary,
    fontSize: Math.min(hp(1.25), wp(2.9)),
    fontWeight: '700',
  },
  swapMatchRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: wp(1.2),
    marginTop: hp(0.8),
  },
  swapMatchPill: {
    overflow: 'hidden',
    borderRadius: hp(1),
    paddingHorizontal: wp(2),
    paddingVertical: hp(0.35),
    color: colors.primary,
    backgroundColor: colors.primarySoft,
    fontSize: Math.min(hp(1.05), wp(2.45)),
    fontWeight: '900',
  },
  completionOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.48)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: wp(5),
  },
  completionCard: {
    width: '100%',
    backgroundColor: colors.cardBackground,
    borderRadius: hp(2.4),
    padding: hp(2.4),
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  completionIconWrap: {
    width: hp(7.4),
    height: hp(7.4),
    borderRadius: hp(3.7),
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: hp(1.4),
  },
  completionTitle: {
    color: colors.textPrimary,
    fontSize: Math.min(hp(2.5), wp(5.7)),
    fontWeight: '900',
    textAlign: 'center',
  },
  completionSubtitle: {
    marginTop: hp(0.6),
    color: colors.textSecondary,
    fontSize: Math.min(hp(1.6), wp(3.7)),
    fontWeight: '700',
    textAlign: 'center',
  },
  completionStatsGrid: {
    width: '100%',
    flexDirection: 'row',
    gap: wp(2),
    marginTop: hp(2),
  },
  completionStatCard: {
    flex: 1,
    minHeight: hp(8),
    borderRadius: hp(1.4),
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: wp(1),
  },
  completionStatValue: {
    color: colors.primary,
    fontSize: Math.min(hp(1.95), wp(4.4)),
    fontWeight: '900',
  },
  completionStatLabel: {
    marginTop: hp(0.35),
    color: colors.textSecondary,
    fontSize: Math.min(hp(1.15), wp(2.7)),
    fontWeight: '800',
  },
  completionDetailRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: wp(2),
    marginTop: hp(1.4),
  },
  completionDetailText: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: Math.min(hp(1.3), wp(3)),
    fontWeight: '700',
    textAlign: 'center',
  },
  completionDashboardText: {
    marginTop: hp(1.2),
    color: colors.primary,
    fontSize: Math.min(hp(1.35), wp(3.1)),
    fontWeight: '800',
    textAlign: 'center',
  },
  completionMotivation: {
    marginTop: hp(1.2),
    color: colors.textSecondary,
    fontSize: Math.min(hp(1.35), wp(3.1)),
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: hp(2),
  },
  shareButton: {
    width: '100%',
    minHeight: hp(5.6),
    borderRadius: hp(1.6),
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: wp(2),
    marginTop: hp(2),
  },
  shareButtonText: {
    color: colors.textOnPrimary,
    fontSize: Math.min(hp(1.75), wp(3.9)),
    fontWeight: '900',
  },
  doneButton: {
    minHeight: hp(5),
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: hp(0.8),
  },
  doneButtonText: {
    color: colors.textSecondary,
    fontSize: Math.min(hp(1.55), wp(3.5)),
    fontWeight: '900',
  },
  spacer: {
    width: wp(10),
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.screenColor,
  },
  loadingText: {
    marginTop: hp(1.5),
    fontSize: Math.min(hp(2), wp(5)),
    color: colors.textSecondary,
    fontWeight: "600",
  },
});
