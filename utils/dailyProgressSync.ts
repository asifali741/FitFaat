export type DailyProgressSyncDay = {
  _id?: string;
  id?: string;
  dayNo?: number;
  dayNumber?: number;
  date?: string;
  dateKey?: string;
  updatedAt?: string;
  savedAt?: string;
  createdAt?: string;
  achievedCalories?: number;
  calorieIntake?: number;
  caloriesIntake?: number;
  achieviedHydration?: number;
  achievedHydration?: number;
  hydrationIntake?: number;
  meals?: any[];
  waterIntake?: any[];
  walkingSteps?: number;
  steps?: number;
  stepCount?: number;
  walkingCaloriesBurned?: number;
  stepCaloriesBurned?: number;
  exerciseCaloriesBurned?: number;
  workoutCalories?: number;
  exerciseDurationSeconds?: number;
  remarks?: any;
  notes?: any;
  targetCalories?: number;
  targetHydration?: number;
  status?: string;
  [key: string]: any;
};

export type DailyProgressMergeOptions = {
  preferIncomingWhenUnclear?: boolean;
};

const ADDITIVE_NUMBER_FIELDS = [
  "achievedCalories",
  "calorieIntake",
  "caloriesIntake",
  "achieviedHydration",
  "achievedHydration",
  "hydrationIntake",
  "walkingSteps",
  "steps",
  "stepCount",
  "walkingCaloriesBurned",
  "stepCaloriesBurned",
  "exerciseCaloriesBurned",
  "workoutCalories",
  "exerciseDurationSeconds",
] as const;

const TARGET_NUMBER_FIELDS = [
  "targetCalories",
  "targetHydration",
  "targetCaloriesMin",
  "targetCaloriesMax",
  "targetHydrationMin",
  "targetHydrationMax",
  "calibratedTargetCalories",
  "baseTargetCalories",
  "baseTargetHydration",
] as const;

const toNumber = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const roundCalories = (value: unknown) => Math.max(0, Math.round(toNumber(value)));

const roundHydration = (value: unknown) => {
  const parsed = toNumber(value);
  return parsed > 0 ? Math.round(parsed * 100) / 100 : 0;
};

const toTime = (value: unknown) => {
  if (!value) return 0;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? 0 : value.getTime();
  if (typeof value === "number" && Number.isFinite(value)) return value;

  const parsed = new Date(String(value)).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
};

const toIso = (time: number) => (time > 0 ? new Date(time).toISOString() : "");

export const getDailyProgressDateKey = (day?: Partial<DailyProgressSyncDay> | null) => {
  const rawValue = day?.dateKey || day?.date || day?.loggedAt || day?.createdAt || day?.updatedAt;
  if (!rawValue) return "";

  if (rawValue instanceof Date) {
    if (Number.isNaN(rawValue.getTime())) return "";
    return formatLocalDateKey(rawValue);
  }

  const rawString = String(rawValue);
  const isoMatch = rawString.match(/^(\d{4}-\d{2}-\d{2})/);
  if (isoMatch) return isoMatch[1];

  const parsed = new Date(rawString);
  return Number.isNaN(parsed.getTime()) ? "" : formatLocalDateKey(parsed);
};

const formatLocalDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const normalizeDayNo = (value: unknown) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return undefined;
  const rounded = Math.round(parsed);
  return rounded > 0 ? rounded : undefined;
};

const getEntryId = (entry: any) => {
  const id = entry?._id || entry?.id || entry?.mealId || entry?.waterId || entry?.entryId || entry?.logId;
  return id ? String(id) : "";
};

const getEntryTime = (entry: any) =>
  toTime(entry?.updatedAt || entry?.createdAt || entry?.loggedAt || entry?.timestamp || entry?.time || entry?.date);

const getLatestEntryTime = (entries: unknown) =>
  Array.isArray(entries) ? Math.max(...entries.map(getEntryTime), 0) : 0;

const getLatestKnownTime = (day?: Partial<DailyProgressSyncDay> | null) =>
  Math.max(
    toTime(day?.updatedAt),
    toTime(day?.savedAt),
    toTime(day?.createdAt),
    getLatestEntryTime(day?.meals),
    getLatestEntryTime(day?.waterIntake),
    getLatestEntryTime(day?.exerciseEntries),
    getLatestEntryTime(day?.notes)
  );

