import { Ionicons } from "@expo/vector-icons";
import React, { useEffect } from "react";
import { Dimensions, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withSpring
} from "react-native-reanimated";
import Svg, { Circle, Defs, LinearGradient, Stop, Text as SvgText } from "react-native-svg";
import { DashFonts, colorsSheet as color, rs } from "../(settings)/ui_elements";
import { Day } from "./DayPlan";
const AnimatedCircle = Animated.createAnimatedComponent(Circle);
interface ProgressCircleProps {
  progress: number;
}

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
  const scale = useSharedValue(1);
  const finalProgress : number = Math.min(100, Math.round(((info.achievedCalories + info.achieviedHydration) / (info.targetCalories + info.targetHydration)) * 100));
  
  var time = '00:00:00'
  const formatDuration = (totalSeconds: number): string => {
      const hours = Math.floor(totalSeconds / 3600);
      const mins = Math.floor((totalSeconds % 3600) / 60);
      const secs = totalSeconds % 60;
      const pad = (n: number) => n.toString().padStart(2, "0");
      return `${pad(hours)}:${pad(mins)}:${pad(secs)}`;
  };

  if (info.duration != null && typeof info.duration === "number") {
    time = formatDuration(info.duration);
  }
  
  useEffect(() => {
    progress.value = withSpring(finalProgress, { damping: 12, stiffness: 100 });
    scale.value = withSpring(1, { damping: 8, stiffness: 150 });
  }, [finalProgress]);
  
  const animatedprops = useAnimatedProps(() => {
    const strokeDashoffset = circumference - (circumference * progress.value) / 100;
    return { strokeDashoffset };
  });

  const animatedContainerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const getProgressColor = () => {
    if (finalProgress >= 80) return color.success; // Green
    if (finalProgress >= 60) return color.warning; // Orange  
    if (finalProgress >= 40) return color.warning; // Yellow
    return color.error; // Red
  };

  return (
    <Animated.View style={[styles.modernActiveItem, animatedContainerStyle]}>
      {/* Header Section */}
      <View style={styles.modernTopHeader}>
        <View style={styles.modernDayInfo}>
          <Text style={styles.modernDayNumber}>0{info.dayNo}</Text>
          <View style={styles.modernDayDetails}>
            <Text style={styles.modernDayText}>Day {info.dayNo}</Text>
            <Text style={styles.modernDateText}>{info.date}</Text>
          </View>
        </View>
        
        <View style={styles.modernProgressWrapper}>
          <Svg height={70} width={70} viewBox="0 0 70 70">
            <Defs>
              <LinearGradient id="progressGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <Stop offset="0%" stopColor={getProgressColor()} stopOpacity="1" />
                <Stop offset="100%" stopColor={getProgressColor()} stopOpacity="0.7" />
              </LinearGradient>
            </Defs>
            <Circle cx="35" cy="35" r="30" stroke="#E0E0E0" strokeWidth="6" fill="none" />
            <AnimatedCircle
              cx="35" cy="35" r="30"
              stroke="url(#progressGrad)"
              strokeWidth="6"
              strokeDasharray={circumference * 0.43}
              animatedProps={animatedprops}
              strokeLinecap="round"
              fill="none"
              transform="rotate(-90 35 35)"
            />
            <SvgText x="35" y="35" textAnchor="middle" dy=".3em" fontSize="14" fontWeight="bold" fill={getProgressColor()}>
              {finalProgress}%
            </SvgText>
          </Svg>
        </View>
      </View>

      {/* Progress Status */}
      <View style={styles.modernStatusSection}>
        <View style={styles.modernStatusItem}>
          <Ionicons name="flame" size={16} color="#FF6B35" />
          <Text style={styles.modernStatusText}>Calories: {info.achievedCalories}</Text>
        </View>
        <View style={styles.modernStatusItem}>
          <Ionicons name="water" size={16} color="#4A90E2" />
          <Text style={styles.modernStatusText}>Hydration: {info.achieviedHydration}</Text>
        </View>
      </View>

      {/* Remarks */}
      {info.remarks && (
        <View style={styles.modernRemarksSection}>
          <Ionicons name="chatbubble-ellipses" size={14} color="#666" />
          <Text style={styles.modernRemarksText}>{info.remarks}</Text>
        </View>
      )}

      {/* Action Section */}
      <View style={styles.modernActionSection}>
        <View style={styles.modernNextMeal}>
          <Ionicons name="time" size={16} color="#9C27B0" />
          <Text style={styles.modernNextMealText}>Next: {time}</Text>
        </View>
        <Pressable 
          onPress={() => Press(info.dayNo)} 
          style={styles.modernViewButton}
        >
          <Text style={styles.modernViewButtonText}>View Details</Text>
          <Ionicons name="arrow-forward" size={16} color="#fff" />
        </Pressable>
      </View>
    </Animated.View>
  );
}

