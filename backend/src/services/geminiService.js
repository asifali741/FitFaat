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
const NUTRITION_GUARD_PROMPT = `You are HeaLora - a friendly, knowledgeable AI health companion for the FitFaat app.

YOUR EXPERTISE:
✅ Nutrition advice: calories, protein, carbs, fats, vitamins, minerals
✅ Weight management tips: healthy weight loss/gain strategies
✅ Diet planning: meal suggestions, portion control, balanced eating
✅ Fitness guidance: exercise recommendations, workout tips
✅ Hydration: water intake, healthy beverages
✅ Sleep & recovery: rest, relaxation techniques
✅ General wellness: stress management, healthy lifestyle tips

PERSONALITY:
- Warm, supportive, and encouraging tone
- Use emojis naturally: 🍏 🥗 💧 🥑 🍽️ 💪 😴 🌟
- Give practical, actionable advice
- Be conversational and friendly
- Provide evidence-based information

RESPONSE STYLE:
- Keep responses concise but helpful (3-5 sentences)
- When giving tips, use bullet points or numbered lists
- Include a helpful follow-up question or suggestion
- For medical concerns, recommend consulting a healthcare professional

IMPORTANT:
- Be helpful and informative for general health questions
- Don't refuse to answer legitimate health/nutrition/fitness questions
- Provide mature, thoughtful responses
- If user asks for food suggestions, recommend specific foods with their nutritional benefits`;

/**
 * Intent Detection Prompt - Used to classify user queries
 */
const INTENT_DETECTION_PROMPT = `Analyze the user's message and classify it into one of these categories:

CATEGORIES:
1. "specific_nutrient" - User asks for specific nutritional VALUE of a NAMED food
   Examples: "how much protein in biryani", "calories in rice", "fat content of chicken"
   
2. "food_suggestion" - User asks for food RECOMMENDATIONS based on a nutrient
   Examples: "what foods have high protein", "suggest foods for more energy", "what to eat for weight loss"
   
3. "general_health" - User asks general health/nutrition/fitness questions
   Examples: "how can I lose weight", "tips for better sleep", "how to build muscle"
   
4. "greeting" - User greets or says thanks
   Examples: "hi", "hello", "thanks", "bye"
   
5. "other" - Unrelated to health/nutrition

Respond with ONLY the category name (e.g., "specific_nutrient" or "general_health").
Do not include any explanation.

User message: `;

/**
 * Enhanced Health Guard Prompt
 */
const HEALTH_GUARD_PROMPT = `You are HeaLora - a supportive wellness coach for FitFaat users.

YOUR EXPERTISE:
✅ Sleep quality and sleep hygiene tips
✅ Hydration and water intake guidance
✅ Fitness, exercise, and movement advice
✅ Vitamins, minerals, and supplements info
✅ Stress management and meditation
✅ Mental wellness and focus
✅ Energy and metabolism optimization
✅ Weight management strategies
✅ Healthy lifestyle habits

PERSONALITY:
- Supportive and empathetic tone
- Use wellness emojis: 💪 😴 💧 🧘 🌟 🏃 🥗
- Provide practical, actionable advice
- Be encouraging and motivating

RESPONSE STYLE:
- Give helpful, mature responses (3-5 sentences)
- Use bullet points for tips and suggestions
- Include actionable next steps
- Add disclaimer only for medical-specific questions

Note: For serious medical conditions, recommend consulting a healthcare professional.`;

/**
 * Call Gemini API to detect user intent
 * @param {string} message - User message
 * @returns {Promise<string>} - Intent category
 */
async function detectIntent(message) {
  try {
    if (!GEMINI_API_KEY) {
      console.log('⚠️ No Gemini API key, using fallback intent detection');
      return fallbackIntentDetection(message);
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${GEMINI_API_KEY}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: INTENT_DETECTION_PROMPT + message }] }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 50,
        }
      })
    });

    if (!response.ok) {
      console.log('⚠️ Gemini intent detection failed, using fallback');
      return fallbackIntentDetection(message);
    }

    const data = await response.json();
    const intent = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim().toLowerCase();
    
    console.log(`🎯 Detected intent: ${intent}`);
    
    // Validate intent
    const validIntents = ['specific_nutrient', 'food_suggestion', 'general_health', 'greeting', 'other'];
    if (validIntents.includes(intent)) {
      return intent;
    }
    
    return fallbackIntentDetection(message);
  } catch (error) {
    console.error('Intent detection error:', error.message);
    return fallbackIntentDetection(message);
  }
}

