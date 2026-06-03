import AppHeader from "@/components/AppHeader";
import { SmartEmptyState } from "@/components/common/SmartEmptyState";
import { useTheme } from "@/contexts/ThemeContext";
import {
  applyPreparedQrActivityImport,
  buildQrActivityTransfer,
  prepareQrActivityImport,
  QR_ACTIVITY_ACCOUNT_MISMATCH_MESSAGE,
  QR_ACTIVITY_DIRECT_MAX_CHARS,
  type PreparedQrActivityImport,
  type QrActivityTransferOptions,
  type QrActivityTransferExport,
} from "@/utils/qrActivityTransfer";
import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from "expo-camera";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Share,
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
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import QRCode from "react-native-qrcode-svg";
import { useLocalSearchParams, useRouter } from "expo-router";

type TransferPreview = QrActivityTransferExport["preview"] | PreparedQrActivityImport["preview"];

const formatHydrationLiters = (value: number) => {
  const rounded = Math.round(Number(value || 0) * 10) / 10;
  return `${Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(1)}L`;
};

const formatImportParts = (parts: string[]) => {
  if (parts.length <= 1) return parts[0] || "";
  if (parts.length === 2) return `${parts[0]} and ${parts[1]}`;
  return `${parts.slice(0, -1).join(", ")}, and ${parts[parts.length - 1]}`;
};

const getParamValue = (value?: string | string[]) =>
  Array.isArray(value) ? value[0] : value;

const normalizeRouteDateKey = (value?: string | string[]) => {
  const rawValue = getParamValue(value);
  if (!rawValue) return null;
  const match = rawValue.match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : null;
};

const normalizeRouteDayNo = (value?: string | string[]) => {
  const parsed = Number(getParamValue(value));
  if (!Number.isFinite(parsed)) return null;
  const rounded = Math.round(parsed);
  return rounded >= 1 && rounded <= 7 ? rounded : null;
};

