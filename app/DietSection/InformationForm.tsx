import { dataScreenStyles } from "@/components/dataScreenStyles";
import { useCustomOnboarding } from "@/hooks/useCustomOnboarding";
import { Ionicons } from "@expo/vector-icons";
import { useFonts } from "expo-font";
import React, { useState } from "react";
import { Alert, Image, Text, TextInput, TouchableOpacity, View } from "react-native";
import { heightPercentageToDP as hp } from "react-native-responsive-screen";
/**
 * INFORMATION FORM SCREEN!!!!
 */
const data = [
  {
    id: 1,
    name: "Weight Loss",
    icon: "flame-outline",
    color: "red",
    description: "Burn fat and achieve a lean",
  },
  {
    id: 2,
    name: "Muscle Gain",
    icon: "barbell-outline",
    color: "black",
    description: "Build muscle strength with effective training and nutrition",
  },
  {
    id: 3,
    name: "Weight Gain",
    icon: "restaurant-outline",
    color: "green",
    description: "Gain weight through balanced diet, exercise.",
  },
];

export default function Index() {
  const { completeOnboarding, isLoading } = useCustomOnboarding();
  
  // Form state
  const [name, setName] = useState("");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [selectedGender, setSelectedGender] = useState<'male'|'female'|'other'|null>(null); // 'male', 'female', 'other'
  const [selectedGoal, setSelectedGoal] = useState<number|null>(null); // 1, 2, or 3
  const [birthDate, setBirthDate] = useState({ day: "", month: "", year: "" });
  
  const [fontsLoaded] = useFonts({
    Pacifico: require("../../assets/fonts/Pacifico-Regular.ttf"),
    LoraItalic: require("../../assets/fonts/static/Lora-Italic.ttf"),
    LoraRegular: require("../../assets/fonts/static/Lora-Regular.ttf"),
  });

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
      
      // Validate date of birth format
      const day = parseInt(birthDate.day);
      const month = parseInt(birthDate.month);
      const year = parseInt(birthDate.year);
      
      if (day < 1 || day > 31 || month < 1 || month > 12 || year < 1900 || year > new Date().getFullYear()) {
        Alert.alert(
          'Invalid Date',
          'Please enter a valid date of birth',
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
        birthDate
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
    <View style={dataScreenStyles.container}>
      <View style={dataScreenStyles.headingandlogo}>
        <Text style={dataScreenStyles.mainHeading}>FitFaat</Text>
        <Image
          source={require("../../assets/images/logo.png")}
          style={dataScreenStyles.logoImage}
        ></Image>
      </View>
      <View style={dataScreenStyles.mainBox}>
        <Text style={dataScreenStyles.personalizedText}>
          Enter your information to create a personalized meal plan
        </Text>
        <Text style={dataScreenStyles.subHeading}>Name *</Text>
        <TextInput
          placeholderTextColor={"#999"}
          placeholder="Enter your full name"
          style={dataScreenStyles.mainTextInput}
          value={name}
          onChangeText={setName}
        />
        <View style={dataScreenStyles.subContainer}>
          <View>
            {/* height */}
            <Text style={dataScreenStyles.subsubHeading}>Height(ft) *</Text>
            <TextInput
              style={dataScreenStyles.miniTextInput}
              placeholder="e.g. 5.66"
              keyboardType="numeric"
              maxLength={4}
              value={height}
              onChangeText={handleHeightChange}
            />
          </View>
          <View>
            {/* weight */}
            <Text style={dataScreenStyles.subsubHeading}>Weight(kg) *</Text>
            <TextInput
              style={dataScreenStyles.miniTextInput}
              placeholder="e.g. 77.4"
              keyboardType="numeric"
              maxLength={5}
              value={weight}
              onChangeText={setWeight}
            />
          </View>
        </View>
        <View>
          <Text style={dataScreenStyles.genderHeading}>Gender *</Text>
          <View style={dataScreenStyles.subContainer}>
            <TouchableOpacity 
              style={[
                dataScreenStyles.genderSelection,
                selectedGender === 'male' && { backgroundColor: '#e3f2fd', borderColor: '#2563eb', borderWidth: 2 }
              ]}
              onPress={() => setSelectedGender('male')}
            >
              <Ionicons name="male-outline" size={32} color="#2563eb" />
            </TouchableOpacity>
            <TouchableOpacity 
              style={[
                dataScreenStyles.genderSelection,
                selectedGender === 'female' && { backgroundColor: '#fce4ec', borderColor: '#db2777', borderWidth: 2 }
              ]}
              onPress={() => setSelectedGender('female')}
            >
              <Ionicons name="female-outline" size={32} color="#db2777" />
            </TouchableOpacity>
            <TouchableOpacity 
              style={[
                dataScreenStyles.genderSelection,
                selectedGender === 'other' && { backgroundColor: '#f3e5f5', borderColor: 'purple', borderWidth: 2 }
              ]}
              onPress={() => setSelectedGender('other')}
            >
              <Ionicons name="male-female-outline" size={32} color="purple" />
            </TouchableOpacity>
          </View>
        </View>
        <View>
          <Text style={dataScreenStyles.subHeading}>Date of Birth *</Text>
          <View style={dataScreenStyles.dob}>
            <TextInput
              style={dataScreenStyles.dobInput}
              placeholder="DD"
              keyboardType="numeric"
              maxLength={2}
              value={birthDate.day}
              onChangeText={(text) => setBirthDate(prev => ({ ...prev, day: text }))}
            />
            <Text style={dataScreenStyles.dobText}>:</Text>
            <TextInput
              style={dataScreenStyles.dobInput}
              placeholder="MM"
              keyboardType="numeric"
              maxLength={2}
              value={birthDate.month}
              onChangeText={(text) => setBirthDate(prev => ({ ...prev, month: text }))}
            />
            <Text style={dataScreenStyles.dobText}>:</Text>
            <TextInput
              style={dataScreenStyles.dobInput}
              placeholder="YYYY"
              keyboardType="numeric"
              maxLength={4}
              value={birthDate.year}
              onChangeText={(text) => setBirthDate(prev => ({ ...prev, year: text }))}
            />
          </View>
        </View>
        <Text style={dataScreenStyles.subHeading}>What&apos;s your Goal? *</Text>
        <View style={dataScreenStyles.mappingCol}>
          {data.map((item) => (
            <TouchableOpacity 
              key={item.id} 
              style={[
                dataScreenStyles.mapping,
                selectedGoal === item.id && { 
                  backgroundColor: '#f0f8ff', 
                  borderColor: item.color, 
                  borderWidth: 2 
                }
              ]}
              onPress={() => setSelectedGoal(item.id)}
            >
              {/* Icon */}
              <Ionicons
                name={item.icon as keyof typeof Ionicons.glyphMap}
                size={26}
                color={item.color}
                style={{ marginRight: hp(1) }}
              />

              {/* Text content */}
              <View style={{ flexDirection: "column" }}>
                <Text style={[
                  dataScreenStyles.mappingHeading,
                  selectedGoal === item.id && { fontWeight: 'bold' }
                ]}>{item.name}</Text>
                <Text style={dataScreenStyles.mappingHeadingName}>
                  {item.description}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity
          style={[
            dataScreenStyles.generateButton,
            isLoading && { opacity: 0.7 }
          ]}
          onPress={handleFormSubmit}
          disabled={isLoading}
        >
          <Text style={{ color: "white", fontSize: hp(2.2) }}>
            {isLoading ? 'Processing...' : 'Complete Setup'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