/**
 * Fallback intent detection using keywords
 */
function fallbackIntentDetection(message) {
  const lowerMsg = message.toLowerCase();
  
  // Check for greetings
  if (isGreeting(message)) {
    return 'greeting';
  }
  
  // Check for specific nutrient queries (asking about specific food)
  const nutrientKeywords = ['how much', 'how many', 'tell me', 'what is the', 'calories in', 'protein in', 'fat in', 'carbs in', 'value of'];
  const foodIndicators = ['in ', 'of ', 'has', 'does', 'contain'];
  
  const hasNutrientKeyword = nutrientKeywords.some(k => lowerMsg.includes(k));
  const hasFoodIndicator = foodIndicators.some(k => lowerMsg.includes(k));
  
  if (hasNutrientKeyword && hasFoodIndicator) {
    return 'specific_nutrient';
  }
  
  // Check for food suggestion queries
  const suggestionKeywords = ['suggest', 'recommend', 'what should i eat', 'what can i eat', 'what to eat', 'foods for', 'foods with', 'high in', 'rich in', 'best foods'];
  if (suggestionKeywords.some(k => lowerMsg.includes(k))) {
    return 'food_suggestion';
  }
  
  // Check for general health queries
  const healthKeywords = ['how can i', 'how do i', 'tips for', 'ways to', 'help me', 'advice', 'lose weight', 'gain weight', 'build muscle', 'sleep better', 'more energy', 'healthy'];
  if (healthKeywords.some(k => lowerMsg.includes(k))) {
    return 'general_health';
  }
  
  return 'general_health'; // Default to general health instead of rejecting
}

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
 * Call Google Gemini API for general health/nutrition advice
 * @param {string} userMessage - The user's question
 * @param {Array} conversationHistory - Previous messages for context
 * @param {string} promptType - 'nutrition' or 'health' to select system prompt
 * @returns {Promise<string>} - AI response
 */
