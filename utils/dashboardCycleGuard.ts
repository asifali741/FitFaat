export type DashboardCycleDayLike = {
  date?: string | Date | null;
  duration?: number | string | null;
  timeLeftSeconds?: number | string | null;
  secondsRemaining?: number | string | null;
  status?: string | null;
};

export type DashboardCycleGuardReason =
  | "weekly-id-mismatch"
  | "missing-weekly-id"
  | "active-day-expired"
  | "active-day-date-rollover"
  | "all-days-finished"
  | "no-active-day";

export type DashboardCycleGuardDecision =
  | {
      action: "use-cache";
      reason: "active-day-current";
      activeDayKey: string;
      activeDayDuration: number;
      allowStaleCacheFallback: false;
    }
  | {
      action: "check-cycle";
      reason: DashboardCycleGuardReason;
      activeDayKey?: string;
      allowStaleCacheFallback: boolean;
    };

type DashboardCycleGuardInput = {
  data?: Record<string, DashboardCycleDayLike> | null;
  cacheTimestamp?: Date | string | number | null;
  storedWeeklyTrackingId?: string | null;
  userWeeklyTrackingId?: string | null;
  now?: Date;
};

export type DashboardCycleGuardQaCase = {
  name: string;
  input: DashboardCycleGuardInput;
  expectedAction: DashboardCycleGuardDecision["action"];
  expectedReason: DashboardCycleGuardDecision["reason"];
  expectedAllowStaleFallback?: boolean;
};

export type DashboardCycleGuardQaResult = DashboardCycleGuardQaCase & {
  actualAction: DashboardCycleGuardDecision["action"];
  actualReason: DashboardCycleGuardDecision["reason"];
  passed: boolean;
};

const toDate = (value?: Date | string | number | null) => {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  return null;
};

