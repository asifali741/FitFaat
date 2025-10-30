import express from 'express';
import { body, validationResult } from 'express-validator';
import { protect } from '../middleware/auth.js';
import DietPlan from '../models/DietPlan.js';
import User from '../models/User.js';

const router = express.Router();

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
      const activityFactor = 1.55; // moderate activity level
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

      // Calculate hydration goal (in liters)
      const hydrationGoal = Math.round((w * 0.033) * 100) / 100;

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

// Constants for activity level multipliers
const ACTIVITY_FACTORS = {
  sedentary: 1.2,     // Little or no exercise
  light: 1.375,       // Light exercise/sports 1-3 days/week
  moderate: 1.55,     // Moderate exercise/sports 3-5 days/week
  active: 1.725,      // Hard exercise/sports 6-7 days/week
  veryActive: 1.9     // Very hard exercise/sports & physical job or training twice per day
};

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

      // Calculate hydration goal (in liters)
      const hydrationGoal = Math.round((weight * 0.033) * 100) / 100;

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

export default router;