import { Stack } from "expo-router";
export default function DietSectionLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }} initialRouteName="index" >
      <Stack.Screen 
        name="index" 
        options={{ 
          title: "Diet Section",
          animation: 'slide_from_right',
          presentation: 'card',
        }} 
      />
      <Stack.Screen 
        name="InformationForm" 
        options={{ 
          title: "Information Form",
          animation: 'slide_from_bottom',
          presentation: 'modal',
        }} 
      />
      <Stack.Screen 
        name="DietPlanScreen" 
        options={{ 
          title: "Diet Plan",
          animation: 'slide_from_right',
          presentation: 'fullScreenModal',
        }} 
      />
    </Stack>
  );
}
