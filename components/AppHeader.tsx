import { Ionicons } from '@expo/vector-icons';
import { DrawerActions, useNavigation } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from 'react-native-responsive-screen';
import { useTheme } from '@/contexts/ThemeContext';
import { HEADER_PADDING_HORIZONTAL, HEADER_PADDING_VERTICAL } from '@/constants/ui';
import AnimatedButton, { AnimatedBackButton, AnimatedIconButton } from '@/components/common/AnimatedButton';

interface AppHeaderProps {
  title: string;
  showBackButton?: boolean;
  showStepIndicator?: boolean;
  currentStep?: number;
  totalSteps?: number;
  onBackPress?: () => void;
  showMenuButton?: boolean;
  rightComponent?: React.ReactNode;
}

export default function AppHeader({
  title,
  showBackButton = true,
  showStepIndicator = false,
  currentStep = 1,
  totalSteps = 6,
  onBackPress,
  showMenuButton = true,
  rightComponent,
}: AppHeaderProps) {
  const navigation = useNavigation();
  const router = useRouter();
  const { colors } = useTheme();

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
    <View style={[styles.container, { backgroundColor: colors.primary }]}>
      {/* Top Bar */}
      <View style={[styles.topBar, { backgroundColor: colors.primary }]}>
        {showMenuButton ? (
          <AnimatedIconButton
            style={styles.menuButton}
            onPress={openDrawer}
          >
            <Ionicons name="menu" size={24} color={colors.textOnPrimary} />
          </AnimatedIconButton>
        ) : (
          <View style={styles.spacer} />
        )}
        
        <Text style={[styles.title, { color: colors.textOnPrimary }]}>{title}</Text>
        
        {rightComponent ? (
          rightComponent
        ) : showBackButton ? (
          <AnimatedBackButton
            style={styles.backButton}
            onPress={handleBackPress}
          >
            <Ionicons name="arrow-back" size={24} color={colors.textOnPrimary} />
          </AnimatedBackButton>
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
                  { backgroundColor: colors.textOnPrimary + '40' },
                  index < currentStep && { backgroundColor: colors.textOnPrimary },
                  index === currentStep - 1 && { backgroundColor: colors.textOnPrimary, transform: [{ scale: 1.2 }] }
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
  container: {},
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: HEADER_PADDING_HORIZONTAL,
    paddingVertical: HEADER_PADDING_VERTICAL,
  },
  menuButton: {
    padding: 8,
  },
  title: {
    fontSize: hp(2.5),
    fontWeight: 'bold',
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
    marginHorizontal: wp(1.5),
  },
});
