import { useRouter } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, Text, View } from "react-native";

export default function OAuthCallback() {
  const router = useRouter();

  useEffect(() => {
    // The OAuth flow should have completed by now
    // The AuthGate in _layout.tsx will handle the proper routing
    // based on whether the user is new or existing
    console.log("OAuth callback received, redirecting...");
    
    // Small delay to ensure the auth state is updated
    setTimeout(() => {
      router.replace("/");
    }, 1000);
  }, []);

  return (
    <View style={{ 
      flex: 1, 
      justifyContent: "center", 
      alignItems: "center",
      backgroundColor: "#fff" 
    }}>
      <ActivityIndicator size="large" color="#0000ff" />
      <Text style={{ marginTop: 20, fontSize: 16 }}>
        Completing sign in...
      </Text>
    </View>
  );
}