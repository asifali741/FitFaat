import { validationResult } from 'express-validator';
import ChatBotChat from '../models/ChatBotChat.js';
import { processAIChat } from '../services/geminiService.js';

/**
 * AI Chatbot Controller
 * Handles all chatbot-related requests with health-focused AI
 */

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
};
