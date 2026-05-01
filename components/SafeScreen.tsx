import React, { ReactNode } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/contexts/ThemeContext";

type SafeScreenProps = {
  children: ReactNode;
};

export default function SafeScreen({ children }: SafeScreenProps) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.screenColor,
      }}
    >
      {children}
    </View>
  );
}
