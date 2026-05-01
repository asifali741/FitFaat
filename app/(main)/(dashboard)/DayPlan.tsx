import { ActivityIndicator, View } from "react-native";
import { useTheme } from "@/contexts/ThemeContext";

// This component is kept for backward compatibility
// The actual dashboard is now in index.tsx which uses the API
export default function DayPlan () {
  const { colors } = useTheme();

  // This component is deprecated - use index.tsx instead
  return <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.screenColor }}>
    <ActivityIndicator size="large" color={colors.primary} />
  </View>;
}
