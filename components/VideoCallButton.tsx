import { theme } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { ActivityIndicator, StyleSheet, TouchableOpacity } from 'react-native';

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
  size = 26 
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
    width: 44,
    height: 44,
    borderRadius: 22,
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
