import { useTheme } from "@/contexts/ThemeContext";
import {
  createDoctorActionPlan,
  type DoctorActionPlan,
} from "@/utils/doctorActionPlan";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from "react-native-responsive-screen";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type DoctorActionPlanModalProps = {
  visible: boolean;
  loading?: boolean;
  onClose: () => void;
  onSend: (plan: DoctorActionPlan) => Promise<void> | void;
};

export default function DoctorActionPlanModal({
  visible,
  loading = false,
  onClose,
  onSend,
}: DoctorActionPlanModalProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => getStyles(colors, insets.bottom), [colors, insets.bottom]);
  const [dietTargets, setDietTargets] = useState("Protein with each meal, balanced portions, stay near calorie target");
  const [waterGoal, setWaterGoal] = useState("2.5 L daily");
  const [foodsToAvoid, setFoodsToAvoid] = useState("Sugary drinks, fried snacks, late-night heavy meals");
  const [notes, setNotes] = useState("Follow this for 7 days and message me if symptoms or energy changes.");
  const [nextAppointment, setNextAppointment] = useState("Book a follow-up after 7 days");

  useEffect(() => {
    if (!visible) return;
    setDietTargets("Protein with each meal, balanced portions, stay near calorie target");
    setWaterGoal("2.5 L daily");
    setFoodsToAvoid("Sugary drinks, fried snacks, late-night heavy meals");
    setNotes("Follow this for 7 days and message me if symptoms or energy changes.");
    setNextAppointment("Book a follow-up after 7 days");
  }, [visible]);

  const handleSend = () => {
    onSend(
      createDoctorActionPlan({
        durationDays: 7,
        dietTargets,
        waterGoal,
        foodsToAvoid,
        notes,
        nextAppointment,
      })
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View>
              <Text style={styles.eyebrow}>Doctor Plan</Text>
              <Text style={styles.title}>7-day action plan</Text>
            </View>
            <TouchableOpacity style={styles.closeButton} onPress={onClose} disabled={loading}>
              <Ionicons name="close" size={hp(2.8)} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            <Field
              label="Diet targets"
              value={dietTargets}
              onChangeText={setDietTargets}
              placeholder="Calories, macros, meal timing..."
              styles={styles}
              colors={colors}
            />
            <Field
              label="Water goal"
              value={waterGoal}
              onChangeText={setWaterGoal}
              placeholder="2.5 L daily"
              styles={styles}
              colors={colors}
            />
            <Field
              label="Foods to avoid"
              value={foodsToAvoid}
              onChangeText={setFoodsToAvoid}
              placeholder="Sugary drinks, fried items..."
              styles={styles}
              colors={colors}
            />
            <Field
              label="Notes"
              value={notes}
              onChangeText={setNotes}
              placeholder="Monitoring notes..."
              styles={styles}
              colors={colors}
              tall
            />
            <Field
              label="Next appointment"
              value={nextAppointment}
              onChangeText={setNextAppointment}
              placeholder="Date, timing, or follow-up instruction"
              styles={styles}
              colors={colors}
            />
          </ScrollView>

          <TouchableOpacity style={styles.sendButton} onPress={handleSend} disabled={loading}>
            {loading ? (
              <ActivityIndicator color={colors.textOnPrimary} />
            ) : (
              <>
                <Ionicons name="paper-plane-outline" size={hp(2.2)} color={colors.textOnPrimary} />
                <Text style={styles.sendText}>Send Plan</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  styles,
  colors,
  tall = false,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  styles: ReturnType<typeof getStyles>;
  colors: any;
  tall?: boolean;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textTertiary || colors.textSecondary}
        multiline
        textAlignVertical="top"
        style={[styles.input, tall && styles.inputTall]}
      />
    </View>
  );
}

const getStyles = (colors: any, bottomInset: number) => StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    justifyContent: "flex-end",
  },
  sheet: {
    maxHeight: "88%",
    backgroundColor: colors.cardBackground,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingHorizontal: wp(4),
    paddingTop: hp(1.6),
    paddingBottom: bottomInset + hp(1.4),
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: wp(3),
    marginBottom: hp(1),
  },
  eyebrow: {
    color: colors.primary,
    fontSize: Math.min(hp(1.2), wp(2.9)),
    fontWeight: "900",
    textTransform: "uppercase",
  },
  title: {
    color: colors.textPrimary,
    fontSize: Math.min(hp(2.3), wp(5.2)),
    fontWeight: "900",
    marginTop: hp(0.2),
  },
  closeButton: {
    width: hp(4.4),
    height: hp(4.4),
    borderRadius: hp(2.2),
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface || colors.screenColor,
  },
  body: {
    maxHeight: hp(58),
  },
  field: {
    marginBottom: hp(1.1),
  },
  fieldLabel: {
    color: colors.textPrimary,
    fontWeight: "900",
    marginBottom: hp(0.5),
  },
  input: {
    minHeight: hp(6),
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.cardBorder || colors.border,
    backgroundColor: colors.surface || colors.screenColor,
    color: colors.textPrimary,
    paddingHorizontal: wp(3),
    paddingVertical: hp(1),
    fontWeight: "700",
  },
  inputTall: {
    minHeight: hp(10),
  },
  sendButton: {
    minHeight: hp(5.4),
    borderRadius: 8,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: wp(1.4),
    marginTop: hp(1),
  },
  sendText: {
    color: colors.textOnPrimary,
    fontWeight: "900",
  },
});

