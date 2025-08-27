import { Stack } from "expo-router";

export default function ChatbotLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" options={{ title: "Video Conference" }} />
    </Stack>
  );
}
