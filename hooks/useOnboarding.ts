import { useUser } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import { useState } from "react";

export const useOnboarding = () => {
  const { user } = useUser();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const completeOnboarding = async () => {
    if (!user) {
      console.log("No user found, cannot complete onboarding");
      return;
    }

    console.log("Starting onboarding completion for user:", user.id);
    console.log("Current unsafe metadata:", user.unsafeMetadata);
    
    setIsLoading(true);
    try {
      // Update user metadata to mark onboarding as complete
      const updatedUser = await user.update({
        unsafeMetadata: {
          ...user.unsafeMetadata,
          hasCompletedOnboarding: true,
        },
      });

      console.log("Onboarding completed successfully");
      console.log("Updated unsafe metadata:", updatedUser.unsafeMetadata);
      
      // Small delay to ensure metadata is synced
      setTimeout(() => {
        console.log("Navigating to dashboard after onboarding");
        router.replace("/(main)/(dashboard)");
      }, 500);
      
    } catch (error) {
      console.error("Error completing onboarding:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const hasCompletedOnboarding = user?.unsafeMetadata?.hasCompletedOnboarding;

  return {
    completeOnboarding,
    hasCompletedOnboarding,
    isLoading,
  };
};