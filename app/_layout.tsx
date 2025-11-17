import SafeScreen from "@/components/SafeScreen";
// import { NotificationProvider } from "@/contexts/NotificationContext"; // DISABLED
import { ThemeProvider, useTheme } from "@/contexts/ThemeContext";
import { ClerkProvider, useAuth, useUser } from "@clerk/clerk-expo";
import { tokenCache } from "@clerk/clerk-expo/token-cache";
import { Slot, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, StatusBar, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

export default function RootLayout() {
  return (
<<<<<<< HEAD
    // {/* NOTIFICATION FUNCTIONALITY DISABLED FOR NOW */}
    // <NotificationProvider>
      <ClerkProvider tokenCache={tokenCache} publishableKey={publishableKey}> 
        <ThemeProvider>
          <SafeAreaProvider>
            <ThemedApp />
          </SafeAreaProvider>
        </ThemeProvider>
      </ClerkProvider>
    // </NotificationProvider>
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
=======
    <ClerkProvider tokenCache={tokenCache} publishableKey={process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY}> 
      <SafeAreaProvider>
      <StatusBar barStyle="dark-content"/>
        <SafeScreen>
          <AuthGate/>
        </SafeScreen>
      </SafeAreaProvider>
    </ClerkProvider>
>>>>>>> parent of 1220d0d... Merge pull request #5 from asifali741/merge/asif-into-main
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
