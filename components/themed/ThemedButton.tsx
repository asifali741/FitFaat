import { theme } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';
import React from 'react';
import {
    ActivityIndicator,
    StyleSheet,
    Text,
    TouchableOpacity,
    TouchableOpacityProps,
    ViewStyle,
} from 'react-native';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type ButtonSize = 'small' | 'medium' | 'large';

interface ThemedButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
  icon?: React.ReactNode;
}

export const ThemedButton: React.FC<ThemedButtonProps> = ({
  title,
  variant = 'primary',
  size = 'medium',
  loading = false,
  fullWidth = false,
  disabled = false,
  icon,
  style,
  ...props
}) => {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const buttonStyle: ViewStyle[] = [
    styles.base,
    styles[variant],
    styles[`size_${size}`],
    fullWidth ? styles.fullWidth : undefined,
    disabled ? styles.disabled : undefined,
  ].filter(Boolean) as ViewStyle[];

  const textStyle = [
    styles.text,
    styles[`text_${variant}`],
    styles[`textSize_${size}`],
    disabled ? styles.textDisabled : undefined,
  ].filter(Boolean);

  return (
    <TouchableOpacity
      style={[buttonStyle, style]}
      disabled={disabled || loading}
      activeOpacity={0.7}
      {...props}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'outline' ? colors.primary : colors.textOnPrimary}
        />
      ) : (
        <>
          {icon && <>{icon}</>}
          <Text style={textStyle}>{title}</Text>
        </>
      )}
    </TouchableOpacity>
  );
};

const getStyles = (colors: any) => StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.borderRadius.medium,
    gap: theme.spacing.sm,
    ...theme.shadows.small,
  },
  
  // Variants
  primary: {
    backgroundColor: colors.accent,
  },
  secondary: {
    backgroundColor: colors.primary,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  danger: {
    backgroundColor: colors.error,
  },
  
  // Sizes
  size_small: {
    height: theme.components.button.height.small,
    paddingHorizontal: theme.components.button.paddingHorizontal.small,
  },
  size_medium: {
    height: theme.components.button.height.medium,
    paddingHorizontal: theme.components.button.paddingHorizontal.medium,
  },
  size_large: {
    height: theme.components.button.height.large,
    paddingHorizontal: theme.components.button.paddingHorizontal.large,
  },
  
  // States
  disabled: {
    backgroundColor: colors.disabled,
    opacity: 0.6,
  },
  fullWidth: {
    width: '100%',
  },
  
  // Text Styles
  text: {
    fontWeight: theme.typography.fontWeight.semiBold,
  },
  text_primary: {
    color: colors.textOnPrimary,
  },
  text_secondary: {
    color: colors.textOnPrimary,
  },
  text_outline: {
    color: colors.primary,
  },
  text_ghost: {
    color: colors.primary,
  },
  text_danger: {
    color: colors.textOnPrimary,
  },
  textSize_small: {
    fontSize: theme.typography.fontSize.sm,
  },
  textSize_medium: {
    fontSize: theme.typography.fontSize.base,
  },
  textSize_large: {
    fontSize: theme.typography.fontSize.lg,
  },
  textDisabled: {
    color: colors.textTertiary,
  },
});
