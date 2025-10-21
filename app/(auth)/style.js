import { StyleSheet } from "react-native";
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from "react-native-responsive-screen";

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "white",
  },
  bannerImage: {
    width: "100%",
    height: hp(40),
    resizeMode: "cover",
    borderRadius: 15,
  },
  mainHeading: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: hp(2),
  },
  mainHeadingText: {
    fontSize: hp(2.8),
    fontFamily: "Pacifico",
  },
  logoStyle: {
    width: wp(18),
    height: hp(10),
    marginLeft: hp(0.5),
  },
  paragraphText: {
    marginRight: hp(2),
    marginLeft: hp(2),
    textAlign: "justify",
    fontFamily: "LoraItalic",
    fontSize: hp(2),
    marginTop: hp(0.5),
  },
  buttonPosition: {
    position: "absolute",
    bottom: hp(8),
    left: 0,
    right: 0,
    alignItems: "center",
  },
  buttonDesign: {
    borderWidth: hp(0.1),
    borderColor: "#26867C",
    borderRadius: hp(5),
    height: hp(6),
    width: wp(69),
    display: "flex",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#26867C",
  },
  googleLogo: {
    height: hp(3),
    width: wp(6),
  },
  googleText: {
    fontSize: hp(2),
    paddingLeft: hp(0.8),
    color: "#FFFFFF",
    fontWeight: "600",
  },
});
