import { colorsSheet as colors } from "@/app/(main)/(settings)/ui_elements";
import { StyleSheet } from "react-native";
import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from "react-native-responsive-screen";
export const ChatBotStyles = StyleSheet.create({
  container: {
    width: '100%',
    height: '100%',
    alignItems: "center",
    backgroundColor: colors.screenColor, //"#F8F9FA",
  },
  indexImage: {
    height: hp(22),
    width: wp(78),
    marginTop: hp(2),
  },
   baatImage: {
    height: hp(22),
    width: wp(78),
    marginTop: hp(6),
  },
  mainHeading: {
    fontSize: hp(2.4),
    fontWeight: "400",
    textAlign: "center",
    marginRight: hp(1),
    marginLeft: hp(1),
    marginTop: hp(1.6),
  },
  startButton: {
    height: hp(5),
    width: wp(70),
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: "blue",
    marginTop: hp(3),
    borderRadius: hp(1),
    position: "absolute",
    bottom: hp(20),
  },
});
