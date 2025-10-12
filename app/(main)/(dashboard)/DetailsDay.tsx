import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import Animated, { Easing, useAnimatedProps, useSharedValue, withTiming } from "react-native-reanimated";
import Svg, { Circle } from "react-native-svg";
import { Day as typeDay } from "./DayPlan";
//import { useRouter } from "expo-router";
//import { Topbar } from "@/components/common/TopBar";
//import { ProgressTracker } from "./circle";
//const props: typeDay = JSON.parse(day);
interface ProgressCircleProps {
  achievedCalories: number;
  targetCalories: number;
  achieviedHydration: number;
  targetHydration: number;
};

const AnimatedScrollView = Animated.createAnimatedComponent(ScrollView);
export default function DetailsDay () {
    const { selectedDay  } = useLocalSearchParams<{ selectedDay : string }>();
    const router = useRouter();
    const props: typeDay = JSON.parse(selectedDay )
    function getDate(){
        var currentTime = Date.now()
        const oldTime = new Date(props.duration*1000).getTime()
        currentTime = currentTime + oldTime;
        const date = new Date(currentTime);
        return date.toISOString().slice(11, 19); // "HH:MM:SS"
    }
    //states to track changes
    const [adviceInput, setAdviceInput] = useState<string>('');
    const [updateInput, setUpdateInput] = useState<string>('');
    const [timer, setTimer] = useState<string>(getDate())
    const [showMenu, setShowMenu] = useState<Boolean>(false)
    const fade = useSharedValue(1);
    // trigger fade-out + menu
    const openMenu = () => {
        fade.value = withTiming(0, { duration: 800}, ()=>{setShowMenu(true)});
    };
    const closeMenu = () => {
        setShowMenu(false)
        fade.value = withTiming(1, { duration: 500});
    };

    //functions
    const handleUpdate = () => {
        //Main api calling
    }
    //output
    return(<>{
        !showMenu? 
        <AnimatedScrollView showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 10, paddingBottom: 30 }} style={{ flex: 1, opacity: fade }}>
            <View style={styles.heading}>
            <View style={styles.dayDateWrapper}>
                <Text style={styles.title}>Day: 0{props.dayNo}</Text>
                <Text style={styles.date}>{props.date}</Text>
            </View>
            
            <Pressable style={styles.backButton} onPress={() => router.back()}>
                <Text style={styles.backButtonText}>← Back</Text>
            </Pressable>
            </View>

        <View style={styles.centerBody}>
            <View style={styles.circletext}>
                <Pressable style={{height:'90%', width:'100%'}} onPressOut={handleUpdate}>  {/**Remove if circle touch to update is rejected */}
                    <ProgressCircle achievedCalories={props.achievedCalories}
                                    achieviedHydration={props.achieviedHydration}
                                    targetCalories={props.targetCalories}
                                    targetHydration={props.targetHydration}/>
                </Pressable>
                <View style={{justifyContent: 'center', flexWrap: 'wrap' , alignContent:'center'}}>      
                    <Text>{props.remarks}</Text>
                </View>
            </View>
        {/**Determine wether to display Update Button or nnot */}
            { props.status==='active'? (
                <>
            <View style={styles.infoOuterBox}>
            <View style={styles.infoInnerBox}>
                {/**Flex rows for Heading: {value}*/}
                <View style={styles.infoRow}>
                    <Text style={styles.infoAttribute}>Goal </Text>
                    <Text style={styles.infoValue}>{props.targetCalories} cals, {props.targetHydration} lit</Text>
                </View>
                <View style={styles.infoRow}>
                    <Text style={styles.infoAttribute}>Calories </Text>
                    <Text style={styles.infoValue}>{props.achievedCalories} cals</Text>
                </View>
                <View style={styles.infoRow}>
                    <Text style={styles.infoAttribute}>Hydration   </Text>
                    <Text style={styles.infoValue}>{props.achieviedHydration} lit</Text>
                </View>
                <View style={styles.infoRow}>
                    <Text style={styles.infoAttribute}>Timer   </Text>
                    <Text style={styles.infoValue}>{timer}</Text>
                </View>
            </View>
                {/**Advice Section*/}
                <View style={styles.adviceSection}>
                    <Text style={styles.adviceHeading}>What's up!</Text>
                    <Text>{"Need any advice related to food?"}</Text>
                    <TextInput  style={styles.input}
                                value={adviceInput}
                                onChangeText={setAdviceInput}
                                placeholder="Type your question..."
                                />
                </View>
            </View>
            <View style={styles.tray}>
                <Pressable style={styles.trayButton} onPress={openMenu}>
                <Text style={styles.trayButtonText}>Update</Text>
                </Pressable>
            </View> 
            </>
            )
            : 
            <>
            <View style={styles.infoOuterBox}>
            <View style={[styles.infoInnerBox, {marginBottom: '2%'}] }>{/**extra margin for finished days */}
                {/**Flex rows for Heading: {value}*/}
                <View style={styles.infoRow}>
                    <Text style={styles.infoAttribute}>Goal </Text>
                    <Text style={styles.infoValue}>{props.targetCalories} cals, {props.targetHydration} lit</Text>
                </View>
                <View style={styles.infoRow}>
                    <Text style={styles.infoAttribute}>Calories </Text>
                    <Text style={styles.infoValue}>{props.achieviedHydration} cals</Text>
                </View>
                <View style={styles.infoRow}>
                    <Text style={styles.infoAttribute}>Hydration   </Text>
                    <Text style={styles.infoValue}>{props.achieviedHydration} lit</Text>
                </View>
                <View style={styles.infoRow}>
                    <Text style={styles.infoAttribute}>Timer   </Text>
                    <Text style={styles.infoValue}>{timer}</Text>
                </View>
            </View>
            </View>
            </>}
    </View>
        </AnimatedScrollView>
        :
        <View style={styles.menuOverlay}>
            <Text style={styles.menuTitle}>Tell Me About What you had in the Meantime</Text>
            <Text style={styles.label}>Time</Text>
            <TextInput /**Time when meal was had */
                style={styles.input}
                placeholder="HH:MM"
                keyboardType="numeric"/>
            <Text style={styles.label}>Food Name</Text>
          <TextInput style={styles.input} placeholder="e.g. Chicken Salad" />

          {/* Optional Description */}
          <Text style={styles.label}>Description (optional)</Text>
          <TextInput
            style={[styles.input, { height: 80 }]}
            placeholder="Short description..."
            multiline
          />
          <View style={styles.menuButtons}>
            <Pressable style={styles.backMenuButton} onPress={closeMenu}>
              <Text style={styles.backMenuText}>Back</Text>
            </Pressable>
            <Pressable style={styles.submitMenuButton} onPress={() => {}}>
              <Text style={styles.submitMenuText}>Submit</Text>
            </Pressable>
          </View>
        </View>
        }
        </>
    );
}
const styles = StyleSheet.create({
    heading: {
    flexDirection: 'row',
    alignItems: 'flex-end',       // align bottoms of Day + Date
    justifyContent: 'space-between', // push back button to end
    paddingHorizontal: 16,
    paddingTop: 30,
    marginBottom:10,
    //borderWidth:3
    },
    dayDateWrapper: {
        flexDirection: 'row',
        alignItems: 'flex-end',       // align bottoms of Day + Date
    },
    title: {
        fontSize: 36,
        fontWeight: 'bold',
        marginRight: 5,               // small spacing between day and date
    },
    date: {
        fontSize: 15,
        fontWeight: '500',
        paddingBottom: 5
    },
    backButton: {
        padding: 10,
    },
    backButtonText: {
        fontSize: 16,
        color: '#000',
        fontWeight: '600',
    },
    centerBody:{
        //borderColor: 'hsla(0, 1%, 27%, 1.00)',
        justifyContent:'flex-start',
    },
    circletext:{
        width: '80%',
        marginLeft:'10%',
        //alignContent: 'center',
        alignItems: 'center',
        //margin: '10%'
    },
    infoOuterBox:{
        width: "100%",
        maxWidth: 500,     // keeps it readable on tablets
        alignSelf: "center",
        borderWidth: 0,
        borderRadius: 12,
        marginTop: 20,
        marginBottom: 10,
        padding: 16,
        overflow: 'hidden',
        shadowColor: "#000",
        shadowOpacity: 0.5,
        shadowRadius: 10,
        elevation: 5, 
        backgroundColor: 'hsla(0, 0%, 90%, 1.00)'
    },
    infoInnerBox: {
        width: '95%',
        padding: 10,
        borderColor: 'black',
        borderWidth: 0,
        alignSelf:'center',
        borderRadius: 8,
        shadowColor: "hsla(0, 0%, 0%, 1.00)",
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 4,
        marginBottom: '0%', //this is  set to 2 inline when viewing finished days
        backgroundColor: 'hsla(45, 0%, 95%, 1.00)'

    },
    infoRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        paddingVertical: 6,
},

    infoAttribute:{
        fontFamily: 'inter',
        fontSize: 18,
        fontWeight:'600'
    },
    infoValue:{
        fontSize: 15,
        color: '#02ABFF',
        fontWeight:'600'
    },
    adviceSection: {
        marginTop: 15,
        padding: 10,
        borderRadius: 8,
        shadowColor: "#424242ff",
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 1,
    },
    adviceHeading: {
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 5,
    },
    input: {
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 6,
        marginTop: 8,
    },
    tray: {
        width: '100%',
        padding: 15,
        borderTopWidth: 1,
        borderTopColor: '#ddd',
        backgroundColor: '#fafafa',
        alignItems: 'center',
    },
    trayButton: {
        width: '90%',
        backgroundColor: '#02ABFF',
        paddingVertical: 15,
        borderRadius: 10,
        alignItems: 'center',
    },
    trayButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
    Foodtray: {
        width: "100%",
        padding: 15,
        borderTopWidth: 1,
        borderTopColor: "#ddd",
        backgroundColor: "#fafafa",
        alignItems: "center",
    },
    FoodSubmitButton: {
        width: "90%",
        backgroundColor: "#02ABFF",
        paddingVertical: 15,
        borderRadius: 10,
        alignItems: "center",
    },
    FoodSubmitButtonText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "700",
    },
    menuOverlay: {
        flex: 1,
        backgroundColor: "#fff",
        padding: 20,
        justifyContent: "center",
    },
    menuTitle: {
        fontSize: 22,
        fontWeight: "700",
        marginBottom: 20,
        textAlign: "center",
    },
    label: {
        fontSize: 16,
        fontWeight: "600",
        marginTop: 15,
    },
    Foodinput: {
        borderWidth: 1,
        borderColor: "#ccc",
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 8,
        marginTop: 8,
    },
    menuButtons: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginTop: 30,
    },
    backMenuButton: {
        flex: 1,
        marginRight: 10,
        paddingVertical: 12,
        borderWidth: 1,
        borderColor: "#02ABFF",
        borderRadius: 8,
        alignItems: "center",
    },
    backMenuText: {
        color: "#02ABFF",
        fontWeight: "600",
    },
    submitMenuButton: {
        flex: 1,
        marginLeft: 10,
        backgroundColor: "#02ABFF",
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: "center",
    },
    submitMenuText: {
        color: "#fff",
        fontWeight: "600",
    },

})

