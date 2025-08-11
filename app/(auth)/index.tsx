import { Text, TouchableOpacity } from "react-native";
import { useSocialAuth } from "@/hooks/useSocialAuth";

export default function Index() {
  const { handleGoogleAuth } = useSocialAuth();

  return (
    <TouchableOpacity
      onPress={handleGoogleAuth}
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Text>Sign in with Google</Text>
    </TouchableOpacity>
  );
}
