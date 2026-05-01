import { useSSO } from "@clerk/clerk-expo";
import * as AuthSession from "expo-auth-session";
import Constants from "expo-constants";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { Alert } from "react-native";
import { tokenStorage } from "../utils/auth/tokenStorage";

WebBrowser.maybeCompleteAuthSession();

const APP_SCHEME = "fitfaat";
const OAUTH_CALLBACK_PATH = "oauth-native-callback";

const getGoogleRedirectUrl = () => {
  if (Constants.appOwnership === "expo") {
    return Linking.createURL(OAUTH_CALLBACK_PATH);
  }

  return AuthSession.makeRedirectUri({
    scheme: APP_SCHEME,
    path: OAUTH_CALLBACK_PATH,
  });
};

export const useSocialAuth = () => {
  const { startSSOFlow } = useSSO();

  const handleGoogleAuth = async () => {
    try {
      const redirectUrl = getGoogleRedirectUrl();
      console.log("Google OAuth redirect URL:", redirectUrl);

      const { createdSessionId, setActive } = await startSSOFlow({
        strategy: "oauth_google",
        redirectUrl,
      });

      if (createdSessionId && setActive) {
        await setActive({ session: createdSessionId });
        await tokenStorage.clearAll();
      }
    } catch (error) {
      console.log("Failed to Sign in");
      console.log("Error", error);
      Alert.alert("Error", "Failed to sign in with Google");
    }
  };

  return { handleGoogleAuth };
};
