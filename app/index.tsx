import BlueLoader from "@/components/common/BlueLoader";
import { useAuth, useUser } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import { useEffect } from "react";

export default function Page() {
  const { isSignedIn, isLoaded } = useAuth();
  const { user } = useUser();
  const router = useRouter();
  
  // Immediately redirect if auth is loaded
  useEffect(() => {
    if (isLoaded) {
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
    }
  }, [isLoaded, isSignedIn, user]);
  
  // Show blue loader while auth loads
  return <BlueLoader fullScreen text="Loading..." />;
}

