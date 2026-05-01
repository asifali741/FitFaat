import { theme } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { ActivityIndicator, StyleSheet, TouchableOpacity } from 'react-native';
import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from 'react-native-responsive-screen';

interface VideoCallButtonProps {
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  size?: number;
}

export default function VideoCallButton({ 
  onPress, 
  disabled = false, 
  loading = false,
  size = Math.min(hp(3.2), wp(6.9))
}: VideoCallButtonProps) {
  return (
    <TouchableOpacity
      style={[styles.button, disabled && styles.buttonDisabled]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator size="small" color={theme.colors.surface} />
      ) : (
        <Ionicons 
          name="videocam" 
          size={size} 
          color={disabled ? theme.colors.textTertiary : theme.colors.surface} 
        />
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    width: Math.min(hp(5.4), wp(11.7)),
    height: Math.min(hp(5.4), wp(11.7)),
    borderRadius: Math.min(hp(2.7), wp(5.9)),
    backgroundColor: theme.colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.sm,
  },
  buttonDisabled: {
    backgroundColor: theme.colors.disabled,
    opacity: 0.5,
  },
});
