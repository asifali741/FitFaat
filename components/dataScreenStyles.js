import { StyleSheet } from "react-native";
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from "react-native-responsive-screen";

export const dataScreenStyles = StyleSheet.create({
  // Main Container
  container: {
    flex: 1,
    backgroundColor: "#FAFBFC",
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
    color: "#1A1A1A",
    letterSpacing: 0.5,
  },

  // Main Content Box
  mainBox: {
    flex: 1,
    marginHorizontal: wp(5),
    marginVertical: hp(1.5),
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: hp(2.5),
    shadowColor: "#000",
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
    color: "#26867C",
    fontFamily: "LoraRegular",
    marginBottom: hp(1.5),
    letterSpacing: 0.3,
  },

  // Form Labels
  subHeading: {
    fontSize: hp(1.6),
    fontWeight: "700",
    color: "#1A1A1A",
    fontFamily: "LoraRegular",
    marginTop: hp(1.8),
    marginBottom: hp(0.8),
    letterSpacing: 0.3,
  },
  subsubHeading: {
    fontSize: hp(1.5),
    fontWeight: "700",
    color: "#1A1A1A",
    fontFamily: "LoraRegular",
    marginBottom: hp(0.6),
    letterSpacing: 0.2,
  },
  genderHeading: {
    fontSize: hp(1.6),
    fontWeight: "700",
    color: "#1A1A1A",
    fontFamily: "LoraRegular",
    marginTop: hp(1.8),
    marginBottom: hp(1),
    letterSpacing: 0.3,
  },

  // Text Inputs
  mainTextInput: {
    height: hp(5.5),
    backgroundColor: "#F8FFFE",
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    fontSize: hp(1.6),
    paddingHorizontal: hp(1.8),
    fontFamily: "LoraRegular",
    color: "#1A1A1A",
    placeholderTextColor: "#A0AEC0",
  },
  miniTextInput: {
    height: hp(5.5),
    backgroundColor: "#F8FFFE",
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    fontSize: hp(1.6),
    textAlign: "center",
    paddingHorizontal: hp(1),
    fontFamily: "LoraRegular",
    color: "#1A1A1A",
    placeholderTextColor: "#A0AEC0",
  },

  // Gender Selection
  genderSelection: {
    height: hp(7),
    width: hp(8),
    backgroundColor: "#F8FFFE",
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },

  // Date of Birth
  dob: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FFFE",
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
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
    color: "#1A1A1A",
  },
  dobText: {
    fontSize: hp(1.8),
    color: "#26867C",
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
    backgroundColor: "#F8FFFE",
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: hp(1.5),
    marginBottom: hp(1),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  mappingHeading: {
    fontSize: hp(1.8),
    fontWeight: "700",
    fontFamily: "LoraRegular",
    color: "#1A1A1A",
    marginLeft: hp(1),
  },
  mappingHeadingName: {
    fontSize: hp(1.3),
    color: "#666",
    marginTop: hp(0.4),
    marginLeft: hp(1),
    fontFamily: "LoraRegular",
    fontWeight: "500",
  },

  // Button
  generateButton: {
    height: hp(5.5),
    backgroundColor: "#26867C",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginTop: hp(2),
    flexDirection: "row",
    gap: wp(2),
    shadowColor: "#26867C",
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
