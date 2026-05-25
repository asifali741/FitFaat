import { ScreenSceneWrapper } from "@/components/common/ScreenTiltAnimation";
import { Slot } from "expo-router";

export default function MindfulnessLayout() {
  return (
    <ScreenSceneWrapper>
      <Slot />
    </ScreenSceneWrapper>
  );
}
