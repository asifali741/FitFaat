import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import React, { useState, useEffect } from "react";
import { useRouter, useFocusEffect } from "expo-router";
import { ChevronLeftIcon } from "react-native-heroicons/outline";
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from "react-native-responsive-screen";
import { MainImages } from "../../constants/list";
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function WorkoutScreen() {
  const router = useRouter();
  const [favoritesCount, setFavoritesCount] = useState(0);

  // Update favorites count when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      getFavoritesCount();
    }, [])
  );

  const getFavoritesCount = async () => {
    try {
      const favorites = await AsyncStorage.getItem('favoriteExercises');
      if (favorites) {
        const favoritesList = JSON.parse(favorites);
        setFavoritesCount(favoritesList.length);
      } else {
        setFavoritesCount(0);
      }
    } catch (error) {
      console.error('Error getting favorites count:', error);
      setFavoritesCount(0);
    }
  };

  const handleFavoritesPress = () => {
    console.log('Opening favorites list');
    router.push('/(main)/favorites');
  };

  const handleBodyPartPress = (item: any) => {
    console.log("Navigating to exercises for:", item.name);
    router.push({
      pathname: "/(main)/exercises/[bodypart]",
      params: { bodypart: item.name, name: item.name }
    });
  };

  return (
    <View className="bg-gray-200 flex-1">
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header Section */}
        <View className="flex-row items-center justify-between w-full mt-12 px-5">
          <TouchableOpacity onPress={() => router.back()}>
            <View className="w-14 h-14 bg-yellow-300 justify-center items-center rounded-lg">
              <ChevronLeftIcon
                size={hp(4.5)}
                color="black"
                strokeWidth={4.5}
              />
            </View>
          </TouchableOpacity>
          <Text
            className="text-black font-bold"
            style={{ fontSize: hp(3.5) }}
          >
            Premium Workouts
          </Text>
          
          {/* Favorites Heart with Count */}
          <TouchableOpacity 
            onPress={handleFavoritesPress}
            style={{ position: 'relative' }}
          >
            <View style={{
              width: hp(7),
              height: hp(7),
              backgroundColor: '#FFD700',
              justifyContent: 'center',
              alignItems: 'center',
              borderRadius: hp(1.5),
            }}>
              <Text style={{ fontSize: hp(3) }}>❤️</Text>
              {favoritesCount > 0 && (
                <View style={{
                  position: 'absolute',
                  top: -hp(0.5),
                  right: -wp(1),
                  backgroundColor: '#FF6B6B',
                  borderRadius: hp(1.2),
                  minWidth: hp(2.4),
                  height: hp(2.4),
                  justifyContent: 'center',
                  alignItems: 'center',
                  borderWidth: 2,
                  borderColor: 'white',
                }}>
                  <Text style={{
                    color: 'white',
                    fontSize: hp(1.4),
                    fontWeight: 'bold',
                  }}>
                    {favoritesCount > 99 ? '99+' : favoritesCount}
                  </Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        </View>

        {/* Premium Badge */}
        <View style={{ 
          alignItems: 'center', 
          marginTop: hp(3),
          marginBottom: hp(3)
        }}>
          <View style={{
            backgroundColor: '#FFD700',
            paddingHorizontal: wp(6),
            paddingVertical: hp(1),
            borderRadius: hp(2),
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.3,
            shadowRadius: 4,
            elevation: 5,
          }}>
            <Text style={{
              fontSize: hp(2.2),
              fontWeight: 'bold',
              color: '#000',
            }}>
              👑 Premium Exercises
            </Text>
          </View>
        </View>

        {/* Body Parts Grid */}
        <View style={{ paddingHorizontal: hp(2) }}>
          <Text
            className="text-black font-semibold"
            style={{ 
              fontSize: hp(3.2), 
              marginBottom: hp(2),
              textAlign: 'center'
            }}
          >
            Choose Your Focus
          </Text>

          <View style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            justifyContent: 'space-around',
          }}>
            {MainImages.map((item, index) => (
              <TouchableOpacity
                key={index}
                onPress={() => handleBodyPartPress(item)}
                style={{
                  width: wp(42),
                  height: hp(18),
                  marginBottom: hp(2),
                  borderRadius: hp(2.5),
                  backgroundColor: 'white',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 6,
                  elevation: 5,
                  justifyContent: 'center',
                  alignItems: 'center',
                  padding: hp(2),
                }}
              >
                <Text style={{
                  fontSize: hp(6),
                  marginBottom: hp(1),
                }}>
                  {item.emoji}
                </Text>
                <Text
                  style={{
                    color: '#333',
                    textAlign: 'center',
                    fontSize: hp(2.2),
                    fontWeight: 'bold',
                    marginBottom: hp(0.5),
                  }}
                >
                  {item?.name}
                </Text>
                <Text
                  style={{
                    color: '#666',
                    textAlign: 'center',
                    fontSize: hp(1.4),
                  }}
                >
                  {item?.description}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Premium Features */}
        <View style={{
          marginHorizontal: hp(2),
          marginTop: hp(3),
          marginBottom: hp(5),
          backgroundColor: 'white',
          borderRadius: hp(2),
          padding: hp(2),
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 3,
        }}>
          <Text style={{
            fontSize: hp(2.5),
            fontWeight: 'bold',
            textAlign: 'center',
            marginBottom: hp(2),
            color: '#333',
          }}>
            Premium Features
          </Text>
          
          <Text style={{
            fontSize: hp(1.8),
            color: '#666',
            textAlign: 'center',
            lineHeight: hp(2.5),
          }}>
            • Personalized workout plans{'\n'}
            • Advanced exercise library{'\n'}
            • Progress tracking{'\n'}
            • Video demonstrations{'\n'}
            • Nutrition guidance
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}