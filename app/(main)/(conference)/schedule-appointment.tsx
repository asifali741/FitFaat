import AppHeader from "@/components/AppHeader";
import CountdownTimer from "@/components/CountdownTimer";
import { useAppointments } from "@/contexts/AppointmentContext";
import { useTheme } from "@/contexts/ThemeContext";
import { authApi } from "@/utils/auth/authApi";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from "react-native-responsive-screen";
import { SafeAreaView } from "react-native-safe-area-context";
//import { colorsSheet } from "../(settings)/ui_elements";

export default function ScheduleAppointmentScreen() {
  const router = useRouter();
  const { addAppointment } = useAppointments();
  const { colors } = useTheme();
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [selectedDoctor, setSelectedDoctor] = useState<any>(null);
  const [problemDescription, setProblemDescription] = useState("");
  const [appointmentTime, setAppointmentTime] = useState<Date | null>(null);
  const [canStartCall, setCanStartCall] = useState(false);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [isLoadingDoctors, setIsLoadingDoctors] = useState(true);
  const [doctorError, setDoctorError] = useState<string | null>(null);
  
  const styles = useMemo(() => getStyles(colors), [colors]);

  // Fetch approved doctors when component mounts
  useEffect(() => {
    fetchApprovedDoctors();
  }, []);

  const fetchApprovedDoctors = async () => {
    setIsLoadingDoctors(true);
    setDoctorError(null);
    try {
      const response = await authApi.getApprovedDoctors();
      const approvedDoctors = response.doctors || [];
      
      // Transform doctor data to include required fields for display
      const formattedDoctors = approvedDoctors.map((doctor: any) => ({
        id: doctor._id,
        name: `${doctor.personalInfo.firstName} ${doctor.personalInfo.lastName}`,
        specialty: doctor.professionalInfo.specialization,
        experience: `${doctor.professionalInfo.yearsOfExperience} years`,
        fee: doctor.jobInfo.consultationFee ? `$${doctor.jobInfo.consultationFee}` : "$0",
        rating: 4.8, // Default rating (can be added to doctor model later)
        availableSlots: doctor.jobInfo.consultationMode || ["09:00 AM", "10:30 AM", "02:00 PM", "03:30 PM"],
        consultationMode: doctor.jobInfo.consultationMode,
        phoneNumber: doctor.personalInfo.phoneNumber
      }));
      
      setDoctors(formattedDoctors);
    } catch (error: any) {
      console.error('Failed to fetch doctors:', error);
      setDoctorError('Failed to load registered doctors. Using demo data.');
      // Set empty array instead of mock data
      setDoctors([]);
    } finally {
      setIsLoadingDoctors(false);
    }
  };
  

  const handleDateSelection = (date: string) => {
    setSelectedDate(date);
    setCurrentStep(2);
  };

  const handleTimeSelection = (time: string) => {
    setSelectedTime(time);
    setCurrentStep(3);
  };

  const handleDoctorSelection = (doctor: any) => {
    setSelectedDoctor(doctor);
    setCurrentStep(4);
  };

  const handleProblemSubmit = () => {
    if (!problemDescription.trim()) {
      Alert.alert("Required", "Please describe your problem or symptoms.");
      return;
    }
    setCurrentStep(5);
  };

  const renderAppointmentSummary = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Review Appointment</Text>
      <Text style={styles.stepSubtitle}>Please review your appointment details</Text>
      
      <View style={styles.summaryCard}>
        <View style={styles.summarySection}>
          <Text style={styles.summarySectionTitle}>Doctor Information</Text>
          <Text style={styles.summaryText}>Name: {selectedDoctor?.name}</Text>
          <Text style={styles.summaryText}>Specialty: {selectedDoctor?.specialty}</Text>
          <Text style={styles.summaryText}>Experience: {selectedDoctor?.experience}</Text>
          <Text style={styles.summaryText}>Fee: {selectedDoctor?.fee}</Text>
        </View>
        
        <View style={styles.summarySection}>
          <Text style={styles.summarySectionTitle}>Appointment Details</Text>
          <Text style={styles.summaryText}>Date: {selectedDate}</Text>
          <Text style={styles.summaryText}>Time: {selectedTime}</Text>
        </View>
        
        <View style={styles.summarySection}>
          <Text style={styles.summarySectionTitle}>Problem Description</Text>
          <Text style={styles.summaryText}>{problemDescription}</Text>
        </View>
      </View>
      
      <TouchableOpacity
        style={styles.continueButton}
        onPress={handleConfirmAppointment}
      >
        <Text style={styles.continueButtonText}>Confirm Appointment</Text>
      </TouchableOpacity>
    </View>
  );

  const handleConfirmAppointment = () => {
    // Set appointment time to 2 hours from now for demo
    const appointmentDateTime = new Date();
    appointmentDateTime.setHours(appointmentDateTime.getHours() + 2);
    setAppointmentTime(appointmentDateTime);
    
    // Save appointment to context
    if (selectedDoctor) {
      addAppointment({
        doctorName: selectedDoctor.name,
        doctorSpecialty: selectedDoctor.specialty,
        doctorExperience: selectedDoctor.experience,
        doctorFee: selectedDoctor.fee,
        date: selectedDate,
        time: selectedTime,
        problemDescription: problemDescription,
        appointmentDateTime: appointmentDateTime
      });
    }
    
    setCurrentStep(6);
  };

  const handleTimerComplete = () => {
    setCanStartCall(true);
  };

  const handleStartCall = () => {
    Alert.alert(
      "Start Call",
      "This would initiate a video call with the doctor. (Video call functionality not implemented)",
      [{ text: "OK" }]
    );
  };

  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      {[1, 2, 3, 4, 5, 6].map((step) => (
        <View
          key={step}
          style={[
            styles.stepDot,
            currentStep >= step ? styles.stepDotActive : styles.stepDotInactive
          ]}
        />
      ))}
    </View>
  );

  const renderDateSelection = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Select Date</Text>
      <Text style={styles.stepSubtitle}>Choose your preferred date for the consultation</Text>
      
      <View style={styles.dateGrid}>
        {["Today", "Tomorrow", "Day After"].map((date, index) => (
          <TouchableOpacity
            key={index}
            style={styles.dateCard}
            onPress={() => handleDateSelection(date)}
          >
            <Text style={styles.dateText}>{date}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderTimeSelection = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Select Time</Text>
      <Text style={styles.stepSubtitle}>Choose your preferred time slot</Text>
      
      <View style={styles.timeGrid}>
        {["09:00 AM", "10:30 AM", "02:00 PM", "03:30 PM", "04:00 PM"].map((time, index) => (
          <TouchableOpacity
            key={index}
            style={styles.timeCard}
            onPress={() => handleTimeSelection(time)}
          >
            <Text style={styles.timeText}>{time}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderDoctorSelection = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Available Doctors</Text>
      <Text style={styles.stepSubtitle}>Select a registered doctor for your consultation</Text>
      
      {isLoadingDoctors ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading registered doctors...</Text>
        </View>
      ) : doctorError ? (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={32} color={colors.error} />
          <Text style={styles.errorText}>{doctorError}</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={fetchApprovedDoctors}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : doctors.length === 0 ? (
        <View style={styles.noDoctorsContainer}>
          <Ionicons name="person-remove" size={32} color={colors.textSecondary} />
          <Text style={styles.noDoctorsText}>No registered doctors available at the moment</Text>
          <Text style={styles.noDoctorsSubtext}>Please try again later</Text>
        </View>
      ) : (
        <ScrollView style={styles.doctorList}>
          {doctors.map((doctor: any) => (
            <TouchableOpacity
              key={doctor.id}
              style={styles.doctorCard}
              onPress={() => handleDoctorSelection(doctor)}
            >
              <View style={styles.doctorInfo}>
                <View style={styles.doctorAvatar}>
                  <Ionicons name="person" size={24} color={colors.primary} />
                </View>
                <View style={styles.doctorDetails}>
                  <Text style={styles.doctorName}>{doctor.name}</Text>
                  <Text style={styles.doctorSpecialty}>{doctor.specialty}</Text>
                  <Text style={styles.doctorExperience}>{doctor.experience} experience</Text>
                  <View style={styles.doctorRating}>
                    <Ionicons name="star" size={16} color={colors.warning} />
                    <Text style={styles.ratingText}>{doctor.rating}</Text>
                  </View>
                </View>
                <View style={styles.doctorFee}>
                  <Text style={styles.feeText}>{doctor.fee}</Text>
                  <Text style={styles.feeLabel}>per session</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );

  const renderProblemDescription = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Describe Your Problem</Text>
      <Text style={styles.stepSubtitle}>Briefly describe your symptoms or concerns</Text>
      
      <View style={styles.problemInputContainer}>
        <TextInput
          style={styles.problemInput}
          placeholder="Describe your symptoms, concerns, or questions..."
          placeholderTextColor={colors.textSecondary}
          multiline
          numberOfLines={6}
          value={problemDescription}
          onChangeText={setProblemDescription}
        />
      </View>
      
      <TouchableOpacity
        style={styles.continueButton}
        onPress={handleProblemSubmit}
      >
        <Text style={styles.continueButtonText}>Continue</Text>
      </TouchableOpacity>
    </View>
  );

  const renderConfirmation = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Confirm Appointment</Text>
      
      <View style={styles.confirmationCard}>
        <View style={styles.confirmationHeader}>
          <Ionicons name="checkmark-circle" size={32} color={colors.success} />
          <Text style={styles.confirmationTitle}>Appointment Scheduled!</Text>
        </View>
        
        <View style={styles.appointmentDetails}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Doctor:</Text>
            <Text style={styles.detailValue}>{selectedDoctor?.name}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Specialty:</Text>
            <Text style={styles.detailValue}>{selectedDoctor?.specialty}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Date:</Text>
            <Text style={styles.detailValue}>{selectedDate}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Time:</Text>
            <Text style={styles.detailValue}>{selectedTime}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Fee:</Text>
            <Text style={styles.detailValue}>{selectedDoctor?.fee}</Text>
          </View>
        </View>
        
        <View style={styles.countdownContainer}>
          <Text style={styles.countdownLabel}>Session starts in:</Text>
          {appointmentTime && (
            <CountdownTimer 
              targetDate={appointmentTime} 
              onComplete={handleTimerComplete}
            />
          )}
        </View>
        
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
            color={canStartCall ? colors.textOnPrimary : colors.textSecondary} 
          />
          <Text style={[
            styles.startCallButtonText,
            canStartCall ? styles.startCallButtonTextActive : styles.startCallButtonTextDisabled
          ]}>
            {canStartCall ? "Start Call" : "Start Call (Available Soon)"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return renderDateSelection();
      case 2:
        return renderTimeSelection();
      case 3:
        return renderDoctorSelection();
      case 4:
        return renderProblemDescription();
      case 5:
        return renderAppointmentSummary();
      case 6:
        return renderConfirmation();
      default:
        return renderDateSelection();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader 
        title="Schedule Appointment"
        showStepIndicator={true}
        currentStep={currentStep}
        totalSteps={6}
        showStepIndicator={true}
        currentStep={currentStep}
        totalSteps={6}
      />


      {/* Main Content */}
      <View style={[styles.content, {backgroundColor: colors.screenColor}]}>
        {renderCurrentStep()}
      </View>
    </SafeAreaView>
  );
}

const getStyles = (colors: any) => StyleSheet.create({  container: {
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
    flex: 1,
    textAlign: "center",
  },
  backButton: {
    padding: 8,
  },
  content: {
    flex: 1,
   //backgroundColor: colors.screenColor,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingTop: hp(4),
    paddingHorizontal: wp(6),
  },
  stepIndicator: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: hp(2),
    backgroundColor: colors.primary,
  },
  stepDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginHorizontal: 4,
  },
  stepDotActive: {
    backgroundColor: colors.textOnPrimary,
  },
  stepDotInactive: {
    backgroundColor: colors.gray,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: Math.min(hp(2.8), wp(7)),
    fontWeight: "bold",
    color: colors.textPrimary,
    textAlign: "center",
    marginBottom: hp(1),
  },
  stepSubtitle: {
    fontSize: Math.min(hp(1.8), wp(4.5)),
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: hp(3),
  },
  dateGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  dateCard: {
    width: "30%",
    backgroundColor: colors.gray,
    borderRadius: 15,
    padding: hp(2),
    alignItems: "center",
    marginBottom: hp(1.5),
  },
  dateText: {
    fontSize: Math.min(hp(1.8), wp(4.5)),
    color: colors.textPrimary,
    fontWeight: "600",
  },
  timeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  timeCard: {
    width: "45%",
    backgroundColor: colors.gray,
    borderRadius: 15,
    padding: hp(1.8),
    alignItems: "center",
    marginBottom: hp(1.5),
  },
  timeText: {
    fontSize: Math.min(hp(1.8), wp(4.5)),
    color: colors.textPrimary,
    fontWeight: "600",
  },
  timeTextDisabled: {
    color: colors.textSecondary,
    textDecorationLine: 'line-through',
  },
  disabledLabel: {
    fontSize: Math.min(hp(1.2), wp(3)),
    color: colors.error || '#FF3B30',
    marginTop: hp(0.3),
    fontWeight: '500',
  },
  doctorList: {
    flex: 1,
  },
  doctorCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 15,
    padding: hp(2),
    marginBottom: hp(1.5),
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  doctorInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  doctorAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.gray,
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
    color: colors.textPrimary,
    marginBottom: 2,
  },
  doctorSpecialty: {
    fontSize: Math.min(hp(1.6), wp(4)),
    color: colors.textSecondary,
    marginBottom: 2,
  },
  doctorExperience: {
    fontSize: Math.min(hp(1.4), wp(3.5)),
    color: colors.textSecondary,
    marginBottom: 4,
  },
  doctorRating: {
    flexDirection: "row",
    alignItems: "center",
  },
  ratingText: {
    fontSize: Math.min(hp(1.4), wp(3.5)),
    color: colors.textSecondary,
    marginLeft: 4,
  },
  doctorFee: {
    alignItems: "center",
  },
  feeText: {
    fontSize: Math.min(hp(2), wp(5)),
    fontWeight: "bold",
    color: colors.primary,
  },
  feeLabel: {
    fontSize: Math.min(hp(1.2), wp(3)),
    color: colors.textSecondary,
  },
  problemInputContainer: {
    marginBottom: hp(3),
  },
  problemInput: {
    backgroundColor: colors.gray,
    borderRadius: 15,
    padding: hp(2),
    fontSize: Math.min(hp(1.8), wp(4.5)),
    color: colors.textPrimary,
    textAlignVertical: "top",
    minHeight: hp(15),
  },
  continueButton: {
    backgroundColor: colors.primary,
    borderRadius: 25,
    paddingVertical: hp(2),
    alignItems: "center",
    justifyContent: "center",
  },
  continueButtonText: {
    color: colors.textOnPrimary,
    fontSize: Math.min(hp(2), wp(5)),
    fontWeight: "600",
  },
  confirmationCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 20,
    padding: hp(3),
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  confirmationHeader: {
    alignItems: "center",
    marginBottom: hp(3),
  },
  confirmationTitle: {
    fontSize: Math.min(hp(2.2), wp(5.5)),
    fontWeight: "bold",
    color: colors.textPrimary,
    marginTop: hp(1),
  },
  appointmentDetails: {
    marginBottom: hp(3),
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: hp(1),
    borderBottomWidth: 1,
    borderBottomColor: colors.lightGray,
  },
  detailLabel: {
    fontSize: Math.min(hp(1.8), wp(4.5)),
    color: colors.textSecondary,
    fontWeight: "500",
  },
  detailValue: {
    fontSize: Math.min(hp(1.8), wp(4.5)),
    color: colors.textPrimary,
    fontWeight: "600",
  },
  countdownContainer: {
    alignItems: "center",
    marginBottom: hp(3),
    paddingVertical: hp(2),
    backgroundColor: colors.gray,
    borderRadius: 15,
  },
  countdownLabel: {
    fontSize: Math.min(hp(1.6), wp(4)),
    color: colors.textSecondary,
    marginBottom: hp(1),
  },
  countdownTimer: {
    fontSize: Math.min(hp(3), wp(7.5)),
    fontWeight: "bold",
    color: colors.primary,
  },
  startCallButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
    borderRadius: 25,
    paddingVertical: hp(2.2),
    paddingHorizontal: wp(6),
  },
  startCallButtonActive: {
    backgroundColor: colors.primary,
  },
  startCallButtonDisabled: {
    backgroundColor: colors.lightGray,
  },
  startCallButtonText: {
    fontSize: Math.min(hp(2), wp(5)),
    fontWeight: "600",
    marginLeft: wp(2),
  },
  startCallButtonTextActive: {
    color: colors.textOnPrimary,
  },
  startCallButtonTextDisabled: {
    color: colors.textSecondary,
  },
  summaryCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 15,
    padding: hp(2.5),
    marginBottom: hp(3),
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  summarySection: {
    marginBottom: hp(2),
  },
  summarySectionTitle: {
    fontSize: Math.min(hp(1.8), wp(4.5)),
    fontWeight: "bold",
    color: colors.textPrimary,
    marginBottom: hp(1),
  },
  summaryText: {
    fontSize: Math.min(hp(1.6), wp(4)),
    color: colors.textSecondary,
    marginBottom: hp(0.5),
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: hp(10),
  },
  loadingText: {
    fontSize: Math.min(hp(1.8), wp(4.5)),
    color: colors.textSecondary,
    marginTop: hp(2),
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: hp(10),
  },
  errorText: {
    fontSize: Math.min(hp(1.8), wp(4.5)),
    color: colors.error,
    marginTop: hp(2),
    textAlign: "center",
  },
  retryButton: {
    marginTop: hp(2),
    backgroundColor: colors.primary,
    paddingHorizontal: wp(6),
    paddingVertical: hp(1.2),
    borderRadius: 10,
  },
  retryButtonText: {
    color: colors.textOnPrimary,
    fontSize: Math.min(hp(1.6), wp(4)),
    fontWeight: "600",
  },
  noDoctorsContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: hp(10),
  },
  noDoctorsText: {
    fontSize: Math.min(hp(1.8), wp(4.5)),
    color: colors.textSecondary,
    marginTop: hp(2),
    textAlign: "center",
  },
  noDoctorsSubtext: {
    fontSize: Math.min(hp(1.6), wp(4)),
    color: colors.textSecondary,
    marginTop: hp(1),
  },
});
