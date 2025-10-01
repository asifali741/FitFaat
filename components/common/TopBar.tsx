import { Ionicons } from "@expo/vector-icons";
import { DrawerActions } from "@react-navigation/native";
import { useNavigation } from "expo-router";
import React from "react";
import {
    Image,
    StyleProp,
    StyleSheet, Text,
    TouchableOpacity,
    useWindowDimensions, View,
    ViewStyle
} from "react-native";

type props = {
    styleName: string
}
type WorkoutShortcutProps = {
    styleName: keyof typeof styles; // keyof and typeof are keywords, stylesis imported from react-native
};


export const Topbar = () => {
    const navigation = useNavigation()
    const {width, height} = useWindowDimensions();
    const dynamicStyles = {
        //for responsive width
        bar : {
            width: width,
        }
    };
    const WorkoutShortcut: React.FC<WorkoutShortcutProps> = ({ styleName }) => {
    const dynamic = styles[styleName] as StyleProp<ViewStyle>; 
        //console.log(dynamicStyle);
    return <>
        <View style={[styles.circle, dynamic]}>
            {
                styleName==='workout'? 
                <>
                    <Image source={require('../../assets/images/PremiumTry.png')} style={styles.circleImg} ></Image>
                    <Text style={styles.tinyWriting}>workout subscription</Text>
                </>
                    :
                    <Image source={require('../../assets/images/Default_Profile.png')} style={styles.circleProfile}></Image>
            }
        </View>
    </>
}
    // |-3Bar menu----FitFaat----------()-()|
    return(<>
    <View style={[dynamicStyles.bar, styles.bar]}>
        <TouchableOpacity onPress={()=>{navigation.dispatch(DrawerActions.toggleDrawer())
                                        }} 
                                    style={styles.image}>
            <Ionicons name="menu" size={30} color="#000" />
        </TouchableOpacity>      
        <Text style={styles.Logo}>FitFaat</Text>
        <WorkoutShortcut styleName='workout'></WorkoutShortcut>
        <WorkoutShortcut styleName='profile'></WorkoutShortcut>
    </View>
    </>);
}
const styles = StyleSheet.create({
    bar:
    {
        height: 55,
        display: 'flex',
        flexDirection: 'row'
    },
    Logo: {
        fontSize: 25,
        fontWeight: 'bold',
        fontStyle: 'italic',
        padding: 10,
        marginLeft: 15,
        //fontFamily: ''
    },
    image:
    {
        marginLeft: 25,
        marginTop: 15,
        padding: 5,
        width: 24,
        height: 22
    },
    workout:
    {
        right: 10+10+35,
        marginTop: 10
    },
    profile:
    {
        position: 'absolute',
        right: 10,
        marginTop: 10
    },
    circle: {
        width: 35,
        height: 35,
        borderRadius: 35,
        borderColor: 'black',
        borderStyle: 'solid',
        borderWidth: 2,
        position: 'absolute',
        padding: 2,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        alignContent: 'center',
        //backgroundColor: 'blue',
    },
    circleImg: {
        width: '45%', 
        height: '45%', 
        //resizeMode: 'contain'
        //backgroundColor: 'blue',
    },
    circleProfile: {
        width: '95%', 
        height: '95%',
        resizeMode: 'contain'
        //backgroundColor: 'blue',
    },
    tinyWriting:
    {
        fontSize: 4,
        textAlign:'center'
    }
});