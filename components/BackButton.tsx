import React from 'react';
import { TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';

type BackButtonProps = {
  style?: any;
  size?: number;
  color?: string;
  onPress?: () => void;
  testID?: string;
};

export default function BackButton({ style, size = 24, color, onPress, testID }: BackButtonProps) {
  const navigation = useNavigation();
  const router = useRouter();
  const { colors } = useTheme();

  const handlePress = () => {
    if (onPress) return onPress();

    try {
      // Prefer React Navigation's stack goBack when possible
      // @ts-ignore canGoBack may exist on some navigation objects
      if (navigation && typeof (navigation as any).canGoBack === 'function' && (navigation as any).canGoBack()) {
        (navigation as any).goBack();
        return;
      }
    } catch (e) {
      // ignore
    }

    try {
      router.back();
    } catch (e) {
      // last resort: navigate to dashboard
      try {
        router.replace('/(main)/(dashboard)');
      } catch (err) {
        // ignore
      }
    }
  };

  return (
    <TouchableOpacity onPress={handlePress} style={style} testID={testID}>
      <Ionicons name="arrow-back" size={size} color={color || colors.textPrimary} />
    </TouchableOpacity>
  );
}
