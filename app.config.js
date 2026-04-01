import 'dotenv/config';

export default {
  expo: {
    name: "mobile",
    slug: "mobile",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "mobile", 
    userInterfaceStyle: "automatic",
    newArchEnabled: true, // 👈 MUST be true for Reanimated/Worklets to build

    ios: {
      supportsTablet: true,
    },

    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/images/adaptive-icon.png",
        backgroundColor: "#ffffff",
      },
      edgeToEdgeEnabled: true,
      package: "com.shayan.fitfaat",
      intentFilters: [
        {
          action: "VIEW",
          data: [
            {
              scheme: "mobile",
              host: "oauth-native-callback",
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
          image: "./assets/images/splash-icon.png",
          imageWidth: 200,
          resizeMode: "contain",
          backgroundColor: "#ffffff",
        },
      ],
      "expo-web-browser",
    ],

    experiments: {
      typedRoutes: true,
    },

    extra: {
      eas: {
        projectId: "0dcfb6cf-6803-4ec4-bda1-a6c442b19fb1"
      },
      EXPO_PUBLIC_BACKEND_API_URL: process.env.EXPO_PUBLIC_BACKEND_API_URL, 
      EXPO_PUBLIC_STRIPE_PK: process.env.EXPO_PUBLIC_STRIPE_PK,
      CLARIFAI_API_KEY: process.env.CLARIFAI_API_KEY,
      Email: process.env.Email,
      EmailPassword: process.env.EmailPassword,
      EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY: process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY,
      OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
    },
  },
};