import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "@/contexts/ThemeContext";
import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from "react-native-responsive-screen";

export default function Page() {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.screenColor }]}>
      <View style={styles.main}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Hello World</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>This is the first page of your app.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    padding: wp(6),
  },
  main: {
    flex: 1,
    justifyContent: "center",
    maxWidth: wp(92),
    marginHorizontal: "auto",
  },
  title: {
    fontSize: Math.min(hp(7.9), wp(17)),
    fontWeight: "bold",
  },
  subtitle: {
    fontSize: Math.min(hp(4.4), wp(9.6)),
  },
});
