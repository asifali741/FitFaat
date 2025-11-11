import AppHeader from "@/components/AppHeader";
import NewsModalPopup from "@/components/NewsModalPopup";
import { useNews } from "@/contexts/NewsContext";
import { useTheme } from "@/contexts/ThemeContext";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from "react-native-responsive-screen";
import { SafeAreaView } from "react-native-safe-area-context";
import { Days } from "./_Day";
export type Day = {
  dayNo: number,
  date: string,
  achievedCalories : number,
  achieviedHydration: number,
  targetCalories: number,
  targetHydration: number,
  remarks: string | null, 
  duration: number, // in seconds, sync with API //determines when to refresh data 
  status?: "locked" | "active" | "finished" // using to detemine if finished or active or locked
}
type jsonResponse = {
  /**
   * Each day0x can either contain null || Day Object
   *              null = locked day
   * Day Object with duration and remarks = active day
   * Day Object with duration null = finished day
   */
  /**
   * when recieved from API, saves locally and uses that local data to render the days everytime
   * 
   * when recieved active day->duration, start a timer to decrease duration every second
   * when duration = 0, refetch data from API to get new jsonResponse
   * only other way response can change is when user manually updates the day (adds food/water)
   */


  day01: Day,
  day02: Day,
  day03: Day,
  day04: Day,
  day05: Day,
  day06: Day,
  day07: Day
  
  /**
   *OPTIMIIZED LOGIC FOR REFRESH 
   * when recieved active day->duration, calculate which time duration will expire
   * i.e timestamp = current time + duration(in --:--:-- format)
   *          when timestamp reached, refetch data from API to get new jsonResponse
  */
}
//for testing remove when API is connected
const FinishedDay : Day = {
  dayNo: 1,
  date: "25-08-2025",
  achievedCalories : 1400,
  achieviedHydration: 1600,
  targetCalories: 1400,
  targetHydration: 1400,
  remarks: "", //Blank
  duration: 0, // in minutes
  status: "finished"
}
//for testing remove when API is connected
const ActiveDay : Day = {
  dayNo: 2,
  date: "26-08-2025",
  achievedCalories : 2000,
  achieviedHydration: 800,
  targetCalories: 2330,
  targetHydration: 1400,
  remarks: "Almost there, Dinner is in 2h!",
  duration: 1900, // in secs
  status: "active"
}
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

  //Get Data from API or Local Storage
  useEffect( () => { 
    const fetchData =async () => {
    console.log("Fetching Day Data...");  //JsonResponse recieved here
    const stored  = await checkLocalStorage()
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

  const loadJson = async ({data, timestamp} : {data:jsonResponse, timestamp: Date}) =>{
    var entry : keyof jsonResponse
    for (const key in data)
    {
      entry = key as keyof jsonResponse
      if(data[entry].status === 'active')
      {
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
          //no local stored data expired, call api and break
          await callApi()
          break;
        }
      }
    }}
  const callApi = async () =>{
    //save data from api into local and state variable 
    var data = {
      day01: FinishedDay,
      day02: ActiveDay,
      day03: { dayNo: 3, date: '2025-08-26', achievedCalories : 0, achieviedHydration: 0, targetCalories: 0, targetHydration: 0, remarks: '', duration: 0, status: "locked"} as Day, 
      day04: { dayNo: 4, date: "2025-08-27", duration: 0, achievedCalories: 0, achieviedHydration: 0, targetCalories: 0, targetHydration: 3, remarks: "" , status: "locked"} as Day, 
      day05: { dayNo: 5, date: "2025-08-28", duration: 0, achievedCalories: 0, achieviedHydration: 0, targetCalories: 0, targetHydration: 3, remarks: "" , status: "locked"} as Day, 
      day06: { dayNo: 6, date: "2025-08-29", duration: 0, achievedCalories: 0, achieviedHydration: 0, targetCalories: 0, targetHydration: 3, remarks: "" , status: "locked"} as Day, 
      day07: { dayNo: 7, date: "2025-08-30", duration: 0, achievedCalories: 0, achieviedHydration: 0, targetCalories: 0, targetHydration: 3, remarks: "" , status: "locked"} as Day, 
      }
    setJsonResponse(data)
    //Replace Local Data with renewed api data
    const store:  {data:jsonResponse, timestamp: Date} =
    {
      data: data,
      timestamp: new Date()
    }
    try {
      const jsonValue = JSON.stringify(store);
      console.log("Data from Api saved to Local Storage: ")
      await AsyncStorage.setItem('JsonResponse', jsonValue);
    } catch (e) {
      console.log('saving error')
    }

  }
  //function called by child component to navigate to detailed day view
  const navigateToDayDetails = (dayNo: number) : void => {
    const key = `day0${dayNo.toString()}` as keyof jsonResponse
    if(JsonResponse=== null)
    {
      return;
    }
    const selectedDay: Day  = JsonResponse[key]
    console.log(`Navigating to details of Day ${selectedDay.dayNo}`);
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
      <SafeAreaView style={[styles.container, { backgroundColor: colors.primary }]}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <View style={styles.spacer} />
          <Text style={[styles.headerTitle, { color: colors.textOnPrimary }]}>FitFaat Dashboard</Text>
          <View style={styles.spacer} />
        </View>

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
    <SafeAreaView style={[styles.container, { backgroundColor: colors.primary }]}>
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

      {/* Main Content */}
      <View style={[styles.content, { backgroundColor: colors.screenColor }]}>
        <ScrollView style={styles.list}
                    contentContainerStyle={{ paddingBottom: 50 }}
                    showsVerticalScrollIndicator={false} 
                    showsHorizontalScrollIndicator={false} 
                    >
            {
      //calling 7 <Day> components with jsonResponse useState data
              daysArray.map((dayData, index) => (
                  <Days key={index} props={dayData} onDayPress={navigateToDayDetails}/>)
                  )
            }
        </ScrollView>
      </View>
    </SafeAreaView>
  );

};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Math.min(wp(5), 20),
    paddingVertical: Math.min(hp(1.8), 15),
    minHeight: hp(7),
  },
  headerTitle: {
    fontSize: Math.min(hp(2.5), wp(6.2)),
    fontWeight: "bold",
    textAlign: "center",
    flex: 1,
    marginHorizontal: wp(2),
  },
  content: {
    flex: 1,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
  },
  spacer: {
    width: wp(18),
  },
  list: {
    flexGrow: 1,
    width: "100%",
    alignSelf: "center",
    marginTop: "2%",
    marginBottom: "3%",
    borderRadius: 0,
    backgroundColor: "transparent",
    elevation: 0,
    shadowOpacity: 0,
  },
});


