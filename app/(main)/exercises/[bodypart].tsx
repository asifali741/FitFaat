import { View, Text, TouchableOpacity, FlatList, ActivityIndicator } from "react-native";
import React, { useEffect, useState } from "react";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import { ChevronLeftIcon } from "react-native-heroicons/outline";
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from "react-native-responsive-screen";
import { fetchExercisesByBodyPart } from "../../../api/exerciseDB";
import { dummyData } from "../../../constants/list";
import { Image } from "expo-image";

const bodyPartMap = {
  "Biceps": "upper arms",
  "Tricep": "upper arms",
  "Chest": "chest",
  "Back": "back",
  "Waist": "waist",
  "Upper Arms": "upper arms",
  "Upper Legs": "upper legs",
  "Shoulder": "shoulders",
  "Neck": "neck",
  "Lower Legs": "lower legs",
  "Lower Arms": "lower arms",
  "Cardio": "cardio",
  "Legs": "upper legs",
  "Shoulders": "shoulders",
  "Core": "waist",
  "Full Body": "cardio", // fallback
};

export default function ExercisesScreen() {
  const [exercises, setExercises] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { bodypart, name } = useLocalSearchParams();

  useEffect(() => {
    if (bodypart || name) {
      getExercises(bodypart as string || name as string);
    }
  }, [bodypart, name]);

  const getExercises = async (bodyPartName: string) => {
    setLoading(true);
    console.log("Fetching exercises for:", bodyPartName);
    
    const apiBodyPart = bodyPartMap[bodyPartName];
    if (!apiBodyPart) {
      console.log("Invalid body part:", bodyPartName);
      setExercises(dummyData); // Use dummy data as fallback
      setLoading(false);
      return;
    }

    try {
      let data = await fetchExercisesByBodyPart(apiBodyPart);
      if (data && data.length > 0) {
        setExercises(data);
      } else {
        // Use dummy data if API fails
        console.log("Using dummy data as fallback");
        setExercises(dummyData);
      }
    } catch (error) {
      console.log("Error fetching exercises:", error);
      setExercises(dummyData); // Use dummy data as fallback
    }
    setLoading(false);
  };

  const handleExercisePress = (exercise: any) => {
    console.log("Navigating to exercise details:", exercise.name);
    router.push({
      pathname: "/(main)/exercise-details",
      params: { exercise: JSON.stringify(exercise) }
    });
  };

  const ExerciseCard = ({ item, index }: { item: any, index: number }) => {
    const isLeftColumn = index % 2 === 0;
    
    return (
      <View
        style={{
          marginLeft: isLeftColumn ? wp(4) : wp(2),
          marginRight: isLeftColumn ? wp(2) : wp(4),
          marginBottom: hp(2),
        }}
      >
        <TouchableOpacity
          onPress={() => handleExercisePress(item)}
          style={{
            backgroundColor: '#f5f5f5',
            borderRadius: hp(2),
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 3,
            overflow: 'hidden',
          }}
        >
          <Image
            source={{ uri: item.gifUrl }}
            contentFit="cover"
            style={{
              width: wp(44),
              height: wp(44),
            }}
          />
          <View style={{ padding: hp(1) }}>
            <Text
              style={{
                textAlign: 'center',
                fontWeight: '600',
                fontSize: hp(1.8),
                color: '#333',
              }}
            >
              {item?.name?.length > 20 ? item.name.slice(0,20) + '...' : item.name}
            </Text>
            <Text
              style={{
                textAlign: 'center',
                fontSize: hp(1.4),
                color: '#666',
                marginTop: hp(0.5),
              }}
            >
              {item?.target}
            </Text>
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8f8f8' }}>
        <ActivityIndicator size="large" color="#FF6B6B" />
        <Text style={{ marginTop: hp(2), fontSize: hp(2), color: '#666' }}>
          Loading exercises...
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#f8f8f8' }}>
      {/* Header Section */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        marginTop: hp(6),
        paddingHorizontal: wp(5),
        marginBottom: hp(3),
      }}>
        <TouchableOpacity onPress={() => router.back()}>
          <View style={{
            width: hp(7),
            height: hp(7),
            backgroundColor: '#FFD700',
            justifyContent: 'center',
            alignItems: 'center',
            borderRadius: hp(1.5),
          }}>
            <ChevronLeftIcon
              size={hp(4.5)}
              color="black"
              strokeWidth={4.5}
            />
          </View>
        </TouchableOpacity>
        <Text
          style={{
            fontSize: hp(3),
            fontWeight: 'bold',
            color: '#333',
            flex: 1,
            textAlign: 'center',
            marginRight: hp(7), // Balance the back button
          }}
        >
          {(bodypart || name) as string} Exercises
        </Text>
      </View>

      {/* Exercise Count */}
      <Text
        style={{
          fontSize: hp(2),
          color: '#666',
          textAlign: 'center',
          marginBottom: hp(2),
        }}
      >
        {exercises.length} exercises found
      </Text>

      {/* Exercises List */}
      <FlatList
        data={exercises}
        numColumns={2}
        keyExtractor={(item) => item.id || item.name}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: hp(3),
        }}
        renderItem={({ item, index }) => (
          <ExerciseCard item={item} index={index} />
        )}
      />
    </View>
  );
}