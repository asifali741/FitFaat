import mongoose from 'mongoose';

const weeklyTrackingSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  weekStartDate: {
    type: Date,
    required: true
  },
  weekEndDate: {
    type: Date,
    required: true
  },
  baseTargetCalories: {
    type: Number,
    required: true,
    default: 2000
  },
  baseTargetHydration: {
    type: Number,
    required: true,
    default: 2.5
  },
  // References to 7 daily logs
  dailyLogs: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DailyLog'
    }
  ],
  status: {
    type: String,
    enum: ['active', 'completed', 'paused'],
    default: 'active'
  },
  // Weekly stats
  weeklyStats: {
    totalCaloriesAchieved: Number,
    totalCaloriesTarget: Number,
    totalHydrationAchieved: Number,
    totalHydrationTarget: Number,
    daysCompleted: Number,
    weeklyCompletionPercentage: Number,
    averageDailyCompletion: Number
  },
  cumulativeSurplus: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

const WeeklyTracking = mongoose.model('WeeklyTracking', weeklyTrackingSchema);
export default WeeklyTracking;
