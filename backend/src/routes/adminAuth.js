import express from 'express';
import { loginAdmin, registerAdmin, verifyAdminToken } from '../controllers/adminAuthController.js';
import { verifyAdminAuth } from '../middleware/auth.js';

const router = express.Router();

// Public routes
router.post('/register', registerAdmin);
router.post('/login', loginAdmin);

// Protected routes
router.get('/verify', verifyAdminAuth, verifyAdminToken);

export default router;
