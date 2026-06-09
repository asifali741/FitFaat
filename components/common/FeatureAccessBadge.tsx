import { Ionicons } from "@expo/vector-icons";
import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from "react-native-responsive-screen";
import { useTheme } from "@/contexts/ThemeContext";
import {
  getFeatureAccessBadge,
  type FeatureAccessBadgeTone,
  type FeatureAccessStatus,
} from "@/utils/featureAccess";

type FeatureAccessBadgeProps = {
  access?: FeatureAccessStatus | null;
  label?: string;
  tone?: FeatureAccessBadgeTone;
  compact?: boolean;
};

const getBadgeIcon = (tone: FeatureAccessBadgeTone): keyof typeof Ionicons.glyphMap => {
  if (tone === "free") return "checkmark-circle-outline";
  if (tone === "premium") return "diamond-outline";
  if (tone === "unlimited") return "infinite-outline";
  if (tone === "locked") return "lock-closed-outline";
  return "sync-outline";
};

export function FeatureAccessBadge({
  access,
  label,
  tone,
  compact = true,
}: FeatureAccessBadgeProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => getStyles(compact), [compact]);
  const badge = access ? getFeatureAccessBadge(access) : {
    label: label || "Checking",
    tone: tone || "checking",
  };
  const badgeTone = tone || badge.tone;
  const badgeLabel = label || badge.label;
  const accent =
    badgeTone === "free"
      ? colors.success || "#10B981"
      : badgeTone === "premium"
        ? colors.primary
        : badgeTone === "unlimited"
          ? "#0EA5E9"
          : badgeTone === "locked"
            ? colors.textSecondary
            : colors.warning || "#F59E0B";

  return (
    <View style={[styles.badge, { backgroundColor: `${accent}14`, borderColor: `${accent}38` }]}>
      <Ionicons name={getBadgeIcon(badgeTone)} size={compact ? Math.min(hp(1.45), wp(3.4)) : Math.min(hp(1.7), wp(3.9))} color={accent} />
      <Text style={[styles.text, { color: accent }]} numberOfLines={1} adjustsFontSizeToFit>
        {badgeLabel}
      </Text>
    </View>
  );
}

const getStyles = (compact: boolean) =>
  StyleSheet.create({
    badge: {
      alignSelf: "flex-start",
      minHeight: compact ? hp(2.7) : hp(3.3),
      maxWidth: wp(40),
      borderRadius: hp(1.35),
      borderWidth: 1,
      paddingHorizontal: compact ? wp(1.7) : wp(2.2),
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: wp(0.75),
    },
    text: {
      flexShrink: 1,
      fontSize: compact ? Math.min(hp(1.02), wp(2.45)) : Math.min(hp(1.16), wp(2.7)),
      fontWeight: "900",
      letterSpacing: 0,
    },
  });

export default FeatureAccessBadge;
