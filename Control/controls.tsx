import { tokenStorage } from '@/utils/auth/tokenStorage';
import { Ionicons } from "@expo/vector-icons";
import Constants from 'expo-constants';
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Modal,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from "react-native";
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from "react-native-responsive-screen";
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
  const [chatLimit, setChatLimit] = useState<any>(null);
  const [checkingLimit, setCheckingLimit] = useState(false);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const router = useRouter();

  const API_URL = (() => {
    const baseUrl = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_API_URL ||
      (Platform.OS === "android" ? "http://10.0.2.2:5001" : "http://localhost:5001");
    return baseUrl.replace(/\/api\/?$/, '');
  })();

  // Check chat limit on component mount and periodically
  useEffect(() => {
    checkChatLimit();
    const interval = setInterval(checkChatLimit, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const checkChatLimit = async () => {
    try {
      setCheckingLimit(true);
      const token = await tokenStorage.getToken();
      if (!token) return;

      const response = await fetch(`${API_URL}/api/chatbot/check-limit`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      setChatLimit(data);
    } catch (error) {
      console.error('Error checking chat limit:', error);
    } finally {
      setCheckingLimit(false);
    }
  };

  const handleSend = async () => {
    if (!content.trim()) {
      Alert.alert("Empty message", "Please type something before sending.");
      return;
    }

    // Check if user can send message
    if (chatLimit && !chatLimit.isPremium && !chatLimit.canChat) {
      setShowLimitModal(true);
      return;
    }
    
    const userMessage = content.trim();
    setContent(""); // Clear immediately
    
    try {
      setIsLoading(true);
      
      // Add user message directly
      if (onAddMessage) {
        try {
          onAddMessage(userMessage, true, 'user');
        } catch (err) {
          console.error('Error adding user message:', err);
        }
      }

      // Get AI response
      const response = await sendChatbotMessage(userMessage, sessionId);
      
      // Add AI response
      if (onAddMessage && response.aiResponse) {
        onAddMessage(response.aiResponse.content, false, response.aiResponse.source);
      }

      // Refresh chat limit after sending message
      await checkChatLimit();
    } catch (error: any) {
      console.error('Chat error:', error);
      
      // Check if it's a limit error
      if (error.message && error.message.includes('limit')) {
        setShowLimitModal(true);
      } else {
        Alert.alert("Error", "Failed to get response. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.wrapper}>
      {/* Show remaining chats for non-premium users */}
      {chatLimit && !chatLimit.isPremium && (
        <View style={styles.limitInfo}>
          <Text style={styles.limitText}>
            📨 {chatLimit.remainingChats} free message{chatLimit.remainingChats !== 1 ? 's' : ''} left today
          </Text>
        </View>
      )}
      
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
          editable={!isLoading && (chatLimit?.canChat !== false)}
        />
        <TouchableOpacity 
          onPress={handleSend} 
          style={[
            styles.sendButton, 
            (isLoading || chatLimit?.canChat === false) && { opacity: 0.5 }
          ]}
          disabled={isLoading || chatLimit?.canChat === false}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Ionicons name="send" size={20} color="#fff" />
          )}
        </TouchableOpacity>
      </View>

      {/* Limit Reached Modal */}
      <Modal
        visible={showLimitModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowLimitModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Close button */}
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowLimitModal(false)}
            >
              <Ionicons name="close-circle" size={30} color="#999" />
            </TouchableOpacity>

            {/* Icon */}
            <View style={styles.iconContainer}>
              <Ionicons name="alert-circle" size={60} color="#FF6B6B" />
            </View>

            {/* Title */}
            <Text style={styles.modalTitle}>Free Usage Limit Reached</Text>

            {/* Subtitle */}
            <Text style={styles.modalSubtitle}>
              You've sent 5 free messages today
            </Text>

            {/* Description */}
            <Text style={styles.modalDescription}>
              Your daily free chat limit has ended. Upgrade to Premium to enjoy unlimited conversations with HeaLora anytime!
            </Text>

            {/* Features List */}
            <View style={styles.featuresList}>
              <View style={styles.featureItem}>
                <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                <Text style={styles.featureText}>Unlimited daily messages</Text>
              </View>
              <View style={styles.featureItem}>
                <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                <Text style={styles.featureText}>Priority health guidance</Text>
              </View>
              <View style={styles.featureItem}>
                <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                <Text style={styles.featureText}>Full access to AI features</Text>
              </View>
            </View>

            {/* Price Tag */}
            <View style={styles.priceTag}>
              <Text style={styles.priceAmount}>$10</Text>
              <Text style={styles.priceFrequency}>/month</Text>
            </View>

            {/* Action Buttons */}
            <TouchableOpacity
              style={styles.upgradButton}
              onPress={() => {
                setShowLimitModal(false);
                router.push("/(main)/(settings)/premium");
              }}
            >
              <Ionicons name="star" size={20} color="#fff" />
              <Text style={styles.upgradButtonText}>Upgrade to Premium</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.laterButton}
              onPress={() => setShowLimitModal(false)}
            >
              <Text style={styles.laterButtonText}>Maybe Later</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: hp(2),
    paddingVertical: hp(1.5),
    paddingBottom: Platform.OS === 'ios' ? hp(2) : hp(1.5),
    backgroundColor: 'transparent',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: wp(5),
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: hp(3),
    paddingHorizontal: wp(6),
    paddingVertical: hp(3),
    width: '100%',
    maxWidth: wp(90),
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  closeButton: {
    position: 'absolute',
    top: hp(1.5),
    right: wp(3),
    zIndex: 10,
  },
  iconContainer: {
    marginTop: hp(1),
    marginBottom: hp(2),
  },
  modalTitle: {
    fontSize: hp(2.8),
    fontWeight: '800',
    color: '#1a1a1a',
    marginBottom: hp(0.8),
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: hp(2),
    fontWeight: '600',
    color: '#FF6B6B',
    marginBottom: hp(1.5),
    textAlign: 'center',
  },
  modalDescription: {
    fontSize: hp(1.8),
    color: '#666',
    textAlign: 'center',
    marginBottom: hp(2.5),
    lineHeight: hp(2.8),
  },
  featuresList: {
    width: '100%',
    marginBottom: hp(2.5),
    paddingHorizontal: wp(2),
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: hp(1.2),
  },
  featureText: {
    fontSize: hp(1.7),
    color: '#333',
    marginLeft: wp(2.5),
    fontWeight: '500',
  },
  priceTag: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'baseline',
    marginBottom: hp(2.5),
    paddingVertical: hp(1.5),
    paddingHorizontal: wp(5),
    backgroundColor: '#F0F7FF',
    borderRadius: hp(1.5),
    borderWidth: 1.5,
    borderColor: '#4CAF50',
  },
  priceAmount: {
    fontSize: hp(3.5),
    fontWeight: '800',
    color: '#4CAF50',
  },
  priceFrequency: {
    fontSize: hp(1.9),
    color: '#666',
    marginLeft: wp(1),
    fontWeight: '600',
  },
  upgradButton: {
    width: '100%',
    flexDirection: 'row',
    backgroundColor: '#4CAF50',
    paddingVertical: hp(2),
    borderRadius: hp(1.2),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: hp(1),
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  upgradButtonText: {
    fontSize: hp(2),
    fontWeight: '700',
    color: '#fff',
    marginLeft: wp(2),
    letterSpacing: 0.5,
  },
  laterButton: {
    width: '100%',
    paddingVertical: hp(1.5),
    borderRadius: hp(1),
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ddd',
    backgroundColor: '#fafafa',
  },
  laterButtonText: {
    fontSize: hp(1.9),
    fontWeight: '600',
    color: '#666',
  },
  limitInfo: {
    paddingHorizontal: hp(2),
    paddingVertical: hp(1),
    marginBottom: hp(1),
    backgroundColor: '#FFF3E0',
    borderRadius: hp(1),
    borderLeftWidth: 3,
    borderLeftColor: '#FF9800',
  },
  limitText: {
    fontSize: hp(1.7),
    color: '#E65100',
    fontWeight: '600',
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