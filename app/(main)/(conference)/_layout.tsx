import { ScreenSceneWrapper } from "@/components/common/ScreenTiltAnimation";
import { Stack } from "expo-router";
import { View, useWindowDimensions } from "react-native";
export default function ConferenceLayout() {
  const { width, height } = useWindowDimensions()
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
            name="doctors-list" 
            options={{
              animation: 'slide_from_right',
              presentation: 'card',
            }} 
          />
          <Stack.Screen 
            name="doctor-details" 
            options={{
              animation: 'slide_from_bottom',
              presentation: 'modal',
            }} 
          />
          <Stack.Screen 
            name="schedule-appointment" 
            options={{
              animation: 'slide_from_right',
              presentation: 'modal',
            }} 
          />
          <Stack.Screen 
            name="select-date" 
            options={{
              animation: 'slide_from_bottom',
              presentation: 'modal',
            }} 
          />
          <Stack.Screen 
            name="booking-confirmation" 
            options={{
              animation: 'slide_from_bottom',
              presentation: 'modal',
            }} 
          />
          <Stack.Screen 
            name="appointment-details" 
            options={{
              animation: 'slide_from_right',
              presentation: 'modal',
            }} 
          />
          <Stack.Screen 
            name="appointment-summary" 
            options={{
              animation: 'slide_from_right',
              presentation: 'modal',
            }} 
          />
          <Stack.Screen 
            name="video-call" 
            options={{
              animation: 'slide_from_bottom',
              presentation: 'fullScreenModal',
            }} 
          />
          <Stack.Screen 
            name="custom-video-call" 
            options={{
              animation: 'slide_from_bottom',
              presentation: 'fullScreenModal',
            }} 
          />
          <Stack.Screen 
            name="test-video-call" 
            options={{
              animation: 'slide_from_bottom',
              presentation: 'fullScreenModal',
            }} 
          />
        </Stack>
      </View>
    </ScreenSceneWrapper>
  );
}
