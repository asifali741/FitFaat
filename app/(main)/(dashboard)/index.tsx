import AppHeader from "@/components/AppHeader";
import NewsModalPopup from "@/components/NewsModalPopup";
import PatientDietPlanViewer from "@/components/PatientDietPlanViewer";
import StreakDisplay from "@/components/StreakDisplay";
import { useNews } from "@/contexts/NewsContext";
import { useNotifications } from "@/contexts/NotificationContext";
import { useTheme } from "@/contexts/ThemeContext";
import useStreak from "@/hooks/useStreak";
import {
  applyAdaptiveGoalsToJsonResponse,
  loadAdaptiveGoalCarryForward,
  saveAdaptiveGoalCarryForward,
} from "@/utils/adaptiveGoals";
import { dailyLogsApi } from "@/utils/dailyLogsApi";
import { tokenStorage } from "@/utils/auth/tokenStorage";
import { scheduleAdaptiveNutritionNotifications, type NutritionGoalSummary } from "@/utils/nutritionProfile";
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from "react-native-responsive-screen";
import { SafeAreaView } from "react-native-safe-area-context";
import { Days } from "./_Day";
import { Day, jsonResponse } from "./types";

// Convert WeeklyTracking data to jsonResponse format
const convertToJsonResponse = (weeklyTracking: any): jsonResponse => {
  const data: any = {};
  
  console.log('📊 [convertToJsonResponse] Converting weekly tracking data...');
  console.log('📊 [convertToJsonResponse] Number of daily logs:', weeklyTracking.dailyLogs?.length);
  
  weeklyTracking.dailyLogs.forEach((dailyLog: any) => {
    const dayKey = `day0${dailyLog.dayNumber}` as keyof jsonResponse;
    console.log(`📊 [convertToJsonResponse] Day ${dailyLog.dayNumber}: _id = ${dailyLog._id}, date = ${dailyLog.date}`);
    data[dayKey] = {
      _id: dailyLog._id, // Include MongoDB daily log ID
      dayNo: dailyLog.dayNumber,
      date: dailyLog.date,
      achievedCalories: dailyLog.achievedCalories,
      achieviedHydration: dailyLog.achievedHydration,
      baseTargetCalories: dailyLog.baseTargetCalories || dailyLog.defaultTargetCalories || dailyLog.targetCalories,
      baseTargetHydration: dailyLog.baseTargetHydration || dailyLog.defaultTargetHydration || dailyLog.targetHydration,
      targetCalories: dailyLog.targetCalories,
      targetHydration: dailyLog.targetHydration,
      remarks: dailyLog.remarks || null,
      duration: 0,
      status: dailyLog.status as "locked" | "active" | "finished",
    };
  });
  
  return data as jsonResponse;
};
//Check local storage
const checkLocalStorage = async () => {
  try {
    const jsonValue = await AsyncStorage.getItem('JsonResponse');
    if (!jsonValue) {
      console.log('jsonvalue ')
      return null;
    }
    const parsed = JSON.parse(jsonValue) as { data: jsonResponse; timestamp: Date };
    console.log('jsonvalue not null ')
    console.log("Local Storage Data Found: ");
    return parsed;
  } catch (e) {
    console.log("Error reading local storage", e);
    return null;
  }
};

