/**
 * Health & Wellness Information Dataset
 * Safe, informational guidance for health-related queries
 * NOT medical advice - for information purposes only
 */

const healthDataset = {
  sleep: {
    keywords: ['sleep', 'insomnia', 'sleepy', 'tired', 'fatigue', 'rest', 'bedtime', 'nap'],
    info: `Sleep and Rest Guide:

RECOMMENDED SLEEP DURATION:
• Adults: 7-9 hours per night
• Teens: 8-10 hours per night
• Children: 9-12 hours per night

TIPS FOR BETTER SLEEP:
• Keep a consistent sleep schedule (same bedtime & wake time)
• Create a cool, dark, quiet sleep environment
• Avoid screens 30-60 minutes before bed
• Limit caffeine after 2 PM
• Exercise regularly (but not close to bedtime)
• Avoid large meals before sleep
• Try relaxation techniques like deep breathing

POOR SLEEP SIGNS:
• Difficulty falling asleep
• Frequent waking during night
• Daytime sleepiness or fatigue
• Difficulty concentrating

Note: Persistent sleep problems may require professional consultation.`,
    sources: ['Sleep Foundation', 'CDC Sleep Guidelines']
  },

  hydration: {
    keywords: ['water', 'hydration', 'dehydration', 'thirst', 'drink', 'fluids', 'hydrate'],
    info: `Hydration Guide:

DAILY WATER INTAKE:
• General rule: 8 glasses (64 oz) per day
• Better guideline: Half your body weight in ounces
  - Example: 150 lb person = 75 oz water daily
• Individual needs vary based on:
  - Activity level
  - Climate (hot climates need more)
  - Age and health status

SIGNS OF DEHYDRATION:
• Dark urine (pale yellow is good)
• Dry mouth or lips
• Fatigue or dizziness
• Headaches
• Muscle cramps

HYDRATION TIPS:
• Drink water throughout the day
• More water during exercise (add electrolytes for long duration)
• Monitor urine color - pale yellow is ideal
• Eat water-rich foods (fruits, vegetables)
• Limit excessive caffeine and alcohol

BEVERAGES:
• Water: Best choice (0 calories, no additives)
• Green/herbal tea: Good hydration + antioxidants
• Coconut water: Good electrolyte source
• Sports drinks: For intense exercise (45+ minutes)
• Avoid: Excessive sugary drinks`,
    sources: ['Mayo Clinic', 'NIH Hydration Guidelines']
  },

  fitness: {
    keywords: ['exercise', 'workout', 'fitness', 'gym', 'running', 'walking', 'yoga', 'stretching', 'training', 'cardio'],
    info: `Exercise & Fitness Guide:

RECOMMENDED PHYSICAL ACTIVITY:
• Moderate cardio: 150 minutes per week
  - Brisk walking, jogging, cycling, swimming
• Vigorous cardio: 75 minutes per week
  - Running, high-intensity interval training (HIIT)
• Strength training: 2+ days per week
  - Builds muscle, increases metabolism

EXERCISE TYPES:
1. CARDIO (Heart health):
   - Walking: 30 min daily
   - Running: 20-30 min sessions
   - Cycling: Low-impact, joint-friendly
   - Swimming: Full-body workout

2. STRENGTH (Muscle building):
   - Weight training: 2-3x per week
   - Bodyweight exercises (push-ups, squats)
   - Resistance bands
   - Focus on major muscle groups

3. FLEXIBILITY (Mobility):
   - Yoga: Improves flexibility & balance
   - Stretching: 10-15 min after workouts
   - Tai Chi: Gentle full-body movement

EXERCISE BENEFITS:
• Improved cardiovascular health
• Better mood and mental health
• Increased energy levels
• Better sleep quality
• Stronger bones and muscles
• Weight management

STARTING AN EXERCISE ROUTINE:
• Start slow (3 days/week minimum)
• Choose activities you enjoy
• Set realistic goals
• Gradually increase intensity
• Stay consistent (habit takes 21-66 days)
• Warm up before & cool down after
• Stay hydrated during exercise

PRE-EXERCISE NUTRITION:
• Light meal 1-2 hours before
• Banana + peanut butter (carbs + protein)
• Oatmeal with berries
• Avoid heavy meals before intense exercise

POST-EXERCISE NUTRITION:
• Within 30-60 minutes: protein + carbs
• Chicken with rice
• Greek yogurt with fruit
• Protein shake

Note: Consult healthcare provider before starting new exercise program if you have health concerns.`,
    sources: ['American Heart Association', 'WHO Exercise Guidelines', 'CDC Physical Activity']
  },

  vitamins: {
    keywords: ['vitamin', 'mineral', 'iron', 'calcium', 'zinc', 'magnesium', 'supplement', 'b12', 'vitamin d'],
    info: `Vitamins & Minerals Guide:

ESSENTIAL VITAMINS:
1. VITAMIN A (Eye health):
   - Sources: Sweet potatoes, carrots, spinach, kale
   - Daily need: 700-900 mcg
   - Benefits: Vision, immune function

2. VITAMIN B12 (Energy):
   - Sources: Meat, fish, eggs, dairy, fortified cereals
   - Daily need: 2.4 mcg
   - Benefits: Energy production, nerve function
   - Note: Vegetarians/vegans may need supplements

3. VITAMIN C (Immunity):
   - Sources: Citrus, berries, bell peppers, broccoli
   - Daily need: 75-90 mg
   - Benefits: Immune support, collagen production

4. VITAMIN D (Bone health):
   - Sources: Fatty fish, egg yolks, fortified milk, sunlight
   - Daily need: 600-800 IU
   - Benefits: Calcium absorption, bone strength
   - Note: Most people get insufficient vitamin D

5. VITAMIN E (Antioxidant):
   - Sources: Nuts, seeds, vegetable oils, leafy greens
   - Daily need: 15 mg
   - Benefits: Cell protection, skin health

ESSENTIAL MINERALS:
1. CALCIUM (Bone health):
   - Sources: Dairy, leafy greens, fortified milk, almonds
   - Daily need: 1000-1200 mg
   - Benefits: Strong bones, teeth, muscle function

2. IRON (Energy & oxygen):
   - Sources: Red meat, poultry, beans, lentils, spinach
   - Daily need: 8-18 mg
   - Benefits: Oxygen transport, energy production
   - Note: Women need more iron (pre-menopausal)

3. ZINC (Immunity):
   - Sources: Meat, shellfish, legumes, nuts, seeds
   - Daily need: 8-11 mg
   - Benefits: Immune function, wound healing

4. MAGNESIUM (Muscle & nerve health):
   - Sources: Leafy greens, nuts, seeds, whole grains
   - Daily need: 310-420 mg
   - Benefits: Muscle relaxation, sleep quality

WHEN TO CONSIDER SUPPLEMENTS:
• Limited diet variety
• Specific dietary restrictions
• Medical conditions affecting absorption
• Pregnancy or breastfeeding
• Vegan/vegetarian diet (B12, iron, zinc)

SUPPLEMENT SAFETY:
• Consult healthcare provider before starting
• Quality matters - choose reputable brands
• More is not always better (fat-soluble vitamins)
• Supplements complement diet, don't replace it

FOOD-FIRST APPROACH:
Vitamins from food are better absorbed than supplements in most cases.`,
    sources: ['NIH Dietary Supplements', 'FDA Nutrition Facts', 'Academy of Nutrition and Dietetics']
  },

  mental: {
    keywords: ['stress', 'anxiety', 'mood', 'mental', 'mindfulness', 'meditation', 'focus', 'depression', 'concentration'],
    info: `Mental Health & Stress Management:

STRESS MANAGEMENT TECHNIQUES:

1. MEDITATION (5-10 minutes):
   - Sit quietly, focus on breathing
   - Let thoughts pass without judgment
   - Use apps: Headspace, Calm, Insight Timer
   - Benefits: Reduces stress, improves focus

2. DEEP BREATHING:
   - 4-7-8 technique: Inhale 4 counts, hold 7, exhale 8
   - Box breathing: 4 counts each (in-hold-out-hold)
   - Do 5-10 minutes when stressed
   - Activates relaxation response

3. PHYSICAL EXERCISE:
   - 30 min moderate activity reduces stress
   - Releases endorphins (natural mood boosters)
   - Walking, yoga, dancing, swimming all work

4. MINDFULNESS:
   - Pay attention to present moment
   - Notice 5 things you see, 4 you hear, 3 you feel, 2 you smell, 1 you taste
   - Reduces anxiety and rumination

5. JOURNALING:
   - Write thoughts and feelings
   - 10-15 minutes daily
   - Helps process emotions and identify patterns

SLEEP & STRESS:
• Poor sleep increases stress & anxiety
• Stress disrupts sleep
• Prioritize consistent sleep schedule
• Reduces cortisol (stress hormone)

NUTRITION FOR MOOD:
• Omega-3s (fish, walnuts): Support brain health
• Complex carbs: Stable energy, mood support
• Protein: Neurotransmitter production
• Avoid excess caffeine: Can increase anxiety

SOCIAL CONNECTION:
• Spend time with supportive people
• Reduces stress and improves mood
• Even 15 minutes helps
• Virtual connections also beneficial

SIGNS YOU NEED PROFESSIONAL HELP:
• Persistent sad or anxious mood (weeks)
• Difficulty functioning daily
• Thoughts of self-harm
• Substance use coping
• Isolation from friends/family

⚠️ IMPORTANT: For mental health conditions, please consult a qualified mental health professional (therapist, psychologist, counselor). This is informational guidance only.`,
    sources: ['American Psychological Association', 'NIMH Mental Health Resources', 'Mayo Clinic']
  },

  wellness: {
    keywords: ['health', 'wellness', 'lifestyle', 'weight', 'metabolism', 'digestion', 'immune'],
    info: `General Health & Wellness Guide:

HEALTHY LIFESTYLE FUNDAMENTALS:

1. NUTRITION (Balanced diet):
   - Fill half plate with vegetables/fruits
   - 1/4 plate with lean protein
   - 1/4 plate with whole grains
   - Limit added sugars and saturated fats
   - Drink water instead of sugary drinks

2. PHYSICAL ACTIVITY:
   - 150 min moderate cardio per week
   - 2+ days strength training
   - Reduces disease risk, improves mood

3. SLEEP:
   - 7-9 hours nightly
   - Consistent sleep schedule
   - Dark, cool bedroom environment

4. STRESS MANAGEMENT:
   - Daily stress reduction practice
   - Work-life balance
   - Social connections

5. WEIGHT MANAGEMENT:
   - Healthy BMI range: 18.5-24.9
   - Focus on healthy habits, not just numbers
   - Sustainable changes work better than diets
   - Combination: nutrition + exercise + sleep

METABOLISM BOOSTERS:
• Build muscle through strength training
• Eat enough protein (increases thermic effect)
• Stay hydrated (speeds digestion)
• Don't skip meals (slows metabolism)
• Get enough sleep (poor sleep slows metabolism)
• Manage stress (cortisol affects weight)

DIGESTIVE HEALTH:
• Eat slowly and chew well
• High-fiber foods (whole grains, vegetables, fruits)
• Adequate water intake
• Probiotics (yogurt, fermented foods)
• Regular exercise improves digestion
• Limit processed foods

IMMUNE SYSTEM SUPPORT:
• Vitamin C: Citrus, berries, peppers
• Vitamin D: Sunlight, fatty fish, supplements
• Zinc: Meat, shellfish, legumes
• Probiotics: Yogurt, kimchi, kombucha
• Sleep: Critical for immune function
• Exercise: Moderate activity supports immunity
• Stress reduction: Chronic stress weakens immunity
• Handwashing: Prevention is best defense

CHRONIC DISEASE PREVENTION:
• Heart disease: Exercise, healthy diet, manage stress
• Diabetes: Healthy weight, physical activity, reduce sugar
• Cancer: Don't smoke, limit alcohol, healthy diet, exercise
• Osteoporosis: Calcium, vitamin D, exercise

Regular health check-ups (annual physicals) help catch issues early.`,
    sources: ['WHO Healthy Living', 'CDC Prevention', 'Harvard School of Public Health']
  }
};

