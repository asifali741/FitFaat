import { useTheme } from "@/contexts/ThemeContext";
import AppHeader from "@/components/AppHeader";
import Message from "@/components/Message";
import { useChatbotStorage } from "@/contexts/ChatbotStorage";
import Controls from "@/Control/controls";
import { useRouter } from "expo-router";
import React, { useEffect } from "react";
import { FlatList, Image, KeyboardAvoidingView, Platform, StyleSheet, Text, View } from "react-native";
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from "react-native-responsive-screen";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
// type ChatMessage = {
//   role: string;
//   content: string;
// };

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  createdAt?: Date;
};

const WelcomeText: ChatMessage = {
  role: "assistant",
  content:
    "Hello, I am HeaLora, your AI-powered health companion. How can I assist you today?",
}
export default function Baat() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { 
    messages: storedMessages, 
    addMessage, 
    createNewSession, 
    currentSession,
    isLoading 
  } = useChatbotStorage();
  const router = useRouter();

  // Initialize session and load messages
  useEffect(() => {
    if (!currentSession && !isLoading) {
      createNewSession();
    }
  }, [currentSession, isLoading, createNewSession]);

  // Convert stored messages to display format
  const displayMessages: ChatMessage[] = storedMessages.length > 0 
    ? storedMessages.map(msg => ({
        role: msg.isUser ? "user" as const : "assistant" as const,
        content: msg.text,
        createdAt: msg.timestamp
      }))
    : [WelcomeText];

  const handleAddMessage = (text: string, isUser: boolean) => {
    addMessage(text, isUser);
  };

  const styles = getStyles(colors, insets);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <AppHeader 
        title="HeaLora Chat"
        showStepIndicator={false}
      />

      {/* Chat Content */}
      <View style={styles.content}>
        <View style={styles.aiProfileSection}>
          <Image
            source={require("../../../assets/images/jarvis.png")}
            style={styles.aiAvatar}
          />
          <Text style={styles.aiName}>HeaLora</Text>
          <Text style={styles.aiStatus}>Your AI Health Companion</Text>
        </View>
        
        <View style={styles.chatSection}>
          <FlatList
            data={displayMessages}
            keyExtractor={(_, index) => index.toString()}
            renderItem={({ item }) => <Message msg={item} />}
            contentContainerStyle={styles.messageList}
            showsVerticalScrollIndicator={false}
            keyboardDismissMode="on-drag"
            keyboardShouldPersistTaps="handled"
          />
        </View>
        
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? hp(10) : 0}
        >
          <View style={styles.inputContainer}>
            <Controls onAddMessage={handleAddMessage} />
          </View>
        </KeyboardAvoidingView>
      </View>
    </SafeAreaView>
  );
}

const getStyles = (colors: any, insets: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  content: {
    flex: 1,
    backgroundColor: colors.screenColor,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
  },
  aiProfileSection: {
    alignItems: "center",
    paddingVertical: hp(1.5),
    backgroundColor: colors.primarySoft,
    marginHorizontal: wp(4),
    marginTop: hp(1.5),
    borderRadius: 15,
  },
  aiAvatar: {
    width: Math.min(hp(6), wp(15)),
    height: Math.min(hp(6), wp(15)),
    borderRadius: Math.min(hp(3), wp(7.5)),
    marginBottom: hp(0.5),
  },
  aiName: {
    fontSize: Math.min(hp(2), wp(5)),
    fontWeight: "bold",
    color: colors.textPrimary,
  },
  aiStatus: {
    fontSize: Math.min(hp(1.4), wp(3.5)),
    color: colors.textSecondary,
    marginTop: hp(0.3),
  },
  chatSection: {
    flex: 1,
    paddingHorizontal: wp(2),
  },
  messageList: {
    padding: hp(1),
    paddingBottom: hp(12), // Extra padding to account for fixed input bar
    flexGrow: 1,
  },
  inputContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.screenColor,
    paddingBottom: insets.bottom > 0 ? insets.bottom : (Platform.OS === 'ios' ? hp(2) : hp(1)),
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
});

// const MESSAGES: ChatMessage[] = [
//   { role: "user", content: "Hello" },
//   { role: "assistant", content: "Hello. How can I help you?" },
// ];
