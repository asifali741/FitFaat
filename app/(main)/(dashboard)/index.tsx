import AppHeader from "@/components/AppHeader";
import NewsModalPopup from "@/components/NewsModalPopup";
import PatientDietPlanViewer from "@/components/PatientDietPlanViewer";
import StreakDisplay from "@/components/StreakDisplay";
import { useNews } from "@/contexts/NewsContext";
import { useTheme } from "@/contexts/ThemeContext";
import useStreak from "@/hooks/useStreak";
import { dailyLogsApi } from "@/utils/dailyLogsApi";
import { tokenStorage } from "@/utils/auth/tokenStorage";
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
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


//Main Component
export default function DayPlan () {
  const router = useRouter();
  const { colors } = useTheme();
  const { news, unreadCount, markNewsAsRead } = useNews();
  const [JsonResponse, setJsonResponse] = useState<null|jsonResponse>(null);
  const [showNewsModal, setShowNewsModal] = useState(false);
  const [showDietPlanViewer, setShowDietPlanViewer] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const hasCheckedForNewCycle = useRef(false);
  
  // Fetch streak data
  const { streak, loading: streakLoading, refetchStreak } = useStreak(userId);

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
      
      // Call the check-cycle endpoint
      const result = await dailyLogsApi.checkAndCreateCycle(
        user.id,
        weeklyTrackingId,
        user.userInfo?.goalCalories,
        user.userInfo?.hydrationGoal
      );

      console.log('Cycle check result:', result.message, 'New cycle created:', result.newCycleCreated);

      // Convert to jsonResponse format
      const data = convertToJsonResponse(result.data);
      
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
    var entry : keyof jsonResponse
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
      await checkAndCreateNewCycle();
    }
  }
  const callApi = async () => {
    // Delegate to the new checkAndCreateNewCycle function
    await checkAndCreateNewCycle();
  };
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
          contentContainerStyle={{ paddingBottom: 120, paddingTop: 12 }}
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
        </ScrollView>

        {/* Floating Diet Plan Button */}
        <TouchableOpacity
          style={[styles.floatingButton, { backgroundColor: colors.primary }]}
          onPress={() => setShowDietPlanViewer(true)}
          activeOpacity={0.7}
        >
          <Ionicons name="nutrition" size={24} color={colors.white} />
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
  floatingButton: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
  },
});


