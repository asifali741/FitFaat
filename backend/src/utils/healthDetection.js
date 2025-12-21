/**
 * Health Query Detection & Processing
 * Categorizes user queries as nutrition, health, or out-of-scope
 * Includes safety filters for restricted medical topics
 */

/**
 * Detect if query is about general health and wellness
 * Includes: sleep, fitness, hydration, vitamins, mental health, general wellness
 * Excludes: Medical diagnosis, prescription advice, medical conditions
 * @param {string} message - User message
 * @returns {boolean} - True if health-related
 */
export function isHealthQuery(message) {
  const lowerMessage = message.toLowerCase();

  // Health-related keywords
  const healthKeywords = [
    // Sleep
    'sleep', 'insomnia', 'sleepy', 'tired', 'fatigue', 'rest', 'bedtime', 'nap',
    
    // Hydration
    'water', 'hydration', 'dehydration', 'thirst', 'drink', 'fluids',
    
    // Fitness
    'exercise', 'workout', 'fitness', 'gym', 'running', 'walking', 'yoga', 'stretching',
    'strength', 'cardio', 'training', 'physical activity', 'steps',
    
    // Vitamins & Minerals
    'vitamin', 'mineral', 'iron', 'calcium', 'magnesium', 'zinc', 'b12', 'vitamin d',
    'supplement', 'protein', 'carbs', 'fat',
    
    // Mental Health
    'stress', 'anxiety', 'depression', 'mood', 'mental health', 'mindfulness', 'meditation',
    'focus', 'concentration', 'energy',
    
    // General Wellness
    'health', 'wellness', 'lifestyle', 'diet', 'nutrition', 'eating', 'food',
    'weight', 'metabolism', 'digestion', 'immune', 'healthy',
    
    // Body Functions
    'metabolism', 'digestion', 'circulation', 'breathing', 'heart rate', 'energy levels'
  ];

  return healthKeywords.some(keyword => lowerMessage.includes(keyword));
}

/**
 * Detect if query is about nutrition/food
 * @param {string} message - User message
 * @returns {boolean} - True if nutrition-related
 */
export function isNutritionQuery(message) {
  const lowerMessage = message.toLowerCase();

  const nutritionKeywords = [
    'calorie', 'protein', 'carb', 'fat', 'nutrition', 'nutrient',
    'food', 'meal', 'eat', 'eating', 'recipe', 'cook', 'cooking',
    'kcal', 'gram', 'serving', 'portion',
    'how much calories', 'how many calories', 'nutritional value',
    'i am going to eat', 'i am gonna eat', 'tell me calories',
    'how much protein', 'macros'
  ];

  return nutritionKeywords.some(keyword => lowerMessage.includes(keyword));
}

/**
 * Detect restricted medical topics that should not be answered
 * Returns true if query contains unsafe medical topics
 * @param {string} message - User message
 * @returns {boolean} - True if contains restricted topics
 */
export function isRestrictedMedicalQuery(message) {
  const lowerMessage = message.toLowerCase();

  // Restricted medical topics
  const restrictedTopics = [
    // Medical diagnosis
    'diagnose', 'diagnosis', 'disease', 'cancer', 'diabetes',
    'hypertension', 'heart disease', 'asthma', 'arthritis',
    'infection', 'virus', 'bacteria',
    
    // Medical conditions
    'medication', 'medicine', 'prescription', 'drug',
    'treatment', 'therapy', 'surgery', 'operation',
    
    // Symptoms requiring medical attention
    'chest pain', 'difficulty breathing', 'severe headache',
    'emergency', 'urgent', 'critical', 'severe',
    
    // Pregnancy/reproduction
    'pregnant', 'pregnancy', 'contraception', 'abortion',
    
    // Mental health requiring professional help
    'suicidal', 'self-harm', 'eating disorder',
    
    // Age restrictions
    'baby', 'infant', 'newborn', 'toddler' // Age-specific medical advice
  ];

  return restrictedTopics.some(topic => lowerMessage.includes(topic));
}

/**
 * Detect what type of health topic the query is about
 * @param {string} message - User message
 * @returns {string} - Health category
 */
export function detectHealthCategory(message) {
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.match(/sleep|insomnia|tired|fatigue|bedtime|nap/)) return 'sleep';
  if (lowerMessage.match(/water|hydration|dehydration|drink|fluids|thirst/)) return 'hydration';
  if (lowerMessage.match(/exercise|workout|fitness|gym|running|walking|yoga|training|cardio|steps/)) return 'fitness';
  if (lowerMessage.match(/vitamin|mineral|iron|calcium|zinc|b12|supplement|magnesium/)) return 'vitamins';
  if (lowerMessage.match(/stress|anxiety|mood|mental|mindfulness|meditation|focus|depression/)) return 'mental';
  if (lowerMessage.match(/health|wellness|lifestyle|weight|metabolism|digestion|immune|diet/)) return 'wellness';

  return 'other';
}

/**
 * Get search keywords from health query
 * @param {string} message - User message
 * @returns {string} - Cleaned keywords
 */
export function extractHealthKeywords(message) {
  const lowerMessage = message.toLowerCase();

  // Common phrases to remove
  const phrasesToRemove = [
    'tell me about', 'how do i', 'how can i', 'what is', 'what are',
    'how to', 'tips for', 'advice on', 'help with', 'information about',
    'i want to', 'i need to', 'how much', 'how many', 'what should'
  ];

  let cleaned = lowerMessage;

  phrasesToRemove.forEach(phrase => {
    cleaned = cleaned.replace(new RegExp(phrase, 'gi'), '');
  });

  // Remove punctuation
  cleaned = cleaned.replace(/[?!.,;:]/g, '');

  // Remove extra spaces
  cleaned = cleaned.trim().replace(/\s+/g, ' ');

  return cleaned;
}

/**
 * Validate if query is appropriate to answer
 * @param {string} message - User message
 * @returns {Object} - { safe: boolean, reason?: string }
 */
export function validateQuery(message) {
  // Check for restricted medical topics
  if (isRestrictedMedicalQuery(message)) {
    return {
      safe: false,
      reason: 'medical'
    };
  }

  // Check if it's a valid health or nutrition query
  if (!isHealthQuery(message) && !isNutritionQuery(message)) {
    return {
      safe: false,
      reason: 'out_of_scope'
    };
  }

  return { safe: true };
}
