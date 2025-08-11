import { useSSO } from "@clerk/clerk-expo";
import { Alert } from "react-native";

export const useSocialAuth = () => {
  const { startSSOFlow } = useSSO();

  const handleGoogleAuth = async () => {
    try {
      const { createdSessionId, setActive } = await startSSOFlow({
        strategy: "oauth_google",
      });

      if (createdSessionId && setActive) {
        await setActive({ session: createdSessionId });
      }
    } catch (error) {
      console.log("Failed to Sign in");
      console.log("Error", error);
      Alert.alert("Error", "Failed to sign in with Google");
    }
  };

  return { handleGoogleAuth };
};
