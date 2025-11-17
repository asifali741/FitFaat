//This Screen has the Instructions on how to fill Information Form
//            This Screen Redirects to app/DietSection/InformationForm.tsx
//
import { Ionicons } from "@expo/vector-icons";
import { useFonts } from "expo-font";
import { useRouter } from "expo-router";
import React from "react";
import { Image, ScrollView, Text, TouchableOpacity, View } from "react-native";
import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from "react-native-responsive-screen";
import { SafeAreaView } from "react-native-safe-area-context";
import { getStarted } from "../../components/getStarted";

const mission = [
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
  const router = useRouter();

  const [fontsLoaded] = useFonts({
    Pacifico: require("../../assets/fonts/Pacifico-Regular.ttf"),
    LoraItalic: require("../../assets/fonts/static/Lora-Italic.ttf"),
    LoraRegular: require("../../assets/fonts/static/Lora-Regular.ttf"),
  });

  if (!fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaView style={getStarted.container}>
      <ScrollView 
        contentContainerStyle={getStarted.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Decorative Header with Gradient */}
        <View style={getStarted.decorativeHeader}>
          <View style={[getStarted.gradientCircle, getStarted.circle1]} />
          <View style={[getStarted.gradientCircle, getStarted.circle2]} />
        </View>

        {/* Logo Section */}
        <View style={getStarted.logoSection}>
          <View style={getStarted.logoBadge}>
            <Image
              source={require("../../assets/images/logo.png")}
              style={getStarted.logoSize}
            />
          </View>
          <Text style={getStarted.mainHeading}>FitFaat</Text>
          <Text style={getStarted.taglineSmall}>Transform Your Body, Transform Your Life</Text>
        </View>

        {/* Instructions Card */}
        <View style={getStarted.instructionCard}>
          <View style={getStarted.sectionHeader}>
            <Ionicons name="list-outline" size={hp(2.8)} color="#26867C" />
            <Text style={getStarted.instructionTitle}>Setup Steps</Text>
          </View>
          
          <View style={getStarted.stepsList}>
            <StepItem number="1" text="Create your account" icon="create-outline" />
            <StepItem number="2" text="Set your fitness goals" icon="target-outline" />
            <StepItem number="3" text="Enter your details" icon="person-outline" />
            <StepItem number="4" text="Get personalized plan" icon="flash-outline" />
          </View>
        </View>

        {/* Mission Cards */}
        <View style={getStarted.missionContainer}>
          <View style={getStarted.sectionHeader}>
            <Ionicons name="rocket-outline" size={hp(2.8)} color="#26867C" />
            <Text style={getStarted.missionTitle}>Your Goals</Text>
          </View>
          
          <View style={getStarted.goalsGrid}>
            {mission.map((item) => (
              <GoalCard key={item.id} item={item} />
            ))}
          </View>
        </View>

        {/* Benefits Section */}
        <View style={getStarted.benefitsContainer}>
          <Text style={getStarted.benefitsTitle}>Why Choose FitFaat?</Text>
          <BenefitItem icon="checkmark-circle" text="Personalized diet plans" />
          <BenefitItem icon="checkmark-circle" text="Expert nutritional guidance" />
          <BenefitItem icon="checkmark-circle" text="Real-time progress tracking" />
          <BenefitItem icon="checkmark-circle" text="Community support & motivation" />
        </View>

        {/* CTA Section */}
        <View style={getStarted.ctaSection}>
          <Text style={getStarted.ctaDescription}>
            Ready to start your transformation journey?
          </Text>
          <TouchableOpacity
            style={getStarted.getStartedButton}
            onPress={() => router.push('/DietSection/InformationForm')}
            activeOpacity={0.8}
          >
            <Text style={getStarted.getStartedButtonText}>
              Get Started with Diet Plan
            </Text>
            <Ionicons name="arrow-forward" size={hp(2.2)} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={getStarted.footerSection}>
          <Text style={getStarted.copyRightText}>
            © 2025 FitFaat. All rights reserved.
          </Text>
          <Text style={getStarted.footerTagline}>
            Empowering your fitness journey
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// Reusable Components
const StepItem = ({ number, text, icon }: any) => {
  return (
    <View style={getStarted.stepItem}>
      <View style={getStarted.stepNumberBadge}>
        <Text style={getStarted.stepNumber}>{number}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={getStarted.stepText}>{text}</Text>
      </View>
      <Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={hp(2.4)} color="#26867C" />
    </View>
  );
};

const GoalCard = ({ item }: any) => {
  return (
    <View style={getStarted.goalCard}>
      <View style={[getStarted.goalIconContainer, { backgroundColor: item.color + '15' }]}>
        <Ionicons
          name={item.icon as keyof typeof Ionicons.glyphMap}
          size={hp(3.5)}
          color={item.color}
        />
      </View>
      <Text style={getStarted.goalName}>{item.name}</Text>
      <Text style={getStarted.goalDescription}>{item.description}</Text>
    </View>
  );
};

const BenefitItem = ({ icon, text }: any) => {
  return (
    <View style={getStarted.benefitItem}>
      <Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={hp(2.4)} color="#4ECDC4" />
      <Text style={getStarted.benefitText}>{text}</Text>
    </View>
  );
};
