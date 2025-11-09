import React from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from 'react-native-responsive-screen';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface VideoCallControlsProps {
  isMuted: boolean;
  isCameraOff: boolean;
  isSpeakerOn: boolean;
  isFrontCamera: boolean;
  isScreenSharing?: boolean;
  isRecording?: boolean;
  onToggleMute: () => void;
  onToggleCamera: () => void;
  onToggleSpeaker: () => void;
  onSwitchCamera?: () => void;
  onEndCall: () => void;
  onToggleScreenShare?: () => void;
  onToggleRecording?: () => void;
  onOpenChat?: () => void;
  onMoreOptions?: () => void;
}

export default function VideoCallControls({
  isMuted,
  isCameraOff,
  isSpeakerOn,
  isFrontCamera,
  isScreenSharing = false,
  isRecording = false,
  onToggleMute,
  onToggleCamera,
  onToggleSpeaker,
  onSwitchCamera,
  onEndCall,
  onToggleScreenShare,
  onToggleRecording,
  onOpenChat,
  onMoreOptions,
}: VideoCallControlsProps) {
  const handleMoreOptions = () => {
    const options = [
      { 
        text: isCameraOff ? "Start Video" : "Stop Video", 
        onPress: onToggleCamera,
        style: isCameraOff ? "default" : "destructive"
      },
      onToggleScreenShare && { 
        text: isScreenSharing ? "Stop Screen Share" : "Share Screen", 
        onPress: onToggleScreenShare 
      },
      onToggleRecording && { 
        text: isRecording ? "Stop Recording" : "Start Recording", 
        onPress: onToggleRecording,
        style: isRecording ? "destructive" : "default"
      },
      { text: "Settings", onPress: () => Alert.alert("Settings", "Coming soon") },
      { text: "Cancel", style: "cancel" }
    ].filter(Boolean);

    Alert.alert("More Options", undefined, options as any);
  };

  return (
    <View style={styles.container}>
      {/* Top row of secondary controls */}
      <View style={styles.topControls}>
        {/* Switch Camera - Simple visual toggle */}
        {onSwitchCamera && (
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={onSwitchCamera}
          >
            <Ionicons 
              name="camera-reverse" 
              size={24} 
              color="white" 
            />
          </TouchableOpacity>
        )}

        {/* Speaker Toggle */}
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={onToggleSpeaker}
        >
          <Ionicons
            name={isSpeakerOn ? "volume-high" : "volume-mute"}
            size={24}
            color="white"
          />
        </TouchableOpacity>

        {/* Screen Share (if available) */}
        {onToggleScreenShare && (
          <TouchableOpacity
            style={[styles.secondaryButton, isScreenSharing && styles.activeButton]}
            onPress={onToggleScreenShare}
          >
            <Ionicons
              name="desktop-outline"
              size={24}
              color={isScreenSharing ? "#4CAF50" : "white"}
            />
          </TouchableOpacity>
        )}

        {/* Recording indicator/toggle */}
        {onToggleRecording && (
          <TouchableOpacity
            style={[styles.secondaryButton, isRecording && styles.recordingButton]}
            onPress={onToggleRecording}
          >
            <Ionicons
              name={isRecording ? "recording" : "recording-outline"}
              size={24}
              color={isRecording ? "#FF3B30" : "white"}
            />
          </TouchableOpacity>
        )}

      </View>

      {/* Main control buttons */}
      <View style={styles.mainControls}>
        {/* Microphone Toggle */}
        <TouchableOpacity
          style={[styles.controlButton, isMuted && styles.activeButton]}
          onPress={onToggleMute}
        >
          <Ionicons
            name={isMuted ? "mic-off" : "mic"}
            size={28}
            color={isMuted ? "#FF3B30" : "white"}
          />
        </TouchableOpacity>

        {/* Camera Toggle */}
        <TouchableOpacity
          style={[styles.controlButton, isCameraOff && styles.activeButton]}
          onPress={onToggleCamera}
        >
          <Ionicons
            name={isCameraOff ? "videocam-off" : "videocam"}
            size={28}
            color={isCameraOff ? "#FF3B30" : "white"}
          />
        </TouchableOpacity>

        {/* End Call Button */}
        <TouchableOpacity
          style={styles.endCallButton}
          onPress={onEndCall}
        >
          <Ionicons
            name="call"
            size={32}
            color="white"
          />
        </TouchableOpacity>

        {/* Chat Button */}
        {onOpenChat && (
          <TouchableOpacity
            style={styles.controlButton}
            onPress={onOpenChat}
          >
            <Ionicons
              name="chatbubble-ellipses"
              size={26}
              color="white"
            />
          </TouchableOpacity>
        )}

        {/* More Options */}
        <TouchableOpacity
          style={styles.controlButton}
          onPress={onMoreOptions || handleMoreOptions}
        >
          <Ionicons
            name="ellipsis-horizontal"
            size={28}
            color="white"
          />
        </TouchableOpacity>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: hp(5),
    left: 0,
    right: 0,
    paddingBottom: hp(3),
    paddingTop: hp(1.5),
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  topControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: wp(5),
    marginBottom: hp(2),
    gap: wp(4),
  },
  mainControls: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
    paddingHorizontal: wp(5),
  },
  controlButton: {
    width: wp(14),
    height: wp(14),
    borderRadius: wp(7),
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButton: {
    width: wp(11),
    height: wp(11),
    borderRadius: wp(5.5),
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  recordingButton: {
    backgroundColor: 'rgba(255, 59, 48, 0.2)',
  },
  endCallButton: {
    width: wp(17),
    height: wp(17),
    borderRadius: wp(8.5),
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
});