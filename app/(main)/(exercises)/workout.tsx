import AppHeader from "@/components/AppHeader";
import { ScreenSceneWrapper } from "@/components/common/ScreenTiltAnimation";
import { useTheme } from "@/contexts/ThemeContext";
import { tokenStorage } from "@/utils/auth/tokenStorage";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { useFocusEffect, useRouter } from "expo-router";
import { useNavigation } from '@react-navigation/native';
import React, { useEffect, useState } from "react";
import { Modal, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import {
    heightPercentageToDP as hp,
    widthPercentageToDP as wp,
} from "react-native-responsive-screen";
import { SafeAreaView } from "react-native-safe-area-context";
import { MainImages } from "../../../constants/list";

export default function WorkoutScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const navigation = useNavigation();
  const [favoritesCount, setFavoritesCount] = useState(0);
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showPremiumModal, setShowPremiumModal] = useState(false);

  console.log('🎬 WorkoutScreen rendered. Loading:', loading, 'isPremium:', isPremium);

  // Check premium status on mount
  useEffect(() => {
    const checkPremiumAccess = async () => {
      try {
        const token = await tokenStorage.getToken();
        console.log('🔍 Token retrieved:', !!token);
        if (!token) {
          console.log('❌ No token found, showing modal (no premium without token)');
          setIsPremium(false);
          setLoading(false);
          return;
        }

        const ENV = Constants.expoConfig?.extra;
        const API_URL = (ENV?.EXPO_PUBLIC_BACKEND_API_URL || (Platform.OS === 'android' ? 'http://10.0.2.2:5001' : 'http://localhost:5001')).replace(/\/api\/?$/, '');
        console.log('🌐 Checking premium status at:', API_URL + '/api/payment/premium-status');
        
        // Add timeout to fetch
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        
        const response = await fetch(`${API_URL}/api/payment/premium-status`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        console.log('📡 Response status:', response.status);
        
        if (!response.ok) {
          console.log('❌ Response not ok (status ' + response.status + '), treating as non-premium');
          setIsPremium(false);
          setLoading(false);
          return;
        }

        const premiumStatus = await response.json();
        console.log('✅ Premium status response:', JSON.stringify(premiumStatus, null, 2));
        
        if (premiumStatus.success === true && premiumStatus.isPremium === true && premiumStatus.premiumSubscription?.status === 'active') {
          console.log('✨ User IS premium');
          setIsPremium(true);
        } else {
          console.log('🔒 User is NOT premium');
          setIsPremium(false);
        }
      } catch (error) {
        console.error('💥 Premium check error:', (error as any)?.message || String(error));
        console.log('😕 Setting to non-premium due to error');
        setIsPremium(false);
      } finally {
        console.log('✋ Setting loading to false');
        setLoading(false);
      }
    };

    checkPremiumAccess();
  }, []);

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

  // Show loading or block non-premium access
  console.log('🔄 Render check - loading:', loading, 'isPremium:', isPremium);
  
  if (loading) {
    console.log('⏳ Still loading, returning null');
    return null;
  }

  // Show premium modal only for non-premium users
  console.log('🎯 Checking premium modal condition');

  if (!isPremium) {
    console.log('🚫 Showing premium modal (User is not premium)');
    return (
      <View style={{ flex: 1 }}>
        <Modal
          visible={true}
          transparent={true}
          animationType="fade"
          onRequestClose={() => {
            console.log('Modal close button pressed');
            try { if ((navigation as any).canGoBack && (navigation as any).canGoBack()) { (navigation as any).goBack(); return; } } catch(e) {}
            router.back();
          }}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => {
                  try { if ((navigation as any).canGoBack && (navigation as any).canGoBack()) { (navigation as any).goBack(); return; } } catch(e) {}
                  router.back();
                }}
              >
                <Ionicons name="close-circle" size={30} color="#999" />
              </TouchableOpacity>

              <View style={styles.iconContainer}>
                <Ionicons name="star" size={60} color="#FFD700" />
              </View>

              <Text style={styles.modalTitle}>Premium Feature</Text>
              <Text style={styles.modalSubtitle}>Unlock Advanced Workouts</Text>

              <Text style={styles.modalDescription}>
                Get access to personalized workout plans, advanced tracking, and exclusive training programs designed by fitness experts.
              </Text>

              <View style={styles.featuresList}>
                <View style={styles.featureItem}>
                  <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                  <Text style={styles.featureText}>Personalized workout plans</Text>
                </View>
                <View style={styles.featureItem}>
                  <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                  <Text style={styles.featureText}>Advanced progress tracking</Text>
                </View>
                <View style={styles.featureItem}>
                  <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                  <Text style={styles.featureText}>Exclusive training programs</Text>
                </View>
              </View>

              <View style={styles.priceTag}>
                <Text style={styles.priceAmount}>$10</Text>
                <Text style={styles.priceFrequency}>/month</Text>
              </View>

              <TouchableOpacity
                style={styles.upgradButton}
                onPress={() => {
                  router.push("/(main)/(settings)/premium");
                }}
              >
                <Ionicons name="star" size={20} color="#fff" />
                <Text style={styles.upgradButtonText}>Upgrade to Premium</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.laterButton}
                onPress={() => {
                  try { if ((navigation as any).canGoBack && (navigation as any).canGoBack()) { (navigation as any).goBack(); return; } } catch(e) {}
                  router.back();
                }}
              >
                <Text style={styles.laterButtonText}>Maybe Later</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    );
  }
  
  return (
    <ScreenSceneWrapper>
    <SafeAreaView style={styles.container}>
      <AppHeader 
        title="Premium Workouts"
        showStepIndicator={false}
      />
      
      {/* Header Right Actions */}
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
    shadowColor: '#000',
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
    top: hp(2),
    flexDirection: "row",
    alignItems: "center",
    gap: wp(2),
    zIndex: 10,
  },
  headerTitle: {
    fontSize: Math.min(hp(2.8), wp(6.5)),
    fontWeight: "bold",
    color: colors.textOnPrimary,
    textAlign: "center",
    flex: 1,
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  favoritesButton: {
    position: 'relative',
    marginRight: wp(1),
  },
  favoritesContainer: {
    width: hp(5),
    height: hp(5),
    backgroundColor: colors.white,
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
    backgroundColor: colors.error,
    borderRadius: hp(1.2),
    minWidth: hp(2.4),
    height: hp(2.4),
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.white,
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
  },
  bodyPartCard: {
    width: Math.min(wp(42), 160),
    height: Math.min(hp(18), 140),
    marginBottom: hp(2),
    borderRadius: hp(2.5),
    backgroundColor: colors.cardBackground,
    shadowColor: colors.primary,
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
  premiumFeaturesSection: {
    marginHorizontal: wp(4),
    marginTop: hp(3),
    marginBottom: hp(5),
    backgroundColor: colors.cardBackground,
    borderRadius: hp(2),
    padding: hp(3),
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  premiumFeaturesTitle: {
    fontSize: hp(2.5),
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: hp(2),
    color: colors.textPrimary,
  },
  premiumFeaturesText: {
    fontSize: hp(1.8),
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: hp(2.5),
  },
  premiumButton: {
    backgroundColor: colors.white,
    width: hp(5),
    height: hp(5),
    borderRadius: hp(1.2),
    alignItems: "center",
    justifyContent: "center",
  },
  premiumText: {
    fontSize: hp(2.2),
  },
  // Premium Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: wp(5),
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: hp(3),
    paddingHorizontal: wp(6),
    paddingVertical: hp(3),
    width: '100%',
    maxWidth: wp(90),
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  closeButton: {
    position: 'absolute',
    top: hp(1.5),
    right: wp(3),
    zIndex: 10,
  },
  iconContainer: {
    marginTop: hp(1),
    marginBottom: hp(2),
  },
  modalTitle: {
    fontSize: hp(2.8),
    fontWeight: '800',
    color: '#1a1a1a',
    marginBottom: hp(0.8),
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: hp(2),
    fontWeight: '600',
    color: '#FF6B6B',
    marginBottom: hp(1.5),
    textAlign: 'center',
  },
  modalDescription: {
    fontSize: hp(1.8),
    color: '#666',
    textAlign: 'center',
    marginBottom: hp(2.5),
    lineHeight: hp(2.8),
  },
  featuresList: {
    width: '100%',
    marginBottom: hp(2.5),
    paddingHorizontal: wp(2),
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: hp(1.2),
  },
  featureText: {
    fontSize: hp(1.7),
    color: '#333',
    marginLeft: wp(2.5),
    fontWeight: '500',
  },
  priceTag: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'baseline',
    marginBottom: hp(2.5),
    paddingVertical: hp(1.5),
    paddingHorizontal: wp(5),
    backgroundColor: '#F0F7FF',
    borderRadius: hp(1.5),
    borderWidth: 1.5,
    borderColor: '#4CAF50',
  },
  priceAmount: {
    fontSize: hp(3.5),
    fontWeight: '800',
    color: '#4CAF50',
  },
  priceFrequency: {
    fontSize: hp(1.9),
    color: '#666',
    marginLeft: wp(1),
    fontWeight: '600',
  },
  upgradButton: {
    width: '100%',
    flexDirection: 'row',
    backgroundColor: '#4CAF50',
    paddingVertical: hp(2),
    borderRadius: hp(1.2),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: hp(1),
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  upgradButtonText: {
    fontSize: hp(2),
    fontWeight: '700',
    color: '#fff',
    marginLeft: wp(2),
    letterSpacing: 0.5,
  },
  laterButton: {
    width: '100%',
    paddingVertical: hp(1.5),
    borderRadius: hp(1),
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ddd',
    backgroundColor: '#fafafa',
  },
  laterButtonText: {
    fontSize: hp(1.9),
    fontWeight: '600',
    color: '#666',
  },
});
