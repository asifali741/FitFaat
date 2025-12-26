/**
 * MIGRATED TO THEME SYSTEM ✅
 * Signup screen using themed components
 */

import { KeyboardAwareContainer, ThemedButton, ThemedInput } from '@/components/themed';
import { theme } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { authApi } from '../../utils/auth/authApi';

export default function SignupThemed() {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({
    email: '',
    username: '',
    password: '',
    confirmPassword: ''
  });
  
  const router = useRouter();

  const validateEmail = (email: string) => {
    const emailRegex = /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/;
    return emailRegex.test(email);
  };

  const validateUsername = (username: string) => {
    const usernameRegex = /^[a-zA-Z0-9@_]{6,}$/;
    return usernameRegex.test(username);
  };

  const validatePassword = (password: string) => {
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@_]{8,}$/;
    return passwordRegex.test(password);
  };

  const validateForm = () => {
    const newErrors = {
      email: '',
      username: '',
      password: '',
      confirmPassword: ''
    };
    let isValid = true;

    if (!email) {
      newErrors.email = 'Email is required';
      isValid = false;
    } else if (!validateEmail(email)) {
      newErrors.email = 'Please enter a valid email address';
      isValid = false;
    }

    if (!username) {
      newErrors.username = 'Username is required';
      isValid = false;
    } else if (!validateUsername(username)) {
      newErrors.username = 'Username must be at least 6 characters (letters, numbers, @ or _)';
      isValid = false;
    }

    if (!password) {
      newErrors.password = 'Password is required';
      isValid = false;
    } else if (!validatePassword(password)) {
      newErrors.password = 'Password must be 8+ characters with letters and numbers';
      isValid = false;
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
      isValid = false;
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSignup = async () => {
    if (!validateForm()) return;
    
    try {
      setIsLoading(true);
      console.log('Starting OTP flow with:', { email, username });

      const response = await authApi.sendOTP(email);

      if (response.success) {
        router.push({
          pathname: '/(auth)/otp-verification' as any,
          params: { email, username, password }
        });
      }
    } catch (error: any) {
      console.error('Signup error:', error);
      
      if (error.response?.data) {
        const serverError = error.response.data;
        
        if (serverError.message?.includes('email')) {
          setErrors(prev => ({ ...prev, email: serverError.message }));
        } else if (serverError.message?.includes('username')) {
          setErrors(prev => ({ ...prev, username: serverError.message }));
        } else {
          Alert.alert('Error', serverError.message || 'Failed to send OTP');
        }
      } else {
        Alert.alert('Error', 'Network error. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAwareContainer>
      {/* Professional Header with Gradient */}
      <LinearGradient
        colors={[theme.colors.secondary, theme.colors.primary]}
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
              <Ionicons name="heart" size={36} color={theme.colors.surface} />
            </View>
          </View>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Join FitFaat and start your fitness journey</Text>
        </View>

        {/* Progress Indicator */}
        <View style={styles.progressContainer}>
          <View style={[styles.progressStep, styles.progressStepActive]}>
            <Text style={[styles.progressText, styles.progressTextActive]}>1</Text>
          </View>
          <View style={styles.progressLine} />
          <View style={styles.progressStep}>
            <Text style={styles.progressText}>2</Text>
          </View>
          <View style={styles.progressLine} />
          <View style={styles.progressStep}>
            <Text style={styles.progressText}>3</Text>
          </View>
        </View>

        {/* Email Input */}
        <ThemedInput
          label="Email Address"
          placeholder="your@email.com"
          value={email}
          onChangeText={(text) => {
            setEmail(text);
            if (errors.email) setErrors({ ...errors, email: '' });
          }}
          leftIcon="mail-outline"
          keyboardType="email-address"
          autoCapitalize="none"
          returnKeyType="next"
          error={errors.email}
          required
        />

        {/* Username Input */}
        <ThemedInput
          label="Username"
          placeholder="johndoe"
          value={username}
          onChangeText={(text) => {
            setUsername(text);
            if (errors.username) setErrors({ ...errors, username: '' });
          }}
          leftIcon="person-outline"
          autoCapitalize="none"
          returnKeyType="next"
          error={errors.username}
          required
        />

        {/* Password Input */}
        <ThemedInput
          label="Password"
          placeholder="••••••••"
          value={password}
          onChangeText={(text) => {
            setPassword(text);
            if (errors.password) setErrors({ ...errors, password: '' });
          }}
          leftIcon="lock-closed-outline"
          secureTextEntry
          returnKeyType="next"
          error={errors.password}
          required
        />

        {/* Confirm Password Input */}
        <ThemedInput
          label="Confirm Password"
          placeholder="••••••••"
          value={confirmPassword}
          onChangeText={(text) => {
            setConfirmPassword(text);
            if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: '' });
          }}
          leftIcon="lock-closed-outline"
          secureTextEntry
          returnKeyType="done"
          onSubmitEditing={handleSignup}
          error={errors.confirmPassword}
          required
        />

        {/* Password Requirements */}
        <View style={styles.requirementsContainer}>
          <Text style={styles.requirementsTitle}>Password must contain:</Text>
          <View style={styles.requirement}>
            <Ionicons 
              name={password.length >= 8 ? "checkmark-circle" : "ellipse-outline"} 
              size={16} 
              color={password.length >= 8 ? theme.colors.success : theme.colors.textTertiary} 
            />
            <Text style={styles.requirementText}>At least 8 characters</Text>
          </View>
          <View style={styles.requirement}>
            <Ionicons 
              name={/[A-Za-z]/.test(password) ? "checkmark-circle" : "ellipse-outline"} 
              size={16} 
              color={/[A-Za-z]/.test(password) ? theme.colors.success : theme.colors.textTertiary} 
            />
            <Text style={styles.requirementText}>At least one letter</Text>
          </View>
          <View style={styles.requirement}>
            <Ionicons 
              name={/\d/.test(password) ? "checkmark-circle" : "ellipse-outline"} 
              size={16} 
              color={/\d/.test(password) ? theme.colors.success : theme.colors.textTertiary} 
            />
            <Text style={styles.requirementText}>At least one number</Text>
          </View>
        </View>

        {/* Signup Button */}
        <ThemedButton
          title="Continue to Verification"
          variant="primary"
          size="large"
          onPress={handleSignup}
          loading={isLoading}
          fullWidth
        />

        {/* Divider */}
        <View style={styles.dividerContainer}>
          <View style={styles.divider} />
          <Text style={styles.dividerText}>Already have an account?</Text>
          <View style={styles.divider} />
        </View>

        {/* Login Link */}
        <View style={styles.footer}>
          <TouchableOpacity onPress={() => router.push("/email-login")}>
            <Text style={styles.linkText}>Sign In Instead</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAwareContainer>
  );
}

const styles = StyleSheet.create({
  headerGradient: {
    height: 220,
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
    width: 250,
    height: 250,
    top: -100,
    right: -80,
  },
  circle2: {
    width: 180,
    height: 180,
    top: 80,
    left: -50,
  },
  formContainer: {
    flex: 1,
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.xxl,
    backgroundColor: theme.colors.screenColor,
    marginTop: -40,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    ...theme.shadows.large,
  },
  header: {
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
    marginTop: -60,
  },
  logoContainer: {
    marginBottom: theme.spacing.lg,
  },
  logoBg: {
    width: 80,
    height: 80,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: theme.colors.surface,
    ...theme.shadows.large,
  },
  title: {
    fontSize: theme.typography.fontSize.xxxl + 4,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.xl,
  },
  progressStep: {
    width: 44,
    height: 44,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.surface,
    borderWidth: 2.5,
    borderColor: theme.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadows.small,
  },
  progressStepActive: {
    backgroundColor: theme.colors.secondary,
    borderColor: theme.colors.secondary,
    ...theme.shadows.medium,
  },
  progressText: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semiBold,
    color: theme.colors.textSecondary,
  },
  progressTextActive: {
    color: theme.colors.surface,
  },
  progressLine: {
    width: 40,
    height: 2,
    backgroundColor: theme.colors.border,
    marginHorizontal: theme.spacing.xs,
  },
  requirementsContainer: {
    backgroundColor: theme.colors.backgroundHighlight,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.medium,
    marginBottom: theme.spacing.lg,
  },
  requirementsTitle: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
  },
  requirement: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
    gap: theme.spacing.sm,
  },
  requirementText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: theme.spacing.xl,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: theme.colors.border,
  },
  dividerText: {
    marginHorizontal: theme.spacing.md,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  footer: {
    alignItems: 'center',
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.xl,
  },
  linkText: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.secondary,
    fontWeight: theme.typography.fontWeight.semiBold,
  },
});
