import { ScreenSceneWrapper } from "@/components/common/ScreenTiltAnimation";
import { Stack } from "expo-router";
import { View } from "react-native";

export default function ExercisesLayout() {
  return (
    <ScreenSceneWrapper>
      <View style={{ flex: 1 }}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen 
            name="index" 
            options={{
              animation: 'fade',
            }} 
          />
          <Stack.Screen 
            name="workout" 
            options={{
              animation: 'slide_from_right',
              presentation: 'card',
            }} 
          />
          <Stack.Screen 
            name="[bodypart]" 
            options={{
              animation: 'slide_from_right',
              presentation: 'modal',
            }} 
          />
          <Stack.Screen 
            name="exercise-details" 
            options={{
              animation: 'slide_from_bottom',
              presentation: 'modal',
            }} 
          />
          <Stack.Screen 
            name="favorites" 
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
