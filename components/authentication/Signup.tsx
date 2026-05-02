import { useTheme } from '@/contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from 'react-native-responsive-screen';
import { SafeAreaView } from 'react-native-safe-area-context';
import { authApi } from '../../utils/auth/authApi';

export default function Signup() {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [errors, setErrors] = useState({
    email: '',
    username: '',
    password: '',
    confirmPassword: ''
  });
  const scrollRef = useRef<ScrollView>(null);
  
  const emailRef = useRef<TextInput>(null);
  const usernameRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmPasswordRef = useRef<TextInput>(null);
  
  const router = useRouter();
  const { colors, isDarkMode } = useTheme();
  const styles = getStyles(colors, isDarkMode);

  const validateEmail = (email: string) => {
    const emailRegex = /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/;
    return emailRegex.test(email);
  };

  const validateUsername = (username: string) => {
    const usernameRegex = /^[a-zA-Z0-9@_]{6,}$/;
    return usernameRegex.test(username);
  };

  const validatePassword = (password: string) => {
    // At least 8 characters, containing letters and numbers, allowing @ and _
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
      newErrors.username = 'Username must be at least 6 characters and contain only letters, numbers, @ or _';
      isValid = false;
    }

    if (!password) {
      newErrors.password = 'Password is required';
      isValid = false;
    } else if (!validatePassword(password)) {
      newErrors.password = 'Password must be at least 8 characters and contain letters and numbers';
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
    try {
      if (!validateForm()) {
        return;
      }

      setIsLoading(true);
      console.log('Starting OTP flow with:', { email, username });

      // Send OTP to email
      const response = await authApi.sendOTP(email);

      if (response.success) {
        // Navigate to OTP verification screen with user data
        router.push({
          pathname: '/(auth)/otp-verification' as any,
          params: {
            email,
            username,
            password
          }
        });
      }
    } catch (error: any) {
      console.error('Signup error:', error);
      
      if (error.response?.data) {
        // Handle server validation errors
        const serverError = error.response.data;
        console.log('Server error:', serverError);
        
        if (serverError.message?.includes('email')) {
          setErrors(prev => ({ ...prev, email: serverError.message }));
        } else if (serverError.message?.includes('username')) {
          setErrors(prev => ({ ...prev, username: serverError.message }));
        } else {
          Alert.alert('Error', serverError.message || 'Failed to send OTP');
        }
      } else {
        // Handle network or other errors
        Alert.alert('Error', 'Network error or server not responding. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView 
          ref={scrollRef}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          scrollEnabled={true}
          nestedScrollEnabled={false}
          scrollEventThrottle={16}
        >
          {/* Decorative Header */}
          <View style={styles.decorativeHeader}>
            <View style={[styles.circle, styles.circle1]} />
            <View style={[styles.circle, styles.circle2]} />
          </View>

          <View style={styles.formContainer}>
            {/* Header Section */}
            <View style={styles.header}>
              <View style={styles.logoContainer}>
                <View style={styles.logoBg}>
                  <Ionicons name="heart" size={Math.min(hp(3.9), wp(8.5))} color="#FFFFFF" />
                </View>
              </View>
              <Text style={styles.title}>Create Account</Text>
              <Text style={styles.subtitle}>Join FitFaat and start your fitness journey today</Text>
            </View>

            {/* Progress Indicator */}
            <View style={styles.progressContainer}>
              <View style={[styles.progressStep, styles.progressStepActive]}>
                <Text style={styles.progressText}>1</Text>
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
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Email Address</Text>
              <View style={[
                styles.inputWrapper,
                focusedField === 'email' && styles.inputWrapperFocused,
                errors.email && styles.inputWrapperError
              ]}>
                <Ionicons 
                  name="mail-outline" 
                  size={Math.min(hp(2.5), wp(5.4))} 
                  color={focusedField === 'email' ? colors.primary : colors.textLight}
                  style={styles.inputIcon}
                />
                <TextInput
                  ref={emailRef}
                  style={styles.input}
                  placeholder="your@email.com"
                  placeholderTextColor={colors.textLight}
                  value={email}
                  onChangeText={(text) => {
                    setEmail(text);
                    setErrors(prev => ({ ...prev, email: '' }));
                  }}
                  onSubmitEditing={() => usernameRef.current?.focus()}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  editable={!isLoading}
                  returnKeyType="next"
                  blurOnSubmit={false}
                />
              </View>
              {errors.email && (
                <View style={styles.errorContainer}>
                  <Ionicons name="alert-circle" size={Math.min(hp(1.7), wp(3.7))} color={colors.error} />
                  <Text style={styles.errorText}>{errors.email}</Text>
                </View>
              )}
            </View>

            {/* Username Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Username</Text>
              <View style={[
                styles.inputWrapper,
                focusedField === 'username' && styles.inputWrapperFocused,
                errors.username && styles.inputWrapperError
              ]}>
                <Ionicons 
                  name="person-outline" 
                  size={Math.min(hp(2.5), wp(5.4))} 
                  color={focusedField === 'username' ? colors.primary : colors.textLight}
                  style={styles.inputIcon}
                />
                <TextInput
                  ref={usernameRef}
                  style={styles.input}
                  placeholder="Choose a username"
                  placeholderTextColor={colors.textLight}
                  value={username}
                  onChangeText={(text) => {
                    setUsername(text);
                    setErrors(prev => ({ ...prev, username: '' }));
                  }}
                  onSubmitEditing={() => passwordRef.current?.focus()}
                  autoCapitalize="none"
                  editable={!isLoading}
                  returnKeyType="next"
                  blurOnSubmit={false}
                />
              </View>
              {errors.username && (
                <View style={styles.errorContainer}>
                  <Ionicons name="alert-circle" size={Math.min(hp(1.7), wp(3.7))} color={colors.error} />
                  <Text style={styles.errorText}>{errors.username}</Text>
                </View>
              )}
            </View>

            {/* Password Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Password</Text>
              <View style={[
                styles.inputWrapper,
                focusedField === 'password' && styles.inputWrapperFocused,
                errors.password && styles.inputWrapperError
              ]}>
                <Ionicons 
                  name="lock-closed-outline" 
                  size={Math.min(hp(2.5), wp(5.4))} 
                  color={focusedField === 'password' ? colors.primary : colors.textLight}
                  style={styles.inputIcon}
                />
                <TextInput
                  ref={passwordRef}
                  style={styles.input}
                  placeholder="••••••••"
                  placeholderTextColor={colors.textLight}
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    setErrors(prev => ({ ...prev, password: '' }));
                  }}
                  onSubmitEditing={() => confirmPasswordRef.current?.focus()}
                  secureTextEntry={!showPassword}
                  editable={!isLoading}
                  returnKeyType="next"
                  blurOnSubmit={false}
                />
                <TouchableOpacity 
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeIcon}
                >
                  <Ionicons 
                    name={showPassword ? "eye-outline" : "eye-off-outline"} 
                    size={Math.min(hp(2.5), wp(5.4))} 
                    color={colors.textLight}
                  />
                </TouchableOpacity>
              </View>
              {errors.password && (
                <View style={styles.errorContainer}>
                  <Ionicons name="alert-circle" size={Math.min(hp(1.7), wp(3.7))} color={colors.error} />
                  <Text style={styles.errorText}>{errors.password}</Text>
                </View>
              )}
            </View>

            {/* Confirm Password Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Confirm Password</Text>
              <View style={[
                styles.inputWrapper,
                focusedField === 'confirmPassword' && styles.inputWrapperFocused,
                errors.confirmPassword && styles.inputWrapperError
              ]}>
                <Ionicons 
                  name="shield-checkmark-outline" 
                  size={Math.min(hp(2.5), wp(5.4))} 
                  color={focusedField === 'confirmPassword' ? colors.primary : colors.textLight}
                  style={styles.inputIcon}
                />
                <TextInput
                  ref={confirmPasswordRef}
                  style={styles.input}
                  placeholder="••••••••"
                  placeholderTextColor={colors.textLight}
                  value={confirmPassword}
                  onChangeText={(text) => {
                    setConfirmPassword(text);
                    setErrors(prev => ({ ...prev, confirmPassword: '' }));
                  }}
                  secureTextEntry={!showConfirmPassword}
                  editable={!isLoading}
                  returnKeyType="done"
                  blurOnSubmit={true}
                />
                <TouchableOpacity 
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={styles.eyeIcon}
                >
                  <Ionicons 
                    name={showConfirmPassword ? "eye-outline" : "eye-off-outline"} 
                    size={Math.min(hp(2.5), wp(5.4))} 
                    color={colors.textLight}
                  />
                </TouchableOpacity>
              </View>
              {errors.confirmPassword && (
                <View style={styles.errorContainer}>
                  <Ionicons name="alert-circle" size={Math.min(hp(1.7), wp(3.7))} color={colors.error} />
                  <Text style={styles.errorText}>{errors.confirmPassword}</Text>
                </View>
              )}
            </View>

            {/* Sign Up Button */}
            <TouchableOpacity 
              style={[styles.button, isLoading && styles.buttonDisabled]}
              onPress={handleSignup}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <Text style={styles.buttonText}>Sending OTP...</Text>
              ) : (
                <View style={styles.buttonContent}>
                  <Text style={styles.buttonText}>Send Verification Code</Text>
                  <Ionicons name="arrow-forward" size={Math.min(hp(2.5), wp(5.4))} color="#FFFFFF" style={styles.buttonIcon} />
                </View>
              )}
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.dividerContainer}>
              <View style={styles.divider} />
              <Text style={styles.dividerText}>Already have an account?</Text>
              <View style={styles.divider} />
            </View>

            {/* Login Link */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>Have an account? </Text>
              <TouchableOpacity onPress={() => router.push("/email-login")}>
                <Text style={styles.linkText}>Sign In</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
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
  scrollContent: {
    flexGrow: 1,
  },
  decorativeHeader: {
    height: hp(14.8),
    position: 'relative',
    overflow: 'hidden',
  },
  circle: {
    position: 'absolute',
    borderRadius: 999,
    opacity: 0.1,
  },
  circle1: {
    width: wp(80),
    height: wp(80),
    backgroundColor: colors.primary,
    top: -hp(18.5),
    right: -wp(26.7),
  },
  circle2: {
    width: wp(53.3),
    height: wp(53.3),
    backgroundColor: colors.primary,
    top: hp(2.5),
    left: -wp(21.3),
  },
  formContainer: {
    paddingHorizontal: wp(6.4),
    paddingBottom: hp(4.9),
  },
  header: {
    marginBottom: hp(3.9),
    alignItems: 'center',
  },
  logoContainer: {
    marginBottom: hp(2.5),
  },
  logoBg: {
    width: Math.min(hp(8.6), wp(18.7)),
    height: Math.min(hp(8.6), wp(18.7)),
    borderRadius: Math.min(hp(4.3), wp(9.3)),
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: hp(0.5) },
    shadowOpacity: 0.3,
    shadowRadius: wp(2.1),
    elevation: 5,
  },
  title: {
    fontSize: Math.min(hp(3.9), wp(8.5)),
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: hp(1),
    textAlign: 'center',
  },
  subtitle: {
    fontSize: Math.min(hp(1.9), wp(4)),
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: hp(2.7),
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: hp(3.9),
    marginTop: hp(1),
  },
  progressStep: {
    width: Math.min(hp(4.4), wp(9.6)),
    height: Math.min(hp(4.4), wp(9.6)),
    borderRadius: Math.min(hp(2.2), wp(4.8)),
    borderWidth: 2,
    borderColor: isDarkMode ? colors.gray : '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: isDarkMode ? colors.cardBackground : '#FFFFFF',
  },
  progressStepActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  progressText: {
    fontSize: Math.min(hp(1.8), wp(3.8)),
    fontWeight: '700',
    color: colors.textPrimary,
  },
  progressLine: {
    flex: 1,
    height: hp(0.25),
    backgroundColor: isDarkMode ? colors.gray : '#E5E7EB',
    marginHorizontal: wp(2.1),
  },
  inputContainer: {
    marginBottom: hp(2.5),
  },
  label: {
    fontSize: Math.min(hp(1.8), wp(3.8)),
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: hp(1.2),
    letterSpacing: 0,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: hp(6.9),
    borderWidth: 1.5,
    borderColor: isDarkMode ? colors.gray : '#E5E7EB',
    borderRadius: wp(3.7),
    paddingHorizontal: wp(3.7),
    backgroundColor: isDarkMode ? colors.cardBackground : '#FFFFFF',
  },
  inputWrapperFocused: {
    borderColor: colors.primary,
    borderWidth: 2,
    backgroundColor: isDarkMode ? colors.cardBackground : '#F9FAFB',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: hp(0.25) },
    shadowOpacity: 0.1,
    shadowRadius: wp(1.1),
    elevation: 3,
  },
  inputWrapperError: {
    borderColor: colors.error,
    borderWidth: 2,
  },
  inputIcon: {
    marginRight: wp(2.7),
  },
  input: {
    flex: 1,
    fontSize: Math.min(hp(2), wp(4.3)),
    color: colors.textPrimary,
    fontWeight: '500',
  },
  eyeIcon: {
    padding: wp(2.1),
    marginRight: -wp(2.1),
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: hp(1),
    paddingHorizontal: wp(1.1),
  },
  errorText: {
    color: colors.error,
    fontSize: Math.min(hp(1.6), wp(3.5)),
    marginLeft: wp(1.6),
    fontWeight: '500',
  },
  button: {
    backgroundColor: colors.primary,
    height: hp(6.9),
    borderRadius: wp(3.7),
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: hp(1.5),
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: hp(0.5) },
    shadowOpacity: 0.3,
    shadowRadius: wp(2.1),
    elevation: 5,
    overflow: 'hidden',
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
  buttonIcon: {
    marginLeft: wp(1.1),
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: hp(3.4),
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: isDarkMode ? colors.gray : '#E5E7EB',
  },
  dividerText: {
    marginHorizontal: wp(3.2),
    color: colors.textSecondary,
    fontSize: Math.min(hp(1.6), wp(3.5)),
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: hp(1),
  },
  footerText: {
    fontSize: Math.min(hp(1.9), wp(4)),
    color: colors.textSecondary,
    fontWeight: '500',
  },
  linkText: {
    fontSize: Math.min(hp(1.9), wp(4)),
    color: colors.primary,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
});
