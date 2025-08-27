import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle } from "react-native-svg";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const finalProgress = 75; // percent
const radius = 40;
const circumference = 2 * Math.PI * radius;

export const DayPlan = () => {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(finalProgress, { duration: 1000 });
  }, []);

  // Animated strokeDashoffset
  const animatedProps = useAnimatedProps(() => {
    const strokeDashoffset =
      circumference - (circumference * progress.value) / 100;
    return {
      strokeDashoffset,
    };
  });

  return (
    <View style={styles.list}>
      <View style={styles.listitem}>
        <Svg height="90" width="90">
          {/* background circle */}
          <Circle
            cx="45"
            cy="45"
            r={radius}
            stroke="#4c4d8bff"
            strokeWidth={8}
            strokeDasharray={circumference}
          />
          {/* animated progress circle */}
          <AnimatedCircle
            cx="45"
            cy="45"
            r={radius}
            stroke="#12b82eff"
            strokeWidth={8}
            strokeDasharray={circumference}
            animatedProps={animatedProps}
            strokeLinecap="round"
          />
        </Svg>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  list: {
    height: "90%",
    width: "90%",
    borderStyle: "dashed",
    borderWidth: 2,
    marginTop: 10,
    margin: "5%",
  },
  listitem: {
    margin: "5%",
    height: "14%",
    width: "90%",
    borderRadius: 10, 
    backgroundColor: "#ADD8E6"
  },
});
