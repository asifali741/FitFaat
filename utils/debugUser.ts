import { useUser } from "@clerk/clerk-expo";

export const useUserDebug = () => {
  const { user } = useUser();
  
  const logUserInfo = () => {
    if (user) {
      console.log("=== USER DEBUG INFO ===");
      console.log("User ID:", user.id);
      console.log("Email:", user.emailAddresses[0]?.emailAddress);
      console.log("Unsafe Metadata:", user.unsafeMetadata);
      console.log("Public Metadata:", user.publicMetadata);
      console.log("Has completed onboarding:", user.unsafeMetadata?.hasCompletedOnboarding);
      console.log("=======================");
    } else {
      console.log("No user found");
    }
  };

  return { logUserInfo, user };
};