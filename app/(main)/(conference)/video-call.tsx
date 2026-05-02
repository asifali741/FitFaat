import { tokenStorage } from '@/utils/auth/tokenStorage';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { ONE_ON_ONE_VIDEO_CALL_CONFIG, ZegoUIKitPrebuiltCall } from '@zegocloud/zego-uikit-prebuilt-call-rn';
import Constants from 'expo-constants';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    getCallID,
    getZegoUserID,
    getZegoUserName,
    ZEGO_APP_ID,
    ZEGO_APP_SIGN,
} from "@/utils/zegoConfig";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Linking,
    PermissionsAndroid,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from "react-native-responsive-screen";
import { SafeAreaView } from "react-native-safe-area-context";

import Constants, { AppOwnership } from "expo-constants";

// Try to import ZegoCloud SDK - will fail in Expo Go
let ZegoUIKitPrebuiltCall: any = null;
let ONE_ON_ONE_VIDEO_CALL_CONFIG: any = null;
let ZegoCallEndReason: any = null;
let isZegoAvailable = false;
let sdkLoadError: string | null = null;

const isExpoGo = Constants.appOwnership === AppOwnership.Expo;
const hasValidZegoCredentials =
  Number.isFinite(ZEGO_APP_ID) && ZEGO_APP_ID > 0 && Boolean(ZEGO_APP_SIGN);

const isRenderableZegoComponent = (component: any): boolean => {
  if (!component) return false;
  if (typeof component === "function") return true;

  if (typeof component === "object") {
    return (
      typeof component.render === "function" || Boolean(component.$$typeof)
    );
  }

  return false;
};

try {
  // If we're in Expo Go, we know it won't work even if the JS loads
  if (!isExpoGo) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const ZegoModule = require("@zegocloud/zego-uikit-prebuilt-call-rn");

      // Debug: Log what we're getting from the module
      console.log("📦 [ZEGO] Module loaded, checking exports...");
      console.log("📦 [ZEGO] Default export:", !!ZegoModule.default);
      console.log(
        "📦 [ZEGO] Named export:",
        !!ZegoModule.ZegoUIKitPrebuiltCall,
      );
      console.log("📦 [ZEGO] Module keys:", Object.keys(ZegoModule).join(", "));

      // The package default export is a service object. Render the named UI component.
      ZegoUIKitPrebuiltCall = ZegoModule.ZegoUIKitPrebuiltCall;
      ONE_ON_ONE_VIDEO_CALL_CONFIG = ZegoModule.ONE_ON_ONE_VIDEO_CALL_CONFIG;
      ZegoCallEndReason = ZegoModule.ZegoCallEndReason;

      // Verify we got a valid component
      if (isRenderableZegoComponent(ZegoUIKitPrebuiltCall)) {
        isZegoAvailable = true;
        console.log(
          "✅ [ZEGO] SDK loaded successfully and is a valid component",
        );
      } else {
        sdkLoadError = `Invalid ZegoUIKitPrebuiltCall export type: ${typeof ZegoUIKitPrebuiltCall}`;
        console.warn("⚠️ [ZEGO] Component loaded but invalid:", sdkLoadError);
      }
    } catch (moduleError: any) {
      sdkLoadError = moduleError?.message || "Failed to load module";
      console.error("❌ [ZEGO] Module import failed:", moduleError);
    }
  } else {
    sdkLoadError = "Running in Expo Go - native modules unavailable";
    console.log("ℹ️ [ZEGO] Expo Go detected, Zego unavailable");
  }
} catch (error: any) {
  sdkLoadError = error?.message || "Unknown error during SDK initialization";
  console.error("❌ [ZEGO] Critical error:", error);
}

const getParam = (value: string | string[] | undefined) => {
  if (Array.isArray(value)) return value[0];
  return value;
};

/**
 * Request camera and microphone permissions at runtime.
 * Android 6+ requires this even if declared in AndroidManifest.xml.
 * Returns true if all permissions are granted.
 */
