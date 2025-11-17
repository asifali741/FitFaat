import { Dimensions } from "react-native";
const { width } =  Dimensions.get('window');
const BASE_WIDTH = 375; //iphone 12
const S = width / BASE_WIDTH; // scale factor
export const rf = (n: number, min = 10, max = 48) => Math.round(Math.min(Math.max(n * S, min), max));
export const rs = (n: number) => Math.round(n * S); // responsive size (pixels)
export const colorsSheet = {
    // Primary Green Theme
    primary: "#26867C",           // Main FitFaat green
    primaryLight: "#4CAF50",      // Light green for success
    primaryDark: "#1B5E20",       // Dark green for emphasis
    primarySoft: "#E8F5E8",       // Very light green background
    
    // Secondary Colors
    secondary: "#2E7D32",         // Secondary green
    accent: "#66BB6A",            // Accent green
    success: "#4CAF50",           // Success green
    warning: "#FF9800",           // Warning orange
    error: "#F44336",             // Error red
    info: "#2196F3",              // Info blue
    
    // Neutrals
    white: "#FFFFFF",             // Pure white
    offWhite: "#FAFAFA",          // Off white
    lightGray: "#F5F5F5",         // Light gray
    gray: "#E0E0E0",              // Gray
    darkGray: "#9E9E9E",          // Dark gray
    charcoal: "#424242",          // Charcoal
    black: "#000000",             // Black
    
    // App Specific Colors
    background: "#26867C",        // Main background (green)
    screenColor: "#FFFFFF",       // Screen background (white)
    cardBackground: "#FFFFFF",    // Card background
    cardBorder: "#E8F5E8",        // Card border
    
    // Text Colors
    textPrimary: "#2C3E50",       // Primary text
    textSecondary: "#7F8C8D",     // Secondary text
    textLight: "#BDC3C7",         // Light text
    textOnPrimary: "#FFFFFF",     // Text on green background
    textOnCard: "#2C3E50",        // Text on white cards
    
    // Button Colors
    buttonPrimary: "#26867C",     // Primary button
    buttonSecondary: "#4CAF50",   // Secondary button
    buttonSuccess: "#2E7D32",     // Success button
    buttonDanger: "#F44336",      // Danger button
    buttonText: "#FFFFFF",        // Button text
    
    // Drawer Colors
    drawerBackground: "#26867C",  // Drawer background
    drawerActiveTabColor: "#4CAF50", // Active tab
    drawerTintColor: "#FFFFFF",   // Drawer text
    
    // Status Colors
    activeStatus: "#4CAF50",      // Active day status
    finishedStatus: "#2E7D32",    // Finished day status
    lockedStatus: "#9E9E9E",      // Locked day status
    
    // Progress Colors
    progressBarColor: "#4CAF50",  // Progress bar
    progressBackground: "#E8F5E8", // Progress background
    
    // Shadow Colors
    shadowLight: "#E8F5E8",       // Light shadow
    shadowMedium: "#26867C",      // Medium shadow
    shadowDark: "#1B5E20",        // Dark shadow
    
    // Special Colors
    logoutBtnColor: "#F44336",    // Logout button
    logoutBtnTextColor: "#FFFFFF", // Logout text
    activeDayShadowColor: "#26867C", // Active day shadow
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