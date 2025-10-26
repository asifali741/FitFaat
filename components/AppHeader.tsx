import { colorsSheet } from '@/app/(main)/(settings)/ui_elements';
import { Ionicons } from '@expo/vector-icons';
import { DrawerActions, useNavigation } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from 'react-native-responsive-screen';

interface AppHeaderProps {
  title: string;
  showBackButton?: boolean;
  showStepIndicator?: boolean;
  currentStep?: number;
  totalSteps?: number;
  onBackPress?: () => void;
  showMenuButton?: boolean;
}

export default function AppHeader({
  title,
  showBackButton = true,
  showStepIndicator = false,
  currentStep = 1,
  totalSteps = 6,
  onBackPress,
  showMenuButton = true,
}: AppHeaderProps) {
  const navigation = useNavigation();
  const router = useRouter();

  const openDrawer = () => {
    navigation.dispatch(DrawerActions.openDrawer());
  };

  const handleBackPress = () => {
    if (onBackPress) {
      onBackPress();
    } else {
      router.back();
    }
  };

  return (
    <View style={styles.container}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        {showMenuButton ? (
          <TouchableOpacity 
            style={styles.menuButton}
            onPress={openDrawer}
          >
            <Ionicons name="menu" size={24} color={colorsSheet.textOnPrimary} />
          </TouchableOpacity>
        ) : (
          <View style={styles.spacer} />
        )}
        
        <Text style={styles.title}>{title}</Text>
        
        {showBackButton ? (
          <TouchableOpacity 
            style={styles.backButton}
            onPress={handleBackPress}
          >
            <Ionicons name="arrow-back" size={24} color={colorsSheet.textOnPrimary} />
          </TouchableOpacity>
        ) : (
          <View style={styles.spacer} />
        )}
      </View>

      {/* Step Indicator */}
      {showStepIndicator && (
        <View style={styles.stepIndicatorContainer}>
          <View style={styles.stepDots}>
            {Array.from({ length: totalSteps }, (_, index) => (
              <View
                key={index}
                style={[
                  styles.stepDot,
                  index < currentStep && styles.stepDotCompleted,
                  index === currentStep - 1 && styles.stepDotActive
                ]}
              />
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colorsSheet.primary,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: wp(5),
    paddingVertical: hp(2),
    backgroundColor: colorsSheet.primary,
  },
  menuButton: {
    padding: 8,
  },
  title: {
    fontSize: hp(2.5),
    fontWeight: 'bold',
    color: colorsSheet.textOnPrimary,
    flex: 1,
    textAlign: 'center',
  },
  backButton: {
    padding: 8,
  },
  spacer: {
    width: wp(12),
  },
  stepIndicatorContainer: {
    alignItems: 'center',
    paddingBottom: hp(2),
  },
  stepDots: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDot: {
    width: hp(1.2),
    height: hp(1.2),
    borderRadius: hp(0.6),
    backgroundColor: colorsSheet.textOnPrimary + '40',
    marginHorizontal: wp(1.5),
  },
  stepDotCompleted: {
    backgroundColor: colorsSheet.textOnPrimary,
  },
  stepDotActive: {
    backgroundColor: colorsSheet.textOnPrimary,
    transform: [{ scale: 1.2 }],
  },
});
