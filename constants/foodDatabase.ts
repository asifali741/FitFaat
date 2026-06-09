export type DietType = 'vegetarian' | 'nonVegetarian';
export type DietPreference = 'all' | DietType;

export const DIET_PREFERENCE_STORAGE_KEY = 'fitfaat_diet_preference';

const nonVegetarianKeywords = [
  'achar gosht',
  'beef',
  'beefy',
  'brain',
  'carbonara',
  'charga',
  'chargha',
  'chicken',
  'dumba',
  'egg',
  'eggs',
  'fish',
  'gosht',
  'haleem',
  'katakat',
  'keema',
  'kheema',
  'maghaz',
  'meat',
  'murgh',
  'murghi',
  'mutton',
  'nihari',
  'paya',
  'prawn',
  'qeema',
  'rogan josh',
  'salmon',
  'seafood',
  'shrimp',
  'steak',
  'trotters',
  'tuna',
  'turkey',
  'yakhni',
  'anda',
  'anday',
  'andey',
];

const genericNonVegetarianDishKeywords = [
  'bbq',
  'boti',
  'burger',
  'handi',
  'kabab',
  'kebab',
  'karahi',
  'kofta',
  'korma',
  'qorma',
  'sajji',
  'shawarma',
  'tikka',
];

const vegetarianIdentityKeywords = [
  'aloo',
  'baingan',
  'beans',
  'bhindi',
  'chana',
  'chickpea',
  'daal',
  'dahi',
  'dal',
  'gobi',
  'kadoo',
  'kaddu',
  'lauki',
  'lentil',
  'lentils',
  'lobia',
  'matar',
  'milk',
  'mooli',
  'palak',
  'paneer',
  'potato',
  'rajma',
  'sabzi',
  'saag',
  'spinach',
  'tofu',
  'veg',
  'veggie',
  'vegetable',
  'vegetarian',
  'soy',
  'soya',
  'yogurt',
];

const nonVegetarianCategoryKeywords = [
  'bbq',
  'meat',
  'meatballs',
  'meat mix',
  'meat patty',
  'seafood',
  'whole chicken',
];

const escapeRegExp = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const hasWholeTerm = (text: string, terms: string[]) =>
  terms.some((term) => new RegExp(`(^|[^a-z])${escapeRegExp(term)}([^a-z]|$)`, 'i').test(text));

export const dietPreferenceOptions: {
  label: string;
  value: DietPreference;
  icon: 'restaurant-outline' | 'leaf-outline' | 'flame-outline';
}[] = [
  { label: 'All', value: 'all', icon: 'restaurant-outline' },
  { label: 'Veg', value: 'vegetarian', icon: 'leaf-outline' },
  { label: 'Non-Veg', value: 'nonVegetarian', icon: 'flame-outline' },
];

export const getDietPreferenceLabel = (preference: DietPreference) => {
  if (preference === 'vegetarian') return 'Vegetarian';
  if (preference === 'nonVegetarian') return 'Non-Veg';
  return 'All Foods';
};

