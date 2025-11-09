import AppHeader from "@/components/AppHeader";
import CountdownTimer from "@/components/CountdownTimer";
import { useAppointments } from "@/contexts/AppointmentContext";
import { useTheme } from "@/contexts/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from "react-native-responsive-screen";
import { SafeAreaView } from "react-native-safe-area-context";
//import { colorsSheet } from "../(settings)/ui_elements";

// Mock data for doctors
const mockDoctors = [
  {
    id: 1,
    name: "Dr. Sarah Johnson",
    specialty: "General Medicine",
    experience: "8 years",
    fee: "$50",
    rating: 4.8,
    availableSlots: ["09:00 AM", "10:30 AM", "02:00 PM", "03:30 PM"]
  },
  {
    id: 2,
    name: "Dr. Michael Chen",
    specialty: "Cardiology",
    experience: "12 years",
    fee: "$75",
    rating: 4.9,
    availableSlots: ["09:30 AM", "11:00 AM", "01:30 PM", "04:00 PM"]
  },
  {
    id: 3,
    name: "Dr. Emily Rodriguez",
    specialty: "Dermatology",
    experience: "6 years",
    fee: "$60",
    rating: 4.7,
    availableSlots: ["10:00 AM", "11:30 AM", "02:30 PM", "03:00 PM"]
  }
];

