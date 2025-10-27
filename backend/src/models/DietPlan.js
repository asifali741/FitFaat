import mongoose from 'mongoose';

const mealSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  ingredients: [{
    name: String,
    quantity: String,
    unit: String
  }],
  calories: {
    type: Number,
    required: true
  },
  protein: {
    type: Number,
    required: true
  },
  carbs: {
    type: Number,
    required: true
  },
  fats: {
    type: Number,
    required: true
  },
  timeOfDay: {
    type: String,
    enum: ['breakfast', 'morning_snack', 'lunch', 'evening_snack', 'dinner', 'pre_workout', 'post_workout'],
    required: true
  },
  portions: {
    type: String,
    required: true
  },
  hydration: {
    type: String,
    required: true
  },
  preparation: String,
  timing: String
});

const dayPlanSchema = new mongoose.Schema({
  dayNumber: {
    type: Number,
    required: true,
    min: 1,
    max: 7
  },
  targetCalories: {
    type: Number,
    required: true
  },
  targetHydration: {
    type: Number,
    required: true
  },
  meals: [mealSchema],
  status: {
    type: String,
    enum: ['locked', 'active', 'finished'],
    default: 'locked'
  },
  achievedCalories: {
    type: Number,
    default: 0
  },
  achievedHydration: {
    type: Number,
    default: 0
  },
  remarks: {
    type: String,
    default: ''
  }
});

const dietPlanSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  userMetrics: {
    height: Number,
    weight: Number,
    bmi: Number,
    age: Number,
    gender: {
      type: String,
      enum: ['male', 'female', 'other']
    },
    activityLevel: {
      type: String,
      enum: ['sedentary', 'light', 'moderate', 'active', 'very_active'],
      default: 'moderate'
    },
    cuisine: {
      type: String,
      enum: ['indian', 'mediterranean'],
      default: 'indian'
    }
  },
  goal: {
    type: String,
    enum: ['weight_loss', 'muscle_gain', 'weight_gain'],
    required: true
  },
  weeklyPlan: [dayPlanSchema],
  startDate: {
    type: Date,
    default: Date.now
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  currentDay: {
    type: Number,
    default: 1,
    min: 1,
    max: 7
  }
});

// Calculate BMI before saving
dietPlanSchema.pre('save', function(next) {
  if (this.userMetrics.height && this.userMetrics.weight) {
    // Convert height from feet to meters
    const heightInMeters = this.userMetrics.height * 0.3048;
    // Calculate BMI
    this.userMetrics.bmi = this.userMetrics.weight / (heightInMeters * heightInMeters);
  }
  next();
});

const DietPlan = mongoose.model('DietPlan', dietPlanSchema);
export default DietPlan;