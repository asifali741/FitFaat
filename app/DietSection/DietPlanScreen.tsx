import { View, Text, StyleSheet } from 'react-native'
import React from 'react'

export default function DietPlanScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>DietPlanScreen</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginTop: 30,
    padding: 20,
  },
  text: {
    fontSize: 24,
    fontWeight: 'bold',
  }
})