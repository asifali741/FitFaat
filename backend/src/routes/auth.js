import express from 'express';
import { body, validationResult } from 'express-validator';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const router = express.Router();

// @route   POST /api/auth/register
// @desc    Register user
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
          username: user.username
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
          username: user.username
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