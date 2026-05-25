import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import React from 'react';
import {
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from 'react-native-responsive-screen';
import { useTheme } from '@/contexts/ThemeContext';
import AnimatedPressable from './AnimatedPressable';

type IconName = keyof typeof Ionicons.glyphMap;

export type PremiumTeaserMetric = {
  label: string;
  value: string;
  icon?: IconName;
  color?: string;
};

type PremiumTeaserCardProps = {
  title: string;
  subtitle: string;
  previewTitle?: string;
  icon?: IconName;
  metrics?: PremiumTeaserMetric[];
  bullets?: string[];
  ctaLabel?: string;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
};

const defaultMetrics: PremiumTeaserMetric[] = [
  { label: 'Score', value: '88', icon: 'sparkles-outline', color: '#0891B2' },
  { label: 'Trend', value: '+12%', icon: 'trending-up-outline', color: '#10B981' },
  { label: 'Alerts', value: '3', icon: 'notifications-outline', color: '#F59E0B' },
];

export function PremiumTeaserCard({
  title,
  subtitle,
  previewTitle = 'Premium preview',
  icon = 'diamond-outline',
  metrics = defaultMetrics,
  bullets = [],
  ctaLabel = 'Upgrade',
  compact = false,
  style,
  onPress,
}: PremiumTeaserCardProps) {
  const router = useRouter();
  const { colors, isDarkMode } = useTheme();
  const styles = getStyles(colors, compact);
  const previewMetrics = metrics.slice(0, 4);

  const handlePress = () => {
    if (onPress) {
      onPress();
      return;
    }

    router.push('/(main)/(settings)/premium' as any);
  };

  return (
    <View style={[styles.card, style]}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <View style={styles.iconWrap}>
            <Ionicons name={icon} size={Math.min(hp(2.6), wp(5.8))} color={colors.primary} />
          </View>
          <View style={styles.copyWrap}>
            <Text style={styles.eyebrow}>Premium Moment</Text>
            <Text style={styles.title} numberOfLines={1} adjustsFontSizeToFit>
              {title}
            </Text>
          </View>
        </View>

        <AnimatedPressable style={styles.ctaButton} onPress={handlePress} accessibilityLabel={ctaLabel}>
          <Ionicons name="lock-open-outline" size={Math.min(hp(1.8), wp(4))} color={colors.textOnPrimary} />
          <Text style={styles.ctaText}>{ctaLabel}</Text>
        </AnimatedPressable>
      </View>

      <Text style={styles.subtitle}>{subtitle}</Text>

      <View style={styles.previewPanel}>
        <View style={styles.previewHeader}>
          <View>
            <Text style={styles.previewLabel}>Preview</Text>
            <Text style={styles.previewTitle} numberOfLines={1}>
              {previewTitle}
            </Text>
          </View>
          <View style={styles.lockPill}>
            <Ionicons name="lock-closed" size={Math.min(hp(1.55), wp(3.5))} color={colors.primary} />
            <Text style={styles.lockText}>Premium</Text>
          </View>
        </View>

        <View style={styles.metricGrid}>
          {previewMetrics.map((metric) => (
            <View key={`${metric.label}-${metric.value}`} style={styles.metricCard}>
              <View style={[styles.metricIcon, { backgroundColor: `${metric.color || colors.primary}18` }]}>
                <Ionicons
                  name={metric.icon || 'analytics-outline'}
                  size={Math.min(hp(1.9), wp(4.2))}
                  color={metric.color || colors.primary}
                />
              </View>
              <Text style={styles.metricValue} numberOfLines={1} adjustsFontSizeToFit>
                {metric.value}
              </Text>
              <Text style={styles.metricLabel} numberOfLines={1}>
                {metric.label}
              </Text>
            </View>
          ))}
        </View>

        {bullets.length > 0 ? (
          <View style={styles.bulletRow}>
            {bullets.slice(0, 3).map((bullet) => (
              <View key={bullet} style={styles.bulletPill}>
                <Ionicons name="checkmark-circle" size={Math.min(hp(1.45), wp(3.2))} color={colors.success} />
                <Text style={styles.bulletText} numberOfLines={1}>
                  {bullet}
                </Text>
              </View>
            ))}
          </View>
        ) : null}

        <View style={styles.unlockRow}>
          <BlurView
            intensity={compact ? 16 : 20}
            tint={isDarkMode ? 'dark' : 'light'}
            style={styles.blurOverlay}
          >
            <View style={styles.blurBadge}>
              <Ionicons name="sparkles-outline" size={Math.min(hp(1.7), wp(3.8))} color={colors.textOnPrimary} />
              <Text style={styles.blurBadgeText}>Unlock insight</Text>
            </View>
          </BlurView>
        </View>
      </View>
    </View>
  );
}

const getStyles = (colors: any, compact: boolean) => StyleSheet.create({
  card: {
    backgroundColor: colors.cardBackground,
    borderRadius: hp(1.8),
    borderWidth: 1,
    borderColor: colors.cardBorder || colors.border,
    padding: wp(4),
    overflow: 'hidden',
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: wp(2.5),
  },
  titleRow: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2.5),
  },
  iconWrap: {
    width: Math.min(hp(4.7), wp(10.4)),
    height: Math.min(hp(4.7), wp(10.4)),
    borderRadius: hp(1.4),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft || `${colors.primary}14`,
  },
  copyWrap: {
    flex: 1,
    minWidth: 0,
  },
  eyebrow: {
    color: colors.textSecondary,
    fontSize: Math.min(hp(1.08), wp(2.6)),
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  title: {
    color: colors.textPrimary,
    fontSize: Math.min(compact ? hp(1.82) : hp(2), compact ? wp(4.2) : wp(4.6)),
    fontWeight: '900',
    marginTop: hp(0.15),
  },
  ctaButton: {
    minHeight: hp(3.8),
    borderRadius: hp(1.2),
    paddingHorizontal: wp(2.8),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: wp(1),
    backgroundColor: colors.primary,
  },
  ctaText: {
    color: colors.textOnPrimary,
    fontSize: Math.min(hp(1.25), wp(2.95)),
    fontWeight: '900',
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: Math.min(hp(1.35), wp(3.18)),
    lineHeight: hp(2),
    fontWeight: '700',
    marginTop: hp(1.1),
  },
  previewPanel: {
    minHeight: compact ? hp(15) : hp(18),
    borderRadius: hp(1.6),
    borderWidth: 1,
    borderColor: colors.cardBorder || colors.border,
    backgroundColor: colors.surface || colors.screenColor,
    marginTop: hp(1.3),
    padding: wp(3),
    overflow: 'hidden',
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: wp(2),
  },
  previewLabel: {
    color: colors.textTertiary || colors.textSecondary,
    fontSize: Math.min(hp(1.02), wp(2.45)),
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  previewTitle: {
    color: colors.textPrimary,
    fontSize: Math.min(hp(1.5), wp(3.5)),
    fontWeight: '900',
    marginTop: hp(0.15),
  },
  lockPill: {
    minHeight: hp(2.8),
    borderRadius: hp(1.4),
    paddingHorizontal: wp(2.1),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: wp(0.8),
    backgroundColor: colors.primarySoft || `${colors.primary}14`,
  },
  lockText: {
    color: colors.primary,
    fontSize: Math.min(hp(1.05), wp(2.5)),
    fontWeight: '900',
  },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: wp(2),
    marginTop: hp(1.2),
  },
  metricCard: {
    flex: 1,
    minWidth: compact ? '30%' : '22%',
    minHeight: compact ? hp(7.4) : hp(8.2),
    borderRadius: hp(1.25),
    paddingHorizontal: wp(1.6),
    paddingVertical: hp(0.85),
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.cardBorder || colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricIcon: {
    width: Math.min(hp(3), wp(6.7)),
    height: Math.min(hp(3), wp(6.7)),
    borderRadius: hp(1.5),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: hp(0.45),
  },
  metricValue: {
    width: '100%',
    color: colors.textPrimary,
    fontSize: Math.min(hp(1.5), wp(3.5)),
    fontWeight: '900',
    textAlign: 'center',
  },
  metricLabel: {
    width: '100%',
    color: colors.textSecondary,
    fontSize: Math.min(hp(1), wp(2.35)),
    fontWeight: '800',
    textAlign: 'center',
    marginTop: hp(0.15),
  },
  bulletRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: wp(1.5),
    marginTop: hp(1.1),
  },
  bulletPill: {
    maxWidth: '100%',
    minHeight: hp(2.9),
    borderRadius: hp(1.45),
    paddingHorizontal: wp(2),
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(0.8),
    backgroundColor: colors.screenColor,
  },
  bulletText: {
    color: colors.textSecondary,
    fontSize: Math.min(hp(1), wp(2.4)),
    fontWeight: '800',
  },
  unlockRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: hp(1),
  },
  blurOverlay: {
    minHeight: hp(3.8),
    borderRadius: hp(1.9),
    overflow: 'hidden',
    backgroundColor: `${colors.primary}22`,
    maxWidth: '100%',
  },
  blurBadge: {
    minHeight: hp(3.8),
    paddingHorizontal: wp(2.7),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: wp(1),
    backgroundColor: `${colors.primary}CC`,
  },
  blurBadgeText: {
    color: colors.textOnPrimary,
    fontSize: Math.min(hp(1.12), wp(2.65)),
    fontWeight: '900',
  },
});

export default PremiumTeaserCard;
