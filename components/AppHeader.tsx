import { HEADER_PADDING_HORIZONTAL, HEADER_PADDING_VERTICAL } from '@/constants/ui';
import { useTheme } from '@/contexts/ThemeContext';
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
  showNotificationBell?: boolean;
  notificationCount?: number;
  onNotificationPress?: () => void;
}

export default function AppHeader({
  title,
  showBackButton = true,
  showStepIndicator = false,
  currentStep = 1,
  totalSteps = 6,
  onBackPress,
  showMenuButton = true,
  showNotificationBell = false,
  notificationCount = 0,
  onNotificationPress,
}: AppHeaderProps) {
  const navigation = useNavigation();
  const router = useRouter();
  const { colors } = useTheme();

  console.log('AppHeader - showNotificationBell:', showNotificationBell, 'notificationCount:', notificationCount);

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
          <TouchableOpacity 
            style={styles.menuButton}
            onPress={openDrawer}
          >
            <Ionicons name="menu" size={24} color={colors.textOnPrimary} />
          </TouchableOpacity>
        ) : (
          <View style={styles.spacer} />
        )}
        
        <Text style={[styles.title, { color: colors.textOnPrimary }]}>{title}</Text>
        
        <View style={styles.rightIconContainer}>
          {showNotificationBell && (
            <TouchableOpacity 
              style={styles.notificationButton}
              onPress={onNotificationPress}
            >
              <Ionicons name="notifications" size={24} color={colors.textOnPrimary} />
              {notificationCount && notificationCount > 0 && (
                <View style={[styles.badge, { backgroundColor: '#FF6B6B' }]}>
                  <Text style={styles.badgeText}>
                    {notificationCount > 99 ? '99+' : notificationCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          )}
          
          {showBackButton && !showNotificationBell && (
            <TouchableOpacity 
              style={styles.backButton}
              onPress={handleBackPress}
            >
              <Ionicons name="arrow-back" size={24} color={colors.textOnPrimary} />
            </TouchableOpacity>
          )}
          
          {!showNotificationBell && !showBackButton && (
            <View style={styles.spacer} />
          )}
        </View>
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
  notificationButton: {
    padding: 8,
    position: 'relative',
  },
  rightIconContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    minWidth: wp(12),
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
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
