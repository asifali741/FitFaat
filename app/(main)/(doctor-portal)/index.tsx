import AppHeader from "@/components/AppHeader";
import { theme } from "@/constants/theme";
import { useDoctorRegistration } from "@/hooks/useDoctorRegistration";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import { Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from "react-native-responsive-screen";
import { SafeAreaView } from "react-native-safe-area-context";

export default function DoctorPortal() {
  const router = useRouter();
  const { getDoctorStatus } = useDoctorRegistration();
  const [doctorStatus, setDoctorStatus] = useState<string | null>(null);
  const [doctorName, setDoctorName] = useState<string | null>(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState(false);

  useFocusEffect(
    useCallback(() => {
      fetchDoctorStatus();
    }, [])
  );

  const fetchDoctorStatus = async () => {
    setIsLoadingStatus(true);
    try {
      const response = await getDoctorStatus();
      setDoctorStatus(response.doctor?.status || null);
      setDoctorName(response.doctor?.name || null);
    } catch (error) {
      // Doctor status not found (first time user)
      setDoctorStatus(null);
      setDoctorName(null);
    } finally {
      setIsLoadingStatus(false);
    }
  };

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

  return (
    <SafeAreaView style={styles.container}>
      {/* Professional Header with Gradient */}
      <LinearGradient
        colors={[theme.colors.primary, theme.colors.accent]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <AppHeader 
          title="Doctor Portal"
          showStepIndicator={false}
        />
      </LinearGradient>

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

        {/* Features Grid */}
        <View style={styles.featuresContainer}>
          <TouchableOpacity 
            style={[styles.featureCard, doctorStatus !== 'approved' && styles.featureCardDisabled]}
            disabled={doctorStatus !== 'approved'}
            activeOpacity={doctorStatus === 'approved' ? 0.8 : 1}
          >
            <LinearGradient
              colors={doctorStatus === 'approved' ? [theme.colors.primary + '15', theme.colors.accent + '10'] : ['#F1F5F9', '#F1F5F9']}
              style={styles.featureIconContainer}
            >
              <Ionicons 
                name="videocam" 
                size={32} 
                color={doctorStatus === 'approved' ? theme.colors.primary : theme.colors.textSecondary} 
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
                <Ionicons name="lock-closed" size={16} color={theme.colors.textSecondary} />
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
              colors={doctorStatus === 'approved' ? [theme.colors.secondary + '15', theme.colors.success + '10'] : ['#F1F5F9', '#F1F5F9']}
              style={styles.featureIconContainer}
            >
              <Ionicons 
                name="chatbubbles" 
                size={32} 
                color={doctorStatus === 'approved' ? theme.colors.secondary : theme.colors.textSecondary} 
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
                <Ionicons name="lock-closed" size={16} color={theme.colors.textSecondary} />
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
              colors={doctorStatus === 'approved' ? [theme.colors.accent + '15', theme.colors.primary + '10'] : ['#F1F5F9', '#F1F5F9']}
              style={styles.featureIconContainer}
            >
              <Ionicons 
                name="people" 
                size={32} 
                color={doctorStatus === 'approved' ? theme.colors.accent : theme.colors.textSecondary} 
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
                <Ionicons name="lock-closed" size={16} color={theme.colors.textSecondary} />
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
              colors={doctorStatus === 'approved' ? [theme.colors.secondary + '15', theme.colors.success + '10'] : ['#F1F5F9', '#F1F5F9']}
              style={styles.featureIconContainer}
            >
              <Ionicons 
                name="nutrition" 
                size={32} 
                color={doctorStatus === 'approved' ? theme.colors.secondary : theme.colors.textSecondary} 
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
                <Ionicons name="lock-closed" size={16} color={theme.colors.textSecondary} />
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
              colors={[theme.colors.primary, theme.colors.secondary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.gradientButton}
            >
              <Ionicons 
                name={doctorStatus === 'approved' ? "checkmark-circle" : "add-circle"} 
                size={24} 
                color={theme.colors.surface} 
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.screenColor,
  },
  headerGradient: {
    paddingBottom: hp(2),
  },
  content: {
    flex: 1,
    backgroundColor: theme.colors.screenColor,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    marginTop: -20,
    ...theme.shadows.large,
  },
  scrollContent: {
    paddingTop: hp(3),
    paddingHorizontal: wp(5),
    paddingBottom: hp(12),
  },
  welcomeSection: {
    alignItems: "center",
    marginBottom: hp(5),
    marginTop: hp(2),
  },
  logoContainer: {
    width: hp(12),
    height: hp(12),
    borderRadius: hp(6),
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: hp(2),
    ...theme.shadows.medium,
    borderWidth: 3,
    borderColor: theme.colors.primary + '20',
  },
  logo: {
    width: hp(9),
    height: hp(9),
    resizeMode: 'contain',
  },
  welcomeTitle: {
    fontSize: Math.min(hp(3), wp(7.5)),
    fontWeight: "800",
    color: theme.colors.textPrimary,
    textAlign: "center",
    marginBottom: hp(1),
    paddingHorizontal: wp(4),
    letterSpacing: -0.5,
  },
  welcomeSubtitle: {
    fontSize: Math.min(hp(1.9), wp(4.8)),
    color: theme.colors.textSecondary,
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
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    padding: wp(5),
    marginBottom: hp(1.5),
    ...theme.shadows.medium,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    minHeight: hp(14),
    justifyContent: 'space-between',
  },
  featureCardDisabled: {
    opacity: 0.7,
    backgroundColor: theme.colors.offWhite,
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
    color: theme.colors.textPrimary,
    fontWeight: "700",
    marginBottom: hp(0.5),
    letterSpacing: 0.2,
  },
  featureTitleDisabled: {
    color: theme.colors.textSecondary,
  },
  featureDescription: {
    fontSize: hp(1.7),
    color: theme.colors.textSecondary,
    fontWeight: "400",
    lineHeight: hp(2.4),
  },
  featureDescriptionDisabled: {
    color: theme.colors.textTertiary,
  },
  lockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginTop: hp(1),
    paddingHorizontal: wp(3),
    paddingVertical: hp(0.5),
    backgroundColor: theme.colors.offWhite,
    borderRadius: 12,
    gap: wp(1.5),
  },
  lockText: {
    fontSize: hp(1.4),
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  newBadge: {
    alignSelf: 'flex-start',
    marginTop: hp(1),
    paddingHorizontal: wp(3.5),
    paddingVertical: hp(0.6),
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
  },
  newBadgeText: {
    color: theme.colors.surface,
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
    color: theme.colors.surface,
    fontSize: hp(2.2),
    fontWeight: "700",
    letterSpacing: 0.3,
  },
});
