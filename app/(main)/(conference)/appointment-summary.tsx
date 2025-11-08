import React, { useState, useEffect } from "react";
import { StyleSheet, Text, TouchableOpacity, View, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from "react-native-responsive-screen";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colorsSheet } from "../(settings)/_ui_elements";
import { getDoctorById } from "./_doctorsData";

export default function AppointmentSummaryScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  
  // Extract and validate parameters
  const doctorId = Array.isArray(params.doctorId) ? params.doctorId[0] : params.doctorId;
  const date = Array.isArray(params.date) ? params.date[0] : params.date;
  const time = Array.isArray(params.time) ? params.time[0] : params.time;
  const problem = Array.isArray(params.problem) ? params.problem[0] : params.problem;
  
  const doctor = getDoctorById(doctorId);
  
  // Calculate time until appointment
  const [timeRemaining, setTimeRemaining] = useState("");
  const [isCallReady, setIsCallReady] = useState(false);

  useEffect(() => {
    if (!date || !time) return;
    
    const calculateTimeRemaining = () => {
      // Parse date string safely
      let appointmentDateTime: Date;
      try {
        appointmentDateTime = new Date(date + " " + time);
        // Check if date is valid
        if (isNaN(appointmentDateTime.getTime())) {
          throw new Error("Invalid date");
        }
      } catch (error) {
        console.error("Error parsing appointment date:", error);
        setTimeRemaining("Invalid date");
        return;
      }
      
      const now = new Date();
      const diff = appointmentDateTime.getTime() - now.getTime();

      if (diff <= 0) {
        setIsCallReady(true);
        setTimeRemaining("Ready to start!");
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      let timeString = "";
      if (days > 0) timeString += `${days}d `;
      if (hours > 0) timeString += `${hours}h `;
      if (minutes > 0) timeString += `${minutes}m `;
      timeString += `${seconds}s`;

      setTimeRemaining(timeString);
    };

    calculateTimeRemaining();
    const interval = setInterval(calculateTimeRemaining, 1000);

    return () => clearInterval(interval);
  }, [date, time]);

  if (!doctor) {
    return (
      <SafeAreaView style={styles.container}>
        <Text>Doctor not found</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.replace("/(main)/(conference)")} style={styles.backButton}>
          <Ionicons name="home" size={24} color={colorsSheet.textOnPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Appointment Confirmed</Text>
        <View style={styles.spacer} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Success Icon */}
        <View style={styles.successContainer}>
          <View style={styles.successIconCircle}>
            <Ionicons name="checkmark-circle" size={80} color={colorsSheet.success} />
          </View>
          <Text style={styles.successTitle}>Appointment Booked Successfully!</Text>
          <Text style={styles.successSubtitle}>Your consultation is scheduled</Text>
        </View>

        {/* Countdown Timer */}
        <View style={styles.timerCard}>
          <Text style={styles.timerLabel}>Time until appointment:</Text>
          <Text style={styles.timerValue}>{timeRemaining}</Text>
        </View>

        {/* Appointment Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Appointment Summary</Text>

          <View style={styles.summaryRow}>
            <View style={styles.summaryIconContainer}>
              <Ionicons name="person" size={20} color={colorsSheet.primary} />
            </View>
            <View style={styles.summaryTextContainer}>
              <Text style={styles.summaryLabel}>Doctor</Text>
              <Text style={styles.summaryValue}>{doctor.name}</Text>
              <Text style={styles.summarySubValue}>{doctor.specialty}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.summaryRow}>
            <View style={styles.summaryIconContainer}>
              <Ionicons name="calendar" size={20} color={colorsSheet.info} />
            </View>
            <View style={styles.summaryTextContainer}>
              <Text style={styles.summaryLabel}>Date</Text>
              <Text style={styles.summaryValue}>
                {date && typeof date === 'string' ? (
                  (() => {
                    try {
                      const parsedDate = new Date(date);
                      return isNaN(parsedDate.getTime()) 
                        ? date 
                        : parsedDate.toLocaleDateString("en-GB", {
                            day: "2-digit",
                            month: "long",
                            year: "numeric"
                          });
                    } catch (error) {
                      return date;
                    }
                  })()
                ) : 'N/A'}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.summaryRow}>
            <View style={styles.summaryIconContainer}>
              <Ionicons name="time" size={20} color={colorsSheet.warning} />
            </View>
            <View style={styles.summaryTextContainer}>
              <Text style={styles.summaryLabel}>Time</Text>
              <Text style={styles.summaryValue}>{time}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.summaryRow}>
            <View style={styles.summaryIconContainer}>
              <Ionicons name="document-text" size={20} color={colorsSheet.secondary} />
            </View>
            <View style={styles.summaryTextContainer}>
              <Text style={styles.summaryLabel}>Your Concern</Text>
              <Text style={styles.summaryValue}>{problem}</Text>
            </View>
          </View>
        </View>

        {/* Start Call Button */}
        <TouchableOpacity 
          style={[styles.callButton, !isCallReady && styles.callButtonDisabled]}
          disabled={!isCallReady}
          onPress={() => {
            if (isCallReady) {
              // Generate unique call ID
              const callId = `appointment_${doctorId}_${Date.now()}`;
              
              // Navigate to video call screen
              router.push({
                pathname: "/(main)/(conference)/video-call" as any,
                params: {
                  callId: callId,
                  userName: "Patient", // You can replace with actual user name
                  doctorName: doctor?.name || "Doctor"
                }
              });
            }
          }}
        >
          <Ionicons 
            name="videocam" 
            size={24} 
            color={isCallReady ? colorsSheet.white : colorsSheet.textLight} 
          />
          <Text style={[styles.callButtonText, !isCallReady && styles.callButtonTextDisabled]}>
            {isCallReady ? "Start Call" : "Start Call (Not Ready)"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.homeButton}
          onPress={() => router.replace("/(main)/(conference)")}
        >
          <Text style={styles.homeButtonText}>Back to Conference</Text>
        </TouchableOpacity>
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
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: hp(2.2),
    fontWeight: "bold",
    color: colorsSheet.textOnPrimary,
    flex: 1,
    textAlign: "center",
  },
  spacer: {
    width: 40,
  },
  content: {
    flex: 1,
    backgroundColor: colorsSheet.screenColor,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingTop: hp(3),
    paddingHorizontal: wp(6),
  },
  successContainer: {
    alignItems: "center",
    marginBottom: hp(3),
  },
  successIconCircle: {
    marginBottom: hp(2),
  },
  successTitle: {
    fontSize: hp(2.4),
    fontWeight: "bold",
    color: colorsSheet.textPrimary,
    marginBottom: hp(0.5),
    textAlign: "center",
  },
  successSubtitle: {
    fontSize: hp(1.6),
    color: colorsSheet.textSecondary,
    textAlign: "center",
  },
  timerCard: {
    backgroundColor: colorsSheet.primary,
    borderRadius: 20,
    padding: wp(6),
    alignItems: "center",
    marginBottom: hp(2),
    shadowColor: colorsSheet.primary,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  timerLabel: {
    fontSize: hp(1.6),
    color: colorsSheet.white,
    marginBottom: hp(1),
  },
  timerValue: {
    fontSize: hp(3.5),
    fontWeight: "bold",
    color: colorsSheet.white,
  },
  summaryCard: {
    backgroundColor: colorsSheet.white,
    borderRadius: 20,
    padding: wp(5),
    marginBottom: hp(2),
    shadowColor: colorsSheet.primary,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryTitle: {
    fontSize: hp(2.2),
    fontWeight: "bold",
    color: colorsSheet.textPrimary,
    marginBottom: hp(2),
  },
  summaryRow: {
    flexDirection: "row",
    paddingVertical: hp(1),
  },
  summaryIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colorsSheet.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: wp(3),
  },
  summaryTextContainer: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: hp(1.4),
    color: colorsSheet.textSecondary,
    marginBottom: hp(0.3),
  },
  summaryValue: {
    fontSize: hp(1.8),
    fontWeight: "600",
    color: colorsSheet.textPrimary,
  },
  summarySubValue: {
    fontSize: hp(1.5),
    color: colorsSheet.textSecondary,
    marginTop: hp(0.2),
  },
  divider: {
    height: 1,
    backgroundColor: colorsSheet.gray,
    marginVertical: hp(1.5),
  },
  callButton: {
    flexDirection: "row",
    backgroundColor: colorsSheet.success,
    paddingVertical: hp(2),
    paddingHorizontal: wp(6),
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: hp(1.5),
    shadowColor: colorsSheet.success,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  callButtonDisabled: {
    backgroundColor: colorsSheet.gray,
    shadowColor: colorsSheet.gray,
  },
  callButtonText: {
    color: colorsSheet.white,
    fontSize: hp(2),
    fontWeight: "600",
    marginLeft: wp(2),
  },
  callButtonTextDisabled: {
    color: colorsSheet.textLight,
  },
  homeButton: {
    backgroundColor: colorsSheet.primarySoft,
    paddingVertical: hp(2),
    paddingHorizontal: wp(6),
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: hp(3),
  },
  homeButtonText: {
    color: colorsSheet.primary,
    fontSize: hp(1.8),
    fontWeight: "600",
  },
});
