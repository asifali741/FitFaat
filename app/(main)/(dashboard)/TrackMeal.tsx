import { useTheme } from "@/contexts/ThemeContext";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import { TouchableOpacity, StyleSheet, Text, TextInput, View, Alert, Platform } from "react-native";
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring, interpolate } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from 'expo-image-picker';
import { Audio } from 'expo-av';
import DateTimePicker from '@react-native-community/datetimepicker';
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from 'react-native-responsive-screen';
import { useFonts } from 'expo-font';
import { useSafeAreaInsets } from "react-native-safe-area-context";

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export default function TrackMeal() {
    const { colors } = useTheme();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { dayNo, date } = useLocalSearchParams<{ dayNo: string; date: string }>();
    
    const [fontsLoaded] = useFonts({
        LoraRegular: require("../../../assets/fonts/static/Lora-Regular.ttf"),
        LoraBold: require("../../../assets/fonts/static/Lora-Bold.ttf"),
        LoraSemiBold: require("../../../assets/fonts/static/Lora-SemiBold.ttf"),
    });

    const [selectedTime, setSelectedTime] = useState<Date>(new Date());
    const [showTimePicker, setShowTimePicker] = useState<boolean>(false);
    const [foodNameInput, setFoodNameInput] = useState<string>('');
    const [descriptionInput, setDescriptionInput] = useState<string>('');
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [recording, setRecording] = useState<Audio.Recording | undefined>();
    const [audioUri, setAudioUri] = useState<string | null>(null);
    const [isRecording, setIsRecording] = useState(false);
    const [inputMethod, setInputMethod] = useState<'text' | 'audio' | 'photo'>('text');
    
    // Animation values
    const submitScale = useSharedValue(1);
    const submitRotate = useSharedValue(0);
    const submitSuccess = useSharedValue(0);
    const backScale = useSharedValue(1);
    const backTranslateX = useSharedValue(0);
    
    // Submit button animation
    const handleSubmitPress = () => {
        submitScale.value = withSequence(
            withSpring(0.85, { damping: 8, stiffness: 300 }),
            withSpring(1.15, { damping: 8, stiffness: 300 }),
            withSpring(1, { damping: 8, stiffness: 300 })
        );
        
        submitRotate.value = withSequence(
            withSpring(360, { damping: 10, stiffness: 200 }),
            withSpring(0, { damping: 10, stiffness: 200 })
        );
        
        submitSuccess.value = withSequence(
            withSpring(1, { damping: 5, stiffness: 200 }),
            withSpring(0, { damping: 5, stiffness: 200 })
        );
        
        setTimeout(() => {
            console.log('Time:', selectedTime.toLocaleTimeString());
            console.log('Food:', foodNameInput);
            console.log('Description:', descriptionInput);
            console.log('Image:', selectedImage);
            console.log('Audio:', audioUri);
            router.back();
        }, 800);
    };
    
    // Back button animation
    const handleBackPress = () => {
        backScale.value = withSequence(
            withSpring(0.9, { damping: 10, stiffness: 400 }),
            withSpring(1, { damping: 10, stiffness: 400 })
        );
        backTranslateX.value = withSequence(
            withSpring(-8, { damping: 10, stiffness: 400 }),
            withSpring(0, { damping: 10, stiffness: 400 })
        );
        setTimeout(() => router.back(), 150);
    };
    
    // Animated styles
    const submitAnimatedStyle = useAnimatedStyle(() => {
        const successScale = interpolate(submitSuccess.value, [0, 1], [1, 1.3]);
        return {
            transform: [
                { scale: submitScale.value * successScale },
                { rotate: `${submitRotate.value}deg` }
            ],
        };
    });
    
    const submitSuccessOverlayStyle = useAnimatedStyle(() => {
        const opacity = interpolate(submitSuccess.value, [0, 0.5, 1], [0, 0.8, 0]);
        const scale = interpolate(submitSuccess.value, [0, 1], [0.5, 2]);
        return {
            opacity,
            transform: [{ scale }],
        };
    });
    
    const backAnimatedStyle = useAnimatedStyle(() => {
        return {
            transform: [
                { scale: backScale.value },
                { translateX: backTranslateX.value }
            ],
        };
    });

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

    const styles = getStyles(colors);
    
    if (!fontsLoaded) {
        return null;
    }

    return (
        <View style={{ flex: 1, paddingTop: insets.top, paddingBottom: insets.bottom, backgroundColor: colors.screenColor }}>
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
                        Day {dayNo} - {date}
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
                        onPress={handleBackPress}
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
        </View>
    );
}

const getStyles = (colors: any) => StyleSheet.create({
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
        fontFamily: 'LoraSemiBold',
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
});
