import Constants from "expo-constants";
import { Alert, Linking, Platform } from "react-native";
import { tokenStorage } from "@/utils/auth/tokenStorage";

export const FITFAAT_SUPPORT_EMAIL = "asif1465majid@gmail.com";
export const FITFAAT_SUPPORT_WHATSAPP_DISPLAY = "03325563373";
const FITFAAT_SUPPORT_WHATSAPP_NUMBER = "923325563373";

const getUserId = (user: any) =>
  user?._id || user?.id || user?.userId || user?.email || "unknown";

const getUserName = (user: any) =>
  user?.userInfo?.name ||
  user?.username ||
  user?.name ||
  user?.fullName ||
  "unknown";

export const buildReportProblemMessage = async (source = "FitFaat app") => {
  const user = await tokenStorage.getUser().catch(() => null);
  const appName = Constants.expoConfig?.name || "FitFaat";
  const appVersion =
    Constants.expoConfig?.version ||
    Constants.nativeAppVersion ||
    "unknown";
  const buildNumber =
    Constants.nativeBuildVersion ||
    (Constants.expoConfig as any)?.android?.versionCode ||
    (Constants.expoConfig as any)?.ios?.buildNumber ||
    "unknown";
  const deviceName = (Constants as any).deviceName || "unknown";

  return [
    "FitFaat Problem Report",
    "",
    "Please describe what happened:",
    "",
    "",
    "Context",
    `Source: ${source}`,
    `User ID: ${getUserId(user)}`,
    `User email: ${user?.email || "unknown"}`,
    `User name: ${getUserName(user)}`,
    `App: ${appName} ${appVersion} (${buildNumber})`,
    `Platform: ${Platform.OS} ${String(Platform.Version)}`,
    `Device: ${deviceName}`,
    `Time: ${new Date().toISOString()}`,
  ].join("\n");
};

const openEmailReport = async (source: string) => {
  const body = encodeURIComponent(await buildReportProblemMessage(source));
  const subject = encodeURIComponent("FitFaat Problem Report");
  await Linking.openURL(`mailto:${FITFAAT_SUPPORT_EMAIL}?subject=${subject}&body=${body}`);
};

const openWhatsAppReport = async (source: string) => {
  const text = encodeURIComponent(await buildReportProblemMessage(source));
  const appUrl = `whatsapp://send?phone=${FITFAAT_SUPPORT_WHATSAPP_NUMBER}&text=${text}`;
  const webUrl = `https://wa.me/${FITFAAT_SUPPORT_WHATSAPP_NUMBER}?text=${text}`;

  try {
    await Linking.openURL(appUrl);
  } catch {
    await Linking.openURL(webUrl);
  }
};

export const openReportProblemOptions = (source = "FitFaat app") => {
  Alert.alert(
    "Report a Problem",
    `Send a bug report through WhatsApp (${FITFAAT_SUPPORT_WHATSAPP_DISPLAY}) or email (${FITFAAT_SUPPORT_EMAIL}).`,
    [
      {
        text: "WhatsApp",
        onPress: () => {
          openWhatsAppReport(source).catch(() => {
            Alert.alert("Could not open WhatsApp", "Please try email support instead.");
          });
        },
      },
      {
        text: "Email",
        onPress: () => {
          openEmailReport(source).catch(() => {
            Alert.alert("Could not open email", `Please email ${FITFAAT_SUPPORT_EMAIL}.`);
          });
        },
      },
      { text: "Cancel", style: "cancel" },
    ]
  );
};
