import dotenv from 'dotenv';

dotenv.config();

/**
 * Health-Only AI Chatbot Service
 * Production-ready implementation with:
 * - Google Gemini 1.5 Flash API integration
 * - Strict health scope validation
 * - Dataset-first logic (food & exercise)
 * - Comprehensive error handling
 * - Polite out-of-scope rejection
 */

// Gemini API Configuration
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = 'gemini-flash-latest'; // Correct model name for v1beta API
const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${GEMINI_API_KEY}`;
const GEMINI_TIMEOUT_MS = 15000; // 15 seconds timeout

/**
 * Health-focused system prompt for Gemini AI
 * Strictly enforces health, nutrition, and exercise topics only
 */
const HEALTH_GUARD_PROMPT = `You are FitFaat Health Assistant, a specialized AI focused ONLY on health, nutrition, fitness, and exercise topics.

STRICT RULES:
1. ONLY answer questions about:
   - Nutrition (calories, macros, vitamins, minerals)
   - Food and diet (healthy eating, meal planning, dietary restrictions)
   - Exercise and fitness (workouts, training, physical activity)
   - Health and wellness (sleep, hydration, stress management, mental health)
   - Medical advice (symptoms, conditions, prevention - always recommend consulting doctors)
   - Weight management (healthy weight loss/gain strategies)

2. REJECT all questions about:
   - Politics, religion, or controversial topics
   - Entertainment (movies, music, games)
   - Technology unrelated to health/fitness
   - General knowledge or trivia
   - Personal advice unrelated to health
   - Any topic outside health/fitness domain

3. Response format:
   - Keep responses concise and practical (2-3 paragraphs max)
   - Use bullet points for lists
   - Always encourage consulting healthcare professionals for medical issues
   - Be supportive and motivational
   - Use simple, clear language

4. If user asks non-health questions, politely respond:
   "I'm FitFaat Health Assistant, specialized in health, nutrition, and fitness. I can only help with health-related questions. How can I assist you with your health and fitness goals today?"

Remember: You are a health assistant, not a general chatbot. Stay focused on health topics only.`;

/**
 * Extract potential food keywords from user message
 * Removes common question words and punctuation
 * @param {string} message - User message
 * @returns {string} - Cleaned food keyword
 */
function extractFoodKeywords(message) {
  // Remove common question patterns
  const questionWords = [
    'how much', 'how many', 'what is', 'what are', 'tell me', 'show me',
    'calories in', 'protein in', 'carbs in', 'fat in', 'nutrition of',
    'nutritional value of', 'nutrients in', 'macros in', 'macros of',
    'calorie content of', 'how much calories', 'how many calories'
  ];
  
  let cleaned = message.toLowerCase().trim();
  
  // Remove question words
  questionWords.forEach(word => {
    cleaned = cleaned.replace(new RegExp(word, 'gi'), '');
  });
  
  // Remove punctuation
  cleaned = cleaned.replace(/[?!.,;:]/g, '');
  
  // Remove extra spaces
  cleaned = cleaned.trim().replace(/\s+/g, ' ');
  
  console.log(`🔍 Extracted food keyword: "${cleaned}" from "${message}"`);
  return cleaned;
}

/**
 * Validate if message is within health scope
 * Allows greetings and basic conversation
 * @param {string} message - User message to validate
 * @returns {boolean} - True if health-related or greeting, false otherwise
 */
function isHealthRelated(message) {
  const lowerMessage = message.toLowerCase().trim();
  
  // Allow greetings and basic conversation
  const greetings = [
    'hi', 'hello', 'hey', 'good morning', 'good afternoon', 'good evening',
    'how are you', 'whats up', 'thanks', 'thank you', 'bye', 'goodbye',
    'help', 'assist', 'can you help', 'need help'
  ];
  
  if (greetings.some(greeting => lowerMessage.includes(greeting))) {
    return true;
  }
  
  // Check health-related keywords
  const healthKeywords = [
    // Nutrition
    'calorie', 'protein', 'carb', 'fat', 'nutrition', 'nutrient', 'vitamin', 'mineral',
    'macro', 'micro', 'diet', 'meal', 'food', 'eat', 'drink', 'water', 'hydration',
    // Exercise & Fitness
    'exercise', 'workout', 'training', 'fitness', 'gym', 'muscle', 'strength',
    'cardio', 'run', 'walk', 'yoga', 'stretch', 'rep', 'set', 'weight',
    // Health & Wellness
    'health', 'wellness', 'sleep', 'rest', 'stress', 'mental', 'physical',
    'body', 'weight', 'bmi', 'healthy', 'medical', 'doctor', 'symptom',
    // Body parts
    'bicep', 'tricep', 'chest', 'back', 'leg', 'shoulder', 'abs', 'core',
  ];
  
  return healthKeywords.some(keyword => lowerMessage.includes(keyword));
}

/**
 * Call Google Gemini 1.5 Flash API with health-guarded prompt
 * Includes timeout and comprehensive error handling
 * @param {string} userMessage - The user's question
 * @param {Array} conversationHistory - Previous messages for context
 * @returns {Promise<string>} - AI response
 */
async function callGeminiAPI(userMessage, conversationHistory = []) {
  try {
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not configured in environment variables');
    }

    // Build conversation context
    const contextMessages = conversationHistory
      .slice(-6) // Last 3 exchanges (6 messages)
      .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
      .join('\n');

    // Construct the full prompt with context
    const fullPrompt = `${HEALTH_GUARD_PROMPT}

