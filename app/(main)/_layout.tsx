import { DrawerSceneWrapper } from "@/components/CustomDrawerLayout";
import { AppointmentProvider } from "@/contexts/AppointmentContext";
import { ChatbotStorageProvider } from "@/contexts/ChatbotStorage";
import { useAuth } from "@clerk/clerk-expo";
import { DrawerContentComponentProps } from "@react-navigation/drawer";
import { useRouter } from "expo-router";
import { Drawer } from "expo-router/drawer";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { colorsSheet as color } from "./(settings)/_ui_elements";
type DrawerSceneWrapperProps = DrawerContentComponentProps;

export default function MainLayout() {
    const { isSignedIn } = useAuth();
    const router = useRouter();
    console.log('Landed in (main)\_Layout')
    //check signin status in case of expiration
    useEffect(() => {
    if (!isSignedIn) {
      router.replace("/(auth)");
    }
  }, [isSignedIn]);
    return <GestureHandlerRootView style={{ flex: 1 }}>
  <AppointmentProvider>
  <ChatbotStorageProvider>
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
    <Drawer.Screen 
      name="(dashboard)" 
      options={{ 
        title: "Dashboard",
      }} 
    />
    <Drawer.Screen 
      name="(chatbot)" 
      options={{ 
        title: "Chatbot",
      }} 
    />
    <Drawer.Screen 
      name="(conference)" 
      options={{ 
        title: "Conference",
      }} 
    />
    <Drawer.Screen 
      name="(settings)" 
      options={{ 
        title: "Settings",
      }} 
    />
    <Drawer.Screen 
      name="(exercises)" 
      options={{ 
        title: "Workouts 👑",
        animationEnabled: false,
      }} 
    />
    <Drawer.Screen 
      name="(doctor-portal)" 
      options={{ 
        title: "Join as Doctor 👨‍⚕️",
      }} 
    />
    <Drawer.Screen 
      name="profile" 
      options={{ 
        title: "Profile",
      }} 
    />
  </Drawer>
  </ChatbotStorageProvider>
  </AppointmentProvider>
</GestureHandlerRootView>

}