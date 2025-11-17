<<<<<<< HEAD
import AppHeader from "@/components/AppHeader";
import { useAppointments } from "@/contexts/AppointmentContext";
import { tokenStorage } from "@/utils/auth/tokenStorage";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from "react-native-responsive-screen";
import { SafeAreaView } from "react-native-safe-area-context";
import { colorsSheet } from "./(settings)/_ui_elements";

export default function ProfileScreen() {
  const router = useRouter();
  const { getUpcomingAppointments, getActiveAppointments, appointments } = useAppointments();
  const upcomingAppointments = getUpcomingAppointments();
  const activeAppointments = getActiveAppointments();
  const [selectedTab, setSelectedTab] = useState('overview');
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await tokenStorage.getUser();
        setUser(userData);
      } catch (error) {
        console.error('Error loading user:', error);
      }
    };
    loadUser();
  }, []);

  // Mock data for additional features
  const completedAppointments = appointments.filter(apt => apt.status === 'completed');
  const cancelledAppointments = appointments.filter(apt => apt.status === 'cancelled');
  
  const achievements = [
    { id: 1, title: "First Consultation", icon: "🏥", description: "Completed your first video consultation", earned: true },
    { id: 2, title: "Health Explorer", icon: "🔍", description: "Booked 5+ appointments", earned: completedAppointments.length >= 5 },
    { id: 3, title: "Regular Patient", icon: "📅", description: "Booked appointments for 3 consecutive months", earned: true },
    { id: 4, title: "Wellness Champion", icon: "💪", description: "Completed 10+ consultations", earned: completedAppointments.length >= 10 },
  ];

  const healthStats = {
    totalConsultations: completedAppointments.length,
    thisMonth: completedAppointments.filter(apt => {
      const aptDate = new Date(apt.appointmentDateTime);
      const now = new Date();
      return aptDate.getMonth() === now.getMonth() && aptDate.getFullYear() === now.getFullYear();
    }).length,
    favoriteSpecialty: "General Medicine",
    healthScore: 85,
  };

  const quickActions = [
    { title: "Book Appointment", icon: "📅", color: colorsSheet.primary, action: () => router.push('/(main)/(conference)') },
    { title: "Chat History", icon: "💬", color: colorsSheet.info, action: () => router.push('/(main)/(chatbot)/chat-history') },
    { title: "Health Records", icon: "📋", color: colorsSheet.secondary, action: () => console.log("Health Records") },
    { title: "Emergency Contact", icon: "🚨", color: colorsSheet.error, action: () => console.log("Emergency Contact") },
    { title: "Book Appointment", icon: "📅", color: colorsSheet.primary, action: () => router.push('/(main)/(conference)') },
    { title: "Chat History", icon: "💬", color: colorsSheet.info, action: () => router.push('/(main)/(chatbot)/chat-history') },
    { title: "Health Records", icon: "📋", color: colorsSheet.secondary, action: () => console.log("Health Records") },
    { title: "Emergency Contact", icon: "🚨", color: colorsSheet.error, action: () => console.log("Emergency Contact") },
  ];
=======
import { View, Text, ScrollView, TouchableOpacity, Image, StyleSheet } from "react-native";
import React from "react";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { ChevronLeftIcon } from "react-native-heroicons/outline";
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from "react-native-responsive-screen";

