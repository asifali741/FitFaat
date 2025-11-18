import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    minlength: [6, 'Username must be at least 6 characters long'],
    validate: {
      validator: function(v) {
        return /^[a-zA-Z0-9@_]+$/.test(v);
      },
      message: props => `${props.value} is not a valid username. Only letters, numbers, @ and _ are allowed`
    }
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    validate: {
      validator: function(v) {
        return /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(v);
      },
      message: props => `${props.value} is not a valid email address`
    }
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
  },
  profileImage: {
    type: String,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastLogin: {
    type: Date
  },
  // User information fields
  isOnboardingComplete: {
    type: Boolean,
    default: false
  },
  isDocregister: {
    type: Boolean,
    default: false
  },
  userInfo: {
    name: {
      type: String,
      trim: true
    },
    height: {
      type: Number
    },
    weight: {
      type: Number
    },
    gender: {
      type: String,
      enum: ['male', 'female', 'other']
    },
    birthDate: {
      day: {
        type: Number,
        min: 1,
        max: 31
      },
      month: {
        type: Number,
        min: 1,
        max: 12
      },
      year: {
        type: Number,
        min: 1900,
        max: new Date().getFullYear()
      }
    },
    activityLevel: {
      type: String,
      enum: ['sedentary', 'light', 'moderate', 'active', 'veryActive'],
      default: 'moderate'
    },
    bmi: {
      type: Number
    },
    goalCalories: {
      type: Number
    },
    hydrationGoal: {
      type: Number
    },
    fitnessGoal: {
      type: Number,
      enum: [1, 2, 3] // 1: Weight Loss, 2: Muscle Gain, 3: Weight Gain
    }
    ,
    bmi: {
      type: Number
    }
  },
  // Current weekly tracking ID for active 7-day plan
  currentWeeklyTrackingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WeeklyTracking',
    default: null
  },
  // Nutrition & Meal History - Comprehensive tracking
  nutritionHistory: {
    totalMealsLogged: {
      type: Number,
      default: 0
    },
    totalCaloriesBurned: {
      type: Number,
      default: 0 // Estimated from exercises/activities
    },
    totalCaloriesConsumed: {
      type: Number,
      default: 0
    },
    totalProteinsConsumed: {
      type: Number,
      default: 0
    },
    totalCarbsConsumed: {
      type: Number,
      default: 0
    },
    totalFatsConsumed: {
      type: Number,
      default: 0
    },
    averageDailyCalories: {
      type: Number,
      default: 0
    },
    averageDailyProteins: {
      type: Number,
      default: 0
    },
    lastUpdated: {
      type: Date,
      default: Date.now
    }
  },
  // Food preferences and frequency tracking
  frequentFoods: [
    {
      foodName: {
        type: String,
        required: true
      },
      category: String,
      calories: Number,
      timesConsumed: {
        type: Number,
        default: 1
      },
      lastConsumedDate: {
        type: Date,
        default: Date.now
      },
      averageCaloriesPerServing: Number
    }
  ],
  // Macronutrient daily goals (set during onboarding)
  macroGoals: {
    dailyProteinGoal: {
      type: Number,
      default: 0 // in grams
    },
    dailyCarbGoal: {
      type: Number,
      default: 0 // in grams
    },
    dailyFatGoal: {
      type: Number,
      default: 0 // in grams
    }
  },
  // Daily calorie burn tracking
  caloriesBurnedLog: [
    {
      date: {
        type: String, // YYYY-MM-DD format
        required: true
      },
      exerciseType: String,
      duration: Number, // in minutes
      caloriesBurned: Number,
      timestamp: {
        type: Date,
        default: Date.now
      }
    }
  ],
  // Weekly nutrition summary
  weeklyNutritionSummary: [
    {
      weekStartDate: {
        type: Date,
        required: true
      },
      weekEndDate: {
        type: Date,
        required: true
      },
      totalCaloriesConsumed: Number,
      totalCaloriesBurned: Number,
      netCalories: Number, // Consumed - Burned
      averageProteinDaily: Number,
      averageCarbsDaily: Number,
      averageFatsDaily: Number,
      mealsLogged: Number,
      workoutsLogged: Number,
      consistencyScore: Number, // 0-100
      weekSummaryNotes: String
    }
  ],
  // Appointments booked by this user with doctors
  appointmentsBooked: [
    {
      doctorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Doctor',
        required: true
      },
      date: {
        type: Date,
        required: true
      },
      time: {
        type: String,
        required: true
      },
      status: {
        type: String,
        enum: ['pending', 'confirmed', 'completed', 'cancelled'],
        default: 'pending'
      },
      price: {
        type: Number,
        required: true
      },
      description: {
        type: String
      },
      bookedAt: {
        type: Date,
        default: Date.now
      }
    }
  ],
  // Completed 7-day tracking weeks
  completedWeeks: [
    {
      weeklyTrackingId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'WeeklyTracking'
      },
      weekStartDate: {
        type: Date,
        required: true
      },
      weekEndDate: {
        type: Date,
        required: true
      },
      days: [
        {
          dayNumber: {
            type: Number,
            min: 1,
            max: 7
          },
          date: String,
          lock: {
            type: Boolean,
            default: false
          },
          achievedCalories: Number,
          targetCalories: Number,
          achievedHydration: Number,
          targetHydration: Number,
          completionPercentage: Number,
          calorieCompletionPercentage: Number,
          hydrationCompletionPercentage: Number,
          performanceRating: String,
          remarks: String
        }
      ],
      totalCaloriesAchieved: Number,
      totalCaloriesTarget: Number,
      totalHydrationAchieved: Number,
      totalHydrationTarget: Number,
      weeklyCompletionPercentage: Number,
      completedAt: {
        type: Date,
        default: Date.now
      }
    }
  ]
});

// Create indexes for faster appointment conflict checking
userSchema.index({ 'appointmentsBooked.date': 1, 'appointmentsBooked.time': 1 });
userSchema.index({ 'appointmentsBooked.doctorId': 1 });

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    return next();
  }
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to validate password
userSchema.methods.validatePassword = async function(password) {
  try {
    return await bcrypt.compare(password, this.password);
  } catch (error) {
    console.error('Password comparison error:', error);
    return false;
  }
};

// Generate JWT Token
userSchema.methods.generateToken = function() {
  return jwt.sign(
    { id: this._id },
    process.env.JWT_SECRET || 'your-jwt-secret',
    { expiresIn: process.env.JWT_EXPIRE || '24h' }
  );
};

const User = mongoose.model('User', userSchema);
export default User;