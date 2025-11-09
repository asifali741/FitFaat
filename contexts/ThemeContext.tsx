import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme } from 'react-native';

interface ThemeContextType {
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  colors: typeof lightColors;
}

const lightColors = {
  // Primary Green Theme
  primary: "#26867C",
  primaryLight: "#4CAF50",
  primaryDark: "#1B5E20",
  primarySoft: "#E8F5E8",
  
  // Secondary Colors
  secondary: "#2E7D32",
  accent: "#66BB6A",
  success: "#4CAF50",
  warning: "#FF9800",
  error: "#F44336",
  info: "#2196F3",
  
  // Neutrals
  white: "#FFFFFF",
  offWhite: "#FAFAFA",
  lightGray: "#F5F5F5",
  gray: "#E0E0E0",
  darkGray: "#9E9E9E",
  charcoal: "#424242",
  black: "#000000",
  
  // App Specific Colors
  background: "#26867C",
  screenColor: "#FFFFFF",
  cardBackground: "#FFFFFF",
  cardBorder: "#E8F5E8",
  
  // Text Colors
  textPrimary: "#2C3E50",
  textSecondary: "#7F8C8D",
  textLight: "#BDC3C7",
  textOnPrimary: "#FFFFFF",
  textOnCard: "#2C3E50",
  
  // Button Colors
  buttonPrimary: "#26867C",
  buttonSecondary: "#4CAF50",
  buttonSuccess: "#2E7D32",
  buttonDanger: "#F44336",
  buttonText: "#FFFFFF",
  
  // Drawer Colors
  drawerBackground: "#26867C",
  drawerActiveTabColor: "#4CAF50",
  drawerTintColor: "#FFFFFF",
  
  // Status Colors
  activeStatus: "#4CAF50",
  finishedStatus: "#2E7D32",
  lockedStatus: "#9E9E9E",
  
  // Progress Colors
  progressBarColor: "#4CAF50",
  progressBackground: "#E8F5E8",
  
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
  // Primary Green Theme (adjusted for dark mode)
  primary: "#26867C",
  primaryLight: "#388E3C",
  primaryDark: "#1B5E20",
  primarySoft: "#263238",
  
  // Secondary Colors
  secondary: "#1B5E20",
  accent: "#4CAF50",
  success: "#388E3C",
  warning: "#F57C00",
  error: "#D32F2F",
  info: "#1976D2",
  
  // Neutrals
  white: "#121212",
  offWhite: "#1E1E1E",
  lightGray: "#2C2C2C",
  gray: "#404040",
  darkGray: "#757575",
  charcoal: "#BDBDBD",
  black: "#FFFFFF",
  
  // App Specific Colors
  background: "#1A1A1A",
  screenColor: "#121212",
  cardBackground: "#1E1E1E",
  cardBorder: "#2C2C2C",
  
  // Text Colors
  textPrimary: "#FFFFFF",
  textSecondary: "#B0B0B0",
  textLight: "#757575",
  textOnPrimary: "#FFFFFF",
  textOnCard: "#FFFFFF",
  
  // Button Colors
  buttonPrimary: "#1F6B62",
  buttonSecondary: "#388E3C",
  buttonSuccess: "#2E7D32",
  buttonDanger: "#D32F2F",
  buttonText: "#FFFFFF",
  
  // Drawer Colors
  drawerBackground: "#1E1E1E",
  drawerActiveTabColor: "#2E7D32",
  drawerTintColor: "#FFFFFF",
  
  // Status Colors
  activeStatus: "#388E3C",
  finishedStatus: "#2E7D32",
  lockedStatus: "#616161",
  
  // Progress Colors
  progressBarColor: "#388E3C",
  progressBackground: "#1A3A37",
  
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