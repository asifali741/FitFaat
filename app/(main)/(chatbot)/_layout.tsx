import { BottomTabBar } from "@/components/BottomTabBar";
import { ScreenSceneWrapper } from "@/components/common/ScreenTiltAnimation";
import { Slot } from "expo-router";
import { View, useWindowDimensions } from "react-native";

export default function ChatbotLayout() {
  const { width, height } = useWindowDimensions();

  return (
    <ScreenSceneWrapper>
      <View style={{ width, height }}>
        <Slot />
        <BottomTabBar />
      </View>
    </ScreenSceneWrapper>
  );
}
