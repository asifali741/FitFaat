import { BottomTabBar } from "@/components/BottomTabBar";
import { ScreenSceneWrapper } from "@/components/common/ScreenTiltAnimation";
import { Slot } from "expo-router";
import { View } from "react-native";

export default function DashboardLayout() {
  return (
    <ScreenSceneWrapper>
      <Slot />
    </ScreenSceneWrapper>
  );
}
