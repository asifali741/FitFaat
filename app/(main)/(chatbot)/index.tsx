import { ChatBotStyles } from "@/components/ChatBotStyles";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Image, Text, TouchableOpacity, View } from "react-native";
import { heightPercentageToDP as hp } from "react-native-responsive-screen";

const FullText =
  "Hi, I am HeaLora, your AI-powered health companion. I’m designed to support you on your journey toward better well-being by combining advanced technology with personalized care.";
export default function Index() {
  const [visibleText, setVisibleText] = useState("");
  const router = useRouter();

  const iRef = useRef(0);
  useEffect(() => {
    setVisibleText("");
    iRef.current = 0;
    const interValId = setInterval(() => {
      setVisibleText((prev) => {
        if (iRef.current >= FullText.length) {
          clearInterval(interValId);
          return prev;
        }
        const updatedText = prev + FullText.charAt(iRef.current);
        iRef.current++;
        return updatedText;
      });
    }, 100);
    return () => clearInterval(interValId);
  }, []);
  return (
    <View style={ChatBotStyles.container}>
      <View style={{width: "100%", marginTop: hp(7),}}>
        <Text style={{ fontSize: hp(3.7), textAlign: "left", marginLeft: hp(2),}}>
          Conversations Redefined: {"\n"}
          The Future of Health Monitoring
        </Text>
      </View>
      <Image
        source={require("../../../assets/images/jarvis.png")}
        style={ChatBotStyles.indexImage}
      />
      <Text style={ChatBotStyles.mainHeading}>{visibleText}</Text>
      {/**Button of Navigation */}
      <TouchableOpacity
        onPress={() => {
          router.push("/baat");
        }}
        style={ChatBotStyles.startButton}
      >
        <Text style={{ color: "white", fontSize: hp(2.2) }}>Get Started</Text>
      </TouchableOpacity>
    </View>
    )
}
