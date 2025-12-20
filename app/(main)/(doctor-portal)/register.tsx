import { dataScreenStyles } from "@/components/dataScreenStyles";
import { theme } from "@/constants/theme";
import { Ionicons } from '@expo/vector-icons';
import { useFonts } from "expo-font";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { ActivityIndicator, Alert, Image, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { heightPercentageToDP as hp } from "react-native-responsive-screen";

const specializations = [
  { id: 1, name: "Cardiologist", icon: "heart", color: theme.colors.error },
  { id: 2, name: "Dermatologist", icon: "person", color: theme.colors.warning },
  { id: 3, name: "Neurologist", icon: "medical", color: theme.colors.info },
  { id: 4, name: "Pediatrician", icon: "happy", color: theme.colors.primary + '40' },
  { id: 5, name: "Orthopedic", icon: "body", color: theme.colors.primary },
  { id: 6, name: "Gynecologist", icon: "female", color: theme.colors.secondary },
];

const consultationModes = [
  { id: 1, name: "In-person", icon: "location", color: theme.colors.success },
  { id: 2, name: "Online", icon: "videocam", color: theme.colors.info },
  { id: 3, name: "Both", icon: "options", color: theme.colors.primary },
];

// Dropdown options
const genderOptions = [
  { label: "Male", value: "male" },
  { label: "Female", value: "female" },
  { label: "Other", value: "other" },
];

const specializationOptions = [
  { label: "Cardiologist", value: "cardiologist" },
  { label: "Dermatologist", value: "dermatologist" },
  { label: "Neurologist", value: "neurologist" },
  { label: "Pediatrician", value: "pediatrician" },
  { label: "Orthopedic", value: "orthopedic" },
  { label: "Gynecologist", value: "gynecologist" },
  { label: "General Practitioner", value: "general_practitioner" },
  { label: "Psychiatrist", value: "psychiatrist" },
  { label: "Oncologist", value: "oncologist" },
  { label: "Endocrinologist", value: "endocrinologist" },
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
    birthDate: { day: "", month: "", year: "" },
    specialization: "",
    medicalLicense: "",
    licenseAuthority: "",
    yearsExperience: "",
    qualification: "",
    university: "",
    clinicName: "",
    clinicAddress: "",
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
      'fullName', 'email', 'phoneNumber', 'password', 'medicalLicense', 
      'licenseAuthority', 'yearsExperience', 'qualification', 'university',
      'clinicName', 'clinicAddress', 'consultationFee', 'primaryLanguage',
      'bio', 'availableDays', 'availableHours'
    ];
    
    const missingFields = [];
    
    required.forEach(field => {
      if (!(formData as any)[field]?.trim()) {
        missingFields.push(field.replace(/([A-Z])/g, ' $1').toLowerCase());
      }
    });
    
    if (!formData.selectedGender) missingFields.push('gender');
    if (!formData.birthDate.day.trim() || !formData.birthDate.month.trim() || !formData.birthDate.year.trim()) {
      missingFields.push('date of birth');
    }
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
    <View style={dataScreenStyles.container}>
      <View style={dataScreenStyles.headingandlogo}>
        <Text style={dataScreenStyles.mainHeading}>FitFaat</Text>
        <Image
          source={require("../../../assets/images/logo.png")}
          style={dataScreenStyles.logoImage}
        />
      </View>
      
      <View style={[dataScreenStyles.mainBox, { height: hp(85), flex: 1 }]}>
        <ScrollView 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: hp(3) }}
        >
        <Text style={dataScreenStyles.personalizedText}>
          Complete your doctor profile to join FitFaat healthcare network
        </Text>

        {/* Personal Information */}
        <Text style={[dataScreenStyles.subHeading, {marginTop: hp(2)}]}>Personal Information</Text>
        
        <Text style={dataScreenStyles.subHeading}>Full Name *</Text>
        <TextInput
          placeholderTextColor="#999"
          placeholder="Enter your full name"
          style={dataScreenStyles.mainTextInput}
          value={formData.fullName}
          onChangeText={(value) => updateFormData('fullName', value)}
        />

        <Text style={dataScreenStyles.subHeading}>Email Address *</Text>
        <TextInput
          placeholderTextColor="#999"
          placeholder="Enter your email"
          style={dataScreenStyles.mainTextInput}
          value={formData.email}
          keyboardType="email-address"
          onChangeText={(value) => updateFormData('email', value)}
        />

        <View style={dataScreenStyles.subContainer}>
          <View>
            <Text style={dataScreenStyles.subsubHeading}>Phone Number *</Text>
            <TextInput
              style={dataScreenStyles.miniTextInput}
              placeholder="e.g. +1234567890"
              keyboardType="phone-pad"
              value={formData.phoneNumber}
              onChangeText={(value) => updateFormData('phoneNumber', value)}
            />
          </View>
          <View>
            <Text style={dataScreenStyles.subsubHeading}>Password *</Text>
            <TextInput
              style={dataScreenStyles.miniTextInput}
              placeholder="Enter password"
              secureTextEntry
              value={formData.password}
              onChangeText={(value) => updateFormData('password', value)}
            />
          </View>
        </View>

        {/* Gender Selection */}
        <View>
          <Text style={dataScreenStyles.genderHeading}>Gender *</Text>
          <View style={dataScreenStyles.subContainer}>
            <TouchableOpacity 
              style={[
                dataScreenStyles.genderSelection,
                formData.selectedGender === 'male' && { backgroundColor: '#e3f2fd', borderColor: '#2563eb', borderWidth: 2 }
              ]}
              onPress={() => updateFormData('selectedGender', 'male')}
            >
              <Ionicons name="male-outline" size={32} color="#2563eb" />
            </TouchableOpacity>
            <TouchableOpacity 
              style={[
                dataScreenStyles.genderSelection,
                formData.selectedGender === 'female' && { backgroundColor: '#fce4ec', borderColor: '#db2777', borderWidth: 2 }
              ]}
              onPress={() => updateFormData('selectedGender', 'female')}
            >
              <Ionicons name="female-outline" size={32} color="#db2777" />
            </TouchableOpacity>
            <TouchableOpacity 
              style={[
                dataScreenStyles.genderSelection,
                formData.selectedGender === 'other' && { backgroundColor: '#f3e5f5', borderColor: 'purple', borderWidth: 2 }
              ]}
              onPress={() => updateFormData('selectedGender', 'other')}
            >
              <Ionicons name="male-female-outline" size={32} color="purple" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Date of Birth */}
        <View>
          <Text style={dataScreenStyles.subHeading}>Date of Birth *</Text>
          <View style={dataScreenStyles.dob}>
            <TextInput
              style={dataScreenStyles.dobInput}
              placeholder="DD"
              keyboardType="numeric"
              maxLength={2}
              value={formData.birthDate.day}
              onChangeText={(text) => updateFormData('birthDate', { ...formData.birthDate, day: text })}
            />
            <Text style={dataScreenStyles.dobText}>:</Text>
            <TextInput
              style={dataScreenStyles.dobInput}
              placeholder="MM"
              keyboardType="numeric"
              maxLength={2}
              value={formData.birthDate.month}
              onChangeText={(text) => updateFormData('birthDate', { ...formData.birthDate, month: text })}
            />
            <Text style={dataScreenStyles.dobText}>:</Text>
            <TextInput
              style={dataScreenStyles.dobInput}
              placeholder="YYYY"
              keyboardType="numeric"
              maxLength={4}
              value={formData.birthDate.year}
              onChangeText={(text) => updateFormData('birthDate', { ...formData.birthDate, year: text })}
            />
          </View>
        </View>

        {/* Professional Information */}
        <Text style={[dataScreenStyles.subHeading, {marginTop: hp(2)}]}>Professional Information</Text>
        
        {/* Specialization */}
        <Text style={dataScreenStyles.subHeading}>Specialization *</Text>
        <TextInput
          placeholderTextColor="#999"
          placeholder="e.g. Cardiologist, Dermatologist, etc."
          style={dataScreenStyles.mainTextInput}
          value={formData.specialization}
          onChangeText={(value) => updateFormData('specialization', value)}
        />

        <View style={dataScreenStyles.subContainer}>
          <View>
            <Text style={dataScreenStyles.subsubHeading}>Medical License *</Text>
            <TextInput
              style={dataScreenStyles.miniTextInput}
              placeholder="License Number"
              value={formData.medicalLicense}
              onChangeText={(value) => updateFormData('medicalLicense', value)}
            />
          </View>
          <View>
            <Text style={dataScreenStyles.subsubHeading}>License Authority *</Text>
            <TextInput
              style={dataScreenStyles.miniTextInput}
              placeholder="Issuing Authority"
              value={formData.licenseAuthority}
              onChangeText={(value) => updateFormData('licenseAuthority', value)}
            />
          </View>
        </View>

        <View style={dataScreenStyles.subContainer}>
          <View>
            <Text style={dataScreenStyles.subsubHeading}>Years Experience *</Text>
            <TextInput
              style={dataScreenStyles.miniTextInput}
              placeholder="e.g. 5 years"
              value={formData.yearsExperience}
              onChangeText={(value) => updateFormData('yearsExperience', value)}
            />
          </View>
          <View>
            <Text style={dataScreenStyles.subsubHeading}>Qualification *</Text>
            <TextInput
              style={dataScreenStyles.miniTextInput}
              placeholder="e.g. MBBS, MD"
              value={formData.qualification}
              onChangeText={(value) => updateFormData('qualification', value)}
            />
          </View>
        </View>

        <Text style={dataScreenStyles.subHeading}>University/Institute *</Text>
        <TextInput
          placeholderTextColor="#999"
          placeholder="Enter your university or institute name"
          style={dataScreenStyles.mainTextInput}
          value={formData.university}
          onChangeText={(value) => updateFormData('university', value)}
        />

        {/* Clinic Information */}
        <Text style={[dataScreenStyles.subHeading, {marginTop: hp(2)}]}>Clinic Information</Text>
        
        <Text style={dataScreenStyles.subHeading}>Clinic/Hospital Name *</Text>
        <TextInput
          placeholderTextColor="#999"
          placeholder="Enter clinic or hospital name"
          style={dataScreenStyles.mainTextInput}
          value={formData.clinicName}
          onChangeText={(value) => updateFormData('clinicName', value)}
        />

        <Text style={dataScreenStyles.subHeading}>Clinic Address *</Text>
        <TextInput
          placeholderTextColor="#999"
          placeholder="Enter complete address"
          style={dataScreenStyles.mainTextInput}
          value={formData.clinicAddress}
          onChangeText={(value) => updateFormData('clinicAddress', value)}
        />

        <View style={dataScreenStyles.subContainer}>
          <View>
            <Text style={dataScreenStyles.subsubHeading}>Consultation Fee *</Text>
            <TextInput
              style={dataScreenStyles.miniTextInput}
              placeholder="e.g. $100"
              keyboardType="numeric"
              value={formData.consultationFee}
              onChangeText={(value) => updateFormData('consultationFee', value)}
            />
          </View>
          <View>
            <Text style={dataScreenStyles.subsubHeading}>Primary Language *</Text>
            <TextInput
              style={dataScreenStyles.miniTextInput}
              placeholder="e.g. English"
              value={formData.primaryLanguage}
              onChangeText={(value) => updateFormData('primaryLanguage', value)}
            />
          </View>
        </View>

        <Text style={dataScreenStyles.subHeading}>Bio/Description *</Text>
        <TextInput
          placeholderTextColor="#999"
          placeholder="Write a short description about yourself and your practice"
          style={[dataScreenStyles.mainTextInput, { height: hp(10), textAlignVertical: 'top' }]}
          multiline
          value={formData.bio}
          onChangeText={(value) => updateFormData('bio', value)}
        />

        {/* Availability Information */}
        <Text style={[dataScreenStyles.subHeading, {marginTop: hp(2)}]}>Availability</Text>
        
        <View style={dataScreenStyles.subContainer}>
          <View>
            <Text style={dataScreenStyles.subsubHeading}>Available Days *</Text>
            <TextInput
              style={dataScreenStyles.miniTextInput}
              placeholder="e.g. Mon-Fri"
              value={formData.availableDays}
              onChangeText={(value) => updateFormData('availableDays', value)}
            />
          </View>
          <View>
            <Text style={dataScreenStyles.subsubHeading}>Available Hours *</Text>
            <TextInput
              style={dataScreenStyles.miniTextInput}
              placeholder="e.g. 9AM-5PM"
              value={formData.availableHours}
              onChangeText={(value) => updateFormData('availableHours', value)}
            />
          </View>
        </View>

        {/* Consultation Mode Selection */}
        <Text style={dataScreenStyles.subHeading}>Consultation Mode *</Text>
        <View style={dataScreenStyles.mappingCol}>
          {consultationModes.map((item) => (
            <TouchableOpacity 
              key={item.id} 
              style={[
                dataScreenStyles.mapping,
                formData.selectedConsultationMode === item.id && { 
                  backgroundColor: '#f0f8ff', 
                  borderColor: item.color, 
                  borderWidth: 2 
                }
              ]}
              onPress={() => updateFormData('selectedConsultationMode', item.id)}
            >
              <Ionicons
                name={item.icon as any}
                size={26}
                color={item.color}
                style={{ marginRight: hp(1) }}
              />
              <View style={{ flexDirection: "column" }}>
                <Text style={[
                  dataScreenStyles.mappingHeading,
                  formData.selectedConsultationMode === item.id && { fontWeight: 'bold' }
                ]}>{item.name}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[
            dataScreenStyles.generateButton,
            { backgroundColor: theme.colors.primary },
            isLoading && { opacity: 0.7 }
          ]}
          onPress={handleSubmit}
          disabled={isLoading}
        >
            {isLoading ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <Text style={{ color: "white", fontSize: hp(2.2) }}>Submit Registration</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </View>
    </View>
  );
}