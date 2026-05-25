import AppHeader from "@/components/AppHeader";
import { useNotifications } from "@/contexts/NotificationContext";
import { useTheme } from "@/contexts/ThemeContext";
import {
  applyPreparedLocalSyncImport,
  DEFAULT_LOCAL_SYNC_CATEGORIES,
  exportLocalSyncFile,
  LOCAL_SYNC_CATEGORY_OPTIONS,
  prepareLocalSyncImport,
  testNewestLocalSyncFile,
  type LocalSyncBackupPreview,
  type LocalSyncCategory,
  type LocalSyncPreparedImport,
} from "@/utils/localSyncFile";
import {
  clearBackupHistory,
  loadBackupHistory,
  type BackupHistoryRecord,
} from "@/utils/localBackupHistory";
import { rebuildHabitMissionReminderFromStorage } from "@/utils/habitMissions";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from "react-native-responsive-screen";
import { SafeAreaView } from "react-native-safe-area-context";

type BackupAction = "export" | "preview" | "test" | "restore";

const categoryIcons: Record<LocalSyncCategory, keyof typeof Ionicons.glyphMap> = {
  meals: "restaurant-outline",
  steps: "footsteps-outline",
  workouts: "barbell-outline",
  weight: "scale-outline",
  progressPhotos: "images-outline",
  settings: "settings-outline",
};

