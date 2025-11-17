import express from 'express';
import { body, validationResult } from 'express-validator';
import { protect } from '../middleware/auth.js';
import DailyLog from '../models/DailyLog.js';
import DietPlan from '../models/DietPlan.js';
import User from '../models/User.js';
import WeeklyTracking from '../models/WeeklyTracking.js';

const router = express.Router();

// Activity level multipliers for TDEE calculation
const ACTIVITY_FACTORS = {
  sedentary: 1.2,     // Little or no exercise
  light: 1.375,       // Light exercise 1-3 days/week
  moderate: 1.55,     // Moderate exercise 3-5 days/week
  active: 1.725,      // Heavy exercise 6-7 days/week
  veryActive: 1.9     // Very heavy exercise, physical job
};

// Helper function to calculate daily water intake in ml
function calculateHydrationGoal(weight, activityLevel = 'moderate', gender = 'male') {
  // Base: 30-35ml per kg of body weight
  let mlPerKg = 33; // Average
  
  // Adjust based on activity level
  if (activityLevel === 'active' || activityLevel === 'veryActive') {
    mlPerKg = 40; // More active people need more water
  } else if (activityLevel === 'sedentary') {
    mlPerKg = 30; // Less active need less
  }
  
  // Base calculation
  let hydrationMl = weight * mlPerKg;
  
  // Round to nearest 100ml for cleaner numbers
  hydrationMl = Math.round(hydrationMl / 100) * 100;
  
  // Cap between reasonable limits (1500ml - 4000ml)
  if (hydrationMl < 1500) hydrationMl = 1500;
  if (hydrationMl > 4000) hydrationMl = 4000;
  
  return hydrationMl;
}

// @route   PUT /api/user/onboarding
// @desc    Update user information after onboarding
// @access  Private
router.put(
  '/onboarding',
  protect,
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('height').isFloat({ min: 0 }).withMessage('Valid height is required'),
    body('weight').isFloat({ min: 0 }).withMessage('Valid weight is required'),
    body('gender').isIn(['male', 'female', 'other']).withMessage('Valid gender is required'),
    body('birthDate').isObject().withMessage('Birth date is required'),
    body('birthDate.day').isInt({ min: 1, max: 31 }).withMessage('Valid birth day is required'),
    body('birthDate.month').isInt({ min: 1, max: 12 }).withMessage('Valid birth month is required'),
    body('birthDate.year').isInt({ min: 1900, max: new Date().getFullYear() }).withMessage('Valid birth year is required'),
    body('fitnessGoal').isIn([1, 2, 3]).withMessage('Valid fitness goal is required')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: errors.array()[0].msg
        });
      }

      const { name, height, weight, gender, birthDate, fitnessGoal } = req.body;

      const user = await User.findById(req.user.id);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Calculate BMI (height in cm expected)
      let bmi = null;
      const h = parseFloat(height);
      const w = parseFloat(weight);
      if (h > 0 && w > 0) {
        const heightMeters = h / 100;
        bmi = w / (heightMeters * heightMeters);
        // round to 2 decimals
        bmi = Math.round(bmi * 100) / 100;
      }

      // Calculate age from birthDate
      const today = new Date();
      const birthDateObj = new Date(birthDate.year, birthDate.month - 1, birthDate.day);
      const age = today.getFullYear() - birthDateObj.getFullYear();

      // Calculate BMR using Mifflin-St Jeor Equation
      let bmr = (10 * w) + (6.25 * h) - (5 * age);
      bmr = gender === 'male' ? bmr + 5 : bmr - 161;

      // Calculate TDEE with moderate activity level as default
      const activityLevel = 'moderate'; // default for onboarding
      const activityFactor = ACTIVITY_FACTORS[activityLevel];
      const tdee = bmr * activityFactor;

      // Calculate goal calories based on fitness goal
      let goalCalories = tdee;
      switch (fitnessGoal) {
        case 1: // Weight Loss
          goalCalories = tdee - 500; // 500 calorie deficit
          break;
        case 2: // Muscle Gain
          goalCalories = tdee + 300; // 300 calorie surplus
          break;
        case 3: // Weight Gain
          goalCalories = tdee + 500; // 500 calorie surplus
          break;
      }
      goalCalories = Math.round(goalCalories);

      // Calculate hydration goal (in ml)
      const hydrationGoalInMl = calculateHydrationGoal(w, activityLevel, gender);
      const hydrationGoal = hydrationGoalInMl / 1000; // Convert to liters for storage

      user.userInfo = {
        name,
        height,
        weight,
        gender,
        birthDate,
        fitnessGoal,
        bmi,
        goalCalories,
        hydrationGoal,
        activityLevel: 'moderate' // default activity level
      };
      user.isOnboardingComplete = true;
      await user.save();

      // Update all daily logs with the personalized calorie and hydration goals
      try {
        const currentWeeklyTracking = await WeeklyTracking.findById(user.currentWeeklyTrackingId);
        if (currentWeeklyTracking) {
          // Update all daily logs in the current week
          await DailyLog.updateMany(
            { _id: { $in: currentWeeklyTracking.dailyLogs } },
            {
              $set: {
                targetCalories: goalCalories,
                targetHydration: hydrationGoalInMl
              }
            }
          );
          
          // Also update the weekly tracking document with new targets
          currentWeeklyTracking.baseTargetCalories = goalCalories;
          currentWeeklyTracking.baseTargetHydration = hydrationGoalInMl;
          await currentWeeklyTracking.save();
          
          console.log('[onboarding] Updated daily logs with personalized values - Calories:', goalCalories, 'Hydration (ml):', hydrationGoalInMl);
        }
      } catch (err) {
        console.error('[onboarding] Error updating daily logs:', err.message);
        // Don't fail the onboarding if daily log update fails
      }

      // If a diet plan exists, attach/update all metrics
      try {
        const dietPlan = await DietPlan.findOne({ userId: user._id }).sort({ startDate: -1 }).limit(1);
        if (dietPlan) {
          dietPlan.userMetrics = {
            ...dietPlan.userMetrics,
            bmi,
            goalCalories,
            hydrationGoal
          };
          await dietPlan.save();
        }
      } catch (dpErr) {
        console.error('Failed to update diet plan BMI:', dpErr);
      }

      res.json({
        success: true,
        message: 'User information updated successfully',
        user: {
          id: user._id,
          email: user.email,
          username: user.username,
          isOnboardingComplete: user.isOnboardingComplete,
          userInfo: user.userInfo
        }
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }
);

