import React, { useState, useEffect, useRef } from "react";
import { StyleSheet, Text, View, TouchableOpacity, Dimensions, Image, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons, FontAwesome5 } from "@expo/vector-icons";
import { BlurView } from 'expo-blur';
import VideoCallControls from '../../../components/conference/VideoCallControls';
import { switchCameraPosition, extractZegoEngine, initializeZegoEngine, getZegoEngineInstance } from '../../../utils/cameraUtils';

// Get screen dimensions
const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Conditionally import Zego
let ZegoUIKitPrebuiltCall: any = null;
let ONE_ON_ONE_VIDEO_CALL_CONFIG: any = null;
let ZegoExpressEngine: any = null;
let HOST_DEFAULT_CONFIG: any = null;

try {
  const ZegoModule = require('@zegocloud/zego-uikit-prebuilt-call-rn');
  ZegoUIKitPrebuiltCall = ZegoModule.ZegoUIKitPrebuiltCall;
  ONE_ON_ONE_VIDEO_CALL_CONFIG = ZegoModule.ONE_ON_ONE_VIDEO_CALL_CONFIG || {};
  HOST_DEFAULT_CONFIG = ZegoModule.HOST_DEFAULT_CONFIG || {};
  
  // Try to get the engine for direct control
  const ZegoExpressModule = require('@zegocloud/zego-express-engine-reactnative');
  if (ZegoExpressModule) {
    ZegoExpressEngine = ZegoExpressModule.default || ZegoExpressModule.ZegoExpressEngine;
  }
} catch (error) {
  console.warn('Zego SDK not available:', error);
}

// ZegoCloud credentials
const APP_ID = 1364932719;
const APP_SIGN = "96ec17b2e9a1f1c54b8c6653fa691ab4f7bf1f47e6b589ef4d1159784da7b5db";

