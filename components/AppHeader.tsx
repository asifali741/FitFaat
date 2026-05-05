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
  showBackButton = false,
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

  const openDrawer = () => {
    navigation.dispatch(DrawerActions.openDrawer());
  };

  const handleNotificationPress = () => {
    if (onNotificationPress) {
      onNotificationPress();
      return;
    }

    try {
      router.push('/(main)/(news)');
    } catch (e) {
      // No-op fallback keeps the header harmless if the news route is unavailable.
    }
  };

  const handleBackPress = () => {
    if (onBackPress) {
      onBackPress();
      return;
    }

    try {
      // Prefer navigation.goBack if available
      // @ts-ignore
      if (navigation && typeof (navigation as any).canGoBack === 'function' && (navigation as any).canGoBack()) {
        // @ts-ignore
        (navigation as any).goBack();
        return;
      }
    } catch (e) {
      // ignore
    }

    try {
      router.back();
    } catch (e) {
      // fallback: replace to dashboard
      try {
        router.replace('/(main)/(dashboard)');
      } catch (err) {
        // ignore
      }
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.primary }]}>
      <View style={[styles.topBar, { backgroundColor: colors.primary }]}>
        <View style={styles.sideSlot}>
          {showBackButton ? (
            <TouchableOpacity
              style={styles.iconButton}
              onPress={handleBackPress}
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <Ionicons name="arrow-back" size={Math.min(hp(3.3), wp(7))} color="#FFFFFF" />
            </TouchableOpacity>
          ) : showMenuButton ? (
            <TouchableOpacity 
              style={styles.iconButton}
              onPress={openDrawer}
              accessibilityRole="button"
              accessibilityLabel="Open menu"
            >
              <Ionicons name="menu" size={Math.min(hp(3.8), wp(8))} color={colors.textOnPrimary} />
            </TouchableOpacity>
          ) : (
            <View style={styles.spacer} />
          )}
        </View>
        
        <Text
          style={[styles.title, { color: colors.textOnPrimary }]}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {title}
        </Text>
        
        <View style={[styles.sideSlot, styles.rightSlot]}>
          {showNotificationBell && (
            <TouchableOpacity 
              style={styles.iconButton}
              onPress={handleNotificationPress}
              accessibilityRole="button"
              accessibilityLabel="Open notifications"
            >
              <Ionicons name="notifications" size={Math.min(hp(3.7), wp(7.8))} color={colors.textOnPrimary} />
              {notificationCount > 0 && (
                <View style={[styles.badge, { backgroundColor: '#FF6B6B' }]}>
                  <Text style={styles.badgeText}>
                    {notificationCount > 99 ? '99+' : notificationCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          )}

          {!showNotificationBell && (
            <View style={styles.spacer} />
          )}
        </View>
      </View>

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
  container: {
    width: '100%',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    minHeight: hp(7.6),
    paddingHorizontal: wp(5),
  },
  title: {
    fontSize: Math.min(hp(3.1), wp(7.2)),
    fontWeight: '800',
    flex: 1,
    textAlign: 'center',
    includeFontPadding: false,
  },
  sideSlot: {
    width: wp(13),
    minWidth: 44,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  rightSlot: {
    alignItems: 'flex-end',
  },
  iconButton: {
    width: Math.min(hp(5.4), wp(11.8)),
    height: Math.min(hp(5.4), wp(11.8)),
    borderRadius: Math.min(hp(2.7), wp(5.9)),
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: hp(0.2),
    right: wp(0.3),
    minWidth: Math.min(hp(2.2), wp(4.8)),
    height: Math.min(hp(2.2), wp(4.8)),
    borderRadius: Math.min(hp(1.1), wp(2.4)),
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: wp(0.8),
  },
  badgeText: {
    color: 'white',
    fontSize: Math.min(hp(1.2), wp(2.7)),
    fontWeight: 'bold',
    includeFontPadding: false,
  },
  spacer: {
    width: Math.min(hp(5.4), wp(11.8)),
    height: Math.min(hp(5.4), wp(11.8)),
  },
  stepIndicatorContainer: {
    alignItems: 'center',
    paddingBottom: hp(1.4),
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
