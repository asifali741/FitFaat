import { tokenStorage } from '@/utils/auth/tokenStorage';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import Constants from 'expo-constants';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { io } from 'socket.io-client';

let TwilioVideo: any = null;
let TwilioVideoLocalView: any = null;
let TwilioVideoParticipantView: any = null;
let isTwilioAvailable = false;

try {
  const TwilioModule = require('react-native-twilio-video-webrtc');
  TwilioVideo = TwilioModule.TwilioVideo;
  TwilioVideoLocalView = TwilioModule.TwilioVideoLocalView;
  TwilioVideoParticipantView = TwilioModule.TwilioVideoParticipantView;
  isTwilioAvailable = true;
} catch (error) {
  console.warn('Twilio Video SDK not available - use a dev build/EAS build to enable video calls.');
}

const getParam = (value: string | string[] | undefined) => {
  if (Array.isArray(value)) return value[0];
  return value;
};

export default function VideoCallScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const params = useLocalSearchParams();

  const callIdParam = getParam(params.callId as string | string[] | undefined);
  const appointmentIdParam = getParam(params.appointmentId as string | string[] | undefined);
  const remoteNameParam = getParam(params.userName as string | string[] | undefined);

  const roomName = useMemo(
    () => callIdParam || appointmentIdParam || `call_${Date.now()}`,
    [callIdParam, appointmentIdParam]
  );

  const appointmentId = appointmentIdParam || callIdParam || '';
  const remoteDisplayName = remoteNameParam || 'Participant';

  const socketRef = useRef<any>(null);
  const isSocketInRoom = useRef<boolean>(false);
  const twilioVideoRef = useRef<any>(null);
  const isEndingRef = useRef<boolean>(false);

  const [isConnecting, setIsConnecting] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [callError, setCallError] = useState<string | null>(null);
  const [remoteVideoTracks, setRemoteVideoTracks] = useState<
    Record<string, { participantSid: string; videoTrackSid: string }>
  >({});

  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [callDuration, setCallDuration] = useState(0);
  const [facing, setFacing] = useState<'front' | 'back'>('front');

  useEffect(() => {
    if (!isConnected) return;
    const timer = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [isConnected]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

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
    } catch (e) {
      // Ignore and fall back to router
    }
    router.back();
  };

  const emitCallEnd = (reason: string) => {
    if (socketRef.current && appointmentId && isSocketInRoom.current) {
      if (socketRef.current.connected) {
        socketRef.current.emit('call:end', {
          chatSessionId: appointmentId,
          reason,
        });
      }
    }
  };

  const handleRemoteCallEnded = (reason?: string) => {
    if (isEndingRef.current) return;
    isEndingRef.current = true;

    twilioVideoRef.current?.disconnect();
    setIsConnected(false);
    setIsConnecting(false);
    setRemoteVideoTracks({});

    if (reason) {
      Alert.alert('Call Ended', reason);
    }

    setTimeout(() => {
      navigateBack();
    }, 100);
  };

  const handleCallEnd = () => {
    if (isEndingRef.current) return;
    isEndingRef.current = true;

    twilioVideoRef.current?.disconnect();
    emitCallEnd('Call ended by user');
    setIsConnected(false);

    setTimeout(() => {
      navigateBack();
    }, 300);
  };

  useEffect(() => {
    let socket: any = null;

    const reconnectSocket = async () => {
      try {
        const token = await tokenStorage.getToken();
        if (!token || !appointmentId) return;

        const ENV = Constants.expoConfig?.extra;
        const API_URL = (
          ENV?.EXPO_PUBLIC_BACKEND_API_URL ||
          (Platform.OS === 'android' ? 'http://10.0.2.2:5001' : 'http://localhost:5001')
        ).replace(/\/api\/?$/, '');

        socket = io(API_URL, {
          auth: { token },
          transports: ['websocket'],
          reconnection: true,
        });

        socketRef.current = socket;

        socket.on('connect', () => {
          if (appointmentId) {
            socket.emit('join-appointment', { appointmentId });
          }
        });

        socket.on('disconnect', () => {
          console.log('⚠️ [VIDEO SCREEN] Socket disconnected');
        });

        socket.on('joined', () => {
          isSocketInRoom.current = true;
        });

        socket.on('call:ended', (data: { endedBy: string; reason?: string }) => {
          console.log('📴 [VIDEO SCREEN] Call ended by other user:', data);
          handleRemoteCallEnded(data.reason);
        });
      } catch (error) {
        console.error('❌ [VIDEO SCREEN] Failed to reconnect socket:', error);
      }
    };

    reconnectSocket();

    return () => {
      if (socket) {
        socket.off('connect');
        socket.off('disconnect');
        socket.off('joined');
        socket.off('call:ended');
        if (appointmentId) {
          socket.emit('leave-appointment', { appointmentId });
        }
        setTimeout(() => {
          socket.disconnect();
        }, 300);
      }
    };
  }, [appointmentId]);

  useEffect(() => {
    if (!isTwilioAvailable) return;

    let isActive = true;

    const connectToRoom = async () => {
      try {
        setIsConnecting(true);
        setCallError(null);

        const authToken = await tokenStorage.getToken();
        if (!authToken) {
          throw new Error('Missing authentication token');
        }

        const user = await tokenStorage.getUser();
        const identity = user?.id || user?._id || `device_${Platform.OS}_${Date.now()}`;
        const displayName = user?.name || user?.username || user?.email || 'User';

        const ENV = Constants.expoConfig?.extra;
        const API_URL = (
          ENV?.EXPO_PUBLIC_BACKEND_API_URL ||
          (Platform.OS === 'android' ? 'http://10.0.2.2:5001' : 'http://localhost:5001')
        ).replace(/\/api\/?$/, '');

        const response = await fetch(`${API_URL}/api/video/token`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${authToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            roomName,
            userId: identity,
            userName: displayName,
          }),
        });

        const data = await response.json();
        if (!response.ok || !data?.token) {
          throw new Error(data?.message || 'Failed to generate video token');
        }

        if (!isActive) return;

        twilioVideoRef.current?.connect({
          accessToken: data.token,
          roomName,
          enableAudio: true,
          enableVideo: true,
        });
      } catch (error: any) {
        if (!isActive) return;
        setCallError(error?.message || 'Unable to start video call');
        setIsConnecting(false);
      }
    };

    connectToRoom();

    return () => {
      isActive = false;
      twilioVideoRef.current?.disconnect();
    };
  }, [roomName]);

  const handleRoomDidConnect = () => {
    setIsConnecting(false);
    setIsConnected(true);
    setCallDuration(0);
  };

  const handleRoomDidDisconnect = (event?: { error?: Error }) => {
    setIsConnecting(false);
    setIsConnected(false);
    setRemoteVideoTracks({});

    if (!isEndingRef.current) {
      emitCallEnd(event?.error?.message || 'Call disconnected');
      isEndingRef.current = true;
      navigateBack();
    }
  };

  const handleRoomDidFailToConnect = (event?: { error?: Error }) => {
    setIsConnecting(false);
    setIsConnected(false);
    setCallError(event?.error?.message || 'Unable to connect to the call');
  };

  const handleParticipantAddedVideoTrack = (event: {
    participantSid: string;
    trackSid: string;
  }) => {
    setRemoteVideoTracks(prev => ({
      ...prev,
      [event.trackSid]: {
        participantSid: event.participantSid,
        videoTrackSid: event.trackSid,
      },
    }));
  };

  const handleParticipantRemovedVideoTrack = (event: {
    participantSid: string;
    trackSid: string;
  }) => {
    setRemoteVideoTracks(prev => {
      const updated = { ...prev };
      delete updated[event.trackSid];
      return updated;
    });
  };

  const toggleMute = async () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    await twilioVideoRef.current?.setLocalAudioEnabled(!nextMuted);
  };

  const toggleVideo = async () => {
    const nextVideoOff = !isVideoOff;
    setIsVideoOff(nextVideoOff);
    await twilioVideoRef.current?.setLocalVideoEnabled(!nextVideoOff);
  };

  const toggleSpeaker = () => {
    setIsSpeakerOn(prev => !prev);
  };

  const flipCamera = () => {
    twilioVideoRef.current?.flipCamera();
    setFacing(current => (current === 'front' ? 'back' : 'front'));
  };

  const remoteTrack = Object.values(remoteVideoTracks)[0];

  if (!isTwilioAvailable) {
    return (
      <SafeAreaView style={styles.fallbackContainer}>
        <View style={styles.fallbackCard}>
          <Ionicons name="information-circle" size={28} color="#FFB800" />
          <Text style={styles.fallbackTitle}>Video Calls Require Dev Build</Text>
          <Text style={styles.fallbackText}>
            Expo Go does not include the Twilio Video native module. Build a dev
            client or APK to use video calls.
          </Text>
          <View style={styles.fallbackCodeBlock}>
            <Text style={styles.fallbackCode}>npx expo run:android</Text>
            <Text style={styles.fallbackCode}>npx expo run:ios</Text>
          </View>
          <TouchableOpacity style={styles.fallbackButton} onPress={handleCallEnd}>
            <Text style={styles.fallbackButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.remoteVideoContainer}>
        {remoteTrack ? (
          <TwilioVideoParticipantView
            trackIdentifier={remoteTrack}
            style={styles.remoteVideo}
          />
        ) : (
          <View style={styles.remotePlaceholder}>
            <Ionicons name="person" size={80} color="#fff" />
            <Text style={styles.remoteUserName}>{remoteDisplayName}</Text>
            <Text style={styles.callStatus}>
              {isConnecting ? 'Connecting...' : isConnected ? 'Connected' : 'Waiting for participant'}
            </Text>
          </View>
        )}

        {isConnecting && (
          <View style={styles.connectingOverlay}>
            <ActivityIndicator size="large" color="#fff" />
            <Text style={styles.connectingText}>Connecting...</Text>
          </View>
        )}

        <View style={styles.durationBadge}>
          <Text style={styles.durationText}>{formatDuration(callDuration)}</Text>
        </View>
      </View>

      <View style={styles.localVideoContainer}>
        <TwilioVideoLocalView enabled={!isVideoOff} style={styles.localVideo} />
        {isVideoOff && (
          <View style={styles.videoOffOverlay}>
            <Ionicons name="videocam-off" size={24} color="#fff" />
          </View>
        )}
      </View>

      <View style={styles.controlsContainer}>
        <TouchableOpacity
          style={[styles.controlButton, isMuted && styles.controlButtonActive]}
          onPress={toggleMute}
        >
          <Ionicons name={isMuted ? 'mic-off' : 'mic'} size={26} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.controlButton, isVideoOff && styles.controlButtonActive]}
          onPress={toggleVideo}
        >
          <Ionicons name={isVideoOff ? 'videocam-off' : 'videocam'} size={26} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.endCallButton} onPress={handleCallEnd}>
          <Ionicons name="call" size={30} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.controlButton, isSpeakerOn && styles.controlButtonActive]}
          onPress={toggleSpeaker}
        >
          <Ionicons name={isSpeakerOn ? 'volume-high' : 'volume-mute'} size={26} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.controlButton} onPress={flipCamera}>
          <Ionicons name="camera-reverse" size={26} color="#fff" />
        </TouchableOpacity>
      </View>

      {callError && (
        <View style={styles.errorBanner}>
          <Ionicons name="alert-circle" size={18} color="#fff" />
          <Text style={styles.errorText}>{callError}</Text>
        </View>
      )}

      <TwilioVideo
        ref={twilioVideoRef}
        onRoomDidConnect={handleRoomDidConnect}
        onRoomDidDisconnect={handleRoomDidDisconnect}
        onRoomDidFailToConnect={handleRoomDidFailToConnect}
        onParticipantAddedVideoTrack={handleParticipantAddedVideoTrack}
        onParticipantRemovedVideoTrack={handleParticipantRemovedVideoTrack}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  remoteVideoContainer: {
    flex: 1,
    backgroundColor: '#111',
    justifyContent: 'center',
    alignItems: 'center',
  },
  remoteVideo: {
    width: '100%',
    height: '100%',
  },
  remotePlaceholder: {
    alignItems: 'center',
  },
  remoteUserName: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 12,
  },
  callStatus: {
    color: '#4CAF50',
    fontSize: 14,
    marginTop: 6,
  },
  connectingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  connectingText: {
    color: '#fff',
    marginTop: 12,
    fontSize: 14,
  },
  durationBadge: {
    position: 'absolute',
    top: 20,
    left: 16,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
  },
  durationText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  localVideoContainer: {
    position: 'absolute',
    top: 60,
    right: 16,
    width: 120,
    height: 160,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#007AFF',
    backgroundColor: '#1f1f1f',
  },
  localVideo: {
    width: '100%',
    height: '100%',
  },
  videoOffOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlsContainer: {
    position: 'absolute',
    bottom: 30,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    gap: 14,
  },
  controlButton: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlButtonActive: {
    backgroundColor: 'rgba(76,175,80,0.7)',
  },
  endCallButton: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#E53935',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorBanner: {
    position: 'absolute',
    bottom: 110,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(229,57,53,0.9)',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  errorText: {
    color: '#fff',
    fontSize: 13,
    flex: 1,
  },
  fallbackContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  fallbackCard: {
    backgroundColor: '#1b1b1b',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    gap: 12,
  },
  fallbackTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  fallbackText: {
    color: '#ccc',
    fontSize: 14,
    textAlign: 'center',
  },
  fallbackCodeBlock: {
    backgroundColor: '#0f0f0f',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    width: '100%',
    gap: 4,
  },
  fallbackCode: {
    color: '#8ab4f8',
    fontSize: 13,
    textAlign: 'center',
  },
  fallbackButton: {
    marginTop: 8,
    backgroundColor: '#2b2b2b',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
  },
  fallbackButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
