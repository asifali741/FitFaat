import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { ScrollView, Text, TouchableOpacity, View, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from "react-native-responsive-screen";
import { useTheme } from "@/contexts/ThemeContext";

export default function ExerciseDetails() {
  const { colors } = useTheme();
  const router = useRouter();
  const navigation = useNavigation();
  const { exercise } = useLocalSearchParams();
  const [isFavorite, setIsFavorite] = useState(false);

  const handleBackPress = () => {
    // Use React Navigation's goBack for proper navigation stack handling
    navigation.goBack();
  };
  
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
        console.log('Current favorites:', favoritesList.map((f: any) => ({ name: f.name, id: f.id })));
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

  const styles = getStyles(colors);

  if (!exerciseData) {
    return (
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={handleBackPress}
          >
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Exercise Details</Text>
          <View style={styles.spacer} />
        </View>
        
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.cardBackground }}>
          <Text>Error loading exercise details</Text>
          <TouchableOpacity onPress={handleBackPress}>
            <Text style={{ color: '#FF6B6B', marginTop: 20 }}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={handleBackPress}
        >
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Exercise Details</Text>
        <View style={styles.spacer} />
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        <Image
          source={{ uri: exerciseData.gifUrl }}
          contentFit="cover"
          style={{
            height: hp(45),
            width: "100%",
            borderBottomLeftRadius: 30,
            borderBottomRightRadius: 30,
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
            color: colors.textPrimary,
            textAlign: 'center',
          }}
        >
          {exerciseData?.name}
        </Text>
        
        <View style={{
          backgroundColor: colors.cardBackground,
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
              color: colors.textSecondary,
            }}
          >
            Equipment: {exerciseData?.equipment}
          </Text>
          
          <Text 
            style={{
              fontSize: hp(2.2),
              fontWeight: '600',
              marginBottom: hp(1),
              color: colors.textSecondary,
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
                color: colors.textSecondary,
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
              color: colors.textSecondary,
            }}
          >
            Body Part: {exerciseData?.bodyPart}
          </Text>
        </View>
        
        <View style={{
          backgroundColor: colors.cardBackground,
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
              color: colors.textPrimary,
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
                color: colors.textSecondary,
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
              backgroundColor: isFavorite ? colors.error : colors.cardBackground,
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
              color: isFavorite ? colors.white : colors.textPrimary,
              fontSize: hp(2.2),
              fontWeight: 'bold',
            }}>
              {isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Math.min(wp(5), 20),
    paddingVertical: Math.min(hp(2), 16),
    backgroundColor: colors.background,
    minHeight: hp(8),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  backButton: {
    padding: Math.min(wp(2), 10),
    minWidth: wp(10),
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: Math.min(hp(2.8), wp(6.5)),
    fontWeight: "bold",
    color: colors.textPrimary,
    textAlign: "center",
    flex: 1,
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  content: {
    flex: 1,
    backgroundColor: colors.screenColor,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
  },
  spacer: {
    width: wp(10),
  },
});
