/**
 * Health & Wellness Database
 * Contains safe, evidence-based health information
 * Covers: Sleep, Hydration, Fitness, Mental Health, Vitamins, General Wellness
 * 
 * IMPORTANT: This is informational only, not medical advice
 * For medical concerns, users should consult healthcare professionals
 */

export const healthDataset = {
  // Sleep Recommendations
  sleep: [
    {
      topic: 'Sleep Duration',
      description: 'Recommended sleep duration by age group',
      recommendations: {
        'Adults (18-64 years)': '7-9 hours per night',
        'Older Adults (65+ years)': '7-8 hours per night',
        'Teenagers (13-17 years)': '8-10 hours per night',
        'School Age (6-12 years)': '9-12 hours per night'
      },
      benefits: ['Improved concentration', 'Better immune function', 'Emotional regulation', 'Faster recovery'],
      tips: ['Keep a consistent sleep schedule', 'Avoid screens 30 mins before bed', 'Keep bedroom cool and dark', 'Avoid caffeine after 2 PM']
    },
    {
      topic: 'Sleep Quality',
      description: 'How to improve sleep quality',
      factors: ['Regular exercise', 'Consistent bedtime routine', 'Comfortable sleep environment', 'Limited screen time before bed'],
      improvements: ['Aim for 10,000 steps daily', 'Create a relaxing bedtime routine', 'Maintain 65-68°F room temperature', 'Use blackout curtains']
    }
  ],

  // Hydration
  hydration: [
    {
      topic: 'Daily Water Intake',
      description: 'Recommended water intake guidelines',
      recommendations: {
        'Adult Men': '15.5 cups (3.7L) daily',
        'Adult Women': '11.5 cups (2.7L) daily',
        'During Exercise': 'Add 16-24 oz per 30 mins of exercise'
      },
      benefits: ['Maintains body temperature', 'Supports cognitive function', 'Aids digestion', 'Promotes skin health'],
      tips: ['Drink water with meals', 'Keep water bottle with you', 'Drink before you feel thirsty', 'Monitor urine color (pale = well hydrated)']
    },
    {
      topic: 'Hydration & Fitness',
      description: 'Hydration during physical activity',
      guidelines: [
        'Before exercise: Drink 16-20 oz water 2-3 hours prior',
        'During exercise: 7-10 oz every 10-20 minutes',
        'After exercise: 16-24 oz for every pound lost'
      ]
    }
  ],

  // Fitness & Exercise
  fitness: [
    {
      topic: 'Recommended Exercise',
      description: 'General fitness guidelines for adults',
      aerobic: '150 minutes moderate-intensity per week OR 75 minutes vigorous-intensity',
      strength: '2+ days per week targeting all major muscle groups',
      flexibility: '2+ days per week for stretching',
      benefits: ['Reduced heart disease risk', 'Better weight management', 'Improved mental health', 'Stronger bones and muscles'],
      examples: {
        'Moderate Activity': ['Brisk walking', 'Recreational cycling', 'Water aerobics', 'Recreational tennis'],
        'Vigorous Activity': ['Running', 'Fast cycling', 'HIIT workouts', 'Competitive sports']
      }
    },
    {
      topic: 'Walking Benefits',
      description: 'Benefits of daily walking',
      recommendations: '10,000 steps per day or 30 minutes of brisk walking',
      benefits: [
        'Improves cardiovascular health',
        'Aids weight management',
        'Strengthens bones',
        'Improves balance and coordination',
        'Boosts mental health and mood'
      ]
    },
    {
      topic: 'Home Workouts',
      description: 'Effective exercises you can do at home',
      examples: [
        'Bodyweight: Push-ups, squats, lunges, planks',
        'Cardio: Jumping jacks, running in place, burpees',
        'Flexibility: Yoga, pilates, stretching routines'
      ]
    }
  ],

  // Vitamins & Minerals
  vitamins: [
    {
      topic: 'Vitamin D',
      description: 'Essential for bone health and immune function',
      sources: ['Sunlight (10-30 mins daily)', 'Fatty fish (salmon, mackerel)', 'Egg yolks', 'Fortified milk'],
      benefits: ['Bone health', 'Immune function', 'Mood regulation', 'Calcium absorption'],
      deficiency_signs: ['Fatigue', 'Bone pain', 'Muscle weakness', 'Frequent infections']
    },
    {
      topic: 'Vitamin C',
      description: 'Supports immune system and collagen production',
      sources: ['Citrus fruits', 'Berries', 'Bell peppers', 'Broccoli', 'Kiwi'],
      daily_need: '90mg for men, 75mg for women',
      benefits: ['Immune support', 'Collagen formation', 'Iron absorption', 'Antioxidant protection']
    },
    {
      topic: 'Iron',
      description: 'Essential for oxygen transport in blood',
      sources: ['Red meat', 'Poultry', 'Fish', 'Beans', 'Spinach', 'Fortified cereals'],
      daily_need: '8mg for men, 18mg for women (reproductive age)',
      benefits: ['Energy production', 'Cognitive function', 'Immune support'],
      tip: 'Pair with vitamin C for better absorption'
    },
    {
      topic: 'Calcium',
      description: 'Critical for bone and teeth health',
      sources: ['Dairy products', 'Fortified plant milks', 'Leafy greens', 'Almonds', 'Sardines'],
      daily_need: '1000-1200mg daily',
      benefits: ['Strong bones', 'Muscle function', 'Nerve transmission']
    }
  ],

  // Mental Health & Stress
  mentalHealth: [
    {
      topic: 'Stress Management',
      description: 'Healthy ways to manage daily stress',
      techniques: [
        'Deep breathing (4-7-8 technique)',
        'Regular exercise',
        'Meditation (10-20 minutes daily)',
        'Progressive muscle relaxation',
        'Journaling',
        'Spending time in nature'
      ],
      benefits: ['Reduced anxiety', 'Better sleep', 'Improved focus', 'Lower blood pressure']
    },
    {
      topic: 'Mood & Nutrition',
      description: 'Foods that support mental health',
      mood_boosters: [
        'Omega-3 rich foods (fish, walnuts)',
        'Dark chocolate (contains serotonin)',
        'Berries (antioxidants)',
        'Nuts and seeds (magnesium)',
        'Whole grains (stable blood sugar)'
      ]
    }
  ],

  // General Wellness
  wellness: [
    {
      topic: 'Balanced Diet',
      description: 'General guidelines for healthy eating',
      components: {
        'Vegetables': 'Half of your plate',
        'Fruits': 'Whole fruits preferred',
        'Proteins': 'Varied sources (lean meat, fish, legumes, nuts)',
        'Grains': 'At least half whole grain',
        'Dairy': 'Low-fat or fat-free options'
      },
      principles: ['Eat colorful foods', 'Control portions', 'Limit added sugars', 'Reduce salt intake', 'Stay hydrated']
    },
    {
      topic: 'Weight Management',
      description: 'Healthy weight management strategies',
      approaches: [
        'Balanced calorie intake vs expenditure',
        'Regular physical activity',
        'Adequate sleep and stress management',
        'Whole food focus',
        'Consistent eating patterns'
      ],
      avoid: ['Crash diets', 'Extreme calorie restriction', 'Processed foods', 'Sugary beverages']
    },
    {
      topic: 'Digestive Health',
      description: 'Tips for a healthy digestive system',
      recommendations: [
        'Eat fiber-rich foods (25-35g daily)',
        'Drink plenty of water',
        'Eat slowly and chew well',
        'Regular physical activity',
        'Manage stress levels',
        'Limit processed foods'
      ],
      fiber_sources: ['Whole grains', 'Fruits', 'Vegetables', 'Legumes', 'Nuts and seeds']
    }
  ]
};