// @route   POST /api/user/update-bmi-summary
// @desc    Update user's BMI summary including goal calories and hydration
// @access  Private
router.post(
  '/update-bmi-summary',
  protect,
  [
    body('height').isFloat({ min: 0 }).withMessage('Valid height is required'),
    body('weight').isFloat({ min: 0 }).withMessage('Valid weight is required'),
    body('gender').isIn(['male', 'female', 'other']).withMessage('Valid gender is required'),
    body('age').isInt({ min: 13, max: 120 }).withMessage('Valid age is required'),
    body('activityLevel').isIn(['sedentary', 'light', 'moderate', 'active', 'veryActive']).withMessage('Valid activity level is required'),
    body('fitnessGoal').isIn([1, 2, 3]).withMessage('Valid fitness goal is required')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: errors.array()[0].msg
        });
      }

      const { height, weight, gender, age, activityLevel, fitnessGoal } = req.body;

      // Calculate BMI
      const heightMeters = height / 100; // convert cm to meters
      const bmi = Math.round((weight / (heightMeters * heightMeters)) * 100) / 100;

      // Calculate BMR using Mifflin-St Jeor Equation
      let bmr = (10 * weight) + (6.25 * height) - (5 * age);
      bmr = gender === 'male' ? bmr + 5 : bmr - 161;

      // Calculate TDEE (Total Daily Energy Expenditure)
      const tdee = bmr * ACTIVITY_FACTORS[activityLevel];

      // Calculate goal calories based on fitness goal
      let goalCalories = tdee;
      switch (fitnessGoal) {
        case 1: // Weight Loss
          goalCalories = tdee - 500; // 500 calorie deficit
          break;
        case 2: // Muscle Gain
          goalCalories = tdee + 300; // 300 calorie surplus
          break;
        case 3: // Weight Gain
          goalCalories = tdee + 500; // 500 calorie surplus
          break;
      }

      // Calculate hydration goal (in ml)
      const hydrationGoalInMl = calculateHydrationGoal(weight, activityLevel, gender);
      const hydrationGoal = hydrationGoalInMl / 1000; // Convert to liters for storage

      // Update user model
      const user = await User.findById(req.user.id);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Update userInfo with new calculations
      user.userInfo = {
        ...user.userInfo,
        bmi,
        goalCalories: Math.round(goalCalories),
        hydrationGoal,
        activityLevel
      };
      await user.save();

      // If a diet plan exists, update its metrics too
      try {
        const dietPlan = await DietPlan.findOne({ userId: user._id }).sort({ startDate: -1 }).limit(1);
        if (dietPlan) {
          dietPlan.userMetrics = {
            ...dietPlan.userMetrics,
            bmi,
            goalCalories: Math.round(goalCalories),
            hydrationGoal
          };
          await dietPlan.save();
        }
      } catch (dpErr) {
        console.error('Failed to update diet plan metrics:', dpErr);
      }

      res.json({
        success: true,
        message: 'BMI summary updated successfully',
        data: {
          bmi,
          goalCalories: Math.round(goalCalories),
          hydrationGoal
        }
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }
);

