import { validationResult } from 'express-validator';
import ChatBotChat from '../models/ChatBotChat.js';
import User from '../models/User.js';
import { processAIChat } from '../services/geminiService.js';

/**
 * AI Chatbot Controller
 * Handles all chatbot-related requests with health-focused AI
 */

/**
 * @route   GET /api/chatbot/check-limit
 * @desc    Check if user can send a message based on premium status
 * @access  Private
 */
export const checkChatLimit = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Premium users have unlimited chats
    if (user.isPremium && user.premiumSubscription?.status === 'active') {
      return res.status(200).json({
        success: true,
        canChat: true,
        isPremium: true,
        remainingChats: null,
        message: 'Premium user - unlimited chats'
      });
    }

    // Reset daily count if it's a new day
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const lastReset = new Date(user.chatUsage?.lastResetDate || new Date());
    lastReset.setHours(0, 0, 0, 0);

    if (today > lastReset) {
      // Reset the daily counter
      user.chatUsage = {
        dailyMessageCount: 0,
        lastResetDate: new Date(),
        totalChatsSent: user.chatUsage?.totalChatsSent || 0
      };
      await user.save();
    }

    const dailyLimit = 5;
    const currentCount = user.chatUsage?.dailyMessageCount || 0;
    const canChat = currentCount < dailyLimit;
    const remainingChats = Math.max(0, dailyLimit - currentCount);

    return res.status(200).json({
      success: true,
      canChat,
      isPremium: false,
      currentCount,
      remainingChats,
      dailyLimit,
      message: canChat 
        ? `You have ${remainingChats} free message${remainingChats !== 1 ? 's' : ''} left today`
        : 'Daily free chat limit reached. Upgrade to Premium for unlimited chats!'
    });
  } catch (error) {
    console.error('Check chat limit error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check chat limit',
      error: error.message
    });
  }
};

/**
 * @route   POST /api/chatbot/increment-count
 * @desc    Increment user's daily chat count
 * @access  Private
 */
export const incrementChatCount = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Premium users don't have limits
    if (user.isPremium && user.premiumSubscription?.status === 'active') {
      return res.status(200).json({
        success: true,
        message: 'Premium user - no limit',
        isPremium: true
      });
    }

    // Reset daily count if it's a new day
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const lastReset = new Date(user.chatUsage?.lastResetDate || new Date());
    lastReset.setHours(0, 0, 0, 0);

    if (today > lastReset) {
      user.chatUsage = {
        dailyMessageCount: 0,
        lastResetDate: new Date(),
        totalChatsSent: user.chatUsage?.totalChatsSent || 0
      };
    }

    const dailyLimit = 5;
    const currentCount = user.chatUsage?.dailyMessageCount || 0;

    // Check if user can send another message
    if (currentCount >= dailyLimit) {
      return res.status(429).json({
        success: false,
        message: 'Daily chat limit reached',
        currentCount,
        dailyLimit,
        canChat: false
      });
    }

    // Increment the counters
    user.chatUsage.dailyMessageCount = currentCount + 1;
    user.chatUsage.totalChatsSent = (user.chatUsage?.totalChatsSent || 0) + 1;
    await user.save();

    const remainingChats = dailyLimit - user.chatUsage.dailyMessageCount;

    return res.status(200).json({
      success: true,
      message: 'Chat count incremented',
      currentCount: user.chatUsage.dailyMessageCount,
      remainingChats,
      dailyLimit
    });
  } catch (error) {
    console.error('Increment chat count error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to increment chat count',
      error: error.message
    });
  }
};

/**
 * @route   POST /api/chatbot/message
 * @desc    Process user message and get AI response
 * @access  Private (requires authentication)
 */
