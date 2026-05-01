import AppHeader from '@/components/AppHeader';
import { theme } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';
import { authApi } from '@/utils/auth/authApi';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from 'react-native-responsive-screen';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function DoctorSelectionScreen() {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const router = useRouter();
  const [doctors, setDoctors] = useState<any[]>([]);
  const [isLoadingDoctors, setIsLoadingDoctors] = useState(true);
  const [selectedDoctor, setSelectedDoctor] = useState<any>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [step, setStep] = useState<'doctors' | 'date' | 'time'>('doctors');
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);

  // Fetch doctors on mount
  useEffect(() => {
    fetchDoctors();
  }, []);

  const fetchDoctors = async () => {
    setIsLoadingDoctors(true);
    try {
      const response = await authApi.getApprovedDoctors();
      const formattedDoctors = response.doctors?.map((doctor: any) => ({
        id: doctor._id,
        name: `${doctor.personalInfo.firstName} ${doctor.personalInfo.lastName}`,
        specialty: doctor.professionalInfo.specialization,
        experience: `${doctor.professionalInfo.yearsOfExperience} years`,
        fee: doctor.jobInfo.consultationFee || 0,
        rating: 4.8,
        phoneNumber: doctor.personalInfo.phoneNumber,
      })) || [];
      setDoctors(formattedDoctors);
    } catch (error) {
      console.error('Failed to fetch doctors:', error);
      Alert.alert('Error', 'Failed to load doctors. Please try again.');
    } finally {
      setIsLoadingDoctors(false);
    }
  };

  // Fetch booked appointments for selected doctor
  const fetchBookedSlots = async (doctorId: string, date: string) => {
    setIsLoadingSlots(true);
    try {
      const response = await authApi.getDoctorAppointments(doctorId);
      if (response.success && response.appointments) {
        // Filter appointments for the selected date
        const bookedForDate = response.appointments
          .filter((apt: any) => {
            const aptDate = new Date(apt.date).toISOString().split('T')[0];
            return aptDate === date && ['pending', 'confirmed'].includes(apt.status);
          })
          .map((apt: any) => apt.time);
        setBookedSlots(bookedForDate);
      }
    } catch (error) {
      console.error('Failed to fetch booked slots:', error);
      // Don't show error alert, just continue with empty booked slots
    } finally {
      setIsLoadingSlots(false);
    }
  };

  // Generate time slots (9 AM to 5 PM, 1 hour intervals)
  const timeSlots = [
    '09:00 AM',
    '10:00 AM',
    '11:00 AM',
    '12:00 PM',
    '01:00 PM',
    '02:00 PM',
    '03:00 PM',
    '04:00 PM',
    '05:00 PM',
  ];

  // Generate available dates (next 30 days)
  const generateAvailableDates = () => {
    const dates = [];
    const today = new Date();
    
    for (let i = 1; i <= 30; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() + i);
      
      // Skip weekends if needed (optional)
      const day = date.getDay();
      if (day !== 0 && day !== 6) { // 0 = Sunday, 6 = Saturday
        dates.push({
          date: date.toISOString().split('T')[0],
          display: date.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          }),
          dayOfWeek: date.toLocaleDateString('en-GB', { weekday: 'short' }),
        });
      }
    }
    
    return dates;
  };

  const availableDates = generateAvailableDates();

  const handleDoctorSelect = (doctor: any) => {
    setSelectedDoctor(doctor);
    setSelectedTime(null);
    setSelectedDate(null);
    setBookedSlots([]);
    setStep('date');
  };

  const handleDateSelect = async (date: string) => {
    setSelectedDate(date);
    // Fetch booked slots for this date
    if (selectedDoctor) {
      await fetchBookedSlots(selectedDoctor.id, date);
    }
    setStep('time');
  };

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time);
  };

  const handleNext = () => {
    if (step === 'doctors' && selectedDoctor) {
      setStep('date');
    } else if (step === 'date' && selectedDate && selectedDoctor) {
      setStep('time');
    } else if (step === 'time' && selectedTime && selectedDate && selectedDoctor) {
      // Navigate to appointment summary
      router.push({
        pathname: '/(main)/(conference)/appointment-summary' as any,
        params: {
          doctorId: selectedDoctor.id,
          doctorName: selectedDoctor.name,
          specialty: selectedDoctor.specialty,
          fee: selectedDoctor.fee.toString(),
          date: selectedDate,
          time: selectedTime,
        },
      });
    }
  };

  const navigation = useNavigation();

  const handleBack = () => {
    if (step === 'date') {
      setSelectedDoctor(null);
      setSelectedDate(null);
      setStep('doctors');
    } else if (step === 'time') {
      setSelectedTime(null);
      setStep('date');
    } else {
      try {
        if (navigation && (navigation as any).canGoBack && (navigation as any).canGoBack()) {
          (navigation as any).goBack();
          return;
        }
      } catch (e) {}
      router.back();
    }
  };

  const isNextDisabled = () => {
    if (step === 'doctors') return !selectedDoctor;
    if (step === 'date') return !selectedDate;
    if (step === 'time') return !selectedTime || isLoadingSlots;
    return true;
  };

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader
        title={step === 'doctors' ? 'Select Doctor' : step === 'date' ? 'Select Date' : 'Select Time'}
        showStepIndicator={false}
      />

      <View style={styles.content}>
        {/* Step 1: Doctor Selection */}
        {step === 'doctors' && (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Choose a Doctor</Text>
            <Text style={styles.stepSubtitle}>Select a registered doctor for consultation</Text>

            {isLoadingDoctors ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
              </View>
            ) : doctors.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="person-remove" size={48} color={colors.textSecondary} />
                <Text style={styles.emptyText}>No doctors available</Text>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                {doctors.map((doctor) => (
                  <TouchableOpacity
                    key={doctor.id}
                    style={[
                      styles.doctorCard,
                      selectedDoctor?.id === doctor.id && styles.doctorCardSelected,
                    ]}
                    onPress={() => handleDoctorSelect(doctor)}
                  >
                    <View style={styles.doctorContent}>
                      <View style={styles.doctorAvatar}>
                        <Ionicons name="person" size={32} color={colors.primary} />
                      </View>
                      <View style={styles.doctorInfo}>
                        <Text style={styles.doctorName}>{doctor.name}</Text>
                        <Text style={styles.doctorSpecialty}>{doctor.specialty}</Text>
                        <Text style={styles.doctorExperience}>{doctor.experience}</Text>
                        <View style={styles.ratingContainer}>
                          <Ionicons name="star" size={14} color={colors.warning} />
                          <Text style={styles.ratingText}>{doctor.rating}</Text>
                        </View>
                      </View>
                      <View style={styles.feeContainer}>
                        <Text style={styles.feeLabel}>Rs</Text>
                        <Text style={styles.feeAmount}>{doctor.fee}</Text>
                      </View>
                    </View>
                    {selectedDoctor?.id === doctor.id && (
                      <View style={styles.checkmark}>
                        <Ionicons name="checkmark-circle" size={24} color={colors.statusConfirmed} />
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
        )}

        {/* Step 2: Date Selection */}
        {step === 'date' && selectedDoctor && (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Select Date</Text>
            <Text style={styles.stepSubtitle}>
              {selectedDoctor.name} - Choose your preferred date
            </Text>

            <ScrollView showsVerticalScrollIndicator={false}>
              {availableDates.map((dateObj) => (
                <TouchableOpacity
                  key={dateObj.date}
                  style={[
                    styles.dateCard,
                    selectedDate === dateObj.date && styles.dateCardSelected,
                  ]}
                  onPress={() => handleDateSelect(dateObj.date)}
                >
                  <View style={styles.dateContent}>
                    <View style={styles.dateInfo}>
                      <Text style={styles.dateDay}>{dateObj.dayOfWeek}</Text>
                      <Text style={styles.dateDisplay}>{dateObj.display}</Text>
                    </View>
                    {selectedDate === dateObj.date && (
                      <Ionicons name="checkmark-circle" size={24} color={colors.statusConfirmed} />
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Step 3: Time Selection */}
        {step === 'time' && selectedDoctor && selectedDate && (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Select Time</Text>
            <Text style={styles.stepSubtitle}>
              {selectedDoctor.name} - Choose your preferred time
            </Text>

            {isLoadingSlots ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.loadingText}>Loading available slots...</Text>
              </View>
            ) : (
              <View style={styles.timeGrid}>
                {timeSlots.map((time) => {
                  const isBooked = bookedSlots.includes(time);
                  const isSelected = selectedTime === time;
                  
                  return (
                    <TouchableOpacity
                      key={time}
                      style={[
                        styles.timeSlot,
                        isSelected && styles.timeSlotSelected,
                        isBooked && styles.timeSlotBooked,
                      ]}
                      onPress={() => !isBooked && handleTimeSelect(time)}
                      disabled={isBooked}
                    >
                      <Text
                        style={[
                          styles.timeSlotText,
                          isSelected && styles.timeSlotTextSelected,
                          isBooked && styles.timeSlotTextBooked,
                        ]}
                      >
                        {time}
                      </Text>
                      {isBooked && (
                        <Ionicons 
                          name="close-circle" 
                          size={16} 
                          color={colors.error} 
                          style={styles.bookedIcon}
                        />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        )}

        {/* Navigation Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={handleBack}
          >
            <Text style={styles.backBtnText}>Back</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.nextBtn, isNextDisabled() && styles.nextBtnDisabled]}
            onPress={handleNext}
            disabled={isNextDisabled()}
          >
            <Text style={[styles.nextBtnText, isNextDisabled() && styles.nextBtnTextDisabled]}>
              {step === 'time' ? 'Continue to Summary' : 'Next'}
            </Text>
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
  content: {
    flex: 1,
    borderTopLeftRadius: wp(8),
    borderTopRightRadius: wp(8),
    backgroundColor: colors.background,
    paddingTop: hp(3),
    paddingHorizontal: wp(5),
  },
  stepContainer: {
    flex: 1,
  },
  stepTitle: {
    fontSize: hp(2.5),
    fontWeight: theme.typography.fontWeight.bold as any,
    color: colors.textPrimary,
    marginBottom: hp(0.5),
  },
  stepSubtitle: {
    fontSize: hp(1.6),
    color: colors.textSecondary,
    marginBottom: hp(2),
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: hp(1.8),
    color: colors.textSecondary,
    marginTop: hp(1),
  },
  loadingText: {
    fontSize: hp(1.6),
    color: colors.textSecondary,
    marginTop: hp(2),
  },
  doctorCard: {
    backgroundColor: colors.surface,
    borderRadius: theme.borderRadius.large,
    padding: wp(4),
    marginBottom: hp(1.5),
    borderWidth: 2,
    borderColor: colors.border,
  },
  doctorCardSelected: {
    borderColor: colors.statusConfirmed,
    backgroundColor: colors.primary + '10',
  },
  doctorContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  doctorAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: wp(3),
  },
  doctorInfo: {
    flex: 1,
  },
  doctorName: {
    fontSize: hp(1.8),
    fontWeight: theme.typography.fontWeight.semiBold as any,
    color: colors.textPrimary,
    marginBottom: hp(0.3),
  },
  doctorSpecialty: {
    fontSize: hp(1.5),
    color: colors.textSecondary,
    marginBottom: hp(0.2),
  },
  doctorExperience: {
    fontSize: hp(1.4),
    color: colors.textSecondary,
    marginBottom: hp(0.3),
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: hp(1.4),
    color: colors.textSecondary,
    marginLeft: wp(1),
  },
  feeContainer: {
    alignItems: 'flex-end',
  },
  feeLabel: {
    fontSize: hp(1.2),
    color: colors.textSecondary,
  },
  feeAmount: {
    fontSize: hp(1.8),
    fontWeight: theme.typography.fontWeight.bold as any,
    color: colors.primary,
  },
  checkmark: {
    position: 'absolute',
    right: wp(4),
    top: hp(1),
  },
  timeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingBottom: hp(10),
  },
  timeSlot: {
    width: '30%',
    aspectRatio: 1,
    backgroundColor: colors.surface,
    borderRadius: theme.borderRadius.medium,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: hp(2),
    borderWidth: 2,
    borderColor: colors.border,
  },
  timeSlotSelected: {
    backgroundColor: colors.statusConfirmed,
    borderColor: colors.statusConfirmed,
  },
  timeSlotText: {
    fontSize: hp(1.5),
    fontWeight: theme.typography.fontWeight.semiBold as any,
    color: colors.textPrimary,
  },
  timeSlotTextSelected: {
    color: colors.surface,
  },
  timeSlotBooked: {
    backgroundColor: colors.disabled,
    borderColor: colors.error,
    opacity: 0.6,
  },
  timeSlotTextBooked: {
    color: colors.error,
    textDecorationLine: 'line-through',
  },
  bookedIcon: {
    position: 'absolute',
    top: -8,
    right: -8,
  },
  dateCard: {
    backgroundColor: colors.surface,
    borderRadius: theme.borderRadius.medium,
    padding: wp(4),
    marginBottom: hp(1.5),
    borderWidth: 2,
    borderColor: colors.border,
  },
  dateCardSelected: {
    borderColor: colors.statusConfirmed,
    backgroundColor: colors.primary + '10',
  },
  dateContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateInfo: {
    flex: 1,
  },
  dateDay: {
    fontSize: hp(1.5),
    fontWeight: theme.typography.fontWeight.semiBold as any,
    color: colors.textPrimary,
  },
  dateDisplay: {
    fontSize: hp(1.8),
    fontWeight: theme.typography.fontWeight.bold as any,
    color: colors.primary,
    marginTop: hp(0.3),
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: hp(2),
    paddingTop: hp(2),
  },
  backBtn: {
    flex: 0.45,
    backgroundColor: colors.border,
    paddingVertical: hp(2),
    borderRadius: theme.borderRadius.medium,
    alignItems: 'center',
  },
  backBtnText: {
    fontSize: hp(1.8),
    fontWeight: theme.typography.fontWeight.semiBold as any,
    color: colors.textPrimary,
  },
  nextBtn: {
    flex: 0.45,
    backgroundColor: colors.accent,
    paddingVertical: hp(2),
    borderRadius: theme.borderRadius.medium,
    alignItems: 'center',
  },
  nextBtnDisabled: {
    backgroundColor: colors.disabled,
    opacity: 0.6,
  },
  nextBtnText: {
    fontSize: hp(1.8),
    fontWeight: theme.typography.fontWeight.semiBold as any,
    color: colors.surface,
  },
  nextBtnTextDisabled: {
    color: colors.textSecondary,
  },
});
