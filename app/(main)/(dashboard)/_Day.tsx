import { useTheme } from "@/contexts/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import { Dimensions, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withSpring
} from "react-native-reanimated";
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from "react-native-responsive-screen";
import Svg, { Circle, Defs, LinearGradient, Stop, Text as SvgText } from "react-native-svg";
import { DashFonts, rs } from "../(settings)/_ui_elements";
import { Day } from "./types";
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
  const { colors } = useTheme();
  
  if(props.status === 'locked'){ //props false = locked day
    return <LockedDay info={props} />;
  }
  else if(props.status === 'finished'){ //props duration null = finished day
    return <FinishedDay info={props} Press={onDayPress}/>;
  }
  else{
    //console.log("Radius: " + radius + " Width of Window: " + width + ' Hieght: ' + height )
    return <ActiveDay info={props} Press={onDayPress}/>;
  }
}

const ActiveDay = ({info, Press}: {info: Day, Press: (dayNo : number) => void}) => {
  const { colors } = useTheme();
  const scale = useSharedValue(1);
  const finalProgress : number = Math.min(100, Math.round(((info.achievedCalories + info.achieviedHydration) / (info.targetCalories + info.targetHydration)) * 100))
  const animatedContainerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  const styles = getStyles(colors);
  useEffect(() => {
    scale.value = withSpring(1, { damping: 8, stiffness: 150 });
  }, [finalProgress]);
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
        <ProgressCircle finalProgress={finalProgress}/>
      </View>

      {/* Progress Status */}
      <View style={styles.modernStatusSection}>
        <View style={styles.modernStatusItem}>
          <View style={styles.calorieIconBox}>
            <Ionicons name="flame" size={18} color="#FFFFFF" />
          </View>
          <View style={styles.statusContent}>
            <Text style={styles.statusLabel}>Calories</Text>
            <Text style={styles.statusValue}>{info.achievedCalories} kcal</Text>
          </View>
        </View>
        <View style={[styles.modernStatusItem, { borderLeftWidth: 1, borderLeftColor: '#E5E7EB', paddingLeft: rs(12) }]}>
          <View style={styles.hydrationIconBox}>
            <Ionicons name="water" size={18} color="#FFFFFF" />
          </View>
          <View style={styles.statusContent}>
            <Text style={styles.statusLabel}>Hydration</Text>
            <Text style={styles.statusValue}>{info.achieviedHydration} L</Text>
          </View>
        </View>
      </View>

      {/* Remarks */}
      {info.remarks && (
        <View style={styles.modernRemarksSection}>
          <Ionicons name="chatbubble-ellipses" size={14} color={colors.primary} />
          <Text style={styles.modernRemarksText}>{info.remarks}</Text>
        </View>
      )}

      {/* Action Section */}
      <View style={styles.modernActionSection}>
        {/**Countdown goes here */}
        <InfoTray duration={info.duration}/>
        <Pressable 
          onPress={() => Press(info.dayNo)} 
          style={styles.modernViewButton}
        >
          <Text style={styles.modernViewButtonText}>View Details</Text>
          <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
        </Pressable>
      </View>
    </Animated.View>
  );
}

const FinishedDay = ({info, Press}: {info: Day, Press: (dayNo : number) => void}) => {
  const { colors } = useTheme();
  const scale = useSharedValue(1);
  const finalProgress : number = Math.min(100, Math.round((info.achievedCalories / info.targetCalories) * 100));
  const styles = getStyles(colors);
  
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
          <Ionicons name="checkmark-circle" size={50} color={colors.success} />
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
        <Ionicons name="trophy" size={16} color="#FFFFFF" />
      </Pressable>
    </Animated.View>
  );
}

const LockedDay = ({info} : {info: Day}) => {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  return (
    <View style={styles.modernLockedItem}>
      <View style={styles.modernLockedHeader}>
        <View style={styles.modernLockedIcon}>
          <Ionicons name="lock-closed" size={40} color={colors.gray || '#D1D5DB'} />
        </View>
        
        <View style={styles.modernLockedInfo}>
          <Text style={styles.modernLockedDayNumber}>0{info.dayNo}</Text>
          <Text style={styles.modernLockedDayText}>Day {info.dayNo}</Text>
          <Text style={styles.modernLockedDateText}>{info.date}</Text>
        </View>
        
        <View style={styles.modernLockedStatus}>
          <Text style={styles.modernLockedStatusText}>Locked</Text>
          <Text style={styles.modernLockedSubText}>Unlocks on {info.date}</Text>
        </View>
      </View>
    </View>
  );
}

