import express from 'express';
import { body, validationResult } from 'express-validator';
import jwt from 'jsonwebtoken';
import DailyLog from '../models/DailyLog.js';
import OTP from '../models/OTP.js';
import User from '../models/User.js';
import WeeklyTracking from '../models/WeeklyTracking.js';
import { generateOTP, sendOTPEmail, sendWelcomeEmail } from '../utils/emailService.js';

const router = express.Router();

// @route   POST /api/auth/send-otp
// @desc    Send OTP to email for verification
// @access  Public
router.post(
  '/send-otp',
  [
    body('email')
      .isEmail()
      .withMessage('Please include a valid email')
      .normalizeEmail()
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

      const { email } = req.body;

      // Check if user already exists with verified email
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Email is already registered'
        });
      }

      // Generate OTP
      const otp = generateOTP();
      console.log('Generated OTP for', email, ':', otp);

      // Delete any existing OTPs for this email
      await OTP.deleteMany({ email });

      // Save OTP to database
      await OTP.create({
        email,
        otp
      });

      // Send OTP email
      await sendOTPEmail(email, otp);

      res.json({
        success: true,
        message: 'OTP sent to your email successfully'
      });
    } catch (err) {
      console.error('Send OTP error:', err);
      res.status(500).json({
        success: false,
        message: 'Failed to send OTP. Please try again.'
      });
    }
  }
);

// @route   POST /api/auth/verify-otp
// @desc    Verify OTP before registration
// @access  Public
router.post(
  '/verify-otp',
  [
    body('email')
      .isEmail()
      .withMessage('Please include a valid email')
      .normalizeEmail(),
    body('otp')
      .isLength({ min: 6, max: 6 })
      .withMessage('OTP must be 6 digits')
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

      const { email, otp } = req.body;

      // Find the most recent OTP for this email
      const otpRecord = await OTP.findOne({ 
        email, 
        otp 
      }).sort({ createdAt: -1 });

      if (!otpRecord) {
        return res.status(400).json({
          success: false,
          message: 'Invalid OTP. Please check and try again.'
        });
      }

      // Mark OTP as verified
      otpRecord.verified = true;
      await otpRecord.save();

      res.json({
        success: true,
        message: 'Email verified successfully'
      });
    } catch (err) {
      console.error('Verify OTP error:', err);
      res.status(500).json({
        success: false,
        message: 'Verification failed. Please try again.'
      });
    }
  }
);

