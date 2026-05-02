import { createDataScreenStyles } from "@/components/dataScreenStyles";
import { useTheme } from '@/contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { useFonts } from "expo-font";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { ActivityIndicator, Alert, Image, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { heightPercentageToDP as hp } from "react-native-responsive-screen";

const specializations = [
  { id: 1, name: "Nutrition", icon: "nutrition", colorKey: "success" },
  { id: 2, name: "Weight Loss", icon: "fitness", colorKey: "error" },
  { id: 3, name: "Weight Gain", icon: "trending-up", colorKey: "primary" },
  { id: 4, name: "Muscle Gain", icon: "barbell", colorKey: "info" },
  { id: 5, name: "Fitness Coaching", icon: "body", colorKey: "warning" },
];

const consultationModes = [
  { id: 1, name: "In-person", icon: "location", colorKey: "success" },
  { id: 2, name: "Online", icon: "videocam", colorKey: "info" },
  { id: 3, name: "Both", icon: "options", colorKey: "primary" },
];

// Dropdown options
const genderOptions = [
  { label: "Male", value: "male" },
  { label: "Female", value: "female" },
  { label: "Other", value: "other" },
];

const specializationOptions = [
  { label: "Nutrition", value: "Nutrition" },
  { label: "Weight Loss", value: "Weight Loss" },
  { label: "Weight Gain", value: "Weight Gain" },
  { label: "Muscle Gain", value: "Muscle Gain" },
  { label: "Fitness Coaching", value: "Fitness Coaching" },
];

const consultationModeOptions = [
  { label: "In-person Only", value: "in_person" },
  { label: "Online Only", value: "online" },
  { label: "Both In-person and Online", value: "both" },
];

const experienceOptions = [
  { label: "0-1 years", value: "0-1" },
  { label: "2-5 years", value: "2-5" },
  { label: "6-10 years", value: "6-10" },
  { label: "11-15 years", value: "11-15" },
  { label: "16-20 years", value: "16-20" },
  { label: "20+ years", value: "20+" },
];

const qualificationOptions = [
  { label: "MBBS", value: "mbbs" },
  { label: "MD", value: "md" },
  { label: "MS", value: "ms" },
  { label: "DM", value: "dm" },
  { label: "MCh", value: "mch" },
  { label: "DNB", value: "dnb" },
  { label: "Other", value: "other" },
];

const languageOptions = [
  { label: "English", value: "english" },
  { label: "Hindi", value: "hindi" },
  { label: "Spanish", value: "spanish" },
  { label: "French", value: "french" },
  { label: "German", value: "german" },
  { label: "Chinese", value: "chinese" },
  { label: "Arabic", value: "arabic" },
  { label: "Portuguese", value: "portuguese" },
  { label: "Russian", value: "russian" },
  { label: "Japanese", value: "japanese" },
];

const availableDaysOptions = [
  { label: "Monday to Friday", value: "mon-fri" },
  { label: "Monday to Saturday", value: "mon-sat" },
  { label: "Monday to Sunday", value: "mon-sun" },
  { label: "Weekends Only", value: "weekends" },
  { label: "Custom Schedule", value: "custom" },
];

const availableHoursOptions = [
  { label: "9:00 AM - 5:00 PM", value: "9am-5pm" },
  { label: "8:00 AM - 6:00 PM", value: "8am-6pm" },
  { label: "10:00 AM - 7:00 PM", value: "10am-7pm" },
  { label: "24/7 Available", value: "24-7" },
  { label: "Evening Hours (5 PM - 10 PM)", value: "evening" },
  { label: "Custom Hours", value: "custom" },
];

