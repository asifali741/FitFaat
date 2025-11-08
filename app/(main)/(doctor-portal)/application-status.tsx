import { Ionicons } from "@expo/vector-icons";
import { DrawerActions, useNavigation } from "@react-navigation/native";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { Animated, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from "react-native-responsive-screen";
import { SafeAreaView } from "react-native-safe-area-context";
import { colorsSheet } from "../(settings)/_ui_elements";

export default function ApplicationStatusScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const [pulseAnim] = useState(new Animated.Value(1));

  const steps = [
    { title: "Application Received", description: "Your application has been successfully submitted", completed: true },
    { title: "Document Verification", description: "We are reviewing your credentials and documents", completed: true },
    { title: "Background Check", description: "Conducting professional background verification", completed: false },
    { title: "Final Review", description: "Final approval from our medical board", completed: false },
  ];

  const openDrawer = () => {
    navigation.dispatch(DrawerActions.openDrawer());
  };

  // Simulate progress animation
  useEffect(() => {
    const timer = setInterval(() => {
      setProgress(prev => {
        if (prev < 100) {
          const newProgress = prev + 2;
          setCurrentStep(Math.floor(newProgress / 25));
          return newProgress;
        }
        return prev;
      });
    }, 100);

    return () => clearInterval(timer);
  }, []);

  // Pulse animation for the status icon
  useEffect(() => {
    const pulse = () => {
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]).start(() => pulse());
    };
    pulse();
  }, [pulseAnim]);

  const handleGoHome = () => {
    router.push('/(main)/(dashboard)');
  };

  const handleCheckStatus = () => {
    // In a real app, this would check the actual application status
    console.log("Checking application status...");
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.menuButton}
          onPress={openDrawer}
        >
          <Ionicons name="menu" size={24} color={colorsSheet.textOnPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Application Status</Text>
        <View style={styles.spacer} />
      </View>

      {/* Main Content */}
      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: hp(4) }}
      >
        {/* Status Icon */}
        <View style={styles.statusContainer}>
          <Animated.View style={[styles.statusIcon, { transform: [{ scale: pulseAnim }] }]}>
            <Ionicons name="time" size={64} color={colorsSheet.warning} />
          </Animated.View>
          <Text style={styles.statusTitle}>Application Under Review</Text>
          <Text style={styles.statusSubtitle}>
            Your application is being processed by our medical team
          </Text>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressSection}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressTitle}>Review Progress</Text>
            <Text style={styles.progressPercentage}>{Math.round(progress)}%</Text>
          </View>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
        </View>

        {/* Timeline */}
        <View style={styles.timelineSection}>
          <Text style={styles.timelineTitle}>Review Process</Text>
          {steps.map((step, index) => (
            <View key={index} style={styles.timelineItem}>
              <View style={[
                styles.timelineIcon,
                step.completed ? styles.timelineIconCompleted : styles.timelineIconPending
              ]}>
                <Ionicons 
                  name={step.completed ? "checkmark" : "time"} 
                  size={20} 
                  color={step.completed ? colorsSheet.textOnPrimary : colorsSheet.textSecondary} 
                />
              </View>
              <View style={styles.timelineContent}>
                <Text style={[
                  styles.timelineStepTitle,
                  step.completed ? styles.timelineStepTitleCompleted : styles.timelineStepTitlePending
                ]}>
                  {step.title}
                </Text>
                <Text style={styles.timelineStepDescription}>
                  {step.description}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Information Card */}
        <View style={styles.infoCard}>
          <View style={styles.infoHeader}>
            <Ionicons name="information-circle" size={24} color={colorsSheet.info} />
            <Text style={styles.infoTitle}>What happens next?</Text>
          </View>
          <Text style={styles.infoText}>
            Our medical team will carefully review your application, verify your credentials, 
            and conduct a background check. This process typically takes 2-3 business days.
          </Text>
          <View style={styles.infoDetails}>
            <Text style={styles.infoDetailItem}>• Document verification</Text>
            <Text style={styles.infoDetailItem}>• Professional background check</Text>
            <Text style={styles.infoDetailItem}>• Medical board approval</Text>
            <Text style={styles.infoDetailItem}>• Final review and decision</Text>
          </View>
        </View>

        {/* Contact Information */}
        <View style={styles.contactCard}>
          <Text style={styles.contactTitle}>Need Help?</Text>
          <Text style={styles.contactText}>
            If you have any questions about your application, please contact our support team.
          </Text>
          <View style={styles.contactInfo}>
            <View style={styles.contactItem}>
              <Ionicons name="mail" size={16} color={colorsSheet.primary} />
              <Text style={styles.contactItemText}>support@fitfaat.com</Text>
            </View>
            <View style={styles.contactItem}>
              <Ionicons name="call" size={16} color={colorsSheet.primary} />
              <Text style={styles.contactItemText}>+1 (555) 123-4567</Text>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleCheckStatus}
          >
            <Ionicons name="refresh" size={20} color={colorsSheet.textOnPrimary} />
            <Text style={styles.primaryButtonText}>Check Status</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handleGoHome}
          >
            <Ionicons name="home" size={20} color={colorsSheet.primary} />
            <Text style={styles.secondaryButtonText}>Go to Dashboard</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
  spacer: {
    width: wp(18),
  },
  content: {
    flex: 1,
    backgroundColor: colorsSheet.screenColor,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingTop: hp(4),
    paddingHorizontal: wp(6),
  },
  statusContainer: {
    alignItems: "center",
    marginBottom: hp(4),
  },
  statusIcon: {
    width: hp(12),
    height: hp(12),
    borderRadius: hp(6),
    backgroundColor: colorsSheet.warning + "20",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: hp(2),
  },
  statusTitle: {
    fontSize: Math.min(hp(2.8), wp(7)),
    fontWeight: "bold",
    color: colorsSheet.textPrimary,
    textAlign: "center",
    marginBottom: hp(1),
  },
  statusSubtitle: {
    fontSize: Math.min(hp(1.8), wp(4.5)),
    color: colorsSheet.textSecondary,
    textAlign: "center",
    lineHeight: Math.min(hp(2.5), wp(6)),
  },
  progressSection: {
    marginBottom: hp(4),
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: hp(1),
  },
  progressTitle: {
    fontSize: Math.min(hp(1.8), wp(4.5)),
    fontWeight: "600",
    color: colorsSheet.textPrimary,
  },
  progressPercentage: {
    fontSize: Math.min(hp(1.8), wp(4.5)),
    fontWeight: "bold",
    color: colorsSheet.primary,
  },
  progressBar: {
    height: hp(0.8),
    backgroundColor: colorsSheet.lightGray,
    borderRadius: hp(0.4),
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: colorsSheet.primary,
    borderRadius: hp(0.4),
  },
  timelineSection: {
    marginBottom: hp(4),
  },
  timelineTitle: {
    fontSize: Math.min(hp(2), wp(5)),
    fontWeight: "bold",
    color: colorsSheet.textPrimary,
    marginBottom: hp(2),
  },
  timelineItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: hp(2),
  },
  timelineIcon: {
    width: hp(4),
    height: hp(4),
    borderRadius: hp(2),
    alignItems: "center",
    justifyContent: "center",
    marginRight: wp(4),
    marginTop: hp(0.5),
  },
  timelineIconCompleted: {
    backgroundColor: colorsSheet.success,
  },
  timelineIconPending: {
    backgroundColor: colorsSheet.lightGray,
  },
  timelineContent: {
    flex: 1,
  },
  timelineStepTitle: {
    fontSize: Math.min(hp(1.8), wp(4.5)),
    fontWeight: "600",
    marginBottom: hp(0.5),
  },
  timelineStepTitleCompleted: {
    color: colorsSheet.textPrimary,
  },
  timelineStepTitlePending: {
    color: colorsSheet.textSecondary,
  },
  timelineStepDescription: {
    fontSize: Math.min(hp(1.5), wp(3.8)),
    color: colorsSheet.textSecondary,
    lineHeight: Math.min(hp(2), wp(5)),
  },
  infoCard: {
    backgroundColor: colorsSheet.primarySoft,
    borderRadius: 15,
    padding: hp(2.5),
    marginBottom: hp(3),
    borderLeftWidth: 4,
    borderLeftColor: colorsSheet.info,
  },
  infoHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: hp(1.5),
  },
  infoTitle: {
    fontSize: Math.min(hp(1.8), wp(4.5)),
    fontWeight: "bold",
    color: colorsSheet.textPrimary,
    marginLeft: wp(2),
  },
  infoText: {
    fontSize: Math.min(hp(1.6), wp(4)),
    color: colorsSheet.textSecondary,
    lineHeight: Math.min(hp(2.2), wp(5.5)),
    marginBottom: hp(1.5),
  },
  infoDetails: {
    marginTop: hp(1),
  },
  infoDetailItem: {
    fontSize: Math.min(hp(1.5), wp(3.8)),
    color: colorsSheet.textSecondary,
    marginBottom: hp(0.5),
  },
  contactCard: {
    backgroundColor: colorsSheet.cardBackground,
    borderRadius: 15,
    padding: hp(2.5),
    marginBottom: hp(4),
    borderWidth: 1,
    borderColor: colorsSheet.cardBorder,
  },
  contactTitle: {
    fontSize: Math.min(hp(1.8), wp(4.5)),
    fontWeight: "bold",
    color: colorsSheet.textPrimary,
    marginBottom: hp(1),
  },
  contactText: {
    fontSize: Math.min(hp(1.6), wp(4)),
    color: colorsSheet.textSecondary,
    lineHeight: Math.min(hp(2.2), wp(5.5)),
    marginBottom: hp(2),
  },
  contactInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  contactItem: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  contactItemText: {
    fontSize: Math.min(hp(1.5), wp(3.8)),
    color: colorsSheet.primary,
    marginLeft: wp(2),
    fontWeight: "500",
  },
  actionButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: hp(4),
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colorsSheet.primary,
    borderRadius: 25,
    paddingVertical: hp(2),
    paddingHorizontal: wp(6),
    flex: 0.48,
    justifyContent: "center",
  },
  primaryButtonText: {
    color: colorsSheet.textOnPrimary,
    fontSize: Math.min(hp(1.8), wp(4.5)),
    fontWeight: "600",
    marginLeft: wp(2),
  },
  secondaryButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colorsSheet.screenColor,
    borderRadius: 25,
    paddingVertical: hp(2),
    paddingHorizontal: wp(6),
    flex: 0.48,
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colorsSheet.primary,
  },
  secondaryButtonText: {
    color: colorsSheet.primary,
    fontSize: Math.min(hp(1.8), wp(4.5)),
    fontWeight: "600",
    marginLeft: wp(2),
  },
});
