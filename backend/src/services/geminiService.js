import dotenv from 'dotenv';

dotenv.config();

/**
 * NUTRITION-ONLY AI Chatbot Service
 * Strictly focused on food nutrition and calories
 * - Greetings and well-wishing
 * - Food nutrition queries only
 * - Dataset-first logic (no Gemini if food exists)
 * - Polite rejection of non-nutrition queries
 */

// Gemini API Configuration (only used when food not found in dataset)
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_TIMEOUT_MS = 15000; // 15 seconds timeout

/**
 * Nutrition-only system prompt for Gemini AI
 * STRICTLY enforces food and nutrition topics only
 */
const NUTRITION_GUARD_PROMPT = `You are FitFaat Nutrition Assistant, specialized ONLY in food nutrition and calories.

STRICT RULES:
1. ONLY answer questions about:
   - Food nutrition (calories, protein, carbs, fat)
   - Macronutrients and micronutrients in foods
   - Meal nutrition and dietary information
   - Hydration and water content

2. REJECT ALL other topics including:
   - Exercise and fitness
   - Weight loss/gain advice
   - Medical or health advice
   - General wellness or lifestyle
   - Any non-nutrition topic

3. Response format:
   - Keep responses short and focused on nutrition facts
   - Always provide specific nutritional values when possible
   - If you don't have data, say "I don't have nutritional data for that food"
   
4. If user asks non-nutrition questions, respond:
   "Sorry, I can only help with food nutrition, calories, and dietary information."

Remember: You are a nutrition data provider, not a health coach or fitness trainer.`;

/**
 * Extract food name from natural language queries
 * Handles sentences like "I am going to eat Chicken Tandoori Roll"
 * @param {string} message - User message
 * @returns {string} - Cleaned food name
 */
function extractFoodKeywords(message) {
  // Common phrases to remove
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
  
  // Remove common phrases
  phrasesToRemove.forEach(phrase => {
    cleaned = cleaned.replace(new RegExp(phrase, 'gi'), '');
  });
  
  // Remove punctuation
  cleaned = cleaned.replace(/[?!.,;:]/g, '');
  
  // Remove extra spaces and trim
  cleaned = cleaned.trim().replace(/\s+/g, ' ');
  
  console.log(`🔍 Extracted food name: "${cleaned}" from "${message}"`);
  return cleaned;
}

/**
 * Detect greetings and well-wishing messages
 * @param {string} message - User message to check
 * @returns {boolean} - True if greeting detected
 */
