import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from 'react-native-responsive-screen';

interface ChatButtonProps {
  appointmentId: string;
  style?: any;
  size?: 'small' | 'medium' | 'large';
}

export default function ChatButton({ appointmentId, style, size = 'medium' }: ChatButtonProps) {
  const router = useRouter();
  const { colors } = useTheme();

  const handlePress = () => {
    router.push({
      pathname: '/(main)/(conference)/appointment-chat',
      params: { appointmentId }
    });
  };

  const buttonSize = {
    small: { width: wp(26.7), height: hp(4.4), fontSize: Math.min(hp(1.7), wp(3.7)), iconSize: Math.min(hp(2.2), wp(4.8)) },
    medium: { width: wp(32), height: hp(5.4), fontSize: Math.min(hp(2), wp(4.3)), iconSize: Math.min(hp(2.5), wp(5.4)) },
    large: { width: wp(37.3), height: hp(6.4), fontSize: Math.min(hp(2.2), wp(4.8)), iconSize: Math.min(hp(3), wp(6.4)) }
  }[size];

  return (
    <TouchableOpacity 
      style={[styles.button, { width: buttonSize.width, height: buttonSize.height, backgroundColor: colors.primary }, style]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <Ionicons name="chatbubbles" size={buttonSize.iconSize} color={colors.textOnPrimary} />
      <Text style={[styles.buttonText, { fontSize: buttonSize.fontSize, color: colors.textOnPrimary }]}>Chat</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: wp(2.1),
    paddingHorizontal: wp(3.2),
    gap: wp(1.6)
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonError: {
    opacity: 0.8,
  },
  buttonText: {
    fontWeight: '600'
  }
});
