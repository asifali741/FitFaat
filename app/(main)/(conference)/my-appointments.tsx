import AppHeader from '@/components/AppHeader';
import ChatButton from '@/components/ChatButton';
import { useTheme } from '@/contexts/ThemeContext';
import { authApi } from '@/utils/auth/authApi';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from 'react-native-responsive-screen';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function MyAppointmentsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  const styles = useMemo(() => getStyles(colors), [colors]);

  // Fetch user's appointments
  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    setIsLoading(true);
    try {
      const response = await authApi.getUserAppointments();
      if (response.success) {
        setAppointments(response.appointments || []);
      } else {
        Alert.alert('Error', 'Failed to load appointments');
      }
    } catch (error) {
      console.error('Failed to fetch appointments:', error);
      Alert.alert('Error', 'Failed to load appointments');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelAppointment = async () => {
    if (!selectedAppointment) return;

    setIsCancelling(true);
    try {
      const response = await authApi.cancelAppointment(
        selectedAppointment._id,
        'User requested cancellation'
      );

      if (response.success) {
        Alert.alert('Success', 'Appointment cancelled successfully');
        setShowModal(false);
        setSelectedAppointment(null);
        fetchAppointments();
      } else {
        Alert.alert('Error', response.message || 'Failed to cancel appointment');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to cancel appointment');
    } finally {
      setIsCancelling(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return colors.warning;
      case 'confirmed':
        return colors.success;
      case 'cancelled':
        return colors.error;
      case 'completed':
        return colors.info;
      default:
        return colors.textSecondary;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return 'hourglass';
      case 'confirmed':
        return 'checkmark-circle';
      case 'cancelled':
        return 'close-circle';
      case 'completed':
        return 'checkmark-done';
      default:
        return 'help-circle';
    }
  };

  // Sort appointments by status: confirmed/completed first, then pending, then cancelled
  const getSortedAppointments = () => {
    const confirmed = appointments.filter(
      apt => apt.status === 'confirmed' || apt.status === 'completed'
    );
    const pending = appointments.filter(apt => apt.status === 'pending');
    const cancelled = appointments.filter(apt => apt.status === 'cancelled');
    
    return [...confirmed, ...pending, ...cancelled];
  };

  const renderStatusHeader = (status: string) => {
    let icon = '';
    let label = '';
    let color = colors.textSecondary;

    if (status === 'confirmed' || status === 'completed') {
      icon = 'checkmark-circle';
      label = 'Confirmed Appointments';
      color = colors.success;
    } else if (status === 'pending') {
      icon = 'hourglass';
      label = 'Pending Appointments';
      color = colors.warning;
    } else if (status === 'cancelled') {
      icon = 'close-circle';
      label = 'Cancelled Appointments';
      color = colors.error;
    }

    return (
      <View style={styles.sectionHeader}>
        <Ionicons name={icon as any} size={20} color={color} />
        <Text style={[styles.sectionHeaderText, { color }]}>{label}</Text>
      </View>
    );
  };

  const renderAppointmentListByStatus = () => {
    const sortedAppointments = getSortedAppointments();
    
    if (sortedAppointments.length === 0) {
      return null;
    }

    let currentStatus = '';
    const items = [];

    for (const appointment of sortedAppointments) {
      const appointmentStatus = appointment.status === 'completed' ? 'confirmed' : appointment.status;
      
      if (appointmentStatus !== currentStatus) {
        if (currentStatus !== '') {
          items.push({ type: 'spacer', key: `spacer-${currentStatus}` });
        }
        items.push({ type: 'header', status: appointmentStatus, key: `header-${appointmentStatus}` });
        currentStatus = appointmentStatus;
      }
      
      items.push({ type: 'appointment', data: appointment, key: appointment._id });
    }

    return (
      <ScrollView
        style={styles.listScroll}
        scrollEnabled={true}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContainer}
      >
        {items.map((item: any) => {
          if (item.type === 'header') {
            return (
              <View key={item.key}>
                {renderStatusHeader(item.status)}
              </View>
            );
          } else if (item.type === 'spacer') {
            return <View key={item.key} style={{ height: hp(1) }} />;
          } else {
            return (
              <View key={item.key}>
                {renderAppointmentItem({ item: item.data })}
              </View>
            );
          }
        })}
      </ScrollView>
    );
  };

  const renderAppointmentItem = ({ item }: { item: any }) => {
    const appointmentDate = new Date(item.date);
    const dateString = appointmentDate.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

    const isUpcoming = new Date(item.date) > new Date() && item.status !== 'cancelled';
    const canCancel = item.status !== 'cancelled' && item.status !== 'completed';

    return (
      <TouchableOpacity
        style={[
          styles.appointmentCard,
          item.status === 'cancelled' && styles.appointmentCardCancelled,
        ]}
        onPress={() => {
          setSelectedAppointment(item);
          setShowModal(true);
        }}
      >
        <View style={styles.appointmentContent}>
          <View style={styles.appointmentLeft}>
            <View
              style={[
                styles.dateBox,
                { backgroundColor: colors.primarySoft },
              ]}
            >
              <Text style={styles.dateBoxDay}>
                {appointmentDate.getDate()}
              </Text>
              <Text style={styles.dateBoxMonth}>
                {appointmentDate.toLocaleDateString('en-GB', {
                  month: 'short',
                })}
              </Text>
            </View>
          </View>

          <View style={styles.appointmentMiddle}>
            <Text style={styles.doctorName}>{item.doctorId?.personalInfo?.firstName || 'Doctor'}</Text>
            <Text style={styles.doctorSpecialty}>
              {item.doctorId?.professionalInfo?.specialization || 'Specialist'}
            </Text>
            <View style={styles.timeRow}>
              <Ionicons name="time" size={14} color={colors.textSecondary} />
              <Text style={styles.timeText}>{item.time}</Text>
            </View>
          </View>

          <View style={styles.appointmentRight}>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: getStatusColor(item.status) + '20' },
              ]}
            >
              <Ionicons
                name={getStatusIcon(item.status)}
                size={18}
                color={getStatusColor(item.status)}
              />
              <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
              </Text>
            </View>
          </View>
        </View>

        {isUpcoming && (
          <View style={styles.upcomingBadge}>
            <Ionicons name="alert-circle" size={14} color={colors.success} />
            <Text style={styles.upcomingText}>Upcoming</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <AppHeader
          title="My Appointments"
          showStepIndicator={false}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader
        title="My Appointments"
        showStepIndicator={false}
      />

      <View style={[styles.content, { backgroundColor: colors.screenColor }]}>
        {appointments.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="calendar-outline" size={64} color={colors.textSecondary} />
            <Text style={styles.emptyTitle}>No Appointments</Text>
            <Text style={styles.emptySubtitle}>
              You don't have any appointments yet
            </Text>
            <TouchableOpacity
              style={styles.scheduleButton}
              onPress={() => router.push('/(main)/(conference)/doctor-time-date-selection')}
            >
              <Text style={styles.scheduleButtonText}>Schedule Your First Appointment</Text>
            </TouchableOpacity>
          </View>
        ) : (
          renderAppointmentListByStatus()
        )}
      </View>

      {/* Appointment Details Modal */}
      <Modal
        visible={showModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => setShowModal(false)}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={28} color={colors.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Appointment Details</Text>
            <View style={styles.headerSpacer} />
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {selectedAppointment && (
              <>
                {/* Doctor Info */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Doctor</Text>
                  <View style={styles.doctorInfoCard}>
                    <View style={styles.doctorAvatar}>
                      <Ionicons name="person" size={40} color={colors.primary} />
                    </View>
                    <View style={styles.doctorDetails}>
                      <Text style={styles.doctorNameLarge}>
                        {selectedAppointment.doctorId?.personalInfo?.firstName || 'Doctor'} {selectedAppointment.doctorId?.personalInfo?.lastName || ''}
                      </Text>
                      <Text style={styles.doctorSpecialtyLarge}>
                        {selectedAppointment.doctorId?.professionalInfo?.specialization || 'Specialist'}
                      </Text>
                      <Text style={styles.doctorExperience}>
                        {selectedAppointment.doctorId?.professionalInfo?.yearsOfExperience || 0} years experience
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Appointment Details */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Appointment Details</Text>

                  <View style={styles.detailRow}>
                    <Ionicons name="calendar" size={20} color={colors.info} />
                    <View style={styles.detailContent}>
                      <Text style={styles.detailLabel}>Date</Text>
                      <Text style={styles.detailValue}>
                        {new Date(selectedAppointment.date).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: 'long',
                          year: 'numeric',
                        })}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.detailRow}>
                    <Ionicons name="time" size={20} color={colors.warning} />
                    <View style={styles.detailContent}>
                      <Text style={styles.detailLabel}>Time</Text>
                      <Text style={styles.detailValue}>{selectedAppointment.time}</Text>
                    </View>
                  </View>

                  <View style={styles.detailRow}>
                    <Ionicons name="cash" size={20} color={colors.success} />
                    <View style={styles.detailContent}>
                      <Text style={styles.detailLabel}>Consultation Fee</Text>
                      <Text style={styles.detailValue}>Rs {selectedAppointment.price}</Text>
                    </View>
                  </View>

                  <View style={styles.detailRow}>
                    <Ionicons
                      name={getStatusIcon(selectedAppointment.status)}
                      size={20}
                      color={getStatusColor(selectedAppointment.status)}
                    />
                    <View style={styles.detailContent}>
                      <Text style={styles.detailLabel}>Status</Text>
                      <Text
                        style={[
                          styles.detailValue,
                          {
                            color: getStatusColor(selectedAppointment.status),
                            fontWeight: '600',
                          },
                        ]}
                      >
                        {selectedAppointment.status.charAt(0).toUpperCase() +
                          selectedAppointment.status.slice(1)}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Concern/Description */}
                {selectedAppointment.description && (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Your Concern</Text>
                    <View style={styles.descriptionBox}>
                      <Text style={styles.descriptionText}>
                        {selectedAppointment.description}
                      </Text>
                    </View>
                  </View>
                )}

                {/* Action Buttons */}
                <View style={styles.section}>
                  {/* Chat Button - Shows only for confirmed appointments */}
                  {selectedAppointment.status === 'confirmed' && (
                    <View style={styles.chatButtonContainer}>
                      <ChatButton 
                        appointmentId={selectedAppointment._id} 
                        size="large"
                        style={styles.chatButton}
                      />
                    </View>
                  )}

                  {selectedAppointment.status !== 'cancelled' &&
                    selectedAppointment.status !== 'completed' && (
                      <>
                        <TouchableOpacity
                          style={[
                            styles.actionButton,
                            styles.updateButton,
                          ]}
                          onPress={() => {
                            Alert.alert('Update', 'Update functionality coming soon!');
                          }}
                        >
                          <Ionicons name="create" size={20} color={colors.white} />
                          <Text style={styles.actionButtonText}>Update Appointment</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[
                            styles.actionButton,
                            styles.cancelButton,
                            isCancelling && styles.cancelButtonDisabled,
                          ]}
                          onPress={() => {
                            Alert.alert(
                              'Cancel Appointment',
                              'Are you sure you want to cancel this appointment?',
                              [
                                { text: 'No', onPress: () => {} },
                                {
                                  text: 'Yes, Cancel',
                                  onPress: handleCancelAppointment,
                                  style: 'destructive',
                                },
                              ]
                            );
                          }}
                          disabled={isCancelling}
                        >
                          {isCancelling ? (
                            <>
                              <ActivityIndicator color={colors.white} />
                              <Text style={styles.actionButtonText}>Cancelling...</Text>
                            </>
                          ) : (
                            <>
                              <Ionicons name="trash" size={20} color={colors.white} />
                              <Text style={styles.actionButtonText}>Cancel Appointment</Text>
                            </>
                          )}
                        </TouchableOpacity>
                      </>
                    )}

                  <TouchableOpacity
                    style={[styles.actionButton, styles.closeModalButton]}
                    onPress={() => setShowModal(false)}
                  >
                    <Text style={styles.closeModalButtonText}>Close</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const getStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.primary,
    },
    content: {
      flex: 1,
      borderTopLeftRadius: 30,
      borderTopRightRadius: 30,
      paddingTop: hp(2),
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
      paddingHorizontal: wp(6),
    },
    emptyTitle: {
      fontSize: hp(2.5),
      fontWeight: 'bold',
      color: colors.textPrimary,
      marginTop: hp(2),
      marginBottom: hp(0.5),
    },
    emptySubtitle: {
      fontSize: hp(1.6),
      color: colors.textSecondary,
      textAlign: 'center',
      marginBottom: hp(3),
    },
    scheduleButton: {
      backgroundColor: colors.primary,
      paddingVertical: hp(1.8),
      paddingHorizontal: wp(6),
      borderRadius: 20,
      alignItems: 'center',
    },
    scheduleButtonText: {
      color: colors.white,
      fontSize: hp(1.8),
      fontWeight: '600',
    },
    listContainer: {
      paddingHorizontal: wp(4),
      paddingVertical: hp(2),
      paddingBottom: hp(3),
    },
    listScroll: {
      flex: 1,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: hp(1.5),
      paddingHorizontal: wp(2),
      marginTop: hp(1),
      marginBottom: hp(1),
    },
    sectionHeaderText: {
      fontSize: hp(1.8),
      fontWeight: '700',
      marginLeft: wp(2),
    },
    appointmentCard: {
      backgroundColor: colors.white,
      borderRadius: 15,
      padding: wp(4),
      marginBottom: hp(2),
      borderLeftWidth: 4,
      borderLeftColor: colors.primary,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    appointmentCardCancelled: {
      opacity: 0.6,
      borderLeftColor: colors.error,
    },
    appointmentContent: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    appointmentLeft: {
      marginRight: wp(3),
    },
    dateBox: {
      width: wp(14),
      paddingVertical: hp(1),
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    dateBoxDay: {
      fontSize: hp(2),
      fontWeight: 'bold',
      color: colors.textPrimary,
    },
    dateBoxMonth: {
      fontSize: hp(1.2),
      color: colors.textSecondary,
      marginTop: hp(0.2),
    },
    appointmentMiddle: {
      flex: 1,
    },
    doctorName: {
      fontSize: hp(1.8),
      fontWeight: '600',
      color: colors.textPrimary,
      marginBottom: hp(0.3),
    },
    doctorSpecialty: {
      fontSize: hp(1.4),
      color: colors.textSecondary,
      marginBottom: hp(0.5),
    },
    timeRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    timeText: {
      fontSize: hp(1.4),
      color: colors.textSecondary,
      marginLeft: wp(1),
    },
    appointmentRight: {
      marginLeft: wp(2),
    },
    statusBadge: {
      flexDirection: 'row',
      paddingVertical: hp(0.6),
      paddingHorizontal: wp(2),
      borderRadius: 8,
      alignItems: 'center',
    },
    statusText: {
      fontSize: hp(1.2),
      fontWeight: '500',
      marginLeft: wp(1),
    },
    upcomingBadge: {
      flexDirection: 'row',
      marginTop: hp(1),
      paddingTop: hp(1),
      borderTopWidth: 1,
      borderTopColor: colors.gray,
      alignItems: 'center',
    },
    upcomingText: {
      fontSize: hp(1.3),
      color: colors.success,
      fontWeight: '500',
      marginLeft: wp(1),
    },
    // Modal Styles
    modalContainer: {
      flex: 1,
      backgroundColor: colors.screenColor,
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: wp(4),
      paddingVertical: hp(2),
      backgroundColor: colors.primary,
      borderBottomWidth: 1,
      borderBottomColor: colors.gray,
    },
    closeButton: {
      padding: hp(0.5),
    },
    modalTitle: {
      fontSize: hp(2.2),
      fontWeight: 'bold',
      color: colors.white,
    },
    headerSpacer: {
      width: hp(3),
    },
    modalContent: {
      flex: 1,
      paddingHorizontal: wp(4),
      paddingVertical: hp(2),
    },
    section: {
      marginBottom: hp(2.5),
    },
    sectionTitle: {
      fontSize: hp(2),
      fontWeight: 'bold',
      color: colors.textPrimary,
      marginBottom: hp(1),
    },
    doctorInfoCard: {
      flexDirection: 'row',
      backgroundColor: colors.white,
      borderRadius: 15,
      padding: wp(4),
      alignItems: 'center',
    },
    doctorAvatar: {
      width: wp(16),
      height: wp(16),
      borderRadius: wp(8),
      backgroundColor: colors.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: wp(3),
    },
    doctorDetails: {
      flex: 1,
    },
    doctorNameLarge: {
      fontSize: hp(1.9),
      fontWeight: '600',
      color: colors.textPrimary,
      marginBottom: hp(0.3),
    },
    doctorSpecialtyLarge: {
      fontSize: hp(1.5),
      color: colors.primary,
      marginBottom: hp(0.3),
    },
    doctorExperience: {
      fontSize: hp(1.4),
      color: colors.textSecondary,
    },
    detailRow: {
      flexDirection: 'row',
      backgroundColor: colors.white,
      borderRadius: 12,
      padding: wp(4),
      marginBottom: hp(1),
      alignItems: 'flex-start',
    },
    detailContent: {
      flex: 1,
      marginLeft: wp(3),
    },
    detailLabel: {
      fontSize: hp(1.3),
      color: colors.textSecondary,
      marginBottom: hp(0.3),
    },
    detailValue: {
      fontSize: hp(1.7),
      fontWeight: '600',
      color: colors.textPrimary,
    },
    descriptionBox: {
      backgroundColor: colors.white,
      borderRadius: 12,
      padding: wp(4),
      borderLeftWidth: 3,
      borderLeftColor: colors.primary,
    },
    descriptionText: {
      fontSize: hp(1.6),
      color: colors.textPrimary,
      lineHeight: hp(2.4),
    },
    chatButtonContainer: {
      marginBottom: hp(2),
      alignItems: 'center',
    },
    chatButton: {
      width: '100%',
    },
    actionButton: {
      flexDirection: 'row',
      paddingVertical: hp(1.8),
      paddingHorizontal: wp(6),
      borderRadius: 15,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: hp(1.2),
    },
    updateButton: {
      backgroundColor: colors.info,
    },
    cancelButton: {
      backgroundColor: colors.error,
    },
    cancelButtonDisabled: {
      opacity: 0.6,
    },
    actionButtonText: {
      color: colors.white,
      fontSize: hp(1.7),
      fontWeight: '600',
      marginLeft: wp(2),
    },
    closeModalButton: {
      backgroundColor: colors.gray,
    },
    closeModalButtonText: {
      color: colors.textPrimary,
      fontSize: hp(1.7),
      fontWeight: '600',
    },
  });
