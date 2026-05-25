import dayjs from "dayjs";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "@/contexts/ThemeContext";
import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from "react-native-responsive-screen";

type TimingProps = {
  timestamp?: Date;
  align?: "left" | "right";
};

export default function Timing({ timestamp, align = "right" }: TimingProps) {
  const { colors } = useTheme();

  if (!timestamp) return null;
  return (
    <View
      style={[
        styles.container,
        { alignItems: align === "right" ? "flex-end" : "flex-start" },
      ]}
    >
      <Text style={[styles.text, { color: colors.textSecondary }]}>
        {dayjs(timestamp).format("ddd, MMM D • h:mm A")}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: hp(0.5),
  },
  text: {
    fontSize: Math.min(hp(1.5), wp(3.2)),
  },
});
