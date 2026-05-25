/**
 * Centralized Theme Configuration
 * Healthcare-focused color palette and design tokens
 */

import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from 'react-native-responsive-screen';

const BASE_WIDTH = 375;
const BASE_HEIGHT = 812;

const rw = (value: number) => wp((value / BASE_WIDTH) * 100);
const rh = (value: number) => hp((value / BASE_HEIGHT) * 100);
const rs = (value: number) => Math.round(Math.min(rw(value), rh(value)));
const rf = (value: number, min = 10, max = 34) =>
  Math.round(Math.min(Math.max(rs(value), min), max));

export const theme = {
  colors: {
    // Primary Colors - Professional Health App Palette
    primary: '#0891B2',        // Trustworthy Teal (Medical, Professional)
    secondary: '#10B981',      // Vital Green (Health, Wellness)
    accent: '#06B6D4',         // Energetic Cyan (CTAs, Highlights)
    
    // Backgrounds
    white: '#FFFFFF',
    black: '#000000',
    background: '#F8FAFC',     // Soft Off-White
    surface: '#FFFFFF',        // Card backgrounds
    screenColor: '#FFFFFF',    // Screen background (Clean White)
    cardBackground: '#FFFFFF', // Card/Item backgrounds
    offWhite: '#F1F5F9',       // Subtle backgrounds
    
    // Text
    textPrimary: '#0F172A',    // Deep Slate (High Contrast)
    textSecondary: '#64748B',  // Slate Gray (Readable)
    textTertiary: '#94A3B8',   // Light Slate (Subtle)
    textOnPrimary: '#FFFFFF',  // White text on primary
    textLight: '#94A3B8',      // Light text
    buttonText: '#FFFFFF',     // Button text
    
    // Semantic Colors
    success: '#10B981',        // Healthy Green
    warning: '#F59E0B',       // Amber Warning
    error: '#EF4444',          // Alert Red
    info: '#0891B2',           // Info Teal
    
    // Chart & Data Visualization
    chartProtein: '#10B981',   // Green for Protein
    chartCarbs: '#0891B2',      // Teal for Carbs
    chartFat: '#F59E0B',        // Amber for Fat
    chartCalories: '#F97316',  // Orange for Calories
    
    // UI Elements
    border: '#E2E8F0',          // Subtle Border
    divider: '#E2E8F0',         // Divider
    disabled: '#CBD5E1',        // Disabled State
    lightGray: '#F1F5F9',       // Light Gray Background
    gray: '#94A3B8',            // Medium Gray
    primarySoft: '#E0F2FE',     // Soft Teal Background
    
    // Status Colors
    statusActive: '#10B981',    // Active Green
    statusPending: '#F59E0B',   // Pending Amber
    statusCancelled: '#EF4444', // Cancelled Red
    statusConfirmed: '#10B981', // Confirmed Green
    finishedStatus: '#10B981',   // Finished/Completed
    lockedStatus: '#94A3B8',     // Locked State
    
    // Chat Backgrounds
    chatDoctor: '#E0F2FE',      // Light Teal (Doctor messages)
    chatUser: '#D1FAE5',        // Light Green (User messages)
    
    // Additional Backgrounds
    backgroundHeader: '#F0F9FF', // Soft Teal Header
    backgroundHighlight: '#F0F9FF', // Highlight Background
  },
  
  typography: {
    // Font Families
    fontFamily: {
      regular: 'System',
      medium: 'System',
      semiBold: 'System',
      bold: 'System',
    },
    
    // Font Sizes
    fontSize: {
      xs: rf(12, 10, 13),
      sm: rf(14, 11, 15),
      base: rf(16, 12, 17),
      lg: rf(18, 14, 20),
      xl: rf(20, 16, 22),
      xxl: rf(24, 18, 26),
      xxxl: rf(32, 24, 34),
    },
    
    // Font Weights
    fontWeight: {
      regular: '400' as const,
      medium: '500' as const,
      semiBold: '600' as const,
      bold: '700' as const,
    },
    
    // Line Heights
    lineHeight: {
      tight: 1.2,
      normal: 1.5,
      relaxed: 1.75,
    },
  },
  
  spacing: {
    xs: rs(4),
    sm: rs(8),
    md: rs(12),
    lg: rs(16),
    xl: rs(24),
    xxl: rs(32),
    xxxl: rs(48),
  },
  
  borderRadius: {
    small: rs(8),
    medium: rs(12),
    large: rs(16),
    xl: rs(20),
    full: 9999,
  },
  
  shadows: {
    small: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: rs(1) },
      shadowOpacity: 0.1,
      shadowRadius: rs(2),
      elevation: 2,
    },
    medium: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: rs(2) },
      shadowOpacity: 0.15,
      shadowRadius: rs(4),
      elevation: 4,
    },
    large: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: rs(4) },
      shadowOpacity: 0.2,
      shadowRadius: rs(8),
      elevation: 8,
    },
  },
  
  // Component-specific tokens
  components: {
    button: {
      height: {
        small: rh(36),
        medium: rh(44),
        large: rh(52),
      },
      paddingHorizontal: {
        small: rw(12),
        medium: rw(16),
        large: rw(24),
      },
    },
    input: {
      height: rh(48),
      borderWidth: 1,
      paddingHorizontal: rw(16),
    },
    card: {
      padding: rs(16),
      borderRadius: rs(12),
    },
  },
};

// Type exports for TypeScript
export type Theme = typeof theme;
export type ThemeColors = typeof theme.colors;
export type ThemeSpacing = typeof theme.spacing;
