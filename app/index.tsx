import { Text, TouchableOpacity, View, Image } from "react-native";
import React from "react";
import { useRouter } from "expo-router";
import { useFonts } from "expo-font";
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from "react-native-responsive-screen";
import { Ionicons } from "@expo/vector-icons";
import { getStarted } from "../components/getStarted";

const mission = [
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
  const router = useRouter();

  const [fontsLoaded] = useFonts({
    Pacifico: require("../assets/fonts/Pacifico-Regular.ttf"),
    LoraItalic: require("../assets/fonts/static/Lora-Italic.ttf"),
    LoraRegular: require("../assets/fonts/static/Lora-Regular.ttf"),
  });

  if (!fontsLoaded) {
    return null;
  }

  return (
    <View style={getStarted.container}>
      <View style={getStarted.logoText}>
        <Text style={getStarted.mainHeading}>FitFaat</Text>
        <Image
          source={require("../assets/images/logo.png")}
          style={getStarted.logoSize}
        />
      </View>
      <View style={getStarted.instructionBox}>
        <Text style={getStarted.instructionText}>Instructions</Text>
        <Text style={getStarted.instructionFont}>
          Follow the steps below to get started:
        </Text>
        <Text style={getStarted.instructionFont}>1. Create an account</Text>
        <Text style={getStarted.instructionFont}>
          2. Set your fitness goals
        </Text>
        <Text style={getStarted.instructionFont}>• Enter your full name</Text>
        <Text style={getStarted.instructionFont}>
          • Provide your current height
        </Text>
        <Text style={getStarted.instructionFont}>
          • Provide your current weight
        </Text>
        <Text style={getStarted.instructionFont}>
          • Select Gender e.g. male , female , custom etc
        </Text>
        <Text style={getStarted.instructionFont}>
          • Select date of Birth(dob)
        </Text>
        <Text style={getStarted.instructionFont}>• Select your goal</Text>
        <Text style={getStarted.instructionFont}>
          4. Begin your personalized diet and fitness plan
        </Text>
      </View>

      <View style={getStarted.missionContainer}>
        <Text style={getStarted.missionText}>Our Mission</Text>
        <View style={getStarted.iconsDesign}>
          {mission.map((item) => (
            <Ionicons
              key={item.id}
              name={item.icon}
              size={hp(5)}
              color={item.color}
            />
          ))}
        </View>
        <Text style={getStarted.tagLine}>
          Together, we can achieve your fitness goals!
        </Text>
      </View>

      <View style={getStarted.getStartedButtonDesign}>
        <TouchableOpacity
          style={getStarted.getStartedButtonText}
          onPress={() => router.push("/DietSection")}
        >
          <Text style={{ color: "white", fontSize: 18, fontWeight: "600" }}>
            Get Started with Diet Plan
          </Text>
        </TouchableOpacity>
        <Text style={getStarted.copyRightText}>
          © 2025 FitFaat. Empowering your fitness journey. All rights reserved.
        </Text>
      </View>
    </View>
  );
}
