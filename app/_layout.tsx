import { LogBox } from "react-native";

// Suppress expo-notifications Expo Go warning (SDK 53 removed push notification support from Expo Go)
// This only affects development in Expo Go; production builds are unaffected
LogBox.ignoreLogs([
  'expo-notifications: Android Push notifications',
  'expo-notifications` functionality is not fully supported in Expo Go',
]);

import SafeScreen from "@/components/SafeScreen";
import { ThemeProvider, useTheme } from "@/contexts/ThemeContext";
import { authApi } from "@/utils/auth/authApi";
import { StripeProvider } from "@stripe/stripe-react-native";
import { Slot, useRouter, useSegments } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, StatusBar, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { getStripePublishableKey } from '@/utils/config';

export default function RootLayout() {
  const stripePublishableKey = getStripePublishableKey();
  
  return (
    <StripeProvider publishableKey={stripePublishableKey}>
      <ThemeProvider>
        <SafeAreaProvider>
          <ThemedApp />
        </SafeAreaProvider>
      </ThemeProvider>
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
  const segments = useSegments();
  const segmentKey = segments.join("/");
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    let isActive = true;

    const handleAuthFlow = async () => {
      try {
        const isAuthenticated = await authApi.isAuthenticated();
        const rootSegment = segments[0];
        const isInAuthGroup = rootSegment === "(auth)";
        const isInMainGroup = rootSegment === "(main)";
        const isInOnboarding = rootSegment === "DietSection";

        if (!isAuthenticated) {
          if (!isInAuthGroup) {
            router.replace("/(auth)");
          }
          return;
        }

        try {
          const onboardingStatus = await authApi.getOnboardingStatus();
          const isOnboardingComplete = Boolean(onboardingStatus?.isOnboardingComplete);

          if (!isOnboardingComplete && !isInOnboarding) {
            router.replace("/DietSection");
            return;
          }

          if (isOnboardingComplete && !isInMainGroup) {
            router.replace("/(main)/(dashboard)");
          }
        } catch {
          if (!isInMainGroup) {
            router.replace("/(main)/(dashboard)");
          }
        }
      } catch (err) {
        console.error("Navigation error in AuthGate:", err);
        if (segments[0] !== "(auth)") {
          router.replace("/(auth)");
        }
      } finally {
        if (isActive) {
          setIsCheckingAuth(false);
        }
      }
    };

    handleAuthFlow();
    return () => {
      isActive = false;
    };
  }, [segmentKey]);

  if (isCheckingAuth) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: 'white' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return <Slot />;
}
