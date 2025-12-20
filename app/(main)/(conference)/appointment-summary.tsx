import { theme } from "@/constants/theme";
import { useAppointmentBooking } from "@/hooks/useAppointmentBooking";
import { tokenStorage } from "@/utils/auth/tokenStorage";
import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Modal, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from "react-native-responsive-screen";
import { SafeAreaView } from "react-native-safe-area-context";

export default function AppointmentSummaryScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { bookAppointment, isLoading, error } = useAppointmentBooking();
  const [isConfirming, setIsConfirming] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [appointmentLimit, setAppointmentLimit] = useState<any>(null);
  const [activeAppointmentCount, setActiveAppointmentCount] = useState(0);
  const [bookingResult, setBookingResult] = useState<{
    success: boolean;
    message: string;
  }>({ success: false, message: '' });
  
  const ENV = Constants.expoConfig?.extra;
  const API_URL = (ENV?.EXPO_PUBLIC_BACKEND_API_URL || (Platform.OS === "android" ? "http://10.0.2.2:5001" : "http://localhost:5001")).replace(/\/api\/?$/, '');
  
  // Extract parameters from route
  const doctorId = Array.isArray(params.doctorId) ? params.doctorId[0] : params.doctorId;
  const doctorName = Array.isArray(params.doctorName) ? params.doctorName[0] : params.doctorName;
  const specialty = Array.isArray(params.specialty) ? params.specialty[0] : params.specialty;
  const fee = Array.isArray(params.fee) ? parseFloat(params.fee[0]) : parseFloat(params.fee as string || "0");
  const date = Array.isArray(params.date) ? params.date[0] : params.date;
  const time = Array.isArray(params.time) ? params.time[0] : params.time;
  const problem = Array.isArray(params.problem) ? params.problem[0] : params.problem;

  const [isCallReady, setIsCallReady] = useState(false);

  // Check appointment limit on mount
  useEffect(() => {
    checkAppointmentLimit();
  }, []);

  const checkAppointmentLimit = async () => {
    try {
      const token = await tokenStorage.getToken();
      if (!token) return;

      const response = await fetch(`${API_URL}/api/appointments/check-limit`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      setAppointmentLimit(data);
      if (data.activeAppointments !== undefined) {
        setActiveAppointmentCount(data.activeAppointments);
      }
    } catch (error) {
      console.error('Error checking appointment limit:', error);
    }
  };

  const handleConfirmAppointment = async () => {
    if (!doctorId || !date || !time || fee === undefined) {
      setBookingResult({
        success: false,
        message: 'Missing appointment details'
      });
      setShowResultModal(true);
      return;
    }

    // Check appointment limit first
    if (appointmentLimit && !appointmentLimit.canBook) {
      setShowLimitModal(true);
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
        // Check if it's an appointment limit error
        if (response.appointmentLimitReached) {
          setShowLimitModal(true);
        } else {
          setBookingResult({
            success: false,
            message: response.message || 'Failed to book appointment'
          });
          setShowResultModal(true);
        }
      }
    } catch (err: any) {
      // Check if error response indicates limit reached
      if (err.message && (err.message.includes('already have') || err.message.includes('limit') || err.message.includes('appointment'))) {
        await checkAppointmentLimit(); // Refresh limit status
        setShowLimitModal(true);
      } else {
        setBookingResult({
          success: false,
          message: err.message || 'Failed to book appointment'
        });
        setShowResultModal(true);
      }
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
          <Ionicons name="home" size={24} color={theme.colors.surface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Appointment Confirmed</Text>
        <View style={styles.spacer} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Success Icon */}
        <View style={styles.successContainer}>
          <View style={styles.successIconCircle}>
            <Ionicons name="checkmark-circle" size={80} color={theme.colors.success} />
          </View>
          <Text style={styles.successTitle}>Please Confirm Your Appointment!</Text>
          <Text style={styles.successSubtitle}>Get a best Consultation Experience</Text>
        </View>

        {/* Appointment Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Appointment Summary</Text>

          <View style={styles.summaryRow}>
            <View style={styles.summaryIconContainer}>
              <Ionicons name="person" size={20} color={theme.colors.primary} />
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
              <Ionicons name="calendar" size={20} color={theme.colors.info} />
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
              <Ionicons name="time" size={20} color={theme.colors.warning} />
            </View>
            <View style={styles.summaryTextContainer}>
              <Text style={styles.summaryLabel}>Time</Text>
              <Text style={styles.summaryValue}>{time}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.summaryRow}>
            <View style={styles.summaryIconContainer}>
              <Ionicons name="document-text" size={20} color={theme.colors.secondary} />
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
            color={isCallReady ? theme.colors.surface : theme.colors.textTertiary} 
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
              <ActivityIndicator color={theme.colors.surface} />
              <Text style={styles.confirmButtonText}>Booking...</Text>
            </>
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={20} color={theme.colors.surface} />
              <Text style={styles.confirmButtonText}>Confirm Appointment</Text>
            </>
          )}
        </TouchableOpacity>

        {error && (
          <View style={styles.errorAlert}>
            <Ionicons name="alert-circle" size={20} color={theme.colors.error} />
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
                color={theme.colors.surface} 
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

      {/* Appointment Limit Modal */}
      <Modal
        visible={showLimitModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowLimitModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.appointmentModalContent}>
            {/* Close button */}
            <TouchableOpacity
              style={styles.appointmentCloseButton}
              onPress={() => setShowLimitModal(false)}
            >
              <Ionicons name="close-circle" size={30} color="#999" />
            </TouchableOpacity>

            {/* Icon */}
            <View style={styles.appointmentIconContainer}>
              <Ionicons name="alert-circle" size={60} color="#FF6B6B" />
            </View>

            {/* Title */}
            <Text style={styles.appointmentModalTitle}>You Already Have an Appointment</Text>

            {/* Subtitle */}
            <Text style={styles.appointmentModalSubtitle}>
              {activeAppointmentCount === 1 
                ? "You have 1 active appointment scheduled" 
                : `You have ${activeAppointmentCount} appointments scheduled`}
            </Text>

            {/* Description */}
            <Text style={styles.appointmentModalDescription}>
              Free users can book only 1 active appointment at a time. Upgrade to Premium for unlimited appointments!
            </Text>

            {/* Features List */}
            <View style={styles.appointmentFeaturesList}>
              <View style={styles.appointmentFeatureItem}>
                <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                <Text style={styles.appointmentFeatureText}>Book unlimited appointments</Text>
              </View>
              <View style={styles.appointmentFeatureItem}>
                <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                <Text style={styles.appointmentFeatureText}>Priority doctor access</Text>
              </View>
              <View style={styles.appointmentFeatureItem}>
                <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                <Text style={styles.appointmentFeatureText}>Unlimited chat support</Text>
              </View>
            </View>

            {/* Price Tag */}
            <View style={styles.appointmentPriceTag}>
              <Text style={styles.appointmentPriceAmount}>$10</Text>
              <Text style={styles.appointmentPriceFrequency}>/month</Text>
            </View>

            {/* Action Buttons */}
            <TouchableOpacity
              style={styles.appointmentUpgradButton}
              onPress={() => {
                setShowLimitModal(false);
                router.push("/(main)/(settings)/premium");
              }}
            >
              <Ionicons name="star" size={20} color="#fff" />
              <Text style={styles.appointmentUpgradButtonText}>Upgrade to Premium</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.appointmentLaterButton}
              onPress={() => setShowLimitModal(false)}
            >
              <Text style={styles.appointmentLaterButtonText}>Maybe Later</Text>
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
    backgroundColor: theme.colors.primary,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: wp(5),
    paddingVertical: hp(2),
  },
  backButton: {
    padding: theme.spacing.sm,
  },
  headerTitle: {
    fontSize: hp(2.2),
    fontWeight: theme.typography.fontWeight.bold as any,
    color: theme.colors.surface,
    flex: 1,
    textAlign: "center",
  },
  spacer: {
    width: 40,
  },
  content: {
    flex: 1,
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
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
    fontWeight: theme.typography.fontWeight.bold as any,
    color: theme.colors.textPrimary,
    marginBottom: hp(0.5),
    textAlign: "center",
  },
  successSubtitle: {
    fontSize: hp(1.6),
    color: theme.colors.textSecondary,
    textAlign: "center",
  },
  timerCard: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.xl,
    padding: wp(6),
    alignItems: "center",
    marginBottom: hp(2),
    ...theme.shadows.large,
  },
  timerLabel: {
    fontSize: hp(1.6),
    color: theme.colors.surface,
    marginBottom: hp(1),
  },
  timerValue: {
    fontSize: hp(3.5),
    fontWeight: theme.typography.fontWeight.bold as any,
    color: theme.colors.surface,
  },
  summaryCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    padding: wp(5),
    marginBottom: hp(2),
    ...theme.shadows.medium,
  },
  summaryTitle: {
    fontSize: hp(2.2),
    fontWeight: theme.typography.fontWeight.bold as any,
    color: theme.colors.textPrimary,
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
    backgroundColor: theme.colors.primary + '20',
    alignItems: "center",
    justifyContent: "center",
    marginRight: wp(3),
  },
  summaryTextContainer: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: hp(1.4),
    color: theme.colors.textSecondary,
    marginBottom: hp(0.3),
  },
  summaryValue: {
    fontSize: hp(1.8),
    fontWeight: theme.typography.fontWeight.semiBold as any,
    color: theme.colors.textPrimary,
  },
  summarySubValue: {
    fontSize: hp(1.5),
    color: theme.colors.textSecondary,
    marginTop: hp(0.2),
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: hp(1.5),
  },
  callButton: {
    flexDirection: "row",
    backgroundColor: theme.colors.success,
    paddingVertical: hp(2),
    paddingHorizontal: wp(6),
    borderRadius: theme.borderRadius.xl,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: hp(1.5),
    ...theme.shadows.large,
  },
  callButtonDisabled: {
    backgroundColor: theme.colors.disabled,
  },
  callButtonText: {
    color: theme.colors.surface,
    fontSize: hp(2),
    fontWeight: theme.typography.fontWeight.semiBold as any,
    marginLeft: wp(2),
  },
  callButtonTextDisabled: {
    color: theme.colors.textTertiary,
  },
  homeButton: {
    backgroundColor: theme.colors.primary + '20',
    paddingVertical: hp(2),
    paddingHorizontal: wp(6),
    borderRadius: theme.borderRadius.xl,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: hp(3),
  },
  homeButtonText: {
    color: theme.colors.primary,
    fontSize: hp(1.8),
    fontWeight: theme.typography.fontWeight.semiBold as any,
  },
  confirmButton: {
    flexDirection: "row",
    backgroundColor: theme.colors.primary,
    paddingVertical: hp(2),
    paddingHorizontal: wp(6),
    borderRadius: theme.borderRadius.xl,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: hp(1.5),
    ...theme.shadows.large,
  },
  confirmButtonDisabled: {
    backgroundColor: theme.colors.disabled,
    opacity: 0.6,
  },
  confirmButtonText: {
    color: theme.colors.surface,
    fontSize: hp(1.8),
    fontWeight: theme.typography.fontWeight.semiBold as any,
    marginLeft: wp(2),
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: {
    fontSize: hp(1.8),
    color: theme.colors.error,
  },
  errorAlert: {
    flexDirection: "row",
    backgroundColor: theme.colors.error + '20',
    borderRadius: theme.borderRadius.medium,
    padding: wp(4),
    marginTop: hp(2),
    alignItems: "center",
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.error,
  },
  errorAlertText: {
    color: theme.colors.error,
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
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    padding: wp(8),
    width: wp(85),
    alignItems: 'center',
    ...theme.shadows.large,
  },
  modalSuccess: {
    backgroundColor: theme.colors.surface,
  },
  modalError: {
    backgroundColor: theme.colors.surface,
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
    backgroundColor: theme.colors.success,
  },
  resultIconError: {
    backgroundColor: theme.colors.error,
  },
  resultTitle: {
    fontSize: hp(2.5),
    fontWeight: theme.typography.fontWeight.bold as any,
    color: theme.colors.textPrimary,
    textAlign: 'center',
    marginBottom: hp(1),
  },
  resultMessage: {
    fontSize: hp(1.6),
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: hp(2.5),
    lineHeight: hp(2.4),
  },
  resultButton: {
    paddingVertical: hp(1.8),
    paddingHorizontal: wp(8),
    borderRadius: theme.borderRadius.xl,
    width: '100%',
    alignItems: 'center',
    marginTop: hp(1),
  },
  resultButtonSuccess: {
    backgroundColor: theme.colors.success,
  },
  resultButtonError: {
    backgroundColor: theme.colors.error,
  },
  resultButtonText: {
    color: theme.colors.surface,
    fontSize: hp(1.8),
    fontWeight: theme.typography.fontWeight.semiBold as any,
  },
  // Appointment Limit Modal Styles
  appointmentModalContent: {
    backgroundColor: theme.colors.surface,
    borderRadius: hp(3),
    paddingHorizontal: wp(6),
    paddingVertical: hp(3),
    width: '100%',
    maxWidth: wp(90),
    alignItems: 'center',
    ...theme.shadows.large,
  },
  appointmentCloseButton: {
    position: 'absolute',
    top: hp(1.5),
    right: wp(3),
    zIndex: 10,
  },
  appointmentIconContainer: {
    marginTop: hp(1),
    marginBottom: hp(2),
  },
  appointmentModalTitle: {
    fontSize: hp(2.8),
    fontWeight: theme.typography.fontWeight.bold as any,
    color: theme.colors.textPrimary,
    marginBottom: hp(0.8),
    textAlign: 'center',
  },
  appointmentModalSubtitle: {
    fontSize: hp(2),
    fontWeight: theme.typography.fontWeight.semiBold as any,
    color: theme.colors.error,
    marginBottom: hp(1.5),
    textAlign: 'center',
  },
  appointmentModalDescription: {
    fontSize: hp(1.8),
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: hp(2.5),
    lineHeight: hp(2.8),
  },
  appointmentFeaturesList: {
    width: '100%',
    marginBottom: hp(2.5),
    paddingHorizontal: wp(2),
  },
  appointmentFeatureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: hp(1.2),
  },
  appointmentFeatureText: {
    fontSize: hp(1.7),
    color: theme.colors.textPrimary,
    marginLeft: wp(2.5),
    fontWeight: theme.typography.fontWeight.medium as any,
  },
  appointmentPriceTag: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'baseline',
    marginBottom: hp(2.5),
    paddingVertical: hp(1.5),
    paddingHorizontal: wp(5),
    backgroundColor: theme.colors.success + '15',
    borderRadius: hp(1.5),
    borderWidth: 1.5,
    borderColor: theme.colors.success,
  },
  appointmentPriceAmount: {
    fontSize: hp(3.5),
    fontWeight: theme.typography.fontWeight.bold as any,
    color: theme.colors.success,
  },
  appointmentPriceFrequency: {
    fontSize: hp(1.9),
    color: theme.colors.textSecondary,
    marginLeft: wp(1),
    fontWeight: theme.typography.fontWeight.semiBold as any,
  },
  appointmentUpgradButton: {
    width: '100%',
    flexDirection: 'row',
    backgroundColor: theme.colors.success,
    paddingVertical: hp(2),
    borderRadius: hp(1.2),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: hp(1),
    ...theme.shadows.large,
  },
  appointmentUpgradButtonText: {
    fontSize: hp(2),
    fontWeight: theme.typography.fontWeight.bold as any,
    color: theme.colors.surface,
    marginLeft: wp(2),
    letterSpacing: 0.5,
  },
  appointmentLaterButton: {
    width: '100%',
    paddingVertical: hp(1.5),
    borderRadius: hp(1),
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.background,
  },
  appointmentLaterButtonText: {
    fontSize: hp(1.9),
    fontWeight: theme.typography.fontWeight.semiBold as any,
    color: theme.colors.textSecondary,
  },
});