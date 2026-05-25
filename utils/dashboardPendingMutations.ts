import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  getDashboardUserIdentity,
  getStoredWeeklyTrackingId,
} from "@/utils/dashboardStorage";
import { tokenStorage } from "@/utils/auth/tokenStorage";

const DASHBOARD_PENDING_MUTATIONS_KEY = "fitfaat_dashboard_pending_mutations";
const MAX_PENDING_MUTATION_AGE_MS = 30 * 60 * 1000;

type DashboardMutationType = "meal" | "hydration";

export type DashboardPendingMutation = {
  id: string;
  type: DashboardMutationType;
  userId?: string | null;
  weeklyTrackingId?: string | null;
  dayLogId?: string | null;
  dayNo?: number | null;
  dateKey?: string | null;
  entryId?: string | null;
  occurredAt: string;
  confirmedAt: string;
  calories?: number;
  hydrationAmount?: number;
  achievedCaloriesAfter?: number;
  achievedHydrationAfter?: number;
  entry?: any;
};

type PendingMutationInput = Omit<
  DashboardPendingMutation,
  "id" | "userId" | "weeklyTrackingId" | "occurredAt" | "confirmedAt"
> & {
  id?: string;
  userId?: string | null;
  weeklyTrackingId?: string | null;
  occurredAt?: string;
  confirmedAt?: string;
};

type ApplyPendingDashboardMutationsOptions = {
  userId?: string | null;
  weeklyTrackingId?: string | null;
  source?: "server" | "local";
};

const toNumber = (value: unknown) => {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
};

