import { authApi } from "@/utils/auth/authApi";

const INACTIVE_PREMIUM_STATUSES = new Set([
  "canceled",
  "cancelled",
  "expired",
  "incomplete_expired",
  "past_due",
  "unpaid",
]);

const ACTIVE_PREMIUM_STATUSES = new Set([
  "active",
  "trialing",
  "paid",
  "succeeded",
]);

const normalizePremiumStatus = (value: unknown) => String(value || "").trim().toLowerCase();

const hasExpired = (premiumStatus: any) => {
  const expiresAt =
    premiumStatus?.premiumSubscription?.expiresAt ||
    premiumStatus?.premiumSubscription?.currentPeriodEnd ||
    premiumStatus?.subscription?.expiresAt ||
    premiumStatus?.subscription?.currentPeriodEnd ||
    premiumStatus?.expiresAt ||
    premiumStatus?.premiumExpiresAt;

  if (!expiresAt) return false;

  const expiryTime = new Date(expiresAt).getTime();
  return Number.isFinite(expiryTime) && expiryTime <= Date.now();
};

export const isPremiumStatusActive = (premiumStatus: any) =>
  Boolean((() => {
    if (!premiumStatus || premiumStatus.success === false || premiumStatus.isPremium !== true) {
      return false;
    }

    if (hasExpired(premiumStatus)) {
      return false;
    }

    const status = normalizePremiumStatus(
      premiumStatus?.premiumSubscription?.status ||
        premiumStatus?.subscription?.status ||
        premiumStatus?.status ||
        premiumStatus?.paymentStatus
    );

    if (INACTIVE_PREMIUM_STATUSES.has(status)) return false;
    if (!status) return true;
    return ACTIVE_PREMIUM_STATUSES.has(status);
  })());

export const getIsPremiumUser = async () => {
  try {
    const premiumStatus = await authApi.getPremiumStatus();
    return isPremiumStatusActive(premiumStatus);
  } catch (error: any) {
    console.log("Premium access check failed:", error?.message || error);
    return false;
  }
};
