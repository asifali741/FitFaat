import AppHeader from "@/components/AppHeader";
import { ScreenSceneWrapper } from "@/components/common/ScreenTiltAnimation";
import { authApi } from "@/utils/auth/authApi";
import { tokenStorage } from "@/utils/auth/tokenStorage";
import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import { useRouter, useFocusEffect } from "expo-router";
import * as SecureStore from 'expo-secure-store';
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Image, Modal, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import {
    heightPercentageToDP as hp,
    widthPercentageToDP as wp,
} from "react-native-responsive-screen";
import { SafeAreaView } from "react-native-safe-area-context";
import { theme } from "@/constants/theme";
import { useTheme } from "@/contexts/ThemeContext";
import { getBackendBaseUrl } from '@/utils/config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { streakApi } from '@/utils/streakApi';
import { exerciseApi } from '@/utils/exerciseApi';
import { dailyLogsApi } from '@/utils/dailyLogsApi';

const ENV = Constants.expoConfig?.extra;

const getAPIURL = () => {
  const envUrl = ENV?.EXPO_PUBLIC_BACKEND_API_URL;
  if (envUrl) {
    return envUrl.replace(/\/api\/?$/, '');
  }
  return getBackendBaseUrl();
};

const API_URL = getAPIURL();

const getStoredDisplayName = (storedUser: any) => (
  storedUser?.userInfo?.name ||
  storedUser?.username ||
  storedUser?.name ||
  storedUser?.fullName ||
  storedUser?.email?.split('@')?.[0] ||
  'User'
);

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

