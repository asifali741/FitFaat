import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { heightPercentageToDP as hp } from "react-native-responsive-screen";
import { sendChatbotMessage } from '../utils/api';

type Message = {
  role: "user" | "assistant";
  content: string;
  createdAt?: Date;
};

type ControlsProps = {
  onAddMessage?: (text: string, isUser: boolean, source?: string) => void;
  sessionId?: string;
};

export default function Controls({ onAddMessage, sessionId }: ControlsProps) {
  const [content, setContent] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  console.log(`[Controls] Rendered with onAddMessage ref:`, onAddMessage?.name || 'anonymous');

  const handleSend = async () => {
    if (!content.trim()) {
      Alert.alert("Empty message", "Please type something before sending.");
      return;
    }
    
    const userMessage = content.trim();
    console.log(`[Controls] handleSend - User message: "${userMessage}"`);
    setContent(""); // Clear immediately
    
    try {
      setIsLoading(true);
      
      // Add user message directly
      if (onAddMessage) {
        try {
          console.log(`[Controls] Calling onAddMessage for USER message: "${userMessage}"`);
          console.log(`[Controls] onAddMessage ref:`, onAddMessage.name || 'anonymous');
          console.log(`[Controls] onAddMessage is function:`, typeof onAddMessage === 'function');
          onAddMessage(userMessage, true, 'user');
          console.log(`[Controls] onAddMessage returned for USER - no error`);
        } catch (err) {
          console.error(`[Controls] ERROR caught in onAddMessage for USER:`, err);
        }
      } else {
        console.log(`[Controls] onAddMessage is null/undefined!`);
      }

      // Get AI response
      const response = await sendChatbotMessage(userMessage, sessionId);
      
      // Add AI response
      if (onAddMessage && response.aiResponse) {
        console.log(`[Controls] Calling onAddMessage for BOT message`);
        onAddMessage(response.aiResponse.content, false, response.aiResponse.source);
        console.log(`[Controls] onAddMessage returned for BOT`);
      }
    } catch (error) {
      console.error('Chat error:', error);
      Alert.alert("Error", "Failed to get response. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.wrapper}>
      <View style={styles.container}>
        <TextInput
          style={styles.input}
          placeholder="Type a message..."
          placeholderTextColor="#999"
          onChangeText={setContent}
          value={content}
          returnKeyType="send"
          blurOnSubmit={false}
          onSubmitEditing={handleSend}
          multiline={false}
        />
        <TouchableOpacity 
          onPress={handleSend} 
          style={[styles.sendButton, isLoading && { opacity: 0.7 }]}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Ionicons name="send" size={20} color="#fff" />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: hp(2),
    paddingVertical: hp(1.5),
    backgroundColor: 'transparent',
  },
  container: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: hp(6),
    paddingHorizontal: hp(2),
    paddingVertical: hp(1),
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 4,
  },
  input: {
    flex: 1,
    height: hp(5),
    fontSize: hp(2.2),
    paddingHorizontal: hp(1.5),
  },
  sendButton: {
    height: hp(4.7),
    width: hp(4.7),
    borderRadius: hp(2.35),
    backgroundColor: "#4CAF50",
    justifyContent: "center",
    alignItems: "center",
  },
});