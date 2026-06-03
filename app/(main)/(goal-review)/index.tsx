import AppHeader from "@/components/AppHeader";
import { useTheme } from "@/contexts/ThemeContext";
import { getStoredDashboardCache } from "@/utils/dashboardStorage";
import {
  GOAL_SPINE_CHOICES,
  buildGoalSpineSummary,
  loadGoalSpineKey,
  saveGoalSpineKey,
  type GoalSpineAction,
  type GoalSpineDay,
  type GoalSpineKey,
} from "@/utils/goalSpine";
import {
  buildGoalProgressInterpretation,
  buildWeeklyGoalAdjustmentPlan,
  loadGoalTimelineSummary,
  type GoalTimelineSummary,
} from "@/utils/goalAdaptivePlan";
import { loadGoalDisplayMode, type GoalDisplayMode } from "@/utils/goalTargetDisplay";
import { buildWeeklyNutritionReport } from "@/utils/nutritionInsights";
import { getIsPremiumUser } from "@/utils/premiumAccess";
import { tokenStorage } from "@/utils/auth/tokenStorage";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
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

type IconName = keyof typeof Ionicons.glyphMap;

const extractDashboardDays = (value: any): GoalSpineDay[] => {
  const data = value?.data && typeof value.data === "object" && !Array.isArray(value.data)
    ? value.data
    : value;

  if (!data || typeof data !== "object" || Array.isArray(data)) return [];

  return Object.values(data)
    .filter((day) => day && typeof day === "object")
    .map((day: any, index) => ({
      dayNo: Number(day.dayNo || index + 1),
      ...day,
    })) as GoalSpineDay[];
};

const normalizeNutritionStatus = (
  status?: string
): "locked" | "active" | "finished" | undefined =>
  status === "locked" || status === "active" || status === "finished" ? status : undefined;

const getActionRoute = (action: GoalSpineAction) => {
  if (action === "goalReview") return "/(main)/(goal-review)";
  if (action === "mealPlanner") return "/(main)/(meal-planner)";
  if (action === "mindfulness") return "/(main)/(mindfulness)";
  if (action === "steps") return "/(main)/(steps)";
  if (action === "workout") return "/(main)/(exercises)/workout";
  if (action === "note") return "/(main)/(notes)";
  return "/(main)/(dashboard)";
};

