import { Ionicons } from "@expo/vector-icons";
import { DrawerActions } from "@react-navigation/native";
import { useTheme } from "@/contexts/ThemeContext";
import { useNavigation } from "expo-router";
import React from "react";
import {
    Image,
    StyleSheet, Text,
    TouchableOpacity,
    View
} from "react-native";
import {
    heightPercentageToDP as hp,
    widthPercentageToDP as wp,
} from "react-native-responsive-screen";
import WorkoutButton from '../WorkoutButton';



export const Topbar = () => {
    const navigation = useNavigation()
    const { colors } = useTheme();
    // |<3Bar menu----FitFaat>----------<()-()>|
    return(<>
    <View style={[styles.bar, { backgroundColor: colors.screenColor }]}>
        <View style={{flexDirection:'row'}}>
            <TouchableOpacity style={styles.menu}
                onPress={()=>{
                                navigation.dispatch(DrawerActions.toggleDrawer())
                            }} >
                <Ionicons name="menu" size={Math.min(hp(3.7), wp(8))} color={colors.textPrimary} />
            </TouchableOpacity>      
            <Text style={[styles.Logo, { color: colors.textPrimary }]}>FitFaat</Text>
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
        minHeight: hp(6.2),
    },
    Logo: {
        fontSize: Math.min(hp(3.1), wp(6.7)),
        fontWeight: 'bold',
        fontStyle: 'italic',
        //padding: 10,
        marginTop: hp(1.8),
        marginLeft: wp(6.7),
        //fontFamily: ''
    },
    menu:
    {
        marginLeft: wp(6.7),
        marginTop: hp(1.8),
        padding: wp(1.3),
        width: wp(6.4),
        height: hp(2.7)
    },
    workoutButtonContainer: {
        width: wp(12),
        height: hp(4.9),
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: wp(2.1),
        marginTop: hp(0.6),
    }
});
