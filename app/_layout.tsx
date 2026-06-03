import SafeScreen from "@/components/SafeScreen";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { ThemeProvider, useTheme } from "@/contexts/ThemeContext";
import { authApi } from "@/utils/auth/authApi";
import { tokenStorage } from "@/utils/auth/tokenStorage";
import { getStripePublishableKey } from "@/utils/config";
import { StripeProvider } from "@stripe/stripe-react-native";
import { Slot, useRouter, useSegments } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, LogBox, StatusBar, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

// Suppress expo-notifications Expo Go warning (SDK 53 removed push notification support from Expo Go)
// This only affects development in Expo Go; production builds are unaffected
LogBox.ignoreLogs([
  "expo-notifications: Android Push notifications",
  "expo-notifications` functionality is not fully supported in Expo Go",
]);

export default function RootLayout() {
  const stripePublishableKey = getStripePublishableKey();
  
  return (
    <StripeProvider publishableKey={stripePublishableKey}>
      <ThemeProvider>
        <NotificationProvider>
          <SafeAreaProvider>
            <ThemedApp />
          </SafeAreaProvider>
        </NotificationProvider>
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
  const rootSegment = segments[0];
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const hasRefreshedSessionRef = useRef(false);

  useEffect(() => {
    let isActive = true;

    const handleAuthFlow = async () => {
      try {
        const isAuthenticated = await authApi.isAuthenticated();
        const cachedUser = await tokenStorage.getUser();
        const isInAuthGroup = rootSegment === "(auth)";
        const isInMainGroup = rootSegment === "(main)";
        const isInOnboarding = rootSegment === "DietSection";

        if (!isAuthenticated) {
          hasRefreshedSessionRef.current = false;
          if (!isInAuthGroup) {
            router.replace("/(auth)");
          }
          return;
        }

        let currentUser = cachedUser;
        let freshOnboardingStatus: any = null;

        if (!hasRefreshedSessionRef.current) {
          hasRefreshedSessionRef.current = true;
          if (cachedUser && typeof cachedUser.isOnboardingComplete === "boolean") {
            authApi.refreshCurrentUserData({ clearBackendCache: true }).catch((error) => {
              console.log("[AuthGate] Background session refresh unavailable:", error);
            });
          } else {
            const refreshed = await authApi.refreshCurrentUserData({ clearBackendCache: true });
            freshOnboardingStatus = refreshed.onboardingStatus;
            currentUser = refreshed.user || await tokenStorage.getUser() || cachedUser;
          }
        } else {
          currentUser = await tokenStorage.getUser() || cachedUser;
        }

        const refreshedOnboardingComplete =
          typeof freshOnboardingStatus?.isOnboardingComplete === "boolean"
            ? Boolean(freshOnboardingStatus.isOnboardingComplete)
            : null;

        if (refreshedOnboardingComplete !== null) {
          if (!refreshedOnboardingComplete && !isInOnboarding) {
            router.replace("/DietSection");
          } else if (refreshedOnboardingComplete && !isInMainGroup) {
            router.replace("/(main)/(dashboard)");
          }

          return;
        }

        if (currentUser && typeof currentUser.isOnboardingComplete === "boolean") {
          if (!currentUser.isOnboardingComplete && !isInOnboarding) {
            router.replace("/DietSection");
          } else if (currentUser.isOnboardingComplete && !isInMainGroup) {
            router.replace("/(main)/(dashboard)");
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
        if (rootSegment !== "(auth)") {
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
  }, [router, rootSegment]);

  if (isCheckingAuth) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: 'white' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return <Slot />;
}
