import AppHeader from "@/components/AppHeader";
import { legalDocuments } from "@/constants/legalContent";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from "react-native-responsive-screen";
import { SafeAreaView } from "react-native-safe-area-context";
import { theme } from "@/constants/theme";
import { useTheme } from '@/contexts/ThemeContext';

export default function PrivacySecurity() {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const [privacySettings, setPrivacySettings] = useState({
    profileVisibility: true,
    showActivityStatus: true,
    allowDataCollection: false,
    shareHealthData: false,
    enableAnalytics: true,
    personalizedAds: false,
    locationTracking: false,
    twoFactorAuth: false,
    biometricLogin: false,
    loginNotifications: true,
    sessionTimeout: true,
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const saved = await AsyncStorage.getItem('privacySettings');
      if (saved) {
        setPrivacySettings(JSON.parse(saved));
      }
    } catch (error) {
      console.log('Error loading privacy settings:', error);
    }
  };

  const saveSettings = async (newSettings: typeof privacySettings) => {
    try {
      await AsyncStorage.setItem('privacySettings', JSON.stringify(newSettings));
    } catch (error) {
      console.log('Error saving privacy settings:', error);
    }
  };

  const updateSetting = (key: keyof typeof privacySettings, value: boolean) => {
    const newSettings = { ...privacySettings, [key]: value };
    setPrivacySettings(newSettings);
    saveSettings(newSettings);
  };

  const showLegalDocument = (document: typeof legalDocuments[keyof typeof legalDocuments]) => {
    Alert.alert(document.title, document.body, [{ text: "OK" }]);
  };

  const handleManageData = () => {
    Alert.alert(
      "Manage Your Data",
      "Choose what you want to do with your data",
      [
        { text: "Export Data", onPress: exportData },
        { text: "Delete All Data", onPress: confirmDeleteData, style: "destructive" },
        { text: "Cancel", style: "cancel" }
      ]
    );
  };

  const exportData = () => {
    Alert.alert(
      "Export Data",
      "Your data export has been initiated. You will receive an email with a download link within 24 hours.",
      [{ text: "OK" }]
    );
  };

  const confirmDeleteData = () => {
    Alert.alert(
      "Delete All Data",
      "This will permanently delete all your health data, workout history, and preferences. This action cannot be undone. Are you sure?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive",
          onPress: () => {
            Alert.alert("Data Deleted", "All your data has been permanently deleted.");
          }
        }
      ]
    );
  };

  const handleBlockedUsers = () => {
    Alert.alert(
      "Blocked Users",
      "You haven't blocked any users yet.",
      [{ text: "OK" }]
    );
  };

  const SettingItem = ({ 
    icon, 
    title, 
    subtitle, 
    value, 
    onValueChange,
    showToggle = true,
    onPress
  }: {
    icon: string;
    title: string;
    subtitle: string;
    value?: boolean;
    onValueChange?: (value: boolean) => void;
    showToggle?: boolean;
    onPress?: () => void;
  }) => (
    <TouchableOpacity 
      style={styles.settingItem} 
      onPress={onPress}
      disabled={showToggle && !onPress}
    >
      <View style={styles.settingLeft}>
        <View style={styles.settingIcon}>
          <Ionicons name={icon as any} size={24} color={colors.primary} />
        </View>
        <View style={styles.settingText}>
          <Text style={styles.settingTitle}>{title}</Text>
          <Text style={styles.settingSubtitle}>{subtitle}</Text>
        </View>
      </View>
      {showToggle ? (
        <Switch
          value={value}
          onValueChange={onValueChange}
          trackColor={{ false: colors.textSecondary + '40', true: colors.primary + '40' }}
          thumbColor={value ? colors.primary : colors.textSecondary}
        />
      ) : (
        <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader 
        title="Privacy & Security"
        showStepIndicator={false}
        showMenuButton={false}
        showBackButton={true}
      />

      <View style={styles.content}>
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Privacy Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Privacy</Text>
            
            <SettingItem
              icon="eye-outline"
              title="Profile Visibility"
              subtitle="Control who can see your profile"
              value={privacySettings.profileVisibility}
              onValueChange={(value) => updateSetting('profileVisibility', value)}
            />
            
            <SettingItem
              icon="pulse-outline"
              title="Activity Status"
              subtitle="Show when you're active"
              value={privacySettings.showActivityStatus}
              onValueChange={(value) => updateSetting('showActivityStatus', value)}
            />
            
            <SettingItem
              icon="analytics-outline"
              title="Data Collection"
              subtitle="Allow collection of usage data"
              value={privacySettings.allowDataCollection}
              onValueChange={(value) => updateSetting('allowDataCollection', value)}
            />
            
            <SettingItem
              icon="heart-outline"
              title="Health Data Sharing"
              subtitle="Share health data with partners"
              value={privacySettings.shareHealthData}
              onValueChange={(value) => updateSetting('shareHealthData', value)}
            />
            
            <SettingItem
              icon="bar-chart-outline"
              title="Analytics"
              subtitle="Help improve our services"
              value={privacySettings.enableAnalytics}
              onValueChange={(value) => updateSetting('enableAnalytics', value)}
            />
            
            <SettingItem
              icon="megaphone-outline"
              title="Personalized Ads"
              subtitle="See ads based on your interests"
              value={privacySettings.personalizedAds}
              onValueChange={(value) => updateSetting('personalizedAds', value)}
            />
            
            <SettingItem
              icon="location-outline"
              title="Location Tracking"
              subtitle="Allow location-based features"
              value={privacySettings.locationTracking}
              onValueChange={(value) => updateSetting('locationTracking', value)}
            />
          </View>

          {/* Security Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Security</Text>
            
            <SettingItem
              icon="shield-checkmark-outline"
              title="Two-Factor Authentication"
              subtitle="Add an extra layer of security"
              value={privacySettings.twoFactorAuth}
              onValueChange={(value) => {
                if (value) {
                  Alert.alert(
                    "Enable 2FA",
                    "You'll need to set up an authenticator app to enable two-factor authentication.",
                    [
                      { text: "Cancel", style: "cancel" },
                      { text: "Continue", onPress: () => updateSetting('twoFactorAuth', true) }
                    ]
                  );
                } else {
                  updateSetting('twoFactorAuth', false);
                }
              }}
            />
            
            <SettingItem
              icon="finger-print-outline"
              title="Biometric Login"
              subtitle="Use fingerprint or face ID"
              value={privacySettings.biometricLogin}
              onValueChange={(value) => updateSetting('biometricLogin', value)}
            />
            
            <SettingItem
              icon="notifications-outline"
              title="Login Notifications"
              subtitle="Get notified of new logins"
              value={privacySettings.loginNotifications}
              onValueChange={(value) => updateSetting('loginNotifications', value)}
            />
            
            <SettingItem
              icon="timer-outline"
              title="Auto Session Timeout"
              subtitle="Automatically log out after inactivity"
              value={privacySettings.sessionTimeout}
              onValueChange={(value) => updateSetting('sessionTimeout', value)}
            />
          </View>

          {/* Data Management Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Data Management</Text>
            
            <SettingItem
              icon="folder-outline"
              title="Manage Your Data"
              subtitle="Export or delete your data"
              showToggle={false}
              onPress={handleManageData}
            />
            
            <SettingItem
              icon="person-remove-outline"
              title="Blocked Users"
              subtitle="Manage blocked accounts"
              showToggle={false}
              onPress={handleBlockedUsers}
            />
            
            <SettingItem
              icon="browsers-outline"
              title="Active Sessions"
              subtitle="View and manage active sessions"
              showToggle={false}
              onPress={() => Alert.alert("Active Sessions", "1 active session on this device")}
            />
            
            <SettingItem
              icon="key-outline"
              title="App Permissions"
              subtitle="Manage app permissions"
              showToggle={false}
              onPress={() => Alert.alert("App Permissions", "Camera, Gallery, and Notifications are enabled")}
            />
          </View>

          {/* Legal Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Legal</Text>
            
            <TouchableOpacity
              style={styles.legalButton}
              onPress={() => showLegalDocument(legalDocuments.privacy)}
            >
              <Text style={styles.legalButtonText}>Privacy Policy</Text>
              <Ionicons name="open-outline" size={18} color={colors.primary} />
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.legalButton}
              onPress={() => showLegalDocument(legalDocuments.terms)}
            >
              <Text style={styles.legalButtonText}>Terms of Service</Text>
              <Ionicons name="open-outline" size={18} color={colors.primary} />
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.legalButton}
              onPress={() => showLegalDocument(legalDocuments.licenses)}
            >
              <Text style={styles.legalButtonText}>Licenses</Text>
              <Ionicons name="open-outline" size={18} color={colors.primary} />
            </TouchableOpacity>
          </View>

          <View style={{ height: hp(4) }} />
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  content: {
    flex: 1,
    backgroundColor: colors.screenColor,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
  },
  section: {
    marginTop: hp(2),
    marginHorizontal: wp(5),
  },
  sectionTitle: {
    fontSize: hp(2),
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: hp(1.5),
    marginLeft: wp(2),
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    paddingVertical: hp(2),
    paddingHorizontal: wp(4),
    marginBottom: hp(1),
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
    backgroundColor: colors.primarySoft,
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
    color: colors.textPrimary,
    marginBottom: hp(0.3),
  },
  settingSubtitle: {
    fontSize: hp(1.4),
    color: colors.textSecondary,
  },
  legalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    paddingVertical: hp(2),
    paddingHorizontal: wp(4),
    marginBottom: hp(1),
    borderRadius: hp(1.5),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  legalButtonText: {
    fontSize: hp(1.8),
    fontWeight: '500',
    color: colors.primary,
  },
});
