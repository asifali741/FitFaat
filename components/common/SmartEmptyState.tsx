import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from 'react-native-responsive-screen';
import AnimatedPressable from './AnimatedPressable';

type SmartEmptyStateProps = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  message: string;
  colors: any;
  actionLabel?: string;
  onAction?: () => void;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function SmartEmptyState({
  icon,
  title,
  message,
  colors,
  actionLabel,
  onAction,
  compact = false,
  style,
}: SmartEmptyStateProps) {
  const iconSize = compact ? Math.min(hp(4), wp(8.8)) : Math.min(hp(5.8), wp(12.8));

  return (
    <View
      style={[
        styles.container,
        compact && styles.containerCompact,
        {
          backgroundColor: colors.cardBackground || colors.surface,
          borderColor: colors.cardBorder || colors.border,
        },
        style,
      ]}
    >
      <View
        style={[
          styles.illustration,
          compact && styles.illustrationCompact,
          {
            backgroundColor: `${colors.primary}12`,
            borderColor: `${colors.primary}24`,
          },
        ]}
      >
        <Ionicons name={icon} size={iconSize} color={colors.primary} />
        <View style={[styles.illustrationLine, { backgroundColor: `${colors.primary}24` }]} />
        <View style={[styles.illustrationLineShort, { backgroundColor: `${colors.primary}1A` }]} />
      </View>

      <Text
        style={[
          styles.title,
          compact && styles.titleCompact,
          { color: colors.textPrimary },
        ]}
        numberOfLines={2}
        adjustsFontSizeToFit
      >
        {title}
      </Text>
      <Text
        style={[
          styles.message,
          compact && styles.messageCompact,
          { color: colors.textSecondary },
        ]}
      >
        {message}
      </Text>

      {actionLabel && onAction ? (
        <AnimatedPressable
          style={[styles.actionButton, { backgroundColor: colors.primary }]}
          onPress={onAction}
          activeScale={0.96}
        >
          <Text style={[styles.actionText, { color: colors.textOnPrimary }]}>
            {actionLabel}
          </Text>
        </AnimatedPressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: hp(1.8),
    paddingHorizontal: wp(6),
    paddingVertical: hp(4),
  },
  containerCompact: {
    paddingHorizontal: wp(4),
    paddingVertical: hp(2.4),
  },
  illustration: {
    width: Math.min(hp(12), wp(28)),
    height: Math.min(hp(12), wp(28)),
    borderRadius: hp(2),
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: hp(2),
    overflow: 'hidden',
  },
  illustrationCompact: {
    width: Math.min(hp(9), wp(21)),
    height: Math.min(hp(9), wp(21)),
    marginBottom: hp(1.4),
  },
  illustrationLine: {
    position: 'absolute',
    bottom: hp(1.5),
    width: '48%',
    height: hp(0.45),
    borderRadius: hp(0.25),
  },
  illustrationLineShort: {
    position: 'absolute',
    bottom: hp(2.45),
    width: '28%',
    height: hp(0.4),
    borderRadius: hp(0.25),
  },
  title: {
    fontSize: hp(2.05),
    fontWeight: '900',
    letterSpacing: 0,
    textAlign: 'center',
    marginBottom: hp(0.8),
  },
  titleCompact: {
    fontSize: hp(1.8),
  },
  message: {
    fontSize: hp(1.55),
    fontWeight: '600',
    lineHeight: hp(2.25),
    textAlign: 'center',
  },
  messageCompact: {
    fontSize: hp(1.4),
    lineHeight: hp(2),
  },
  actionButton: {
    marginTop: hp(2),
    minHeight: hp(4.6),
    borderRadius: hp(1.4),
    paddingHorizontal: wp(5),
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: {
    fontSize: hp(1.55),
    fontWeight: '900',
    letterSpacing: 0,
  },
});

export default SmartEmptyState;