export const getDailyProgressUpdatedAt = (day?: Partial<DailyProgressSyncDay> | null) =>
  toIso(getLatestKnownTime(day));

const sumMealCalories = (meals: unknown) =>
  Array.isArray(meals)
    ? meals.reduce(
        (sum, meal: any) =>
          sum + roundCalories(meal?.calories ?? meal?.kcal ?? meal?.calorie ?? meal?.totalCalories),
        0
      )
    : 0;

const sumWaterIntake = (waterIntake: unknown) =>
  Array.isArray(waterIntake)
    ? roundHydration(
        waterIntake.reduce(
          (sum, entry: any) =>
            sum + toNumber(entry?.amount ?? entry?.liters ?? entry?.litres ?? entry?.value ?? entry?.hydrationAmount),
          0
        )
      )
    : 0;

const getCalorieValue = (day: Partial<DailyProgressSyncDay>) =>
  roundCalories(day.achievedCalories ?? day.calorieIntake ?? day.caloriesIntake) ||
  sumMealCalories(day.meals);

const getHydrationValue = (day: Partial<DailyProgressSyncDay>) =>
  roundHydration(day.achieviedHydration ?? day.achievedHydration ?? day.hydrationIntake) ||
  sumWaterIntake(day.waterIntake);

export const normalizeDailyProgressDay = <T extends Partial<DailyProgressSyncDay>>(
  day: T
): DailyProgressSyncDay & T => {
  const dateKey = getDailyProgressDateKey(day);
  const updatedAt = getDailyProgressUpdatedAt(day);
  const achievedCalories = getCalorieValue(day);
  const achievedHydration = getHydrationValue(day);
  const dayNo = normalizeDayNo(day.dayNo ?? day.dayNumber);

  return {
    ...day,
    ...(dateKey ? { dateKey, date: day.date || dateKey } : {}),
    ...(dayNo ? { dayNo } : {}),
    ...(updatedAt ? { updatedAt } : {}),
    achievedCalories,
    calorieIntake: roundCalories(day.calorieIntake) || achievedCalories,
    caloriesIntake: roundCalories(day.caloriesIntake) || achievedCalories,
    achieviedHydration: achievedHydration,
    achievedHydration,
    hydrationIntake: roundHydration(day.hydrationIntake) || achievedHydration,
    meals: Array.isArray(day.meals) ? day.meals : [],
    waterIntake: Array.isArray(day.waterIntake) ? day.waterIntake : [],
  } as DailyProgressSyncDay & T;
};

const getDailyProgressId = (day?: Partial<DailyProgressSyncDay> | null) => {
  const id = day?._id || day?.id || day?.dailyLogId || day?.dayLogId;
  return id ? String(id) : "";
};

const sameDailyProgressDay = (
  left?: Partial<DailyProgressSyncDay> | null,
  right?: Partial<DailyProgressSyncDay> | null
) => {
  if (!left || !right) return false;

  const leftId = getDailyProgressId(left);
  const rightId = getDailyProgressId(right);
  if (leftId && rightId && leftId === rightId) return true;

  const leftDateKey = getDailyProgressDateKey(left);
  const rightDateKey = getDailyProgressDateKey(right);
  if (leftDateKey && rightDateKey && leftDateKey === rightDateKey) return true;

  const leftDayNo = normalizeDayNo(left.dayNo ?? left.dayNumber);
  const rightDayNo = normalizeDayNo(right.dayNo ?? right.dayNumber);
  return Boolean(leftDayNo && rightDayNo && leftDayNo === rightDayNo);
};

const chooseIncoming = (
  current: DailyProgressSyncDay,
  incoming: DailyProgressSyncDay,
  options: DailyProgressMergeOptions
) => {
  const currentTime = getLatestKnownTime(current);
  const incomingTime = getLatestKnownTime(incoming);
  if (incomingTime > currentTime) return true;
  if (incomingTime < currentTime) return false;
  if (options.preferIncomingWhenUnclear) return true;

  const incomingScore =
    getCalorieValue(incoming) +
    getHydrationValue(incoming) * 100 +
    roundCalories(incoming.walkingSteps ?? incoming.steps ?? incoming.stepCount) +
    roundCalories(incoming.exerciseCaloriesBurned ?? incoming.workoutCalories);
  const currentScore =
    getCalorieValue(current) +
    getHydrationValue(current) * 100 +
    roundCalories(current.walkingSteps ?? current.steps ?? current.stepCount) +
    roundCalories(current.exerciseCaloriesBurned ?? current.workoutCalories);

  return incomingScore > currentScore;
};

