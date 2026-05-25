import { ScreenSceneWrapper } from "@/components/common/ScreenTiltAnimation";
import { Slot } from "expo-router";

export default function DoctorReportLayout() {
  return (
    <ScreenSceneWrapper>
      <Slot />
    </ScreenSceneWrapper>
  );
}

