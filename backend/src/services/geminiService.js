import dotenv from 'dotenv';
import { formatHealthResponse, searchHealthDataset } from '../constants/healthDataset.js';
import { getLogger } from '../utils/chatLogger.js';
import { getConversationManager } from '../utils/conversationContext.js';
import {
    detectHealthCategory,
    isHealthQuery,
    isNutritionQuery,
    isRestrictedMedicalQuery
} from '../utils/healthDetection.js';
import {
    addPersonality,
    generateErrorResponse,
    generateFollowUp,
    generateGreeting,
    rejectOutOfScope
} from '../utils/responseTemplates.js';

dotenv.config();

/**
 * ENHANCED DUAL-PURPOSE AI CHATBOT SERVICE
 * 
 * Features:
 * ✅ Health/nutrition-only scope enforcement
 * ✅ Multi-turn context (last 2-3 messages)
 * ✅ Dynamic, friendly responses with emojis
 * ✅ Quick follow-up suggestions
 * ✅ Comprehensive logging & analytics
 * ✅ Typing indicators for API responses
 * ✅ Safety & personality-driven responses
 */

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_TIMEOUT_MS = 15000;

/**
 * Enhanced Nutrition Guard Prompt
 */
const NUTRITION_GUARD_PROMPT = `You are FitFaat Nutrition Expert - friendly, informative, health-focused.

SCOPE: ONLY nutrition and food-related topics.
- Food calories, macronutrients (protein/carbs/fat)
- Meal planning and food combinations
- Hydration and water intake
- Vitamins and minerals in foods
- Cooking and food preparation for health

STRICT BOUNDARIES:
❌ Medical diagnosis or disease treatment
❌ Prescription medications
❌ Weight loss/gain regimens
❌ Exercise routines (health assistant handles this)
❌ Unrelated topics

PERSONALITY:
- Friendly and encouraging tone
- Use emojis: 🍏 🥗 💧 🥑 🍽️
- Keep responses concise (2-3 sentences)
- Always suggest follow-up nutrition topics

If asked outside scope: "I focus on nutrition and food advice 🍏. For other topics, consult a professional."`;

/**
 * Enhanced Health Guard Prompt
 */
const HEALTH_GUARD_PROMPT = `You are FitFaat Wellness Coach - supportive, evidence-based, empathetic.

SAFE TOPICS:
✅ Sleep quality, duration, sleep hygiene
✅ Hydration and water intake
✅ Fitness, exercise, movement
✅ Vitamins, minerals, supplements
✅ Stress management, meditation
✅ Mental wellness and focus
✅ General energy and metabolism

STRICT BOUNDARIES:
❌ Medical diagnosis
❌ Prescription or treatment advice
❌ Pregnancy medical guidance
❌ Emergency situations
❌ Mental health conditions (needs professional)

PERSONALITY:
- Supportive and empathetic tone
- Use wellness emojis: 💪 😴 💧 🧘 🌟
- Provide evidence-based info
- Always include disclaimer: "This is informational guidance. Consult a healthcare professional for medical concerns."

RESPONSE STYLE:
- Keep it short and actionable (2-3 sentences)
- Suggest related wellness topics
- Recommend professional help when needed`;

/**
 * Extract food name from natural language queries
 * @param {string} message - User message
 * @returns {string} - Cleaned food name
 */
function extractFoodKeywords(message) {
  const phrasesToRemove = [
    'i am going to eat', 'i am gonna eat', 'i will eat', 'i want to eat',
    'tell me calories in', 'tell me calories of', 'show me calories in',
    'how much calories in', 'how many calories in', 'how much calories does',
    'how many calories does', 'what is the calorie', 'what are the calories',
    'how much protein in', 'how much protein does', 'how many protein in',
    'how much carbs in', 'how many carbs in', 'how much fat in',
    'calories in', 'protein in', 'carbs in', 'fat in', 'nutrition of',
    'nutritional value of', 'nutrients in', 'macros in', 'macros of',
    'calorie content of', 'tell me', 'show me', 'what is', 'what are',
    'how much', 'how many', 'i am eating', 'i ate', 'i had'
  ];
  
  let cleaned = message.toLowerCase().trim();
  
  phrasesToRemove.forEach(phrase => {
    cleaned = cleaned.replace(new RegExp(phrase, 'gi'), '');
  });
  
  cleaned = cleaned.replace(/[?!.,;:]/g, '');
  cleaned = cleaned.trim().replace(/\s+/g, ' ');
  
  console.log(`🔍 Extracted food name: "${cleaned}" from "${message}"`);
  return cleaned;
}

