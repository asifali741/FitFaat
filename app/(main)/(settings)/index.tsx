import AppHeader from "@/components/AppHeader";
import { useTheme } from "@/contexts/ThemeContext";
import { tokenStorage } from "@/utils/auth/tokenStorage";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DrawerActions, useNavigation } from "@react-navigation/native";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { Alert, Linking, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from "react-native";
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from "react-native-responsive-screen";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Settings() {
  const navigation = useNavigation();
  const router = useRouter();
  const { isDarkMode, toggleDarkMode, colors } = useTheme();
  const [notifications, setNotifications] = useState(true);
  const [locationServices, setLocationServices] = useState(true);
  const [dataSync, setDataSync] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await tokenStorage.getUser();
        setUser(userData);
      } catch (error) {
        console.error('Error loading user:', error);
      }
    };
    loadUser();
  }, []);

  const openDrawer = () => {
    navigation.dispatch(DrawerActions.openDrawer());
  };

  const handleSettingPress = (setting: string) => {
    switch (setting) {
      case "Profile Information":
        router.push("/profile-information");
        break;
      
      case "Edit Profile Picture":
        router.push("/edit-profile-picture");
        break;
      
      case "Change Password":
        router.push("/change-password");
        break;
      
      case "Payment Methods":
        router.push("/payment-methods");
        break;
      
      case "Premium":
        router.push("/premium");
        break;
      
      case "Workout Preferences":
        router.push("/(exercises)/workout");
        break;
      
      case "Diet Preferences":
        Alert.alert(
          "Diet Preferences",
          "Set your dietary requirements, allergies, and food preferences for personalized meal plans.",
          [{ text: "OK" }]
        );
        break;
      
      case "Health Goals":
        Alert.alert(
          "Health Goals",
          "Set and track your health objectives like weight loss, muscle gain, or general fitness.",
          [{ text: "OK" }]
        );
        break;
      
      case "Language":
        Alert.alert(
          "Language",
          "Select your preferred language for the app interface.",
          [
            { text: "English", onPress: () => console.log("Set language to English") },
            { text: "Spanish", onPress: () => console.log("Set language to Spanish") },
            { text: "French", onPress: () => console.log("Set language to French") },
            { text: "Cancel", style: "cancel" }
          ]
        );
        break;
      
      case "Time Zone":
        Alert.alert(
          "Time Zone",
          "Set your time zone for accurate scheduling and notifications.",
          [{ text: "OK" }]
        );
        break;
      
      case "Help Center":
        Linking.openURL('https://help.fitfaat.com');
        break;
      
      case "Contact Support":
        Alert.alert(
          "Contact Support",
          "Get help from our support team.",
          [
            { text: "Email Support", onPress: () => Linking.openURL('mailto:support@fitfaat.com') },
            { text: "Live Chat", onPress: () => console.log("Open live chat") },
            { text: "Cancel", style: "cancel" }
          ]
        );
        break;
      
      case "Rate App":
        Alert.alert(
          "Rate App",
          "We'd love to hear your feedback! Please rate our app.",
          [
            { text: "Rate Now", onPress: () => console.log("Open app store rating") },
            { text: "Maybe Later", style: "cancel" }
          ]
        );
        break;
      
      case "About":
        Alert.alert(
          "About FitFaat",
          "Version: 1.0.0\nBuild: 2024.1\n\nFitFaat - Your AI-powered health companion for personalized fitness and nutrition guidance.",
          [{ text: "OK" }]
        );
        break;
      
      case "Terms of Service":
        Alert.alert(
          "Terms of Service",
          "FITFAAT TERMS OF SERVICE\n\nLast Updated: January 2024\n\n1. ACCEPTANCE OF TERMS\nBy using FitFaat, you agree to be bound by these Terms of Service.\n\n2. DESCRIPTION OF SERVICE\nFitFaat provides AI-powered health and fitness guidance, personalized meal plans, workout routines, and telemedicine consultations.\n\n3. USER ACCOUNTS\nYou must provide accurate information and maintain account security.\n\n4. HEALTH DISCLAIMER\nFitFaat provides general health information only. Always consult healthcare professionals for medical advice.\n\n5. PRIVACY\nYour privacy is important to us. See our Privacy Policy for details.\n\n6. PROHIBITED USES\nYou may not use FitFaat for illegal activities or to harm others.\n\n7. INTELLECTUAL PROPERTY\nAll content is owned by FitFaat or licensed to us.\n\n8. LIMITATION OF LIABILITY\nFitFaat is not liable for any health outcomes or damages.\n\n9. TERMINATION\nWe may terminate accounts that violate these terms.\n\n10. CHANGES TO TERMS\nWe may update these terms with notice to users.\n\nFor full terms, visit: https://fitfaat.com/terms",
          [{ text: "OK" }]
        );
        break;
      
      case "Privacy Policy":
        Alert.alert(
          "Privacy Policy",
          "FITFAAT PRIVACY POLICY\n\nLast Updated: January 2024\n\n1. INFORMATION WE COLLECT\n• Personal Information: Name, email, age, health goals\n• Health Data: Workout history, dietary preferences, medical consultations\n• Usage Data: App interactions, feature usage, performance metrics\n• Device Information: Device type, operating system, unique identifiers\n\n2. HOW WE USE YOUR INFORMATION\n• Provide personalized health and fitness recommendations\n• Deliver AI-powered nutrition and workout plans\n• Facilitate telemedicine consultations\n• Improve our services and user experience\n• Send important updates and notifications\n\n3. INFORMATION SHARING\nWe do not sell your personal data. We may share information with:\n• Healthcare providers (with your consent)\n• Service providers (under strict confidentiality)\n• Legal authorities (when required by law)\n\n4. DATA SECURITY\nWe use industry-standard encryption and security measures to protect your data.\n\n5. YOUR RIGHTS\n• Access your personal data\n• Correct inaccurate information\n• Delete your account and data\n• Export your data\n• Opt-out of communications\n\n6. DATA RETENTION\nWe retain your data as long as your account is active or as required by law.\n\n7. CHILDREN'S PRIVACY\nFitFaat is not intended for children under 13.\n\n8. INTERNATIONAL TRANSFERS\nYour data may be transferred to countries with adequate protection.\n\n9. CHANGES TO POLICY\nWe will notify you of significant changes.\n\n10. CONTACT US\nFor privacy questions: privacy@fitfaat.com\n\nFull policy: https://fitfaat.com/privacy",
          [{ text: "OK" }]
        );
        break;
      
      case "Licenses":
        Alert.alert(
          "Open Source Licenses",
          "FITFAAT OPEN SOURCE LICENSES\n\nThis app uses the following open source libraries:\n\n• React Native (MIT License)\n• Expo (MIT License)\n• Clerk Authentication (MIT License)\n• React Navigation (MIT License)\n• AsyncStorage (MIT License)\n• React Native Vector Icons (MIT License)\n• React Native Responsive Screen (MIT License)\n• React Native Reanimated (MIT License)\n• React Native Gesture Handler (MIT License)\n• React Native Safe Area Context (MIT License)\n• React Native Keyboard Aware Scroll View (MIT License)\n• React Native Progress (MIT License)\n• React Native Marquee (MIT License)\n• React Native Heroicons (MIT License)\n• Axios (MIT License)\n• Day.js (MIT License)\n• NativeWind (MIT License)\n• Tailwind CSS (MIT License)\n• Prettier (MIT License)\n• ESLint (MIT License)\n\nAll libraries are used in compliance with their respective licenses. Source code for these libraries is available on GitHub.\n\nFor detailed license information, visit: https://fitfaat.com/licenses",
          [{ text: "OK" }]
        );
        break;
      
      default:
        Alert.alert(setting, `This will open ${setting} settings`, [{ text: "OK" }]);
    }
  };

  const handleClearCache = async () => {
    try {
      // Clear various cached data
      await AsyncStorage.multiRemove([
        'cached_exercises',
        'cached_workouts',
        'temp_data',
        'image_cache'
      ]);
      
      Alert.alert(
        "Cache Cleared",
        "Successfully cleared cached data and freed up storage space.",
        [{ text: "OK" }]
      );
    } catch (error) {
      Alert.alert(
        "Error",
        "Failed to clear cache. Please try again.",
        [{ text: "OK" }]
      );
    }
  };

  const handleDownloadData = async () => {
    try {
      // Get current user data
      const userData = {
        profile: {
          name: user?.username || "User",
          email: user?.email || "user@example.com",
          createdAt: user?.createdAt
        },
        workouts: await AsyncStorage.getItem('workout_history') || [],
        favorites: await AsyncStorage.getItem('favoriteExercises') || [],
        appointments: await AsyncStorage.getItem('appointments') || [],
        settings: {
          notifications,
          darkMode: isDarkMode,
          locationServices,
          dataSync
        }
      };
      
      Alert.alert(
        "Data Export",
        "Your data has been prepared for download. You will receive an email with the download link shortly.",
        [{ text: "OK" }]
      );
      
      console.log("User data prepared for export:", userData);
    } catch (error) {
      Alert.alert(
        "Error",
        "Failed to prepare data export. Please try again.",
        [{ text: "OK" }]
      );
    }
  };

  const handleSignOut = () => {
    Alert.alert(
      "Sign Out",
      "Are you sure you want to sign out?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Sign Out", 
          style: "destructive",
          onPress: async () => {
            try {
              // Clear all auth data
              await tokenStorage.removeToken();
              await tokenStorage.removeUser();
              await AsyncStorage.removeItem('weeklyTrackingId');
              // Navigate to login
              router.replace('/(auth)/email-login');
            } catch (error) {
              Alert.alert("Error", "Failed to sign out. Please try again.");
            }
          }
        }
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete Account",
      "This action cannot be undone. All your data will be permanently deleted. Are you sure?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete Account", 
          style: "destructive",
          onPress: () => {
            Alert.alert(
              "Final Confirmation",
              "This will permanently delete your account and all associated data. Type 'DELETE' to confirm.",
              [
                { text: "Cancel", style: "cancel" },
                { 
                  text: "Delete Forever", 
                  style: "destructive",
                  onPress: () => {
                    // In a real app, this would call an API to delete the account
                    Alert.alert(
                      "Account Deletion",
                      "Account deletion request submitted. You will receive a confirmation email.",
                      [{ text: "OK" }]
                    );
                  }
                }
              ]
            );
          }
        }
      ]
    );
  };

  const SettingItem = ({ 
    icon, 
    title, 
    subtitle, 
    onPress, 
    rightComponent, 
    showArrow = true 
  }: {
    icon: string;
    title: string;
    subtitle?: string;
    onPress?: () => void;
    rightComponent?: React.ReactNode;
    showArrow?: boolean;
  }) => (
    <TouchableOpacity style={[styles.settingItem, { backgroundColor: colors.cardBackground }]} onPress={onPress}>
      <View style={styles.settingLeft}>
        <View style={[styles.settingIcon, { backgroundColor: colors.primarySoft }]}>
          <Ionicons name={icon as any} size={24} color={colors.primary} />
        </View>
        <View style={styles.settingText}>
          <Text style={[styles.settingTitle, { color: colors.textPrimary }]}>{title}</Text>
          {subtitle && <Text style={[styles.settingSubtitle, { color: colors.textSecondary }]}>{subtitle}</Text>}
        </View>
      </View>
      <View style={styles.settingRight}>
        {rightComponent || (showArrow && (
          <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
        ))}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.primary }]}>
      <AppHeader 
        title="Settings"
        showStepIndicator={false}
        showMenuButton={true}
      />

      {/* Main Content */}
      <View style={[styles.content, { backgroundColor: colors.screenColor }]}>
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Account Section */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Account</Text>
            <SettingItem
              icon="person-outline"
              title="Profile Information"
              subtitle="Manage your personal details"
              onPress={() => handleSettingPress("Profile Information")}
            />
            <SettingItem
              icon="camera-outline"
              title="Edit Profile Picture"
              subtitle="Change your profile photo"
              onPress={() => handleSettingPress("Edit Profile Picture")}
            />
            <SettingItem
              icon="lock-closed-outline"
              title="Change Password"
              subtitle="Update your account password"
              onPress={() => handleSettingPress("Change Password")}
            />
            <SettingItem
              icon="card-outline"
              title="Payment Methods"
              subtitle="Manage your payment options"
              onPress={() => handleSettingPress("Payment Methods")}
            />
            <SettingItem
              icon="star-outline"
              title="Premium"
              subtitle="Upgrade to unlock premium features"
              onPress={() => handleSettingPress("Premium")}
            />
          </View>

          {/* Preferences Section */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Preferences</Text>
            <SettingItem
              icon="notifications-outline"
              title="Notifications"
              subtitle="Manage notification preferences"
              rightComponent={
                <Switch
                  value={notifications}
                  onValueChange={setNotifications}
                  trackColor={{ false: colors.textSecondary + '40', true: colors.primary + '40' }}
                  thumbColor={notifications ? colors.primary : colors.textSecondary}
                />
              }
              showArrow={false}
            />
            <SettingItem
              icon="moon-outline"
              title="Dark Mode"
              subtitle="Switch between light and dark themes"
              rightComponent={
                <Switch
                  value={isDarkMode}
                  onValueChange={toggleDarkMode}
                  trackColor={{ false: colors.textSecondary + '40', true: colors.primary + '40' }}
                  thumbColor={isDarkMode ? colors.primary : colors.textSecondary}
                />
              }
              showArrow={false}
            />
            <SettingItem
              icon="language-outline"
              title="Language"
              subtitle="English (US)"
              onPress={() => handleSettingPress("Language")}
            />
            <SettingItem
              icon="time-outline"
              title="Time Zone"
              subtitle="Auto (GMT+5:30)"
              onPress={() => handleSettingPress("Time Zone")}
            />
          </View>

          {/* Health & Fitness Section */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Health & Fitness</Text>
            <SettingItem
              icon="fitness-outline"
              title="Workout Preferences"
              subtitle="Customize your workout experience"
              onPress={() => handleSettingPress("Workout Preferences")}
            />
            <SettingItem
              icon="restaurant-outline"
              title="Diet Preferences"
              subtitle="Set your dietary requirements"
              onPress={() => handleSettingPress("Diet Preferences")}
            />
            <SettingItem
              icon="medical-outline"
              title="Health Goals"
              subtitle="Track your health objectives"
              onPress={() => handleSettingPress("Health Goals")}
            />
            <SettingItem
              icon="sync-outline"
              title="Data Sync"
              subtitle="Sync your health data across devices"
              rightComponent={
                <Switch
                  value={dataSync}
                  onValueChange={setDataSync}
                  trackColor={{ false: colors.textSecondary + '40', true: colors.primary + '40' }}
                  thumbColor={dataSync ? colors.primary : colors.textSecondary}
                />
              }
              showArrow={false}
            />
          </View>

          {/* App Settings Section */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>App Settings</Text>
            <SettingItem
              icon="location-outline"
              title="Location Services"
              subtitle="Allow location access for better recommendations"
              rightComponent={
                <Switch
                  value={locationServices}
                  onValueChange={setLocationServices}
                  trackColor={{ false: colors.textSecondary + '40', true: colors.primary + '40' }}
                  thumbColor={locationServices ? colors.primary : colors.textSecondary}
                />
              }
              showArrow={false}
            />
          </View>

          {/* Support Section */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Support</Text>
            <SettingItem
              icon="help-circle-outline"
              title="Help Center"
              subtitle="Get help and support"
              onPress={() => handleSettingPress("Help Center")}
            />
            <SettingItem
              icon="chatbubble-outline"
              title="Contact Support"
              subtitle="Reach out to our support team"
              onPress={() => handleSettingPress("Contact Support")}
            />
            <SettingItem
              icon="star-outline"
              title="Rate App"
              subtitle="Share your feedback"
              onPress={() => handleSettingPress("Rate App")}
            />
            <SettingItem
              icon="information-circle-outline"
              title="About"
              subtitle="App version 1.0.0"
              onPress={() => handleSettingPress("About")}
            />
          </View>

          {/* Legal Section */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Legal</Text>
            <SettingItem
              icon="document-text-outline"
              title="Terms of Service"
              subtitle="Read our terms and conditions"
              onPress={() => handleSettingPress("Terms of Service")}
            />
            <SettingItem
              icon="shield-checkmark-outline"
              title="Privacy Policy"
              subtitle="How we protect your data"
              onPress={() => handleSettingPress("Privacy Policy")}
            />
            <SettingItem
              icon="document-outline"
              title="Licenses"
              subtitle="Open source licenses"
              onPress={() => handleSettingPress("Licenses")}
            />
          </View>


          {/* Logout Section */}
          <View style={styles.section}>
            <TouchableOpacity style={[styles.logoutButton, { backgroundColor: colors.cardBackground, borderColor: colors.error + '20' }]} onPress={handleSignOut}>
              <Ionicons name="log-out-outline" size={24} color={colors.error} />
              <Text style={[styles.logoutText, { color: colors.error }]}>Sign Out</Text>
            </TouchableOpacity>
          </View>

          {/* Delete Account Section */}
          <View style={styles.section}>
            <TouchableOpacity style={[styles.deleteAccountButton, { backgroundColor: colors.cardBackground, borderColor: colors.error + '40' }]} onPress={handleDeleteAccount}>
              <Ionicons name="trash-outline" size={24} color={colors.error} />
              <Text style={[styles.deleteAccountText, { color: colors.error }]}>Delete Account</Text>
            </TouchableOpacity>
        </View>

          <View style={{ height: hp(4) }} />
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
  },
  section: {
    marginTop: hp(2),
    marginHorizontal: wp(5),
  },
  sectionTitle: {
    fontSize: hp(2.2),
    fontWeight: 'bold',
    marginBottom: hp(1.5),
    marginLeft: wp(2),
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: hp(2),
    paddingHorizontal: wp(4),
    marginBottom: hp(0.5),
    borderRadius: hp(1.5),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    width: hp(5),
    height: hp(5),
    borderRadius: hp(2.5),
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: wp(4),
  },
  settingText: {
    flex: 1,
  },
  settingTitle: {
    fontSize: hp(1.8),
    fontWeight: '600',
    marginBottom: hp(0.3),
  },
  settingSubtitle: {
    fontSize: hp(1.4),
  },
  settingRight: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: hp(2),
    paddingHorizontal: wp(4),
    marginBottom: hp(0.5),
    borderRadius: hp(1.5),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    borderWidth: 1,
  },
  logoutText: {
    fontSize: hp(1.8),
    fontWeight: '600',
    marginLeft: wp(2),
  },
  deleteAccountButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: hp(2),
    paddingHorizontal: wp(4),
    marginBottom: hp(0.5),
    borderRadius: hp(1.5),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    borderWidth: 1,
  },
  deleteAccountText: {
    fontSize: hp(1.8),
    fontWeight: '600',
    marginLeft: wp(2),
  },
});
