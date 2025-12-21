import mongoose from 'mongoose';

/**
 * ChatBotChat Schema
 * Stores all AI chatbot conversations with strict health focus
 * Each message includes role (user/assistant), content, and metadata
 */
const chatBotChatSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true, // Index for faster user-specific queries
  },
  role: {
    type: String,
    enum: ['user', 'assistant'],
    required: true,
  },
  content: {
    type: String,
    required: true,
    trim: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true, // Index for chronological sorting
  },
  // Track source: user input, AI response, dataset response, or system message
  source: {
    type: String,
    enum: ['user', 'ai', 'dataset', 'system', 'gemini', 'health-dataset'],
    default: 'user',
  },
  // Store any relevant metadata
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  // Session grouping (optional, for grouping conversations)
  sessionId: {
    type: String,
    index: true,
  },
}, {
  timestamps: true, // Adds createdAt and updatedAt automatically
});

// Compound index for efficient user-session queries
chatBotChatSchema.index({ userId: 1, timestamp: -1 });
chatBotChatSchema.index({ userId: 1, sessionId: 1, timestamp: 1 });

// Method to get user's chat history
chatBotChatSchema.statics.getUserHistory = async function(userId, limit = 50) {
  return this.find({ userId })
    .sort({ timestamp: -1 })
    .limit(limit)
    .select('-__v');
};

// Method to get chat by session
chatBotChatSchema.statics.getSessionHistory = async function(userId, sessionId) {
  return this.find({ userId, sessionId })
    .sort({ timestamp: 1 })
    .select('-__v');
};

// Method to delete old conversations (data retention)
chatBotChatSchema.statics.deleteOldChats = async function(daysToKeep = 90) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
  
  return this.deleteMany({ timestamp: { $lt: cutoffDate } });
};

const ChatBotChat = mongoose.model('ChatBotChat', chatBotChatSchema);

export default ChatBotChat;
