import AppHeader from '@/components/AppHeader';
import { authApi } from '@/utils/auth/authApi';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList, Platform, StyleSheet,
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
  const [unreadMessages, setUnreadMessages] = useState<{ [key: string]: number }>({});

  useEffect(() => {
    fetchAppointments();
    fetchUnreadMessages();
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
        // Filter only confirmed appointments and sort by most recent message
        const confirmedAppointments = (appointmentsResponse.appointments || [])
          .filter((apt: any) => apt.status === 'confirmed')
          .sort((a: any, b: any) => {
            // If both have messages, sort by most recent message
            if (a.lastMessageAt && b.lastMessageAt) {
              return new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime();
            }
            // Chats with messages come first
            if (a.lastMessageAt) return -1;
            if (b.lastMessageAt) return 1;
            // If no messages, sort by appointment date
            return new Date(b.date).getTime() - new Date(a.date).getTime();
          });
        setAppointments(confirmedAppointments);
      }
    } catch (error) {
      console.error('Failed to fetch appointments:', error);
      Alert.alert('Error', 'Failed to load appointments');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUnreadMessages = async () => {
    try {
      const token = await SecureStore.getItemAsync('authToken');
      if (!token) return;

      const ENV = Constants.expoConfig?.extra;
      const API_URL = (ENV?.EXPO_PUBLIC_BACKEND_API_URL || (Platform.OS === 'android' ? 'http://10.0.2.2:5001' : 'http://localhost:5001')).replace(/\/api\/?$/, '');
      const response = await fetch(`${API_URL}/api/chat/unread-by-appointment`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.unreadByAppointment) {
          setUnreadMessages(data.unreadByAppointment);
        }
      }
    } catch (error) {
      console.log('Error fetching unread messages:', error);
    }
  };

  const deleteChat = async (appointmentId: string) => {
    Alert.alert(
      'Delete Chat',
      'Are you sure you want to delete this chat? This action cannot be undone.',
      [
        { text: 'Cancel', onPress: () => {}, style: 'cancel' },
        {
          text: 'Delete',
          onPress: async () => {
            try {
              const token = await SecureStore.getItemAsync('authToken');
              if (!token) return;

              const ENV = Constants.expoConfig?.extra;
              const API_URL = (ENV?.EXPO_PUBLIC_BACKEND_API_URL || (Platform.OS === 'android' ? 'http://10.0.2.2:5001' : 'http://localhost:5001')).replace(/\/api\/?$/, '');
              const response = await fetch(`${API_URL}/api/chat/delete/${appointmentId}`, {
                method: 'DELETE',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
              });

              if (response.ok) {
                setAppointments(appointments.filter(apt => apt._id !== appointmentId));
                Alert.alert('Success', 'Chat deleted successfully');
              } else {
                Alert.alert('Error', 'Failed to delete chat');
              }
            } catch (error) {
              console.error('Error deleting chat:', error);
              Alert.alert('Error', 'Failed to delete chat');
            }
          },
          style: 'destructive',
        },
      ]
    );
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
    const unreadCount = unreadMessages[item._id] || 0;

    return (
      <View
        style={[styles.appointmentCard, unreadCount > 0 && styles.unreadCard]}
      >
        <View style={styles.cardContent}>
          <TouchableOpacity 
            style={styles.chatTouchable}
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
                {unreadCount > 0 && (
                  <View style={styles.unreadBadge}>
                    <Text style={styles.unreadBadgeText}>
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </Text>
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
                <View style={styles.accessBadge}>
                  <Text style={styles.accessBadgeText}>✓</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>

          <View style={{ display: 'none' }}>
            <TouchableOpacity
              style={styles.deleteButtonTop}
              onPress={() => deleteChat(item._id)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="trash-outline" size={26} color="#FF6B6B" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
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
    marginBottom: hp(2),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 5,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50'
  },
  unreadCard: {
    backgroundColor: '#F8F9FF',
    borderLeftColor: '#FF6B6B',
  },
  cardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: wp(4),
  },
  chatTouchable: {
    flex: 1,
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
  },
  unreadBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#FF6B6B',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  unreadBadgeText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: 'bold',
    paddingHorizontal: 4,
  },
  deleteButtonTop: {
    padding: wp(2),
    marginLeft: wp(1),
    justifyContent: 'center',
    alignItems: 'center',
  },});
