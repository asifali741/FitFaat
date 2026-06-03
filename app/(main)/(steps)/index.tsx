import AppHeader from "@/components/AppHeader";
import { StepCounterCard } from "@/components/dashboard/StepCounterCard";
import { useTheme } from "@/contexts/ThemeContext";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback } from "react";
import {
  BackHandler,
  ScrollView,
  StyleSheet,
} from "react-native";
import { heightPercentageToDP as hp } from "react-native-responsive-screen";
import { SafeAreaView } from "react-native-safe-area-context";

export default function StepsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const styles = getStyles(colors);

  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
        router.replace("/(main)/(settings)" as any);
        return true;
      });

      return () => subscription.remove();
    }, [router])
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.screenColor }]} edges={["top"]}>
      <AppHeader title="Daily Step Ring" showStepIndicator={false} />

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <StepCounterCard colors={colors} />
      </ScrollView>
    </SafeAreaView>
  );
}

const getStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    content: {
      flex: 1,
    },
    scrollContent: {
      paddingTop: hp(1.4),
      paddingBottom: hp(16),
    },
  });
