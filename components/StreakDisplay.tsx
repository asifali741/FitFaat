import { useTheme } from '@/contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from 'react-native-responsive-screen';

interface StreakDisplayProps {
  streakCount: number;
  longestStreak: number;
  message: string;
  streakPercentage: number;
  weeklyGoalDays?: number;
  shouldSendReminder?: boolean;
  loading?: boolean;
}

export const StreakDisplay: React.FC<StreakDisplayProps> = ({
  streakCount,
  longestStreak,
  message,
  streakPercentage,
  weeklyGoalDays = 7,
  shouldSendReminder = false,
  loading = false,
}) => {
  const { isDarkMode } = useTheme();
  const weeklyGoalProgress = Math.min(Math.max(streakCount, 0), weeklyGoalDays);
  const boundedStreakPercentage = Math.min(Math.max(streakPercentage, 0), 100);

  // Determine if streak is active (has entries)
  const isStreakActive = streakCount > 0;

  // Fire icon color based on streak status
  const fireIconColor = isStreakActive
    ? '#FF6B35' // Warm orange for active streak
    : isDarkMode
    ? '#666666' // Grey for dark mode
    : '#CCCCCC'; // Light grey for light mode

  // Glow effect only when streak is active
  const shadowStyle = isStreakActive
    ? {
        shadowColor: '#FF6B35',
        shadowOffset: {
          width: 0,
          height: 0,
        },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        elevation: 8,
      }
    : {};

  return (
    <View style={[styles.container, { marginBottom: hp(2.5) }]}>
      <LinearGradient
        colors={
          isStreakActive
            ? ['rgba(255, 107, 53, 0.1)', 'rgba(255, 107, 53, 0.05)']
            : [isDarkMode ? 'rgba(100, 100, 100, 0.1)' : 'rgba(200, 200, 200, 0.1)', 'transparent']
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          borderRadius: wp(4.3),
          overflow: 'hidden',
        }}
      >
        <View
          style={[
            styles.streakCard,
            {
              backgroundColor: isDarkMode
                ? isStreakActive
                  ? 'rgba(255, 107, 53, 0.08)'
                  : 'rgba(100, 100, 100, 0.08)'
                : isStreakActive
                ? 'rgba(255, 107, 53, 0.05)'
                : 'rgba(200, 200, 200, 0.08)',
              borderColor: isStreakActive ? '#FF6B35' : isDarkMode ? '#555555' : '#DDDDDD',
            },
            shadowStyle,
          ]}
        >
          {/* Top Row: Fire Icon and Main Streak Info */}
          <View style={styles.topRow}>
            {/* Fire Icon with Glow */}
            <View style={[styles.fireIconContainer, shadowStyle]}>
              {loading ? (
                <ActivityIndicator size="small" color={fireIconColor} />
              ) : (
                <Text style={[styles.fireIcon, { color: fireIconColor }]}>🔥</Text>
              )}
            </View>

            {/* Streak Info */}
            <View style={styles.streakInfo}>
              <Text
                style={[
                  styles.streakCount,
                  {
                    color: isStreakActive ? '#FF6B35' : isDarkMode ? '#AAAAAA' : '#999999',
                  },
                ]}
              >
                {streakCount} {streakCount === 1 ? 'Day' : 'Days'}
              </Text>
              <Text
                style={[
                  styles.streakMessage,
                  { color: isDarkMode ? '#DDDDDD' : '#555555' },
                ]}
              >
                {message}
              </Text>
            </View>

            {/* Reminder Icon (if applicable) */}
            {shouldSendReminder && streakCount > 0 && (
              <View style={[styles.reminderBadge, { backgroundColor: '#FFB800' }]}>
                <Ionicons name="notifications" size={Math.min(hp(1.7), wp(3.7))} color="#FFFFFF" />
              </View>
            )}
          </View>

          {/* Progress Bar */}
          <View
            style={[
              styles.progressBarContainer,
              {
                backgroundColor: isDarkMode ? 'rgba(100, 100, 100, 0.3)' : 'rgba(200, 200, 200, 0.3)',
              },
            ]}
          >
            <View
              style={[
                styles.progressBar,
                {
                  width: `${boundedStreakPercentage}%`,
                  backgroundColor: isStreakActive ? '#FF6B35' : '#CCCCCC',
                },
              ]}
            />
          </View>

          {/* Bottom Row: Stats */}
          <View style={styles.bottomRow}>
            <View style={styles.statItem}>
              <Text
                style={[styles.statLabel, { color: isDarkMode ? '#AAAAAA' : '#999999' }]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.76}
              >
                Current
              </Text>
              <Text
                style={[styles.statValue, { color: isDarkMode ? '#FFFFFF' : '#333333' }]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.72}
              >
                {streakCount}
              </Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.statItem}>
              <Text
                style={[styles.statLabel, { color: isDarkMode ? '#AAAAAA' : '#999999' }]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.76}
              >
                Longest
              </Text>
              <Text
                style={[styles.statValue, { color: isDarkMode ? '#FFFFFF' : '#333333' }]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.72}
              >
                {longestStreak}
              </Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.statItem}>
              <Text
                style={[styles.statLabel, { color: isDarkMode ? '#AAAAAA' : '#999999' }]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.76}
              >
                Weekly Goal
              </Text>
              <Text
                style={[styles.statValue, { color: isDarkMode ? '#FFFFFF' : '#333333' }]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.68}
              >
                {weeklyGoalProgress}/{weeklyGoalDays} days
              </Text>
            </View>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: wp(4.3),
    marginTop: hp(1.5),
  },
  streakCard: {
    borderRadius: wp(4.3),
    padding: wp(4.3),
    borderWidth: 1.5,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: hp(2),
  },
  fireIconContainer: {
    marginRight: wp(3.2),
    justifyContent: 'center',
    alignItems: 'center',
  },
  fireIcon: {
    fontSize: Math.min(hp(4.9), wp(10.7)),
  },
  streakInfo: {
    flex: 1,
  },
  streakCount: {
    fontSize: Math.min(hp(2.7), wp(5.9)),
    fontWeight: '700',
    marginBottom: hp(0.5),
  },
  streakMessage: {
    fontSize: Math.min(hp(1.6), wp(3.5)),
    fontWeight: '500',
    lineHeight: hp(2.2),
  },
  reminderBadge: {
    width: Math.min(hp(3.9), wp(8.5)),
    height: Math.min(hp(3.9), wp(8.5)),
    borderRadius: Math.min(hp(2), wp(4.3)),
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: wp(2.1),
  },
  progressBarContainer: {
    height: hp(0.7),
    borderRadius: hp(0.35),
    marginBottom: hp(1.7),
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: hp(0.35),
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    minWidth: 0,
    paddingHorizontal: wp(0.8),
  },
  statLabel: {
    fontSize: Math.min(hp(1.35), wp(3)),
    fontWeight: '500',
    marginBottom: hp(0.5),
    textTransform: 'uppercase',
    letterSpacing: 0,
  },
  statValue: {
    fontSize: Math.min(hp(2.2), wp(4.8)),
    fontWeight: '700',
    textAlign: 'center',
  },
  divider: {
    width: wp(0.25),
    height: hp(3),
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
});

export default StreakDisplay;
