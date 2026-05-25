import AppHeader from '@/components/AppHeader';
import ChatButton from '@/components/ChatButton';
import AnimatedPressable from '@/components/common/AnimatedPressable';
import FilterChips from '@/components/common/FilterChips';
import SmartEmptyState from '@/components/common/SmartEmptyState';
import { theme } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';
import { authApi } from '@/utils/auth/authApi';
import { getApiErrorMessage, isForbiddenRouteError, isSessionExpiredError } from '@/utils/auth/authErrors';
import { tokenStorage } from '@/utils/auth/tokenStorage';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from 'react-native-responsive-screen';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

const getErrorMessage = (error: any): string => {
  if (typeof error === 'string') return error;
  return getApiErrorMessage(error, 'Failed to load appointments');
};

export default function MyAppointmentsScreen() {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const insets = useSafeAreaInsets();
  const appointmentListContainerStyle = [
    styles.listContainer,
    { paddingBottom: insets.bottom + hp(2) },
  ];
  const router = useRouter();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchAppointments = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await authApi.getUserAppointments();
      if (response.success) {
        setAppointments(response.appointments || []);
      } else {
        Alert.alert('Error', 'Failed to load appointments');
      }
    } catch (error) {
      const message = getErrorMessage(error);
      if (isSessionExpiredError(error)) {
        console.log('[MyAppointments] Unauthorized appointment fetch:', message);
        setAppointments([]);
        await tokenStorage.clearAll();
        Alert.alert('Session expired', 'Please sign in again.', [
          { text: 'OK', onPress: () => router.replace('/(auth)') },
        ]);
      } else if (isForbiddenRouteError(error)) {
        console.log('[MyAppointments] Forbidden appointment fetch:', message);
        setAppointments([]);
        Alert.alert('Access denied', message);
      } else {
        console.log('Failed to fetch appointments:', error);
        Alert.alert('Error', 'Failed to load appointments');
      }
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  // Fetch user's appointments
  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

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
        return colors.statusPending;
      case 'confirmed':
        return colors.statusConfirmed;
      case 'cancelled':
        return colors.statusCancelled;
      case 'completed':
        return colors.success;
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

  const appointmentCounts = useMemo(() => {
    const counts = { all: appointments.length, pending: 0, confirmed: 0, completed: 0, cancelled: 0 };
    appointments.forEach((apt) => {
      const status = String(apt.status || '').toLowerCase();
      if (status in counts) {
        counts[status as keyof typeof counts] += 1;
      }
    });
    return counts;
  }, [appointments]);

  const filterOptions = useMemo(
    () => [
      { label: 'All', value: 'all', icon: 'calendar-outline' as const, badge: appointmentCounts.all },
      { label: 'Pending', value: 'pending', icon: 'hourglass-outline' as const, badge: appointmentCounts.pending },
      { label: 'Confirmed', value: 'confirmed', icon: 'checkmark-circle-outline' as const, badge: appointmentCounts.confirmed },
      { label: 'Completed', value: 'completed', icon: 'checkmark-done-outline' as const, badge: appointmentCounts.completed },
      { label: 'Cancelled', value: 'cancelled', icon: 'close-circle-outline' as const, badge: appointmentCounts.cancelled },
    ],
    [appointmentCounts]
  );

  const filteredAppointments = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return appointments.filter((apt) => {
      const status = String(apt.status || '').toLowerCase();
      const matchesStatus = statusFilter === 'all' || status === statusFilter;
      const doctorName = `${apt.doctorId?.personalInfo?.firstName || ''} ${apt.doctorId?.personalInfo?.lastName || ''}`;
      const searchable = [
        doctorName,
        apt.doctorId?.professionalInfo?.specialization,
        apt.time,
        apt.description,
        apt.status,
      ].join(' ').toLowerCase();

      return matchesStatus && (!query || searchable.includes(query));
    });
  }, [appointments, searchQuery, statusFilter]);

  // Sort appointments by status: confirmed/completed first, then pending, then cancelled
  const getSortedAppointments = () => {
    const confirmed = filteredAppointments.filter(
      apt => apt.status === 'confirmed' || apt.status === 'completed'
    );
    const pending = filteredAppointments.filter(apt => apt.status === 'pending');
    const cancelled = filteredAppointments.filter(apt => apt.status === 'cancelled');
    
    return [...confirmed, ...pending, ...cancelled];
  };

  const renderStatusHeader = (status: string) => {
    let icon = '';
    let label = '';
    let color = colors.textSecondary;

    if (status === 'confirmed' || status === 'completed') {
      icon = 'checkmark-circle';
      label = 'Confirmed Appointments';
      color = colors.statusConfirmed;
    } else if (status === 'pending') {
      icon = 'hourglass';
      label = 'Pending Appointments';
      color = colors.statusPending;
    } else if (status === 'cancelled') {
      icon = 'close-circle';
      label = 'Cancelled Appointments';
      color = colors.statusCancelled;
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
          const previousItem = items[items.length - 1] as any;
          if (previousItem?.type === 'appointment') {
            previousItem.isBeforeStatusHeader = true;
          }
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
        contentContainerStyle={appointmentListContainerStyle}
      >
        {items.map((item: any) => {
          if (item.type === 'header') {
            return (
              <View key={item.key}>
                {renderStatusHeader(item.status)}
              </View>
            );
          } else if (item.type === 'spacer') {
            return <View key={item.key} style={styles.statusGroupSpacer} />;
          } else {
            return (
              <View key={item.key}>
                {renderAppointmentItem({
                  item: item.data,
                  isBeforeStatusHeader: item.isBeforeStatusHeader,
                })}
              </View>
            );
          }
        })}
      </ScrollView>
    );
  };

  const renderAppointmentItem = ({
    item,
    isBeforeStatusHeader = false,
  }: {
    item: any;
    isBeforeStatusHeader?: boolean;
  }) => {
    const appointmentDate = new Date(item.date);
    const dateString = appointmentDate.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

    const isUpcoming = new Date(item.date) > new Date() && item.status !== 'cancelled';
    const canCancel = item.status !== 'cancelled' && item.status !== 'completed';

    return (
      <AnimatedPressable
        style={[
          styles.appointmentCard,
          isBeforeStatusHeader && styles.appointmentCardBeforeStatusHeader,
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
                { backgroundColor: colors.primary + '20' },
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
      </AnimatedPressable>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <StatusBar
          barStyle="dark-content"
          backgroundColor="#FFFFFF"
          translucent={false}
        />
        <View style={styles.container}>
          <AppHeader
            title="My Appointments"
            showStepIndicator={false}
          />
          <View style={styles.content}>
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="#FFFFFF"
        translucent={false}
      />
      <View style={styles.container}>
        <AppHeader
          title="My Appointments"
          showStepIndicator={false}
        />

        <View style={styles.content}>
          <View style={styles.timelineSummary}>
            {filterOptions.slice(1).map((option) => (
              <View key={option.value} style={styles.timelineStep}>
                <View style={[styles.timelineDot, { backgroundColor: getStatusColor(option.value) }]}>
                  <Text style={styles.timelineCount}>{option.badge}</Text>
                </View>
                <Text style={styles.timelineLabel} numberOfLines={1}>{option.label}</Text>
              </View>
            ))}
          </View>

          <View style={styles.searchWrap}>
            <Ionicons name="search" size={20} color={colors.textSecondary} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search appointments"
              placeholderTextColor={colors.textSecondary}
              style={styles.searchInput}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>

          <FilterChips
            options={filterOptions}
            selectedValue={statusFilter}
            onChange={setStatusFilter}
            colors={colors}
            style={styles.filterChips}
          />

          {appointments.length === 0 ? (
            <SmartEmptyState
              icon="calendar-outline"
              title="No Appointments"
              message="Book a consultation and your upcoming, pending, completed, and cancelled appointments will appear here."
              actionLabel="Book Appointment"
              onAction={() => router.push('/(main)/(conference)/doctor-time-date-selection')}
              colors={colors}
              style={styles.emptySmartState}
            />
          ) : filteredAppointments.length === 0 ? (
            <SmartEmptyState
              icon="filter-outline"
              title="No Matches"
              message="Try another status, clear search, or check a different appointment type."
              colors={colors}
              style={styles.emptySmartState}
            />
          ) : (
            renderAppointmentListByStatus()
          )}
        </View>
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
                          <Ionicons name="create" size={20} color={colors.surface} />
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
                              <ActivityIndicator color={colors.surface} />
                              <Text style={styles.actionButtonText}>Cancelling...</Text>
                            </>
                          ) : (
                            <>
                              <Ionicons name="trash" size={20} color={colors.surface} />
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

const getStyles = (colors: any) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.screenColor,
  },
  container: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  content: {
    flex: 1,
    paddingTop: hp(0.5),
    backgroundColor: colors.screenColor,
  },
  timelineSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: wp(4),
    paddingTop: hp(1.3),
    paddingBottom: hp(0.8),
  },
  timelineStep: {
    flex: 1,
    alignItems: 'center',
    position: 'relative',
  },
  timelineDot: {
    width: hp(4.5),
    height: hp(4.5),
    borderRadius: hp(2.25),
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.screenColor,
  },
  timelineCount: {
    color: colors.textOnPrimary,
    fontSize: Math.min(hp(1.45), wp(3.2)),
    fontWeight: '900',
  },
  timelineLabel: {
    marginTop: hp(0.55),
    color: colors.textSecondary,
    fontSize: Math.min(hp(1.25), wp(2.8)),
    fontWeight: '800',
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: hp(5.5),
    marginHorizontal: wp(4),
    marginTop: hp(0.8),
    marginBottom: hp(0.7),
    paddingHorizontal: wp(3.5),
    borderRadius: hp(1.6),
    borderWidth: 1,
    borderColor: colors.cardBorder || colors.border,
    backgroundColor: colors.cardBackground,
    gap: wp(2),
  },
  searchInput: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: Math.min(hp(1.75), wp(3.9)),
    fontWeight: '600',
    paddingVertical: hp(1),
  },
  filterChips: {
    paddingTop: hp(0.4),
    paddingBottom: hp(1),
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
  emptySmartState: {
    width: wp(90),
    alignSelf: 'center',
    marginTop: hp(2),
    marginBottom: hp(2),
  },
  emptyTitle: {
    fontSize: hp(2.5),
    fontWeight: theme.typography.fontWeight.bold as any,
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
    borderRadius: theme.borderRadius.large,
    alignItems: 'center',
  },
  scheduleButtonText: {
    color: colors.surface,
    fontSize: hp(1.8),
    fontWeight: theme.typography.fontWeight.semiBold as any,
  },
  listContainer: {
    paddingHorizontal: wp(4),
    paddingTop: hp(0.5),
    paddingBottom: hp(3),
  },
  listScroll: {
    flex: 1,
  },
  statusGroupSpacer: {
    height: hp(0.2),
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: hp(1),
    paddingHorizontal: wp(2),
    marginTop: hp(0.2),
    marginBottom: hp(1),
  },
  sectionHeaderText: {
    fontSize: hp(1.8),
    fontWeight: theme.typography.fontWeight.bold as any,
    marginLeft: wp(2),
  },
  appointmentCard: {
    backgroundColor: colors.surface,
    borderRadius: theme.borderRadius.large,
    padding: wp(4),
    marginBottom: hp(2),
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    ...theme.shadows.medium,
  },
  appointmentCardBeforeStatusHeader: {
    marginBottom: hp(0.5),
  },
  appointmentCardCancelled: {
    opacity: 0.6,
    borderLeftColor: colors.statusCancelled,
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
    borderRadius: theme.borderRadius.medium,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateBoxDay: {
    fontSize: hp(2),
    fontWeight: theme.typography.fontWeight.bold as any,
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
    fontWeight: theme.typography.fontWeight.semiBold as any,
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
    borderRadius: theme.borderRadius.small,
    alignItems: 'center',
  },
  statusText: {
    fontSize: hp(1.2),
    fontWeight: theme.typography.fontWeight.medium as any,
    marginLeft: wp(1),
  },
  upcomingBadge: {
    flexDirection: 'row',
    marginTop: hp(1),
    paddingTop: hp(1),
    borderTopWidth: 1,
    borderTopColor: colors.border,
    alignItems: 'center',
  },
  upcomingText: {
    fontSize: hp(1.3),
    color: colors.success,
    fontWeight: theme.typography.fontWeight.medium as any,
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
    borderBottomColor: colors.border,
  },
  closeButton: {
    padding: hp(0.5),
  },
  modalTitle: {
    fontSize: hp(2.2),
    fontWeight: theme.typography.fontWeight.bold as any,
    color: colors.surface,
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
    fontWeight: theme.typography.fontWeight.bold as any,
    color: colors.textPrimary,
    marginBottom: hp(1),
  },
  doctorInfoCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: theme.borderRadius.large,
    padding: wp(4),
    alignItems: 'center',
  },
  doctorAvatar: {
    width: wp(16),
    height: wp(16),
    borderRadius: wp(8),
    backgroundColor: colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: wp(3),
  },
  doctorDetails: {
    flex: 1,
  },
  doctorNameLarge: {
    fontSize: hp(1.9),
    fontWeight: theme.typography.fontWeight.semiBold as any,
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
    backgroundColor: colors.surface,
    borderRadius: theme.borderRadius.medium,
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
    fontWeight: theme.typography.fontWeight.semiBold as any,
    color: colors.textPrimary,
  },
  descriptionBox: {
    backgroundColor: colors.surface,
    borderRadius: theme.borderRadius.medium,
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
    borderRadius: theme.borderRadius.large,
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
    color: colors.surface,
    fontSize: hp(1.7),
    fontWeight: theme.typography.fontWeight.semiBold as any,
    marginLeft: wp(2),
  },
  closeModalButton: {
    backgroundColor: colors.border,
  },
  closeModalButtonText: {
    color: colors.textPrimary,
    fontSize: hp(1.7),
    fontWeight: theme.typography.fontWeight.semiBold as any,
  },
});
