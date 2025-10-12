import React from "react";
import { Text, View } from "react-native";
import {
    heightPercentageToDP as hp,
    widthPercentageToDP as wp,
} from "react-native-responsive-screen";
import Timing from "./Timing";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  createdAt?: Date;
};

export default function Message({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === "user";

  return (
    <View
      style={{
        marginVertical: hp(0.8),
        alignSelf: isUser ? "flex-end" : "flex-start",
        marginLeft: isUser ? wp(15) : 0, // keep right push for user
      }}
    >
      {/* Bubble */}
      <View
        style={{
          backgroundColor: isUser ? "#4CAF50" : "#E5E5EA",
          paddingVertical: hp(1.2),
          paddingHorizontal: wp(4),
          borderRadius: hp(1.8),
          borderBottomRightRadius: isUser ? 0 : hp(1.8),
          borderBottomLeftRadius: isUser ? hp(1.8) : 0,
          shadowColor: "#000",
          shadowOpacity: 0.05,
          shadowRadius: hp(2),
          alignSelf: isUser ? "flex-end" : "flex-start", // 👈 prevents stretching
          maxWidth: wp(75), // 👈 cap width for long messages
        }}
      >
        <Text
          style={{
            fontSize: hp(2),
            color: isUser ? "#fff" : "#000",
            flexShrink: 1, // 👈 allows text to wrap
          }}
        >
          {msg.content}
        </Text>
      </View>

      {/* Timestamp */}
      {msg.createdAt && (
        <Timing timestamp={msg.createdAt} align={isUser ? "right" : "left"} />
      )}
    </View>
  );
}
