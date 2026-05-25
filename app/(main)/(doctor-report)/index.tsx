import AppHeader from "@/components/AppHeader";
import { useTheme } from "@/contexts/ThemeContext";
import {
  buildDoctorProgressReport,
  shareDoctorProgressReport,
  type DoctorProgressReport,
  type DoctorReportRange,
} from "@/utils/doctorProgressReport";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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

const formatWeightChange = (value: number | null) => {
  if (value === null) return "--";
  if (value > 0) return `+${value} kg`;
  return `${value} kg`;
};

export default function DoctorProgressReportScreen() {
  const { colors, isDarkMode } = useTheme();
  const styles = useMemo(() => getStyles(colors), [colors]);
  const [range, setRange] = useState<DoctorReportRange>("weekly");
  const [report, setReport] = useState<DoctorProgressReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    let active = true;

    const loadReport = async () => {
      setLoading(true);
      try {
        const nextReport = await buildDoctorProgressReport(range);
        if (active) setReport(nextReport);
      } catch (error) {
        console.log("[DoctorReport] Unable to build report:", error);
        if (active) setReport(null);
      } finally {
        if (active) setLoading(false);
      }
    };

    loadReport();

    return () => {
      active = false;
    };
  }, [range]);

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

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
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
                  Calories, hydration, weight, notes, missed days, and goal trend.
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

            <View style={styles.summaryGrid}>
              <SummaryTile label="Tracked" value={`${report.summary.trackedDays}/${report.days.length}`} colors={colors} />
              <SummaryTile label="Missed" value={String(report.summary.missedDays)} colors={colors} />
              <SummaryTile label="Goal" value={`${report.summary.averageGoalProgress}%`} colors={colors} />
              <SummaryTile label="Calories" value={`${report.summary.averageCalories}`} colors={colors} />
              <SummaryTile label="Water" value={`${report.summary.averageHydration}L`} colors={colors} />
              <SummaryTile label="Steps" value={report.summary.totalSteps.toLocaleString()} colors={colors} />
              <SummaryTile label="Weight" value={`${report.summary.latestWeightKg ?? "--"}kg`} colors={colors} />
              <SummaryTile label="Change" value={formatWeightChange(report.summary.weightChangeKg)} colors={colors} />
              <SummaryTile label="Notes" value={String(report.summary.notesCount)} colors={colors} />
            </View>

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

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Doctor Notes</Text>
              {report.notes.length ? (
                report.notes.slice(0, 5).map((note) => (
                  <View key={note.id} style={styles.noteRow}>
                    <Text style={styles.noteTitle}>{note.title}</Text>
                    <Text style={styles.noteBody} numberOfLines={3}>{note.body}</Text>
                  </View>
                ))
              ) : (
                <Text style={styles.emptyText}>No notes in this range.</Text>
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

function SummaryTile({ label, value, colors }: { label: string; value: string; colors: any }) {
  const styles = getStyles(colors);
  return (
    <View style={styles.summaryTile}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
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
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: wp(2.2),
    marginTop: hp(1.4),
  },
  summaryTile: {
    width: "31.4%",
    minHeight: hp(8),
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
  noteRow: {
    paddingVertical: hp(1),
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder || colors.border,
  },
  noteTitle: {
    color: colors.textPrimary,
    fontWeight: "900",
  },
  noteBody: {
    color: colors.textSecondary,
    marginTop: hp(0.35),
    lineHeight: hp(2.2),
  },
  emptyText: {
    color: colors.textSecondary,
    lineHeight: hp(2.2),
  },
});
