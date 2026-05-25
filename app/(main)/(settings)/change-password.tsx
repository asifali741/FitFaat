import AppHeader from "@/components/AppHeader";
import { useTheme } from "@/contexts/ThemeContext";
import { tokenStorage } from "@/utils/auth/tokenStorage";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from "expo-constants";
import { useRouter } from "expo-router";
import * as NavigationBar from 'expo-navigation-bar';
import * as SecureStore from 'expo-secure-store';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from "react-native-responsive-screen";
import { SafeAreaView } from "react-native-safe-area-context";
import { getBackendBaseUrl } from '@/utils/config';

const ENV = Constants.expoConfig?.extra;

const getAPIURL = () => {
  const envUrl = ENV?.EXPO_PUBLIC_BACKEND_API_URL;
  if (envUrl) {
    return envUrl.replace(/\/api\/?$/, '');
  }
  return getBackendBaseUrl();
};

const API_URL = getAPIURL();

export default function ChangePassword() {
  const router = useRouter();
  const { colors } = useTheme();
  
  const [formData, setFormData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  
  const [errors, setErrors] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  
  const [isChanging, setIsChanging] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);

  useEffect(() => {
    // Set Android navigation bar to white
    if (Platform.OS === 'android') {
      NavigationBar.setBackgroundColorAsync('#FFFFFF').catch(() => {});
      NavigationBar.setButtonStyleAsync('dark').catch(() => {});
      NavigationBar.setStyle('light');
    }
  }, []);

  const checkPasswordStrength = (password: string) => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) strength++;
    return strength;
  };

  const validateForm = () => {
    const newErrors = {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    };
    
    if (!formData.currentPassword) {
      newErrors.currentPassword = "Current password is required";
    }
    
    if (!formData.newPassword) {
      newErrors.newPassword = "New password is required";
    } else if (formData.newPassword.length < 8) {
      newErrors.newPassword = "Password must be at least 8 characters";
    } else if (formData.newPassword === formData.currentPassword) {
      newErrors.newPassword = "New password must be different from current password";
    }
    
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = "Please confirm your new password";
    } else if (formData.confirmPassword !== formData.newPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }
    
    setErrors(newErrors);
    return !newErrors.currentPassword && !newErrors.newPassword && !newErrors.confirmPassword;
  };

  const handleChangePassword = async () => {
    if (!validateForm()) return;

    setIsChanging(true);
    try {
      const token = await SecureStore.getItemAsync('fitfaat_auth_token');

      if (!token) {
        Alert.alert("Error", "Authentication required. Please log in again.");
        return;
      }

      const response = await fetch(`${API_URL}/api/user/change-password`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentPassword: formData.currentPassword,
          newPassword: formData.newPassword,
        }),
      });

      const data = await response.json();

      if (data.success) {
        Alert.alert(
          "Success",
          "Your password has been changed successfully. Please log in with your new password.",
          [{
            text: "OK",
            onPress: async () => {
              await tokenStorage.clearAll();
              await AsyncStorage.removeItem('weeklyTrackingId');
              setFormData({
                currentPassword: "",
                newPassword: "",
                confirmPassword: "",
              });
              router.replace('/(auth)/email-login');
            }
          }]
        );
      } else {
        Alert.alert("Error", data.message || "Failed to change password");
      }
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to change password");
    } finally {
      setIsChanging(false);
    }
  };

  const handleForgotCurrentPassword = () => {
    Alert.alert(
      "Reset Password",
      "You will be signed out so you can reset your password using your email.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Continue",
          onPress: async () => {
            await tokenStorage.clearAll();
            await AsyncStorage.removeItem('weeklyTrackingId');
            router.replace('/forgot-password');
          }
        }
      ]
    );
  };

  const getPasswordStrengthColor = () => {
    if (passwordStrength <= 1) return colors.error;
    if (passwordStrength <= 3) return "#FFA500";
    return colors.success;
  };

  const getPasswordStrengthText = () => {
    if (passwordStrength === 0) return "";
    if (passwordStrength <= 1) return "Weak";
    if (passwordStrength <= 3) return "Medium";
    return "Strong";
  };

  const styles = getStyles(colors);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" backgroundColor="#FFFFFF" translucent={false} />
      <AppHeader 
        title="Change Password"
        showStepIndicator={false}
        showMenuButton={false}
        showBackButton={true}
      />

      <View style={styles.content}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Authentication Method Badge */}
            <View style={styles.authBadgeContainer}>
              <View style={[styles.authBadge, { backgroundColor: colors.secondary }]}>
                <Ionicons 
                  name="mail"
                  size={16} 
                  color="white" 
                />
                <Text style={styles.authBadgeText}>
                  Email Authentication
                </Text>
              </View>
            </View>

            {/* Security Notice */}
            <View style={styles.securityNotice}>
              <Ionicons name="shield-checkmark" size={26} color={colors.primary} />
              <Text style={styles.securityText}>
                After changing your password, you will be logged out. Please log in with your new password.
              </Text>
            </View>

            {/* Password Form */}
            <View style={styles.form}>
              {/* Current Password */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Current Password</Text>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.input}
                    value={formData.currentPassword}
                    onChangeText={(text) => {
                      setFormData({ ...formData, currentPassword: text });
                      setErrors({ ...errors, currentPassword: "" });
                    }}
                    placeholder="Enter current password"
                    placeholderTextColor={colors.textSecondary}
                    secureTextEntry={!showPasswords.current}
                  />
                  <TouchableOpacity 
                    style={styles.eyeButton}
                    onPress={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                  >
                    <Ionicons 
                      name={showPasswords.current ? "eye-off-outline" : "eye-outline"} 
                      size={20} 
                      color={colors.textSecondary} 
                    />
                  </TouchableOpacity>
                </View>
                {errors.currentPassword ? (
                  <Text style={styles.errorText}>{errors.currentPassword}</Text>
                ) : null}
              </View>

              {/* New Password */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>New Password</Text>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.input}
                    value={formData.newPassword}
                    onChangeText={(text) => {
                      setFormData({ ...formData, newPassword: text });
                      setErrors({ ...errors, newPassword: "" });
                      setPasswordStrength(checkPasswordStrength(text));
                    }}
                    placeholder="Enter new password"
                    placeholderTextColor={colors.textSecondary}
                    secureTextEntry={!showPasswords.new}
                  />
                  <TouchableOpacity 
                    style={styles.eyeButton}
                    onPress={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                  >
                    <Ionicons 
                      name={showPasswords.new ? "eye-off-outline" : "eye-outline"} 
                      size={20} 
                      color={colors.textSecondary} 
                    />
                  </TouchableOpacity>
                </View>
                
                {/* Password Strength Indicator */}
                {formData.newPassword && (
                  <View style={styles.strengthContainer}>
                    <View style={styles.strengthBars}>
                      {[1, 2, 3, 4, 5].map((level) => (
                        <View
                          key={level}
                          style={[
                            styles.strengthBar,
                            level <= passwordStrength && {
                              backgroundColor: getPasswordStrengthColor()
                            }
                          ]}
                        />
                      ))}
                    </View>
                    <Text style={[styles.strengthText, { color: getPasswordStrengthColor() }]}>
                      {getPasswordStrengthText()}
                    </Text>
                  </View>
                )}
                
                {errors.newPassword ? (
                  <Text style={styles.errorText}>{errors.newPassword}</Text>
                ) : null}
              </View>

              {/* Confirm Password */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Confirm New Password</Text>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.input}
                    value={formData.confirmPassword}
                    onChangeText={(text) => {
                      setFormData({ ...formData, confirmPassword: text });
                      setErrors({ ...errors, confirmPassword: "" });
                    }}
                    placeholder="Confirm new password"
                    placeholderTextColor={colors.textSecondary}
                    secureTextEntry={!showPasswords.confirm}
                  />
                  <TouchableOpacity 
                    style={styles.eyeButton}
                    onPress={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                  >
                    <Ionicons 
                      name={showPasswords.confirm ? "eye-off-outline" : "eye-outline"} 
                      size={20} 
                      color={colors.textSecondary} 
                    />
                  </TouchableOpacity>
                </View>
                {errors.confirmPassword ? (
                  <Text style={styles.errorText}>{errors.confirmPassword}</Text>
                ) : null}
              </View>
            </View>

            {/* Password Requirements */}
            <View style={styles.requirements}>
              <Text style={styles.requirementsTitle}>Password Requirements:</Text>
              <View style={styles.requirementItem}>
                <Ionicons 
                  name="checkmark-circle" 
                  size={16} 
                  color={formData.newPassword.length >= 8 ? colors.success : colors.textSecondary} 
                />
                <Text style={[
                  styles.requirementText,
                  formData.newPassword.length >= 8 && styles.requirementMet
                ]}>
                  At least 8 characters
                </Text>
              </View>
              <View style={styles.requirementItem}>
                <Ionicons 
                  name="checkmark-circle" 
                  size={16} 
                  color={/[A-Z]/.test(formData.newPassword) && /[a-z]/.test(formData.newPassword) ? colors.success : colors.textSecondary} 
                />
                <Text style={[
                  styles.requirementText,
                  /[A-Z]/.test(formData.newPassword) && /[a-z]/.test(formData.newPassword) && styles.requirementMet
                ]}>
                  Mix of uppercase and lowercase letters
                </Text>
              </View>
              <View style={styles.requirementItem}>
                <Ionicons 
                  name="checkmark-circle" 
                  size={16} 
                  color={/\d/.test(formData.newPassword) ? colors.success : colors.textSecondary} 
                />
                <Text style={[
                  styles.requirementText,
                  /\d/.test(formData.newPassword) && styles.requirementMet
                ]}>
                  At least one number
                </Text>
              </View>
              <View style={styles.requirementItem}>
                <Ionicons 
                  name="checkmark-circle" 
                  size={16} 
                  color={/[!@#$%^&*(),.?":{}|<>]/.test(formData.newPassword) ? colors.success : colors.textSecondary} 
                />
                <Text style={[
                  styles.requirementText,
                  /[!@#$%^&*(),.?":{}|<>]/.test(formData.newPassword) && styles.requirementMet
                ]}>
                  At least one special character
                </Text>
              </View>
            </View>

            {/* Action Buttons */}
            <TouchableOpacity 
              style={[styles.changeButton, isChanging && styles.changeButtonDisabled]}
              onPress={handleChangePassword}
              disabled={isChanging}
            >
              <Text style={styles.changeButtonText}>
                {isChanging ? "Changing Password..." : "Change Password"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.forgotButton} onPress={handleForgotCurrentPassword}>
              <Text style={styles.forgotButtonText}>Forgot your current password?</Text>
            </TouchableOpacity>

            <View style={{ height: hp(4) }} />
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </SafeAreaView>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.screenColor || '#FFFFFF',
  },
  content: {
    flex: 1,
    backgroundColor: colors.screenColor,
  },
  authBadgeContainer: {
    alignItems: 'center',
    paddingTop: hp(2),
    paddingBottom: hp(1),
  },
  authBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: hp(1),
    paddingHorizontal: wp(5),
    borderRadius: hp(3),
    gap: wp(2),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  authBadgeText: {
    color: 'white',
    fontSize: hp(1.6),
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  securityNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary + '15',
    marginHorizontal: wp(5),
    marginTop: hp(2),
    padding: wp(4.5),
    borderRadius: hp(2),
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  securityText: {
    flex: 1,
    fontSize: hp(1.6),
    color: colors.primary,
    marginLeft: wp(3),
    lineHeight: hp(2.4),
    fontWeight: '600',
  },
  form: {
    marginTop: hp(3),
    marginHorizontal: wp(5),
  },
  inputGroup: {
    marginBottom: hp(2.5),
  },
  label: {
    fontSize: hp(1.7),
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: hp(1),
    letterSpacing: 0.3,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: hp(1.8),
    borderWidth: 1.5,
    borderColor: colors.primary + '30',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  input: {
    flex: 1,
    paddingHorizontal: wp(4),
    paddingVertical: hp(2),
    fontSize: hp(1.8),
    color: colors.textPrimary,
    fontWeight: '600',
  },
  eyeButton: {
    padding: wp(3.5),
  },
  errorText: {
    fontSize: hp(1.5),
    color: colors.error,
    marginTop: hp(0.7),
    marginLeft: wp(2),
    fontWeight: '600',
  },
  strengthContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: hp(1.2),
  },
  strengthBars: {
    flexDirection: 'row',
    flex: 1,
    gap: wp(1.5),
  },
  strengthBar: {
    flex: 1,
    height: hp(0.7),
    backgroundColor: colors.textSecondary + '30',
    borderRadius: hp(0.35),
  },
  strengthText: {
    fontSize: hp(1.5),
    fontWeight: '700',
    marginLeft: wp(3),
    letterSpacing: 0.5,
  },
  requirements: {
    marginHorizontal: wp(5),
    marginTop: hp(2.5),
    backgroundColor: 'white',
    padding: wp(5),
    borderRadius: hp(2),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  requirementsTitle: {
    fontSize: hp(1.8),
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: hp(2),
    letterSpacing: 0.3,
  },
  requirementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: hp(1.2),
  },
  requirementText: {
    fontSize: hp(1.5),
    color: colors.textSecondary,
    marginLeft: wp(2.5),
    fontWeight: '500',
  },
  requirementMet: {
    color: colors.success,
    fontWeight: '700',
  },
  changeButton: {
    backgroundColor: colors.primary,
    marginHorizontal: wp(5),
    marginTop: hp(3.5),
    paddingVertical: hp(2.2),
    borderRadius: hp(2),
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  changeButtonDisabled: {
    opacity: 0.6,
  },
  changeButtonText: {
    color: 'white',
    fontSize: hp(1.9),
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  forgotButton: {
    alignItems: 'center',
    marginTop: hp(2.5),
    paddingVertical: hp(1),
  },
  forgotButtonText: {
    fontSize: hp(1.6),
    color: colors.primary,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
});
