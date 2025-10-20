import { DrawerSceneWrapper } from "@/components/CustomDrawerLayout";
import { useAuth } from "@clerk/clerk-expo";
import { DrawerContentComponentProps } from "@react-navigation/drawer";
import { useRouter } from "expo-router";
import { Drawer } from "expo-router/drawer";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { colorsSheet as color } from "./(settings)/ui_elements";
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
    return <GestureHandlerRootView style={{flex: 1}}>
        <Drawer
            drawerContent={(props)=><DrawerSceneWrapper {...props}/>}
            screenOptions={{
                headerShown: false,
                drawerActiveBackgroundColor: color.drawerActiveTabColor, // && "#33b3a6",
                drawerInactiveBackgroundColor: "transparent",
                drawerActiveTintColor: "#FFFFFF",
                drawerInactiveTintColor: "#FFFFFF",
                overlayColor: "transparent",
                drawerStyle: {
                    backgroundColor: color.background ,//"#fa9579ff",
                    width: "60%",
                    paddingTop: 40,
                },
                drawerLabelStyle: {
                    marginLeft: -6,
                    fontSize: 18,
                    fontFamily: "PoppinsMedium500",
                    color: "#FFFFFF",
                },
                drawerItemStyle: {
                    marginLeft: -16,
                    marginRight: 35,
                    borderTopLeftRadius: 0,
                    borderBottomLeftRadius: 0,
                    borderTopRightRadius: 50,
                    borderBottomRightRadius: 50,
                },
                
                sceneStyle: {
                    backgroundColor: "#26867C",
                }
                }}
            >
      {/*add //options={{... , headerShown: false }}// to hide default Drawer Header */}

      <Drawer.Screen name="(dashboard)" options={{title : "Dashboard", headerShown: false}}/>
      <Drawer.Screen name="workout" options={{title : "👑 Workouts", headerShown: false}}/>
      <Drawer.Screen name="profile" options={{title : "Profile", headerShown: false}}/>
      <Drawer.Screen name="favorites" options={{title : "hide", headerShown: false, drawerItemStyle:{display:'none'}}}/>
      <Drawer.Screen name="exercises/[bodypart]" options={{title : "hide", headerShown: false, drawerItemStyle:{display:'none'}}}/>
      <Drawer.Screen name="exercise-details" options={{title : "hide", headerShown: false, drawerItemStyle:{display:'none'}}}/>
      <Drawer.Screen name="(chatbot)" options={{title : "Chatbot", headerShown: false}}/>
      <Drawer.Screen name="(conference)" options={{title : "Conference", headerShown: false}}/>
      <Drawer.Screen name="(settings)" options={{title : "Settings", headerShown: false}}/>
      <Drawer.Screen name="index" options={{title : "hide", headerShown: false, drawerItemStyle:{display:'none'}}}/>
    </Drawer>
  </GestureHandlerRootView>
}