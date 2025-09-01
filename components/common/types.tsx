type data = {
  dayNo: number;
    date: string;
    achievedCalories: number;
    achieviedHydration: number;
    targetCalories: number;
    targetHydration: number;
    remarks: string;
    duration: number | null// using to detemine if finished or active
}

type Day = {
  dayNo: number,
  date: string,
  achievedCalories : number,
  achieviedHydration: number,
  targetCalories: number,
  targetHydration: number,
  remarks: string | null, //Blank if finished day
  duration: number | null, // in minutes
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
}
type jsonResponse = {
  /**
   * Each day0x can either contain null || Day Object
   *              null = locked day
   * Day Object with duration and remarks = active day
   * Day Object with duration null = finished day
   */
  day01: null | Day,
  day02: null | Day,
  day03: null | Day,
  day04: null | Day,
  day05: null | Day,
  day06: null | Day,
  day07: null | Day
}