import { View, Text, TouchableOpacity } from "react-native";
import React, { useEffect, useState } from "react";
import { ChevronLeftIcon } from "react-native-heroicons/outline";
import { heightPercentageToDP as hp } from "react-native-responsive-screen";
import { useNavigation } from "@react-navigation/native";
import Carosel from "../components/Carosel";
import LoadingBar from "../components/LoadingScreen";
import Body from "../components/BodyParts";
import WorkoutButton from "../components/WorkoutButton";
import { ScrollView } from "react-native-virtualized-view";

export default function MainScreen() {
  const navigation = useNavigation();
  const [Loading, setLoading] = useState(true);

  // Define your data here
  const carouselData = [
    { id: 1, image: require("../assets/fitness.jpg") },
    { id: 2, image: require("../assets/fit.jpg") },
    { id: 3, image: require("../assets/gym.png") },
    { id: 4, image: require("../assets/beard.jpg") },
    { id: 5, image: require("../assets/man.jpg") },
  ];

  useEffect(() => {
    const Timer = setTimeout(() => {
      setLoading(false);
    }, 3000);
    return () => clearTimeout(Timer);
  }, []);

  const handlePremiumWorkout = () => {
    // Navigate to premium workout screen or show premium features
    navigation.navigate("Exercises", { 
      item: { 
        name: "Premium Workout", 
        image: carouselData[2].image // Use existing gym image
      } 
    });
  };

  return (
    <View className="bg-gray-200 flex-1">
      {Loading ? (
        <LoadingBar />
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ flexGrow: 1 }}
        >
          {/* Header Section */}
          <View className="flex-row items-center justify-between w-full mt-12 px-5">
            <TouchableOpacity>
              <View className="w-14 h-14 bg-yellow-300 justify-center items-center rounded-lg">
                <ChevronLeftIcon
                  size={hp(4.5)}
                  color="black"
                  strokeWidth={4.5}
                  onPress={() => navigation.navigate("Welcome")}
                />
              </View>
            </TouchableOpacity>
            <Text
              className="text-black"
              style={{ fontSize: hp(3.5), paddingRight: hp(15.5) }}
            >
              <Text className="text-yellow-400" style={{ fontSize: hp(4) }}>
                Fit
              </Text>
              Faat
            </Text>
          </View>

          {/* Carousel Section */}
          <Carosel data={carouselData} />

          {/* Premium Workout Button - Circular with Crown */}
          <View style={{ 
            alignItems: 'center', 
            marginTop: hp(3),
            marginBottom: hp(2)
          }}>
            <WorkoutButton
              title="Premium Workout"
              onPress={handlePremiumWorkout}
            />
          </View>

          {/* Body Parts Section */}
          <Body />
        </ScrollView>
      )}
    </View>
  );
}