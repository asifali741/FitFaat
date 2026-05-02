import { useTheme } from "@/contexts/ThemeContext";
import { useDrawerProgress } from "@react-navigation/drawer";
import React, { ReactNode } from "react";
import { View } from "react-native";
import Animated, { interpolate, useAnimatedStyle } from "react-native-reanimated";

export const ScreenSceneWrapper = ({ children }: { children: ReactNode }) => {
  const { colors } = useTheme();
  const progress = useDrawerProgress(); // direct from drawer

  const animatedStyle = useAnimatedStyle(() => {
    const p = progress.value;
    const scale = interpolate(p, [0, 1], [1, 0.85]);
    const translateX = interpolate(p, [0, 1], [0, 230]);
    //rotateY: `${interpolate(smoothProgress.value, [0, 1], [0, -35])}deg` },
    const rotateY = `${interpolate(p, [0, 1], [0, -35])}deg`; // negative for left drawer
    const borderRadius = interpolate(p, [0, 1], [0, 24]);

    return {
      transform: [
        { perspective: 1000 }, // must come first for 3D
        { translateX },
        { rotateY },
        { scale },
      ],
      borderRadius,
      overflow: "hidden",
    };
  });


  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Animated.View
        style={[{ flex: 1, backgroundColor: colors.screenColor }, animatedStyle]}
      >
        {children}
      </Animated.View>
    </View>
  );
};
