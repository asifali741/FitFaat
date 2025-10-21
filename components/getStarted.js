import { StyleSheet } from "react-native";
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from "react-native-responsive-screen";

export const getStarted = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "white",
  },
  logoText: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  logoSize: {
    height: hp(8),
    width: hp(8),
  },
  mainHeading: {
    textAlign: "center",
    marginTop: hp(1.5),
    fontSize: hp(3.6),
    fontFamily: "LoraRegular",
  },
  instructionBox: {
    paddingLeft: hp(2),
    marginTop: hp(4),
  },
  instructionText: {
    fontFamily: "LoraRegular",
    fontSize: hp(2.2),
    fontWeight: "600",
  },
  instructionFont: {
    fontFamily: "LoraRegular",
  },
  missionContainer: {
    alignItems: "center",
    marginTop: hp(4),
    paddingHorizontal: hp(2),
  },
  missionText: {
    fontFamily: "LoraRegular",
    fontSize: hp(2.4),
    color: "#222",
    marginBottom: hp(2),
    textAlign: "center",
  },
  iconsDesign: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
  },
  tagLine: {
    fontFamily: "LoraRegular",
    fontSize: hp(1.8),
    textAlign: "center",
    marginTop: hp(2),
  },
  getStartedButtonDesign: {
    flex: 1,
    justifyContent: "center",
    gap: 20,
    position: "absolute",
    bottom: hp(18),
    left: wp(5),
    right: wp(5),
  },
  getStartedButtonText: {
    backgroundColor: "#26867C",
    padding: 20,
    borderRadius: 12,
    alignItems: "center",
    shadowColor: "#26867C",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  copyRightText: {
    textAlign: "center",
    fontFamily: "LoraRegular",
    fontSize: hp(1.8),
  },
});
