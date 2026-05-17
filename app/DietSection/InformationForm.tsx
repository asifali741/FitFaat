import { createDataScreenStyles } from "@/components/dataScreenStyles";
import { useTheme } from "@/contexts/ThemeContext";
import { useCustomOnboarding } from "@/hooks/useCustomOnboarding";
import { Ionicons } from "@expo/vector-icons";
import { useFonts } from "expo-font";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Image, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from "react-native-responsive-screen";
import { SafeAreaView } from "react-native-safe-area-context";

/**
 * INFORMATION FORM SCREEN!!!!
 */
const data = [
  {
    id: 1,
    name: "Weight Loss",
    icon: "flame-outline",
    color: "#FF6B6B",
    description: "Burn fat and achieve a lean physique",
  },
  {
    id: 2,
    name: "Muscle Gain",
    icon: "barbell-outline",
    color: "#4ECDC4",
    description: "Build muscle strength and power",
  },
  {
    id: 3,
    name: "Weight Gain",
    icon: "restaurant-outline",
    color: "#FFD93D",
    description: "Gain healthy weight efficiently",
  },
];

export default function Index() {
  const { completeOnboarding, isLoading } = useCustomOnboarding();
  const { colors } = useTheme();
  const screenStyles = createDataScreenStyles(colors);
  
  // Form state
  const [name, setName] = useState("");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [selectedGender, setSelectedGender] = useState<'male'|'female'|'other'|null>(null); // 'male', 'female', 'other'
  const [selectedGoal, setSelectedGoal] = useState<number|null>(null); // 1, 2, or 3
  const [birthDate, setBirthDate] = useState({ day: "", month: "", year: "" });
  const [age, setAge] = useState("");
  
  const [fontsLoaded] = useFonts({
    Pacifico: require("../../assets/fonts/Pacifico-Regular.ttf"),
    LoraItalic: require("../../assets/fonts/static/Lora-Italic.ttf"),
    LoraRegular: require("../../assets/fonts/static/Lora-Regular.ttf"),
  });

  // Calculate age automatically when birth date changes
  useEffect(() => {
    const { day, month, year } = birthDate;
    
    // Check if all birth date fields are filled
    if (day && month && year && year.length === 4) {
      const dayNum = parseInt(day, 10);
      const monthNum = parseInt(month, 10);
      const yearNum = parseInt(year, 10);
      
      // Validate date ranges
      if (dayNum >= 1 && dayNum <= 31 && monthNum >= 1 && monthNum <= 12 && yearNum >= 1900 && yearNum <= new Date().getFullYear()) {
        // Check if it's a valid date
        const birthDateObj = new Date(yearNum, monthNum - 1, dayNum);
        
        // Verify the date is valid (handles cases like Feb 31)
        if (birthDateObj.getDate() === dayNum && birthDateObj.getMonth() === monthNum - 1) {
          const today = new Date();
          let calculatedAge = today.getFullYear() - yearNum;
          
          // Adjust age if birthday hasn't occurred yet this year
          const birthdayThisYear = new Date(today.getFullYear(), monthNum - 1, dayNum);
          if (today < birthdayThisYear) {
            calculatedAge--;
          }
          
          // Only update if age is valid (between 13 and 120)
          if (calculatedAge >= 13 && calculatedAge <= 120) {
            setAge(calculatedAge.toString());
          } else if (calculatedAge < 13) {
            setAge('');
            // Don't show alert while user is typing
          } else {
            setAge('');
          }
        }
      }
    }
  }, [birthDate]);

  // Handle height input with automatic dot formatting
  const handleHeightChange = (text: string) => {
    // Remove any non-numeric characters except dots
    let cleaned = text.replace(/[^0-9]/g, "");
    
    if (cleaned.length > 0) {
      // Add dot after first digit
      if (cleaned.length === 1) {
        cleaned = cleaned + ".";
      } else if (cleaned.length > 1) {
        cleaned = cleaned.charAt(0) + "." + cleaned.slice(1);
      }
      
      // Limit to 4 characters total (e.g., "5.77")
      cleaned = cleaned.slice(0, 4);
    }
    
    setHeight(cleaned);
  };

  // Form validation function
  const validateForm = () => {
    const missingFields = [];
    
    if (!name.trim()) missingFields.push('Name');
    if (!height.trim()) missingFields.push('Height');
    if (!weight.trim()) missingFields.push('Weight');
    if (!selectedGender) missingFields.push('Gender');
    if (!birthDate.day.trim() || !birthDate.month.trim() || !birthDate.year.trim()) {
      missingFields.push('Date of Birth');
    }
  if (!age.trim()) missingFields.push('Age');
  if (!selectedGoal) missingFields.push('Fitness Goal');
    
    return missingFields;
  };

  const handleFormSubmit = async () => {
    try {
      // Validate form before submission
      const missingFields = validateForm();
      
      if (missingFields.length > 0) {
        const fieldList = missingFields.join(', ');
        Alert.alert(
          'Incomplete Form',
          `Please fill in all fields. Missing: ${fieldList}`,
          [{ text: 'OK', style: 'default' }]
        );
        return;
      }
      
      // Validate date of birth values
      const day = parseInt(birthDate.day, 10);
      const month = parseInt(birthDate.month, 10);
      const year = parseInt(birthDate.year, 10);
      const ageNum = parseInt(age, 10);
      
      // Basic range checks
      if (month < 1 || month > 12 || year < 1900 || year > new Date().getFullYear()) {
        Alert.alert(
          'Invalid Date',
          'Please enter a valid date of birth',
          [{ text: 'OK', style: 'default' }]
        );
        return;
      }

      // Day range based on month/year
      const maxDay = new Date(year, month, 0).getDate();
      if (day < 1 || day > maxDay) {
        Alert.alert(
          'Invalid Date',
          'Please enter a valid day for the selected month',
          [{ text: 'OK', style: 'default' }]
        );
        return;
      }

      // Validate age
      if (isNaN(ageNum) || ageNum < 13 || ageNum > 120) {
        Alert.alert(
          'Invalid Age',
          'Please enter a valid age between 13 and 120',
          [{ text: 'OK', style: 'default' }]
        );
        return;
      }
      
      // Validate gender and goal
      if (!selectedGender) {
        Alert.alert('Error', 'Please select your gender');
        return;
      }
      
      if (!selectedGoal) {
        Alert.alert('Error', 'Please select your fitness goal');
        return;
      }

      // Log the form data and complete onboarding
      const formData = {
        name,
        height,
        weight,
        selectedGender,
        selectedGoal,
        birthDate,
        age: parseInt(age, 10)
      };
      console.log('Form data:', formData);
      
      // Complete the onboarding process with the validated form data
      await completeOnboarding(formData);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save information. Please try again.');
    }
  };

  if (!fontsLoaded) {
    return null;
  }
  
  return (
    <SafeAreaView style={screenStyles.container}>
      <ScrollView 
        contentContainerStyle={{ paddingBottom: hp(3) }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={screenStyles.headingandlogo}>
          <Text style={screenStyles.mainHeading}>FitFaat</Text>
          <Image
            source={require("../../assets/images/logo.png")}
            style={screenStyles.logoImage}
          />
        </View>

        {/* Main Form Container */}
        <View style={screenStyles.mainBox}>
          <Text style={screenStyles.personalizedText}>
            🎯 Create Your Personalized Meal Plan
          </Text>

          {/* Name Field */}
          <View>
            <Text style={screenStyles.subHeading}>Full Name *</Text>
            <TextInput
              placeholderTextColor={colors.textTertiary}
              placeholder="Enter your full name"
              style={screenStyles.mainTextInput}
              value={name}
              onChangeText={setName}
            />
          </View>

          {/* Height & Weight Row */}
          <View style={screenStyles.subContainer}>
            <View style={{ flex: 1 }}>
              <Text style={screenStyles.subsubHeading}>Height (ft) *</Text>
              <TextInput
                style={screenStyles.miniTextInput}
                placeholder="5.66"
                placeholderTextColor={colors.textTertiary}
                keyboardType="numeric"
                maxLength={4}
                value={height}
                onChangeText={handleHeightChange}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={screenStyles.subsubHeading}>Weight (kg) *</Text>
              <TextInput
                style={screenStyles.miniTextInput}
                placeholder="77.4"
                placeholderTextColor={colors.textTertiary}
                keyboardType="numeric"
                maxLength={5}
                value={weight}
                onChangeText={setWeight}
              />
            </View>
          </View>

          {/* Gender Selection */}
          <View>
            <Text style={screenStyles.genderHeading}>Gender *</Text>
            <View style={screenStyles.subContainer}>
              <TouchableOpacity 
                style={[
                  screenStyles.genderSelection,
                  selectedGender === 'male' && { 
                    backgroundColor: colors.primarySoft, 
                    borderColor: colors.info, 
                    borderWidth: 2 
                  }
                ]}
                onPress={() => setSelectedGender('male')}
              >
                <Ionicons 
                  name="male-outline" 
                  size={hp(3.2)} 
                  color={selectedGender === 'male' ? colors.info : colors.textTertiary} 
                />
                <Text
                  style={[
                    screenStyles.genderLabel,
                    { color: selectedGender === 'male' ? colors.info : colors.textTertiary }
                  ]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  Male
                </Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[
                  screenStyles.genderSelection,
                  selectedGender === 'female' && { 
                    backgroundColor: colors.primarySoft, 
                    borderColor: colors.error, 
                    borderWidth: 2 
                  }
                ]}
                onPress={() => setSelectedGender('female')}
              >
                <Ionicons 
                  name="female-outline" 
                  size={hp(3.2)} 
                  color={selectedGender === 'female' ? colors.error : colors.textTertiary} 
                />
                <Text
                  style={[
                    screenStyles.genderLabel,
                    { color: selectedGender === 'female' ? colors.error : colors.textTertiary }
                  ]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  Female
                </Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[
                  screenStyles.genderSelection,
                  selectedGender === 'other' && { 
                    backgroundColor: colors.primarySoft, 
                    borderColor: colors.primary, 
                    borderWidth: 2 
                  }
                ]}
                onPress={() => setSelectedGender('other')}
              >
                <Ionicons 
                  name="male-female-outline" 
                  size={hp(3.2)} 
                  color={selectedGender === 'other' ? colors.primary : colors.textTertiary} 
                />
                <Text
                  style={[
                    screenStyles.genderLabel,
                    { color: selectedGender === 'other' ? colors.primary : colors.textTertiary }
                  ]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  Mix
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Date of Birth */}
          <View>
            <Text style={screenStyles.subHeading}>Date of Birth *</Text>
            <View style={screenStyles.dob}>
              <TextInput
                style={screenStyles.dobInput}
                placeholder="DD"
                placeholderTextColor={colors.textTertiary}
                keyboardType="numeric"
                maxLength={2}
                value={birthDate.day}
                onChangeText={(text) => {
                  const digits = text.replace(/\D/g, '').slice(0,2);
                  const m = parseInt(birthDate.month || '0', 10) || 0;
                  const y = parseInt(birthDate.year || String(new Date().getFullYear()), 10) || new Date().getFullYear();
                  const maxDay = m >=1 && m <=12 ? new Date(y, m, 0).getDate() : 31;
                  let val = parseInt(digits || '0', 10);
                  if (val > maxDay) val = maxDay;
                  setBirthDate(prev => ({ ...prev, day: val ? String(val) : '' }));
                }}
              />
              <Text style={screenStyles.dobText}>/</Text>
              <TextInput
                style={screenStyles.dobInput}
                placeholder="MM"
                placeholderTextColor={colors.textTertiary}
                keyboardType="numeric"
                maxLength={2}
                value={birthDate.month}
                onChangeText={(text) => {
                  const digits = text.replace(/\D/g, '').slice(0,2);
                  let val = parseInt(digits || '0', 10);
                  if (val > 12) val = 12;
                  setBirthDate(prev => ({ ...prev, month: val ? String(val) : '' }));
                }}
              />
              <Text style={screenStyles.dobText}>/</Text>
              <TextInput
                style={screenStyles.dobInput}
                placeholder="YYYY"
                placeholderTextColor={colors.textTertiary}
                keyboardType="numeric"
                maxLength={4}
                value={birthDate.year}
                onChangeText={(text) => {
                  const digits = text.replace(/\D/g, '').slice(0,4);
                  setBirthDate(prev => ({ ...prev, year: digits }));
                }}
              />
            </View>
          </View>

          {/* Age */}
          <View>
            <Text style={screenStyles.subHeading}>Age (Auto-calculated) *</Text>
            <TextInput
              style={[screenStyles.mainTextInput, { backgroundColor: colors.backgroundHeader, color: colors.textSecondary }]}
              placeholder="Age will be calculated from DOB"
              placeholderTextColor={colors.textTertiary}
              keyboardType="numeric"
              maxLength={3}
              value={age}
              editable={false}
            />
            {age && (
              <Text style={{ fontSize: hp(1.5), color: colors.success, marginTop: hp(0.5), marginLeft: wp(1) }}>
                ✓ Age calculated: {age} years old
              </Text>
            )}
          </View>

          {/* Fitness Goal Selection */}
          <Text style={screenStyles.subHeading}>What's Your Goal? *</Text>
          <View style={screenStyles.mappingCol}>
            {data.map((item) => (
              <TouchableOpacity 
                key={item.id} 
                style={[
                  screenStyles.mapping,
                  selectedGoal === item.id && { 
                    backgroundColor: colors.primarySoft, 
                    borderColor: item.color, 
                    borderWidth: 2 
                  }
                ]}
                onPress={() => setSelectedGoal(item.id)}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={item.icon as keyof typeof Ionicons.glyphMap}
                  size={hp(3)}
                  color={item.color}
                  style={{ marginRight: hp(1.2) }}
                />
                <View style={{ flex: 1 }}>
                  <Text style={[
                    screenStyles.mappingHeading,
                    { color: item.color }
                  ]}>
                    {item.name}
                  </Text>
                  <Text style={screenStyles.mappingHeadingName}>
                    {item.description}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[
              screenStyles.generateButton,
              isLoading && { opacity: 0.7 }
            ]}
            onPress={handleFormSubmit}
            disabled={isLoading}
            activeOpacity={0.85}
          >
            {isLoading ? (
              <>
                <ActivityIndicator color={colors.textOnPrimary} size="small" />
                <Text style={{ color: colors.textOnPrimary, fontSize: hp(1.8), marginLeft: wp(2), fontWeight: "600" }}>
                  Creating Your Plan...
                </Text>
              </>
            ) : (
              <>
                <Text style={{ color: colors.textOnPrimary, fontSize: hp(1.8), fontWeight: "700" }}>
                  Complete Setup
                </Text>
                <Ionicons name="arrow-forward" size={hp(2.2)} color="#FFFFFF" />
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
