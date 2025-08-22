import { Text, TouchableOpacity, View, Image } from "react-native";
import { useSocialAuth } from "@/hooks/useSocialAuth";
import { useFonts } from "expo-font";
import { useEffect, useState } from "react";
import "../../global.css";
import { styles } from "../(auth)/style";

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

  useEffect(() => {
    let i = 0;
    setVisibleText("");
    const intervalId = setInterval(() => {
      setVisibleText((prev) => {
        if (i >= FULL_TEXT.length) {
          clearInterval(intervalId);
          return prev;
        }
        const updatedText = prev + FULL_TEXT.charAt(i);
        i++;
        return updatedText;
      });
    }, 80);

    return () => clearInterval(intervalId); 
  }, []); 

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
          <Text className="font-bold" style={styles.googleText}>
            Sign in with Google
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