Previous conversation:
${contextMessages}

Current user question: ${userMessage}

Provide a helpful health-focused response:`;

    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS);

    try {
      // Call Gemini API v1beta with API key in URL
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${GEMINI_API_KEY}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: fullPrompt
            }]
          }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 800,
            topP: 0.8,
            topK: 40,
          },
          safetySettings: [
            {
              category: 'HARM_CATEGORY_HARASSMENT',
              threshold: 'BLOCK_MEDIUM_AND_ABOVE'
            },
            {
              category: 'HARM_CATEGORY_HATE_SPEECH',
              threshold: 'BLOCK_MEDIUM_AND_ABOVE'
            },
            {
              category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
              threshold: 'BLOCK_MEDIUM_AND_ABOVE'
            },
            {
              category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
              threshold: 'BLOCK_MEDIUM_AND_ABOVE'
            }
          ]
        })
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Gemini API Error:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        });
        throw new Error(`Gemini API returned ${response.status}: ${errorData.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();
      
      // Extract response text
      const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (!aiResponse) {
        console.error('No text in Gemini response:', JSON.stringify(data));
        throw new Error('Gemini returned empty response');
      }

      return aiResponse.trim();
      
    } finally {
      clearTimeout(timeoutId);
    }

  } catch (error) {
    console.error('Gemini API call failed:', {
      name: error.name,
      message: error.message,
      isTimeout: error.name === 'AbortError'
    });
    
    if (error.name === 'AbortError') {
      throw new Error('Request timeout - Gemini API took too long to respond');
    }
    
    throw error;
  }
}

/**
 * Search food dataset for nutrition information
 * Enhanced with smart keyword extraction and matching
 * @param {string} query - Food item to search
 * @returns {Array|null} - Food data array or null if not found
 */
