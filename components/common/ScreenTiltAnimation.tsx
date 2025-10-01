import { colorsSheet as color } from "@/app/(main)/(settings)/ui_elements";
import { useDrawerProgress } from "@react-navigation/drawer";
import React, { ReactNode } from "react";
import { View } from "react-native";
import Animated, {
  interpolate,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

export const ScreenSceneWrapper = ({ children }: { children: ReactNode }) => {
  const progress = useDrawerProgress();
  const smoothProgress = useSharedValue(0);
  //called when states or values in body changes... PUT any animation trackers here in future
  useDerivedValue(() => {
    smoothProgress.value = withTiming(progress.value, { duration: 200 });   
  }, [progress.value]);//for web support, removable

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
        { perspective: 1000 }, 
        { scale: interpolate(smoothProgress.value, [0, 1], [1, 0.8]) }, //as drawer opens shrinks scale to 80%
        { translateX: interpolate(smoothProgress.value, [0, 1], [0, 250]) }, //move 170 points from origin
        //{ rotateY: `${interpolate(smoothProgress.value, [0, 1], [0, -25])}deg` }, //rotate 25degs
    ],
    borderRadius: interpolate(smoothProgress.value, [0, 1], [0, 20]), //smoothen edges
  }));
  // dont remove flex 1 or it will no occupy full space
  return <View style={{backgroundColor: color.background}}>
            <Animated.View style={[animatedStyle, { flex: 1, backgroundColor: color.screenColor }]}>
                {children}
            </Animated.View>
        </View>;
};

