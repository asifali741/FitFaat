import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from "react-native-responsive-screen";
import { colorsSheet } from "../(settings)/_ui_elements";

export default function TestVideoCallScreen() {
  const router = useRouter();

  const handleStartVideoCall = () => {
    // Generate a unique call ID for testing
    const testCallId = `test_call_${Date.now()}`;
    
    // Navigate to custom video call screen with all controls
    router.push({
      pathname: "/(main)/(conference)/custom-video-call" as any,
      params: {
        callId: testCallId,
        userName: "Test User",
        doctorName: "Test Doctor"
      }
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colorsSheet.textOnPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Test Video Call</Text>
        <View style={styles.spacer} />
      </View>

      <View style={styles.content}>
        <View style={styles.instructionsCard}>
          <Ionicons name="information-circle" size={40} color={colorsSheet.info} />
          <Text style={styles.instructionsTitle}>Video Call Test</Text>
          <Text style={styles.instructionsText}>
            Click the button below to immediately start a video call for testing purposes.
          </Text>
          <Text style={styles.warningText}>
            Note: Video calls require a development build. They won&apos;t work in Expo Go.
          </Text>
        </View>

        <TouchableOpacity 
          style={styles.startCallButton}
          onPress={handleStartVideoCall}
        >
          <Ionicons name="videocam" size={24} color={colorsSheet.white} />
          <Text style={styles.startCallButtonText}>Start Video Call Now</Text>
        </TouchableOpacity>

        <View style={styles.setupCard}>
          <Text style={styles.setupTitle}>Setup Instructions:</Text>
          <Text style={styles.setupStep}>1. Get your ZegoCloud credentials from console.zegocloud.com</Text>
          <Text style={styles.setupStep}>2. Update APP_ID and APP_SIGN in video-call.tsx</Text>
          <Text style={styles.setupStep}>3. Build the app: npx expo run:android or npx expo run:ios</Text>
          <Text style={styles.setupStep}>4. Install the development build on your device</Text>
          <Text style={styles.setupStep}>5. Click &quot;Start Video Call Now&quot; to test</Text>
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
  instructionsCard: {
    backgroundColor: colorsSheet.white,
    borderRadius: 20,
    padding: wp(6),
    alignItems: "center",
    marginBottom: hp(3),
    shadowColor: colorsSheet.primary,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  instructionsTitle: {
    fontSize: hp(2.4),
    fontWeight: "bold",
    color: colorsSheet.textPrimary,
    marginTop: hp(1),
    marginBottom: hp(1),
  },
  instructionsText: {
    fontSize: hp(1.8),
    color: colorsSheet.textSecondary,
    textAlign: "center",
    marginBottom: hp(1),
  },
  warningText: {
    fontSize: hp(1.6),
    color: colorsSheet.warning,
    textAlign: "center",
    fontStyle: "italic",
  },
  startCallButton: {
    flexDirection: "row",
    backgroundColor: colorsSheet.success,
    paddingVertical: hp(2.5),
    paddingHorizontal: wp(8),
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: hp(3),
    shadowColor: colorsSheet.success,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  startCallButtonText: {
    color: colorsSheet.white,
    fontSize: hp(2.2),
    fontWeight: "bold",
    marginLeft: wp(3),
  },
  setupCard: {
    backgroundColor: colorsSheet.primarySoft,
    borderRadius: 15,
    padding: wp(5),
  },
  setupTitle: {
    fontSize: hp(2),
    fontWeight: "bold",
    color: colorsSheet.textPrimary,
    marginBottom: hp(2),
  },
  setupStep: {
    fontSize: hp(1.6),
    color: colorsSheet.textSecondary,
    marginBottom: hp(1),
    paddingLeft: wp(2),
  },
});