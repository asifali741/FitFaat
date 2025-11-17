import { goalBasedSuggestions, searchFoods, waterIntakeDatabase } from '@/constants/foodDatabase';
import { HEADER_PADDING_HORIZONTAL, HEADER_PADDING_VERTICAL } from '@/constants/ui';
import { useTheme } from "@/contexts/ThemeContext";
import { dailyLogsApi } from '@/utils/dailyLogsApi';
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import DateTimePicker from '@react-native-community/datetimepicker';
import { Audio } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import Animated, { Easing, runOnJS, useAnimatedProps, useSharedValue, withTiming } from "react-native-reanimated";
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from 'react-native-responsive-screen';
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle } from "react-native-svg";
import { colorsSheet } from "../(settings)/_ui_elements";
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
    const [adviceInput, setAdviceInput] = useState<string>('');
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
    
    // Initialize suggested foods based on user's goal
    useEffect(() => {
      const userGoal = (props as any).userGoal || 3; // Default to maintenance
      const suggestions = goalBasedSuggestions[userGoal as keyof typeof goalBasedSuggestions];
      if (suggestions) {
        setSuggestedFoods(suggestions.foods);
      }
    }, [props]);
    
    // Handle food search
    useEffect(() => {
      if (foodSearch.trim()) {
        const results = searchFoods(foodSearch);
        setFilteredFoods(results);
        setShowFoodSearch(true);
      } else {
        setShowFoodSearch(false);
        setFilteredFoods([]);
      }
    }, [foodSearch]);

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
    const styles = useMemo(() => getStyles(colors), [colors]);
    //output
    return (
  <View style={{ flex: 1, paddingBottom: insets.bottom, backgroundColor: colors.screenColor }}>
    {!showMenu ? (
      <AnimatedScrollView
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 10}}
        style={{ flex: 1, opacity: fade, backgroundColor: colors.screenColor }}
      >
        <View style={styles.heading}>
          <View style={styles.dayDateWrapper}>
            <Text style={[styles.title, {color:colors.black}]}>Day: 0{props.dayNo}</Text>
            <Text style={styles.date}>{props.date}</Text>
          </View>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>← Back</Text>
          </Pressable>
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
                  achievedCalories={props.achievedCalories}
                  achieviedHydration={props.achieviedHydration}
                  targetCalories={props.targetCalories}
                  targetHydration={props.targetHydration}
                />
              </Pressable>
            </View>

            {props.remarks && (
              <View style={styles.remarksContainer}>
                <Text style={styles.remarksText}>{String(props.remarks)}</Text>
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
                        <Text style={styles.statValue}>{props.targetCalories}</Text>
                        <Text style={styles.statUnit}>cals</Text>
                      </View>
                      <View style={styles.goalDivider} />
                      <View style={styles.goalItem}>
                        <Text style={styles.statValue}>{props.targetHydration}</Text>
                        <Text style={styles.statUnit}>liters</Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.statCard}>
                    <View style={styles.statCardContent}>
                      <Ionicons name="flame" size={Math.min(hp(2.2), wp(5.5))} color="#FF6B6B" />
                      <Text style={styles.statLabel}>Calories</Text>
                    </View>
                    <Text style={styles.statValue}>{props.achievedCalories}</Text>
                    <Text style={styles.statUnit}>cals</Text>
                  </View>

                  <View style={styles.statCard}>
                    <View style={styles.statCardContent}>
                      <Ionicons name="water" size={Math.min(hp(2.2), wp(5.5))} color="#4ECDC4" />
                      <Text style={styles.statLabel}>Hydration</Text>
                    </View>
                    <Text style={styles.statValue}>{props.achieviedHydration}</Text>
                    <Text style={styles.statUnit}>liters</Text>
                  </View>

                  <View style={styles.statCard}>
                    <View style={styles.statCardContent}>
                      <Ionicons name="timer" size={Math.min(hp(2.2), wp(5.5))} color="#FFB347" />
                      <Text style={styles.statLabel}>Timer</Text>
                    </View>
                    <Text style={styles.statValueLarge}>{timer}</Text>
                  </View>
                </View>
                
                {/* Progress Indicators */}
                <View style={styles.progressSection}>
                  <View style={styles.progressItem}>
                    <View style={styles.progressHeader}>
                      <Ionicons name="flame-outline" size={16} color="#FF6B6B" />
                      <Text style={styles.progressLabel}>Calories Progress</Text>
                    </View>
                    <View style={styles.progressBarContainer}>
                      <View 
                        style={[
                          styles.progressBar, 
                          { 
                            width: `${Math.min((props.achievedCalories / props.targetCalories) * 100, 100)}%`,
                            backgroundColor: '#FF6B6B'
                          }
                        ]} 
                      />
                    </View>
                    <Text style={styles.progressPercentage}>
                      {Math.round((props.achievedCalories / props.targetCalories) * 100)}%
                    </Text>
                  </View>
                  
                  <View style={styles.progressItem}>
                    <View style={styles.progressHeader}>
                      <Ionicons name="water-outline" size={16} color="#4ECDC4" />
                      <Text style={styles.progressLabel}>Hydration Progress</Text>
                    </View>
                    <View style={styles.progressBarContainer}>
                      <View 
                        style={[
                          styles.progressBar, 
                          { 
                            width: `${Math.min((props.achieviedHydration / props.targetHydration) * 100, 100)}%`,
                            backgroundColor: '#4ECDC4'
                          }
                        ]} 
                      />
                    </View>
                    <Text style={styles.progressPercentage}>
                      {Math.round((props.achieviedHydration / props.targetHydration) * 100)}%
                    </Text>
                  </View>
                </View>
              </View>

              <AnimatedTouchable
                style={[styles.trayButton, {backgroundColor: colors.primary}, trackMealAnimatedStyle]} 
                onPress={handleTrackMealPress}
                activeOpacity={0.8}
              >
                <Ionicons name="add-circle" size={20} color="white" />
                <Text style={styles.trayButtonText}>Track Meal</Text>
              </AnimatedTouchable>
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
                        <Text style={styles.statValue}>{props.targetCalories}</Text>
                        <Text style={styles.statUnit}>cals</Text>
                      </View>
                      <View style={styles.goalDivider} />
                      <View style={styles.goalItem}>
                        <Text style={styles.statValue}>{props.targetHydration}</Text>
                        <Text style={styles.statUnit}>liters</Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.statCard}>
                    <View style={styles.statCardContent}>
                      <Ionicons name="flame" size={Math.min(hp(2.2), wp(5.5))} color="#FF6B6B" />
                      <Text style={styles.statLabel}>Calories</Text>
                    </View>
                    <Text style={styles.statValue}>{props.achievedCalories}</Text>
                    <Text style={styles.statUnit}>cals</Text>
                  </View>

                  <View style={styles.statCard}>
                    <View style={styles.statCardContent}>
                      <Ionicons name="water" size={Math.min(hp(2.2), wp(5.5))} color="#4ECDC4" />
                      <Text style={styles.statLabel}>Hydration</Text>
                    </View>
                    <Text style={styles.statValue}>{props.achieviedHydration}</Text>
                    <Text style={styles.statUnit}>liters</Text>
                  </View>

                  <View style={styles.statCard}>
                    <View style={styles.statCardContent}>
                      <Ionicons name="timer" size={Math.min(hp(2.2), wp(5.5))} color="#FFB347" />
                      <Text style={styles.statLabel}>Timer</Text>
                    </View>
                    <Text style={styles.statValueLarge}>{timer}</Text>
                  </View>
                </View>
                
                {/* Progress Indicators */}
                <View style={styles.progressSection}>
                  <View style={styles.progressItem}>
                    <View style={styles.progressHeader}>
                      <Ionicons name="flame-outline" size={16} color="#FF6B6B" />
                      <Text style={styles.progressLabel}>Calories Progress</Text>
                    </View>
                    <View style={styles.progressBarContainer}>
                      <View 
                        style={[
                          styles.progressBar, 
                          { 
                            width: `${Math.min((props.achievedCalories / props.targetCalories) * 100, 100)}%`,
                            backgroundColor: '#FF6B6B'
                          }
                        ]} 
                      />
                    </View>
                    <Text style={styles.progressPercentage}>
                      {Math.round((props.achievedCalories / props.targetCalories) * 100)}%
                    </Text>
                  </View>
                  
                  <View style={styles.progressItem}>
                    <View style={styles.progressHeader}>
                      <Ionicons name="water-outline" size={16} color="#4ECDC4" />
                      <Text style={styles.progressLabel}>Hydration Progress</Text>
                    </View>
                    <View style={styles.progressBarContainer}>
                      <View 
                        style={[
                          styles.progressBar, 
                          { 
                            width: `${Math.min((props.achieviedHydration / props.targetHydration) * 100, 100)}%`,
                            backgroundColor: '#4ECDC4'
                          }
                        ]} 
                      />
                    </View>
                    <Text style={styles.progressPercentage}>
                      {Math.round((props.achieviedHydration / props.targetHydration) * 100)}%
                    </Text>
                  </View>
                </View>
              </View>

              {/* Congratulations Message for 100% Completion */}
              {props.achievedCalories >= props.targetCalories && 
               props.achieviedHydration >= props.targetHydration && (
                <View style={styles.congratsContainer}>
                  <Ionicons name="trophy" size={Math.min(hp(4), wp(10))} color="#FFD700" />
                  <Text style={styles.congratsTitle}>Congratulations! 🎉</Text>
                  <Text style={styles.congratsText}>
                    You&apos;ve achieved your daily goals! Keep up the great work!
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
          <Ionicons name="restaurant" size={Math.min(hp(3.5), wp(8))} color={colors.primary} />
          <Text style={styles.menuTitle}>
            Track Your Meal
          </Text>
          <Text style={styles.menuSubtitle}>
            Choose how you&apos;d like to log your meal
          </Text>
        </View>

        <View style={styles.menuContent}>

          {/* Time Selection */}
          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <Ionicons name="time-outline" size={20} color={colors.primary} />
              <Text style={styles.label}>When did you eat?</Text>
            </View>
            <TouchableOpacity 
              style={[styles.input, styles.timePickerButton]}
              onPress={() => setShowTimePicker(true)}
            >
              <Text style={styles.timePickerText}>
                {selectedTime.toLocaleTimeString('en-US', { 
                  hour: '2-digit', 
                  minute: '2-digit',
                  hour12: true 
                })}
              </Text>
              <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
            
            {showTimePicker && (
              <DateTimePicker
                value={selectedTime}
                mode="time"
                is24Hour={false}
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(event, selectedDate) => {
                  setShowTimePicker(Platform.OS === 'ios');
                  if (selectedDate) {
                    setSelectedTime(selectedDate);
                  }
                }}
              />
            )}
            
            {Platform.OS === 'ios' && showTimePicker && (
              <TouchableOpacity
                style={styles.timeDoneButton}
                onPress={() => setShowTimePicker(false)}
              >
                <Text style={styles.timeDoneText}>Done</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Input Method Selection */}
          <View style={styles.inputMethodSection}>
            <Text style={styles.sectionTitle}>How would you like to add your meal?</Text>
            <View style={styles.inputMethodButtons}>
              <TouchableOpacity
                style={[
                  styles.inputMethodButton,
                  inputMethod === 'text' && styles.inputMethodButtonActive
                ]}
                onPress={() => setInputMethod('text')}
              >
                <Ionicons 
                  name="create-outline" 
                  size={24} 
                  color={inputMethod === 'text' ? 'white' : colors.primary} 
                />
                <Text style={[
                  styles.inputMethodText,
                  inputMethod === 'text' && styles.inputMethodTextActive
                ]}>
                  Type
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.inputMethodButton,
                  inputMethod === 'audio' && styles.inputMethodButtonActive
                ]}
                onPress={() => setInputMethod('audio')}
              >
                <Ionicons 
                  name="mic-outline" 
                  size={24} 
                  color={inputMethod === 'audio' ? 'white' : colors.primary} 
                />
                <Text style={[
                  styles.inputMethodText,
                  inputMethod === 'audio' && styles.inputMethodTextActive
                ]}>
                  Voice
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.inputMethodButton,
                  inputMethod === 'photo' && styles.inputMethodButtonActive
                ]}
                onPress={() => setInputMethod('photo')}
              >
                <Ionicons 
                  name="camera-outline" 
                  size={24} 
                  color={inputMethod === 'photo' ? 'white' : colors.primary} 
                />
                <Text style={[
                  styles.inputMethodText,
                  inputMethod === 'photo' && styles.inputMethodTextActive
                ]}>
                  Photo
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Dynamic Input Based on Selection */}
          <View style={styles.dynamicInputSection}>
            {inputMethod === 'text' && (
              <>
                <View style={styles.inputGroup}>
                  <View style={styles.labelRow}>
                    <Ionicons name="fast-food-outline" size={20} color={colors.primary} />
                    <Text style={styles.label}>What did you eat?</Text>
                  </View>
                  <TextInput 
                    style={styles.input} 
                    placeholder="e.g. Grilled chicken with vegetables"
                    placeholderTextColor={colors.textSecondary}
                    value={foodNameInput}
                    onChangeText={setFoodNameInput}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <View style={styles.labelRow}>
                    <Ionicons name="document-text-outline" size={20} color={colors.primary} />
                    <Text style={styles.label}>Add Details</Text>
                  </View>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="Portion size, ingredients, cooking method..."
                    placeholderTextColor={colors.textSecondary}
                    multiline
                    numberOfLines={6}
                    textAlignVertical="top"
                    value={descriptionInput}
                    onChangeText={setDescriptionInput}
                  />
                </View>
              </>
            )}

            {inputMethod === 'audio' && (
              <View style={styles.audioSection}>
                <Text style={styles.audioInstructions}>
                  {isRecording 
                    ? "Recording... Describe your meal" 
                    : audioUri 
                    ? "Voice note recorded! You can re-record if needed."
                    : "Tap the microphone to start recording"}
                </Text>
                
                <View style={styles.audioRecordContainer}>
                  <TouchableOpacity
                    style={[
                      styles.audioRecordButton,
                      isRecording && styles.audioRecordButtonActive
                    ]}
                    onPress={isRecording ? stopRecording : startRecording}
                    activeOpacity={0.7}
                  >
                    {isRecording ? (
                      <View style={styles.stopIconContainer}>
                        <View style={styles.stopIcon} />
                      </View>
                    ) : (
                      <Ionicons 
                        name="mic" 
                        size={Math.min(hp(4), wp(9))} 
                        color="white" 
                      />
                    )}
                  </TouchableOpacity>
                  
                  {isRecording && (
                    <View style={styles.recordingIndicator}>
                      <View style={styles.recordingDot} />
                      <Text style={styles.recordingText}>Recording...</Text>
                    </View>
                  )}
                </View>

                {audioUri && (
                  <View style={styles.audioPreview}>
                    <View style={styles.audioPreviewLeft}>
                      <Ionicons name="checkmark-circle" size={24} color={colors.success} />
                      <Text style={styles.audioPreviewText}>Voice note saved</Text>
                    </View>
                    <TouchableOpacity 
                      style={styles.clearButton}
                      onPress={() => setAudioUri(null)}
                    >
                      <Ionicons name="trash-outline" size={18} color={colors.error} />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}

            {inputMethod === 'photo' && (
              <View style={styles.photoSection}>
                <Text style={styles.photoInstructions}>
                  {selectedImage 
                    ? "Photo selected! You can change it if needed."
                    : "Take a photo or select from gallery"}
                </Text>
                
                <View style={styles.photoButtons}>
                  <TouchableOpacity
                    style={styles.photoButton}
                    onPress={takePhoto}
                  >
                    <Ionicons name="camera" size={32} color={colors.primary} />
                    <Text style={styles.photoButtonText}>Take Photo</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.photoButton}
                    onPress={pickImage}
                  >
                    <Ionicons name="images" size={32} color={colors.primary} />
                    <Text style={styles.photoButtonText}>From Gallery</Text>
                  </TouchableOpacity>
                </View>

                {selectedImage && (
                  <View style={styles.photoPreview}>
                    <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                    <Text style={styles.photoPreviewText}>Photo attached</Text>
                    <TouchableOpacity onPress={() => setSelectedImage(null)}>
                      <Text style={styles.clearText}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Text field for photo description */}
                {selectedImage && (
                  <View style={styles.inputGroup}>
                    <Text style={styles.optionalLabel}>Describe your meal</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="What is this meal? Include portion size and ingredients"
                      placeholderTextColor={colors.textSecondary}
                      value={descriptionInput}
                      onChangeText={setDescriptionInput}
                    />
                  </View>
                )}
              </View>
            )}
          </View>

        </View>

        <View style={styles.menuButtons}>
          <AnimatedTouchable 
            style={[styles.backMenuButton, backAnimatedStyle]} 
            onPress={handleBackMenuPress}
            activeOpacity={0.8}
          >
            <Ionicons name="arrow-back" size={Math.min(hp(2.2), wp(5))} color={colors.primary} />
            <Text style={styles.backMenuText}>Back</Text>
          </AnimatedTouchable>
          <View style={{ flex: 1, position: 'relative' }}>
            <AnimatedTouchable
              style={[styles.submitMenuButton, submitAnimatedStyle]}
              onPress={handleSubmitPress}
              activeOpacity={0.8}
            >
              <Text style={styles.submitMenuText}>Submit</Text>
              <Ionicons name="checkmark" size={Math.min(hp(2.2), wp(5))} color="white" />
            </AnimatedTouchable>
            <Animated.View 
              style={[styles.submitSuccessOverlay, submitSuccessOverlayStyle]}
              pointerEvents="none"
            >
              <Ionicons name="checkmark-circle" size={Math.min(hp(6), wp(13))} color={colors.success} />
            </Animated.View>
          </View>
        </View>
      </KeyboardAwareScrollView>
    )}
  </View>
);

}
const getStyles = (colors: any) => StyleSheet.create({
    heading: {
        paddingHorizontal: HEADER_PADDING_HORIZONTAL,
        paddingVertical: HEADER_PADDING_VERTICAL,
        marginBottom: 8,
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
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    dayNumber: {
        fontSize: 20,
        fontFamily: 'LoraBold',
        color: 'white',
    },
    dateInfo: {
        justifyContent: 'center',
    },
    dayLabel: {
        fontSize: 20,
        fontFamily: 'LoraBold',
        color: colors.textPrimary,
        letterSpacing: 0.3,
    },
    date: {
        fontSize: 14,
        fontFamily: 'LoraRegular',
        color: colors.textSecondary,
        marginTop: 2,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.cardBackground,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: hp(2),
    },
    centerBody:{
        //borderColor: 'hsla(0, 1%, 27%, 1.00)',
        justifyContent:'flex-start',
    },
    circletext:{
        width: '80%',
        marginLeft:'10%',
        //alignContent: 'center',
        alignItems: 'center',
        marginBottom: hp(1),
    },
    circleWrapper: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    circleButton: {
        height: Math.min(hp(17), wp(35)),
        width: Math.min(hp(17), wp(35)),
    },
    remarksContainer: {
        marginTop: hp(0.8),
        marginBottom: 0,
        paddingHorizontal: wp(4),
        paddingVertical: hp(0.6),
        backgroundColor: colors.primary + '10',
        borderRadius: 8,
        borderLeftWidth: 3,
        borderLeftColor: colors.primary,
        marginHorizontal: wp(5),
    },
    remarksText: {
        fontSize: Math.min(hp(1.6), wp(3.8)),
        fontFamily: 'LoraRegular',
        fontStyle: 'italic',
        color: colors.textPrimary,
        textAlign: 'center',
    },
    infoOuterBox:{
        paddingHorizontal: wp(3),
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Math.min(hp(1), wp(2)),
        justifyContent: 'space-between',
    },
    statCard: {
        width: '48%',
        minHeight: Math.min(hp(13), wp(28)),
        maxHeight: Math.min(hp(13), wp(28)),
        backgroundColor: colors.cardBackground,
        borderRadius: 12,
        padding: Math.min(hp(1.2), wp(2.8)),
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: "#000",
        shadowOpacity: 0.06,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 1 },
        elevation: 2,
        borderWidth: 1,
        borderColor: colors.gray + '20',
    },
    statCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: wp(1),
        marginBottom: hp(0.8),
    },
    statCardContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: wp(1),
        marginBottom: hp(0.3),
    },
    goalRowContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
        width: '100%',
        paddingHorizontal: wp(2),
    },
    goalItem: {
        alignItems: 'center',
        flex: 1,
    },
    goalDivider: {
        width: 1,
        height: hp(4),
        backgroundColor: colors.gray + '40',
        marginHorizontal: wp(1),
    },
    statLabel: {
        fontSize: Math.min(hp(1.3), wp(3)),
        fontFamily: 'LoraSemiBold',
        color: colors.textSecondary,
        marginTop: hp(0.3),
        marginBottom: hp(0.3),
        textTransform: 'uppercase',
        letterSpacing: 0.3,
    },
    statValue: {
        fontSize: Math.min(hp(2.2), wp(5.2)),
        fontFamily: 'LoraBold',
        color: colors.textPrimary,
        marginBottom: hp(0.1),
    },
    statValueLarge: {
        fontSize: Math.min(hp(1.8), wp(4.2)),
        fontFamily: 'LoraBold',
        color: colors.textPrimary,
    },
    statUnit: {
        fontSize: Math.min(hp(1.1), wp(2.5)),
        fontFamily: 'LoraRegular',
        color: colors.textSecondary,
        marginBottom: hp(0.2),
    },
    input: {
        borderWidth: 1,
        borderColor: colors.gray + '50',
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 12,
        backgroundColor: colors.cardBackground,
        color: colors.textPrimary,
        fontSize: 16,
        fontFamily: 'LoraRegular',
    },
    trayButton: {
        flexDirection: 'row',
        backgroundColor: colors.primary,
        paddingVertical: hp(1.4),
        paddingHorizontal: wp(6),
        marginHorizontal: wp(3),
        marginTop: hp(1),
        marginBottom: hp(0.5),
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        shadowColor: colors.primary,
        shadowOpacity: 0.3,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
        elevation: 4,
    },
    trayButtonText: {
        color: '#fff',
        fontSize: Math.min(hp(1.8), wp(4.2)),
        fontFamily: 'LoraBold',
    },
    congratsContainer: {
        backgroundColor: colors.success + '15',
        borderRadius: 16,
        padding: hp(2),
        marginHorizontal: wp(3),
        marginTop: hp(1.5),
        marginBottom: hp(0.5),
        alignItems: 'center',
        borderWidth: 2,
        borderColor: colors.success + '40',
    },
    congratsTitle: {
        fontSize: Math.min(hp(2.2), wp(5.5)),
        fontFamily: 'LoraBold',
        color: colors.success,
        marginTop: hp(1),
        marginBottom: hp(0.5),
    },
    congratsText: {
        fontSize: Math.min(hp(1.6), wp(3.8)),
        fontFamily: 'LoraRegular',
        color: colors.textPrimary,
        textAlign: 'center',
        lineHeight: Math.min(hp(2.2), wp(5)),
    },
    progressSection: {
        marginTop: hp(1.5),
        gap: hp(1.2),
    },
    progressItem: {
        backgroundColor: colors.cardBackground,
        borderRadius: 12,
        padding: Math.min(hp(1.5), wp(3.5)),
        shadowColor: "#000",
        shadowOpacity: 0.06,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 1 },
        elevation: 2,
        borderWidth: 1,
        borderColor: colors.gray + '20',
    },
    progressHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: wp(1.5),
        marginBottom: hp(0.8),
    },
    progressLabel: {
        fontSize: Math.min(hp(1.5), wp(3.5)),
        fontFamily: 'LoraSemiBold',
        color: colors.textPrimary,
    },
    progressBarContainer: {
        height: hp(1),
        backgroundColor: colors.gray + '20',
        borderRadius: hp(0.5),
        overflow: 'hidden',
        marginBottom: hp(0.6),
    },
    progressBar: {
        height: '100%',
        borderRadius: hp(0.5),
    },
    progressPercentage: {
        fontSize: Math.min(hp(1.8), wp(4.2)),
        fontFamily: 'LoraBold',
        color: colors.textPrimary,
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
        padding: 20,
        justifyContent: "center",
    },
    menuTitle: {
        fontSize: Math.min(hp(2.8), wp(6.5)),
        fontFamily: 'LoraBold',
        marginTop: hp(0.8),
        color: colors.textPrimary,
    },
    menuSubtitle: {
        fontSize: Math.min(hp(1.6), wp(3.8)),
        fontFamily: 'LoraRegular',
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
        fontFamily: 'LoraSemiBold',
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
        fontFamily: 'LoraSemiBold',
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
        fontFamily: 'LoraSemiBold',
        color: colors.textPrimary,
        marginTop: hp(0.3),
    },
    inputMethodTextActive: {
        color: 'white',
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
        fontFamily: 'LoraRegular',
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
        fontFamily: 'LoraSemiBold',
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
        fontFamily: 'LoraSemiBold',
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
        fontFamily: 'LoraRegular',
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
        fontFamily: 'LoraRegular',
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
        fontFamily: 'LoraRegular',
    },
    clearText: {
        color: colors.error,
        fontFamily: 'LoraSemiBold',
        fontSize: 14,
    },
    optionalLabel: {
        fontSize: 14,
        fontFamily: 'LoraRegular',
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
        marginTop: 30,
    },
    backMenuButton: {
        flex: 1,
        marginRight: 10,
        paddingVertical: 12,
        borderWidth: 1,
        borderColor: "#02ABFF",
        borderRadius: 8,
        alignItems: "center",
    },
    backMenuText: {
        color: colors.primary,
        fontFamily: 'LoraSemiBold',
        fontSize: Math.min(hp(1.8), wp(4.2)),
    },
    submitMenuButton: {
        flex: 1,
        marginLeft: 10,
        backgroundColor: "#02ABFF",
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: "center",
    },
    submitMenuText: {
        color: "#fff",
        fontFamily: 'LoraBold',
        fontSize: Math.min(hp(1.8), wp(4.2)),
    },
    submitSuccessOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'transparent',
    },
    timePickerButton: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    timePickerText: {
        fontSize: 16,
        fontFamily: 'LoraRegular',
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
        fontFamily: 'LoraSemiBold',
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
        borderLeftColor: '#4ECDC4',
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
        backgroundColor: '#4ECDC4' + '20',
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
        color: '#4ECDC4',
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
        backgroundColor: '#4ECDC4' + '20',
        alignItems: 'center',
        justifyContent: 'center',
    },
    waterControlText: {
        fontSize: Math.min(hp(1.8), wp(4.5)),
        color: '#4ECDC4',
        fontWeight: 'bold',
    },
    waterInputField: {
        flex: 1,
        backgroundColor: colors.inputBackground || '#F9FAFB',
        borderWidth: 1,
        borderColor: '#4ECDC4',
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
        backgroundColor: '#4ECDC4' + '10',
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
        color: '#4ECDC4',
    },
    glassCounterDisplay: {
        alignItems: 'center',
        paddingVertical: hp(0.5),
    },
    glassCount: {
        fontSize: Math.min(hp(2), wp(5)),
        fontWeight: 'bold',
        color: '#4ECDC4',
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
        color: '#4ECDC4',
    },
    // Hydration Progress in Input Modal
    hydrationProgressSection: {
        backgroundColor: colors.cardBackground,
        borderRadius: wp(3),
        padding: wp(3),
        marginTop: hp(1.5),
        borderWidth: 1,
        borderColor: '#4ECDC4' + '30',
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
        color: '#4ECDC4',
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
        backgroundColor: '#4ECDC4',
        borderRadius: wp(2),
    },
    hydrationProgressText: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: wp(1),
    },
    hydrationProgressCurrent: {
        fontSize: Math.min(hp(1), wp(2.5)),
        color: '#4ECDC4',
        fontWeight: '500',
    },
    hydrationProgressTarget: {
        fontSize: Math.min(hp(1), wp(2.5)),
        color: colors.textSecondary,
    },
    // Tracking Mode Selector Styles
    trackingModeSection: {
        backgroundColor: colors.gray + '08',
        borderRadius: 12,
        padding: wp(4),
        marginBottom: hp(2),
        borderWidth: 1,
        borderColor: colors.primary + '20',
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
        backgroundColor: colors.primary + '15',
        borderWidth: 2,
        borderColor: colors.primary,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.15,
        shadowRadius: 5,
        elevation: 3,
    },
    modeButtonText: {
        fontSize: Math.min(hp(1.4), wp(3.2)),
        fontWeight: '600',
        color: colors.textSecondary,
    },
    modeButtonTextActive: {
        color: colors.primary,
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
            stroke={colorsSheet.progressBarColor}  strokeWidth="10"  fill="transparent"
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