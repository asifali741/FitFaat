import { LogBox } from "react-native";

// Suppress expo-notifications Expo Go warning (SDK 53 removed push notification support from Expo Go)
// This only affects development in Expo Go; production builds are unaffected
LogBox.ignoreLogs([
  'expo-notifications: Android Push notifications',
  'expo-notifications` functionality is not fully supported in Expo Go',
]);

import SafeScreen from "@/components/SafeScreen";
import { ThemeProvider, useTheme } from "@/contexts/ThemeContext";
import { ClerkProvider, useAuth, useUser } from "@clerk/clerk-expo";
import { tokenCache } from "@clerk/clerk-expo/token-cache";
import { StripeProvider } from "@stripe/stripe-react-native";
import { Slot, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, StatusBar, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { getClerkPublishableKey, getStripePublishableKey } from '@/utils/config';

// Get keys via centralized config (works in Expo Go, dev builds, AND standalone APKs)
const publishableKey = getClerkPublishableKey();

export default function RootLayout() {
  const stripePublishableKey = getStripePublishableKey();
  
  return (
    <StripeProvider publishableKey={stripePublishableKey}>
      <ClerkProvider tokenCache={tokenCache} publishableKey={publishableKey}> 
        <ThemeProvider>
          <SafeAreaProvider>
            <ThemedApp />
          </SafeAreaProvider>
        </ThemeProvider>
      </ClerkProvider>
    </StripeProvider>
  );
}

function ThemedApp() {
  const { isDarkMode } = useTheme();
  
  return (
    <>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"}/>
      <SafeScreen>
        <AuthGate/>
      </SafeScreen>
    </>
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
      
      try {
        if (isSignedIn && user) {
          const hasCompletedOnboarding = user.unsafeMetadata?.hasCompletedOnboarding;
          
          if (hasCompletedOnboarding) {
            router.replace("/(main)/(dashboard)");
          } else {
            router.replace("/DietSection");
          }
        } else {
          router.replace("/(auth)");
        }
      } catch (err) {
        console.error("Navigation error in AuthGate:", err);
      } finally {
        setIsNavigating(false);
      }
    };

    handleAuthFlow();
  }, [isLoaded, userLoaded, isSignedIn, user, isNavigating]);

  if (!isLoaded || !userLoaded || isNavigating) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: 'white' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return <Slot />;
}