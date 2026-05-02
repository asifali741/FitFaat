/**
 * MIGRATED TO THEME SYSTEM ✅
 * Example of using themed components and centralized theme
 */

import { KeyboardAwareContainer, ThemedButton, ThemedInput } from '@/components/themed';
import { theme } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from 'react-native-responsive-screen';
import { authApi } from '../../utils/auth/authApi';

export default function LoginThemed() {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ identifier?: string; password?: string }>({});
  
  const router = useRouter();

  const validate = () => {
    const newErrors: typeof errors = {};
    
    if (!identifier.trim()) {
      newErrors.identifier = 'Email or username is required';
    }
    
    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;
    
    try {
      setIsLoading(true);
      await authApi.login({ identifier, password });
      
      // Check onboarding status
      const { isOnboardingComplete } = await authApi.getOnboardingStatus();
      
      // Redirect based on onboarding status
      if (!isOnboardingComplete) {
        router.push("/DietSection");
      } else {
        router.push("/(main)/(dashboard)");
      }
    } catch (error: any) {
      console.log('Login error:', error);
      Alert.alert('Error', error.message || error || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAwareContainer keyboardVerticalOffset={20}>
      {/* Professional Header with Gradient */}
      <LinearGradient
        colors={[colors.primary, colors.secondary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <View style={styles.decorativeHeader}>
          <View style={[styles.circle, styles.circle1]} />
          <View style={[styles.circle, styles.circle2]} />
        </View>
      </LinearGradient>

      <View style={styles.formContainer}>
        {/* Header Section */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <View style={styles.logoBg}>
              <Ionicons name="heart" size={Math.min(hp(4.4), wp(9.6))} color={colors.textOnPrimary} />
            </View>
          </View>
          <Text style={styles.title}>Welcome Back!</Text>
          <Text style={styles.subtitle}>Sign in to continue your fitness journey</Text>
        </View>
        
        {/* Email/Username Input */}
        <ThemedInput
          label="Email or Username"
          placeholder="your@email.com"
          value={identifier}
          onChangeText={(text) => {
            setIdentifier(text);
            if (errors.identifier) setErrors({ ...errors, identifier: undefined });
          }}
          leftIcon="mail-outline"
          keyboardType="email-address"
          autoCapitalize="none"
          returnKeyType="next"
          error={errors.identifier}
          required
        />

        {/* Password Input */}
        <ThemedInput
          label="Password"
          placeholder="••••••••"
          value={password}
          onChangeText={(text) => {
            setPassword(text);
            if (errors.password) setErrors({ ...errors, password: undefined });
          }}
          leftIcon="lock-closed-outline"
          secureTextEntry
          returnKeyType="done"
          onSubmitEditing={handleLogin}
          error={errors.password}
          required
        />

        {/* Forgot Password Link */}
        <TouchableOpacity 
          style={styles.forgotContainer}
          onPress={() => router.push("/forgot-password")}
        >
          <Text style={styles.forgotText}>Forgot password?</Text>
        </TouchableOpacity>

        {/* Login Button */}
        <ThemedButton
          title="Sign In"
          variant="primary"
          size="large"
          onPress={handleLogin}
          loading={isLoading}
          fullWidth
        />

        {/* Divider */}
        <View style={styles.dividerContainer}>
          <View style={styles.divider} />
          <Text style={styles.dividerText}>New to FitFaat?</Text>
          <View style={styles.divider} />
        </View>

        {/* Sign Up Link */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Don't have an account? </Text>
          <TouchableOpacity onPress={() => router.push("/email-signup")}>
            <Text style={styles.linkText}>Create one</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAwareContainer>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  headerGradient: {
    height: hp(27),
    position: 'relative',
    overflow: 'hidden',
  },
  decorativeHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  circle: {
    position: 'absolute',
    borderRadius: theme.borderRadius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  circle1: {
    width: wp(66.7),
    height: wp(66.7),
    top: -hp(12.3),
    left: -wp(21.3),
  },
  circle2: {
    width: wp(48),
    height: wp(48),
    top: hp(9.8),
    right: -wp(13.3),
  },
  formContainer: {
    flex: 1,
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.xxl,
    backgroundColor: colors.screenColor,
    marginTop: -hp(4.9),
    borderTopLeftRadius: wp(8.5),
    borderTopRightRadius: wp(8.5),
    ...theme.shadows.large,
  },
  header: {
    alignItems: 'center',
    marginBottom: theme.spacing.xxxl,
    marginTop: -hp(7.4),
  },
  logoContainer: {
    marginBottom: theme.spacing.lg,
  },
  logoBg: {
    width: Math.min(hp(9.8), wp(21.3)),
    height: Math.min(hp(9.8), wp(21.3)),
    borderRadius: theme.borderRadius.full,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: wp(1),
    borderColor: colors.textOnPrimary,
    ...theme.shadows.large,
  },
  title: {
    fontSize: Math.min(hp(4.4), wp(9.6)),
    fontWeight: theme.typography.fontWeight.bold,
    color: colors.textPrimary,
    marginBottom: theme.spacing.xs,
    letterSpacing: 0,
  },
  subtitle: {
    fontSize: theme.typography.fontSize.base,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: hp(2.7),
  },
  forgotContainer: {
    alignSelf: 'flex-end',
    marginBottom: theme.spacing.xl,
    marginTop: -theme.spacing.xs,
  },
  forgotText: {
    fontSize: theme.typography.fontSize.sm,
    color: colors.primary,
    fontWeight: theme.typography.fontWeight.medium,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: theme.spacing.xl,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    marginHorizontal: theme.spacing.md,
    fontSize: theme.typography.fontSize.sm,
    color: colors.textSecondary,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: theme.spacing.md,
  },
  footerText: {
    fontSize: theme.typography.fontSize.base,
    color: colors.textSecondary,
  },
  linkText: {
    fontSize: theme.typography.fontSize.base,
    color: colors.primary,
    fontWeight: theme.typography.fontWeight.semiBold,
  },
});