const normalizeDateKey = (value?: string | Date | null) => {
  if (!value) return null;

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

const getEntryId = (entry: any) => {
  const id =
    entry?._id ||
    entry?.id ||
    entry?.mealId ||
    entry?.waterId ||
    entry?.entryId ||
    entry?.logId;

  return id ? String(id) : null;
};

const getEntryTime = (entry: any) => {
  const rawTime =
    entry?.createdAt ||
    entry?.updatedAt ||
    entry?.loggedAt ||
    entry?.timestamp ||
    entry?.time;
  const parsed = rawTime ? new Date(rawTime).getTime() : 0;
  return Number.isFinite(parsed) ? parsed : 0;
};

const readMutationStore = async (): Promise<DashboardPendingMutation[]> => {
  try {
    const rawStore = await AsyncStorage.getItem(DASHBOARD_PENDING_MUTATIONS_KEY);
    const parsed = rawStore ? JSON.parse(rawStore) : [];
    return Array.isArray(parsed) ? parsed.filter((item) => item?.id && item?.type) : [];
  } catch (error) {
    console.error("Error reading dashboard pending mutations:", error);
    return [];
  }
};

const writeMutationStore = async (mutations: DashboardPendingMutation[]) => {
  await AsyncStorage.setItem(DASHBOARD_PENDING_MUTATIONS_KEY, JSON.stringify(mutations.slice(-100)));
};

const getCurrentScope = async () => {
  const user = await tokenStorage.getUser();
  const userId = getDashboardUserIdentity(user);
  const weeklyTrackingId = await getStoredWeeklyTrackingId(user);

  return { userId, weeklyTrackingId };
};

const isSameScope = (
  mutation: DashboardPendingMutation,
  userId?: string | null,
  weeklyTrackingId?: string | null
) => {
  if (mutation.userId && userId && mutation.userId !== userId) return false;
  if (mutation.weeklyTrackingId && weeklyTrackingId && mutation.weeklyTrackingId !== weeklyTrackingId) {
    return false;
  }

  return true;
};

const isMutationExpired = (mutation: DashboardPendingMutation, now = Date.now()) => {
  const confirmedAt = new Date(mutation.confirmedAt || mutation.occurredAt).getTime();
  return !Number.isFinite(confirmedAt) || now - confirmedAt > MAX_PENDING_MUTATION_AGE_MS;
};

const mutationMatchesDay = (mutation: DashboardPendingMutation, day: any) => {
  if (mutation.dayLogId && day?._id && mutation.dayLogId === String(day._id)) return true;
  if (mutation.dateKey && normalizeDateKey(day?.date) === mutation.dateKey) return true;
  if (mutation.dayNo && Number(day?.dayNo) === Number(mutation.dayNo)) return true;
  return false;
};

const getDayEntriesForMutation = (day: any, mutation: DashboardPendingMutation) =>
  mutation.type === "meal"
    ? Array.isArray(day?.meals)
      ? day.meals
      : []
    : Array.isArray(day?.waterIntake)
      ? day.waterIntake
      : [];

const isMutationObservedInDay = (day: any, mutation: DashboardPendingMutation) => {
  const entries = getDayEntriesForMutation(day, mutation);
  const mutationEntryId = mutation.entryId || getEntryId(mutation.entry);
  const mutationTime = new Date(mutation.confirmedAt || mutation.occurredAt).getTime();

  if (mutationEntryId && entries.some((entry: any) => getEntryId(entry) === mutationEntryId)) {
    return true;
  }

  if (
    Number.isFinite(mutationTime) &&
    entries.some((entry: any) => {
      const entryTime = getEntryTime(entry);
      return entryTime > 0 && Math.abs(entryTime - mutationTime) < 5 * 60 * 1000;
    })
  ) {
    return true;
  }

  return false;
};

const applyMutationToDay = (day: any, mutation: DashboardPendingMutation) => {
  if (mutation.type === "meal") {
    const calories = Math.max(0, Math.round(toNumber(mutation.calories)));
    const meals = Array.isArray(day?.meals) ? day.meals : [];
    const entry = mutation.entry || {
      _id: mutation.entryId,
      calories,
      createdAt: mutation.confirmedAt,
    };
    const entryId = getEntryId(entry);
    const nextMeals =
      entryId && meals.some((meal: any) => getEntryId(meal) === entryId)
        ? meals
        : [...meals, entry];

    return {
      ...day,
      achievedCalories: toNumber(day?.achievedCalories) + calories,
      meals: nextMeals,
    };
  }

  const hydrationAmount = Math.max(0, toNumber(mutation.hydrationAmount));
  const previousHydration = toNumber(day?.achieviedHydration ?? day?.achievedHydration);
  const nextHydration = previousHydration + hydrationAmount;
  const waterIntake = Array.isArray(day?.waterIntake) ? day.waterIntake : [];
  const entry = mutation.entry || {
    _id: mutation.entryId,
    amount: hydrationAmount,
    createdAt: mutation.confirmedAt,
  };
  const entryId = getEntryId(entry);
  const nextWaterIntake =
    entryId && waterIntake.some((item: any) => getEntryId(item) === entryId)
      ? waterIntake
      : [...waterIntake, entry];

  return {
    ...day,
    achieviedHydration: nextHydration,
    achievedHydration: nextHydration,
    waterIntake: nextWaterIntake,
  };
};

export const recordDashboardPendingMutation = async (input: PendingMutationInput) => {
  const scope = await getCurrentScope();
  const now = new Date().toISOString();
  const mutation: DashboardPendingMutation = {
    ...input,
    id:
      input.id ||
      `${input.type}:${input.dayLogId || input.dateKey || input.dayNo || "day"}:${Date.now()}`,
    userId: input.userId ?? scope.userId,
    weeklyTrackingId: input.weeklyTrackingId ?? scope.weeklyTrackingId,
    entryId: input.entryId || getEntryId(input.entry),
    occurredAt: input.occurredAt || now,
    confirmedAt: input.confirmedAt || now,
  };
  const mutations = await readMutationStore();
  const nextMutations = [
    ...mutations.filter((item) => item.id !== mutation.id && !isMutationExpired(item)),
    mutation,
  ];

  await writeMutationStore(nextMutations);
};

export const applyPendingDashboardMutations = async <T extends Record<string, any>>(
  data: T,
  options: ApplyPendingDashboardMutationsOptions = {}
): Promise<T> => {
  const currentScope =
    !options.userId || !options.weeklyTrackingId ? await getCurrentScope() : null;
  const scope = {
    userId: options.userId ?? currentScope?.userId,
    weeklyTrackingId: options.weeklyTrackingId ?? currentScope?.weeklyTrackingId,
  };
  const source = options.source || "server";
  const mutations = await readMutationStore();
  if (!mutations.length) return data;

  let nextData: Record<string, any> = { ...data };
  const now = Date.now();
  const remainingMutations: DashboardPendingMutation[] = [];

  mutations.forEach((mutation) => {
    if (isMutationExpired(mutation, now)) return;

    if (!isSameScope(mutation, scope.userId, scope.weeklyTrackingId)) {
      remainingMutations.push(mutation);
      return;
    }

    const dayEntry = Object.entries(nextData).find(([, day]) => mutationMatchesDay(mutation, day));
    if (!dayEntry) {
      remainingMutations.push(mutation);
      return;
    }

    const [dayKey, day] = dayEntry;
    if (isMutationObservedInDay(day, mutation)) {
      if (source === "local") {
        remainingMutations.push(mutation);
      }
      return;
    }

    nextData = {
      ...nextData,
      [dayKey]: applyMutationToDay(day, mutation),
    };
    remainingMutations.push(mutation);
  });

  if (remainingMutations.length !== mutations.length) {
    await writeMutationStore(remainingMutations);
  }

  return nextData as T;
};