export default function GoalReviewScreen() {
  const router = useRouter();
  const { colors, isDarkMode } = useTheme();
  const styles = useMemo(() => getStyles(colors), [colors]);
  const [goal, setGoal] = useState<GoalSpineKey>("unset");
  const [days, setDays] = useState<GoalSpineDay[]>([]);
  const [goalDisplayMode, setGoalDisplayMode] = useState<GoalDisplayMode>("ranges");
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savingGoal, setSavingGoal] = useState<GoalSpineKey | null>(null);
  const [timeline, setTimeline] = useState<GoalTimelineSummary | null>(null);

  const nutritionDays = useMemo(
    () =>
      days.map((day, index) => ({
        ...day,
        dayNo: Number(day.dayNo || index + 1),
        status: normalizeNutritionStatus(day.status),
      })),
    [days]
  );
  const nutritionReport = useMemo(
    () => buildWeeklyNutritionReport(nutritionDays),
    [nutritionDays]
  );
  const summary = useMemo(
    () =>
      buildGoalSpineSummary({
        goal,
        days,
        goalDisplayMode,
        plan: isPremium ? "premium" : "free",
        nutritionReport,
      }),
    [days, goal, goalDisplayMode, isPremium, nutritionReport]
  );
  const weightTrendCaloriesAdjustment = useMemo(
    () =>
      days
        .map((day) => Number((day as any).weightTrendCaloriesAdjustment || 0))
        .find((value) => Number.isFinite(value) && value !== 0) || 0,
    [days]
  );
  const adjustmentPlan = useMemo(
    () =>
      buildWeeklyGoalAdjustmentPlan({
        goal,
        days,
        summary,
        isPremium,
        weightTrendCaloriesAdjustment,
      }),
    [days, goal, isPremium, summary, weightTrendCaloriesAdjustment]
  );
  const progressInterpretation = useMemo(
    () =>
      buildGoalProgressInterpretation({
        goal,
        days,
        summary,
        isPremium,
      }),
    [days, goal, isPremium, summary]
  );

  useEffect(() => {
    let active = true;
    loadGoalTimelineSummary({ goal, days, summary })
      .then((nextTimeline) => {
        if (active) setTimeline(nextTimeline);
      })
      .catch(() => {
        if (active) setTimeline(null);
      });

    return () => {
      active = false;
    };
  }, [days, goal, summary]);

  const loadReview = useCallback(async () => {
    setLoading(true);
    try {
      const [user, nextGoal, nextDisplayMode, premiumActive] = await Promise.all([
        tokenStorage.getUser(),
        loadGoalSpineKey(),
        loadGoalDisplayMode().catch(() => "ranges" as GoalDisplayMode),
        getIsPremiumUser().catch(() => false),
      ]);
      const cache = await getStoredDashboardCache(user);

      setGoal(nextGoal);
      setGoalDisplayMode(nextDisplayMode);
      setIsPremium(premiumActive);
      setDays(extractDashboardDays(cache?.data));
    } catch (error) {
      console.log("[GoalReview] Unable to load goal review:", error);
      setDays([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadReview();
    }, [loadReview])
  );

  const handleChangeGoal = async (nextGoal: GoalSpineKey) => {
    if (nextGoal === goal || savingGoal) return;

    const option = GOAL_SPINE_CHOICES.find((item) => item.key === nextGoal);
    setSavingGoal(nextGoal);

    try {
      const savedGoal = await saveGoalSpineKey(nextGoal);
      setGoal(savedGoal);
      Alert.alert("Goal updated", `${option?.label || "Your goal"} is now your dashboard goal.`);
    } catch (error) {
      console.log("[GoalReview] Unable to save goal:", error);
      Alert.alert("Could not update goal", "Please try again.");
    } finally {
      setSavingGoal(null);
    }
  };

  const handleNextAction = () => {
    router.push(getActionRoute(summary.nextAction.action) as any);
  };

  const handleRecommendationAction = (action: GoalSpineAction) => {
    router.push(getActionRoute(action) as any);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.screenColor }]} edges={["top"]}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} backgroundColor={colors.primary} />
      <AppHeader title="Goal Review" showStepIndicator={false} showBackButton />

      {loading ? (
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingTitle}>Reviewing your goal</Text>
          <Text style={styles.loadingText}>FitFaat is checking this week's logs before giving feedback.</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.statusCard}>
            <View style={styles.statusHeader}>
              <View style={[styles.statusIcon, { backgroundColor: `${summary.review.color}18` }]}>
                <Ionicons name={summary.review.icon as IconName} size={Math.min(hp(3), wp(6.7))} color={summary.review.color} />
              </View>
              <View style={styles.statusCopy}>
                <Text style={styles.eyebrow}>Current status</Text>
                <Text style={styles.statusTitle}>{summary.review.label}</Text>
                <Text style={styles.statusBody}>{summary.review.body}</Text>
              </View>
            </View>

            <View style={styles.reasonList}>
              {summary.review.reasons.map((reason) => (
                <View key={reason} style={styles.reasonRow}>
                  <View style={[styles.reasonDot, { backgroundColor: summary.review.color }]} />
                  <Text style={styles.reasonText}>{reason}</Text>
                </View>
              ))}
            </View>

            <View style={styles.nextActionBox}>
              <Text style={styles.nextActionEyebrow}>Next action</Text>
              <Text style={styles.nextActionTitle}>{summary.nextAction.title}</Text>
              <Text style={styles.nextActionBody}>{summary.nextAction.body}</Text>
              <Text style={styles.whyLine}>Why this matters: {summary.nextAction.why}</Text>
              <TouchableOpacity
                style={[styles.primaryButton, { backgroundColor: colors.primary }]}
                onPress={handleNextAction}
                activeOpacity={0.85}
              >
                <Text style={[styles.primaryButtonText, { color: colors.textOnPrimary }]}>
                  {summary.nextAction.actionLabel}
                </Text>
                <Ionicons name="chevron-forward" size={Math.min(hp(1.9), wp(4.3))} color={colors.textOnPrimary} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.progressCard}>
            <View style={styles.progressHeader}>
              <View style={[styles.progressIcon, { backgroundColor: `${summary.weeklyProgress.color}18` }]}>
                <Ionicons name={summary.weeklyProgress.icon as IconName} size={Math.min(hp(2.5), wp(5.6))} color={summary.weeklyProgress.color} />
              </View>
              <View style={styles.progressCopy}>
                <Text style={styles.eyebrow}>{summary.weeklyProgress.title}</Text>
                <Text style={styles.progressValue}>{summary.weeklyProgress.value}</Text>
                <Text style={styles.progressBody}>{summary.weeklyDirectionBody}</Text>
              </View>
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${summary.weeklyProgress.progress}%`, backgroundColor: summary.weeklyProgress.color }]} />
            </View>
          </View>

          {timeline ? (
            <View style={styles.timelineCard}>
              <View style={[styles.timelineIcon, { backgroundColor: `${summary.goal.color}18` }]}>
                <Ionicons name="calendar-clear-outline" size={Math.min(hp(2.5), wp(5.6))} color={summary.goal.color} />
              </View>
              <View style={styles.timelineCopy}>
                <Text style={styles.eyebrow}>Goal timeline</Text>
                <Text style={styles.timelineTitle}>{timeline.headline}</Text>
                <Text style={styles.timelineBody}>{timeline.expectedDirection}</Text>
                <Text style={styles.timelineProjection}>{timeline.projection}</Text>
              </View>
            </View>
          ) : null}

          <View style={styles.interpretationCard}>
            <Text style={styles.sectionTitle}>Progress interpretation</Text>
            <Text style={styles.interpretationAnswer}>{progressInterpretation.answer}</Text>
            <Text style={styles.interpretationMeta}>{progressInterpretation.confidenceLabel}</Text>
            <View style={styles.interpretationColumns}>
              <View style={styles.interpretationColumn}>
                <Text style={styles.interpretationColumnTitle}>Helping</Text>
                {progressInterpretation.helping.map((item) => (
                  <Text key={item} style={styles.interpretationBullet}>- {item}</Text>
                ))}
              </View>
              <View style={styles.interpretationColumn}>
                <Text style={styles.interpretationColumnTitle}>Blocking</Text>
                {progressInterpretation.blocking.map((item) => (
                  <Text key={item} style={styles.interpretationBullet}>- {item}</Text>
                ))}
              </View>
            </View>
          </View>

          <View style={styles.sectionBlock}>
            <Text style={styles.sectionTitle}>Recommended adjustments</Text>
            <Text style={styles.sectionBody}>
              {adjustmentPlan.summary} You stay in control of every change.
            </Text>
            <View style={styles.recommendationList}>
              {adjustmentPlan.adjustments.map((item) => (
                <View key={item.id} style={styles.recommendationCard}>
                  <View style={[styles.recommendationIcon, { backgroundColor: `${item.color}18` }]}>
                    <Ionicons name={item.icon as IconName} size={Math.min(hp(2.25), wp(5))} color={item.color} />
                  </View>
                  <View style={styles.recommendationCopy}>
                    <Text style={styles.recommendationTitle}>{item.title}</Text>
                    <Text style={styles.recommendationBody}>{item.body}</Text>
                    <Text style={[styles.recommendationAmount, { color: item.color }]}>{item.amountLabel}</Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.recommendationButton, { backgroundColor: `${item.color}14` }]}
                    onPress={() => handleRecommendationAction(item.action)}
                    activeOpacity={0.82}
                  >
                    <Text style={[styles.recommendationButtonText, { color: item.color }]}>
                      {item.actionLabel}
                    </Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.sectionBlock}>
            <Text style={styles.sectionTitle}>Milestones</Text>
            <View style={styles.milestoneList}>
              {summary.milestones.map((milestone) => (
                <View key={milestone.id} style={styles.milestoneCard}>
                  <View style={[styles.milestoneIcon, { backgroundColor: `${milestone.color}18` }]}>
                    <Ionicons name={milestone.icon as IconName} size={Math.min(hp(2.2), wp(4.9))} color={milestone.color} />
                  </View>
                  <View style={styles.milestoneCopy}>
                    <Text style={styles.milestoneTitle}>{milestone.title}</Text>
                    <Text style={styles.milestoneBody}>{milestone.body}</Text>
                    <View style={styles.milestoneTrack}>
                      <View style={[styles.milestoneFill, { width: `${milestone.progress}%`, backgroundColor: milestone.color }]} />
                    </View>
                  </View>
                  <Text style={styles.milestoneProgress}>{milestone.progressLabel}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.sectionBlock}>
            <Text style={styles.sectionTitle}>Change goal</Text>
            <Text style={styles.sectionBody}>
              Full control stays with you. Pick the goal FitFaat should organize the dashboard around.
            </Text>
            <View style={styles.goalChoiceList}>
              {GOAL_SPINE_CHOICES.map((option) => {
                const active = option.key === goal;
                const saving = option.key === savingGoal;

                return (
                  <TouchableOpacity
                    key={option.key}
                    style={[
                      styles.goalChoiceCard,
                      active && { borderColor: option.color, backgroundColor: `${option.color}10` },
                    ]}
                    onPress={() => handleChangeGoal(option.key)}
                    activeOpacity={0.86}
                  >
                    <View style={[styles.goalChoiceIcon, { backgroundColor: `${option.color}18` }]}>
                      <Ionicons name={option.icon as IconName} size={Math.min(hp(2.5), wp(5.6))} color={option.color} />
                    </View>
                    <View style={styles.goalChoiceCopy}>
                      <View style={styles.goalChoiceTitleRow}>
                        <Text style={styles.goalChoiceTitle}>{option.label}</Text>
                        {active ? (
                          <View style={[styles.activePill, { backgroundColor: option.color }]}>
                            <Text style={[styles.activePillText, { color: colors.textOnPrimary }]}>Active</Text>
                          </View>
                        ) : null}
                      </View>
                      <Text style={styles.goalChoiceBody}>{option.pillars.join(" | ")}</Text>
                      <Text style={styles.goalChoicePromise}>{option.promise}</Text>
                    </View>
                    {saving ? (
                      <ActivityIndicator size="small" color={option.color} />
                    ) : (
                      <Ionicons
                        name={active ? "checkmark-circle" : "chevron-forward"}
                        size={Math.min(hp(2.3), wp(5.2))}
                        color={active ? option.color : colors.textSecondary}
                      />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: wp(4),
    paddingVertical: hp(1.8),
    paddingBottom: hp(5),
    gap: hp(1.4),
  },
  loadingState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: wp(8),
    gap: hp(1),
  },
  loadingTitle: {
    color: colors.textPrimary,
    fontSize: Math.min(hp(2), wp(4.6)),
    fontWeight: "900",
    marginTop: hp(0.8),
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: Math.min(hp(1.35), wp(3.2)),
    lineHeight: hp(2),
    fontWeight: "700",
    textAlign: "center",
  },
  statusCard: {
    borderRadius: hp(1.6),
    borderWidth: Math.min(wp(0.28), hp(0.16)),
    borderColor: colors.cardBorder || colors.border,
    backgroundColor: colors.cardBackground,
    paddingHorizontal: wp(4),
    paddingVertical: hp(1.35),
    gap: hp(1.1),
  },
  statusHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: wp(3),
  },
  statusIcon: {
    width: Math.min(hp(5.4), wp(12)),
    height: Math.min(hp(5.4), wp(12)),
    borderRadius: Math.min(hp(2.7), wp(6)),
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  statusCopy: {
    flex: 1,
    minWidth: 0,
  },
  eyebrow: {
    color: colors.textSecondary,
    fontSize: Math.min(hp(1.08), wp(2.6)),
    fontWeight: "900",
    textTransform: "uppercase",
  },
  statusTitle: {
    color: colors.textPrimary,
    fontSize: Math.min(hp(2), wp(4.6)),
    fontWeight: "900",
    marginTop: hp(0.12),
  },
  statusBody: {
    color: colors.textSecondary,
    fontSize: Math.min(hp(1.25), wp(3)),
    lineHeight: hp(1.85),
    fontWeight: "700",
    marginTop: hp(0.35),
  },
  reasonList: {
    gap: hp(0.55),
  },
  reasonRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: wp(2),
  },
  reasonDot: {
    width: hp(0.7),
    height: hp(0.7),
    borderRadius: hp(0.35),
  },
  reasonText: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: Math.min(hp(1.15), wp(2.75)),
    fontWeight: "800",
  },
  nextActionBox: {
    borderRadius: hp(1.35),
    backgroundColor: `${colors.primary}0D`,
    paddingHorizontal: wp(3),
    paddingVertical: hp(1),
  },
  nextActionEyebrow: {
    color: colors.primary,
    fontSize: Math.min(hp(1), wp(2.4)),
    fontWeight: "900",
    textTransform: "uppercase",
  },
  nextActionTitle: {
    color: colors.textPrimary,
    fontSize: Math.min(hp(1.5), wp(3.55)),
    fontWeight: "900",
    marginTop: hp(0.2),
  },
  nextActionBody: {
    color: colors.textSecondary,
    fontSize: Math.min(hp(1.16), wp(2.75)),
    lineHeight: hp(1.7),
    fontWeight: "700",
    marginTop: hp(0.3),
  },
  whyLine: {
    color: colors.primary,
    fontSize: Math.min(hp(1.08), wp(2.55)),
    lineHeight: hp(1.55),
    fontWeight: "800",
    marginTop: hp(0.45),
  },
  primaryButton: {
    alignSelf: "flex-start",
    minHeight: hp(4),
    borderRadius: hp(1.25),
    paddingHorizontal: wp(3.2),
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: wp(1),
    marginTop: hp(0.8),
  },
  primaryButtonText: {
    fontSize: Math.min(hp(1.2), wp(2.9)),
    fontWeight: "900",
  },
  progressCard: {
    borderRadius: hp(1.6),
    borderWidth: Math.min(wp(0.28), hp(0.16)),
    borderColor: colors.cardBorder || colors.border,
    backgroundColor: colors.cardBackground,
    paddingHorizontal: wp(4),
    paddingVertical: hp(1.2),
    gap: hp(0.9),
  },
  progressHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: wp(2.5),
  },
  progressIcon: {
    width: Math.min(hp(4.7), wp(10.5)),
    height: Math.min(hp(4.7), wp(10.5)),
    borderRadius: Math.min(hp(2.35), wp(5.25)),
    alignItems: "center",
    justifyContent: "center",
  },
  progressCopy: {
    flex: 1,
    minWidth: 0,
  },
  progressValue: {
    color: colors.textPrimary,
    fontSize: Math.min(hp(1.65), wp(3.85)),
    fontWeight: "900",
    marginTop: hp(0.15),
  },
  progressBody: {
    color: colors.textSecondary,
    fontSize: Math.min(hp(1.12), wp(2.7)),
    lineHeight: hp(1.62),
    fontWeight: "700",
    marginTop: hp(0.25),
  },
  progressTrack: {
    height: hp(0.75),
    borderRadius: hp(0.38),
    backgroundColor: colors.cardBorder || colors.border,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: hp(0.38),
  },
  timelineCard: {
    borderRadius: hp(1.6),
    borderWidth: Math.min(wp(0.28), hp(0.16)),
    borderColor: colors.cardBorder || colors.border,
    backgroundColor: colors.cardBackground,
    paddingHorizontal: wp(4),
    paddingVertical: hp(1.15),
    flexDirection: "row",
    alignItems: "flex-start",
    gap: wp(2.5),
  },
  timelineIcon: {
    width: Math.min(hp(4.7), wp(10.5)),
    height: Math.min(hp(4.7), wp(10.5)),
    borderRadius: Math.min(hp(2.35), wp(5.25)),
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  timelineCopy: {
    flex: 1,
    minWidth: 0,
  },
  timelineTitle: {
    color: colors.textPrimary,
    fontSize: Math.min(hp(1.55), wp(3.6)),
    fontWeight: "900",
    marginTop: hp(0.15),
  },
  timelineBody: {
    color: colors.textSecondary,
    fontSize: Math.min(hp(1.08), wp(2.6)),
    lineHeight: hp(1.6),
    fontWeight: "700",
    marginTop: hp(0.28),
  },
  timelineProjection: {
    color: colors.primary,
    fontSize: Math.min(hp(1.05), wp(2.55)),
    lineHeight: hp(1.55),
    fontWeight: "900",
    marginTop: hp(0.32),
  },
  interpretationCard: {
    borderRadius: hp(1.6),
    borderWidth: Math.min(wp(0.28), hp(0.16)),
    borderColor: colors.cardBorder || colors.border,
    backgroundColor: colors.cardBackground,
    paddingHorizontal: wp(4),
    paddingVertical: hp(1.15),
    gap: hp(0.7),
  },
  interpretationAnswer: {
    color: colors.textPrimary,
    fontSize: Math.min(hp(1.38), wp(3.25)),
    lineHeight: hp(1.95),
    fontWeight: "900",
  },
  interpretationMeta: {
    color: colors.primary,
    fontSize: Math.min(hp(1.02), wp(2.45)),
    fontWeight: "900",
  },
  interpretationColumns: {
    flexDirection: "row",
    gap: wp(2),
  },
  interpretationColumn: {
    flex: 1,
    borderRadius: hp(1.15),
    backgroundColor: colors.screenColor,
    borderWidth: Math.min(wp(0.18), hp(0.1)),
    borderColor: colors.cardBorder || colors.border,
    paddingHorizontal: wp(2.4),
    paddingVertical: hp(0.75),
  },
  interpretationColumnTitle: {
    color: colors.textPrimary,
    fontSize: Math.min(hp(1.08), wp(2.6)),
    fontWeight: "900",
    marginBottom: hp(0.28),
  },
  interpretationBullet: {
    color: colors.textSecondary,
    fontSize: Math.min(hp(0.98), wp(2.35)),
    lineHeight: hp(1.42),
    fontWeight: "700",
  },
  sectionBlock: {
    gap: hp(0.8),
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: Math.min(hp(1.8), wp(4.15)),
    fontWeight: "900",
  },
  sectionBody: {
    color: colors.textSecondary,
    fontSize: Math.min(hp(1.2), wp(2.85)),
    lineHeight: hp(1.75),
    fontWeight: "700",
  },
  milestoneList: {
    gap: hp(0.8),
  },
  recommendationList: {
    gap: hp(0.8),
  },
  recommendationCard: {
    borderRadius: hp(1.35),
    borderWidth: Math.min(wp(0.22), hp(0.12)),
    borderColor: colors.cardBorder || colors.border,
    backgroundColor: colors.cardBackground,
    paddingHorizontal: wp(3),
    paddingVertical: hp(0.95),
    flexDirection: "row",
    alignItems: "center",
    gap: wp(2.2),
  },
  recommendationIcon: {
    width: Math.min(hp(4.3), wp(9.5)),
    height: Math.min(hp(4.3), wp(9.5)),
    borderRadius: Math.min(hp(2.15), wp(4.75)),
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  recommendationCopy: {
    flex: 1,
    minWidth: 0,
  },
  recommendationTitle: {
    color: colors.textPrimary,
    fontSize: Math.min(hp(1.28), wp(3.05)),
    fontWeight: "900",
  },
  recommendationBody: {
    color: colors.textSecondary,
    fontSize: Math.min(hp(1.02), wp(2.45)),
    lineHeight: hp(1.45),
    fontWeight: "700",
    marginTop: hp(0.18),
  },
  recommendationAmount: {
    fontSize: Math.min(hp(0.98), wp(2.35)),
    fontWeight: "900",
    marginTop: hp(0.25),
  },
  recommendationButton: {
    minHeight: hp(3.25),
    borderRadius: hp(1.2),
    paddingHorizontal: wp(2),
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  recommendationButtonText: {
    fontSize: Math.min(hp(1), wp(2.4)),
    fontWeight: "900",
  },
  milestoneCard: {
    borderRadius: hp(1.35),
    borderWidth: Math.min(wp(0.22), hp(0.12)),
    borderColor: colors.cardBorder || colors.border,
    backgroundColor: colors.cardBackground,
    paddingHorizontal: wp(3),
    paddingVertical: hp(0.95),
    flexDirection: "row",
    alignItems: "center",
    gap: wp(2.5),
  },
  milestoneIcon: {
    width: Math.min(hp(4.4), wp(9.8)),
    height: Math.min(hp(4.4), wp(9.8)),
    borderRadius: Math.min(hp(2.2), wp(4.9)),
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  milestoneCopy: {
    flex: 1,
    minWidth: 0,
  },
  milestoneTitle: {
    color: colors.textPrimary,
    fontSize: Math.min(hp(1.28), wp(3.05)),
    fontWeight: "900",
  },
  milestoneBody: {
    color: colors.textSecondary,
    fontSize: Math.min(hp(1.02), wp(2.45)),
    lineHeight: hp(1.45),
    fontWeight: "700",
    marginTop: hp(0.18),
  },
  milestoneTrack: {
    height: hp(0.5),
    borderRadius: hp(0.25),
    backgroundColor: colors.cardBorder || colors.border,
    overflow: "hidden",
    marginTop: hp(0.55),
  },
  milestoneFill: {
    height: "100%",
    borderRadius: hp(0.25),
  },
  milestoneProgress: {
    color: colors.textPrimary,
    fontSize: Math.min(hp(1.16), wp(2.75)),
    fontWeight: "900",
  },
  goalChoiceList: {
    gap: hp(0.85),
  },
  goalChoiceCard: {
    borderRadius: hp(1.4),
    borderWidth: Math.min(wp(0.24), hp(0.14)),
    borderColor: colors.cardBorder || colors.border,
    backgroundColor: colors.cardBackground,
    paddingHorizontal: wp(3),
    paddingVertical: hp(1),
    flexDirection: "row",
    alignItems: "center",
    gap: wp(2.5),
  },
  goalChoiceIcon: {
    width: Math.min(hp(4.8), wp(10.6)),
    height: Math.min(hp(4.8), wp(10.6)),
    borderRadius: Math.min(hp(2.4), wp(5.3)),
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  goalChoiceCopy: {
    flex: 1,
    minWidth: 0,
  },
  goalChoiceTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: wp(1.2),
  },
  goalChoiceTitle: {
    color: colors.textPrimary,
    fontSize: Math.min(hp(1.45), wp(3.45)),
    fontWeight: "900",
  },
  activePill: {
    minHeight: hp(2.1),
    borderRadius: hp(1.05),
    paddingHorizontal: wp(1.8),
    alignItems: "center",
    justifyContent: "center",
  },
  activePillText: {
    fontSize: Math.min(hp(0.9), wp(2.2)),
    fontWeight: "900",
    textTransform: "uppercase",
  },
  goalChoiceBody: {
    color: colors.textSecondary,
    fontSize: Math.min(hp(1.06), wp(2.55)),
    fontWeight: "900",
    marginTop: hp(0.25),
  },
  goalChoicePromise: {
    color: colors.textSecondary,
    fontSize: Math.min(hp(1.04), wp(2.5)),
    lineHeight: hp(1.5),
    fontWeight: "700",
    marginTop: hp(0.2),
  },
});
