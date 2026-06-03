import { ScreenSceneWrapper } from "@/components/common/ScreenTiltAnimation";
import { ChatbotStorageProvider } from "@/contexts/ChatbotStorage";
import { Slot } from "expo-router";

export default function ChatbotLayout() {
  return (
    <ScreenSceneWrapper>
      <ChatbotStorageProvider>
        <Slot />
      </ChatbotStorageProvider>
    </ScreenSceneWrapper>
  );
}
