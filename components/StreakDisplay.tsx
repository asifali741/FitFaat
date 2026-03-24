import { useTheme } from '@/contexts/ThemeContext';
import { Ionicons, FontAwesome } from '@expo/vector-icons';
import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface StreakDisplayProps {
  streakCount: number;
  longestStreak: number;
  message: string;
  streakPercentage: number;
  shouldSendReminder?: boolean;
  loading?: boolean;
}

export const StreakDisplay: React.FC<StreakDisplayProps> = ({
  streakCount,
  longestStreak,
  message,
  streakPercentage,
  shouldSendReminder = false,
  loading = false,
}) => {
  const { colors, isDarkMode } = useTheme();

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
    <View style={[styles.container, { marginBottom: 20 }]}>
      <LinearGradient
        colors={
          isStreakActive
            ? ['rgba(255, 107, 53, 0.1)', 'rgba(255, 107, 53, 0.05)']
            : [isDarkMode ? 'rgba(100, 100, 100, 0.1)' : 'rgba(200, 200, 200, 0.1)', 'transparent']
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          borderRadius: 16,
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
                <Ionicons name="notifications" size={14} color="#FFFFFF" />
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
                  width: `${Math.min(streakPercentage, 100)}%`,
                  backgroundColor: isStreakActive ? '#FF6B35' : '#CCCCCC',
                },
              ]}
            />
          </View>

          {/* Bottom Row: Stats */}
          <View style={styles.bottomRow}>
            <View style={styles.statItem}>
              <Text style={[styles.statLabel, { color: isDarkMode ? '#AAAAAA' : '#999999' }]}>
                Current
              </Text>
              <Text style={[styles.statValue, { color: isDarkMode ? '#FFFFFF' : '#333333' }]}>
                {streakCount}
              </Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.statItem}>
              <Text style={[styles.statLabel, { color: isDarkMode ? '#AAAAAA' : '#999999' }]}>
                Longest
              </Text>
              <Text style={[styles.statValue, { color: isDarkMode ? '#FFFFFF' : '#333333' }]}>
                {longestStreak}
              </Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.statItem}>
              <Text style={[styles.statLabel, { color: isDarkMode ? '#AAAAAA' : '#999999' }]}>
                Weekly Goal
              </Text>
              <Text style={[styles.statValue, { color: isDarkMode ? '#FFFFFF' : '#333333' }]}>
                7 days
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
    paddingHorizontal: 16,
    marginTop: 12,
  },
  streakCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  fireIconContainer: {
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fireIcon: {
    fontSize: 40,
  },
  streakInfo: {
    flex: 1,
  },
  streakCount: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 4,
  },
  streakMessage: {
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
  },
  reminderBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  progressBarContainer: {
    height: 6,
    borderRadius: 3,
    marginBottom: 14,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 3,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  divider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
});

export default StreakDisplay;
