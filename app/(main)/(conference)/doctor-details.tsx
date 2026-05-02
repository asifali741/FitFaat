import BackButton from '@/components/BackButton';
import { theme } from "@/constants/theme";
import { useTheme } from '@/contexts/ThemeContext';
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from "react-native-responsive-screen";
import { SafeAreaView } from "react-native-safe-area-context";
import { getDoctorById } from "./_doctorsData";

export default function DoctorDetailsScreen() {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const router = useRouter();
  const { doctorId, date } = useLocalSearchParams<{ doctorId: string; date: string }>();
  const doctor = getDoctorById(doctorId);

  if (!doctor) {
    return (
      <SafeAreaView style={styles.container}>
        <Text>Doctor not found</Text>
      </SafeAreaView>
    );
  }

  const handleBookAppointment = () => {
    router.push({
      pathname: "/(main)/(conference)/booking-confirmation" as any,
      params: { doctorId, date }
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <BackButton style={styles.backButton} testID="doctor-details-back" />
        <Text style={styles.headerTitle}>Doctor Details</Text>
        <View style={styles.spacer} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Doctor Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarLarge}>
            <Ionicons name="person" size={80} color={colors.primary} />
          </View>
          <Text style={styles.doctorName}>{doctor.name}</Text>
          <View style={styles.specialtyContainer}>
            <View style={styles.specialtyBadge}>
              <Text style={styles.specialtyText}>{doctor.specialty}</Text>
            </View>
          </View>
        </View>

        {/* Tags Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Professional Tags</Text>
          <View style={styles.tagsContainer}>
            {doctor.tags.map((tag, index) => (
              <View key={index} style={styles.tag}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Details Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Consultation Details</Text>
          
          <View style={styles.detailRow}>
            <View style={styles.detailIconContainer}>
              <Ionicons name="briefcase" size={22} color={colors.primary} />
            </View>
            <View style={styles.detailTextContainer}>
              <Text style={styles.detailLabel}>Experience</Text>
              <Text style={styles.detailValue}>{doctor.experience}</Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <View style={styles.detailIconContainer}>
              <Ionicons name="star" size={22} color={colors.warning} />
            </View>
            <View style={styles.detailTextContainer}>
              <Text style={styles.detailLabel}>Rating</Text>
              <Text style={styles.detailValue}>{doctor.rating} / 5.0</Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <View style={styles.detailIconContainer}>
              <Ionicons name="cash" size={22} color={colors.success} />
            </View>
            <View style={styles.detailTextContainer}>
              <Text style={styles.detailLabel}>Consultation Fee</Text>
              <Text style={styles.detailValue}>{doctor.consultationFee}</Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <View style={styles.detailIconContainer}>
              <Ionicons name="mail" size={22} color={colors.info} />
            </View>
            <View style={styles.detailTextContainer}>
              <Text style={styles.detailLabel}>Email</Text>
              <Text style={styles.detailValue}>{doctor.email}</Text>
            </View>
          </View>
        </View>

        {/* Book Button */}
        <TouchableOpacity 
          style={styles.bookButton}
          onPress={handleBookAppointment}
        >
          <Text style={styles.bookButtonText}>Continue to Book Appointment</Text>
          <Ionicons name="arrow-forward" size={20} color={colors.white} />
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
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
    color: colors.textOnPrimary,
    flex: 1,
    textAlign: "center",
  },
  spacer: {
    width: 40,
  },
  content: {
    flex: 1,
    backgroundColor: colors.screenColor,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingTop: hp(3),
    paddingHorizontal: wp(6),
  },
  profileCard: {
    alignItems: "center",
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: wp(6),
    marginBottom: hp(2),
    shadowColor: colors.primary,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 5,
  },
  avatarLarge: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: hp(2),
    borderWidth: 3,
    borderColor: colors.primary,
  },
  doctorName: {
    fontSize: hp(2.5),
    fontWeight: "bold",
    color: colors.textPrimary,
    marginBottom: hp(1),
  },
  specialtyContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
  },
  specialtyBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: wp(4),
    paddingVertical: hp(0.8),
    borderRadius: 20,
  },
  specialtyText: {
    color: colors.white,
    fontSize: hp(1.6),
    fontWeight: "600",
  },
  section: {
    marginBottom: hp(2),
  },
  sectionTitle: {
    fontSize: hp(2),
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: hp(1.5),
  },
  tagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: wp(2),
  },
  tag: {
    backgroundColor: colors.success,
    paddingHorizontal: wp(3),
    paddingVertical: hp(1),
    borderRadius: 15,
  },
  tagText: {
    color: colors.white,
    fontSize: hp(1.5),
    fontWeight: "500",
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: wp(4),
    marginBottom: hp(1),
    shadowColor: colors.primary,
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  detailIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: wp(3),
  },
  detailTextContainer: {
    flex: 1,
  },
  detailLabel: {
    fontSize: hp(1.5),
    color: colors.textSecondary,
    marginBottom: hp(0.3),
  },
  detailValue: {
    fontSize: hp(1.8),
    fontWeight: "600",
    color: colors.textPrimary,
  },
  bookButton: {
    flexDirection: "row",
    backgroundColor: colors.primary,
    paddingVertical: hp(2),
    paddingHorizontal: wp(6),
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: hp(3),
    shadowColor: colors.primary,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  bookButtonText: {
    color: colors.white,
    fontSize: hp(2),
    fontWeight: "600",
    marginRight: wp(2),
  },
});
