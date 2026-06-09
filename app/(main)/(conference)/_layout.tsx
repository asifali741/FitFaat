import { ScreenSceneWrapper } from "@/components/common/ScreenTiltAnimation";
import { Slot, usePathname } from "expo-router";
import { View, useWindowDimensions } from "react-native";

export default function ConferenceLayout() {
  const { width, height } = useWindowDimensions();
  const pathname = usePathname();

  // CRITICAL: Skip ScreenSceneWrapper for video-call screen.
  // ZegoCloud renders native camera/video views that crash inside
  // Reanimated Animated.View with 3D transforms (perspective, rotateY)
  // and overflow:"hidden".
  const isVideoCall = pathname?.includes('video-call');

  if (isVideoCall) {
    return (
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        <Slot />
      </View>
    );
  }

  return (
    <ScreenSceneWrapper>
      <View style={{ width, height }}>
        <Slot />
      </View>
    </ScreenSceneWrapper>
  );
}
