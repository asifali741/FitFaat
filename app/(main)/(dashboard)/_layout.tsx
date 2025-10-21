import { ScreenSceneWrapper } from "@/components/common/ScreenTiltAnimation";
import { Slot } from "expo-router";
import { View } from "react-native";

export default function DashboardLayout() {
  return (
    <ScreenSceneWrapper>
      <View style={{ flex: 1 }}>
        <Slot />
      </View>
    </ScreenSceneWrapper>
  );
}
