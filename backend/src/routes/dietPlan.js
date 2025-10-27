import express from 'express';
import { createDietPlan, getCurrentDietPlan, updateDayProgress } from '../controllers/dietPlan.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Create new diet plan from onboarding information
router.post('/create', protect, createDietPlan);

// Get current diet plan
router.get('/current', protect, getCurrentDietPlan);

// Update day progress
router.put('/progress', protect, updateDayProgress);

export default router;