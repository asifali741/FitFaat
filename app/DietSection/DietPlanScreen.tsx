import { View, Text} from 'react-native'
import React from 'react'
import {DietPlanScreenstyle} from "./DietPlanScreenstyle"

export default function DietPlanScreen() {
  return (
    <View style={DietPlanScreenstyle.container}>
      <Text style={DietPlanScreenstyle.text}>DietPlanScreen</Text>
    </View>
  )
}
