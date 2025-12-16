import mongoose from 'mongoose';

/**
 * ChatMessage Schema
 * Stores real-time chat messages between doctors and patients during appointments
 */
const chatMessageSchema = new mongoose.Schema({
  appointmentId: {
    type: String,
    required: true,
    index: true
  },
  
  senderRole: {
    type: String,
    enum: ['user', 'doctor'],
    required: true
  },
  
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'senderModel'
  },
  
  senderModel: {
    type: String,
    required: true,
    enum: ['User', 'Doctor']
  },
  
  senderName: {
    type: String,
    required: true
  },
  
  message: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000
  },
  
  status: {
    type: String,
    enum: ['sent', 'delivered', 'read'],
    default: 'sent'
  },
  
  isRead: {
    type: Boolean,
    default: false
  },
  
  deliveredAt: {
    type: Date,
    default: null
  },
  
  readAt: {
    type: Date,
    default: null
  },
  
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
});

// Index for efficient querying
chatMessageSchema.index({ appointmentId: 1, createdAt: 1 });

const ChatMessage = mongoose.model('ChatMessage', chatMessageSchema);
export default ChatMessage;
