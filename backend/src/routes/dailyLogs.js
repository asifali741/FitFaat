import express from 'express';
import {
  addMeal,
  addWater,
  completeDay,
  createWeeklyPlan,
  getDailyLog,
  getWeeklyProgress,
  removeMeal,
  saveCompletedWeekToUser,
  updateCalorieLevel,
  updateHydration
} from '../controllers/dailyLogController.js';

const router = express.Router();

// Create a new weekly plan
router.post('/weekly-plan', createWeeklyPlan);

// Complete a day (with optional week completion)
router.post('/complete-day', completeDay);

// Get weekly progress (must come before /:dayId to avoid conflicts)
router.get('/progress/:weeklyTrackingId', getWeeklyProgress);

// Get daily log details
router.get('/:dayId', getDailyLog);

// Add meal to a day
router.post('/:dayId/meal', addMeal);

// Add water intake to a day
router.post('/:dayId/water', addWater);

// Remove meal from a day
router.delete('/:dayId/meal/:mealId', removeMeal);

// Update calorie level
router.put('/:dayId/calorie-level', updateCalorieLevel);

// Update hydration
router.put('/:dayId/hydration', updateHydration);

// Complete and save week to user profile
router.post('/complete-week/:weeklyTrackingId', async (req, res) => {
  try {
    const { weeklyTrackingId } = req.params;
    const { userId } = req.body;

    if (!userId || !weeklyTrackingId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: userId, weeklyTrackingId'
      });
    }

    // Save completed week to user profile
    const saved = await saveCompletedWeekToUser(weeklyTrackingId, userId);

    if (!saved) {
      return res.status(500).json({
        success: false,
        message: 'Failed to save completed week'
      });
    }

    // Mark weekly tracking as completed
    import('../models/WeeklyTracking.js').then(module => {
      module.default.findByIdAndUpdate(
        weeklyTrackingId,
        { status: 'completed' },
        { new: true }
      ).catch(err => console.error('Error updating weekly status:', err));
    });

    res.status(200).json({
      success: true,
      message: 'Week completed and saved to user profile'
    });
  } catch (error) {
    console.error('Error completing week:', error);
    res.status(500).json({
      success: false,
      message: 'Error completing week',
      error: error.message
    });
  }
});

export default router;
