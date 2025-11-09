import AppHeader from "@/components/AppHeader";
import { useAppointments } from "@/contexts/AppointmentContext";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from "react-native-responsive-screen";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "@/contexts/ThemeContext";
import { LinearGradient } from "expo-linear-gradient";
import { colorsSheet } from "../(settings)/_ui_elements";

export default function ConferenceScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { appointments } = useAppointments();
  const styles = getStyles(colors);

  useEffect(() => {
    // Check if there are any active or scheduled appointments (NOT cancelled or completed ones)
    const activeOrScheduled = appointments.filter(
      apt => apt.status === 'scheduled' || apt.status === 'active'
    );

    // Only redirect if there are non-cancelled/non-completed appointments
    if (activeOrScheduled.length > 0) {
      router.replace({
        pathname: '/(main)/(conference)/appointment-details',
        params: { appointmentId: activeOrScheduled[0].id }
      });
    }
    // If no active/scheduled appointments, stay on the main conference screen
    // This ensures cancelled appointments don't trigger a redirect
  }, [appointments]);

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader 
        title="Video Conference"
        showStepIndicator={false}
      />

      {/* Main Content */}
      <View style={styles.content}>
        <View style={styles.welcomeSection}>
          <View style={styles.iconContainer}>
            <Ionicons name="videocam" size={hp(8)} color={colors.primary} />
          </View>
          <Text style={styles.welcomeTitle}>Video Consultation</Text>
          <Text style={styles.welcomeSubtitle}>
            Connect with healthcare professionals through secure video calls for personalized consultations and medical advice.
          </Text>
        </View>

        {/* Features */}
        <View style={styles.featuresContainer}>
          <View style={styles.featureItem}>
            <Ionicons name="shield-checkmark" size={30} color={colors.success} />
            <Text style={styles.featureText}>Secure & Private</Text>
          </View>
          
          <View style={styles.featureItem}>
            <Ionicons name="time" size={30} color={colors.info} />
            <Text style={styles.featureText}>24/7 Availability</Text>
          </View>
          
          <View style={styles.featureItem}>
            <Ionicons name="people" size={30} color={colors.secondary} />
            <Text style={styles.featureText}>Expert Doctors</Text>
          </View>
        </View>

        {/* Action Button */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={styles.gradientButtonContainer}
            onPress={() => router.push('/(main)/(conference)/schedule-appointment')}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={[colorsSheet.primary, colorsSheet.primaryLight, colorsSheet.accent]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.gradientButton}
            >
              <Text style={styles.gradientButtonText}>Schedule Appointment 📅</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: wp(5),
    paddingVertical: hp(2),
    backgroundColor: colors.primary,
  },
  menuButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: hp(2.5),
    fontWeight: "bold",
    color: colors.textOnPrimary,
  },
  content: {
    flex: 1,
    backgroundColor: colors.screenColor,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingTop: hp(4),
    paddingHorizontal: wp(6),
  },
  welcomeSection: {
    alignItems: "center",
    marginBottom: hp(3),
    paddingHorizontal: wp(4),
  },
  iconContainer: {
    width: Math.min(hp(14), wp(28)),
    height: Math.min(hp(14), wp(28)),
    backgroundColor: colors.primarySoft,
    borderRadius: Math.min(hp(7), wp(14)),
    alignItems: "center",
    justifyContent: "center",
    marginBottom: hp(2),
  },
  welcomeTitle: {
    fontSize: Math.min(hp(2.8), wp(7)),
    fontWeight: "bold",
    color: colors.textPrimary,
    textAlign: "center",
    marginBottom: hp(1),
    paddingHorizontal: wp(2),
  },
  welcomeSubtitle: {
    fontSize: Math.min(hp(1.8), wp(4.5)),
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: Math.min(hp(2.5), wp(6)),
    paddingHorizontal: wp(6),
    marginBottom: hp(1),
  },
  featuresContainer: {
    marginBottom: hp(3),
    paddingHorizontal: wp(2),
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Math.min(hp(1.8), wp(4)),
    paddingHorizontal: wp(4),
    backgroundColor: colors.primarySoft,
    borderRadius: 15,
    marginBottom: hp(1.2),
    marginHorizontal: wp(1),
  },
  featureText: {
    fontSize: Math.min(hp(1.9), wp(4.8)),
    color: colors.textOnCard,
    marginLeft: wp(3),
    fontWeight: "500",
    flex: 1,
  },
  buttonContainer: {
    paddingBottom: hp(5),
    marginTop: hp(-2),
  },
  gradientButtonContainer: {
    borderRadius: 30,
    overflow: "hidden",
    shadowColor: colors.primary,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  gradientButton: {
    paddingVertical: Math.min(hp(2.2), wp(5.5)),
    paddingHorizontal: Math.min(wp(8), 35),
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    minHeight: hp(6),
  },
  gradientButtonText: {
    color: colors.white,
    fontSize: Math.min(hp(2.2), wp(5.5)),
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  spacer: {
    width: wp(18),
  },
});
