import { useFonts } from "expo-font";
import { useEffect } from "react";
import { Dimensions, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle, Image as SvgImage, Text as SvgText } from "react-native-svg";
import { DashFonts, colorsSheet as color, rs } from "../(settings)/ui_elements";
import { Day } from "./DayPlan";
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

//const finalProgress = 55; // percent
const { width,height } = Dimensions.get("window");
function clamp(min: number, preferred: number, max: number) {
  const scaled = width * preferred; // e.g., 0.05 = 5% of width
  return Math.min(Math.max(scaled, min), max);
}

const radius = clamp(20, 0.07, 50);
const circumference = 2 * Math.PI * radius;
const strokeWidth= (radius/100)*20
const ProgressStrokeWidth= (radius/100)*30

export const Days = ({props, onDayPress}: {props: Day, onDayPress: (dayNo : number) => void}) => {
  if(props.status === 'locked'){ //props false = locked day
    return <LockedDay info={props} />;
  }
  else if(props.status === 'finished'){ //props duration null = finished day
    return <FinishedDay info={props} Press={onDayPress}/>;
  }
  else{
    console.log("Radius: " + radius + " Width of Window: " + width + ' Hieght: ' + height )
    return <ActiveDay info={props} Press={onDayPress}/>;
  }
}

const ActiveDay = ({info, Press}: {info: Day, Press: (dayNo : number) => void}) => {
  const progress = useSharedValue(0);
  const finalProgress : number = Math.min(100, Math.round(((info.achievedCalories + info.achieviedHydration) / (info.targetCalories + info.targetHydration)) * 100));
  var time = '00:00:00'
  const formatDuration = (totalSeconds: number): string => {
      const hours = Math.floor(totalSeconds / 3600);
      const mins = Math.floor((totalSeconds % 3600) / 60);
      const secs = totalSeconds % 60;

      const pad = (n: number) => n.toString().padStart(2, "0");

      return `${pad(hours)}:${pad(mins)}:${pad(secs)}`;
};

// Usage
if (info.duration != null && typeof info.duration === "number") {
  time = formatDuration(info.duration);
}
  
  useEffect(() => {
    progress.value = withTiming(finalProgress, { duration: 1000 });
  }, [finalProgress]);
  
  // Animated strokeDashoffset
  const animatedprops = useAnimatedProps(() => {
    const strokeDashoffset =
    circumference - (circumference * progress.value) / 100;
    return {
      strokeDashoffset,
    };
  });
  return (
    <View style={styles.activeItem /**Columnize the box */}>
    <View style={styles.topHeader  /**Row of Circle, DayDate, Button */}>
      {/* Progress Circle */}
        <View style={styles.circleActiveWrapper /**Circle */}>
            <Svg
            height={radius * 2 + 20} 
            width={radius * 2 + 20}
            viewBox={`0 0 ${radius * 2 + 20} ${radius * 2 + 20}`}
            >
            {/* Background Circle */}
            <Circle
              cx="50%"
              cy={radius + 10}
              r={radius}
              stroke="#808080"
              strokeWidth={ProgressStrokeWidth}
              strokeDasharray={circumference}
              fill="none"
              />
            {/* Progress Circle */}
            <AnimatedCircle
              cx= {radius + 10}
              cy={radius + 10}
              r={radius}
              stroke="#00FF44"
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              animatedProps={animatedprops}
              strokeLinecap="round"
              fill="none"
              />
            <SvgText
              x= {radius+7}
              y= {radius+10}
              textAnchor="middle"
              dy=".3em"
              fontSize="15"
              fontWeight="bold"
              fill="#000"
              //fontStyle="italic"
              >
              {finalProgress}%
            </SvgText>
          </Svg>
        </View>
        {/* Day & Date & Remark */}
        <View style={styles.activeContentWrapper /**DayDate */}>
          <View style={styles.row}>
            <Text style={styles.activeDayText}>Day: 0{info.dayNo} </Text> 
            <Text style={styles.activeDateText}>{info.date}</Text>
          </View>
          <Text style={styles.activeSubtitle}>{info.remarks}</Text>
        </View>
        {/* View Button */}
        <Pressable onPress={() => Press(info.dayNo)} 
                  style={{backgroundColor: '#000000', height: rs(30), width: rs(70), borderRadius: 8, justifyContent: 'center', alignItems: 'center'}} >
          <Text style={{color: 'white', fontSize: 12, fontWeight: 'bold'}}>View</Text>
          </Pressable>
    </View>
    <View style={styles.bottomBody}>
      <View style={styles.activeInformation}>
        <View style={styles.activeInfoBoxRow}>
          <Text style={styles.bodyHeadings}>Calories:</Text>
          <Text style={styles.bodyValues}>{info.achievedCalories}</Text>
        </View>
        <View style={styles.activeInfoBoxRow}>
          <Text style={styles.bodyHeadings}>Hydration:</Text>
          <Text style={styles.bodyValues}>{info.achieviedHydration} </Text>
        </View>
        <View style={styles.activeInfoBoxRow}>
          <Text style={styles.bodyHeadings}>Next Meal:</Text>
          <Text style={styles.bodyValues}>{time}</Text>
        </View>
        <View style={styles.activeInfoBoxRow}>
          <Text style={styles.bodyHeadings}>Goal:</Text>
          <Text style={styles.bodyValues}>{`${info.targetCalories} cals, ${info.targetHydration} liters`}</Text>
        </View>
      </View>
    </View>
    
  </View>);
}