const ProgressCircle = React.memo(({finalProgress}: {finalProgress: number})=>{
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withSpring(finalProgress, { damping: 12, stiffness: 100 });
  }, [finalProgress]);
  const animatedprops = useAnimatedProps(() => {
    const strokeDashoffset = circumference - (circumference * progress.value) / 100;
    return { strokeDashoffset };
  });
  
  const getProgressColor = () => {
    if (finalProgress >= 80) return colors.success; // Green
    if (finalProgress >= 60) return colors.warning; // Orange  
    if (finalProgress >= 40) return colors.warning; // Yellow
    return colors.error; // Red
  };
  return<>
  <View style={styles.modernProgressWrapper}>
          <Svg height={70} width={70} viewBox="0 0 70 70">
            <Defs>
              <LinearGradient id="progressGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <Stop offset="0%" stopColor={getProgressColor()} stopOpacity="1" />
                <Stop offset="100%" stopColor={getProgressColor()} stopOpacity="0.7" />
              </LinearGradient>
            </Defs>
            <Circle cx="35" cy="35" r="30" stroke="#E5E7EB" strokeWidth="6" fill="none" />
            <AnimatedCircle
              cx="35" cy="35" r="30"
              stroke="url(#progressGrad)"
              strokeWidth="6"
              strokeDasharray={circumference}
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
  </>
});
ProgressCircle.displayName = 'ProgressCircle';


