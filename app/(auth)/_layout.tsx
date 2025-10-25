import { Stack } from "expo-router";
import { useEffect } from "react";

export default function AuthLayout() {
  useEffect(() => {
    console.log('Auth layout mounted');
  }, []);

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
          headerShown: true,
          title: 'Login',
          headerTintColor: '#007AFF',
          headerBackTitle: 'Back',
        }}
        listeners={{
          focus: () => console.log('Login screen focused'),
        }}
      />
      <Stack.Screen 
        name="email-signup"
        options={{
          headerShown: true,
          title: 'Sign Up',
          headerTintColor: '#007AFF',
          headerBackTitle: 'Back',
        }}
        listeners={{
          focus: () => console.log('Signup screen focused'),
        }}
      />
    </Stack>
  );
}