const FinishedDay = ({info, Press}: {info: Day, Press: (dayNo : number) => void}) => {
  const scale = useSharedValue(1);
  const finalProgress : number = Math.min(100, Math.round((info.achievedCalories / info.targetCalories) * 100));
  
  useEffect(() => {
    scale.value = withSpring(1, { damping: 10, stiffness: 150 });
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[styles.modernFinishedItem, animatedStyle]}>
      <View style={styles.modernFinishedHeader}>
        <View style={styles.modernSuccessIcon}>
          <Ionicons name="checkmark-circle" size={50} color="#4CAF50" />
        </View>
        
        <View style={styles.modernFinishedInfo}>
          <Text style={styles.modernFinishedDayNumber}>0{info.dayNo}</Text>
          <Text style={styles.modernFinishedDayText}>Day {info.dayNo} Complete</Text>
          <Text style={styles.modernFinishedDateText}>{info.date}</Text>
        </View>
        
        <View style={styles.modernFinishedProgress}>
          <Text style={styles.modernFinishedPercentage}>{finalProgress}%</Text>
          <Text style={styles.modernFinishedLabel}>Goal Achieved</Text>
        </View>
      </View>
      
      <Pressable 
        onPress={() => Press(info.dayNo)} 
        style={styles.modernFinishedButton}
      >
        <Text style={styles.modernFinishedButtonText}>View Results</Text>
        <Ionicons name="trophy" size={16} color="#fff" />
      </Pressable>
    </Animated.View>
  );
}

