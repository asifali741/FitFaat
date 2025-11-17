import CountdownTimer from "@/components/CountdownTimer";
import { Appointment, useAppointments } from "@/contexts/AppointmentContext";
import { Ionicons } from "@expo/vector-icons";
import { DrawerActions, useNavigation } from "@react-navigation/native";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from "react-native-responsive-screen";
import { SafeAreaView } from "react-native-safe-area-context";
import { colorsSheet } from "../(settings)/ui_elements";

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
            <Ionicons name="menu" size={24} color={colorsSheet.textOnPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Appointment Details</Text>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color={colorsSheet.textOnPrimary} />
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
          <Ionicons name="menu" size={24} color={colorsSheet.textOnPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Appointment Details</Text>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={colorsSheet.textOnPrimary} />
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
              color={appointment.status === 'active' ? colorsSheet.success : colorsSheet.primary} 
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
              <Ionicons name="person" size={24} color={colorsSheet.primary} />
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
                color={canStartCall ? colorsSheet.textOnPrimary : colorsSheet.textSecondary} 
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
              <Ionicons name="videocam" size={20} color={colorsSheet.textOnPrimary} />
              <Text style={styles.startCallButtonText}>Join Call</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.cancelButton}
            onPress={handleCancelAppointment}
          >
            <Ionicons name="close-circle" size={20} color={colorsSheet.error} />
            <Text style={styles.cancelButtonText}>Cancel Appointment</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colorsSheet.primary,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: wp(5),
    paddingVertical: hp(2),
    backgroundColor: colorsSheet.primary,
  },
  menuButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: hp(2.5),
    fontWeight: "bold",
    color: colorsSheet.textOnPrimary,
    flex: 1,
    textAlign: "center",
  },
  backButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    backgroundColor: colorsSheet.screenColor,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingTop: hp(4),
    paddingHorizontal: wp(6),
  },
  statusCard: {
    backgroundColor: colorsSheet.cardBackground,
    borderRadius: 20,
    padding: hp(3),
    marginBottom: hp(3),
    borderWidth: 1,
    borderColor: colorsSheet.cardBorder,
    alignItems: "center",
  },
  statusHeader: {
    alignItems: "center",
    marginBottom: hp(2),
  },
  statusTitle: {
    fontSize: Math.min(hp(2.2), wp(5.5)),
    fontWeight: "bold",
    color: colorsSheet.textPrimary,
    marginTop: hp(1),
  },
  countdownContainer: {
    alignItems: "center",
    paddingVertical: hp(2),
    backgroundColor: colorsSheet.primarySoft,
    borderRadius: 15,
    paddingHorizontal: wp(4),
  },
  countdownLabel: {
    fontSize: Math.min(hp(1.6), wp(4)),
    color: colorsSheet.textSecondary,
    marginBottom: hp(1),
  },
  sectionCard: {
    backgroundColor: colorsSheet.cardBackground,
    borderRadius: 15,
    padding: hp(2.5),
    marginBottom: hp(2),
    borderWidth: 1,
    borderColor: colorsSheet.cardBorder,
  },
  sectionTitle: {
    fontSize: Math.min(hp(1.8), wp(4.5)),
    fontWeight: "bold",
    color: colorsSheet.textPrimary,
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
    backgroundColor: colorsSheet.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: wp(3),
  },
  doctorDetails: {
    flex: 1,
  },
  doctorName: {
    fontSize: Math.min(hp(2), wp(5)),
    fontWeight: "bold",
    color: colorsSheet.textPrimary,
    marginBottom: 2,
  },
  doctorSpecialty: {
    fontSize: Math.min(hp(1.6), wp(4)),
    color: colorsSheet.textSecondary,
    marginBottom: 2,
  },
  doctorExperience: {
    fontSize: Math.min(hp(1.4), wp(3.5)),
    color: colorsSheet.textSecondary,
    marginBottom: 2,
  },
  doctorFee: {
    fontSize: Math.min(hp(1.4), wp(3.5)),
    color: colorsSheet.primary,
    fontWeight: "600",
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
    borderBottomColor: colorsSheet.lightGray,
  },
  detailLabel: {
    fontSize: Math.min(hp(1.8), wp(4.5)),
    color: colorsSheet.textSecondary,
    fontWeight: "500",
  },
  detailValue: {
    fontSize: Math.min(hp(1.8), wp(4.5)),
    color: colorsSheet.textPrimary,
    fontWeight: "600",
  },
  statusValue: {
    color: colorsSheet.primary,
  },
  problemText: {
    fontSize: Math.min(hp(1.6), wp(4)),
    color: colorsSheet.textSecondary,
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
    backgroundColor: colorsSheet.primary,
    borderRadius: 25,
    paddingVertical: hp(2.2),
    paddingHorizontal: wp(6),
    marginBottom: hp(2),
  },
  startCallButtonActive: {
    backgroundColor: colorsSheet.primary,
  },
  startCallButtonDisabled: {
    backgroundColor: colorsSheet.lightGray,
  },
  startCallButtonText: {
    fontSize: Math.min(hp(2), wp(5)),
    fontWeight: "600",
    marginLeft: wp(2),
  },
  startCallButtonTextActive: {
    color: colorsSheet.textOnPrimary,
  },
  startCallButtonTextDisabled: {
    color: colorsSheet.textSecondary,
  },
  cancelButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colorsSheet.screenColor,
    borderRadius: 25,
    paddingVertical: hp(2.2),
    paddingHorizontal: wp(6),
    borderWidth: 1,
    borderColor: colorsSheet.error,
  },
  cancelButtonText: {
    fontSize: Math.min(hp(2), wp(5)),
    fontWeight: "600",
    color: colorsSheet.error,
    marginLeft: wp(2),
  },
  errorText: {
    fontSize: Math.min(hp(2), wp(5)),
    color: colorsSheet.textSecondary,
    textAlign: "center",
    marginTop: hp(4),
  },
});
