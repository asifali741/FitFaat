import express from 'express';
import { body, validationResult } from 'express-validator';
import {
    getAllDoctors,
    getDoctorProfile,
    getDoctorStatus,
    reviewDoctorApplication,
    submitDoctorRegistration,
    updateDoctorProfile
} from '../controllers/doctorController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// @route   POST /api/doctors/register
// @desc    Submit doctor registration
// @access  Private
router.post(
  '/register',
  protect,
  [
    body('firstName').trim().notEmpty().withMessage('First name is required'),
    body('lastName').trim().notEmpty().withMessage('Last name is required'),
    body('phoneNumber').trim().notEmpty().withMessage('Phone number is required'),
    body('age').optional().isInt({ min: 18, max: 80 }).withMessage('Age must be between 18 and 80'),
    body('gender').isIn(['male', 'female', 'other']).withMessage('Valid gender is required'),
    body('licenseNumber').trim().notEmpty().withMessage('License number is required'),
    body('licenseAuthority').trim().notEmpty().withMessage('License authority is required'),
    body('registrationYear').isInt({ min: 1900, max: new Date().getFullYear() }).withMessage('Valid registration year required'),
    body('yearsOfExperience').isInt({ min: 0, max: 70 }).withMessage('Valid years of experience required'),
    body('specialization').notEmpty().withMessage('Specialization is required'),
    body('qualifications').trim().notEmpty().withMessage('Qualifications are required'),
    body('university').trim().notEmpty().withMessage('University is required'),
    body('domain').notEmpty().withMessage('Domain is required'),
    body('jobType').isIn(['Full-time', 'Part-time', 'Contract', 'Freelance']).withMessage('Valid job type required'),
    body('consultationMode').isArray({ min: 1 }).withMessage('At least one consultation mode is required')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array()[0].msg
      });
    }

    await submitDoctorRegistration(req, res);
  }
);

// @route   GET /api/doctors/status
// @desc    Get doctor registration status
// @access  Private
router.get('/status', protect, getDoctorStatus);

// @route   GET /api/doctors/all
// @desc    Get all doctors (admin)
// @access  Private/Admin
router.get('/all', protect, getAllDoctors);

// @route   PUT /api/doctors/:id/review
// @desc    Review doctor application (admin)
// @access  Private/Admin
router.put(
  '/:id/review',
  protect,
  [
    body('status').isIn(['approved', 'rejected']).withMessage('Status must be approved or rejected'),
    body('adminNotes').trim().optional()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array()[0].msg
      });
    }

    await reviewDoctorApplication(req, res);
  }
);

// @route   GET /api/doctors/:id
// @desc    Get doctor profile
// @access  Public
router.get('/:id', getDoctorProfile);

// @route   PUT /api/doctors/profile
// @desc    Update doctor profile
// @access  Private
router.put(
  '/profile/update',
  protect,
  [
    body('consultationFee').optional().isFloat({ min: 0 }).withMessage('Valid consultation fee required'),
    body('availableDays').optional().isArray().withMessage('Available days must be an array'),
    body('availableHours').optional().isObject().withMessage('Available hours must be an object'),
    body('bio').optional().trim().isLength({ max: 500 }).withMessage('Bio must be less than 500 characters')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array()[0].msg
      });
    }

    await updateDoctorProfile(req, res);
  }
);

export default router;
