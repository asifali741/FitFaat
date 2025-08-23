
import { Stack } from "expo-router";
import { ClerkProvider } from "@clerk/clerk-expo";
import { tokenCache } from "@clerk/clerk-expo/token-cache";
import { SafeAreaProvider } from "react-native-safe-area-context";
import SafeScreen from "@/components/SafeScreen";
import "../global.css";
export default function RootLayout() {
  return (
    <ClerkProvider tokenCache={tokenCache}>
      <SafeAreaProvider>
        <SafeScreen>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="DietSection" options={{ headerShown: false }} />
          </Stack>
        </SafeScreen>
      </SafeAreaProvider>
    </ClerkProvider>
  );
}
