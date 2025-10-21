import { View, Text, FlatList, TouchableOpacity, Alert } from "react-native";
import React, { useState, useEffect } from "react";
import { useRouter, useFocusEffect } from "expo-router";
import { ChevronLeftIcon, TrashIcon } from "react-native-heroicons/outline";
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from "react-native-responsive-screen";
import { Image } from "expo-image";
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function FavoritesScreen() {
  const router = useRouter();
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);

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
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8f8f8' }}>
        <Text style={{ fontSize: hp(2), color: '#666' }}>Loading favorites...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#f8f8f8' }}>
      {/* Header */}
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
        <Text style={{
          fontSize: hp(3),
          fontWeight: 'bold',
          color: '#333',
          flex: 1,
          textAlign: 'center',
          marginRight: hp(7),
        }}>
          My Favorites ❤️
        </Text>
      </View>

      {favorites.length === 0 ? (
        <View style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          paddingHorizontal: wp(10),
        }}>
          <Text style={{ fontSize: hp(6), marginBottom: hp(2) }}>💔</Text>
          <Text style={{
            fontSize: hp(2.5),
            fontWeight: 'bold',
            color: '#333',
            textAlign: 'center',
            marginBottom: hp(1),
          }}>
            No Favorites Yet
          </Text>
          <Text style={{
            fontSize: hp(1.8),
            color: '#666',
            textAlign: 'center',
            lineHeight: hp(2.5),
          }}>
            Start exploring exercises and tap the heart to add them to your favorites!
          </Text>
          <TouchableOpacity
            style={{
              backgroundColor: '#FF6B6B',
              paddingHorizontal: wp(8),
              paddingVertical: hp(1.5),
              borderRadius: hp(2),
              marginTop: hp(3),
            }}
            onPress={() => router.back()}
          >
            <Text style={{
              color: 'white',
              fontSize: hp(2),
              fontWeight: 'bold',
            }}>
              Explore Exercises
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <Text style={{
            fontSize: hp(2),
            color: '#666',
            textAlign: 'center',
            marginBottom: hp(2),
          }}>
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
  );
}