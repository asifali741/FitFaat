import { useTheme } from '@/contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
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
                  <Ionicons name="heart" size={32} color="#FFFFFF" />
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
                  size={20} 
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
                  <Ionicons name="alert-circle" size={14} color={colors.error} />
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
                  size={20} 
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
                  <Ionicons name="alert-circle" size={14} color={colors.error} />
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
                  size={20} 
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
                    size={20} 
                    color={colors.textLight}
                  />
                </TouchableOpacity>
              </View>
              {errors.password && (
                <View style={styles.errorContainer}>
                  <Ionicons name="alert-circle" size={14} color={colors.error} />
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
                  size={20} 
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
                    size={20} 
                    color={colors.textLight}
                  />
                </TouchableOpacity>
              </View>
              {errors.confirmPassword && (
                <View style={styles.errorContainer}>
                  <Ionicons name="alert-circle" size={14} color={colors.error} />
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
                  <Ionicons name="arrow-forward" size={20} color="#FFFFFF" style={styles.buttonIcon} />
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
    height: 120,
    position: 'relative',
    overflow: 'hidden',
  },
  circle: {
    position: 'absolute',
    borderRadius: 999,
    opacity: 0.1,
  },
  circle1: {
    width: 300,
    height: 300,
    backgroundColor: colors.primary,
    top: -150,
    right: -100,
  },
  circle2: {
    width: 200,
    height: 200,
    backgroundColor: colors.primary,
    top: 20,
    left: -80,
  },
  formContainer: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 32,
    alignItems: 'center',
  },
  logoContainer: {
    marginBottom: 20,
  },
  logoBg: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
    marginTop: 8,
  },
  progressStep: {
    width: 36,
    height: 36,
    borderRadius: 18,
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
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  progressLine: {
    flex: 1,
    height: 2,
    backgroundColor: isDarkMode ? colors.gray : '#E5E7EB',
    marginHorizontal: 8,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 10,
    letterSpacing: 0.3,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    borderWidth: 1.5,
    borderColor: isDarkMode ? colors.gray : '#E5E7EB',
    borderRadius: 14,
    paddingHorizontal: 14,
    backgroundColor: isDarkMode ? colors.cardBackground : '#FFFFFF',
  },
  inputWrapperFocused: {
    borderColor: colors.primary,
    borderWidth: 2,
    backgroundColor: isDarkMode ? colors.cardBackground : '#F9FAFB',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  inputWrapperError: {
    borderColor: colors.error,
    borderWidth: 2,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  eyeIcon: {
    padding: 8,
    marginRight: -8,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingHorizontal: 4,
  },
  errorText: {
    color: colors.error,
    fontSize: 13,
    marginLeft: 6,
    fontWeight: '500',
  },
  button: {
    backgroundColor: colors.primary,
    height: 56,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
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
    gap: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  buttonIcon: {
    marginLeft: 4,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 28,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: isDarkMode ? colors.gray : '#E5E7EB',
  },
  dividerText: {
    marginHorizontal: 12,
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 8,
  },
  footerText: {
    fontSize: 15,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  linkText: {
    fontSize: 15,
    color: colors.primary,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
});
