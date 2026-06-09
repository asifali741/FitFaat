import AppHeader from "@/components/AppHeader";
import { legalDocuments } from "@/constants/legalContent";
import {
  backupAccountScopedStorageLocally,
  backupAccountScopedStorageToCloud,
} from "@/utils/auth/accountScopedStorage";
import { getDashboardPendingMutationCount } from "@/utils/dashboardPendingMutations";
import { loadBackupHistory, type BackupHistoryRecord } from "@/utils/localBackupHistory";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useCallback, useEffect, useState } from "react";
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
import { useTheme } from '@/contexts/ThemeContext';
import { useRouter } from "expo-router";

const formatStatusDate = (value?: string | null) => {
  if (!value) return "Not checked yet";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not checked yet";
  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const getBackupStatusCopy = (record: BackupHistoryRecord | null) => {
  if (!record) return "No local backup yet";
  const action = record.action === "export" ? "Export" : record.action === "import" ? "Import" : "Test";
  return `${action} ${record.status} on ${formatStatusDate(record.createdAt)}`;
};

export default function PrivacySecurity() {
  const router = useRouter();
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
  const [latestBackup, setLatestBackup] = useState<BackupHistoryRecord | null>(null);
  const [pendingSyncChanges, setPendingSyncChanges] = useState(0);
  const [syncRefreshedAt, setSyncRefreshedAt] = useState<string | null>(null);
  const [syncRefreshing, setSyncRefreshing] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const refreshPrivacyCenter = useCallback(async () => {
    setSyncRefreshing(true);
    try {
      const [history, pendingCount] = await Promise.all([
        loadBackupHistory(),
        getDashboardPendingMutationCount(),
      ]);
      setLatestBackup(history[0] || null);
      setPendingSyncChanges(pendingCount);
      setSyncRefreshedAt(new Date().toISOString());
    } catch (error) {
      console.log("Error loading privacy center status:", error);
    } finally {
      setSyncRefreshing(false);
    }
  }, []);

  useEffect(() => {
    refreshPrivacyCenter();
  }, [refreshPrivacyCenter]);

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

  const handleRetrySync = async () => {
    setSyncRefreshing(true);
    try {
      await backupAccountScopedStorageLocally();
      await backupAccountScopedStorageToCloud();
      await refreshPrivacyCenter();
      Alert.alert("Sync Checked", "FitFaat refreshed the local backup snapshot and attempted cloud sync.");
    } catch (error) {
      console.log("Error retrying account sync:", error);
      Alert.alert("Sync Check Failed", "FitFaat could not retry sync right now. Try again later.");
    } finally {
      setSyncRefreshing(false);
    }
  };

  const exportData = () => {
    router.push("/(main)/(settings)/backup-center" as any);
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
        <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
      )}
    </TouchableOpacity>
  );

  const StatusRow = ({
    icon,
    title,
    value,
    subtitle,
    onPress,
  }: {
    icon: string;
    title: string;
    value: string;
    subtitle: string;
    onPress?: () => void;
  }) => (
    <TouchableOpacity
      style={styles.statusRow}
      activeOpacity={onPress ? 0.78 : 1}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={styles.statusIcon}>
        <Ionicons name={icon as any} size={22} color={colors.primary} />
      </View>
      <View style={styles.statusCopy}>
        <Text style={styles.statusTitle}>{title}</Text>
        <Text style={styles.statusSubtitle}>{subtitle}</Text>
      </View>
      <Text style={styles.statusValue} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.72}>
        {value}
      </Text>
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
          <View style={styles.centerPanel}>
            <View style={styles.centerHeader}>
              <View>
                <Text style={styles.centerEyebrow}>Privacy Center</Text>
                <Text style={styles.centerTitle}>Data, permissions, and sync</Text>
              </View>
              <TouchableOpacity
                style={styles.refreshButton}
                onPress={refreshPrivacyCenter}
                disabled={syncRefreshing}
              >
                <Ionicons
                  name={syncRefreshing ? "sync-outline" : "refresh-outline"}
                  size={18}
                  color={colors.textOnPrimary}
                />
                <Text style={styles.refreshButtonText}>{syncRefreshing ? "Checking" : "Refresh"}</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.centerBody}>
              FitFaat keeps health data controls visible here: export, app permissions, backup history, and pending local changes.
            </Text>
            <StatusRow
              icon="cloud-done-outline"
              title="Sync status"
              subtitle={getBackupStatusCopy(latestBackup)}
              value={pendingSyncChanges ? `${pendingSyncChanges} pending` : "Up to date"}
              onPress={handleRetrySync}
            />
            <StatusRow
              icon="key-outline"
              title="Permission status"
              subtitle="Camera, mic, photos, notifications, and step access"
              value="Open"
              onPress={() => router.push("/(main)/(settings)/permissions" as any)}
            />
            <StatusRow
              icon="archive-outline"
              title="Local backup"
              subtitle="Export, preview, test, and restore encrypted backups"
              value={latestBackup ? latestBackup.status : "Set up"}
              onPress={() => router.push("/(main)/(settings)/backup-center" as any)}
            />
            <Text style={styles.centerFootnote}>Last checked {formatStatusDate(syncRefreshedAt)}</Text>
          </View>

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
              title="Export Data"
              subtitle="Create a local encrypted FitFaat backup"
              showToggle={false}
              onPress={exportData}
            />

            <SettingItem
              icon="sync-outline"
              title="Sync & Backup Center"
              subtitle="Check backup history and retry sync"
              showToggle={false}
              onPress={() => router.push("/(main)/(settings)/backup-center" as any)}
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
              onPress={() => router.push("/(main)/(settings)/permissions" as any)}
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
  centerPanel: {
    marginTop: hp(2),
    marginHorizontal: wp(5),
    backgroundColor: colors.cardBackground,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.cardBorder || colors.border,
    padding: wp(4),
  },
  centerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: wp(3),
  },
  centerEyebrow: {
    color: colors.primary,
    fontSize: Math.min(hp(1.15), wp(2.8)),
    fontWeight: "900",
    textTransform: "uppercase",
  },
  centerTitle: {
    color: colors.textPrimary,
    fontSize: Math.min(hp(2), wp(4.6)),
    fontWeight: "900",
    marginTop: hp(0.2),
  },
  centerBody: {
    color: colors.textSecondary,
    fontSize: Math.min(hp(1.28), wp(3.05)),
    lineHeight: hp(1.9),
    fontWeight: "700",
    marginTop: hp(0.8),
    marginBottom: hp(0.7),
  },
  refreshButton: {
    minHeight: hp(3.7),
    borderRadius: 8,
    paddingHorizontal: wp(2.4),
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: wp(1),
    backgroundColor: colors.primary,
  },
  refreshButtonText: {
    color: colors.textOnPrimary,
    fontSize: Math.min(hp(1.1), wp(2.65)),
    fontWeight: "900",
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: wp(2.5),
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder || colors.border,
    paddingVertical: hp(1.05),
  },
  statusIcon: {
    width: hp(4.5),
    height: hp(4.5),
    borderRadius: hp(2.25),
    backgroundColor: colors.primarySoft || `${colors.primary}14`,
    alignItems: "center",
    justifyContent: "center",
  },
  statusCopy: {
    flex: 1,
    minWidth: 0,
  },
  statusTitle: {
    color: colors.textPrimary,
    fontSize: Math.min(hp(1.35), wp(3.2)),
    fontWeight: "900",
  },
  statusSubtitle: {
    color: colors.textSecondary,
    fontSize: Math.min(hp(1.08), wp(2.55)),
    lineHeight: hp(1.55),
    fontWeight: "700",
    marginTop: hp(0.2),
  },
  statusValue: {
    width: wp(22),
    color: colors.primary,
    fontSize: Math.min(hp(1.12), wp(2.65)),
    fontWeight: "900",
    textAlign: "right",
  },
  centerFootnote: {
    color: colors.textTertiary || colors.textSecondary,
    fontSize: Math.min(hp(1.02), wp(2.45)),
    fontWeight: "800",
    marginTop: hp(0.5),
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
    backgroundColor: colors.cardBackground,
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
    backgroundColor: colors.cardBackground,
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
