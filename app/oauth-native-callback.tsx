import BlueLoader from "@/components/common/BlueLoader";
import { useAuth, useUser } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import { useEffect } from "react";

export default function OAuthCallback() {
  const router = useRouter();
  const { isSignedIn } = useAuth();
  const { user } = useUser();

  useEffect(() => {
    // The OAuth flow should have completed by now
    console.log("OAuth callback received, redirecting...");
    
    // Small delay to ensure the auth state is updated, then redirect directly
    setTimeout(() => {
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
    }, 500);
  }, [isSignedIn, user]);

  return <BlueLoader fullScreen text="Completing sign in..." />;
}