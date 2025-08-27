import { ScreenSceneWrapper } from "@/components/common/ScreenTiltAnimation";
import { Topbar } from "@/components/common/TopBar";
import { Text, useWindowDimensions, View } from "react-native";
export default function ChatbotScreen() {
  const {width, height} = useWindowDimensions();
  const dynamicStyles = {
    FullScreen: 
    {
      width: width,
      height: height,
    }
  };
  return (
    <ScreenSceneWrapper>
      <Topbar/>
        <View  style={dynamicStyles.FullScreen}>
          <Text>ChatBot Placeholder Screen</Text>
        </View>
    </ScreenSceneWrapper>
  );
}
