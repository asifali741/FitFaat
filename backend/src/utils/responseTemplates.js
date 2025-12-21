/**
 * Response Templates & Dynamic Content
 * Generates varied, friendly responses with proper tone
 */

/**
 * Multiple greeting templates
 * @returns {string} Random greeting
 */
export function generateGreeting() {
  const greetings = [
    "Hello! 👋 I'm here to help you with nutrition and wellness advice. What would you like to know?",
    "Hi there! 🍏 I specialize in nutrition, fitness, and wellness. How can I help?",
    "Hey! 💪 Ready to learn about health, nutrition, or wellness? Ask away!",
    "Welcome! 🌟 I can help with nutrition, hydration, fitness, and wellness tips. What's on your mind?",
    "Hi! 😊 I'm your nutrition and wellness guide. What health question do you have?"
  ];
  return greetings[Math.floor(Math.random() * greetings.length)];
}

/**
 * Out-of-scope rejection templates
 * @param {string} topic - What they asked about
 * @returns {string} Friendly rejection with guidance
 */
export function rejectOutOfScope(topic = '') {
  const rejections = [
    "I focus only on nutrition and wellness advice 🍏. For other topics, please consult a professional.",
    "That's outside my expertise! I specialize in health, nutrition, and wellness. What would you like to know? 💪",
    "I'm here specifically for nutrition and wellness guidance 🌟. Anything health-related I can help with?",
    "I can't help with that, but I'm great with nutrition, fitness, and wellness! What can I help you with? 🥗",
  ];
  return rejections[Math.floor(Math.random() * rejections.length)];
}

/**
 * Follow-up suggestion templates based on category
 * @param {string} category - Health category (nutrition, fitness, hydration, etc.)
 * @returns {string} Follow-up suggestion
 */
export function generateFollowUp(category = 'general') {
  const followUps = {
    nutrition: [
      "\n\n💡 **Related tip**: Would you like hydration advice to go with that meal?",
      "\n\n💡 **Quick question**: Interested in macro-nutrient breakdown?",
      "\n\n💡 **Fun fact**: Want to know about food combinations for better absorption?"
    ],
    hydration: [
      "\n\n💡 **Related**: Want to know how hydration affects your workout performance?",
      "\n\n💡 **Next step**: Interested in how water intake impacts sleep quality?",
      "\n\n💡 **Bonus**: Want electrolyte tips for better hydration?"
    ],
    fitness: [
      "\n\n💡 **Complement your workout**: Would you like post-workout nutrition tips?",
      "\n\n💡 **Recovery matters**: Interested in how sleep affects fitness gains?",
      "\n\n💡 **Pro tip**: Want hydration strategies for your fitness routine?"
    ],
    sleep: [
      "\n\n💡 **Sleep better with**: Want to know how nutrition affects sleep quality?",
      "\n\n💡 **Enhancement**: Interested in stress management techniques?",
      "\n\n💡 **Fun fact**: Know how hydration impacts sleep cycles?"
    ],
    vitamins: [
      "\n\n💡 **Food sources**: Want to know natural foods rich in these vitamins?",
      "\n\n💡 **Absorption tip**: Interested in how nutrients work together?",
      "\n\n💡 **Quick question**: Want advice on supplement timing?"
    ],
    mental: [
      "\n\n💡 **Enhance results**: Want to know how nutrition supports mental health?",
      "\n\n💡 **Better sleep**: Interested in sleep-stress management connection?",
      "\n\n💡 **Pro tip**: Know about nutrition for better focus and energy?"
    ],
    wellness: [
      "\n\n💡 **Dive deeper**: Want specific advice on nutrition or fitness?",
      "\n\n💡 **Quick question**: Interested in hydration or sleep optimization?",
      "\n\n💡 **More info**: Want to explore stress management techniques?"
    ]
  };

  const options = followUps[category] || followUps.wellness;
  return options[Math.floor(Math.random() * options.length)];
}

/**
 * Short vs long response templates
 * @param {string} content - Main content
 * @param {string} type - 'short' or 'long'
 * @param {string} category - Health category
 * @returns {string} Formatted response
 */
