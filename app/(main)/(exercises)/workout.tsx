import AppHeader from "@/components/AppHeader";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from "expo-router";
import React, { useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import AnimatedButton from "@/components/common/AnimatedButton";
import {
    heightPercentageToDP as hp,
    widthPercentageToDP as wp,
} from "react-native-responsive-screen";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "@/contexts/ThemeContext";
import { MainImages } from "../../../constants/list";

export default function WorkoutScreen() {
  const { colors } = useTheme();
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
    router.push('/(main)/(exercises)/favorites');
  };

  const handleBodyPartPress = (item: any) => {
    console.log("Navigating to exercises for:", item.name);
    router.push({
      pathname: "/(main)/(exercises)/[bodypart]",
      params: { bodypart: item.name, name: item.name }
    });
  };

  const styles = getStyles(colors);
  
  return (
    <SafeAreaView style={styles.container}>
      <AppHeader 
        title="Premium Workouts"
        showStepIndicator={false}
      />
      
      {/* Header Right Actions */}
      <View style={styles.headerRight}>
        {/* Favorites Heart with Count */}
        <AnimatedButton
          animationType="pulse"
          onPress={handleFavoritesPress}
          style={styles.favoritesButton}
        >
          <View style={styles.favoritesContainer}>
            <Text style={styles.heartIcon}>❤️</Text>
            {favoritesCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {favoritesCount > 99 ? '99+' : favoritesCount}
                </Text>
              </View>
            )}
          </View>
        </AnimatedButton>
        
        <AnimatedButton animationType="bounce" style={styles.premiumButton}>
          <Text style={styles.premiumText}>👑</Text>
        </AnimatedButton>
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        <ScrollView showsVerticalScrollIndicator={false}>


          {/* Body Parts Grid */}
          <View style={styles.bodyPartsSection}>
            <Text style={styles.sectionTitle}>
              Choose Your Focus
            </Text>

            <View style={styles.bodyPartsGrid}>
              {MainImages.map((item, index) => (
                <AnimatedButton
                  key={index}
                  animationType="scale"
                  onPress={() => handleBodyPartPress(item)}
                  style={styles.bodyPartCard}
                >
                  <Text style={styles.bodyPartEmoji}>
                    {item.emoji}
                  </Text>
                  <Text style={styles.bodyPartName}>
                    {item?.name}
                  </Text>
                  <Text style={styles.bodyPartDescription}>
                    {item?.description}
                  </Text>
                </AnimatedButton>
              ))}
            </View>
          </View>

        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: wp(5),
    paddingVertical: hp(2),
    backgroundColor: colors.primary,
    minHeight: hp(8),
    shadowColor: colors.shadowMedium,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  menuButton: {
    padding: 8,
  },
  headerRight: {
    position: 'absolute',
    right: wp(5),
    top: hp(2.5),
    flexDirection: "row",
    alignItems: "center",
    gap: wp(3),
    zIndex: 10,
  },
  headerTitle: {
    fontSize: Math.min(hp(2.8), wp(6.5)),
    fontWeight: "bold",
    color: colors.textOnPrimary,
    textAlign: "center",
    flex: 1,
    letterSpacing: 0.5,
  },
  favoritesButton: {
    position: 'relative',
  },
  favoritesContainer: {
    width: hp(4.5),
    height: hp(4.5),
    backgroundColor: colors.cardBackground,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: hp(2.25),
    borderWidth: 1,
    borderColor: colors.cardBorder,
    shadowColor: colors.shadowMedium,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  heartIcon: {
    fontSize: hp(2.5),
  },
  badge: {
    position: 'absolute',
    top: -hp(0.5),
    right: -wp(1),
    backgroundColor: colors.error,
    borderRadius: hp(1.2),
    minWidth: hp(2.4),
    height: hp(2.4),
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.screenColor,
  },
  badgeText: {
    color: colors.white,
    fontSize: hp(1.4),
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    backgroundColor: colors.screenColor,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
  },
  bodyPartsSection: {
    paddingHorizontal: wp(4),
    paddingTop: hp(2),
  },
  sectionTitle: {
    fontSize: Math.min(hp(3.2), wp(8)),
    fontWeight: 'bold',
    marginBottom: hp(2),
    textAlign: 'center',
    color: colors.textPrimary,
    paddingHorizontal: wp(4),
  },
  bodyPartsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    paddingBottom: hp(3),
  },
  bodyPartCard: {
    width: Math.min(wp(42), 160),
    height: Math.min(hp(18), 140),
    marginBottom: hp(2),
    borderRadius: hp(2.5),
    backgroundColor: colors.cardBackground,
    shadowColor: colors.shadowMedium,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Math.min(hp(2), 15),
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  bodyPartEmoji: {
    fontSize: Math.min(hp(6), wp(15)),
    marginBottom: hp(1),
  },
  bodyPartName: {
    color: colors.textPrimary,
    textAlign: 'center',
    fontSize: Math.min(hp(2.2), wp(5.5)),
    fontWeight: 'bold',
    marginBottom: hp(0.5),
  },
  bodyPartDescription: {
    color: colors.textSecondary,
    textAlign: 'center',
    fontSize: Math.min(hp(1.4), wp(3.5)),
  },
  premiumButton: {
    backgroundColor: colors.cardBackground,
    width: hp(4.5),
    height: hp(4.5),
    borderRadius: hp(2.25),
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.cardBorder,
    shadowColor: colors.shadowMedium,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  premiumText: {
    fontSize: hp(2.5),
  },
});
