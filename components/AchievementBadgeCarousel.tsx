import {
  calculateAchievementBadges,
  type AchievementBadge,
  type AchievementDay,
} from '@/constants/achievementBadges';
import { useTheme } from '@/contexts/ThemeContext';
import {
  loadAchievementLocalStats,
  syncUnlockedAchievementIds,
} from '@/utils/achievementStorage';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from 'react-native-responsive-screen';

type AchievementBadgeCarouselProps = {
  progressData: Record<string, AchievementDay>;
};

export default function AchievementBadgeCarousel({
  progressData,
}: AchievementBadgeCarouselProps) {
  const { colors } = useTheme();
  const router = useRouter();
  const styles = getStyles(colors);
  const [badges, setBadges] = useState<AchievementBadge[]>(() =>
    calculateAchievementBadges(progressData)
  );
  const [newBadge, setNewBadge] = useState<AchievementBadge | null>(null);

  useEffect(() => {
    let mounted = true;

    const refreshBadges = async () => {
      const localStats = await loadAchievementLocalStats();
      const calculatedBadges = calculateAchievementBadges(progressData, localStats);
      const unlockedIds = calculatedBadges
        .filter((badge) => badge.unlocked)
        .map((badge) => badge.id);
      const newlyUnlockedIds = await syncUnlockedAchievementIds(unlockedIds);

      if (!mounted) return;

      setBadges(calculatedBadges);

      if (newlyUnlockedIds.length > 0) {
        const earnedBadge = calculatedBadges.find(
          (badge) => badge.id === newlyUnlockedIds[0]
        );
        if (earnedBadge) {
          setNewBadge(earnedBadge);
        }
      }
    };

    refreshBadges().catch((error) => {
      console.error('Error refreshing achievement badges:', error);
    });

    return () => {
      mounted = false;
    };
  }, [progressData]);

  const sortedBadges = useMemo(
    () =>
      [...badges].sort((a, b) => {
        if (a.unlocked !== b.unlocked) return a.unlocked ? -1 : 1;
        return b.progress - a.progress;
      }),
    [badges]
  );

  const unlockedCount = badges.filter((badge) => badge.unlocked).length;
  const previewBadges = sortedBadges.slice(0, 6);

  const renderBadge = (badge: AchievementBadge) => {
    const badgeColor = badge.unlocked ? badge.color : badge.lockedColor;

    return (
      <View key={badge.id} style={styles.badgeCard}>
        <View
          style={[
            styles.badgeIconWrap,
            { backgroundColor: badge.unlocked ? `${badgeColor}18` : `${badgeColor}12` },
          ]}
        >
          <Ionicons
            name={badge.icon as any}
            size={Math.min(hp(3.1), wp(7))}
            color={badgeColor}
          />
          {!badge.unlocked && (
            <View style={styles.lockOverlay}>
              <Ionicons name="lock-closed" size={Math.min(hp(1.5), wp(3.4))} color="#FFFFFF" />
            </View>
          )}
        </View>
        <Text style={[styles.badgeTitle, { color: colors.textPrimary }]} numberOfLines={1}>
          {badge.title}
        </Text>
        <Text style={[styles.badgeProgressText, { color: colors.textSecondary }]} numberOfLines={1}>
          {badge.unlocked ? 'Unlocked' : badge.progressLabel}
        </Text>
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
      </View>
    );
  };

  return (
    <View style={styles.section}>
      <View style={styles.headerRow}>
        <View>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            Achievement Badges
          </Text>
          <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
            {unlockedCount}/{badges.length} unlocked
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.viewAllButton, { borderColor: colors.primary }]}
          onPress={() => router.push('/(main)/(dashboard)/badges')}
          activeOpacity={0.75}
        >
          <Text style={[styles.viewAllText, { color: colors.primary }]}>View All</Text>
          <Ionicons name="chevron-forward" size={Math.min(hp(1.8), wp(4))} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.badgeList}
      >
        {previewBadges.map(renderBadge)}
      </ScrollView>

      <Modal visible={Boolean(newBadge)} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={[styles.unlockModal, { backgroundColor: colors.cardBackground }]}>
            {newBadge && (
              <>
                <View
                  style={[
                    styles.unlockIcon,
                    { backgroundColor: `${newBadge.color}18` },
                  ]}
                >
                  <Ionicons
                    name={newBadge.icon as any}
                    size={Math.min(hp(5), wp(11))}
                    color={newBadge.color}
                  />
                </View>
                <Text style={[styles.unlockTitle, { color: colors.textPrimary }]}>
                  New Badge Earned
                </Text>
                <Text style={[styles.unlockBadgeName, { color: newBadge.color }]}>
                  {newBadge.title}
                </Text>
                <Text style={[styles.unlockDescription, { color: colors.textSecondary }]}>
                  {newBadge.description}
                </Text>
                <TouchableOpacity
                  style={[styles.unlockButton, { backgroundColor: colors.primary }]}
                  onPress={() => setNewBadge(null)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.unlockButtonText}>Nice</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const getStyles = (colors: any) =>
  StyleSheet.create({
    section: {
      marginHorizontal: wp(4),
      marginBottom: hp(2),
      paddingVertical: hp(1.6),
      borderRadius: wp(3),
      backgroundColor: colors.cardBackground,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: hp(0.3) },
      shadowOpacity: 0.08,
      shadowRadius: wp(2),
      elevation: 2,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: wp(4),
      marginBottom: hp(1.3),
      gap: wp(3),
    },
    sectionTitle: {
      fontSize: Math.min(hp(2), wp(4.7)),
      fontWeight: '900',
    },
    sectionSubtitle: {
      marginTop: hp(0.2),
      fontSize: Math.min(hp(1.35), wp(3.2)),
      fontWeight: '700',
    },
    viewAllButton: {
      minHeight: hp(3.6),
      paddingHorizontal: wp(2.6),
      borderRadius: hp(2),
      borderWidth: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: wp(0.8),
    },
    viewAllText: {
      fontSize: Math.min(hp(1.35), wp(3.1)),
      fontWeight: '800',
    },
    badgeList: {
      paddingHorizontal: wp(4),
      gap: wp(3),
    },
    badgeCard: {
      width: wp(26),
      minHeight: hp(15),
      borderRadius: wp(2.6),
      padding: wp(2.5),
      alignItems: 'center',
      backgroundColor: colors.backgroundHeader,
      borderWidth: 1,
      borderColor: colors.border,
    },
    badgeIconWrap: {
      width: Math.min(hp(6), wp(13)),
      height: Math.min(hp(6), wp(13)),
      borderRadius: Math.min(hp(3), wp(6.5)),
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: hp(0.9),
    },
    lockOverlay: {
      position: 'absolute',
      right: -wp(0.7),
      bottom: -hp(0.3),
      width: Math.min(hp(2.4), wp(5.4)),
      height: Math.min(hp(2.4), wp(5.4)),
      borderRadius: Math.min(hp(1.2), wp(2.7)),
      backgroundColor: '#64748B',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.cardBackground,
    },
    badgeTitle: {
      fontSize: Math.min(hp(1.35), wp(3.1)),
      fontWeight: '900',
      textAlign: 'center',
    },
    badgeProgressText: {
      marginTop: hp(0.3),
      fontSize: Math.min(hp(1.1), wp(2.7)),
      fontWeight: '700',
      textAlign: 'center',
    },
    progressTrack: {
      width: '100%',
      height: hp(0.55),
      borderRadius: hp(0.4),
      overflow: 'hidden',
      marginTop: hp(0.9),
    },
    progressFill: {
      height: '100%',
      borderRadius: hp(0.4),
    },
    modalBackdrop: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(15, 23, 42, 0.55)',
      paddingHorizontal: wp(6),
    },
    unlockModal: {
      width: '100%',
      borderRadius: wp(5),
      paddingHorizontal: wp(6),
      paddingVertical: hp(3),
      alignItems: 'center',
    },
    unlockIcon: {
      width: Math.min(hp(9), wp(20)),
      height: Math.min(hp(9), wp(20)),
      borderRadius: Math.min(hp(4.5), wp(10)),
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: hp(1.5),
    },
    unlockTitle: {
      fontSize: Math.min(hp(2.2), wp(5)),
      fontWeight: '900',
    },
    unlockBadgeName: {
      marginTop: hp(0.6),
      fontSize: Math.min(hp(2), wp(4.7)),
      fontWeight: '900',
      textAlign: 'center',
    },
    unlockDescription: {
      marginTop: hp(1),
      fontSize: Math.min(hp(1.55), wp(3.6)),
      lineHeight: Math.min(hp(2.3), wp(5.4)),
      fontWeight: '600',
      textAlign: 'center',
    },
    unlockButton: {
      marginTop: hp(2.2),
      minHeight: hp(4.7),
      minWidth: wp(34),
      borderRadius: hp(2.4),
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: wp(5),
    },
    unlockButtonText: {
      color: '#FFFFFF',
      fontSize: Math.min(hp(1.7), wp(4)),
      fontWeight: '900',
    },
  });
