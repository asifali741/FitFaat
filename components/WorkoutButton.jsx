import { View, Text, TouchableOpacity, Animated } from "react-native";
import React, { useRef, useEffect } from "react";
import { 
  widthPercentageToDP as wp, 
  heightPercentageToDP as hp 
} from "react-native-responsive-screen";
import { useRouter } from "expo-router";
import { DrawerActions } from '@react-navigation/native';
import Svg, { Path } from "react-native-svg";
import { MaterialIcons } from "@expo/vector-icons";

export default function WorkoutButton({ 
  onPress, 
  title = "Start Workout", 
  style = {},
  navigation // Accept navigation prop for drawer usage
}) {
  const router = useRouter();
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Subtle pulsing animation for the button
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.05,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    );

    // Crown rotation animation
    const rotate = Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 3000,
        useNativeDriver: true,
      })
    );

    pulse.start();
    rotate.start();

    return () => {
      pulse.stop();
      rotate.stop();
    };
  }, [scaleAnim, rotateAnim]);

  const handlePress = () => {
    // Scale down animation on press
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    if (onPress) {
      onPress();
    } else {
      // Default navigation - navigate to workout screen
      try {
        // Close drawer if opened from drawer
        if (navigation) {
          navigation.dispatch(DrawerActions.closeDrawer());
        }
        
        router.push("/(main)/workout");
        console.log("Workout button pressed - navigating to workout screen");
      } catch (error) {
        console.log("Navigation error:", error);
        // Fallback action
        console.log("Workout button pressed - no navigation configured");
      }
    }
  };

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  // Crown Icon Component with fallback
  const CrownIcon = ({ size = hp(4), color = "#FFD700" }) => {
    // Try SVG first, fallback to MaterialIcons if SVG fails
    try {
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
          <Path d="M5 16L3 5L8.5 10L12 4L15.5 10L21 5L19 16H5ZM12 14C13.1 14 14 13.1 14 12S13.1 10 12 10S10 10.9 10 12S10.9 14 12 14Z" />
        </Svg>
      );
    } catch (error) {
      // Fallback to Expo vector icon
      return (
        <MaterialIcons 
          name="workspace-premium" 
          size={size * 0.8} 
          color={color} 
        />
      );
    }
  };

  return (
    <View style={[{ alignItems: 'center', justifyContent: 'center' }, style]}>
      <Animated.View
        style={{
          transform: [{ scale: scaleAnim }],
        }}
      >
        <TouchableOpacity
          onPress={handlePress}
          activeOpacity={0.8}
          style={{
            width: wp(25),
            height: wp(25),
            borderRadius: wp(12.5),
            backgroundColor: '#FF6B6B',
            justifyContent: 'center',
            alignItems: 'center',
            shadowColor: '#000',
            shadowOffset: {
              width: 0,
              height: 8,
            },
            shadowOpacity: 0.3,
            shadowRadius: 10,
            elevation: 10,
            borderWidth: 3,
            borderColor: '#FFD700',
          }}
        >
          {/* Gradient overlay effect */}
          <View
            style={{
              position: 'absolute',
              width: '100%',
              height: '100%',
              borderRadius: wp(12.5),
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
            }}
          />
          
          {/* Content Layout */}
          {title ? (
            // Show text with small crown when title is provided
            <>
              <Animated.View
                style={{
                  transform: [{ rotate: spin }],
                  marginBottom: hp(0.3),
                }}
              >
                <CrownIcon size={hp(2.5)} color="#FFD700" />
              </Animated.View>
              
              <Text
                style={{
                  color: 'white',
                  fontSize: hp(1.4),
                  fontWeight: 'bold',
                  textAlign: 'center',
                  textShadowColor: 'rgba(0, 0, 0, 0.5)',
                  textShadowOffset: { width: 1, height: 1 },
                  textShadowRadius: 2,
                }}
              >
                {title === "Premium Workout" ? "Premium" : title}
              </Text>
            </>
          ) : (
            // Show only crown when no title (for compact mode)
            <Animated.View
              style={{
                transform: [{ rotate: spin }],
              }}
            >
              <CrownIcon size={hp(5)} color="#FFD700" />
            </Animated.View>
          )}
        </TouchableOpacity>
      </Animated.View>
      
      {/* Optional subtitle - only show for full-size version */}
      {title && title.length > 8 && (
        <Text
          style={{
            marginTop: hp(1),
            fontSize: hp(1.4),
            color: '#666',
            fontWeight: '600',
          }}
        >
          Premium Workouts
        </Text>
      )}
    </View>
  );
}