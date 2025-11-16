import { Stack } from "expo-router";
export default function DietSectionLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }} initialRouteName="index" >
            <Stack.Screen name="index" options={{ title: "Settings" }} />
    </Stack>
  );
}