const LockedDay = ({info} : {info: Day}) => {
  return (
    <View style={styles.modernLockedItem}>
      <View style={styles.modernLockedHeader}>
        <View style={styles.modernLockedIcon}>
          <Ionicons name="lock-closed" size={40} color="#95A5A6" />
        </View>
        
        <View style={styles.modernLockedInfo}>
          <Text style={styles.modernLockedDayNumber}>0{info.dayNo}</Text>
          <Text style={styles.modernLockedDayText}>Day {info.dayNo}</Text>
          <Text style={styles.modernLockedDateText}>{info.date}</Text>
        </View>
        
        <View style={styles.modernLockedStatus}>
          <Text style={styles.modernLockedStatusText}>Locked</Text>
          <Text style={styles.modernLockedSubText}>Complete previous days</Text>
        </View>
      </View>
    </View>
  );
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
  
  // Modern Active Day Styles
  modernActiveItem: {
    margin: rs(8),
    backgroundColor: color.cardBackground,
    borderRadius: rs(20),
    padding: rs(16),
    marginBottom: rs(12),
    shadowColor: color.shadowMedium,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: rs(12),
    elevation: 8,
    borderLeftWidth: 4,
    borderLeftColor: color.activeStatus,
  },
  
  modernTopHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: rs(12),
  },
  
  modernDayInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  
  modernDayNumber: {
    fontSize: rs(32),
    fontWeight: '800',
    color: color.textPrimary,
    marginRight: rs(12),
    backgroundColor: color.primarySoft,
    borderRadius: rs(12),
    paddingHorizontal: rs(12),
    paddingVertical: rs(6),
    textAlign: 'center',
    minWidth: rs(60),
  },
  
  modernDayDetails: {
    flex: 1,
  },
  
  modernDayText: {
    fontSize: rs(18),
    fontWeight: '600',
    color: color.textPrimary,
    marginBottom: rs(2),
  },
  
  modernDateText: {
    fontSize: rs(14),
    color: color.textSecondary,
    fontWeight: '500',
  },
  
  modernProgressWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  modernStatusSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: rs(12),
    backgroundColor: color.offWhite,
    borderRadius: rs(12),
    padding: rs(12),
  },
  
  modernStatusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  
  modernStatusText: {
    fontSize: rs(13),
    color: color.textPrimary,
    fontWeight: '500',
    marginLeft: rs(6),
  },
  
  modernRemarksSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: color.primarySoft,
    borderRadius: rs(10),
    padding: rs(10),
    marginBottom: rs(12),
  },
  
  modernRemarksText: {
    fontSize: rs(13),
    color: color.secondary,
    fontStyle: 'italic',
    marginLeft: rs(6),
    flex: 1,
  },
  
  modernActionSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  
  modernNextMeal: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3E5F5',
    borderRadius: rs(8),
    paddingHorizontal: rs(10),
    paddingVertical: rs(6),
    flex: 1,
    marginRight: rs(12),
  },
  
  modernNextMealText: {
    fontSize: rs(12),
    color: '#7B1FA2',
    fontWeight: '600',
    marginLeft: rs(4),
  },
  
  modernViewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: color.buttonPrimary,
    borderRadius: rs(12),
    paddingHorizontal: rs(16),
    paddingVertical: rs(10),
    shadowColor: color.shadowMedium,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  
  modernViewButtonText: {
    color: color.buttonText,
    fontSize: rs(13),
    fontWeight: '600',
    marginRight: rs(4),
  },
  
  // Modern Finished Day Styles
  modernFinishedItem: {
    margin: rs(8),
    backgroundColor: color.cardBackground,
    borderRadius: rs(16),
    padding: rs(16),
    marginBottom: rs(12),
    shadowColor: color.finishedStatus,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: rs(8),
    elevation: 6,
    borderLeftWidth: 4,
    borderLeftColor: color.finishedStatus,
  },
  
  modernFinishedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: rs(12),
  },
  
  modernSuccessIcon: {
    marginRight: rs(12),
  },
  
  modernFinishedInfo: {
    flex: 1,
  },
  
  modernFinishedDayNumber: {
    fontSize: rs(24),
    fontWeight: '800',
    color: color.finishedStatus,
    backgroundColor: color.primarySoft,
    borderRadius: rs(8),
    paddingHorizontal: rs(8),
    paddingVertical: rs(4),
    textAlign: 'center',
    alignSelf: 'flex-start',
    marginBottom: rs(4),
  },
  
  modernFinishedDayText: {
    fontSize: rs(16),
    fontWeight: '600',
    color: color.textPrimary,
    marginBottom: rs(2),
  },
  
  modernFinishedDateText: {
    fontSize: rs(13),
    color: color.textSecondary,
    fontWeight: '500',
  },
  
  modernFinishedProgress: {
    alignItems: 'center',
  },
  
  modernFinishedPercentage: {
    fontSize: rs(20),
    fontWeight: '800',
    color: color.finishedStatus,
    marginBottom: rs(2),
  },
  
  modernFinishedLabel: {
    fontSize: rs(11),
    color: color.finishedStatus,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  
  modernFinishedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: color.buttonSuccess,
    borderRadius: rs(12),
    paddingHorizontal: rs(16),
    paddingVertical: rs(10),
    shadowColor: color.buttonSuccess,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  
  modernFinishedButtonText: {
    color: color.buttonText,
    fontSize: rs(14),
    fontWeight: '600',
    marginRight: rs(6),
  },
  
  // Modern Locked Day Styles
  modernLockedItem: {
    margin: rs(8),
    backgroundColor: color.white,
    borderRadius: rs(16),
    padding: rs(16),
    marginBottom: rs(12),
    shadowColor: color.textLight,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: rs(4),
    elevation: 3,
    borderWidth: 1,
    borderColor: color.gray,
    opacity: 0.8,
  },
  
  modernLockedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  
  modernLockedIcon: {
    marginRight: rs(12),
    opacity: 0.6,
  },
  
  modernLockedInfo: {
    flex: 1,
  },
  
  modernLockedDayNumber: {
    fontSize: rs(20),
    fontWeight: '700',
    color: color.lockedStatus,
    backgroundColor: color.lightGray,
    borderRadius: rs(8),
    paddingHorizontal: rs(8),
    paddingVertical: rs(4),
    textAlign: 'center',
    alignSelf: 'flex-start',
    marginBottom: rs(4),
  },
  
  modernLockedDayText: {
    fontSize: rs(16),
    fontWeight: '600',
    color: color.textSecondary,
    marginBottom: rs(2),
  },
  
  modernLockedDateText: {
    fontSize: rs(13),
    color: color.lockedStatus,
    fontWeight: '500',
  },
  
  modernLockedStatus: {
    alignItems: 'center',
  },
  
  modernLockedStatusText: {
    fontSize: rs(14),
    fontWeight: '600',
    color: color.lockedStatus,
    textTransform: 'uppercase',
    marginBottom: rs(2),
  },
  
  modernLockedSubText: {
    fontSize: rs(10),
    color: color.textLight,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
