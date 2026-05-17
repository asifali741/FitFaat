import Constants from "expo-constants";

/**
 * Centralized configuration helper that works reliably across all environments:
 * - Expo Go (dev)
 * - Development Build (dev client)
 * - Preview/Production APK (standalone)
 *
 * Priority: Constants.expoConfig.extra -> process.env -> hardcoded fallback
 */

// Hardcoded fallback values for when env vars are not available (e.g., EAS cloud build without .env)
const FALLBACKS: Record<string, string> = {
  EXPO_PUBLIC_BACKEND_API_URL: "",
  EXPO_PUBLIC_STRIPE_PK: "",
  CLARIFAI_API_KEY: "06c9f866dede42d0add51a34242ac601",
  OPENROUTER_API_KEY: "",
  GROQ_API_KEY: "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",
  ZEGO_APP_ID: "",
  ZEGO_APP_SIGN: "",
};

/**
 * Get a configuration value by key.
 * Checks Constants.expoConfig.extra first, then falls back to hardcoded defaults.
 */
export function getConfigValue(key: string): string {
  // Try expoConfig.extra first (works in Expo Go AND standalone builds)
  const extraValue = Constants.expoConfig?.extra?.[key];
  if (extraValue) return String(extraValue);

  // Try Constants.manifest (legacy, for older SDK compatibility)
  const manifestValue = (Constants as any).manifest?.extra?.[key];
  if (manifestValue) return String(manifestValue);

  // Hardcoded fallback
  return FALLBACKS[key] || "";
}

/**
 * Get the backend API URL, guaranteed to return a valid string.
 */
export function getBackendUrl(): string {
  return getConfigValue("EXPO_PUBLIC_BACKEND_API_URL");
}

/**
 * Get the backend base URL (without /api suffix), for socket connections etc.
 */
export function getBackendBaseUrl(): string {
  return getBackendUrl().replace(/\/api\/?$/, "");
}

/**
 * Get the Stripe publishable key, guaranteed to return a valid string.
 */
export function getStripePublishableKey(): string {
  return getConfigValue("EXPO_PUBLIC_STRIPE_PK");
}

/**
 * Get the EAS project ID.
 */
export function getEasProjectId(): string {
  return (
    Constants.expoConfig?.extra?.eas?.projectId ||
    "5e5cb9e1-429d-47eb-a867-9281d377f425"
  );
}
