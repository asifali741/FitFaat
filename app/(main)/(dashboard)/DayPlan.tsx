import { ActivityIndicator, StyleSheet, View } from "react-native";

// This component is kept for backward compatibility
// The actual dashboard is now in index.tsx which uses the API
export default function DayPlan () {
  // This component is deprecated - use index.tsx instead
  return <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
    <ActivityIndicator size="large" />
  </View>;
}

const styles = StyleSheet.create({
  list: {
  flexGrow: 1,
  width: "95%",
  alignSelf: "center",
  marginTop: "5%",
  marginBottom: "3%",
  borderRadius: 12,
  backgroundColor: "#EDCCC2",
  elevation: 2,
  shadowColor: '#edccc20c',
  shadowOpacity: 0.3,
  shadowRadius: 5,
},

});


