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
                    backgroundColor: color.drawerBackground,
                    width: "75%",
                    paddingTop: 40,
                },
                drawerLabelStyle: {
                    marginLeft: 8,
                    fontSize: 18,
                    fontFamily: "PoppinsMedium500",
                    color: "#FFFFFF",
                    flexShrink: 1,
                    flexWrap: 'wrap',
                    flex: 1,
                },
                drawerItemStyle: {
                    marginHorizontal: 12,
                    marginVertical: 1,
                    borderRadius: 25,
                    paddingHorizontal: 20,
                    paddingVertical: 8,
                    minHeight: 45,
                    flexDirection: 'row',
                    alignItems: 'center',
                },
                
                sceneStyle: {
                    backgroundColor: "#FFFFFF",
                }
                }}
            >
      {/*add //options={{... , headerShown: false }}// to hide default Drawer Header */}

      <Drawer.Screen name="(dashboard)" options={{title : "Dashboard", headerShown: false}}/>
      <Drawer.Screen name="(chatbot)" options={{title : "Chatbot", headerShown: false}}/>
      <Drawer.Screen name="(conference)" options={{title : "Conference", headerShown: false}}/>
      <Drawer.Screen name="(settings)" options={{title : "Settings", headerShown: false}}/>
      <Drawer.Screen name="(exercises)/workout" options={{title : "Workouts 👑", headerShown: false}}/>
      <Drawer.Screen name="(doctor-portal)" options={{title : "Join as Doctor 👨‍⚕️", headerShown: false}}/>
      <Drawer.Screen name="profile" options={{title : "hide", headerShown: false, drawerItemStyle:{display:'none'}}}/>
      <Drawer.Screen name="(exercises)/favorites" options={{title : "hide", headerShown: false, drawerItemStyle:{display:'none'}}}/>
      <Drawer.Screen name="(exercises)/[bodypart]" options={{title : "hide", headerShown: false, drawerItemStyle:{display:'none'}}}/>
      <Drawer.Screen name="(exercises)/exercise-details" options={{title : "hide", headerShown: false, drawerItemStyle:{display:'none'}}}/>
      <Drawer.Screen name="index" options={{title : "hide", headerShown: false, drawerItemStyle:{display:'none'}}}/>
    </Drawer>
  </GestureHandlerRootView>
}