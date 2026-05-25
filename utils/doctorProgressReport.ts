import { Share } from "react-native";
import { loadWeightTrendLogs, type WeightTrendLogEntry } from "@/utils/adaptiveGoals";
import {
  getDashboardGoalProgress,
  getHydrationValue,
  getProgressValue,
} from "@/utils/dashboardProgress";
import {
  getStoredDashboardCache,
  getStoredWeeklyTrackingId,
} from "@/utils/dashboardStorage";
import { readWalkingHistory } from "@/utils/localWalkingProgress";
import { loadFitFaatNotes, type FitFaatNote } from "@/utils/localNotes";
import { tokenStorage } from "@/utils/auth/tokenStorage";
import { buildWeeklyInsights, type WeeklyInsight } from "@/utils/weeklyInsights";

export type DoctorReportRange = "weekly" | "monthly";

export type DoctorReportDay = {
  dateKey: string;
  label: string;
  dayNo?: number;
  calories: number;
  targetCalories: number;
  hydration: number;
  targetHydration: number;
  steps: number;
  goalProgress: number;
  missed: boolean;
};

export type DoctorProgressReport = {
  schemaVersion: 1;
  range: DoctorReportRange;
  generatedAt: string;
  title: string;
  days: DoctorReportDay[];
  notes: FitFaatNote[];
  weightLogs: WeightTrendLogEntry[];
  insights: WeeklyInsight[];
  summary: {
    trackedDays: number;
    missedDays: number;
    averageCalories: number;
    averageHydration: number;
    averageGoalProgress: number;
    totalSteps: number;
    latestWeightKg: number | null;
    weightChangeKg: number | null;
    notesCount: number;
    bestDayLabel: string;
    goalTrendLabel: string;
  };
};

type DashboardDay = {
  dayNo?: number;
  date?: string;
  status?: string;
  achievedCalories?: number;
  targetCalories?: number;
  achieviedHydration?: number;
  achievedHydration?: number;
  targetHydration?: number;
  walkingSteps?: number;
  steps?: number;
  stepCount?: number;
};

const getDateKey = (value?: string | Date | null) => {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getStartDateKey = (range: DoctorReportRange) => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - (range === "monthly" ? 29 : 6));
  return getDateKey(date);
};

const formatShortDate = (dateKey: string) => {
  const date = new Date(`${dateKey}T12:00:00`);
  if (Number.isNaN(date.getTime())) return dateKey;
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
};

const average = (values: number[]) => {
  const cleanValues = values.filter((value) => Number.isFinite(value));
  if (!cleanValues.length) return 0;
  return Math.round(cleanValues.reduce((sum, value) => sum + value, 0) / cleanValues.length);
};

const isUnlockedDay = (day: DashboardDay) =>
  day && String(day.status || "").toLowerCase() !== "locked";

const hasSignal = (day: DoctorReportDay) =>
  day.calories > 0 || day.hydration > 0 || day.steps > 0;

const sortDashboardDays = (days: DashboardDay[]) =>
  [...days].sort((left, right) => {
    const leftTime = new Date(left.date || "").getTime();
    const rightTime = new Date(right.date || "").getTime();
    if (Number.isFinite(leftTime) && Number.isFinite(rightTime)) return leftTime - rightTime;
    return Number(left.dayNo || 0) - Number(right.dayNo || 0);
  });

const getDashboardDays = async () => {
  const user = await tokenStorage.getUser();
  const weeklyTrackingId = await getStoredWeeklyTrackingId(user);
  const cache = await getStoredDashboardCache(user, weeklyTrackingId);
  return cache?.data ? (Object.values(cache.data) as DashboardDay[]) : [];
};

const getWeightLogDateKey = (log: WeightTrendLogEntry) =>
  String(log.dateKey || getDateKey(log.loggedAt));

const escapeHtml = (value: unknown) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

