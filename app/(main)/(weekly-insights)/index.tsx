import AppHeader from "@/components/AppHeader";
import { useTheme } from "@/contexts/ThemeContext";
import { buildDoctorProgressReport } from "@/utils/doctorProgressReport";
import type { WeeklyInsight } from "@/utils/weeklyInsights";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from "react-native-responsive-screen";
import { SafeAreaView } from "react-native-safe-area-context";

const toneColor = (tone: WeeklyInsight["tone"]) => {
  if (tone === "good") return "#10B981";
  if (tone === "warning") return "#F97316";
  return "#64748B";
};

export default function WeeklyInsightsScreen() {
  const { colors, isDarkMode } = useTheme();
  const styles = useMemo(() => getStyles(colors), [colors]);
  const [insights, setInsights] = useState<WeeklyInsight[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    buildDoctorProgressReport("weekly")
      .then((report) => {
        if (active) setInsights(report.insights);
      })
      .catch((error) => {
        console.log("[WeeklyInsights] Unable to load insights:", error);
        if (active) setInsights([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.screenColor }]} edges={["top"]}>
      <StatusBar
        barStyle={isDarkMode ? "light-content" : "dark-content"}
        backgroundColor={colors.screenColor}
      />
      <AppHeader title="Weekly Insights" showStepIndicator={false} showBackButton />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Text style={styles.eyebrow}>Meaning</Text>
          <Text style={styles.title}>What changed this week</Text>
          <Text style={styles.subtitle}>
            Simple explanations from your calories, hydration, steps, missed days, and goal trend.
          </Text>
        </View>

        {loading ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : insights.length ? (
          insights.map((insight) => {
            const color = toneColor(insight.tone);
            return (
              <View key={insight.id} style={styles.insightRow}>
                <View style={[styles.iconWrap, { backgroundColor: `${color}18` }]}>
                  <Ionicons name={insight.icon} size={hp(2.7)} color={color} />
                </View>
                <View style={styles.insightCopy}>
                  <Text style={styles.insightTitle}>{insight.title}</Text>
                  <Text style={styles.insightBody}>{insight.body}</Text>
                </View>
                {!!insight.value && <Text style={[styles.insightValue, { color }]}>{insight.value}</Text>}
              </View>
            );
          })
        ) : (
          <View style={styles.loadingCard}>
            <Ionicons name="analytics-outline" size={hp(4)} color={colors.primary} />
            <Text style={styles.emptyText}>Log one meal and water entry to build weekly insights.</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  content: {
    paddingHorizontal: wp(4),
    paddingBottom: hp(8),
  },
  hero: {
    backgroundColor: colors.cardBackground,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.cardBorder || colors.border,
    padding: wp(4),
    marginVertical: hp(1.2),
  },
  eyebrow: {
    color: colors.primary,
    fontSize: Math.min(hp(1.2), wp(2.9)),
    fontWeight: "900",
    textTransform: "uppercase",
  },
  title: {
    color: colors.textPrimary,
    fontSize: Math.min(hp(2.45), wp(5.5)),
    fontWeight: "900",
    marginTop: hp(0.3),
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: Math.min(hp(1.5), wp(3.4)),
    lineHeight: hp(2.25),
    marginTop: hp(0.5),
  },
  loadingCard: {
    minHeight: hp(22),
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.cardBackground,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.cardBorder || colors.border,
    padding: wp(5),
  },
  insightRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: wp(3),
    backgroundColor: colors.cardBackground,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.cardBorder || colors.border,
    padding: wp(3.4),
    marginBottom: hp(1),
  },
  iconWrap: {
    width: hp(5.2),
    height: hp(5.2),
    borderRadius: hp(2.6),
    alignItems: "center",
    justifyContent: "center",
  },
  insightCopy: {
    flex: 1,
    minWidth: 0,
  },
  insightTitle: {
    color: colors.textPrimary,
    fontWeight: "900",
    fontSize: Math.min(hp(1.75), wp(4)),
  },
  insightBody: {
    color: colors.textSecondary,
    fontSize: Math.min(hp(1.42), wp(3.25)),
    lineHeight: hp(2.15),
    marginTop: hp(0.25),
  },
  insightValue: {
    fontWeight: "900",
    fontSize: Math.min(hp(1.7), wp(3.8)),
    maxWidth: wp(18),
  },
  emptyText: {
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: hp(2.3),
  },
});

