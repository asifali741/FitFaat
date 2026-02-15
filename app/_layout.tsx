import SafeScreen from "@/components/SafeScreen";
import { ThemeProvider, useTheme } from "@/contexts/ThemeContext";
import { ClerkProvider, useAuth, useUser } from "@clerk/clerk-expo";
import { tokenCache } from "@clerk/clerk-expo/token-cache";
import { StripeProvider } from "@stripe/stripe-react-native";
import { Slot, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, StatusBar, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import Constants from 'expo-constants';

// Safely get keys from Constants
const publishableKey = Constants.expoConfig?.extra?.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;

export default function RootLayout() {
  const stripePublishableKey = Constants.expoConfig?.extra?.EXPO_PUBLIC_STRIPE_PK;
  
  // Fail-safe check: If keys are missing, show loader instead of crashing
  if (!publishableKey || !stripePublishableKey) {
    console.warn("Keys missing in RootLayout, showing ActivityIndicator");
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: '#000' }}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }
  
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
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return <Slot />;
}