import express from 'express';
import {
    createNews,
    deleteNews,
    getAllNews,
    getNewsDetails,
    getPublishedNews,
    publishNews,
    updateNews
} from '../controllers/newsController.js';
import { verifyAdminAuth } from '../middleware/auth.js';

const router = express.Router();

// Public route for published news (must be before :id route)
router.get('/published', getPublishedNews);

// Admin routes (protected)
router.post('/', verifyAdminAuth, createNews);
router.get('/', verifyAdminAuth, getAllNews);
router.get('/:id', verifyAdminAuth, getNewsDetails);
router.put('/:id', verifyAdminAuth, updateNews);
router.delete('/:id', verifyAdminAuth, deleteNews);
router.put('/:id/publish', verifyAdminAuth, publishNews);

export default router;
