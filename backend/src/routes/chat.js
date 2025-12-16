import express from 'express';
import {
    checkChatAccess,
    getChatMessages,
    grantChatAccess,
    markMessagesAsRead
} from '../controllers/chatController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

/**
 * @route   GET /api/chat/appointment/:appointmentId/access
 * @desc    Check if user has access to chat for this appointment
 * @access  Private
 */
router.get('/appointment/:appointmentId/access', protect, checkChatAccess);

/**
 * @route   GET /api/chat/appointment/:appointmentId/messages
 * @desc    Get all messages for an appointment
 * @access  Private
 */
router.get('/appointment/:appointmentId/messages', protect, getChatMessages);

/**
 * @route   PUT /api/chat/appointment/:appointmentId/read
 * @desc    Mark messages as read
 * @access  Private
 */
router.put('/appointment/:appointmentId/read', protect, markMessagesAsRead);

/**
 * @route   POST /api/chat/appointment/:appointmentId/grant-access
 * @desc    Grant early chat access to user (doctor only)
 * @access  Private (Doctor)
 */
router.post('/appointment/:appointmentId/grant-access', protect, grantChatAccess);

export default router;