const AnimatedCircle = Animated.createAnimatedComponent(Circle)

const ProgressCircle = (CircleProps: ProgressCircleProps) =>{
    const outerRadius = 55;
    const innerRadius = 40;
    const outerCircumference = 2 * Math.PI * outerRadius;
    const innerCircumference = 2 * Math.PI * innerRadius;
    //Dynamic SVG stuff
    const calProgress = useSharedValue(0)
    const hydProgress = useSharedValue(0)
    /**ANIMATED PROPS */
    //Animated props for Calories circle
    const animatedCalProps = useAnimatedProps(()=>{
        return {
            strokeDashoffset: outerCircumference * (1 - calProgress.value),
        }
    },[CircleProps.achievedCalories])
    //Animated props for Hydration circle
    const animatedHydrationProps = useAnimatedProps(()=>{
        return {
            strokeDashoffset: innerCircumference * (1 - hydProgress.value),
        }
    },[CircleProps.achievedCalories])
    /**USE EFFECTS */
    // calories updater
    useEffect(()=>{
        //const target = props.achievedCalories/props.targetCalories
        calProgress.value = withTiming((CircleProps.achievedCalories/CircleProps.targetCalories),{  
                                        duration:1000,
                                        easing: Easing.inOut(Easing.ease)})
    },[CircleProps.achievedCalories])
    //hydration updater
    useEffect(()=>{
        hydProgress.value = withTiming((CircleProps.achieviedHydration/CircleProps.targetHydration),{  
                                        duration:1000,
                                        easing: Easing.inOut(Easing.ease)})
    },[CircleProps.achieviedHydration])
    /**---------------------------------------------------------------------------------------- */
    
    return(
        //<View style={{ width: "80%", aspectRatio: 1, alignSelf: "center" }}>
        <Svg width="100%" height={undefined} viewBox="0 0 120 120" style={{ maxWidth: 200, alignSelf: "center"}}>
        {/* Background circle of Calories */}
        <Circle  cx="60"  cy="60"  r={outerRadius}
                stroke="#E5E7EB"  strokeWidth="10"  fill="transparent"/>
        {/* Calories progress */}
        <AnimatedCircle  cx="60" cy="60" r={outerRadius}
            stroke="#4CAF50"  strokeWidth="10"  fill="transparent"
            strokeDasharray={outerCircumference} //total
            animatedProps={animatedCalProps}
            strokeLinecap="round"transform= "rotate(-90 60 60)" />
        {/* Hydration Circcle */}
        <AnimatedCircle cx="60" cy="60" r={innerRadius}
            stroke="#3B82F6"  strokeWidth="10" fill="transparent"
            strokeDasharray={innerCircumference} 
            animatedProps={animatedHydrationProps}
            strokeLinecap="round" transform="rotate(-90 60 60)"/> 
        </Svg>
            //</View>
    )
}