export default function ProfileScreen() {
  const router = useRouter();
>>>>>>> parent of 1220d0d... Merge pull request #5 from asifali741/merge/asif-into-main

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>My Profile</Text>
        
        <TouchableOpacity style={styles.editButton}>
          <Ionicons name="person" size={24} color="#26867C" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Profile Picture Section */}
        <View style={{
          alignItems: 'center',
          marginBottom: hp(4),
        }}>
          <View style={{
            width: hp(15),
            height: hp(15),
            borderRadius: hp(7.5),
            backgroundColor: 'white',
            justifyContent: 'center',
            alignItems: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.1,
            shadowRadius: 8,
            elevation: 5,
            marginBottom: hp(2),
          }}>
          <View style={{
            width: hp(15),
            height: hp(15),
            borderRadius: hp(7.5),
            backgroundColor: 'white',
            justifyContent: 'center',
            alignItems: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.1,
            shadowRadius: 8,
            elevation: 5,
            marginBottom: hp(2),
          }}>
            <Image 
              source={require("../../assets/images/Default_Profile.png")}
              style={{
                width: hp(12),
                height: hp(12),
                borderRadius: hp(6),
              }}
              style={{
                width: hp(12),
                height: hp(12),
                borderRadius: hp(6),
              }}
            />
          </View>
          
          <Text style={{
            fontSize: hp(2.8),
            fontWeight: 'bold',
            color: '#333',
            marginBottom: hp(0.5),
          }}>
            {user?.username || "User"}
          </Text>
          
          <Text style={{
            fontSize: hp(1.8),
            color: '#666',
          }}>
            {user?.email || "user@example.com"}
          </Text>
        </View>

        {/* Profile Stats */}
        <View style={{
          flexDirection: 'row',
          justifyContent: 'space-around',
          marginHorizontal: wp(8),
          marginBottom: hp(4),
        }}>
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: hp(2.5), fontWeight: 'bold', color: '#FF6B6B' }}>12</Text>
            <Text style={{ fontSize: hp(1.6), color: '#666' }}>Workouts</Text>
        <View style={{
          flexDirection: 'row',
          justifyContent: 'space-around',
          marginHorizontal: wp(8),
          marginBottom: hp(4),
        }}>
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: hp(2.5), fontWeight: 'bold', color: '#FF6B6B' }}>12</Text>
            <Text style={{ fontSize: hp(1.6), color: '#666' }}>Workouts</Text>
          </View>
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: hp(2.5), fontWeight: 'bold', color: '#FF6B6B' }}>5</Text>
            <Text style={{ fontSize: hp(1.6), color: '#666' }}>Favorites</Text>
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: hp(2.5), fontWeight: 'bold', color: '#FF6B6B' }}>5</Text>
            <Text style={{ fontSize: hp(1.6), color: '#666' }}>Favorites</Text>
          </View>
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: hp(2.5), fontWeight: 'bold', color: '#FF6B6B' }}>24</Text>
            <Text style={{ fontSize: hp(1.6), color: '#666' }}>Days Active</Text>
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: hp(2.5), fontWeight: 'bold', color: '#FF6B6B' }}>24</Text>
            <Text style={{ fontSize: hp(1.6), color: '#666' }}>Days Active</Text>
          </View>
        </View>

