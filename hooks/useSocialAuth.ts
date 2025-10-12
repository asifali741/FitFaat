import { useSSO } from "@clerk/clerk-expo";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { Alert } from "react-native";

WebBrowser.maybeCompleteAuthSession(); // 👈 important for web and mobile both

export const useSocialAuth = () => {
  const { startSSOFlow } = useSSO();

  const handleGoogleAuth = async () => {
    try {
      const redirectUrl = Linking.createURL("/"); // 👈 where to return after OAuth

      const { createdSessionId, setActive } = await startSSOFlow({
        strategy: "oauth_google",
        redirectUrl, // 👈 required for web (and mobile)
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
