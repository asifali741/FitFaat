import DailyLog from '../models/DailyLog.js';
import User from '../models/User.js';
import WeeklyTracking from '../models/WeeklyTracking.js';

// Helper function to adjust calories by level
// Level 1: -20%, Level 2: -10%, Level 3: 0%, Level 4: +10%, Level 5: +20%
const adjustCaloriesByLevel = (baseCalories, level) => {
  const adjustments = {
    1: -0.2,
    2: -0.1,
    3: 0,
    4: 0.1,
    5: 0.2
  };
  return Math.round(baseCalories * (1 + (adjustments[level] || 0)));
};

// Create a 7-day tracking plan
export const createWeeklyPlan = async (req, res) => {
  try {
    const { userId, baseTargetCalories, baseTargetHydration, startDate } = req.body;
    console.log('[createWeeklyPlan] Request:', { userId, baseTargetCalories, baseTargetHydration, startDate });

    // Validate input
    if (!userId || !baseTargetCalories || !baseTargetHydration || !startDate) {
      console.log('[createWeeklyPlan] Missing required fields');
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: userId, baseTargetCalories, baseTargetHydration, startDate'
      });
    }

    // Calculate week dates
    const weekStart = new Date(startDate);
    weekStart.setHours(0, 0, 0, 0);
    
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    console.log('[createWeeklyPlan] Creating 7 daily logs...');

    // Create 7 daily logs
    const dailyLogs = [];
    for (let day = 1; day <= 7; day++) {
      const logDate = new Date(weekStart);
      logDate.setDate(logDate.getDate() + (day - 1));

      const dailyLog = new DailyLog({
        userId,
        dayNumber: day,
        date: logDate.toISOString().split('T')[0],
        targetCalories: baseTargetCalories,
        achievedCalories: 0,
        calorieLevel: 3, // Default to level 3 (no adjustment)
        targetHydration: baseTargetHydration,
        achievedHydration: 0,
        meals: [],
        status: day === 1 ? 'active' : 'locked', // Only day 1 is active initially
        lock: false, // Lock field set to false by default
        isCompleted: false,
        completionPercentage: 0,
        calorieCompletionPercentage: 0,
        hydrationCompletionPercentage: 0,
        performanceRating: 'not-started',
        calorieSurplus: 0
      });

      const savedLog = await dailyLog.save();
      dailyLogs.push(savedLog._id);
    }

    console.log('[createWeeklyPlan] Daily logs created:', dailyLogs.length);

    // Create weekly tracking document
    const weeklyTracking = new WeeklyTracking({
      userId,
      weekStartDate: weekStart,
      weekEndDate: weekEnd,
      baseTargetCalories,
      baseTargetHydration,
      dailyLogs: dailyLogs,
      status: 'active'
    });

    const savedWeekly = await weeklyTracking.save();
    console.log('[createWeeklyPlan] Weekly tracking created:', savedWeekly._id);

    res.status(201).json({
      success: true,
      message: 'Weekly plan created successfully',
      data: {
        weeklyTrackingId: savedWeekly._id,
        dailyLogs: dailyLogs,
        weekStart: weekStart.toISOString().split('T')[0],
        weekEnd: weekEnd.toISOString().split('T')[0]
      }
    });
  } catch (error) {
    console.error('[createWeeklyPlan] ERROR:', error.message, error.stack);
    res.status(500).json({
      success: false,
      message: 'Error creating weekly plan',
      error: error.message
    });
  }
};

// Get daily log details
export const getDailyLog = async (req, res) => {
  try {
    const { dayId } = req.params;

    const dailyLog = await DailyLog.findById(dayId);
    if (!dailyLog) {
      return res.status(404).json({
        success: false,
        message: 'Daily log not found'
      });
    }

    res.status(200).json({
      success: true,
      data: dailyLog
    });
  } catch (error) {
    console.error('Error fetching daily log:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching daily log',
      error: error.message
    });
  }
};

// Add meal to daily log
export const addMeal = async (req, res) => {
  try {
    const { dayId } = req.params;
    const { foodName, quantity, unit, calories, protein, carbs, fats, notes } = req.body;

    // Validate input
    if (!foodName || quantity === undefined || !unit || calories === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: foodName, quantity, unit, calories'
      });
    }

    const dailyLog = await DailyLog.findById(dayId);
    if (!dailyLog) {
      return res.status(404).json({
        success: false,
        message: 'Daily log not found'
      });
    }

    // Check if day is locked
    if (dailyLog.lock) {
      return res.status(403).json({
        success: false,
        message: 'This day is locked. Cannot add meals to completed days.'
      });
    }

    // Add meal
    const meal = {
      foodName,
      quantity,
      unit,
      calories,
      protein: protein || 0,
      carbs: carbs || 0,
      fats: fats || 0,
      timestamp: new Date(),
      notes: notes || ''
    };

    dailyLog.meals.push(meal);
    dailyLog.achievedCalories += calories;

    // Save (will trigger pre-save hook for calculations)
    await dailyLog.save();

    res.status(200).json({
      success: true,
      message: 'Meal added successfully',
      data: dailyLog
    });
  } catch (error) {
    console.error('Error adding meal:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding meal',
      error: error.message
    });
  }
};

