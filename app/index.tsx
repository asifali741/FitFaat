import { Text, TouchableOpacity } from 'react-native'
import React from 'react'
import { useRouter } from 'expo-router'

export default function HomeScreen() {
  const router = useRouter()
  return (
    <TouchableOpacity
   onPress={() => router.push("/DietPlanScreen")}
    >
      <Text>HomeScreen</Text>
    </TouchableOpacity>
  )
}