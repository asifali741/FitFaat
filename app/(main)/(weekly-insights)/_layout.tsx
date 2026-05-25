import { ScreenSceneWrapper } from "@/components/common/ScreenTiltAnimation";
import { Slot } from "expo-router";

export default function WeeklyInsightsLayout() {
  return (
    <ScreenSceneWrapper>
      <Slot />
    </ScreenSceneWrapper>
  );
}

