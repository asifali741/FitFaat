import dayjs from "dayjs";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

type TimingProps = {
  timestamp?: Date;
  align?: "left" | "right";
};

export default function Timing({ timestamp, align = "right" }: TimingProps) {
  if (!timestamp) return null;
  return (
    <View
      style={[
        styles.container,
        { alignItems: align === "right" ? "flex-end" : "flex-start" },
      ]}
    >
      <Text style={styles.text}>
        {dayjs(timestamp).format("ddd, MMM D • h:mm A")}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 4,
  },
  text: {
    fontSize: 12,
    color: "#666",
  },
});