/**
 * Detect greetings
 */
function isGreeting(message) {
  const lowerMessage = message.toLowerCase().trim();
  const greetings = [
    'hi', 'hello', 'hey', 'salam', 'assalamualaikum',
    'good morning', 'good afternoon', 'good evening',
    'how are you', 'thanks', 'thank you', 'bye', 'goodbye',
    'help', 'assist'
  ];

  return greetings.some(greeting => 
    lowerMessage === greeting || 
    lowerMessage.startsWith(greeting + ' ') || 
    lowerMessage.endsWith(' ' + greeting)
  );
}

/**
 * Validate if message is nutrition-related
 * Only allows greetings and food/nutrition queries
 * @param {string} message - User message to validate
 * @returns {boolean} - True if nutrition-related or greeting
 */
function isNutritionRelated(message) {
  const lowerMessage = message.toLowerCase().trim();
  
  // Allow greetings
  if (isGreeting(message)) {
    return true;
  }
  
  // Check nutrition keywords only (no exercise or fitness)
  const nutritionKeywords = [
    'calorie', 'protein', 'carb', 'fat', 'nutrition', 'nutrient', 'vitamin', 'mineral',
    'macro', 'micro', 'diet', 'meal', 'food', 'eat', 'drink', 'water', 'hydration',
    'fiber', 'sugar', 'sodium', 'cholesterol', 'serving', 'kcal', 'gram', 'mg',
    'biryani', 'chicken', 'rice', 'meat', 'egg', 'fruit', 'vegetable', 'dish', 'curry'
  ];
  
  return nutritionKeywords.some(keyword => lowerMessage.includes(keyword));
}

/**
 * Generate warm greeting response
 */
function generateGreetingResponse() {
  return generateGreeting();
}

/**
 * Call Google Gemini API with nutrition-guarded prompt
 * Only called when food is NOT found in dataset
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
    const fullPrompt = `${NUTRITION_GUARD_PROMPT}

Previous conversation:
${contextMessages}

Current user question: ${userMessage}

Provide a helpful nutrition-focused response:`;

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
 * Uses smart keyword extraction and case-insensitive matching
 * @param {string} query - Food item to search
 * @returns {Array|null} - Food data array or null if not found
 */
