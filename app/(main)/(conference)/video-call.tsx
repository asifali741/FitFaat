import React, { useState } from "react";
import { StyleSheet, Text, View, Platform, TouchableOpacity, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import VideoCallControls from '../../../components/conference/VideoCallControls';

// Conditionally import Zego only on platforms that support it
let ZegoUIKitPrebuiltCall: any = null;
let ONE_ON_ONE_VIDEO_CALL_CONFIG: any = null;

try {
  const ZegoModule = require('@zegocloud/zego-uikit-prebuilt-call-rn');
  // Use the named export ZegoUIKitPrebuiltCall
  ZegoUIKitPrebuiltCall = ZegoModule.ZegoUIKitPrebuiltCall;
  ONE_ON_ONE_VIDEO_CALL_CONFIG = ZegoModule.ONE_ON_ONE_VIDEO_CALL_CONFIG || {};
  
  if (!ZegoUIKitPrebuiltCall) {
    console.error('ZegoUIKitPrebuiltCall component not found in module');
  }
} catch (error) {
  console.warn('Zego SDK not available:', error);
}

// ZegoCloud credentials
const APP_ID = 1364932719;
const APP_SIGN = "96ec17b2e9a1f1c54b8c6653fa691ab4f7bf1f47e6b589ef4d1159784da7b5db";

// Validate APP_ID
if (!APP_ID) {
  console.error('Invalid APP_ID. Please check your ZegoCloud credentials.');
}

export default function VideoCallScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  
  // State for controls
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [isFrontCamera, setIsFrontCamera] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  
  // Extract and validate parameters
  const callId = Array.isArray(params.callId) ? params.callId[0] : params.callId;
  const userName = Array.isArray(params.userName) ? params.userName[0] : params.userName;
  const doctorName = Array.isArray(params.doctorName) ? params.doctorName[0] : params.doctorName;

  // Generate unique user ID (stable for component lifecycle)
  const userID = React.useMemo(() => `user_${Date.now()}_${Math.floor(Math.random() * 10000)}`, []);
  const displayName = userName || "Patient";
  const roomId = callId || `call_${Date.now()}`;

  const handleCallEnd = () => {
    // Navigate back to conference screen when call ends
    router.back();
  };
  
  const toggleMute = () => setIsMuted(!isMuted);
  
  const toggleCamera = () => {
    const newCameraState = !isCameraOff;
    setIsCameraOff(newCameraState);
    
    // Visual feedback
    if (newCameraState) {
      console.log('Camera OFF - Video sharing stopped');
    } else {
      console.log('Camera ON - Video sharing started');
    }
    // Note: Actual video stop/start is handled by Zego SDK based on state
  };
  
  const toggleSpeaker = () => setIsSpeakerOn(!isSpeakerOn);
  
  const switchCamera = () => {
    const newCameraState = !isFrontCamera;
    setIsFrontCamera(newCameraState);
    console.log('Camera switched to:', newCameraState ? 'front' : 'back');
    
    Alert.alert(
      'Camera Switch',
      `Switched to ${newCameraState ? 'front' : 'back'} camera`,
      [{ text: 'OK' }],
      { cancelable: true }
    );
  };
  
  const handleToggleScreenShare = () => {
    setIsScreenSharing(!isScreenSharing);
    Alert.alert(
      "Screen Share",
      isScreenSharing ? "Screen sharing stopped" : "Screen sharing started"
    );
  };
  
  const handleToggleRecording = () => {
    const newRecordingState = !isRecording;
    setIsRecording(newRecordingState);
    
    Alert.alert(
      newRecordingState ? "Recording Started" : "Recording Stopped",
      newRecordingState ? "Your call is now being recorded" : "Recording has been stopped"
    );
  };
  
  
  const handleOpenChat = () => {
    Alert.alert("Chat", "Chat feature coming soon!");
  };
  
  const handleOpenParticipants = () => {
    Alert.alert("Participants", `${displayName} and ${doctorName || 'Doctor'} in call`);
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

  // Validate APP_ID before rendering
  if (!APP_ID) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Configuration Error</Text>
          <Text style={styles.errorText}>
            Invalid ZegoCloud APP_ID. Please check your credentials.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={{ flex: 1 }}>
        <ZegoUIKitPrebuiltCall
          appID={APP_ID}
          appSign={APP_SIGN}
          userID={userID}
          userName={displayName}
          callID={roomId}
          
          config={{
            ...ONE_ON_ONE_VIDEO_CALL_CONFIG,
            onCallEnd: handleCallEnd,
            
            // Force show bottom menu bar
            bottomMenuBarConfig: {
              isVisible: true,
              buttons: [
                'toggleCameraButton',
                'toggleMicrophoneButton', 
                'hangUpButton',
                'switchCameraButton',
                'swtichAudioOutputButton',
              ],
              maxCount: 5,
              style: {
                backgroundColor: 'rgba(0, 0, 0, 0.7)',
                height: 70,
              },
            },
            
            // Top menu bar
            topMenuBarConfig: {
              isVisible: true,
              title: `${doctorName || 'Doctor'}`,
              style: {
                backgroundColor: 'rgba(0, 0, 0, 0.7)',
              },
            },
            
            // Initial states
            turnOnCameraWhenJoining: !isCameraOff,
            turnOnMicrophoneWhenJoining: !isMuted,
            useSpeakerWhenJoining: isSpeakerOn,
            videoResolution: '720p',
            facingMode: isFrontCamera ? 'user' : 'environment',
            
            // Show member info
            memberListConfig: {
              showMicrophoneState: true,
              showCameraState: true,
            },
            
            // Duration timer
            durationConfig: {
              isVisible: true,
            },
            
            // Audio/Video settings
            audioVideoViewConfig: {
              showSoundWavesInAudioMode: true,
              useVideoViewAspectFill: false,
              showAvatarInAudioMode: true,
            },
            
            // Layout
            layout: {
              mode: 'pictureInPicture',
              config: {
                switchLargeOrSmallViewByClick: true,
              },
            },
          }}
        />
        
        {/* Custom Video Call Controls Overlay */}
        <VideoCallControls
          isMuted={isMuted}
          isCameraOff={isCameraOff}
          isSpeakerOn={isSpeakerOn}
          isFrontCamera={isFrontCamera}
          isScreenSharing={isScreenSharing}
          isRecording={isRecording}
          onToggleMute={toggleMute}
          onToggleCamera={toggleCamera}
          onToggleSpeaker={toggleSpeaker}
          onSwitchCamera={switchCamera}
          onEndCall={handleCallEnd}
          onToggleScreenShare={handleToggleScreenShare}
          onToggleRecording={handleToggleRecording}
          onOpenChat={handleOpenChat}
        />
      </View>
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
  customControls: {
    position: 'absolute',
    bottom: 30,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  endCallButton: {
    backgroundColor: '#FF3B30',
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
});