// @route   GET /api/user/onboarding-status
// @desc    Get user's onboarding status
// @access  Private
router.get('/onboarding-status', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('isOnboardingComplete userInfo');
    res.json({
      success: true,
      isOnboardingComplete: user.isOnboardingComplete,
      userInfo: user.userInfo
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/user/nutrition-summary
// @desc    Get user's nutrition history and statistics
// @access  Private
router.get('/nutrition-summary', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select(
      'nutritionHistory frequentFoods macroGoals weeklyNutritionSummary userInfo'
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Calculate average daily calories if we have total meals logged
    if (user.nutritionHistory.totalMealsLogged > 0) {
      // Assuming 7 days per week
      user.nutritionHistory.averageDailyCalories = Math.round(
        user.nutritionHistory.totalCaloriesConsumed / Math.max(1, Math.floor(user.nutritionHistory.totalMealsLogged / 3))
      );
      user.nutritionHistory.averageDailyProteins = Math.round(
        user.nutritionHistory.totalProteinsConsumed / Math.max(1, Math.floor(user.nutritionHistory.totalMealsLogged / 3))
      );
    }

    res.json({
      success: true,
      data: {
        nutritionHistory: user.nutritionHistory,
        frequentFoods: user.frequentFoods.slice(0, 10), // Top 10 frequent foods
        macroGoals: user.macroGoals,
        recentWeeksSummary: user.weeklyNutritionSummary.slice(-4), // Last 4 weeks
        goalCalories: user.userInfo?.goalCalories || 0
      }
    });
  } catch (error) {
    console.error('Error fetching nutrition summary:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching nutrition summary',
      error: error.message
    });
  }
});

// @route   GET /api/user/meal-history
// @desc    Get user's meal history for a specific date or date range
// @access  Private
router.get('/meal-history', protect, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    // Build query
    let query = { userId: req.user.id };

    if (startDate && endDate) {
      query.date = {
        $gte: startDate,
        $lte: endDate
      };
    } else if (startDate) {
      query.date = { $gte: startDate };
    }

    const mealHistory = await DailyLog.find(query)
      .select('date meals achievedCalories targetCalories meals')
      .sort({ date: -1 })
      .limit(30); // Last 30 days

    // Flatten meals for easier consumption
    const flattenedMeals = [];
    mealHistory.forEach(log => {
      log.meals.forEach(meal => {
        flattenedMeals.push({
          date: log.date,
          ...meal.toObject()
        });
      });
    });

    res.json({
      success: true,
      data: {
        mealHistory: flattenedMeals,
        totalDaysTracked: mealHistory.length,
        totalMeals: flattenedMeals.length
      }
    });
  } catch (error) {
    console.error('Error fetching meal history:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching meal history',
      error: error.message
    });
  }
});

export default router;