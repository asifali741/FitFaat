import { ScreenSceneWrapper } from "@/components/common/ScreenTiltAnimation";
import { Slot } from "expo-router";

export default function DoctorPortalLayout() {
  return (
    <ScreenSceneWrapper>
      <Slot />
    </ScreenSceneWrapper>
  );
}
