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

export default function Login() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  
  const identifierRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  
  const router = useRouter();
  const { colors, isDarkMode } = useTheme();
  const styles = getStyles(colors, isDarkMode);

  const handleLogin = async () => {
    try {
      if (!identifier || !password) {
        Alert.alert('Error', 'Please fill in all fields');
        return;
      }

      setIsLoading(true);
      await authApi.login({
        identifier,
        password
      });
      
      // Check onboarding status
      const { isOnboardingComplete } = await authApi.getOnboardingStatus();
      
      // Redirect based on onboarding status
      if (!isOnboardingComplete) {
        router.push("/DietSection");
      } else {
        // Navigate to the dashboard
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
          scrollEnabled={false}
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
              <Text style={styles.title}>Welcome Back!</Text>
              <Text style={styles.subtitle}>Sign in to continue your fitness journey</Text>
            </View>
            
            {/* Email/Username Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Email or Username</Text>
              <View style={[
                styles.inputWrapper,
                focusedField === 'identifier' && styles.inputWrapperFocused
              ]}>
                <Ionicons 
                  name="mail-outline" 
                  size={Math.min(hp(2.5), wp(5.4))} 
                  color={focusedField === 'identifier' ? colors.primary : colors.textLight}
                  style={styles.inputIcon}
                />
                <TextInput
                  ref={identifierRef}
                  style={styles.input}
                  placeholder="your@email.com"
                  placeholderTextColor={colors.textLight}
                  value={identifier}
                  onChangeText={setIdentifier}
                  onSubmitEditing={() => passwordRef.current?.focus()}
                  autoCapitalize="none"
                  editable={!isLoading}
                  returnKeyType="next"
                  blurOnSubmit={false}
                />
              </View>
            </View>

            {/* Password Input */}
            <View style={styles.inputContainer}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>Password</Text>
                <TouchableOpacity onPress={() => router.push("/forgot-password")}>
                {/* <Text style={styles.forgotText}>Forgot?</Text> */}
                </TouchableOpacity>
              </View>
              <View style={[
                styles.inputWrapper,
                focusedField === 'password' && styles.inputWrapperFocused
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
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  editable={!isLoading}
                  returnKeyType="done"
                  blurOnSubmit={true}
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
            </View>

            {/* Login Button */}
            <TouchableOpacity 
              style={[styles.button, isLoading && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <View style={styles.loadingContainer}>
                  <Text style={styles.buttonText}>Signing in...</Text>
                </View>
              ) : (
                <View style={styles.buttonContent}>
                  <Text style={styles.buttonText}>Sign In</Text>
                  <Ionicons name="arrow-forward" size={Math.min(hp(2.5), wp(5.4))} color="#FFFFFF" style={styles.buttonIcon} />
                </View>
              )}
            </TouchableOpacity>

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
    marginBottom: hp(4.9),
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
  inputContainer: {
    marginBottom: hp(2.7),
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: hp(1.2),
  },
  label: {
    fontSize: Math.min(hp(1.8), wp(3.8)),
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: 0,
  },
  forgotText: {
    fontSize: Math.min(hp(1.6), wp(3.5)),
    color: colors.primary,
    fontWeight: '600',
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
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
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
