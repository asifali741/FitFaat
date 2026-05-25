import { Stack } from "expo-router";

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        headerStyle: {
          backgroundColor: '#fff',
        },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen 
        name="index"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen 
        name="email-login" 
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen 
        name="email-signup"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="forgot-password"
        options={{
          headerShown: true,
          title: 'Forgot Password',
          headerTintColor: '#007AFF',
          headerBackTitle: 'Back',
        }}
      />
    </Stack>
  );
}
