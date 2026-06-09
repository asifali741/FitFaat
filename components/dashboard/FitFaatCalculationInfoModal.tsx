import { FITFAAT_CALCULATION_INFO_LINES } from "@/utils/dashboardProgress";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from "react-native-responsive-screen";

type FitFaatCalculationInfoModalProps = {
  visible: boolean;
  onClose: () => void;
  colors: any;
  title?: string;
};

export default function FitFaatCalculationInfoModal({
  visible,
  onClose,
  colors,
  title = "How FitFaat Calculates This",
}: FitFaatCalculationInfoModalProps) {
  const styles = getStyles(colors);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.card} onPress={(event) => event.stopPropagation()}>
          <View style={styles.header}>
            <View style={styles.iconWrap}>
              <Ionicons
                name="calculator-outline"
                size={Math.min(hp(2.5), wp(5.6))}
                color={colors.primary}
              />
            </View>
            <View style={styles.titleWrap}>
              <Text style={styles.eyebrow}>FitFaat model</Text>
              <Text style={styles.title}>{title}</Text>
            </View>
            <Pressable
              style={styles.closeButton}
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Close calculation explanation"
            >
              <Ionicons
                name="close"
                size={Math.min(hp(2.4), wp(5.3))}
                color={colors.textPrimary}
              />
            </Pressable>
          </View>

          <View style={styles.lines}>
            {FITFAAT_CALCULATION_INFO_LINES.map((line, index) => (
              <View key={line} style={styles.lineRow}>
                <View style={styles.lineNumber}>
                  <Text style={styles.lineNumberText}>{index + 1}</Text>
                </View>
                <Text style={styles.lineText}>{line}</Text>
              </View>
            ))}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: wp(5),
    backgroundColor: "rgba(15, 23, 42, 0.45)",
  },
  card: {
    borderRadius: hp(1.8),
    padding: hp(1.8),
    backgroundColor: colors.cardBackground || colors.screenColor || "#FFFFFF",
    borderWidth: 1,
    borderColor: colors.cardBorder || colors.border || "#E5E7EB",
    shadowColor: "#000000",
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: wp(3),
    marginBottom: hp(1.6),
  },
  iconWrap: {
    width: Math.min(hp(5.3), wp(11.8)),
    height: Math.min(hp(5.3), wp(11.8)),
    borderRadius: Math.min(hp(2.65), wp(5.9)),
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: `${colors.primary || "#0891B2"}14`,
  },
  titleWrap: {
    flex: 1,
    minWidth: 0,
  },
  eyebrow: {
    color: colors.textSecondary,
    fontSize: Math.min(hp(1.25), wp(3)),
    fontWeight: "800",
    textTransform: "uppercase",
  },
  title: {
    color: colors.textPrimary,
    fontSize: Math.min(hp(2), wp(4.7)),
    fontWeight: "900",
  },
  closeButton: {
    width: Math.min(hp(4.2), wp(9.3)),
    height: Math.min(hp(4.2), wp(9.3)),
    borderRadius: Math.min(hp(2.1), wp(4.65)),
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface || colors.screenColor || "#F8FAFC",
  },
  lines: {
    gap: hp(1.1),
  },
  lineRow: {
    flexDirection: "row",
    gap: wp(2.5),
    alignItems: "flex-start",
  },
  lineNumber: {
    width: Math.min(hp(2.8), wp(6.2)),
    height: Math.min(hp(2.8), wp(6.2)),
    borderRadius: Math.min(hp(1.4), wp(3.1)),
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: `${colors.primary || "#0891B2"}18`,
  },
  lineNumberText: {
    color: colors.primary,
    fontSize: Math.min(hp(1.25), wp(2.9)),
    fontWeight: "900",
  },
  lineText: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: Math.min(hp(1.48), wp(3.45)),
    fontWeight: "700",
    lineHeight: Math.min(hp(2.1), wp(4.7)),
  },
});
