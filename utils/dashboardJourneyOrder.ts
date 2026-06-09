export type DashboardJourneySection = 'days' | 'streak' | 'steps';

export type DashboardTimingHours = {
  mealHours: number[];
  waterHours: number[];
};

type DashboardJourneyOrderInput = {
  currentTime: number | Date;
  timingHours: DashboardTimingHours;
  stepsSinceLastOpen: number;
};

type DashboardOpenedStepSnapshotInput = {
  storedValue: string | null;
  currentSteps: number;
  currentDateKey: string;
};

type DashboardOpenedStepSnapshotValue = {
  steps: number;
  dateKey: string;
  savedAt?: string;
};

export const DASHBOARD_STEP_REORDER_DELTA = 100;
export const DASHBOARD_ADVICE_WINDOW_MINUTES = 60;
export const DASHBOARD_DEFAULT_MEAL_HOURS = [8, 13, 19];
export const DASHBOARD_DEFAULT_WATER_HOURS = [10, 15, 20];

const DASHBOARD_DEFAULT_ORDER: DashboardJourneySection[] = ['days', 'streak', 'steps'];
const DASHBOARD_STEPS_FIRST_ORDER: DashboardJourneySection[] = ['steps', 'days', 'streak'];
const DASHBOARD_STREAK_FIRST_ORDER: DashboardJourneySection[] = ['streak', 'days', 'steps'];

const cleanStepCount = (value: unknown) => {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return 0;
  return Math.max(0, Math.round(numericValue));
};

const clampDashboardHour = (value: unknown) => {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return null;
  return Math.max(0, Math.min(23, Math.round(numericValue)));
};

export const normalizeDashboardHours = (values: unknown, fallback: number[]) => {
  const hours = Array.isArray(values)
    ? values
        .map(clampDashboardHour)
        .filter((value): value is number => value !== null)
    : [];

  return Array.from(new Set(hours.length ? hours : fallback)).sort((left, right) => left - right);
};

const getMinutesFromMidnight = (time: number | Date) => {
  const date = typeof time === 'number' ? new Date(time) : time;
  return date.getHours() * 60 + date.getMinutes();
};

const isWithinDashboardAdviceWindow = (time: number | Date, hours: number[]) => {
  const currentMinutes = getMinutesFromMidnight(time);
  return hours.some((hour) => Math.abs(currentMinutes - hour * 60) <= DASHBOARD_ADVICE_WINDOW_MINUTES);
};

const isMorningBeforeDashboardBreakfast = (time: number | Date, mealHours: number[]) => {
  const currentMinutes = getMinutesFromMidnight(time);
  const firstMealHour = normalizeDashboardHours(mealHours, DASHBOARD_DEFAULT_MEAL_HOURS)[0];
  const firstMealWindowStart = Math.max(0, firstMealHour * 60 - DASHBOARD_ADVICE_WINDOW_MINUTES);

  return currentMinutes >= 4 * 60 && currentMinutes < firstMealWindowStart;
};

export const getDashboardJourneyOrder = ({
  currentTime,
  timingHours,
  stepsSinceLastOpen,
}: DashboardJourneyOrderInput): DashboardJourneySection[] => {
  const mealHours = normalizeDashboardHours(timingHours.mealHours, DASHBOARD_DEFAULT_MEAL_HOURS);
  const waterHours = normalizeDashboardHours(timingHours.waterHours, DASHBOARD_DEFAULT_WATER_HOURS);

  if (
    isWithinDashboardAdviceWindow(currentTime, mealHours) ||
    isWithinDashboardAdviceWindow(currentTime, waterHours)
  ) {
    return DASHBOARD_DEFAULT_ORDER;
  }

  if (isMorningBeforeDashboardBreakfast(currentTime, mealHours)) {
    return DASHBOARD_STREAK_FIRST_ORDER;
  }

  if (stepsSinceLastOpen > DASHBOARD_STEP_REORDER_DELTA) {
    return DASHBOARD_STEPS_FIRST_ORDER;
  }

  return DASHBOARD_DEFAULT_ORDER;
};

const getStoredSnapshotSteps = (
  snapshot: DashboardOpenedStepSnapshotValue,
  currentDateKey: string,
  fallbackSteps: number
) => {
  if (snapshot.dateKey !== currentDateKey) {
    return fallbackSteps;
  }

  return cleanStepCount(snapshot.steps);
};

export const parseDashboardOpenedStepSnapshot = ({
  storedValue,
  currentSteps,
  currentDateKey,
}: DashboardOpenedStepSnapshotInput) => {
  const fallbackSteps = cleanStepCount(currentSteps);
  const trimmedValue = storedValue?.trim();

  if (!trimmedValue) {
    return fallbackSteps;
  }

  try {
    const parsedValue = JSON.parse(trimmedValue) as unknown;

    if (parsedValue && typeof parsedValue === 'object') {
      const snapshot = parsedValue as Partial<DashboardOpenedStepSnapshotValue>;
      return getStoredSnapshotSteps(
        {
          dateKey: String(snapshot.dateKey || ''),
          steps: cleanStepCount(snapshot.steps),
          savedAt: snapshot.savedAt ? String(snapshot.savedAt) : undefined,
        },
        currentDateKey,
        fallbackSteps
      );
    }

    if (typeof parsedValue === 'number' && Number.isFinite(parsedValue)) {
      const legacySteps = cleanStepCount(parsedValue);
      return legacySteps <= fallbackSteps ? legacySteps : fallbackSteps;
    }
  } catch {
    const legacySteps = Number(trimmedValue);
    if (Number.isFinite(legacySteps)) {
      const cleanedLegacySteps = cleanStepCount(legacySteps);
      return cleanedLegacySteps <= fallbackSteps ? cleanedLegacySteps : fallbackSteps;
    }
  }

  return fallbackSteps;
};

export const serializeDashboardOpenedStepSnapshot = ({
  steps,
  dateKey,
}: {
  steps: number;
  dateKey: string;
}) =>
  JSON.stringify({
    dateKey,
    steps: cleanStepCount(steps),
    savedAt: new Date().toISOString(),
  });
