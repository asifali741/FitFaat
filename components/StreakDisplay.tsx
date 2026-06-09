import { useTheme } from '@/contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
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

type GradientColors = [string, string, ...string[]];

export const StreakDisplay: React.FC<StreakDisplayProps> = ({
  streakCount,
  longestStreak,
  message,
  streakPercentage,
  weeklyGoalDays = 7,
  shouldSendReminder = false,
  loading = false,
}) => {
  const { isDarkMode, colors } = useTheme();
  const weeklyGoalProgress = Math.min(Math.max(streakCount, 0), weeklyGoalDays);
  const boundedStreakPercentage = Math.min(Math.max(streakPercentage, 0), 100);
  const isStreakActive = streakCount > 0;
  const fireIconColor = isStreakActive ? '#FF6B35' : isDarkMode ? '#64748B' : '#CBD5E1';
  const accentColor = isStreakActive ? '#FF6B35' : colors.textTertiary;
  const secondaryAccent = isStreakActive ? '#F59E0B' : colors.border;
  const cardGradient: GradientColors = isStreakActive
    ? isDarkMode
      ? ['#2A170D', '#1E293B', '#0F172A']
      : ['#FFF7ED', '#FFFFFF', '#ECFEFF']
    : isDarkMode
      ? ['#1E293B', '#111827', '#0F172A']
      : ['#F8FAFC', '#FFFFFF', '#F1F5F9'];
  const fireGradient: GradientColors = isStreakActive
    ? ['#FF6B35', '#F59E0B']
    : [colors.textTertiary, colors.border];
  const progressGradient: GradientColors = isStreakActive
    ? ['#FF6B35', '#F59E0B', colors.primary]
    : ['#CBD5E1', '#94A3B8'];
  const glowStyle = isStreakActive
    ? {
        shadowColor: '#FF6B35',
        shadowOffset: { width: 0, height: hp(1) },
        shadowOpacity: 0.22,
        shadowRadius: wp(4.2),
        elevation: 10,
      }
    : {
        shadowColor: colors.black,
        shadowOffset: { width: 0, height: hp(0.5) },
        shadowOpacity: 0.08,
        shadowRadius: wp(2.1),
        elevation: 3,
      };
  const goalMarkers = Array.from(
    { length: Math.max(weeklyGoalDays, 1) },
    (_, index) => index < weeklyGoalProgress
  );

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={cardGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.streakCard,
          glowStyle,
          {
            borderColor: isStreakActive
              ? 'rgba(255, 107, 53, 0.35)'
              : colors.cardBorder || colors.border,
          },
        ]}
      >
        <View style={[styles.glowOrb, styles.glowOrbOne, { backgroundColor: `${accentColor}20` }]} />
        <View style={[styles.glowOrb, styles.glowOrbTwo, { backgroundColor: `${colors.primary}16` }]} />

        <View style={styles.headerRow}>
          <View style={styles.titleBlock}>
            <View
              style={[
                styles.statusPill,
                { backgroundColor: isStreakActive ? `${accentColor}18` : `${colors.textTertiary}18` },
              ]}
            >
              <Ionicons name="sparkles-outline" size={Math.min(hp(1.7), wp(3.8))} color={accentColor} />
              <Text style={[styles.statusPillText, { color: accentColor }]}>
                {isStreakActive ? 'Streak alive' : 'Ready to start'}
              </Text>
            </View>
            <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Consistency Streak</Text>
          </View>

          {shouldSendReminder && streakCount > 0 && (
            <View style={[styles.reminderBadge, { backgroundColor: '#FFB800' }]}>
              <Ionicons name="notifications" size={Math.min(hp(1.8), wp(4))} color="#FFFFFF" />
            </View>
          )}
        </View>

        <View style={styles.heroRow}>
          <View
            style={[
              styles.fireBadge,
              { backgroundColor: isStreakActive ? `${accentColor}18` : `${colors.textTertiary}14` },
            ]}
          >
            <LinearGradient
              colors={fireGradient}
              style={styles.fireBadgeInner}
            >
              {loading ? (
                <ActivityIndicator size="small" color={colors.textOnPrimary} />
              ) : (
                <Ionicons name="flame" size={Math.min(hp(4.3), wp(9.4))} color={colors.textOnPrimary} />
              )}
            </LinearGradient>
          </View>

          <View style={styles.heroCopy}>
            <View style={styles.streakNumberRow}>
              <Text style={[styles.streakCount, { color: fireIconColor }]}>{streakCount}</Text>
              <View style={styles.streakUnitWrap}>
                <Text style={[styles.streakUnit, { color: colors.textPrimary }]}>
                  {streakCount === 1 ? 'Day' : 'Days'}
                </Text>
                <Text style={[styles.streakCaption, { color: colors.textSecondary }]}>current streak</Text>
              </View>
            </View>
            <Text style={[styles.streakMessage, { color: colors.textSecondary }]}>{message}</Text>
          </View>
        </View>

        <View style={styles.goalStrip}>
          {goalMarkers.map((filled, index) => (
            <View
              key={`streak-marker-${index}`}
              style={[
                styles.goalMarker,
                {
                  backgroundColor: filled ? accentColor : isDarkMode ? 'rgba(148, 163, 184, 0.2)' : '#E2E8F0',
                  borderColor: filled ? secondaryAccent : colors.cardBorder || colors.border,
                },
              ]}
            >
              {filled ? (
                <Ionicons name="checkmark" size={Math.min(hp(1.35), wp(3))} color="#FFFFFF" />
              ) : null}
            </View>
          ))}
        </View>

        <View
          style={[
            styles.progressBarContainer,
            { backgroundColor: isDarkMode ? 'rgba(148, 163, 184, 0.18)' : '#E2E8F0' },
          ]}
        >
          <LinearGradient
            colors={progressGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.progressBar, { width: `${boundedStreakPercentage}%` }]}
          />
        </View>

        <View style={styles.bottomRow}>
          <View
            style={[
              styles.statItem,
              { backgroundColor: isDarkMode ? 'rgba(15, 23, 42, 0.42)' : 'rgba(255, 255, 255, 0.72)' },
            ]}
          >
            <Ionicons name="flame-outline" size={Math.min(hp(2), wp(4.4))} color={accentColor} />
            <Text style={[styles.statValue, { color: colors.textPrimary }]} numberOfLines={1} adjustsFontSizeToFit>
              {streakCount}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]} numberOfLines={1}>
              Current
            </Text>
          </View>

          <View
            style={[
              styles.statItem,
              { backgroundColor: isDarkMode ? 'rgba(15, 23, 42, 0.42)' : 'rgba(255, 255, 255, 0.72)' },
            ]}
          >
            <Ionicons name="trophy-outline" size={Math.min(hp(2), wp(4.4))} color={colors.warning} />
            <Text style={[styles.statValue, { color: colors.textPrimary }]} numberOfLines={1} adjustsFontSizeToFit>
              {longestStreak}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]} numberOfLines={1}>
              Best
            </Text>
          </View>

          <View
            style={[
              styles.statItem,
              { backgroundColor: isDarkMode ? 'rgba(15, 23, 42, 0.42)' : 'rgba(255, 255, 255, 0.72)' },
            ]}
          >
            <Ionicons name="calendar-number-outline" size={Math.min(hp(2), wp(4.4))} color={colors.primary} />
            <Text
              style={[styles.statValue, { color: colors.textPrimary }]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.7}
            >
              {weeklyGoalProgress}/{weeklyGoalDays}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]} numberOfLines={1}>
              Weekly
            </Text>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: wp(4),
    marginTop: hp(1.3),
    marginBottom: hp(2.4),
  },
  streakCard: {
    borderRadius: hp(2.2),
    padding: wp(4.2),
    borderWidth: Math.min(wp(0.28), hp(0.16)),
    overflow: 'hidden',
  },
  glowOrb: {
    position: 'absolute',
    borderRadius: wp(18),
  },
  glowOrbOne: {
    width: wp(34),
    height: wp(34),
    top: -hp(7),
    right: -wp(11),
  },
  glowOrbTwo: {
    width: wp(28),
    height: wp(28),
    bottom: -hp(8),
    left: -wp(9),
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: wp(3),
  },
  titleBlock: {
    flex: 1,
    minWidth: 0,
  },
  statusPill: {
    alignSelf: 'flex-start',
    minHeight: hp(3),
    borderRadius: hp(1.5),
    paddingHorizontal: wp(2.5),
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(1),
    marginBottom: hp(0.65),
  },
  statusPillText: {
    fontSize: Math.min(hp(1.15), wp(2.75)),
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  cardTitle: {
    fontSize: Math.min(hp(2.05), wp(4.7)),
    fontWeight: '900',
  },
  reminderBadge: {
    width: Math.min(hp(4.1), wp(9)),
    height: Math.min(hp(4.1), wp(9)),
    borderRadius: Math.min(hp(2.05), wp(4.5)),
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(3.4),
    marginTop: hp(1.8),
  },
  fireBadge: {
    width: Math.min(hp(8.8), wp(19)),
    height: Math.min(hp(8.8), wp(19)),
    borderRadius: Math.min(hp(4.4), wp(9.5)),
    alignItems: 'center',
    justifyContent: 'center',
  },
  fireBadgeInner: {
    width: Math.min(hp(7.1), wp(15.5)),
    height: Math.min(hp(7.1), wp(15.5)),
    borderRadius: Math.min(hp(3.55), wp(7.75)),
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCopy: {
    flex: 1,
    minWidth: 0,
  },
  streakNumberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2),
  },
  streakCount: {
    fontSize: Math.min(hp(4.5), wp(9.8)),
    fontWeight: '900',
    lineHeight: Math.min(hp(5), wp(11)),
  },
  streakUnitWrap: {
    flex: 1,
    minWidth: 0,
  },
  streakUnit: {
    fontSize: Math.min(hp(1.85), wp(4.2)),
    fontWeight: '900',
  },
  streakCaption: {
    fontSize: Math.min(hp(1.12), wp(2.7)),
    fontWeight: '800',
    textTransform: 'uppercase',
    marginTop: hp(0.05),
  },
  streakMessage: {
    fontSize: Math.min(hp(1.4), wp(3.3)),
    fontWeight: '700',
    lineHeight: hp(1.95),
    marginTop: hp(0.45),
  },
  goalStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: wp(1.2),
    marginTop: hp(2),
    marginBottom: hp(1.25),
  },
  goalMarker: {
    flex: 1,
    maxWidth: wp(9),
    height: hp(2.7),
    borderRadius: hp(1.35),
    borderWidth: Math.min(wp(0.28), hp(0.16)),
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressBarContainer: {
    height: hp(0.9),
    borderRadius: hp(0.45),
    marginBottom: hp(1.6),
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: hp(0.45),
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2),
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 0,
    minHeight: hp(8.1),
    borderRadius: hp(1.4),
    paddingVertical: hp(0.9),
    paddingHorizontal: wp(1.4),
  },
  statValue: {
    fontSize: Math.min(hp(2), wp(4.55)),
    fontWeight: '900',
    textAlign: 'center',
    marginTop: hp(0.35),
  },
  statLabel: {
    fontSize: Math.min(hp(1.08), wp(2.6)),
    fontWeight: '800',
    marginTop: hp(0.2),
    textTransform: 'uppercase',
  },
});

export default StreakDisplay;
