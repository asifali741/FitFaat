import { DrawerSceneWrapper } from "@/components/CustomDrawerLayout";
import { AppointmentProvider } from "@/contexts/AppointmentContext";
import { ChatbotStorageProvider } from "@/contexts/ChatbotStorage";
import { NewsProvider } from "@/contexts/NewsContext";
import { authApi } from "@/utils/auth/authApi";
import { tokenStorage } from "@/utils/auth/tokenStorage";
import { DrawerContentComponentProps } from "@react-navigation/drawer";
import { useRouter } from "expo-router";
import { Drawer } from "expo-router/drawer";
import { useEffect, useMemo, useState } from "react";
import { Platform, StyleSheet } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { colorsSheet as color } from "./(settings)/_ui_elements";
type DrawerSceneWrapperProps = DrawerContentComponentProps;

export default function MainLayout() {
    const router = useRouter();
    const [isDoctor, setIsDoctor] = useState(false);
    const [doctorName, setDoctorName] = useState("");
    const [isPremium, setIsPremium] = useState(false);
    const [loading, setLoading] = useState(true);
    console.log('Landed in (main)\_Layout', { isDoctor, doctorName, isPremium });
    
    useEffect(() => {
      const checkAuth = async () => {
        try {
          const isAuthenticated = await authApi.isAuthenticated();
          if (!isAuthenticated) {
            router.replace("/(auth)");
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
              const API_URL = Platform.OS === 'android' ? 'http://10.0.2.2:5001' : 'http://localhost:5001';
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
          setLoading(false);
        }
      };
      
      checkAuth();
    }, []);

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

    if (loading) {
      return null; // or a loading screen
    }
    return <GestureHandlerRootView style={{ flex: 1 }}>
  <AppointmentProvider>
  <ChatbotStorageProvider>
  <NewsProvider>
  <Drawer
    detachInactiveScreens={true}
    drawerContent={(props) => <DrawerSceneWrapper {...props} />}
    screenOptions={{
      lazy: true,
      headerShown: false,
      drawerActiveBackgroundColor: color.drawerActiveTabColor,
      drawerInactiveBackgroundColor: "transparent",
      drawerActiveTintColor: "#FFFFFF",
      drawerInactiveTintColor: "#FFFFFF",
      overlayColor: "transparent",
      drawerStyle: {
        backgroundColor: color.drawerBackground,
        width: "75%",
        paddingTop: 40,
      },
      drawerLabelStyle: {
        marginLeft: 8,
        fontSize: 18,
        fontFamily: "PoppinsMedium500",
        color: "#FFFFFF",
      },
      drawerItemStyle: {
        marginHorizontal: 12,
        marginVertical: 1,
        borderRadius: 25,
        paddingHorizontal: 20,
        paddingVertical: 8,
        minHeight: 45,
        flexDirection: "row",
        alignItems: "center",
      },
      sceneStyle: { backgroundColor: "#FFFFFF" },
    }}
  >
    <Drawer.Screen name="index" options={{ drawerItemStyle: { height: 0 } }} />
    <Drawer.Screen name="(tabs)" options={{ drawerItemStyle: { height: 0 } }} />
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

  </NewsProvider>
  </ChatbotStorageProvider>
  </AppointmentProvider>
</GestureHandlerRootView>

}

const styles = StyleSheet.create({});
