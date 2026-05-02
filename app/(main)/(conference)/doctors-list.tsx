import BackButton from '@/components/BackButton';
import { theme } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from "react-native-responsive-screen";
import { SafeAreaView } from "react-native-safe-area-context";
import { getDoctorsByDate } from "./_doctorsData";

export default function DoctorsListScreen() {
  const router = useRouter();
  const { date } = useLocalSearchParams<{ date: string }>();
  const doctors = getDoctorsByDate(date);

  const handleDoctorSelect = (doctorId: string) => {
    router.push({
      pathname: "/(main)/(conference)/doctor-details" as any,
      params: { doctorId, date }
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <BackButton style={styles.backButton} testID="doctorslist-back" />
        <Text style={styles.headerTitle}>Consultants Available</Text>
        <View style={styles.spacer} />
      </View>

      <View style={styles.content}>
        <View style={styles.dateInfoContainer}>
          <Ionicons name="calendar" size={20} color={theme.colors.primary} />
          <Text style={styles.dateInfo}>
            {new Date(date).toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "long",
              year: "numeric"
            })}
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Consultants Available on this Date:</Text>

        <ScrollView 
          style={styles.doctorsList}
          showsVerticalScrollIndicator={false}
        >
          {doctors.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="calendar-outline" size={60} color={theme.colors.textSecondary} />
              <Text style={styles.emptyText}>No consultants available on this date</Text>
              <Text style={styles.emptySubtext}>Please select a different date</Text>
            </View>
          ) : (
            doctors.map((doctor) => (
              <TouchableOpacity
                key={doctor.id}
                style={styles.doctorCard}
                onPress={() => handleDoctorSelect(doctor.id)}
              >
                <View style={styles.avatarContainer}>
                  <Ionicons name="person-circle" size={50} color={theme.colors.primary} />
                </View>
                <View style={styles.doctorInfo}>
                  <Text style={styles.doctorName}>{doctor.name}</Text>
                  <Text style={styles.doctorEmail}>{doctor.email}</Text>
                </View>
                <Ionicons name="chevron-forward" size={24} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      </View>
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
    padding: 8,
  },
  headerTitle: {
    fontSize: hp(2.2),
    fontWeight: "bold",
    color: theme.colors.textOnPrimary,
    flex: 1,
    textAlign: "center",
  },
  spacer: {
    width: 40,
  },
  content: {
    flex: 1,
    backgroundColor: theme.colors.screenColor,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingTop: hp(3),
    paddingHorizontal: wp(6),
  },
  dateInfoContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.primarySoft,
    paddingHorizontal: wp(4),
    paddingVertical: hp(1.5),
    borderRadius: 15,
    marginBottom: hp(2),
  },
  dateInfo: {
    fontSize: hp(1.8),
    color: theme.colors.textPrimary,
    fontWeight: "600",
    marginLeft: wp(2),
  },
  sectionTitle: {
    fontSize: hp(2),
    fontWeight: "600",
    color: theme.colors.textPrimary,
    marginBottom: hp(2),
  },
  doctorsList: {
    flex: 1,
  },
  doctorCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.white,
    borderRadius: 15,
    padding: wp(4),
    marginBottom: hp(1.5),
    shadowColor: theme.colors.primary,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  avatarContainer: {
    marginRight: wp(3),
  },
  doctorInfo: {
    flex: 1,
  },
  doctorName: {
    fontSize: hp(2),
    fontWeight: "600",
    color: theme.colors.textPrimary,
    marginBottom: hp(0.5),
  },
  doctorEmail: {
    fontSize: hp(1.6),
    color: theme.colors.textSecondary,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: hp(10),
  },
  emptyText: {
    fontSize: hp(2),
    fontWeight: "600",
    color: theme.colors.textPrimary,
    marginTop: hp(2),
  },
  emptySubtext: {
    fontSize: hp(1.6),
    color: theme.colors.textSecondary,
    marginTop: hp(1),
  },
});
