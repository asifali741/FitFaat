import { body, param, query } from 'express-validator';

/**
 * Validation middleware for AI chatbot endpoints
 * Ensures all requests have required fields and proper formats
 */

// Validate chat message request
export const validateChatMessage = [
  body('message')
    .trim()
    .notEmpty()
    .withMessage('Message is required')
    .isLength({ min: 1, max: 2000 })
    .withMessage('Message must be between 1 and 2000 characters'),
  
  body('sessionId')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Session ID must be between 1 and 100 characters'),
];

// Validate get history request
export const validateGetHistory = [
  query('limit')
    .optional()
    .isInt({ min: 1, max: 200 })
    .withMessage('Limit must be between 1 and 200')
    .toInt(),
  
  query('sessionId')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Session ID must be between 1 and 100 characters'),
];

// Validate delete session request
export const validateDeleteSession = [
  param('sessionId')
    .trim()
    .notEmpty()
    .withMessage('Session ID is required')
    .isLength({ min: 1, max: 100 })
    .withMessage('Session ID must be between 1 and 100 characters'),
];

// Validate clear history request
export const validateClearHistory = [
  query('olderThanDays')
    .optional()
    .isInt({ min: 1, max: 365 })
    .withMessage('Days must be between 1 and 365')
    .toInt(),
];