export default function QrTransferScreen() {
  const { colors, isDarkMode } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ dateKey?: string; dayNo?: string }>();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => getStyles(colors, insets.bottom), [colors, insets.bottom]);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [qrTransfer, setQrTransfer] = useState<QrActivityTransferExport | null>(null);
  const [qrTransferLoading, setQrTransferLoading] = useState(false);
  const [qrMessage, setQrMessage] = useState<string | null>(null);
  const [receiverOpen, setReceiverOpen] = useState(false);
  const [qrPreparedImport, setQrPreparedImport] = useState<PreparedQrActivityImport | null>(null);
  const [qrScanLocked, setQrScanLocked] = useState(false);
  const [qrScanMessage, setQrScanMessage] = useState<string | null>(null);
  const [isImportingQrTransfer, setIsImportingQrTransfer] = useState(false);
  const specificDateKey = normalizeRouteDateKey(params.dateKey);
  const specificDayNo = normalizeRouteDayNo(params.dayNo);
  const qrBuildOptions = useMemo<QrActivityTransferOptions>(
    () => ({
      ...(specificDateKey ? { dateKey: specificDateKey } : {}),
      ...(specificDayNo ? { dayNo: specificDayNo } : {}),
    }),
    [specificDateKey, specificDayNo]
  );
  const isSpecificDayQr = Boolean(specificDateKey || specificDayNo);

  const generateQrCode = useCallback(async () => {
    setQrTransferLoading(true);
    setQrMessage(null);

    try {
      setQrTransfer(await buildQrActivityTransfer(qrBuildOptions));
    } catch (error: any) {
      const message = error?.message || "Could not generate the FitFaat QR Code.";
      setQrTransfer(null);
      setQrMessage(message);
    } finally {
      setQrTransferLoading(false);
    }
  }, [qrBuildOptions]);

  useEffect(() => {
    generateQrCode();
  }, [generateQrCode]);

  const shareQrActivityData = useCallback(async () => {
    setQrTransferLoading(true);

    try {
      const transfer = qrTransfer || await buildQrActivityTransfer(qrBuildOptions);
      setQrTransfer(transfer);
      await Share.share({
        title: isSpecificDayQr ? "FitFaat Day Intake Transfer" : "FitFaat Daily Intake Transfer",
        message: transfer.qrValue,
      });
    } catch (error: any) {
      Alert.alert("Could Not Send Data", error?.message || "Please try generating the QR Code again.");
    } finally {
      setQrTransferLoading(false);
    }
  }, [isSpecificDayQr, qrBuildOptions, qrTransfer]);

  const openReceiveData = useCallback(async () => {
    setReceiverOpen(true);
    setQrPreparedImport(null);
    setQrScanLocked(false);
    setQrScanMessage(null);

    try {
      const permission = cameraPermission?.granted ? cameraPermission : await requestCameraPermission();
      if (!permission?.granted) {
        setQrScanMessage("Camera permission is required to scan a FitFaat QR Code.");
      }
    } catch {
      setQrScanMessage("Camera permission is required to scan a FitFaat QR Code.");
    }
  }, [cameraPermission, requestCameraPermission]);

  const resetQrScanner = useCallback(() => {
    setQrPreparedImport(null);
    setQrScanLocked(false);
    setQrScanMessage(null);
  }, []);

  const handleQrCodeScanned = useCallback(async (result: BarcodeScanningResult) => {
    if (qrScanLocked || qrPreparedImport || !receiverOpen) return;

    setQrScanLocked(true);
    setQrScanMessage("Checking FitFaat QR Code...");

    try {
      const prepared = await prepareQrActivityImport(result.data);
      setQrPreparedImport(prepared);
      setQrScanMessage(null);
    } catch (error: any) {
      const message = error?.message || "This is not a valid FitFaat QR Code.";
      if (message === QR_ACTIVITY_ACCOUNT_MISMATCH_MESSAGE) {
        Alert.alert("Transfer Blocked", QR_ACTIVITY_ACCOUNT_MISMATCH_MESSAGE);
      } else {
        Alert.alert("Scan Failed", message);
      }
      setQrScanMessage(message);
      setTimeout(() => {
        setQrScanLocked(false);
      }, 1200);
    }
  }, [qrPreparedImport, qrScanLocked, receiverOpen]);

  const importQrActivityData = useCallback(async () => {
    if (!qrPreparedImport) return;

    setIsImportingQrTransfer(true);
    try {
      const result = await applyPreparedQrActivityImport(qrPreparedImport);
      const importedParts = [
        ...(result.restoredActivityData ? ["steps and workout data"] : []),
        ...(result.restoredNutritionData ? ["daily calorie and hydration intake"] : []),
        ...(result.restoredWeightData ? ["weight"] : []),
        ...(result.restoredEmergencyWhatsApp ? ["Emergency WhatsApp"] : []),
        ...(result.restoredMealPlans || result.restoredGroceryState ? ["Meal Planner data"] : []),
        ...(result.restoredNotes ? ["notes"] : []),
      ];
      const importedMessage = result.restoredItemCount > 0 && importedParts.length
        ? `${formatImportParts(importedParts)} ${importedParts.length === 1 ? "was" : "were"} moved to this phone.`
        : "This phone already has the latest QR transfer data.";
      Alert.alert("Data Received", importedMessage);
      setReceiverOpen(false);
      resetQrScanner();
      generateQrCode();
    } catch (error: any) {
      Alert.alert("Import Failed", error?.message || "Could not import this FitFaat QR Code.");
    } finally {
      setIsImportingQrTransfer(false);
    }
  }, [generateQrCode, qrPreparedImport, resetQrScanner]);

  const renderQrTransferPreview = (preview?: TransferPreview) => {
    if (!preview) return null;

    return (
      <View style={styles.qrPreviewGrid}>
        {preview.specificDayDateKey ? (
          <>
            <View style={styles.qrPreviewCard}>
              <Text style={styles.qrPreviewValue}>{preview.specificDayDateKey}</Text>
              <Text style={styles.qrPreviewLabel}>QR day</Text>
            </View>
            <View style={styles.qrPreviewCard}>
              <Text style={styles.qrPreviewValue}>{preview.specificDayCalorieIntake}</Text>
              <Text style={styles.qrPreviewLabel}>Day food kcal</Text>
            </View>
            <View style={styles.qrPreviewCard}>
              <Text style={styles.qrPreviewValue}>{formatHydrationLiters(preview.specificDayHydrationIntake)}</Text>
              <Text style={styles.qrPreviewLabel}>Day hydration</Text>
            </View>
          </>
        ) : null}
        {preview.hasNutritionData && !preview.specificDayDateKey ? (
          <>
            <View style={styles.qrPreviewCard}>
              <Text style={styles.qrPreviewValue}>{preview.latestCalorieIntake}</Text>
              <Text style={styles.qrPreviewLabel}>Daily food kcal</Text>
            </View>
            <View style={styles.qrPreviewCard}>
              <Text style={styles.qrPreviewValue}>{formatHydrationLiters(preview.latestHydrationIntake)}</Text>
              <Text style={styles.qrPreviewLabel}>Daily hydration</Text>
            </View>
            <View style={styles.qrPreviewCard}>
              <Text style={styles.qrPreviewValue}>{preview.nutritionDayCount}</Text>
              <Text style={styles.qrPreviewLabel}>Intake days</Text>
            </View>
          </>
        ) : null}
        <View style={styles.qrPreviewCard}>
          <Text style={styles.qrPreviewValue}>{preview.totalSteps}</Text>
          <Text style={styles.qrPreviewLabel}>Steps</Text>
        </View>
        <View style={styles.qrPreviewCard}>
          <Text style={styles.qrPreviewValue}>{preview.totalWalkingCalories}</Text>
          <Text style={styles.qrPreviewLabel}>Walking kcal</Text>
        </View>
        <View style={styles.qrPreviewCard}>
          <Text style={styles.qrPreviewValue}>{preview.totalWorkoutCalories}</Text>
          <Text style={styles.qrPreviewLabel}>Workout kcal</Text>
        </View>
        <View style={styles.qrPreviewCard}>
          <Text style={styles.qrPreviewValue}>{preview.dayCount}</Text>
          <Text style={styles.qrPreviewLabel}>Days</Text>
        </View>
        {preview.hasEmergencyWhatsApp ? (
          <View style={styles.qrPreviewCard}>
            <Text style={styles.qrPreviewValue}>Yes</Text>
            <Text style={styles.qrPreviewLabel}>Emergency WA</Text>
          </View>
        ) : null}
        {preview.hasWeightData ? (
          <View style={styles.qrPreviewCard}>
            <Text style={styles.qrPreviewValue}>
              {preview.latestWeightKg ? preview.latestWeightKg : "Yes"}
            </Text>
            <Text style={styles.qrPreviewLabel}>Weight kg</Text>
          </View>
        ) : null}
        {preview.mealPlanCount > 0 ? (
          <View style={styles.qrPreviewCard}>
            <Text style={styles.qrPreviewValue}>{preview.mealPlanCount}</Text>
            <Text style={styles.qrPreviewLabel}>Meal plans</Text>
          </View>
        ) : null}
        {preview.groceryItemCount > 0 ? (
          <View style={styles.qrPreviewCard}>
            <Text style={styles.qrPreviewValue}>{preview.groceryItemCount}</Text>
            <Text style={styles.qrPreviewLabel}>Grocery</Text>
          </View>
        ) : null}
        {preview.noteCount > 0 ? (
          <View style={styles.qrPreviewCard}>
            <Text style={styles.qrPreviewValue}>{preview.noteCount}</Text>
            <Text style={styles.qrPreviewLabel}>Notes</Text>
          </View>
        ) : null}
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.screenColor }]} edges={["top"]}>
      <StatusBar
        barStyle={isDarkMode ? "light-content" : "dark-content"}
        backgroundColor={colors.screenColor}
      />
      <AppHeader title="QR Transfer" showBackButton showMenuButton={false} showStepIndicator={false} />

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <Ionicons name="qr-code" size={Math.min(hp(4), wp(9))} color={colors.primary} />
          </View>
          <View style={styles.heroCopy}>
            <Text style={styles.heroTitle}>{isSpecificDayQr ? "Day Intake QR" : "Activity QR"}</Text>
            <Text style={styles.heroSubtitle}>
              {isSpecificDayQr
                ? "Quickly move this day’s intake and activity to another signed-in phone."
                : "Quickly move recent intake, activity, weight, Meal Planner, notes, and Emergency WhatsApp."}
            </Text>
          </View>
        </View>

        <View style={styles.backupPrompt}>
          <View style={styles.backupPromptIcon}>
            <Ionicons name="archive-outline" size={Math.min(hp(2.7), wp(6.2))} color={colors.primary} />
          </View>
          <View style={styles.backupPromptText}>
            <Text style={styles.backupPromptTitle}>Need full backup data?</Text>
            <Text style={styles.backupPromptSubtitle}>
              QR Transfer is best for quick daily moves. Use Backup Center for a complete encrypted .ffsync file.
            </Text>
          </View>
          <TouchableOpacity
            activeOpacity={0.82}
            onPress={() => router.push("/(main)/(settings)/backup-center" as any)}
            style={styles.backupPromptButton}
          >
            <Text style={styles.backupPromptButtonText}>Backup</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.qrPanel}>
          {qrTransferLoading ? (
            <View style={styles.inlineLoading}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.inlineLoadingText}>Preparing encrypted FitFaat transfer data...</Text>
            </View>
          ) : qrTransfer ? (
            <>
              <View style={styles.qrCodeFrame}>
                <QRCode
                  value={qrTransfer.qrValue}
                  size={Math.min(wp(68), hp(31))}
                  color="#111827"
                  backgroundColor="#FFFFFF"
                />
              </View>

              {qrTransfer.preview.isQrDense && (
                <View style={styles.qrWarningBox}>
                  <Ionicons name="warning-outline" size={Math.min(hp(2.1), wp(4.8))} color={colors.warning} />
                  <Text style={styles.qrWarningText}>
                    This QR is dense. Meal Planner data can add size, so use Send if the new phone cannot scan it.
                  </Text>
                </View>
              )}

              {renderQrTransferPreview(qrTransfer.preview)}

              <Text style={styles.qrMetaText}>
                QR day: {qrTransfer.preview.specificDayDateKey || qrTransfer.preview.latestDateKey || "--"} - Intake: {qrTransfer.preview.specificDayDateKey || qrTransfer.preview.latestNutritionDateKey || "--"} - Planner: {qrTransfer.preview.mealPlanCount} - Grocery: {qrTransfer.preview.groceryItemCount} - Notes: {qrTransfer.preview.noteCount} - Size: {qrTransfer.preview.qrSize}/{QR_ACTIVITY_DIRECT_MAX_CHARS}
              </Text>
            </>
          ) : (
            <SmartEmptyState
              icon="qr-code-outline"
              title="No QR Code"
              message={qrMessage || "No daily intake, activity, weight, Emergency WhatsApp, Meal Planner, or note data is available to move yet."}
              actionLabel="Try Again"
              onAction={generateQrCode}
              colors={colors}
              compact
              style={styles.emptyState}
            />
          )}

          <TouchableOpacity
            style={[styles.regenerateButton, qrTransferLoading && styles.disabledButton]}
            onPress={generateQrCode}
            disabled={qrTransferLoading}
            activeOpacity={0.85}
          >
            <Ionicons name="refresh" size={Math.min(hp(2), wp(4.6))} color={colors.primary} />
            <Text style={styles.regenerateButtonText}>Regenerate QR</Text>
          </TouchableOpacity>

          <View style={styles.primaryActionRow}>
            <TouchableOpacity
              style={[styles.primaryButton, qrTransferLoading && styles.disabledButton]}
              onPress={shareQrActivityData}
              disabled={qrTransferLoading}
              activeOpacity={0.85}
            >
              <Ionicons name="send" size={Math.min(hp(2), wp(4.6))} color={colors.textOnPrimary} />
              <Text style={styles.primaryButtonText}>Send</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.receiveButton, receiverOpen && styles.receiveButtonActive]}
              onPress={openReceiveData}
              activeOpacity={0.85}
            >
              <Ionicons name="scan" size={Math.min(hp(2), wp(4.6))} color={receiverOpen ? colors.textOnPrimary : colors.primary} />
              <Text style={[styles.receiveButtonText, receiverOpen && styles.receiveButtonTextActive]}>Receive</Text>
            </TouchableOpacity>
          </View>
        </View>

        {receiverOpen && (
          <View style={styles.receivePanel}>
            <View style={styles.receiveHeader}>
              <Text style={styles.receiveTitle}>Receive Data</Text>
              <TouchableOpacity onPress={() => setReceiverOpen(false)} disabled={isImportingQrTransfer}>
                <Ionicons name="close" size={Math.min(hp(2.5), wp(5.6))} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            {qrPreparedImport ? (
              <View>
                <View style={styles.qrImportHeader}>
                  <View style={styles.qrImportIcon}>
                    <Ionicons name="checkmark-circle" size={Math.min(hp(3.2), wp(7.2))} color={colors.success} />
                  </View>
                  <View style={styles.qrImportCopy}>
                    <Text style={styles.qrImportTitle}>FitFaat QR Found</Text>
                    <Text style={styles.qrImportSubtitle}>
                      QR day: {qrPreparedImport.preview.specificDayDateKey || qrPreparedImport.preview.latestDateKey || "--"} | Intake: {qrPreparedImport.preview.specificDayDateKey || qrPreparedImport.preview.latestNutritionDateKey || "--"}
                    </Text>
                  </View>
                </View>

                {renderQrTransferPreview(qrPreparedImport.preview)}

                <View style={styles.primaryActionRow}>
                  <TouchableOpacity
                    style={styles.regenerateButton}
                    onPress={resetQrScanner}
                    disabled={isImportingQrTransfer}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="scan" size={Math.min(hp(2), wp(4.6))} color={colors.primary} />
                    <Text style={styles.regenerateButtonText}>Scan Again</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.primaryButton, isImportingQrTransfer && styles.disabledButton]}
                    onPress={importQrActivityData}
                    disabled={isImportingQrTransfer}
                    activeOpacity={0.85}
                  >
                    {isImportingQrTransfer ? (
                      <ActivityIndicator size="small" color={colors.textOnPrimary} />
                    ) : (
                      <>
                        <Ionicons name="download" size={Math.min(hp(2), wp(4.6))} color={colors.textOnPrimary} />
                        <Text style={styles.primaryButtonText}>Import</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            ) : cameraPermission?.granted ? (
              <View>
                <View style={styles.qrCameraFrame}>
                  <CameraView
                    style={styles.qrCamera}
                    facing="back"
                    barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
                    onBarcodeScanned={qrScanLocked ? undefined : handleQrCodeScanned}
                  />
                  <View style={styles.qrScanGuide} />
                </View>
                {!!qrScanMessage && (
                  <Text style={styles.qrScanMessage}>{qrScanMessage}</Text>
                )}
              </View>
            ) : (
              <View>
                <SmartEmptyState
                  icon="camera-outline"
                  title="Camera Permission Needed"
                  message={qrScanMessage || "Allow camera access to scan a FitFaat QR Code."}
                  colors={colors}
                  compact
                  style={styles.emptyState}
                />
                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={async () => {
                    const permission = await requestCameraPermission();
                    setQrScanMessage(permission.granted ? null : "Camera permission is required to scan a FitFaat QR Code.");
                  }}
                  activeOpacity={0.85}
                >
                  <Ionicons name="camera" size={Math.min(hp(2), wp(4.6))} color={colors.textOnPrimary} />
                  <Text style={styles.primaryButtonText}>Allow Camera</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const getStyles = (colors: any, bottomInset: number) => StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: wp(4),
    paddingTop: hp(1.6),
    paddingBottom: Math.max(bottomInset, hp(2)) + hp(8),
    gap: hp(1.4),
  },
  hero: {
    flexDirection: "row",
    alignItems: "center",
    gap: wp(3),
    backgroundColor: colors.cardBackground,
    borderRadius: hp(1.6),
    borderWidth: 1,
    borderColor: colors.cardBorder || colors.border,
    padding: hp(1.8),
  },
  heroIcon: {
    width: Math.min(hp(6.4), wp(14)),
    height: Math.min(hp(6.4), wp(14)),
    borderRadius: Math.min(hp(3.2), wp(7)),
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: `${colors.primary}14`,
  },
  heroCopy: {
    flex: 1,
    minWidth: 0,
  },
  heroTitle: {
    color: colors.textPrimary,
    fontSize: Math.min(hp(2.35), wp(5.4)),
    fontWeight: "900",
    marginBottom: hp(0.3),
  },
  heroSubtitle: {
    color: colors.textSecondary,
    fontSize: Math.min(hp(1.45), wp(3.5)),
    fontWeight: "700",
    lineHeight: Math.min(hp(2), wp(4.6)),
  },
  backupPrompt: {
    flexDirection: "row",
    alignItems: "center",
    gap: wp(2.6),
    backgroundColor: colors.cardBackground,
    borderRadius: hp(1.5),
    borderWidth: 1,
    borderColor: colors.cardBorder || colors.border,
    padding: hp(1.4),
  },
  backupPromptIcon: {
    width: Math.min(hp(4.8), wp(10.8)),
    height: Math.min(hp(4.8), wp(10.8)),
    borderRadius: Math.min(hp(2.4), wp(5.4)),
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: `${colors.primary}12`,
  },
  backupPromptText: {
    flex: 1,
    minWidth: 0,
  },
  backupPromptTitle: {
    color: colors.textPrimary,
    fontSize: Math.min(hp(1.65), wp(3.9)),
    fontWeight: "900",
    marginBottom: hp(0.25),
  },
  backupPromptSubtitle: {
    color: colors.textSecondary,
    fontSize: Math.min(hp(1.3), wp(3.1)),
    fontWeight: "700",
    lineHeight: Math.min(hp(1.8), wp(4.1)),
  },
  backupPromptButton: {
    minHeight: hp(4.2),
    borderRadius: hp(1.1),
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: wp(3),
    backgroundColor: `${colors.primary}12`,
    borderWidth: 1,
    borderColor: `${colors.primary}40`,
  },
  backupPromptButtonText: {
    color: colors.primary,
    fontSize: Math.min(hp(1.35), wp(3.2)),
    fontWeight: "900",
  },
  qrPanel: {
    backgroundColor: colors.cardBackground,
    borderRadius: hp(1.8),
    borderWidth: 1,
    borderColor: colors.cardBorder || colors.border,
    padding: hp(1.8),
  },
  inlineLoading: {
    minHeight: hp(30),
    alignItems: "center",
    justifyContent: "center",
    gap: hp(1),
  },
  inlineLoadingText: {
    color: colors.textSecondary,
    fontSize: Math.min(hp(1.45), wp(3.4)),
    fontWeight: "700",
    textAlign: "center",
  },
  qrCodeFrame: {
    alignSelf: "center",
    padding: hp(1.6),
    borderRadius: hp(1.6),
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: hp(1.8),
  },
  qrWarningBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: wp(2),
    borderRadius: hp(1.3),
    padding: hp(1.2),
    backgroundColor: `${colors.warning || "#F59E0B"}14`,
    borderWidth: 1,
    borderColor: `${colors.warning || "#F59E0B"}44`,
    marginBottom: hp(1.4),
  },
  qrWarningText: {
    flex: 1,
    fontSize: Math.min(hp(1.35), wp(3.2)),
    fontWeight: "700",
    color: colors.textPrimary,
    lineHeight: Math.min(hp(1.9), wp(4.3)),
  },
  qrPreviewGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: hp(1.2),
  },
  qrPreviewCard: {
    width: "48%",
    borderRadius: hp(1.4),
    paddingVertical: hp(1.35),
    paddingHorizontal: wp(3),
    backgroundColor: colors.primarySoft || colors.surface || colors.screenColor,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: hp(1),
  },
  qrPreviewValue: {
    fontSize: Math.min(hp(2), wp(4.7)),
    fontWeight: "900",
    color: colors.textPrimary,
    marginBottom: hp(0.25),
  },
  qrPreviewLabel: {
    fontSize: Math.min(hp(1.25), wp(3)),
    fontWeight: "700",
    color: colors.textSecondary,
  },
  qrMetaText: {
    fontSize: Math.min(hp(1.3), wp(3.1)),
    fontWeight: "700",
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: hp(1.4),
  },
  emptyState: {
    marginVertical: hp(1),
  },
  regenerateButton: {
    minHeight: hp(5.1),
    borderRadius: hp(1.4),
    backgroundColor: `${colors.primary}12`,
    borderWidth: 1,
    borderColor: `${colors.primary}44`,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: wp(1.8),
    paddingHorizontal: wp(3),
  },
  regenerateButtonText: {
    color: colors.primary,
    fontSize: Math.min(hp(1.5), wp(3.5)),
    fontWeight: "900",
  },
  primaryActionRow: {
    flexDirection: "row",
    gap: wp(2.5),
    marginTop: hp(1),
  },
  primaryButton: {
    flex: 1,
    minHeight: hp(5.1),
    borderRadius: hp(1.4),
    backgroundColor: colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: wp(1.8),
    paddingHorizontal: wp(3),
  },
  primaryButtonText: {
    color: colors.textOnPrimary,
    fontSize: Math.min(hp(1.5), wp(3.5)),
    fontWeight: "900",
  },
  receiveButton: {
    flex: 1,
    minHeight: hp(5.1),
    borderRadius: hp(1.4),
    backgroundColor: colors.surface || colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.cardBorder || colors.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: wp(1.8),
    paddingHorizontal: wp(3),
  },
  receiveButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  receiveButtonText: {
    color: colors.primary,
    fontSize: Math.min(hp(1.5), wp(3.5)),
    fontWeight: "900",
  },
  receiveButtonTextActive: {
    color: colors.textOnPrimary,
  },
  disabledButton: {
    opacity: 0.7,
  },
  receivePanel: {
    backgroundColor: colors.cardBackground,
    borderRadius: hp(1.8),
    borderWidth: 1,
    borderColor: colors.cardBorder || colors.border,
    padding: hp(1.8),
  },
  receiveHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: hp(1.5),
  },
  receiveTitle: {
    color: colors.textPrimary,
    fontSize: Math.min(hp(2), wp(4.7)),
    fontWeight: "900",
  },
  qrCameraFrame: {
    height: hp(42),
    borderRadius: hp(1.6),
    overflow: "hidden",
    backgroundColor: colors.black || "#000000",
    marginBottom: hp(1.3),
  },
  qrCamera: {
    flex: 1,
  },
  qrScanGuide: {
    position: "absolute",
    alignSelf: "center",
    top: "22%",
    width: "58%",
    aspectRatio: 1,
    borderRadius: hp(1.2),
    borderWidth: 3,
    borderColor: colors.textOnPrimary,
    backgroundColor: "transparent",
  },
  qrScanMessage: {
    minHeight: hp(2.4),
    fontSize: Math.min(hp(1.35), wp(3.2)),
    fontWeight: "700",
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: hp(0.5),
  },
  qrImportHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: wp(3),
    borderRadius: hp(1.4),
    padding: hp(1.5),
    backgroundColor: `${colors.success || "#10B981"}12`,
    borderWidth: 1,
    borderColor: `${colors.success || "#10B981"}34`,
    marginBottom: hp(1.4),
  },
  qrImportIcon: {
    width: Math.min(hp(5), wp(11)),
    height: Math.min(hp(5), wp(11)),
    borderRadius: Math.min(hp(2.5), wp(5.5)),
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.cardBackground,
  },
  qrImportCopy: {
    flex: 1,
    minWidth: 0,
  },
  qrImportTitle: {
    fontSize: Math.min(hp(1.75), wp(4.1)),
    fontWeight: "900",
    color: colors.textPrimary,
    marginBottom: hp(0.25),
  },
  qrImportSubtitle: {
    fontSize: Math.min(hp(1.35), wp(3.2)),
    fontWeight: "700",
    color: colors.textSecondary,
  },
});
