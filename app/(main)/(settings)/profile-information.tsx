import AppHeader from "@/components/AppHeader";
import { useTheme } from "@/contexts/ThemeContext";
import { HEALTH_METRICS_STORAGE_KEY } from "@/utils/adaptiveGoals";
import { authApi } from "@/utils/auth/authApi";
import { tokenStorage } from "@/utils/auth/tokenStorage";
import { getBackendBaseUrl } from "@/utils/config";
import { getStoredDashboardCache } from "@/utils/dashboardStorage";
import { localSyncEvents } from "@/utils/localSyncEvents";
import {
  buildStableBackendProfileImageUrl,
  getBackendProfileImageUrl,
  getGmailProfileImageUrl,
  getProfileImageUserKey,
  readCachedProfileImage,
  resolveBackendImageUrl,
  writeCachedProfileImage,
} from "@/utils/profileImage";
import { profileImageEvents, type ProfileImageUpdateEvent } from "@/utils/profileImageEvents";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as NavigationBar from "expo-navigation-bar";
import { useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from "react-native-responsive-screen";
import { SafeAreaView } from "react-native-safe-area-context";

const API_URL = getBackendBaseUrl();

type ProfileProgressSnapshot = {
  height?: number;
  weight?: number;
  bmi?: number;
  goalCalories?: number;
  hydrationGoal?: number;
  todayCalories: number;
  todayTargetCalories: number;
  todayHydration: number;
  todayTargetHydration: number;
  todayMealsLogged: number;
  weeklyTotalCalories: number;
  weeklyTargetCalories: number;
  weeklyTotalHydration: number;
  weeklyTargetHydration: number;
  weeklyDaysTracked: number;
  weeklyCompletedDays: number;
  lastProgressAt?: string;
};

const toNumber = (value: unknown) => {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
};

const readOptionalNumber = (...values: unknown[]) => {
  for (const value of values) {
    if (value === null || value === undefined || value === "") continue;
    const numberValue = Number(value);
    if (Number.isFinite(numberValue) && numberValue > 0) return numberValue;
  }

  return undefined;
};

const parseJsonValue = (value: string | null) => {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

const normalizeHeightCm = (height?: number) => {
  if (!height) return undefined;
  if (height < 10) return height * 30.48;
  if (height < 100) return height * 2.54;
  return height;
};

const formatMetric = (value: number | undefined, unit: string) => {
  if (!value) return "N/A";
  const rounded = Math.round(value * 10) / 10;
  return `${Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(1)} ${unit}`;
};

const formatNumber = (value: number | undefined) => {
  if (!value) return "N/A";
  return String(Math.round(value));
};

const formatHydration = (value: number | undefined) => {
  if (!value) return "N/A";
  return `${(Math.round(value * 10) / 10).toFixed(1)} L`;
};

const formatPercent = (value: number, target: number) => {
  if (!target) return 0;
  return Math.min(100, Math.max(0, (value / target) * 100));
};

const capitalizeWords = (value?: unknown) => {
  const text = String(value || "").replace(/[_-]/g, " ").trim();
  if (!text) return "N/A";

  return text
    .replace(/\s+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const getFitnessGoalText = (goal: unknown) => {
  if (goal === 1 || goal === "1" || goal === "weightLoss") return "Weight Loss";
  if (goal === 2 || goal === "2" || goal === "muscleGain") return "Muscle Gain";
  if (goal === 3 || goal === "3" || goal === "weightGain") return "Weight Gain";
  return capitalizeWords(goal);
};

const getBMICategory = (bmi?: number) => {
  if (!bmi) return "";
  if (bmi < 18.5) return "Underweight";
  if (bmi < 25) return "Normal";
  if (bmi < 30) return "Overweight";
  return "Obese";
};

const formatDate = (value?: string) => {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";

  return date.toLocaleDateString([], {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatBirthDate = (birthDate: any) => {
  if (!birthDate) return "N/A";
  if (typeof birthDate === "string") return formatDate(birthDate);
  if (birthDate.day && birthDate.month && birthDate.year) {
    return `${birthDate.day}/${birthDate.month}/${birthDate.year}`;
  }

  return "N/A";
};

const getAge = (userInfo: any) => {
  const directAge = readOptionalNumber(userInfo?.age);
  if (directAge) return Math.round(directAge);

  const birthDate = userInfo?.birthDate;
  if (!birthDate?.year || !birthDate?.month || !birthDate?.day) return undefined;

  const today = new Date();
  let age = today.getFullYear() - Number(birthDate.year);
  const monthDiff = today.getMonth() + 1 - Number(birthDate.month);
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < Number(birthDate.day))) {
    age -= 1;
  }

  return age > 0 ? age : undefined;
};

const getDisplayName = (user: any) => (
  user?.userInfo?.name ||
  user?.name ||
  user?.fullName ||
  user?.username ||
  user?.email?.split("@")?.[0] ||
  "User"
);

const getInitials = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "U";
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase()).join("");
};

const getDateKey = (value?: string | Date | null) => {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return "";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const extractJsonResponseDays = (payload: any) => {
  const source = payload?.data || payload;
  if (!source || typeof source !== "object") return [];
  if (Array.isArray(source)) return source;

  return Object.values(source)
    .filter((entry: any) => entry && typeof entry === "object" && ("dayNo" in entry || "dayNumber" in entry))
    .sort((left: any, right: any) => toNumber(left.dayNo || left.dayNumber) - toNumber(right.dayNo || right.dayNumber));
};

const getTodayDay = (days: any[]) => {
  const todayKey = getDateKey();
  return (
    days.find((day) => day?.status === "active") ||
    days.find((day) => getDateKey(day?.date) === todayKey) ||
    days.find((day) => day?.status !== "locked") ||
    days[0] ||
    null
  );
};

const getHydrationValue = (day: any) =>
  toNumber(day?.achievedHydration ?? day?.achieviedHydration);

const getMetricSources = (user: any, healthMetrics: any) => [
  healthMetrics,
  user?.healthMetrics,
  user?.bmiSummary,
  user?.userInfo,
  user?.data?.userInfo,
  user,
].filter(Boolean);

const readMetric = (sources: any[], keys: string[]) =>
  readOptionalNumber(...sources.flatMap((source) => keys.map((key) => source?.[key])));

const buildProgressSnapshot = async (user: any): Promise<ProfileProgressSnapshot> => {
  const [healthMetricsRaw, cachedDashboard] = await Promise.all([
    AsyncStorage.getItem(HEALTH_METRICS_STORAGE_KEY),
    getStoredDashboardCache(),
  ]);
  const healthMetrics = parseJsonValue(healthMetricsRaw) || {};
  const jsonResponse = cachedDashboard?.data;
  const days = extractJsonResponseDays(jsonResponse);
  const todayDay = getTodayDay(days);
  const metricSources = getMetricSources(user, healthMetrics);
  const height = normalizeHeightCm(readMetric(metricSources, ["height", "heightCm", "heightInCm"]));
  const weight = readMetric(metricSources, ["weight", "weightKg", "currentWeight"]);
  const storedBmi = readMetric(metricSources, ["bmi", "bodyMassIndex"]);
  const bmi = storedBmi || (height && weight ? weight / ((height / 100) ** 2) : undefined);
  const todayTargetCalories = readOptionalNumber(
    todayDay?.calibratedTargetCalories,
    todayDay?.targetCalories,
    todayDay?.targetCaloriesMax,
    ...metricSources.flatMap((source) => [source?.goalCalories, source?.targetCalories])
  ) || 0;
  const todayTargetHydration = readOptionalNumber(
    todayDay?.targetHydration,
    todayDay?.targetHydrationMax,
    ...metricSources.flatMap((source) => [source?.hydrationGoal, source?.targetHydration])
  ) || 0;
  const trackedDays = days.filter((day) => {
    if (day?.status === "locked") return false;
    return (
      toNumber(day?.achievedCalories) > 0 ||
      getHydrationValue(day) > 0 ||
      (Array.isArray(day?.meals) && day.meals.length > 0) ||
      day?.status === "finished" ||
      day?.status === "completed"
    );
  });

  return {
    height,
    weight,
    bmi,
    goalCalories: todayTargetCalories || readMetric(metricSources, ["goalCalories", "targetCalories"]),
    hydrationGoal: todayTargetHydration || readMetric(metricSources, ["hydrationGoal", "targetHydration"]),
    todayCalories: toNumber(todayDay?.achievedCalories),
    todayTargetCalories,
    todayHydration: getHydrationValue(todayDay),
    todayTargetHydration,
    todayMealsLogged: Array.isArray(todayDay?.meals)
      ? todayDay.meals.length
      : toNumber(todayDay?.mealsLogged || todayDay?.mealCount),
    weeklyTotalCalories: trackedDays.reduce((sum, day) => sum + toNumber(day?.achievedCalories), 0),
    weeklyTargetCalories: trackedDays.reduce((sum, day) => sum + toNumber(day?.targetCalories), 0),
    weeklyTotalHydration: trackedDays.reduce((sum, day) => sum + getHydrationValue(day), 0),
    weeklyTargetHydration: trackedDays.reduce((sum, day) => sum + toNumber(day?.targetHydration), 0),
    weeklyDaysTracked: trackedDays.length,
    weeklyCompletedDays: trackedDays.filter((day) => ["finished", "completed"].includes(String(day?.status))).length,
    lastProgressAt: jsonResponse?.timestamp || todayDay?.updatedAt || todayDay?.date,
  };
};

export default function ProfileInformation() {
  const { colors, isDarkMode } = useTheme();
  const styles = useMemo(() => getStyles(colors, isDarkMode), [colors, isDarkMode]);
  const latestProfileImageEvent = profileImageEvents.getLatest();
  const initialProfileImageUrl =
    latestProfileImageEvent && !latestProfileImageEvent.removed
      ? latestProfileImageEvent.displayImageUrl ||
        latestProfileImageEvent.backendImageUrl ||
        latestProfileImageEvent.gmailImageUrl ||
        null
      : null;
  const [user, setUser] = useState<any>(null);
  const [progressSnapshot, setProgressSnapshot] = useState<ProfileProgressSnapshot | null>(null);
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(initialProfileImageUrl);
  const [gmailImageUrl, setGmailImageUrl] = useState<string | null>(latestProfileImageEvent?.gmailImageUrl || null);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const profileImageUserKeyRef = useRef<string | null>(null);

  const loadProfileImage = useCallback(async (nextUser?: any) => {
    const userSnapshot = nextUser || await tokenStorage.getUser();
    profileImageUserKeyRef.current = getProfileImageUserKey(userSnapshot);
    const cachedProfileImage = await readCachedProfileImage(userSnapshot);
    const cachedBackendImage = cachedProfileImage?.backendImageUrl || getBackendProfileImageUrl(API_URL, userSnapshot);
    const cachedGmailImage = cachedProfileImage?.gmailImageUrl || getGmailProfileImageUrl(userSnapshot);

    if (cachedBackendImage || cachedGmailImage) {
      setProfileImageUrl(cachedBackendImage || cachedGmailImage || null);
      setGmailImageUrl(cachedGmailImage || null);
    }

    const token = await tokenStorage.getToken();
    if (!token) return;

    try {
      const response = await fetch(`${API_URL}/api/user/profile-picture`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json().catch(() => ({}));
      const imagePath = data?.data?.imageUrl || data?.imageUrl || data?.profileImageUrl || null;

      if (response.ok && data?.success && imagePath) {
        const versionSeed =
          data?.data?.updatedAt ||
          data?.data?.profileImageUpdatedAt ||
          data?.data?.profilePictureUpdatedAt ||
          new Date().toISOString();
        const imageUrl = buildStableBackendProfileImageUrl(
          API_URL,
          resolveBackendImageUrl(API_URL, imagePath),
          cachedProfileImage,
          versionSeed
        );

        setProfileImageUrl(imageUrl);
        await writeCachedProfileImage(userSnapshot, {
          backendImageUrl: imageUrl,
          gmailImageUrl: cachedGmailImage || null,
        }, String(versionSeed));
      } else if (cachedGmailImage) {
        setProfileImageUrl(cachedGmailImage);
        setGmailImageUrl(cachedGmailImage);
      }
    } catch (error) {
      console.log("[ProfileInformation] Profile image refresh unavailable:", error);
    }
  }, []);

  const loadProfileData = useCallback(async (options: { silent?: boolean } = {}) => {
    if (options.silent) {
      setIsRefreshing(true);
    } else {
      setIsLoadingData(true);
    }

    try {
      const storedUser = await tokenStorage.getUser();
      setUser(storedUser);

      if (storedUser) {
        const localSnapshot = await buildProgressSnapshot(storedUser);
        setProgressSnapshot(localSnapshot);
        loadProfileImage(storedUser);
      }

      const refreshed = await authApi.refreshCurrentUserData().catch((error) => {
        console.log("[ProfileInformation] Backend refresh unavailable:", error?.message || error);
        return null;
      });
      const freshUser = refreshed?.user || await tokenStorage.getUser() || storedUser;

      if (freshUser) {
        setUser(freshUser);
        const nextSnapshot = await buildProgressSnapshot(freshUser);
        setProgressSnapshot(nextSnapshot);
        loadProfileImage(freshUser);
      }
    } finally {
      setIsLoadingData(false);
      setIsRefreshing(false);
    }
  }, [loadProfileImage]);

  useFocusEffect(
    useCallback(() => {
      loadProfileData();
    }, [loadProfileData])
  );

  useEffect(() => {
    if (Platform.OS === "android") {
      NavigationBar.setButtonStyleAsync("dark").catch(() => {});
      try {
        NavigationBar.setStyle("light");
      } catch {
        // Some Android builds expose only the async color/button APIs.
      }
    }
  }, []);

  useEffect(() => {
    const unsubscribeSync = localSyncEvents.subscribe((event) => {
      if (
        event.restoredKeys.some((key) => key === "JsonResponse" || key.startsWith("JsonResponse:")) ||
        event.restoredKeys.includes(HEALTH_METRICS_STORAGE_KEY)
      ) {
        loadProfileData({ silent: true });
      }
    });

    const unsubscribeProfileImage = profileImageEvents.subscribe((event?: ProfileImageUpdateEvent) => {
      if (!event) {
        loadProfileImage();
        return;
      }

      if (
        event.userKey &&
        profileImageUserKeyRef.current &&
        event.userKey !== profileImageUserKeyRef.current
      ) {
        return;
      }

      if (event.removed) {
        setProfileImageUrl(event.gmailImageUrl || null);
        setGmailImageUrl(event.gmailImageUrl || null);
        return;
      }

      setProfileImageUrl(event.displayImageUrl || event.backendImageUrl || event.gmailImageUrl || null);
      setGmailImageUrl(event.gmailImageUrl || null);
    });

    return () => {
      unsubscribeSync();
      unsubscribeProfileImage();
    };
  }, [loadProfileData, loadProfileImage]);

  const userInfo = user?.userInfo || {};
  const displayName = getDisplayName(user);
  const displayImageUrl = profileImageUrl || gmailImageUrl;
  const bmiText = progressSnapshot?.bmi
    ? `${progressSnapshot.bmi.toFixed(1)} - ${getBMICategory(progressSnapshot.bmi)}`
    : "N/A";
  const weeklyAverageHydration = progressSnapshot?.weeklyDaysTracked
    ? progressSnapshot.weeklyTotalHydration / progressSnapshot.weeklyDaysTracked
    : undefined;

  const InfoField = ({
    icon,
    label,
    value,
    highlight = false,
  }: {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    value: string;
    highlight?: boolean;
  }) => (
    <View style={styles.infoField}>
      <View style={styles.infoIcon}>
        <Ionicons name={icon} size={Math.min(hp(2.4), wp(5.3))} color={colors.primary} />
      </View>
      <View style={styles.infoText}>
        <Text style={styles.label}>{label}</Text>
        <Text style={[styles.value, highlight && styles.highlightValue]} numberOfLines={2}>
          {value}
        </Text>
      </View>
    </View>
  );

  const ProgressRow = ({
    icon,
    label,
    value,
    target,
    unit,
    color,
  }: {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    value: number;
    target: number;
    unit: string;
    color: string;
  }) => (
    <View style={styles.progressItem}>
      <View style={[styles.progressIcon, { backgroundColor: `${color}18` }]}>
        <Ionicons name={icon} size={Math.min(hp(2.7), wp(5.8))} color={color} />
      </View>
      <View style={styles.progressInfo}>
        <Text style={styles.progressLabel}>{label}</Text>
        <Text style={styles.progressValue}>
          {unit === "L" ? value.toFixed(1) : Math.round(value)} / {unit === "L" ? target.toFixed(1) : Math.round(target)} {unit}
        </Text>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressBarFill,
              { width: `${formatPercent(value, target)}%`, backgroundColor: color },
            ]}
          />
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar
        barStyle={isDarkMode ? "light-content" : "dark-content"}
        backgroundColor={colors.screenColor}
      />
      <AppHeader
        title="Profile Information"
        showStepIndicator={false}
        showMenuButton={false}
        showBackButton
      />

      <View style={styles.content}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.flex}
        >
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            <View style={styles.profileSection}>
              <View style={styles.profileImageContainer}>
                {displayImageUrl ? (
                  <Image
                    source={{ uri: displayImageUrl }}
                    style={styles.profileImage}
                    fadeDuration={0}
                    onError={() => setProfileImageUrl(gmailImageUrl || null)}
                  />
                ) : (
                  <View style={[styles.profileImage, styles.profileFallback]}>
                    <Text style={styles.profileInitials}>{getInitials(displayName)}</Text>
                  </View>
                )}
              </View>
              <Text style={styles.profileName} numberOfLines={1} adjustsFontSizeToFit>
                {displayName}
              </Text>
              <Text style={styles.profileEmail} numberOfLines={1}>
                {user?.email || "N/A"}
              </Text>
              {user?.username && (
                <Text style={styles.profileUsername} numberOfLines={1}>
                  @{user.username}
                </Text>
              )}
            </View>

            {isLoadingData && !user ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.loadingText}>Loading profile...</Text>
              </View>
            ) : (
              <>
                <View style={styles.quickRefreshRow}>
                  <Text style={styles.lastUpdatedText}>
                    Updated {formatDate(progressSnapshot?.lastProgressAt || user?.updatedAt || user?.createdAt)}
                  </Text>
                  <TouchableOpacity
                    style={styles.refreshButton}
                    onPress={() => loadProfileData({ silent: true })}
                    disabled={isRefreshing}
                    accessibilityRole="button"
                    accessibilityLabel="Refresh profile information"
                  >
                    {isRefreshing ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Ionicons name="refresh" size={Math.min(hp(2.1), wp(4.7))} color="#FFFFFF" />
                    )}
                  </TouchableOpacity>
                </View>

                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Account Information</Text>
                  <InfoField icon="person-outline" label="Full Name" value={displayName} highlight />
                  <InfoField icon="mail-outline" label="Email" value={user?.email || "N/A"} />
                  <InfoField icon="id-card-outline" label="User ID" value={user?.username ? `#${user.username}` : "N/A"} />
                  <InfoField icon="calendar-outline" label="Member Since" value={formatDate(user?.createdAt)} />
                  <InfoField
                    icon={user?.isOnboardingComplete ? "checkmark-circle-outline" : "alert-circle-outline"}
                    label="Onboarding Status"
                    value={user?.isOnboardingComplete ? "Complete" : "Incomplete"}
                    highlight={Boolean(user?.isOnboardingComplete)}
                  />
                </View>

                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Physical Information</Text>
                  <InfoField icon="male-female-outline" label="Gender" value={capitalizeWords(userInfo?.gender)} />
                  <InfoField icon="hourglass-outline" label="Age" value={getAge(userInfo) ? `${getAge(userInfo)} years` : "N/A"} />
                  <InfoField icon="gift-outline" label="Date of Birth" value={formatBirthDate(userInfo?.birthDate)} />
                  <InfoField icon="body-outline" label="Height" value={formatMetric(progressSnapshot?.height, "cm")} />
                  <InfoField icon="scale-outline" label="Weight" value={formatMetric(progressSnapshot?.weight, "kg")} highlight />
                  <InfoField icon="pulse-outline" label="BMI" value={bmiText} highlight={Boolean(progressSnapshot?.bmi)} />
                </View>

                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Fitness Information</Text>
                  <InfoField icon="walk-outline" label="Activity Level" value={capitalizeWords(userInfo?.activityLevel)} />
                  <InfoField icon="flag-outline" label="Fitness Goal" value={getFitnessGoalText(userInfo?.fitnessGoal)} />
                  <InfoField
                    icon="flame-outline"
                    label="Daily Calorie Goal"
                    value={`${formatNumber(progressSnapshot?.goalCalories)} kcal`}
                    highlight
                  />
                  <InfoField
                    icon="water-outline"
                    label="Daily Hydration Goal"
                    value={formatHydration(progressSnapshot?.hydrationGoal)}
                    highlight
                  />
                </View>

                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Today's Progress</Text>
                  <View style={styles.progressCard}>
                    <ProgressRow
                      icon="flame"
                      label="Calories"
                      value={progressSnapshot?.todayCalories || 0}
                      target={progressSnapshot?.todayTargetCalories || 0}
                      unit="kcal"
                      color="#F97316"
                    />
                    <ProgressRow
                      icon="water"
                      label="Hydration"
                      value={progressSnapshot?.todayHydration || 0}
                      target={progressSnapshot?.todayTargetHydration || 0}
                      unit="L"
                      color={colors.primary}
                    />
                    <InfoField
                      icon="restaurant-outline"
                      label="Meals Logged Today"
                      value={`${progressSnapshot?.todayMealsLogged || 0} meals`}
                    />
                  </View>
                </View>

                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Recent Weekly Stats</Text>
                  <View style={styles.weekCard}>
                    <View style={styles.weekStats}>
                      <View style={styles.weekStat}>
                        <Text style={styles.weekStatLabel}>Total Calories</Text>
                        <Text style={styles.weekStatValue}>
                          {Math.round(progressSnapshot?.weeklyTotalCalories || 0)} kcal
                        </Text>
                      </View>
                      <View style={styles.weekStat}>
                        <Text style={styles.weekStatLabel}>Avg Hydration</Text>
                        <Text style={styles.weekStatValue}>
                          {weeklyAverageHydration ? `${weeklyAverageHydration.toFixed(1)} L` : "0.0 L"}
                        </Text>
                      </View>
                      <View style={styles.weekStat}>
                        <Text style={styles.weekStatLabel}>Days Tracked</Text>
                        <Text style={styles.weekStatValue}>
                          {progressSnapshot?.weeklyDaysTracked || 0} days
                        </Text>
                      </View>
                    </View>
                    <View style={styles.weekDivider} />
                    <View style={styles.weekFooter}>
                      <Text style={styles.weekFooterText}>
                        Completed days: {progressSnapshot?.weeklyCompletedDays || 0}
                      </Text>
                      <Text style={styles.weekFooterText}>
                        Hydration target: {formatHydration(progressSnapshot?.weeklyTargetHydration)}
                      </Text>
                    </View>
                  </View>
                </View>
              </>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </SafeAreaView>
  );
}

const getStyles = (colors: any, isDarkMode: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.screenColor,
  },
  flex: {
    flex: 1,
  },
  content: {
    flex: 1,
    backgroundColor: colors.screenColor,
  },
  scrollContent: {
    paddingBottom: hp(5),
  },
  profileSection: {
    alignItems: "center",
    paddingVertical: hp(3),
    paddingBottom: hp(2),
  },
  profileImageContainer: {
    marginBottom: hp(2),
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: isDarkMode ? 0.1 : 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  profileImage: {
    width: hp(14),
    height: hp(14),
    borderRadius: hp(7),
    backgroundColor: colors.cardBackground,
    borderWidth: 4,
    borderColor: colors.cardBackground,
  },
  profileFallback: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primarySoft,
  },
  profileInitials: {
    fontSize: hp(4.2),
    fontWeight: "900",
    color: colors.primary,
  },
  profileName: {
    maxWidth: wp(86),
    fontSize: Math.min(hp(2.8), wp(6.2)),
    fontWeight: "900",
    color: colors.textPrimary,
    marginBottom: hp(0.5),
  },
  profileEmail: {
    maxWidth: wp(86),
    fontSize: Math.min(hp(1.7), wp(3.8)),
    color: colors.textSecondary,
    fontWeight: "600",
  },
  profileUsername: {
    fontSize: Math.min(hp(1.6), wp(3.6)),
    color: colors.primary,
    fontWeight: "800",
    marginTop: hp(0.8),
    backgroundColor: colors.primary + "15",
    paddingHorizontal: wp(4),
    paddingVertical: hp(0.6),
    borderRadius: hp(2),
  },
  quickRefreshRow: {
    marginHorizontal: wp(5),
    marginBottom: hp(0.8),
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  lastUpdatedText: {
    color: colors.textSecondary,
    fontSize: Math.min(hp(1.45), wp(3.4)),
    fontWeight: "700",
  },
  refreshButton: {
    width: hp(4.4),
    height: hp(4.4),
    borderRadius: hp(2.2),
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  section: {
    marginTop: hp(2),
    marginHorizontal: wp(5),
  },
  sectionTitle: {
    fontSize: Math.min(hp(2.2), wp(4.9)),
    fontWeight: "900",
    color: colors.textPrimary,
    marginBottom: hp(1.4),
    paddingLeft: wp(1),
  },
  infoField: {
    minHeight: hp(7.5),
    backgroundColor: colors.cardBackground,
    paddingHorizontal: wp(4),
    paddingVertical: hp(1.25),
    borderRadius: hp(1.6),
    marginBottom: hp(1.1),
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.cardBorder,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDarkMode ? 0.16 : 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  infoIcon: {
    width: hp(4.4),
    height: hp(4.4),
    borderRadius: hp(2.2),
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: wp(3),
  },
  infoText: {
    flex: 1,
  },
  label: {
    fontSize: Math.min(hp(1.35), wp(3.1)),
    color: colors.textSecondary,
    marginBottom: hp(0.45),
    fontWeight: "800",
    textTransform: "uppercase",
  },
  value: {
    fontSize: Math.min(hp(1.85), wp(4.1)),
    color: colors.textPrimary,
    fontWeight: "700",
    lineHeight: Math.min(hp(2.45), wp(5.3)),
  },
  highlightValue: {
    color: colors.primary,
    fontWeight: "900",
  },
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: hp(8),
  },
  loadingText: {
    marginTop: hp(2),
    fontSize: Math.min(hp(1.7), wp(3.8)),
    color: colors.textSecondary,
    fontWeight: "700",
  },
  progressCard: {
    backgroundColor: colors.cardBackground,
    padding: wp(4),
    borderRadius: hp(1.8),
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  progressItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: hp(1.6),
  },
  progressIcon: {
    width: hp(4.8),
    height: hp(4.8),
    borderRadius: hp(2.4),
    alignItems: "center",
    justifyContent: "center",
    marginRight: wp(3),
  },
  progressInfo: {
    flex: 1,
  },
  progressLabel: {
    fontSize: Math.min(hp(1.35), wp(3.1)),
    color: colors.textSecondary,
    marginBottom: hp(0.45),
    fontWeight: "800",
    textTransform: "uppercase",
  },
  progressValue: {
    fontSize: Math.min(hp(1.85), wp(4.1)),
    color: colors.textPrimary,
    fontWeight: "800",
    marginBottom: hp(0.9),
  },
  progressBar: {
    height: hp(1),
    backgroundColor: colors.gray + "35",
    borderRadius: hp(0.5),
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: hp(0.5),
  },
  weekCard: {
    backgroundColor: colors.cardBackground,
    padding: wp(4),
    borderRadius: hp(1.8),
    borderWidth: 1,
    borderColor: colors.cardBorder,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDarkMode ? 0.16 : 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  weekStats: {
    flexDirection: "row",
    gap: wp(2),
  },
  weekStat: {
    flex: 1,
    minHeight: hp(9),
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primarySoft,
    paddingHorizontal: wp(2),
    borderRadius: hp(1.4),
  },
  weekStatLabel: {
    fontSize: Math.min(hp(1.15), wp(2.8)),
    color: colors.textSecondary,
    marginBottom: hp(0.6),
    fontWeight: "800",
    textAlign: "center",
    textTransform: "uppercase",
  },
  weekStatValue: {
    fontSize: Math.min(hp(1.65), wp(3.7)),
    fontWeight: "900",
    color: colors.primary,
    textAlign: "center",
  },
  weekDivider: {
    height: 1,
    backgroundColor: colors.cardBorder,
    marginVertical: hp(1.4),
  },
  weekFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: wp(2),
  },
  weekFooterText: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: Math.min(hp(1.4), wp(3.2)),
    fontWeight: "700",
  },
});
