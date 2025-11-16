import { ScreenSceneWrapper } from "@/components/common/ScreenTiltAnimation";
import { Slot } from "expo-router";
import { View, useWindowDimensions } from "react-native";

export default function DashboardLayout() {
  const { width, height } = useWindowDimensions();

  return (
    <ScreenSceneWrapper>
      <View style={{ width, height }}>
        <Slot />
      </View>
    </ScreenSceneWrapper>
  );
}
