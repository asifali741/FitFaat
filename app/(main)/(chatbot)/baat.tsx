import AppHeader from "@/components/AppHeader";
import Message from "@/components/Message";
import { useChatbotStorage } from "@/contexts/ChatbotStorage";
import { useTheme } from "@/contexts/ThemeContext";
import Controls from "@/Control/controls";
import * as NavigationBar from 'expo-navigation-bar';
import * as SystemUI from 'expo-system-ui';
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { FlatList, Image, Keyboard, KeyboardAvoidingView, Platform, StatusBar, StyleSheet, Text, View } from "react-native";
import type { KeyboardEvent } from "react-native";
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from "react-native-responsive-screen";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
// type ChatMessage = {
//   role: string;
//   content: string;
// };

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  createdAt?: Date;
};

const WelcomeText: ChatMessage = {
  role: "assistant",
  content:
    "Hello, I am HeaLora, your AI-powered health companion. How can I assist you today?",
}

const ANDROID_KEYBOARD_EXTRA_LIFT = hp(11);

export default function Baat() {
  const { colors, isDarkMode } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    messages: storedMessages,
    addMessage,
    createNewSession,
    currentSession,
    isLoading,
  } = useChatbotStorage();
  const flatListRef = useRef<FlatList<ChatMessage>>(null);
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);
  const [keyboardLift, setKeyboardLift] = useState(0);

  // Keep a stable ref to addMessage even if it changes
  const addMessageRef = useRef(addMessage);
  useEffect(() => {
    addMessageRef.current = addMessage;
  }, [addMessage]);

  // Initialize session and load messages
  useEffect(() => {
    if (!currentSession && !isLoading) {
      createNewSession();
    }
  }, [currentSession, isLoading, createNewSession]);

  // Convert stored messages to display format
  const displayMessages: ChatMessage[] = storedMessages.length > 0
    ? storedMessages.map(msg => ({
        role: msg.isUser ? "user" as const : "assistant" as const,
        content: msg.text,
        createdAt: msg.timestamp
      }))
    : [WelcomeText];

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (displayMessages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [displayMessages.length]);

  const handleAddMessage = useCallback((text: string, isUser: boolean, source?: string) => {
    try {
      addMessageRef.current(text, isUser);
    } catch (err) {
      console.error('Error adding message:', err);
    }
  }, []); // Empty dependency array since we use ref

  const scrollToBottom = useCallback((animated = true) => {
    requestAnimationFrame(() => {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated });
      }, Platform.OS === 'ios' ? 80 : 120);
    });
  }, []);

  const openChatHistory = useCallback(() => {
    router.push("/(main)/(chatbot)/chat-history" as any);
  }, [router]);

  useEffect(() => {
    const handleKeyboardShow = (event: KeyboardEvent) => {
      Keyboard.scheduleLayoutAnimation(event);
      setKeyboardVisible(true);
      setKeyboardLift(
        Platform.OS === 'android'
          ? Math.max(0, (event.endCoordinates?.height ?? 0) - insets.bottom + ANDROID_KEYBOARD_EXTRA_LIFT)
          : 0
      );
      scrollToBottom();
    };

    const handleKeyboardHide = (event: KeyboardEvent) => {
      Keyboard.scheduleLayoutAnimation(event);
      setKeyboardVisible(false);
      setKeyboardLift(0);
    };

    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSubscription = Keyboard.addListener(showEvent, handleKeyboardShow);
    const hideSubscription = Keyboard.addListener(hideEvent, handleKeyboardHide);

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, [insets.bottom, scrollToBottom]);

  const styles = getStyles(colors, insets, isKeyboardVisible, keyboardLift);

  useFocusEffect(
    useCallback(() => {
      if (Platform.OS !== 'android') return;

      SystemUI.setBackgroundColorAsync('#FFFFFF').catch(() => {});
      NavigationBar.setButtonStyleAsync('dark').catch(() => {});
      NavigationBar.setStyle('light');

      return () => {
        SystemUI.setBackgroundColorAsync('#FFFFFF').catch(() => {});
        NavigationBar.setButtonStyleAsync('dark').catch(() => {});
        NavigationBar.setStyle('light');
      };
    }, [])
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={colors.screenColor}
      />
      <View style={styles.container}>
        <View style={styles.headerContainer}>
          <AppHeader
            title="HeaLora Chat"
            showStepIndicator={false}
            rightActions={[
              {
                icon: "time-outline",
                accessibilityLabel: "Open chat history",
                onPress: openChatHistory,
              },
            ]}
          />
        </View>

        <KeyboardAvoidingView
          style={styles.content}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={0}
        >
          <View style={styles.chatShell}>
            <FlatList
              ref={flatListRef}
              data={displayMessages}
              keyExtractor={(_, index) => index.toString()}
              renderItem={({ item }) => <Message msg={item} />}
              ListHeaderComponent={
                <View style={styles.aiProfileSection}>
                  <Image
                    source={require("../../../assets/images/jarvis.png")}
                    style={styles.aiAvatar}
                  />
                  <Text style={styles.aiName}>HeaLora</Text>
                  <Text style={styles.aiStatus}>Your AI Health Companion</Text>
                </View>
              }
              style={styles.messageListContainer}
              contentContainerStyle={styles.messageList}
              showsVerticalScrollIndicator={false}
              keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
              keyboardShouldPersistTaps="handled"
              onContentSizeChange={() => scrollToBottom()}
              onLayout={() => scrollToBottom(false)}
            />

            <View style={styles.inputContainer}>
              <Controls
                onAddMessage={handleAddMessage}
                sessionId={currentSession?.id}
                onInputFocus={() => scrollToBottom()}
              />
            </View>
            {Platform.OS === 'android' && !isKeyboardVisible && insets.bottom > 0 && (
              <View style={styles.androidNavigationBarBackground} />
            )}
          </View>
        </KeyboardAvoidingView>
      </View>
    </SafeAreaView>
  );
}

