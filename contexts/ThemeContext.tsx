import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme } from 'react-native';

interface ThemeContextType {
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  colors: typeof lightColors;
}

const lightColors = {
  // Primary Professional Health Theme
  primary: "#0891B2",          // Trustworthy Teal
  primaryLight: "#06B6D4",     // Light Teal
  primaryDark: "#0E7490",      // Dark Teal
  primarySoft: "#E0F2FE",      // Soft Teal Background
  
  // Secondary Colors
  secondary: "#10B981",         // Vital Green
  accent: "#06B6D4",           // Energetic Cyan
  success: "#10B981",          // Success Green
  warning: "#F59E0B",          // Warning Amber
  error: "#EF4444",            // Error Red
  info: "#0891B2",             // Info Teal
  
  // Neutrals
  white: "#FFFFFF",
  offWhite: "#FAFAFA",
  lightGray: "#F5F5F5",
  gray: "#E0E0E0",
  darkGray: "#9E9E9E",
  charcoal: "#424242",
  black: "#000000",
  
  // App Specific Colors
  background: "#0891B2",       // Primary Background
  screenColor: "#FFFFFF",      // Clean White Screen
  cardBackground: "#FFFFFF",   // White Cards
  cardBorder: "#E2E8F0",        // Subtle Border
  
  // Text Colors
  textPrimary: "#0F172A",       // Deep Slate
  textSecondary: "#64748B",     // Slate Gray
  textLight: "#94A3B8",         // Light Slate
  textOnPrimary: "#FFFFFF",     // White on Primary
  textOnCard: "#0F172A",        // Dark on Cards
  
  // Button Colors
  buttonPrimary: "#0891B2",     // Primary Teal
  buttonSecondary: "#10B981",   // Secondary Green
  buttonSuccess: "#10B981",     // Success Green
  buttonDanger: "#EF4444",      // Danger Red
  buttonText: "#FFFFFF",        // White Text
  
  // Drawer Colors
  drawerBackground: "#0891B2",  // Teal Drawer
  drawerActiveTabColor: "#10B981", // Active Green
  drawerTintColor: "#FFFFFF",    // White Tint
  
  // Status Colors
  activeStatus: "#10B981",      // Active Green
  finishedStatus: "#10B981",    // Finished Green
  lockedStatus: "#94A3B8",      // Locked Gray
  
  // Progress Colors
  progressBarColor: "#10B981",  // Green Progress
  progressBackground: "#E0F2FE", // Soft Teal Background
  
  // Shadow Colors
  shadowLight: "#E8F5E8",
  shadowMedium: "#26867C",
  shadowDark: "#1B5E20",
  
  // Special Colors
  logoutBtnColor: "#F44336",
  logoutBtnTextColor: "#FFFFFF",
  activeDayShadowColor: "#26867C",
};

const darkColors = {
  // Primary Professional Health Theme (Dark Mode)
  primary: "#06B6D4",           // Bright Cyan (Dark Mode)
  primaryLight: "#22D3EE",      // Light Cyan
  primaryDark: "#0891B2",       // Dark Teal
  primarySoft: "#1E293B",       // Dark Slate Background
  
  // Secondary Colors
  secondary: "#10B981",         // Vital Green
  accent: "#22D3EE",           // Bright Cyan Accent
  success: "#10B981",          // Success Green
  warning: "#F59E0B",          // Warning Amber
  error: "#EF4444",            // Error Red
  info: "#06B6D4",             // Info Cyan
  
  // Neutrals
  white: "#121212",
  offWhite: "#1E1E1E",
  lightGray: "#2C2C2C",
  gray: "#404040",
  darkGray: "#757575",
  charcoal: "#BDBDBD",
  black: "#FFFFFF",
  
  // App Specific Colors
  background: "#0F172A",       // Deep Slate Background
  screenColor: "#0F172A",     // Dark Slate Screen
  cardBackground: "#1E293B",   // Slate Card Background
  cardBorder: "#334155",       // Slate Border
  
  // Text Colors
  textPrimary: "#F1F5F9",      // Light Slate Text
  textSecondary: "#94A3B8",     // Medium Slate
  textLight: "#64748B",         // Dark Slate
  textOnPrimary: "#FFFFFF",     // White on Primary
  textOnCard: "#F1F5F9",        // Light on Cards
  
  // Button Colors
  buttonPrimary: "#06B6D4",     // Bright Cyan
  buttonSecondary: "#10B981",   // Green
  buttonSuccess: "#10B981",     // Success Green
  buttonDanger: "#EF4444",      // Danger Red
  buttonText: "#FFFFFF",        // White Text
  
  // Drawer Colors
  drawerBackground: "#0F172A", // Dark Slate Drawer
  drawerActiveTabColor: "#10B981", // Active Green
  drawerTintColor: "#F1F5F9",    // Light Tint
  
  // Status Colors
  activeStatus: "#10B981",      // Active Green
  finishedStatus: "#10B981",    // Finished Green
  lockedStatus: "#64748B",      // Locked Slate
  
  // Progress Colors
  progressBarColor: "#10B981",  // Green Progress
  progressBackground: "#1E293B", // Dark Slate Background
  
  // Shadow Colors
  shadowLight: "#000000",
  shadowMedium: "#000000",
  shadowDark: "#000000",
  
  // Special Colors
  logoutBtnColor: "#D32F2F",
  logoutBtnTextColor: "#FFFFFF",
  activeDayShadowColor: "#000000",
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load theme preference from AsyncStorage
  useEffect(() => {
    const loadThemePreference = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem('theme_preference');
        if (savedTheme !== null) {
          setIsDarkMode(savedTheme === 'dark');
        } else {
          // Use system preference if no saved preference
          setIsDarkMode(systemColorScheme === 'dark');
        }
      } catch (error) {
        console.error('Error loading theme preference:', error);
        setIsDarkMode(systemColorScheme === 'dark');
      } finally {
        setIsLoading(false);
      }
    };

    loadThemePreference();
  }, [systemColorScheme]);

  // Save theme preference to AsyncStorage
  const toggleDarkMode = async () => {
    try {
      const newMode = !isDarkMode;
      setIsDarkMode(newMode);
      await AsyncStorage.setItem('theme_preference', newMode ? 'dark' : 'light');
    } catch (error) {
      console.error('Error saving theme preference:', error);
    }
  };

  const colors = isDarkMode ? darkColors : lightColors;

  if (isLoading) {
    return null; // Or a loading component
  }

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleDarkMode, colors }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};