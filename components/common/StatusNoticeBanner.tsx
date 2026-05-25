import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from 'react-native-responsive-screen';
import AnimatedPressable from './AnimatedPressable';

type NoticeTone = 'offline' | 'cached' | 'error' | 'info' | 'success';

type StatusNoticeBannerProps = {
  tone?: NoticeTone;
  title: string;
  message: string;
  colors: any;
  actionLabel?: string;
  onAction?: () => void;
  style?: StyleProp<ViewStyle>;
};

const getNoticeIcon = (tone: NoticeTone) => {
  switch (tone) {
    case 'offline':
      return 'cloud-offline-outline';
    case 'cached':
      return 'file-tray-stacked-outline';
    case 'error':
      return 'warning-outline';
    case 'success':
      return 'checkmark-circle-outline';
    default:
      return 'information-circle-outline';
  }
};

const getToneColor = (tone: NoticeTone, colors: any) => {
  switch (tone) {
    case 'offline':
      return colors.warning || '#F59E0B';
    case 'cached':
      return colors.info || colors.primary;
    case 'error':
      return colors.error || '#EF4444';
    case 'success':
      return colors.success || '#10B981';
    default:
      return colors.primary;
  }
};

export function StatusNoticeBanner({
  tone = 'info',
  title,
  message,
  colors,
  actionLabel,
  onAction,
  style,
}: StatusNoticeBannerProps) {
  const toneColor = getToneColor(tone, colors);

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: `${toneColor}12`,
          borderColor: `${toneColor}38`,
        },
        style,
      ]}
    >
      <View style={[styles.iconWrap, { backgroundColor: `${toneColor}18` }]}>
        <Ionicons name={getNoticeIcon(tone)} size={Math.min(hp(2.5), wp(5.5))} color={toneColor} />
      </View>
      <View style={styles.copy}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
        <Text style={[styles.message, { color: colors.textSecondary }]}>{message}</Text>
      </View>
      {actionLabel && onAction ? (
        <AnimatedPressable style={[styles.action, { backgroundColor: toneColor }]} onPress={onAction}>
          <Text style={[styles.actionText, { color: colors.textOnPrimary }]}>{actionLabel}</Text>
        </AnimatedPressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: hp(1.6),
    paddingHorizontal: wp(3),
    paddingVertical: hp(1.15),
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2.4),
  },
  iconWrap: {
    width: Math.min(hp(4.4), wp(9.8)),
    height: Math.min(hp(4.4), wp(9.8)),
    borderRadius: Math.min(hp(2.2), wp(4.9)),
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: Math.min(hp(1.5), wp(3.4)),
    fontWeight: '900',
    marginBottom: hp(0.25),
  },
  message: {
    fontSize: Math.min(hp(1.25), wp(2.9)),
    fontWeight: '700',
    lineHeight: hp(1.75),
  },
  action: {
    minHeight: hp(3.8),
    borderRadius: hp(1.2),
    paddingHorizontal: wp(3),
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: {
    fontSize: Math.min(hp(1.25), wp(2.9)),
    fontWeight: '900',
  },
});

export default StatusNoticeBanner;
