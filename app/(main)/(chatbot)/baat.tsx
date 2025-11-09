import { useTheme } from "@/contexts/ThemeContext";
import AppHeader from "@/components/AppHeader";
import EnhancedMessage from "@/components/EnhancedMessage";
import TypingIndicator from "@/components/TypingIndicator";
import QuickActions from "@/components/QuickActions";
import { useChatbotStorage } from "@/contexts/ChatbotStorage";
import Controls from "@/Control/controls";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { FlatList, Image, KeyboardAvoidingView, Platform, StyleSheet, Text, View, TouchableOpacity, TouchableWithoutFeedback, Keyboard, Alert, KeyboardEvent } from "react-native";
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from "react-native-responsive-screen";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { callGemini } from "@/utils/api";
import * as Speech from 'expo-speech';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
export default function Baat() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { 
    messages: storedMessages, 
    addMessage, 
    createNewSession, 
    currentSession,
    isLoading 
  } = useChatbotStorage();
  const router = useRouter();
  const flatListRef = useRef<FlatList>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [bookmarkedMessages, setBookmarkedMessages] = useState<string[]>([]);
  const [latestMessageId, setLatestMessageId] = useState<string | null>(null);
  const [isSpeakerEnabled, setIsSpeakerEnabled] = useState(true);
  const [speechInitialized, setSpeechInitialized] = useState(false);
  const [currentSpeechText, setCurrentSpeechText] = useState<string>("");
  const [speechPosition, setSpeechPosition] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [hasSpokenWelcome, setHasSpokenWelcome] = useState(false);
  const [animatingMessageIds, setAnimatingMessageIds] = useState<Set<string>>(new Set());

  // Convert stored messages to display format
  const displayMessages = storedMessages && storedMessages.length > 0 
    ? storedMessages.map(msg => ({
        id: msg.id,
        role: msg.isUser ? "user" as const : "assistant" as const,
        content: msg.text,
        createdAt: msg.timestamp
      }))
    : [{ ...WelcomeText, id: 'welcome' }];

  // Initialize session and load messages
  useEffect(() => {
    if (!currentSession && !isLoading) {
      createNewSession();
    }
  }, [currentSession, isLoading, createNewSession]);
  
  // Initialize speech system
  useEffect(() => {
    const initSpeech = async () => {
      try {
        const voices = await Speech.getAvailableVoicesAsync();
        if (voices && voices.length > 0) {
          setSpeechInitialized(true);
        }
      } catch (error) {
        console.error('Failed to initialize speech:', error);
      }
    };
    initSpeech();
  }, []);

  // Speak welcome message when chat loads for the first time or new session is created
  useEffect(() => {
    const isWelcomeScreen = displayMessages && displayMessages.length === 1 && displayMessages[0]?.id === 'welcome';
    
    if (isWelcomeScreen && isSpeakerEnabled && !hasSpokenWelcome) {
      // Mark welcome message for typewriter animation
      setAnimatingMessageIds(prev => new Set(prev).add('welcome'));
      
      // Small delay to ensure UI is ready, then speak in parallel with typewriter
      setTimeout(() => {
        speakText(WelcomeText.content);
        setHasSpokenWelcome(true);
      }, 500);
    }
    
    // Reset flag when messages change (user sends a message)
    if (displayMessages && displayMessages.length > 1) {
      setHasSpokenWelcome(false);
      // Clear welcome from animating IDs when user starts chatting
      setAnimatingMessageIds(prev => {
        const newSet = new Set(prev);
        newSet.delete('welcome');
        return newSet;
      });
    }
  }, [displayMessages?.length, isSpeakerEnabled, currentSession]);

  // Handle keyboard events
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e: KeyboardEvent) => {
        setKeyboardHeight(e.endCoordinates.height);
        // Auto scroll to bottom when keyboard opens
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    );
    
    const keyboardDidHideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
      }
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  // Speech functions
  const speakText = async (text: string, fromPosition: number = 0) => {
    if (!text || !isSpeakerEnabled) return;
    
    // Stop any current speech first
    try {
      await Speech.stop();
    } catch (e) {
      // Ignore error if nothing is playing
    }
    
    // If resuming from a position, slice the text
    const textToSpeak = fromPosition > 0 ? text.substring(fromPosition) : text;
    
    if (textToSpeak.length === 0) return;
    
    setCurrentSpeechText(text);
    setIsSpeaking(true);
    
    // Check if speech is available
    const isAvailable = await Speech.getAvailableVoicesAsync();
    if (!isAvailable || isAvailable.length === 0) {
      console.warn('No voices available');
      setIsSpeaking(false);
      return;
    }
    
    // Select appropriate female voice based on platform
    let voiceId = undefined;
    if (Platform.OS === 'ios') {
      // iOS female voices
      const femaleVoices = ['com.apple.voice.compact.en-US.Samantha', 
                           'com.apple.ttsbundle.Samantha-compact',
                           'com.apple.ttsbundle.siri_female_en-US_compact'];
      for (const voice of femaleVoices) {
        if (isAvailable.find(v => v.identifier === voice)) {
          voiceId = voice;
          break;
        }
      }
    } else {
      // Android: find any English female voice
      const femaleVoice = isAvailable.find(v => 
        v.language.includes('en') && 
        (v.name?.toLowerCase().includes('female') || 
         v.name?.toLowerCase().includes('woman') ||
         v.identifier?.toLowerCase().includes('female'))
      );
      voiceId = femaleVoice?.identifier;
    }
    
    Speech.speak(textToSpeak, {
      language: 'en-US',
      rate: 1.15,
      pitch: Platform.OS === 'ios' ? 1.1 : 1.2,
      voice: voiceId,
      onDone: () => {
        setIsSpeaking(false);
        setSpeechPosition(0);
        setCurrentSpeechText("");
      },
      onStopped: () => {
        setIsSpeaking(false);
      },
      onError: (error) => {
        console.error('Speech error:', error);
        setIsSpeaking(false);
        setSpeechPosition(0);
      }
    });
  };

  const pauseSpeech = () => {
    if (isSpeaking) {
      Speech.stop();
      setIsSpeaking(false);
      // Don't clear currentSpeechText so we can resume if needed
    }
  };

  const resumeSpeech = async () => {
    // Resume from beginning if we have text stored
    if (currentSpeechText && !isSpeaking) {
      // Use speakText for consistency
      await speakText(currentSpeechText);
    }
  };

  const toggleSpeaker = () => {
    const newState = !isSpeakerEnabled;
    
    if (!newState) {
      // Speaker disabled - stop speech immediately
      pauseSpeech();
    }
    
    setIsSpeakerEnabled(newState);
    
    // Use setTimeout to ensure state is updated before checking
    if (newState) {
      setTimeout(() => {
        if (currentSpeechText && !isSpeaking) {
          // Speaker re-enabled - resume the last text
          resumeSpeech();
        }
      }, 50);
    }
  };

  const handleAddMessage = async (text: string, isUser: boolean) => {
    // Stop any ongoing speech when a new message comes (especially user messages)
    if (isUser && isSpeaking) {
      try {
        await Speech.stop();
        setIsSpeaking(false);
        setCurrentSpeechText("");
      } catch (e) {
        // Ignore error
      }
    }
    
    // Just add the message to storage
    addMessage(text, isUser);
    
    // Scroll to bottom after message is added
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const handleTextUpdate = () => {
    // Smooth scroll as text appears
    flatListRef.current?.scrollToEnd({ animated: true });
  };

  const handleQuickAction = async (question: string, answer: string) => {
    // Stop any ongoing speech immediately
    try {
      await Speech.stop();
      setIsSpeaking(false);
      setCurrentSpeechText("");
    } catch (e) {
      // Ignore error
    }
    
    // Add the question as user message first
    addMessage(question, true);
    
    // Scroll to show user message
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
    
    // Show typing indicator
    setIsTyping(true);
    
    // Simulate processing delay and then add bot response
    setTimeout(() => {
      setIsTyping(false);
      
      // Add the predefined answer as bot response first
      const responseId = Date.now().toString();
      setLatestMessageId(responseId);
      // Mark this message for typewriter animation
      setAnimatingMessageIds(prev => new Set(prev).add(responseId));
      addMessage(answer, false);
      
      // Start speaking immediately for parallel delivery with typewriter
      if (isSpeakerEnabled) {
        // Speak in parallel with typewriter effect
        speakText(answer);
      } else {
        // Store the text for later if speaker is re-enabled
        setCurrentSpeechText(answer);
      }
      
      // Scroll to show bot response
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }, 800); // Reduced delay for quicker response
  };

  const handleBookmark = async (content: string) => {
    try {
      // Load existing bookmarks
      const stored = await AsyncStorage.getItem('chatbot_bookmarks');
      const existingBookmarks = stored ? JSON.parse(stored) : [];
      
      // Create new bookmark
      const newBookmark = {
        id: Date.now().toString() + Math.random().toString(),
        content,
        timestamp: new Date().toISOString()
      };
      
      // Save updated bookmarks
      const updatedBookmarks = [newBookmark, ...existingBookmarks];
      await AsyncStorage.setItem('chatbot_bookmarks', JSON.stringify(updatedBookmarks));
      
      // Update local state
      setBookmarkedMessages(prev => [...prev, content]);
    } catch (error) {
      console.error('Error saving bookmark:', error);
      Alert.alert('Error', 'Failed to save bookmark');
    }
  };

  const handleViewHistory = () => {
    router.push('/(main)/(chatbot)/chat-history');
  };

  const handleViewBookmarks = () => {
    router.push('/(main)/(chatbot)/bookmarks');
  };

  const handleNewChat = () => {
    // Stop any ongoing speech
    pauseSpeech();
    // Reset welcome speech flag
    setHasSpokenWelcome(false);
    // Create a new session without clearing others
    createNewSession();
    // Clear current messages display
    setLatestMessageId(null);
    // Optionally show a toast or feedback
    Alert.alert('New Chat', 'Started a new conversation with HeaLora');
  };

  const handleScrollToBottom = () => {
    flatListRef.current?.scrollToEnd({ animated: true });
  };

  const handleScroll = (event: any) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const isNearBottom = contentOffset.y + layoutMeasurement.height >= contentSize.height - 100;
    setShowScrollButton(!isNearBottom);
  };

  const styles = getStyles(colors, insets);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <AppHeader 
        title="HeaLora Chat"
        showStepIndicator={false}
        showBackButton={true}
        showMenuButton={false}
        rightComponent={
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={handleViewBookmarks} style={styles.headerButton}>
              <Ionicons name="bookmark-outline" size={24} color={colors.textOnPrimary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleViewHistory} style={styles.headerButton}>
              <Ionicons name="time-outline" size={24} color={colors.textOnPrimary} />
            </TouchableOpacity>
          </View>
        }
      />

      {/* Chat Content wrapped in KeyboardAvoidingView */}
      <KeyboardAvoidingView 
        style={styles.keyboardAvoidContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
          <View style={styles.content}>
          <View style={styles.aiProfileSection}>
            <Image
              source={require("../../../assets/images/jarvis.png")}
              style={styles.aiAvatar}
            />
            <Text style={styles.aiName}>HeaLora</Text>
            <Text style={styles.aiStatus}>Your AI Health Companion</Text>
          </View>
          
          {/* Quick Actions Carousel */}
          {displayMessages && displayMessages.length === 1 && displayMessages[0]?.id === 'welcome' && (
            <QuickActions onActionPress={handleQuickAction} />
          )}
          
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.chatSection}>
              <FlatList
              ref={flatListRef}
              data={displayMessages}
              extraData={[storedMessages?.length || 0, isTyping]}
              keyExtractor={(item) => item.id || Math.random().toString()}
              renderItem={({ item, index }) => {
                const isLatestAssistant = index === displayMessages.length - 1 && item.role === 'assistant';
                const shouldAnimate = isLatestAssistant && (animatingMessageIds.has(item.id) || item.id === latestMessageId);
                
                return (
                  <EnhancedMessage 
                    msg={item} 
                    onBookmark={handleBookmark}
                    onTextUpdate={handleTextUpdate}
                    isLatest={shouldAnimate}
                  />
                );
              }}
              ListFooterComponent={isTyping ? <TypingIndicator /> : null}
              contentContainerStyle={styles.messageList}
              showsVerticalScrollIndicator={false}
              keyboardDismissMode="on-drag"
              keyboardShouldPersistTaps="handled"
              onScroll={handleScroll}
              scrollEventThrottle={16}
              onContentSizeChange={() => {
                // Auto-scroll when content changes (new messages)
                if ((storedMessages && storedMessages.length > 0) || isTyping) {
                  flatListRef.current?.scrollToEnd({ animated: true });
                }
              }}
              onLayout={() => {
                // Scroll to bottom when layout changes
                if (storedMessages && storedMessages.length > 0) {
                  setTimeout(() => {
                    flatListRef.current?.scrollToEnd({ animated: false });
                  }, 100);
                }
              }}
              />
            </View>
          </TouchableWithoutFeedback>
          
          <View style={styles.inputWrapper}>
            {/* Scroll to bottom button positioned above input */}
            {showScrollButton && (
              <TouchableOpacity 
                style={styles.scrollToBottomButton}
                onPress={handleScrollToBottom}
              >
                <Ionicons name="chevron-down-circle" size={36} color={colors.primary} />
              </TouchableOpacity>
            )}
            <Controls 
              onAddMessage={handleAddMessage}
              onTypingChange={setIsTyping}
              isSpeakerEnabled={isSpeakerEnabled}
              onToggleSpeaker={toggleSpeaker}
              onSpeakText={speakText}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
      
      {/* Floating Action Button for New Chat - hide when keyboard is open */}
      {keyboardHeight === 0 && (
        <TouchableOpacity 
          style={styles.fabNewChat}
          onPress={handleNewChat}
          activeOpacity={0.7}
        >
          <View style={styles.fabInner}>
            <Ionicons name="add" size={32} color={colors.textOnPrimary} />
          </View>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const getStyles = (colors: any, insets: any) => StyleSheet.create({
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    padding: hp(0.5),
    marginLeft: wp(2),
  },
  container: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  keyboardAvoidContainer: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  content: {
    flex: 1,
    backgroundColor: colors.screenColor,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
  },
  aiProfileSection: {
    alignItems: "center",
    paddingVertical: hp(1.5),
    backgroundColor: colors.primarySoft,
    marginHorizontal: wp(4),
    marginTop: hp(1.5),
    borderRadius: 15,
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
  chatSection: {
    flex: 1,
    paddingHorizontal: wp(2),
    position: 'relative',
  },
  messageList: {
    padding: hp(1),
    paddingBottom: hp(12), // Back to higher padding
    flexGrow: 1,
  },
  inputWrapper: {
    paddingHorizontal: wp(0),
    paddingBottom: Platform.OS === 'ios' ? hp(4) : hp(3), // Back to higher position
    paddingTop: hp(0.5),
    backgroundColor: 'transparent',
    marginBottom: Platform.OS === 'ios' ? hp(2) : hp(3), // Back to original margin
  },
  scrollToBottomButton: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? hp(9) : hp(8), // Adjusted for keyboard
    alignSelf: 'center',
    width: hp(5),
    height: hp(5),
    borderRadius: hp(2.5),
    backgroundColor: colors.screenColor,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    zIndex: 10,
  },
  fabNewChat: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? hp(15) : hp(14), // Back to higher position
    right: wp(5),
    width: hp(7),
    height: hp(7),
    borderRadius: hp(3.5),
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 12,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    zIndex: 100,
    borderWidth: 3,
    borderColor: colors.screenColor,
  },
  fabInner: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

// const MESSAGES: ChatMessage[] = [
//   { role: "user", content: "Hello" },
//   { role: "assistant", content: "Hello. How can I help you?" },
// ];
