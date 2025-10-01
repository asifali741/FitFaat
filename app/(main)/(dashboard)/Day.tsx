import { useFonts } from "expo-font";
import { useEffect } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle, Image as SvgImage, Text as SvgText } from "react-native-svg";
import { Day } from "./DayPlan";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

//const finalProgress = 55; // percent
const radius = 30;
const circumference = 2 * Math.PI * radius;

export const Days = ({props, onDayPress}: {props: Day, onDayPress: (dayNo : number) => void}) => {
  if(props.status === 'locked'){ //props false = locked day
    return <LockedDay info={props} />;
  }
  else if(props.status === 'finished'){ //props duration null = finished day
    return <FinishedDay info={props} Press={onDayPress}/>;
  }
  else{
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
              strokeWidth={8}
              strokeDasharray={circumference}
              fill="none"
              />
            {/* Progress Circle */}
            <AnimatedCircle
              cx="50%"
              cy={radius + 10}
              r={radius}
              stroke="#00FF44"
              strokeWidth={8}
              strokeDasharray={circumference}
              animatedProps={animatedprops}
              strokeLinecap="round"
              fill="none"
              />
            <SvgText
              x="50%"
              y="50%"
              textAnchor="middle"
              dy=".3em"
              fontSize="16"
              fontWeight="bold"
              fill="#000"
              fontStyle="italic"
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
                  style={{backgroundColor: '#000000', height: '35%', width: '20%', borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginTop: '5%'}} >
          <Text style={{color: 'white', fontSize: 15, fontWeight: 'bold'}}>View</Text>
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
  const finalProgress : number = Math.min(100, Math.round((info.achievedCalories / info.targetCalories) * 100));
    return (
    <View style={styles.listitem}>
    {/* Progress Circle */}
    <View style={styles.circleWrapper}>
      <Svg
        height={radius * 2 + 20} 
        width={radius * 2 + 20}
        viewBox={`0 0 ${radius * 2 + 20} ${radius * 2 + 20}`}
      >
        {/* Background Circle */}
        <Circle
          cx="50%"
          cy="50%"
          r={radius}
          stroke="#808080"
          strokeWidth={8}
          strokeDasharray={circumference}
          fill="none"
        />
          <SvgImage
            x={(radius * 2 + 20)/2 - 20}
            y={(radius * 2 + 20)/2 - 20}
            width={(radius * 2 + 20) -40}
            href={require("../../../assets/images/Finished.png")}  // Local image
            preserveAspectRatio="xMidYMid slice"
          />
        <Circle/>
      </Svg>
    </View>

    <View style={styles.contentWrapper}>
      <View style={styles.row}>
        <Text style={styles.dayText}>Day: 0{info.dayNo} </Text> 
        <Text style={styles.dateText}>{info.date}</Text>
      </View>
      <Text style={styles.subtitle}>Goal: {finalProgress}%</Text>
      
      <Pressable onPress={() => Press(info.dayNo)} style={{backgroundColor: '#000000', height: 30, width: 70, borderRadius: 8, justifyContent: 'center', alignItems: 'center'}} >
        <Text style={{color: 'white', fontSize: 15, fontWeight: 'bold'}}>View</Text>
      </Pressable>
    </View>
  </View>
  );
}

const LockedDay = ({info} : {info: Day}) => {
  return (
    <View style={styles.listitem}>
    {/* Progress Circle */}
    <View style={styles.circleWrapper}>
      <Svg
        height={radius * 2 + 20} 
        width={radius * 2 + 20}
        viewBox={`0 0 ${radius * 2 + 20} ${radius * 2 + 20}`}
      >
        {/* Background Circle */}
        <Circle
          cx="50%"
          cy="50%"
          r={radius}
          stroke="#808080"
          strokeWidth={8}
          strokeDasharray={circumference}
          fill="none"
        />

        {/* Centered Image */}
        <SvgImage
          x={(radius * 2 + 20) / 2 - 20}  // X position (center minus half img size)
          y={(radius * 2 + 20) / 2 - 20}  // Y position (center minus half img size)
          width={40}                      // Image width
          height={40}                     // Image height
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

const styles = StyleSheet.create({
  listitem: {
    margin: "2%",
    height: "9.5%",
    flexDirection: "row",      
    alignItems: "center",      
    backgroundColor: '#EDCCC2',   //ui_elements screenColor
    borderRadius: 12,
    padding: 10,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 15,
  },

  activeItem: {
    margin: "2%",
    height: "30%",
    flexDirection: "column",      
    //alignItems: "center",      
    backgroundColor: '#EDCCC2',  //ui_elements screenColor
    borderRadius: 14,
    padding: 10,
    marginBottom: 10,
    shadowColor: "#7c1515ff",
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 21,
  },
  row: {
    flexDirection: "row",
    //justifyContent: "space-between",
    alignItems: "center",
  },
  circleWrapper: {
    width: 70,                 
    justifyContent: "center",
    alignItems: "center",
  },
  circleActiveWrapper: {
    width: 70,  
    height: radius * 2 + 20 ,               
    //justifyContent: "center",
    alignItems: "center",
  },
  contentWrapper: {
    flex: 1,
    paddingLeft: 10,
  },
  activeContentWrapper: {
    flex: 1,
    paddingLeft: 10,
    height: radius * 2 + 20 , 
  },
  dayText: {
    fontWeight: "bold",
    fontSize: 20,
    fontFamily: "LoraItalic",
  },
  activeDayText: {
    paddingTop: 10,
    fontWeight: "bold",
    fontSize: 20,
    fontFamily: "Inter",
  },
  dateText: {
    paddingLeft: 10,
    fontWeight: "medium",
    fontSize: 15,
    color: "#666",
  },
  activeDateText: {
    paddingLeft: 10,
    paddingTop: 10,
    fontWeight: "medium",
    fontSize: 15,
    color: "#666",
  },
  activeSubtitle: {
    paddingTop: 5,
    color: "#666666ff",
    fontSize: 14,
  },
  subtitle: {
    fontFamily: "Inter",
    paddingTop: 5,
    color: "#12b82eff",
    fontSize: 14,
  },
  topHeader: {
    flexDirection: "row",
  },
  bottomBody: {
    width: "100%",
    height: "56%",
    marginTop: '7%',
    alignItems: "center",
    //justifyContent: "center",
  },
  activeInformation: {
    width: "81%",
    height: "100%",
    borderRadius: 10,
    backgroundColor: "#E9E9EB",
  },
  bodyHeadings:
  {
    width: 72,
    fontFamily: 'inter',
    fontWeight: "regular",
    fontSize: 14,
  },
  bodyValues:{
    fontFamily: 'inter',
    fontWeight: "regular",
    fontSize: 14,
    color: "#2D6EFF",
    marginLeft: 10, 
  },
  activeInfoBoxRow: { 
    flexDirection: "row",
    paddingLeft: "5%",
    paddingTop: "5%",
  }
});
