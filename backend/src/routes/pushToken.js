import express from 'express';
import { deactivatePushToken, savePushToken } from '../controllers/pushTokenController.js';

const router = express.Router();

// Save or update push token (no auth needed for users to register)
router.post('/register', savePushToken);

// Deactivate push token (when user logs out)
router.post('/deactivate', deactivatePushToken);

export default router;
