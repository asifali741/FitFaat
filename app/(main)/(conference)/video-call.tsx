import { useNavigation } from '@react-navigation/native';
import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// Conditionally import Zego only on platforms that support it
let ZegoUIKitPrebuiltCall: any = null;
let ONE_ON_ONE_VIDEO_CALL_CONFIG: any = null;

try {
  const ZegoModule = require('@zegocloud/zego-uikit-prebuilt-call-rn');
  ZegoUIKitPrebuiltCall = ZegoModule.default;
  ONE_ON_ONE_VIDEO_CALL_CONFIG = ZegoModule.ONE_ON_ONE_VIDEO_CALL_CONFIG;
} catch (error) {
  console.warn('Zego SDK not available:', error);
}

// ZegoCloud credentials
// APP_ID should be a number - convert from hex if needed, or use the numeric app ID from ZegoCloud console
const APP_ID = parseInt('96ec17b2e9a1f1c54b8c6653fa691ab4', 16);
const APP_SIGN = "96ec17b2e9a1f1c54b8c6653fa691ab4f7bf1f47e6b589ef4d1159784da7b5db";

export default function VideoCallScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  
  // Extract and validate parameters
  const callId = Array.isArray(params.callId) ? params.callId[0] : params.callId;
  const userName = Array.isArray(params.userName) ? params.userName[0] : params.userName;
  const doctorName = Array.isArray(params.doctorName) ? params.doctorName[0] : params.doctorName;

  // Generate unique user ID (stable for component lifecycle)
  const userID = React.useMemo(() => `user_${Date.now()}_${Math.floor(Math.random() * 10000)}`, []);
  const displayName = userName || "Patient";
  const roomId = callId || `call_${Date.now()}`;

  const navigation = useNavigation();

  const handleCallEnd = () => {
    // Navigate back to conference screen when call ends
    try {
      if (navigation && (navigation as any).canGoBack && (navigation as any).canGoBack()) {
        (navigation as any).goBack();
        return;
      }
    } catch (e) {}

    router.back();
  };

  // Show error if Zego SDK is not available
  if (!ZegoUIKitPrebuiltCall) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Video Call Unavailable</Text>
          <Text style={styles.errorText}>
            Video calling requires a development build.
          </Text>
          <Text style={styles.errorText}>
            Please run: npx expo run:android or npx expo run:ios
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ZegoUIKitPrebuiltCall
        appID={APP_ID}
        appSign={APP_SIGN}
        userID={userID}
        userName={displayName}
        callID={roomId}
        
        config={{
          ...ONE_ON_ONE_VIDEO_CALL_CONFIG,
          onCallEnd: handleCallEnd,
          
          // Customize the call UI
          bottomMenuBarConfig: {
            buttons: [
              'toggleCameraButton',
              'toggleMicrophoneButton',
              'hangUpButton',
              'switchCameraButton',
            ],
          },
          
          // Enable audio and video by default
          turnOnCameraWhenJoining: true,
          turnOnMicrophoneWhenJoining: true,
          
          // Use speaker by default
          useSpeakerWhenJoining: true,
          
          // Layout configuration
          layout: {
            mode: 'pictureInPicture',
            config: {
              switchLargeOrSmallViewByClick: true,
            },
          },
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  errorText: {
    color: '#ccc',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 10,
  },
});
