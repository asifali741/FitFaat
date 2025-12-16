import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import { createServer } from 'http';
import mongoose from 'mongoose';
import morgan from 'morgan';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';
import { errorHandler } from './middleware/error.js';
import adminRoutes from './routes/admin.js';
import adminAuthRoutes from './routes/adminAuth.js';
import appointmentRoutes from './routes/appointments.js';
import authRoutes from './routes/auth.js';
import chatRoutes from './routes/chat.js';
import chatbotRoutes from './routes/chatbot.js';
import dailyLogsRoutes from './routes/dailyLogs.js';
import dietPlanRoutes from './routes/dietPlan.js';
import doctorRoutes from './routes/doctors.js';
import foodRoutes from './routes/food.js';
import newsRoutes from './routes/news.js';
import pushTokenRoutes from './routes/pushToken.js';
import userRoutes from './routes/user.js';
import { initializeSocketIO } from './socket/chatSocket.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load env vars
dotenv.config();

// Create Express app
const app = express();

// Middleware
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

// Serve static files (uploaded images)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin-auth', adminAuthRoutes);
app.use('/api/user', userRoutes);
app.use('/api/diet-plan', dietPlanRoutes);
app.use('/api/daily-logs', dailyLogsRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api', foodRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin/news', newsRoutes);
app.use('/api/push-token', pushTokenRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/chatbot', chatbotRoutes); // AI Chatbot routes

// Error handler
app.use(errorHandler);

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB Connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Create HTTP server and initialize Socket.io
const httpServer = createServer(app);
const io = initializeSocketIO(httpServer);

// Start server
const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log('Socket.io initialized for real-time chat');
});