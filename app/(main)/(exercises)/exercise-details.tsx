import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { ScrollView, Text, TouchableOpacity, View, StyleSheet, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from "react-native-responsive-screen";
import { useTheme } from "@/contexts/ThemeContext";
import { exerciseApi } from "@/utils/exerciseApi";
import { tokenStorage } from "@/utils/auth/tokenStorage";

export default function ExerciseDetails() {
  const { colors } = useTheme();
  const router = useRouter();
  const navigation = useNavigation();
  const { exercise } = useLocalSearchParams();
  const [isFavorite, setIsFavorite] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [isFinishing, setIsFinishing] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [totalTime, setTotalTime] = useState(0);

  const handleBackPress = () => {
    // Use React Navigation's goBack for proper navigation stack handling
    navigation.goBack();
  };
  
  let exerciseData;
  try {
    exerciseData = JSON.parse(exercise as string);
  } catch (error) {
    console.error("Error parsing exercise data:", error);
    exerciseData = null;
  }

  // Reset state when component mounts or exercise changes
  useEffect(() => {
    setIsFavorite(false); // Reset state first
    setTimerSeconds(0);   // Reset timer
    setTotalTime(0);      // Reset total time
    setIsRunning(false);  // Stop running
    setIsPaused(false);   // Reset pause state
    setIsFinishing(false); // Reset finishing state
    
    if (exerciseData) {
      console.log('Exercise changed, checking favorite status for:', exerciseData.name);
      checkFavoriteStatus();
    }
  }, [exercise]); // Changed dependency from exerciseData to exercise parameter

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

  const checkFavoriteStatus = async () => {
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
  };

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
  };

  const handlePauseTimer = () => {
    setIsPaused(!isPaused);
  };

  const handleStopTimer = () => {
    setIsRunning(false);
    setIsPaused(false);
    setTimerSeconds(0);
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
        // Build success message with calorie info
        let successMessage = `Exercise "${exerciseData.name}" saved!\n`;
        successMessage += `⏱️  Duration: ${formatTime(totalTime)}\n`;

        if (response.data?.calorieData) {
          successMessage += `\n🔥 Calories Burned: ${response.data.calorieData.calories} kcal\n`;
          successMessage += `💪 Fat Burned: ~${response.data.calorieData.fatBurnGrams}g\n`;
          successMessage += `📊 Intensity: ${response.data.calorieData.intensity}\n`;
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

  const styles = getStyles(colors);

  if (!exerciseData) {
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
          <Text style={styles.headerTitle}>Exercise Details</Text>
          <View style={styles.spacer} />
        </View>
        
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.cardBackground }}>
          <Text>Error loading exercise details</Text>
          <TouchableOpacity onPress={handleBackPress}>
            <Text style={{ color: '#FF6B6B', marginTop: 20 }}>Go Back</Text>
          </TouchableOpacity>
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
          shadowColor: '#000',
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
        </View>
        
        <View style={{
          backgroundColor: colors.cardBackground,
          margin: hp(2),
          borderRadius: hp(2),
          padding: hp(2),
          shadowColor: '#000',
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
          shadowColor: '#000',
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
                color: colors.white,
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
                color: colors.white,
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
                color: colors.white,
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
                backgroundColor: colors.success || '#4CAF50',
                paddingHorizontal: wp(8),
                paddingVertical: hp(2),
                borderRadius: hp(2.5),
                shadowColor: '#000',
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
                color: colors.white,
                fontSize: hp(2.2),
                fontWeight: 'bold',
              }}>
                {isFinishing ? 'Saving...' : 'Finish Exercise'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

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
              shadowColor: '#000',
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
              color: isFavorite ? colors.white : colors.textPrimary,
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

const getStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Math.min(wp(5), 20),
    paddingVertical: Math.min(hp(2), 16),
    backgroundColor: colors.background,
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
  },
  spacer: {
    width: wp(10),
  },
});