// @route   POST /api/auth/register
// @desc    Register user (requires verified OTP)
// @access  Public
router.post(
  '/register',
  [
    body('email')
      .isEmail()
      .withMessage('Please include a valid email')
      .normalizeEmail(),
    body('username')
      .isLength({ min: 6 })
      .withMessage('Username must be at least 6 characters long')
      .matches(/^[a-zA-Z0-9@_]+$/)
      .withMessage('Username can only contain letters, numbers, @ and _'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters long')
      .matches(/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@_]{8,}$/)
      .withMessage('Password must contain letters and numbers, and only @ and _ special characters are allowed')
  ],
  async (req, res) => {
    try {
      console.log('Registration request received:', {
        body: req.body,
        headers: req.headers
      });

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        console.log('Validation errors:', errors.array());
        return res.status(400).json({ 
          success: false, 
          message: errors.array()[0].msg 
        });
      }

      const { email, username, password } = req.body;
      console.log('Parsed registration data:', { email, username });

      // Check if OTP was verified for this email
      const verifiedOTP = await OTP.findOne({ 
        email, 
        verified: true 
      }).sort({ createdAt: -1 });

      if (!verifiedOTP) {
        return res.status(400).json({
          success: false,
          message: 'Email not verified. Please verify your email with OTP first.'
        });
      }

      // Check if user exists
      let user = await User.findOne({ email });
      if (user) {
        return res.status(400).json({
          success: false,
          message: 'User already exists'
        });
      }

      // Check if username is taken
      user = await User.findOne({ username });
      if (user) {
        return res.status(400).json({
          success: false,
          message: 'Username is already taken'
        });
      }

      // Create user
      user = await User.create({
        email,
        username,
        password
      });

      console.log('[signup] User created, now creating 7-day weekly plan...');

      // Auto-create 7-day weekly plan immediately upon signup
      try {
        const weekStart = new Date();
        weekStart.setHours(0, 0, 0, 0);
        
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);

        const baseTargetCalories = 2000; // Default until user completes onboarding
        const baseTargetHydration = 2.5; // Default 2.5L in liters (reasonable for average adult)

        // Create 7 daily logs
        const dailyLogs = [];
        for (let day = 1; day <= 7; day++) {
          const logDate = new Date(weekStart);
          logDate.setDate(logDate.getDate() + (day - 1));

          const dailyLog = new DailyLog({
            userId: user._id,
            dayNumber: day,
            date: logDate.toISOString().split('T')[0],
            targetCalories: baseTargetCalories,
            achievedCalories: 0,
            calorieLevel: 3,
            targetHydration: baseTargetHydration,
            achievedHydration: 0,
            meals: [],
            status: day === 1 ? 'active' : 'locked',
            lock: false,
            isCompleted: false,
            completionPercentage: 0,
            calorieCompletionPercentage: 0,
            hydrationCompletionPercentage: 0,
            performanceRating: 'not-started',
            calorieSurplus: 0
          });

          const savedLog = await dailyLog.save();
          dailyLogs.push(savedLog._id);
        }

        // Create weekly tracking document
        const weeklyTracking = new WeeklyTracking({
          userId: user._id,
          weekStartDate: weekStart,
          weekEndDate: weekEnd,
          baseTargetCalories,
          baseTargetHydration,
          dailyLogs: dailyLogs,
          status: 'active'
        });

        const savedWeekly = await weeklyTracking.save();
        console.log('[signup] Weekly plan created with ID:', savedWeekly._id);

        // Update user with weeklyTrackingId
        user.currentWeeklyTrackingId = savedWeekly._id;
        await user.save();
      } catch (error) {
        console.error('[signup] Error creating weekly plan:', error.message);
        // Don't fail signup if weekly plan creation fails
      }

      // Delete all OTPs for this email after successful registration
      await OTP.deleteMany({ email });

      // Send welcome email
      try {
        await sendWelcomeEmail(email, username);
      } catch (emailError) {
        console.error('Failed to send welcome email:', emailError);
        // Don't fail registration if welcome email fails
      }

      // Create token
      const token = jwt.sign(
        { id: user._id },
        process.env.JWT_SECRET || 'your-jwt-secret',
        { expiresIn: '24h' }
      );

      res.status(201).json({
        success: true,
        token,
        user: {
          id: user._id,
          email: user.email,
          username: user.username,
          weeklyTrackingId: user.currentWeeklyTrackingId
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

// @route   POST /api/auth/login
// @desc    Login user & get token
// @access  Public
router.post(
  '/login',
  [
    body('identifier')
      .trim()
      .notEmpty()
      .withMessage('Email or username is required'),
    body('password')
      .exists()
      .withMessage('Password is required')
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

      const { identifier, password } = req.body;
      
      if (!identifier || !password) {
        return res.status(400).json({
          success: false,
          message: 'Please provide both identifier (email or username) and password'
        });
      }
      
      console.log('Login attempt:', {
        identifier: identifier,
        passwordProvided: !!password
      });

      // Check for user by email or username
      const user = await User.findOne({
        $or: [
          { email: identifier.toLowerCase() },
          { username: identifier }
        ]
      });
      
      console.log('User found:', !!user);

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'No account found with this email or username. Please check your credentials or sign up.'
        });
      }

      // Check if password matches
      const isMatch = await user.validatePassword(password);
      console.log('Password match:', isMatch);
      
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }

      // Create token
      const token = jwt.sign(
        { id: user._id },
        process.env.JWT_SECRET || 'your-jwt-secret',
        { expiresIn: '24h' }
      );

      // Update last login
      user.lastLogin = Date.now();
      await user.save();

      res.json({
        success: true,
        token,
        user: {
          id: user._id,
          email: user.email,
          username: user.username,
          weeklyTrackingId: user.currentWeeklyTrackingId
        }
      });
    } catch (err) {
      console.error('Login error:', err);
      
      if (err.name === 'ValidationError') {
        return res.status(400).json({
          success: false,
          message: Object.values(err.errors).map(e => e.message).join(', ')
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'An error occurred during login. Please try again.'
      });
    }
  }
);

export default router;