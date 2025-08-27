import { ScreenSceneWrapper } from "@/components/common/ScreenTiltAnimation";
import { Topbar } from "@/components/common/TopBar";
import { Text, View } from "react-native";

export default function ChatbotScreen() {
  return (
    <ScreenSceneWrapper>    {/**This provides animation of Moving aside when opening drawer */}
    <Topbar/>
    <View className="justify-center items-center">
      <Text>Video Call Placeholder Screen</Text>
    </View>
    </ScreenSceneWrapper>
  );
}
