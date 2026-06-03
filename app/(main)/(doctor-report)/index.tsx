import AppHeader from "@/components/AppHeader";
import { useTheme } from "@/contexts/ThemeContext";
import {
  buildDoctorProgressReport,
  shareDoctorProgressReport,
  type DoctorReportMetricTrust,
  type DoctorProgressReport,
  type DoctorReportRange,
} from "@/utils/doctorProgressReport";
import { getIsPremiumUser } from "@/utils/premiumAccess";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  AppState,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from "react-native-responsive-screen";
import { SafeAreaView } from "react-native-safe-area-context";

const reportRanges: { key: DoctorReportRange; label: string }[] = [
  { key: "weekly", label: "Weekly" },
  { key: "monthly", label: "Monthly" },
];

const formatWeightValue = (value?: number | null) =>
  value === null || value === undefined ? "--" : `${value} kg`;

const formatDateTime = (value?: string | null) => {
  if (!value) return "Not refreshed yet";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not refreshed yet";
  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const formatDataDate = (value?: string | null) => {
  if (!value) return "No logged data";
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
};

export default function DoctorProgressReportScreen() {
  const { colors, isDarkMode } = useTheme();
  const styles = useMemo(() => getStyles(colors), [colors]);
  const [range, setRange] = useState<DoctorReportRange>("weekly");
  const [report, setReport] = useState<DoctorProgressReport | null>(null);
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sharing, setSharing] = useState(false);
  const loadRequestIdRef = useRef(0);
  const hasLoadedReportRef = useRef(false);
  const previousRangeRef = useRef(range);

  const loadReport = useCallback(
    async (options: { showLoading?: boolean; refreshing?: boolean } = {}) => {
      const requestId = ++loadRequestIdRef.current;

      if (options.refreshing) {
        setRefreshing(true);
      } else if (options.showLoading || !hasLoadedReportRef.current) {
        setLoading(true);
      }

      try {
        const premiumActive = await getIsPremiumUser();
        if (loadRequestIdRef.current === requestId) {
          setIsPremium(premiumActive);
        }
        const nextReport = await buildDoctorProgressReport(range, { isPremium: premiumActive });
        if (loadRequestIdRef.current === requestId) {
          setReport(nextReport);
        }
      } catch (error) {
        console.log("[DoctorReport] Unable to build report:", error);
        if (loadRequestIdRef.current === requestId) {
          setReport(null);
        }
      } finally {
        if (loadRequestIdRef.current === requestId) {
          hasLoadedReportRef.current = true;
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [range]
  );

  useFocusEffect(
    useCallback(() => {
      const rangeChanged = previousRangeRef.current !== range;
      previousRangeRef.current = range;
      loadReport({ showLoading: rangeChanged || !hasLoadedReportRef.current });

      return () => {
        loadRequestIdRef.current += 1;
      };
    }, [loadReport, range])
  );

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        loadReport();
      }
    });

    return () => {
      subscription.remove();
      loadRequestIdRef.current += 1;
    };
  }, [loadReport]);

  const maxCalories = Math.max(1, ...(report?.days.map((day) => day.targetCalories || day.calories) || [1]));
  const maxHydration = Math.max(1, ...(report?.days.map((day) => day.targetHydration || day.hydration) || [1]));
  const maxSteps = Math.max(1, ...(report?.days.map((day) => day.steps) || [1]));

  const handleShare = async () => {
    if (!report || sharing) return;
    setSharing(true);
    try {
      await shareDoctorProgressReport(report);
    } catch (error) {
      console.log("[DoctorReport] Share failed:", error);
      Alert.alert("Share Failed", "FitFaat could not share this report right now.");
    } finally {
      setSharing(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.screenColor }]} edges={["top"]}>
      <StatusBar
        barStyle={isDarkMode ? "light-content" : "dark-content"}
        backgroundColor={colors.screenColor}
      />
      <AppHeader title="Doctor Report" showStepIndicator={false} showBackButton />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadReport({ refreshing: true })}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        <View style={styles.segmentedControl}>
          {reportRanges.map((item) => (
            <TouchableOpacity
              key={item.key}
              activeOpacity={0.78}
              onPress={() => setRange(item.key)}
              style={[styles.segmentButton, range === item.key && styles.segmentButtonActive]}
            >
              <Text style={[styles.segmentText, range === item.key && styles.segmentTextActive]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {loading ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Preparing doctor-ready report...</Text>
          </View>
        ) : report ? (
          <>
            <View style={styles.hero}>
              <View style={styles.heroCopy}>
                <Text style={styles.eyebrow}>{range === "monthly" ? "Monthly" : "Weekly"}</Text>
                <Text style={styles.title}>Progress Report</Text>
                <Text style={styles.subtitle}>
                  Calories, hydration, weight, missed days, and goal trend.
                </Text>
                <Text style={styles.trustLine}>
                  Last updated {formatDateTime(report.dataTrust.lastUpdatedAt)} | Latest data {formatDataDate(report.dataTrust.latestDataDate)}
                </Text>
              </View>
              <TouchableOpacity style={styles.shareButton} onPress={handleShare} activeOpacity={0.78}>
                {sharing ? (
                  <ActivityIndicator color={colors.textOnPrimary} />
                ) : (
                  <>
                    <Ionicons name="share-social-outline" size={hp(2.2)} color={colors.textOnPrimary} />
                    <Text style={styles.shareText}>Share PDF</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.doctorSummaryCard}>
              <View style={styles.doctorSummaryHeader}>
                <View>
                  <Text style={styles.eyebrow}>Appointment tool</Text>
                  <Text style={styles.sectionTitle}>Doctor Summary</Text>
                </View>
                <View style={styles.doctorSummaryBadge}>
                  <Ionicons name="medkit-outline" size={hp(1.7)} color={colors.primary} />
                  <Text style={styles.doctorSummaryBadgeText}>{report.doctorSummary.missedDays}</Text>
                </View>
              </View>
              <View style={styles.summaryColumns}>
                <SummaryList title="Key wins" items={report.doctorSummary.wins} colors={colors} />
                <SummaryList title="Risks / gaps" items={report.doctorSummary.risks} colors={colors} />
              </View>
              <View style={styles.weightTrendRow}>
                <Ionicons name="scale-outline" size={hp(1.9)} color={colors.primary} />
                <Text style={styles.weightTrendText}>{report.doctorSummary.weightTrend}</Text>
              </View>
              <Text style={styles.questionTitle}>Ask your doctor</Text>
              {report.doctorSummary.suggestedQuestions.map((question) => (
                <View key={question} style={styles.questionRow}>
                  <Ionicons name="chatbubble-ellipses-outline" size={hp(1.7)} color={colors.primary} />
                  <Text style={styles.questionText}>{question}</Text>
                </View>
              ))}
            </View>

            <View style={styles.summaryGrid}>
              <SummaryTile label="Tracked" value={`${report.summary.trackedDays}/${report.days.length}`} colors={colors} />
              <SummaryTile label="Missed" value={String(report.summary.missedDays)} colors={colors} />
              <SummaryTile label="Goal" value={`${report.summary.averageGoalProgress}%`} colors={colors} trust={report.dataTrust.metrics.goal} />
              <SummaryTile label="Calories" value={`${report.summary.averageCalories}`} colors={colors} trust={report.dataTrust.metrics.calories} />
              <SummaryTile label="Water" value={`${report.summary.averageHydration}L`} colors={colors} trust={report.dataTrust.metrics.water} />
              <SummaryTile label="Steps" value={report.summary.totalSteps.toLocaleString()} colors={colors} trust={report.dataTrust.metrics.steps} />
              <SummaryTile label="Current Weight" value={formatWeightValue(report.summary.currentWeightKg)} colors={colors} trust={report.dataTrust.metrics.weight} />
              <SummaryTile label="Starting Weight" value={formatWeightValue(report.summary.startingWeightKg)} colors={colors} trust={report.dataTrust.metrics.weight} />
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Data Trust</Text>
              <Text style={styles.emptyText}>
                Calories and water are averages of days that actually have those logs. Empty days are tracked separately as missed days.
              </Text>
              <View style={styles.trustGrid}>
                {Object.entries(report.dataTrust.metrics).map(([key, trust]) => (
                  <TrustMetric key={key} label={key} trust={trust} colors={colors} />
                ))}
              </View>
            </View>

            {!isPremium ? (
              <View style={styles.premiumPreview}>
                <View style={styles.premiumPreviewIcon}>
                  <Ionicons name="diamond-outline" size={hp(2.5)} color={colors.primary} />
                </View>
                <View style={styles.premiumPreviewCopy}>
                  <Text style={styles.premiumPreviewTitle}>Premium report preview</Text>
                  <Text style={styles.premiumPreviewBody}>
                    Premium would explain why goal progress changed, connect walking/workout signals, and highlight the clearest next appointment talking point.
                  </Text>
                </View>
                <View style={styles.lockPill}>
                  <Ionicons name="lock-closed-outline" size={hp(1.35)} color={colors.primary} />
                  <Text style={styles.lockPillText}>Preview</Text>
                </View>
              </View>
            ) : null}

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Daily Charts</Text>
              {report.days.length ? (
                report.days.map((day) => (
                  <View key={`${day.dateKey}-${day.label}`} style={styles.dayRow}>
                    <Text style={styles.dayLabel}>{day.label}</Text>
                    <View style={styles.dayBars}>
                      <Bar value={day.calories} max={maxCalories} color="#F97316" />
                      <Bar value={day.hydration} max={maxHydration} color="#0EA5E9" />
                      <Bar value={day.steps} max={maxSteps} color="#14B8A6" />
                    </View>
                    <Text style={styles.dayScore}>{day.goalProgress}%</Text>
                  </View>
                ))
              ) : (
                <Text style={styles.emptyText}>Open Dashboard once so FitFaat can prepare report days.</Text>
              )}
            </View>

          </>
        ) : (
          <View style={styles.loadingCard}>
            <Ionicons name="document-text-outline" size={hp(4)} color={colors.primary} />
            <Text style={styles.loadingText}>Report data is not ready yet.</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function SummaryList({ title, items, colors }: { title: string; items: string[]; colors: any }) {
  const styles = getStyles(colors);
  return (
    <View style={styles.summaryList}>
      <Text style={styles.summaryListTitle}>{title}</Text>
      {items.map((item) => (
        <View key={item} style={styles.summaryBulletRow}>
          <View style={styles.summaryBullet} />
          <Text style={styles.summaryBulletText}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

function SummaryTile({
  label,
  value,
  colors,
  trust,
}: {
  label: string;
  value: string;
  colors: any;
  trust?: DoctorReportMetricTrust;
}) {
  const styles = getStyles(colors);
  return (
    <View style={styles.summaryTile}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
      {trust ? (
        <Text style={styles.summarySource} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.68}>
          {trust.sourceLabel}
        </Text>
      ) : null}
    </View>
  );
}

function TrustMetric({
  label,
  trust,
  colors,
}: {
  label: string;
  trust: DoctorReportMetricTrust;
  colors: any;
}) {
  const styles = getStyles(colors);
  const title = label === "water" ? "Water" : label.charAt(0).toUpperCase() + label.slice(1);

  return (
    <View style={styles.trustMetric}>
      <View style={styles.trustMetricTop}>
        <Text style={styles.trustMetricTitle}>{title}</Text>
        <Text style={styles.trustMetricDate}>{formatDataDate(trust.latestDataDate)}</Text>
      </View>
      <Text style={styles.trustMetricSource}>{trust.sourceLabel}</Text>
      <Text style={styles.trustMetricExplanation}>{trust.explanation}</Text>
    </View>
  );
}

function Bar({ value, max, color }: { value: number; max: number; color: string }) {
  return (
    <View style={barStyles.track}>
      <View style={[barStyles.fill, { width: `${Math.min(100, Math.max(0, (value / max) * 100))}%`, backgroundColor: color }]} />
    </View>
  );
}

const barStyles = StyleSheet.create({
  track: {
    height: hp(0.85),
    borderRadius: hp(0.45),
    backgroundColor: "#E2E8F0",
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: hp(0.45),
  },
});

const getStyles = (colors: any) => StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  content: {
    paddingHorizontal: wp(4),
    paddingBottom: hp(8),
  },
  segmentedControl: {
    flexDirection: "row",
    padding: 4,
    borderRadius: 8,
    backgroundColor: colors.surface || colors.cardBackground,
    marginVertical: hp(1.2),
  },
  segmentButton: {
    flex: 1,
    minHeight: hp(4.6),
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 7,
  },
  segmentButtonActive: {
    backgroundColor: colors.primary,
  },
  segmentText: {
    color: colors.textSecondary,
    fontWeight: "800",
  },
  segmentTextActive: {
    color: colors.textOnPrimary,
  },
  loadingCard: {
    minHeight: hp(28),
    alignItems: "center",
    justifyContent: "center",
    gap: hp(1.2),
    backgroundColor: colors.cardBackground,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.cardBorder || colors.border,
    padding: wp(5),
  },
  loadingText: {
    color: colors.textSecondary,
    textAlign: "center",
    fontWeight: "700",
  },
  hero: {
    backgroundColor: colors.cardBackground,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.cardBorder || colors.border,
    paddingHorizontal: wp(4.8),
    paddingVertical: hp(1.7),
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: wp(3),
  },
  heroCopy: {
    flex: 1,
    minWidth: 0,
    paddingRight: wp(1),
  },
  eyebrow: {
    color: colors.primary,
    fontSize: Math.min(hp(1.25), wp(3)),
    fontWeight: "900",
    textTransform: "uppercase",
  },
  title: {
    color: colors.textPrimary,
    fontSize: Math.min(hp(2.4), wp(5.4)),
    fontWeight: "900",
    marginTop: hp(0.2),
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: Math.min(hp(1.45), wp(3.4)),
    marginTop: hp(0.4),
    maxWidth: wp(48),
  },
  trustLine: {
    color: colors.textTertiary || colors.textSecondary,
    fontSize: Math.min(hp(1.08), wp(2.55)),
    fontWeight: "800",
    lineHeight: hp(1.6),
    marginTop: hp(0.65),
    maxWidth: wp(50),
  },
  shareButton: {
    minHeight: Math.min(hp(5.2), wp(12)),
    maxWidth: wp(32),
    borderRadius: 8,
    paddingHorizontal: wp(3),
    paddingVertical: hp(0.9),
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    flexShrink: 0,
    gap: wp(1.4),
  },
  shareText: {
    color: colors.textOnPrimary,
    fontSize: Math.min(hp(1.55), wp(3.45)),
    fontWeight: "900",
  },
  doctorSummaryCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.cardBorder || colors.border,
    padding: wp(4),
    marginTop: hp(1.4),
  },
  doctorSummaryHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: wp(3),
    marginBottom: hp(0.4),
  },
  doctorSummaryBadge: {
    minHeight: hp(3.2),
    borderRadius: hp(1.6),
    paddingHorizontal: wp(2.4),
    flexDirection: "row",
    alignItems: "center",
    gap: wp(1),
    backgroundColor: `${colors.primary}10`,
  },
  doctorSummaryBadgeText: {
    color: colors.primary,
    fontSize: Math.min(hp(1.12), wp(2.7)),
    fontWeight: "900",
  },
  summaryColumns: {
    flexDirection: "row",
    gap: wp(3),
    marginTop: hp(0.8),
  },
  summaryList: {
    flex: 1,
    minWidth: 0,
  },
  summaryListTitle: {
    color: colors.textPrimary,
    fontSize: Math.min(hp(1.35), wp(3.2)),
    fontWeight: "900",
    marginBottom: hp(0.45),
  },
  summaryBulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: wp(1.3),
    marginTop: hp(0.35),
  },
  summaryBullet: {
    width: hp(0.6),
    height: hp(0.6),
    borderRadius: hp(0.3),
    backgroundColor: colors.primary,
    marginTop: hp(0.58),
  },
  summaryBulletText: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: Math.min(hp(1.14), wp(2.7)),
    lineHeight: hp(1.65),
    fontWeight: "700",
  },
  weightTrendRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: wp(1.4),
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder || colors.border,
    marginTop: hp(1.2),
    paddingTop: hp(1),
  },
  weightTrendText: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: Math.min(hp(1.2), wp(2.85)),
    fontWeight: "800",
  },
  questionTitle: {
    color: colors.textPrimary,
    fontSize: Math.min(hp(1.35), wp(3.2)),
    fontWeight: "900",
    marginTop: hp(1.2),
    marginBottom: hp(0.35),
  },
  questionRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: wp(1.5),
    marginTop: hp(0.55),
  },
  questionText: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: Math.min(hp(1.16), wp(2.75)),
    lineHeight: hp(1.72),
    fontWeight: "700",
  },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: wp(2.2),
    marginTop: hp(1.4),
  },
  summaryTile: {
    width: "31.4%",
    minHeight: hp(9.2),
    backgroundColor: colors.cardBackground,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.cardBorder || colors.border,
    padding: wp(2.4),
    justifyContent: "center",
  },
  summaryLabel: {
    color: colors.textSecondary,
    fontSize: Math.min(hp(1.2), wp(2.8)),
    fontWeight: "800",
  },
  summaryValue: {
    color: colors.textPrimary,
    fontSize: Math.min(hp(2.15), wp(4.7)),
    fontWeight: "900",
    marginTop: hp(0.45),
  },
  summarySource: {
    color: colors.primary,
    fontSize: Math.min(hp(0.94), wp(2.2)),
    fontWeight: "900",
    marginTop: hp(0.4),
  },
  section: {
    backgroundColor: colors.cardBackground,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.cardBorder || colors.border,
    padding: wp(4),
    marginTop: hp(1.4),
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: Math.min(hp(2), wp(4.5)),
    fontWeight: "900",
    marginBottom: hp(1.2),
  },
  trustGrid: {
    marginTop: hp(1.1),
  },
  trustMetric: {
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder || colors.border,
    paddingVertical: hp(1),
  },
  trustMetricTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: wp(2),
  },
  trustMetricTitle: {
    color: colors.textPrimary,
    fontSize: Math.min(hp(1.32), wp(3.1)),
    fontWeight: "900",
    textTransform: "capitalize",
  },
  trustMetricDate: {
    color: colors.textTertiary || colors.textSecondary,
    fontSize: Math.min(hp(1.02), wp(2.45)),
    fontWeight: "800",
  },
  trustMetricSource: {
    color: colors.primary,
    fontSize: Math.min(hp(1.08), wp(2.55)),
    fontWeight: "900",
    marginTop: hp(0.25),
  },
  trustMetricExplanation: {
    color: colors.textSecondary,
    fontSize: Math.min(hp(1.08), wp(2.55)),
    lineHeight: hp(1.58),
    fontWeight: "700",
    marginTop: hp(0.25),
  },
  premiumPreview: {
    backgroundColor: colors.cardBackground,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: `${colors.primary}35`,
    padding: wp(3.4),
    marginTop: hp(1.4),
    flexDirection: "row",
    alignItems: "center",
    gap: wp(2.5),
  },
  premiumPreviewIcon: {
    width: hp(4.7),
    height: hp(4.7),
    borderRadius: hp(2.35),
    backgroundColor: `${colors.primary}12`,
    alignItems: "center",
    justifyContent: "center",
  },
  premiumPreviewCopy: {
    flex: 1,
    minWidth: 0,
  },
  premiumPreviewTitle: {
    color: colors.textPrimary,
    fontSize: Math.min(hp(1.42), wp(3.35)),
    fontWeight: "900",
  },
  premiumPreviewBody: {
    color: colors.textSecondary,
    fontSize: Math.min(hp(1.12), wp(2.65)),
    lineHeight: hp(1.68),
    fontWeight: "700",
    marginTop: hp(0.25),
  },
  lockPill: {
    minHeight: hp(2.7),
    borderRadius: hp(1.35),
    paddingHorizontal: wp(2),
    flexDirection: "row",
    alignItems: "center",
    gap: wp(0.7),
    backgroundColor: `${colors.primary}10`,
  },
  lockPillText: {
    color: colors.primary,
    fontSize: Math.min(hp(1), wp(2.35)),
    fontWeight: "900",
  },
  dayRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: wp(2.2),
    minHeight: hp(4.8),
  },
  dayLabel: {
    width: wp(14),
    color: colors.textPrimary,
    fontWeight: "800",
    fontSize: Math.min(hp(1.35), wp(3.2)),
  },
  dayBars: {
    flex: 1,
    gap: hp(0.45),
  },
  dayScore: {
    width: wp(10),
    textAlign: "right",
    color: colors.textSecondary,
    fontWeight: "900",
  },
  emptyText: {
    color: colors.textSecondary,
    lineHeight: hp(2.2),
  },
});
