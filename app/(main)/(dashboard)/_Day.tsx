import { useTheme } from "@/contexts/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming
} from "react-native-reanimated";
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from "react-native-responsive-screen";
import Svg, { Circle, Defs, LinearGradient, Stop } from "react-native-svg";
import {
  getDashboardGoalProgress,
  getHydrationValue,
} from "@/utils/dashboardProgress";
import { getExerciseCaloriesBurned } from "@/utils/localExerciseProgress";
import { getWalkingCaloriesBurned } from "@/utils/localWalkingProgress";
import {
  formatCalorieTarget,
  formatHydrationTarget,
  type GoalDisplayMode,
} from "@/utils/goalTargetDisplay";
import { Day } from "./types";
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export const Days = ({
  props,
  onDayPress,
  showExerciseProgress = false,
  goalDisplayMode = "simple",
}: {
  props: Day,
  onDayPress: (dayNo : number) => void,
  showExerciseProgress?: boolean,
  goalDisplayMode?: GoalDisplayMode,
}) => {
  if(props.status === 'locked'){ //props false = locked day
    return <LockedDay info={props} />;
  }
  else if(props.status === 'finished'){ //props duration null = finished day
    return <FinishedDay info={props} Press={onDayPress} showExerciseProgress={showExerciseProgress}/>;
  }
  else{
    return <ActiveDay info={props} Press={onDayPress} showExerciseProgress={showExerciseProgress} goalDisplayMode={goalDisplayMode}/>;
  }
}

const ActiveDay = ({
  info,
  Press,
  showExerciseProgress,
  goalDisplayMode,
}: {
  info: Day,
  Press: (dayNo : number) => void,
  showExerciseProgress: boolean,
  goalDisplayMode: GoalDisplayMode,
}) => {
  const { colors } = useTheme();
  const scale = useSharedValue(1);
  const shouldShowExerciseProgress = showExerciseProgress === true;
  const finalProgress : number = getDashboardGoalProgress(info);
  const exerciseCaloriesBurned = shouldShowExerciseProgress ? getExerciseCaloriesBurned(info) : 0;
  const walkingCaloriesBurned = shouldShowExerciseProgress ? getWalkingCaloriesBurned(info) : 0;
  const hydrationAmount = getHydrationValue(info);
  const plan = shouldShowExerciseProgress ? "premium" : "free";
  const calorieTargetLabel = formatCalorieTarget(info, goalDisplayMode, plan);
  const hydrationTargetLabel = formatHydrationTarget(info, goalDisplayMode, plan);
  const metricIconSize = Math.min(hp(2), wp(4.4));
  const showTargetRanges = goalDisplayMode === "advanced";
  const animatedContainerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  const styles = getStyles(colors);
  useEffect(() => {
    scale.value = withSpring(1, { damping: 8, stiffness: 150 });
  }, [finalProgress, scale]);
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
      <View style={[styles.modernStatusSection, shouldShowExerciseProgress && styles.modernStatusSectionPremium]}>
        <View style={[styles.modernStatusItem, shouldShowExerciseProgress && styles.modernStatusItemPremium]}>
          <View style={[styles.calorieIconBox, shouldShowExerciseProgress && styles.statusIconBoxPremium]}>
            <Ionicons name="flame" size={metricIconSize} color="#FFFFFF" />
          </View>
          <View style={[styles.statusContent, shouldShowExerciseProgress && styles.statusContentPremium]}>
            <Text
              style={[styles.statusLabel, shouldShowExerciseProgress && styles.statusLabelPremium]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.7}
            >
              Calories
            </Text>
            {showTargetRanges ? (
              <View style={styles.statusValueGroup}>
                <Text style={[styles.statusValue, shouldShowExerciseProgress && styles.statusValuePremium]}>
                  {info.achievedCalories}
                </Text>
                <Text style={[styles.statusTargetValue, shouldShowExerciseProgress && styles.statusTargetValuePremium]}>
                  of {calorieTargetLabel}
                </Text>
              </View>
            ) : (
              <Text
                style={[styles.statusValue, shouldShowExerciseProgress && styles.statusValuePremium]}
                numberOfLines={1}
              >
                {info.achievedCalories}/{calorieTargetLabel}
              </Text>
            )}
          </View>
        </View>
        {shouldShowExerciseProgress && (
          <View style={[styles.modernStatusItem, styles.modernStatusItemPremium]}>
            <View style={[styles.exerciseIconBox, styles.statusIconBoxPremium]}>
              <Ionicons name="fitness" size={metricIconSize} color="#FFFFFF" />
            </View>
            <View style={[styles.statusContent, styles.statusContentPremium]}>
              <Text
                style={[styles.statusLabel, styles.statusLabelPremium]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.7}
              >
                Burned
              </Text>
              <Text
                style={[styles.statusValue, styles.statusValuePremium]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.72}
              >
                {exerciseCaloriesBurned} kcal
              </Text>
            </View>
          </View>
        )}
        {shouldShowExerciseProgress && (
          <View style={[styles.modernStatusItem, styles.modernStatusItemPremium]}>
            <View style={[styles.walkingIconBox, styles.statusIconBoxPremium]}>
              <Ionicons name="footsteps" size={metricIconSize} color="#FFFFFF" />
            </View>
            <View style={[styles.statusContent, styles.statusContentPremium]}>
              <Text
                style={[styles.statusLabel, styles.statusLabelPremium]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.7}
              >
                Walking
              </Text>
              <Text
                style={[styles.statusValue, styles.statusValuePremium]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.72}
              >
                {walkingCaloriesBurned} kcal
              </Text>
            </View>
          </View>
        )}
        <View style={[styles.modernStatusItem, shouldShowExerciseProgress && styles.modernStatusItemPremium, !shouldShowExerciseProgress && styles.statusDivider]}>
          <View style={[styles.hydrationIconBox, shouldShowExerciseProgress && styles.statusIconBoxPremium]}>
            <Ionicons name="water" size={metricIconSize} color="#FFFFFF" />
          </View>
          <View style={[styles.statusContent, shouldShowExerciseProgress && styles.statusContentPremium]}>
            <Text
              style={[styles.statusLabel, shouldShowExerciseProgress && styles.statusLabelPremium]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.7}
            >
              Hydration
            </Text>
            {showTargetRanges ? (
              <View style={styles.statusValueGroup}>
                <Text style={[styles.statusValue, shouldShowExerciseProgress && styles.statusValuePremium]}>
                  {hydrationAmount}
                </Text>
                <Text style={[styles.statusTargetValue, shouldShowExerciseProgress && styles.statusTargetValuePremium]}>
                  of {hydrationTargetLabel} L
                </Text>
              </View>
            ) : (
              <Text
                style={[styles.statusValue, shouldShowExerciseProgress && styles.statusValuePremium]}
                numberOfLines={1}
              >
                {hydrationAmount}/{hydrationTargetLabel} L
              </Text>
            )}
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
          <Text
            style={styles.modernViewButtonText}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.72}
          >
            View Details
          </Text>
          <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
        </Pressable>
      </View>
    </Animated.View>
  );
}