async function searchFoodDataset(query) {
  try {
    console.log(`🔎 Searching food dataset for: "${query}"`);
    
    // Extract food keywords from query
    const searchKeyword = extractFoodKeywords(query);
    const allFoods = [];
    
    // Import Pakistani dishes dataset (comprehensive - 13,000+ items)
    try {
      const pakistaniDataModule = await import('../../../app/Dataset/dataSet.js');
      if (pakistaniDataModule.pakistaniDishes) {
        allFoods.push(...pakistaniDataModule.pakistaniDishes);
        console.log(`📦 Loaded ${pakistaniDataModule.pakistaniDishes.length} Pakistani dishes`);
      }
    } catch (err) {
      console.log('⚠️ Pakistani dishes dataset not found');
    }
    
    // Import basic food database from constants
    try {
      const foodDatabaseModule = await import('../../../constants/foodDatabase.ts');
      const foodDatabase = foodDatabaseModule.foodDatabase;
      
      // Flatten all categories into single array
      if (foodDatabase.proteins) allFoods.push(...foodDatabase.proteins);
      if (foodDatabase.carbs) allFoods.push(...foodDatabase.carbs);
      if (foodDatabase.fats) allFoods.push(...foodDatabase.fats);
      if (foodDatabase.vegetables) allFoods.push(...foodDatabase.vegetables);
      if (foodDatabase.fruits) allFoods.push(...foodDatabase.fruits);
      if (foodDatabase.dairy) allFoods.push(...foodDatabase.dairy);
      if (foodDatabase.snacks) allFoods.push(...foodDatabase.snacks);
      if (foodDatabase.beverages) allFoods.push(...foodDatabase.beverages);
      if (foodDatabase.meals) allFoods.push(...foodDatabase.meals);
      console.log(`📦 Loaded additional foods from constants`);
    } catch (err) {
      console.log('⚠️ Constants food database not found');
    }
    
    if (allFoods.length === 0) {
      console.warn('❌ No food datasets found');
      return null;
    }
    
    console.log(`📊 Total foods in database: ${allFoods.length}`);
    
    // Smart matching: case-insensitive, partial match on name
    const results = allFoods.filter(food => {
      const foodName = food.name?.toLowerCase() || '';
      const searchLower = searchKeyword.toLowerCase();
      
      // Match if search term is in food name OR food name is in search term
      return foodName.includes(searchLower) || searchLower.includes(foodName.split(' ')[0]);
    });

    if (results.length > 0) {
      console.log(`✅ Found ${results.length} matches in dataset:`, results.slice(0, 3).map(f => f.name));
      return results;
    }
    
    console.log('❌ No matches found in dataset');
    return null;

  } catch (error) {
    console.error('❌ Food dataset search error:', error);
    return null;
  }
}

/**
 * Search exercise dataset for workout information
 * @param {string} query - Exercise to search
 * @returns {Object|null} - Exercise data or null if not found
 */
async function searchExerciseDataset(query) {
  try {
    // Since exerciseDB uses external API, we'll use a simpler local dataset
    // or you can integrate with the RapidAPI if needed
    
    // For now, return null to let Gemini handle exercise queries
    // You can add a local exercise dataset here later
    
    const searchTerm = query.toLowerCase().trim();
    
    // Simple local exercise database (can be expanded)
    const localExercises = [
      { name: 'Push-ups', bodyPart: 'chest', equipment: 'body weight', target: 'pectorals' },
      { name: 'Pull-ups', bodyPart: 'back', equipment: 'pull-up bar', target: 'lats' },
      { name: 'Squats', bodyPart: 'legs', equipment: 'body weight', target: 'quadriceps' },
      { name: 'Lunges', bodyPart: 'legs', equipment: 'body weight', target: 'quadriceps' },
      { name: 'Plank', bodyPart: 'core', equipment: 'body weight', target: 'abs' },
      { name: 'Dumbbell Curl', bodyPart: 'arms', equipment: 'dumbbell', target: 'biceps' },
      { name: 'Tricep Dips', bodyPart: 'arms', equipment: 'bench', target: 'triceps' },
      { name: 'Shoulder Press', bodyPart: 'shoulders', equipment: 'dumbbell', target: 'deltoids' },
      { name: 'Deadlift', bodyPart: 'back', equipment: 'barbell', target: 'lower back' },
      { name: 'Bench Press', bodyPart: 'chest', equipment: 'barbell', target: 'pectorals' },
    ];
    
    const results = localExercises.filter(exercise =>
      exercise.name?.toLowerCase().includes(searchTerm) ||
      exercise.bodyPart?.toLowerCase().includes(searchTerm) ||
      exercise.target?.toLowerCase().includes(searchTerm)
    );

    return results.length > 0 ? results : null;

  } catch (error) {
    console.error('Exercise dataset search error:', error);
    return null;
  }
}

