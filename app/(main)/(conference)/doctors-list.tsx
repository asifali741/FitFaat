import React from "react";
import { StyleSheet, Text, TouchableOpacity, View, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from "react-native-responsive-screen";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colorsSheet } from "../(settings)/ui_elements";
import { getDoctorsByDate } from "./doctorsData";

export default function DoctorsListScreen() {
  const router = useRouter();
  const { date } = useLocalSearchParams<{ date: string }>();
  const doctors = getDoctorsByDate(date);

  const handleDoctorSelect = (doctorId: string) => {
    router.push({
      pathname: "/(main)/(conference)/doctor-details",
      params: { doctorId, date }
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colorsSheet.textOnPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Consultants Available</Text>
        <View style={styles.spacer} />
      </View>

      <View style={styles.content}>
        <View style={styles.dateInfoContainer}>
          <Ionicons name="calendar" size={20} color={colorsSheet.primary} />
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
              <Ionicons name="calendar-outline" size={60} color={colorsSheet.textSecondary} />
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
                  <Ionicons name="person-circle" size={50} color={colorsSheet.primary} />
                </View>
                <View style={styles.doctorInfo}>
                  <Text style={styles.doctorName}>{doctor.name}</Text>
                  <Text style={styles.doctorEmail}>{doctor.email}</Text>
                </View>
                <Ionicons name="chevron-forward" size={24} color={colorsSheet.textSecondary} />
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
    backgroundColor: colorsSheet.primary,
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
    color: colorsSheet.textOnPrimary,
    flex: 1,
    textAlign: "center",
  },
  spacer: {
    width: 40,
  },
  content: {
    flex: 1,
    backgroundColor: colorsSheet.screenColor,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingTop: hp(3),
    paddingHorizontal: wp(6),
  },
  dateInfoContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colorsSheet.primarySoft,
    paddingHorizontal: wp(4),
    paddingVertical: hp(1.5),
    borderRadius: 15,
    marginBottom: hp(2),
  },
  dateInfo: {
    fontSize: hp(1.8),
    color: colorsSheet.textPrimary,
    fontWeight: "600",
    marginLeft: wp(2),
  },
  sectionTitle: {
    fontSize: hp(2),
    fontWeight: "600",
    color: colorsSheet.textPrimary,
    marginBottom: hp(2),
  },
  doctorsList: {
    flex: 1,
  },
  doctorCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colorsSheet.white,
    borderRadius: 15,
    padding: wp(4),
    marginBottom: hp(1.5),
    shadowColor: colorsSheet.primary,
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
    color: colorsSheet.textPrimary,
    marginBottom: hp(0.5),
  },
  doctorEmail: {
    fontSize: hp(1.6),
    color: colorsSheet.textSecondary,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: hp(10),
  },
  emptyText: {
    fontSize: hp(2),
    fontWeight: "600",
    color: colorsSheet.textPrimary,
    marginTop: hp(2),
  },
  emptySubtext: {
    fontSize: hp(1.6),
    color: colorsSheet.textSecondary,
    marginTop: hp(1),
  },
});