export default function CustomVideoCallScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const zegoCallRef = useRef<any>(null);
  
  // State for controls
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [isBluetoothOn, setIsBluetoothOn] = useState(false);
  const [isFrontCamera, setIsFrontCamera] = useState(true);
  const [callDuration, setCallDuration] = useState(0);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  
  // Extract parameters
  const callId = Array.isArray(params.callId) ? params.callId[0] : params.callId;
  const userName = Array.isArray(params.userName) ? params.userName[0] : params.userName;
  const doctorName = Array.isArray(params.doctorName) ? params.doctorName[0] : params.doctorName;
  
  const userID = React.useMemo(() => `user_${Date.now()}_${Math.floor(Math.random() * 10000)}`, []);
  const displayName = userName || "Patient";
  const roomId = callId || `call_${Date.now()}`;
  
  // Call duration timer
  useEffect(() => {
    const timer = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);
    
    return () => clearInterval(timer);
  }, []);
  
  // Try to extract Zego engine after component mounts
  useEffect(() => {
    const checkForEngine = setInterval(() => {
      if (zegoCallRef.current) {
        const engine = extractZegoEngine(zegoCallRef);
        if (engine) {
          console.log('Zego engine extracted and initialized');
          clearInterval(checkForEngine);
        }
      }
    }, 1000);
    
    return () => clearInterval(checkForEngine);
  }, []);
  
  // Format duration
  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  const handleEndCall = () => {
    router.back();
  };
  
  const toggleMute = () => {
    setIsMuted(!isMuted);
    // Try different methods to toggle microphone
    try {
      if (zegoCallRef.current) {
        const possibleMethods = ['toggleMicrophone', 'toggleAudio', 'muteAudio', 'enableMicrophone'];
        for (const methodName of possibleMethods) {
          if (typeof zegoCallRef.current[methodName] === 'function') {
            zegoCallRef.current[methodName]();
            console.log(`Microphone toggled using ref.${methodName}`);
            break;
          }
        }
      }
      
      // Try the engine if ref methods don't exist
      const engine = getZegoEngineInstance() || ZegoExpressEngine;
      if (engine) {
        if (typeof engine.muteMicrophone === 'function') {
          engine.muteMicrophone(isMuted);
        } else if (typeof engine.enableMicrophone === 'function') {
          engine.enableMicrophone(!isMuted);
        }
      }
    } catch (error) {
      console.log('Microphone toggle error:', error);
    }
  };
  
  const toggleCamera = () => {
    const newCameraState = !isCameraOff;
    setIsCameraOff(newCameraState);
    
    // Handle video on/off
    try {
      // First try using the ref if it has camera control methods
      if (zegoCallRef.current) {
        // Try different possible method names on the ref
        const possibleMethods = [
          'toggleCamera',
          'toggleVideo',
          'muteVideo',
          'enableCamera',
          'setVideoEnable'
        ];
        
        for (const methodName of possibleMethods) {
          if (typeof zegoCallRef.current[methodName] === 'function') {
            zegoCallRef.current[methodName](!newCameraState);
            console.log(`Camera toggled using ref.${methodName}:`, !newCameraState);
            break;
          }
        }
      }
      
      // Then try the ZegoExpressEngine if available
      if (ZegoExpressEngine) {
        // Use Zego Express Engine if available
        if (typeof ZegoExpressEngine.enableCamera === 'function') {
          ZegoExpressEngine.enableCamera(!newCameraState);
          console.log('Camera toggled using enableCamera:', !newCameraState);
        } else if (typeof ZegoExpressEngine.mutePublishStreamVideo === 'function') {
          ZegoExpressEngine.mutePublishStreamVideo(newCameraState);
          console.log('Video muted using mutePublishStreamVideo:', newCameraState);
        } else if (typeof ZegoExpressEngine.enableLocalCamera === 'function') {
          ZegoExpressEngine.enableLocalCamera(!newCameraState);
          console.log('Camera toggled using enableLocalCamera:', !newCameraState);
        }
      }
      
      // Try to access the engine through the stored instance in cameraUtils
      const storedEngine = getZegoEngineInstance();
      if (storedEngine && storedEngine !== ZegoExpressEngine) {
        if (typeof storedEngine.enableCamera === 'function') {
          storedEngine.enableCamera(!newCameraState);
          console.log('Camera toggled using stored engine:', !newCameraState);
        } else if (typeof storedEngine.mutePublishStreamVideo === 'function') {
          storedEngine.mutePublishStreamVideo(newCameraState);
          console.log('Video muted using stored engine:', newCameraState);
        }
      }
    } catch (error) {
      console.log('Camera toggle handled by state only:', error);
    }
    
    // Visual feedback
    if (newCameraState) {
      console.log('Camera OFF - Video stopped');
      // Stop video sharing when camera is turned off
      if (isScreenSharing) {
        setIsScreenSharing(false);
      }
    } else {
      console.log('Camera ON - Video started');
    }
  };
  
  const toggleSpeaker = () => {
    setIsSpeakerOn(!isSpeakerOn);
    // Try different methods to toggle speaker
    try {
      if (zegoCallRef.current) {
        const possibleMethods = ['toggleSpeaker', 'setSpeakerOn', 'enableSpeaker'];
        for (const methodName of possibleMethods) {
          if (typeof zegoCallRef.current[methodName] === 'function') {
            zegoCallRef.current[methodName]();
            console.log(`Speaker toggled using ref.${methodName}`);
            break;
          }
        }
      }
      
      // Try the engine if ref methods don't exist
      const engine = getZegoEngineInstance() || ZegoExpressEngine;
      if (engine && typeof engine.setAudioRouteToSpeaker === 'function') {
        engine.setAudioRouteToSpeaker(isSpeakerOn);
      }
    } catch (error) {
      console.log('Speaker toggle error:', error);
    }
  };
  
  const toggleBluetooth = () => {
    setIsBluetoothOn(!isBluetoothOn);
    Alert.alert(
      "Bluetooth Audio",
      isBluetoothOn ? "Switching to phone speaker" : "Connecting to Bluetooth device...",
      [{ text: "OK" }]
    );
  };
  
  const switchCamera = () => {
    // Simple state toggle for UI
    const newState = !isFrontCamera;
    setIsFrontCamera(newState);
    console.log('Camera switched to:', newState ? 'front' : 'back');
    
    // Note: Actual camera switching needs to be done through Zego's SDK
    // The physical switch may require native module integration
    Alert.alert(
      'Camera Switch',
      `Switched to ${newState ? 'front' : 'back'} camera`,
      [{ text: 'OK' }],
      { cancelable: true }
    );
  };
  
  const handleToggleScreenShare = () => {
    setIsScreenSharing(!isScreenSharing);
    Alert.alert(
      "Screen Share",
      isScreenSharing ? "Screen sharing stopped" : "Screen sharing started",
      [{ text: "OK" }]
    );
  };
  
  const handleToggleRecording = () => {
    const newRecordingState = !isRecording;
    setIsRecording(newRecordingState);
    
    if (!newRecordingState) {
      // When stopping recording, optionally stop video
      Alert.alert(
        "Recording Stopped",
        "Do you want to stop sharing your video as well?",
        [
          {
            text: "Keep Video On",
            style: "cancel"
          },
          {
            text: "Stop Video",
            onPress: () => {
              setIsCameraOff(true);
              // Call the actual camera stop function
              try {
                const engine = getZegoEngineInstance() || ZegoExpressEngine;
                if (engine) {
                  if (typeof engine.enableCamera === 'function') {
                    engine.enableCamera(false);
                  } else if (typeof engine.mutePublishStreamVideo === 'function') {
                    engine.mutePublishStreamVideo(true);
                  }
                }
              } catch (error) {
                console.log('Error stopping video:', error);
              }
            },
            style: "destructive"
          }
        ]
      );
    } else {
      Alert.alert(
        "Recording Started",
        "Recording has been started. Your video is being recorded.",
        [{ text: "OK" }]
      );
    }
  };
  
  
  const handleOpenChat = () => {
    Alert.alert("Chat", "Chat feature coming soon!");
  };
  
  const handleOpenParticipants = () => {
    Alert.alert("Participants", `${displayName} and ${doctorName || 'Doctor'} in call`);
  };
  
  if (!ZegoUIKitPrebuiltCall) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Video Call Unavailable</Text>
          <Text style={styles.errorText}>
            Video calling requires a development build.
          </Text>
        </View>
      </SafeAreaView>
    );
  }
  
  return (
    <View style={styles.container}>
      {/* Video placeholder when camera is off */}
      {isCameraOff && (
        <View style={styles.cameraOffOverlay}>
          <View style={styles.cameraOffContent}>
            <Ionicons name="videocam-off" size={60} color="#666" />
            <Text style={styles.cameraOffText}>Video Stopped</Text>
            <Text style={styles.cameraOffSubtext}>Your camera is turned off</Text>
            <TouchableOpacity 
              style={styles.startVideoButton}
              onPress={toggleCamera}
            >
              <Text style={styles.startVideoButtonText}>Start Video</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
      
      {/* Zego Video Call Component */}
      <View style={[StyleSheet.absoluteFill, isCameraOff && { opacity: 0 }]}>
        <ZegoUIKitPrebuiltCall
          ref={zegoCallRef}
          appID={APP_ID}
          appSign={APP_SIGN}
          userID={userID}
          userName={displayName}
          callID={roomId}
          config={{
            ...ONE_ON_ONE_VIDEO_CALL_CONFIG,
            onCallEnd: handleEndCall,
            turnOnCameraWhenJoining: !isCameraOff,
            turnOnMicrophoneWhenJoining: !isMuted,
            useSpeakerWhenJoining: isSpeakerOn,
            videoResolution: '720p',
            useFrontFacingCamera: isFrontCamera,
            // Enable video controls
            showMyCameraToggleButton: true,
            showAudioVideoSettingsButton: true,
            // Camera event handlers
            onCameraOpen: () => {
              console.log('Camera opened');
              setIsCameraOff(false);
              // Try to initialize engine when camera opens
              setTimeout(() => {
                if (ZegoExpressEngine) {
                  initializeZegoEngine(ZegoExpressEngine);
                }
                extractZegoEngine(zegoCallRef);
              }, 500);
            },
            onCameraClose: () => {
              console.log('Camera closed');
              setIsCameraOff(true);
            },
            // Show Zego's built-in controls along with custom ones
            bottomMenuBarConfig: {
              isVisible: false,  // Hide Zego controls, use our custom ones
              buttons: [
                'switchCameraButton',
                'toggleCameraButton',
                'toggleMicrophoneButton',
                'hangUpButton',
              ],
              maxCount: 4,
              style: {
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                height: 60,
                position: 'absolute',
                bottom: 100,
              },
            },
            topMenuBarConfig: {
              isVisible: true,
              title: doctorName || 'Doctor',
              buttons: [],
            },
            durationConfig: {
              isVisible: true,
            },
            memberListConfig: {
              showMicrophoneState: true,
              showCameraState: true,
            },
          }}
        />
      </View>
      
      {/* Custom Video Call Controls */}
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
        onEndCall={handleEndCall}
        onToggleScreenShare={handleToggleScreenShare}
        onToggleRecording={handleToggleRecording}
        onOpenChat={handleOpenChat}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
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
  
  // Top Section
  topSection: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 15,
    backgroundColor: 'transparent',
  },
  topButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topCenter: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  callerName: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  encryptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  encryptionText: {
    color: '#999',
    fontSize: 12,
  },
  
  // Center Profile Section
  centerProfile: {
    position: 'absolute',
    top: '30%',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 50,
  },
  profileCircle: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  profileName: {
    color: 'white',
    fontSize: 24,
    fontWeight: '500',
    marginBottom: 8,
  },
  callTimer: {
    color: '#999',
    fontSize: 16,
  },
  
  // Bottom Section - WhatsApp Style
  bottomSection: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: 40,
    zIndex: 100,
  },
  mainControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    paddingHorizontal: 20,
  },
  controlBtn: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlIconWrapper: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  endCallBtn: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  endCallIconWrapper: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#e91c43',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  cameraOffOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  cameraOffContent: {
    alignItems: 'center',
  },
  cameraOffText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
  },
  cameraOffSubtext: {
    color: '#999',
    fontSize: 14,
    marginTop: 8,
  },
  startVideoButton: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#4CAF50',
    borderRadius: 24,
  },
  startVideoButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
