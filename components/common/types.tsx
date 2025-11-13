// This file is deprecated. Use app/(main)/(dashboard)/types.ts instead
export type Day = {
  dayNo: number,
  date: string,
  achievedCalories : number,
  achieviedHydration: number,
  targetCalories: number,
  targetHydration: number,
  remarks: string | null, //Blank if finished day
  duration: number | null, // in minutes
}

export type jsonResponse = {
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