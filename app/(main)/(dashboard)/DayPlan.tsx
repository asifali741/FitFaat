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
  remarks: string | null, //Blank if finished day
  duration: number, // in minutes
  status?: "locked" | "active" | "finished" // using to detemine if finished or active
}
type jsonResponse = {
  /**
   * Each day0x can either contain null || Day Object
   *              null = locked day
   * Day Object with duration and remarks = active day
   * Day Object with duration null = finished day
   */
  day01: Day,
  day02: Day,
  day03: Day,
  day04: Day,
  day05: Day,
  day06: Day,
  day07: Day
}

//function called by child component to navigate to detailed day view
const navigateToDayDetails = (dayNo: number) : void => {
  console.log(`Navigating to details of Day ${dayNo}`);
}


const FinishedDay : Day = {
  //for testing remove when API is connected
  dayNo: 1,
  date: "25-08-2025",
  achievedCalories : 2330,
  achieviedHydration: 1600,
  targetCalories: 1400,
  targetHydration: 1400,
  remarks: "", //Blank
  duration: 0, // in minutes
  status: "finished"
}
const ActiveDay : Day = {
  //for testing remove when API is connected
  dayNo: 2,
  date: "26-08-2025",
  achievedCalories : 1400,
  achieviedHydration: 1600,
  targetCalories: 2330,
  targetHydration: 1400,
  remarks: "Almost there, Dinner is in 2h!", //Blank
  duration: 130, // in minutes
  status: "active"
}
export const DayPlan = () => {
  const [JsonResponse, setJsonResponse] = useState<null|jsonResponse>(null); 
  //Get Data from API
  useEffect(() => { 
    console.log("Fetching Day Data...");  //JsonResponse recieved here
    setJsonResponse(
      {
        day01 : FinishedDay,
        day02 : ActiveDay,
        day03: { dayNo: 3, date: "2025-08-26", duration: 0, achievedCalories: 0, achieviedHydration: 0, targetCalories: 0, targetHydration: 3, remarks: "", status: "locked" },
        day04: { dayNo: 4, date: "2025-08-27", duration: 0, achievedCalories: 0, achieviedHydration: 0, targetCalories: 0, targetHydration: 3, remarks: "" , status: "locked"},
        day05: { dayNo: 5, date: "2025-08-28", duration: 0, achievedCalories: 0, achieviedHydration: 0, targetCalories: 0, targetHydration: 3, remarks: "" , status: "locked"},
        day06: { dayNo: 6, date: "2025-08-29", duration: 0, achievedCalories: 0, achieviedHydration: 0, targetCalories: 0, targetHydration: 3, remarks: "" , status: "locked"},
        day07: { dayNo: 7, date: "2025-08-30", duration: 0, achievedCalories: 0, achieviedHydration: 0, targetCalories: 0, targetHydration: 3, remarks: "" , status: "locked"},
      }
    )
  },[]);
  //Mapping JsonResponse to Day Components
  if(!JsonResponse)
  {
    return <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
  }
  const daysArray : Day[] = Object.values(JsonResponse); // [day01, day02, ...]

  return (
    <ScrollView showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false} style={styles.list}>
      {daysArray.map((dayData, index) => (
          <Days props={dayData} onDayPress={navigateToDayDetails}/>
      ))}
    </ScrollView>
  );

};

const styles = StyleSheet.create({
  list: {
    height: "78.7%",
    width: "90%",
    borderWidth: 2,
    margin: "5%",
    marginTop: "10%",
    borderRadius: 12,
    borderColor: "#b69a9aff",
    backgroundColor: "#EDCCC2",
    
  },
});


