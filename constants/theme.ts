/**
 * Centralized Theme Configuration
 * Healthcare-focused color palette and design tokens
 */

export const theme = {
  colors: {
    // Primary Colors - Professional Health App Palette
    primary: '#0891B2',        // Trustworthy Teal (Medical, Professional)
    secondary: '#10B981',      // Vital Green (Health, Wellness)
    accent: '#06B6D4',         // Energetic Cyan (CTAs, Highlights)
    
    // Backgrounds
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
      xs: 12,
      sm: 14,
      base: 16,
      lg: 18,
      xl: 20,
      xxl: 24,
      xxxl: 32,
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
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    xxl: 32,
    xxxl: 48,
  },
  
  borderRadius: {
    small: 8,
    medium: 12,
    large: 16,
    xl: 20,
    full: 9999,
  },
  
  shadows: {
    small: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 2,
    },
    medium: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 4,
      elevation: 4,
    },
    large: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 8,
    },
  },
  
  // Component-specific tokens
  components: {
    button: {
      height: {
        small: 36,
        medium: 44,
        large: 52,
      },
      paddingHorizontal: {
        small: 12,
        medium: 16,
        large: 24,
      },
    },
    input: {
      height: 48,
      borderWidth: 1,
      paddingHorizontal: 16,
    },
    card: {
      padding: 16,
      borderRadius: 12,
    },
  },
};

// Type exports for TypeScript
export type Theme = typeof theme;
export type ThemeColors = typeof theme.colors;
export type ThemeSpacing = typeof theme.spacing;
