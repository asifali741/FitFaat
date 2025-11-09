import { ScreenSceneWrapper } from "@/components/common/ScreenTiltAnimation";
import { Stack } from "expo-router";
import { View } from "react-native";

export default function DashboardLayout() {
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
            name="DayPlan" 
            options={{
              animation: 'slide_from_bottom',
              presentation: 'modal',
            }} 
          />
          <Stack.Screen 
            name="DetailsDay" 
            options={{
              animation: 'slide_from_right',
              presentation: 'modal',
            }} 
          />
          <Stack.Screen 
            name="_Day" 
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
