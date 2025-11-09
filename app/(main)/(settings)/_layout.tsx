import { ScreenSceneWrapper } from "@/components/common/ScreenTiltAnimation";
import { Stack } from "expo-router";
import { View, useWindowDimensions } from "react-native";

export default function SettingsLayout() {
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
            name="profile-information" 
            options={{
              animation: 'slide_from_right',
              presentation: 'modal',
            }} 
          />
          <Stack.Screen 
            name="edit-profile-picture" 
            options={{
              animation: 'slide_from_bottom',
              presentation: 'modal',
            }} 
          />
          <Stack.Screen 
            name="change-password" 
            options={{
              animation: 'slide_from_right',
              presentation: 'modal',
            }} 
          />
          <Stack.Screen 
            name="privacy-security" 
            options={{
              animation: 'slide_from_right',
              presentation: 'modal',
            }} 
          />
          <Stack.Screen 
            name="payment-methods" 
            options={{
              animation: 'slide_from_bottom',
              presentation: 'modal',
            }} 
          />
          <Stack.Screen 
            name="_ui_elements" 
            options={{
              animation: 'slide_from_left',
              presentation: 'card',
            }} 
          />
        </Stack>
      </View>
    </ScreenSceneWrapper>
  );
}
