import "dotenv/config";

export default {
  expo: {
    name: "FitFaat",
    slug: "fitfaat",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/fitfaat-icon.png",
    scheme: "fitfaat",
    userInterfaceStyle: "automatic",
    newArchEnabled: true, // Required by the installed react-native-reanimated version

    ios: {
      supportsTablet: true,
    },

    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/images/fitfaat-adaptive-icon.png",
        backgroundColor: "#ffffff",
      },
      edgeToEdgeEnabled: true,
      softwareKeyboardLayoutMode: "resize",
      package: "com.shayan.fitfaat",
      usesCleartextTraffic: true, // 👈 Required for HTTP (non-SSL) backend connections
      permissions: [
        "android.permission.CAMERA",
        "android.permission.RECORD_AUDIO",
        "android.permission.ACCESS_WIFI_STATE",
        "android.permission.ACCESS_NETWORK_STATE",
        "android.permission.MODIFY_AUDIO_SETTINGS",
      ],
      intentFilters: [
        {
          action: "VIEW",
          data: [
            {
              scheme: "fitfaat",
              host: "oauth-native-callback",
            },
            {
              scheme: "fitfaat",
              host: "*",
            },
            {
              scheme: "mobile",
              host: "oauth-native-callback",
            },
            {
              scheme: "mobile",
              host: "*",
            },
          ],
          category: ["BROWSABLE", "DEFAULT"],
        },
      ],
    },

    web: {
      bundler: "metro",
      output: "static",
      favicon: "./assets/images/favicon.png",
    },

    plugins: [
      "expo-router",
      [
        "expo-splash-screen",
        {
          image: "./assets/images/fitfaat-splash.png",
          imageWidth: 220,
          resizeMode: "contain",
          backgroundColor: "#ffffff",
        },
      ],
      "expo-web-browser",
      [
        "expo-camera",
        {
          cameraPermission:
            "Allow FitFaat to access your camera for video calls",
          microphonePermission:
            "Allow FitFaat to access your microphone for video calls",
          recordAudioAndroid: true,
        },
      ],
      [
        "expo-build-properties",
        {
          android: {
            usesCleartextTraffic: true,
            // 🔴 CRITICAL: MultiDex required for Zego (exceeds 64K method limit)
            multiDexEnabled: true,
            // Zego requires minimum SDK 21
            minSdkVersion: 21,
            // Zego needs specific compiler options
            kotlinVersion: "1.9.0",
            extraProguardRules: `
# Zego ProGuard rules
-keep class com.zegocloud.** { *; }
-keep class im.zego.** { *; }
-dontwarn com.zegocloud.**
-dontwarn im.zego.**
            `,
          },
        },
      ],
    ],

    experiments: {
      typedRoutes: true,
    },

    extra: {
      eas: {
        projectId: "5e5cb9e1-429d-47eb-a867-9281d377f425",
      },
      EXPO_PUBLIC_BACKEND_API_URL: process.env.EXPO_PUBLIC_BACKEND_API_URL,
      EXPO_PUBLIC_STRIPE_PK: process.env.EXPO_PUBLIC_STRIPE_PK,
      CLARIFAI_API_KEY: process.env.CLARIFAI_API_KEY,
      Email: process.env.Email,
      EmailPassword: process.env.EmailPassword,
      EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY: process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY,
      OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
      ZEGO_APP_ID: process.env.ZEGO_APP_ID,
      ZEGO_APP_SIGN: process.env.ZEGO_APP_SIGN,
    },
  },
};
