import React, { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View, ScrollView, TextInput } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from "react-native-responsive-screen";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "@/constants/theme";
import { getDoctorById } from "./_doctorsData";

export default function BookingConfirmationScreen() {
  const router = useRouter();
  const { doctorId, date } = useLocalSearchParams<{ doctorId: string; date: string }>();
  const doctor = getDoctorById(doctorId);
  
  const [selectedTime, setSelectedTime] = useState("");
  const [problemDescription, setProblemDescription] = useState("");

  if (!doctor) {
    return (
      <SafeAreaView style={styles.container}>
        <Text>Doctor not found</Text>
      </SafeAreaView>
    );
  }

  const handleContinue = () => {
    if (!selectedTime) {
      alert("Please select a time slot");
      return;
    }
    if (!problemDescription.trim()) {
      alert("Please describe your problem briefly");
      return;
    }

    router.push({
      pathname: "/(main)/(conference)/appointment-summary",
      params: { 
        doctorId, 
        date, 
        time: selectedTime,
        problem: problemDescription 
      }
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.textOnPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Finalize Booking</Text>
        <View style={styles.spacer} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Doctor Info Card */}
        <View style={styles.infoCard}>
          <View style={styles.avatarContainer}>
            <Ionicons name="person-circle" size={60} color={theme.colors.primary} />
          </View>
          <View style={styles.doctorInfoText}>
            <Text style={styles.doctorName}>{doctor.name}</Text>
            <Text style={styles.doctorSpecialty}>{doctor.specialty}</Text>
          </View>
        </View>

        {/* Booking Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Finalize Booking?:</Text>

          <View style={styles.detailBox}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Date:</Text>
              <Text style={styles.detailValue}>
                {new Date(date).toLocaleDateString("en-GB", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric"
                })}
              </Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Time:</Text>
              <View style={styles.timePickerContainer}>
                {doctor.availableTimes.map((time) => (
                  <TouchableOpacity
                    key={time}
                    style={[
                      styles.timeSlot,
                      selectedTime === time && styles.timeSlotSelected
                    ]}
                    onPress={() => setSelectedTime(time)}
                  >
                    <Text 
                      style={[
                        styles.timeSlotText,
                        selectedTime === time && styles.timeSlotTextSelected
                      ]}
                    >
                      {time}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.problemSection}>
              <Text style={styles.detailLabel}>Describe your Problem Briefly:</Text>
              <TextInput
                style={styles.problemInput}
                placeholder="Enter your symptoms or concerns..."
                placeholderTextColor={theme.colors.textLight}
                multiline
                numberOfLines={4}
                value={problemDescription}
                onChangeText={setProblemDescription}
                textAlignVertical="top"
              />
            </View>
          </View>
        </View>

        {/* Continue Button */}
        <TouchableOpacity 
          style={styles.continueButton}
          onPress={handleContinue}
        >
          <Text style={styles.continueButtonText}>Continue</Text>
        </TouchableOpacity>
      </ScrollView>
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
  infoCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.white,
    borderRadius: 15,
    padding: wp(4),
    marginBottom: hp(2),
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
  doctorInfoText: {
    flex: 1,
  },
  doctorName: {
    fontSize: hp(2),
    fontWeight: "600",
    color: theme.colors.textPrimary,
    marginBottom: hp(0.5),
  },
  doctorSpecialty: {
    fontSize: hp(1.6),
    color: theme.colors.textSecondary,
  },
  section: {
    marginBottom: hp(2),
  },
  sectionTitle: {
    fontSize: hp(2),
    fontWeight: "600",
    color: theme.colors.textPrimary,
    marginBottom: hp(1.5),
  },
  detailBox: {
    backgroundColor: theme.colors.white,
    borderRadius: 15,
    padding: wp(4),
    shadowColor: theme.colors.primary,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  detailRow: {
    paddingVertical: hp(1),
  },
  detailLabel: {
    fontSize: hp(1.7),
    fontWeight: "600",
    color: theme.colors.textSecondary,
    marginBottom: hp(0.8),
  },
  detailValue: {
    fontSize: hp(1.9),
    color: theme.colors.textPrimary,
    fontWeight: "500",
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.gray,
    marginVertical: hp(1),
  },
  timePickerContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: wp(2),
  },
  timeSlot: {
    backgroundColor: theme.colors.primarySoft,
    paddingHorizontal: wp(4),
    paddingVertical: hp(1),
    borderRadius: 12,
    borderWidth: 2,
    borderColor: theme.colors.primarySoft,
  },
  timeSlotSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  timeSlotText: {
    fontSize: hp(1.6),
    color: theme.colors.textPrimary,
    fontWeight: "500",
  },
  timeSlotTextSelected: {
    color: theme.colors.white,
    fontWeight: "600",
  },
  problemSection: {
    paddingVertical: hp(1),
  },
  problemInput: {
    backgroundColor: theme.colors.primarySoft,
    borderRadius: 12,
    padding: wp(3),
    fontSize: hp(1.7),
    color: theme.colors.textPrimary,
    minHeight: hp(12),
  },
  continueButton: {
    backgroundColor: theme.colors.black,
    paddingVertical: hp(2),
    paddingHorizontal: wp(6),
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: hp(3),
    shadowColor: theme.colors.black,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  continueButtonText: {
    color: theme.colors.white,
    fontSize: hp(2),
    fontWeight: "600",
  },
});