const InfoTray = React.memo(({ duration }: { duration: number }) => {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const [timeRemaining, setTimeRemaining] = useState<string>('00:00:00');
  
  const formatDuration = (totalSeconds: number): string => {
    const seconds = Math.max(0, Math.floor(totalSeconds));
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    const pad = (n: number) => n.toString().padStart(2, "0");
    return `${pad(hours)}:${pad(mins)}:${pad(secs)}`;
  };

  // Calculate time remaining until end of day (11:59:59 PM)
  const calculateTimeUntilEndOfDay = (): number => {
    const now = new Date();
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);
    
    const diffMs = endOfDay.getTime() - now.getTime();
    const diffSeconds = Math.max(0, Math.floor(diffMs / 1000));
    
    return diffSeconds;
  };

  useEffect(() => {
    // Set initial time
    setTimeRemaining(formatDuration(calculateTimeUntilEndOfDay()));

    // Update every second
    const interval = setInterval(() => {
      const secondsLeft = calculateTimeUntilEndOfDay();
      setTimeRemaining(formatDuration(secondsLeft));
      
      // Optional: trigger refresh when day ends (optional enhancement)
      if (secondsLeft === 0) {
        clearInterval(interval);
        // Could trigger a day refresh here
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <View style={styles.modernNextMeal}>
          <Ionicons name="time" size={16} color={colors.primary} />
          <Text style={styles.modernNextMealText}>Time left: {timeRemaining}</Text>
    </View>
    
  );
});
InfoTray.displayName = 'InfoTray';


const getStyles = (colors: any) => StyleSheet.create({
  listitem: {
    margin: wp(2.1),
    minHeight: hp(8.8),
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.screenColor,
    borderRadius: wp(3.2),
    padding: wp(2.7),
    marginBottom: wp(2.7),
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: wp(2.7),
    elevation: 8,
  },

  activeItem: {
    margin: wp(2.7),
    minHeight: hp(17.2),
    flexDirection: "column",
    backgroundColor: colors.screenColor,
    borderRadius: wp(3.7),
    padding: wp(2.7),
    marginBottom: wp(2.7),
    shadowColor: colors.activeDayShadowColor,
    shadowOpacity: 0.3,
    shadowRadius: wp(2.7),
    elevation: 12,
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
  },

  circleWrapper: {
    width: wp(18.6),
    justifyContent: "center",
    alignItems: "center",
  },

  circleActiveWrapper: {
    width: wp(18.6),
    height: hp(9.8),
    alignItems: "center",
  },

  contentWrapper: {
    flex: 1,
    paddingLeft: wp(2.7),
    minWidth: 0,
  },

  activeContentWrapper: {
    flex: 1,
    paddingLeft: wp(2.7),
  },

  dayText: {
    fontWeight: "700",
    fontSize: hp(2.2),
    fontFamily: 'LoraItalic',
  },
  activeDayText: {
    paddingTop: hp(0.7),
    fontWeight: "700",
    fontSize: hp(2.2),
    fontFamily: 'Inter',
  },
  dateText: {
    paddingLeft: wp(2.1),
    fontWeight: "500",
    fontSize: hp(1.8),
    color: "#666",
  },
  activeDateText: {
    paddingLeft: wp(2.1),
    paddingTop: hp(0.7),
    fontWeight: "500",
    fontSize: hp(1.8),
    color: "#666",
  },
  activeSubtitle: {
    paddingTop: hp(0.7),
    color: "#666",
    fontSize: hp(1.7),
  },
  subtitle: {
    paddingTop: hp(0.7),
    color: "#12b82e",
    fontSize: hp(1.7),
  },
  topHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  bottomBody: {
    width: "100%",
    marginTop: hp(1),
    alignItems: "center",
  },

  activeInformation: {
    width: "100%",
    maxWidth: 520,
    borderRadius: wp(2.7),
    backgroundColor: "#E9E9EB",
    paddingVertical: hp(1),
    paddingHorizontal: wp(2.7),
  },

  bodyHeadings: {
    width: wp(19.2),
    fontWeight: "500",
    fontSize: hp(1.7),
  },
  bodyValues: {
    flex: 1,
    fontSize: hp(1.7),
    color: "#2D6EFF",
    marginLeft: wp(2.7),
  },
  activeInfoBoxRow: {
    flexDirection: "row",
    paddingLeft: wp(2.1),
    paddingTop: hp(1),
    alignItems: "center",
  },

  viewButton: {
    backgroundColor: "#000000",
    paddingVertical: hp(0.7),
    paddingHorizontal: wp(2.7),
    borderRadius: wp(2.1),
    justifyContent: "center",
    alignItems: "center",
  },
  viewButtonText: {
    color: "#fff",
    fontSize: hp(1.8),
    fontWeight: "700",
  },
  
  // Modern Active Day Styles
  modernActiveItem: {
    margin: wp(2.1),
    marginHorizontal: wp(3),
    backgroundColor: colors.cardBackground,
    borderRadius: wp(5.3),
    padding: wp(4.8),
    marginBottom: wp(4.3),
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: wp(3.2),
    elevation: 8,
    borderLeftWidth: 5,
    borderLeftColor: colors.primary,
    borderWidth: 1,
    borderColor: '#000000',
  },
  
  modernTopHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: wp(4.3),
    paddingBottom: wp(3.7),
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  
  modernDayInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  
  modernDayNumber: {
    fontSize: hp(4.5),
    fontWeight: '800',
    color: colors.primary,
    marginRight: wp(4.3),
    backgroundColor: colors.primarySoft,
    borderRadius: wp(3.7),
    paddingHorizontal: wp(4.3),
    paddingVertical: hp(1.2),
    textAlign: 'center',
    minWidth: wp(20),
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.22,
    shadowRadius: wp(1.3),
    elevation: 4,
  },
  
  modernDayDetails: {
    flex: 1,
  },
  
  modernDayText: {
    fontSize: hp(2.7),
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: hp(0.5),
    letterSpacing: 0.5,
  },
  
  modernDateText: {
    fontSize: hp(1.7),
    color: colors.textSecondary,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  
  modernProgressWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  modernStatusSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: wp(4.3),
    backgroundColor: colors.offWhite,
    borderRadius: wp(3.7),
    padding: wp(3.7),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: wp(0.8),
  },
  
  modernStatusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingVertical: hp(0.5),
  },
  
  calorieIconBox: {
    width: wp(11.2),
    height: wp(11.2),
    borderRadius: wp(2.9),
    backgroundColor: '#F97316',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#F97316',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.28,
    shadowRadius: wp(1.3),
    elevation: 4,
  },
  
  hydrationIconBox: {
    width: wp(11.2),
    height: wp(11.2),
    borderRadius: wp(2.9),
    backgroundColor: '#2E86AB',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#2E86AB',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.28,
    shadowRadius: wp(1.3),
    elevation: 4,
  },
  
  statusContent: {
    marginLeft: wp(2.7),
    flex: 1,
  },
  
  statusLabel: {
    fontSize: hp(1.4),
    color: colors.textSecondary,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  
  statusValue: {
    fontSize: hp(1.8),
    color: colors.textPrimary,
    fontWeight: '700',
    marginTop: hp(0.2),
  },
  
  modernStatusText: {
    fontSize: hp(1.7),
    color: colors.textPrimary,
    fontWeight: '600',
    marginLeft: wp(2.1),
  },
  
  modernRemarksSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.primarySoft,
    borderRadius: wp(3.2),
    padding: wp(3.2),
    marginBottom: wp(3.7),
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: wp(0.8),
  },
  
  modernRemarksText: {
    fontSize: hp(1.7),
    color: colors.primary,
    fontStyle: 'italic',
    marginLeft: wp(2.7),
    flex: 1,
    fontWeight: '500',
    lineHeight: hp(2.5),
  },
  
  modernActionSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: wp(2.7),
  },
  
  modernNextMeal: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: wp(3.2),
    paddingHorizontal: wp(3.7),
    paddingVertical: hp(1.2),
    flex: 1,
    borderWidth: 1.5,
    borderColor: colors.primary + '30',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: wp(1.3),
    elevation: 3,
  },
  
  modernNextMealText: {
    fontSize: hp(1.6),
    color: colors.primary,
    fontWeight: '700',
    marginLeft: wp(2.1),
    letterSpacing: 0.3,
  },
  
  modernViewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: wp(3.2),
    paddingHorizontal: wp(4.3),
    paddingVertical: hp(1.5),
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: wp(2.1),
    elevation: 6,
  },
  
  modernViewButtonText: {
    color: '#FFFFFF',
    fontSize: hp(1.7),
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  
  // Modern Finished Day Styles
  modernFinishedItem: {
    margin: wp(2.1),
    marginHorizontal: wp(3),
    backgroundColor: colors.cardBackground,
    borderRadius: wp(5.3),
    padding: wp(4.8),
    marginBottom: wp(4.3),
    shadowColor: colors.success,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: wp(2.7),
    elevation: 8,
    borderLeftWidth: 5,
    borderLeftColor: colors.success,
    borderWidth: 1,
    borderColor: '#000000',
  },
  
  modernFinishedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: wp(3.7),
  },
  
  modernSuccessIcon: {
    marginRight: wp(3.2),
  },
  
  modernFinishedInfo: {
    flex: 1,
  },
  
  modernFinishedDayNumber: {
    fontSize: hp(3.7),
    fontWeight: '800',
    color: colors.success,
    backgroundColor: colors.primarySoft,
    borderRadius: wp(2.7),
    paddingHorizontal: wp(3.2),
    paddingVertical: hp(1),
    textAlign: 'center',
    alignSelf: 'flex-start',
    marginBottom: hp(1),
    shadowColor: colors.success,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: wp(1.1),
    elevation: 2,
  },
  
  modernFinishedDayText: {
    fontSize: hp(2.5),
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: hp(0.5),
    letterSpacing: 0.4,
  },
  
  modernFinishedDateText: {
    fontSize: hp(1.7),
    color: colors.textSecondary,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  
  modernFinishedProgress: {
    alignItems: 'center',
    paddingVertical: hp(1.2),
    paddingHorizontal: wp(3.2),
    backgroundColor: colors.primarySoft,
    borderRadius: wp(2.7),
  },
  
  modernFinishedPercentage: {
    fontSize: hp(3.5),
    fontWeight: '800',
    color: colors.success,
    marginBottom: hp(0.5),
    letterSpacing: 0.3,
  },
  
  modernFinishedLabel: {
    fontSize: hp(1.5),
    color: colors.success,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  
  modernFinishedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.success,
    borderRadius: wp(3.2),
    paddingHorizontal: wp(5.3),
    paddingVertical: hp(1.5),
    shadowColor: colors.success,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: wp(1.6),
    elevation: 5,
    marginTop: hp(1.5),
  },
  
  modernFinishedButtonText: {
    color: colors.buttonText,
    fontSize: hp(1.7),
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  
  // Modern Locked Day Styles
  modernLockedItem: {
    margin: wp(2.1),
    marginHorizontal: wp(3),
    backgroundColor: colors.cardBackground,
    borderRadius: wp(5.3),
    padding: wp(4.8),
    marginBottom: wp(4.3),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: wp(1.1),
    elevation: 2,
    borderWidth: 1.5,
    borderColor: '#000000',
    opacity: 0.75,
  },
  
  modernLockedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: hp(1.5),
  },
  
  modernLockedIcon: {
    marginRight: wp(3.2),
    opacity: 0.6,
  },
  
  modernLockedInfo: {
    flex: 1,
  },
  
  modernLockedDayNumber: {
    fontSize: hp(3),
    fontWeight: '700',
    color: colors.lockedStatus,
    backgroundColor: colors.lightGray,
    borderRadius: wp(2.7),
    paddingHorizontal: wp(2.7),
    paddingVertical: hp(0.7),
    textAlign: 'center',
    alignSelf: 'flex-start',
    marginBottom: hp(0.7),
  },
  
  modernLockedDayText: {
    fontSize: hp(2.2),
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: hp(0.4),
    letterSpacing: 0.2,
  },
  
  modernLockedDateText: {
    fontSize: hp(1.7),
    color: colors.lockedStatus,
    fontWeight: '500',
  },
  
  modernLockedStatus: {
    alignItems: 'center',
    paddingVertical: hp(1),
  },
  
  modernLockedStatusText: {
    fontSize: hp(1.8),
    fontWeight: '700',
    color: colors.lockedStatus,
    textTransform: 'uppercase',
    marginBottom: hp(0.4),
    letterSpacing: 0.5,
  },
  
  modernLockedSubText: {
    fontSize: hp(1.4),
    color: colors.textLight,
    textAlign: 'center',
    fontStyle: 'italic',
    fontWeight: '500',
  },
});
