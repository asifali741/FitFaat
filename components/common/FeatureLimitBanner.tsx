import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useMemo } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from "react-native-responsive-screen";
import { useTheme } from "@/contexts/ThemeContext";
import type { FeatureAccessStatus } from "@/utils/featureAccess";

type FeatureLimitBannerProps = {
  access?: FeatureAccessStatus | null;
  compact?: boolean;
  showPremiumActive?: boolean;
};

export function FeatureLimitBanner({
  access,
  compact = false,
  showPremiumActive = false,
}: FeatureLimitBannerProps) {
  const { colors } = useTheme();
  const router = useRouter();
  const styles = useMemo(() => getStyles(colors, compact), [colors, compact]);

  if (!access) return null;
  if (access.accessSource === "premium" && !showPremiumActive) return null;
  if (access.accessSource === "free" && access.planLabel !== "Free preview") return null;

  const isPremium = access.accessSource === "premium";
  const isLocked = access.accessSource === "locked";
  const isFreePreview = access.accessSource === "free" && access.planLabel === "Free preview";
  const title = isPremium
    ? `${access.label} unlimited`
    : isFreePreview
      ? `${access.label} preview`
      : isLocked
      ? `${access.label} is Premium`
      : `${access.label} access`;
  const subtitle = isPremium
    ? "Your Premium Membership is active."
    : isFreePreview
      ? access.planDescription
      : isLocked
      ? access.lockedReason || "Premium adds this feature when you're ready."
      : access.statusLabel;
  const badge = isPremium
    ? "Unlimited"
    : isFreePreview
      ? "Free Preview"
      : isLocked
      ? "Locked"
      : access.statusLabel;
  const icon = isPremium
    ? "diamond-outline"
    : isFreePreview
      ? "eye-outline"
      : isLocked
      ? "lock-closed-outline"
      : "sparkles-outline";
  const accent = isPremium
    ? colors.success || colors.primary
    : isFreePreview
      ? colors.primary
      : isLocked
      ? colors.warning || "#F59E0B"
      : colors.primary;

  return (
    <View style={[styles.card, { borderColor: `${accent}44`, backgroundColor: `${accent}12` }]}>
      <View style={styles.iconWrap}>
        <Ionicons name={icon} size={Math.min(hp(2.4), wp(5.4))} color={accent} />
      </View>
      <View style={styles.copy}>
        <Text style={styles.title} numberOfLines={1} adjustsFontSizeToFit>
          {title}
        </Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>
      <TouchableOpacity
        style={[styles.badge, { backgroundColor: isLocked ? colors.primary : accent }]}
        onPress={() => {
          if (isLocked) {
            router.push("/(main)/(settings)/premium" as any);
          }
        }}
        activeOpacity={0.84}
      >
        <Text style={styles.badgeText}>{badge}</Text>
      </TouchableOpacity>
    </View>
  );
}

const getStyles = (colors: any, compact: boolean) =>
  StyleSheet.create({
    card: {
      minHeight: compact ? hp(7) : hp(8.4),
      borderWidth: 1,
      borderRadius: hp(1.6),
      paddingHorizontal: wp(3),
      paddingVertical: hp(1.2),
      flexDirection: "row",
      alignItems: "center",
      gap: wp(2.3),
      marginBottom: hp(1.4),
    },
    iconWrap: {
      width: Math.min(hp(4.4), wp(9.8)),
      height: Math.min(hp(4.4), wp(9.8)),
      borderRadius: hp(1.2),
      backgroundColor: colors.cardBackground,
      alignItems: "center",
      justifyContent: "center",
    },
    copy: {
      flex: 1,
      minWidth: 0,
    },
    title: {
      color: colors.textPrimary,
      fontSize: Math.min(hp(1.72), wp(3.9)),
      fontWeight: "900",
    },
    subtitle: {
      color: colors.textSecondary,
      fontSize: Math.min(hp(1.16), wp(2.78)),
      fontWeight: "700",
      lineHeight: hp(1.7),
      marginTop: hp(0.2),
    },
    badge: {
      minHeight: hp(3.4),
      maxWidth: wp(39),
      borderRadius: hp(1.7),
      paddingHorizontal: wp(2.4),
      alignItems: "center",
      justifyContent: "center",
    },
    badgeText: {
      color: colors.textOnPrimary || "#FFFFFF",
      fontSize: Math.min(hp(1.1), wp(2.65)),
      fontWeight: "900",
      textAlign: "center",
    },
  });

export default FeatureLimitBanner;
