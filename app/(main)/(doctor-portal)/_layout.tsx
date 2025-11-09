import { ScreenSceneWrapper } from "@/components/common/ScreenTiltAnimation";
import { Stack } from "expo-router";
import { View } from "react-native";

export default function DoctorPortalLayout() {
  return (
      <ScreenSceneWrapper>
        <View style={{ flex: 1 }}>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen 
              name="index" 
              options={{
                animation: 'slide_from_right',
                presentation: 'card',
              }} 
            />
            <Stack.Screen 
              name="register" 
              options={{
                animation: 'slide_from_bottom',
                presentation: 'modal',
              }} 
            />
            <Stack.Screen 
              name="application-status" 
              options={{
                animation: 'slide_from_right',
                presentation: 'modal',
              }} 
            />
          </Stack>
        </View>
      </ScreenSceneWrapper>
    );
}