const FinishedDay = ({info, Press}: {info: Day, Press: (dayNo : number) => void}) => {
  const [fontsLoaded] = useFonts({
      Pacifico: require("../../../assets/fonts/Pacifico-Regular.ttf"),
      LoraItalic: require("../../../assets/fonts/static/Lora-Italic.ttf"),
      LoraRegular: require("../../../assets/fonts/static/Lora-Regular.ttf"),
  });
  const SvgSize = radius * 2
  const ImgSize= Math.round(SvgSize * 0.75);
  const SvgCenter = radius - ImgSize/2
  const finalProgress : number = Math.min(100, Math.round((info.achievedCalories / info.targetCalories) * 100));
    return (
    <View style={styles.listitem}>
    {/* Progress Circle */}
    <View style={styles.circleWrapper}>
      <Svg
        height={radius * 2 + 10} 
        width={radius * 2 + 10}
        viewBox={`0 0 ${radius * 2 + 20} ${radius * 2 + 20}`}
      >
        {/* Background Circle */}
        <Circle
          cx= {radius + 5}
          cy={radius + 5}
          r={radius}
          stroke="#808080"
          strokeWidth={8}
          strokeDasharray={circumference}
          fill="none"
        />
        <Circle/>
          <SvgImage
            x={SvgCenter +5 }
            y={SvgCenter+5}
            height={ImgSize}
            width={ImgSize}
            href={require("../../../assets/images/Finished.png")}  // Local image
            //preserveAspectRatio="xMidYMid slice"
          />
      </Svg>
    </View>

    <View style={styles.contentWrapper}>
      <View style={styles.row}>
        <Text style={styles.dayText}>Day: 0{info.dayNo} </Text> 
        <Text style={styles.dateText}>{info.date}</Text>
      </View>
      <Text style={styles.subtitle}>Goal: {finalProgress}%</Text>
      
    </View>
      <Pressable onPress={() => Press(info.dayNo)} 
                  style={{backgroundColor: '#000000', height: rs(30), width: rs(70), borderRadius: 8, justifyContent: 'center', alignItems: 'center'}} >
          <Text style={{color: 'white', fontSize: 12, fontWeight: 'bold'}}>View</Text>
          </Pressable>
  </View>
  );
}

