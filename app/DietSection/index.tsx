//This Screen has the Instructions on how to fill Information Form
//            This Screen Redirects to app/DietSection/InformationForm.tsx
//
import { Ionicons } from "@expo/vector-icons";
import { useFonts } from "expo-font";
import { useRouter } from "expo-router";
import React from "react";
import { Image, ScrollView, Text, TouchableOpacity, View } from "react-native";
import {
  heightPercentageToDP as hp
} from "react-native-responsive-screen";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "@/contexts/ThemeContext";
import { createGetStartedStyles } from "../../components/getStarted";

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
  const { colors } = useTheme();
  const screenStyles = createGetStartedStyles(colors);

  const [fontsLoaded] = useFonts({
    Pacifico: require("../../assets/fonts/Pacifico-Regular.ttf"),
    LoraItalic: require("../../assets/fonts/static/Lora-Italic.ttf"),
    LoraRegular: require("../../assets/fonts/static/Lora-Regular.ttf"),
  });

  if (!fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaView style={screenStyles.container}>
      <ScrollView 
        contentContainerStyle={screenStyles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Decorative Header with Gradient */}
        <View style={screenStyles.decorativeHeader}>
          <View style={[screenStyles.gradientCircle, screenStyles.circle1]} />
          <View style={[screenStyles.gradientCircle, screenStyles.circle2]} />
        </View>

        {/* Logo Section */}
        <View style={screenStyles.logoSection}>
          <View style={screenStyles.logoBadge}>
            <Image
              source={require("../../assets/images/logo.png")}
              style={screenStyles.logoSize}
            />
          </View>
          <Text style={screenStyles.mainHeading}>FitFaat</Text>
          <Text style={screenStyles.taglineSmall}>Transform Your Body, Transform Your Life</Text>
        </View>

        {/* Instructions Card */}
        <View style={screenStyles.instructionCard}>
          <View style={screenStyles.sectionHeader}>
            <Ionicons name="list-outline" size={hp(2.8)} color={colors.primary} />
            <Text style={screenStyles.instructionTitle}>Setup Steps</Text>
          </View>
          
          <View style={screenStyles.stepsList}>
            <StepItem number="1" text="Create your account" icon="create-outline" styles={screenStyles} colors={colors} />
            <StepItem number="2" text="Set your fitness goals" icon="target-outline" styles={screenStyles} colors={colors} />
            <StepItem number="3" text="Enter your details" icon="person-outline" styles={screenStyles} colors={colors} />
            <StepItem number="4" text="Get personalized plan" icon="flash-outline" styles={screenStyles} colors={colors} />
          </View>
        </View>

        {/* Mission Cards */}
        <View style={screenStyles.missionContainer}>
          <View style={screenStyles.sectionHeader}>
            <Ionicons name="rocket-outline" size={hp(2.8)} color={colors.primary} />
            <Text style={screenStyles.missionTitle}>Your Goals</Text>
          </View>
          
          <View style={screenStyles.goalsGrid}>
            {mission.map((item) => (
              <GoalCard key={item.id} item={item} styles={screenStyles} />
            ))}
          </View>
        </View>

        {/* Benefits Section */}
        <View style={screenStyles.benefitsContainer}>
          <Text style={screenStyles.benefitsTitle}>Why Choose FitFaat?</Text>
          <BenefitItem icon="checkmark-circle" text="Personalized diet plans" styles={screenStyles} colors={colors} />
          <BenefitItem icon="checkmark-circle" text="Expert nutritional guidance" styles={screenStyles} colors={colors} />
          <BenefitItem icon="checkmark-circle" text="Real-time progress tracking" styles={screenStyles} colors={colors} />
          <BenefitItem icon="checkmark-circle" text="Community support & motivation" styles={screenStyles} colors={colors} />
        </View>

        {/* CTA Section */}
        <View style={screenStyles.ctaSection}>
          <Text style={screenStyles.ctaDescription}>
            Ready to start your transformation journey?
          </Text>
          <TouchableOpacity
            style={screenStyles.getStartedButton}
            onPress={() => router.push('/DietSection/InformationForm')}
            activeOpacity={0.8}
          >
            <Text style={screenStyles.getStartedButtonText}>
              Get Started with Diet Plan
            </Text>
            <Ionicons name="arrow-forward" size={hp(2.2)} color={colors.textOnPrimary} />
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={screenStyles.footerSection}>
          <Text style={screenStyles.copyRightText}>
            © 2025 FitFaat. All rights reserved.
          </Text>
          <Text style={screenStyles.footerTagline}>
            Empowering your fitness journey
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// Reusable Components
const StepItem = ({ number, text, icon, styles, colors }: any) => {
  return (
    <View style={styles.stepItem}>
      <View style={styles.stepNumberBadge}>
        <Text style={styles.stepNumber}>{number}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.stepText}>{text}</Text>
      </View>
      <Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={hp(2.4)} color={colors.primary} />
    </View>
  );
};

const GoalCard = ({ item, styles }: any) => {
  return (
    <View style={styles.goalCard}>
      <View style={[styles.goalIconContainer, { backgroundColor: item.color + '15' }]}>
        <Ionicons
          name={item.icon as keyof typeof Ionicons.glyphMap}
          size={hp(3.5)}
          color={item.color}
        />
      </View>
      <Text style={styles.goalName}>{item.name}</Text>
      <Text style={styles.goalDescription}>{item.description}</Text>
    </View>
  );
};

const BenefitItem = ({ icon, text, styles, colors }: any) => {
  return (
    <View style={styles.benefitItem}>
      <Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={hp(2.4)} color={colors.secondary} />
      <Text style={styles.benefitText}>{text}</Text>
    </View>
  );
};
