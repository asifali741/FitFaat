import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from "react-native-responsive-screen";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { DrawerActions } from "@react-navigation/native";
import { colorsSheet } from "./ui_elements";

export default function Settings() {
  const navigation = useNavigation();

  const openDrawer = () => {
    navigation.dispatch(DrawerActions.openDrawer());
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.menuButton}
          onPress={openDrawer}
        >
          <Ionicons name="menu" size={24} color={colorsSheet.textOnPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={styles.spacer} />
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        <View style={styles.placeholderContainer}>
          <Text style={styles.placeholderText}>Settings Screen</Text>
          <Text style={styles.placeholderSubText}>Coming Soon...</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colorsSheet.primary,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Math.min(wp(5), 20),
    paddingVertical: Math.min(hp(1.8), 15),
    backgroundColor: colorsSheet.primary,
    minHeight: hp(7),
  },
  menuButton: {
    padding: Math.min(wp(2), 10),
    minWidth: wp(10),
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: Math.min(hp(2.5), wp(6)),
    fontWeight: "bold",
    color: colorsSheet.textOnPrimary,
    textAlign: "center",
    flex: 1,
  },
  content: {
    flex: 1,
    backgroundColor: colorsSheet.screenColor,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
  },
  spacer: {
    width: wp(18),
  },
  placeholderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: wp(8),
  },
  placeholderText: {
    fontSize: Math.min(hp(3), wp(7.5)),
    fontWeight: "bold",
    color: colorsSheet.textPrimary,
    marginBottom: hp(1),
  },
  placeholderSubText: {
    fontSize: Math.min(hp(2), wp(5)),
    color: colorsSheet.textSecondary,
    textAlign: "center",
  },
});