export default function DoctorRegistration() {
  const { colors } = useTheme();
  const screenStyles = createDataScreenStyles(colors);
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phoneNumber: "",
    password: "",
    profilePicture: "",
    selectedGender: null,
    specialization: "",
    yearsExperience: "",
    qualification: "",
    university: "",
    consultationFee: "",
    primaryLanguage: "",
    bio: "",
    availableDays: "",
    availableHours: "",
    selectedConsultationMode: null,
  });

  const [fontsLoaded] = useFonts({
    Pacifico: require("../../../assets/fonts/Pacifico-Regular.ttf"),
    LoraItalic: require("../../../assets/fonts/static/Lora-Italic.ttf"),
    LoraRegular: require("../../../assets/fonts/static/Lora-Regular.ttf"),
  });

  // Validation function
  const validateForm = () => {
    const required = [
      'fullName', 'email', 'phoneNumber', 'password',
      'yearsExperience', 'qualification', 'university',
      'consultationFee', 'primaryLanguage',
      'bio', 'availableDays', 'availableHours'
    ];
    
    const missingFields = [];
    
    required.forEach(field => {
      if (!(formData as any)[field]?.trim()) {
        missingFields.push(field.replace(/([A-Z])/g, ' $1').toLowerCase());
      }
    });
    
    if (!formData.selectedGender) missingFields.push('gender');
    if (!formData.specialization) missingFields.push('specialization');
    if (!formData.selectedConsultationMode) missingFields.push('consultation mode');
    
    return missingFields;
  };

  const handleSubmit = async () => {
    const missingFields = validateForm();
    
    if (missingFields.length > 0) {
      const fieldList = missingFields.join(', ');
      Alert.alert(
        'Incomplete Form',
        `Please fill in all required fields. Missing: ${fieldList}`,
        [{ text: 'OK', style: 'default' }]
      );
      return;
    }
    
    setIsLoading(true);
    try {
      // Here you would submit the doctor registration data
      console.log('Doctor Registration Data:', formData);
      
      // Navigate to application status screen
      router.push('/(main)/(doctor-portal)/application-status');
    } catch (error) {
      console.error('Registration error:', error);
      Alert.alert('Error', 'Failed to submit registration. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const updateFormData = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (!fontsLoaded) {
    return null;
  }

  return (
    <View style={screenStyles.container}>
      <View style={screenStyles.headingandlogo}>
        <Text style={screenStyles.mainHeading}>FitFaat</Text>
        <Image
          source={require("../../../assets/images/logo.png")}
          style={screenStyles.logoImage}
        />
      </View>
      
      <View style={[screenStyles.mainBox, { height: hp(85), flex: 1 }]}>
        <ScrollView 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: hp(3) }}
        >
        <Text style={screenStyles.personalizedText}>
          Complete your doctor profile to join FitFaat healthcare network
        </Text>

        {/* Personal Information */}
        <Text style={[screenStyles.subHeading, {marginTop: hp(2)}]}>Personal Information</Text>
        
        <Text style={screenStyles.subHeading}>Full Name *</Text>
        <TextInput
          placeholderTextColor={colors.textTertiary}
          placeholder="Enter your full name"
          style={screenStyles.mainTextInput}
          value={formData.fullName}
          onChangeText={(value) => updateFormData('fullName', value)}
        />

        <Text style={screenStyles.subHeading}>Email Address *</Text>
        <TextInput
          placeholderTextColor={colors.textTertiary}
          placeholder="Enter your email"
          style={screenStyles.mainTextInput}
          value={formData.email}
          keyboardType="email-address"
          onChangeText={(value) => updateFormData('email', value)}
        />

        <View style={screenStyles.subContainer}>
          <View>
            <Text style={screenStyles.subsubHeading}>Phone Number *</Text>
            <TextInput
              style={screenStyles.miniTextInput}
              placeholder="e.g. +1234567890"
              placeholderTextColor={colors.textTertiary}
              keyboardType="phone-pad"
              value={formData.phoneNumber}
              onChangeText={(value) => updateFormData('phoneNumber', value)}
            />
          </View>
          <View>
            <Text style={screenStyles.subsubHeading}>Password *</Text>
            <TextInput
              style={screenStyles.miniTextInput}
              placeholder="Enter password"
              placeholderTextColor={colors.textTertiary}
              secureTextEntry
              value={formData.password}
              onChangeText={(value) => updateFormData('password', value)}
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
                formData.selectedGender === 'male' && { backgroundColor: colors.primarySoft, borderColor: colors.info, borderWidth: 2 }
              ]}
              onPress={() => updateFormData('selectedGender', 'male')}
            >
              <Ionicons name="male-outline" size={32} color={formData.selectedGender === 'male' ? colors.info : colors.textTertiary} />
            </TouchableOpacity>
            <TouchableOpacity 
              style={[
                screenStyles.genderSelection,
                formData.selectedGender === 'female' && { backgroundColor: colors.primarySoft, borderColor: colors.error, borderWidth: 2 }
              ]}
              onPress={() => updateFormData('selectedGender', 'female')}
            >
              <Ionicons name="female-outline" size={32} color={formData.selectedGender === 'female' ? colors.error : colors.textTertiary} />
            </TouchableOpacity>
            <TouchableOpacity 
              style={[
                screenStyles.genderSelection,
                formData.selectedGender === 'other' && { backgroundColor: colors.primarySoft, borderColor: colors.primary, borderWidth: 2 }
              ]}
              onPress={() => updateFormData('selectedGender', 'other')}
            >
              <Ionicons name="male-female-outline" size={32} color={formData.selectedGender === 'other' ? colors.primary : colors.textTertiary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Professional Information */}
        <Text style={[screenStyles.subHeading, {marginTop: hp(2)}]}>Professional Information</Text>
        
        {/* Specialization */}
        <Text style={screenStyles.subHeading}>Specialization *</Text>
        <TextInput
          placeholderTextColor={colors.textTertiary}
          placeholder="e.g. Cardiologist, Dermatologist, etc."
          style={screenStyles.mainTextInput}
          value={formData.specialization}
          onChangeText={(value) => updateFormData('specialization', value)}
        />

        <View style={screenStyles.subContainer}>
          <View>
            <Text style={screenStyles.subsubHeading}>Years Experience *</Text>
            <TextInput
              style={screenStyles.miniTextInput}
              placeholder="e.g. 5 years"
              placeholderTextColor={colors.textTertiary}
              value={formData.yearsExperience}
              onChangeText={(value) => updateFormData('yearsExperience', value)}
            />
          </View>
          <View>
            <Text style={screenStyles.subsubHeading}>Qualification *</Text>
            <TextInput
              style={screenStyles.miniTextInput}
              placeholder="e.g. MBBS, MD"
              placeholderTextColor={colors.textTertiary}
              value={formData.qualification}
              onChangeText={(value) => updateFormData('qualification', value)}
            />
          </View>
        </View>

        <Text style={screenStyles.subHeading}>University/Institute *</Text>
        <TextInput
          placeholderTextColor={colors.textTertiary}
          placeholder="Enter your university or institute name"
          style={screenStyles.mainTextInput}
          value={formData.university}
          onChangeText={(value) => updateFormData('university', value)}
        />

        {/* Clinic Information */}
        <Text style={[screenStyles.subHeading, {marginTop: hp(2)}]}>Clinic Information</Text>
        
        <View style={screenStyles.subContainer}>
          <View>
            <Text style={screenStyles.subsubHeading}>Consultation Fee *</Text>
            <TextInput
              style={screenStyles.miniTextInput}
              placeholder="e.g. $100"
              placeholderTextColor={colors.textTertiary}
              keyboardType="numeric"
              value={formData.consultationFee}
              onChangeText={(value) => updateFormData('consultationFee', value)}
            />
          </View>
          <View>
            <Text style={screenStyles.subsubHeading}>Primary Language *</Text>
            <TextInput
              style={screenStyles.miniTextInput}
              placeholder="e.g. English"
              placeholderTextColor={colors.textTertiary}
              value={formData.primaryLanguage}
              onChangeText={(value) => updateFormData('primaryLanguage', value)}
            />
          </View>
        </View>

        <Text style={screenStyles.subHeading}>Bio/Description *</Text>
        <TextInput
          placeholderTextColor={colors.textTertiary}
          placeholder="Write a short description about yourself and your practice"
          style={[screenStyles.mainTextInput, { height: hp(10), textAlignVertical: 'top' }]}
          multiline
          value={formData.bio}
          onChangeText={(value) => updateFormData('bio', value)}
        />

        {/* Availability Information */}
        <Text style={[screenStyles.subHeading, {marginTop: hp(2)}]}>Availability</Text>
        
        <View style={screenStyles.subContainer}>
          <View>
            <Text style={screenStyles.subsubHeading}>Available Days *</Text>
            <TextInput
              style={screenStyles.miniTextInput}
              placeholder="e.g. Mon-Fri"
              placeholderTextColor={colors.textTertiary}
              value={formData.availableDays}
              onChangeText={(value) => updateFormData('availableDays', value)}
            />
          </View>
          <View>
            <Text style={screenStyles.subsubHeading}>Available Hours *</Text>
            <TextInput
              style={screenStyles.miniTextInput}
              placeholder="e.g. 9AM-5PM"
              placeholderTextColor={colors.textTertiary}
              value={formData.availableHours}
              onChangeText={(value) => updateFormData('availableHours', value)}
            />
          </View>
        </View>

        {/* Consultation Mode Selection */}
        <Text style={screenStyles.subHeading}>Consultation Mode *</Text>
        <View style={screenStyles.mappingCol}>
          {consultationModes.map((item) => {
            const itemColor = colors[item.colorKey as keyof typeof colors] as string;

            return (
              <TouchableOpacity 
                key={item.id} 
                style={[
                  screenStyles.mapping,
                  formData.selectedConsultationMode === item.id && { 
                    backgroundColor: colors.primarySoft, 
                    borderColor: itemColor, 
                    borderWidth: 2 
                  }
                ]}
                onPress={() => updateFormData('selectedConsultationMode', item.id)}
              >
                <Ionicons
                  name={item.icon as any}
                  size={26}
                  color={itemColor}
                  style={{ marginRight: hp(1) }}
                />
                <View style={{ flexDirection: "column" }}>
                  <Text style={[
                    screenStyles.mappingHeading,
                    formData.selectedConsultationMode === item.id && { fontWeight: 'bold' }
                  ]}>{item.name}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity
          style={[
            screenStyles.generateButton,
            { backgroundColor: colors.primary },
            isLoading && { opacity: 0.7 }
          ]}
          onPress={handleSubmit}
          disabled={isLoading}
        >
            {isLoading ? (
              <ActivityIndicator color={colors.textOnPrimary} size="small" />
            ) : (
              <Text style={{ color: colors.textOnPrimary, fontSize: hp(2.2) }}>Submit Registration</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </View>
    </View>
  );
}

