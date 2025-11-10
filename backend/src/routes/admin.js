import express from 'express';
import {
    approveDoctor,
    getAllDoctors,
    getAllUsers,
    getDoctorDetails,
    getStatistics,
    getUserDetails,
    rejectDoctor,
    suspendDoctor,
    verifyAdmin
} from '../controllers/adminController.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

// Admin verification
router.get('/verify', verifyToken, verifyAdmin);

// Users management
router.get('/users', verifyToken, getAllUsers);
router.get('/users/:id', verifyToken, getUserDetails);

// Doctors management
router.get('/doctors', verifyToken, getAllDoctors);
router.get('/doctors/:id', verifyToken, getDoctorDetails);
router.put('/doctors/:id/approve', verifyToken, approveDoctor);
router.put('/doctors/:id/reject', verifyToken, rejectDoctor);
router.put('/doctors/:id/suspend', verifyToken, suspendDoctor);

// Statistics
router.get('/statistics', verifyToken, getStatistics);

export default router;
