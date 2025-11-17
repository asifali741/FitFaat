<<<<<<< HEAD
import { useTheme } from "@/contexts/ThemeContext";
import AppHeader from "@/components/AppHeader";
=======
import { colorsSheet as colors } from "@/app/(main)/(settings)/ui_elements";
import { ChatBotStyles } from "@/components/ChatBotStyles";
>>>>>>> parent of 1220d0d... Merge pull request #5 from asifali741/merge/asif-into-main
import Message from "@/components/Message";
import Controls from "@/Control/controls";
<<<<<<< HEAD
import { useRouter } from "expo-router";
import React, { useEffect } from "react";
import { FlatList, Image, KeyboardAvoidingView, Platform, StyleSheet, Text, View } from "react-native";
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from "react-native-responsive-screen";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
=======
import React, { useState } from "react";
import { FlatList, Image, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from "react-native-responsive-screen";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { DrawerActions } from "@react-navigation/native";
>>>>>>> parent of 1220d0d... Merge pull request #5 from asifali741/merge/asif-into-main
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
<<<<<<< HEAD
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { 
    messages: storedMessages, 
    addMessage, 
    createNewSession, 
    currentSession,
    isLoading 
  } = useChatbotStorage();
=======
  const [messages, setMessages] = useState<ChatMessage[]>([WelcomeText]);
>>>>>>> parent of 1220d0d... Merge pull request #5 from asifali741/merge/asif-into-main
  const router = useRouter();
  const navigation = useNavigation();

  const openDrawer = () => {
    navigation.dispatch(DrawerActions.openDrawer());
  };

  const styles = getStyles(colors, insets);

  return (
<<<<<<< HEAD
    <SafeAreaView style={styles.container} edges={['top']}>
      <AppHeader 
        title="HeaLora Chat"
        showStepIndicator={false}
      />
=======
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.menuButton}
          onPress={openDrawer}
        >
          <Ionicons name="menu" size={24} color={colors.textOnPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>HeaLora Chat</Text>
        <View style={styles.spacer} />
      </View>
>>>>>>> parent of 1220d0d... Merge pull request #5 from asifali741/merge/asif-into-main

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
            data={messages}
            keyExtractor={(_, index) => index.toString()}
            renderItem={({ item }) => <Message msg={item} />}
            contentContainerStyle={styles.messageList}
            showsVerticalScrollIndicator={false}
            keyboardDismissMode="on-drag"
            keyboardShouldPersistTaps="handled"
          />
        </View>
        
<<<<<<< HEAD
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? hp(10) : 0}
        >
          <View style={styles.inputContainer}>
            <Controls onAddMessage={handleAddMessage} />
          </View>
        </KeyboardAvoidingView>
=======
        <Controls setMessages={setMessages} />
>>>>>>> parent of 1220d0d... Merge pull request #5 from asifali741/merge/asif-into-main
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