export default function ScheduleAppointmentScreen() {
  const router = useRouter();
  const { addAppointment } = useAppointments();
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [selectedDoctor, setSelectedDoctor] = useState<any>(null);
  const [problemDescription, setProblemDescription] = useState("");
  const [appointmentTime, setAppointmentTime] = useState<Date | null>(null);
  const [canStartCall, setCanStartCall] = useState(false);
  const { colors } = useTheme();
  const styles = useMemo(() => getStyles(colors), [colors]);
  

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
    // Calculate appointment time based on selected date and time
    const appointmentDateTime = calculateAppointmentDateTime(selectedDate, selectedTime);
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

  // Calculate the actual appointment date and time
  const calculateAppointmentDateTime = (date: string, time: string): Date => {
    const appointmentDate = new Date();
    
    // Set the date based on selection
    if (date === "Tomorrow") {
      appointmentDate.setDate(appointmentDate.getDate() + 1);
    } else if (date === "Day After") {
      appointmentDate.setDate(appointmentDate.getDate() + 2);
    }
    // For "Today", keep current date
    
    // Parse the selected time (e.g., "02:00 PM")
    const timeParts = time.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (timeParts) {
      let hours = parseInt(timeParts[1]);
      const minutes = parseInt(timeParts[2]);
      const period = timeParts[3].toUpperCase();
      
      // Convert to 24-hour format
      if (period === "PM" && hours !== 12) {
        hours += 12;
      } else if (period === "AM" && hours === 12) {
        hours = 0;
      }
      
      appointmentDate.setHours(hours, minutes, 0, 0);
    }
    
    return appointmentDate;
  };

  const handleTimerComplete = () => {
    setCanStartCall(true);
  };

  // Check if appointment time has already passed when component mounts
  useEffect(() => {
    if (appointmentTime) {
      const now = new Date();
      if (appointmentTime <= now) {
        setCanStartCall(true);
      } else {
        setCanStartCall(false);
      }
    }
  }, [appointmentTime]);

  const handleStartCall = () => {
    // Generate unique call ID for this appointment
    const callId = `appointment_${selectedDoctor?.id}_${Date.now()}`;
    
    // Navigate to video call screen
    router.push({
      pathname: "/(main)/(conference)/video-call" as any,
      params: {
        callId: callId,
        userName: "Patient", // You can replace with actual user name from context
        doctorName: selectedDoctor?.name || "Doctor"
      }
    });
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

  const renderTimeSelection = () => {
    // Get available time slots based on business hours and current time
    const getTimeSlots = () => {
      // Define all possible time slots for the clinic (9 AM to 5 PM)
      const allSlots = [
        "09:00 AM", "09:30 AM", "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM",
        "12:00 PM", "12:30 PM", "01:00 PM", "01:30 PM", "02:00 PM", "02:30 PM",
        "03:00 PM", "03:30 PM", "04:00 PM", "04:30 PM", "05:00 PM"
      ];
      
      const now = new Date();
      const currentHours = now.getHours();
      const currentMinutes = now.getMinutes();
      
      // Check if clinic is closed for today (after 5 PM)
      const isClinicClosedToday = currentHours >= 17; // 5 PM or later
      
      // If Today is selected and clinic is closed, return empty array
      if (selectedDate === "Today" && isClinicClosedToday) {
        return [];
      }
      
      return allSlots;
    };
    
    // Check if time slot is available based on date and current time
    const getSlotStatus = (timeSlot: string): { available: boolean; reason?: string } => {
      const now = new Date();
      const currentHours = now.getHours();
      const currentMinutes = now.getMinutes();
      
      // Parse time slot (e.g., "02:00 PM" -> 14:00)
      const timeParts = timeSlot.match(/(\d+):(\d+)\s*(AM|PM)/i);
      if (!timeParts) return { available: false, reason: "Invalid time" };
      
      let slotHours = parseInt(timeParts[1]);
      const slotMinutes = parseInt(timeParts[2]);
      const period = timeParts[3].toUpperCase();
      
      // Convert to 24-hour format
      if (period === "PM" && slotHours !== 12) {
        slotHours += 12;
      } else if (period === "AM" && slotHours === 12) {
        slotHours = 0;
      }
      
      // Logic based on selected date
      if (selectedDate === "Today") {
        // Check if time has passed
        if (slotHours < currentHours || 
            (slotHours === currentHours && slotMinutes <= currentMinutes)) {
          return { available: false, reason: "Passed" };
        }
        
        // Check if there's at least 30 minutes buffer for appointment booking
        const slotTime = new Date();
        slotTime.setHours(slotHours, slotMinutes, 0, 0);
        const bufferTime = new Date(now.getTime() + 30 * 60000); // 30 minutes from now
        
        if (slotTime <= bufferTime) {
          return { available: false, reason: "Too soon" };
        }
      } else if (selectedDate === "Tomorrow") {
        // Check if it's too late to book for tomorrow's early slots
        // (e.g., can't book 9 AM tomorrow if it's already 9 PM today)
        if (currentHours >= 21 && slotHours < 10) { // After 9 PM
          return { available: false, reason: "Booking closed" };
        }
      } else if (selectedDate === "Day After") {
        // All slots available for day after tomorrow
        // Could add logic for maximum advance booking (e.g., only 3 days ahead)
      }
      
      // Check for lunch break (12:30 PM - 1:30 PM)
      if ((slotHours === 12 && slotMinutes === 30) || 
          (slotHours === 13 && slotMinutes === 0)) {
        return { available: false, reason: "Lunch break" };
      }
      
      return { available: true };
    };
    
    const timeSlots = getTimeSlots();
    
    // Check if clinic is closed message should be shown
    if (selectedDate === "Today" && timeSlots.length === 0) {
      return (
        <View style={styles.stepContent}>
          <Text style={styles.stepTitle}>Select Time</Text>
          <View style={styles.closedNotice}>
            <Ionicons name="time-outline" size={48} color={colors.textSecondary} />
            <Text style={styles.closedTitle}>Clinic Hours Ended</Text>
            <Text style={styles.closedMessage}>
              Today&apos;s appointments are closed.{"\n"}
              Please select Tomorrow or Day After to book.
            </Text>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => setCurrentStep(1)}
            >
              <Text style={styles.backButtonText}>← Go Back</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }
    
    return (
      <View style={styles.stepContent}>
        <Text style={styles.stepTitle}>Select Time</Text>
        <Text style={styles.stepSubtitle}>
          {selectedDate === "Today" 
            ? "Available slots (minimum 30 min advance booking)"
            : `Available slots for ${selectedDate}`}
        </Text>
        
        {/* Show clinic hours */}
        <View style={styles.clinicHoursInfo}>
          <Ionicons name="information-circle-outline" size={16} color={colors.textSecondary} />
          <Text style={styles.clinicHoursText}>
            Clinic Hours: 9:00 AM - 5:00 PM | Lunch: 12:30 PM - 1:30 PM
          </Text>
        </View>
        
        <ScrollView style={styles.timeScrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.timeGrid}>
            {timeSlots.map((time, index) => {
              const status = getSlotStatus(time);
              
              return (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.timeCard, 
                    !status.available && styles.timeCardDisabled,
                    status.available && styles.timeCardAvailable
                  ]}
                  onPress={() => status.available && handleTimeSelection(time)}
                  disabled={!status.available}
                >
                  <Text style={[
                    styles.timeText, 
                    !status.available && styles.timeTextDisabled
                  ]}>
                    {time}
                  </Text>
                  {!status.available && status.reason && (
                    <Text style={[
                      styles.disabledLabel,
                      status.reason === "Lunch break" && styles.lunchBreakLabel
                    ]}>
                      {status.reason}
                    </Text>
                  )}
                  {status.available && (
                    <View style={styles.availableDot} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      </View>
    );
  };

  const renderDoctorSelection = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Available Doctors</Text>
      <Text style={styles.stepSubtitle}>Select a doctor for your consultation</Text>
      
      <ScrollView style={styles.doctorList}>
        {mockDoctors.map((doctor) => (
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
        showStepIndicator={false}
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
  timeCardDisabled: {
    backgroundColor: colors.lightGray,
    opacity: 0.5,
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
  lunchBreakLabel: {
    color: colors.warning || '#FFA500',
  },
  timeCardAvailable: {
    borderWidth: 1,
    borderColor: colors.success || '#4CAF50',
  },
  availableDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.success || '#4CAF50',
    position: 'absolute',
    top: 8,
    right: 8,
  },
  clinicHoursInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.lightGray || '#F5F5F5',
    borderRadius: 10,
    padding: hp(1.2),
    marginBottom: hp(2),
    gap: wp(2),
  },
  clinicHoursText: {
    fontSize: Math.min(hp(1.4), wp(3.5)),
    color: colors.textSecondary,
    flex: 1,
  },
  timeScrollView: {
    flex: 1,
    maxHeight: hp(50),
  },
  closedNotice: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: wp(5),
  },
  closedTitle: {
    fontSize: Math.min(hp(2.2), wp(5.5)),
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginTop: hp(2),
    marginBottom: hp(1),
  },
  closedMessage: {
    fontSize: Math.min(hp(1.6), wp(4)),
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: Math.min(hp(2.2), wp(5.5)),
    marginBottom: hp(3),
  },
  backButtonStyle: {
    backgroundColor: colors.primary,
    borderRadius: 25,
    paddingVertical: hp(1.5),
    paddingHorizontal: wp(6),
  },
  backButtonText: {
    color: colors.textOnPrimary,
    fontSize: Math.min(hp(1.8), wp(4.5)),
    fontWeight: '600',
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
});
