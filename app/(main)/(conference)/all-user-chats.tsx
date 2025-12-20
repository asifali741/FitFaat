import AppHeader from '@/components/AppHeader';
import { theme } from '@/constants/theme';
import { authApi } from '@/utils/auth/authApi';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList, Platform, RefreshControl, StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { widthPercentageToDP as wp } from 'react-native-responsive-screen';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function AllUserChatsScreen() {
  const router = useRouter();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState<{ [key: string]: number }>({});

  useEffect(() => {
    fetchAppointments();
    fetchUnreadMessages();
  }, []);

  const fetchAppointments = async () => {
    setIsLoading(true);
    try {
      const response = await authApi.getUserAppointments();
      if (response.success) {
        // Filter only confirmed appointments and sort by most recent message
        const confirmedAppointments = (response.appointments || [])
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
                // Remove from local state
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

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAppointments();
    await fetchUnreadMessages();
    setRefreshing(false);
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
              <View style={styles.doctorInfo}>
                <Ionicons name="medical" size={40} color="#007AFF" />
                <View style={styles.doctorDetails}>
                  <Text style={styles.doctorName}>{item.doctorName || 'Doctor'}</Text>
                  <Text style={styles.appointmentDate}>{formattedDate} at {item.time}</Text>
                </View>
              </View>
              <View style={styles.headerRight}>
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
                <Text style={styles.accessGrantedText}>Early Access ✓</Text>
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
        <AppHeader title="My Chats" showBackButton />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading chats...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader title="My Chats" showBackButton />
      
      {appointments.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="chatbubbles-outline" size={80} color={theme.colors.border} />
          <Text style={styles.emptyTitle}>No Chats Available</Text>
          <Text style={styles.emptySubtitle}>
            Your confirmed appointments will appear here
          </Text>
        </View>
      ) : (
        <FlatList
          data={appointments}
          renderItem={renderAppointment}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh}
              tintColor={theme.colors.primary}
              colors={[theme.colors.primary]}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingText: {
    marginTop: theme.spacing.md,
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textSecondary
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl
  },
  emptyTitle: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold as any,
    color: theme.colors.textPrimary,
    marginTop: theme.spacing.lg
  },
  emptySubtitle: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: theme.spacing.sm
  },
  listContainer: {
    padding: theme.spacing.lg
  },
  appointmentCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.large,
    marginBottom: theme.spacing.lg,
    ...theme.shadows.medium,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.statusConfirmed
  },
  unreadCard: {
    backgroundColor: theme.colors.chatDoctor,
    borderLeftColor: theme.colors.error,
  },
  cardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: theme.spacing.lg,
  },
  chatTouchable: {
    flex: 1,
  },
  appointmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  deleteButtonTop: {
    padding: theme.spacing.sm,
    marginLeft: theme.spacing.xs,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerRight: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: theme.colors.error,
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: theme.colors.surface,
  },
  unreadBadgeText: {
    color: theme.colors.surface,
    fontSize: 11,
    fontWeight: theme.typography.fontWeight.bold as any,
    paddingHorizontal: 4,
  },
  doctorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  doctorDetails: {
    marginLeft: theme.spacing.md,
    flex: 1
  },
  doctorName: {
    fontSize: wp(4.5),
    fontWeight: theme.typography.fontWeight.semiBold as any,
    color: theme.colors.textPrimary
  },
  appointmentDate: {
    fontSize: wp(3.5),
    color: theme.colors.textSecondary,
    marginTop: 2
  },
  appointmentFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border
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
    color: theme.colors.textSecondary
  },
  accessGrantedText: {
    fontSize: wp(3),
    color: theme.colors.statusConfirmed,
    fontWeight: theme.typography.fontWeight.medium as any
  },
});
