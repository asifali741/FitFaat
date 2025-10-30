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
import WorkoutButton from '../WorkoutButton';



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
            <View style={styles.workoutButtonContainer}>
                {/* <WorkoutButton 
                    title="Premium"
                    style={{ 
                        transform: [{ scale: 0.5 }],
                        marginRight: -5,
                        marginTop: -3
                    }}
                /> */}
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
    workoutButtonContainer: {
        width: 45,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 8,
        marginTop: 5,
    }
});
