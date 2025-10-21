import React, { useState } from "react";
import { ActivityIndicator, Alert, Image, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { dataScreenStyles } from "@/components/dataScreenStyles";
import { Ionicons } from "@expo/vector-icons";
import { useFonts } from "expo-font";
import { heightPercentageToDP as hp } from "react-native-responsive-screen";
import { useRouter } from "expo-router";
import { colorsSheet } from "../(settings)/ui_elements";

const specializations = [
  { id: 1, name: "Cardiologist", icon: "heart", color: colorsSheet.error },
  { id: 2, name: "Dermatologist", icon: "person", color: colorsSheet.warning },
  { id: 3, name: "Neurologist", icon: "medical", color: colorsSheet.info },
  { id: 4, name: "Pediatrician", icon: "happy", color: colorsSheet.primaryLight },
  { id: 5, name: "Orthopedic", icon: "body", color: colorsSheet.primary },
  { id: 6, name: "Gynecologist", icon: "female", color: colorsSheet.secondary },
];

const consultationModes = [
  { id: 1, name: "In-person", icon: "location", color: colorsSheet.success },
  { id: 2, name: "Online", icon: "videocam", color: colorsSheet.info },
  { id: 3, name: "Both", icon: "options", color: colorsSheet.primary },
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
    selectedSpecialization: null,
    medicalLicense: "",
    licenseAuthority: "",
    yearsExperience: "",
    qualification: "",
    university: "",
    clinicName: "",
    clinicAddress: "",
    consultationFee: "",
    languagesSpoken: "",
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
      'clinicName', 'clinicAddress', 'consultationFee', 'languagesSpoken',
      'bio', 'availableDays', 'availableHours'
    ];
    
    const missingFields = [];
    
    required.forEach(field => {
      if (!formData[field].trim()) {
        missingFields.push(field.replace(/([A-Z])/g, ' $1').toLowerCase());
      }
    });
    
    if (!formData.selectedGender) missingFields.push('gender');
    if (!formData.birthDate.day.trim() || !formData.birthDate.month.trim() || !formData.birthDate.year.trim()) {
      missingFields.push('date of birth');
    }
    if (!formData.selectedSpecialization) missingFields.push('specialization');
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
      
      Alert.alert(
        'Registration Submitted',
        'Your doctor registration has been submitted successfully. We will review and get back to you within 24 hours.',
        [{ 
          text: 'OK', 
          onPress: () => router.back()
        }]
      );
    } catch (error) {
      console.error('Registration error:', error);
      Alert.alert('Error', 'Failed to submit registration. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const updateFormData = (field, value) => {
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
                formData.selectedGender === 'male' && { backgroundColor: colorsSheet.primarySoft, borderColor: colorsSheet.primary, borderWidth: 2 }
              ]}
              onPress={() => updateFormData('selectedGender', 'male')}
            >
              <Ionicons name="male-outline" size={32} color={colorsSheet.primary} />
            </TouchableOpacity>
            <TouchableOpacity 
              style={[
                dataScreenStyles.genderSelection,
                formData.selectedGender === 'female' && { backgroundColor: colorsSheet.primarySoft, borderColor: colorsSheet.secondary, borderWidth: 2 }
              ]}
              onPress={() => updateFormData('selectedGender', 'female')}
            >
              <Ionicons name="female-outline" size={32} color={colorsSheet.secondary} />
            </TouchableOpacity>
            <TouchableOpacity 
              style={[
                dataScreenStyles.genderSelection,
                formData.selectedGender === 'other' && { backgroundColor: colorsSheet.primarySoft, borderColor: colorsSheet.primaryLight, borderWidth: 2 }
              ]}
              onPress={() => updateFormData('selectedGender', 'other')}
            >
              <Ionicons name="male-female-outline" size={32} color={colorsSheet.primaryLight} />
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
        
        {/* Specialization Selection */}
        <Text style={dataScreenStyles.subHeading}>Specialization *</Text>
        <View style={dataScreenStyles.mappingCol}>
          {specializations.map((item) => (
            <TouchableOpacity 
              key={item.id} 
              style={[
                dataScreenStyles.mapping,
                formData.selectedSpecialization === item.id && { 
                  backgroundColor: colorsSheet.primarySoft, 
                  borderColor: item.color, 
                  borderWidth: 2 
                }
              ]}
              onPress={() => updateFormData('selectedSpecialization', item.id)}
            >
              <Ionicons
                name={item.icon as keyof typeof Ionicons.glyphMap}
                size={26}
                color={item.color}
                style={{ marginRight: hp(1) }}
              />
              <View style={{ flexDirection: "column" }}>
                <Text style={[
                  dataScreenStyles.mappingHeading,
                  formData.selectedSpecialization === item.id && { fontWeight: 'bold' }
                ]}>{item.name}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

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
              placeholder="e.g. 5"
              keyboardType="numeric"
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
            <Text style={dataScreenStyles.subsubHeading}>Languages *</Text>
            <TextInput
              style={dataScreenStyles.miniTextInput}
              placeholder="English, Hindi"
              value={formData.languagesSpoken}
              onChangeText={(value) => updateFormData('languagesSpoken', value)}
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
              placeholder="Mon-Fri"
              value={formData.availableDays}
              onChangeText={(value) => updateFormData('availableDays', value)}
            />
          </View>
          <View>
            <Text style={dataScreenStyles.subsubHeading}>Available Hours *</Text>
            <TextInput
              style={dataScreenStyles.miniTextInput}
              placeholder="9AM-5PM"
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
                  backgroundColor: colorsSheet.primarySoft, 
                  borderColor: item.color, 
                  borderWidth: 2 
                }
              ]}
              onPress={() => updateFormData('selectedConsultationMode', item.id)}
            >
              <Ionicons
                name={item.icon as keyof typeof Ionicons.glyphMap}
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
            { backgroundColor: colorsSheet.buttonPrimary },
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