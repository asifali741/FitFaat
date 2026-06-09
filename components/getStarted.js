import { StyleSheet } from "react-native";
import {
    heightPercentageToDP as hp,
    widthPercentageToDP as wp,
} from "react-native-responsive-screen";

const fallbackColors = {
  screenColor: "#FAFBFC",
  cardBackground: "#FFFFFF",
  backgroundHeader: "#F8FFFE",
  primary: "#26867C",
  secondary: "#4ECDC4",
  error: "#FF6B6B",
  border: "#E5E7EB",
  textPrimary: "#1A1A1A",
  textSecondary: "#666666",
  textTertiary: "#999999",
  textOnPrimary: "#FFFFFF",
  shadowLight: "#000000",
};

export const createGetStartedStyles = (themeColors = fallbackColors) => {
  const colors = { ...fallbackColors, ...themeColors };

  return StyleSheet.create({
  // Main Container
  container: {
    flex: 1,
    backgroundColor: colors.screenColor,
  },
  scrollContent: {
    paddingBottom: hp(4),
  },

  // Decorative Header
  decorativeHeader: {
    height: hp(15),
    position: "relative",
    overflow: "hidden",
  },
  gradientCircle: {
    position: "absolute",
    borderRadius: 999,
    opacity: 0.08,
  },
  circle1: {
    width: hp(25),
    height: hp(25),
    backgroundColor: colors.secondary,
    top: -hp(10),
    right: -hp(5),
  },
  circle2: {
    width: hp(20),
    height: hp(20),
    backgroundColor: colors.error,
    top: hp(5),
    left: -hp(8),
  },

  // Logo Section
  logoSection: {
    alignItems: "center",
    marginTop: hp(3),
    marginBottom: hp(3),
  },
  logoBadge: {
    width: hp(10),
    height: hp(10),
    borderRadius: hp(5),
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: hp(2),
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  logoSize: {
    height: hp(8),
    width: hp(8),
    resizeMode: "contain",
  },
  mainHeading: {
    fontFamily: "LoraRegular",
    fontSize: hp(3.8),
    fontWeight: "800",
    color: colors.textPrimary,
    marginBottom: hp(1),
    letterSpacing: 0.5,
  },
  taglineSmall: {
    fontFamily: "LoraRegular",
    fontSize: hp(1.8),
    color: colors.primary,
    fontWeight: "600",
    textAlign: "center",
  },

  // Instruction Card
  instructionCard: {
    marginHorizontal: wp(5),
    marginVertical: hp(2),
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    padding: hp(2.5),
    shadowColor: colors.shadowLight,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: hp(2),
  },
  instructionTitle: {
    fontFamily: "LoraRegular",
    fontSize: hp(2.2),
    fontWeight: "700",
    color: colors.textPrimary,
    marginLeft: wp(2),
  },
  missionTitle: {
    fontFamily: "LoraRegular",
    fontSize: hp(2.2),
    fontWeight: "700",
    color: colors.textPrimary,
    marginLeft: wp(2),
  },

  // Plan Preview
  planPreviewCard: {
    marginHorizontal: wp(5),
    marginVertical: hp(1),
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: hp(2.2),
    shadowColor: colors.shadowLight,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  planPreviewList: {
    gap: hp(1.1),
  },
  planPreviewRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: wp(3),
    paddingVertical: hp(1),
    paddingHorizontal: wp(2),
    backgroundColor: colors.backgroundHeader,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  planPreviewIcon: {
    width: hp(4.2),
    height: hp(4.2),
    borderRadius: hp(2.1),
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary + "14",
  },
  planPreviewCopy: {
    flex: 1,
    minWidth: 0,
  },
  planPreviewLabel: {
    fontFamily: "LoraRegular",
    fontSize: hp(1.55),
    fontWeight: "800",
    color: colors.textPrimary,
  },
  planPreviewText: {
    fontFamily: "LoraRegular",
    fontSize: hp(1.28),
    lineHeight: hp(1.85),
    color: colors.textSecondary,
    fontWeight: "600",
    marginTop: hp(0.25),
  },

  // Steps List
  stepsList: {
    gap: hp(1.5),
  },
  stepItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: hp(1.2),
    paddingHorizontal: wp(2),
    backgroundColor: colors.backgroundHeader,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: colors.secondary,
  },
  stepNumberBadge: {
    width: hp(4),
    height: hp(4),
    borderRadius: hp(2),
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: wp(3),
  },
  stepNumber: {
    color: colors.textOnPrimary,
    fontWeight: "700",
    fontSize: hp(1.8),
    fontFamily: "LoraRegular",
  },
  stepText: {
    fontFamily: "LoraRegular",
    fontSize: hp(1.6),
    color: colors.textPrimary,
    fontWeight: "600",
    flex: 1,
  },

  // Mission Container
  legacyMissionContainer: {
    marginHorizontal: wp(5),
    marginVertical: hp(2.5),
  },

  // Goals Grid
  goalsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: wp(3),
    marginTop: hp(2),
  },
  goalCard: {
    flex: 1,
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    padding: wp(4),
    alignItems: "center",
    shadowColor: colors.shadowLight,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    borderTopWidth: 3,
  },
  goalIconContainer: {
    width: hp(6),
    height: hp(6),
    borderRadius: hp(3),
    justifyContent: "center",
    alignItems: "center",
    marginBottom: hp(1.2),
  },
  goalName: {
    fontFamily: "LoraRegular",
    fontSize: hp(1.6),
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: hp(0.8),
    textAlign: "center",
  },
  goalDescription: {
    fontFamily: "LoraRegular",
    fontSize: hp(1.3),
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: hp(1.9),
  },

  // Benefits Container
  benefitsContainer: {
    marginHorizontal: wp(5),
    marginVertical: hp(2.5),
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    padding: hp(2.5),
    shadowColor: colors.shadowLight,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  benefitsTitle: {
    fontFamily: "LoraRegular",
    fontSize: hp(2.2),
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: hp(2),
    textAlign: "center",
  },
  benefitItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: hp(1.2),
    paddingHorizontal: wp(2),
  },
  benefitText: {
    fontFamily: "LoraRegular",
    fontSize: hp(1.5),
    color: colors.textPrimary,
    fontWeight: "600",
    marginLeft: wp(3),
    flex: 1,
  },

  // CTA Section
  ctaSection: {
    marginHorizontal: wp(5),
    marginVertical: hp(3),
    alignItems: "center",
  },
  ctaDescription: {
    fontFamily: "LoraRegular",
    fontSize: hp(2),
    fontWeight: "600",
    color: colors.textPrimary,
    textAlign: "center",
    marginBottom: hp(2.5),
  },
  getStartedButton: {
    backgroundColor: colors.primary,
    flexDirection: "row",
    paddingVertical: hp(2),
    paddingHorizontal: wp(8),
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    gap: wp(2),
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
    width: "100%",
  },
  getStartedButtonContainer: {
    color: colors.textOnPrimary,
    fontSize: hp(1.8),
    fontWeight: "700",
    fontFamily: "LoraRegular",
    letterSpacing: 0.3,
  },

  // Footer Section
  footerSection: {
    alignItems: "center",
    marginTop: hp(4),
    marginBottom: hp(2),
    paddingHorizontal: wp(5),
  },
  copyRightText: {
    textAlign: "center",
    fontFamily: "LoraRegular",
    fontSize: hp(1.3),
    color: colors.textTertiary,
    fontWeight: "500",
    marginBottom: hp(0.8),
  },
  footerTagline: {
    textAlign: "center",
    fontFamily: "LoraRegular",
    fontSize: hp(1.3),
    color: colors.primary,
    fontWeight: "600",
  },

  // Backward Compatibility
  logoText: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  instructionBox: {
    paddingLeft: hp(2),
    marginTop: hp(4),
  },
  instructionText: {
    fontFamily: "LoraRegular",
    fontSize: hp(2.2),
    fontWeight: "600",
  },
  instructionFont: {
    fontFamily: "LoraRegular",
  },
  missionContainer: {
    alignItems: "center",
    marginTop: hp(4),
    paddingHorizontal: hp(2),
  },
  missionText: {
    fontFamily: "LoraRegular",
    fontSize: hp(2.4),
    color: colors.textPrimary,
    marginBottom: hp(2),
    textAlign: "center",
  },
  iconsDesign: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
  },
  tagLine: {
    fontFamily: "LoraRegular",
    fontSize: hp(1.8),
    textAlign: "center",
    marginTop: hp(2),
  },
  getStartedButtonDesign: {
    flex: 1,
    justifyContent: "center",
    gap: 20,
    position: "absolute",
    bottom: hp(18),
    left: wp(5),
    right: wp(5),
  },
  getStartedButtonText: {
    backgroundColor: colors.primary,
    color: colors.textOnPrimary,
    padding: 20,
    borderRadius: 12,
    alignItems: "center",
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  });
};

export const getStarted = createGetStartedStyles();
