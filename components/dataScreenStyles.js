import { StyleSheet } from "react-native";
import {
    heightPercentageToDP as hp,
    widthPercentageToDP as wp,
} from "react-native-responsive-screen";

const fallbackColors = {
  screenColor: "#FAFBFC",
  cardBackground: "#FFFFFF",
  backgroundHeader: "#F8FFFE",
  primary: "#26867C",
  secondary: "#4ECDC4",
  border: "#E5E7EB",
  disabled: "#A0AEC0",
  textPrimary: "#1A1A1A",
  textSecondary: "#666666",
  textTertiary: "#A0AEC0",
  textOnPrimary: "#FFFFFF",
  shadowLight: "#000000",
};

export const createDataScreenStyles = (themeColors = fallbackColors) => {
  const colors = { ...fallbackColors, ...themeColors };

  return StyleSheet.create({
  // Main Container
  container: {
    flex: 1,
    backgroundColor: colors.screenColor,
  },
  
  // Header Section
  headingandlogo: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: hp(2),
    backgroundColor: "transparent",
  },
  logoImage: {
    height: hp(6),
    width: hp(6),
    marginLeft: wp(3),
    resizeMode: "contain",
  },
  mainHeading: {
    fontSize: hp(3.2),
    fontWeight: "800",
    fontFamily: "LoraRegular",
    color: colors.textPrimary,
    letterSpacing: 0.5,
  },

  // Main Content Box
  mainBox: {
    flex: 1,
    marginHorizontal: wp(5),
    marginVertical: hp(1.5),
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    padding: hp(2.5),
    shadowColor: colors.shadowLight,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    overflow: "hidden",
  },
  
  // Intro Text
  personalizedText: {
    textAlign: "center",
    fontSize: hp(1.8),
    fontWeight: "600",
    color: colors.primary,
    fontFamily: "LoraRegular",
    marginBottom: hp(1.5),
    letterSpacing: 0.3,
  },

  // Form Labels
  subHeading: {
    fontSize: hp(1.6),
    fontWeight: "700",
    color: colors.textPrimary,
    fontFamily: "LoraRegular",
    marginTop: hp(1.8),
    marginBottom: hp(0.8),
    letterSpacing: 0.3,
  },
  subsubHeading: {
    fontSize: hp(1.5),
    fontWeight: "700",
    color: colors.textPrimary,
    fontFamily: "LoraRegular",
    marginBottom: hp(0.6),
    letterSpacing: 0.2,
  },
  genderHeading: {
    fontSize: hp(1.6),
    fontWeight: "700",
    color: colors.textPrimary,
    fontFamily: "LoraRegular",
    marginTop: hp(1.8),
    marginBottom: hp(1),
    letterSpacing: 0.3,
  },

  // Text Inputs
  mainTextInput: {
    height: hp(5.5),
    backgroundColor: colors.backgroundHeader,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 12,
    fontSize: hp(1.6),
    paddingHorizontal: hp(1.8),
    fontFamily: "LoraRegular",
    color: colors.textPrimary,
    placeholderTextColor: colors.textTertiary,
  },
  miniTextInput: {
    height: hp(5.5),
    backgroundColor: colors.backgroundHeader,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 12,
    fontSize: hp(1.6),
    textAlign: "center",
    paddingHorizontal: hp(1),
    fontFamily: "LoraRegular",
    color: colors.textPrimary,
    placeholderTextColor: colors.textTertiary,
  },

  // Gender Selection
  genderSelection: {
    height: hp(7),
    width: hp(8),
    backgroundColor: colors.backgroundHeader,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: colors.shadowLight,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },

  // Date of Birth
  dob: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.backgroundHeader,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 12,
    height: hp(5.5),
    paddingHorizontal: hp(1.5),
    marginVertical: hp(0.8),
  },
  dobInput: {
    flex: 1,
    height: hp(5.5),
    textAlign: "center",
    fontSize: hp(1.6),
    fontFamily: "LoraRegular",
    color: colors.textPrimary,
  },
  dobText: {
    fontSize: hp(1.8),
    color: colors.primary,
    fontWeight: "600",
    marginHorizontal: hp(1),
  },

  // Goal Selection
  mappingCol: {
    marginVertical: hp(1),
  },
  mapping: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.backgroundHeader,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 12,
    padding: hp(1.5),
    marginBottom: hp(1),
    shadowColor: colors.shadowLight,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  mappingHeading: {
    fontSize: hp(1.8),
    fontWeight: "700",
    fontFamily: "LoraRegular",
    color: colors.textPrimary,
    marginLeft: hp(1),
  },
  mappingHeadingName: {
    fontSize: hp(1.3),
    color: colors.textSecondary,
    marginTop: hp(0.4),
    marginLeft: hp(1),
    fontFamily: "LoraRegular",
    fontWeight: "500",
  },

  // Button
  generateButton: {
    height: hp(5.5),
    backgroundColor: colors.primary,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginTop: hp(2),
    flexDirection: "row",
    gap: wp(2),
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },

  // Container Layouts
  subContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: wp(3),
    marginVertical: hp(0.8),
  },
  mappingRow: {
    flexDirection: "column",
    marginVertical: hp(0.5),
  },

  // Legacy Styles (for compatibility)
  gettingStarted: {
    textAlign: "left",
    marginTop: hp(1.5),
    fontSize: hp(2),
    fontWeight: "700",
    paddingLeft: hp(6),
    fontFamily: "LoraRegular",
  },
  });
};

export const dataScreenStyles = createDataScreenStyles();