/**
 * Format food data for user-friendly response
 * @param {Array} foods - Food items from dataset
 * @returns {string} - Formatted response
 */
function formatFoodResponse(foods) {
  if (!foods || foods.length === 0) return null;

  const foodList = foods.slice(0, 5).map((food, index) => {
    // Debug log to see what fields are available
    if (index === 0) {
      console.log('📋 Food object structure:', Object.keys(food));
    }
    
    const parts = [];
    
    // Get food name - check all possible field names
    const foodName = food.name || food.dish_name || food.item || food.food || 'Unknown Food';
    parts.push(`**${foodName}**`);
    
    // Handle different field names from different datasets
    const calories = food.calories || food.calories_kcal;
    const protein = food.protein || food.protein_g;
    const carbs = food.carbs || food.carbohydrates || food.carbohydrates_g;
    const fats = food.fats || food.fat || food.fat_g;
    const water = food.water_content || food.water_content_g;
    
    if (calories) parts.push(`Calories: ${calories} kcal`);
    if (protein) parts.push(`Protein: ${protein}g`);
    if (carbs) parts.push(`Carbs: ${carbs}g`);
    if (fats) parts.push(`Fats: ${fats}g`);
    if (water) parts.push(`Water: ${water}g`);
    if (food.fiber) parts.push(`Fiber: ${food.fiber}g`);
    if (food.category) parts.push(`Category: ${food.category}`);
    
    return parts.join('\n');
  }).join('\n\n');

  const header = foods.length > 5 
    ? `I found ${foods.length} items in our database. Here are the top 5:\n\n`
    : `Here's the nutrition information from our database:\n\n`;

  return header + foodList + '\n\nWould you like more details about any specific item?';
}

/**
 * Format exercise data for user-friendly response
 * @param {Array} exercises - Exercise items from dataset
 * @returns {string} - Formatted response
 */
function formatExerciseResponse(exercises) {
  if (!exercises || exercises.length === 0) return null;

  const exerciseList = exercises.slice(0, 5).map(ex => {
    const parts = [];
    parts.push(`**${ex.name}**`);
    if (ex.bodyPart) parts.push(`Target: ${ex.bodyPart}`);
    if (ex.equipment) parts.push(`Equipment: ${ex.equipment}`);
    if (ex.target) parts.push(`Muscle: ${ex.target}`);
    
    return parts.join('\n');
  }).join('\n\n');

  const header = exercises.length > 5
    ? `I found ${exercises.length} exercises. Here are the top 5:\n\n`
    : `Here are the exercises from our database:\n\n`;

  return header + exerciseList + '\n\nWould you like detailed instructions for any exercise?';
}

/**
 * Detect if query is asking about food/nutrition
 * Enhanced with more patterns
 * @param {string} message - User message
 * @returns {boolean}
 */
function isFoodQuery(message) {
  const foodKeywords = [
    'calorie', 'protein', 'carb', 'fat', 'nutrition', 'nutrient',
    'food', 'meal', 'diet', 'eat', 'eating', 'vitamin', 'mineral',
    'macro', 'micro', 'kcal', 'gram', 'serving', 'biryani', 'chicken',
    'rice', 'meat', 'egg', 'fruit', 'vegetable', 'dish', 'curry',
    'how many calories', 'how much calories', 'nutritional value',
    'nutrients in', 'macros', 'how much protein'
  ];
  
  const lowerMessage = message.toLowerCase();
  const isFood = foodKeywords.some(keyword => lowerMessage.includes(keyword));
  
  if (isFood) {
    console.log('✅ Detected as FOOD query');
  }
  
  return isFood;
}

