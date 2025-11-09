import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated , Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from 'react-native-responsive-screen';
import { useTheme } from '@/contexts/ThemeContext';
import * as Clipboard from 'expo-clipboard';

import TypewriterText from './TypewriterText';

type MessageProps = {
  msg: {
    role: 'user' | 'assistant';
    content: string;
    createdAt?: Date;
  };
  onBookmark?: (content: string) => void;
  onTextUpdate?: () => void;
  isLatest?: boolean;
};

const reactions = ['👍', '❤️', '🔥', '💡', '⭐'];

export default function EnhancedMessage({ msg, onBookmark, onTextUpdate, isLatest = false }: MessageProps) {
  const { colors } = useTheme();
  const [selectedReaction, setSelectedReaction] = useState<string | null>(null);
  const [showReactions, setShowReactions] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [animationComplete, setAnimationComplete] = useState(!isLatest || msg.role === 'user');
  const scaleAnim = useRef(new Animated.Value(0)).current;

  const isUser = msg.role === 'user';
  const styles = getStyles(colors, isUser);

  const handleLongPress = () => {
    setShowReactions(true);
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  const handleReaction = (reaction: string) => {
    setSelectedReaction(reaction);
    setShowReactions(false);
    Animated.timing(scaleAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  const handleCopy = async () => {
    await Clipboard.setStringAsync(msg.content);
    Alert.alert('Copied', 'Message copied to clipboard');
  };

  const handleBookmark = () => {
    setIsBookmarked(!isBookmarked);
    if (!isBookmarked && onBookmark) {
      onBookmark(msg.content);
      Alert.alert('Bookmarked', 'Message saved to bookmarks');
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={styles.messageContent}
        onLongPress={handleLongPress}
        activeOpacity={0.8}
      >
        {msg.role === 'assistant' && isLatest && !animationComplete ? (
          <TypewriterText
            text={msg.content}
            speed={20}
            style={styles.messageText}
            onComplete={() => setAnimationComplete(true)}
            onTextUpdate={onTextUpdate}
          />
        ) : (
          <Text style={styles.messageText}>{msg.content}</Text>
        )}
        
        {msg.createdAt && (
          <Text style={styles.timestamp}>
            {new Date(msg.createdAt).toLocaleTimeString([], { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </Text>
        )}

        {selectedReaction && (
          <View style={styles.selectedReaction}>
            <Text style={styles.reactionEmoji}>{selectedReaction}</Text>
          </View>
        )}
      </TouchableOpacity>

      {!isUser && (
        <View style={styles.actionButtons}>
          <TouchableOpacity onPress={handleCopy} style={styles.actionButton}>
            <Ionicons name="copy-outline" size={16} color={colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleBookmark} style={styles.actionButton}>
            <Ionicons 
              name={isBookmarked ? "bookmark" : "bookmark-outline"} 
              size={16} 
              color={isBookmarked ? colors.primary : colors.textSecondary} 
            />
          </TouchableOpacity>
        </View>
      )}

      {showReactions && (
        <Animated.View 
          style={[
            styles.reactionsContainer,
            {
              transform: [{ scale: scaleAnim }],
              opacity: scaleAnim,
            }
          ]}
        >
          {reactions.map((reaction) => (
            <TouchableOpacity
              key={reaction}
              onPress={() => handleReaction(reaction)}
              style={styles.reactionButton}
            >
              <Text style={styles.reactionEmoji}>{reaction}</Text>
            </TouchableOpacity>
          ))}
        </Animated.View>
      )}
    </View>
  );
}

const getStyles = (colors: any, isUser: boolean) => StyleSheet.create({
  container: {
    alignSelf: isUser ? 'flex-end' : 'flex-start',
    marginHorizontal: hp(2),
    marginVertical: hp(0.5),
    maxWidth: '80%',
    position: 'relative',
  },
  messageContent: {
    backgroundColor: isUser ? colors.primary : colors.primarySoft,
    borderRadius: hp(2),
    borderBottomLeftRadius: isUser ? hp(2) : hp(0.5),
    borderBottomRightRadius: isUser ? hp(0.5) : hp(2),
    paddingHorizontal: hp(2),
    paddingVertical: hp(1.5),
    borderWidth: isUser ? 0 : 1,
    borderColor: isUser ? 'transparent' : colors.cardBorder,
  },
  messageText: {
    color: isUser ? colors.textOnPrimary : colors.textOnCard,
    fontSize: hp(1.8),
    lineHeight: hp(2.5),
  },
  timestamp: {
    fontSize: hp(1.2),
    color: isUser ? colors.textOnPrimary + '80' : colors.textSecondary,
    marginTop: hp(0.5),
  },
  selectedReaction: {
    position: 'absolute',
    bottom: -hp(1),
    right: hp(1),
    backgroundColor: colors.cardBackground,
    borderRadius: hp(2),
    paddingHorizontal: hp(0.8),
    paddingVertical: hp(0.3),
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  reactionEmoji: {
    fontSize: hp(2),
  },
  actionButtons: {
    flexDirection: 'row',
    marginTop: hp(0.5),
    paddingHorizontal: hp(1),
  },
  actionButton: {
    marginRight: wp(3),
    padding: hp(0.5),
  },
  reactionsContainer: {
    position: 'absolute',
    top: -hp(5),
    alignSelf: 'center',
    flexDirection: 'row',
    backgroundColor: colors.cardBackground,
    borderRadius: hp(3),
    paddingHorizontal: hp(1),
    paddingVertical: hp(0.8),
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  reactionButton: {
    paddingHorizontal: hp(0.8),
  },
});