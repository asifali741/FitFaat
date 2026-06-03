import AppHeader from "@/components/AppHeader";
import { useTheme } from "@/contexts/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import * as NavigationBar from "expo-navigation-bar";
import React, { useEffect } from "react";
import { Platform, ScrollView, StatusBar, StyleSheet, Text, View } from "react-native";
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from "react-native-responsive-screen";
import { SafeAreaView } from "react-native-safe-area-context";

const SYSTEM_BAR_BACKGROUND = "#FFFFFF";

const beforeYouStart = [
  "Sign in before exporting or restoring. Backup files are locked to the FitFaat account that created them.",
  "Choose a passcode with at least 6 characters and keep it somewhere safe.",
  "Use a normal phone folder such as Download or Download/FitFaat Backups.",
  "The .ffsync file is local. FitFaat does not upload it to the backend for you.",
];

const exportSteps = [
  "Open Settings on the phone that has your latest FitFaat data.",
  "Open Backup Center and review the Last export, Last import, and Last test cards.",
  "Select the categories you want to include, or tap Select all for a complete local backup.",
  "Enter your backup passcode.",
  "Tap Export Backup.",
  "In the folder picker, open Download or create a FitFaat Backups folder.",
  "Tap Use This Folder and wait for the .ffsync file to be created.",
];

const verifySteps = [
  "Tap Test File after exporting.",
  "Choose the same folder that contains the .ffsync file.",
  "Backup Center checks the passcode, account match, file format, and checksum.",
  "If the test passes, move the file to your second phone as a document or file.",
  "If the test fails, create a fresh export before deleting anything.",
];

const moveSteps = [
  "Open the Files app and go to the export folder.",
  "Find the newest file named like fitfaat-sync-...ffsync.",
  "Send it as a document, not as an image or screenshot.",
  "Use Bluetooth, Quick Share, WhatsApp document, email, USB, or manual Drive upload.",
  "Save the file into Download or Download/FitFaat Backups on the second phone.",
];

const restoreSteps = [
  "On the second phone, save the .ffsync file into Download or Download/FitFaat Backups.",
  "Log in to the same FitFaat account that created the backup.",
  "Open Settings, then Backup Center.",
  "Select only the categories you want to restore.",
  "Enter the same backup passcode and tap Preview Restore.",
  "Choose the folder that contains the .ffsync file and tap Use This Folder.",
  "Review the restore summary, then tap Restore Selected.",
];

const backupIncludes = [
  "Meals, nutrition profile, nutrition scores, weekly diet reports, meal planner, grocery lists, and diet preferences.",
  "Behavior Coach missions, habit streaks, cravings, reflections, mini-lessons, and coach preferences.",
  "Steps, walking calories, step goal, workouts, exercise progress, and favorites.",
  "Weight logs, health metrics, adaptive targets, and dashboard progress.",
  "Settings, privacy choices, notification preferences, notes, badges, and local app state.",
];

const backupTools = [
  "Export creates one encrypted .ffsync file with the categories you selected.",
  "Preview opens the file and shows what will restore before anything is applied.",
  "Test File checks the passcode, account match, file format, and checksum.",
  "Restore Selected applies only the categories that are both selected and present in the previewed file.",
  "Backup History records local export, import, and test activity for the current account.",
  "Last test shows whether the newest verification passed or failed.",
];

const qrTransferTips = [
  "Use QR Transfer for quick recent activity, intake, weight, Meal Planner, notes, and Emergency WhatsApp moves.",
  "Use Backup Center when you want a fuller encrypted file that can be saved, tested, and restored by category.",
  "If a QR is too dense to scan, use Send on QR Transfer or create a full backup file instead.",
];

const securityRules = [
  "New backup files are locked to the signed-in FitFaat account plus the backup passcode.",
  "A different account cannot preview, test, or restore the file even if the passcode is known.",
  "To move data to a new phone, sign in with the same account before opening Backup Center.",
  "Old backup files that are not linked to an account are blocked from secure restore.",
  "Do not share .ffsync files publicly. Treat them like private health documents.",
];

const folderTips = [
  "Android blocks root storage for privacy. Choose a normal folder such as Download.",
  "If you see Can't use this folder, tap Create New Folder or open Download first.",
  "If import says no .ffsync file was found, the selected folder does not contain the backup file.",
  "If import says the backup belongs to another account, log in to the account that created it.",
  "If Restore Selected is disabled, the previewed file does not contain data in your selected categories.",
  "If you change the passcode after previewing, tap Preview Restore again.",
  "Send the backup as a document, not as an image or screenshot.",
  "The backup file is not uploaded to the backend. Move the .ffsync file yourself when changing phones.",
];

