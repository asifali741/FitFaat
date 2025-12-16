import AppHeader from '@/components/AppHeader';
import { authApi } from '@/utils/auth/authApi';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from 'react-native-responsive-screen';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function AllChatsScreen() {
  const router = useRouter();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [doctorId, setDoctorId] = useState<string | null>(null);

  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    setIsLoading(true);
    try {
      const doctorStatusResponse = await authApi.getDoctorStatus();
      
      if (!doctorStatusResponse.success || !doctorStatusResponse.doctor) {
        Alert.alert('Error', 'You need to register as a doctor first');
        router.back();
        return;
      }

      const doctorIdValue = doctorStatusResponse.doctor.id;
      setDoctorId(doctorIdValue);

      const appointmentsResponse = await authApi.getDoctorAppointments(doctorIdValue);
      if (appointmentsResponse.success) {
        // Filter only confirmed appointments
        const confirmedAppointments = (appointmentsResponse.appointments || [])
          .filter((apt: any) => apt.status === 'confirmed')
          .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setAppointments(confirmedAppointments);
      }
    } catch (error) {
      console.error('Failed to fetch appointments:', error);
      Alert.alert('Error', 'Failed to load appointments');
    } finally {
      setIsLoading(false);
    }
  };

  const openChat = (appointmentId: string) => {
    router.push({
      pathname: '/(main)/(conference)/appointment-chat',
      params: { appointmentId }
    });
  };

  const renderAppointment = ({ item }: { item: any }) => {
    const appointmentDate = new Date(item.date);
    const formattedDate = appointmentDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });

    return (
      <TouchableOpacity
        style={styles.appointmentCard}
        onPress={() => openChat(item._id)}
        activeOpacity={0.7}
      >
        <View style={styles.appointmentHeader}>
          <View style={styles.patientInfo}>
            <Ionicons name="person-circle" size={40} color="#007AFF" />
            <View style={styles.patientDetails}>
              <Text style={styles.patientName}>{item.userName || 'Patient'}</Text>
              <Text style={styles.appointmentDate}>{formattedDate} at {item.time}</Text>
            </View>
          </View>
          <View style={styles.chatIconContainer}>
            <Ionicons name="chatbubbles" size={24} color="#007AFF" />
            {item.chatAccessGrantedAt && (
              <View style={styles.accessBadge}>
                <Text style={styles.accessBadgeText}>✓</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.appointmentFooter}>
          <View style={styles.statusContainer}>
            <View style={[styles.statusDot, { backgroundColor: '#4CAF50' }]} />
            <Text style={styles.statusText}>Confirmed</Text>
          </View>
          {item.chatAccessGrantedAt && (
            <Text style={styles.accessGrantedText}>Chat Access Granted</Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <AppHeader title="All Chats" showBackButton />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading chats...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader title="All Chats" showBackButton />
      
      {appointments.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="chatbubbles-outline" size={80} color="#CCC" />
          <Text style={styles.emptyTitle}>No Chats Available</Text>
          <Text style={styles.emptySubtitle}>
            Confirmed appointments will appear here
          </Text>
        </View>
      ) : (
        <FlatList
          data={appointments}
          renderItem={renderAppointment}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E8EAF6'
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666'
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 8
  },
  listContainer: {
    padding: wp(4)
  },
  appointmentCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: wp(4),
    marginBottom: hp(2),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 5,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF'
  },
  appointmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: hp(1.5)
  },
  patientInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  patientDetails: {
    marginLeft: wp(3),
    flex: 1
  },
  patientName: {
    fontSize: wp(4.5),
    fontWeight: '600',
    color: '#333'
  },
  appointmentDate: {
    fontSize: wp(3.5),
    color: '#666',
    marginTop: 2
  },
  chatIconContainer: {
    position: 'relative'
  },
  accessBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#4CAF50',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center'
  },
  accessBadgeText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold'
  },
  appointmentFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: hp(1.5),
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0'
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6
  },
  statusText: {
    fontSize: wp(3.5),
    color: '#666'
  },
  accessGrantedText: {
    fontSize: wp(3),
    color: '#4CAF50',
    fontWeight: '500'
  }
});
