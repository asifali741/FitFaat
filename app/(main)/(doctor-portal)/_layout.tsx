import { Stack } from "expo-router";

export default function DoctorPortalLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" options={{ title: "Doctor Portal" }} />
      <Stack.Screen name="register" options={{ title: "Doctor Registration" }} />
    </Stack>
  );
}
