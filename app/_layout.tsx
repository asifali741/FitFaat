import SafeScreen from "@/components/SafeScreen";
import { ClerkProvider, useAuth } from "@clerk/clerk-expo";
import { tokenCache } from "@clerk/clerk-expo/token-cache";
import { Slot, useRouter } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, StatusBar, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

export default function RootLayout() {
  return (
    <ClerkProvider tokenCache={tokenCache} publishableKey={process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY}> 
      <SafeAreaProvider>
      <StatusBar barStyle="dark-content"/>
        <SafeScreen>
          <AuthGate/>
        </SafeScreen>
      </SafeAreaProvider>
    </ClerkProvider>
  );
}
function AuthGate() {
  const { isLoaded, isSignedIn } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoaded) return;

    if (isSignedIn) {
      //console.log("User signed in, navigating to dashboard");
      router.replace("/(main)/(dashboard)");
    } else {
      //console.log("User not signed in, navigating to auth");
      router.replace("/(auth)");
    }
  }, [isLoaded, isSignedIn]);

  if (!isLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return <Slot />; 
}
