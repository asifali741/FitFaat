import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

type ProgressRingProps = {
  progress: number;
  size?: number;
  strokeWidth?: number;
  color: string;
  trackColor: string;
  label?: string;
  value?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  textColor?: string;
  mutedTextColor?: string;
};

export function ProgressRing({
  progress,
  size = 104,
  strokeWidth = 10,
  color,
  trackColor,
  label,
  value,
  icon,
  textColor = '#111827',
  mutedTextColor = '#6B7280',
}: ProgressRingProps) {
  const animatedProgress = useRef(new Animated.Value(0)).current;
  const boundedProgress = Math.min(Math.max(progress || 0, 0), 1);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const contentInset = Math.max(strokeWidth + 6, size * 0.16);
  const contentSize = Math.max(size - contentInset * 2, size * 0.48);
  const iconSize = Math.max(16, Math.min(size * 0.18, contentSize * 0.32));
  const valueFontSize = Math.max(15, Math.min(size * 0.18, contentSize * 0.28));
  const labelFontSize = Math.max(8, Math.min(size * 0.085, contentSize * 0.16));

  useEffect(() => {
    Animated.timing(animatedProgress, {
      toValue: boundedProgress,
      duration: 650,
      useNativeDriver: false,
    }).start();
  }, [animatedProgress, boundedProgress]);

  const strokeDashoffset = animatedProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [circumference, 0],
  });

  return (
    <View style={[styles.container, { width: size, minHeight: size }]}>
      <Svg width={size} height={size}>
        <Circle
          stroke={trackColor}
          fill="none"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
        />
        <AnimatedCircle
          stroke={color}
          fill="none"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          rotation="-90"
          originX={size / 2}
          originY={size / 2}
        />
      </Svg>
      <View
        style={[
          styles.centerContent,
          {
            width: contentSize,
            height: contentSize,
            borderRadius: contentSize / 2,
            paddingHorizontal: Math.max(2, contentSize * 0.04),
          },
        ]}
      >
        {icon ? (
          <Ionicons name={icon} size={iconSize} color={color} />
        ) : null}
        {value ? (
          <Text
            style={[
              styles.value,
              {
                color: textColor,
                fontSize: valueFontSize,
                lineHeight: valueFontSize * 1.05,
              },
            ]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.72}
          >
            {value}
          </Text>
        ) : null}
        {label ? (
          <Text
            style={[
              styles.label,
              {
                color: mutedTextColor,
                fontSize: labelFontSize,
                lineHeight: labelFontSize * 1.08,
              },
            ]}
            numberOfLines={2}
            adjustsFontSizeToFit
            minimumFontScale={0.62}
          >
            {label}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerContent: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: {
    fontWeight: '800',
    marginTop: 2,
    letterSpacing: 0,
    textAlign: 'center',
    width: '100%',
    includeFontPadding: false,
  },
  label: {
    fontWeight: '700',
    marginTop: 2,
    letterSpacing: 0,
    textAlign: 'center',
    width: '100%',
    includeFontPadding: false,
  },
});

export default ProgressRing;
