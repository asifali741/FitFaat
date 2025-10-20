import { View } from "react-native";
import React from "react";
import WorkoutButton from "./WorkoutButton";

export default function TestWorkout() {
  return (
    <View style={{ 
      flex: 1, 
      justifyContent: 'center', 
      alignItems: 'center',
      backgroundColor: '#f0f0f0'
    }}>
      <WorkoutButton
        title="Test Workout"
        onPress={() => console.log("Workout button pressed!")}
      />
    </View>
  );
}