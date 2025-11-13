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

export type jsonResponse = {
  day01: Day,
  day02: Day,
  day03: Day,
  day04: Day,
  day05: Day,
  day06: Day,
  day07: Day
}
