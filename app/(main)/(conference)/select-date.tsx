import BackButton from '@/components/BackButton';
import { theme } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useNavigation } from '@react-navigation/native';
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from "react-native-responsive-screen";
import { SafeAreaView } from "react-native-safe-area-context";

export default function SelectDateScreen() {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  const handleDateChange = (event: any, date?: Date) => {
    if (Platform.OS === "android") {
      setShowDatePicker(false);
    }
    if (date) {
      setSelectedDate(date);
    }
  };

  const handleOK = () => {
    const formattedDate = selectedDate.toISOString().split("T")[0];
    router.push({
      pathname: "/(main)/(conference)/doctors-list",
      params: { date: formattedDate }
    });
  };

  const navigation = useNavigation();

  const handleCancel = () => {
    try {
      if (navigation && (navigation as any).canGoBack && (navigation as any).canGoBack()) {
        (navigation as any).goBack();
        return;
      }
    } catch (e) {}
    router.back();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <BackButton style={styles.backButton} testID="selectdate-back" />
        <Text style={styles.headerTitle}>Pick a Date to Schedule a Session</Text>
        <View style={styles.spacer} />
      </View>

      <View style={styles.content}>
        <View style={styles.card}>
          <Text style={styles.label}>Select date</Text>
          
          <View style={styles.dateInputContainer}>
            <Text style={styles.dateLabel}>Date</Text>
            <TouchableOpacity 
              style={styles.dateInput}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={styles.dateText}>
                {selectedDate.toLocaleDateString("en-GB", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric"
                }).replace(/ /g, "/")}
              </Text>
              <Ionicons name="calendar" size={24} color={theme.colors.primary} />
            </TouchableOpacity>
          </View>

          {(showDatePicker || Platform.OS === "ios") && (
            <DateTimePicker
              value={selectedDate}
              mode="date"
              display={Platform.OS === "ios" ? "spinner" : "default"}
              onChange={handleDateChange}
              minimumDate={new Date()}
              style={styles.datePicker}
            />
          )}

          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.okButton} onPress={handleOK}>
              <Text style={styles.okButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.primary,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: wp(5),
    paddingVertical: hp(2),
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: hp(2.2),
    fontWeight: "bold",
    color: theme.colors.textOnPrimary,
    flex: 1,
    textAlign: "center",
  },
  spacer: {
    width: 40,
  },
  content: {
    flex: 1,
    backgroundColor: theme.colors.screenColor,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingTop: hp(4),
    paddingHorizontal: wp(6),
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    backgroundColor: theme.colors.primarySoft,
    borderRadius: 20,
    padding: wp(6),
    width: "100%",
    maxWidth: 400,
  },
  label: {
    fontSize: hp(2),
    fontWeight: "600",
    color: theme.colors.textPrimary,
    marginBottom: hp(2),
  },
  dateInputContainer: {
    marginBottom: hp(2),
  },
  dateLabel: {
    fontSize: hp(1.6),
    color: theme.colors.textSecondary,
    marginBottom: hp(1),
  },
  dateInput: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: theme.colors.white,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: theme.colors.primary,
    paddingHorizontal: wp(4),
    paddingVertical: hp(1.8),
  },
  dateText: {
    fontSize: hp(2),
    color: theme.colors.textPrimary,
    fontWeight: "500",
  },
  datePicker: {
    backgroundColor: theme.colors.white,
    borderRadius: 12,
    marginBottom: hp(2),
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: wp(3),
    marginTop: hp(2),
  },
  cancelButton: {
    paddingHorizontal: wp(6),
    paddingVertical: hp(1.2),
  },
  cancelButtonText: {
    fontSize: hp(1.8),
    color: theme.colors.primary,
    fontWeight: "600",
  },
  okButton: {
    paddingHorizontal: wp(6),
    paddingVertical: hp(1.2),
  },
  okButtonText: {
    fontSize: hp(1.8),
    color: theme.colors.primary,
    fontWeight: "600",
  },
});
