import { Stack } from "expo-router";
export default function DietSectionLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="DietPlanScreen" options={{ headerShown: false }} />
    </Stack>
  );
}
