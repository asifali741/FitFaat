import { foodDatabase } from '../data/foodDatabase.js';
import DietPlan from '../models/DietPlan.js';

// Calculate calories based on user metrics and goal
const calculateDailyCalories = (metrics, goal) => {
  // Harris-Benedict Formula for BMR (Basal Metabolic Rate)
  let bmr;
  if (metrics.gender === 'male') {
    bmr = 88.362 + (13.397 * metrics.weight) + (4.799 * (metrics.height * 30.48)) - (5.677 * metrics.age);
  } else {
    bmr = 447.593 + (9.247 * metrics.weight) + (3.098 * (metrics.height * 30.48)) - (4.330 * metrics.age);
  }

  // Activity level multiplier
  const activityMultipliers = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    very_active: 1.9
  };

  let tdee = bmr * activityMultipliers[metrics.activityLevel || 'moderate'];

  // Adjust based on goal
  switch (goal) {
    case 'weight_loss':
      return Math.round(tdee - 500); // 500 calorie deficit
    case 'weight_gain':
      return Math.round(tdee + 500); // 500 calorie surplus
    case 'muscle_gain':
      return Math.round(tdee + 300); // 300 calorie surplus
    default:
      return Math.round(tdee);
  }
};

// Generate meal plan based on daily calories and cuisine
const generateMealPlan = (dailyCalories, goal, cuisine) => {
  let meals = [];
  let mealDistribution;

  switch (goal) {
    case 'weight_loss':
      mealDistribution = {
        breakfast: 0.25,
        lunch: 0.35,
        dinner: 0.25,
        snack: 0.15
      };
      break;
    case 'muscle_gain':
      mealDistribution = {
        breakfast: 0.3,
        lunch: 0.35,
        dinner: 0.25,
        snack: 0.1
      };
      break;
    default:
      mealDistribution = {
        breakfast: 0.3,
        lunch: 0.3,
        dinner: 0.3,
        snack: 0.1
      };
  }

  // Generate meals from food database based on goal
  for (const [timeOfDay, percentage] of Object.entries(mealDistribution)) {
    const mealCalories = Math.round(dailyCalories * percentage);
    const goalType = goal === 'weight_loss' ? 'weightLoss' : 
                    goal === 'muscle_gain' ? 'muscleGain' : 'weightGain';
    
    const mealOptions = foodDatabase[goalType][timeOfDay] || [];
    if (mealOptions.length === 0) continue;
    
    const randomMeal = mealOptions[Math.floor(Math.random() * mealOptions.length)];
    const multiplier = mealCalories / randomMeal.baseCalories;
    
    // Scale ingredients based on multiplier
    const scaledIngredients = randomMeal.ingredients.map(ing => ({
      name: ing.name,
      quantity: (parseFloat(ing.quantity) * multiplier).toFixed(1),
      unit: ing.unit
    }));
    
    meals.push({
      name: randomMeal.name,
      description: randomMeal.description,
      ingredients: scaledIngredients,
      calories: Math.round(randomMeal.baseCalories * multiplier),
      protein: Math.round(randomMeal.protein * multiplier),
      carbs: Math.round(randomMeal.carbs * multiplier),
      fats: Math.round(randomMeal.fats * multiplier),
      timeOfDay,
      portions: `${multiplier.toFixed(2)}x standard portion`,
      hydration: randomMeal.hydration,
      preparation: randomMeal.preparation,
      timing: randomMeal.timing
    });
  }

  return meals;
};

// Create new diet plan
export const createDietPlan = async (req, res) => {
  try {
    const {
      height,
      weight,
      gender,
      birthDate,
      goal,
      name
    } = req.body;

    // Calculate age from birthDate
    const today = new Date();
    const birth = new Date(birthDate.year, birthDate.month - 1, birthDate.day);
    const age = today.getFullYear() - birth.getFullYear();

    // Map frontend goal to backend goal type
    const goalMap = {
      1: 'weight_loss',
      2: 'muscle_gain',
      3: 'weight_gain'
    };

    const userMetrics = {
      height: parseFloat(height),
      weight: parseFloat(weight),
      gender,
      age,
      activityLevel: 'moderate' // Default value, can be adjusted based on user input
    };

    const mappedGoal = goalMap[goal];
    const dailyCalories = calculateDailyCalories(userMetrics, mappedGoal);
    const dailyHydration = Math.round(weight * 0.033 * 1000); // 33ml per kg of body weight

    // Generate 7-day plan
    const weeklyPlan = Array.from({ length: 7 }, (_, i) => ({
      dayNumber: i + 1,
      targetCalories: dailyCalories,
      targetHydration: dailyHydration,
      meals: generateMealPlan(dailyCalories, mappedGoal),
      status: i === 0 ? 'active' : 'locked',
      achievedCalories: 0,
      achievedHydration: 0,
      remarks: i === 0 ? 'Let\'s start your fitness journey!' : ''
    }));

    const dietPlan = new DietPlan({
      userId: req.user.id,
      userMetrics,
      goal: mappedGoal,
      weeklyPlan
    });

    await dietPlan.save();

    res.status(201).json({
      success: true,
      message: 'Diet plan created successfully',
      dietPlan
    });
  } catch (error) {
    console.error('Diet plan creation error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating diet plan',
      error: error.message
    });
  }
};

// Get current diet plan
export const getCurrentDietPlan = async (req, res) => {
  try {
    const dietPlan = await DietPlan.findOne({ userId: req.user.id })
      .sort({ startDate: -1 })
      .limit(1);

    if (!dietPlan) {
      return res.status(404).json({
        success: false,
        message: 'No diet plan found'
      });
    }

    res.json({
      success: true,
      dietPlan
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching diet plan',
      error: error.message
    });
  }
};

// Update day progress
export const updateDayProgress = async (req, res) => {
  try {
    const { dayNumber, achievedCalories, achievedHydration } = req.body;

    const dietPlan = await DietPlan.findOne({ userId: req.user.id })
      .sort({ startDate: -1 })
      .limit(1);

    if (!dietPlan) {
      return res.status(404).json({
        success: false,
        message: 'No diet plan found'
      });
    }

    const day = dietPlan.weeklyPlan.find(d => d.dayNumber === dayNumber);
    if (!day) {
      return res.status(404).json({
        success: false,
        message: 'Day not found'
      });
    }

    day.achievedCalories = achievedCalories;
    day.achievedHydration = achievedHydration;
    
    // Update status if goals are met
    if (achievedCalories >= day.targetCalories && achievedHydration >= day.targetHydration) {
      day.status = 'finished';
      // Unlock next day if available
      const nextDay = dietPlan.weeklyPlan.find(d => d.dayNumber === dayNumber + 1);
      if (nextDay) {
        nextDay.status = 'active';
      }
    }

    dietPlan.lastUpdated = new Date();
    await dietPlan.save();

    res.json({
      success: true,
      message: 'Progress updated successfully',
      updatedDay: day
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating progress',
      error: error.message
    });
  }
};