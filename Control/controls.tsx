import { Ionicons } from "@expo/vector-icons";
import React, { useState, useRef } from "react";
import {
  Alert,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
  Animated,
} from "react-native";
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from "react-native-responsive-screen";
import { callGemini } from "../utils/api";
import * as Speech from 'expo-speech';

type Message = {
  role: "user" | "assistant";
  content: string;
  createdAt?: Date;
};

type ControlsProps = {
  onAddMessage?: (text: string, isUser: boolean) => void;
  onTypingChange?: (isTyping: boolean) => void;
  isSpeakerEnabled?: boolean;
  onToggleSpeaker?: () => void;
  onSpeakText?: (text: string) => void;
};

export default function Controls({ 
  onAddMessage, 
  onTypingChange,
  isSpeakerEnabled = true,
  onToggleSpeaker,
  onSpeakText 
}: ControlsProps) {
  const [content, setContent] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const handleSend = async () => {
    if (content.trim()) {
      const messageToSend = content;
      setContent(""); // Clear input immediately for better UX
      
      try {
        // Stop any ongoing speech immediately when new message is sent
        try {
          await Speech.stop();
        } catch (e) {
          // Ignore error if nothing is playing
        }
        
        setIsLoading(true);
        if (onTypingChange) onTypingChange(true);
        
        // Add user message to storage
        if (onAddMessage) {
          onAddMessage(messageToSend, true);
        }

        // Get AI response
        const response = await callGemini(messageToSend);
        
        if (onTypingChange) onTypingChange(false);
        
        // DISABLED: Speech functionality temporarily disabled
        // Start speaking immediately while text is being displayed
        // if (response && isSpeakerEnabled && onSpeakText) {
        //   // Start speech first for immediate audio feedback
        //   setTimeout(() => {
        //     onSpeakText(response);
        //   }, 100); // Small delay to ensure UI is ready
        // }
        
        // Then add AI response to storage (text will appear)
        if (onAddMessage) {
          onAddMessage(response, false);
        }
      } catch (error) {
        if (onTypingChange) onTypingChange(false);
        Alert.alert(
          "Error",
          error instanceof Error ? error.message : "Failed to get response"
        );
      } finally {
        setIsLoading(false);
        if (onTypingChange) onTypingChange(false);
      }
    } else {
      Alert.alert("Empty message", "Please type something before sending.");
    }
  };

  const handleVoiceInput = () => {
    if (!isRecording) {
      setIsRecording(true);
      // Start pulse animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      ).start();
      
      // Simulate voice recording (in production, use expo-av for real recording)
      Alert.alert(
        "Voice Input",
        "Voice recording feature will be implemented with expo-av. For now, try typing your health query!"
      );
      setTimeout(() => {
        setIsRecording(false);
        pulseAnim.setValue(1);
      }, 2000);
    } else {
      setIsRecording(false);
      pulseAnim.setValue(1);
    }
  };

  const toggleSpeaker = () => {
    if (onToggleSpeaker) {
      onToggleSpeaker();
    }
  };

  return (
    <View style={styles.wrapper}>
      <View style={styles.container}>
        <Animated.View 
          style={[
            styles.voiceButton,
            isRecording && {
              transform: [{ scale: pulseAnim }]
            }
          ]}
        >
          <TouchableOpacity
            onPress={handleVoiceInput}
            style={[styles.iconButton, isRecording && styles.recordingButton]}
          >
            <Ionicons 
              name={isRecording ? "mic" : "mic-outline"} 
              size={20} 
              color={isRecording ? "#fff" : "#4CAF50"} 
            />
          </TouchableOpacity>
        </Animated.View>

        <TextInput
          style={styles.input}
          placeholder="Type a health query..."
          placeholderTextColor="#999"
          onChangeText={setContent}
          value={content}
          returnKeyType="send"
          blurOnSubmit={false}
          onSubmitEditing={handleSend}
          multiline={false}
          editable={!isRecording}
        />

        <TouchableOpacity
          onPress={toggleSpeaker}
          style={styles.iconButton}
        >
          <Ionicons 
            name={isSpeakerEnabled ? "volume-high-outline" : "volume-mute-outline"} 
            size={20} 
            color={isSpeakerEnabled ? "#4CAF50" : "#999"} 
          />
        </TouchableOpacity>

        <TouchableOpacity 
          onPress={handleSend} 
          style={[styles.sendButton, (isLoading || isRecording) && { opacity: 0.7 }]}
          disabled={isLoading || isRecording}
        >
          <Ionicons 
            name={isLoading ? "hourglass-outline" : "send"} 
            size={20} 
            color="#fff" 
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: hp(2),
    paddingVertical: hp(1),
    backgroundColor: 'transparent',
  },
  container: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "transparent",
    paddingHorizontal: 0,
  },
  input: {
    flex: 1,
    height: hp(5.5),
    fontSize: hp(2),
    paddingHorizontal: hp(2),
    paddingVertical: hp(1),
    backgroundColor: "#f5f5f5",
    borderRadius: hp(3),
    marginHorizontal: hp(0.5),
    color: "#333",
  },
  sendButton: {
    height: hp(5.5),
    width: hp(5.5),
    borderRadius: hp(2.75),
    backgroundColor: "#4CAF50",
    justifyContent: "center",
    alignItems: "center",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  voiceButton: {
    justifyContent: "center",
    alignItems: "center",
  },
  iconButton: {
    height: hp(5.5),
    width: hp(5.5),
    borderRadius: hp(2.75),
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    marginHorizontal: wp(0.5),
  },
  recordingButton: {
    backgroundColor: "#FF4444",
  },
});