/**
 * Detect if query is asking about exercises
 * @param {string} message - User message
 * @returns {boolean}
 */
function isExerciseQuery(message) {
  const exerciseKeywords = [
    'exercise', 'workout', 'training', 'gym', 'fitness', 'muscle',
    'bicep', 'tricep', 'chest', 'back', 'leg', 'shoulder', 'abs',
    'cardio', 'strength', 'squat', 'push', 'pull', 'rep', 'set'
  ];
  
  const lowerMessage = message.toLowerCase();
  return exerciseKeywords.some(keyword => lowerMessage.includes(keyword));
}

/**
 * Main AI service function - Production Ready
 * Flow:
 * 1. Validate health scope
 * 2. Check food dataset first
 * 3. Check exercise dataset second
 * 4. Call Gemini AI only if needed
 * 5. Return safe fallback on any error
 * 
 * @param {string} userMessage - User's question
 * @param {Array} conversationHistory - Previous messages
 * @returns {Promise<Object>} - Response with content and source
 */
export async function processAIChat(userMessage, conversationHistory = []) {
  try {
    console.log('\n🤖 Processing message:', userMessage);
    console.log('━'.repeat(60));
    
    // STEP 1: Validate health scope BEFORE processing
    if (!isHealthRelated(userMessage)) {
      console.log('🚫 OUT-OF-SCOPE query detected');
      return {
        content: "Sorry, I can only help with health, nutrition, and exercise related questions. I'm your health assistant - how can I help you with your fitness or wellness goals?",
        source: 'system',
      };
    }

    // STEP 2: Check food dataset FIRST (fastest, no API call)
    if (isFoodQuery(userMessage)) {
      console.log('🍽️ Food query detected - checking dataset...');
      const foodData = await searchFoodDataset(userMessage);
      if (foodData && foodData.length > 0) {
        const response = formatFoodResponse(foodData);
        if (response) {
          console.log('✅ DATASET HIT - Returning food data (no Gemini call)');
          console.log('━'.repeat(60));
          return {
            content: response,
            source: 'dataset',
          };
        }
      }
      console.log('⚠️ No food found in dataset');
    }

    // STEP 3: Check exercise dataset SECOND (also fast, no API call)
    if (isExerciseQuery(userMessage)) {
      console.log('💪 Exercise query detected - checking dataset...');
      const exerciseData = await searchExerciseDataset(userMessage);
      if (exerciseData && exerciseData.length > 0) {
        const response = formatExerciseResponse(exerciseData);
        if (response) {
          console.log('✅ DATASET HIT - Returning exercise data (no Gemini call)');
          console.log('━'.repeat(60));
          return {
            content: response,
            source: 'dataset',
          };
        }
      }
      console.log('⚠️ No exercise found in dataset');
    }

    // STEP 4: Call Gemini AI only if dataset search failed
    console.log('🤖 CALLING GEMINI AI - Dataset search failed');
    console.log('Query:', userMessage.substring(0, 50));
    const aiResponse = await callGeminiAPI(userMessage, conversationHistory);
    
    console.log('✅ Gemini response received');
    console.log('━'.repeat(60));
    return {
      content: aiResponse,
      source: 'ai',
    };

  } catch (error) {
    // STEP 5: Safe fallback - NEVER crash
    console.error('❌ processAIChat error:', {
      message: error.message,
      stack: error.stack?.substring(0, 200)
    });
    console.log('━'.repeat(60));
    
    return {
      content: "I apologize, but I'm experiencing technical difficulties right now. Please try again in a moment. I'm here to help with your health, nutrition, and fitness questions!",
      source: 'system',
    };
  }
}

export default {
  processAIChat,
  searchFoodDataset,
  searchExerciseDataset,
};
