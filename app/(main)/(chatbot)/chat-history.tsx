import { useChatbotStorage } from "@/contexts/ChatbotStorage";
import { Ionicons } from "@expo/vector-icons";
import { DrawerActions, useNavigation } from "@react-navigation/native";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from "react-native-responsive-screen";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "@/contexts/ThemeContext";

export default function ChatHistoryScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const navigation = useNavigation();
  const { 
    sessions, 
    currentSession, 
    switchToSession, 
    deleteSession, 
    clearAllChats,
    exportChats 
  } = useChatbotStorage();
  const [selectedSession, setSelectedSession] = useState<string | null>(currentSession?.id || null);

  const openDrawer = () => {
    navigation.dispatch(DrawerActions.openDrawer());
  };

  const handleSessionSelect = (sessionId: string) => {
    setSelectedSession(sessionId);
    switchToSession(sessionId);
    router.push('/baat');
  };

  const handleDeleteSession = (sessionId: string) => {
    Alert.alert(
      "Delete Chat",
      "Are you sure you want to delete this chat session?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive",
          onPress: () => deleteSession(sessionId)
        }
      ]
    );
  };

  const handleClearAllChats = () => {
    Alert.alert(
      "Clear All Chats",
      "Are you sure you want to delete all chat sessions? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Clear All", 
          style: "destructive",
          onPress: () => {
            clearAllChats();
            setSelectedSession(null);
          }
        }
      ]
    );
  };

  const handleExportChats = async () => {
    try {
      const exportData = await exportChats();
      Alert.alert(
        "Export Successful",
        "Your chat data has been prepared for export. (In a real app, this would trigger a file download or share dialog)",
        [{ text: "OK" }]
      );
      console.log("Export data:", exportData);
    } catch (error) {
      Alert.alert("Export Failed", "Failed to export chat data");
    }
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) {
      return "Today";
    } else if (diffDays === 2) {
      return "Yesterday";
    } else if (diffDays <= 7) {
      return `${diffDays - 1} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const styles = getStyles(colors);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.menuButton}
          onPress={openDrawer}
        >
          <Ionicons name="menu" size={24} color={colors.textOnPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chat History</Text>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.textOnPrimary} />
        </TouchableOpacity>
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, styles.clearButton]}
            onPress={handleClearAllChats}
          >
            <Ionicons name="trash" size={20} color={colors.error} />
            <Text style={[styles.actionButtonText, styles.clearButtonText]}>Clear All</Text>
          </TouchableOpacity>
        </View>

        {/* Sessions List */}
        <ScrollView style={styles.sessionsList}>
          {!sessions || sessions.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="chatbubbles-outline" size={64} color={colors.textSecondary} />
              <Text style={styles.emptyStateTitle}>No Chat History</Text>
              <Text style={styles.emptyStateSubtitle}>
                Your conversations with HeaLora will appear here
              </Text>
              <TouchableOpacity
                style={styles.startChatButton}
                onPress={() => router.push('/(main)/(chatbot)/baat')}
              >
                <Text style={styles.startChatButtonText}>Start New Chat</Text>
              </TouchableOpacity>
            </View>
          ) : (
            sessions.map((session) => (
              <TouchableOpacity
                key={session.id}
                style={[
                  styles.sessionCard,
                  selectedSession === session.id && styles.selectedSessionCard
                ]}
                onPress={() => handleSessionSelect(session.id)}
              >
                <View style={styles.sessionHeader}>
                  <View style={styles.sessionInfo}>
                    <Text style={styles.sessionTitle}>{session.title}</Text>
                    <Text style={styles.sessionDate}>
                      {formatDate(session.lastMessageAt)}
                    </Text>
                  </View>
                  <View style={styles.sessionStats}>
                    <Text style={styles.messageCount}>{session.messageCount} messages</Text>
                    {selectedSession === session.id && (
                      <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                    )}
                  </View>
                </View>
                
                {session.messages.length > 0 && (
                  <Text style={styles.lastMessage} numberOfLines={2}>
                    {session.messages[session.messages.length - 1].text}
                  </Text>
                )}
                
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleDeleteSession(session.id)}
                >
                  <Ionicons name="trash-outline" size={16} color={colors.error} />
                </TouchableOpacity>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: wp(5),
    paddingVertical: hp(2),
    backgroundColor: colors.primary,
  },
  menuButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: hp(2.5),
    fontWeight: "bold",
    color: colors.textOnPrimary,
    flex: 1,
    textAlign: "center",
  },
  backButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    backgroundColor: colors.screenColor,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingTop: hp(3),
    paddingHorizontal: wp(5),
  },
  actionButtons: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: hp(3),
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    paddingHorizontal: wp(4),
    paddingVertical: hp(1.5),
    borderRadius: 15,
    justifyContent: "center",
  },
  clearButton: {
    backgroundColor: colors.error + "20",
  },
  actionButtonText: {
    fontSize: hp(1.6),
    fontWeight: "600",
    color: colors.primary,
    marginLeft: wp(2),
  },
  clearButtonText: {
    color: colors.white,
  },
  sessionsList: {
    flex: 1,
  },
  sessionCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 15,
    padding: hp(2),
    marginBottom: hp(1.5),
    borderWidth: 1,
    borderColor: colors.cardBorder,
    position: "relative",
  },
  selectedSessionCard: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  sessionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: hp(1),
  },
  sessionInfo: {
    flex: 1,
  },
  sessionTitle: {
    fontSize: hp(1.8),
    fontWeight: "bold",
    color: colors.textPrimary,
    marginBottom: hp(0.5),
  },
  sessionDate: {
    fontSize: hp(1.4),
    color: colors.textSecondary,
  },
  sessionStats: {
    flexDirection: "row",
    alignItems: "center",
  },
  messageCount: {
    fontSize: hp(1.3),
    color: colors.textSecondary,
    marginRight: wp(2),
  },
  lastMessage: {
    fontSize: hp(1.5),
    color: colors.textSecondary,
    lineHeight: hp(2),
    marginBottom: hp(1),
  },
  deleteButton: {
    position: "absolute",
    top: hp(1.5),
    right: hp(1.5),
    padding: hp(0.5),
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: hp(8),
  },
  emptyStateTitle: {
    fontSize: hp(2.2),
    fontWeight: "bold",
    color: colors.textPrimary,
    marginTop: hp(2),
    marginBottom: hp(1),
  },
  emptyStateSubtitle: {
    fontSize: hp(1.6),
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: hp(3),
  },
  startChatButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: wp(6),
    paddingVertical: hp(1.5),
    borderRadius: 25,
    shadowColor: colors.primary,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  startChatButtonText: {
    color: colors.textOnPrimary,
    fontSize: hp(1.8),
    fontWeight: "600",
  },
});
