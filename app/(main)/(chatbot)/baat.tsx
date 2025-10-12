import { colorsSheet as colors } from "@/app/(main)/(settings)/ui_elements";
import { ChatBotStyles } from "@/components/ChatBotStyles";
import Message from "@/components/Message";
import Controls from "@/Control/controls";
import React, { useState } from "react";
import { FlatList, Image, SafeAreaView, View } from "react-native";
import { heightPercentageToDP as hp } from "react-native-responsive-screen";
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

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.screenColor  } /*"#F8F9FA"*/ }>
      <View style={{ flex: 1 }}>
        <View style={{ alignItems: "center" }}>
          <Image
            source={require("../../../assets/images/jarvis.png")}
            style={ChatBotStyles.baatImage}
          />
        </View>
        <FlatList
          data={messages}
          keyExtractor={(_, index) => index.toString()}
          renderItem={({ item }) => <Message msg={item} />}
          contentContainerStyle={{ padding: hp(2), paddingBottom: hp(15) }}
          showsVerticalScrollIndicator={false}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
        />
        <Controls setMessages={setMessages} />
      </View>
    </SafeAreaView>
  );
}

// const MESSAGES: ChatMessage[] = [
//   { role: "user", content: "Hello" },
//   { role: "assistant", content: "Hello. How can I help you?" },
// ];
