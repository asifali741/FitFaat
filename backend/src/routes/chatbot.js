import express from 'express';
import {
    clearHistory,
    deleteSession,
    getChatHistory,
    getChatSessions,
    getChatStats,
    sendMessage,
} from '../controllers/chatbotController.js';
import { protect } from '../middleware/auth.js';
import {
    validateChatMessage,
    validateClearHistory,
    validateDeleteSession,
    validateGetHistory,
} from '../validation/chatbotValidation.js';

const router = express.Router();

/**
 * AI Chatbot Routes
 * All routes require authentication
 * Health-focused AI responses only
 */

// @route   POST /api/chatbot/message
// @desc    Send message to AI chatbot and get response
// @access  Private
router.post('/message', protect, validateChatMessage, sendMessage);

// @route   GET /api/chatbot/history
// @desc    Get user's chat history (optionally filtered by session)
// @access  Private
router.get('/history', protect, validateGetHistory, getChatHistory);

// @route   GET /api/chatbot/sessions
// @desc    Get list of user's chat sessions
// @access  Private
router.get('/sessions', protect, getChatSessions);

// @route   DELETE /api/chatbot/session/:sessionId
// @desc    Delete a specific chat session
// @access  Private
router.delete('/session/:sessionId', protect, validateDeleteSession, deleteSession);

// @route   DELETE /api/chatbot/history
// @desc    Clear user's chat history (optionally only old messages)
// @access  Private
router.delete('/history', protect, validateClearHistory, clearHistory);

// @route   GET /api/chatbot/stats
// @desc    Get chatbot usage statistics
// @access  Private
router.get('/stats', protect, getChatStats);

export default router;
