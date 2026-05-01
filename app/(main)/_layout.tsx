console.log("TOP OF FILE")
import { DrawerSceneWrapper } from "@/components/CustomDrawerLayout";
import { AppointmentProvider } from "@/contexts/AppointmentContext";
import { ChatbotStorageProvider } from "@/contexts/ChatbotStorage";
import { ZegoCallProvider } from "@/contexts/ZegoCallProvider";
import { NewsProvider } from "@/contexts/NewsContext";
import { useTheme } from "@/contexts/ThemeContext";
import { authApi } from "@/utils/auth/authApi";
import { tokenStorage } from "@/utils/auth/tokenStorage";
import { useAuth } from "@clerk/clerk-expo";
import { DrawerContentComponentProps } from "@react-navigation/drawer";
import { BottomTabBar } from "@/components/BottomTabBar";
import Constants from "expo-constants";
import { useRouter } from "expo-router";
import { Drawer } from "expo-router/drawer";
import { useEffect, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from "react-native-responsive-screen";
import { getBackendBaseUrl } from '@/utils/config';
type DrawerSceneWrapperProps = DrawerContentComponentProps;

export default function MainLayout() {
    const { colors } = useTheme();
    const router = useRouter();
    const { isLoaded: isClerkLoaded, isSignedIn } = useAuth();
    const [isDoctor, setIsDoctor] = useState(false);
    const [doctorName, setDoctorName] = useState("");
    const [isPremium, setIsPremium] = useState(false);
    const [loading, setLoading] = useState(true);
    console.log('Landed in (main)\\_Layout', { isDoctor, doctorName, isPremium });
    
    useEffect(() => {
      if (!isClerkLoaded) return;

      let isActive = true;

      const checkAuth = async () => {
        try {
          const hasBackendSession = await authApi.isAuthenticated();
          if (!hasBackendSession && !isSignedIn) {
            router.replace("/(auth)");
            return;
          }

          if (isSignedIn) {
            setIsDoctor(false);
            setDoctorName("");
            setIsPremium(false);
            return;
          }
          
          // Check if user is a doctor
          try {
            const doctorStatus = await authApi.getDoctorStatus();
            console.log('Doctor Status Response:', doctorStatus);
            if (doctorStatus.success && doctorStatus.doctor) {
              setIsDoctor(true);
              const name = doctorStatus.doctor.name || doctorStatus.doctor.fullName || "Doctor";
              setDoctorName(name);
              console.log('User is a doctor:', name);
            } else {
              setIsDoctor(false);
              console.log('Not a doctor - response:', doctorStatus);
            }
          } catch (error: any) {
            // User is not a doctor, keep isDoctor as false
            setIsDoctor(false);
            console.log('User is not a doctor - error:', error?.response?.data || error.message);
          }

          // Check if user is premium
          try {
            const token = await tokenStorage.getToken();
            if (token) {
              const ENV = Constants.expoConfig?.extra;
              const API_URL = getBackendBaseUrl();
              const response = await fetch(`${API_URL}/api/payment/premium-status`, {
                method: 'GET',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
              });
              const premiumStatus = await response.json();
              console.log('Premium Status Response:', premiumStatus);
              if (premiumStatus.success && premiumStatus.isPremium && premiumStatus.premiumSubscription?.status === 'active') {
                setIsPremium(true);
                console.log('User is premium');
              } else {
                setIsPremium(false);
                console.log('User is not premium');
              }
            }
          } catch (error: any) {
            // User is not premium
            setIsPremium(false);
            console.log('Premium check error:', error?.message);
          }

        } catch (error) {
          console.error('Auth check error:', error);
          router.replace("/(auth)");
        } finally {
          if (isActive) {
            setLoading(false);
          }
        }
      };
      
      checkAuth();
      return () => {
        isActive = false;
      };
    }, [isClerkLoaded, isSignedIn, router]);

    // Memoize drawer options to ensure they update when state changes
    const conferenceOptions = useMemo(() => ({
      title: "Conference",
      drawerItemStyle: isDoctor ? { height: 0, overflow: 'hidden' as const } : {},
    }), [isDoctor]);

    const doctorPortalOptions = useMemo(() => ({
      title: isDoctor && doctorName ? `Dr. ${doctorName} 👨‍⚕️` : "Join as Doctor 👨‍⚕️"
    }), [isDoctor, doctorName]);

    const workoutOptions = useMemo(() => ({
      title: "Workouts 👑",
    }), []);

    if (loading || !isClerkLoaded) {
      return null; // or a loading screen
    }
    return <GestureHandlerRootView style={{ flex: 1 }}>
  <ZegoCallProvider>
  <AppointmentProvider>
  <ChatbotStorageProvider>
  <NewsProvider>
  <View style={{ flex: 1, backgroundColor: colors.background }}>
    <Drawer
      detachInactiveScreens={true}
      drawerContent={(props) => <DrawerSceneWrapper {...props} />}
      screenOptions={{
        lazy: true,
        headerShown: false,
        drawerActiveBackgroundColor: colors.primary,
        drawerInactiveBackgroundColor: "transparent",
        drawerActiveTintColor: colors.textOnPrimary,
        drawerInactiveTintColor: colors.drawerTintColor,
        overlayColor: "transparent",
        drawerStyle: {
          backgroundColor: colors.drawerBackground,
          width: wp(75),
          paddingTop: hp(4.9),
        },
        drawerLabelStyle: {
          marginLeft: wp(2),
          fontSize: Math.min(hp(2.2), wp(4.8)),
          fontFamily: "PoppinsMedium500",
          color: colors.drawerTintColor,
        },
        drawerItemStyle: {
          marginHorizontal: wp(3.2),
          marginVertical: hp(0.2),
          borderRadius: wp(6.5),
          paddingHorizontal: wp(5),
          paddingVertical: hp(1),
          minHeight: hp(5.6),
          flexDirection: "row",
          alignItems: "center",
        },
        sceneStyle: { backgroundColor: colors.screenColor },
      }}
    >
      <Drawer.Screen name="index" options={{ drawerItemStyle: { height: 0 } }} />
      <Drawer.Screen name="(dashboard)" options={{ title: "Dashboard" }} />
      <Drawer.Screen name="(chatbot)" options={{ title: "Chatbot" }} />
      <Drawer.Screen 
        name="(conference)" 
        options={conferenceOptions}
      />
      <Drawer.Screen name="(news)" options={{ title: "📰 News" }} />
      <Drawer.Screen name="(settings)" options={{ title: "Settings" }} />
      <Drawer.Screen 
        name="(exercises)/workout" 
        options={workoutOptions}
      />
      <Drawer.Screen 
        name="(doctor-portal)" 
        options={doctorPortalOptions}
      />
    </Drawer>
    <BottomTabBar />
  </View>
  </NewsProvider>
  </ChatbotStorageProvider>
  </AppointmentProvider>
  </ZegoCallProvider>
</GestureHandlerRootView>

}

const styles = StyleSheet.create({});