/**
 * Search health dataset for relevant information
 * @param {string} category - Health category (sleep, fitness, etc)
 * @returns {Object} - Health information
 */
export function searchHealthDataset(category) {
  const lowerCategory = category.toLowerCase().trim();
  
  // Find matching category
  for (const [key, value] of Object.entries(healthDataset)) {
    if (key === lowerCategory) {
      return value;
    }
    
    // Check if keywords match
    if (value.keywords.some(kw => lowerCategory.includes(kw))) {
      return value;
    }
  }
  
  // No match found
  return null;
}

/**
 * Format health response with proper disclaimer
 * @param {Object} healthInfo - Health information from dataset
 * @returns {string} - Formatted response with disclaimer
 */
export function formatHealthResponse(healthInfo) {
  if (!healthInfo) {
    return null;
  }
  
  const disclaimer = `
⚠️ IMPORTANT DISCLAIMER:
This is informational guidance only, not professional medical advice.
For personalized medical advice, diagnosis, or treatment, please consult a qualified healthcare professional.`;
  
  let response = healthInfo.info;
  
  // Add sources if available
  if (healthInfo.sources && healthInfo.sources.length > 0) {
    response += `\n\nSources: ${healthInfo.sources.join(', ')}`;
  }
  
  response += disclaimer;
  
  return response;
}

export default {
  healthDataset,
  searchHealthDataset,
  formatHealthResponse
};
