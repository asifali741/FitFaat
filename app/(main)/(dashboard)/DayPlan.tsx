import AsyncStorage, { useAsyncStorage } from '@react-native-async-storage/async-storage';
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, View } from "react-native";
import { Days } from "./Day";
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
  duration: 60, // in secs
  status: "active"
}
//Check local storage
const checkLocalStorage = async () =>
{
    const {getItem} = useAsyncStorage('JsonResponse')
    const json = await getItem() as {data: jsonResponse, timestamp: Date} | null
    console.log("Local Storage Data: ", json)
    return (json) //null if no local saved data
}

//Main Component
export default function DayPlan () {
  const router = useRouter();
  const [JsonResponse, setJsonResponse] = useState<null|jsonResponse>(null); 
  //Get Data from API or Local Storage
  useEffect( () => { 
    console.log("Fetching Day Data...");  //JsonResponse recieved here
    const data = checkLocalStorage() 
    data===null? loadJson(data) : callApi()
  },[]);

  const loadJson = async ({data, timestamp} : {data:jsonResponse, timestamp: Date}) =>{
    var entry : keyof jsonResponse
    for (const key in data)
    {
      entry = key as keyof jsonResponse
      if(data[entry].status === 'active')
      {
        const timeElapsed = (Date.now() - new Date(timestamp).getTime()) / 1000;
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
    }
    /*
    const active = Object.values(data).find(day => day.status === "active")
    if(active?.duration)
    {
      //current time - time when local data was saved
      var timeElapsed = (Date.now() - (new Date(timestamp).getTime()))/1000
      const check = timeElapsed < active.duration
      if(check)
      {
        const updatedData = {
        ...data,
        [Object.keys(data).find(k => data[k as keyof jsonResponse]?.status === "active")!]: {
          ...active,
          duration: active.duration - timeElapsed,
        },
      };

        setJsonResponse(data)
      }
      else
      {
        await callApi()
      }
      //check? setJsonResponse(data) : await callApi()
    }
    */
  }
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
      console.log("Saving to Local Storage: ", jsonValue)
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
    console.log(`Navigating to details of Day ${selectedDay.achievedCalories}`);
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
    return <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
  }
  const daysArray : Day[] = Object.values(JsonResponse); // [day01, day02, ...]
  return (
    <ScrollView style={styles.list}
                showsVerticalScrollIndicator={false} 
                showsHorizontalScrollIndicator={false} 
                >
        {
  //calling 7 <Day> components with jsonResponse useState data
          daysArray.map((dayData, index) => (
              <Days props={dayData} onDayPress={navigateToDayDetails}/>)
              )
        }
    </ScrollView>
  );

};

const styles = StyleSheet.create({
  list: {
    height: "90%",
    width: "95%",
    //borderWidth: 2,
    marginLeft: "2.5%",
    marginTop: "5%",
    marginBottom: "3%",
    borderRadius: 12,
    borderColor: "transparent",
    //overflow: 'hidden',
    //borderColor: "#b69a9aff",
    backgroundColor: "#EDCCC2", //ui_elements screenColor
    position: "relative",
    elevation: 2,
    shadowColor: '#edccc20c',
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
});


