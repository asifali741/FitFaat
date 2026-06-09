import AppHeader from "@/components/AppHeader";
import { legalDocuments } from "@/constants/legalContent";
import { useTheme } from "@/contexts/ThemeContext";
import { authApi } from "@/utils/auth/authApi";
import {
  loadGoalDisplayMode,
  saveGoalDisplayMode,
  type GoalDisplayMode,
} from "@/utils/goalTargetDisplay";
import {
  FITFAAT_SUPPORT_EMAIL,
  FITFAAT_SUPPORT_WHATSAPP_DISPLAY,
  openReportProblemOptions,
} from "@/utils/reportProblem";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Linking,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from "react-native-responsive-screen";
import { SafeAreaView } from "react-native-safe-area-context";

type SettingsCategoryKey = "account" | "healthData" | "notifications" | "support" | "advanced";

export default function Settings() {
  const router = useRouter();
  const { isDarkMode, toggleDarkMode, colors } = useTheme();
  const [goalDisplayMode, setGoalDisplayMode] = useState<GoalDisplayMode>("exact");
  const [expandedCategories, setExpandedCategories] = useState<Record<SettingsCategoryKey, boolean>>({
    account: true,
    healthData: false,
    notifications: false,
    support: false,
    advanced: false,
  });
  const legalSettingMap = {
    "Terms of Service": legalDocuments.terms,
    "Privacy Policy": legalDocuments.privacy,
    "Licenses": legalDocuments.licenses,
  } as const;

  useEffect(() => {
    loadGoalDisplayMode().then(setGoalDisplayMode).catch(() => setGoalDisplayMode("exact"));
  }, []);

  const handleGoalDisplayToggle = async (showRanges: boolean) => {
    const nextMode: GoalDisplayMode = showRanges ? "ranges" : "exact";
    setGoalDisplayMode(nextMode);
    try {
      await saveGoalDisplayMode(nextMode);
    } catch {
      setGoalDisplayMode(showRanges ? "exact" : "ranges");
      Alert.alert("Error", "Could not save target display preference. Please try again.");
    }
  };

  const toggleCategory = (category: SettingsCategoryKey) => {
    setExpandedCategories((current) => ({
      ...current,
      [category]: !current[category],
    }));
  };

  const handleSettingPress = (setting: string) => {
    const legalDocument = legalSettingMap[setting as keyof typeof legalSettingMap];
    if (legalDocument) {
      Alert.alert(legalDocument.title, legalDocument.body, [{ text: "OK" }]);
      return;
    }

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

      case "Subscription / Premium":
        router.push("/premium");
        break;

      case "Account Management":
        router.push("/change-password");
        break;
      
      case "Workout Preferences":
        router.push("/(exercises)/workout");
        break;

      case "Step Counter":
        router.push("/(main)/(steps)" as any);
        break;

      case "Permissions":
        router.push("/(main)/(settings)/permissions" as any);
        break;

      case "Health Sync":
        router.push("/(main)/(settings)/permissions" as any);
        break;

      case "Data Import/Export":
        router.push("/(main)/(settings)/backup-center" as any);
        break;

      case "Reminder Settings":
      case "Push Notifications":
      case "Email Notifications":
        router.push("/(main)/(settings)/notification-settings" as any);
        break;

      case "Backup Center":
        router.push("/(main)/(settings)/backup-center" as any);
        break;

      case "Local Sync":
        router.push("/(main)/(settings)/local-sync-guide" as any);
        break;

      case "QR Transfer":
        router.push("/(main)/(qr-transfer)" as any);
        break;

      case "Developer / Diagnostic Options":
        Alert.alert(
          "Developer / Diagnostic Options",
          "Diagnostic tools are available when a debug build exposes them. Core backup, sync, transfer, and privacy tools are listed above.",
          [{ text: "OK" }]
        );
        break;

      case "Mindfulness":
        router.push("/(main)/(mindfulness)" as any);
        break;

      case "Help Center":
        Linking.openURL(`mailto:${FITFAAT_SUPPORT_EMAIL}?subject=FitFaat%20Help%20Center`);
        break;
      
      case "Contact Support":
        Alert.alert(
          "Contact Support",
          "Get help from our support team.",
          [
            { text: "Email Support", onPress: () => Linking.openURL(`mailto:${FITFAAT_SUPPORT_EMAIL}?subject=FitFaat%20Support`) },
            { text: "Cancel", style: "cancel" }
          ]
        );
        break;

      case "Report a Problem":
        openReportProblemOptions("Settings");
        break;

      case "Feedback":
        openReportProblemOptions("Settings feedback");
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
          legalDocuments.terms.body,
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
          "FITFAAT OPEN SOURCE LICENSES\n\nThis app uses the following open source libraries:\n\n• React Native (MIT License)\n• Expo (MIT License)\n• React Navigation (MIT License)\n• AsyncStorage (MIT License)\n• React Native Vector Icons (MIT License)\n• React Native Responsive Screen (MIT License)\n• React Native Reanimated (MIT License)\n• React Native Gesture Handler (MIT License)\n• React Native Safe Area Context (MIT License)\n• React Native Keyboard Aware Scroll View (MIT License)\n• React Native Progress (MIT License)\n• React Native Marquee (MIT License)\n• React Native Heroicons (MIT License)\n• Axios (MIT License)\n• Day.js (MIT License)\n• NativeWind (MIT License)\n• Tailwind CSS (MIT License)\n• Prettier (MIT License)\n• ESLint (MIT License)\n\nAll libraries are used in compliance with their respective licenses. Source code for these libraries is available on GitHub.\n\nFor detailed license information, visit: https://fitfaat.com/licenses",
          [{ text: "OK" }]
        );
        break;
      
      default:
        Alert.alert(setting, `This will open ${setting} settings`, [{ text: "OK" }]);
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
              await authApi.logout();
              // Navigate to login
              router.replace('/(auth)/email-login');
            } catch {
              Alert.alert("Error", "Failed to sign out. Please try again.");
            }
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
          <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
        ))}
      </View>
    </TouchableOpacity>
  );

  const CategorySection = ({
    id,
    icon,
    title,
    subtitle,
    children,
  }: {
    id: SettingsCategoryKey;
    icon: string;
    title: string;
    subtitle: string;
    children: React.ReactNode;
  }) => {
    const expanded = expandedCategories[id];

    return (
      <View style={styles.section}>
        <TouchableOpacity
          style={[styles.categoryHeader, { backgroundColor: colors.cardBackground, borderColor: colors.cardBorder || colors.border }]}
          onPress={() => toggleCategory(id)}
          activeOpacity={0.82}
          accessibilityRole="button"
          accessibilityLabel={`${expanded ? "Collapse" : "Expand"} ${title}`}
        >
          <View style={[styles.categoryIcon, { backgroundColor: colors.primarySoft }]}>
            <Ionicons name={icon as any} size={24} color={colors.primary} />
          </View>
          <View style={styles.categoryText}>
            <Text style={[styles.categoryTitle, { color: colors.textPrimary }]}>{title}</Text>
            <Text style={[styles.categorySubtitle, { color: colors.textSecondary }]}>{subtitle}</Text>
          </View>
          <Ionicons
            name={expanded ? "chevron-up" : "chevron-down"}
            size={20}
            color={colors.textSecondary}
          />
        </TouchableOpacity>

        {expanded ? <View style={styles.categoryBody}>{children}</View> : null}
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.screenColor }]} edges={['top']}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={colors.screenColor}
      />
      <View style={[styles.container, { backgroundColor: colors.primary }]}>
        <AppHeader 
          title="Settings"
          showStepIndicator={false}
          showMenuButton={true}
        />

        {/* Main Content */}
        <View style={[styles.content, { backgroundColor: colors.screenColor }]}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
          <CategorySection
            id="account"
            icon="person-circle-outline"
            title="Account"
            subtitle="Profile, subscription, and account access"
          >
            <SettingItem
              icon="person-outline"
              title="Profile"
              subtitle="Personal details and health profile"
              onPress={() => handleSettingPress("Profile Information")}
            />
            <SettingItem
              icon="camera-outline"
              title="Profile Photo"
              subtitle="Change your profile image"
              onPress={() => handleSettingPress("Edit Profile Picture")}
            />
            <SettingItem
              icon="star-outline"
              title="Subscription / Premium"
              subtitle="Plan status and paid benefits"
              onPress={() => handleSettingPress("Subscription / Premium")}
            />
            <SettingItem
              icon="lock-closed-outline"
              title="Account Management"
              subtitle="Password and sign-in security"
              onPress={() => handleSettingPress("Account Management")}
            />
            <SettingItem
              icon="card-outline"
              title="Payment Methods"
              subtitle="Saved payment options"
              onPress={() => handleSettingPress("Payment Methods")}
            />
            <SettingItem
              icon="medkit-outline"
              title="Doctor Access"
              subtitle="Register or manage your doctor profile"
              onPress={() => router.push("/(main)/(doctor-portal)" as any)}
            />
          </CategorySection>

          <CategorySection
            id="healthData"
            icon="pulse-outline"
            title="Health Data"
            subtitle="Sync, import/export, permissions, and targets"
          >
            <SettingItem
              icon="sync-outline"
              title="Health Sync"
              subtitle="Connected health and step access"
              onPress={() => handleSettingPress("Health Sync")}
            />
            <SettingItem
              icon="swap-vertical-outline"
              title="Data Import/Export"
              subtitle="Backup files, restore preview, and QR transfer tools"
              onPress={() => handleSettingPress("Data Import/Export")}
            />
            <SettingItem
              icon="shield-checkmark-outline"
              title="Permissions"
              subtitle="Camera, mic, photos, notifications, and steps"
              onPress={() => handleSettingPress("Permissions")}
            />
            <SettingItem
              icon="footsteps-outline"
              title="Step Counter"
              subtitle="Live steps, goals, calories, and weekly trends"
              onPress={() => handleSettingPress("Step Counter")}
            />
            <SettingItem
              icon="options-outline"
              title="Target Ranges"
              subtitle={
                goalDisplayMode === "ranges"
                  ? "Showing healthy calorie and hydration ranges"
                  : "Showing exact calorie and hydration targets"
              }
              rightComponent={
                <Switch
                  value={goalDisplayMode === "ranges"}
                  onValueChange={handleGoalDisplayToggle}
                  trackColor={{ false: colors.textSecondary + '40', true: colors.primary + '40' }}
                  thumbColor={goalDisplayMode === "ranges" ? colors.primary : colors.textSecondary}
                />
              }
              showArrow={false}
            />
          </CategorySection>

          <CategorySection
            id="notifications"
            icon="notifications-outline"
            title="Notifications"
            subtitle="Reminders, push notifications, and email"
          >
            <SettingItem
              icon="alarm-outline"
              title="Reminder Settings"
              subtitle="Daily health and habit reminders"
              onPress={() => handleSettingPress("Reminder Settings")}
            />
            <SettingItem
              icon="phone-portrait-outline"
              title="Push Notifications"
              subtitle="Device notification preferences"
              onPress={() => handleSettingPress("Push Notifications")}
            />
            <SettingItem
              icon="mail-outline"
              title="Email Notifications"
              subtitle="Email updates and account messages"
              onPress={() => handleSettingPress("Email Notifications")}
            />
          </CategorySection>

          <CategorySection
            id="support"
            icon="help-circle-outline"
            title="Support"
            subtitle="Help, contact, feedback, and app information"
          >
            <SettingItem
              icon="help-circle-outline"
              title="Help Center"
              subtitle={FITFAAT_SUPPORT_EMAIL}
              onPress={() => handleSettingPress("Help Center")}
            />
            <SettingItem
              icon="mail-outline"
              title="Contact Support"
              subtitle={FITFAAT_SUPPORT_EMAIL}
              onPress={() => handleSettingPress("Contact Support")}
            />
            <SettingItem
              icon="chatbubble-ellipses-outline"
              title="Feedback"
              subtitle={`WhatsApp ${FITFAAT_SUPPORT_WHATSAPP_DISPLAY} or ${FITFAAT_SUPPORT_EMAIL}`}
              onPress={() => handleSettingPress("Feedback")}
            />
            <SettingItem
              icon="bug-outline"
              title="Report a Problem"
              subtitle="Send a bug report with support context"
              onPress={() => handleSettingPress("Report a Problem")}
            />
            <SettingItem
              icon="information-circle-outline"
              title="About"
              subtitle="App version 1.0.0"
              onPress={() => handleSettingPress("About")}
            />
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
          </CategorySection>

          <CategorySection
            id="advanced"
            icon="settings-outline"
            title="Advanced"
            subtitle="Backup, transfer, local sync, and diagnostics"
          >
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
              icon="archive-outline"
              title="Backup Center"
              subtitle="Export, preview, test, restore, and retry checks"
              onPress={() => handleSettingPress("Backup Center")}
            />
            <SettingItem
              icon="help-circle-outline"
              title="Local Sync"
              subtitle="How to move and restore backup files"
              onPress={() => handleSettingPress("Local Sync")}
            />
            <SettingItem
              icon="qr-code-outline"
              title="QR Transfer"
              subtitle="Move selected FitFaat data with a QR code"
              onPress={() => handleSettingPress("QR Transfer")}
            />
            <SettingItem
              icon="code-slash-outline"
              title="Developer / Diagnostic Options"
              subtitle="Troubleshooting tools for debug builds"
              onPress={() => handleSettingPress("Developer / Diagnostic Options")}
            />
          </CategorySection>


          {/* Logout Section */}
          <View style={styles.section}>
            <TouchableOpacity style={[styles.logoutButton, { backgroundColor: colors.cardBackground, borderColor: colors.error + '20' }]} onPress={handleSignOut}>
              <Ionicons name="log-out-outline" size={24} color={colors.error} />
              <Text style={[styles.logoutText, { color: colors.error }]}>Sign Out</Text>
            </TouchableOpacity>
          </View>

          <View style={{ height: hp(12) }} />
          </ScrollView>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: hp(4),
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
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: hp(1.55),
    paddingHorizontal: wp(4),
    borderRadius: hp(1.7),
    borderWidth: 1,
  },
  categoryIcon: {
    width: hp(5),
    height: hp(5),
    borderRadius: hp(2.5),
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: wp(3.5),
  },
  categoryText: {
    flex: 1,
    paddingRight: wp(2),
  },
  categoryTitle: {
    fontSize: hp(1.95),
    fontWeight: '800',
    marginBottom: hp(0.25),
  },
  categorySubtitle: {
    fontSize: hp(1.35),
    fontWeight: '600',
    lineHeight: hp(1.9),
  },
  categoryBody: {
    marginTop: hp(0.85),
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
});
