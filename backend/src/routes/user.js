import express from 'express';
import { body, validationResult } from 'express-validator';
import { protect } from '../middleware/auth.js';
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

      user.userInfo = {
        name,
        height,
        weight,
        gender,
        birthDate,
        fitnessGoal
      };
      user.isOnboardingComplete = true;
      await user.save();

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