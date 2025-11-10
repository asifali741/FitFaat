import express from 'express';
import {
    approveDoctor,
    blockDoctor,
    blockUser,
    getAllDoctors,
    getAllUsers,
    getDoctorDetails,
    getStatistics,
    getUserDetails,
    rejectDoctor,
    suspendDoctor,
    unverifyDoctor,
    verifyAdmin,
    verifyDoctor
} from '../controllers/adminController.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

// Admin verification
router.get('/verify', verifyToken, verifyAdmin);

// Users management
router.get('/users', verifyToken, getAllUsers);
router.get('/users/:id', verifyToken, getUserDetails);
router.put('/users/:id/block', verifyToken, blockUser);

// Doctors management
router.get('/doctors', verifyToken, getAllDoctors);
router.get('/doctors/:id', verifyToken, getDoctorDetails);
router.put('/doctors/:id/approve', verifyToken, approveDoctor);
router.put('/doctors/:id/reject', verifyToken, rejectDoctor);
router.put('/doctors/:id/suspend', verifyToken, suspendDoctor);
router.put('/doctors/:id/verify', verifyToken, verifyDoctor);
router.put('/doctors/:id/unverify', verifyToken, unverifyDoctor);
router.put('/doctors/:id/block', verifyToken, blockDoctor);

// Statistics
router.get('/statistics', verifyToken, getStatistics);

export default router;