const chooseNumber = (
  field: string,
  current: DailyProgressSyncDay,
  incoming: DailyProgressSyncDay,
  incomingWins: boolean,
  options: DailyProgressMergeOptions
) => {
  const currentValue = field.includes("Hydration")
    ? roundHydration(current[field])
    : roundCalories(current[field]);
  const incomingValue = field.includes("Hydration")
    ? roundHydration(incoming[field])
    : roundCalories(incoming[field]);
  const currentTime = getLatestKnownTime(current);
  const incomingTime = getLatestKnownTime(incoming);

  if (incomingTime !== currentTime || options.preferIncomingWhenUnclear) {
    return incomingWins ? incomingValue : currentValue;
  }

  return Math.max(currentValue, incomingValue);
};

const chooseTargetNumber = (
  field: string,
  current: DailyProgressSyncDay,
  incoming: DailyProgressSyncDay,
  incomingWins: boolean
) => {
  const currentValue = field.includes("Hydration")
    ? roundHydration(current[field])
    : roundCalories(current[field]);
  const incomingValue = field.includes("Hydration")
    ? roundHydration(incoming[field])
    : roundCalories(incoming[field]);

  return incomingWins ? incomingValue || currentValue : currentValue || incomingValue;
};

const getEntryKey = (entry: any, index: number) => {
  const id = getEntryId(entry);
  if (id) return `id:${id}`;

  const time = getEntryTime(entry);
  const amount = entry?.calories ?? entry?.amount ?? entry?.hydrationAmount ?? entry?.value ?? "";
  const label = entry?.foodName || entry?.food_name || entry?.name || entry?.drink_name || "";
  return `sig:${time}:${amount}:${label}:${index}`;
};

const mergeEntryArrays = (
  currentEntries: unknown,
  incomingEntries: unknown,
  incomingWins: boolean,
  hasClearWinner: boolean
) => {
  const currentArray = Array.isArray(currentEntries) ? currentEntries : [];
  const incomingArray = Array.isArray(incomingEntries) ? incomingEntries : [];

  if (hasClearWinner) {
    return incomingWins ? incomingArray : currentArray;
  }

  const byKey = new Map<string, any>();
  [...currentArray, ...incomingArray].forEach((entry, index) => {
    const key = getEntryKey(entry, index);
    const existing = byKey.get(key);
    if (!existing || getEntryTime(entry) >= getEntryTime(existing)) {
      byKey.set(key, entry);
    }
  });

  return Array.from(byKey.values()).sort((left, right) => getEntryTime(left) - getEntryTime(right));
};

export const mergeDailyProgressDay = (
  currentDay: Partial<DailyProgressSyncDay> | null | undefined,
  incomingDay: Partial<DailyProgressSyncDay> | null | undefined,
  options: DailyProgressMergeOptions = {}
): DailyProgressSyncDay => {
  if (!currentDay) return normalizeDailyProgressDay(incomingDay || {});
  if (!incomingDay) return normalizeDailyProgressDay(currentDay);

  const current = normalizeDailyProgressDay(currentDay);
  const incoming = normalizeDailyProgressDay(incomingDay);
  const currentTime = getLatestKnownTime(current);
  const incomingTime = getLatestKnownTime(incoming);
  const incomingWins = chooseIncoming(current, incoming, options);
  const preferred = incomingWins ? incoming : current;
  const fallback = incomingWins ? current : incoming;
  const hasClearWinner = currentTime !== incomingTime || options.preferIncomingWhenUnclear === true;
  const merged: DailyProgressSyncDay = {
    ...fallback,
    ...preferred,
  };

  ADDITIVE_NUMBER_FIELDS.forEach((field) => {
    merged[field] = chooseNumber(field, current, incoming, incomingWins, options);
  });
  TARGET_NUMBER_FIELDS.forEach((field) => {
    merged[field] = chooseTargetNumber(field, current, incoming, incomingWins);
  });

  const hydration = chooseNumber("achieviedHydration", current, incoming, incomingWins, options);
  merged.achieviedHydration = hydration;
  merged.achievedHydration = hydration;
  merged.hydrationIntake = hydration;

  const calories = chooseNumber("achievedCalories", current, incoming, incomingWins, options);
  merged.achievedCalories = calories;
  merged.calorieIntake = calories;
  merged.caloriesIntake = calories;

  merged.meals = mergeEntryArrays(current.meals, incoming.meals, incomingWins, hasClearWinner);
  merged.waterIntake = mergeEntryArrays(current.waterIntake, incoming.waterIntake, incomingWins, hasClearWinner);
  merged.updatedAt = getDailyProgressUpdatedAt(merged) || preferred.updatedAt || fallback.updatedAt;
  merged.dateKey = getDailyProgressDateKey(merged);
  if (!merged.date && merged.dateKey) merged.date = merged.dateKey;

  return merged;
};

