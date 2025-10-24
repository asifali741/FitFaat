import { View, Text, FlatList, TouchableOpacity, Alert, StyleSheet } from "react-native";
import React, { useState, useEffect } from "react";
import { useRouter, useFocusEffect } from "expo-router";
import { TrashIcon } from "react-native-heroicons/outline";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from "react-native-responsive-screen";
import { Image } from "expo-image";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colorsSheet } from "../(settings)/ui_elements";

export default function FavoritesScreen() {
  const router = useRouter();
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);

  const handleBackPress = () => {
    // Navigate back to workout screen explicitly
    router.push('/(main)/(exercises)/workout');
  };

  useFocusEffect(
    React.useCallback(() => {
      loadFavorites();
    }, [])
  );

  const loadFavorites = async () => {
    try {
      setLoading(true);
      const favoritesData = await AsyncStorage.getItem('favoriteExercises');
      if (favoritesData) {
        const favoritesList = JSON.parse(favoritesData);
        setFavorites(favoritesList);
        console.log('Loaded favorites:', favoritesList.length);
      } else {
        setFavorites([]);
      }
    } catch (error) {
      console.error('Error loading favorites:', error);
      setFavorites([]);
    } finally {
      setLoading(false);
    }
  };

  const removeFromFavorites = async (exerciseId: string) => {
    try {
      const updatedFavorites = favorites.filter((fav: any) => fav.id !== exerciseId);
      await AsyncStorage.setItem('favoriteExercises', JSON.stringify(updatedFavorites));
      setFavorites(updatedFavorites);
      console.log('Removed exercise from favorites');
    } catch (error) {
      console.error('Error removing favorite:', error);
    }
  };

  const confirmRemove = (exercise: any) => {
    Alert.alert(
      'Remove Favorite',
      `Remove "${exercise.name}" from favorites?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Remove', 
          style: 'destructive',
          onPress: () => removeFromFavorites(exercise.id)
        }
      ]
    );
  };

  const navigateToExercise = (exercise: any) => {
    console.log('Navigating to exercise details:', exercise.name);
    router.push({
      pathname: "/(main)/(exercises)/exercise-details",
      params: { exercise: JSON.stringify(exercise) }
    });
  };

  const FavoriteCard = ({ item, index }: { item: any, index: number }) => {
    return (
      <View style={{
        backgroundColor: 'white',
        marginHorizontal: wp(4),
        marginBottom: hp(2),
        borderRadius: hp(2),
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
        overflow: 'hidden',
      }}>
        <TouchableOpacity
          onPress={() => navigateToExercise(item)}
          style={{ flexDirection: 'row', padding: hp(1.5) }}
        >
          <Image
            source={{ uri: item.gifUrl }}
            contentFit="cover"
            style={{
              width: wp(20),
              height: wp(20),
              borderRadius: hp(1),
            }}
          />
          <View style={{ 
            flex: 1, 
            marginLeft: wp(3),
            justifyContent: 'center',
          }}>
            <Text style={{
              fontSize: hp(2.2),
              fontWeight: 'bold',
              color: '#333',
              marginBottom: hp(0.5),
            }}>
              {item.name}
            </Text>
            <Text style={{
              fontSize: hp(1.6),
              color: '#666',
              marginBottom: hp(0.3),
            }}>
              Target: {item.target}
            </Text>
            <Text style={{
              fontSize: hp(1.4),
              color: '#999',
            }}>
              {item.equipment}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => confirmRemove(item)}
            style={{
              width: hp(5),
              height: hp(5),
              backgroundColor: '#FFE5E5',
              borderRadius: hp(2.5),
              justifyContent: 'center',
              alignItems: 'center',
              alignSelf: 'center',
            }}
          >
            <TrashIcon 
              size={hp(2.5)} 
              color="#FF6B6B" 
              strokeWidth={2}
            />
          </TouchableOpacity>
        </TouchableOpacity>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={handleBackPress}
          >
            <Ionicons name="arrow-back" size={24} color={colorsSheet.textOnPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Favorites ❤️</Text>
          <View style={styles.spacer} />
        </View>

        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colorsSheet.screenColor }}>
          <Text style={{ fontSize: hp(2), color: '#666' }}>Loading favorites...</Text>
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
          <Ionicons name="arrow-back" size={24} color={colorsSheet.textOnPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Favorites ❤️</Text>
        <View style={styles.spacer} />
      </View>

      {/* Main Content */}
      <View style={styles.content}>

      {favorites.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={{ fontSize: hp(6), marginBottom: hp(2) }}>💔</Text>
          <Text style={styles.emptyTitle}>
            No Favorites Yet
          </Text>
          <Text style={styles.emptyDescription}>
            Start exploring exercises and tap the heart to add them to your favorites!
          </Text>
          <TouchableOpacity
            style={styles.exploreButton}
            onPress={() => router.push('/(main)/(exercises)/workout')}
          >
            <Text style={styles.exploreButtonText}>
              Explore Exercises
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <Text style={styles.countText}>
            {favorites.length} favorite exercise{favorites.length !== 1 ? 's' : ''}
          </Text>
          
          <FlatList
            data={favorites}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: hp(3) }}
            renderItem={({ item, index }) => (
              <FavoriteCard item={item} index={index} />
            )}
          />
        </>
      )}
      </View>
    </SafeAreaView>
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
    paddingHorizontal: Math.min(wp(5), 20),
    paddingVertical: Math.min(hp(2), 16),
    backgroundColor: colorsSheet.primary,
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
    color: colorsSheet.textOnPrimary,
    textAlign: "center",
    flex: 1,
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  content: {
    flex: 1,
    backgroundColor: colorsSheet.screenColor,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingTop: hp(2),
  },
  spacer: {
    width: wp(10),
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: wp(10),
  },
  emptyTitle: {
    fontSize: hp(2.5),
    fontWeight: 'bold',
    color: colorsSheet.textPrimary,
    textAlign: 'center',
    marginBottom: hp(1),
  },
  emptyDescription: {
    fontSize: hp(1.8),
    color: colorsSheet.textSecondary,
    textAlign: 'center',
    lineHeight: hp(2.5),
  },
  exploreButton: {
    backgroundColor: '#FF6B6B',
    paddingHorizontal: wp(8),
    paddingVertical: hp(1.8),
    borderRadius: hp(2.5),
    marginTop: hp(3),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 6,
  },
  exploreButtonText: {
    color: 'white',
    fontSize: hp(2),
    fontWeight: 'bold',
  },
  countText: {
    fontSize: hp(2),
    color: colorsSheet.textSecondary,
    textAlign: 'center',
    marginBottom: hp(2),
    marginTop: hp(1),
  },
});
