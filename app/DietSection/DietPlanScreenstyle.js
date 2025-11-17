import { StyleSheet } from "react-native";
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from "react-native-responsive-screen";

export const DietPlanScreenstyle = StyleSheet.create({
  container: {
    flex: 1,
    marginTop: hp(7),
    padding: hp(5),
  },
  text: {
    fontSize: hp(3),
    fontWeight: "bold",
  },
});
