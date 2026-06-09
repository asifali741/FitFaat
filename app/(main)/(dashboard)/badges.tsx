import AppHeader from '@/components/AppHeader';
import {
  calculateAchievementBadges,
  type AchievementBadge,
  type AchievementDay,
} from '@/constants/achievementBadges';
import { useTheme } from '@/contexts/ThemeContext';
import { loadAchievementLocalStats } from '@/utils/achievementStorage';
import { getStoredDashboardCache } from '@/utils/dashboardStorage';
import {
  getGoalExperience,
  getGoalProgressStatusLabel,
} from '@/utils/goalExperience';
import { buildGoalProgressInterpretation } from '@/utils/goalAdaptivePlan';
import { loadGoalSpineKey, type GoalSpineKey } from '@/utils/goalSpine';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from 'react-native-responsive-screen';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function BadgesScreen() {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const [badges, setBadges] = useState<AchievementBadge[]>([]);
  const [loading, setLoading] = useState(true);
  const [goalKey, setGoalKey] = useState<GoalSpineKey>('unset');

  useEffect(() => {
    let mounted = true;

    const loadBadges = async () => {
      const cachedDashboard = await getStoredDashboardCache<Record<string, AchievementDay>>();
      const progressData = cachedDashboard?.data || null;
      const [localStats, nextGoal] = await Promise.all([
        loadAchievementLocalStats(),
        loadGoalSpineKey().catch(() => 'unset' as GoalSpineKey),
      ]);
      const calculatedBadges = calculateAchievementBadges(progressData, localStats);

      if (!mounted) return;

      setBadges(calculatedBadges);
      setGoalKey(nextGoal);
      setLoading(false);
    };

    loadBadges().catch((error) => {
      console.error('Error loading achievement badges:', error);
      if (mounted) {
        setBadges(calculateAchievementBadges(null));
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
    };
  }, []);

  const sortedBadges = useMemo(
    () =>
      [...badges].sort((a, b) => {
        if (a.unlocked !== b.unlocked) return a.unlocked ? -1 : 1;
        return b.progress - a.progress;
      }),
    [badges]
  );
  const unlockedCount = badges.filter((badge) => badge.unlocked).length;
  const goalExperience = getGoalExperience(goalKey);
  const badgeGoalStatus = getGoalProgressStatusLabel({
    goal: goalKey,
    progressPercent: badges.length ? (unlockedCount / badges.length) * 100 : 0,
    trackedDays: unlockedCount,
  });
  const badgeSignalDays = useMemo(
    () =>
      badges.map((badge, index) => {
        const label = `${badge.title} ${badge.description}`.toLowerCase();
        const progress = badge.unlocked ? 1 : badge.progress;
        return {
          dayNo: index + 1,
          status: progress > 0 ? 'finished' : 'active',
          achievedCalories: progress > 0 ? Math.round(1000 * progress) : 0,
          targetCalories: 1000,
          targetCaloriesMin: 850,
          targetCaloriesMax: 1100,
          achievedHydration: progress > 0 ? 1.5 : 0,
          targetHydration: 2,
          walkingSteps: label.includes('walk') || label.includes('step') ? Math.round(6000 * progress) : 0,
          targetSteps: 6000,
          exerciseCaloriesBurned:
            label.includes('workout') || label.includes('strength') || label.includes('streak')
              ? Math.round(220 * progress)
              : 0,
          meals: progress > 0 ? [{ name: badge.title }] : [],
        };
      }),
    [badges]
  );
  const badgeInterpretation = useMemo(
    () =>
      buildGoalProgressInterpretation({
        goal: goalKey,
        days: badgeSignalDays,
        isPremium: true,
      }),
    [badgeSignalDays, goalKey]
  );

  const renderBadge = (badge: AchievementBadge) => {
    const badgeColor = badge.unlocked ? badge.color : badge.lockedColor;

    return (
      <View key={badge.id} style={styles.badgeCard}>
        <View style={styles.badgeTopRow}>
          <View
            style={[
              styles.badgeIconWrap,
              { backgroundColor: badge.unlocked ? `${badgeColor}18` : `${badgeColor}12` },
            ]}
          >
            <Ionicons
              name={badge.icon as any}
              size={Math.min(hp(3.8), wp(8.5))}
              color={badgeColor}
            />
          </View>
          <View
            style={[
              styles.badgeStatePill,
              {
                backgroundColor: badge.unlocked ? `${colors.success}18` : `${colors.textTertiary}18`,
              },
            ]}
          >
            <Ionicons
              name={badge.unlocked ? 'checkmark-circle' : 'lock-closed'}
              size={Math.min(hp(1.45), wp(3.3))}
              color={badge.unlocked ? colors.success : colors.textTertiary}
            />
            <Text
              style={[
                styles.badgeStateText,
                { color: badge.unlocked ? colors.success : colors.textTertiary },
              ]}
              numberOfLines={1}
            >
              {badge.unlocked ? 'Unlocked' : 'Locked'}
            </Text>
          </View>
        </View>

        <Text style={[styles.badgeTitle, { color: colors.textPrimary }]} numberOfLines={1}>
          {badge.title}
        </Text>
        <Text style={[styles.badgeDescription, { color: colors.textSecondary }]} numberOfLines={2}>
          {badge.description}
        </Text>
        <View style={styles.progressRow}>
          <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${Math.round(badge.progress * 100)}%`,
                  backgroundColor: badgeColor,
                },
              ]}
            />
          </View>
          <Text style={[styles.progressText, { color: colors.textSecondary }]} numberOfLines={1}>
            {badge.unlocked ? 'Done' : badge.progressLabel}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.screenColor }]} edges={['top']}>
      <AppHeader
        title="Achievement Badges"
        showStepIndicator={false}
        showMenuButton={false}
        showBackButton
      />

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.summaryCard}>
            <View>
              <Text style={[styles.summaryTitle, { color: colors.textPrimary }]}>
                Your Badge Collection
              </Text>
              <Text style={[styles.summarySubtitle, { color: colors.textSecondary }]}>
                {badgeGoalStatus}. Milestones show how your logs support {goalExperience.label}.
              </Text>
              <Text style={[styles.summaryInsight, { color: goalExperience.color }]} numberOfLines={2}>
                Helping: {badgeInterpretation.helping.join(', ')}. Blocking: {badgeInterpretation.blocking.join(', ')}.
              </Text>
            </View>
            <View style={[styles.summaryCount, { backgroundColor: `${colors.primary}14` }]}>
              <Text style={[styles.summaryCountText, { color: colors.primary }]}>
                {unlockedCount}/{badges.length}
              </Text>
              <Text style={[styles.summaryCountLabel, { color: colors.textSecondary }]}>
                unlocked
              </Text>
            </View>
          </View>

          <View style={styles.grid}>{sortedBadges.map(renderBadge)}</View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const getStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    loadingWrap: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    scroll: {
      flex: 1,
      backgroundColor: colors.screenColor,
    },
    scrollContent: {
      paddingHorizontal: wp(4),
      paddingTop: hp(2),
      paddingBottom: hp(13),
    },
    summaryCard: {
      borderRadius: wp(3.2),
      padding: wp(4),
      backgroundColor: colors.cardBackground,
      borderWidth: 1,
      borderColor: colors.border,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: wp(3),
      marginBottom: hp(2),
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: hp(0.3) },
      shadowOpacity: 0.08,
      shadowRadius: wp(2),
      elevation: 2,
    },
    summaryTitle: {
      fontSize: Math.min(hp(2.1), wp(5)),
      fontWeight: '900',
    },
    summarySubtitle: {
      marginTop: hp(0.5),
      maxWidth: wp(56),
      fontSize: Math.min(hp(1.35), wp(3.2)),
      lineHeight: Math.min(hp(2), wp(4.6)),
      fontWeight: '600',
    },
    summaryInsight: {
      marginTop: hp(0.45),
      maxWidth: wp(56),
      fontSize: Math.min(hp(1.1), wp(2.6)),
      lineHeight: hp(1.55),
      fontWeight: '800',
    },
    summaryCount: {
      minWidth: wp(22),
      borderRadius: wp(3),
      paddingHorizontal: wp(2.5),
      paddingVertical: hp(1.2),
      alignItems: 'center',
    },
    summaryCountText: {
      fontSize: Math.min(hp(2.1), wp(5)),
      fontWeight: '900',
    },
    summaryCountLabel: {
      fontSize: Math.min(hp(1.1), wp(2.7)),
      fontWeight: '800',
      textTransform: 'uppercase',
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: wp(3),
    },
    badgeCard: {
      width: (wp(92) - wp(3)) / 2,
      minHeight: hp(19),
      borderRadius: wp(3),
      padding: wp(3),
      backgroundColor: colors.cardBackground,
      borderWidth: 1,
      borderColor: colors.border,
    },
    badgeTopRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      marginBottom: hp(1.2),
    },
    badgeIconWrap: {
      width: Math.min(hp(6.2), wp(14)),
      height: Math.min(hp(6.2), wp(14)),
      borderRadius: Math.min(hp(3.1), wp(7)),
      alignItems: 'center',
      justifyContent: 'center',
    },
    badgeStatePill: {
      minHeight: hp(2.5),
      borderRadius: hp(1.4),
      paddingHorizontal: wp(1.6),
      flexDirection: 'row',
      alignItems: 'center',
      gap: wp(0.6),
    },
    badgeStateText: {
      fontSize: Math.min(hp(1), wp(2.4)),
      fontWeight: '900',
    },
    badgeTitle: {
      fontSize: Math.min(hp(1.65), wp(3.8)),
      fontWeight: '900',
    },
    badgeDescription: {
      marginTop: hp(0.5),
      minHeight: hp(4),
      fontSize: Math.min(hp(1.2), wp(2.9)),
      lineHeight: Math.min(hp(1.8), wp(4.2)),
      fontWeight: '600',
    },
    progressRow: {
      marginTop: hp(1.2),
    },
    progressTrack: {
      height: hp(0.7),
      borderRadius: hp(0.4),
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      borderRadius: hp(0.4),
    },
    progressText: {
      marginTop: hp(0.6),
      fontSize: Math.min(hp(1.1), wp(2.7)),
      fontWeight: '800',
    },
  });
