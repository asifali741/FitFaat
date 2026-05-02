import BackButton from '@/components/BackButton';
import { useTheme } from '@/contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from 'react-native-responsive-screen';
import { SafeAreaView } from 'react-native-safe-area-context';
import { authApi } from '../../utils/auth/authApi';

export default function OTPVerification() {
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
  const { colors, isDarkMode } = useTheme();
  const styles = getStyles(colors, isDarkMode);

  // Timer countdown
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

  // Auto-focus first input on mount
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const handleOtpChange = (value: string, index: number) => {
    // Only allow numbers
    if (value && !/^\d+$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-verify when all 6 digits are entered
    if (index === 5 && value && newOtp.every(digit => digit)) {
      handleVerifyOTP(newOtp.join(''));
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace') {
      if (!otp[index] && index > 0) {
        // Move to previous input if current is empty
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

      // Verify OTP
      const verifyResponse = await authApi.verifyOTP(email, otpToVerify);

      if (verifyResponse.success) {
        // Register user after OTP verification
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
      // Clear OTP inputs on error
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
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.content}>
          {/* Back Button */}
          <BackButton style={styles.backButton} testID="otp-back-button" />

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Ionicons name="mail-outline" size={Math.min(hp(7.4), wp(16))} color={colors.primary} />
            </View>
            <Text style={styles.title}>Verify Your Email</Text>
            <Text style={styles.subtitle}>
              We've sent a 6-digit code to{'\n'}
              <Text style={styles.emailText}>{email}</Text>
            </Text>
          </View>

          {/* OTP Input */}
          <View style={styles.otpContainer}>
            {otp.map((digit, index) => (
              <TextInput
                key={index}
                ref={(ref) => { inputRefs.current[index] = ref; }}
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

          {/* Verify Button */}
          <TouchableOpacity 
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={() => handleVerifyOTP()}
            disabled={isLoading || otp.some(digit => !digit)}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <View style={styles.buttonContent}>
                <Text style={styles.buttonText}>Verify & Continue</Text>
                <Ionicons name="checkmark-circle" size={Math.min(hp(2.5), wp(5.4))} color="#FFFFFF" />
              </View>
            )}
          </TouchableOpacity>

          {/* Resend Section */}
          <View style={styles.resendContainer}>
            {!canResend ? (
              <Text style={styles.timerText}>
                Resend code in <Text style={styles.timerHighlight}>{timer}s</Text>
              </Text>
            ) : (
              <TouchableOpacity 
                onPress={handleResendOTP}
                disabled={isResending}
              >
                {isResending ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Text style={styles.resendText}>
                    Didn't receive code? <Text style={styles.resendLink}>Resend</Text>
                  </Text>
                )}
              </TouchableOpacity>
            )}
          </View>

          {/* Help Text */}
          <View style={styles.helpContainer}>
            <Ionicons name="information-circle-outline" size={Math.min(hp(2.5), wp(5.4))} color={colors.textLight} />
            <Text style={styles.helpText}>
              Check your spam folder if you don't see the email
            </Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const getStyles = (colors: any, isDarkMode: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.screenColor,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: wp(6.4),
    paddingTop: hp(2.5),
  },
  backButton: {
    width: Math.min(hp(4.9), wp(10.7)),
    height: Math.min(hp(4.9), wp(10.7)),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: hp(2.5),
  },
  header: {
    alignItems: 'center',
    marginBottom: hp(4.9),
  },
  iconContainer: {
    width: Math.min(hp(14.8), wp(32)),
    height: Math.min(hp(14.8), wp(32)),
    borderRadius: Math.min(hp(7.4), wp(16)),
    backgroundColor: isDarkMode ? colors.cardBackground : '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: hp(3),
  },
  title: {
    fontSize: Math.min(hp(3.4), wp(7.5)),
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: hp(1.5),
    textAlign: 'center',
  },
  subtitle: {
    fontSize: Math.min(hp(1.9), wp(4)),
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: hp(2.7),
  },
  emailText: {
    color: colors.primary,
    fontWeight: '700',
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: hp(3.9),
    paddingHorizontal: wp(2.7),
  },
  otpInput: {
    width: wp(13.3),
    height: hp(7.4),
    borderWidth: 2,
    borderColor: isDarkMode ? colors.gray : '#E5E7EB',
    borderRadius: wp(3.2),
    textAlign: 'center',
    fontSize: Math.min(hp(3), wp(6.4)),
    fontWeight: '700',
    color: colors.textPrimary,
    backgroundColor: isDarkMode ? colors.cardBackground : '#FFFFFF',
  },
  otpInputFilled: {
    borderColor: colors.primary,
    backgroundColor: isDarkMode ? colors.cardBackground : '#F9FAFB',
  },
  button: {
    backgroundColor: colors.primary,
    height: hp(6.9),
    borderRadius: wp(3.7),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: hp(3),
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: hp(0.5) },
    shadowOpacity: 0.3,
    shadowRadius: wp(2.1),
    elevation: 5,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonContent: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: wp(2.1),
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: Math.min(hp(2), wp(4.3)),
    fontWeight: '700',
    letterSpacing: 0,
  },
  resendContainer: {
    alignItems: 'center',
    marginBottom: hp(3),
  },
  timerText: {
    fontSize: Math.min(hp(1.9), wp(4)),
    color: colors.textSecondary,
    fontWeight: '500',
  },
  timerHighlight: {
    color: colors.primary,
    fontWeight: '700',
  },
  resendText: {
    fontSize: Math.min(hp(1.9), wp(4)),
    color: colors.textSecondary,
    fontWeight: '500',
  },
  resendLink: {
    color: colors.primary,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  helpContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: isDarkMode ? colors.cardBackground : '#F3F4F6',
    padding: wp(4.3),
    borderRadius: wp(3.2),
    gap: wp(2.1),
  },
  helpText: {
    fontSize: Math.min(hp(1.6), wp(3.5)),
    color: colors.textLight,
    flex: 1,
    flexWrap: 'wrap',
  },
});
