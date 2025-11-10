import express from 'express';
import { body, validationResult } from 'express-validator';
import {
    approveAppointment,
    bookAppointment,
    cancelAppointment,
    getDoctorAppointments,
    getUserAppointments
} from '../controllers/appointmentController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

/**
 * @route   POST /api/appointments/book
 * @desc    Book an appointment with a doctor
 * @access  Private
 */
router.post(
  '/book',
  protect,
  [
    body('doctorId')
      .notEmpty().withMessage('Doctor ID is required')
      .isMongoId().withMessage('Invalid doctor ID format'),
    body('date')
      .notEmpty().withMessage('Date is required')
      .isISO8601().withMessage('Invalid date format. Use YYYY-MM-DD'),
    body('time')
      .notEmpty().withMessage('Time is required')
      .matches(/^(0?[1-9]|1[0-2]):[0-5][0-9]\s?(AM|PM)$/i)
      .withMessage('Invalid time format. Use HH:MM AM/PM'),
    body('price')
      .notEmpty().withMessage('Price is required')
      .isFloat({ min: 0 }).withMessage('Price must be a positive number'),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 500 }).withMessage('Description must not exceed 500 characters')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array()[0].msg
      });
    }

    await bookAppointment(req, res);
  }
);

/**
 * @route   GET /api/appointments/my-appointments
 * @desc    Get current user's appointments
 * @access  Private
 */
router.get('/my-appointments', protect, getUserAppointments);

/**
 * @route   GET /api/appointments/doctor/:doctorId
 * @desc    Get doctor's booked appointments
 * @access  Private
 */
router.get('/doctor/:doctorId', protect, getDoctorAppointments);

/**
 * @route   PUT /api/appointments/:appointmentId/cancel
 * @desc    Cancel an appointment
 * @access  Private
 */
router.put(
  '/:appointmentId/cancel',
  protect,
  [
    body('reason')
      .optional()
      .trim()
      .isLength({ max: 250 }).withMessage('Cancellation reason must not exceed 250 characters')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array()[0].msg
      });
    }

    await cancelAppointment(req, res);
  }
);

/**
 * @route   PUT /api/appointments/doctor/:doctorId/:appointmentId/approve
 * @desc    Approve an appointment (Doctor action)
 * @access  Private
 */
router.put(
  '/doctor/:doctorId/:appointmentId/approve',
  protect,
  async (req, res) => {
    await approveAppointment(req, res);
  }
);

export default router;
