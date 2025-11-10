import AppHeader from '@/components/AppHeader';
import { authApi } from '@/utils/auth/authApi';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from 'react-native-responsive-screen';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colorsSheet } from '../(settings)/_ui_elements';

export default function PatientManagementScreen() {
  const router = useRouter();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'confirmed'>('all');
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [doctorId, setDoctorId] = useState<string | null>(null);

  const styles = useMemo(() => getStyles(), []);

  useEffect(() => {
    fetchDoctorAppointments();
  }, []);

  const fetchDoctorAppointments = async () => {
    setIsLoading(true);
    try {
      // First, get the doctor status to get the doctor ID
      const doctorStatusResponse = await authApi.getDoctorStatus();
      
      if (!doctorStatusResponse.success || !doctorStatusResponse.doctor) {
        Alert.alert('Error', 'You need to register as a doctor first');
        setIsLoading(false);
        return;
      }

      const doctorIdValue = doctorStatusResponse.doctor.id;
      setDoctorId(doctorIdValue);

      // Then fetch appointments for this doctor
      const appointmentsResponse = await authApi.getDoctorAppointments(doctorIdValue);
      if (appointmentsResponse.success) {
        setAppointments(appointmentsResponse.appointments || []);
      } else {
        Alert.alert('Error', 'Failed to load appointment requests');
      }
    } catch (error) {
      console.error('Failed to fetch appointments:', error);
      Alert.alert('Error', 'Failed to load appointment requests');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApproveAppointment = async () => {
    if (!selectedAppointment || !doctorId) return;

    setIsProcessing(true);
    try {
      // Call the approve appointment API
      const response = await authApi.approveAppointment(doctorId, selectedAppointment._id);
      
      if (response.success) {
        Alert.alert(
          'Success',
          'Appointment request approved! Patient will be notified.',
          [
            {
              text: 'OK',
              onPress: () => {
                setShowModal(false);
                setSelectedAppointment(null);
                fetchDoctorAppointments();
              },
            },
          ]
        );
      } else {
        Alert.alert('Error', response.message || 'Failed to approve appointment');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to approve appointment');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRejectAppointment = async () => {
    if (!selectedAppointment || !doctorId) return;

    setIsProcessing(true);
    try {
      const response = await authApi.cancelAppointment(
        selectedAppointment._id,
        'Doctor rejected the appointment request',
        doctorId
      );
      
      if (response.success) {
        Alert.alert(
          'Success',
          'Appointment request rejected. Patient will be notified.',
          [
            {
              text: 'OK',
              onPress: () => {
                setShowModal(false);
                setSelectedAppointment(null);
                fetchDoctorAppointments();
              },
            },
          ]
        );
      } else {
        Alert.alert('Error', response.message || 'Failed to reject appointment');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to reject appointment');
    } finally {
      setIsProcessing(false);
    }
  };

  const getFilteredAppointments = () => {
    if (filterStatus === 'all') {
      return appointments;
    }
    return appointments.filter(apt => apt.status === filterStatus);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return colorsSheet.warning;
      case 'confirmed':
        return colorsSheet.success;
      case 'cancelled':
        return colorsSheet.error;
      default:
        return colorsSheet.textSecondary;
    }
  };

  const renderFilterButton = (status: 'all' | 'pending' | 'confirmed', label: string) => {
    const isActive = filterStatus === status;
    return (
      <TouchableOpacity
        style={[
          styles.filterButton,
          isActive && styles.filterButtonActive,
        ]}
        onPress={() => setFilterStatus(status)}
      >
        <Text
          style={[
            styles.filterButtonText,
            isActive && styles.filterButtonTextActive,
          ]}
        >
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderRequestItem = ({ item }: { item: any }) => {
    const appointmentDate = new Date(item.date);
    const dateString = appointmentDate.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

    return (
      <TouchableOpacity
        style={styles.requestCard}
        onPress={() => {
          setSelectedAppointment(item);
          setShowModal(true);
        }}
      >
        <View style={styles.requestContent}>
          <View style={styles.patientAvatar}>
            <Ionicons name="person" size={24} color={colorsSheet.primary} />
          </View>

          <View style={styles.requestInfo}>
            <Text style={styles.patientName}>Patient Request</Text>
            <Text style={styles.appointmentDateTime}>
              {dateString} at {item.time}
            </Text>
            <Text style={styles.consultationFee}>Consultation Fee: Rs {item.price}</Text>
          </View>

          <View style={styles.statusContainer}>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: getStatusColor(item.status) + '20' },
              ]}
            >
              <Text
                style={[
                  styles.statusBadgeText,
                  { color: getStatusColor(item.status) },
                ]}
              >
                {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const filteredAppointments = getFilteredAppointments();

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <AppHeader
          title="Patient Management"
          showStepIndicator={false}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colorsSheet.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader
        title="Patient Management"
        showStepIndicator={false}
      />

      <View style={styles.content}>
        {/* Filter Buttons */}
        <View style={styles.filterContainer}>
          {renderFilterButton('all', 'All Requests')}
          {renderFilterButton('pending', 'Pending')}
          {renderFilterButton('confirmed', 'Approved')}
        </View>

        {/* Appointments List */}
        {filteredAppointments.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons
              name="list-outline"
              size={64}
              color={colorsSheet.textSecondary}
            />
            <Text style={styles.emptyTitle}>No Requests</Text>
            <Text style={styles.emptySubtitle}>
              {filterStatus === 'all'
                ? 'You have no patient requests yet'
                : filterStatus === 'pending'
                ? 'No pending requests'
                : 'No approved appointments'}
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredAppointments}
            renderItem={renderRequestItem}
            keyExtractor={(item) => item._id}
            scrollEnabled={true}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContainer}
          />
        )}
      </View>

      {/* Appointment Request Details Modal */}
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
              <Ionicons name="close" size={28} color={colorsSheet.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Patient Request</Text>
            <View style={styles.headerSpacer} />
          </View>

          <ScrollView
            style={styles.modalContent}
            showsVerticalScrollIndicator={false}
          >
            {selectedAppointment && (
              <>
                {/* Patient Info */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Patient Information</Text>
                  <View style={styles.infoCard}>
                    <View style={styles.avatarLarge}>
                      <Ionicons
                        name="person"
                        size={40}
                        color={colorsSheet.primary}
                      />
                    </View>
                    <View style={styles.patientDetails}>
                      <Text style={styles.patientNameLarge}>{selectedAppointment.userName || 'Patient'}</Text>
                      <Text style={styles.patientEmail}>
                        {selectedAppointment.userEmail || 'N/A'}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Appointment Details */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Appointment Details</Text>

                  <View style={styles.detailRow}>
                    <Ionicons name="calendar" size={20} color={colorsSheet.info} />
                    <View style={styles.detailContent}>
                      <Text style={styles.detailLabel}>Date</Text>
                      <Text style={styles.detailValue}>
                        {new Date(selectedAppointment.date).toLocaleDateString(
                          'en-GB',
                          {
                            day: '2-digit',
                            month: 'long',
                            year: 'numeric',
                          }
                        )}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.detailRow}>
                    <Ionicons name="time" size={20} color={colorsSheet.warning} />
                    <View style={styles.detailContent}>
                      <Text style={styles.detailLabel}>Time</Text>
                      <Text style={styles.detailValue}>
                        {selectedAppointment.time}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.detailRow}>
                    <Ionicons name="cash" size={20} color={colorsSheet.success} />
                    <View style={styles.detailContent}>
                      <Text style={styles.detailLabel}>Consultation Fee</Text>
                      <Text style={styles.detailValue}>
                        Rs {selectedAppointment.price}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.detailRow}>
                    <Ionicons
                      name="document-text"
                      size={20}
                      color={colorsSheet.secondary}
                    />
                    <View style={styles.detailContent}>
                      <Text style={styles.detailLabel}>Patient Concern</Text>
                      <Text style={styles.detailValue}>
                        {selectedAppointment.description || 'No description provided'}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Status Section */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Request Status</Text>
                  <View
                    style={[
                      styles.statusDisplay,
                      {
                        borderLeftColor: getStatusColor(
                          selectedAppointment.status
                        ),
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.statusIcon,
                        {
                          backgroundColor:
                            getStatusColor(selectedAppointment.status) + '20',
                        },
                      ]}
                    >
                      <Ionicons
                        name={
                          selectedAppointment.status === 'pending'
                            ? 'hourglass'
                            : 'checkmark-circle'
                        }
                        size={24}
                        color={getStatusColor(selectedAppointment.status)}
                      />
                    </View>
                    <View style={styles.statusInfo}>
                      <Text style={styles.statusLabel}>Current Status</Text>
                      <Text
                        style={[
                          styles.statusValue,
                          {
                            color: getStatusColor(selectedAppointment.status),
                          },
                        ]}
                      >
                        {selectedAppointment.status.charAt(0).toUpperCase() +
                          selectedAppointment.status.slice(1)}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Action Buttons */}
                {selectedAppointment.status === 'pending' && (
                  <View style={styles.actionSection}>
                    <TouchableOpacity
                      style={[
                        styles.actionButton,
                        styles.approveButton,
                        isProcessing && styles.buttonDisabled,
                      ]}
                      onPress={handleApproveAppointment}
                      disabled={isProcessing}
                    >
                      {isProcessing ? (
                        <ActivityIndicator
                          color={colorsSheet.white}
                          size="small"
                        />
                      ) : (
                        <>
                          <Ionicons
                            name="checkmark-circle"
                            size={20}
                            color={colorsSheet.white}
                          />
                          <Text style={styles.actionButtonText}>
                            Approve Request
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.actionButton,
                        styles.rejectButton,
                        isProcessing && styles.buttonDisabled,
                      ]}
                      onPress={() => {
                        Alert.alert(
                          'Reject Request',
                          'Are you sure you want to reject this appointment request?',
                          [
                            { text: 'Cancel', onPress: () => {} },
                            {
                              text: 'Reject',
                              onPress: handleRejectAppointment,
                              style: 'destructive',
                            },
                          ]
                        );
                      }}
                      disabled={isProcessing}
                    >
                      {isProcessing ? (
                        <ActivityIndicator
                          color={colorsSheet.white}
                          size="small"
                        />
                      ) : (
                        <>
                          <Ionicons
                            name="close-circle"
                            size={20}
                            color={colorsSheet.white}
                          />
                          <Text style={styles.actionButtonText}>
                            Reject Request
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                )}

                {selectedAppointment.status === 'confirmed' && (
                  <View style={styles.approvedSection}>
                    <Ionicons name="checkmark-done" size={40} color={colorsSheet.success} />
                    <Text style={styles.approvedTitle}>Request Approved</Text>
                    <Text style={styles.approvedSubtitle}>
                      Patient has been notified about the appointment confirmation
                    </Text>
                  </View>
                )}

                <TouchableOpacity
                  style={styles.closeModalButton}
                  onPress={() => setShowModal(false)}
                >
                  <Text style={styles.closeModalButtonText}>Close</Text>
                </TouchableOpacity>
              </>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const getStyles = () =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colorsSheet.primary,
    },
    content: {
      flex: 1,
      backgroundColor: colorsSheet.screenColor,
      borderTopLeftRadius: 30,
      borderTopRightRadius: 30,
      paddingTop: hp(2),
    },
    filterContainer: {
      flexDirection: 'row',
      paddingHorizontal: wp(4),
      paddingVertical: hp(1.5),
      gap: wp(2),
    },
    filterButton: {
      paddingVertical: hp(0.8),
      paddingHorizontal: wp(3),
      borderRadius: 20,
      borderWidth: 1.5,
      borderColor: colorsSheet.lightGray,
      backgroundColor: colorsSheet.white,
    },
    filterButtonActive: {
      backgroundColor: colorsSheet.primary,
      borderColor: colorsSheet.primary,
    },
    filterButtonText: {
      fontSize: hp(1.4),
      fontWeight: '600',
      color: colorsSheet.textSecondary,
    },
    filterButtonTextActive: {
      color: colorsSheet.white,
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
      color: colorsSheet.textPrimary,
      marginTop: hp(2),
      marginBottom: hp(0.5),
    },
    emptySubtitle: {
      fontSize: hp(1.6),
      color: colorsSheet.textSecondary,
      textAlign: 'center',
    },
    listContainer: {
      paddingHorizontal: wp(4),
      paddingVertical: hp(1),
      paddingBottom: hp(3),
    },
    requestCard: {
      backgroundColor: colorsSheet.white,
      borderRadius: 15,
      padding: wp(4),
      marginBottom: hp(2),
      borderLeftWidth: 4,
      borderLeftColor: colorsSheet.primary,
      shadowColor: colorsSheet.primary,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    requestContent: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    patientAvatar: {
      width: wp(12),
      height: wp(12),
      borderRadius: wp(6),
      backgroundColor: colorsSheet.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: wp(3),
    },
    requestInfo: {
      flex: 1,
    },
    patientName: {
      fontSize: hp(1.8),
      fontWeight: '600',
      color: colorsSheet.textPrimary,
      marginBottom: hp(0.3),
    },
    appointmentDateTime: {
      fontSize: hp(1.5),
      color: colorsSheet.textSecondary,
      marginBottom: hp(0.3),
    },
    consultationFee: {
      fontSize: hp(1.4),
      fontWeight: '500',
      color: colorsSheet.success,
    },
    statusContainer: {
      marginLeft: wp(2),
    },
    statusBadge: {
      paddingVertical: hp(0.6),
      paddingHorizontal: wp(2.5),
      borderRadius: 8,
    },
    statusBadgeText: {
      fontSize: hp(1.2),
      fontWeight: '600',
    },
    // Modal Styles
    modalContainer: {
      flex: 1,
      backgroundColor: colorsSheet.screenColor,
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: wp(4),
      paddingVertical: hp(2),
      backgroundColor: colorsSheet.primary,
      borderBottomWidth: 1,
      borderBottomColor: colorsSheet.gray,
    },
    closeButton: {
      padding: hp(0.5),
    },
    modalTitle: {
      fontSize: hp(2.2),
      fontWeight: 'bold',
      color: colorsSheet.white,
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
      color: colorsSheet.textPrimary,
      marginBottom: hp(1),
    },
    infoCard: {
      flexDirection: 'row',
      backgroundColor: colorsSheet.white,
      borderRadius: 15,
      padding: wp(4),
      alignItems: 'center',
    },
    avatarLarge: {
      width: wp(16),
      height: wp(16),
      borderRadius: wp(8),
      backgroundColor: colorsSheet.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: wp(3),
    },
    patientDetails: {
      flex: 1,
    },
    patientNameLarge: {
      fontSize: hp(1.9),
      fontWeight: '600',
      color: colorsSheet.textPrimary,
      marginBottom: hp(0.3),
    },
    patientEmail: {
      fontSize: hp(1.4),
      color: colorsSheet.textSecondary,
    },
    detailRow: {
      flexDirection: 'row',
      backgroundColor: colorsSheet.white,
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
      color: colorsSheet.textSecondary,
      marginBottom: hp(0.3),
    },
    detailValue: {
      fontSize: hp(1.7),
      fontWeight: '600',
      color: colorsSheet.textPrimary,
    },
    statusDisplay: {
      flexDirection: 'row',
      backgroundColor: colorsSheet.white,
      borderRadius: 12,
      padding: wp(4),
      borderLeftWidth: 3,
      alignItems: 'center',
    },
    statusIcon: {
      width: wp(12),
      height: wp(12),
      borderRadius: wp(6),
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: wp(3),
    },
    statusInfo: {
      flex: 1,
    },
    statusLabel: {
      fontSize: hp(1.3),
      color: colorsSheet.textSecondary,
      marginBottom: hp(0.3),
    },
    statusValue: {
      fontSize: hp(1.8),
      fontWeight: 'bold',
    },
    actionSection: {
      gap: hp(1.2),
      marginBottom: hp(2),
    },
    actionButton: {
      flexDirection: 'row',
      paddingVertical: hp(1.8),
      paddingHorizontal: wp(6),
      borderRadius: 15,
      alignItems: 'center',
      justifyContent: 'center',
    },
    approveButton: {
      backgroundColor: colorsSheet.success,
    },
    rejectButton: {
      backgroundColor: colorsSheet.error,
    },
    buttonDisabled: {
      opacity: 0.6,
    },
    actionButtonText: {
      color: colorsSheet.white,
      fontSize: hp(1.7),
      fontWeight: '600',
      marginLeft: wp(2),
    },
    approvedSection: {
      backgroundColor: colorsSheet.white,
      borderRadius: 15,
      padding: wp(6),
      alignItems: 'center',
      marginBottom: hp(2),
      borderTopWidth: 3,
      borderTopColor: colorsSheet.success,
    },
    approvedTitle: {
      fontSize: hp(2.2),
      fontWeight: 'bold',
      color: colorsSheet.textPrimary,
      marginTop: hp(1),
      marginBottom: hp(0.5),
    },
    approvedSubtitle: {
      fontSize: hp(1.5),
      color: colorsSheet.textSecondary,
      textAlign: 'center',
    },
    closeModalButton: {
      backgroundColor: colorsSheet.gray,
      paddingVertical: hp(1.8),
      paddingHorizontal: wp(6),
      borderRadius: 15,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: hp(3),
    },
    closeModalButtonText: {
      color: colorsSheet.textPrimary,
      fontSize: hp(1.7),
      fontWeight: '600',
    },
  });
