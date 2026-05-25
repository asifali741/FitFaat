import AppHeader from "@/components/AppHeader";
import AnimatedPressable from "@/components/common/AnimatedPressable";
import ProgressRing from "@/components/common/ProgressRing";
import { ScreenSceneWrapper } from "@/components/common/ScreenTiltAnimation";
import SmartEmptyState from "@/components/common/SmartEmptyState";
import ProgressPhotoGallery from "@/components/profile/ProgressPhotoGallery";
import {
  calculateAchievementBadges,
  type AchievementBadge,
  type AchievementLocalStats,
} from "@/constants/achievementBadges";
import { authApi } from "@/utils/auth/authApi";
import {
  applyAdaptiveGoalsToJsonResponse,
  applyAdaptiveGoalsToDays,
  buildAdaptiveGoalMetrics,
  HEALTH_METRICS_STORAGE_KEY,
  loadAdaptiveGoalCarryForward,
  loadWeeklyWeightTrendCalibration,
  recordWeightTrendSnapshot,
  type AdaptiveGoalCarryForward,
} from "@/utils/adaptiveGoals";
import { tokenStorage } from "@/utils/auth/tokenStorage";
import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import { useRouter, useFocusEffect } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Image, Linking, Modal, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import {
    heightPercentageToDP as hp,
    widthPercentageToDP as wp,
} from "react-native-responsive-screen";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/contexts/ThemeContext";
import { getBackendBaseUrl } from '@/utils/config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { streakApi } from '@/utils/streakApi';
import { exerciseApi } from '@/utils/exerciseApi';
import { dailyLogsApi } from '@/utils/dailyLogsApi';
import {
  getStoredDashboardCache,
  getStoredWeeklyTrackingId,
  setStoredDashboardCache,
} from '@/utils/dashboardStorage';
import { cachedRequestJson } from '@/utils/apiHelper';
import { loadAchievementLocalStats } from '@/utils/achievementStorage';
import {
  clearCachedProfileImage,
  buildStableBackendProfileImageUrl,
  getBackendProfileImageUrl,
  getGmailProfileImageUrl,
  getProfileImageUserKey,
  readCachedProfileImage,
  resolveBackendImageUrl,
  writeCachedProfileImage,
} from '@/utils/profileImage';
import { profileImageEvents, type ProfileImageUpdateEvent } from '@/utils/profileImageEvents';
import { queueHealthDataCloudSync, syncLatestHealthData } from '@/utils/healthDataSync';

const ENV = Constants.expoConfig?.extra;

const getAPIURL = () => {
  const envUrl = ENV?.EXPO_PUBLIC_BACKEND_API_URL;
  if (envUrl) {
    return envUrl.replace(/\/api\/?$/, '');
  }
  return getBackendBaseUrl();
};

const API_URL = getAPIURL();
const PROFILE_READ_CONFIG = {
  timeoutMs: 6500,
  retries: 1,
  retryDelayMs: 500,
  cacheTtlMs: 5 * 60 * 1000,
  maxStaleMs: 24 * 60 * 60 * 1000,
  allowStaleOnError: true,
  maxWaitForFreshMs: 1800,
  refreshCacheInBackground: true,
};

const getStoredDisplayName = (storedUser: any) => (
  storedUser?.userInfo?.name ||
  storedUser?.username ||
  storedUser?.name ||
  storedUser?.fullName ||
  storedUser?.email?.split('@')?.[0] ||
  'User'
);

// --- Streak Logic from Dashboard ---
const computeProfileStreak = (data: any) => {
  if (!data) return 0;
  const allDaysSorted = Object.values(data)
    .filter((day): day is any => Boolean(day && typeof day === 'object' && (day as any).status))
    .sort((a: any, b: any) => (a.dayNo || 0) - (b.dayNo || 0));
  
  let currentStreak = 0;
  for (let i = allDaysSorted.length - 1; i >= 0; i--) {
    const day: any = allDaysSorted[i];
    if (day.status === 'finished' || day.status === 'completed') {
      currentStreak++;
    } else if (day.status === 'active') {
      const hasProgress = Number(day.achievedCalories) > 0 || Number(day.achieviedHydration) > 0 || Number(day.achievedHydration) > 0;
      if (hasProgress) currentStreak++;
      continue;
    } else {
      break;
    }
  }
  return currentStreak;
};
// -----------------------------------
type HealthRecordSummary = {
  height?: number;
  weight?: number;
  goalCalories?: number;
  hydrationGoal?: number;
  completedDays: number;
  activeDays: number;
  totalCalories: number;
  targetCalories: number;
  totalHydration: number;
  targetHydration: number;
  days: any[];
};

const getAppointmentId = (appointment: any) => (
  appointment?._id ||
  appointment?.id ||
  appointment?.appointmentId ||
  appointment?.bookingId ||
  `${appointment?.date || 'appointment'}-${appointment?.time || 'time'}-${appointment?.doctorId?._id || appointment?.doctorName || 'doctor'}`
);

const normalizeStatus = (status?: string) => (status || '').toLowerCase();

const getDoctorName = (appointment: any) => {
  const personalInfo = appointment?.doctorId?.personalInfo;
  const fullName = [personalInfo?.firstName, personalInfo?.lastName].filter(Boolean).join(' ');
  return fullName || appointment?.doctorName || appointment?.doctorId?.name || 'Doctor';
};

const getDoctorSpecialty = (appointment: any) => (
  appointment?.doctorId?.professionalInfo?.specialization ||
  appointment?.doctorSpecialty ||
  appointment?.specialty ||
  'Specialist'
);

const getAppointmentDate = (appointment: any) => {
  const rawDate = appointment?.date || appointment?.appointmentDateTime || appointment?.createdAt;
  const parsedDate = rawDate ? new Date(rawDate) : null;
  return parsedDate && !Number.isNaN(parsedDate.getTime()) ? parsedDate : null;
};

