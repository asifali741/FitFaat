import { ScreenSceneWrapper } from "@/components/common/ScreenTiltAnimation";
import { Topbar } from "@/components/common/TopBar";
import { Text, View } from "react-native";
export default function Settings() {
  return (
    <ScreenSceneWrapper>
      <Topbar></Topbar>
    <View className="justify-center items-center">
      <Text>Settings Placeholder Screen</Text>
    </View>
    </ScreenSceneWrapper>
  );
}
