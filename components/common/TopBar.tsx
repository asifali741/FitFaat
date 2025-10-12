import { Ionicons } from "@expo/vector-icons";
import { DrawerActions } from "@react-navigation/native";
import { useNavigation } from "expo-router";
import React from "react";
import {
    Image,
    StyleSheet, Text,
    TouchableOpacity,
    View
} from "react-native";

type props = {
    styleName: string
}
type WorkoutShortcutProps = {
    styleName: keyof typeof styles; // keyof and typeof are keywords, stylesis imported from react-native
};


export const Topbar = () => {
    const navigation = useNavigation()
    // |<3Bar menu----FitFaat>----------<()-()>|
    return(<>
    <View style={[styles.bar]}>
        <View style={{flexDirection:'row'}}>
            <TouchableOpacity style={styles.menu}
                onPress={()=>{
                                navigation.dispatch(DrawerActions.toggleDrawer())
                            }} >
                <Ionicons name="menu" size={30} color="#000" />
            </TouchableOpacity>      
            <Text style={styles.Logo}>FitFaat</Text>
        </View>
        <View style={{flexDirection:'row'}}>
            <View style={styles.circle}>
                <Image source={require('../../assets/images/PremiumTry.png')} style={styles.circleImg} ></Image>
                <Text style={styles.tinyWriting}>workout</Text>   
            </View>
            <View style={styles.circle}>
                <Image source={require('../../assets/images/Default_Profile.png')} style={styles.circleProfile}></Image>
            </View>
        </View>
    </View>
    </>);
}
const styles = StyleSheet.create({
    bar:
    {
        //flex: 1,
        height: '5%',
        //display: 'flex',
        justifyContent: 'space-between',
        flexDirection: 'row',
        alignItems: 'flex-end',
        minHeight: 50,
    },
    Logo: {
        fontSize: 25,
        fontWeight: 'bold',
        fontStyle: 'italic',
        //padding: 10,
        marginTop: 15,
        marginLeft: 25,
        //fontFamily: ''
    },
    menu:
    {
        marginLeft: 25,
        marginTop: 15,
        padding: 5,
        width: 24,
        height: 22
    },
    circle: {
        width: 40,
        height: 40,
        borderRadius: 35,
        borderColor: 'black',
        borderStyle: 'solid',
        borderWidth: 2,
        //position: 'absolute',
        marginRight: 15,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
        //flexWrap: 'nowrap',
        //alignContent: 'center',
        //backgroundColor: 'blue',
    },
    circleImg: {
        width: '45%', 
        height: '45%', 
        //resizeMode: 'contain'
        //backgroundColor: 'blue',
    },
    circleProfile: {
        width: 30,
        height: 30,
        //alignSelf: 'center',
        resizeMode: 'contain',
        //backgroundColor: 'blue',
    },
    tinyWriting:
    {
        fontSize: 5,
        textAlign:'center',
    }
});