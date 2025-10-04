import { Dimensions } from "react-native";
const { width } =  Dimensions.get('window');
const BASE_WIDTH = 375; //iphone 12
const S = width / BASE_WIDTH; // scale factor
export const rf = (n: number, min = 10, max = 48) => Math.round(Math.min(Math.max(n * S, min), max));
export const rs = (n: number) => Math.round(n * S); // responsive size (pixels)
export const colorsSheet = {
    background: "#2c2c2cff",
    screenColor: "#e4d0d0ff",
    logoutBtnColor: "#e63946",
    logoutBtnTextColor: "#fff",
    activeDayShadowColor: "#7c1515ff",
    progressBarColor: "#00FF44",
    drawerActiveTabColor: "#33b3a6",
    drawerTintColor: "#FFFFFF",
  };
export const DashFonts = {
    dayText:  rf(18, 10, 26),
    dateText: rf(15, 10, 20),
    activeDateText: rf(15, 10, 20),
    subtitle: rf(14, 10, 18),
  }
export const DrawerFonts = {
  body: rf(16, 11, 22),
  drawerEmail: rf(11, 9, 16),
  };


// Export the raw scale value in case you need to compute other sizes
//export const SCALE = S;












/**
import { Dimensions } from "react-native";

const { width } = Dimensions.get("window");
const guidelineBaseWidth = 375; // iPhone 11/12 width
const scale = (size: number) => (width / guidelineBaseWidth) * size;

export const DrawerFonts = {
  body: scale(16),
  drawerEmail: scale(11),
};
export const DashFonts = {
  dayText: scale(20),
  activeDayText: scale(10),
  dateText: scale(15),
  activeDateText: scale(15),
  subtitle: scale(14),
}
export const colorsSheet ={
  background: '#2c2c2cff',
  screenColor:'#e4d0d0ff',
  logoutBtnColor:'#e63946',
  logoutBtnTextColor:'#fff',
  activeDayShadowColor:'#7c1515ff',
  progressBarColor: '#00FF44',
  drawerActiveTabColor: '#33b3a6',
  drawerTintColor: '#FFFFFF',

}

 * 
 * background: '#fa9579ff',
  screenColor:'#EDCCC2',
  logoutBtnColor:'#e63946',
  logoutBtnTextColor:'#fff',
  activeDayShadowColor:'#7c1515ff',
  progressBarColor: '#00FF44',
  drawerActiveTabColor: '#33b3a6',
  drawerTintColor: '#FFFFFF',
 */