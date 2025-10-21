import { colorsSheet as colors } from "@/app/(main)/(settings)/ui_elements";
import { ChatBotStyles } from "@/components/ChatBotStyles";
import Message from "@/components/Message";
import Controls from "@/Control/controls";
import React, { useState } from "react";
import { FlatList, Image, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from "react-native-responsive-screen";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { DrawerActions } from "@react-navigation/native";
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
  const [messages, setMessages] = useState<ChatMessage[]>([WelcomeText]);
  const router = useRouter();
  const navigation = useNavigation();

  const openDrawer = () => {
    navigation.dispatch(DrawerActions.openDrawer());
  };

  return (
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
            contentContainerStyle={{ padding: hp(1), paddingBottom: hp(12) }}
            showsVerticalScrollIndicator={false}
            keyboardDismissMode="on-drag"
            keyboardShouldPersistTaps="handled"
          />
        </View>
        
        <Controls setMessages={setMessages} />
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
