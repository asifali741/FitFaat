import { theme } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
    StyleSheet,
    Text,
    TextInput,
    TextInputProps,
    View,
    ViewStyle
} from 'react-native';

interface ThemedInputProps extends TextInputProps {
  label?: string;
  error?: string;
  leftIcon?: keyof typeof Ionicons.glyphMap;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  containerStyle?: ViewStyle;
  required?: boolean;
}

export const ThemedInput: React.FC<ThemedInputProps> = ({
  label,
  error,
  leftIcon,
  rightIcon,
  containerStyle,
  required = false,
  style,
  secureTextEntry,
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const showPassword = secureTextEntry && !isPasswordVisible;

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <Text style={styles.label}>
          {label}
          {required && <Text style={styles.required}> *</Text>}
        </Text>
      )}
      
      <View
        style={[
          styles.inputContainer,
          isFocused && styles.inputContainerFocused,
          error && styles.inputContainerError,
        ]}
      >
        {leftIcon && (
          <Ionicons
            name={leftIcon}
            size={20}
            color={error ? theme.colors.error : theme.colors.textSecondary}
            style={styles.leftIcon}
          />
        )}
        
        <TextInput
          style={[styles.input, style]}
          placeholderTextColor={theme.colors.textTertiary}
          secureTextEntry={showPassword}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          {...props}
        />
        
        {secureTextEntry && (
          <Ionicons
            name={isPasswordVisible ? 'eye-off-outline' : 'eye-outline'}
            size={20}
            color={theme.colors.textSecondary}
            style={styles.rightIcon}
            onPress={() => setIsPasswordVisible(!isPasswordVisible)}
          />
        )}
        
        {!secureTextEntry && rightIcon && (
          <Ionicons
            name={rightIcon}
            size={20}
            color={theme.colors.textSecondary}
            style={styles.rightIcon}
          />
        )}
      </View>
      
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: theme.spacing.md,
  },
  label: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
  },
  required: {
    color: theme.colors.error,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: theme.components.input.height,
    backgroundColor: theme.colors.surface,
    borderWidth: theme.components.input.borderWidth,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.medium,
    paddingHorizontal: theme.components.input.paddingHorizontal,
  },
  inputContainerFocused: {
    borderColor: theme.colors.primary,
    borderWidth: 2,
  },
  inputContainerError: {
    borderColor: theme.colors.error,
  },
  input: {
    flex: 1,
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textPrimary,
    paddingVertical: 0,
  },
  leftIcon: {
    marginRight: theme.spacing.sm,
  },
  rightIcon: {
    marginLeft: theme.spacing.sm,
  },
  errorText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.error,
    marginTop: theme.spacing.xs,
  },
});