/**
 * Type definitions for health dataset
 */
export type HealthTopic = keyof typeof healthDataset;

export interface HealthEntry {
  topic: string;
  description: string;
  [key: string]: any;
}

/**
 * Search health dataset for matching information
 * @param searchTerm - The health topic to search for
 * @returns Matching health information or null
 */
export function searchHealthDataset(searchTerm: string): HealthEntry | null {
  const lowerSearch = searchTerm.toLowerCase();

  // Search through all health categories
  for (const category of Object.values(healthDataset)) {
    if (Array.isArray(category)) {
      for (const entry of category) {
        if (
          entry.topic?.toLowerCase().includes(lowerSearch) ||
          entry.description?.toLowerCase().includes(lowerSearch)
        ) {
          return entry;
        }
      }
    }
  }

  return null;
}

/**
 * Format health information for display
 * @param entry - The health entry to format
 * @returns Formatted string for user display
 */
export function formatHealthResponse(entry: HealthEntry): string {
  let response = `**${entry.topic}**\n`;
  response += `${entry.description}\n\n`;

  // Format different data structures
  if (entry.recommendations) {
    response += `**Recommendations:**\n`;
    if (typeof entry.recommendations === 'object' && !Array.isArray(entry.recommendations)) {
      for (const [key, value] of Object.entries(entry.recommendations)) {
        response += `• ${key}: ${value}\n`;
      }
    } else if (Array.isArray(entry.recommendations)) {
      entry.recommendations.forEach(rec => {
        response += `• ${rec}\n`;
      }); 
    }
    response += '\n';
  }

  if (entry.benefits && Array.isArray(entry.benefits)) {
    response += `**Benefits:**\n`;
    entry.benefits.forEach(benefit => {
      response += `• ${benefit}\n`;
    });
    response += '\n';
  }

  if (entry.tips && Array.isArray(entry.tips)) {
    response += `**Tips:**\n`;
    entry.tips.forEach(tip => {
      response += `• ${tip}\n`;
    });
  }

  response += `\n*This is informational guidance. For personalized health advice, consult a healthcare professional.*`;
  return response;
}
