import AppHeader from "@/components/AppHeader";
import { useAppointments } from "@/contexts/AppointmentContext";
import { useTheme } from "@/contexts/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect } from "react";
import { ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from "react-native-responsive-screen";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ConferenceScreen() {
  const { colors, isDarkMode } = useTheme();
  const router = useRouter();
  const { appointments } = useAppointments();
  const styles = getStyles(colors);

  useEffect(() => {
    // Check if there are any active or scheduled appointments
    const activeOrScheduled = appointments.filter(
      apt => apt.status === 'scheduled' || apt.status === 'active'
    );

    // If there are active/scheduled appointments, redirect to the first one
    if (activeOrScheduled.length > 0) {
      router.replace({
        pathname: '/(main)/(conference)/appointment-details' as any,
        params: { appointmentId: activeOrScheduled[0].id }
      });
    }
  }, [appointments]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={colors.screenColor}
      />
      <View style={styles.container}>
        <AppHeader 
          title="Video Conference"
          showStepIndicator={false}
        />

      {/* Main Content */}
        <ScrollView 
          style={styles.content}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
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

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={styles.scheduleButton}
            onPress={() => router.push('/(main)/(conference)/doctor-time-date-selection')}
          >
            <Text style={styles.scheduleButtonText}>Schedule Appointment 📅</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.viewAppointmentsButton}
            onPress={() => router.push('/(main)/(conference)/my-appointments')}
          >
            <Ionicons name="list" size={24} color={colors.primary} />
            <Text style={styles.viewAppointmentsButtonText}>View My Appointments</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.chatButton}
            onPress={() => router.push('/(main)/(conference)/all-user-chats')}
          >
            <Ionicons name="chatbubbles" size={24} color={colors.primary} />
            <Text style={styles.chatButtonText}>My Chats</Text>
          </TouchableOpacity>
        </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.screenColor,
  },
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
  },
  scrollContent: {
    paddingTop: hp(4),
    paddingHorizontal: wp(6),
    paddingBottom: hp(16),
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
    paddingVertical: hp(2),
    paddingHorizontal: wp(4),
    backgroundColor: colors.primarySoft,
    borderRadius: wp(4),
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
    marginTop: hp(2),
    paddingHorizontal: wp(4),
  },
  scheduleButton: {
    backgroundColor: colors.primary,
    paddingVertical: hp(2.2),
    paddingHorizontal: wp(6),
    borderRadius: wp(6),
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.primary,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  scheduleButtonText: {
    color: colors.white,
    fontSize: Math.min(hp(2.1), wp(5.2)),
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  viewAppointmentsButton: {
    backgroundColor: colors.white,
    borderColor: colors.primary,
    borderWidth: 2,
    paddingVertical: hp(2.2),
    paddingHorizontal: wp(6),
    borderRadius: wp(6),
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    marginTop: hp(2),
    shadowColor: colors.primary,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  viewAppointmentsButtonText: {
    color: colors.primary,
    fontSize: Math.min(hp(2.1), wp(5.2)),
    fontWeight: "600",
    letterSpacing: 0.3,
    marginLeft: wp(2),
  },
  chatButton: {
    backgroundColor: colors.white,
    borderColor: colors.primary,
    borderWidth: 2,
    paddingVertical: hp(2.2),
    paddingHorizontal: wp(6),
    borderRadius: wp(6),
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    marginTop: hp(2),
    shadowColor: colors.primary,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  chatButtonText: {
    color: colors.primary,
    fontSize: Math.min(hp(2.1), wp(5.2)),
    fontWeight: "600",
    marginLeft: wp(2),
  },
  spacer: {
    width: wp(18),
  },
});
