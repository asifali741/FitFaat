import AppHeader from "@/components/AppHeader";
import { useNotifications, NotificationToggleKey } from "@/contexts/NotificationContext";
import { useTheme } from "@/contexts/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { Alert, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View, Linking, Platform } from "react-native";
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from "react-native-responsive-screen";
import { SafeAreaView } from "react-native-safe-area-context";

type NotificationSettingRow = {
  key: NotificationToggleKey;
  icon: string;
  title: string;
  description: string;
};

export default function NotificationSettingsScreen() {
  const { colors } = useTheme();
  const { 
    permissionStatus, 
    notificationSettings, 
    updateNotificationSettings,
    requestPermissions,
    clearAllNotifications,
    badgeCount,
    sendFitFaatNotification
  } = useNotifications();

  const [isClearing, setIsClearing] = useState(false);

  const handleToggle = async (key: NotificationToggleKey, value: boolean) => {
    await updateNotificationSettings({ [key]: value });
  };

  const handleReminderTimeChange = () => {
    Alert.alert(
      "Reminder Time",
      "How many minutes before your appointment should we remind you?",
      [
        { text: "5 minutes", onPress: () => updateNotificationSettings({ reminderMinutes: 5 }) },
        { text: "10 minutes", onPress: () => updateNotificationSettings({ reminderMinutes: 10 }) },
        { text: "15 minutes", onPress: () => updateNotificationSettings({ reminderMinutes: 15 }) },
        { text: "30 minutes", onPress: () => updateNotificationSettings({ reminderMinutes: 30 }) },
        { text: "1 hour", onPress: () => updateNotificationSettings({ reminderMinutes: 60 }) },
        { text: "Cancel", style: "cancel" }
      ]
    );
  };

  const handleClearAll = async () => {
    Alert.alert(
      "Clear All Notifications",
      "This will remove all notifications and reset the badge count. Are you sure?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Clear All", 
          style: "destructive",
          onPress: async () => {
            setIsClearing(true);
            await clearAllNotifications();
            setIsClearing(false);
            Alert.alert("Success", "All notifications cleared");
          }
        }
      ]
    );
  };

  const handleOpenSettings = () => {
    if (Platform.OS === 'ios') {
      Linking.openURL('app-settings:');
    } else {
      Linking.openSettings();
    }
  };

  const handleRequestPermission = async () => {
    const granted = await requestPermissions();
    if (!granted) {
      Alert.alert(
        "Permission Required",
        "To enable notifications, please go to your device settings and allow notifications for FitFaat.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Open Settings", onPress: handleOpenSettings }
        ]
      );
    }
  };

  const handleSendTestNotification = async () => {
    if (permissionStatus !== 'granted') {
      const granted = await requestPermissions();
      if (!granted) {
        Alert.alert(
          "Permission Required",
          "Please allow notifications for FitFaat before sending a test notification.",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Open Settings", onPress: handleOpenSettings }
          ]
        );
        return;
      }
    }

    await sendFitFaatNotification(
      'general',
      'FitFaat Notifications',
      'Your notifications are ready with the FitFaat logo.'
    );
  };

  const reminderRows: NotificationSettingRow[] = [
    {
      key: 'appointmentReminders',
      icon: 'calendar',
      title: 'Appointment Reminders',
      description: 'Get reminded before your appointments',
    },
    {
      key: 'videoCallReminders',
      icon: 'videocam',
      title: 'Video Call Reminders',
      description: 'Upcoming consultation and call alerts',
    },
    {
      key: 'mealReminders',
      icon: 'restaurant',
      title: 'Meal Reminders',
      description: 'Meal, water, and supplement reminders',
    },
    {
      key: 'healthTracking',
      icon: 'fitness',
      title: 'Health Tracking',
      description: 'Water, sleep, steps, and calorie target alerts',
    },
    {
      key: 'motivationalQuotes',
      icon: 'sparkles',
      title: 'Motivational Quotes',
      description: 'Hourly FitFaat motivation notifications',
    },
  ];

  const coachingRows: NotificationSettingRow[] = [
    {
      key: 'chatMessages',
      icon: 'chatbubbles',
      title: 'Chat Messages',
      description: 'Notifications for new appointment chat messages',
    },
    {
      key: 'dietPlanUpdates',
      icon: 'nutrition',
      title: 'Diet Plan Updates',
      description: 'New or changed meal plans',
    },
  ];

  const accountRows: NotificationSettingRow[] = [
    {
      key: 'bookingUpdates',
      icon: 'checkmark-circle',
      title: 'Booking Updates',
      description: 'Appointment confirmations, changes, and cancellations',
    },
    {
      key: 'subscriptionAlerts',
      icon: 'card',
      title: 'Subscription Alerts',
      description: 'Payment, renewal, and premium status updates',
    },
    {
      key: 'newsUpdates',
      icon: 'newspaper',
      title: 'News Updates',
      description: 'Health news and article notifications',
    },
  ];

  const renderSettingRow = (
    icon: string,
    title: string,
    description: string,
    value: boolean,
    onToggle: (value: boolean) => void,
    disabled?: boolean
  ) => (
    <View style={[styles.settingRow, { backgroundColor: colors.cardBackground }]}>
      <View style={styles.settingLeft}>
        <View style={[styles.iconContainer, { backgroundColor: colors.primary + '20' }]}>
          <Ionicons name={icon as any} size={22} color={colors.primary} />
        </View>
        <View style={styles.settingTextContainer}>
          <Text style={[styles.settingTitle, { color: colors.textPrimary }]}>{title}</Text>
          <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>{description}</Text>
        </View>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        disabled={disabled || permissionStatus !== 'granted'}
        trackColor={{ false: colors.cardBorder, true: colors.primary + '80' }}
        thumbColor={value ? colors.primary : colors.cardBackground}
      />
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.screenColor }]} edges={['top']}>
      <AppHeader
        title="Notification Settings"
        showBackButton={true}
        showStepIndicator={false}
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Permission Status Banner */}
        {permissionStatus !== 'granted' && (
          <TouchableOpacity 
            style={[styles.permissionBanner, { backgroundColor: colors.warning + '20' }]}
            onPress={handleRequestPermission}
          >
            <Ionicons name="warning" size={24} color={colors.warning} />
            <View style={styles.permissionTextContainer}>
              <Text style={[styles.permissionTitle, { color: colors.textPrimary }]}>
                Notifications Disabled
              </Text>
              <Text style={[styles.permissionDescription, { color: colors.textSecondary }]}>
                Tap to enable notifications for reminders and updates
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        )}

        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          REMINDERS
        </Text>

        {reminderRows.map((row) => (
          <React.Fragment key={row.key}>
            {renderSettingRow(
              row.icon,
              row.title,
              row.description,
              notificationSettings[row.key],
              (value) => handleToggle(row.key, value)
            )}
          </React.Fragment>
        ))}

        <Text style={[styles.sectionTitle, { color: colors.textSecondary, marginTop: hp(3) }]}>
          COACHING & PLANS
        </Text>

        {coachingRows.map((row) => (
          <React.Fragment key={row.key}>
            {renderSettingRow(
              row.icon,
              row.title,
              row.description,
              notificationSettings[row.key],
              (value) => handleToggle(row.key, value)
            )}
          </React.Fragment>
        ))}

        <Text style={[styles.sectionTitle, { color: colors.textSecondary, marginTop: hp(3) }]}>
          ACCOUNT & UPDATES
        </Text>

        {accountRows.map((row) => (
          <React.Fragment key={row.key}>
            {renderSettingRow(
              row.icon,
              row.title,
              row.description,
              notificationSettings[row.key],
              (value) => handleToggle(row.key, value)
            )}
          </React.Fragment>
        ))}

        {/* Reminder Time Setting */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary, marginTop: hp(3) }]}>
          TIMING
        </Text>

        <TouchableOpacity 
          style={[styles.settingRow, { backgroundColor: colors.cardBackground }]}
          onPress={handleReminderTimeChange}
          disabled={permissionStatus !== 'granted'}
        >
          <View style={styles.settingLeft}>
            <View style={[styles.iconContainer, { backgroundColor: colors.primary + '20' }]}>
              <Ionicons name="time" size={22} color={colors.primary} />
            </View>
            <View style={styles.settingTextContainer}>
              <Text style={[styles.settingTitle, { color: colors.textPrimary }]}>
                Appointment Reminder Time
              </Text>
              <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
                {notificationSettings.reminderMinutes} minutes before appointment
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
        </TouchableOpacity>

        {/* Badge and Clear Section */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary, marginTop: hp(3) }]}>
          BADGE & NOTIFICATIONS
        </Text>

        <View style={[styles.settingRow, { backgroundColor: colors.cardBackground }]}>
          <View style={styles.settingLeft}>
            <View style={[styles.iconContainer, { backgroundColor: colors.primary + '20' }]}>
              <Ionicons name="notifications-circle" size={22} color={colors.primary} />
            </View>
            <View style={styles.settingTextContainer}>
              <Text style={[styles.settingTitle, { color: colors.textPrimary }]}>
                Current Badge Count
              </Text>
              <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
                {badgeCount} unread notification{badgeCount !== 1 ? 's' : ''}
              </Text>
            </View>
          </View>
          <View style={[styles.badgeCircle, { backgroundColor: badgeCount > 0 ? colors.error : colors.cardBorder }]}>
            <Text style={styles.badgeText}>{badgeCount}</Text>
          </View>
        </View>

        <TouchableOpacity 
          style={[styles.testButton, { backgroundColor: colors.primary }]}
          onPress={handleSendTestNotification}
        >
          <Ionicons name="notifications" size={22} color={colors.textOnPrimary} />
          <Text style={[styles.testButtonText, { color: colors.textOnPrimary }]}>
            Send Test Notification
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.clearButton, { backgroundColor: colors.cardBackground }]}
          onPress={handleClearAll}
          disabled={isClearing}
        >
          <Ionicons name="trash-outline" size={22} color={colors.error} />
          <Text style={[styles.clearButtonText, { color: colors.error }]}>
            {isClearing ? 'Clearing...' : 'Clear All Notifications'}
          </Text>
        </TouchableOpacity>

        {/* Info Section */}
        <View style={[styles.infoSection, { backgroundColor: colors.primary + '10' }]}>
          <Ionicons name="information-circle" size={20} color={colors.primary} />
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>
            You can manage notification permissions in your device settings at any time.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: wp(4),
  },
  permissionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: wp(4),
    borderRadius: 12,
    marginTop: hp(2),
    marginBottom: hp(1),
  },
  permissionTextContainer: {
    flex: 1,
    marginLeft: wp(3),
  },
  permissionTitle: {
    fontSize: wp(3.8),
    fontWeight: '600',
  },
  permissionDescription: {
    fontSize: wp(3.2),
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: wp(3),
    fontWeight: '600',
    marginTop: hp(2),
    marginBottom: hp(1),
    marginLeft: wp(2),
    letterSpacing: 0,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: wp(4),
    borderRadius: 12,
    marginBottom: hp(1),
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: wp(10),
    height: wp(10),
    borderRadius: wp(5),
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingTextContainer: {
    flex: 1,
    marginLeft: wp(3),
  },
  settingTitle: {
    fontSize: wp(3.8),
    fontWeight: '500',
  },
  settingDescription: {
    fontSize: wp(3.2),
    marginTop: 2,
  },
  badgeCircle: {
    width: wp(8),
    height: wp(8),
    borderRadius: wp(4),
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: wp(3.5),
    fontWeight: '600',
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: wp(4),
    borderRadius: 12,
    marginTop: hp(1),
  },
  clearButtonText: {
    fontSize: wp(3.8),
    fontWeight: '500',
    marginLeft: wp(2),
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: wp(4),
    borderRadius: 12,
    marginTop: hp(1),
    marginBottom: hp(1),
  },
  testButtonText: {
    fontSize: wp(3.8),
    fontWeight: '600',
    marginLeft: wp(2),
  },
  infoSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: wp(4),
    borderRadius: 12,
    marginTop: hp(3),
    marginBottom: hp(4),
  },
  infoText: {
    flex: 1,
    fontSize: wp(3.2),
    marginLeft: wp(2),
    lineHeight: wp(4.5),
  },
});