<<<<<<< HEAD
        {/* Tab Navigation */}
        <View style={styles.tabContainer}>
          <TouchableOpacity 
            style={[styles.tab, selectedTab === 'overview' && styles.activeTab]}
            onPress={() => setSelectedTab('overview')}
          >
            <Text style={[styles.tabText, selectedTab === 'overview' && styles.activeTabText]}>Overview</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, selectedTab === 'history' && styles.activeTab]}
            onPress={() => setSelectedTab('history')}
          >
            <Text style={[styles.tabText, selectedTab === 'history' && styles.activeTabText]}>History</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, selectedTab === 'achievements' && styles.activeTab]}
            onPress={() => setSelectedTab('achievements')}
          >
            <Text style={[styles.tabText, selectedTab === 'achievements' && styles.activeTabText]}>Achievements</Text>
          </TouchableOpacity>
        </View>

        {/* Content based on selected tab */}
        {selectedTab === 'overview' && (
          <>
            {/* Health Statistics */}
            <View style={styles.statsSection}>
              <Text style={styles.sectionTitle}>Health Statistics</Text>
              <View style={styles.statsGrid}>
                <View style={styles.statCard}>
                  <Text style={styles.statNumber}>{healthStats.totalConsultations}</Text>
                  <Text style={styles.statLabel}>Total Consultations</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statNumber}>{healthStats.thisMonth}</Text>
                  <Text style={styles.statLabel}>This Month</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statNumber}>{healthStats.healthScore}%</Text>
                  <Text style={styles.statLabel}>Health Score</Text>
                </View>
              </View>
            </View>

            {/* Quick Actions */}
            <View style={styles.quickActionsSection}>
              <Text style={styles.sectionTitle}>Quick Actions</Text>
              <View style={styles.quickActionsGrid}>
                {quickActions.map((action, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[styles.quickActionCard, { borderLeftColor: action.color }]}
                    onPress={action.action}
                  >
                    <Text style={styles.quickActionIcon}>{action.icon}</Text>
                    <Text style={styles.quickActionTitle}>{action.title}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </>
        )}

        {selectedTab === 'history' && (
          <View style={styles.historySection}>
            <Text style={styles.sectionTitle}>Booking History</Text>
            
            {/* Completed Appointments */}
            {completedAppointments.length > 0 && (
              <View style={styles.historyCategory}>
                <Text style={styles.historyCategoryTitle}>Completed ({completedAppointments.length})</Text>
                {completedAppointments.map((appointment) => (
                  <TouchableOpacity
                    key={appointment.id}
                    style={[styles.historyCard, styles.completedCard]}
                    onPress={() => router.push(`/(main)/(conference)/appointment-details?appointmentId=${appointment.id}`)}
                  >
                    <View style={styles.historyCardHeader}>
                      <View style={styles.historyIcon}>
                        <Ionicons name="checkmark-circle" size={20} color={colorsSheet.success} />
                      <View style={styles.historyIcon}>
                        <Ionicons name="checkmark-circle" size={20} color={colorsSheet.success} />
                      </View>
                      <View style={styles.historyInfo}>
                        <Text style={styles.historyTitle}>Completed Consultation</Text>
                        <Text style={styles.historySubtitle}>{appointment.doctorName}</Text>
                      </View>
                      <Text style={styles.historyDate}>{appointment.date}</Text>
                    </View>
                    <Text style={styles.historySpecialty}>{appointment.doctorSpecialty}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Cancelled Appointments */}
            {cancelledAppointments.length > 0 && (
              <View style={styles.historyCategory}>
                <Text style={styles.historyCategoryTitle}>Cancelled ({cancelledAppointments.length})</Text>
                {cancelledAppointments.map((appointment) => (
                  <TouchableOpacity
                    key={appointment.id}
                    style={[styles.historyCard, styles.cancelledCard]}
                    onPress={() => router.push(`/(main)/(conference)/appointment-details?appointmentId=${appointment.id}`)}
                  >
                    <View style={styles.historyCardHeader}>
                      <View style={styles.historyIcon}>
                        <Ionicons name="close-circle" size={20} color={colorsSheet.error} />
                      <View style={styles.historyIcon}>
                        <Ionicons name="close-circle" size={20} color={colorsSheet.error} />
                      </View>
                      <View style={styles.historyInfo}>
                        <Text style={styles.historyTitle}>Cancelled Appointment</Text>
                        <Text style={styles.historySubtitle}>{appointment.doctorName}</Text>
                      </View>
                      <Text style={styles.historyDate}>{appointment.date}</Text>
                    </View>
                    <Text style={styles.historySpecialty}>{appointment.doctorSpecialty}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {completedAppointments.length === 0 && cancelledAppointments.length === 0 && (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateIcon}>📋</Text>
                <Text style={styles.emptyStateTitle}>No History Yet</Text>
                <Text style={styles.emptyStateSubtitle}>Your appointment history will appear here</Text>
              </View>
            )}
          </View>
        )}

        {selectedTab === 'achievements' && (
          <View style={styles.achievementsSection}>
            <Text style={styles.sectionTitle}>Achievements & Badges</Text>
            <View style={styles.achievementsGrid}>
              {achievements.map((achievement) => (
                <View
                  key={achievement.id}
                  style={[
                    styles.achievementCard,
                    achievement.earned ? styles.achievementEarned : styles.achievementLocked
                  ]}
                >
                  <Text style={styles.achievementIcon}>{achievement.icon}</Text>
                  <Text style={[
                    styles.achievementTitle,
                    achievement.earned ? styles.achievementTitleEarned : styles.achievementTitleLocked
                  ]}>
                    {achievement.title}
                  </Text>
                  <Text style={styles.achievementDescription}>{achievement.description}</Text>
                  {achievement.earned && (
                    <View style={styles.achievementBadge}>
                      <Ionicons name="checkmark" size={16} color={colorsSheet.textOnPrimary} />
                      <Ionicons name="checkmark" size={16} color={colorsSheet.textOnPrimary} />
                    </View>
                  )}
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Appointments Section */}
        {(upcomingAppointments.length > 0 || activeAppointments.length > 0) && (
          <View style={styles.appointmentsSection}>
            <Text style={styles.sectionTitle}>My Appointments</Text>
            
            {/* Active Appointments */}
            {activeAppointments.map((appointment) => (
              <TouchableOpacity
                key={appointment.id}
                style={[styles.appointmentCard, styles.activeAppointmentCard]}
                onPress={() => router.push(`/(main)/(conference)/appointment-details?appointmentId=${appointment.id}`)}
              >
                <View style={styles.appointmentHeader}>
                  <View style={styles.appointmentIcon}>
                    <Ionicons name="videocam" size={20} color={colorsSheet.textOnPrimary} />
                  <View style={styles.appointmentIcon}>
                    <Ionicons name="videocam" size={20} color={colorsSheet.textOnPrimary} />
                  </View>
                  <View style={styles.appointmentInfo}>
                    <Text style={styles.appointmentTitle}>Active Session</Text>
                    <Text style={styles.appointmentSubtitle}>Click to join call</Text>
                  </View>
                  <View style={styles.appointmentStatus}>
                    <Text style={styles.statusText}>LIVE</Text>
                  </View>
                </View>
                <View style={styles.appointmentDetails}>
                  <Text style={styles.doctorName}>{appointment.doctorName}</Text>
                  <Text style={styles.appointmentTime}>{appointment.time} - {appointment.date}</Text>
                </View>
              </TouchableOpacity>
            ))}

            {/* Upcoming Appointments */}
            {upcomingAppointments.map((appointment) => (
              <TouchableOpacity
                key={appointment.id}
                style={styles.appointmentCard}
                onPress={() => router.push(`/(main)/(conference)/appointment-details?appointmentId=${appointment.id}`)}
              >
                <View style={styles.appointmentHeader}>
                  <View style={styles.appointmentIcon}>
                    <Ionicons name="calendar" size={20} color={colorsSheet.primary} />
                  <View style={styles.appointmentIcon}>
                    <Ionicons name="calendar" size={20} color={colorsSheet.primary} />
                  </View>
                  <View style={styles.appointmentInfo}>
                    <Text style={styles.appointmentTitle}>Upcoming Appointment</Text>
                    <Text style={styles.appointmentSubtitle}>Click to view details</Text>
                  </View>
                  <View style={styles.appointmentStatus}>
                    <Text style={styles.statusText}>SCHEDULED</Text>
                  </View>
                </View>
                <View style={styles.appointmentDetails}>
                  <Text style={styles.doctorName}>{appointment.doctorName}</Text>
                  <Text style={styles.appointmentTime}>{appointment.time} - {appointment.date}</Text>
                  <Text style={styles.appointmentSpecialty}>{appointment.doctorSpecialty}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        </ScrollView>
      </View>
=======
        {/* Profile Options */}
        <View style={{
          marginHorizontal: wp(5),
        }}>
          {[
            { title: 'Personal Information', icon: '👤', color: '#4A90E2' },
            { title: 'Fitness Goals', icon: '🎯', color: '#50C878' },
            { title: 'Workout Preferences', icon: '💪', color: '#FF6B6B' },
            { title: 'Notifications', icon: '🔔', color: '#FFA500' },
            { title: 'Privacy Settings', icon: '🔒', color: '#9B59B6' },
            { title: 'Help & Support', icon: '❓', color: '#34495E' },
          ].map((item, index) => (
            <TouchableOpacity
              key={index}
              style={{
                backgroundColor: 'white',
                marginBottom: hp(2),
                borderRadius: hp(2),
                padding: hp(2),
                flexDirection: 'row',
                alignItems: 'center',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
                elevation: 3,
              }}
              onPress={() => console.log(`Navigate to ${item.title}`)}
            >
              <View style={{
                width: hp(5),
                height: hp(5),
                borderRadius: hp(2.5),
                backgroundColor: item.color,
                justifyContent: 'center',
                alignItems: 'center',
                marginRight: wp(4),
              }}>
                <Text style={{ fontSize: hp(2.5) }}>{item.icon}</Text>
              </View>
              
              <Text style={{
                flex: 1,
                fontSize: hp(2),
                fontWeight: '600',
                color: '#333',
              }}>
                {item.title}
              </Text>
              
              <ChevronLeftIcon
                size={hp(2.5)}
                color="#999"
                strokeWidth={2}
                style={{ transform: [{ rotate: '180deg' }] }}
              />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
>>>>>>> parent of 1220d0d... Merge pull request #5 from asifali741/merge/asif-into-main
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
const styles = StyleSheet.create({
  container: {
    flex: 1,
<<<<<<< HEAD
    backgroundColor: colorsSheet.primary,
    backgroundColor: colorsSheet.primary,
  },
  content: {
    flex: 1,
    backgroundColor: colorsSheet.screenColor,
    backgroundColor: colorsSheet.screenColor,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
  },
  appointmentsSection: {
    marginHorizontal: wp(5),
    marginBottom: hp(3),
  },
  sectionTitle: {
    fontSize: hp(2.2),
    fontWeight: 'bold',
    color: '#333',
    color: '#333',
    marginBottom: hp(2),
  },
  appointmentCard: {
    backgroundColor: 'white',
    backgroundColor: 'white',
    borderRadius: hp(2),
    padding: hp(2),
    marginBottom: hp(1.5),
    shadowColor: '#000',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: colorsSheet.primary,
    borderLeftColor: colorsSheet.primary,
  },
  activeAppointmentCard: {
    backgroundColor: colorsSheet.primarySoft,
    borderLeftColor: colorsSheet.success,
    backgroundColor: colorsSheet.primarySoft,
    borderLeftColor: colorsSheet.success,
  },
  appointmentHeader: {
=======
    backgroundColor: '#f8f8f8',
  },
  header: {
>>>>>>> parent of 1220d0d... Merge pull request #5 from asifali741/merge/asif-into-main
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: wp(5),
    paddingVertical: hp(2),
    backgroundColor: '#f8f8f8',
  },
<<<<<<< HEAD
  appointmentIcon: {
    width: hp(4),
    height: hp(4),
    borderRadius: hp(2),
    backgroundColor: colorsSheet.primary,
    backgroundColor: colorsSheet.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: wp(3),
  },
  appointmentInfo: {
    flex: 1,
  },
  appointmentTitle: {
    fontSize: hp(1.8),
    fontWeight: 'bold',
    color: '#333',
    color: '#333',
    marginBottom: 2,
  },
  appointmentSubtitle: {
    fontSize: hp(1.4),
    color: '#666',
    color: '#666',
  },
  appointmentStatus: {
    backgroundColor: colorsSheet.primary,
    backgroundColor: colorsSheet.primary,
    paddingHorizontal: wp(3),
    paddingVertical: hp(0.5),
    borderRadius: hp(1),
  },
  statusText: {
    fontSize: hp(1.2),
    fontWeight: 'bold',
    color: colorsSheet.textOnPrimary,
    color: colorsSheet.textOnPrimary,
  },
  appointmentDetails: {
    marginLeft: hp(5),
  },
  doctorName: {
    fontSize: hp(1.6),
    fontWeight: '600',
    color: '#333',
    color: '#333',
    marginBottom: 2,
  },
  appointmentTime: {
    fontSize: hp(1.4),
    color: '#666',
    color: '#666',
    marginBottom: 2,
  },
  appointmentSpecialty: {
    fontSize: hp(1.3),
    color: colorsSheet.primary,
    color: colorsSheet.primary,
    fontWeight: '500',
  },
  // Tab Navigation Styles
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    backgroundColor: 'white',
    marginHorizontal: wp(5),
    marginBottom: hp(2),
    borderRadius: hp(2),
    padding: hp(0.5),
=======
  backButton: {
    width: hp(5),
    height: hp(5),
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: hp(2.5),
    backgroundColor: 'white',
>>>>>>> parent of 1220d0d... Merge pull request #5 from asifali741/merge/asif-into-main
    shadowColor: '#000',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
<<<<<<< HEAD
  tab: {
    flex: 1,
    paddingVertical: hp(1.5),
    alignItems: 'center',
    borderRadius: hp(1.5),
  },
  activeTab: {
    backgroundColor: colorsSheet.primary,
    backgroundColor: colorsSheet.primary,
  },
  tabText: {
    fontSize: hp(1.6),
    fontWeight: '600',
    color: '#666',
    color: '#666',
  },
  activeTabText: {
    color: colorsSheet.textOnPrimary,
    color: colorsSheet.textOnPrimary,
  },
  // Health Statistics Styles
  statsSection: {
    marginHorizontal: wp(5),
    marginBottom: hp(3),
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statCard: {
    flex: 1,
    backgroundColor: 'white',
    backgroundColor: 'white',
    borderRadius: hp(2),
    padding: hp(2),
    alignItems: 'center',
    marginHorizontal: wp(1),
    shadowColor: '#000',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statNumber: {
    fontSize: hp(2.5),
    fontWeight: 'bold',
    color: colorsSheet.primary,
    color: colorsSheet.primary,
    marginBottom: hp(0.5),
  },
  statLabel: {
    fontSize: hp(1.4),
    color: '#666',
    color: '#666',
    textAlign: 'center',
  },
  // Quick Actions Styles
  quickActionsSection: {
    marginHorizontal: wp(5),
    marginBottom: hp(3),
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  quickActionCard: {
    width: '48%',
    backgroundColor: 'white',
    backgroundColor: 'white',
    borderRadius: hp(2),
    padding: hp(2),
    marginBottom: hp(1.5),
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  quickActionIcon: {
    fontSize: hp(3),
    marginBottom: hp(1),
  },
  quickActionTitle: {
    fontSize: hp(1.6),
    fontWeight: '600',
    color: '#333',
    color: '#333',
  },
  // History Styles
  historySection: {
    marginHorizontal: wp(5),
    marginBottom: hp(3),
  },
  historyCategory: {
    marginBottom: hp(3),
  },
  historyCategoryTitle: {
    fontSize: hp(1.8),
    fontWeight: 'bold',
    color: '#333',
    color: '#333',
    marginBottom: hp(1.5),
  },
  historyCard: {
    backgroundColor: 'white',
    backgroundColor: 'white',
    borderRadius: hp(2),
    padding: hp(2),
    marginBottom: hp(1.5),
    shadowColor: '#000',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  completedCard: {
    borderLeftWidth: 4,
    borderLeftColor: colorsSheet.success,
    borderLeftColor: colorsSheet.success,
  },
  cancelledCard: {
    borderLeftWidth: 4,
    borderLeftColor: colorsSheet.error,
    borderLeftColor: colorsSheet.error,
  },
  historyCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: hp(1),
  },
  historyIcon: {
    marginRight: wp(3),
  },
  historyInfo: {
    flex: 1,
  },
  historyTitle: {
    fontSize: hp(1.6),
    fontWeight: 'bold',
    color: '#333',
    color: '#333',
    marginBottom: 2,
  },
  historySubtitle: {
    fontSize: hp(1.4),
    color: '#666',
    color: '#666',
  },
  historyDate: {
    fontSize: hp(1.3),
    color: '#999',
    color: '#999',
  },
  historySpecialty: {
    fontSize: hp(1.3),
    color: colorsSheet.primary,
    color: colorsSheet.primary,
    fontWeight: '500',
  },
  // Empty State Styles
  emptyState: {
    alignItems: 'center',
    paddingVertical: hp(4),
  },
  emptyStateIcon: {
    fontSize: hp(6),
    marginBottom: hp(2),
  },
  emptyStateTitle: {
    fontSize: hp(2),
    fontWeight: 'bold',
    color: '#333',
    color: '#333',
    marginBottom: hp(1),
  },
  emptyStateSubtitle: {
    fontSize: hp(1.6),
    color: '#666',
    color: '#666',
    textAlign: 'center',
  },
  // Achievements Styles
  achievementsSection: {
    marginHorizontal: wp(5),
    marginBottom: hp(3),
  },
  achievementsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  achievementCard: {
    width: '48%',
    backgroundColor: 'white',
    backgroundColor: 'white',
    borderRadius: hp(2),
    padding: hp(2),
    marginBottom: hp(1.5),
    alignItems: 'center',
=======
  headerTitle: {
    fontSize: hp(2.5),
    fontWeight: 'bold',
    color: '#333',
    letterSpacing: 0.5,
  },
  editButton: {
    width: hp(5),
    height: hp(5),
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: hp(2.5),
    backgroundColor: 'white',
>>>>>>> parent of 1220d0d... Merge pull request #5 from asifali741/merge/asif-into-main
    shadowColor: '#000',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
<<<<<<< HEAD
    position: 'relative',
  },
  achievementEarned: {
    borderWidth: 2,
    borderColor: colorsSheet.success,
    borderColor: colorsSheet.success,
  },
  achievementLocked: {
    opacity: 0.6,
  },
  achievementIcon: {
    fontSize: hp(4),
    marginBottom: hp(1),
  },
  achievementTitle: {
    fontSize: hp(1.6),
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: hp(0.5),
  },
  achievementTitleEarned: {
    color: '#333',
    color: '#333',
  },
  achievementTitleLocked: {
    color: '#999',
    color: '#999',
  },
  achievementDescription: {
    fontSize: hp(1.3),
    color: '#666',
    color: '#666',
    textAlign: 'center',
    lineHeight: hp(1.8),
  },
  achievementBadge: {
    position: 'absolute',
    top: hp(1),
    right: hp(1),
    backgroundColor: colorsSheet.success,
    backgroundColor: colorsSheet.success,
    borderRadius: hp(1),
    width: hp(2),
    height: hp(2),
    alignItems: 'center',
    justifyContent: 'center',
=======
>>>>>>> parent of 1220d0d... Merge pull request #5 from asifali741/merge/asif-into-main
  },
});