const getStyles = (colors: any, insets: any, isKeyboardVisible: boolean, keyboardLift: number) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.screenColor,
  },
  container: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  headerContainer: {
    position: 'relative',
  },
  clearButtonText: {
    color: '#fff',
    fontSize: hp(1.6),
    fontWeight: '600',
  },
  content: {
    flex: 1,
    backgroundColor: colors.screenColor,
  },
  chatShell: {
    flex: 1,
    backgroundColor: colors.screenColor,
    borderTopLeftRadius: wp(8),
    borderTopRightRadius: wp(8),
    overflow: 'hidden',
  },
  aiProfileSection: {
    alignItems: "center",
    paddingVertical: hp(1.5),
    backgroundColor: colors.primarySoft,
    marginHorizontal: wp(4),
    marginTop: hp(1.5),
    borderRadius: wp(4),
  },
  aiAvatar: {
    width: Math.min(hp(6), wp(15)),
    height: Math.min(hp(6), wp(15)),
    borderRadius: Math.min(hp(3), wp(7.5)),
    marginBottom: hp(0.5),
  },
  aiName: {
    fontSize: Math.min(hp(2), wp(5)),
    fontWeight: "bold",
    color: colors.textPrimary,
  },
  aiStatus: {
    fontSize: Math.min(hp(1.4), wp(3.5)),
    color: colors.textSecondary,
    marginTop: hp(0.3),
  },
  messageListContainer: {
    flex: 1,
  },
  messageList: {
    flexGrow: 1,
    paddingHorizontal: wp(2),
    padding: hp(1),
    paddingBottom: hp(1.5),
  },
  inputContainer: {
    backgroundColor: colors.screenColor,
    left: 0,
    right: 0,
    marginBottom: keyboardLift,
    paddingTop: hp(0.5),
    paddingBottom: isKeyboardVisible
      ? hp(0.6)
      : Platform.OS === 'android'
        ? hp(0.6)
        : Math.max(insets.bottom, hp(2)),
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  androidNavigationBarBackground: {
    height: insets.bottom,
    backgroundColor: '#FFFFFF',
  },
});

// const MESSAGES: ChatMessage[] = [
//   { role: "user", content: "Hello" },
//   { role: "assistant", content: "Hello. How can I help you?" },
// ];
