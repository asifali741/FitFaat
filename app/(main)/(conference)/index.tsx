import AppHeader from "@/components/AppHeader";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from "react-native-responsive-screen";
import { SafeAreaView } from "react-native-safe-area-context";
import { colorsSheet } from "../(settings)/ui_elements";

export default function ConferenceScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader 
        title="Video Conference"
        showStepIndicator={true}
        currentStep={1}
        totalSteps={3}
      />

      {/* Main Content */}
      <View style={styles.content}>
        <View style={styles.welcomeSection}>
          <View style={styles.iconContainer}>
            <Ionicons name="videocam" size={hp(8)} color={colorsSheet.primary} />
          </View>
          <Text style={styles.welcomeTitle}>Video Consultation</Text>
          <Text style={styles.welcomeSubtitle}>
            Connect with healthcare professionals through secure video calls for personalized consultations and medical advice.
          </Text>
        </View>

        {/* Features */}
        <View style={styles.featuresContainer}>
          <View style={styles.featureItem}>
            <Ionicons name="shield-checkmark" size={30} color={colorsSheet.success} />
            <Text style={styles.featureText}>Secure & Private</Text>
          </View>
          
          <View style={styles.featureItem}>
            <Ionicons name="time" size={30} color={colorsSheet.info} />
            <Text style={styles.featureText}>24/7 Availability</Text>
          </View>
          
          <View style={styles.featureItem}>
            <Ionicons name="people" size={30} color={colorsSheet.secondary} />
            <Text style={styles.featureText}>Expert Doctors</Text>
          </View>
        </View>

        {/* Action Button */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={styles.scheduleButton}
            onPress={() => router.push('/(main)/(conference)/schedule-appointment')}
          >
            <Text style={styles.scheduleButtonText}>Schedule Appointment 📅</Text>
          </TouchableOpacity>
        </View>
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
    backgroundColor: colorsSheet.primary,
  },
  menuButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: hp(2.5),
    fontWeight: "bold",
    color: colorsSheet.textOnPrimary,
  },
  content: {
    flex: 1,
    backgroundColor: colorsSheet.screenColor,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingTop: hp(4),
    paddingHorizontal: wp(6),
  },
  welcomeSection: {
    alignItems: "center",
    marginBottom: hp(3),
    paddingHorizontal: wp(4),
  },
  iconContainer: {
    width: Math.min(hp(14), wp(28)),
    height: Math.min(hp(14), wp(28)),
    backgroundColor: colorsSheet.primarySoft,
    borderRadius: Math.min(hp(7), wp(14)),
    alignItems: "center",
    justifyContent: "center",
    marginBottom: hp(2),
  },
  welcomeTitle: {
    fontSize: Math.min(hp(2.8), wp(7)),
    fontWeight: "bold",
    color: colorsSheet.textPrimary,
    textAlign: "center",
    marginBottom: hp(1),
    paddingHorizontal: wp(2),
  },
  welcomeSubtitle: {
    fontSize: Math.min(hp(1.8), wp(4.5)),
    color: colorsSheet.textSecondary,
    textAlign: "center",
    lineHeight: Math.min(hp(2.5), wp(6)),
    paddingHorizontal: wp(6),
    marginBottom: hp(1),
  },
  featuresContainer: {
    marginBottom: hp(3),
    paddingHorizontal: wp(2),
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Math.min(hp(1.8), wp(4)),
    paddingHorizontal: wp(4),
    backgroundColor: colorsSheet.primarySoft,
    borderRadius: 15,
    marginBottom: hp(1.2),
    marginHorizontal: wp(1),
  },
  featureText: {
    fontSize: Math.min(hp(1.9), wp(4.8)),
    color: colorsSheet.textOnCard,
    marginLeft: wp(3),
    fontWeight: "500",
    flex: 1,
  },
  buttonContainer: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: wp(4),
    paddingBottom: hp(3),
  },
  scheduleButton: {
    backgroundColor: colorsSheet.primary,
    paddingVertical: Math.min(hp(2.2), wp(5.5)),
    paddingHorizontal: wp(6),
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colorsSheet.primary,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  scheduleButtonText: {
    color: colorsSheet.white,
    fontSize: Math.min(hp(2.1), wp(5.2)),
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  spacer: {
    width: wp(18),
  },
});
