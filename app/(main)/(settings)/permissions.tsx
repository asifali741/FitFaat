import AppHeader from "@/components/AppHeader";
import { useNotifications } from "@/contexts/NotificationContext";
import { useTheme } from "@/contexts/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import { Camera } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import * as Notifications from "expo-notifications";
import { Pedometer } from "expo-sensors";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  AppState,
  Linking,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from "react-native-responsive-screen";
import { SafeAreaView } from "react-native-safe-area-context";
import { refreshLiveWalkingProgress } from "@/utils/liveWalkingProgress";

type PermissionKey = "motion" | "notifications" | "camera" | "microphone" | "photos";

type PermissionState = {
  status: string;
  granted: boolean;
  canAskAgain?: boolean;
  detail?: string;
};

type PermissionItem = {
  key: PermissionKey;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  getStatus: () => Promise<PermissionState>;
  request: () => Promise<PermissionState>;
};

const normalizePermission = (permission: any, detail?: string): PermissionState => ({
  status: String(permission?.status || (permission?.granted ? "granted" : "undetermined")),
  granted: Boolean(permission?.granted || permission?.status === "granted"),
  canAskAgain: permission?.canAskAgain,
  detail,
});

const unavailablePermission = (detail: string): PermissionState => ({
  status: "unavailable",
  granted: false,
  canAskAgain: false,
  detail,
});

const getMotionStatus = async () => {
  const isAvailable = await Pedometer.isAvailableAsync().catch(() => false);
  if (!isAvailable) return unavailablePermission("Step sensor not available on this device");
  return normalizePermission(await Pedometer.getPermissionsAsync());
};

const requestMotionPermission = async () => {
  const isAvailable = await Pedometer.isAvailableAsync().catch(() => false);
  if (!isAvailable) return unavailablePermission("Step sensor not available on this device");
  const permission = await Pedometer.requestPermissionsAsync();
  if (permission.granted) {
    refreshLiveWalkingProgress().catch((error) => {
      console.log("[Permissions] Step refresh after permission failed:", error);
    });
  }
  return normalizePermission(permission);
};

const getStatusLabel = (state?: PermissionState) => {
  if (!state) return "Checking";
  if (state.granted) return "Allowed";
  if (state.status === "unavailable") return "Unavailable";
  if (state.canAskAgain === false) return "Blocked";
  if (state.status === "denied") return "Denied";
  return "Needs access";
};

const getStatusColors = (colors: any, state?: PermissionState) => {
  if (!state) {
    return {
      backgroundColor: colors.textSecondary + "18",
      color: colors.textSecondary,
    };
  }

  if (state.granted) {
    return {
      backgroundColor: colors.success + "18",
      color: colors.success,
    };
  }

  if (state.canAskAgain === false || state.status === "unavailable") {
    return {
      backgroundColor: colors.error + "16",
      color: colors.error,
    };
  }

  return {
    backgroundColor: colors.warning + "18",
    color: colors.warning,
  };
};