async function requestCallPermissions(): Promise<boolean> {
  if (Platform.OS !== "android") return true;

  try {
    const grants = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.CAMERA,
      PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
    ]);

    const cameraGranted =
      grants[PermissionsAndroid.PERMISSIONS.CAMERA] ===
      PermissionsAndroid.RESULTS.GRANTED;
    const micGranted =
      grants[PermissionsAndroid.PERMISSIONS.RECORD_AUDIO] ===
      PermissionsAndroid.RESULTS.GRANTED;

    console.log("📷 Camera permission:", cameraGranted ? "GRANTED" : "DENIED");
    console.log("🎙️ Microphone permission:", micGranted ? "GRANTED" : "DENIED");

    if (!cameraGranted || !micGranted) {
      Alert.alert(
        "Permissions Required",
        "Camera and microphone permissions are required for video calls. Please grant them in your device settings.",
        [{ text: "OK" }],
      );
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error requesting permissions:", error);
    return false;
  }
}

export default function CallPage() {
  const router = useRouter();
  const navigation = useNavigation();
  const params = useLocalSearchParams();

  const callIdParam = getParam(params.callId as string | string[] | undefined);
  const appointmentIdParam = getParam(
    params.appointmentId as string | string[] | undefined,
  );
  const appointmentId = appointmentIdParam || callIdParam || "";

  // Generate ZegoCloud-safe call ID from appointment ID
  const callID = useMemo(
    () => (appointmentId ? getCallID(appointmentId) : ""),
    [appointmentId],
  );

  const [userID, setUserID] = useState<string>("");
  const [userName, setUserName] = useState<string>("User");
  const [isLoading, setIsLoading] = useState(true);
  const [permissionsGranted, setPermissionsGranted] = useState(false);
  const callEndedRef = useRef(false);
  const remoteUserJoinedRef = useRef(false);

  // Load current user info for ZegoCloud AND request permissions
  useEffect(() => {
    const initialize = async () => {
      try {
        if (!appointmentId) {
          setIsLoading(false);
          return;
        }

        // Step 1: Request permissions FIRST (critical for Android APK)
        const granted = await requestCallPermissions();
        setPermissionsGranted(granted);

        if (!granted) {
          setIsLoading(false);
          return;
        }

        // Step 2: Load user info
        const user = await tokenStorage.getUser();
        if (user) {
          setUserID(getZegoUserID(user));
          setUserName(getZegoUserName(user));
        } else {
          // Fallback: generate a unique ID
          setUserID(`user_${Platform.OS}_${Date.now()}`);
          setUserName("User");
        }
      } catch (error) {
        console.error("Failed to initialize video call:", error);
        setUserID(`user_${Date.now()}`);
        setUserName("User");
      } finally {
        setIsLoading(false);
      }
    };

    initialize();
  }, [appointmentId]);

  const navigateBack = () => {
    try {
      if (
        navigation &&
        (navigation as any).canGoBack &&
        (navigation as any).canGoBack()
      ) {
        (navigation as any).goBack();
        return;
      }
    } catch {
      // Ignore and fall back to router
    }
    router.back();
  };

  // Loading state while fetching user info and requesting permissions
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.loadingText}>Preparing video call...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!appointmentId || !callID) {
    return (
      <SafeAreaView style={styles.fallbackContainer}>
        <View style={styles.fallbackCard}>
          <Ionicons name="alert-circle" size={Math.min(hp(3.4), wp(7.5))} color="#FF6B6B" />
          <Text style={styles.fallbackTitle}>Missing Call Room</Text>
          <Text style={styles.fallbackText}>
            This video call does not have a valid appointment ID. Open the call
            from an appointment or chat so doctor and patient join the same
            room.
          </Text>
          <TouchableOpacity
            style={styles.fallbackButton}
            onPress={navigateBack}
          >
            <Text style={styles.fallbackButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Permissions denied state
  if (!permissionsGranted) {
    return (
      <SafeAreaView style={styles.fallbackContainer}>
        <View style={styles.fallbackCard}>
          <Ionicons name="lock-closed" size={Math.min(hp(3.4), wp(7.5))} color="#FF6B6B" />
          <Text style={styles.fallbackTitle}>Permissions Required</Text>
          <Text style={styles.fallbackText}>
            Camera and microphone permissions are required for video calls.
            Please grant them in your device settings and try again.
          </Text>
          <TouchableOpacity
            style={styles.fallbackButton}
            onPress={async () => {
              const granted = await requestCallPermissions();
              setPermissionsGranted(granted);
            }}
          >
            <Text style={styles.fallbackButtonText}>Request Permissions</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.fallbackButton, { marginTop: hp(1) }]}
            onPress={() => Linking.openSettings()}
          >
            <Text style={styles.fallbackButtonText}>Open Settings</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.fallbackButton, { marginTop: hp(1) }]}
            onPress={navigateBack}
          >
            <Text style={styles.fallbackButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Fallback when ZegoCloud SDK is not available (Expo Go)
  if (!isZegoAvailable || !ZegoUIKitPrebuiltCall) {
    return (
      <SafeAreaView style={styles.fallbackContainer}>
        <View style={styles.fallbackCard}>
          <Ionicons name="alert-circle" size={Math.min(hp(5), wp(10.7))} color="#FF6B6B" />
          <Text style={styles.fallbackTitle}>Video Call Setup Error</Text>
          <Text style={styles.fallbackText}>
            {sdkLoadError
              ? `The Zego SDK failed to load: ${sdkLoadError}`
              : "The video calling feature requires a production build, not Expo Go."}
          </Text>

          {isExpoGo && (
            <>
              <View style={styles.fallbackCodeBlock}>
                <Text style={styles.fallbackCode}>📱 Build with EAS:</Text>
                <Text style={styles.fallbackCode}>
                  eas build --platform android
                </Text>
                <Text style={[styles.fallbackCode, { marginTop: hp(1) }]}>
                  📱 Or local dev build:
                </Text>
                <Text style={styles.fallbackCode}>
                  eas build --profile development
                </Text>
              </View>
            </>
          )}

          {/* Debug Info */}
          <View style={styles.debugContainer}>
            <Text style={styles.debugTitle}>📊 Debug Information:</Text>
            <Text style={styles.debugText}>
              SDK Available: {String(isZegoAvailable)}
            </Text>
            <Text style={styles.debugText}>
              Component Type: {typeof ZegoUIKitPrebuiltCall}
            </Text>
            <Text style={styles.debugText}>Expo Go: {String(isExpoGo)}</Text>
            <Text style={styles.debugText}>
              Error: {sdkLoadError || "None"}
            </Text>
            <Text style={styles.debugText}>Room ID: {callID}</Text>
            <Text style={styles.debugText}>App ID: {ZEGO_APP_ID}</Text>
            <Text style={styles.debugText}>User ID: {userID}</Text>
          </View>

          <TouchableOpacity
            style={styles.fallbackButton}
            onPress={navigateBack}
          >
            <Text style={styles.fallbackButtonText}>Go Back</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.fallbackButton,
              { marginTop: hp(1), backgroundColor: "#2a6db8" },
            ]}
            onPress={() => {
              const debugInfo = `
🔴 VIDEO CALL DEBUG INFO
SDK Available: ${isZegoAvailable}
Component Type: ${typeof ZegoUIKitPrebuiltCall}
Expo Go: ${isExpoGo}
Error: ${sdkLoadError || "None"}
Room ID: ${callID}
App ID: ${ZEGO_APP_ID}
              `.trim();
              Alert.alert("Video Call Debug Info", debugInfo);
            }}
          >
            <Text style={styles.fallbackButtonText}>📋 Show Debug Info</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!hasValidZegoCredentials) {
    return (
      <SafeAreaView style={styles.fallbackContainer}>
        <View style={styles.fallbackCard}>
          <Ionicons name="alert-circle" size={Math.min(hp(3.4), wp(7.5))} color="#FF6B6B" />
          <Text style={styles.fallbackTitle}>
            Video Call Configuration Error
          </Text>
          <Text style={styles.fallbackText}>
            ZEGOCLOUD App ID or App Sign is missing. Add ZEGO_APP_ID and
            ZEGO_APP_SIGN to the app configuration before starting a video call.
          </Text>

          <View style={styles.debugContainer}>
            <Text style={styles.debugTitle}>Debug Information:</Text>
            <Text style={styles.debugText}>Room ID: {callID}</Text>
            <Text style={styles.debugText}>
              App ID: {Number.isFinite(ZEGO_APP_ID) ? ZEGO_APP_ID : "Invalid"}
            </Text>
            <Text style={styles.debugText}>
              App Sign: {ZEGO_APP_SIGN ? "Configured" : "Missing"}
            </Text>
            <Text style={styles.debugText}>User ID: {userID}</Text>
          </View>

          <TouchableOpacity
            style={styles.fallbackButton}
            onPress={navigateBack}
          >
            <Text style={styles.fallbackButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Build the config safely — guard against ONE_ON_ONE_VIDEO_CALL_CONFIG being undefined
  const callConfig = {
    ...(ONE_ON_ONE_VIDEO_CALL_CONFIG || {}),
    onCallEnd: (endedCallID: string, reason: number, duration: number) => {
      const remoteHangUpReason = ZegoCallEndReason?.remoteHangUp ?? 1;
      if (reason === remoteHangUpReason && !remoteUserJoinedRef.current) {
        console.log(
          "👤 [VIDEO CALL] Waiting for the other participant to join",
        );
        return;
      }

      if (callEndedRef.current) return;
      callEndedRef.current = true;
      console.log("📴 [VIDEO CALL] Call ended", {
        callID: endedCallID,
        reason,
        duration,
      });
      navigateBack();
    },
    onHangUp: () => {
      if (callEndedRef.current) return;
      callEndedRef.current = true;
      console.log("📴 [VIDEO CALL] Hang up pressed");
      navigateBack();
    },
    onJoinRoom: () => {
      remoteUserJoinedRef.current = false;
      console.log("✅ [VIDEO CALL] Joined ZEGOCLOUD room:", callID);
    },
    onUserJoin: (users: unknown[]) => {
      if (users?.length) {
        remoteUserJoinedRef.current = true;
      }
      console.log(
        "👥 [VIDEO CALL] Remote participant joined:",
        users?.length || 0,
      );
    },
    hangUpConfirmInfo: {
      title: "Leave the call",
      message: "Are you sure you want to leave this video consultation?",
      cancelButtonName: "Stay",
      confirmButtonName: "Leave",
    },
    turnOnCameraWhenJoining: true,
    turnOnMicrophoneWhenJoining: true,
    useSpeakerWhenJoining: true,
  };

  // Main ZegoCloud Video Call UI
  // Rendered WITHOUT SafeAreaView wrapper to avoid layout conflicts with native views
  return (
    <View style={styles.container}>
      <ZegoUIKitPrebuiltCall
        appID={ZEGO_APP_ID}
        appSign={ZEGO_APP_SIGN}
        userID={userID}
        userName={userName}
        callID={callID}
        config={callConfig}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    color: "#fff",
    marginTop: hp(2),
    fontSize: Math.min(hp(2), wp(4.3)),
  },
  fallbackContainer: {
    flex: 1,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
    padding: wp(6),
  },
  fallbackCard: {
    backgroundColor: "#1b1b1b",
    borderRadius: wp(4),
    padding: wp(6),
    alignItems: "center",
    gap: hp(1.5),
    width: "100%",
  },
  fallbackTitle: {
    color: "#fff",
    fontSize: Math.min(hp(2.2), wp(4.8)),
    fontWeight: "600",
    textAlign: "center",
  },
  fallbackText: {
    color: "#ccc",
    fontSize: Math.min(hp(1.8), wp(3.8)),
    textAlign: "center",
  },
  fallbackCodeBlock: {
    backgroundColor: "#0f0f0f",
    borderRadius: wp(2.7),
    paddingVertical: hp(1.2),
    paddingHorizontal: wp(3.7),
    width: "100%",
    gap: hp(0.5),
  },
  fallbackCode: {
    color: "#8ab4f8",
    fontSize: Math.min(hp(1.6), wp(3.5)),
    textAlign: "center",
  },
  debugContainer: {
    backgroundColor: "#0f0f0f",
    borderRadius: wp(2.7),
    paddingVertical: hp(1.2),
    paddingHorizontal: wp(3.7),
    width: "100%",
    gap: hp(0.25),
    marginTop: hp(0.5),
  },
  debugTitle: {
    color: "#4CAF50",
    fontSize: Math.min(hp(1.6), wp(3.5)),
    fontWeight: "600",
    marginBottom: hp(0.5),
  },
  debugText: {
    color: "#888",
    fontSize: Math.min(hp(1.5), wp(3.2)),
  },
  fallbackButton: {
    marginTop: hp(1),
    backgroundColor: "#2b2b2b",
    paddingHorizontal: wp(4.8),
    paddingVertical: hp(1.2),
    borderRadius: wp(2.7),
  },
  fallbackButtonText: {
    color: "#fff",
    fontSize: Math.min(hp(1.8), wp(3.8)),
    fontWeight: "600",
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  errorTitle: {
    color: '#FF6B6B',
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 16,
  },
  errorMessage: {
    color: '#ccc',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 24,
  },
  errorSubText: {
    color: '#999',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  commandCode: {
    color: '#4CAF50',
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    marginVertical: 6,
    overflow: 'hidden',
  },
});
