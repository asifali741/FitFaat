import { pakistaniDishes } from '@/app/Dataset/dataSet';
import { drinksDataSet } from '@/app/Dataset/waterDataSet';
import { goalBasedSuggestions, waterIntakeDatabase } from '@/constants/foodDatabase';
import { HEADER_PADDING_HORIZONTAL } from '@/constants/ui';
import { useTheme } from "@/contexts/ThemeContext";
import { dailyLogsApi } from '@/utils/dailyLogsApi';
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { Audio } from 'expo-av';
import Constants from 'expo-constants';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import Animated, { Easing, runOnJS, useAnimatedProps, useSharedValue, withTiming } from "react-native-reanimated";
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from 'react-native-responsive-screen';
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle } from "react-native-svg";
import { Day as typeDay } from "./types";
interface ProgressCircleProps {
  achievedCalories: number;
  targetCalories: number;
  achieviedHydration: number;
  targetHydration: number;
};

const AnimatedScrollView = Animated.createAnimatedComponent(ScrollView);
export default function DetailsDay () {
    const { colors } = useTheme();
    const { selectedDay  } = useLocalSearchParams<{ selectedDay : string }>();
    const router = useRouter();
    const props: typeDay = JSON.parse(selectedDay )
    
    // State for fetched day data from backend
    const [dayData, setDayData] = useState<any>(props);
    const [isLoading, setIsLoading] = useState(false);
    
    // Calculate time remaining in the day (from current time to 11:59:59 PM)
    function getRemainingTime(){
        const now = new Date();
        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999); // Set to 11:59:59 PM
        
        const diff = endOfDay.getTime() - now.getTime();
        
        if (diff <= 0) return "00:00:00"; // Day is over
        
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
    
    // Fetch complete day data from backend
    useEffect(() => {
      const fetchDayData = async () => {
        try {
          setIsLoading(false);
          console.log('Day data loaded from props:', props.dayNo);
          
          // Use the props data directly since it comes from the weekly API
          // which already has all the updated calorie and hydration values
          setDayData({
            ...props,
            achievedCalories: props.achievedCalories || 0,
            achieviedHydration: props.achieviedHydration || 0,
            targetCalories: props.targetCalories,
            targetHydration: props.targetHydration,
            meals: (props as any).meals || [],
            remarks: props.remarks,
            status: props.status,
            isCompleted: (props as any).isCompleted || false,
            completionPercentage: (props as any).completionPercentage || 0,
          });
        } catch (error) {
          console.error('Error loading day data:', error);
          setDayData(props);
        } finally {
          setIsLoading(false);
        }
      };
      
      fetchDayData();
    }, [props.dayNo]);
    
    // Helper function to safely calculate percentage
    const calculatePercentage = (achieved: number, target: number): number => {
      if (!target || target === 0) return 0;
      if (!achieved || achieved < 0) return 0;
      const percent = (achieved / target) * 100;
      return Math.min(Math.round(percent * 10) / 10, 100); // Round to 1 decimal place, cap at 100
    };

    //states to track changes
    const [updateInput, setUpdateInput] = useState<string>('');
    const [timer, setTimer] = useState<string>(getRemainingTime())
    
    // Update timer every second
    useEffect(() => {
      const timerInterval = setInterval(() => {
        setTimer(getRemainingTime());
      }, 1000);
      
      return () => clearInterval(timerInterval);
    }, []);
    
    const [showMenu, setShowMenu] = useState<Boolean>(false)
    const [timeInput, setTimeInput] = useState<string>('');
    const [selectedTime, setSelectedTime] = useState<Date>(new Date());
    const [showTimePicker, setShowTimePicker] = useState<boolean>(false);
    const [foodNameInput, setFoodNameInput] = useState<string>('');
    const [descriptionInput, setDescriptionInput] = useState<string>('');
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [recording, setRecording] = useState<Audio.Recording | undefined>();
    const [audioUri, setAudioUri] = useState<string | null>(null);
    const [isRecording, setIsRecording] = useState(false);
    const [inputMethod, setInputMethod] = useState<'text' | 'audio' | 'photo'>('text');
    const [calorieInput, setCalorieInput] = useState<string>('');
    const [selectedFoodItem, setSelectedFoodItem] = useState<any>(null);
    const [foodSearch, setFoodSearch] = useState<string>('');
    const [filteredFoods, setFilteredFoods] = useState<any[]>([]);
    const [showFoodSearch, setShowFoodSearch] = useState(false);
    const [suggestedFoods, setSuggestedFoods] = useState<any[]>([]);
    const [mealQuantity, setMealQuantity] = useState<string>('1');
    const [waterInput, setWaterInput] = useState<string>('0.25'); // Default to 250ml glass
    const [showWaterTab, setShowWaterTab] = useState(false);
    const [trackingMode, setTrackingMode] = useState<'meal' | 'hydration'>('meal');
    
    // Drink search states
    const [drinkSearch, setDrinkSearch] = useState<string>('');
    const [filteredDrinks, setFilteredDrinks] = useState<any[]>([]);
    const [showDrinkSearch, setShowDrinkSearch] = useState(false);
    const [selectedDrink, setSelectedDrink] = useState<any>(null);
    const [drinkQuantity, setDrinkQuantity] = useState<string>('1');
    
    // Image detection states
    const [isDetectingDish, setIsDetectingDish] = useState(false);
    const [detectedDishName, setDetectedDishName] = useState<string>('');
    
    // Initialize suggested foods based on user's goal
    useEffect(() => {
      const userGoal = (props as any).userGoal || 3; // Default to maintenance
      const suggestions = goalBasedSuggestions[userGoal as keyof typeof goalBasedSuggestions];
      if (suggestions) {
        setSuggestedFoods(suggestions.foods);
      }
    }, [props]);
    
    // Handle food search with Pakistani dishes dataset
    useEffect(() => {
      if (foodSearch.trim().length > 1) {
        const query = foodSearch.toLowerCase();
        const results = pakistaniDishes.filter((dish: any) => {
          const name = dish.food_name || dish.name || '';
          const category = dish.category || '';
          return name.toLowerCase().includes(query) || category.toLowerCase().includes(query);
        }).slice(0, 15);
        setFilteredFoods(results);
        setShowFoodSearch(true);
      } else {
        setShowFoodSearch(false);
        setFilteredFoods([]);
      }
    }, [foodSearch]);

    // Handle drink search with drinks dataset
    useEffect(() => {
      if (drinkSearch.trim().length > 1) {
        const query = drinkSearch.toLowerCase();
        const results = drinksDataSet.filter((drink: any) => {
          const name = drink.drink_name || drink.food_name || '';
          return name.toLowerCase().includes(query);
        }).slice(0, 15);
        setFilteredDrinks(results);
        setShowDrinkSearch(true);
      } else {
        setShowDrinkSearch(false);
        setFilteredDrinks([]);
      }
    }, [drinkSearch]);

    // Detect dish from image using Google Vision API
    const detectDishFromImage = async () => {
      try {
        // Request permission
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Required', 'Please allow access to your photos to use this feature.');
          return;
        }

        // Pick image
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [4, 3],
          quality: 0.8,
        });

        if (result.canceled || !result.assets || result.assets.length === 0) {
          return;
        }

        setIsDetectingDish(true);
        const imageUri = result.assets[0].uri;

        // Prepare FormData
        const formData = new FormData();
        const filename = imageUri.split('/').pop() || 'image.jpg';
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : 'image/jpeg';

        formData.append('image', {
          uri: imageUri,
          name: filename,
          type: type,
        } as any);

        // Get backend URL
        const ENV = Constants.expoConfig?.extra;
        const baseUrl = ENV?.EXPO_PUBLIC_BACKEND_API_URL || (Platform.OS === 'android' ? 'http://10.0.2.2:5001' : 'http://localhost:5001');
        const apiUrl = baseUrl.replace(/\/api\/?$/, '') + '/api/food-detect/upload';

        // Upload to backend (Clarifai food detection)
        const response = await fetch(apiUrl, {
          method: 'POST',
          body: formData,
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });

        const data = await response.json();

        if (data.success && data.foodName) {
          const dishName = data.foodName;
          setDetectedDishName(dishName);
          
          // Auto-search in the food database
          setFoodSearch(dishName);
          
          // Try to find exact or partial match
          const query = dishName.toLowerCase();
          const matches = pakistaniDishes.filter((dish: any) => {
            const name = (dish.food_name || dish.name || '').toLowerCase();
            return name.includes(query) || query.includes(name);
          });

          if (matches.length > 0) {
            // Auto-select the best match
            const bestMatch = matches[0];
            setSelectedFoodItem(bestMatch);
            const calories = bestMatch.calories_kcal || 0;
            setCalorieInput(String(Math.round(calories * parseFloat(mealQuantity || '1'))));
            setShowFoodSearch(false);
            
            Alert.alert(
              'Food Detected! 🎯',
              `Found: ${bestMatch.food_name || bestMatch.name}\nCalories: ${calories} kcal\nConfidence: ${Math.round(data.confidence * 100)}%\n\nYou can adjust the quantity and add the meal.`,
              [{ text: 'OK' }]
            );
          } else {
            // Show search results if no exact match
            setShowFoodSearch(true);
            Alert.alert(
              'Food Detected',
              `Detected: ${dishName}\nConfidence: ${Math.round(data.confidence * 100)}%\n\nPlease select from the search results or enter details manually.`,
              [{ text: 'OK' }]
            );
          }
        } else {
          Alert.alert('Detection Failed', data.message || 'Could not detect a dish in the image. Please try another image or enter manually.');
        }
      } catch (error) {
        console.error('Image detection error:', error);
        Alert.alert('Error', 'Failed to process the image. Please try again.');
      } finally {
        setIsDetectingDish(false);
      }
    };

    // Ensure UI updates when dayData changes
    useEffect(() => {
      // This empty effect serves to notify React that dayData has changed
      // triggering a full component re-render
    }, [dayData.achieviedHydration, dayData.achievedCalories]);

    const fade = useSharedValue(1);
    const insets = useSafeAreaInsets();
    // trigger fade-out + menu
    const openMenu = () => {
    fade.value = withTiming(
      0,
      { duration: 800, easing: Easing.inOut(Easing.ease) },
      (isFinished) => {
        if (isFinished) {
          // call setShowMenu(true) on JS thread
          runOnJS(setShowMenu)(true);
        }
      }
    );
  };

  // closeMenu: set showMenu false first (so menu overlay disappears),
  // then fade main content back in
  const closeMenu = () => {
    // set state on JS thread immediately
    setShowMenu(false);
    // animate fade in
    fade.value = withTiming(1, { duration: 500, easing: Easing.inOut(Easing.ease) });
  };


    //functions
    const handleUpdate = () => {
        //Main api calling
    }

    // Image picker functions
    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.8,
        });

        if (!result.canceled) {
            setSelectedImage(result.assets[0].uri);
        }
    };

    const takePhoto = async () => {
        const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.8,
        });

        if (!result.canceled) {
            setSelectedImage(result.assets[0].uri);
        }
    };

    // Audio recording functions
    const startRecording = async () => {
        try {
            // Request permissions properly
            const { status } = await Audio.requestPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Denied', 'Audio recording permission is required');
                return;
            }
            
            await Audio.setAudioModeAsync({
                allowsRecordingIOS: true,
                playsInSilentModeIOS: true,
                staysActiveInBackground: true,
                shouldDuckAndroid: true,
                playThroughEarpieceAndroid: false
            });

            const { recording } = await Audio.Recording.createAsync(
                Audio.RecordingOptionsPresets.HIGH_QUALITY
            );
            setRecording(recording);
            setIsRecording(true);
        } catch (err: any) {
            console.error('Failed to start recording', err);
            Alert.alert('Failed to start recording', err?.message || 'Unknown error occurred');
        }
    };

    const stopRecording = async () => {
        if (!recording) return;
        
        try {
            setIsRecording(false);
            await recording.stopAndUnloadAsync();
            await Audio.setAudioModeAsync({
                allowsRecordingIOS: false,
            });
            const uri = recording.getURI();
            setAudioUri(uri);
            setRecording(undefined);
        } catch (err: any) {
            console.error('Failed to stop recording', err);
            Alert.alert('Failed to stop recording', err?.message || 'Unknown error occurred');
        }
    };

    const handleMediaAction = () => {
        Alert.alert(
            "Add Media",
            "Choose how you want to add media",
            [
                { text: "Take Photo", onPress: takePhoto },
                { text: "Choose from Gallery", onPress: pickImage },
                { text: "Cancel", style: "cancel" }
            ]
        );
    };
    const styles = useMemo(() => getStyles(colors), [colors]);
    //output
    return (
  <View style={{ flex: 1, paddingTop: insets.top, backgroundColor: colors.screenColor }}>
    {!showMenu ? (
      <Animated.View
        style={{ flex: 1, opacity: fade, backgroundColor: colors.screenColor, paddingHorizontal: 10 }}
      >
        <View style={styles.heading}>
          <View style={styles.headerContent}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
            <View style={styles.dayDateWrapper}>
              <View style={styles.dayBadge}>
                <Text style={styles.dayNumber}>0{props.dayNo}</Text>
              </View>
              <View style={styles.dateInfo}>
                <Text style={styles.dayLabel}>Day {props.dayNo}</Text>
                <Text style={styles.date}>{props.date}</Text>
              </View>
            </View>
            <View style={{ width: 40 }} />
          </View>
        </View>

        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.topSection}>
            <View style={styles.circleWrapper}>
              <Pressable
                style={styles.circleButton}
                onPressOut={handleUpdate}
                android_ripple={{ color: "rgba(0,0,0,0.06)" }}
              >
                <ProgressCircle
                  achievedCalories={dayData.achievedCalories}
                  achieviedHydration={dayData.achieviedHydration}
                  targetCalories={dayData.targetCalories}
                  targetHydration={dayData.targetHydration}
                />
              </Pressable>
            </View>

            {dayData.remarks && (
              <View style={styles.remarksContainer}>
                <Text style={styles.remarksText}>{String(dayData.remarks)}</Text>
              </View>
            )}
          </View>

          {/**Determine whether to display Update Button or not */}
          {dayData.status === "active" ? (
            <>
              <View style={styles.infoOuterBox}>
                <View style={styles.statsGrid}>
                  <View style={styles.statCard}>
                    <View style={styles.statCardHeader}>
                      <Ionicons name="flag" size={Math.min(hp(2.2), wp(5.5))} color={colors.primary} />
                      <Text style={styles.statLabel}>Goal</Text>
                    </View>
                    <View style={styles.goalRowContainer}>
                      <View style={styles.goalItem}>
                        <Text style={styles.statValue}>{dayData.targetCalories}</Text>
                        <Text style={styles.statUnit}>cals</Text>
                      </View>
                      <View style={styles.goalDivider} />
                      <View style={styles.goalItem}>
                        <Text style={styles.statValue}>{dayData.targetHydration}</Text>
                        <Text style={styles.statUnit}>liters</Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.statCard}>
                    <View style={styles.statCardContent}>
                      <Ionicons name="flame" size={Math.min(hp(2.2), wp(5.5))} color="#F97316" />
                      <Text style={styles.statLabel}>Calories</Text>
                    </View>
                    <Text style={styles.statValue}>{dayData.achievedCalories}</Text>
                    <Text style={styles.statUnit}>cals</Text>
                  </View>

                  <View style={styles.statCard}>
                    <View style={styles.statCardContent}>
                      <Ionicons name="water" size={Math.min(hp(2.2), wp(5.5))} color="#2E86AB" />
                      <Text style={styles.statLabel}>Hydration</Text>
                    </View>
                    <Text style={styles.statValue}>{dayData.achieviedHydration}</Text>
                    <Text style={styles.statUnit}>liters</Text>
                  </View>

                  <View style={styles.statCard}>
                    <View style={styles.statCardContent}>
                      <Ionicons name="timer" size={Math.min(hp(2.2), wp(5.5))} color="#FFA500" />
                      <Text style={styles.statLabel}>Timer</Text>
                    </View>
                    <Text style={styles.statValueLarge}>{timer}</Text>
                  </View>
                </View>
                
                {/* Progress Indicators */}
                <View style={styles.progressSection}>
                  <View style={styles.progressItem}>
                    <View style={styles.progressHeader}>
                      <Ionicons name="flame-outline" size={16} color="#F97316" />
                      <Text style={styles.progressLabel}>Calories Progress</Text>
                    </View>
                    <View style={styles.progressBarContainer}>
                      <View 
                        key={`cal-active-${dayData.achievedCalories}`}
                        style={[
                          styles.progressBar, 
                          { 
                            width: `${Math.min((dayData.achievedCalories / dayData.targetCalories) * 100, 100)}%`,
                            backgroundColor: '#F97316'
                          }
                        ]} 
                      />
                    </View>
                    <Text style={styles.progressPercentage}>
                      {calculatePercentage(dayData.achievedCalories, dayData.targetCalories)}%
                    </Text>
                  </View>
                  
                  <View style={styles.progressItem}>
                    <View style={styles.progressHeader}>
                      <Ionicons name="water-outline" size={16} color="#2E86AB" />
                      <Text style={styles.progressLabel}>Hydration Progress</Text>
                    </View>
                    <View style={styles.progressBarContainer}>
                      <View 
                        key={`hydration-active-${dayData.achieviedHydration}`}
                        style={[
                          styles.progressBar, 
                          { 
                            width: `${Math.min((dayData.achieviedHydration / dayData.targetHydration) * 100, 100)}%`,
                            backgroundColor: '#2E86AB'
                          }
                        ]} 
                      />
                    </View>
                    <Text style={styles.progressPercentage}>
                      {calculatePercentage(dayData.achieviedHydration, dayData.targetHydration)}%
                    </Text>
                  </View>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.trayButton, {backgroundColor: colors.primary}]} 
                onPress={openMenu}
              >
                <Ionicons name="add-circle" size={20} color="white" />
                <Text style={styles.trayButtonText}>Track Meal</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <View style={styles.infoOuterBox}>
                <View style={styles.statsGrid}>
                  <View style={styles.statCard}>
                    <View style={styles.statCardHeader}>
                      <Ionicons name="flag" size={Math.min(hp(2.2), wp(5.5))} color={colors.primary} />
                      <Text style={styles.statLabel}>Goal</Text>
                    </View>
                    <View style={styles.goalRowContainer}>
                      <View style={styles.goalItem}>
                        <Text style={styles.statValue}>{dayData.targetCalories}</Text>
                        <Text style={styles.statUnit}>cals</Text>
                      </View>
                      <View style={styles.goalDivider} />
                      <View style={styles.goalItem}>
                        <Text style={styles.statValue}>{dayData.targetHydration}</Text>
                        <Text style={styles.statUnit}>liters</Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.statCard}>
                    <View style={styles.statCardContent}>
                      <Ionicons name="flame" size={Math.min(hp(2.2), wp(5.5))} color="#F97316" />
                      <Text style={styles.statLabel}>Calories</Text>
                    </View>
                    <Text style={styles.statValue}>{dayData.achievedCalories}</Text>
                    <Text style={styles.statUnit}>cals</Text>
                  </View>

                  <View style={styles.statCard}>
                    <View style={styles.statCardContent}>
                      <Ionicons name="water" size={Math.min(hp(2.2), wp(5.5))} color="#2E86AB" />
                      <Text style={styles.statLabel}>Hydration</Text>
                    </View>
                    <Text style={styles.statValue}>{dayData.achieviedHydration}</Text>
                    <Text style={styles.statUnit}>liters</Text>
                  </View>

                  <View style={styles.statCard}>
                    <View style={styles.statCardContent}>
                      <Ionicons name="timer" size={Math.min(hp(2.2), wp(5.5))} color="#FFA500" />
                      <Text style={styles.statLabel}>Timer</Text>
                    </View>
                    <Text style={styles.statValueLarge}>{timer}</Text>
                  </View>
                </View>
                
                {/* Progress Indicators */}
                <View style={styles.progressSection}>
                  <View style={styles.progressItem}>
                    <View style={styles.progressHeader}>
                      <Ionicons name="flame-outline" size={16} color="#F97316" />
                      <Text style={styles.progressLabel}>Calories Progress</Text>
                    </View>
                    <View style={styles.progressBarContainer}>
                      <View 
                        key={`cal-inactive-${dayData.achievedCalories}`}
                        style={[
                          styles.progressBar, 
                          { 
                            width: `${Math.min((dayData.achievedCalories / dayData.targetCalories) * 100, 100)}%`,
                            backgroundColor: '#F97316'
                          }
                        ]} 
                      />
                    </View>
                    <Text style={styles.progressPercentage}>
                      {calculatePercentage(dayData.achievedCalories, dayData.targetCalories)}%
                    </Text>
                  </View>
                  
                  <View style={styles.progressItem}>
                    <View style={styles.progressHeader}>
                      <Ionicons name="water-outline" size={16} color="#2E86AB" />
                      <Text style={styles.progressLabel}>Hydration Progress</Text>
                    </View>
                    <View style={styles.progressBarContainer}>
                      <View 
                        key={`hydration-inactive-${dayData.achieviedHydration}`}
                        style={[
                          styles.progressBar, 
                          { 
                            width: `${Math.min((dayData.achieviedHydration / dayData.targetHydration) * 100, 100)}%`,
                            backgroundColor: '#2E86AB'
                          }
                        ]} 
                      />
                    </View>
                    <Text style={styles.progressPercentage}>
                      {calculatePercentage(dayData.achieviedHydration, dayData.targetHydration)}%
                    </Text>
                  </View>
                </View>
              </View>

              {/* Congratulations Message for 100% Completion */}
              {dayData.achievedCalories >= dayData.targetCalories && 
               dayData.achieviedHydration >= dayData.targetHydration && (
                <View style={styles.congratsContainer}>
                  <Ionicons name="trophy" size={Math.min(hp(4), wp(10))} color="#FFA500" />
                  <Text style={styles.congratsTitle}>Congratulations! 🎉</Text>
                  <Text style={styles.congratsText}>
                    You've achieved your daily goals! Keep up the great work!
                  </Text>
                </View>
              )}
            </>
          )}
        </ScrollView>
      </Animated.View>
    ) : (
      <KeyboardAwareScrollView 
        style={styles.menuOverlay}
        contentContainerStyle={styles.menuScrollContent}
        showsVerticalScrollIndicator={false}
        enableOnAndroid={true}
        enableAutomaticScroll={true}
        extraScrollHeight={Platform.OS === 'ios' ? 150 : 180}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.menuHeader}>
          <Ionicons name="nutrition" size={Math.min(hp(3.5), wp(8))} color={colors.primary} />
          <Text style={styles.menuTitle}>
            Track Your Progress
          </Text>
          <Text style={styles.menuSubtitle}>
            Choose what you'd like to log
          </Text>
        </View>

        {/* Tracking Mode Selector - Professional Toggle */}
        <View style={styles.trackingModeSection}>
          <Text style={styles.trackingModeTitle}>What would you like to track today?</Text>
          <View style={styles.modeToggleContainer}>
            <TouchableOpacity 
              style={[styles.modeButton, trackingMode === 'meal' && styles.modeButtonActive]}
              onPress={() => setTrackingMode('meal')}
            >
              <Ionicons name="fast-food-outline" size={22} color={trackingMode === 'meal' ? '#FFFFFF' : colors.textSecondary} />
              <Text style={[styles.modeButtonText, trackingMode === 'meal' && styles.modeButtonTextActive]}>Meal</Text>
            </TouchableOpacity>
            <View style={styles.modeButtonDivider} />
            <TouchableOpacity 
              style={[styles.modeButton, trackingMode === 'hydration' && styles.modeButtonActive]}
              onPress={() => setTrackingMode('hydration')}
            >
              <Ionicons name="water-outline" size={22} color={trackingMode === 'hydration' ? '#FFFFFF' : colors.textSecondary} />
              <Text style={[styles.modeButtonText, trackingMode === 'hydration' && styles.modeButtonTextActive]}>Hydration</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.menuContent}>
          {/* MEAL TRACKING MODE */}
          {trackingMode === 'meal' && (
            <>
              {/* Quick Pick Suggestions */}
              <View style={styles.sectionContainer}>
                <Text style={styles.sectionLabel}>Quick Pick Favorites</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickPickScroll}>
                  {suggestedFoods.slice(0, 6).map((food, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.quickPickItem}
                      onPress={() => {
                        setSelectedFoodItem(food);
                        setCalorieInput(String(food.calories_kcal || food.calories));
                        setFoodSearch('');
                        setShowFoodSearch(false);
                      }}
                      activeOpacity={0.7}
                    >
                      <View style={styles.quickPickIcon}>
                        <Ionicons name="restaurant" size={20} color={colors.primary} />
                      </View>
                      <Text style={styles.quickPickName} numberOfLines={2}>{food.food_name || food.name}</Text>
                      <View style={styles.quickPickCalories}>
                        <Ionicons name="flame" size={12} color="#F97316" />
                        <Text style={styles.quickPickCalText}>{food.calories_kcal || food.calories}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Image Upload Button */}
              <View style={styles.fieldContainer}>
                <TouchableOpacity
                  style={styles.imageUploadButton}
                  onPress={detectDishFromImage}
                  disabled={isDetectingDish}
                  activeOpacity={0.7}
                >
                  <View style={styles.imageUploadIconContainer}>
                    <Ionicons 
                      name={isDetectingDish ? "hourglass-outline" : "camera-outline"} 
                      size={24} 
                      color="#FFFFFF" 
                    />
                  </View>
                  <View style={styles.imageUploadTextContainer}>
                    <Text style={styles.imageUploadTitle}>
                      {isDetectingDish ? 'Detecting Dish...' : '📸 Upload Image For Dish'}
                    </Text>
                    <Text style={styles.imageUploadSubtitle}>
                      {isDetectingDish ? 'Processing with AI...' : 'Auto-detect food & calories'}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
                </TouchableOpacity>
              </View>

              {/* Search Food Field */}
              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>
                  <Ionicons name="search" size={16} color={colors.primary} /> Search Food
                </Text>
                <View style={styles.searchInputContainer}>
                  <Ionicons name="search-outline" size={20} color={colors.textSecondary} style={styles.searchIconLeft} />
                  <TextInput 
                    style={styles.searchInputField}
                    placeholder="Search Pakistani dishes, rice, chicken..."
                    placeholderTextColor={colors.textSecondary}
                    value={foodSearch}
                    onChangeText={setFoodSearch}
                  />
                  {foodSearch.length > 0 && (
                    <TouchableOpacity onPress={() => { setFoodSearch(''); setShowFoodSearch(false); }} style={styles.searchClearButton}>
                      <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* Search Results with Better Spacing */}
              {showFoodSearch && filteredFoods.length > 0 && (
                <View style={styles.searchResultsContainer}>
                  <Text style={styles.searchResultsHeader}>
                    Found {filteredFoods.length} items - Select one
                  </Text>
                  <ScrollView style={styles.searchResultsScroll} nestedScrollEnabled showsVerticalScrollIndicator={true}>
                    {filteredFoods.slice(0, 10).map((food, index) => (
                      <TouchableOpacity
                        key={index}
                        style={styles.searchResultCard}
                        onPress={() => {
                          setSelectedFoodItem(food);
                          const calories = food.calories_kcal || food.calories || 0;
                          setCalorieInput(String(Math.round(calories * parseFloat(mealQuantity || '1'))));
                          setFoodSearch('');
                          setShowFoodSearch(false);
                        }}
                        activeOpacity={0.6}
                      >
                        <View style={styles.searchResultLeft}>
                          <View style={styles.searchResultIconBg}>
                            <Ionicons name="fast-food" size={18} color={colors.primary} />
                          </View>
                          <View style={styles.searchResultInfo}>
                            <Text style={styles.searchResultTitle}>{food.food_name || food.name}</Text>
                            <Text style={styles.searchResultMeta}>
                              {food.serving_size || food.category || '100g'}
                            </Text>
                          </View>
                        </View>
                        <View style={styles.searchResultRight}>
                          <Text style={styles.searchResultCalValue}>{food.calories_kcal || food.calories}</Text>
                          <Text style={styles.searchResultCalLabel}>cal</Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </>
          )}

          {/* HYDRATION TRACKING MODE */}
          {trackingMode === 'hydration' && (
            <>
              {/* Search Drinks */}
              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>
                  <Ionicons name="search" size={16} color="#2E86AB" /> Search Drinks
                </Text>
                <View style={styles.searchInputContainer}>
                  <Ionicons name="search-outline" size={20} color={colors.textSecondary} style={styles.searchIconLeft} />
                  <TextInput 
                    style={styles.searchInputField}
                    placeholder="Search juice, milkshake, tea, coffee..."
                    placeholderTextColor={colors.textSecondary}
                    value={drinkSearch}
                    onChangeText={setDrinkSearch}
                  />
                  {drinkSearch.length > 0 && (
                    <TouchableOpacity onPress={() => { setDrinkSearch(''); setShowDrinkSearch(false); }} style={styles.searchClearButton}>
                      <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* Drink Search Results */}
              {showDrinkSearch && filteredDrinks.length > 0 && (
                <View style={styles.searchResultsContainer}>
                  <Text style={styles.searchResultsHeader}>
                    Found {filteredDrinks.length} drinks - Select one
                  </Text>
                  <ScrollView style={styles.searchResultsScroll} nestedScrollEnabled showsVerticalScrollIndicator={true}>
                    {filteredDrinks.map((drink, index) => (
                      <TouchableOpacity
                        key={index}
                        style={styles.drinkResultCard}
                        onPress={() => {
                          setSelectedDrink(drink);
                          const hydrationValue = ((drink.hydration_percent || 100) / 100) * 0.25; // Convert to liters
                          setWaterInput(hydrationValue.toFixed(2));
                          setDrinkSearch('');
                          setShowDrinkSearch(false);
                        }}
                        activeOpacity={0.6}
                      >
                        <View style={styles.searchResultLeft}>
                          <View style={styles.drinkResultIconBg}>
                            <Ionicons name="cafe" size={18} color="#2E86AB" />
                          </View>
                          <View style={styles.searchResultInfo}>
                            <Text style={styles.searchResultTitle}>{drink.drink_name || drink.food_name}</Text>
                            <View style={styles.drinkMetaRow}>
                              <Text style={styles.searchResultMeta}>{drink.serving_size}</Text>
                              <View style={styles.hydrationBadge}>
                                <Ionicons name="water" size={12} color="#2E86AB" />
                                <Text style={styles.hydrationText}>{drink.hydration_percent}%</Text>
                              </View>
                            </View>
                          </View>
                        </View>
                        <View style={styles.searchResultRight}>
                          <Text style={styles.drinkCalValue}>{drink.calories_kcal}</Text>
                          <Text style={styles.searchResultCalLabel}>cal</Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              {/* Selected Drink Display */}
              {selectedDrink && (
                <View style={styles.selectedDrinkCard}>
                  <View style={styles.selectedDrinkHeader}>
                    <View style={styles.drinkIconLarge}>
                      <Ionicons name="checkmark-circle" size={24} color="#2E86AB" />
                    </View>
                    <View style={styles.selectedDrinkInfo}>
                      <Text style={styles.selectedDrinkName}>{selectedDrink.drink_name || selectedDrink.food_name}</Text>
                      <Text style={styles.selectedDrinkServing}>{selectedDrink.serving_size}</Text>
                    </View>
                    <TouchableOpacity onPress={() => setSelectedDrink(null)} style={styles.removeDrinkBtn}>
                      <Ionicons name="close" size={20} color={colors.textSecondary} />
                    </TouchableOpacity>
                  </View>

                  {/* Drink Nutrition Grid */}
                  <View style={styles.drinkNutritionGrid}>
                    <View style={styles.drinkNutritionItem}>
                      <Ionicons name="water" size={16} color="#2E86AB" />
                      <Text style={styles.drinkNutritionValue}>{selectedDrink.hydration_percent}%</Text>
                      <Text style={styles.drinkNutritionLabel}>hydration</Text>
                    </View>
                    <View style={styles.drinkNutritionItem}>
                      <Ionicons name="flame" size={16} color="#F97316" />
                      <Text style={styles.drinkNutritionValue}>{Math.round(selectedDrink.calories_kcal * parseFloat(drinkQuantity || '1'))}</Text>
                      <Text style={styles.drinkNutritionLabel}>cal</Text>
                    </View>
                    {selectedDrink.protein_g > 0 && (
                      <View style={styles.drinkNutritionItem}>
                        <Ionicons name="fitness" size={16} color="#2E86AB" />
                        <Text style={styles.drinkNutritionValue}>{Math.round(selectedDrink.protein_g * parseFloat(drinkQuantity || '1'))}</Text>
                        <Text style={styles.drinkNutritionLabel}>protein</Text>
                      </View>
                    )}
                    {selectedDrink.carbs_g > 0 && (
                      <View style={styles.drinkNutritionItem}>
                        <Ionicons name="leaf" size={16} color="#FFA500" />
                        <Text style={styles.drinkNutritionValue}>{Math.round(selectedDrink.carbs_g * parseFloat(drinkQuantity || '1'))}</Text>
                        <Text style={styles.drinkNutritionLabel}>carbs</Text>
                      </View>
                    )}
                  </View>

                  {/* Drink Quantity Controls */}
                  <View style={styles.quantityControlSection}>
                    <Text style={styles.quantityControlLabel}>Servings</Text>
                    <View style={styles.quantityControls}>
                      <TouchableOpacity 
                        style={styles.quantityControlBtn}
                        onPress={() => {
                          const q = Math.max(0.5, parseFloat(drinkQuantity || '1') - 0.5);
                          setDrinkQuantity(String(q));
                          const hydrationValue = ((selectedDrink.hydration_percent || 100) / 100) * 0.25 * q;
                          setWaterInput(hydrationValue.toFixed(2));
                        }}
                      >
                        <Ionicons name="remove" size={18} color="#2E86AB" />
                      </TouchableOpacity>
                      <View style={styles.quantityDisplay}>
                        <TextInput
                          style={styles.quantityDisplayInput}
                          value={drinkQuantity}
                          onChangeText={(text) => {
                            setDrinkQuantity(text);
                            if (text && !isNaN(parseFloat(text))) {
                              const hydrationValue = ((selectedDrink.hydration_percent || 100) / 100) * 0.25 * parseFloat(text);
                              setWaterInput(hydrationValue.toFixed(2));
                            }
                          }}
                          keyboardType="decimal-pad"
                        />
                        <Text style={styles.quantityDisplayUnit}>servings</Text>
                      </View>
                      <TouchableOpacity 
                        style={styles.quantityControlBtn}
                        onPress={() => {
                          const q = parseFloat(drinkQuantity || '1') + 0.5;
                          setDrinkQuantity(String(q));
                          const hydrationValue = ((selectedDrink.hydration_percent || 100) / 100) * 0.25 * q;
                          setWaterInput(hydrationValue.toFixed(2));
                        }}
                      >
                        <Ionicons name="add" size={18} color="#2E86AB" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              )}

              {/* Quick Water Amounts */}
              <View style={styles.sectionContainer}>
                <Text style={styles.sectionLabel}>
                  <Ionicons name="water-outline" size={18} color="#2E86AB" /> Quick Add Plain Water
                </Text>
                <View style={styles.waterQuickGrid}>
                  {waterIntakeDatabase.options.map((option) => (
                    <TouchableOpacity
                      key={option.name}
                      style={styles.waterQuickOption}
                      onPress={() => {
                        setWaterInput(option.amount.toString());
                        setSelectedDrink(null);
                      }}
                      activeOpacity={0.7}
                    >
                      <View style={styles.waterQuickIconBg}>
                        <Ionicons name="water" size={24} color="#2E86AB" />
                      </View>
                      <Text style={styles.waterQuickLabel}>{option.name}</Text>
                      <Text style={styles.waterQuickAmount}>{option.amount}L</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Water Amount Input */}
              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>
                  <Ionicons name="water" size={16} color="#2E86AB" /> Hydration Amount
                </Text>
                <View style={styles.waterAmountSelector}>
                  <TouchableOpacity 
                    style={styles.waterAdjustButton}
                    onPress={() => {
                      const current = parseFloat(waterInput) || 0;
                      setWaterInput(Math.max(0, current - 0.25).toFixed(2));
                    }}
                  >
                    <Ionicons name="remove-circle" size={36} color="#2E86AB" />
                  </TouchableOpacity>
                  
                  <View style={styles.waterDisplayBox}>
                    <TextInput
                      style={styles.waterValueInput}
                      value={waterInput}
                      onChangeText={setWaterInput}
                      keyboardType="decimal-pad"
                      placeholder="0.00"
                      placeholderTextColor={colors.textSecondary}
                    />
                    <Text style={styles.waterUnit}>Liters</Text>
                    <Text style={styles.waterGlasses}>
                      ≈ {Math.round((parseFloat(waterInput || '0') / 0.25) * 10) / 10} glasses
                    </Text>
                  </View>
                  
                  <TouchableOpacity 
                    style={styles.waterAdjustButton}
                    onPress={() => {
                      const current = parseFloat(waterInput) || 0;
                      setWaterInput((current + 0.25).toFixed(2));
                    }}
                  >
                    <Ionicons name="add-circle" size={36} color="#2E86AB" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Hydration Progress */}
              <View style={styles.progressContainer}>
                <View style={styles.hydProgressHeader}>
                  <Text style={styles.progressTitle}>Today's Progress</Text>
                  <Text style={styles.progressPercent}>
                    {calculatePercentage(dayData.achieviedHydration + parseFloat(waterInput || '0'), dayData.targetHydration)}%
                  </Text>
                </View>
                <View style={styles.progressBarBg}>
                  <View
                    style={[
                      styles.progressBarFg,
                      {
                        width: `${Math.min(((dayData.achieviedHydration + parseFloat(waterInput || '0')) / dayData.targetHydration) * 100, 100)}%`,
                        backgroundColor: '#2E86AB'
                      }
                    ]}
                  />
                </View>
                <View style={styles.progressStats}>
                  <Text style={styles.progressCurrent}>
                    {(dayData.achieviedHydration + parseFloat(waterInput || '0')).toFixed(2)}L of {dayData.targetHydration}L
                  </Text>
                </View>
              </View>
            </>
          )}



          {/* Selected Food Display - Only for Meal Mode */}
          {trackingMode === 'meal' && selectedFoodItem && (
            <View style={styles.selectedFoodContainer}>
              <View style={styles.selectedFoodHeader}>
                <Ionicons name="checkmark-circle" size={24} color={colors.success} />
                <View style={styles.selectedFoodInfo}>
                  <Text style={styles.selectedFoodName}>{selectedFoodItem.food_name || selectedFoodItem.name}</Text>
                  <Text style={styles.selectedFoodServing}>
                    {selectedFoodItem.serving_size || '100g'}
                  </Text>
                  <Text style={styles.selectedFoodCalories}>
                    {Math.round((selectedFoodItem.calories_kcal || selectedFoodItem.calories || 0) * parseFloat(mealQuantity || '1'))} calories
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setSelectedFoodItem(null)}>
                  <Ionicons name="trash-outline" size={20} color={colors.error} />
                </TouchableOpacity>
              </View>
              
              {/* Nutrition Breakdown */}
              {(selectedFoodItem.protein_g || selectedFoodItem.carbs_g || selectedFoodItem.carbohydrates_g || selectedFoodItem.fat_g) && (
                <View style={styles.nutritionBreakdown}>
                  {selectedFoodItem.protein_g && (
                    <View style={styles.nutritionItem}>
                      <Text style={styles.nutritionLabel}>Protein</Text>
                      <Text style={styles.nutritionValue}>{Math.round((selectedFoodItem.protein_g || 0) * parseFloat(mealQuantity || '1'))}g</Text>
                    </View>
                  )}
                  {(selectedFoodItem.carbs_g || selectedFoodItem.carbohydrates_g) && (
                    <View style={styles.nutritionItem}>
                      <Text style={styles.nutritionLabel}>Carbs</Text>
                      <Text style={styles.nutritionValue}>{Math.round((selectedFoodItem.carbs_g || selectedFoodItem.carbohydrates_g || 0) * parseFloat(mealQuantity || '1'))}g</Text>
                    </View>
                  )}
                  {selectedFoodItem.fat_g && (
                    <View style={styles.nutritionItem}>
                      <Text style={styles.nutritionLabel}>Fat</Text>
                      <Text style={styles.nutritionValue}>{Math.round((selectedFoodItem.fat_g || 0) * parseFloat(mealQuantity || '1'))}g</Text>
                    </View>
                  )}
                </View>
              )}
              
              {/* Quantity Adjuster */}
              <View style={styles.quantitySection}>
                <Text style={styles.quantityLabel}>Quantity (portions):</Text>
                <View style={styles.quantityInputRow}>
                  <TouchableOpacity 
                    style={styles.quantityBtn}
                    onPress={() => {
                      const q = Math.max(0.5, parseFloat(mealQuantity || '1') - 0.5);
                      setMealQuantity(String(q));
                      const calories = selectedFoodItem.calories_kcal || selectedFoodItem.calories || 0;
                      setCalorieInput(String(Math.round(calories * q)));
                    }}
                  >
                    <Text style={styles.quantityBtnText}>−</Text>
                  </TouchableOpacity>
                  <TextInput
                    style={styles.quantityInput}
                    value={mealQuantity}
                    onChangeText={(text) => {
                      setMealQuantity(text);
                      if (text && !isNaN(parseFloat(text))) {
                        const calories = selectedFoodItem.calories_kcal || selectedFoodItem.calories || 0;
                        setCalorieInput(String(Math.round(calories * parseFloat(text))));
                      }
                    }}
                    keyboardType="decimal-pad"
                  />
                  <TouchableOpacity 
                    style={styles.quantityBtn}
                    onPress={() => {
                      const q = parseFloat(mealQuantity || '1') + 0.5;
                      setMealQuantity(String(q));
                      const calories = selectedFoodItem.calories_kcal || selectedFoodItem.calories || 0;
                      setCalorieInput(String(Math.round(calories * q)));
                    }}
                  >
                    <Text style={styles.quantityBtnText}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}

          {/* Manual Calorie Input - Only for Meal Mode */}
          {trackingMode === 'meal' && (
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>
              <Ionicons name="flame-outline" size={16} color="#F97316" /> Calories
            </Text>
            <View style={styles.calorieInputContainer}>
              <TextInput 
                style={styles.input} 
                placeholder="Enter calories (e.g. 450)"
                placeholderTextColor={colors.textSecondary}
                value={calorieInput}
                onChangeText={setCalorieInput}
                keyboardType="number-pad"
              />
              {calorieInput && (
                <View style={styles.calorieInfo}>
                  <Text style={styles.calorieInfoText}>
                    Remaining: {dayData.targetCalories - parseInt(calorieInput)} / {dayData.targetCalories} cals
                  </Text>
                  <View style={styles.calorieBar}>
                    <View 
                      style={[
                        styles.calorieBarFill,
                        {
                          width: `${Math.min((parseInt(calorieInput) / dayData.targetCalories) * 100, 100)}%`,
                          backgroundColor: parseInt(calorieInput) > dayData.targetCalories ? '#F97316' : '#2E86AB'
                        }
                      ]}
                    />
                  </View>
                </View>
              )}
            </View>
          </View>
          )}

          {/* Notes */}
          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <MaterialIcons name="description" size={20} color={colors.primary} />
              <Text style={styles.label}>Notes (Optional)</Text>
            </View>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="e.g. Added extra rice, swapped for whole wheat..."
              placeholderTextColor={colors.textSecondary}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              value={descriptionInput}
              onChangeText={setDescriptionInput}
            />
          </View>

          {inputMethod === 'audio' && (
            <View style={styles.audioSection}>
              <Ionicons name="lock-closed" size={Math.min(hp(5), wp(12))} color="#CCCCCC" />
              <Text style={styles.audioInstructions}>Voice input coming soon</Text>
              <Text style={styles.comingSoonMessage}>We're working on voice recognition for meal logging</Text>
            </View>
          )}
          {inputMethod === 'photo' && (
            <View style={styles.audioSection}>
              <Ionicons name="lock-closed" size={Math.min(hp(5), wp(12))} color="#CCCCCC" />
              <Text style={styles.audioInstructions}>Photo input coming soon</Text>
              <Text style={styles.comingSoonMessage}>We're working on AI food recognition</Text>
            </View>
          )}
        </View>

        <View style={styles.menuButtons}>
          <TouchableOpacity style={styles.backMenuButton} onPress={closeMenu}>
            <Ionicons name="arrow-back" size={Math.min(hp(2.2), wp(5))} color={colors.primary} />
            <Text style={styles.backMenuText}>Back</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.submitMenuButton, (((!calorieInput.trim() && parseFloat(waterInput || '0') <= 0)) || isLoading) && {opacity: 0.5}]}
            disabled={(((!calorieInput.trim() && parseFloat(waterInput || '0') <= 0)) || isLoading)}
            onPress={async () => {
              setIsLoading(true);
              try {
                const dayLogId = (dayData as any)._id || (props as any)._id;

                if (!dayLogId) {
                  Alert.alert('Error', 'Unable to find day log. Please refresh and try again.');
                  return;
                }

                let hasMeal = false;
                let hasWater = false;
                let successMessages = [];
                let updatedDayData: any = { ...dayData };

                // Log meal if calories are entered
                if (calorieInput.trim()) {
                  const calories = parseInt(calorieInput);
                  const foodName = selectedFoodItem?.food_name || selectedFoodItem?.name || 'Custom Meal';
                  const servingSize = selectedFoodItem?.serving_size || 'portion';
                  const quantity = parseFloat(mealQuantity || '1');
                  
                  // Calculate nutrition values multiplied by quantity
                  const baseProtein = selectedFoodItem?.protein_g || 0;
                  const baseCarbs = selectedFoodItem?.carbs_g || selectedFoodItem?.carbohydrates_g || 0;
                  const baseFats = selectedFoodItem?.fat_g || 0;
                  
                  const protein = Math.round(baseProtein * quantity);
                  const carbs = Math.round(baseCarbs * quantity);
                  const fats = Math.round(baseFats * quantity);

                  const mealResponse = await dailyLogsApi.addMeal(
                    dayLogId,
                    foodName,
                    quantity,
                    servingSize,
                    calories,
                    protein,
                    carbs,
                    fats,
                    descriptionInput
                  );

                  if (mealResponse) {
                    hasMeal = true;
                    successMessages.push(`${calories} calories logged`);
                    
                    updatedDayData = {
                      ...updatedDayData,
                      achievedCalories: (updatedDayData.achievedCalories || 0) + calories,
                      meals: updatedDayData.meals ? [...updatedDayData.meals, mealResponse] : [mealResponse],
                    };
                  }
                }

                // Log water if amount is entered
                const waterAmount = parseFloat(waterInput || '0');
                if (waterAmount > 0) {
                  const waterResponse = await dailyLogsApi.addWater(dayLogId, waterAmount);

                  if (waterResponse) {
                    hasWater = true;
                    successMessages.push(`${waterAmount}L of water logged`);
                    
                    // Update with full response data to ensure accuracy
                    updatedDayData = {
                      ...updatedDayData,
                      achieviedHydration: waterResponse.achieviedHydration || (updatedDayData.achieviedHydration || 0) + waterAmount,
                      waterIntake: waterResponse.waterIntake || updatedDayData.waterIntake,
                    };
                  }
                }

                // Show combined success message
                if (hasMeal || hasWater) {
                  // Update state once with all changes
                  setDayData(updatedDayData);
                  
                  // Reset forms immediately
                  setFoodSearch('');
                  setSelectedFoodItem(null);
                  setCalorieInput('');
                  setMealQuantity('1');
                  setDescriptionInput('');
                  setWaterInput('0.25');
                  
                  // Use setTimeout to ensure state updates are processed
                  setTimeout(() => {
                    closeMenu();
                    
                    Alert.alert(
                      'Success! ✅',
                      successMessages.join('\n')
                    );
                  }, 100);
                } else {
                  Alert.alert('Error', 'Please enter at least meal calories or water amount');
                }
              } catch (error) {
                console.error('Error logging:', error);
                Alert.alert('Error', 'Failed to log entry. Please check your connection.');
              } finally {
                setIsLoading(false);
              }
            }}
          >
            <Text style={styles.submitMenuText}>Save Entry</Text>
            <Ionicons name="checkmark" size={Math.min(hp(2.2), wp(5))} color="white" />
          </TouchableOpacity>
        </View>
      </KeyboardAwareScrollView>
    )}
  </View>
);

}
const getStyles = (colors: any) => StyleSheet.create({
    heading: {
        paddingHorizontal: HEADER_PADDING_HORIZONTAL,
        paddingVertical: hp(1.2),
        marginBottom: 8,
        backgroundColor: colors.screenColor,
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    dayDateWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        justifyContent: 'center',
    },
    dayBadge: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius: 10,
        elevation: 6,
    },
    dayNumber: {
        fontSize: 24,
        fontWeight: '800',
        color: 'white',
        letterSpacing: 0.5,
    },
    dateInfo: {
        justifyContent: 'center',
    },
    dayLabel: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.textPrimary,
        letterSpacing: 0.3,
    },
    date: {
        fontSize: 13,
        fontWeight: '500',
        color: colors.textSecondary,
        marginTop: 4,
    },
    backButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: colors.surface,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: "#000",
        shadowOpacity: 0.08,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: hp(12),
    },
    centerBody:{
        flex: 1,
        justifyContent:'space-between',
    },
    topSection: {
        alignItems: 'center',
        marginBottom: hp(2),
    },
    circleWrapper: {
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: "#000",
        shadowOpacity: 0.1,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
        elevation: 4,
    },
    circleButton: {
        height: Math.min(hp(20), wp(40)),
        width: Math.min(hp(20), wp(40)),
    },
    remarksContainer: {
        marginTop: hp(1.5),
        marginBottom: hp(1),
        paddingHorizontal: wp(4),
        paddingVertical: hp(1.2),
        backgroundColor: colors.primary + '12',
        borderRadius: 12,
        borderLeftWidth: 4,
        borderLeftColor: colors.primary,
        marginHorizontal: wp(4),
        shadowColor: colors.primary,
        shadowOpacity: 0.1,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
    },
    remarksText: {
        fontSize: Math.min(hp(1.5), wp(3.6)),
        fontStyle: 'italic',
        color: colors.textPrimary,
        textAlign: 'center',
        fontWeight: '500',
    },
    infoOuterBox:{
        paddingHorizontal: wp(4),
        marginVertical: hp(1.5),
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Math.min(hp(1.2), wp(2.5)),
        justifyContent: 'space-between',
        marginBottom: hp(1.5),
    },
    statCard: {
        width: '48%',
        minHeight: Math.min(hp(14), wp(30)),
        maxHeight: Math.min(hp(14), wp(30)),
        backgroundColor: colors.cardBackground,
        borderRadius: 16,
        padding: Math.min(hp(1.4), wp(3)),
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: colors.primary,
        shadowOpacity: 0.12,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 3 },
        elevation: 4,
        borderWidth: 2,
        borderColor: '#000000',
        overflow: 'hidden',
    },
    statCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: wp(1.2),
        marginBottom: hp(0.8),
    },
    statCardContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: wp(1.2),
        marginBottom: hp(0.6),
    },
    goalRowContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
        width: '100%',
        paddingHorizontal: wp(1.5),
    },
    goalItem: {
        alignItems: 'center',
        flex: 1,
    },
    goalDivider: {
        width: 1.5,
        height: hp(4),
        backgroundColor: colors.gray + '30',
        marginHorizontal: wp(1.5),
    },
    statLabel: {
        fontSize: Math.min(hp(1.2), wp(2.8)),
        fontWeight: '700',
        color: colors.textSecondary,
        marginTop: hp(0.2),
        marginBottom: hp(0.2),
        textTransform: 'uppercase',
        letterSpacing: 0.4,
    },
    statValue: {
        fontSize: Math.min(hp(2.4), wp(5.5)),
        fontWeight: 'bold',
        color: colors.textPrimary,
        marginBottom: hp(0.1),
    },
    statValueLarge: {
        fontSize: Math.min(hp(2), wp(4.5)),
        fontWeight: 'bold',
        color: colors.textPrimary,
        letterSpacing: 0.3,
    },
    statUnit: {
        fontSize: Math.min(hp(1), wp(2.3)),
        color: colors.textSecondary,
        marginBottom: hp(0.2),
        fontWeight: '500',
    },
    input: {
        borderWidth: 1.5,
        borderColor: colors.gray + '40',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        backgroundColor: colors.cardBackground,
        color: colors.textPrimary,
        fontSize: 15,
        fontWeight: '500',
    },
    trayButton: {
        flexDirection: 'row',
        backgroundColor: colors.primary,
        paddingVertical: hp(1.8),
        paddingHorizontal: wp(6),
        marginHorizontal: wp(4),
        marginTop: hp(1.5),
        marginBottom: hp(1),
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        shadowColor: colors.primary,
        shadowOpacity: 0.4,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 5 },
        elevation: 6,
        borderWidth: 1,
        borderColor: colors.primary,
    },
    trayButtonText: {
        color: '#fff',
        fontSize: Math.min(hp(1.7), wp(4)),
        fontWeight: '700',
        letterSpacing: 0.3,
    },
    congratsContainer: {
        backgroundColor: colors.success + '15',
        borderRadius: 16,
        padding: hp(2),
        marginHorizontal: wp(4),
        marginTop: hp(2),
        marginBottom: hp(1),
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#000000',
        shadowColor: colors.success,
        shadowOpacity: 0.2,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 3 },
        elevation: 4,
    },
    congratsTitle: {
        fontSize: Math.min(hp(2.2), wp(5.5)),
        fontWeight: 'bold',
        color: colors.success,
        marginTop: hp(1),
        marginBottom: hp(0.5),
    },
    congratsText: {
        fontSize: Math.min(hp(1.6), wp(3.8)),
        color: colors.textPrimary,
        textAlign: 'center',
        lineHeight: Math.min(hp(2.2), wp(5)),
    },
    progressSection: {
        marginTop: hp(2),
        gap: hp(1.5),
        marginHorizontal: wp(4),
    },
    progressItem: {
        backgroundColor: colors.cardBackground,
        borderRadius: 16,
        padding: Math.min(hp(1.6), wp(3.8)),
        shadowColor: colors.primary,
        shadowOpacity: 0.12,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 3 },
        elevation: 4,
        borderWidth: 2,
        borderColor: '#000000',
        overflow: 'hidden',
    },
    progressHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: wp(1.8),
        marginBottom: hp(1),
    },
    progressLabel: {
        fontSize: Math.min(hp(1.5), wp(3.5)),
        fontWeight: '700',
        color: colors.textPrimary,
        letterSpacing: 0.2,
    },
    progressBarContainer: {
        height: hp(1.4),
        backgroundColor: colors.gray + '15',
        borderRadius: 8,
        overflow: 'hidden',
        marginBottom: hp(0.8),
        shadowColor: "#000",
        shadowOpacity: 0.05,
        shadowRadius: 2,
        shadowOffset: { width: 0, height: 1 },
        elevation: 1,
    },
    progressBar: {
        height: '100%',
        borderRadius: 8,
    },
    progressPercentage: {
        fontSize: Math.min(hp(1.9), wp(4.5)),
        fontWeight: 'bold',
        color: colors.primary,
        textAlign: 'right',
    },
    Foodtray: {
        width: "100%",
        padding: 15,
        borderTopWidth: 1,
        borderTopColor: "#ddd",
        backgroundColor: "#fafafa",
        alignItems: "center",
    },
    FoodSubmitButton: {
        width: "90%",
        backgroundColor: "#02ABFF",
        paddingVertical: 15,
        borderRadius: 10,
        alignItems: "center",
    },
    FoodSubmitButtonText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "700",
    },
    menuOverlay: {
        flex: 1,
        backgroundColor: colors.screenColor,
    },
    menuScrollContent: {
        flexGrow: 1,
        paddingHorizontal: wp(5),
        paddingTop: hp(3),
        paddingBottom: hp(15),
        justifyContent: 'space-between',
    },
    menuContent: {
        flex: 1,
    },
    menuHeader: {
        alignItems: "center",
        marginBottom: hp(2),
        paddingBottom: hp(1.5),
        borderBottomWidth: 1,
        borderBottomColor: colors.gray + '30',
    },
    menuTitle: {
        fontSize: Math.min(hp(2.8), wp(6.5)),
        fontWeight: "700",
        marginTop: hp(0.8),
        color: colors.textPrimary,
    },
    menuSubtitle: {
        fontSize: Math.min(hp(1.6), wp(3.8)),
        color: colors.textSecondary,
        marginTop: hp(0.4),
    },
    inputGroup: {
        marginBottom: hp(1.5),
    },
    labelRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: hp(0.8),
    },
    label: {
        fontSize: Math.min(hp(1.8), wp(4.2)),
        fontWeight: "600",
        marginLeft: wp(2),
        color: colors.textPrimary,
    },
    textArea: {
        height: hp(14),
        paddingTop: hp(1.2),
        textAlignVertical: 'top',
    },
    inputMethodSection: {
        marginVertical: hp(1.5),
    },
    sectionTitle: {
        fontSize: Math.min(hp(1.8), wp(4.2)),
        fontWeight: "600",
        color: colors.textPrimary,
        marginBottom: hp(1),
    },
    inputMethodButtons: {
        flexDirection: "row",
        justifyContent: "space-between",
        gap: wp(2),
    },
    inputMethodButton: {
        flex: 1,
        paddingVertical: hp(1.5),
        paddingHorizontal: wp(2),
        borderRadius: 12,
        backgroundColor: colors.cardBackground,
        borderWidth: 2,
        borderColor: colors.gray + '30',
        alignItems: "center",
        gap: hp(0.4),
    },
    inputMethodButtonActive: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    inputMethodText: {
        fontSize: Math.min(hp(1.6), wp(3.6)),
        fontWeight: "600",
        color: colors.textPrimary,
        marginTop: hp(0.3),
    },
    inputMethodTextActive: {
        color: 'white',
    },
    disabledButton: {
        flex: 1,
        paddingVertical: hp(1.5),
        paddingHorizontal: wp(2),
        borderRadius: 12,
        backgroundColor: colors.gray + '10',
        borderWidth: 2,
        borderColor: colors.gray + '30',
        alignItems: "center",
        gap: hp(0.4),
        opacity: 0.6,
    },
    disabledButtonText: {
        fontSize: Math.min(hp(1.6), wp(3.6)),
        fontWeight: "600",
        color: '#CCCCCC',
        marginTop: hp(0.3),
    },
    comingSoonBadge: {
        fontSize: Math.min(hp(1.2), wp(2.8)),
        fontWeight: "600",
        color: '#FF9500',
        marginTop: hp(0.2),
        paddingHorizontal: wp(1.5),
        paddingVertical: hp(0.2),
        backgroundColor: '#FF950010',
        borderRadius: 4,
    },
    dynamicInputSection: {
        flex: 1,
        marginTop: hp(1),
    },
    audioSection: {
        alignItems: 'center',
        paddingVertical: hp(2),
        flex: 1,
        justifyContent: 'center',
    },
    audioInstructions: {
        fontSize: Math.min(hp(1.8), wp(4.2)),
        color: colors.textSecondary,
        textAlign: 'center',
        marginBottom: hp(3),
        paddingHorizontal: wp(5),
        lineHeight: Math.min(hp(2.4), wp(5.5)),
    },
    audioRecordContainer: {
        alignItems: 'center',
        marginBottom: hp(2),
    },
    audioRecordButton: {
        width: Math.min(hp(10), wp(22)),
        height: Math.min(hp(10), wp(22)),
        borderRadius: Math.min(hp(5), wp(11)),
        backgroundColor: colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    audioRecordButtonActive: {
        backgroundColor: '#FF3B30',
        shadowColor: '#FF3B30',
    },
    stopIconContainer: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    stopIcon: {
        width: Math.min(hp(3), wp(6.5)),
        height: Math.min(hp(3), wp(6.5)),
        backgroundColor: 'white',
        borderRadius: 4,
    },
    recordingIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: hp(2),
        paddingHorizontal: wp(4),
        paddingVertical: hp(1),
        backgroundColor: '#FF3B3015',
        borderRadius: 20,
        gap: wp(2),
    },
    recordingDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#FF3B30',
    },
    recordingText: {
        fontSize: Math.min(hp(1.6), wp(3.8)),
        fontWeight: '600',
        color: '#FF3B30',
    },
    audioPreview: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: hp(2),
        paddingHorizontal: wp(4),
        paddingVertical: hp(1.2),
        backgroundColor: colors.success + '15',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.success + '30',
        width: '90%',
    },
    audioPreviewLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: wp(2),
    },
    audioPreviewText: {
        color: colors.success,
        fontWeight: '600',
        fontSize: Math.min(hp(1.7), wp(4)),
    },
    clearButton: {
        padding: hp(0.6),
        backgroundColor: colors.error + '15',
        borderRadius: 8,
    },
    photoSection: {
        paddingVertical: hp(1.5),
        flex: 1,
        justifyContent: 'center',
    },
    photoInstructions: {
        fontSize: Math.min(hp(1.7), wp(4)),
        color: colors.textSecondary,
        textAlign: 'center',
        marginBottom: hp(2),
    },
    photoButtons: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: hp(1.5),
        gap: wp(3),
    },
    photoButton: {
        alignItems: 'center',
        paddingVertical: hp(2),
        paddingHorizontal: wp(4),
        borderRadius: 12,
        backgroundColor: colors.cardBackground,
        borderWidth: 2,
        borderColor: colors.gray + '30',
        flex: 1,
        gap: hp(0.6),
    },
    photoButtonText: {
        fontSize: Math.min(hp(1.6), wp(3.6)),
        fontWeight: '500',
        color: colors.textPrimary,
    },
    photoPreview: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        backgroundColor: colors.success + '10',
        borderRadius: 10,
        gap: 8,
        marginBottom: 16,
    },
    photoPreviewText: {
        flex: 1,
        color: colors.success,
        fontWeight: '500',
    },
    optionalLabel: {
        fontSize: 14,
        color: colors.textSecondary,
        marginBottom: 8,
    },
    Foodinput: {
        borderWidth: 1,
        borderColor: "#ccc",
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 8,
        marginTop: 8,
    },
    menuButtons: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginTop: hp(1),
        marginBottom: hp(1.5),
        gap: wp(3),
    },
    backMenuButton: {
        flex: 1,
        flexDirection: "row",
        paddingVertical: hp(1.8),
        borderWidth: 2,
        borderColor: '#000000',
        borderRadius: 14,
        alignItems: "center",
        justifyContent: "center",
        gap: wp(1.5),
        backgroundColor: colors.cardBackground,
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 2,
    },
    backMenuText: {
        color: colors.primary,
        fontWeight: "600",
        fontSize: Math.min(hp(1.8), wp(4.2)),
    },
    submitMenuButton: {
        flex: 1,
        flexDirection: "row",
        backgroundColor: colors.primary,
        paddingVertical: hp(1.8),
        borderRadius: 14,
        alignItems: "center",
        justifyContent: "center",
        gap: wp(1.5),
        shadowColor: colors.primary,
        shadowOpacity: 0.4,
        shadowRadius: 10,
        elevation: 6,
        borderWidth: 1,
        borderColor: colors.primary,
    },
    submitMenuText: {
        color: "#fff",
        fontWeight: "700",
        fontSize: Math.min(hp(1.8), wp(4.2)),
    },
    timePickerButton: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    timePickerText: {
        fontSize: 16,
        color: colors.textPrimary,
    },
    timeDoneButton: {
        backgroundColor: colors.primary,
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 8,
        alignSelf: 'center',
        marginTop: 10,
    },
    timeDoneText: {
        color: 'white',
        fontWeight: '600',
        fontSize: 16,
    },
    // Suggestion styles
    suggestionsSection: {
        marginBottom: hp(2),
    },
    suggestionTitle: {
        fontSize: Math.min(hp(1.7), wp(4)),
        fontWeight: '700',
        color: colors.textPrimary,
        marginBottom: hp(1),
        marginLeft: wp(1),
    },
    suggestionsScroll: {
        marginHorizontal: -wp(5),
        paddingHorizontal: wp(5),
    },
    suggestionsContent: {
        gap: wp(2),
        paddingRight: wp(5),
    },
    suggestionCard: {
        backgroundColor: colors.primary + '15',
        borderRadius: 12,
        paddingHorizontal: wp(3.5),
        paddingVertical: hp(1),
        borderLeftWidth: 4,
        borderLeftColor: colors.primary,
        minWidth: wp(35),
    },
    suggestionFoodName: {
        fontSize: Math.min(hp(1.5), wp(3.5)),
        fontWeight: '600',
        color: colors.textPrimary,
        marginBottom: hp(0.3),
    },
    suggestionCalories: {
        fontSize: Math.min(hp(1.4), wp(3.2)),
        fontWeight: '700',
        color: colors.primary,
    },
    // Food search styles
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.cardBackground,
        borderWidth: 1,
        borderColor: colors.gray + '50',
        borderRadius: 10,
        paddingHorizontal: wp(3),
    },
    searchInput: {
        flex: 1,
        paddingVertical: hp(1.2),
        fontSize: 16,
        color: colors.textPrimary,
    },
    searchResults: {
        marginTop: hp(1),
        backgroundColor: colors.cardBackground,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: colors.gray + '30',
        overflow: 'hidden',
        maxHeight: hp(25),
    },
    resultItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: wp(3),
        paddingVertical: hp(1.2),
        borderBottomWidth: 1,
        borderBottomColor: colors.gray + '20',
    },
    resultInfo: {
        flex: 1,
    },
    resultFoodName: {
        fontSize: Math.min(hp(1.6), wp(3.8)),
        fontWeight: '600',
        color: colors.textPrimary,
        marginBottom: hp(0.2),
    },
    resultCategory: {
        fontSize: Math.min(hp(1.3), wp(3)),
        color: colors.textSecondary,
    },
    resultCalories: {
        fontSize: Math.min(hp(1.6), wp(3.8)),
        fontWeight: 'bold',
        color: colors.primary,
        marginLeft: wp(2),
    },
    noResults: {
        textAlign: 'center',
        paddingVertical: hp(2),
        color: colors.textSecondary,
        fontSize: Math.min(hp(1.5), wp(3.5)),
    },
    // Selected food display
    selectedFoodBox: {
        backgroundColor: colors.success + '10',
        borderRadius: 12,
        padding: wp(4),
        marginBottom: hp(1.5),
        borderWidth: 2,
        borderColor: colors.success + '30',
    },
    selectedFoodHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: hp(1),
    },
    selectedFoodInfo: {
        flex: 1,
        marginLeft: wp(2),
    },
    selectedFoodName: {
        fontSize: Math.min(hp(1.7), wp(4)),
        fontWeight: '700',
        color: colors.textPrimary,
    },
    selectedFoodCalories: {
        fontSize: Math.min(hp(1.4), wp(3.2)),
        color: colors.success,
        fontWeight: '600',
        marginTop: hp(0.2),
    },
    selectedFoodServing: {
        fontSize: Math.min(hp(1.2), wp(2.8)),
        color: colors.textSecondary,
        marginTop: hp(0.3),
    },
    nutritionBreakdown: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: wp(3),
        marginTop: hp(1.2),
        paddingTop: hp(1.2),
        borderTopWidth: 1,
        borderTopColor: colors.success + '20',
    },
    nutritionItem: {
        minWidth: wp(20),
    },
    nutritionLabel: {
        fontSize: Math.min(hp(1.2), wp(2.8)),
        color: colors.textSecondary,
        marginBottom: hp(0.3),
    },
    nutritionValue: {
        fontSize: Math.min(hp(1.6), wp(3.8)),
        fontWeight: '700',
        color: colors.textPrimary,
    },
    // Quantity selector
    quantitySection: {
        marginTop: hp(1),
        paddingTop: hp(1),
        borderTopWidth: 1,
        borderTopColor: colors.gray + '20',
    },
    quantityLabel: {
        fontSize: Math.min(hp(1.4), wp(3.2)),
        fontWeight: '600',
        color: colors.textPrimary,
        marginBottom: hp(0.8),
    },
    quantityInputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: wp(2),
    },
    quantityBtn: {
        width: wp(10),
        height: wp(10),
        borderRadius: wp(5),
        backgroundColor: colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    quantityBtnText: {
        fontSize: 20,
        fontWeight: 'bold',
        color: 'white',
    },
    quantityInput: {
        flex: 1,
        borderWidth: 1,
        borderColor: colors.gray + '50',
        borderRadius: 8,
        paddingHorizontal: wp(2),
        paddingVertical: hp(0.8),
        fontSize: 16,
        color: colors.textPrimary,
        textAlign: 'center',
    },
    // Calorie input
    calorieInputContainer: {
        gap: hp(1),
    },
    calorieInfo: {
        backgroundColor: colors.primary + '10',
        padding: wp(3),
        borderRadius: 10,
        borderLeftWidth: 4,
        borderLeftColor: colors.primary,
    },
    calorieInfoText: {
        fontSize: Math.min(hp(1.4), wp(3.2)),
        fontWeight: '600',
        color: colors.textPrimary,
        marginBottom: hp(0.6),
    },
    calorieBar: {
        height: hp(1),
        backgroundColor: colors.gray + '20',
        borderRadius: hp(0.5),
        overflow: 'hidden',
    },
    calorieBarFill: {
        height: '100%',
        borderRadius: hp(0.5),
    },
    comingSoonMessage: {
        fontSize: Math.min(hp(1.5), wp(3.5)),
        color: colors.textSecondary,
        marginTop: hp(0.8),
        textAlign: 'center',
    },
    // Water intake styles
    waterOptionsContainer: {
        gap: hp(1),
        marginBottom: hp(2),
    },
    waterOptionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: wp(3),
        backgroundColor: colors.gray + '10',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.primary + '30',
        marginBottom: hp(0.8),
    },
    waterOptionText: {
        marginLeft: wp(2),
        fontSize: Math.min(hp(1.6), wp(4)),
        color: colors.textPrimary,
        fontWeight: '500',
    },
    customWaterSection: {
        backgroundColor: colors.primary + '10',
        padding: wp(3),
        borderRadius: 10,
        borderLeftWidth: 4,
        borderLeftColor: '#2E86AB',
    },
    inputLabel: {
        fontSize: Math.min(hp(1.4), wp(3.2)),
        fontWeight: '600',
        color: colors.textPrimary,
        marginBottom: hp(1),
    },
    waterInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: wp(2),
        marginBottom: hp(1),
    },
    quantityButton: {
        width: wp(10),
        height: wp(10),
        borderRadius: wp(5),
        backgroundColor: colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    quantityButtonText: {
        fontSize: Math.min(hp(2.5), wp(6)),
        fontWeight: 'bold',
        color: 'white',
    },
    waterAmountInput: {
        flex: 1,
        borderWidth: 1,
        borderColor: colors.gray + '50',
        borderRadius: 8,
        paddingHorizontal: wp(2),
        paddingVertical: hp(0.8),
        fontSize: 16,
        color: colors.textPrimary,
        textAlign: 'center',
    },
    waterDisplayText: {
        fontSize: Math.min(hp(1.4), wp(3.5)),
        color: colors.textSecondary,
        textAlign: 'center',
        marginTop: hp(0.8),
        fontWeight: '500',
    },
    // New Dual Input Styles
    sectionTitleText: {
        fontSize: Math.min(hp(2), wp(5)),
        fontWeight: 'bold',
        color: colors.textPrimary,
        marginBottom: hp(1.5),
        marginLeft: wp(4),
    },
    dualInputContainer: {
        flexDirection: 'row',
        paddingHorizontal: wp(4),
        marginBottom: hp(2),
        gap: wp(3),
    },
    trackingContentCard: {
        backgroundColor: colors.cardBackground,
        borderRadius: wp(4),
        padding: wp(4),
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    // New Professional Styles
    sectionContainer: {
        marginBottom: hp(2.5),
    },
    sectionLabel: {
        fontSize: Math.min(hp(1.8), wp(4)),
        fontWeight: '700',
        color: colors.textPrimary,
        marginBottom: hp(1.2),
        letterSpacing: 0.3,
    },
    fieldContainer: {
        marginBottom: hp(2.5),
    },
    fieldLabel: {
        fontSize: Math.min(hp(1.6), wp(3.8)),
        fontWeight: '600',
        color: colors.textPrimary,
        marginBottom: hp(1),
        flexDirection: 'row',
        alignItems: 'center',
    },
    // Image Upload Button Styles
    imageUploadButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.primary,
        borderRadius: wp(3),
        padding: wp(4),
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
        marginBottom: hp(1),
    },
    imageUploadIconContainer: {
        width: wp(12),
        height: wp(12),
        borderRadius: wp(6),
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: wp(3),
    },
    imageUploadTextContainer: {
        flex: 1,
    },
    imageUploadTitle: {
        fontSize: Math.min(hp(1.8), wp(4.2)),
        fontWeight: '700',
        color: '#FFFFFF',
        marginBottom: hp(0.3),
    },
    imageUploadSubtitle: {
        fontSize: Math.min(hp(1.3), wp(3)),
        color: 'rgba(255, 255, 255, 0.85)',
    },
    // Quick Pick Styles
    quickPickScroll: {
        marginTop: hp(0.5),
    },
    quickPickItem: {
        width: wp(28),
        marginRight: wp(3),
        padding: wp(3),
        backgroundColor: colors.cardBackground,
        borderRadius: wp(3),
        alignItems: 'center',
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.12,
        shadowRadius: 6,
        elevation: 3,
        borderWidth: 2,
        borderColor: '#000000',
    },
    quickPickIcon: {
        width: wp(12),
        height: wp(12),
        borderRadius: wp(6),
        backgroundColor: colors.primary + '15',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: hp(0.8),
    },
    quickPickName: {
        fontSize: Math.min(hp(1.4), wp(3.2)),
        fontWeight: '600',
        color: colors.textPrimary,
        textAlign: 'center',
        marginBottom: hp(0.5),
        minHeight: hp(4),
    },
    quickPickCalories: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: wp(1),
    },
    quickPickCalText: {
        fontSize: Math.min(hp(1.3), wp(3)),
        fontWeight: '700',
        color: '#F97316',
    },
    // Search Input Styles
    searchInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.cardBackground,
        borderRadius: wp(3),
        paddingHorizontal: wp(3),
        paddingVertical: hp(1.2),
        borderWidth: 2,
        borderColor: '#000000',
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
        elevation: 2,
    },
    searchIconLeft: {
        marginRight: wp(2),
    },
    searchInputField: {
        flex: 1,
        fontSize: Math.min(hp(1.7), wp(4)),
        color: colors.textPrimary,
        padding: 0,
    },
    searchClearButton: {
        padding: wp(1),
    },
    // Search Results Styles
    searchResultsContainer: {
        marginTop: hp(1),
        backgroundColor: colors.cardBackground,
        borderRadius: wp(3),
        overflow: 'hidden',
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 4,
        borderWidth: 2,
        borderColor: '#000000',
    },
    searchResultsHeader: {
        fontSize: Math.min(hp(1.4), wp(3.3)),
        fontWeight: '600',
        color: colors.textSecondary,
        padding: wp(3),
        backgroundColor: colors.gray + '10',
        borderBottomWidth: 1,
        borderBottomColor: colors.borderColor || '#E5E7EB',
    },
    searchResultsScroll: {
        maxHeight: hp(35),
    },
    searchResultCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: wp(4),
        borderBottomWidth: 1,
        borderBottomColor: colors.borderColor || '#E5E7EB',
        backgroundColor: colors.cardBackground,
    },
    searchResultLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        marginRight: wp(3),
    },
    searchResultIconBg: {
        width: wp(10),
        height: wp(10),
        borderRadius: wp(5),
        backgroundColor: colors.primary + '15',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: wp(3),
    },
    searchResultInfo: {
        flex: 1,
    },
    searchResultTitle: {
        fontSize: Math.min(hp(1.7), wp(4)),
        fontWeight: '600',
        color: colors.textPrimary,
        marginBottom: hp(0.3),
    },
    searchResultMeta: {
        fontSize: Math.min(hp(1.3), wp(3)),
        color: colors.textSecondary,
    },
    searchResultRight: {
        alignItems: 'flex-end',
    },
    searchResultCalValue: {
        fontSize: Math.min(hp(2), wp(4.8)),
        fontWeight: '700',
        color: '#F97316',
    },
    searchResultCalLabel: {
        fontSize: Math.min(hp(1.2), wp(2.8)),
        color: colors.textSecondary,
        marginTop: hp(0.2),
    },
    // Selected Food Container
    selectedFoodContainer: {
        marginBottom: hp(2),
        backgroundColor: colors.cardBackground,
        borderRadius: wp(4),
        padding: wp(4),
        borderWidth: 2,
        borderColor: '#000000',
        shadowColor: colors.success,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    // Drink Specific Styles
    drinkResultCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: wp(4),
        borderBottomWidth: 1,
        borderBottomColor: colors.borderColor || '#E5E7EB',
        backgroundColor: colors.cardBackground,
    },
    drinkResultIconBg: {
        width: wp(10),
        height: wp(10),
        borderRadius: wp(5),
        backgroundColor: '#2E86AB' + '20',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: wp(3),
    },
    drinkMetaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: wp(2),
        marginTop: hp(0.3),
    },
    hydrationBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: wp(1),
        backgroundColor: '#2E86AB' + '20',
        paddingHorizontal: wp(2),
        paddingVertical: hp(0.3),
        borderRadius: wp(2),
    },
    hydrationText: {
        fontSize: Math.min(hp(1.1), wp(2.6)),
        fontWeight: '600',
        color: '#2E86AB',
    },
    drinkCalValue: {
        fontSize: Math.min(hp(2), wp(4.8)),
        fontWeight: '700',
        color: '#2E86AB',
    },
    selectedDrinkCard: {
        marginBottom: hp(2),
        backgroundColor: colors.cardBackground,
        borderRadius: wp(4),
        padding: wp(4),
        borderWidth: 2,
        borderColor: '#000000',
        shadowColor: '#2E86AB',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
        elevation: 5,
    },
    selectedDrinkHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: hp(2),
    },
    drinkIconLarge: {
        marginRight: wp(3),
    },
    selectedDrinkInfo: {
        flex: 1,
    },
    selectedDrinkName: {
        fontSize: Math.min(hp(1.8), wp(4.3)),
        fontWeight: '700',
        color: colors.textPrimary,
        marginBottom: hp(0.3),
    },
    selectedDrinkServing: {
        fontSize: Math.min(hp(1.3), wp(3)),
        color: colors.textSecondary,
    },
    removeDrinkBtn: {
        padding: wp(2),
    },
    drinkNutritionGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: wp(3),
        marginBottom: hp(2),
        paddingTop: hp(1.5),
        borderTopWidth: 1,
        borderTopColor: colors.borderColor || '#E5E7EB',
    },
    drinkNutritionItem: {
        minWidth: wp(20),
        alignItems: 'center',
        gap: hp(0.5),
    },
    drinkNutritionValue: {
        fontSize: Math.min(hp(1.8), wp(4.2)),
        fontWeight: '700',
        color: '#2E86AB',
    },
    drinkNutritionLabel: {
        fontSize: Math.min(hp(1.2), wp(2.8)),
        color: colors.textSecondary,
    },
    quantityControlSection: {
        marginTop: hp(1),
    },
    quantityControlLabel: {
        fontSize: Math.min(hp(1.5), wp(3.5)),
        fontWeight: '600',
        color: colors.textPrimary,
        marginBottom: hp(1),
    },
    quantityControls: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: wp(3),
    },
    quantityControlBtn: {
        padding: wp(2),
        backgroundColor: colors.cardBackground,
        borderRadius: wp(2),
        borderWidth: 1,
        borderColor: colors.borderColor || '#E5E7EB',
    },
    quantityDisplay: {
        alignItems: 'center',
        backgroundColor: colors.gray + '10',
        paddingHorizontal: wp(4),
        paddingVertical: hp(1),
        borderRadius: wp(2),
        minWidth: wp(25),
    },
    quantityDisplayInput: {
        fontSize: Math.min(hp(2.5), wp(6)),
        fontWeight: '700',
        color: colors.textPrimary,
        textAlign: 'center',
        padding: 0,
    },
    quantityDisplayUnit: {
        fontSize: Math.min(hp(1.2), wp(2.8)),
        color: colors.textSecondary,
        marginTop: hp(0.3),
    },
    // Water Styles
    waterQuickGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: wp(3),
        marginTop: hp(1),
    },
    waterQuickOption: {
        width: wp(42),
        padding: wp(4),
        backgroundColor: colors.cardBackground,
        borderRadius: wp(3),
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#000000',
        shadowColor: '#2E86AB',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
        elevation: 3,
    },
    waterQuickIconBg: {
        marginBottom: hp(1),
    },
    waterQuickLabel: {
        fontSize: Math.min(hp(1.5), wp(3.5)),
        fontWeight: '600',
        color: colors.textPrimary,
        marginBottom: hp(0.5),
    },
    waterQuickAmount: {
        fontSize: Math.min(hp(1.8), wp(4.2)),
        fontWeight: '700',
        color: '#2E86AB',
    },
    waterAmountSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: hp(1),
    },
    waterAdjustButton: {
        padding: wp(2),
    },
    waterDisplayBox: {
        flex: 1,
        backgroundColor: colors.cardBackground,
        borderRadius: wp(4),
        padding: wp(4),
        alignItems: 'center',
        marginHorizontal: wp(2),
        borderWidth: 2,
        borderColor: '#2E86AB',
        shadowColor: '#2E86AB',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 3,
    },
    waterValueInput: {
        fontSize: Math.min(hp(4), wp(10)),
        fontWeight: '700',
        color: '#2E86AB',
        textAlign: 'center',
        padding: 0,
        minWidth: wp(20),
    },
    waterUnit: {
        fontSize: Math.min(hp(1.6), wp(3.8)),
        fontWeight: '600',
        color: colors.textPrimary,
        marginTop: hp(0.5),
    },
    waterGlasses: {
        fontSize: Math.min(hp(1.3), wp(3)),
        color: colors.textSecondary,
        marginTop: hp(0.3),
    },
    // Progress Styles
    progressContainer: {
        marginTop: hp(2),
        padding: wp(4),
        backgroundColor: colors.cardBackground,
        borderRadius: wp(3),
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.12,
        shadowRadius: 6,
        elevation: 3,
        borderWidth: 2,
        borderColor: '#000000',
    },
    hydProgressHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: hp(1),
    },
    progressTitle: {
        fontSize: Math.min(hp(1.6), wp(3.8)),
        fontWeight: '700',
        color: colors.textPrimary,
    },
    progressPercent: {
        fontSize: Math.min(hp(1.8), wp(4.2)),
        fontWeight: '700',
        color: '#2E86AB',
    },
    progressBarBg: {
        height: hp(1.2),
        backgroundColor: colors.gray + '30',
        borderRadius: hp(0.6),
        overflow: 'hidden',
    },
    progressBarFg: {
        height: '100%',
        borderRadius: hp(0.6),
    },
    progressStats: {
        marginTop: hp(0.8),
    },
    progressCurrent: {
        fontSize: Math.min(hp(1.4), wp(3.2)),
        color: colors.textSecondary,
        fontWeight: '500',
    },
    inputColumn: {
        flex: 1,
        backgroundColor: colors.cardBackground,
        borderRadius: wp(3),
        padding: wp(3),
        borderWidth: 1,
        borderColor: colors.borderColor || '#E5E7EB',
    },
    columnHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: hp(1),
        gap: wp(2),
    },
    columnTitle: {
        fontSize: Math.min(hp(1.8), wp(4.5)),
        fontWeight: '600',
        color: colors.textPrimary,
    },
    miniSuggestionsSection: {
        marginBottom: hp(1.2),
    },
    miniSuggestionsTitle: {
        fontSize: Math.min(hp(1.2), wp(3)),
        fontWeight: '500',
        color: colors.textSecondary,
        marginBottom: hp(0.5),
    },
    miniSuggestionsScroll: {
        maxHeight: hp(6),
    },
    miniSuggestionCard: {
        backgroundColor: colors.primary + '20',
        paddingHorizontal: wp(2),
        paddingVertical: hp(0.6),
        borderRadius: wp(2),
        marginRight: wp(1.5),
        minWidth: wp(18),
        alignItems: 'center',
        justifyContent: 'center',
    },
    miniSuggestionText: {
        fontSize: Math.min(hp(1), wp(2.5)),
        color: colors.primary,
        fontWeight: '500',
        textAlign: 'center',
    },
    miniSuggestionCals: {
        fontSize: Math.min(hp(0.9), wp(2)),
        color: colors.textSecondary,
        marginTop: hp(0.2),
    },
    mealInput: {
        backgroundColor: colors.inputBackground || '#F9FAFB',
        borderWidth: 1,
        borderColor: colors.borderColor || '#E5E7EB',
        borderRadius: wp(2),
        paddingHorizontal: wp(3),
        paddingVertical: hp(0.8),
        fontSize: Math.min(hp(1.4), wp(3.5)),
        color: colors.textPrimary,
        marginBottom: hp(0.8),
    },
    calorieInput: {
        backgroundColor: colors.inputBackground || '#F9FAFB',
        borderWidth: 1,
        borderColor: colors.borderColor || '#E5E7EB',
        borderRadius: wp(2),
        paddingHorizontal: wp(3),
        paddingVertical: hp(0.8),
        fontSize: Math.min(hp(1.4), wp(3.5)),
        color: colors.textPrimary,
        marginBottom: hp(0.8),
    },
    foodResultsList: {
        maxHeight: hp(12),
        backgroundColor: colors.inputBackground || '#F9FAFB',
        borderRadius: wp(2),
        borderWidth: 1,
        borderColor: colors.borderColor || '#E5E7EB',
    },
    foodResultItem: {
        padding: wp(2.5),
        borderBottomWidth: 1,
        borderBottomColor: colors.borderColor || '#E5E7EB',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    foodResultName: {
        fontSize: Math.min(hp(1.2), wp(3)),
        color: colors.textPrimary,
        fontWeight: '500',
        flex: 1,
    },
    foodResultCals: {
        fontSize: Math.min(hp(1.1), wp(2.8)),
        color: colors.primary,
        fontWeight: '600',
    },
    miniWaterCard: {
        backgroundColor: '#2E86AB' + '20',
        paddingHorizontal: wp(2),
        paddingVertical: hp(0.6),
        borderRadius: wp(2),
        marginRight: wp(1.5),
        minWidth: wp(18),
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: wp(1),
    },
    miniWaterText: {
        fontSize: Math.min(hp(1), wp(2.5)),
        color: '#2E86AB',
        fontWeight: '500',
        textAlign: 'center',
    },
    waterControlSection: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: hp(0.8),
        gap: wp(2),
    },
    waterControlButton: {
        width: wp(9),
        height: wp(9),
        borderRadius: wp(2),
        backgroundColor: '#2E86AB' + '20',
        alignItems: 'center',
        justifyContent: 'center',
    },
    waterControlText: {
        fontSize: Math.min(hp(1.8), wp(4.5)),
        color: '#2E86AB',
        fontWeight: 'bold',
    },
    waterInputField: {
        flex: 1,
        backgroundColor: colors.inputBackground || '#F9FAFB',
        borderWidth: 1,
        borderColor: '#2E86AB',
        borderRadius: wp(2),
        paddingHorizontal: wp(3),
        paddingVertical: hp(0.8),
        fontSize: Math.min(hp(1.4), wp(3.5)),
        color: colors.textPrimary,
        textAlign: 'center',
    },
    waterDisplayLabel: {
        fontSize: Math.min(hp(1.1), wp(2.8)),
        color: colors.textSecondary,
        textAlign: 'center',
        marginTop: hp(0.5),
        fontWeight: '500',
    },
    // Glass Counter Styles
    glassCounterSection: {
        backgroundColor: '#2E86AB' + '10',
        borderRadius: wp(3),
        padding: wp(2.5),
        marginTop: hp(1),
        marginBottom: hp(1),
    },
    glassCounterHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: hp(0.5),
        gap: wp(1.5),
    },
    glassCounterTitle: {
        fontSize: Math.min(hp(1.2), wp(3)),
        fontWeight: '600',
        color: '#2E86AB',
    },
    glassCounterDisplay: {
        alignItems: 'center',
        paddingVertical: hp(0.5),
    },
    glassCount: {
        fontSize: Math.min(hp(2), wp(5)),
        fontWeight: 'bold',
        color: '#2E86AB',
    },
    glassLabel: {
        fontSize: Math.min(hp(1), wp(2.5)),
        color: colors.textSecondary,
        marginTop: hp(0.3),
    },
    waterInputDisplay: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: wp(1),
    },
    waterUnitLabel: {
        fontSize: Math.min(hp(1.5), wp(4)),
        fontWeight: '600',
        color: '#2E86AB',
    },
    // Hydration Progress in Input Modal
    hydrationProgressSection: {
        backgroundColor: colors.cardBackground,
        borderRadius: wp(3),
        padding: wp(3),
        marginTop: hp(1.5),
        borderWidth: 1,
        borderColor: '#2E86AB' + '30',
    },
    hydrationProgressHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: hp(0.8),
    },
    hydrationProgressTitle: {
        fontSize: Math.min(hp(1.3), wp(3.5)),
        fontWeight: '600',
        color: colors.textPrimary,
    },
    hydrationProgressPercent: {
        fontSize: Math.min(hp(1.5), wp(4)),
        fontWeight: 'bold',
        color: '#2E86AB',
    },
    hydrationProgressBar: {
        height: hp(1.2),
        backgroundColor: '#E5E7EB',
        borderRadius: wp(2),
        overflow: 'hidden',
        marginBottom: hp(0.8),
    },
    hydrationProgressFill: {
        height: '100%',
        backgroundColor: '#2E86AB',
        borderRadius: wp(2),
    },
    hydrationProgressText: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: wp(1),
    },
    hydrationProgressCurrent: {
        fontSize: Math.min(hp(1), wp(2.5)),
        color: '#2E86AB',
        fontWeight: '500',
    },
    hydrationProgressTarget: {
        fontSize: Math.min(hp(1), wp(2.5)),
        color: colors.textSecondary,
    },
    // Tracking Mode Selector Styles
    trackingModeSection: {
        backgroundColor: colors.cardBg,
        borderRadius: 16,
        padding: wp(5),
        marginBottom: hp(2.5),
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
        elevation: 4,
        borderWidth: 2,
        borderColor: '#000000',
    },
    trackingModeTitle: {
        fontSize: Math.min(hp(1.5), wp(3.5)),
        fontWeight: '600',
        color: colors.textPrimary,
        marginBottom: hp(1.5),
        letterSpacing: 0.3,
    },
    modeToggleContainer: {
        flexDirection: 'row',
        backgroundColor: colors.gray + '05',
        borderRadius: 10,
        padding: wp(2),
        gap: wp(1),
        alignItems: 'center',
    },
    modeButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: hp(1.2),
        paddingHorizontal: wp(3),
        borderRadius: 8,
        backgroundColor: 'transparent',
        gap: wp(1.5),
    },
    modeButtonActive: {
        backgroundColor: colors.primary,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    modeButtonText: {
        fontSize: Math.min(hp(1.4), wp(3.2)),
        fontWeight: '600',
        color: colors.textSecondary,
    },
    modeButtonTextActive: {
        color: '#FFFFFF',
        fontWeight: '700',
    },
    modeButtonDivider: {
        width: 1,
        height: hp(2),
        backgroundColor: colors.gray + '30',
    },
    // Calorie Progress Styles
    calProgressSection: {
        marginTop: hp(1.5),
        marginBottom: hp(2),
        paddingHorizontal: wp(2),
    },
    calProgressHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: hp(0.8),
    },
    calProgressTitle: {
        fontSize: Math.min(hp(1.3), wp(3)),
        fontWeight: '700',
        color: colors.textPrimary,
    },
    calProgressPercent: {
        fontSize: Math.min(hp(1.2), wp(2.8)),
        fontWeight: '700',
        color: colors.primary,
    },
    calProgressBar: {
        height: 8,
        backgroundColor: colors.gray + '20',
        borderRadius: 4,
        marginBottom: hp(0.8),
        overflow: 'hidden',
    },
    calProgressFill: {
        height: '100%',
        backgroundColor: colors.primary,
        borderRadius: 4,
    },
    calProgressText: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: wp(2),
    },
    calProgressCurrent: {
        fontSize: Math.min(hp(1), wp(2.5)),
        color: colors.primary,
        fontWeight: '500',
    },
    calProgressTarget: {
        fontSize: Math.min(hp(1), wp(2.5)),
        color: colors.textSecondary,
    },
})

