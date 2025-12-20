/**
 * MIGRATED TO THEME SYSTEM ✅
 * OTP Verification screen using themed components
 */

import { theme } from '@/constants/theme';
import { KeyboardAwareContainer, ThemedButton } from '@/components/themed';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { authApi } from '../../utils/auth/authApi';

export default function OTPVerificationThemed() {
  const params = useLocalSearchParams();
  const email = params.email as string;
  const username = params.username as string;
  const password = params.password as string;
  
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [timer, setTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);
  
  const inputRefs = useRef<Array<TextInput | null>>([]);
  const router = useRouter();

  useEffect(() => {
    if (timer > 0) {
      const interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(interval);
    } else {
      setCanResend(true);
    }
  }, [timer]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const handleOtpChange = (value: string, index: number) => {
    if (value && !/^\d+$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    if (index === 5 && value && newOtp.every(digit => digit)) {
      handleVerifyOTP(newOtp.join(''));
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace') {
      if (!otp[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    }
  };

  const handleVerifyOTP = async (otpCode?: string) => {
    try {
      const otpToVerify = otpCode || otp.join('');
      
      if (otpToVerify.length !== 6) {
        Alert.alert('Error', 'Please enter all 6 digits');
        return;
      }

      setIsLoading(true);

      const verifyResponse = await authApi.verifyOTP(email, otpToVerify);

      if (verifyResponse.success) {
        const registerResponse = await authApi.register({
          email,
          username,
          password
        });

        if (registerResponse.success) {
          Alert.alert('Success', 'Account created successfully!', [
            { text: 'OK', onPress: () => router.replace('/DietSection') }
          ]);
        }
      }
    } catch (error: any) {
      console.error('OTP verification error:', error);
      Alert.alert(
        'Verification Failed',
        error.response?.data?.message || 'Invalid OTP. Please try again.'
      );
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (!canResend) return;

    try {
      setIsResending(true);
      const response = await authApi.sendOTP(email);
      
      if (response.success) {
        Alert.alert('Success', 'OTP has been resent to your email');
        setTimer(60);
        setCanResend(false);
        setOtp(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
      }
    } catch (error: any) {
      console.error('Resend OTP error:', error);
      Alert.alert('Error', 'Failed to resend OTP. Please try again.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <KeyboardAwareContainer scrollable={false}>
      <View style={styles.content}>
        {/* Back Button */}
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Ionicons name="mail-open-outline" size={64} color={theme.colors.primary} />
          </View>
          <Text style={styles.title}>Verify Your Email</Text>
          <Text style={styles.subtitle}>
            We've sent a 6-digit code to{'\n'}
            <Text style={styles.email}>{email}</Text>
          </Text>
        </View>

        {/* OTP Input */}
        <View style={styles.otpContainer}>
          {otp.map((digit, index) => (
            <TextInput
              key={index}
              ref={(ref) => (inputRefs.current[index] = ref)}
              style={[
                styles.otpInput,
                digit && styles.otpInputFilled
              ]}
              value={digit}
              onChangeText={(value) => handleOtpChange(value, index)}
              onKeyPress={(e) => handleKeyPress(e, index)}
              keyboardType="number-pad"
              maxLength={1}
              selectTextOnFocus
              editable={!isLoading}
            />
          ))}
        </View>

        {/* Timer & Resend */}
        <View style={styles.timerContainer}>
          {!canResend ? (
            <Text style={styles.timerText}>
              Resend code in <Text style={styles.timerHighlight}>{timer}s</Text>
            </Text>
          ) : (
            <TouchableOpacity 
              onPress={handleResendOTP} 
              disabled={isResending}
            >
              <Text style={styles.resendText}>
                {isResending ? 'Sending...' : 'Resend Code'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Verify Button */}
        <ThemedButton
          title="Verify & Create Account"
          variant="primary"
          size="large"
          onPress={() => handleVerifyOTP()}
          loading={isLoading}
          disabled={otp.some(digit => !digit)}
          fullWidth
        />

        {/* Help Text */}
        <View style={styles.helpContainer}>
          <Ionicons name="information-circle-outline" size={20} color={theme.colors.textSecondary} />
          <Text style={styles.helpText}>
            Check your spam folder if you don't see the email
          </Text>
        </View>
      </View>
    </KeyboardAwareContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.xl,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
    ...theme.shadows.small,
  },
  header: {
    alignItems: 'center',
    marginBottom: theme.spacing.xxxl,
  },
  iconContainer: {
    marginBottom: theme.spacing.lg,
  },
  title: {
    fontSize: theme.typography.fontSize.xxxl,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
  },
  subtitle: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  email: {
    fontWeight: theme.typography.fontWeight.semiBold,
    color: theme.colors.primary,
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.xl,
    gap: theme.spacing.sm,
  },
  otpInput: {
    flex: 1,
    height: 60,
    borderWidth: 2,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.medium,
    fontSize: theme.typography.fontSize.xxl,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.textPrimary,
    textAlign: 'center',
    backgroundColor: theme.colors.surface,
  },
  otpInputFilled: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.backgroundHighlight,
  },
  timerContainer: {
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  timerText: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textSecondary,
  },
  timerHighlight: {
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.primary,
  },
  resendText: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semiBold,
    color: theme.colors.primary,
  },
  helpContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: theme.spacing.xl,
    gap: theme.spacing.sm,
  },
  helpText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    flex: 1,
  },
});
