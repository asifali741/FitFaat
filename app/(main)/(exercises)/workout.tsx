import { ScreenSceneWrapper } from "@/components/common/ScreenTiltAnimation";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DrawerActions, useNavigation } from "@react-navigation/native";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from "react-native-responsive-screen";
import { SafeAreaView } from "react-native-safe-area-context";
import { colorsSheet } from "../(settings)/ui_elements";
import { MainImages } from "../../../constants/list";

export default function WorkoutScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const [favoritesCount, setFavoritesCount] = useState(0);

  const openDrawer = () => {
    navigation.dispatch(DrawerActions.openDrawer());
  };

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

  return (
    <ScreenSceneWrapper>
    <SafeAreaView style={styles.container}>
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.menuButton}
          onPress={openDrawer}
        >
          <Ionicons name="menu" size={24} color={colorsSheet.textOnPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Premium Workouts</Text>
        
        <View style={styles.headerRight}>
          {/* Favorites Heart with Count */}
          <TouchableOpacity 
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
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.premiumButton}>
            <Text style={styles.premiumText}>👑</Text>
          </TouchableOpacity>
        </View>
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
                <TouchableOpacity
                  key={index}
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
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Premium Features */}
          <View style={styles.premiumFeaturesSection}>
            <Text style={styles.premiumFeaturesTitle}>
              Premium Features
            </Text>
            
            <Text style={styles.premiumFeaturesText}>
              • Personalized workout plans{'\n'}
              • Advanced exercise library{'\n'}
              • Progress tracking{'\n'}
              • Video demonstrations{'\n'}
              • Nutrition guidance
            </Text>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
    </ScreenSceneWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colorsSheet.primary,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: wp(5),
    paddingVertical: hp(2),
    backgroundColor: colorsSheet.primary,
  },
  menuButton: {
    padding: 8,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: wp(2),
  },
  headerTitle: {
    fontSize: Math.min(hp(2.5), wp(6)),
    fontWeight: "bold",
    color: colorsSheet.textOnPrimary,
    textAlign: "center",
    flex: 1,
  },
  favoritesButton: {
    position: 'relative',
    marginRight: wp(1),
  },
  favoritesContainer: {
    width: hp(5),
    height: hp(5),
    backgroundColor: colorsSheet.white,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: hp(1.2),
  },
  heartIcon: {
    fontSize: hp(2.2),
  },
  badge: {
    position: 'absolute',
    top: -hp(0.5),
    right: -wp(1),
    backgroundColor: colorsSheet.error,
    borderRadius: hp(1.2),
    minWidth: hp(2.4),
    height: hp(2.4),
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colorsSheet.white,
  },
  badgeText: {
    color: colorsSheet.white,
    fontSize: hp(1.4),
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    backgroundColor: colorsSheet.screenColor,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
  },
  bodyPartsSection: {
    paddingHorizontal: wp(4),
  },
  sectionTitle: {
    fontSize: Math.min(hp(3.2), wp(8)),
    fontWeight: 'bold',
    marginBottom: hp(2),
    textAlign: 'center',
    color: colorsSheet.textPrimary,
    paddingHorizontal: wp(4),
  },
  bodyPartsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
  },
  bodyPartCard: {
    width: Math.min(wp(42), 160),
    height: Math.min(hp(18), 140),
    marginBottom: hp(2),
    borderRadius: hp(2.5),
    backgroundColor: colorsSheet.cardBackground,
    shadowColor: colorsSheet.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Math.min(hp(2), 15),
    borderWidth: 1,
    borderColor: colorsSheet.cardBorder,
  },
  bodyPartEmoji: {
    fontSize: Math.min(hp(6), wp(15)),
    marginBottom: hp(1),
  },
  bodyPartName: {
    color: colorsSheet.textPrimary,
    textAlign: 'center',
    fontSize: Math.min(hp(2.2), wp(5.5)),
    fontWeight: 'bold',
    marginBottom: hp(0.5),
  },
  bodyPartDescription: {
    color: colorsSheet.textSecondary,
    textAlign: 'center',
    fontSize: Math.min(hp(1.4), wp(3.5)),
  },
  premiumFeaturesSection: {
    marginHorizontal: wp(4),
    marginTop: hp(3),
    marginBottom: hp(5),
    backgroundColor: colorsSheet.cardBackground,
    borderRadius: hp(2),
    padding: hp(3),
    shadowColor: colorsSheet.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: colorsSheet.cardBorder,
  },
  premiumFeaturesTitle: {
    fontSize: hp(2.5),
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: hp(2),
    color: colorsSheet.textPrimary,
  },
  premiumFeaturesText: {
    fontSize: hp(1.8),
    color: colorsSheet.textSecondary,
    textAlign: 'center',
    lineHeight: hp(2.5),
  },
  premiumButton: {
    backgroundColor: colorsSheet.white,
    width: hp(5),
    height: hp(5),
    borderRadius: hp(1.2),
    alignItems: "center",
    justifyContent: "center",
  },
  premiumText: {
    fontSize: hp(2.2),
  },
});
