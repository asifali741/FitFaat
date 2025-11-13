import { HEADER_PADDING_HORIZONTAL, HEADER_PADDING_VERTICAL } from '@/constants/ui';
import { useTheme } from "@/contexts/ThemeContext";
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
    function getDate(){
        var currentTime = Date.now()
        const oldTime = new Date(props.duration*1000).getTime()
        currentTime = currentTime + oldTime;
        const date = new Date(currentTime);
        return date.toISOString().slice(11, 19); // "HH:MM:SS"
    }
    //states to track changes
    const [updateInput, setUpdateInput] = useState<string>('');
    const [timer, setTimer] = useState<string>(getDate())
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
  <View style={{ flex: 1, paddingTop: insets.top, paddingBottom: insets.bottom, backgroundColor: colors.screenColor }}>
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
          {props.status === "active" ? (
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
          <Ionicons name="restaurant" size={Math.min(hp(3.5), wp(8))} color={colors.primary} />
          <Text style={styles.menuTitle}>
            Track Your Meal
          </Text>
          <Text style={styles.menuSubtitle}>
            Choose how you'd like to log your meal
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
                    <MaterialIcons name="description" size={20} color={colors.primary} />
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
                      <Text>Remove</Text>
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
          <TouchableOpacity style={styles.backMenuButton} onPress={closeMenu}>
            <Ionicons name="arrow-back" size={Math.min(hp(2.2), wp(5))} color={colors.primary} />
            <Text style={styles.backMenuText}>Back</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.submitMenuButton}
            onPress={() => {
              // Handle submit with all the data
              console.log('Time:', selectedTime.toLocaleTimeString());
              console.log('Food:', foodNameInput);
              console.log('Description:', descriptionInput);
              console.log('Image:', selectedImage);
              console.log('Audio:', audioUri);
              closeMenu();
            }}
          >
            <Text style={styles.submitMenuText}>Submit</Text>
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
        fontWeight: 'bold',
        color: 'white',
    },
    dateInfo: {
        justifyContent: 'center',
    },
    dayLabel: {
        fontSize: 20,
        fontWeight: '700',
        color: colors.textPrimary,
    },
    date: {
        fontSize: 14,
        fontWeight: '500',
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
        flex: 1,
        justifyContent:'space-between',
    },
    topSection: {
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
        fontWeight: '600',
        color: colors.textSecondary,
        marginTop: hp(0.3),
        marginBottom: hp(0.3),
        textTransform: 'uppercase',
        letterSpacing: 0.3,
    },
    statValue: {
        fontSize: Math.min(hp(2.2), wp(5.2)),
        fontWeight: 'bold',
        color: colors.textPrimary,
        marginBottom: hp(0.1),
    },
    statValueLarge: {
        fontSize: Math.min(hp(1.8), wp(4.2)),
        fontWeight: 'bold',
        color: colors.textPrimary,
    },
    statUnit: {
        fontSize: Math.min(hp(1.1), wp(2.5)),
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
        fontWeight: '700',
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
        fontWeight: '600',
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
        fontWeight: 'bold',
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
    },
    menuScrollContent: {
        flexGrow: 1,
        paddingHorizontal: wp(5),
        paddingTop: hp(3),
        paddingBottom: hp(2),
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
        paddingVertical: hp(1.6),
        borderWidth: 1.5,
        borderColor: colors.primary,
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
        gap: wp(1.5),
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
        paddingVertical: hp(1.6),
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
        gap: wp(1.5),
        shadowColor: colors.primary,
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
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