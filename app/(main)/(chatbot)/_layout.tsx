import { ScreenSceneWrapper } from "@/components/common/ScreenTiltAnimation";
import { Stack } from "expo-router";
import { View, useWindowDimensions } from "react-native";

export default function ChatbotLayout() {
  const { width, height } = useWindowDimensions();

  return (
    <ScreenSceneWrapper>
      <View style={{ width, height }}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen 
            name="index" 
            options={{
              animation: 'slide_from_right',
              presentation: 'card',
            }} 
          />
          <Stack.Screen 
            name="baat" 
            options={{
              animation: 'slide_from_right',
              presentation: 'modal',
            }} 
          />
          <Stack.Screen 
            name="bookmarks" 
            options={{
              animation: 'slide_from_bottom',
              presentation: 'modal',
            }} 
          />
          <Stack.Screen 
            name="chat-history" 
            options={{
              animation: 'slide_from_left',
              presentation: 'modal',
            }} 
          />
        </Stack>
      </View>
    </ScreenSceneWrapper>
  );
}