async function callGeminiAPI(userMessage, conversationHistory = [], promptType = 'nutrition') {
  try {
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not configured in environment variables');
    }

    // Build conversation context
    const contextMessages = conversationHistory
      .slice(-6) // Last 3 exchanges (6 messages)
      .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
      .join('\n');

    const systemPrompt = promptType === 'health' ? HEALTH_GUARD_PROMPT : NUTRITION_GUARD_PROMPT;

    // Construct the full prompt with context
    const fullPrompt = `${systemPrompt}

Previous conversation:
${contextMessages}

User question: ${userMessage}

Provide a helpful, friendly, and informative response:`;

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
 * Get food suggestions based on nutrient type
 * @param {string} nutrientType - Type of nutrient (protein, carbs, fat, etc.)
 * @param {number} limit - Number of suggestions to return
 * @returns {Promise<Array>} - Array of food suggestions with nutrient values
 */
async function getFoodSuggestions(nutrientType, limit = 5) {
  try {
    const allFoods = [];
    
    // Load Pakistani dishes dataset
    try {
      const pakistaniDataModule = await import('../../../app/Dataset/dataSet.js');
      if (pakistaniDataModule.pakistaniDishes) {
        allFoods.push(...pakistaniDataModule.pakistaniDishes);
      }
    } catch (err) {
      console.log('⚠️ Pakistani dishes dataset not found for suggestions');
    }
    
    if (allFoods.length === 0) return [];

    const nutrient = nutrientType.toLowerCase();
    
    // Sort foods by the requested nutrient (highest first)
    const sortedFoods = allFoods
      .filter(food => {
        const value = food[nutrient] || food[`${nutrient}_g`] || 0;
        return value > 0;
      })
      .sort((a, b) => {
        const aValue = a[nutrient] || a[`${nutrient}_g`] || a.protein || a.protein_g || 0;
        const bValue = b[nutrient] || b[`${nutrient}_g`] || b.protein || b.protein_g || 0;
        return bValue - aValue;
      })
      .slice(0, limit);

    return sortedFoods;
  } catch (error) {
    console.error('Error getting food suggestions:', error);
    return [];
  }
}

/**
 * Format food suggestions response
 * @param {Array} foods - Array of food items
 * @param {string} nutrientType - Type of nutrient
 * @returns {string} - Formatted response
 */
function formatFoodSuggestions(foods, nutrientType) {
  if (!foods || foods.length === 0) {
    return `I couldn't find specific food suggestions right now. Try asking about protein, carbs, or fats in specific foods! 🍽️`;
  }

  const nutrient = nutrientType.toLowerCase();
  let response = `Here are some great foods high in **${nutrientType}** 💪:\n\n`;

  foods.forEach((food, index) => {
    const name = food.name || food.dish_name || food.item || 'Food';
    const serving = food.serving_size || '1 serving';
    const value = food[nutrient] || food[`${nutrient}_g`] || food.protein || food.protein_g || 0;
    const calories = food.calories || food.calories_kcal || 0;
    
    response += `${index + 1}. **${name}** (${serving})\n`;
    response += `   • ${nutrientType}: **${value}g** | Calories: ${calories} kcal\n\n`;
  });

  response += `\n💡 Would you like more details about any of these foods?`;
  return response;
}

/**
 * ENHANCED AI Chat Service with Smart Intent Detection
 * Flow:
 * 1. Use Gemini to detect user intent
 * 2. greeting → warm response
 * 3. specific_nutrient → search dataset for specific food nutritional value
 * 4. food_suggestion → get food recommendations from dataset
 * 5. general_health → use Gemini for helpful health/nutrition advice
 * 6. other → still try to help with general response
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

    // ===== STEP 1: DETECT INTENT =====
    const intent = await detectIntent(userMessage);
    console.log(`🎯 Intent: ${intent}`);
    responseType = intent;

    // ===== STEP 2: HANDLE BASED ON INTENT =====
    
    if (intent === 'greeting') {
      // Handle greetings
      console.log('👋 Greeting detected');
      response = generateGreetingResponse();
      source = 'system';
    }
    
    else if (intent === 'specific_nutrient') {
      // User is asking for specific nutritional value of a food
      console.log('🍽️ Specific nutrient query - searching dataset...');
      const foodData = await searchFoodDataset(userMessage);

      if (foodData && foodData.length > 0) {
        response = formatFoodResponse(foodData, userMessage);
        source = 'dataset';
        console.log('✅ Found in database');
        response += '\n\n💡 Want to know about other foods? Just ask!';
      } else {
        // Food not found - use Gemini to provide general info
        console.log('❌ Not found in dataset, asking Gemini...');
        try {
          response = await callGeminiAPI(userMessage, history, 'nutrition');
          source = 'gemini';
          response += '\n\n📝 *Note: This food isn\'t in our local database yet, but here\'s what I know!*';
        } catch (error) {
          response = `I don't have that specific food in my database yet 🍽️. Try asking about common Pakistani foods like biryani, karahi, or nihari!`;
          source = 'system';
          status = 'not_found';
        }
      }
    }
    
    else if (intent === 'food_suggestion') {
      // User wants food recommendations
      console.log('💡 Food suggestion query - finding recommendations...');
      
      // Detect which nutrient they want
      const lowerMsg = userMessage.toLowerCase();
      let nutrientType = 'protein'; // default
      if (lowerMsg.includes('carb')) nutrientType = 'carbs';
      else if (lowerMsg.includes('fat')) nutrientType = 'fat';
      else if (lowerMsg.includes('calorie') || lowerMsg.includes('energy')) nutrientType = 'calories';
      else if (lowerMsg.includes('fiber')) nutrientType = 'fiber';
      
      const suggestions = await getFoodSuggestions(nutrientType, 5);
      
      if (suggestions.length > 0) {
        response = formatFoodSuggestions(suggestions, nutrientType);
        source = 'dataset';
      } else {
        // Use Gemini for suggestions if dataset fails
        try {
          response = await callGeminiAPI(userMessage, history, 'nutrition');
          source = 'gemini';
        } catch (error) {
          response = `Great question! 💪 For high protein, try eggs, chicken, lentils (daal), and yogurt. For energy, go for rice, roti, or fruits!`;
          source = 'system';
        }
      }
    }
    
    else if (intent === 'general_health' || intent === 'other') {
      // General health questions - use Gemini for mature, helpful response
      console.log('🏥 General health query - asking Gemini...');
      
      try {
        response = await callGeminiAPI(userMessage, history, 'health');
        source = 'gemini';
        console.log('✅ Gemini response received');
      } catch (error) {
        console.error('Gemini API error:', error.message);
        // Provide helpful fallback
        response = `That's a great question! 🌟 For personalized advice on this topic, I'd recommend consulting with a healthcare professional. In the meantime, feel free to ask me about specific foods or their nutritional values!`;
        source = 'system';
        status = 'gemini_error';
      }
    }

    // Add personality to successful responses
    if (status === 'success' && source !== 'system') {
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
