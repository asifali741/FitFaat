import { ScreenSceneWrapper } from "@/components/common/ScreenTiltAnimation";
import { Topbar } from "@/components/common/TopBar";
import { Slot } from "expo-router";
import { View } from "react-native";

export default function DashboardLayout() {
  return (
    <ScreenSceneWrapper>
      <View style={{ flex: 1 }}>
        <Topbar />
        <Slot />
      </View>
    </ScreenSceneWrapper>
  );
}
