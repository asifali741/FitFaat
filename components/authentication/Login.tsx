import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { authApi } from '../../utils/auth/authApi';
import { useTheme } from '@/contexts/ThemeContext';

export default function Login() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
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
        router.replace("/DietSection");
      } else {
        router.replace("/(main)");
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
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.formContainer}>
            <View style={styles.header}>
              <Text style={styles.title}>Welcome Back!</Text>
              <Text style={styles.subtitle}>Sign in to continue to FitFaat</Text>
            </View>
            
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Email or Username</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your email or username"
                placeholderTextColor={colors.textLight}
                value={identifier}
                onChangeText={setIdentifier}
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your password"
                placeholderTextColor={colors.textLight}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>

            <TouchableOpacity 
              style={[styles.button, isLoading && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              <Text style={styles.buttonText}>{isLoading ? 'Logging in...' : 'Login'}</Text>
            </TouchableOpacity>

            <View style={styles.footer}>
              <Text style={styles.footerText}>Don't have an account? </Text>
              <TouchableOpacity onPress={() => router.push("/auth/email-signup")}>
                <Text style={styles.linkText}>Sign Up</Text>
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
    justifyContent: 'center',
  },
  formContainer: {
    padding: 24,
    minHeight: 500,
    justifyContent: 'center',
  },
  header: {
    marginBottom: 40,
  },
  title: {
    fontSize: Math.min(32, 28),
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: Math.min(16, 15),
    color: colors.textSecondary,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  input: {
    minHeight: 52,
    height: 56,
    borderWidth: 1.5,
    borderColor: isDarkMode ? colors.gray : '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: colors.textPrimary,
    backgroundColor: isDarkMode ? colors.cardBackground : '#FFFFFF',
  },
  button: {
    backgroundColor: colors.primary,
    minHeight: 52,
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  footerText: {
    fontSize: 15,
    color: colors.textSecondary,
  },
  linkText: {
    fontSize: 15,
    color: colors.primary,
    fontWeight: '700',
  },
});