function isGreeting(message) {
  const lowerMessage = message.toLowerCase().trim();
  
  // Common greetings
  const greetings = [
    'hi', 'hello', 'hey', 'salam', 'assalamualaikum', 'assalam o alaikum',
    'good morning', 'good afternoon', 'good evening', 'good night',
    'how are you', 'whats up', "what's up", 'sup',
    'thanks', 'thank you', 'tysm', 'ty', 'thx',
    'bye', 'goodbye', 'see you', 'cya',
    'help', 'assist', 'can you help', 'need help', 'help me'
  ];
  
  return greetings.some(greeting => lowerMessage === greeting || lowerMessage.startsWith(greeting + ' ') || lowerMessage.endsWith(' ' + greeting));
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
 * @returns {string} - Greeting message
 */
function generateGreetingResponse() {
  const greetings = [
    "Hello! 😊 I'm here to help you with food nutrition and calories. What would you like to eat?",
    "Hi there! 🍽️ I can tell you about calories and nutrition in your meals. What are you having today?",
    "Hey! 👋 Ask me about any food's calories, protein, carbs, or fat. What would you like to know?",
    "Assalamualaikum! 🌟 I'm your nutrition assistant. Tell me what you're eating and I'll share the nutritional info!",
    "Good day! 😊 I can help you track nutrition in your meals. What food are you curious about?"
  ];
  
  return greetings[Math.floor(Math.random() * greetings.length)];
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
 * Format food nutrition data for user-friendly response
 * Handles different query types (general, specific nutrient, multiple nutrients)
 * @param {Array} foods - Food items from dataset
 * @param {string} originalQuery - Original user query to detect intent
 * @returns {string} - Formatted response
 */
function formatFoodResponse(foods, originalQuery = '') {
  if (!foods || foods.length === 0) return null;

  const firstFood = foods[0];
  const queryLower = originalQuery.toLowerCase();
  
  // Get food name from any available field
  const foodName = firstFood.name || firstFood.dish_name || firstFood.item || firstFood.food || 'Unknown Food';
  
  // Get nutrition values with fallback field names
  const servingSize = firstFood.serving_size || '1 serving';
  const calories = firstFood.calories || firstFood.calories_kcal || 0;
  const protein = firstFood.protein || firstFood.protein_g || 0;
  const carbs = firstFood.carbs || firstFood.carbohydrates || firstFood.carbohydrates_g || 0;
  const fats = firstFood.fats || firstFood.fat || firstFood.fat_g || 0;
  
  // DETECT QUERY TYPE
  
  // A) Specific nutrient query (user asks for one thing only)
  if (queryLower.includes('how much protein') || queryLower.includes('protein in') || queryLower.includes('protein does') || queryLower.includes('protein value') || queryLower.includes('protein of')) {
    return `${foodName} (${servingSize}) contains about ${protein} g of protein.`;
  }
  
  if (queryLower.includes('how much calories') || queryLower.includes('how many calories') || queryLower.includes('calories in') || queryLower.includes('calories does') || queryLower.includes('calorie value') || queryLower.includes('calories of')) {
    return `${foodName} (${servingSize}) contains approximately ${calories} kcal.`;
  }
  
  if (queryLower.includes('how much carbs') || queryLower.includes('how many carbs') || queryLower.includes('carbs in') || queryLower.includes('carbohydrates in') || queryLower.includes('carb value') || queryLower.includes('carbs of')) {
    return `${foodName} (${servingSize}) contains about ${carbs} g of carbs.`;
  }
  
  if (queryLower.includes('how much fat') || queryLower.includes('how many fat') || queryLower.includes('fat in') || queryLower.includes('fat value') || queryLower.includes('fat of')) {
    return `${foodName} (${servingSize}) contains about ${fats} g of fat.`;
  }
  
  // B) General query or "I am going to eat..." format
  // Provide complete nutrition breakdown
  let response = `If you are going to eat ${foodName} (${servingSize}), it contains approximately:\n\n`;
  response += `• Calories: ${calories} kcal\n`;
  response += `• Protein: ${protein} g\n`;
  response += `• Carbs: ${carbs} g\n`;
  response += `• Fat: ${fats} g`;
  
  // Add fiber and water if available
  if (firstFood.fiber) {
    response += `\n• Fiber: ${firstFood.fiber} g`;
  }
  if (firstFood.water_content || firstFood.water_content_g) {
    const water = firstFood.water_content || firstFood.water_content_g;
    response += `\n• Water: ${water} g`;
  }
  
  return response;
}

/**
 * Detect if query is asking about food/nutrition
 * @param {string} message - User message
 * @returns {boolean}
 */
function isFoodQuery(message) {
  const foodKeywords = [
    'calorie', 'protein', 'carb', 'fat', 'nutrition', 'nutrient',
    'food', 'meal', 'diet', 'eat', 'eating', 'vitamin', 'mineral',
    'macro', 'micro', 'kcal', 'gram', 'serving', 'biryani', 'chicken',
    'rice', 'meat', 'egg', 'fruit', 'vegetable', 'dish', 'curry',
    'roll', 'burger', 'pizza', 'sandwich', 'salad', 'soup',
    'how many calories', 'how much calories', 'nutritional value',
    'nutrients in', 'macros', 'how much protein', 'i am going to eat',
    'i am gonna eat', 'tell me calories', 'show me calories'
  ];
  
  const lowerMessage = message.toLowerCase();
  return foodKeywords.some(keyword => lowerMessage.includes(keyword));
}

/**
 * Main nutrition service function - NUTRITION-ONLY
 * Flow:
 * 1. Check if greeting → return warm response
 * 2. Validate nutrition scope → reject if out of scope
 * 3. Search food dataset FIRST (dataset-based responses only)
 * 4. If not found in dataset → return polite "not found" message
 * 5. NEVER call Gemini if food exists in dataset
 * 6. Log all messages to database
 * 
 * @param {string} userMessage - User's question
 * @param {Array} conversationHistory - Previous messages
 * @returns {Promise<Object>} - Response with content and source
 */
export async function processAIChat(userMessage, conversationHistory = []) {
  try {
    console.log('\n🤖 Processing nutrition query:', userMessage);
    console.log('━'.repeat(60));
    
    // STEP 1: Check for greetings first
    if (isGreeting(userMessage)) {
      console.log('👋 Greeting detected - sending warm response');
      console.log('━'.repeat(60));
      return {
        content: generateGreetingResponse(),
        source: 'system',
      };
    }

    // STEP 2: Validate nutrition scope (reject non-nutrition queries)
    if (!isNutritionRelated(userMessage)) {
      console.log('🚫 OUT-OF-SCOPE query detected - not nutrition-related');
      console.log('━'.repeat(60));
      return {
        content: "Sorry, I can only help with food nutrition, calories, and dietary information.",
        source: 'system',
      };
    }

    // STEP 3: Check food dataset (DATASET-FIRST - NO GEMINI IF FOUND)
    if (isFoodQuery(userMessage)) {
      console.log('🍽️ Food query detected - searching dataset...');
      const foodData = await searchFoodDataset(userMessage);
      
      if (foodData && foodData.length > 0) {
        // Format response based on query type
        const response = formatFoodResponse(foodData, userMessage);
        if (response) {
          console.log('✅ DATASET HIT - Returning nutrition data (no Gemini call)');
          console.log('━'.repeat(60));
          return {
            content: response,
            source: 'dataset',
          };
        }
      }
      
      // Food not found in dataset
      console.log('❌ Food not found in dataset');
      console.log('━'.repeat(60));
      return {
        content: "Sorry, I don't have nutritional data for this food yet.",
        source: 'system',
      };
    }

    // STEP 4: If not a food query but nutrition-related, provide guidance
    console.log('ℹ️ Nutrition-related but not a food query - providing guidance');
    console.log('━'.repeat(60));
    return {
      content: "I can help you find calories, protein, carbs, and fat in foods. Try asking like:\n• 'How many calories in biryani?'\n• 'I am going to eat Chicken Tandoori Roll'\n• 'Tell me nutrition of rice'",
      source: 'system',
    };

  } catch (error) {
    // STEP 5: Safe fallback - NEVER crash
    console.error('❌ processAIChat error:', {
      message: error.message,
      stack: error.stack?.substring(0, 200)
    });
    console.log('━'.repeat(60));
    
    return {
      content: "I apologize, but I'm experiencing technical difficulties right now. Please try again in a moment.",
      source: 'system',
    };
  }
}

export default {
  processAIChat,
  searchFoodDataset,
};