const FinishedDay = ({
  info,
  Press,
  showExerciseProgress = false,
}: {
  info: Day,
  Press: (dayNo : number) => void,
  showExerciseProgress?: boolean,
}) => {
  const { colors } = useTheme();
  const scale = useSharedValue(1);
  const finalProgress : number = getDashboardGoalProgress(info);
  const styles = getStyles(colors);
  
  useEffect(() => {
    scale.value = withSpring(1, { damping: 10, stiffness: 150 });
  }, [scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[styles.modernFinishedItem, animatedStyle]}>
      <View style={styles.modernFinishedHeader}>
        <View style={styles.modernFinishedLeft}>
          <View style={styles.modernSuccessIcon}>
            <Ionicons name="checkmark" size={Math.min(hp(3.1), wp(6.8))} color="#FFFFFF" />
          </View>

          <View style={styles.modernFinishedInfo}>
            <View style={styles.modernFinishedTitleRow}>
              <Text
                style={styles.modernFinishedDayNumber}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.72}
              >
                {String(info.dayNo).padStart(2, '0')}
              </Text>
            </View>
            <Text
              style={styles.modernFinishedDayText}
              numberOfLines={2}
              adjustsFontSizeToFit
              minimumFontScale={0.68}
            >
              Day {info.dayNo}
            </Text>
            <View style={styles.modernFinishedDateRow}>
              <Ionicons name="calendar-outline" size={Math.min(hp(1.7), wp(3.8))} color={colors.textSecondary} />
              <Text
                style={styles.modernFinishedDateText}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.75}
              >
                {info.date}
              </Text>
            </View>
          </View>
        </View>
        
        <View style={styles.modernFinishedProgress}>
          <View style={styles.modernFinishedProgressIcon}>
            <Ionicons name="trophy" size={Math.min(hp(1.7), wp(3.8))} color={colors.success} />
          </View>
          <Text
            style={styles.modernFinishedPercentage}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.65}
          >
            {finalProgress}%
          </Text>
          <Text
            style={styles.modernFinishedLabel}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.65}
          >
            Goal Achieved
          </Text>
        </View>
      </View>
      
      <Pressable 
        onPress={() => Press(info.dayNo)} 
        style={styles.modernFinishedButton}
      >
        <Text
          style={styles.modernFinishedButtonText}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.72}
        >
          View Results
        </Text>
        <Ionicons name="trophy" size={Math.min(hp(1.9), wp(4.2))} color="#FFFFFF" />
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
  const circleSize = Math.min(wp(18.6), hp(8.8));
  const circleRadius = 30;
  const circleCircumference = 2 * Math.PI * circleRadius;
  const progressText = `${finalProgress}%`;
  const progressTextSize = finalProgress >= 100
    ? Math.min(hp(1.45), wp(3.15))
    : Math.min(hp(1.65), wp(3.6));

  useEffect(() => {
    progress.value = withTiming(finalProgress, {
      duration: 700,
      easing: Easing.out(Easing.cubic),
    });
  }, [finalProgress, progress]);
  const animatedprops = useAnimatedProps(() => {
    const clampedProgress = Math.min(100, Math.max(0, progress.value));
    const strokeDashoffset =
      clampedProgress >= 99.9
        ? 0
        : circleCircumference - (circleCircumference * clampedProgress) / 100;
    return { strokeDashoffset };
  });
  
  const getProgressColor = () => {
    if (finalProgress >= 80) return colors.success; // Green
    if (finalProgress >= 60) return colors.warning; // Orange  
    if (finalProgress >= 40) return colors.warning; // Yellow
    return colors.error; // Red
  };
  return<>
  <View style={[styles.modernProgressWrapper, { width: circleSize, height: circleSize }]}>
          <Svg height={circleSize} width={circleSize} viewBox="0 0 70 70">
            <Defs>
              <LinearGradient id="progressGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <Stop offset="0%" stopColor={getProgressColor()} stopOpacity="1" />
                <Stop offset="100%" stopColor={getProgressColor()} stopOpacity="0.7" />
              </LinearGradient>
            </Defs>
            <Circle cx="35" cy="35" r={circleRadius} stroke="#E5E7EB" strokeWidth="6" fill="none" />
            <AnimatedCircle
              cx="35" cy="35" r={circleRadius}
              stroke="url(#progressGrad)"
              strokeWidth="6"
              strokeDasharray={`${circleCircumference} ${circleCircumference}`}
              animatedProps={animatedprops}
              strokeLinecap="round"
              fill="none"
              transform="rotate(-90 35 35)"
            />
          </Svg>
          <Text
            style={[
              styles.progressCircleText,
              {
                color: getProgressColor(),
                fontSize: progressTextSize,
              },
            ]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.65}
          >
            {progressText}
          </Text>
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
    const durationSeconds = Number(duration);
    let secondsRemaining = Number.isFinite(durationSeconds) && durationSeconds > 0
      ? Math.floor(durationSeconds)
      : calculateTimeUntilEndOfDay();

    setTimeRemaining(formatDuration(secondsRemaining));

    const interval = setInterval(() => {
      secondsRemaining = Math.max(0, secondsRemaining - 1);
      setTimeRemaining(formatDuration(secondsRemaining));
      
      if (secondsRemaining === 0) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [duration]);

  return (
    <View style={styles.modernNextMeal}>
      <Ionicons name="time" size={Math.min(hp(2), wp(4.5))} color={colors.primary} style={styles.modernNextMealIcon} />
      <View style={styles.modernNextMealCopy}>
        <Text style={styles.modernNextMealLabel} numberOfLines={1} adjustsFontSizeToFit>
          Time left
        </Text>
        <Text
          style={styles.modernNextMealText}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.68}
        >
          {timeRemaining}
        </Text>
      </View>
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
    position: 'relative',
    flexShrink: 0,
  },

  progressCircleText: {
    position: 'absolute',
    left: '14%',
    right: '14%',
    textAlign: 'center',
    fontWeight: '800',
    includeFontPadding: false,
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

  modernStatusSectionPremium: {
    gap: wp(2.1),
    paddingHorizontal: wp(2.6),
    paddingVertical: hp(1.25),
  },
  
  modernStatusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
    paddingVertical: hp(0.5),
  },

  modernStatusItemPremium: {
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: hp(0.15),
  },

  statusDivider: {
    borderLeftWidth: 1,
    borderLeftColor: '#E5E7EB',
    paddingLeft: wp(3.2),
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

  exerciseIconBox: {
    width: wp(11.2),
    height: wp(11.2),
    borderRadius: wp(2.9),
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.28,
    shadowRadius: wp(1.3),
    elevation: 4,
  },

  walkingIconBox: {
    width: wp(11.2),
    height: wp(11.2),
    borderRadius: wp(2.9),
    backgroundColor: '#22C55E',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#22C55E',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.28,
    shadowRadius: wp(1.3),
    elevation: 4,
  },

  statusIconBoxPremium: {
    width: Math.min(wp(10.4), hp(5.2)),
    height: Math.min(wp(10.4), hp(5.2)),
    borderRadius: Math.min(wp(2.6), hp(1.3)),
    marginBottom: hp(0.65),
  },
  
  statusContent: {
    marginLeft: wp(2.7),
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  },

  statusContentPremium: {
    marginLeft: 0,
    alignItems: 'center',
    width: '100%',
  },
  
  statusLabel: {
    fontSize: hp(1.4),
    color: colors.textSecondary,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  statusLabelPremium: {
    width: '100%',
    textAlign: 'center',
    fontSize: Math.min(hp(1.25), wp(2.7)),
    letterSpacing: 0,
  },
  
  statusValue: {
    fontSize: hp(1.8),
    color: colors.textPrimary,
    fontWeight: '700',
    marginTop: hp(0.2),
  },

  statusValueGroup: {
    marginTop: hp(0.2),
    minWidth: 0,
  },

  statusTargetValue: {
    fontSize: hp(1.55),
    lineHeight: hp(1.85),
    color: colors.textSecondary,
    fontWeight: '700',
    marginTop: hp(0.05),
  },

  statusValuePremium: {
    width: '100%',
    textAlign: 'center',
    fontSize: Math.min(hp(1.75), wp(3.85)),
    lineHeight: Math.min(hp(2.05), wp(4.5)),
    includeFontPadding: false,
  },

  statusTargetValuePremium: {
    width: '100%',
    textAlign: 'center',
    fontSize: Math.min(hp(1.28), wp(2.9)),
    lineHeight: Math.min(hp(1.6), wp(3.5)),
    includeFontPadding: false,
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
    alignItems: 'stretch',
    gap: wp(2.2),
  },
  
  modernNextMeal: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: wp(3.2),
    paddingHorizontal: wp(2.9),
    paddingVertical: hp(0.85),
    flex: 1.08,
    minWidth: 0,
    minHeight: hp(6),
    borderWidth: 1.5,
    borderColor: colors.primary + '30',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: wp(1.3),
    elevation: 3,
  },

  modernNextMealIcon: {
    flexShrink: 0,
  },

  modernNextMealCopy: {
    flex: 1,
    minWidth: 0,
    marginLeft: wp(1.6),
    justifyContent: 'center',
  },

  modernNextMealLabel: {
    fontSize: Math.min(hp(1.2), wp(2.9)),
    color: colors.primary,
    fontWeight: '800',
    letterSpacing: 0,
    textTransform: 'uppercase',
  },
  
  modernNextMealText: {
    fontSize: Math.min(hp(1.75), wp(4.1)),
    color: colors.primary,
    fontWeight: '900',
    letterSpacing: 0,
    includeFontPadding: false,
    marginTop: hp(0.15),
  },
  
  modernViewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: wp(3.2),
    paddingHorizontal: wp(3),
    paddingVertical: hp(1),
    flex: 0.92,
    minWidth: 0,
    minHeight: hp(6),
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: wp(2.1),
    elevation: 6,
  },
  
  modernViewButtonText: {
    color: '#FFFFFF',
    fontSize: Math.min(hp(1.65), wp(3.8)),
    fontWeight: '700',
    letterSpacing: 0,
    marginRight: wp(1),
    flexShrink: 1,
  },
  
  // Modern Finished Day Styles
  modernFinishedItem: {
    margin: wp(2.1),
    marginHorizontal: wp(3),
    backgroundColor: colors.cardBackground,
    borderRadius: wp(5.3),
    paddingHorizontal: wp(4.2),
    paddingVertical: hp(2),
    marginBottom: wp(4.3),
    shadowColor: colors.success,
    shadowOffset: { width: 0, height: hp(0.75) },
    shadowOpacity: 0.16,
    shadowRadius: wp(2.7),
    elevation: 8,
    borderLeftWidth: Math.min(wp(1.35), hp(0.75)),
    borderLeftColor: colors.success,
    borderWidth: Math.min(wp(0.28), hp(0.16)),
    borderColor: '#000000',
  },
  
  modernFinishedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: hp(1.7),
    gap: wp(2.2),
    minWidth: 0,
    minHeight: hp(11.2),
  },

  modernFinishedLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 0,
    maxWidth: '64%',
  },
  
  modernSuccessIcon: {
    width: Math.min(hp(6), wp(13.3)),
    height: Math.min(hp(6), wp(13.3)),
    borderRadius: Math.min(hp(3), wp(6.65)),
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: wp(2.8),
    backgroundColor: colors.success,
    shadowColor: colors.success,
    shadowOffset: { width: 0, height: hp(0.5) },
    shadowOpacity: 0.28,
    shadowRadius: wp(1.5),
    elevation: 5,
    flexShrink: 0,
  },
  
  modernFinishedInfo: {
    flex: 1,
    minWidth: 0,
  },

  modernFinishedTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(1.6),
    marginBottom: hp(0.65),
  },
  
  modernFinishedDayNumber: {
    fontSize: Math.min(hp(2.45), wp(5.6)),
    fontWeight: '900',
    color: colors.success,
    backgroundColor: colors.primarySoft,
    borderRadius: wp(2.2),
    paddingHorizontal: wp(2.7),
    paddingVertical: hp(0.55),
    textAlign: 'center',
    minWidth: Math.min(wp(13.5), hp(7)),
    overflow: 'hidden',
    shadowColor: colors.success,
    shadowOffset: { width: 0, height: hp(0.25) },
    shadowOpacity: 0.15,
    shadowRadius: wp(1.1),
    elevation: 2,
  },

  modernFinishedDayText: {
    fontSize: Math.min(hp(2.65), wp(6)),
    fontWeight: '900',
    color: colors.textPrimary,
    marginBottom: hp(0.65),
    letterSpacing: 0,
    lineHeight: Math.min(hp(3), wp(6.75)),
    includeFontPadding: false,
  },

  modernFinishedDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(1),
    minWidth: 0,
  },
  
  modernFinishedDateText: {
    fontSize: Math.min(hp(1.65), wp(3.9)),
    color: colors.textSecondary,
    fontWeight: '500',
    letterSpacing: 0,
  },
  
  modernFinishedProgress: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: hp(0.85),
    paddingHorizontal: wp(2.5),
    backgroundColor: colors.primarySoft,
    borderRadius: wp(3),
    borderWidth: Math.min(wp(0.28), hp(0.16)),
    borderColor: `${colors.success}22`,
    minWidth: wp(27),
    maxWidth: wp(38),
    flexShrink: 1,
  },

  modernFinishedProgressIcon: {
    width: Math.min(hp(3), wp(6.6)),
    height: Math.min(hp(3), wp(6.6)),
    borderRadius: Math.min(hp(1.5), wp(3.3)),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${colors.success}16`,
    marginBottom: hp(0.45),
  },
  
  modernFinishedPercentage: {
    width: '100%',
    textAlign: 'center',
    fontSize: Math.min(hp(3.05), wp(7.5)),
    fontWeight: '800',
    color: colors.success,
    marginBottom: hp(0.35),
    letterSpacing: 0,
    includeFontPadding: false,
  },
  
  modernFinishedLabel: {
    width: '100%',
    textAlign: 'center',
    fontSize: Math.min(hp(1.25), wp(2.9)),
    color: colors.success,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    includeFontPadding: false,
  },
  
  modernFinishedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.success,
    borderRadius: wp(3.2),
    paddingHorizontal: wp(5.3),
    paddingVertical: hp(1.25),
    shadowColor: colors.success,
    shadowOffset: { width: 0, height: hp(0.5) },
    shadowOpacity: 0.3,
    shadowRadius: wp(1.6),
    elevation: 5,
    marginTop: hp(0.8),
    minHeight: hp(5.7),
    gap: wp(1),
  },
  
  modernFinishedButtonText: {
    color: colors.buttonText,
    fontSize: Math.min(hp(1.65), wp(3.9)),
    fontWeight: '700',
    letterSpacing: 0,
    flexShrink: 1,
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