type ProfileAchievement = {
  id: string;
  title: string;
  iconName: string;
  description: string;
  earned: boolean;
  progress: string;
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

const getHealthDays = (payload: any): any[] => {
  const source = payload?.data || payload;
  if (!source) return [];
  if (Array.isArray(source)) return source;
  if (Array.isArray(source.dailyLogs)) return source.dailyLogs;

  return Object.values(source).filter((entry: any) => entry && typeof entry === 'object');
};

const buildHealthRecordSummary = (payload: any, userData: any): HealthRecordSummary => {
  const days = getHealthDays(payload);
  const userInfo = userData?.userInfo || userData || {};

  return {
    height: readNumber(userInfo.height),
    weight: readNumber(userInfo.weight),
    goalCalories: readNumber(userInfo.goalCalories, userInfo.targetCalories),
    hydrationGoal: readNumber(userInfo.hydrationGoal, userInfo.targetHydration),
    completedDays: days.filter((day: any) => ['finished', 'completed'].includes(day?.status)).length,
    activeDays: days.filter((day: any) => day?.status === 'active').length,
    totalCalories: days.reduce((sum, day: any) => sum + readNumber(day?.achievedCalories, day?.achieviedCalories), 0),
    targetCalories: days.reduce((sum, day: any) => sum + readNumber(day?.targetCalories), 0),
    totalHydration: days.reduce((sum, day: any) => sum + readNumber(day?.achievedHydration, day?.achieviedHydration), 0),
    targetHydration: days.reduce((sum, day: any) => sum + readNumber(day?.targetHydration), 0),
    days,
  };
};

const buildAchievements = ({
  appointments,
  workoutsCount,
  favoritesCount,
  daysActive,
  healthScore,
  healthRecords,
}: {
  appointments: any[];
  workoutsCount: number;
  favoritesCount: number;
  daysActive: number;
  healthScore: number;
  healthRecords: HealthRecordSummary | null;
}): ProfileAchievement[] => {
  const completedCount = appointments.filter(appointment => normalizeStatus(appointment.status) === 'completed').length;
  const totalAppointments = appointments.length;
  const completedHealthDays = healthRecords?.completedDays || 0;

  const targets = [
    {
      id: 'first-consultation',
      title: 'First Consultation',
      iconName: 'medkit',
      description: 'Complete your first doctor consultation',
      current: completedCount,
      target: 1,
    },
    {
      id: 'health-explorer',
      title: 'Health Explorer',
      iconName: 'search',
      description: 'Book 5 appointments',
      current: totalAppointments,
      target: 5,
    },
    {
      id: 'workout-starter',
      title: 'Workout Starter',
      iconName: 'barbell',
      description: 'Complete your first workout',
      current: workoutsCount,
      target: 1,
    },
    {
      id: 'streak-builder',
      title: 'Streak Builder',
      iconName: 'flame',
      description: 'Stay active for 7 days',
      current: daysActive,
      target: 7,
    },
    {
      id: 'collector',
      title: 'Exercise Collector',
      iconName: 'heart',
      description: 'Save 5 favorite exercises',
      current: favoritesCount,
      target: 5,
    },
    {
      id: 'health-score',
      title: 'Health Score 80',
      iconName: 'pulse',
      description: 'Reach an 80% health score',
      current: healthScore,
      target: 80,
    },
    {
      id: 'weekly-tracker',
      title: 'Weekly Tracker',
      iconName: 'calendar',
      description: 'Complete 3 daily health logs',
      current: completedHealthDays,
      target: 3,
    },
  ];

  return targets.map(item => ({
    id: item.id,
    title: item.title,
    iconName: item.iconName,
    description: item.description,
    earned: item.current >= item.target,
    progress: `${Math.min(item.current, item.target)}/${item.target}`,
  }));
};

export default function ProfileScreen() {
  const { colors, isDarkMode } = useTheme();
  const styles = getStyles(colors);
  const router = useRouter();
  const [selectedTab, setSelectedTab] = useState('overview');
  const [user, setUser] = useState<any>(null);
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);
  const [workoutsCount, setWorkoutsCount] = useState(0);
  const [favoritesCount, setFavoritesCount] = useState(0);
  const [daysActive, setDaysActive] = useState(0);
  const [healthScore, setHealthScore] = useState(85);
  const [profileAppointments, setProfileAppointments] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [selectedHistoryAppointment, setSelectedHistoryAppointment] = useState<any>(null);
  const [showHealthRecords, setShowHealthRecords] = useState(false);
  const [healthRecords, setHealthRecords] = useState<HealthRecordSummary | null>(null);
  const [healthRecordsLoading, setHealthRecordsLoading] = useState(false);
  const displayName = getStoredDisplayName(user);
  const displayEmail = user?.email || 'user@example.com';
  const displayImageUrl = profileImageUrl;

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await tokenStorage.getUser();
        setUser(userData);
        
        // Fetch profile image from backend
        const token = await SecureStore.getItemAsync('fitfaat_auth_token');
        if (token) {
          try {
            const response = await fetch(`${API_URL}/api/user/profile-picture`, {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
            });

            const data = await response.json();
            if (data.success && data.data.imageUrl) {
              setProfileImageUrl(`${API_URL}${data.data.imageUrl}`);
            }
          } catch {
            console.log('No profile picture found, using default');
          }
        }
      } catch (error) {
        console.error('Error loading user:', error);
      }
    };
    loadUser();
  }, []);

  // Update stats when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      let isActive = true;

      const loadHealthRecords = async (userData: any) => {
        setHealthRecordsLoading(true);
        try {
          const storedRecords = await AsyncStorage.getItem('JsonResponse');
          if (storedRecords) {
            const parsedRecords = JSON.parse(storedRecords);
            if (isActive) {
              setHealthRecords(buildHealthRecordSummary(parsedRecords, userData));
            }
            return;
          }

          const weeklyTrackingId = await AsyncStorage.getItem('weeklyTrackingId') || userData?.weeklyTrackingId;
          if (weeklyTrackingId) {
            const progress = await dailyLogsApi.getWeeklyProgress(weeklyTrackingId);
            if (isActive) {
              setHealthRecords(buildHealthRecordSummary(progress, userData));
            }
            return;
          }

          if (isActive) {
            setHealthRecords(buildHealthRecordSummary(null, userData));
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
          const userData = await tokenStorage.getUser();
          if (!userData || !userData.id) return;
          setUser(userData);

          setHistoryLoading(true);
          try {
            const appointmentsResponse = await authApi.getUserAppointments();
            if (isActive) {
              const appointmentList = Array.isArray(appointmentsResponse)
                ? appointmentsResponse
                : appointmentsResponse?.appointments || appointmentsResponse?.data?.appointments || [];
              setProfileAppointments(appointmentList);
            }
          } catch (error) {
            console.log('Error fetching profile appointments:', error);
            if (isActive) {
              setProfileAppointments([]);
            }
          } finally {
            if (isActive) {
              setHistoryLoading(false);
            }
          }

          // 1. Fetch Favorites count
          const favorites = await AsyncStorage.getItem('favoriteExercises');
          if (favorites && isActive) {
            setFavoritesCount(JSON.parse(favorites).length);
          } else if (isActive) {
            setFavoritesCount(0);
          }

          // 2. Fetch Streak / Days Active
          try {
            const streakData = await streakApi.getUserStreak(userData.id);
            if (streakData && isActive) {
              setDaysActive(streakData.streakCount || 0);
              // Calculate health score: base 70 + streak bonus (up to 30)
              const score = Math.min(70 + (streakData.streakCount * 2), 100);
              setHealthScore(score);
            }
          } catch (e) {
            console.log('Error fetching streak:', e);
          }

          // 3. Fetch Workouts count
          try {
            const stats = await exerciseApi.getExerciseStats(userData.id);
            if (stats && stats.success && isActive) {
              setWorkoutsCount(stats.data.totalExercises || 0);
            }
          } catch (e) {
            console.log('Error fetching exercise stats:', e);
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
  const completedAppointments = profileAppointments.filter(apt => normalizeStatus(apt.status) === 'completed');
  const historyAppointments = [...profileAppointments].sort((a, b) => {
    const dateA = getAppointmentDate(a)?.getTime() || 0;
    const dateB = getAppointmentDate(b)?.getTime() || 0;
    return dateB - dateA;
  });
  const upcomingAppointments = profileAppointments
    .filter(apt => {
      const date = getAppointmentDate(apt);
      return date && date > new Date() && !['cancelled', 'completed'].includes(normalizeStatus(apt.status));
    })
    .slice(0, 3);
  const activeAppointments = profileAppointments
    .filter(apt => normalizeStatus(apt.status) === 'confirmed')
    .slice(0, 2);
  

  const achievements = buildAchievements({
    appointments: profileAppointments,
    workoutsCount,
    favoritesCount,
    daysActive,
    healthScore,
    healthRecords,
  });

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

  const quickActions = [
    { title: "Book Appointment", iconName: "calendar", color: colors.primary, action: () => router.push('/(main)/(conference)') },
    { title: "Chat History", iconName: "chatbubbles", color: colors.info, action: () => router.push('/(main)/(chatbot)/chat-history') },
    { title: "Health Records", iconName: "clipboard", color: colors.secondary, action: () => setShowHealthRecords(true) },
    { title: "Emergency Contact", iconName: "alert-circle", color: colors.error, action: () => console.log("Emergency Contact") },
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
            <Image 
              source={
                displayImageUrl
                  ? { uri: displayImageUrl }
                  : require("../../assets/images/Default_Profile.png")
              }
              style={{
                width: hp(12),
                height: hp(12),
                borderRadius: hp(6),
              }}
            />
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

        {/* Profile Stats */}
        <View style={{
          flexDirection: 'row',
          justifyContent: 'space-around',
          marginHorizontal: wp(8),
          marginBottom: hp(4),
        }}>
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: hp(2.5), fontWeight: 'bold', color: colors.error }}>{workoutsCount}</Text>
            <Text style={{ fontSize: hp(1.6), color: colors.textSecondary }}>Workouts</Text>
          </View>
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: hp(2.5), fontWeight: 'bold', color: colors.error }}>{favoritesCount}</Text>
            <Text style={{ fontSize: hp(1.6), color: colors.textSecondary }}>Favorites</Text>
          </View>
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: hp(2.5), fontWeight: 'bold', color: colors.error }}>{daysActive}</Text>
            <Text style={{ fontSize: hp(1.6), color: colors.textSecondary }}>Days Active</Text>
          </View>
        </View>

        {/* Tab Navigation */}
        <View style={styles.tabContainer}>
          <TouchableOpacity 
            style={[styles.tab, selectedTab === 'overview' && styles.activeTab]}
            onPress={() => setSelectedTab('overview')}
          >
            <Text style={[styles.tabText, selectedTab === 'overview' && styles.activeTabText]}>Overview</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, selectedTab === 'history' && styles.activeTab]}
            onPress={() => setSelectedTab('history')}
          >
            <Text style={[styles.tabText, selectedTab === 'history' && styles.activeTabText]}>History</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, selectedTab === 'achievements' && styles.activeTab]}
            onPress={() => setSelectedTab('achievements')}
          >
            <Text style={[styles.tabText, selectedTab === 'achievements' && styles.activeTabText]}>Achievements</Text>
          </TouchableOpacity>
        </View>

        {/* Content based on selected tab */}
        {selectedTab === 'overview' && (
          <>
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
                  <TouchableOpacity
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
                  </TouchableOpacity>
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
                    <TouchableOpacity
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
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {!historyLoading && historyAppointments.length === 0 && (
              <View style={styles.emptyState}>
                <Ionicons name="document-text-outline" size={48} color={colors.textTertiary} />
                <Text style={styles.emptyStateTitle}>No History Yet</Text>
                <Text style={styles.emptyStateSubtitle}>Your appointment history will appear here</Text>
              </View>
            )}
          </View>
        )}

        {selectedTab === 'achievements' && (
          <View style={styles.achievementsSection}>
            <Text style={styles.sectionTitle}>Achievements & Badges</Text>
            <View style={styles.achievementsGrid}>
              {achievements.map((achievement) => (
                <View
                  key={achievement.id}
                  style={[
                    styles.achievementCard,
                    achievement.earned ? styles.achievementEarned : styles.achievementLocked
                  ]}
                >
                  <Ionicons
                    name={achievement.iconName as any}
                    size={Math.min(hp(4), wp(8.5))}
                    color={achievement.earned ? colors.success : colors.textTertiary}
                    style={styles.achievementIcon}
                  />
                  <Text style={[
                    styles.achievementTitle,
                    achievement.earned ? styles.achievementTitleEarned : styles.achievementTitleLocked
                  ]}>
                    {achievement.title}
                  </Text>
                  <Text style={styles.achievementDescription}>{achievement.description}</Text>
                  <Text style={styles.achievementProgress}>{achievement.progress}</Text>
                  {achievement.earned && (
                    <View style={styles.achievementBadge}>
                      <Ionicons name="checkmark" size={16} color={colors.textOnPrimary} />
                    </View>
                  )}
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Appointments Section */}
        {(upcomingAppointments.length > 0 || activeAppointments.length > 0) && (
          <View style={styles.appointmentsSection}>
            <Text style={styles.sectionTitle}>My Appointments</Text>
            
            {/* Active Appointments */}
            {activeAppointments.map((appointment) => (
              <TouchableOpacity
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
              </TouchableOpacity>
            ))}

            {/* Upcoming Appointments */}
            {upcomingAppointments.map((appointment) => (
              <TouchableOpacity
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
              </TouchableOpacity>
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
                    <Text style={styles.recordValue}>{healthRecords?.weight || '--'}</Text>
                    <Text style={styles.recordLabel}>Weight kg</Text>
                  </View>
                  <View style={styles.recordCard}>
                    <Text style={styles.recordValue}>{healthRecords?.height || '--'}</Text>
                    <Text style={styles.recordLabel}>Height cm</Text>
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
                  <View style={styles.emptyState}>
                    <Ionicons name="document-text-outline" size={48} color={colors.textTertiary} />
                    <Text style={styles.emptyStateTitle}>No Health Records Yet</Text>
                    <Text style={styles.emptyStateSubtitle}>Your daily tracking records will appear here</Text>
                  </View>
                )}
              </ScrollView>
            )}
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
    marginBottom: hp(3),
  },
  historyCategory: {
    marginBottom: hp(3),
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
  achievementsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  achievementCard: {
    width: '48%',
    backgroundColor: colors.cardBackground,
    borderRadius: hp(2),
    padding: hp(2),
    marginBottom: hp(1.5),
    alignItems: 'center',
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    position: 'relative',
  },
  achievementEarned: {
    borderWidth: 2,
    borderColor: colors.success,
  },
  achievementLocked: {
    opacity: 0.6,
  },
  achievementIcon: {
    marginBottom: hp(1),
  },
  achievementTitle: {
    fontSize: hp(1.6),
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: hp(0.5),
  },
  achievementTitleEarned: {
    color: colors.textPrimary,
  },
  achievementTitleLocked: {
    color: colors.textTertiary,
  },
  achievementDescription: {
    fontSize: hp(1.3),
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: hp(1.8),
  },
  achievementProgress: {
    marginTop: hp(1),
    fontSize: hp(1.3),
    fontWeight: '700',
    color: colors.primary,
  },
  achievementBadge: {
    position: 'absolute',
    top: hp(1),
    right: hp(1),
    backgroundColor: colors.success,
    borderRadius: hp(1),
    width: hp(2),
    height: hp(2),
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
    backgroundColor: colors.background,
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
  recordSummaryCard: {
    backgroundColor: colors.background,
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
});