export const sendMessage = async (req, res) => {
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const { message, sessionId } = req.body;
    const userId = req.user.id; // From auth middleware

    // Check chat limit first
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Reset daily count if it's a new day
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const lastReset = new Date(user.chatUsage?.lastResetDate || new Date());
    lastReset.setHours(0, 0, 0, 0);

    if (today > lastReset) {
      user.chatUsage = {
        dailyMessageCount: 0,
        lastResetDate: new Date(),
        totalChatsSent: user.chatUsage?.totalChatsSent || 0
      };
    }

    // Check if user is premium
    const isPremium = user.isPremium && user.premiumSubscription?.status === 'active';
    const dailyLimit = 5;
    const currentCount = user.chatUsage?.dailyMessageCount || 0;

    // If not premium and limit reached, deny request
    if (!isPremium && currentCount >= dailyLimit) {
      return res.status(429).json({
        success: false,
        message: 'Daily free chat limit reached (5 per day). Upgrade to Premium for unlimited chats!',
        currentCount,
        dailyLimit,
        canChat: false,
        isPremium: false
      });
    }

    // Increment chat count for non-premium users
    if (!isPremium) {
      user.chatUsage.dailyMessageCount = currentCount + 1;
      user.chatUsage.totalChatsSent = (user.chatUsage?.totalChatsSent || 0) + 1;
      await user.save();
    }

    // Generate session ID if not provided
    const chatSessionId = sessionId || `session_${userId}_${Date.now()}`;

    // Save user message to database
    const userMessage = await ChatBotChat.create({
      userId,
      role: 'user',
      content: message,
      source: 'user',
      sessionId: chatSessionId,
    });

    // Get recent conversation history for context
    const recentHistory = await ChatBotChat.find({
      userId,
      sessionId: chatSessionId,
    })
      .sort({ timestamp: -1 })
      .limit(10) // Last 5 exchanges
      .select('role content');

    // Reverse to get chronological order
    const conversationHistory = recentHistory.reverse();

    // Process message through AI service
    const aiResult = await processAIChat(message, conversationHistory);

    // Save AI response to database
    const assistantMessage = await ChatBotChat.create({
      userId,
      role: 'assistant',
      content: aiResult.content,
      source: aiResult.source,
      sessionId: chatSessionId,
      metadata: {
        processingTime: new Date() - userMessage.timestamp,
      },
    });

    // Return response
    return res.status(200).json({
      success: true,
      data: {
        userMessage: {
          id: userMessage._id,
          content: userMessage.content,
          timestamp: userMessage.timestamp,
        },
        aiResponse: {
          id: assistantMessage._id,
          content: assistantMessage.content,
          source: assistantMessage.source,
          timestamp: assistantMessage.timestamp,
        },
        sessionId: chatSessionId,
      },
    });

  } catch (error) {
    console.error('Send message error:', error);
    
    // ALWAYS return 200 with safe fallback message - NEVER crash
    try {
      const fallbackMessage = await ChatBotChat.create({
        userId: req.user?.id,
        role: 'assistant',
        content: "I apologize, but I'm experiencing technical difficulties. Please try again in a moment. I'm here to help with your health and fitness questions!",
        source: 'system',
        sessionId: req.body.sessionId || `session_${req.user?.id}_${Date.now()}`,
      });
      
      return res.status(200).json({
        success: true,
        data: {
          userMessage: null,
          aiResponse: {
            id: fallbackMessage._id,
            content: fallbackMessage.content,
            source: 'system',
            timestamp: fallbackMessage.timestamp,
          },
          sessionId: fallbackMessage.sessionId,
        },
      });
    } catch (dbError) {
      // Last resort fallback
      return res.status(200).json({
        success: true,
        data: {
          userMessage: null,
          aiResponse: {
            content: "I'm experiencing technical difficulties. Please try again.",
            source: 'system',
            timestamp: new Date(),
          },
        },
      });
    }
  }
};

/**
 * @route   GET /api/chatbot/history
 * @desc    Get user's chat history
 * @access  Private
 */
export const getChatHistory = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const userId = req.user.id;
    const { limit = 50, sessionId } = req.query;

    let query = { userId };
    if (sessionId) {
      query.sessionId = sessionId;
    }

    const messages = await ChatBotChat.find(query)
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .select('-__v -metadata');

    // Group by session if no specific session requested
    const groupedMessages = {};
    if (!sessionId) {
      messages.forEach(msg => {
        const session = msg.sessionId || 'default';
        if (!groupedMessages[session]) {
          groupedMessages[session] = [];
        }
        groupedMessages[session].push(msg);
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        messages: sessionId ? messages.reverse() : groupedMessages,
        total: messages.length,
      },
    });

  } catch (error) {
    console.error('Get chat history error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve chat history',
    });
  }
};