async function searchFoodDataset(query) {
  try {
    console.log(`🔎 Searching food dataset for: "${query}"`);
    
    // Extract food name from natural language query
    const searchKeyword = extractFoodKeywords(query);
    const allFoods = [];
    
    // Load Pakistani dishes dataset (comprehensive - 13,000+ items)
    try {
      const pakistaniDataModule = await import('../../../app/Dataset/dataSet.js');
      if (pakistaniDataModule.pakistaniDishes) {
        allFoods.push(...pakistaniDataModule.pakistaniDishes);
        console.log(`📦 Loaded ${pakistaniDataModule.pakistaniDishes.length} Pakistani dishes`);
      }
    } catch (err) {
      console.log('⚠️ Pakistani dishes dataset not found');
    }
    
    // Load basic food database from constants
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
    
    // Smart case-insensitive matching
    const results = allFoods.filter(food => {
      const foodName = (food.name || food.dish_name || food.item || food.food || '').toLowerCase();
      const searchLower = searchKeyword.toLowerCase();
      
      // Match if search term is in food name OR food name is in search term
      return foodName.includes(searchLower) || searchLower.includes(foodName);
    });

    if (results.length > 0) {
      console.log(`✅ Found ${results.length} matches in dataset`);
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
 * Format food response with emojis
 */
function formatFoodResponse(foods, originalQuery = '') {
  if (!foods || foods.length === 0) return null;

  const food = foods[0];
  const name = food.name || food.dish_name || food.item || food.food || 'Food';
  const serving = food.serving_size || '1 serving';
  const calories = food.calories || food.calories_kcal || 0;
  const protein = food.protein || food.protein_g || 0;
  const carbs = food.carbs || food.carbohydrates || food.carbohydrates_g || 0;
  const fats = food.fats || food.fat || food.fat_g || 0;

  const queryLower = originalQuery.toLowerCase();

  // Specific nutrient queries
  if (queryLower.includes('protein')) {
    return `${name} (${serving}) contains about **${protein}g** of protein 💪`;
  }
  if (queryLower.includes('calorie')) {
    return `${name} (${serving}) has approximately **${calories}** kcal 🔥`;
  }
  if (queryLower.includes('carb')) {
    return `${name} (${serving}) contains about **${carbs}g** of carbs 🌾`;
  }
  if (queryLower.includes('fat')) {
    return `${name} (${serving}) has about **${fats}g** of fat 🧈`;
  }

  // Full breakdown
  let response = `🍽️ **${name}** (${serving})\n\n`;
  response += `🔥 **${calories}** kcal | `;
  response += `💪 **${protein}g** protein | `;
  response += `🌾 **${carbs}g** carbs | `;
  response += `🧈 **${fats}g** fat`;

  if (food.fiber) {
    response += `\n📍 Fiber: **${food.fiber}g**`;
  }

  return response;
}

/**
 * Detect food queries
 */
function isFoodQuery(message) {
  const foodKeywords = [
    'calorie', 'protein', 'carb', 'fat', 'nutrition', 'food',
    'meal', 'diet', 'eat', 'eating', 'vitamin', 'macro',
    'biryani', 'chicken', 'rice', 'meat', 'egg', 'fruit',
    'vegetable', 'curry', 'roll', 'burger', 'pizza'
  ];

  return foodKeywords.some(keyword => message.toLowerCase().includes(keyword));
}

/**
 * Check if query is specifically asking for dataset information
 * Only allows: calories, protein, fat, carbs, hydration, water
 * @param {string} userMessage - User message to check
 * @returns {boolean} - True if message contains dataset keywords
 */
function isDatasetQuery(userMessage) {
  const datasetKeywords = ['calorie', 'calories', 'protein', 'carb', 'carbs', 'fat', 'hydration', 'water'];
  const lowerMessage = userMessage.toLowerCase();
  return datasetKeywords.some(keyword => lowerMessage.includes(keyword));
}

/**
 * DUAL-PURPOSE AI Chat Service
 * Flow:
 * 1. Check for greetings → warm response
 * 2. Check nutrition scope:
 *    a. If food query → search dataset FIRST
 *    b. If found in dataset → return (NO Gemini call)
 *    c. If not found → return "not found"
 * 3. Check health scope:
 *    a. If restricted medical → reject
 *    b. If health query → search health dataset
 *    c. Return with disclaimer
 * 4. Out of scope → reject politely
 * 5. Fallback → safe error handling
 * 
 * @param {string} userMessage - User's question
 * @param {string} sessionId - Session identifier (optional)
 * @param {Array} conversationHistory - Previous messages (legacy)
 * @returns {Promise<Object>} - {content, source, sessionId, processingTime}
 */
export async function processAIChat(userMessage, sessionId = 'default', conversationHistory = []) {
  const startTime = Date.now();
  const logger = getLogger();
  const conversationMgr = getConversationManager();

  try {
    console.log('\n🤖 Processing query:', userMessage);
    console.log('📍 Session:', sessionId);
    console.log('━'.repeat(60));

    const session = conversationMgr.getSession(sessionId);
    const history = conversationMgr.getHistory(sessionId);

    let response;
    let source;
    let responseType;
    let category = null;
    let status = 'success';

    // ===== STEP 1: GREETINGS =====
    if (isGreeting(userMessage)) {
      console.log('👋 Greeting detected');
      response = generateGreetingResponse();
      source = 'system';
      responseType = 'greeting';
    }

    // ===== STEP 2: NUTRITION QUERIES =====
    else if (isNutritionQuery(userMessage)) {
      console.log('🥗 Nutrition query detected');
      responseType = 'nutrition';

      // Check if query is specifically asking for dataset information
      if (isDatasetQuery(userMessage)) {
        console.log('🍽️ Dataset query detected - searching food dataset...');
        const foodData = await searchFoodDataset(userMessage);

        if (foodData && foodData.length > 0) {
          response = formatFoodResponse(foodData, userMessage);
          source = 'dataset';
          console.log('✅ Found in database');
        } else {
          response = generateErrorResponse('not_found');
          source = 'system';
          status = 'not_found';
          console.log('❌ Not found in database');
        }
      } else {
        response = "I can provide calories, protein, fat, carbs, and hydration info. Please ask specifically about them. 🍏";
        source = 'system';
        console.log('ℹ️ Non-dataset nutrition query - showing guidance');
      }

      // Add follow-up suggestions for nutrition
      if (source === 'dataset') {
        response += generateFollowUp('nutrition');
      }
    }

    // ===== STEP 3: HEALTH & WELLNESS QUERIES =====
    else if (isHealthQuery(userMessage)) {
      console.log('🏥 Health query detected');
      responseType = 'health';

      if (isRestrictedMedicalQuery(userMessage)) {
        response = "I can't provide medical diagnoses or treatment advice 🏥. Please consult a healthcare professional.";
        source = 'system';
        status = 'restricted';
        console.log('🚫 Restricted medical topic');
      } else {
        category = detectHealthCategory(userMessage);
        const healthData = searchHealthDataset(category);

        if (healthData) {
          response = formatHealthResponse(healthData);
          source = 'health-dataset';
          response += generateFollowUp(category);
          console.log(`✅ Health category: ${category}`);
        } else {
          response = "I can help with sleep 😴, fitness 💪, hydration 💧, vitamins 💊, stress 🧘, and wellness 🌟. What interests you?";
          source = 'system';
          status = 'not_found';
        }
      }
    }

    // ===== STEP 4: OUT OF SCOPE =====
    else {
      console.log('🚫 Out-of-scope query');
      responseType = 'rejected';
      response = rejectOutOfScope();
      source = 'system';
      status = 'out_of_scope';
    }

    // Add personality to response
    if (status === 'success') {
      response = addPersonality(response, 'encouragement');
    }

    // Log the interaction
    const processingTime = Date.now() - startTime;
    logger.log({
      sessionId,
      userMessage,
      responseType,
      source,
      category,
      response,
      processingTime,
      status,
      error: null
    });

    // Store in conversation history
    conversationMgr.addMessage(sessionId, 'user', userMessage, category);
    conversationMgr.addMessage(sessionId, 'assistant', response);

    console.log(`✅ Response time: ${processingTime}ms`);
    console.log('━'.repeat(60));

    return {
      content: response,
      source,
      sessionId,
      processingTime
    };

  } catch (error) {
    const processingTime = Date.now() - startTime;

    console.error('❌ Error:', error.message);
    console.log('━'.repeat(60));

    const logger = getLogger();
    logger.log({
      sessionId,
      userMessage,
      responseType: 'error',
      source: 'system',
      response: null,
      processingTime,
      status: 'error',
      error: error.message
    });

    return {
      content: "I apologize for the technical issue. Please try again. 😊",
      source: 'system',
      sessionId,
      processingTime
    };
  }
}

/**
 * Get conversation history for a session
 */
export function getSessionHistory(sessionId = 'default') {
  const conversationMgr = getConversationManager();
  return conversationMgr.getHistory(sessionId);
}

/**
 * Clear session
 */
export function clearSession(sessionId = 'default') {
  const conversationMgr = getConversationManager();
  conversationMgr.clearSession(sessionId);
}

/**
 * Get analytics
 */
export function getAnalytics(hours = 24) {
  const logger = getLogger();
  return logger.getAnalytics(hours);
}

/**
 * Print analytics report
 */
export function printAnalyticsReport(hours = 24) {
  const logger = getLogger();
  logger.printReport(hours);
}

export default {
  processAIChat,
  getSessionHistory,
  clearSession,
  getAnalytics,
  printAnalyticsReport,
  searchFoodDataset
};
