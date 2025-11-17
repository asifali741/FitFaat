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
import { callGemini } from '../utils/api';

type Message = {
  role: "user" | "assistant";
  content: string;
  createdAt?: Date;
};

type ControlsProps = {
  onAddMessage?: (text: string, isUser: boolean) => void;
};

export default function Controls({ onAddMessage }: ControlsProps) {
  const [content, setContent] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSend = async () => {
    if (content.trim()) {
      try {
        setIsLoading(true);
        
        // Add user message to storage
        if (onAddMessage) {
          onAddMessage(content, true);
        }
        
        setContent(""); // Clear input immediately for better UX

        // Get AI response
        const response = await callGemini(content);
        
        // Add AI response to storage
        if (onAddMessage) {
          onAddMessage(response, false);
        }
      } catch (error) {
        Alert.alert(
          "Error",
          error instanceof Error ? error.message : "Failed to get response"
        );
      } finally {
        setIsLoading(false);
      }
    } else {
      Alert.alert("Empty message", "Please type something before sending.");
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