// Remove meal from daily log
export const removeMeal = async (req, res) => {
  try {
    const { dayId, mealId } = req.params;

    const dailyLog = await DailyLog.findById(dayId);
    if (!dailyLog) {
      return res.status(404).json({
        success: false,
        message: 'Daily log not found'
      });
    }

    // Check if day is locked
    if (dailyLog.lock) {
      return res.status(403).json({
        success: false,
        message: 'This day is locked. Cannot remove meals from completed days.'
      });
    }

    // Find and remove meal
    const mealIndex = dailyLog.meals.findIndex(m => m._id.toString() === mealId);
    if (mealIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Meal not found'
      });
    }

    const meal = dailyLog.meals[mealIndex];
    dailyLog.achievedCalories -= meal.calories;
    dailyLog.meals.splice(mealIndex, 1);

    // Save (will trigger pre-save hook for calculations)
    await dailyLog.save();

    res.status(200).json({
      success: true,
      message: 'Meal removed successfully',
      data: dailyLog
    });
  } catch (error) {
    console.error('Error removing meal:', error);
    res.status(500).json({
      success: false,
      message: 'Error removing meal',
      error: error.message
    });
  }
};

// Update calorie level for the day
export const updateCalorieLevel = async (req, res) => {
  try {
    const { dayId } = req.params;
    const { calorieLevel } = req.body;

    if (calorieLevel === undefined || calorieLevel < 1 || calorieLevel > 5) {
      return res.status(400).json({
        success: false,
        message: 'Calorie level must be between 1 and 5'
      });
    }

    const dailyLog = await DailyLog.findById(dayId);
    if (!dailyLog) {
      return res.status(404).json({
        success: false,
        message: 'Daily log not found'
      });
    }

    // Update calorie level and target
    dailyLog.calorieLevel = calorieLevel;
    const baseCalories = 2000; // or get from WeeklyTracking
    dailyLog.targetCalories = adjustCaloriesByLevel(baseCalories, calorieLevel);

    await dailyLog.save();

    res.status(200).json({
      success: true,
      message: `Calorie level updated to ${calorieLevel}`,
      data: dailyLog
    });
  } catch (error) {
    console.error('Error updating calorie level:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating calorie level',
      error: error.message
    });
  }
};

// Update hydration for the day
export const updateHydration = async (req, res) => {
  try {
    const { dayId } = req.params;
    const { hydrationAmount } = req.body;

    if (hydrationAmount === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Hydration amount is required'
      });
    }

    const dailyLog = await DailyLog.findById(dayId);
    if (!dailyLog) {
      return res.status(404).json({
        success: false,
        message: 'Daily log not found'
      });
    }

    dailyLog.achievedHydration = hydrationAmount;
    await dailyLog.save();

    res.status(200).json({
      success: true,
      message: 'Hydration updated successfully',
      data: dailyLog
    });
  } catch (error) {
    console.error('Error updating hydration:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating hydration',
      error: error.message
    });
  }
};