export const getDietTypeForFood = (food: any): DietType => {
  if (food?.dietType === 'vegetarian' || food?.dietType === 'nonVegetarian') {
    return food.dietType;
  }

  const ingredients = Array.isArray(food?.ingredients)
    ? food.ingredients.map((ingredient: any) => ingredient?.name || ingredient).join(' ')
    : '';
  const nameAndIngredientText = [
    food?.name,
    food?.food_name,
    food?.foodName,
    food?.recipeName,
    ingredients,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  const categoryText = String(food?.category || '').toLowerCase();

  const hasVegetarianIdentity = hasWholeTerm(nameAndIngredientText, vegetarianIdentityKeywords);
  const hasExplicitNonVegetarian = hasWholeTerm(nameAndIngredientText, nonVegetarianKeywords);
  const hasNonVegetarianCategory = hasWholeTerm(categoryText, nonVegetarianCategoryKeywords);
  const hasGenericNonVegetarianDish = hasWholeTerm(
    nameAndIngredientText,
    genericNonVegetarianDishKeywords
  );

  return hasExplicitNonVegetarian ||
    ((hasNonVegetarianCategory || hasGenericNonVegetarianDish) && !hasVegetarianIdentity)
    ? 'nonVegetarian'
    : 'vegetarian';
};

export const filterFoodsByDietPreference = <T>(
  foods: T[],
  preference: DietPreference
) => {
  if (preference === 'all') return foods;
  return foods.filter((food) => getDietTypeForFood(food) === preference);
};

// Food database with calorie information per standard portion
export const foodDatabase = {
  // Proteins
  proteins: [
    { name: 'Chicken Breast (100g)', calories: 165, category: 'Lean Protein' },
    { name: 'Salmon (100g)', calories: 208, category: 'Fatty Protein' },
    { name: 'Eggs (1 large)', calories: 70, category: 'Protein' },
    { name: 'Beef Steak (100g)', calories: 180, category: 'Lean Protein' },
    { name: 'Tofu (100g)', calories: 76, category: 'Plant Protein' },
    { name: 'Turkey Breast (100g)', calories: 135, category: 'Lean Protein' },
    { name: 'Tuna (100g)', calories: 132, category: 'Lean Protein' },
    { name: 'Lentils (100g cooked)', calories: 116, category: 'Plant Protein' },
  ],
  
  // Carbs
  carbs: [
    { name: 'Brown Rice (1 cup cooked)', calories: 215, category: 'Grains' },
    { name: 'Whole Wheat Bread (1 slice)', calories: 80, category: 'Grains' },
    { name: 'Potato (medium, 150g)', calories: 103, category: 'Vegetables' },
    { name: 'Oats (1/2 cup dry)', calories: 150, category: 'Grains' },
    { name: 'Pasta (1 cup cooked)', calories: 221, category: 'Grains' },
    { name: 'Sweet Potato (medium)', calories: 103, category: 'Vegetables' },
    { name: 'Banana (medium)', calories: 105, category: 'Fruits' },
    { name: 'Apple (medium)', calories: 95, category: 'Fruits' },
    { name: 'Quinoa (1 cup cooked)', calories: 222, category: 'Grains' },
  ],
  
  // Fats
  fats: [
    { name: 'Olive Oil (1 tbsp)', calories: 120, category: 'Oils' },
    { name: 'Almonds (23 nuts, 28g)', calories: 164, category: 'Nuts' },
    { name: 'Avocado (1/2)', calories: 120, category: 'Healthy Fats' },
    { name: 'Peanut Butter (1 tbsp)', calories: 96, category: 'Nuts' },
    { name: 'Cheddar Cheese (30g)', calories: 120, category: 'Dairy' },
  ],
  
  // Vegetables
  vegetables: [
    { name: 'Broccoli (1 cup raw)', calories: 34, category: 'Vegetables' },
    { name: 'Spinach (1 cup raw)', calories: 7, category: 'Vegetables' },
    { name: 'Carrot (1 medium)', calories: 25, category: 'Vegetables' },
    { name: 'Bell Pepper (1 medium)', calories: 37, category: 'Vegetables' },
    { name: 'Tomato (1 medium)', calories: 22, category: 'Vegetables' },
  ],
  
  // Popular Meals
  meals: [
    { name: 'Grilled Chicken with Rice', calories: 450, category: 'Main Course' },
    { name: 'Salmon with Vegetables', calories: 500, category: 'Main Course' },
    { name: 'Pasta Carbonara (1 plate)', calories: 600, category: 'Main Course' },
    { name: 'Buddha Bowl (Mixed)', calories: 550, category: 'Main Course' },
    { name: 'Margherita Pizza (1 slice)', calories: 285, category: 'Main Course' },
    { name: 'Sandwich (Chicken)', calories: 320, category: 'Main Course' },
    { name: 'Vegetable Stir Fry with Rice', calories: 400, category: 'Main Course' },
  ],
  
  // Snacks
  snacks: [
    { name: 'Protein Bar', calories: 200, category: 'Snack' },
    { name: 'Yogurt (150g)', calories: 100, category: 'Snack' },
    { name: 'Apple with Almond Butter', calories: 230, category: 'Snack' },
    { name: 'Mixed Nuts (30g)', calories: 170, category: 'Snack' },
    { name: 'Granola Bar', calories: 150, category: 'Snack' },
    { name: 'Greek Yogurt (200g)', calories: 130, category: 'Snack' },
  ],
  
  // Beverages
  beverages: [
    { name: 'Protein Shake', calories: 150, category: 'Beverage' },
    { name: 'Orange Juice (8oz)', calories: 110, category: 'Beverage' },
    { name: 'Milk (240ml)', calories: 150, category: 'Beverage' },
    { name: 'Coffee (black)', calories: 0, category: 'Beverage' },
  ],
};

// Food suggestions based on fitness goal
export const goalBasedSuggestions = {
  1: { // Weight Loss (Deficit)
    name: 'Weight Loss',
    foods: [
      { name: 'Grilled Chicken Breast', calories: 165, reason: 'High protein, low calorie', dietType: 'nonVegetarian' },
      { name: 'Salmon', calories: 208, reason: 'Lean protein with omega-3', dietType: 'nonVegetarian' },
      { name: 'Spinach Salad', calories: 50, reason: 'Very low calorie, nutritious', dietType: 'vegetarian' },
      { name: 'Grilled Turkey Breast', calories: 135, reason: 'Lean protein source', dietType: 'nonVegetarian' },
      { name: 'Broccoli with Chicken', calories: 199, reason: 'High protein, low calorie', dietType: 'nonVegetarian' },
      { name: 'Tuna Salad', calories: 180, reason: 'Lean protein, healthy option', dietType: 'nonVegetarian' },
      { name: 'Lentil Soup with Salad', calories: 220, reason: 'Fiber-rich and filling', dietType: 'vegetarian' },
      { name: 'Tofu Veggie Bowl', calories: 260, reason: 'Plant protein with vegetables', dietType: 'vegetarian' },
      { name: 'Greek Yogurt with Berries', calories: 190, reason: 'Light protein snack', dietType: 'vegetarian' },
      { name: 'Chickpea Cucumber Salad', calories: 240, reason: 'High fiber, moderate calories', dietType: 'vegetarian' },
    ]
  },
  2: { // Muscle Gain (Surplus)
    name: 'Muscle Gain',
    foods: [
      { name: 'Chicken Breast with Rice', calories: 465, reason: 'Protein + carbs for muscle', dietType: 'nonVegetarian' },
      { name: 'Salmon with Sweet Potato', calories: 410, reason: 'Protein + carbs + healthy fats', dietType: 'nonVegetarian' },
      { name: 'Beef Steak with Pasta', calories: 580, reason: 'High protein and calories', dietType: 'nonVegetarian' },
      { name: 'Protein Shake with Banana', calories: 255, reason: 'Quick protein + carbs', dietType: 'vegetarian' },
      { name: 'Chicken with Quinoa', calories: 487, reason: 'Complete protein meal', dietType: 'nonVegetarian' },
      { name: 'Eggs with Toast', calories: 270, reason: 'Protein-rich breakfast', dietType: 'nonVegetarian' },
      { name: 'Paneer Rice Bowl', calories: 520, reason: 'Vegetarian protein + carbs', dietType: 'vegetarian' },
      { name: 'Tofu with Quinoa', calories: 430, reason: 'Plant protein and complete carbs', dietType: 'vegetarian' },
      { name: 'Greek Yogurt Oats Bowl', calories: 390, reason: 'Protein-rich vegetarian meal', dietType: 'vegetarian' },
      { name: 'Lentils with Brown Rice', calories: 455, reason: 'Balanced vegetarian muscle meal', dietType: 'vegetarian' },
    ]
  },
  3: { // Weight Gain
    name: 'Weight Gain',
    foods: [
      { name: 'Grilled Chicken with Brown Rice', calories: 380, reason: 'Balanced meal', dietType: 'nonVegetarian' },
      { name: 'Salmon with Vegetables', calories: 350, reason: 'Balanced and nutritious', dietType: 'nonVegetarian' },
      { name: 'Turkey Sandwich', calories: 320, reason: 'Easy balanced option', dietType: 'nonVegetarian' },
      { name: 'Pasta with Vegetables', calories: 400, reason: 'Balanced carbs and veggies', dietType: 'vegetarian' },
      { name: 'Buddha Bowl', calories: 550, reason: 'Complete balanced meal', dietType: 'vegetarian' },
      { name: 'Grilled Fish with Salad', calories: 300, reason: 'Light and balanced', dietType: 'nonVegetarian' },
      { name: 'Peanut Butter Banana Toast', calories: 410, reason: 'Calorie-dense vegetarian snack', dietType: 'vegetarian' },
      { name: 'Paneer Paratha with Yogurt', calories: 560, reason: 'High-calorie vegetarian meal', dietType: 'vegetarian' },
      { name: 'Avocado Cheese Sandwich', calories: 480, reason: 'Healthy fats and calories', dietType: 'vegetarian' },
      { name: 'Chickpea Rice Bowl', calories: 520, reason: 'Energy-dense vegetarian bowl', dietType: 'vegetarian' },
    ]
  }
};

// Water intake database for hydration tracking
export const waterIntakeDatabase = {
  options: [
    { name: 'Glass of Water (250ml)', amount: 0.25, unit: 'liters' },
    { name: 'Bottle of Water (500ml)', amount: 0.5, unit: 'liters' },
    { name: 'Large Bottle (1L)', amount: 1.0, unit: 'liters' },
    { name: 'Cup of Water (200ml)', amount: 0.2, unit: 'liters' },
    { name: 'Sip (50ml)', amount: 0.05, unit: 'liters' },
  ]
};

// Get all foods flattened for search
export const getAllFoods = () => {
  const all = [
    ...foodDatabase.proteins,
    ...foodDatabase.carbs,
    ...foodDatabase.fats,
    ...foodDatabase.vegetables,
    ...foodDatabase.meals,
    ...foodDatabase.snacks,
    ...foodDatabase.beverages,
  ];
  return all;
};

// Search foods by name
export const searchFoods = (query: string) => {
  if (!query.trim()) return [];
  const allFoods = getAllFoods();
  return allFoods.filter(food => 
    food.name.toLowerCase().includes(query.toLowerCase())
  );
};
