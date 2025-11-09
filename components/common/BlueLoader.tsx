import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { heightPercentageToDP as hp } from 'react-native-responsive-screen';
import { useTheme } from '@/contexts/ThemeContext';

interface BlueLoaderProps {
  size?: 'small' | 'large';
  text?: string;
  fullScreen?: boolean;
  color?: string; // Optional color override
}

export default function BlueLoader({ 
  size = 'large', 
  text, 
  fullScreen = false,
  color
}: BlueLoaderProps) {
  const { colors, isDarkMode } = useTheme();
  // Use blue as primary color for consistency, but allow override
  const loaderColor = color || '#0066CC';
  const backgroundColor = isDarkMode ? colors.screenColor : '#FFFFFF';
  
  const loader = (
    <View style={styles.loaderContainer}>
      <ActivityIndicator 
        size={size} 
        color={loaderColor} 
        style={styles.spinner}
      />
      {text && (
        <Text style={[styles.loadingText, { color: loaderColor }]}>{text}</Text>
      )}
    </View>
  );

  if (fullScreen) {
    return (
      <View style={[styles.fullScreenContainer, { backgroundColor }]}>
        {loader}
      </View>
    );
  }

  return loader;
}

const styles = StyleSheet.create({
  fullScreenContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  loaderContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  spinner: {
    transform: [{ scale: 1.2 }],
  },
  loadingText: {
    marginTop: hp(2),
    fontSize: 16,
    fontWeight: '500',
  },
});