/**
 * @route   GET /api/chatbot/sessions
 * @desc    Get list of user's chat sessions
 * @access  Private
 */
export const getChatSessions = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get distinct session IDs with latest message
    const sessions = await ChatBotChat.aggregate([
      { $match: { userId: userId } },
      { $sort: { timestamp: -1 } },
      {
        $group: {
          _id: '$sessionId',
          lastMessage: { $first: '$content' },
          lastMessageTime: { $first: '$timestamp' },
          messageCount: { $sum: 1 },
        },
      },
      { $sort: { lastMessageTime: -1 } },
      { $limit: 20 },
    ]);

    return res.status(200).json({
      success: true,
      data: {
        sessions: sessions.map(s => ({
          sessionId: s._id,
          preview: s.lastMessage.substring(0, 100),
          lastActivity: s.lastMessageTime,
          messageCount: s.messageCount,
        })),
      },
    });

  } catch (error) {
    console.error('Get chat sessions error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve chat sessions',
    });
  }
};

/**
 * @route   DELETE /api/chatbot/session/:sessionId
 * @desc    Delete a specific chat session
 * @access  Private
 */
export const deleteSession = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const userId = req.user.id;
    const { sessionId } = req.params;

    const result = await ChatBotChat.deleteMany({
      userId,
      sessionId,
    });

    return res.status(200).json({
      success: true,
      data: {
        deletedCount: result.deletedCount,
        message: `Deleted ${result.deletedCount} messages from session`,
      },
    });

  } catch (error) {
    console.error('Delete session error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete session',
    });
  }
};

/**
 * @route   DELETE /api/chatbot/history
 * @desc    Clear user's chat history
 * @access  Private
 */
export const clearHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { olderThanDays } = req.query;

    let query = { userId };

    // If olderThanDays specified, only delete old messages
    if (olderThanDays) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - parseInt(olderThanDays));
      query.timestamp = { $lt: cutoffDate };
    }

    const result = await ChatBotChat.deleteMany(query);

    return res.status(200).json({
      success: true,
      data: {
        deletedCount: result.deletedCount,
        message: olderThanDays
          ? `Deleted messages older than ${olderThanDays} days`
          : 'All chat history cleared',
      },
    });

  } catch (error) {
    console.error('Clear history error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to clear chat history',
    });
  }
};

/**
 * @route   GET /api/chatbot/stats
 * @desc    Get user's chatbot usage statistics
 * @access  Private
 */
export const getChatStats = async (req, res) => {
  try {
    const userId = req.user.id;

    const stats = await ChatBotChat.aggregate([
      { $match: { userId: userId } },
      {
        $group: {
          _id: null,
          totalMessages: { $sum: 1 },
          userMessages: {
            $sum: { $cond: [{ $eq: ['$role', 'user'] }, 1, 0] },
          },
          aiMessages: {
            $sum: { $cond: [{ $eq: ['$role', 'assistant'] }, 1, 0] },
          },
          datasetResponses: {
            $sum: {
              $cond: [
                {
                  $in: ['$source', ['food_dataset', 'exercise_dataset']],
                },
                1,
                0,
              ],
            },
          },
          aiResponses: {
            $sum: { $cond: [{ $eq: ['$source', 'gemini_ai'] }, 1, 0] },
          },
          firstMessage: { $min: '$timestamp' },
          lastMessage: { $max: '$timestamp' },
        },
      },
    ]);

    return res.status(200).json({
      success: true,
      data: stats[0] || {
        totalMessages: 0,
        userMessages: 0,
        aiMessages: 0,
        datasetResponses: 0,
        aiResponses: 0,
      },
    });

  } catch (error) {
    console.error('Get chat stats error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve statistics',
    });
  }
};

export default {
  sendMessage,
  getChatHistory,
  getChatSessions,
  deleteSession,
  clearHistory,
  getChatStats,
  checkChatLimit,
  incrementChatCount,
};
