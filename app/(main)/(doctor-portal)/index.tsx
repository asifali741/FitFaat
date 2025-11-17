import AppHeader from "@/components/AppHeader";
import { useDoctorRegistration } from "@/hooks/useDoctorRegistration";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import { Alert, Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from "react-native-responsive-screen";
import { SafeAreaView } from "react-native-safe-area-context";
import { colorsSheet } from "../(settings)/_ui_elements";

export default function DoctorPortal() {
  const router = useRouter();
  const { getDoctorStatus } = useDoctorRegistration();
  const [doctorStatus, setDoctorStatus] = useState<string | null>(null);
  const [doctorName, setDoctorName] = useState<string | null>(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState(false);

  useFocusEffect(
    useCallback(() => {
      fetchDoctorStatus();
    }, [])
  );

  const fetchDoctorStatus = async () => {
    setIsLoadingStatus(true);
    try {
      const response = await getDoctorStatus();
      setDoctorStatus(response.doctor?.status || null);
      setDoctorName(response.doctor?.name || null);
    } catch (error) {
      // Doctor status not found (first time user)
      setDoctorStatus(null);
      setDoctorName(null);
    } finally {
      setIsLoadingStatus(false);
    }
  };

  const handleDoctorButtonPress = () => {
    if (doctorStatus === 'approved') {
      Alert.alert('Already Registered', 'You are already registered as a doctor!');
      return;
    }

    if (doctorStatus === 'pending') {
      Alert.alert('Application Pending', 'Your request is under process. We will let you know soon!');
      return;
    }

    if (doctorStatus === 'rejected') {
      Alert.alert('Application Rejected', 'Your application was rejected. You can submit a new application.');
      router.push('/(main)/(doctor-portal)/register-form');
      return;
    }

    // No previous application
    router.push('/(main)/(doctor-portal)/register-form');
  };

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader 
        title="Doctor Portal"
        showStepIndicator={false}
      />

      {/* Main Content */}
      <View style={styles.content}>
        <View style={styles.welcomeSection}>
          <Image 
            source={require("../../../assets/images/logo.png")} 
            style={styles.logo}
          />
          <Text style={styles.welcomeTitle}>Welcome to FitFaat Doctor Portal</Text>
          <Text style={styles.welcomeSubtitle}>
            Join our network of healthcare professionals and help patients achieve their fitness goals
          </Text>
        </View>

        {/* Features */}
        <View style={styles.featuresContainer}>
          <TouchableOpacity 
            style={[styles.featureItem, doctorStatus !== 'approved' && styles.featureItemDisabled]}
            disabled={doctorStatus !== 'approved'}
            activeOpacity={doctorStatus === 'approved' ? 0.7 : 1}
          >
            <Ionicons 
              name="videocam" 
              size={30} 
              color={doctorStatus === 'approved' ? colorsSheet.primary : colorsSheet.textSecondary} 
            />
            <Text style={[styles.featureText, doctorStatus !== 'approved' && styles.featureTextDisabled]}>
              Video Consultations
            </Text>
            {doctorStatus !== 'approved' && (
              <Ionicons name="lock-closed" size={20} color={colorsSheet.textSecondary} style={styles.lockIcon} />
            )}
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.featureItem, doctorStatus !== 'approved' && styles.featureItemDisabled]}
            onPress={() => doctorStatus === 'approved' && router.push('/(main)/(doctor-portal)/patient-management')}
            disabled={doctorStatus !== 'approved'}
            activeOpacity={doctorStatus === 'approved' ? 0.7 : 1}
          >
            <Ionicons 
              name="people" 
              size={30} 
              color={doctorStatus === 'approved' ? colorsSheet.primaryLight : colorsSheet.textSecondary} 
            />
            <Text style={[styles.featureText, doctorStatus !== 'approved' && styles.featureTextDisabled]}>
              Appointments Management
            </Text>
            {doctorStatus === 'approved' ? (
              <View style={styles.featureBadge}>
                <Text style={styles.featureBadgeText}>New</Text>
              </View>
            ) : (
              <Ionicons name="lock-closed" size={20} color={colorsSheet.textSecondary} style={styles.lockIcon} />
            )}
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.featureItem, doctorStatus !== 'approved' && styles.featureItemDisabled]}
            disabled={doctorStatus !== 'approved'}
            activeOpacity={doctorStatus === 'approved' ? 0.7 : 1}
          >
            <Ionicons 
              name="nutrition" 
              size={30} 
              color={doctorStatus === 'approved' ? colorsSheet.secondary : colorsSheet.textSecondary} 
            />
            <Text style={[styles.featureText, doctorStatus !== 'approved' && styles.featureTextDisabled]}>
              Diet Plan Creation
            </Text>
            {doctorStatus !== 'approved' && (
              <Ionicons name="lock-closed" size={20} color={colorsSheet.textSecondary} style={styles.lockIcon} />
            )}
          </TouchableOpacity>
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={styles.gradientButtonContainer}
            onPress={handleDoctorButtonPress}
            activeOpacity={0.8}
            disabled={isLoadingStatus}
          >
            <LinearGradient
              colors={['#26867C', '#4CAF50', '#66BB6A']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.gradientButton}
            >
              <Text style={styles.gradientButtonText}>
                {isLoadingStatus ? 'Loading...' : doctorStatus === 'approved' && doctorName ? `Hey Dr. ${doctorName} ` : 'Join as Doctor ✨'}
              </Text>
            </LinearGradient>
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
    fontSize: Math.min(hp(2.5), wp(6)),
    fontWeight: "bold",
    color: colorsSheet.textOnPrimary,
    textAlign: "center",
    flex: 1,
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
    marginBottom: hp(4),
  },
  logo: {
    width: hp(8),
    height: hp(8),
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
  },
  featuresContainer: {
    marginBottom: hp(4),
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: hp(2),
    paddingHorizontal: wp(4),
    backgroundColor: colorsSheet.primarySoft,
    borderRadius: 15,
    marginBottom: hp(1.5),
  },
  featureItemDisabled: {
    opacity: 0.5,
    backgroundColor: colorsSheet.cardBackground,
  },
  featureText: {
    fontSize: hp(2),
    color: colorsSheet.textOnCard,
    marginLeft: wp(4),
    fontWeight: "500",
    flex: 1,
  },
  featureTextDisabled: {
    color: colorsSheet.textSecondary,
  },
  lockIcon: {
    marginLeft: 'auto',
  },
  featureBadge: {
    backgroundColor: colorsSheet.primary,
    paddingVertical: hp(0.4),
    paddingHorizontal: wp(2),
    borderRadius: 12,
    marginLeft: 'auto',
  },
  featureBadgeText: {
    color: colorsSheet.white,
    fontSize: hp(1.3),
    fontWeight: '600',
  },
  buttonContainer: {
    flex: 1,
    justifyContent: "center",
  },
  gradientButtonContainer: {
    borderRadius: 30,
    overflow: "hidden",
    marginBottom: hp(2),
    shadowColor: colorsSheet.primary,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  gradientButton: {
    paddingVertical: hp(2.5),
    paddingHorizontal: wp(8),
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  gradientButtonText: {
    color: colorsSheet.white,
    fontSize: hp(2.4),
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  spacer: {
    width: wp(18),
  },
});