export const getDashboardLocalDateKey = (
  value?: string | Date | null,
  fallbackDate = new Date()
) => {
  if (!value) {
    const year = fallbackDate.getFullYear();
    const month = String(fallbackDate.getMonth() + 1).padStart(2, "0");
    const day = String(fallbackDate.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  const isoMatch = String(value).match(/^(\d{4}-\d{2}-\d{2})/);
  if (isoMatch) return isoMatch[1];

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const getSecondsUntilEndOfLocalDay = (now = new Date()) => {
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);

  return Math.max(0, Math.floor((endOfDay.getTime() - now.getTime()) / 1000));
};

export const isDashboardLocalDateToday = (
  value?: string | Date | null,
  now = new Date()
) => {
  const dayKey = getDashboardLocalDateKey(value, now);
  return !dayKey || dayKey === getDashboardLocalDateKey(null, now);
};

export const getActiveDayDuration = (
  dailyLog: DashboardCycleDayLike,
  now = new Date()
) => {
  const duration = Number(
    dailyLog?.duration ?? dailyLog?.timeLeftSeconds ?? dailyLog?.secondsRemaining
  );

  if (Number.isFinite(duration) && duration > 0) {
    return Math.floor(duration);
  }

  return isDashboardLocalDateToday(dailyLog?.date, now)
    ? getSecondsUntilEndOfLocalDay(now)
    : 0;
};

const getCacheAdjustedActiveDuration = (
  activeDay: DashboardCycleDayLike,
  cacheTimestamp: Date | null,
  now: Date
) => {
  const cachedDuration = Number(
    activeDay?.duration ?? activeDay?.timeLeftSeconds ?? activeDay?.secondsRemaining
  );

  if (Number.isFinite(cachedDuration) && cachedDuration > 0 && cacheTimestamp) {
    const elapsedSeconds = Math.max(
      0,
      (now.getTime() - cacheTimestamp.getTime()) / 1000
    );
    return Math.floor(cachedDuration - elapsedSeconds);
  }

  return getActiveDayDuration(activeDay, now);
};

const getCheckCycleDecision = (
  reason: DashboardCycleGuardReason,
  activeDayKey?: string
): DashboardCycleGuardDecision => ({
  action: "check-cycle",
  reason,
  activeDayKey,
  allowStaleCacheFallback: true,
});

export const evaluateDashboardCycleGuard = ({
  data,
  cacheTimestamp,
  storedWeeklyTrackingId,
  userWeeklyTrackingId,
  now = new Date(),
}: DashboardCycleGuardInput): DashboardCycleGuardDecision => {
  if (!storedWeeklyTrackingId || !userWeeklyTrackingId) {
    return getCheckCycleDecision("missing-weekly-id");
  }

  if (String(storedWeeklyTrackingId) !== String(userWeeklyTrackingId)) {
    return getCheckCycleDecision("weekly-id-mismatch");
  }

  const entries = Object.entries(data || {});
  const activeEntry = entries.find(
    ([, day]) => String(day?.status || "").toLowerCase() === "active"
  );

  if (!activeEntry) {
    const hasDays = entries.length > 0;
    const allFinished =
      hasDays &&
      entries.every(
        ([, day]) => String(day?.status || "").toLowerCase() === "finished"
      );

    return getCheckCycleDecision(allFinished ? "all-days-finished" : "no-active-day");
  }

  const [activeDayKey, activeDay] = activeEntry;
  const activeDateKey = getDashboardLocalDateKey(activeDay.date, now);
  const todayKey = getDashboardLocalDateKey(null, now);

  if (activeDateKey && activeDateKey !== todayKey) {
    return getCheckCycleDecision("active-day-date-rollover", activeDayKey);
  }

  const adjustedDuration = getCacheAdjustedActiveDuration(
    activeDay,
    toDate(cacheTimestamp),
    now
  );

  if (adjustedDuration <= 0) {
    return getCheckCycleDecision("active-day-expired", activeDayKey);
  }

  return {
    action: "use-cache",
    reason: "active-day-current",
    activeDayKey,
    activeDayDuration: adjustedDuration,
    allowStaleCacheFallback: false,
  };
};

export const shouldUseStaleDashboardCacheFallback = (
  decision: DashboardCycleGuardDecision
) => decision.action === "check-cycle" && decision.allowStaleCacheFallback;

export const DASHBOARD_CYCLE_GUARD_QA_CASES: DashboardCycleGuardQaCase[] = [
  {
    name: "11:59 PM active day still active",
    input: {
      now: new Date("2026-05-26T23:59:00"),
      cacheTimestamp: new Date("2026-05-26T23:58:00"),
      storedWeeklyTrackingId: "week-1",
      userWeeklyTrackingId: "week-1",
      data: {
        day04: { status: "active", date: "2026-05-26", duration: 120 },
      },
    },
    expectedAction: "use-cache",
    expectedReason: "active-day-current",
  },
  {
    name: "12:00 AM stale active day triggers cycle check",
    input: {
      now: new Date("2026-05-27T00:00:00"),
      cacheTimestamp: new Date("2026-05-26T23:59:00"),
      storedWeeklyTrackingId: "week-1",
      userWeeklyTrackingId: "week-1",
      data: {
        day04: { status: "active", date: "2026-05-26", duration: 60 },
      },
    },
    expectedAction: "check-cycle",
    expectedReason: "active-day-date-rollover",
  },
  {
    name: "stale cached active day from yesterday triggers check-cycle",
    input: {
      now: new Date("2026-05-26T09:30:00"),
      cacheTimestamp: new Date("2026-05-25T19:00:00"),
      storedWeeklyTrackingId: "week-1",
      userWeeklyTrackingId: "week-1",
      data: {
        day03: { status: "active", date: "2026-05-25", duration: 7200 },
      },
    },
    expectedAction: "check-cycle",
    expectedReason: "active-day-date-rollover",
  },
  {
    name: "Day 7 finished asks backend for next week",
    input: {
      now: new Date("2026-05-27T00:01:00"),
      cacheTimestamp: new Date("2026-05-26T23:59:00"),
      storedWeeklyTrackingId: "week-1",
      userWeeklyTrackingId: "week-1",
      data: {
        day01: { status: "finished", date: "2026-05-20" },
        day02: { status: "finished", date: "2026-05-21" },
        day03: { status: "finished", date: "2026-05-22" },
        day04: { status: "finished", date: "2026-05-23" },
        day05: { status: "finished", date: "2026-05-24" },
        day06: { status: "finished", date: "2026-05-25" },
        day07: { status: "finished", date: "2026-05-26" },
      },
    },
    expectedAction: "check-cycle",
    expectedReason: "all-days-finished",
  },
  {
    name: "no active day triggers check-cycle",
    input: {
      now: new Date("2026-05-26T09:30:00"),
      cacheTimestamp: new Date("2026-05-26T09:00:00"),
      storedWeeklyTrackingId: "week-1",
      userWeeklyTrackingId: "week-1",
      data: {
        day01: { status: "locked", date: "2026-05-26" },
      },
    },
    expectedAction: "check-cycle",
    expectedReason: "no-active-day",
  },
  {
    name: "cached weekly ID mismatch triggers check-cycle",
    input: {
      now: new Date("2026-05-26T09:30:00"),
      cacheTimestamp: new Date("2026-05-26T09:00:00"),
      storedWeeklyTrackingId: "week-old",
      userWeeklyTrackingId: "week-new",
      data: {
        day04: { status: "active", date: "2026-05-26", duration: 3600 },
      },
    },
    expectedAction: "check-cycle",
    expectedReason: "weekly-id-mismatch",
  },
  {
    name: "offline stale cache can fall back after check-cycle fails",
    input: {
      now: new Date("2026-05-27T00:05:00"),
      cacheTimestamp: new Date("2026-05-26T23:50:00"),
      storedWeeklyTrackingId: "week-1",
      userWeeklyTrackingId: "week-1",
      data: {
        day04: { status: "active", date: "2026-05-26", duration: 600 },
      },
    },
    expectedAction: "check-cycle",
    expectedReason: "active-day-date-rollover",
    expectedAllowStaleFallback: true,
  },
];

export const runDashboardCycleGuardQaCases = () =>
  DASHBOARD_CYCLE_GUARD_QA_CASES.map((qaCase) => {
    const decision = evaluateDashboardCycleGuard(qaCase.input);
    const passed =
      decision.action === qaCase.expectedAction &&
      decision.reason === qaCase.expectedReason &&
      (qaCase.expectedAllowStaleFallback === undefined ||
        decision.allowStaleCacheFallback === qaCase.expectedAllowStaleFallback);

    return {
      ...qaCase,
      actualAction: decision.action,
      actualReason: decision.reason,
      passed,
    };
  });