const parseDashboardDate = (date?: string) => {
  if (!date) return null;
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const startOfLocalDay = (date: Date) => {
  const nextDate = new Date(date);
  nextDate.setHours(0, 0, 0, 0);
  return nextDate;
};

const getHydrationValue = (day: Day) =>
  Number(day.achieviedHydration ?? (day as any).achievedHydration ?? 0);

const hasDayProgress = (day: Day) =>
  Number(day.achievedCalories || 0) > 0 || getHydrationValue(day) > 0;

const isStreakProgressDay = (day: Day) =>
  day.status === 'finished' || (day.status === 'active' && hasDayProgress(day));

const sortByDayDate = (a: Day, b: Day) => {
  const aDate = parseDashboardDate(a.date);
  const bDate = parseDashboardDate(b.date);
  if (aDate && bDate) return aDate.getTime() - bDate.getTime();
  return a.dayNo - b.dayNo;
};

/**
 * Compute streak data dynamically from the local day data.
 * Counts from the latest unlocked day so future locked days do not reset progress.
 */
const computeStreakFromDays = (data: jsonResponse) => {
  const allDaysSorted = Object.values(data).sort(sortByDayDate);
  const unlockedDaysSorted = allDaysSorted.filter((day) => day.status !== 'locked');
  
  let currentStreak = 0;
  for (let i = unlockedDaysSorted.length - 1; i >= 0; i--) {
    const day = unlockedDaysSorted[i];
    if (isStreakProgressDay(day)) {
      currentStreak++;
    } else {
      break;
    }
  }

  let longestStreak = 0;
  let tempStreak = 0;
  for (const day of allDaysSorted) {
    if (isStreakProgressDay(day)) {
      tempStreak++;
      longestStreak = Math.max(longestStreak, tempStreak);
    } else {
      tempStreak = 0;
    }
  }

  longestStreak = Math.max(longestStreak, currentStreak);

  const weeklyGoal = 7;
  const streakPercentage = Math.round((currentStreak / weeklyGoal) * 100);

  // Generate message
  let message = '';
  if (currentStreak === 0) {
    message = 'Start logging to build your streak! 💪';
  } else if (currentStreak === 1) {
    message = "You're on a 1 day streak! 🔥";
  } else if (currentStreak < weeklyGoal) {
    message = `You're on a ${currentStreak} day streak! 🔥`;
  } else {
    message = 'Weekly goal achieved! Amazing! 🏆';
  }

  return {
    streakCount: currentStreak,
    longestStreak,
    message,
    streakPercentage,
    weeklyGoalDays: weeklyGoal,
    shouldSendReminder: currentStreak === 0,
  };
};

const toGoalSummary = (day: Day): NutritionGoalSummary => ({
  dayLogId: day._id,
  dayNo: day.dayNo,
  date: day.date,
  achievedCalories: day.achievedCalories,
  targetCalories: day.targetCalories,
  achievedHydration: day.achieviedHydration,
  targetHydration: day.targetHydration,
});

const getAdaptiveNutritionSummary = (data: jsonResponse): NutritionGoalSummary | null => {
  const today = startOfLocalDay(new Date());
  const days = Object.values(data)
    .filter((day) => day.status !== 'locked' && Number(day.targetCalories) > 0)
    .sort((a, b) => {
      const aDate = parseDashboardDate(a.date);
      const bDate = parseDashboardDate(b.date);
      const aTime = aDate ? startOfLocalDay(aDate).getTime() : a.dayNo;
      const bTime = bDate ? startOfLocalDay(bDate).getTime() : b.dayNo;
      return bTime - aTime;
    });

  const currentOverTargetDay = days.find((day) => {
    const dayDate = parseDashboardDate(day.date);
    const isToday = dayDate
      ? startOfLocalDay(dayDate).getTime() === today.getTime()
      : day.status === 'active';

    return isToday && Number(day.achievedCalories) > Number(day.targetCalories) * 1.05;
  });

  if (currentOverTargetDay) {
    return toGoalSummary(currentOverTargetDay);
  }

  const latestPastDay = days.find((day) => {
    const dayDate = parseDashboardDate(day.date);
    return dayDate ? startOfLocalDay(dayDate).getTime() < today.getTime() : false;
  });

  return latestPastDay ? toGoalSummary(latestPastDay) : null;
};


//Main Component
export default function DayPlan () {
  const router = useRouter();
  const { colors } = useTheme();
  const { news, unreadCount, markNewsAsRead } = useNews();
  const { scheduleFitFaatNotification, cancelScheduledNotification } = useNotifications();
  const [JsonResponse, setJsonResponse] = useState<null|jsonResponse>(null);
  const [showNewsModal, setShowNewsModal] = useState(false);
  const [showDietPlanViewer, setShowDietPlanViewer] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const hasCheckedForNewCycle = useRef(false);
  const adaptiveNutritionSignature = useRef<string | null>(null);
  const hasCompletedInitialLoad = useRef(false);

  const saveAdaptiveGoalCarryForwardFromCurrentData = async (
    ownerUserId?: string | null,
    weeklyTrackingId?: string | null
  ) => {
    const latestUser = ownerUserId ? null : await tokenStorage.getUser();
    const latestWeeklyTrackingId = weeklyTrackingId ?? await AsyncStorage.getItem('weeklyTrackingId');
    const currentData = JsonResponse || (await checkLocalStorage())?.data;

    await saveAdaptiveGoalCarryForward(currentData, {
      userId: ownerUserId || latestUser?.id,
      weeklyTrackingId: latestWeeklyTrackingId,
    });
  };
  
  // Fetch streak data from API (used as fallback/enrichment)
  const { streak: apiStreak, loading: streakLoading, refetchStreak } = useStreak(userId);

  // Compute streak dynamically from local day data
  const computedStreak = JsonResponse ? computeStreakFromDays(JsonResponse) : null;

  // Use locally computed streak (always accurate) — falls back to API data if no local data
  const streak = computedStreak || apiStreak;

  //Get Data from API or Local Storage
  useEffect( () => { 
    const fetchData = async () => {
    console.log("Fetching Day Data...");  //JsonResponse recieved here
    
    // Get user info first to set userId for streak
    const user = await tokenStorage.getUser();
    if (user && user.id) {
      setUserId(user.id);
    }
    
    // First check if our local weeklyTrackingId matches the user's current one
    const storedWeeklyId = await AsyncStorage.getItem('weeklyTrackingId');
    const userWeeklyId = user?.weeklyTrackingId;
    
    console.log('📋 Stored weeklyTrackingId:', storedWeeklyId);
    console.log('📋 User weeklyTrackingId:', userWeeklyId);
    
    // If weeklyTrackingIds don't match or user doesn't have one, fetch fresh from backend
    if (!storedWeeklyId || !userWeeklyId || storedWeeklyId !== userWeeklyId) {
      console.log('📋 WeeklyTrackingId mismatch or missing - fetching fresh data');
      await saveAdaptiveGoalCarryForwardFromCurrentData(user?.id, storedWeeklyId);
      await AsyncStorage.removeItem('JsonResponse');
      await callApi();
      return;
    }
    
    const stored = await checkLocalStorage();
    if(stored && stored.data)
    {
      await loadJson(stored)
    }
    else{
      await callApi();
    }
  }
  fetchData();
  },[]);

  // Listen for weekly cycle changes
  useEffect(() => {
    const checkForCycleChange = async () => {
      // This effect runs when JsonResponse changes
      // Check if all days are finished, indicating a need to refresh
      if (JsonResponse && !hasCheckedForNewCycle.current) {
        const allDays = Object.values(JsonResponse);
        const allFinished = allDays.every(day => day.status === 'finished');
        
        if (allFinished) {
          console.log('🔄 All days finished, checking for new cycle...');
          hasCheckedForNewCycle.current = true; // Prevent infinite loop
          await saveAdaptiveGoalCarryForwardFromCurrentData();
          // Wait a moment then check/create new cycle
          setTimeout(async () => {
            await checkAndCreateNewCycle();
          }, 1000);
        }
      }
    };
    
    checkForCycleChange();
  }, [JsonResponse]);

  // Refetch streak when JsonResponse changes (meal added)
  useEffect(() => {
    if (JsonResponse && userId) {
      // Refetch streak data when a meal is added
      refetchStreak();
    }
  }, [JsonResponse, userId]);

  useEffect(() => {
    if (!JsonResponse) return;

    const summary = getAdaptiveNutritionSummary(JsonResponse);
    if (!summary) return;

    const signature = JSON.stringify(summary);
    if (adaptiveNutritionSignature.current === signature) return;

    adaptiveNutritionSignature.current = signature;

    scheduleAdaptiveNutritionNotifications({
      summary,
      schedule: scheduleFitFaatNotification,
      cancel: cancelScheduledNotification,
    }).catch((error) => {
      console.error('Error scheduling adaptive nutrition notifications:', error);
      adaptiveNutritionSignature.current = null;
    });
  }, [JsonResponse, scheduleFitFaatNotification, cancelScheduledNotification]);

  // Check and create new cycle if needed
  const checkAndCreateNewCycle = async () => {
    try {
      console.log("Checking if new cycle needed...");
      
      // Get user info
      const user = await tokenStorage.getUser();
      if (!user || !user.id) {
        console.log('No user found');
        return;
      }

      const weeklyTrackingId = await AsyncStorage.getItem('weeklyTrackingId');
      await saveAdaptiveGoalCarryForwardFromCurrentData(user.id, weeklyTrackingId);
      
      // Call the check-cycle endpoint
      const result = await dailyLogsApi.checkAndCreateCycle(
        user.id,
        weeklyTrackingId,
        user.userInfo?.goalCalories,
        user.userInfo?.hydrationGoal
      );

      console.log('Cycle check result:', result.message, 'New cycle created:', result.newCycleCreated);

      // Convert to jsonResponse format
      const carryForward = await loadAdaptiveGoalCarryForward({
        userId: user.id,
        currentWeeklyTrackingId: result.newWeeklyTrackingId || weeklyTrackingId,
      });
      const data = applyAdaptiveGoalsToJsonResponse(
        convertToJsonResponse(result.data),
        undefined,
        carryForward
      );
      
      // Reset the cycle check flag if a new cycle was created
      if (result.newCycleCreated) {
        hasCheckedForNewCycle.current = false;
      }
      
      setJsonResponse(data);

      // Save to local storage
      const store: { data: jsonResponse; timestamp: Date } = {
        data: data,
        timestamp: new Date()
      };

      try {
        const jsonValue = JSON.stringify(store);
        await AsyncStorage.setItem('JsonResponse', jsonValue);
        console.log("Data saved to Local Storage");
      } catch (e) {
        console.log('Error saving to local storage:', e);
      }
    } catch (error) {
      console.error('Error checking/creating cycle:', error);
    }
  };

  const loadJson = async ({data, timestamp} : {data:jsonResponse, timestamp: Date}) =>{
    const user = await tokenStorage.getUser();
    const weeklyTrackingId = await AsyncStorage.getItem('weeklyTrackingId');
    const carryForward = await loadAdaptiveGoalCarryForward({
      userId: user?.id,
      currentWeeklyTrackingId: weeklyTrackingId,
    });
    data = applyAdaptiveGoalsToJsonResponse(data, undefined, carryForward);
    let entry : keyof jsonResponse
    let foundActive = false;
    for (const key in data)
    {
      entry = key as keyof jsonResponse
      if(data[entry].status === 'active')
      {
        foundActive = true;
        //                   current time - timestamp of localStorage    in seconds
        const timeElapsed = (Date.now() - new Date(timestamp).getTime()) / 1000;
        //                activeDay.duration - timepassed since creation
        const timeLeft = data[entry].duration - timeElapsed;
        if(timeLeft>0)
        {
          //yes local stored is valid and i am updating data variable with its remaining time and break
          data[entry].duration = timeLeft;
          setJsonResponse(data)
          await AsyncStorage.setItem('JsonResponse', JSON.stringify({ data, timestamp: new Date() }));
          break;
        }
        else{
          //no local stored data expired, check/create cycle
          await checkAndCreateNewCycle()
          break;
        }
      }
    }
    // If no active day found (all finished), check and create new cycle
    if (!foundActive) {
      console.log('No active day found in local storage, checking for new cycle...');
      await saveAdaptiveGoalCarryForwardFromCurrentData();
      await checkAndCreateNewCycle();
    }
  }
  const callApi = async () => {
    // Delegate to the new checkAndCreateNewCycle function
    await checkAndCreateNewCycle();
  };
  const refreshHandlers = useRef({ loadJson, callApi });
  refreshHandlers.current = { loadJson, callApi };

  useFocusEffect(
    useCallback(() => {
      if (!hasCompletedInitialLoad.current) {
        hasCompletedInitialLoad.current = true;
        return;
      }

      let isActive = true;

      const refreshFromCacheOrApi = async () => {
        const stored = await checkLocalStorage();
        if (!isActive) return;

        if (stored && stored.data) {
          await refreshHandlers.current.loadJson(stored);
        } else {
          await refreshHandlers.current.callApi();
        }
      };

      refreshFromCacheOrApi();

      return () => {
        isActive = false;
      };
    }, [])
  );
  //function called by child component to navigate to detailed day view
  const navigateToDayDetails = (dayNo: number) : void => {
    const key = `day0${dayNo.toString()}` as keyof jsonResponse
    if(JsonResponse=== null)
    {
      return;
    }
    const selectedDay: Day  = JsonResponse[key]
    console.log(`🚀 [navigateToDayDetails] Day ${selectedDay.dayNo}, _id: ${selectedDay._id}, date: ${selectedDay.date}`);
    if (!selectedDay) {
      console.warn(`Day ${dayNo} is locked or missing.`);
      return;
    }
    router.push({
                pathname: "/(main)/(dashboard)/DetailsDay", // pass as string
                params: {selectedDay: JSON.stringify(selectedDay)} // pass as object
              })
  }
  //Mapping JsonResponse to Day Components
  if(!JsonResponse)
  {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.screenColor }]} edges={['top']}>
        <AppHeader 
          title="FitFaat Dashboard"
          showStepIndicator={false}
          showBackButton={false}
          showMenuButton={true}
        />

        {/* Loading Content */}
        <View style={[styles.content, { backgroundColor: colors.screenColor }]}>
          <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        </View>
      </SafeAreaView>
    )
  }
  const daysArray : Day[] = Object.values(JsonResponse); // [day01, day02, ...]
  
  const handleNotificationPress = () => {
    console.log('📢 News bell pressed, opening news popup');
    setShowNewsModal(true);
  };

  const handleCloseNewsModal = () => {
    setShowNewsModal(false);
  };

  const handleNewsRead = async (newsId: string) => {
    await markNewsAsRead(newsId);
  };

  const floatingButtonIconSize = Math.min(hp(2.2), wp(4.8));

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.screenColor }]} edges={['top']}>
      <AppHeader 
        title="FitFaat Dashboard"
        showStepIndicator={false}
        showBackButton={false}
        showNotificationBell={true}
        notificationCount={unreadCount}
        onNotificationPress={handleNotificationPress}
      />

      {/* News Modal Popup */}
      <NewsModalPopup
        visible={showNewsModal}
        onClose={handleCloseNewsModal}
        newsList={news}
        onNewsRead={handleNewsRead}
      />

      {/* Diet Plan Viewer */}
      <PatientDietPlanViewer
        visible={showDietPlanViewer}
        onClose={() => setShowDietPlanViewer(false)}
      />

      {/* Main Content */}
      <View style={[styles.content, { backgroundColor: colors.screenColor }]}>
        <ScrollView 
          style={styles.list}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false} 
          showsHorizontalScrollIndicator={false}
          scrollEventThrottle={16}
        >
          {/* Streak Display Component */}
          {streak && (
            <StreakDisplay
              streakCount={streak.streakCount}
              longestStreak={streak.longestStreak}
              message={streak.message}
              streakPercentage={streak.streakPercentage}
              shouldSendReminder={streak.shouldSendReminder}
              loading={streakLoading}
            />
          )}

          {
            //calling 7 <Day> components with jsonResponse useState data
            daysArray.map((dayData, index) => (
              <Days key={index} props={dayData} onDayPress={navigateToDayDetails}/>
            ))
          }
          <View style={styles.dietButtonClearance} />
        </ScrollView>

        <TouchableOpacity
          style={[styles.floatingButtonLeft, { backgroundColor: colors.secondary, shadowColor: colors.secondary }]}
          onPress={() => router.push('/(main)/(dashboard)/charts')}
          activeOpacity={0.8}
        >
          <Ionicons name="bar-chart" size={floatingButtonIconSize} color={colors.textOnPrimary} />
          <Text
            style={[styles.floatingButtonText, { color: colors.textOnPrimary }]}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            VIEW CHARTS
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.floatingButton, { backgroundColor: colors.primary, shadowColor: colors.primary }]}
          onPress={() => setShowDietPlanViewer(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="fast-food" size={floatingButtonIconSize} color={colors.textOnPrimary} />
          <Text
            style={[styles.floatingButtonText, { color: colors.textOnPrimary }]}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            VIEW DIET
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );

};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  list: {
    flex: 1,
    width: "100%",
  },
  listContent: {
    paddingBottom: hp(15),
    paddingTop: hp(1.5),
  },
  dietButtonClearance: {
    height: hp(5),
  },
  floatingButton: {
    position: 'absolute',
    bottom: hp(15),
    right: wp(4),
    maxWidth: wp(42),
    minHeight: hp(4.8),
    paddingHorizontal: wp(3.5),
    paddingVertical: hp(1.2),
    borderRadius: hp(4),
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 12,
    shadowOffset: {
      width: 0,
      height: hp(0.75),
    },
    shadowOpacity: 0.4,
    shadowRadius: wp(2.1),
    borderWidth: wp(0.4),
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  floatingButtonText: {
    fontSize: hp(1.5),
    fontWeight: '900',
    marginLeft: wp(1.6),
    letterSpacing: wp(0.15),
    flexShrink: 1,
  },
  floatingButtonLeft: {
    position: 'absolute',
    bottom: hp(15),
    left: wp(4),
    maxWidth: wp(44),
    minHeight: hp(4.8),
    paddingHorizontal: wp(3.5),
    paddingVertical: hp(1.2),
    borderRadius: hp(4),
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 12,
    shadowOffset: {
      width: 0,
      height: hp(0.75),
    },
    shadowOpacity: 0.4,
    shadowRadius: wp(2.1),
    borderWidth: wp(0.4),
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
});


