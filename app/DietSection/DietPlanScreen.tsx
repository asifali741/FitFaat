import React, { useState } from "react";
import { Button, ScrollView, Text } from "react-native";
//this screen is for testing clerk woring or not... TO BE REMOVED
// 2 buttons 
//          load tokens 
//          delete tokens
// only for testing  purpose
export default function ClerkWebDebug() {
  const [keys, setKeys] = useState<string[]>([]);

  const loadTokens = () => {
    const allKeys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.includes("clerk")) allKeys.push(`${key}: ${localStorage.getItem(key)}`);
    }
    setKeys(allKeys);
  };

  const clearTokens = () => {
    const clerkKeys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.includes("clerk")) {
        clerkKeys.push(key);
      }
    }
    clerkKeys.forEach((k) => localStorage.removeItem(k));
    setKeys([]);
    console.log("Clerk tokens cleared (web).");
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 20 }}>
      <Text style={{ fontSize: 18, fontWeight: "bold", marginBottom: 10 }}>
        Clerk Web Token Debugger
      </Text>
      <Button title="Load Tokens" onPress={loadTokens} />
      <Button title="Clear Tokens" onPress={clearTokens} />
      {keys.length === 0 ? (
        <Text>No Clerk tokens found</Text>
      ) : (
        keys.map((k, i) => <Text key={i}>{k}</Text>)
      )}
    </ScrollView>
  );
}
