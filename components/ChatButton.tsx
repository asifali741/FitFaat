import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useChatAccess } from '../hooks/useChatAccess';

interface ChatButtonProps {
  appointmentId: string;
  style?: any;
  size?: 'small' | 'medium' | 'large';
}

export default function ChatButton({ appointmentId, style, size = 'medium' }: ChatButtonProps) {
  const router = useRouter();

  const handlePress = () => {
    router.push({
      pathname: '/(main)/(conference)/appointment-chat',
      params: { appointmentId }
    });
  };

  const buttonSize = {
    small: { width: 100, height: 36, fontSize: 14, iconSize: 18 },
    medium: { width: 120, height: 44, fontSize: 16, iconSize: 20 },
    large: { width: 140, height: 52, fontSize: 18, iconSize: 24 }
  }[size];

  return (
    <TouchableOpacity 
      style={[styles.button, { width: buttonSize.width, height: buttonSize.height }, style]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <Ionicons name="chatbubbles" size={buttonSize.iconSize} color="#FFF" />
      <Text style={[styles.buttonText, { fontSize: buttonSize.fontSize }]}>Chat</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingHorizontal: 12,
    gap: 6
  },
  buttonDisabled: {
    backgroundColor: '#CCC'
  },
  buttonError: {
    backgroundColor: '#FF9500'
  },
  buttonText: {
    color: '#FFF',
    fontWeight: '600'
  }
});
