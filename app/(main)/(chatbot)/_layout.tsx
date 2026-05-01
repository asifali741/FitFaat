import { BottomTabBar } from "@/components/BottomTabBar";
import { ScreenSceneWrapper } from "@/components/common/ScreenTiltAnimation";
import { Slot } from "expo-router";
import { View, useWindowDimensions } from "react-native";

export default function ChatbotLayout() {
  return (
    <ScreenSceneWrapper>
      <Slot />
    </ScreenSceneWrapper>
  );
}