export function formatResponse(content, type = 'medium', category = 'general') {
  let response = content;

  // Add follow-up for medium and long responses
  if (type === 'medium' || type === 'long') {
    response += generateFollowUp(category);
  }

  return response;
}

/**
 * Error response templates
 * @param {string} reason - Why it failed
 * @returns {string} User-friendly error message
 */
export function generateErrorResponse(reason = 'unknown') {
  const errors = {
    not_found: "I don't have information on that specific topic, but I'd love to help with other nutrition or wellness questions! 🤔",
    restricted: "I can't provide medical advice, but feel free to ask about nutrition, fitness, hydration, or wellness! 💪",
    timeout: "That took a moment! Feel free to ask again or try a simpler question. 😊",
    unknown: "Something went wrong, but I'm still here to help with nutrition and wellness! What would you like to know? 🍏"
  };

  return errors[reason] || errors.unknown;
}

/**
 * Format nutrition data with emojis and visual flair
 * @param {Object} foodData - Food nutrition info
 * @returns {string} Formatted nutrition display
 */
export function formatNutritionDisplay(foodData) {
  if (!foodData || foodData.length === 0) return null;

  const food = foodData[0];
  const name = food.name || food.dish_name || food.item || 'Unknown';
  const serving = food.serving_size || '1 serving';
  const calories = food.calories || food.calories_kcal || 0;
  const protein = food.protein || food.protein_g || 0;
  const carbs = food.carbs || food.carbohydrates || food.carbohydrates_g || 0;
  const fats = food.fats || food.fat || food.fat_g || 0;

  let display = `🍽️ **${name}** (${serving})\n\n`;
  display += `🔥 Calories: **${calories}** kcal\n`;
  display += `💪 Protein: **${protein}g**\n`;
  display += `🌾 Carbs: **${carbs}g**\n`;
  display += `🧈 Fat: **${fats}g**`;

  if (food.fiber) {
    display += `\n📍 Fiber: **${food.fiber}g**`;
  }
  if (food.water_content || food.water_content_g) {
    display += `\n💧 Water: **${food.water_content || food.water_content_g}g**`;
  }

  return display;
}

/**
 * Generate a typing indicator message
 * @returns {string} Typing indicator
 */
export function generateTypingIndicator() {
  return "⏳ Thinking...";
}

/**
 * Personality-based response enhancers
 * Add friendly tone to responses
 */
export function addPersonality(response, context = 'general') {
  const enhancers = {
    congratulations: [
      "Great question! ",
      "Excellent thinking! ",
      "Smart choice! ",
      "Good instinct! "
    ],
    encouragement: [
      "You're on the right track! ",
      "Keep it up! ",
      "That's a great focus! ",
      "Love the interest in health! "
    ],
    empathy: [
      "I totally understand! ",
      "That's a common concern! ",
      "Many people wonder about that! ",
      "Great question about that! "
    ]
  };

  if (context === 'congratulations') {
    const prefix = enhancers.congratulations[
      Math.floor(Math.random() * enhancers.congratulations.length)
    ];
    return prefix + response;
  }

  if (context === 'encouragement') {
    const prefix = enhancers.encouragement[
      Math.floor(Math.random() * enhancers.encouragement.length)
    ];
    return prefix + response;
  }

  if (context === 'empathy') {
    const prefix = enhancers.empathy[
      Math.floor(Math.random() * enhancers.empathy.length)
    ];
    return prefix + response;
  }

  return response;
}

/**
 * Health emoji mapping
 */
export const healthEmojis = {
  nutrition: '🍏',
  fitness: '💪',
  hydration: '💧',
  sleep: '😴',
  vitamins: '💊',
  mental: '🧘',
  wellness: '🌟',
  protein: '💪',
  carbs: '🌾',
  fat: '🧈',
  calories: '🔥',
  water: '💧',
  exercise: '🏃',
  food: '🍽️'
};

export default {
  generateGreeting,
  rejectOutOfScope,
  generateFollowUp,
  formatResponse,
  generateErrorResponse,
  formatNutritionDisplay,
  generateTypingIndicator,
  addPersonality,
  healthEmojis
};
