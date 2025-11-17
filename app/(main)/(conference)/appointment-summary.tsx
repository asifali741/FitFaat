import { useAppointmentBooking } from "@/hooks/useAppointmentBooking";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import { ActivityIndicator, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from "react-native-responsive-screen";
import { SafeAreaView } from "react-native-safe-area-context";
import { colorsSheet } from "../(settings)/_ui_elements";

export default function AppointmentSummaryScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { bookAppointment, isLoading, error } = useAppointmentBooking();
  const [isConfirming, setIsConfirming] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const [bookingResult, setBookingResult] = useState<{
    success: boolean;
    message: string;
  }>({ success: false, message: '' });
  
  // Extract parameters from route
  const doctorId = Array.isArray(params.doctorId) ? params.doctorId[0] : params.doctorId;
  const doctorName = Array.isArray(params.doctorName) ? params.doctorName[0] : params.doctorName;
  const specialty = Array.isArray(params.specialty) ? params.specialty[0] : params.specialty;
  const fee = Array.isArray(params.fee) ? parseFloat(params.fee[0]) : parseFloat(params.fee as string || "0");
  const date = Array.isArray(params.date) ? params.date[0] : params.date;
  const time = Array.isArray(params.time) ? params.time[0] : params.time;
  const problem = Array.isArray(params.problem) ? params.problem[0] : params.problem;

  const [isCallReady, setIsCallReady] = useState(false);

  const handleConfirmAppointment = async () => {
    if (!doctorId || !date || !time || fee === undefined) {
      setBookingResult({
        success: false,
        message: 'Missing appointment details'
      });
      setShowResultModal(true);
      return;
    }

    setIsConfirming(true);
    try {
      const response = await bookAppointment({
        doctorId,
        date,
        time,
        price: fee,
        description: problem || '',
      });

      if (response.success) {
        setBookingResult({
          success: true,
          message: 'Appointment booked successfully!'
        });
        setShowResultModal(true);
        
        // Auto navigate after 3 seconds
        setTimeout(() => {
          setShowResultModal(false);
          router.replace('/(main)/(conference)');
        }, 10000);
      } else {
        setBookingResult({
          success: false,
          message: response.message || 'Failed to book appointment'
        });
        setShowResultModal(true);
      }
    } catch (err: any) {
      setBookingResult({
        success: false,
        message: err.message || 'Failed to book appointment'
      });
      setShowResultModal(true);
    } finally {
      setIsConfirming(false);
    }
  };

  if (!doctorId || !date || !time) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Missing appointment details</Text>
        </View>
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
          <Text style={styles.successTitle}>Please Confirm Your Appointment!</Text>
          <Text style={styles.successSubtitle}>Get a best Consultation Experience</Text>
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
              <Text style={styles.summaryValue}>{doctorName}</Text>
              <Text style={styles.summarySubValue}>{specialty}</Text>
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
                {new Date(date).toLocaleDateString("en-GB", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric"
                })}
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
              const callId = `appointment_${doctorId}_${Date.now()}`;
              
              router.push({
                pathname: "/(main)/(conference)/video-call" as any,
                params: {
                  callId: callId,
                  userName: "Patient",
                  doctorName: doctorName || "Doctor"
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

        {/* Confirm Appointment Button */}
        <TouchableOpacity 
          style={[styles.confirmButton, (isConfirming || isLoading) && styles.confirmButtonDisabled]}
          disabled={isConfirming || isLoading}
          onPress={handleConfirmAppointment}
        >
          {isConfirming || isLoading ? (
            <>
              <ActivityIndicator color={colorsSheet.white} />
              <Text style={styles.confirmButtonText}>Booking...</Text>
            </>
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={20} color={colorsSheet.white} />
              <Text style={styles.confirmButtonText}>Confirm Appointment</Text>
            </>
          )}
        </TouchableOpacity>

        {error && (
          <View style={styles.errorAlert}>
            <Ionicons name="alert-circle" size={20} color={colorsSheet.error} />
            <Text style={styles.errorAlertText}>{error}</Text>
          </View>
        )}

        <TouchableOpacity 
          style={styles.homeButton}
          onPress={() => router.replace("/(main)/(conference)")}
        >
          <Text style={styles.homeButtonText}>Back to Conference</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Booking Result Modal */}
      <Modal
        visible={showResultModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowResultModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[
            styles.modalContent,
            bookingResult.success ? styles.modalSuccess : styles.modalError
          ]}>
            {/* Icon */}
            <View style={[
              styles.resultIconContainer,
              bookingResult.success ? styles.resultIconSuccess : styles.resultIconError
            ]}>
              <Ionicons 
                name={bookingResult.success ? "checkmark-circle" : "close-circle"} 
                size={80} 
                color={colorsSheet.white} 
              />
            </View>

            {/* Title */}
            <Text style={styles.resultTitle}>
              {bookingResult.success ? "Congratulations! 🎉" : "Oops! Something went wrong"}
            </Text>

            {/* Message */}
            <Text style={styles.resultMessage}>
              {bookingResult.message}
            </Text>

            {/* Action Button */}
            <TouchableOpacity 
              style={[
                styles.resultButton,
                bookingResult.success ? styles.resultButtonSuccess : styles.resultButtonError
              ]}
              onPress={() => {
                setShowResultModal(false);
                if (bookingResult.success) {
                  router.replace('/(main)/(conference)');
                }
              }}
            >
              <Text style={styles.resultButtonText}>
                {bookingResult.success ? "Continue" : "Try Again"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  confirmButton: {
    flexDirection: "row",
    backgroundColor: colorsSheet.primary,
    paddingVertical: hp(2),
    paddingHorizontal: wp(6),
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: hp(1.5),
    shadowColor: colorsSheet.primary,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  confirmButtonDisabled: {
    backgroundColor: colorsSheet.gray,
    shadowColor: colorsSheet.gray,
    opacity: 0.6,
  },
  confirmButtonText: {
    color: colorsSheet.white,
    fontSize: hp(1.8),
    fontWeight: "600",
    marginLeft: wp(2),
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: {
    fontSize: hp(1.8),
    color: colorsSheet.error || "#FF3B30",
  },
  errorAlert: {
    flexDirection: "row",
    backgroundColor: "#FFE5E5",
    borderRadius: 12,
    padding: wp(4),
    marginTop: hp(2),
    alignItems: "center",
    borderLeftWidth: 4,
    borderLeftColor: colorsSheet.error || "#FF3B30",
  },
  errorAlertText: {
    color: colorsSheet.error || "#FF3B30",
    fontSize: hp(1.5),
    marginLeft: wp(3),
    flex: 1,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colorsSheet.white,
    borderRadius: 30,
    padding: wp(8),
    width: wp(85),
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  modalSuccess: {
    backgroundColor: colorsSheet.white,
  },
  modalError: {
    backgroundColor: colorsSheet.white,
  },
  resultIconContainer: {
    width: hp(12),
    height: hp(12),
    borderRadius: hp(6),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: hp(2),
  },
  resultIconSuccess: {
    backgroundColor: colorsSheet.success || '#4CAF50',
  },
  resultIconError: {
    backgroundColor: colorsSheet.error || '#FF3B30',
  },
  resultTitle: {
    fontSize: hp(2.5),
    fontWeight: 'bold',
    color: colorsSheet.textPrimary,
    textAlign: 'center',
    marginBottom: hp(1),
  },
  resultMessage: {
    fontSize: hp(1.6),
    color: colorsSheet.textSecondary,
    textAlign: 'center',
    marginBottom: hp(2.5),
    lineHeight: hp(2.4),
  },
  resultButton: {
    paddingVertical: hp(1.8),
    paddingHorizontal: wp(8),
    borderRadius: 20,
    width: '100%',
    alignItems: 'center',
    marginTop: hp(1),
  },
  resultButtonSuccess: {
    backgroundColor: colorsSheet.success || '#4CAF50',
  },
  resultButtonError: {
    backgroundColor: colorsSheet.error || '#FF3B30',
  },
  resultButtonText: {
    color: colorsSheet.white,
    fontSize: hp(1.8),
    fontWeight: '600',
  },
});
