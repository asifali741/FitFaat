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
      OPENROUTER_API_KEY: "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",
      EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_ZW1lcmdpbmctcGVnYXN1cy0xMi5jbGVyay5hY2NvdW50cy5kZXYk",
     
      // EXPO_PUBLIC_BACKEND_API_URL: "http://10.0.2.2:5001/api", 
      EXPO_PUBLIC_BACKEND_API_URL: "http://192.168.1.7:5001/api",
      // EXPO_PUBLIC_BACKEND_API_URL: "https://fitfaatbackend-production.up.railway.app/api",
      EXPO_PUBLIC_STRIPE_PK: "pk_test_51SUbhkPoREsUsXRD7Hecf6utdE2VWt89DHykcnNEWfaShrdc3kraUeoWEQhsBt9IjM4cv5R3F6WZE0OHhROByqnk00jLCklYPq",
      CLARIFAI_API_KEY: "2f0a0971e7164e52a7b005edf6798976",
      Email: "sohail.shafiq002@gmail.com",
      EmailPassword: "iiqo qzyw mmgh pvjz"
    },
  },
};