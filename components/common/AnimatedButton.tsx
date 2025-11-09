import React from 'react';
import { TouchableOpacity, TouchableOpacityProps, ViewStyle, TextStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export type AnimationType = 
  | 'scale'           // Simple scale down and up
  | 'bounce'          // Bouncy scale effect
  | 'shake'           // Horizontal shake
  | 'pulse'           // Pulsing scale
  | 'rotate'          // Rotate on press
  | 'slideLeft'       // Slide left (for back buttons)
  | 'slideRight'      // Slide right
  | 'press'           // Scale down only
  | 'pop'             // Pop out effect
  | 'wiggle';         // Wiggle rotation

interface AnimatedButtonProps extends TouchableOpacityProps {
  animationType?: AnimationType;
  children: React.ReactNode;
  onPress?: () => void;
  style?: ViewStyle | ViewStyle[];
  disabled?: boolean;
  haptic?: boolean;
}

export default function AnimatedButton({
  animationType = 'scale',
  children,
  onPress,
  style,
  disabled = false,
  haptic = false,
  ...props
}: AnimatedButtonProps) {
  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const rotate = useSharedValue(0);

  const handlePress = () => {
    if (disabled) return;

    // Trigger haptic feedback if enabled
    if (haptic && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(10);
    }

    switch (animationType) {
      case 'scale':
        scale.value = withSequence(
          withSpring(0.95, { damping: 10, stiffness: 400 }),
          withSpring(1, { damping: 10, stiffness: 400 })
        );
        break;

      case 'bounce':
        scale.value = withSequence(
          withSpring(0.9, { damping: 10, stiffness: 400 }),
          withSpring(1.1, { damping: 8, stiffness: 300 }),
          withSpring(1, { damping: 10, stiffness: 400 })
        );
        break;

      case 'shake':
        translateX.value = withSequence(
          withSpring(-5, { damping: 10, stiffness: 500 }),
          withSpring(5, { damping: 10, stiffness: 500 }),
          withSpring(-5, { damping: 10, stiffness: 500 }),
          withSpring(0, { damping: 10, stiffness: 500 })
        );
        break;

      case 'pulse':
        scale.value = withSequence(
          withSpring(1.1, { damping: 8, stiffness: 300 }),
          withSpring(1, { damping: 10, stiffness: 400 })
        );
        break;

      case 'rotate':
        scale.value = withSequence(
          withSpring(0.95, { damping: 10, stiffness: 400 }),
          withSpring(1, { damping: 10, stiffness: 400 })
        );
        rotate.value = withSequence(
          withTiming(10, { duration: 100, easing: Easing.ease }),
          withTiming(-10, { duration: 100, easing: Easing.ease }),
          withTiming(0, { duration: 100, easing: Easing.ease })
        );
        break;

      case 'slideLeft':
        scale.value = withSequence(
          withSpring(0.95, { damping: 10, stiffness: 400 }),
          withSpring(1, { damping: 10, stiffness: 400 })
        );
        translateX.value = withSequence(
          withSpring(-8, { damping: 10, stiffness: 400 }),
          withSpring(0, { damping: 10, stiffness: 400 })
        );
        break;

      case 'slideRight':
        scale.value = withSequence(
          withSpring(0.95, { damping: 10, stiffness: 400 }),
          withSpring(1, { damping: 10, stiffness: 400 })
        );
        translateX.value = withSequence(
          withSpring(8, { damping: 10, stiffness: 400 }),
          withSpring(0, { damping: 10, stiffness: 400 })
        );
        break;

      case 'press':
        scale.value = withSequence(
          withSpring(0.9, { damping: 10, stiffness: 400 }),
          withSpring(1, { damping: 10, stiffness: 400 })
        );
        break;

      case 'pop':
        scale.value = withSequence(
          withSpring(0.85, { damping: 8, stiffness: 300 }),
          withSpring(1.15, { damping: 8, stiffness: 300 }),
          withSpring(1, { damping: 10, stiffness: 400 })
        );
        break;

      case 'wiggle':
        scale.value = withSequence(
          withSpring(0.95, { damping: 10, stiffness: 400 }),
          withSpring(1, { damping: 10, stiffness: 400 })
        );
        rotate.value = withSequence(
          withSpring(5, { damping: 10, stiffness: 400 }),
          withSpring(-5, { damping: 10, stiffness: 400 }),
          withSpring(0, { damping: 10, stiffness: 400 })
        );
        break;

      default:
        scale.value = withSequence(
          withSpring(0.95, { damping: 10, stiffness: 400 }),
          withSpring(1, { damping: 10, stiffness: 400 })
        );
    }

    // Call the original onPress after a short delay
    setTimeout(() => {
      onPress?.();
    }, 50);
  };

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { scale: scale.value },
        { translateX: translateX.value },
        { translateY: translateY.value },
        { rotate: `${rotate.value}deg` },
      ],
    };
  });

  return (
    <AnimatedTouchable
      {...props}
      onPress={handlePress}
      disabled={disabled}
      style={[style, animatedStyle]}
      activeOpacity={0.8}
    >
      {children}
    </AnimatedTouchable>
  );
}

// Preset button variants for common use cases
export const AnimatedBackButton = (props: Omit<AnimatedButtonProps, 'animationType'>) => (
  <AnimatedButton {...props} animationType="slideLeft" />
);

export const AnimatedSubmitButton = (props: Omit<AnimatedButtonProps, 'animationType'>) => (
  <AnimatedButton {...props} animationType="pop" />
);

export const AnimatedActionButton = (props: Omit<AnimatedButtonProps, 'animationType'>) => (
  <AnimatedButton {...props} animationType="bounce" />
);

export const AnimatedIconButton = (props: Omit<AnimatedButtonProps, 'animationType'>) => (
  <AnimatedButton {...props} animationType="scale" />
);
