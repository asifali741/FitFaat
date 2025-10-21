import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import React, { useState, useEffect } from "react";
import { useRouter, useLocalSearchParams } from "expo-router";
import { XMarkIcon } from "react-native-heroicons/outline";
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from "react-native-responsive-screen";
import { Image } from "expo-image";
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function ExerciseDetails() {
  const router = useRouter();
  const { exercise } = useLocalSearchParams();
  const [isFavorite, setIsFavorite] = useState(false);
  
  let exerciseData;
  try {
    exerciseData = JSON.parse(exercise as string);
  } catch (error) {
    console.error("Error parsing exercise data:", error);
    exerciseData = null;
  }

  // Reset state when component mounts or exercise changes
  useEffect(() => {
    setIsFavorite(false); // Reset state first
    if (exerciseData) {
      console.log('Exercise changed, checking favorite status for:', exerciseData.name);
      checkFavoriteStatus();
    }
  }, [exercise]); // Changed dependency from exerciseData to exercise parameter

  const checkFavoriteStatus = async () => {
    try {
      const favorites = await AsyncStorage.getItem('favoriteExercises');
      if (favorites && exerciseData) {
        const favoritesList = JSON.parse(favorites);
        console.log('Checking favorite status for:', exerciseData.name, 'ID:', exerciseData.id);
        console.log('Current favorites:', favoritesList.map(f => ({ name: f.name, id: f.id })));
        const isAlreadyFavorite = favoritesList.some((fav: any) => fav.id === exerciseData.id);
        console.log('Is favorite?', isAlreadyFavorite);
        setIsFavorite(isAlreadyFavorite);
      } else {
        console.log('No favorites found or no exercise data');
        setIsFavorite(false);
      }
    } catch (error) {
      console.error('Error checking favorite status:', error);
      setIsFavorite(false);
    }
  };

  const toggleFavorite = async () => {
    try {
      console.log('Toggling favorite for:', exerciseData.name, 'Current status:', isFavorite);
      const favorites = await AsyncStorage.getItem('favoriteExercises');
      let favoritesList = favorites ? JSON.parse(favorites) : [];
      console.log('Current favorites before toggle:', favoritesList.length);
      
      if (isFavorite) {
        // Remove from favorites
        const beforeCount = favoritesList.length;
        favoritesList = favoritesList.filter((fav: any) => fav.id !== exerciseData.id);
        console.log('Removed from favorites:', exerciseData.name, 'Count:', beforeCount, '->', favoritesList.length);
      } else {
        // Add to favorites - check if already exists first
        const alreadyExists = favoritesList.some((fav: any) => fav.id === exerciseData.id);
        if (!alreadyExists) {
          favoritesList.push(exerciseData);
          console.log('Added to favorites:', exerciseData.name, 'New count:', favoritesList.length);
        } else {
          console.log('Exercise already in favorites, skipping add');
        }
      }
      
      await AsyncStorage.setItem('favoriteExercises', JSON.stringify(favoritesList));
      console.log('Saved to AsyncStorage, new favorite status:', !isFavorite);
      setIsFavorite(!isFavorite);
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  if (!exerciseData) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Error loading exercise details</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ color: '#FF6B6B', marginTop: 20 }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#f8f8f8' }}>
      <TouchableOpacity
        onPress={() => router.back()}
        style={{ zIndex: 10 }}
      >
        <View
          style={{
            height: hp(7),
            width: hp(7),
            backgroundColor: '#FFD700',
            borderRadius: hp(2),
            justifyContent: 'center',
            alignItems: 'center',
            marginTop: hp(6),
            marginLeft: hp(2),
          }}
        >
          <XMarkIcon
            size={hp(4.5)}
            color="red"
            strokeWidth={4.5}
          />
        </View>
      </TouchableOpacity>
      
      <Image
        source={{ uri: exerciseData.gifUrl }}
        contentFit="cover"
        style={{
          height: hp(45),
          width: "100%",
          borderBottomLeftRadius: 30,
          borderBottomRightRadius: 30,
          marginTop: hp(-8), // Overlap with button
        }}
      />
      
      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={{ 
          paddingBottom: hp(5),
          paddingTop: hp(3),
        }}
      >
        <Text 
          style={{
            fontSize: hp(3),
            fontWeight: 'bold',
            marginLeft: hp(2),
            marginRight: hp(2),
            color: '#333',
            textAlign: 'center',
          }}
        >
          {exerciseData?.name}
        </Text>
        
        <View style={{
          backgroundColor: 'white',
          margin: hp(2),
          borderRadius: hp(2),
          padding: hp(2),
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 3,
        }}>
          <Text 
            style={{
              fontSize: hp(2.2),
              fontWeight: '600',
              marginBottom: hp(1),
              color: '#FF6B6B',
            }}
          >
            Equipment: {exerciseData?.equipment}
          </Text>
          
          <Text 
            style={{
              fontSize: hp(2.2),
              fontWeight: '600',
              marginBottom: hp(1),
              color: '#FF6B6B',
            }}
          >
            Target Muscle: {exerciseData?.target}
          </Text>
          
          {exerciseData.secondaryMuscles && exerciseData.secondaryMuscles.length > 0 && (
            <Text 
              style={{
                fontSize: hp(2.2),
                fontWeight: '600',
                marginBottom: hp(1),
                color: '#FF6B6B',
              }}
            >
              Secondary Muscles: {exerciseData.secondaryMuscles.join(", ")}
            </Text>
          )}
          
          <Text 
            style={{
              fontSize: hp(2.2),
              fontWeight: '600',
              marginBottom: hp(1),
              color: '#FF6B6B',
            }}
          >
            Body Part: {exerciseData?.bodyPart}
          </Text>
        </View>
        
        <View style={{
          backgroundColor: 'white',
          margin: hp(2),
          borderRadius: hp(2),
          padding: hp(2),
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 3,
        }}>
          <Text 
            style={{
              fontSize: hp(2.5),
              fontWeight: 'bold',
              marginBottom: hp(2),
              color: '#333',
            }}
          >
            Instructions:
          </Text>
          
          {exerciseData.instructions?.map((instruction: string, index: number) => (
            <Text
              key={`instruction-${index}`}
              style={{
                fontSize: hp(1.9),
                marginBottom: hp(1.5),
                lineHeight: hp(2.5),
                color: '#555',
                paddingLeft: hp(1),
              }}
            >
              {index + 1}. {instruction}
            </Text>
          ))}
        </View>

        {/* Favorite Button */}
        <View style={{
          alignItems: 'center',
          margin: hp(2),
        }}>
          <TouchableOpacity
            style={{
              backgroundColor: isFavorite ? '#FF6B6B' : '#FFD700',
              paddingHorizontal: wp(12),
              paddingVertical: hp(1.8),
              borderRadius: hp(2.5),
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 3 },
              shadowOpacity: 0.3,
              shadowRadius: 5,
              elevation: 6,
              flexDirection: 'row',
              alignItems: 'center',
            }}
            onPress={toggleFavorite}
          >
            <Text style={{
              fontSize: hp(2.5),
              marginRight: wp(2),
            }}>
              {isFavorite ? '❤️' : '🤍'}
            </Text>
            <Text style={{
              color: isFavorite ? 'white' : '#333',
              fontSize: hp(2.2),
              fontWeight: 'bold',
            }}>
              {isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}