const LockedDay = ({info} : {info: Day}) => {
  const SvgSize = radius * 2
  const ImgSize= Math.round(SvgSize * 0.65);
  const SvgCenter = radius - ImgSize/2
  return (
    <View style={styles.listitem}>
    {/* Progress Circle */}
    <View style={styles.circleWrapper}>
      <Svg
        height={SvgSize + 10} 
        width={SvgSize + 10}
        viewBox={`0 0 ${SvgSize + 20} ${SvgSize + 20}`}
      >
        {/* Background Circle */}
        <Circle
          cx={radius + 5}
          cy={radius + 5}
          r={radius}
          stroke="#808080"
          strokeWidth={8}
          strokeDasharray={circumference}
          fill="none"
        />

        {/* Centered Image */}
        <SvgImage
          x={SvgCenter + 5}  // X position (center minus half img size)
          y={SvgCenter + 5}  // Y position (center minus half img size)
          width={ImgSize}                      // Image width
          height={ImgSize}                     // Image height
          href={require("../../../assets/images/locked.png")}  // Local image
          preserveAspectRatio="xMidYMid slice"
        />
      </Svg>
      <View style={styles.contentWrapper}>
    </View>
    </View>
      <View style={[styles.row, {marginLeft: 10}]}>
        <Text style={styles.dayText}>Day: 0{info.dayNo} </Text> 
        <Text style={styles.dateText}>{info.date}</Text>
      </View>
    </View>
    )
}

export const styles = StyleSheet.create({
  listitem: {
    margin: rs(8),
    minHeight: rs(72),
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: color.screenColor,
    borderRadius: rs(12),
    padding: rs(10),
    marginBottom: rs(10),
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: rs(10),
    elevation: 8,
  },

  activeItem: {
    margin: rs(10),
    minHeight: rs(140),
    flexDirection: "column",
    backgroundColor: color.screenColor,
    borderRadius: rs(14),
    padding: rs(10),
    marginBottom: rs(10),
    shadowColor: color.activeDayShadowColor,
    shadowOpacity: 0.3,
    shadowRadius: rs(10),
    elevation: 12,
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
  },

  circleWrapper: {
    width: rs(70),
    justifyContent: "center",
    alignItems: "center",
  },

  circleActiveWrapper: {
    width: rs(70),
    height: rs(80),
    alignItems: "center",
  },

  contentWrapper: {
    flex: 1,
    paddingLeft: rs(10),
    minWidth: 0,
  },

  activeContentWrapper: {
    flex: 1,
    paddingLeft: rs(10),
  },

  dayText: {
    fontWeight: "700",
    fontSize: DashFonts.dayText,
    fontFamily: 'LoraItalic',
  },
  activeDayText: {
    paddingTop: rs(6),
    fontWeight: "700",
    fontSize: DashFonts.dayText,
    fontFamily: 'Inter',
  },
  dateText: {
    paddingLeft: rs(8),
    fontWeight: "500",
    fontSize: DashFonts.dateText,
    color: "#666",
  },
  activeDateText: {
    paddingLeft: rs(8),
    paddingTop: rs(6),
    fontWeight: "500",
    fontSize: DashFonts.activeDateText,
    color: "#666",
  },
  activeSubtitle: {
    paddingTop: rs(6),
    color: "#666",
    fontSize: DashFonts.subtitle,
  },
  subtitle: {
    paddingTop: rs(6),
    color: "#12b82e",
    fontSize: DashFonts.subtitle,
  },
  topHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  bottomBody: {
    width: "100%",
    marginTop: rs(8),
    alignItems: "center",
  },

  activeInformation: {
    width: "100%",
    maxWidth: 520,
    borderRadius: rs(10),
    backgroundColor: "#E9E9EB",
    paddingVertical: rs(8),
    paddingHorizontal: rs(10),
  },

  bodyHeadings: {
    width: rs(72),
    fontWeight: "500",
    fontSize: rs(14),
  },
  bodyValues: {
    flex: 1,
    fontSize: rs(14),
    color: "#2D6EFF",
    marginLeft: rs(10),
  },
  activeInfoBoxRow: {
    flexDirection: "row",
    paddingLeft: rs(8),
    paddingTop: rs(8),
    alignItems: "center",
  },

  viewButton: {
    backgroundColor: "#000000",
    paddingVertical: rs(6),
    paddingHorizontal: rs(10),
    borderRadius: rs(8),
    justifyContent: "center",
    alignItems: "center",
  },
  viewButtonText: {
    color: "#fff",
    fontSize: rs(15),
    fontWeight: "700",
  },
});