const getAppointmentDateLabel = (appointment: any) => {
  const parsedDate = getAppointmentDate(appointment);
  if (!parsedDate) return 'Date unavailable';

  return parsedDate.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const getStatusColor = (status: string | undefined, colors: any) => {
  switch (normalizeStatus(status)) {
    case 'completed':
      return colors.success;
    case 'confirmed':
      return colors.statusConfirmed;
    case 'pending':
      return colors.statusPending;
    case 'cancelled':
      return colors.statusCancelled;
    default:
      return colors.primary;
  }
};

const getStatusIcon = (status?: string) => {
  switch (normalizeStatus(status)) {
    case 'completed':
      return 'checkmark-done-circle';
    case 'confirmed':
      return 'checkmark-circle';
    case 'pending':
      return 'hourglass';
    case 'cancelled':
      return 'close-circle';
    default:
      return 'calendar';
  }
};

const readNumber = (...values: any[]) => {
  for (const value of values) {
    const numberValue = Number(value);
    if (Number.isFinite(numberValue)) return numberValue;
  }
  return 0;
};

const readOptionalNumber = (...values: any[]) => {
  for (const value of values) {
    if (value === null || value === undefined || value === '') continue;
    const numberValue = Number(value);
    if (Number.isFinite(numberValue) && numberValue > 0) return numberValue;
  }
  return undefined;
};

const getMetricSources = (userData: any): any[] => {
  const roots = Array.isArray(userData) ? userData : [userData];

  return roots.flatMap(source => [
    source?.userInfo,
    source?.data?.userInfo,
    source?.data?.user,
    source?.user?.userInfo,
    source?.user,
    source?.profile,
    source?.bmiSummary,
    source?.healthMetrics,
    source,
  ]).filter(Boolean);
};

const readMetric = (sources: any[], keys: string[]) => (
  readOptionalNumber(...sources.flatMap(source => keys.map(key => source?.[key])))
);

const normalizeHeightCm = (height?: number) => {
  if (!height) return undefined;
  return height < 10 ? height * 30.48 : height;
};

const formatMetric = (value: number | undefined, unit: string) => {
  if (!value) return '--';
  const rounded = Math.round(value * 10) / 10;
  return `${Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(1)} ${unit}`;
};

const formatGoalLabel = (value?: any) => {
  if (!value) return 'Build Consistency';
  return String(value)
    .replace(/[_-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const readTextMetric = (sources: any[], keys: string[]) => {
  for (const source of sources) {
    for (const key of keys) {
      const value = source?.[key];
      if (typeof value === 'string' && value.trim()) return value.trim();
    }
  }
  return undefined;
};

const getBmiCategory = (bmi?: number) => {
  if (!bmi) return 'Add height and weight';
  if (bmi < 18.5) return 'Below range';
  if (bmi < 25) return 'Healthy range';
  if (bmi < 30) return 'Above range';
  return 'High range';
};

const getHealthDays = (
  payload: any,
  userData: any,
  carryForward?: AdaptiveGoalCarryForward | null
): any[] => {
  const source = payload?.data || payload;
  const metrics = buildAdaptiveGoalMetrics(userData);
  if (!source) return [];
  if (Array.isArray(source)) return applyAdaptiveGoalsToDays(source, metrics, carryForward);
  if (Array.isArray(source.dailyLogs)) return applyAdaptiveGoalsToDays(source.dailyLogs, metrics, carryForward);

  const sourceDays = Object.values(source).filter(
    (entry: any) => entry && typeof entry === 'object'
  ) as any[];

  return applyAdaptiveGoalsToDays(sourceDays, metrics, carryForward);
};

const buildHealthRecordSummary = (
  payload: any,
  userData: any,
  carryForward?: AdaptiveGoalCarryForward | null
): HealthRecordSummary => {
  const days = getHealthDays(payload, userData, carryForward);
  const metricSources = getMetricSources(userData);

  return {
    height: normalizeHeightCm(readMetric(metricSources, ['height', 'heightCm', 'heightInCm'])),
    weight: readMetric(metricSources, ['weight', 'weightKg', 'currentWeight']),
    goalCalories: readNumber(...metricSources.flatMap(source => [source.goalCalories, source.targetCalories])),
    hydrationGoal: readNumber(...metricSources.flatMap(source => [source.hydrationGoal, source.targetHydration])),
    completedDays: days.filter((day: any) => ['finished', 'completed'].includes(day?.status)).length,
    activeDays: days.filter((day: any) => day?.status === 'active').length,
    totalCalories: days.reduce((sum, day: any) => sum + readNumber(day?.achievedCalories, day?.achieviedCalories), 0),
    targetCalories: days.reduce((sum, day: any) => sum + readNumber(day?.targetCalories), 0),
    totalHydration: days.reduce((sum, day: any) => sum + readNumber(day?.achievedHydration, day?.achieviedHydration), 0),
    targetHydration: days.reduce((sum, day: any) => sum + readNumber(day?.targetHydration), 0),
    days,
  };
};

export default function ProfileScreen() {
  const { colors, isDarkMode } = useTheme();
  const styles = useMemo(() => getStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const latestProfileImageEvent = profileImageEvents.getLatest();
  const initialProfileImageUrl =
    latestProfileImageEvent && !latestProfileImageEvent.removed
      ? latestProfileImageEvent.displayImageUrl || latestProfileImageEvent.backendImageUrl || null
      : null;
  const [selectedTab, setSelectedTab] = useState('overview');
  const [user, setUser] = useState<any>(null);
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(initialProfileImageUrl);
  const [gmailImageUrl, setGmailImageUrl] = useState<string | null>(
    latestProfileImageEvent?.gmailImageUrl || null
  );
  const [healthScore, setHealthScore] = useState(85);
  const [profileAppointments, setProfileAppointments] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [selectedHistoryAppointment, setSelectedHistoryAppointment] = useState<any>(null);
  const [showHealthRecords, setShowHealthRecords] = useState(false);
  const [healthRecords, setHealthRecords] = useState<HealthRecordSummary | null>(null);
  const [healthRecordsLoading, setHealthRecordsLoading] = useState(false);
  const [showWeightLogModal, setShowWeightLogModal] = useState(false);
  const [weightInput, setWeightInput] = useState('');
  const [isSavingWeightLog, setIsSavingWeightLog] = useState(false);
  const [achievementLocalStats, setAchievementLocalStats] = useState<AchievementLocalStats>({});
  const [doctorStatus, setDoctorStatus] = useState<string | null>(null);
  const profileImageLoadId = React.useRef(0);
  const profileImageUserKeyRef = React.useRef<string | null>(null);
  const displayName = getStoredDisplayName(user);
  const displayEmail = user?.email || 'user@example.com';
  const displayImageUrl = profileImageUrl || gmailImageUrl;
  const handleProfileImageError = () => {
    if (displayImageUrl === gmailImageUrl) {
      setGmailImageUrl(null);
    } else {
      setProfileImageUrl(null);
      if (user) {
        clearCachedProfileImage(user);
      }
    }
  };

  const refreshProfileImageFromBackend = React.useCallback(async (
    userData: any,
    token: string,
    fallbackGmailImageUrl: string | null,
    requestId: number
  ) => {
    try {
      const cacheUserKey = getProfileImageUserKey(userData) || userData?._id || userData?.id || userData?.email || 'current';
      const [profileResult, pictureResult] = await Promise.allSettled([
        cachedRequestJson<any>(`profile:user:${cacheUserKey}`, `${API_URL}/api/user/profile`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }, PROFILE_READ_CONFIG),
        cachedRequestJson<any>(`profile:picture:${cacheUserKey}`, `${API_URL}/api/user/profile-picture`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }, PROFILE_READ_CONFIG),
      ]);

      if (profileImageLoadId.current !== requestId) return;

      let nextUser = userData;
      let nextGmailImageUrl = fallbackGmailImageUrl;
      let nextBackendImageUrl: string | null = null;
      let backendVersionSeed: string | number | null = null;

      if (profileResult.status === 'fulfilled') {
        const profileData = profileResult.value;
        const backendUser = profileData?.data?.user || profileData?.user;
        const backendGmailImageUrl = getGmailProfileImageUrl(backendUser || profileData);

        if (backendUser) {
          nextUser = { ...(userData || {}), ...backendUser };
          setUser(nextUser);
        }

        nextGmailImageUrl = backendGmailImageUrl || fallbackGmailImageUrl;
        nextBackendImageUrl = getBackendProfileImageUrl(API_URL, backendUser || profileData);
        backendVersionSeed =
          backendUser?.profileImageUpdatedAt ||
          backendUser?.profilePictureUpdatedAt ||
          backendUser?.updatedAt ||
          backendUser?.updated_at ||
          profileData?.updatedAt ||
          profileData?.updated_at ||
          null;
      }

      if (pictureResult.status === 'fulfilled') {
        const pictureData = pictureResult.value;
        if (pictureData.success && pictureData.data?.imageUrl) {
          nextBackendImageUrl = resolveBackendImageUrl(API_URL, pictureData.data.imageUrl);
          backendVersionSeed =
            pictureData.data.updatedAt ||
            pictureData.data.updated_at ||
            pictureData.data.profileImageUpdatedAt ||
            pictureData.data.profilePictureUpdatedAt ||
            backendVersionSeed;
        }
      }

      const latestCachedImage = await readCachedProfileImage(nextUser || userData);
      if (profileImageLoadId.current !== requestId) return;

      const versionedBackendImageUrl = buildStableBackendProfileImageUrl(
        API_URL,
        nextBackendImageUrl,
        latestCachedImage,
        backendVersionSeed
      );
      const cacheUpdatedAt =
        versionedBackendImageUrl === latestCachedImage?.backendImageUrl
          ? latestCachedImage.updatedAt
          : String(backendVersionSeed || new Date().toISOString());

      setProfileImageUrl(versionedBackendImageUrl);
      setGmailImageUrl(nextGmailImageUrl);
      await writeCachedProfileImage(nextUser || userData, {
        backendImageUrl: versionedBackendImageUrl,
        gmailImageUrl: nextGmailImageUrl,
      }, cacheUpdatedAt);
    } catch (error) {
      console.log('No fresh profile picture found, using cached image:', error);
    }
  }, []);

  const loadProfileImage = React.useCallback(async () => {
    const requestId = profileImageLoadId.current + 1;
    profileImageLoadId.current = requestId;

    try {
      const userData = await tokenStorage.getUser();

      if (profileImageLoadId.current !== requestId) return;

      if (userData) {
        profileImageUserKeyRef.current = getProfileImageUserKey(userData);
        setUser(userData);
      }

      const storedGmailImageUrl = getGmailProfileImageUrl(userData);
      const cachedImage = await readCachedProfileImage(userData);

      if (profileImageLoadId.current !== requestId) return;

      if (cachedImage?.backendImageUrl) {
        setProfileImageUrl(cachedImage.backendImageUrl);
      } else {
        setProfileImageUrl(
          buildStableBackendProfileImageUrl(
            API_URL,
            getBackendProfileImageUrl(API_URL, userData),
            cachedImage,
            userData?.profileImageUpdatedAt ||
            userData?.profilePictureUpdatedAt ||
            userData?.updatedAt ||
            userData?.updated_at
          )
        );
      }

      setGmailImageUrl(cachedImage?.gmailImageUrl || storedGmailImageUrl);

      const token = await tokenStorage.getToken();
      if (profileImageLoadId.current !== requestId) return;

      if (token) {
        void refreshProfileImageFromBackend(userData, token, storedGmailImageUrl, requestId);
      }
    } catch (error) {
      console.error('Error loading user:', error);
    }
  }, [refreshProfileImageFromBackend]);

  useEffect(() => {
    loadProfileImage();
  }, [loadProfileImage]);

  // Re-fetch profile image when it changes from Edit Profile Picture screen
  useEffect(() => {
    const handleProfileImageUpdate = (event?: ProfileImageUpdateEvent) => {
      if (!event) {
        loadProfileImage();
        return;
      }

      profileImageLoadId.current += 1;
      if (
        event.userKey &&
        profileImageUserKeyRef.current &&
        event.userKey !== profileImageUserKeyRef.current
      ) {
        return;
      }

      if (event.removed) {
        setProfileImageUrl(null);
        setGmailImageUrl(event.gmailImageUrl || null);
        return;
      }

      setProfileImageUrl(event.displayImageUrl || event.backendImageUrl || null);
      setGmailImageUrl(event.gmailImageUrl || null);
    };

    const unsubscribe = profileImageEvents.subscribe(handleProfileImageUpdate);
    return unsubscribe;
  }, [loadProfileImage]);

  // Update stats when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      let isActive = true;

      const loadHealthRecords = async (userData: any) => {
        setHealthRecordsLoading(true);
        try {
          const metricSources = [userData];
          const [storedMetrics, storedRecords] = await Promise.all([
            AsyncStorage.getItem(HEALTH_METRICS_STORAGE_KEY),
            getStoredDashboardCache(),
          ]);

          if (storedMetrics) {
            metricSources.push(JSON.parse(storedMetrics));
          }

          const weeklyTrackingId = await getStoredWeeklyTrackingId(userData);
          const carryForward = await loadAdaptiveGoalCarryForward({
            userId: userData?.id,
            currentWeeklyTrackingId: weeklyTrackingId,
          });

          if (storedRecords?.data) {
            const parsedRecords = { data: storedRecords.data };
            if (isActive) {
              setHealthRecords(buildHealthRecordSummary(parsedRecords, metricSources, carryForward));
              setHealthRecordsLoading(false);
            }

            authApi.getOnboardingStatus()
              .then((onboardingStatus) => {
                if (isActive) {
                  setHealthRecords(buildHealthRecordSummary(
                    parsedRecords,
                    [...metricSources, onboardingStatus],
                    carryForward
                  ));
                }
              })
              .catch(() => {
                // Existing stored profile data is enough when this lightweight refresh is unavailable.
              });
            return;
          }

          try {
            const onboardingStatus = await authApi.getOnboardingStatus();
            metricSources.push(onboardingStatus);
          } catch {
            // Existing stored profile data is enough when this lightweight refresh is unavailable.
          }

          if (weeklyTrackingId) {
            const progress = await dailyLogsApi.getWeeklyProgress(weeklyTrackingId);
            if (isActive) {
              setHealthRecords(buildHealthRecordSummary(progress, metricSources, carryForward));
            }
            return;
          }

          if (isActive) {
            setHealthRecords(buildHealthRecordSummary(null, metricSources));
          }
        } catch (error) {
          console.log('Error loading health records:', error);
          if (isActive) {
            setHealthRecords(buildHealthRecordSummary(null, userData));
          }
        } finally {
          if (isActive) {
            setHealthRecordsLoading(false);
          }
        }
      };

      const fetchStats = async () => {
        try {
          syncLatestHealthData().catch((error) => {
            console.log('Health data sync unavailable on profile load:', error);
          });

          const userData = await tokenStorage.getUser();
          if (!userData || !userData.id) return;
          setUser(userData);

          authApi.getDoctorStatus()
            .then((doctorStatusResponse) => {
              if (isActive) {
                setDoctorStatus(doctorStatusResponse?.doctor?.status || null);
              }
            })
            .catch(() => {
              if (isActive) {
                setDoctorStatus(null);
              }
            });

          let hasCachedAppointments = false;
          try {
            const cachedAppointments = await AsyncStorage.getItem('profileAppointments');
            if (cachedAppointments && isActive) {
              hasCachedAppointments = true;
              setProfileAppointments(JSON.parse(cachedAppointments));
            }
          } catch {
            hasCachedAppointments = false;
          }

          if (isActive) {
            setHistoryLoading(!hasCachedAppointments);
          }

          authApi.getUserAppointments()
            .then(async (appointmentsResponse) => {
              if (isActive) {
                const appointmentList = Array.isArray(appointmentsResponse)
                  ? appointmentsResponse
                  : appointmentsResponse?.appointments || appointmentsResponse?.data?.appointments || [];
                setProfileAppointments(appointmentList);
                await AsyncStorage.setItem('profileAppointments', JSON.stringify(appointmentList));
              }
            })
            .catch((error) => {
              console.log('Error fetching profile appointments:', error);
              if (isActive && !hasCachedAppointments) {
                setProfileAppointments([]);
              }
            })
            .finally(() => {
              if (isActive) {
                setHistoryLoading(false);
              }
            });

          // Fetch streak for health score
          try {
            // Priority 1: robust local streak calculation
            const localJsonResponse = await getStoredDashboardCache();
            let streakCount = 0;
            if (localJsonResponse?.data) {
              streakCount = computeProfileStreak({ data: localJsonResponse.data });
            } else {
              // Fallback: API
              const streakData = await streakApi.getUserStreak(userData.id);
              if (streakData) streakCount = streakData.streakCount || 0;
            }
            
            if (isActive) {
              // Calculate health score: base 70 + streak bonus (up to 30)
              const score = Math.min(70 + (streakCount * 2), 100);
              setHealthScore(score);
            }
          } catch (e) {
            console.log('Error calculating dynamic streak:', e);
          }

          // Fetch completed exercise total for achievement badges.
          try {
            // Local workouts
            let localWorkoutsCount = 0;
            const completed = await AsyncStorage.getItem('completedWorkouts');
            if (completed) {
              localWorkoutsCount = JSON.parse(completed).length;
            }

            const localAchievementStats = await loadAchievementLocalStats();
            localWorkoutsCount = Math.max(
              localWorkoutsCount,
              localAchievementStats.completedWorkouts || 0
            );

            if (isActive) {
              setAchievementLocalStats({
                ...localAchievementStats,
                completedWorkouts: localWorkoutsCount,
              });
            }

            exerciseApi.getExerciseStats(userData.id)
              .then((stats) => {
                if (stats && stats.success && isActive) {
                  const backendWorkoutsCount = stats.data.totalExercises || 0;
                  setAchievementLocalStats((previous) => ({
                    ...previous,
                    completedWorkouts: Math.max(
                      previous.completedWorkouts || 0,
                      backendWorkoutsCount
                    ),
                  }));
                }
              })
              .catch((e) => {
                console.log('Error fetching exercise stats from backend:', e);
              });
          } catch (e) {
            console.log('Error processing workouts stats:', e);
          }

          await loadHealthRecords(userData);
        } catch (error) {
          console.error('Error fetching profile stats:', error);
        }
      };

      fetchStats();

      return () => {
        isActive = false;
      };
    }, [])
  );

  // Mock data for additional features
  const completedAppointments = useMemo(
    () => profileAppointments.filter(apt => normalizeStatus(apt.status) === 'completed'),
    [profileAppointments]
  );
  const historyAppointments = useMemo(() => [...profileAppointments].sort((a, b) => {
    const dateA = getAppointmentDate(a)?.getTime() || 0;
    const dateB = getAppointmentDate(b)?.getTime() || 0;
    return dateB - dateA;
  }), [profileAppointments]);
  const upcomingAppointments = useMemo(() => profileAppointments
    .filter(apt => {
      const date = getAppointmentDate(apt);
      return date && date > new Date() && !['cancelled', 'completed'].includes(normalizeStatus(apt.status));
    })
    .slice(0, 3), [profileAppointments]);
  const activeAppointments = useMemo(() => profileAppointments
    .filter(apt => normalizeStatus(apt.status) === 'confirmed')
    .slice(0, 2), [profileAppointments]);
  const hasProfileAppointments = upcomingAppointments.length > 0 || activeAppointments.length > 0;
  const appointmentsSectionStyle = [
    styles.appointmentsSection,
    { marginBottom: insets.bottom + hp(2) },
  ];
  const achievementsSectionStyle = [
    styles.achievementsSection,
    { marginBottom: insets.bottom + hp(2) },
  ];

  const achievements = useMemo(
    () => calculateAchievementBadges(
      healthRecords?.days || null,
      achievementLocalStats
    ),
    [achievementLocalStats, healthRecords?.days]
  );
  const earnedAchievementsCount = achievements.filter(
    (achievement) => achievement.unlocked
  ).length;
  const achievementsCompletionPercent = achievements.length
    ? Math.round((earnedAchievementsCount / achievements.length) * 100)
    : 0;

  const healthStats = {
    totalConsultations: completedAppointments.length,
    thisMonth: completedAppointments.filter(apt => {
      const aptDate = getAppointmentDate(apt);
      if (!aptDate) return false;
      const now = new Date();
      return aptDate.getMonth() === now.getMonth() && aptDate.getFullYear() === now.getFullYear();
    }).length,
    healthScore: healthScore,
  };
  const profileMetricSources = useMemo(() => getMetricSources(user), [user]);
  const heightMeters = healthRecords?.height ? healthRecords.height / 100 : undefined;
  const derivedBmi = healthRecords?.weight && heightMeters
    ? healthRecords.weight / (heightMeters * heightMeters)
    : undefined;
  const bmiValue = derivedBmi || readMetric(profileMetricSources, ['bmi', 'bodyMassIndex']);
  const bmiDisplay = bmiValue ? bmiValue.toFixed(1) : '--';
  const weeklyLoggedDays = healthRecords?.days.length || 0;
  const weeklyCompletedDays = healthRecords?.completedDays || 0;
  const hydrationAverage = weeklyLoggedDays ? (healthRecords?.totalHydration || 0) / weeklyLoggedDays : 0;
  const hydrationTargetAverage = weeklyLoggedDays && healthRecords?.targetHydration
    ? healthRecords.targetHydration / weeklyLoggedDays
    : healthRecords?.hydrationGoal || 0;
  const dailyGoalCalories = healthRecords?.goalCalories
    || (weeklyLoggedDays && healthRecords?.targetCalories
      ? Math.round(healthRecords.targetCalories / weeklyLoggedDays)
      : 0);
  const goalLabel = formatGoalLabel(
    readTextMetric(profileMetricSources, [
      'fitnessGoal',
      'goal',
      'healthGoal',
      'targetGoal',
      'selectedGoal',
      'goalType',
    ])
  );
  const completedWorkoutCount = achievementLocalStats.completedWorkouts || 0;
  const latestAppointment = historyAppointments[0];
  const latestAppointmentLabel = latestAppointment
    ? `${(normalizeStatus(latestAppointment.status) || 'scheduled').toUpperCase()} - ${getAppointmentDateLabel(latestAppointment)}`
    : 'No history yet';
  const hasSnapshotData = Boolean(
    bmiValue ||
    dailyGoalCalories ||
    weeklyLoggedDays ||
    completedWorkoutCount ||
    profileAppointments.length ||
    healthRecords?.height ||
    healthRecords?.weight
  );
  const isApprovedDoctor = normalizeStatus(doctorStatus || undefined) === 'approved';
  const snapshotStatCards = [
    {
      label: 'Weekly stats',
      value: `${weeklyCompletedDays}/7`,
      detail: `${weeklyLoggedDays} days logged`,
      icon: 'calendar-number-outline',
      color: colors.primary,
    },
    {
      label: 'Workouts',
      value: String(completedWorkoutCount),
      detail: 'completed sessions',
      icon: 'barbell-outline',
      color: colors.secondary || colors.primary,
    },
    {
      label: 'Hydration avg',
      value: hydrationAverage ? `${hydrationAverage.toFixed(1)} L` : '--',
      detail: hydrationTargetAverage ? `${hydrationTargetAverage.toFixed(1)} L target` : 'track water daily',
      icon: 'water-outline',
      color: colors.info || colors.primary,
    },
  ];

  const openEmergencyContact = async () => {
    const whatsappNumber = '923325563373';
    const whatsappUrl = `whatsapp://send?phone=${whatsappNumber}`;
    const fallbackUrl = `https://wa.me/${whatsappNumber}`;

    try {
      await Linking.openURL(whatsappUrl);
    } catch {
      await Linking.openURL(fallbackUrl);
    }
  };

  const openDoctorPortal = () => {
    router.push('/(main)/(doctor-portal)');
  };

  const openAppointmentManagement = () => {
    router.push('/(main)/(doctor-portal)/patient-management');
  };

  const profileDoctorAction = isApprovedDoctor
    ? {
        title: 'Appointment Management',
        subtitle: 'Review, approve, and manage patient appointment requests',
        iconName: 'calendar-outline',
        action: openAppointmentManagement,
      }
    : {
        title: 'Join as Doctor',
        subtitle: 'Register or manage your verified doctor profile',
        iconName: 'medkit-outline',
        action: openDoctorPortal,
      };

  const openWeightLogModal = () => {
    const currentWeight = healthRecords?.weight || user?.userInfo?.weight || user?.weight;
    setWeightInput(currentWeight ? String(Math.round(Number(currentWeight) * 10) / 10) : '');
    setShowWeightLogModal(true);
  };

  const saveWeightLog = async () => {
    const nextWeight = Number(weightInput);

    if (!Number.isFinite(nextWeight) || nextWeight < 20 || nextWeight > 350) {
      Alert.alert('Invalid Weight', 'Enter a weight between 20 kg and 350 kg.');
      return;
    }

    setIsSavingWeightLog(true);
    try {
      const storedMetricsRaw = await AsyncStorage.getItem(HEALTH_METRICS_STORAGE_KEY);
      const storedMetrics = storedMetricsRaw ? JSON.parse(storedMetricsRaw) : {};
      const nextMetrics = {
        ...storedMetrics,
        weight: Math.round(nextWeight * 10) / 10,
        currentWeight: Math.round(nextWeight * 10) / 10,
        updatedAt: new Date().toISOString(),
      };
      await AsyncStorage.setItem(HEALTH_METRICS_STORAGE_KEY, JSON.stringify(nextMetrics));

      const latestUser = await tokenStorage.getUser();
      const updatedUser = latestUser
        ? {
            ...latestUser,
            userInfo: {
              ...(latestUser.userInfo || {}),
              weight: nextMetrics.weight,
            },
          }
        : user
          ? {
              ...user,
              userInfo: {
                ...(user.userInfo || {}),
                weight: nextMetrics.weight,
              },
            }
          : null;

      if (updatedUser) {
        await tokenStorage.saveUser(updatedUser);
        setUser(updatedUser);
      }

      const weeklyTrackingId = await getStoredWeeklyTrackingId(updatedUser);
      const adaptiveMetrics = buildAdaptiveGoalMetrics(updatedUser, nextMetrics);
      const userId = updatedUser?.id || updatedUser?._id;
      await recordWeightTrendSnapshot(adaptiveMetrics || { weight: nextMetrics.weight }, {
        userId,
        weeklyTrackingId,
      });

      const cachedRecords = await getStoredDashboardCache(undefined, weeklyTrackingId);
      if (cachedRecords?.data) {
        const recordsData = cachedRecords.data;
        const carryForward = await loadAdaptiveGoalCarryForward({
          userId,
          currentWeeklyTrackingId: weeklyTrackingId,
        });
        const weightTrendCalibration = await loadWeeklyWeightTrendCalibration(
          adaptiveMetrics,
          recordsData,
          {
            userId,
            weeklyTrackingId,
          }
        );
        const adjustedRecords = applyAdaptiveGoalsToJsonResponse(
          recordsData,
          adaptiveMetrics,
          carryForward,
          { weightTrendCalibration }
        );

        await setStoredDashboardCache(
          { data: adjustedRecords, timestamp: new Date() },
          updatedUser,
          weeklyTrackingId
        );
        setHealthRecords(buildHealthRecordSummary(
          { data: adjustedRecords },
          [updatedUser, nextMetrics],
          carryForward
        ));
      } else {
        setHealthRecords((previous) =>
          previous
            ? {
                ...previous,
                weight: nextMetrics.weight,
              }
            : buildHealthRecordSummary(null, [updatedUser, nextMetrics])
        );
      }

      queueHealthDataCloudSync();
      setShowWeightLogModal(false);
    } catch (error) {
      console.error('Error saving weight log:', error);
      Alert.alert('Could Not Save', 'Please try logging your weight again.');
    } finally {
      setIsSavingWeightLog(false);
    }
  };

  const quickActions = [
    { title: "Book Appointment", iconName: "calendar", color: colors.primary, action: () => router.push('/(main)/(conference)') },
    { title: "Chat History", iconName: "chatbubbles", color: colors.info, action: () => router.push('/(main)/(chatbot)/chat-history') },
    { title: "Health Records", iconName: "clipboard", color: colors.secondary, action: () => setShowHealthRecords(true) },
    { title: "Log Weight", iconName: "scale", color: '#8B5CF6', action: openWeightLogModal },
    { title: "Achievement Badges", iconName: "trophy", color: colors.warning, action: () => setSelectedTab('achievements') },
    { title: "Emergency Contact", iconName: "alert-circle", color: colors.error, action: openEmergencyContact },
  ];

  return (
    <ScreenSceneWrapper>
      <View style={{ flex: 1 }}>
        <StatusBar
          barStyle={isDarkMode ? "light-content" : "dark-content"}
          backgroundColor={colors.screenColor}
        />
        <SafeAreaView style={styles.container} edges={['top']}>
          <AppHeader 
            title="My Profile"
            showStepIndicator={false}
            showMenuButton={true}
          />

        <View style={styles.content}>
          <ScrollView showsVerticalScrollIndicator={false}>
        {/* Profile Picture Section */}
        <View style={{
          alignItems: 'center',
          marginTop: hp(1),
          marginBottom: hp(4),
        }}>
          <View style={{
            width: hp(15),
            height: hp(15),
            borderRadius: hp(7.5),
            backgroundColor: colors.cardBackground,
            justifyContent: 'center',
            alignItems: 'center',
            shadowColor: colors.black,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.1,
            shadowRadius: 8,
            elevation: 5,
            marginBottom: hp(2),
          }}>
            {displayImageUrl ? (
              <Image
                key={displayImageUrl}
                source={{ uri: displayImageUrl, cache: 'force-cache' }}
                style={{
                  width: hp(12),
                  height: hp(12),
                  borderRadius: hp(6),
                }}
                fadeDuration={0}
                onError={handleProfileImageError}
              />
            ) : (
              <View style={{
                width: hp(12),
                height: hp(12),
                borderRadius: hp(6),
                backgroundColor: colors.primary + '20',
                justifyContent: 'center',
                alignItems: 'center',
              }}>
                <Ionicons name="person" size={hp(6.5)} color={colors.textSecondary} />
              </View>
            )}
          </View>
          
          <Text style={{
            fontSize: hp(2.8),
            fontWeight: 'bold',
            color: colors.textPrimary,
            marginBottom: hp(0.5),
          }}>
            {displayName}
          </Text>
          
          <Text style={{
            fontSize: hp(1.8),
            color: colors.textSecondary,
          }}>
            {displayEmail}
          </Text>
        </View>

        <AnimatedPressable
          style={styles.doctorAccessCard}
          onPress={profileDoctorAction.action}
        >
          <View style={styles.doctorAccessIcon}>
            <Ionicons name={profileDoctorAction.iconName as any} size={Math.min(hp(3.1), wp(7))} color={colors.textOnPrimary} />
          </View>
          <View style={styles.doctorAccessCopy}>
            <Text style={styles.doctorAccessTitle}>{profileDoctorAction.title}</Text>
            <Text style={styles.doctorAccessSubtitle}>
              {profileDoctorAction.subtitle}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={Math.min(hp(2.4), wp(5.4))} color={colors.primary} />
        </AnimatedPressable>

        {/* Tab Navigation */}
        <View style={styles.tabContainer}>
          <AnimatedPressable 
            style={[styles.tab, selectedTab === 'overview' && styles.activeTab]}
            onPress={() => setSelectedTab('overview')}
          >
            <Text style={[styles.tabText, selectedTab === 'overview' && styles.activeTabText]}>Overview</Text>
          </AnimatedPressable>
          <AnimatedPressable 
            style={[styles.tab, selectedTab === 'history' && styles.activeTab]}
            onPress={() => setSelectedTab('history')}
          >
            <Text style={[styles.tabText, selectedTab === 'history' && styles.activeTabText]}>History</Text>
          </AnimatedPressable>
          <AnimatedPressable 
            style={[styles.tab, selectedTab === 'achievements' && styles.activeTab]}
            onPress={() => setSelectedTab('achievements')}
          >
            <Text style={[styles.tabText, selectedTab === 'achievements' && styles.activeTabText]}>Achievements</Text>
          </AnimatedPressable>
        </View>

        {/* Content based on selected tab */}
        {selectedTab === 'overview' && (
          <>
            <View style={styles.snapshotSection}>
              <View style={styles.snapshotHeaderRow}>
                <View style={styles.snapshotHeaderCopy}>
                  <Text style={styles.sectionTitle}>Profile Health Snapshot</Text>
                  <Text style={styles.snapshotSubtitle}>
                    Updated from profile records and weekly logs.
                  </Text>
                </View>
                <View style={styles.snapshotHeaderIcon}>
                  <Ionicons name="pulse-outline" size={Math.min(hp(2.6), wp(5.8))} color={colors.primary} />
                </View>
              </View>

              {healthRecordsLoading && !hasSnapshotData ? (
                <View style={styles.inlineLoading}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={styles.inlineLoadingText}>Loading profile snapshot...</Text>
                </View>
              ) : !hasSnapshotData ? (
                <SmartEmptyState
                  icon="clipboard-outline"
                  title="No Snapshot Yet"
                  message="Complete your health profile and daily tracking to unlock BMI, goals, hydration, workouts, and appointment history."
                  actionLabel="Open Health Records"
                  onAction={() => setShowHealthRecords(true)}
                  colors={colors}
                  compact
                  style={styles.snapshotEmpty}
                />
              ) : (
                <>
                  <View style={styles.snapshotHeroGrid}>
                    <View style={styles.snapshotBmiCard}>
                      <ProgressRing
                        progress={bmiValue ? Math.min(bmiValue / 40, 1) : 0}
                        size={Math.min(hp(10.6), wp(23.5))}
                        strokeWidth={Math.min(hp(0.95), wp(2.1))}
                        color={colors.primary}
                        trackColor={colors.border}
                        icon="body-outline"
                        value={bmiDisplay}
                        label="BMI"
                        textColor={colors.textPrimary}
                        mutedTextColor={colors.textSecondary}
                      />
                      <View style={styles.snapshotCardCopy}>
                        <Text style={styles.snapshotCardTitle}>BMI</Text>
                        <Text style={styles.snapshotCardValue}>{getBmiCategory(bmiValue)}</Text>
                        <Text style={styles.snapshotCardMeta}>
                          {formatMetric(healthRecords?.weight, 'kg')} - {formatMetric(healthRecords?.height, 'cm')}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.snapshotGoalCard}>
                      <View style={styles.snapshotGoalIcon}>
                        <Ionicons name="flag-outline" size={Math.min(hp(2.8), wp(6.2))} color={colors.textOnPrimary} />
                      </View>
                      <Text style={styles.snapshotCardTitle}>Goal</Text>
                      <Text style={styles.snapshotGoalTitle} numberOfLines={2} adjustsFontSizeToFit>
                        {goalLabel}
                      </Text>
                      <Text style={styles.snapshotCardMeta}>
                        {dailyGoalCalories ? `${dailyGoalCalories} kcal daily target` : 'Add a goal to personalize tracking'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.snapshotMetricGrid}>
                    {snapshotStatCards.map((stat) => (
                      <View key={stat.label} style={styles.snapshotMetricCard}>
                        <View style={[styles.snapshotMetricIcon, { backgroundColor: `${stat.color}18` }]}>
                          <Ionicons name={stat.icon as any} size={Math.min(hp(2.3), wp(5.2))} color={stat.color} />
                        </View>
                        <Text style={styles.snapshotMetricValue}>{stat.value}</Text>
                        <Text style={styles.snapshotMetricLabel}>{stat.label}</Text>
                        <Text style={styles.snapshotMetricDetail} numberOfLines={1} adjustsFontSizeToFit>
                          {stat.detail}
                        </Text>
                      </View>
                    ))}
                  </View>

                  <AnimatedPressable
                    style={styles.snapshotHistoryCard}
                    onPress={() => setSelectedTab('history')}
                  >
                    <View style={styles.snapshotHistoryIcon}>
                      <Ionicons name="calendar-outline" size={Math.min(hp(2.5), wp(5.5))} color={colors.primary} />
                    </View>
                    <View style={styles.snapshotHistoryCopy}>
                      <Text style={styles.snapshotCardTitle}>Appointment History</Text>
                      <Text style={styles.snapshotHistoryText}>
                        {profileAppointments.length} total - {completedAppointments.length} completed - {upcomingAppointments.length} upcoming
                      </Text>
                      <Text style={styles.snapshotCardMeta}>{latestAppointmentLabel}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={Math.min(hp(2.4), wp(5.4))} color={colors.textSecondary} />
                  </AnimatedPressable>
                </>
              )}
            </View>

            <ProgressPhotoGallery
              userId={user?.id || user?._id || displayEmail}
              colors={colors}
            />

            {/* Health Statistics */}
            <View style={styles.statsSection}>
              <Text style={styles.sectionTitle}>Health Statistics</Text>
              <View style={styles.statsGrid}>
                <View style={styles.statCard}>
                  <Text style={styles.statNumber}>{healthStats.totalConsultations}</Text>
                  <Text style={styles.statLabel}>Total Consultations</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statNumber}>{healthStats.thisMonth}</Text>
                  <Text style={styles.statLabel}>This Month</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statNumber}>{healthStats.healthScore}%</Text>
                  <Text style={styles.statLabel}>Health Score</Text>
                </View>
              </View>
            </View>

            {/* Quick Actions */}
            <View style={styles.quickActionsSection}>
              <Text style={styles.sectionTitle}>Quick Actions</Text>
              <View style={styles.quickActionsGrid}>
                {quickActions.map((action, index) => (
                  <AnimatedPressable
                    key={index}
                    style={[styles.quickActionCard, { borderLeftColor: action.color }]}
                    onPress={action.action}
                  >
                    <Ionicons
                      name={action.iconName as any}
                      size={Math.min(hp(3.2), wp(7))}
                      color={action.color}
                      style={styles.quickActionIcon}
                    />
                    <Text style={styles.quickActionTitle}>{action.title}</Text>
                  </AnimatedPressable>
                ))}
              </View>
            </View>
          </>
        )}

        {selectedTab === 'history' && (
          <View style={styles.historySection}>
            <Text style={styles.sectionTitle}>Booking History</Text>
            
            {historyLoading && (
              <View style={styles.inlineLoading}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.inlineLoadingText}>Loading booking history...</Text>
              </View>
            )}

            {!historyLoading && historyAppointments.length > 0 && (
              <View style={styles.historyCategory}>
                {historyAppointments.map((appointment) => {
                  const statusColor = getStatusColor(appointment.status, colors);

                  return (
                    <AnimatedPressable
                      key={getAppointmentId(appointment)}
                      style={[styles.historyCard, { borderLeftColor: statusColor }]}
                      onPress={() => setSelectedHistoryAppointment(appointment)}
                    >
                      <View style={styles.historyCardHeader}>
                        <View style={styles.historyIcon}>
                          <Ionicons name={getStatusIcon(appointment.status) as any} size={20} color={statusColor} />
                        </View>
                        <View style={styles.historyInfo}>
                          <Text style={styles.historyTitle}>{getDoctorName(appointment)}</Text>
                          <Text style={styles.historySubtitle}>{getDoctorSpecialty(appointment)}</Text>
                        </View>
                        <Text style={styles.historyDate}>{getAppointmentDateLabel(appointment)}</Text>
                      </View>
                      <View style={styles.historyMetaRow}>
                        <Text style={[styles.historyStatus, { color: statusColor }]}>
                          {(normalizeStatus(appointment.status) || 'scheduled').toUpperCase()}
                        </Text>
                        <Text style={styles.historySpecialty}>{appointment.time || 'Time unavailable'}</Text>
                      </View>
                    </AnimatedPressable>
                  );
                })}
              </View>
            )}

            {!historyLoading && historyAppointments.length === 0 && (
              <SmartEmptyState
                icon="document-text-outline"
                title="No History Yet"
                message="Completed and cancelled appointments will appear here after your first consultation."
                actionLabel="Book Appointment"
                onAction={() => router.push('/(main)/(conference)')}
                colors={colors}
                compact
                style={styles.profileEmptyState}
              />
            )}
          </View>
        )}

        {selectedTab === 'achievements' && (
          <View style={achievementsSectionStyle}>
            <View style={styles.achievementsHeaderRow}>
              <View style={styles.achievementsHeaderText}>
                <Text style={styles.sectionTitle}>Achievements & Badges</Text>
                <Text style={styles.achievementSummaryText}>
                  {earnedAchievementsCount}/{achievements.length} badges unlocked
                </Text>
              </View>
              <View style={styles.achievementSummaryPill}>
                <Ionicons name="trophy-outline" size={Math.min(hp(2.1), wp(4.8))} color={colors.primary} />
                <Text style={styles.achievementSummaryPillText}>{achievementsCompletionPercent}%</Text>
              </View>
            </View>
            <View style={styles.achievementsGrid}>
              {achievements.map((achievement: AchievementBadge) => {
                const badgeColor = achievement.unlocked ? achievement.color : achievement.lockedColor;
                const progressPercent = Math.round(achievement.progress * 100);

                return (
                  <View
                    key={achievement.id}
                    style={[
                      styles.achievementCard,
                      achievement.unlocked ? styles.achievementEarned : styles.achievementLocked,
                      { borderColor: achievement.unlocked ? badgeColor : colors.border },
                    ]}
                  >
                    <View style={[styles.achievementIconWrap, { backgroundColor: `${badgeColor}18` }]}>
                      <Ionicons
                        name={achievement.icon as any}
                        size={Math.min(hp(3.2), wp(7.2))}
                        color={badgeColor}
                      />
                    </View>
                    <Text style={[
                      styles.achievementTitle,
                      achievement.unlocked ? styles.achievementTitleEarned : styles.achievementTitleLocked
                    ]}>
                      {achievement.title}
                    </Text>
                    <Text style={styles.achievementDescription}>{achievement.description}</Text>
                    <View style={styles.achievementProgressTrack}>
                      <View
                        style={[
                          styles.achievementProgressFill,
                          { width: `${progressPercent}%`, backgroundColor: badgeColor },
                        ]}
                      />
                    </View>
                    <Text style={[styles.achievementProgress, { color: badgeColor }]}>
                      {achievement.unlocked ? 'Unlocked' : achievement.progressLabel}
                    </Text>
                    {achievement.unlocked && (
                      <View style={[styles.achievementBadge, { backgroundColor: badgeColor }]}>
                        <Ionicons name="checkmark" size={Math.min(hp(1.55), wp(3.5))} color={colors.textOnPrimary} />
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Appointments Section */}
        {selectedTab === 'history' && hasProfileAppointments && (
          <View style={appointmentsSectionStyle}>
            <Text style={styles.sectionTitle}>My Appointments</Text>
            
            {/* Active Appointments */}
            {activeAppointments.map((appointment) => (
              <AnimatedPressable
                key={getAppointmentId(appointment)}
                style={[styles.appointmentCard, styles.activeAppointmentCard]}
                onPress={() => setSelectedHistoryAppointment(appointment)}
              >
                <View style={styles.appointmentHeader}>
                  <View style={styles.appointmentIcon}>
                    <Ionicons name="videocam" size={20} color={colors.textOnPrimary} />
                  </View>
                  <View style={styles.appointmentInfo}>
                    <Text style={styles.appointmentTitle}>Active Session</Text>
                    <Text style={styles.appointmentSubtitle}>Click to join call</Text>
                  </View>
                  <View style={styles.appointmentStatus}>
                    <Text style={styles.statusText}>LIVE</Text>
                  </View>
                </View>
                <View style={styles.appointmentDetails}>
                  <Text style={styles.doctorName}>{getDoctorName(appointment)}</Text>
                  <Text style={styles.appointmentTime}>{appointment.time} - {getAppointmentDateLabel(appointment)}</Text>
                </View>
              </AnimatedPressable>
            ))}

            {/* Upcoming Appointments */}
            {upcomingAppointments.map((appointment) => (
              <AnimatedPressable
                key={getAppointmentId(appointment)}
                style={styles.appointmentCard}
                onPress={() => setSelectedHistoryAppointment(appointment)}
              >
                <View style={styles.appointmentHeader}>
                  <View style={styles.appointmentIcon}>
                    <Ionicons name="calendar" size={20} color={colors.primary} />
                  </View>
                  <View style={styles.appointmentInfo}>
                    <Text style={styles.appointmentTitle}>Upcoming Appointment</Text>
                    <Text style={styles.appointmentSubtitle}>Click to view details</Text>
                  </View>
                  <View style={styles.appointmentStatus}>
                    <Text style={styles.statusText}>SCHEDULED</Text>
                  </View>
                </View>
                <View style={styles.appointmentDetails}>
                  <Text style={styles.doctorName}>{getDoctorName(appointment)}</Text>
                  <Text style={styles.appointmentTime}>{appointment.time} - {getAppointmentDateLabel(appointment)}</Text>
                  <Text style={styles.appointmentSpecialty}>{getDoctorSpecialty(appointment)}</Text>
                </View>
              </AnimatedPressable>
            ))}
          </View>
        )}

        </ScrollView>
      </View>

      <Modal
        visible={!!selectedHistoryAppointment}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedHistoryAppointment(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.profileModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Appointment Details</Text>
              <TouchableOpacity onPress={() => setSelectedHistoryAppointment(null)}>
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            {selectedHistoryAppointment && (
              <>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Doctor</Text>
                  <Text style={styles.detailValue}>{getDoctorName(selectedHistoryAppointment)}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Specialty</Text>
                  <Text style={styles.detailValue}>{getDoctorSpecialty(selectedHistoryAppointment)}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Date</Text>
                  <Text style={styles.detailValue}>{getAppointmentDateLabel(selectedHistoryAppointment)}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Time</Text>
                  <Text style={styles.detailValue}>{selectedHistoryAppointment.time || 'Time unavailable'}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Status</Text>
                  <Text style={[styles.detailValue, { color: getStatusColor(selectedHistoryAppointment.status, colors) }]}>
                    {(normalizeStatus(selectedHistoryAppointment.status) || 'scheduled').toUpperCase()}
                  </Text>
                </View>
                {!!selectedHistoryAppointment.description && (
                  <View style={styles.detailBlock}>
                    <Text style={styles.detailLabel}>Description</Text>
                    <Text style={styles.detailValue}>{selectedHistoryAppointment.description}</Text>
                  </View>
                )}
              </>
            )}
          </View>
        </View>
      </Modal>

      <Modal
        visible={showHealthRecords}
        transparent
        animationType="slide"
        onRequestClose={() => setShowHealthRecords(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.healthRecordsModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Health Records</Text>
              <TouchableOpacity onPress={() => setShowHealthRecords(false)}>
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            {healthRecordsLoading ? (
              <View style={styles.inlineLoading}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.inlineLoadingText}>Loading health records...</Text>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.recordsGrid}>
                  <View style={styles.recordCard}>
                    <Text style={styles.recordValue}>{formatMetric(healthRecords?.weight, 'kg')}</Text>
                    <Text style={styles.recordLabel}>Weight</Text>
                  </View>
                  <View style={styles.recordCard}>
                    <Text style={styles.recordValue}>{formatMetric(healthRecords?.height, 'cm')}</Text>
                    <Text style={styles.recordLabel}>Height</Text>
                  </View>
                  <View style={styles.recordCard}>
                    <Text style={styles.recordValue}>{healthRecords?.completedDays || 0}</Text>
                    <Text style={styles.recordLabel}>Days Done</Text>
                  </View>
                  <View style={styles.recordCard}>
                    <Text style={styles.recordValue}>{healthScore}%</Text>
                    <Text style={styles.recordLabel}>Health Score</Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.recordActionButton}
                  onPress={openWeightLogModal}
                  activeOpacity={0.85}
                >
                  <Ionicons name="scale-outline" size={Math.min(hp(2.2), wp(5))} color={colors.textOnPrimary} />
                  <Text style={styles.recordActionText}>Log Weight</Text>
                </TouchableOpacity>

                <View style={styles.recordSummaryCard}>
                  <Text style={styles.recordSummaryTitle}>Weekly Nutrition</Text>
                  <Text style={styles.recordSummaryText}>
                    Calories: {healthRecords?.totalCalories || 0} / {healthRecords?.targetCalories || healthRecords?.goalCalories || 0} kcal
                  </Text>
                  <Text style={styles.recordSummaryText}>
                    Hydration: {healthRecords?.totalHydration || 0} / {healthRecords?.targetHydration || healthRecords?.hydrationGoal || 0} L
                  </Text>
                  <Text style={styles.recordSummaryText}>
                    Logged days: {healthRecords?.days.length || 0}
                  </Text>
                </View>

                {(!healthRecords || healthRecords.days.length === 0) && (
                  <SmartEmptyState
                    icon="document-text-outline"
                    title="No Health Records Yet"
                    message="Daily calories, hydration, and completed days will appear here once tracking starts."
                    colors={colors}
                    compact
                    style={styles.profileEmptyState}
                  />
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      <Modal
        visible={showWeightLogModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowWeightLogModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.weightLogModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Log Weight</Text>
              <TouchableOpacity onPress={() => setShowWeightLogModal(false)}>
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.weightLogLabel}>Weight (kg)</Text>
            <TextInput
              style={styles.weightLogInput}
              value={weightInput}
              onChangeText={setWeightInput}
              keyboardType="decimal-pad"
              placeholder="70.0"
              placeholderTextColor={colors.textSecondary}
            />

            <TouchableOpacity
              style={[styles.weightLogButton, isSavingWeightLog && styles.weightLogButtonDisabled]}
              onPress={saveWeightLog}
              disabled={isSavingWeightLog}
              activeOpacity={0.85}
            >
              {isSavingWeightLog ? (
                <ActivityIndicator size="small" color={colors.textOnPrimary} />
              ) : (
                <Text style={styles.weightLogButtonText}>Save Weight</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
        </SafeAreaView>
      </View>
    </ScreenSceneWrapper>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.screenColor,
  },
  content: {
    flex: 1,
    backgroundColor: colors.screenColor,
    borderTopLeftRadius: wp(8),
    borderTopRightRadius: wp(8),
  },
  appointmentsSection: {
    marginHorizontal: wp(5),
    marginBottom: hp(3),
  },
  sectionTitle: {
    fontSize: hp(2.2),
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: hp(2),
  },
  snapshotSection: {
    marginHorizontal: wp(5),
    marginBottom: hp(3),
  },
  snapshotHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: wp(3),
    marginBottom: hp(1.5),
  },
  snapshotHeaderCopy: {
    flex: 1,
  },
  snapshotSubtitle: {
    marginTop: -hp(1.2),
    fontSize: hp(1.35),
    fontWeight: '600',
    color: colors.textSecondary,
    lineHeight: hp(1.9),
  },
  snapshotHeaderIcon: {
    width: Math.min(hp(5.2), wp(11.5)),
    height: Math.min(hp(5.2), wp(11.5)),
    borderRadius: Math.min(hp(2.6), wp(5.75)),
    backgroundColor: colors.primary + '14',
    alignItems: 'center',
    justifyContent: 'center',
  },
  snapshotEmpty: {
    marginTop: hp(0.4),
  },
  snapshotHeroGrid: {
    gap: hp(1.4),
    marginBottom: hp(1.4),
  },
  snapshotBmiCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: hp(1.6),
    padding: hp(1.6),
    borderWidth: 1,
    borderColor: colors.cardBorder || colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(3.2),
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  snapshotGoalCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: hp(1.6),
    padding: hp(1.8),
    borderWidth: 1,
    borderColor: colors.cardBorder || colors.border,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  snapshotGoalIcon: {
    width: Math.min(hp(4.8), wp(10.6)),
    height: Math.min(hp(4.8), wp(10.6)),
    borderRadius: Math.min(hp(2.4), wp(5.3)),
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: hp(1.2),
  },
  snapshotCardCopy: {
    flex: 1,
    minWidth: 0,
  },
  snapshotCardTitle: {
    fontSize: hp(1.45),
    fontWeight: '800',
    color: colors.textSecondary,
    marginBottom: hp(0.45),
  },
  snapshotCardValue: {
    fontSize: hp(1.95),
    fontWeight: '900',
    color: colors.textPrimary,
    marginBottom: hp(0.45),
  },
  snapshotGoalTitle: {
    fontSize: hp(2.15),
    fontWeight: '900',
    color: colors.textPrimary,
    lineHeight: hp(2.65),
    marginBottom: hp(0.5),
  },
  snapshotCardMeta: {
    fontSize: hp(1.32),
    fontWeight: '700',
    color: colors.textSecondary,
    lineHeight: hp(1.85),
  },
  snapshotMetricGrid: {
    flexDirection: 'row',
    gap: wp(2),
    marginBottom: hp(1.4),
  },
  snapshotMetricCard: {
    flex: 1,
    minHeight: hp(13.2),
    backgroundColor: colors.cardBackground,
    borderRadius: hp(1.5),
    padding: hp(1.25),
    borderWidth: 1,
    borderColor: colors.cardBorder || colors.border,
  },
  snapshotMetricIcon: {
    width: Math.min(hp(4), wp(8.8)),
    height: Math.min(hp(4), wp(8.8)),
    borderRadius: Math.min(hp(2), wp(4.4)),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: hp(0.85),
  },
  snapshotMetricValue: {
    fontSize: hp(1.9),
    fontWeight: '900',
    color: colors.textPrimary,
    marginBottom: hp(0.2),
  },
  snapshotMetricLabel: {
    fontSize: hp(1.22),
    fontWeight: '800',
    color: colors.textSecondary,
  },
  snapshotMetricDetail: {
    marginTop: hp(0.45),
    fontSize: hp(1.12),
    fontWeight: '700',
    color: colors.textTertiary || colors.textSecondary,
  },
  snapshotHistoryCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: hp(1.6),
    padding: hp(1.6),
    borderWidth: 1,
    borderColor: colors.cardBorder || colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(3),
  },
  snapshotHistoryIcon: {
    width: Math.min(hp(4.8), wp(10.6)),
    height: Math.min(hp(4.8), wp(10.6)),
    borderRadius: Math.min(hp(2.4), wp(5.3)),
    backgroundColor: colors.primary + '14',
    alignItems: 'center',
    justifyContent: 'center',
  },
  snapshotHistoryCopy: {
    flex: 1,
    minWidth: 0,
  },
  snapshotHistoryText: {
    fontSize: hp(1.45),
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: hp(0.35),
  },
  appointmentCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: hp(2),
    padding: hp(2),
    marginBottom: hp(1.5),
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  activeAppointmentCard: {
    backgroundColor: colors.primarySoft,
    borderLeftColor: colors.success,
  },
  appointmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: hp(1),
  },
  appointmentIcon: {
    width: hp(4),
    height: hp(4),
    borderRadius: hp(2),
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: wp(3),
  },
  appointmentInfo: {
    flex: 1,
  },
  appointmentTitle: {
    fontSize: hp(1.8),
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: hp(0.2),
  },
  appointmentSubtitle: {
    fontSize: hp(1.4),
    color: colors.textSecondary,
  },
  appointmentStatus: {
    backgroundColor: colors.primary,
    paddingHorizontal: wp(3),
    paddingVertical: hp(0.5),
    borderRadius: hp(1),
  },
  statusText: {
    fontSize: hp(1.2),
    fontWeight: 'bold',
    color: colors.textOnPrimary,
  },
  appointmentDetails: {
    marginLeft: hp(5),
  },
  doctorName: {
    fontSize: hp(1.6),
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: hp(0.2),
  },
  appointmentTime: {
    fontSize: hp(1.4),
    color: colors.textSecondary,
    marginBottom: hp(0.2),
  },
  appointmentSpecialty: {
    fontSize: hp(1.3),
    color: colors.primary,
    fontWeight: '500',
  },
  doctorAccessCard: {
    marginHorizontal: wp(5),
    marginBottom: hp(3),
    backgroundColor: colors.cardBackground,
    borderRadius: hp(1.8),
    paddingVertical: hp(1.8),
    paddingHorizontal: wp(4),
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.primary + '28',
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  doctorAccessIcon: {
    width: Math.min(hp(5.6), wp(12.5)),
    height: Math.min(hp(5.6), wp(12.5)),
    borderRadius: Math.min(hp(2.8), wp(6.25)),
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: wp(3.2),
  },
  doctorAccessCopy: {
    flex: 1,
    minWidth: 0,
  },
  doctorAccessTitle: {
    fontSize: hp(1.8),
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: hp(0.35),
  },
  doctorAccessSubtitle: {
    fontSize: hp(1.35),
    fontWeight: '600',
    color: colors.textSecondary,
    lineHeight: hp(1.9),
  },
  // Tab Navigation Styles
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: colors.cardBackground,
    marginHorizontal: wp(5),
    marginBottom: hp(2),
    borderRadius: hp(2),
    padding: hp(0.5),
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tab: {
    flex: 1,
    paddingVertical: hp(1.5),
    alignItems: 'center',
    borderRadius: hp(1.5),
  },
  activeTab: {
    backgroundColor: colors.primary,
  },
  tabText: {
    fontSize: hp(1.6),
    fontWeight: '600',
    color: colors.textSecondary,
  },
  activeTabText: {
    color: colors.textOnPrimary,
  },
  // Health Statistics Styles
  statsSection: {
    marginHorizontal: wp(5),
    marginBottom: hp(3),
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.cardBackground,
    borderRadius: hp(2),
    padding: hp(2),
    alignItems: 'center',
    marginHorizontal: wp(1),
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statNumber: {
    fontSize: hp(2.5),
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: hp(0.5),
  },
  statLabel: {
    fontSize: hp(1.4),
    color: colors.textSecondary,
    textAlign: 'center',
  },
  // Quick Actions Styles
  quickActionsSection: {
    marginHorizontal: wp(5),
    marginBottom: hp(3),
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingBottom: hp(2),
  },
  quickActionCard: {
    width: '48%',
    backgroundColor: colors.cardBackground,
    borderRadius: hp(2),
    padding: hp(2),
    marginBottom: hp(1.5),
    borderLeftWidth: 4,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  quickActionIcon: {
    marginBottom: hp(1),
  },
  quickActionTitle: {
    fontSize: hp(1.6),
    fontWeight: '600',
    color: colors.textPrimary,
  },
  // History Styles
  historySection: {
    marginHorizontal: wp(5),
    marginBottom: hp(0.5),
  },
  historyCategory: {
    marginBottom: hp(0.5),
  },
  historyCategoryTitle: {
    fontSize: hp(1.8),
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: hp(1.5),
  },
  historyCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: hp(2),
    padding: hp(2),
    marginBottom: hp(1.5),
    borderLeftWidth: 4,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  completedCard: {
    borderLeftWidth: 4,
    borderLeftColor: colors.success,
  },
  cancelledCard: {
    borderLeftWidth: 4,
    borderLeftColor: colors.error,
  },
  historyCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: hp(1),
  },
  historyIcon: {
    marginRight: wp(3),
  },
  historyInfo: {
    flex: 1,
  },
  historyTitle: {
    fontSize: hp(1.6),
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: hp(0.2),
  },
  historySubtitle: {
    fontSize: hp(1.4),
    color: colors.textSecondary,
  },
  historyDate: {
    fontSize: hp(1.3),
    color: colors.textTertiary,
  },
  historySpecialty: {
    fontSize: hp(1.3),
    color: colors.primary,
    fontWeight: '500',
  },
  historyMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  historyStatus: {
    fontSize: hp(1.25),
    fontWeight: '800',
  },
  inlineLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: hp(3),
  },
  inlineLoadingText: {
    marginLeft: wp(2),
    fontSize: hp(1.6),
    color: colors.textSecondary,
  },
  // Empty State Styles
  emptyState: {
    alignItems: 'center',
    paddingVertical: hp(4),
  },
  profileEmptyState: {
    marginTop: hp(1),
  },
  emptyStateIcon: {
    fontSize: hp(6),
    marginBottom: hp(2),
  },
  emptyStateTitle: {
    fontSize: hp(2),
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: hp(1),
  },
  emptyStateSubtitle: {
    fontSize: hp(1.6),
    color: colors.textSecondary,
    textAlign: 'center',
  },
  // Achievements Styles
  achievementsSection: {
    marginHorizontal: wp(5),
    marginBottom: hp(3),
  },
  achievementsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: wp(3),
    marginBottom: hp(1.6),
  },
  achievementsHeaderText: {
    flex: 1,
  },
  achievementSummaryText: {
    marginTop: hp(0.25),
    fontSize: hp(1.35),
    fontWeight: '700',
    color: colors.textSecondary,
  },
  achievementSummaryPill: {
    minHeight: hp(3.5),
    paddingHorizontal: wp(2.8),
    borderRadius: hp(2),
    backgroundColor: colors.primary + '14',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: wp(1),
  },
  achievementSummaryPillText: {
    fontSize: hp(1.35),
    fontWeight: '900',
    color: colors.primary,
  },
  achievementsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  achievementCard: {
    width: '48%',
    backgroundColor: colors.cardBackground,
    borderRadius: hp(1.4),
    padding: hp(1.55),
    marginBottom: hp(1.5),
    alignItems: 'flex-start',
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    position: 'relative',
    borderWidth: 1,
    minHeight: hp(22),
  },
  achievementEarned: {
    borderWidth: 1.5,
  },
  achievementLocked: {
    borderWidth: 1,
  },
  achievementIconWrap: {
    width: Math.min(hp(5.2), wp(11.5)),
    height: Math.min(hp(5.2), wp(11.5)),
    borderRadius: Math.min(hp(2.6), wp(5.75)),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: hp(1),
  },
  achievementTitle: {
    fontSize: hp(1.5),
    fontWeight: '800',
    textAlign: 'left',
    marginBottom: hp(0.5),
    lineHeight: hp(1.9),
  },
  achievementTitleEarned: {
    color: colors.textPrimary,
  },
  achievementTitleLocked: {
    color: colors.textSecondary,
  },
  achievementDescription: {
    fontSize: hp(1.2),
    color: colors.textSecondary,
    textAlign: 'left',
    lineHeight: hp(1.65),
    minHeight: hp(5),
  },
  achievementProgressTrack: {
    width: '100%',
    height: hp(0.65),
    borderRadius: hp(0.4),
    backgroundColor: colors.border,
    overflow: 'hidden',
    marginTop: 'auto',
  },
  achievementProgressFill: {
    height: '100%',
    borderRadius: hp(0.4),
  },
  achievementProgress: {
    marginTop: hp(0.75),
    fontSize: hp(1.2),
    fontWeight: '800',
  },
  achievementBadge: {
    position: 'absolute',
    top: hp(0.9),
    right: hp(0.9),
    borderRadius: hp(1.05),
    width: hp(2.1),
    height: hp(2.1),
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: wp(5),
  },
  profileModalContent: {
    width: '100%',
    backgroundColor: colors.cardBackground,
    borderRadius: hp(2),
    padding: hp(2.2),
  },
  healthRecordsModal: {
    width: '100%',
    maxHeight: '82%',
    backgroundColor: colors.cardBackground,
    borderRadius: hp(2),
    padding: hp(2.2),
  },
  weightLogModal: {
    width: '100%',
    backgroundColor: colors.cardBackground,
    borderRadius: hp(2),
    padding: hp(2.2),
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: hp(2),
  },
  modalTitle: {
    fontSize: hp(2.1),
    fontWeight: '800',
    color: colors.textPrimary,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: hp(1.1),
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  detailBlock: {
    paddingTop: hp(1.4),
  },
  detailLabel: {
    fontSize: hp(1.5),
    color: colors.textSecondary,
    fontWeight: '600',
  },
  detailValue: {
    flex: 1,
    marginLeft: wp(4),
    fontSize: hp(1.6),
    color: colors.textPrimary,
    fontWeight: '700',
    textAlign: 'right',
  },
  recordsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  recordCard: {
    width: '48%',
    backgroundColor: colors.primarySoft,
    borderRadius: hp(1.6),
    paddingVertical: hp(1.8),
    paddingHorizontal: wp(3),
    marginBottom: hp(1.4),
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  recordValue: {
    fontSize: hp(2.3),
    fontWeight: '800',
    color: colors.primary,
    marginBottom: hp(0.4),
  },
  recordLabel: {
    fontSize: hp(1.35),
    color: colors.textSecondary,
    textAlign: 'center',
  },
  recordActionButton: {
    minHeight: hp(5),
    borderRadius: hp(1.4),
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: wp(2),
    marginBottom: hp(1.5),
  },
  recordActionText: {
    fontSize: hp(1.55),
    fontWeight: '800',
    color: colors.textOnPrimary,
  },
  recordSummaryCard: {
    backgroundColor: colors.primarySoft,
    borderRadius: hp(1.6),
    padding: hp(2),
    marginTop: hp(0.5),
    borderWidth: 1,
    borderColor: colors.border,
  },
  recordSummaryTitle: {
    fontSize: hp(1.8),
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: hp(1),
  },
  recordSummaryText: {
    fontSize: hp(1.55),
    color: colors.textSecondary,
    marginBottom: hp(0.6),
  },
  weightLogLabel: {
    fontSize: hp(1.55),
    color: colors.textSecondary,
    fontWeight: '700',
    marginBottom: hp(0.8),
  },
  weightLogInput: {
    minHeight: hp(5.6),
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: hp(1.2),
    paddingHorizontal: wp(4),
    color: colors.textPrimary,
    fontSize: hp(2),
    fontWeight: '800',
    backgroundColor: colors.surface || colors.screenColor,
    marginBottom: hp(1.6),
  },
  weightLogButton: {
    minHeight: hp(5.2),
    borderRadius: hp(1.4),
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weightLogButtonDisabled: {
    opacity: 0.7,
  },
  weightLogButtonText: {
    color: colors.textOnPrimary,
    fontSize: hp(1.65),
    fontWeight: '900',
  },
});
