import { useAuth } from "@clerk/clerk-expo";
import { useFonts } from "expo-font";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Image, Text, TouchableOpacity, View } from "react-native";
import { styles } from "../(auth)/style.js";
import "../../global.css";
import { useSocialAuth } from '../../hooks/useSocialAuth';

const FULL_TEXT =
  "FitFaat is a smart health and nutrition app designed to seamlessly integrate into daily life, making healthy living accessible, practical, and affordable. With personalized 7-day diet plans generated from user details, interactive chatbot support, one-on-one video consultations with nutritionists, and structured workout modules, FitFaat empowers users to take full control of their wellness journey. ";

export default function Index() {
  const { handleGoogleAuth } = useSocialAuth();
  const [visibleText, setVisibleText] = useState("");
  const [fontsLoaded] = useFonts({
    Pacifico: require("../../assets/fonts/Pacifico-Regular.ttf"),
    LoraItalic: require("../../assets/fonts/static/Lora-Italic.ttf"),
    LoraRegular: require("../../assets/fonts/static/Lora-Regular.ttf"),
  });

  const iRef = useRef(0); // <-- useRef to persist value


  const { isSignedIn } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isSignedIn) {
      // If already signed in, jump to dashboard
      router.replace('/(main)/(dashboard)')
    }
  }, [isSignedIn]);


  // ... existing code ...
  useEffect(() => {
    setVisibleText("");
    iRef.current = 0;
    const intervalId = setInterval(() => {
      setVisibleText((prev) => {
        if (iRef.current >= FULL_TEXT.length) {
          clearInterval(intervalId);
          return prev;
        }
        const updatedText = prev + FULL_TEXT.charAt(iRef.current);
        iRef.current++;
        return updatedText;
      });
    }, 80);

    return () => clearInterval(intervalId);
  }, []); // Keep empty dependency array
  // ... existing code ...

  if (!fontsLoaded) return null;

  return (
    <View style={styles.container}>
      <Image
        source={require("../../assets/images/salad.jpg")}
        style={styles.bannerImage}
      />
      <View style={styles.mainHeading}>
        <Text style={styles.mainHeadingText}>Welcome To</Text>
        <Image
          source={require("../../assets/images/logo.png")}
          style={styles.logoStyle}
        />
      </View>
      <View>
        <Text style={styles.paragraphText}>{visibleText}</Text>
      </View>
      <View style={styles.buttonPosition}>
        <TouchableOpacity
          onPress={handleGoogleAuth}
          style={styles.buttonDesign}
        >
          <Image
            source={require("../../assets/images/goog.png")}
            style={styles.googleLogo}
          />
          <Text style={styles.googleText}>Sign in with Google</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
