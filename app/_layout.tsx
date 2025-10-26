import SafeScreen from "@/components/SafeScreen";
import { ClerkProvider, useAuth, useUser } from "@clerk/clerk-expo";
import { tokenCache } from "@clerk/clerk-expo/token-cache";
import { Slot, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, StatusBar, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!;

console.log('Clerk Key Status:', publishableKey ? 'Found' : 'Missing');
console.log('Key Length:', publishableKey?.length || 0);

if (!publishableKey) {
  throw new Error(
    'Missing Publishable Key. Please set EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY in your .env'
  );
}

export default function RootLayout() {
  return (
    <ClerkProvider tokenCache={tokenCache} publishableKey={publishableKey}> 
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
  const router = useRouter();
  const { isLoaded, isSignedIn } = useAuth();
  const { user, isLoaded: userLoaded } = useUser();
  const [isNavigating, setIsNavigating] = useState(false);

  useEffect(() => {
    if (!isLoaded || !userLoaded || isNavigating) return;

    const handleAuthFlow = async () => {
      setIsNavigating(true);
      
      if (isSignedIn && user) {
        console.log("User signed in, checking if new or existing user");
        console.log("User ID:", user.id);
        console.log("User unsafe metadata:", user.unsafeMetadata);
        
        // Check if user has completed onboarding
        const hasCompletedOnboarding = user.unsafeMetadata?.hasCompletedOnboarding;
        console.log("Has completed onboarding:", hasCompletedOnboarding);
        
        if (hasCompletedOnboarding) {
          console.log("Existing user, navigating to dashboard");
          router.replace("/(main)/(dashboard)");
        } else {
          console.log("New user, navigating to instructions");
          router.replace("/DietSection");
        }
      } else {
        console.log("User not signed in, navigating to auth");
        router.replace("/(auth)");
      }
      
      setIsNavigating(false);
    };

    handleAuthFlow();
  }, [isLoaded, userLoaded, isSignedIn, user, isNavigating]);

  if (!isLoaded || !userLoaded || isNavigating) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return <Slot />;
}
