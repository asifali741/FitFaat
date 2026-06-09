import React, { useCallback, useRef } from 'react';
import {
  AccessibilityRole,
  Animated,
  GestureResponderEvent,
  Pressable,
  StyleProp,
  ViewStyle,
} from 'react-native';

const AnimatedPressableBase = Animated.createAnimatedComponent(Pressable);

type AnimatedPressableProps = {
  children: React.ReactNode;
  onPress?: (event: GestureResponderEvent) => void;
  onPressIn?: (event: GestureResponderEvent) => void;
  onPressOut?: (event: GestureResponderEvent) => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  activeScale?: number;
  pressOpacity?: number;
  accessibilityRole?: AccessibilityRole;
  accessibilityLabel?: string;
  testID?: string;
};

export function AnimatedPressable({
  children,
  onPress,
  onPressIn,
  onPressOut,
  disabled = false,
  style,
  activeScale = 0.97,
  pressOpacity = 0.86,
  accessibilityRole = 'button',
  accessibilityLabel,
  testID,
}: AnimatedPressableProps) {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  const animateTo = useCallback(
    (nextScale: number, nextOpacity: number) => {
      Animated.parallel([
        Animated.spring(scale, {
          toValue: nextScale,
          friction: 8,
          tension: 130,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: nextOpacity,
          duration: 110,
          useNativeDriver: true,
        }),
      ]).start();
    },
    [opacity, scale]
  );

  const handlePressIn = (event: GestureResponderEvent) => {
    if (!disabled) {
      animateTo(activeScale, pressOpacity);
    }
    onPressIn?.(event);
  };

  const handlePressOut = (event: GestureResponderEvent) => {
    animateTo(1, 1);
    onPressOut?.(event);
  };

  return (
    <AnimatedPressableBase
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      testID={testID}
      style={[
        style,
        {
          opacity: disabled ? 0.55 : opacity,
          transform: [{ scale }],
        },
      ]}
    >
      {children}
    </AnimatedPressableBase>
  );
}

export default AnimatedPressable;