// Complete day and unlock next day
export const completeDay = async (req, res) => {
  try {
    const { weeklyTrackingId, dayNumber } = req.body;

    if (!weeklyTrackingId || dayNumber === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: weeklyTrackingId, dayNumber'
      });
    }

    // Get weekly tracking
    const weeklyTracking = await WeeklyTracking.findById(weeklyTrackingId);
    if (!weeklyTracking) {
      return res.status(404).json({
        success: false,
        message: 'Weekly tracking not found'
      });
    }

    // Get current day's log
    const currentDayLog = await DailyLog.findById(weeklyTracking.dailyLogs[dayNumber - 1]);
    if (!currentDayLog) {
      return res.status(404).json({
        success: false,
        message: 'Daily log for current day not found'
      });
    }

    // Mark as completed and lock it
    currentDayLog.status = 'finished';
    currentDayLog.lock = true; // Lock the day
    currentDayLog.isCompleted = true;
    await currentDayLog.save();

    // Calculate surplus/deficit
    const calorieSurplus = currentDayLog.achievedCalories - currentDayLog.targetCalories;
    currentDayLog.calorieSurplus = calorieSurplus;

    // Unlock next day if exists
    if (dayNumber < 7) {
      const nextDayLog = await DailyLog.findById(weeklyTracking.dailyLogs[dayNumber]);
      if (nextDayLog) {
        nextDayLog.status = 'active';
        nextDayLog.lock = false; // Ensure next day is unlocked
        const newTargetCalories = Math.max(
          1200, // Minimum safe calorie level
          nextDayLog.targetCalories + calorieSurplus
        );
        nextDayLog.targetCalories = newTargetCalories;
        nextDayLog.calorieSurplus = calorieSurplus;
        await nextDayLog.save();
      }
    }

    // Update weekly tracking stats
    const allDayLogs = await DailyLog.find({
      _id: { $in: weeklyTracking.dailyLogs }
    });

    let totalCaloriesAchieved = 0;
    let totalCaloriesTarget = 0;
    let totalHydrationAchieved = 0;
    let totalHydrationTarget = 0;
    let daysCompleted = 0;

    allDayLogs.forEach(log => {
      totalCaloriesAchieved += log.achievedCalories;
      totalCaloriesTarget += log.targetCalories;
      totalHydrationAchieved += log.achievedHydration;
      totalHydrationTarget += log.targetHydration;
      if (log.isCompleted) daysCompleted++;
    });

    weeklyTracking.weeklyStats = {
      totalCaloriesAchieved,
      totalCaloriesTarget,
      totalHydrationAchieved,
      totalHydrationTarget,
      daysCompleted,
      weeklyCompletionPercentage: Math.round((totalCaloriesAchieved / totalCaloriesTarget) * 100),
      averageDailyCompletion: daysCompleted > 0 
        ? Math.round(
            allDayLogs.reduce((sum, log) => sum + log.completionPercentage, 0) / 7
          )
        : 0
    };

    weeklyTracking.cumulativeSurplus += calorieSurplus;
    await weeklyTracking.save();

    res.status(200).json({
      success: true,
      message: 'Day completed successfully',
      data: {
        completedDay: currentDayLog,
        nextDayUnlocked: dayNumber < 7,
        calorieSurplus,
        weeklyStats: weeklyTracking.weeklyStats
      }
    });
  } catch (error) {
    console.error('Error completing day:', error);
    res.status(500).json({
      success: false,
      message: 'Error completing day',
      error: error.message
    });
  }
};

// Get weekly progress and all daily logs
export const getWeeklyProgress = async (req, res) => {
  try {
    const { weeklyTrackingId } = req.params;

    const weeklyTracking = await WeeklyTracking.findById(weeklyTrackingId).populate('dailyLogs');
    if (!weeklyTracking) {
      return res.status(404).json({
        success: false,
        message: 'Weekly tracking not found'
      });
    }

    res.status(200).json({
      success: true,
      data: weeklyTracking
    });
  } catch (error) {
    console.error('Error fetching weekly progress:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching weekly progress',
      error: error.message
    });
  }
};

// Save completed week to user profile
export const saveCompletedWeekToUser = async (weeklyTrackingId, userId) => {
  try {
    const weeklyTracking = await WeeklyTracking.findById(weeklyTrackingId).populate('dailyLogs');
    
    if (!weeklyTracking || !userId) {
      console.error('Missing weeklyTracking or userId');
      return false;
    }

    // Prepare the week data to save
    const weekData = {
      weeklyTrackingId: weeklyTracking._id,
      weekStartDate: weeklyTracking.weekStartDate,
      weekEndDate: weeklyTracking.weekEndDate,
      days: weeklyTracking.dailyLogs.map(day => ({
        dayNumber: day.dayNumber,
        date: day.date,
        lock: day.lock || false,
        achievedCalories: day.achievedCalories,
        targetCalories: day.targetCalories,
        achievedHydration: day.achievedHydration,
        targetHydration: day.targetHydration,
        completionPercentage: day.completionPercentage,
        calorieCompletionPercentage: day.calorieCompletionPercentage,
        hydrationCompletionPercentage: day.hydrationCompletionPercentage,
        performanceRating: day.performanceRating,
        remarks: day.remarks
      })),
      totalCaloriesAchieved: weeklyTracking.weeklyStats?.totalCaloriesAchieved || 0,
      totalCaloriesTarget: weeklyTracking.weeklyStats?.totalCaloriesTarget || 0,
      totalHydrationAchieved: weeklyTracking.weeklyStats?.totalHydrationAchieved || 0,
      totalHydrationTarget: weeklyTracking.weeklyStats?.totalHydrationTarget || 0,
      weeklyCompletionPercentage: weeklyTracking.weeklyStats?.weeklyCompletionPercentage || 0
    };

    // Add to user's completedWeeks array
    const user = await User.findByIdAndUpdate(
      userId,
      { $push: { completedWeeks: weekData } },
      { new: true }
    );

    console.log('[saveCompletedWeekToUser] Week saved for user:', userId);
    return true;
  } catch (error) {
    console.error('[saveCompletedWeekToUser] Error:', error);
    return false;
  }
};