const AnimatedCircle = Animated.createAnimatedComponent(Circle)

const ProgressCircle = (CircleProps: ProgressCircleProps) =>{
    const { colors } = useTheme();
    const outerRadius = 55;
    const innerRadius = 40;
    const outerCircumference = 2 * Math.PI * outerRadius;
    const innerCircumference = 2 * Math.PI * innerRadius;
    //Dynamic SVG stuff
    const calProgress = useSharedValue(0)
    const hydProgress = useSharedValue(0)
    /**ANIMATED PROPS */
    //Animated props for Calories circle
    const animatedCalProps = useAnimatedProps(()=>{
        return {
            strokeDashoffset: outerCircumference * (1 - calProgress.value),
        }
    },[CircleProps.achievedCalories])
    //Animated props for Hydration circle
    const animatedHydrationProps = useAnimatedProps(()=>{
        return {
            strokeDashoffset: innerCircumference * (1 - hydProgress.value),
        }
    },[CircleProps.achievedCalories])
    /**USE EFFECTS */
    // calories updater
    useEffect(()=>{
        //const target = props.achievedCalories/props.targetCalories
        calProgress.value = withTiming((CircleProps.achievedCalories/CircleProps.targetCalories),{  
                                        duration:1000,
                                        easing: Easing.inOut(Easing.ease)})
    },[CircleProps.achievedCalories])
    //hydration updater
    useEffect(()=>{
        hydProgress.value = withTiming((CircleProps.achieviedHydration/CircleProps.targetHydration),{  
                                        duration:1000,
                                        easing: Easing.inOut(Easing.ease)})
    },[CircleProps.achieviedHydration])
    /**---------------------------------------------------------------------------------------- */
    
    return(
        //<View style={{ width: "80%", aspectRatio: 1, alignSelf: "center" }}>
        <Svg width="100%" height={'100%'} viewBox="0 0 120 120" style={{ maxWidth: 200, alignSelf: "center"}}>
        {/* Background circle of Calories */}
        <Circle  cx="60"  cy="60"  r={outerRadius}
                stroke="#E5E7EB"  strokeWidth="10"  fill="transparent"/>
        {/* Calories progress */}
        <AnimatedCircle  cx="60" cy="60" r={outerRadius}
            stroke={colors.primary}  strokeWidth="10"  fill="transparent"
            strokeDasharray={outerCircumference} //total
            animatedProps={animatedCalProps}
            strokeLinecap="round"transform= "rotate(-90 60 60)" />
        {/* Hydration Circcle */}
        <AnimatedCircle cx="60" cy="60" r={innerRadius}
            stroke="#3B82F6"  strokeWidth="10" fill="transparent"
            strokeDasharray={innerCircumference} 
            animatedProps={animatedHydrationProps}
            strokeLinecap="round" transform="rotate(-90 60 60)"/> 
        </Svg>
            //</View>
    )
}