export default function PermissionsSettingsScreen() {
  const { colors, isDarkMode } = useTheme();
  const { requestPermissions: requestNotificationPermissions } = useNotifications();
  const [statuses, setStatuses] = useState<Partial<Record<PermissionKey, PermissionState>>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [busyKey, setBusyKey] = useState<PermissionKey | "all" | null>(null);

  const permissionItems = useMemo<PermissionItem[]>(
    () => [
      {
        key: "motion",
        icon: "footsteps-outline",
        title: "Step Counter",
        description: "Counts walking steps and step calories for FitFaat progress.",
        getStatus: getMotionStatus,
        request: requestMotionPermission,
      },
      {
        key: "notifications",
        icon: "notifications-outline",
        title: "Notifications",
        description: "Allows meal, water, appointment, and progress reminders.",
        getStatus: async () => normalizePermission(await Notifications.getPermissionsAsync()),
        request: async () => {
          await requestNotificationPermissions();
          return normalizePermission(await Notifications.getPermissionsAsync());
        },
      },
      {
        key: "camera",
        icon: "camera-outline",
        title: "Camera",
        description: "Used for QR transfer, meal scans, and profile photos.",
        getStatus: async () => normalizePermission(await Camera.getCameraPermissionsAsync()),
        request: async () => normalizePermission(await Camera.requestCameraPermissionsAsync()),
      },
      {
        key: "microphone",
        icon: "mic-outline",
        title: "Microphone",
        description: "Used for video calls and voice features that record audio.",
        getStatus: async () => normalizePermission(await Camera.getMicrophonePermissionsAsync()),
        request: async () => normalizePermission(await Camera.requestMicrophonePermissionsAsync()),
      },
      {
        key: "photos",
        icon: "images-outline",
        title: "Photos and Gallery",
        description: "Allows choosing profile and meal photos from your device.",
        getStatus: async () =>
          normalizePermission(await ImagePicker.getMediaLibraryPermissionsAsync(false)),
        request: async () =>
          normalizePermission(await ImagePicker.requestMediaLibraryPermissionsAsync(false)),
      },
    ],
    [requestNotificationPermissions]
  );

  const loadStatuses = useCallback(async () => {
    setIsLoading(true);
    const nextEntries = await Promise.all(
      permissionItems.map(async (item): Promise<[PermissionKey, PermissionState]> => {
        try {
          return [item.key, await item.getStatus()];
        } catch {
          return [item.key, unavailablePermission("Could not read this permission status")];
        }
      })
    );
    setStatuses(Object.fromEntries(nextEntries) as Record<PermissionKey, PermissionState>);
    setIsLoading(false);
  }, [permissionItems]);

  useEffect(() => {
    loadStatuses();
  }, [loadStatuses]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        loadStatuses();
      }
    });

    return () => subscription.remove();
  }, [loadStatuses]);

  const openPhoneSettings = useCallback(async () => {
    try {
      if (Platform.OS === "ios") {
        await Linking.openURL("app-settings:");
      } else {
        await Linking.openSettings();
      }
    } catch {
      Alert.alert("Settings Unavailable", "Please open FitFaat permissions from your phone settings.");
    }
  }, []);

  const requestPermission = useCallback(
    async (item: PermissionItem) => {
      setBusyKey(item.key);
      try {
        const nextState = await item.request();
        setStatuses((current) => ({ ...current, [item.key]: nextState }));

        if (!nextState.granted && nextState.canAskAgain === false) {
          Alert.alert(
            "Permission Blocked",
            `${item.title} can only be enabled from phone settings now.`,
            [
              { text: "Cancel", style: "cancel" },
              { text: "Open Settings", onPress: openPhoneSettings },
            ]
          );
        }
      } catch {
        Alert.alert("Permission Error", `FitFaat could not request ${item.title}. Please try again.`);
      } finally {
        setBusyKey(null);
      }
    },
    [openPhoneSettings]
  );

  const requestAllPermissions = useCallback(async () => {
    setBusyKey("all");
    const blockedPermissions: string[] = [];

    try {
      for (const item of permissionItems) {
        const currentStatus = statuses[item.key] || (await item.getStatus().catch(() => null));
        if (currentStatus?.granted) continue;

        if (currentStatus?.status === "unavailable" || currentStatus?.canAskAgain === false) {
          blockedPermissions.push(item.title);
          continue;
        }

        try {
          const nextState = await item.request();
          setStatuses((current) => ({ ...current, [item.key]: nextState }));
          if (!nextState.granted) blockedPermissions.push(item.title);
        } catch {
          blockedPermissions.push(item.title);
        }
      }

      await loadStatuses();

      if (blockedPermissions.length > 0) {
        Alert.alert(
          "Some Permissions Need Settings",
          `${blockedPermissions.join(", ")} could not be enabled from the app.`,
          [
            { text: "OK", style: "cancel" },
            { text: "Open Settings", onPress: openPhoneSettings },
          ]
        );
        return;
      }

      Alert.alert("Permissions Ready", "All available FitFaat permissions are allowed.");
    } finally {
      setBusyKey(null);
    }
  }, [loadStatuses, openPhoneSettings, permissionItems, statuses]);

  const allowedCount = permissionItems.filter((item) => statuses[item.key]?.granted).length;

  const renderPermissionRow = (item: PermissionItem) => {
    const state = statuses[item.key];
    const statusColors = getStatusColors(colors, state);
    const isBusy = busyKey === item.key;
    const canRequest =
      !state?.granted && state?.status !== "unavailable" && state?.canAskAgain !== false;
    const shouldOpenSettings =
      !state?.granted && (state?.status === "unavailable" || state?.canAskAgain === false);

    return (
      <View
        key={item.key}
        style={[
          styles.permissionCard,
          { backgroundColor: colors.cardBackground, borderColor: colors.cardBorder },
        ]}
      >
        <View style={styles.permissionTopRow}>
          <View style={[styles.permissionIcon, { backgroundColor: colors.primarySoft }]}>
            <Ionicons name={item.icon} size={Math.min(hp(2.65), wp(5.8))} color={colors.primary} />
          </View>
          <View style={styles.permissionText}>
            <View style={styles.permissionTitleRow}>
              <Text
                style={[styles.permissionTitle, { color: colors.textPrimary }]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.82}
              >
                {item.title}
              </Text>
              <View style={[styles.statusPill, { backgroundColor: statusColors.backgroundColor }]}>
                <Text style={[styles.statusText, { color: statusColors.color }]}>
                  {getStatusLabel(state)}
                </Text>
              </View>
            </View>
            <Text style={[styles.permissionDescription, { color: colors.textSecondary }]}>
              {state?.detail || item.description}
            </Text>
          </View>
        </View>

        <View style={styles.permissionActions}>
          <TouchableOpacity
            style={[
              styles.permissionButton,
              {
                backgroundColor: state?.granted ? colors.success + "16" : colors.primary,
                opacity: !canRequest || isBusy ? 0.72 : 1,
              },
            ]}
            onPress={() => requestPermission(item)}
            disabled={!canRequest || isBusy || busyKey === "all"}
          >
            {isBusy ? (
              <ActivityIndicator size="small" color={colors.textOnPrimary} />
            ) : (
              <Ionicons
                name={state?.granted ? "checkmark-circle" : "shield-checkmark-outline"}
                size={Math.min(hp(1.9), wp(4.3))}
                color={state?.granted ? colors.success : colors.textOnPrimary}
              />
            )}
            <Text
              style={[
                styles.permissionButtonText,
                { color: state?.granted ? colors.success : colors.textOnPrimary },
              ]}
            >
              {state?.granted ? "Allowed" : "Allow"}
            </Text>
          </TouchableOpacity>

          {shouldOpenSettings && (
            <TouchableOpacity
              style={[
                styles.settingsButton,
                { borderColor: colors.cardBorder, backgroundColor: colors.screenColor },
              ]}
              onPress={openPhoneSettings}
            >
              <Ionicons
                name="open-outline"
                size={Math.min(hp(1.85), wp(4.2))}
                color={colors.primary}
              />
              <Text style={[styles.settingsButtonText, { color: colors.primary }]}>Settings</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.screenColor }]} edges={["top"]}>
      <StatusBar
        barStyle={isDarkMode ? "light-content" : "dark-content"}
        backgroundColor={colors.screenColor}
      />
      <View style={[styles.container, { backgroundColor: colors.primary }]}>
        <AppHeader
          title="Permissions"
          showBackButton={true}
          showMenuButton={false}
          showStepIndicator={false}
          compactTitleSpacing={true}
        />

        <View style={[styles.content, { backgroundColor: colors.screenColor }]}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            <View
              style={[
                styles.summaryCard,
                { backgroundColor: colors.primarySoft, borderColor: colors.primary + "28" },
              ]}
            >
              <View style={styles.summaryHeader}>
                <View style={[styles.summaryIcon, { backgroundColor: colors.primary }]}>
                  <Ionicons
                    name="shield-checkmark"
                    size={Math.min(hp(2.8), wp(6))}
                    color={colors.textOnPrimary}
                  />
                </View>
                <View style={styles.summaryText}>
                  <Text style={[styles.summaryTitle, { color: colors.textPrimary }]}>
                    App permissions
                  </Text>
                  <Text style={[styles.summarySubtitle, { color: colors.textSecondary }]}>
                    {allowedCount}/{permissionItems.length} allowed
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={[
                  styles.allowAllButton,
                  { backgroundColor: colors.primary, opacity: busyKey ? 0.72 : 1 },
                ]}
                onPress={requestAllPermissions}
                disabled={Boolean(busyKey)}
              >
                {busyKey === "all" ? (
                  <ActivityIndicator size="small" color={colors.textOnPrimary} />
                ) : (
                  <Ionicons
                    name="checkmark-done"
                    size={Math.min(hp(2), wp(4.5))}
                    color={colors.textOnPrimary}
                  />
                )}
                <Text style={[styles.allowAllText, { color: colors.textOnPrimary }]}>
                  Allow Everything
                </Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.noticeCard, { backgroundColor: colors.warning + "12" }]}>
              <Ionicons
                name="information-circle-outline"
                size={Math.min(hp(2.2), wp(5))}
                color={colors.warning}
              />
              <Text style={[styles.noticeText, { color: colors.textSecondary }]}>
                Blocked permissions need phone settings only after the system stops showing the popup.
              </Text>
            </View>

            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                Permission Access
              </Text>
              <TouchableOpacity
                style={[styles.refreshButton, { backgroundColor: colors.cardBackground }]}
                onPress={loadStatuses}
                disabled={isLoading || Boolean(busyKey)}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Ionicons
                    name="refresh"
                    size={Math.min(hp(2), wp(4.6))}
                    color={colors.primary}
                  />
                )}
              </TouchableOpacity>
            </View>

            {permissionItems.map(renderPermissionRow)}

            <View style={{ height: hp(8) }} />
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
    paddingHorizontal: wp(4.6),
    paddingTop: hp(2),
    paddingBottom: hp(3),
  },
  summaryCard: {
    borderWidth: 1,
    borderRadius: hp(1.5),
    padding: Math.min(hp(2), wp(4.5)),
    marginBottom: hp(1.3),
  },
  summaryHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: hp(1.6),
  },
  summaryIcon: {
    width: Math.min(hp(5.6), wp(12)),
    height: Math.min(hp(5.6), wp(12)),
    borderRadius: Math.min(hp(2.8), wp(6)),
    alignItems: "center",
    justifyContent: "center",
    marginRight: wp(3.2),
  },
  summaryText: {
    flex: 1,
  },
  summaryTitle: {
    fontSize: Math.min(hp(2.25), wp(5.2)),
    fontWeight: "800",
    includeFontPadding: false,
  },
  summarySubtitle: {
    fontSize: Math.min(hp(1.55), wp(3.6)),
    fontWeight: "600",
    marginTop: hp(0.35),
  },
  allowAllButton: {
    minHeight: hp(5.2),
    borderRadius: hp(1.25),
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: wp(4),
  },
  allowAllText: {
    fontSize: Math.min(hp(1.8), wp(4)),
    fontWeight: "800",
    marginLeft: wp(2),
  },
  noticeCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderRadius: hp(1.25),
    paddingVertical: hp(1.25),
    paddingHorizontal: wp(3.5),
    marginBottom: hp(1.8),
  },
  noticeText: {
    flex: 1,
    fontSize: Math.min(hp(1.45), wp(3.45)),
    lineHeight: Math.min(hp(2.05), wp(4.8)),
    fontWeight: "600",
    marginLeft: wp(2),
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: hp(1),
  },
  sectionTitle: {
    fontSize: Math.min(hp(2), wp(4.6)),
    fontWeight: "800",
    marginLeft: wp(1),
  },
  refreshButton: {
    width: Math.min(hp(4.8), wp(10.8)),
    height: Math.min(hp(4.8), wp(10.8)),
    borderRadius: Math.min(hp(2.4), wp(5.4)),
    alignItems: "center",
    justifyContent: "center",
  },
  permissionCard: {
    borderWidth: 1,
    borderRadius: hp(1.35),
    padding: Math.min(hp(1.65), wp(4)),
    marginBottom: hp(1),
  },
  permissionTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  permissionIcon: {
    width: Math.min(hp(5.1), wp(11.3)),
    height: Math.min(hp(5.1), wp(11.3)),
    borderRadius: Math.min(hp(2.55), wp(5.65)),
    alignItems: "center",
    justifyContent: "center",
    marginRight: wp(3),
  },
  permissionText: {
    flex: 1,
  },
  permissionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  permissionTitle: {
    flex: 1,
    fontSize: Math.min(hp(1.8), wp(4.1)),
    fontWeight: "800",
    marginRight: wp(2),
    includeFontPadding: false,
  },
  statusPill: {
    minWidth: wp(19),
    minHeight: hp(2.75),
    borderRadius: hp(1.35),
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: wp(2),
  },
  statusText: {
    fontSize: Math.min(hp(1.2), wp(2.85)),
    fontWeight: "800",
    includeFontPadding: false,
  },
  permissionDescription: {
    fontSize: Math.min(hp(1.43), wp(3.35)),
    lineHeight: Math.min(hp(2.05), wp(4.75)),
    fontWeight: "600",
    marginTop: hp(0.65),
  },
  permissionActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    marginTop: hp(1.25),
  },
  permissionButton: {
    minWidth: wp(28),
    minHeight: hp(4.35),
    borderRadius: hp(1.1),
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: wp(3.3),
  },
  permissionButtonText: {
    fontSize: Math.min(hp(1.5), wp(3.5)),
    fontWeight: "800",
    marginLeft: wp(1.5),
  },
  settingsButton: {
    minWidth: wp(27),
    minHeight: hp(4.35),
    borderRadius: hp(1.1),
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: wp(2.2),
    paddingHorizontal: wp(3),
  },
  settingsButtonText: {
    fontSize: Math.min(hp(1.45), wp(3.4)),
    fontWeight: "800",
    marginLeft: wp(1.4),
  },
});
