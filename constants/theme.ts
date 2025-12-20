/**
 * Centralized Theme Configuration
 * Healthcare-focused color palette and design tokens
 */

export const theme = {
  colors: {
    // Primary Colors
    primary: '#2E86AB',        // Medical Blue
    secondary: '#4CAF50',      // Healthy Green
    accent: '#22C55E',         // Fresh Green (CTA)
    
    // Backgrounds
    background: '#F8FAFC',     // Soft Off-White
    surface: '#FFFFFF',        // Card backgrounds
    
    // Text
    textPrimary: '#1F2933',    // Dark Gray
    textSecondary: '#6B7280',  // Medium Gray
    textTertiary: '#9CA3AF',   // Light Gray
    
    // Semantic Colors
    success: '#22C55E',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#2E86AB',
    
    // Chart & Data Visualization
    chartProtein: '#22C55E',
    chartCarbs: '#2E86AB',
    chartFat: '#F59E0B',
    chartCalories: '#F97316',
    
    // UI Elements
    border: '#E5E7EB',
    divider: '#E5E7EB',
    disabled: '#D1D5DB',
    
    // Status Colors
    statusActive: '#22C55E',
    statusPending: '#F59E0B',
    statusCancelled: '#EF4444',
    statusConfirmed: '#4CAF50',
    
    // Chat Backgrounds
    chatDoctor: '#E0F2FE',     // Light Blue
    chatUser: '#DCFCE7',       // Light Green
    
    // Additional Backgrounds
    backgroundHeader: '#E0F2FE',
    backgroundHighlight: '#F0F9FF',
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
