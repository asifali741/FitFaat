import { useTheme } from "@/contexts/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View, Share } from "react-native";
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from "react-native-responsive-screen";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Clipboard from 'expo-clipboard';

type BookmarkedMessage = {
  id: string;
  content: string;
  timestamp: Date;
};

export default function BookmarksScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [bookmarks, setBookmarks] = useState<BookmarkedMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadBookmarks();
  }, []);

  const loadBookmarks = async () => {
    try {
      setIsLoading(true);
      const stored = await AsyncStorage.getItem('chatbot_bookmarks');
      if (stored) {
        const parsed = JSON.parse(stored).map((bookmark: any) => ({
          ...bookmark,
          timestamp: new Date(bookmark.timestamp)
        }));
        setBookmarks(parsed);
      }
    } catch (error) {
      console.error('Error loading bookmarks:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveBookmarks = async (updatedBookmarks: BookmarkedMessage[]) => {
    try {
      await AsyncStorage.setItem('chatbot_bookmarks', JSON.stringify(updatedBookmarks));
    } catch (error) {
      console.error('Error saving bookmarks:', error);
    }
  };

  const handleDeleteBookmark = (id: string) => {
    Alert.alert(
      "Delete Bookmark",
      "Are you sure you want to delete this bookmark?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            const updated = bookmarks.filter(b => b.id !== id);
            setBookmarks(updated);
            saveBookmarks(updated);
          }
        }
      ]
    );
  };

  const handleClearAll = () => {
    Alert.alert(
      "Clear All Bookmarks",
      "Are you sure you want to delete all bookmarks? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear All",
          style: "destructive",
          onPress: () => {
            setBookmarks([]);
            saveBookmarks([]);
          }
        }
      ]
    );
  };

  const handleCopy = async (content: string) => {
    await Clipboard.setStringAsync(content);
    Alert.alert('Copied', 'Message copied to clipboard');
  };

  const handleShare = async (content: string) => {
    try {
      await Share.share({
        message: content,
      });
    } catch (error) {
      console.error('Error sharing:', error);
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
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.textOnPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Bookmarks</Text>
        <View style={styles.spacer} />
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        {/* Action Buttons */}
        {bookmarks.length > 0 && (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, styles.clearButton]}
              onPress={handleClearAll}
            >
              <Ionicons name="trash" size={20} color={colors.error} />
              <Text style={[styles.actionButtonText, styles.clearButtonText]}>Clear All</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Bookmarks List */}
        <ScrollView style={styles.bookmarksList}>
          {bookmarks.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="bookmark-outline" size={64} color={colors.textSecondary} />
              <Text style={styles.emptyStateTitle}>No Bookmarks</Text>
              <Text style={styles.emptyStateSubtitle}>
                Bookmark important health responses to save them here
              </Text>
              <TouchableOpacity
                style={styles.backToChatButton}
                onPress={() => router.back()}
              >
                <Text style={styles.backToChatButtonText}>Back to Chat</Text>
              </TouchableOpacity>
            </View>
          ) : (
            bookmarks.map((bookmark) => (
              <View key={bookmark.id} style={styles.bookmarkCard}>
                <View style={styles.bookmarkHeader}>
                  <Ionicons name="bookmark" size={20} color={colors.primary} />
                  <Text style={styles.bookmarkDate}>
                    {formatDate(bookmark.timestamp)}
                  </Text>
                </View>
                
                <Text style={styles.bookmarkContent}>{bookmark.content}</Text>
                
                <View style={styles.bookmarkActions}>
                  <TouchableOpacity
                    style={styles.actionIcon}
                    onPress={() => handleCopy(bookmark.content)}
                  >
                    <Ionicons name="copy-outline" size={20} color={colors.textSecondary} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.actionIcon}
                    onPress={() => handleShare(bookmark.content)}
                  >
                    <Ionicons name="share-outline" size={20} color={colors.textSecondary} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.actionIcon}
                    onPress={() => handleDeleteBookmark(bookmark.id)}
                  >
                    <Ionicons name="trash-outline" size={20} color={colors.error} />
                  </TouchableOpacity>
                </View>
              </View>
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
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: hp(2.5),
    fontWeight: "bold",
    color: colors.textOnPrimary,
    flex: 1,
    textAlign: "center",
  },
  spacer: {
    width: 40,
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
    justifyContent: "flex-end",
    marginBottom: hp(2),
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    paddingHorizontal: wp(4),
    paddingVertical: hp(1.5),
    borderRadius: 15,
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
    color: colors.error,
  },
  bookmarksList: {
    flex: 1,
  },
  bookmarkCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 15,
    padding: hp(2),
    marginBottom: hp(1.5),
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  bookmarkHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: hp(1),
  },
  bookmarkDate: {
    fontSize: hp(1.4),
    color: colors.textSecondary,
    marginLeft: wp(2),
  },
  bookmarkContent: {
    fontSize: hp(1.7),
    color: colors.textPrimary,
    lineHeight: hp(2.5),
    marginBottom: hp(1.5),
  },
  bookmarkActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
    paddingTop: hp(1),
  },
  actionIcon: {
    marginLeft: wp(4),
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
    paddingHorizontal: wp(8),
  },
  backToChatButton: {
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
  backToChatButtonText: {
    color: colors.textOnPrimary,
    fontSize: hp(1.8),
    fontWeight: "600",
  },
});
