import { Text, TextInput, TouchableOpacity, View, Image } from "react-native";
import React from "react";
//import { useRouter } from "expo-router";
//import { useClerk } from "@clerk/clerk-expo";
import { dataScreenStyles } from "@/components/dataScreenStyles";
import { Ionicons } from "@expo/vector-icons";
import { heightPercentageToDP as hp } from "react-native-responsive-screen";
import { useFonts } from "expo-font";
import { useRouter } from "expo-router";

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
        <Text style={dataScreenStyles.subHeading}>Name</Text>
        <TextInput
          placeholderTextColor={"black"}
          style={dataScreenStyles.mainTextInput}
        ></TextInput>
        <View style={dataScreenStyles.subContainer}>
          <View>
            {/* height */}
            <Text style={dataScreenStyles.subsubHeading}>Height(ft)</Text>
            <TextInput
              style={dataScreenStyles.miniTextInput}
              placeholder="e.g. 5.66"
              keyboardType="numeric"
              maxLength={4}
            ></TextInput>
          </View>
          <View>
            {/* weight */}
            <Text style={dataScreenStyles.subsubHeading}>Weight(kg)</Text>
            <TextInput
              style={dataScreenStyles.miniTextInput}
              placeholder="e.g. 77.4"
              keyboardType="numeric"
              maxLength={4}
            ></TextInput>
          </View>
        </View>
        <View>
          <Text style={dataScreenStyles.genderHeading}>Gender</Text>
          <View style={dataScreenStyles.subContainer}>
            <TouchableOpacity style={dataScreenStyles.genderSelection}>
              <Ionicons name="male-outline" size={32} color="#2563eb" />
            </TouchableOpacity>
            <TouchableOpacity style={dataScreenStyles.genderSelection}>
              <Ionicons name="female-outline" size={32} color="#db2777" />
            </TouchableOpacity>
            <TouchableOpacity style={dataScreenStyles.genderSelection}>
              <Ionicons name="male-female-outline" size={32} color="purple" />
            </TouchableOpacity>
          </View>
        </View>
        <View>
          <Text style={dataScreenStyles.subHeading}>Date of Birth</Text>
          <View style={dataScreenStyles.dob}>
            <TextInput
              style={dataScreenStyles.dobInput}
              placeholder="Date"
              keyboardType="numeric"
              maxLength={2}
            />
            <Text style={dataScreenStyles.dobText}>:</Text>
            <TextInput
              style={dataScreenStyles.dobInput}
              placeholder="Month"
              keyboardType="numeric"
              maxLength={2}
            />
            <Text style={dataScreenStyles.dobText}>:</Text>
            <TextInput
              style={dataScreenStyles.dobInput}
              placeholder="Year"
              keyboardType="numeric"
              maxLength={4}
            />
          </View>
        </View>
        <Text style={dataScreenStyles.subHeading}>What&apos;s your Goal?</Text>
        <View style={dataScreenStyles.mappingCol}>
          {data.map((item) => (
            <TouchableOpacity key={item.id} style={dataScreenStyles.mapping}>
              {/* Icon */}
              <Ionicons
                name={item.icon}
                size={26}
                color={item.color}
                style={{ marginRight: hp(1) }}
              />

              {/* Text content */}
              <View style={{ flexDirection: "column" }}>
                <Text style={dataScreenStyles.mappingHeading}>{item.name}</Text>
                <Text style={dataScreenStyles.mappingHeadingName}>
                  {item.description}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity
          style={dataScreenStyles.generateButton}
          onPress={() => router.push("/DietSection/DietPlanScreen")}
        >
          <Text style={{ color: "white", fontSize: hp(2.2) }}>Generate</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