const getPreferredDayKey = (
  incomingKey: string,
  day: DailyProgressSyncDay,
  existing: Record<string, DailyProgressSyncDay>
) => {
  if (incomingKey && !existing[incomingKey]) return incomingKey;
  const dayNo = normalizeDayNo(day.dayNo ?? day.dayNumber);
  if (dayNo) {
    const dayKey = `day0${dayNo}`;
    if (!existing[dayKey]) return dayKey;
  }
  const dateKey = getDailyProgressDateKey(day);
  if (dateKey) {
    const dateScopedKey = `date:${dateKey}`;
    if (!existing[dateScopedKey]) return dateScopedKey;
  }
  const id = getDailyProgressId(day);
  if (id) {
    const idScopedKey = `log:${id}`;
    if (!existing[idScopedKey]) return idScopedKey;
  }
  return `day:${Object.keys(existing).length + 1}`;
};

export const mergeDailyProgressMap = <T extends Record<string, any>>(
  currentData: T | null | undefined,
  incomingData: Record<string, any> | null | undefined,
  options: DailyProgressMergeOptions = {}
): T => {
  const nextData: Record<string, DailyProgressSyncDay> = {};

  Object.entries(currentData || {}).forEach(([key, day]) => {
    nextData[key] = normalizeDailyProgressDay(day || {});
  });

  Object.entries(incomingData || {}).forEach(([incomingKey, incomingDay]) => {
    const normalizedIncoming = normalizeDailyProgressDay(incomingDay || {});
    const existingEntry = Object.entries(nextData).find(([, currentDay]) =>
      sameDailyProgressDay(currentDay, normalizedIncoming)
    );

    if (existingEntry) {
      const [existingKey, existingDay] = existingEntry;
      nextData[existingKey] = mergeDailyProgressDay(existingDay, normalizedIncoming, options);
      return;
    }

    const key = getPreferredDayKey(incomingKey, normalizedIncoming, nextData);
    nextData[key] = normalizedIncoming;
  });

  return nextData as T;
};

export const runDailyProgressSyncQaCases = () => {
  const staleLocal = {
    day01: {
      _id: "log-1",
      dayNo: 1,
      date: "2026-05-26T20:00:00.000Z",
      achievedCalories: 1100,
      achieviedHydration: 1,
      updatedAt: "2026-05-26T10:00:00.000Z",
    },
  };
  const freshServer = {
    day01: {
      _id: "log-1",
      dayNo: 1,
      date: "2026-05-26T20:00:00.000Z",
      achievedCalories: 1300,
      achieviedHydration: 2,
      updatedAt: "2026-05-26T11:00:00.000Z",
    },
  };
  const staleQr = {
    day01: {
      _id: "log-1",
      dayNo: 1,
      date: "2026-05-26",
      achievedCalories: 900,
      achieviedHydration: 0.75,
      updatedAt: "2026-05-26T09:00:00.000Z",
    },
  };

  const serverMerge = mergeDailyProgressMap(staleLocal, freshServer, {
    preferIncomingWhenUnclear: true,
  });
  const qrMerge = mergeDailyProgressMap(serverMerge, staleQr);
  const dateKey = getDailyProgressDateKey({ date: "2026-05-26T23:30:00.000Z" });

  const cases = [
    {
      name: "fresh server daily progress replaces stale local cache",
      passed:
        serverMerge.day01.achievedCalories === 1300 &&
        serverMerge.day01.achieviedHydration === 2,
    },
    {
      name: "older QR daily intake cannot overwrite newer daily cache",
      passed:
        qrMerge.day01.achievedCalories === 1300 &&
        qrMerge.day01.achieviedHydration === 2,
    },
    {
      name: "ISO date strings keep their YYYY-MM-DD key without timezone shifting",
      passed: dateKey === "2026-05-26",
    },
  ];

  return cases;
};