export default function LocalSyncGuideScreen() {
  const { colors, isDarkMode } = useTheme();
  const styles = getStyles(colors, isDarkMode);

  useEffect(() => {
    if (Platform.OS !== "android") return;

    NavigationBar.setButtonStyleAsync("dark").catch(() => {});
    NavigationBar.setStyle("light");

    return () => {
      NavigationBar.setButtonStyleAsync("dark").catch(() => {});
      NavigationBar.setStyle("light");
    };
  }, []);

  const StepList = ({
    title,
    icon,
    steps,
  }: {
    title: string;
    icon: keyof typeof Ionicons.glyphMap;
    steps: string[];
  }) => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionIcon}>
          <Ionicons name={icon} size={22} color={colors.primary} />
        </View>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {steps.map((step, index) => (
        <View key={`${title}-${step}`} style={styles.stepRow}>
          <View style={styles.stepNumber}>
            <Text style={styles.stepNumberText}>{index + 1}</Text>
          </View>
          <Text style={styles.stepText}>{step}</Text>
        </View>
      ))}
    </View>
  );

  const TipSection = ({
    title,
    icon,
    tips,
  }: {
    title: string;
    icon: keyof typeof Ionicons.glyphMap;
    tips: string[];
  }) => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionIcon}>
          <Ionicons name={icon} size={22} color={colors.primary} />
        </View>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {tips.map((tip) => (
        <View key={`${title}-${tip}`} style={styles.tipRow}>
          <Ionicons name="checkmark-circle-outline" size={20} color={colors.primary} />
          <Text style={styles.tipText}>{tip}</Text>
        </View>
      ))}
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={SYSTEM_BAR_BACKGROUND}
        translucent={false}
      />
      <AppHeader
        title="How to Backup"
        showStepIndicator={false}
        showMenuButton={false}
        showBackButton={true}
      />

      <View style={styles.content}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          <View style={styles.intro}>
            <View style={styles.introIcon}>
              <Ionicons name="archive-outline" size={28} color={colors.primary} />
            </View>
            <Text style={styles.introTitle}>Back Up FitFaat Data</Text>
            <Text style={styles.introText}>
              Backup Center creates one account-bound, passcode-protected .ffsync file. Export it, test it, move it as a file, preview the restore, then restore only the categories you choose.
            </Text>
          </View>

          <TipSection title="Before You Start" icon="information-circle-outline" tips={beforeYouStart} />
          <TipSection title="Security Rules" icon="lock-closed-outline" tips={securityRules} />
          <TipSection title="What Gets Backed Up" icon="archive-outline" tips={backupIncludes} />
          <TipSection title="Backup Center Tools" icon="shield-checkmark-outline" tips={backupTools} />
          <TipSection title="QR Or Backup" icon="qr-code-outline" tips={qrTransferTips} />
          <StepList title="Create Backup" icon="download-outline" steps={exportSteps} />
          <StepList title="Test Backup" icon="shield-checkmark-outline" steps={verifySteps} />
          <StepList title="Move The File" icon="document-attach-outline" steps={moveSteps} />
          <StepList title="Restore Backup" icon="cloud-upload-outline" steps={restoreSteps} />
          <TipSection title="Folder Access Tips" icon="folder-open-outline" tips={folderTips} />

          <View style={{ height: hp(5) }} />
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const getStyles = (colors: any, isDarkMode: boolean) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: SYSTEM_BAR_BACKGROUND,
  },
  content: {
    flex: 1,
    backgroundColor: colors.screenColor,
  },
  scrollContent: {
    paddingTop: hp(2),
    paddingHorizontal: wp(5),
  },
  intro: {
    alignItems: "center",
    paddingVertical: hp(2.2),
    paddingHorizontal: wp(4),
  },
  introIcon: {
    width: hp(6),
    height: hp(6),
    borderRadius: hp(3),
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primarySoft,
    marginBottom: hp(1.2),
  },
  introTitle: {
    color: colors.textPrimary,
    fontSize: hp(2.35),
    fontWeight: "800",
    textAlign: "center",
    marginBottom: hp(0.8),
  },
  introText: {
    color: colors.textSecondary,
    fontSize: hp(1.55),
    lineHeight: hp(2.3),
    textAlign: "center",
  },
  section: {
    backgroundColor: colors.cardBackground,
    borderRadius: hp(1.4),
    padding: wp(4),
    marginTop: hp(1.5),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: isDarkMode ? 0.15 : 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: hp(1.2),
  },
  sectionIcon: {
    width: hp(4.2),
    height: hp(4.2),
    borderRadius: hp(2.1),
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primarySoft,
    marginRight: wp(3),
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: hp(1.95),
    fontWeight: "700",
    flex: 1,
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: hp(1.15),
  },
  stepNumber: {
    width: hp(3),
    height: hp(3),
    borderRadius: hp(1.5),
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
    marginRight: wp(3),
    marginTop: hp(0.15),
  },
  stepNumberText: {
    color: "#FFFFFF",
    fontSize: hp(1.35),
    fontWeight: "800",
  },
  stepText: {
    color: colors.textSecondary,
    fontSize: hp(1.55),
    lineHeight: hp(2.2),
    flex: 1,
  },
  tipRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: hp(1.05),
  },
  tipText: {
    color: colors.textSecondary,
    fontSize: hp(1.55),
    lineHeight: hp(2.2),
    flex: 1,
    marginLeft: wp(2.5),
  },
});