const formatDateTime = (value?: string | null) => {
  if (!value) return "Never";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";

  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const maskIdentity = (identity?: string | null) => {
  if (!identity) return "Unknown account";
  if (identity.includes("@")) {
    const [name, domain] = identity.split("@");
    return `${name.slice(0, 2)}***@${domain}`;
  }
  return `${identity.slice(0, 4)}***${identity.slice(-3)}`;
};

const getHistoryTitle = (record: BackupHistoryRecord) => {
  if (record.action === "export") return "Exported backup";
  if (record.action === "import") return "Imported backup";
  return record.status === "success" ? "Tested backup" : "Backup test failed";
};

const categoryLabelByKey = LOCAL_SYNC_CATEGORY_OPTIONS.reduce((labels, category) => {
  labels[category.key] = category.label;
  return labels;
}, {} as Record<LocalSyncCategory, string>);

export default function BackupCenterScreen() {
  const { colors, isDarkMode } = useTheme();
  const router = useRouter();
  const { scheduleFitFaatNotification, cancelScheduledNotification } = useNotifications();
  const styles = getStyles(colors);
  const [selectedCategories, setSelectedCategories] = useState<LocalSyncCategory[]>(
    DEFAULT_LOCAL_SYNC_CATEGORIES
  );
  const [passcode, setPasscode] = useState("");
  const [isPasscodeVisible, setIsPasscodeVisible] = useState(false);
  const [workingAction, setWorkingAction] = useState<BackupAction | null>(null);
  const [history, setHistory] = useState<BackupHistoryRecord[]>([]);
  const [preparedImport, setPreparedImport] = useState<LocalSyncPreparedImport | null>(null);
  const [preparedPasscode, setPreparedPasscode] = useState("");
  const [preview, setPreview] = useState<LocalSyncBackupPreview | null>(null);

  const refreshHistory = useCallback(async () => {
    setHistory(await loadBackupHistory());
  }, []);

  useFocusEffect(
    useCallback(() => {
      refreshHistory();
    }, [refreshHistory])
  );

  const lastExport = useMemo(
    () => history.find((record) => record.action === "export" && record.status === "success"),
    [history]
  );
  const lastImport = useMemo(
    () => history.find((record) => record.action === "import" && record.status === "success"),
    [history]
  );
  const lastTest = useMemo(
    () => history.find((record) => record.action === "test"),
    [history]
  );
  const lastSuccessfulTest = useMemo(
    () => history.find((record) => record.action === "test" && record.status === "success"),
    [history]
  );

  const selectedSet = useMemo(() => new Set(selectedCategories), [selectedCategories]);
  const selectedCategoryLabel = useMemo(() => {
    if (selectedCategories.length === DEFAULT_LOCAL_SYNC_CATEGORIES.length) return "All categories";
    return selectedCategories.map((category) => categoryLabelByKey[category]).join(", ");
  }, [selectedCategories]);
  const selectedPreviewCategoryCounts = useMemo(() => {
    if (!preview) return [];

    return selectedCategories
      .map((category) => ({
        category,
        label: categoryLabelByKey[category],
        count: preview.categoryCounts[category] || 0,
      }))
      .filter((item) => item.count > 0);
  }, [preview, selectedCategories]);
  const selectedPreviewItemCount = useMemo(
    () => selectedPreviewCategoryCounts.reduce((sum, item) => sum + item.count, 0),
    [selectedPreviewCategoryCounts]
  );

  useEffect(() => {
    if (!preparedImport) return;

    if (passcode.trim() !== preparedPasscode) {
      setPreparedImport(null);
      setPreparedPasscode("");
      setPreview(null);
    }
  }, [passcode, preparedImport, preparedPasscode]);

  const validateInput = () => {
    if (passcode.trim().length < 6) {
      Alert.alert("Passcode Required", "Use at least 6 characters for this backup passcode.");
      return false;
    }

    if (!selectedCategories.length) {
      Alert.alert("Choose Categories", "Select at least one backup category.");
      return false;
    }

    return true;
  };

  const toggleCategory = (category: LocalSyncCategory) => {
    setSelectedCategories((current) => {
      if (current.includes(category)) {
        return current.filter((item) => item !== category);
      }

      return [...current, category];
    });
  };

  const selectAllCategories = () => {
    setSelectedCategories(DEFAULT_LOCAL_SYNC_CATEGORIES);
  };

  const clearSelectedCategories = () => {
    setSelectedCategories([]);
  };

  const handleExport = async () => {
    if (!validateInput()) return;

    try {
      setWorkingAction("export");
      const exportPasscode = passcode.trim();
      const result = await exportLocalSyncFile(exportPasscode, {
        categories: selectedCategories,
      });
      let testMessage = "FitFaat also tested the newest backup successfully.";

      try {
        await testNewestLocalSyncFile(exportPasscode);
      } catch (testError: any) {
        testMessage = testError?.message
          ? `Export succeeded, but the automatic test failed: ${testError.message}`
          : "Export succeeded, but the automatic test could not verify the file.";
      }

      setPasscode("");
      setPreparedImport(null);
      setPreparedPasscode("");
      setPreview(null);
      await refreshHistory();
      Alert.alert(
        "Backup Exported",
        result.itemCount > 0
          ? `Saved ${result.itemCount} items to ${result.fileName}. ${testMessage}`
          : `Created ${result.fileName}, but the selected categories did not contain local data yet. ${testMessage}`
      );
    } catch (error: any) {
      Alert.alert("Export Failed", error?.message || "Could not export backup.");
    } finally {
      setWorkingAction(null);
    }
  };

  const handlePreview = async () => {
    if (!validateInput()) return;

    try {
      setWorkingAction("preview");
      const prepared = await prepareLocalSyncImport(passcode.trim());
      setPreparedPasscode(passcode.trim());
      setPreparedImport(prepared);
      setPreview(prepared.preview);
    } catch (error: any) {
      Alert.alert("Preview Failed", error?.message || "Could not preview this backup.");
    } finally {
      setWorkingAction(null);
    }
  };

  const handleTest = async () => {
    if (!validateInput()) return;

    try {
      setWorkingAction("test");
      const testPreview = await testNewestLocalSyncFile(passcode.trim());
      await refreshHistory();
      Alert.alert(
        "Backup File Is Valid",
        testPreview.missingProgressPhotoAssets
          ? `The backup opens correctly, but ${testPreview.missingProgressPhotoAssets} progress photo files are missing.`
          : `The backup opens correctly and contains ${testPreview.itemCount + testPreview.assetCount} items.`
      );
    } catch (error: any) {
      await refreshHistory();
      Alert.alert("Test Failed", error?.message || "This backup could not be verified.");
    } finally {
      setWorkingAction(null);
    }
  };

  const handleRestore = async () => {
    if (!preparedImport || !validateInput()) return;

    if (passcode.trim() !== preparedPasscode) {
      Alert.alert("Preview Again", "The passcode changed after preview. Preview the backup again before restoring.");
      setPreparedImport(null);
      setPreparedPasscode("");
      setPreview(null);
      return;
    }

    const restorableCategories = selectedPreviewCategoryCounts.map((item) => item.category);
    if (!restorableCategories.length) {
      Alert.alert(
        "Nothing Selected To Restore",
        "The previewed backup does not contain data in your selected categories. Select a category shown in the preview first."
      );
      return;
    }

    try {
      setWorkingAction("restore");
      const result = await applyPreparedLocalSyncImport(preparedImport, {
        categories: restorableCategories,
      });
      await rebuildHabitMissionReminderFromStorage({
        schedule: scheduleFitFaatNotification,
        cancel: cancelScheduledNotification,
      }).catch((error) => {
        console.log("[BackupCenter] Unable to rebuild habit mission reminder:", error);
      });
      setPreview(null);
      setPreparedImport(null);
      setPreparedPasscode("");
      setPasscode("");
      await refreshHistory();
      Alert.alert(
        "Backup Restored",
        `Restored ${result.restoredItemCount} items from ${formatDateTime(result.exportedAt)}.`
      );
    } catch (error: any) {
      Alert.alert("Restore Failed", error?.message || "Could not restore this backup.");
    } finally {
      setWorkingAction(null);
    }
  };

  const handleClearHistory = () => {
    Alert.alert("Clear Backup History", "Remove local backup history for this account?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Clear",
        style: "destructive",
        onPress: async () => {
          await clearBackupHistory();
          await refreshHistory();
        },
      },
    ]);
  };

  const ActionButton = ({
    action,
    icon,
    label,
    onPress,
    variant = "primary",
  }: {
    action: BackupAction;
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    onPress: () => void;
    variant?: "primary" | "secondary";
  }) => {
    const isWorking = workingAction === action;
    const disabled = !!workingAction;

    return (
      <TouchableOpacity
        activeOpacity={0.82}
        disabled={disabled}
        onPress={onPress}
        style={[
          styles.actionButton,
          variant === "primary" ? styles.primaryAction : styles.secondaryAction,
          disabled && styles.disabledAction,
        ]}
      >
        {isWorking ? (
          <ActivityIndicator color={variant === "primary" ? "#FFFFFF" : colors.primary} />
        ) : (
          <Ionicons
            name={icon}
            size={hp(2.3)}
            color={variant === "primary" ? "#FFFFFF" : colors.primary}
          />
        )}
        <Text style={variant === "primary" ? styles.primaryActionText : styles.secondaryActionText}>
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.screenColor }]} edges={["top"]}>
      <StatusBar
        barStyle={isDarkMode ? "light-content" : "dark-content"}
        backgroundColor={colors.screenColor}
      />
      <AppHeader
        title="Backup Center"
        showStepIndicator={false}
        showMenuButton={false}
        showBackButton={true}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.summaryGrid}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Last export</Text>
            <Text style={styles.summaryValue}>{formatDateTime(lastExport?.createdAt)}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Last import</Text>
            <Text style={styles.summaryValue}>{formatDateTime(lastImport?.createdAt)}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Last test</Text>
            <Text
              style={[
                styles.summaryValue,
                lastTest?.status === "failed" && styles.summaryValueDanger,
              ]}
            >
              {lastTest ? `${lastTest.status === "success" ? "Passed" : "Failed"} - ${formatDateTime(lastTest.createdAt)}` : "Never"}
            </Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Last backup tested successfully</Text>
            <Text style={styles.summaryValue}>
              {lastSuccessfulTest ? formatDateTime(lastSuccessfulTest.verifiedAt || lastSuccessfulTest.createdAt) : "Not yet"}
            </Text>
          </View>
        </View>

        <View style={styles.noticeCard}>
          <View style={styles.noticeIcon}>
            <Ionicons name="shield-checkmark-outline" size={hp(2.6)} color={colors.primary} />
          </View>
          <View style={styles.noticeTextWrap}>
            <Text style={styles.noticeTitle}>Local encrypted backup</Text>
            <Text style={styles.noticeText}>
              Export a .ffsync file, test it, preview what will restore, then restore only the selected categories.
            </Text>
          </View>
          <TouchableOpacity
            activeOpacity={0.78}
            onPress={() => router.push("/(main)/(settings)/local-sync-guide" as any)}
            style={styles.noticeButton}
          >
            <Text style={styles.noticeButtonText}>Guide</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Backup Categories</Text>
            <View style={styles.headerActions}>
              <TouchableOpacity onPress={selectAllCategories} activeOpacity={0.75}>
                <Text style={styles.sectionAction}>Select all</Text>
              </TouchableOpacity>
              {selectedCategories.length > 0 && (
                <TouchableOpacity onPress={clearSelectedCategories} activeOpacity={0.75}>
                  <Text style={styles.dangerAction}>Clear</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
          <View style={styles.selectionSummary}>
            <Text style={styles.selectionCount}>
              {selectedCategories.length} of {DEFAULT_LOCAL_SYNC_CATEGORIES.length} selected
            </Text>
            <Text style={styles.selectionText} numberOfLines={2}>
              {selectedCategoryLabel || "No categories selected"}
            </Text>
          </View>

          {LOCAL_SYNC_CATEGORY_OPTIONS.map((category) => {
            const selected = selectedSet.has(category.key);

            return (
              <TouchableOpacity
                key={category.key}
                activeOpacity={0.78}
                onPress={() => toggleCategory(category.key)}
                style={styles.categoryRow}
              >
                <View style={styles.categoryLeft}>
                  <View style={styles.categoryIcon}>
                    <Ionicons name={categoryIcons[category.key]} size={hp(2.45)} color={colors.primary} />
                  </View>
                  <View style={styles.categoryTextWrap}>
                    <Text style={styles.categoryTitle}>{category.label}</Text>
                    <Text style={styles.categorySubtitle}>{category.description}</Text>
                  </View>
                </View>
                <Ionicons
                  name={selected ? "checkbox" : "square-outline"}
                  size={hp(2.7)}
                  color={selected ? colors.primary : colors.textSecondary}
                />
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Backup Passcode</Text>
          <View style={styles.passcodeWrap}>
            <TextInput
              value={passcode}
              onChangeText={setPasscode}
              placeholder="Backup passcode"
              placeholderTextColor={colors.textSecondary}
              secureTextEntry={!isPasscodeVisible}
              editable={!workingAction}
              style={styles.passcodeInput}
            />
            <TouchableOpacity
              activeOpacity={0.75}
              disabled={!!workingAction}
              onPress={() => setIsPasscodeVisible((visible) => !visible)}
              style={styles.passcodeVisibility}
            >
              <Ionicons
                name={isPasscodeVisible ? "eye-off-outline" : "eye-outline"}
                size={hp(2.35)}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.passcodeHint}>
            <Ionicons name="key-outline" size={hp(2)} color={colors.primary} />
            <Text style={styles.passcodeHintText}>
              Use the same passcode on the second phone. If you change it after preview, Backup Center will ask you to preview again.
            </Text>
          </View>

          <View style={styles.actionGrid}>
            <ActionButton action="export" icon="download-outline" label="Export Backup" onPress={handleExport} />
            <ActionButton
              action="preview"
              icon="scan-outline"
              label="Preview Restore"
              onPress={handlePreview}
              variant="secondary"
            />
            <ActionButton
              action="test"
              icon="shield-checkmark-outline"
              label="Test File"
              onPress={handleTest}
              variant="secondary"
            />
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Backup History</Text>
            {history.length > 0 && (
              <TouchableOpacity onPress={handleClearHistory} activeOpacity={0.75}>
                <Text style={styles.dangerAction}>Clear</Text>
              </TouchableOpacity>
            )}
          </View>

          {history.length === 0 ? (
            <View style={styles.emptyHistory}>
              <Ionicons name="time-outline" size={hp(3)} color={colors.textSecondary} />
              <Text style={styles.emptyHistoryText}>No backup activity yet</Text>
            </View>
          ) : (
            history.slice(0, 8).map((record) => (
              <View key={record.id} style={styles.historyRow}>
                <View
                  style={[
                    styles.historyIcon,
                    record.status === "success" ? styles.historyIconSuccess : styles.historyIconFailed,
                  ]}
                >
                  <Ionicons
                    name={
                      record.action === "export"
                        ? "download-outline"
                        : record.action === "import"
                          ? "cloud-upload-outline"
                          : "shield-checkmark-outline"
                    }
                    size={hp(2.2)}
                    color={record.status === "success" ? colors.primary : colors.error}
                  />
                </View>
                <View style={styles.historyTextWrap}>
                  <Text style={styles.historyTitle}>{getHistoryTitle(record)}</Text>
                  <Text style={styles.historySubtitle}>
                    {formatDateTime(record.createdAt)}
                    {record.itemCount ? ` - ${record.itemCount} items` : ""}
                    {record.secureHistory ? " - secure history" : ""}
                  </Text>
                  {!!record.message && <Text style={styles.historyMessage}>{record.message}</Text>}
                </View>
              </View>
            ))
          )}
        </View>

        <View style={{ height: hp(6) }} />
      </ScrollView>

      <Modal
        visible={!!preview}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!workingAction) {
            setPreview(null);
            setPreparedImport(null);
            setPreparedPasscode("");
          }
        }}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.previewModal}>
            <View style={styles.previewHeader}>
              <View style={styles.previewIcon}>
                <Ionicons name="document-text-outline" size={hp(2.8)} color={colors.primary} />
              </View>
              <TouchableOpacity
                disabled={!!workingAction}
                onPress={() => {
                  setPreview(null);
                  setPreparedImport(null);
                  setPreparedPasscode("");
                }}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={hp(2.8)} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.previewTitle}>Restore Preview</Text>
            <Text style={styles.previewMeta}>{preview?.fileName || "FitFaat sync file"}</Text>
            <Text style={styles.previewMeta}>Exported {formatDateTime(preview?.exportedAt)}</Text>
            <Text style={styles.previewMeta}>Account {maskIdentity(preview?.userIdentity)}</Text>

            <ScrollView style={styles.previewScroll} showsVerticalScrollIndicator={false}>
              <View style={styles.previewStats}>
                <View style={styles.previewStat}>
                  <Text style={styles.previewStatValue}>{preview?.itemCount || 0}</Text>
                  <Text style={styles.previewStatLabel}>Items</Text>
                </View>
                <View style={styles.previewStat}>
                  <Text style={styles.previewStatValue}>{preview?.assetCount || 0}</Text>
                  <Text style={styles.previewStatLabel}>Photos</Text>
                </View>
                <View style={styles.previewStat}>
                  <Text style={styles.previewStatValue}>{preview?.categories.length || 0}</Text>
                  <Text style={styles.previewStatLabel}>Types</Text>
                </View>
              </View>

              <View
                style={[
                  styles.restoreSelectionBox,
                  selectedPreviewItemCount === 0 && styles.restoreSelectionWarning,
                ]}
              >
                <Ionicons
                  name={selectedPreviewItemCount > 0 ? "checkmark-circle-outline" : "alert-circle-outline"}
                  size={hp(2.2)}
                  color={selectedPreviewItemCount > 0 ? colors.primary : "#D97706"}
                />
                <View style={styles.restoreSelectionTextWrap}>
                  <Text style={styles.restoreSelectionTitle}>
                    {selectedPreviewItemCount > 0 ? "Ready to restore selected data" : "No selected data in this file"}
                  </Text>
                  <Text style={styles.restoreSelectionText}>
                    {selectedPreviewItemCount > 0
                      ? `${selectedPreviewItemCount} items from ${selectedPreviewCategoryCounts.length} selected categories will restore. Other categories stay unchanged.`
                      : "Select one of the categories shown below before restoring."}
                  </Text>
                </View>
              </View>

              {!!preview?.missingProgressPhotoAssets && (
                <View style={styles.warningBox}>
                  <Ionicons name="warning-outline" size={hp(2.2)} color="#D97706" />
                  <Text style={styles.warningText}>
                    {preview.missingProgressPhotoAssets} progress photo files are missing from this backup.
                  </Text>
                </View>
              )}

              <View style={styles.previewCategoryList}>
                {LOCAL_SYNC_CATEGORY_OPTIONS.map((category) => {
                  const count = preview?.categoryCounts[category.key] || 0;
                  if (!count) return null;

                  return (
                    <View key={category.key} style={styles.previewCategoryRow}>
                      <Text style={styles.previewCategoryLabel}>{category.label}</Text>
                      <Text style={styles.previewCategoryCount}>{count}</Text>
                    </View>
                  );
                })}
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                disabled={!!workingAction}
                style={styles.modalSecondaryButton}
                onPress={() => {
                  setPreview(null);
                  setPreparedImport(null);
                  setPreparedPasscode("");
                }}
              >
                <Text style={styles.modalSecondaryText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                disabled={!!workingAction || selectedPreviewItemCount === 0}
                style={[
                  styles.modalPrimaryButton,
                  selectedPreviewItemCount === 0 && styles.disabledAction,
                ]}
                onPress={handleRestore}
              >
                {workingAction === "restore" ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalPrimaryText}>Restore Selected</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: wp(5),
    paddingTop: hp(2),
  },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: wp(3),
    marginBottom: hp(1.5),
  },
  summaryCard: {
    flex: 1,
    minWidth: wp(42),
    backgroundColor: colors.cardBackground,
    borderRadius: hp(1.1),
    paddingVertical: hp(1.6),
    paddingHorizontal: wp(3.5),
    borderWidth: 1,
    borderColor: colors.border,
  },
  summaryLabel: {
    color: colors.textSecondary,
    fontSize: hp(1.45),
    fontWeight: "600",
    marginBottom: hp(0.6),
  },
  summaryValue: {
    color: colors.textPrimary,
    fontSize: hp(1.65),
    fontWeight: "800",
  },
  summaryValueDanger: {
    color: colors.error,
  },
  noticeCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.cardBackground,
    borderRadius: hp(1.2),
    borderWidth: 1,
    borderColor: colors.border,
    padding: wp(4),
    marginBottom: hp(1.6),
  },
  noticeIcon: {
    width: hp(4.6),
    height: hp(4.6),
    borderRadius: hp(2.3),
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: wp(3),
  },
  noticeTextWrap: {
    flex: 1,
    paddingRight: wp(2),
  },
  noticeTitle: {
    color: colors.textPrimary,
    fontSize: hp(1.7),
    fontWeight: "900",
    marginBottom: hp(0.25),
  },
  noticeText: {
    color: colors.textSecondary,
    fontSize: hp(1.4),
    lineHeight: hp(1.95),
    fontWeight: "600",
  },
  noticeButton: {
    minHeight: hp(4),
    borderRadius: hp(1),
    paddingHorizontal: wp(3),
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primary + "35",
  },
  noticeButtonText: {
    color: colors.primary,
    fontSize: hp(1.45),
    fontWeight: "900",
  },
  section: {
    backgroundColor: colors.cardBackground,
    borderRadius: hp(1.2),
    padding: wp(4),
    marginBottom: hp(1.6),
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: hp(1),
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: wp(3),
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: hp(1.95),
    fontWeight: "800",
  },
  sectionAction: {
    color: colors.primary,
    fontSize: hp(1.5),
    fontWeight: "800",
  },
  dangerAction: {
    color: colors.error,
    fontSize: hp(1.5),
    fontWeight: "800",
  },
  selectionSummary: {
    backgroundColor: colors.screenColor,
    borderRadius: hp(1),
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: hp(1),
    paddingHorizontal: wp(3),
    marginBottom: hp(0.9),
  },
  selectionCount: {
    color: colors.primary,
    fontSize: hp(1.45),
    fontWeight: "900",
    marginBottom: hp(0.25),
  },
  selectionText: {
    color: colors.textSecondary,
    fontSize: hp(1.35),
    lineHeight: hp(1.85),
    fontWeight: "600",
  },
  categoryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: hp(1.1),
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  categoryLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    paddingRight: wp(3),
  },
  categoryIcon: {
    width: hp(4.5),
    height: hp(4.5),
    borderRadius: hp(2.25),
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: wp(3),
  },
  categoryTextWrap: {
    flex: 1,
  },
  categoryTitle: {
    color: colors.textPrimary,
    fontSize: hp(1.7),
    fontWeight: "800",
    marginBottom: hp(0.25),
  },
  categorySubtitle: {
    color: colors.textSecondary,
    fontSize: hp(1.4),
    lineHeight: hp(1.95),
  },
  passcodeWrap: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: hp(5.6),
    borderRadius: hp(1),
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.screenColor,
    marginTop: hp(1.2),
    paddingHorizontal: wp(3),
  },
  passcodeInput: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: hp(1.75),
    paddingVertical: 0,
  },
  passcodeVisibility: {
    width: hp(4.2),
    height: hp(4.2),
    alignItems: "center",
    justifyContent: "center",
  },
  passcodeHint: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: wp(2),
    backgroundColor: colors.primarySoft,
    borderRadius: hp(1),
    padding: wp(3),
    marginTop: hp(1.1),
  },
  passcodeHintText: {
    color: colors.textSecondary,
    flex: 1,
    fontSize: hp(1.35),
    lineHeight: hp(1.85),
    fontWeight: "600",
  },
  actionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: wp(2.2),
    marginTop: hp(1.3),
  },
  actionButton: {
    minHeight: hp(5),
    borderRadius: hp(1),
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: wp(3.2),
    gap: wp(1.7),
  },
  primaryAction: {
    flex: 1,
    minWidth: wp(34),
    backgroundColor: colors.primary,
  },
  secondaryAction: {
    flex: 1,
    minWidth: wp(34),
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primary + "45",
  },
  disabledAction: {
    opacity: 0.65,
  },
  primaryActionText: {
    color: "#FFFFFF",
    fontSize: hp(1.58),
    fontWeight: "800",
  },
  secondaryActionText: {
    color: colors.primary,
    fontSize: hp(1.58),
    fontWeight: "800",
  },
  emptyHistory: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: hp(2.5),
  },
  emptyHistoryText: {
    color: colors.textSecondary,
    fontSize: hp(1.55),
    fontWeight: "700",
    marginTop: hp(0.7),
  },
  historyRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: hp(1.1),
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  historyIcon: {
    width: hp(4),
    height: hp(4),
    borderRadius: hp(2),
    alignItems: "center",
    justifyContent: "center",
    marginRight: wp(3),
  },
  historyIconSuccess: {
    backgroundColor: colors.primarySoft,
  },
  historyIconFailed: {
    backgroundColor: colors.error + "16",
  },
  historyTextWrap: {
    flex: 1,
  },
  historyTitle: {
    color: colors.textPrimary,
    fontSize: hp(1.65),
    fontWeight: "800",
    marginBottom: hp(0.3),
  },
  historySubtitle: {
    color: colors.textSecondary,
    fontSize: hp(1.4),
    fontWeight: "600",
  },
  historyMessage: {
    color: colors.textSecondary,
    fontSize: hp(1.35),
    lineHeight: hp(1.85),
    marginTop: hp(0.25),
  },
  modalBackdrop: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(15, 23, 42, 0.52)",
    paddingHorizontal: wp(5),
  },
  previewModal: {
    width: "100%",
    maxHeight: hp(82),
    backgroundColor: colors.cardBackground,
    borderRadius: hp(2),
    padding: wp(5),
  },
  previewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: hp(1.2),
  },
  previewIcon: {
    width: hp(5),
    height: hp(5),
    borderRadius: hp(2.5),
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  closeButton: {
    width: hp(4.4),
    height: hp(4.4),
    alignItems: "center",
    justifyContent: "center",
  },
  previewTitle: {
    color: colors.textPrimary,
    fontSize: hp(2.25),
    fontWeight: "900",
    marginBottom: hp(0.5),
  },
  previewMeta: {
    color: colors.textSecondary,
    fontSize: hp(1.5),
    fontWeight: "600",
    marginBottom: hp(0.35),
  },
  previewScroll: {
    maxHeight: hp(54),
  },
  previewStats: {
    flexDirection: "row",
    gap: wp(2.2),
    marginTop: hp(1.3),
    marginBottom: hp(1.2),
  },
  previewStat: {
    flex: 1,
    backgroundColor: colors.screenColor,
    borderRadius: hp(1),
    paddingVertical: hp(1.2),
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  previewStatValue: {
    color: colors.primary,
    fontSize: hp(2),
    fontWeight: "900",
  },
  previewStatLabel: {
    color: colors.textSecondary,
    fontSize: hp(1.25),
    fontWeight: "700",
    marginTop: hp(0.25),
  },
  restoreSelectionBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: wp(2),
    backgroundColor: colors.primarySoft,
    borderRadius: hp(1),
    padding: wp(3),
    marginBottom: hp(1.1),
    borderWidth: 1,
    borderColor: colors.primary + "35",
  },
  restoreSelectionWarning: {
    backgroundColor: "#FEF3C7",
    borderColor: "#F59E0B55",
  },
  restoreSelectionTextWrap: {
    flex: 1,
  },
  restoreSelectionTitle: {
    color: colors.textPrimary,
    fontSize: hp(1.48),
    fontWeight: "900",
    marginBottom: hp(0.2),
  },
  restoreSelectionText: {
    color: colors.textSecondary,
    fontSize: hp(1.35),
    lineHeight: hp(1.85),
    fontWeight: "600",
  },
  warningBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: wp(2),
    backgroundColor: "#FEF3C7",
    borderRadius: hp(1),
    padding: wp(3),
    marginBottom: hp(1.1),
  },
  warningText: {
    color: "#92400E",
    flex: 1,
    fontSize: hp(1.42),
    lineHeight: hp(1.95),
    fontWeight: "700",
  },
  previewCategoryList: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: hp(0.4),
  },
  previewCategoryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: hp(0.8),
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  previewCategoryLabel: {
    color: colors.textPrimary,
    fontSize: hp(1.55),
    fontWeight: "800",
  },
  previewCategoryCount: {
    color: colors.primary,
    fontSize: hp(1.55),
    fontWeight: "900",
  },
  modalActions: {
    flexDirection: "row",
    gap: wp(3),
    marginTop: hp(1.6),
  },
  modalSecondaryButton: {
    flex: 1,
    height: hp(5.2),
    borderRadius: hp(1),
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  modalPrimaryButton: {
    flex: 1,
    height: hp(5.2),
    borderRadius: hp(1),
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  modalSecondaryText: {
    color: colors.textSecondary,
    fontSize: hp(1.65),
    fontWeight: "800",
  },
  modalPrimaryText: {
    color: "#FFFFFF",
    fontSize: hp(1.65),
    fontWeight: "900",
  },
});