export const buildDoctorProgressReport = async (
  range: DoctorReportRange = "weekly"
): Promise<DoctorProgressReport> => {
  const startDateKey = getStartDateKey(range);
  const [dashboardDays, walkingHistory, notes, user] = await Promise.all([
    getDashboardDays(),
    readWalkingHistory(),
    loadFitFaatNotes(),
    tokenStorage.getUser(),
  ]);
  const weightLogs = await loadWeightTrendLogs({ userId: user?.id || user?._id });
  const walkingByDate = new Map(
    walkingHistory
      .filter((entry) => entry.dateKey >= startDateKey)
      .map((entry) => [entry.dateKey, entry.steps])
  );
  const reportDays = sortDashboardDays(dashboardDays)
    .filter(isUnlockedDay)
    .filter((day) => !day.date || getDateKey(day.date) >= startDateKey)
    .map((day): DoctorReportDay => {
      const dateKey = getDateKey(day.date);
      const calories = Math.round(getProgressValue(day.achievedCalories));
      const hydration = getHydrationValue(day);
      const steps = Math.round(
        getProgressValue(day.walkingSteps ?? day.steps ?? day.stepCount ?? walkingByDate.get(dateKey))
      );

      return {
        dateKey,
        label: day.dayNo ? `Day ${day.dayNo}` : formatShortDate(dateKey),
        dayNo: day.dayNo,
        calories,
        targetCalories: Math.round(getProgressValue(day.targetCalories)),
        hydration,
        targetHydration: Number(day.targetHydration || 0),
        steps,
        goalProgress: Math.round(getDashboardGoalProgress(day)),
        missed: calories <= 0 && hydration <= 0 && steps <= 0,
      };
    });
  const filteredNotes = notes.filter((note) => getDateKey(note.updatedAt || note.createdAt) >= startDateKey);
  const filteredWeightLogs = weightLogs.filter((log) => getWeightLogDateKey(log) >= startDateKey);
  const trackedDays = reportDays.filter(hasSignal);
  const missedDays = reportDays.filter((day) => day.missed);
  const latestWeight = filteredWeightLogs[filteredWeightLogs.length - 1]?.weightKg ?? null;
  const firstWeight = filteredWeightLogs[0]?.weightKg ?? null;
  const bestDay = [...reportDays].sort((left, right) => right.goalProgress - left.goalProgress)[0];
  const averageGoalProgress = average(reportDays.map((day) => day.goalProgress));

  return {
    schemaVersion: 1,
    range,
    generatedAt: new Date().toISOString(),
    title: `Doctor Progress Report - ${range === "monthly" ? "Monthly" : "Weekly"}`,
    days: reportDays,
    notes: filteredNotes,
    weightLogs: filteredWeightLogs,
    insights: buildWeeklyInsights(dashboardDays),
    summary: {
      trackedDays: trackedDays.length,
      missedDays: missedDays.length,
      averageCalories: average(trackedDays.map((day) => day.calories)),
      averageHydration: Number(
        (trackedDays.reduce((sum, day) => sum + day.hydration, 0) / Math.max(1, trackedDays.length)).toFixed(1)
      ),
      averageGoalProgress,
      totalSteps: reportDays.reduce((sum, day) => sum + day.steps, 0),
      latestWeightKg: latestWeight,
      weightChangeKg:
        latestWeight !== null && firstWeight !== null
          ? Math.round((latestWeight - firstWeight) * 10) / 10
          : null,
      notesCount: filteredNotes.length,
      bestDayLabel: bestDay?.label || "Not enough data",
      goalTrendLabel:
        averageGoalProgress >= 75
          ? "On track"
          : averageGoalProgress >= 45
            ? "Needs steadier logs"
            : "Needs attention",
    },
  };
};

export const buildDoctorReportText = (report: DoctorProgressReport) => {
  const summary = report.summary;
  return [
    "FitFaat Doctor Progress Report",
    report.range === "monthly" ? "Range: Monthly" : "Range: Weekly",
    `Generated: ${new Date(report.generatedAt).toLocaleString()}`,
    "",
    `Tracked days: ${summary.trackedDays}/${report.days.length}`,
    `Missed days: ${summary.missedDays}`,
    `Average calories: ${summary.averageCalories} kcal`,
    `Average hydration: ${summary.averageHydration} L`,
    `Goal trend: ${summary.goalTrendLabel} (${summary.averageGoalProgress}%)`,
    `Steps: ${summary.totalSteps.toLocaleString()}`,
    `Latest weight: ${summary.latestWeightKg ?? "--"} kg`,
    `Weight change: ${summary.weightChangeKg ?? "--"} kg`,
    `Notes: ${summary.notesCount}`,
    "",
    "Insights:",
    ...report.insights.map((insight) => `- ${insight.title}: ${insight.body}`),
    "",
    "Daily chart:",
    ...report.days.map(
      (day) =>
        `- ${day.label}: ${day.calories}/${day.targetCalories} kcal, ${day.hydration}/${day.targetHydration} L, ${day.steps} steps, ${day.goalProgress}% goal`
    ),
    "",
    "Shared from FitFaat.",
  ].join("\n");
};

