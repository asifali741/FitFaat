import { KeyboardAwareContainer, ThemedButton, ThemedInput } from '@/components/themed';
import { theme } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';
import { authApi } from '@/utils/auth/authApi';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from 'react-native-responsive-screen';

type ResetStep = 'email' | 'reset';

const getErrorMessage = (error: any, fallback: string) => {
  if (typeof error === 'string') return error;
  return error?.message || error?.response?.data?.message || fallback;
};

export default function ForgotPasswordScreen() {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const router = useRouter();

  const [step, setStep] = useState<ResetStep>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [errors, setErrors] = useState({
    email: '',
    otp: '',
    newPassword: '',
    confirmPassword: '',
  });

  const validateEmail = () => {
    const trimmedEmail = email.trim().toLowerCase();
    const nextErrors = { ...errors, email: '' };

    if (!trimmedEmail) {
      nextErrors.email = 'Email is required';
    } else if (!/^[\w.-]+@([\w-]+\.)+[\w-]{2,4}$/.test(trimmedEmail)) {
      nextErrors.email = 'Please enter a valid email address';
    }

    setErrors(nextErrors);
    return !nextErrors.email;
  };

  const validateReset = () => {
    const nextErrors = {
      email: '',
      otp: '',
      newPassword: '',
      confirmPassword: '',
    };

    if (!otp.trim()) {
      nextErrors.otp = 'Reset code is required';
    } else if (!/^\d{6}$/.test(otp.trim())) {
      nextErrors.otp = 'Reset code must be 6 digits';
    }

    if (!newPassword) {
      nextErrors.newPassword = 'New password is required';
    } else if (newPassword.length < 8) {
      nextErrors.newPassword = 'Password must be at least 8 characters';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(newPassword)) {
      nextErrors.newPassword = 'Use uppercase, lowercase, and a number';
    }

    if (!confirmPassword) {
      nextErrors.confirmPassword = 'Please confirm your password';
    } else if (confirmPassword !== newPassword) {
      nextErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(nextErrors);
    return !nextErrors.otp && !nextErrors.newPassword && !nextErrors.confirmPassword;
  };

  const handleSendCode = async () => {
    if (!validateEmail()) return;

    try {
      setIsSending(true);
      const normalizedEmail = email.trim().toLowerCase();
      const response = await authApi.requestPasswordResetOTP(normalizedEmail);

      if (response.success) {
        setEmail(normalizedEmail);
        setStep('reset');
        Alert.alert('Reset Code Sent', 'Check your email for the 6-digit reset code.');
      }
    } catch (error: any) {
      Alert.alert('Error', getErrorMessage(error, 'Failed to send reset code'));
    } finally {
      setIsSending(false);
    }
  };

  const handleResetPassword = async () => {
    if (!validateReset()) return;

    try {
      setIsResetting(true);
      const response = await authApi.resetPassword({
        email: email.trim().toLowerCase(),
        otp: otp.trim(),
        newPassword,
      });

      if (response.success) {
        Alert.alert('Password Updated', 'You can now sign in with your new password.', [
          { text: 'OK', onPress: () => router.replace('/(auth)/email-login') }
        ]);
      }
    } catch (error: any) {
      Alert.alert('Error', getErrorMessage(error, 'Failed to reset password'));
    } finally {
      setIsResetting(false);
    }
  };

  const handleResendCode = async () => {
    setOtp('');
    await handleSendCode();
  };

  return (
    <KeyboardAwareContainer keyboardVerticalOffset={20}>
      <LinearGradient
        colors={[colors.primary, colors.secondary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <View style={styles.headerContent}>
          <View style={styles.iconCircle}>
            <Ionicons name="key-outline" size={Math.min(hp(4.4), wp(9.6))} color={colors.textOnPrimary} />
          </View>
        </View>
      </LinearGradient>

      <View style={styles.formContainer}>
        <View style={styles.header}>
          <Text style={styles.title}>Forgot Password?</Text>
          <Text style={styles.subtitle}>
            {step === 'email'
              ? 'Enter your email and we will send a reset code'
              : `Enter the reset code sent to ${email}`}
          </Text>
        </View>

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
          editable={step === 'email' && !isSending}
          error={errors.email}
          required
        />

        {step === 'reset' && (
          <>
            <ThemedInput
              label="Reset Code"
              placeholder="123456"
              value={otp}
              onChangeText={(text) => {
                setOtp(text.replace(/\D/g, '').slice(0, 6));
                if (errors.otp) setErrors({ ...errors, otp: '' });
              }}
              leftIcon="shield-checkmark-outline"
              keyboardType="number-pad"
              maxLength={6}
              error={errors.otp}
              required
            />

            <ThemedInput
              label="New Password"
              placeholder="New password"
              value={newPassword}
              onChangeText={(text) => {
                setNewPassword(text);
                if (errors.newPassword) setErrors({ ...errors, newPassword: '' });
              }}
              leftIcon="lock-closed-outline"
              secureTextEntry
              error={errors.newPassword}
              required
            />

            <ThemedInput
              label="Confirm Password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChangeText={(text) => {
                setConfirmPassword(text);
                if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: '' });
              }}
              leftIcon="lock-closed-outline"
              secureTextEntry
              onSubmitEditing={handleResetPassword}
              error={errors.confirmPassword}
              required
            />

            <View style={styles.requirementsContainer}>
              <Text style={styles.requirementsTitle}>Password must contain:</Text>
              <View style={styles.requirement}>
                <Ionicons
                  name={newPassword.length >= 8 ? 'checkmark-circle' : 'ellipse-outline'}
                  size={Math.min(hp(2), wp(4.3))}
                  color={newPassword.length >= 8 ? colors.success : colors.textTertiary}
                />
                <Text style={styles.requirementText}>At least 8 characters</Text>
              </View>
              <View style={styles.requirement}>
                <Ionicons
                  name={/(?=.*[a-z])(?=.*[A-Z])/.test(newPassword) ? 'checkmark-circle' : 'ellipse-outline'}
                  size={Math.min(hp(2), wp(4.3))}
                  color={/(?=.*[a-z])(?=.*[A-Z])/.test(newPassword) ? colors.success : colors.textTertiary}
                />
                <Text style={styles.requirementText}>Uppercase and lowercase letters</Text>
              </View>
              <View style={styles.requirement}>
                <Ionicons
                  name={/\d/.test(newPassword) ? 'checkmark-circle' : 'ellipse-outline'}
                  size={Math.min(hp(2), wp(4.3))}
                  color={/\d/.test(newPassword) ? colors.success : colors.textTertiary}
                />
                <Text style={styles.requirementText}>At least one number</Text>
              </View>
            </View>
          </>
        )}

        {step === 'email' ? (
          <ThemedButton
            title="Send Reset Code"
            variant="primary"
            size="large"
            onPress={handleSendCode}
            loading={isSending}
            fullWidth
          />
        ) : (
          <>
            <ThemedButton
              title="Reset Password"
              variant="primary"
              size="large"
              onPress={handleResetPassword}
              loading={isResetting}
              fullWidth
            />

            <TouchableOpacity style={styles.resendButton} onPress={handleResendCode} disabled={isSending}>
              <Text style={styles.resendText}>{isSending ? 'Sending...' : 'Resend Code'}</Text>
            </TouchableOpacity>
          </>
        )}

        <TouchableOpacity style={styles.loginLink} onPress={() => router.replace('/(auth)/email-login')}>
          <Ionicons name="arrow-back" size={Math.min(hp(2), wp(4.3))} color={colors.primary} />
          <Text style={styles.loginLinkText}>Back to Sign In</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAwareContainer>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  headerGradient: {
    height: hp(24),
    position: 'relative',
    overflow: 'hidden',
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircle: {
    width: Math.min(hp(9.8), wp(21.3)),
    height: Math.min(hp(9.8), wp(21.3)),
    borderRadius: theme.borderRadius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderWidth: wp(0.8),
    borderColor: 'rgba(255, 255, 255, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
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
    marginBottom: theme.spacing.xl,
  },
  title: {
    fontSize: Math.min(hp(4.1), wp(8.8)),
    fontWeight: theme.typography.fontWeight.bold,
    color: colors.textPrimary,
    marginBottom: theme.spacing.xs,
    letterSpacing: 0,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: theme.typography.fontSize.base,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: hp(2.7),
  },
  requirementsContainer: {
    backgroundColor: colors.backgroundHighlight,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.medium,
    marginBottom: theme.spacing.lg,
  },
  requirementsTitle: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
    color: colors.textPrimary,
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
    color: colors.textSecondary,
    flex: 1,
  },
  resendButton: {
    alignItems: 'center',
    paddingVertical: theme.spacing.lg,
  },
  resendText: {
    color: colors.primary,
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semiBold,
  },
  loginLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.xl,
    marginBottom: theme.spacing.xl,
  },
  loginLinkText: {
    color: colors.primary,
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semiBold,
  },
});
