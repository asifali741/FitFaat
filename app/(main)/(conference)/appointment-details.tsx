import CountdownTimer from "@/components/CountdownTimer";
import { theme } from "@/constants/theme";
import { Appointment, useAppointments } from "@/contexts/AppointmentContext";
import { Ionicons } from "@expo/vector-icons";
import { DrawerActions, useNavigation } from "@react-navigation/native";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from "react-native-responsive-screen";
import { SafeAreaView } from "react-native-safe-area-context";

export default function AppointmentDetailsScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { appointments, updateAppointmentStatus } = useAppointments();
  const { appointmentId } = useLocalSearchParams();
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [canStartCall, setCanStartCall] = useState(false);

  useEffect(() => {
    if (appointmentId) {
      const foundAppointment = appointments.find(apt => apt.id === appointmentId);
      setAppointment(foundAppointment || null);
    }
  }, [appointmentId, appointments]);

  const openDrawer = () => {
    navigation.dispatch(DrawerActions.openDrawer());
  };

  const handleTimerComplete = () => {
    setCanStartCall(true);
    if (appointment) {
      updateAppointmentStatus(appointment.id, 'active');
    }
  };

  const handleStartCall = () => {
    Alert.alert(
      "Start Call",
      "This would initiate a video call with the doctor. (Video call functionality not implemented)",
      [{ text: "OK" }]
    );
  };

  const handleCancelAppointment = () => {
    Alert.alert(
      "Cancel Appointment",
      "Are you sure you want to cancel this appointment?",
      [
        { text: "No", style: "cancel" },
        { 
          text: "Yes", 
          style: "destructive",
          onPress: () => {
            if (appointment) {
              updateAppointmentStatus(appointment.id, 'cancelled');
              router.back();
            }
          }
        }
      ]
    );
  };

  if (!appointment) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.menuButton}
            onPress={openDrawer}
          >
            <Ionicons name="menu" size={24} color={theme.colors.surface} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Appointment Details</Text>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color={theme.colors.surface} />
          </TouchableOpacity>
        </View>
        <View style={styles.content}>
          <Text style={styles.errorText}>Appointment not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.menuButton}
          onPress={openDrawer}
        >
          <Ionicons name="menu" size={24} color={theme.colors.surface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Appointment Details</Text>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={theme.colors.surface} />
        </TouchableOpacity>
      </View>

      {/* Main Content */}
      <ScrollView style={styles.content}>
        {/* Appointment Status Card */}
        <View style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <Ionicons 
              name={appointment.status === 'active' ? "videocam" : "calendar"} 
              size={32} 
              color={appointment.status === 'active' ? theme.colors.success : theme.colors.primary} 
            />
            <Text style={styles.statusTitle}>
              {appointment.status === 'active' ? 'Session Active' : 'Appointment Scheduled'}
            </Text>
          </View>
          
          {appointment.status === 'scheduled' && (
            <View style={styles.countdownContainer}>
              <Text style={styles.countdownLabel}>Session starts in:</Text>
              <CountdownTimer 
                targetDate={appointment.appointmentDateTime} 
                onComplete={handleTimerComplete}
              />
            </View>
          )}
        </View>

        {/* Doctor Information */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Doctor Information</Text>
          <View style={styles.doctorInfo}>
            <View style={styles.doctorAvatar}>
              <Ionicons name="person" size={24} color={theme.colors.primary} />
            </View>
            <View style={styles.doctorDetails}>
              <Text style={styles.doctorName}>{appointment.doctorName}</Text>
              <Text style={styles.doctorSpecialty}>{appointment.doctorSpecialty}</Text>
              <Text style={styles.doctorExperience}>{appointment.doctorExperience} experience</Text>
              <Text style={styles.doctorFee}>Consultation Fee: {appointment.doctorFee}</Text>
            </View>
          </View>
        </View>

        {/* Appointment Details */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Appointment Details</Text>
          <View style={styles.detailsList}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Date:</Text>
              <Text style={styles.detailValue}>{appointment.date}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Time:</Text>
              <Text style={styles.detailValue}>{appointment.time}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Status:</Text>
              <Text style={[styles.detailValue, styles.statusValue]}>{appointment.status.toUpperCase()}</Text>
            </View>
          </View>
        </View>

        {/* Problem Description */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Problem Description</Text>
          <Text style={styles.problemText}>{appointment.problemDescription}</Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          {appointment.status === 'scheduled' && (
            <TouchableOpacity
              style={[
                styles.startCallButton, 
                canStartCall ? styles.startCallButtonActive : styles.startCallButtonDisabled
              ]}
              disabled={!canStartCall}
              onPress={handleStartCall}
            >
              <Ionicons 
                name="videocam" 
                size={20} 
                color={canStartCall ? theme.colors.surface : theme.colors.textSecondary} 
              />
              <Text style={[
                styles.startCallButtonText,
                canStartCall ? styles.startCallButtonTextActive : styles.startCallButtonTextDisabled
              ]}>
                {canStartCall ? "Start Call" : "Start Call (Available Soon)"}
              </Text>
            </TouchableOpacity>
          )}

          {appointment.status === 'active' && (
            <TouchableOpacity
              style={styles.startCallButton}
              onPress={handleStartCall}
            >
              <Ionicons name="videocam" size={20} color={theme.colors.surface} />
              <Text style={styles.startCallButtonText}>Join Call</Text>
            </TouchableOpacity>
          )}

          {appointment.status !== 'cancelled' && (
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleCancelAppointment}
            >
              <Ionicons name="close-circle" size={20} color={theme.colors.error} />
              <Text style={styles.cancelButtonText}>Cancel Appointment</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.primary,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: wp(5),
    paddingVertical: hp(2),
    backgroundColor: theme.colors.primary,
  },
  menuButton: {
    padding: theme.spacing.sm,
  },
  headerTitle: {
    fontSize: hp(2.5),
    fontWeight: theme.typography.fontWeight.bold as any,
    color: theme.colors.surface,
    flex: 1,
    textAlign: "center",
  },
  backButton: {
    padding: theme.spacing.sm,
  },
  content: {
    flex: 1,
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    paddingTop: hp(4),
    paddingHorizontal: wp(6),
  },
  statusCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    padding: hp(3),
    marginBottom: hp(3),
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: "center",
    ...theme.shadows.medium,
  },
  statusHeader: {
    alignItems: "center",
    marginBottom: hp(2),
  },
  statusTitle: {
    fontSize: Math.min(hp(2.2), wp(5.5)),
    fontWeight: theme.typography.fontWeight.bold as any,
    color: theme.colors.textPrimary,
    marginTop: hp(1),
  },
  countdownContainer: {
    alignItems: "center",
    paddingVertical: hp(2),
    backgroundColor: theme.colors.primary + '20',
    borderRadius: theme.borderRadius.medium,
    paddingHorizontal: wp(4),
  },
  countdownLabel: {
    fontSize: Math.min(hp(1.6), wp(4)),
    color: theme.colors.textSecondary,
    marginBottom: hp(1),
  },
  sectionCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.medium,
    padding: hp(2.5),
    marginBottom: hp(2),
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.small,
  },
  sectionTitle: {
    fontSize: Math.min(hp(1.8), wp(4.5)),
    fontWeight: theme.typography.fontWeight.bold as any,
    color: theme.colors.textPrimary,
    marginBottom: hp(1.5),
  },
  doctorInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  doctorAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: theme.colors.primary + '20',
    alignItems: "center",
    justifyContent: "center",
    marginRight: wp(3),
  },
  doctorDetails: {
    flex: 1,
  },
  doctorName: {
    fontSize: Math.min(hp(2), wp(5)),
    fontWeight: theme.typography.fontWeight.bold as any,
    color: theme.colors.textPrimary,
    marginBottom: 2,
  },
  doctorSpecialty: {
    fontSize: Math.min(hp(1.6), wp(4)),
    color: theme.colors.textSecondary,
    marginBottom: 2,
  },
  doctorExperience: {
    fontSize: Math.min(hp(1.4), wp(3.5)),
    color: theme.colors.textSecondary,
    marginBottom: 2,
  },
  doctorFee: {
    fontSize: Math.min(hp(1.4), wp(3.5)),
    color: theme.colors.primary,
    fontWeight: theme.typography.fontWeight.semiBold as any,
  },
  detailsList: {
    marginTop: hp(1),
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: hp(1),
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  detailLabel: {
    fontSize: Math.min(hp(1.8), wp(4.5)),
    color: theme.colors.textSecondary,
    fontWeight: theme.typography.fontWeight.medium as any,
  },
  detailValue: {
    fontSize: Math.min(hp(1.8), wp(4.5)),
    color: theme.colors.textPrimary,
    fontWeight: theme.typography.fontWeight.semiBold as any,
  },
  statusValue: {
    color: theme.colors.primary,
  },
  problemText: {
    fontSize: Math.min(hp(1.6), wp(4)),
    color: theme.colors.textSecondary,
    lineHeight: Math.min(hp(2.2), wp(5.5)),
  },
  actionButtons: {
    marginTop: hp(2),
    marginBottom: hp(4),
  },
  startCallButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.xl,
    paddingVertical: hp(2.2),
    paddingHorizontal: wp(6),
    marginBottom: hp(2),
    ...theme.shadows.medium,
  },
  startCallButtonActive: {
    backgroundColor: theme.colors.primary,
  },
  startCallButtonDisabled: {
    backgroundColor: theme.colors.disabled,
  },
  startCallButtonText: {
    fontSize: Math.min(hp(2), wp(5)),
    fontWeight: theme.typography.fontWeight.semiBold as any,
    marginLeft: wp(2),
  },
  startCallButtonTextActive: {
    color: theme.colors.surface,
  },
  startCallButtonTextDisabled: {
    color: theme.colors.textSecondary,
  },
  cancelButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.xl,
    paddingVertical: hp(2.2),
    paddingHorizontal: wp(6),
    borderWidth: 1,
    borderColor: theme.colors.error,
  },
  cancelButtonText: {
    fontSize: Math.min(hp(2), wp(5)),
    fontWeight: theme.typography.fontWeight.semiBold as any,
    color: theme.colors.error,
    marginLeft: wp(2),
  },
  errorText: {
    fontSize: Math.min(hp(2), wp(5)),
    color: theme.colors.textSecondary,
    textAlign: "center",
    marginTop: hp(4),
  },
});
