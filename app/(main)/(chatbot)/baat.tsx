import { colorsSheet as colors } from "@/app/(main)/(settings)/ui_elements";
import AppHeader from "@/components/AppHeader";
import Message from "@/components/Message";
import { useChatbotStorage } from "@/contexts/ChatbotStorage";
import Controls from "@/Control/controls";
import { useRouter } from "expo-router";
import React, { useEffect } from "react";
import { FlatList, Image, SafeAreaView, StyleSheet, Text, View } from "react-native";
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from "react-native-responsive-screen";
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

  return (
    <SafeAreaView style={styles.container}>
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
            contentContainerStyle={{ padding: hp(1), paddingBottom: hp(12) }}
            showsVerticalScrollIndicator={false}
            keyboardDismissMode="on-drag"
            keyboardShouldPersistTaps="handled"
          />
        </View>
        
        <Controls onAddMessage={handleAddMessage} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: wp(5),
    paddingVertical: hp(2),
    backgroundColor: colors.primary,
  },
  menuButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: hp(2.5),
    fontWeight: "bold",
    color: colors.textOnPrimary,
  },
  content: {
    flex: 1,
    backgroundColor: colors.screenColor,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
  },
  aiProfileSection: {
    alignItems: "center",
    paddingVertical: hp(2),
    backgroundColor: colors.primarySoft,
    marginHorizontal: wp(4),
    marginTop: hp(2),
    borderRadius: 20,
  },
  aiAvatar: {
    width: hp(8),
    height: hp(8),
    borderRadius: hp(4),
    marginBottom: hp(1),
  },
  aiName: {
    fontSize: hp(2.2),
    fontWeight: "bold",
    color: colors.textPrimary,
  },
  aiStatus: {
    fontSize: hp(1.6),
    color: colors.textSecondary,
    marginTop: hp(0.5),
  },
  chatSection: {
    flex: 1,
    paddingHorizontal: wp(2),
  },
  spacer: {
    width: wp(18),
  },
});

// const MESSAGES: ChatMessage[] = [
//   { role: "user", content: "Hello" },
//   { role: "assistant", content: "Hello. How can I help you?" },
// ];