export const buildDoctorReportHtml = (report: DoctorProgressReport) => {
  const maxCalories = Math.max(1, ...report.days.map((day) => day.targetCalories || day.calories));
  const maxHydration = Math.max(1, ...report.days.map((day) => day.targetHydration || day.hydration));
  const maxSteps = Math.max(1, ...report.days.map((day) => day.steps));
  const stat = (label: string, value: string) =>
    `<div class="stat"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`;

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #111827; padding: 28px; }
    h1 { font-size: 24px; margin: 0 0 4px; }
    h2 { font-size: 16px; margin: 22px 0 10px; }
    .muted { color: #64748B; font-size: 12px; }
    .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-top: 18px; }
    .stat { border: 1px solid #E2E8F0; border-radius: 8px; padding: 10px; }
    .stat span { display: block; color: #64748B; font-size: 11px; margin-bottom: 5px; }
    .stat strong { font-size: 17px; }
    .day { margin: 8px 0; display: grid; grid-template-columns: 62px 1fr 1fr 1fr 44px; gap: 8px; align-items: center; font-size: 11px; }
    .track { height: 8px; background: #E2E8F0; border-radius: 999px; overflow: hidden; }
    .fill { height: 100%; background: #10B981; }
    .water { background: #0EA5E9; }
    .steps { background: #14B8A6; }
    .insight { border-left: 3px solid #10B981; padding: 8px 10px; margin: 8px 0; background: #F8FAFC; }
    .notes { white-space: pre-wrap; font-size: 12px; }
  </style>
</head>
<body>
  <h1>FitFaat Doctor Progress Report</h1>
  <div class="muted">${escapeHtml(report.range === "monthly" ? "Monthly" : "Weekly")} - Generated ${escapeHtml(new Date(report.generatedAt).toLocaleString())}</div>
  <div class="grid">
    ${stat("Tracked days", `${report.summary.trackedDays}/${report.days.length}`)}
    ${stat("Missed days", String(report.summary.missedDays))}
    ${stat("Goal trend", `${report.summary.averageGoalProgress}%`)}
    ${stat("Calories avg", `${report.summary.averageCalories} kcal`)}
    ${stat("Hydration avg", `${report.summary.averageHydration} L`)}
    ${stat("Steps", report.summary.totalSteps.toLocaleString())}
    ${stat("Latest weight", `${report.summary.latestWeightKg ?? "--"} kg`)}
    ${stat("Weight change", `${report.summary.weightChangeKg ?? "--"} kg`)}
    ${stat("Notes", String(report.summary.notesCount))}
  </div>
  <h2>Daily Charts</h2>
  ${report.days
    .map(
      (day) => `<div class="day">
        <strong>${escapeHtml(day.label)}</strong>
        <div class="track"><div class="fill" style="width:${Math.min(100, (day.calories / maxCalories) * 100)}%"></div></div>
        <div class="track"><div class="fill water" style="width:${Math.min(100, (day.hydration / maxHydration) * 100)}%"></div></div>
        <div class="track"><div class="fill steps" style="width:${Math.min(100, (day.steps / maxSteps) * 100)}%"></div></div>
        <span>${day.goalProgress}%</span>
      </div>`
    )
    .join("")}
  <h2>Insights</h2>
  ${report.insights.map((insight) => `<div class="insight"><strong>${escapeHtml(insight.title)}</strong><br />${escapeHtml(insight.body)}</div>`).join("")}
  <h2>Notes</h2>
  <div class="notes">${report.notes.length ? report.notes.map((note) => `${escapeHtml(note.title)}: ${escapeHtml(note.body)}`).join("<br /><br />") : "No notes in this range."}</div>
</body>
</html>`;
};

export const shareDoctorProgressReport = async (report: DoctorProgressReport) => {
  const message = buildDoctorReportText(report);

  try {
    const [Print, Sharing] = await Promise.all([
      import("expo-print"),
      import("expo-sharing"),
    ]);
    const pdf = await Print.printToFileAsync({
      html: buildDoctorReportHtml(report),
      base64: false,
    });
    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(pdf.uri, {
        mimeType: "application/pdf",
        dialogTitle: "Share FitFaat Doctor Report",
        UTI: "com.adobe.pdf",
      });
      return;
    }
  } catch (error) {
    console.log("[DoctorProgressReport] PDF share unavailable, using text share:", error);
  }

  await Share.share({ message });
};
