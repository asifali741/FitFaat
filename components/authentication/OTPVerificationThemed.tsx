/**
 * MIGRATED TO THEME SYSTEM ✅
 * OTP Verification screen using themed components
 */

import BackButton from '@/components/BackButton';
import { KeyboardAwareContainer, ThemedButton } from '@/components/themed';
import { theme } from '@/constants/theme';
import { useNotifications } from '@/contexts/NotificationContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from 'react-native-responsive-screen';

import { authApi } from '../../utils/auth/authApi';

export default function OTPVerificationThemed() {
  const { colors } = useTheme();
  const { sendFitFaatNotification, scheduleHourlyMotivation } = useNotifications();
  const styles = getStyles(colors);
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
          await sendFitFaatNotification(
            'admin',
            'Welcome to FitFaat',
            `Congratulations ${username || 'there'}, your FitFaat account is ready.`
          );
          await scheduleHourlyMotivation();
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
      {/* Professional Header with Gradient */}
      <LinearGradient
        colors={[colors.primary, colors.accent]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <BackButton style={styles.backButton} testID="otp-back-button" />
      </LinearGradient>

      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <LinearGradient
              colors={[colors.primary, colors.accent]}
              style={styles.iconGradient}
            >
              <Ionicons name="mail-open-outline" size={Math.min(hp(6.9), wp(15))} color={colors.textOnPrimary} />
            </LinearGradient>
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
              ref={(el) => { inputRefs.current[index] = el; }}
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
          <Ionicons name="information-circle-outline" size={Math.min(hp(2.5), wp(5.4))} color={colors.textSecondary} />
          <Text style={styles.helpText}>
            Check your spam folder if you don't see the email
          </Text>
        </View>
      </View>
    </KeyboardAwareContainer>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  headerGradient: {
    height: hp(22),
    paddingTop: hp(7.4),
    paddingHorizontal: theme.spacing.xl,
  },
  content: {
    flex: 1,
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.xxl,
    backgroundColor: colors.screenColor,
    marginTop: -hp(4.9),
    borderTopLeftRadius: wp(8.5),
    borderTopRightRadius: wp(8.5),
    ...theme.shadows.large,
  },
  backButton: {
    width: Math.min(hp(5.9), wp(12.8)),
    height: Math.min(hp(5.9), wp(12.8)),
    borderRadius: theme.borderRadius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: wp(0.4),
    borderColor: 'rgba(255, 255, 255, 0.3)',
    ...theme.shadows.medium,
  },
  header: {
    alignItems: 'center',
    marginBottom: theme.spacing.xxxl,
    marginTop: -hp(2.5),
  },
  iconContainer: {
    marginBottom: theme.spacing.lg,
  },
  iconGradient: {
    width: Math.min(hp(12.3), wp(26.7)),
    height: Math.min(hp(12.3), wp(26.7)),
    borderRadius: theme.borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadows.large,
  },
  title: {
    fontSize: Math.min(hp(4.4), wp(9.6)),
    fontWeight: theme.typography.fontWeight.bold,
    color: colors.textPrimary,
    marginBottom: theme.spacing.sm,
    letterSpacing: 0,
  },
  subtitle: {
    fontSize: theme.typography.fontSize.base,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: hp(3),
  },
  email: {
    fontWeight: theme.typography.fontWeight.semiBold,
    color: colors.primary,
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.xl,
    gap: theme.spacing.md,
  },
  otpInput: {
    flex: 1,
    height: hp(8.4),
    borderWidth: wp(0.65),
    borderColor: colors.border,
    borderRadius: theme.borderRadius.large,
    fontSize: Math.min(hp(3.4), wp(7.5)),
    fontWeight: theme.typography.fontWeight.bold,
    color: colors.textPrimary,
    textAlign: 'center',
    backgroundColor: colors.surface,
    ...theme.shadows.small,
  },
  otpInputFilled: {
    borderColor: colors.primary,
    backgroundColor: colors.backgroundHighlight,
    ...theme.shadows.medium,
  },
  timerContainer: {
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  timerText: {
    fontSize: theme.typography.fontSize.base,
    color: colors.textSecondary,
  },
  timerHighlight: {
    fontWeight: theme.typography.fontWeight.bold,
    color: colors.primary,
  },
  resendText: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semiBold,
    color: colors.primary,
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
    color: colors.textSecondary,
    flex: 1,
  },
});

