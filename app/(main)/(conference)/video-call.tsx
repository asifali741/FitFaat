import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import Constants from 'expo-constants';
import { useLocalSearchParams, useRouter } from "expo-router";
import * as SecureStore from 'expo-secure-store';
import React, { useEffect, useState } from "react";
import { Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { io } from 'socket.io-client';

// Conditionally import Zego only on platforms that support it
let ZegoUIKitPrebuiltCall: any = null;
let ONE_ON_ONE_VIDEO_CALL_CONFIG: any = null;
let isZegoAvailable = false;

try {
  const ZegoModule = require('@zegocloud/zego-uikit-prebuilt-call-rn');
  ZegoUIKitPrebuiltCall = ZegoModule.default;
  ONE_ON_ONE_VIDEO_CALL_CONFIG = ZegoModule.ONE_ON_ONE_VIDEO_CALL_CONFIG;
  isZegoAvailable = true;
} catch (error) {
  console.warn('Zego SDK not available - using demo mode for Expo Go');
  isZegoAvailable = false;
}

// ZegoCloud credentials
const APP_ID = parseInt('96ec17b2e9a1f1c54b8c6653fa691ab4', 16);
const APP_SIGN = "96ec17b2e9a1f1c54b8c6653fa691ab4f7bf1f47e6b589ef4d1159784da7b5db";

export default function VideoCallScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const navigation = useNavigation();
  
  // Extract and validate parameters
  const callId = Array.isArray(params.callId) ? params.callId[0] : params.callId;
  const userName = Array.isArray(params.userName) ? params.userName[0] : params.userName;
  const appointmentId = Array.isArray(params.appointmentId) ? params.appointmentId[0] : params.appointmentId;

  // Generate unique user ID (stable for component lifecycle)
  const userID = React.useMemo(() => `user_${Date.now()}_${Math.floor(Math.random() * 10000)}`, []);
  const displayName = userName || "Patient";
  const roomId = callId || `call_${Date.now()}`;

  const socketRef = React.useRef<any>(null);
  const isSocketInRoom = React.useRef<boolean>(false);
  
  // Demo mode state for Expo Go
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [callDuration, setCallDuration] = useState(0);
  const [facing, setFacing] = useState<'front' | 'back'>('front');

  // Timer for call duration
  useEffect(() => {
    const timer = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Format call duration
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Reconnect to socket when entering video call screen
  useEffect(() => {
    let socket: any = null;

    const reconnectSocket = async () => {
      try {
        const token = await SecureStore.getItemAsync('authToken');
        if (!token) return;

        const ENV = Constants.expoConfig?.extra;
        const API_URL = (ENV?.EXPO_PUBLIC_BACKEND_API_URL || 'http://localhost:5001').replace(/\/api\/?$/, '');
        
        console.log('📞 [VIDEO SCREEN] Creating new socket connection to:', API_URL);
        socket = io(API_URL, {
          auth: { token },
          transports: ['websocket'],
          reconnection: true,
        });

        socketRef.current = socket;

        socket.on('connect', () => {
          console.log('✅ [VIDEO SCREEN] Socket connected! Socket ID:', socket.id);
          if (appointmentId) {
            console.log('📞 [VIDEO SCREEN] Emitting join-appointment for room:', appointmentId);
            socket.emit('join-appointment', { appointmentId });
          }
        });

        socket.on('disconnect', () => {
          console.log('⚠️ [VIDEO SCREEN] Socket disconnected');
        });

        socket.on('joined', (data: any) => {
          console.log('✅ [VIDEO SCREEN] Rejoined appointment room successfully:', data);
          isSocketInRoom.current = true;
          console.log('✅ [VIDEO SCREEN] isSocketInRoom set to TRUE');
        });

        // Listen for call ended by other user
        socket.on('call:ended', (data: { endedBy: string; reason?: string }) => {
          console.log('📴 [VIDEO SCREEN] *** CALL ENDED EVENT RECEIVED ***', data);
          // Navigate back when other user ends call
          setTimeout(() => {
            try {
              if (navigation && (navigation as any).canGoBack && (navigation as any).canGoBack()) {
                console.log('📴 [VIDEO SCREEN] Navigating back via navigation.goBack()');
                (navigation as any).goBack();
              } else {
                console.log('📴 [VIDEO SCREEN] Navigating back via router.back()');
                router.back();
              }
            } catch (e) {
              console.log('📴 [VIDEO SCREEN] Error navigating, using router.back()');
              router.back();
            }
          }, 100);
        });

      } catch (error) {
        console.error('❌ [VIDEO SCREEN] Failed to reconnect socket:', error);
      }
    };

    reconnectSocket();

    return () => {
      // Cleanup
      console.log('📞 [VIDEO SCREEN] Cleaning up socket connection');
      if (socket) {
        socket.off('connect');
        socket.off('disconnect');
        socket.off('joined');
        socket.off('call:ended');
        if (appointmentId) {
          socket.emit('leave-appointment', { appointmentId });
        }
        // Delay disconnect to ensure any pending events are processed
        setTimeout(() => {
          socket.disconnect();
        }, 500);
      }
    };
  }, [appointmentId, navigation, router]);

  const handleCallEnd = () => {
    console.log('📴 [VIDEO SCREEN] handleCallEnd called');
    console.log('📴 [VIDEO SCREEN] Socket exists:', !!socketRef.current);
    console.log('📴 [VIDEO SCREEN] Socket connected:', socketRef.current?.connected);
    console.log('📴 [VIDEO SCREEN] Socket in room:', isSocketInRoom.current);
    console.log('📴 [VIDEO SCREEN] Appointment ID:', appointmentId);
    
    // Emit call end event before navigating back
    if (socketRef.current && appointmentId && isSocketInRoom.current) {
      if (socketRef.current.connected) {
        console.log('📴 [VIDEO SCREEN] Emitting call:end event to room:', appointmentId);
        socketRef.current.emit('call:end', {
          chatSessionId: appointmentId,
          reason: 'Call ended by user',
        });
        
        // Wait to ensure the event is sent before navigating
        setTimeout(() => {
          console.log('📴 [VIDEO SCREEN] Navigating back after ending call');
          try {
            if (navigation && (navigation as any).canGoBack && (navigation as any).canGoBack()) {
              (navigation as any).goBack();
              return;
            }
          } catch (e) {}
          router.back();
        }, 500);
      } else {
        console.log('⚠️ [VIDEO SCREEN] Socket not connected, reconnecting and retrying...');
        // Try to reconnect and emit
        socketRef.current.connect();
        socketRef.current.once('connect', () => {
          console.log('📴 [VIDEO SCREEN] Reconnected, now emitting call:end');
          socketRef.current?.emit('call:end', {
            chatSessionId: appointmentId,
            reason: 'Call ended by user',
          });
          setTimeout(() => {
            try {
              if (navigation && (navigation as any).canGoBack && (navigation as any).canGoBack()) {
                (navigation as any).goBack();
                return;
              }
            } catch (e) {}
            router.back();
          }, 500);
        });
      }
    } else {
      console.log('⚠️ [VIDEO SCREEN] Cannot end call - socket not in room or missing data');
      console.log('  - Socket exists:', !!socketRef.current);
      console.log('  - Socket connected:', socketRef.current?.connected);
      console.log('  - Socket in room:', isSocketInRoom.current);
      console.log('  - Appointment ID:', appointmentId);
      
      // Navigate back anyway
      try {
        if (navigation && (navigation as any).canGoBack && (navigation as any).canGoBack()) {
          (navigation as any).goBack();
          return;
        }
      } catch (e) {}
      router.back();
    }
  };

  // If Zego SDK is not available (Expo Go), show demo video call UI
  if (!isZegoAvailable) {
    return (
      <SafeAreaView style={styles.demoContainer}>
        <View style={styles.remoteVideoContainer}>
          <View style={styles.demoVideoPlaceholder}>
            <Ionicons name="person" size={80} color="#fff" />
            <Text style={styles.remoteUserName}>{displayName}</Text>
            <Text style={styles.callStatus}>Connected</Text>
          </View>
          
          <View style={styles.durationBadge}>
            <Text style={styles.durationText}>{formatDuration(callDuration)}</Text>
          </View>
        </View>

        <View style={styles.localVideoContainer}>
          <View style={styles.localVideoPlaceholder}>
            <Ionicons name="person-circle" size={60} color="#fff" />
            <Text style={{color: '#fff', fontSize: 10, marginTop: 4}}>Your Video</Text>
            {isVideoOff && (
              <View style={styles.videoOffOverlay}>
                <Ionicons name="videocam-off" size={24} color="#fff" />
              </View>
            )}
          </View>
        </View>

        <View style={styles.demoBanner}>
          <Ionicons name="information-circle" size={20} color="#FFB800" />
          <Text style={styles.demoText}>Demo Mode (Expo Go)</Text>
        </View>

        <View style={styles.controlsContainer}>
          <TouchableOpacity
            style={[styles.controlButton, isMuted && styles.controlButtonActive]}
            onPress={() => setIsMuted(!isMuted)}
          >
            <Ionicons 
              name={isMuted ? "mic-off" : "mic"} 
              size={28} 
              color="#fff" 
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.controlButton, isVideoOff && styles.controlButtonActive]}
            onPress={() => setIsVideoOff(!isVideoOff)}
          >
            <Ionicons 
              name={isVideoOff ? "videocam-off" : "videocam"} 
              size={28} 
              color="#fff" 
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.endCallButton}
            onPress={handleCallEnd}
          >
            <Ionicons name="call" size={32} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.controlButton, isSpeakerOn && styles.controlButtonActive]}
            onPress={() => setIsSpeakerOn(!isSpeakerOn)}
          >
            <Ionicons 
              name={isSpeakerOn ? "volume-high" : "volume-mute"} 
              size={28} 
              color="#fff" 
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.controlButton}
            onPress={() => setFacing(current => current === 'front' ? 'back' : 'front')}
          >
            <Ionicons name="camera-reverse" size={28} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={styles.instructionsContainer}>
          <Text style={styles.instructionsTitle}>✨ Testing in Expo Go</Text>
          <Text style={styles.instructionsText}>
            ⚠️ Expo Go doesn't support real video calls.
            To see both users' video with WebRTC:
          </Text>
          <Text style={styles.instructionsCode}>npx expo run:android</Text>
          <Text style={styles.instructionsCode}>npx expo run:ios</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Real Zego video call (for development builds)
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
          
          bottomMenuBarConfig: {
            buttons: [
              'toggleCameraButton',
              'toggleMicrophoneButton',
              'hangUpButton',
              'switchCameraButton',
            ],
          },
          
          turnOnCameraWhenJoining: true,
          turnOnMicrophoneWhenJoining: true,
          useSpeakerWhenJoining: true,
          
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
  camera: {
    flex: 1,
  },
  demoContainer: {
    flex: 1,
    backgroundColor: "#1a1a1a",
  },
  remoteVideoContainer: {
    flex: 1,
    backgroundColor: "#2a2a2a",
    justifyContent: 'center',
    alignItems: 'center',
  },
  demoVideoPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  remoteUserName: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 20,
  },
  callStatus: {
    color: '#4CAF50',
    fontSize: 16,
    marginTop: 8,
  },
  durationBadge: {
    position: 'absolute',
    top: 50,
    left: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  durationText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  localVideoContainer: {
    position: 'absolute',
    top: 60,
    right: 20,
    width: 120,
    height: 160,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  localVideoPlaceholder: {
    flex: 1,
    backgroundColor: '#3a3a3a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoOffOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  demoBanner: {
    position: 'absolute',
    top: 10,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 184, 0, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  demoText: {
    color: '#FFB800',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  },
  controlsContainer: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  controlButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 10,
  },
  controlButtonActive: {
    backgroundColor: '#FF3B30',
  },
  endCallButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
    transform: [{ rotate: '135deg' }],
    marginHorizontal: 10,
  },
  instructionsContainer: {
    position: 'absolute',
    bottom: 140,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    padding: 16,
    borderRadius: 12,
  },
  instructionsTitle: {
    color: '#FFB800',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  instructionsText: {
    color: '#fff',
    fontSize: 13,
    marginBottom: 8,
  },
  instructionsCode: {
    color: '#007AFF',
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginTop: 4,
  },
});
