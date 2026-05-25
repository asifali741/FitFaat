import AppHeader from "@/components/AppHeader";
import StatusNoticeBanner from "@/components/common/StatusNoticeBanner";
import { theme } from "@/constants/theme";
import { useTheme } from '@/contexts/ThemeContext';
import { useDoctorRegistration } from "@/hooks/useDoctorRegistration";
import { authApi } from "@/utils/auth/authApi";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import { Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from "react-native-responsive-screen";
import { SafeAreaView } from "react-native-safe-area-context";

const DOCTOR_PORTAL_ANALYTICS_CACHE_KEY = 'doctorPortalAnalyticsAppointments';

const getPatientKey = (appointment: any) => (
  appointment?.patientId?._id ||
  appointment?.patientId ||
  appointment?.userId ||
  appointment?.userEmail ||
  appointment?.userName ||
  appointment?._id
);

const getDietPlanCount = (appointment: any) => {
  if (Array.isArray(appointment?.dietPlans)) return appointment.dietPlans.length;
  if (typeof appointment?.dietPlanCount === 'number') return appointment.dietPlanCount;
  if (appointment?.dietPlan || appointment?.hasDietPlan) return 1;
  return 0;
};

export default function DoctorPortal() {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const router = useRouter();
  const { getDoctorStatus } = useDoctorRegistration();
  const [doctorStatus, setDoctorStatus] = useState<string | null>(null);
  const [doctorName, setDoctorName] = useState<string | null>(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState(false);
  const [doctorAppointments, setDoctorAppointments] = useState<any[]>([]);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);
  const [usingCachedAnalytics, setUsingCachedAnalytics] = useState(false);

  const fetchDoctorAnalytics = useCallback(async (doctorId: string) => {
    setAnalyticsError(null);
    setUsingCachedAnalytics(false);
    try {
      const response = await authApi.getDoctorAppointments(doctorId);
      const appointmentList = response.success ? response.appointments || [] : [];
      setDoctorAppointments(appointmentList);
      await AsyncStorage.setItem(DOCTOR_PORTAL_ANALYTICS_CACHE_KEY, JSON.stringify(appointmentList));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to refresh doctor analytics';
      setAnalyticsError(message);
      try {
        const cached = await AsyncStorage.getItem(DOCTOR_PORTAL_ANALYTICS_CACHE_KEY);
        const parsed = cached ? JSON.parse(cached) : [];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setDoctorAppointments(parsed);
          setUsingCachedAnalytics(true);
        } else {
          setDoctorAppointments([]);
        }
      } catch {
        setDoctorAppointments([]);
      }
    }
  }, []);

  const fetchDoctorStatus = useCallback(async () => {
    setIsLoadingStatus(true);
    try {
      const response = await getDoctorStatus();
      setDoctorStatus(response.doctor?.status || null);
      setDoctorName(response.doctor?.name || null);
      const doctorId = response.doctor?.id || response.doctor?._id;
      if ((response.doctor?.status || null) === 'approved' && doctorId) {
        await fetchDoctorAnalytics(doctorId);
      } else {
        setDoctorAppointments([]);
        setAnalyticsError(null);
        setUsingCachedAnalytics(false);
      }
    } catch (error) {
      // Doctor status not found (first time user)
      setDoctorStatus(null);
      setDoctorName(null);
      setDoctorAppointments([]);
      setAnalyticsError(null);
      setUsingCachedAnalytics(false);
    } finally {
      setIsLoadingStatus(false);
    }
  }, [fetchDoctorAnalytics, getDoctorStatus]);

  useFocusEffect(
    useCallback(() => {
      fetchDoctorStatus();
    }, [fetchDoctorStatus])
  );

  const handleDoctorButtonPress = () => {
    if (doctorStatus === 'approved') {
      Alert.alert('Already Registered', 'You are already registered as a doctor!');
      return;
    }

    if (doctorStatus === 'pending') {
      Alert.alert('Application Pending', 'Your request is under process. We will let you know soon!');
      return;
    }

    if (doctorStatus === 'rejected') {
      Alert.alert('Application Rejected', 'Your application was rejected. You can submit a new application.');
      router.push('/(main)/(doctor-portal)/register-form');
      return;
    }

    // No previous application
    router.push('/(main)/(doctor-portal)/register-form');
  };

  const analytics = React.useMemo(() => {
    const patientCount = new Set(doctorAppointments.map(getPatientKey).filter(Boolean)).size;
    const pending = doctorAppointments.filter((appointment) => appointment.status === 'pending').length;
    const completed = doctorAppointments.filter((appointment) => appointment.status === 'completed').length;
    const confirmedOrCompleted = doctorAppointments.filter((appointment) => ['confirmed', 'completed'].includes(appointment.status));
    const respondedChats = confirmedOrCompleted.filter((appointment) => (
      appointment.lastMessageText ||
      appointment.lastMessageAt ||
      appointment.chatAccessGrantedAt
    )).length;
    const chatResponseRate = confirmedOrCompleted.length
      ? Math.round((respondedChats / confirmedOrCompleted.length) * 100)
      : 0;
    const dietPlansCreated = doctorAppointments.reduce((sum, appointment) => sum + getDietPlanCount(appointment), 0);

    return {
      patientCount,
      pending,
      completed,
      chatResponseRate,
      dietPlansCreated,
    };
  }, [doctorAppointments]);

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader
        title="Doctor Portal"
        showStepIndicator={false}
      />

      {/* Main Content */}
      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.welcomeSection}>
          <View style={styles.logoContainer}>
            <Image 
              source={require("../../../assets/images/logo.png")} 
              style={styles.logo}
            />
          </View>
          <Text style={styles.welcomeTitle}>Welcome to FitFaat Doctor Portal</Text>
          <Text style={styles.welcomeSubtitle}>
            Join our network of healthcare professionals and help patients achieve their fitness goals
          </Text>
        </View>

        {doctorStatus === 'approved' && (
          <View style={styles.analyticsSection}>
            <View style={styles.analyticsHeader}>
              <View>
                <Text style={styles.analyticsTitle}>Practice Analytics</Text>
                <Text style={styles.analyticsSubtitle}>A quick view of your patient workload.</Text>
              </View>
              <TouchableOpacity
                style={styles.analyticsRefresh}
                onPress={() => fetchDoctorStatus()}
                disabled={isLoadingStatus}
              >
                <Ionicons name="refresh" size={Math.min(hp(2.1), wp(4.8))} color={colors.primary} />
              </TouchableOpacity>
            </View>

            {analyticsError ? (
              <StatusNoticeBanner
                tone={usingCachedAnalytics ? 'cached' : 'offline'}
                title={usingCachedAnalytics ? 'Showing Cached Analytics' : 'Analytics Unavailable'}
                message={usingCachedAnalytics
                  ? 'Latest refresh failed, so this panel is using the last saved appointment data.'
                  : 'Check your connection and retry to refresh doctor analytics.'}
                actionLabel="Retry"
                onAction={fetchDoctorStatus}
                colors={colors}
                style={styles.analyticsNotice}
              />
            ) : null}

            <View style={styles.analyticsGrid}>
              {[
                { label: 'Patients', value: analytics.patientCount, icon: 'people-outline', color: colors.primary },
                { label: 'Pending', value: analytics.pending, icon: 'hourglass-outline', color: colors.warning || colors.primary },
                { label: 'Completed', value: analytics.completed, icon: 'checkmark-done-outline', color: colors.success },
                { label: 'Chat rate', value: `${analytics.chatResponseRate}%`, icon: 'chatbubble-ellipses-outline', color: colors.info || colors.secondary },
                { label: 'Diet plans', value: analytics.dietPlansCreated, icon: 'nutrition-outline', color: colors.secondary },
              ].map((item) => (
                <View key={item.label} style={styles.analyticsCard}>
                  <View style={[styles.analyticsIcon, { backgroundColor: `${item.color}18` }]}>
                    <Ionicons name={item.icon as any} size={Math.min(hp(2.4), wp(5.3))} color={item.color} />
                  </View>
                  <Text style={styles.analyticsValue}>{item.value}</Text>
                  <Text style={styles.analyticsLabel}>{item.label}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Features Grid */}
        <View style={styles.featuresContainer}>
          <TouchableOpacity 
            style={[styles.featureCard, doctorStatus !== 'approved' && styles.featureCardDisabled]}
            disabled={doctorStatus !== 'approved'}
            activeOpacity={doctorStatus === 'approved' ? 0.8 : 1}
          >
            <LinearGradient
              colors={doctorStatus === 'approved' ? [colors.primary + '15', colors.accent + '10'] : ['#F1F5F9', '#F1F5F9']}
              style={styles.featureIconContainer}
            >
              <Ionicons 
                name="videocam" 
                size={32} 
                color={doctorStatus === 'approved' ? colors.primary : colors.textSecondary} 
              />
            </LinearGradient>
            <Text style={[styles.featureTitle, doctorStatus !== 'approved' && styles.featureTitleDisabled]}>
              Video Consultations
            </Text>
            <Text style={[styles.featureDescription, doctorStatus !== 'approved' && styles.featureDescriptionDisabled]}>
              Connect with patients via secure video calls
            </Text>
            {doctorStatus !== 'approved' && (
              <View style={styles.lockBadge}>
                <Ionicons name="lock-closed" size={16} color={colors.textSecondary} />
                <Text style={styles.lockText}>Locked</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.featureCard, doctorStatus !== 'approved' && styles.featureCardDisabled]}
            disabled={doctorStatus !== 'approved'}
            onPress={() => doctorStatus === 'approved' && router.push('/(main)/(doctor-portal)/all-chats')}
            activeOpacity={doctorStatus === 'approved' ? 0.8 : 1}
          >
            <LinearGradient
              colors={doctorStatus === 'approved' ? [colors.secondary + '15', colors.success + '10'] : ['#F1F5F9', '#F1F5F9']}
              style={styles.featureIconContainer}
            >
              <Ionicons 
                name="chatbubbles" 
                size={32} 
                color={doctorStatus === 'approved' ? colors.secondary : colors.textSecondary} 
              />
            </LinearGradient>
            <Text style={[styles.featureTitle, doctorStatus !== 'approved' && styles.featureTitleDisabled]}>
              All Chats
            </Text>
            <Text style={[styles.featureDescription, doctorStatus !== 'approved' && styles.featureDescriptionDisabled]}>
              Manage patient conversations
            </Text>
            {doctorStatus !== 'approved' && (
              <View style={styles.lockBadge}>
                <Ionicons name="lock-closed" size={16} color={colors.textSecondary} />
                <Text style={styles.lockText}>Locked</Text>
              </View>
            )}
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.featureCard, doctorStatus !== 'approved' && styles.featureCardDisabled]}
            onPress={() => doctorStatus === 'approved' && router.push('/(main)/(doctor-portal)/patient-management')}
            disabled={doctorStatus !== 'approved'}
            activeOpacity={doctorStatus === 'approved' ? 0.8 : 1}
          >
            <LinearGradient
              colors={doctorStatus === 'approved' ? [colors.accent + '15', colors.primary + '10'] : ['#F1F5F9', '#F1F5F9']}
              style={styles.featureIconContainer}
            >
              <Ionicons 
                name="people" 
                size={32} 
                color={doctorStatus === 'approved' ? colors.accent : colors.textSecondary} 
              />
            </LinearGradient>
            <Text style={[styles.featureTitle, doctorStatus !== 'approved' && styles.featureTitleDisabled]}>
              Appointments
            </Text>
            <Text style={[styles.featureDescription, doctorStatus !== 'approved' && styles.featureDescriptionDisabled]}>
              Manage patient appointments
            </Text>
            {doctorStatus === 'approved' ? (
              <View style={styles.newBadge}>
                <Text style={styles.newBadgeText}>New</Text>
              </View>
            ) : (
              <View style={styles.lockBadge}>
                <Ionicons name="lock-closed" size={16} color={colors.textSecondary} />
                <Text style={styles.lockText}>Locked</Text>
              </View>
            )}
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.featureCard, doctorStatus !== 'approved' && styles.featureCardDisabled]}
            disabled={doctorStatus !== 'approved'}
            activeOpacity={doctorStatus === 'approved' ? 0.8 : 1}
          >
            <LinearGradient
              colors={doctorStatus === 'approved' ? [colors.secondary + '15', colors.success + '10'] : ['#F1F5F9', '#F1F5F9']}
              style={styles.featureIconContainer}
            >
              <Ionicons 
                name="nutrition" 
                size={32} 
                color={doctorStatus === 'approved' ? colors.secondary : colors.textSecondary} 
              />
            </LinearGradient>
            <Text style={[styles.featureTitle, doctorStatus !== 'approved' && styles.featureTitleDisabled]}>
              Diet Plans
            </Text>
            <Text style={[styles.featureDescription, doctorStatus !== 'approved' && styles.featureDescriptionDisabled]}>
              Create personalized diet plans
            </Text>
            {doctorStatus !== 'approved' && (
              <View style={styles.lockBadge}>
                <Ionicons name="lock-closed" size={16} color={colors.textSecondary} />
                <Text style={styles.lockText}>Locked</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Action Button */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={styles.gradientButtonContainer}
            onPress={handleDoctorButtonPress}
            activeOpacity={0.8}
            disabled={isLoadingStatus}
          >
            <LinearGradient
              colors={[colors.primary, colors.secondary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.gradientButton}
            >
              <Ionicons 
                name={doctorStatus === 'approved' ? "checkmark-circle" : "add-circle"} 
                size={24} 
                color={colors.surface} 
                style={styles.buttonIcon}
              />
              <Text style={styles.gradientButtonText}>
                {isLoadingStatus ? 'Loading...' : doctorStatus === 'approved' && doctorName ? `Welcome Dr. ${doctorName}` : 'Join as Doctor'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
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
  },
  scrollContent: {
    paddingTop: hp(3),
    paddingHorizontal: wp(5),
    paddingBottom: hp(12),
  },
  welcomeSection: {
    alignItems: "center",
    marginBottom: hp(3),
    marginTop: hp(2),
  },
  logoContainer: {
    width: hp(12),
    height: hp(12),
    borderRadius: hp(6),
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: hp(2),
    ...theme.shadows.medium,
    borderWidth: 3,
    borderColor: colors.primary + '20',
  },
  logo: {
    width: hp(9),
    height: hp(9),
    resizeMode: 'contain',
  },
  analyticsSection: {
    marginBottom: hp(3),
    backgroundColor: colors.cardBackground,
    borderRadius: hp(1.8),
    borderWidth: 1,
    borderColor: colors.cardBorder || colors.border,
    padding: hp(1.6),
    ...theme.shadows.small,
  },
  analyticsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: hp(1.4),
  },
  analyticsTitle: {
    color: colors.textPrimary,
    fontSize: Math.min(hp(2.1), wp(4.8)),
    fontWeight: '900',
  },
  analyticsSubtitle: {
    marginTop: hp(0.3),
    color: colors.textSecondary,
    fontSize: Math.min(hp(1.3), wp(3)),
    fontWeight: '700',
  },
  analyticsRefresh: {
    width: hp(4.4),
    height: hp(4.4),
    borderRadius: hp(2.2),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
  },
  analyticsNotice: {
    marginBottom: hp(1.2),
  },
  analyticsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: wp(2),
  },
  analyticsCard: {
    width: '31.8%',
    minHeight: hp(11.2),
    borderRadius: hp(1.4),
    backgroundColor: colors.screenColor,
    borderWidth: 1,
    borderColor: colors.cardBorder || colors.border,
    padding: hp(1.1),
    justifyContent: 'center',
  },
  analyticsIcon: {
    width: Math.min(hp(3.8), wp(8.4)),
    height: Math.min(hp(3.8), wp(8.4)),
    borderRadius: Math.min(hp(1.9), wp(4.2)),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: hp(0.8),
  },
  analyticsValue: {
    color: colors.textPrimary,
    fontSize: Math.min(hp(2.1), wp(4.8)),
    fontWeight: '900',
  },
  analyticsLabel: {
    marginTop: hp(0.25),
    color: colors.textSecondary,
    fontSize: Math.min(hp(1.15), wp(2.7)),
    fontWeight: '800',
  },
  welcomeTitle: {
    fontSize: Math.min(hp(3), wp(7.5)),
    fontWeight: "800",
    color: colors.textPrimary,
    textAlign: "center",
    marginBottom: hp(1),
    paddingHorizontal: wp(4),
    letterSpacing: -0.5,
  },
  welcomeSubtitle: {
    fontSize: Math.min(hp(1.9), wp(4.8)),
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: Math.min(hp(2.8), wp(7)),
    paddingHorizontal: wp(8),
    fontWeight: '500',
  },
  featuresContainer: {
    marginBottom: hp(4),
    gap: hp(2),
  },
  featureCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: wp(5),
    marginBottom: hp(1.5),
    ...theme.shadows.medium,
    borderWidth: 1.5,
    borderColor: colors.border,
    minHeight: hp(14),
    justifyContent: 'space-between',
  },
  featureCardDisabled: {
    opacity: 0.7,
    backgroundColor: colors.offWhite,
  },
  featureIconContainer: {
    width: hp(7),
    height: hp(7),
    borderRadius: hp(3.5),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: hp(1.5),
    ...theme.shadows.small,
  },
  featureTitle: {
    fontSize: hp(2.2),
    color: colors.textPrimary,
    fontWeight: "700",
    marginBottom: hp(0.5),
    letterSpacing: 0.2,
  },
  featureTitleDisabled: {
    color: colors.textSecondary,
  },
  featureDescription: {
    fontSize: hp(1.7),
    color: colors.textSecondary,
    fontWeight: "400",
    lineHeight: hp(2.4),
  },
  featureDescriptionDisabled: {
    color: colors.textTertiary,
  },
  lockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginTop: hp(1),
    paddingHorizontal: wp(3),
    paddingVertical: hp(0.5),
    backgroundColor: colors.offWhite,
    borderRadius: 12,
    gap: wp(1.5),
  },
  lockText: {
    fontSize: hp(1.4),
    color: colors.textSecondary,
    fontWeight: '600',
  },
  newBadge: {
    alignSelf: 'flex-start',
    marginTop: hp(1),
    paddingHorizontal: wp(3.5),
    paddingVertical: hp(0.6),
    backgroundColor: colors.primary,
    borderRadius: 12,
  },
  newBadgeText: {
    color: colors.surface,
    fontSize: hp(1.4),
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  buttonContainer: {
    marginTop: hp(2),
    marginBottom: hp(2),
  },
  gradientButtonContainer: {
    borderRadius: 18,
    overflow: "hidden",
    marginBottom: hp(2),
    ...theme.shadows.large,
  },
  gradientButton: {
    paddingVertical: hp(2.2),
    paddingHorizontal: wp(8),
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: 'row',
    gap: wp(2),
  },
  buttonIcon: {
    marginRight: wp(1),
  },
  gradientButtonText: {
    color: colors.surface,
    fontSize: hp(2.2),
    fontWeight: "700",
    letterSpacing: 0.3,
  },
});
