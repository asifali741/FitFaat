import mongoose from 'mongoose';

const dailyLogSchema = new mongoose.Schema({
  dayNumber: {
    type: Number,
    required: true,
    min: 1,
    max: 7
  },
  date: {
    type: String,
    required: true // YYYY-MM-DD format
  },
  
  // Calorie Tracking
  targetCalories: {
    type: Number,
    required: true,
    default: 2000
  },
  achievedCalories: {
    type: Number,
    default: 0
  },
  calorieLevel: {
    type: Number,
    enum: [1, 2, 3, 4, 5], // 1=Very Low, 2=Low, 3=Normal, 4=High, 5=Very High
    default: 3
  },
  calorieSurplus: {
    type: Number,
    default: 0 // Positive = surplus carried over, Negative = deficit carried over
  },
  
  // Hydration Tracking (in liters)
  targetHydration: {
    type: Number,
    required: true,
    default: 2.5 // in liters (L)
  },
  achievedHydration: {
    type: Number,
    default: 0 // in liters (L)
  },
  
  // Meals/Food Tracking
  meals: [
    {
      _id: mongoose.Schema.Types.ObjectId,
      foodName: String,
      quantity: Number,
      unit: String,
      calories: Number,
      protein: Number,
      carbs: Number,
      fats: Number,
      timestamp: {
        type: Date,
        default: Date.now
      },
      notes: String
    }
  ],
  
  // Day Status
  status: {
    type: String,
    enum: ['locked', 'active', 'finished'],
    default: 'locked'
  },
  
  // Lock field - false by default, can be set to true to lock completed day
  lock: {
    type: Boolean,
    default: false
  },
  
  // Completion Metrics
  isCompleted: {
    type: Boolean,
    default: false
  },
  completionPercentage: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  calorieCompletionPercentage: {
    type: Number,
    default: 0
  },
  hydrationCompletionPercentage: {
    type: Number,
    default: 0
  },
  
  // Performance Metrics
  remarks: String,
  performanceRating: {
    type: String,
    enum: ['excellent', 'good', 'average', 'poor', 'not-started'],
    default: 'not-started'
  },
  
  // User reference
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Pre-save hook to recalculate completion percentages
dailyLogSchema.pre('save', function(next) {
  // Calculate calorie completion percentage
  if (this.targetCalories > 0) {
    this.calorieCompletionPercentage = Math.round(
      (this.achievedCalories / this.targetCalories) * 100
    );
  }
  
  // Calculate hydration completion percentage
  if (this.targetHydration > 0) {
    this.hydrationCompletionPercentage = Math.round(
      (this.achievedHydration / this.targetHydration) * 100
    );
  }
  
  // Calculate overall completion percentage (average of both)
  this.completionPercentage = Math.round(
    (this.calorieCompletionPercentage + this.hydrationCompletionPercentage) / 2
  );
  
  // Update performance rating based on completion
  if (this.completionPercentage >= 90) {
    this.performanceRating = 'excellent';
  } else if (this.completionPercentage >= 75) {
    this.performanceRating = 'good';
  } else if (this.completionPercentage >= 50) {
    this.performanceRating = 'average';
  } else if (this.completionPercentage > 0) {
    this.performanceRating = 'poor';
  } else {
    this.performanceRating = 'not-started';
  }
  
  this.updatedAt = Date.now();
  next();
});

const DailyLog = mongoose.model('DailyLog', dailyLogSchema);
export default DailyLog;
